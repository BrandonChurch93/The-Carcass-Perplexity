import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { validate, checked, config, FPS, formats, formatById, samplesOf } from '../src/config';
import type { Config } from '../src/config';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const real = (): Config => JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'showcase.json'), 'utf8')) as Config;

type Bag = Record<string, unknown>;
const isBag = (v: unknown): v is Bag => v instanceof Object && Array.isArray(v) === false;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(path.relative(ROOT, p).split(path.sep).join('/'));
  }
  return out;
}
const approved = walk(path.join(ROOT, 'references', 'approved'));

function parentOf(input: unknown, keyPath: string): [Bag, string] {
  const parts = keyPath.split('.');
  let cur: unknown = input;
  for (const part of parts.slice(0, -1)) {
    if (isBag(cur) === false) throw new Error(`no such path in the config: ${keyPath}`);
    cur = (cur as Bag)[part];
  }
  const last = parts.at(-1);
  if (isBag(cur) === false || last === undefined || (last in (cur as Bag)) === false) throw new Error(`no such path in the config: ${keyPath}`);
  return [cur as Bag, last];
}

function without(keyPath: string): Config {
  const c = real();
  const [parent, last] = parentOf(c, keyPath);
  delete parent[last];
  return c;
}

function broken(change: (c: Config) => void): Config {
  const c = real();
  change(c);
  return c;
}

function pathsOf(node: unknown, prefix: string, open: readonly string[]): string[] {
  if (isBag(node) === false) return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(node as Bag)) {
    const p = prefix ? `${prefix}.${k}` : k;
    out.push(p);
    if (open.includes(p) === false) out.push(...pathsOf(v, p, open));
  }
  return out;
}

function isLoud(input: unknown, files?: readonly string[]): boolean {
  let threw = false;
  try {
    checked(input, files);
  } catch {
    threw = true;
  }
  return threw && validate(input, files).length > 0;
}

function expectLoud(input: unknown, about: RegExp, files?: readonly string[]): void {
  const problems = validate(input, files);
  expect(problems.length).toBeGreaterThan(0);
  expect(problems.some((p) => about.test(p))).toBe(true);
  expect(() => checked(input, files)).toThrow(about);
}

const first = <T>(list: readonly T[]): T => {
  const v = list[0];
  if (v === undefined) throw new Error('the config holds an empty list where this test needs an entry');
  return v;
};
const firstKeyOf = (o: object): string => first(Object.keys(o));

describe('the real config', () => {
  it('validates with no problem', () => {
    expect(validate(real())).toEqual([]);
    expect(() => checked(real())).not.toThrow();
  });

  it('validates against the real files under references/approved', () => {
    expect(approved.length).toBeGreaterThan(0);
    expect(validate(real(), approved)).toEqual([]);
    expect(() => checked(real(), approved)).not.toThrow();
  });

  it('has every approved picture on disk', () => {
    for (const k of real().keys) expect(fs.existsSync(path.join(ROOT, k.image)), k.image).toBe(true);
  });

  it('is what the module exports', () => {
    expect(config).toEqual(real());
    expect(FPS).toBe(real().film.fps);
  });

  it('is returned by checked as the same object', () => {
    const c = real();
    expect(checked(c)).toBe(c);
  });
});

describe('a missing key', () => {
  it('fails for every top-level key', () => {
    const quiet = Object.keys(real()).filter((k) => isLoud(without(k)) === false);
    expect(quiet).toEqual([]);
  });

  it('fails for the keys the other checks read', () => {
    const named = [
      'seed', 'film.fps', 'film.previewFps', 'film.order', 'film.targetSeconds', 'film.minSeconds', 'film.maxSeconds',
      'budget.runHours', 'budget.phaseHours', 'units', 'keys', 'settled', 'narration.clips',
      'formats.master', 'formats.hd.width', 'formats.preview.height', 'tiers.final.samplesPerFrame',
      'deliver.cardLoop', 'deliver.cardLoop.seconds', 'deliver.cardLoop.minSeconds', 'deliver.cardLoop.maxSeconds', 'deliver.cardLoop.unit',
    ];
    for (const p of named) expectLoud(without(p), new RegExp(`missing key: ${p.replaceAll('.', '\\.')}`));
  });

  it('names the missing key and nothing else', () => {
    expect(validate(without('film.fps'))).toEqual(['missing key: film.fps']);
  });

  it('fails for a key of the wrong type', () => {
    expectLoud(broken((c) => { (c.film as Bag).fps = String(c.film.fps); }), /wrong type: film\.fps/);
    expectLoud(broken((c) => { (c as Bag).units = {}; }), /wrong type: units/);
    expectLoud(broken((c) => { (c.budget as Bag).phaseHours = Object.values(c.budget.phaseHours); }), /wrong type: budget\.phaseHours/);
  });

  it('fails for an input that is not a config at all', () => {
    for (const input of [null, undefined, {}, [], 'showcase']) expect(isLoud(input), String(input)).toBe(true);
  });

  it('fails for every nested key with a fixed name', () => {
    const open = ['settled', 'motion.byUnit', 'budget.phaseHours', 'budget.reserveHours'];
    const quiet = pathsOf(real(), '', open).filter((p) => isLoud(without(p)) === false);
    expect(quiet).toEqual([]);
  });

  it('fails for a key picture with no id', () => {
    const c = broken((k) => { delete (first(k.keys) as Bag).id; });
    expect(isLoud(c)).toBe(true);
  });

  it('fails for a unit with no id', () => {
    const c = real();
    const used = new Set<string>([...c.keys.map((k) => k.unit), ...c.narration.clips.map((n) => n.unit), ...c.film.order, c.lookLockUnit, c.deliver.cardLoop.unit, ...c.buildOrderAfterLookLock, ...Object.keys(c.motion.byUnit)]);
    const spare = c.units.find((u) => used.has(u.id) === false);
    if (spare === undefined) throw new Error('every unit is named somewhere, so this test has nothing to remove');
    delete (spare as Bag).id;
    expect(isLoud(c)).toBe(true);
  });
});

describe('the budget', () => {
  it('fails when the run is longer than its phases', () => {
    expectLoud(broken((c) => { c.budget.runHours += 1; }), /budget\.phaseHours/);
  });

  it('fails when a phase grows and the run does not', () => {
    expectLoud(broken((c) => {
      const boxes = c.budget.phaseHours as Record<string, number>;
      const k = firstKeyOf(boxes);
      boxes[k] = (boxes[k] ?? 0) + 1;
    }), /budget\.phaseHours/);
  });

  it('fails when a phase is dropped', () => {
    expectLoud(without(`budget.phaseHours.${firstKeyOf(real().budget.phaseHours)}`), /budget\.phaseHours/);
  });

  it('adds up in the real config', () => {
    const b = real().budget;
    expect(Object.values(b.phaseHours).reduce((a, n) => a + n, 0)).toBeCloseTo(b.runHours);
  });
});

describe('the frame rates', () => {
  it('fails when film.fps is not a whole multiple of film.previewFps', () => {
    expectLoud(broken((c) => { c.film.previewFps = c.film.fps + 1; }), /film\.fps is not a whole multiple of film\.previewFps/);
    expectLoud(broken((c) => { c.film.previewFps = c.film.fps * 2; }), /film\.fps is not a whole multiple of film\.previewFps/);
  });

  it('fails when film.previewFps is zero', () => {
    expectLoud(broken((c) => { c.film.previewFps = 0; }), /film\.fps is not a whole multiple of film\.previewFps/);
  });

  it('passes when the two rates are equal', () => {
    expect(validate(broken((c) => { c.film.previewFps = c.film.fps; }))).toEqual([]);
  });
});

describe('film.order', () => {
  const about = /film\.order is not the six places followed by reveal/;

  it('fails when reveal is not last', () => {
    expectLoud(broken((c) => { c.film.order = [...c.film.order].reverse(); }), about);
  });

  it('fails when a place is left out', () => {
    expectLoud(broken((c) => { c.film.order = c.film.order.slice(1); }), about);
  });

  it('fails when a place is listed twice', () => {
    expectLoud(broken((c) => { c.film.order = [first(c.film.order), ...c.film.order.slice(0, -2), 'reveal']; }), about);
  });

  it('fails when a seventh place is added', () => {
    expectLoud(broken((c) => { c.film.order = [first(c.film.order), ...c.film.order]; }), about);
  });

  it('fails when the last entry is some other unit', () => {
    expectLoud(broken((c) => { c.film.order = [...c.film.order.slice(0, -1), 'film']; }), about);
  });

  it('fails when the list is empty', () => {
    expectLoud(broken((c) => { c.film.order = []; }), about);
  });
});

describe('names that must exist', () => {
  const NO_UNIT = 'no-such-unit';
  const NO_KEY = 'no-such-key';

  it('fails when a key names a unit that does not exist', () => {
    expectLoud(broken((c) => { first(c.keys).unit = NO_UNIT; }), /unit that does not exist: no-such-unit/);
  });

  it('fails when a narration clip names a unit that does not exist', () => {
    expectLoud(broken((c) => { first(c.narration.clips).unit = NO_UNIT; }), /narration clip .* unit that does not exist: no-such-unit/);
  });

  it('fails when a settled line names a key that does not exist', () => {
    expectLoud(broken((c) => { (c.settled as Record<string, string[]>)[NO_KEY] = ['A line for a picture that is not there.']; }), /key that does not exist: no-such-key/);
  });

  it('fails when a settled line is left behind by a key that was removed', () => {
    const id = firstKeyOf(real().settled);
    expectLoud(broken((c) => { c.keys = c.keys.filter((k) => (k.id === id) === false); }), new RegExp(`key that does not exist: ${id}`));
  });

  it('fails when a unit is removed and something still names it', () => {
    const id = first(real().keys).unit;
    expectLoud(broken((c) => { c.units = c.units.filter((u) => (u.id === id) === false); }), new RegExp(`unit that does not exist: ${id}`));
  });

  it('fails when the look lock, the card loop, the build order or the motion table names a unit that does not exist', () => {
    const about = /unit that does not exist/;
    expectLoud(broken((c) => { c.lookLockUnit = NO_UNIT; }), about);
    expectLoud(broken((c) => { c.deliver.cardLoop.unit = NO_UNIT; }), about);
    expectLoud(broken((c) => { c.buildOrderAfterLookLock = [...c.buildOrderAfterLookLock, NO_UNIT]; }), about);
    expectLoud(broken((c) => { (c.motion.byUnit as Record<string, number>)[NO_UNIT] = c.motion.minMovingAreaShare; }), about);
  });

  it('fails when a key is listed twice', () => {
    expectLoud(broken((c) => { c.keys = [...c.keys, first(c.keys)]; }), /listed twice/);
  });
});

describe('the approved pictures', () => {
  it('fails when one approved picture is missing', () => {
    const gone = first(real().keys).image;
    const files = approved.filter((f) => (f === gone) === false);
    expect(files.length).toBe(approved.length - 1);
    expectLoud(real(), /approved picture is missing/, files);
    expect(validate(real(), files)).toEqual([`approved picture is missing: ${gone}`]);
  });

  it('fails for every picture when the folder is empty', () => {
    const c = real();
    expect(validate(c, []).length).toBe(c.keys.length);
    expect(() => checked(c, [])).toThrow(/approved picture is missing/);
  });

  it('fails when a key points at a picture that is not there', () => {
    expectLoud(broken((c) => { first(c.keys).image = 'references/approved/no-such-picture.jpg'; }), /approved picture is missing/, approved);
  });

  it('fails when the path is right but the case is wrong', () => {
    expectLoud(broken((c) => { const k = first(c.keys); k.image = k.image.toUpperCase(); }), /approved picture is missing/, approved);
  });

  it('does not look at pictures when no list is given', () => {
    expect(validate(broken((c) => { first(c.keys).image = 'references/approved/no-such-picture.jpg'; }))).toEqual([]);
  });
});

describe('the length of the film', () => {
  const about = /film\.targetSeconds lies outside film\.minSeconds and film\.maxSeconds/;

  it('fails when film.targetSeconds is below film.minSeconds', () => {
    expectLoud(broken((c) => { c.film.targetSeconds = c.film.minSeconds - 1; }), about);
  });

  it('fails when film.targetSeconds is above film.maxSeconds', () => {
    expectLoud(broken((c) => { c.film.targetSeconds = c.film.maxSeconds + 1; }), about);
  });

  it('passes at both limits', () => {
    expect(validate(broken((c) => { c.film.targetSeconds = c.film.minSeconds; }))).toEqual([]);
    expect(validate(broken((c) => { c.film.targetSeconds = c.film.maxSeconds; }))).toEqual([]);
  });
});

describe('the length of the card loop', () => {
  const about = /deliver\.cardLoop\.seconds lies outside/;

  it('fails when deliver.cardLoop.seconds is below deliver.cardLoop.minSeconds', () => {
    expectLoud(broken((c) => { c.deliver.cardLoop.seconds = c.deliver.cardLoop.minSeconds - 1; }), about);
  });

  it('fails when deliver.cardLoop.seconds is above deliver.cardLoop.maxSeconds', () => {
    expectLoud(broken((c) => { c.deliver.cardLoop.seconds = c.deliver.cardLoop.maxSeconds + 1; }), about);
  });

  it('passes at both limits', () => {
    expect(validate(broken((c) => { c.deliver.cardLoop.seconds = c.deliver.cardLoop.minSeconds; }))).toEqual([]);
    expect(validate(broken((c) => { c.deliver.cardLoop.seconds = c.deliver.cardLoop.maxSeconds; }))).toEqual([]);
  });
});

describe('several faults at once', () => {
  it('reports each of them', () => {
    const changes: ((k: Config) => void)[] = [
      (k) => { k.budget.runHours += 1; },
      (k) => { k.film.targetSeconds = k.film.maxSeconds + 1; },
      (k) => { k.deliver.cardLoop.seconds = k.deliver.cardLoop.minSeconds - 1; },
    ];
    const c = broken((k) => { for (const change of changes) change(k); });
    expect(validate(c).length).toBe(changes.length);
    expect(() => checked(c)).toThrow(/budget\.phaseHours[\s\S]*film\.targetSeconds[\s\S]*deliver\.cardLoop\.seconds/);
  });
});

describe('formatById', () => {
  it('returns the formats of the config', () => {
    const f = real().formats;
    for (const want of [f.master, f.hd, f.preview]) expect(formatById(want.id)).toEqual(want);
    expect(formats.uhd).toEqual(f.master);
    expect(formats.hd).toEqual(f.hd);
    expect(formats.preview).toEqual(f.preview);
  });

  it('holds one format for every id and no other', () => {
    const f = real().formats;
    expect(Object.keys(formats).sort()).toEqual([f.master.id, f.hd.id, f.preview.id].sort());
  });

  it('throws on an unknown id', () => {
    for (const id of ['no-such-format', '', 'master', 'UHD']) expect(() => formatById(id), id).toThrow(/no such format/);
  });

  it('throws on an id that is only a name every object has', () => {
    expect(() => formatById('constructor')).toThrow();
  });
});

describe('samplesOf', () => {
  it('returns the sample counts of the config', () => {
    const tiers = Object.entries(real().tiers);
    expect(tiers.length).toBeGreaterThan(0);
    for (const [name, tier] of tiers) expect(samplesOf(name)).toBe(tier.samplesPerFrame);
  });

  it('throws on an unknown tier', () => {
    for (const id of ['no-such-tier', '', 'FINAL']) expect(() => samplesOf(id), id).toThrow(/no such tier/);
  });

  it('throws on a tier that is only a name every object has', () => {
    expect(() => samplesOf('constructor')).toThrow();
  });
});
