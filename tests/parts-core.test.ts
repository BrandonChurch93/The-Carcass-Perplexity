// @ts-nocheck
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as core from '../tools/lib/parts-core.mjs';

const cfg = JSON.parse(fs.readFileSync('config/showcase.json', 'utf8'));
const cut = JSON.parse(fs.readFileSync('cut/CUTLIST.json', 'utf8'));
const order = cfg.film.order;
const hashes = Object.fromEntries(order.map((u) => [u, `hash-${u}`]));
const files = Object.fromEntries(order.map((u) => [u, [`src/places/${u}`]]));
const live = (unit, name, state = 'stand-in', kind = 'solid') => ({ id: `${unit}/${name}`, unit, name, kind, state });

describe('the frames a part is looked for in', () => {
  it('are the key frames and the events of its unit, inside its span, in order and once each', () => {
    for (const unit of order) {
      const frames = core.candidateFrames(cut, cfg, unit);
      const { first, last } = core.spanOf(cut, unit);
      expect(frames.length).toBeGreaterThan(0);
      for (const f of frames) expect(f >= first && f <= last).toBe(true);
      expect([...new Set(frames)].sort((a, b) => a - b)).toEqual(frames);
      for (const k of cfg.keys.filter((x) => x.unit === unit)) expect(frames).toContain(cut.keyFrames[k.id]);
      for (const e of cut.events.filter((x) => x.unit === unit)) expect(frames).toContain(e.frame);
    }
  });

  it('widen to frames across every shot that has a picture, and never to the black', () => {
    const frames = core.widerFrames(cut, 'reveal');
    const black = cut.shots.find((s) => s.picture === 'black');
    expect(frames.some((f) => f >= black.first)).toBe(false);
    expect(frames[0]).toBe(core.spanOf(cut, 'reveal').first);
    expect(frames.length).toBeGreaterThan(50);
  });

  it('refuses a unit the cut list does not have', () => {
    expect(() => core.spanOf(cut, 'nowhere')).toThrow(/no place for the unit nowhere/);
  });
});

describe('counting where a part is shown', () => {
  it('counts the flagged pixels of both flag colours and no dark pixel', () => {
    const data = new Uint8Array([255, 0, 255, 255, 0, 0, 0, 255, 255, 160, 0, 255, 100, 100, 100, 255]);
    expect(core.countFlagged(data)).toBe(2);
  });

  it('picks the frame that shows the most, the earlier of two equal ones, and none when it is never shown', () => {
    expect(core.pickFrame([{ frame: 5, flagged: 10 }, { frame: 9, flagged: 30 }, { frame: 12, flagged: 30 }]).frame).toBe(9);
    expect(core.pickFrame([{ frame: 5, flagged: 0 }])).toBeNull();
    expect(core.pickFrame([])).toBeNull();
  });
});

describe('the register', () => {
  it('lists a new stand-in with its hash, its files and an empty reference', () => {
    const { register, faults } = core.mergeRegister({ parts: [] }, [live('heart', 'lava'), live('ribs', 'sea')], { hashes, files, order });
    expect(faults).toEqual([]);
    expect(register.schema).toBe(core.SCHEMA);
    expect(register.parts.map((p) => p.id)).toEqual(['ribs/sea', 'heart/lava']);
    const lava = register.parts[1];
    expect(lava).toMatchObject({ unit: 'heart', name: 'lava', kind: 'solid', state: 'stand-in', fallbackStep: null, files: ['src/places/heart'], hash: 'hash-heart' });
    expect(lava.standIn).toEqual({ hash: 'hash-heart', picture: null, frame: null, format: null, tier: null, shown: null });
    expect(core.needsPicture(lava)).toBe(true);
  });

  it('keeps the reference of a stand-in it already holds, and moves its hash with its files while it is still a stand-in', () => {
    const first = core.mergeRegister({ parts: [] }, [live('heart', 'lava')], { hashes, files, order }).register;
    first.parts[0].standIn = { ...first.parts[0].standIn, picture: 'out/stills/parts/heart/lava.png', frame: 2722, format: 'preview', tier: 'draft', shown: 0.3 };
    const next = core.mergeRegister(first, [live('heart', 'lava')], { hashes: { ...hashes, heart: 'hash-2' }, files, order }).register;
    expect(next.parts[0].standIn).toMatchObject({ hash: 'hash-2', picture: 'out/stills/parts/heart/lava.png', frame: 2722 });
    expect(core.needsPicture(next.parts[0])).toBe(false);
    expect(core.needsPicture(next.parts[0], true)).toBe(true);
  });

  it('keeps the hash the part had as a stand-in once it is built, so the two can be told apart', () => {
    const first = core.mergeRegister({ parts: [] }, [live('heart', 'lava')], { hashes, files, order }).register;
    const next = core.mergeRegister(first, [live('heart', 'lava', 'built')], { hashes: { ...hashes, heart: 'hash-built' }, files, order }).register;
    expect(next.parts[0].state).toBe('built');
    expect(next.parts[0].hash).toBe('hash-built');
    expect(next.parts[0].standIn.hash).toBe('hash-heart');
    expect(core.needsPicture(next.parts[0], true)).toBe(false);
  });

  it('gives a part that was built at once no stand-in record', () => {
    const { register } = core.mergeRegister({ parts: [] }, [live('eye', 'lake', 'built')], { hashes, files, order });
    expect(register.parts[0].standIn).toBeUndefined();
  });

  it('never drops a part that left the page, and says so', () => {
    const first = core.mergeRegister({ parts: [] }, [live('heart', 'lava'), live('heart', 'walkers')], { hashes, files, order }).register;
    const { register, faults } = core.mergeRegister(first, [live('heart', 'lava')], { hashes, files, order });
    expect(register.parts.map((p) => p.id)).toEqual(['heart/lava', 'heart/walkers']);
    expect(register.parts[1].missing).toBe(true);
    expect(faults.join('\n')).toContain('heart/walkers is in the register and not on the page');
  });

  it('starts again from the page when asked to', () => {
    const first = core.mergeRegister({ parts: [] }, [live('heart', 'lava'), live('heart', 'walkers')], { hashes, files, order }).register;
    const { register, faults } = core.mergeRegister(first, [live('heart', 'lava')], { hashes, files, order, fresh: true });
    expect(register.parts.map((p) => p.id)).toEqual(['heart/lava']);
    expect(faults).toEqual([]);
  });

  it('names a part the page lists twice and a state it does not know', () => {
    expect(core.mergeRegister({ parts: [] }, [live('heart', 'lava'), live('heart', 'lava')], { hashes, files, order }).faults.join('\n')).toContain('lists the part heart/lava twice');
    expect(() => core.mergeRegister({ parts: [] }, [live('heart', 'lava', 'done')], { hashes, files, order })).toThrow(/the state done/);
  });

  it('counts the parts of each unit by state and writes them as a table', () => {
    const { register } = core.mergeRegister({ parts: [] }, [live('heart', 'lava'), live('heart', 'air', 'stand-in', 'effect'), live('eye', 'lake', 'built')], { hashes, files, order });
    const { rows, total } = core.counts(register, order);
    expect(rows.find((r) => r.unit === 'heart')).toEqual({ unit: 'heart', parts: 2, 'stand-in': 2, built: 0, fallback: 0 });
    expect(total).toEqual({ unit: 'all', parts: 3, 'stand-in': 2, built: 1, fallback: 0 });
    const table = core.summaryTable(register, order);
    expect(table.split('\n')).toHaveLength(order.length + 3);
    expect(table).toContain('| `heart` | 2 | 2 | 0 | 0 |');
    expect(table).toContain('| all | 3 | 2 | 1 | 0 |');
    expect(core.namesLine(register, 'heart')).toBe('lava, air');
    expect(core.pictureOf(register.parts[0])).toBe('out/stills/parts/heart/lava.png');
  });
});
