// @ts-nocheck
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../tools/lib/seam-core.mjs';
import { runG14, RECORD, WORK } from '../tools/checks/g14.mjs';

const cfg = JSON.parse(fs.readFileSync('config/showcase.json', 'utf8'));
const ratio = cfg.deliver.cardLoop.seamMaxRatio;
const px = (...levels) => Buffer.from(levels.flatMap((v) => (Array.isArray(v) ? [...v, 255] : [v, v, v, 255])));

describe('two frames compared', () => {
  it('counts the pixels that differ in red, green or blue and the largest difference', () => {
    expect(core.differing(px(0, 10, 20, 30), px(0, 10, 20, 30))).toEqual({ pixels: 0, total: 4, max: 0 });
    expect(core.differing(px(0, 10, 20, 30), px(0, 11, 20, [30, 30, 90]))).toEqual({ pixels: 2, total: 4, max: 60 });
  });

  it('does not read the fourth channel as picture', () => {
    const a = px(5, 5);
    const b = px(5, 5);
    b[3] = 0;
    expect(core.differing(a, b).pixels).toBe(0);
    expect(core.meanDifference(a, b)).toBe(0);
  });

  it('takes the mean over every pixel and the three channels, in levels', () => {
    expect(core.meanDifference(px(0, 0, 0, 0), px(8, 0, 0, 0))).toBe(2);
    expect(core.meanDifference(px([0, 0, 0]), px([30, 0, 0]))).toBe(10);
    expect(core.meanDifference(Buffer.from([0, 0, 0, 10, 10, 10]), Buffer.from([3, 3, 3, 10, 10, 13]), 3)).toBeCloseTo(2, 10);
  });

  it('refuses two frames of different sizes, and a frame that is not whole pixels', () => {
    expect(() => core.differing(px(0, 0), px(0))).toThrow(/not the same size/);
    expect(() => core.meanDifference(Buffer.alloc(6), Buffer.alloc(6))).toThrow(/not whole pixels/);
    expect(() => core.meanDifference(Buffer.alloc(0), Buffer.alloc(0))).toThrow(/not whole pixels/);
  });
});

describe('the frame one past the last', () => {
  const same = (tier) => ({ tier, pixels: 0, total: 518400, max: 0 });

  it('passes only when it is the same picture as frame 0 at every tier', () => {
    expect(core.identityFaults([same('draft'), same('final')], 480)).toEqual([]);
    expect(core.identityLine([same('draft'), same('final')], 480)).toBe('loop frame 480 is the same picture as frame 0 at the draft, final tiers');
  });

  it('says how many pixels differ, by how much and at which tier, for one pixel off by one level too', () => {
    const faults = core.identityFaults([same('draft'), { tier: 'review', pixels: 1, total: 518400, max: 1 }, { tier: 'final', pixels: 284020, total: 518400, max: 227 }], 480);
    expect(faults).toEqual([
      'Loop frame 480, drawn at its own time, differs from frame 0 in 1 pixel of 518400 at the review tier, by up to 1 level out of 255. It must be the same picture.',
      'Loop frame 480, drawn at its own time, differs from frame 0 in 284020 pixels of 518400 at the final tier, by up to 227 levels out of 255. It must be the same picture.',
    ]);
    expect(core.identityLine([same('draft'), { tier: 'final', pixels: 1, total: 4, max: 1 }], 480)).toBeNull();
  });
});

describe('the step across the seam', () => {
  const steps = [1, 3, 2];

  it('finds the largest step between two neighbouring frames and where it is', () => {
    expect(core.largestStep(steps)).toEqual({ from: 1, to: 2, mean: 3 });
    expect(core.largestStep([2, 2])).toEqual({ from: 0, to: 1, mean: 2 });
    expect(core.largestStep([])).toBeNull();
  });

  it('allows a seam of exactly the ratio times the largest step, and nothing above it', () => {
    expect(core.seamFaults({ frameCount: 4, steps, seam: ratio * 3, ratio })).toEqual([]);
    const faults = core.seamFaults({ frameCount: 4, steps, seam: ratio * 3 + 0.3, ratio });
    expect(faults).toEqual([`Loop frame 3 and frame 0 differ by a mean of ${(ratio * 3 + 0.3).toFixed(2)} levels, ${((ratio * 3 + 0.3) / 3).toFixed(2)} times the largest step elsewhere in the loop (3.00 levels, between frames 1 and 2). At most ${ratio} times is allowed.`]);
  });

  it('does not count the seam itself among the steps it is compared with', () => {
    expect(core.seamMeasure({ steps, seam: 50, ratio }).largest.mean).toBe(3);
    expect(core.seamFaults({ frameCount: 4, steps, seam: 50, ratio })).toHaveLength(1);
  });

  it('holds a loop that does not move to a seam that does not move', () => {
    expect(core.seamFaults({ frameCount: 4, steps: [0, 0, 0], seam: 0, ratio })).toEqual([]);
    expect(core.seamFaults({ frameCount: 4, steps: [0, 0, 0], seam: 0.5, ratio })).toEqual(['Loop frame 3 and frame 0 differ by a mean of 0.50 levels, and no two neighbouring frames elsewhere in the loop differ at all.']);
  });

  it('is red when a step is missing, when the loop is too short, or when the ratio is not a number', () => {
    expect(core.seamFaults({ frameCount: 5, steps, seam: 1, ratio })[0]).toContain('3 steps between neighbouring frames were measured and a loop of 5 frames has 4');
    expect(core.seamFaults({ frameCount: 1, steps: [], seam: 0, ratio })[0]).toContain('has no two neighbouring frames');
    expect(core.seamFaults({ frameCount: 4, steps, seam: 1, ratio: undefined })[0]).toContain('seamMaxRatio');
    expect(core.seamFaults({ frameCount: 4, steps, seam: 1, ratio: 0 })[0]).toContain('seamMaxRatio');
  });

  it('says the numbers of a seam that passes, and nothing of one that fails', () => {
    expect(core.seamLine({ frameCount: 4, steps, seam: 2.5, ratio })).toBe(`frame 3 to frame 0 is a step of 2.50 levels; the largest elsewhere is 3.00, between frames 1 and 2, and ${ratio} times that is allowed`);
    expect(core.seamLine({ frameCount: 4, steps, seam: 99, ratio })).toBeNull();
    expect(core.countLine(['a'])).toBe("1 fault at the loop's seam.");
    expect(core.countLine(['a', 'b'])).toBe("2 faults at the loop's seam.");
  });

  it('writes no line with an em dash or an exclamation point', () => {
    const lines = [...core.identityFaults([{ tier: 'draft', pixels: 3, total: 9, max: 2 }], 480), ...core.seamFaults({ frameCount: 4, steps, seam: 99, ratio }), core.seamLine({ frameCount: 4, steps, seam: 1, ratio }), core.countLine([])];
    for (const l of lines) expect(l).not.toMatch(/[\u2014!]/);
  });
});

describe('the runner, against a page that is not there', () => {
  const dirs = [];
  afterAll(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));
  const N = 6;

  // A fake loop of six frames, each one pixel of grey and one pixel of the part heart/lava.
  // `level(f)` is the grey at motion frame f, `lava(f)` the part's level, and `grain(i)` what is counted round the loop
  // and laid over the whole picture only.
  const page = ({ level = (f) => 100 + 10 * Math.sin((2 * Math.PI * f) / N), lava = () => 50, grain = (i) => i % N, built = { engine: 'e1', units: { heart: 'h1' } } } = {}) => {
    const calls = [];
    const renderer = {
      holdRenderer: async () => {},
      releaseRenderer: () => {},
      filmInfo: async () => ({ loop: { frameCount: N, unit: 'heart' } }),
      rendererState: async () => ({ built, browser: 'b1', machine: 'here' }),
      unitParts: async () => [{ id: 'heart/lava' }, { id: 'heart/sky' }],
      renderRaw: async (o) => {
        calls.push(o);
        const part = o.diag === 'solo' ? o.part : null;
        const grey = part === 'heart/lava' ? 0 : Math.round(level(o.loop)) + (part ? 0 : grain(o.loop));
        const hot = part === 'heart/sky' ? 0 : Math.round(lava(o.loop));
        const sky = part === 'heart/lava' ? 0 : 20;
        return { data: px(grey, hot, sky, sky), width: 2, height: 2, seconds: 0 };
      },
    };
    return { renderer, calls };
  };
  const ctx = (p) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'g14-'));
    dirs.push(root);
    return { root, phase: 5, config: cfg, units: [], renderer: async () => p.renderer };
  };
  const record = (c) => JSON.parse(fs.readFileSync(path.join(c.root, RECORD), 'utf8'));

  it('is green for a loop that comes round, and renders the frame one past the last without wrapping it', async () => {
    const p = page();
    const c = ctx(p);
    const r = await runG14(c);
    expect(r.ok).toBe(true);
    expect(r.lines).toHaveLength(2);
    expect(r.lines[0]).toContain(`loop frame ${N} is the same picture as frame 0 at the ${Object.keys(cfg.tiers).join(', ')} tiers`);
    expect(p.calls.filter((o) => o.loop === N).map((o) => o.tier)).toEqual(Object.keys(cfg.tiers));
    expect(record(c).steps).toHaveLength(N - 1);
    expect(record(c).ok).toBe(true);
  });

  it('is red when a motion does not come round, names the part, and keeps the two frames and their difference', async () => {
    const p = page({ lava: (f) => 50 + 4 * f });
    const c = ctx(p);
    const r = await runG14(c);
    expect(r.ok).toBe(false);
    expect(r.lines[0]).toBe(`Loop frame ${N}, drawn at its own time, differs from frame 0 in 1 pixel of 4 at the draft tier, by up to ${4 * N} levels out of 255. It must be the same picture.`);
    expect(r.lines.find((l) => l.includes('faults at'))).toBe(`${Object.keys(cfg.tiers).length} faults at the loop's seam.`);
    expect(r.lines.find((l) => l.includes('not come round'))).toContain('1 part of 2 of heart does not come round: heart/lava (1 pixel)');
    expect(r.lines.some((l) => l.startsWith('passed: frame'))).toBe(true);
    for (const f of ['frame-0.png', `frame-${N}.png`, 'difference-times-8.png']) expect(fs.existsSync(path.join(c.root, WORK, f))).toBe(true);
    expect(record(c).open).toEqual([{ part: 'heart/lava', pixels: 1, total: 4, max: 4 * N }]);
  });

  it('is red when the grain is counted by the motion frame and not round the loop', async () => {
    const r = await runG14(ctx(page({ grain: (i) => i })));
    expect(r.ok).toBe(false);
    expect(r.lines.find((l) => l.includes('laid over the whole picture'))).toBeDefined();
  });

  it('is red for a jump at the seam that the frame one past the last hides', async () => {
    // A ramp that the page snaps back at frame N: frame N equals frame 0 and the last frame is far from it.
    const p = page({ level: (f) => (f === N ? 100 : 100 + 3 * f), grain: () => 0 });
    const r = await runG14(ctx(p));
    expect(r.ok).toBe(false);
    expect(r.lines[0]).toContain(`Loop frame ${N - 1} and frame 0 differ by a mean of 3.75 levels, 5.00 times the largest step elsewhere in the loop (0.75 levels, between frames 0 and 1). At most ${ratio} times is allowed.`);
    expect(r.lines.some((l) => l.startsWith('passed: loop frame'))).toBe(true);
  });

  it('reads the steps again from its record while the build is the same, and renders them again when it is not', async () => {
    const p = page();
    const c = ctx(p);
    await runG14(c);
    const before = p.calls.length;
    const again = await runG14(c);
    expect(p.calls.length - before).toBe(2 * Object.keys(cfg.tiers).length);
    expect(again.ok).toBe(true);
    expect(again.lines[again.lines.length - 1]).toContain(`were read from ${RECORD}`);
    const q = page({ built: { engine: 'e2', units: { heart: 'h1' } } });
    const r = await runG14({ ...c, renderer: async () => q.renderer });
    expect(q.calls.length).toBe(2 * Object.keys(cfg.tiers).length + N);
    expect(r.lines.some((l) => l.includes('were read from'))).toBe(false);
  });

  it('is red in plain words when the renderer cannot be loaded or the page throws', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'g14-'));
    dirs.push(root);
    const none = await runG14({ root, phase: 5, config: cfg, units: [], renderer: async () => Promise.reject(new Error('no browser')) });
    expect(none).toEqual({ ok: false, lines: ['The renderer could not be loaded: no browser'], skipped: [] });
    const p = page();
    p.renderer.renderRaw = async () => Promise.reject(new Error('No such loop frame: 6\nstack'));
    const r = await runG14(ctx(p));
    expect(r).toEqual({ ok: false, lines: ['The loop could not be judged: No such loop frame: 6'], skipped: [] });
  });
});
