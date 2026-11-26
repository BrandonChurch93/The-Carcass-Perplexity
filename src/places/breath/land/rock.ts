// The rock of the Breath: one tile of noise baked at creation, and the three surfaces cut from it. The shelf (ivory bone-rock, wet, pitted,
// jointed, stained where the tide stands), the bone of the shaft (its wall, its hoops and the slabs that fell from them), and the far cliff.
// All three are lit by the rig alone.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';
import { SEA } from '../land';
import { RIG_GLSL } from '../shared/glsl';
import type { NearMap } from './field';

const SIZE = 512;

/** A tile that repeats: r smooth drifts, g the level of the plate that is there (the shelf is a pavement of plates, each at its own level),
 *  b how far it is to the edge of that plate (0 on the edge), a a second smooth field. */
export function bakeRock(rng: Rng): THREE.DataTexture {
  const grads = (period: number): Float32Array => {
    const g = new Float32Array(period * period * 2);
    for (let i = 0; i < period * period; i++) {
      const a = rng.range(0, Math.PI * 2);
      g[i * 2] = Math.cos(a);
      g[i * 2 + 1] = Math.sin(a);
    }
    return g;
  };
  const points = (period: number): Float32Array => {
    const p = new Float32Array(period * period * 2);
    for (let i = 0; i < p.length; i++) p[i] = rng.next();
    return p;
  };
  const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
  const perlin = (g: Float32Array, period: number, x: number, y: number): number => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const u = fade(fx);
    const v = fade(fy);
    let sum = 0;
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        const c = ((((yi + j) % period) + period) % period) * period * 2 + ((((xi + i) % period) + period) % period) * 2;
        sum += ((g[c] as number) * (fx - i) + (g[c + 1] as number) * (fy - j)) * (i ? u : 1 - u) * (j ? v : 1 - v);
      }
    }
    return sum;
  };
  // The two nearest feature points: how far each is, in cells, and which cells they are.
  const cells = (p: Float32Array, period: number, x: number, y: number): [number, number, number, number] => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    let a = 9;
    let b = 9;
    let ia = 0;
    let ib = 0;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const c = (((yi + j + period) % period) * period + ((xi + i + period) % period)) * 2;
        const dx = xi + i + (p[c] as number) - x;
        const dy = yi + j + (p[c + 1] as number) - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < a) {
          b = a;
          ib = ia;
          a = d;
          ia = c / 2;
        } else if (d < b) {
          b = d;
          ib = c / 2;
        }
      }
    }
    return [a, b, ia, ib];
  };
  const gA = [4, 8, 16, 32, 64].map(grads);
  const gB = [3, 6, 12, 24, 48].map(grads);
  const PLATES = 6;
  const joints = points(PLATES);
  const levels = Array.from({ length: PLATES * PLATES }, () => rng.next());
  const bend = grads(6);
  const fine = grads(24);
  const data = new Uint8Array(SIZE * SIZE * 4);
  const byte = (v: number): number => Math.round(255 * Math.min(1, Math.max(0, v)));
  for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE; i++) {
      const x = (i + 0.5) / SIZE;
      const y = (j + 0.5) / SIZE;
      let a = 0;
      let b = 0;
      let w = 0.5;
      for (let o = 0; o < 5; o++) {
        const pa = [4, 8, 16, 32, 64][o] as number;
        const pb = [3, 6, 12, 24, 48][o] as number;
        a += w * perlin(gA[o] as Float32Array, pa, x * pa, y * pa);
        b += w * perlin(gB[o] as Float32Array, pb, x * pb, y * pb);
        w *= 0.55;
      }
      // The plates: cells with bent, scalloped edges, each at its own level. Across an edge the level goes from one to the other in a short riser.
      const wx = x * PLATES + 0.3 * perlin(bend, 6, x * 6, y * 6) + 0.07 * perlin(fine, 24, x * 24, y * 24);
      const wy = y * PLATES + 0.3 * perlin(bend, 6, y * 6 + 2.5, x * 6 + 1.5) + 0.07 * perlin(fine, 24, y * 24 + 0.5, x * 24 + 3.5);
      const [j0, j1, c0, c1] = cells(joints, PLATES, wx, wy);
      const l0 = levels[c0] as number;
      const l1 = levels[c1] as number;
      const edge = j1 - j0;
      const e = Math.min(1, edge / 0.03);
      const plate = l0 + (0.5 * (l1 + l0) - l0) * (1 - e * e * (3 - 2 * e));
      const o = (j * SIZE + i) * 4;
      data[o] = byte(0.5 + 1.1 * a);
      data[o + 1] = byte(plate);
      data[o + 2] = byte(edge * 2.2);
      data[o + 3] = byte(0.5 + 1.1 * b);
    }
  }
  const t = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 1;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/** The better surfaces: each material picture read at every size it is drawn at. False reads each once or twice (the cheaper version: see HANDOVER.md for both costs). */
export const FINE = true;

export const ROCK_VERTEX = /* glsl */ `
attribute float occ;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying float vOcc;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  vOcc = occ;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const COMMON = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying float vOcc;
uniform sampler2D tRock;
${FINE ? '#define FINE' : ''}
${RIG_GLSL}

// The normal of a surface whose height is raised by h metres: from how h changes across the pixel.
vec3 raised(vec3 p, vec3 n, float h) {
  vec3 dpx = dFdx(p);
  vec3 dpy = dFdy(p);
  float hx = dFdx(h);
  float hy = dFdy(h);
  vec3 r1 = cross(dpy, n);
  vec3 r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 g = (r1 * hx + r2 * hy) * sign(det);
  return normalize(abs(det) * n - g);
}`;

// The shelf: bedded rock broken back bed by bed, with the loose stone that lies on it. Its shape is the near map's (land/field.ts): the normal,
// the shadow of every step and stone under the low sun, and the hollows are read from the map, so nothing here is drawn on a flat face.
// High and dry it is pale and weathered; low it is dark with wet, and water stands in the hollows and mirrors the sky.
export const SHELF_FRAGMENT = /* glsl */ `
${COMMON}
uniform sampler2D tMat;
uniform sampler2D tMatN;
uniform vec3 uMean;
uniform sampler2D tNear;
uniform sampler2D tNearS;
uniform vec4 uNear;
void main() {
  vec3 p = vWorld;
  vec3 toEye = cameraPosition - p;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec3 gn = normalize(vNormal);
  vec4 land = landAt(p.xz);
  vec2 q = (p.xz - uNear.xy) * uNear.z;
  vec2 border = min(q, 1.0 - q);
  float inNear = smoothstep(0.0, 0.03, min(border.x, border.y));
  vec4 field = mix(vec4(p.y, land.b, 0.5, 0.0), texture2D(tNear, q), inNear);
  vec2 slope = texture2D(tNearS, q).rg * inNear;
  // The brim's own face hangs inside the rim, where the map holds no cliff: there the mesh's normal is the true one.
  float hang = smoothstep(0.35, 0.1, gn.y);
  vec3 n = normalize(mix(mix(gn, normalize(vec3(-slope.x, 1.0, -slope.y)), inNear), gn, hang));

  vec4 a = texture2D(tRock, p.xz / 37.0);
  // The courses of a riser: thin laminae that run level, drawn out along the face.
  vec4 lam = texture2D(tRock, vec2(p.y * 2.7 + 0.2 * a.r, (p.x + p.z) * 0.031));
  // The picture of the rock itself (mat/shelf) at two sizes, the larger turned so that no repeat lines up with the other.
  vec3 m0 = texture2D(tMat, p.xz / 1.9 + 0.57).rgb;
  vec3 m1 = texture2D(tMat, p.zx / 7.3 + 0.31).rgb;
  vec3 mn = texture2D(tMatN, p.xz / 1.9 + 0.57).rgb;
  float near = smoothstep(70.0, 10.0, dist);
  vec3 grain = (0.5 * m0 + 0.5 * m1) / uMean;
  float tone = clamp(1.0 + 1.9 * (dot(grain, vec3(0.3333)) - 1.0), 0.3, 1.9);
  vec2 lean = (mn.rg - 0.5) * 0.9 * near;

  float steep = smoothstep(0.22, 0.6, 1.0 - n.y);
  float stone = smoothstep(0.02, 0.2, field.a);
  float hollow = smoothstep(0.5, 0.3, field.b);
  float crest = smoothstep(0.52, 0.72, field.b);
  // Wet: everything near the tide, the foot of every step, and the low beds where the vapour's water runs to.
  float over = field.r - (${SEA.toFixed(3)});
  float damp = clamp(1.0 - smoothstep(0.1, 0.95, over + 0.5 * (a.a - 0.5)) + 0.55 * hollow * smoothstep(0.35, 0.6, a.r) + 0.5 * land.a * hollow, 0.0, 1.0);
  // Water stands where the ground is level and low for its neighbourhood: a film that mirrors the sky.
  float level = smoothstep(0.12, 0.03, length(slope));
  float film = level * smoothstep(0.47, 0.4, field.b) * smoothstep(0.42, 0.6, a.r + 0.6 * damp) * (1.0 - stone) * inNear;
  n = normalize(n - vec3(lean.x, 0.0, lean.y) * (1.0 - film));
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), 0.94 * film));

  // The rock: grey stone, weathered pale on the tops of the beds, darker where a bed has just broken away, each loose stone its own tone.
  vec3 pale = vec3(0.47, 0.445, 0.4);
  vec3 dark = vec3(0.2, 0.185, 0.165);
  vec3 rock = mix(dark, pale, clamp(0.55 + 0.9 * (a.a - 0.5) + 0.5 * (crest - 0.3) - 0.35 * steep, 0.0, 1.0)) * tone;
  rock = mix(rock, mix(dark, pale, field.a) * tone * vec3(1.03, 1.0, 0.95), stone);
  // A riser shows the beds it is made of, some pale, some rusty, and the shade under each.
  vec3 courses = mix(vec3(0.15, 0.125, 0.1), vec3(0.4, 0.36, 0.3), smoothstep(0.3, 0.7, lam.r)) * mix(vec3(1.0), vec3(1.0, 0.8, 0.6), smoothstep(0.55, 0.75, lam.a));
  rock = mix(rock, courses * (0.6 + 0.4 * tone), steep * (1.0 - stone));
  // Ochre where water has stood and dried; a dark green-brown weed along the tide line and in the wet foot of the steps near it.
  float stain = smoothstep(0.5, 0.72, a.g + 0.4 * (m1.r / uMean.r - 1.0)) * (1.0 - steep);
  rock = mix(rock, rock * vec3(1.02, 0.78, 0.52), 0.45 * stain);
  float tide = smoothstep(0.55, 0.05, abs(over - 0.12)) * smoothstep(0.35, 0.6, a.b * 2.0 + 0.5 * (tone - 1.0)) + 0.5 * hollow * smoothstep(0.7, 0.2, over);
  rock = mix(rock, vec3(0.05, 0.055, 0.03) * (0.6 + 0.8 * tone), 0.7 * clamp(tide, 0.0, 1.0));
  vec3 albedo = rock * mix(1.0, 0.36, damp);
  albedo = mix(albedo, albedo * vec3(0.5, 0.55, 0.55), film);
  float rough = mix(mix(0.88, 0.34, damp), 0.05, film);
  // The shade of a hollow, of the foot of a step, of the gap between two stones.
  float occ = mix(0.42, 1.0, smoothstep(0.22, 0.52, field.b)) * vOcc;
  // The sun: every step and every stone throws its own shadow down the shelf, baked in the map at its own fineness.
  float lit = mix(1.0, smoothstep(-0.07, -0.006, field.r - field.g), inNear) * sunSeen(land, p.y);
  land.b = p.y + mix(0.35, 0.03, lit);
  vec3 colour = rigShadeOn(land, p, n, v, albedo, rough, occ);
  // Where it is wet the shelf mirrors the lit haze at the horizon, and in the glare path the wet grain throws the low sun back in points.
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float fres = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
  vec3 back = reflect(-v, n);
  back.y = abs(back.y);
  colour += skyRadiance(back) * (fres * damp * (0.5 + 0.5 * film) * 1.2 * occ * land.g);
  float tight = sunLobe(normalize(n + vec3(mn.r - 0.5, 0.0, mn.g - 0.5) * 0.5), v, 0.2) * fres * lit;
  colour += uSunColour * (min(tight, 8.0) * damp * smoothstep(0.45, 0.75, m0.g / uMean.g * 0.6) * occ * 0.5);
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

// The bone of the shaft: uBone 0 is the dark wet wall between the hoops, 1 the ivory cartilage of a hoop or a slab. Tea-brown stains run down it.
export const BONE_FRAGMENT = /* glsl */ `
${COMMON}
uniform float uBone;
uniform vec3 uPale;
uniform vec3 uDark;
uniform sampler2D tMat;
uniform sampler2D tMatN;
// The mean colour of the picture, and x the metres of one repeat, y the metres its height stands for.
uniform vec3 uMean;
uniform vec2 uMat;
void main() {
  vec3 p = vWorld;
  vec3 v = normalize(cameraPosition - p);
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec4 a = texture2D(tRock, vUv / 17.0);
  vec4 b = texture2D(tRock, vUv / 3.1 + 0.23);
  // Streaks that run down the face: the same tile, drawn out along the fall line.
  vec4 run = texture2D(tRock, vec2(vUv.x / 19.0, vUv.y / 48.0) + 0.5);
  float pit = smoothstep(0.55, 0.8, b.a) * 0.6;
  // The drawn joints are for the wall: on a hoop or a slab the picture of the stone has its own.
  float joint = smoothstep(0.1, 0.0, a.b) * smoothstep(0.45, 0.6, a.r) * 0.6 * (1.0 - 0.8 * smoothstep(0.4, 0.9, uBone));
  // The picture of the surface (mat/hoop, mat/strata or mat/wall), x along the face and y up it, and again larger so that the repeat does not show.
  vec3 m0 = texture2D(tMat, vUv / uMat.x).rgb;
#ifdef FINE
  vec3 m1 = texture2D(tMat, vUv / (uMat.x * 3.7) + 0.43).rgb;
#else
  vec3 m1 = m0;
#endif
  vec3 mn = texture2D(tMatN, vUv / uMat.x).rgb;
  vec3 grain = (0.65 * m0 + 0.35 * m1) / uMean;
  grain = clamp(1.0 + 1.7 * (grain - 1.0), 0.25, 2.2) * mix(vec3(1.0), uMean / dot(uMean, vec3(0.3333)), 0.45);
  // On a hoop or the brim the bumps are small: where the low sun grazes a rounded face, large ones break it into spots.
  float h = (0.22 * a.r + 0.03 * b.r - 0.03 * pit) * (1.0 - 0.75 * smoothstep(0.4, 0.9, uBone)) - 0.1 * joint;
  n = raised(p, n, h);
  // The slope the picture holds, laid along the face: x along it and y up it.
  vec3 dpx = dFdx(p);
  vec3 dpy = dFdy(p);
  vec2 dux = dFdx(vUv);
  vec2 duy = dFdy(vUv);
  vec3 along = dpx * duy.y - dpy * dux.y;
  vec3 across = dpy * dux.x - dpx * duy.x;
  float fl = sign(dux.x * duy.y - dux.y * duy.x);
  if (dot(along, along) > 1e-16 && dot(across, across) > 1e-16) n = normalize(n - fl * uMat.y * ((mn.r - 0.5) * normalize(along) + (mn.g - 0.5) * normalize(across)));
  float up = clamp(n.y, 0.0, 1.0);
  vec3 base = mix(uDark, uPale, clamp(0.5 + 1.5 * (a.r - 0.5) + 0.6 * (b.a - 0.5), 0.0, 1.0)) * grain;
  // The top of the wall is the shelf's own pale beds, not yet wet through.
  base *= mix(1.0, 2.4, smoothstep(-10.0, -1.5, p.y) * (1.0 - smoothstep(0.3, 0.45, uBone)));
  // On the wall the stains run down in streaks; on a hoop or a slab they are patches, and the top is cleaner than the sides.
  float stain = mix(smoothstep(0.45, 0.75, run.r + 0.35 * (a.a - 0.5)), smoothstep(0.4, 0.7, a.a + 0.45 * (b.r - 0.5) + 0.12 * (run.r - 0.5)), smoothstep(0.3, 0.5, uBone)) * (1.0 - 0.6 * up);
  vec3 albedo = mix(base, base * vec3(0.5, 0.33, 0.19), 0.85 * stain * uBone + 0.3 * stain);
  // A hoop's top is washed pale; its face is wet, darker, and streaked ochre and black where the water runs off it.
  float face = smoothstep(0.75, 0.3, up) * smoothstep(0.4, 0.9, uBone);
  float streak = smoothstep(0.35, 0.7, run.r + 0.3 * (run.a - 0.5));
  albedo = mix(albedo, albedo * mix(vec3(0.62, 0.5, 0.36), vec3(0.2, 0.17, 0.14), streak), 0.2 * face);
  // Under water level in the rock, and wherever the vapour condenses, it is dark and wet.
  float wet = clamp(0.45 + 0.5 * smoothstep(-2.0, -14.0, p.y) + 0.3 * stain, 0.0, 1.0);
  // Down the shaft the sky is a disc overhead and everything is wet: it goes to the dark.
  float sunk = clamp(1.0 + min(p.y + 3.0, 0.0) / 52.0, 0.0, 1.0) * mix(1.0, 0.8, smoothstep(1.0, -2.5, p.y));
  albedo *= (1.0 - 0.5 * joint - 0.35 * pit) * mix(1.0, mix(0.62, 0.85, smoothstep(0.4, 0.9, uBone)), wet);
  // A ledge is lifted by the light that comes down the shaft, not by a mirror of the sky: left glossy, every rounded edge shows as a bright line.
  float rough = mix(mix(0.85, 0.38, wet), 1.0, 0.85 * smoothstep(0.4, 0.9, uBone));
  // The wall under a hoop is in its shade: black recesses between the ribs. The hoops stand every seven metres.
  float under = mod(-(p.y + 3.6), 7.0);
  float recess = smoothstep(7.0, 2.2, under) * smoothstep(-1.0, -4.0, p.y) * (1.0 - smoothstep(0.3, 0.45, uBone));
  // The hoops stand out of the wall into what light comes down: they are the pale thing in the shaft.
  // A ledge's top lies open to the disc of sky overhead, tier under tier, each dimmer than the one over it; its face and the wall get the square of that.
  float ledge = smoothstep(0.4, 0.9, uBone);
  float open = mix(sunk * sunk, sunk * mix(sunk, 1.0, 0.75 * up), ledge);
  // A ledge's face that looks away from the sun looks into the lit mist and the far wall: it is not black.
  float away = (1.0 - up) * (0.5 - 0.5 * dot(n, uSunDir));
  float occ = (1.0 - 0.5 * joint - 0.3 * pit) * vOcc * open * (1.0 - 0.86 * recess * mix(0.5, 1.0, smoothstep(-5.0, -24.0, p.y))) * mix(1.0, 2.3 + 1.6 * up + 2.2 * away, ledge * smoothstep(-0.5, -6.0, p.y));
  // Nothing of the sun gets down there either: the shadow's top is lifted over whatever is deep.
  vec4 land = landAt(p.xz);
  land.b = mix(p.y + 1.0, land.b, sunk * sunk);
  gl_FragColor = vec4(rigOut(rigShadeOn(land, p, n, v, albedo, rough, occ)), 1.0);
}`;

// The far cliff: level strata of dark rock, pale ledges that hold scree, and the dark of the cave.
export const CLIFF_FRAGMENT = /* glsl */ `
${COMMON}
uniform sampler2D tMat;
uniform sampler2D tMatN;
uniform vec3 uMean;
void main() {
  vec3 p = vWorld;
  vec3 v = normalize(cameraPosition - p);
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec4 a = texture2D(tRock, vec2(vUv.x / 2300.0, vUv.y / 520.0));
  // The picture of the face (mat/cliff): beds, joints and the snow they hold, at two sizes.
  vec3 m0 = texture2D(tMat, vUv / 330.0).rgb;
  vec3 m1 = texture2D(tMat, vUv / 1250.0 + 0.27).rgb;
  float mh = texture2D(tMatN, vUv / 330.0).b;
  vec3 grain = clamp(1.0 + 1.6 * ((0.6 * m0 + 0.4 * m1) / uMean - 1.0), 0.2, 3.0);
  vec4 b = texture2D(tRock, vec2(vUv.x / 410.0, vUv.y / 120.0) + 0.31);
  float strata = texture2D(tRock, vec2(vUv.x / 9000.0 + 0.1 * a.r, vUv.y / 260.0)).a;
  float h = 30.0 * a.r + 9.0 * b.r + 26.0 * strata + 22.0 * mh;
  n = raised(p, n, h);
  float flat0 = normalize(vNormal).y * (gl_FrontFacing ? 1.0 : -1.0);
  float ledge = smoothstep(0.62, 0.86, flat0 + 0.12 * (b.a - 0.5));
  vec3 rock = mix(vec3(0.02, 0.022, 0.028), vec3(0.07, 0.068, 0.068), clamp(0.5 + 2.2 * (strata - 0.5) + 0.6 * (b.r - 0.5), 0.0, 1.0)) * grain;
  // The top holds snow, and the scree a little in its hollows; the face is too steep for it.
  float high = smoothstep(0.6, 0.85, p.y / 700.0 + 0.2 * (a.a - 0.5));
  vec3 albedo = mix(rock, vec3(0.62, 0.64, 0.68), ledge * mix(0.3 * smoothstep(0.45, 0.6, b.a), 1.0, high));
  float occ = vOcc * (0.6 + 0.4 * b.r);
  gl_FragColor = vec4(rigOut(rigShade(p, n, v, albedo * vOcc, 0.85, occ)), 1.0);
}`;

/** A material picture of the place (public/assets/breath/mat): its colour, its data (slope in red and green, height in blue), its mean colour in
 *  linear light, the metres of one repeat and the metres its height is drawn as. */
export interface Surface {
  colour: THREE.Texture;
  data: THREE.Texture;
  mean: [number, number, number];
  metres: number;
  relief: number;
}

export interface RockKit {
  shelf: THREE.ShaderMaterial;
  cliff: THREE.ShaderMaterial;
  bone(amount: number, pale: [number, number, number], dark: [number, number, number], of: Surface, side?: THREE.Side): THREE.ShaderMaterial;
  dispose(): void;
}

export function createRock(uniforms: Record<string, THREE.IUniform>, rng: Rng, shelf: Surface, cliff: Surface, near: NearMap): RockKit {
  const of = (s: Surface): Record<string, THREE.IUniform> => ({
    tMat: { value: s.colour },
    tMatN: { value: s.data },
    uMean: { value: new THREE.Vector3(...s.mean) },
    uMat: { value: new THREE.Vector2(s.metres, s.relief) },
  });
  const tile = bakeRock(rng);
  const made: THREE.ShaderMaterial[] = [];
  const make = (fragmentShader: string, extra: Record<string, THREE.IUniform> = {}, side: THREE.Side = THREE.FrontSide): THREE.ShaderMaterial => {
    const m = new THREE.ShaderMaterial({ vertexShader: ROCK_VERTEX, fragmentShader, uniforms: { ...uniforms, tRock: { value: tile }, ...extra }, side, toneMapped: false });
    made.push(m);
    return m;
  };
  return {
    shelf: make(SHELF_FRAGMENT, { ...of(shelf), tNear: { value: near.texture }, tNearS: { value: near.slopes }, uNear: { value: near.rect } }),
    cliff: make(CLIFF_FRAGMENT, of(cliff), THREE.DoubleSide),
    bone: (amount, pale, dark, surface, side) => make(BONE_FRAGMENT, { uBone: { value: amount }, uPale: { value: new THREE.Vector3(...pale) }, uDark: { value: new THREE.Vector3(...dark) }, ...of(surface) }, side),
    dispose: () => {
      for (const m of made) m.dispose();
      tile.dispose();
    },
  };
}
