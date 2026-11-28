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

/** A knob: where its middle stands in the frame of the axis, how far its middle lies over the ground there, its turn, its size and which crag of the map it is. */
export interface Knob {
  along: number;
  across: number;
  lift: number;
  turn: number;
  size: number;
  kind: number;
}

export const KNOBS: Knob[] = [{ along: 82, across: -39, lift: 2.4, turn: -1.6, size: 2.0, kind: 0 }];

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
  vec3 tone = mix(vec3(0.5, 0.47, 0.43), vec3(0.74, 0.69, 0.61), form.b);
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
  const ball = mergeVertices(new THREE.IcosahedronGeometry(1, 110).deleteAttribute('uv').deleteAttribute('normal'), 1e-5);
  const materials: THREE.ShaderMaterial[] = [];
  const meshes = KNOBS.map((k, i) => {
    const [x, z] = onAxis(k.along, k.across);
    const ground = landHeight(x, z);
    const e = 3;
    const gx = (landHeight(x + e, z) - landHeight(x - e, z)) / (2 * e);
    const gz = (landHeight(x, z + e) - landHeight(x, z - e)) / (2 * e);
    const size = SIZES[k.kind] as [number, number, number];
    const mesh = new THREE.Mesh(ball);
    mesh.position.set(x, ground + k.lift, z);
    mesh.rotation.set(0.1, k.turn, -0.22);
    mesh.updateMatrixWorld();
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...ctx.rig.uniforms,
        ...maps,
        tFace: sheets.tFace as THREE.IUniform,
        tFaceNh: sheets.tFaceNh as THREE.IUniform,
        tGrit: sheets.tGrit as THREE.IUniform,
        uKnob: { value: new THREE.Vector4(k.kind, 0.31 + 0.17 * i, 0.77 - 0.21 * i, 0.13 + 0.4 * i) },
        uKnobSize: { value: new THREE.Vector3(size[0] * k.size, size[1] * k.size, size[2] * k.size) },
        uKnobSeat: { value: new THREE.Vector4(ground, 0, gx, gz) },
        uKnobAt: { value: new THREE.Vector3(x, ground, z) },
        uKnobTurn: { value: new THREE.Matrix3().setFromMatrix4(mesh.matrixWorld) },
      },
      vertexShader: KNOB_VERTEX,
      fragmentShader: KNOB_FRAGMENT,
    });
    material.userData.depthFragment = depthFragment;
    mesh.material = material;
    materials.push(material);
    mesh.frustumCulled = false;
    return mesh;
  });
  return {
    meshes,
    dispose: () => {
      ball.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
