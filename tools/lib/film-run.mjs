import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { ROOT, rel, readJson, writeJson, config } from './paths.mjs';
import { state } from './hash.mjs';
import { renderRaw, holdRenderer, releaseRenderer, filmInfo, rendererState, ensureDisk, closeRenderer } from './render.mjs';
import * as core from './film-core.mjs';

export const FILM_DIR = rel('out', 'work', 'film');
export const LOOP_DIR = rel('out', 'work', 'loop');
export const LOCAL_DIR = rel('out', 'work', 'local');
export const MIX_DIR = rel('audio', 'mix');
const JPEG = { quality: 95, chromaSubsampling: '4:4:4' };
const shown = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const running = new Set();
let guarded = false;

function guard() {
  if (guarded) return;
  guarded = true;
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      for (const child of running) child.kill('SIGKILL');
      releaseRenderer();
      process.exit(1);
    });
  }
}

function ffmpeg(argv) {
  const r = spawnSync('ffmpeg', argv, { stdio: ['ignore', 'ignore', 'pipe'], maxBuffer: 1 << 26 });
  if (r.error) throw new Error(`ffmpeg could not be started: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr.toString().trim().split('\n').slice(-1)[0]}`);
}

export function probe(file) {
  const r = spawnSync('ffprobe', [...core.PROBE_ARGS, file], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.error || r.status !== 0) throw new Error(`ffprobe could not read ${shown(file)}.`);
  return core.readProbe(r.stdout);
}

export function findMix({ silent = false, dir = MIX_DIR } = {}) {
  if (silent) return { file: null, why: 'no sound stream, --silent was given' };
  const found = fs.existsSync(dir) ? fs.readdirSync(dir).map((n) => ({ file: path.join(dir, n), mtimeMs: fs.statSync(path.join(dir, n)).mtimeMs })) : [];
  const file = core.newestMix(found);
  return file ? { file, why: `sound from the newest mix, ${shown(file)}` } : { file: null, why: `no sound stream, there is no mix under ${shown(dir)}` };
}

function finish(tmp, file) {
  fs.rmSync(file, { force: true });
  fs.renameSync(tmp, file);
}

function clearParts(dir) {
  if (!fs.existsSync(dir)) return;
  for (const n of fs.readdirSync(dir)) if (n.startsWith('.') && n.includes('.part')) fs.rmSync(path.join(dir, n), { force: true });
}

const chunkFile = (dir, chunk, cfg) => path.join(dir, `${chunk.name}.${cfg.export.master.container}`);
const editFile = (dir, chunk, cfg) => path.join(dir, `${chunk.name}.${cfg.export.local.container}`);

export function chunkStates({ plan, dir, renderer, what, format, tier, rate, cfg, edit = false }) {
  return plan.map((chunk) => {
    const file = chunkFile(dir, chunk, cfg);
    const want = core.chunkRecord({ renderer, chunk, what, format, tier, rate, edit, also: [core.filmUnit(cfg)] });
    let have = fs.existsSync(file) && fs.existsSync(`${file}.json`) && (!edit || fs.existsSync(editFile(dir, chunk, cfg)));
    if (have) {
      try {
        have = core.chunkMatches(readJson(`${file}.json`), want);
      } catch {
        have = false;
      }
    }
    return { chunk, file, want, have };
  });
}

async function encodeChunk({ what, chunk, step, format, tier, rate, cfg, dir, edit }) {
  const file = chunkFile(dir, chunk, cfg);
  const outs = [{ tmp: path.join(dir, `.${chunk.name}.part.${cfg.export.master.container}`), file, argv: core.chunkArgs }];
  if (edit) outs.push({ tmp: path.join(dir, `.${chunk.name}.part.${cfg.export.local.container}`), file: editFile(dir, chunk, cfg), argv: core.editArgs });
  for (const o of outs) {
    o.child = spawn('ffmpeg', o.argv({ cfg, format, rate, out: o.tmp }), { stdio: ['pipe', 'ignore', 'pipe'] });
    o.errors = '';
    o.child.stderr.on('data', (d) => (o.errors += d));
    o.child.stdin.on('error', () => {});
    o.closed = new Promise((res) => o.child.on('close', res));
    running.add(o.child);
  }
  let spent = 0;
  try {
    for (const f of core.spanFrames({ first: chunk.first, last: chunk.last, step })) {
      const r = await renderRaw({ [what === 'loop' ? 'loop' : 'frame']: f, tier, format, hold: true });
      spent += r.seconds;
      for (const o of outs) {
        if (o.child.exitCode !== null) throw new Error(`ffmpeg stopped early on ${chunk.name}: ${o.errors.trim().split('\n').slice(-1)[0]}`);
        if (!o.child.stdin.write(r.data)) await new Promise((res) => o.child.stdin.once('drain', res));
      }
    }
    for (const o of outs) o.child.stdin.end();
    for (const o of outs) {
      const code = await o.closed;
      if (code !== 0) throw new Error(`ffmpeg failed on ${chunk.name}: ${o.errors.trim().split('\n').slice(-1)[0]}`);
    }
  } catch (e) {
    for (const o of outs) {
      o.child.kill('SIGKILL');
      fs.rmSync(o.tmp, { force: true });
    }
    throw e;
  } finally {
    for (const o of outs) running.delete(o.child);
  }
  for (const o of [...outs].reverse()) finish(o.tmp, o.file);
  return spent / chunk.frames;
}

export async function renderChunks({ what, todo, step, format, tier, rate, cfg, dir, edit = false, say }) {
  guard();
  fs.mkdirSync(dir, { recursive: true });
  clearParts(dir);
  let framesLeft = todo.filter((t) => !t.have).reduce((n, t) => n + t.chunk.frames, 0);
  let done = 0;
  let rendered = 0;
  const started = process.hrtime.bigint();
  if (framesLeft > 0) await holdRenderer();
  try {
    for (const t of todo) {
      done += 1;
      if (t.have) {
        say(core.chunkLine({ done, total: todo.length, chunk: t.chunk, reused: true }));
        continue;
      }
      fs.rmSync(`${t.file}.json`, { force: true });
      const begun = process.hrtime.bigint();
      await encodeChunk({ what, chunk: t.chunk, step, format, tier, rate, cfg, dir, edit });
      const perFrame = Number(process.hrtime.bigint() - begun) / 1e9 / t.chunk.frames;
      writeJson(`${t.file}.json`, { ...t.want, secondsPerFrame: Math.round(perFrame * 1000) / 1000 });
      t.have = true;
      rendered += t.chunk.frames;
      framesLeft -= t.chunk.frames;
      say(core.chunkLine({ done, total: todo.length, chunk: t.chunk, perFrame, framesLeft }));
    }
  } finally {
    releaseRenderer();
  }
  return { rendered, seconds: Number(process.hrtime.bigint() - started) / 1e9 };
}

export function joinFiles({ cfg, states, dir, out, sound = null, edit = false }) {
  const missing = states.filter((s) => !s.have).map((s) => s.chunk.name);
  if (missing.length) {
    const some = missing.slice(0, 8).join(', ');
    throw new Error(`${missing.length} of ${states.length} chunks are missing or are from another build, so nothing was joined: ${some}${missing.length > 8 ? ', and more' : ''}.`);
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const container = edit ? cfg.export.local.container : cfg.export.master.container;
  const list = path.join(dir, `${path.basename(out)}.txt`);
  fs.writeFileSync(list, core.concatList(states.map((s) => (edit ? editFile(dir, s.chunk, cfg) : s.file))));
  const tmp = path.join(path.dirname(out), `.${path.basename(out)}.part`);
  try {
    ffmpeg(core.joinArgs({ cfg, list, sound, out: tmp, container }));
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    throw e;
  }
  finish(tmp, out);
  return out;
}

function checked(file, want) {
  const read = probe(file);
  const wrong = core.probeFaults(read, want);
  if (wrong.length) throw new Error(`${shown(file)} is wrong: ${wrong.join('; ')}.`);
  return read;
}

function shotsOf(film) {
  return film.shots ?? [];
}

export async function makeFilm({ cfg = config(), format, tier, fps = null, first = null, last = null, unit = null, joinOnly = false, silent = false, share = null, dir = FILM_DIR, name = null, edit = false, say = () => {} }) {
  ensureDisk(cfg);
  const f = core.formatOf(cfg, format);
  core.tierOf(cfg, tier);
  const { rate, step } = core.rateOf(cfg, fps);
  const film = await filmInfo();
  const renderer = await rendererState();
  if (unit !== null && !film.places) say(`the film on the page has no places yet, so the span of ${unit} is read from its shots`);
  const span = core.resolveSpan({ frameCount: film.frameCount, first, last, unit, film });
  const plan = core.chunkPlan({ what: 'film', first: span.first, last: span.last, shots: shotsOf(film), cfg, format: f.id, tier, rate });
  const frames = plan.reduce((n, c) => n + c.frames, 0);
  if (frames === 0) throw new Error(`Frames ${span.first} to ${span.last} hold no frame at ${rate} frames a second.`);
  const chunks = path.join(dir, 'chunks');
  const common = { what: 'film', format: f.id, tier, rate, cfg, edit };
  const all = chunkStates({ plan, dir: chunks, renderer, ...common });
  const todo = share ? core.shareOf(plan, share).map((c) => all[c.index]) : all;
  say(`film frames ${span.first} to ${span.last}, ${frames} frames at ${rate} a second, ${f.width} x ${f.height}, ${tier} tier, ${plan.length} ${plan.length === 1 ? 'chunk' : 'chunks'}${share ? `, ${todo.length} of them asked for` : ''}`);
  let run = { rendered: 0, seconds: 0 };
  if (!joinOnly) run = await renderChunks({ todo, step, dir: chunks, say, ...common });
  const out = path.join(dir, name ?? core.filmName({ cfg, format: f.id, tier, rate, span, film }));
  if (share && !joinOnly) {
    const left = all.filter((s) => !s.have).length;
    say(`this share is done, ${left} of ${plan.length} chunks are still missing, run it once more with --join when they are all there`);
    return { file: null, joined: false, plan, frames, rendered: run.rendered, seconds: run.seconds, span, rate, format: f, tier };
  }
  const mix = findMix({ silent });
  const sound = mix.file ? { file: mix.file, ...core.soundSpan({ cfg, first: span.first, last: span.last, rate, whole: span.whole }) } : null;
  joinFiles({ cfg, states: all, dir: chunks, out, sound });
  const read = checked(out, { width: f.width, height: f.height, fps: rate, frames, sound: Boolean(sound) });
  const record = core.joinRecord({ renderer, what: 'film', name: path.basename(out), format: f.id, tier, rate, first: span.first, last: span.last, whole: span.whole, frames, chunks: plan, sound: mix.file ? shown(mix.file) : null });
  writeJson(`${out}.json`, record);
  say(mix.why);
  say(`wrote ${shown(out)}, ${frames} frames, ${(fs.statSync(out).size / 1e6).toFixed(1)} MB, checked with ffprobe: ${read.width} x ${read.height}, ${rate} frames a second, ${read.sound ? 'one sound stream' : 'no sound stream'}`);
  let editOut = null;
  if (edit) {
    editOut = path.join(dir, `${path.basename(out, path.extname(out))}.${cfg.export.local.container}`);
    joinFiles({ cfg, states: all, dir: chunks, out: editOut, sound, edit: true });
    checked(editOut, { width: f.width, height: f.height, fps: rate, frames, sound: Boolean(sound) });
    writeJson(`${editOut}.json`, { ...record, name: path.basename(editOut), codec: cfg.export.local.videoCodec });
    say(`wrote ${shown(editOut)} for editing, ${(fs.statSync(editOut).size / 1e6).toFixed(1)} MB`);
  }
  return { file: out, edit: editOut, joined: true, record, probe: read, plan, frames, rendered: run.rendered, seconds: run.seconds, span, rate, format: f, tier, mix: mix.file ? shown(mix.file) : null, why: mix.why };
}

export function copyFilm({ cfg = config(), src, format, fps = null, dir = FILM_DIR, now = state(), say = () => {} }) {
  ensureDisk(cfg);
  const from = path.resolve(src);
  if (!fs.existsSync(from)) throw new Error(`${src} is not there.`);
  if (!fs.existsSync(`${from}.json`)) throw new Error(`${src} has no record beside it, so it is not known to be from this build.`);
  const source = readJson(`${from}.json`);
  if (!core.sameBuild(source.built, now)) throw new Error(`${src} is from another build than the one in this folder, so no copy was made.`);
  const f = core.formatOf(cfg, format);
  const big = core.formatOf(cfg, source.format);
  if (f.width >= big.width) throw new Error(`${src} is ${big.width} wide and ${f.id} is ${f.width} wide, so it cannot be scaled down to it.`);
  const own = f.key === 'preview' ? cfg.film.previewFps : source.rate;
  const { rate } = core.rateOf(cfg, fps ?? own);
  const thin = source.rate / rate;
  if (!Number.isInteger(thin)) throw new Error(`${src} runs at ${source.rate} frames a second and cannot be thinned to ${rate}.`);
  const frames = Math.ceil(source.frames / thin);
  const span = { first: source.first, last: source.last, whole: source.whole === true };
  const read0 = probe(from);
  const cutList = rel('cut', 'CUTLIST.json');
  const name = core.filmName({ cfg, format: f.id, tier: source.tier, rate, span, film: fs.existsSync(cutList) ? readJson(cutList) : null });
  const out = path.join(dir, name);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${name}.part`);
  const begun = process.hrtime.bigint();
  try {
    ffmpeg(core.scaleArgs({ cfg, src: from, format: f.id, rate, srcRate: source.rate, out: tmp }));
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    throw e;
  }
  finish(tmp, out);
  const read = checked(out, { width: f.width, height: f.height, fps: rate, frames, sound: read0.sound });
  const record = { ...source, name, format: f.id, rate, frames, from: source.name };
  writeJson(`${out}.json`, record);
  say(`wrote ${shown(out)} from ${shown(from)}, ${frames} frames, ${f.width} x ${f.height}, ${rate} frames a second, ${read.sound ? 'its sound copied' : 'no sound stream'}, in ${(Number(process.hrtime.bigint() - begun) / 1e9).toFixed(1)} s`);
  return { file: out, record, probe: read, frames };
}

export async function makeStill({ cfg = config(), format, tier, dir = LOOP_DIR, render = true, say = () => {} }) {
  const f = core.formatOf(cfg, format);
  const film = await filmInfo();
  const renderer = await rendererState();
  const file = path.join(dir, cfg.export.files.cardStill);
  const want = core.stillRecord({ renderer, format: f.id, tier, unit: film.loop.unit, also: [core.filmUnit(cfg)] });
  if (fs.existsSync(file) && fs.existsSync(`${file}.json`)) {
    const have = readJson(`${file}.json`);
    if (['kind', 'loop', 'format', 'tier', 'engine', 'units', 'browser'].every((k) => JSON.stringify(have[k]) === JSON.stringify(want[k]))) {
      say(`kept ${shown(file)} from an earlier run`);
      return { file, record: have, reused: true };
    }
  }
  if (!render) {
    say(`${shown(file)} is missing or is from another build, and --join renders nothing`);
    return { file: null, record: null, reused: false };
  }
  const r = await renderRaw({ loop: 0, tier, format: f.id });
  fs.mkdirSync(dir, { recursive: true });
  await sharp(r.data, { raw: { width: r.width, height: r.height, channels: 4 } }).flip().removeAlpha().jpeg(JPEG).toFile(file);
  writeJson(`${file}.json`, want);
  say(`wrote ${shown(file)}, loop frame 0, ${r.width} x ${r.height}, ${tier} tier, in ${r.seconds.toFixed(1)} s`);
  return { file, record: want, reused: false };
}

export async function makeLoop({ cfg = config(), format, tier, first = null, last = null, joinOnly = false, dir = LOOP_DIR, name = null, web = true, still = true, say = () => {} }) {
  ensureDisk(cfg);
  const f = core.formatOf(cfg, format);
  core.tierOf(cfg, tier);
  const { rate, step } = core.rateOf(cfg, null);
  const film = await filmInfo();
  const renderer = await rendererState();
  const span = core.resolveSpan({ frameCount: film.loop.frameCount, first, last });
  const plan = core.chunkPlan({ what: 'loop', first: span.first, last: span.last, shots: [], unit: film.loop.unit, cfg, format: f.id, tier, rate });
  const frames = plan.reduce((n, c) => n + c.frames, 0);
  const chunks = path.join(dir, 'chunks');
  const common = { what: 'loop', format: f.id, tier, rate, cfg };
  const all = chunkStates({ plan, dir: chunks, renderer, ...common });
  say(`loop frames ${span.first} to ${span.last}, ${frames} frames at ${rate} a second, ${f.width} x ${f.height}, ${tier} tier, ${plan.length} ${plan.length === 1 ? 'chunk' : 'chunks'}`);
  let run = { rendered: 0, seconds: 0 };
  if (!joinOnly) run = await renderChunks({ todo: all, step, dir: chunks, say, ...common });
  const names = core.loopNames({ cfg, format: f.id, tier, span });
  const out = path.join(dir, name ?? names.loop);
  joinFiles({ cfg, states: all, dir: chunks, out, sound: null });
  const read = checked(out, { width: f.width, height: f.height, fps: rate, frames, sound: false });
  const record = core.joinRecord({ renderer, what: 'loop', name: path.basename(out), format: f.id, tier, rate, first: span.first, last: span.last, whole: span.whole, frames, chunks: plan });
  writeJson(`${out}.json`, record);
  say(`wrote ${shown(out)}, ${frames} frames, ${(fs.statSync(out).size / 1e6).toFixed(1)} MB, checked with ffprobe: ${read.width} x ${read.height}, ${rate} frames a second, no sound stream`);
  const made = { file: out, record, probe: read, plan, frames, rendered: run.rendered, seconds: run.seconds, span, rate, format: f, tier, web: null, still: null };
  if (web) {
    const size = core.webSize(cfg, f.id);
    const file = path.join(dir, names.web);
    const tmp = path.join(dir, `.${names.web}.part`);
    try {
      ffmpeg(core.webArgs({ cfg, src: out, rate, out: tmp }));
    } catch (e) {
      fs.rmSync(tmp, { force: true });
      throw e;
    }
    finish(tmp, file);
    const webRead = checked(file, { width: size.width, height: size.height, fps: rate, frames, sound: false });
    writeJson(`${file}.json`, { ...record, name: names.web, from: path.basename(out), width: size.width, height: size.height });
    say(`wrote ${shown(file)}, ${size.width} x ${size.height}, ${(fs.statSync(file).size / 1e6).toFixed(1)} MB`);
    made.web = { file, probe: webRead };
  }
  if (still) made.still = await makeStill({ cfg, format: f.id, tier, dir, render: !joinOnly, say });
  return made;
}

export async function decodeFirst(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-frames:v', '1', '-vf', core.FROM_VIDEO, '-f', 'image2pipe', '-c:v', 'png', 'pipe:1'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`ffmpeg could not decode ${shown(file)}.`);
  return sharp(r.stdout).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

export { closeRenderer, shown };
