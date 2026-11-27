// The dead wader's own body, by design: a trunk fallen in on its ribs with the hide slack over them, the neck along the rock in a slack
// curve, the legs folded and crossed toward the lens, the cords of the mop matted in a fan from the end of the neck. Every part is a closed
// skin swept along a line, in the animal's own metres: x along it (the mop at the low end, the hind hoofs at the high end), y up from the
// rock, z toward the lens of the rim. `place` puts a point of it into the world.
import * as THREE from 'three';
import { noise3 } from '../land/ribs';

export type V3 = [number, number, number];

const sat = (t: number): number => Math.min(1, Math.max(0, t));
const smooth = (t: number): number => {
  const s = sat(t);
  return s * s * (3 - 2 * s);
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const bell = (t: number, at: number, wide: number): number => Math.exp(-(((t - at) / wide) ** 2));

/** What a skin is: the trunk's hide, a limb's hide, a cord of the mop, a hoof. */
export const KIND = { trunk: 0, limb: 0.3, cord: 1, hoof: 2 } as const;

interface Skin {
  position: number[];
  uv: number[];
  data: number[];
  index: number[];
  /** Each skin swept: its first point, its rings and its sides. The first and the last point round a ring are one place. */
  seams: [number, number, number][];
}

/** A point on a line through `path` at t, 0 to 1: a spline that passes through every point. */
function along(path: readonly V3[], t: number): V3 {
  const n = path.length - 1;
  const f = sat(t) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const u = f - i;
  const p0 = path[Math.max(0, i - 1)] as V3;
  const p1 = path[i] as V3;
  const p2 = path[i + 1] as V3;
  const p3 = path[Math.min(n, i + 2)] as V3;
  const out: V3 = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const a = p0[k] as number;
    const b = p1[k] as number;
    const c = p2[k] as number;
    const d = p3[k] as number;
    out[k] = 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
  }
  return out;
}

interface Cut {
  /** Half its width (level) and half its height here, metres. */
  wide: number;
  tall: number;
}

/** A closed skin swept along a line. `cut` gives its section at t; `push` moves the skin out (metres) at t and an angle round the section
 *  (0 on the side away from the lens for a line that runs along x, a quarter turn at the top) and says how shut in the place is. */
function sweep(skin: Skin, path: readonly V3[], rings: number, sides: number, kind: number | ((t: number) => number), cut: (t: number) => Cut, push: (t: number, ang: number) => [number, number], swap = false, tent = 1): void {
  const first = skin.position.length / 3;
  let run = 0;
  let last: V3 | null = null;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const c = along(path, t);
    const a = along(path, Math.max(0, t - 0.01));
    const b = along(path, Math.min(1, t + 0.01));
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    let tz = b[2] - a[2];
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl;
    ty /= tl;
    tz /= tl;
    // Level across the line, and up from it.
    let sx = tz;
    let sz = -tx;
    const sl = Math.hypot(sx, sz);
    if (sl < 1e-4) {
      sx = 1;
      sz = 0;
    } else {
      sx /= sl;
      sz /= sl;
    }
    const ux = ty * sz;
    const uy = tz * sx - tx * sz;
    const uz = -ty * sx;
    if (last) run += Math.hypot(c[0] - last[0], c[1] - last[1], c[2] - last[2]);
    last = c;
    const q = cut(t);
    for (let j = 0; j <= sides; j++) {
      const ang = ((j % sides) / sides) * 2 * Math.PI;
      const c0 = Math.cos(ang);
      const s0 = Math.sin(ang);
      // A tented section: over its middle the skin hangs from a ridge in two planes, as a cloth does from a pole.
      const e = s0 > 0 ? tent : 1;
      const ca = Math.sign(c0) * Math.abs(c0) ** e;
      const sa = Math.sign(s0) * Math.abs(s0) ** e;
      const [out, occ] = push(t, ang);
      const w = q.wide + out;
      const h = q.tall + out;
      const px = c[0] + sx * ca * w + ux * sa * h;
      const py = c[1] + uy * sa * h;
      const pz = c[2] + sz * ca * w + uz * sa * h;
      skin.position.push(px, py, pz);
      const round = (j / sides) * 2 * Math.PI * 0.5 * (q.wide + q.tall + 0.02);
      if (swap) skin.uv.push(round, run);
      else skin.uv.push(run, round);
      skin.data.push(typeof kind === 'number' ? kind : kind(t), occ * lerp(0.5, 1, smooth(0.62 + 0.5 * s0)), 0);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < sides; j++) {
      const a = first + i * (sides + 1) + j;
      const b = a + sides + 1;
      skin.index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  skin.seams.push([first, rings, sides]);
}

/** Round ends: 0 at both ends of a line, 1 along it, as a ball closes. */
const closed = (t: number, head: number, tail: number): number => Math.sqrt(sat(1 - (1 - sat(t / head)) ** 2)) * Math.sqrt(sat(1 - (1 - sat((1 - t) / tail)) ** 2));

/** A limb: a thin shaft with a knob at every joint, the skin shrunk onto the bone. `joints` are places along it (t) with the radius of the knob. */
function limb(skin: Skin, path: readonly V3[], thick: [number, number], joints: readonly [number, number][], seed: number): void {
  sweep(
    skin,
    path,
    Math.max(24, path.length * 14),
    12,
    (t) => {
      // A joint is raw: the hide has worn through on the knob.
      let raw = 0;
      for (const [at] of joints) raw = Math.max(raw, bell(t, at, 0.04));
      // Below the first joint it is shank: a little over the limb's own kind, under what counts as raw.
      return KIND.limb + 0.012 * smooth((t - 0.34) / 0.12) + 0.2 * raw;
    },
    (t) => {
      let r = lerp(thick[0], thick[1], smooth((t - 0.1) / 0.4));
      for (const [at, knob] of joints) r = Math.max(r, lerp(r, knob, bell(t, at, 0.045)));
      r *= closed(t, 0.02, 0.03);
      return { wide: r * 1.08, tall: r * 0.92 };
    },
    (t, ang) => {
      // Tendons stand along it under the skin, and the skin has creased round it.
      const cord = (0.0045 * Math.cos(3 * ang + seed) + 0.004 * Math.cos(2 * ang + 1.7 * seed)) * smooth((t - 0.2) / 0.2);
      const crease = 0.004 * noise3(t * 38 + seed, ang * 1.5, seed * 3.1);
      return [(cord + crease) * closed(t, 0.03, 0.04), 0.82 + 30 * (cord + crease)];
    },
  );
}

/** A hoof: two toes side by side, each a blunt wedge. `at` is where the leg ends, `way` the level direction it points in. */
function hoof(skin: Skin, at: V3, way: [number, number], size: number): void {
  const wl = Math.hypot(way[0], way[1]) || 1;
  const wx = way[0] / wl;
  const wz = way[1] / wl;
  for (const side of [-1, 1]) {
    const ox = -wz * side * 0.021 * size;
    const oz = wx * side * 0.021 * size;
    const path: V3[] = [
      [at[0] + ox * 0.6 - wx * 0.03 * size, at[1], at[2] + oz * 0.6 - wz * 0.03 * size],
      [at[0] + ox + wx * 0.045 * size, at[1] - 0.004, at[2] + oz + wz * 0.045 * size],
      [at[0] + ox * 1.25 + wx * 0.12 * size, at[1] - 0.012, at[2] + oz * 1.25 + wz * 0.12 * size],
    ];
    sweep(
      skin,
      path,
      12,
      8,
      KIND.hoof,
      (t) => {
        const r = 0.03 * size * (0.75 + 0.5 * smooth(t / 0.4)) * closed(t, 0.12, 0.5) * (1 - 0.35 * smooth((t - 0.6) / 0.4));
        return { wide: r * 0.78, tall: r * 1.1 };
      },
      () => [0, 0.9],
    );
  }
}

export interface Body {
  geometry: THREE.BufferGeometry;
  /** Places on it, in its own metres: where it meets the rock on the side of the lens, where its shade lies, where flies gather. */
  lines: V3[][];
  spots: [V3, number, number][];
  flies: V3[];
}

/** The whole animal, set into the world by `place` (its own metres to the world; y is given over the rock at that place). */
export function buildBody(place: (p: V3) => V3, random: () => number, k: number): Body {
  const skin: Skin = { position: [], uv: [], data: [], index: [], seams: [] };

  // The trunk: fallen in. Its back is away from the lens, its belly toward it. The ribs stand through the hide from the shoulder to the
  // last rib, the flank behind them has gone down to the rock, and the hip and the shoulder are the two high points left.
  const trunk: V3[] = [
    [-0.82, 0.15, -0.26],
    [-0.5, 0.2, -0.33],
    [-0.05, 0.15, -0.37],
    [0.42, 0.17, -0.35],
    [0.9, 0.16, -0.27],
  ];
  sweep(
    skin,
    trunk,
    120,
    64,
    KIND.trunk,
    (t) => {
      const round = closed(t, 0.16, 0.13);
      const chest = bell(t, 0.3, 0.24);
      const hip = bell(t, 0.82, 0.1);
      return { wide: (0.37 + 0.05 * chest + 0.03 * hip) * round, tall: (0.25 + 0.06 * chest + 0.04 * hip) * round };
    },
    (t, ang) => {
      const round = closed(t, 0.16, 0.13);
      // The ribs: nine of them, each leaning back as it comes down from the spine, the hide sunk between each two.
      const cage = smooth((t - 0.1) / 0.08) * smooth((0.6 - t) / 0.1) * smooth((ang - 0.15) / 0.5) * smooth((3.55 - ang) / 0.6);
      const phase = ((t - 0.1) / 0.5) * 6.4 - 0.5 * (ang - 1.2) + 0.95 * noise3(t * 5.3, ang * 1.1, 1.7);
      const wave = 0.5 + 0.5 * Math.cos(2 * Math.PI * phase);
      // No two alike: one stands proud, the next is half under the slack, and each fades and comes back along its length.
      const each = (0.3 + 0.7 * Math.sin(Math.floor(phase + 0.5) * 2.4 + 1.0) ** 2) * (0.5 + 0.5 * smooth(0.5 + 1.6 * noise3(t * 8.3, ang * 2.1, 3.3)));
      const sag = 0.6 + 0.4 * noise3(t * 7, ang * 1.3, 8.2);
      const rib = cage * (each * 0.026 * wave ** 4 - 0.03 * sag * (0.4 + 0.6 * each) * (1 - wave) ** 1.5);
      // The spine: a ridge of knuckles along the far edge of the top.
      const spine = bell(ang, 1.25, 0.16) * smooth((t - 0.06) / 0.1) * smooth((0.97 - t) / 0.1) * (0.02 + 0.012 * Math.cos(2 * Math.PI * t * 21));
      // The flank between the last rib and the hip has fallen in, and the belly under it lies on the rock.
      const flank = -0.075 * bell(t, 0.64, 0.13) * smooth((ang - 0.7) / 0.5) * smooth((3.3 - ang) / 0.6) - 0.04 * bell(t, 0.45, 0.2) * bell(ang, 2.6, 0.5);
      // The hip's point and the blade of the shoulder, each with the hide drawn tight over it.
      const hipPoint = 0.1 * bell(t, 0.84, 0.05) * bell(ang, 1.5, 0.45);
      const blade = 0.05 * bell(t, 0.15, 0.07) * bell(ang, 1.5, 0.6);
      // Slack hide: long folds that hang down the side, deepest low on it.
      // They lean toward the shoulder as they come down, and a skirt of it lies out on the rock on the side of the lens.
      const drape = 1 - 2 * Math.abs(noise3(t * 3.1 + 0.9 * (ang - 1.5), ang * 0.9, 4.4));
      const fold = (0.008 + 0.024 * smooth((ang - 1.5) / 1.3) * smooth((4.3 - ang) / 0.6)) * drape * (1 - 0.85 * cage) + 0.006 * noise3(t * 31, ang * 6, 9.1);
      const skirt = 0.07 * bell(ang, 3.45, 0.32) * (0.6 + 0.4 * noise3(t * 9, 2.2, 6.6)) * smooth((t - 0.12) / 0.1) * smooth((0.9 - t) / 0.1);
      const out = (rib + spine + flank + hipPoint + blade + fold + skirt) * round;
      return [out, sat(0.86 + 9 * (rib + flank * 0.6 + fold))];
    },
    false,
    1.25,
  );
  for (let i = 0; i < skin.uv.length; i++) skin.uv[i] = (skin.uv[i] as number) * 0.62;

  // The neck: from the shoulder along the rock in a slack curve to the root of the mop. The knuckles of its spine stand along its top.
  const neck: V3[] = [
    [-0.6, 0.17, -0.3],
    [-0.9, 0.14, 0.08],
    [-1.2, 0.1, 0.14],
    [-1.5, 0.09, -0.32],
    [-1.75, 0.085, -0.8],
    [-2.0, 0.075, -0.74],
    [-2.13, 0.065, -0.36],
    [-2.1, 0.055, -0.02],
  ];
  sweep(
    skin,
    neck,
    130,
    28,
    (t) => KIND.limb + 0.2 * smooth((t - 0.72) / 0.25),
    (t) => {
      const r = lerp(0.14, 0.06, smooth(t / 0.9)) * closed(t, 0.02, 0.1);
      return { wide: r * 1.12, tall: r * 0.86 };
    },
    (t, ang) => {
      const knuckle = 0.011 * bell(ang, 1.2, 0.35) * (0.5 + 0.5 * Math.cos(2 * Math.PI * t * 26));
      const ring = 0.007 * (1 - 2 * Math.abs(noise3(t * 24, Math.sin(ang) * 0.8, 2.2))) + 0.004 * noise3(t * 60, ang * 3, 7.7);
      return [(knuckle + ring) * closed(t, 0.04, 0.05), sat(0.85 + 22 * ring)];
    },
    true,
  );

  // The legs. The upper hind leg stands highest: its thigh comes down from the hip to a knee on the rock toward the lens, and its shank
  // lies out across the other hind leg, which is straight. The fore leg is folded under the chest.
  const hindOver: V3[] = [
    [0.66, 0.2, -0.34],
    [0.72, 0.37, -0.2],
    [0.62, 0.29, 0.1],
    [0.44, 0.1, 0.36],
    [0.4, 0.075, 0.44],
    [0.62, 0.07, 0.4],
    [0.95, 0.12, 0.24],
    [1.3, 0.06, 0.2],
    [1.62, 0.045, 0.24],
  ];
  limb(skin, hindOver, [0.1, 0.034], [[0.13, 0.085], [0.49, 0.066], [0.74, 0.052], [0.985, 0.043]], 1.3);
  hoof(skin, [1.65, 0.04, 0.245], [1, 0.1], 1.15);
  const hindUnder: V3[] = [
    [0.8, 0.13, -0.2],
    [0.95, 0.075, -0.02],
    [1.07, 0.055, 0.1],
    [1.3, 0.045, 0.42],
    [1.52, 0.04, 0.74],
  ];
  limb(skin, hindUnder, [0.08, 0.032], [[0.5, 0.052], [0.985, 0.042]], 4.1);
  hoof(skin, [1.54, 0.036, 0.765], [0.57, 0.82], 1.15);
  const fore: V3[] = [
    [-0.5, 0.15, -0.14],
    [-0.54, 0.1, 0.16],
    [-0.47, 0.06, 0.37],
    [-0.42, 0.055, 0.4],
    [-0.1, 0.05, 0.31],
    [0.03, 0.05, 0.27],
    [0.2, 0.042, 0.42],
    [0.31, 0.04, 0.55],
  ];
  limb(skin, fore, [0.075, 0.03], [[0.4, 0.055], [0.72, 0.048], [0.985, 0.04]], 6.6);
  hoof(skin, [0.325, 0.034, 0.57], [0.6, 0.8], 1.05);
  const foreUnder: V3[] = [
    [-0.36, 0.1, -0.1],
    [-0.2, 0.05, 0.12],
    [0.12, 0.04, 0.05],
    [0.34, 0.035, 0.12],
  ];
  limb(skin, foreUnder, [0.06, 0.03], [[0.4, 0.048]], 8.8);

  // The mop: cords from the end of the neck, matted where they leave it and spread in a fan on the rock, each in its own slack curve, some
  // of them forked. They lie on one another near the root and singly at the ends.
  const root: V3 = [-2.1, 0.045, -0.02];
  const cord = (from: V3, bearing: number, reach: number, thick: number, lift: number, forks: number): void => {
    const wander = random() * 40;
    const pts: V3[] = [];
    const count = 10;
    let turn = bearing;
    let x = from[0];
    let z = from[2];
    // It forks as a root does: twice or three times along it, each fork thinner and shorter, and each of those forks again.
    const forkAt = forks > 0 ? [2 + Math.floor(random() * 2), 4 + Math.floor(random() * 2), 6 + Math.floor(random() * 2)] : [];
    for (let i = 0; i <= count; i++) {
      const f = i / count;
      const girth = thick * lerp(1, 0.16, Math.sqrt(f));
      pts.push([x, lerp(from[1], 0.04 + girth * 0.5 + lift * (1 - f) ** 2, smooth(f / 0.25)) + 0.008 * Math.max(0, noise3(wander, f * 5, 3.3)), z]);
      turn += 0.3 * noise3(wander, f * 3.1, 1.1) + 0.14 * Math.sin(f * 11 + wander);
      x += (Math.cos(turn) * reach) / count;
      z += (Math.sin(turn) * reach) / count;
      if (forkAt.includes(i)) {
        const side = random() < 0.5 ? -1 : 1;
        cord([x, 0.04 + girth * 0.4, z], turn + side * (0.25 + 0.45 * random()), reach * (1 - f) * (0.7 + 0.5 * random()), girth * 0.62, 0, forks - 1);
      }
    }
    sweep(
      skin,
      pts,
      forks > 1 ? 26 : 16,
      forks > 1 ? 7 : 5,
      KIND.cord,
      (t) => {
        const r = 0.5 * thick * lerp(1, 0.16, Math.sqrt(t)) * Math.sqrt(sat((1 - t) / 0.06));
        return { wide: r, tall: r * 0.85 };
      },
      (t) => [0, 0.55 + 0.45 * t],
    );
  };
  const mains = 26;
  for (let i = 0; i < mains; i++) {
    const u = (i + 0.2 + 0.6 * random()) / mains;
    // The fan opens away from the neck's end: toward the low end of the animal and toward the lens. The cords leave the neck as one
    // matted bundle as thick as it is.
    const bearing = Math.PI * lerp(0.3, 1.02, u ** 1.3) + 0.1 * (random() - 0.5);
    const thick = 0.025 + 0.022 * random();
    cord([root[0] + 0.05 * (random() - 0.5), root[1] + 0.05 * random(), root[2] - 0.12 + 0.07 * (random() - 0.5)], bearing, 1.0 + 0.9 * random(), thick, 0.05 * random(), 2);
  }

  // Into the world: every point at its height over the rock under it, sunk a little, the low points more.
  const count = skin.position.length / 3;
  const position = new Float32Array(count * 3);
  const data = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const y = skin.position[i * 3 + 1] as number;
    const w = place([(skin.position[i * 3] as number) * k, (y - 0.035) * k, (skin.position[i * 3 + 2] as number) * k]);
    position.set(w, i * 3);
    data[i * 3] = skin.data[i * 3] as number;
    data[i * 3 + 1] = skin.data[i * 3 + 1] as number;
    data[i * 3 + 2] = y * k;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(skin.uv.map((v) => v * k)), 2));
  geometry.setAttribute('aData', new THREE.BufferAttribute(data, 3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(skin.index), 1));
  geometry.computeVertexNormals();
  // No line where a skin closes on itself: both points of the seam take the mean of their two normals.
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
  for (const [first, rings, sides] of skin.seams) {
    for (let i = 0; i <= rings; i++) {
      const a = first + i * (sides + 1);
      const b = a + sides;
      const x = normal.getX(a) + normal.getX(b);
      const y = normal.getY(a) + normal.getY(b);
      const z = normal.getZ(a) + normal.getZ(b);
      const l = Math.hypot(x, y, z) || 1;
      normal.setXYZ(a, x / l, y / l, z / l);
      normal.setXYZ(b, x / l, y / l, z / l);
    }
  }
  geometry.computeBoundingSphere();

  const s = (p: V3): V3 => [p[0] * k, p[1] * k, p[2] * k];
  return {
    geometry,
    lines: [
      [s([-0.8, 0, 0.02]), s([-0.4, 0, 0.1]), s([0.1, 0, 0.02]), s([0.5, 0, 0.0]), s([0.9, 0, -0.05])],
      [s([-0.9, 0, 0.2]), s([-1.2, 0, 0.26]), s([-1.5, 0, -0.15]), s([-1.8, 0, -0.6]), s([-2.1, 0, -0.2])],
      [s([0.4, 0, 0.5]), s([0.95, 0, 0.32]), s([1.3, 0, 0.3]), s([1.62, 0, 0.3])],
      [s([1.0, 0, 0.1]), s([1.3, 0, 0.48]), s([1.52, 0, 0.8])],
    ],
    spots: [
      [s([-0.5, 0, -0.3]), 0.5, 0.95],
      [s([0, 0, -0.33]), 0.52, 0.95],
      [s([0.5, 0, -0.3]), 0.52, 0.95],
      [s([0.85, 0, -0.2]), 0.4, 0.85],
      [s([-1.0, 0, 0.1]), 0.28, 0.8],
      [s([-1.45, 0, -0.25]), 0.24, 0.75],
      [s([-1.85, 0, -0.78]), 0.24, 0.7],
      [s([-2.5, 0, 0.4]), 0.7, 0.4],
      [s([0.5, 0, 0.3]), 0.3, 0.7],
      [s([1.1, 0, 0.2]), 0.22, 0.6],
      [s([1.4, 0, 0.4]), 0.25, 0.5],
      [s([-0.2, 0, 0.3]), 0.3, 0.65],
    ],
    flies: [s([-0.3, 0.42, -0.33]), s([0.2, 0.34, -0.36]), s([0.7, 0.5, -0.25]), s([-0.8, 0.3, -0.28]), s([-2.5, 0.1, 0.4]), s([1.1, 0.2, 0.2])],
  };
}
