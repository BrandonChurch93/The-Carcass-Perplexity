// Packs the part of the first approved picture of the rise that lies under the lens about the cut into the plate the lid projects on the
// ground there: 768 by 442, three bytes a texel, written as base64 into src/places/reveal/join/plate.data.ts.
// Run from the root: node assets-src/reveal/join/pack-plate.mjs
// The plate covers, in the lid's measure (one unit across is half the height of the view at the cut, 41.5 km), 2 units to either side
// of the line of the climb and 1.15 units up and down. The picture is 251.3 km wide and centred on the lake; the line of the climb
// stands startOffsetKm of rise.json (-16, -6) from the lake.
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const pullback = JSON.parse(readFileSync('references/approved/7-reveal/pullback.json', 'utf8'));
const rise = JSON.parse(readFileSync('src/places/reveal/rise.json', 'utf8'));
const handoff = JSON.parse(readFileSync('src/places/reveal/handoff.json', 'utf8'));
const file = 'references/approved/7-reveal/' + pullback.frames['1'].file;
const meta = await sharp(file).metadata();
const km = pullback.scale_STATED.km_per_master_px;
const wide = pullback.frames['1'].window_in_master_px.w * km;
const tall = pullback.frames['1'].window_in_master_px.h * km;
const unit = handoff.revealHalfHeightKm;
const HALF = [2, 1.15];
const W = 768;
const H = 442;
// The lake, in units from the line of the climb.
const lake = [-rise.startOffsetKm[0] / unit, -rise.startOffsetKm[1] / unit];
const px = (x) => (((x - lake[0]) * unit + wide / 2) / wide) * meta.width;
const py = (y) => (((y - lake[1]) * unit + tall / 2) / tall) * meta.height;
const left = Math.round(px(-HALF[0]));
const top = Math.round(py(-HALF[1]));
const width = Math.round(px(HALF[0])) - left;
const height = Math.round(py(HALF[1])) - top;
const { data } = await sharp(file).extract({ left, top, width, height }).resize(W, H, { kernel: 'lanczos3', fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const text =
  `// Written by assets-src/reveal/join/pack-plate.mjs. Three bytes a texel: the first approved picture of the rise where it lies under the lens about the cut.\n` +
  `export const PLATE_WIDE = ${W};\nexport const PLATE_TALL = ${H};\n` +
  `/** How far the plate reaches to either side of the line of the climb, and up and down, in units across. */\nexport const PLATE_HALF = [${HALF[0]}, ${HALF[1]}];\n` +
  `/** Where the middle of the lake lies, in units across from the line of the climb. */\nexport const PLATE_LAKE = [${lake[0].toFixed(4)}, ${lake[1].toFixed(4)}];\n` +
  `export const PLATE_BYTES = '${Buffer.from(data).toString('base64')}';\n`;
writeFileSync('src/places/reveal/join/plate.data.ts', text);
console.log('plate', left, top, width, height, 'to', W, H, (text.length / 1e6).toFixed(2), 'MB');
