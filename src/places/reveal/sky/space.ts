// What lies beyond the planet's edge: the stars, the band of the galaxy behind them, a small moon, and the edge of the air itself.
// The stars are points at infinity, so they are placed by the direction the camera sees them in and not on the ground: as the camera
// rises the planet's edge draws back over them, and they turn only with the camera. The band and the moon stand with them.
// A place in the sky is given in the sky's own measure: x to the right and y down the master picture, in half heights of the view.
import * as THREE from 'three';
import { FILM_ASPECT, HALF_TAN, KM, LIMB, LIMB_FOLLOW, RISE_LAST, X, Z, driftAt, poseAt } from '../shared/anchors';
import type { Context } from '../shared/context';
import { RIG_GLSL, RIG_UNIFORMS_GLSL } from '../shared/glsl';
import { BAND_CELLS } from './space-band';

/** How rich the field is: 1 is the film's. The count of stars goes with it, and their brightness a little. */
const RICH: number = 1;
/** Stars to a square half height of sky away from the band, at RICH 1. */
const FIELD = 9000;
/** The band of the galaxy: a point on its middle line, the way it runs, and how many more stars stand in its core than in the field. */
const BAND = { x: -1.55, y: -0.8, alongX: 0.96, alongY: 0.28, more: 5 };
/** Its picture (sky/space-band.jpg, 1520 x 480): where the picture begins along the band, how long and how wide it lies, half heights. */
const BAND_LIES = { from: -0.44, long: 1.9, wide: 0.6, texels: 800 };
/** The moon: where it stands in the sky, and how wide it is in pixels of a picture 3840 wide. */
const MOON = { x: -1.38, y: -0.93 };
const MOON_WIDE: number = 96;
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
/** How thick the far crowd of the galaxy stands at a place of the sky, 0 to 1: read from the table of its picture, so the grain of stars follows the picture's glow and thins in its dust lanes. */
function bandAt(x: number, y: number): number {
  const along = (x - BAND.x) * BAND.alongX + (y - BAND.y) * BAND.alongY;
  const across = -(x - BAND.x) * BAND.alongY + (y - BAND.y) * BAND.alongX;
  const rows = BAND_CELLS.length;
  const columns = (BAND_CELLS[0] as string).length;
  const u = ((along - BAND_LIES.from) / BAND_LIES.long) * columns - 0.5;
  const v = (across / BAND_LIES.wide + 0.5) * rows - 0.5;
  const cell = (i: number, j: number): number => (i < 0 || j < 0 || i >= columns || j >= rows ? 0 : ((BAND_CELLS[j] as string).charCodeAt(i) - 97) / 25);
  const i = Math.floor(u);
  const j = Math.floor(v);
  const fu = u - i;
  const fv = v - j;
  return (cell(i, j) * (1 - fu) + cell(i + 1, j) * fu) * (1 - fv) + (cell(i, j + 1) * (1 - fu) + cell(i + 1, j + 1) * fu) * fv;
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
    [1.0, 0.84, 0.66],
    [1.0, 0.97, 0.92],
    [0.88, 0.93, 1.0],
    [0.76, 0.85, 1.0],
    [0.64, 0.76, 1.0],
  ];
  const at = Math.min(heat * (stops.length - 1), stops.length - 1.001);
  const a = stops[Math.floor(at)] as [number, number, number];
  const b = stops[Math.floor(at) + 1] as [number, number, number];
  const t = at - Math.floor(at);
  return [0, 1, 2].map((c) => 1 + ((a[c] as number) * (1 - t) + (b[c] as number) * t - 1) * keep) as [number, number, number];
}

/** The stars and the moon, under the mesh of space (they are of its part), and the band in its own material. Give what is returned to the folder's list of things to dispose. */
export function createSpace(ctx: Context, space: THREE.Mesh): { geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial }[] {
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
  const most = 1 + BAND.more;
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
  space.add(points);

  // The band lies in the black itself: the material of space reads its picture.
  const levels = new THREE.Vector2(0, 0);
  const black = (space.material as THREE.ShaderMaterial).uniforms;
  black.uSky = { value: sky };
  black.uLevels = { value: levels };
  black.uBandMap = { value: ctx.assets.texture('sky/space-band.jpg', { repeat: false }) };
  black.uBandAt = { value: new THREE.Vector4(BAND.x, BAND.y, BAND.alongX, BAND.alongY) };
  black.uBandLies = { value: new THREE.Vector3(BAND_LIES.from, 1 / BAND_LIES.long, 1 / BAND_LIES.wide) };

  // The moon: a small disc in front of the stars, lit by the scene's own sun.
  const moonRadius = MOON_WIDE / 2160;
  const moonGeometry = new THREE.PlaneGeometry(2, 2);
  const moonMaterial = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, uSky: { value: sky }, uLevels: { value: levels }, uMoon: { value: new THREE.Vector3(MOON.x, MOON.y, moonRadius) }, uMoonMap: { value: ctx.assets.texture('sky/space-moon.png', { kind: 'data', repeat: false }) } },
    vertexShader: MOON_VERTEX,
    fragmentShader: MOON_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  const moon = new THREE.Mesh(moonGeometry, moonMaterial);
  moon.frustumCulled = false;
  moon.renderOrder = space.renderOrder + 0.6;
  space.add(moon);

  // The camera of this very sample and the size of the picture it is drawn into: space takes both here, before it and the things
  // under it are drawn, so the stars, the band and the moon sit where the lens puts them. (And how coarse a level of each picture
  // a pixel of this picture needs: read without a footprint, so nothing swims.)
  space.onBeforeRender = (renderer, _scene, camera) => {
    const target = renderer.getRenderTarget();
    const height = target ? target.height : renderer.getDrawingBufferSize(new THREE.Vector2()).y;
    sky.set(camera.position.x, camera.position.z, camera.position.y * HALF_TAN, height / 2);
    levels.set(Math.max(0, Math.log2(BAND_LIES.texels / (height / 2))), Math.max(0, Math.log2(504 / (moonRadius * height))));
  };
  return [
    { geometry, material },
    { geometry: moonGeometry, material: moonMaterial },
  ];
}

// The moon. Its face is a picture of how light the ground is and how it slopes (assets-src/reveal/space/make_space_moon.py); the
// light on it is the sun of the scene, so by day it is most of a disc lit from the side the planet's day is on, and as the sun goes
// under it thins to a crescent. Its dark side is black: it only hides the stars behind it.
const MOON_VERTEX = /* glsl */ `
uniform vec4 uSky;
uniform vec3 uMoon;
varying vec2 vDisc;
varying vec2 vOver;
void main() {
  vDisc = position.xy * 1.06;
  vOver = uSky.xy + (uMoon.xy + vDisc * uMoon.z) * uSky.z;
  gl_Position = projectionMatrix * viewMatrix * vec4(vOver.x, 12.0, vOver.y, 1.0);
}`;

const MOON_FRAGMENT = /* glsl */ `
${RIG_UNIFORMS_GLSL}
uniform vec4 uSky;
uniform vec2 uLevels;
uniform vec3 uMoon;
uniform sampler2D uMoonMap;
varying vec2 vDisc;
varying vec2 vOver;
void main() {
  float r = length(vDisc);
  // (The rim of the disc is softened over a pixel of this picture. And the moon is behind the planet: it is not there where the
  // planet or its lit air stands before it, as the stars are not.)
  float pixel = 1.0 / (uMoon.z * uSky.w);
  float km = (length(vOver - uLimb.xy) * uLimb.w - 1.0) * uLimb.z;
  float a = (1.0 - smoothstep(1.0 - pixel, 1.0 + pixel, r)) * smoothstep(16.0, 90.0, km);
  vec3 face = textureLod(uMoonMap, vDisc * (252.0 / 512.0) + 0.5, uLevels.y).rgb;
  // In the sky's measure: x right, y down the master, z toward the eye. The sun of the rig is x, up, z.
  float pz = sqrt(max(1.0 - r * r, 0.0));
  vec3 ball = vec3(vDisc, pz);
  vec3 sun = normalize(vec3(uSunDir.x, uSunDir.z, uSunDir.y));
  vec2 slope = (face.gb - 0.5) * 4.4;
  vec3 ground = normalize(ball - vec3(slope, 0.0) * pz * 1.5);
  float lit = max(dot(ground, sun), 0.0);
  // (Dust throws the light back much the same from every slant: the disc does not darken to its rim as a smooth ball would.)
  float shade = mix(lit, 2.0 * lit / (lit + max(pz, 0.08)), 0.6) * smoothstep(-0.03, 0.1, dot(ball, sun));
  // (The camera opens as the light goes, and the lit part of the moon brightens with it, held short of white. It goes out with the picture.)
  float open = uDusk > 0.0 ? pow(uGain, 0.3) * uEmber.w : 1.0;
  vec3 colour = vec3(1.0, 0.97, 0.92) * face.r * shade * 0.42 * open;
  gl_FragColor = vec4(colour * a * (1.0 - uSolo), a * (1.0 - uSolo));
}`;

// The edge of the planet. Inside it the air thickens to a blue band; outside it thins into the black within a few tens of kilometres,
// and behind the black stand the stars (points under the mesh of space, above).
// The line of lit air is a few kilometres deep, and on a small picture that is less than a pixel: drawn as it stands it broke into
// beads. So every layer of the air is drawn as its mean over the pixel it falls in (the footprint is taken once, at the top), and
// the line is one clean line at any size, only fainter where the picture is too small to hold it.
const EDGE_GLSL = /* glsl */ `
${RIG_GLSL}
varying vec3 vWorld;
// The mean, over a width w about x, of a layer that is nothing below 0 and exp(-x / deep) above it.
float layerOver(float x, float deep, float w) {
  float h = 0.5 * w;
  if (x <= -h) return 0.0;
  if (x < h) return deep * (1.0 - exp(-(x + h) / deep)) / w;
  float q = h / deep;
  return exp(-x / deep) * (q < 0.3 ? 1.0 + q * q / 6.0 : (exp(q) - exp(-q)) / (2.0 * q));
}
// The dense air seen edge on, by day: a deep clear blue, never white.
const vec3 LINE = vec3(0.035, 0.27, 1.0);
`;

/** The black beyond the edge, and the last of the air against it. */
export const EDGE_SPACE_FRAGMENT = /* glsl */ `
${EDGE_GLSL}
uniform vec4 uSky;
uniform vec2 uLevels;
uniform sampler2D uBandMap;
uniform vec4 uBandAt;
uniform vec3 uBandLies;
void main() {
  float km = (limbShare(vWorld.xz) - 1.0) * uLimb.z;
  float w = max(1.5 * fwidth(km), 0.001);
  float cover = max(3.0, 0.75 * w);
  float a = smoothstep(-cover, cover, km);
  // The band of the galaxy, behind everything: its place is the sky's, like the stars'.
  vec2 from = (vWorld.xz - uSky.xy) / uSky.z - uBandAt.xy;
  vec2 lies = vec2((dot(from, uBandAt.zw) - uBandLies.x) * uBandLies.y, dot(from, vec2(-uBandAt.w, uBandAt.z)) * uBandLies.z + 0.5);
  vec3 band = textureLod(uBandMap, clamp(lies, 0.0, 1.0), uLevels.x).rgb;
  // (The air stands in layers, each thinner than the one under it: the dense air is one crisp bright blue line a few kilometres
  // deep against the planet, the clear air above it a narrow deeper blue, and the last thin air is all but black.)
  vec3 glow = LINE * 0.78 * layerOver(km, 7.0, w) + vec3(0.03, 0.16, 0.8) * 0.2 * layerOver(km, 20.0, w) + vec3(0.02, 0.06, 0.3) * 0.05 * layerOver(km, 64.0, w);
  vec3 colour = glow;
  if (uDusk > 0.0) {
    // The air at the edge keeps the sun longest, on the side the sun went: a twilight arc, warm against the planet and blue above,
    // and when that has gone a thin line of airglow all round.
    float sunH = sunHeight(vWorld.xz) + uTerm.w * 0.08;
    // (Layered as it is seen from orbit: red against the planet, orange, a pale band, and blue above. Held under the opening exposure.)
    float lowSun = uTerm.w * (1.0 - smoothstep(0.05, 0.32, sunH));
    vec3 layers = mix(mix(vec3(0.85, 0.13, 0.03), vec3(1.0, 0.46, 0.12), smoothstep(1.0, 12.0, km)), mix(vec3(0.8, 0.78, 0.7), vec3(0.2, 0.4, 0.95), smoothstep(22.0, 62.0, km)), smoothstep(9.0, 30.0, km));
    vec3 arc = mix(glow, layers * exp(-max(km, 0.0) / 34.0) * 0.5 * a, lowSun) * mix(1.0, sunSeen(sunH - 0.05) + 0.03 * skySeen(sunH), uTerm.w);
    float airglow = exp(-pow((km - 16.0) / 20.0, 2.0));
    colour = exposed(arc * uEmber.w * pow(uGain, -0.88) + vec3(0.2, 0.36, 0.8) * 0.0011 * airglow * uDusk * a);
  }
  // (By day the camera is closed down and the band is all but lost; as it opens the band comes up, and it goes out with the picture.
  // The air at the edge hides it as it hides the stars.)
  float open = uDusk > 0.0 ? pow(uGain, 0.8) * mix(0.15, 1.0, uEmber.w) : 1.0;
  // (Its colour is held back: the far crowd is pale, warm only at its core.)
  band = mix(vec3(dot(band, vec3(0.3, 0.5, 0.2))) * vec3(0.92, 0.97, 1.1), band, 0.55);
  colour += band * 0.028 * open * smoothstep(16.0, 90.0, km);
  gl_FragColor = vec4(colour * (1.0 - uSolo), a * (1.0 - uSolo));
}`;

/** The air inside the edge, added over the planet. */
export const EDGE_AIR_FRAGMENT = /* glsl */ `
${EDGE_GLSL}
void main() {
  float d = limbShare(vWorld.xz);
  float km = (d - 1.0) * uLimb.z;
  float w = max(1.5 * fwidth(km), 0.001);
  float cover = max(3.0, 0.75 * w);
  float inside = 1.0 - smoothstep(-cover, cover, km);
  // Inside the edge the eye looks along the air, not down through it: how much air the ray crosses is one over the cosine of its
  // slant, and at the very edge, where the planet curves away under it, some thirty times the air straight down. The clear air
  // scatters blue all the way in; it is thick only toward the edge.
  float mu = sqrt(max(1.0 - d * d, 0.0));
  float path = 1.0 / sqrt(mu * mu + 0.0009);
  // (Where this sheet begins the air it adds is nothing: the ground and the cloud carry their own air up to there.)
  float beyond = max(path - 2.3, 0.0);
  float clearAir = 1.0 - exp(-0.08 * beyond);
  // (And the dense air seen edge on is the same crisp blue line as outside the edge, sharper on this side: never a pale band.)
  vec3 colour = vec3(0.05, 0.17, 0.55) * 0.2 * clearAir * inside + LINE * (0.78 * layerOver(-km, 2.6, w) + 0.06 * layerOver(-km, 14.0, w));
  if (uDusk > 0.0) {
    float sunH = sunHeight(vWorld.xz) + uTerm.w * 0.05;
    vec3 arc = mix(vec3(1.0), mix(vec3(1.25, 0.5, 0.16), vec3(0.75, 0.85, 1.1), sunSeen(sunH - 0.12)) * sunSeen(sunH - 0.03) + 0.04 * skySeen(sunH), uTerm.w);
    colour = exposed(colour * arc * pow(uGain, -0.88));
  }
  gl_FragColor = vec4(colour * (1.0 - uSolo), 0.0);
}`;
