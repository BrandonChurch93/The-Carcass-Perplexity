// The bed of the lake as the water's shader sees it: the knee-deep shelf, its amber mats combed toward the centre, the pale crust of the lip,
// and the wall of the shaft under the lip. Laid by where the ground is, in metres, so that no picture is pulled long.
import * as THREE from 'three';
import type { Context } from '../shared/context';

/** Per metre of water: red goes first, so that the deep is blue and then black. */
export const ABSORB: [number, number, number] = [0.12, 0.045, 0.03];

export function bedUniforms(ctx: Context, lip: THREE.Texture): Record<string, THREE.IUniform> {
  return {
    tLip: { value: lip },
    tMat: { value: ctx.assets.texture('mat/mat.jpg', { anisotropy: 4 }) },
    tMatNh: { value: ctx.assets.texture('mat/mat-nh.png', { kind: 'data' }) },
    tSinter: { value: ctx.assets.texture('mat/sinter.jpg', { anisotropy: 2 }) },
    tSinterNh: { value: ctx.assets.texture('mat/sinter-nh.png', { kind: 'data' }) },
    tShore: { value: ctx.assets.texture('mat/shore.jpg', { anisotropy: 2 }) },
    tCliff: { value: ctx.assets.texture('mat/cliff.jpg') },
    uAbsorb: { value: new THREE.Vector3(...ABSORB) },
    uDeep: { value: new THREE.Vector3(0.004, 0.02, 0.045) },
  };
}

// Needs NOISE_GLSL and RIG_GLSL before it.
export const BED_GLSL = /* glsl */ `
uniform sampler2D tLip;
uniform sampler2D tMat;
uniform sampler2D tMatNh;
uniform sampler2D tSinter;
uniform sampler2D tSinterNh;
uniform sampler2D tShore;
uniform sampler2D tCliff;
uniform vec3 uAbsorb;
uniform vec3 uDeep;

struct Bed {
  vec3 albedo;
  vec2 tilt;
  float glow;
  float occ;
  // How far the thing stands out of the water: a mat that has grown to the air is wet weed, not a mirror.
  float dry;
};

// Metres from the centre to the lip of the shaft, at the bearing of this point.
float lipRadius(vec2 xz) {
  return texture2D(tLip, vec2(atan(xz.x, -xz.y) / 6.2831853, 0.5)).r;
}

// Metres of water over the shelf: it shelves from nothing at the shore to knee-deep hollows, and comes up again to a crust at the lip
// that stands out of the water in places (below nothing: negative).
float shelfDepthAt(vec2 xz, float inShore, float w) {
  float hollows = 0.24 + 0.36 * (0.6 * vnoise(xz / 46.0) + 0.4 * vnoise(xz / 17.0 + 5.0));
  // Bars of pale rock that come up almost to the air.
  float bars = smoothstep(0.62, 0.8, 0.6 * vnoise(xz / 7.3 + 2.0) + 0.4 * vnoise(xz / 2.2));
  float depth = min(inShore * 0.04, hollows * (1.0 - 0.85 * bars));
  float crust = -0.05 + 0.2 * vnoise(xz / 1.9) + 0.09 * vnoise(xz / 0.43 + 7.0) - 0.07 * smoothstep(1.6, 0.2, w);
  return mix(crust, depth, smoothstep(0.8, 9.0, w));
}

Bed bedAt(vec2 b, float w, float inShore, float depth, float away) {
  Bed o;
  float r = length(b);
  // The angle is nothing in the south, where the cameras stand: its seam lies in the north, two kilometres off.
  float a2 = atan(b.x, b.y);
  vec3 sinter = texture2D(tSinter, b / 3.0).rgb;
  vec3 sinterFar = texture2D(tSinter, b / 17.0 + 0.37).rgb;
  vec3 snh = texture2D(tSinterNh, b / 3.0).rgb;
  vec3 pale = sinter * (sinterFar / vec3(0.501, 0.351, 0.19)) * vec3(0.92, 1.02, 1.2);
  float slabs = smoothstep(0.5, 0.68, 0.6 * vnoise(b / 7.3 + 2.0) + 0.4 * vnoise(b / 2.2));
  float crust = smoothstep(9.0, 1.5, w);
  vec3 silt = vec3(0.1, 0.085, 0.07) * (0.5 + 1.0 * snh.b);
  vec3 bare = mix(silt, pale, max(slabs, crust));
  float beach = smoothstep(11.0, 2.5, inShore);
  if (beach > 0.0) {
    vec3 gravel = texture2D(tShore, b / 4.0).rgb * (texture2D(tShore, b / 23.0 + 0.61).rgb / vec3(0.323, 0.255, 0.2));
    bare = mix(bare, gravel * 0.42, beach);
  }
  // Where the mats grow: beds drawn out toward the centre, thick near the lip, thin and torn toward the shore, with gaps of clear water.
  // Beds drawn out toward the centre: noise in bearing and distance, both bent by the ground so that no bed has a straight side.
  vec2 bend = vec2(vnoise(b / 37.0 + 1.3), vnoise(b / 37.0 + 8.1)) - 0.5 + 0.35 * (vec2(vnoise(b / 9.0 + 4.0), vnoise(b / 9.0 + 2.7)) - 0.5);
  float aw = a2 + bend.x * 0.05;
  float rw = r + bend.y * 90.0;
  float rays = 0.5 * vnoise(vec2(aw * 70.0, rw / 260.0)) + 0.3 * vnoise(vec2(aw * 230.0 + 3.0, rw / 90.0)) + 0.2 * vnoise(vec2(aw * 800.0, rw / 31.0) + 7.0);
  float blobs = 0.6 * vnoise(b / 48.0) + 0.4 * vnoise(b / 13.0 + 3.0);
  float field = 0.5 * rays + 0.5 * blobs + 0.1 * (vnoise(b / 3.1) - 0.5);
  float thin = smoothstep(4.0, 46.0, inShore) * (1.0 - 0.8 * slabs * (1.0 - crust));
  float cover = smoothstep(0.34, 0.47, field + 0.14 * smoothstep(150.0, 10.0, w)) * thin;
  o.albedo = bare;
  o.tilt = (snh.xy * 2.0 - 1.0) * 0.8;
  o.occ = 0.55 + 0.45 * smoothstep(0.1, 0.6, snh.b);
  o.glow = 0.0;
  o.dry = 0.0;
  if (cover > 0.0) {
    // The strands: the mat picture laid along and round the lake, so that its hair runs to the centre. Locks swing a little and sway.
    vec2 q = vec2(r, a2 * 600.0);
    vec2 lock = vec2(vnoise(b / 5.0 + 3.1), vnoise(b / 5.0 + 9.9)) - 0.5;
    vec2 kink = vec2(vnoise(b / 1.3 + 1.7), vnoise(b / 1.3 + 6.3)) - 0.5;
    q += 1.6 * lock + 0.3 * kink;
    q.y += 0.05 * sin(uTime * 0.8 + 6.28 * vnoise(b / 1.9)) + 0.015 * sin(uTime * 1.9 + 6.28 * vnoise(b / 0.4));
    vec3 ta = texture2D(tMat, q / 3.0).rgb;
    vec3 nh = texture2D(tMatNh, q / 3.0).rgb;
    float fine = 1.0 - smoothstep(6.0, 30.0, away);
    if (fine > 0.0) ta = mix(ta, texture2D(tMat, q / 1.07 + vec2(0.31, 0.57)).rgb, 0.4 * fine);
    vec3 tc = texture2D(tMat, vec2(q.x / 31.0, q.y / 13.0) + vec2(0.11, 0.73)).rgb / vec3(0.279, 0.092, 0.014);
    // Rust in one bed, gold in the next.
    float tone = 0.6 * vnoise(b / 27.0 + 5.0) + 0.4 * vnoise(b / 6.0);
    vec3 hair = ta * mix(vec3(1.0), tc, 0.4) * mix(vec3(0.85, 0.9, 0.6), vec3(1.35, 1.95, 1.3), smoothstep(0.3, 0.72, tone));
    // The picture has pale crust of its own between the hair: it stays, a little.
    float isHair = smoothstep(1.3, 2.2, ta.r / max(ta.g, 1e-3));
    float on = cover * mix(0.55, 1.0, isHair);
    o.albedo = mix(bare, hair, on);
    o.tilt = mix(o.tilt, (nh.xy * 2.0 - 1.0) * 1.2, on);
    o.occ = mix(o.occ, 0.45 + 0.55 * smoothstep(0.15, 0.7, nh.b), on);
    o.glow = 0.22 * on * isHair;
    o.dry = smoothstep(0.2, 0.6, on * (0.6 + 0.4 * nh.b)) * 0.9;
  }
  return o;
}

// The wall of the shaft, seen down through the water from over it: pale beds, green with the water, ledge under ledge.
Bed wallAt(vec2 b, float down, float inside) {
  Bed o;
  vec2 uv = vec2(atan(b.x, b.y) * 480.0, -down) / 34.0;
  vec3 c = texture2D(tCliff, uv).rgb;
  float ledge = 0.4 + 0.6 * smoothstep(0.3, 0.62, 0.6 * vnoise(vec2(uv.x * 9.0, down / 1.7)) + 0.4 * vnoise(vec2(uv.x * 31.0, down / 0.5)));
  o.albedo = c * vec3(0.8, 1.0, 0.95);
  o.tilt = vec2(0.0);
  o.glow = 0.0;
  o.dry = 0.0;
  o.occ = ledge;
  return o;
}`;
