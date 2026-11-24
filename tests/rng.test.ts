import { describe, it, expect } from 'vitest';
import { hashString, mix32, hash2, Rng, stream } from '../src/core/rng';
import { config } from '../src/config';

const U32 = 4294967296;
const isU32 = (n: number): boolean => Number.isInteger(n) && n >= 0 && n < U32;
const take = (r: Rng, n: number): number[] => Array.from({ length: n }, () => r.u32());
const MANY = 20000;

describe('hashes', () => {
  it('hashString gives the same value for the same text and seed', () => {
    expect(hashString('ribs', 7)).toBe(hashString('ribs', 7));
    expect(hashString('ribs')).toBe(hashString('ribs', 0));
  });

  it('hashString changes with the text and with the seed', () => {
    expect(hashString('ribs', 7)).not.toBe(hashString('heart', 7));
    expect(hashString('ribs', 7)).not.toBe(hashString('ribs', 8));
    expect(hashString('ab', 7)).not.toBe(hashString('ba', 7));
    expect(hashString('', 7)).not.toBe(hashString('', 8));
  });

  it('hashString, mix32 and hash2 return whole numbers of 32 bits', () => {
    for (const text of ['', 'a', 'ribs', 'a long name with spaces, and marks']) expect(isU32(hashString(text, 3))).toBe(true);
    for (const n of [0, 1, -1, 12345, U32 - 1, U32 + 5]) {
      expect(isU32(mix32(n))).toBe(true);
      expect(isU32(hash2(n, n + 1))).toBe(true);
    }
  });

  it('mix32 is the same for the same input and has no clashes over a run of inputs', () => {
    expect(mix32(99)).toBe(mix32(99));
    const seen = new Set<number>();
    for (let i = 0; i < MANY; i++) seen.add(mix32(i));
    expect(seen.size).toBe(MANY);
  });

  it('hash2 is the same for the same pair, and the order of the pair matters', () => {
    expect(hash2(3, 4)).toBe(hash2(3, 4));
    expect(hash2(3, 4)).not.toBe(hash2(4, 3));
    expect(hash2(3, 4)).not.toBe(hash2(3, 5));
    expect(hash2(3, 4)).not.toBe(hash2(2, 4));
  });

  it('hash2 has no clashes over a grid of pairs', () => {
    const seen = new Set<number>();
    const side = 100;
    for (let a = 0; a < side; a++) for (let b = 0; b < side; b++) seen.add(hash2(a, b));
    expect(seen.size).toBe(side * side);
  });
});

describe('same seed, same stream, same values', () => {
  it('two streams with one name and one seed give the same values', () => {
    expect(take(stream('test', 1), 64)).toEqual(take(stream('test', 1), 64));
  });

  it('two generators with one seed give the same values from every method', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 50; i++) {
      expect(a.next()).toBe(b.next());
      expect(a.range(-3, 9)).toBe(b.range(-3, 9));
      expect(a.int(17)).toBe(b.int(17));
      expect(a.normal()).toBe(b.normal());
      expect(a.pick(['x', 'y', 'z'])).toBe(b.pick(['x', 'y', 'z']));
    }
  });

  it('a stream is the generator seeded with the hash of its name', () => {
    expect(take(stream('test', 1), 8)).toEqual(take(new Rng(hashString('test', 1)), 8));
  });

  it('a stream with no seed uses the seed of the config', () => {
    expect(take(stream('test'), 8)).toEqual(take(stream('test', config.seed), 8));
  });

  it('pins the first three values of the stream named test with seed 1', () => {
    expect(take(stream('test', 1), 3)).toEqual([65021748, 1589014358, 4013709493]);
  });
});

describe('different streams', () => {
  it('different names give different values', () => {
    const a = take(stream('test', 1), 16);
    const b = take(stream('other', 1), 16);
    expect(a).not.toEqual(b);
    expect(a.filter((v, i) => v === b[i]).length).toBe(0);
  });

  it('different seeds give different values', () => {
    const a = take(stream('test', 1), 16);
    const b = take(stream('test', 2), 16);
    expect(a).not.toEqual(b);
    expect(a.filter((v, i) => v === b[i]).length).toBe(0);
  });

  it('many names give many first values', () => {
    const seen = new Set<number>();
    const names = 2000;
    for (let i = 0; i < names; i++) seen.add(stream(`unit-${i}`, 1).u32());
    expect(seen.size).toBe(names);
  });

  it('a stream does not repeat itself early', () => {
    expect(new Set(take(stream('test', 1), MANY)).size).toBeGreaterThan(MANY - 3);
  });
});

describe('ranges', () => {
  it('u32 returns whole numbers of 32 bits', () => {
    expect(take(stream('u32', 1), MANY).every(isU32)).toBe(true);
  });

  it('next stays in [0, 1)', () => {
    const r = stream('next', 1);
    const values = Array.from({ length: MANY }, () => r.next());
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
  });

  it('int stays in range and reaches every value', () => {
    const r = stream('int', 1);
    for (const n of [1, 2, 7, 64, 1000]) {
      const values = Array.from({ length: MANY }, () => r.int(n));
      expect(values.every((v) => Number.isInteger(v))).toBe(true);
      expect(Math.min(...values)).toBe(0);
      expect(Math.max(...values)).toBe(n - 1);
      expect(new Set(values).size).toBe(n);
    }
  });

  it('range stays between its limits', () => {
    const r = stream('range', 1);
    const values = Array.from({ length: MANY }, () => r.range(-2.5, 4));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(-2.5);
    expect(Math.max(...values)).toBeLessThan(4);
  });

  it('pick returns members of the list and reaches each of them', () => {
    const r = stream('pick', 1);
    const list = ['a', 'b', 'c', 'd', 'e'] as const;
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const v = r.pick(list);
      expect(list).toContain(v);
      seen.add(v);
    }
    expect(seen.size).toBe(list.length);
  });
});

describe('the spread of the values', () => {
  it('the mean of many next values is near 0.5', () => {
    const r = stream('mean', 1);
    let sum = 0;
    for (let i = 0; i < MANY; i++) sum += r.next();
    expect(Math.abs(sum / MANY - 0.5)).toBeLessThan(0.01);
  });

  it('next fills ten equal bins evenly', () => {
    const r = stream('bins', 1);
    const bins = new Array<number>(10).fill(0);
    for (let i = 0; i < MANY; i++) {
      const b = Math.floor(r.next() * bins.length);
      bins[b] = (bins[b] ?? 0) + 1;
    }
    const want = MANY / bins.length;
    for (const n of bins) expect(Math.abs(n - want)).toBeLessThan(want * 0.1);
  });

  it('every bit of u32 is set about half of the time', () => {
    const values = take(stream('bits', 1), MANY);
    for (let bit = 0; bit < 32; bit++) {
      const set = values.filter((v) => ((v >>> bit) & 1) === 1).length;
      expect(Math.abs(set / MANY - 0.5)).toBeLessThan(0.02);
    }
  });

  it('normal has mean near 0 and variance near 1', () => {
    const r = stream('normal', 1);
    const values = Array.from({ length: MANY }, () => r.normal());
    const mean = values.reduce((a, v) => a + v, 0) / MANY;
    const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / MANY;
    expect(values.every((v) => Number.isFinite(v))).toBe(true);
    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(Math.abs(variance - 1)).toBeLessThan(0.05);
  });

  it('normal puts about two thirds of its values within one unit of zero', () => {
    const r = stream('normal-share', 1);
    let inside = 0;
    for (let i = 0; i < MANY; i++) if (Math.abs(r.normal()) < 1) inside++;
    expect(Math.abs(inside / MANY - 0.6827)).toBeLessThan(0.02);
  });
});
