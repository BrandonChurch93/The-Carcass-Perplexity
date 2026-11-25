// The lake of the Eye: the still surface that mirrors the cliffs and the sky, the knee-deep shelf of the shallows with its amber mats,
// the shaft that goes straight down inside the shelf, and what rises at its centre.
import * as THREE from 'three';
import handoff from '../handoff.json';
import { DEEP, DEG, at, shoreAt, smooth } from '../layout';
import { lipAt, shelfDepth } from '../land/height';
import { ROCK_GLSL, rockUniforms } from '../land/rock';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL, RIG_VERTEX } from '../shared/glsl';
import { vnoise } from '../shared/noise';
import { WATER_GLSL, createMirror, waterUniforms } from './water';

export const PARTS: readonly string[] = ['lake', 'shallows', 'shaft', 'mats', 'riser'];

const RINGS = 21;
const LAPS = 12;

const FLOOR_VERTEX = /* glsl */ `
uniform float uLift;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  w.y += uLift;
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// The mats: where they grow, how thick, and the grain of the filaments, which lie combed toward the centre and sway.
const EDGE_BED = at(197.6, DEEP + 2);

const MATS_GLSL = /* glsl */ `
struct Mat {
  float cover;
  float strand;
  vec3 colour;
};
// Where the mats grow: beds drawn out toward the centre, with dark water between, thin toward the shore and gone at the lip.
float matBeds(vec3 p) {
  float r = length(p.xz);
  float shoreward = -landAt(p.xz).b;
  vec2 dir = p.xz / max(r, 1.0);
  float rays = 0.6 * vnoise(dir * 46.0 + vec2(r, -0.7 * r) / 85.0) + 0.4 * vnoise(dir * 150.0 + vec2(-0.6 * r, r) / 34.0 + 3.0);
  float blobs = 0.6 * vnoise(p.xz / 38.0) + 0.4 * vnoise(p.xz / 9.0 + 3.0);
  float beds = 0.72 * rays + 0.28 * blobs + 0.08 * vnoise(p.xz / 2.4);
  // A bed lies over the lip where the old bones are.
  beds += 0.1 * smoothstep(30.0, 6.0, length(p.xz - vec2(${EDGE_BED[0].toFixed(1)}, ${EDGE_BED[1].toFixed(1)})));
  return smoothstep(0.38, 0.55, beds) * smoothstep(2.0, 16.0, shoreward);
}
Mat matsAt(vec3 p) {
  Mat m;
  m.cover = 0.0;
  m.strand = 0.0;
  m.colour = vec3(0.0);
  float beds = matBeds(p);
  if (beds <= 0.0) return m;
  // The filaments lie combed from the shore toward the centre, in locks that swing round each other as hair does in a slow water, and sway.
  float r = length(p.xz);
  vec2 w = p.xz;
  vec2 bend = vec2(vnoise(w / 31.0), vnoise(w / 31.0 + 17.3)) - 0.5;
  vec2 curl = vec2(vnoise(w / 5.0 + 3.1), vnoise(w / 5.0 + 9.9)) - 0.5;
  vec2 lock = vec2(vnoise(w / 2.3 + 7.7), vnoise(w / 2.3 + 2.2)) - 0.5;
  vec2 kink = vec2(vnoise(w / 0.8 + 1.7), vnoise(w / 0.8 + 6.3)) - 0.5;
  float sway = 0.05 * sin(uTime * 0.7 + 6.28 * vnoise(w / 1.9)) + 0.016 * sin(uTime * 1.7 + 6.28 * vnoise(w / 0.37));
  // Across is metres round the lake, along is metres out from the middle. The seam of the angle lies in the east, under the brow.
  vec2 q = vec2(atan(p.z, -p.x) * 560.0 + sway, r) + vec2(20.0, 9.0) * bend + 3.2 * curl + 0.6 * lock + 0.14 * kink;
  // The locks: pools of dark water stand between them, and they end in wisps.
  float tress = 0.5 * vnoise(vec2(q.x / 0.55, q.y / 1.9)) + 0.3 * vnoise(vec2(q.x / 0.16, q.y / 1.1) + 4.0) + 0.2 * vnoise(vec2(q.x / 0.05, q.y / 0.7) + 9.0);
  m.cover = beds * smoothstep(0.43, 0.6, tress + 0.3 * (beds - 0.5));
  // On the crust of the lip, out of the water, they lie dry: thinner and darker.
  float dry = smoothstep(-0.03, 0.04, p.y);
  m.cover *= 1.0 - 0.7 * dry;
  m.cover *= 1.0 - 0.8 * dry * smoothstep(0.62, 0.4, tress);
  // The threads are the lines where long thin noise crosses its middle: they run, part and join. Three sizes, each laid a little across the last.
  float grain = fwidth(q.x);
  vec2 q2 = q + 0.5 * (vec2(vnoise(w / 1.1 + 4.4), vnoise(w / 1.1 + 8.8)) - 0.5);
  vec2 q3 = q + 0.3 * (vec2(vnoise(w / 0.6 + 2.4), vnoise(w / 0.6 + 5.8)) - 0.5);
  float a1 = vnoise(vec2(q.x * 21.0, q.y * 0.8) + 2.0);
  float a2 = vnoise(vec2(q2.x * 58.0, q2.y * 1.6) + 11.0);
  float a3 = vnoise(vec2(q3.x * 150.0, q3.y * 3.1) + 23.0);
  float l1 = 1.0 - smoothstep(0.02, 0.1, abs(a1 - 0.5));
  float l2 = 1.0 - smoothstep(0.02, 0.11, abs(a2 - 0.5));
  float l3 = 1.0 - smoothstep(0.02, 0.12, abs(a3 - 0.5));
  // From far off they are finer than a picture point: there they are let go to their mean, so that nothing glitters.
  float far1 = smoothstep(0.008, 0.035, grain);
  float far2 = smoothstep(0.003, 0.013, grain);
  float far3 = smoothstep(0.0012, 0.005, grain);
  l1 = mix(l1, 0.24, far1);
  l2 = mix(l2, 0.26, far2);
  l3 = mix(l3, 0.28, far3);
  // Not every thread is bright along its whole length.
  float lit = 0.35 + 0.65 * vnoise(vec2(q.x / 0.09, q.y / 0.5) + 31.0);
  float lines = max(max(l1, 0.85 * l2), 0.7 * l3) * mix(lit, 0.65, far2);
  m.strand = 0.5 + 0.5 * lines;
  float kind = 0.6 * vnoise(vec2(q.x / 2.1, q.y / 6.0) + 5.0) + 0.4 * vnoise(vec2(q.x / 0.5, q.y / 2.2));
  vec3 rust = vec3(0.11, 0.026, 0.009) * (1.0 - 0.3 * dry);
  vec3 amber = vec3(0.29, 0.1, 0.014) * (1.0 - 0.3 * dry);
  vec3 honey = vec3(0.62, 0.4, 0.08);
  vec3 body = mix(rust, amber, smoothstep(0.4, 0.7, kind)) * 0.4;
  vec3 thread = mix(mix(rust * 1.6, amber, smoothstep(0.3, 0.55, kind)), honey, max(l2, l3) * smoothstep(0.45, 0.7, kind));
  m.colour = mix(body, thread, lines);
  // From far off the beds are amber and gold in streaks, with brown between.
  m.colour = mix(m.colour, mix(vec3(0.2, 0.075, 0.016), vec3(0.6, 0.33, 0.055), smoothstep(0.35, 0.62, kind)), smoothstep(0.03, 0.25, grain));
  return m;
}`;

const FLOOR_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
${NOISE_GLSL}
${RIG_GLSL}
${ROCK_GLSL}
${WATER_GLSL}
${MATS_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  Rock k = rockAt(vWorld, n, 0.0);
  // Pale stone, stained where the mats lie on it.
  float stained = matBeds(vWorld);
  // Dark silt, with slabs of pale stone standing through it, pale gravel at the shore and a pale crust at the lip.
  float shoreward = -landAt(vWorld.xz).b;
  float slab = smoothstep(0.58, 0.68, 0.7 * vnoise(vWorld.xz / 6.3 + 2.0) + 0.3 * vnoise(vWorld.xz / 2.1));
  float crust = smoothstep(-0.14, -0.02, vWorld.y);
  slab = max(slab, crust);
  stained *= 1.0 - 0.85 * crust;
  vec3 pale = mix(k.albedo, vec3(0.6, 0.56, 0.47) * (0.6 + 0.6 * k.occ), 0.6);
  vec3 albedo = mix(vec3(0.085, 0.06, 0.045) * (0.7 + 0.5 * k.occ), pale, slab);
  // At the shore the floor is the gravel of the beach, wet and dark.
  albedo = mix(albedo, k.albedo * 0.42, smoothstep(7.0, 1.5, shoreward));
  // The crust is pale and pitted, with rims of darker scale.
  float pit = 0.6 * vnoise(vWorld.xz / 0.9 + 5.0) + 0.4 * vnoise(vWorld.xz / 0.23);
  albedo = mix(albedo, vec3(0.66, 0.63, 0.56) * (0.55 + 0.75 * pit) * (0.7 + 0.4 * k.occ), 0.75 * crust);
  albedo = mix(albedo, albedo * vec3(0.55, 0.3, 0.14), 0.7 * stained);
  // Out of the water the rim is wet stone; under it the stone is darker than it is dry.
  float dry = smoothstep(0.0, 0.14, vWorld.y);
  albedo *= mix(0.62, 0.8, dry);
  // Under the water the silt lies smooth.
  k.normal = normalize(mix(n, k.normal, mix(0.3, 1.0, max(slab, dry))));
  vec3 c = rigShade(vWorld, k.normal, v, albedo, mix(0.95, 0.4, smoothstep(-0.02, 0.03, vWorld.y) * (1.0 - 0.5 * dry)), k.occ) * sunk(vWorld);
  gl_FragColor = vec4(rigOut(throughWater(c, vWorld)), 1.0);
}`;

const MATS_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
${NOISE_GLSL}
${RIG_GLSL}
${WATER_GLSL}
${MATS_GLSL}
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  Mat m = matsAt(vWorld);
  float a = m.cover * m.strand;
  vec3 n = vec3(0.0, 1.0, 0.0);
  vec3 c = rigShade(vWorld, n, v, m.colour, 0.8, 0.6 + 0.4 * m.strand);
  // The filaments are thin: the sun comes through them.
  c += m.colour * uSunColour * (0.14 * sunAt(vec3(vWorld.x, 0.0, vWorld.z)) * m.strand);
  c = throughWater(c * sunk(vWorld), vWorld);
  float on = 1.0 - uSolo;
  gl_FragColor = vec4(c * a * on, a * on);
}`;

const SHAFT_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
${NOISE_GLSL}
${RIG_GLSL}
${ROCK_GLSL}
${WATER_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  // Far down nothing of the wall comes back up: there it is only the dark of the water, and is not worked out.
  vec3 reach = sunk(vWorld);
  if (reach.b < 0.035) {
    gl_FragColor = vec4(rigOut(throughWater(vec3(0.0), vWorld)), 1.0);
    return;
  }
  Rock k = rockAt(vWorld, n, 1.0);
  // Under the water the light comes from above alone: the wall is lit as an open face under the sky, and dies with depth.
  vec3 at = vec3(vWorld.x, 0.0, vWorld.z);
  vec3 e = skyIrradiance(normalize(k.normal + vec3(0.0, 0.7, 0.0))) * skyOpen(at) + uSunColour * (0.35 * sunAt(at) * max(dot(k.normal, normalize(vec3(uSunDir.x, 0.75, uSunDir.z))), 0.0));
  // The ledges hold their own shade, and the pale of the wall is gone a few metres down.
  float ledge = 0.45 + 0.55 * smoothstep(0.3, 0.6, 0.6 * vnoise(vec2(atan(vWorld.x, -vWorld.z) * 190.0, vWorld.y / 1.6)) + 0.4 * vnoise(vec2(atan(vWorld.x, -vWorld.z) * 700.0, vWorld.y / 0.5)));
  float down = -vWorld.y;
  vec3 fall = exp(-down * vec3(0.5, 0.2, 0.17));
  vec3 c = k.albedo * e * (k.occ * ledge / 3.14159) * reach * sqrt(reach) * 2.6 * fall;
  gl_FragColor = vec4(rigOut(throughWater(c, vWorld)), 1.0);
}`;

const FORM_VERTEX = /* glsl */ `
uniform float uSway;
uniform float uTime;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
  p = instanceMatrix * p;
  n = mat3(instanceMatrix) * n;
  #endif
  vec4 w = modelMatrix * p;
  #ifdef USE_INSTANCING
  float phase = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.21;
  w.x += uSway * 0.9 * sin(uTime * 0.31 + phase) * (0.5 + 0.5 * position.y);
  w.z += uSway * 0.7 * sin(uTime * 0.23 + phase * 1.7) * (0.5 + 0.5 * position.y);
  w.y += uSway * 0.5 * sin(uTime * 0.19 + phase * 0.6);
  #endif
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// Pale skin under water: the forms that hang in the deep, and what rises.
const FORM_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
uniform float uPale;
${NOISE_GLSL}
${RIG_GLSL}
${WATER_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float mottle = fbm(vWorld.xz * 0.6 + vWorld.y * 0.4);
  vec3 albedo = vec3(0.7, 0.68, 0.62) * (0.75 + 0.4 * mottle) * uPale;
  vec3 at = vec3(vWorld.x, max(vWorld.y, 0.0), vWorld.z);
  float wet = step(vWorld.y, domeAt(vWorld.xz));
  vec3 e = skyIrradiance(normalize(n + vec3(0.0, 0.6 * wet, 0.0))) * skyOpen(at) + uSunColour * (sunAt(at) * mix(max(dot(n, uSunDir), 0.0), 0.3 * max(n.y, 0.0), wet));
  vec3 c = albedo * e / 3.14159;
  c = mix(c, throughWater(c * sunk(vWorld), vWorld), wet);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const WATER_VERTEX = /* glsl */ `
uniform vec4 uDome;
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  float u = clamp(length(w.xz) / uDome.y, 0.0, 1.0);
  float k = 1.0 - u * u;
  w.y += uDome.x * k * k;
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const WATER_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
uniform sampler2D tMirror;
uniform mat4 uMirrorMatrix;
uniform vec3 uRing[${RINGS}];
uniform vec4 uLap[${LAPS}];
uniform float uRest;
uniform float uLens;
uniform vec3 uRestWater;
uniform vec3 uRestRing;
uniform float uRestRadius[9];
uniform float uRestWidth;
uniform vec3 uSkyMirror;
${NOISE_GLSL}
${RIG_GLSL}
${WATER_GLSL}
${MATS_GLSL}
void main() {
  vec3 p = vWorld;
  float r = length(p.xz);
  vec2 out2 = p.xz / max(r, 1e-3);
  // The slope of the surface: the rings from the centre, the rings where something drinks, the dome, and a breath of nothing at all.
  vec2 slope = vec2(0.0);
  if (r < 620.0) {
    float dr = 0.0;
    for (int i = 0; i < ${RINGS}; i++) {
      vec3 g = uRing[i];
      float x = (r - g.x) / g.y;
      dr -= g.z * 2.0 * x / g.y * exp(-x * x);
    }
    float u = clamp(r / uDome.y, 0.0, 1.0);
    dr += uDome.x * 2.0 * (1.0 - u * u) * (-2.0 * u / uDome.y);
    slope += out2 * dr;
  }
  if (r > 470.0) for (int i = 0; i < ${LAPS}; i++) {
    vec4 l = uLap[i];
    vec2 d = p.xz - l.xy;
    float m = length(d);
    if (l.w > 0.0 && m < 14.0) {
      float ph = m * 7.0 - (uTime + l.z) * 6.2;
      float env = l.w * 0.0045 * exp(-m / 2.6) * smoothstep(0.05, 0.5, m);
      slope += d / max(m, 1e-3) * (env * 7.0 * cos(ph));
    }
  }
  vec2 q = p.xz * 0.045 + vec2(uTime * 0.02, uTime * 0.013);
  slope += 0.0016 * vec2(vnoise(q) - vnoise(q + vec2(0.7, 0.0)), vnoise(q + vec2(3.1, 1.7)) - vnoise(q + vec2(3.1, 2.4)));
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
  vec3 v = normalize(cameraPosition - p);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float f = 0.02 + 0.98 * pow(1.0 - nv, 4.0);
  vec4 m4 = uMirrorMatrix * vec4(p.x, 0.0, p.z, 1.0);
  vec3 bent = (viewMatrix * vec4(n.x, 0.0, n.z, 0.0)).xyz;
  vec2 uv = m4.xy / m4.w + vec2(bent.x, -bent.z) * uLens * 0.9;
  vec4 seen = texture2D(tMirror, clamp(uv, 0.001, 0.999));
  // The sky is not drawn into the mirror: the water takes it from the rig, and darker than it is, as deep water under a low sun does.
  vec3 rd = reflect(-v, n);
  vec3 sky = skyRadiance(vec3(rd.x, abs(rd.y), rd.z)) * uSkyMirror * mix(1.0, 0.4, smoothstep(0.06, 0.45, abs(rd.y)));
  // The land stands in the water darker than it stands in the air.
  vec3 refl = seen.rgb * vec3(0.44, 0.48, 0.55) + (1.0 - seen.a) * sky;
  refl = mix(refl, sky, smoothstep(0.75, 0.95, v.y));
  // The dome is no flat mirror: its slopes throw back the dim upper sky, and it stands dark on the bright water.
  float du = clamp(r / uDome.y, 0.0, 1.0);
  float swell = (1.0 - du * du) * clamp(uDome.x / 2.0, 0.0, 1.0);
  float hump = smoothstep(0.0, 0.45, swell);
  refl = mix(refl, refl * 0.3 + sky * 0.1, hump);
  f = max(f, 0.8 * hump);
  // Where the mats have grown up to the surface it is not a mirror at all.
  if (r > 470.0) f *= 1.0 - mix(0.5, 0.94, smoothstep(25.0, 220.0, length(cameraPosition - p))) * matBeds(p);
  vec4 c = vec4(refl * f, f);
  // The last second of the place: the flat picture the rise begins with.
  if (uRest > 0.0) {
    float ring = 0.0;
    for (int i = 0; i < 9; i++) {
      float w = uRestRadius[i] * uRestWidth * 0.5;
      float e = fwidth(r) * 0.7;
      ring = max(ring, 1.0 - smoothstep(w - e, w + e, abs(r - uRestRadius[i])));
    }
    c = mix(c, vec4(mix(uRestWater, uRestRing, ring), 1.0), uRest);
  }
  float on = 1.0 - uSolo;
  gl_FragColor = vec4(c.rgb * on, c.a * on);
}`;

// The bearings of the columns of the floor and of the wall under it: even all round, and fine where the edge shot stands on the lip.
function bearings(): number[] {
  const list: number[] = [];
  for (let i = 0; i < 1024; i++) list.push((i / 1024) * 360);
  for (let b = 190; b <= 204.5; b += 0.02) list.push(b);
  list.sort((p, q) => p - q);
  const out = list.filter((b, i) => i === 0 || b - (list[i - 1] as number) > 0.004);
  out.push(360);
  return out;
}

function floorGeometry(): THREE.BufferGeometry {
  const around = bearings();
  const COLS = around.length - 1;
  const FINE = 45;
  const ROWS = FINE + 40;
  const positions = new Float32Array((COLS + 1) * (ROWS + 1) * 3);
  for (let i = 0; i <= COLS; i++) {
    const a = ((around[i] as number) % 360) * DEG;
    const lip = lipAt(a);
    const shore = shoreAt(a / DEG) - 4.6;
    for (let j = 0; j <= ROWS; j++) {
      const r = j <= FINE ? lip + j * 0.2 : lip + FINE * 0.2 + (shore - lip - FINE * 0.2) * ((j - FINE) / (ROWS - FINE));
      const x = Math.sin(a) * r;
      const z = -Math.cos(a) * r;
      const o = (i * (ROWS + 1) + j) * 3;
      positions[o] = x;
      positions[o + 1] = -shelfDepth(x, z, shore + 4.6 - r) - (j === ROWS ? 0.03 : 0);
      positions[o + 2] = z;
    }
  }
  return grid(positions, COLS, ROWS + 1, false);
}

function grid(positions: Float32Array, cols: number, rows: number, inward: boolean): THREE.BufferGeometry {
  const index = new Uint32Array(cols * (rows - 1) * 6);
  let n = 0;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j;
      const b = (i + 1) * rows + j;
      if (inward) {
        index[n++] = a;
        index[n++] = a + 1;
        index[n++] = b;
        index[n++] = b;
        index[n++] = a + 1;
        index[n++] = b + 1;
      } else {
        index[n++] = a;
        index[n++] = b;
        index[n++] = a + 1;
        index[n++] = b;
        index[n++] = b + 1;
        index[n++] = a + 1;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeVertexNormals();
  return g;
}

const DEPTHS = [0, 0.2, 0.5, 0.9, 1.4, 2, 2.8, 3.8, 5, 6.5, 8.5, 11, 14, 18, 23, 29, 36, 45, 57, 73, 94, 122, 160, 215, 290, 400];

function shaftGeometry(): THREE.BufferGeometry {
  const around = bearings();
  const COLS = around.length - 1;
  const R = DEPTHS.length;
  const positions = new Float32Array((COLS + 1) * R * 3);
  for (let i = 0; i <= COLS; i++) {
    const a = ((around[i] as number) % 360) * DEG;
    const lip = lipAt(a);
    const top = -shelfDepth(Math.sin(a) * lip, -Math.cos(a) * lip, shoreAt(a / DEG) - lip);
    for (let j = 0; j < R; j++) {
      const d = DEPTHS[j] as number;
      // Under the lip the wall falls away in a broken slope and then sheer, in ledges, so that it is seen from the lip.
      const ledges = 7 * (vnoise(Math.cos(a) * 60 + 2, Math.sin(a) * 60 + d / 7) - 0.5) + 3 * (vnoise(Math.cos(a) * 190, Math.sin(a) * 190 + d / 2.5) - 0.5);
      const r = lip - 0.3 * smooth(0, 0.7, d) - 6.5 * (1 - Math.exp(-d / 7)) - 0.13 * d + ledges * smooth(1.5, 12, d);
      const o = (i * R + j) * 3;
      positions[o] = Math.sin(a) * r;
      positions[o + 1] = top - d;
      positions[o + 2] = -Math.cos(a) * r;
    }
  }
  return grid(positions, COLS, R, true);
}

function surfaceGeometry(): THREE.BufferGeometry {
  const COLS = 384;
  const radii: number[] = [];
  for (let r = 0.5; r < 64; r += 1) radii.push(r);
  for (let r = 64; r < 1020; r *= 1.055) radii.push(r);
  radii.push(1020);
  const R = radii.length;
  const positions = new Float32Array(((COLS + 1) * R + 1) * 3);
  for (let i = 0; i <= COLS; i++) {
    const a = ((i % COLS) / COLS) * Math.PI * 2;
    for (let j = 0; j < R; j++) {
      const o = (i * R + j) * 3;
      positions[o] = Math.sin(a) * (radii[j] as number);
      positions[o + 1] = 0;
      positions[o + 2] = -Math.cos(a) * (radii[j] as number);
    }
  }
  const g = grid(positions, COLS, R, false);
  // The middle: a fan to the centre.
  const index = Array.from((g.getIndex() as THREE.BufferAttribute).array);
  const centre = (COLS + 1) * R;
  for (let i = 0; i < COLS; i++) index.push(centre, (i + 1) * R, i * R);
  g.setIndex(index);
  return g;
}

export function create(ctx: Context): Piece {
  const rig = ctx.rig.uniforms;
  const rock = rockUniforms(ctx);
  const water = waterUniforms();
  const mirror = createMirror();
  const lake = new THREE.Group();

  const floorShape = floorGeometry();
  const floorMaterial = new THREE.ShaderMaterial({ uniforms: { ...rig, ...rock, ...water, uLift: { value: 0 } }, vertexShader: FLOOR_VERTEX, fragmentShader: FLOOR_FRAGMENT });
  const floor = new THREE.Mesh(floorShape, floorMaterial);
  floor.frustumCulled = false;
  lake.add(ctx.parts.built('shallows', floor));

  const matsMaterial = new THREE.ShaderMaterial({
    uniforms: { ...rig, ...water, uLift: { value: 0.05 } },
    vertexShader: FLOOR_VERTEX,
    fragmentShader: MATS_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const mats = new THREE.Mesh(floorShape, matsMaterial);
  mats.frustumCulled = false;
  mats.renderOrder = 1;
  lake.add(ctx.parts.built('mats', mats));

  const shaftMaterial = new THREE.ShaderMaterial({ uniforms: { ...rig, ...rock, ...water }, vertexShader: RIG_VERTEX, fragmentShader: SHAFT_FRAGMENT });
  const shaft = new THREE.Mesh(shaftGeometry(), shaftMaterial);
  shaft.frustumCulled = false;
  const formMaterial = new THREE.ShaderMaterial({ uniforms: { ...rig, ...water, uSway: { value: 1 }, uPale: { value: 0.5 } }, vertexShader: FORM_VERTEX, fragmentShader: FORM_FRAGMENT });
  // The pale forms that hang upright in the deep, far down, most of them under the lip the camera comes to.
  const rng = ctx.rng('shaft');
  const FORMS = 70;
  const forms = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 12), formMaterial, FORMS);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < FORMS; i++) {
    const b = i < 40 ? rng.range(176, 222) : rng.range(0, 360);
    const a = b * DEG;
    const r = lipAt(a) - rng.range(22, 150);
    const size = rng.range(1.1, 2.6);
    dummy.position.set(Math.sin(a) * r, -rng.range(38, 80), -Math.cos(a) * r);
    dummy.rotation.set(rng.range(-0.12, 0.12), rng.range(0, 6.28), rng.range(-0.12, 0.12));
    dummy.scale.set(size * 0.34, size * rng.range(2.2, 4.2), size * 0.34 * rng.range(0.7, 1));
    dummy.updateMatrix();
    forms.setMatrixAt(i, dummy.matrix);
  }
  forms.frustumCulled = false;
  lake.add(ctx.parts.built('shaft', shaft, forms));
  lake.add(forms);

  // What rises: a pale back under a dome of water, never the whole of it, and thin pale tips that break the surface around it.
  const riserMaterial = new THREE.ShaderMaterial({ uniforms: { ...rig, ...water, uSway: { value: 0 }, uPale: { value: 0.8 } }, vertexShader: FORM_VERTEX, fragmentShader: FORM_FRAGMENT });
  const back = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), riserMaterial);
  back.frustumCulled = false;
  const TIPS = 9;
  const tipShape = new THREE.LatheGeometry(
    [0, 0.08, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92, 1].map((t) => new THREE.Vector2(0.9 * (1 - t) ** 0.7 * (1 + 0.15 * Math.sin(t * 9)) + 0.02, t * 7 - 3.5)),
    14,
  );
  const tips = new THREE.InstancedMesh(tipShape, riserMaterial, TIPS);
  tips.frustumCulled = false;
  const tipAt: [number, number, number][] = [];
  const scatter = ctx.rng('riser');
  for (let i = 0; i < TIPS; i++) tipAt.push([(i / TIPS) * 360 + scatter.range(-16, 16), scatter.range(26, 110), scatter.range(0.14, 0.3)]);
  lake.add(ctx.parts.built('riser', back, tips));
  lake.add(tips);

  const rings = Array.from({ length: RINGS }, () => new THREE.Vector3(0, 1, 0));
  const laps = Array.from({ length: LAPS }, () => new THREE.Vector4(0, 0, 0, 0));
  const restRadius = handoff.ringRadii.map((share) => share * handoff.eyeHalfHeightMetres);
  const linear = (hex: string): THREE.Vector3 => {
    const c = new THREE.Color(hex);
    return new THREE.Vector3(c.r, c.g, c.b);
  };
  const surfaceMaterial = new THREE.ShaderMaterial({
    uniforms: {
      ...rig,
      ...water,
      ...mirror.uniforms,
      uRing: { value: rings },
      uLap: { value: laps },
      uRest: { value: 0 },
      uLens: { value: 1 },
      uRestWater: { value: linear(handoff.water) },
      uRestRing: { value: linear(handoff.ring) },
      uRestRadius: { value: restRadius },
      uRestWidth: { value: handoff.ringWidth },
      uSkyMirror: { value: new THREE.Vector3(0.19, 0.26, 0.4) },
    },
    vertexShader: WATER_VERTEX,
    fragmentShader: WATER_FRAGMENT,
    transparent: true,
    depthWrite: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const surface = new THREE.Mesh(surfaceGeometry(), surfaceMaterial);
  surface.frustumCulled = false;
  surface.renderOrder = 2;
  lake.add(ctx.parts.built('lake', surface));
  ctx.scene.add(lake);

  const rise = ctx.events.rise;
  const end = ctx.events.end;
  const dome = water.uDome as THREE.IUniform<THREE.Vector4>;
  const euler = new THREE.Euler();

  return {
    setTime: (t) => {
      const swell = smooth(rise - 1.7, rise - 0.15, t) * (1 - smooth(rise + 0.8, rise + 2.5, t));
      const breathe = 1 + 0.04 * Math.sin(t * 2.3);
      dome.value.x = 8.5 * swell * breathe;
      back.visible = swell > 0.001;
      back.scale.set(22, 5.4 * swell * breathe * smooth(0.3, 1, swell) + 0.01, 19);
      back.position.set(6, -1.6, -4);
      tipAt.forEach(([bearing, r, size], i) => {
        const up = smooth(0.25 + 0.05 * (i % 4), 0.9, swell);
        const a = bearing * DEG;
        dummy.position.set(Math.sin(a) * r, -3.9 * size + 6.4 * size * up + 0.05 * Math.sin(t * 1.7 + i), -Math.cos(a) * r);
        dummy.rotation.copy(euler.set(0.2 * Math.sin(i * 2.1), i * 1.9, 0.25 * Math.cos(i * 1.3)));
        dummy.scale.setScalar(up > 0 ? size : 0);
        dummy.updateMatrix();
        tips.setMatrixAt(i, dummy.matrix);
      });
      tips.instanceMatrix.needsUpdate = true;

      // The rings from the centre: a slow set that is always leaving, a fast set thrown by the rise, and the set that comes to rest for the handoff.
      rings.forEach((ring, i) => {
        let radius = 0;
        let width = 1;
        let height = 0;
        if (i < 7) {
          const age = t - (-11.6 + 2.6 * i);
          const life = 13.5;
          if (age > 0 && age < life) {
            radius = 6 + 15 * age;
            width = 2.2;
            height = 0.05 * Math.sin((Math.PI * age) / life);
          }
        } else if (i < 12) {
          const age = t - (rise - 1.2 + 0.62 * (i - 7));
          const life = 2.7;
          if (age > 0 && age < life) {
            radius = 38 + 44 * age;
            width = 2.6;
            height = 0.16 * Math.sin((Math.PI * age) / life);
          }
        } else {
          const k = i - 12;
          const from = rise + 0.3 + 0.1 * (8 - k);
          const grown = smooth(from, from + end - 1 - rise - 1.1, t);
          const u = grown * grown * (3 - 2 * grown);
          radius = (restRadius[k] as number) * u;
          width = Math.max(0.4, radius * handoff.ringWidth * 0.5);
          height = u > 0 ? 0.035 * width * Math.sin(Math.PI * Math.min(1, u * 1.4)) + 0.02 * width * u : 0;
        }
        ring.set(radius, width, height);
      });
      laps.forEach((lap, i) => {
        const from = ctx.laps[i];
        if (from) lap.set(from.x, from.z, from.offset, from.strength);
        else lap.set(0, 0, 0, 0);
      });
      (surfaceMaterial.uniforms.uRest as THREE.IUniform<number>).value = smooth(end - 1.5, end - 0.35, t);
    },
    beforeSample: (renderer, camera) => {
      (surfaceMaterial.uniforms.uLens as THREE.IUniform<number>).value = camera.projectionMatrix.elements[5] as number;
      mirror.render(renderer, ctx.scene, camera, [lake, ...ctx.unmirrored]);
    },
    resize: (width, height) => mirror.resize(width, height),
    dispose: () => {
      mirror.dispose();
      for (const m of [floor, shaft, forms, back, tips, surface]) m.geometry.dispose();
      for (const m of [floorMaterial, matsMaterial, shaftMaterial, formMaterial, riserMaterial, surfaceMaterial]) m.dispose();
    },
  };
}
