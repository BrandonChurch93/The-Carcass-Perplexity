// Bakes the map of the outcrop's relief into the two pictures the land reads. Run from the repository root after any change to
// src/places/eye/land/outcrop.ts or height.ts: npx tsx assets-src/eye/land/bake-outcrop.ts
import sharp from 'sharp';
import { cropMap, cropMeshData } from '../../../src/places/eye/land/outcrop';

const { data, W, H } = cropMap();
// A loaded picture is turned over on its way to the card: the rows are written from the far side.
const rgb = Buffer.alloc(W * H * 3);
const W2 = Math.floor(W / 2);
const H2 = Math.floor(H / 2);
const rock = Buffer.alloc(W2 * H2);
for (let j = 0; j < H; j++) {
  for (let i = 0; i < W; i++) {
    const from = ((H - 1 - j) * W + i) * 4;
    const to = (j * W + i) * 3;
    rgb[to] = data[from] as number;
    rgb[to + 1] = data[from + 1] as number;
    rgb[to + 2] = data[from + 2] as number;
  }
}
for (let j = 0; j < H2; j++) {
  for (let i = 0; i < W2; i++) {
    let sum = 0;
    for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) sum += data[((2 * (H2 - 1 - j) + b) * W + 2 * i + a) * 4 + 3] as number;
    rock[j * W2 + i] = Math.round(sum / 4);
  }
}
await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 9 }).toFile('public/assets/eye/land/outcrop-map.png');
await sharp(rock, { raw: { width: W2, height: H2, channels: 1 } }).png({ compressionLevel: 9 }).toFile('public/assets/eye/land/outcrop-rock.png');
const mesh = cropMeshData();
const turned = Buffer.alloc(mesh.W * mesh.H * 3);
for (let j = 0; j < mesh.H; j++) turned.set(mesh.data.subarray((mesh.H - 1 - j) * mesh.W * 3, (mesh.H - j) * mesh.W * 3), j * mesh.W * 3);
await sharp(turned, { raw: { width: mesh.W, height: mesh.H, channels: 3 } }).png({ compressionLevel: 9 }).toFile('public/assets/eye/land/outcrop-mesh.png');
console.log(`outcrop mesh ${mesh.W} x ${mesh.H}`);
console.log(`outcrop map ${W} x ${H}, rock ${W2} x ${H2}`);
