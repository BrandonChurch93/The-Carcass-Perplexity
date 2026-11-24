import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT, rel, config, readJson, writeJson } from '../../tools/lib/paths.mjs';

export const TRIAL_DIR = 'out/work/trial';
export const CUT_NEAR = { out: 178, in: 216.5 };
export const LINES_PER_CLIP = [4, 4, 4, 4, 4, 4, 3, 3];
const LEAD_SECONDS = 2;
const TAIL_SECONDS = 4;
const SHORTEST = 1;
const LONGEST = 4;
const SPEECH = { lowHz: 300, highHz: 3400, syllablesPerSecond: 4, depth: 0.8, peak: 0.5, volumeDb: 10 };

function generator(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function trialBars(cfg = config()) {
  const mapFile = rel('cut', 'MAP.json');
  if (fs.existsSync(mapFile)) return readJson(mapFile).bars;
  const bar = (60 / cfg.music.bpm) * 4;
  const bars = [];
  for (let t = cfg.music.landmarks.firstHit % bar; t < cfg.music.seconds; t += bar) bars.push(Number(t.toFixed(4)));
  return bars;
}

const nearest = (bars, t) => bars.reduce((best, b, i) => (Math.abs(b - t) < Math.abs(bars[best] - t) ? i : best), 0);

export function trialCutList({ cfg = config(), dir = TRIAL_DIR, withFiles = true } = {}) {
  const { fps, targetSeconds, order } = cfg.film;
  const frameCount = Math.round(targetSeconds * fps);
  const bars = trialBars(cfg);
  const outBar = nearest(bars, CUT_NEAR.out);
  const inBar = nearest(bars, CUT_NEAR.in);
  const out = bars[outBar];
  const into = bars[inBar];
  const frame = Math.round(out * fps);
  const pieces = [
    { from: 0, to: out, at: 0 },
    { from: into, to: cfg.music.seconds, at: out }
  ];
  const each = Math.floor(frameCount / order.length);
  const places = order.map((unit, i) => ({ unit, first: i * each, last: i === order.length - 1 ? frameCount - 1 : (i + 1) * each - 1 }));
  const shots = places.map((p, i) => ({ id: `${p.unit}-01`, unit: p.unit, first: p.first, last: p.last, key: null, picture: 'black', move: 'in', label: `Trial shot ${i + 1}` }));
  const unitAt = (f) => places.find((p) => f >= p.first && f <= p.last).unit;
  const next = generator(cfg.seed);
  const total = LINES_PER_CLIP.reduce((a, b) => a + b, 0);
  const slot = (targetSeconds - LEAD_SECONDS - TAIL_SECONDS) / total;
  const lines = [];
  let n = 0;
  LINES_PER_CLIP.forEach((count, c) => {
    for (let l = 1; l <= count; l++) {
      const length = SHORTEST + next() * (LONGEST - SHORTEST);
      const start = LEAD_SECONDS + n * slot + next() * Math.max(0, slot - length - 0.1);
      const first = Math.round(start * fps);
      const clip = `n${c + 1}`;
      lines.push({ clip, line: l, text: `Trial line ${n + 1}.`, unit: unitAt(first), first, frames: Math.round(length * fps), file: withFiles ? `${dir}/lines/${clip}-${l}.wav` : null, carried: false });
      n++;
    }
  });
  return {
    schema: 'carcass/cutlist 1',
    fps,
    frameCount,
    music: { file: `audio/supplied/${cfg.music.file}`, pieces, cut: { outBar, inBar, out, in: into, frame } },
    places,
    shots,
    keyFrames: {},
    lines,
    events: [],
    titanFrame: places[places.length - 1].first,
    sounds: [],
    mix: {}
  };
}

export function standInLine(file, seconds, seed, rate) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const source = `anoisesrc=d=${seconds.toFixed(4)}:c=pink:r=${rate}:a=${SPEECH.peak}:s=${seed}`;
  const shape = `highpass=f=${SPEECH.lowHz},lowpass=f=${SPEECH.highHz},tremolo=f=${SPEECH.syllablesPerSecond}:d=${SPEECH.depth},volume=${SPEECH.volumeDb}dB`;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', source, '-af', shape, '-ac', '1', '-flags', '+bitexact', '-c:a', 'pcm_s16le', file]);
  if (r.status !== 0) throw new Error(`ffmpeg could not make ${file}`);
  return file;
}

export function writeTrial({ cfg = config(), dir = TRIAL_DIR } = {}) {
  const cut = trialCutList({ cfg, dir });
  cut.lines.forEach((line, i) => standInLine(path.resolve(ROOT, line.file), line.frames / cut.fps, cfg.seed + i, cfg.audio.sampleRate));
  const file = path.resolve(ROOT, dir, 'CUTLIST.json');
  writeJson(file, cut);
  return { file, cut };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { file, cut } = writeTrial();
  console.log(`trial: wrote ${path.relative(ROOT, file)} with ${cut.lines.length} lines and one cut in the music from ${cut.music.cut.out} s to ${cut.music.cut.in} s`);
}
