// The bed of the lake as the water's shader sees it: the knee-deep shelf, its amber mats combed toward the centre, the pale crust of the lip,
// and the wall of the shaft under the lip. Laid by where the ground is, in metres, so that no picture is pulled long.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { KEYS } from '../cameras';
import { mirrored } from '../land/rock';

/** Per metre of water: red goes first, so that the deep is blue and then black. */
export const ABSORB: [number, number, number] = [0.12, 0.045, 0.03];

export function bedUniforms(ctx: Context, lip: THREE.Texture): Record<string, THREE.IUniform> {
  return {
    tLip: { value: lip },
    uLipIn: { value: 0 },
    uLipFrom: { value: new THREE.Vector2(KEYS.edge.position[0], KEYS.edge.position[2]) },
    tMat: { value: mirrored(ctx.assets.texture('mat/matplate.jpg', { anisotropy: 8 })) },
    tMatH: { value: mirrored(ctx.assets.texture('mat/matplate-h.png', { kind: 'data', anisotropy: 4 })) },
    tMatTile: { value: ctx.assets.texture('mat/mat.jpg', { anisotropy: 8 }) },
    tLipPlate: { value: mirrored(ctx.assets.texture('mat/lip.jpg', { anisotropy: 8 })) },
    tLipPlateH: { value: mirrored(ctx.assets.texture('mat/lip-h.png', { kind: 'data', anisotropy: 4 })) },
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
uniform vec2 uLipFrom;
uniform float uLipIn;
uniform sampler2D tMat;
uniform sampler2D tMatH;
uniform sampler2D tMatTile;
uniform sampler2D tLipPlate;
uniform sampler2D tLipPlateH;
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
  // Metres of water over it.
  float depth;
};

// Metres from the centre to the lip of the shaft, at the bearing of this point.
float lipRadius(vec2 xz) {
  // Drawn in, the deep keeps its reach toward the wide camera and gives way at the sides: an oval lying along the look.
  float toward = dot(xz, vec2(-0.309, 0.951)) / max(length(xz), 1.0);
  return texture2D(tLip, vec2(atan(xz.x, -xz.y) / 6.2831853, 0.5)).r - uLipIn * (1.0 - 0.95 * smoothstep(0.6, 1.0, toward));
}

// The lip where this point is: x is metres in from its line, measured square to it (less than nothing over the shaft), and yz is the way along it.
// The line wanders, and where a tongue of the shelf stands out into the deep it runs almost toward the centre.
vec3 lipHere(vec2 xz) {
  float e = 2.0;
  float m = length(xz) - lipRadius(xz);
  vec2 g = vec2((length(xz + vec2(e, 0.0)) - lipRadius(xz + vec2(e, 0.0))) - (length(xz - vec2(e, 0.0)) - lipRadius(xz - vec2(e, 0.0))),
    (length(xz + vec2(0.0, e)) - lipRadius(xz + vec2(0.0, e))) - (length(xz - vec2(0.0, e)) - lipRadius(xz - vec2(0.0, e)))) / (2.0 * e);
  float steep = max(length(g), 1.0);
  float w = m / steep + 1.1 * (vnoise(xz / 6.3 + 2.0) - 0.5) + 0.4 * (vnoise(xz / 1.7) - 0.5);
  return vec3(w, vec2(-g.y, g.x) / max(length(g), 1e-3));
}

// The lip is one piece of broken crust 10 m long, seen from above, its drop along its top edge and nothing beyond it. It is laid along the lip,
// turned over at each end, from 0.9 m outside the line of the lip to 4.7 m inside it.
// The mats reach this far out from the lip before they thin; the two sizes the picture of them is laid at, metres.
const float MAT_REACH = 260.0;
const float MAT_A = 6.5;
const float MAT_B = 9.2;
const float LIP_OUT = 0.9;
const float LIP_DEEP = 5.63;
vec2 lipPlateAt(vec2 xz, vec3 lip) {
  return vec2(dot(xz - uLipFrom, lip.yz) / 10.0, 1.0 - (lip.x + LIP_OUT) / LIP_DEEP);
}
// How much of the crust is here: nothing beyond its broken edge.
float lipCover(vec2 xz, vec3 lip) {
  if (lip.x > LIP_DEEP - LIP_OUT - 0.4) return 1.0;
  if (lip.x < -LIP_OUT + 0.02) return 0.0;
  return smoothstep(0.035, 0.07, texture2D(tLipPlateH, lipPlateAt(xz, lip)).r);
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

Bed bedAt(vec2 b, vec3 lip, float inShore, float depth, float away) {
  Bed o;
  float wLip = lip.x;
  float w = max(wLip, 0.0);
  float r = length(b);
  // The angle is nothing in the south, where the cameras stand: its seam lies in the north, two kilometres off.
  float a2 = atan(b.x, b.y);
  vec3 sinter = texture2D(tSinter, b / 3.0).rgb;
  // The same crust again, larger and turned, in patches: no row of it comes round twice.
  vec2 turned = vec2(b.x * 0.74 - b.y * 0.67, b.x * 0.67 + b.y * 0.74) / 5.3 + 0.41;
  float patchy = smoothstep(0.35, 0.65, vnoise(b / 2.9 + 11.0));
  sinter = mix(sinter, texture2D(tSinter, turned).rgb, patchy);
  vec3 sinterFar = texture2D(tSinter, b / 17.0 + 0.37).rgb;
  vec3 snh = mix(texture2D(tSinterNh, b / 3.0).rgb, texture2D(tSinterNh, turned).rgb, patchy);
  vec3 pale = sinter * (sinterFar / vec3(0.501, 0.351, 0.19)) * vec3(0.84, 1.02, 1.3);
  float slabs = smoothstep(0.5, 0.68, 0.6 * vnoise(b / 7.3 + 2.0) + 0.4 * vnoise(b / 2.2)) * (1.0 - 0.85 * smoothstep(150.0, 230.0, w));
  float crust = smoothstep(9.0, 1.5, w);
  vec3 silt = mix(vec3(0.07, 0.05, 0.035), vec3(0.2, 0.185, 0.165), smoothstep(150.0, 230.0, w)) * (0.5 + 1.0 * snh.b);
  vec3 bare = mix(silt, pale, max(slabs, crust));
  float stands = 0.0;
  vec2 stoneLean = vec2(0.0);
  float beach = smoothstep(11.0, 2.5, inShore);
  if (beach > 0.0) {
    vec3 gravel = texture2D(tShore, b / 4.0).rgb * (texture2D(tShore, b / 23.0 + 0.61).rgb / vec3(0.323, 0.255, 0.2));
    bare = mix(bare, gravel * 0.42, beach);
    // Under a low eye the same shingle the shore is made of goes on under the water, wet and dark, as far as the eye can tell one stone from the next.
    float under = beach * smoothstep(24.0, 9.0, away) * smoothstep(12.0, 4.0, cameraPosition.y);
    if (under > 0.0) {
      vec2 xs = b / 0.11 + 2.0 * vec2(vnoise(b * 1.3), vnoise(b * 1.3 + 7.0));
      under *= smoothstep(1.1, 0.35, 0.43 * length(fwidth(xs)));
      if (under > 0.0) {
        vec2 lean;
        float tall;
        vec4 stones = shingleAt(b, xs, lean, tall);
        // A stone taller than the water over it stands out of it, wet: the waterline goes in and out between the stones.
        stands = under * smoothstep(0.0, 0.006, tall * 1.6 - depth);
        bare = mix(bare, stones.rgb * mix(0.34, 0.6, stands), under);
        stoneLean = lean * stands;
      }
    }
  }
  // Where the mats lie: patches drawn out toward the centre, thick round the lip, torn and thin toward the shore, with lanes of open
  // water that run in to the deep. Counted in metres round the lake and metres out, both bent by the ground, so no patch has a straight side.
  vec2 bend = vec2(vnoise(b / 37.0 + 1.3), vnoise(b / 37.0 + 8.1)) - 0.5;
  vec2 pq = vec2(a2 * 640.0 + bend.x * 26.0, r + bend.y * 60.0);
  float blobs = 0.6 * vnoise(b / 48.0) + 0.4 * vnoise(b / 13.0 + 3.0);
  float drawn = 0.55 * vnoise(pq / vec2(38.0, 190.0)) + 0.3 * vnoise(pq / vec2(12.0, 70.0) + 3.0) + 0.15 * vnoise(pq / vec2(3.5, 24.0) + 7.0);
  float field = 0.62 * drawn + 0.38 * blobs;
  float lanes = smoothstep(0.035, 0.008, abs(vnoise(vec2(pq.x / 13.0, pq.y / 330.0) + 9.0) - 0.5)) * smoothstep(8.0, 50.0, w);
  float toLip = smoothstep(MAT_REACH + uLipIn, 30.0, w);
  float thin = smoothstep(4.0, 46.0, inShore + 30.0 * (blobs - 0.5)) * (1.0 - 0.8 * slabs * (1.0 - crust));
  float edge = mix(0.53, 0.35, toLip);
  float cover = smoothstep(edge - 0.02, edge + 0.07, field) * thin * (1.0 - 0.92 * lanes);
  // The crust of the lip keeps a strand here and there.
  cover = max(cover, 0.8 * thin * smoothstep(0.42, 0.56, field) * smoothstep(9.0, 3.0, wLip) * smoothstep(-0.6, 0.6, wLip));
  o.albedo = bare;
  o.tilt = (snh.xy * 2.0 - 1.0) * 0.5;
  o.occ = 0.55 + 0.45 * smoothstep(0.1, 0.6, snh.b);
  o.glow = 0.0;
  o.depth = depth;
  o.dry = max(smoothstep(0.0, -0.035, depth), stands);
  // How much of a strand of weed lies here: the strands go on over the crust of the lip.
  float strand = 0.0;
  if (cover > 0.0) {
    // The mats themselves are the Builder's picture of them, laid by where the bed is and never pulled: a tangle of hair-fine strands, gold over
    // rust over dark water, with its own pale slabs. It is laid twice, at two sizes and turned, and the strand that stands higher lies on top,
    // so that strands cross strands and no row of it comes round.
    float px = max(length(dFdx(b)), length(dFdy(b)));
    // A slow sway, toward the centre and back: each tuft in its own time.
    vec2 sway = (b / max(r, 1.0)) * (0.022 * sin(uTime * 0.9 + 6.28 * vnoise(b / 2.3)) + 0.008 * sin(uTime * 2.1 + 6.28 * vnoise(b / 0.5 + 4.0)));
    vec2 qa = vec2(b.x * 0.951 + b.y * 0.309, -b.x * 0.309 + b.y * 0.951) / MAT_A + sway / MAT_A;
    vec2 qb = vec2(b.x * 0.999 - b.y * 0.035, b.x * 0.035 + b.y * 0.999) / MAT_B + 0.37 + sway * 1.4 / MAT_B;
    float ha = texture2D(tMatH, qa).r;
    float hb = texture2D(tMatH, qb).r;
    float pick = smoothstep(-0.12, 0.12, hb - ha + 0.5 * (vnoise(b / 3.7 + 21.0) - 0.5));
    // Closer than the picture is fine it is let go soft, and the finer tile of the same weed lies over it as hair: every tuft is made of strands.
    float fine = smoothstep(0.012, 0.004, px);
    vec3 near3 = mix(texture2D(tMat, qa, 1.2 * fine).rgb, texture2D(tMat, qb, 1.2 * fine).rgb, pick);
    float mh = mix(ha, hb, pick);
    if (fine > 0.0) {
      vec3 tile = texture2D(tMatTile, vec2(qa.y, qa.x) * (MAT_A / 1.15) + sway * 0.6).rgb;
      float hair = smoothstep(0.1, 0.4, dot(tile, vec3(0.4, 0.5, 0.1)));
      // The hair lies on the weed, not on the bare slab.
      float weedy = fine * smoothstep(0.75, 0.5, mh) * 0.85;
      near3 = mix(near3, mix(near3 * 0.55, tile * 1.3, hair), weedy);
      mh += weedy * 0.2 * (hair - 0.45);
    }
    // Rust in one bed, gold in the next; gold in the heart of a patch, rust at its torn edge.
    float tone = 0.5 * vnoise(pq / vec2(9.0, 110.0) + 5.0) + 0.3 * vnoise(pq / vec2(2.6, 40.0)) + 0.2 * vnoise(b / 6.0);
    float heart = smoothstep(edge, edge + 0.28, field);
    vec3 far3 = mix(vec3(0.17, 0.06, 0.02), vec3(0.31, 0.14, 0.035), smoothstep(0.3, 0.55, tone));
    far3 = mix(far3, vec3(0.46, 0.29, 0.065), smoothstep(0.5, 0.75, tone) * (0.35 + 0.65 * heart));
    // Toward the lip the amber goes to brown and then to the dark of the deep.
    far3 *= mix(vec3(0.5, 0.42, 0.38), vec3(1.0), smoothstep(4.0, 60.0, w));
    // Far off no strand is told: the patch has its own tone and the streaks of its lie.
    float told = smoothstep(0.25, 0.03, px);
    vec3 weed = mix(far3 * (0.75 + 0.5 * vnoise(pq / vec2(1.3, 19.0) + 2.0)), near3 * mix(vec3(1.0), far3 / vec3(0.27, 0.125, 0.035), 0.45), told);
    float high = mix(0.5, mh, told);
    // The strands that stand highest are the palest: gold where the low sun finds them.
    weed *= mix(vec3(1.0), vec3(1.5, 1.38, 0.95), told * smoothstep(0.42, 0.85, mh));
    // At the torn edge of a patch only the strands that stand highest are left: wisps, not a line.
    float lies = smoothstep(0.0, 0.22, cover * 1.25 - (1.0 - high) * 0.7 * told * smoothstep(0.95, 0.5, cover) - 0.12 * (1.0 - told));
    o.albedo = mix(bare, weed, lies);
    // Its relief says what lies where: the strands that stand highest lie in the surface, the gaps between are a hand deeper.
    float up = (high - 0.62) * 0.34;
    o.depth = mix(depth, max(-up, 0.0) + 0.015, lies);
    // From far off and low, the tops of the mats that lie in the surface take the mirror from the water.
    float afloat = mix(0.2, mix(0.08, 0.86, smoothstep(6.0, 30.0, cameraPosition.y)), smoothstep(0.03, 0.4, px)) * smoothstep(0.3, 0.6, high);
    o.dry = mix(o.dry, max(smoothstep(0.0, 0.035, up) * 0.9, afloat), lies);
    o.occ = mix(o.occ, 0.45 + 0.55 * smoothstep(0.1, 0.5, high), lies);
    // The low sun comes through the strands that stand up into it.
    o.glow = 0.16 * lies * smoothstep(0.35, 0.8, high);
    strand = lies;
  }
  // The crust of the lip itself, from its plate: pale rimmed pools and broken ledges that stand out of the water, the weed lying over them.
  float onLip = smoothstep(LIP_DEEP - LIP_OUT - 0.2, LIP_DEEP - LIP_OUT - 1.5, wLip + 0.5 * (vnoise(b / 1.1 + 4.0) - 0.5));
  if (onLip > 0.0) {
    vec2 q = lipPlateAt(b, lip);
    vec3 lp = texture2D(tLipPlate, q).rgb;
    float lh = texture2D(tLipPlateH, q).r;
    vec2 e = vec2(0.004, 0.0);
    vec2 g = vec2(texture2D(tLipPlateH, q + e.xy).r - texture2D(tLipPlateH, q - e.xy).r, texture2D(tLipPlateH, q + e.yx).r - texture2D(tLipPlateH, q - e.yx).r);
    vec2 around = lip.yz;
    vec2 inward = vec2(-lip.z, lip.y);
    // The crust keeps its weed: rust-orange filaments lie over the pale sinter to the very edge, and the crust shows between them.
    float bareLip = onLip * (1.0 - 0.9 * strand);
    o.albedo = mix(o.albedo, mix(lp, vec3(dot(lp, vec3(0.33))), 0.35) * vec3(1.2, 1.24, 1.26), bareLip);
    o.tilt = mix(o.tilt, -(around * g.x + inward * g.y) * 2.0, bareLip);
    o.occ = mix(o.occ, 0.35 + 0.65 * smoothstep(0.15, 0.6, lh), onLip);
    o.glow *= 1.0 - bareLip;
    // Its high rims are dry stone, its hollows hold a finger of water.
    o.dry = mix(o.dry, smoothstep(0.3, 0.46, lh), onLip);
    o.depth = mix(o.depth, (0.42 - lh) * 0.25, onLip);
  }
  return o;
}

// The wall of the shaft, seen down through the water from over it: pale beds, green with the water, ledge under ledge.
Bed wallAt(vec2 b, float down, float inside) {
  Bed o;
  float along = atan(b.x, b.y) * 480.0;
  vec2 uv = vec2(along, -down) / vec2(21.0, 30.0);
  vec3 c = texture2D(tCliff, uv).rgb;
  // Beds and the stains that run down them.
  float runs = 0.55 + 0.45 * smoothstep(0.25, 0.7, 0.6 * vnoise(vec2(along / 1.3, down / 9.0)) + 0.4 * vnoise(vec2(along / 0.37, down / 4.0) + 3.0));
  float ledge = 0.45 + 0.55 * smoothstep(0.3, 0.62, 0.6 * vnoise(vec2(along / 6.0, down / 1.7)) + 0.4 * vnoise(vec2(along / 1.9, down / 0.5)));
  o.albedo = clamp(c * vec3(0.7, 0.95, 0.85) * runs, 0.0, 0.9);
  o.occ = ledge;
  o.tilt = vec2(0.0);
  o.glow = 0.0;
  o.dry = 0.0;
  o.depth = down;
  return o;
}`;
