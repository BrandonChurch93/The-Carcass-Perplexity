// The grey mud the stuck one has churned up through the broken crust: wet, slow, and moved by every heave.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

/** Where the stuck one is in its heave, 0 to 1: it gathers, strains up, holds and sinks back, once in 5.2 seconds. */
export function heavePhase(seconds: number): number {
  const c = seconds / 5.2 + 0.3;
  return c - Math.floor(c);
}

// What the mud does with a heave. u is where the heave is (0 to 1, or less than 0 for mud nothing heaves in); r is the metres from the
// body. A swell goes out from it at half a metre a second and dies within three; a smaller one follows as the body sinks back. What comes
// back: x, the swell's height in metres; y, its slope outward; z, how wet the mud the swell has just crossed still is.
export const HEAVE_GLSL = /* glsl */ `
vec3 heaveSwell(float r, float u) {
  float far = exp(-max(r - 0.9, 0.0) * 0.45);
  float t = (u - 0.08) * 5.2;
  float at = 0.55 + 0.5 * t;
  float d = (r - at) / 0.22;
  float a = 0.065 * smoothstep(0.0, 0.5, t) * (1.0 - smoothstep(2.6, 4.7, t)) * far * exp(-d * d);
  float t2 = (u - 0.5) * 5.2;
  float at2 = 0.55 + 0.5 * t2;
  float d2 = (r - at2) / 0.2;
  float b = 0.03 * smoothstep(0.0, 0.4, t2) * (1.0 - smoothstep(1.4, 2.5, t2)) * far * exp(-d2 * d2);
  float wet = smoothstep(at + 0.15, at - 0.1, r) * smoothstep(at - 1.1, at - 0.3, r) * smoothstep(0.0, 0.6, t) * (1.0 - smoothstep(3.2, 4.75, t));
  return vec3(a + b, -2.0 * (a * d / 0.22 + b * d2 / 0.2), wet);
}`;

const VERTEX = /* glsl */ `
attribute float aEdge;
uniform sampler2D tMudNh;
uniform vec3 uHeave;
${HEAVE_GLSL}
varying vec3 vWorld;
varying float vEdge;
void main() {
  // Clods: the mud picture's own height lifts it, least at the edge where it runs out over the crust.
  float clod = 1.5 * textureLod(tMudNh, position.xz / 2.0, 2.0).b;
  vWorld = position + vec3(0.0, (clod - 0.6) * 0.06 * smoothstep(0.0, 0.35, aEdge), 0.0);
  // The heave: the mud at the body comes up with it, and the swell lifts every clod it passes under.
  float rr = (1.0 - aEdge) * 2.2;
  vWorld.y += heaveSwell(rr, uHeave.z).x + 0.03 * uHeave.x * exp(-rr * rr / 0.6) * step(0.0, uHeave.z);
  vEdge = aEdge;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying float vEdge;
uniform vec4 uAt;
uniform vec3 uHeave;
uniform vec3 uMud;
uniform float uWetness;
uniform sampler2D tMud;
uniform sampler2D tMudNh;
${NOISE_GLSL}
${RIG_GLSL}
${HEAVE_GLSL}
const vec3 MUD_MEAN = vec3(0.318, 0.179, 0.155);
// The sheet's level from the pixel's short side, the long side counted at most two and a half times it: a skimming lens keeps the clods.
float skim(vec2 gx, vec2 gy) {
  float a = dot(gx, gx);
  float b = dot(gy, gy);
  return 0.5 * log2(max(min(max(a, b), min(a, b) * 6.25), 1e-12) * 1048576.0);
}
void main() {
  vec2 p = vWorld.xz;
  vec2 gx = dFdx(p);
  vec2 gy = dFdy(p);
  vec2 q = p - uAt.xy;
  float r = length(q);
  // Mud a live one treads (wetness 1) is drawn clod by clod; mud round the dead keeps its slower look.
  float live = smoothstep(0.7, 1.0, uWetness);
  // Each heave sends a slow fold out through the mud, and it dies within two metres.
  float fold = cos(r * 5.5 - uHeave.y) * uHeave.x * exp(-r * 0.7);
  // (And a swell that goes out from the one that is stuck.)
  vec3 swell = heaveSwell((1.0 - vEdge) * 2.2, uHeave.z);
  float lW = skim(gx / 2.0, gy / 2.0);
  float lF = skim(gx / 1.37, gy / 1.37);
  vec2 uF = vec2(p.x * 0.8 - p.y * 0.6, p.x * 0.6 + p.y * 0.8) / 1.37 + 0.3;
  vec3 wide = textureLod(tMudNh, p / 2.0, lW).rgb;
  vec3 fine = textureLod(tMudNh, uF, lF).rgb;
  // Under a lens the sheet lies on it a third time at a hand's width, turned the other way: grit, crumbs and the lips of small pits.
  float near = live * smoothstep(0.004, 0.0015, min(length(gx), length(gy)));
  vec2 uG = vec2(p.x * 0.28 + p.y * 0.96, p.y * 0.28 - p.x * 0.96) / 0.43 + 0.61;
  float lG = skim(gx / 0.43, gy / 0.43);
  vec3 grit = mix(vec3(0.5), textureLod(tMudNh, uG, lG).rgb, near);
  vec3 tone = textureLod(tMud, p / 2.0, lW).rgb / MUD_MEAN;
  vec3 toneF = mix(vec3(1.0), textureLod(tMud, uF, lF).rgb / MUD_MEAN, live);
  tone = mix(vec3(1.0), mix(vec3(dot(tone, vec3(0.3, 0.5, 0.2))), tone, 0.5), mix(0.6, 1.0, live)) * (0.9 + 0.2 * fine.b);
  tone *= mix(vec3(1.0), sqrt(toneF) * (0.82 + 0.36 * grit.b), live);
  float h0 = 0.62 * wide.b + 0.38 * fine.b + (grit.b - 0.5) * 0.14;
  vec2 sF = fine.rg - 0.5;
  vec2 sG = grit.rg - 0.5;
  vec2 slope = (textureLod(tMudNh, p / 2.0, max(lW, 2.5)).rg - 0.5) * 0.9 + (wide.rg - 0.5) * mix(0.25, 1.1, live) + vec2(0.8 * sF.x + 0.6 * sF.y, 0.8 * sF.y - 0.6 * sF.x) * mix(0.5, 0.9, live) + vec2(0.28 * sG.x - 0.96 * sG.y, 0.96 * sG.x + 0.28 * sG.y) * 0.8 + (r > 0.001 ? q / r : vec2(0.0)) * fold * 0.9;
  float low = smoothstep(0.5, 0.34, h0);
  slope *= 1.0 - 0.85 * low * (1.0 - live);
  vec3 n = normalize(vec3(-slope.x, 1.0, slope.y));
  // (The swell leans every clod it is under, outward before its crest and back behind it.)
  vec2 outward = q / max(r, 0.05);
  n = normalize(n - vec3(outward.x, 0.0, outward.y) * swell.y * 2.0);
  vec3 v = normalize(cameraPosition - vWorld);
  // Brine stands in the hollows; the high places have begun to dry and pale.
  float dry = smoothstep(0.55, 0.75, h0) * smoothstep(0.3, 0.8, vEdge);
  vec3 albedo = uMud * tone * (1.0 - 0.35 * uWetness);
  // Red mud wells up where the animal works it.
  float well = 1.0 - smoothstep(0.25, 0.75, r / uAt.z);
  albedo = mix(albedo, vec3(0.07, 0.022, 0.016) * tone, 0.5 * well * smoothstep(0.35, 0.6, fbm(p * 2.3 + 7.0)));
  albedo = mix(albedo, uMud * 1.35 + 0.006, 0.6 * dry * (1.0 - uWetness));
  // Trodden by a live one it is wet through, and red brine stands level in every pit of it, with a hard edge against the clod.
  float brim = mix(0.52 + 0.12 * uWetness, 0.44, live);
  float foot = mix(0.42 + 0.1 * uWetness, 0.415, live);
  float pool = uWetness * smoothstep(brim, foot, h0) * smoothstep(0.1, 0.4, vEdge) * live;
  // Mud thrown up by one that is stuck lies in clods on the liquid of its wallow (the land's, which gives back the sky): pushed up
  // most in a ring round the body, in islands further out, and dark and wet where each clod goes under.
  float stand = 0.8 * textureLod(tMudNh, p / 2.0, max(lW, 3.5)).b + 0.2 * h0 + 0.2 * exp(-pow((vEdge - 0.62) / 0.2, 2.0)) - 0.14 * smoothstep(0.5, 0.1, vEdge);
  // (The crest takes the low clods under as it passes; what it has crossed is left wet and dark, and dries back slowly.)
  stand -= 1.4 * swell.x;
  float isle = mix(smoothstep(0.5, 0.52, stand), 1.0, live);
  albedo *= (1.0 - 0.6 * swell.z * (1.0 - live)) * (1.0 - min(abs(swell.y) * 1.1, 0.4));
  albedo *= mix(0.6 + 0.4 * smoothstep(0.51, 0.6, stand), 1.0, live);
  albedo = mix(albedo, mix(vec3(0.085, 0.012, 0.01), vec3(0.03, 0.007, 0.006), live), 0.9 * pool);
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), mix(0.9, 0.97, live) * pool));
  albedo = mix(albedo, albedo * vec3(0.55, 0.36, 0.32), low * (1.0 - 0.6 * live));
  // Salt trodden in: a few pale crumbs on the tops of the clods, dirty, never a drift.
  float crumb = live * smoothstep(0.6, 0.72, h0) * smoothstep(0.6, 0.74, grit.b) * (1.0 - pool);
  albedo = mix(albedo, vec3(0.2, 0.17, 0.155), 0.7 * crumb);
  // The sky's glint off a wet thing at a low angle is white, and whitens the whole patch: wet mud by a live one is dark, so it is kept dull.
  float rough = mix(mix(1.0, mix(0.86, 0.97, uWetness), low), mix(0.3, 0.96, uWetness), pool);
  rough = mix(rough, 0.97, live);
  float occ = 0.6 + 0.4 * smoothstep(0.3, 0.6, h0);
  // The wall of a pit is dark down to the brine in it.
  occ = mix(occ, mix(0.3 + 0.7 * smoothstep(0.42, 0.62, h0), 1.0, pool), live);
  // (Told the view is square on where a live one treads, as the land's trodden mud is: the wet is given below, clod by clod.)
  vec3 c = rigShade(vWorld, n, normalize(mix(v, n, mix(0.75, 0.9, live))), albedo, rough, occ);
  // (The stuck one's clods are wet too: a duller, broader glint.)
  c += skyRadiance(vec3(-0.6, 0.63, 0.35)) * vec3(1.0, 0.9, 0.85) * (1.0 - live) * occ * (0.22 + 0.5 * swell.z) * pow(max(dot(n, normalize(v + normalize(vec3(-0.86, 0.9, 0.5)))), 0.0), 40.0);
  if (live > 0.0) {
    // A pit's brine gives back a part of the sky, red through; a clod throws a small sharp glint from the face it turns to the light.
    vec3 rm = reflect(-v, n);
    rm.y = abs(rm.y);
    c += skyRadiance(rm) * vec3(1.0, 0.6, 0.54) * live * pool * (0.02 + 0.1 * pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 4.0));
    vec3 hc = normalize(v + normalize(vec3(-0.86, 0.9, 0.5)));
    c += skyRadiance(vec3(-0.6, 0.63, 0.35)) * vec3(1.0, 0.86, 0.8) * live * (1.0 - pool) * (1.0 - crumb) * occ * 0.6 * pow(max(dot(n, hc), 0.0), 70.0);
  }
  // Wet mud drinks the light: it does not hold the sky as the crust does.
  c *= 0.75;
  // Its edge is not a line: it thins out over the crust it has run onto, clod by clod.
  float a = smoothstep(0.04, 0.3, vEdge + 0.3 * (h0 - 0.5)) * smoothstep(0.0, 0.06, vEdge) * isle * (1.0 - uSolo);
  gl_FragColor = vec4(rigOut(c) * (1.0 - uSolo), a);
}`;

export function mudWallow(ctx: Context, x: number, z: number, dir: [number, number], size = 1, tone: [number, number, number] = [0.1, 0.072, 0.054], name = 'dead-mud', wetness = 0, hollow = 0, fine = true): { mesh: THREE.Mesh; set(heave: number, seconds: number, phase?: number): void; dispose(): void } {
  const rng = ctx.rng(name);
  // A stain round one of the dead is a low dark patch: it wants a tenth of the points the mud a live one treads does.
  const RINGS = fine ? 40 : 14;
  const SIDES = fine ? 120 : 40;
  const position: number[] = [];
  const edge: number[] = [];
  const index: number[] = [];
  const wobble = Array.from({ length: 9 }, () => [rng.range(0.03, 0.12), rng.range(0, Math.PI * 2)] as [number, number]);
  for (let i = 0; i <= RINGS; i++) {
    const u = i / RINGS;
    for (let j = 0; j <= SIDES; j++) {
      const a = (j / SIDES) * Math.PI * 2;
      let reach = 1;
      wobble.forEach((w, n) => {
        reach += w[0] * Math.sin(a * (n + 2) + w[1]);
      });
      // Longer along the animal than across it, and a little ahead of it, where it works to get out.
      const along = (Math.cos(a) * 3.3 * reach * u + 0.4) * size;
      const across = Math.sin(a) * 2.2 * reach * u * size;
      const px = x + dir[0] * along - dir[1] * across;
      const pz = z + dir[1] * along + dir[0] * across;
      // It stands a little proud of the trodden crust in the middle and goes under the plates at its edge.
      // Pushed up in a low rim round the body, and thinning to nothing over the crust.
      const lift = (1 - 0.6 * wetness) * 0.03 + 0.05 * (1 - u * u) + 0.05 * Math.exp(-(((u - 0.45) / 0.16) ** 2)) * (0.6 + 0.4 * Math.sin(a * 3 + wobble[0][1])) + 0.03 * (1 - u) * Math.sin(px * 3.1 + pz * 1.7) * Math.sin(pz * 2.3 - px * 0.9);
      // Where the crust has given way under it (the land's own hollow, which the rig's height does not know of) the mud lies in the hollow.
      const far = Math.min(1, Math.max(0, (2.25 - Math.hypot(px - x, pz - z)) / 1.15));
      const drop = hollow * far * far * (3 - 2 * far);
      position.push(px, ctx.rig.land.height(px, pz) - drop + lift * Math.min(1, size) * (1 - 0.5 * wetness), pz);
      edge.push(1 - u);
    }
  }
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < SIDES; j++) {
      const a = i * (SIDES + 1) + j;
      index.push(a, a + 1, a + SIDES + 1, a + 1, a + SIDES + 2, a + SIDES + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
  geometry.setIndex(index);
  const uHeave = { value: new THREE.Vector3(0, 0, -1) };
  const material = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, uAt: { value: new THREE.Vector4(x, z, 3.0 * size, 0) }, uHeave, uMud: { value: new THREE.Vector3(tone[0], tone[1], tone[2]) }, uWetness: { value: wetness }, tMud: { value: ctx.assets.texture('mat/mud.jpg', { kind: 'colour', anisotropy: 4 }) }, tMudNh: { value: ctx.assets.texture('mat/mud-nh.png', { kind: 'data', anisotropy: 4 }) } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  return {
    mesh,
    set: (heave, seconds, phase = -1) => {
      uHeave.value.set(heave, seconds * 1.6, phase);
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
