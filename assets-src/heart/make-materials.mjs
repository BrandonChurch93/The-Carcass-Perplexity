// Makes the tiling material pictures of the Heart from the generated sheets.
// Run: node assets-src/heart/make-materials.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'references', 'drafts', 'working', 'heart-materials');
const OUT = path.join(ROOT, 'public', 'assets', 'heart', 'mat');

export const RECIPE = {
  size: 1024,
  band: 0.14,
  heightBlur: 0.05,
  heightSpread: 0.2,
  normalStrength: 2.2,
  jpegQuality: 92,
  materials: ['crust-skin', 'pahoehoe', 'cliff', 'talus', 'sulphur', 'hide', 'flake', 'boulder'],
};

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// One axis at a time: the middle of the picture stays, and toward the two edges it fades into a copy shifted by half the size, whose own middle is unbroken there.
function wrapAxis(data, n, axis, band) {
  const out = new Float32Array(data.length);
  const half = n >> 1;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const a = axis === 0 ? x : y;
      const edge = Math.min(a, n - 1 - a) / n;
      const w = smooth(0, band, edge);
      const sx = axis === 0 ? (x + half) % n : x;
      const sy = axis === 1 ? (y + half) % n : y;
      for (let c = 0; c < 3; c++) out[(y * n + x) * 3 + c] = data[(y * n + x) * 3 + c] * w + data[(sy * n + sx) * 3 + c] * (1 - w);
    }
  }
  return out;
}

function blurWrap(src, n, radius) {
  const r = Math.max(1, Math.round(radius));
  let a = Float32Array.from(src);
  const b = new Float32Array(src.length);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < n; y++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += a[y * n + ((k + n) % n)];
      for (let x = 0; x < n; x++) {
        b[y * n + x] = sum / (2 * r + 1);
        sum += a[y * n + ((x + r + 1) % n)] - a[y * n + ((x - r + n) % n)];
      }
    }
    for (let x = 0; x < n; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += b[((k + n) % n) * n + x];
      for (let y = 0; y < n; y++) {
        a[y * n + x] = sum / (2 * r + 1);
        sum += b[((y + r + 1) % n) * n + x] - b[((y - r + n) % n) * n + x];
      }
    }
  }
  return a;
}

async function material(name) {
  const n = RECIPE.size;
  const { data } = await sharp(path.join(SRC, `${name}.png`)).removeAlpha().resize(n, n, { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  let f = Float32Array.from(data);
  f = wrapAxis(f, n, 0, RECIPE.band);
  f = wrapAxis(f, n, 1, RECIPE.band);
  const colour = Buffer.alloc(n * n * 3);
  for (let i = 0; i < f.length; i++) colour[i] = Math.max(0, Math.min(255, Math.round(f[i])));
  await sharp(colour, { raw: { width: n, height: n, channels: 3 } }).jpeg({ quality: RECIPE.jpegQuality, chromaSubsampling: '4:4:4' }).toFile(path.join(OUT, `${name}.jpg`));

  const lum = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) lum[i] = (0.2126 * f[i * 3] + 0.7152 * f[i * 3 + 1] + 0.0722 * f[i * 3 + 2]) / 255;
  const low = blurWrap(lum, n, RECIPE.heightBlur * n);
  const fine = blurWrap(lum, n, 1.2);
  const h = new Float32Array(n * n);
  let mean = 0;
  for (let i = 0; i < n * n; i++) {
    h[i] = fine[i] - low[i];
    mean += h[i];
  }
  mean /= n * n;
  let sd = 0;
  for (let i = 0; i < n * n; i++) sd += (h[i] - mean) ** 2;
  sd = Math.sqrt(sd / (n * n)) || 1;
  for (let i = 0; i < n * n; i++) h[i] = Math.min(1, Math.max(0, 0.5 + ((h[i] - mean) / sd) * RECIPE.heightSpread));
  const packed = Buffer.alloc(n * n * 3);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const at = (xx, yy) => h[((yy + n) % n) * n + ((xx + n) % n)];
      const dx = (at(x + 1, y) - at(x - 1, y)) * 0.5 * RECIPE.normalStrength * 8;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 0.5 * RECIPE.normalStrength * 8;
      const i = (y * n + x) * 3;
      packed[i] = Math.max(0, Math.min(255, Math.round(127.5 - dx * 127.5)));
      packed[i + 1] = Math.max(0, Math.min(255, Math.round(127.5 - dy * 127.5)));
      packed[i + 2] = Math.round(h[y * n + x] * 255);
    }
  }
  await sharp(packed, { raw: { width: n, height: n, channels: 3 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT, `${name}-nh.png`));
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < n * n; i++) {
    r += Math.pow(f[i * 3] / 255, 2.2);
    g += Math.pow(f[i * 3 + 1] / 255, 2.2);
    b += Math.pow(f[i * 3 + 2] / 255, 2.2);
  }
  return { name, mean: [r, g, b].map((v) => Math.round((v / (n * n)) * 1000) / 1000) };
}

fs.mkdirSync(OUT, { recursive: true });
const rows = [];
for (const name of RECIPE.materials) rows.push(await material(name));
await sharp(path.join(SRC, 'sky.png')).removeAlpha().jpeg({ quality: 94, chromaSubsampling: '4:4:4' }).toFile(path.join(OUT, 'sky.jpg'));
fs.writeFileSync(path.join(OUT, 'materials.json'), `${JSON.stringify({ recipe: RECIPE, note: 'mean is the linear mean colour of each picture, 0 to 1', materials: rows }, null, 2)}\n`);
for (const r of rows) console.log(r.name, r.mean.join(' '));
