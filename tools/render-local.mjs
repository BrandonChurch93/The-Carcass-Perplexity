import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { ROOT, rel, args, config, readJson, writeJson } from './lib/paths.mjs';
import { isMain, one } from './lib/img.mjs';
import { configureRenderer, filmInfo, rendererState, pageInfo, renderRaw, FLAGS } from './lib/render.mjs';
import * as core from './lib/film-core.mjs';
import { makeFilm, makeLoop, findMix, closeRenderer, shown, LOCAL_DIR, MIX_DIR } from './lib/film-run.mjs';

export const USAGE = 'usage: npm run render:local -- --what film --test | --what film --go [--prores] [--silent] | --what loop | --proof';
export const PROOF = rel('out', 'work', 'local', 'proof.json');
const DELIVER = rel('deliver', 'film');
const KEPT = rel('out', 'stills');
const CUT_LIST = rel('cut', 'CUTLIST.json');
const say = (line) => console.log(`render-local: ${line}`);
const NO_MIX = `There is no final mix under ${shown(MIX_DIR)}, so nothing was rendered. The mix is in the sound archive from the Computer thread: unpack it as README.md says, or give --silent to render without sound.`;

export function findChrome({ platform = process.platform, env = process.env, home = os.homedir(), exists = fs.existsSync } = {}) {
  const tried = core.chromePaths({ platform, env, home });
  const found = tried.find((p) => exists(p));
  if (!found) throw new Error(`No installed Chrome was found. Install Chrome, or set CARCASS_BROWSER to its program file. Looked at: ${tried.join(', ')}.`);
  return found;
}

function useChrome() {
  const executablePath = findChrome();
  configureRenderer({ executablePath, headless: false, args: core.LOCAL_FLAGS });
  say(`using ${executablePath} in a visible window with its graphics card on`);
}

function openFile(file) {
  const [cmd, argv] = process.platform === 'darwin' ? ['open', [file]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', file]] : ['xdg-open', [file]];
  try {
    spawn(cmd, argv, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch {
    say(`could not open ${shown(file)}, open it by hand`);
  }
}

export function keptKeys(dir = KEPT) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const unit of fs.readdirSync(dir).sort()) {
    const folder = path.join(dir, unit);
    if (!fs.statSync(folder).isDirectory()) continue;
    for (const n of fs.readdirSync(folder).filter((x) => x.endsWith('.jpg.json')).sort()) {
      let record = null;
      try {
        record = readJson(path.join(folder, n));
      } catch {
        continue;
      }
      const file = path.join(folder, n.slice(0, -5));
      if (record.key && !record.diag && !record.part && Number.isInteger(record.frame) && fs.existsSync(file)) out.push({ file, record });
    }
  }
  return out;
}

export function firstJudged(film) {
  const all = Object.entries({ ...(film.judged ?? {}), ...(film.keyFrames ?? {}) }).filter(([, f]) => Number.isInteger(f));
  all.sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : 1));
  return all.length ? { id: all[0][0], frame: all[0][1] } : null;
}

async function judgedFrame(film, cfg) {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  const toImage = (r) => sharp(r.data, { raw: { width: r.width, height: r.height, channels: 4 } }).flip().removeAlpha();
  const kept = keptKeys().find((k) => k.record.key in (film.keyFrames ?? {}));
  if (!kept) {
    const judged = firstJudged(film);
    const r = await renderRaw({ frame: judged ? judged.frame : 0, tier: 'final', format: cfg.formats.master.id });
    const file = path.join(LOCAL_DIR, `test-${judged ? judged.id : 'frame-0'}.png`);
    await toImage(r).png({ compressionLevel: 3 }).toFile(file);
    say(`${judged ? `the judged frame ${judged.id}, film frame ${judged.frame},` : 'the film has no judged frame yet, so film frame 0'} is at ${shown(file)}, and no kept still of a key frame was found under ${shown(KEPT)} to compare it with`);
    return null;
  }
  const { key, format, tier } = kept.record;
  const r = await renderRaw({ key, tier, format });
  const mine = path.join(LOCAL_DIR, `test-${key}.png`);
  const theirs = path.join(LOCAL_DIR, `test-${key}-kept${path.extname(kept.file)}`);
  const image = toImage(r);
  await image.clone().png({ compressionLevel: 3 }).toFile(mine);
  fs.copyFileSync(kept.file, theirs);
  const a = await image.clone().raw().toBuffer();
  const other = await sharp(kept.file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const same = other.info.width === r.width && other.info.height === r.height;
  const value = same ? core.psnr(a, other.data) : null;
  const text = value === null ? 'they are not the same size' : `their PSNR is ${Number.isFinite(value) ? `${value.toFixed(2)} dB` : 'without limit, they are equal'}`;
  writeJson(path.join(LOCAL_DIR, `test-${key}.json`), { key, frame: r.frame, format, tier, rendered: shown(mine), kept: shown(kept.file), psnr: value === null || !Number.isFinite(value) ? null : Math.round(value * 100) / 100, equal: value === Infinity });
  say(`the frame that answers ${key}, film frame ${r.frame}, is at ${shown(mine)} beside ${shown(theirs)}, ${text}`);
  return { key, psnr: value };
}

function copyTo(dir, file) {
  const to = path.join(dir, path.basename(file));
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(file, to);
  fs.copyFileSync(`${file}.json`, `${to}.json`);
  return to;
}

function moveTo(dir, file) {
  const to = path.join(dir, path.basename(file));
  fs.mkdirSync(dir, { recursive: true });
  try {
    fs.rmSync(to, { force: true });
    fs.renameSync(file, to);
  } catch {
    fs.copyFileSync(file, to);
    fs.rmSync(file, { force: true });
  }
  fs.copyFileSync(`${file}.json`, `${to}.json`);
  return to;
}

function needMix(silent) {
  const mix = findMix({ silent });
  if (!silent && !mix.file) throw new Error(NO_MIX);
  return mix;
}

async function filmTest(cfg, a) {
  const silent = Boolean(a.silent);
  needMix(silent);
  useChrome();
  const film = await filmInfo();
  await judgedFrame(film, cfg);
  const span = core.testSpan({ film, cfg });
  const name = `test-film.${cfg.export.master.container}`;
  const made = await makeFilm({ cfg, format: cfg.formats.master.id, tier: 'final', first: span.first, last: span.last, silent, dir: LOCAL_DIR, name, say });
  openFile(made.file);
  say(`the first ${cfg.export.local.testSeconds} seconds are at ${shown(made.file)}${silent ? ', rendered without sound because --silent was given' : ''}`);
}

async function filmGo(cfg, a) {
  const silent = Boolean(a.silent);
  needMix(silent);
  useChrome();
  const film = await filmInfo();
  const format = cfg.formats.master.id;
  const plan = core.chunkPlan({ first: 0, last: film.frameCount - 1, shots: film.shots ?? [], cfg, format, tier: 'final', rate: cfg.film.fps });
  const cut = fs.existsSync(CUT_LIST) ? readJson(CUT_LIST) : null;
  const wrong = core.lengthFaults({ film, cfg, cut, plan });
  if (wrong.length) throw new Error(`The frame count is not the length of the film times film.fps, so nothing was rendered: ${wrong.join('; ')}.`);
  say(`${film.frameCount} frames, ${(film.frameCount / cfg.film.fps).toFixed(2)} seconds at ${cfg.film.fps} frames a second`);
  const made = await makeFilm({ cfg, format, tier: 'final', silent, dir: LOCAL_DIR, edit: Boolean(a.prores), say });
  for (const file of [made.file, made.edit].filter(Boolean)) say(`moved to ${shown(moveTo(DELIVER, file))}`);
  say(`the film holds ${made.frames} frames${silent ? ', rendered without sound because --silent was given' : ` with ${made.mix}`}`);
}

async function loopGo(cfg) {
  useChrome();
  const made = await makeLoop({ cfg, format: cfg.formats.master.id, tier: 'final', dir: path.join(LOCAL_DIR, 'loop'), say });
  for (const file of [made.file, made.web?.file, made.still?.file].filter(Boolean)) say(`copied to ${shown(copyTo(DELIVER, file))}`);
}

export function proofPart(made, extra = {}) {
  return {
    file: shown(made.file),
    first: made.span.first,
    last: made.span.last,
    frames: made.frames,
    chunks: made.plan.map((c) => c.name),
    probe: made.probe,
    seconds: Math.round(made.seconds * 10) / 10,
    ...extra,
  };
}

async function proof(cfg) {
  const format = cfg.formats.preview.id;
  const tier = 'draft';
  const film = await filmInfo();
  const span = core.proofSpan({ film, cfg });
  say(span.cut === null ? `the film has one shot, so the proof takes ${span.frames} frames from its middle` : `the proof crosses the first cut of the film, at frame ${span.cut}`);
  const container = cfg.export.master.container;
  const filmMade = await makeFilm({ cfg, format, tier, first: span.first, last: span.last, dir: LOCAL_DIR, name: `proof-film.${container}`, say });
  const loopSpan = core.proofSpan({ film, cfg, loop: true });
  const loopMade = await makeLoop({ cfg, format, tier, first: loopSpan.first, last: loopSpan.last, dir: LOCAL_DIR, name: `proof-loop.${container}`, web: false, still: false, say });
  const renderer = await rendererState();
  const info = await pageInfo();
  writeJson(PROOF, {
    schema: 'carcass/proof 1',
    format,
    tier,
    rate: cfg.film.fps,
    seconds: cfg.export.local.proofSeconds,
    film: proofPart(filmMade, { cut: span.cut, mix: filmMade.mix, mixUsed: Boolean(filmMade.mix) }),
    loop: proofPart(loopMade),
    built: renderer.built,
    browser: renderer.browser,
    machine: renderer.machine,
    graphics: info.gl?.renderer ?? null,
    flags: FLAGS,
  });
  say(`wrote ${shown(PROOF)}, the film part ${filmMade.mix ? `with the mix ${filmMade.mix}` : 'silent, there is no mix'}, the loop part silent`);
}

export async function run(a, cfg = config()) {
  if (a.proof) return proof(cfg);
  const what = one(a.what, null);
  if (what === 'loop') {
    if (a.test) throw new Error('--test is for --what film. The loop is rendered whole with --what loop.');
    return loopGo(cfg);
  }
  if (what !== 'film') throw new Error(`--what film, --what loop or --proof is needed. ${USAGE}`);
  if (a.test) return filmTest(cfg, a);
  if (a.go) return filmGo(cfg, a);
  throw new Error(`--what film needs --test or --go. ${USAGE}`);
}

if (isMain(import.meta)) {
  const a = args();
  if (a.help) {
    console.log(USAGE);
    process.exit(0);
  }
  try {
    await run(a);
  } catch (e) {
    console.error(`render-local: ${String(e.message).split('\n')[0]}`);
    process.exitCode = 1;
  } finally {
    await closeRenderer();
  }
}
