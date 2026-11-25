// Mean colour of named regions of the Heart's wide key, in the approved picture and in a frame: the light and the air are tuned against these numbers.
// npm run regions -- [FILE ...]   (no file: the approved picture and the last draft still of heart-0)
import sharp from 'sharp';
import { existsSync } from 'node:fs';

const REGIONS = {
  sky: [0.2, 0.01, 0.5, 0.05],
  benchRopy: [0.05, 0.82, 0.25, 0.97],
  benchMid: [0.2, 0.62, 0.3, 0.7],
  crustMid: [0.5, 0.6, 0.7, 0.67],
  crustLowRight: [0.8, 0.72, 0.97, 0.9],
  crustFar: [0.45, 0.44, 0.53, 0.5],
  wallLeft: [0.05, 0.13, 0.2, 0.28],
  wallRightOfMouth: [0.42, 0.15, 0.5, 0.3],
  wallFarRight: [0.72, 0.17, 0.9, 0.22],
  buttress: [0.64, 0.24, 0.8, 0.36],
  fumeTop: [0.6, 0.02, 0.75, 0.12],
  glowRight: [0.86, 0.25, 0.99, 0.36],
};

const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (files.length === 0) {
  files.push('references/approved/2-heart/heart-0-establishing.jpg');
  for (const f of ['out/work/stills/key-heart-0-hd-draft.png', 'out/work/stills/key-heart-0-uhd-final.png']) if (existsSync(f)) files.push(f);
}

for (const file of files) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  console.log(file);
  for (const [name, [x0, y0, x1, y1]] of Object.entries(REGIONS)) {
    const sum = [0, 0, 0];
    let count = 0;
    for (let y = Math.floor(y0 * height); y < y1 * height; y++) {
      for (let x = Math.floor(x0 * width); x < x1 * width; x++) {
        const i = (y * width + x) * 3;
        sum[0] += data[i];
        sum[1] += data[i + 1];
        sum[2] += data[i + 2];
        count++;
      }
    }
    console.log(`  ${name.padEnd(17)}${sum.map((v) => (v / count).toFixed(0).padStart(4)).join('')}`);
  }
}
