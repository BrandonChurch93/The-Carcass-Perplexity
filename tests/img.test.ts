import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { config } from '../tools/lib/paths.mjs';
import { fitWithin, criticLimits, inside, gridFit, grid, textStrip, fitText, textWidth, timecode, spread, clean, writePng, madeRecord, cropBox, parseRegions, fakeRenderer, fakeFilm, formatSize, STYLE } from '../tools/lib/img.mjs';
import { cropGrids, lattice } from '../tools/crops.mjs';
import { compareKey, coverRect } from '../tools/compare.mjs';
import { sheet } from '../tools/sheet.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'img-test-'));
const renderer = fakeRenderer(path.join(tmp, 'stills'));
const limits = criticLimits();
const c = config();

afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

const raw = (input: string | Buffer, box?: { left: number; top: number; width: number; height: number }) => {
  const s = sharp(input);
  return (box ? s.extract(box) : s).removeAlpha().raw().toBuffer();
};
const sizeOf = async (file: string) => {
  const m = await sharp(file).metadata();
  return { width: m.width as number, height: m.height as number };
};
const greys = new Set(['#000', '#000000', '#fff', '#ffffff', 'black', 'white']);

describe('fitWithin', () => {
  it('never scales up', () => {
    expect(fitWithin(640, 360, 1400, 1.1)).toEqual({ width: 640, height: 360, scale: 1 });
  });

  it('fits the long edge and the megapixels', () => {
    for (const [w, h] of [[3840, 2160], [1920, 1080], [2160, 3840], [1400, 1400], [5000, 300], [1401, 10]]) {
      const f = fitWithin(w, h, 1400, 1.1);
      expect(Math.max(f.width, f.height)).toBeLessThanOrEqual(1400);
      expect(f.width * f.height).toBeLessThanOrEqual(1.1e6);
      expect(Math.abs(f.width / f.height - w / h) / (w / h)).toBeLessThan(0.01);
    }
  });

  it('gives the largest size that fits', () => {
    const f = fitWithin(3840, 2160, 1400, 1.1);
    expect(f.width).toBe(1398);
    const next = { width: f.width + 1, height: Math.round(((f.width + 1) * 2160) / 3840) };
    expect(next.width * next.height > 1.1e6 || next.width > 1400).toBe(true);
    expect(fitWithin(4000, 400, 1400, 1.1).width).toBe(1400);
  });
});

describe('limits and helpers', () => {
  it('reads the limits from the config', () => {
    expect(limits).toEqual({ maxEdge: c.critics.maxImageLongEdgePx, maxMegapixels: c.critics.maxImageMegapixels });
    expect(inside(limits.maxEdge, 10)).toBe(true);
    expect(inside(limits.maxEdge + 1, 10)).toBe(false);
    expect(inside(limits.maxEdge, limits.maxEdge)).toBe(limits.maxEdge * limits.maxEdge <= limits.maxMegapixels * 1e6);
  });

  it('finds a format by id', () => {
    expect(formatSize(c.formats.master.id)).toEqual({ width: c.formats.master.width, height: c.formats.master.height });
    expect(() => formatSize('nope')).toThrow();
  });

  it('writes time as m:ss.ff', () => {
    expect(timecode(0, 60)).toBe('0:00.00');
    expect(timecode(59, 60)).toBe('0:00.59');
    expect(timecode(60, 60)).toBe('0:01.00');
    expect(timecode(3725, 60)).toBe('1:02.05');
    expect(timecode(11699, 60)).toBe('3:14.59');
  });

  it('spreads frames evenly with both ends', () => {
    expect(spread(10, 15, 12)).toEqual([10, 11, 12, 13, 14, 15]);
    const s = spread(0, 11699, 12);
    expect(s).toHaveLength(12);
    expect(s[0]).toBe(0);
    expect(s[11]).toBe(11699);
    const steps = s.slice(1).map((v, i) => v - s[i]);
    expect(Math.max(...steps) - Math.min(...steps)).toBeLessThanOrEqual(1);
    expect(spread(100, 133, 12)).toEqual([100, 103, 106, 109, 112, 115, 118, 121, 124, 127, 130, 133]);
  });

  it('cleans text', () => {
    expect(clean('a \u2014 b!  c')).toBe('a - b c');
  });

  it('keeps a crop box inside the picture', () => {
    expect(cropBox(0, 0, 100, 50, 1000, 500)).toEqual({ left: 0, top: 0, width: 100, height: 50 });
    expect(cropBox(1, 1, 100, 50, 1000, 500)).toEqual({ left: 900, top: 450, width: 100, height: 50 });
    expect(cropBox(0.5, 0.5, 100, 50, 1000, 500)).toEqual({ left: 450, top: 225, width: 100, height: 50 });
    expect(cropBox(0.5, 0.5, 100, 50, 60, 40)).toEqual({ left: 0, top: 0, width: 60, height: 40 });
  });

  it('parses regions', () => {
    expect(parseRegions('0.25,0.5 1,0')).toEqual([{ label: 'region 1', cx: 0.25, cy: 0.5 }, { label: 'region 2', cx: 1, cy: 0 }]);
    expect(parseRegions(['0.1,0.2'])).toHaveLength(1);
    expect(parseRegions(undefined)).toBeNull();
    expect(() => parseRegions('2,0')).toThrow();
  });

  it('uses no pure black or white', () => {
    for (const v of [STYLE.ground, STYLE.stripGround, STYLE.ink, STYLE.dim]) expect(greys.has(v.toLowerCase())).toBe(false);
  });
});

describe('text', () => {
  it('draws a strip of the asked size with light text on a dark ground', async () => {
    const buf = await textStrip({ text: 'frame 120', width: 300, height: 26 });
    const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([300, 26]);
    let min = 255;
    let max = 0;
    for (const v of data) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    expect(min).toBeGreaterThan(0);
    expect(max).toBeLessThan(255);
    expect(max - min).toBeGreaterThan(80);
  });

  it('shrinks then shortens text so it is never clipped', async () => {
    const long = 'a caption that is far too long to sit inside a narrow strip at any size';
    const fit = await fitText(long, 120);
    expect(fit.size).toBe(STYLE.minFont);
    expect(fit.text.endsWith('...')).toBe(true);
    expect(await textWidth(fit.text, fit.size)).toBeLessThanOrEqual(120);
    const buf = await textStrip({ text: long, width: 136, height: 26 });
    const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const edge = (x: number) => Array.from({ length: info.height }, (_, y) => data[(y * info.width + x) * 3]);
    expect(new Set(edge(info.width - 1)).size).toBe(1);
    expect(new Set(edge(info.width - 3)).size).toBe(1);
  });
});

describe('grid', () => {
  it('finds the largest cell that keeps the grid inside the limits', () => {
    for (const [cols, rows] of [[2, 2], [4, 3], [4, 1], [1, 1]]) {
      const cell = gridFit({ cols, rows, aspect: 16 / 9, title: true });
      const w = cols * cell.width + (cols + 1) * STYLE.gap;
      const h = rows * (cell.height + STYLE.strip) + (rows + 1) * STYLE.gap + STYLE.title + STYLE.gap;
      expect(inside(w, h)).toBe(true);
      const bw = cols * (cell.width + 1) + (cols + 1) * STYLE.gap;
      const bh = rows * (Math.round((cell.width + 1) / (16 / 9)) + STYLE.strip) + (rows + 1) * STYLE.gap + STYLE.title + STYLE.gap;
      expect(inside(bw, bh)).toBe(false);
    }
    expect(gridFit({ cols: 2, rows: 2, aspect: 2, maxCell: { width: 100, height: 50 } })).toEqual({ width: 100, height: 50 });
  });

  it('lays cells with even gaps, a strip under each and nothing over the picture', async () => {
    const cell = { width: 120, height: 60 };
    const colours = ['#804040', '#408040', '#404080', '#808040', '#408080'];
    const inputs = await Promise.all(colours.map((background) => sharp({ create: { ...cell, channels: 3, background } }).png().toBuffer()));
    const out = await grid({ cells: inputs.map((input, i) => ({ input, caption: `cell ${i}` })), cols: 3, cell, title: 'a title' });
    const g = STYLE.gap;
    expect(out.width).toBe(3 * 120 + 4 * g);
    expect(out.height).toBe(g + STYLE.title + g + 2 * (60 + STYLE.strip) + g + g);
    expect(out.places.map((p) => p.left)).toEqual([g, 2 * g + 120, 3 * g + 240, g, 2 * g + 120]);
    expect(out.places[3].top - out.places[0].top).toBe(60 + STYLE.strip + g);
    for (let i = 0; i < inputs.length; i++) expect((await raw(out.buffer, out.places[i])).equals(await raw(inputs[i]))).toBe(true);
    const meta = await sharp(out.buffer).metadata();
    expect([meta.width, meta.height]).toEqual([out.width, out.height]);
    expect(meta.exif).toBeUndefined();
  });

  it('writes a png with its record beside it and refuses one outside the limits', async () => {
    const file = path.join(tmp, 'a', 'b.png');
    const img = sharp({ create: { width: 50, height: 40, channels: 3, background: '#333333' } });
    const still = { engine: 'x', frame: 3, made: 'then' };
    const res = await writePng(file, img, madeRecord('sheet', [still], { name: 'b' }));
    expect(res).toEqual({ file, width: 50, height: 40 });
    const rec = JSON.parse(fs.readFileSync(file + '.json', 'utf8'));
    expect(rec.kind).toBe('sheet');
    expect(rec.made).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    expect(rec.stills).toEqual([still]);
    const big = sharp({ create: { width: limits.maxEdge + 1, height: 10, channels: 3, background: '#333333' } });
    await expect(writePng(path.join(tmp, 'big.png'), big, {})).rejects.toThrow();
  });
});

describe('the fake renderer', () => {
  it('makes stills of the exact format size with one-pixel detail', async () => {
    const still = await renderer.renderStill({ frame: 77, format: 'preview' });
    expect(await sizeOf(still.file)).toEqual(formatSize('preview'));
    expect(still.reused).toBe(false);
    expect(still.record.frame).toBe(77);
    expect(JSON.parse(fs.readFileSync(still.file + '.json', 'utf8'))).toEqual(still.record);
    const row = await raw(still.file, { left: 600, top: 20, width: 40, height: 1 });
    let flips = 0;
    for (let x = 1; x < 39; x++) if ((row[x * 3] - row[(x - 1) * 3]) * (row[(x + 1) * 3] - row[x * 3]) < 0) flips++;
    expect(flips).toBeGreaterThan(30);
    expect((await renderer.renderStill({ frame: 77, format: 'preview' })).reused).toBe(true);
  });

  it('describes a film that fills its length', async () => {
    const film = fakeFilm();
    expect(film.fps).toBe(c.film.fps);
    expect(film.shots[0].first).toBe(0);
    expect(film.shots[film.shots.length - 1].last).toBe(film.frameCount - 1);
    for (const k of c.keys) expect(film.keyFrames[k.id]).toBeTypeOf('number');
  });
});

describe('crops', () => {
  it('has a 3 by 2 default lattice', () => {
    const l = lattice();
    expect(l).toHaveLength(6);
    expect(new Set(l.map((r) => r.cx)).size).toBe(3);
    expect(new Set(l.map((r) => r.cy)).size).toBe(2);
  });

  it('copies pixels one to one into grids inside the limits', async () => {
    const still = await renderer.renderStill({ frame: 500, format: 'uhd' });
    const { files } = await cropGrids({ file: still.file, name: 'frame-500', record: still.record, dir: path.join(tmp, 'crops'), look: false });
    expect(files.map((f) => path.basename(f))).toEqual(['frame-500-1.png', 'frame-500-2.png']);
    let seen = 0;
    for (const f of files) {
      const s = await sizeOf(f);
      expect(inside(s.width, s.height)).toBe(true);
      const rec = JSON.parse(fs.readFileSync(f + '.json', 'utf8'));
      expect(rec.kind).toBe('crops');
      expect(rec.stills).toEqual([still.record]);
      for (const r of rec.regions) {
        expect([r.at.width, r.at.height]).toEqual([r.width, r.height]);
        const cut = await raw(f, r.at);
        const src = await raw(still.file, { left: r.left, top: r.top, width: r.width, height: r.height });
        expect(cut.equals(src)).toBe(true);
        seen++;
      }
    }
    expect(seen).toBe(6);
    const first = JSON.parse(fs.readFileSync(files[0] + '.json', 'utf8'));
    expect(first.regions).toHaveLength(4);
    expect(first.regions[0].left).toBe(0);
    expect(first.regions[2].left + first.regions[2].width).toBe(3840);
  }, 60000);

  it('takes the regions it is given', async () => {
    const still = await renderer.renderStill({ frame: 500, format: 'hd' });
    const { files } = await cropGrids({ file: still.file, name: 'given', regions: [{ label: 'one', cx: 0.5, cy: 0.5 }], dir: path.join(tmp, 'crops'), look: false });
    expect(files).toHaveLength(1);
    const rec = JSON.parse(fs.readFileSync(files[0] + '.json', 'utf8'));
    expect(rec.regions).toHaveLength(1);
    expect(rec.regions[0].label).toBe('one');
    expect(rec.stills).toEqual([still.record]);
  }, 60000);
});

describe('compare', () => {
  it('takes the part of the approved picture with the shape of the frame', () => {
    expect(coverRect(1672, 941, 16 / 9)).toEqual({ left: 0, top: 0, width: 1672, height: 941 });
    expect(coverRect(2000, 1000, 16 / 9)).toEqual({ left: 111, top: 0, width: 1778, height: 1000 });
    expect(coverRect(1000, 1000, 2)).toEqual({ left: 0, top: 250, width: 1000, height: 500 });
  });

  it('makes one picture as wide as the limit with the frame crops at native size', async () => {
    const key = c.keys[0].id;
    const { file, files } = await compareKey({ key, format: 'uhd', renderer, dir: path.join(tmp, 'compare'), look: false });
    expect(files).toEqual([file]);
    const s = await sizeOf(file);
    expect(s.width).toBe(limits.maxEdge);
    expect(inside(s.width, s.height)).toBe(true);
    const rec = JSON.parse(fs.readFileSync(file + '.json', 'utf8'));
    expect(rec.kind).toBe('compare');
    expect(rec.regions).toHaveLength(2);
    expect(rec.stills).toHaveLength(1);
    const still = await renderer.renderStill({ key, format: 'uhd' });
    const g = STYLE.gap;
    const cw = Math.floor((limits.maxEdge - 5 * g) / 4);
    const top = g + Math.round(((2 * cw + g) * 2160) / 3840) + STYLE.strip + g;
    for (let i = 0; i < 2; i++) {
      const box = rec.regions[i].frame;
      expect(box.width).toBe(cw);
      const cut = await raw(file, { left: g + (2 * i + 1) * (cw + g), top, width: box.width, height: box.height });
      expect(cut.equals(await raw(still.file, box))).toBe(true);
      expect(rec.regions[i].scale).toBeGreaterThan(1);
    }
    expect(top + rec.regions[0].frame.height + STYLE.strip + g).toBe(s.height);
  }, 60000);

  it('puts further regions in further pictures', async () => {
    const key = c.keys[0].id;
    const regions = [0.2, 0.4, 0.6, 0.8, 0.5].map((v, i) => ({ label: `r${i}`, cx: v, cy: 1 - v }));
    const { file, files } = await compareKey({ key, format: 'hd', regions, renderer, dir: path.join(tmp, 'compare'), look: false });
    expect(files).toHaveLength(3);
    expect(files[0]).toBe(file);
    for (const f of files) {
      const s = await sizeOf(f);
      expect(inside(s.width, s.height)).toBe(true);
    }
  }, 60000);
});

describe('sheet', () => {
  it('lays the configured count four across inside the limits', async () => {
    const frames = spread(0, 2000, c.critics.contactSheetFrames);
    const { file } = await sheet({ frames, name: 's', title: 'a sheet', renderer, dir: path.join(tmp, 'sheets'), look: false });
    const s = await sizeOf(file);
    expect(inside(s.width, s.height)).toBe(true);
    const rec = JSON.parse(fs.readFileSync(file + '.json', 'utf8'));
    expect(rec.kind).toBe('sheet');
    expect(rec.stills).toHaveLength(c.critics.contactSheetFrames);
    expect(rec.frames.map((f: { frame: number }) => f.frame)).toEqual(frames);
    expect(rec.format).toBe('preview');
    expect(rec.tier).toBe('review');
    expect(rec.frames[1].time).toBe(timecode(frames[1], c.film.fps));
    expect(s.width).toBe(4 * rec.cell.width + 5 * STYLE.gap);
  }, 60000);

  it('thins a longer list and takes loop frames', async () => {
    const { file } = await sheet({ loopFrames: Array.from({ length: 30 }, (_, i) => i), name: 'l', renderer, dir: path.join(tmp, 'sheets'), look: false });
    const rec = JSON.parse(fs.readFileSync(file + '.json', 'utf8'));
    expect(rec.frames).toHaveLength(c.critics.contactSheetFrames);
    expect(rec.frames[0].loop).toBe(0);
    expect(rec.frames[rec.frames.length - 1].loop).toBe(29);
    expect(rec.stills[0].loop).toBe(0);
  }, 60000);
});
