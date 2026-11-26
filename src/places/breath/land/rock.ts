// The rock of the Breath: one tile of noise baked at creation, and the three surfaces cut from it. The shelf (ivory bone-rock, wet, pitted,
// jointed, stained where the tide stands), the bone of the shaft (its wall, its hoops and the slabs that fell from them), and the far cliff.
// All three are lit by the rig alone.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';
import { PLATE, SEA } from '../land';
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
  float hang = smoothstep(0.35, 0.1, gn.y);
  vec3 n = normalize(mix(mix(gn, normalize(vec3(-slope.x, 1.0, -slope.y)), inNear), normalize(vec3(-p.x, 0.25 * length(p.xz), -p.z)), hang));

  // The plate, and near the lens the grain of wet rock too fine for the plate to hold (mat/wetrock, 1.5 m).
  vec2 pq = vec2(p.x / ${PLATE.metres.toFixed(1)}, 1.0 - p.z / ${PLATE.depth.toFixed(4)});
  // The hanging face of the brim is seen edge on by the plate: it takes the plate's broad colour, not its stretched picture.
  vec3 plate = mix(texture2D(tPlate, pq).rgb, texture2D(tPlate, pq, 5.0).rgb * 0.7, hang);
  vec4 a = texture2D(tRock, p.xz / 37.0);
  float near = smoothstep(26.0, 5.0, dist);
  vec3 m0 = texture2D(tMat, p.xz / 1.5 + 0.57).rgb;
  vec3 mn = texture2D(tMatN, p.xz / 1.5 + 0.57).rgb;
  float tone = mix(1.0, clamp(1.0 + 1.5 * (dot(m0 / uMean, vec3(0.3333)) - 1.0), 0.45, 1.7), near);
  vec2 lean = (mn.rg - 0.5) * 1.3 * near;

  float steep = smoothstep(0.3, 0.75, 1.0 - n.y);
  float stone = smoothstep(0.02, 0.2, field.a);
  float hollow = smoothstep(0.5, 0.3, field.b);
  // Wet: everything near the tide and the foot of every edge near it; the pool, and a margin round it.
  float over = field.r - (${SEA.toFixed(3)});
  float film = slope.b;
  float damp = clamp(1.0 - smoothstep(0.06, 0.55, over + 0.3 * (a.a - 0.5)) + 0.5 * hollow * smoothstep(0.5, 0.75, a.r) + film, 0.0, 1.0);
  n = normalize(n - vec3(lean.x, 0.0, lean.y) * (1.0 - film));
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), 0.97 * film));

  // The rock: the plate's own colour, cooled a little (it was painted under a warm lamp), each loose stone its own tone.
  // It is wet, and seen against the light: its own colour is the lesser part of what reaches the lens, the sheen the greater.
  vec3 rock = plate * vec3(0.62, 0.64, 0.66) * tone;
  rock = mix(rock, rock * (0.55 + 0.9 * field.a), stone);
  // The steep edge of a plate is broken rock: darker, rustier than its top.
  // It takes the grain of wet rock laid square on its own face (not the plate's picture pulled down it), in level bands as the beds lie.
  vec3 side = abs(n.x) > abs(n.z) ? texture2D(tMat, vec2(p.z, p.y * 2.2) / 1.1).rgb : texture2D(tMat, vec2(p.x, p.y * 2.2) / 1.1).rgb;
  vec3 face = texture2D(tPlate, pq, 4.0).rgb * vec3(0.7, 0.6, 0.5) * clamp(dot(side / uMean, vec3(0.3333)), 0.35, 1.8) * (0.75 + 0.25 * sin(p.y * 70.0 + 3.0 * a.g));
  rock = mix(rock, face, steep * (1.0 - stone));
  // A dark green-brown weed along the tide line and in the wet foot of the edges near it.
  float tide = smoothstep(0.5, 0.05, abs(over - 0.1)) * smoothstep(0.3, 0.6, a.b * 2.0 + 0.5 * (tone - 1.0)) + 0.5 * hollow * smoothstep(0.6, 0.15, over);
  rock = mix(rock, vec3(0.045, 0.05, 0.028) * (0.6 + 0.8 * tone), 0.7 * clamp(tide, 0.0, 1.0));
  vec3 albedo = rock * mix(1.0, 0.4, damp);
  // The pool is a hand deep over slime: dark, green, and a mirror.
  albedo = mix(albedo, vec3(0.035, 0.045, 0.03), 0.85 * film);
  float rough = mix(mix(0.9, 0.36, damp), 0.04, film);
  // The shade of a hollow, of the gap between two plates, of the gap between two stones.
  float occ = mix(0.4, 1.0, smoothstep(0.2, 0.52, field.b)) * vOcc;
  // The sun: every edge and every stone throws its own shadow down the shelf, baked in the map at its own fineness.
  float lit = mix(1.0, smoothstep(-0.07, -0.006, field.r - field.g), inNear) * sunSeen(land, p.y);
  land.b = p.y + mix(0.35, 0.03, lit);
  vec3 colour = rigShadeOn(land, p, n, v, albedo, rough, occ);
  // Where it is wet the shelf mirrors the lit haze at the horizon, and in the glare path the wet grain throws the low sun back in points.
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float fres = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
  vec3 back = reflect(-v, n);
  back.y = abs(back.y);
  // The whole shelf has a thin wet sheen at dawn: at a grazing angle even a dry plate mirrors the sky, and toward the sun that is the gold glare.
  float sheen = max(damp, 0.55 * (1.0 - steep) * (1.0 - 0.6 * stone));
  colour += skyRadiance(back) * (fres * sheen * (0.75 + 0.25 * film) * 1.1 * occ * land.g);
  // The low sun in the wet sheen: a broad gold glare down the shelf toward it, which is what the backlight of this place is made of.
  float glare = pow(max(dot(reflect(-v, normalize(n + vec3(0.0, 1.5, 0.0))), uSunDir), 0.0), 28.0);
  colour += uSunColour * vec3(1.0, 0.8, 0.55) * (glare * sheen * (0.12 + 0.88 * fres) * mix(0.3, 1.0, lit) * occ * 1.7);
  float tight = sunLobe(normalize(n + vec3(mn.r - 0.5, 0.0, mn.g - 0.5) * 0.5), v, 0.2) * fres * lit;
  colour += uSunColour * (min(tight, 8.0) * damp * smoothstep(0.4, 0.8, mn.b) * occ * 0.5);
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

  float top = smoothstep(0.45, 0.8, gn.y);
  float under = smoothstep(0.3, 0.7, -gn.y);
  float face = 1.0 - top - under;
  float near = smoothstep(46.0, 9.0, dist);
  // The grain of wet rock, by the wall's own metres on a face (it cannot stretch there), flat in the world on a top.
  vec2 gq = mix(vUv * vec2(40.0, 22.5), p.xz / 1.5, step(0.5, top));
  vec3 g0 = texture2D(tGrain, gq).rgb;
  vec3 gs = texture2D(tGrainN, gq).rgb;
  float grain = mix(1.0, clamp(1.0 + 1.3 * (dot(g0 / uGrainMean, vec3(0.3333)) - 1.0), 0.5, 1.6), near);
  vec3 t0 = texture2D(tMat, p.xz / 4.0 + 0.37).rgb;
  vec3 ts = texture2D(tMatN, p.xz / 4.0 + 0.37).rgb;
  float tone = clamp(1.0 + 1.2 * (dot(t0 / uMean, vec3(0.3333)) - 1.0), 0.5, 1.6);

  vec3 n = gn - (along * lean.x + upward * lean.y) * face;
  n -= (along * (gs.r - 0.5) + upward * (gs.g - 0.5)) * (0.9 * near * face);
  n -= vec3(ts.r - 0.5 + (gs.r - 0.5) * near, 0.0, ts.g - 0.5 + (gs.g - 0.5) * near) * (0.8 * top);
  n = normalize(n);

  // The top of a rib holds dust and broken stone and is the palest thing in the shaft; its underside is wet and dark.
  float rib = smoothstep(0.5, 0.7, texture2D(tWallH, vUv, 3.0).r);
  vec3 onTop = mix(broad, vec3(0.4, 0.36, 0.3), 0.3 + 0.35 * rib) * tone;
  vec3 below = broad * 0.6;
  // The rib is ivory: the plate's own pale stone, a little paler still than the wet wall it stands out of.
  vec3 albedo = (plate * face * mix(0.85, 1.25, rib) + onTop * top + below * under) * grain * uWall.y;
  float lum = dot(plate, vec3(0.3333));
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
  wall(plate: THREE.Texture, relief: THREE.Texture, top: Surface, grain: Surface): THREE.ShaderMaterial;
  bone(amount: number, pale: [number, number, number], dark: [number, number, number], of: Surface, side?: THREE.Side): THREE.ShaderMaterial;
  dispose(): void;
}

export function createRock(uniforms: Record<string, THREE.IUniform>, rng: Rng, shelf: Surface, plate: THREE.Texture, cliff: Surface, near: NearMap): RockKit {
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
    shelf: make(SHELF_FRAGMENT, { ...of(shelf), tPlate: { value: plate }, tNear: { value: near.texture }, tNearS: { value: near.slopes }, uNear: { value: near.rect } }),
    cliff: make(CLIFF_FRAGMENT, of(cliff), THREE.DoubleSide),
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
          uWall: { value: new THREE.Vector4(0.45, 1.05, 0.3, 2.0) },
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
