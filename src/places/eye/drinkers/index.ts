// The drinkers: tall lean grazers at the water. Each is a body of its own build (body.data.ts: one computed surface, skinned to 26 bones),
// posed from its hooves up in herd.ts and skeleton.ts and drawn with the place's light. The near ones are the full body, the far herd a thinned one.
import * as THREE from 'three';
import { shoreOf } from '../layout';
import { landHeight } from '../land/height';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { during } from '../shared/anchors';
import { LEVELS, MID_DATA, NEAR_DATA } from './body.data';
import { createCards } from './cards';
import { WADE, herd, standPose, type Drinker } from './herd';
import { BONES, solve, type Solved } from './skeleton';

export const PARTS: readonly string[] = ['drinkers'];

const VERTEX = /* glsl */ `
attribute vec4 aBones;
attribute vec4 aWeights;
attribute vec2 aShade;
uniform vec4 uBones[${BONES * 3}];
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vRest;
varying vec3 vRestNormal;
varying vec2 vShade;
void main() {
  vec4 p = vec4(position, 1.0);
  vec3 world = vec3(0.0);
  vec3 n = vec3(0.0);
  for (int k = 0; k < 4; k++) {
    float w = aWeights[k];
    int b = int(aBones[k] + 0.5) * 3;
    world += w * vec3(dot(uBones[b], p), dot(uBones[b + 1], p), dot(uBones[b + 2], p));
    n += w * vec3(dot(uBones[b].xyz, normal), dot(uBones[b + 1].xyz, normal), dot(uBones[b + 2].xyz, normal));
  }
  vWorld = world;
  vNormal = normalize(n);
  vRest = position;
  vRestNormal = normal;
  vShade = aShade;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const FRAGMENT = /* glsl */ `
// x its own number, y its size, z the level of its feet.
uniform vec4 uOwn;
// The hide sheet: rgb its colour, a its relief.
uniform sampler2D tHide;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vRest;
varying vec3 vRestNormal;
varying vec2 vShade;
${NOISE_GLSL}
${RIG_GLSL}
// The sheet laid on the body as it was made, from the two sides that face a point best, so it neither swims nor stretches as the animal moves.
vec4 hideAt(vec3 p, vec3 dx, vec3 dy, ivec3 ma, ivec3 me, vec2 w) {
  vec4 a = textureGrad(tHide, vec2(p[ma.y], p[ma.z]), vec2(dx[ma.y], dx[ma.z]), vec2(dy[ma.y], dy[ma.z]));
  vec4 b = textureGrad(tHide, vec2(p[me.y], p[me.z]), vec2(dx[me.y], dx[me.z]), vec2(dy[me.y], dy[me.z]));
  return a * w.x + b * w.y;
}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float own = uOwn.x;
  vec3 rn = abs(normalize(vRestNormal));
  ivec3 ma = (rn.x > rn.y && rn.x > rn.z) ? ivec3(0, 1, 2) : (rn.y > rn.z) ? ivec3(1, 2, 0) : ivec3(2, 0, 1);
  ivec3 mi = (rn.x < rn.y && rn.x < rn.z) ? ivec3(0, 1, 2) : (rn.y < rn.z) ? ivec3(1, 2, 0) : ivec3(2, 0, 1);
  ivec3 me = ivec3(3) - mi - ma;
  vec2 w = clamp((vec2(rn[ma.x], rn[me.x]) - 0.5773) / 0.4227, 0.0, 1.0);
  w = (w + 1e-4) / (w.x + w.y + 2e-4);
  // Twice: the creases, and the skin itself.
  vec3 at = vRest + own * vec3(3.7, 9.1, 5.3);
  vec3 dx = dFdx(vRest) * 0.6;
  vec3 dy = dFdy(vRest) * 0.6;
  vec4 broad = hideAt(at * 1.5, dx * 1.5, dy * 1.5, ma, me, w);
  vec4 fine = hideAt(at.yzx * 4.7, dx.yzx * 4.7, dy.yzx * 4.7, ma.yzx, me.yzx, w);
  // The wrinkles turn the light: the relief's slope across the screen leans the normal.
  vec3 dpx = dFdx(vWorld);
  vec3 dpy = dFdy(vWorld);
  float px = length(dpx) + length(dpy);
  vec3 r1 = cross(dpy, n);
  vec3 r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  float relief = 0.002 * broad.a + 0.0005 * fine.a;
  vec3 lean = sign(det) * (dFdx(relief) * r1 + dFdy(relief) * r2) * (1.0 - smoothstep(0.004, 0.02, px));
  n = normalize(abs(det) * n - lean / max(1.0, length(lean) / (0.4 * abs(det) + 1e-12)));
  // A pale naked hide: each animal a tone of its own and marks of its own, dustier and darker along the back, paler under the belly.
  vec2 side = vRest.zy * vec2(1.0, 1.4) + own * 37.0;
  float blotch = 0.6 * vnoise(side * 1.7) + 0.4 * vnoise(side * 5.0 + 5.0);
  float mark = smoothstep(0.56, 0.7, 0.65 * vnoise(side * 1.1 + 11.0) + 0.35 * vnoise(side * 6.0 + vRest.x * 3.0));
  vec3 skin = mix(vec3(0.46, 0.38, 0.33), vec3(0.7, 0.6, 0.53), blotch);
  skin *= mix(vec3(0.86, 0.85, 0.84), vec3(1.08, 1.04, 1.0), fract(own * 7.3));
  skin = mix(skin, skin * vec3(0.62, 0.58, 0.57), mark * (0.3 + 0.5 * fract(own * 13.7)));
  skin *= mix(vec3(1.0), sqrt(broad.rgb * fine.rgb) / vec3(0.69, 0.41, 0.32), 0.7);
  // Creases hold the dirt.
  skin *= mix(0.8, 1.0, smoothstep(0.22, 0.52, broad.a)) * (0.9 + 0.2 * fine.a);
  // In the shade of the evening the hide is tan going to brown, as the herd beside it is.
  if (uShade.w > 0.1) skin = mix(skin, vec3(0.335, 0.222, 0.152) * (0.45 + 1.0 * dot(skin, vec3(0.3, 0.5, 0.2))), 0.9);
  skin *= mix(vec3(0.8, 0.75, 0.71), vec3(1.0), vShade.y);
  // The sky lights its back and leaves its belly and the inside of its legs in its own shade.
  skin *= mix(0.62, 1.06, smoothstep(-0.55, 0.75, n.y + 0.25 * (blotch - 0.5)));
  float above = (vWorld.y - max(uOwn.z, 0.0)) / uOwn.y;
  float ragged = vnoise(vRest.xy * 9.0 + vRest.z * 5.0);
  // Wet and dark below, where it has stood in the lake, and flecked with the mud it kicked up; dry above. The horn of the hoof is dark.
  skin *= mix(0.5, 1.08, smoothstep(1.15, 2.2, above + 0.3 * (blotch - 0.5)));
  float wet = 1.0 - smoothstep(0.3, 0.8, above + 0.3 * ragged);
  // Its legs are dark with the mud and the water of the shore, to above the knee.
  skin *= mix(0.45, 1.0, smoothstep(0.5, 1.0, above + 0.3 * ragged));
  float fleck = smoothstep(0.6, 0.68, vnoise(vRest.zy * 46.0 + vRest.x * 31.0)) * (1.0 - smoothstep(0.5, 1.5, above + 0.5 * ragged)) * (1.0 - smoothstep(1.2, 1.6, vRest.y));
  float horn = 1.0 - smoothstep(0.075, 0.1, vRest.y + 0.02 * ragged);
  vec3 albedo = mix(skin * mix(1.0, 0.45, wet), vec3(0.11, 0.085, 0.065), 0.8 * fleck);
  albedo = mix(albedo, vec3(0.05, 0.045, 0.04), horn);
  float occ = mix(0.45, 1.0, vShade.x);
  vec3 p = vec3(vWorld.x, vWorld.y + 3.2, vWorld.z);
  vec3 c = rigShade(p, n, v, albedo, mix(0.82, 0.5, wet), occ);
  // The pale gravel and the water under it throw the sky back up at it.
  c += albedo * skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.13 / 3.14159) * (0.5 - 0.5 * n.y);
  // The wet of the leg takes the sun as a film of water does.
  if (wet > 0.01) c += wet * rigGlint(p, n, v, 0.16);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

function decode(text: string): Uint8Array {
  const raw = atob(text);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function bodyGeometry(text: string, level: { vertices: number; triangles: number; lo: number[]; hi: number[] }): THREE.BufferGeometry {
  const bytes = decode(text);
  const n = level.vertices;
  const view = new DataView(bytes.buffer);
  const position = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) {
    const lo = level.lo[i % 3] as number;
    const hi = level.hi[i % 3] as number;
    position[i] = lo + (view.getUint16(i * 2, true) / 65535) * (hi - lo);
  }
  let o = n * 6;
  const normal = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) normal[i] = view.getInt8(o + i) / 127;
  o += n * 3;
  const bones = new Float32Array(n * 4);
  for (let i = 0; i < n * 4; i++) bones[i] = bytes[o + i] as number;
  o += n * 4;
  const weights = new Float32Array(n * 4);
  for (let i = 0; i < n * 4; i++) weights[i] = (bytes[o + i] as number) / 255;
  o += n * 4;
  const shade = new Float32Array(n * 2);
  for (let i = 0; i < n * 2; i++) shade[i] = (bytes[o + i] as number) / 255;
  o += n * 2;
  const index = new Uint16Array(level.triangles * 3);
  for (let i = 0; i < index.length; i++) index[i] = view.getUint16(o + i * 2, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  g.setAttribute('aBones', new THREE.BufferAttribute(bones, 4));
  g.setAttribute('aWeights', new THREE.BufferAttribute(weights, 4));
  g.setAttribute('aShade', new THREE.BufferAttribute(shade, 2));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return g;
}

interface Drawn {
  animal: Drinker;
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  bones: Float32Array;
  own: THREE.Vector4;
}

export function create(ctx: Context): Piece {
  // The four of the shore shot are bodies while that shot runs; every other animal, and these four in every other shot, is still a card.
  const animals = herd(ctx.rng('drinkers-bodies'), ctx.events.rise - 1.7).slice(0, 4);
  const cards = createCards(ctx);
  const near = bodyGeometry(NEAR_DATA, LEVELS.near);
  const mid = bodyGeometry(MID_DATA, LEVELS.mid);
  const tHide = { value: ctx.assets.texture('drinker/hide.png', { repeat: true, anisotropy: 4 }) };
  const drawn: Drawn[] = animals.map((animal, i) => {
    const bones = new Float32Array(BONES * 12);
    const own = new THREE.Vector4(animal.own, animal.build.size, 0, 0);
    const material = new THREE.ShaderMaterial({
      uniforms: { ...ctx.rig.uniforms, uBones: { value: bones }, uOwn: { value: own }, tHide },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: THREE.DoubleSide,
    });
    // The whole surface for the one the lens comes closest to, a lighter one for the three behind it.
    const mesh = new THREE.Mesh(i === 3 ? near : mid, material);
    mesh.frustumCulled = false;
    mesh.visible = false;
    ctx.scene.add(mesh);
    ctx.reflected.push(mesh);
    return { animal, mesh, material, bones, own };
  });
  ctx.parts.built('drinkers', (cards.meshes[0] as THREE.Mesh), ...cards.meshes.slice(1), ...drawn.map((d) => d.mesh));
  for (let i = 0; i < 22; i++) ctx.laps.push({ x: 0, z: 0, strength: 0, offset: i * 0.37 });
  const scratch = new Float32Array(BONES * 12);
  const ground = (x: number, z: number): number => landHeight(x, z);
  const wetAt = (x: number, z: number): boolean => Math.hypot(x, z) < shoreOf(x, z) - 0.2;

  // The pose at t: one that drinks has its neck let down just as far as brings its mouth to the water where it stands.
  const poseAt = (d: Drinker, t: number, into: Float32Array): Solved => {
    if (d.down(t) < 0.5 || d.level !== undefined) return solve(d.build, standPose(d, t, ground, 1), into);
    let lo = 0.6;
    let hi = 1.3;
    for (let i = 0; i < 12; i++) {
      const mid = 0.5 * (lo + hi);
      const muzzle = solve(d.build, { ...standPose(d, t, ground, mid), neck: [mid, mid, mid, mid, mid] }, into).muzzle;
      if (muzzle[1] > Math.max(0, ground(muzzle[0], muzzle[2])) - 0.04 * d.build.size) lo = mid;
      else hi = mid;
    }
    return solve(d.build, standPose(d, t, ground, 0.5 * (lo + hi)), into);
  };

  return {
    setTime: (t) => {
      const bodies = during('eye-04');
      let lap = cards.setTime(t, bodies);
      const ring = (x: number, z: number, strength: number): void => {
        const slot = ctx.laps[lap];
        if (!slot || strength <= 0) return;
        slot.x = x;
        slot.z = z;
        slot.strength = strength;
        lap++;
      };
      for (const g of drawn) {
        const d = g.animal;
        g.mesh.visible = bodies;
        if (!bodies) continue;
        const solved = poseAt(d, t, g.bones);
        g.own.z = Math.max(WADE, ground(d.x, d.z));
        // Rings where its mouth is in the water, and round a hoof that has just come down or is about to leave.
        const low = d.down(t);
        if (wetAt(solved.muzzle[0], solved.muzzle[2])) ring(solved.muzzle[0], solved.muzzle[2], 1.3 * Math.min(1, Math.max(0, (low - 0.86) / 0.1)));
        const was = poseAt(d, t - 0.45, scratch).hooves.map((h) => h[1]);
        for (let pair = 0; pair < 2; pair++) {
          const a = solved.hooves[pair * 2] as [number, number, number];
          const b = solved.hooves[pair * 2 + 1] as [number, number, number];
          const stir = Math.max(a[1], b[1]) - g.own.z;
          const at = a[1] > b[1] ? a : b;
          // A hoof that stands still leaves the water still: the ring is there while it lifts and for a moment after it is set down.
          const before = Math.max(was[pair * 2] as number, was[pair * 2 + 1] as number) - g.own.z;
          if (wetAt(at[0], at[2]) && g.own.z < -0.02) ring(at[0], at[2], Math.min(1.2, 9 * Math.max(stir, 0.7 * before)));
        }
      }
      for (; lap < ctx.laps.length; lap++) {
        const slot = ctx.laps[lap];
        if (slot) slot.strength = 0;
      }
    },
    dispose: () => {
      cards.dispose();
      near.dispose();
      mid.dispose();
      for (const g of drawn) g.material.dispose();
    },
  };
}
