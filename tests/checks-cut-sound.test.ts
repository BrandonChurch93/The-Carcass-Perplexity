// @ts-nocheck
import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tool = (name) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const gate = await tool('gate');
const g7 = await tool('checks/g7');
const g11 = await tool('checks/g11');
const g15 = await tool('checks/g15');
const g16 = await tool('checks/g16');
const d1 = await tool('checks/d1');
const a1 = await tool('checks/a1');
const a2 = await tool('checks/a2');
const a3 = await tool('checks/a3');
const a4 = await tool('checks/a4');
const a5 = await tool('checks/a5');
const a6 = await tool('checks/a6');
const { config } = await tool('lib/paths');

const cfg = config();
const fps = cfg.film.fps;
const tol = cfg.film.cutToleranceFrames;
const clone = (v) => JSON.parse(JSON.stringify(v));
const BEAT = 1;
const BAR = 4;
const PLACE = Math.ceil((cfg.film.minPlaceSeconds + 12) / BAR) * BAR;
const six = cfg.film.order.slice(0, -1);
const last = cfg.film.order[cfg.film.order.length - 1];
const REVEAL = PLACE * six.length;
const OUT = REVEAL + BAR;
const FILM = cfg.film.targetSeconds;
const IN = OUT + 10 * BAR;
const MUSIC = IN + (FILM - OUT);

function makeMap() {
  const beats = Array.from({ length: Math.floor(MUSIC / BEAT) + 1 }, (_, i) => i * BEAT);
  const bars = beats.filter((b) => b % BAR === 0);
  return {
    schema: 'carcass/map 1',
    madeFrom: 'audio',
    beats,
    bars,
    hits: [{ t: 40, low: 1, full: 1 }, { t: REVEAL, low: 0.9, full: 1 }],
    landmarks: { firstHit: 40, revealHit: REVEAL, end: MUSIC }
  };
}

function makeCut() {
  const frameCount = FILM * fps;
  const places = cfg.film.order.map((unit, i) => ({ unit, first: i * PLACE * fps, last: unit === last ? frameCount - 1 : (i + 1) * PLACE * fps - 1 }));
  const shots = places.flatMap((p, i) => {
    const mid = p.first + 2 * BAR * fps;
    return [
      { id: `${p.unit}-01`, unit: p.unit, first: p.first, last: mid - 1, key: null, picture: 'black', move: 'in', label: p.unit },
      { id: `${p.unit}-02`, unit: p.unit, first: mid, last: p.last, key: null, picture: 'black', move: i % 2 ? 'hold' : 'out', label: p.unit }
    ];
  });
  const place = (unit) => places.find((p) => p.unit === unit);
  const keyFrames = Object.fromEntries(cfg.keys.map((k) => [k.id, place(k.unit).first + (k.order + 1) * fps]));
  const seen = {};
  // The made-up cut list holds the spoken script: narration.clips less what narration.cut drops.
  const lines = g16.scriptLines(cfg).map((l) => {
    const k = (seen[l.unit] = (seen[l.unit] ?? -1) + 1);
    return { clip: l.clip, line: l.line, text: l.text, unit: l.unit, first: place(l.unit).first + fps + k * 200, frames: 120, file: null, carried: false };
  });
  return {
    schema: 'carcass/cutlist 1',
    fps,
    frameCount,
    music: {
      file: `audio/supplied/${cfg.music.file}`,
      pieces: [
        { from: 0, to: OUT, at: 0 },
        { from: IN, to: MUSIC, at: OUT }
      ],
      cut: { outBar: OUT / BAR, inBar: IN / BAR, out: OUT, in: IN, frame: OUT * fps }
    },
    places,
    shots,
    keyFrames,
    lines,
    events: [{ id: 'bore', unit: six[0], frame: 40 * fps, accent: 40, what: 'The bore comes through' }],
    titanFrame: REVEAL * fps,
    sounds: [],
    mix: {}
  };
}

const text = (r) => r.faults.join('\n');
const dirs = [];
const temp = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'carcass-checks-'));
  dirs.push(d);
  return d;
};
const put = (root, file, body) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), body);
};
afterAll(() => {
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
});
const ctx = (root, extra = {}) => ({ phase: 1, root, config: cfg, exec: async () => ({ code: 0, tail: [], timedOut: false }), ...extra });

describe('the made-up cut list and map', () => {
  it('pass every check that reads them', () => {
    const cut = makeCut();
    const map = makeMap();
    expect(g7.lengths(cut, cfg).faults).toEqual([]);
    expect(g11.cutFollowsMusic(cut, map, cfg).faults).toEqual([]);
    expect(g15.keysHaveFrames(cut, cfg).faults).toEqual([]);
    expect(g16.words(cut, cfg).faults).toEqual([]);
  });
});

describe('G7, the lengths', () => {
  it('fails a film that is too short or too long', () => {
    const short = makeCut();
    short.frameCount = (cfg.film.minSeconds - 1) * fps;
    expect(text(g7.lengths(short, cfg))).toMatch(/The film is .* s too short\./);
    const long = makeCut();
    long.frameCount = (cfg.film.maxSeconds + 1) * fps;
    expect(text(g7.lengths(long, cfg))).toMatch(/The film is .* s too long\./);
  });

  it('fails a place under the least length, and not the last unit of the order', () => {
    const cut = makeCut();
    const move = (PLACE - cfg.film.minPlaceSeconds + 1) * fps;
    cut.places[1].last -= move;
    cut.places[2].first -= move;
    const r = g7.lengths(cut, cfg);
    expect(r.faults).toHaveLength(1);
    expect(r.faults[0]).toContain(`The place ${six[1]} has ${cfg.film.minPlaceSeconds - 1} s`);
    const brief = makeCut();
    const end = brief.places[brief.places.length - 1];
    end.last = end.first + fps - 1;
    brief.frameCount = end.last + 1;
    expect(text(g7.lengths(brief, cfg))).not.toContain(`The place ${last}`);
  });

  it('fails places out of order, a missing place and a gap', () => {
    const cut = makeCut();
    [cut.places[0].unit, cut.places[1].unit] = [cut.places[1].unit, cut.places[0].unit];
    expect(text(g7.lengths(cut, cfg))).toContain('The places come in the order');
    const less = makeCut();
    less.places.splice(2, 1);
    expect(text(g7.lengths(less, cfg))).toContain(`The place ${six[2]} is not in places`);
    const gap = makeCut();
    gap.places[3].first += 5;
    expect(text(g7.lengths(gap, cfg))).toContain('a gap of 5 frames');
  });

  it('fails a loop outside its limits, and reads the loop with no cut list', () => {
    const c = clone(cfg);
    c.deliver.cardLoop.seconds = c.deliver.cardLoop.maxSeconds + 1;
    expect(text(g7.lengths(makeCut(), c))).toContain(`The loop is ${c.deliver.cardLoop.seconds} s`);
    c.deliver.cardLoop.seconds = c.deliver.cardLoop.minSeconds - 1;
    const r = g7.lengths(null, c);
    expect(r.faults).toHaveLength(1);
    expect(r.skipped[0]).toContain('no cut/CUTLIST.json yet');
    expect(g7.lengths(null, cfg).faults).toEqual([]);
  });
});

describe('G11, the cut follows the music', () => {
  it('reads the music time of a frame from the pieces', () => {
    const cut = makeCut();
    expect(g11.musicTime(0, cut)).toBe(0);
    expect(g11.musicTime(OUT * fps - 1, cut)).toBeCloseTo(OUT - 1 / fps, 6);
    expect(g11.musicTime(OUT * fps, cut)).toBeCloseTo(IN, 6);
    expect(g11.musicTime(cut.frameCount + 10, cut)).toBe(null);
  });

  it('passes a cut at the edge of the tolerance and fails one frame past it, with the numbers', () => {
    const map = makeMap();
    const ok = makeCut();
    ok.shots[2].last += tol;
    ok.shots[3].first += tol;
    expect(g11.cutFollowsMusic(ok, map, cfg).faults).toEqual([]);
    const off = makeCut();
    off.shots[2].last += tol + 1;
    off.shots[3].first += tol + 1;
    const r = g11.cutFollowsMusic(off, map, cfg);
    expect(r.faults).toHaveLength(1);
    expect(r.faults[0]).toContain(`The cut into shot ${off.shots[3].id} at frame ${off.shots[3].first}`);
    expect(r.faults[0]).toContain(`${tol + 1} frames away where ${tol} are allowed`);
    expect(r.faults[0]).toMatch(/is at music second [\d.]+, the nearest accent is at [\d.]+ s/);
  });

  it('reads a cut after the join against the music under it', () => {
    const map = makeMap();
    const cut = makeCut();
    const at = (OUT + 2 * BEAT) * fps;
    const end = cut.shots[cut.shots.length - 1];
    cut.shots.push({ ...end, id: 'late', first: at });
    end.last = at - 1;
    expect(g11.cutFollowsMusic(cut, map, cfg).faults).toEqual([]);
    map.beats = map.beats.filter((b) => b !== IN + 2 * BEAT);
    expect(text(g11.cutFollowsMusic(cut, map, cfg))).toContain('The cut into shot late');
  });

  it('fails an event off its accent and an event whose accent is not in the map', () => {
    const map = makeMap();
    const off = makeCut();
    off.events[0].frame += tol + 2;
    expect(text(g11.cutFollowsMusic(off, map, cfg))).toMatch(/The event bore at frame \d+ .* its accent is at 40 s/);
    const made = makeCut();
    made.events[0].accent = 40.4;
    made.events[0].frame = Math.round(40.4 * fps);
    const r = g11.cutFollowsMusic(made, map, cfg);
    expect(r.faults).toHaveLength(1);
    expect(r.faults[0]).toContain('names the accent 40.4 s, which is no accent of cut/MAP.json');
  });

  it('fails a titan frame off every accent, and one on an accent that is not the reveal strike', () => {
    const map = makeMap();
    const off = makeCut();
    off.titanFrame += Math.round((BEAT * fps) / 2);
    const r = g11.cutFollowsMusic(off, map, cfg);
    expect(text(r)).toContain(`The titan frame at frame ${off.titanFrame}`);
    expect(text(r)).toContain('and the reveal strike is at');
    const beat = makeCut();
    beat.titanFrame += BEAT * fps;
    const s = g11.cutFollowsMusic(beat, map, cfg);
    expect(s.faults).toHaveLength(1);
    expect(s.faults[0]).toContain(`The titan frame ${beat.titanFrame} is at music second ${REVEAL + BEAT} and the reveal strike is at ${REVEAL} s`);
  });

  it('fails music that does not start at its first sample or is cut before the titan frame', () => {
    const map = makeMap();
    const late = makeCut();
    late.music.pieces[0].from = BAR;
    late.music.pieces[0].to += BAR;
    late.music.cut.out += BAR;
    late.music.cut.outBar += 1;
    expect(text(g11.cutFollowsMusic(late, map, cfg))).toContain(`The first piece of the music starts at music second ${BAR} and film second 0`);
    const early = makeCut();
    const out = REVEAL - BAR;
    early.music.pieces = [
      { from: 0, to: out, at: 0 },
      { from: out + BAR, to: MUSIC, at: out }
    ];
    early.music.cut = { outBar: out / BAR, inBar: out / BAR + 1, out, in: out + BAR, frame: out * fps };
    early.shots = [{ ...early.shots[0], last: early.frameCount - 1 }];
    early.events = [];
    const r = g11.cutFollowsMusic(early, map, cfg);
    expect(text(r)).toContain('so the music is cut before the titan frame');
    expect(text(r)).toContain('which is not after the titan frame');
  });

  it('fails music that is not cut, or cut twice', () => {
    const map = makeMap();
    const whole = makeCut();
    whole.music.pieces = [{ from: 0, to: FILM, at: 0 }];
    whole.music.cut = null;
    const r = g11.cutFollowsMusic(whole, map, cfg);
    expect(text(r)).toContain('The music is in 1 piece and has to be in 2');
    expect(text(r)).toContain('music.cut of cut/CUTLIST.json is empty');
    const three = makeCut();
    three.music.pieces.push({ from: 0, to: 1, at: FILM });
    expect(text(g11.cutFollowsMusic(three, map, cfg))).toContain('The music is in 3 pieces');
  });

  it('fails a join that is not at two bar lines or does not match the pieces', () => {
    const map = makeMap();
    const beat = makeCut();
    beat.music.cut.in = IN + BEAT;
    beat.music.pieces[1].from = IN + BEAT;
    const r = g11.cutFollowsMusic(beat, map, cfg);
    expect(r.faults).toHaveLength(1);
    expect(r.faults[0]).toContain(`music.cut.in is ${IN + BEAT} s, which is no bar line of cut/MAP.json`);
    const edge = makeCut();
    edge.music.pieces[0].to = OUT - 0.5;
    expect(text(g11.cutFollowsMusic(edge, map, cfg))).toContain(`The first piece of the music ends at ${OUT - 0.5} s and music.cut.out is ${OUT} s`);
    const index = makeCut();
    index.music.cut.outBar += 1;
    expect(text(g11.cutFollowsMusic(index, map, cfg))).toContain('music.cut.outBar');
    const close = makeCut();
    close.music.cut.out += 0.0004;
    close.music.pieces[0].to += 0.0004;
    expect(g11.cutFollowsMusic(close, map, cfg).faults).toEqual([]);
  });

  it('says so when the map was made from the landmarks, and reads them as accents', () => {
    const map = makeMap();
    expect(g11.cutFollowsMusic(makeCut(), map, cfg).info.join(' ')).not.toContain('landmarks of the config');
    map.madeFrom = 'landmarks';
    map.landmarks.midHit = 50.5;
    const cut = makeCut();
    const at = Math.round(50.5 * fps);
    cut.shots[2].last = at - 1;
    cut.shots[3].first = at;
    const r = g11.cutFollowsMusic(cut, map, cfg);
    expect(r.faults).toEqual([]);
    expect(r.info[0]).toContain('the accents read here are the landmarks of the config');
    map.madeFrom = 'audio';
    expect(g11.cutFollowsMusic(cut, map, cfg).faults).toHaveLength(1);
  });

  it('counts the cuts on a bar line, on a beat and on a hit as information', () => {
    const cut = makeCut();
    const at = (2 * BAR + BEAT) * fps;
    cut.shots[0].last = at - 1;
    cut.shots[1].first = at;
    const r = g11.cutFollowsMusic(cut, makeMap(), cfg);
    expect(r.faults).toEqual([]);
    const n = cut.shots.length - 1;
    expect(r.info.join(' ')).toContain(`Of ${n} cuts, ${n - 1} sit on a bar line, 1 on a beat that is no bar line and 1 on a hit`);
  });
});

describe('G15, the key frames', () => {
  it('fails a key with no key frame and a key frame outside its unit', () => {
    const none = makeCut();
    delete none.keyFrames[cfg.keys[3].id];
    const r = g15.keysHaveFrames(none, cfg);
    expect(r.faults).toEqual([`The key ${cfg.keys[3].id} has no key frame in keyFrames of cut/CUTLIST.json.`]);
    const out = makeCut();
    const key = cfg.keys.find((k) => k.unit === six[1]);
    out.keyFrames[key.id] = out.places[1].last + 1;
    expect(text(g15.keysHaveFrames(out, cfg))).toContain(`The key ${key.id} has its key frame at ${out.places[1].last + 1}, outside the span of its unit ${six[1]}`);
    out.keyFrames[key.id] = out.places[1].last;
    expect(g15.keysHaveFrames(out, cfg).faults).toEqual([]);
  });

  it('reports the windows of the rise as not checked', () => {
    expect(g15.keysHaveFrames(makeCut(), cfg).skipped).toEqual(['the windows of the rise: read from the film in Phase 2']);
  });
});

describe('G16, the words', () => {
  it('fails a changed character, a missing line and lines out of order', () => {
    const word = makeCut();
    word.lines[5].text = word.lines[5].text.replace('.', '');
    const r = g16.words(word, cfg);
    expect(r.faults).toHaveLength(1);
    expect(r.faults[0]).toContain(`Line ${word.lines[5].line} of clip ${word.lines[5].clip} reads`);
    const less = makeCut();
    less.lines.pop();
    expect(text(g16.words(less, cfg))).toContain(`holds ${less.lines.length} lines and the spoken script holds ${less.lines.length + 1}`);
    const swap = makeCut();
    [swap.lines[0], swap.lines[1]] = [{ ...swap.lines[1], first: swap.lines[0].first }, { ...swap.lines[0], first: swap.lines[1].first }];
    expect(text(g16.words(swap, cfg))).toContain('Line 1 of the cut list is line 2 of clip');
  });

  it('fails two lines that overlap, and passes two that touch', () => {
    const cut = makeCut();
    cut.lines[1].first = cut.lines[0].first + cut.lines[0].frames;
    expect(g16.words(cut, cfg).faults).toEqual([]);
    cut.lines[1].first -= 1;
    const r = g16.words(cut, cfg);
    expect(r.faults).toHaveLength(1);
    expect(r.faults[0]).toContain('so they overlap by 1 frames');
  });

  it('fails a line outside its unit unless it is carried', () => {
    const cut = makeCut();
    const i = cut.lines.findIndex((l) => l.unit === six[1]);
    const line = cut.lines[i - 1];
    line.first = cut.places[0].last - 10;
    line.frames = 40;
    const r = g16.words(cut, cfg);
    expect(r.faults).toHaveLength(1);
    expect(r.faults[0]).toContain(`outside the span of its unit ${six[0]}`);
    line.carried = true;
    expect(g16.words(cut, cfg).faults).toEqual([]);
  });

  it('fails when the third line of the last clip starts before the titan frame', () => {
    const cut = makeCut();
    const clip = cfg.narration.clips[cfg.narration.clips.length - 1].id;
    const third = cut.lines.find((l) => l.clip === clip && l.line === 3);
    cut.titanFrame = third.first;
    expect(g16.words(cut, cfg).faults).toEqual([]);
    cut.titanFrame = third.first + 1;
    expect(text(g16.words(cut, cfg))).toContain(`Line 3 of clip ${clip} starts on frame ${third.first}, which is 1 frames before the titan frame`);
  });

  it('reports the shortest gap inside a clip beside the least pause, as information', () => {
    const cut = makeCut();
    cut.lines[2].first = cut.lines[1].first + cut.lines[1].frames + 6;
    const r = g16.words(cut, cfg);
    expect(r.faults).toEqual([]);
    expect(r.info.join(' ')).toContain(`The shortest gap between two lines of one clip is ${6 / fps} s, between lines 2 and 3 of clip ${cut.lines[1].clip}. narration.linePauseMinSeconds is ${cfg.narration.linePauseMinSeconds} s.`);
  });
});

describe('D1, the animatic', () => {
  const cut = makeCut();
  const good = () => ({ width: cfg.formats.preview.width, height: cfg.formats.preview.height, fps: cfg.film.previewFps, frames: (cut.frameCount * cfg.film.previewFps) / fps, sound: true });
  const run = (probe, extra = {}) => d1.animaticFaults({ file: 'out/work/film/a.mp4', probe, cut, soundExists: true, ...extra }, cfg);

  it('passes a file of the right size, rate, frame count and with sound', () => {
    expect(run(good()).faults).toEqual([]);
    expect(run({ ...good(), sound: false }, { soundExists: false }).faults).toEqual([]);
  });

  it('fails the size, the rate, the frame count and a missing sound stream, one at a time', () => {
    expect(text(run({ ...good(), width: 1280 }))).toContain('is 1280 x');
    expect(text(run({ ...good(), fps: fps }))).toContain(`runs at ${fps} frames a second and film.previewFps is ${cfg.film.previewFps}`);
    expect(text(run({ ...good(), frames: good().frames - 1 }))).toContain(`has ${good().frames - 1} frames`);
    expect(text(run({ ...good(), sound: false }))).toContain('has no sound stream');
    for (const p of [{ width: 1 }, { fps: 1 }, { frames: 1 }, { sound: false }]) expect(run({ ...good(), ...p }).faults).toHaveLength(1);
  });

  it('rounds an odd frame count up at the slower rate', () => {
    const odd = { ...cut, frameCount: cut.frameCount + 1 };
    expect(d1.animaticFrames(odd, cfg)).toBe(good().frames + 1);
    expect(d1.animaticFaults({ file: 'a.mp4', probe: { ...good(), frames: good().frames + 1 }, cut: odd, soundExists: true }, cfg).faults).toEqual([]);
  });

  it('leaves the frame count unread with no cut list', () => {
    const r = run({ ...good(), frames: 3 }, { cut: null });
    expect(r.faults).toEqual([]);
    expect(r.skipped[0]).toContain('no cut/CUTLIST.json yet');
  });

  it('reads what ffprobe prints', () => {
    const json = JSON.stringify({ streams: [{ codec_type: 'video', width: 960, height: 540, r_frame_rate: '30/1', nb_read_packets: '60' }, { codec_type: 'audio', r_frame_rate: '0/0' }] });
    expect(d1.parseProbe(json)).toEqual({ width: 960, height: 540, fps: 30, frames: 60, sound: true });
    expect(d1.parseProbe('{"streams":[]}').width).toBe(null);
  });

  it('fails when there is no animatic, looks in deliver/film first, and expects sound when the music is there', async () => {
    const root = temp();
    const none = await d1.runD1(ctx(root));
    expect(none.ok).toBe(false);
    expect(none.lines[0]).toBe(`There is no ${cfg.export.files.animatic} in deliver/film or in out/work/film.`);
    put(root, `out/work/film/${cfg.export.files.animatic}`, 'x');
    expect(d1.findAnimatic(root, cfg)).toBe(`out/work/film/${cfg.export.files.animatic}`);
    put(root, `deliver/film/${cfg.export.files.animatic}`, 'x');
    expect(d1.findAnimatic(root, cfg)).toBe(`deliver/film/${cfg.export.files.animatic}`);
    expect(d1.soundExists(root, cfg)).toBe(false);
    const quiet = await d1.runD1(ctx(root), () => ({ ...good(), sound: false }));
    expect(quiet.ok).toBe(true);
    put(root, `audio/supplied/${cfg.music.file}`, 'x');
    const r = await d1.runD1(ctx(root), () => ({ ...good(), sound: false }));
    expect(r.ok).toBe(false);
    expect(r.lines[0]).toContain('has no sound stream');
  });
});

describe('A1, the transcripts', () => {
  const clip = cfg.narration.clips[0];
  const record = (said) => `## ${clip.id}\nMade by: a tool\nTranscript: ${said}\n`;

  it('compares letters, digits and spaces only', () => {
    expect(a1.plain('  Listen.  I HAVE walked it, end to end!  ')).toBe('listen i have walked it end to end');
    const said = clip.lines.join('  ').toUpperCase().replace(/\./g, ',');
    expect(a1.transcriptFaults([{ id: clip.id, record: record(said) }], cfg).faults).toEqual([]);
  });

  it('fails a changed word, a missing word, a missing transcript, a missing record and an unknown clip', () => {
    const words = clip.lines.join(' ').split(' ');
    const changed = [...words];
    changed[2] = 'was';
    const r = a1.transcriptFaults([{ id: clip.id, record: record(changed.join(' ')) }], cfg);
    expect(r.faults).toHaveLength(1);
    expect(r.faults[0]).toContain('They part at word 3: the transcript has "was"');
    expect(text(a1.transcriptFaults([{ id: clip.id, record: record(words.slice(0, -1).join(' ')) }], cfg))).toContain('the transcript has "nothing"');
    expect(text(a1.transcriptFaults([{ id: clip.id, record: '## x\nMade by: a tool\n' }], cfg))).toContain('has no "Transcript:" line');
    expect(text(a1.transcriptFaults([{ id: clip.id, record: null }], cfg))).toContain('has no record');
    expect(text(a1.transcriptFaults([{ id: 'zz', record: record('a') }], cfg))).toContain('is no clip of narration.clips');
  });

  it('is skipped with no kept clip and reads the kept folder and the records', async () => {
    const root = temp();
    expect((await a1.runA1(ctx(root))).skipped[0]).toContain('no kept narration clip');
    put(root, `audio/kept/narration/${clip.id}.mp3`, 'x');
    put(root, `audio/records/${clip.id}.md`, record(clip.lines.join(' ')));
    expect((await a1.runA1(ctx(root))).ok).toBe(true);
    put(root, `audio/records/${clip.id}.md`, record('Listen to me.'));
    expect((await a1.runA1(ctx(root))).ok).toBe(false);
  });
});

describe('A2, the records and the rows', () => {
  const full = (id, narration) =>
    [`## ${id}`, 'Made by: a tool', narration ? 'Voice: a voice' : null, 'Text or description: wind', 'Settings: seed 1', 'Takes: 2, the second kept', 'Measured: 3 s', narration ? 'Transcript: wind' : null, 'The listener: fine', 'Date: 2026-11-24']
      .filter(Boolean)
      .join('\n');
  const clipFile = 'audio/kept/narration/n1.mp3';
  const soundFile = 'audio/kept/sounds/ribs/ribs-bed.wav';
  const assets = `| File | What |\n| --- | --- |\n| \`${clipFile}\` | a clip |\n| \`${soundFile}\` | a bed |\n`;
  const kept = () => [
    { file: clipFile, id: 'n1', narration: true, record: full('n1', true) },
    { file: soundFile, id: 'ribs-bed', narration: false, record: full('ribs-bed', false) }
  ];

  it('passes full records with rows, and asks a voice and a transcript of narration only', () => {
    expect(a2.recordFaults(kept(), assets).faults).toEqual([]);
    expect(a2.recordLacks(full('n1', false), 'n1', true)).toEqual(['Voice:', 'Transcript:']);
  });

  it('fails a missing record, a missing or empty field and a missing row', () => {
    const none = kept();
    none[1].record = null;
    expect(a2.recordFaults(none, assets).faults).toEqual([`${soundFile} has no record audio/records/ribs-bed.md.`]);
    const field = kept();
    field[0].record = field[0].record.replace('The listener: fine', 'The listener:').replace('## n1', '## n2');
    expect(a2.recordFaults(field, assets).faults).toEqual(['audio/records/n1.md lacks "## n1", "The listener:".']);
    const r = a2.recordFaults(kept(), assets.split('\n').filter((l) => !l.includes(soundFile)).join('\n') + `\nThe file ${soundFile} is named in a sentence.`);
    expect(r.faults).toEqual([`${soundFile} has no row in ASSETS.md that names its path.`]);
    expect(a2.recordFaults(kept(), null).faults).toHaveLength(2);
  });

  it('is skipped with nothing kept and reads the kept folders', async () => {
    const root = temp();
    expect((await a2.runA2(ctx(root))).skipped).toHaveLength(1);
    put(root, clipFile, 'x');
    put(root, soundFile, 'x');
    put(root, 'audio/kept/lines/n1-1.wav', 'x');
    put(root, 'audio/records/n1.md', full('n1', true));
    put(root, 'ASSETS.md', assets);
    const r = await a2.runA2(ctx(root));
    expect(r.ok).toBe(false);
    expect(r.lines[0]).toBe(`${soundFile} has no record audio/records/ribs-bed.md.`);
    expect(r.lines).toHaveLength(2);
  });
});

describe('A3, the levels of the mix', () => {
  const a = cfg.audio;
  const good = { lufs: a.loudnessLufs + 0.4, truePeakDb: a.truePeakDb - 0.5, sampleRate: a.sampleRate };
  const summary = ['[Parsed_ebur128_0 @ 0x1] t: 1 M: -20.0 S: -20.0 I: -99.0 LUFS', '[Parsed_ebur128_0 @ 0x1] Summary:', '', '  Integrated loudness:', '    I:         -14.2 LUFS', '    Threshold: -24.2 LUFS', '', '  True peak:', '    Peak:       -1.3 dBFS'].join('\n');

  it('reads the summary ffmpeg prints', () => {
    expect(a3.parseLoudness(summary)).toEqual({ lufs: -14.2, truePeakDb: -1.3 });
    expect(a3.parseLoudness('nothing')).toEqual({ lufs: null, truePeakDb: null });
  });

  it('passes inside the limits and at their edges', () => {
    expect(a3.mixLevelFaults(good, cfg).faults).toEqual([]);
    expect(a3.mixLevelFaults({ lufs: a.loudnessLufs - 1, truePeakDb: a.truePeakDb, sampleRate: a.sampleRate }, cfg).faults).toEqual([]);
  });

  it('fails the loudness, the peak and the sample rate, one at a time', () => {
    expect(a3.mixLevelFaults({ ...good, lufs: a.loudnessLufs + 1.1 }, cfg).faults).toEqual([`The mix measures ${a.loudnessLufs + 1.1} LUFS and has to be within 1 of ${a.loudnessLufs}.`]);
    expect(a3.mixLevelFaults({ ...good, truePeakDb: a.truePeakDb + 0.1 }, cfg).faults).toEqual([`The true peak of the mix is ${a.truePeakDb + 0.1} dB and has to be at or under ${a.truePeakDb}.`]);
    expect(a3.mixLevelFaults({ ...good, sampleRate: 44100 }, cfg).faults).toEqual([`The mix is at 44100 samples a second and audio.sampleRate is ${a.sampleRate}.`]);
    expect(a3.mixLevelFaults({ lufs: null, truePeakDb: null, sampleRate: null }, cfg).faults).toHaveLength(3);
  });

  it('is skipped with no mix and measures the one that is there', async () => {
    const root = temp();
    expect((await a3.runA3(ctx(root))).skipped).toEqual(['no audio/mix/mix.flac yet']);
    put(root, 'audio/mix/mix.flac', 'x');
    expect((await a3.runA3(ctx(root), () => good)).ok).toBe(true);
    expect((await a3.runA3(ctx(root), () => ({ ...good, sampleRate: 1 }))).ok).toBe(false);
  });
});

describe('A4, a mix made twice', () => {
  it('compares the bytes', () => {
    expect(a4.compareBytes(Buffer.from('abcd'), Buffer.from('abcd')).faults).toEqual([]);
    expect(a4.compareBytes(Buffer.from('abcd'), Buffer.from('abXd')).faults[0]).toContain('the first byte that differs is byte 2');
    expect(a4.compareBytes(Buffer.from('abcd'), Buffer.from('abc')).faults[0]).toContain('4 bytes and 3 bytes');
  });

  it('is skipped with no mix tool or no cut list', async () => {
    const root = temp();
    expect((await a4.runA4(ctx(root))).skipped).toEqual(['no tools/mix.mjs yet']);
    put(root, 'tools/mix.mjs', '');
    expect((await a4.runA4(ctx(root))).skipped).toEqual(['no cut/CUTLIST.json yet']);
  });

  it('runs the mix tool twice under out/work/checks and compares the two files', async () => {
    const root = temp();
    put(root, 'tools/mix.mjs', '');
    put(root, 'cut/CUTLIST.json', '{}');
    const calls = [];
    const exec = (bodies) => async (command, argv, o) => {
      calls.push([command, ...argv].join(' '));
      put(o.cwd, argv[argv.indexOf('--out') + 1], bodies[calls.length % 2]);
      return { code: 0, tail: [], timedOut: false };
    };
    const same = await a4.runA4(ctx(root, { exec: exec(['one', 'one']) }));
    expect(same.ok).toBe(true);
    expect(calls).toEqual([
      'node tools/mix.mjs --out out/work/checks/mix-a.flac --report out/work/checks/mix-a.json',
      'node tools/mix.mjs --out out/work/checks/mix-b.flac --report out/work/checks/mix-b.json'
    ]);
    const differ = await a4.runA4(ctx(root, { exec: exec(['one', 'two']) }));
    expect(differ.ok).toBe(false);
    expect(differ.lines[0]).toContain('The mix made twice differs');
    const broke = await a4.runA4(ctx(root, { exec: async () => ({ code: 1, tail: ['mix: no music'], timedOut: false }) }));
    expect(broke.ok).toBe(false);
    expect(broke.lines).toEqual(['node tools/mix.mjs --out out/work/checks/mix-a.flac --report out/work/checks/mix-a.json exited with code 1.', '| mix: no music']);
    const silent = await a4.runA4(ctx(root, { exec: async () => ({ code: 0, tail: [], timedOut: false }) }));
    expect(silent.lines[0]).toContain('wrote no out/work/checks/mix-a.flac');
  });
});

describe('A5, the takes and the cues', () => {
  const clipMax = cfg.narration.maxTakesPerClip;
  const cueMax = cfg.audio.maxTakesPerCue;
  const placeMax = cfg.audio.maxCuesPerPlace;
  const clip = cfg.narration.clips[0].id;

  it('reads the whole number the line begins with and leaves the remade ones out', () => {
    expect(a5.takesMade('3, the second kept')).toBe(3);
    expect(a5.takesMade(`${clipMax} made, take 2 kept, remade: 40`)).toBe(clipMax);
    expect(a5.takesMade('three')).toBe(null);
    expect(a5.isNarration(clip, cfg)).toBe(true);
    expect(a5.isNarration(`${clip}-2`, cfg)).toBe(true);
    expect(a5.isNarration('ribs-bed', cfg)).toBe(false);
  });

  it('passes at the limits, with takes that only made a lost file again', () => {
    const records = [
      { id: clip, takes: `${clipMax}, the last kept, remade: ${clipMax + 5}` },
      { id: `${clip}-1`, takes: `${clipMax}, the first kept` },
      { id: 'ribs-bed', takes: `${cueMax}, the first kept, remade: 9` }
    ];
    const cut = makeCut();
    cut.sounds = Array.from({ length: placeMax }, (_, i) => ({ id: `s${i}`, unit: six[0] }));
    expect(a5.takeFaults(records, cut, cfg).faults).toEqual([]);
  });

  it('fails a clip, a line, a sound and a place over its limit, and a line with no number', () => {
    const one = (r) => a5.takeFaults([r], null, cfg).faults;
    expect(one({ id: clip, takes: `${clipMax + 1}, the last kept` })).toEqual([`The narration ${clip} used ${clipMax + 1} takes and narration.maxTakesPerClip is ${clipMax}.`]);
    expect(one({ id: `${clip}-3`, takes: `${clipMax + 1}` })).toHaveLength(1);
    expect(one({ id: 'ribs-bed', takes: `${cueMax + 1}, the first kept` })).toEqual([`The sound ribs-bed used ${cueMax + 1} takes and audio.maxTakesPerCue is ${cueMax}.`]);
    expect(one({ id: 'ribs-bed', takes: 'a few' })[0]).toContain('does not begin with a whole number');
    const cut = makeCut();
    cut.sounds = Array.from({ length: placeMax + 1 }, (_, i) => ({ id: `s${i}`, unit: six[2] }));
    expect(a5.takeFaults([], cut, cfg).faults).toEqual([`The place ${six[2]} has ${placeMax + 1} cues in sounds of cut/CUTLIST.json and audio.maxCuesPerPlace is ${placeMax}.`]);
  });

  it('is skipped with no record and no cut list, and reads only records with a takes line', async () => {
    const root = temp();
    put(root, 'audio/records/API-REFERENCE.md', '# Notes\n');
    expect((await a5.runA5(ctx(root))).skipped).toHaveLength(1);
    put(root, 'audio/records/ribs-bed.md', `## ribs-bed\nTakes: ${cueMax + 2}, the first kept\n`);
    const r = await a5.runA5(ctx(root));
    expect(r.ok).toBe(false);
    expect(r.lines[0]).toContain(`The sound ribs-bed used ${cueMax + 2} takes`);
  });
});

describe('A6, the ducking and the voice', () => {
  const max = cfg.audio.duckMaxDb;
  const line = (extra = {}) => ({ clip: 'n1', line: 1, first: 150, frames: 48, duckDb: max, voiceBandDb: -24, restBandDb: -31, marginDb: 7, voiceDb: -22, restDb: -27.5, ...extra });

  it('passes at the limit of the ducking with the voice above the rest', () => {
    expect(a6.duckFaults({ lines: [line(), line({ line: 2, duckDb: 0 })] }, cfg).faults).toEqual([]);
  });

  it('fails too deep a duck, a voice under the rest in the band of speech, and one under it across the whole band', () => {
    const one = (extra) => a6.duckFaults({ lines: [line(extra)] }, cfg).faults;
    expect(one({ duckDb: max + 0.5 })).toEqual([`Under line 1 of clip n1 the music is ducked by ${max + 0.5} dB and audio.duckMaxDb is ${max}.`]);
    expect(one({ marginDb: 0 })).toHaveLength(1);
    expect(one({ marginDb: -2, restBandDb: -22 })[0]).toContain('the voice is 2 dB under everything else in the band of speech');
    expect(one({ restDb: -22 })).toHaveLength(1);
    expect(one({ restDb: -20 })[0]).toContain('the voice is 2 dB under everything else across the whole band');
    expect(one({ duckDb: undefined })[0]).toContain('holds no number in duckDb');
  });

  it('is skipped with no report', async () => {
    const root = temp();
    expect((await a6.runA6(ctx(root))).skipped).toEqual(['no audio/mix/mix.json yet']);
    put(root, 'audio/mix/mix.json', JSON.stringify({ lines: [line({ duckDb: max + 1 })] }));
    expect((await a6.runA6(ctx(root))).ok).toBe(false);
  });
});

describe('the checks in the gate', () => {
  const mine = ['G7', 'G11', 'G15', 'G16', 'D1', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'];

  it('have code, keep the phase of their table, and the sound checks stay advisory', () => {
    for (const id of mine) expect(typeof gate.REGISTRY.find((c) => c.id === id).run).toBe('function');
    for (const id of ['G7', 'G11', 'G15', 'G16']) expect(gate.REGISTRY.find((c) => c.id === id).phase).toBe(2);
    expect(gate.REGISTRY.filter((c) => c.advisory).map((c) => c.id)).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6']);
  });

  it('run in Phase 1 and after it, and not in Phase 0', () => {
    const at = (n) => gate.selectChecks(gate.REGISTRY, n).map((c) => c.id);
    expect(at(0).filter((id) => mine.includes(id))).toEqual([]);
    expect(at(1)).toEqual(expect.arrayContaining(mine));
    for (const n of [2, 3, 4, 5, 6]) expect(at(n)).toEqual(expect.arrayContaining(['G7', 'G11', 'G15', 'G16']));
    expect(gate.selectChecks(gate.REGISTRY, 1, ['G11', 'G16', 'D1', 'A1']).map((c) => c.id)).toEqual(['G11', 'G16', 'D1', 'A1']);
  });

  it('report an empty repo as skipped, with the animatic missing and no sound check failing the gate', async () => {
    const r = await gate.runGate({ phase: 1, only: mine, root: temp(), dir: temp() });
    const by = Object.fromEntries(r.results.map((x) => [x.id, x]));
    for (const id of mine.filter((x) => x !== 'D1')) {
      expect(by[id].status).toBe('pass');
      expect(by[id].skipped.length).toBeGreaterThan(0);
    }
    expect(by.G15.skipped).toContain('the windows of the rise: read from the film in Phase 2');
    expect(r.failed).toEqual(['D1']);
    for (const x of r.results) for (const l of [...x.lines, ...x.skipped]) expect(l).not.toMatch(/[\u2014!]/);
  });

  it('read a cut list and a map from the files and fail on a cut off the music', async () => {
    const root = temp();
    const cut = makeCut();
    put(root, 'cut/CUTLIST.json', JSON.stringify(cut));
    put(root, 'cut/MAP.json', JSON.stringify(makeMap()));
    const ok = await gate.runGate({ phase: 1, only: ['G7', 'G11', 'G15', 'G16'], root, dir: temp() });
    expect(ok.results.map((x) => x.status)).toEqual(['pass', 'pass', 'pass', 'pass']);
    cut.shots[2].last += 20;
    cut.shots[3].first += 20;
    put(root, 'cut/CUTLIST.json', JSON.stringify(cut));
    const bad = await gate.runGate({ phase: 1, only: ['G11'], root, dir: temp() });
    expect(bad.ok).toBe(false);
    expect(bad.results[0].lines[0]).toContain('20 frames away');
  });
});
