// @ts-nocheck
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const tool = (name) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const loud = await tool('lib/loudness');
const core = await tool('lib/mix-core');
const mix = await tool('mix');
const { config, rel, ROOT } = await tool('lib/paths');
const trial = await import(new URL('./fixtures/trial-cutlist.mjs', import.meta.url).href);

const cfg = config();
const rate = cfg.audio.sampleRate;
const fps = cfg.film.fps;
const { duckMaxDb, loudnessLufs, truePeakDb: peakLimit } = cfg.audio;
const tune = core.DEFAULTS;
const band = core.SPEECH_BAND;

const FILM_SECONDS = 12;
const MUSIC_SECONDS = 20;
const JOIN = 6;
const PIECES = [
  { from: 0, to: JOIN, at: 0 },
  { from: 10, to: 16.5, at: JOIN }
];
const NOISE = 0.05;
const SPIKE = { at: 5.5, seconds: 0.003, level: 0.9 };

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'carcass-mix-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

function noise(seconds, level, seed, channels = 1) {
  const next = core.generator(seed);
  return Array.from({ length: channels }, () => {
    const out = new Float32Array(Math.round(seconds * rate));
    for (let i = 0; i < out.length; i++) out[i] = (next() * 2 - 1) * level;
    return out;
  });
}

function makeMusic() {
  const m = noise(MUSIC_SECONDS, NOISE, 1, 2);
  const from = Math.round(SPIKE.at * rate);
  for (const ch of m) for (let i = 0; i < Math.round(SPIKE.seconds * rate); i++) ch[from + i] = SPIKE.level * Math.sin((2 * Math.PI * 1000 * i) / rate);
  return m;
}

const LINES = [
  { clip: 'n1', line: 1, start: 1.5, seconds: 1.5, level: NOISE * 10 ** (2 / 20) },
  { clip: 'n1', line: 2, start: 3.7, seconds: 1, level: NOISE / 5 },
  { clip: 'n1', line: 3, start: 6.5, seconds: 1, level: null },
  { clip: 'n2', line: 1, start: 8, seconds: 1.5, level: NOISE * 4 }
];
const BED = { id: 'bed', start: 10, seconds: 1.9, clipSeconds: 0.8, gainDb: -20 };

function makeCut(base) {
  const file = (name) => path.join(base, name);
  loud.writeWav(file('music.wav'), makeMusic(), rate, 16);
  LINES.forEach((l, i) => l.level && loud.writeWav(file(`${l.clip}-${l.line}.wav`), noise(l.seconds, l.level, 10 + i), rate, 16));
  loud.writeWav(file('bed.wav'), noise(BED.clipSeconds, NOISE, 30), rate, 16);
  const frameCount = FILM_SECONDS * fps;
  return {
    schema: 'carcass/cutlist 1',
    fps,
    frameCount,
    music: { file: file('music.wav'), pieces: PIECES, cut: { outBar: 1, inBar: 2, out: PIECES[0].to, in: PIECES[1].from, frame: JOIN * fps } },
    places: [],
    shots: [],
    keyFrames: {},
    lines: LINES.map((l) => ({ clip: l.clip, line: l.line, text: 'Trial.', unit: 'ribs', first: Math.round(l.start * fps), frames: Math.round(l.seconds * fps), file: l.level ? file(`${l.clip}-${l.line}.wav`) : null, carried: false })),
    events: [],
    titanFrame: 0,
    sounds: [{ id: BED.id, unit: 'ribs', kind: 'bed', first: BED.start * fps, frames: Math.round(BED.seconds * fps), file: file('bed.wav'), gainDb: BED.gainDb, fadeInSeconds: 0.3, fadeOutSeconds: 0.3, loop: true, event: null }]
  };
}

let cut;
let runs;
let made;
let heard;
const out = { flac: path.join(dir, 'out', 'mix.flac'), wav: path.join(dir, 'out', 'mix.wav'), report: path.join(dir, 'out', 'mix.json'), cut: path.join(dir, 'CUTLIST.json') };

beforeAll(() => {
  cut = makeCut(dir);
  fs.writeFileSync(out.cut, JSON.stringify(cut));
  const once = () => {
    const printed = [];
    const r = mix.mixCommand({ cut: out.cut, out: out.flac, wav: out.wav, report: out.report }, { print: (l) => printed.push(l) });
    return { r, printed, flac: fs.readFileSync(out.flac), wav: fs.readFileSync(out.wav), report: fs.readFileSync(out.report) };
  };
  runs = [once(), once()];
  made = runs[0].r;
  heard = loud.decode(out.flac, { rate, channels: 2 });
}, 120000);

describe('the measures', () => {
  it('agree with ffmpeg on the real music file', () => {
    const file = rel('audio', 'supplied', cfg.music.file);
    const r = spawnSync('ffmpeg', ['-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { maxBuffer: 2 ** 28 });
    const summary = String(r.stderr).split('Summary:').pop();
    const integrated = Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)[1]);
    const peak = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)[1]);
    const music = loud.decode(file);
    const info = loud.probe(file);
    expect(Math.abs(loud.integratedLufs(music, info.sampleRate) - integrated)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(loud.truePeakDb(music, info.sampleRate) - peak)).toBeLessThanOrEqual(0.3);
  }, 120000);

  it('read a sine at its known level and peak', () => {
    const tone = new Float32Array(rate * 2);
    for (let i = 0; i < tone.length; i++) tone[i] = 0.5 * Math.sin((2 * Math.PI * 997 * i) / rate);
    expect(loud.levelDb([tone], 0, 2, rate)).toBeCloseTo(-9.03, 1);
    expect(loud.truePeakDb([tone], rate)).toBeCloseTo(-6.02, 1);
    expect(loud.integratedLufs([tone, tone], rate)).toBeCloseTo(-6.02, 1);
    expect(loud.bandLevelDb([tone], rate, 0.5, 2, band.lowHz, band.highHz)).toBeCloseTo(-9.03, 0);
    const low = new Float32Array(rate * 2);
    for (let i = 0; i < low.length; i++) low[i] = 0.5 * Math.sin((2 * Math.PI * 60 * i) / rate);
    expect(loud.bandLevelDb([low], rate, 0.5, 2, band.lowHz, band.highHz)).toBeLessThan(-50);
  });

  it('write a WAV with a fixed header', () => {
    const bytes = loud.wavBytes([new Float32Array([0, 0.5, -1, 1])], rate, 16);
    expect(bytes.length).toBe(44 + 8);
    expect(bytes.readInt16LE(46)).toBe(16384);
    expect(bytes.readInt16LE(48)).toBe(-32768);
    expect(bytes.readInt16LE(50)).toBe(32767);
    expect(bytes.readUInt32LE(24)).toBe(rate);
  });
});

describe('the music and its one cut', () => {
  it('crossfades before the join and leaves the incoming attack untouched', () => {
    const music = [new Float32Array(MUSIC_SECONDS * rate)];
    const edge = 8 * rate;
    for (let i = 0; i < music[0].length; i++) music[0][i] = i < edge ? 0.25 : -0.5 - (i % 7) * 0.01;
    const length = FILM_SECONDS * rate;
    const laid = core.layMusic(music, PIECES, rate, length);
    const join = JOIN * rate;
    const fade = Math.round(core.JOIN.fadeSeconds * rate);
    const clear = Math.round(core.JOIN.clearSeconds * rate);
    const start = join - clear - fade;
    const shift = PIECES[1].from * rate - join;
    for (let n = start - 100; n < start; n++) expect(laid[0][n]).toBe(music[0][n]);
    for (let n = join - clear; n < join + 2000; n++) expect(laid[0][n]).toBe(music[0][n + shift]);
    const mid = start + fade / 2;
    expect(laid[0][mid]).toBeCloseTo(0.5 * music[0][mid] + 0.5 * music[0][mid + shift], 5);
    for (let n = start + 1; n < join - clear; n++) {
      const g = (n - start) / fade;
      expect(laid[0][n]).toBeCloseTo((1 - g) * music[0][n] + g * music[0][n + shift], 5);
    }
    expect(laid[1]).toEqual(laid[0]);
    expect(core.musicAtEnd(music, PIECES, rate, length)).toBe(true);
    expect(core.musicAtEnd(music, [PIECES[0]], rate, length)).toBe(false);
  });
});

describe('ducking', () => {
  it('moves down before a line, back up after it, and rests at 0 dB in a long pause', () => {
    const gap = tune.attackSeconds + tune.releaseSeconds + 0.2;
    const lines = [
      { start: 1, end: 2, duckDb: 6 },
      { start: 2 + gap, end: 4, duckDb: 3 },
      { start: 4 + gap / 4, end: 5, duckDb: 8 }
    ];
    const env = core.duckEnvelope(lines, rate, 6 * rate, tune.attackSeconds, tune.releaseSeconds);
    const at = (t) => env[Math.round(t * rate)];
    expect(at(1 - tune.attackSeconds - 0.01)).toBe(0);
    expect(at(1 - tune.attackSeconds / 2)).toBeCloseTo(-3, 2);
    expect(at(1)).toBeCloseTo(-6, 3);
    expect(at(1.5)).toBeCloseTo(-6, 5);
    expect(at(2 + tune.releaseSeconds / 2)).toBeCloseTo(-3, 2);
    expect(at(2 + tune.releaseSeconds + 0.05)).toBe(0);
    expect(at(2 + gap)).toBeCloseTo(-3, 3);
    let highest = -Infinity;
    for (let n = Math.round(4 * rate); n < Math.round((4 + gap / 4) * rate); n++) highest = Math.max(highest, env[n]);
    expect(highest).toBeLessThan(0);
    let step = 0;
    for (let n = 1; n < env.length; n++) step = Math.max(step, Math.abs(env[n] - env[n - 1]));
    expect(step).toBeLessThan(0.01);
    expect(env.reduce((a, b) => Math.min(a, b), 0)).toBeCloseTo(-8, 5);
  });

  it('lowers the rest by just enough, and never by more than audio.duckMaxDb', () => {
    const music = loud.decode(cut.music.file, { rate, channels: 2 });
    const rest = core.layMusic(music, PIECES, rate, FILM_SECONDS * rate);
    const need = (l) => {
      const voice = [new Float32Array(FILM_SECONDS * rate), new Float32Array(FILM_SECONDS * rate)];
      core.addClip(voice, loud.decode(path.join(dir, `${l.clip}-${l.line}.wav`), { rate }), Math.round(l.start * rate));
      const span = [l.start, l.start + l.seconds, band.lowHz, band.highHz];
      return loud.bandLevelDb(rest, rate, ...span) + tune.marginDb - loud.bandLevelDb(voice, rate, ...span);
    };
    const [a, b, d] = made.report.lines;
    expect(made.report.lines.length).toBe(3);
    expect(need(LINES[0])).toBeGreaterThan(1);
    expect(need(LINES[0])).toBeLessThan(duckMaxDb - 1);
    expect(a.duckDb).toBeCloseTo(need(LINES[0]), 1);
    expect(a.marginDb).toBeCloseTo(tune.marginDb, 1);
    expect(need(LINES[1])).toBeGreaterThan(duckMaxDb);
    expect(b.duckDb).toBe(duckMaxDb);
    expect(b.marginDb).toBeLessThan(tune.marginDb);
    expect(need(LINES[3])).toBeLessThan(0);
    expect(d.duckDb).toBe(0);
    expect(d.marginDb).toBeGreaterThan(tune.marginDb);
    for (const l of made.report.lines) {
      expect(l.duckDb).toBeGreaterThanOrEqual(0);
      expect(l.duckDb).toBeLessThanOrEqual(duckMaxDb);
      expect(l.marginDb).toBeCloseTo(l.voiceBandDb - l.restBandDb, 1);
    }
    expect(core.duckFor({ voiceBandDb: -60, restBandDb: -20, marginDb: tune.marginDb, maxDb: duckMaxDb })).toBe(duckMaxDb);
    expect(core.duckFor({ voiceBandDb: -10, restBandDb: -20, marginDb: tune.marginDb, maxDb: duckMaxDb })).toBe(0);
  });

  it('names a line with no file and skips it', () => {
    expect(runs[0].printed.some((l) => l === 'mix: line n1-3 has no file yet and is skipped')).toBe(true);
    expect(runs[0].printed.every((l) => l.startsWith('mix: '))).toBe(true);
    expect(runs[0].printed.join('\n')).not.toMatch(/[\u2014!]/);
  });
});

describe('sounds', () => {
  it('loops a short bed across its span with its gain and fades', () => {
    const clip = noise(0.8, 0.5, 5);
    const spanSamples = 3 * rate;
    const shaped = core.shapeSound(clip, { rate, spanSamples, gainDb: -20, fadeInSeconds: 0.5, fadeOutSeconds: 0.5, loop: true });
    expect(shaped.length).toBe(2);
    expect(shaped[0].length).toBe(spanSamples);
    expect(shaped[0][0]).toBe(0);
    expect(shaped[0][spanSamples - 1]).toBe(0);
    const whole = loud.levelDb(clip, 0, 0.8, rate);
    for (let t = 0.6; t < 2.3; t += 0.1) expect(loud.levelDb(shaped, t, t + 0.1, rate)).toBeCloseTo(whole - 20, 0);
    const once = core.shapeSound(clip, { rate, spanSamples, gainDb: 0, loop: false });
    expect(once[0].length).toBe(clip[0].length);
    expect(made.report.sounds).toEqual([{ id: BED.id, gainDb: BED.gainDb }]);
  });
});

describe('the mix', () => {
  it('is byte for byte the same when made twice', () => {
    expect(runs[0].wav.equals(runs[1].wav)).toBe(true);
    expect(runs[0].flac.equals(runs[1].flac)).toBe(true);
    expect(runs[0].report.equals(runs[1].report)).toBe(true);
    expect(runs[0].flac.includes('Lavf')).toBe(false);
  });

  it('is exactly as long as the film', () => {
    const frames = (cut.frameCount / fps) * rate;
    expect(runs[0].wav.length).toBe(44 + frames * 4);
    expect(heard.length).toBe(2);
    expect(heard[0].length).toBe(frames);
    expect(made.report.seconds).toBe(FILM_SECONDS);
    expect(made.report.sampleRate).toBe(rate);
    expect(made.report.channels).toBe(2);
  });

  it('fades the last 50 ms when the music still sounds at the end', () => {
    const frames = heard[0].length;
    expect(Math.abs(heard[0][frames - 1])).toBeLessThanOrEqual(2 / 32768);
    const tail = loud.levelDb(heard, FILM_SECONDS - 0.01, FILM_SECONDS, rate);
    const body = loud.levelDb(heard, FILM_SECONDS - 0.2, FILM_SECONDS - 0.1, rate);
    expect(tail).toBeLessThan(body - 12);
    expect(runs[0].printed.some((l) => l.includes('fade out'))).toBe(true);
  });

  it('lands on the loudness target and under the true peak limit, with the limiter', () => {
    expect(made.report.limited).toBe(true);
    expect(Math.abs(loud.integratedLufs(heard, rate) - loudnessLufs)).toBeLessThanOrEqual(0.2);
    expect(loud.truePeakDb(heard, rate)).toBeLessThanOrEqual(peakLimit);
    expect(made.ok).toBe(true);
  });

  it('reports numbers that agree with a direct measure of the output', () => {
    const r = JSON.parse(runs[0].report.toString());
    expect(r.schema).toBe('carcass/mix 1');
    expect(r.integratedLufs).toBeCloseTo(loud.integratedLufs(heard, rate), 2);
    expect(r.truePeakDb).toBeCloseTo(loud.truePeakDb(heard, rate), 2);
    expect(r.seconds).toBe(heard[0].length / rate);
    for (const l of r.lines) {
      const direct = loud.levelDb(heard, l.first / fps, (l.first + l.frames) / fps, rate);
      const summed = 10 * Math.log10(10 ** (l.voiceDb / 10) + 10 ** (l.restDb / 10));
      expect(Math.abs(direct - summed)).toBeLessThan(0.3);
      const bandDirect = loud.bandLevelDb(heard, rate, l.first / fps, (l.first + l.frames) / fps, band.lowHz, band.highHz);
      const bandSummed = 10 * Math.log10(10 ** (l.voiceBandDb / 10) + 10 ** (l.restBandDb / 10));
      expect(Math.abs(bandDirect - bandSummed)).toBeLessThan(0.3);
    }
    expect(r.inputs.map((i) => i.file)).toEqual(mix.inputFiles(cut));
    expect(r.inputs.every((i) => /^[0-9a-f]{64}$/.test(i.sha256))).toBe(true);
    expect(r.gainDb).toBeGreaterThan(0);
  });

  it('needs no limiter when the peaks are low, and still lands on the target', () => {
    const music = noise(MUSIC_SECONDS, NOISE, 1, 2);
    const quiet = { ...cut, lines: [], sounds: [], music: { ...cut.music, pieces: [{ from: 0, to: FILM_SECONDS, at: 0 }], cut: null } };
    const m = core.buildMix({ cut: quiet, cfg, music, clips: () => null });
    expect(m.report.limited).toBe(false);
    expect(m.report.integratedLufs).toBeCloseTo(loudnessLufs, 1);
    expect(m.report.truePeakDb).toBeLessThanOrEqual(peakLimit);
    expect(m.pcm[0].length).toBe(FILM_SECONDS * rate);
    expect(m.printed.some((l) => l.includes('fade out'))).toBe(true);
  });

  it('exits 1 with one plain line when a named file is missing', () => {
    const broken = path.join(dir, 'BROKEN.json');
    fs.writeFileSync(broken, JSON.stringify({ ...cut, music: { ...cut.music, file: path.join(dir, 'gone.wav') } }));
    const r = spawnSync('node', [path.join(ROOT, 'tools', 'mix.mjs'), '--cut', broken, '--out', path.join(dir, 'x.flac'), '--report', path.join(dir, 'x.json')]);
    expect(r.status).toBe(1);
    const lines = String(r.stderr).trim().split('\n');
    expect(lines.length).toBe(1);
    expect(lines[0]).toMatch(/^mix: .*gone\.wav is named by the cut list and does not exist$/);
    expect(fs.existsSync(path.join(dir, 'x.flac'))).toBe(false);
  });
});

describe('the trial cut list', () => {
  it('is in the schema, cuts the music once on bar lines and holds about thirty lines that do not overlap', () => {
    const t = trial.trialCutList({ cfg });
    expect(t.schema).toBe('carcass/cutlist 1');
    expect(t.frameCount).toBe(cfg.film.targetSeconds * fps);
    expect(t.music.pieces.length).toBe(2);
    expect(Math.abs(t.music.cut.out - trial.CUT_NEAR.out)).toBeLessThan(2);
    expect(Math.abs(t.music.cut.in - trial.CUT_NEAR.in)).toBeLessThan(2);
    expect(t.music.pieces[1].at).toBe(t.music.pieces[0].to);
    expect(t.lines.length).toBe(30);
    for (let i = 0; i < t.lines.length; i++) {
      const l = t.lines[i];
      expect(l.frames).toBeGreaterThanOrEqual(fps);
      expect(l.frames).toBeLessThanOrEqual(4 * fps);
      if (i > 0) expect(l.first).toBeGreaterThan(t.lines[i - 1].first + t.lines[i - 1].frames);
      expect(l.first + l.frames).toBeLessThan(t.frameCount);
    }
    expect(t.places.map((p) => p.unit)).toEqual(cfg.film.order);
    expect(JSON.stringify(trial.trialCutList({ cfg }))).toBe(JSON.stringify(t));
  });
});
