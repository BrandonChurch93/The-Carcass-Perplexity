// @ts-nocheck
import { afterAll, describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
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
const script = await tool('lib/script');
const { config, rel, readJson } = await tool('lib/paths');
const { trialPlan } = await import(new URL('./fixtures/cut-plan.mjs', import.meta.url).href);

// The trial plan is made up to try the compiler, and it lays the recorded script whole, every line of
// narration.clips. So it is compiled against the config with an empty cut. The cut itself, and the plan of the
// film against the config as it stands, are tried at the foot of this file.
const filmCfg = config();
const cfg = { ...filmCfg, narration: { ...filmCfg.narration, cut: { dropped: [], shortened: [] } } };
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
    expect(lineOf(r.cut, 'n1-1').text).toBe(cfg.narration.clips[0].lines[0]);
    expect(lineOf(r.cut, 'n1-1').text).not.toBe('Other words.');
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
    // The words are the config's, so the lengths are worked out from them: the test is of the positions.
    const long = (id) => Math.ceil(core.estimateSeconds(lineOf(cut, id).text, trialPlan().estimate) * fps);
    expect(lineOf(cut, 'n1-1')).toMatchObject({ first: 150, frames: long('n1-1'), file: null, carried: false });
    expect(lineOf(cut, 'n1-2').first).toBe(150 + long('n1-1') + 72);
    expect(lineOf(cut, 'n1-4')).toMatchObject({ first: 1012 - long('n1-4'), frames: long('n1-4') });
    expect(titanAt({ after: 'n1-1', gap: 1.2 }).cut.titanFrame).toBe(150 + long('n1-1') + 72);
    const r = build((p) => setLine(p, 'n1-3', { at: { before: 'n1-4', gap: 1 } }));
    expect(lineOf(r.cut, 'n1-3').first).toBe(lineOf(r.cut, 'n1-4').first - 60 - lineOf(r.cut, 'n1-3').frames);
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
    // The plan's own estimate is used for a line of the config: 0.07 s a character, 0.3 s a stop inside the line, 0.15 s a comma.
    expect(core.estimateSeconds('Nothing on it should be alive.', trialPlan().estimate)).toBeCloseTo(30 * 0.07, 9);
    const third = cfg.narration.clips[0].lines[2];
    expect(lineOf(build().cut, 'n1-3').frames).toBe(Math.ceil(core.estimateSeconds(third, trialPlan().estimate) * fps));
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
    // The one exception is Brandon's: a line the plan places on a strike by name starts on it and is not faulted for lying over it.
    const on = (fields) => faultsOf((p) => {
      setLine(p, 'n8-1', { seconds: 0.9 });
      setLine(p, 'n8-2', { at: { bar: 45, plus: 2.2 }, seconds: 0.7 });
      setLine(p, 'n8-3', fields);
      setLine(p, 'n8-4', { at: { after: 'n8-3', gap: 1 } });
    }).join('\n');
    expect(on({ at: { landmark: 'revealHit' } })).toMatch(/^Line 3 of clip n8 .*lies over the strike revealHit[^\n]*$/);
    expect(on({ at: { landmark: 'revealHit' }, onStrike: 'revealHit' })).toBe('');
    expect(on({ at: { landmark: 'revealHit', plus: 0.3 }, onStrike: 'revealHit' })).toMatch(/Line 3 of clip n8 is placed on the strike revealHit and starts at/);
    expect(build((p) => setLine(p, 'n8-3', { onStrike: 'theHit' })).errors.join('\n')).toMatch(/onStrike names "theHit"/);
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
    // The words are the config's: what is spoken and what is left are worked out from the lines of the cut.
    const r2 = (x) => Math.round(x * 100) / 100;
    const ribs = cut.lines.filter((l) => l.unit === 'ribs');
    const one = cut.lines[0];
    expect(t.places[0]).toEqual({ unit: 'ribs', first: 0, seconds: 45.38, spoken: r2(ribs.reduce((a, l) => a + l.frames, 0) / fps) });
    expect(t.lines.length).toBe(cut.lines.length);
    expect(t.lines[0]).toEqual({ id: 'n1-1', first: 2.5, seconds: r2(one.frames / fps), kind: 'est', gap: null, left: r2((cut.places[0].last + 1 - one.first - one.frames) / fps) });
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
    const checked = cmd.cutCommand({ ...a, check: true }, { cfg, print: (l) => said.push(l) });
    expect(checked.ok).toBe(true);
    expect(checked.wrote).toEqual([]);
    expect(fs.existsSync(out)).toBe(false);
    expect(said[said.length - 1]).toMatch(/^cut: checked .* and wrote nothing, 0 faults$/);

    const first = cmd.cutCommand(a, { cfg, print: () => {} });
    expect(first.ok).toBe(true);
    const bytes = [fs.readFileSync(out), fs.readFileSync(cues)];
    expect(JSON.parse(bytes[0].toString())).toEqual(cut);
    cmd.cutCommand(a, { cfg, print: () => {} });
    expect(fs.readFileSync(out).equals(bytes[0])).toBe(true);
    expect(fs.readFileSync(cues).equals(bytes[1])).toBe(true);

    const json = [];
    const asJson = cmd.cutCommand({ ...a, json: true, check: true }, { cfg, print: (l) => json.push(l) });
    expect(asJson.ok).toBe(true);
    const parsed = JSON.parse(json.join('\n'));
    expect(Object.keys(parsed)).toEqual(['ok', 'errors', 'faults', 'info', 'tables', 'wrote']);
    expect(parsed.faults).toEqual([]);
    expect(parsed.info.length).toBeGreaterThan(5);

    fs.writeFileSync(planFile, '{ not json');
    expect(() => cmd.cutCommand(a, { cfg, print: () => {} })).toThrow(/plan\.json is not valid JSON/);
    expect(() => cmd.cutCommand({ ...a, plan: path.join(dir, 'nope.json') }, { cfg, print: () => {} })).toThrow(/does not exist/);

    const bad = trialPlan();
    bad.titan = { music: 200 };
    fs.writeFileSync(planFile, JSON.stringify(bad));
    fs.rmSync(out);
    const lines = [];
    const failed = cmd.cutCommand(a, { cfg, print: (l) => lines.push(l) });
    expect(failed.ok).toBe(false);
    expect(fs.existsSync(out)).toBe(false);
    expect(lines[0]).toMatch(/^cut: error\. titan: /);

    const faulty = trialPlan();
    faulty.shots[faulty.shots.length - 1].picture = 'reveal-4';
    fs.writeFileSync(planFile, JSON.stringify(faulty));
    const more = [];
    const withFault = cmd.cutCommand(a, { cfg, print: (l) => more.push(l) });
    expect(withFault.ok).toBe(false);
    expect(fs.existsSync(out)).toBe(true);
    expect(more.filter((l) => l.startsWith('cut: fault. ')).length).toBe(1);
    expect(more[more.length - 1]).toMatch(/1 fault$/);
  });
});

describe('the cut of the narration', () => {
  const DROPPED = ['n2-3', 'n2-4', 'n3-4', 'n4-3', 'n4-4', 'n5-4', 'n6-4', 'n7-3', 'n7-4', 'n8-2'];
  const SPOKEN = ['n1-1', 'n1-2', 'n1-3', 'n1-4', 'n2-1', 'n2-2', 'n3-1', 'n3-2', 'n3-3', 'n4-1', 'n4-2', 'n5-1', 'n5-2', 'n5-3', 'n6-1', 'n6-2', 'n6-3', 'n7-1', 'n7-2', 'n8-1', 'n8-3', 'n8-4'];
  const SHORT = { id: 'n8-4', text: 'Everything here feeds on it.', endSeconds: 2.15, fadeOutSeconds: 0.05, file: 'audio/kept/lines/n8-4-short.wav' };
  const WHOLE = 'audio/kept/lines/n8-4.wav';
  // sha256 of the kept line as it was recorded and kept, before the cut.
  const KEPT_N8_4 = 'd65cbca65f9e248441495294d5b690d6d97e7b2ad31e39e41d98a2cd412551e1';
  const withCut = (cut) => ({ ...filmCfg, narration: { ...filmCfg.narration, cut } });
  const filmPlan = () => readJson(rel('cut', 'PLAN.json'));

  it('is the approved one: ten lines dropped whole, n8-4 cut to its first sentence', () => {
    expect(filmCfg.narration.cut).toEqual({ dropped: DROPPED, shortened: [SHORT] });
    expect(script.cutFaults(filmCfg)).toEqual([]);
  });

  it('leaves the recorded script whole and every id as it was', () => {
    const recorded = script.recordedLines(filmCfg);
    expect(recorded.length).toBe(32);
    expect(recorded.map(script.idOfLine)).toEqual(filmCfg.narration.clips.flatMap((c) => c.lines.map((_, i) => `${c.id}-${i + 1}`)));
    expect(recorded.find((l) => script.idOfLine(l) === 'n8-4').text).toBe('Everything here feeds on it. And it is not finished.');
    expect(recorded.find((l) => script.idOfLine(l) === 'n7-3').text).toBe('The herds drink. None of them looks down.');
  });

  it('gives the spoken script: 22 lines, in order, word for word but for the short n8-4', () => {
    const spoken = g16.scriptLines(filmCfg);
    expect(spoken).toEqual(script.spokenLines(filmCfg));
    expect(spoken.map(script.idOfLine)).toEqual(SPOKEN);
    const recorded = new Map(script.recordedLines(filmCfg).map((l) => [script.idOfLine(l), l]));
    for (const l of spoken) expect(l).toEqual(script.idOfLine(l) === 'n8-4' ? { ...recorded.get('n8-4'), text: SHORT.text } : recorded.get(script.idOfLine(l)));
    expect(spoken.find((l) => script.idOfLine(l) === 'n8-3')).toMatchObject({ clip: 'n8', line: 3, text: 'It was a titan.' });
    const states = script.lineStates(filmCfg);
    expect(states.length).toBe(32);
    expect(states.filter((x) => x.spoken === null).map((x) => x.id)).toEqual(DROPPED);
    expect(states.filter((x) => x.shortened).map((x) => [x.id, x.spoken])).toEqual([['n8-4', SHORT.text]]);
  });

  it('is the recorded script whole when the cut is empty', () => {
    expect(g16.scriptLines(cfg)).toEqual(script.recordedLines(filmCfg));
  });

  it('names what is wrong with a cut, and no tool reads a cut that is wrong', () => {
    const faults = (cut) => script.cutFaults(withCut(cut)).join('\n');
    expect(faults({ dropped: ['n9-1'], shortened: [] })).toMatch(/dropped names "n9-1", which is no line/);
    expect(faults({ dropped: ['n2-3', 'n2-3'], shortened: [] })).toMatch(/names n2-3 twice/);
    expect(faults({ dropped: 'n2-3', shortened: [] })).toMatch(/needs a list "dropped" and a list "shortened"/);
    expect(faults({ dropped: ['n8-4'], shortened: [SHORT] })).toMatch(/shortens n8-4, which narration\.cut\.dropped drops/);
    expect(faults({ dropped: [], shortened: [SHORT, SHORT] })).toMatch(/shortens n8-4 a second time/);
    expect(faults({ dropped: [], shortened: [{ ...SHORT, id: 'n8-5' }] })).toMatch(/names "n8-5", which is no line/);
    expect(faults({ dropped: [], shortened: [{ ...SHORT, text: 'It is not finished.' }] })).toMatch(/text has to be the first words of the recorded line n8-4/);
    expect(faults({ dropped: [], shortened: [{ ...SHORT, text: 'Everything here feeds on it. And it is not finished.' }] })).toMatch(/and shorter than it/);
    expect(faults({ dropped: [], shortened: [{ ...SHORT, endSeconds: 0 }] })).toMatch(/endSeconds has to be a number over 0/);
    expect(faults({ dropped: [], shortened: [{ ...SHORT, fadeOutSeconds: 3 }] })).toMatch(/fadeOutSeconds has to be a number from 0 to endSeconds/);
    expect(faults({ dropped: [], shortened: [{ ...SHORT, file: '' }] })).toMatch(/file has to name the sound file/);
    expect(() => g16.scriptLines(withCut({ dropped: ['n9-1'], shortened: [] }))).toThrow(/config\/showcase\.json is not valid/);
  });

  it('compiles the plan of the film to the spoken script, each line where the plan puts it', () => {
    const plan = filmPlan();
    expect(plan.lines.map(script.idOfLine)).toEqual(SPOKEN);
    const { cut, errors } = core.compile({ plan, map, cfg: filmCfg, kept: cmd.keptLines(rel('audio', 'kept', 'lines'), filmCfg) });
    expect(errors).toEqual([]);
    expect(cut.lines.map(script.idOfLine)).toEqual(SPOKEN);
    expect(lineOf(cut, 'n8-3')).toMatchObject({ first: cut.titanFrame, text: 'It was a titan.', file: 'audio/kept/lines/n8-3.wav' });
    expect(lineOf(cut, 'n8-4')).toMatchObject({ text: SHORT.text, frames: 129, file: SHORT.file });
    const committed = readJson(rel('cut', 'CUTLIST.json'));
    expect(committed.lines).toEqual(cut.lines);
    expect(g16.words(committed, filmCfg).faults).toEqual([]);
  });

  it('stops a plan that lays a dropped line, and a plan that leaves a spoken line out', () => {
    const extra = filmPlan();
    extra.lines.push({ clip: 'n7', line: 3, at: { film: 147.9 } });
    const r = core.compile({ plan: extra, map, cfg: filmCfg, kept: {} });
    expect(r.cut).toBe(null);
    expect(r.errors.join('\n')).toMatch(/line n7-3: it is extra, narration\.cut drops that line/);
    const less = filmPlan();
    less.lines = less.lines.filter((l) => script.idOfLine(l) !== 'n8-3');
    expect(core.compile({ plan: less, map, cfg: filmCfg, kept: {} }).errors.join('\n')).toMatch(/line n8-3: it is in the spoken script and missing from the plan/);
    const whole = core.compile({ plan: trialPlan(), map, cfg: filmCfg, kept: {} });
    expect(whole.cut).toBe(null);
    expect(whole.errors.filter((e) => /narration\.cut drops that line/.test(e)).length).toBe(DROPPED.length);
  });

  it('makes the short line from the kept line, the same bytes as the file in the repo, and leaves the kept line alone', () => {
    const whole = fs.readFileSync(rel(...WHOLE.split('/')));
    const made = core.shortenWav(whole, SHORT);
    expect(made.bytes.equals(fs.readFileSync(rel(...SHORT.file.split('/'))))).toBe(true);
    expect(core.shortenWav(whole, SHORT).bytes.equals(made.bytes)).toBe(true);
    expect(made).toMatchObject({ rate: 48000, channels: 1, frames: 103200, seconds: 2.15, keptSeconds: 4, fadeFrames: 2400 });
    expect(core.wavSeconds(made.bytes)).toBe(2.15);
    // The header says 48 kHz, mono, 16 bit PCM, as the kept line's does.
    expect(made.bytes.subarray(20, 36).equals(whole.subarray(20, 36))).toBe(true);
    // Sample for sample the kept line up to the fade: no gain, no dither.
    const upTo = 44 + (103200 - 2400) * 2;
    expect(made.bytes.subarray(44, upTo).equals(whole.subarray(44, upTo))).toBe(true);
    // The fade only ever makes a sample smaller, and the last one is 0.
    for (let at = upTo; at < made.bytes.length; at += 2) expect(Math.abs(made.bytes.readInt16LE(at))).toBeLessThanOrEqual(Math.abs(whole.readInt16LE(at)));
    expect(made.bytes.readInt16LE(made.bytes.length - 2)).toBe(0);
    // The kept line is the one that was recorded: 4.00 s, with both sentences in it.
    expect(core.wavSeconds(whole)).toBe(4);
    expect(crypto.createHash('sha256').update(whole).digest('hex')).toBe(KEPT_N8_4);
  });

  it('cuts inside the silence between the two sentences, and refuses a cut in the voice', () => {
    const whole = fs.readFileSync(rel(...WHOLE.split('/')));
    const { silence } = core.shortenWav(whole, SHORT);
    expect(core.CUT_SILENCE_DBFS).toBe(-60);
    expect(silence.from).toBeLessThan(SHORT.endSeconds - SHORT.fadeOutSeconds);
    expect(silence.to).toBeGreaterThan(SHORT.endSeconds);
    expect(silence.from).toBeGreaterThan(1.85);
    expect(silence.to).toBeLessThan(2.4);
    expect(() => core.shortenWav(whole, { endSeconds: 1.5, fadeOutSeconds: 0.05 })).toThrow(/does not lie in a silence/);
    expect(() => core.shortenWav(whole, { endSeconds: 1.93, fadeOutSeconds: 0.05 })).toThrow(/does not lie in a silence/);
    expect(() => core.shortenWav(whole, { endSeconds: 2.15, fadeOutSeconds: 0.5 })).toThrow(/does not lie in a silence/);
    expect(() => core.shortenWav(whole, { endSeconds: 4, fadeOutSeconds: 0.05 })).toThrow(/cannot end at 4 s and be shorter/);
    expect(() => core.shortenWav(Buffer.from('no sound'), SHORT)).toThrow(/no 16 bit PCM WAV file/);
  });

  it('refuses a short line that is missing or stale, and --shorten makes it again from the kept line', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'carcass-short-'));
    try {
      const lines = path.join(root, 'audio', 'kept', 'lines');
      fs.mkdirSync(lines, { recursive: true });
      fs.mkdirSync(path.join(root, 'audio', 'records'), { recursive: true });
      const whole = fs.readFileSync(rel(...WHOLE.split('/')));
      fs.writeFileSync(path.join(lines, 'n8-4.wav'), whole);
      fs.copyFileSync(rel('audio', 'records', 'n8-4.md'), path.join(root, 'audio', 'records', 'n8-4.md'));
      expect(() => cmd.keptLines(lines, filmCfg, root)).toThrow(/n8-4-short\.wav, the short form of line n8-4, is not made yet\. Run npm run cut -- --shorten/);
      fs.writeFileSync(path.join(lines, 'n8-4-short.wav'), whole);
      expect(() => cmd.keptLines(lines, filmCfg, root)).toThrow(/n8-4-short\.wav is not what .*n8-4\.wav gives with narration\.cut/);
      const said = [];
      const r = cmd.shortenCommand({}, { cfg: filmCfg, root, print: (l) => said.push(l), today: '2026-11-26' });
      expect(r).toEqual({ ok: true, wrote: [SHORT.file] });
      expect(said[0]).toMatch(/^cut: audio\/kept\/lines\/n8-4-short\.wav written: "Everything here feeds on it\.", 2\.15 s of the 4\.00 s/);
      expect(fs.readFileSync(path.join(lines, 'n8-4-short.wav')).equals(fs.readFileSync(rel(...SHORT.file.split('/'))))).toBe(true);
      expect(fs.readFileSync(path.join(lines, 'n8-4.wav')).equals(whole)).toBe(true);
      expect(fs.readFileSync(path.join(root, 'audio', 'records', 'n8-4-short.md'), 'utf8')).toBe(fs.readFileSync(rel('audio', 'records', 'n8-4-short.md'), 'utf8'));
      expect(cmd.keptLines(lines, filmCfg, root)).toEqual({ 'n8-4': { seconds: 2.15, file: path.relative(rel(), path.join(lines, 'n8-4-short.wav')).split(path.sep).join('/') } });
      const again = [];
      cmd.shortenCommand({}, { cfg: filmCfg, root, print: (l) => again.push(l), today: '2027-01-01' });
      expect(again[0]).toMatch(/is already what the kept line gives/);
      expect(fs.readFileSync(path.join(root, 'audio', 'records', 'n8-4-short.md'), 'utf8')).toMatch(/^Date: 2026-11-26$/m);
      fs.rmSync(path.join(lines, 'n8-4.wav'));
      expect(() => cmd.shortenCommand({}, { cfg: filmCfg, root, print: () => {} })).toThrow(/the kept line of n8-4, does not exist/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
