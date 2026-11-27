// The lip of the shore before the shore camera: wet gravel and grit standing out of the water at the lower left of its picture.
// The stones are the shore sheet's own, raised by its height sheet on a fine fan of mesh, so each has a side and hides what lies behind it.
import * as THREE from 'three';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
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

/**
 * Metres the lip stands over the water at a place of the fan. The ground's own height here is a hand under the water and its coarse mesh
 * alone made it look dry, so the lip is a low beach of its own: its waterline runs from 10.8 m out at the left edge of the shore camera's
 * picture to its foot a little left of the middle, and it rises 30 mm a metre from there toward the eye.
 */
function beach(ahead: number, tangent: number): number {
  const aside = tangent * ahead;
  const line = 10.8 - 5.3 * ((tangent + 0.39) / 0.35) + 0.45 * Math.sin(aside * 2.1 + ahead * 0.7) + 0.2 * Math.sin(aside * 5.3 - ahead * 1.9);
  return 0.03 * (line - ahead);
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
      positions[o + 1] = Math.max(-0.3, landHeight(x, z), beach(ahead, cols[i] as number));
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
      // Wound to face up: wound the other way only the far sides of the stones were drawn, from within.
      if (dry(a) || dry(b) || dry(c) || dry(d)) index.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aCell', new THREE.BufferAttribute(cells, 1));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(index), 1));
  geometry.computeBoundingSphere();
  return geometry;
}

// Metres of stone over the ground. `level` is the base two logarithm of the metres between one reading and the next. The sheet is
// `land/lip-nh.jpg`, worn and broken stones packed on sand (see assets-src/eye/land/make_gravel_lip.py): once at its true size, 1.25 m,
// and once four times as large and turned, whose larger stones are the cobbles that stand out of the gravel.
const LIP_GLSL = /* glsl */ `
uniform sampler2D tLipNh;
vec2 lipLarge(vec2 xz) {
  return vec2(xz.x * 0.82 + xz.y * 0.57, -xz.x * 0.57 + xz.y * 0.82) / 5.0 + 0.37;
}
float lipHigh(vec2 xz, float level) {
  float small = 0.085 * textureLod(tLipNh, xz / 1.25, level + 10.26).b;
  float large = 0.33 * textureLod(tLipNh, lipLarge(xz), level + 8.26).b - 0.035;
  return max(small, large);
}`;

export const LIP_VERTEX = /* glsl */ `
attribute float aCell;
varying vec3 vWorld;
varying float vStand;
${LIP_GLSL}
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  // No stone stands out of the water: the lake's edge is drawn by the ground alone, and a stone in it would cut through its face.
  // Nor at the far end of the fan, where the plain ground takes over.
  vStand = smoothstep(-0.02, 0.06, w.y) * smoothstep(${(LIP.ahead1 * LIP.cell).toFixed(5)}, ${((LIP.ahead1 - 3) * LIP.cell).toFixed(5)}, aCell);
  // A little over the ground, whose own mesh is coarser and would come up through the sand between the stones.
  w.y += vStand * lipHigh(w.xz, log2(aCell)) + 0.03;
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const LIP_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying float vStand;
uniform sampler2D tShoreP;
uniform sampler2D tLipTone;
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
  // Both sheets, and which of them stands higher here: its lie, its tone and its shade are the ones seen.
  vec2 at = lipLarge(p.xz);
  // At this low an eye one level for both ways of the screen is the long way's, and smears: the reads go a level and a half finer.
  float la = AT(1536.0, 1.25) - 1.5;
  float lb = AT(1536.0, 5.0) - 1.5;
  vec3 sm = textureLod(tLipNh, p.xz / 1.25, la).rgb;
  vec3 lg = textureLod(tLipNh, at, lb).rgb;
  vec3 smTone = textureLod(tLipTone, p.xz / 1.25, la).rgb;
  vec3 lgTone = textureLod(tLipTone, at, lb).rgb;
  vec3 skin = textureLod(tShoreP, p.xz / vec2(2.0, 1.125), AT(1672.0, 2.0)).rgb;
  float ha = 0.085 * sm.b;
  float hb = 0.33 * lg.b - 0.035;
  float big = smoothstep(-0.002, 0.002, hb - ha);
  float h = vStand * max(ha, hb);
  vec2 sa = sm.rg * 2.0 - 1.0;
  vec2 sb = lg.rg * 2.0 - 1.0;
  // The stones stand a little higher than they were baked, and lie as much steeper.
  vec2 ga = 1.4 * vStand * sa / sqrt(max(1.0 - sa * sa, 0.02));
  vec2 gb = 1.4 * vStand * sb / sqrt(max(1.0 - sb * sb, 0.02));
  // The large sheet is turned, and its lie turns back with it.
  vec2 g = mix(ga, vec2(0.82 * gb.x - 0.57 * gb.y, 0.57 * gb.x + 0.82 * gb.y), big);
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 tone = mix(smTone, lgTone, big);
  // Limestone gravel: buff for the most part, some of it dark, some rusty, some cold; the shore sheet is its skin.
  vec3 albedo = mix(vec3(0.3, 0.24, 0.17), vec3(0.78, 0.63, 0.44), tone.r);
  // The sand between the stones is dark with wet, and the lens keeps that when it has taken every grain.
  albedo *= 0.7 + 0.3 * smoothstep(0.0, 0.05, h);
  albedo = mix(albedo, albedo * vec3(1.22, 0.86, 0.6), smoothstep(0.62, 0.95, tone.g));
  albedo = mix(albedo, albedo * vec3(0.84, 0.93, 1.04), smoothstep(0.3, 0.05, tone.g));
  albedo *= 0.62 + 1.1 * dot(skin, vec3(0.333));
  // Shreds of the mats lie in the grit where the water left them.
  float shred = smoothstep(0.62, 0.74, 0.55 * vnoise(p.xz * 4.3) + 0.45 * vnoise(p.xz * 31.0)) * smoothstep(0.026, 0.01, h);
  albedo = mix(albedo, vec3(0.6, 0.27, 0.06), 0.85 * shred);
  albedo *= warmSide(n);
  // Wet to a hand above the water, and damp in every hollow: dark there, with the sky's light lying on it.
  float wet = max(smoothstep(0.13, 0.03, p.y - 0.6 * h), 0.2 + 0.6 * smoothstep(0.03, 0.006, h));
  albedo *= mix(1.0, 0.68, wet);
  float occ = mix(1.0, tone.b, 0.8) * (0.6 + 0.4 * smoothstep(0.0, 0.05, h));
  // A dry top is rough to the last grain: at this low an eye a smoother one mirrors the bright sky and reads as salt or snow.
  // The same of a wet one whose back lies flat: the eye is taken a little way up for the mirror alone.
  vec3 c = rigShade(p, n, normalize(v + 0.7 * n), clamp(albedo, 0.0, 0.9), mix(1.1, 0.5, wet), occ);
  // The sheen of what is wet through, in small points.
  c += smoothstep(0.6, 1.0, wet) * 0.35 * rigGlint(p, n, v, 0.22);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
