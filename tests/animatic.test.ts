// @ts-nocheck
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { config, readJson, rel } from '../tools/lib/paths.mjs';
import * as core from '../tools/lib/animatic-core.mjs';
import { drawer, still } from '../tools/lib/animatic-draw.mjs';
import { trialCutlist } from './fixtures/animatic-cutlist.mjs';

const cfg = config();
const cut = trialCutlist(cfg);
const pullback = readJson(rel(core.pullbackPath(cfg)));
const rp = core.revealPath(cut, cfg, pullback);
const sources = core.revealSources(cfg, pullback);
const out = { width: cfg.formats.preview.width, height: cfg.formats.preview.height };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'animatic-test-'));

afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('the trial cut list', () => {
  it('fills every frame with shots and places, with no gap and no overlap', () => {
    expect(cut.frameCount).toBe(cfg.film.targetSeconds * cfg.film.fps);
    for (const list of [cut.shots, cut.places]) {
      expect(list[0].first).toBe(0);
      expect(list[list.length - 1].last).toBe(cut.frameCount - 1);
      for (let i = 1; i < list.length; i++) expect(list[i].first).toBe(list[i - 1].last + 1);
    }
    expect(cut.places.map((p) => p.unit)).toEqual(cfg.film.order);
    expect(Object.keys(cut.keyFrames).length).toBe(cfg.keys.length);
    for (const k of cfg.keys) {
      const place = cut.places.find((p) => p.unit === k.unit);
      expect(cut.keyFrames[k.id]).toBeGreaterThanOrEqual(place.first);
      expect(cut.keyFrames[k.id]).toBeLessThanOrEqual(place.last);
    }
    expect(cut.shots[cut.shots.length - 1].picture).toBe(core.BLACK_PICTURE);
    expect(cut.keyFrames[rp.keys[3].id]).toBe(cut.titanFrame);
  });
});

describe('the frame count', () => {
  it('is the film frame count times the preview rate over the film rate', () => {
    expect(core.frameCount(cut, cfg)).toBe((cut.frameCount * cfg.film.previewFps) / cfg.film.fps);
    expect(core.filmFrame(7, cfg)).toBe((7 * cfg.film.fps) / cfg.film.previewFps);
    expect(core.filmFrame(core.frameCount(cut, cfg) - 1, cfg)).toBeLessThan(cut.frameCount);
  });

  it('counts the frames of a span, from one film frame up to another', () => {
    const s = core.span(cut, cfg, 9300, 10500);
    expect(s.count).toBe(((10500 - 9300) * cfg.film.previewFps) / cfg.film.fps);
    expect(core.filmFrame(s.first, cfg)).toBe(9300);
    expect(s.seconds).toBeCloseTo(9300 / cfg.film.fps, 6);
  });

  it('refuses a preview rate that does not divide the film rate', () => {
    expect(() => core.step({ film: { fps: 60, previewFps: 25 } })).toThrow();
  });
});

describe('a shot of a place', () => {
  const src = { width: 1672, height: 941 };
  const fps = cfg.film.fps;
  const shot = (move, frames) => ({ id: 't', first: 100, last: 100 + frames - 1, move });
  const full = core.coverView(src.width, src.height, out.width, out.height);

  it('covers the frame with the aspect of the frame', () => {
    expect(full.w / full.h).toBeCloseTo(out.width / out.height, 9);
    expect(full.x).toBeGreaterThanOrEqual(0);
    expect(full.y).toBeGreaterThanOrEqual(0);
    expect(Math.min(full.x, full.y)).toBeCloseTo(0, 9);
  });

  it('pushes in from the whole picture at a constant rate', () => {
    const s = shot('in', 300);
    const a = core.placeView(s, s.first, src, out, fps);
    const z = core.placeView(s, s.last, src, out, fps);
    expect(a).toEqual(full);
    const total = (core.PUSH_PER_SECOND * 300) / fps;
    expect(z.w).toBeCloseTo(full.w * (1 - (total * 299) / 300), 9);
    expect(z.x + z.w / 2).toBeCloseTo(full.x + full.w / 2, 9);
    expect(z.y + z.h / 2).toBeCloseTo(full.y + full.h / 2, 9);
    const steps = [];
    for (let f = s.first; f < s.last; f++) steps.push(core.placeView(s, f, src, out, fps).w - core.placeView(s, f + 1, src, out, fps).w);
    expect(Math.max(...steps) - Math.min(...steps)).toBeLessThan(1e-9);
    expect(steps[0]).toBeCloseTo((full.w * core.PUSH_PER_SECOND) / fps, 9);
  });

  it('pulls out to the whole picture, and holds still on a hold', () => {
    const s = shot('out', 300);
    const a = core.placeView(s, s.first, src, out, fps);
    const z = core.placeView(s, s.last + 1, src, out, fps);
    expect(a.w).toBeCloseTo(full.w * (1 - (core.PUSH_PER_SECOND * 300) / fps), 9);
    expect(z.w).toBeCloseTo(full.w, 9);
    const h = shot('hold', 300);
    expect(core.placeView(h, h.first, src, out, fps)).toEqual(core.placeView(h, h.last, src, out, fps));
    expect(core.placeView(h, h.first, src, out, fps)).toEqual(full);
  });

  it('drifts sideways inside the picture', () => {
    for (const move of ['left', 'right']) {
      const s = shot(move, 600);
      const a = core.placeView(s, s.first, src, out, fps);
      const z = core.placeView(s, s.last, src, out, fps);
      expect(a.w).toBeCloseTo(z.w, 9);
      expect(a.y).toBeCloseTo(z.y, 9);
      expect(move === 'left' ? z.x < a.x : z.x > a.x).toBe(true);
      for (const v of [a, z]) {
        expect(v.x).toBeGreaterThanOrEqual(-1e-9);
        expect(v.x + v.w).toBeLessThanOrEqual(src.width + 1e-9);
      }
    }
  });

  it('never pushes more than the cap over one shot', () => {
    expect(core.pushTotal(60 * fps, fps)).toBe(core.PUSH_CAP);
    expect(core.pushTotal(5 * fps, fps)).toBeCloseTo(5 * core.PUSH_PER_SECOND, 12);
    for (const move of core.MOVES) {
      for (const frames of [30, 600, 1044, 6000]) {
        const s = shot(move, frames);
        for (const f of [s.first, s.first + (frames >> 1), s.last]) {
          const v = core.placeView(s, f, src, out, fps);
          expect(v.w).toBeGreaterThanOrEqual(full.w * (1 - core.PUSH_CAP) - 1e-9);
          expect(v.w).toBeLessThanOrEqual(full.w + 1e-9);
        }
      }
    }
    for (const s of cut.shots) expect(core.pushTotal(s.last - s.first + 1, fps)).toBeLessThanOrEqual(core.PUSH_CAP);
  });
});

describe('the reveal', () => {
  it('finds the four keys, the unit and the master from the config and the pull back file', () => {
    expect(rp.keys.length).toBe(4);
    expect(rp.unit).toBe(core.revealUnit(cfg));
    expect(sources.map((s) => s.id)).toEqual(['plate 1', 'plate 2', 'master']);
    for (const s of sources) expect(fs.existsSync(rel(s.file))).toBe(true);
  });

  it('shows exactly the window of each key at its key frame', () => {
    rp.keys.forEach((k, i) => {
      const v = core.revealView(rp, cut.keyFrames[k.id]);
      const w = pullback.frames[String(i + 1)].window_in_master_px;
      expect(v).toEqual({ x: w.x0, y: w.y0, w: w.w, h: w.h });
    });
  });

  it('never shrinks the width of the view, and has no identical views before the last key frame', () => {
    const first = cut.places.find((p) => p.unit === rp.unit).first;
    const last = cut.shots.filter((s) => s.unit === rp.unit && s.picture !== core.BLACK_PICTURE).pop().last;
    let prev = core.revealView(rp, first);
    for (let f = first + 1; f <= last; f++) {
      const v = core.revealView(rp, f);
      expect(v.w).toBeGreaterThanOrEqual(prev.w);
      if (f <= rp.frames[3]) expect(v.w).toBeGreaterThan(prev.w);
      prev = v;
    }
  });

  it('starts 6 percent tighter than window 1 and holds window 4 after its key frame', () => {
    const a = core.revealView(rp, rp.start);
    expect(a.w).toBeCloseTo(rp.windows[0].w * (1 - core.PREROLL_TIGHTER), 6);
    expect(a.x + a.w / 2).toBeCloseTo(rp.windows[0].x + rp.windows[0].w / 2, 6);
    expect(core.revealView(rp, rp.frames[3] + 500)).toEqual(rp.windows[3]);
  });

  it('does not jump in speed at a key frame', () => {
    const rate = (f) => Math.log(core.revealView(rp, f + 1).w / core.revealView(rp, f).w);
    for (const f of rp.frames) {
      const before = rate(f - 1);
      const after = rate(f);
      const near = Math.max(rate(f - 2), rate(f + 1), 1e-6);
      expect(Math.abs(after - before)).toBeLessThan(0.25 * near + 1e-4);
    }
    expect(rate(rp.frames[3] - 1)).toBeLessThan(rate(rp.frames[3] - 30) * 0.1);
  });

  it('stays inside the master, but for the overhang of window 4', () => {
    const m = sources[2].window;
    for (let f = rp.start; f <= rp.frames[3]; f++) {
      const v = core.revealView(rp, f);
      expect(v.x).toBeGreaterThanOrEqual(0);
      expect(v.y).toBeGreaterThanOrEqual(0);
      expect(v.x + v.w).toBeLessThanOrEqual(m.w + 0.01);
      expect(v.y + v.h).toBeLessThanOrEqual(m.h + 2);
    }
  });
});

describe('the monotone curve', () => {
  it('passes through its points and never turns back', () => {
    const c = core.monotone([0, 10, 30, 35], [1, 2, 2, 9], 0.01);
    expect(c(0)).toBe(1);
    expect(c(10)).toBeCloseTo(2, 12);
    expect(c(30)).toBeCloseTo(2, 12);
    expect(c(35)).toBe(9);
    let prev = c(0);
    for (let t = 0.25; t <= 35; t += 0.25) {
      expect(c(t)).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = c(t);
    }
  });
});

describe('the source of a view of the reveal', () => {
  const finest = (view) => sources.findIndex((s, i) => i === sources.length - 1 || core.covers(s.window, view));

  it('is the finest that covers it, at every frame', () => {
    const seen = new Set();
    for (let f = rp.start; f <= rp.frames[3] + 10; f++) {
      const v = core.revealView(rp, f);
      const s = core.sourceFor(v, sources);
      expect(s.index).toBe(finest(v));
      if (s.index < sources.length - 1) expect(core.covers(sources[s.index].window, v)).toBe(true);
      for (let i = 0; i < s.index; i++) expect(core.covers(sources[i].window, v)).toBe(false);
      seen.add(s.id);
    }
    expect([...seen]).toEqual(['plate 1', 'plate 2', 'master']);
  });

  it('is plate 1 up to the key frame of reveal-1, plate 2 up to reveal-2 and the master after', () => {
    expect(core.sourceFor(core.revealView(rp, rp.start), sources).id).toBe('plate 1');
    expect(core.sourceFor(core.revealView(rp, rp.frames[0]), sources).id).toBe('plate 1');
    expect(core.sourceFor(core.revealView(rp, rp.frames[0] + 1), sources).id).toBe('plate 2');
    expect(core.sourceFor(core.revealView(rp, rp.frames[1]), sources).id).toBe('plate 2');
    expect(core.sourceFor(core.revealView(rp, rp.frames[1] + 1), sources).id).toBe('master');
    expect(core.sourceFor(core.revealView(rp, rp.frames[3]), sources).id).toBe('master');
  });

  it('fades the finer plate out over 15 percent of zoom, so nothing pops', () => {
    const w = sources[0].window;
    const grown = (z) => ({ x: w.x + w.w / 2 - (w.w * z) / 2, y: w.y + w.h / 2 - (w.h * z) / 2, w: w.w * z, h: w.h * z });
    expect(core.sourceFor(grown(1), sources).inset).toBe(null);
    const just = core.sourceFor(grown(1.0005), sources);
    expect(just.id).toBe('plate 2');
    expect(just.inset.id).toBe('plate 1');
    expect(just.inset.share).toBeGreaterThan(0.999);
    const mid = core.sourceFor(grown(1.07), sources);
    expect(mid.inset.share).toBeGreaterThan(0.2);
    expect(mid.inset.share).toBeLessThan(0.8);
    expect(core.sourceFor(grown(1 + core.PLATE_BLEND), sources).inset).toBe(null);
    let prev = 1;
    for (let z = 1.001; z < 1.2; z += 0.001) {
      const s = core.sourceFor(grown(z), sources);
      const share = s.inset ? s.inset.share : 0;
      expect(share).toBeLessThanOrEqual(prev);
      expect(prev - share).toBeLessThan(0.02);
      prev = share;
    }
  });
});

describe('sampling', () => {
  const ramp = (w, h) => {
    const data = new Uint8Array(w * h * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.fill(Math.round((x * 255) / (w - 1)), (y * w + x) * 3, (y * w + x) * 3 + 3);
    return { data, width: w, height: h };
  };

  it('returns the picture itself for a view of the whole picture at its own size', () => {
    const img = ramp(64, 36);
    const got = core.toBytes(core.sampleInto(new Float32Array(64 * 36 * 3), img, { x: 0, y: 0, w: 64, h: 36 }, 64, 36));
    expect(Buffer.from(got).equals(Buffer.from(img.data))).toBe(true);
  });

  it('moves by a fraction of a pixel: equal small steps of the view give equal small steps of the picture', () => {
    const img = ramp(512, 16);
    const at = (dx) => core.sampleInto(new Float32Array(96 * 4 * 3), img, { x: 100 + dx, y: 2, w: 192, h: 8 }, 96, 4);
    const steps = [];
    let prev = at(0);
    for (let i = 1; i <= 20; i++) {
      const cur = at(i * 0.05);
      let sum = 0;
      for (let k = 0; k < cur.length; k++) sum += cur[k] - prev[k];
      steps.push(sum / cur.length);
      prev = cur;
    }
    const want = (0.05 * 255) / 511;
    for (const s of steps) expect(s).toBeCloseTo(want, 3);
  });

  it('halves a picture by averaging and picks the level that keeps the step under two source pixels', () => {
    const levels = core.pyramid(ramp(256, 128), 4);
    expect(levels.map((l) => l.width)).toEqual([256, 128, 64, 32]);
    const m = core.mipFor({ x: 0, y: 0, w: 5800, h: 3262.5 }, 960, 540, 4);
    expect(m.level).toBe(2);
    expect(m.view.w / 960).toBeLessThan(2);
    expect(core.mipFor({ x: 0, y: 0, w: 1000, h: 562.5 }, 960, 540, 4).level).toBe(0);
    expect(core.mipFor({ x: 0, y: 0, w: 1000, h: 562.5 }, 960, 540, 4).next).toBe(null);
    const near = core.mipFor({ x: 0, y: 0, w: 1900, h: 1068.75 }, 960, 540, 4);
    expect(near.level).toBe(0);
    expect(near.next.level).toBe(1);
    expect(near.next.share).toBeGreaterThan(0.9);
  });
});

describe('stills', () => {
  it('are byte equal when made twice, in a place, in the reveal and in black', async () => {
    const frames = [cut.keyFrames[cfg.keys[1].id], rp.frames[0] + 4, rp.frames[2], cut.frameCount - 1];
    for (const f of frames) {
      const a = await still(drawer({ cut, cfg }), f, path.join(tmp, `a-${f}.png`));
      const b = await still(drawer({ cut, cfg }), f, path.join(tmp, `b-${f}.png`));
      expect(fs.readFileSync(a).equals(fs.readFileSync(b))).toBe(true);
    }
  }, 60000);

  it('draw black as the near black of the brief under the label, and nothing else', async () => {
    const d = drawer({ cut, cfg });
    const data = await d.frame(cut.frameCount - 1);
    expect([data[0], data[1], data[2]]).toEqual(core.hex(core.BLACK));
    const top = data.subarray(0, d.width * 3 * (d.height - 80));
    expect(top.every((v, i) => v === core.hex(core.BLACK)[i % 3])).toBe(true);
  });

  it('show the picture of the key at the key frame of reveal-3, close to the approved picture', async () => {
    const sharp = (await import('sharp')).default;
    const d = drawer({ cut, cfg });
    const got = await d.frame(rp.frames[2]);
    const want = await sharp(rel(rp.keys[2].image)).resize(d.width, d.height, { fit: 'fill' }).removeAlpha().raw().toBuffer();
    let sum = 0;
    let n = 0;
    for (let y = 0; y < d.height - 80; y++) {
      for (let x = 0; x < d.width * 3; x++) {
        sum += Math.abs(got[y * d.width * 3 + x] - want[y * d.width * 3 + x]);
        n++;
      }
    }
    expect(sum / n).toBeLessThan(4);
  }, 60000);
});

describe('motion', () => {
  it('is even from frame to frame in a slow push and in the reveal, with no identical frames and no steps', async () => {
    const d = drawer({ cut, cfg });
    const jump = cfg.film.fps / cfg.film.previewFps;
    for (const start of [cut.shots[0].first + 200, cut.shots[2].first + 20, rp.start + 10, rp.frames[0] - 6, rp.frames[1] - 6]) {
      const diffs = [];
      let prev = (await d.frame(start)).slice();
      for (let i = 1; i <= 12; i++) {
        const cur = (await d.frame(start + i * jump)).slice();
        let sum = 0;
        for (let k = 0; k < cur.length; k++) sum += Math.abs(cur[k] - prev[k]);
        diffs.push(sum / cur.length);
        prev = cur;
      }
      expect(Math.min(...diffs)).toBeGreaterThan(0);
      for (let i = 1; i < diffs.length - 1; i++) {
        expect(diffs[i]).toBeLessThan(1.25 * Math.max(diffs[i - 1], diffs[i + 1]));
        expect(diffs[i]).toBeGreaterThan(0.8 * Math.min(diffs[i - 1], diffs[i + 1]));
      }
      if (start < rp.start) expect(Math.max(...diffs) / Math.min(...diffs)).toBeLessThan(1.1);
    }
  }, 120000);
});

describe('the sound', () => {
  it('takes the newest mix of a kind it knows', () => {
    const files = [
      { file: 'audio/mix/a.flac', mtimeMs: 10 },
      { file: 'audio/mix/b.wav', mtimeMs: 30 },
      { file: 'audio/mix/mix.json', mtimeMs: 99 },
      { file: 'audio/mix/c.mp3', mtimeMs: 20 },
    ];
    expect(core.newestSound(files)).toBe('audio/mix/b.wav');
    expect(core.newestSound([{ file: 'audio/mix/mix.json', mtimeMs: 1 }])).toBe(null);
  });

  it('lays the music as the pieces say, with a crossfade at the join that keeps the length', () => {
    const one = core.soundPlan({ music: 'm.mp3', pieces: [{ from: 0, to: 195, at: 0 }], from: 0, seconds: 195 });
    expect(one.filter).not.toContain('acrossfade');
    expect(one.filter).toContain('atrim=end=195');
    const two = core.soundPlan({ music: 'm.mp3', pieces: [{ from: 0, to: 178.6, at: 0 }, { from: 217.1, to: 233.51, at: 178.6 }], from: 155, seconds: 20 });
    expect(two.filter).toContain(`acrossfade=d=${core.CROSSFADE_SECONDS}`);
    expect(two.filter).toContain('atrim=start=0:end=178.61');
    expect(two.filter).toContain('atrim=start=217.09:end=233.51');
    expect(two.filter).toContain('atrim=start=155');
    expect(core.soundPlan({ pieces: [], from: 0, seconds: 5 })).toBe(null);
    expect(core.soundPlan({ mix: 'x.flac', from: 2, seconds: 5 }).inputs).toEqual(['x.flac']);
  });

  it('encodes at the bit rate of the config, bit exact, with or without sound', () => {
    const base = { width: out.width, height: out.height, fps: cfg.film.previewFps, bitrateMbps: cfg.export.preview.bitrateMbps, audioRate: cfg.audio.sampleRate, out: 'x.mp4', frames: 10 };
    const silent = core.encodeArgs({ ...base, sound: null });
    expect(silent.join(' ')).toContain(`-b:v ${cfg.export.preview.bitrateMbps}M`);
    expect(silent.join(' ')).toContain('-fflags +bitexact -flags +bitexact');
    expect(silent.join(' ')).toContain('-map_metadata -1');
    expect(silent.join(' ')).toContain('+faststart');
    expect(silent).not.toContain('aac');
    const loud = core.encodeArgs({ ...base, sound: core.soundPlan({ mix: 'x.flac', from: 0, seconds: 1 }) });
    expect(loud.join(' ')).toContain(`-c:a aac -b:a ${core.AUDIO_KBPS}k`);
    expect(loud.join(' ')).toContain(`-ar ${cfg.audio.sampleRate}`);
    expect(silent.join(' ')).not.toContain('maxrate');
  });

  it('checks what ffprobe says about the file', () => {
    const want = { ...out, fps: cfg.film.previewFps, frames: 600, sound: true };
    const v = { codec_type: 'video', ...out, avg_frame_rate: `${cfg.film.previewFps}/1`, nb_read_frames: '600' };
    expect(core.checkProbe({ streams: [v, { codec_type: 'audio' }] }, want)).toEqual([]);
    expect(core.checkProbe({ streams: [v] }, want).length).toBe(1);
    expect(core.checkProbe({ streams: [{ ...v, nb_read_frames: '599' }, { codec_type: 'audio' }] }, want).length).toBe(1);
    expect(core.checkProbe({ streams: [{ ...v, width: out.width * 2 }] }, { ...want, sound: false }).length).toBe(1);
    expect(core.checkProbe({ streams: [] }, want).length).toBe(1);
  });
});
