// The rock of the Breath: one tile of noise baked at creation, and the three surfaces cut from it. The shelf (ivory bone-rock, wet, pitted,
// jointed, stained where the tide stands), the bone of the shaft (its wall, its hoops and the slabs that fell from them), and the far cliff.
// All three are lit by the rig alone.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';
import { RIG_GLSL } from '../shared/glsl';

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

// The shelf: wet bone-rock in level plates, each a hand higher than the next, with scalloped edges and a line of shade under each edge.
// The low plates hold a film of water that mirrors the sky. Smooth and broad from far off; the grain shows only near the lens.
export const SHELF_FRAGMENT = /* glsl */ `
${COMMON}
void main() {
  vec3 p = vWorld;
  vec3 toEye = cameraPosition - p;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec3 n = normalize(vNormal);
  vec4 land = landAt(p.xz);
  vec4 a = texture2D(tRock, p.xz / 71.0);
  vec4 b = texture2D(tRock, p.xz / 13.7 + 0.37);
  vec4 c = texture2D(tRock, p.xz / 2.3 + 0.11);

  // The plates, broad ones broken into smaller ones, worn into swells and hollows: metres. Under the tide line the bed is plain.
  float dry = smoothstep(-0.7, -0.25, p.y);
  float rel = 0.42 * a.g + 0.13 * b.g + 0.33 * a.r + 0.12 * b.r;
  // Near the lens the plates are seen to be thin beds that flake: the same pavement again, a hand across, a finger high.
  float near = smoothstep(55.0, 8.0, dist);
  float h = (0.75 * a.g + 0.22 * b.g) * dry + 0.6 * a.r + 0.2 * b.r + 0.06 * c.r + 0.03 * c.a + 0.06 * c.g * near;
  // Where two plates meet there is a seam, open in places and closed in others.
  float crack = 0.5 * max(smoothstep(0.035, 0.0, a.b), 0.6 * smoothstep(0.04, 0.0, b.b)) * dry * smoothstep(0.45, 0.65, b.a);

  // Water stands in the hollows: silver sheets that mirror the sky. Everything low is wet and dark.
  float pool = land.a + 2.4 * (0.43 - rel);
  float film = smoothstep(0.0, 0.1, pool) * (1.0 - 0.6 * crack);
  float wet = clamp(0.5 + 2.5 * pool, 0.0, 1.0);
  float hollow = smoothstep(0.58, 0.36, rel);
  n = raised(p, n, h);
  float steep = smoothstep(0.08, 0.35, 1.0 - n.y);
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), 0.92 * film));

  // The high plates are washed pale and dry; the low ones are dark with wet.
  vec3 rock = mix(vec3(0.16, 0.155, 0.15), vec3(0.56, 0.545, 0.52), clamp(0.4 + 1.0 * (a.a - 0.5) + 1.1 * (b.r - 0.5) + 0.9 * (c.a - 0.5) + 1.5 * (rel - 0.48) + 0.5 * (a.g - 0.5), 0.0, 1.0));
  // Mineral crust where the vapour dries on the high plates: white, with ochre at its edge. It flakes, so it is patchy at every size.
  float crust = smoothstep(0.5, 0.64, 0.5 * b.a + 0.3 * c.r + 0.2 * a.a + 0.5 * (rel - 0.5));
  float ochre = smoothstep(0.42, 0.5, 0.5 * b.a + 0.3 * c.r + 0.2 * a.a + 0.5 * (rel - 0.5)) * (1.0 - crust);
  rock = mix(rock, vec3(0.4, 0.27, 0.13), 0.7 * ochre);
  rock = mix(rock, vec3(0.5, 0.48, 0.44) * (0.6 + 0.7 * c.a), crust * (0.45 + 0.55 * smoothstep(0.35, 0.65, c.r)));
  // Tea-brown where water has stood and dried, olive weed along the tide line.
  float stain = smoothstep(0.45, 0.7, b.a + 0.5 * (a.r - 0.5) + 0.3 * (c.r - 0.5));
  rock = mix(rock, rock * vec3(0.62, 0.47, 0.34), 0.6 * stain);
  float tide = smoothstep(0.8, 0.0, abs(p.y + 0.05)) * smoothstep(0.4, 0.62, b.r);
  rock = mix(rock, vec3(0.085, 0.095, 0.05), 0.55 * tide);
  // A riser shows the beds it is made of: thin courses, some standing proud, broken where the plate broke.
  float beds = 0.5 + 0.5 * sin((p.y + h) * 46.0 + 5.0 * b.r + 3.0 * c.r);
  vec3 albedo = rock * mix(1.0, 0.5, wet) * (1.0 - 0.45 * crack) * (1.0 - 0.3 * hollow) * mix(1.0, 0.55 + 0.6 * beds, steep) * (0.8 + 0.4 * c.g * near);
  albedo = mix(albedo, albedo * vec3(0.45, 0.52, 0.52), film);
  // A riser is broken rock, dry and rough: it does not flash.
  float rough = mix(mix(mix(0.7, 0.42, wet), 0.9, steep), 0.06, film);
  float occ = (1.0 - 0.45 * crack) * (1.0 - 0.25 * hollow) * vOcc;
  // The low sun throws the shadow of every step across the plate under it, and grazes the crest of every step that falls toward it. The plates'
  // own heights are read again a little way toward the sun, at both sizes: no edge is outlined, each is a shadow or a rim.
  float toward = texture2D(tRock, (p.xz + uSunDir.xz * 2.4) / 71.0).g;
  float towardSmall = texture2D(tRock, (p.xz + uSunDir.xz * 0.6) / 13.7 + 0.37).g;
  float rise = 0.75 * (toward - a.g) * dry;
  float riseSmall = 0.22 * (towardSmall - b.g) * dry;
  float shade = 1.0 - 0.92 * max(smoothstep(0.035, 0.11, rise), 0.85 * smoothstep(0.012, 0.045, riseSmall));
  float crestLit = max(smoothstep(0.035, 0.11, -rise), 0.7 * smoothstep(0.012, 0.045, -riseSmall));
  // Under a step the sky is half shut out too: the shade is cold and dark, not grey.
  occ *= mix(0.5, 1.0, shade);
  land.b = mix(p.y + 1.0, land.b, shade);
  vec3 colour = rigShadeOn(land, p, n, v, albedo, rough, occ);
  // The sun's glare path: every wet face throws a little of the low sun, and the grain of the rock, too fine to draw from here, spreads it wide.
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float glare = sunLobe(n, v, 0.4) * (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * max(dot(n, uSunDir), 0.0) * sunSeen(land, p.y);
  colour += uSunColour * (glare * wet * (0.35 + 0.65 * film) * (0.5 + 1.5 * c.a) * occ * 1.5);
  // Sparkle: in the glare path the wet grain throws the sun back in points.
  float tight = sunLobe(normalize(n + vec3(c.r - 0.5, 0.0, c.a - 0.5) * 0.25), v, 0.16) * (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * sunSeen(land, p.y);
  colour += uSunColour * (min(tight, 6.0) * wet * smoothstep(0.55, 0.8, c.b) * occ * 0.5);
  // The crest of a step that falls toward the sun stands full in it: a bright rim, brightest where the lens looks into the light.
  float facing = 0.35 + 0.65 * pow(max(dot(-v, uSunDir), 0.0), 2.0);
  colour += uSunColour * albedo * (0.55 * crestLit * facing * sunSeen(land, p.y) * (1.0 - film));
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

// The bone of the shaft: uBone 0 is the dark wet wall between the hoops, 1 the ivory cartilage of a hoop or a slab. Tea-brown stains run down it.
export const BONE_FRAGMENT = /* glsl */ `
${COMMON}
uniform float uBone;
uniform vec3 uPale;
uniform vec3 uDark;
void main() {
  vec3 p = vWorld;
  vec3 v = normalize(cameraPosition - p);
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec4 a = texture2D(tRock, vUv / 17.0);
  vec4 b = texture2D(tRock, vUv / 3.1 + 0.23);
  // Streaks that run down the face: the same tile, drawn out along the fall line.
  vec4 run = texture2D(tRock, vec2(vUv.x / 19.0, vUv.y / 150.0) + 0.5);
  float pit = smoothstep(0.55, 0.8, b.a) * 0.6;
  float joint = smoothstep(0.1, 0.0, a.b) * smoothstep(0.45, 0.6, a.r) * 0.6;
  float h = 0.22 * a.r + 0.03 * b.r - 0.03 * pit - 0.1 * joint;
  n = raised(p, n, h);
  float up = clamp(n.y, 0.0, 1.0);
  vec3 base = mix(uDark, uPale, clamp(0.5 + 1.5 * (a.r - 0.5) + 0.6 * (b.a - 0.5), 0.0, 1.0));
  // On the wall the stains run down in streaks; on a hoop or a slab they are patches, and the top is cleaner than the sides.
  float stain = mix(smoothstep(0.45, 0.75, run.r + 0.35 * (a.a - 0.5)), smoothstep(0.4, 0.7, a.a + 0.45 * (b.r - 0.5) + 0.12 * (run.r - 0.5)), smoothstep(0.3, 0.5, uBone)) * (1.0 - 0.6 * up);
  vec3 albedo = mix(base, base * vec3(0.5, 0.33, 0.19), 0.85 * stain * uBone + 0.3 * stain);
  // A hoop's top is washed pale; its face is wet, darker, and streaked ochre and black where the water runs off it.
  float face = smoothstep(0.75, 0.3, up) * smoothstep(0.4, 0.9, uBone);
  float streak = smoothstep(0.35, 0.7, run.r + 0.3 * (run.a - 0.5));
  albedo = mix(albedo, albedo * mix(vec3(0.62, 0.5, 0.36), vec3(0.2, 0.17, 0.14), streak), 0.85 * face);
  // Under water level in the rock, and wherever the vapour condenses, it is dark and wet.
  float wet = clamp(0.45 + 0.5 * smoothstep(-2.0, -14.0, p.y) + 0.3 * stain, 0.0, 1.0);
  // Down the shaft the sky is a disc overhead and everything is wet: it goes to the dark.
  float sunk = clamp(1.0 + min(p.y + 3.0, 0.0) / 40.0, 0.0, 1.0) * mix(1.0, 0.8, smoothstep(1.0, -2.5, p.y));
  albedo *= (1.0 - 0.5 * joint - 0.35 * pit) * mix(1.0, 0.62, wet);
  float rough = mix(0.85, 0.38, wet);
  // The wall under a hoop is in its shade: black recesses between the ribs. The hoops stand every seven metres.
  float under = mod(-(p.y + 3.6), 7.0);
  float recess = smoothstep(7.0, 2.2, under) * smoothstep(-1.0, -4.0, p.y) * (1.0 - smoothstep(0.3, 0.45, uBone));
  // The hoops stand out of the wall into what light comes down: they are the pale thing in the shaft.
  float occ = (1.0 - 0.5 * joint - 0.3 * pit) * vOcc * sunk * sunk * (1.0 - 0.96 * recess) * mix(1.0, 1.45, smoothstep(0.4, 0.9, uBone));
  // Nothing of the sun gets down there either: the shadow's top is lifted over whatever is deep.
  vec4 land = landAt(p.xz);
  land.b = mix(p.y + 1.0, land.b, sunk * sunk);
  gl_FragColor = vec4(rigOut(rigShadeOn(land, p, n, v, albedo, rough, occ)), 1.0);
}`;

// The far cliff: level strata of dark rock, pale ledges that hold scree, and the dark of the cave.
export const CLIFF_FRAGMENT = /* glsl */ `
${COMMON}
void main() {
  vec3 p = vWorld;
  vec3 v = normalize(cameraPosition - p);
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec4 a = texture2D(tRock, vec2(vUv.x / 2300.0, vUv.y / 520.0));
  vec4 b = texture2D(tRock, vec2(vUv.x / 410.0, vUv.y / 120.0) + 0.31);
  float strata = texture2D(tRock, vec2(vUv.x / 9000.0 + 0.1 * a.r, vUv.y / 260.0)).a;
  float h = 30.0 * a.r + 9.0 * b.r + 26.0 * strata;
  n = raised(p, n, h);
  float flat0 = normalize(vNormal).y * (gl_FrontFacing ? 1.0 : -1.0);
  float ledge = smoothstep(0.62, 0.86, flat0 + 0.12 * (b.a - 0.5));
  vec3 rock = mix(vec3(0.02, 0.022, 0.028), vec3(0.07, 0.068, 0.068), clamp(0.5 + 2.2 * (strata - 0.5) + 0.6 * (b.r - 0.5), 0.0, 1.0));
  // The top holds snow, and the scree a little in its hollows; the face is too steep for it.
  float high = smoothstep(0.6, 0.85, p.y / 700.0 + 0.2 * (a.a - 0.5));
  vec3 albedo = mix(rock, vec3(0.62, 0.64, 0.68), ledge * mix(0.3 * smoothstep(0.45, 0.6, b.a), 1.0, high));
  float occ = vOcc * (0.6 + 0.4 * b.r);
  gl_FragColor = vec4(rigOut(rigShade(p, n, v, albedo * vOcc, 0.85, occ)), 1.0);
}`;

export interface RockKit {
  shelf: THREE.ShaderMaterial;
  cliff: THREE.ShaderMaterial;
  bone(amount: number, pale: [number, number, number], dark: [number, number, number], side?: THREE.Side): THREE.ShaderMaterial;
  dispose(): void;
}

export function createRock(uniforms: Record<string, THREE.IUniform>, rng: Rng): RockKit {
  const tile = bakeRock(rng);
  const made: THREE.ShaderMaterial[] = [];
  const make = (fragmentShader: string, extra: Record<string, THREE.IUniform> = {}, side: THREE.Side = THREE.FrontSide): THREE.ShaderMaterial => {
    const m = new THREE.ShaderMaterial({ vertexShader: ROCK_VERTEX, fragmentShader, uniforms: { ...uniforms, tRock: { value: tile }, ...extra }, side, toneMapped: false });
    made.push(m);
    return m;
  };
  return {
    shelf: make(SHELF_FRAGMENT),
    cliff: make(CLIFF_FRAGMENT, {}, THREE.DoubleSide),
    bone: (amount, pale, dark, side) => make(BONE_FRAGMENT, { uBone: { value: amount }, uPale: { value: new THREE.Vector3(...pale) }, uDark: { value: new THREE.Vector3(...dark) } }, side),
    dispose: () => {
      for (const m of made) m.dispose();
      tile.dispose();
    },
  };
}
