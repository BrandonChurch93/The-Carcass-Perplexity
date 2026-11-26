// Makes the tiling material pictures of a place from its generated sheets, and its sky picture.
// Run: node assets-src/materials/make-materials.mjs <place> [<place> ...]     (ribs, breath, marsh, spine, eye, reveal)
// Reads assets-src/<place>/mat/src/<name>.png, assets-src/materials/spec.json and assets-src/materials/spec2.json.
// Writes public/assets/<place>/mat/<name>.jpg (colour, sRGB), <name>-nh.png (red and green: the slope on x and y, 0.5 is level; blue: height), sky.jpg and materials.json.
// A plate (one whole picture: a feature on black, a far backplate, a ground plate) is written as <name>.jpg at its own size and is not made to repeat.
// Where assets-src/<place>/mat/src/<name>-h.png exists, the plate's relief is written beside it as <name>-h.png (grey: white high or near, black low or far).
// The method is the Heart's (assets-src/heart/make-materials.mjs), unchanged, so a place can read these the way the Heart reads its own.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const readSpec = (name) => {
  const file = path.join(ROOT, 'assets-src', 'materials', name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
};
// spec.json is the first list (2026-11-25), spec2.json the second (2026-11-26: backplates, feature sheets, ground plates, more tiles).
const SPEC = [...readSpec('spec.json'), ...readSpec('spec2.json')];

export const RECIPE = { size: 1024, band: 0.14, heightBlur: 0.05, heightSpread: 0.2, normalStrength: 2.2, jpegQuality: 92, skyWidth: 2048, skyQuality: 94 };

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

async function material(place, name, out) {
  const n = RECIPE.size;
  const { data } = await sharp(path.join(ROOT, 'assets-src', place, 'mat', 'src', `${name}.png`)).flatten({ background: '#000000' }).resize(n, n, { kernel: 'lanczos3', fit: 'cover' }).raw().toBuffer({ resolveWithObject: true });
  let f = Float32Array.from(data);
  f = wrapAxis(f, n, 0, RECIPE.band);
  f = wrapAxis(f, n, 1, RECIPE.band);
  const colour = Buffer.alloc(n * n * 3);
  for (let i = 0; i < f.length; i++) colour[i] = Math.max(0, Math.min(255, Math.round(f[i])));
  await sharp(colour, { raw: { width: n, height: n, channels: 3 } }).jpeg({ quality: RECIPE.jpegQuality, chromaSubsampling: '4:4:4' }).toFile(path.join(out, `${name}.jpg`));

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
  await sharp(packed, { raw: { width: n, height: n, channels: 3 } }).png({ compressionLevel: 9 }).toFile(path.join(out, `${name}-nh.png`));
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < n * n; i++) {
    r += Math.pow(f[i * 3] / 255, 2.2);
    g += Math.pow(f[i * 3 + 1] / 255, 2.2);
    b += Math.pow(f[i * 3 + 2] / 255, 2.2);
  }
  return [r, g, b].map((v) => Math.round((v / (n * n)) * 1000) / 1000);
}

for (const place of process.argv.slice(2)) {
  const out = path.join(ROOT, 'public', 'assets', place, 'mat');
  fs.mkdirSync(out, { recursive: true });
  const rows = [];
  for (const row of SPEC.filter((r) => r.place === place)) {
    const src = path.join(ROOT, 'assets-src', place, 'mat', 'src', `${row.name}.png`);
    if (!fs.existsSync(src)) {
      console.log(`${place}/${row.name}: no source picture, left out`);
      continue;
    }
    if (row.kind === 'sky') {
      const meta = await sharp(src).metadata();
      await sharp(src).removeAlpha().resize(Math.min(RECIPE.skyWidth, meta.width)).jpeg({ quality: RECIPE.skyQuality, chromaSubsampling: '4:4:4' }).toFile(path.join(out, 'sky.jpg'));
      const made = await sharp(path.join(out, 'sky.jpg')).metadata();
      rows.push({ name: 'sky', kind: 'sky', width: made.width, height: made.height });
    } else if (row.kind === 'plate') {
      // A source with a clear background is laid on black, and its cover is written beside it as <name>-a.png (grey: white is the subject).
      const meta = await sharp(src).metadata();
      await sharp(src).flatten({ background: '#000000' }).jpeg({ quality: RECIPE.skyQuality, chromaSubsampling: '4:4:4' }).toFile(path.join(out, `${row.name}.jpg`));
      const made = await sharp(path.join(out, `${row.name}.jpg`)).metadata();
      const entry = { name: row.name, kind: 'plate', metres: row.metres, width: made.width, height: made.height };
      if (meta.hasAlpha) {
        const cover = await sharp(src).extractChannel(3).raw().toBuffer();
        let clear = 0;
        for (let i = 0; i < cover.length; i++) if (cover[i] < 128) clear++;
        if (clear > cover.length * 0.02) {
          await sharp(src).extractChannel(3).png({ compressionLevel: 9 }).toFile(path.join(out, `${row.name}-a.png`));
          entry.cover = `${row.name}-a.png`;
        }
      }
      // A plate may have a relief picture beside it: grey, the size of the colour picture, white high or near, black low or far.
      const relief = path.join(ROOT, 'assets-src', place, 'mat', 'src', `${row.name}-h.png`);
      if (fs.existsSync(relief)) {
        await sharp(relief).removeAlpha().resize(made.width, made.height, { kernel: 'lanczos3', fit: 'fill' }).greyscale().png({ compressionLevel: 9 }).toFile(path.join(out, `${row.name}-h.png`));
        entry.relief = `${row.name}-h.png`;
      }
      rows.push(entry);
    } else {
      rows.push({ name: row.name, kind: 'tile', metres: row.metres, mean: await material(place, row.name, out) });
    }
  }
  fs.writeFileSync(path.join(out, 'materials.json'), `${JSON.stringify({ recipe: RECIPE, note: 'mean is the linear mean colour of each tile, 0 to 1; metres is the real width one repeat of a tile, or the whole of a plate, stands for (0 for a far backplate); relief names the grey height picture of a plate, cover the grey picture of where its subject is', materials: rows }, null, 2)}\n`);
  for (const r of rows) console.log(place, r.name, r.kind === 'tile' ? r.mean.join(' ') : `${r.width} x ${r.height}`);
}
