// @ts-nocheck
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FILM_PARTS, FILM_UNIT, filmParts } from '../src/film/parts';
import { STATES, entryOf, filmUnit, mergeRegister, needsPicture } from '../tools/lib/parts-core.mjs';
import { filmUnitId, unitFiles, unitHash } from '../tools/lib/hash.mjs';

const cfg = JSON.parse(fs.readFileSync('config/showcase.json', 'utf8'));
const register = JSON.parse(fs.readFileSync('parts/PARTS.json', 'utf8'));

describe('the parts of the whole film', () => {
  it('belong to the last unit of the config, which is no place', () => {
    expect(FILM_UNIT).toBe(cfg.units[cfg.units.length - 1].id);
    expect(filmUnit(cfg)).toBe(FILM_UNIT);
    expect(filmUnitId()).toBe(FILM_UNIT);
    expect(cfg.film.order).not.toContain(FILM_UNIT);
  });

  it('are named once each, drawn by places of the film, and never a stand-in', () => {
    const names = FILM_PARTS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of ['opening', 'handoff', 'ending', 'loop']) expect(names).toContain(name);
    for (const p of FILM_PARTS) {
      expect(['built', 'fallback']).toContain(p.state);
      expect(STATES).toContain(p.state);
      for (const unit of p.drawnBy.split(' and ')) expect(cfg.film.order).toContain(unit);
      expect(p.what.length).toBeGreaterThan(20);
    }
  });

  it('reach the register as effects of that unit, with no stand-in record and no picture to take', () => {
    const live = filmParts();
    expect(live.map((p) => p.id)).toEqual(FILM_PARTS.map((p) => `${FILM_UNIT}/${p.name}`));
    for (const l of live) {
      expect(l.unit).toBe(FILM_UNIT);
      expect(l.kind).toBe('effect');
      const entry = entryOf(l, { hash: 'h', files: ['src/film'] });
      expect(entry.standIn).toBeUndefined();
      expect(needsPicture(entry, true)).toBe(false);
    }
    const order = [...cfg.film.order, FILM_UNIT];
    const { register: next, faults } = mergeRegister(register, [...register.parts.filter((p) => p.unit !== FILM_UNIT), ...live], { hashes: Object.fromEntries(order.map((u) => [u, 'h'])), files: Object.fromEntries(order.map((u) => [u, []])), order, units: [FILM_UNIT] });
    expect(faults).toEqual([]);
    expect(next.parts.slice(-live.length).map((p) => p.id)).toEqual(live.map((p) => p.id));
    expect(next.parts.filter((p) => p.unit !== FILM_UNIT)).toEqual(register.parts.filter((p) => p.unit !== FILM_UNIT));
  });

  it('are listed in the register as the code declares them', () => {
    const listed = register.parts.filter((p) => p.unit === FILM_UNIT);
    expect(listed.map((p) => [p.name, p.state])).toEqual(FILM_PARTS.map((p) => [p.name, p.state]));
  });

  it('have the code of the film as their files, so the hash of the unit moves when that code does', () => {
    const files = unitFiles(FILM_UNIT).map((f) => f.split('\\').join('/'));
    expect(files.some((f) => f.endsWith('src/film/parts.ts'))).toBe(true);
    expect(files.every((f) => f.includes('/src/film/'))).toBe(true);
    expect(unitHash(FILM_UNIT)).toMatch(/^[0-9a-f]{16}$/);
    for (const u of cfg.film.order) expect(unitFiles(u).some((f) => f.includes('/src/film/'))).toBe(false);
  });
});
