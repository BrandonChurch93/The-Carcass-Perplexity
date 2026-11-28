// The drowned one: a kite-wing the last bore left in the weed of the first rib, head down, sodden, with the weed grown through it and crabs on it.
import * as THREE from 'three';
import { FPS } from '../../../config';
import { resolve } from '../../../core/cameras';
import { shotById } from '../../../film/cut';
import { shots } from '../cameras';
import { DROWNED, LEVELS, SUN, WIND } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { loopAngle, loopText } from '../shared/looptext';
import { loopPhase } from '../shared/stage';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { partAtHeight, radii, ribByName, surface, weedPoint } from '../layout';
import { weedLump } from '../land/shapes';

export const PARTS: readonly string[] = ['drowned'];

/** It was a big one. Metres of the hung body for one unit of its plan below: hip to the ends of the tendrils is about 7 units down the face. */
const SIZE = 1.45;
const STRANDS = 220;
const CRABS = 16;
/** In the card loop the hung body swings on its hook as a pendulum: radians, the size of its first turn. */
const SWING = 0.09;
/** The picture of the hung body (1448 by 1086 px) is the plan of a body with depth: metres from the hook to the end of the tuft, and its turn from square to the lens. */
const PLATE = { high: 9.5, turn: 0.2 };
/** Where the body lies in its picture (1448 by 1086): from, to across it. */
const FRAMED = { from: 0.185, to: 0.765 };
/**
 * The body in depth, metres out of the plane of the weed (the plane the picture used to lie in). Every point of the picture is moved toward the
 * lens of the key along its own line of sight, so the key keeps the picture's outline and every other frame sees a body with a near and a far side.
 * The trunk is a round of `girth` from the hip, where it caught, to the head, which hangs clear. Each limb: its middle across the picture and its
 * top down it (px), how far out it leaves the trunk, and how much nearer the face it comes for each metre it hangs (the face leans back, a limb hangs plumb).
 */
const HUNG = {
  hip: [440, 100],
  head: [960, 520],
  /** Where it is held, and how the picture's pose is let fall from there (radians): the trunk steeper than the picture has it, and the neck from 0.78 of the trunk steeper still. Every limb hangs plumb from where it leaves the trunk, so the legs close up under it: a level back on four spread legs is an animal standing. */
  hook: [450, 20],
  fall: 0.32,
  loll: 0.35,
  trunk: [1.3, 1.9],
  girth: 0.8,
  /** Where the weed caught on it hangs, behind every limb. */
  strands: 0.95,
  limbs: [
    { at: 480, top: 330, out: 1.2, plumb: 0 },
    { at: 625, top: 400, out: 2.1, plumb: 0.1 },
    { at: 765, top: 440, out: 1.3, plumb: 0 },
    { at: 912, top: 560, out: 2.4, plumb: 0.1 },
    { at: 1000, top: 600, out: 2.0, plumb: 0.1 },
  ],
  /** Between two limbs, across the picture (px): the middle of the gap and half its width. */
  gaps: [
    [556, 25],
    [695, 22],
    [835, 35],
    [953, 12],
  ],
} as const;
/** How far the body turns on its hook in the wind of the film, radians either way, and each limb about its own root. */
const SWAY = { body: 0.004, limb: 0.011, loop: 0.05 };

// The body is drawn in the plane of the weed's face: u along the face away from the establishing camera, d down it, o out of it.
type Point = [number, number, number];
const BODY_VERTEX = /* glsl */ `
uniform float uTime;
uniform vec3 uDown;
uniform vec3 uOut;
uniform vec3 uAcross;
uniform vec3 uHang;
attribute vec4 aSkin;
attribute vec3 aFace;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vSkin;
varying vec3 vFace;
void main() {
  vec3 p = aFace;
  // The tendrils and the torn cloth stir a little in the wind: more the lower and the looser.
  float loose = aSkin.x > 5.5 ? aSkin.w : 0.0;
  vec3 w = position + uAcross * (loose * 0.07 * sin(uTime * 1.7 + p.y * 2.3 + aSkin.z * 40.0)) + uOut * (loose * 0.03 * (1.0 + sin(uTime * 2.3 + p.y * 1.7 + aSkin.z * 23.0)));
  vWorld = w;
  vNormal = normal;
  vSkin = aSkin;
  vFace = aFace;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

// aSkin: x the part (0 trunk, 1 neck and head, 2 limb, 3 bare bone, 6 tendril, 7 torn sail), y along it, z around it or its own number, w how bare or how loose.
const BODY_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
${NOISE_GLSL}
uniform sampler2D tHide;
uniform sampler2D tHideN;
const vec3 HIDE_MEAN = vec3(0.495, 0.387, 0.3);
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vSkin;
varying vec3 vFace;
float fbm2(vec2 p) {
  return 0.5 * vnoise(p) + 0.3 * vnoise(p * 2.13 + 7.1) + 0.2 * vnoise(p * 4.7 + 3.3);
}
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  if (dot(n, v) < 0.0) n = -n;
  float part = vSkin.x;
  vec2 q = vec2(vSkin.y * 5.0, vSkin.z * 0.9) + part * 3.7;
  vec2 f = vFace.xy;
#ifdef SHEET
  // Wet cloth of a sail, torn: holes eaten through it and its lower edge in rags.
  float eaten = fbm2(f * 2.6 + 11.0) + 0.55 * smoothstep(0.45, 1.0, vSkin.z) * vnoise(f * 9.0) + 0.25 * vnoise(f * 21.0);
#endif
  // The membrane picture at two scales, by the place on the face so that it does not swim along a limb: sodden, so its warmth is mostly gone and its veins stay.
  vec3 hide = texture2D(tHide, f * 0.9 + part * 0.37).rgb / HIDE_MEAN;
  vec3 hideFine = texture2D(tHide, f * 3.1 + part * 0.61).rgb / HIDE_MEAN;
  float lum = dot(hide, vec3(0.3333)) * (0.4 + 0.6 * dot(hideFine, vec3(0.3333)));
  float grain = clamp(0.25 + 0.75 * lum, 0.55, 1.4);
  vec2 slope = (texture2D(tHideN, f * 0.9 + part * 0.37).rg - 0.5) + 0.8 * (texture2D(tHideN, f * 3.1 + part * 0.61).rg - 0.5);
  // Sodden skin: bone pale, blotched grey-green and bruised, darker in every fold.
  float blotch = fbm2(f * 1.7 + part);
  float fine = fbm2(f * 9.0);
  vec3 pale = vec3(0.53, 0.44, 0.4);
  vec3 albedo = mix(pale, vec3(0.36, 0.38, 0.32), smoothstep(0.45, 0.75, blotch));
  albedo = mix(albedo, vec3(0.3, 0.2, 0.19), smoothstep(0.5, 0.75, fbm2(f * 3.1 + 5.0)) * 0.75);
  // Water stains run down it.
  albedo *= 0.72 + 0.28 * smoothstep(0.3, 0.7, vnoise(vec2(f.x * 14.0, f.y * 0.9)));
  albedo *= 0.8 + 0.4 * fine;
  float rough = 0.34;
  float occ = 1.0;
  float bare = part > 2.5 && part < 3.5 ? 1.0 : vSkin.w;
  float old = part > 3.5 && part < 4.5 ? 1.0 : 0.0;
  if (part < 0.5) {
    // The trunk: ribs standing under the skin, the skin sunk between them.
    float chest = smoothstep(0.3, 0.42, vSkin.y) * (1.0 - smoothstep(0.86, 0.95, vSkin.y));
    float ridge = 0.5 + 0.5 * sin(vSkin.y * 88.0 + 0.8 * sin(vSkin.z * 2.0));
    float flank = abs(sin(vSkin.z));
    albedo *= 1.0 - 0.25 * chest * flank * (1.0 - ridge);
    albedo = mix(albedo, vec3(0.58, 0.54, 0.47), chest * flank * smoothstep(0.75, 1.0, ridge) * 0.3);
    occ = 1.0 - 0.3 * chest * flank * (1.0 - ridge);
    // Holes: the skin gone, dark wet red inside, the rim curled and pale.
    float hole = fbm2(f * 2.3 + 20.0) + 0.2 * vnoise(f * 13.0);
    float gone = smoothstep(0.69, 0.72, hole);
    float rim = smoothstep(0.64, 0.69, hole) * (1.0 - gone);
    albedo = mix(albedo, vec3(0.7, 0.66, 0.58), rim * 0.7);
    albedo = mix(albedo, mix(vec3(0.07, 0.025, 0.02), vec3(0.5, 0.47, 0.4), smoothstep(0.6, 0.9, ridge) * chest), gone);
    occ *= 1.0 - 0.6 * gone;
    rough = mix(rough, 0.2, gone);
  }
  // Bone at the joints and where the skin has gone from a limb.
  float worn = smoothstep(0.35, 0.75, bare + 0.5 * (fine - 0.5));
  albedo = mix(albedo, vec3(0.6, 0.56, 0.47) * (0.8 + 0.3 * fine), worn);
  rough = mix(rough, 0.5, worn);
  // The older one's bones: brown and green with weed slime, pale only where they are rubbed.
  if (old > 0.5) {
    albedo = mix(vec3(0.13, 0.12, 0.08), vec3(0.36, 0.33, 0.26), smoothstep(0.5, 0.8, fbm2(f * 6.0))) * (0.7 + 0.5 * fine);
    rough = 0.4;
  }
  if (part > 5.5 && part < 6.5) {
    albedo = mix(vec3(0.3, 0.25, 0.2), vec3(0.13, 0.11, 0.08), vSkin.y) * (0.8 + 0.4 * fine);
    rough = 0.22;
  }
#ifdef SHEET
  albedo = mix(vec3(0.45, 0.4, 0.35), vec3(0.3, 0.25, 0.2), smoothstep(0.45, 0.66, eaten)) * (0.75 + 0.5 * fine);
  albedo *= 0.8 + 0.2 * sin(vSkin.y * 60.0 + 4.0 * fine);
  rough = 0.26;
#endif
  albedo *= grain * mix(vec3(1.0), hide / max(dot(hide, vec3(0.3333)), 0.05), 0.45);
  {
    vec3 tt = normalize(cross(n, abs(n.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
    n = normalize(n - 1.8 * (slope.x * tt + slope.y * cross(n, tt)));
  }
  // Close to the face it lies in the shade of the weed and of itself.
  occ *= mix(0.5, 1.0, smoothstep(0.0, 0.45, vFace.z));
  vec3 col = rigShade(vWorld, n, v, albedo, rough, occ);
  gl_FragColor = vec4(rigOut(col), 1.0);
#ifdef SHEET
  // Cut at the end: a picture read after a discard has no slope to pick its level by.
  if (eaten > 0.66) discard;
#endif
}`;

// Water running down the face beside it and off it: thin ribbons, bright where they catch the sky, always moving down.
const RUN_VERTEX = /* glsl */ `
uniform vec3 uDown;
uniform vec3 uOut;
uniform vec3 uAcross;
uniform vec3 uHang;
attribute vec3 aFace;
attribute vec3 aRun;
varying vec3 vWorld;
varying vec3 vRun;
varying vec2 vAt;
void main() {
  vec3 p = aFace;
  vec3 w = position + uAcross * (0.06 * sin(p.y * 2.1 + aRun.z * 30.0) + 0.02 * sin(p.y * 7.0 + aRun.z * 11.0));
  vWorld = w;
  vRun = aRun;
  vAt = p.xy;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const RUN_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
${NOISE_GLSL}
uniform vec3 uOut;
varying vec3 vWorld;
varying vec3 vRun;
varying vec2 vAt;
void main() {
  // vRun: x across the ribbon (-1 to 1), y along it (0 to 1), z its own number.
  // Held at 0: at the edge of a ribbon a value read between samples can lie a hair outside -1 to 1, and a negative alpha paints a negative colour.
  float across = max(1.0 - vRun.x * vRun.x, 0.0);
  float fall = vAt.y * 3.0 - uTime * (2.6 + 1.5 * vRun.z);
  float beads = smoothstep(0.35, 0.9, vnoise(vec2(vRun.z * 40.0 + vRun.x * 1.5, fall)));
  float thin = smoothstep(0.0, 0.08, vRun.y) * (1.0 - smoothstep(0.75, 1.0, vRun.y));
  float alpha = clamp(across * thin * (0.16 + 0.75 * beads), 0.0, 1.0) * (1.0 - uSolo);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(uOut + vec3(0.0, 0.25, 0.0));
  vec3 col = skyRadiance(reflect(-v, n)) * 0.85 + skyIrradiance(n) * 0.08;
  gl_FragColor = vec4(rigOut(col) * alpha, alpha);
}`;

interface Mesh {
  face: number[];
  skin: number[];
  index: number[];
}

/** A tube along `path` (face coordinates), `radius(s, a)` round it, flattened against the face by `flat`. */
function tube(mesh: Mesh, path: (s: number) => Point, radius: (s: number, a: number) => number, along: number, around: number, part: number, bare: (s: number) => number = () => 0, flat = 1): void {
  const first = mesh.face.length / 3;
  for (let i = 0; i <= along; i++) {
    const s = i / along;
    const c = path(s);
    const b = path(Math.min(1, s + 0.01));
    const a0 = path(Math.max(0, s - 0.01));
    const t = new THREE.Vector3(b[0] - a0[0], b[1] - a0[1], b[2] - a0[2]).normalize();
    const side = new THREE.Vector3(0, 0, 1).cross(t).normalize();
    const up = new THREE.Vector3().crossVectors(t, side).normalize();
    for (let k = 0; k <= around; k++) {
      const a = (k / around) * Math.PI * 2;
      const r = radius(s, a);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * flat;
      mesh.face.push(c[0] + side.x * x + up.x * y, c[1] + side.y * x + up.y * y, Math.max(0.02, c[2] + side.z * x + up.z * y));
      mesh.skin.push(part, s, a, bare(s));
    }
  }
  for (let i = 0; i < along; i++) {
    for (let k = 0; k < around; k++) {
      const a = first + i * (around + 1) + k;
      const b = a + around + 1;
      mesh.index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
}

const lerp = (a: Point, b: Point, s: number): Point => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
const bump = (s: number, at: number, wide: number): number => Math.exp(-((s - at) * (s - at)) / (wide * wide));

function geometryOf(mesh: Mesh, toWorld: (u: number, d: number, o: number) => THREE.Vector3): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const world = new Float32Array(mesh.face.length);
  for (let i = 0; i < mesh.face.length; i += 3) toWorld(mesh.face[i] as number, mesh.face[i + 1] as number, mesh.face[i + 2] as number).toArray(world, i);
  g.setAttribute('position', new THREE.BufferAttribute(world, 3));
  g.setIndex(mesh.index);
  g.computeVertexNormals();
  g.setAttribute('aFace', new THREE.Float32BufferAttribute(mesh.face, 3));
  g.setAttribute('aSkin', new THREE.Float32BufferAttribute(mesh.skin, 4));
  return g;
}

const WEED_VERTEX = /* glsl */ `
uniform float uTime;
uniform vec3 uDown;
uniform vec3 uOut;
uniform vec3 uAcross;
uniform vec2 uWind;
attribute vec4 aRoot;
attribute vec4 aShape;
attribute vec3 aFall;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vStrand;
void main() {
  // position.x across the blade of the strand (-1 to 1), position.y along it (0 to 1).
  float s = position.y;
  float len = aShape.x;
  float wide = aShape.y * (0.35 + 0.65 * sin(3.14159 * pow(s, 0.6))) * (1.0 + 0.3 * sin(s * 23.0 + aShape.z * 9.0));
  float sway = sin(uTime * 1.3 + aShape.z * 30.0 + s * 3.0) * 0.09 * s * s * len;
  float curl = sin(s * 9.0 + aShape.z * 50.0) * 0.07;
  vec3 across = normalize(uAcross + uOut * (0.6 * sin(s * 5.0 + aShape.z * 17.0)));
  vec3 root = aRoot.xyz;
  // The strand runs down the face, lifting over what it lies across by aRoot.w.
  float lift = aRoot.w * sin(3.14159 * clamp(s * 1.3, 0.0, 1.0));
  vec3 c = root + aFall * (s * len) + uAcross * (sway + curl * len * 0.2 + aShape.w * s * len) + uOut * (lift + 0.04 + 0.05 * sin(s * 13.0 + aShape.z * 70.0)) + vec3(uWind.x, 0.0, uWind.y) * (sway * 0.6);
  vec3 w = c + across * (position.x * wide);
  vWorld = w;
  vNormal = normalize(cross(across, aFall) + across * (position.x * 0.5));
  vStrand = vec3(position.x, s, aShape.z);
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const WEED_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vStrand;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  if (dot(n, v) < 0.0) n = -n;
  float rib = abs(vStrand.x);
  float blister = sin(vStrand.y * 60.0 + vStrand.z * 40.0) * sin(vStrand.x * 5.0 + vStrand.y * 17.0);
  n = normalize(n + 0.3 * vec3(blister, 0.0, blister * 0.5));
  // Olive brown, as the fronds of the wall it hangs in (land/curtain.ts): amber toward its thin edge.
  vec3 dark = mix(vec3(0.03, 0.021, 0.006), vec3(0.075, 0.052, 0.014), fract(vStrand.z * 7.31));
  vec3 albedo = mix(dark, dark * 1.5 + vec3(0.04, 0.02, 0.0), smoothstep(0.55, 1.0, rib));
  albedo *= 0.8 + 0.4 * blister;
  // What lies over the body is the living weed of the tide line: olive and amber, wet.
  float over = step(1.0, vStrand.z);
  albedo = mix(albedo, mix(vec3(0.1, 0.085, 0.025), vec3(0.2, 0.12, 0.03), fract(vStrand.z * 3.7)) * (0.7 + 0.5 * blister + 0.4 * rib), over);
  // Wet, but no mirror: a strand seen along itself does not give back the break in the cloud. Its wet stands on it in beads.
  n = normalize(n + v * max(0.0, 0.55 - dot(n, v)));
  // A bead here and there, in no row: one cell in fifty of the strand holds one.
  vec2 cell = vec2(vStrand.x * 1.5 + vStrand.z * 9.0, vStrand.y * 70.0 + vStrand.z * 40.0);
  float lot = fract(sin(dot(floor(cell), vec2(12.9898, 78.233))) * 43758.5453);
  float bead = step(0.98, lot) * smoothstep(0.4, 0.15, length(fract(cell) - 0.5 - 0.2 * vec2(lot - 0.99, fract(lot * 57.0) - 0.5)));
  float occ = 0.55 + 0.45 * rib;
  vec3 col = rigShade(vWorld, n, v, albedo, mix(0.93, 0.7, over) - 0.15 * bead, occ);
  col += skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.12 * bead * occ * pow(max(dot(n, normalize(v + vec3(0.0, 1.0, 0.0))), 0.0), 6.0));
  gl_FragColor = vec4(rigOut(col), 1.0);
}`;

const CRAB_VERTEX = /* glsl */ `
uniform float uTime;
attribute vec4 aAt;
attribute vec4 aFrame;
uniform vec3 uDown;
uniform vec3 uOut;
uniform vec3 uAcross;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vCrab;
void main() {
  // A crab sits flat on the face: its own x and z lie in the face, y stands out of it.
  float turn = aFrame.x + 0.25 * sin(uTime * 0.7 + aFrame.y * 20.0);
  vec3 ax = cos(turn) * uAcross + sin(turn) * uDown;
  vec3 az = -sin(turn) * uAcross + cos(turn) * uDown;
  // It shifts a little, stops, shifts: never far.
  float go = sin(uTime * 0.9 + aFrame.y * 40.0);
  vec3 creep = ax * (0.08 * smoothstep(0.55, 1.0, go) - 0.08 * smoothstep(0.55, 1.0, -go));
  vec3 p = position;
  // Legs lift in turn while it shifts.
  p.y += position.y < 0.3 && abs(position.x) > 0.6 ? 0.12 * max(sin(uTime * 14.0 + position.z * 9.0 + aFrame.y * 7.0), 0.0) * smoothstep(0.5, 0.9, abs(go)) : 0.0;
  vec3 w = aAt.xyz + creep + (ax * p.x + uOut * p.y + az * p.z) * aAt.w;
  vWorld = w;
  vNormal = normalize(ax * normal.x + uOut * normal.y + az * normal.z);
  vCrab = vec3(position.xz, aFrame.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const CRAB_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vCrab;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float shell = 1.0 - smoothstep(0.5, 0.75, length(vCrab.xy));
  float speck = fract(sin(dot(floor(vCrab.xy * 14.0), vec2(12.9898, 78.233)) + vCrab.z * 9.0) * 43758.5453);
  vec3 albedo = mix(vec3(0.5, 0.4, 0.3), vec3(0.74, 0.66, 0.54) * (0.75 + 0.35 * speck), shell);
  vec3 col = rigShade(vWorld, n, v, albedo, 0.35, 0.7 + 0.3 * shell);
  gl_FragColor = vec4(rigOut(col), 1.0);
}`;

function crabShape(): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = [];
  const shell = new THREE.SphereGeometry(0.5, 14, 8);
  shell.scale(1.25, 0.42, 1);
  shell.translate(0, 0.3, 0);
  pieces.push(shell);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const a = (k - 1.5) * 0.42;
      for (const [from, to, r] of [
        [[0.5, 0.3], [1.05, 0.62], 0.07],
        [[1.05, 0.62], [1.5, 0.0], 0.05],
      ] as [[number, number], [number, number], number][]) {
        const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
        const leg = new THREE.CylinderGeometry(r * 0.7, r, len, 5, 1);
        leg.rotateZ(-Math.atan2(to[0] - from[0], to[1] - from[1]));
        leg.translate((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0);
        if (side < 0) leg.scale(-1, 1, 1);
        leg.rotateY(a * side);
        pieces.push(leg);
      }
    }
    const claw = new THREE.SphereGeometry(0.2, 8, 6);
    claw.scale(1.5, 0.6, 0.9);
    claw.translate(side * 0.55, 0.28, 0.62);
    pieces.push(claw);
  }
  const positions: number[] = [];
  const normals: number[] = [];
  const index: number[] = [];
  for (const piece of pieces) {
    const g = piece.index ? piece.toNonIndexed() : piece;
    g.computeVertexNormals();
    const first = positions.length / 3;
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
      index.push(first + i);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setIndex(index);
  return out;
}

const glslNumber = (n: number): string => (Number.isInteger(n) ? `${n}.0` : `${n}`);
const HUNG_LIMBS = HUNG.limbs.map((l) => `vec4(${[l.at, l.top, l.out, l.plumb].map(glslNumber).join(', ')})`);
const HUNG_GAPS = HUNG.gaps.map(([at, half]) => `smoothstep(${glslNumber(at - half)}, ${glslNumber(at + half)}, pix.x)`);

// The body is the picture of one hide hung by a leg, the ribs through it, and it is a body: every point of the picture stands at its own depth
// out of the weed (hung(), below), so the trunk is round, the far legs hang behind the near ones and there is air between all of it and the face.
// Its shade is the same sheet thrown down the light of the sky onto the plane of the weed, softer the farther the part that throws it.
const PLATE_VERTEX = /* glsl */ `
uniform sampler2D tRelief;
uniform vec3 uOrigin;
uniform vec3 uAxis;
uniform vec3 uDrop;
uniform vec3 uProud;
uniform vec3 uKeyEye;
uniform vec3 uSkyWay;
uniform float uTime;
uniform vec4 uSwing;
varying vec3 vWorld;
varying vec2 vUv;
varying vec3 vShape;
varying vec3 vLay;
varying vec2 vHang;
varying float vTrunk;
const float LAY = 0.3;
const float METRE = ${glslNumber(1086 / PLATE.high)};
const vec2 HIP = vec2(${HUNG.hip.map(glslNumber).join(', ')});
const vec2 HEAD = vec2(${HUNG.head.map(glslNumber).join(', ')});
const vec2 HOOK = vec2(${HUNG.hook.map(glslNumber).join(', ')});
mat2 turn(float a) {
  return mat2(cos(a), sin(a), -sin(a), cos(a));
}
// How far the trunk is turned at a point of it once the body is let fall from the hook, and where that point then hangs.
float lean(vec2 p) {
  vec2 way = HEAD - HIP;
  return ${glslNumber(HUNG.fall)} + ${glslNumber(HUNG.loll)} * smoothstep(0.78, 1.05, dot(p - HIP, way) / dot(way, way));
}
vec2 fallen(vec2 p) {
  vec2 neck = HIP + (HEAD - HIP) * 0.78;
  return HOOK + turn(${glslNumber(HUNG.fall)}) * (neck - HOOK) + turn(lean(p)) * (p - neck);
}
// Which limb hangs at a place of the picture, its top and its depth.
vec4 limbAt(vec2 pix) {
  vec4 l = ${HUNG_LIMBS[0]};
${HUNG_GAPS.map((g, i) => `  l = mix(l, ${HUNG_LIMBS[i + 1]}, ${g});`).join('\n')}
  return l;
}
// x: 1 on the trunk, 0 on what hangs from it. y: metres out of the plane of the weed.
vec2 hung(vec2 pix) {
  vec2 way = HEAD - HIP;
  float len = length(way);
  way /= len;
  vec2 rel = pix - HIP;
  float s = dot(rel, way) / len;
  float t = dot(rel, vec2(-way.y, way.x));
  // The trunk thins into the neck.
  float thin = 1.0 - 0.62 * smoothstep(0.7, 1.05, s);
  float half_ = 115.0 * thin;
  float round_ = sqrt(max(1.0 - t * t / (half_ * half_), 0.0));
  float trunk = mix(${glslNumber(HUNG.trunk[0])}, ${glslNumber(HUNG.trunk[1])}, smoothstep(0.0, 1.0, s)) + ${glslNumber(HUNG.girth)} * thin * round_;
  vec4 l = limbAt(pix);
  float limb = l.z - l.w * max(pix.y - l.y, 0.0) / METRE;
  // The stump left of the hip is one piece with the trunk.
  float onTrunk = max(1.0 - smoothstep(0.8 * half_, 1.03 * half_, t), 1.0 - smoothstep(420.0, 445.0, pix.x));
  vec2 uv = vec2(pix.x / 1448.0, 1.0 - pix.y / 1086.0);
  return vec2(onTrunk, mix(limb, trunk, onTrunk) + 0.25 * textureLod(tRelief, uv, 3.0).r);
}
void main() {
  vec2 at = position.xy;
#ifdef SHADE
  // The shade is wider than what throws it.
  at = (at - 0.5) * 1.3 + 0.5;
#endif
  vec2 uv = vec2(mix(${FRAMED.from.toFixed(3)}, ${FRAMED.to.toFixed(3)}, at.x), 1.0 - at.y);
  vec2 pix = vec2(uv.x * 1448.0, at.y * 1086.0);
  vec2 here = hung(pix);
  float dx = (hung(pix + vec2(6.0, 0.0)).y - hung(pix - vec2(6.0, 0.0)).y) * METRE / 12.0;
  float dy = (hung(pix + vec2(0.0, 6.0)).y - hung(pix - vec2(0.0, 6.0)).y) * METRE / 12.0;
  // What hangs from the trunk swings a little about its own root, each limb in its own time, the strings of the muzzle most.
  vec4 l = limbAt(pix);
  float number = floor(l.x / 140.0);
  float hangs = (1.0 - here.x) * max(pix.y - l.y, 0.0) / METRE;
  float loose = l.x > 990.0 ? 2.6 : 1.0;
  // uSwing: the angle each of the three turns stands at in the key (there every limb hangs as the picture has it), and how far a limb swings.
  float swing = uSwing.w * loose * (cos(number * 1.9) * sin(uTime * 1.1 - uSwing.x) + 0.5 * cos(number * 4.1) * sin(uTime * 1.9 - uSwing.y));
  float nod = uSwing.w * loose * cos(number * 2.7) * sin(uTime * 0.8 - uSwing.z);
  // A limb leaves the trunk turned as the trunk is and hangs plumb from a little way down: turned as a whole and set plumb at its root, the
  // sheet folds over itself where the two meet.
  vec2 limbHangs = fallen(l.xy) + turn(lean(l.xy) * (1.0 - smoothstep(-30.0, 170.0, pix.y - l.y))) * (pix - l.xy);
  vec2 moved = mix(limbHangs, fallen(pix), here.x) - pix;
  vTrunk = here.x;
  vHang = pix + moved;
  vec3 flat_ = uOrigin + uAxis * (at.x - 0.12) + uDrop * at.y + (normalize(uAxis) * moved.x + normalize(uDrop) * moved.y) / METRE + normalize(uAxis) * (hangs * swing);
  // Out of the plane along the line of sight of the key: there the picture keeps its outline, everywhere else it is seen to have depth.
  // The flat picture lay LAY out of the plane (the middle of its old relief): from there, so the body keeps its place in the key.
  vec3 lay = flat_ + uProud * LAY;
  vec3 ray = uKeyEye - lay;
  float depth = here.y + hangs * nod;
  vec3 w = lay + ray * ((depth - LAY) / dot(ray, uProud));
  vShape = vec3(dx, dy, depth);
#ifdef SHADE
  float fall = (depth - 0.7) / dot(uSkyWay, uProud);
  w -= uSkyWay * fall;
  vShape.z = fall;
#endif
  vWorld = w;
  vLay = lay;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;
const PLATE_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
${NOISE_GLSL}
uniform sampler2D tCarcass;
uniform sampler2D tRelief;
uniform vec3 uAxis;
uniform vec3 uDrop;
uniform vec3 uProud;
uniform vec3 uKeyEye;
varying vec3 vWorld;
varying vec2 vUv;
varying vec3 vShape;
varying vec3 vLay;
varying vec2 vHang;
varying float vTrunk;
void main() {
#ifdef SHADE
  // The farther the part hangs from the face the wider and the fainter what it hides of the sky.
  float far = max(vShape.z, 0.0);
  float hidden = textureLod(tRelief, vUv, 2.5 + 0.9 * far).r;
  float dark = clamp(hidden * 2.4, 0.0, 1.0) * (0.6 + 0.3 * exp(-0.7 * far));
  // What runs off it wets the face below it: a dark run under the belly, in streaks, thinning out down the face.
  float run = smoothstep(420.0, 470.0, vHang.x) * (1.0 - smoothstep(640.0, 720.0, vHang.x)) * smoothstep(480.0, 700.0, vHang.y) * (1.0 - smoothstep(1100.0, 1400.0, vHang.y));
  run *= 0.6 + 0.4 * sin(vHang.x * 0.19 + 3.0 * sin(vHang.x * 0.047));
  dark = max(dark, 0.55 * run) * (1.0 - uSolo);
  gl_FragColor = vec4(rigOut(vec3(0.0)) * dark, dark);
#else
  vec3 pic = texture2D(tCarcass, vUv).rgb;
  float h = texture2D(tRelief, vUv).r;
  vec2 e = vec2(3.0 / 1448.0, 3.0 / 1086.0);
  float hx = texture2D(tRelief, vUv + vec2(e.x, 0.0), 1.5).r - texture2D(tRelief, vUv - vec2(e.x, 0.0), 1.5).r;
  float hy = texture2D(tRelief, vUv + vec2(0.0, e.y), 1.5).r - texture2D(tRelief, vUv - vec2(0.0, e.y), 1.5).r;
  // The side of the head: the plate has a round red hollow there, which in the frame is a socket. The hide of the neck beside it is
  // laid over it, colour and relief, with a ragged edge: the head is closed, torn and sodden as the rest.
  vec2 headPx = vec2(vUv.x * 1448.0, (1.0 - vUv.y) * 1086.0);
  vec2 fromHollow = (headPx - vec2(965.0, 506.0)) / vec2(29.0, 38.0);
  float closed = 1.0 - smoothstep(0.7, 1.2, length(fromHollow) + 0.3 * (vnoise(headPx * 0.11) - 0.5));
  vec2 graft = vUv + vec2(-50.0 / 1448.0, 45.0 / 1086.0);
  pic = mix(pic, texture2D(tCarcass, graft).rgb, closed);
  h = mix(h, texture2D(tRelief, graft).r, closed);
  hx = mix(hx, texture2D(tRelief, graft + vec2(e.x, 0.0), 1.5).r - texture2D(tRelief, graft - vec2(e.x, 0.0), 1.5).r, closed);
  hy = mix(hy, texture2D(tRelief, graft + vec2(0.0, e.y), 1.5).r - texture2D(tRelief, graft - vec2(0.0, e.y), 1.5).r, closed);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 across = normalize(uAxis);
  vec3 down = normalize(uDrop);
  // The form of the body: the sheet as it stands in depth, each point pushed along its line to the key's lens.
  vec3 ray = normalize(uKeyEye - vWorld) / max(dot(normalize(uKeyEye - vWorld), uProud), 0.2);
  // Where the sheet runs from a near part to a far one it stands edge on to the lens: its slope is held, or the wet skin there mirrors the sky.
  vec2 slope = vShape.xy * min(1.0, 1.5 / max(length(vShape.xy), 1e-3));
  vec3 face = normalize(cross(down + ray * slope.y, across + ray * slope.x));
  if (dot(face, uProud) < 0.0) face = -face;
  // Under an overcast the far side of a round thing is filled by the wet rock and the water: the form is held to a part of its full turn.
  face = normalize(mix(uProud, face, 0.6));
  // And the skin on it: ribs, folds, tears.
  vec3 n = normalize(face - (across * hx - down * hy) * 0.9);
  if (dot(n, v) < 0.0) n = reflect(n, v);
  vec3 wet = normalize(uProud - (across * hx - down * hy) * 0.9);
  if (dot(uProud, v) < 0.0) wet = reflect(wet, uProud) * -1.0;
  // Sodden hide: a little greyer than the dry picture, and it shines where the water runs off it. The hollows between the ribs see little sky.
  // It hangs in the rock's own shade, no brighter than the weed's highlights: grey pink, stained down its length by what runs off it, green brown toward the weed it lies in.
  vec3 albedo = mix(vec3(dot(pic, vec3(0.3, 0.5, 0.2))) * vec3(1.0, 0.88, 0.82), pic, 0.5) * 2.1;
  float streak = 0.5 + 0.5 * sin(vUv.x * 150.0 + 4.0 * sin(vUv.x * 31.0) + 2.0 * pic.g);
  albedo *= mix(0.8, 1.0, smoothstep(0.25, 0.7, streak));
  albedo = mix(albedo, albedo * vec3(0.55, 0.6, 0.38), 0.25 * smoothstep(0.6, 0.15, vUv.y));
  // The approved picture keeps the hide pale, bone grey against the dark weed, and nothing lies across the trunk. The stain is shade only:
  // under the spine, where the trunk turns from the light. Darker than that it sinks into the wall late in the shot.
  vec2 pix = vec2(vUv.x * 1448.0, (1.0 - vUv.y) * 1086.0);
  vec2 spine = normalize(vec2(${glslNumber(HUNG.head[0] - HUNG.hip[0])}, ${glslNumber(HUNG.head[1] - HUNG.hip[1])}));
  float under = smoothstep(-50.0, 110.0, dot(pix - vec2(${HUNG.hip.map(glslNumber).join(', ')}), vec2(-spine.y, spine.x)));
  albedo *= 1.12 * (1.0 - 0.14 * under * vTrunk);
  // The hide is lit where the picture lay, by the lie of the hide: asked from where it now hangs, a metre or two out, the land's coarse bake
  // answers for another place at every fold. The form under the hide then turns that light: what faces the sky and the sun is brighter, what
  // faces down or hangs close to the face and behind the trunk is darker.
  // Sodden: dark where the water still stands in the hide, in ragged patches that run down it, and bright in a narrow light where it
  // turns to the sky.
  float sodden = smoothstep(0.42, 0.62, vnoise(vec2(vUv.x * 9.0, vUv.y * 3.5) + 3.0) * 0.6 + 0.4 * vnoise(vec2(vUv.x * 31.0, vUv.y * 9.0)) + 0.25 * (0.5 - h));
  albedo *= mix(vec3(1.0), vec3(0.62, 0.56, 0.5), sodden);
  vec3 col = rigShade(vLay, wet, v, albedo, mix(0.24, 0.1, sodden), mix(0.4, 0.85, smoothstep(0.1, 0.7, h)));
  float sunHere = sunAt(vLay, landAt(vLay.xz + uProud.xz * 14.0));
  vec3 grey = vec3(0.3, 0.5, 0.2);
  float lit = dot(skyIrradiance(n), grey) + dot(uSunColour, grey) * max(dot(n, uSunDir), 0.0) * sunHere;
  float flat_ = dot(skyIrradiance(wet), grey) + dot(uSunColour, grey) * max(dot(wet, uSunDir), 0.0) * sunHere;
  // A limb is a hand wide in the frame: turned all the way, its far half is the colour of the weed behind it and the limb is lost.
  float form = clamp(mix(1.0, lit / max(flat_, 1e-4), 0.5), 0.88, 1.3);
  float occ = form * mix(0.92, 1.0, smoothstep(1.2, 2.2, vShape.z)) * (1.0 - 0.15 * smoothstep(0.8, 3.0, -vShape.y));
  col *= occ;
  // Water still runs off it: threads of it slide down the hide, bead after bead, and each bead holds the sky.
  float thread = smoothstep(0.8, 0.97, 0.5 + 0.5 * sin(vUv.x * 210.0 + 5.0 * sin(vUv.x * 47.0)));
  float bead = smoothstep(0.6, 0.92, 0.5 + 0.5 * sin(vUv.y * 46.0 + uTime * 5.0 + 9.0 * sin(vUv.x * 63.0)));
  col += skyIrradiance(vec3(0.0, 1.0, 0.0)) * 0.07 * thread * bead * smoothstep(0.1, 0.5, h);
  gl_FragColor = vec4(rigOut(col), 1.0);
  // Cut out on a finer level than the lens asks for: in the wide view a limb is a pixel or two across and the coarse level loses it.
  if (texture2D(tRelief, vUv, -1.5).r < 0.045) discard;
#endif
}`;

export function create(ctx: Context): Piece {
  const scatter = ctx.rng('drowned');
  const rib = ribByName(DROWNED.rib);
  const hang = new THREE.Vector3(...DROWNED.at(0));
  const next = weedPoint(rib, DROWNED.phi + 0.02, DROWNED.height);
  const below = weedPoint(rib, DROWNED.phi, DROWNED.height - 4);
  // The face of the weed there: north along it (away from the establishing camera), down it, and out of it.
  const north = new THREE.Vector3(-(next.x - hang.x), 0, -(next.z - hang.z)).normalize();
  const down = below.clone().sub(hang).normalize();
  const out = new THREE.Vector3().crossVectors(north, down).normalize();
  if (out.dot(new THREE.Vector3(...DROWNED.at(1)).sub(hang)) < 0) out.negate();
  const across = new THREE.Vector3().crossVectors(down, out).normalize();

  // The body: caught by the hips, the trunk lying down and along the face to the head, every limb hanging straight, the sails collapsed.
  if (across.dot(north) < 0) across.negate();
  // The face flares toward its foot: a point of the plan is put on the weed itself, not on the plane through the hook.
  const perPhi = Math.hypot(next.x - hang.x, next.y - hang.y, next.z - hang.z) / 0.02;
  const tideAt = partAtHeight(rib, LEVELS.tide);
  const [tideA, tideB] = radii(rib, tideAt);
  const toWorld = (u: number, d: number, o: number): THREE.Vector3 => {
    const phi = DROWNED.phi - u / perPhi;
    const y = DROWNED.height + d * down.y;
    // The lead's weed hangs proud of its smooth skirt in lumps (land/shapes.ts): the body lies on the lumps.
    const foot = surface(rib, tideAt, phi, tideA, tideB);
    return weedPoint(rib, phi, y, o + weedLump(foot.x, y, foot.z) + 0.12);
  };
  const K = SIZE;
  // Caught by the hips, it hangs out from the face toward the head: the lens looks along the face, and a body flat on it would be a line.
  const proud = (u: number): number => 0.5 * Math.max(0, u + 1.3 * K);
  const hipAt: Point = [-1.3 * K, -1.7 * K, 0.42 * K];
  const shoulder: Point = [1.5 * K, 1.3 * K, 0.5 * K + proud(1.5 * K)];
  const headAt: Point = [2.1 * K, 3.3 * K, 0.3 * K + proud(2.1 * K)];
  const skinMesh: Mesh = { face: [], skin: [], index: [] };
  const trunk = (q: number): Point => {
    const p = lerp(hipAt, shoulder, q);
    // The spine sags between the hips and the shoulders.
    p[1] += 0.3 * K * Math.sin(Math.PI * q);
    return p;
  };
  tube(
    skinMesh,
    trunk,
    (q, a) => {
      const girth = 0.56 + 0.12 * bump(q, 0, 0.16) - 0.2 * bump(q, 0.3, 0.14) + 0.24 * bump(q, 0.68, 0.2) - 0.14 * bump(q, 1, 0.1);
      const chest = Math.min(1, Math.max(0, (q - 0.3) / 0.12)) * Math.min(1, Math.max(0, (0.95 - q) / 0.09));
      const ridge = 0.5 + 0.5 * Math.sin(q * 88 + 0.8 * Math.sin(a * 2));
      // Gaunt: the belly (the side that hangs down) sunk, the flanks ribbed.
      const belly = 1 - 0.34 * Math.max(0, Math.cos(a)) * bump(q, 0.32, 0.2);
      return K * girth * belly * (1 + 0.075 * chest * Math.abs(Math.sin(a)) * (ridge - 0.6)) * (0.3 + 0.7 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, q * 0.96 + 0.02))), 0.3));
    },
    170,
    30,
    0,
    (q) => 0.5 * bump(q, 0.02, 0.06) + 0.45 * bump(q, 0.97, 0.05),
    0.82,
  );
  // Neck and head: down from the shoulder, the muzzle hanging.
  tube(
    skinMesh,
    (q) => {
      const p = lerp(shoulder, headAt, Math.min(1, q / 0.8));
      if (q > 0.8) {
        p[0] += 0.3 * K * (q - 0.8) * 5;
        p[1] += 0.62 * K * (q - 0.8) * 5;
      }
      p[2] -= 0.12 * K * Math.sin(Math.PI * q);
      return p;
    },
    (q, a) => K * (0.34 - 0.14 * Math.min(1, q / 0.7) + 0.16 * bump(q, 0.84, 0.07) - 0.1 * Math.max(0, q - 0.9) * 10 + 0.02 * Math.sin(q * 60) * Math.abs(Math.sin(a))),
    70,
    18,
    1,
    (q) => 0.55 * bump(q, 0.86, 0.05),
  );
  // Limbs: two legs from the hips, two sail arms from the shoulders, straight down, each with its knots of bone.
  const limbs: { from: Point; drop: number; thick: number; lean: number; arm: boolean }[] = [
    { from: [-1.0 * K, -1.2 * K, 0.55 * K + proud(-1.0 * K)], drop: 4.4 * K, thick: 0.27, lean: 0.25, arm: false },
    { from: [-0.5 * K, -0.7 * K, 0.34 * K + proud(-0.5 * K)], drop: 4.6 * K, thick: 0.25, lean: 0.5, arm: false },
    { from: [1.2 * K, 1.2 * K, 0.6 * K + proud(1.2 * K)], drop: 3.6 * K, thick: 0.2, lean: -0.1, arm: true },
    { from: [1.6 * K, 1.5 * K, 0.3 * K + proud(1.6 * K)], drop: 3.3 * K, thick: 0.18, lean: 0.3, arm: true },
  ];
  const limbPath = (l: (typeof limbs)[number]) => (q: number): Point => [l.from[0] + l.lean * K * q + 0.05 * K * Math.sin(q * 7 + l.lean * 9), l.from[1] + l.drop * q, Math.max(0.1 * K, l.from[2] * (1 - 0.75 * q) + 0.12 * K + 0.1 * K * bump(q, 0.47, 0.08))];
  for (const l of limbs) {
    tube(
      skinMesh,
      limbPath(l),
      (q) => K * (l.thick * (1 - 0.62 * Math.min(1, q / 0.42)) + 0.075 * bump(q, 0.47, 0.035) + 0.05 * bump(q, 0.93, 0.03) + 0.012 * Math.sin(q * 43)) * (q > 0.96 ? Math.max(0.2, (1 - q) * 25) : 1),
      90,
      12,
      2,
      (q) => 0.9 * bump(q, 0.47, 0.045) + 0.8 * bump(q, 0.93, 0.04) + (l.arm ? 0.5 * Math.max(0, q - 0.6) : 0),
    );
    // Toes, or the fingers of the sail, hanging from the end.
    const end = limbPath(l)(1);
    for (let k = 0; k < 3; k++) {
      const spread = (k - 1) * 0.13 * K;
      const long = (l.arm ? 0.9 : 0.5) * K * (1 - 0.2 * Math.abs(k - 1));
      tube(skinMesh, (q) => [end[0] + spread * q, end[1] - 0.05 * K + long * q, Math.max(0.04, end[2] - 0.05 * K * q)], (q) => K * (0.04 - 0.028 * q), 10, 6, 3);
    }
  }
  // The stump of the tail, out past the hips.
  tube(skinMesh, (q) => [hipAt[0] - 1.25 * K * q, hipAt[1] + 0.25 * K + 0.5 * K * q * q, hipAt[2] - 0.15 * K * q], (q) => K * (0.2 - 0.11 * q + 0.05 * bump(q, 0.95, 0.06)), 30, 10, 2, (q) => Math.max(0, q - 0.5) * 2);
  // Tendrils: strings from the muzzle, straight down, dripping.
  const muzzle: Point = [headAt[0] + 0.3 * K, headAt[1] + 0.62 * K, headAt[2]];
  for (let i = 0; i < 34; i++) {
    const long = scatter.range(0.9, 2.2) * K;
    const off = scatter.range(-0.2, 0.2) * K;
    const drift = scatter.range(-0.25, 0.25) * K;
    const out0 = scatter.range(0.05, 0.3) * K;
    const number = scatter.next();
    const first = skinMesh.face.length / 3;
    tube(skinMesh, (q) => [muzzle[0] + off + drift * q * q + 0.03 * K * Math.sin(q * 9 + number * 20), muzzle[1] - 0.1 * K + long * q, Math.max(0.05, (out0 + headAt[2]) * (1 - 0.3 * q))], (q) => K * (0.034 - 0.022 * q + 0.014 * bump(q, 1, 0.03)), 22, 5, 6);
    for (let v = first; v < skinMesh.face.length / 3; v++) {
      skinMesh.skin[v * 4 + 3] = (skinMesh.skin[v * 4 + 1] as number) ** 2;
      skinMesh.skin[v * 4 + 2] = number;
    }
  }
  // The older one beside it: a spine and what is left of its ribs, bare bone in the weed.
  const cages: { at: Point; long: number; ribs: number; tilt: number }[] = [
    { at: [3.6 * K, -1.2 * K, 0.12], long: 2.0 * K, ribs: 9, tilt: 0.5 },
    { at: [-3.2 * K, 0.6 * K, 0.12], long: 1.5 * K, ribs: 7, tilt: -0.35 },
  ];
  for (const c of cages) {
    const dir: Point = [Math.sin(c.tilt), Math.cos(c.tilt), 0];
    tube(skinMesh, (q) => [c.at[0] + dir[0] * c.long * q, c.at[1] + dir[1] * c.long * q, c.at[2] + 0.1 * K], (q) => K * (0.07 + 0.025 * Math.sin(q * c.ribs * Math.PI * 2)), 40, 8, 4);
    for (let r = 0; r < c.ribs; r++) {
      const q0 = (r + 0.5 + scatter.range(-0.25, 0.25)) / c.ribs;
      const root: Point = [c.at[0] + dir[0] * c.long * q0, c.at[1] + dir[1] * c.long * q0, c.at[2] + 0.1 * K];
      const reach = K * (0.62 - 0.3 * Math.abs(q0 - 0.45)) * scatter.range(0.8, 1.1);
      for (const way of [-1, 1]) {
        if (scatter.next() < 0.3) continue;
        const kept = scatter.range(0.35, 1);
        tube(
          skinMesh,
          (q) => {
            const a = q * kept * 2.5;
            return [root[0] + way * dir[1] * reach * Math.sin(a) + dir[0] * 0.25 * reach * q, root[1] - way * dir[0] * reach * Math.sin(a) + dir[1] * 0.25 * reach * q, root[2] + reach * 0.75 * (1 - Math.cos(a)) * 0.6];
          },
          (q) => K * (0.04 - 0.018 * q),
          18,
          6,
          4,
        );
      }
    }
  }
  const skinGeometry = geometryOf(skinMesh, toWorld);

  // The sails: wet cloth hanging from each arm, slack against the face, torn.
  const clothMesh: Mesh = { face: [], skin: [], index: [] };
  for (const l of limbs) {
    if (!l.arm) continue;
    const path = limbPath(l);
    const ALONG = 40;
    const ACROSS = 14;
    const first = clothMesh.face.length / 3;
    const wide = (l.lean < 0 ? -1.5 : 1.35) * K;
    for (let i = 0; i <= ALONG; i++) {
      const q = i / ALONG;
      const c = path(q * 0.97);
      for (let k = 0; k <= ACROSS; k++) {
        const w = k / ACROSS;
        const fold = 0.09 * K * Math.sin(w * 15 + q * 4 + l.lean * 7) * w;
        const sag = 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, q * 1.15));
        clothMesh.face.push(c[0] + 0.45 * wide * w * sag + fold * 0.5, c[1] + 0.55 * K * w * w + 0.25 * K * w * Math.sin(q * 5), Math.max(0.04, c[2] - 0.9 * Math.abs(wide) * w * sag * Math.min(1, c[2] / (1.2 * K)) + Math.abs(fold)));
        clothMesh.skin.push(7, q, w, w * 0.6 + 0.4 * q);
      }
    }
    for (let i = 0; i < ALONG; i++) {
      for (let k = 0; k < ACROSS; k++) {
        const a = first + i * (ACROSS + 1) + k;
        const b = a + ACROSS + 1;
        clothMesh.index.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const clothGeometry = geometryOf(clothMesh, toWorld);

  const frame = { uDown: { value: down }, uOut: { value: out }, uAcross: { value: across }, uHang: { value: hang }, uWind: { value: new THREE.Vector2(...WIND.to) } };
  const hide = { value: ctx.assets.texture('mat/wing.jpg', { kind: 'colour' }) };
  const hideN = { value: ctx.assets.texture('mat/wing-nh.png', { kind: 'data' }) };
  const material = new THREE.ShaderMaterial({ vertexShader: BODY_VERTEX, fragmentShader: BODY_FRAGMENT, uniforms: { ...ctx.rig.uniforms, ...frame, tHide: hide, tHideN: hideN }, side: THREE.DoubleSide });
  const clothMaterial = new THREE.ShaderMaterial({ vertexShader: BODY_VERTEX, fragmentShader: BODY_FRAGMENT, defines: { SHEET: 1 }, uniforms: { ...ctx.rig.uniforms, ...frame, tHide: hide, tHideN: hideN }, side: THREE.DoubleSide });
  const body = new THREE.Mesh(skinGeometry, material);
  const cloth = new THREE.Mesh(clothGeometry, clothMaterial);
  body.frustumCulled = false;
  cloth.frustumCulled = false;

  // Water down the face: beside it, where the approved picture has a runnel off the ledge, and off its lowest points.
  const RUNS = 22;
  // And off it: from the end of every limb and from the muzzle the water it holds still runs.
  const dripFrom: Point[] = [...limbs.map((l) => limbPath(l)(1)), muzzle, muzzle, shoulder];
  const runFace: number[] = [];
  const runLook: number[] = [];
  const runIndex: number[] = [];
  for (let i = 0; i < RUNS + dripFrom.length * 3; i++) {
    const beside = i < 13;
    const drip = i >= RUNS ? dripFrom[Math.floor((i - RUNS) / 3)] : undefined;
    const u0 = drip ? drip[0] + scatter.range(-0.12, 0.12) * K : beside ? scatter.range(-3.4, -2.2) * K + (i % 3) * 0.1 : scatter.range(-1.2, 3.6) * K;
    const d0 = drip ? drip[1] - scatter.range(0, 0.5) * K : beside ? scatter.range(-4, -2.5) * K : scatter.range(1.5, 4.5) * K;
    const long = drip ? scatter.range(1.2, 2.8) * K : beside ? scatter.range(6, 9) * K : scatter.range(1.5, 3.5) * K;
    const wide = beside ? scatter.range(0.03, 0.1) : scatter.range(0.015, 0.035);
    const number = scatter.next();
    const first = runFace.length / 3;
    const N = 30;
    for (let k = 0; k <= N; k++) {
      const q = k / N;
      for (const side of [-1, 1]) {
        runFace.push(u0 + side * wide, d0 + long * q, drip ? Math.max(0.2, drip[2] * (1 - 1.2 * q)) + 0.06 : 0.2);
        runLook.push(side, q, number);
      }
    }
    for (let k = 0; k < N; k++) {
      const a = first + k * 2;
      runIndex.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const runGeometry = new THREE.BufferGeometry();
  const runWorld = new Float32Array(runFace.length);
  for (let i = 0; i < runFace.length; i += 3) toWorld(runFace[i] as number, runFace[i + 1] as number, runFace[i + 2] as number).toArray(runWorld, i);
  runGeometry.setAttribute('position', new THREE.BufferAttribute(runWorld, 3));
  runGeometry.setAttribute('aFace', new THREE.Float32BufferAttribute(runFace, 3));
  runGeometry.setAttribute('aRun', new THREE.Float32BufferAttribute(runLook, 3));
  runGeometry.setIndex(runIndex);
  const runMaterial = new THREE.ShaderMaterial({ vertexShader: RUN_VERTEX, fragmentShader: RUN_FRAGMENT, uniforms: { ...ctx.rig.uniforms, ...frame }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
  const runs = new THREE.Mesh(runGeometry, runMaterial);
  runs.frustumCulled = false;
  runs.renderOrder = 4;

  // Weed: strands that hang down the face round it, and strands that lie over it.
  const blade = new THREE.PlaneGeometry(2, 1, 2, 18).translate(0, 0.5, 0);
  const weed = new THREE.InstancedBufferGeometry();
  weed.setAttribute('position', blade.getAttribute('position'));
  weed.setIndex(blade.getIndex());
  weed.instanceCount = STRANDS;
  const roots = new Float32Array(STRANDS * 4);
  const shapes = new Float32Array(STRANDS * 4);
  const falls = new Float32Array(STRANDS * 3);
  for (let i = 0; i < STRANDS; i++) {
    let u = scatter.range(-6, 9);
    const up = scatter.range(-3, 5);
    // They keep clear of it: nothing hangs across the body.
    if (u > -2 * SIZE && u < 4.6 * SIZE && up > -5) u += u < 1.3 * SIZE ? -4 * SIZE : 5 * SIZE;
    const root = toWorld(u, -up, 0);
    const long = scatter.range(1.4, 5.2);
    const fall = toWorld(u, -up + long, 0).sub(root).normalize();
    falls.set([fall.x, fall.y, fall.z], i * 3);
    roots.set([root.x, root.y, root.z, scatter.range(0.05, 0.2)], i * 4);
    shapes.set([long, scatter.range(0.05, 0.16), scatter.next(), scatter.range(-0.12, 0.12)], i * 4);
  }
  weed.setAttribute('aRoot', new THREE.InstancedBufferAttribute(roots, 4));
  weed.setAttribute('aShape', new THREE.InstancedBufferAttribute(shapes, 4));
  weed.setAttribute('aFall', new THREE.InstancedBufferAttribute(falls, 3));
  const weedMaterial = new THREE.ShaderMaterial({ vertexShader: WEED_VERTEX, fragmentShader: WEED_FRAGMENT, uniforms: { ...ctx.rig.uniforms, ...frame }, side: THREE.DoubleSide });
  // The weed in the card loop: its sway goes two whole turns a loop, and wider while the gust that swings the body is on it.
  const weedLoop = weedMaterial.clone();
  weedLoop.uniforms = weedMaterial.uniforms;
  weedLoop.vertexShader = loopText(WEED_VERTEX, [
    ['uniform float uTime;', 'uniform float uTime;\nuniform vec2 uLoop;'],
    ['sin(uTime * 1.3 + aShape.z * 30.0 + s * 3.0) * 0.09', `sin(${loopAngle('1.3', 2)} + aShape.z * 30.0 + s * 3.0) * (0.09 + 0.12 * pow(sin(3.14159 * clamp((uLoop.y - 0.05) / 0.9, 0.0, 1.0)), 2.0))`],
  ]);
  const strands = new THREE.Mesh(weed, weedMaterial);
  strands.frustumCulled = false;

  // Crabs: on the body and in the weed beside it.
  const crab = crabShape();
  const crabs = new THREE.InstancedBufferGeometry();
  crabs.setAttribute('position', crab.getAttribute('position'));
  crabs.setAttribute('normal', crab.getAttribute('normal'));
  crabs.setIndex(crab.getIndex());
  crabs.instanceCount = CRABS;
  const at = new Float32Array(CRABS * 4);
  const turn = new Float32Array(CRABS * 4);
  for (let i = 0; i < CRABS; i++) {
    // In the weed round it. (The first draw is kept so that every crab stays where it was.)
    scatter.range(0.08, 0.95);
    const p = toWorld(scatter.range(-3, 6), scatter.range(-3, 4), 0.12);
    at.set([p.x, p.y, p.z, scatter.range(0.09, 0.16)], i * 4);
    turn.set([scatter.range(0, 6.28), scatter.next(), 0, 0], i * 4);
  }
  crabs.setAttribute('aAt', new THREE.InstancedBufferAttribute(at, 4));
  crabs.setAttribute('aFrame', new THREE.InstancedBufferAttribute(turn, 4));
  const crabMaterial = new THREE.ShaderMaterial({ vertexShader: CRAB_VERTEX, fragmentShader: CRAB_FRAGMENT, uniforms: { ...ctx.rig.uniforms, ...frame } });
  const crabMesh = new THREE.Mesh(crabs, crabMaterial);
  crabMesh.frustumCulled = false;

  // The picture's plane: hung by the leg at the hook, turned most of the way to the lens of its own shot, which looks along the face.
  const shot = shotById('ribs-05');
  const eye = resolve(shots['ribs-05'] as (typeof shots)[string], 0.5, shot.first + Math.round((shot.last - shot.first) / 2)).position;
  // The lens of the key (the middle frame of the shot): the body's depth is laid along its lines of sight.
  const keyFrame = shot.first + Math.round((shot.last - shot.first) / 2);
  const keyEye = new THREE.Vector3(...resolve(shots['ribs-05'] as (typeof shots)[string], (keyFrame - shot.first) / (shot.last - shot.first), keyFrame).position);
  const view = new THREE.Vector3(hang.x - eye[0], 0, hang.z - eye[2]).normalize();
  const right = new THREE.Vector3().crossVectors(view, new THREE.Vector3(0, 1, 0)).normalize();
  const axis = right.clone().multiplyScalar(Math.cos(PLATE.turn)).addScaledVector(view, Math.sin(PLATE.turn)).normalize();
  const proudWay = new THREE.Vector3().crossVectors(axis, down).normalize();
  if (proudWay.dot(view) > 0) proudWay.negate();
  // Weed across the legs: strands of the living weed caught on them, hanging down over the hide.
  const plateOrigin = weedPoint(rib, DROWNED.phi, DROWNED.height + 2.5, 0.3);
  const plateWide = (PLATE.high * (FRAMED.to - FRAMED.from) * 1448) / 1086;
  for (let i = 0; i < 18; i++) {
    // Under the limbs as they hang once the body is let fall from the hook.
    const flat = plateOrigin
      .clone()
      .addScaledVector(axis, plateWide * (0.1 + 0.44 * ((scatter.range(0.22, 0.86) - 0.22) / 0.64) - 0.12))
      .addScaledVector(down, PLATE.high * scatter.range(0.42, 0.8));
    // They hang between the face and the limbs, as they did behind the picture: a strand is as wide as half a limb, and one hung before a
    // far limb hides it.
    flat.addScaledVector(proudWay, 0.3);
    const ray = keyEye.clone().sub(flat);
    const root = flat.addScaledVector(ray, (HUNG.strands - 0.3) / ray.dot(proudWay));
    const fall = down.clone().addScaledVector(axis, scatter.range(-0.15, 0.15)).normalize();
    falls.set([fall.x, fall.y, fall.z], i * 3);
    roots.set([root.x, root.y, root.z, 0.06], i * 4);
    shapes.set([scatter.range(1.2, 2.8), scatter.range(0.07, 0.16), scatter.next() + 1, scatter.range(-0.08, 0.08)], i * 4);
  }
  const plateGeometry = new THREE.PlaneGeometry(1, 1, 150, 220).translate(0.5, 0.5, 0);
  // The face looks up at the sky more than out at it: what hangs before it throws its shade down the face.
  // And the bright side of the overcast is the sun's: the shade falls from between the two.
  const skyWay = new THREE.Vector3(...SUN.toward).normalize().addScaledVector(proudWay, 0.3).addScaledVector(down, -0.15).normalize();
  const plateAxis = axis.clone().multiplyScalar(plateWide);
  const plateDrop = down.clone().multiplyScalar(PLATE.high);
  const swungOrigin = plateOrigin.clone();
  const swungAxis = plateAxis.clone();
  const swungDrop = plateDrop.clone();
  const keySeconds = keyFrame / FPS;
  // The hook across the sheet, as the vertex shader lays it (the hook is at the sheet's top, near enough).
  const hookAcross = (HUNG.hook[0] / 1448 - FRAMED.from) / (FRAMED.to - FRAMED.from) - 0.12;
  const swingAt = new THREE.Vector4();
  const plateMaterial = new THREE.ShaderMaterial({
    vertexShader: PLATE_VERTEX,
    fragmentShader: PLATE_FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      tCarcass: { value: ctx.assets.texture('mat/carcass-hung.jpg', { kind: 'colour', repeat: false }) },
      tRelief: { value: ctx.assets.texture('mat/carcass-hung-h.png', { kind: 'data', repeat: false }) },
      uOrigin: { value: swungOrigin },
      uAxis: { value: swungAxis },
      uDrop: { value: swungDrop },
      uProud: { value: proudWay },
      uKeyEye: { value: keyEye },
      uSkyWay: { value: skyWay },
      uSwing: { value: swingAt },
    },
    side: THREE.DoubleSide,
  });
  const plate = new THREE.Mesh(plateGeometry, plateMaterial);
  plate.frustumCulled = false;
  const shadeMaterial = new THREE.ShaderMaterial({
    vertexShader: PLATE_VERTEX,
    fragmentShader: PLATE_FRAGMENT,
    uniforms: plateMaterial.uniforms,
    defines: { SHADE: 1 },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  // In the card loop the limbs swing on whole turns of the loop.
  const loopSwaps = [
    ['uniform float uTime;', 'uniform float uTime;\nuniform vec2 uLoop;'],
    ['uTime * 1.1', loopAngle('1.1', 1)],
    ['uTime * 1.9', loopAngle('1.9', 2)],
    ['uTime * 0.8', loopAngle('0.8', 1)],
  ] as const;
  const plateLoop = plateMaterial.clone();
  plateLoop.uniforms = plateMaterial.uniforms;
  plateLoop.vertexShader = loopText(PLATE_VERTEX, loopSwaps);
  const shadeLoop = shadeMaterial.clone();
  shadeLoop.uniforms = plateMaterial.uniforms;
  shadeLoop.vertexShader = loopText(PLATE_VERTEX, loopSwaps);
  const shade = new THREE.Mesh(plateGeometry, shadeMaterial);
  shade.frustumCulled = false;
  shade.renderOrder = 3;

  ctx.scene.add(ctx.parts.built('drowned', plate, shade, strands, crabMesh), shade, strands, crabMesh);

  return {
    // It turns about its hook.
    setTime: (seconds: number) => {
      const lp = loopPhase();
      strands.material = lp === null ? weedMaterial : weedLoop;
      plate.material = lp === null ? plateMaterial : plateLoop;
      shade.material = lp === null ? shadeMaterial : shadeLoop;
      // A dead weight on its hook: in the film the wind only stirs it, two slow turns that meet in the key, where it hangs as the picture has
      // it. In the card loop it swings as a pendulum of its length, one turn a loop and a second of two, and each limb on turns of its own.
      const since = seconds - keySeconds;
      const turn = lp === null ? 0 : lp * Math.PI * 2;
      const swing = lp === null ? SWAY.body * (Math.sin(since * 0.83) + 0.6 * Math.sin(since * 1.37)) : SWING * (Math.sin(turn + 0.6) + 0.35 * Math.sin(2 * turn + 2.1));
      if (lp === null) swingAt.set(keySeconds * 1.1, keySeconds * 1.9, keySeconds * 0.8, SWAY.limb);
      else swingAt.set(0, 0, 0, SWAY.loop);
      if (swing === 0) {
        swungOrigin.copy(plateOrigin);
        swungAxis.copy(plateAxis);
        swungDrop.copy(plateDrop);
        return;
      }
      swungAxis.copy(plateAxis).applyAxisAngle(proudWay, swing);
      swungDrop.copy(plateDrop).applyAxisAngle(proudWay, swing);
      swungOrigin.copy(plateOrigin).addScaledVector(plateAxis, hookAcross).addScaledVector(swungAxis, -hookAcross);
    },
    dispose: () => {
      weedLoop.dispose();
      plateLoop.dispose();
      shadeLoop.dispose();
      material.dispose();
      clothMaterial.dispose();
      plateMaterial.dispose();
      shadeMaterial.dispose();
      plateGeometry.dispose();
      runMaterial.dispose();
      skinGeometry.dispose();
      clothGeometry.dispose();
      runGeometry.dispose();
      weedMaterial.dispose();
      crabMaterial.dispose();
      weed.dispose();
      crabs.dispose();
    },
  };
}
