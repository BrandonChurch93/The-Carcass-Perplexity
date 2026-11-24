import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { ROOT, args, config, readJson, writeJson } from './lib/paths.mjs';
import { isMain, one } from './lib/img.mjs';
import { decode, wavBytes } from './lib/loudness.mjs';
import { buildMix, BITS } from './lib/mix-core.mjs';

export const USAGE = 'usage: npm run mix [-- --cut PATH] [--out PATH] [--wav PATH] [--report PATH]';
export const NAME = 'mix';
const CUT_LIST = 'cut/CUTLIST.json';
const OUT = 'audio/mix/mix.flac';
const REPORT = 'audio/mix/mix.json';
const WAV_HEADER_BYTES = 44;
const MAX_BUFFER = 2 ** 31 - 1;

const named = (file) => path.relative(ROOT, path.resolve(ROOT, file)).split(path.sep).join('/');
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function inputFiles(cut) {
  const files = [cut.music.file, ...(cut.lines ?? []).map((l) => l.file), ...(cut.sounds ?? []).map((s) => s.file)];
  return [...new Set(files.filter(Boolean))];
}

export function writeFlac(file, wav, rate) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const r = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-y', '-f', `s${BITS}le`, '-ar', String(rate), '-ac', '2', '-i', 'pipe:0', '-fflags', '+bitexact', '-flags', '+bitexact', '-map_metadata', '-1', '-c:a', 'flac', '-sample_fmt', `s${BITS}`, '-f', 'flac', file],
    { input: wav.subarray(WAV_HEADER_BYTES), maxBuffer: MAX_BUFFER }
  );
  if (r.error || r.status !== 0) throw new Error(`ffmpeg could not write ${named(file)}`);
  return file;
}

export function mixCommand(a = {}, deps = {}) {
  const print = deps.print ?? console.log;
  const cfg = deps.cfg ?? config();
  const began = Date.now();
  const cutFile = path.resolve(ROOT, one(a.cut, CUT_LIST));
  const out = path.resolve(ROOT, one(a.out, OUT));
  const reportFile = path.resolve(ROOT, one(a.report, REPORT));
  const wavFile = a.wav && a.wav !== true ? path.resolve(ROOT, one(a.wav)) : null;
  if (!fs.existsSync(cutFile)) throw new Error(`${named(cutFile)} does not exist`);
  const cut = readJson(cutFile);
  if (!cut.music?.file) throw new Error(`${named(cutFile)} names no music file`);
  const files = inputFiles(cut);
  for (const file of files) {
    if (!fs.existsSync(path.resolve(ROOT, file))) throw new Error(`${file} is named by the cut list and does not exist`);
  }
  const rate = cfg.audio.sampleRate;
  const music = decode(path.resolve(ROOT, cut.music.file), { rate, channels: 2 });
  const cache = new Map();
  const clips = (file) => {
    if (!cache.has(file)) cache.set(file, decode(path.resolve(ROOT, file), { rate }));
    return cache.get(file);
  };
  const made = buildMix({ cut, cfg, music, clips, name: NAME });
  const wav = wavBytes(made.pcm, rate, BITS);
  writeFlac(out, wav, rate);
  if (wavFile) {
    fs.mkdirSync(path.dirname(wavFile), { recursive: true });
    fs.writeFileSync(wavFile, wav);
  }
  const report = { ...made.report, file: named(out), inputs: files.map((file) => ({ file, sha256: sha256(path.resolve(ROOT, file)) })) };
  writeJson(reportFile, report);
  for (const line of made.printed) print(line);
  print(`${NAME}: wrote ${named(out)}, ${fs.statSync(out).size} bytes`);
  if (wavFile) print(`${NAME}: wrote ${named(wavFile)}`);
  print(`${NAME}: wrote ${named(reportFile)}`);
  print(`${NAME}: took ${((Date.now() - began) / 1000).toFixed(1)} s`);
  return { out, wav: wavFile, reportFile, report, printed: made.printed, ok: made.ok };
}

if (isMain(import.meta)) {
  try {
    const a = args();
    if (a.help) console.log(USAGE);
    else if (!mixCommand(a).ok) throw new Error('the files are written, and the true peak is still over audio.truePeakDb');
  } catch (e) {
    console.error(`${NAME}: ${String(e.message).split('\n')[0]}`);
    process.exit(1);
  }
}
