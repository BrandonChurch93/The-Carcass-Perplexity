// Makes the churned mud of the wallow from one generated picture: a colour picture that tiles, and a data picture of it
// (slope in red and green, height in blue). Run from the repo root: node assets-src/marsh/wallowers/make-churn.mjs
import sharp from 'sharp';

const SRC = 'assets-src/marsh/wallowers/churn-source.jpg';
const OUT = 'public/assets/marsh/wallowers/';
const N = 896;
const B = 128;
const SIZE = 1024;

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const left = Math.floor((W - (N + B)) / 2);
const at = (x, y, c) => data[((y * W + x + left) * 3 + c)];
// The band at the left and at the top fades from what lies just past the far edge into the tile's own: the tile then goes on into itself.
const tile = new Float32Array(N * N * 3);
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    const wx = x < B ? x / B : 1;
    const wy = y < B ? y / B : 1;
    const sx = wx * wx * (3 - 2 * wx);
    const sy = wy * wy * (3 - 2 * wy);
    for (let c = 0; c < 3; c++) {
      const own = at(x, y, c);
      const px = x < B ? at(x + N, y, c) : own;
      const py = y < B ? at(x, y + N, c) : own;
      const pxy = x < B && y < B ? at(x + N, y + N, c) : x < B ? px : py;
      const rowOwn = own * sx + px * (1 - sx);
      const rowFar = py * sx + pxy * (1 - sx);
      tile[(y * N + x) * 3 + c] = rowOwn * sy + rowFar * (1 - sy);
    }
  }
}
const bytes = Buffer.from(Uint8ClampedArray.from(tile, (v) => Math.round(v)));
const colour = sharp(bytes, { raw: { width: N, height: N, channels: 3 } }).resize(SIZE, SIZE, { kernel: 'lanczos3' });
await colour.clone().jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toFile(OUT + 'churn.jpg');

// Height: the pits hold red brine (dark, saturated, smooth) and the clods are paler and greyer, their crumbs palest.
const rgb = await colour.clone().raw().toBuffer();
const h0 = Buffer.alloc(SIZE * SIZE);
const lum = Buffer.alloc(SIZE * SIZE);
for (let i = 0; i < SIZE * SIZE; i++) {
  const r = rgb[i * 3] / 255;
  const g = rgb[i * 3 + 1] / 255;
  const b = rgb[i * 3 + 2] / 255;
  const red = (r - 0.5 * (g + b)) / Math.max(r, 0.05);
  h0[i] = Math.round(255 * Math.min(1, Math.max(0, (0.86 - red) / 0.62)));
  lum[i] = Math.round(255 * Math.min(1, (0.3 * r + 0.5 * g + 0.2 * b) * 1.7));
}
// Blurred across the seam: the tile is laid out three by three, blurred, and its middle taken.
const soft = async (buf, sigma) => {
  const one = sharp(buf, { raw: { width: SIZE, height: SIZE, channels: 1 } });
  const row = await sharp({ create: { width: SIZE * 3, height: SIZE * 3, channels: 3, background: '#000' } })
    .composite([{ input: await one.png().toBuffer(), tile: true }])
    .extractChannel(0)
    .blur(sigma)
    .extract({ left: SIZE, top: SIZE, width: SIZE, height: SIZE })
    .raw()
    .toBuffer();
  return row;
};
const broad = await soft(h0, 7);
const mid = await soft(lum, 2.2);
const fine = await soft(lum, 0.8);
const h = new Float32Array(SIZE * SIZE);
let lo = 1e9;
let hi = -1e9;
for (let i = 0; i < h.length; i++) {
  h[i] = 0.6 * broad[i] + 0.3 * mid[i] + 0.1 * fine[i];
  lo = Math.min(lo, h[i]);
  hi = Math.max(hi, h[i]);
}
const sorted = Float32Array.from(h).sort();
lo = sorted[Math.floor(sorted.length * 0.003)];
hi = sorted[Math.floor(sorted.length * 0.997)];
for (let i = 0; i < h.length; i++) h[i] = Math.min(1, Math.max(0, (h[i] - lo) / (hi - lo)));
const nh = Buffer.alloc(SIZE * SIZE * 3);
const wrap = (v) => (v + SIZE) % SIZE;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx = (h[y * SIZE + wrap(x + 1)] - h[y * SIZE + wrap(x - 1)]) * 0.5;
    const dy = (h[wrap(y + 1) * SIZE + x] - h[wrap(y - 1) * SIZE + x]) * 0.5;
    const o = (y * SIZE + x) * 3;
    nh[o] = Math.round(255 * Math.min(1, Math.max(0, 0.5 + dx * 9)));
    nh[o + 1] = Math.round(255 * Math.min(1, Math.max(0, 0.5 + dy * 9)));
    nh[o + 2] = Math.round(255 * h[y * SIZE + x]);
  }
}
await sharp(nh, { raw: { width: SIZE, height: SIZE, channels: 3 } }).jpeg({ quality: 84, chromaSubsampling: '4:4:4' }).toFile(OUT + 'churn-nh.jpg');
const mean = [0, 1, 2].map((c) => { let s = 0; for (let i = 0; i < SIZE * SIZE; i++) s += (rgb[i * 3 + c] / 255) ** 2.2; return (s / (SIZE * SIZE)).toFixed(3); });
console.log('churn.jpg and churn-nh.jpg written; mean colour (linear)', mean.join(', '));
