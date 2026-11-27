// The rock of the Breath: one tile of noise baked at creation, and the three surfaces cut from it. The shelf (ivory bone-rock, wet, pitted,
// jointed, stained where the tide stands), the bone of the shaft (its wall, its hoops and the slabs that fell from them), and the far cliff.
// All three are lit by the rig alone.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';
import { PLATE, PLATE_TURN, SEA } from '../land';
import { RIG_GLSL } from '../shared/glsl';
import { BAND_GLSL } from './arches';
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
uniform sampler2D tCrust;
uniform sampler2D tCrustN;
uniform sampler2D tGravel;
uniform sampler2D tGravelN;
// A place in each square of a grid, for the slabs the crust lies in round the dead one.
vec2 slabSite(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
uniform vec3 uCrustMean;
// The crust at the lens (land/crust, land/gravel): one repeat of it in metres, and the metres from its highest to its lowest.
const float CRUST = 2.3;
const float CRUST_DEEP = 0.045;
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
  // The sun at the rig's full strength: what it lights is bright and warm, what an edge shades has the sky alone and a little of the
  // glowing haze about the sun, so every shadow is long and crisp.
  vec3 around = mix(uSunColour, vec3(dot(uSunColour, vec3(0.3, 0.5, 0.2))), 0.45) * (0.07 * (0.5 + 0.5 * dot(n, normalize(vec3(uSunDir.x, 0.6, uSunDir.z)))) * mix(0.75, 1.0, cloud));
  vec3 e = (sky + around) * open + uSunColour * (3.14159 * nl * sun);
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
  vec2 dFdxPq = dFdx(pq);
  vec2 dFdyPq = dFdy(pq);
  vec3 dFdxP = dFdx(p);
  vec3 dFdyP = dFdy(p);
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
  // Within a few metres of a lens the ground is broken travertine crust with grit in its cracks, and it has depth: the eye's line is walked
  // down into the crust's relief until it meets the stone (so a plate hides the crack behind it and its edge slides over the grit as the
  // lens moves), and from there a line is walked toward the sun to find whether a higher plate shades the place. A picture of grain on a
  // level face, which this ground was for many rounds, cannot do either.
  float hand = smoothstep(15.0, 7.0, dist) * (1.0 - hang);
  vec3 crust = uCrustMean;
  vec2 crustLean = vec2(0.0);
  float crustLit = 1.0;
  float crustHigh = 0.5;
  float loose = 0.0;
  if (hand > 0.0) {
    vec2 cq = vec2(0.86 * p.x + 0.51 * p.z, -0.51 * p.x + 0.86 * p.z) / CRUST;
    vec2 cgx = vec2(0.86 * dpx.x + 0.51 * dpx.y, -0.51 * dpx.x + 0.86 * dpx.y) / CRUST;
    vec2 cgy = vec2(0.86 * dpy.x + 0.51 * dpy.y, -0.51 * dpy.x + 0.86 * dpy.y) / CRUST;
    // The form is read a thumb wide: the grain of the picture is colour, not relief, and under a sun this low a slope a texel across is noise.
    float soft = max(1.0, 7.0 / (1024.0 * max(length(cgx), length(cgy))));
    vec2 sgx = cgx * soft;
    vec2 sgy = cgy * soft;
    vec2 slide = -vec2(0.86 * v.x + 0.51 * v.z, -0.51 * v.x + 0.86 * v.z) / max(v.y, 0.14) * (CRUST_DEEP / CRUST);
    float t = 0.0;
    float deep = 1.0 - textureGrad(tCrustN, cq, sgx, sgy).b;
    float before = deep;
    for (int i = 0; i < 8; i++) {
      if (t >= deep) break;
      before = deep - t;
      t += 0.125;
      deep = 1.0 - textureGrad(tCrustN, cq + slide * t, sgx, sgy).b;
    }
    float past = max(t - deep, 0.0);
    float th = t - 0.125 * (t > 0.0 ? past / max(past + before, 1e-4) : 0.0);
    vec2 hit = cq + slide * th;
    vec3 cn = textureGrad(tCrustN, hit, sgx, sgy).rgb;
    crust = textureGrad(tCrust, hit, cgx, cgy).rgb;
    crustHigh = cn.b;
    // Toward the sun, climbing from the place to the top of the crust: stone that stands over the line shades it.
    vec2 toSun = vec2(0.86 * uSunDir.x + 0.51 * uSunDir.z, -0.51 * uSunDir.x + 0.86 * uSunDir.z) / max(uSunDir.y, 0.1) * (CRUST_DEEP / CRUST);
    float shade = 0.0;
    for (int i = 1; i <= 4; i++) {
      float rise = 0.25 * float(i) * (1.0 - cn.b);
      shade = max(shade, (textureGrad(tCrustN, hit + toSun * rise, sgx, sgy).b - cn.b - rise) * 5.0);
    }
    crustLit = 1.0 - clamp(shade, 0.0, 1.0);
    vec2 fall = vec2(-(cn.r - 0.5), cn.g - 0.5) * (116.0 * CRUST_DEEP / CRUST);
    crustLean = vec2(0.86 * fall.x - 0.51 * fall.y, 0.51 * fall.x + 0.86 * fall.y);
    // Loose gravel lies in the lows of the crust and in drifts across it.
    float drift = textureGrad(tRock, p.xz / 6.1 + 0.37, dpx / 6.1, dpy / 6.1).a;
    loose = smoothstep(0.64, 0.72, drift + 0.4 * (0.5 - cn.b));
    if (loose > 0.0) {
      vec2 gq = p.xz / 1.35 + 0.19;
      vec3 gv = textureGrad(tGravelN, gq, soft * dpx / 1.35, soft * dpy / 1.35).rgb;
      loose = smoothstep(0.0, 0.3, loose - 0.6 * (1.0 - gv.b));
      crust = mix(crust, textureGrad(tGravel, gq, dpx / 1.35, dpy / 1.35).rgb, loose);
      crustLean = mix(crustLean, vec2(-(gv.r - 0.5), gv.g - 0.5) * 2.4, loose);
      crustHigh = mix(crustHigh, gv.b, loose);
    }
  }
  float pit = (1.0 - hand) * smoothstep(0.75, 0.4, dot(m1 / uMean, vec3(0.3333))) * smoothstep(0.45, 0.7, a.g + 0.3 * (m0.g / uMean.g - 1.0));
  float tone = mix(1.0, clamp(1.0 + 1.5 * (dot(m0 / uMean, vec3(0.3333)) - 1.0), 0.45, 1.7), near) * mix(1.0, clamp(dot(m1 / uMean, vec3(0.3333)), 0.5, 1.5) * (1.0 - 0.55 * pit), close);
  tone = mix(tone, clamp(dot(crust / uCrustMean, vec3(0.3333)), 0.45, 1.7), hand);
  // Broad stains: the rock is not one colour for more than a few metres.
  float broadStain = 0.72 + 0.56 * texture2D(tRock, p.xz / 9.0 + 0.3).r;
  vec2 lean = (mn.rg - 0.5) * 0.8 * near + vec2(0.8 * (mf.r - 0.5) + 0.6 * (mf.g - 0.5), -0.6 * (mf.r - 0.5) + 0.8 * (mf.g - 0.5)) * 0.9 * close;

  lean = mix(lean, crustLean, hand);

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
  // The square of dry ground is no longer laid (from the far lens it was a rectangle of sand, at the near one a slab of concrete): the
  // plate the dead one lies on is the same crust as the rest, dry and pale.
  float inPad = 0.0;
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
  // On the plate the dead one lies on it is laid whatever the distance. Laid only within twenty metres of the lens, it came up dark over
  // the pale plate as the far lens neared the body, and the ground under it went from pale to dark and red within half a second: the pop
  // of the held frame. (Laid to seventy metres everywhere it was a brown stretched band across the first frame.)
  // Shingle: rounded pale stones a thumb to a fist through, lying in patches on the dry rock, along the border of the dry ground, and
  // nowhere near the tide. Past thirty metres it is not read.
  float ring = 0.0;
  float shingle = max(ring * smoothstep(0.4, 0.6, a.a), smoothstep(0.61, 0.71, a.r + 0.15 * hollow) * (1.0 - 0.4 * smoothstep(0.0, 0.1, sq))) * smoothstep(0.3, 0.55, over) * (1.0 - steep) * (1.0 - film) * max(smoothstep(34.0, 20.0, dist), smoothstep(11.0, 7.0, length(p.xz - vec2(-27.3, 22.6))));
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
  // Round the dead one the crust lies in slabs a stride or two across, each its own grey, parted by cracks that hold the dark. A slab's
  // edge is rounded down into its crack.
  float slabCrack = 0.0;
  float slabOwn = 0.5;
  float slabbed = hand * smoothstep(8.5, 5.0, length(p.xz - vec2(-27.3, 22.6))) * smoothstep(0.2, 0.4, over) * (1.0 - shingle);
  if (slabbed > 0.0) {
    vec2 slabWarp = textureLod(tRock, p.xz / 5.3 + 0.61, 0.0).rg - 0.5;
    vec2 sq = (p.xz + 1.3 * slabWarp) / 1.7 + 7.3;
    vec2 ci = floor(sq);
    vec2 cf = sq - ci;
    float f1 = 9.0;
    float f2 = 9.0;
    vec2 r1 = vec2(0.0);
    vec2 r2 = vec2(0.0);
    vec2 id = ci;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 r = g + slabSite(ci + g) - cf;
        float d = dot(r, r);
        if (d < f1) {
          f2 = f1;
          r2 = r1;
          f1 = d;
          r1 = r;
          id = ci + g;
        } else if (d < f2) {
          f2 = d;
          r2 = r;
        }
      }
    }
    vec2 between = r2 - r1;
    float gap = 1.7 * dot(0.5 * (r1 + r2), between) / max(length(between), 1e-4) + 0.05 * (crustHigh - 0.5);
    slabCrack = slabbed * smoothstep(0.045, 0.012, gap);
    slabOwn = slabSite(id + 3.1).x;
    lean -= (slabbed * 0.9 * smoothstep(0.22, 0.03, gap)) * normalize(between + 1e-5);
  }
  n = normalize(n - vec3(lean.x, 0.0, lean.y) * (1.0 - film));
  // The broken face of a plate shows its beds: level courses a hand thick, each with a shut dark foot under the lip of the one above.
  // Without them the face took only the grain's lean, and its wet sheen broke on that in white points: a fuzz, not stone.
  float bedAt = p.y / 0.09 + 2.4 * (a.r - 0.5) + 1.1 * (a.b - 0.5);
  float bedIn = fract(bedAt);
  float bedLone = fract(sin(floor(bedAt) * 12.9898 + 1.7) * 43758.5453);
  float bedSeen = steep * smoothstep(0.8, 0.3, fwidth(bedAt)) * (1.0 - film);
  float bedFoot = bedSeen * smoothstep(0.24, 0.0, bedIn) * (0.4 + 0.6 * bedLone);
  n = normalize(n + vec3(0.0, bedSeen * mix(0.14, -0.75, smoothstep(0.24, 0.0, bedIn)) * (0.4 + 0.6 * bedLone), 0.0));
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
  // At the lens the colour is the crust's own, at the broad brightness the plate has there.
  if (hand > 0.0) {
    vec3 broad = textureGrad(tPlate, pq, 32.0 * dFdxPq, 32.0 * dFdyPq).rgb * vec3(0.43, 0.52, 0.6) * broadStain;
    // Clear of the tide it is dry travertine: pale, nearly half of the light that falls on it comes back.
    float pale = mix(clamp(dot(broad, vec3(0.3333)), 0.2, 0.4), 0.55 * mix(0.85 + 0.3 * a.r, 1.05, dryPad), smoothstep(0.3, 0.9, over + 0.3 * (a.a - 0.5)));
    rock = mix(rock, mix(crust, uCrustMean, 0.2) * (pale / dot(uCrustMean, vec3(0.3333))), hand);
    // Round the dead one the crust stands dry and bleached: grey-cream, its darks lifted, as old travertine is.
    float bright = dot(rock, vec3(0.3333));
    // The same bleach reaches out over the bench to the lens of the rim, a little weaker.
    float bench = smoothstep(15.0, 9.0, length(fromPad)) * smoothstep(0.2, 0.4, field.r - (${SEA.toFixed(3)}));
    rock = mix(rock, vec3(0.9, 0.96, 1.0) * mix(bright, pale, 0.45), 0.85 * max(dryPad, 0.9 * bench) * hand);
    rock *= mix(1.0, mix(0.82, 1.14, slabOwn), slabbed);
    rock = mix(rock, rock * vec3(0.3, 0.28, 0.27), slabCrack);
  }
  // From a far lens the same pad is the same bleached stone: grey-cream, not the plate's tan.
  rock = mix(rock, vec3(0.97, 1.0, 1.03) * (1.14 * dot(rock, vec3(0.3333))), 0.65 * dryPad * (1.0 - hand));
  rock = mix(rock, rock * (0.55 + 0.9 * field.a), stone);
  // The steep edge of a plate is broken rock: darker, rustier than its top.
  // It takes the grain of wet rock laid square on its own face (not the plate's picture pulled down it), in level bands as the beds lie.
  float wx = n.x * n.x / max(n.x * n.x + n.z * n.z, 1e-4);
  vec3 side = uMean;
  if (steep > 0.0) {
    vec3 ex = dFdxP;
    vec3 ey = dFdyP;
    side = mix(textureGrad(tMat, vec2(p.x, p.y * 1.6) / 1.1, vec2(ex.x, ex.y * 1.6) / 1.1, vec2(ey.x, ey.y * 1.6) / 1.1).rgb, textureGrad(tMat, vec2(p.z, p.y * 1.6) / 1.1, vec2(ex.z, ex.y * 1.6) / 1.1, vec2(ey.z, ey.y * 1.6) / 1.1).rgb, wx);
  }
  vec3 face = texture2D(tPlate, pq, 4.0).rgb * vec3(0.62, 0.58, 0.52) * clamp(dot(side / uMean, vec3(0.3333)), 0.4, 1.7);
  face *= mix(1.0, 0.5, bedFoot) * mix(1.0, 0.75 + 0.5 * bedLone, 0.6 * bedSeen);
  rock = mix(rock, face, steep * (1.0 - stone));
  // A dark green-brown weed along the tide line and in the wet foot of the edges near it.
  float tide = smoothstep(0.5, 0.05, abs(over - 0.1)) * smoothstep(0.3, 0.6, a.b * 2.0 + 0.5 * (tone - 1.0)) + 0.5 * hollow * smoothstep(0.6, 0.15, over);
  // On a plate's broken edge the weed is only a line at the water, and the wet face keeps its stone's colour: it is not a black wall.
  rock = mix(rock, vec3(0.045, 0.05, 0.028) * (0.6 + 0.8 * tone), 0.7 * clamp(tide, 0.0, 1.0) * mix(1.0, smoothstep(0.3, 0.05, over), steep));
  // The plates of the lip stand high and dry: weathered grey, not the cream of a fresh break.
  rock *= mix(1.0, 0.66, smoothstep(0.9, 2.2, over) * (1.0 - dryPad) * (1.0 - hand));
  vec3 albedo = rock * mix(1.0, mix(0.68, 0.74, steep), damp);
  // Where the water meets the rock the rock is wet through: a dark band a hand high along every waterline.
  albedo *= mix(1.0, 0.42, smoothstep(0.2 + 0.16 * a.a, 0.03, over) * smoothstep(-0.06, 0.0, over));
  // The rocks that break the water under the lens of the feeding waders are dark and wet through, with weed on them.
  vec2 fromBar = p.xz - vec2(-50.2, -22.4);
  float bar = exp(-(0.12 * fromBar.x * fromBar.x + fromBar.y * fromBar.y) / 5.5) * smoothstep(-0.05, 0.1, over);
  albedo = mix(albedo, albedo * vec3(0.3, 0.33, 0.3), 0.85 * bar);
  // Where the dead one lies its stain has run into the rock: dark, a little red, in the lows of the grain.
  // Pale dust lies in the hollows of the dry plate's grain.
  albedo = mix(albedo, vec3(0.5, 0.47, 0.42), 0.55 * dryPad * smoothstep(0.5, 0.22, mn.b) * near);
  // It has run down the shelf from it and lies in the lows of the crust, darkest under the trunk.
  // It lies along the body on the side of the rim's lens, from under the neck to the folded legs, and is soaked through under the chest.
  vec2 fromBody = fromPad - vec2(-1.09, 0.33);
  vec2 lain = vec2(0.979 * fromBody.x + 0.206 * fromBody.y, 0.206 * fromBody.x - 0.979 * fromBody.y);
  float ragged = 0.6 + 0.8 * a.a;
  float stain = 0.0;
  if (dot(lain, lain) < 36.0) {
    stain = exp(-(lain.x * lain.x / 1.7 + lain.y * lain.y / 0.5) / ragged) * smoothstep(0.0, 0.45, a.r + 0.7 * (1.0 - crustHigh)) + 0.9 * exp(-((lain.x - 0.15) * (lain.x - 0.15) / 1.3 + (lain.y - 0.3) * (lain.y - 0.3) / 0.45) / ragged);
    // Under the mop the rock is damp and in its shade.
    stain = max(stain, 0.45 * exp(-((lain.x + 1.55) * (lain.x + 1.55) + (lain.y - 0.25) * (lain.y - 0.25)) / 0.9));
    stain = clamp(stain, 0.0, 1.0);
  }
  // The dry ground is pale rough rock. Its picture is laid 12 m wide and is soft at the lens, so it gives only the broad lights and darks;
  // the grain of the rock at two sizes and grit a hand across (the shingle's tile, a third of its size) carry the rest.
  vec3 padSoft = mix(vec3(dot(padColour, vec3(0.3333))), padColour, 0.7);
  padSoft = 1.36 * mix(vec3(0.47, 0.435, 0.385), padSoft * vec3(1.05, 1.0, 0.93) * (1.0 + 0.3 * padHigh), 0.4);
  padSoft *= mix(1.0, clamp(tone, 0.7, 1.35), 0.4) * mix(1.0, clamp(dot(grit, vec3(0.3333)) / 0.268, 0.4, 1.8) * (0.75 + 0.5 * gritN.b), smoothstep(16.0, 4.0, dist));
  padSoft *= mix(1.0, 0.4, padCrack) * mix(1.0, 0.78, padLow);
  albedo = mix(albedo, padSoft, inPad);
  albedo = mix(albedo, pebColour, shingle);
  albedo = mix(albedo, albedo * vec3(0.33, 0.19, 0.19), 0.82 * stain);
  // Under the tide the bed is pale grey-green stone, fine silt on it: the water over it reads pale green and clear.
  // From the water's edge: an ankle's depth of bed with the rock's own sheen on it was a beach of wet sand along both banks.
  float under = smoothstep(0.01, -0.05, over);
  albedo = mix(albedo, vec3(0.21, 0.32, 0.3) * clamp(tone * mark, 0.5, 1.4), 0.85 * under);
  // The pool is a hand deep over slime: dark, green, and a mirror.
  albedo = mix(albedo, vec3(0.035, 0.045, 0.03), 0.85 * film);
  float rough = mix(mix(mix(0.9, 0.36, damp), 0.04, film), 0.95, under);
  // The shade of a hollow, of the gap between two plates, of the gap between two stones.
  float occ = mix(0.4, 1.0, smoothstep(0.2, 0.52, field.b)) * vOcc * mix(1.0, 0.55 + 0.45 * smoothstep(0.1, 0.55, padHigh), inPad) * mix(1.0, 0.62 + 0.55 * crustHigh, hand) * (1.0 - 0.45 * slabCrack);
  // The sun: every edge and every stone throws its own shadow down the shelf, baked in the map at its own fineness.
  float lit = mix(1.0, smoothstep(-0.07, -0.006, field.r - field.g), inNear) * sunSeen(land, p.y) * mix(1.0, crustLit, hand);
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
  float sheen = (1.0 - under) * (1.0 - inPad * smoothstep(0.25, 0.5, padHigh) * (1.0 - padLow)) * (1.0 - shingle) * max(mix(0.42 * damp, 1.0, film), (1.0 - 0.8 * dry) * (0.1 + 0.4 * smoothstep(0.35, 0.75, a.r + 0.6 * (dot(m0 / uMean, vec3(0.3333)) - 1.0) * near)) * (1.0 - steep) * (1.0 - 0.6 * stone) * (1.0 - 0.7 * pit * close)) * (1.0 - 0.8 * steep);
  sheen *= 1.0 - 0.8 * stain;
  // Rock is rough even wet: it never mirrors the sky whole as the pool does, or wet rock near the lens would stand pale as sand.
  // Near the lens the sheen is not a sheet: it lies in the lows of the grain and breaks on its highs, so wet rock is dark with bright points.
  float gloss = mix(1.0, smoothstep(0.62, 0.3, mn.b) * (1.0 - 0.8 * pit * close), mix(near, 0.0, film));
  gloss *= 1.0 - 0.75 * bar;
  gloss *= mix(1.0, smoothstep(0.7, 0.3, crustHigh), hand * (1.0 - film));
  // Farther off the plate's own cracks and seams break it: the wet lies in the low places and glitters, the seams between are dull.
  gloss *= mix(clamp(1.6 * (mark - 0.55), 0.15, 1.0), 1.0, film);
  colour += skyRadiance(back) * (min(fres, mix(0.3, 1.0, film)) * sheen * gloss * (0.75 + 0.25 * film) * 1.1 * occ * land.g);
  // The low sun in the wet sheen: a broad gold glare down the shelf toward it, which is what the backlight of this place is made of.
  float glare = pow(max(dot(reflect(-v, normalize(n + vec3(0.0, 1.5, 0.0))), uSunDir), 0.0), 28.0);
  colour += uSunColour * vec3(1.0, 0.8, 0.55) * (glare * sheen * (0.35 + 0.65 * gloss) * (0.12 + 0.88 * fres) * mix(0.3, 1.0, lit) * cloud * occ * 1.7);
  float tight = sunLobe(normalize(n + vec3(mn.r - 0.5, 0.0, mn.g - 0.5) * 0.5), v, 0.2) * fres * lit;
  // Not on a plate's broken face: there the points stood all over it as a white fuzz.
  colour += uSunColour * (min(tight, 8.0) * cloud * damp * (1.0 - under) * smoothstep(0.4, 0.8, mn.b) * occ * 0.5 * (1.0 - 0.9 * steep));
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

// The main shaft: its dark wet wall (uBone 0) and the pale arches that stand out of it (uBone 1). An arch is smooth mineral, wet all over
// from the steam, so it carries the sky as a sheen; iron in the seep has marbled it with rust, in veins and in runs down its flanks; where
// it meets the wall it is green with damp, and dust lies on its top. The wall is nearly black with wet, green where the seep keeps it,
// pale only in its top beds under the brim. All of the pattern is laid in the world's metres (three ways, by the face), so none can stretch.
export const PIT_FRAGMENT = /* glsl */ `
${COMMON}
uniform float uBone;
uniform sampler2D tMat;
uniform sampler2D tMatN;
uniform vec3 uMean;
uniform vec2 uMat;
${BAND_GLSL}
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
  float height = sa.b * w.x + sb.b * w.y;
  float grey = dot(m0 / uMean, vec3(0.3333));
  float up = clamp(n.y, 0.0, 1.0);

  // Broad fields, by the shape's own metres (along it and round it): too broad to show a stretch. The second is bent by the first, which
  // is what makes a vein wander.
  vec4 a = texture2D(tRock, vUv / mix(vec2(41.0, 17.0), vec2(23.0, 19.0), uBone));
  vec4 b = texture2D(tRock, vUv / mix(vec2(19.0, 7.3), vec2(8.3, 7.1), uBone) + 0.35 * a.ra);
  vec4 c = texture2D(tRock, vec2(vUv.x / 3.1, p.y / 4.2) + 0.3 * b.ar);
  vec3 albedo;
  float rough;
  float occ = vOcc;
  // The wall is bedded stone: level beds a hand to a forearm thick that dip and wander a little, each broken off at its own place.
  float bedAt = p.y / 0.34 + 3.0 * (a.r - 0.5) + 1.4 * (b.a - 0.5) + 0.5 * (c.r - 0.5);
  float bedIn = fract(bedAt);
  float bedLone = fract(sin(floor(bedAt) * 12.9898 + 2.3) * 43758.5453);
  float bedSeen = smoothstep(0.8, 0.3, fwidth(bedAt)) * (1.0 - up);
  float bedFoot = bedSeen * smoothstep(0.22, 0.0, bedIn) * (0.4 + 0.6 * bedLone);
  // The picture's own blocks are held down: at full strength, on courses, the wall was laid masonry with moss in the joints.
  n = normalize(n - 0.55 * uMat.y * (lean - n * dot(lean, n)));
  float tone = clamp(1.0 + 0.6 * (grey - 1.0), 0.5, 1.5);
  vec3 base = mix(vec3(0.035, 0.036, 0.03), vec3(0.11, 0.105, 0.085), clamp(0.5 + 1.5 * (a.r - 0.5), 0.0, 1.0)) * tone;
  // Slime where the seep keeps the rock wet, rust below the foot of an arch, pale lime where water has dried.
  float slime = smoothstep(0.42, 0.62, b.a + 0.3 * (c.r - 0.5));
  base = mix(base, vec3(0.05, 0.062, 0.034) * tone, 0.6 * slime);
  float iron = smoothstep(0.55, 0.75, 0.45 * c.a + 0.55 * b.r + 0.3 * (a.a - 0.5)) * (1.0 - up);
  base = mix(base, vec3(0.15, 0.075, 0.035) * tone, 0.32 * iron);
  float lime = smoothstep(0.7, 0.85, c.r + 0.3 * (b.r - 0.5)) * (1.0 - up);
  base = mix(base, vec3(0.3, 0.31, 0.26) * tone, 0.2 * lime);
  // The top beds are the shelf's own stone: pale, green with weed, not yet wet through.
  float topBeds = smoothstep(-3.6, -0.8, p.y + 2.0 * (a.a - 0.5));
  albedo = mix(base, mix(vec3(0.2, 0.18, 0.14), vec3(0.11, 0.115, 0.08), slime) * tone, 0.7 * topBeds);
  // Runs: where water comes down the face the rock is black and shines, and between the runs lime has dried pale on it.
  // A run is a few paces long and an arm wide, and a bed's lip breaks it: drawn out twenty times its width, as it was, the face was
  // combed into upright stripes a finger apart from top to bottom.
  float streak = texture2D(tRock, vec2(vUv.x / 5.3, p.y / 8.0) + 0.15 * a.ra).r + 0.5 * (texture2D(tRock, vec2(vUv.x / 2.9 + 0.3, p.y / 4.0)).a - 0.5);
  float wetRun = smoothstep(0.52, 0.36, streak + 0.12 * (bedLone - 0.5)) * (1.0 - up);
  albedo *= mix(1.0, 0.5, wetRun);
  albedo = mix(albedo, vec3(0.3, 0.27, 0.2) * tone, 0.16 * smoothstep(0.66, 0.8, streak) * (1.0 - up));
  // The beds: one is not the tone of the next, and the foot of each is shut in under the lip of the one above.
  albedo *= mix(1.0, 0.55, bedFoot) * mix(1.0, 0.72 + 0.56 * bedLone, 0.7 * bedSeen);
  n = normalize(n + vec3(0.0, bedSeen * mix(0.16, -0.8, smoothstep(0.22, 0.0, bedIn)) * (0.4 + 0.6 * bedLone), 0.0));
  occ *= mix(1.0, 0.6, bedFoot);
  // A ledge holds what falls: grit, paler than the face.
  albedo = mix(albedo, vec3(0.2, 0.185, 0.16) * tone, 0.6 * smoothstep(0.6, 0.9, up));
  rough = mix(mix(0.3, 0.75, topBeds), 0.16, wetRun);
  occ *= 0.75 + 0.5 * height;
  // The tiers carried on round the side that fell: bands of the arches' own stone, cream with rust in it, and under each the wall is
  // rust-dark and wet with what runs off it.
  float bearing = degrees(atan(p.x, -p.z));
  float band = smoothstep(0.03, 0.3, bandOn(bearing, p.y));
  float underBand = bandOn(bearing, p.y + 1.25) * (1.0 - band);
  vec3 trav = mix(vec3(0.5, 0.45, 0.36), vec3(0.75, 0.69, 0.585), smoothstep(0.3, 0.7, a.r + 0.4 * (grey - 1.0)));
  // Its rust is flowstone's: marbled patches that wander, darker at the heart, and runs under the lip. Ruled bed by bed it was a striped sweet.
  vec4 lie = texture2D(tRock, vec2(vUv.x / 13.0, p.y / 4.6) + 0.3 * b.ar);
  float flow = smoothstep(0.46, 0.66, lie.a + 0.5 * (b.a - 0.5) + 0.2 * (c.a - 0.5));
  trav = mix(trav, mix(vec3(0.46, 0.25, 0.1), vec3(0.22, 0.1, 0.04), smoothstep(0.62, 0.8, lie.a + 0.5 * (b.a - 0.5))), 0.66 * flow);
  trav *= 0.86 + 0.28 * lie.g;
  trav *= tone * mix(1.0, 0.8, bedFoot) * mix(1.0, 0.86 + 0.28 * bedLone, 0.5 * bedSeen) * mix(1.0, 0.7, wetRun);
  albedo = mix(albedo, trav, band);
  albedo = mix(albedo, vec3(0.15, 0.07, 0.03) * tone, 0.6 * underBand);
  rough = mix(rough, mix(0.2, 0.5, smoothstep(0.35, 0.65, lie.g)), band);
  rough = mix(rough, 0.14, 0.7 * underBand);

  // Down the shaft: the land map says where the pit is. A face there sees the sky as a disc overhead, smaller the deeper it is.
  vec4 land = landAt(p.xz);
  float pit = smoothstep(-6.0, -30.0, land.r) * smoothstep(1.5, -1.5, p.y);
  float depth = max(-p.y, 0.0);
  float openUp = 1.0 / (1.0 + depth * depth / 700.0);
  float openSide = 0.6 / (1.0 + depth * depth / 1500.0);
  float open = mix(1.0, mix(openSide, openUp, up), pit);
  vec3 colour = rigShadeOn(land, p, n, v, albedo, rough, occ * open);
  // What the shut-off part of the sky is replaced by: the far wall and the mist in the shaft, lit by the sky and by the sun on the south wall.
  vec3 bounce = (0.55 * uSkyHorizon * uFill + 0.3 * uGlowColour) * (pit * (1.0 - open) * (0.55 + 0.45 * smoothstep(-0.2, 0.6, -n.y + 0.4)));
  bounce += uSunColour * (0.12 * pit * exp(-depth / 30.0));
  colour += albedo * bounce * occ;
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

// A hoop of the main shaft (land/arches.ts): a thick bank of travertine, laid down bed on bed. Its face toward the shaft and every broken
// end show the beds on edge: the sheet of a broken bedded face, laid by metres along the hoop and metres over its middle (so its beds run
// with the hoop and are the same beds the mesh steps in and out), and on an end by metres from the axis. Its top and its belly are the
// outer skin, laid flat. Both sheets have a height, which leans the normal, shuts the recesses and darkens the foot of an overhang.
export const HOOP_FRAGMENT = /* glsl */ `
${COMMON}
uniform sampler2D tFace;
uniform sampler2D tFaceH;
uniform sampler2D tSkin;
uniform sampler2D tSkinH;
uniform vec3 uFaceMean;
uniform vec3 uSkinMean;
uniform vec4 uSheet;
void main() {
  vec3 p = vWorld;
  vec3 v = normalize(cameraPosition - p);
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  float rad = length(p.xz);
  vec3 er = vec3(p.x, 0.0, p.z) / max(rad, 1.0);
  vec3 et = vec3(-er.z, 0.0, er.x);
  float wt = abs(dot(n, et));
  float wr = abs(dot(n, er));
  float up = clamp(n.y, 0.0, 1.0);
  float level = smoothstep(0.62, 0.86, abs(n.y));
  bool ended = wt > 1.25 * wr;

  vec4 a = texture2D(tRock, vUv / vec2(23.0, 19.0));
  vec4 b = texture2D(tRock, vUv / vec2(8.3, 7.1) + 0.35 * a.ra);
  vec4 c = texture2D(tRock, vec2(vUv.x / 3.1, p.y / 9.0) + 0.3 * b.ar);

  // The face: beds on edge.
  vec2 fa = vec2(vUv.x, vUv.y) / uSheet.xy;
  vec2 fb = vec2(rad * 1.3 + 2.7, vUv.y) / uSheet.xy;
  // Every screen derivative is taken here, before any choice that differs from pixel to pixel.
  vec2 fax = dFdx(fa);
  vec2 fay = dFdy(fa);
  vec2 fbx = dFdx(fb);
  vec2 fby = dFdy(fb);
  vec2 suv = vec2(vUv.x, rad + vUv.y) / uSheet.z;
  vec2 sdx = 1.2 * dFdx(suv);
  vec2 sdy = 1.2 * dFdy(suv);
  vec2 fuv = ended ? fb : fa;
  vec2 fdx = 1.2 * (ended ? fbx : fax);
  vec2 fdy = 1.2 * (ended ? fby : fay);
  vec3 faceCol = textureGrad(tFace, fuv, fdx, fdy).rgb / uFaceMean;
  float h0 = textureGrad(tFaceH, fuv, fdx, fdy).r;
  // The relief fades where a bed is finer than a pixel: there it would only be grain.
  float seen = smoothstep(0.05, 0.012, max(length(fdx), length(fdy)));
  // Not all of the face is broken: where the outer skin is whole it lies over the beds, and they show through it at half strength.
  float whole = ended ? 0.0 : 0.72 * smoothstep(0.36, 0.56, a.a + 0.4 * (c.r - 0.5));
  level = max(level, whole);
  vec3 skinCol = textureGrad(tSkin, suv, sdx, sdy).rgb / uSkinMean;
  float s0 = textureGrad(tSkinH, suv, sdx, sdy).r;
  float seenSkin = smoothstep(0.05, 0.012, max(length(sdx), length(sdy)));
  vec3 tex = mix(faceCol, skinCol, level);
  float height = mix(h0, s0, level);
  // One relief in metres, and the lean of the normal from its slope across the screen.
  float relief = uSheet.w * mix(seen * h0, 0.55 * seenSkin * s0, level);
  vec3 dpx = dFdx(p);
  vec3 dpy = dFdy(p);
  vec3 r1 = cross(dpy, n);
  vec3 r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dFdx(relief) * r1 + dFdy(relief) * r2) / max(abs(det), 1e-9);
  grad *= min(1.0, 2.5 / max(length(grad), 1e-4));
  // A bed under one that stands out is in its shade.
  float under = (1.0 - 0.7 * level) * clamp(0.25 * grad.y, 0.0, 1.0);
  n = normalize(n - grad);

  // Ivory, with the sheet's own rust, pits and beds as tone and hue; paler on the beds that stand out.
  float grey = dot(tex, vec3(0.3333));
  vec3 hue = tex / max(grey, 0.05);
  vec3 ivory = mix(vec3(0.68, 0.645, 0.575), vec3(0.88, 0.855, 0.79), clamp(0.45 + 1.4 * (a.r - 0.5) + 0.5 * (height - 0.5), 0.0, 1.0));
  vec3 albedo = ivory * mix(vec3(1.0), hue, 0.24) * clamp(mix(1.0, grey, 0.3), 0.5, 1.3);
  // Rust beyond the sheet's own: broad marbled patches with dark hearts, and runs down the face from them.
  float patch0 = smoothstep(0.5, 0.66, b.a + 0.5 * (a.a - 0.5) + 0.14 * (1.0 - up) - 0.1 * (height - 0.5) + 0.12 * (c.a - 0.5));
  float heart = smoothstep(0.66, 0.8, b.a + 0.5 * (a.a - 0.5));
  float runs = smoothstep(0.5, 0.7, c.r + 0.25 * patch0) * smoothstep(0.75, 0.2, n.y) * smoothstep(-0.95, -0.3, n.y);
  vec3 rust = mix(vec3(0.52, 0.29, 0.11), vec3(0.24, 0.11, 0.04), heart);
  albedo = mix(albedo, rust * clamp(grey, 0.5, 1.4), 0.72 * patch0);
  albedo = mix(albedo, vec3(0.42, 0.21, 0.08) * clamp(grey, 0.5, 1.4), 0.62 * runs * (1.0 - 0.6 * patch0));
  // Green and dark with damp where it meets the wall and under its belly, and in the recesses between the beds there.
  float damp = smoothstep(0.8, 0.45, vOcc + 0.25 * (c.a - 0.5) + 0.2 * (height - 0.5));
  albedo = mix(albedo, vec3(0.13, 0.15, 0.075) * (0.5 + 0.6 * grey), 0.75 * damp);
  // Dust and grit lie on its top, in the lows of the skin.
  float dust = smoothstep(0.86, 0.98, up) * smoothstep(0.55, 0.3, height + 0.4 * (a.a - 0.5));
  albedo = mix(albedo, vec3(0.5, 0.47, 0.42) * clamp(grey, 0.6, 1.3), 0.5 * dust);
  float rough = mix(mix(0.46, 0.24, level), 0.85, dust);
  rough = mix(rough, 0.26, 0.6 * damp);
  float occ = vOcc * mix(0.74, 1.04, smoothstep(0.12, 0.62, height)) * (1.0 - 0.4 * under);

  vec4 land = landAt(p.xz);
  float pit = smoothstep(-6.0, -30.0, land.r) * smoothstep(1.5, -1.5, p.y);
  float depth = max(-p.y, 0.0);
  float openUp = 1.0 / (1.0 + depth * depth / 700.0);
  float openSide = 0.6 / (1.0 + depth * depth / 1500.0);
  float open = mix(1.0, mix(openSide, openUp, up), pit);
  vec3 colour = rigShadeOn(land, p, n, v, albedo, rough, occ * open);
  vec3 bounce = (0.55 * uSkyHorizon * uFill + 0.3 * uGlowColour) * (pit * (1.0 - open) * (0.55 + 0.45 * smoothstep(-0.2, 0.6, -n.y + 0.4)));
  bounce += uSunColour * (0.12 * pit * exp(-depth / 30.0));
  colour += albedo * bounce * occ;
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

// The wall of the shaft and its ribs (land/wall.ts): the colour is the wall plate's picture on the mesh its relief shaped. What the mesh is
// too coarse to hold (the chips, the cracks, the drips) is taken from the same relief as a lean of the normal and a shade in the folds,
// at a low strength (the relief is a guess at form, not a measure). A top or an underside is seen edge on by the plate, so there the
// plate would stretch: those faces take the plate's broad colour and a stone laid flat in the world instead.
// The same holds for every face the relief turns away from the plate: the flank of a fold in the wall, the end of a rib. The plate is laid
// by bearing and depth, so on such a face one of its texels is drawn out over a hand to a metre of rock, and its relief with it: that was
// the streak down every fold. How far the plate is drawn out is measured at every pixel (drawn), and as it grows the plate gives only
// its broad colour, blurred by as much, and its relief gives nothing: the pattern there is bedded stone laid in the world, which cannot stretch.
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
uniform sampler2D tBeds;
uniform sampler2D tBedsN;
uniform vec3 uBedsMean;
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

  // How far the plate is drawn out on this face: the metres of rock that one metre of the plate is laid over, down it and along it.
  // On the plain wall both are 1. Where the relief pushes the mesh toward the axis the face turns away from the plate and they grow.
  vec3 dpx = dFdx(p);
  vec3 dpy = dFdy(p);
  vec2 dux = dFdx(vUv);
  vec2 duy = dFdy(vUv);
  float det = dux.x * duy.y - dux.y * duy.x;
  float idet = 1.0 / (abs(det) > 1e-14 ? det : 1e-14);
  float drawnDown = length(dpy * dux.x - dpx * duy.x) * abs(idet) / 33.75;
  float drawnAlong = length(dpx * duy.y - dpy * dux.y) * abs(idet) / (2.0 * length(p.xz));
  float drawn = max(drawnDown, drawnAlong);

  float away = smoothstep(1.15, 2.2, drawn);
  vec2 texels = vec2(1672.0, 941.0);
  float seenLod = 0.5 * log2(max(max(dot(dux * texels, dux * texels), dot(duy * texels, duy * texels)), 1e-8));
  float drawnLod = max(seenLod, log2(max(drawn, 1.0)) + 1.5);

  vec3 plate = texture2D(tWall, vUv, away * max(drawnLod - seenLod, 0.0)).rgb;
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
  vec2 lean = (vec2(hr - hl, hu - hd) / 0.0718 - vec2(wr - wl, wu - wd) / 0.5024) * (uWall.x * (1.0 - away));
  float fold = (h - 0.25 * (wl + wr + wd + wu)) * (1.0 - away);

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
  // Read once, on the plane the face most nearly lies in: it shows only within a few strides of the lens, and three reads of it were
  // paid on every pixel of the wall from every lens.
  vec3 g1 = texture2D(tGrain, (flat0 > 0.5 ? gq : (wx > 0.5 ? gqx : gqz)) * 4.7 + 0.3).rgb;
  float grain = mix(1.0, clamp(1.0 + 1.3 * (dot(g0 / uGrainMean, vec3(0.3333)) - 1.0), 0.5, 1.6), max(near, 0.45)) * mix(1.0, clamp(dot(g1 / uGrainMean, vec3(0.3333)), 0.6, 1.45), close);
  // The beds: stone that breaks in level courses a hand to a pace thick, seen from the side. Laid in the world on the two upright planes,
  // each face taking the one it most nearly lies in.
  vec2 bqz = vec2(p.x, p.y) / 5.0;
  vec2 bqx = vec2(p.z, p.y) / 5.0;
  // One plane a face and one read of each picture, at the size the wall's metres are seen at: read on both planes and at two sizes, the
  // beds cost the wall half as much again as all the rest of it. The two planes meet where the wall runs at 45 degrees to both; the beds
  // lie level on each, so only their breaks along the bed change there.
  vec2 bsel = wx > 0.5 ? bqx : bqz;
  float blod = max(log2(max(length(dpx), length(dpy)) * float(textureSize(tBeds, 0).x) / 5.0) - 0.5, 0.0);
  vec3 b0 = textureLod(tBeds, bsel, blod).rgb;
  vec3 bs = textureLod(tBedsN, bsel, blod).rgb;
  float bedTone = clamp(dot(b0 / uBedsMean, vec3(0.3333)), 0.35, 1.9);
  vec3 t0 = texture2D(tMat, p.xz / 4.0 + 0.37).rgb;
  vec3 ts = texture2D(tMatN, p.xz / 4.0 + 0.37).rgb;
  float tone = clamp(1.0 + 1.2 * (dot(t0 / uMean, vec3(0.3333)) - 1.0), 0.5, 1.6);

  vec3 n = gn - (along * lean.x + upward * lean.y) * face;
  // The courses turn the light: each has a top edge that catches the sky and a foot in its own shade. Stronger where the plate has gone soft.
  vec3 course = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), wx) * (bs.r - 0.5) + upward * (bs.g - 0.5);
  n -= (course - gn * dot(course, gn)) * (mix(0.9, 1.8, away) * face);
  n -= (along * (gs.r - 0.5) + upward * (gs.g - 0.5)) * (0.9 * near * face);
  n -= vec3(ts.r - 0.5 + (gs.r - 0.5) * near, 0.0, ts.g - 0.5 + (gs.g - 0.5) * near) * (0.8 * top);
  n = normalize(n);

  // The top of a rib holds dust and broken stone and is the palest thing in the shaft; its underside is wet and dark.
  float rib = smoothstep(0.5, 0.7, texture2D(tWallH, vUv, 3.0).r);
  // Its colour is the stone's own, laid flat in the world at two sizes: the wall's picture cannot be laid on a top, it is drawn out there
  // into streaks metres long.
  vec3 fineTop = clamp(texture2D(tMat, p.xz / 1.3 + 0.11).rgb / uMean, 0.45, 1.7);
  // A ledge of the wall's own courses is not a rib: its top is the wall's wet stone with a little dust on it, not a pale band.
  vec3 onTop = mix(broad, vec3(0.56, 0.53, 0.47), mix(0.16, 0.8, rib)) * mix(0.75, 1.0, rib) * tone * mix(vec3(1.0), fineTop, 0.75 * near + 0.1);
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
  float bedded = mix(0.5, 1.0, away) * mix(1.0, 0.55, rib);
  vec3 albedo = (stoneCol * (face * mix(1.0, bedTone, bedded)) * mix(vec3(0.62, 0.72, 0.72), vec3(2.2, 2.2, 2.2), rib) + onTop * top + below * under) * grain * uWall.y;
  // Stains: rust runs down the wall and the faces of the ribs in streaks an arm to a pace wide, and the damp holds dark green in patches
  // between the ribs. Both are laid by the bearing round the shaft and the depth (whole repeats round it: no seam), so they run true down.
  float bear = atan(p.x, -p.z) / 6.28318;
  // A run is as long as two or three beds are deep and no more: drawn out from top to bottom it was a smear down the wall.
  float run = 0.6 * textureLod(tRock, vec2(bear * 43.0, p.y / 6.5), 0.0).r + 0.4 * textureLod(tRock, vec2(bear * 97.0 + 0.4, p.y / 3.1), 1.0).a;
  float rust = smoothstep(0.52, 0.72, run) * (1.0 - 0.6 * top) * (1.0 - under);
  albedo = mix(albedo, albedo * vec3(0.95, 0.6, 0.36), 0.45 * rust);
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
  // A course's foot and the crack between two are shut in: the beds' own height says where.
  float crack = mix(1.0, clamp(0.45 + 1.1 * bs.b, 0.4, 1.15), bedded * face);
  float occ = shut * open * clamp(1.0 + uWall.w * fold, 0.35, 1.2) * crack;
  vec3 colour = rigShadeOn(land, p, n, v, albedo, rough, occ);
  // What the shut-off sky is replaced by: the far wall and the mist in the shaft, lit by the sky and by the sun on the south wall.
  vec3 bounce = (0.55 * uSkyHorizon * uFill + 0.3 * uGlowColour) * ((1.0 - open) * (0.55 + 0.45 * smoothstep(-0.2, 0.6, -n.y + 0.4)));
  // And by the low sun itself, second hand: it lights the mist that fills the shaft and the top of the wall it strikes, and they light the
  // rest, warm, from the side and from below as much as from above. It is why a rib in the shade of the shaft is ivory and not grey.
  bounce += uSunColour * (uBounce * exp(-depth / 30.0) * (0.6 + 0.4 * clamp(dot(n, -normalize(vec3(p.x, 0.0, p.z))), 0.0, 1.0)));
  colour += albedo * bounce * mix(0.6, 1.0, vOcc) * clamp(1.0 + uWall.w * fold, 0.35, 1.2) * crack;
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
  wall(plate: THREE.Texture, relief: THREE.Texture, top: Surface, grain: Surface, beds: Surface): THREE.ShaderMaterial;
  bone(amount: number, pale: [number, number, number], dark: [number, number, number], of: Surface, side?: THREE.Side): THREE.ShaderMaterial;
  /** The main shaft: 0 its wall, 1 its arches. */
  pit(amount: number, of: Surface): THREE.ShaderMaterial;
  /** A hoop of the main shaft: the sheet of its bedded face (`metres` wide, `tall` high) and of its skin. */
  hoop(face: Surface, tall: number, skin: Surface): THREE.ShaderMaterial;
  dispose(): void;
}

/** The dry ground of the shelf: the one square where the dead one lies (colour and height) and the shingle tile. */
export interface DryGround {
  pad: THREE.Texture;
  padHeight: THREE.Texture;
  pebbles: Surface;
  /** The ground at the lens: travertine crust, and the gravel in its lows. */
  crust: Surface;
  gravel: Surface;
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
    shelf: make(SHELF_FRAGMENT, { ...of(shelf), tPlate: { value: plate }, tNear: { value: near.texture }, tNearS: { value: near.slopes }, uNear: { value: near.rect }, tPad: { value: dry.pad }, tPadH: { value: dry.padHeight }, tPeb: { value: dry.pebbles.colour }, tPebN: { value: dry.pebbles.data }, tCrust: { value: dry.crust.colour }, tCrustN: { value: dry.crust.data }, tGravel: { value: dry.gravel.colour }, tGravelN: { value: dry.gravel.data }, uCrustMean: { value: new THREE.Vector3(...dry.crust.mean) } }),
    wall: (plate, relief, top, grain, beds) =>
      make(
        WALL_FRAGMENT,
        {
          ...of(top),
          tWall: { value: plate },
          tWallH: { value: relief },
          tGrain: { value: grain.colour },
          tGrainN: { value: grain.data },
          uGrainMean: { value: new THREE.Vector3(...grain.mean) },
          tBeds: { value: beds.colour },
          tBedsN: { value: beds.data },
          uBedsMean: { value: new THREE.Vector3(...beds.mean) },
          // x metres the fine relief is drawn as, y gain on the plate's colour, z the sky a shut cell still sees, w how dark a fold is.
          uWall: { value: new THREE.Vector4(0.45, 1.3, 0.3, 2.0) },
          // How much of the sun's light the mist and the far wall hand on to a face in the shaft.
          uBounce: { value: 0.06 },
        },
        THREE.DoubleSide,
      ),
    bone: (amount, pale, dark, surface, side) => make(BONE_FRAGMENT, { uBone: { value: amount }, uPale: { value: new THREE.Vector3(...pale) }, uDark: { value: new THREE.Vector3(...dark) }, ...of(surface) }, side),
    pit: (amount, surface) => make(PIT_FRAGMENT, { uBone: { value: amount }, ...of(surface) }, THREE.DoubleSide),
    hoop: (face, tall, skin) =>
      make(
        HOOP_FRAGMENT,
        {
          tFace: { value: face.colour },
          tFaceH: { value: face.data },
          tSkin: { value: skin.colour },
          tSkinH: { value: skin.data },
          uFaceMean: { value: new THREE.Vector3(...face.mean) },
          uSkinMean: { value: new THREE.Vector3(...skin.mean) },
          // Metres the face's sheet is wide and tall, metres the skin's sheet is across, metres from the lowest of the relief to the highest.
          uSheet: { value: new THREE.Vector4(face.metres, tall, skin.metres, face.relief) },
        },
        THREE.DoubleSide,
      ),
    dispose: () => {
      for (const m of made) m.dispose();
      tile.dispose();
    },
  };
}
