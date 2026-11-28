// The knobs of the Eye: crags of bedded limestone that stand out of the spur at the lower corners of the wide picture. Each is a ball
// raised into a sculpted crag by the radius its map holds for every direction from its middle (assets-src/eye/land/make_knobs.py): the
// map is cut from a solid, so its faces stand upright and its joints are open, which the height field of the outcrop cannot hold.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { landHeight, onAxis } from './height';
import { LOD_GLSL, WARM_GLSL } from './lod';

/** Half the length, height and depth of each crag of the map, metres: as in make_knobs.py. */
const SIZES: [number, number, number][] = [
  [5.2, 3.4, 3.6],
  [4.6, 3.0, 4.0],
];

/** A knob: where its middle stands in the frame of the axis, how far its middle lies over the ground there, its turn and lean, its size, which crag of the map it is, and how finely its ball is cut. */
export interface Knob {
  along: number;
  across: number;
  lift: number;
  turn: number;
  lean: [number, number];
  size: [number, number, number];
  kind: number;
  cut: number;
}

const frac = (v: number): number => v - Math.floor(v);
const rnd = (i: number, s: number): number => frac(Math.sin(i * 127.1 + s * 311.7) * 43758.5453);

/** The talus: pieces of the same crags, small, lying where they fell at the foot of a knob and down the slope from it. */
function talus(at: [number, number], to: [number, number], wide: number, count: number, seed: number, large: number): Knob[] {
  const out: Knob[] = [];
  for (let i = 0; i < count; i++) {
    const t = Math.pow(rnd(i, seed), 1.4);
    const side = (rnd(i, seed + 1) - 0.5) * 2 * wide * (0.35 + 0.65 * t);
    const dx = to[0] - at[0];
    const dz = to[1] - at[1];
    const l = Math.hypot(dx, dz);
    // The largest lie nearest the crag, and the small ones have run furthest.
    const s = large * (0.3 + 0.7 * Math.pow(rnd(i, seed + 2), 2.2)) * (1 - 0.45 * t);
    const kind = rnd(i, seed + 3) < 0.5 ? 0 : 1;
    const base = SIZES[kind] as [number, number, number];
    const sy = s * (0.75 + 0.7 * rnd(i, seed + 5));
    out.push({
      along: at[0] + dx * t - (dz / l) * side,
      across: at[1] + dz * t + (dx / l) * side,
      lift: 0.12 * base[1] * sy,
      turn: rnd(i, seed + 4) * 6.283,
      lean: [(rnd(i, seed + 6) - 0.5) * 0.9, (rnd(i, seed + 7) - 0.5) * 0.9],
      size: [s * (0.8 + 0.5 * rnd(i, seed + 8)), sy, s * (0.8 + 0.5 * rnd(i, seed + 9))],
      kind,
      cut: s > 0.2 ? 14 : 8,
    });
  }
  return out;
}

export const KNOBS: Knob[] = [
  { along: 82, across: -39, lift: 2.4, turn: -1.6, lean: [0.1, -0.22], size: [2.0, 2.0, 2.0], kind: 0, cut: 72 },
  { along: 113, across: 29, lift: 3.4, turn: 4.5, lean: [-0.06, 0.1], size: [2.4, 2.3, 2.4], kind: 1, cut: 56 },
  ...talus([88, -27], [76, -24], 9, 14, 3, 0.34),
  ...talus([110, 17], [70, 44], 12, 34, 11, 0.4),
];

const ATLAS_GLSL = /* glsl */ `
// Where a direction lies in the map: two crags side by side, each on an octahedral map.
vec2 knobUv(vec3 d, float kind, float margin) {
  d /= abs(d.x) + abs(d.y) + abs(d.z);
  vec2 o = d.xz;
  if (d.y < 0.0) o = (1.0 - abs(o.yx)) * vec2(o.x >= 0.0 ? 1.0 : -1.0, o.y >= 0.0 ? 1.0 : -1.0);
  o = clamp(o * 0.5 + 0.5, margin, 1.0 - margin);
  return vec2((kind + o.x) / 2.0, 1.0 - o.y);
}`;

const KNOB_VERTEX = /* glsl */ `
uniform sampler2D tKnobR;
uniform vec4 uKnob;
uniform vec3 uKnobSize;
varying vec3 vWorld;
varying vec3 vDir;
varying vec3 vLocal;
${ATLAS_GLSL}
void main() {
  vec3 d = normalize(position);
  vec2 rg = textureLod(tKnobR, knobUv(d, uKnob.x, 0.002), 0.0).rg;
  float r = (rg.r * 65280.0 + rg.g * 255.0) / 65535.0 * 2.0;
  vec3 local = d * r * uKnobSize;
  vec4 w = modelMatrix * vec4(local, 1.0);
  vWorld = w.xyz;
  vDir = d;
  vLocal = local;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const KNOB_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vDir;
varying vec3 vLocal;
uniform sampler2D tKnobN;
uniform sampler2D tKnobM;
uniform sampler2D tFace;
uniform sampler2D tFaceNh;
uniform sampler2D tGrit;
uniform vec4 uKnob;
// The level of the ground at its middle and the fall of that ground along x and z, and where its middle is.
uniform vec4 uKnobSeat;
uniform vec3 uKnobAt;
uniform mat3 uKnobTurn;
${NOISE_GLSL}
${RIG_GLSL}
${LOD_GLSL}
${WARM_GLSL}
${ATLAS_GLSL}
void main() {
  // The lie of the crag across the screen is taken before any branch, and every sheet is read at the level it gives: see lod.ts.
  vec3 d = normalize(vDir);
  float spread = length(fwidth(d));
  takeLod(dFdx(vWorld), dFdy(vWorld));
  if (beyondNear(vWorld)) discard;
  float lod = clamp(log2(max(spread * 0.41 * float(textureSize(tKnobN, 0).y), 1.0)), 0.0, 5.0);
  vec2 uv = knobUv(d, uKnob.x, 0.002 * exp2(lod));
  vec3 no = normalize(textureLod(tKnobN, uv, lod).rgb * 2.0 - 1.0);
  vec3 form = textureLod(tKnobM, uv, lod).rgb;
  float ao = form.r;
  float edge = form.g * 2.0 - 1.0;

  // The skin: the rock sheet at a metre and a half a repeat on the faces of the crag's own frame that the point looks out of most,
  // and again at five metres, so that a face is broken at two sizes.
  vec3 q = vLocal + uKnob.yzw * 37.0;
  vec3 w = pow(abs(no), vec3(8.0));
  w /= w.x + w.y + w.z;
  w = max(w - 0.25, 0.0);
  w /= w.x + w.y + w.z;
  vec3 skin = vec3(0.0);
  vec3 lean = vec3(0.0);
  float high = 0.0;
  float broad = 0.0;
  if (w.x > 0.0) {
    vec2 u = q.zy / 1.5;
    vec3 h = textureLod(tFaceNh, u, AT(1024.0, 1.5)).rgb;
    vec3 g = textureLod(tFaceNh, q.zy / 5.3 + 0.19, AT(1024.0, 5.3)).rgb;
    skin += textureLod(tFace, u, AT(1024.0, 1.5)).rgb * w.x;
    lean += vec3(0.0, h.g - 0.5 + 1.2 * (g.g - 0.5), h.r - 0.5 + 1.2 * (g.r - 0.5)) * w.x;
    high += h.b * w.x;
    broad += g.b * w.x;
  }
  if (w.y > 0.0) {
    vec2 u = q.xz / 1.5 + 0.37;
    vec3 h = textureLod(tFaceNh, u, AT(1024.0, 1.5)).rgb;
    vec3 g = textureLod(tFaceNh, q.xz / 5.3 + 0.53, AT(1024.0, 5.3)).rgb;
    skin += textureLod(tFace, u, AT(1024.0, 1.5)).rgb * w.y;
    lean += vec3(h.r - 0.5 + 1.2 * (g.r - 0.5), 0.0, h.g - 0.5 + 1.2 * (g.g - 0.5)) * w.y;
    high += h.b * w.y;
    broad += g.b * w.y;
  }
  if (w.z > 0.0) {
    vec2 u = q.xy / 1.5 + 0.71;
    vec3 h = textureLod(tFaceNh, u, AT(1024.0, 1.5)).rgb;
    vec3 g = textureLod(tFaceNh, q.xy / 5.3 + 0.83, AT(1024.0, 5.3)).rgb;
    skin += textureLod(tFace, u, AT(1024.0, 1.5)).rgb * w.z;
    lean += vec3(h.r - 0.5 + 1.2 * (g.r - 0.5), h.g - 0.5 + 1.2 * (g.g - 0.5), 0.0) * w.z;
    high += h.b * w.z;
    broad += g.b * w.z;
  }
  no = normalize(no + lean * 0.9);
  vec3 n = normalize(uKnobTurn * no);
  vec3 v = normalize(cameraPosition - vWorld);

  // Pale limestone, bed by bed of its own tone, the sheet giving it its mottle about its own mean.
  vec3 tone = mix(vec3(0.6, 0.48, 0.36), vec3(0.86, 0.7, 0.52), form.b);
  vec3 albedo = tone * mix(vec3(1.0), skin / vec3(0.34, 0.33, 0.31), 0.75) * (0.72 + 0.56 * broad);
  // Broad stains in the crag's own frame, so that a large face is not one tone, and the dark that rain leaves down a standing face.
  float stain = vnoise(q.xy * 0.5 + q.z * 0.4) * 0.6 + vnoise(q.zy * 1.7 + 5.0) * 0.4;
  float lichen = vnoise(q.xz * 2.1 + q.y * 1.3 + 3.0);
  albedo *= 0.76 + 0.48 * stain;
  float upright = smoothstep(0.75, 0.2, abs(no.y));
  float run = vnoise(vec2(q.x * 2.3 + q.z * 1.9, q.y * 0.22));
  albedo *= 1.0 - 0.38 * upright * smoothstep(0.5, 0.78, run);
  // Fresh breaks along the edges are paler; dirt lies in the creases and the joints.
  albedo *= 1.0 + 0.45 * clamp(edge, -0.7, 1.0);
  albedo *= mix(0.36, 1.0, smoothstep(0.1, 0.8, ao));
  // What grows on old stone: a dark crust in the creases that look up, and pale and rusty lichen in patches on the tops.
  float up = n.y;
  float crust = smoothstep(0.75, 0.35, ao) * smoothstep(-0.1, 0.5, up) * smoothstep(0.35, 0.6, 1.0 - lichen);
  albedo = mix(albedo, vec3(0.06, 0.07, 0.04), 0.7 * crust);
  float patches = smoothstep(0.6, 0.74, lichen) * smoothstep(0.2, 0.7, up) * smoothstep(0.45, 0.75, high);
  albedo = mix(albedo, mix(vec3(0.6, 0.58, 0.5), vec3(0.5, 0.3, 0.12), step(0.6, fract(floor(stain * 5.0) * 0.37))), 0.5 * patches);

  // Where it stands in the ground: grit and dust lie against its foot and on its ledges, and under its overhang it is dark.
  float above = vWorld.y - (uKnobSeat.x + dot(vWorld.xz - uKnobAt.xz, uKnobSeat.zw));
  float grit = smoothstep(0.5, 0.0, above - 0.5 * vnoise(vWorld.xz * 0.9) - 0.15 * high);
  grit = max(grit, 0.6 * smoothstep(0.86, 0.97, up) * smoothstep(0.55, 0.3, ao + 0.3 * high));
  vec3 dust = textureLod(tGrit, vWorld.xz / 3.1 + vWorld.y * 0.31, AT(1024.0, 3.1)).rgb * vec3(1.5, 1.42, 1.3);
  albedo = mix(albedo, dust, 0.8 * grit * smoothstep(-0.3, 0.3, up));
  float foot = smoothstep(-0.1, 0.9, above);
  float occ = ao * (0.55 + 0.45 * smoothstep(0.2, 0.7, high)) * mix(0.4, 1.0, foot) * mix(0.5, 1.0, smoothstep(-0.3, 0.8, up));
  vec3 c = rigShade(vWorld, n, v, clamp(albedo * warmSide(n), 0.0, 0.9), 0.92, occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export function createKnobs(ctx: Context, depthFragment: string, sheets: Record<string, THREE.IUniform>): { meshes: THREE.Mesh[]; dispose: () => void } {
  const data = (file: string): THREE.Texture => ctx.assets.texture(file, { kind: 'data', repeat: false });
  const maps = { tKnobR: { value: data('land/knob-r.png') }, tKnobN: { value: data('land/knob-n.jpg') }, tKnobM: { value: data('land/knob-m.jpg') } };
  const balls = new Map<number, THREE.BufferGeometry>();
  const ballOf = (cut: number): THREE.BufferGeometry => {
    let ball = balls.get(cut);
    if (!ball) {
      ball = mergeVertices(new THREE.IcosahedronGeometry(1, cut).deleteAttribute('uv').deleteAttribute('normal'), 1e-5);
      balls.set(cut, ball);
    }
    return ball;
  };
  const materials: THREE.ShaderMaterial[] = [];
  const owned: THREE.BufferGeometry[] = [];
  const meshes = KNOBS.map((k, i) => {
    const [x, z] = onAxis(k.along, k.across);
    const ground = landHeight(x, z);
    const e = Math.max(0.6, 1.5 * k.size[0]);
    const gx = (landHeight(x + e, z) - landHeight(x - e, z)) / (2 * e);
    const gz = (landHeight(x, z + e) - landHeight(x, z - e)) / (2 * e);
    const base = SIZES[k.kind] as [number, number, number];
    const size = new THREE.Vector3(base[0] * k.size[0], base[1] * k.size[1], base[2] * k.size[2]);
    // The ball is shared, and what it is raised to is not: each knob has the bounds of its own crag, so that a camera that looks
    // away from it does not pay for raising it.
    const ball = ballOf(k.cut);
    const own = new THREE.BufferGeometry();
    own.setAttribute('position', ball.getAttribute('position'));
    own.setIndex(ball.getIndex());
    own.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2.2 * Math.max(size.x, size.y, size.z));
    owned.push(own);
    const mesh = new THREE.Mesh(own);
    mesh.position.set(x, ground + k.lift, z);
    mesh.rotation.set(k.lean[0], k.turn, k.lean[1]);
    mesh.updateMatrixWorld();
    // The map's normals are those of the crag at its own shape: a piece pressed flatter or drawn longer turns them by the inverse.
    const m = k.size[1] / k.size[0];
    const n = k.size[1] / k.size[2];
    const turn = new THREE.Matrix3().setFromMatrix4(mesh.matrixWorld).multiply(new THREE.Matrix3().set(m, 0, 0, 0, 1, 0, 0, 0, n));
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...ctx.rig.uniforms,
        ...maps,
        tFace: sheets.tFace as THREE.IUniform,
        tFaceNh: sheets.tFaceNh as THREE.IUniform,
        tGrit: sheets.tGrit as THREE.IUniform,
        uKnob: { value: new THREE.Vector4(k.kind, rnd(i, 21), rnd(i, 22), rnd(i, 23)) },
        uKnobSize: { value: size },
        uKnobSeat: { value: new THREE.Vector4(ground, 0, gx, gz) },
        uKnobAt: { value: new THREE.Vector3(x, ground, z) },
        uKnobTurn: { value: turn },
      },
      vertexShader: KNOB_VERTEX,
      fragmentShader: KNOB_FRAGMENT,
    });
    material.userData.depthFragment = depthFragment;
    mesh.material = material;
    materials.push(material);
    return mesh;
  });
  return {
    meshes,
    dispose: () => {
      for (const g of owned) g.dispose();
      for (const b of balls.values()) b.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
