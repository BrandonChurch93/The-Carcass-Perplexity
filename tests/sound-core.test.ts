// @ts-nocheck
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const tool = (name) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const core = await tool('lib/sound-core');
const sound = await tool('sound');
const loud = await tool('lib/loudness');
const voice = await tool('lib/voice-core');
const a2 = await tool('checks/a2');
const a5 = await tool('checks/a5');
const { config } = await tool('lib/paths');

const cfg = config();
const rate = cfg.audio.sampleRate;
const HANDLE = 'secret-handle-123';
const UNIT = cfg.film.order[1];
const OTHER = cfg.film.order[4];
const BED = { schema: core.CUE_SCHEMA, id: 'trial-bed', unit: UNIT, kind: 'bed', description: 'Thick lava folding and hissing, close, no music, no voices', seconds: 3, promptInfluence: 0.4, loop: true };
const SPOT = { schema: core.CUE_SCHEMA, id: 'trial-crack', description: 'A single flat crack of thunder with no rain', seconds: 2 };
const HEADERS = 'HTTP/2 200\r\ndate: Tue, 24 Nov 2026 21:22:47 GMT\r\ncontent-type: audio/mpeg\r\ncharacter-cost: 66\r\n\r\n';

let root;
let noise;
let crack;

function ffmpeg(argv) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...argv]);
  if (r.status !== 0) throw new Error(String(r.stderr));
}

function freshRoot(sounds = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'carcass-sound-'));
  fs.mkdirSync(path.join(dir, sound.CUES), { recursive: true });
  fs.mkdirSync(path.join(dir, 'cut'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'cut', 'CUTLIST.json'), JSON.stringify({ sounds }));
  for (const cue of [BED, SPOT]) fs.writeFileSync(path.join(dir, sound.CUES, `${cue.id}.json`), JSON.stringify(cue));
  return dir;
}

const listedSpot = { id: SPOT.id, unit: OTHER, kind: 'spot', first: 100, frames: 120, file: `${sound.KEPT_SOUNDS}/${OTHER}/${SPOT.id}.wav`, gainDb: -12, loop: false, event: null };

function deps(dir, extra = {}) {
  const lines = [];
  return { lines, cfg, root: dir, cwd: dir, print: (l) => lines.push(l), env: {}, runner: () => { throw new Error('nothing may call out'); }, ...extra };
}

function fakeRunner({ left = 1000, status = '200', body = null } = {}) {
  const calls = [];
  const run = (argv) => {
    calls.push(argv);
    if (argv[argv.length - 1].endsWith('/user/subscription')) return { status: 0, stdout: JSON.stringify({ character_count: 5000 - left, character_limit: 5000 }), stderr: '' };
    fs.writeFileSync(argv[argv.indexOf('-D') + 1], HEADERS);
    if (body === null) fs.copyFileSync(noise, argv[argv.indexOf('-o') + 1]);
    else fs.writeFileSync(argv[argv.indexOf('-o') + 1], body);
    return { status: 0, stdout: status, stderr: '' };
  };
  return { calls, run };
}

const tone = (seconds, level, hz = 220) => Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => level * Math.sin((2 * Math.PI * hz * i) / rate));
const silence = (seconds) => new Float32Array(Math.round(seconds * rate));
const join = (...parts) => {
  const out = new Float32Array(parts.reduce((a, p) => a + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};
const filesUnder = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, f)).isFile()) : []);

beforeAll(() => {
  root = freshRoot([listedSpot]);
  noise = path.join(root, 'noise.mp3');
  crack = path.join(root, 'crack.wav');
  ffmpeg(['-f', 'lavfi', '-i', 'anoisesrc=d=3:c=brown:r=44100:a=0.25:s=7', '-af', 'lowpass=f=900', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '192k', noise]);
  ffmpeg(['-f', 'lavfi', '-i', 'anoisesrc=d=1:c=pink:r=44100:a=0.6:s=3', '-af', 'afade=t=out:st=0.05:d=0.9,adelay=400:all=1,apad=pad_dur=0.6', '-ac', '2', crack]);
});

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe('a cue file', () => {
  it('is read with the unit and the kind of the cut list', () => {
    const cue = core.readCue(SPOT, SPOT.id, listedSpot);
    expect(cue).toEqual({ id: SPOT.id, unit: OTHER, kind: 'spot', description: SPOT.description, seconds: 2, promptInfluence: null, loop: false, listed: true });
    expect(core.readCue(BED, BED.id).unit).toBe(UNIT);
    expect(core.readCue(BED, BED.id).listed).toBe(false);
  });

  it('is refused with a plain reason when it is wrong', () => {
    const bad = (change, id = BED.id, listed = null) => () => core.readCue({ ...BED, ...change }, id, listed);
    expect(bad({ schema: 'x' })).toThrow(/schema/);
    expect(bad({ id: 'other' })).toThrow(/names the cue/);
    expect(bad({ description: ' ' })).toThrow(/no description/);
    expect(bad({ description: 'x'.repeat(core.SOUND.maxDescription + 1) })).toThrow(/characters/);
    expect(bad({ seconds: core.SOUND.maxSeconds + 1 })).toThrow(/seconds/);
    expect(bad({ seconds: '6' })).toThrow(/seconds/);
    expect(bad({ promptInfluence: 1.5 })).toThrow(/prompt influence/);
    expect(bad({ loop: 'yes' })).toThrow(/loop/);
    expect(bad({ unit: undefined })).toThrow(/names no unit/);
    expect(bad({ kind: 'music' })).toThrow(/kind/);
    expect(bad({}, BED.id, { unit: OTHER, kind: 'bed' })).toThrow(/cut list says/);
    expect(() => core.readCue(null, 'x')).toThrow(/not an object/);
  });

  it('becomes the body of the call, with only what was asked', () => {
    expect(core.requestBody(core.readCue(BED, BED.id))).toEqual({ text: BED.description, model_id: core.SOUND.model, duration_seconds: 3, prompt_influence: 0.4, loop: true });
    expect(core.requestBody(core.readCue(SPOT, SPOT.id, listedSpot))).toEqual({ text: SPOT.description, model_id: core.SOUND.model, duration_seconds: 2 });
    expect(core.costOf(core.readCue(BED, BED.id))).toBe(3 * core.SOUND.creditsPerSecond);
    expect(core.requestUrl('https://x/v1')).toBe(`https://x/v1/sound-generation?output_format=${core.SOUND.outputFormat}`);
  });

  it('tells a refusal for quota from another refusal', () => {
    expect(core.refusal(401, JSON.stringify({ detail: { status: 'quota_exceeded', message: 'This request exceeds your quota. You have 0 credits remaining.' } })).quota).toBe(true);
    expect(core.refusal(429, JSON.stringify({ detail: { status: 'rate_limit_exceeded', message: 'Too many requests, you have used your quota of calls' } })).quota).toBe(false);
    expect(core.refusal(401, JSON.stringify({ detail: { status: 'invalid_api_key', message: 'Invalid API key' } })).quota).toBe(false);
    expect(core.refusal(500, 'not json').quota).toBe(false);
    expect(core.refusal(500, 'not json').message).toBe('not json');
  });
});

describe('the measures of a take', () => {
  it('finds the silence at both ends, the length and the level', () => {
    const ch = [join(silence(0.3), tone(1, 0.25), silence(0.5))];
    const m = core.measure(ch, rate);
    expect(m.seconds).toBeCloseTo(1.8, 3);
    expect(m.channels).toBe(1);
    expect(Math.abs(m.headSilenceSeconds - 0.3)).toBeLessThanOrEqual(0.011);
    expect(Math.abs(m.tailSilenceSeconds - 0.5)).toBeLessThanOrEqual(0.011);
    expect(m.clippedRuns).toBe(0);
    expect(m.silent).toBe(false);
    expect(Math.abs(m.truePeakDb - loud.db(0.25))).toBeLessThanOrEqual(0.2);
    expect(m.lufs).toBeLessThan(-10);
    expect(m.lufs).toBeGreaterThan(-25);
  });

  it('counts clipping and names it as a fault', () => {
    const ch = [tone(1, 2).map((v) => Math.max(-1, Math.min(1, v)))];
    const m = core.measure(ch, rate);
    expect(m.clippedRuns).toBeGreaterThan(10);
    expect(core.faultsOf(m, { seconds: 1, loop: false }).join(' ')).toMatch(/clips/);
  });

  it('names a silent take, a wrong length and a long silent start', () => {
    expect(core.faultsOf(core.measure([silence(1)], rate), { seconds: 1, loop: false })).toContain('It is silent, or close to it.');
    expect(core.faultsOf(core.measure([tone(1, 0.2)], rate), { seconds: 2, loop: false }).join(' ')).toMatch(/1\.00 s long where 2 s was asked/);
    expect(core.faultsOf(core.measure([join(silence(0.8), tone(1.2, 0.2))], rate), { seconds: 2, loop: false }).join(' ')).toMatch(/starts with 0\.80 s of silence/);
    expect(core.faultsOf(core.measure([tone(2, 0.2)], rate), { seconds: 2, loop: false })).toEqual([]);
  });

  it('measures how far apart the two ends of a loop are', () => {
    expect(core.seamDb([tone(2, 0.2)], rate)).toBeLessThan(0.1);
    expect(Math.abs(core.seamDb([join(tone(1, 0.4), tone(1, 0.1))], rate) - 12.04)).toBeLessThan(0.2);
  });
});

describe('the trim and the level', () => {
  it('cuts the silence at the ends and leaves a little room', () => {
    const ch = [join(silence(0.3), tone(1, 0.25), silence(0.5)), join(silence(0.3), tone(1, 0.2), silence(0.5))];
    const t = core.trim(ch, rate);
    const seconds = t.channels[0].length / rate;
    expect(t.channels).toHaveLength(2);
    expect(Math.abs(seconds - (1 + 2 * core.EDGE.roomSeconds))).toBeLessThanOrEqual(0.025);
    expect(Math.abs(t.cutHeadSeconds - (0.3 - core.EDGE.roomSeconds))).toBeLessThanOrEqual(0.011);
    expect(t.channels[0][0]).toBe(0);
    expect(Math.abs(t.channels[0][t.channels[0].length - 1])).toBeLessThan(1e-3);
  });

  it('leaves a loop whole', () => {
    const ch = [join(silence(0.3), tone(1, 0.25), silence(0.5))];
    const t = core.trim(ch, rate, { loop: true });
    expect(t.channels[0].length).toBe(ch[0].length);
    expect(t.cutHeadSeconds).toBe(0);
    expect(t.faded).toBe(false);
  });

  it('brings a quiet take to the level of the method under the peak limit', () => {
    const ch = [tone(3, 0.02, 180), tone(3, 0.015, 260)];
    const out = core.toLevel(ch, rate);
    expect(out.gainDb).toBeGreaterThan(10);
    expect(Math.abs(out.lufs - voice.LEVEL.listenLufs)).toBeLessThanOrEqual(0.2);
    expect(out.truePeakDb).toBeLessThanOrEqual(voice.LEVEL.truePeakDb);
    expect(out.channels).toHaveLength(2);
    expect(Math.abs(loud.integratedLufs(out.channels, rate) - voice.LEVEL.listenLufs)).toBeLessThanOrEqual(0.2);
  });

  it('holds the peak of a take with a spike, on both channels alike', () => {
    const left = tone(2, 0.05);
    const right = tone(2, 0.05);
    for (let i = 0; i < 40; i++) left[rate + i] = 0.9;
    const out = core.limit([left, right], rate, 12);
    expect(loud.truePeakDb(out, rate)).toBeLessThanOrEqual(voice.LEVEL.truePeakDb);
    const quiet = Math.abs(out[1][rate + 10] / (right[rate + 10] * loud.fromDb(12)));
    expect(quiet).toBeLessThan(0.5);
    expect(Math.abs(out[1][100] / (right[100] * loud.fromDb(12)) - 1)).toBeLessThan(1e-3);
  });

  it('leaves silence alone', () => {
    const out = core.toLevel([silence(1)], rate);
    expect(out.gainDb).toBe(0);
    expect(out.rounds).toBe(0);
  });
});

describe('the limits', () => {
  it('stops at the takes a cue may have, counted from disk and from the record', () => {
    const max = cfg.audio.maxTakesPerCue;
    expect(core.nextTake([], null, max)).toEqual({ ok: true, used: 0, take: 1 });
    expect(core.nextTake([1, 2], null, max).take).toBe(3);
    expect(core.nextTake([2], max - 1, max).take).toBe(max);
    expect(core.nextTake(Array.from({ length: max }, (_, i) => i + 1), null, max).ok).toBe(false);
    expect(core.nextTake([], max, max).ok).toBe(false);
  });

  it('stops at the cues a place may have, and lets a known cue through', () => {
    const max = cfg.audio.maxCuesPerPlace;
    const full = Array.from({ length: max }, (_, i) => `c${i}`);
    expect(core.placeRoom({ cue: 'new', unit: UNIT, cuesOfUnit: full, max }).ok).toBe(false);
    expect(core.placeRoom({ cue: 'c0', unit: UNIT, cuesOfUnit: full, max }).ok).toBe(true);
    expect(core.placeRoom({ cue: 'new', unit: UNIT, cuesOfUnit: full.slice(1), max }).ok).toBe(true);
  });
});

describe('the command, on stand-in takes', () => {
  it('files a take from a file, measured, trimmed and levelled, as a 48 kHz WAV', async () => {
    const d = deps(root);
    const out = await sound.soundCommand({ _: [], cue: SPOT.id, take: crack }, d);
    const check = out.made[0];
    expect(check.take).toBe(1);
    expect(check.unit).toBe(OTHER);
    expect(check.source).toBe('crack.wav');
    expect(Math.abs(check.asReturned.headSilenceSeconds - 0.4)).toBeLessThanOrEqual(0.03);
    expect(check.asReturned.tailSilenceSeconds).toBeGreaterThan(0.5);
    expect(check.asFiled.seconds).toBeLessThan(check.asReturned.seconds - 0.8);
    expect(Math.abs(check.asFiled.lufs - voice.LEVEL.listenLufs)).toBeLessThanOrEqual(0.3);
    expect(check.asFiled.truePeakDb).toBeLessThanOrEqual(voice.LEVEL.truePeakDb);
    const wav = path.join(root, sound.TAKES, SPOT.id, 'take-1.wav');
    expect(loud.probe(wav)).toEqual({ channels: 2, sampleRate: rate });
    expect(d.lines[0]).toMatch(/^sound: trial-crack take 1, /);
    expect(d.lines.every((l) => l.startsWith('sound: '))).toBe(true);
  });

  it('makes a take through the one call, with the body and the address of the reference', async () => {
    const run = fakeRunner();
    const d = deps(root, { env: { CARCASS_ELEVEN_HANDLE: HANDLE }, runner: run.run });
    const out = await sound.soundCommand({ _: [], cue: BED.id }, d);
    expect(run.calls).toHaveLength(2);
    const call = run.calls[1];
    expect(call.slice(0, 4)).toEqual(['pplx', 'credentials', 'run', HANDLE]);
    expect(call).toContain(`https://api.elevenlabs.io/v1/sound-generation?output_format=${core.SOUND.outputFormat}`);
    const sent = JSON.parse(fs.readFileSync(path.join(root, sound.TAKES, BED.id, 'take-1.request.json'), 'utf8'));
    expect(sent).toEqual({ text: BED.description, model_id: core.SOUND.model, duration_seconds: 3, prompt_influence: 0.4, loop: true });
    expect(out.made[0].day).toBe('2026-11-24');
    expect(out.made[0].characterCost).toBe(66);
    expect(out.made[0].source).toBe(null);
    expect(out.made[0].rejected).toBe(false);
    expect(Math.abs(out.made[0].asFiled.seconds - out.made[0].asReturned.seconds)).toBeLessThan(0.001);
    expect(d.lines.join('\n')).not.toContain(HANDLE);
  });

  it('keeps a take: the file, the record in the format of the kit and the row', async () => {
    await sound.soundCommand({ _: [], cue: SPOT.id, take: crack }, deps(root));
    fs.writeFileSync(path.join(root, sound.TAKES, SPOT.id, 'take-2.listener-1.txt'), 'A sharp crack  of thunder,\nno rain.\n');
    fs.writeFileSync(path.join(root, sound.TAKES, SPOT.id, 'take-2.listener-2.txt'), 'One dry thunderclap.');
    const d = deps(root);
    const out = await sound.soundCommand({ _: [], cue: SPOT.id, keep: '2' }, d);
    const file = `${sound.KEPT_SOUNDS}/${OTHER}/${SPOT.id}.wav`;
    expect(out.kept.file).toBe(file);
    expect(fs.readFileSync(path.join(root, file)).equals(fs.readFileSync(path.join(root, sound.TAKES, SPOT.id, 'take-2.wav')))).toBe(true);
    const record = fs.readFileSync(path.join(root, sound.RECORDS, `${SPOT.id}.md`), 'utf8');
    expect(a2.recordLacks(record, SPOT.id, false)).toEqual([]);
    expect(record).toContain(`Text or description: ${JSON.stringify(SPOT.description)}`);
    expect(record).toContain('Takes: 2 made, take 2 kept. ');
    expect(record).toContain('The listener: call 1: "A sharp crack of thunder, no rain." call 2: "One dry thunderclap."');
    expect(record).toContain(`Files: ${file}`);
    expect(record).not.toMatch(/—|!/);
    expect(core.readRecord(record)).toEqual({ made: 2, kept: 2, withFault: false, kind: 'spot', unit: OTHER, description: SPOT.description });
    expect(a5.takeFaults([{ id: SPOT.id, takes: '2 made, take 2 kept' }], null, cfg).faults).toEqual([]);
    expect(out.kept.row).toBe(`| \`${file}\` | A stand-in from the file crack.wav | 2 made, take 2 kept | not recorded |`);
    expect(a2.hasRow(out.kept.row, file)).toBe(true);
    expect(d.lines).toContain(`sound: the row for ASSETS.md: ${out.kept.row}`);
    expect(fs.existsSync(path.join(root, sound.ASSETS))).toBe(false);
  });

  it('keeps a take that the Builder faulted, and says so', async () => {
    const dir = freshRoot();
    await sound.soundCommand({ _: [], cue: BED.id, take: noise }, deps(dir));
    fs.writeFileSync(path.join(dir, sound.TAKES, BED.id, 'take-1.verdict.json'), JSON.stringify({ fault: 'a voice is heard at 2 s' }));
    const out = await sound.soundCommand({ _: [], cue: BED.id, keep: '1' }, deps(dir));
    expect(out.kept.record).toContain('Takes: 1 made, take 1 kept with a fault. Take 1 was kept with a fault.');
    expect(out.kept.record).toContain('a voice is heard at 2 s');
    expect(out.kept.record).toContain('Made by: tools/sound.mjs, from the file noise.mp3 and not from the account');
    await expect(sound.soundCommand({ _: [], cue: BED.id, keep: '4' }, deps(dir))).rejects.toThrow(/has no take 4/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('writes the record of a made take with the call that made it', async () => {
    const out = await sound.soundCommand({ _: [], cue: BED.id, keep: '1' }, deps(root));
    expect(out.kept.record).toContain(`Made by: tools/sound.mjs, POST https://api.elevenlabs.io/v1/sound-generation?output_format=${core.SOUND.outputFormat}, model ${core.SOUND.model}`);
    expect(out.kept.record).toContain('Settings: duration_seconds 3, prompt_influence 0.4, loop true, ');
    expect(out.kept.record).toContain('Date: 2026-11-24');
    expect(out.kept.record).toMatch(/the two ends [\d.]+ dB apart/);
    expect(out.kept.row).toBe(`| \`${sound.KEPT_SOUNDS}/${UNIT}/${BED.id}.wav\` | ElevenLabs sound effects, \`${core.SOUND.model}\` | 1 made, take 1 kept | 2026-11-24 |`);
  });

  it('draws every kept sound on one sheet', async () => {
    const d = deps(root);
    const out = await sound.soundCommand({ _: [], sheet: true }, d);
    expect(out.sheet).toBe(path.join(root, sound.SHEET));
    const rows = sound.sheetRows({ root, cfg });
    expect(rows.map((r) => r.id)).toEqual([BED.id, SPOT.id]);
    const svg = sound.sheetSvg(rows).svg;
    expect(svg).toContain(BED.id);
    expect(svg).toContain(`${rows[1].seconds.toFixed(2)} s`);
    expect(svg).toContain('A single flat crack of thunder');
    const sharp = (await import('sharp')).default;
    const meta = await sharp(out.sheet).metadata();
    expect(meta.width).toBe(1600);
    expect(meta.height).toBeGreaterThan(300);
    expect(JSON.parse(fs.readFileSync(`${out.sheet}.json`, 'utf8')).sounds).toHaveLength(2);
    expect(sound.sheetSvg([]).svg).toContain('No sound is kept yet');
  });

  it('stops at the takes of a cue', async () => {
    const d = deps(root);
    await sound.soundCommand({ _: [], cue: SPOT.id, take: crack }, d);
    expect(sound.takesOnDisk(root, SPOT.id)).toHaveLength(cfg.audio.maxTakesPerCue);
    await expect(sound.soundCommand({ _: [], cue: SPOT.id, take: crack }, deps(root))).rejects.toThrow(new RegExp(`has its ${cfg.audio.maxTakesPerCue} takes, so no more are made`));
    expect(sound.takesOnDisk(root, SPOT.id)).toHaveLength(cfg.audio.maxTakesPerCue);
  });

  it('stops at the cues of a place', async () => {
    const dir = freshRoot();
    const max = cfg.audio.maxCuesPerPlace;
    for (let i = 0; i < max + 1; i++) fs.writeFileSync(path.join(dir, sound.CUES, `c${i}.json`), JSON.stringify({ ...BED, id: `c${i}` }));
    for (let i = 0; i < max; i++) await sound.soundCommand({ _: [], cue: `c${i}`, take: noise }, deps(dir));
    expect(sound.cuesOfUnit(dir, UNIT)).toHaveLength(max);
    await expect(sound.soundCommand({ _: [], cue: `c${max}`, take: noise }, deps(dir))).rejects.toThrow(new RegExp(`has its ${cfg.audio.maxCuesPerPlace} cues`));
    await sound.soundCommand({ _: [], cue: 'c0', take: noise }, deps(dir));
    expect(sound.takesOnDisk(dir, 'c0')).toEqual([1, 2]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('a call that cannot be made', () => {
  it('says so in one line and writes nothing when the account has too little left', async () => {
    const dir = freshRoot();
    const run = fakeRunner({ left: 10 });
    await expect(sound.soundCommand({ _: [], cue: BED.id }, deps(dir, { env: { CARCASS_ELEVEN_HANDLE: HANDLE }, runner: run.run }))).rejects.toThrow(/was not made\. It needs about \d+ credits and the account has 10 left\. Nothing was written\./);
    expect(run.calls).toHaveLength(1);
    expect(filesUnder(path.join(dir, 'out'))).toEqual([]);
    expect(filesUnder(path.join(dir, 'audio', 'kept'))).toEqual([]);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('says so in one line and writes nothing when the account refuses for quota', async () => {
    const dir = freshRoot();
    const run = fakeRunner({ status: '401', body: JSON.stringify({ detail: { status: 'quota_exceeded', message: `This request exceeds your quota, key ${HANDLE}.` } }) });
    let message = '';
    await sound.soundCommand({ _: [], cue: BED.id }, deps(dir, { env: { CARCASS_ELEVEN_HANDLE: HANDLE }, runner: run.run })).catch((e) => (message = e.message));
    expect(message).toMatch(/^trial-bed was not made\. The account refused it for quota: This request exceeds your quota/);
    expect(message).not.toContain(HANDLE);
    expect(message.split('\n')).toHaveLength(1);
    expect(run.calls).toHaveLength(2);
    expect(filesUnder(path.join(dir, 'out'))).toEqual([]);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('fails plainly on another refusal, with no handle, and with no cue file', async () => {
    const dir = freshRoot();
    const run = fakeRunner({ status: '500', body: 'the server fell over' });
    await expect(sound.soundCommand({ _: [], cue: BED.id }, deps(dir, { env: { CARCASS_ELEVEN_HANDLE: HANDLE }, runner: run.run }))).rejects.toThrow(/take 1 failed with status 500: the server fell over/);
    expect(filesUnder(path.join(dir, 'out'))).toEqual([]);
    await expect(sound.soundCommand({ _: [], cue: BED.id }, deps(dir))).rejects.toThrow(/no handle/);
    await expect(sound.soundCommand({ _: [], cue: 'absent' }, deps(dir))).rejects.toThrow(/audio\/cues\/absent\.json does not exist/);
    await expect(sound.soundCommand({ _: [] }, deps(dir))).rejects.toThrow(/usage: npm run sound/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('shows the request and its cost on a dry run without a call', async () => {
    const dir = freshRoot();
    const d = deps(dir);
    await sound.soundCommand({ _: [], cue: BED.id, 'dry-run': true }, d);
    expect(d.lines[0]).toMatch(/^sound: trial-bed take 1 would cost about \d+ credits\. The request: \{"text"/);
    expect(filesUnder(path.join(dir, 'out'))).toEqual([]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
