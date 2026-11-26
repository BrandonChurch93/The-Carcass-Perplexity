// A blade of the layout as one dense sheet with its relief, and the coordinates its rock is laid by.
// The rock is never laid by the sheet's own u and v (they stretch wherever the sheet turns): each vertex carries its place in the space of
// the blade, in metres (along the spine, across it in the blade's plane, through it), and its normal in that space, and the shader lays the
// stone on three axes of that space. The grooves of the stone picture so run the length of the blade, as the approved picture has them.
import * as THREE from 'three';
import { partAtHeight, radii, surface, type Rib } from '../layout';
import { fbm3, noise2, noise3, smooth } from './noise';
import { sheet } from './shapes';

export interface BladeOptions {
  around: number;
  /** Metres between rings low on the blade. */
  fine: number;
  /** Metres between rings high on the blade. */
  coarse?: number;
}

/** How far the rock stands out from the smooth blade, metres. q runs round the section in metres, s along the spine in metres; x, y, z are the world. */
export function bladeRelief(q: number, s: number, x: number, y: number, z: number): number {
  // Masses the size of a hall and of a house.
  let d = 16 * (noise3(x / 80, y / 95, z / 80) - 0.5) + 5 * (noise3(x / 29, y / 33, z / 29) - 0.5);
  // Flutes that run the length of the blade: wide ones a house across, narrow ones a stride or two, both wandering a little.
  const wander = 5 * (noise2(s / 60, q / 40) - 0.5);
  const wide = Math.abs(noise2((q + wander) / 9.5, s / 140) - 0.5);
  const narrow = Math.abs(noise2((q + 0.6 * wander) / 21 + 7.7, s / 190) - 0.5);
  d += 6.5 * (wide - 0.25) + 7 * (narrow - 0.25);
  // Bites out of the blade the size of a house, where a block has gone.
  d -= 10 * smooth(0.6, 0.8, noise3(x / 36 + 5.1, y / 30, z / 36));
  // Broken at the size of a boat and of a man.
  d += 1.0 * (noise3(x / 11, y / 8, z / 11) - 0.5);
  // Joints: cracks across the blade where it will break next.
  d -= 1.4 * (1 - smooth(0, 0.05, Math.abs(noise2(s / 23 + 0.02 * q, q / 90 + 4.1) - 0.5)));
  return d;
}

/** A blade of the layout with its relief. */
export function bladeShape(rib: Rib, options: BladeOptions): THREE.BufferGeometry {
  const tTop = rib.cut === undefined ? 1 : partAtHeight(rib, rib.cut);
  const ts: number[] = [];
  const along: number[] = [];
  let t = 0;
  let run = 0;
  const here = new THREE.Vector3();
  const coarse = options.coarse ?? 3;
  while (t < tTop) {
    ts.push(t);
    along.push(run);
    here.copy(surface(rib, t, 0, 0, 0));
    const ahead = surface(rib, Math.min(1, t + 0.002), 0, 0, 0);
    const speed = Math.max(1, ahead.distanceTo(here) / 0.002);
    const want = options.fine + (coarse - options.fine) * smooth(60, 220, here.y);
    t += want / speed;
    run += want;
  }
  ts.push(tTop);
  along.push(run);
  const cap = [0.82, 0.55, 0.25, 0.0];
  const body = ts.length;
  const rows = body + cap.length + 1;
  const cols = options.around + 1;
  // The frame of each ring: its centre, the way the spine runs there (T), across the blade in its plane (N); B is the same for the whole blade.
  const centres: THREE.Vector3[] = [];
  const Ts: THREE.Vector3[] = [];
  const Ns: THREE.Vector3[] = [];
  const B = surface(rib, 0, Math.PI / 2, 0, 1).sub(surface(rib, 0, 0, 0, 0)).normalize();
  for (let r = 0; r < body; r++) {
    const tr = ts[r] as number;
    const c = surface(rib, tr, 0, 0, 0);
    const n = surface(rib, tr, 0, 1, 0).sub(c).normalize();
    centres.push(c);
    Ns.push(n);
    Ts.push(new THREE.Vector3().crossVectors(B, n).normalize());
  }
  if ((Ts[0] as THREE.Vector3).y < 0) for (const v of Ts) v.negate();
  const base = new THREE.Vector3();
  const out = new THREE.Vector3();
  const rowOf = (j: number): number => (j === 0 ? 0 : Math.min(j - 1, body - 1));
  const g = sheet(rows, cols, true, 'out', (j, i, p) => {
    const phi = ((i % options.around) / options.around) * Math.PI * 2;
    if (j === 0) {
      const [a, b] = radii(rib, 0);
      p.copy(surface(rib, 0, phi, a + 2, b + 2));
      p.y -= 16;
      return [0, 0];
    }
    const r = rowOf(j);
    const tr = ts[r] as number;
    const [a0r, b0r] = radii(rib, tr);
    // Notched along its length: where a block has gone the blade is thinner, by a quarter and more.
    const notch = 1 + smooth(0.06, 0.2, tr) * (0.3 * (noise2(tr * 8 + rib.x * 0.013, 1.5) - 0.5) + 0.2 * (noise2(tr * 23 + rib.z * 0.01, 4.5) - 0.5));
    const a = a0r * notch;
    const b = b0r * (1 + 0.3 * (notch - 1));
    const shrink = j - 1 < body ? 1 : (cap[j - 1 - body] as number);
    base.copy(surface(rib, tr, phi, a * shrink, b * shrink));
    out.copy(surface(rib, tr, phi, a * shrink + 1, b * shrink + 1)).sub(base);
    if (shrink < 1) {
      // The tip, or the broken top of a stump: closed over, a little proud of the last ring.
      const lift = (1 - shrink) * Math.min(a, b) * (rib.cut === undefined ? 0.7 : 0.25);
      base.addScaledVector(Ts[r] as THREE.Vector3, lift);
    }
    const slim = Math.min(1, Math.min(a, b) / 24);
    const low = 0.35 + 0.65 * smooth(22, 60, base.y);
    // Metres round the section, from the middle of the broad face.
    const q = phi * Math.sqrt((a * a + b * b) / 2);
    const d = bladeRelief(q + rib.x * 0.37, (along[r] as number) + rib.z * 0.11, base.x, base.y, base.z) * slim * low * (shrink < 1 ? 0.5 + 0.5 * shrink : 1);
    p.copy(base).addScaledVector(out, d);
    // Where the fin's sheet lies on it: the part across the broad face, the part along the spine.
    return [0.5 + 0.5 * Math.cos(phi), (along[r] as number) / run, 0.55 + 0.45 * smooth(-10 * slim, -1 * slim, d)];
  });
  const position = g.getAttribute('position') as THREE.BufferAttribute;
  const normal = g.getAttribute('normal') as THREE.BufferAttribute;
  const blade = new Float32Array(position.count * 4);
  const nb = new Float32Array(position.count * 3);
  const rel = new THREE.Vector3();
  const n = new THREE.Vector3();
  const cs = Math.cos(rib.yaw);
  const sn = Math.sin(rib.yaw);
  for (let j = 0; j < rows; j++) {
    const r = rowOf(j);
    const c = centres[r] as THREE.Vector3;
    const T = Ts[r] as THREE.Vector3;
    const N = Ns[r] as THREE.Vector3;
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      rel.fromBufferAttribute(position, k).sub(c);
      n.fromBufferAttribute(normal, k);
      blade[k * 4] = (along[r] as number) + rel.dot(T) + rib.z * 0.37;
      blade[k * 4 + 1] = rel.dot(N) + rib.x * 0.53;
      blade[k * 4 + 2] = rel.dot(B);
      blade[k * 4 + 3] = (position.getX(k) - rib.x) * cs + (position.getZ(k) - rib.z) * sn;
      nb[k * 3] = n.dot(T);
      nb[k * 3 + 1] = n.dot(N);
      nb[k * 3 + 2] = n.dot(B);
    }
  }
  g.setAttribute('aBlade', new THREE.BufferAttribute(blade, 4));
  g.setAttribute('aNb', new THREE.BufferAttribute(nb, 3));
  return g;
}

/** A shape that is no blade (a stack, the arch, the colony's rock) takes the world for its blade space: the grooves of the stone run up it. */
export function worldSpace(g: THREE.BufferGeometry, turn = 0): THREE.BufferGeometry {
  const position = g.getAttribute('position') as THREE.BufferAttribute;
  const normal = g.getAttribute('normal') as THREE.BufferAttribute;
  const blade = new Float32Array(position.count * 4);
  const nb = new Float32Array(position.count * 3);
  const cs = Math.cos(turn);
  const sn = Math.sin(turn);
  for (let k = 0; k < position.count; k++) {
    const x = position.getX(k) * cs + position.getZ(k) * sn;
    const z = -position.getX(k) * sn + position.getZ(k) * cs;
    blade[k * 4] = position.getY(k);
    blade[k * 4 + 1] = x;
    blade[k * 4 + 2] = z;
    blade[k * 4 + 3] = x;
    nb[k * 3] = normal.getY(k);
    nb[k * 3 + 1] = normal.getX(k) * cs + normal.getZ(k) * sn;
    nb[k * 3 + 2] = -normal.getX(k) * sn + normal.getZ(k) * cs;
  }
  g.setAttribute('aBlade', new THREE.BufferAttribute(blade, 4));
  g.setAttribute('aNb', new THREE.BufferAttribute(nb, 3));
  return g;
}
