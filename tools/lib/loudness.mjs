import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { config } from './paths.mjs';

export const BLOCK_SECONDS = 0.4;
export const STEP_SECONDS = 0.1;
export const ABSOLUTE_GATE = -70;
export const RELATIVE_GATE = -10;
export const OVERSAMPLE = 4;
export const SILENCE_DB = -120;
const TAPS = 12;
const KAISER_BETA = 8;
const MAX_BUFFER = 2 ** 31 - 1;
const BAND_LEAD_SECONDS = 0.25;
const BUTTERWORTH_Q = [0.541196100146197, 1.3065629648763766];

export const db = (ratio) => (ratio > 0 ? 20 * Math.log10(ratio) : SILENCE_DB);
export const powerDb = (power) => (power > 0 ? Math.max(SILENCE_DB, 10 * Math.log10(power)) : SILENCE_DB);
export const fromDb = (value) => 10 ** (value / 20);

function run(cmd, argv) {
  const r = spawnSync(cmd, argv, { maxBuffer: MAX_BUFFER });
  if (r.error) throw new Error(`${cmd} could not run: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd} failed: ${String(r.stderr).trim().split('\n').pop()}`);
  return r.stdout;
}

export function probe(file) {
  const out = run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels,sample_rate', '-of', 'json', file]);
  const s = JSON.parse(out.toString()).streams[0];
  return { channels: Number(s.channels), sampleRate: Number(s.sample_rate) };
}

export function decode(file, { rate, channels } = {}) {
  if (!fs.existsSync(file)) throw new Error(`${file} does not exist`);
  const info = rate && channels ? null : probe(file);
  const count = channels ?? info.channels;
  const hz = rate ?? info.sampleRate;
  const raw = run('ffmpeg', ['-v', 'error', '-nostdin', '-i', file, '-map', '0:a:0', '-vn', '-flags', '+bitexact', '-ac', String(count), '-ar', String(hz), '-f', 'f32le', '-c:a', 'pcm_f32le', '-']);
  const frames = Math.floor(raw.length / (4 * count));
  const out = Array.from({ length: count }, () => new Float32Array(frames));
  for (let i = 0; i < frames; i++) for (let c = 0; c < count; c++) out[c][i] = raw.readFloatLE((i * count + c) * 4);
  return out;
}

export function biquad(type, hz, q, rate) {
  const w = (2 * Math.PI * hz) / rate;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  const a0 = 1 + alpha;
  const edge = type === 'highpass' ? (1 + cos) / 2 : (1 - cos) / 2;
  const mid = type === 'highpass' ? -(1 + cos) : 1 - cos;
  return { b0: edge / a0, b1: mid / a0, b2: edge / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0 };
}

export function kWeighting(rate) {
  const shelfK = Math.tan((Math.PI * 1681.974450955533) / rate);
  const shelfQ = 0.7071752369554196;
  const vh = 10 ** (3.999843853973347 / 20);
  const vb = vh ** 0.4996667741545416;
  const sa = 1 + shelfK / shelfQ + shelfK * shelfK;
  const shelf = {
    b0: (vh + (vb * shelfK) / shelfQ + shelfK * shelfK) / sa,
    b1: (2 * (shelfK * shelfK - vh)) / sa,
    b2: (vh - (vb * shelfK) / shelfQ + shelfK * shelfK) / sa,
    a1: (2 * (shelfK * shelfK - 1)) / sa,
    a2: (1 - shelfK / shelfQ + shelfK * shelfK) / sa
  };
  const passK = Math.tan((Math.PI * 38.13547087602444) / rate);
  const passQ = 0.5003270373238773;
  const pa = 1 + passK / passQ + passK * passK;
  const pass = { b0: 1, b1: -2, b2: 1, a1: (2 * (passK * passK - 1)) / pa, a2: (1 - passK / passQ + passK * passK) / pa };
  return [shelf, pass];
}

export function filter(samples, stages, from = 0, to = samples.length) {
  const out = new Float64Array(to - from);
  for (let i = 0; i < out.length; i++) out[i] = samples[from + i];
  for (const s of stages) {
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < out.length; i++) {
      const x = out[i];
      const y = s.b0 * x + s.b1 * x1 + s.b2 * x2 - s.a1 * y1 - s.a2 * y2;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      out[i] = y;
    }
  }
  return out;
}

export function integratedLufs(channels, rate) {
  const step = Math.round(STEP_SECONDS * rate);
  const perBlock = Math.round(BLOCK_SECONDS / STEP_SECONDS);
  const length = channels[0].length;
  const steps = Math.floor(length / step);
  if (steps < perBlock) return SILENCE_DB;
  const stages = kWeighting(rate);
  const energy = new Float64Array(steps);
  for (const ch of channels) {
    const y = filter(ch, stages);
    for (let s = 0; s < steps; s++) {
      let sum = 0;
      const end = (s + 1) * step;
      for (let i = s * step; i < end; i++) sum += y[i] * y[i];
      energy[s] += sum;
    }
  }
  const blocks = [];
  for (let s = 0; s + perBlock <= steps; s++) {
    let sum = 0;
    for (let k = 0; k < perBlock; k++) sum += energy[s + k];
    blocks.push(sum / (perBlock * step));
  }
  const loud = (z) => -0.691 + 10 * Math.log10(z);
  const mean = (list) => list.reduce((a, b) => a + b, 0) / list.length;
  const heard = blocks.filter((z) => z > 0 && loud(z) > ABSOLUTE_GATE);
  if (heard.length === 0) return SILENCE_DB;
  const gate = loud(mean(heard)) + RELATIVE_GATE;
  const kept = heard.filter((z) => loud(z) > gate);
  return kept.length === 0 ? SILENCE_DB : loud(mean(kept));
}

function bessel(x) {
  let sum = 1;
  let term = 1;
  for (let k = 1; k < 40; k++) {
    term *= (x / (2 * k)) ** 2;
    sum += term;
  }
  return sum;
}

let phases = null;
function phaseTaps() {
  if (phases) return phases;
  const half = TAPS / 2;
  phases = [];
  for (let p = 1; p < OVERSAMPLE; p++) {
    const taps = new Float64Array(TAPS);
    const frac = p / OVERSAMPLE;
    for (let k = 0; k < TAPS; k++) {
      const t = frac - (k - half + 1);
      const u = t / half;
      const window = Math.abs(u) >= 1 ? 0 : bessel(KAISER_BETA * Math.sqrt(1 - u * u)) / bessel(KAISER_BETA);
      taps[k] = (Math.sin(Math.PI * t) / (Math.PI * t)) * window;
    }
    phases.push(taps);
  }
  return phases;
}

export function oversampledPeaks(channels) {
  const taps = phaseTaps();
  const half = TAPS / 2;
  const length = channels[0].length;
  const peaks = new Float32Array(length);
  for (const ch of channels) {
    for (let n = 0; n < length; n++) {
      const here = Math.abs(ch[n]);
      if (here > peaks[n]) peaks[n] = here;
    }
    const last = length - half;
    for (let n = half - 1; n < last; n++) {
      const base = n - half + 1;
      let between = 0;
      for (let p = 0; p < taps.length; p++) {
        const h = taps[p];
        let sum = 0;
        for (let k = 0; k < TAPS; k++) sum += ch[base + k] * h[k];
        const mag = Math.abs(sum);
        if (mag > between) between = mag;
      }
      if (between > peaks[n]) peaks[n] = between;
      if (between > peaks[n + 1]) peaks[n + 1] = between;
    }
  }
  return peaks;
}

export function truePeakDb(channels, rate) {
  const peaks = oversampledPeaks(channels, rate);
  let top = 0;
  for (let i = 0; i < peaks.length; i++) if (peaks[i] > top) top = peaks[i];
  return db(top);
}

function span(channels, rate, fromSeconds, toSeconds) {
  const length = channels[0].length;
  const from = Math.min(length, Math.max(0, Math.round(fromSeconds * rate)));
  const to = Math.min(length, Math.max(from, Math.round(toSeconds * rate)));
  return { from, to };
}

export function bandStages(rate, lowHz, highHz) {
  return [...BUTTERWORTH_Q.map((q) => biquad('highpass', lowHz, q, rate)), ...BUTTERWORTH_Q.map((q) => biquad('lowpass', highHz, q, rate))];
}

export function bandLevelDb(channels, rate, fromSeconds, toSeconds, lowHz, highHz) {
  const { from, to } = span(channels, rate, fromSeconds, toSeconds);
  if (to <= from) return SILENCE_DB;
  const lead = Math.max(0, from - Math.round(BAND_LEAD_SECONDS * rate));
  const stages = bandStages(rate, lowHz, highHz);
  let sum = 0;
  for (const ch of channels) {
    const y = filter(ch, stages, lead, to);
    for (let i = from - lead; i < y.length; i++) sum += y[i] * y[i];
  }
  return powerDb(sum / (channels.length * (to - from)));
}

export function levelDb(channels, fromSeconds, toSeconds, rate = null) {
  const hz = rate ?? config().audio.sampleRate;
  const { from, to } = span(channels, hz, fromSeconds, toSeconds);
  if (to <= from) return SILENCE_DB;
  let sum = 0;
  for (const ch of channels) for (let i = from; i < to; i++) sum += ch[i] * ch[i];
  return powerDb(sum / (channels.length * (to - from)));
}

export function wavBytes(channels, rate, bits = 16) {
  if (bits !== 16) throw new Error('writeWav writes 16 bit files only');
  const count = channels.length;
  const frames = channels[0].length;
  const data = frames * count * 2;
  const buf = Buffer.alloc(44 + data);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + data, 4);
  buf.write('WAVEfmt ', 8, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(count, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * count * 2, 28);
  buf.writeUInt16LE(count * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(data, 40);
  const whole = channels.map((ch) => ch instanceof Int16Array);
  let at = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < count; c++) {
      const v = whole[c] ? channels[c][i] : Math.max(-32768, Math.min(32767, Math.round(channels[c][i] * 32768)));
      buf.writeInt16LE(v, at);
      at += 2;
    }
  }
  return buf;
}

export function writeWav(file, channels, rate, bits = 16) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, wavBytes(channels, rate, bits));
  return file;
}
