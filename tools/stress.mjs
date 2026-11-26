import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { ROOT, args, config, readJson, writeJson, utc } from './lib/paths.mjs';
import { isMain, one, timecode, gridFit, tile, assemble, writePng, SEP } from './lib/img.mjs';
import * as core from './lib/stress-core.mjs';

export const USAGE = `usage: npm run stress [-- --tier draft|review|final] [--format ID] [--moments ${core.MOMENTS.map((m) => m.id).join(',')}] [--force] [--out DIR]`;
const MAX_BUFFER = 2 ** 28;

async function realRenderer() {
  const r = await import('./lib/render.mjs');
  return { filmInfo: r.filmInfo, renderRaw: r.renderRaw, holdRenderer: r.holdRenderer, releaseRenderer: r.releaseRenderer, rendererState: r.rendererState, closeRenderer: r.closeRenderer, ensureDisk: r.ensureDisk };
}

const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function encoder(argv) {
  const child = spawn('ffmpeg', argv, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  let broken = null;
  child.stderr.on('data', (d) => (err += d));
  child.stdin.on('error', (e) => (broken = e));
  const done = new Promise((resolve, reject) => {
    child.on('error', (e) => reject(new Error(`ffmpeg could not run: ${e.message}`)));
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg failed: ${err.trim().split('\n').pop() || `it ended with ${code}`}`))));
  });
  done.catch(() => {});
  return {
    write: (data) =>
      new Promise((resolve, reject) => {
        if (broken) return reject(new Error(`ffmpeg stopped taking frames: ${err.trim().split('\n').pop() || broken.message}`));
        if (child.stdin.write(data)) resolve();
        else child.stdin.once('drain', resolve);
      }),
    end: () => {
      child.stdin.end();
      return done;
    },
    kill: () => child.kill('SIGKILL')
  };
}

export function decodeStill(file, index, width, height) {
  const r = spawnSync('ffmpeg', core.stillArgs({ file, index }), { maxBuffer: MAX_BUFFER });
  if (r.error) throw new Error(`ffmpeg could not run: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`ffmpeg failed on ${path.basename(file)}: ${String(r.stderr).trim().split('\n').pop()}`);
  if (r.stdout.length !== width * height * 3) throw new Error(`frame ${index} of ${path.basename(file)} came back with ${r.stdout.length} bytes, not ${width * height * 3}`);
  return r.stdout;
}

const rawRgb = (data, width, height) => sharp(data, { raw: { width, height, channels: 3 } });

async function sideBySide({ moment, stills, width, height, source, captions, title, file, record }) {
  const cell = gridFit({ cols: 2, rows: 2, aspect: width / height, title: true, maxCell: { width, height } });
  const box = core.worstBox(source, stills.stress, width, height, Math.max(1, Math.floor(cell.width / core.CROP_ZOOM)), Math.max(1, Math.floor(cell.height / core.CROP_ZOOM)));
  const whole = (data) => rawRgb(data, width, height).resize(cell.width, cell.height, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();
  const crop = (data) => rawRgb(data, width, height).extract(box).resize(cell.width, cell.height, { fit: 'fill', kernel: 'nearest' }).png().toBuffer();
  const where = `the part that changed most, ${box.width} x ${box.height} at ${box.left}, ${box.top}, ${core.CROP_ZOOM} times`;
  const cells = [
    { input: await whole(stills.delivered), caption: captions.delivered },
    { input: await whole(stills.stress), caption: captions.stress },
    { input: await crop(stills.delivered), caption: `As delivered${SEP}${where}` },
    { input: await crop(stills.stress), caption: `At the stress rate${SEP}${where}` }
  ];
  const out = await assemble([await tile({ cells, cols: 2, cell })], { title });
  await writePng(file, out.buffer, { ...record, kind: 'stress-side-by-side', crop: box, zoom: core.CROP_ZOOM, moment: moment.id });
  return box;
}

export async function stressMoment(moment, ctx) {
  const { cfg, film, format, tier, dir, state, print } = ctx;
  const fps = film.fps ?? cfg.film.fps;
  const { width, height } = core.sizeOf(format, cfg);
  const range = core.clipRange(moment.frame, film.frameCount, cfg.quality.stressClipSeconds, fps);
  const names = core.fileNames(moment, format, tier);
  const files = Object.fromEntries(Object.entries(names).map(([k, v]) => [k, path.join(dir, v)]));
  const settings = { delivered: core.encodeSettings('delivered', format, cfg), stress: core.encodeSettings('stress', format, cfg) };
  const wanted = core.want({ moment, range, format, tier, fps, built: state.built, browser: state.browser, units: core.unitsIn(film, range.first, range.last) });
  const recordOf = (f) => (fs.existsSync(f) && fs.existsSync(`${f}.json`) ? readJson(`${f}.json`) : null);
  for (const note of moment.notes) print(`stress: ${moment.id}: ${note}`);
  const old = recordOf(files.delivered);
  if (!ctx.force && Object.values(files).every((f) => fs.existsSync(f)) && core.sameRecord(old, wanted, settings.delivered) && core.sameRecord(recordOf(files.stress), wanted, settings.stress) && old.result) {
    print(`stress: ${moment.id} is reused: its records match the build`);
    return { ...old.result, reused: true };
  }
  fs.mkdirSync(dir, { recursive: true });
  const encoders = { delivered: encoder(core.encodeArgs({ settings: settings.delivered, width, height, fps, out: files.delivered })), stress: encoder(core.encodeArgs({ settings: settings.stress, width, height, fps, out: files.stress })) };
  let source = null;
  let renderSeconds = 0;
  try {
    for (let f = range.first; f <= range.last; f++) {
      const raw = await ctx.renderer.renderRaw({ frame: f, tier, format, hold: true });
      if (raw.width !== width || raw.height !== height) throw new Error(`frame ${f} came back ${raw.width} x ${raw.height}, not ${width} x ${height}`);
      renderSeconds += raw.seconds;
      if (f === moment.frame) source = core.flipToRgb(raw.data, width, height);
      await Promise.all([encoders.delivered.write(raw.data), encoders.stress.write(raw.data)]);
      if ((f - range.first + 1) % 10 === 0 || f === range.last) print(`stress: ${moment.id} frame ${f - range.first + 1} of ${range.count}`);
    }
    await Promise.all([encoders.delivered.end(), encoders.stress.end()]);
  } catch (e) {
    encoders.delivered.kill();
    encoders.stress.kill();
    for (const f of [files.delivered, files.stress]) fs.rmSync(f, { force: true });
    throw e;
  }
  const stills = { delivered: decodeStill(files.delivered, range.index, width, height), stress: decodeStill(files.stress, range.index, width, height) };
  const measured = {};
  for (const mode of ['delivered', 'stress']) {
    const bytes = fs.statSync(files[mode]).size;
    measured[mode] = { bytes, mbps: core.mbpsOf(bytes, range.count, fps), psnrDb: core.psnrValue(core.psnr(source, stills[mode])) };
  }
  measured.betweenPsnrDb = core.psnrValue(core.psnr(stills.delivered, stills.stress));
  const result = { id: moment.id, name: moment.name, unit: moment.unit, frame: moment.frame, timecode: timecode(moment.frame, fps), source: moment.source, exact: moment.exact, notes: moment.notes, first: range.first, last: range.last, frames: range.count, format, tier, width, height, files: names, measured, harsher: measured.stress.mbps < measured.delivered.mbps, reused: false };
  const base = { ...wanted, machine: state.machine, made: utc(), seconds: Number(renderSeconds.toFixed(3)), width, height };
  const where = `${moment.name}${SEP}film frame ${moment.frame}${SEP}${timecode(moment.frame, fps)}`;
  const captions = {
    delivered: `As delivered${SEP}crf ${settings.delivered.crf}${SEP}${measured.delivered.mbps} Mb/s${SEP}${core.psnrText(measured.delivered.psnrDb)} against the rendered frame`,
    stress: `At ${settings.stress.mbps} Mb/s${SEP}${measured.stress.mbps} Mb/s measured${SEP}${core.psnrText(measured.stress.psnrDb)} against the rendered frame`
  };
  // The frame as it was rendered, before any encode: the compression critic sees it beside the still from the stress encode.
  await rawRgb(source, width, height).png({ compressionLevel: 6 }).toFile(files.stillSource);
  writeJson(`${files.stillSource}.json`, { ...base, kind: 'stress-source', index: range.index });
  for (const mode of ['delivered', 'stress']) {
    const stillFile = mode === 'delivered' ? files.stillDelivered : files.stillStress;
    await rawRgb(stills[mode], width, height).png({ compressionLevel: 6 }).toFile(stillFile);
    writeJson(`${stillFile}.json`, { ...base, kind: 'stress-still', encode: settings[mode], from: names[mode], index: range.index, psnrDb: measured[mode].psnrDb });
  }
  const title = `Stress${SEP}${where}${SEP}${width} x ${height}${SEP}${tier} tier${moment.exact ? '' : `${SEP}${moment.source}`}`;
  result.crop = await sideBySide({ moment, stills, width, height, source, captions, title, file: files.sideBySide, record: { ...base, encode: settings, from: [names.delivered, names.stress] } });
  for (const mode of ['delivered', 'stress']) writeJson(`${files[mode]}.json`, { ...base, kind: 'stress-clip', encode: settings[mode], bytes: measured[mode].bytes, mbps: measured[mode].mbps, sha256: sha(files[mode]), result: mode === 'delivered' ? result : undefined });
  print(`stress: ${core.verdictLine(result, settings.stress.mbps)}`);
  return result;
}

export async function stressCommand(a, deps = {}) {
  const cfg = deps.cfg ?? config();
  const print = deps.print ?? ((l) => console.log(l));
  const root = deps.root ?? ROOT;
  const tier = one(a.tier, 'final');
  const format = one(a.format, cfg.formats.hd.id);
  if (!cfg.tiers[tier]) throw new Error(`no such tier: ${tier}. ${USAGE}`);
  if (!Object.values(cfg.formats).some((f) => f.id === format)) throw new Error(`no such format: ${format}. ${USAGE}`);
  if (a.tier !== undefined && typeof a.tier !== 'string') throw new Error(`--tier takes one tier. ${USAGE}`);
  const picked = core.chosen(a.moments);
  const dir = path.resolve(root, typeof a.out === 'string' ? a.out : core.WORK);
  const renderer = deps.renderer ?? (await realRenderer());
  const results = [];
  let held = false;
  try {
    renderer.ensureDisk?.();
    const film = await renderer.filmInfo();
    const state = await renderer.rendererState();
    const moments = picked.map((m) => core.pickMoment(m, film, cfg));
    const ctx = { cfg, film, format, tier, dir, state: { ...state, machine: state.machine ?? os.hostname() }, print, renderer, force: a.force !== undefined };
    await renderer.holdRenderer();
    held = true;
    for (const m of moments) results.push(await stressMoment(m, ctx));
    const report = { schema: core.SCHEMA, made: utc(), engine: state.built.engine, browser: state.browser, machine: ctx.state.machine, format, tier, fps: film.fps ?? cfg.film.fps, clipSeconds: cfg.quality.stressClipSeconds, stressMbps: cfg.quality.compressionStressMbps, crf: core.crfFor(format, cfg), pixelFormat: cfg.export.master.pixelFormat, asTheFilmIsDelivered: tier === 'final' && format === cfg.formats.hd.id, moments: results };
    writeJson(path.join(dir, core.REPORT), report);
    print(`stress: wrote ${path.relative(root, path.join(dir, core.REPORT))} with ${results.length} of the ${core.MOMENTS.length} moments${report.asTheFilmIsDelivered ? '' : `, a quick look at ${format} and the ${tier} tier`}`);
    return report;
  } finally {
    if (held) renderer.releaseRenderer();
    await renderer.closeRenderer?.();
  }
}

if (isMain(import.meta)) {
  stressCommand(args()).catch((e) => {
    console.error(`stress: ${String(e.message).split('\n')[0]}`);
    process.exit(1);
  });
}
