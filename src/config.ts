import raw from '../config/showcase.json';
import shape from './config.shape.json';

export type FormatId = 'uhd' | 'hd' | 'preview';
export type TierId = 'draft' | 'review' | 'final';
export type Config = typeof raw;
export interface Format { id: FormatId; width: number; height: number }

const REQUIRED = shape as Record<string, 'number' | 'string' | 'object' | 'array' | 'boolean' | 'any'>;

const PLACES = ['ribs', 'heart', 'breath', 'marsh', 'spine', 'eye'];

function at(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(part in (cur as Record<string, unknown>))) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function kind(v: unknown): string {
  return Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
}

export function validate(input: unknown, approvedFiles?: readonly string[]): string[] {
  const problems: string[] = [];
  for (const [path, want] of Object.entries(REQUIRED)) {
    const v = at(input, path);
    if (v === undefined) problems.push(`missing key: ${path}`);
    else if (want !== 'any' && kind(v) !== want) problems.push(`wrong type: ${path} is ${kind(v)}, expected ${want}`);
  }
  if (problems.length) return problems;
  const c = input as Config;

  const named = (list: readonly unknown[], where: string, strings: readonly string[], arrays: readonly string[] = []): void => {
    list.forEach((item, i) => {
      if (item === null || typeof item !== 'object') {
        problems.push(`${where}[${i}] is not an object`);
        return;
      }
      const bag = item as Record<string, unknown>;
      for (const k of strings) if (typeof bag[k] !== 'string' || bag[k] === '') problems.push(`missing key: ${where}[${i}].${k}`);
      for (const k of arrays) if (!Array.isArray(bag[k])) problems.push(`missing key: ${where}[${i}].${k}`);
    });
  };
  named(c.units, 'units', ['id']);
  named(c.keys, 'keys', ['id', 'unit', 'image']);
  named(c.narration.clips, 'narration.clips', ['id', 'unit'], ['lines']);
  if (problems.length) return problems;

  const boxes = Object.values(c.budget.phaseHours).reduce((a, b) => a + b, 0);
  if (Math.abs(boxes - c.budget.runHours) > 1e-9) problems.push(`budget.phaseHours adds up to ${boxes}, not budget.runHours ${c.budget.runHours}`);
  if (c.film.fps % c.film.previewFps !== 0) problems.push('film.fps is not a whole multiple of film.previewFps');

  const order = c.film.order;
  const sixPlaces = order.length === 7 && order[6] === 'reveal' && [...order.slice(0, 6)].sort().join() === [...PLACES].sort().join();
  if (!sixPlaces) problems.push('film.order is not the six places followed by reveal');

  const units = new Set(c.units.map((u) => u.id));
  const keyIds = new Set<string>();
  for (const k of c.keys) {
    if (keyIds.has(k.id)) problems.push(`key ${k.id} is listed twice`);
    keyIds.add(k.id);
    if (!units.has(k.unit)) problems.push(`key ${k.id} names a unit that does not exist: ${k.unit}`);
    if (approvedFiles && !approvedFiles.includes(k.image)) problems.push(`approved picture is missing: ${k.image}`);
  }
  for (const clip of c.narration.clips) if (!units.has(clip.unit)) problems.push(`narration clip ${clip.id} names a unit that does not exist: ${clip.unit}`);
  for (const id of Object.keys(c.settled)) if (!keyIds.has(id)) problems.push(`settled names a key that does not exist: ${id}`);
  for (const id of order) if (!units.has(id)) problems.push(`film.order names a unit that does not exist: ${id}`);
  for (const id of [c.lookLockUnit, c.deliver.cardLoop.unit, ...c.buildOrderAfterLookLock]) if (!units.has(id)) problems.push(`a unit that does not exist is named: ${id}`);
  for (const id of Object.keys(c.motion.byUnit)) if (!units.has(id)) problems.push(`motion.byUnit names a unit that does not exist: ${id}`);

  if (c.film.targetSeconds < c.film.minSeconds || c.film.targetSeconds > c.film.maxSeconds) problems.push('film.targetSeconds lies outside film.minSeconds and film.maxSeconds');
  const loop = c.deliver.cardLoop;
  if (loop.seconds < loop.minSeconds || loop.seconds > loop.maxSeconds) problems.push('deliver.cardLoop.seconds lies outside its limits');
  return problems;
}

export function checked(input: unknown, approvedFiles?: readonly string[]): Config {
  const problems = validate(input, approvedFiles);
  if (problems.length) throw new Error(`config/showcase.json is not valid:\n- ${problems.join('\n- ')}`);
  return input as Config;
}

declare const __APPROVED_FILES__: string[] | undefined;
const approved = typeof __APPROVED_FILES__ === 'undefined' ? undefined : __APPROVED_FILES__;

export const config: Config = checked(raw, approved);
export const FPS = config.film.fps;

export const formats: Record<FormatId, Format> = {
  uhd: config.formats.master as Format,
  hd: config.formats.hd as Format,
  preview: config.formats.preview as Format,
};

export function formatById(id: string): Format {
  if (!Object.hasOwn(formats, id)) throw new Error(`no such format: ${id}`);
  return formats[id as FormatId];
}

export function samplesOf(tier: string): number {
  if (!Object.hasOwn(config.tiers, tier)) throw new Error(`no such tier: ${tier}`);
  return config.tiers[tier as TierId].samplesPerFrame;
}
