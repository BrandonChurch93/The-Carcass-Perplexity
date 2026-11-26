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

// narration.cut is the cut of the recorded script that the film speaks: the ids of the lines it drops, as clip id,
// a dash and the number of the line, and the lines it shortens to their first words, each with the second its sound
// ends on in the kept line, the fade out before that end and the file of the short line. Both lists have to be
// there, empty when the film speaks the recorded script whole. narration.clips stays the recorded script.
// tools/lib/script.mjs holds the same rules for the tools.
function narrationCutProblems(narration: unknown): string[] {
  const problems: string[] = [];
  const bag = narration as { clips: { id: string; lines: unknown[] }[]; cut?: unknown };
  const cut = bag.cut as { dropped?: unknown; shortened?: unknown } | null | undefined;
  if (cut === null || typeof cut !== 'object' || Array.isArray(cut)) return [cut === undefined ? 'missing key: narration.cut' : 'wrong type: narration.cut has to be an object'];
  for (const k of ['dropped', 'shortened'] as const) {
    if (cut[k] === undefined) problems.push(`missing key: narration.cut.${k}`);
    else if (!Array.isArray(cut[k])) problems.push(`wrong type: narration.cut.${k} has to be a list`);
  }
  if (problems.length) return problems;
  const recorded = new Map<string, unknown>();
  for (const clip of bag.clips) clip.lines.forEach((text, i) => recorded.set(`${clip.id}-${i + 1}`, text));
  const dropped = cut.dropped as unknown[];
  const shortened = cut.shortened as unknown[];
  dropped.forEach((id, i) => {
    if (typeof id !== 'string' || !recorded.has(id)) problems.push(`narration.cut.dropped names a line that does not exist: ${String(id)}`);
    else if (dropped.indexOf(id) !== i) problems.push(`narration.cut.dropped names ${id} twice`);
  });
  shortened.forEach((item, i) => {
    const where = `narration.cut.shortened[${i}]`;
    if (item === null || typeof item !== 'object') {
      problems.push(`${where} is not an object`);
      return;
    }
    const s = item as Record<string, unknown>;
    const id = s.id;
    if (typeof id !== 'string' || !recorded.has(id)) {
      problems.push(`${where} names a line that does not exist: ${String(id)}`);
      return;
    }
    const whole = recorded.get(id);
    if (dropped.includes(id)) problems.push(`${where} shortens ${id}, which narration.cut.dropped drops`);
    if (shortened.findIndex((o) => o !== null && typeof o === 'object' && (o as Record<string, unknown>).id === id) !== i) problems.push(`${where} shortens ${id} a second time`);
    const text = s.text;
    if (typeof text !== 'string' || text === '' || typeof whole !== 'string' || text === whole || !whole.startsWith(text)) problems.push(`${where}.text has to be the first words of the recorded line ${id}, and shorter than it`);
    const end = s.endSeconds;
    const fade = s.fadeOutSeconds;
    const endOk = typeof end === 'number' && Number.isFinite(end) && end > 0;
    if (!endOk) problems.push(`${where}.endSeconds has to be a number over 0`);
    if (typeof fade !== 'number' || !Number.isFinite(fade) || fade < 0 || (endOk && fade > (end as number))) problems.push(`${where}.fadeOutSeconds has to be a number from 0 to endSeconds`);
    if (typeof s.file !== 'string' || s.file === '') problems.push(`${where}.file has to name the sound file of the short line`);
  });
  return problems;
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
  problems.push(...narrationCutProblems(c.narration));
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
