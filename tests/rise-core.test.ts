// @ts-nocheck
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { monotone, riseCurve, riseFaults, risePath, riseSpeeds } from '../tools/lib/rise-core.mjs';
import { pullbackPath, revealKeys } from '../tools/lib/animatic-core.mjs';
import * as g12 from '../tools/checks/g12.mjs';
import * as g15 from '../tools/checks/g15.mjs';

const cfg = JSON.parse(fs.readFileSync('config/showcase.json', 'utf8'));
const cut = JSON.parse(fs.readFileSync('cut/CUTLIST.json', 'utf8'));
const pullback = JSON.parse(fs.readFileSync(pullbackPath(cfg), 'utf8'));
const keys = revealKeys(cfg, pullback);
const frames = keys.map((k: { id: string }) => cut.keyFrames[k.id]);
const windows = keys.map((k: { window: { x: number; y: number; w: number; h: number } }) => k.window);
const unit = cfg.film.order[cfg.film.order.length - 1];
const start = cut.places.find((p: { unit: string }) => p.unit === unit).first;

describe('the speeds of the rise', () => {
  it('gives each stretch between two keys the mean of the speeds at its two ends, and stops on the last key', () => {
    const v = riseSpeeds([0, 10, 30], [0, 2, 3]);
    expect(v[2]).toBe(0);
    expect((v[1] + v[2]) / 2).toBeCloseTo(1 / 20, 12);
    expect((v[0] + v[1]) / 2).toBeCloseTo(2 / 10, 12);
  });
});

describe('the curve of the rise', () => {
  const heights = [5, 6.3, 7.1, 8];
  const at = [100, 150, 230, 500];
  const c = riseCurve(20, at, heights);

  it('passes through every key at its frame', () => {
    at.forEach((f, i) => expect(c.at(f)).toBeCloseTo(heights[i], 10));
  });

  it('starts still, never falls, and stops on the last key', () => {
    expect(c.at(21) - c.at(20)).toBeLessThan(1e-4);
    expect(c.at(500) - c.at(499)).toBeLessThan(1e-4);
    for (let f = 21; f <= 500; f++) expect(c.at(f)).toBeGreaterThanOrEqual(c.at(f - 1));
    expect(c.at(900)).toBe(heights[3]);
    expect(c.at(0)).toBe(c.start);
  });

  it('has no jump in its climb from one frame to the next', () => {
    const hs = [];
    for (let f = 20; f <= 500; f++) hs.push(Math.exp(c.at(f)));
    expect(riseFaults(hs, { first: 20 })).toEqual([]);
  });

  it('falls back to a plain eased curve when the keys would ask it to go backwards, and still never falls', () => {
    const odd = riseCurve(0, [10, 20, 30, 300], [1, 1.1, 4, 4.1]);
    expect(odd.speeds).toBeNull();
    for (let f = 1; f <= 300; f++) expect(odd.at(f)).toBeGreaterThanOrEqual(odd.at(f - 1) - 1e-12);
    expect(odd.at(30)).toBeCloseTo(4, 10);
  });

  it('refuses a first key that is not after the first frame', () => {
    expect(() => riseCurve(100, [100, 200], [1, 2])).toThrow(/not after its first frame/);
  });
});

describe('the path of the rise in this film', () => {
  const path = risePath({ start, frames, windows, cover: 1.001, creep: 0.03 });

  it('shows each key window at its key frame, a hair wider', () => {
    frames.forEach((f: number, i: number) => {
      const v = path.at(f);
      const w = windows[i];
      expect(v.cx).toBeCloseTo(w.x + w.w / 2, 6);
      expect(v.cy).toBeCloseTo(w.y + w.h / 2, 6);
      expect(v.w).toBeCloseTo(w.w * 1.001, 6);
    });
  });

  it('starts inside the dark water of the lake, on the centre of the first key', () => {
    const v = path.at(start);
    const w = windows[0];
    expect(v.cx).toBeCloseTo(w.x + w.w / 2, 6);
    expect(v.w).toBeLessThan(w.w * 0.3);
    expect(v.w * pullback.scale_STATED.km_per_master_px).toBeGreaterThan(20);
    expect(v.w * pullback.scale_STATED.km_per_master_px).toBeLessThan(80);
  });

  it('never narrows from the first frame to the last, and has no jump before the titan frame', () => {
    const last = cut.places.find((p: { unit: string }) => p.unit === unit).last;
    const widths = [];
    for (let f = start; f <= last; f++) widths.push(path.at(f).w);
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeGreaterThanOrEqual(widths[i - 1]);
    expect(riseFaults(widths.slice(0, cut.titanFrame - start + 1), { first: start })).toEqual([]);
  });

  it('is fastest near the first key and creeps on after the titan frame', () => {
    const step = (f: number): number => Math.log(path.at(f + 1).w / path.at(f).w);
    let best = start;
    for (let f = start; f < cut.titanFrame; f++) if (step(f) > step(best)) best = f;
    expect(Math.abs(best - frames[0])).toBeLessThan(20);
    expect(path.at(cut.titanFrame + 1200).w).toBeGreaterThan(path.at(cut.titanFrame).w);
    expect(path.at(cut.titanFrame + 1200).w).toBeLessThan(path.at(cut.titanFrame).w * 1.04);
  });
});

describe('the faults of a rise', () => {
  it('passes a smooth climb and a camera that holds still', () => {
    expect(riseFaults([1, 1, 1.001, 1.003, 1.006, 1.01, 1.013, 1.015, 1.016, 1.016])).toEqual([]);
  });

  it('names the frame where the camera falls', () => {
    const f = riseFaults([10, 11, 10.9, 12], { first: 500 });
    expect(f.join('\n')).toContain('The camera falls from 11.0000 to 10.9000 at frame 502.');
  });

  it('names the frame where the camera jumps', () => {
    const hs = [100, 101, 102, 103, 150, 151.5, 153];
    const f = riseFaults(hs, { first: 0 });
    expect(f.some((l) => l.startsWith('The camera jumps at frame 4'))).toBe(true);
  });

  it('refuses a height that is not above zero', () => {
    expect(riseFaults([0, 1, 2]).join('\n')).toContain('has no height above zero');
  });
});

describe('G12 on film states', () => {
  const span = g12.riseSpan(cut, cfg);

  it('reads the rise from the first frame of the last place to the titan frame', () => {
    expect(span).toEqual({ unit, first: start, last: cut.titanFrame });
  });

  const path = risePath({ start, frames, windows });
  const states = (): { frame: number; shot: string; camera: { height: number } }[] => {
    const out = [];
    for (let f = span.first; f <= span.last; f++) out.push({ frame: f, shot: 'reveal-01', camera: { height: path.at(f).w } });
    return out;
  };

  it('passes one shot that only climbs', () => {
    expect(g12.riseIsOneShot(states(), span).faults).toEqual([]);
  });

  it('fails a rise that is cut in two', () => {
    const s = states();
    for (let i = 200; i < s.length; i++) s[i].shot = 'reveal-01b';
    expect(g12.riseIsOneShot(s, span).faults.join('\n')).toContain('runs through 2 shots: reveal-01, reveal-01b');
  });

  it('fails a rise whose camera falls or has no height', () => {
    const s = states();
    s[300].camera.height = s[299].camera.height * 0.9;
    expect(g12.riseIsOneShot(s, span).faults.join('\n')).toContain('The camera falls');
    const t = states();
    t[10].camera.height = Number.NaN;
    expect(g12.riseIsOneShot(t, span).faults.join('\n')).toContain('no camera height');
  });

  it('fails when a frame is missing', () => {
    expect(g12.riseIsOneShot(states().slice(1), span).faults.join('\n')).toContain('states for frames');
  });
});

describe('G15 on the windows of the rise', () => {
  const tolerance = cfg.film.riseWindowTolerance;
  const view = (w: { x: number; y: number; w: number; h: number }, grow = 1.001): { view: { master: { x0: number; y0: number; w: number; h: number } } } => ({
    view: { master: { x0: w.x - (w.w * (grow - 1)) / 2, y0: w.y - (w.h * (grow - 1)) / 2, w: w.w * grow, h: w.h * grow } },
  });

  it('passes views that cover their windows with a hair to spare', () => {
    const r = g15.riseCoversWindows(keys, windows.map((w: { x: number; y: number; w: number; h: number }) => view(w)), tolerance);
    expect(r.faults).toEqual([]);
    expect(r.info).toHaveLength(keys.length);
  });

  it('fails a view that stops short of its window', () => {
    const states = windows.map((w: { x: number; y: number; w: number; h: number }) => view(w));
    states[1] = view(windows[1], 0.9);
    const r = g15.riseCoversWindows(keys, states, tolerance);
    expect(r.faults.join('\n')).toContain(`At the key frame of ${keys[1].id} the view stops`);
  });

  it('fails a view that is far wider than its window', () => {
    const states = windows.map((w: { x: number; y: number; w: number; h: number }) => view(w));
    states[2] = view(windows[2], 1.5);
    const r = g15.riseCoversWindows(keys, states, tolerance);
    expect(r.faults.join('\n')).toContain(`At the key frame of ${keys[2].id} the view runs`);
  });

  it('fails when the film gives no view', () => {
    const r = g15.riseCoversWindows(keys, windows.map(() => ({})), tolerance);
    expect(r.faults).toHaveLength(keys.length);
  });
});

describe('the eased curve the animatic shares', () => {
  it('is still exported from the rise core and passes through its points', () => {
    const c = monotone([0, 10, 30], [1, 2, 5]);
    expect(c(10)).toBeCloseTo(2, 12);
    expect(c(30)).toBe(5);
  });
});
