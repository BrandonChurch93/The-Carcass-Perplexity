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
    tMatTile: { value: mirrored(ctx.assets.texture('mat/matdark.jpg', { anisotropy: 8 })) },
    tFlat: { value: mirrored(ctx.assets.texture('lake/matflat.jpg', { anisotropy: 4 })) },
    tLipPlate: { value: mirrored(ctx.assets.texture('mat/lip.jpg', { anisotropy: 8 })) },
    tLipPlateH: { value: mirrored(ctx.assets.texture('mat/lip-h.png', { kind: 'data', anisotropy: 4 })) },
    tSinter: { value: ctx.assets.texture('mat/sinter.jpg', { anisotropy: 2 }) },
    tShore: { value: mirrored(ctx.assets.texture('mat/shoreplate.jpg', { anisotropy: 8 })) },
    tShoreH: { value: mirrored(ctx.assets.texture('mat/shoreplate-h.png', { kind: 'data', anisotropy: 1 })) },
    tWall: { value: mirrored(ctx.assets.texture('mat/shaftwall.jpg', { anisotropy: 4 })) },
    uWallFall: { value: 1 },
    uAbsorb: { value: new THREE.Vector3(...ABSORB) },
    uDeep: { value: new THREE.Vector3(0.004, 0.017, 0.03) },
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
uniform sampler2D tFlat;
uniform sampler2D tLipPlate;
uniform sampler2D tLipPlateH;
uniform sampler2D tSinter;
uniform sampler2D tShore;
uniform sampler2D tShoreH;
uniform sampler2D tWall;
// How steeply the wall falls from the lip, against the wide shot's.
uniform float uWallFall;
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

// How much water one pixel covers, across and up the frame (metres, x and z), and the longer of the two. Set once at the top of main, before
// anything can leave it. Every picture below is read by this and never by what the pixel beside it holds: the renderer shades four pixels
// together, and one of the four that does not take a branch leaves in it whatever was there before, which is not the same twice.
vec2 gFx;
vec2 gFy;
float gCovers;
// How far the bent look travels along the bed for each metre it goes down.
vec2 gSlide;

// How coarse a picture is read where one pixel covers ax and ay of it, in its own texels: the level at which the short side of that is one
// texel, and never finer than half the long side. The level is worked out and the picture read at it (textureLod): a read that is handed
// the two sides themselves (textureGrad) repeats as well, but costs this renderer a third more of the whole lake.
float levelOf(vec2 ax, vec2 ay) {
  float a2 = dot(ax, ax);
  float b2 = dot(ay, ay);
  return 0.5 * log2(max(max(min(a2, b2), 0.25 * max(a2, b2)), 1e-9));
}
// The picture t at q, where q is the water turned and sized by m (q = m * xz + something that hardly changes); coarser softens it by that many levels.
vec4 readAt(sampler2D t, vec2 q, mat2 m, float coarser) {
  vec2 size = vec2(textureSize(t, 0));
  return textureLod(t, q, levelOf(m * gFx * size, m * gFy * size) + coarser);
}
vec4 readAt(sampler2D t, vec2 q, mat2 m) {
  return readAt(t, q, m, 0.0);
}
// Metres from the centre to the lip of the shaft, at the bearing of this point.
float lipRadius(vec2 xz) {
  // Drawn in, the deep keeps its reach toward the wide camera and gives way at the sides: an oval lying along the look.
  float toward = dot(xz, vec2(-0.309, 0.951)) / max(length(xz), 1.0);
  vec2 lips = textureLod(tLip, vec2(atan(xz.x, -xz.y) / 6.2831853, 0.5), 0.0).rg;
  return mix(lips.x, lips.y, min(uLipIn / 100.0, 1.0)) - uLipIn * (1.0 - 0.95 * smoothstep(0.6, 1.0, toward));
}

float lipWander(vec2 xz) {
  // Drawn in for the wide shot, the line of the lip is seen whole from the rim: it wanders by tens of metres, bays and tongues, never an arc.
  float bays = uLipIn > 0.0 ? uLipIn / 270.0 * (38.0 * (vnoise(xz / 90.0 + 7.0) - 0.5) + 14.0 * (vnoise(xz / 27.0 + 3.0) - 0.5)) : 0.0;
  return bays + 1.1 * (vnoise(xz / 6.3 + 2.0) - 0.5) + 0.4 * (vnoise(xz / 1.7) - 0.5);
}

// The lip where this point is: x is metres in from its line, measured square to it (less than nothing over the shaft), and yz is the way along it.
// The line wanders, and where a tongue of the shelf stands out into the deep it runs almost toward the centre.
vec3 lipHere(vec2 xz) {
  float e = 2.0;
  float m = length(xz) - lipRadius(xz);
  // Far from the lip only the distance is asked for: its line is not traced there.
  if (abs(m) > 140.0) return vec3(m, vec2(-xz.y, xz.x) / max(length(xz), 1.0));
  vec2 g = vec2((length(xz + vec2(e, 0.0)) - lipRadius(xz + vec2(e, 0.0))) - (length(xz - vec2(e, 0.0)) - lipRadius(xz - vec2(e, 0.0))),
    (length(xz + vec2(0.0, e)) - lipRadius(xz + vec2(0.0, e))) - (length(xz - vec2(0.0, e)) - lipRadius(xz - vec2(0.0, e)))) / (2.0 * e);
  float steep = max(length(g), 1.0);
  float w = m / steep + lipWander(xz);
  return vec3(w, vec2(-g.y, g.x) / max(length(g), 1e-3));
}
// The lip a step away from a point where it is already known: the same line, read off its lie there, not looked up again.
vec3 lipNear(vec2 xz, vec2 from, vec3 lip) {
  return vec3(lip.x - lipWander(from) + dot(xz - from, vec2(lip.z, -lip.y)) + lipWander(xz), lip.yz);
}

// The lip is one piece of broken crust 10 m long, seen from above, its drop along its top edge and nothing beyond it. It is laid along the lip,
// turned over at each end, from 0.9 m outside the line of the lip to 4.7 m inside it.
// The mats reach this far out from the lip before they thin; the two sizes the picture of them is laid at, metres.
const float MAT_REACH = 260.0;
const float MAT_A = 3.4;
const float MAT_B = 4.9;
// The flats seen from the rim are one picture of them from straight above (1671 by 941), laid by the ground in metres at two sizes,
// each turned its own way. Metres that the long side of it covers, and its short side as a share of the long.
const float FLAT_A = 170.0;
const float FLAT_B = 290.0;
const float FLAT_SHAPE = 0.5631;
const float LIP_OUT = 0.9;
const float LIP_DEEP = 5.63;
vec2 lipPlateAt(vec2 xz, vec3 lip) {
  return vec2(dot(xz - uLipFrom, lip.yz) / 10.0, 1.0 - (lip.x + LIP_OUT) / LIP_DEEP);
}
// The same picture read: its rows lie along the lip, so the water is turned to the lip's own way.
vec4 lipPlateRead(sampler2D t, vec2 q, vec3 lip) {
  return readAt(t, q, mat2(lip.y / 10.0, -lip.z / LIP_DEEP, lip.z / 10.0, lip.y / LIP_DEEP));
}
// How much of the crust is here: nothing beyond its broken edge.
float lipCover(vec2 xz, vec3 lip) {
  if (lip.x > LIP_DEEP - LIP_OUT - 0.4) return 1.0;
  if (lip.x < -LIP_OUT + 0.02) return 0.0;
  return smoothstep(0.035, 0.07, lipPlateRead(tLipPlateH, lipPlateAt(xz, lip), lip).r);
}

// Metres of water over the shelf: it shelves from nothing at the shore to knee-deep hollows, and comes up again to a crust at the lip
// that stands out of the water in places (below nothing: negative).
// The bars of pale rock that come up almost to the air, before they are given an edge: told once for a place, for its depth and for its slabs.
float shelfBars(vec2 xz) {
  return 0.6 * vnoise(xz / 7.3 + 2.0) + 0.4 * vnoise(xz / 2.2);
}
float shelfDepthAt(vec2 xz, float inShore, float w, float barsAt) {
  float hollows = 0.24 + 0.36 * (0.6 * vnoise(xz / 46.0) + 0.4 * vnoise(xz / 17.0 + 5.0));
  float bars = smoothstep(0.62, 0.8, barsAt);
  float depth = min(inShore * 0.04, hollows * (1.0 - 0.85 * bars));
  float crust = -0.05 + 0.2 * vnoise(xz / 1.9) + 0.09 * vnoise(xz / 0.43 + 7.0) - 0.07 * smoothstep(1.6, 0.2, w);
  return mix(crust, depth, smoothstep(0.8, 9.0, w));
}

// The picture of the flats where this ground is. It is laid twice, and which laying has a place goes by patches some tens of metres
// across, so each patch of the flats is turned its own way and nothing on them runs toward the centre. The picture turns over at each
// repeat: a laying is let go as it nears the lines where it turns, and the other, whose lines lie elsewhere, has the ground there.
vec3 flatsAt(vec2 b) {
  mat2 ma = mat2(0.829, -0.559 / FLAT_SHAPE, 0.559, 0.829 / FLAT_SHAPE) / FLAT_A;
  mat2 mb = mat2(0.326, 0.945 / FLAT_SHAPE, -0.945, 0.326 / FLAT_SHAPE) / FLAT_B;
  vec2 qa = ma * b + 0.13;
  vec2 qb = mb * b + vec2(0.61, 0.27);
  vec2 ta = 0.5 - abs(fract(qa) - 0.5);
  vec2 tb = 0.5 - abs(fract(qb) - 0.5);
  float clearA = smoothstep(0.0, 0.07, min(ta.x, ta.y));
  float clearB = smoothstep(0.0, 0.07, min(tb.x, tb.y));
  float pick = smoothstep(-0.2, 0.2, vnoise(b / 61.0 + 21.0) - 0.5 + 0.9 * (clearB - clearA));
  return mix(readAt(tFlat, qa, ma).rgb, readAt(tFlat, qb, mb).rgb, pick);
}

// barsAt: what shelfBars gives here (the depth was told from it, and the pale slabs are the same bars).
Bed bedAt(vec2 b, vec3 lip, float inShore, float depth, float away, float barsAt) {
  Bed o;
  float wLip = lip.x;
  float w = max(wLip, 0.0);
  float r = length(b);
  // The angle is nothing in the south, where the cameras stand: its seam lies in the north, two kilometres off.
  float a2 = atan(b.x, b.y);
  // The same crust again, larger and turned, in patches: no row of it comes round twice.
  vec2 turned = vec2(b.x * 0.74 - b.y * 0.67, b.x * 0.67 + b.y * 0.74) / 5.3 + 0.41;
  // From the rim one read of the crust is all that can be told apart.
  vec3 sinter = readAt(tSinter, turned, mat2(0.74, 0.67, -0.67, 0.74) / 5.3).rgb;
#if EYE_NEAR > 0
  sinter = mix(readAt(tSinter, b / 3.0, mat2(1.0 / 3.0)).rgb, sinter, smoothstep(0.35, 0.65, vnoise(b / 2.9 + 11.0)));
#endif
  vec3 sinterFar = readAt(tSinter, b / 17.0 + 0.37, mat2(1.0 / 17.0)).rgb;
  // The lie of the crust is read from its own picture: its pale tops stand, its dark seams lie low.
  vec3 snh = vec3(0.5, 0.5, clamp(dot(sinter, vec3(0.5, 0.9, 0.6)) * 1.1, 0.0, 1.0));
  vec3 pale = sinter * (sinterFar / vec3(0.501, 0.351, 0.19)) * vec3(0.84, 1.02, 1.3);
  float slabs = smoothstep(0.5, 0.68, barsAt) * (1.0 - 0.85 * smoothstep(150.0, 230.0, w));
  float crust = smoothstep(9.0, 1.5, w);
  // Seen from the rim the open water between the flats lies over pale silt from a little way out from the pool: it is the sky's colour.
  float fromAbove = smoothstep(8.0, 40.0, cameraPosition.y);
  vec3 silt = mix(vec3(0.07, 0.05, 0.035), vec3(0.2, 0.185, 0.165), smoothstep(mix(150.0, 40.0, fromAbove), mix(230.0, 150.0, fromAbove), w + 60.0 * fromAbove * (vnoise(b / 53.0 + 2.0) - 0.5))) * (0.5 + 1.0 * snh.b);
  vec3 bare = mix(silt, pale * mix(vec3(1.0), vec3(0.36, 0.38, 0.42), smoothstep(8.0, 40.0, cameraPosition.y) * (1.0 - crust)), max(slabs, crust));
  float stands = 0.0;
  vec2 stoneLean = vec2(0.0);
  float beach = smoothstep(11.0, 2.5, inShore);
  if (beach > 0.0) {
    // The bed by the shore is the shore's own picture gone on under the water, at its own size: eight metres of stones and grit.
    vec3 plate = readAt(tShore, b / vec2(8.0, 4.5), mat2(1.0 / 8.0, 0.0, 0.0, 1.0 / 4.5)).rgb;
    // The picture's few rust grains would stand as orange specks on a wet grey bed: they are taken for stones of its own grey.
    plate = mix(plate, vec3(dot(plate, vec3(0.333))) * vec3(1.04, 1.0, 0.94), smoothstep(1.5, 2.4, plate.r / max(plate.b, 0.02)));
    vec3 gravel = plate * (readAt(tShore, b / vec2(43.0, 24.2) + 0.61, mat2(1.0 / 43.0, 0.0, 0.0, 1.0 / 24.2)).rgb / vec3(0.222, 0.161, 0.119)) * vec3(1.3, 1.36, 1.44);
    bare = mix(bare, gravel * 0.5, beach);
    // Under a low eye the same shingle the shore is made of goes on under the water, wet and dark, as far as the eye can tell one stone from the next.
#if EYE_SHINGLE
    float under = beach * smoothstep(40.0, 16.0, away);
    if (under > 0.0) {
      // The shore's lip (land/lip.ts) goes on under the water as the same ground: its sheet at its size and place (two metres a repeat,
      // not turned, not moved) and its height sheet read as it reads it, so a stone half in the water is one stone. The height is read
      // three times, a finger apart, for the lean of each stone's side: it is what the light and the rings have to tell the bed by.
      const mat2 laid = mat2(0.5, 0.0, 0.0, 1.0 / 1.125);
      vec2 q = b / vec2(2.0, 1.125);
      vec3 grit = readAt(tShore, q, laid).rgb;
      float fine = readAt(tShoreH, q, laid, 3.0).r;
      vec2 lean = vec2(readAt(tShoreH, q + vec2(0.0125, 0.0), laid, 3.0).r, readAt(tShoreH, q + vec2(0.0, 0.0222), laid, 3.0).r) - fine;
      vec2 t = vec2(b.x * 0.82 + b.y * 0.57, -b.x * 0.57 + b.y * 0.82);
      float stand = smoothstep(0.42, 0.9, readAt(tShoreH, t / vec2(6.4, 3.6) + 0.37, mat2(0.82 / 6.4, -0.57 / 3.6, 0.57 / 6.4, 0.82 / 3.6), 4.0).r);
      // Under the water they are lower than on the lip, where the wash has not laid them: fine gravel, and a cobble here and there.
      float tall = 0.03 * fine + 0.05 * stand * (0.6 + 0.8 * fine);
      // A stone taller than the water over it stands out of it, wet: the waterline goes in and out between the stones.
      stands = under * smoothstep(0.0, 0.006, tall - depth);
      stoneLean = -under * lean * ((0.03 + 0.04 * stand) / 0.025);
      // Grit lies in the shade of the stones round it.
      float hollow = 0.55 + 0.45 * smoothstep(0.1, 0.55, fine + 0.5 * stand);
      bare = mix(bare, grit * vec3(1.3, 1.36, 1.44) * mix(0.5, 0.85, stands) * hollow, under);
      depth -= under * min(tall, max(depth, 0.0));
    }
#endif
  }
  // Where the mats lie: patches drawn out toward the centre, thick round the lip, torn and thin toward the shore, with lanes of open
  // water that run in to the deep. Counted in metres round the lake and metres out, both bent by the ground, so no patch has a straight side.
  vec2 bend = vec2(vnoise(b / 37.0 + 1.3), vnoise(b / 37.0 + 8.1)) - 0.5;
  vec2 pq = vec2(a2 * 640.0 + bend.x * 26.0, r + bend.y * 60.0);
  float blobs = 0.6 * vnoise(b / 48.0) + 0.4 * vnoise(b / 13.0 + 3.0);
  // From the rim the mats have no lie: they are mottled, patch by patch, with dark wet channels between and small pale pools.
  // (Whatever is told by the way round is not worked out where the eye is wholly at the rim: it would be multiplied by nothing.)
  float rimEye = smoothstep(8.0, 40.0, cameraPosition.y);
  // (What only a low eye is told, and what only an eye at the rim is, is left out of the program of the frames that have no use for
  // it: EYE_RIM, see variantOf in index.ts. The renderer works out both sides of a branch for every pixel.)
  float drawn = 0.0;
#if EYE_RIM < 2
  drawn = 0.55 * vnoise(pq / vec2(38.0, 190.0)) + 0.3 * vnoise(pq / vec2(12.0, 70.0) + 3.0) + 0.15 * vnoise(pq / vec2(3.5, 24.0) + 7.0);
#endif
#if EYE_RIM > 0
  drawn = mix(drawn, 0.5 * vnoise(b / 44.0 + 2.0) + 0.3 * vnoise(b / 17.0 + 3.0) + 0.2 * vnoise(b / 6.5 + 7.0), rimEye);
#endif
  float field = 0.62 * drawn + 0.38 * blobs;
  float lanes = 0.0;
#if EYE_RIM < 2
  // A lane wanders with the bars of rock it runs between and is closed where the mats lie thick: drawn by the way round and the way out
  // alone it was a ruled grey strip from the lip to the shore.
  lanes = smoothstep(0.035, 0.008, abs(vnoise(vec2((pq.x + 11.0 * (barsAt - 0.5)) / 13.0, pq.y / 330.0) + 9.0) - 0.5)) * smoothstep(8.0, 50.0, w) * smoothstep(0.62, 0.4, blobs);
#endif
#if EYE_RIM > 0
  {
    float channels = smoothstep(0.045, 0.012, abs(0.6 * vnoise(b / 31.0 + 9.0) + 0.4 * vnoise(b / 11.0 + 4.0) - 0.5)) * smoothstep(8.0, 50.0, w);
    float pools = smoothstep(0.58, 0.76, 0.7 * vnoise(b / 19.0 + 31.0) + 0.3 * vnoise(b / 6.0 + 2.0));
    lanes = mix(lanes, max(0.7 * channels * smoothstep(0.35, 0.6, vnoise(b / 57.0 + 13.0)), pools), rimEye);
  }
#endif
  float toLip = smoothstep(MAT_REACH + uLipIn, 30.0, w);
  float thin = smoothstep(4.0, 46.0, inShore + 30.0 * (blobs - 0.5)) * (1.0 - 0.8 * slabs * (1.0 - crust));
  // And they lie thick toward the pool and thin away to bare grey silt at the shore.
  thin = mix(thin, smoothstep(8.0, 60.0, inShore + 44.0 * (blobs - 0.5)), rimEye);
  float edge = mix(0.53, 0.35, toLip) - 0.13 * smoothstep(8.0, 40.0, cameraPosition.y);
  float cover = smoothstep(edge - 0.02, edge + 0.07, field) * thin * (1.0 - 0.92 * lanes);
  // Toward the lip the weed thins to loose strands over the pale crust.
  // An eye that stands on the lip sees them run over the whole of it to the edge.
  float onFoot = smoothstep(12.0, 4.0, cameraPosition.y);
  cover *= mix(mix(0.3, 0.5, onFoot), 1.0, smoothstep(1.0, 20.0, wLip + 14.0 * (blobs - 0.5)));
  // The crust of the lip keeps a strand here and there.
  cover = max(cover, mix(0.8, 1.0, onFoot) * thin * smoothstep(mix(0.42, 0.4, onFoot), mix(0.56, 0.54, onFoot), field) * smoothstep(9.0, 3.0, wLip) * smoothstep(-0.6, 0.6, wLip));
  o.albedo = bare;
  o.tilt = (snh.xy * 2.0 - 1.0) * 0.5 + stoneLean;
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
    float px = gCovers;
    mat2 ma = mat2(0.951, -0.309, 0.309, 0.951) / MAT_A;
    mat2 mb = mat2(0.999, 0.035, -0.035, 0.999) / MAT_B;
    // Further off than a strand can be told, the picture of the mats is not read at all: the patch has its tone and that is the whole of it.
    float mh = 0.5;
    vec3 near3 = vec3(0.27, 0.125, 0.035);
    if (px < 0.25) {
      // A slow sway, toward the centre and back: each tuft in its own time.
      vec2 sway = (b / max(r, 1.0)) * (0.022 * sin(uTime * 0.9 + 6.28 * vnoise(b / 2.3)) + 0.008 * sin(uTime * 2.1 + 6.28 * vnoise(b / 0.5 + 4.0)));
      vec2 qa = vec2(b.x * 0.951 + b.y * 0.309, -b.x * 0.309 + b.y * 0.951) / MAT_A + sway / MAT_A;
      vec2 qb = vec2(b.x * 0.999 - b.y * 0.035, b.x * 0.035 + b.y * 0.999) / MAT_B + 0.37 + sway * 1.4 / MAT_B;
      float ha = readAt(tMatH, qa, ma).r;
      float hb = readAt(tMatH, qb, mb).r;
      // The picture turns over at each repeat, and along a line where it turns it is its own mirror image: a slab that lies on the line
      // has its twin across it. Each of the two layings is let go as it nears its own lines, and the other, whose lines lie elsewhere,
      // has the bed there.
      vec2 ta = 0.5 - abs(fract(qa) - 0.5);
      vec2 tb = 0.5 - abs(fract(qb) - 0.5);
      float clearA = smoothstep(0.0, 0.1, min(ta.x, ta.y));
      float clearB = smoothstep(0.0, 0.1, min(tb.x, tb.y));
      float pick = smoothstep(-0.12, 0.12, hb - ha + 0.5 * (vnoise(b / 3.7 + 21.0) - 0.5) + 1.2 * (clearB - clearA));
      // Closer than the picture is fine it is let go soft, and the finer tile of the same weed lies over it as hair: every tuft is made of strands.
      float fine = smoothstep(0.012, 0.004, px);
      near3 = mix(readAt(tMat, qa, ma, 1.2 * fine).rgb, readAt(tMat, qb, mb, 1.2 * fine).rgb, pick);
      mh = mix(ha, hb, pick);
      // The mat is not one sheet. Under the strands that lie in the surface there is a second bed of them a hand down, with its own
      // pale rock: it is seen in the gaps of the first, soft and rust with the water over it, and it slides under the first as the eye moves.
      {
        mat2 mc = mat2(0.829, 0.559, -0.559, 0.829) / (MAT_B * 0.73);
        vec2 qc = mc * (b + gSlide * 0.11 + sway * 0.5) + 0.21;
        vec3 low3 = readAt(tMat, qc, mc, 1.0).rgb;
        float gap = smoothstep(0.55, 0.22, mh);
        near3 = mix(near3, low3 * vec3(0.66, 0.45, 0.28), 0.85 * gap);
      }
      if (fine > 0.0) {
        vec3 tile = readAt(tMatTile, vec2(qa.y, qa.x) * (MAT_A / 2.6) + sway * 0.4, mat2(-0.309, 0.951, 0.951, 0.309) / 2.6).rgb;
        float hair = smoothstep(0.06, 0.3, dot(tile, vec3(0.4, 0.5, 0.1)));
        // The hair lies on the weed, not on the bare slab.
        float weedy = fine * smoothstep(0.75, 0.5, mh) * 0.85;
        near3 = mix(near3, mix(near3 * 0.75, tile * 1.3, hair), weedy);
        mh += weedy * 0.2 * (hair - 0.45);
      }
    }
    // Rust in one bed, gold in the next; gold in the heart of a patch, rust at its torn edge.
    float bunch = vnoise(b / 6.0);
    float tone = 0.2 * bunch;
#if EYE_RIM < 2
    tone += (1.0 - rimEye) * (0.5 * vnoise(pq / vec2(9.0, 110.0) + 5.0) + 0.3 * vnoise(pq / vec2(2.6, 40.0)));
#endif
#if EYE_RIM > 0
    tone += rimEye * (0.5 * vnoise(b / 27.0 + 5.0) + 0.3 * vnoise(b / 9.0));
#endif
    float heart = smoothstep(edge, edge + 0.28, field);
    vec3 far3 = mix(vec3(0.17, 0.06, 0.02), vec3(0.31, 0.14, 0.035), smoothstep(0.3, 0.55, tone));
    far3 = mix(far3, vec3(0.46, 0.29, 0.065), smoothstep(0.5, 0.75, tone) * (0.35 + 0.65 * heart));
    // Toward the lip the amber goes to brown and then to the dark of the deep.
    far3 *= mix(vec3(0.5, 0.42, 0.38), vec3(1.0), smoothstep(4.0, 60.0, w));
    // Far off no strand is told: the patch has its own tone and the streaks of its lie.
    float told = smoothstep(0.25, 0.03, px);
    float fromRim = smoothstep(8.0, 40.0, cameraPosition.y);
    float combed = 0.5;
    float threads = 0.0;
#if EYE_RIM > 0
    {
      // From the rim the mats are flats: matte beds of weed and mineral in patches of every size, mottled, with dark wet threads of open
      // water that wander and fork between them and small pale islands of crust. The picture of them gives a patch its mottle, its
      // threads and its islands; the hue of a patch is its own (far3), by where it lies.
      vec3 flat3 = flatsAt(b);
      float fl = dot(flat3, vec3(0.3, 0.5, 0.2));
      threads = smoothstep(0.12, 0.06, fl);
      float isle = smoothstep(0.3, 0.55, flat3.b / max(flat3.r, 1e-3)) * smoothstep(0.2, 0.4, fl);
      // How thick the weed lies: its bright beds stand in the surface, its dark seams are under it.
      combed = clamp((fl - 0.06) / 0.2, 0.0, 1.0);
      // The same picture a quarter the size gives a bed its grain, as far as the frame can hold it.
      mat2 mf = mat2(0.469, 0.883 / FLAT_SHAPE, -0.883, 0.469 / FLAT_SHAPE) / 43.0;
      float grain = dot(readAt(tFlat, mf * b + 0.37, mf).rgb, vec3(0.3, 0.5, 0.2)) / 0.17;
      vec3 mottle = flat3 / vec3(0.354, 0.124, 0.0314) * mix(1.0, clamp(grain, 0.4, 2.2), 0.55);
      mottle = pow(mix(vec3(dot(mottle, vec3(0.3333))), mottle, 0.5), vec3(0.65));
      vec3 flats = mix(far3 * mottle * vec3(1.3, 1.45, 1.7), mix(vec3(fl), flat3, 0.45) * vec3(1.0, 1.0, 1.05), isle);
      far3 = mix(far3, flats, fromRim);
    }
#endif
    // The streaks of the far patch are not worked out where every strand is told.
    float streaks = 0.5;
    if (told < 1.0) {
      streaks = 0.0;
#if EYE_RIM < 2
      streaks += (1.0 - rimEye) * vnoise(pq / vec2(1.3, 19.0) + 2.0);
#endif
#if EYE_RIM > 0
      streaks += rimEye * vnoise(b / 3.1 + 2.0);
#endif
    }
    vec3 weed = mix(far3 * (0.75 + 0.5 * streaks), near3 * mix(vec3(1.0), far3 / vec3(0.27, 0.125, 0.035), 0.45), told);
    // The weed is not of one dye: rust in most bunches, olive in one and ochre in another, as far as a bunch can be told from the next.
    float dyed = smoothstep(1.6, 0.4, px);
    float inIt = dot(weed, vec3(0.3, 0.6, 0.1));
    weed = mix(weed, inIt * vec3(1.12, 1.06, 0.28), 0.55 * dyed * smoothstep(0.6, 0.8, bunch));
    weed = mix(weed, inIt * vec3(1.86, 1.2, 0.26), 0.4 * dyed * smoothstep(0.4, 0.2, bunch));
    float high = mix(mix(0.5, combed, fromRim), mh, told);
    // The strands that stand highest are the palest: gold where the low sun finds them.
    weed *= mix(vec3(1.0), vec3(1.5, 1.38, 0.95), told * smoothstep(0.42, 0.85, mh));
    // Near enough to tell strand from strand they are amber and rust, not the tan of the patch seen whole.
    // The slabs among them are limestone: pale, hardly dyed.
    float slabby = told * smoothstep(0.68, 0.84, mh);
    weed = max(mix(vec3(dot(weed, vec3(0.3, 0.6, 0.1))), weed, 1.0 + 0.28 * smoothstep(0.03, 0.006, px) * (1.0 - slabby)), 0.0) * mix(vec3(1.0), vec3(0.93, 1.07, 0.9), smoothstep(0.03, 0.006, px) * (1.0 - slabby));
    // Rust is the dye of the deep strands; no bunch near the eye is red through and through.
    weed.g = max(weed.g, weed.r * 0.56 * smoothstep(0.03, 0.006, px));
    weed = mix(weed, dot(weed, vec3(0.3, 0.6, 0.1)) * vec3(1.0, 0.97, 0.9), 0.7 * slabby);
    // At the torn edge of a patch only the strands that stand highest are left: wisps, not a line.
    float lies = smoothstep(0.0, 0.22, cover * 1.25 - (1.0 - high) * 0.7 * told * smoothstep(0.95, 0.5, cover) - 0.12 * (1.0 - told));
    // From the rim it is the picture of the flats that says where the weed is: its channels are open water even in the thick of a bed.
    lies = mix(lies, smoothstep(0.0, 0.2, cover * 1.15 - (1.0 - combed) * 0.6) * (1.0 - 0.8 * threads), fromRim * (1.0 - told));
    o.albedo = mix(bare, weed, lies);
    // Its relief says what lies where: the strands that stand highest lie in the surface, the gaps between are a hand deeper.
    float up = (high - 0.62) * 0.34;
    // Where a slab or a tuft comes out of the water it is ringed dark and wet at the waterline.
    o.albedo *= 1.0 - 0.45 * told * lies * smoothstep(0.02, 0.004, abs(up - 0.006));
    o.depth = mix(depth, max(-up, 0.0) + 0.015, lies);
    // From far off and low, the tops of the mats that lie in the surface take the mirror from the water.
    float afloat = mix(0.2, mix(0.08, 0.95, smoothstep(6.0, 30.0, cameraPosition.y)), smoothstep(0.03, 0.4, px)) * smoothstep(0.3, 0.6, high);
    // Seen whole from the rim, a bed that lies in the surface is wet weed and no mirror, whatever the size of the picture.
    afloat = mix(afloat, 0.8 + 0.15 * smoothstep(0.15, 0.6, combed), fromRim);
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
    vec3 lp = lipPlateRead(tLipPlate, q, lip).rgb;
    float lh = lipPlateRead(tLipPlateH, q, lip).r;
    vec2 e = vec2(0.004, 0.0);
    vec2 g = 2.0 * vec2(lipPlateRead(tLipPlateH, q + e.xy, lip).r - lh, lipPlateRead(tLipPlateH, q + e.yx, lip).r - lh);
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

// The wall of the shaft, seen down through the water from over it: pale rock that falls away, green with the water.
// fell: how fast the wall falls for a metre out from the lip here, across and up the frame (told at the top of the branch that calls this, from gFx and gFy).
Bed wallAt(vec2 b, float down, float inside, vec2 fell) {
  Bed o;
#if EYE_EDGE || EYE_LEAVE
  // From beside the edge the wall is rock under the eye, a few metres off: broken pale stone that falls away in ledges, seen from over it.
  // The Builder's picture of the wall is a face seen from in front; laid down under the eye its beds are the lines of a map and its shading
  // is a hanging cloth. So here it is the pale stone of the shelf itself, seen from above as the eye sees it, that goes down into the water.
#if EYE_EDGE
  // Beside the edge it is a face: the stone is laid on it by its length round the lip and its depth, and it is ribbed down its fall.
  vec2 face = vec2(atan(b.x, b.y) * 480.0, down);
  vec3 c = readAt(tSinter, face / 4.1 + 0.3, mat2(1.0 / 4.1)).rgb;
  float great = dot(readAt(tSinter, face / 13.0 + 0.6, mat2(1.0 / 13.0)).rgb, vec3(0.33));
  o.albedo = clamp(c * 1.45, 0.0, 0.95) * vec3(0.9, 0.95, 0.94) * (0.55 + 0.6 * vnoise(vec2(face.x / 2.3, down / 11.0 + 3.0)) + 0.25 * (vnoise(vec2(face.x / 0.7 + 11.0, down / 4.0)) - 0.5));
#else
  vec3 c = readAt(tSinter, b / 4.1 + 0.3, mat2(1.0 / 4.1)).rgb;
  float great = dot(readAt(tSinter, b / 13.0 + 0.6, mat2(1.0 / 13.0)).rgb, vec3(0.33));
  o.albedo = clamp(c * 1.45, 0.0, 0.95) * vec3(0.9, 0.95, 0.94);
#endif
  float ledge = (0.35 + 0.65 * smoothstep(0.25, 0.6, great)) * (0.6 + 0.4 * smoothstep(0.1, 0.45, dot(c, vec3(0.33))));
  // Ledge under ledge it turns to a wall that the sky overhead no longer lights: past a few metres down only its highest ledges are seen.
#if EYE_LEAVE
  ledge *= 1.0 - smoothstep(3.5, 17.0, down - 5.0 * great);
#else
  ledge *= 1.0 - smoothstep(5.0, 30.0, down - 3.0 * great);
  // The weed of the lip hangs over its edge into the water: strands a hand wide and a metre or two long, each of its own length.
  float alongLip = atan(b.x, b.y) * 480.0;
  float strand = vnoise(vec2(alongLip / 0.22, down / 3.5 + 2.0));
  float hangs = smoothstep(0.52, 0.7, strand + 0.25 * (vnoise(vec2(alongLip / 1.9 + 5.0, 0.5)) - 0.5)) * smoothstep(1.5 + 4.5 * vnoise(vec2(alongLip / 0.6, 7.0)), 0.2, down);
  o.albedo = mix(o.albedo, vec3(0.3, 0.14, 0.04), 0.85 * hangs);
  ledge = mix(ledge, 0.8, hangs);
#endif
#else
  float along = atan(b.x, b.y) * 480.0;
  // The Builder's picture of the wall, thirty metres of it by seventeen, its top at the lip. From over it its beds would lie as lines round
  // the lip, level under level, like the lines of a map: so it is read coarse, for its colour and its great ledges alone.
  float jog = down < 17.0 ? smoothstep(0.3, 2.5, down) * 1.6 * (vnoise(b / 7.3 + 2.0) - 0.5) : 0.0;
  vec2 uv = vec2(along / 19.0, 1.0 - clamp((down + jog) / 17.0, 0.02, 0.98));
  // The way round begins again in the north: the fineness of the picture is told from the ground, which has no such place, so no line is drawn there.
  float r2 = max(dot(b, b), 1.0);
  vec2 size = vec2(textureSize(tWall, 0));
  vec3 c = textureLod(tWall, uv, levelOf(vec2(480.0 / 19.0 * (b.y * gFx.x - b.x * gFx.y) / r2, fell.x / 17.0) * size, vec2(480.0 / 19.0 * (b.y * gFy.x - b.x * gFy.y) / r2, fell.y / 17.0) * size) + 2.585).rgb;
  // What the eye follows on a steep wall is its fall: ribs and gullies that run down it from the lip, each of its own width, broken into blocks.
  float rib = vnoise(vec2(along / 2.3, down / 11.0 + 3.0));
  float fine = vnoise(vec2(along / 0.7 + 11.0, down / 4.0));
  float block = vnoise(vec2(along / 5.1 + 7.0, down / 1.9));
  float fall = 0.62 + 0.5 * rib + 0.22 * (fine - 0.5) + 0.2 * (block - 0.5);
  float ledge = (0.6 + 0.4 * smoothstep(0.05, 0.3, dot(c, vec3(0.33)))) * mix(1.0, smoothstep(0.2, 0.55, rib + 0.3 * (fine - 0.5)), 0.5);
  o.albedo = clamp(c * 1.3 * fall, 0.0, 0.95) * vec3(0.62, 0.86, 0.9);
#endif
  o.occ = ledge;
  o.tilt = vec2(0.0);
  o.glow = 0.0;
  o.dry = 0.0;
  o.depth = down;
  return o;
}`;
