// Packs the two cloud pictures into the tile the lid reads: 512 by 512, two bytes a texel (banks, puffs), written as base64 into
// src/places/reveal/join/cloud.data.ts. Run from the root: node assets-src/reveal/join/pack.mjs
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const N = 512;
async function grey(file) {
  const meta = await sharp(file).metadata();
  const side = Math.min(meta.width, meta.height);
  const { data } = await sharp(file)
    .extract({ left: Math.floor((meta.width - side) / 2), top: Math.floor((meta.height - side) / 2), width: side, height: side })
    .resize(N, N, { kernel: 'lanczos3' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return Float32Array.from(data, (v) => v / 255);
}
// The picture and itself moved by half a tile, first across and then down, each weighted so that the seam of one lies where the other is
// whole: the tile then repeats with no edge. The edge between the two is bent, so no straight line of it shows in the banks.
function tiling(a) {
  const ramp = (x) => Math.min(1, Math.max(0, x));
  const pass = (src, down) => {
    const out = new Float32Array(N * N);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const along = ((down ? x : y) + 0.5) / N;
        const d = Math.abs(((down ? y : x) + 0.5) / N - 0.5);
        const bend = 0.04 * Math.sin(6.2832 * (2 * along + (down ? 0.3 : 0.7))) + 0.025 * Math.sin(6.2832 * (5 * along + 0.1));
        let w = ramp((0.4 - d + bend) / 0.16);
        w = w * w * (3 - 2 * w);
        // The other is also turned over, so the tile does not hold the same bank twice half a tile apart.
        const other = down ? src[((y + N / 2) % N) * N + (N - 1 - x)] : src[(N - 1 - y) * N + ((x + N / 2) % N)];
        out[y * N + x] = Math.max(src[y * N + x] * w, other * (1 - w));
      }
    }
    return out;
  };
  return pass(pass(a, false), true);
}
function levels(a, black, white) {
  return a.map((v) => Math.min(1, Math.max(0, (v - black) / (white - black))));
}
const banks = levels(tiling(await grey('assets-src/reveal/join/banks-take1.png')), 0.04, 0.96);
const puffs = levels(tiling(await grey('assets-src/reveal/join/puffs-take1.png')), 0.04, 0.9);
const bytes = Buffer.alloc(N * N * 2);
for (let i = 0; i < N * N; i++) {
  bytes[2 * i] = Math.round(banks[i] * 255);
  bytes[2 * i + 1] = Math.round(puffs[i] * 255);
}
writeFileSync(
  'src/places/reveal/join/cloud.data.ts',
  `// Written by assets-src/reveal/join/pack.mjs. Two bytes a texel: how high a bank of cloud stands, how high a field of small cloud stands.\nexport const CLOUD_SIZE = ${N};\nexport const CLOUD_BYTES = '${bytes.toString('base64')}';\n`,
);
if (process.argv.includes('--look')) {
  await sharp(Buffer.from(banks.map((v) => v * 255)), { raw: { width: N, height: N, channels: 1 } }).png().toFile('out/work/tile-banks.png');
  await sharp(Buffer.from(puffs.map((v) => v * 255)), { raw: { width: N, height: N, channels: 1 } }).png().toFile('out/work/tile-puffs.png');
  // Places in open air with a bank near: the least of the picture blurred over a twelfth of the tile.
  const R = 26, blur = new Float32Array(N * N);
  const cand = [];
  for (let y = 0; y < N; y += 8) for (let x = 0; x < N; x += 8) {
    let s = 0, far = 0, c = 0, cf = 0;
    for (let j = -R * 3; j <= R * 3; j += 4) for (let i = -R * 3; i <= R * 3; i += 4) {
      const d = Math.hypot(i, j); const v = banks[((y + j + 4 * N) % N) * N + ((x + i + 4 * N) % N)];
      if (d <= R) { s += v > 0.2 ? 1 : 0; c++; } else if (d <= R * 3) { far += v > 0.2 ? 1 : 0; cf++; }
    }
    cand.push([s / c, far / cf, x / N, y / N]);
  }
  cand.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  console.log(cand.filter((c) => c[0] < 0.02 && c[1] > 0.3).slice(0, 40).map((c) => c.map((v) => v.toFixed(3)).join(' ')).join('\n'));
  let cover = 0; for (const v of banks) cover += v > 0.2 ? 1 : 0; console.log('cover', cover / (N * N));
}
