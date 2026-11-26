// The stands of the wide view. From the height of the first shot a stalk alone on bare salt is a stick with a ball on it, however it is drawn.
// So the plain grows in stands: round every group of stalks and along the brine's edge a thicket of stems of every age with leaf hanging down
// them, an understorey of red tufts, a creeping mat on the wet ground at their feet, dead canes down in the brine, and far off brush and stains
// in place of stems. All of it follows the water, and the flat between is bare.
// STAGED by shot: it is drawn in the wide shot only (index.ts), so the keys of the other shots keep what their approved pictures have.
import * as THREE from 'three';
import { BEASTS, DEAD, TAU, distToSegment, rel } from '../shared/anchors';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

/** One stalk that no lens stands among, as its shaders are given it (palms.ts). */
export interface Wild {
  x: number; y: number; z: number; h: number;
  dx: number; dz: number; lean: number; R: number;
  kind: number; phase: number; low: number; seed: number;
  bowA: number; bowM: number; kinkT: number; kinkM: number;
  swayA: number; swayM: number; kinkA: number; rate: number;
  /** 0 young to 1 old; 2 dead. */
  age: number; stain: number; uvo: number;
  /** How much the air moves it: 0 for one that lies. */
  quiver: number;
  fork: [number, number, number]; collar: number; bare?: boolean;
  cards: number[][];
  foot: boolean;
}

/** A point of a stalk's line in still air, as the shader's spine() has it. */
export function lineAt(w: Wild, t: number): [number, number, number] {
  const A = [w.dx * Math.sin(w.lean), Math.cos(w.lean), w.dz * Math.sin(w.lean)];
  const U = [w.dx * Math.cos(w.lean), -Math.sin(w.lean), w.dz * Math.cos(w.lean)];
  const W = [-w.dz, 0, w.dx];
  const base = [w.x + w.fork[0], w.y + w.fork[1], w.z + w.fork[2]];
  const at = (c: number): number => {
    const dir = (angle: number): number => (U[c] as number) * Math.cos(angle) + (W[c] as number) * Math.sin(angle);
    return (base[c] as number) + w.h * ((A[c] as number) * t + dir(w.bowA) * w.bowM * t * t + dir(w.swayA) * w.swayM * Math.sin(t * 4.7) * t + dir(w.kinkA) * w.kinkM * Math.max(t - w.kinkT, 0));
  };
  return [at(0), at(1), at(2)];
}

// A tuft: three upright cards of the photographed lock that cross at its foot. aTuft: foot and height. aTuft2: width, yaw, how far the cards
// lean apart, seed. aTuft3: tone, how dead, 1 for brush seen far off, phase.
const TUFT_VERTEX = /* glsl */ `
attribute vec4 aTuft;
attribute vec4 aTuft2;
attribute vec4 aTuft3;
uniform float uSeconds;
uniform float uMirror;
varying vec3 vWorld;
varying vec3 vSide;
varying vec4 vUv;
varying vec4 vTone;
void main() {
  float card = position.z;
  float ang = aTuft2.y + card * 1.0472;
  vec3 side = vec3(cos(ang), 0.0, sin(ang));
  vec3 across = vec3(-sin(ang), 0.0, cos(ang));
  // Far off a tuft is one card that stands square to the lens and turns with it: it has no edge to show.
  bool one = aTuft2.z < 0.0;
  if (one) {
    vec2 to = normalize(cameraPosition.xz - aTuft.xz);
    side = vec3(-to.y, 0.0, to.x);
    across = vec3(to.x, 0.0, to.y);
  }
  vec2 q = vec2(position.x + 0.5, position.y);
  float tilt = abs(aTuft2.z) * (card - 1.0);
  vec3 rise = normalize(vec3(0.0, 1.0, 0.0) + across * tilt);
  float reach = clamp((q.y - 0.15) / 0.8, 0.0, 1.0);
  vec3 p = aTuft.xyz + side * ((q.x - 0.5) * aTuft2.x) + rise * ((q.y - 0.1) * aTuft.w);
  float gust = sin(uSeconds * 1.3 + aTuft3.w + dot(aTuft.xz, vec2(0.21, 0.17))) + 0.5 * sin(uSeconds * 2.7 + aTuft3.w * 1.7);
  p += vec3(0.8, 0.0, 0.6) * (0.035 * aTuft.w * reach * reach * gust) + side * (0.012 * aTuft.w * reach * sin(uSeconds * 2.2 + aTuft2.w * 40.0 + q.x * 9.0));
  if (one && card > 0.5) p = aTuft.xyz;
  vWorld = p;
  vSide = side;
  float flip = fract(aTuft2.w * 7.3 + card * 0.37) > 0.5 ? 1.0 : 0.0;
  vUv = vec4(mix(q.x, 1.0 - q.x, flip), q.y, q.x - 0.5, aTuft2.w + card * 0.31);
  vTone = vec4(aTuft3.x, aTuft3.y, aTuft3.z, aTuft.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  // The brine is rippled: a tuft is not told in it, and is not drawn there.
  if (uMirror > 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`;

const TUFT_CUT = /* glsl */ `
  // Every read of a picture comes before any discard: the software renderer leaves the slopes of a dropped pixel's neighbours undefined.
  vec4 lk = texture2D(tLock, vUv.xy);
  float far = distance(cameraPosition, vWorld);
  float away = smoothstep(6.0, 60.0, far);
  float cover = smoothstep(0.03, 0.2, max(lk.r, max(lk.g, lk.b))) * smoothstep(0.1, 0.13, vUv.y);
  // Far off a strand is thinner than a pixel: it is kept at a lower cover, or the tuft would thin to nothing. Brush is a mass and keeps more.
  // Each clump of brush has its own top: high at one end, eaten down at the other.
  float top = 0.5 + 0.5 * (0.5 + 0.5 * sin(vUv.x * 5.0 + vUv.w * 50.0) * sin(vUv.x * 13.0 + vUv.w * 90.0));
  cover *= 1.0 - vTone.z * smoothstep(top - 0.04, top, vUv.y);
  if (cover < mix(0.5, mix(0.2, 0.1, vTone.z), away)) discard;
`;

const TUFT_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vSide;
varying vec4 vUv;
varying vec4 vTone;
uniform sampler2D tLock;
${RIG_GLSL}
void main() {
${TUFT_CUT}
  if (uMirror > 0.5 && vWorld.y < -0.015) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  float luma = max(lk.r, max(lk.g, lk.b));
  luma = mix(luma, max(luma, 0.42), smoothstep(0.15, 0.7, away));
  vec3 hue = lk.rgb / max(luma, 0.03);
  vec3 albedo = mix(vec3(dot(hue, vec3(0.3, 0.5, 0.2))), hue, 0.92) * (0.03 + 0.25 * smoothstep(0.02, 0.5, luma));
  // Each tuft its own red; a dead one has gone to brown paper, and the tips of the living dry pale.
  float own = fract(vUv.w * 13.3);
  albedo *= mix(vec3(0.5, 0.42, 0.5), vec3(0.95, 0.6, 0.6), vTone.x);
  albedo = mix(albedo, mix(vec3(0.08, 0.04, 0.032), vec3(0.15, 0.09, 0.066), own) * (0.3 + 1.0 * smoothstep(0.02, 0.6, luma)), vTone.y);
  albedo = mix(albedo, albedo * 1.3 + vec3(0.03, 0.022, 0.02), (1.0 - vTone.y) * 0.45 * smoothstep(0.6, 0.95, vUv.y) * step(0.5, own));
  vec3 n = normalize(vSide * (vUv.z * 1.2) + vec3(0.0, 0.7, 0.0) + v * 0.6);
  // Dark at the foot, where the strands stand close and wet; brush is a mass that shades itself.
  float lift = vWorld.y - vTone.w;
  float occ = mix(0.3, 1.0, smoothstep(0.1, 0.62, vUv.y)) * mix(1.0, 0.72, vTone.z);
  albedo = mix(albedo * vec3(0.5, 0.3, 0.28), albedo, smoothstep(0.02, 0.14, lift));
  vec3 c = rigShade(vWorld, n, v, albedo, mix(0.6, 0.92, vTone.y), occ);
  c += (1.0 - vTone.y) * albedo * skyIrradiance(-n) / 3.14159 * 0.3 * occ * skyOpen(vWorld);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const TUFT_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vSide;
varying vec4 vUv;
varying vec4 vTone;
uniform sampler2D tLock;
void main() {
${TUFT_CUT}
  gl_FragColor = vec4(0.0);
}`;

// The creeping mat: a low ragged cushion that lies on the ground as the land map has it. aMat: centre, the level of the brine's edge there
// and its radius. aMat2: height, seed, tone, how dead.
const MAT_VERTEX = /* glsl */ `
attribute vec4 aMat;
attribute vec4 aMat2;
uniform sampler2D tLand;
uniform vec4 uLandRect;
uniform float uMirror;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vMat;
varying vec2 vAt;
void main() {
  float a = position.x;
  float r = position.y;
  float s = aMat2.y;
  float lobe = 1.0 + 0.3 * sin(a * 2.0 + s * 9.0) + 0.2 * sin(a * 3.0 + s * 23.0) + 0.12 * sin(a * 5.0 + s * 41.0);
  vec2 xz = aMat.xz + vec2(cos(a), sin(a)) * (r * aMat.w * lobe);
  vec2 uv = (xz - uLandRect.xy) * uLandRect.zw;
  float ground = aMat.y;
  if (min(min(uv.x, uv.y), min(1.0 - uv.x, 1.0 - uv.y)) > 0.0) ground = texture2D(tLand, uv).r;
  float dome = aMat2.x * pow(max(1.0 - r * r, 0.0), 0.6);
  float lumps = 0.35 * aMat2.x * sin(xz.x * 9.0 + s * 17.0) * sin(xz.y * 7.7 + s * 5.0) * (1.0 - r);
  vec3 p = vec3(xz.x, max(ground, 0.0) + dome + lumps + mix(0.02, -0.04, smoothstep(0.75, 1.0, r)), xz.y);
  float slope = clamp(aMat2.x / max(aMat.w, 0.05) * 1.6 * r, 0.0, 1.2);
  vNormal = normalize(vec3(cos(a) * slope, 1.0, sin(a) * slope));
  vWorld = p;
  // It does not float: where the ground under it is below the brine it reads as past its edge, and is cut.
  vMat = vec4(r + 2.0 * (1.0 - smoothstep(-0.035, -0.005, ground)), s, aMat2.z, aMat2.w);
  vAt = vec2(a, aMat.w);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  if (uMirror > 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`;

const MAT_CUT = /* glsl */ `
  // A ragged edge: the mat reaches further on one side than on the next, in tongues.
  float tongue = 0.55 * vnoise(vec2(vAt.x * 1.9 + vMat.y * 30.0, vMat.y * 11.0)) + 0.45 * vnoise(vWorld.xz * (6.0 / max(vAt.y, 0.3)) + vMat.y * 7.0);
  if (vMat.x > 0.52 + 0.5 * tongue) discard;
`;

const MAT_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vMat;
varying vec2 vAt;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
${MAT_CUT}
  if (uMirror > 0.5 && vWorld.y < -0.015) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  float far = distance(cameraPosition, vWorld);
  // Fine grain near, none of it far off, where it would be smaller than a pixel and crawl.
  float fine = 1.0 - smoothstep(18.0, 90.0, far);
  float patchy = 0.65 * vnoise(vWorld.xz * 1.9 + vMat.y * 31.0) + 0.35 * vnoise(vWorld.xz * 6.1 + vMat.y * 17.0);
  float knots = mix(0.5, vnoise(vWorld.xz * 23.0), fine);
  float grain = mix(0.5, vnoise(vWorld.xz * 170.0 + 3.0), fine * (1.0 - smoothstep(6.0, 30.0, far)));
  vec3 dark = vec3(0.04, 0.011, 0.012);
  vec3 red = mix(vec3(0.085, 0.011, 0.016), vec3(0.16, 0.021, 0.027), vMat.z);
  vec3 albedo = mix(dark, red, smoothstep(0.2, 0.85, 0.6 * patchy + 0.25 * knots + 0.15 * grain)) * (0.7 + 0.6 * grain);
  // Some of it has died back to brown, and the salt has dried on the highest of it.
  albedo = mix(albedo, vec3(0.13, 0.078, 0.06) * (0.6 + 0.8 * knots), vMat.w * smoothstep(0.42, 0.6, vnoise(vWorld.xz * 1.7 + vMat.y * 5.0)));
  albedo = mix(albedo, vec3(0.42, 0.36, 0.34), 0.35 * smoothstep(0.62, 0.8, patchy) * (1.0 - smoothstep(0.3, 0.8, vMat.x)));
  // Its edge lies wet on the ground.
  float wet = smoothstep(0.45, 0.95, vMat.x);
  albedo = mix(albedo, albedo * vec3(0.55, 0.36, 0.34), wet);
  vec3 n = normalize(vNormal + vec3(knots - 0.5, 0.0, grain - 0.5) * 0.5 * fine);
  float occ = 0.55 + 0.45 * smoothstep(0.25, 0.75, 0.5 * patchy + 0.5 * knots);
  vec3 c = rigShade(vWorld, n, v, albedo, mix(0.88, 0.45, wet), occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const MAT_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vMat;
varying vec2 vAt;
${NOISE_GLSL}
void main() {
${MAT_CUT}
  gl_FragColor = vec4(0.0);
}`;

function instancedOf(base: THREE.BufferGeometry, count: number, attributes: Record<string, number[]>): THREE.InstancedBufferGeometry {
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  for (const name of Object.keys(base.attributes)) g.setAttribute(name, base.attributes[name] as THREE.BufferAttribute);
  for (const name of Object.keys(attributes)) g.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(attributes[name] as number[]), 4));
  g.instanceCount = count;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4000);
  return g;
}

export interface Stands {
  /** Stems to draw with the trunk's material, each with the cards of its head. */
  stems: Wild[];
  /** Lines that are not drawn: the places down a stem where leaf hangs, each with its cards. */
  leaves: Wild[];
  /** How many of `stems`, from the first, stand near enough for their bends to be seen. The rest are drawn of fewer pieces. */
  near: number;
  /** The tufts and the mats. */
  group: THREE.Group;
  /** The shade under the stands, in the rig's contact scene. */
  shade: THREE.InstancedMesh;
}

/**
 * What makes one stand unlike the next: how many stems, the share of tall, middling, low, young and dead among them, how tall they grow,
 * how long the stand is drawn out, whether its stems fan out or lean one way, how much they lean and break, which crowns they carry
 * (full, ragged, spent, tight), how big, how much leaf hangs, and how many stand loose of the mass.
 */
interface Habit {
  many: number;
  shares: [number, number, number, number, number];
  height: number;
  long: number;
  comb: number;
  lean: number;
  kink: number;
  styles: [number, number, number, number];
  crown: number;
  leafy: number;
  loose: number;
}
const HABITS: Habit[] = [
  // An old thicket of every age.
  { many: 1.25, shares: [0.18, 0.28, 0.24, 0.2, 0.1], height: 1, long: 1.2, comb: 0.2, lean: 1, kink: 0.3, styles: [0.5, 0.25, 0.13, 0.12], crown: 1, leafy: 1.2, loose: 0.3 },
  // A few tall ones over their own young.
  { many: 0.55, shares: [0.3, 0.05, 0.1, 0.5, 0.05], height: 1.2, long: 1, comb: 0.1, lean: 0.6, kink: 0.15, styles: [0.7, 0.2, 0.05, 0.05], crown: 1.02, leafy: 1.1, loose: 0.2 },
  // Low scrub, none above a man's waist.
  { many: 1.5, shares: [0, 0.06, 0.6, 0.3, 0.04], height: 0.8, long: 1.6, comb: 0.3, lean: 1.2, kink: 0.3, styles: [0.25, 0.35, 0.1, 0.3], crown: 0.85, leafy: 0.6, loose: 0.45 },
  // A stand that has died back: canes, breaks and spent crowns.
  { many: 0.75, shares: [0.08, 0.17, 0.15, 0.08, 0.52], height: 0.95, long: 1.3, comb: 0.5, lean: 1.5, kink: 0.7, styles: [0.1, 0.3, 0.55, 0.05], crown: 0.8, leafy: 1.4, loose: 0.3 },
  // A line along the wet, combed one way by the wind.
  { many: 0.9, shares: [0.1, 0.4, 0.3, 0.12, 0.08], height: 1, long: 3, comb: 0.9, lean: 1.3, kink: 0.25, styles: [0.45, 0.3, 0.15, 0.1], crown: 0.95, leafy: 1, loose: 0.15 },
  // Young growth, tight heads and buds.
  { many: 1, shares: [0.02, 0.12, 0.2, 0.63, 0.03], height: 0.9, long: 1.3, comb: 0.1, lean: 0.8, kink: 0.1, styles: [0.3, 0.1, 0.02, 0.58], crown: 1.05, leafy: 0.4, loose: 0.4 },
  // An open stand, stems apart.
  { many: 0.45, shares: [0.2, 0.3, 0.25, 0.1, 0.15], height: 1.1, long: 1.8, comb: 0.4, lean: 1.1, kink: 0.4, styles: [0.4, 0.3, 0.2, 0.1], crown: 1.1, leafy: 1, loose: 0.6 },
];

interface Stand {
  x: number; z: number; r: number;
  /** 0 to 1, how rich. */
  q: number;
  /** Metres from where the wide shot's key stands. */
  far: number;
  /** A thicket that has stood long: its stems are this much taller, and more. */
  tall?: number;
  /** A smaller stand beside another. */
  kin?: boolean;
}

export function growStands(ctx: Context, standing: Wild[], uSeconds: THREE.IUniform<number>): Stands {
  const rng = ctx.rng('stalks-stands');
  const land = ctx.rig.land;
  const eye = rel(3, -1.5);
  const walkA = rel(-6, 3);
  const walkB = rel(12, -3);
  const farOf = (x: number, z: number): number => Math.hypot(x - eye[0], z - eye[1]);
  const beasts = BEASTS.map((b) => ({ p: rel(b.d, b.l), r: 2.2 + 2.6 * b.size })).concat(DEAD.map((b) => ({ p: rel(b.d, b.l), r: 1.5 + 2 * b.size })));
  // Nothing grows through an animal, on the rock the lens stands on or in the lens's way.
  const clear = (x: number, z: number, margin = 0): boolean =>
    beasts.every((b) => Math.hypot(x - b.p[0], z - b.p[1]) > b.r + margin) && distToSegment(x, z, walkA, walkB) > 13 + margin && land.height(x, z) < 1.2;

  // The stands: one round every group of the stalks that already stand, and more along the brine where its edge is free.
  const stands: Stand[] = [];
  {
    const feet = standing.filter((w) => w.foot);
    const taken = new Set<Wild>();
    for (const w of feet) {
      if (taken.has(w)) continue;
      const members = feet.filter((o) => !taken.has(o) && Math.hypot(o.x - w.x, o.z - w.z) < 3.2);
      for (const o of members) taken.add(o);
      const x = members.reduce((a, o) => a + o.x, 0) / members.length;
      const z = members.reduce((a, o) => a + o.z, 0) / members.length;
      const spread = Math.max(...members.map((o) => Math.hypot(o.x - x, o.z - z)));
      stands.push({ x, z, r: Math.max(1.3, spread + 0.7), q: Math.min(1, 0.45 + members.length / 9), far: farOf(x, z) });
    }
    // One old thicket stands near, on the bank to the left of where the shot begins: the nearest ground there that is clear of the lens's way.
    {
      let best: [number, number] | null = null;
      let bestD = 1e9;
      for (let d = 14; d <= 44; d += 1) {
        for (let l = -26; l <= -5; l += 1) {
          const p = rel(d, l);
          const off = Math.atan2(l - 2.5, d + 4.8) - 0.1745;
          const ground = land.height(p[0], p[1]);
          if (off > -0.3 || off < -0.56 || ground < 0.04 || ground > 0.9 || !clear(p[0], p[1], 2)) continue;
          const near = Math.hypot(d + 4.8, l - 2.5);
          if (near < bestD) { bestD = near; best = p; }
        }
      }
      if (best) stands.push({ x: best[0], z: best[1], r: 3.1, q: 1, far: farOf(best[0], best[1]), tall: 1.4 });
    }
    for (let c = 0; c < 9000 && stands.length < 230; c++) {
      const d = 6 + 560 * Math.pow(rng.next(), 1.9);
      const l = rng.range(-1, 1) * (0.85 * d + 22);
      const p = rel(d, l);
      const shore = land.shore(p[0], p[1]);
      const rich = 0.5 + 0.5 * Math.sin(p[0] * 0.071 + 1.3) * Math.sin(p[1] * 0.053 + 0.7) + 0.25 * Math.sin(p[0] * 0.19 + p[1] * 0.23);
      const roll = rng.next();
      if (shore < 0.1 || shore > 1.5 || land.height(p[0], p[1]) < 0.02 || rich < 0.42 + 0.3 * roll) continue;
      const far = farOf(p[0], p[1]);
      if (!clear(p[0], p[1], 1.5) || stands.some((s) => Math.hypot(s.x - p[0], s.z - p[1]) < 4.5 + 0.1 * far)) continue;
      // A stand the lens passes close to is a thicket, never a few sticks.
      stands.push({ x: p[0], z: p[1], r: rng.range(1.1, 2.8) * (1 + far / 260), q: Math.max(far < 75 ? 0.8 : 0, rng.range(0.35, 1) * Math.min(1, rich + 0.2)), far });
    }
    // Stands keep company: beside some a smaller one, beside a few two, a stride or three off, and the rest alone.
    const kin: Stand[] = [];
    for (const s of stands) {
      // Not under the lens: what stands that near is already a thicket.
      if (s.far > 170 || s.far < 40 || s.tall) continue;
      const roll = rng.next();
      for (let k = 0; k < (roll < 0.14 ? 2 : roll < 0.5 ? 1 : 0); k++) {
        const a = rng.range(0, TAU);
        const d = s.r * rng.range(1.5, 2.6);
        const x = s.x + Math.cos(a) * d;
        const z = s.z + Math.sin(a) * d;
        if (land.height(x, z) < 0.02 || !clear(x, z, 1.5)) continue;
        kin.push({ x, z, r: s.r * rng.range(0.3, 0.62), q: rng.range(0.45, 0.95), far: farOf(x, z), kin: true });
      }
    }
    for (const k of kin) stands.push(k);
  }

  const stems: Wild[] = [];
  const leaves: Wild[] = [];
  const tuft: number[][] = [[], [], []];
  const tuftOne: number[][] = [[], [], []];
  const mat: number[][] = [[], []];
  const matFar: number[][] = [[], []];
  const farStems: Wild[] = [];
  const shades: [number, number, number, number, number, number][] = [];
  const headFor = (tall: number): number => Math.pow(Math.min(1.1, Math.max(0.12, tall / 2.6)), 0.9);
  // A seed whose head never snaps shut: leaf that hangs down a stem does not.
  const calm = (): number => {
    let s = rng.next();
    for (let n = 0; n < 50 && (s * 13.7) % 1 < 0.36; n++) s = rng.next();
    return s;
  };
  const dress = (w: Wild, style: number, scale: number, few: boolean): void => {
    // style: 0 a full mop, 1 ragged, 2 spent and hanging, 3 young and tight, 4 a bud.
    const turn = rng.range(0, TAU);
    const card = (k: number, n: number, droop: number, size: number, lock: number, ragged: number, spent: number): void => {
      w.cards.push([turn + ((k + rng.range(-0.3, 0.3)) / n) * TAU, droop, size * scale, lock + rng.range(0, 0.45), rng.next(), ragged, spent, rng.range(-0.035, 0.035)]);
    };
    // A crown is a spray of straps that stands up from the stem's end, and round it a few that have begun to fall.
    if (style === 0) {
      // Far off one spray is the crown: a second behind it is not seen.
      const n = few ? 1 : 2 + (rng.next() < 0.35 ? 1 : 0);
      for (let k = 0; k < n; k++) card(k, n, rng.range(-0.45, 0.45), rng.range(0.85, 1.2), 1, 0, 0);
      const m = few ? 1 : 1 + rng.int(3);
      for (let k = 0; k < m; k++) card(k + 0.5, m, rng.range(0.8, 1.5), rng.range(0.45, 0.8), 0, rng.next() < 0.3 ? rng.range(0.2, 0.5) : 0, rng.next() < 0.2 ? rng.range(0.6, 1) : 0);
    } else if (style === 1) {
      const n = 1;
      for (let k = 0; k < n; k++) card(k, n, rng.range(-0.6, 0.6), rng.range(0.6, 1), 1, rng.range(0.4, 0.9), rng.next() < 0.3 ? rng.range(0.3, 0.8) : 0);
      const m = few ? 1 : 1 + rng.int(2);
      for (let k = 0; k < m; k++) card(k + 0.5, m, rng.range(0.9, 1.8), rng.range(0.45, 0.8), 0, rng.range(0.5, 1), rng.next() < 0.4 ? rng.range(0.3, 0.8) : 0);
    } else if (style === 2) {
      const n = few ? 1 : 2 + rng.int(2);
      for (let k = 0; k < n; k++) card(k, n, rng.range(1.7, 2.6), rng.range(0.4, 0.75), k === 0 ? 1 : 0, rng.range(0.5, 0.95), rng.range(0.8, 1));
    } else if (style === 3) {
      card(0, 1, rng.range(-0.25, 0.25), rng.range(0.5, 0.85), 1, 0, 0);
      if (!few) card(0.5, 1, rng.range(-0.5, 0), rng.range(0.5, 0.8), 0, 0.2, 0);
    } else {
      card(0, 1, rng.range(-0.15, 0.15), rng.range(0.4, 0.6), 1, 0, 0);
    }
  };
  // Leaf down a stem: at a few places along its line a card or two hangs, some of it spent. Each place is a line that ends there and moves with the stem.
  // Under the crown hangs its skirt, the straps of other years, longer than the leaf lower down and most of it spent.
  const hang = (w: Wild, most: number, skirt: number): void => {
    const n = skirt + (most > 0 ? 1 + rng.int(most) : 0);
    for (let k = 0; k < n; k++) {
      const under = k < skirt;
      const t = under ? rng.range(0.9, 0.985) : rng.range(0.4, 0.9);
      const past = Math.max(t - w.kinkT, 0);
      const anchor: Wild = {
        ...w, h: w.h * t, bowM: w.bowM * t, swayM: (w.swayM * Math.sin(4.7 * t)) / Math.sin(4.7), kinkT: 0, kinkM: (w.kinkM * past) / t, quiver: w.quiver * t,
        kind: 0, seed: calm(), fork: [w.fork[0] * t, w.fork[1] * t, w.fork[2] * t], cards: [], foot: false, bare: false,
      };
      const cards = 1;
      const turn = rng.range(0, TAU);
      const spent = rng.next() < (under ? 0.6 : 0.4) ? rng.range(0.6, 1) : rng.range(0, 0.25);
      for (let c = 0; c < cards; c++) {
        anchor.cards.push([turn + (c / cards) * TAU + rng.range(-0.5, 0.5), under ? rng.range(2.1, 2.9) : rng.range(2.5, 3.3), (under ? rng.range(0.55, 0.9) : rng.range(0.3, 0.55)) * headFor(w.h), (rng.next() < 0.75 ? 1 : 0) + rng.range(0.1, 0.45), rng.next(), rng.range(0.4, 0.95), spent, rng.range(-0.03, 0.03)]);
      }
      leaves.push(anchor);
    }
  };
  const addTuft = (x: number, z: number, h: number, w: number, tone: number, dead: number, brush: number, two = false): void => {
    const y = Math.max(land.height(x, z), -0.02) - 0.02;
    const to = two ? tuftOne : tuft;
    (to[0] as number[]).push(x, y, z, h);
    (to[1] as number[]).push(w, rng.range(0, TAU), rng.range(0.1, 0.5) * (two ? -1 : 1), rng.next());
    (to[2] as number[]).push(tone, dead, brush, rng.range(0, TAU));
  };
  const addMat = (x: number, z: number, r: number, h: number, dead: number): void => {
    const to = farOf(x, z) > 90 ? matFar : mat;
    (to[0] as number[]).push(x, Math.max(0, land.height(x, z)), z, r);
    (to[1] as number[]).push(h, rng.next(), rng.next(), dead);
  };
  const around = (s: Stand, reach: number): [number, number] => {
    const a = rng.range(0, TAU);
    const d = Math.abs(rng.normal()) * s.r * reach;
    return [s.x + Math.cos(a) * d, s.z + Math.sin(a) * d];
  };

  // The stalks that already stand carry leaf down their stems in this shot, as the stems of the stands do.
  for (const w of standing) {
    if (w.foot && w.age < 1.5 && w.h > 1.3 && w.cards.length > 0 && farOf(w.x, w.z) < 150) hang(w, farOf(w.x, w.z) < 95 ? 2 : 0, farOf(w.x, w.z) < 95 ? 2 : 1);
  }

  for (const s of stands) {
    // The shade a stand lays on its ground is seen as far as the stand is seen as stems: beyond that the brush is its own dark.
    if (s.far < 90) shades.push([s.x, s.z, s.r * 1.25, 0.5, 1, 0]);
    // Stems, where a stem can still be told from the next: tens in a near stand, a few in one far off, none beyond that.
    // No two stands are grown to one pattern: each has its habit, and its own measure of every part of it.
    const habit = HABITS[s.tall ? 0 : rng.int(HABITS.length)] as Habit;
    const sizeK = Math.min(1.6, 0.5 + 0.5 * Math.pow(s.r / 1.9, 1.5));
    // A stand the lens passes close to stays a thicket whatever its habit.
    const many = Math.max(s.r > 1 ? (s.far < 50 ? 0.75 : s.far < 75 ? 0.55 : 0) : 0, habit.many * rng.range(0.7, 1.3)) * sizeK;
    const shares = habit.shares.map((v) => v * rng.range(0.55, 1.5));
    const whole = shares.reduce((a, v) => a + v, 0);
    const upTo = shares.map((_, i) => shares.slice(0, i + 1).reduce((a, v) => a + v, 0) / whole);
    const styles = habit.styles.map((v) => v * rng.range(0.5, 1.6));
    const allStyles = styles.reduce((a, v) => a + v, 0);
    const grows = habit.height * rng.range(0.82, 1.22);
    const long = s.tall ? 1.2 : 1 + (habit.long - 1) * rng.range(0.3, 1.5);
    const axis = rng.range(0, TAU);
    const wind = rng.range(0, TAU);
    const comb = Math.min(1, habit.comb * rng.range(0.5, 1.6));
    const leans = habit.lean * rng.range(0.6, 1.4);
    const crownK = habit.crown * rng.range(0.8, 1.25);
    const leafy = habit.leafy * rng.range(0.6, 1.4);
    const looseShare = habit.loose * rng.range(0.5, 1.5);
    const tail = rng.range(0, TAU);
    // The stand is drawn out along its own line: a round clump, an oval, a strip.
    const drawn = (p: [number, number]): [number, number] => {
      const ux = Math.cos(axis);
      const uz = Math.sin(axis);
      const along = ((p[0] - s.x) * ux + (p[1] - s.z) * uz) * Math.pow(long, 0.6);
      const across = (-(p[0] - s.x) * uz + (p[1] - s.z) * ux) * Math.pow(long, -0.4);
      return [s.x + along * ux - across * uz, s.z + along * uz + across * ux];
    };
    const count = s.far < 150 ? Math.round((s.tall ? 1.6 : 1) * many * Math.max(4, s.q * (40 - 30 * Math.min(1, s.far / 150)))) : 0;
    const cores: [number, number][] = [];
    for (let k = 0; k < 1 + rng.int(4); k++) cores.push(around(s, 0.45));
    for (let k = 0; k < count; k++) {
      const core = cores[rng.int(cores.length)] as [number, number];
      const loose = rng.next() < looseShare;
      // The loose ones trail off to one side more than to the others: a thin edge there, a clean one opposite.
      const a = loose && rng.next() < 0.65 ? tail + rng.normal() * 0.6 : rng.range(0, TAU);
      const d = loose ? rng.range(0.5, 2.1) * s.r : rng.range(0.08, 0.75);
      const at = drawn([core[0] + Math.cos(a) * d, core[1] + Math.sin(a) * d]);
      const x = at[0];
      const z = at[1];
      const ground = land.height(x, z);
      if (ground < -0.3 || !clear(x, z)) continue;
      const roll0 = rng.next();
      const cls = upTo.findIndex((v) => roll0 <= v);
      const dead = cls === 4 || cls < 0;
      const shoot = cls === 3;
      const h = (dead ? rng.range(0.7, 2.6) : shoot ? rng.range(0.2, 0.95) : cls === 0 ? rng.range(3.1, 4.6) : cls === 1 ? rng.range(2, 3.1) : rng.range(0.95, 2)) * (s.tall ?? 1) * (shoot ? 1 : grows);
      const R = shoot ? rng.range(0.016, 0.03) * (0.7 + 0.6 * h) : rng.range(0.03, 0.052) * Math.pow(Math.max(h, 0.8) / 2.4, 0.45);
      const kinks = !shoot && rng.next() < habit.kink;
      const kind = dead ? 2 : shoot && rng.next() < 0.5 ? 1 : 0;
      // Which way it leans: out from the heart of the stand, or with the rest of the stand the way the wind has combed it.
      const bx = (1 - comb) * Math.cos(a) + comb * Math.cos(wind + rng.range(-0.35, 0.35));
      const bz = (1 - comb) * Math.sin(a) + comb * Math.sin(wind + rng.range(-0.35, 0.35));
      const bl = Math.max(1e-3, Math.hypot(bx, bz));
      const bend: [number, number] = [bx / bl, bz / bl];
      const w: Wild = {
        x, y: ground - 0.05, z, h, dx: bend[0], dz: bend[1], lean: Math.min(dead ? 0.95 : 0.6, (dead ? rng.range(0.1, 0.9) : loose ? rng.range(0.02, 0.3) : rng.range(0.04, 0.42)) * leans), R,
        kind, phase: rng.range(0, TAU), low: 0, seed: rng.next(),
        bowA: rng.range(0, TAU), bowM: rng.range(0.03, 0.24), kinkT: kinks ? rng.range(0.25, 0.8) : 2, kinkM: kinks ? rng.range(0.12, 0.5) : 0,
        swayA: rng.range(0, TAU), swayM: rng.next() < 0.5 ? rng.range(0.02, 0.085) : rng.range(0, 0.02), kinkA: rng.range(0, TAU), rate: rng.range(0.7, 1.6) / Math.sqrt(Math.max(h, 0.6) / 2.5),
        age: dead ? 2 : shoot ? rng.range(0, 0.25) : cls === 0 ? rng.range(0.6, 1) : rng.range(0, 0.7), stain: rng.range(0.12, 1.1), uvo: rng.range(0, 2), quiver: shoot ? 1.6 : 1,
        fork: [0, 0, 0], collar: rng.range(0.6, 1.5), cards: [], foot: true,
      };
      (s.far < 48 ? stems : farStems).push(w);
      if (s.far < 40) shades.push([x, z, Math.max(0.14, R * 6.5), 0.7, 1, 0]);
      if (dead) continue;
      const roll = rng.next() * allStyles;
      const style = roll < (styles[0] as number) ? 0 : roll < (styles[0] as number) + (styles[1] as number) ? 1 : roll < (styles[0] as number) + (styles[1] as number) + (styles[2] as number) ? 2 : 3;
      dress(w, shoot ? (kind === 1 ? 4 : 3) : style, (0.8 + 0.35 * rng.next()) * headFor(h) * (shoot ? 2 : crownK), s.far > 95);
      if (!shoot && h > 1.2 && s.far < 125) hang(w, s.far < 95 ? Math.round((h > 2.4 ? 4 : 2) * leafy) : 0, s.far < 95 ? Math.max(1, Math.round((2 + rng.int(2)) * Math.min(1.3, 0.5 + 0.5 * leafy))) : 1);
    }
    // Dead canes lie where they fell, half in the brine.
    for (let k = 0; k < (s.far < 110 ? 1 + rng.int(4) : 0); k++) {
      const p = around(s, 0.9);
      if (!clear(p[0], p[1])) continue;
      const yaw = rng.range(0, TAU);
      const rr = rng.range(0.03, 0.055);
      const broken = rng.next() < 0.5;
      const h = rng.range(1.1, 3.4);
      stems.push({
        x: p[0], y: Math.max(0, land.height(p[0], p[1])) - 0.05 + rr * rng.range(0.1, 0.7), z: p[1], h, dx: Math.cos(yaw), dz: Math.sin(yaw), lean: rng.range(1.5, 1.6), R: rr,
        kind: 2, phase: 0, low: 0, seed: rng.next(),
        bowA: rng.next() < 0.5 ? Math.PI / 2 : -Math.PI / 2, bowM: rng.range(0.02, 0.16), kinkT: broken ? rng.range(0.3, 0.7) : 2, kinkM: broken ? rng.range(0.15, 0.5) : 0,
        swayA: Math.PI / 2, swayM: rng.range(0, 0.03), kinkA: rng.next() < 0.5 ? Math.PI / 2 : -Math.PI / 2, rate: 1,
        age: 2, stain: 0.1, uvo: rng.range(0, 2), quiver: 0, fork: [0, 0, 0], collar: 0, cards: [], foot: false,
      });
      if (s.far < 60) shades.push([p[0] + Math.cos(yaw) * h * 0.5, p[1] + Math.sin(yaw) * h * 0.5, rr * 3.5, 0.6, (h * 0.5) / (rr * 3.5), Math.atan2(-Math.sin(yaw), Math.cos(yaw))]);
    }
    // The understorey: tufts thick at the feet of the stems and thinning out onto the salt.
    // Far off two of them are a pixel or two apart: fewer stand there, each wider.
    const thin = s.far > 110 ? 0.4 : s.far > 32 ? 0.65 : 1;
    const tufts = s.far < 220 ? Math.round((s.kin ? 0.5 : 1) * thin * sizeK * rng.range(0.5, 1.4) * s.q * (90 - 70 * Math.min(1, s.far / 220))) : 0;
    for (let k = 0; k < tufts; k++) {
      const p = drawn(around(s, 0.5));
      if (land.height(p[0], p[1]) < -0.08 || !clear(p[0], p[1])) continue;
      const big = rng.next() < 0.2;
      const h = big ? rng.range(0.55, 1.1) : rng.range(0.16, 0.55);
      addTuft(p[0], p[1], h, (h * rng.range(1.0, 1.9)) / Math.sqrt(thin), rng.next(), rng.next() < 0.22 ? rng.range(0.6, 1) : rng.range(0, 0.15), 0, s.far > 32);
    }
    // Brush: what a stand is from far off, a dark red mass with a ragged top, standing among the stems where there are stems.
    const brush = s.far > 45 && !s.kin ? Math.round((3 + 6 * s.q) * (s.far > 150 ? 1.5 : Math.min(1, (s.far - 45) / 60))) : 0;
    for (let k = 0; k < brush; k++) {
      const p = around(s, 0.5);
      if (land.height(p[0], p[1]) < -0.1 || !clear(p[0], p[1])) continue;
      const h = (0.4 + 1.6 * Math.pow(rng.next(), 1.6)) * (0.75 + 0.5 * s.q);
      addTuft(p[0], p[1], h, h * rng.range(1.2, 2.8), rng.range(0, 0.7), rng.next() < 0.3 ? rng.range(0.5, 0.95) : rng.range(0, 0.25), 1, true);
    }
    // The mat on the wet ground at their feet, and far off the stain of it on the humps.
    const mats = s.far < 260 ? s.kin ? 1 : Math.round((3 + rng.int(4)) * Math.min(1, sizeK + 0.2)) : 2 + rng.int(2);
    for (let k = 0; k < mats; k++) {
      const p = drawn(around(s, s.far < 260 ? 0.7 : 0.5));
      if (land.height(p[0], p[1]) < 0.01 || !clear(p[0], p[1])) continue;
      const r = (s.far < 260 ? rng.range(0.5, 1.8) : rng.range(1.5, 3)) * (0.6 + 0.4 * s.r);
      addMat(p[0], p[1], r, rng.range(0.1, 0.26) * Math.min(1.5, 0.6 + 0.5 * r), rng.next() < 0.3 ? rng.range(0.4, 1) : rng.range(0, 0.2));
      // Near the lens the mat has a pile: short wisps stand out of it, thickest at its heart.
      for (let k = 0; k < (s.far < 50 ? Math.min(9, Math.round(4 * r * r)) : 0); k++) {
        const a = rng.range(0, TAU);
        const o = Math.sqrt(rng.next()) * 0.7 * r;
        const h = rng.range(0.1, 0.26);
        addTuft(p[0] + Math.cos(a) * o, p[1] + Math.sin(a) * o, h, h * rng.range(1.6, 2.8), rng.range(0, 0.5), rng.next() < 0.3 ? rng.range(0.5, 1) : rng.range(0, 0.2), 0);
      }
    }
  }
  // And the edge of the brine itself carries wisps between the stands, in runs: thick in one reach, none in the next.
  for (let c = 0; c < 9000; c++) {
    const d = 5 + 190 * Math.pow(rng.next(), 1.5);
    const l = rng.range(-1, 1) * (0.8 * d + 20);
    const p = rel(d, l);
    const shore = land.shore(p[0], p[1]);
    if (shore < 0.05 || shore > 0.7) continue;
    const run = 0.5 + 0.5 * Math.sin(p[0] * 0.23 + 0.4) * Math.sin(p[1] * 0.19 + 2.1);
    if (run < 0.55 + 0.3 * rng.next() || land.height(p[0], p[1]) < 0.01 || !clear(p[0], p[1])) continue;
    const r = rng.range(0.3, 1.0) * (d > 90 ? 1.6 : 1);
    addMat(p[0], p[1], r, rng.range(0.06, 0.14), rng.next() < 0.3 ? rng.range(0.4, 1) : rng.range(0, 0.2));
    for (let k = 0; k < (d > 90 ? 0 : d > 50 ? 1 + rng.int(2) : 2 + rng.int(5)); k++) {
      const a = rng.range(0, TAU);
      const o = rng.range(0, 0.6) * r;
      const h = rng.range(0.14, 0.45);
      addTuft(p[0] + Math.cos(a) * o, p[1] + Math.sin(a) * o, h, h * rng.range(1.1, 2), rng.next(), rng.next() < 0.25 ? rng.range(0.6, 1) : rng.range(0, 0.15), 0, d > 35);
    }
  }

  const group = new THREE.Group();
  {
    const cards = new THREE.BufferGeometry();
    const pp: number[] = [];
    const pi: number[] = [];
    // Two cards crossed, each leaning its own way: eight corners to place.
    for (let n = 0; n < 2; n++) {
      const k = n * 2;
      pp.push(-0.5, 0, k, 0.5, 0, k, -0.5, 1, k, 0.5, 1, k);
      pi.push(n * 4, n * 4 + 1, n * 4 + 2, n * 4 + 1, n * 4 + 3, n * 4 + 2);
    }
    cards.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
    cards.setIndex(pi);
    const material = new THREE.ShaderMaterial({
      uniforms: { ...ctx.rig.uniforms, uSeconds, tLock: { value: ctx.assets.texture('mat/lock.jpg', { kind: 'colour', repeat: false }) } },
      vertexShader: TUFT_VERTEX,
      fragmentShader: TUFT_FRAGMENT,
      side: THREE.DoubleSide,
    });
    material.userData.depthFragment = TUFT_DEPTH;
    const mesh = new THREE.Mesh(instancedOf(cards, (tuft[0] as number[]).length / 4, { aTuft: tuft[0] as number[], aTuft2: tuft[1] as number[], aTuft3: tuft[2] as number[] }), material);
    mesh.frustumCulled = false;
    // The far ones are one card each: four corners to place, not twelve.
    const card = new THREE.BufferGeometry();
    card.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, -0.5, 1, 0, 0.5, 1, 0], 3));
    card.setIndex([0, 1, 2, 1, 3, 2]);
    const far = new THREE.Mesh(instancedOf(card, (tuftOne[0] as number[]).length / 4, { aTuft: tuftOne[0] as number[], aTuft2: tuftOne[1] as number[], aTuft3: tuftOne[2] as number[] }), material);
    far.frustumCulled = false;
    group.add(mesh, far);
  }
  {
    // A disc of rings about its centre: many pieces near, where its lumps are seen, and few far off, where it is a stain.
    const discOf = (SIDES: number, RINGS: number): THREE.BufferGeometry => {
      const disc = new THREE.BufferGeometry();
      const pp: number[] = [];
      const pi: number[] = [];
      for (let j = 0; j <= RINGS; j++) for (let i = 0; i <= SIDES; i++) pp.push((i / SIDES) * TAU, j / RINGS, 0);
      for (let j = 0; j < RINGS; j++) {
        for (let i = 0; i < SIDES; i++) {
          const a = j * (SIDES + 1) + i;
          pi.push(a, a + SIDES + 1, a + 1, a + 1, a + SIDES + 1, a + SIDES + 2);
        }
      }
      disc.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
      disc.setIndex(pi);
      return disc;
    };
    const material = new THREE.ShaderMaterial({
      uniforms: { ...ctx.rig.uniforms },
      vertexShader: MAT_VERTEX,
      fragmentShader: MAT_FRAGMENT,
      side: THREE.DoubleSide,
    });
    material.userData.depthFragment = MAT_DEPTH;
    const mesh = new THREE.Mesh(instancedOf(discOf(12, 4), (mat[0] as number[]).length / 4, { aMat: mat[0] as number[], aMat2: mat[1] as number[] }), material);
    mesh.frustumCulled = false;
    const far = new THREE.Mesh(instancedOf(discOf(7, 1), (matFar[0] as number[]).length / 4, { aMat: matFar[0] as number[], aMat2: matFar[1] as number[] }), material);
    far.frustumCulled = false;
    group.add(mesh, far);
  }
  const shade = ctx.rig.contactDiscs(shades.length);
  shades.forEach((d, i) => ctx.rig.setDisc(shade, i, d[0], d[1], d[2], d[3], d[4], d[5]));
  const near = stems.length;
  for (const w of farStems) stems.push(w);
  return { stems, near, leaves, group, shade };
}
