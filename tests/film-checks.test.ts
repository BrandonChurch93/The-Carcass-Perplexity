// @ts-nocheck
import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tool = (name) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const g5 = await tool('checks/g5');
const d2 = await tool('checks/d2');
const d7 = await tool('checks/d7');
const { config, ROOT } = await tool('lib/paths');

const cfg = config();
const fps = cfg.film.fps;
const now = { engine: 'e1', units: { ribs: 'r1', heart: 'h1' } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'carcass-film-checks-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));
const put = (root, file, value) => {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, typeof value === 'string' ? value : JSON.stringify(value));
};
const cut = { fps, frameCount: 11861 };
const previewFrames = Math.ceil((cut.frameCount * cfg.film.previewFps) / fps);
const goodPreview = { width: cfg.formats.preview.width, height: cfg.formats.preview.height, fps: cfg.film.previewFps, frames: previewFrames, sound: true };
const proofCount = cfg.export.local.proofSeconds * fps;
const goodPart = { width: cfg.formats.preview.width, height: cfg.formats.preview.height, fps, frames: proofCount, sound: false };
const proof = (o = {}) => ({
  format: cfg.formats.preview.id,
  tier: 'draft',
  built: now,
  film: { file: 'out/work/local/proof-film.mp4', first: 982, last: 982 + proofCount - 1, cut: 1042 },
  loop: { file: 'out/work/local/proof-loop.mp4', first: 0, last: proofCount - 1 },
  ...o
});

describe('G5, the capture page', () => {
  const clean = { carcass: true, canvases: 1, boxed: [], text: '' };
  it('passes a page that holds one canvas and nothing else', () => {
    expect(g5.documentFaults(clean).faults).toEqual([]);
  });

  it('fails a page with no canvas, two canvases, another element with a box, or text', () => {
    expect(g5.documentFaults({ ...clean, canvases: 0 }).faults).toHaveLength(1);
    expect(g5.documentFaults({ ...clean, canvases: 2 }).faults).toHaveLength(1);
    expect(g5.documentFaults({ ...clean, boxed: ['div#hud'] }).faults[0]).toContain('div#hud');
    expect(g5.documentFaults({ ...clean, text: 'frame 12' }).faults[0]).toContain('frame 12');
    expect(g5.documentFaults({ ...clean, carcass: false }).faults).toHaveLength(1);
  });
});

describe('G5, the source of the tools', () => {
  const harness = { file: g5.HARNESS, text: 'const size = await page.evaluate((url) => window.__carcass.grab(url), u);' };
  const film = { file: 'tools/film.mjs', text: "import { makeFilm } from './lib/film-run.mjs';" };
  const run = { file: 'tools/lib/film-run.mjs', text: "import { renderRaw } from './render.mjs';" };

  it('reads the local imports of a file', () => {
    expect(g5.localImports("import a from './a.mjs';\nconst b = await import('../b.mjs');\nimport fs from 'node:fs';")).toEqual(['./a.mjs', '../b.mjs']);
  });

  it('passes tools that reach pixels through the harness', () => {
    expect(g5.sourceFaults({ sources: [film, run, harness] }, ['tools/film.mjs']).faults).toEqual([]);
  });

  it('fails a screenshot call and a canvas read by another way, and names the line', () => {
    const bad = { file: 'tools/lib/film-run.mjs', text: `${run.text}\nawait page.screenshot({ path: 'x.png' });` };
    const r = g5.sourceFaults({ sources: [film, bad, harness] }, ['tools/film.mjs']);
    expect(r.faults).toHaveLength(1);
    expect(r.faults[0]).toContain('tools/lib/film-run.mjs line 2');
    for (const text of ['canvas.toDataURL()', 'canvas.toBlob(cb)', "client.send('Page.captureScreenshot')", 'canvas.captureStream(60)']) {
      expect(g5.sourceFaults({ sources: [film, { ...run, text: `${run.text}\n${text}` }, harness] }, ['tools/film.mjs']).faults).toHaveLength(1);
    }
  });

  it('fails a tool that does not reach the harness, and a harness without grab', () => {
    expect(g5.sourceFaults({ sources: [{ file: 'tools/film.mjs', text: '' }, harness] }, ['tools/film.mjs']).faults[0]).toContain('does not reach');
    expect(g5.sourceFaults({ sources: [film, run, { file: g5.HARNESS, text: '' }] }, ['tools/film.mjs']).faults[0]).toContain('never calls');
  });

  it('skips a tool that is not there yet and fails a missing import', () => {
    expect(g5.sourceFaults({ sources: [film, run, harness], missing: ['tools/loop.mjs'] }, ['tools/film.mjs', 'tools/loop.mjs'])).toMatchObject({ faults: [], skipped: [expect.stringContaining('tools/loop.mjs')] });
    expect(g5.sourceFaults({ sources: [film, run, harness], missing: ['tools/lib/gone.mjs'] }, ['tools/film.mjs']).faults).toHaveLength(1);
  });

  it('passes the tools of this repo', () => {
    const read = g5.sourcesOf(ROOT);
    expect(read.missing).toEqual([]);
    expect(read.sources.map((s) => s.file)).toEqual(expect.arrayContaining([...g5.FRAME_TOOLS, g5.HARNESS, 'tools/lib/film-core.mjs']));
    expect(g5.sourceFaults(read).faults).toEqual([]);
  });

  it('runs with a stand-in page', async () => {
    const ctx = { root: ROOT, config: cfg, phase: 2, renderer: async () => ({}) };
    const good = await g5.runG5(ctx, async () => ({ carcass: true, canvases: 1, boxed: [], text: '' }));
    expect(good.ok).toBe(true);
    expect(good.lines).toHaveLength(2);
    const bad = await g5.runG5(ctx, async () => ({ carcass: true, canvases: 1, boxed: ['div'], text: 'hud' }));
    expect(bad.ok).toBe(false);
    const broken = await g5.runG5({ ...ctx, renderer: async () => { throw new Error('no browser'); } }, async () => ({}));
    expect(broken.ok).toBe(false);
    expect(broken.lines[0]).toContain('no browser');
  });
});

describe('D2, the film of the blockout', () => {
  const file = `out/work/film/${cfg.export.files.preview}`;
  const faults = (o = {}) => d2.previewFaults({ file, probe: goodPreview, record: { built: now }, cut, now, ...o }, cfg).faults;

  it('passes a preview film of the right size, rate, length and build', () => {
    expect(faults()).toEqual([]);
    expect(faults({ record: { built: { engine: 'e1', units: { heart: 'h1', ribs: 'r1' } } } })).toEqual([]);
  });

  it('fails the wrong size, rate or frame count', () => {
    expect(faults({ probe: { ...goodPreview, width: 1920, height: 1080 } })).toHaveLength(1);
    expect(faults({ probe: { ...goodPreview, fps } })).toHaveLength(1);
    expect(faults({ probe: { ...goodPreview, frames: previewFrames - 1 } })).toHaveLength(1);
    expect(faults({ probe: { ...goodPreview, width: null } })).toEqual([`${file} holds no picture stream.`]);
    expect(faults({ cut: null })).toHaveLength(1);
  });

  it('fails a film with no record or from another build', () => {
    expect(faults({ record: null })[0]).toContain('no record');
    expect(faults({ record: { built: { engine: 'e0', units: now.units } } })[0]).toContain('another build');
    expect(faults({ record: { built: { engine: 'e1', units: { ...now.units, heart: 'h2' } } } })[0]).toContain('another build');
    expect(faults({ record: {} })[0]).toContain('another build');
  });

  it('looks in deliver/film and then in out/work/film', async () => {
    const root = path.join(tmp, 'd2');
    const ctx = { root, config: cfg, phase: 2 };
    const none = await d2.runD2(ctx, () => goodPreview, () => now);
    expect(none.ok).toBe(false);
    expect(none.lines[0]).toContain(cfg.export.files.preview);
    put(root, 'cut/CUTLIST.json', cut);
    put(root, file, 'x');
    put(root, `${file}.json`, { built: now });
    expect((await d2.runD2(ctx, () => goodPreview, () => now)).ok).toBe(true);
    expect((await d2.runD2(ctx, () => goodPreview, () => ({ ...now, engine: 'e2' }))).ok).toBe(false);
    put(root, `deliver/film/${cfg.export.files.preview}`, 'x');
    const first = await d2.runD2(ctx, () => goodPreview, () => now);
    expect(first.ok).toBe(false);
    expect(first.lines.join(' ')).toContain('deliver/film');
  });
});

describe('D7, the local render proof', () => {
  const faults = (o = {}) => d7.proofFaults({ proof: proof(), probes: { film: goodPart, loop: goodPart }, now, phase: 2, ...o }, cfg);

  it('passes a proof of the current build, and in Phase 2 asks for the film only', () => {
    expect(faults().faults).toEqual([]);
    expect(faults({ probes: { film: goodPart, loop: null } }).faults).toEqual([]);
    expect(faults().skipped).toHaveLength(1);
    expect(faults({ proof: proof({ loop: undefined }), probes: { film: goodPart, loop: null } }).faults).toEqual([]);
  });

  it('asks for the loop in Phase 6', () => {
    expect(faults({ phase: 6 }).faults).toEqual([]);
    expect(faults({ phase: 6, probes: { film: goodPart, loop: null } }).faults).toHaveLength(1);
    expect(faults({ phase: 6, proof: proof({ loop: undefined }) }).faults).toHaveLength(1);
    expect(faults({ phase: 6, probes: { film: goodPart, loop: { ...goodPart, frames: 5 } } }).faults).toHaveLength(1);
  });

  it('fails a proof from another build, format or tier', () => {
    expect(faults({ now: { ...now, engine: 'e2' } }).faults[0]).toContain('another build');
    expect(faults({ proof: proof({ format: cfg.formats.hd.id }) }).faults).toHaveLength(1);
    expect(faults({ proof: proof({ tier: 'final' }) }).faults).toHaveLength(1);
  });

  it('fails a film part of the wrong size, rate or frame count, or one that is gone', () => {
    expect(faults({ probes: { film: { ...goodPart, width: 1920 }, loop: goodPart } }).faults).toHaveLength(1);
    expect(faults({ probes: { film: { ...goodPart, fps: cfg.film.previewFps }, loop: goodPart } }).faults).toHaveLength(1);
    expect(faults({ probes: { film: { ...goodPart, frames: proofCount - 1 }, loop: goodPart } }).faults).toHaveLength(1);
    expect(faults({ probes: { film: null, loop: goodPart } }).faults[0]).toContain('is not there');
    expect(faults({ proof: proof({ film: { file: 'out/work/local/proof-film.mp4', first: 0, last: 9, cut: null } }) }).faults).toHaveLength(1);
  });

  it('reads the proof from out/work/local', async () => {
    const root = path.join(tmp, 'd7');
    const ctx = { root, config: cfg, phase: 2 };
    const none = await d7.runD7(ctx, () => goodPart, () => now);
    expect(none.ok).toBe(false);
    expect(none.lines[0]).toContain(d7.PROOF);
    put(root, d7.PROOF, proof());
    expect((await d7.runD7(ctx, () => goodPart, () => now)).ok).toBe(false);
    put(root, 'out/work/local/proof-film.mp4', 'x');
    expect((await d7.runD7(ctx, () => goodPart, () => now)).ok).toBe(true);
    expect((await d7.runD7({ ...ctx, phase: 6 }, () => goodPart, () => now)).ok).toBe(false);
    put(root, 'out/work/local/proof-loop.mp4', 'x');
    expect((await d7.runD7({ ...ctx, phase: 6 }, () => goodPart, () => now)).ok).toBe(true);
  });
});
