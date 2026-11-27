// A kite-wing as a body: a trunk and a neck lofted along a spine, two legs of two bones each with feet of four toes, two folded sails and a
// tuft of strands, built anew for every frame on the processor from a pose that is a function of the time of the place alone. Its skin is the
// Builder's picture of the feeding animal, thrown onto the body from its side; where the body turns away from that side the picture's own
// flank is laid round it. Measures are pixels of that picture: PX of them are a metre at size 1.
import * as THREE from 'three';
import { RIG_GLSL } from '../shared/glsl';
import type { Context } from '../shared/context';

const PX = 245;
const SIZE: [number, number] = [1536, 1024];
/** The middle of the hips in the picture: the origin of the body's own frame (x ahead, y up, z to its left). */
const HIPS: [number, number] = [525, 380];
/** A patch of the flank, evenly lit: [left, top, width, height]. It is laid, mirrored and repeated, where the picture cannot be thrown. */
const FLANK: [number, number, number, number] = [500, 235, 110, 90];

type V3 = [number, number, number];
type Node = [number, number, number];

/** The spine in the picture, rump to shoulder: [x, y, half the height of the body there]. */
const TORSO: Node[] = [[362, 300, 5], [378, 299, 34], [420, 295, 76], [480, 292, 98], [540, 292, 106], [600, 285, 104], [660, 268, 98], [710, 250, 92]];
/** The neck in the picture, shoulder to the root of the tuft. */
const NECK: Node[] = [[710, 250, 92], [760, 272, 68], [805, 318, 44], [850, 372, 34], [890, 416, 29], [930, 460, 25.5], [965, 500, 22.5], [1000, 540, 20.5], [1040, 580, 19], [1075, 612, 18], [1090, 626, 10]];
const TORSO_RINGS = 10;
const NECK_RINGS = 24;
const RINGS = TORSO_RINGS + NECK_RINGS;
const SIDES = 16;
/** How wide the trunk is for its height, at the hips and at the end of the neck. */
const WIDE = [0.74, 0.94];

/** A leg in the picture: hip, the joint that bends back, ankle; and its rings as [part of the bone, half its width]. */
const LEG = { hip: [497, 362], joint: [397, 545], ankle: [380, 884] } as const;
const THIGH: [number, number][] = [[0, 44], [0.25, 42], [0.5, 31], [0.65, 21], [0.8, 14.5], [0.92, 15.5]];
const SHANK: [number, number][] = [[0.07, 13.5], [0.25, 9.8], [0.6, 8.6], [0.9, 9.6], [1, 11]];
const JOINT_WIDE = 18.5;
const LEG_RINGS = THIGH.length + 1 + SHANK.length;
const LEG_SIDES = 10;
/** Metres of the two bones at size 1, and how high the ankle stands over the ground a planted foot is on. */
export const BONES = { thigh: Math.hypot(LEG.joint[0] - LEG.hip[0], LEG.joint[1] - LEG.hip[1]) / PX, shank: Math.hypot(LEG.ankle[0] - LEG.joint[0], LEG.ankle[1] - LEG.joint[1]) / PX, ankle: 0.055 };
/** Where a hip is in the body's frame, metres at size 1 (the left one; the right is its mirror). */
export const HIP: V3 = [-0.05, 0.03, 0.17];

/** A toe: the way it points off the foot's heading, its length in metres. Three ahead and one behind. */
const TOES: [number, number][] = [[-0.52, 0.27], [0, 0.32], [0.52, 0.27], [Math.PI, 0.17]];
const TOE_RINGS = 4;
const TOE_SIDES = 5;

const STRANDS = 22;
const STRAND_RINGS = 12;
const STRAND_SIDES = 5;

/** The folded sail in the picture, as a ring of corners. Outside the animal the picture's own outline cuts it. */
const SAIL: [number, number][] = [[795, 150], [700, 105], [600, 85], [480, 82], [380, 90], [280, 105], [170, 135], [80, 175], [40, 200], [35, 470], [160, 408], [240, 374], [468, 374], [470, 300], [530, 285], [610, 268], [690, 252], [795, 240]];
/** Its upper edge, which lies along the ridge of the back, and how far from the middle of the body it may hang: both by x. */
const RIDGE: [number, number][] = [[40, 215], [80, 195], [170, 152], [280, 122], [380, 104], [480, 97], [600, 100], [700, 118], [795, 165]];
const HANG: [number, number][] = [[40, 0.05], [150, 0.09], [300, 0.17], [420, 0.27], [540, 0.355], [700, 0.3], [795, 0.26]];
const SAIL_CELL = 28;
/** The wrist, about which a folded sail lifts. */
const WRIST: [number, number] = [770, 175];

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const along = (table: [number, number][], x: number): number => {
  if (x <= (table[0] as [number, number])[0]) return (table[0] as [number, number])[1];
  for (let i = 1; i < table.length; i++) {
    const a = table[i - 1] as [number, number];
    const b = table[i] as [number, number];
    if (x <= b[0]) return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
  }
  return (table[table.length - 1] as [number, number])[1];
};
const frac = (x: number): number => x - Math.floor(x);
const hash1 = (n: number): number => frac(Math.sin(n * 127.1 + 3.7) * 43758.5453);

/** `count` points evenly along a line of nodes: x, y, width, and the way the line runs there. */
function resample(nodes: Node[], count: number): { x: number; y: number; r: number; tx: number; ty: number; s: number }[] {
  const lengths = [0];
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1] as Node;
    const b = nodes[i] as Node;
    lengths.push((lengths[i - 1] as number) + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = lengths[lengths.length - 1] as number;
  const at = (s: number): [number, number, number] => {
    let i = 1;
    while (i < nodes.length - 1 && (lengths[i] as number) < s) i++;
    const a = nodes[i - 1] as Node;
    const b = nodes[i] as Node;
    const u = clamp01((s - (lengths[i - 1] as number)) / ((lengths[i] as number) - (lengths[i - 1] as number)));
    // The widths run smoothly from node to node; the line itself is rounded by reading it a little either side.
    const k = u * u * (3 - 2 * u);
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * (0.5 * u + 0.5 * k)];
  };
  const out = [];
  for (let i = 0; i < count; i++) {
    const s = (total * i) / (count - 1);
    const p = at(s);
    const before = at(Math.max(0, s - total * 0.04));
    const after = at(Math.min(total, s + total * 0.04));
    const l = Math.hypot(after[0] - before[0], after[1] - before[1]) || 1;
    out.push({ x: p[0], y: p[1], r: p[2], tx: (after[0] - before[0]) / l, ty: (after[1] - before[1]) / l, s });
  }
  return out;
}

const torso = resample(TORSO, TORSO_RINGS);
const neck = resample(NECK, NECK_RINGS + 1).slice(1);
/** Metres of neck at size 1, shoulder to the root of the tuft. */
export const NECK_LONG = (neck[neck.length - 1] as (typeof neck)[number]).s / PX;
const torsoLong = (torso[torso.length - 1] as (typeof torso)[number]).s;
/** Where the neck leaves the body, in the body's frame, and the way it leaves. */
const SHOULDER: V3 = [(710 - HIPS[0]) / PX, (HIPS[1] - 250) / PX, 0];
const SHOULDER_WAY: V3 = (() => {
  const last = torso[torso.length - 1] as (typeof torso)[number];
  return [last.tx, -last.ty, 0];
})();
/** Where the picture has the root of the tuft, in the body's frame: the head of the animal as it feeds. */
export const HEAD_REST: V3 = [(1075 - HIPS[0]) / PX, (HIPS[1] - 612) / PX, 0];

// The folded sail: a grid over the ring of corners, hung from the ridge of the back out to the flank and down it.
const sail = (() => {
  const inside = (x: number, y: number): boolean => {
    let hit = false;
    for (let i = 0, j = SAIL.length - 1; i < SAIL.length; j = i++) {
      const a = SAIL[i] as [number, number];
      const b = SAIL[j] as [number, number];
      if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
    }
    return hit;
  };
  const out = (x: number, y: number): number => Math.min(0.015 + (0.85 * Math.max(0, y - along(RIDGE, x))) / PX, along(HANG, x));
  const x0 = 35;
  const y0 = 82;
  const nx = Math.ceil((795 - x0) / SAIL_CELL);
  const ny = Math.ceil((470 - y0) / SAIL_CELL);
  const slot = new Map<number, number>();
  const points: number[] = [];
  const index: number[] = [];
  const corner = (i: number, j: number): number => {
    const key = j * (nx + 1) + i;
    const have = slot.get(key);
    if (have !== undefined) return have;
    const x = x0 + i * SAIL_CELL;
    const y = y0 + j * SAIL_CELL;
    const z = out(x, y);
    // The way it faces, from its own slope.
    const zx = (out(x + 6, y) - out(x - 6, y)) / (12 / PX);
    const zy = (out(x, y - 6) - out(x, y + 6)) / (12 / PX);
    const l = Math.hypot(zx, zy, 1);
    points.push(x, y, z, -zx / l, -zy / l, 1 / l);
    slot.set(key, points.length / 6 - 1);
    return points.length / 6 - 1;
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (!inside(x0 + (i + 0.5) * SAIL_CELL, y0 + (j + 0.5) * SAIL_CELL)) continue;
      const a = corner(i, j);
      const b = corner(i + 1, j);
      const c = corner(i, j + 1);
      const d = corner(i + 1, j + 1);
      index.push(a, c, b, b, c, d);
    }
  }
  return { points, index, count: points.length / 6 };
})();

const TRUNK_VERTS = RINGS * SIDES;
const LEG_VERTS = LEG_RINGS * LEG_SIDES;
const TOE_VERTS = TOES.length * TOE_RINGS * TOE_SIDES;
const STRAND_VERTS = STRAND_RINGS * STRAND_SIDES;
const AT = {
  trunk: 0,
  legs: TRUNK_VERTS,
  toes: TRUNK_VERTS + 2 * LEG_VERTS,
  tuft: TRUNK_VERTS + 2 * LEG_VERTS + 2 * TOE_VERTS,
  sails: TRUNK_VERTS + 2 * LEG_VERTS + 2 * TOE_VERTS + STRANDS * STRAND_VERTS,
};
const VERTS = AT.sails + 2 * sail.count;

export interface Foot {
  /** The ankle, in the place. */
  x: number;
  y: number;
  z: number;
  /** The way the toes point, radians, and how far they hang (0 flat on the ground). */
  yaw: number;
  droop: number;
}
export interface Pose {
  /** The middle of the hips, in the place; the heading (0 looks along z, as the sheets had it), the nose down, the lean to its left. */
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  size: number;
  tone: number;
  /** Left and right. */
  feet: [Foot, Foot];
  /** The root of the tuft in the body's frame, metres at size 1 (ahead, up, left), and the way the neck ends: up from level, and to the left. */
  head: V3;
  headPitch: number;
  headYaw: number;
  /** The ground or bed under the tuft, which its strands lie on. */
  floor: number;
  /** How far the ends of the strands trail, metres in the place, and how hard they are shaken (0 to 1). */
  trail: V3;
  shake: number;
  /** The seconds the strands sway by. */
  clock: number;
  /** In the card loop the turn (radians a second) every sway of the strands is a whole multiple of, so that they come round; 0 in the film. */
  beat: number;
  /** A folded sail lifted off the back, radians. */
  sail: number;
  /** How long the strands of the tuft are: 1 as the feeder's, which reach the pool. */
  tuft: number;
  /** The neck leaves the shoulder turned up from the line of the back by this, radians: 0 as the feeder's. */
  rise: number;
  /** Each animal's own number, for what differs strand by strand. */
  seed: number;
}
export const pose = (): Pose => ({
  x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, size: 1, tone: 1,
  feet: [{ x: 0, y: 0, z: 0, yaw: 0, droop: 0 }, { x: 0, y: 0, z: 0, yaw: 0, droop: 0 }],
  head: [HEAD_REST[0], HEAD_REST[1], 0], headPitch: -0.75, headYaw: 0, floor: 0, trail: [0, 0, 0], shake: 0, clock: 0, beat: 0, sail: 0, tuft: 1, rise: 0, seed: 0,
});

/** The body's frame in the place: the columns ahead, up and left of a pose. */
function frame(p: Pose, out: { f: V3; u: V3; l: V3 }): void {
  const sy = Math.sin(p.yaw);
  const cy = Math.cos(p.yaw);
  const sp = Math.sin(p.pitch);
  const cp = Math.cos(p.pitch);
  const sr = Math.sin(p.roll);
  const cr = Math.cos(p.roll);
  // Level: ahead (sy, 0, cy), left (-cy, 0, sy). Nose down by the pitch, then leaned about the way ahead.
  const f: V3 = [sy * cp, -sp, cy * cp];
  const u0: V3 = [sy * sp, cp, cy * sp];
  const l0: V3 = [-cy, 0, sy];
  out.f = f;
  out.u = [u0[0] * cr + l0[0] * sr, u0[1] * cr + l0[1] * sr, u0[2] * cr + l0[2] * sr];
  out.l = [l0[0] * cr - u0[0] * sr, l0[1] * cr - u0[1] * sr, l0[2] * cr - u0[2] * sr];
}
const basis = { f: [0, 0, 1] as V3, u: [0, 1, 0] as V3, l: [-1, 0, 0] as V3 };

/** Where a point of the body's frame (metres at size 1) is in the place. */
export function inPlace(p: Pose, at: V3): V3 {
  frame(p, basis);
  const s = p.size;
  return [
    p.x + (basis.f[0] * at[0] + basis.u[0] * at[1] + basis.l[0] * at[2]) * s,
    p.y + (basis.f[1] * at[0] + basis.u[1] * at[1] + basis.l[1] * at[2]) * s,
    p.z + (basis.f[2] * at[0] + basis.u[2] * at[1] + basis.l[2] * at[2]) * s,
  ];
}

/** The neck: a curve from the shoulder to the head that keeps its length. Fills `curve` with NECK_RINGS points and ways, in the body's frame. */
const curve = { p: new Float32Array((NECK_RINGS + 1) * 3), t: new Float32Array((NECK_RINGS + 1) * 3) };
function bend(head: V3, pitch: number, yaw: number, rise = 0): void {
  let hx = head[0] - SHOULDER[0];
  let hy = head[1] - SHOULDER[1];
  let hz = head[2] - SHOULDER[2];
  const far = Math.hypot(hx, hy, hz) || 1e-6;
  // A neck cannot reach past its own length.
  const reach = Math.min(1, (0.985 * NECK_LONG) / far);
  hx *= reach;
  hy *= reach;
  hz *= reach;
  const d1: V3 = [Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw)];
  // The way it leaves the shoulder: along the back, or turned up from it where the animal carries its neck high.
  const d0: V3 = [SHOULDER_WAY[0] * Math.cos(rise) - SHOULDER_WAY[1] * Math.sin(rise), SHOULDER_WAY[0] * Math.sin(rise) + SHOULDER_WAY[1] * Math.cos(rise), 0];
  const point = (h: number, u: number, out: V3, way: V3 | null): void => {
    const a = 1 - u;
    for (let k = 0; k < 3; k++) {
      const p0 = 0;
      const p1 = (d0[k] as number) * h;
      const p3 = k === 0 ? hx : k === 1 ? hy : hz;
      const p2 = p3 - (d1[k] as number) * h * 0.85;
      out[k] = a * a * a * p0 + 3 * a * a * u * p1 + 3 * a * u * u * p2 + u * u * u * p3;
      if (way) way[k] = 3 * a * a * (p1 - p0) + 6 * a * u * (p2 - p1) + 3 * u * u * (p3 - p2);
    }
  };
  const a: V3 = [0, 0, 0];
  const b: V3 = [0, 0, 0];
  const long = (h: number): number => {
    let total = 0;
    point(h, 0, a, null);
    for (let i = 1; i <= 10; i++) {
      point(h, i / 10, b, null);
      total += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      a[0] = b[0];
      a[1] = b[1];
      a[2] = b[2];
    }
    return total;
  };
  // The handles are as long as gives the curve the neck's own length: longer handles, a longer curve.
  let lo = 0.02;
  let hi = 2.2;
  for (let i = 0; i < 9; i++) {
    const mid = 0.5 * (lo + hi);
    if (long(mid) < NECK_LONG) lo = mid;
    else hi = mid;
  }
  const h = 0.5 * (lo + hi);
  const way: V3 = [0, 0, 0];
  for (let i = 0; i <= NECK_RINGS; i++) {
    point(h, i / NECK_RINGS, a, way);
    const l = Math.hypot(way[0], way[1], way[2]) || 1;
    curve.p[i * 3] = a[0] + SHOULDER[0];
    curve.p[i * 3 + 1] = a[1] + SHOULDER[1];
    curve.p[i * 3 + 2] = a[2] + SHOULDER[2];
    curve.t[i * 3] = way[0] / l;
    curve.t[i * 3 + 1] = way[1] / l;
    curve.t[i * 3 + 2] = way[2] / l;
  }
}

/** Where the root of the tuft is in the place for a pose, and the way the neck ends there. */
export function headInPlace(p: Pose): { at: V3; way: V3 } {
  bend(p.head, p.headPitch, p.headYaw, p.rise);
  const n = NECK_RINGS * 3;
  const at = inPlace(p, [curve.p[n] as number, curve.p[n + 1] as number, curve.p[n + 2] as number]);
  frame(p, basis);
  const t: V3 = [curve.t[n] as number, curve.t[n + 1] as number, curve.t[n + 2] as number];
  return { at, way: [basis.f[0] * t[0] + basis.u[0] * t[1] + basis.l[0] * t[2], basis.f[1] * t[0] + basis.u[1] * t[1] + basis.l[1] * t[2], basis.f[2] * t[0] + basis.u[2] * t[1] + basis.l[2] * t[2]] };
}

const VERTEX = /* glsl */ `
attribute vec2 aPx;
attribute vec2 aHide;
attribute vec3 aMix;
uniform float uPool;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vPx;
varying vec2 vHide;
varying vec3 vMix;
varying float vUnder;
void main() {
  vec3 w = position;
  vUnder = 0.0;
#ifdef MIRROR
  // The mirror: the animal turned over about the water, laid on the water where the lens would see it.
  float y = 2.0 * uPool - w.y;
  float m = (cameraPosition.y - uPool - 0.012) / max(cameraPosition.y - y, 1e-3);
  vUnder = w.y - uPool;
  w = vec3(cameraPosition.xz + (w.xz - cameraPosition.xz) * m, uPool + 0.012).xzy;
#endif
  vWorld = w;
  vNormal = normal;
  vPx = aPx;
  vHide = aHide;
  vMix = aMix;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
uniform sampler2D tPic;
uniform sampler2D tCover;
uniform sampler2D tRelief;
uniform vec2 uSize;
uniform vec4 uFlank;
uniform float uPool;
uniform float uGrey;
uniform float uThrough;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vPx;
varying vec2 vHide;
varying vec3 vMix;
varying float vUnder;
// The slope of the picture's relief at a place of it, and the ways of the place that the picture's own x and y run on this surface.
vec3 lean(vec2 px, vec2 slope, vec3 n) {
  vec3 dpx = dFdx(vWorld);
  vec3 dpy = dFdy(vWorld);
  vec2 dux = dFdx(px);
  vec2 duy = dFdy(px);
  float det = dux.x * duy.y - dux.y * duy.x;
  if (abs(det) < 1e-9) return vec3(0.0);
  vec3 t = (dpx * duy.y - dpy * dux.y) / det;
  vec3 b = (dpy * dux.x - dpx * duy.x) / det;
  t -= n * dot(t, n);
  b -= n * dot(b, n);
  float lt = length(t);
  float lb = length(b);
  if (lt < 1e-9 || lb < 1e-9) return vec3(0.0);
  return t / lt * slope.x + b / lb * slope.y;
}
void main() {
  vec2 uv = vec2(vPx.x / uSize.x, 1.0 - vPx.y / uSize.y);
  float cover = texture2D(tCover, uv).r;
  bool sail = vMix.x > 1.5;
  if (sail && cover < 0.5) discard;
#if defined(FOLDED)
  // The lower edge of the folded sail, where the picture has the flank and the thigh in front of it: cut along its own line.
  float lower = vPx.x < 470.0 ? mix(374.0, 255.0, clamp((vPx.x - 240.0) / 230.0, 0.0, 1.0)) : mix(255.0, 193.0, clamp((vPx.x - 470.0) / 325.0, 0.0, 1.0));
  if (sail && vPx.x > 240.0 && vPx.y > lower + 5.0 * sin(vPx.x * 0.13)) discard;
  // Light comes through a sail where it stands free of the body: the hand of it behind the rump, most at its ends.
  float free = 1.0 - smoothstep(230.0, 520.0, vPx.x);
#else
  float free = 1.0;
#endif
  vec3 pic = texture2D(tPic, uv).rgb / max(cover, 0.4);
  // The flank laid round: mirrored at every repeat, so that it has no seam.
  vec2 hq = abs(fract(vHide / (2.0 * uFlank.zw)) * 2.0 - 1.0);
  vec2 hpx = uFlank.xy + hq * uFlank.zw;
  vec2 huv = vec2(hpx.x / uSize.x, 1.0 - hpx.y / uSize.y);
  vec3 hide = texture2D(tPic, huv).rgb;
  float thrown = sail ? 1.0 : clamp(vMix.x, 0.0, 1.0) * smoothstep(0.45, 0.9, cover);
  vec3 skinPic = mix(hide, pic, thrown);
  vec2 e = 2.5 / uSize;
  vec2 slopePic = vec2(texture2D(tRelief, uv + vec2(e.x, 0.0)).r - texture2D(tRelief, uv - vec2(e.x, 0.0)).r, texture2D(tRelief, uv - vec2(0.0, e.y)).r - texture2D(tRelief, uv + vec2(0.0, e.y)).r);
  vec2 slopeHide = vec2(texture2D(tRelief, huv + vec2(e.x, 0.0)).r - texture2D(tRelief, huv - vec2(e.x, 0.0)).r, texture2D(tRelief, huv - vec2(0.0, e.y)).r - texture2D(tRelief, huv + vec2(0.0, e.y)).r);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n0 = normalize(vNormal);
  if (dot(n0, v) < 0.0) n0 = -n0;
  vec3 n = normalize(n0 - 1.1 * (lean(vPx, slopePic, n0) * thrown + lean(hpx, slopeHide, n0) * (1.0 - thrown)));
  // Where the picture is amber it is the skin of a sail, and light comes through it.
  float amber = smoothstep(0.4, 0.62, (skinPic.r - skinPic.b) / max(skinPic.r, 0.05));
  float skin = sail ? mix(0.3 * free, 1.0, amber) * mix(0.35, 1.0, free) : 0.0;
  // A sail that lies folded and dry on a back is as pale as the hide: only one held up to the light keeps the picture's deep amber.
  vec3 pale = min(pow(skinPic, vec3(0.8)) * 1.22, vec3(0.94));
  vec3 albedo = (sail ? mix(pale, pow(skinPic, vec3(0.92)), 0.3 + 0.7 * uThrough) : pale) * vMix.z;
  albedo = mix(albedo, vec3(dot(albedo, vec3(0.3333))) * vec3(1.02, 0.98, 0.93), uGrey * (1.0 - skin * (1.0 - uGrey)));
  // And a folded, dry one has lost most of its colour.
  if (sail) albedo = mix(albedo, vec3(dot(albedo, vec3(0.3333))) * vec3(1.05, 0.98, 0.9), 0.5 * (1.0 - uThrough));
  // Wet where it stands in the pool, and a hand over it.
  float wet = 1.0 - smoothstep(uPool + 0.03, uPool + 0.45, vWorld.y);
  albedo *= 1.0 - 0.42 * wet;
  float occ = vMix.y * mix(0.7, 1.0, smoothstep(-0.6, 0.4, n.y));
  vec4 land = landAt(vWorld.xz);
#if defined(MIRROR)
  vec3 up = vWorld + vec3(0.0, 2.0 * vUnder, 0.0);
  vec3 col = rigShade(up, n, v, albedo, 0.6, occ);
  col += albedo * (skyIrradiance(vec3(0.0, 1.0, 0.0)) * 1.0 + uSunColour * (uSunDir.y * 0.2)) / 3.14159 * (0.75 - 0.25 * n.y) * vMix.y * (1.0 - 0.5 * skin);
  // Only standing water holds a mirror, and the water takes most of the light of what it shows.
  float water = smoothstep(0.0, 0.03, uPool - land.r) * smoothstep(-0.02, 0.05, vUnder);
  float glance = 1.0 - max(v.y, 0.0);
  float keep = water * mix(0.3, 0.72, pow(glance, 3.0)) * exp(-0.45 * vUnder) * (1.0 - uSolo);
  gl_FragColor = vec4(rigOut(col * 0.62) * keep, keep);
#else
  // The shade the animal lays on the ground under it (the contact map) is not laid on the animal: taken back out of the sky's light here.
  vec4 before = landAt(vWorld.xz + n.xz * 14.0);
  float own = 1.0 / max(1.0 - contactDrawn(vWorld) * smoothstep(4.0, 0.0, vWorld.y - before.r), 0.3);
  vec3 col = rigShade(vWorld, n, v, albedo, mix(0.62, 0.22, wet), occ * own);
  float sun = sunAt(vWorld, land);
  col -= albedo * uSunColour * (max(dot(n, uSunDir), 0.0) * sunAt(vWorld, before) * occ * (own - 1.0)) / 3.14159;
  // The wet flat and the pool send the sky back up at what stands over them.
  col += albedo * (skyIrradiance(vec3(0.0, 1.0, 0.0)) * 1.0 + uSunColour * (uSunDir.y * 0.2)) / 3.14159 * (0.75 - 0.25 * n.y) * vMix.y * (1.0 - 0.5 * skin);
  float far = smoothstep(30.0, 110.0, distance(cameraPosition, vWorld));
  col = mix(col, vec3(dot(col, vec3(0.3333))), 0.45 * far * skin);
  // The light that comes through a sail from the sun and the sky behind it.
  col += uThrough * mix(albedo, vec3(dot(albedo, vec3(0.3333))), 0.5 * (1.0 - amber)) * skin * mix(vec3(1.0, 0.74, 0.48), vec3(0.8, 0.78, 0.74), far) * (uSunColour * sun * (0.45 + 0.9 * max(dot(-n0, uSunDir), 0.0)) + skyIrradiance(-n0) * 0.7) / 3.14159 * (1.0 - 0.55 * far);
  // Against the light the sun rims it.
  float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);
  col += (albedo * 0.6 + 0.04) * uSunColour * rim * (0.25 + 0.75 * pow(max(dot(-v, uSunDir), 0.0), 2.0)) * 0.3 * sun;
  // And the low sun wraps a little way round what it lights: the edge turned to it is warm.
  col += albedo * uSunColour * (pow(clamp(dot(n, uSunDir) + 0.45, 0.0, 1.0), 2.0) * (0.12 + 0.5 * rim) * sun * vMix.y * (1.0 - skin)) / 3.14159;
  col *= 1.0 - 0.3 * far;
  gl_FragColor = vec4(rigOut(col), 1.0);
#endif
}`;

export interface BodyMaterials {
  body: THREE.ShaderMaterial;
  mirror: THREE.ShaderMaterial;
}
/** `sheet` is the picture the skin is thrown from (its cover and relief beside it) and `flank` the evenly lit patch of it laid where it cannot be thrown. */
export function bodyMaterials(ctx: Context, pool: number, grey: number, sheet = 'feeder-a', flank: [number, number, number, number] = FLANK, through = 1): BodyMaterials {
  const uniforms = {
    ...ctx.rig.uniforms,
    tPic: { value: ctx.assets.texture(`mat/${sheet}.jpg`, { kind: 'colour', repeat: false, anisotropy: 4 }) },
    tCover: { value: ctx.assets.texture(`mat/${sheet}-a.png`, { kind: 'data', repeat: false }) },
    tRelief: { value: ctx.assets.texture(`mat/${sheet}-h.png`, { kind: 'data', repeat: false }) },
    uSize: { value: new THREE.Vector2(...SIZE) },
    uFlank: { value: new THREE.Vector4(...flank) },
    uPool: { value: pool },
    uGrey: { value: grey },
    // How much of the light behind a sail comes through it: 1 where it is held up to the sun, less where it lies folded on a back.
    uThrough: { value: through },
  };
  const folded = sheet === 'feeder-a' ? { FOLDED: 1 } : {};
  const body = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, defines: { ...folded }, side: THREE.DoubleSide });
  const mirror = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, defines: { MIRROR: 1, ...folded }, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
  return { body, mirror };
}

const ringCos = (sides: number): Float32Array => Float32Array.from({ length: sides }, (_, k) => Math.cos((k / sides) * Math.PI * 2));
const ringSin = (sides: number): Float32Array => Float32Array.from({ length: sides }, (_, k) => Math.sin((k / sides) * Math.PI * 2));
const COS = { trunk: ringCos(SIDES), leg: ringCos(LEG_SIDES), toe: ringCos(TOE_SIDES), strand: ringCos(STRAND_SIDES) };
const SIN = { trunk: ringSin(SIDES), leg: ringSin(LEG_SIDES), toe: ringSin(TOE_SIDES), strand: ringSin(STRAND_SIDES) };

/** Many bodies, each set anew from a pose. */
export class Bodies {
  readonly mesh: THREE.Mesh;
  readonly mirror: THREE.Mesh;
  private readonly at: Float32Array;
  private readonly way: Float32Array;
  private readonly mix: Float32Array;
  private readonly attributes: THREE.BufferAttribute[];
  private readonly shown: Uint8Array;
  private n = 0;

  constructor(materials: BodyMaterials, readonly count: number) {
    const total = count * VERTS;
    this.at = new Float32Array(total * 3);
    this.way = new Float32Array(total * 3);
    this.mix = new Float32Array(total * 3);
    this.shown = new Uint8Array(count);
    const px = new Float32Array(total * 2);
    const hide = new Float32Array(total * 2);
    const index: number[] = [];
    const tube = (base: number, rings: number, sides: number): void => {
      for (let r = 0; r + 1 < rings; r++) {
        for (let k = 0; k < sides; k++) {
          const a = base + r * sides + k;
          const b = base + r * sides + ((k + 1) % sides);
          index.push(a, b, a + sides, b, b + sides, a + sides);
        }
      }
    };
    for (let i = 0; i < count; i++) {
      const v0 = i * VERTS;
      tube(v0 + AT.trunk, RINGS, SIDES);
      for (let leg = 0; leg < 2; leg++) {
        tube(v0 + AT.legs + leg * LEG_VERTS, LEG_RINGS, LEG_SIDES);
        for (let toe = 0; toe < TOES.length; toe++) tube(v0 + AT.toes + leg * TOE_VERTS + toe * TOE_RINGS * TOE_SIDES, TOE_RINGS, TOE_SIDES);
      }
      for (let s = 0; s < STRANDS; s++) tube(v0 + AT.tuft + s * STRAND_VERTS, STRAND_RINGS, STRAND_SIDES);
      for (let side = 0; side < 2; side++) for (const k of sail.index) index.push(v0 + AT.sails + side * sail.count + k);
      this.still(i, px, hide);
    }
    const geometry = new THREE.BufferGeometry();
    const attribute = (name: string, data: Float32Array, size: number, moves: boolean): THREE.BufferAttribute => {
      const a = new THREE.BufferAttribute(data, size);
      if (moves) a.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(name, a);
      return a;
    };
    this.attributes = [attribute('position', this.at, 3, true), attribute('normal', this.way, 3, true), attribute('aMix', this.mix, 3, true)];
    attribute('aPx', px, 2, false);
    attribute('aHide', hide, 2, false);
    geometry.setIndex(index);
    this.mesh = new THREE.Mesh(geometry, materials.body);
    this.mesh.frustumCulled = false;
    this.mirror = new THREE.Mesh(geometry, materials.mirror);
    this.mirror.frustumCulled = false;
    this.mirror.renderOrder = 3;
    for (let i = 0; i < count; i++) this.fold(i);
  }

  /** What of a body never changes: where each vertex reads the picture, how much of it the picture may be, how dark its own form makes it. */
  private still(i: number, px: Float32Array, hide: Float32Array): void {
    const v0 = i * VERTS;
    const set = (v: number, x: number, y: number, hx: number, hy: number, thrown: number, occ: number): void => {
      px[v * 2] = x;
      px[v * 2 + 1] = y;
      hide[v * 2] = hx;
      hide[v * 2 + 1] = hy;
      this.mix[v * 3] = thrown;
      this.mix[v * 3 + 1] = occ;
      this.mix[v * 3 + 2] = 1;
    };
    for (let r = 0; r < RINGS; r++) {
      const ring = (r < TORSO_RINGS ? torso[r] : neck[r - TORSO_RINGS]) as (typeof torso)[number];
      const s = r < TORSO_RINGS ? ring.s : torsoLong + ring.s;
      for (let k = 0; k < SIDES; k++) {
        const c = COS.trunk[k] as number;
        const sn = SIN.trunk[k] as number;
        // Read a little inside the outline, so that the edge of the body never reads the black the picture stands on.
        const x = ring.x + ring.ty * ring.r * c * 0.93;
        const y = ring.y - ring.tx * ring.r * c * 0.93;
        const under = r < TORSO_RINGS ? 1 - 0.25 * smooth(0.1, 1, -c) : 1 - 0.12 * smooth(0.2, 1, -c);
        set(v0 + AT.trunk + r * SIDES + k, x, y, s * 0.8, (k / SIDES) * 440, smooth(0.25, 0.7, Math.abs(sn)), under);
      }
    }
    for (let leg = 0; leg < 2; leg++) {
      for (let r = 0; r < LEG_RINGS; r++) {
        const upper = r < THIGH.length;
        const lower = r > THIGH.length;
        const [part, wide] = upper ? (THIGH[r] as [number, number]) : lower ? (SHANK[r - THIGH.length - 1] as [number, number]) : [1, JOINT_WIDE];
        const from = lower ? LEG.joint : LEG.hip;
        const to = lower ? LEG.ankle : LEG.joint;
        const l = Math.hypot(to[0] - from[0], to[1] - from[1]);
        const tx = (to[0] - from[0]) / l;
        const ty = (to[1] - from[1]) / l;
        // The side of the leg that bends back is the left of it in the picture.
        const ox = ty > 0 ? -ty : ty;
        const oy = ty > 0 ? tx : -tx;
        for (let k = 0; k < LEG_SIDES; k++) {
          const c = COS.leg[k] as number;
          const x = from[0] + (to[0] - from[0]) * part + ox * wide * c * 0.82;
          const y = from[1] + (to[1] - from[1]) * part + oy * wide * c * 0.82;
          const high = lower ? 1 : 0.84 + 0.16 * part;
          set(v0 + AT.legs + leg * LEG_VERTS + r * LEG_SIDES + k, x, y, (lower ? 210 : 0) + part * l * 0.8, (k / LEG_SIDES) * 220, smooth(0.2, 0.65, Math.abs(SIN.leg[k] as number)), high);
        }
      }
      for (let toe = 0; toe < TOES.length; toe++) {
        for (let r = 0; r < TOE_RINGS; r++) {
          for (let k = 0; k < TOE_SIDES; k++) set(v0 + AT.toes + leg * TOE_VERTS + (toe * TOE_RINGS + r) * TOE_SIDES + k, 400 + r * 14, 890, toe * 37 + r * 22, k * 18, 0, 0.9);
        }
      }
    }
    for (let s = 0; s < STRANDS; s++) {
      for (let r = 0; r < STRAND_RINGS; r++) {
        for (let k = 0; k < STRAND_SIDES; k++) set(v0 + AT.tuft + (s * STRAND_RINGS + r) * STRAND_SIDES + k, 1100, 640, s * 53 + r * 30, k * 16 + s * 11, 0, 0.82 + 0.18 * hash1(s + 0.5));
      }
    }
    for (let side = 0; side < 2; side++) {
      for (let k = 0; k < sail.count; k++) set(v0 + AT.sails + side * sail.count + k, sail.points[k * 6] as number, sail.points[k * 6 + 1] as number, 0, 0, 2, 1);
    }
  }

  /** Only the first `many` of them are drawn from here on: those after them cost nothing. */
  draw(many: number): void {
    const each = (this.mesh.geometry.index?.count ?? 0) / this.count;
    this.mesh.geometry.setDrawRange(0, Math.min(this.count, Math.max(0, many)) * each);
  }

  private fold(i: number): void {
    const from = i * VERTS * 3;
    this.at.fill(0, from, from + VERTS * 3);
    for (let v = 0; v < VERTS; v++) this.at[from + v * 3 + 1] = -500;
    this.shown[i] = 0;
  }

  hide(i: number): void {
    if (this.shown[i]) this.fold(i);
  }

  private ring(x: number, y: number, z: number, ux: number, uy: number, uz: number, sx: number, sy: number, sz: number, high: number, wide: number, sides: number, cos: Float32Array, sin: Float32Array): void {
    const at = this.at;
    const way = this.way;
    let n = this.n;
    for (let k = 0; k < sides; k++) {
      const c = cos[k] as number;
      const s = sin[k] as number;
      at[n] = x + ux * high * c + sx * wide * s;
      at[n + 1] = y + uy * high * c + sy * wide * s;
      at[n + 2] = z + uz * high * c + sz * wide * s;
      // An oval faces the way of its own slope.
      const nu = c * wide;
      const ns = s * high;
      const l = Math.hypot(nu, ns) || 1;
      way[n] = (ux * nu + sx * ns) / l;
      way[n + 1] = (uy * nu + sy * ns) / l;
      way[n + 2] = (uz * nu + sz * ns) / l;
      n += 3;
    }
    this.n = n;
  }

  put(i: number, p: Pose): void {
    this.shown[i] = 1;
    const v0 = i * VERTS;
    const size = p.size;
    frame(p, basis);
    const f = basis.f;
    const u = basis.u;
    const l = basis.l;
    const out = (x: number, y: number, z: number): V3 => [p.x + (f[0] * x + u[0] * y + l[0] * z) * size, p.y + (f[1] * x + u[1] * y + l[1] * z) * size, p.z + (f[2] * x + u[2] * y + l[2] * z) * size];
    const turn = (x: number, y: number, z: number): V3 => [f[0] * x + u[0] * y + l[0] * z, f[1] * x + u[1] * y + l[1] * z, f[2] * x + u[2] * y + l[2] * z];
    for (let v = 0; v < VERTS; v++) this.mix[(v0 + v) * 3 + 2] = p.tone;

    // ---- The trunk and the neck ----
    this.n = (v0 + AT.trunk) * 3;
    for (let r = 0; r < TORSO_RINGS; r++) {
      const ring = torso[r] as (typeof torso)[number];
      const c = out((ring.x - HIPS[0]) / PX, (HIPS[1] - ring.y) / PX, 0);
      const up = turn(ring.ty, ring.tx, 0);
      this.ring(c[0], c[1], c[2], up[0], up[1], up[2], l[0], l[1], l[2], (ring.r / PX) * size, ((ring.r * (WIDE[0] as number)) / PX) * size, SIDES, COS.trunk, SIN.trunk);
    }
    bend(p.head, p.headPitch, p.headYaw, p.rise);
    // The ring keeps its top as the neck bends: carried along the curve from the shoulder, never spun about it.
    let ux = (torso[TORSO_RINGS - 1] as (typeof torso)[number]).ty;
    let uy = (torso[TORSO_RINGS - 1] as (typeof torso)[number]).tx;
    let uz = 0;
    let tip: V3 = [0, 0, 0];
    let tipWay: V3 = [0, 0, 1];
    let tipUp: V3 = [0, 1, 0];
    for (let r = 0; r < NECK_RINGS; r++) {
      const ring = neck[r] as (typeof neck)[number];
      const k = (r + 1) * 3;
      const tx = curve.t[k] as number;
      const ty = curve.t[k + 1] as number;
      const tz = curve.t[k + 2] as number;
      const d = ux * tx + uy * ty + uz * tz;
      ux -= tx * d;
      uy -= ty * d;
      uz -= tz * d;
      const ul = Math.hypot(ux, uy, uz) || 1;
      ux /= ul;
      uy /= ul;
      uz /= ul;
      const c = out(curve.p[k] as number, curve.p[k + 1] as number, curve.p[k + 2] as number);
      const t = turn(tx, ty, tz);
      const up = turn(ux, uy, uz);
      const side: V3 = [t[1] * up[2] - t[2] * up[1], t[2] * up[0] - t[0] * up[2], t[0] * up[1] - t[1] * up[0]];
      const wide = (WIDE[0] as number) + ((WIDE[1] as number) - (WIDE[0] as number)) * smooth(0, 0.4, (r + 1) / NECK_RINGS);
      this.ring(c[0], c[1], c[2], up[0], up[1], up[2], side[0], side[1], side[2], (ring.r / PX) * size, ((ring.r * wide) / PX) * size, SIDES, COS.trunk, SIN.trunk);
      if (r === NECK_RINGS - 2) {
        tip = c;
        tipWay = t;
        tipUp = up;
      }
    }

    // ---- The legs: hip, the joint that bends back, ankle ----
    const back: V3 = [-Math.sin(p.yaw), 0, -Math.cos(p.yaw)];
    for (let leg = 0; leg < 2; leg++) {
      const foot = p.feet[leg] as Foot;
      const hip = out(HIP[0], HIP[1], leg === 0 ? HIP[2] : -HIP[2]);
      const l1 = BONES.thigh * size;
      const l2 = BONES.shank * size;
      let ax = foot.x - hip[0];
      let ay = foot.y - hip[1];
      let az = foot.z - hip[2];
      let far = Math.hypot(ax, ay, az) || 1e-6;
      const most = (l1 + l2) * 0.999;
      const least = Math.abs(l2 - l1) * 1.05;
      const want = Math.min(most, Math.max(least, far));
      ax *= want / far;
      ay *= want / far;
      az *= want / far;
      far = want;
      const hx = ax / far;
      const hy = ay / far;
      const hz = az / far;
      // The joint lies off the line from hip to ankle, behind it.
      const bd = back[0] * hx + back[1] * hy + back[2] * hz;
      let bx = back[0] - hx * bd;
      let by = back[1] - hy * bd;
      let bz = back[2] - hz * bd;
      const bl = Math.hypot(bx, by, bz) || 1;
      bx /= bl;
      by /= bl;
      bz /= bl;
      const a = (l1 * l1 - l2 * l2 + far * far) / (2 * far);
      const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      const jx = hip[0] + hx * a + bx * h;
      const jy = hip[1] + hy * a + by * h;
      const jz = hip[2] + hz * a + bz * h;
      const ex = hip[0] + ax;
      const ey = hip[1] + ay;
      const ez = hip[2] + az;
      this.n = (v0 + AT.legs + leg * LEG_VERTS) * 3;
      for (let r = 0; r < LEG_RINGS; r++) {
        const upper = r < THIGH.length;
        const lower = r > THIGH.length;
        const [part, wide] = upper ? (THIGH[r] as [number, number]) : lower ? (SHANK[r - THIGH.length - 1] as [number, number]) : [1, JOINT_WIDE];
        const x0 = lower ? jx : hip[0];
        const y0 = lower ? jy : hip[1];
        const z0 = lower ? jz : hip[2];
        const x1 = lower ? ex : jx;
        const y1 = lower ? ey : jy;
        const z1 = lower ? ez : jz;
        // At the joint the ring lies across both bones.
        let tx = upper || lower ? x1 - x0 : (jx - hip[0]) / l1 + (ex - jx) / l2;
        let ty = upper || lower ? y1 - y0 : (jy - hip[1]) / l1 + (ey - jy) / l2;
        let tz = upper || lower ? z1 - z0 : (jz - hip[2]) / l1 + (ez - jz) / l2;
        const tl = Math.hypot(tx, ty, tz) || 1;
        tx /= tl;
        ty /= tl;
        tz /= tl;
        const d = bx * tx + by * ty + bz * tz;
        let px = bx - tx * d;
        let py = by - ty * d;
        let pz = bz - tz * d;
        const pl = Math.hypot(px, py, pz) || 1;
        px /= pl;
        py /= pl;
        pz /= pl;
        const sx = ty * pz - tz * py;
        const sy = tz * px - tx * pz;
        const sz = tx * py - ty * px;
        const w = (wide / PX) * size;
        this.ring(x0 + (x1 - x0) * part, y0 + (y1 - y0) * part, z0 + (z1 - z0) * part, px, py, pz, sx, sy, sz, w, w, LEG_SIDES, COS.leg, SIN.leg);
      }
      // The foot: three toes ahead and one behind, flat where it stands, hung where it is carried.
      this.n = (v0 + AT.toes + leg * TOE_VERTS) * 3;
      for (let toe = 0; toe < TOES.length; toe++) {
        const [off, long] = TOES[toe] as [number, number];
        const rear = toe === TOES.length - 1;
        const droop = rear ? -0.4 * foot.droop : foot.droop;
        const hx2 = Math.sin(foot.yaw + off);
        const hz2 = Math.cos(foot.yaw + off);
        const tx = hx2 * Math.cos(droop);
        const ty = -Math.sin(droop);
        const tz = hz2 * Math.cos(droop);
        // Its top: square to the toe, upward.
        const ux2 = hx2 * Math.sin(droop);
        const uy2 = Math.cos(droop);
        const uz2 = hz2 * Math.sin(droop);
        const sx = ty * uz2 - tz * uy2;
        const sy = tz * ux2 - tx * uz2;
        const sz = tx * uy2 - ty * ux2;
        for (let r = 0; r < TOE_RINGS; r++) {
          const part = [0, 0.4, 0.82, 1][r] as number;
          const wide = (([10.5, 6.8, 4.2, 0.8][r] as number) / PX) * size;
          // The toe comes down from the ankle to the ground and ends in a claw.
          const drop = (BONES.ankle - 0.014) * size * ([0.25, 0.9, 1, 1.25][r] as number);
          const far2 = long * size * part;
          this.ring(ex + tx * far2 - ux2 * drop, ey + ty * far2 - uy2 * drop, ez + tz * far2 - uz2 * drop, ux2, uy2, uz2, sx, sy, sz, wide * 0.8, wide, TOE_SIDES, COS.toe, SIN.toe);
        }
      }
    }

    // ---- The tuft: strands from the end of the neck, which fall, trail what moves them, and lie on what they reach ----
    const tipSide: V3 = [tipWay[1] * tipUp[2] - tipWay[2] * tipUp[1], tipWay[2] * tipUp[0] - tipWay[0] * tipUp[2], tipWay[0] * tipUp[1] - tipWay[1] * tipUp[0]];
    const root = ((neck[NECK_RINGS - 2] as (typeof neck)[number]).r / PX) * size;
    this.n = (v0 + AT.tuft) * 3;
    for (let s = 0; s < STRANDS; s++) {
      const k1 = hash1(s * 3.1 + p.seed * 91);
      const k2 = hash1(s * 7.7 + p.seed * 53 + 2);
      const k3 = hash1(s * 1.3 + p.seed * 17 + 5);
      const round = ((s + 0.5 * k1) / STRANDS) * Math.PI * 2;
      const off = 0.25 + 0.6 * Math.sqrt(k2);
      const ox = (tipUp[0] * Math.cos(round) + tipSide[0] * Math.sin(round)) * off;
      const oy = (tipUp[1] * Math.cos(round) + tipSide[1] * Math.sin(round)) * off;
      const oz = (tipUp[2] * Math.cos(round) + tipSide[2] * Math.sin(round)) * off;
      let x = tip[0] + ox * root;
      let y = tip[1] + oy * root;
      let z = tip[2] + oz * root;
      // It leaves along the neck, spread, and gives way to its own weight further down.
      let dx = tipWay[0] + ox * 1.05;
      let dy = tipWay[1] + oy * 1.05;
      let dz = tipWay[2] + oz * 1.05;
      const dl = Math.hypot(dx, dy, dz) || 1;
      dx /= dl;
      dy /= dl;
      dz /= dl;
      const long = (1.2 + 0.6 * k3) * size * p.tuft;
      const each = long / (STRAND_RINGS - 1);
      const thick = ((9.5 - 3.5 * k2) / PX) * size;
      // Each curls its own way as it hangs: a slow turn about its own line, and in towards the animal at its end.
      const curl = 0.5 + 1.1 * k1;
      const curlAt = k3 * 6.2832;
      const lean2 = 0.4 + 0.35 * k2;
      const rate = (r: number): number => (p.beat > 0 ? Math.max(1, Math.round(r / p.beat)) * p.beat : r);
      const sway = 0.1 * Math.sin(p.clock * rate(0.9 + 0.8 * k1) + k2 * 40) + 0.5 * p.shake * Math.sin(p.clock * rate(15 + 5 * k3) + k1 * 30);
      const swayZ = 0.1 * Math.sin(p.clock * rate(0.7 + 0.9 * k3) + k1 * 40) + 0.5 * p.shake * Math.sin(p.clock * rate(13 + 6 * k1) + k3 * 30);
      let wx = dx;
      let wy = dy;
      let wz = dz;
      for (let r = 0; r < STRAND_RINGS; r++) {
        const part = r / (STRAND_RINGS - 1);
        if (r > 0) {
          const fall = 0.06 + 0.3 * part;
          const ca = lean2 * Math.cos(curlAt + part * curl * 6.2832) * (0.3 + 0.7 * part);
          const cb = lean2 * Math.sin(curlAt + part * curl * 6.2832) * (0.3 + 0.7 * part);
          const inward = 0.3 * part * part;
          wx = wx + (ox * 0.1 + tipSide[0] * (sway * part + ca) + tipUp[0] * (swayZ * part + cb) - tipWay[0] * inward + p.trail[0] * part) * 0.6;
          wy = wy - fall + p.trail[1] * part * 0.6;
          wz = wz + (oz * 0.1 + tipSide[2] * (sway * part + ca) + tipUp[2] * (swayZ * part + cb) - tipWay[2] * inward + p.trail[2] * part) * 0.6;
          const wl = Math.hypot(wx, wy, wz) || 1;
          wx /= wl;
          wy /= wl;
          wz /= wl;
          x += wx * each;
          y += wy * each;
          z += wz * each;
          // On the bed it lies, and runs on the way it was going.
          const lie = p.floor + thick * 0.8 + 0.004 * (s % 5);
          if (y < lie) {
            y = lie;
            wy = Math.max(wy, -0.05);
            // And is spread there, out from the middle of the tuft.
            wx += ox * 0.5;
            wz += oz * 0.5;
          }
        }
        let px = tipSide[1] * wz - tipSide[2] * wy;
        let py = tipSide[2] * wx - tipSide[0] * wz;
        let pz = tipSide[0] * wy - tipSide[1] * wx;
        const pl = Math.hypot(px, py, pz) || 1;
        px /= pl;
        py /= pl;
        pz /= pl;
        const sx = wy * pz - wz * py;
        const sy = wz * px - wx * pz;
        const sz = wx * py - wy * px;
        const w = thick * (1 - 0.7 * part) * (r === STRAND_RINGS - 1 ? 0.3 : 1);
        this.ring(x, y, z, px, py, pz, sx, sy, sz, w, w, STRAND_SIDES, COS.strand, SIN.strand);
      }
    }

    // ---- The folded sails ----
    const wx0 = (WRIST[0] - HIPS[0]) / PX;
    const wy0 = (HIPS[1] - WRIST[1]) / PX;
    let n = (v0 + AT.sails) * 3;
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? 1 : -1;
      for (let k = 0; k < sail.count; k++) {
        const x = ((sail.points[k * 6] as number) - HIPS[0]) / PX - wx0;
        const y = (HIPS[1] - (sail.points[k * 6 + 1] as number)) / PX - wy0;
        const z = (sail.points[k * 6 + 2] as number) * sign;
        // Lifted about the wrist: the further out along the sail, the more.
        const a = -p.sail * (0.6 + 0.5 * Math.min(1, Math.hypot(x, y) / 2.4));
        const c = Math.cos(a);
        const s = Math.sin(a);
        const at = out(wx0 + x * c - y * s, wy0 + x * s + y * c, z * (1 + 0.6 * p.sail));
        const nx = sail.points[k * 6 + 3] as number;
        const ny = sail.points[k * 6 + 4] as number;
        const nz = (sail.points[k * 6 + 5] as number) * sign;
        const w = turn(nx * c - ny * s, nx * s + ny * c, nz);
        this.at[n] = at[0];
        this.at[n + 1] = at[1];
        this.at[n + 2] = at[2];
        this.way[n] = w[0];
        this.way[n + 1] = w[1];
        this.way[n + 2] = w[2];
        n += 3;
      }
    }
  }

  commit(): void {
    for (const a of this.attributes) a.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
  }
}
