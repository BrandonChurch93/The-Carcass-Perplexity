// Where the fine detail of a frame falls short of its approved picture.
// The same sum as measure M3 (tools/lib/measure-core.mjs): four neighbour Laplacian on Rec. 709
// luminance, both pictures through lanczos3 to the approved picture's centre crop. Prints the whole
// ratio and a grid of ratios (frame / approved) with each cell's share of the approved energy.
// node assets-src/heart/tools/m3map.cjs APPROVED.jpg FRAME.png [cols rows]
const sharp = require('sharp');
const [a, f, c = '8', r = '5'] = process.argv.slice(2);
const cols = +c, rows = +r;
async function lum(file, size, rect) {
  let img = sharp(file);
  if (rect) img = img.extract(rect);
  const { data, info } = await img.removeAlpha().toColourspace('srgb').resize(size.width, size.height, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  const out = new Float32Array(info.width * info.height);
  for (let i = 0; i < out.length; i++) out[i] = 0.2126 * data[i * info.channels] + 0.7152 * data[i * info.channels + 1] + 0.0722 * data[i * info.channels + 2];
  return out;
}
function grid(l, w, h) {
  const sum = new Float64Array(cols * rows), n = new Float64Array(cols * rows);
  let all = 0, cnt = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const v = l[i - 1] + l[i + 1] + l[i - w] + l[i + w] - 4 * l[i];
    const k = Math.min(rows - 1, Math.floor((y * rows) / h)) * cols + Math.min(cols - 1, Math.floor((x * cols) / w));
    sum[k] += v * v; n[k]++; all += v * v; cnt++;
  }
  return { sum, n, mean: all / cnt, total: all };
}
(async () => {
  const fm = await sharp(f).metadata(), am = await sharp(a).metadata();
  const asp = fm.width / fm.height;
  let rect;
  if (am.width / am.height > asp) { const w = Math.min(am.width, Math.round(am.height * asp)); rect = { left: Math.floor((am.width - w) / 2), top: 0, width: w, height: am.height }; }
  else { const h = Math.min(am.height, Math.round(am.width / asp)); rect = { left: 0, top: Math.floor((am.height - h) / 2), width: am.width, height: h }; }
  const size = { width: rect.width, height: rect.height };
  const F = grid(await lum(f, size), size.width, size.height);
  const A = grid(await lum(a, size, rect), size.width, size.height);
  console.log(`ratio ${(F.mean / A.mean).toFixed(3)}  frame ${F.mean.toFixed(1)}  approved ${A.mean.toFixed(1)}  (floor 0.75; frame is ${fm.width} wide)`);
  console.log('each cell: ratio frame/approved, then the cell share of the approved energy in per cent; rows top to bottom');
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) { const k = y * cols + x; line += `${(F.sum[k] / Math.max(A.sum[k], 1e-9)).toFixed(2).padStart(5)} ${String(Math.round((100 * A.sum[k]) / A.total)).padStart(2)}% |`; }
    console.log(line);
  }
})();
