export function gaussian(src, w, h, sigma) {
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) {
    k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
    sum += k[i + r];
  }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) a += src[row + Math.min(w - 1, Math.max(0, x + i))] * k[i + r];
      tmp[row + x] = a;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) a += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x] * k[i + r];
      out[y * w + x] = a;
    }
  }
  return out;
}

export function dilate(mask, w, h, r) {
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let last = -Infinity;
    for (let x = 0; x < w; x++) {
      if (mask[row + x]) last = x;
      if (x - last <= r) tmp[row + x] = 1;
    }
    last = Infinity;
    for (let x = w - 1; x >= 0; x--) {
      if (mask[row + x]) last = x;
      if (last - x <= r) tmp[row + x] = 1;
    }
  }
  for (let x = 0; x < w; x++) {
    let last = -Infinity;
    for (let y = 0; y < h; y++) {
      if (tmp[y * w + x]) last = y;
      if (y - last <= r) out[y * w + x] = 1;
    }
    last = Infinity;
    for (let y = h - 1; y >= 0; y--) {
      if (tmp[y * w + x]) last = y;
      if (last - y <= r) out[y * w + x] = 1;
    }
  }
  return out;
}

export function label(mask, w, h) {
  const labels = new Int32Array(w * h);
  const sizes = [0];
  const stack = new Int32Array(w * h);
  let n = 0;
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || labels[start]) continue;
    n++;
    let top = 0;
    let size = 0;
    stack[top++] = start;
    labels[start] = n;
    while (top > 0) {
      const p = stack[--top];
      size++;
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0 && mask[p - 1] && !labels[p - 1]) {
        labels[p - 1] = n;
        stack[top++] = p - 1;
      }
      if (x < w - 1 && mask[p + 1] && !labels[p + 1]) {
        labels[p + 1] = n;
        stack[top++] = p + 1;
      }
      if (y > 0 && mask[p - w] && !labels[p - w]) {
        labels[p - w] = n;
        stack[top++] = p - w;
      }
      if (y < h - 1 && mask[p + w] && !labels[p + w]) {
        labels[p + w] = n;
        stack[top++] = p + w;
      }
    }
    sizes.push(size);
  }
  return { labels, sizes, count: n };
}

export function loopsOf(field, w, h) {
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : field[y * w + x]);
  const span = w + 2;
  const hKey = (x, y) => ((y + 1) * span + (x + 1)) * 2;
  const vKey = (x, y) => ((y + 1) * span + (x + 1)) * 2 + 1;
  const points = new Map();
  const links = new Map();
  const point = (key, ax, ay, bx, by) => {
    if (points.has(key)) return;
    const va = at(ax, ay);
    const vb = at(bx, by);
    const t = va / (va - vb);
    points.set(key, [ax + (bx - ax) * t, ay + (by - ay) * t]);
  };
  const join = (a, b) => {
    if (!links.has(a)) links.set(a, []);
    if (!links.has(b)) links.set(b, []);
    links.get(a).push(b);
    links.get(b).push(a);
  };
  for (let y = -1; y < h; y++) {
    for (let x = -1; x < w; x++) {
      const a0 = at(x, y);
      const a1 = at(x + 1, y);
      const a2 = at(x + 1, y + 1);
      const a3 = at(x, y + 1);
      const v0 = a0 > 0;
      const v1 = a1 > 0;
      const v2 = a2 > 0;
      const v3 = a3 > 0;
      const n = v0 + v1 + v2 + v3;
      if (n === 0 || n === 4) continue;
      const T = v0 !== v1 ? hKey(x, y) : -1;
      const R = v1 !== v2 ? vKey(x + 1, y) : -1;
      const B = v3 !== v2 ? hKey(x, y + 1) : -1;
      const L = v0 !== v3 ? vKey(x, y) : -1;
      if (T >= 0) point(T, x, y, x + 1, y);
      if (R >= 0) point(R, x + 1, y, x + 1, y + 1);
      if (B >= 0) point(B, x, y + 1, x + 1, y + 1);
      if (L >= 0) point(L, x, y, x, y + 1);
      const edges = [T, R, B, L].filter((e) => e >= 0);
      if (edges.length === 2) join(edges[0], edges[1]);
      else if ((a0 + a1 + a2 + a3) / 4 > 0 === v0) {
        join(T, R);
        join(B, L);
      } else {
        join(T, L);
        join(R, B);
      }
    }
  }
  const seen = new Set();
  const loops = [];
  for (const start of links.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let prev = -1;
    let cur = start;
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur);
      loop.push(points.get(cur));
      const [a, b] = links.get(cur);
      const next = a !== prev ? a : b;
      prev = cur;
      cur = next;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

export function areaOf(loop) {
  let a = 0;
  for (let i = 0; i < loop.length; i++) {
    const p = loop[i];
    const q = loop[(i + 1) % loop.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

export function contains(loop, point) {
  let inside = false;
  const [px, py] = point;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const [xi, yi] = loop[i];
    const [xj, yj] = loop[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function away(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.min(1, Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

function thin(points, tolerance) {
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let far = -1;
    let most = tolerance;
    for (let i = a + 1; i < b; i++) {
      const d = away(points[i], points[a], points[b]);
      if (d > most) {
        most = d;
        far = i;
      }
    }
    if (far >= 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

export function simplify(loop, tolerance) {
  if (loop.length < 5) return loop;
  let far = 1;
  let most = -1;
  for (let i = 1; i < loop.length; i++) {
    const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]);
    if (d > most) {
      most = d;
      far = i;
    }
  }
  const a = thin(loop.slice(0, far + 1), tolerance);
  const b = thin([...loop.slice(far), loop[0]], tolerance);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

function box(loop) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of loop) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

export function nest(loops, { minOuter = 0, minHole = 0 } = {}) {
  const items = loops.map((loop) => ({ loop, area: Math.abs(areaOf(loop)), box: box(loop), depth: 0, parent: -1 }));
  items.forEach((item, i) => {
    const p = item.loop[0];
    let parent = -1;
    items.forEach((other, j) => {
      if (j === i || other.area <= item.area) return;
      const b = other.box;
      if (p[0] < b.x0 || p[0] > b.x1 || p[1] < b.y0 || p[1] > b.y1) return;
      if (!contains(other.loop, p)) return;
      item.depth++;
      if (parent < 0 || other.area < items[parent].area) parent = j;
    });
    item.parent = parent;
  });
  const shapes = new Map();
  items.forEach((item, i) => {
    if (item.depth % 2 === 0 && item.area >= minOuter) shapes.set(i, { outer: item.loop, holes: [], area: item.area });
  });
  items.forEach((item) => {
    if (item.depth % 2 === 1 && item.area >= minHole && shapes.has(item.parent)) shapes.get(item.parent).holes.push(item.loop);
  });
  return [...shapes.values()].sort((a, b) => b.area - a.area);
}

export function fitCircle(points) {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of points) {
    sx += x;
    sy += y;
  }
  const mx = sx / points.length;
  const my = sy / points.length;
  let suu = 0;
  let svv = 0;
  let suv = 0;
  let suuu = 0;
  let svvv = 0;
  let suvv = 0;
  let svuu = 0;
  for (const [x, y] of points) {
    const u = x - mx;
    const v = y - my;
    suu += u * u;
    svv += v * v;
    suv += u * v;
    suuu += u * u * u;
    svvv += v * v * v;
    suvv += u * v * v;
    svuu += v * u * u;
  }
  const det = suu * svv - suv * suv;
  if (Math.abs(det) < 1e-9) return null;
  const a = (suuu + suvv) / 2;
  const b = (svvv + svuu) / 2;
  const uc = (a * svv - b * suv) / det;
  const vc = (b * suu - a * suv) / det;
  return { cx: uc + mx, cy: vc + my, r: Math.sqrt(uc * uc + vc * vc + (suu + svv) / points.length) };
}
