// @ts-nocheck
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const tool = (name) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const { rel } = await tool('lib/paths');
const { LIMITS } = await tool('lib/voice-core');

const read = (...parts) => fs.readFileSync(rel(...parts), 'utf8');
const caps = JSON.parse(read('cut', 'CAPTIONS.json'));
const cut = JSON.parse(read('cut', 'CUTLIST.json'));
const align = JSON.parse(read('assets-src', 'subs', 'alignment-kept.json'));
const source = read('assets-src', 'subs', 'subs.py');
const SUBS = rel('assets-src', 'subs', 'subs.py');

const constant = (name) => Number(new RegExp(`^${name} = ([0-9.]+)`, 'm').exec(source)[1]);
const HAZE_AHEAD = constant('HAZE_AHEAD');
const WORD_AHEAD = constant('WORD_AHEAD');
const OUT = constant('OUT');
const MIN_OUT = constant('MIN_OUT');
const [, EDGE_ROOM, EDGE_WINDOW] = /^EDGE_ROOM, EDGE_WINDOW = ([0-9.]+), ([0-9.]+)/m.exec(source).map(Number);
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const bare = (w) => w.toLowerCase().replace(/[^0-9a-z]/g, '');

function takeWords(al) {
  const ch = al.characters;
  let i = ch.indexOf(']') + 1;
  const paras = [[]];
  while (i < ch.length) {
    if (ch[i] === '\n') {
      if (paras[paras.length - 1].length) paras.push([]);
      i++;
    } else if (/\s/.test(ch[i])) i++;
    else {
      let j = i;
      while (j < ch.length && !/\s/.test(ch[j])) j++;
      let k = j - 1;
      while (k > i && !/[0-9A-Za-z]/.test(ch[k])) k--;
      paras[paras.length - 1].push({ w: ch.slice(i, j).join(''), start: al.character_start_times_seconds[i], end: al.character_end_times_seconds[k] });
      i = j;
    }
  }
  return paras.filter((p) => p.length);
}

function lineStart(clip, line) {
  const m = /Take (\d+) from ([0-9.]+) s to ([0-9.]+) s/.exec(read('audio', 'records', `${clip}-${line}.md`));
  return { take: Number(m[1]), start: Number(m[2]) };
}

const python = spawnSync('python3', ['-c', 'import numpy, cv2, PIL'], { encoding: 'utf8' }).status === 0;
const run = (...argv) => spawnSync('python3', [SUBS, ...argv], { encoding: 'utf8' });

describe('cut/CAPTIONS.json, the cue list', () => {
  it('holds the spoken lines of the cut list, in order and word for word', () => {
    expect(caps.schema).toBe('carcass/captions 1');
    expect(caps.fps).toBe(cut.fps);
    expect(caps.frameCount).toBe(cut.frameCount);
    expect(caps.lines.map((l) => [l.clip, l.line, l.text, l.unit])).toEqual(cut.lines.map((l) => [l.clip, l.line, l.text, l.unit]));
    expect(caps.lines[caps.lines.length - 1].text).toBe('Everything here feeds on it.');
  });

  it('breaks every line into one or two rows that are its words, and never leaves a row on a small word', () => {
    for (const l of caps.lines) {
      expect(l.rows.length).toBeGreaterThanOrEqual(1);
      expect(l.rows.length).toBeLessThanOrEqual(2);
      expect(l.rows.join(' ')).toBe(l.text);
      expect(l.words.map((w) => w.w).join(' ')).toBe(l.text);
      if (l.rows.length === 2) expect(/[.,;:?]$/.test(l.rows[0])).toBe(true);
    }
  });

  it('times every word from the take, the record and the cut list', () => {
    for (const [n, l] of caps.lines.entries()) {
      const c = cut.lines[n];
      const { take, start } = lineStart(l.clip, l.line);
      expect(take).toBe(align[l.clip].take);
      const para = takeWords(align[l.clip].alignment)[l.line - 1];
      expect(l.words.map((w) => bare(w.w))).toEqual(para.slice(0, l.words.length).map((w) => bare(w.w)));
      const t = c.first / cut.fps;
      const end = t + c.frames / cut.fps;
      l.words.forEach((w, i) => {
        const off = r4(Math.min(r4(t + para[i].end - start), end));
        const on = i === 0 ? r4(Math.min(t + EDGE_ROOM + EDGE_WINDOW, r4(t + para[0].end - start) - 0.02)) : r4(t + para[i].start - start);
        expect(w.off).toBeCloseTo(off, 4);
        expect(w.on).toBeCloseTo(Math.min(on, off), 4);
        expect(w.on).toBeGreaterThanOrEqual(t);
        expect(w.off).toBeLessThanOrEqual(end + 1e-9);
        expect(w.off).toBeGreaterThanOrEqual(w.on);
        if (i > 0) expect(w.on).toBeGreaterThanOrEqual(l.words[i - 1].on);
      });
    }
  });

  it('starts the first word of a line where the tool that cut the line found its sound', () => {
    expect(EDGE_ROOM).toBe(LIMITS.edgeRoomSeconds);
    expect(EDGE_WINDOW).toBe(LIMITS.windowSeconds);
    for (const [n, l] of caps.lines.entries()) {
      const shows = l.words[0].on - WORD_AHEAD;
      expect(shows).toBeGreaterThanOrEqual(cut.lines[n].first / cut.fps - 1e-9);
      expect(shows).toBeLessThanOrEqual(cut.lines[n].first / cut.fps + EDGE_ROOM + EDGE_WINDOW);
    }
  });

  it('has every line gone before the next begins, and inside the film', () => {
    caps.lines.forEach((l, n) => {
      expect(l.in).toBeCloseTo(l.words[0].on - HAZE_AHEAD - 0.05, 4);
      expect(l.out).toBeGreaterThan(l.words[l.words.length - 1].off);
      expect(l.gone - l.out).toBeGreaterThanOrEqual(MIN_OUT - 1e-9);
      expect(l.gone - l.out).toBeLessThanOrEqual(OUT + 1e-9);
      const next = caps.lines[n + 1];
      if (next) expect(l.gone).toBeLessThanOrEqual(next.in + 1e-9);
      expect(l.in).toBeGreaterThanOrEqual(0);
      expect(l.gone).toBeLessThanOrEqual(cut.frameCount / cut.fps);
    });
  });
});

describe('cut/CAPTIONS.json, the look', () => {
  const look = caps.look;
  const BLOOD = ['ribs', 'breath', 'spine', 'eye', 'reveal'];
  const ASH = ['heart', 'marsh'];
  const colours = (u) => [look.units[u].dark, look.units[u].body, look.units[u].bright];
  const lum = (c) => {
    const [r, g, b] = c.map((v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);

  it('has one entry for every place of the cut list and no other', () => {
    expect(Object.keys(look.units).sort()).toEqual(cut.places.map((p) => p.unit).sort());
    expect([...BLOOD, ...ASH].sort()).toEqual(cut.places.map((p) => p.unit).sort());
  });

  it('keeps the two families: blood red without sparks, ash with embers', () => {
    for (const u of BLOOD) {
      expect(look.units[u].sparks).toBe(false);
      for (const [r, g, b] of colours(u)) {
        expect(r).toBeGreaterThanOrEqual(4 * g);
        expect(r).toBeGreaterThanOrEqual(4 * b);
        expect(Math.abs(g - b)).toBeLessThanOrEqual(12);
      }
    }
    for (const u of ASH) {
      expect(look.units[u].sparks).toBe(true);
      for (const c of colours(u)) {
        expect(Math.max(...c) - Math.min(...c)).toBeLessThanOrEqual(12);
        expect(Math.max(...c)).toBeLessThanOrEqual(70);
      }
    }
    const [r, g, b] = look.sparkFrom;
    expect(r > g && g > b).toBe(true);
  });

  it('has warm off-white text that stands on every haze colour by 4.5 to 1 at least', () => {
    const [r, g, b] = look.text;
    expect(r >= g && g > b).toBe(true);
    expect(b).toBeGreaterThanOrEqual(200);
    expect(r).toBeLessThan(255);
    for (const u of Object.keys(look.units)) for (const c of colours(u)) expect(ratio(look.text, c)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the size and the place of the type, and a crossfade', () => {
    expect(look.em).toBe(0.05);
    expect(look.baseline).toBe(0.905);
    expect(look.crossfadeSeconds).toBeGreaterThan(0);
    expect(look.crossfadeSeconds).toBeLessThanOrEqual(3);
  });
});

describe('assets-src/subs/subs.py', () => {
  it('names no path outside the repo and no other project', () => {
    expect(source).not.toMatch(/\/home\/|\/usr\/share|narration-work/);
    expect(source).not.toMatch(/RandomState\((fi|n)\)|time\.time\(\) \*|random\.seed/);
  });

  it.skipIf(!python)('writes the same cue list as the file holds', () => {
    const r = run('cues', '--check');
    expect(r.stdout + r.stderr).toMatch(/is what cues writes/);
    expect(r.status).toBe(0);
  });

  it.skipIf(!python)('draws the same bytes for the same time, and nothing where no line stands', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'captions-'));
    const l = caps.lines.find((x) => x.unit === 'heart' && x.rows.length === 2);
    const t = String(r4((l.words[l.words.length - 1].on + l.out) / 2));
    const a = path.join(dir, 'a.png');
    const b = path.join(dir, 'b.png');
    const c = path.join(dir, 'c.png');
    const d = path.join(dir, 'd.png');
    expect(run('still', t, a).status).toBe(0);
    expect(run('still', t, b).status).toBe(0);
    expect(fs.readFileSync(a).equals(fs.readFileSync(b))).toBe(true);
    const gap = String(r4((caps.lines[0].gone + caps.lines[1].in) / 2));
    expect(run('still', gap, c).stdout).toMatch(/no line/);
    expect(run('still', '0', d).stdout).toMatch(/no line/);
    expect(fs.readFileSync(c).equals(fs.readFileSync(d))).toBe(true);
    expect(fs.readFileSync(a).equals(fs.readFileSync(c))).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  }, 120000);
});
