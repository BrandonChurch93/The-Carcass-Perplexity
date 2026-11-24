// @ts-nocheck
import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tool = (name) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const core = await tool('lib/audiomap-core');
const audiomap = await tool('audiomap');
const { config, rel, readJson } = await tool('lib/paths');

const cfg = config();
const RATE = core.ANALYSIS_RATE;
const BPM = 96;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const PICKUP = 1.25;
const BUILD_END = PICKUP + 8 * BAR;
const QUIET_START = PICKUP + 14 * BAR;
const QUIET_END = PICKUP + 18 * BAR;
const MID = PICKUP + 12 * BAR;
const TAIL = PICKUP + 22 * BAR;
const SECONDS = 64;

const dirs = [];
const temp = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'carcass-audiomap-'));
  dirs.push(d);
  return d;
};
afterAll(() => {
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
});

function synth() {
  const n = Math.round(SECONDS * RATE);
  const out = new Float32Array(n);
  let seed = 12345;
  const noise = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 31 - 1;
  };
  const pad = (t) => {
    if (t < PICKUP) return 0.002;
    if (t < BUILD_END) return 0.02 + (0.18 * (t - PICKUP)) / (BUILD_END - PICKUP);
    if (t < QUIET_START) return 0.2;
    if (t < QUIET_END) return 0.004;
    if (t < TAIL) return 0.2;
    return 0.2 * Math.exp(-(t - TAIL) / 1.2);
  };
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    out[i] = pad(t) * (0.6 * Math.sin(2 * Math.PI * 440 * t) + 0.4 * noise());
  }
  const add = (at, amp, hz, tau) => {
    const s = Math.round(at * RATE);
    for (let i = s; i < Math.min(n, s + Math.round(tau * 8 * RATE)); i++) {
      const t = (i - s) / RATE;
      out[i] += amp * Math.exp(-t / tau) * (hz ? Math.sin(2 * Math.PI * hz * t + Math.PI / 2) : noise());
    }
  };
  const beats = [];
  const downs = [];
  for (let k = 0; PICKUP + k * BEAT < TAIL - 1e-6; k++) {
    const t = PICKUP + k * BEAT;
    if (t >= QUIET_START - 1e-6 && t < QUIET_END - 1e-6) continue;
    beats.push(t);
    add(t, 0.3, 0, 0.004);
    if (k % 4 === 0) {
      downs.push(t);
      const reveal = Math.abs(t - QUIET_END) < 1e-6;
      const mid = Math.abs(t - MID) < 1e-6;
      add(t, reveal ? 0.95 : mid ? 0.8 : 0.6, 60, reveal ? 0.3 : 0.08);
      if (reveal || mid) add(t, reveal ? 0.6 : 0.8, 0, 0.01);
    }
  }
  for (let i = 0; i < n; i++) out[i] = Math.max(-1, Math.min(1, out[i]));
  return { samples: out, beats, downs };
}

function writeWav(file, samples, rate) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.round(samples[i] * 32767), i * 2);
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([head, data]));
}

const sound = synth();
const music = {
  file: 'synthetic.wav',
  sha256: 'none',
  seconds: SECONDS,
  bpm: BPM,
  barSeconds: BAR,
  landmarks: { firstHit: PICKUP, midHit: MID, quietStart: QUIET_START, quietEnd: QUIET_END, revealHit: QUIET_END, end: SECONDS },
};
const an = core.analyse(sound.samples, RATE, { configBpm: BPM });
const source = { file: music.file, sha256: music.sha256, seconds: SECONDS, sampleRate: RATE, channels: 1 };
const { map } = core.buildMap(an, { source, music });
const near = (list, t) => list.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a));

describe('the transform', () => {
  it('puts a sine in its own bin', () => {
    const n = 256;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = Math.cos((2 * Math.PI * 19 * i) / n);
    core.fft(re, im);
    const mags = Array.from(re, (v, i) => Math.hypot(v, im[i]));
    expect(mags.indexOf(Math.max(...mags.slice(0, n / 2)))).toBe(19);
    expect(mags[19]).toBeCloseTo(n / 2, 6);
  });
});

describe('the map of a made sound', () => {
  it('finds the tempo within half a percent and four beats to a bar', () => {
    expect(Math.abs(map.tempo.bpm / BPM - 1)).toBeLessThan(0.005);
    expect(map.tempo.beatsPerBar).toBe(4);
    expect(map.tempo.configBpm).toBe(BPM);
    expect(map.tempo.confidence).toBeGreaterThan(0.8);
  });

  it('puts the bar lines within 30 ms', () => {
    for (let t = PICKUP; t < SECONDS; t += BAR) expect(Math.abs(near(map.bars, t) - t)).toBeLessThan(0.03);
    expect(map.bars[0]).toBeGreaterThanOrEqual(0);
    expect(map.bars[0]).toBeLessThan(BAR);
    const beats = new Set(map.beats);
    for (const b of map.bars) expect(beats.has(b)).toBe(true);
  });

  it('finds the hits on the downbeats', () => {
    const times = map.hits.map((h) => h.t);
    for (const t of sound.downs) expect(Math.abs(near(times, t) - t)).toBeLessThan(0.015);
    for (const h of map.hits) {
      expect(h.low).toBeGreaterThanOrEqual(0);
      expect(h.low).toBeLessThanOrEqual(1);
      expect(h.full).toBeGreaterThanOrEqual(0);
      expect(h.full).toBeLessThanOrEqual(1);
    }
    const top = map.hits.reduce((a, b) => (b.low > a.low ? b : a));
    expect(Math.abs(top.t - QUIET_END)).toBeLessThan(0.015);
    expect(top.low).toBe(1);
  });

  it('finds the long quiet', () => {
    expect(map.quiet).not.toBeNull();
    expect(Math.abs(map.quiet.start - QUIET_START)).toBeLessThan(0.75);
    expect(Math.abs(map.quiet.end - QUIET_END)).toBeLessThan(0.75);
    const quiet = map.sections.find((s) => s.name.startsWith('quiet') && s.start > QUIET_START - 2 && s.end < QUIET_END + 2);
    expect(quiet).toBeDefined();
  });

  it('reads the landmarks the sound defines and agrees on the first try', () => {
    expect(Math.abs(map.landmarks.firstHit - PICKUP)).toBeLessThan(0.03);
    expect(Math.abs(map.landmarks.midHit - MID)).toBeLessThan(0.03);
    expect(Math.abs(map.landmarks.revealHit - QUIET_END)).toBeLessThan(0.03);
    expect(map.landmarks.quietStart).toBe(map.quiet.start);
    expect(map.landmarks.quietEnd).toBe(map.quiet.end);
    expect(map.landmarks.finalHit).toBeGreaterThanOrEqual(map.landmarks.revealHit);
    expect(map.landmarks.end).toBeGreaterThan(SECONDS - 4);
    expect(map.tries).toHaveLength(1);
    expect(map.tries[0].agrees).toBe(true);
    expect(map.usedConfigFor).toEqual([]);
    expect(Math.abs(map.compare.revealHit.bars)).toBeLessThan(0.05);
  });

  it('covers the file with sections and obeys the schema', () => {
    expect(core.checkMap(map)).toEqual([]);
    expect(map.sections[0].start).toBe(0);
    expect(map.sections[map.sections.length - 1].end).toBe(SECONDS);
    expect(map.madeFrom).toBe('audio');
  });

  it('falls back to the config after three tries that disagree', () => {
    const far = { ...music, landmarks: { ...music.landmarks, revealHit: QUIET_END - 3 * BAR } };
    const made = core.buildMap(an, { source, music: far }).map;
    expect(made.tries).toHaveLength(3);
    expect(made.usedConfigFor).toEqual(['revealHit']);
    expect(made.landmarks.revealHit).toBe(far.landmarks.revealHit);
    expect(Math.abs(made.compare.revealHit.map - QUIET_END)).toBeLessThan(0.03);
  });
});

describe('the command', () => {
  it('writes the same bytes twice and draws nothing when told not to', async () => {
    const dir = temp();
    const file = path.join(dir, music.file);
    writeWav(file, sound.samples, RATE);
    const lines = [];
    const run = (out) => audiomap.audiomapCommand({ file, out, 'no-plot': true }, { cfg: { ...cfg, music }, print: (l) => lines.push(l) });
    const a = path.join(dir, 'a.json');
    const b = path.join(dir, 'b.json');
    await run(a);
    await run(b);
    expect(fs.readFileSync(a).equals(fs.readFileSync(b))).toBe(true);
    const made = readJson(a);
    expect(core.checkMap(made)).toEqual([]);
    expect(made.source.sha256).toBe(audiomap.sha256(file));
    expect(made.source.sampleRate).toBe(RATE);
    expect(Math.abs(made.tempo.bpm / BPM - 1)).toBeLessThan(0.005);
    expect(lines.every((l) => l.startsWith('audiomap: '))).toBe(true);
    expect(lines.join('\n')).not.toMatch(/[—!]/);
  }, 60000);

  it('says so when there is no music file', async () => {
    await expect(audiomap.audiomapCommand({ file: path.join(temp(), 'none.mp3'), 'no-plot': true }, { cfg, print: () => {} })).rejects.toThrow(/no music file/);
  });
});

describe('the map from the landmarks', () => {
  const made = core.mapFromLandmarks(cfg.music);
  const lm = cfg.music.landmarks;

  it('obeys the schema', () => {
    expect(core.checkMap(made)).toEqual([]);
    expect(made.madeFrom).toBe('landmarks');
    expect(made.tempo.bpm).toBe(cfg.music.bpm);
    expect(made.landmarks).toEqual(lm);
    expect(made.quiet).toEqual({ start: lm.quietStart, end: lm.quietEnd });
    expect(Object.keys(made.compare)).toEqual(Object.keys(lm));
    expect(JSON.stringify(made)).toBe(JSON.stringify(core.mapFromLandmarks(cfg.music)));
  });

  it('counts the bar lines from the first strike in both directions', () => {
    expect(made.bars).toContain(lm.firstHit);
    for (let i = 1; i < made.bars.length; i++) expect(made.bars[i] - made.bars[i - 1]).toBeCloseTo(cfg.music.barSeconds, 3);
    expect(made.bars[0]).toBeGreaterThanOrEqual(0);
    expect(made.bars[0]).toBeLessThan(cfg.music.barSeconds);
    expect(made.bars[made.bars.length - 1]).toBeGreaterThan(cfg.music.seconds - cfg.music.barSeconds);
    const beats = new Set(made.beats);
    for (const b of made.bars) expect(beats.has(b)).toBe(true);
  });

  it('has a hit at each strike', () => {
    const times = made.hits.map((h) => h.t);
    for (const k of core.STRIKES) expect(times).toContain(lm[k]);
  });
});

describe('the committed map', () => {
  const file = rel('cut', 'MAP.json');
  it.skipIf(!fs.existsSync(file))('obeys the schema and names the music of the config', () => {
    const made = readJson(file);
    expect(core.checkMap(made)).toEqual([]);
    expect(made.source.file).toBe(cfg.music.file);
    if (made.madeFrom === 'audio') expect(made.source.sha256).toBe(cfg.music.sha256);
    for (const k of Object.keys(cfg.music.landmarks)) expect(made.landmarks[k]).toBeTypeOf('number');
  });
});
