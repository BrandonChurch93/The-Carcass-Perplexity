// How a gill-plume grows: a fleshy holdfast in a crack, trunks that rise from it and arch over toward the shaft, side stems off the trunks,
// and along every stem fine filaments that sweep toward its tip, longest and palest at the end where they hang wet.
import type { Rng } from '../../../core/rng';
import { Ribbons, type V3 } from './ribbons';

export interface Bush {
  x: number;
  y: number;
  z: number;
  tall: number;
  /** The way it leans, radians: toward the shaft. */
  lean: number;
  /** 1 for the ones the camera comes close to, less for the far ones: how many filaments are grown. */
  detail: number;
}

/** A tip a drop can hang from and fall off: where, and how far above the ground. */
export interface Tip {
  at: V3;
  bush: number;
  stemAt: number;
  stemPhase: number;
  phase: number;
  tall: number;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

interface Stem {
  points: V3[];
  /** Height fraction of the bush at each point: what the sway reads. */
  at: number[];
  phase: number;
  length: number;
  /** 0 at the holdfast, 1 at the tips of the bush. */
  from: number;
  to: number;
  yaw: number;
  thick: number;
  open: number;
}

/** A stem that leaves `from` at an elevation and a yaw, arches toward the lean and droops at its end. */
function grow(from: V3, yaw: number, rise: number, droop: number, length: number, lean: number, pull: number, segments: number, wobble: (i: number) => [number, number]): V3[] {
  const points: V3[] = [from];
  let [x, y, z] = from;
  let heading = yaw;
  const ds = length / segments;
  for (let i = 0; i < segments; i++) {
    const s = (i + 0.5) / segments;
    const [wy, we] = wobble(i);
    const elevation = rise - (rise + droop) * s ** 1.6 + we;
    // The whole bush is combed one way by the breath of the shaft: every stem turns toward the lean as it goes.
    let turn = lean - heading;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    heading += turn * pull * (1 / segments) * 2 + wy;
    x += Math.sin(heading) * Math.cos(elevation) * ds;
    y += Math.sin(elevation) * ds;
    z -= Math.cos(heading) * Math.cos(elevation) * ds;
    points.push([x, y, z]);
  }
  return points;
}

export function growBush(out: Ribbons, tips: Tip[], bush: Bush, index: number, rng: Rng): void {
  const { tall, lean, detail } = bush;
  const root: V3 = [bush.x, bush.y, bush.z];
  const stems: Stem[] = [];
  const trunks = Math.max(3, Math.round((tall > 3 ? 8 : 5) * (0.6 + 0.4 * detail)));
  const heightOf = (p: V3): number => Math.min(1, Math.max(0, (p[1] - bush.y) / tall));

  for (let t = 0; t < trunks; t++) {
    const k = (t + rng.range(0.2, 0.8)) / trunks - 0.5;
    const yaw = lean + k * 2.6 + rng.range(-0.25, 0.25);
    const length = tall * rng.range(0.95, 1.35) * (1 - 0.45 * Math.abs(k));
    const rise = rng.range(1.0, 1.35) - 0.5 * Math.abs(k);
    const base: V3 = [bush.x + Math.sin(yaw) * 0.1 * tall * rng.range(0.2, 1), bush.y - 0.05, bush.z - Math.cos(yaw) * 0.1 * tall * rng.range(0.2, 1)];
    const points = grow(base, yaw, rise, rng.range(0.25, 0.7), length, lean, 0.35, 14, () => [rng.range(-0.07, 0.07), rng.range(-0.06, 0.06)]);
    const trunk: Stem = { points, at: points.map(heightOf), phase: rng.range(0, 6.28), length, from: 0, to: 1, yaw, thick: 0.02 * tall * rng.range(0.8, 1.2), open: 1 - 0.5 * (1 - 2 * Math.abs(k)) };
    stems.push(trunk);
    const branches = Math.round(rng.range(4, 7) * (0.5 + 0.5 * detail));
    for (let b = 0; b < branches; b++) {
      const s = 0.22 + 0.6 * ((b + rng.next()) / branches);
      const i = Math.min(points.length - 2, Math.floor(s * (points.length - 1)));
      const from = points[i] as V3;
      const next = points[i + 1] as V3;
      const heading = Math.atan2(next[0] - from[0], -(next[2] - from[2]));
      const elevation = Math.asin(Math.max(-1, Math.min(1, (next[1] - from[1]) / Math.hypot(next[0] - from[0], next[1] - from[1], next[2] - from[2]))));
      const side = (b % 2 === 0 ? 1 : -1) * rng.range(0.35, 0.9);
      const l = length * (1 - s) * rng.range(0.75, 1.15) + 0.12 * tall;
      const pts = grow([from[0], from[1], from[2]], heading + side, elevation + rng.range(-0.1, 0.35), rng.range(0.3, 0.9), l, lean, 0.3, 9, () => [rng.range(-0.09, 0.09), rng.range(-0.08, 0.08)]);
      stems.push({ points: pts, at: pts.map(heightOf), phase: trunk.phase + rng.range(-0.5, 0.5), length: l, from: s, to: 1, yaw: heading + side, thick: trunk.thick * 0.5 * (1 - 0.5 * s), open: Math.min(1, trunk.open + 0.25) });
    }
  }

  for (const stem of stems) {
    const n = stem.points.length;
    out.add({
      points: stem.points,
      // Thick and fleshy where it leaves the holdfast, a wire at its end.
      half: stem.points.map((_, i) => stem.thick * (stem.from === 0 ? 1 + 2.2 * smooth(0.22, 0, i / (n - 1)) : 1) * (1 - 0.8 * (i / (n - 1)))),
      kind: 0,
      stemAt: (u) => stem.at[Math.min(n - 1, Math.round(u * (n - 1)))] as number,
      stemPhase: stem.phase,
      phase: stem.phase,
      open: stem.open,
      tone: rng.next(),
      tall,
      root,
      reach: (u) => stem.from + (stem.to - stem.from) * u,
    });

    // The filaments: from a little way up the stem to its end, on every side, swept toward the tip and hanging.
    const per = Math.max(6, Math.round((stem.length / 0.028) * detail * (tall > 3 ? 0.55 : 0.8)));
    for (let f = 0; f < per; f++) {
      const s = stem.from === 0 ? 0.16 + 0.84 * ((f + rng.next()) / per) ** 0.8 : 0.04 + 0.96 * ((f + rng.next()) / per) ** 0.85;
      const at = s * (n - 1);
      const i = Math.min(n - 2, Math.floor(at));
      const a = stem.points[i] as V3;
      const b = stem.points[i + 1] as V3;
      const w = at - i;
      const from: V3 = [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w];
      let tx = b[0] - a[0];
      let ty = b[1] - a[1];
      let tz = b[2] - a[2];
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl;
      ty /= tl;
      tz /= tl;
      // A direction off the stem: round it at a random angle, mostly sideways and down, then swept forward along the stem.
      const around = rng.range(0, 6.283);
      let sx = -tz;
      let sz = tx;
      const sl = Math.hypot(sx, sz) || 1;
      sx /= sl;
      sz /= sl;
      const ux = -ty * sz * -1;
      const uy = tz * sx - tx * sz;
      const uz = ty * sx;
      const c = Math.cos(around);
      const sn = Math.sin(around);
      const sweep = rng.range(0.45, 1.1) + 0.5 * s;
      let dx = tx * sweep + (sx * c + ux * sn);
      let dy = ty * sweep + uy * sn - 0.25;
      let dz = tz * sweep + (sz * c + uz * sn);
      const dl = Math.hypot(dx, dy, dz) || 1;
      dx /= dl;
      dy /= dl;
      dz /= dl;
      const end = smooth(0.75, 1, s);
      const length = tall * (0.07 + 0.09 * rng.next() + 0.1 * end * rng.next()) * (0.6 + 0.4 * stem.to);
      const segments = 5;
      const points: V3[] = [from];
      let [x, y, z] = from;
      const sag = rng.range(0.5, 1.3) * (0.6 + 0.8 * end);
      for (let q = 1; q <= segments; q++) {
        const v = q / segments;
        // It leaves the stem straight and gives way to its own wet weight toward the tip.
        const fall = sag * v * v;
        const lx = dx;
        const ly = dy - fall;
        const lz = dz;
        const ll = Math.hypot(lx, ly, lz) || 1;
        x += (lx / ll) * (length / segments);
        y += (ly / ll) * (length / segments);
        z += (lz / ll) * (length / segments);
        y = Math.max(y, bush.y - 0.3);
        points.push([x, y, z]);
      }
      const half = 0.0011 * tall * rng.range(0.7, 1.4);
      const stemAt = stem.at[i] as number;
      const phase = rng.range(0, 6.283);
      out.add({
        points,
        half: points.map((_, q) => half * (1 - 0.75 * (q / segments) ** 2)),
        kind: 1,
        stemAt: () => stemAt,
        stemPhase: stem.phase,
        phase,
        open: Math.min(1, stem.open + 0.3 * rng.next()),
        tone: rng.next(),
        tall,
        root,
        reach: (u) => Math.min(1, stem.from + (stem.to - stem.from) * s + 0.25 * u),
      });
      if (end > 0.3 && rng.next() < 0.5 && tips.length < 4000) tips.push({ at: [x, y, z], bush: index, stemAt, stemPhase: stem.phase, phase, tall });
    }
  }
}
