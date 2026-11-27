// A blade of the layout as one dense sheet with its relief, and the coordinates its rock is laid by.
// The rock is never laid by the sheet's own u and v (they stretch wherever the sheet turns): each vertex carries its place in the space of
// the blade, in metres (along the spine, across it in the blade's plane, through it), and its normal in that space, and the shader lays the
// stone on three axes of that space. The grooves of the stone picture so run the length of the blade, as the approved picture has them.
import * as THREE from 'three';
import { TIDE, partAtHeight, radii, surface, type Rib } from '../layout';
import { cells3, noise2, noise3, smooth } from './noise';
import { sheet } from './shapes';

export interface BladeOptions {
  around: number;
  /** Metres between rings low on the blade. */
  fine: number;
  /** Metres between rings high on the blade. */
  coarse?: number;
  /** A plain blade has its masses and no broken rock: the image in the wet floor. */
  plain?: boolean;
}

/** What the broken rock is at a place: metres out of the smooth blade, how near a crack (0 to 1), the plate's own tone (-1 to 1), and how deep it lies under its neighbours (0 open, 1 deep). */
export interface Crag {
  d: number;
  crack: number;
  tone: number;
  deep: number;
}

const CELL = { id: 0, edge: 0 };

/**
 * The rock of a blade is one clean sweep, as a tusk's is: what breaks it is small. Long flutes run with the spine; thin plates a hall long
 * and a room wide stand a hand or two proud of their neighbours, each with a crack round it; here and there a plate has spalled away
 * and left a shallow scar with a crisp rim; beds cross the blade and end in a low ledge. The thin edges are the blade's outline against
 * the sky: they keep their line and are only nicked, a stride or two, where a bed steps or a block has gone.
 * s runs along the spine, u across the blade in its plane, w through it (metres); x, y, z are the world; edge is 0 on a broad face, 1 on a thin edge.
 */
export function bladeCrag(s: number, u: number, w: number, x: number, y: number, z: number, edge: number, out: Crag): void {
  const face = 1 - edge;
  // The face swells and sinks a little over the size of a hall: it is no machined plane.
  let d = face * (2.0 * (noise3(x / 80, y / 95, z / 80) - 0.5) + 0.8 * (noise3(x / 29, y / 33, z / 29) - 0.5));
  // The plates are bent: their walls wander.
  const bx = 26 * (noise3(s / 60, u / 31, w / 31) - 0.5) + 7 * (noise3(s / 19 + 4.4, u / 11, w / 11) - 0.5);
  const bu = 9 * (noise3(s / 43 + 9.1, u / 17, w / 17) - 0.5) + 2.4 * (noise3(s / 13, u / 6 + 2.2, w / 6) - 0.5);
  // Broken ground lies in fields; between them the face is quiet.
  const rough = smooth(0.4, 0.62, noise3(s / 150 + 2.2, u / 80, w / 80));
  // Flutes with the spine, a few strides across, long as the blade: their crests are sharp, their beds round.
  const fl = noise3(s / 170 + 1.7, (u + 0.4 * bu) / 6.5, w / 6.5);
  const flute = 1 - Math.abs(2 * fl - 1);
  d += face * 0.55 * (flute * flute - 0.35);
  cells3((s + bx) / 54, (u + bu) / 15, w / 15, CELL);
  const toneA = CELL.id * 2 - 1;
  const wallA = (0.3 + 0.7 * rough) * (1 - smooth(0.0, 1.5, CELL.edge * 15));
  // One plate in five has spalled, and left a scar the depth of a stride.
  const gone = CELL.id > 0.8 ? 0.35 + 0.65 * rough : 0;
  d += face * ((0.32 + 0.3 * rough) * toneA - 0.85 * gone) - 0.3 * wallA;
  cells3((s + bx) / 15 + 7.7, (u + bu) / 5.2 + 3.3, w / 5.2, CELL);
  const toneB = CELL.id * 2 - 1;
  const wallB = 1 - smooth(0.0, 0.9, CELL.edge * 5.2);
  const small = 0.12 + 0.88 * rough;
  d += small * (0.26 * toneB * face - 0.2 * wallB);
  // Beds across the blade, of unlike thickness: each stands a little over the one under it and ends in a low ledge, and a ledge dies out.
  const bed = (s + 13 * (noise3(s / 95, u / 36, w / 36) - 0.5) + 0.22 * u) / 9.5;
  const c = bed + 0.34 * Math.sin(bed * 2.1) + 0.14 * Math.sin(bed * 5.3 + 1);
  const k = Math.floor(c);
  const f = c - k;
  const strong = smooth(0.46, 0.72, noise3(k * 1.7 + 0.5, u / 28, w / 28 + s / 140));
  d += strong * face * (0.45 * (f - 0.45) - 0.4 * (1 - smooth(0, 0.07, f)));
  // Broken at the size of a boat.
  d += (0.35 + 0.65 * rough) * 0.3 * (noise3(x / 7, y / 5, z / 7) - 0.5);
  // The outline: every tower's height or so a course steps in or out by a stride, and where a block has gone the edge is nicked.
  const course = (s + 24 * (noise3(s / 160, u / 60, w / 60) - 0.5) + 0.3 * u) / 37;
  const ck = Math.floor(course);
  const cf = course - ck;
  const stepped = noise2(ck * 3.7 + 0.5, 11.5) - 0.5;
  const bite = smooth(0.6, 0.7, noise3(s / 46 + 3.1, u / 70, w / 25 + 5.5)) + 0.5 * smooth(0.58, 0.7, noise3(s / 13 + 1.3, u / 30, w / 12));
  d += edge * (1.5 * stepped - 0.5 * (1 - smooth(0, 0.05, cf)) - 2.2 * bite + 0.7 * (noise3(s / 6, u / 9, w / 9) - 0.5));
  out.d = d;
  out.crack = Math.max(wallA, 0.5 * small * wallB, 0.9 * strong * (1 - smooth(0, 0.1, f)));
  out.tone = 0.6 * toneA + 0.4 * toneB;
  out.deep = Math.min(1, Math.max(0, 0.6 * gone + 0.3 * Math.max(0, -toneA) + 0.2 * small * Math.max(0, -toneB) + 0.5 * wallA + 0.35 * small * wallB + 0.3 * edge * bite));
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
  const crag: Crag = { d: 0, crack: 0, tone: 0, deep: 0 };
  const keeled = rib.taper !== undefined && rib.cut === undefined && rib.name !== 'OL' && rib.name !== 'OR';
  const crags = new Float32Array(rows * cols * 3);
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
    // Notched along its length, a little: what breaks the blade is its rock, not its turning.
    const notch = 1 + smooth(0.06, 0.2, tr) * (0.03 * (noise2(tr * 8 + rib.x * 0.013, 1.5) - 0.5) + 0.015 * (noise2(tr * 23 + rib.z * 0.01, 4.5) - 0.5));
    const a = a0r * notch;
    const b = b0r * (1 + 0.3 * (notch - 1));
    const shrink = j - 1 < body ? 1 : (cap[j - 1 - body] as number);
    // Above the weed a tusk is keeled: its section is a lens that comes to an edge on both sides, not an oval. The foot keeps its
    // oval, which the weed, the sea and the rocks stand round.
    const keel = keeled ? smooth(TIDE + 8, TIDE + 80, (centres[r] as THREE.Vector3).y) : 0;
    const lens = 1 + keel * (Math.abs(Math.sin(phi)) - 1);
    base.copy(surface(rib, tr, phi, a * shrink, b * shrink * lens));
    out.copy(surface(rib, tr, phi, a * shrink + 1, (b * shrink + 1) * lens)).sub(base).normalize();
    if (shrink < 1) {
      // The tip, or the broken top of a stump: closed over, a little proud of the last ring.
      const lift = (1 - shrink) * Math.min(a, b) * (rib.cut === undefined ? 0.7 : 0.25);
      base.addScaledVector(Ts[r] as THREE.Vector3, lift);
    }
    if (rib.cut !== undefined) {
      // A stump is broken, not sawn: its top slants and steps, a tower's height lower on one side than the other.
      const rim = rib.cut - 62 * (0.5 + 0.5 * Math.cos(phi - 1.1)) - 22 * noise2(phi * 2.2 + 3.3, 7.5) - 9 * noise2(phi * 7.1, 1.5);
      const T = Ts[r] as THREE.Vector3;
      if (base.y > rim) base.addScaledVector(T, -(base.y - rim) / Math.max(0.3, T.y));
    }
    const slim = Math.min(1, Math.min(a, b) / 24);
    // Under the weed line the rock keeps to its smooth form: the weed, and what hangs in it, lie on that.
    const low = smooth(26, 62, base.y);
    const cphi = Math.cos(phi);
    const s0 = (along[r] as number) + rib.z * 0.11;
    if (options.plain) {
      crag.d = 2 * (noise3(base.x / 80, base.y / 95, base.z / 80) - 0.5);
      crag.crack = 0;
      crag.tone = 0;
      crag.deep = 0;
    } else bladeCrag(s0, a * shrink * cphi + rib.x * 0.37, b * shrink * Math.sin(phi), base.x, base.y, base.z, cphi * cphi * cphi * cphi, crag);
    const d = crag.d * slim * (0.3 + 0.7 * low) * (shrink < 1 ? 0.5 + 0.5 * shrink : 1);
    const k3 = (j * cols + i) * 3;
    crags[k3] = crag.crack * low;
    crags[k3 + 1] = crag.tone;
    crags[k3 + 2] = crag.deep * low;
    p.copy(base).addScaledVector(out, d);
    // Where the fin's sheet lies on it: the part across the broad face, the part along the spine.
    return [0.5 + 0.5 * Math.cos(phi), (along[r] as number) / run, 1];
  });
  const position = g.getAttribute('position') as THREE.BufferAttribute;
  const normal = g.getAttribute('normal') as THREE.BufferAttribute;
  const blade = new Float32Array(position.count * 4);
  const nb = new Float32Array(position.count * 3);
  // The frame of the ring in the world: the fin sheet's slopes are turned into the world by it, with no screen derivative.
  const along3 = new Float32Array(position.count * 3);
  const across3 = new Float32Array(position.count * 3);
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
      T.toArray(along3, k * 3);
      N.toArray(across3, k * 3);
    }
  }
  g.setAttribute('aBlade', new THREE.BufferAttribute(blade, 4));
  g.setAttribute('aNb', new THREE.BufferAttribute(nb, 3));
  g.setAttribute('aAlong', new THREE.BufferAttribute(along3, 3));
  g.setAttribute('aAcross', new THREE.BufferAttribute(across3, 3));
  g.setAttribute('aCrag', new THREE.BufferAttribute(crags, 3));
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

/**
 * The space of a turned rock (the colony's mound): the stone is laid round it like a band, (way round at `reach` metres from its axis,
 * height) on its risers and (way round, way out) on its ledges, so that no picture is pulled down a face. The seam is at `seam` radians.
 */
export function roundSpace(g: THREE.BufferGeometry, cx: number, cz: number, reach: number, seam: number): THREE.BufferGeometry {
  const position = g.getAttribute('position') as THREE.BufferAttribute;
  const normal = g.getAttribute('normal') as THREE.BufferAttribute;
  const blade = new Float32Array(position.count * 4);
  const nb = new Float32Array(position.count * 3);
  for (let k = 0; k < position.count; k++) {
    const dx = position.getX(k) - cx;
    const dz = position.getZ(k) - cz;
    let angle = Math.atan2(dz, dx) - seam;
    angle -= Math.PI * 2 * Math.floor(angle / (Math.PI * 2));
    blade[k * 4] = position.getY(k);
    blade[k * 4 + 1] = angle * reach;
    blade[k * 4 + 2] = Math.hypot(dx, dz);
    blade[k * 4 + 3] = angle * reach;
    nb[k * 3] = normal.getY(k);
    nb[k * 3 + 1] = 0;
    nb[k * 3 + 2] = Math.hypot(normal.getX(k), normal.getZ(k));
  }
  g.setAttribute('aBlade', new THREE.BufferAttribute(blade, 4));
  g.setAttribute('aNb', new THREE.BufferAttribute(nb, 3));
  return g;
}
