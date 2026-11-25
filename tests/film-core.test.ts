// @ts-nocheck
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const tool = (name) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const core = await tool('lib/film-core');
const local = await tool('render-local');
const { config, rel } = await tool('lib/paths');

const cfg = config();
const cut = JSON.parse(fs.readFileSync(rel('cut', 'CUTLIST.json'), 'utf8'));
const fps = cfg.film.fps;
const size = cfg.sandbox.chunkSeconds * fps;
const preview = cfg.formats.preview.id;
const hd = cfg.formats.hd.id;
const master = cfg.formats.master.id;
const oneShot = { fps, frameCount: 600, shots: [{ id: 'test', unit: null, first: 0, last: 599, key: null }], keyFrames: {}, loop: { frameCount: 480, unit: 'heart' } };
const whole = { first: 0, last: cut.frameCount - 1, whole: true };
const renderer = { built: { engine: 'e1', units: { ribs: 'r1', heart: 'h1' } }, browser: '147.0', machine: 'vm-a' };
const plan = (o = {}) => core.chunkPlan({ first: 0, last: cut.frameCount - 1, shots: cut.shots, cfg, format: preview, tier: 'draft', rate: fps, ...o });
const has = (argv, ...run) => argv.some((_, i) => run.every((v, j) => argv[i + j] === v));

describe('the frames of a render', () => {
  it('takes every frame at film.fps and every multiple of the step at a lower rate', () => {
    expect(core.rateOf(cfg, null)).toEqual({ rate: fps, step: 1 });
    expect(core.rateOf(cfg, cfg.film.previewFps)).toEqual({ rate: cfg.film.previewFps, step: fps / cfg.film.previewFps });
    expect(core.rateOf(cfg, String(cfg.film.previewFps)).step).toBe(fps / cfg.film.previewFps);
    expect(core.spanFrames({ first: 3, last: 9, step: 1 })).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect(core.spanFrames({ first: 3, last: 9, step: 2 })).toEqual([4, 6, 8]);
    expect(core.spanFrames({ first: 0, last: 239, step: 2 })).toHaveLength(120);
  });

  it('refuses a rate that does not divide film.fps', () => {
    for (const bad of [7, 0, -30, 2.5, 'x', fps * 2]) expect(() => core.rateOf(cfg, bad)).toThrow(/divides film.fps/);
  });

  it('counts frames the way it lists them', () => {
    for (const step of [1, 2, 3, 4]) for (let a = 0; a < 9; a++) for (let b = a; b < 20; b++) expect(core.countFrames({ first: a, last: b, step })).toBe(core.spanFrames({ first: a, last: b, step }).length);
    expect(core.countFrames({ first: 0, last: cut.frameCount - 1, step: 2 })).toBe(Math.ceil(cut.frameCount / 2));
  });
});

describe('the span', () => {
  it('reads a place from places, and from the shots when the page has no places', () => {
    const place = cut.places[1];
    expect(core.unitSpan(cut, place.unit)).toEqual({ first: place.first, last: place.last, from: 'places' });
    expect(core.unitSpan({ shots: cut.shots }, place.unit)).toEqual({ first: place.first, last: place.last, from: 'shots' });
    expect(() => core.unitSpan(oneShot, 'heart')).toThrow(/no place and no shot/);
  });

  it('defaults to the whole film and says when a span is whole', () => {
    expect(core.resolveSpan({ frameCount: 600 })).toMatchObject({ first: 0, last: 599, whole: true });
    expect(core.resolveSpan({ frameCount: 600, first: '0', last: '239' })).toMatchObject({ first: 0, last: 239, whole: false });
    expect(core.resolveSpan({ frameCount: cut.frameCount, unit: cut.places[0].unit, film: cut })).toMatchObject({ first: 0, last: cut.places[0].last, whole: false });
  });

  it('refuses a span outside the film', () => {
    expect(() => core.resolveSpan({ frameCount: 600, first: 10, last: 5 })).toThrow();
    expect(() => core.resolveSpan({ frameCount: 600, last: 600 })).toThrow();
    expect(() => core.resolveSpan({ frameCount: 600, first: 'a' })).toThrow();
    expect(() => core.resolveSpan({ frameCount: 600, first: 0, unit: 'heart', film: cut })).toThrow(/--unit/);
  });
});

describe('the chunk plan', () => {
  it('covers every frame of the cut list once, in order', () => {
    const p = plan();
    expect(p[0].first).toBe(0);
    expect(p.at(-1).last).toBe(cut.frameCount - 1);
    for (let i = 1; i < p.length; i++) expect(p[i].first).toBe(p[i - 1].last + 1);
    expect(p.reduce((n, c) => n + c.frames, 0)).toBe(cut.frameCount);
    expect(p.map((c) => c.index)).toEqual(p.map((_, i) => i));
  });

  it('holds no chunk longer than sandbox.chunkSeconds and none that crosses a cut', () => {
    for (const c of plan()) {
      expect(c.last - c.first + 1).toBeLessThanOrEqual(size);
      const shot = cut.shots.find((s) => c.first >= s.first && c.first <= s.last);
      expect(c.last).toBeLessThanOrEqual(shot.last);
      expect(c.shot).toBe(shot.id);
      expect(c.unit).toBe(shot.unit);
    }
    for (const s of cut.shots.slice(1)) expect(plan().some((c) => c.first === s.first)).toBe(true);
  });

  it('names a chunk from its frames, the format, the tier and the rate', () => {
    const p = plan({ rate: cfg.film.previewFps });
    expect(p[0].name).toBe(`film-${preview}-draft-${cfg.film.previewFps}fps-000000-${String(size - 1).padStart(6, '0')}`);
    expect(new Set(p.map((c) => c.name)).size).toBe(p.length);
    expect(plan({ tier: 'final' })[0].name).not.toBe(plan()[0].name);
    expect(plan({ format: hd })[0].name).not.toBe(plan()[0].name);
    expect(p[0].name).not.toBe(plan()[0].name);
  });

  it('holds the frames of the preview film at film.previewFps', () => {
    const p = plan({ rate: cfg.film.previewFps });
    expect(p.reduce((n, c) => n + c.frames, 0)).toBe(Math.ceil((cut.frameCount * cfg.film.previewFps) / fps));
    expect(p.every((c) => c.frames > 0)).toBe(true);
  });

  it('gives a partial span the same chunks as the whole film where they are whole', () => {
    const names = new Set(plan().map((c) => c.name));
    const part = plan({ first: 0, last: size * 2 - 1 });
    expect(part).toHaveLength(2);
    expect(part.every((c) => names.has(c.name))).toBe(true);
    const place = cut.places[2];
    const mid = plan({ first: place.first, last: place.last });
    expect(mid.every((c) => names.has(c.name))).toBe(true);
    const odd = plan({ first: 7, last: size + 3 });
    expect(odd.map((c) => [c.first, c.last])).toEqual([[7, size - 1], [size, size + 3]]);
  });

  it('plans a film of one shot and a loop with no shots', () => {
    const one = core.chunkPlan({ first: 0, last: 599, shots: oneShot.shots, cfg, format: preview, tier: 'draft', rate: fps });
    expect(one).toHaveLength(Math.ceil(600 / size));
    const loop = core.chunkPlan({ what: 'loop', first: 0, last: 479, shots: [], unit: 'heart', cfg, format: master, tier: 'final', rate: fps });
    expect(loop).toHaveLength(Math.ceil(480 / size));
    expect(loop[0].name.startsWith('loop-')).toBe(true);
    expect(loop.every((c) => c.unit === 'heart')).toBe(true);
    expect(core.chunkPlan({ what: 'loop', first: 60, last: 179, shots: [], cfg, format: master, tier: 'final', rate: fps }).map((c) => c.first)).toEqual([60, size].filter((v, i) => i === 0 || v > 60 && v <= 179));
  });
});

describe('a share of the plan', () => {
  const p = plan();
  it('takes chunks by number or by name', () => {
    expect(core.shareOf(p, { chunks: '0,2' }).map((c) => c.index)).toEqual([0, 2]);
    expect(core.shareOf(p, { chunks: p[5].name }).map((c) => c.index)).toEqual([5]);
    expect(() => core.shareOf(p, { chunks: String(p.length) })).toThrow(/no chunk/);
    expect(() => core.shareOf(p, { chunks: 'nothing' })).toThrow(/no chunk/);
  });

  it('gives every chunk to one part of K', () => {
    const k = 5;
    const parts = Array.from({ length: k }, (_, i) => core.shareOf(p, { of: k, part: i + 1 }));
    expect(parts.flat().map((c) => c.index).sort((a, b) => a - b)).toEqual(p.map((c) => c.index));
    expect(Math.max(...parts.map((x) => x.length)) - Math.min(...parts.map((x) => x.length))).toBeLessThanOrEqual(1);
  });

  it('refuses a part outside 1 to K and a mix of the two ways', () => {
    expect(() => core.shareOf(p, { of: 3, part: 4 })).toThrow();
    expect(() => core.shareOf(p, { of: 3, part: 0 })).toThrow();
    expect(() => core.shareOf(p, { of: 3 })).toThrow();
    expect(() => core.shareOf(p, { chunks: '1', of: 3, part: 1 })).toThrow();
    expect(core.shareOf(p)).toBe(p);
  });
});

describe('the ffmpeg arguments of a chunk', () => {
  const a = core.chunkArgs({ cfg, format: preview, rate: cfg.film.previewFps, out: 'x.mp4' });
  it('reads raw RGBA frames from stdin at the size of the format', () => {
    expect(has(a, '-f', 'rawvideo')).toBe(true);
    expect(has(a, '-pix_fmt', 'rgba')).toBe(true);
    expect(has(a, '-s', `${cfg.formats.preview.width}x${cfg.formats.preview.height}`)).toBe(true);
    expect(has(a, '-i', 'pipe:0')).toBe(true);
    expect(a.indexOf('rgba')).toBeLessThan(a.indexOf('pipe:0'));
  });

  it('flips the picture, has no sound and the right rate', () => {
    expect(a[a.indexOf('-vf') + 1].startsWith('vflip')).toBe(true);
    expect(a).toContain('-an');
    expect(a.filter((v, i) => v === '-r' && a[i + 1] === String(cfg.film.previewFps))).toHaveLength(2);
    expect(a.at(-1)).toBe('x.mp4');
  });

  it('encodes H.264 in the pixel format of the master with a closed group of pictures', () => {
    expect(has(a, '-c:v', 'libx264')).toBe(true);
    expect(has(a, '-pix_fmt', cfg.export.master.pixelFormat)).toBe(true);
    expect(a[a.indexOf('-flags:v') + 1]).toContain('+cgop');
    expect(Number(a[a.indexOf('-g') + 1])).toBe(cfg.film.previewFps);
  });

  it('takes the quality of each format from the config', () => {
    expect(has(a, '-b:v', `${cfg.export.preview.bitrateMbps}M`)).toBe(true);
    expect(a).not.toContain('-crf');
    const m = core.chunkArgs({ cfg, format: master, rate: fps, out: 'x.mp4' });
    expect(has(m, '-crf', String(cfg.export.master.crf))).toBe(true);
    expect(m).not.toContain('-b:v');
    expect(has(m, '-s', `${cfg.formats.master.width}x${cfg.formats.master.height}`)).toBe(true);
    const h = core.chunkArgs({ cfg, format: hd, rate: fps, out: 'x.mp4' });
    expect(has(h, '-crf', String(cfg.export.hd.crf))).toBe(true);
    expect(() => core.chunkArgs({ cfg, format: 'vhs', rate: fps, out: 'x.mp4' })).toThrow(/No such format/);
  });

  it('writes no date into the file', () => {
    expect(has(a, '-fflags', '+bitexact')).toBe(true);
    expect(has(a, '-map_metadata', '-1')).toBe(true);
  });

  it('has an editing codec for the local render', () => {
    const e = core.editArgs({ cfg, format: master, rate: fps, out: 'x.mov' });
    expect(has(e, '-c:v', 'prores_ks')).toBe(true);
    expect(has(e, '-f', cfg.export.local.container)).toBe(true);
    expect(e[e.indexOf('-vf') + 1].startsWith('vflip')).toBe(true);
  });
});

describe('the join', () => {
  it('uses the concat demuxer and copies the picture', () => {
    const a = core.joinArgs({ cfg, list: 'l.txt', out: 'o.mp4' });
    expect(has(a, '-f', 'concat')).toBe(true);
    expect(has(a, '-i', 'l.txt')).toBe(true);
    expect(has(a, '-c:v', 'copy')).toBe(true);
    expect(a).toContain('-an');
    expect(a).not.toContain('libx264');
    expect(a).not.toContain('-crf');
  });

  it('adds the mix whole for the whole film', () => {
    const a = core.joinArgs({ cfg, list: 'l.txt', out: 'o.mp4', sound: { file: 'mix.flac', whole: true, from: 0, seconds: 197.6833 } });
    expect(has(a, '-i', 'mix.flac')).toBe(true);
    expect(has(a, '-map', '1:a')).toBe(true);
    expect(has(a, '-c:v', 'copy')).toBe(true);
    expect(has(a, '-c:a', cfg.export.master.audioCodec)).toBe(true);
    expect(has(a, '-b:a', `${cfg.export.master.audioKbps}k`)).toBe(true);
    expect(a).not.toContain('-an');
    expect(a).not.toContain('-filter_complex');
  });

  it('cuts the mix to a partial span', () => {
    const sound = { file: 'mix.flac', ...core.soundSpan({ cfg, first: 2 * fps, last: 4 * fps - 1, rate: cfg.film.previewFps, whole: false }) };
    expect(sound).toMatchObject({ from: 2, seconds: 2, whole: false });
    const a = core.joinArgs({ cfg, list: 'l.txt', out: 'o.mp4', sound });
    const filter = a[a.indexOf('-filter_complex') + 1];
    expect(filter).toContain('atrim=start=2,');
    expect(filter).toContain('atrim=end=2[a]');
    expect(has(a, '-map', '[a]')).toBe(true);
  });

  it('starts the sound at the first frame that is rendered', () => {
    expect(core.soundSpan({ cfg, first: 3, last: 10, rate: fps / 2, whole: false })).toMatchObject({ from: 4 / fps, seconds: 4 / (fps / 2) });
  });

  it('lists the chunks in order and escapes a quote', () => {
    expect(core.concatList(['/a/one.mp4', "/b/it's.mp4"])).toBe("file '/a/one.mp4'\nfile '/b/it'\\''s.mp4'\n");
  });

  it('scales a larger film down with its sound copied', () => {
    const a = core.scaleArgs({ cfg, src: 'big.mp4', format: hd, rate: fps, srcRate: fps, out: 'o.mp4' });
    expect(a[a.indexOf('-vf') + 1]).toBe(`scale=${cfg.formats.hd.width}:${cfg.formats.hd.height}:flags=lanczos`);
    expect(has(a, '-c:a', 'copy')).toBe(true);
    expect(has(a, '-crf', String(cfg.export.hd.crf))).toBe(true);
    const p = core.scaleArgs({ cfg, src: 'big.mp4', format: preview, rate: cfg.film.previewFps, srcRate: fps, out: 'o.mp4' });
    expect(p[p.indexOf('-vf') + 1]).toContain(`mod(n\\,${fps / cfg.film.previewFps})`);
    expect(() => core.scaleArgs({ cfg, src: 'big.mp4', format: preview, rate: 45, srcRate: fps, out: 'o.mp4' })).toThrow();
  });

  it('makes the web copy of the loop from deliver.cardLoop', () => {
    const a = core.webArgs({ cfg, src: 'loop.mp4', rate: fps, out: 'o.mp4' });
    expect(a[a.indexOf('-vf') + 1]).toContain(`scale=${cfg.deliver.cardLoop.webWidth}:-2`);
    expect(has(a, '-b:v', `${cfg.deliver.cardLoop.webBitrateMbps}M`)).toBe(true);
    expect(a).toContain('-an');
    const s = core.webSize(cfg, master);
    expect(s.width).toBe(cfg.deliver.cardLoop.webWidth);
    expect(s.height).toBe((cfg.formats.master.height * s.width) / cfg.formats.master.width);
  });
});

describe('the records', () => {
  const chunk = plan()[0];
  const want = core.chunkRecord({ renderer, chunk, format: preview, tier: 'draft', rate: fps });

  it('holds the renderer state, the format, the tier, the rate and the frames', () => {
    expect(want).toMatchObject({ kind: 'chunk', what: 'film', name: chunk.name, format: preview, tier: 'draft', rate: fps, first: chunk.first, last: chunk.last, frames: chunk.frames, built: renderer.built, browser: renderer.browser, machine: renderer.machine });
    expect(want.units).toEqual({ ribs: 'r1' });
  });

  it('reuses a chunk only when its record matches the current state', () => {
    const stored = JSON.parse(JSON.stringify({ ...want, secondsPerFrame: 1.6 }));
    expect(core.chunkMatches(stored, want)).toBe(true);
    expect(core.chunkMatches({ ...stored, machine: 'vm-b' }, want)).toBe(true);
    const other = (r) => core.chunkRecord({ renderer: r, chunk, format: preview, tier: 'draft', rate: fps });
    expect(core.chunkMatches(stored, other({ ...renderer, built: { engine: 'e2', units: renderer.built.units } }))).toBe(false);
    expect(core.chunkMatches(stored, other({ ...renderer, built: { engine: 'e1', units: { ribs: 'r2', heart: 'h1' } } }))).toBe(false);
    expect(core.chunkMatches(stored, other({ ...renderer, built: { engine: 'e1', units: { ribs: 'r1', heart: 'h2' } } }))).toBe(true);
    expect(core.chunkMatches(stored, other({ ...renderer, browser: '148.0' }))).toBe(false);
    expect(core.chunkMatches(stored, core.chunkRecord({ renderer, chunk, format: preview, tier: 'final', rate: fps }))).toBe(false);
    expect(core.chunkMatches(stored, core.chunkRecord({ renderer, chunk, format: preview, tier: 'draft', rate: fps, edit: true }))).toBe(false);
    expect(core.chunkMatches(null, want)).toBe(false);
    expect(core.chunkMatches({}, want)).toBe(false);
  });

  it('names the chunks of a joined file', () => {
    const p = plan({ first: 0, last: size * 2 - 1 });
    const r = core.joinRecord({ renderer, name: 'x.mp4', format: preview, tier: 'draft', rate: fps, first: 0, last: size * 2 - 1, frames: size * 2, chunks: p, sound: 'audio/mix/mix.flac' });
    expect(r.chunks).toEqual(p.map((c) => c.name));
    expect(r).toMatchObject({ kind: 'film', built: renderer.built, browser: renderer.browser, sound: 'audio/mix/mix.flac', frames: size * 2, whole: false });
  });

  it('names loop frame 0, the format, the tier and the build in the record of the card still', () => {
    expect(core.stillRecord({ renderer, format: master, tier: 'final', unit: 'heart' })).toMatchObject({ kind: 'card-still', loop: 0, format: master, tier: 'final', built: renderer.built, units: { heart: 'h1' } });
  });

  it('knows the same build whatever the order of its units', () => {
    expect(core.sameBuild({ engine: 'e', units: { a: '1', b: '2' } }, { engine: 'e', units: { b: '2', a: '1' } })).toBe(true);
    expect(core.sameBuild({ engine: 'e', units: { a: '1' } }, { engine: 'e', units: { a: '2' } })).toBe(false);
    expect(core.sameBuild(undefined, { engine: 'e', units: {} })).toBe(false);
  });
});

describe('the names from export.files', () => {
  const files = cfg.export.files;
  const name = (o) => core.filmName({ cfg, tier: 'final', rate: fps, span: whole, film: cut, ...o });
  it('names the whole film by its format', () => {
    expect(name({ format: master })).toBe(files.master);
    expect(name({ format: hd })).toBe(files.hd);
    expect(name({ format: preview, rate: cfg.film.previewFps })).toBe(files.preview);
  });

  it('names the span of the Heart in formats.hd', () => {
    const heart = cut.places.find((p) => p.unit === cfg.lookLockUnit);
    const span = { first: heart.first, last: heart.last, whole: false };
    expect(name({ format: hd, span })).toBe(files.heartReview);
    expect(name({ format: hd, span, film: { shots: cut.shots } })).toBe(files.heartReview);
    expect(name({ format: preview, span })).not.toBe(files.heartReview);
  });

  it('says the frames of a partial span and a rate that is not the own rate of the format', () => {
    expect(name({ format: preview, tier: 'draft', rate: 30, span: { first: 0, last: 239, whole: false } })).toBe(`film-${preview}-draft-30fps-000000-000239.mp4`);
    expect(name({ format: preview, rate: fps })).not.toBe(files.preview);
    expect(name({ format: preview, rate: fps })).toContain(`${fps}fps`);
  });

  it('names the loop, its web copy and the card still', () => {
    expect(core.loopNames({ cfg, format: master, tier: 'final', span: { first: 0, last: 479, whole: true } })).toEqual({ loop: files.cardLoop, web: files.cardLoopWeb, still: files.cardStill });
    const part = core.loopNames({ cfg, format: preview, tier: 'draft', span: { first: 0, last: 59, whole: false } });
    expect(part.loop).toContain('000000-000059');
    expect(part.loop).not.toBe(files.cardLoop);
    expect(part.still).toBe(files.cardStill);
  });
});

describe('the reading of ffprobe', () => {
  const json = JSON.stringify({ streams: [{ codec_type: 'video', codec_name: 'h264', pix_fmt: 'yuv420p', width: 960, height: 540, r_frame_rate: '30/1', nb_read_packets: '120' }, { codec_type: 'audio' }] });
  it('reads the size, the rate, the frames and the sound', () => {
    expect(core.readProbe(json)).toEqual({ width: 960, height: 540, fps: 30, frames: 120, codec: 'h264', pixelFormat: 'yuv420p', sound: true });
    expect(core.readProbe({ streams: [] })).toMatchObject({ width: null, frames: null, sound: false });
  });

  it('says what is wrong with a file', () => {
    const p = core.readProbe(json);
    expect(core.probeFaults(p, { width: 960, height: 540, fps: 30, frames: 120, sound: true })).toEqual([]);
    expect(core.probeFaults(p, { width: 1920, height: 1080, fps: 60, frames: 119, sound: false })).toHaveLength(4);
    expect(core.probeFaults(core.readProbe({ streams: [] }), { width: 1, height: 1, fps: 1, frames: 1 })).toEqual(['it holds no picture stream']);
  });
});

describe('small things', () => {
  it('finds the newest mix', () => {
    expect(core.newestMix([{ file: 'a/mix.flac', mtimeMs: 1 }, { file: 'a/mix-2.wav', mtimeMs: 5 }, { file: 'a/mix.json', mtimeMs: 9 }])).toBe('a/mix-2.wav');
    expect(core.newestMix([{ file: 'a/mix.json', mtimeMs: 9 }])).toBe(null);
  });

  it('prints one line a chunk with the seconds a frame took and the time left', () => {
    const chunk = plan()[0];
    const line = core.chunkLine({ done: 1, total: 4, chunk, perFrame: 1.613, framesLeft: 360 });
    expect(line).toBe(`chunk 1 of 4, ${chunk.name}, ${chunk.frames} frames, 1.61 s a frame, 9 min 41 s left`);
    expect(core.chunkLine({ done: 1, total: 4, chunk, reused: true })).toContain('kept from an earlier run');
    expect(core.clock(42)).toBe('42 s');
    expect(core.clock(7500)).toBe('2 h 05 min');
  });

  it('takes the proof across the first cut, or from the middle of a film of one shot', () => {
    const n = cfg.export.local.proofSeconds * fps;
    const across = core.proofSpan({ film: cut, cfg });
    expect(across.cut).toBe(cut.shots[1].first);
    expect(across.last - across.first + 1).toBe(n);
    expect(across.first).toBeLessThan(across.cut);
    expect(across.last).toBeGreaterThanOrEqual(across.cut);
    const middle = core.proofSpan({ film: oneShot, cfg });
    expect(middle).toEqual({ first: 300 - n / 2, last: 300 + n / 2 - 1, cut: null, frames: n });
    expect(core.proofSpan({ film: oneShot, cfg, loop: true })).toEqual({ first: 0, last: n - 1, cut: null, frames: n });
    expect(core.testSpan({ film: cut, cfg })).toEqual({ first: 0, last: cfg.export.local.testSeconds * fps - 1, frames: cfg.export.local.testSeconds * fps });
  });

  it('checks the length of the film before the local render starts', () => {
    const film = { fps, frameCount: cut.frameCount, shots: cut.shots };
    expect(core.lengthFaults({ film, cfg, cut, plan: plan() })).toEqual([]);
    expect(core.lengthFaults({ film: oneShot, cfg, cut, plan: plan() })).toHaveLength(2);
    expect(core.lengthFaults({ film: { ...film, fps: 24 }, cfg, cut, plan: plan() })).toHaveLength(1);
  });

  it('looks for Chrome in the usual places and then in CARCASS_BROWSER', () => {
    const mac = core.chromePaths({ platform: 'darwin', env: { CARCASS_BROWSER: '/x/chrome' }, home: '/Users/b' });
    expect(mac[0]).toBe('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    expect(mac.at(-1)).toBe('/x/chrome');
    const win = core.chromePaths({ platform: 'win32', env: { PROGRAMFILES: 'C:\\Program Files', LOCALAPPDATA: 'C:\\Users\\b\\AppData\\Local' } });
    expect(win[0]).toBe('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
    expect(win).toHaveLength(2);
    expect(core.chromePaths({ platform: 'linux' })).toContain('/usr/bin/google-chrome');
    expect(local.findChrome({ platform: 'linux', env: { CARCASS_BROWSER: '/x/chrome' }, exists: (p) => p === '/x/chrome' })).toBe('/x/chrome');
    expect(local.findChrome({ platform: 'darwin', env: { CARCASS_BROWSER: '/x/chrome' }, home: '/Users/b', exists: () => true })).toBe('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    expect(() => local.findChrome({ platform: 'linux', env: {}, exists: () => false })).toThrow(/No installed Chrome/);
    expect(core.LOCAL_FLAGS.some((f) => f.includes('swiftshader'))).toBe(false);
  });

  it('measures PSNR', () => {
    expect(core.psnr(Buffer.from([1, 2, 3]), Buffer.from([1, 2, 3]))).toBe(Infinity);
    expect(core.psnr(Buffer.from([0, 0]), Buffer.from([255, 255]))).toBe(0);
    expect(() => core.psnr(Buffer.from([0]), Buffer.from([0, 0]))).toThrow();
  });
});
