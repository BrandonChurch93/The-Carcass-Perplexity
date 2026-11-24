import path from 'node:path';

export const PUSH_PER_SECOND = 0.008;
export const PUSH_CAP = 0.08;
export const PREROLL_TIGHTER = 0.06;
export const PLATE_BLEND = 0.15;
export const PLATE_FEATHER = 0.12;
export const MIP_BLEND_FROM = 1.6;
export const FIT_SLACK = 0.01;
export const BLACK = '#070605';
export const BLACK_PICTURE = 'black';
export const PULLBACK_FILE = 'pullback.json';
export const LABEL = { size: 15, ink: '#d8cfc4', inkOpacity: 0.85, plate: '#070605', plateOpacity: 0.62, padX: 9, padY: 6, margin: 14, soft: 2.5 };
export const MOVES = ['in', 'out', 'hold', 'left', 'right'];
export const SOUND_TYPES = ['.flac', '.wav', '.m4a', '.mp3'];
export const AUDIO_KBPS = 192;
export const CROSSFADE_SECONDS = 0.02;

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export function step(cfg) {
  const s = cfg.film.fps / cfg.film.previewFps;
  if (!Number.isInteger(s) || s < 1) throw new Error(`film.fps ${cfg.film.fps} is not a whole multiple of film.previewFps ${cfg.film.previewFps}`);
  return s;
}

export function frameCount(cut, cfg) {
  return Math.ceil(cut.frameCount / step(cfg));
}

export function filmFrame(p, cfg) {
  return p * step(cfg);
}

export function span(cut, cfg, from = 0, to = cut.frameCount) {
  const s = step(cfg);
  const first = Math.ceil(Math.max(0, from) / s);
  const end = Math.ceil(Math.min(cut.frameCount, to) / s);
  return { first, count: Math.max(0, end - first), seconds: (first * s) / cfg.film.fps };
}

export function shotAt(cut, frame) {
  let lo = 0;
  let hi = cut.shots.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cut.shots[mid].first <= frame) lo = mid;
    else hi = mid - 1;
  }
  const shot = cut.shots[lo];
  if (!shot || frame < shot.first || frame > shot.last) throw new Error(`no shot holds frame ${frame}`);
  return shot;
}

export function coverView(sw, sh, W, H) {
  const k = Math.min(sw / W, sh / H);
  const w = W * k;
  const h = H * k;
  return { x: (sw - w) / 2, y: (sh - h) / 2, w, h };
}

export function pushTotal(frames, fps) {
  return Math.min(PUSH_CAP, (PUSH_PER_SECOND * frames) / fps);
}

export function placeView(shot, frame, src, out, fps) {
  const full = coverView(src.width, src.height, out.width, out.height);
  const n = shot.last - shot.first + 1;
  const total = shot.move === 'hold' ? 0 : pushTotal(n, fps);
  const u = Math.min(1, Math.max(0, (frame - shot.first) / n));
  let scale = 1 - total;
  let slide = 0;
  if (shot.move === 'in') scale = 1 - total * u;
  else if (shot.move === 'out') scale = 1 - total * (1 - u);
  else if (shot.move === 'left') slide = 0.5 - u;
  else if (shot.move === 'right') slide = u - 0.5;
  else if (shot.move !== 'hold') throw new Error(`shot ${shot.id} has the unknown move ${shot.move}`);
  const w = full.w * scale;
  const h = full.h * scale;
  return { x: full.x + (full.w - w) / 2 + slide * (full.w - w), y: full.y + (full.h - h) / 2, w, h };
}

export function monotone(ts, ys, startSlope = 0, endSlope = 0) {
  const n = ts.length;
  const h = [];
  const d = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(ts[i + 1] - ts[i]);
    d.push((ys[i + 1] - ys[i]) / h[i]);
  }
  const m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] > 0) {
      const a = 2 * h[i] + h[i - 1];
      const b = h[i] + 2 * h[i - 1];
      m[i] = (a + b) / (a / d[i - 1] + b / d[i]);
    }
  }
  const fit = (slope, secant) => (slope * secant <= 0 ? 0 : Math.sign(secant) * Math.min(Math.abs(slope), 3 * Math.abs(secant)));
  m[0] = fit(startSlope, d[0]);
  m[n - 1] = fit(endSlope, d[n - 2]);
  return (t) => {
    if (t <= ts[0]) return ys[0];
    if (t >= ts[n - 1]) return ys[n - 1];
    let i = 0;
    while (t > ts[i + 1]) i++;
    const s = (t - ts[i]) / h[i];
    const s2 = s * s;
    const s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h[i] * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h[i] * m[i + 1];
  };
}

export function revealKeys(cfg, pullback) {
  const byFile = new Map(cfg.keys.map((k) => [path.basename(k.image), k]));
  const out = [];
  for (const n of Object.keys(pullback.frames).sort((a, b) => Number(a) - Number(b))) {
    const f = pullback.frames[n];
    const key = byFile.get(f.file);
    if (!key) throw new Error(`no key in the config has the picture ${f.file}`);
    const w = f.window_in_master_px;
    out.push({ id: key.id, unit: key.unit, image: key.image, window: { x: w.x0, y: w.y0, w: w.w, h: w.h } });
  }
  return out;
}

export function revealUnit(cfg) {
  return cfg.film.order[cfg.film.order.length - 1];
}

export function pullbackPath(cfg) {
  const unit = revealUnit(cfg);
  const key = cfg.keys.find((k) => k.unit === unit);
  return path.join(path.dirname(key.image), PULLBACK_FILE);
}

export function revealPath(cut, cfg, pullback) {
  const keys = revealKeys(cfg, pullback);
  const unit = keys[0].unit;
  const shots = cut.shots.filter((s) => s.unit === unit && s.picture !== BLACK_PICTURE);
  if (shots.length === 0) return null;
  const start = shots[0].first;
  const ts = keys.map((k) => {
    const f = cut.keyFrames[k.id];
    if (!Number.isFinite(f)) throw new Error(`the cut list has no key frame for ${k.id}`);
    return f;
  });
  for (let i = 1; i < ts.length; i++) if (ts[i] <= ts[i - 1]) throw new Error(`the key frame of ${keys[i].id} is not after the key frame of ${keys[i - 1].id}`);
  const wins = keys.map((k) => k.window);
  const lead = ts[0] - start;
  const tight = Math.log(1 - PREROLL_TIGHTER);
  const slope = lead > 0 ? -tight / lead : 0;
  const curve = {
    cx: monotone(ts, wins.map((w) => w.x + w.w / 2)),
    cy: monotone(ts, wins.map((w) => w.y + w.h / 2)),
    lw: monotone(ts, wins.map((w) => Math.log(w.w)), slope),
    lh: monotone(ts, wins.map((w) => Math.log(w.h)), slope),
  };
  return { unit, start, keys, frames: ts, windows: wins, lead, tight, curve };
}

export function revealView(rp, frame) {
  const first = rp.frames[0];
  const last = rp.frames[rp.frames.length - 1];
  const at = rp.frames.indexOf(frame);
  if (at >= 0) return { ...rp.windows[at] };
  if (frame > last) return { ...rp.windows[rp.windows.length - 1] };
  let cx;
  let cy;
  let w;
  let h;
  if (frame < first) {
    const win = rp.windows[0];
    const k = Math.exp(rp.lead > 0 ? (rp.tight * Math.max(0, first - frame)) / rp.lead : 0);
    cx = win.x + win.w / 2;
    cy = win.y + win.h / 2;
    w = win.w * k;
    h = win.h * k;
  } else {
    cx = rp.curve.cx(frame);
    cy = rp.curve.cy(frame);
    w = Math.exp(rp.curve.lw(frame));
    h = Math.exp(rp.curve.lh(frame));
  }
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

export function covers(win, view, slack = FIT_SLACK) {
  return view.x >= win.x - slack && view.y >= win.y - slack && view.x + view.w <= win.x + win.w + slack && view.y + view.h <= win.y + win.h + slack;
}

export function room(win, view) {
  const cx = view.x + view.w / 2;
  const cy = view.y + view.h / 2;
  return Math.max(0, Math.min((cx - win.x) / (view.w / 2), (win.x + win.w - cx) / (view.w / 2), (cy - win.y) / (view.h / 2), (win.y + win.h - cy) / (view.h / 2)));
}

export function revealSources(cfg, pullback) {
  const keys = revealKeys(cfg, pullback);
  const dir = path.dirname(keys[0].image);
  const plates = keys.slice(0, 2).map((k, i) => ({ id: `plate ${i + 1}`, file: k.image, window: k.window }));
  const m = pullback.master;
  return [...plates, { id: 'master', file: path.join(dir, m.file), window: { x: 0, y: 0, w: m.width, h: m.height } }];
}

export function sourceFor(view, sources) {
  const last = sources.length - 1;
  let i = 0;
  while (i < last && !covers(sources[i].window, view)) i++;
  const base = { index: i, id: sources[i].id, inset: null };
  if (i === 0) return base;
  const fine = sources[i - 1];
  const past = Math.log(1 / Math.max(1e-9, Math.min(1, room(fine.window, view)))) / Math.log(1 + PLATE_BLEND);
  if (past >= 1) return base;
  const t = Math.max(0, past);
  const share = Number((1 - t * t * (3 - 2 * t)).toFixed(6));
  return share > 0 ? { ...base, inset: { index: i - 1, id: fine.id, share, feather: Number((t * PLATE_FEATHER).toFixed(6)) } } : base;
}

export function footprint(view, win, W, H) {
  return { x0: ((win.x - view.x) / view.w) * W, y0: ((win.y - view.y) / view.h) * H, x1: ((win.x + win.w - view.x) / view.w) * W, y1: ((win.y + win.h - view.y) / view.h) * H };
}

export function insetInto(acc, fine, W, H, box, share, feather) {
  const fx = Math.max(1e-6, (box.x1 - box.x0) * feather);
  const fy = Math.max(1e-6, (box.y1 - box.y0) * feather);
  const ax = new Float32Array(W);
  for (let x = 0; x < W; x++) ax[x] = ease((x + 0.5 - box.x0) / fx) * ease((box.x1 - x - 0.5) / fx);
  for (let y = 0; y < H; y++) {
    const ay = ease((y + 0.5 - box.y0) / fy) * ease((box.y1 - y - 0.5) / fy) * share;
    if (ay === 0) continue;
    for (let x = 0; x < W; x++) {
      const a = ay * ax[x];
      if (a === 0) continue;
      const o = (y * W + x) * 3;
      acc[o] += (fine[o] - acc[o]) * a;
      acc[o + 1] += (fine[o + 1] - acc[o + 1]) * a;
      acc[o + 2] += (fine[o + 2] - acc[o + 2]) * a;
    }
  }
  return acc;
}

export function toSource(view, source, width, height) {
  const kx = width / source.window.w;
  const ky = height / source.window.h;
  return { x: (view.x - source.window.x) * kx, y: (view.y - source.window.y) * ky, w: view.w * kx, h: view.h * ky };
}

export function plan(cut, cfg, rp, frame) {
  const shot = shotAt(cut, frame);
  if (shot.picture === BLACK_PICTURE) return { kind: 'black', shot };
  if (rp && shot.unit === rp.unit) return { kind: 'reveal', shot, view: revealView(rp, frame) };
  const key = cfg.keys.find((k) => k.id === shot.picture);
  if (!key) throw new Error(`shot ${shot.id} names the picture ${shot.picture}, which is not a key`);
  return { kind: 'place', shot, key };
}

const cubic = (x) => {
  const a = Math.abs(x);
  if (a >= 2) return 0;
  if (a <= 1) return 1.5 * a * a * a - 2.5 * a * a + 1;
  return -0.5 * a * a * a + 2.5 * a * a - 4 * a + 2;
};

export function taps(n, start, length, limit) {
  const ratio = length / n;
  const s = Math.max(1, ratio);
  const count = Math.floor(4 * s) + 1;
  const index = new Int32Array(n * count);
  const weight = new Float32Array(n * count);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < n; i++) {
    const c = start + (i + 0.5) * ratio - 0.5;
    const j0 = Math.ceil(c - 2 * s);
    let sum = 0;
    const ws = new Array(count);
    for (let k = 0; k < count; k++) {
      ws[k] = cubic((j0 + k - c) / s);
      sum += ws[k];
    }
    for (let k = 0; k < count; k++) {
      const j = Math.min(limit - 1, Math.max(0, j0 + k));
      index[i * count + k] = j;
      weight[i * count + k] = ws[k] / sum;
      if (j < lo) lo = j;
      if (j > hi) hi = j;
    }
  }
  return { count, index, weight, lo, hi };
}

export function mipFor(view, W, H, levels) {
  const ratio = Math.min(view.w / W, view.h / H);
  let level = 0;
  while (level < levels - 1 && ratio / 2 ** (level + 1) >= 1) level++;
  const at = (l) => ({ x: view.x / 2 ** l, y: view.y / 2 ** l, w: view.w / 2 ** l, h: view.h / 2 ** l });
  const t = (ratio / 2 ** level - MIP_BLEND_FROM) / (2 - MIP_BLEND_FROM);
  const share = level < levels - 1 && t > 0 ? Number(ease(t).toFixed(6)) : 0;
  return { level, view: at(level), next: share > 0 ? { level: level + 1, view: at(level + 1), share } : null };
}

export function halve(img) {
  const w = img.width >> 1;
  const h = img.height >> 1;
  const data = new Uint8Array(w * h * 3);
  const d = img.data;
  const row = img.width * 3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * 2 * row + x * 6;
      const o = (y * w + x) * 3;
      for (let c = 0; c < 3; c++) data[o + c] = (d[p + c] + d[p + 3 + c] + d[p + row + c] + d[p + row + 3 + c] + 2) >> 2;
    }
  }
  return { data, width: w, height: h };
}

export function pyramid(img, levels) {
  const out = [img];
  while (out.length < levels) {
    const top = out[out.length - 1];
    if (top.width % 2 || top.height % 2) break;
    out.push(halve(top));
  }
  return out;
}

export function sampleInto(acc, img, view, W, H, share = 1) {
  const tx = taps(W, view.x, view.w, img.width);
  const ty = taps(H, view.y, view.h, img.height);
  const rows = ty.hi - ty.lo + 1;
  const line = W * 3;
  const tmp = new Float32Array(rows * line);
  const d = img.data;
  const nx = tx.count;
  for (let r = 0; r < rows; r++) {
    const base = (r + ty.lo) * img.width * 3;
    let o = r * line;
    for (let x = 0; x < W; x++) {
      let a = 0;
      let b = 0;
      let c = 0;
      const t = x * nx;
      for (let k = 0; k < nx; k++) {
        const wt = tx.weight[t + k];
        const p = base + tx.index[t + k] * 3;
        a += wt * d[p];
        b += wt * d[p + 1];
        c += wt * d[p + 2];
      }
      tmp[o++] = a;
      tmp[o++] = b;
      tmp[o++] = c;
    }
  }
  const ny = ty.count;
  for (let y = 0; y < H; y++) {
    const o = y * line;
    for (let k = 0; k < ny; k++) {
      const wt = ty.weight[y * ny + k] * share;
      const p = (ty.index[y * ny + k] - ty.lo) * line;
      for (let i = 0; i < line; i++) acc[o + i] += wt * tmp[p + i];
    }
  }
  return acc;
}

export function toBytes(acc, out = new Uint8Array(acc.length)) {
  for (let i = 0; i < acc.length; i++) {
    const v = acc[i];
    out[i] = v <= 0 ? 0 : v >= 255 ? 255 : (v + 0.5) | 0;
  }
  return out;
}

export function hex(colour) {
  const v = colour.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
}

export function fill(W, H, colour) {
  const [r, g, b] = hex(colour);
  const out = new Uint8Array(W * H * 3);
  for (let i = 0; i < out.length; i += 3) {
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
  }
  return out;
}

export function overlay(frame, W, tag, left, top) {
  const d = tag.data;
  for (let y = 0; y < tag.height; y++) {
    for (let x = 0; x < tag.width; x++) {
      const p = (y * tag.width + x) * 4;
      const a = d[p + 3];
      if (a === 0) continue;
      const o = ((top + y) * W + left + x) * 3;
      for (let c = 0; c < 3; c++) frame[o + c] = (d[p + c] * a + frame[o + c] * (255 - a) + 127) / 255;
    }
  }
  return frame;
}

export function labelPlace(tag, W, H) {
  return { left: LABEL.margin, top: H - LABEL.margin - tag.height };
}

export function newestSound(files) {
  const fit = files.filter((f) => SOUND_TYPES.includes(path.extname(f.file).toLowerCase()));
  fit.sort((a, b) => b.mtimeMs - a.mtimeMs || (a.file < b.file ? -1 : 1));
  return fit.length ? fit[0].file : null;
}

const sec = (v) => Number(v.toFixed(4));

export function soundPlan({ mix = null, music = null, pieces = [], from = 0, seconds }) {
  if (mix) return { inputs: [mix], filter: `[0:a]atrim=start=${sec(from)},asetpts=PTS-STARTPTS,apad,atrim=end=${sec(seconds)}[a]`, what: 'mix' };
  if (!music || pieces.length === 0) return null;
  const half = CROSSFADE_SECONDS / 2;
  const parts = [];
  let lead = 0;
  pieces.forEach((p, i) => {
    const a = i > 0 ? p.from - half : p.from;
    const b = i < pieces.length - 1 ? p.to + half : p.to;
    if (i === 0) lead = p.at;
    parts.push(`[0:a]atrim=start=${sec(Math.max(0, a))}:end=${sec(b)},asetpts=PTS-STARTPTS[p${i}]`);
  });
  let last = 'p0';
  for (let i = 1; i < pieces.length; i++) {
    parts.push(`[${last}][p${i}]acrossfade=d=${CROSSFADE_SECONDS}:c1=tri:c2=tri[x${i}]`);
    last = `x${i}`;
  }
  const delay = lead > 0 ? `adelay=delays=${Math.round(lead * 1000)}:all=1,` : '';
  parts.push(`[${last}]${delay}atrim=start=${sec(from)},asetpts=PTS-STARTPTS,apad,atrim=end=${sec(seconds)}[a]`);
  return { inputs: [music], filter: parts.join(';'), what: 'music' };
}

export function encodeArgs({ width, height, fps, bitrateMbps, audioRate, sound, out, frames }) {
  const a = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${width}x${height}`, '-r', String(fps), '-i', 'pipe:0'];
  if (sound) for (const f of sound.inputs) a.push('-i', f);
  if (sound) a.push('-filter_complex', sound.filter.replaceAll('[0:a]', '[1:a]'), '-map', '0:v', '-map', '[a]');
  else a.push('-map', '0:v');
  a.push('-frames:v', String(frames), '-c:v', 'libx264', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-b:v', `${bitrateMbps}M`, '-g', String(fps * 2));
  if (sound) a.push('-c:a', 'aac', '-b:a', `${AUDIO_KBPS}k`, '-ar', String(audioRate), '-ac', '2');
  a.push('-fflags', '+bitexact', '-flags', '+bitexact', '-flags:v', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1', '-movflags', '+faststart', out);
  return a;
}

export function checkProbe(probe, want) {
  const v = (probe.streams || []).find((s) => s.codec_type === 'video');
  const a = (probe.streams || []).find((s) => s.codec_type === 'audio');
  const wrong = [];
  if (!v) return ['no picture stream'];
  if (v.width !== want.width || v.height !== want.height) wrong.push(`the size is ${v.width} x ${v.height}, not ${want.width} x ${want.height}`);
  const [n, dnm] = String(v.avg_frame_rate || v.r_frame_rate).split('/').map(Number);
  if (Math.abs(n / (dnm || 1) - want.fps) > 1e-6) wrong.push(`the rate is ${v.avg_frame_rate}, not ${want.fps}`);
  const count = Number(v.nb_read_frames ?? v.nb_frames);
  if (count !== want.frames) wrong.push(`the frame count is ${count}, not ${want.frames}`);
  if (Boolean(a) !== want.sound) wrong.push(want.sound ? 'there is no sound stream' : 'there is a sound stream and none was asked for');
  return wrong;
}
