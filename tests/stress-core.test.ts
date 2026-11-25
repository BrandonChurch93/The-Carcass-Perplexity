// @ts-nocheck
import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const tool = (name) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const core = await tool('lib/stress-core');
const stress = await tool('stress');
const { config, rel } = await tool('lib/paths');

const cfg = config();
const cut = JSON.parse(fs.readFileSync(rel('cut', 'CUTLIST.json'), 'utf8'));
const film = { fps: cut.fps, frameCount: cut.frameCount, shots: cut.shots, places: cut.places, events: cut.events, titanFrame: cut.titanFrame };
const testScene = { fps: cfg.film.fps, frameCount: 600, shots: [{ id: 's1', unit: cfg.lookLockUnit, first: 0, last: 599, key: null }], keyFrames: {}, events: [], titanFrame: null, loop: { frameCount: 10, unit: cfg.lookLockUnit } };
const byId = (list) => Object.fromEntries(list.map((m) => [m.id, m]));
const event = (id) => cut.events.find((e) => e.id === id);
const place = (unit) => cut.places.find((p) => p.unit === unit);
const dirs = [];

afterAll(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

describe('the four moments', () => {
  it('are read from the events and the titan frame of the cut list', () => {
    const m = byId(core.pickMoments(film, cfg));
    expect(Object.keys(m)).toEqual(['heart', 'spine', 'marsh', 'titan']);
    expect(m.heart.frame).toBe(event('surge').frame);
    expect(m.heart.source).toBe('the event surge');
    expect(m.marsh.frame).toBe(event('burst').frame);
    const strikes = cut.events.filter((e) => e.id.startsWith('strike')).sort((a, b) => a.frame - b.frame);
    expect(m.spine.frame).toBe(strikes[2].frame);
    expect(m.spine.source).toBe(`the event ${strikes[2].id}`);
    expect(m.titan.frame).toBe(cut.titanFrame);
    expect(m.titan.unit).toBe(cfg.film.order[cfg.film.order.length - 1]);
    for (const x of Object.values(m)) {
      expect(x.exact).toBe(true);
      expect(x.notes).toEqual([]);
      expect(place(x.unit).first).toBeLessThanOrEqual(x.frame);
      expect(place(x.unit).last).toBeGreaterThanOrEqual(x.frame);
    }
  });

  it('fall back to the middle of the place when an event is missing, and say so', () => {
    const m = byId(core.pickMoments({ ...film, events: film.events.filter((e) => e.id !== 'surge' && e.id !== 'burst'), titanFrame: null }, cfg));
    const mid = (unit) => Math.floor((place(unit).first + place(unit).last) / 2);
    expect(m.heart.frame).toBe(mid('heart'));
    expect(m.heart.exact).toBe(false);
    expect(m.heart.notes[0]).toBe('The film on the page has no event named surge.');
    expect(m.heart.notes[1]).toBe(`The middle of the span of heart is used, frame ${mid('heart')}.`);
    expect(m.marsh.frame).toBe(mid('marsh'));
    expect(m.titan.frame).toBe(mid(m.titan.unit));
    expect(m.titan.notes[0]).toBe('The film on the page has no titan frame.');
    expect(m.spine.exact).toBe(true);
  });

  it('take the event nearest the middle of the Spine when the storm has fewer than three strikes', () => {
    const two = film.events.filter((e) => !['strike-3', 'strike-4', 'strike-5', 'strike-6'].includes(e.id));
    const m = core.pickMoment(core.MOMENTS[1], { ...film, events: two }, cfg);
    expect(m.frame).toBe(event('strike-2').frame);
    expect(m.source).toBe('the event strike-2');
    expect(m.notes.join(' ')).toMatch(/has 2 of the 3 events named strike/);
    const none = core.pickMoment(core.MOMENTS[1], { ...film, events: [] }, cfg);
    expect(none.frame).toBe(Math.floor((place('spine').first + place('spine').last) / 2));
    expect(none.source).toBe('the middle of spine');
  });

  it('carry on a film with no places, no events and no titan frame', () => {
    const m = byId(core.pickMoments(testScene, cfg));
    expect(m.heart.frame).toBe(299);
    expect(m.heart.source).toBe('the middle of heart');
    expect(core.unitSpan(testScene, cfg.lookLockUnit).from).toBe('shots');
    for (const id of ['spine', 'marsh', 'titan']) {
      expect(m[id].frame).toBe(299);
      expect(m[id].source).toBe('the middle of the film');
      expect(m[id].notes[m[id].notes.length - 1]).toMatch(/has no span for \w+ either, so the middle of the film is used, frame 299\./);
    }
    expect(core.pickMoments({ ...testScene, titanFrame: 5000 }, cfg, 'titan')[0].frame).toBe(599);
  });

  it('are chosen by name, and a wrong name is refused', () => {
    expect(core.chosen('titan,heart').map((m) => m.id)).toEqual(['heart', 'titan']);
    expect(core.chosen(['marsh', 'spine']).map((m) => m.id)).toEqual(['spine', 'marsh']);
    expect(core.chosen(undefined)).toHaveLength(4);
    expect(() => core.chosen('titan,ribs')).toThrow(/ribs is not a moment/);
    expect(() => core.chosen('')).toThrow(/--moments takes a list/);
  });
});

describe('the clip', () => {
  it('is the configured length, centred on the moment and kept inside the film', () => {
    const n = Math.round(cfg.quality.stressClipSeconds * cfg.film.fps);
    expect(core.clipRange(1000, 5000, cfg.quality.stressClipSeconds, cfg.film.fps)).toEqual({ first: 1000 - Math.floor(n / 2), last: 1000 - Math.floor(n / 2) + n - 1, count: n, index: Math.floor(n / 2) });
    expect(core.clipRange(3, 5000, 1, 60)).toEqual({ first: 0, last: 59, count: 60, index: 3 });
    expect(core.clipRange(4999, 5000, 1, 60)).toEqual({ first: 4940, last: 4999, count: 60, index: 59 });
    expect(core.clipRange(5, 20, 1, 60)).toEqual({ first: 0, last: 19, count: 20, index: 5 });
  });

  it('is encoded as delivered and again at the stress rate, from raw frames on stdin with a flip', () => {
    const hd = cfg.formats.hd.id;
    const d = core.encodeSettings('delivered', hd, cfg);
    const s = core.encodeSettings('stress', hd, cfg);
    expect(d.crf).toBe(cfg.export.hd.crf);
    expect(core.encodeSettings('delivered', cfg.formats.master.id, cfg).crf).toBe(cfg.export.master.crf);
    expect(s.mbps).toBe(cfg.quality.compressionStressMbps);
    const a = core.encodeArgs({ settings: d, width: 1920, height: 1080, fps: 60, out: 'x.mp4' });
    const at = (list, flag) => list[list.indexOf(flag) + 1];
    expect(a.slice(a.indexOf('-f'), a.indexOf('-i') + 2)).toEqual(['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1920x1080', '-r', '60', '-i', '-']);
    expect(at(a, '-vf')).toMatch(/^vflip,/);
    expect(at(a, '-c:v')).toBe('libx264');
    expect(at(a, '-crf')).toBe(String(cfg.export.hd.crf));
    expect(a.filter((v) => v === cfg.export.master.pixelFormat).length).toBe(1);
    expect(a).not.toContain('-b:v');
    expect(a[a.length - 1]).toBe('x.mp4');
    const b = core.encodeArgs({ settings: s, width: 1920, height: 1080, fps: 60, out: 'y.mp4' });
    expect(at(b, '-b:v')).toBe(`${cfg.quality.compressionStressMbps}M`);
    expect(at(b, '-maxrate')).toBe(`${cfg.quality.compressionStressMbps}M`);
    expect(b).not.toContain('-crf');
    expect(() => core.encodeSettings('other', hd, cfg)).toThrow(/no such encode/);
    expect(core.stillArgs({ file: 'x.mp4', index: 30 }).join(' ')).toContain('select=eq(n\\,30)');
  });

  it('names its files by moment, format and tier', () => {
    expect(core.fileNames({ id: 'titan' }, 'hd', 'final')).toEqual({ delivered: 'titan-hd-final-delivered.mp4', stress: 'titan-hd-final-stress.mp4', stillDelivered: 'titan-hd-final-delivered.png', stillStress: 'titan-hd-final-stress.png', sideBySide: 'titan-hd-final-side-by-side.png' });
    expect(core.unitsIn(film, place('heart').last - 5, place('heart').last + 5).sort()).toEqual(['breath', 'heart']);
    expect(core.mbpsOf(1250000, 60, 60)).toBe(10);
  });
});

describe('the measures', () => {
  it('turn a frame the right way up and drop its alpha', () => {
    const rgba = Buffer.from([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255]);
    expect([...core.flipToRgb(rgba, 2, 2)]).toEqual([7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6]);
  });

  it('give a PSNR, and none for two pictures that are the same', () => {
    const a = Buffer.alloc(300, 100);
    const b = Buffer.alloc(300, 110);
    expect(core.psnr(a, b)).toBe(28.13);
    expect(core.psnr(a, a)).toBe(Infinity);
    expect(core.psnrValue(core.psnr(a, a))).toBe(null);
    expect(core.psnrText(Infinity)).toBe('no difference');
    expect(() => core.psnr(a, Buffer.alloc(3))).toThrow(/same size/);
  });

  it('find the part of the picture that changed most', () => {
    const w = 64;
    const h = 48;
    const a = Buffer.alloc(w * h * 3, 50);
    const b = Buffer.from(a);
    for (let y = 30; y < 40; y++) for (let x = 44; x < 60; x++) b[(y * w + x) * 3] = 200;
    const box = core.worstBox(a, b, w, h, 16, 12);
    expect(box.width).toBe(16);
    expect(box.height).toBe(12);
    expect(box.left).toBeGreaterThanOrEqual(40);
    expect(box.left + box.width).toBeLessThanOrEqual(w);
    expect(box.top).toBeGreaterThanOrEqual(24);
    expect(box.top + box.height).toBeLessThanOrEqual(h);
    expect(core.worstBox(a, a, w, h, 200, 200)).toEqual({ left: 0, top: 0, width: w, height: h });
  });

  it('reuse a clip only when its record matches the build and the encode', () => {
    const moment = core.pickMoments(film, cfg, 'titan')[0];
    const range = core.clipRange(moment.frame, film.frameCount, 1, 60);
    const built = { engine: 'e1', units: { reveal: 'u1', heart: 'u2' } };
    const wanted = core.want({ moment, range, format: 'hd', tier: 'final', fps: 60, built, browser: 'b', units: ['reveal'] });
    const settings = core.encodeSettings('delivered', 'hd', cfg);
    expect(wanted.units).toEqual({ reveal: 'u1' });
    expect(core.sameRecord({ ...wanted, encode: settings, made: 'x' }, wanted, settings)).toBe(true);
    expect(core.sameRecord({ ...wanted, engine: 'e2', encode: settings }, wanted, settings)).toBe(false);
    expect(core.sameRecord({ ...wanted, encode: { ...settings, crf: 30 } }, wanted, settings)).toBe(false);
    expect(core.sameRecord(null, wanted, settings)).toBe(false);
  });
});

describe('the command, on a stand-in renderer', () => {
  const small = { ...cfg, formats: { ...cfg.formats, preview: { ...cfg.formats.preview, width: 160, height: 90 } }, quality: { ...cfg.quality, stressClipSeconds: 0.2 } };
  const size = small.formats.preview;

  function renderer(theFilm) {
    const calls = { frames: [], held: 0, released: 0, closed: 0 };
    return {
      calls,
      ensureDisk: () => {},
      filmInfo: async () => theFilm,
      rendererState: async () => ({ built: { engine: 'fake-engine', units: { [cfg.lookLockUnit]: 'fake-unit' } }, browser: 'fake-browser', machine: 'fake-machine' }),
      holdRenderer: async () => (calls.held += 1),
      releaseRenderer: () => (calls.released += 1),
      closeRenderer: async () => (calls.closed += 1),
      renderRaw: async ({ frame, tier, format, hold }) => {
        calls.frames.push({ frame, tier, format, hold });
        const data = Buffer.alloc(size.width * size.height * 4, 255);
        for (let y = 0; y < size.height; y++) {
          for (let x = 0; x < size.width; x++) {
            const i = (y * size.width + x) * 4;
            data[i] = y < size.height / 2 ? 220 : 30;
            data[i + 1] = Math.round(128 + 100 * Math.cos(y / 15));
            data[i + 2] = Math.round(128 + 100 * Math.sin((x + frame) / 20));
          }
        }
        return { data, width: size.width, height: size.height, seconds: 0.01, frame, loop: null };
      }
    };
  }

  it('makes two clips, two stills, the side by side picture, their records and stress.json', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'carcass-stress-'));
    dirs.push(dir);
    const r = renderer(testScene);
    const lines = [];
    const report = await stress.stressCommand({ _: [], tier: 'draft', format: 'preview', moments: 'titan' }, { cfg: small, root: dir, renderer: r, print: (l) => lines.push(l) });
    const out = path.join(dir, core.WORK);
    const names = core.fileNames({ id: 'titan' }, 'preview', 'draft');
    for (const f of Object.values(names)) {
      expect(fs.existsSync(path.join(out, f))).toBe(true);
      expect(fs.existsSync(path.join(out, `${f}.json`))).toBe(true);
    }
    expect(r.calls.frames).toHaveLength(12);
    expect(r.calls.frames.every((c) => c.hold === true && c.tier === 'draft' && c.format === 'preview')).toBe(true);
    expect(r.calls.frames[0].frame).toBe(293);
    expect([r.calls.held, r.calls.released, r.calls.closed]).toEqual([1, 1, 1]);
    expect(report.schema).toBe(core.SCHEMA);
    expect(report.asTheFilmIsDelivered).toBe(false);
    expect(report.moments).toHaveLength(1);
    const m = report.moments[0];
    expect(m.frame).toBe(299);
    expect(m.exact).toBe(false);
    expect([m.first, m.last, m.frames]).toEqual([293, 304, 12]);
    expect(m.measured.delivered.bytes).toBeGreaterThan(500);
    expect(m.measured.delivered.psnrDb).toBeGreaterThan(20);
    expect(JSON.parse(fs.readFileSync(path.join(out, core.REPORT), 'utf8')).moments[0].files).toEqual(names);
    const still = await sharp(path.join(out, names.stillDelivered)).raw().toBuffer({ resolveWithObject: true });
    expect([still.info.width, still.info.height]).toEqual([size.width, size.height]);
    expect(still.data[0]).toBeLessThan(90);
    expect(still.data[(size.height - 1) * size.width * still.info.channels]).toBeGreaterThan(160);
    const clip = JSON.parse(fs.readFileSync(path.join(out, `${names.stress}.json`), 'utf8'));
    expect(clip.engine).toBe('fake-engine');
    expect(clip.units).toEqual({ [cfg.lookLockUnit]: 'fake-unit' });
    expect(clip.encode.mbps).toBe(cfg.quality.compressionStressMbps);
    expect([clip.format, clip.tier, clip.diag, clip.browser, clip.machine]).toEqual(['preview', 'draft', null, 'fake-browser', 'fake-machine']);
    expect(lines.every((l) => l.startsWith('stress: '))).toBe(true);
    expect(lines.join('\n')).toContain('The film on the page has no titan frame.');
    expect(lines.join('\n')).not.toMatch(/—|!/);

    const again = renderer(testScene);
    const second = await stress.stressCommand({ _: [], tier: 'draft', format: 'preview', moments: 'titan' }, { cfg: small, root: dir, renderer: again, print: () => {} });
    expect(again.calls.frames).toHaveLength(0);
    expect(second.moments[0].reused).toBe(true);
    const forced = renderer(testScene);
    await stress.stressCommand({ _: [], tier: 'draft', format: 'preview', moments: 'titan', force: true }, { cfg: small, root: dir, renderer: forced, print: () => {} });
    expect(forced.calls.frames).toHaveLength(12);
  });

  it('gives the slot back and leaves no clip when a frame fails', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'carcass-stress-'));
    dirs.push(dir);
    const r = renderer(testScene);
    const draw = r.renderRaw;
    r.renderRaw = async (o) => {
      if (o.frame === 296) throw new Error('The page reported: lost context');
      return draw(o);
    };
    await expect(stress.stressCommand({ _: [], tier: 'draft', format: 'preview', moments: 'titan' }, { cfg: small, root: dir, renderer: r, print: () => {} })).rejects.toThrow(/lost context/);
    expect([r.calls.held, r.calls.released, r.calls.closed]).toEqual([1, 1, 1]);
    expect(fs.readdirSync(path.join(dir, core.WORK)).filter((f) => f.endsWith('.mp4'))).toEqual([]);
    expect(fs.existsSync(path.join(dir, core.WORK, core.REPORT))).toBe(false);
  });

  it('refuses a tier, a format or a moment it does not know', async () => {
    const r = renderer(testScene);
    await expect(stress.stressCommand({ _: [], tier: 'best' }, { cfg: small, renderer: r })).rejects.toThrow(/no such tier: best/);
    await expect(stress.stressCommand({ _: [], format: '8k' }, { cfg: small, renderer: r })).rejects.toThrow(/no such format: 8k/);
    await expect(stress.stressCommand({ _: [], moments: 'ribs' }, { cfg: small, renderer: r })).rejects.toThrow(/ribs is not a moment/);
    expect(r.calls.held).toBe(0);
  });
});
