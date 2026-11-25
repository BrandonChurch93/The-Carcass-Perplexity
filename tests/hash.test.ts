// @ts-nocheck
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const tool = (name) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const hash = await tool('lib/hash');
const { rel, readJson } = await tool('lib/paths');

const CONFIG = 'config/showcase.json';
const CUT = 'cut/CUTLIST.json';
const bytes = (v) => Buffer.from(JSON.stringify(v, null, 2));
const view = (name, v) => hash.pictureBytes(name, bytes(v)).toString('utf8');
const copy = (v) => JSON.parse(JSON.stringify(v));

function sources(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...sources(p));
    else if (/\.(ts|tsx|js|mjs|glsl)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe('what the engine hash reads of the cut list', () => {
  const cut = readJson(rel('cut', 'CUTLIST.json'));

  it('does not move when only sound changes', () => {
    const other = copy(cut);
    other.music.file = 'audio/another/track.flac';
    other.sounds = [{ id: 'a-bed', unit: cut.places[0].unit, kind: 'bed', first: 0, frames: 60, file: 'x.wav', gainDb: -12 }];
    other.mix = { voiceGainDb: 3 };
    other.lines = (other.lines ?? []).map((l) => ({ ...l, first: l.first + 7 }));
    expect(view(CUT, other)).toBe(view(CUT, cut));
  });

  it('moves when a shot, a place, an event or the length moves', () => {
    const base = view(CUT, cut);
    const shot = copy(cut);
    shot.shots[1].first += 1;
    const place = copy(cut);
    place.places[1].last -= 1;
    const event = copy(cut);
    event.events[0].frame += 1;
    const length = copy(cut);
    length.frameCount += 1;
    const titan = copy(cut);
    titan.titanFrame += 1;
    for (const changed of [shot, place, event, length, titan]) expect(view(CUT, changed)).not.toBe(base);
  });

  it('leaves out no key that the page declares for itself', () => {
    const text = fs.readFileSync(rel('src', 'film', 'cut.ts'), 'utf8');
    const body = text.slice(text.indexOf('export interface CutList'));
    const declared = [...body.slice(0, body.indexOf('}')).matchAll(/^\s+(\w+)\??:/gm)].map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(0);
    for (const key of hash.NOT_PICTURE[CUT]) expect(declared).not.toContain(key);
    for (const key of declared) expect(cut).toHaveProperty(key);
  });
});

describe('what the engine hash reads of the config', () => {
  const cfg = readJson(rel('config', 'showcase.json'));
  const shape = readJson(rel('src', 'config.shape.json'));

  it('does not move when only sound, credits or the settled lines change', () => {
    const other = copy(cfg);
    other.music.cleaned = { file: 'audio/another/track.flac', sha256: 'x' };
    other.narration.maxTakesPerClip += 1;
    other.narration.clips[0].lines = ['Another line.'];
    other.audio.maxTakesPerCue += 1;
    other.credits = { cap: 1, narrationHold: 0 };
    other.settled = { ...other.settled, [Object.keys(other.settled)[0]]: ['Another settled line.'] };
    expect(view(CONFIG, other)).toBe(view(CONFIG, cfg));
  });

  it('moves when a picture key changes', () => {
    const base = view(CONFIG, cfg);
    const film = copy(cfg);
    film.film.fps += 1;
    const format = copy(cfg);
    format.formats.hd.width += 2;
    const seed = copy(cfg);
    seed.seed = `${seed.seed}x`;
    const units = copy(cfg);
    units.units[0].id = `${units.units[0].id}x`;
    for (const changed of [film, format, seed, units]) expect(view(CONFIG, changed)).not.toBe(base);
  });

  it('reads the shape of the config without the same keys', () => {
    const gone = hash.NOT_PICTURE[CONFIG];
    const other = { ...shape, 'music.another': 'string', 'credits.another': 'number', 'narration.another': 'string' };
    expect(view(hash.CONFIG_SHAPE, other)).toBe(view(hash.CONFIG_SHAPE, shape));
    expect(view(hash.CONFIG_SHAPE, { ...shape, 'film.another': 'number' })).not.toBe(view(hash.CONFIG_SHAPE, shape));
    const kept = Object.keys(JSON.parse(view(hash.CONFIG_SHAPE, shape)));
    expect(kept.length).toBeGreaterThan(0);
    for (const key of kept) expect(gone).not.toContain(key.split('.')[0]);
  });

  it('leaves out only keys that no source file of the page reads to draw', () => {
    const keys = hash.NOT_PICTURE[CONFIG];
    for (const key of keys) expect(cfg).toHaveProperty(key);
    const reads = new RegExp(`\\.(${keys.join('|')})\\b`);
    const root = rel('src');
    const found = [];
    for (const file of sources(root)) {
      const name = path.relative(root, file).split(path.sep).join('/');
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      // src/config.ts checks the names in narration and settled inside validate(), and draws nothing from them.
      let from = -1;
      let to = -1;
      if (name === 'config.ts') {
        from = lines.findIndex((l) => l.startsWith('export function validate('));
        to = lines.findIndex((l, i) => i > from && l === '}');
        expect(from).toBeGreaterThanOrEqual(0);
        expect(to).toBeGreaterThan(from);
      }
      lines.forEach((line, i) => {
        if (reads.test(line) && !(i > from && i < to)) found.push(`${name}:${i + 1}`);
      });
    }
    expect(found).toEqual([]);
  });
});

describe('the engine hash', () => {
  it('passes every other file through untouched', () => {
    const raw = Buffer.from('{ "music": 1 }');
    expect(hash.pictureBytes('config/portable.json', raw)).toBe(raw);
    expect(hash.pictureBytes('src/main.ts', raw)).toBe(raw);
  });

  it('holds the three files it reads in part, and they are engine files', () => {
    const names = hash.engineFiles().map((f) => path.relative(rel(), f).split(path.sep).join('/'));
    for (const name of [...Object.keys(hash.NOT_PICTURE), hash.CONFIG_SHAPE]) expect(names).toContain(name);
    expect(hash.engineHash()).toMatch(/^[0-9a-f]{16}$/);
  });
});
