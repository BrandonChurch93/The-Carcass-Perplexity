import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { judgedList, riseShot, lakeFrame, lastPictureFrame } from './judged.mjs';
import { fitWithin, gridFit, grid, cropBox, percentText, locatorOf, spread, SEP } from './img.mjs';
import { coverRect, unitKinds } from './measure-core.mjs';

export const CARBON_EDGE = 1048;
export const FILM_SHEETS = 4;
export const SETTLED_FILE = 'settled.txt';
export const SETTLED_HEAD = 'Settled';
export const PLAIN_WORDS = ['render', 'target', 'approved', 'generated', 'final', 'blockout'];
export const TECHNIQUE_WORDS = ['draft', 'review', 'uhd', 'preview', 'master', 'crop', 'grid', 'sheet', 'depth', 'motion', 'invalid', 'standin', 'solo', 'shader', 'webgl', 'three', 'raymarch', 'sdf', 'noise', 'particle', 'mesh', 'texture', 'bloom', 'grade', 'lens'];
export const USUAL = { judged: { tier: 'final' }, sheets: { tier: 'review' } };

const TABLE = {
  R1: { places: true, reveal: true, film: false },
  R2: { places: true, reveal: true, film: true },
  R3: { places: true, reveal: true, film: false },
  R4: { places: true, reveal: true, film: true },
  R5: { places: false, reveal: false, film: true },
  R6: { places: false, reveal: false, film: true },
  R7: { places: false, reveal: false, film: true },
  R8: { places: false, reveal: true, film: false },
};
export const BLOCKOUT = 'R4b';
export const NO_PACK = { R2: 'R2 needs no pack: each juror gets one picture and the Builder sends it.', R8: 'R8 needs no pack: each viewer gets the titan frame alone and the Builder sends it.' };

export function unitKind(cfg, unit) {
  const k = unitKinds(cfg);
  if (k.places.includes(unit)) return 'places';
  if (unit === k.reveal) return 'reveal';
  if (unit === k.film) return 'film';
  throw new Error(`There is no unit ${unit} in the config.`);
}

export function criticsFor(cfg, unit, only = null) {
  const kind = unitKind(cfg, unit);
  const all = Object.keys(TABLE).filter((id) => TABLE[id][kind]);
  if (!only) return all;
  if (only === BLOCKOUT) {
    if (kind !== 'film') throw new Error(`${BLOCKOUT} judges only the unit ${unitKinds(cfg).film}.`);
    return [BLOCKOUT];
  }
  if (!all.includes(only)) throw new Error(`${only} does not judge the unit ${unit}.`);
  return [only];
}

export function packLimits(cfg, family = null) {
  const maxEdge = family === 'carbon' ? Math.min(CARBON_EDGE, cfg.critics.maxImageLongEdgePx) : cfg.critics.maxImageLongEdgePx;
  return { maxEdge, maxMegapixels: cfg.critics.maxImageMegapixels };
}

export function bannedWords(cfg) {
  const names = cfg.units.flatMap((u) => [u.id, ...u.name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3 && !['with', 'from', 'whole', 'opening', 'sound', 'card', 'loop', 'pull', 'back'].includes(w))]);
  return [...new Set([...PLAIN_WORDS, ...TECHNIQUE_WORDS, ...names, ...cfg.keys.map((k) => k.id)])].sort();
}

export function nameFaults(name, cfg) {
  const low = name.toLowerCase();
  const faults = bannedWords(cfg)
    .filter((w) => low.includes(w))
    .map((w) => `The name ${name} holds the word ${w}.`);
  if (!/^set-[A-Z]+-\d{2,}(-[ab])?\.png$/.test(name) && name !== SETTLED_FILE) faults.push(`The name ${name} is not of the form set-A-07.png.`);
  return faults;
}

export function setLetter(n) {
  let out = '';
  for (let v = n; v >= 0; v = Math.floor(v / 26) - 1) out = String.fromCharCode(65 + (v % 26)) + out;
  return out;
}

export const neutralName = (pack, n, side = null) => `set-${setLetter(pack)}-${String(n).padStart(2, '0')}${side ? `-${side}` : ''}.png`;

export function standInFilm(film, cut, cfg) {
  const notes = [];
  const same = film.frameCount === cut.frameCount;
  const scale = same || cut.frameCount < 2 ? 1 : (film.frameCount - 1) / (cut.frameCount - 1);
  const to = (f) => Math.min(film.frameCount - 1, Math.max(0, Math.round(f * scale)));
  const how = same ? 'taken from the cut list' : `stand-in data: the cut list scaled from ${cut.frameCount} frames to the ${film.frameCount} frames of the film on the page`;
  const out = { ...film };
  if (!Array.isArray(film.places) || !film.places.length) {
    out.places = cut.places.map((p, i) => ({ unit: p.unit, first: to(p.first), last: i + 1 < cut.places.length ? Math.max(to(p.first), to(cut.places[i + 1].first) - 1) : film.frameCount - 1 }));
    notes.push(`The film on the page has no places, so the spans of the places are ${how}.`);
  }
  const keyFrames = { ...(film.keyFrames ?? {}) };
  const lacking = cfg.keys.filter((k) => !Number.isInteger(keyFrames[k.id]) && Number.isInteger(cut.keyFrames?.[k.id]));
  for (const k of lacking) keyFrames[k.id] = to(cut.keyFrames[k.id]);
  if (lacking.length) notes.push(`The film on the page has no key frame for ${lacking.length} of the ${cfg.keys.length} keys, so those are ${how}.`);
  out.keyFrames = keyFrames;
  if (!Number.isInteger(film.titanFrame)) {
    out.titanFrame = to(cut.titanFrame);
    notes.push(`The film on the page has no titan frame, so it is ${how}.`);
  }
  if (!film.judged) {
    out.judged = Object.fromEntries(judgedList(cfg, cut).filter((e) => Number.isInteger(e.frame)).map((e) => [e.id, to(e.frame)]));
    notes.push(`The film on the page has no judged list, so the judged frames are ${how}.`);
  }
  if (!Array.isArray(film.events)) out.events = [];
  out.lake = (riseShot({ shots: out.shots ?? [], titanFrame: out.titanFrame }) ?? { first: to(lakeFrame(cut) ?? 0) }).first;
  out.lastPicture = same ? lastPictureFrame(cut) : film.frameCount - 1;
  return { film: out, notes };
}

export function filmSheets(frameCount, count, sheets = FILM_SHEETS) {
  const all = spread(0, frameCount - 1, sheets * count);
  const per = Math.ceil(all.length / sheets);
  const out = [];
  for (let i = 0; i * per < all.length; i++) out.push(all.slice(i * per, (i + 1) * per));
  return out;
}

export function run(first, count, frameCount) {
  const start = Math.max(0, Math.min(first, frameCount - count));
  return Array.from({ length: Math.min(count, frameCount) }, (_, i) => start + i);
}

const sheetItem = (frames, title, what) => ({ kind: 'sheet', frames, title, what });
const span = (frames) => `frames ${frames[0]} to ${frames[frames.length - 1]}`;

function wholeFilm(film, count) {
  const parts = filmSheets(film.frameCount, count);
  return parts.map((frames, i) => sheetItem(frames, `the whole film${SEP}part ${i + 1} of ${parts.length}${SEP}${span(frames)} of ${film.frameCount}`, `Whole film sheet ${i + 1} of ${parts.length}, ${span(frames)}`));
}

function pairItem(cfg, film, key) {
  return { kind: 'pair', key: key.id, frame: film.keyFrames[key.id], image: key.image, what: `The key ${key.id}: its approved picture ${key.image} as -a and film frame ${film.keyFrames[key.id]} as -b`, settled: [...cfg.settledAll, ...(cfg.settled[key.id] ?? [])] };
}

const keysOf = (cfg, unit) => cfg.keys.filter((k) => k.unit === unit).sort((a, b) => a.order - b.order);
const judgedOf = (cfg, cut, film, unit) =>
  judgedList(cfg, cut)
    .filter((e) => e.unit === unit)
    .map((e) => (Number.isInteger(e.loop) ? { id: e.id, loop: e.loop } : { id: e.id, frame: film.judged[e.id] }))
    .filter((e) => (e.loop !== undefined ? film.loop && e.loop <= film.loop.frameCount : Number.isInteger(e.frame)));

export function planR4b({ cfg, film }) {
  const count = cfg.critics.contactSheetFrames;
  const k = unitKinds(cfg);
  const rise = spread(film.lake, film.titanFrame, count);
  const groups = [{ items: [...wholeFilm(film, count), sheetItem(rise, `the rise${SEP}${span(rise)}`, `The rise, from frame ${film.lake} to the titan frame ${film.titanFrame}`)] }];
  const left = [];
  film.places.forEach((p, i) => {
    const frames = spread(p.first, p.last, count);
    const items = [sheetItem(frames, `place ${i + 1} of ${film.places.length}${SEP}${span(frames)}`, `One sheet across the place ${p.unit}, ${span(frames)}`)];
    const keys = keysOf(cfg, p.unit);
    const key = p.unit === k.reveal ? keys[keys.length - 1] : keys.find((x) => x.kind === 'establishing');
    if (key && Number.isInteger(film.keyFrames[key.id])) items.push(pairItem(cfg, film, key));
    else left.push(`The place ${p.unit} has no pair: ${key ? `the key ${key.id} has no key frame` : 'it has no establishing key'}.`);
    groups.push({ items });
  });
  return { groups, left };
}

export function planR1({ cfg, film, unit }) {
  const groups = [];
  const left = [];
  for (const key of keysOf(cfg, unit)) {
    if (!Number.isInteger(film.keyFrames[key.id])) left.push(`The key ${key.id} has no key frame, so it has no pair.`);
    else groups.push({ items: [pairItem(cfg, film, key), { kind: 'match', key: key.id, frame: film.keyFrames[key.id], image: key.image, what: `Matching crops of the key ${key.id}: ${key.image} beside film frame ${film.keyFrames[key.id]} at native size` }] });
  }
  return { groups, left };
}

export function planR3({ cfg, cut, film, unit }) {
  const groups = judgedOf(cfg, cut, film, unit).map((e) => ({
    items: [
      { kind: 'still', ...e, what: `The judged frame ${e.id}, film frame ${e.frame}, resized to fit` },
      { kind: 'crops', ...e, what: `Native size crops of the judged frame ${e.id}, film frame ${e.frame}` },
    ],
  }));
  return { groups, left: groups.length ? [] : [`The unit ${unit} has no judged frame on the page.`] };
}

export function planR4({ cfg, cut, film, unit }) {
  const count = cfg.critics.contactSheetFrames;
  const kind = unitKind(cfg, unit);
  const n = film.frameCount;
  const groups = [];
  const left = [];
  const add = (...items) => groups.push({ items });
  if (kind === 'places') {
    const shots = (film.shots ?? []).filter((s) => s.unit === unit);
    if (!shots.length) left.push(`The film on the page has no shot of ${unit}, so the sheets across its shots were left out.`);
    shots.forEach((s, i) => {
      const frames = spread(s.first, s.last, count);
      add(sheetItem(frames, `shot ${i + 1} of ${shots.length}${SEP}${span(frames)}`, `One sheet across the shot ${s.id}, ${span(frames)}`));
    });
    for (const key of keysOf(cfg, unit).filter((x) => Number.isInteger(film.keyFrames[x.id]))) {
      const frames = run(film.keyFrames[key.id], count, n);
      add(sheetItem(frames, `consecutive frames${SEP}${span(frames)}`, `Consecutive frames from the key frame of ${key.id}, for what moves in that view`));
    }
    for (const ev of (film.events ?? []).filter((e) => e.unit === unit)) {
      const frames = run(ev.frame - 2, count, n);
      add(sheetItem(frames, `consecutive frames${SEP}${span(frames)}`, `Consecutive frames across the event ${ev.id} at frame ${ev.frame}`));
    }
    left.push('The sheet with the camera held still was left out: the frame interface has no way to render a run of frames with the camera held.');
    left.push('The sheets of each moving thing are consecutive frames from each key frame and across each event: the interface does not say where each fluid, weather or animal of kit/02-SUBJECT.md is in frame.');
  } else if (kind === 'reveal') {
    const all = spread(film.lake, film.titanFrame, 2 * count);
    const half = Math.ceil(all.length / 2);
    [all.slice(0, half), all.slice(half)].filter((f) => f.length).forEach((frames, i, list) => add(sheetItem(frames, `the rise${SEP}part ${i + 1} of ${list.length}${SEP}${span(frames)}`, `The whole rise, part ${i + 1} of ${list.length}, ${span(frames)}`)));
    const first = keysOf(cfg, unit)[0];
    if (first && Number.isInteger(film.keyFrames[first.id])) {
      const frames = run(Math.round((film.lake + film.keyFrames[first.id]) / 2 - count / 2), count, n);
      add(sheetItem(frames, `consecutive frames${SEP}${span(frames)}`, `Consecutive frames in the middle of the handoff, between frame ${film.lake} at the lake and the key frame of ${first.id}`));
    } else left.push('The handoff sheet was left out: the first key of the rise has no key frame.');
    left.push('The sheet at the top with the camera held still was left out: the frame interface has no way to render a run of frames with the camera held.');
  } else {
    add(...wholeFilm(film, count));
    film.places.slice(1).forEach((p, i) => {
      const frames = run(p.first - Math.floor(count / 2), count, n);
      add(sheetItem(frames, `change of place ${i + 1} of ${film.places.length - 1}${SEP}${span(frames)}`, `Consecutive frames across the change of place into ${p.unit} at frame ${p.first}`));
    });
    const secs = Math.round(cfg.film.hookSeconds * film.fps);
    const head = spread(0, Math.min(n - 1, secs), count);
    add(sheetItem(head, `the first seconds${SEP}${span(head)}`, `The first ${cfg.film.hookSeconds} seconds, ${span(head)}`));
    const tail = spread(Math.max(0, film.lastPicture - secs), film.lastPicture, count);
    add(sheetItem(tail, `the last seconds${SEP}${span(tail)}`, `The last ${cfg.film.hookSeconds} seconds before black, ${span(tail)}`));
    const loop = film.loop?.frameCount ?? 0;
    if (loop >= 2) {
      const half = Math.min(Math.floor(count / 2), Math.floor(loop / 2));
      add({ kind: 'sheet', loopFrames: spread(0, loop - 1, count), title: `the loop${SEP}${loop} frames`, what: `One sheet across the loop of ${loop} frames` });
      add({ kind: 'sheet', loopFrames: [...spread(loop - half, loop - 1, half), ...spread(0, half - 1, half)], title: `the seam of the loop${SEP}last ${half} frames then first ${half}`, what: `The seam of the loop: its last ${half} frames, then its first ${half}` });
    } else left.push('The sheets of the loop and of its seam were left out: the page has no loop yet.');
  }
  return { groups, left };
}

export function planR5({ cfg, cut, film, unit }) {
  const count = cfg.critics.contactSheetFrames;
  const groups = [{ items: wholeFilm(film, count) }];
  for (const e of judgedOf(cfg, cut, film, unit)) groups.push({ items: [{ kind: 'still', ...e, what: e.loop !== undefined ? `The judged frame ${e.id}, loop frame ${e.loop}` : `The judged frame ${e.id}, film frame ${e.frame}` }] });
  const est = film.places.map((p) => keysOf(cfg, p.unit).find((x) => x.kind === 'establishing')).filter((x) => x && Number.isInteger(film.keyFrames[x.id]));
  const frames = [...est.map((x) => film.keyFrames[x.id]), film.titanFrame];
  groups.push({ items: [sheetItem(frames, 'the opening view of every place, then the last wide view', `The establishing frame of ${est.map((x) => x.unit).join(', ')}, then the titan frame ${film.titanFrame}`)] });
  return { groups, left: [] };
}

export function planR6({ cfg, film }) {
  const last = Math.min(film.frameCount - 1, Math.round(cfg.film.hookSeconds * film.fps));
  const frames = spread(0, last, cfg.critics.maxFilesPerMessage);
  return { groups: frames.map((frame) => ({ items: [{ kind: 'still', frame, width: cfg.critics.phonePreviewWidthPx, what: `Film frame ${frame}, ${cfg.critics.phonePreviewWidthPx} px wide` }] })), left: [] };
}

export function planR7() {
  return { groups: [], left: ['The R7 pack was left out: there is no stress encode yet to take stills from.'] };
}

export const PLANS = { R4b: planR4b, R1: planR1, R3: planR3, R4: planR4, R5: planR5, R6: planR6, R7: planR7 };

export function planFor(critic, ctx) {
  if (NO_PACK[critic]) return { groups: [], left: [NO_PACK[critic]] };
  return PLANS[critic](ctx);
}

export function usualFor(critic, item, cfg) {
  if (item.kind === 'sheet') return { tier: USUAL.sheets.tier, format: cfg.formats.preview.id };
  if (critic === 'R6') return { tier: USUAL.judged.tier, format: cfg.formats.hd.id };
  return { tier: USUAL.judged.tier, format: cfg.formats.master.id };
}

export const KEPT_CHUNKS = ['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'];

export function stripPng(buffer) {
  const parts = [buffer.subarray(0, 8)];
  for (let p = 8; p + 12 <= buffer.length; ) {
    const size = 12 + buffer.readUInt32BE(p);
    if (KEPT_CHUNKS.includes(buffer.toString('latin1', p + 4, p + 8))) parts.push(buffer.subarray(p, p + size));
    p += size;
  }
  return Buffer.concat(parts);
}

const encode = async (img) => stripPng(await img.png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer());

export async function plain(input, limits, width = null) {
  const m = await sharp(input).metadata();
  const fit = width && width < m.width ? { width, height: Math.max(1, Math.round((width * m.height) / m.width)) } : fitWithin(m.width, m.height, limits.maxEdge, limits.maxMegapixels);
  let img = sharp(input).removeAlpha().toColourspace('srgb');
  if (fit.width !== m.width || fit.height !== m.height) img = img.resize(fit.width, fit.height, { fit: 'fill', kernel: 'lanczos3' });
  return encode(img);
}

export function lattice() {
  const cols = [0, 0.5, 1];
  const rows = [1 / 3, 2 / 3];
  return rows.flatMap((cy) => cols.map((cx) => ({ cx, cy })));
}

export async function detailRegions(file, rect, count = 2, n = 4) {
  const { data, info } = await sharp(file).extract(rect).greyscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  const scores = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x0 = Math.max(1, Math.floor((i * w) / n));
      const x1 = Math.min(w - 1, Math.floor(((i + 1) * w) / n));
      const y0 = Math.max(1, Math.floor((j * h) / n));
      const y1 = Math.min(h - 1, Math.floor(((j + 1) * h) / n));
      let sum = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const p = (y * w + x) * ch;
        sum += Math.abs(4 * data[p] - data[p - ch] - data[p + ch] - data[p - w * ch] - data[p + w * ch]);
      }
      scores.push({ cx: (i + 0.5) / n, cy: (j + 0.5) / n, score: sum / Math.max(1, (x1 - x0) * (y1 - y0)), at: j * n + i });
    }
  }
  return scores.sort((a, b) => b.score - a.score || a.at - b.at).slice(0, count).map((s) => ({ cx: s.cx, cy: s.cy }));
}

export async function cropSheets({ frame, approved = null, regions, limits, title }) {
  const fm = await sharp(frame).metadata();
  const W = fm.width;
  const H = fm.height;
  const cols = 2;
  const rows = 2;
  const cell = gridFit({ cols, rows, aspect: W / H, title: true, limits, maxCell: { width: W, height: H } });
  const pad = { width: cell.width, height: cell.height, fit: 'contain', background: '#141517' };
  let rect = null;
  if (approved) {
    const am = await sharp(approved).metadata();
    rect = coverRect(am.width, am.height, W / H);
  }
  const seen = new Set();
  const cells = [];
  for (const r of regions) {
    const box = cropBox(r.cx, r.cy, cell.width, cell.height, W, H);
    const id = `${box.left},${box.top}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const where = percentText(box, W, H);
    const locator = locatorOf(box, W, H);
    if (rect) {
      const from = { left: Math.min(rect.left + rect.width - 1, rect.left + Math.round((box.left / W) * rect.width)), top: Math.min(rect.top + rect.height - 1, rect.top + Math.round((box.top / H) * rect.height)) };
      from.width = Math.max(1, Math.min(rect.left + rect.width - from.left, Math.round((box.width / W) * rect.width)));
      from.height = Math.max(1, Math.min(rect.top + rect.height - from.top, Math.round((box.height / H) * rect.height)));
      const a = await sharp(approved).extract(from).resize(box.width, box.height, { fit: 'fill' }).png().toBuffer();
      cells.push({ input: await sharp(a).resize(pad).png().toBuffer(), caption: `-a${SEP}${where}`, locator });
    }
    cells.push({ input: await sharp(frame).extract(box).resize(pad).removeAlpha().png().toBuffer(), caption: `${rect ? `-b${SEP}` : ''}${where}`, locator });
  }
  const per = cols * rows;
  const total = Math.ceil(cells.length / per);
  const out = [];
  for (let g = 0; g < total; g++) {
    const made = await grid({ cells: cells.slice(g * per, (g + 1) * per), cols, cell, title: [title, `crops at full size from ${W} x ${H}`, `part ${g + 1} of ${total}`].join(SEP) });
    out.push(made.buffer);
  }
  return out;
}

export async function buildItem(item, { critic, cfg, renderer, sheet, limits, tier = null, format = null, scratch, approvedPath }) {
  const usual = usualFor(critic, item, cfg);
  const t = tier ?? usual.tier;
  const f = format ?? usual.format;
  const used = { tier: t, format: f };
  const at = item.loop !== undefined ? { loop: item.loop } : { frame: item.frame };
  if (item.kind === 'sheet') {
    const made = await sheet({ ...(item.loopFrames ? { loopFrames: item.loopFrames } : { frames: item.frames }), name: 'work', title: item.title, tier: t, format: f, renderer, dir: scratch, look: false });
    return { used, files: [{ side: null, buffer: await plain(made.file, limits) }] };
  }
  const still = await renderer.renderStill({ ...at, tier: t, format: f, look: false });
  if (item.kind === 'still') return { used, files: [{ side: null, buffer: await plain(still.file, limits, item.width ?? null) }] };
  if (item.kind === 'crops') {
    const grids = await cropSheets({ frame: still.file, regions: lattice(), limits, title: `frame ${item.frame}` });
    return { used, files: await Promise.all(grids.map(async (g) => ({ side: null, buffer: await plain(g, limits) }))) };
  }
  const approved = approvedPath(item.image);
  const fm = await sharp(still.file).metadata();
  const am = await sharp(approved).metadata();
  const rect = coverRect(am.width, am.height, fm.width / fm.height);
  if (item.kind === 'match') {
    const grids = await cropSheets({ frame: still.file, approved, regions: await detailRegions(approved, rect), limits, title: 'matching parts of -a and -b' });
    return { used, files: await Promise.all(grids.map(async (g) => ({ side: null, buffer: await plain(g, limits) }))) };
  }
  const b = await plain(still.file, limits);
  const size = await sharp(b).metadata();
  const a = await encode(sharp(approved).extract(rect).removeAlpha().toColourspace('srgb').resize(size.width, size.height, { fit: 'fill', kernel: 'lanczos3' }));
  return { used, files: [{ side: 'a', buffer: a }, { side: 'b', buffer: b }] };
}

const sizeOf = (g) => g.items.reduce((n, i) => n + i.files.length, 0);
const hasPair = (g) => g.items.some((i) => i.kind === 'pair');

export function splitGroups(groups, max) {
  const atoms = [];
  for (const g of groups.filter((x) => x.items.length)) {
    if (sizeOf(g) + (hasPair(g) ? 1 : 0) <= max) atoms.push(g);
    else for (const item of g.items) atoms.push({ items: [item] });
  }
  const packs = [];
  let cur = null;
  for (const g of atoms) {
    const need = sizeOf(g);
    const extra = hasPair(g) ? 1 : 0;
    if (need + extra > max) throw new Error(`One piece of ${need} files does not fit a pack of ${max} files.`);
    const curExtra = cur && (cur.pairs || extra) ? 1 : 0;
    if (!cur || cur.count + need + curExtra > max) {
      cur = { items: [], count: 0, pairs: false };
      packs.push(cur);
    }
    cur.items.push(...g.items);
    cur.count += need;
    cur.pairs = cur.pairs || Boolean(extra);
  }
  return packs.map((p) => ({ items: p.items, files: p.count + (p.pairs ? 1 : 0), pairs: p.pairs }));
}

export function namePacks(packs) {
  return packs.map((p, pi) => {
    let n = 0;
    const files = [];
    for (const item of p.items) {
      if (item.kind === 'pair') {
        n++;
        for (const f of item.files) files.push({ name: neutralName(pi, n, f.side), buffer: f.buffer, what: `${item.what} (the ${f.side === 'a' ? 'approved picture' : 'frame'})`, item });
      } else {
        item.files.forEach((f, i) => {
          n++;
          files.push({ name: neutralName(pi, n), buffer: f.buffer, what: item.files.length > 1 ? `${item.what}, part ${i + 1} of ${item.files.length}` : item.what, item });
        });
      }
    }
    return { ...p, files };
  });
}

export function settledText(pack) {
  const blocks = [];
  for (const item of pack.items.filter((i) => i.kind === 'pair')) {
    const names = pack.files.filter((f) => f.item === item).map((f) => f.name);
    blocks.push([SETTLED_HEAD, names.join(' and '), ...item.settled].join('\n'));
  }
  return blocks.length ? blocks.join('\n\n') + '\n' : null;
}

export function packId(critic, n, total) {
  return total > 1 ? `${critic}-${n + 1}` : critic;
}

export function writePacks({ critic, round, unit, packs, outDir, keyDir, root, notes = [], left = [], used = [], family = null }) {
  const base = path.join(outDir, `round-${round}`, unit);
  fs.mkdirSync(base, { recursive: true });
  for (const d of fs.readdirSync(base, { withFileTypes: true })) if (d.isDirectory() && (d.name === critic || new RegExp(`^${critic}-\\d+$`).test(d.name))) fs.rmSync(path.join(base, d.name), { recursive: true, force: true });
  const slash = (f) => path.relative(root, f).split(path.sep).join('/');
  const key = {};
  const entries = packs.map((p, i) => {
    const id = packId(critic, i, packs.length);
    const dir = path.join(base, id);
    fs.mkdirSync(dir, { recursive: true });
    const names = [];
    for (const f of p.files) {
      fs.writeFileSync(path.join(dir, f.name), f.buffer);
      names.push(f.name);
      key[f.name] = { ...(key[f.name] ?? {}), [id]: f.what };
    }
    const text = settledText(p);
    if (text !== null) {
      fs.writeFileSync(path.join(dir, SETTLED_FILE), text);
      names.push(SETTLED_FILE);
    }
    return { id, folder: slash(dir), pairs: p.items.filter((x) => x.kind === 'pair').length, files: names, attach: names.map((n) => slash(path.join(dir, n))) };
  });
  const keyFile = path.join(keyDir, `round-${round}`, unit, `${critic}.json`);
  fs.mkdirSync(path.dirname(keyFile), { recursive: true });
  const names = Object.fromEntries(entries.map((e) => [e.id, Object.fromEntries(e.files.filter((n) => n !== SETTLED_FILE).map((n) => [n, key[n][e.id]]))]));
  fs.writeFileSync(keyFile, JSON.stringify({ round, unit, critic, packs: names }, null, 2) + '\n');
  const usedList = [...new Set(used.map((u) => `${u.tier} tier in ${u.format}`))].sort();
  const entry = { critic, family, rendered: usedList, key: slash(keyFile), packs: entries, notes: [...notes].sort(), leftOut: [...left].sort() };
  const manifestFile = path.join(base, 'manifest.json');
  const old = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : { critics: [] };
  const critics = [...old.critics.filter((c) => c.critic !== critic), entry].sort((a, b) => (a.critic < b.critic ? -1 : 1));
  fs.writeFileSync(manifestFile, JSON.stringify({ round, unit, critics }, null, 2) + '\n');
  return { entry, manifest: manifestFile, keyFile };
}

export async function buildCritic({ critic, round, unit, cfg, cut, film, renderer, sheet, tier = null, format = null, family = null, outDir, keyDir, scratch, root, approvedPath }) {
  const filled = standInFilm(film, cut, cfg);
  const plan = planFor(critic, { cfg, cut, film: filled.film, unit });
  const limits = packLimits(cfg, family);
  const used = [];
  for (const g of plan.groups) {
    for (const item of g.items) {
      const made = await buildItem(item, { critic, cfg, renderer, sheet, limits, tier, format, scratch, approvedPath });
      item.files = made.files;
      used.push(made.used);
    }
  }
  const packs = namePacks(splitGroups(plan.groups, cfg.critics.maxFilesPerMessage));
  for (const p of packs) for (const f of p.files) for (const fault of nameFaults(f.name, cfg)) throw new Error(fault);
  return writePacks({ critic, round, unit, packs, outDir, keyDir, root, notes: filled.notes, left: plan.left, used, family });
}
