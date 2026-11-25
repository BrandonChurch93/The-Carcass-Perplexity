import path from 'node:path';
import sharp from 'sharp';
import { rel, args, config } from './lib/paths.mjs';
import { addLook } from './look.mjs';
import { STYLE, criticLimits, tile, assemble, writePng, madeRecord, cropBox, percentText, locatorOf, parseRegions, relPath, getRenderer, isMain, one, SEP, fakeNote, outDir, dropStale } from './lib/img.mjs';

export const LATTICE = 4;
export const PAIRS = 2;

export function coverRect(aw, ah, aspect) {
  if (aw / ah > aspect) {
    const width = Math.min(aw, Math.round(ah * aspect));
    return { left: Math.floor((aw - width) / 2), top: 0, width, height: ah };
  }
  const height = Math.min(ah, Math.round(aw / aspect));
  return { left: 0, top: Math.floor((ah - height) / 2), width: aw, height };
}

export async function detailRegions(file, rect, count = PAIRS, n = LATTICE) {
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
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const p = (y * w + x) * ch;
          sum += Math.abs(4 * data[p] - data[p - ch] - data[p + ch] - data[p - w * ch] - data[p + w * ch]);
        }
      }
      scores.push({ cx: (i + 0.5) / n, cy: (j + 0.5) / n, score: sum / Math.max(1, (x1 - x0) * (y1 - y0)) });
    }
  }
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((s, i) => ({ label: `detail ${i + 1}`, cx: s.cx, cy: s.cy, detail: Number(s.score.toFixed(2)) }));
}

async function pairCells({ approved, rect, frame, W, H, region, cell }) {
  const box = cropBox(region.cx, region.cy, cell.width, cell.height, W, H);
  const from = {
    left: Math.min(rect.left + rect.width - 1, rect.left + Math.round((box.left / W) * rect.width)),
    top: Math.min(rect.top + rect.height - 1, rect.top + Math.round((box.top / H) * rect.height)),
  };
  from.width = Math.max(1, Math.min(rect.left + rect.width - from.left, Math.round((box.width / W) * rect.width)));
  from.height = Math.max(1, Math.min(rect.top + rect.height - from.top, Math.round((box.height / H) * rect.height)));
  const pad = { width: cell.width, height: cell.height, fit: 'contain', background: STYLE.ground };
  const left = await sharp(approved).extract(from).resize(box.width, box.height, { fit: 'fill' }).resize(pad).png().toBuffer();
  const right = await sharp(frame).extract(box).resize(pad).png().toBuffer();
  const where = percentText(box, W, H);
  const locator = locatorOf(box, W, H);
  return {
    cells: [
      { input: left, caption: `approved${SEP}${where}`, locator },
      { input: right, caption: `frame${SEP}${where}`, locator },
    ],
    placed: { ...region, frame: box, approved: from, scale: Number((box.width / from.width).toFixed(3)) },
  };
}

export async function compareKey({ key, tier = 'review', format = 'uhd', regions = null, renderer = null, by = 'builder', dir = null, look = true, lens = null }) {
  const k = config().keys.find((x) => x.id === key);
  if (!k) throw new Error(`no key ${key}`);
  const approved = rel(k.image);
  const r = renderer ?? (await getRenderer(false));
  const still = await r.renderStill({ key, tier, format, ...(lens ? { lens } : {}) });
  const fm = await sharp(still.file).metadata();
  const am = await sharp(approved).metadata();
  const W = fm.width;
  const H = fm.height;
  const rect = coverRect(am.width, am.height, W / H);
  const list = regions && regions.length ? regions : await detailRegions(approved, rect);
  const limits = criticLimits();
  const { gap, strip } = STYLE;
  const width = limits.maxEdge;
  const maxHeight = Math.min(limits.maxEdge, Math.floor((limits.maxMegapixels * 1e6) / width));
  const cols = 2 * PAIRS;
  const cw = Math.floor((width - (cols + 1) * gap) / cols);
  const full = { width: PAIRS * cw + (PAIRS - 1) * gap, height: 0 };
  full.height = Math.round((full.width * H) / W);
  const ch = maxHeight - (3 * gap + full.height + 2 * strip);
  if (ch < 1) throw new Error('the limits leave no room for crops');
  const small = { width: cw, height: ch };

  const top = await tile({
    cells: [
      { input: await sharp(approved).extract(rect).resize(full.width, full.height, { fit: 'fill' }).png().toBuffer(), caption: 'approved' },
      { input: await sharp(still.file).resize(full.width, full.height, { fit: 'fill' }).png().toBuffer(), caption: 'frame' },
    ],
    cols: 2,
    cell: full,
  });
  const first = [];
  const placed = [];
  for (const region of list.slice(0, PAIRS)) {
    const p = await pairCells({ approved, rect, frame: still.file, W, H, region, cell: small });
    first.push(...p.cells);
    placed.push(p.placed);
  }
  const blocks = [top];
  if (first.length) blocks.push(await tile({ cells: first, cols, cell: small }));
  const main = await assemble(blocks);
  const shared = { key, approved: k.image, frame: relPath(still.file), frameSize: { width: W, height: H }, approvedPart: rect };
  const note = fakeNote([still.record]);
  const file = path.join(outDir(dir, 'compare'), `${key}.png`);
  await writePng(file, main.buffer, madeRecord('compare', [still.record], { ...shared, regions: placed }));
  if (look) addLook(file, `${key}: approved beside frame, ${format} ${tier}, with ${placed.length} crop pairs${note}`, by);
  const files = [file];

  const rest = list.slice(PAIRS);
  if (rest.length) {
    const wide = { width: full.width, height: Math.floor((maxHeight - 3 * gap - 2 * strip) / 2) };
    for (let g = 0; g * PAIRS < rest.length; g++) {
      const cells = [];
      const more = [];
      for (const region of rest.slice(g * PAIRS, (g + 1) * PAIRS)) {
        const p = await pairCells({ approved, rect, frame: still.file, W, H, region, cell: wide });
        cells.push(...p.cells);
        more.push(p.placed);
      }
      const out = await assemble([await tile({ cells, cols: 2, cell: wide })]);
      const extra = path.join(outDir(dir, 'compare'), `${key}-pairs-${g + 1}.png`);
      await writePng(extra, out.buffer, madeRecord('compare-pairs', [still.record], { ...shared, regions: more }));
      if (look) addLook(extra, `${key}: ${more.length} more crop pairs, approved beside frame, ${format} ${tier}${note}`, by);
      files.push(extra);
    }
  }
  dropStale((n) => path.join(outDir(dir, 'compare'), `${key}-pairs-${n}.png`), files.length);
  return { file, files };
}

export async function compareCommand(a, renderer = null) {
  if (a.key === undefined || a.key === true) throw new Error('usage: npm run compare -- --key ID [--tier T] [--format F] [--regions "cx,cy cx,cy"] [--aperture METRES] [--focus METRES] [--fake]');
  const r = renderer ?? (await getRenderer(Boolean(a.fake)));
  try {
    return await compareKey({ key: one(a.key), tier: one(a.tier, 'review'), format: one(a.format, 'uhd'), regions: parseRegions(a.regions), renderer: r, lens: a.aperture === undefined && a.focus === undefined ? null : { aperture: a.aperture === true ? undefined : a.aperture, focus: a.focus === true ? undefined : a.focus } });
  } finally {
    await r.closeRenderer();
  }
}

if (isMain(import.meta)) {
  compareCommand(args()).then(
    ({ files }) => files.forEach((f) => console.log(`compare: ${relPath(f)}`)),
    (e) => {
      console.error(`compare: ${e.message}`);
      process.exit(1);
    },
  );
}
