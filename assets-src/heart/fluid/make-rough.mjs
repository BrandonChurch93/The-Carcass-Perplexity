// Makes the rough broken basalt sheet of the feeding floor from its generated picture.
// Run: node assets-src/heart/fluid/make-rough.mjs
// Writes public/assets/heart/mat/rough-nt.jpg: r, g the slope of the height (0.5 is level; a height that runs 0 to 1 over the
// sheet climbs (r - 0.5) * 2 * SLOPE for each sheet length), b the tone (0.5 is the mean of the stone, flat fielded).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SRC = path.join(ROOT, 'assets-src', 'heart', 'gen', 'rough-t1.jpg');
const OUT = path.join(ROOT, 'public', 'assets', 'heart', 'mat', 'rough-nt.jpg');
export const RECIPE = { size: 1024, band: 0.12, fieldBlur: 0.12, heightBlur: 0.04, heightSpread: 0.2, slope: 160, jpegQuality: 86 };

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// One axis at a time: the middle stays, and toward the two edges it fades into a copy shifted by half the size.
function wrapAxis(data, n, axis, band) {
  const out = new Float32Array(data.length);
  const half = n >> 1;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const a = axis === 0 ? x : y;
      const w = smooth(0, band, Math.min(a, n - 1 - a) / n);
      const sx = axis === 0 ? (x + half) % n : x;
      const sy = axis === 1 ? (y + half) % n : y;
      out[y * n + x] = data[y * n + x] * w + data[sy * n + sx] * (1 - w);
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

const n = RECIPE.size;
const { data } = await sharp(SRC).removeAlpha().resize(n, n, { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
let lum = new Float32Array(n * n);
for (let i = 0; i < n * n; i++) lum[i] = (0.2126 * data[i * 3] + 0.7152 * data[i * 3 + 1] + 0.0722 * data[i * 3 + 2]) / 255;
lum = wrapAxis(lum, n, 0, RECIPE.band);
lum = wrapAxis(lum, n, 1, RECIPE.band);
const field = blurWrap(lum, n, RECIPE.fieldBlur * n);
const low = blurWrap(lum, n, RECIPE.heightBlur * n);
const fine = blurWrap(lum, n, 1);
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
let clipped = 0;
for (let y = 0; y < n; y++)
  for (let x = 0; x < n; x++) {
    const at = (xx, yy) => h[((yy + n) % n) * n + ((xx + n) % n)];
    const dx = ((at(x + 1, y) - at(x - 1, y)) * 0.5 * n) / RECIPE.slope;
    const dy = ((at(x, y + 1) - at(x, y - 1)) * 0.5 * n) / RECIPE.slope;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) clipped++;
    const i = (y * n + x) * 3;
    packed[i] = Math.max(0, Math.min(255, Math.round(127.5 + dx * 127.5)));
    packed[i + 1] = Math.max(0, Math.min(255, Math.round(127.5 + dy * 127.5)));
    packed[i + 2] = Math.max(0, Math.min(255, Math.round((127.5 * lum[y * n + x]) / field[y * n + x])));
  }
await sharp(packed, { raw: { width: n, height: n, channels: 3 } }).jpeg({ quality: RECIPE.jpegQuality, chromaSubsampling: '4:4:4' }).toFile(OUT);
console.log(OUT, 'clipped slopes', ((100 * clipped) / (n * n)).toFixed(2), 'percent');
