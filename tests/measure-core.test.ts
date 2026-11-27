// @ts-nocheck
import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const tool = (name) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const core = await tool('lib/measure-core');
const cmd = await tool('measure');
const { config, rel, readJson } = await tool('lib/paths');
const { judgedFrames } = await tool('lib/judged');

const cfg = config();
const cut = readJson(rel('cut', 'CUTLIST.json'));
const dir = fs.mkdtempSync(path.join(rel('out', 'work'), 'test-measure-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const places = cfg.film.order.slice(0, -1);
const reveal = cfg.film.order[cfg.film.order.length - 1];
const filmUnit = cfg.units[cfg.units.length - 1].id;
const realFilm = () => ({ fps: cut.fps, frameCount: cut.frameCount, shots: cut.shots, keyFrames: cut.keyFrames, judged: judgedFrames(cfg, cut), loop: { frameCount: cfg.deliver.cardLoop.seconds * cut.fps, unit: cfg.deliver.cardLoop.unit } });
const testScene = () => ({ fps: 60, frameCount: 600, shots: [{ id: 'test', unit: null, first: 0, last: 599, key: null }], keyFrames: {}, events: [], titanFrame: null, loop: { frameCount: 480, unit: 'heart' } });

function rgba(width, height, paint) {
  const data = Buffer.alloc(width * height * 4, 0);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set([...paint(x, y), 255], (y * width + x) * 4);
  return data;
}

async function picture(name, width, height, blur = 0) {
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.fill(((x >> 2) ^ (y >> 2)) & 1 ? 220 : 30, (y * width + x) * 3, (y * width + x) * 3 + 3);
  let img = sharp(data, { raw: { width, height, channels: 3 } });
  if (blur) img = img.blur(blur);
  const file = path.join(dir, name);
  await img.png().toFile(file);
  return file;
}

function fakeRenderer({ film, flagged = 0, moving = 0.5, views = ['invalid', 'motion'], still = null }) {
  const calls = [];
  return {
    calls,
    filmInfo: async () => film,
    holdRenderer: async () => {},
    releaseRenderer: () => {},
    closeRenderer: async () => {},
    rendererState: async () => ({ built: { engine: 'e', units: { heart: 'h' } }, browser: 'b', machine: 'this-machine' }),
    renderRaw: async (o) => {
      calls.push(o);
      if (!views.includes(o.diag)) throw new Error(`page.evaluate: Error: No such diagnostic view yet: ${o.diag}`);
      const w = 20;
      const h = 10;
      const data = o.diag === 'invalid' ? rgba(w, h, (x, y) => (y * w + x < flagged ? [255, 0, 255] : [40, 40, 40])) : rgba(w, h, (x, y) => (y * w + x < moving * w * h ? [0, cfg.motion.pixelThreshold + 1, 0] : [0, cfg.motion.pixelThreshold, 0]));
      return { data, width: w, height: h, seconds: 0, frame: o.frame ?? null, loop: o.loop ?? null };
    },
    renderStill: async (o) => {
      calls.push({ still: true, ...o });
      return { file: still, record: {}, reused: false, seconds: 0 };
    },
  };
}

describe('which measures a unit gets', () => {
  it('gives a place all three, the reveal two and the film one', () => {
    for (const p of places) expect(core.measuresOf(cfg, p)).toEqual(['M1', 'M2', 'M3']);
    expect(core.measuresOf(cfg, reveal)).toEqual(['M1', 'M3']);
    expect(core.measuresOf(cfg, filmUnit)).toEqual(['M1']);
    expect(() => core.measuresOf(cfg, 'nowhere')).toThrow(/no unit nowhere/);
  });
});

describe('the numbers', () => {
  it('counts only the flag colour for M1', () => {
    const data = rgba(4, 2, (x, y) => (x === 1 && y === 0 ? [255, 0, 255] : x === 2 ? [255, 0, 254] : [70, 70, 70]));
    expect(core.countFlagged(data)).toBe(1);
    expect(core.countFlagged(rgba(3, 3, () => [70, 70, 70]))).toBe(0);
  });

  it('takes the share of pixels whose largest channel is over the threshold for M2', () => {
    const t = cfg.motion.pixelThreshold;
    const data = rgba(4, 1, (x) => [[0, 0, 0], [t, t, t], [0, t + 1, 0], [255, 0, 0]][x]);
    expect(core.movingShare(data, t)).toBe(0.5);
    expect(core.movingShare(Buffer.alloc(0), t)).toBe(0);
  });

  it('reads the floor of M2 from motion.byUnit, then from motion.minMovingAreaShare', () => {
    for (const p of places) expect(core.motionFloor(cfg, p)).toBe(cfg.motion.byUnit[p] ?? cfg.motion.minMovingAreaShare);
    const own = Object.keys(cfg.motion.byUnit)[0];
    expect(core.motionFloor(cfg, own)).toBe(cfg.motion.byUnit[own]);
  });

  it('measures fine detail as the mean squared Laplacian of the luminance', () => {
    expect(core.laplacianEnergy(new Float64Array(25).fill(90), 5, 5)).toBe(0);
    const one = new Float64Array(9);
    one[4] = 10;
    expect(core.laplacianEnergy(one, 3, 3)).toBe(1600);
    const lum = core.luminance(Buffer.from([255, 255, 255, 0, 0, 0]), 3);
    expect(lum[0]).toBeCloseTo(255, 6);
    expect(lum[1]).toBe(0);
    expect(core.laplacianEnergy(new Float64Array(4), 2, 2)).toBe(0);
  });

  it('gives a ratio of 1 for the same picture and less for a soft one, at the size of the approved picture', async () => {
    const sharpOne = await picture('sharp.png', 320, 180);
    const soft = await picture('soft.png', 640, 360, 3);
    const same = await core.sharpnessRatio(sharpOne, sharpOne);
    expect(same.ratio).toBeCloseTo(1, 6);
    expect(same.size).toEqual({ width: 320, height: 180 });
    const less = await core.sharpnessRatio(soft, sharpOne);
    expect(less.ratio).toBeLessThan(cfg.detail.minSharpnessRatio);
    expect(less.size).toEqual({ width: 320, height: 180 });
  });

  it('crops the approved picture at its centre to the shape of the frame', () => {
    expect(core.coverRect(1672, 941, 16 / 9)).toEqual({ left: 0, top: 0, width: 1672, height: 941 });
    expect(core.coverRect(1000, 1000, 2)).toEqual({ left: 0, top: 250, width: 1000, height: 500 });
    expect(core.coverRect(2000, 500, 2)).toEqual({ left: 500, top: 0, width: 1000, height: 500 });
  });
});

describe('the judged frames of a unit', () => {
  it('takes the frame numbers from the judged list of the page', () => {
    const film = realFilm();
    film.judged = { ...film.judged, 'heart-0': film.judged['heart-0'] + 1 };
    const { entries, missing } = core.judgedOf(cfg, cut, film, 'heart');
    expect(missing).toEqual([]);
    expect(entries.map((e) => e.id)).toEqual(cfg.keys.filter((k) => k.unit === 'heart').map((k) => k.id));
    expect(entries[0]).toEqual({ id: 'heart-0', frame: cut.keyFrames['heart-0'] + 1, key: true });
  });

  it('gives the reveal its keys, the titan frame and three handoff frames, and the film its loop frames', () => {
    const r = core.judgedOf(cfg, cut, realFilm(), reveal);
    expect(r.entries.length).toBe(cfg.keys.filter((k) => k.unit === reveal).length + 4);
    const f = core.judgedOf(cfg, cut, realFilm(), filmUnit);
    expect(f.entries.filter((e) => e.loop !== undefined).length).toBe(4);
    expect(f.entries.find((e) => e.id === `${filmUnit}-first`).frame).toBe(0);
  });

  it('computes them from the cut list when the page has no judged list and the same frame count, and says so', () => {
    const film = realFilm();
    delete film.judged;
    const { entries, missing } = core.judgedOf(cfg, cut, film, 'heart');
    expect(entries.length).toBe(5);
    expect(missing.join(' ')).toMatch(/no judged list yet, so the frame numbers were computed from the cut list/);
  });

  it('says plainly what it could not find on the test scene', () => {
    const { entries, missing } = core.judgedOf(cfg, cut, testScene(), 'heart');
    expect(entries).toEqual([]);
    expect(missing).toEqual([`The film on the page has no judged list yet, and it has 600 frames where the cut list has ${cut.frameCount}, so no judged frame of heart could be found.`]);
  });

  it('reads --frames and refuses a frame the film does not have', () => {
    expect(core.givenFrames(['300', '12'], testScene())).toEqual([
      { id: 'frame-300', frame: 300, key: false, given: true },
      { id: 'frame-12', frame: 12, key: false, given: true },
    ]);
    expect(core.givenFrames(undefined, testScene())).toEqual([]);
    expect(() => core.givenFrames('600', testScene())).toThrow(/No such film frame: 600/);
  });
});

describe('measuring a unit', () => {
  it('runs M1, M2 and M3 on a place and is green when every number is', async () => {
    const still = await picture('frame.png', 320, 180);
    const renderer = fakeRenderer({ film: realFilm(), still });
    const out = await core.measureUnit({ cfg, cut, film: realFilm(), unit: 'heart', tier: 'final', format: 'uhd', renderer, approvedPath: () => still });
    expect(out.colour).toEqual({ M1: 'green', M2: 'green', M3: 'green' });
    expect(out.results.filter((r) => r.measure === 'M1').length).toBe(5);
    expect(out.results.filter((r) => r.measure === 'M2').every((r) => r.share === 0.5 && r.floor === core.motionFloor(cfg, 'heart'))).toBe(true);
    expect(out.results.filter((r) => r.measure === 'M3').map((r) => r.ratio)).toEqual([1, 1, 1, 1, 1]);
    expect(renderer.calls.every((c) => c.tier === 'final' && c.format === 'uhd')).toBe(true);
    expect(renderer.calls.filter((c) => c.diag === 'invalid').length).toBe(5);
    expect(renderer.calls.filter((c) => c.diag === 'motion').length).toBe(5);
  });

  it('is red on a flagged pixel, on a dead frame and on a soft frame', async () => {
    const sharpOne = await picture('approved.png', 320, 180);
    const soft = await picture('soft2.png', 320, 180, 4);
    const renderer = fakeRenderer({ film: realFilm(), flagged: 3, moving: 0.01, still: soft });
    const out = await core.measureUnit({ cfg, cut, film: realFilm(), unit: 'heart', tier: 'final', format: 'uhd', renderer, approvedPath: () => sharpOne });
    expect(out.colour).toEqual({ M1: 'red', M2: 'red', M3: 'red' });
    expect(out.results.find((r) => r.measure === 'M1')).toMatchObject({ status: 'fail', flagged: 3, pixels: 200 });
    const lines = core.reportLines(out, { tier: 'final', format: 'uhd' });
    expect(lines.filter((l) => /FAIL/.test(l)).length).toBe(15);
  });

  it('with only, measures the named judged frames and no other', async () => {
    const still = await picture('frame-only.png', 320, 180);
    const key = cfg.keys.filter((k) => k.unit === 'heart').sort((a, b) => a.order - b.order)[3];
    const renderer = fakeRenderer({ film: realFilm(), still });
    const out = await core.measureUnit({ cfg, cut, film: realFilm(), unit: 'heart', tier: 'final', format: 'uhd', only: core.onlyOf(key.id), renderer, approvedPath: () => still });
    expect(out.only).toEqual([key.id]);
    expect(out.results.map((r) => `${r.measure} ${r.id}`)).toEqual([`M1 ${key.id}`, `M2 ${key.id}`, `M3 ${key.id}`]);
    expect(out.colour).toEqual({ M1: 'green', M2: 'green', M3: 'green' });
    expect(renderer.calls.length).toBe(3);
    expect(renderer.calls.every((c) => c.frame === out.frames[0].frame)).toBe(true);
    const lines = core.reportLines(out, { tier: 'final', format: 'uhd' });
    expect(lines[1]).toBe(`measure: only ${key.id}: the other judged frames of heart were not measured`);
    const byFrame = await core.measureUnit({ cfg, cut, film: realFilm(), unit: 'heart', tier: 'final', format: 'uhd', only: core.onlyOf(String(out.frames[0].frame)), renderer: fakeRenderer({ film: realFilm(), still }), approvedPath: () => still });
    expect(byFrame.results.map((r) => r.id)).toEqual([key.id, key.id, key.id]);
    await expect(core.measureUnit({ cfg, cut, film: realFilm(), unit: 'heart', tier: 'final', format: 'uhd', only: ['heart-9'], renderer: fakeRenderer({ film: realFilm(), still }), approvedPath: () => still })).rejects.toThrow(/No judged frame of heart is named heart-9/);
    expect(core.onlyOf(undefined)).toEqual([]);
    expect(core.onlyOf(['heart-1,heart-3', '3156'])).toEqual(['heart-1', 'heart-3', '3156']);
    const full = await core.measureUnit({ cfg, cut, film: realFilm(), unit: 'heart', tier: 'final', format: 'uhd', renderer: fakeRenderer({ film: realFilm(), still }), approvedPath: () => still });
    expect('only' in full).toBe(false);
    expect(core.outFile('d', 'heart')).toBe(path.join('d', 'heart.json'));
    expect(core.outFile('d', 'heart', [key.id])).toBe(path.join('d', 'heart-only.json'));
  });

  it('measures the loop frames of the film by their loop index, with M1 only', async () => {
    const renderer = fakeRenderer({ film: realFilm() });
    const out = await core.measureUnit({ cfg, cut, film: realFilm(), unit: filmUnit, tier: 'final', format: 'uhd', renderer, approvedPath: () => '' });
    expect(out.measures).toEqual(['M1']);
    expect(renderer.calls.filter((c) => c.loop !== undefined).map((c) => c.loop)).toEqual([0, 120, 240, 360]);
  });

  it('on the test scene runs M1 on a given frame and says what is missing', async () => {
    const film = testScene();
    const renderer = fakeRenderer({ film, views: ['invalid'] });
    const out = await core.measureUnit({ cfg, cut, film, unit: 'heart', tier: 'draft', format: 'preview', frames: core.givenFrames('300', film), renderer, approvedPath: () => '' });
    expect(out.colour).toEqual({ M1: 'green', M2: 'not measured', M3: 'not measured' });
    expect(out.results.find((r) => r.measure === 'M2').why).toBe('No such diagnostic view yet: motion');
    const lines = core.reportLines(out, { tier: 'final', format: 'uhd' });
    expect(lines[0]).toBe('measure: heart, draft tier in preview, a quick look: the judged frames are measured at the final tier in uhd');
    expect(lines.some((l) => /^measure: not found: The film on the page has no judged list yet/.test(l))).toBe(true);
    expect(lines.some((l) => /^measure: M1 pass {2}frame-300, frame 300: 0 of 200 pixels hold an invalid value$/.test(l))).toBe(true);
    for (const l of lines) {
      expect(l.startsWith('measure: ')).toBe(true);
      expect(/[\u2014!]/.test(l)).toBe(false);
    }
  });

  it('stops with one plain line when there is no frame to measure', async () => {
    const film = testScene();
    await expect(core.measureUnit({ cfg, cut, film, unit: 'heart', tier: 'draft', format: 'preview', renderer: fakeRenderer({ film }), approvedPath: () => '' })).rejects.toThrow(/no judged frame of heart could be found\. Give frames with --frames/);
  });
});

describe('the command', () => {
  it('writes every number and the build state, with no date and no machine name, and exits 0 on a red measure', async () => {
    const film = testScene();
    const lines = [];
    const r = await cmd.measureCommand({ unit: 'heart', tier: 'draft', format: 'preview', frames: '300' }, { renderer: fakeRenderer({ film, flagged: 2, views: ['invalid'] }), dir, print: (l) => lines.push(l) });
    expect(r.code).toBe(0);
    const text = fs.readFileSync(path.join(dir, 'heart.json'), 'utf8');
    const saved = JSON.parse(text);
    expect(saved.colour.M1).toBe('red');
    expect(saved.state).toEqual({ engine: 'e', units: { heart: 'h' }, browser: 'b' });
    expect(saved.tier).toBe('draft');
    expect(saved.usual).toEqual({ tier: 'final', format: cfg.formats.master.id });
    expect(text).not.toMatch(/this-machine|20\d\d-\d\d-\d\dT/);
    expect(lines[lines.length - 1]).toMatch(/^measure: .*heart\.json$/);
  });

  it('exits 1 with one line for no unit, an unknown unit, an unknown tier and nothing to measure', async () => {
    for (const a of [{}, { unit: 'nowhere', frames: '3' }, { unit: 'heart', tier: 'best', frames: '3' }, { unit: 'heart' }]) {
      const lines = [];
      const r = await cmd.measureCommand(a, { renderer: fakeRenderer({ film: testScene() }), dir, print: (l) => lines.push(l) });
      expect(r.code).toBe(1);
      expect(lines.length).toBe(1);
      expect(lines[0].startsWith('measure: ')).toBe(true);
    }
  });
});
