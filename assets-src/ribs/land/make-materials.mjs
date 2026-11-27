// Makes the tiling material pictures of the Ribs from the generated takes: a colour picture and a data picture (normal x, normal y, height) of each.
// Run: node assets-src/ribs/land/make-materials.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const OUT = path.join(ROOT, 'public', 'assets', 'ribs');

export const RECIPE = {
  band: 0.14,
  heightBlur: 0.05,
  heightSpread: 0.2,
  normalStrength: 2.2,
  jpegQuality: 92,
  materials: [
    { name: 'shingle', from: 'land/shingle-take1.jpg', to: 'land', width: 1024, height: 1024, dataAs: 'jpg' },
    // The tusk blades' stone, the colony crag's bedded rock and the lichen of both: one generated take each, kept at the take's own shape.
    { name: 'tusk', from: 'land/tusk-take1.jpg', to: 'land', width: 1536, height: 1024, dataAs: 'jpg' },
    { name: 'strata', from: 'land/strata-take1.jpg', to: 'land', width: 1536, height: 864, dataAs: 'jpg' },
    { name: 'lichen', from: 'land/lichen-take1.jpg', to: 'land', width: 1536, height: 1024, colourOnly: true },
    // The storm sky is laid on the dome whole and mirrored round it: it is not made to tile.
  ],
};

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// One axis at a time: the middle of the picture stays, and toward the two edges it fades into a copy shifted by half the size, whose own middle is unbroken there.
function wrapAxis(data, w, h, axis, band) {
  const out = new Float32Array(data.length);
  const n = axis === 0 ? w : h;
  const half = n >> 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = axis === 0 ? x : y;
      const edge = Math.min(a, n - 1 - a) / n;
      const k = smooth(0, band, edge);
      const sx = axis === 0 ? (x + half) % w : x;
      const sy = axis === 1 ? (y + half) % h : y;
      for (let c = 0; c < 3; c++) out[(y * w + x) * 3 + c] = data[(y * w + x) * 3 + c] * k + data[(sy * w + sx) * 3 + c] * (1 - k);
    }
  }
  return out;
}

function blurWrap(src, w, h, radius) {
  const r = Math.max(1, Math.round(radius));
  let a = Float32Array.from(src);
  const b = new Float32Array(src.length);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += a[y * w + ((k + w * 8) % w)];
      for (let x = 0; x < w; x++) {
        b[y * w + x] = sum / (2 * r + 1);
        sum += a[y * w + ((x + r + 1) % w)] - a[y * w + ((x - r + w * 8) % w)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += b[((k + h * 8) % h) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = sum / (2 * r + 1);
        sum += b[((y + r + 1) % h) * w + x] - b[((y - r + h * 8) % h) * w + x];
      }
    }
  }
  return a;
}

async function material(m) {
  const w = m.width;
  const h = m.height;
  const { data } = await sharp(path.join(HERE, '..', m.from)).removeAlpha().resize(w, h, { kernel: 'lanczos3', fit: 'cover' }).raw().toBuffer({ resolveWithObject: true });
  let f = Float32Array.from(data);
  if (!m.plain) {
    f = wrapAxis(f, w, h, 0, m.band ?? RECIPE.band);
    f = wrapAxis(f, w, h, 1, m.band ?? RECIPE.band);
  }
  const colour = Buffer.alloc(w * h * 3);
  for (let i = 0; i < f.length; i++) colour[i] = Math.max(0, Math.min(255, Math.round(f[i])));
  const dir = path.join(OUT, m.to);
  fs.mkdirSync(dir, { recursive: true });
  await sharp(colour, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: RECIPE.jpegQuality, chromaSubsampling: '4:4:4' }).toFile(path.join(dir, `${m.name}.jpg`));
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < w * h; i++) {
    r += Math.pow(f[i * 3] / 255, 2.2);
    g += Math.pow(f[i * 3 + 1] / 255, 2.2);
    b += Math.pow(f[i * 3 + 2] / 255, 2.2);
  }
  const mean = [r, g, b].map((v) => Math.round((v / (w * h)) * 1000) / 1000);
  if (m.colourOnly) return { name: m.name, mean };

  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = (0.2126 * f[i * 3] + 0.7152 * f[i * 3 + 1] + 0.0722 * f[i * 3 + 2]) / 255;
  const low = blurWrap(lum, w, h, RECIPE.heightBlur * h);
  const fine = blurWrap(lum, w, h, 1.2);
  const hgt = new Float32Array(w * h);
  let avg = 0;
  for (let i = 0; i < w * h; i++) {
    hgt[i] = fine[i] - low[i];
    avg += hgt[i];
  }
  avg /= w * h;
  let sd = 0;
  for (let i = 0; i < w * h; i++) sd += (hgt[i] - avg) ** 2;
  sd = Math.sqrt(sd / (w * h)) || 1;
  for (let i = 0; i < w * h; i++) hgt[i] = Math.min(1, Math.max(0, 0.5 + ((hgt[i] - avg) / sd) * RECIPE.heightSpread));
  const packed = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const at = (xx, yy) => hgt[((yy + h) % h) * w + ((xx + w) % w)];
      const dx = (at(x + 1, y) - at(x - 1, y)) * 0.5 * RECIPE.normalStrength * 8;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 0.5 * RECIPE.normalStrength * 8;
      const i = (y * w + x) * 3;
      packed[i] = Math.max(0, Math.min(255, Math.round(127.5 - dx * 127.5)));
      packed[i + 1] = Math.max(0, Math.min(255, Math.round(127.5 - dy * 127.5)));
      packed[i + 2] = Math.round(hgt[y * w + x] * 255);
    }
  }
  // A picture has to stay under 3 MB: the widest one keeps its data as a JPEG of high quality with no chroma loss.
  const data8 = sharp(packed, { raw: { width: w, height: h, channels: 3 } });
  if (m.dataAs === 'jpg') await data8.jpeg({ quality: 96, chromaSubsampling: '4:4:4' }).toFile(path.join(dir, `${m.name}-nh.jpg`));
  else await data8.png({ compressionLevel: 9 }).toFile(path.join(dir, `${m.name}-nh.png`));
  return { name: m.name, mean };
}

const rows = [];
for (const m of RECIPE.materials) rows.push(await material(m));
fs.writeFileSync(path.join(OUT, 'land', 'materials.json'), `${JSON.stringify({ recipe: RECIPE, note: 'mean is the linear mean colour of each picture, 0 to 1', materials: rows }, null, 2)}\n`);
for (const r of rows) console.log(r.name, r.mean.join(' '));
