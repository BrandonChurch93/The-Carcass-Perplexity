import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { areaOf, contains, dilate, fitCircle, gaussian, label, loopsOf, nest, simplify } from './lib/trace-core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MASTER = 'references/approved/7-reveal/reveal-master.jpg';
const OUT = 'src/places/reveal/continent.json';
const PREVIEW = 'out/work/trace/overlay.jpg';

export const RECIPE = {
  width: 1488,
  smooth: 1.2,
  land: { warm: -0.03, light: 38 },
  glint: { centre: [0.99, 0.36], radius: [0.2, 0.5], near: 30, warm: 0.02, light: 60 },
  reach: 12,
  skip: [
    [0.805, 0.615],
    [0.92, 0.615],
    [0.92, 0.53],
    [1.01, 0.53],
    [1.01, 1.01],
    [0.76, 1.01],
    [0.76, 0.86],
    [0.83, 0.83],
    [0.83, 0.7],
    [0.805, 0.7],
  ],
  seeds: [
    ['skull', 0.21, 0.46],
    ['upper arm', 0.329, 0.311],
    ['upper hand', 0.42, 0.155],
    ['upper ribs', 0.402, 0.373],
    ['lower ribs', 0.392, 0.535],
    ['lower arm', 0.378, 0.709],
    ['lower hand', 0.49, 0.784],
    ['backbone', 0.4755, 0.4627],
    ['hips', 0.629, 0.485],
    ['upper leg', 0.804, 0.336],
    ['upper foot', 0.944, 0.274],
    ['lower thigh', 0.734, 0.535],
    ['lower shin', 0.766, 0.672],
    ['lower foot', 0.79, 0.777],
  ],
  tolerance: 0.3,
  minOuter: 40,
  minHole: 8,
  limb: { until: 0.36, dark: 10 },
};

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

async function main() {
  const r = RECIPE;
  const meta = await sharp(path.join(ROOT, MASTER)).metadata();
  const w = r.width;
  const h = Math.round((meta.height * w) / meta.width);
  const unit = meta.width / w;
  const { data } = await sharp(path.join(ROOT, MASTER)).resize(w, h, { kernel: 'lanczos3', fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const light = new Float32Array(w * h);
  const warm = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const R = data[i * 3];
    const G = data[i * 3 + 1];
    const B = data[i * 3 + 2];
    light[i] = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    warm[i] = (R - B) / (R + G + B + 0.001);
  }
  const lb = gaussian(light, w, h, r.smooth);
  const wb = gaussian(warm, w, h, r.smooth);
  const wide = gaussian(wb, w, h, r.glint.near);
  const field = new Float32Array(w * h);
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const e = Math.hypot((x / w - r.glint.centre[0]) / r.glint.radius[0], (y / h - r.glint.centre[1]) / r.glint.radius[1]);
      const g = smoothstep(1.1, 0.9, e);
      const open = Math.min((wb[i] - r.land.warm) * 25, (lb[i] - r.land.light) / 30);
      const lit = Math.min((wb[i] - wide[i] - r.glint.warm) * 25, (lb[i] - r.glint.light) / 30);
      field[i] = contains(r.skip, [x / w, y / h]) ? -1 : open * (1 - g) + lit * g;
      mask[i] = field[i] > 0 ? 1 : 0;
    }
  }
  const grown = dilate(mask, w, h, r.reach);
  const { labels } = label(grown, w, h);
  const kept = new Set();
  const lost = [];
  for (const [name, fx, fy] of r.seeds) {
    const id = labels[Math.round(fy * h) * w + Math.round(fx * w)];
    if (id) kept.add(id);
    else lost.push(name);
  }
  for (let i = 0; i < w * h; i++) if (!kept.has(labels[i])) field[i] = -1;

  const loops = loopsOf(field, w, h).map((l) => simplify(l, r.tolerance));
  const shapes = nest(loops, { minOuter: r.minOuter, minHole: r.minHole });
  const toMaster = (loop) => loop.flatMap(([x, y]) => [Math.round((x + 0.5) * unit * 10) / 10, Math.round((y + 0.5) * unit * 10) / 10]);

  const edge = [];
  for (let x = 0; x < Math.round(r.limb.until * w); x += 4) {
    for (let y = 0; y < h; y++) {
      if (lb[y * w + x] > r.limb.dark) {
        if (y > 0) edge.push([(x + 0.5) * unit, (y + 0.5) * unit]);
        break;
      }
    }
  }
  const circle = edge.length >= 12 ? fitCircle(edge) : null;

  const out = {
    what: 'The outline of the continent, traced from the master by tools/trace.mjs. Points are in px of the master, x then y. Each shape is one piece of land with the seas inside it as holes. limb is the circle of the edge of the planet.',
    master: { file: MASTER, width: meta.width, height: meta.height },
    recipe: r,
    limb: circle ? { cx: Math.round(circle.cx), cy: Math.round(circle.cy), r: Math.round(circle.r) } : null,
    shapes: shapes.map((s) => ({ outer: toMaster(s.outer), holes: s.holes.map(toMaster) })),
  };
  fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(out)}\n`);

  const points = out.shapes.reduce((n, s) => n + s.outer.length / 2 + s.holes.reduce((m, hole) => m + hole.length / 2, 0), 0);
  const holes = out.shapes.reduce((n, s) => n + s.holes.length, 0);
  const land = shapes.reduce((n, s) => n + s.area - s.holes.reduce((m, hole) => m + Math.abs(areaOf(hole)), 0), 0);
  console.log(`trace: ${out.shapes.length} pieces of land, ${holes} seas inside them, ${points} points, land ${((100 * land) / (w * h)).toFixed(1)} percent of the master.`);
  if (lost.length) console.log(`trace: no land was found at these seeds: ${lost.join(', ')}.`);
  console.log(circle ? `trace: the edge of the planet is a circle of ${out.limb.r} px about ${out.limb.cx}, ${out.limb.cy}, from ${edge.length} points.` : 'trace: the edge of the planet was not found.');
  console.log(`trace: wrote ${OUT}, ${(fs.statSync(path.join(ROOT, OUT)).size / 1024).toFixed(0)} KB.`);

  const d = (flat) => `M${flat.map((v, i) => (v / unit).toFixed(2) + (i % 2 ? ' ' : ',')).join('')}Z`;
  const paths = out.shapes.map((s) => `<path d="${[s.outer, ...s.holes].map(d).join(' ')}" fill="#ff00ff" fill-opacity="0.35" fill-rule="evenodd" stroke="#ff00ff" stroke-width="0.8"/>`).join('');
  const ring = out.limb ? `<circle cx="${out.limb.cx / unit}" cy="${out.limb.cy / unit}" r="${out.limb.r / unit}" fill="none" stroke="#00ffff" stroke-width="1.5"/>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${paths}${ring}</svg>`;
  fs.mkdirSync(path.dirname(path.join(ROOT, PREVIEW)), { recursive: true });
  await sharp(path.join(ROOT, MASTER)).resize(w, h, { fit: 'fill' }).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 86 }).toFile(path.join(ROOT, PREVIEW));
  console.log(`trace: wrote ${PREVIEW} to look at.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
