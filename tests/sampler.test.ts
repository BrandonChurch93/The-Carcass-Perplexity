import { describe, it, expect } from 'vitest';
import { frameSamples } from '../src/core/sampler';
import type { Sample } from '../src/core/sampler';
import { hashString } from '../src/core/rng';
import { config } from '../src/config';

const COUNTS = [2, 4, 16, 64];
const SEQS = [0, 1, 2, 59, 60, 1234, 11699];
const SEEDS = [undefined, 1, 987654321];

const each = (count: number, check: (samples: Sample[], label: string) => void): void => {
  for (const seq of SEQS) for (const seed of SEEDS) check(frameSamples(seq, count, seed), `count ${count}, seq ${seq}, seed ${seed}`);
};

describe('determinism', () => {
  it('the same arguments give the same samples', () => {
    for (const count of [1, ...COUNTS]) {
      expect(frameSamples(7, count)).toEqual(frameSamples(7, count));
      expect(frameSamples(7, count, 5)).toEqual(frameSamples(7, count, 5));
    }
  });

  it('a call with no seed uses the sampler stream of the config seed', () => {
    for (const count of COUNTS) expect(frameSamples(7, count)).toEqual(frameSamples(7, count, hashString('sampler', config.seed)));
  });

  it('a different seq gives different samples', () => {
    for (const count of COUNTS) {
      expect(frameSamples(0, count)).not.toEqual(frameSamples(1, count));
      expect(frameSamples(0, count, 5)).not.toEqual(frameSamples(1, count, 5));
    }
  });

  it('every seq of a run of frames gives its own samples', () => {
    for (const count of COUNTS) {
      const seen = new Set<string>();
      const frames = 300;
      for (let seq = 0; seq < frames; seq++) seen.add(JSON.stringify(frameSamples(seq, count)));
      expect(seen.size).toBe(frames);
    }
  });

  it('a different seed gives different samples', () => {
    for (const count of COUNTS) expect(frameSamples(0, count, 5)).not.toEqual(frameSamples(0, count, 6));
  });
});

describe('the count', () => {
  it('returns one sample for each of the count', () => {
    for (const count of [1, ...COUNTS, 256]) expect(frameSamples(3, count).length).toBe(count);
  });

  it('count 1 gives the pixel centre, the lens centre and shutter 0.5', () => {
    for (const seq of SEQS) for (const seed of SEEDS) expect(frameSamples(seq, 1, seed)).toEqual([{ px: 0, py: 0, lensX: 0, lensY: 0, shutter: 0.5 }]);
  });

  it('a count that is not a power of two throws', () => {
    for (const count of [0, 3, 5, 6, 7, 12, 63, 65, 100, -1, -2, -4]) expect(() => frameSamples(0, count), `count ${count}`).toThrow(/power of two/);
  });

  it('a count that is not a whole number throws', () => {
    for (const count of [1.5, 2.5, Number.NaN]) expect(() => frameSamples(0, count), `count ${count}`).toThrow();
  });
});

describe.each(COUNTS)('coverage with %i samples', (count) => {
  it('px and py lie in [-0.5, 0.5)', () => {
    each(count, (samples, label) => {
      for (const s of samples) {
        expect(s.px, label).toBeGreaterThanOrEqual(-0.5);
        expect(s.px, label).toBeLessThan(0.5);
        expect(s.py, label).toBeGreaterThanOrEqual(-0.5);
        expect(s.py, label).toBeLessThan(0.5);
      }
    });
  });

  it('lens points lie inside the unit disk', () => {
    each(count, (samples, label) => {
      for (const s of samples) expect(Math.hypot(s.lensX, s.lensY), label).toBeLessThanOrEqual(1 + 1e-12);
    });
  });

  it('shutter lies in [0, 1)', () => {
    each(count, (samples, label) => {
      for (const s of samples) {
        expect(s.shutter, label).toBeGreaterThanOrEqual(0);
        expect(s.shutter, label).toBeLessThan(1);
      }
    });
  });

  it('every one of the equal shutter slots holds exactly one sample', () => {
    each(count, (samples, label) => {
      const slots = new Array<number>(count).fill(0);
      for (const s of samples) {
        const slot = Math.floor(s.shutter * count);
        slots[slot] = (slots[slot] ?? 0) + 1;
      }
      expect(slots, label).toEqual(new Array<number>(count).fill(1));
    });
  });

  it('each half of the pixel in x and in y holds half of the samples', () => {
    each(count, (samples, label) => {
      expect(samples.filter((s) => s.px < 0).length, label).toBe(count / 2);
      expect(samples.filter((s) => s.px >= 0).length, label).toBe(count / 2);
      expect(samples.filter((s) => s.py < 0).length, label).toBe(count / 2);
      expect(samples.filter((s) => s.py >= 0).length, label).toBe(count / 2);
    });
  });

  it('no two samples share a pixel point, a lens point or a shutter time', () => {
    each(count, (samples, label) => {
      expect(new Set(samples.map((s) => `${s.px},${s.py}`)).size, label).toBe(count);
      expect(new Set(samples.map((s) => `${s.lensX},${s.lensY}`)).size, label).toBe(count);
      expect(new Set(samples.map((s) => s.shutter)).size, label).toBe(count);
    });
  });
});

describe.each(COUNTS.filter((n) => n >= 16))('the lens with %i samples', (count) => {
  it('the lens points fall in all four quadrants', () => {
    each(count, (samples, label) => {
      const quadrants = new Set(samples.map((s) => `${s.lensX >= 0 ? 'right' : 'left'} ${s.lensY >= 0 ? 'top' : 'bottom'}`));
      expect(quadrants.size, label).toBe(4);
    });
  });

  it('the lens points reach both the middle and the rim of the disk', () => {
    each(count, (samples, label) => {
      const radii = samples.map((s) => Math.hypot(s.lensX, s.lensY));
      expect(Math.min(...radii), label).toBeLessThan(0.5);
      expect(Math.max(...radii), label).toBeGreaterThan(0.5);
    });
  });
});

describe.each(COUNTS.filter((n) => n >= 4))('the quarters of the pixel with %i samples', (count) => {
  it('the four quarters of the pixel hold a quarter of the samples each', () => {
    each(count, (samples, label) => {
      for (const left of [true, false]) for (const low of [true, false]) {
        expect(samples.filter((s) => (s.px < 0) === left && (s.py < 0) === low).length, label).toBe(count / 4);
      }
    });
  });
});

describe('the shutter over a run of frames', () => {
  it('does not open at the same instant in every frame', () => {
    for (const count of COUNTS) {
      const firsts = new Set<number>();
      for (let seq = 0; seq < 100; seq++) firsts.add(Math.min(...frameSamples(seq, count).map((s) => s.shutter)));
      expect(firsts.size).toBeGreaterThan(90);
    }
  });
});
