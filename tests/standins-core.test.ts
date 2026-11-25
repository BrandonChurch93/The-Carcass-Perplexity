// @ts-nocheck
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../tools/lib/standins-core.mjs';
import { judgedList } from '../tools/lib/judged.mjs';
import { runG13, judgedOf, REGISTER, WORK } from '../tools/checks/g13.mjs';

const cfg = JSON.parse(fs.readFileSync('config/showcase.json', 'utf8'));
const cut = JSON.parse(fs.readFileSync('cut/CUTLIST.json', 'utf8'));
const progress = fs.readFileSync('kit/PROGRESS.md', 'utf8');
const units = cfg.units;
const film = units[units.length - 1].id;
const min = cfg.quality.standInMinMeanDifference;

const table = (rows) => ['| Unit | Phase | State | Rounds run | Best round | Commit | What ended its loop |', '| --- | --- | --- | --- | --- | --- | --- |', ...rows.map(([u, p, s, r]) => `| \`${u}\` | ${p} | ${s} | ${r} | | | |`)].join('\n');
const states = (over = {}) => units.map((u) => ({ unit: u.id, phase: u.phase, state: 'not started', rounds: 0, ...(over[u.id] ?? {}) }));
const part = (unit, name, state = 'built', extra = {}) => ({ id: `${unit}/${name}`, unit, name, kind: 'solid', state, fallbackStep: null, files: [`src/places/${unit}`], hash: 'now', standIn: { hash: 'then', picture: `out/stills/parts/${unit}/${name}.png`, frame: 2722, format: 'preview', tier: 'draft', shown: 0.3 }, ...extra });
const live = (p, state = p.state) => ({ id: p.id, unit: p.unit, name: p.name, kind: p.kind, state });
const fine = (p, extra = {}) => ({ live: live(p), hashNow: 'now', frames: 6, flagged: [], listed: false, picture: { pixels: 1000, total: 4000, mean: 40 }, ...extra });
const tests = (faults) => faults.map((f) => f.test);

describe('the units G13 covers', () => {
  it('reads the state of every unit from the table in kit/PROGRESS.md and nothing from the tables beside it', () => {
    const got = core.unitStates(progress);
    expect(got.map((s) => s.unit)).toEqual(units.map((u) => u.id));
    for (const s of got) expect(['not started', 'in progress', 'finished']).toContain(s.state);
    expect(core.unitStates(`${table([['heart', 3, 'finished', 4]])}\n| \`ribs\` | 14 | 14 | 0 | 0 |`)).toEqual([{ unit: 'heart', phase: 3, state: 'finished', rounds: 4 }]);
    expect(core.unitStates(null)).toEqual([]);
  });

  it('covers the unit a round is about and every finished unit, and no other', () => {
    const c = core.coverage({ phase: 4, asked: ['ribs'], states: states({ heart: { state: 'finished', rounds: 3 } }), units });
    expect(c.units).toEqual(['heart', 'ribs']);
    expect(c.all).toBe(false);
    expect(c.why.ribs).toBe('the unit under judgement');
    expect(c.why.heart).toContain('finished');
  });

  it('covers the units of the phases so far when the gate names no unit', () => {
    expect(core.coverage({ phase: 2, states: states(), units }).units).toEqual([]);
    expect(core.coverage({ phase: 3, states: states(), units }).units).toEqual(['heart']);
    const four = core.coverage({ phase: 4, states: states(), units });
    expect(four.units).toEqual(cfg.film.order.slice().sort((a, b) => units.findIndex((u) => u.id === a) - units.findIndex((u) => u.id === b)));
    expect(four.all).toBe(false);
    expect(core.coverage({ phase: 5, states: states(), units }).all).toBe(true);
  });

  it('covers every part there is from the first round on the film', () => {
    expect(core.coverage({ phase: 5, asked: [film], states: states(), units }).all).toBe(true);
    expect(core.coverage({ phase: 5, asked: ['eye'], states: states({ [film]: { state: 'in progress', rounds: 1 } }), units }).all).toBe(true);
    expect(core.coverage({ phase: 5, asked: ['eye'], states: states({ [film]: { state: 'in progress', rounds: 0 } }), units }).all).toBe(false);
  });

  it('refuses a unit the config does not have, and reads a list of units however it is written', () => {
    expect(() => core.coverage({ phase: 3, asked: ['liver'], states: states(), units })).toThrow(/No such unit: liver/);
    expect(core.unitList('heart, ribs')).toEqual(['heart', 'ribs']);
    expect(core.unitList(['heart', 'heart,eye'])).toEqual(['heart', 'eye']);
    expect(core.unitList(true)).toEqual([]);
    expect(core.unitList(undefined)).toEqual([]);
  });

  it('picks the parts of the covered units, or all of them', () => {
    const register = { parts: [part('heart', 'lava'), part('ribs', 'sea'), part(film, 'opening')] };
    const heart = core.coverage({ phase: 3, asked: ['heart'], states: states(), units });
    expect(core.coveredParts(register, heart).map((p) => p.id)).toEqual(['heart/lava']);
    expect(core.coverageLine(heart, 1)).toBe('G13 covers 1 part: heart (the unit under judgement).');
    const all = core.coverage({ phase: 5, asked: [film], states: states(), units });
    expect(core.coveredParts(register, all)).toHaveLength(3);
    expect(core.coverageLine(all, 3)).toContain('every part there is, 3 of them');
    expect(core.coverageLine(core.coverage({ phase: 2, states: states(), units }), 0)).toContain('covers no part');
  });
});

describe('the judged frames of a unit', () => {
  const list = judgedList(cfg, cut);
  const names = { film, loopUnit: cfg.deliver.cardLoop.unit };

  it('are its key frames, the film frames inside its place, and the loop frames for the unit of the loop', () => {
    for (const unit of cfg.film.order) {
      const got = core.judgedFramesOf(list, cut, unit, names);
      const place = cut.places.find((p) => p.unit === unit);
      for (const k of cfg.keys.filter((x) => x.unit === unit)) expect(got.map((g) => g.frame)).toContain(cut.keyFrames[k.id]);
      for (const g of got.filter((x) => Number.isInteger(x.frame))) expect(g.frame >= place.first && g.frame <= place.last).toBe(true);
      expect(got.some((g) => Number.isInteger(g.loop))).toBe(unit === names.loopUnit);
      expect(new Set(got.map((g) => `${g.frame} ${g.loop}`)).size).toBe(got.length);
    }
    const loops = core.judgedFramesOf(list, cut, names.loopUnit, names).filter((g) => Number.isInteger(g.loop));
    expect(loops).toHaveLength(4);
  });

  it('take a frame a critic added to the list in kit/PROGRESS.md', () => {
    const heart = cut.places.find((p) => p.unit === 'heart');
    const text = `## Judged frames\n\n| Entry | Unit | Frame | What |\n| --- | --- | --- | --- |\n| \`heart-critic-1\` | \`heart\` | ${heart.first + 7} | A frame a critic named (added) |\n`;
    const all = judgedOf(cfg, cut, text);
    expect(all).toHaveLength(list.length + 1);
    expect(core.judgedFramesOf(all, cut, 'heart', names).map((g) => g.frame)).toContain(heart.first + 7);
    expect(judgedOf(cfg, cut, null)).toHaveLength(list.length);
  });

  it('names a frame in plain words', () => {
    expect(core.frameName({ id: 'heart-0', frame: 2722 })).toBe('frame 2722 (heart-0)');
    expect(core.frameName({ id: 'loop-1', loop: 120 })).toBe('loop frame 120 (loop-1)');
  });
});

describe('the difference of two pictures over the pixels the part covers', () => {
  const px = (...p) => Uint8Array.from(p.flat());
  const black = [0, 0, 0];
  const grain = [2, 1, 2];

  it('is the mean over the pixels lit in either picture, and leaves the black ground out', () => {
    const a = px([100, 100, 100], black, grain, black);
    const b = px([110, 100, 90], [30, 30, 30], black, grain);
    const d = core.maskedMeanDifference(a, b);
    expect(d.pixels).toBe(2);
    expect(d.total).toBe(4);
    expect(d.mean).toBeCloseTo((20 / 3 + 30) / 2, 12);
  });

  it('is zero for the same picture, and nothing at all when the part covers no pixel', () => {
    const a = px([100, 120, 140], black);
    expect(core.maskedMeanDifference(a, a)).toEqual({ pixels: 1, total: 2, mean: 0 });
    expect(core.maskedMeanDifference(px(black, grain), px(grain, black)).mean).toBeNull();
  });

  it('is not thinned by the ground around a small part', () => {
    const small = (v) => px([v, v, v], ...Array.from({ length: 999 }, () => black));
    expect(core.maskedMeanDifference(small(200), small(180)).mean).toBe(20);
  });

  it('counts a part that is gone from where it was', () => {
    const d = core.maskedMeanDifference(px([90, 90, 90], black), px(black, [90, 90, 90]));
    expect(d.pixels).toBe(2);
    expect(d.mean).toBe(90);
  });

  it('reads four channels, counts the covered pixels and refuses two sizes', () => {
    const a = Uint8Array.from([50, 50, 50, 255, 0, 0, 0, 255]);
    const b = Uint8Array.from([56, 50, 50, 255, 0, 0, 0, 255]);
    expect(core.maskedMeanDifference(a, b, { channels: 4 })).toEqual({ pixels: 1, total: 2, mean: 2 });
    expect(core.coveredPixels(a, { channels: 4 })).toBe(1);
    expect(() => core.maskedMeanDifference(a, px(black))).toThrow(/not the same size/);
  });
});

describe('the four tests of one part', () => {
  it('passes a built part whose files, pixels and picture have all changed', () => {
    const p = part('heart', 'lava');
    expect(core.partFaults(p, fine(p), { min })).toEqual([]);
    const f = part('heart', 'fume', 'fallback');
    expect(core.partFaults(f, fine(f), { min })).toEqual([]);
  });

  it('fails all four for a stand-in nobody has touched', () => {
    const p = part('heart', 'lava', 'stand-in', { hash: 'then' });
    const faults = core.partFaults(p, fine(p, { hashNow: 'then', flagged: [{ id: 'heart-0', frame: 2722, share: 0.13 }, { id: 'heart-1', frame: 3477, share: 0.4 }], listed: true, picture: { pixels: 900, total: 4000, mean: 0 } }), { min });
    expect(tests(faults)).toEqual([1, 2, 3, 4]);
    expect(faults[0].line).toBe('heart/lava fails test 1: the register still lists it as a stand-in.');
    expect(faults[1].line).toContain('the hash of its files, then, is the hash recorded when it was a stand-in');
    expect(faults[2].line).toBe('heart/lava fails test 3: the standins view flags it in 2 of 6 judged frames, most at frame 3477 (heart-1), 40.0 percent of the frame, and the page lists it in info().standIns.');
    expect(faults[3].line).toBe(`heart/lava fails test 4: its picture at frame 2722 differs from the reference by a mean of 0.00 levels over the 900 pixels it covers, and more than ${min} is needed.`);
    for (const f of faults) expect(f.line).not.toMatch(/[\u2014!]/);
  });

  it('is not turned green by a new label: the hash, the view and the picture still fail', () => {
    const p = part('heart', 'lava', 'built', { hash: 'then' });
    const faults = core.partFaults(p, fine(p, { live: live(p, 'stand-in'), hashNow: 'then', flagged: [{ id: 'heart-0', frame: 2722, share: 0.13 }], listed: true, picture: { pixels: 900, total: 4000, mean: 0 } }), { min });
    expect(tests(faults)).toEqual([2, 3, 4]);
  });

  it('is not turned green by taking the flag out of the code: the picture still fails', () => {
    const p = part('heart', 'lava', 'built');
    const faults = core.partFaults(p, fine(p, { picture: { pixels: 900, total: 4000, mean: 0 } }), { min });
    expect(tests(faults)).toEqual([4]);
  });

  it('needs more than the least difference, not just as much', () => {
    const p = part('heart', 'lava');
    expect(tests(core.partFaults(p, fine(p, { picture: { pixels: 10, total: 40, mean: min } }), { min }))).toEqual([4]);
    expect(core.partFaults(p, fine(p, { picture: { pixels: 10, total: 40, mean: min + 0.01 } }), { min })).toEqual([]);
  });

  it('fails test 2 while the files as they are still draw a stand-in, whatever the register recorded', () => {
    const p = part('heart', 'sky', 'stand-in', { hash: 'then' });
    const faults = core.partFaults(p, fine(p, { hashNow: 'other' }), { min });
    expect(tests(faults)).toEqual([1, 2, 3]);
    expect(faults[1].line).toContain('still draw it as a stand-in');
    expect(faults[2].line).toContain('though none of the 6 judged frames shows a pixel of it');
  });

  it('skips tests 2 and 4 for a part that never was a stand-in', () => {
    const { standIn, ...p } = part('eye', 'lake');
    expect(core.partFaults(p, fine(p, { hashNow: p.hash, picture: null }), { min })).toEqual([]);
  });

  it('fails test 4 when the reference is not recorded, not there or cannot be compared', () => {
    const none = part('heart', 'lava', 'built', { standIn: { hash: 'then', picture: null, frame: null, format: null, tier: null, shown: null } });
    expect(core.partFaults(none, fine(none, { picture: null }), { min })[0].line).toContain('no reference picture');
    const p = part('heart', 'lava');
    expect(core.partFaults(p, fine(p, { picture: { missing: true } }), { min })[0].line).toContain('out/stills/parts/heart/lava.png is not there');
    expect(core.partFaults(p, fine(p, { picture: { error: 'the page reported: boom' } }), { min })[0].line).toContain('boom');
    expect(core.partFaults(p, fine(p, { picture: { pixels: 0, total: 40, mean: null } }), { min })[0].line).toContain('covers no pixel');
  });

  it('leaves test 4 out, and says so, for a stand-in the film never showed', () => {
    const p = part('heart', 'lava', 'built', { standIn: { hash: 'then', picture: null, frame: null, format: null, tier: null, shown: 0 } });
    expect(core.partFaults(p, fine(p, { picture: null }), { min })).toEqual([]);
    expect(core.unseen([p, part('heart', 'sky')])).toEqual(['heart/lava']);
  });

  it('fails a part the page no longer draws, and a state the register does not know', () => {
    const gone = part('heart', 'lava', 'built', { missing: true });
    const faults = core.partFaults(gone, fine(gone, { live: null }), { min });
    expect(tests(faults)).toEqual([3]);
    expect(faults[0].line).toContain('the page does not draw it');
    const odd = part('heart', 'lava', 'done');
    expect(core.partFaults(odd, fine(odd), { min })[0].line).toContain('the state done');
  });

  it('counts the parts that fail and the tests they fail', () => {
    const a = part('heart', 'lava', 'stand-in');
    const b = part('heart', 'sky');
    const faults = [...core.partFaults(a, fine(a, { live: live(a), listed: true }), { min }), ...core.partFaults(b, fine(b, { picture: { pixels: 5, total: 9, mean: 1 } }), { min })];
    expect(core.countLine([a, b, part('heart', 'air')], faults)).toBe('2 of 3 covered parts fail: 1 test 1, 1 test 2, 1 test 3, 1 test 4.');
    expect(core.countLine([b], [])).toBe('All 1 covered parts pass.');
    expect(core.strangers([live(a), live(b)], { parts: [a] })).toEqual(['heart/sky']);
  });
});

describe('G13 on a page', () => {
  const dirs = [];
  afterAll(() => {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  });
  const W = 8;
  const H = 4;
  const GREY = [120, 120, 120];
  const FLAG = [255, 0, 255];
  const frame = cut.keyFrames['heart-0'];

  // A fake page of two parts. Each part is a block of four pixels. `look` is what the solo view shows of it now.
  function page({ lava = 'built', sky = 'built', lavaLook = [200, 90, 20], skyLook = [40, 60, 90], listed = [] } = {}) {
    const calls = [];
    const state = { 'heart/lava': lava, 'heart/sky': sky };
    const at = { 'heart/lava': 0, 'heart/sky': 4 };
    const look = { 'heart/lava': lavaLook, 'heart/sky': skyLook };
    const paint = (ids, colour) => {
      const data = Buffer.alloc(W * H * 4);
      for (const id of ids) for (let i = 0; i < 4; i++) data.set([...colour(id), 255], (at[id] + i) * 4);
      // The canvas is read bottom row first.
      const rows = Array.from({ length: H }, (_, y) => data.subarray(y * W * 4, (y + 1) * W * 4));
      return Buffer.concat(rows.reverse());
    };
    return {
      calls,
      holdRenderer: async () => {},
      releaseRenderer: () => {},
      unitParts: async (u) => (u === 'heart' ? Object.keys(state).map((id) => ({ id, unit: 'heart', name: id.split('/')[1], kind: 'solid', state: state[id] })) : []),
      pageInfo: async () => ({ standIns: [...Object.keys(state).filter((id) => state[id] === 'stand-in'), ...listed].map((p) => ({ part: p, unit: 'heart' })) }),
      renderRaw: async (o) => {
        calls.push(o);
        const standIns = Object.keys(state).filter((id) => state[id] === 'stand-in' && (!o.part || o.part === id));
        const data = o.diag === 'standins' ? paint(standIns, () => FLAG) : paint([o.part], (id) => look[id]);
        return { data, width: W, height: H, seconds: 0.01, frame: o.frame ?? null, loop: o.loop ?? null };
      },
    };
  }

  async function root(parts) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'carcass-g13-'));
    dirs.push(dir);
    const put = (file, body) => {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), body);
    };
    put(REGISTER, JSON.stringify({ schema: 'carcass/parts 1', parts }));
    put('cut/CUTLIST.json', JSON.stringify(cut));
    put('kit/PROGRESS.md', `## Units\n\n${table(units.map((u) => [u.id, u.phase, 'not started', 0]))}\n`);
    for (const p of parts.filter((x) => x.standIn?.picture)) {
      const data = Buffer.alloc(W * H * 3);
      for (let i = 0; i < 4; i++) data.set(GREY, ((p.name === 'lava' ? 0 : 4) + i) * 3);
      fs.mkdirSync(path.dirname(path.join(dir, p.standIn.picture)), { recursive: true });
      await sharp(data, { raw: { width: W, height: H, channels: 3 } }).png().toFile(path.join(dir, p.standIn.picture));
    }
    return dir;
  }

  const ctx = (dir, renderer, extra = {}) => ({ phase: 3, units: ['heart'], root: dir, config: cfg, renderer: async () => renderer, ...extra });
  const both = (lava = 'built', sky = 'built', hash = 'now') => [part('heart', 'lava', lava, { hash, standIn: { ...part('heart', 'lava').standIn, frame } }), part('heart', 'sky', sky, { hash, standIn: { ...part('heart', 'sky').standIn, frame } }), part('ribs', 'sea', 'stand-in')];

  it('is green when every covered part is built, and renders each judged frame once', async () => {
    const dir = await root(both());
    const fake = page();
    const r = await runG13(ctx(dir, fake), { hashOf: () => 'now' });
    expect(r.lines).toEqual(['G13 covers 2 parts: heart (the unit under judgement).', 'All 2 covered parts pass.']);
    expect(r.ok).toBe(true);
    const views = fake.calls.filter((c) => c.diag === 'standins');
    expect(views.every((c) => !c.part)).toBe(true);
    expect(views.filter((c) => Number.isInteger(c.frame)).map((c) => c.frame)).toEqual(expect.arrayContaining(cfg.keys.filter((k) => k.unit === 'heart').map((k) => cut.keyFrames[k.id])));
    expect(fake.calls.filter((c) => c.diag === 'solo')).toEqual([expect.objectContaining({ frame, format: 'preview', tier: 'draft', part: 'heart/lava' }), expect.objectContaining({ part: 'heart/sky' })]);
    expect(fs.existsSync(path.join(dir, WORK, 'heart', 'lava.png'))).toBe(true);
    expect(JSON.parse(fs.readFileSync(path.join(dir, WORK, 'g13.json'), 'utf8')).parts.map((p) => p.id)).toEqual(['heart/lava', 'heart/sky']);
  });

  it('is red for the one part that is still a stand-in, with one line for each test and a count', async () => {
    const dir = await root(both('stand-in'));
    const r = await runG13(ctx(dir, page({ lava: 'stand-in', lavaLook: GREY })), { hashOf: () => 'then' });
    expect(r.ok).toBe(false);
    const lava = r.lines.filter((l) => l.startsWith('heart/lava fails'));
    expect(lava.map((l) => l.slice(0, 24))).toEqual([1, 2, 3, 4].map((n) => `heart/lava fails test ${n}:`));
    expect(r.lines.filter((l) => l.startsWith('heart/sky fails')).map((l) => l.slice(0, 22))).toEqual(['heart/sky fails test 2']);
    expect(r.lines).toContain('2 of 2 covered parts fail: 1 test 1, 2 test 2, 1 test 3, 1 test 4.');
    expect(r.lines.some((l) => l.startsWith('ribs/'))).toBe(false);
  });

  it('is red when the label says built and the page still flags the part', async () => {
    const dir = await root(both());
    const r = await runG13(ctx(dir, page({ sky: 'stand-in', skyLook: GREY })), { hashOf: () => 'now' });
    expect(r.ok).toBe(false);
    expect(r.lines.filter((l) => l.includes(' fails test ')).map((l) => l.split(':')[0])).toEqual(['heart/sky fails test 2', 'heart/sky fails test 3', 'heart/sky fails test 4']);
  });

  it('is red when only the picture is unchanged', async () => {
    const dir = await root(both());
    const r = await runG13(ctx(dir, page({ lavaLook: GREY })), { hashOf: () => 'now' });
    expect(r.lines[0]).toBe(`heart/lava fails test 4: its picture at frame ${frame} differs from the reference by a mean of 0.00 levels over the 4 pixels it covers, and more than ${min} is needed.`);
    expect(r.lines[1]).toBe('1 of 2 covered parts fail: 1 test 4.');
  });

  it('is red when the page lists a part in info().standIns that draws no flagged pixel', async () => {
    const dir = await root(both());
    const r = await runG13(ctx(dir, page({ listed: ['heart/sky'] })), { hashOf: () => 'now' });
    expect(r.lines[0]).toBe('heart/sky fails test 3: the page lists it in info().standIns.');
  });

  it('is red for a part the page draws and the register does not list, and for a unit with no part', async () => {
    const dir = await root(both().slice(1));
    const r = await runG13(ctx(dir, page()), { hashOf: () => 'now' });
    expect(r.ok).toBe(false);
    expect(r.lines[0]).toContain('heart/lava');
    expect(r.lines[0]).toContain('does not list');
    const none = await runG13(ctx(await root([part('ribs', 'sea')]), page()), { hashOf: () => 'now' });
    expect(none.lines).toEqual([`${REGISTER} lists no part of heart. Run npm run parts.`]);
  });

  it('covers nothing before Phase 3 names a unit, and says which unit it does not know', async () => {
    const dir = await root(both());
    const early = await runG13(ctx(dir, page(), { phase: 2, units: [] }));
    expect(early.ok).toBe(true);
    expect(early.lines[0]).toContain('covers no part');
    const unknown = await runG13(ctx(dir, page(), { units: ['liver'] }));
    expect(unknown).toEqual({ ok: false, lines: ['No such unit: liver'], skipped: [] });
  });

  it('is red when there is no register or the renderer cannot be loaded', async () => {
    const dir = await root(both());
    const broken = await runG13({ ...ctx(dir, null), renderer: async () => Promise.reject(new Error('no browser')) });
    expect(broken.lines[0]).toContain('no browser');
    fs.rmSync(path.join(dir, REGISTER));
    expect((await runG13(ctx(dir, page()))).lines).toEqual([`There is no ${REGISTER}.`]);
  });
});
