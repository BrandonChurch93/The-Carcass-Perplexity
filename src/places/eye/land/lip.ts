// The lip of the shore before the shore camera: wet gravel and grit standing out of the water at the lower left of its picture.
// The stones are the shore sheet's own, raised by its height sheet on a fine fan of mesh, so each has a side and hides what lies behind it.
import * as THREE from 'three';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { SHORE_LAY_GLSL } from './lay';
import { BAY, landHeight } from './height';
import { LOD_GLSL, WARM_GLSL } from './lod';

/** The fan of ground the lip is drawn on: metres ahead of the shore camera's key place, and the tangent of the bearing off its line of sight. */
export const LIP = { ahead0: 3.6, ahead1: 15, side0: -0.95, side1: 0.12, cell: 0.0025 };

/** Whether a place of the world lies on the fan: the pebbles of the old shore are not laid there. */
export function onLip(x: number, z: number): boolean {
  const ahead = (x - BAY.x) * BAY.fx + (z - BAY.z) * BAY.fz;
  const aside = (z - BAY.z) * BAY.fx - (x - BAY.x) * BAY.fz;
  return ahead > LIP.ahead0 && ahead < LIP.ahead1 && aside > LIP.side0 * ahead && aside < LIP.side1 * ahead;
}

export function lipGeometry(): THREE.BufferGeometry {
  const rows: number[] = [];
  for (let a = LIP.ahead0; a < LIP.ahead1; a *= 1 + LIP.cell) rows.push(a);
  const cols: number[] = [];
  for (let t = LIP.side0; t < LIP.side1; t += LIP.cell) cols.push(t);
  const nu = cols.length;
  const nv = rows.length;
  const positions = new Float32Array(nu * nv * 3);
  const cells = new Float32Array(nu * nv);
  for (let j = 0; j < nv; j++) {
    const ahead = rows[j] as number;
    for (let i = 0; i < nu; i++) {
      const aside = (cols[i] as number) * ahead;
      const x = BAY.x + ahead * BAY.fx - aside * BAY.fz;
      const z = BAY.z + ahead * BAY.fz + aside * BAY.fx;
      const o = (j * nu + i) * 3;
      positions[o] = x;
      positions[o + 1] = Math.max(-0.3, landHeight(x, z));
      positions[o + 2] = z;
      cells[j * nu + i] = LIP.cell * ahead;
    }
  }
  // Only the ground that can stand out of the water is drawn: the bed under it is the lake's.
  const index: number[] = [];
  const dry = (k: number): boolean => (positions[k * 3 + 1] as number) > -0.13;
  for (let j = 0; j < nv - 1; j++) {
    for (let i = 0; i < nu - 1; i++) {
      const a = j * nu + i;
      const b = a + 1;
      const c = a + nu;
      const d = c + 1;
      if (dry(a) || dry(b) || dry(c) || dry(d)) index.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aCell', new THREE.BufferAttribute(cells, 1));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(index), 1));
  geometry.computeBoundingSphere();
  return geometry;
}

// Metres of stone over the ground in x, and in y how much of it is a stone that stands. `level` is the base two logarithm of the
// metres between one reading and the next. The sheet is the shore sheet at a quarter of the size it was shot at, so its cobbles are
// pebbles and its pebbles grit, and the same sheet again large and turned, whose cobbles are the stones that stand out of the grit.
const LIP_GLSL = /* glsl */ `
uniform sampler2D tShorePH;
${SHORE_LAY_GLSL}
vec2 lipHigh(vec2 xz, float level) {
  // Both are read a level and more above the mesh: the sheet's height is its tone, sharp at every fleck of weed, and raised texel by
  // texel it is a field of thorns. Read soft, each stone is one round back.
  float fine = shoreHigh(tShorePH, xz, level + 10.3);
  vec2 t = vec2(xz.x * 0.82 + xz.y * 0.57, -xz.x * 0.57 + xz.y * 0.82);
  float stand = smoothstep(0.42, 0.9, textureLod(tShorePH, t / vec2(6.4, 3.6) + 0.37, max(level + 9.6, 4.0)).r);
  // A standing stone keeps the grain of the small ones on its back, so no top is a flat table.
  return vec2(0.065 * fine + 0.075 * stand * (0.6 + 0.8 * fine), stand);
}`;

export const LIP_VERTEX = /* glsl */ `
attribute float aCell;
varying vec3 vWorld;
${LIP_GLSL}
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  w.y += lipHigh(w.xz, log2(aCell)).x;
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const LIP_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
uniform sampler2D tShoreP;
${NOISE_GLSL}
${RIG_GLSL}
${LOD_GLSL}
${WARM_GLSL}
${LIP_GLSL}
void main() {
  takeLod(dFdx(vWorld), dFdy(vWorld));
  if (beyondNear(vWorld)) discard;
  vec3 p = vWorld;
  vec3 v = normalize(cameraPosition - p);
  // The lie of each stone, from one reading to each side: two texels of the sheet apart, or a pixel where that is more.
  float e = max(0.0024, 1.5 * exp2(gLod));
  float level = log2(e) - 1.0;
  vec2 h = lipHigh(p.xz, level);
  float hx = lipHigh(p.xz + vec2(e, 0.0), level).x;
  float hz = lipHigh(p.xz + vec2(0.0, e), level).x;
  vec3 n = normalize(vec3(h.x - hx, e, h.x - hz));
  vec3 small = textureLod(tShoreP, shoreLay(tShorePH, p.xz).xy, AT(1672.0, 2.0)).rgb;
  vec2 t = vec2(p.x * 0.82 + p.z * 0.57, -p.x * 0.57 + p.z * 0.82);
  vec3 large = textureLod(tShoreP, t / vec2(6.4, 3.6) + 0.37, AT(1672.0, 6.4)).rgb;
  vec3 albedo = mix(small, large, 0.5 * h.y) * vec3(1.12, 0.93, 0.72) * warmSide(n);
  // Wet to a hand above the water, and damp in every hollow: dark there, with the sky's light lying on it.
  float wet = max(smoothstep(0.1, 0.0, p.y - 0.6 * h.x), 0.15 + 0.65 * smoothstep(0.045, 0.01, h.x));
  albedo = min(albedo, vec3(0.55)) * mix(1.0, 0.45, wet);
  float occ = 0.25 + 0.75 * smoothstep(0.004, 0.06, h.x);
  // A dry top is rough to the last grain: at this low an eye a smoother one mirrors the bright sky and reads as salt or snow.
  // The same of a wet one whose back the sheet leaves flat: the eye is taken a little way up for the mirror alone.
  vec3 c = rigShade(p, n, normalize(v + 0.7 * n), clamp(albedo, 0.0, 0.9), mix(1.2, 0.6, wet), occ);
  // The glint lies only on what is wet through, in small points: on a dry top it is a sheet of white.
  c += smoothstep(0.75, 1.0, wet) * 0.05 * rigGlint(p, n, v, 0.22);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
