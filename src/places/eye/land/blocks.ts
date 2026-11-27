// The blocks of the Eye: fallen limestone, each a real broken stone. A ball is raised into one of eight stones by the radius the atlas
// holds for every direction from its middle (assets-src/eye/land/make_rocks.py), and the same atlas gives the lie of its faces, how much
// of the sky each crease sees and where its edges are. Its skin is the rock sheet at its true size, laid in the stone's own frame.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { LOD_GLSL } from './lod';

export function blockUniforms(ctx: Context): Record<string, THREE.IUniform> {
  const data = (file: string): THREE.Texture => {
    const t = ctx.assets.texture(file, { kind: 'data', repeat: false });
    return t;
  };
  return {
    tRockN: { value: data('land/rocks-n.jpg') },
    tRockR: { value: data('land/rocks-r.png') },
    tFace: { value: ctx.assets.texture('land/rockface.jpg', { anisotropy: 1 }) },
    tFaceNh: { value: ctx.assets.texture('land/rockface-nh.jpg', { kind: 'data' }) },
    tGrit: { value: ctx.assets.texture('land/gravel.jpg', { anisotropy: 1 }) },
  };
}

/** A ball of directions: the vertex shader raises it into a stone. `detail` is the count of cuts along each edge of the icosahedron. */
export function ballGeometry(detail: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  // Every corner once: the stone is raised in the vertex shader, and that is where its cost lies.
  return mergeVertices(g, 1e-4);
}

const ATLAS_GLSL = /* glsl */ `
// Where a direction lies in the atlas: four stones across, two down, each on an octahedral map of 512.
vec2 rockUv(vec3 d, float kind, float margin) {
  d /= abs(d.x) + abs(d.y) + abs(d.z);
  vec2 o = d.xz;
  if (d.y < 0.0) o = (1.0 - abs(o.yx)) * vec2(o.x >= 0.0 ? 1.0 : -1.0, o.y >= 0.0 ? 1.0 : -1.0);
  o = clamp(o * 0.5 + 0.5, margin, 1.0 - margin);
  // The stone's number comes through a varying and may be a hair under itself.
  kind = floor(kind + 0.5);
  float cy = floor((kind + 0.5) / 4.0);
  float cx = kind - 4.0 * cy;
  return vec2((cx + o.x) / 4.0, 1.0 - (cy + o.y) / 2.0);
}`;

export const BLOCK_VERTEX = /* glsl */ `
attribute vec3 aTint;
// The stone it is, the level of the ground at its middle and the fall of that ground along x and z.
attribute vec4 aSeat;
uniform sampler2D tRockR;
uniform float uSmooth;
varying vec3 vWorld;
varying vec3 vDir;
varying vec3 vLocal;
varying vec3 vTint;
varying vec4 vSeat;
varying vec3 vN0;
varying vec3 vN1;
varying vec3 vN2;
${ATLAS_GLSL}
void main() {
  vec3 d = normalize(position);
  float wet = step(7.5, aSeat.x);
  float kind = aSeat.x - 8.0 * wet;
  float r = textureLod(tRockR, rockUv(d, kind, 0.004), uSmooth).r * 1.6;
  vec3 local = d * r;
  vec3 s2 = vec3(dot(instanceMatrix[0].xyz, instanceMatrix[0].xyz), dot(instanceMatrix[1].xyz, instanceMatrix[1].xyz), dot(instanceMatrix[2].xyz, instanceMatrix[2].xyz));
  vec4 w = modelMatrix * (instanceMatrix * vec4(local, 1.0));
  vWorld = w.xyz;
  vDir = d;
  vLocal = local * sqrt(s2);
  vTint = aTint;
  // Above the ground under it, as the ground lies at its middle.
  vSeat = vec4(kind, w.y - (aSeat.y + dot(w.xz - instanceMatrix[3].xz, aSeat.zw)), sqrt(s2.x), wet);
  // A normal goes through the stretch of the stone turned over: each axis divided by its length twice.
  vN0 = instanceMatrix[0].xyz / s2.x;
  vN1 = instanceMatrix[1].xyz / s2.y;
  vN2 = instanceMatrix[2].xyz / s2.z;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const BLOCK_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vDir;
varying vec3 vLocal;
varying vec3 vTint;
varying vec4 vSeat;
varying vec3 vN0;
varying vec3 vN1;
varying vec3 vN2;
uniform sampler2D tRockN;
uniform sampler2D tRockR;
uniform sampler2D tFace;
uniform sampler2D tFaceNh;
uniform sampler2D tGrit;
${NOISE_GLSL}
${RIG_GLSL}
${LOD_GLSL}
${ATLAS_GLSL}
void main() {
  // The lie of the stone across the screen is taken before any branch, and every sheet is read at the level it gives: see lod.ts.
  vec3 d = normalize(vDir);
  float spread = length(fwidth(d));
  takeLod(dFdx(vWorld), dFdy(vWorld));
  if (beyondNear(vWorld)) discard;
  // The atlas is read at the fineness the eye can use: its folds would otherwise ask for the coarsest.
  float small = log2(max(spread * 300.0, 1.0));
  float lod = clamp(small, 0.0, 3.0);
  vec2 uv = rockUv(d, vSeat.x, 0.004 * exp2(lod));
  vec3 no = textureLod(tRockN, uv, lod).rgb * 2.0 - 1.0;
  vec3 form = textureLod(tRockR, uv, lod).rgb;
  float ao = form.g;
  float edge = form.b * 2.0 - 1.0;

  // The skin: the rock sheet, a metre and a half a repeat, on the two faces of the stone's own frame that the point looks out of most.
  vec3 q = vLocal + vTint.yzx * 37.0;
  // One face of the frame nearly everywhere, two only where the stone turns between them: each is two reads.
  vec3 w = pow(abs(no), vec3(8.0));
  w /= w.x + w.y + w.z;
  w = max(w - 0.3, 0.0);
  w /= w.x + w.y + w.z;
  vec3 skin = vec3(0.0);
  vec3 lean = vec3(0.0);
  float high = 0.0;
  // A stone a few pixels across shows none of its skin: it has the skin's mean.
  if (small > 4.5) {
    skin = vec3(0.34, 0.33, 0.31);
    high = 0.5;
    w = vec3(0.0);
  }
  if (w.x > 0.0) {
    vec2 u = q.zy / 1.5;
    vec3 h = textureLod(tFaceNh, u, AT(1024.0, 1.5)).rgb;
    skin += textureLod(tFace, u, AT(1024.0, 1.5)).rgb * w.x;
    lean += vec3(0.0, h.g - 0.5, h.r - 0.5) * w.x;
    high += h.b * w.x;
  }
  if (w.y > 0.0) {
    vec2 u = q.xz / 1.5 + 0.37;
    vec3 h = textureLod(tFaceNh, u, AT(1024.0, 1.5)).rgb;
    skin += textureLod(tFace, u, AT(1024.0, 1.5)).rgb * w.y;
    lean += vec3(h.r - 0.5, 0.0, h.g - 0.5) * w.y;
    high += h.b * w.y;
  }
  if (w.z > 0.0) {
    vec2 u = q.xy / 1.5 + 0.71;
    vec3 h = textureLod(tFaceNh, u, AT(1024.0, 1.5)).rgb;
    skin += textureLod(tFace, u, AT(1024.0, 1.5)).rgb * w.z;
    lean += vec3(h.r - 0.5, h.g - 0.5, 0.0) * w.z;
    high += h.b * w.z;
  }
  // A block the size of a hut is broken at a scale of its own as well: the same sheet laid five metres a repeat on the face it shows most.
  if (vSeat.z > 1.7) {
    float which = w.x > max(w.y, w.z) ? 0.0 : w.y > w.z ? 1.0 : 2.0;
    vec3 h = textureLod(tFaceNh, (which < 0.5 ? q.zy : which < 1.5 ? q.xz : q.xy) / 5.3 + 0.19, AT(1024.0, 5.3)).rgb;
    vec2 g = (h.rg - 0.5) * 1.8;
    lean += which < 0.5 ? vec3(0.0, g.y, g.x) : which < 1.5 ? vec3(g.x, 0.0, g.y) : vec3(g.x, g.y, 0.0);
    skin *= 0.72 + 0.56 * h.b;
    high = mix(high, h.b, 0.5);
  }
  no = normalize(no + lean * 1.1);
  vec3 n = normalize(vN0 * no.x + vN1 * no.y + vN2 * no.z);
  vec3 v = normalize(cameraPosition - vWorld);

  // Pale limestone, each block of its own tone: most grey, some buff, a few dark. The sheet gives it its mottle about its own mean.
  vec3 tone = mix(vec3(0.47, 0.44, 0.4), vec3(0.76, 0.71, 0.63), vTint.x * vTint.x);
  tone = mix(tone, vec3(0.6, 0.52, 0.4), smoothstep(0.72, 0.8, vTint.y));
  vec3 albedo = tone * mix(vec3(1.0), skin / vec3(0.34, 0.33, 0.31), 0.75);
  // The beds of the stone show as faint bands of tone along its lie.
  albedo *= 0.94 + 0.12 * vnoise(vec2(q.y * 7.0, q.x * 0.35 + q.z * 0.2));
  // Broad stains in the stone's own frame, so that a large face is not one tone.
  float stain = vnoise(q.xy * 0.9 + q.z * 0.6) * 0.6 + vnoise(q.zy * 2.7 + 5.0) * 0.4;
  float lichen = vnoise(q.xz * 2.1 + q.y * 1.3 + 3.0);
  albedo *= 0.78 + 0.44 * stain;
  // Fresh breaks along the edges are paler; dirt lies in the creases and the cracks.
  albedo *= 1.0 + 0.5 * clamp(edge, -0.6, 1.0);
  albedo *= mix(0.42, 1.0, smoothstep(0.15, 0.8, ao));
  // What grows on old stone: a dark crust in the creases that look up, and pale and rusty lichen in patches on the tops.
  float up = n.y;
  float crust = smoothstep(0.75, 0.35, ao) * smoothstep(-0.1, 0.5, up) * smoothstep(0.35, 0.6, 1.0 - lichen);
  albedo = mix(albedo, vec3(0.06, 0.07, 0.04), 0.7 * crust);
  float patches = smoothstep(0.62, 0.74, lichen) * smoothstep(0.2, 0.7, up) * smoothstep(0.45, 0.75, high);
  albedo = mix(albedo, mix(vec3(0.58, 0.56, 0.48), vec3(0.5, 0.3, 0.12), step(0.6, fract(vTint.z * 7.0 + floor(stain * 3.0) * 0.37))), 0.5 * patches);

  // Where it stands in the ground: grit and dust lie against its foot, and under its overhang it is dark.
  float above = vSeat.y;
  float size = vSeat.z;
  float grit = smoothstep(0.1 * size + 0.08, 0.0, above - 0.1 * size * vnoise(vWorld.xz * 3.0 / max(size, 0.4)) - 0.04 * high);
  if (grit > 0.0) {
    vec3 dust = textureLod(tGrit, vWorld.xz / 3.1 + vWorld.y * 0.31, AT(1024.0, 3.1)).rgb * vec3(1.5, 1.42, 1.3);
    albedo = mix(albedo, dust, 0.8 * grit * smoothstep(-0.3, 0.3, up));
  }
  float foot = smoothstep(-0.02, 0.22 * size + 0.1, above);
  // A face that stands or leans over sees the ground and its neighbours where a top sees the sky.
  float occ = ao * (0.55 + 0.45 * smoothstep(0.2, 0.7, high)) * mix(0.35, 1.0, foot) * mix(0.5, 1.0, smoothstep(-0.3, 0.8, up));
  // By the lake its foot is wet, and in the stream it is wet as high as the water throws.
  float damp = max(smoothstep(1.15, 0.5, vWorld.y + 0.7 * vnoise(vWorld.xz * 0.11)), vSeat.w * smoothstep(0.75, 0.4, above + 0.2 * stain));
  albedo *= mix(1.0, 0.42, damp);
  vec3 c = rigShade(vWorld, n, v, clamp(albedo, 0.0, 0.9), mix(0.92, 0.4, damp), occ);
  if (damp > 0.02) c += damp * 0.5 * rigGlint(vWorld, n, v, 0.4);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
