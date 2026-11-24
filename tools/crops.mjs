import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { args, readJson } from './lib/paths.mjs';
import { addLook } from './look.mjs';
import { criticLimits, gridFit, grid, writePng, madeRecord, cropBox, percentText, locatorOf, parseRegions, relPath, getRenderer, isMain, one, clean, SEP, fakeNote, outDir, dropStale } from './lib/img.mjs';

export const GRID = { cols: 2, rows: 2 };

export function lattice() {
  const cols = [
    ['left edge', 0],
    ['centre', 0.5],
    ['right edge', 1],
  ];
  const rows = [
    ['upper third', 1 / 3],
    ['lower third', 2 / 3],
  ];
  return rows.flatMap(([rl, cy]) => cols.map(([cl, cx]) => ({ label: `${cl}, ${rl}`, cx, cy })));
}

export async function cropGrids({ file, name, regions = null, record = null, by = 'builder', dir = null, look = true }) {
  const meta = await sharp(file).metadata();
  const W = meta.width;
  const H = meta.height;
  const per = GRID.cols * GRID.rows;
  const cell = gridFit({ ...GRID, aspect: W / H, title: true, limits: criticLimits(), maxCell: { width: W, height: H } });
  const seen = new Set();
  const list = (regions && regions.length ? regions : lattice()).filter((r) => {
    const b = cropBox(r.cx, r.cy, cell.width, cell.height, W, H);
    const id = `${b.left},${b.top}`;
    return seen.has(id) ? false : seen.add(id);
  });
  const source = record ?? (fs.existsSync(file + '.json') ? readJson(file + '.json') : null);
  const total = Math.ceil(list.length / per);
  const files = [];
  for (let g = 0; g < total; g++) {
    const part = list.slice(g * per, (g + 1) * per);
    const cells = [];
    const placed = [];
    for (let i = 0; i < part.length; i++) {
      const r = part[i];
      const box = cropBox(r.cx, r.cy, cell.width, cell.height, W, H);
      const input = await sharp(file).extract(box).png().toBuffer();
      const label = clean(r.label ?? `region ${g * per + i + 1}`);
      cells.push({ input, caption: `${label}${SEP}${percentText(box, W, H)}`, locator: locatorOf(box, W, H) });
      placed.push({ label, cx: r.cx, cy: r.cy, ...box });
    }
    const title = [name, `crops at native size from ${W} x ${H}`, `grid ${g + 1} of ${total}`].join(SEP);
    const out = await grid({ cells, cols: GRID.cols, cell, title });
    const target = path.join(outDir(dir, 'crops'), `${name}-${g + 1}.png`);
    await writePng(
      target,
      out.buffer,
      madeRecord('crops', [source], { name, source: relPath(file), sourceSize: { width: W, height: H }, crop: cell, grid: g + 1, grids: total, regions: placed.map((p, i) => ({ ...p, at: out.places[i] })) }),
    );
    if (look) addLook(target, `${name}: native-size crops, grid ${g + 1} of ${total}${fakeNote([source])}`, by);
    files.push(target);
  }
  dropStale((n) => path.join(outDir(dir, 'crops'), `${name}-${n}.png`), total + 1);
  return { files };
}

export async function cropsCommand(a, renderer = null) {
  const regions = parseRegions(a.regions);
  if (a.file) {
    const file = path.resolve(one(a.file));
    const name = one(a.name, path.basename(file).replace(/\.[^.]+$/, ''));
    return cropGrids({ file, name, regions });
  }
  const tier = one(a.tier, 'review');
  const format = one(a.format, 'uhd');
  const what = a.key !== undefined ? { key: one(a.key) } : a.frame !== undefined ? { frame: Number(one(a.frame)) } : null;
  if (!what) throw new Error('usage: npm run crops -- --key ID | --frame N | --file PATH --name NAME [--tier T] [--format F] [--regions "cx,cy cx,cy"] [--fake]');
  const r = renderer ?? (await getRenderer(Boolean(a.fake)));
  try {
    const still = await r.renderStill({ ...what, tier, format });
    const name = one(a.name, what.key ?? `frame-${what.frame}`);
    return await cropGrids({ file: still.file, name, regions, record: still.record });
  } finally {
    await r.closeRenderer();
  }
}

if (isMain(import.meta)) {
  cropsCommand(args()).then(
    ({ files }) => files.forEach((f) => console.log(`crops: ${relPath(f)}`)),
    (e) => {
      console.error(`crops: ${e.message}`);
      process.exit(1);
    },
  );
}
