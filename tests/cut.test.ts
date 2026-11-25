// @ts-nocheck
import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tool = (name) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const core = await tool('lib/cut-core');
const cmd = await tool('cut');
const loud = await tool('lib/loudness');
const g7 = await tool('checks/g7');
const g11 = await tool('checks/g11');
const g16 = await tool('checks/g16');
const { config, rel, readJson } = await tool('lib/paths');
const { trialPlan } = await import(new URL('./fixtures/cut-plan.mjs', import.meta.url).href);

const cfg = config();
const map = readJson(rel('cut', 'MAP.json'));
const fps = cfg.film.fps;
const bars = map.bars;
const beats = map.beats;
const OUT_BAR = 49;
const IN_BAR = 58;
const gone = bars[IN_BAR] - bars[OUT_BAR];
const frame = (seconds) => Math.round(seconds * fps);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'carcass-cut-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const build = (change = () => {}, kept = {}) => {
  const plan = trialPlan();
  change(plan);
  return core.compile({ plan, map, cfg, kept });
};
const titanAt = (pos) => build((p) => (p.titan = pos));
const lineOf = (cut, id) => cut.lines.find((l) => `${l.clip}-${l.line}` === id);
const setLine = (p, id, fields) => Object.assign(p.lines.find((l) => `${l.clip}-${l.line}` === id), fields);
const faultsOf = (change) => {
  const { cut, errors } = build(change);
  expect(errors).toEqual([]);
  return core.check(cut, map, cfg).faults;
};

describe('the fixture plan', () => {
  const { cut, errors } = build();

  it('compiles against the real map and config with no error', () => {
    expect(errors).toEqual([]);
    expect(cut.schema).toBe('carcass/cutlist 1');
    expect(cut.fps).toBe(fps);
    expect(cut.frameCount).toBe(Math.floor((map.source.seconds - gone) * fps));
    expect(cut.lines.length).toBe(g16.scriptLines(cfg).length);
    expect(Object.keys(cut.keyFrames)).toEqual(cfg.keys.map((k) => k.id));
    expect(cut.sounds).toEqual([]);
    expect(cut.mix).toEqual({ voiceGainDb: 0 });
  });

  it('has no fault from G7, G11 and G16, and none of its own', () => {
    expect(g7.lengths(cut, cfg).faults).toEqual([]);
    expect(g11.cutFollowsMusic(cut, map, cfg).faults).toEqual([]);
    expect(g16.words(cut, cfg).faults).toEqual([]);
    expect(core.ownRules(cut, map, cfg)).toEqual([]);
    expect(core.check(cut, map, cfg).faults).toEqual([]);
  });

  it('writes the music as two pieces joined at the two bar lines', () => {
    expect(cut.music.file).toBe(cfg.music.cleaned ? cfg.music.cleaned.file : `audio/supplied/${cfg.music.file}`);
    expect(cut.music.pieces).toEqual([
      { from: 0, to: bars[OUT_BAR], at: 0 },
      { from: bars[IN_BAR], to: map.source.seconds, at: bars[OUT_BAR] }
    ]);
    expect(cut.music.cut).toEqual({ outBar: OUT_BAR, inBar: IN_BAR, out: bars[OUT_BAR], in: bars[IN_BAR], frame: frame(bars[OUT_BAR]) });
  });

  it('is one piece and no cut when musicCut is null', () => {
    const r = build((p) => {
      p.musicCut = null;
      p.shots = p.shots.filter((s) => !['reveal-04', 'reveal-05', 'reveal-06'].includes(s.id));
      p.events = p.events.filter((e) => e.id !== 'last');
      p.keyFrames['reveal-3'] = { music: 200 };
      p.keyFrames['reveal-4'] = { bar: 52 };
    });
    expect(r.errors).toEqual([]);
    expect(r.cut.keyFrames['reveal-3']).toBe(12000);
    expect(r.cut.music.cut).toBe(null);
    expect(r.cut.music.pieces).toEqual([{ from: 0, to: map.source.seconds, at: 0 }]);
    expect(r.cut.frameCount).toBe(Math.floor(map.source.seconds * fps));
  });

  it('gives the same bytes twice, as a cut list and as cues', () => {
    const again = build().cut;
    expect(JSON.stringify(again)).toBe(JSON.stringify(cut));
    expect(core.cuesText(again, map)).toBe(core.cuesText(cut, map));
    expect(core.cuesText(cut, map)).not.toMatch(/\u2014|!|\d{4}-\d{2}-\d{2}/);
  });

  it('makes the places from the shots, in film order, with no gap', () => {
    expect(cut.places.map((p) => p.unit)).toEqual(cfg.film.order);
    expect(cut.places[0]).toEqual({ unit: 'ribs', first: 0, last: frame(bars[12]) - 1 });
    expect(cut.places[1]).toEqual({ unit: 'heart', first: frame(bars[12]), last: frame(bars[19]) - 1 });
    expect(cut.places[6].last).toBe(cut.frameCount - 1);
    expect(cut.shots[cut.shots.length - 1].last).toBe(cut.frameCount - 1);
    cut.shots.slice(1).forEach((s, i) => expect(s.first).toBe(cut.shots[i].last + 1));
  });

  it('takes text and unit of a line from the config', () => {
    const r = build((p) => setLine(p, 'n1-1', { text: 'Other words.', unit: 'eye' }));
    expect(lineOf(r.cut, 'n1-1').text).toBe('Listen.');
    expect(lineOf(r.cut, 'n1-1').unit).toBe('ribs');
  });

  it('gives a key that is not listed the middle of the first shot that answers it', () => {
    const s = cut.shots.find((x) => x.key === 'heart-2');
    expect(cut.keyFrames['heart-2']).toBe(s.first + Math.round((s.last - s.first) / 2));
    const two = cut.shots.find((x) => x.id === 'ribs-02');
    expect(cut.keyFrames['ribs-0']).toBe(two.first + Math.round((two.last - two.first) / 2));
    expect(cut.keyFrames['reveal-1']).toBe(frame(map.landmarks.revealHit + 0.5));
  });

  it('names the accent of each event', () => {
    expect(cut.events).toEqual([
      { id: 'bore', unit: 'ribs', frame: 2402, accent: 40.0291, what: 'The bore comes through the cage' },
      { id: 'strike', unit: 'marsh', frame: 6158, accent: 102.6262, what: 'The middle strike' },
      { id: 'last', unit: 'reveal', frame: frame(224.7239 - gone), accent: 224.7239, what: 'The last strike' }
    ]);
  });

  it('copies sounds with at turned into first', () => {
    const r = build((p) => (p.sounds = [{ id: 'ribs-bed', unit: 'ribs', kind: 'bed', at: { bar: 2 }, frames: 600, file: 'audio/kept/sounds/ribs/ribs-bed.wav', gainDb: -20, loop: true, event: null }]));
    expect(r.cut.sounds).toEqual([{ id: 'ribs-bed', unit: 'ribs', kind: 'bed', first: frame(bars[2]), frames: 600, file: 'audio/kept/sounds/ribs/ribs-bed.wav', gainDb: -20, loop: true, event: null }]);
    expect(core.cuesText(r.cut, map)).toMatch(/\| ribs-bed \| ribs \| bed \|/);
  });
});

describe('positions', () => {
  it('resolves a frame, film seconds and music seconds before the cut', () => {
    expect(titanAt({ frame: 1200 }).cut.titanFrame).toBe(1200);
    expect(titanAt({ film: 20.5 }).cut.titanFrame).toBe(1230);
    expect(titanAt({ music: 153.3 }).cut.titanFrame).toBe(9198);
    expect(titanAt({ music: 153.3, plus: -0.3 }).cut.titanFrame).toBe(9180);
  });

  it('resolves music seconds after the cut, and the two bar lines to the same frame', () => {
    expect(bars[OUT_BAR]).toBe(177.8186);
    expect(bars[IN_BAR]).toBe(210.0577);
    expect(titanAt({ music: 220 }).cut.titanFrame).toBe(11266);
    expect(titanAt({ bar: OUT_BAR }).cut.titanFrame).toBe(10669);
    expect(titanAt({ bar: IN_BAR }).cut.titanFrame).toBe(10669);
    expect(titanAt({ bar: 60 }).cut.titanFrame).toBe(11099);
    expect(titanAt({ hit: 224.7 }).cut.titanFrame).toBe(frame(224.7239 - gone));
    expect(titanAt({ landmark: 'finalHit' }).cut.titanFrame).toBe(11549);
  });

  it('says a music second inside the cut is cut away', () => {
    for (const pos of [{ music: 200 }, { bar: 52 }, { hit: 190.3537 }, { bar: OUT_BAR, beat: 2 }]) {
      const r = titanAt(pos);
      expect(r.cut).toBe(null);
      expect(r.errors.length).toBe(1);
      expect(r.errors[0]).toMatch(/^titan: .*cut away/);
    }
    expect(core.musicToFilm(100, null)).toBe(100);
    expect(core.filmToMusic(180, { out: bars[OUT_BAR], in: bars[IN_BAR] })).toBeCloseTo(180 + gone, 9);
  });

  it('resolves a bar line and a beat of a bar', () => {
    expect(titanAt({ bar: 12 }).cut.titanFrame).toBe(2723);
    const at = beats.indexOf(bars[12]);
    expect(at).toBeGreaterThan(0);
    expect(titanAt({ bar: 12, beat: 1 }).cut.titanFrame).toBe(2723);
    expect(titanAt({ bar: 12, beat: 3 }).cut.titanFrame).toBe(frame(beats[at + 2]));
    expect(titanAt({ bar: 12, beat: 2.5 }).cut.titanFrame).toBe(frame((beats[at + 1] + beats[at + 2]) / 2));
    expect(core.barBeat(map, 12, 5)).toBe(beats[at + 4]);
  });

  it('resolves a hit to the time of the hit and a landmark to its own time', () => {
    expect(titanAt({ hit: 40.03 }).cut.titanFrame).toBe(2402);
    expect(titanAt({ hit: 40.0291, plus: 1 }).cut.titanFrame).toBe(2462);
    expect(titanAt({ landmark: 'revealHit' }).cut.titanFrame).toBe(10027);
    expect(titanAt({ landmark: 'revealHit', plus: 0.8 }).cut.titanFrame).toBe(10075);
  });

  it('resolves a shot, a part of a shot and an event', () => {
    expect(titanAt({ shot: 'heart-01' }).cut.titanFrame).toBe(2723);
    expect(titanAt({ shot: 'eye-01', part: 0.25 }).cut.titanFrame).toBe(8520 + Math.round(0.25 * (8949 - 8520)));
    expect(titanAt({ shot: 'eye-01', part: 1 }).cut.titanFrame).toBe(8949);
    expect(titanAt({ event: 'bore' }).cut.titanFrame).toBe(2402);
    expect(titanAt({ event: 'strike', plus: 1 }).cut.titanFrame).toBe(6218);
  });

  it('resolves after and before a line', () => {
    const { cut } = build();
    expect(lineOf(cut, 'n1-1')).toMatchObject({ first: 150, frames: 54, file: null, carried: false });
    expect(lineOf(cut, 'n1-2').first).toBe(150 + 54 + 72);
    expect(lineOf(cut, 'n1-4')).toMatchObject({ first: 1012 - 126, frames: 126 });
    expect(titanAt({ after: 'n1-1', gap: 1.2 }).cut.titanFrame).toBe(276);
    const r = build((p) => setLine(p, 'n1-3', { at: { before: 'n1-4', gap: 1 } }));
    expect(lineOf(r.cut, 'n1-3').first).toBe(886 - 60 - lineOf(r.cut, 'n1-3').frames);
  });

  it('stops on an unknown form and on things that do not exist', () => {
    const cases = [
      [{ bars: 3 }, /unknown position form/],
      [{ bar: 3, hit: 17.368 }, /unknown position form/],
      [{ frame: 10, gap: 1 }, /unknown position form/],
      [{ shot: 'eye-01', part: 1.5 }, /from 0 to 1/],
      [undefined, /has to be an object/],
      [{ before: 'n1-1' }, /for a line only/],
      [{ bar: 400 }, /no bar line 400/],
      [{ hit: 41 }, /no hit within/],
      [{ landmark: 'nowhere' }, /no landmark nowhere/],
      [{ after: 'n9-1' }, /no line n9-1/],
      [{ shot: 'heart-99' }, /no shot heart-99/],
      [{ event: 'flood' }, /no event flood/]
    ];
    for (const [pos, want] of cases) {
      const r = titanAt(pos);
      expect(r.cut).toBe(null);
      expect(r.errors.join('\n')).toMatch(want);
      expect(r.errors[0]).toMatch(/^titan: /);
    }
  });
});

describe('errors that stop the compile', () => {
  const errorsOf = (change) => {
    const r = build(change);
    expect(r.cut).toBe(null);
    return r.errors.join('\n');
  };

  it('names a unit that is split in two', () => {
    expect(errorsOf((p) => (p.shots.find((s) => s.id === 'heart-03').unit = 'ribs'))).toMatch(/shot (heart-03|heart-04): the unit (ribs|heart) is split/);
  });

  it('names shots out of order, a first shot off frame 0 and a bad field', () => {
    expect(errorsOf((p) => (p.shots.find((s) => s.id === 'heart-03').at = { bar: 13 }))).toMatch(/shot heart-03: .*out of order or overlap/);
    expect(errorsOf((p) => (p.shots.find((s) => s.id === 'heart-03').at = { bar: 14 }))).toMatch(/shot heart-03: .*out of order or overlap/);
    expect(errorsOf((p) => (p.shots[0].at = { frame: 3 }))).toMatch(/shot ribs-01: .*not on frame 0/);
    expect(errorsOf((p) => (p.shots[3].move = 'spin'))).toMatch(/shot ribs-04: its move/);
    expect(errorsOf((p) => (p.shots[3].key = 'ribs-9'))).toMatch(/shot ribs-04: its key/);
    expect(errorsOf((p) => (p.shots[3].picture = 'white'))).toMatch(/shot ribs-04: its picture/);
  });

  it('names a line that is missing, extra or out of script order', () => {
    expect(errorsOf((p) => p.lines.splice(5, 1))).toMatch(/line n2-2: .*missing/);
    expect(errorsOf((p) => p.lines.push({ clip: 'n9', line: 1, at: { film: 190 } }))).toMatch(/line n9-1: it is extra/);
    expect(
      errorsOf((p) => {
        const [a] = p.lines.splice(8, 1);
        p.lines.splice(9, 0, a);
      })
    ).toMatch(/line n3-2: it is out of script order/);
    expect(errorsOf((p) => setLine(p, 'n1-2', { at: { after: 'n1-3', gap: 1 } }))).toMatch(/line n1-2: .*earlier line only/);
  });

  it('names a key with no frame', () => {
    expect(errorsOf((p) => (p.shots.find((s) => s.key === 'marsh-3').key = null))).toMatch(/key marsh-3: it has no frame/);
  });

  it('stops when the end lies past the music, and on a bad music cut', () => {
    expect(errorsOf((p) => (p.end = { music: 240 }))).toMatch(/end: .*past the end of the music/);
    expect(errorsOf((p) => (p.musicCut = { outBar: 49, inBar: 99 }))).toMatch(/musicCut: /);
    expect(errorsOf((p) => (p.musicCut = { outBar: 58, inBar: 49 }))).toMatch(/musicCut: /);
    expect(errorsOf((p) => (p.schema = 'other'))).toMatch(/plan: schema/);
  });

  it('reports every error on one line that names its entry', () => {
    const r = build((p) => {
      p.titan = { landmark: 'nowhere' };
      p.events[0].at = { hit: 41 };
    });
    expect(r.errors.length).toBe(2);
    expect(r.errors[0]).toMatch(/^titan: /);
    expect(r.errors[1]).toMatch(/^event bore: /);
    for (const e of r.errors) expect(e).not.toMatch(/\n/);
  });
});

describe('the length of a line', () => {
  it('is estimated from its words', () => {
    expect(core.estimateSeconds('Listen.')).toBe(0.9);
    expect(core.estimateSeconds('I have walked it. End to end.')).toBeCloseTo(29 * 0.105 + 0.5, 9);
    expect(core.estimateSeconds('The great beasts wallow in it, and grow fat.')).toBeCloseTo(44 * 0.105 + 0.2, 9);
    expect(core.estimateSeconds('One. Two, three.', { secondsPerCharacter: 0.1, secondsPerStop: 1, secondsPerComma: 2, minSeconds: 0 })).toBeCloseTo(1.6 + 1 + 2, 9);
    expect(lineOf(build().cut, 'n1-3').frames).toBe(Math.ceil((29 * 0.07 + 0.3) * fps));
  });

  it('is the seconds of the plan when the plan gives them', () => {
    const { cut } = build();
    expect(lineOf(cut, 'n8-3')).toMatchObject({ frames: 68, file: null });
    expect(lineOf(build((p) => setLine(p, 'n1-1', { seconds: 2 })).cut, 'n1-1').frames).toBe(120);
  });

  it('is the length of the kept WAV when there is one, which beats both', () => {
    const rate = cfg.audio.sampleRate;
    loud.writeWav(path.join(dir, 'n1-1.wav'), [new Float32Array(Math.round(1.26 * rate))], rate);
    loud.writeWav(path.join(dir, 'n8-3.wav'), [new Float32Array(Math.round(1.5 * rate))], rate);
    fs.writeFileSync(path.join(dir, 'n1-2.wav'), 'no sound');
    expect(() => cmd.keptLines(dir, cfg)).toThrow(/n1-2\.wav is no WAV file/);
    fs.rmSync(path.join(dir, 'n1-2.wav'));
    const kept = cmd.keptLines(dir, cfg);
    expect(Object.keys(kept)).toEqual(['n1-1', 'n8-3']);
    expect(kept['n1-1'].seconds).toBeCloseTo(1.26, 6);
    expect(core.wavSeconds(loud.wavBytes([new Int16Array(24000), new Int16Array(24000)], 48000))).toBe(0.5);
    const { cut, errors } = build(() => {}, { 'n1-1': { seconds: 1.26, file: 'audio/kept/lines/n1-1.wav' }, 'n8-3': { seconds: 1.5, file: 'audio/kept/lines/n8-3.wav' } });
    expect(errors).toEqual([]);
    expect(lineOf(cut, 'n1-1')).toMatchObject({ first: 150, frames: 76, file: 'audio/kept/lines/n1-1.wav' });
    expect(lineOf(cut, 'n1-2').first).toBe(150 + 76 + 72);
    expect(lineOf(cut, 'n8-3')).toMatchObject({ frames: 90, file: 'audio/kept/lines/n8-3.wav' });
    expect(core.tables(cut, map).lines[0].kind).toBe('made');
    expect(core.tables(cut, map).lines[1].kind).toBe('est');
  });
});

describe('the rules', () => {
  it('faults two lines that overlap', () => {
    const faults = faultsOf((p) => setLine(p, 'n1-2', { at: { music: 2.6 } }));
    expect(faults.join('\n')).toMatch(/G16\. Line 1 of clip n1 .* overlap by/);
    const { cut } = build((p) => setLine(p, 'n1-2', { at: { music: 2.6 } }));
    expect(core.ownRules(cut, map, cfg).join('\n')).toMatch(/Line 2 of clip n1 .*so the two overlap/);
  });

  it('faults a pause under narration.linePauseMinSeconds', () => {
    const faults = faultsOf((p) => setLine(p, 'n1-3', { at: { after: 'n1-2', gap: 0.3 } }));
    expect(faults).toEqual([`The pause between line 2 of clip n1 and line 3 of clip n1 is 0.3 s and narration.linePauseMinSeconds is ${cfg.narration.linePauseMinSeconds} s.`]);
    expect(faultsOf((p) => setLine(p, 'n1-3', { at: { after: 'n1-2', gap: cfg.narration.linePauseMinSeconds } }))).toEqual([]);
  });

  it('faults a line outside its place unless it is carried', () => {
    const late = (p, carried = false) => {
      setLine(p, 'n2-4', { at: { music: 40.3 }, carried });
      setLine(p, 'n3-1', { at: { shot: 'heart-01', plus: 1.5 } });
    };
    expect(faultsOf(late).join('\n')).toMatch(/G16\. Line 4 of clip n2 .*outside the span of its unit ribs/);
    expect(core.ownRules(build(late).cut, map, cfg).join('\n')).toMatch(/Line 4 of clip n2 ends on frame \d+, \d+ frames after its place ribs/);
    expect(faultsOf((p) => late(p, true))).toEqual([]);
    const early = (p) => setLine(p, 'n3-1', { at: { bar: 12, plus: -0.5 } });
    expect(core.ownRules(build(early).cut, map, cfg).join('\n')).toMatch(/Line 1 of clip n3 starts on frame \d+, 30 frames before its place heart/);
  });

  it('faults a line over one of the strongest strikes, on both sides of the music cut', () => {
    expect(faultsOf((p) => setLine(p, 'n8-2', { at: { landmark: 'revealHit', plus: 0.4 } })).join('\n')).toMatch(/Line 2 of clip n8 .*lies over the strike revealHit/);
    expect(faultsOf((p) => setLine(p, 'n1-4', { at: { before: { hit: 17.368 }, gap: 0.1 } })).join('\n')).toMatch(/Line 4 of clip n1 .*lies over the strike firstHit/);
    expect(faultsOf((p) => setLine(p, 'n5-3', { at: { landmark: 'midHit', plus: 0.45 } })).join('\n')).toMatch(/Line 3 of clip n5 .*lies over the strike midHit/);
    expect(faultsOf((p) => setLine(p, 'n8-4', { at: { landmark: 'finalHit', plus: -1 } })).join('\n')).toMatch(/Line 4 of clip n8 .*lies over the strike finalHit/);
    expect(faultsOf((p) => setLine(p, 'n8-2', { at: { landmark: 'revealHit', plus: 0.51 } }))).toEqual([]);
    const spans = core.strikeSpans(build().cut, map);
    expect(spans.map((s) => s.name)).toEqual(core.STRIKES);
    expect(spans[3].film).toBeCloseTo(224.7239 - gone, 9);
    expect(spans[3].from).toBeCloseTo(spans[3].film - 0.15, 9);
    expect(spans[3].to).toBeCloseTo(spans[3].film + 0.5, 9);
  });

  it('faults a key frame outside the place of its unit', () => {
    expect(faultsOf((p) => (p.keyFrames['heart-0'] = { frame: 10 }))).toEqual(['The key frame of heart-0 is frame 10, outside its place heart, frames 2723 to 4220.']);
  });

  it('faults a last shot that is not black', () => {
    expect(faultsOf((p) => (p.shots[p.shots.length - 1].picture = 'reveal-4')).join('\n')).toMatch(/The last shot reveal-06 has the picture reveal-4/);
  });

  it('passes on what G7 and G11 report', () => {
    expect(faultsOf((p) => (p.shots.find((s) => s.id === 'heart-02').at = { bar: 14, plus: 0.2 })).join('\n')).toMatch(/G11\. The cut into shot heart-02/);
    const short = faultsOf((p) => {
      p.shots = p.shots.filter((s) => !['heart-04', 'heart-05'].includes(s.id));
      p.shots.find((s) => s.id === 'breath-01').at = { bar: 16 };
      p.keyFrames['heart-3'] = { shot: 'heart-01' };
      p.keyFrames['heart-4'] = { shot: 'heart-03', part: 1 };
    });
    expect(short[0]).toMatch(/^G7\. The place heart has 14\.\d+ s/);
    expect(short.filter((f) => f.startsWith('G7. ')).length).toBe(1);
  });
});

describe('the tables and the command', () => {
  const { cut } = build();
  const t = core.tables(cut, map);

  it('gives each place, each line and each cut a row', () => {
    expect(t.places.length).toBe(cfg.film.order.length);
    expect(t.places[0]).toEqual({ unit: 'ribs', first: 0, seconds: 45.38, spoken: 21.73 });
    expect(t.lines.length).toBe(cut.lines.length);
    expect(t.lines[0]).toEqual({ id: 'n1-1', first: 2.5, seconds: 0.9, kind: 'est', gap: null, left: 41.98 });
    expect(t.lines[1].gap).toBe(1.2);
    expect(t.cuts.length).toBe(cut.shots.length - 1);
    expect(t.cuts[0]).toMatchObject({ shot: 'ribs-02', frame: 1042, kind: 'hit', accent: 17.368 });
    expect(t.cuts.find((c) => c.shot === 'ribs-03').kind).toBe('bar');
    expect(t.cuts.find((c) => c.shot === 'ribs-05').kind).toBe('beat');
    for (const c of t.cuts) expect(c.frames).toBeLessThanOrEqual(0.5);
    expect(core.timeCode(10027, fps)).toBe('2:47.07');
    expect(core.timeCode(59, fps)).toBe('0:00.59');
  });

  it('prints lines that start with its name and hold no fault for the fixture', () => {
    const lines = core.printed(cut, t);
    for (const l of lines) expect(l).toMatch(/^cut: /);
    expect(lines.length).toBe(2 + 3 + t.places.length + t.lines.length + t.cuts.length);
  });

  it('writes both files, the same bytes twice, and nothing with --check or on an error', () => {
    const planFile = path.join(dir, 'plan.json');
    const out = path.join(dir, 'CUTLIST.json');
    const cues = path.join(dir, 'CUES.md');
    const empty = path.join(dir, 'none');
    fs.writeFileSync(planFile, JSON.stringify(trialPlan()));
    const said = [];
    const a = { plan: planFile, out, cues, lines: empty };
    const checked = cmd.cutCommand({ ...a, check: true }, { print: (l) => said.push(l) });
    expect(checked.ok).toBe(true);
    expect(checked.wrote).toEqual([]);
    expect(fs.existsSync(out)).toBe(false);
    expect(said[said.length - 1]).toMatch(/^cut: checked .* and wrote nothing, 0 faults$/);

    const first = cmd.cutCommand(a, { print: () => {} });
    expect(first.ok).toBe(true);
    const bytes = [fs.readFileSync(out), fs.readFileSync(cues)];
    expect(JSON.parse(bytes[0].toString())).toEqual(cut);
    cmd.cutCommand(a, { print: () => {} });
    expect(fs.readFileSync(out).equals(bytes[0])).toBe(true);
    expect(fs.readFileSync(cues).equals(bytes[1])).toBe(true);

    const json = [];
    const asJson = cmd.cutCommand({ ...a, json: true, check: true }, { print: (l) => json.push(l) });
    expect(asJson.ok).toBe(true);
    const parsed = JSON.parse(json.join('\n'));
    expect(Object.keys(parsed)).toEqual(['ok', 'errors', 'faults', 'info', 'tables', 'wrote']);
    expect(parsed.faults).toEqual([]);
    expect(parsed.info.length).toBeGreaterThan(5);

    fs.writeFileSync(planFile, '{ not json');
    expect(() => cmd.cutCommand(a, { print: () => {} })).toThrow(/plan\.json is not valid JSON/);
    expect(() => cmd.cutCommand({ ...a, plan: path.join(dir, 'nope.json') }, { print: () => {} })).toThrow(/does not exist/);

    const bad = trialPlan();
    bad.titan = { music: 200 };
    fs.writeFileSync(planFile, JSON.stringify(bad));
    fs.rmSync(out);
    const lines = [];
    const failed = cmd.cutCommand(a, { print: (l) => lines.push(l) });
    expect(failed.ok).toBe(false);
    expect(fs.existsSync(out)).toBe(false);
    expect(lines[0]).toMatch(/^cut: error\. titan: /);

    const faulty = trialPlan();
    faulty.shots[faulty.shots.length - 1].picture = 'reveal-4';
    fs.writeFileSync(planFile, JSON.stringify(faulty));
    const more = [];
    const withFault = cmd.cutCommand(a, { print: (l) => more.push(l) });
    expect(withFault.ok).toBe(false);
    expect(fs.existsSync(out)).toBe(true);
    expect(more.filter((l) => l.startsWith('cut: fault. ')).length).toBe(1);
    expect(more[more.length - 1]).toMatch(/1 fault$/);
  });
});
