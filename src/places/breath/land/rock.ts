// The rock of the Breath: one tile of noise baked at creation, and the three surfaces cut from it. The shelf (ivory bone-rock, wet, pitted,
// jointed, stained where the tide stands), the bone of the shaft (its wall, its hoops and the slabs that fell from them), and the far cliff.
// All three are lit by the rig alone.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';
import { PLATE, PLATE_TURN, SEA } from '../land';
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

// The shelf: a pavement of pale plates with stone in the gaps between them. Its colour is the plate's picture and its shape is the plate's
// relief, baked with the land into the near map (land/field.ts): the normal, the shadow of every edge and stone under the low sun, and the
// hollows are read from the map, so nothing here is drawn on a flat face. High and dry it is pale; low it is dark with wet; water stands
// in the plate's hollows and mirrors the sky.
export const SHELF_FRAGMENT = /* glsl */ `
${COMMON}
uniform sampler2D tMat;
uniform sampler2D tMatN;
uniform vec3 uMean;
uniform sampler2D tPlate;
uniform sampler2D tNear;
uniform sampler2D tNearS;
uniform vec4 uNear;
uniform sampler2D tPad;
uniform sampler2D tPadH;
uniform sampler2D tPeb;
uniform sampler2D tPebN;
// The dry ground (mat/drypad, one square of it laid PAD_SIDE metres wide where the dead one lies) and the shingle (mat/pebbles, a tile).
const float PAD_SIDE = 12.0;
// The rim of the main shaft, as land.ts has it (rimRadius).
float rimBump(float b, float centre, float width) {
  float d = mod(abs(b - centre), 6.2831853);
  if (d > 3.14159265) d = 6.2831853 - d;
  return d < width ? 0.5 + 0.5 * cos(3.14159265 * d / width) : 0.0;
}
// The shelf's light: the rig's, from the functions under rigShade. The sun stands 8.5 degrees up in a wet haze over a bright sea: half of
// what it gives the shelf comes straight (and is cut by every edge), the other half comes round from the glowing haze about it and from
// the lit rock and water beside, and fills the shade. So a plate in shade is half as bright as one in the sun, not a fifth.
vec3 shelfShade(vec4 land, vec3 p, vec3 n, vec3 v, vec3 albedo, float rough, float occ) {
  float above = p.y - land.r;
  float contact = contactDrawn(p) * smoothstep(5.0, 0.0, above);
  float open = mix(land.g, 1.0, clamp(above / 30.0, 0.0, 1.0)) * (1.0 - 0.85 * contact) * occ;
  float cloud = sunCloud(p.xz);
  float sun = sunSeen(land, p.y) * cloud * (1.0 - contact) * (0.4 + 0.6 * occ);
  float nl = max(dot(n, uSunDir), 0.0);
  vec3 sky = skyIrradiance(n);
  vec3 around = mix(uSunColour, vec3(dot(uSunColour, vec3(0.3, 0.5, 0.2))), 0.45) * (0.2 * (0.5 + 0.5 * dot(n, normalize(vec3(uSunDir.x, 0.6, uSunDir.z)))) * mix(0.75, 1.0, cloud));
  vec3 e = (1.15 * sky + around) * open + uSunColour * (3.14159 * 0.55 * min(nl, 0.42) * sun);
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float f = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.8 * rough);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  vec3 env = mix(skyRadiance(r), sky / 3.14159, rough * rough);
  return c + f * env * open + uSunColour * (f * sunLobe(n, v, rough) * nl * sun);
}
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
  vec3 slope = texture2D(tNearS, q).rgb * inNear;
  // The brim's own face hangs inside the rim, where the map holds no cliff: there the mesh's normal is the true one.
  // Only there: the riser of a plate out on the shelf is steep too, and the map does hold it.
  float bearing = atan(p.x, -p.z);
  float rimHere = 30.0 + 7.0 * rimBump(bearing, 1.9548, 0.733) + 2.2 * rimBump(bearing, 3.7525, 0.5236) + sin(5.0 * bearing + 1.0) + 0.5 * sin(11.0 * bearing + 0.5) + 0.4 * sin(29.0 * bearing + 2.0);
  float hang = smoothstep(0.35, 0.1, gn.y) * smoothstep(rimHere + 0.5, rimHere + 0.1, length(p.xz));
  vec3 n = normalize(mix(mix(gn, normalize(vec3(-slope.x, 1.0, -slope.y)), inNear), normalize(vec3(-p.x, 0.25 * length(p.xz), -p.z)), hang));

  // The plate, and near the lens the grain of wet rock too fine for the plate to hold (mat/wetrock, 1.5 m).
  vec2 pt = vec2(${PLATE_TURN.cos.toFixed(6)} * p.x + ${PLATE_TURN.sin.toFixed(6)} * p.z, ${PLATE_TURN.cos.toFixed(6)} * p.z - ${PLATE_TURN.sin.toFixed(6)} * p.x);
  vec2 pq = vec2(pt.x / ${PLATE.metres.toFixed(1)}, 1.0 - pt.y / ${PLATE.depth.toFixed(4)});
  // The hanging face of the brim is seen edge on by the plate: it takes the plate's broad colour, not its stretched picture.
  vec3 plate = mix(texture2D(tPlate, pq).rgb, texture2D(tPlate, pq, 5.0).rgb * 0.38, hang);
  vec4 a = texture2D(tRock, p.xz / 37.0);
  float near = smoothstep(26.0, 5.0, dist);
  // Past where the grain shows it is not read at all (the wide frame is mostly such ground): the picture's mean stands for it.
  vec2 dpx = dFdx(p.xz);
  vec2 dpy = dFdy(p.xz);
  vec3 m0 = uMean;
  vec3 mn = vec3(0.5);
  if (near > 0.0) {
    m0 = textureGrad(tMat, p.xz / 1.5 + 0.57, dpx / 1.5, dpy / 1.5).rgb;
    mn = textureGrad(tMatN, p.xz / 1.5 + 0.57, dpx / 1.5, dpy / 1.5).rgb;
  }
  // And nearer still its pits and grit: the same grain a quarter the size, turned, so that the ground at the lens is not one even weave.
  vec2 pg = vec2(0.8 * p.x - 0.6 * p.z, 0.6 * p.x + 0.8 * p.z) / 0.41;
  float close = smoothstep(9.0, 1.5, dist);
  vec3 m1 = uMean;
  vec3 mf = vec3(0.5);
  if (close > 0.0) {
    vec2 gx = vec2(0.8 * dpx.x - 0.6 * dpx.y, 0.6 * dpx.x + 0.8 * dpx.y) / 0.41;
    vec2 gy = vec2(0.8 * dpy.x - 0.6 * dpy.y, 0.6 * dpy.x + 0.8 * dpy.y) / 0.41;
    m1 = textureGrad(tMat, pg, gx, gy).rgb;
    mf = textureGrad(tMatN, pg, gx, gy).rgb;
  }
  float pit = smoothstep(0.75, 0.4, dot(m1 / uMean, vec3(0.3333))) * smoothstep(0.45, 0.7, a.g + 0.3 * (m0.g / uMean.g - 1.0));
  float tone = mix(1.0, clamp(1.0 + 1.5 * (dot(m0 / uMean, vec3(0.3333)) - 1.0), 0.45, 1.7), near) * mix(1.0, clamp(dot(m1 / uMean, vec3(0.3333)), 0.5, 1.5) * (1.0 - 0.55 * pit), close);
  // Broad stains: the rock is not one colour for more than a few metres.
  float broadStain = 0.72 + 0.56 * texture2D(tRock, p.xz / 9.0 + 0.3).r;
  vec2 lean = (mn.rg - 0.5) * 0.8 * near + vec2(0.8 * (mf.r - 0.5) + 0.6 * (mf.g - 0.5), -0.6 * (mf.r - 0.5) + 0.8 * (mf.g - 0.5)) * 0.9 * close;

  // An edge is steep in the mesh as well as in the map: the map's fine relief alone is grain, and must not take the face's banded stone
  // (laid by height, it runs in long streaks over level ground).
  float steep = smoothstep(0.16, 0.5, 1.0 - n.y) * mix(1.0, smoothstep(0.035, 0.18, 1.0 - gn.y), inNear);
  float stone = smoothstep(0.02, 0.2, field.a);
  float hollow = smoothstep(0.5, 0.3, field.b);
  // Wet: everything near the tide and the foot of every edge near it; the pool, and a margin round it.
  float over = field.r - (${SEA.toFixed(3)});
  float film = slope.b;
  float damp = clamp(1.0 - smoothstep(0.06, 0.55, over + 0.3 * (a.a - 0.5)) + 0.5 * hollow * smoothstep(0.5, 0.75, a.r) + film, 0.0, 1.0);
  // The dry ground where the dead one lies: one picture of warm gritty rock with its own relief, laid once, its stain under the body.
  // It stands clear of the tide and has dried in the wind: no damp, no sheen. Its border is ragged, and shingle lies along it.
  vec2 pu = (p.xz - vec2(-27.0, 23.3)) / PAD_SIDE + 0.5;
  vec2 pb = min(pu, 1.0 - pu);
  float sq = min(pb.x, pb.y) + 0.1 * (a.r - 0.5);
  float inPad = smoothstep(0.0, 0.16, sq) * smoothstep(0.15, 0.4, over) * (1.0 - steep) * (1.0 - film);
  vec3 padColour = vec3(0.0);
  vec3 grit = vec3(0.53);
  vec3 gritN = vec3(0.5, 0.5, 1.0);
  float padHigh = 0.5;
  float padCrack = 0.0;
  float padLow = 0.0;
  if (inPad > 0.0) {
    padColour = texture2D(tPad, pu).rgb;
    padHigh = texture2D(tPadH, pu).r;
    // Its slope is taken across a hand's width, from a softened read: the relief's own grain (it was guessed from the picture) is not form.
    float e = 1.0 / 130.0;
    float soft = texture2D(tPadH, pu, 2.0).r;
    vec2 fall = vec2(texture2D(tPadH, pu + vec2(e, 0.0), 2.0).r, texture2D(tPadH, pu + vec2(0.0, e), 2.0).r) - soft;
    // Grit a hand across (the shingle's tile at a third of its size) gives the fine relief: the broad one, under a sun this low, was
    // bands of light and dark like a dune's.
    gritN = textureGrad(tPebN, p.xz / 0.31 + 0.4, dpx / 0.31, dpy / 0.31).rgb;
    grit = textureGrad(tPeb, p.xz / 0.31 + 0.4, dpx / 0.31, dpy / 0.31).rgb;
    // Joints: the gaps between the stones of the same tile, laid 5.3 m wide, are cracks between slabs a foot or two across.
    vec4 joint = textureGrad(tPebN, p.xz / 5.3 + 0.13, dpx / 5.3, dpy / 5.3);
    padCrack = smoothstep(0.3, 0.1, joint.b) * smoothstep(30.0, 12.0, dist);
    // Hollows: the lows of the broad relief hold the damp. They are darker and they shine.
    padLow = smoothstep(0.4, 0.26, soft + 0.25 * (a.a - 0.5));
    lean = mix(lean, 0.3 * lean + fall * 1.2 + (joint.rg - 0.5) * 0.8 * smoothstep(0.55, 0.2, joint.b) + (gritN.rg - 0.5) * (0.9 * smoothstep(16.0, 4.0, dist)), inPad);
    damp = mix(damp, 0.85 * padLow, inPad);
  }
  // Shingle: rounded pale stones a thumb to a fist through, lying in patches on the dry rock, along the border of the dry ground, and
  // nowhere near the tide. Past thirty metres it is not read.
  float ring = smoothstep(-0.1, -0.02, sq) * smoothstep(0.1, 0.03, sq);
  float shingle = max(ring * smoothstep(0.4, 0.6, a.a), smoothstep(0.61, 0.71, a.r + 0.15 * hollow) * (1.0 - 0.4 * smoothstep(0.0, 0.1, sq))) * smoothstep(0.3, 0.55, over) * (1.0 - steep) * (1.0 - film) * smoothstep(34.0, 20.0, dist);
  vec3 pebColour = vec3(0.0);
  if (shingle > 0.0) {
    vec4 pn = textureGrad(tPebN, p.xz / 1.5 + 0.21, dpx / 1.5, dpy / 1.5);
    // Its edge is stones, not a fade: the high stones of the tile stand out past it.
    shingle = smoothstep(0.0, 0.25, shingle - 0.75 * (1.0 - pn.b));
    pebColour = textureGrad(tPeb, p.xz / 1.5 + 0.21, dpx / 1.5, dpy / 1.5).rgb;
    lean = mix(lean, (pn.rg - 0.5) * 1.1, shingle);
    damp *= 1.0 - shingle;
    inPad *= 1.0 - shingle;
  }
  n = normalize(n - vec3(lean.x, 0.0, lean.y) * (1.0 - film));
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), 0.97 * film));

  // The rock: the plate's own colour, cooled a little (it was painted under a warm lamp), each loose stone its own tone.
  // It is wet, and seen against the light: its own colour is the lesser part of what reaches the lens, the sheen the greater.
  // The picture's own lights and darks are drawn out: its cracks go dark, its plates stay pale.
  // At the lens the plate's picture is ten times too coarse and would show as soft blots: there its broad colour stays and the grain of
  // wet rock, which is fine enough, carries the pattern.
  plate = mix(plate, texture2D(tPlate, pq, 3.5).rgb, 0.75 * close * (1.0 - hang));
  float mark = dot(plate, vec3(0.3333)) / dot(texture2D(tPlate, pq, 6.0).rgb, vec3(0.3333));
  // The plate the dead one lies on stands dry and pale over the tide.
  vec2 fromPad = p.xz - vec2(-27.3, 22.6);
  float dryPad = smoothstep(8.5, 5.0, length(fromPad)) * smoothstep(0.2, 0.4, field.r - (${SEA.toFixed(3)}));
  plate = mix(plate, texture2D(tPlate, pq, 3.0).rgb * vec3(1.0, 0.98, 0.95), 0.5 * dryPad);
  vec3 rock = plate * vec3(0.43, 0.52, 0.6) * tone * clamp(pow(mark, 1.3), 0.3, 1.6) * mix(broadStain, 1.2 / mix(1.0, tone, 0.5), dryPad);
  rock = mix(rock, rock * (0.55 + 0.9 * field.a), stone);
  // The steep edge of a plate is broken rock: darker, rustier than its top.
  // It takes the grain of wet rock laid square on its own face (not the plate's picture pulled down it), in level bands as the beds lie.
  float wx = n.x * n.x / max(n.x * n.x + n.z * n.z, 1e-4);
  vec3 side = uMean;
  if (steep > 0.0) {
    vec3 ex = dFdx(p);
    vec3 ey = dFdy(p);
    side = mix(textureGrad(tMat, vec2(p.x, p.y * 1.6) / 1.1, vec2(ex.x, ex.y * 1.6) / 1.1, vec2(ey.x, ey.y * 1.6) / 1.1).rgb, textureGrad(tMat, vec2(p.z, p.y * 1.6) / 1.1, vec2(ex.z, ex.y * 1.6) / 1.1, vec2(ey.z, ey.y * 1.6) / 1.1).rgb, wx);
  }
  vec3 face = texture2D(tPlate, pq, 4.0).rgb * vec3(0.62, 0.58, 0.52) * clamp(dot(side / uMean, vec3(0.3333)), 0.4, 1.7);
  rock = mix(rock, face, steep * (1.0 - stone));
  // A dark green-brown weed along the tide line and in the wet foot of the edges near it.
  float tide = smoothstep(0.5, 0.05, abs(over - 0.1)) * smoothstep(0.3, 0.6, a.b * 2.0 + 0.5 * (tone - 1.0)) + 0.5 * hollow * smoothstep(0.6, 0.15, over);
  // On a plate's broken edge the weed is only a line at the water, and the wet face keeps its stone's colour: it is not a black wall.
  rock = mix(rock, vec3(0.045, 0.05, 0.028) * (0.6 + 0.8 * tone), 0.7 * clamp(tide, 0.0, 1.0) * mix(1.0, smoothstep(0.3, 0.05, over), steep));
  // The plates of the lip stand high and dry: weathered grey, not the cream of a fresh break.
  rock *= mix(1.0, 0.66, smoothstep(0.9, 2.2, over) * (1.0 - dryPad));
  vec3 albedo = rock * mix(1.0, mix(0.68, 0.74, steep), damp);
  // Where the water meets the rock the rock is wet through: a dark band a hand high along every waterline.
  albedo *= mix(1.0, 0.5, smoothstep(0.16, 0.03, over) * smoothstep(-0.06, 0.0, over));
  // The rocks that break the water under the lens of the feeding waders are dark and wet through, with weed on them.
  vec2 fromBar = p.xz - vec2(-50.2, -22.4);
  float bar = exp(-(0.12 * fromBar.x * fromBar.x + fromBar.y * fromBar.y) / 5.5) * smoothstep(-0.05, 0.1, over);
  albedo = mix(albedo, albedo * vec3(0.3, 0.33, 0.3), 0.85 * bar);
  // Where the dead one lies its stain has run into the rock: dark, a little red, in the lows of the grain.
  // Pale dust lies in the hollows of the dry plate's grain.
  albedo = mix(albedo, vec3(0.5, 0.47, 0.42), 0.55 * dryPad * smoothstep(0.5, 0.22, mn.b) * near);
  float stain = exp(-dot(fromPad - vec2(0.3, 0.7), fromPad - vec2(0.3, 0.7)) / 1.1) * smoothstep(0.2, 0.75, a.r + 0.6 * (1.0 - mn.b));
  albedo = mix(albedo, albedo * vec3(0.5, 0.33, 0.28), 0.6 * stain * (1.0 - 0.5 * inPad));
  // The dry ground is pale rough rock. Its picture is laid 12 m wide and is soft at the lens, so it gives only the broad lights and darks;
  // the grain of the rock at two sizes and grit a hand across (the shingle's tile, a third of its size) carry the rest.
  vec3 padSoft = mix(vec3(dot(padColour, vec3(0.3333))), padColour, 0.7);
  padSoft = 1.36 * mix(vec3(0.47, 0.435, 0.385), padSoft * vec3(1.05, 1.0, 0.93) * (1.0 + 0.3 * padHigh), 0.4);
  padSoft *= mix(1.0, clamp(tone, 0.7, 1.35), 0.4) * mix(1.0, clamp(dot(grit, vec3(0.3333)) / 0.268, 0.4, 1.8) * (0.75 + 0.5 * gritN.b), smoothstep(16.0, 4.0, dist));
  padSoft *= mix(1.0, 0.4, padCrack) * mix(1.0, 0.78, padLow);
  albedo = mix(albedo, padSoft, inPad);
  albedo = mix(albedo, pebColour, shingle);
  // Under the tide the bed is pale grey-green stone, fine silt on it: the water over it reads pale green and clear.
  // From the water's edge: an ankle's depth of bed with the rock's own sheen on it was a beach of wet sand along both banks.
  float under = smoothstep(0.01, -0.05, over);
  albedo = mix(albedo, vec3(0.21, 0.32, 0.3) * clamp(tone * mark, 0.5, 1.4), 0.85 * under);
  // The pool is a hand deep over slime: dark, green, and a mirror.
  albedo = mix(albedo, vec3(0.035, 0.045, 0.03), 0.85 * film);
  float rough = mix(mix(mix(0.9, 0.36, damp), 0.04, film), 0.95, under);
  // The shade of a hollow, of the gap between two plates, of the gap between two stones.
  float occ = mix(0.4, 1.0, smoothstep(0.2, 0.52, field.b)) * vOcc * mix(1.0, 0.55 + 0.45 * smoothstep(0.1, 0.55, padHigh), inPad);
  // The sun: every edge and every stone throws its own shadow down the shelf, baked in the map at its own fineness.
  float lit = mix(1.0, smoothstep(-0.07, -0.006, field.r - field.g), inNear) * sunSeen(land, p.y);
  // The shade of the drifting fog banks dims the sun and its glare; it is not the land's shadow and does not move the shadow's height.
  float cloud = sunCloud(p.xz);
  land.b = p.y + mix(0.35, 0.03, lit);
  vec3 colour = shelfShade(land, p, n, v, albedo, rough, occ);
  // A broken edge in its own shade is lit by the wet rock and the water at its foot.
  colour += albedo * (uSkyHorizon * uFill + 0.25 * uGlowColour) * (0.3 * steep * vOcc);
  // Where it is wet the shelf mirrors the lit haze at the horizon, and in the glare path the wet grain throws the low sun back in points.
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float fres = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
  vec3 back = reflect(-v, n);
  back.y = abs(back.y);
  // The whole shelf has a thin wet sheen at dawn: at a grazing angle even a dry plate mirrors the sky, and toward the sun that is the gold glare.
  // Not evenly: the sheen lies where the rock is smooth and low, and the pitted and the raised dry first.
  // And it lies near the tide: a plate that stands half a metre clear of it has dried in the wind.
  float dry = smoothstep(0.45, 1.0, over + 0.3 * (a.g - 0.5));
  // Under the tide the water has the sheen and the glare, not the bed.
  float sheen = (1.0 - under) * (1.0 - inPad * smoothstep(0.25, 0.5, padHigh) * (1.0 - padLow)) * (1.0 - shingle) * max(mix(0.42 * damp, 1.0, film), (1.0 - 0.8 * dry) * (0.1 + 0.4 * smoothstep(0.35, 0.75, a.r + 0.6 * (dot(m0 / uMean, vec3(0.3333)) - 1.0) * near)) * (1.0 - steep) * (1.0 - 0.6 * stone) * (1.0 - 0.7 * pit * close));
  // Rock is rough even wet: it never mirrors the sky whole as the pool does, or wet rock near the lens would stand pale as sand.
  // Near the lens the sheen is not a sheet: it lies in the lows of the grain and breaks on its highs, so wet rock is dark with bright points.
  float gloss = mix(1.0, smoothstep(0.62, 0.3, mn.b) * (1.0 - 0.8 * pit * close), mix(near, 0.0, film));
  gloss *= 1.0 - 0.75 * bar;
  // Farther off the plate's own cracks and seams break it: the wet lies in the low places and glitters, the seams between are dull.
  gloss *= mix(clamp(1.6 * (mark - 0.55), 0.15, 1.0), 1.0, film);
  colour += skyRadiance(back) * (min(fres, mix(0.3, 1.0, film)) * sheen * gloss * (0.75 + 0.25 * film) * 1.1 * occ * land.g);
  // The low sun in the wet sheen: a broad gold glare down the shelf toward it, which is what the backlight of this place is made of.
  float glare = pow(max(dot(reflect(-v, normalize(n + vec3(0.0, 1.5, 0.0))), uSunDir), 0.0), 28.0);
  colour += uSunColour * vec3(1.0, 0.8, 0.55) * (glare * sheen * (0.35 + 0.65 * gloss) * (0.12 + 0.88 * fres) * mix(0.3, 1.0, lit) * cloud * occ * 1.7);
  float tight = sunLobe(normalize(n + vec3(mn.r - 0.5, 0.0, mn.g - 0.5) * 0.5), v, 0.2) * fres * lit;
  colour += uSunColour * (min(tight, 8.0) * cloud * damp * (1.0 - under) * smoothstep(0.4, 0.8, mn.b) * occ * 0.5);
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

// The bone of the shaft: uBone 0 is the dark wet wall between the ribs, 1 the ivory cartilage of a rib or a block that broke from one.
// The stone's picture is laid in the world, on the two planes the face looks along, a metre to a metre on every face: it cannot stretch
// and it has no seam. The stains are patches and runs. The light is the rig's: the land's own shadow, and of the sky what a point down
// a shaft can see of it, plus what the lit mist and the far wall throw back.
export const BONE_FRAGMENT = /* glsl */ `
${COMMON}
uniform float uBone;
uniform vec3 uPale;
uniform vec3 uDark;
uniform sampler2D tMat;
uniform sampler2D tMatN;
// The mean colour of the picture, and x the metres of one repeat, y how strongly its slope turns the normal.
uniform vec3 uMean;
uniform vec2 uMat;
void main() {
  vec3 p = vWorld;
  vec3 v = normalize(cameraPosition - p);
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 q = p / uMat.x;
  vec3 dqx = dFdx(q);
  vec3 dqy = dFdy(q);
  vec3 an = abs(n);
  ivec3 ma = (an.x > an.y && an.x > an.z) ? ivec3(0, 1, 2) : (an.y > an.z) ? ivec3(1, 2, 0) : ivec3(2, 0, 1);
  ivec3 mi = (an.x < an.y && an.x < an.z) ? ivec3(0, 1, 2) : (an.y < an.z) ? ivec3(1, 2, 0) : ivec3(2, 0, 1);
  ivec3 me = ivec3(3) - mi - ma;
  vec2 ua = vec2(q[ma.y], q[ma.z]);
  vec2 ub = vec2(q[me.y], q[me.z]);
  vec2 uax = vec2(dqx[ma.y], dqx[ma.z]);
  vec2 uay = vec2(dqy[ma.y], dqy[ma.z]);
  vec2 ubx = vec2(dqx[me.y], dqx[me.z]);
  vec2 uby = vec2(dqy[me.y], dqy[me.z]);
  vec2 w = clamp((vec2(an[ma.x], an[me.x]) - 0.5773) / 0.4227, 0.0, 1.0) + 1e-4;
  w /= w.x + w.y;
  vec3 m0 = textureGrad(tMat, ua, uax, uay).rgb * w.x + textureGrad(tMat, ub, ubx, uby).rgb * w.y;
  vec3 sa = textureGrad(tMatN, ua, uax, uay).rgb;
  vec3 sb = textureGrad(tMatN, ub, ubx, uby).rgb;
  vec3 ga = vec3(0.0);
  ga[ma.y] = sa.r - 0.5;
  ga[ma.z] = sa.g - 0.5;
  vec3 gb = vec3(0.0);
  gb[me.y] = sb.r - 0.5;
  gb[me.z] = sb.g - 0.5;
  vec3 lean = ga * w.x + gb * w.y;
  n = normalize(n - uMat.y * (lean - n * dot(lean, n)));
  float tone = clamp(1.0 + mix(1.6, 0.75, smoothstep(0.4, 0.9, uBone)) * (dot(m0 / uMean, vec3(0.3333)) - 1.0), 0.35, 1.8);
  float height = sa.b * w.x + sb.b * w.y;

  // Patches and runs: the same tile of noise, laid by the shape's own metres (they are broad: nothing in them can show a stretch).
  vec4 a = texture2D(tRock, vUv / 13.0);
  vec4 run = texture2D(tRock, vec2(vUv.x / 7.0, p.y / 31.0) + 0.5);
  float up = clamp(n.y, 0.0, 1.0);
  float ivory = smoothstep(0.4, 0.9, uBone);
  vec3 base = mix(uDark, uPale, clamp(0.55 + 1.3 * (a.r - 0.5) + 0.5 * (tone - 1.0), 0.0, 1.0)) * tone;
  // The wall's top beds are the shelf's own stone, not yet wet through, and green slime grows where the seep keeps them damp.
  float topBeds = smoothstep(-8.0, -1.0, p.y) * (1.0 - ivory);
  base = mix(base, vec3(0.33, 0.3, 0.25) * tone, 0.75 * topBeds);
  base = mix(base, vec3(0.07, 0.085, 0.045) * tone, 0.6 * (1.0 - ivory) * smoothstep(0.45, 0.7, run.a + 0.3 * (a.g - 0.5)));
  // Rust: iron in the seep. On a rib it is broad ochre patches with dark hearts, heaviest on the flanks and where water runs off the underside.
  float patch0 = smoothstep(0.4, 0.62, a.a + 0.35 * (run.r - 0.5) + 0.25 * (1.0 - up) - 0.2 * (height - 0.5));
  float heart = smoothstep(0.62, 0.8, a.a + 0.3 * (run.g - 0.5));
  vec3 rust = mix(vec3(0.5, 0.29, 0.1), vec3(0.2, 0.09, 0.035), heart);
  vec3 albedo = mix(base, rust * (0.7 + 0.5 * tone), patch0 * mix(0.35, 0.3, ivory));
  // Runs down the faces: thin dark streaks under every stained place.
  float streak = smoothstep(0.55, 0.8, run.r + 0.25 * (run.b - 0.5)) * (1.0 - up);
  albedo = mix(albedo, albedo * vec3(0.4, 0.33, 0.25), 0.6 * streak * (1.0 - ivory));
  // Wet: the wall everywhere below the top beds; a rib only on its underside.
  float wet = mix(clamp(0.35 + 0.65 * smoothstep(-3.0, -12.0, p.y), 0.0, 1.0), 0.35 * smoothstep(0.1, -0.5, n.y), ivory);
  albedo *= mix(1.0, 0.55, wet);
  float rough = mix(0.92, 0.5, wet);

  // Down the shaft: the land map says where the pit is. A face there sees the sky as a disc overhead, smaller the deeper it is.
  vec4 land = landAt(p.xz);
  float pit = smoothstep(-6.0, -30.0, land.r) * smoothstep(1.5, -1.5, p.y);
  float depth = max(-p.y, 0.0);
  float openUp = 1.0 / (1.0 + depth * depth / 700.0);
  float openSide = 0.6 / (1.0 + depth * depth / 1500.0);
  float open = mix(1.0, mix(openSide, openUp, up), pit);
  float occ = vOcc * open * (0.75 + 0.5 * height);
  vec3 colour = rigShadeOn(land, p, n, v, albedo, rough, occ);
  // What the shut-off part of the sky is replaced by: the far wall and the mist in the shaft, lit by the sky and by the sun on the south wall.
  vec3 bounce = (0.55 * uSkyHorizon * uFill + 0.3 * uGlowColour) * (pit * (1.0 - open) * (0.55 + 0.45 * smoothstep(-0.2, 0.6, -n.y + 0.4)));
  bounce += uSunColour * (0.12 * pit * exp(-depth / 30.0));
  colour += albedo * bounce * vOcc;
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

// The wall of the shaft and its ribs (land/wall.ts): the colour is the wall plate's picture on the mesh its relief shaped. What the mesh is
// too coarse to hold (the chips, the cracks, the drips) is taken from the same relief as a lean of the normal and a shade in the folds,
// at a low strength (the relief is a guess at form, not a measure). A top or an underside is seen edge on by the plate, so there the
// plate would stretch: those faces take the plate's broad colour and a stone laid flat in the world instead.
export const WALL_FRAGMENT = /* glsl */ `
${COMMON}
uniform sampler2D tWall;
uniform sampler2D tWallH;
uniform sampler2D tMat;
uniform sampler2D tMatN;
uniform vec3 uMean;
uniform sampler2D tGrain;
uniform sampler2D tGrainN;
uniform vec3 uGrainMean;
uniform vec4 uWall;
uniform float uBounce;
void main() {
  vec3 p = vWorld;
  vec3 toEye = cameraPosition - p;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec3 gn = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 along = normalize(vec3(-p.z, 0.0, p.x));
  vec3 upward = vec3(0.0, 1.0, 0.0);

  vec3 plate = texture2D(tWall, vUv).rgb;
  vec3 broad = texture2D(tWall, vUv, 4.0).rgb;
  vec2 e = vec2(1.0 / 1672.0, 1.0 / 941.0);
  float h = texture2D(tWallH, vUv).r;
  float hl = texture2D(tWallH, vUv - vec2(e.x, 0.0)).r;
  float hr = texture2D(tWallH, vUv + vec2(e.x, 0.0)).r;
  float hd = texture2D(tWallH, vUv - vec2(0.0, e.y)).r;
  float hu = texture2D(tWallH, vUv + vec2(0.0, e.y)).r;
  float wl = texture2D(tWallH, vUv - vec2(7.0 * e.x, 0.0)).r;
  float wr = texture2D(tWallH, vUv + vec2(7.0 * e.x, 0.0)).r;
  float wd = texture2D(tWallH, vUv - vec2(0.0, 7.0 * e.y)).r;
  float wu = texture2D(tWallH, vUv + vec2(0.0, 7.0 * e.y)).r;
  // Metres of height to a metre of wall: the fine slope less the broad one the mesh already has.
  vec2 lean = (vec2(hr - hl, hu - hd) / 0.0718 - vec2(wr - wl, wu - wd) / 0.5024) * uWall.x;
  float fold = h - 0.25 * (wl + wr + wd + wu);

  float top = smoothstep(0.3, 0.62, gn.y);
  float under = smoothstep(0.3, 0.7, -gn.y);
  float face = 1.0 - top - under;
  float near = smoothstep(46.0, 9.0, dist);
  // The grain of wet rock, by the wall's own metres on a face (it cannot stretch there), flat in the world on a top.
  // It is laid by the place in the world on three planes, each face taking the plane it most nearly lies in: laid by the wall's own
  // picture it was drawn out along every face that stands out of the wall.
  float wx = gn.x * gn.x / max(gn.x * gn.x + gn.z * gn.z, 1e-4);
  wx = smoothstep(0.25, 0.75, wx);
  vec2 gq = p.xz / 1.5;
  vec2 gqx = vec2(p.z, p.y * 1.25) / 1.5;
  vec2 gqz = vec2(p.x, p.y * 1.25) / 1.5;
  float flat0 = max(top, under);
  vec3 g0 = mix(mix(texture2D(tGrain, gqz).rgb, texture2D(tGrain, gqx).rgb, wx), texture2D(tGrain, gq).rgb, flat0);
  vec3 gs = mix(mix(texture2D(tGrainN, gqz).rgb, texture2D(tGrainN, gqx).rgb, wx), texture2D(tGrainN, gq).rgb, flat0);
  // And a fifth the size under it near the lens, where a texel of the first is many pixels wide.
  float close = smoothstep(14.0, 3.0, dist);
  vec3 g1 = mix(mix(texture2D(tGrain, gqz * 4.7 + 0.3).rgb, texture2D(tGrain, gqx * 4.7 + 0.3).rgb, wx), texture2D(tGrain, gq * 4.7 + 0.3).rgb, flat0);
  float grain = mix(1.0, clamp(1.0 + 1.3 * (dot(g0 / uGrainMean, vec3(0.3333)) - 1.0), 0.5, 1.6), max(near, 0.45)) * mix(1.0, clamp(dot(g1 / uGrainMean, vec3(0.3333)), 0.6, 1.45), close);
  vec3 t0 = texture2D(tMat, p.xz / 4.0 + 0.37).rgb;
  vec3 ts = texture2D(tMatN, p.xz / 4.0 + 0.37).rgb;
  float tone = clamp(1.0 + 1.2 * (dot(t0 / uMean, vec3(0.3333)) - 1.0), 0.5, 1.6);

  vec3 n = gn - (along * lean.x + upward * lean.y) * face;
  n -= (along * (gs.r - 0.5) + upward * (gs.g - 0.5)) * (0.9 * near * face);
  n -= vec3(ts.r - 0.5 + (gs.r - 0.5) * near, 0.0, ts.g - 0.5 + (gs.g - 0.5) * near) * (0.8 * top);
  n = normalize(n);

  // The top of a rib holds dust and broken stone and is the palest thing in the shaft; its underside is wet and dark.
  float rib = smoothstep(0.5, 0.7, texture2D(tWallH, vUv, 3.0).r);
  // Its colour is the stone's own, laid flat in the world at two sizes: the wall's picture cannot be laid on a top, it is drawn out there
  // into streaks metres long.
  vec3 fineTop = clamp(texture2D(tMat, p.xz / 1.3 + 0.11).rgb / uMean, 0.45, 1.7);
  vec3 onTop = mix(broad, vec3(0.56, 0.53, 0.47), 0.55 + 0.25 * rib) * tone * mix(vec3(1.0), fineTop, 0.75 * near + 0.1);
  vec3 below = broad * 0.6;
  // The rib is ivory: the plate's own pale stone, a little paler still than the wet wall it stands out of.
  // Between the ribs the wall is dark wet stone, grey-green; the ribs are pale.
  // The plate was painted brown under a warm lamp: the stone is cream-grey, and keeps only thin bands of the plate's tan.
  float lum = dot(plate, vec3(0.3333));
  // On a face that stands out of the wall the picture is drawn out: there its soft colour stays and the grain carries the pattern.
  float pulled = smoothstep(0.12, 0.4, abs(gn.y));
  vec3 softer = texture2D(tWall, vUv, 2.5).rgb;
  plate = mix(plate, softer, pulled);
  lum = dot(plate, vec3(0.3333));
  vec3 stoneCol = mix(plate, lum * vec3(1.05, 1.0, 0.93), 0.55);
  // Deep in the shaft the wall between the ribs is wet through and dark: the core of the shaft is the darkest thing in the place.
  stoneCol *= mix(1.0, 0.5, (1.0 - rib) * smoothstep(-0.5, -6.0, p.y)) * mix(1.0, 0.6, (1.0 - rib) * smoothstep(-6.0, -22.0, p.y));
  vec3 albedo = (stoneCol * face * mix(vec3(0.62, 0.72, 0.72), vec3(2.2, 2.2, 2.2), rib) + onTop * top + below * under) * grain * uWall.y;
  // Stains: rust runs down the wall and the faces of the ribs in streaks an arm to a pace wide, and the damp holds dark green in patches
  // between the ribs. Both are laid by the bearing round the shaft and the depth (whole repeats round it: no seam), so they run true down.
  float bear = atan(p.x, -p.z) / 6.28318;
  float run = 0.6 * textureLod(tRock, vec2(bear * 61.0, p.y / 23.0), 0.0).r + 0.4 * textureLod(tRock, vec2(bear * 113.0 + 0.4, p.y / 9.0), 1.0).a;
  float rust = smoothstep(0.5, 0.7, run) * (1.0 - 0.6 * top) * (1.0 - under);
  albedo = mix(albedo, albedo * vec3(1.3, 0.72, 0.38), 0.7 * rust);
  float mossy = smoothstep(0.56, 0.74, textureLod(tRock, vec2(bear * 37.0 + 0.61, p.y / 6.0 + 0.2), 0.0).r) * face * (1.0 - rib);
  albedo = mix(albedo, albedo * vec3(0.5, 0.68, 0.42), 0.6 * mossy);
  float wet = clamp(smoothstep(0.14, 0.04, lum) * face + 0.6 * under, 0.0, 1.0) * smoothstep(-1.0, -5.0, p.y);
  float rough = mix(0.92, 0.5, wet);

  // Down the shaft a face sees the sky as a disc overhead, smaller the deeper it is, and the ribs above it shut more of it off.
  vec4 land = landAt(p.xz);
  float depth = max(-p.y, 0.0);
  float upness = clamp(n.y, 0.0, 1.0);
  float openUp = 1.0 / (1.0 + depth * depth / 700.0);
  float openSide = 0.6 / (1.0 + depth * depth / 1500.0);
  float open = mix(openSide, openUp, upness);
  float shut = mix(uWall.z, 1.0, vOcc);
  float occ = shut * open * clamp(1.0 + uWall.w * fold, 0.35, 1.2);
  vec3 colour = rigShadeOn(land, p, n, v, albedo, rough, occ);
  // What the shut-off sky is replaced by: the far wall and the mist in the shaft, lit by the sky and by the sun on the south wall.
  vec3 bounce = (0.55 * uSkyHorizon * uFill + 0.3 * uGlowColour) * ((1.0 - open) * (0.55 + 0.45 * smoothstep(-0.2, 0.6, -n.y + 0.4)));
  // And by the low sun itself, second hand: it lights the mist that fills the shaft and the top of the wall it strikes, and they light the
  // rest, warm, from the side and from below as much as from above. It is why a rib in the shade of the shaft is ivory and not grey.
  bounce += uSunColour * (uBounce * exp(-depth / 30.0) * (0.6 + 0.4 * clamp(dot(n, -normalize(vec3(p.x, 0.0, p.z))), 0.0, 1.0)));
  colour += albedo * bounce * mix(0.6, 1.0, vOcc) * clamp(1.0 + uWall.w * fold, 0.35, 1.2);
  gl_FragColor = vec4(rigOut(colour), 1.0);
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
  wall(plate: THREE.Texture, relief: THREE.Texture, top: Surface, grain: Surface): THREE.ShaderMaterial;
  bone(amount: number, pale: [number, number, number], dark: [number, number, number], of: Surface, side?: THREE.Side): THREE.ShaderMaterial;
  dispose(): void;
}

/** The dry ground of the shelf: the one square where the dead one lies (colour and height) and the shingle tile. */
export interface DryGround {
  pad: THREE.Texture;
  padHeight: THREE.Texture;
  pebbles: Surface;
}

export function createRock(uniforms: Record<string, THREE.IUniform>, rng: Rng, shelf: Surface, plate: THREE.Texture, near: NearMap, dry: DryGround): RockKit {
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
    shelf: make(SHELF_FRAGMENT, { ...of(shelf), tPlate: { value: plate }, tNear: { value: near.texture }, tNearS: { value: near.slopes }, uNear: { value: near.rect }, tPad: { value: dry.pad }, tPadH: { value: dry.padHeight }, tPeb: { value: dry.pebbles.colour }, tPebN: { value: dry.pebbles.data } }),
    wall: (plate, relief, top, grain) =>
      make(
        WALL_FRAGMENT,
        {
          ...of(top),
          tWall: { value: plate },
          tWallH: { value: relief },
          tGrain: { value: grain.colour },
          tGrainN: { value: grain.data },
          uGrainMean: { value: new THREE.Vector3(...grain.mean) },
          // x metres the fine relief is drawn as, y gain on the plate's colour, z the sky a shut cell still sees, w how dark a fold is.
          uWall: { value: new THREE.Vector4(0.45, 1.3, 0.3, 2.0) },
          // How much of the sun's light the mist and the far wall hand on to a face in the shaft.
          uBounce: { value: 0.06 },
        },
        THREE.DoubleSide,
      ),
    bone: (amount, pale, dark, surface, side) => make(BONE_FRAGMENT, { uBone: { value: amount }, uPale: { value: new THREE.Vector3(...pale) }, uDark: { value: new THREE.Vector3(...dark) }, ...of(surface) }, side),
    dispose: () => {
      for (const m of made) m.dispose();
      tile.dispose();
    },
  };
}
