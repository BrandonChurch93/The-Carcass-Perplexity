// The sky panorama the film loads, from the master and its six enlarged windows.   node assets-src/spine/sky/join.cjs
// The master fixes where everything lies and every tone broader than about a degree; a window gives only what is finer than that (its own picture
// less its own blur), so a window that drifted a few dots from the master leaves no seam. Also writes the flow the sky is carried along:
// away from the middle of each pale head and into the creases between heads (so heads swell and creases close), with slow broad eddies, and in
// its blue a slow field that sets each place's own moment of the cross-fade.
const sharp = require('sharp');
const G = require('./geometry.cjs');
const SIGMA = 11;

function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(src.length), dst = new Float32Array(src.length);
  const pass = (a, b, n, m, stride, cross) => {
    for (let j = 0; j < m; j++) {
      let acc = 0;
      const base = j * cross;
      for (let i = -r; i <= r; i++) acc += a[base + Math.min(n - 1, Math.max(0, i)) * stride];
      for (let i = 0; i < n; i++) {
        b[base + i * stride] = acc / (2 * r + 1);
        acc += a[base + Math.min(n - 1, i + r + 1) * stride] - a[base + Math.max(0, i - r) * stride];
      }
    }
  };
  pass(src, tmp, w, h, 1, w);
  pass(tmp, dst, h, w, w, 1);
  return dst;
}
// Three boxes are near enough a Gaussian of this sigma.
function blur(src, w, h, sigma) {
  const r = Math.max(1, Math.round(Math.sqrt((12 * sigma * sigma) / 3 + 1) / 2 - 0.5));
  return boxBlur(boxBlur(boxBlur(src, w, h, r), w, h, r), w, h, r);
}
async function planes(img, w, h) {
  const raw = await img.removeAlpha().toColourspace('srgb').raw().toBuffer();
  const out = [new Float32Array(w * h), new Float32Array(w * h), new Float32Array(w * h)];
  for (let i = 0; i < w * h; i++) for (let c = 0; c < 3; c++) out[c][i] = raw[i * 3 + c];
  return out;
}
// A smooth field of chance: value noise on a coarse lattice, the same every run.
function chance(x, y, seed) {
  const h = (i, j) => {
    let n = (i * 374761393 + j * 668265263 + seed * 1442695041) | 0;
    n = (n ^ (n >>> 13)) * 1274126177;
    return (((n ^ (n >>> 16)) >>> 0) / 4294967295);
  };
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
}

(async () => {
  const W = G.OUT_W, H = G.OUT_H;
  const top = Math.round(G.MASTER_H - G.HORIZON_UP - G.EL1 * G.MASTER_PPD);
  const bottom = Math.round(G.MASTER_H - G.HORIZON_UP - G.EL0 * G.MASTER_PPD);
  const master = await planes(sharp('assets-src/spine/sky/pano-master.png').extract({ left: 0, top, width: G.MASTER_W, height: bottom - top }).resize(W, H, { kernel: 'cubic', fit: 'fill' }), W, H);
  const low = master.map((p) => blur(p, W, H, SIGMA));
  const fine = [new Float32Array(W * H), new Float32Array(W * H), new Float32Array(W * H)];
  const weight = new Float32Array(W * H);
  const ww = Math.round(G.WIN_AZ * G.OUT_PPD), wh = Math.round(G.WIN_EL * G.OUT_PPD);
  const FEATHER = 150;
  for (const win of G.windows) {
    const file = `assets-src/spine/sky/win-${win.name}.jpg`;
    const p = await planes(sharp(file).resize(ww, wh, { kernel: 'lanczos3', fit: 'fill' }), ww, wh);
    const b = p.map((q) => blur(q, ww, wh, SIGMA));
    const x0 = Math.round((win.az - G.AZ0) * G.OUT_PPD), y0 = Math.round((G.EL1 - (win.el + G.WIN_EL)) * G.OUT_PPD);
    for (let y = 0; y < wh; y++) {
      const Y = y + y0;
      if (Y < 0 || Y >= H) continue;
      for (let x = 0; x < ww; x++) {
        const X = x + x0;
        if (X < 0 || X >= W) continue;
        // Feathered toward every edge of the window that has a neighbour or open picture beyond it.
        const ex = Math.min(x0 > 0 ? x : 1e9, x0 + ww < W ? ww - 1 - x : 1e9);
        const ey = Math.min(y, Y >= H - 1 ? 1e9 : y0 + wh < H ? wh - 1 - y : 1e9);
        const k = Math.min(1, Math.min(ex, ey) / FEATHER);
        const wgt = k * k * (3 - 2 * k) + 1e-4;
        const i = y * ww + x, o = Y * W + X;
        for (let c = 0; c < 3; c++) fine[c][o] += wgt * (p[c][i] - b[c][i]);
        weight[o] += wgt;
      }
    }
    console.log('window', win.name, 'at', x0, y0);
  }
  const out = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const cover = Math.min(1, weight[i]);
    for (let c = 0; c < 3; c++) {
      const own = master[c][i] - low[c][i];
      const v = low[c][i] + (weight[i] > 0 ? (fine[c][i] / Math.max(weight[i], 1)) : 0) + (1 - cover) * own;
      out[i * 3 + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 86, chromaSubsampling: '4:2:0', mozjpeg: true }).toFile('public/assets/spine/mat/skypano.jpg');

  // The flow, 512 wide. Height stands for how far a body of cloud stands toward the lens: its light, broadly.
  const FW = 512, FH = Math.round((H * FW) / W);
  const small = await sharp(out, { raw: { width: W, height: H, channels: 3 } }).resize(FW, FH, { kernel: 'cubic' }).greyscale().raw().toBuffer();
  let lum = new Float32Array(FW * FH);
  for (let i = 0; i < FW * FH; i++) lum[i] = small[i] / 255;
  const head = blur(lum, FW, FH, 5);
  const broad = blur(lum, FW, FH, 16);
  const flow = Buffer.alloc(FW * FH * 3);
  let peak = 0;
  const vx = new Float32Array(FW * FH), vy = new Float32Array(FW * FH);
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const i = y * FW + x;
      const at = (f, dx, dy) => f[Math.min(FH - 1, Math.max(0, y + dy)) * FW + Math.min(FW - 1, Math.max(0, x + dx))];
      // Out of each head (down the slope of its light), and round the broad masses (along their contours): they swell and they turn.
      const gx = (at(head, 1, 0) - at(head, -1, 0)) * 0.5, gy = (at(head, 0, 1) - at(head, 0, -1)) * 0.5;
      const bx = (at(broad, 1, 0) - at(broad, -1, 0)) * 0.5, by = (at(broad, 0, 1) - at(broad, 0, -1)) * 0.5;
      // Slow eddies broader than any head, from the curl of a field of chance (so they neither pile cloud up nor tear it open).
      const e = 0.5;
      const psi = (px, py) => chance(px / 70, py / 70, 7) + 0.5 * chance(px / 31, py / 31, 19);
      const cx = (psi(x, y + e) - psi(x, y - e)) / (2 * e), cy = -(psi(x + e, y) - psi(x - e, y)) / (2 * e);
      // No flow where there is no cloud to carry: the clear dusk (blue over red) holds still, and so does the foot under the horizon.
      const px = small[i] / 255;
      const el = G.EL1 - (y / FH) * (G.EL1 - G.EL0);
      const still = Math.min(1, Math.max(0, (el - 0.3) / 2.5));
      vx[i] = (-gx * 60 + by * 110 + cx * 9) * still;
      vy[i] = (-gy * 60 - bx * 110 + cy * 9) * still;
      void px;
      peak = Math.max(peak, Math.hypot(vx[i], vy[i]));
    }
  }
  // Scaled so that the 99.5th hundredth of speed is 1, and no place is faster.
  const speeds = Array.from(vx, (v, i) => Math.hypot(v, vy[i])).sort((a, b) => a - b);
  const top995 = speeds[Math.floor(speeds.length * 0.995)];
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const i = y * FW + x;
      let sx = vx[i] / top995, sy = vy[i] / top995;
      const s = Math.hypot(sx, sy);
      if (s > 1) { sx /= s; sy /= s; }
      flow[i * 3] = Math.round(127.5 + 127.5 * sx);
      // The file's rows run down and the picture's v runs up.
      flow[i * 3 + 1] = Math.round(127.5 - 127.5 * sy);
      flow[i * 3 + 2] = Math.round(255 * Math.min(1, Math.max(0, 0.6 * chance(x / 90, y / 90, 3) + 0.4 * chance(x / 37, y / 37, 5))));
    }
  }
  await sharp(flow, { raw: { width: FW, height: FH, channels: 3 } }).png({ compressionLevel: 9 }).toFile('public/assets/spine/mat/skyflow.png');
  console.log('skypano.jpg', W, H, 'skyflow.png', FW, FH, 'peak', peak.toFixed(4), 'p99.5', top995.toFixed(4));
})();
