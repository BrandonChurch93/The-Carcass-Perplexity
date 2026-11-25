import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { config, rel, writeJson, utc, ROOT } from './paths.mjs';

export const STYLE = {
  gap: 8,
  strip: 26,
  title: 32,
  font: 14,
  titleFont: 16,
  minFont: 9,
  pad: 8,
  ground: '#141517',
  stripGround: '#2b2d30',
  ink: '#c8cace',
  dim: '#8b8e93',
  family: 'Helvetica, Arial, DejaVu Sans, sans-serif',
};

export function fitWithin(w, h, maxEdge, maxMegapixels) {
  const maxPixels = maxMegapixels * 1e6;
  const s = Math.min(1, maxEdge / Math.max(w, h), Math.sqrt(maxPixels / (w * h)));
  if (s >= 1) return { width: w, height: h, scale: 1 };
  let width = Math.max(1, Math.floor(w * s));
  let height = Math.max(1, Math.round((width * h) / w));
  while (width > 1 && (height > maxEdge || width * height > maxPixels)) {
    width -= 1;
    height = Math.max(1, Math.round((width * h) / w));
  }
  return { width, height, scale: width / w };
}

export function criticLimits() {
  const c = config().critics;
  return { maxEdge: c.maxImageLongEdgePx, maxMegapixels: c.maxImageMegapixels };
}

export function inside(width, height, limits = criticLimits()) {
  return Math.max(width, height) <= limits.maxEdge && width * height <= limits.maxMegapixels * 1e6;
}

export function formatSize(id) {
  const f = Object.values(config().formats).find((x) => x.id === id);
  if (!f) throw new Error(`no format ${id}`);
  return { width: f.width, height: f.height };
}

export function timecode(frame, fps = config().film.fps) {
  const digits = String(fps - 1).length;
  const s = Math.floor(frame / fps);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}.${String(frame % fps).padStart(digits, '0')}`;
}

export function spread(first, last, count) {
  const n = last - first + 1;
  if (n <= count) return Array.from({ length: Math.max(0, n) }, (_, i) => first + i);
  return Array.from({ length: count }, (_, i) => Math.round(first + (i * (last - first)) / (count - 1)));
}

export function clean(text) {
  return String(text).replace(/[\u2013\u2014]/g, '-').replace(/!/g, '').replace(/\s+/g, ' ').trim();
}

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const widths = new Map();

export async function textWidth(text, size, weight = 400) {
  const id = `${size}|${weight}|${text}`;
  if (widths.has(id)) return widths.get(id);
  const w = Math.ceil(text.length * size * 1.1) + 2 * size;
  const h = Math.ceil(size * 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text x="${size}" y="${Math.round(size * 1.4)}" font-family="${STYLE.family}" font-size="${size}" font-weight="${weight}" fill="#fff">${esc(text)}</text></svg>`;
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let lo = info.width;
  let hi = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 8) {
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
    }
  }
  const out = hi < 0 ? 0 : hi - size + 2;
  widths.set(id, out);
  return out;
}

export async function fitText(text, room, size = STYLE.font, weight = 400) {
  let t = clean(text);
  let s = size;
  while (s > STYLE.minFont && (await textWidth(t, s, weight)) > room) s -= 1;
  while (t.length > 1 && (await textWidth(t, s, weight)) > room) t = t.slice(0, -4).trimEnd() + '...';
  return { text: t, size: s };
}

function locatorSvg(locator, right, height) {
  const h = height - 10;
  const w = Math.round(h * (locator.aspect ?? 16 / 9));
  const x = right - w;
  const y = (height - h) / 2;
  const bx = x + locator.x0 * w;
  const by = y + locator.y0 * h;
  const bw = Math.max(2, (locator.x1 - locator.x0) * w);
  const bh = Math.max(2, (locator.y1 - locator.y0) * h);
  return {
    width: w,
    svg: `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" fill="none" stroke="${STYLE.dim}" stroke-width="1"/><rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${STYLE.ink}"/>`,
  };
}

export const SEP = ' \u00b7 ';

export function textRoom(width, height = STYLE.strip, locator = null) {
  const loc = locator ? locatorSvg(locator, width - STYLE.pad, height) : null;
  return { loc, room: width - 2 * STYLE.pad - (loc ? loc.width + STYLE.pad : 0) };
}

export async function textStrip({ text, width, height = STYLE.strip, size = STYLE.font, weight = 400, locator = null, ground = STYLE.stripGround }) {
  const { loc, room } = textRoom(width, height, locator);
  const fit = await fitText(text, room, size, weight);
  const base = Math.round(height / 2 + fit.size * 0.36);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${ground}"/><text x="${STYLE.pad}" y="${base}" font-family="${STYLE.family}" font-size="${fit.size}" font-weight="${weight}" fill="${STYLE.ink}">${esc(fit.text)}</text>${loc ? loc.svg : ''}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export function gridFit({ cols, rows, aspect, gap = STYLE.gap, strip = STYLE.strip, title = false, limits = criticLimits(), maxCell = null }) {
  const extraW = (cols + 1) * gap;
  const extraH = (rows + 1) * gap + rows * strip + (title ? STYLE.title + gap : 0);
  let width = Math.floor((limits.maxEdge - extraW) / cols);
  if (maxCell) width = Math.min(width, maxCell.width, Math.floor(maxCell.height * aspect));
  for (; width > 1; width--) {
    const height = Math.max(1, Math.round(width / aspect));
    if (maxCell && height > maxCell.height) continue;
    if (inside(cols * width + extraW, rows * height + extraH, limits)) return { width, height };
  }
  throw new Error('no cell fits the limits');
}

export async function tile({ cells, cols, cell, gap = STYLE.gap, strip = STYLE.strip }) {
  const rows = Math.ceil(cells.length / cols);
  const parts = [];
  const places = [];
  let size = STYLE.font;
  for (const c of cells) size = Math.min(size, (await fitText(c.caption ?? '', textRoom(cell.width, strip, c.locator ?? null).room, STYLE.font)).size);
  for (let i = 0; i < cells.length; i++) {
    const left = (i % cols) * (cell.width + gap);
    const top = Math.floor(i / cols) * (cell.height + strip + gap);
    parts.push({ input: cells[i].input, left, top });
    parts.push({
      input: await textStrip({ text: cells[i].caption ?? '', width: cell.width, height: strip, size, locator: cells[i].locator ?? null }),
      left,
      top: top + cell.height,
    });
    places.push({ left, top, width: cell.width, height: cell.height });
  }
  return { width: cols * cell.width + (cols - 1) * gap, height: rows * (cell.height + strip) + (rows - 1) * gap, parts, places };
}

export async function assemble(blocks, { gap = STYLE.gap, title = null } = {}) {
  const inner = Math.max(...blocks.map((b) => b.width));
  const width = inner + 2 * gap;
  const parts = [];
  const places = [];
  let y = gap;
  if (title) {
    parts.push({ input: await textStrip({ text: title, width: inner, height: STYLE.title, size: STYLE.titleFont, ground: STYLE.ground }), left: gap, top: y });
    y += STYLE.title + gap;
  }
  for (const b of blocks) {
    const x = gap + Math.floor((inner - b.width) / 2);
    for (const p of b.parts) parts.push({ input: p.input, left: x + p.left, top: y + p.top });
    places.push(b.places.map((p) => ({ ...p, left: x + p.left, top: y + p.top })));
    y += b.height + gap;
  }
  const height = y;
  const buffer = await sharp({ create: { width, height, channels: 3, background: STYLE.ground } })
    .composite(parts)
    .png({ compressionLevel: 9 })
    .toBuffer();
  return { buffer, width, height, places };
}

export async function grid({ cells, cols, cell, title = null, gap = STYLE.gap, strip = STYLE.strip }) {
  const out = await assemble([await tile({ cells, cols, cell, gap, strip })], { gap, title });
  return { ...out, places: out.places[0] };
}

export function madeRecord(kind, stills, extra = {}) {
  return { kind, made: utc(), ...extra, stills: stills.filter(Boolean).map((r) => ({ ...r })) };
}

export async function writePng(file, image, record, limits = criticLimits()) {
  const buffer = Buffer.isBuffer(image) ? image : await image.png({ compressionLevel: 9 }).toBuffer();
  const meta = await sharp(buffer).metadata();
  if (limits && !inside(meta.width, meta.height, limits)) throw new Error(`${path.basename(file)} is ${meta.width} x ${meta.height}, outside the limits`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buffer);
  writeJson(file + '.json', record);
  return { file, width: meta.width, height: meta.height };
}

export function dropStale(pathOf, from) {
  for (let n = from; fs.existsSync(pathOf(n)); n++) {
    fs.rmSync(pathOf(n));
    fs.rmSync(pathOf(n) + '.json', { force: true });
  }
}

export function fakeNote(stills) {
  return stills.some((r) => r && r.engine === 'fake') ? ' (fake frames)' : '';
}

export function outDir(dir, kind) {
  return dir ?? rel('out', 'work', kind);
}

export const relPath = (file) => path.relative(ROOT, path.resolve(file));

export function parseRegions(value) {
  if (value === undefined || value === true) return null;
  const list = (Array.isArray(value) ? value : String(value).split(/\s+/)).filter(Boolean);
  return list.map((s, i) => {
    const [cx, cy] = s.split(',').map(Number);
    if (!(cx >= 0 && cx <= 1 && cy >= 0 && cy <= 1)) throw new Error(`bad region ${s}, give cx,cy from 0 to 1`);
    return { label: `region ${i + 1}`, cx, cy };
  });
}

export function cropBox(cx, cy, cw, ch, W, H) {
  const width = Math.min(cw, W);
  const height = Math.min(ch, H);
  const left = Math.min(W - width, Math.max(0, Math.round(cx * W - width / 2)));
  const top = Math.min(H - height, Math.max(0, Math.round(cy * H - height / 2)));
  return { left, top, width, height };
}

export function percentText(box, W, H) {
  const p = (v, of) => Math.round((100 * v) / of);
  return `x ${p(box.left, W)} to ${p(box.left + box.width, W)}%${SEP}y ${p(box.top, H)} to ${p(box.top + box.height, H)}%`;
}

export function locatorOf(box, W, H) {
  return { x0: box.left / W, y0: box.top / H, x1: (box.left + box.width) / W, y1: (box.top + box.height) / H, aspect: W / H };
}

export async function fakeStill(file, { width, height, label, seed = 0 }) {
  const data = Buffer.alloc(width * height * 3);
  let s = (seed * 2654435761 + 12345) >>> 0;
  for (let y = 0, i = 0; y < height; y++) {
    const gy = y / height;
    for (let x = 0; x < width; x++, i += 3) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const gx = x / width;
      const fine = ((x ^ y) & 1 ? 14 : -14) * (0.35 + 0.65 * gx) + ((s >>> 24) / 255 - 0.5) * 22 * gy;
      data[i] = Math.max(8, Math.min(246, 44 + 150 * gx + fine));
      data[i + 1] = Math.max(8, Math.min(246, 52 + 120 * gy + fine));
      data[i + 2] = Math.max(8, Math.min(246, 70 + ((seed * 37) % 110) + fine));
    }
  }
  const size = Math.round(height * 0.3);
  const fit = Math.min(size, Math.round((width * 0.9) / (label.length * 0.62)));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="${width / 2}" y="${height / 2 + fit * 0.35}" text-anchor="middle" font-family="${STYLE.family}" font-size="${fit}" font-weight="700" fill="#e9eaec" fill-opacity="0.82">${esc(label)}</text></svg>`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(data, { raw: { width, height, channels: 3 } })
    .composite([{ input: Buffer.from(svg) }])
    .png({ compressionLevel: 3 })
    .toFile(file);
}

export function fakeFilm() {
  const c = config();
  const fps = c.film.fps;
  const frameCount = c.film.targetSeconds * fps;
  const keys = c.film.order.flatMap((u) => c.keys.filter((k) => k.unit === u).sort((a, b) => a.order - b.order));
  const shots = keys.map((k, i) => {
    const first = Math.round((i * frameCount) / keys.length);
    const last = Math.round(((i + 1) * frameCount) / keys.length) - 1;
    return { id: k.id, unit: k.unit, first, last, key: k.id };
  });
  const keyFrames = Object.fromEntries(shots.map((s) => [s.key, Math.round((s.first + s.last) / 2)]));
  return {
    fps,
    frameCount,
    shots,
    keyFrames,
    events: [],
    titanFrame: shots[shots.length - 1].first,
    loop: { frameCount: c.deliver.cardLoop.seconds * fps, unit: c.deliver.cardLoop.unit },
  };
}

export function fakeRenderer(dir = rel('out', 'work', 'stills', 'fake')) {
  const film = fakeFilm();
  return {
    async renderStill({ frame, key, id, loop, tier = 'review', format = 'hd', diag = null, held = 0 }) {
      const size = formatSize(format);
      let what;
      let label;
      let n;
      if (key !== undefined && key !== null) {
        if (!(key in film.keyFrames)) throw new Error(`no key ${key}`);
        n = film.keyFrames[key];
        what = `key-${key}`;
        label = String(n);
      } else if (loop !== undefined && loop !== null) {
        n = Number(loop);
        what = `loop-${n}`;
        label = `L${n}`;
      } else if (id !== undefined && id !== null) {
        n = [...String(id)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % film.frameCount, 7);
        what = `id-${id}`;
        label = String(id);
      } else {
        n = Number(frame);
        if (!Number.isInteger(n) || n < 0 || n >= film.frameCount) throw new Error(`no frame ${frame}`);
        what = `frame-${n}`;
        label = String(n);
      }
      const file = path.join(dir, `${what}-${format}-${tier}${held ? `-h${held}` : ''}.png`);
      const reused = fs.existsSync(file) && fs.existsSync(file + '.json');
      if (reused) return { file, record: JSON.parse(fs.readFileSync(file + '.json', 'utf8')), reused };
      await fakeStill(file, { ...size, label, seed: n });
      const record = {
        engine: 'fake',
        units: {},
        format,
        tier,
        diag,
        browser: 'fake',
        machine: os.hostname(),
        frame: loop !== undefined && loop !== null ? null : n,
        loop: loop !== undefined && loop !== null ? n : null,
        key: key ?? null,
        ...(held ? { hold: held } : {}),
        made: utc(),
      };
      writeJson(file + '.json', record);
      return { file, record, reused };
    },
    async filmInfo() {
      return film;
    },
    async closeRenderer() {},
  };
}

export async function getRenderer(fake = false) {
  return fake ? fakeRenderer() : await import('./render.mjs');
}

export function isMain(meta) {
  return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(meta.url));
}

export function one(v, fallback) {
  if (v === undefined || v === true) return fallback;
  return Array.isArray(v) ? v[0] : v;
}
