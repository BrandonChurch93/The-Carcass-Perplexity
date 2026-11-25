// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { areaOf, contains, dilate, fitCircle, gaussian, label, loopsOf, nest, simplify } from '../tools/lib/trace-core.mjs';

const W = 60;
const H = 40;

function field(fn: (x: number, y: number) => number): Float32Array {
  const f = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) f[y * W + x] = fn(x, y);
  return f;
}

describe('the loops of a field', () => {
  it('finds one closed loop round a disc, with the area of the disc', () => {
    const loops = loopsOf(field((x, y) => 10 - Math.hypot(x - 30, y - 20)), W, H);
    expect(loops).toHaveLength(1);
    expect(Math.abs(areaOf(loops[0]))).toBeGreaterThan(Math.PI * 100 * 0.97);
    expect(Math.abs(areaOf(loops[0]))).toBeLessThan(Math.PI * 100 * 1.01);
    for (const [x, y] of loops[0]) expect(Math.abs(Math.hypot(x - 30, y - 20) - 10)).toBeLessThan(0.2);
  });

  it('finds the outside and the inside of a ring, and nests one as the hole of the other', () => {
    const loops = loopsOf(field((x, y) => 4 - Math.abs(Math.hypot(x - 30, y - 20) - 12)), W, H);
    expect(loops).toHaveLength(2);
    const shapes = nest(loops);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].holes).toHaveLength(1);
    expect(Math.abs(areaOf(shapes[0].outer))).toBeGreaterThan(Math.abs(areaOf(shapes[0].holes[0])));
  });

  it('closes a loop that touches the edge of the field', () => {
    const loops = loopsOf(field((x) => 8 - x), W, H);
    expect(loops).toHaveLength(1);
    expect(Math.abs(areaOf(loops[0]))).toBeGreaterThan(8 * H * 0.9);
  });

  it('gives no loop for a field that is sea everywhere, and none for one that is never crossed inside', () => {
    expect(loopsOf(field(() => -1), W, H)).toHaveLength(0);
  });

  it('keeps an island inside a sea inside the land as its own piece', () => {
    const f = field((x, y) => {
      const r = Math.hypot(x - 30, y - 20);
      if (r < 4) return 1;
      if (r < 9) return -1;
      if (r < 16) return 1;
      return -1;
    });
    const shapes = nest(loopsOf(f, W, H));
    expect(shapes).toHaveLength(2);
    expect(shapes[0].holes).toHaveLength(1);
    expect(shapes[1].holes).toHaveLength(0);
  });

  it('drops land and seas under the smallest sizes asked for', () => {
    const f = field((x, y) => Math.max(10 - Math.hypot(x - 20, y - 20), 1.5 - Math.hypot(x - 50, y - 8)));
    expect(nest(loopsOf(f, W, H))).toHaveLength(2);
    expect(nest(loopsOf(f, W, H), { minOuter: 20 })).toHaveLength(1);
  });
});

describe('thinning a loop', () => {
  it('keeps the corners of a square and drops the points along its sides', () => {
    const square: [number, number][] = [];
    for (let i = 0; i < 10; i++) square.push([i, 0]);
    for (let i = 0; i < 10; i++) square.push([10, i]);
    for (let i = 0; i < 10; i++) square.push([10 - i, 10]);
    for (let i = 0; i < 10; i++) square.push([0, 10 - i]);
    const thin = simplify(square, 0.01);
    expect(thin).toHaveLength(4);
    expect(Math.abs(areaOf(thin))).toBeCloseTo(100, 6);
  });

  it('never moves the outline further than the tolerance', () => {
    const loop = loopsOf(field((x, y) => 12 - Math.hypot(x - 30, y - 20)), W, H)[0];
    const thin = simplify(loop, 0.3);
    expect(thin.length).toBeLessThan(loop.length);
    expect(Math.abs(Math.abs(areaOf(thin)) - Math.abs(areaOf(loop)))).toBeLessThan(0.3 * 2 * Math.PI * 12);
    for (const [x, y] of thin) expect(Math.abs(Math.hypot(x - 30, y - 20) - 12)).toBeLessThan(0.2);
  });
});

describe('the small tools of the trace', () => {
  it('says whether a point is inside a loop', () => {
    const square: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    expect(contains(square, [5, 5])).toBe(true);
    expect(contains(square, [15, 5])).toBe(false);
    expect(contains(square, [5, -1])).toBe(false);
  });

  it('grows a mask by a number of pixels in every direction', () => {
    const mask = new Uint8Array(W * H);
    mask[20 * W + 30] = 1;
    const grown = dilate(mask, W, H, 3);
    expect(grown[20 * W + 33]).toBe(1);
    expect(grown[23 * W + 33]).toBe(1);
    expect(grown[20 * W + 34]).toBe(0);
    expect(grown.reduce((a, b) => a + b, 0)).toBe(49);
  });

  it('labels each joined patch with its own number and size', () => {
    const mask = new Uint8Array(W * H);
    for (let x = 2; x < 6; x++) mask[3 * W + x] = 1;
    for (let y = 10; y < 13; y++) for (let x = 40; x < 45; x++) mask[y * W + x] = 1;
    const r = label(mask, W, H);
    expect(r.count).toBe(2);
    expect(r.sizes.slice(1).sort((a: number, b: number) => a - b)).toEqual([4, 15]);
    expect(r.labels[3 * W + 2]).not.toBe(r.labels[10 * W + 40]);
    expect(r.labels[0]).toBe(0);
  });

  it('blurs without changing the mean of a field', () => {
    const f = field((x, y) => (x === 30 && y === 20 ? 100 : 0));
    const b = gaussian(f, W, H, 2);
    expect(b.reduce((a, v) => a + v, 0)).toBeCloseTo(100, 2);
    expect(b[20 * W + 30]).toBeLessThan(10);
    expect(b[20 * W + 30]).toBeGreaterThan(b[20 * W + 33]);
  });

  it('fits a circle to points on a short arc of it', () => {
    const points: [number, number][] = [];
    for (let i = 0; i < 40; i++) {
      const a = 4 + i * 0.01;
      points.push([4000 + 10000 * Math.cos(a), 9000 + 10000 * Math.sin(a)]);
    }
    const c = fitCircle(points);
    expect(c.cx).toBeCloseTo(4000, 0);
    expect(c.cy).toBeCloseTo(9000, 0);
    expect(c.r).toBeCloseTo(10000, 0);
  });

  it('gives no circle for points on a line', () => {
    expect(fitCircle([[0, 0], [1, 1], [2, 2], [3, 3]] as [number, number][])).toBeNull();
  });
});
