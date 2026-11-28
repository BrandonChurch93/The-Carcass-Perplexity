// What lies beyond the planet's edge: the stars. They are points at infinity, so they are placed by the direction the camera sees
// them in and not on the ground: as the camera rises the planet's edge draws back over them, and they turn only with the camera.
// A star's place is given in the sky's own measure: x to the right and y down the master picture, in half heights of the view.
import * as THREE from 'three';
import { FILM_ASPECT, HALF_TAN, KM, LIMB, LIMB_FOLLOW, RISE_LAST, X, Z, driftAt, poseAt } from '../shared/anchors';
import type { Context } from '../shared/context';
import { RIG_UNIFORMS_GLSL } from '../shared/glsl';

/** How rich the field is: 1 is the film's. The count of stars goes with it, and their brightness a little. */
const RICH: number = 1;
/** Stars to a square half height of sky away from the band, at RICH 1. */
const FIELD = 9000;
/** The band of the galaxy: a point on its middle line, the way it runs, and how many more stars stand in its core than in the field. */
export const BAND = { x: -1.55, y: -0.8, alongX: 0.96, alongY: 0.28, more: 5 };
/** Two loose clusters: where, how wide (half heights), how many stars. */
const CLUSTERS: [number, number, number, number][] = [
  [-1.63, -0.925, 0.022, 70],
  [-0.86, -1.3, 0.034, 110],
];
/** The faintest star drawn and the brightest, as the peak radiance of its point at 3840 wide. */
const FAINTEST = 0.0035;
const BRIGHTEST = 7;
/** Stars to a square half height of sky that stand out alone, at RICH 1. */
const BRIGHT = 40;

/** A number from 0 to 1 that depends only on the index and the channel. */
function hash(i: number, channel: number): number {
  let h = (Math.imul(i + 1, 0x9e3779b1) + Math.imul(channel + 1, 0x7f4a7c15)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x27d4eb2f);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
function noise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const at = (a: number, b: number): number => hash(a * 7919 + b * 104729, 11);
  return (at(ix, iy) * (1 - ux) + at(ix + 1, iy) * ux) * (1 - uy) + (at(ix, iy + 1) * (1 - ux) + at(ix + 1, iy + 1) * ux) * uy;
}
const fbm = (x: number, y: number): number => 0.5 * noise(x, y) + 0.3 * noise(2.1 * x + 5.2, 2.1 * y + 1.7) + 0.2 * noise(4.3 * x + 9.1, 4.3 * y + 3.3);

/** How thick the stars of the galaxy stand at a place of the sky, 0 to about 1: a bright core, a wide faint halo, clumps, and a dark lane of dust that wanders along the middle. */
export function bandAt(x: number, y: number): number {
  const along = (x - BAND.x) * BAND.alongX + (y - BAND.y) * BAND.alongY;
  const across = -(x - BAND.x) * BAND.alongY + (y - BAND.y) * BAND.alongX;
  const core = Math.exp(-((across / 0.13) * (across / 0.13)));
  const halo = 0.3 * Math.exp(-((across / 0.34) * (across / 0.34)));
  const lane = across - 0.015 - 0.07 * (noise(along * 2.6 + 3, 0.5) - 0.5) - 0.03 * (noise(along * 9 + 1, 4.5) - 0.5);
  const dust = Math.exp(-((lane / 0.03) * (lane / 0.03))) * (0.35 + 0.65 * noise(along * 4.2 + 8, 2.5));
  return (core + halo) * (0.45 + 1.1 * fbm(along * 7, across * 7 + 20)) * (1 - 0.9 * dust);
}

interface View {
  camX: number;
  camZ: number;
  half: number;
  limbX: number;
  limbZ: number;
  cos: number;
  sin: number;
}
/** The views of the film in which space shows, a frame in every forty: a star no view of them sees is not kept. */
function views(): View[] {
  const out: View[] = [];
  for (let frame = 9880; frame <= RISE_LAST + 40; frame += 40) {
    const f = Math.min(frame, RISE_LAST);
    const pose = poseAt(f);
    const [driftX, driftZ] = driftAt(f);
    const up = pose.up as [number, number, number];
    out.push({ camX: pose.position[0], camZ: pose.position[2], half: pose.position[1] * HALF_TAN, limbX: X(LIMB.cx) + LIMB_FOLLOW * driftX, limbZ: Z(LIMB.cy) + LIMB_FOLLOW * driftZ, cos: -up[2], sin: up[0] });
  }
  return out;
}

const STAR_VERTEX = /* glsl */ `
${RIG_UNIFORMS_GLSL}
// x, z: the camera. z: half the height of its view on the sea, km. w: half the height of the picture, pixels.
uniform vec4 uSky;
attribute vec4 aTint;
varying vec3 vStar;
varying vec2 vShape;
void main() {
  vec2 xz = uSky.xy + position.xy * uSky.z;
  float km = (length(xz - uLimb.xy) * uLimb.w - 1.0) * uLimb.z;
  // (No star shows through the planet or its lit air, and the last air it is seen through dims and reddens it.)
  float seen = smoothstep(16.0, 90.0, km);
  vec3 tint = aTint.rgb * mix(vec3(1.0, 0.62, 0.36), vec3(1.0), smoothstep(16.0, 160.0, km));
  // (A point is never narrower than the picture's own grain, whatever the size of the picture: narrower, it would flicker as it
  // crosses the pixels. What it loses in sharpness on a small picture it loses in brightness, as a real picture made smaller does.)
  float scale = uSky.w / 1080.0;
  float sigma = max(aTint.a * scale, 0.62);
  float peak = position.z * (aTint.a * scale / sigma) * (aTint.a * scale / sigma);
  // (The camera is closed down for the day; as the light goes it opens, and the faint stars come out. They go out with the picture.)
  float open = uDusk > 0.0 ? pow(uGain, 0.42) * mix(0.3, 1.0, uEmber.w) : 1.0;
  vStar = tint * peak * open * seen * (1.0 - uSolo);
  gl_PointSize = ceil(6.0 * sigma) + 1.0;
  vShape = vec2(gl_PointSize, 0.5 / (sigma * sigma));
  gl_Position = seen > 0.0 ? projectionMatrix * viewMatrix * vec4(xz.x, 12.0, xz.y, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}`;

const STAR_FRAGMENT = /* glsl */ `
varying vec3 vStar;
varying vec2 vShape;
void main() {
  vec2 d = (gl_PointCoord - 0.5) * vShape.x;
  gl_FragColor = vec4(vStar * exp(-dot(d, d) * vShape.y), 0.0);
}`;

/** The colour of a star by its heat, from orange through white to blue white, and a share of how much of that colour it keeps. */
function tintOf(heat: number, keep: number): [number, number, number] {
  const stops: [number, number, number][] = [
    [1.0, 0.62, 0.36],
    [1.0, 0.8, 0.58],
    [1.0, 0.93, 0.82],
    [1.0, 1.0, 1.0],
    [0.82, 0.89, 1.0],
    [0.66, 0.78, 1.0],
  ];
  const at = Math.min(heat * (stops.length - 1), stops.length - 1.001);
  const a = stops[Math.floor(at)] as [number, number, number];
  const b = stops[Math.floor(at) + 1] as [number, number, number];
  const t = at - Math.floor(at);
  return [0, 1, 2].map((c) => 1 + ((a[c] as number) * (1 - t) + (b[c] as number) * t - 1) * keep) as [number, number, number];
}

/** The stars, as points under the mesh of space (they are of its part). Give the returned pair to the folder's list of things to dispose. */
export function createStars(ctx: Context, space: THREE.Mesh): { geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial } {
  const seen = views();
  const radius = LIMB.r * KM;
  const everSeen = (x: number, y: number): boolean => {
    for (const v of seen) {
      const sx = x * v.cos + y * v.sin;
      const sy = x * v.sin - y * v.cos;
      if (Math.abs(sx) > FILM_ASPECT + 0.03 || Math.abs(sy) > 1.03) continue;
      if (Math.hypot(v.camX + x * v.half - v.limbX, v.camZ + y * v.half - v.limbZ) > radius + 12) return true;
    }
    return false;
  };
  const place: number[] = [];
  const tint: number[] = [];
  const put = (x: number, y: number, i: number, peak: number): void => {
    if (!everSeen(x, y)) return;
    // (Only the bright ones are a little wider, as a lens draws them, and they keep more of their colour.)
    const wide = 0.62 + 0.4 * Math.min(1, Math.max(0, Math.log10(peak / 0.5)));
    const [r, g, b] = tintOf(Math.pow(hash(i, 4), 0.8), 0.45 + 0.55 * Math.min(1, peak / 0.3));
    place.push(x, y, peak * (0.7 + 0.3 * RICH));
    tint.push(r, g, b, wide);
  };
  // Many faint and few bright: the count of stars brighter than a given brightness falls as one over that brightness.
  const add = (x: number, y: number, i: number, dim: number): void => put(x, y, i, Math.min(FAINTEST / (1 - hash(i, 3)), 1.2) * dim);
  const SIDE = 4.3;
  const most = 1 + BAND.more * 1.6;
  const tries = Math.round(FIELD * RICH * SIDE * SIDE * most);
  for (let i = 0; i < tries; i++) {
    const x = (hash(i, 0) - 0.5) * SIDE;
    const y = (hash(i, 1) - 0.5) * SIDE;
    const band = bandAt(x, y);
    if (hash(i, 2) * most > 1 + BAND.more * band) continue;
    // (The crowd of the band is the far, faint crowd: what it adds is mostly dim.)
    add(x, y, i, hash(i, 5) * (1 + BAND.more * band) < 1 ? 1 : 0.55);
  }
  let n = tries;
  for (const [cx, cy, wide, count] of CLUSTERS) {
    for (let k = 0; k < Math.round(count * (0.6 + 0.4 * RICH)); k++, n++) {
      const r = wide * Math.sqrt(-2 * Math.log(1 - hash(n, 0) * 0.999));
      const a = 2 * Math.PI * hash(n, 1);
      add(cx + r * Math.cos(a), cy + r * Math.sin(a), n, 2.2);
    }
  }
  // And a few that the eye finds first, alone in the field: they are what is left of the sky on a small screen.
  for (let k = 0; k < Math.round(BRIGHT * Math.sqrt(RICH) * SIDE * SIDE); k++, n++) put((hash(n, 0) - 0.5) * SIDE, (hash(n, 1) - 0.5) * SIDE, n, 1.2 * Math.pow(BRIGHTEST / 1.2, hash(n, 3)));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(place, 3));
  geometry.setAttribute('aTint', new THREE.Float32BufferAttribute(tint, 4));
  const sky = new THREE.Vector4(0, 0, 1, 1080);
  const material = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, uSky: { value: sky } },
    vertexShader: STAR_VERTEX,
    fragmentShader: STAR_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = space.renderOrder + 0.5;
  // The camera of this very sample and the size of the picture it is drawn into: the stars take both here, so they sit where the lens puts them.
  points.onBeforeRender = (renderer, _scene, camera) => {
    const target = renderer.getRenderTarget();
    const height = target ? target.height : renderer.getDrawingBufferSize(new THREE.Vector2()).y;
    sky.set(camera.position.x, camera.position.z, camera.position.y * HALF_TAN, height / 2);
  };
  space.add(points);
  return { geometry, material };
}
