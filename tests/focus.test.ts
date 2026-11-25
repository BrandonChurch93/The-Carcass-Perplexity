import { describe, expect, it } from 'vitest';
import { BLUR_SPACING, MAX_COC_FRACTION, WIDE_SPACING, blurShare, blurTaps, clampCoc, cocPixels, focalPixels, lensPoints, lensSpread, maxCoc } from '../src/core/focus';

const COUNTS = [1, 2, 4, 8, 16, 64];

describe('the circle of confusion', () => {
  it('is zero at the focus, negative in front of it and positive behind it', () => {
    const f = focalPixels(40, 2160);
    expect(cocPixels(0.03, f, 20, 20)).toBe(0);
    expect(cocPixels(0.03, f, 20, 5)).toBeLessThan(0);
    expect(cocPixels(0.03, f, 20, 500)).toBeGreaterThan(0);
  });

  it('is the thin lens: aperture times focal length in pixels times the difference of the reciprocals', () => {
    const f = focalPixels(45, 2160);
    expect(f).toBeCloseTo(1080 / Math.tan(Math.PI / 8), 9);
    expect(cocPixels(0.02, f, 6, 1.5)).toBeCloseTo(0.02 * f * (1 / 6 - 1 / 1.5), 12);
    expect(cocPixels(0.02, f, 6, Infinity)).toBeCloseTo((0.02 * f) / 6, 12);
  });

  it('scales with the format, so two formats of one frame look the same', () => {
    for (const z of [1, 5, 60, 3000]) {
      const uhd = cocPixels(0.04, focalPixels(18, 2160), 70, z);
      const hd = cocPixels(0.04, focalPixels(18, 1080), 70, z);
      expect(uhd / 2160).toBeCloseTo(hd / 1080, 12);
    }
  });

  it('grows with the aperture and is nothing with the lens closed', () => {
    const f = focalPixels(40, 1080);
    expect(Math.abs(cocPixels(0, f, 20, 3))).toBe(0);
    expect(Math.abs(cocPixels(0.06, f, 20, 3))).toBeCloseTo(2 * Math.abs(cocPixels(0.03, f, 20, 3)), 12);
  });

  it('is clamped at a fixed part of the frame height, at least 2.5 percent of it', () => {
    expect(MAX_COC_FRACTION).toBeGreaterThanOrEqual(0.025);
    expect(maxCoc(2160)).toBeCloseTo(60, 9);
    expect(maxCoc(1080)).toBeCloseTo(30, 9);
    expect(clampCoc(500, 2160)).toBe(maxCoc(2160));
    expect(clampCoc(-500, 2160)).toBe(-maxCoc(2160));
    expect(clampCoc(-12.5, 2160)).toBe(-12.5);
  });
});

describe('the share of the lens points and of the blur', () => {
  it('leaves everything to the blur with one sample', () => {
    expect(lensSpread(1)).toBe(0);
    expect(blurShare(1)).toBe(1);
    expect(lensPoints(1)).toEqual([[0, 0]]);
  });

  it('keeps the second moment of the full disc at every sample count', () => {
    for (const n of COUNTS) {
      const points = lensPoints(n);
      expect(points.length).toBe(n);
      const meanSquare = points.reduce((a, [x, y]) => a + x * x + y * y, 0) / n;
      const share = blurShare(n);
      expect(meanSquare + (share * share) / 2, `count ${n}`).toBeCloseTo(0.5, 12);
      expect(share).toBeGreaterThan(0.7);
      expect(share).toBeLessThanOrEqual(1);
    }
  });

  it('centres the lens points and keeps them inside the lens, close enough that the blur joins the copies', () => {
    for (const n of COUNTS) {
      const points = lensPoints(n);
      expect(Math.abs(points.reduce((a, p) => a + p[0], 0)), `count ${n}`).toBeLessThan(1e-12);
      expect(Math.abs(points.reduce((a, p) => a + p[1], 0)), `count ${n}`).toBeLessThan(1e-12);
      for (const [x, y] of points) {
        expect(Math.hypot(x, y)).toBeLessThanOrEqual(1);
        expect(Math.hypot(x, y)).toBeCloseTo(lensSpread(n), 12);
        expect(Math.hypot(x, y)).toBeLessThan(blurShare(n));
      }
    }
  });

  it('is the same for every frame', () => {
    expect(lensPoints(4)).toEqual(lensPoints(4));
    expect(lensPoints(2)[0]).toEqual([0.2, 0]);
  });
});

describe('the taps of the blur', () => {
  const [fine, middle, wide] = blurTaps();
  const all: [number, number][] = [];
  for (const a of fine) for (const b of middle) for (const c of wide) all.push([a[0] + b[0] + c[0], a[1] + b[1] + c[1]]);

  it('has 7, 7 and 31 taps, each pass starting at its own texel', () => {
    expect([fine.length, middle.length, wide.length]).toEqual([7, 7, 31]);
    for (const pass of [fine, middle, wide]) expect(Math.hypot(...(pass[0] as [number, number]))).toBe(0);
    expect(BLUR_SPACING[2]).toBe(WIDE_SPACING);
    expect(BLUR_SPACING[0]).toBeLessThan(BLUR_SPACING[1]);
  });

  it('lays 1519 points on one even lattice, none twice', () => {
    expect(all.length).toBe(1519);
    const cell = BLUR_SPACING[0];
    let nearest = Infinity;
    const seen = new Set<string>();
    for (const [x, y] of all) seen.add(`${Math.round((x / cell) * 4)},${Math.round((y / cell) * 4)}`);
    expect(seen.size).toBe(all.length);
    for (let i = 1; i < all.length; i++) nearest = Math.min(nearest, Math.hypot((all[i] as [number, number])[0] - (all[0] as [number, number])[0], (all[i] as [number, number])[1] - (all[0] as [number, number])[1]));
    expect(nearest).toBeCloseTo(cell, 6);
  });

  it('fills a figure near the disc of radius 1: its second moment within 4 percent, no point far outside', () => {
    const meanSquare = all.reduce((a, [x, y]) => a + x * x + y * y, 0) / all.length;
    expect(Math.sqrt(meanSquare / 0.5)).toBeGreaterThan(0.96);
    expect(Math.sqrt(meanSquare / 0.5)).toBeLessThan(1.04);
    for (const [x, y] of all) expect(Math.hypot(x, y)).toBeLessThan(1.15);
    const mx = all.reduce((a, p) => a + p[0], 0) / all.length;
    const my = all.reduce((a, p) => a + p[1], 0) / all.length;
    expect(Math.hypot(mx, my)).toBeLessThan(1e-9);
  });
});
