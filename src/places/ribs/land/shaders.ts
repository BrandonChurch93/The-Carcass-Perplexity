// The surfaces of the land. Each takes its light from the rig and ends in rigOut.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { loopText } from '../shared/looptext';

export const UV_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying float vShade;
attribute float aShade;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  vShade = aShade;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// A slope read from a data picture (x, y) laid on a surface along its u and v.
const BUMP_GLSL = /* glsl */ `
// The level of a picture to read for a pixel whose foot on it is (dx, dy): by the long side of the foot, cut to most times the short
// one. Read so, a picture costs the software renderer a seventh of what a read by its two slopes costs, and it does not smear at a slant.
float footLevel(sampler2D t, vec2 dx, vec2 dy, float most) {
  vec2 size = vec2(textureSize(t, 0));
  float lx = length(dx * size);
  float ly = length(dy * size);
  return log2(max(min(max(lx, ly), most * min(lx, ly)), 1e-6));
}
vec3 bump(vec3 n, vec3 p, vec2 uv, vec2 g) {
  vec3 dp1 = dFdx(p);
  vec3 dp2 = dFdy(p);
  vec2 du1 = dFdx(uv);
  vec2 du2 = dFdy(uv);
  vec3 dp2perp = cross(dp2, n);
  vec3 dp1perp = cross(n, dp1);
  vec3 t = dp2perp * du1.x + dp1perp * du2.x;
  vec3 b = dp2perp * du1.y + dp1perp * du2.y;
  float inv = inversesqrt(max(max(dot(t, t), dot(b, b)), 1e-12));
  return normalize(n + (t * g.x - b * g.y) * inv);
}
// The same with the slopes of the place and of the picture handed in: for use inside a branch, where no slope may be taken.
vec3 bumpD(vec3 n, vec3 dp1, vec3 dp2, vec2 du1, vec2 du2, vec2 g) {
  vec3 dp2perp = cross(dp2, n);
  vec3 dp1perp = cross(n, dp1);
  vec3 t = dp2perp * du1.x + dp1perp * du2.x;
  vec3 b = dp2perp * du1.y + dp1perp * du2.y;
  float inv = inversesqrt(max(max(dot(t, t), dot(b, b)), 1e-12));
  return normalize(n + (t * g.x - b * g.y) * inv);
}`;

const HEAD = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
${RIG_GLSL}
${NOISE_GLSL}
${BUMP_GLSL}`;

export const ROCK_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vBlade;
varying vec3 vNb;
varying vec2 vLay;
varying float vShade;
attribute float aShade;
attribute vec4 aBlade;
attribute vec3 aNb;
uniform sampler2D tWideN;
uniform float uFin;
uniform float uLift;
void main() {
  vLay = uv;
  // The ledges and flutes of the fin's sheet stand out of the blade itself: its edge against the sky is notched by them.
  float proud = 0.35 * (textureLod(tWideN, vec2(uv.x, 0.215 + 0.78 * uv.y), 3.0).z - 0.5);
  vec4 w = modelMatrix * vec4(position + normal * (proud * uLift * uFin), 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vBlade = aBlade;
  vNb = aNb;
  vShade = aShade;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// The stone of the blades, laid by the blade's own space on three axes (along its spine, across it, through it), so that it is drawn out
// on no face and its grooves run the length of the blade. Pale bone-stone above the weed line, rust lichen where a face sees the sky and
// the sun, white runs under the roosts, damp stains, a black wet band at the line. uTier > 0 is the colony's coursed rock.
export const ROCK_FRAGMENT = /* glsl */ `
${HEAD}
varying vec4 vBlade;
varying vec3 vNb;
varying vec2 vLay;
varying float vShade;
uniform sampler2D tRock;
uniform sampler2D tRockN;
// The wide laying: on a blade the whole fin's sheet, laid once by (part across, part along); elsewhere the stone again, four times the size.
uniform sampler2D tWide;
uniform sampler2D tWideN;
uniform float uFin;
uniform sampler2D tWeed;
uniform float uTide;
uniform float uTier;
// Metres of one repeat of the stone picture, and of the wide one laid under it.
uniform vec2 uGrain;
uniform vec3 uRockTint;
void main() {
  vec3 n0 = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 w = abs(normalize(vNb));
  // A ledge is narrow: its top and its riser are told apart by the face itself, not by the rounded normal between them.
  vec3 ng = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  ng *= sign(dot(ng, v) + 1e-6);
  float tier = step(0.5, uTier);
  w = mix(w, vec3(abs(ng.y), 0.0, length(ng.xz)), tier);
  n0 = normalize(mix(n0, ng, 0.3 * tier));
  w = w * w;
  w = w * w;
  // The broad face is laid by (across, along); the second plane is the edge (through, along) or a ledge's top (across, through).
  float top = step(w.y, w.x);
  vec2 uvA = vBlade.yx;
  vec2 uvB = mix(vBlade.zx, vBlade.yz, top);
  float kB = max(w.x, w.y) / (w.z + max(w.x, w.y));
  kB = smoothstep(0.25, 0.75, kB);
  vec2 a1 = uvA / uGrain.x;
  vec2 b1 = uvB / uGrain.x + 0.37;
  vec2 gax = dFdx(vBlade.yx) / uGrain.x;
  vec2 gay = dFdy(vBlade.yx) / uGrain.x;
  vec2 gbx = mix(dFdx(vBlade.zx), dFdx(vBlade.yz), top) / uGrain.x;
  vec2 gby = mix(dFdy(vBlade.zx), dFdy(vBlade.yz), top) / uGrain.x;
  // A ledge's top seen along itself: the picture is taken softer there, or it stands as a row of bars.
  float skim = mix(1.0, clamp(0.35 / max(abs(dot(n0, v)), 0.004), 1.0, 80.0), top * step(0.5, uTier));
  gbx *= skim;
  gby *= skim;
  // Only the plane that shows is read: a broad face reads one, an edge the other, the turn between them both.
  vec3 detA = vec3(0.0);
  vec3 nhA = vec3(0.5);
  vec3 detB = vec3(0.0);
  vec3 nhB = vec3(0.5);
  if (kB < 0.999) {
    detA = textureLod(tRock, a1, footLevel(tRock, gax, gay, 2.0)).rgb;
    nhA = textureLod(tRockN, a1, footLevel(tRockN, gax, gay, 2.0)).rgb;
  }
  if (kB > 0.001) {
    detB = textureLod(tRock, b1, footLevel(tRock, gbx, gby, 2.0)).rgb;
    nhB = textureLod(tRockN, b1, footLevel(tRockN, gbx, gby, 2.0)).rgb;
  }
  // The wide laying, sheared so that its grooves do not line up with the small one's.
  vec2 uvW = mix(uvA, uvB, step(0.5, kB));
  vec2 a2 = vec2(uvW.x + 0.17 * uvW.y, uvW.y) / uGrain.y + 0.61;
  float sc = uGrain.x / uGrain.y;
  // The fin's sheet stands above its own weed: the film's weed and tide line are drawn here, not taken from it.
  vec2 lay = vec2(vLay.x, 0.215 + 0.78 * vLay.y);
  vec2 wx = mix(mix(gax, gbx, step(0.5, kB)) * sc, dFdx(lay), uFin);
  vec2 wy = mix(mix(gay, gby, step(0.5, kB)) * sc, dFdy(lay), uFin);
  a2 = mix(a2, lay, uFin);
  vec3 big = textureLod(tWide, a2, footLevel(tWide, wx, wy, 2.0)).rgb;
  vec3 nhW = textureLod(tWideN, a2, footLevel(tWideN, wx, wy, 2.0)).rgb;
  vec3 det = mix(detA, detB, kB);
  vec3 nh = mix(nhA, nhB, kB);
  // A blade is smooth bone: the grain of the sheet's heights is not its shade.
  nh.z = mix(nh.z, 0.45, 0.85 * uFin);
  // The colony's sheet is mirrored where it meets itself: its slopes turn with it.
  vec2 mA = mix(vec2(1.0), 1.0 - 2.0 * mod(floor(a1), 2.0), step(0.5, uTier));
  vec2 mB = mix(vec2(1.0), 1.0 - 2.0 * mod(floor(b1), 2.0), step(0.5, uTier));
  float sheet = mix(mix(1.3, 0.12, uFin), 0.45, step(0.5, uTier));
  vec3 nA = bump(n0, vWorld, a1, (nhA.xy - 0.5) * mA * sheet);
  vec3 nB = bump(n0, vWorld, b1, (nhB.xy - 0.5) * mB * sheet);
  vec3 n = normalize(mix(nA, nB, kB));
  n = normalize(n + (bump(n0, vWorld, a2, (nhW.xy - 0.5) * mix(1.8, 0.15, uFin)) - n0));
  float lum = dot(big, vec3(0.333));
  float macro = vnoise(vBlade.yx * vec2(0.021, 0.008)) * 0.6 + vnoise(vBlade.yx * vec2(0.06, 0.027) + 5.0) * 0.4;
  vec3 albedo = mix(det * mix(vec3(1.0), big / 0.26, 0.4) * (0.85 + 0.4 * macro), mix(vec3(0.5, 0.495, 0.485), big, 0.06) * mix(vec3(1.0), det / 0.265, 0.25) * (0.92 + 0.16 * macro), uFin);
  // Pale stone: ivory more than brown, the warmth left to the lichen.
  albedo = mix(vec3(dot(albedo, vec3(0.333))), albedo, mix(0.5, 0.3, uFin)) * uRockTint * mix(vec3(1.0), vec3(0.92, 1.0, 1.1), uFin);
  // Beds that run the length of the blade: the soft ones worn back, grey and damp.
  float beds = vnoise(vec2(vBlade.y * 0.21 + 0.7 * macro, vBlade.x * 0.012)) * 0.6 + vnoise(vec2(vBlade.y * 0.74, vBlade.x * 0.03 + 3.0)) * 0.4;
  float soft = smoothstep(0.56, 0.4, beds) * (1.0 - kB);
  // A blade is smooth bone: it has no beds.
  albedo *= 1.0 - 0.2 * soft * (1.0 - uFin);
  // The hollows of the wide laying hold the dark and the damp.
  float hollow = smoothstep(0.55, 0.2, nhW.z);
  albedo *= 1.0 - mix(0.22, 0.04, uFin) * hollow;
  float y = vWorld.y;
  float tide = uTide - 4.0 + 7.0 * (vnoise(vWorld.xz / 13.0) - 0.5) + 3.0 * (vnoise(vWorld.xz / 2.7) - 0.5) + 3.0 * (nh.z - 0.5);
  float weed = smoothstep(tide + 0.5, tide - 0.5, y);
  float band = smoothstep(tide + 5.0, tide + 0.5, y);
  float damp = smoothstep(tide + 40.0 + 30.0 * (macro - 0.5), tide + 2.0, y);
  // The run of water and of white down a face: by the level way across it and the height, whichever plane it is laid on.
  vec2 fall = vec2(mix(vBlade.w, vBlade.z, kB * (1.0 - top)), y);
  // On rock that is no blade a run of water is a few strides long and wanders: runs the height of the rock, side by side, are a picture drawn out.
  float plain = (1.0 - uFin) * (1.0 - step(0.5, uTier));
  vec2 fall0 = fall;
  fall = vec2(fall.x + plain * 1.6 * (vnoise(vec2(fall.x * 0.21, y * 0.19)) - 0.5), y * mix(1.0, 4.5, plain));
  float stain = smoothstep(0.42, 0.7, vnoise(fall * vec2(0.23, 0.021)) * 0.6 + vnoise(fall * vec2(0.9, 0.06) + 7.0) * 0.4);
  stain *= 1.0 - 0.6 * plain * smoothstep(0.35, 0.65, vnoise(vWorld.xz * 0.07 + y * 0.05 + 3.0));
  // Dark water streaks run down a blade by the fall line, thin and long.
  // A few, broad and broken, in the places where the water gathers: never an even hatch over the face.
  float streak = smoothstep(0.5, 0.78, vnoise(fall * vec2(0.3, 0.008) + 23.0) * 0.7 + vnoise(fall * vec2(0.085, 0.004) + 5.0) * 0.3) * smoothstep(0.42, 0.62, vnoise(fall * vec2(0.021, 0.013) + 40.0)) * uFin;
  albedo *= mix(vec3(1.0), vec3(0.6, 0.62, 0.6), max(stain * 0.7, 0.5 * streak) * (1.0 - step(0.5, uTier)));
  float roost = vnoise(fall0 * vec2(0.031, 0.045) + 2.0) * 0.65 + vnoise(fall0 * vec2(0.11, 0.13)) * 0.35;
  float run = vnoise(fall * vec2(1.3, 0.05) + 11.0) * 0.6 + vnoise(fall * vec2(4.1, 0.16)) * 0.4;
  // On a blade the runs are wide and few: a fine one over the whole face is a hatch.
  run = mix(run, vnoise(fall * vec2(0.37, 0.016) + 11.0) * 0.65 + vnoise(fall * vec2(0.11, 0.006)) * 0.35, uFin);
  // Fine upright fractures and runs of water down a blade's face.
  float white = smoothstep(0.45, 0.75, run * (0.35 + 1.1 * roost) + 0.25 * (nh.z - 0.5)) * smoothstep(0.3, 0.55, roost);
  white = max(white, 0.8 * smoothstep(0.55, 0.9, n0.y) * smoothstep(0.3, 0.6, roost + 0.3 * (nh.z - 0.5)));
  white *= (1.0 - band) * smoothstep(tide + 4.0, tide + 30.0, y);
  // Rust lichen: in fields the size of a house, broken at the size of a hand, on what leans to the sky and the sun, never in the wet.
  float sunny = 0.5 + 0.5 * dot(n0, uSunDir);
  float field = vnoise(vWorld.xz * 0.019 + vWorld.y * 0.023 + 9.0) * 0.55 + vnoise(vBlade.yx * 0.09) * 0.3 + vnoise(vBlade.yx * 0.47) * 0.15;
  // On a blade it runs down in streaks from under the overhangs.
  float lichen = smoothstep(0.6, 0.7, field + uFin * (0.0 + 0.12 * (run - 0.5) + 0.2 * (n0.y - 0.2) + 0.12 * (sunny - 0.5)) + 0.3 * (nh.z - 0.5) + 0.28 * n0.y + 0.22 * (sunny - 0.5) - 0.25 * hollow) * (1.0 - band) * (1.0 - 0.8 * stain);
  if (uTier > 0.0) {
    // The colony's rock: dark wet grey, coursed; the white hangs from the edge of each ledge and the lichen lies in patches.
    // One sheet of a real stepped cliff, 40 m by 40 m: its own white and its own lichen; a little more of each is laid over it.
    // The coursed tile is laid small over it for what the lens sees at arm's length.
    albedo = det * mix(vec3(1.0), big / vec3(0.229, 0.21, 0.178), 0.35) * (0.9 + 0.2 * macro) * uRockTint;
    // Pale grey rock: the sheet gives its marks, not its darkness.
    float mark = dot(albedo, vec3(0.333));
    albedo = mix(albedo, vec3(0.4, 0.4, 0.39) * (0.45 + 0.55 * smoothstep(0.0, 0.5, mark)), 0.6);
    damp *= 0.3;
    // White runs hang down the cliff from where the colony stands; the ledges themselves are white.
    float runs = smoothstep(0.5, 0.72, run * (0.5 + roost) + 0.2 * (nhW.z - 0.5)) * (1.0 - smoothstep(0.3, 0.8, n0.y));
    white = max(0.6 * runs, 0.8 * smoothstep(0.5, 0.9, n0.y) * smoothstep(0.3, 0.55, roost + 0.3 * (nhW.z - 0.5))) * (1.0 - band);
    float crust = smoothstep(0.3, 0.6, vnoise(vec2(vBlade.y, vWorld.y) * 0.7) * 0.6 + vnoise(vec2(vBlade.y, vWorld.y) * 2.3) * 0.4);
    albedo = mix(albedo, vec3(0.6, 0.31, 0.07) * (0.6 + 0.8 * nhW.z), 0.6 * lichen * crust * (1.0 - 0.7 * white));
    albedo = mix(albedo, vec3(0.8, 0.79, 0.75) * (0.75 + 0.5 * nhW.z), 0.6 * white);
  } else {
    albedo = mix(albedo, vec3(0.62, 0.34, 0.09) * (0.5 + 1.6 * det.r), 0.75 * lichen * (1.0 - 0.25 * uFin));
    albedo = mix(albedo, vec3(0.8, 0.79, 0.76) * (0.6 + 1.3 * det.g), 0.6 * white);
  }
  albedo *= mix(1.0, 0.42, damp) * mix(1.0, 0.14, band);
  vec3 wc = texture2D(tWeed, fall0 / 7.0).rgb;
  albedo = mix(albedo, wc * 0.9, weed);
  float rough = mix(0.92, 0.45, max(weed, band));
  float occ = (0.45 + 0.55 * smoothstep(0.2, 0.6, nh.z)) * (mix(0.55, 0.72, uFin) + mix(0.45, 0.28, uFin) * smoothstep(0.25, 0.6, nhW.z)) * mix(1.0, 0.45, weed) * vShade * (1.0 - 0.3 * soft * (1.0 - uFin));
  occ = mix(occ, 0.5 + 0.5 * occ, step(0.5, uTier));
  // What hangs over is dark: the under side of a leaning blade sees the wet floor, not the sky.
  occ *= mix(0.45, 0.64, uFin) + mix(0.55, 0.36, uFin) * smoothstep(-0.55, 0.25, n0.y);
  vec3 lit = rigShade(vWorld, n, v, albedo, rough, occ);
  // Against the light the edge of the stone burns: the sun grazes round the rough rim toward the lens.
  float edge = 1.0 - max(dot(n, v), 0.0);
  float back = max(dot(-v, uSunDir), 0.0);
  lit += albedo * uSunColour * (0.3 * edge * edge * edge * back * back * sunAt(vWorld, landAt(vWorld.xz)) * occ);
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;

// The colony's crag. Its rock is one generated sheet of thin level beds broken by upright joints (land/strata.jpg, with its slopes),
// laid on each face by the level way across it and the height, and on each top by the floor's plan, at two sizes, so that a texel is
// about a pixel where the lens stands by it and nothing is drawn out. Lichen is a second sheet (land/lichen.jpg): its crusts are the
// patches' own shapes. White lies on the tops and hangs in short strings from the lips of the ledges. What hangs over is never black.
export const COLONY_FRAGMENT = /* glsl */ `
${HEAD}
varying vec4 vBlade;
varying vec3 vNb;
varying vec2 vLay;
varying float vShade;
uniform sampler2D tStrata;
uniform sampler2D tStrataN;
uniform sampler2D tLichen;
uniform sampler2D tWeed;
uniform float uTide;
uniform float uKelp;
uniform float uStrataMean;
// The bedded stone at one place of a face: its colour over the sheet's mean, its slopes (along the face, up it) and its height.
vec3 bedded(vec2 at, float foot, out vec2 slopes, out float hgt) {
  const float FINE = 6.4;
  const float WIDE = 23.0;
  vec2 uf = at / vec2(FINE, FINE * 0.5625);
  // Each course of the sheet is shifted along from the one under it: the seam between two courses is a bed, and no joint runs up the crag.
  uf.x += 0.37 * floor(uf.y);
  vec2 uw = at / vec2(WIDE, WIDE * 0.5625) + vec2(0.37, 0.61);
  uw.x += 0.41 * floor(uw.y);
  float lf = log2(max(foot * 1536.0 / FINE, 1e-6));
  float lw = log2(max(foot * 1536.0 / WIDE, 1e-6));
  vec3 cf = textureLod(tStrata, uf, lf).rgb;
  vec3 df = textureLod(tStrataN, uf, lf).rgb;
  vec3 cw = textureLod(tStrata, uw, lw).rgb;
  vec3 dw = textureLod(tStrataN, uw, lw).rgb;
  slopes = (df.xy - 0.5) * 1.5 + (dw.xy - 0.5) * 1.1;
  hgt = mix(dw.z, df.z, 0.5);
  return (cf / uStrataMean) * (0.4 + 0.6 * dot(cw, vec3(0.333)) / uStrataMean);
}
void main() {
  vec3 n0 = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  // A ledge is narrow: its top and its riser are told apart by the face itself, not by the rounded normal between them.
  vec3 ng = normalize(cross(dFdx(vWorld), dFdy(vWorld)) + vec3(0.0, 1e-9, 0.0));
  ng *= sign(dot(ng, v) + 1e-6);
  vec3 nf = normalize(mix(n0, ng, 0.5) + vec3(0.0, 1e-6, 0.0));
  float foot = max(length(dFdx(vWorld)), length(dFdy(vWorld)));
  float y = vWorld.y;
  float top = smoothstep(0.45, 0.8, nf.y);
  // A face is laid by the level way across it: by z where it looks along x, by x where it looks along z, so that no wall is drawn out.
  float facing = smoothstep(0.35, 0.65, n0.x * n0.x / (n0.x * n0.x + n0.z * n0.z + 1e-5));
  float arc = facing > 0.5 ? vWorld.z : vWorld.x;
  vec3 wayAcross = facing > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  vec3 round0 = normalize(cross(vec3(0.0, 1.0, 0.0), n0) + vec3(1e-6, 0.0, 0.0));
  vec3 rise = normalize(cross(n0, round0));
  vec2 slopes;
  float hgt;
  vec3 stone;
  vec3 lean;
  vec2 at = vec2(arc, y);
  if (top > 0.5) {
    at = vWorld.xz;
    stone = bedded(at, foot, slopes, hgt);
    lean = vec3(1.0, 0.0, 0.0) * slopes.x - vec3(0.0, 0.0, 1.0) * slopes.y;
  } else {
    stone = bedded(at, foot, slopes, hgt);
    // Where a face turns from one way to the other the two layings cross over each other.
    if (facing > 0.02 && facing < 0.98) {
      vec2 s2;
      float h2;
      vec3 other = bedded(vec2(facing > 0.5 ? vWorld.x : vWorld.z, y), foot, s2, h2);
      float k = facing > 0.5 ? 1.0 - facing : facing;
      stone = mix(stone, other, k);
    }
    lean = wayAcross * slopes.x - rise * slopes.y;
  }
  lean -= n0 * dot(lean, n0);
  vec3 n = normalize(n0 + lean);
  float macro = vnoise(vWorld.xz * 0.05 + y * 0.04) * 0.6 + vnoise(vec2(arc, y) * 0.13 + 5.0) * 0.4;
  float grain = clamp(dot(stone, vec3(0.333)), 0.3, 1.9);
  // Dry broken grey rock: darker on its faces, pale and dusted on its tops.
  // The crag is no one grey: whole masses of it, some ledges high, stand darker or paler than their neighbours.
  float mass = smoothstep(0.3, 0.7, vnoise(vec2(arc * 0.045, y * 0.06) + 31.0) * 0.6 + vnoise(vec2(arc * 0.12, y * 0.17) + 3.0) * 0.4);
  vec3 albedo = mix(vec3(0.265, 0.255, 0.24), vec3(0.35, 0.345, 0.325), top) * mix(vec3(grain), stone, 0.7) * (0.6 + 0.36 * macro + 0.44 * mass);
  // Water seeps out of its faces across the beds: dark damp patches a ledge or two high, in a few places and not in others. No run of
  // it is long: a long one is a picture drawn out.
  float seep = smoothstep(0.52, 0.7, vnoise(vec2(arc * 0.3, y * 0.13) + 17.0) * 0.65 + vnoise(vec2(arc * 1.1, y * 0.5)) * 0.35) * smoothstep(0.35, 0.6, vnoise(vec2(arc * 0.07, y * 0.09) + 9.0)) * (1.0 - top);
  albedo *= 1.0 - 0.5 * seep;
  // A seam of the sheet is a dark crack; the joints and bed lines stand at more than their own strength.
  albedo *= 0.62 + 0.38 * smoothstep(0.12, 0.5, hgt);
  // Lichen: rust and ochre crusts in patches some strides across, their edges the sheet's own, on faces and tops alike.
  vec2 ul = at / vec2(3.6, 2.4) + 0.23;
  vec3 crust = textureLod(tLichen, ul, log2(max(foot * 1536.0 / 3.6, 1e-6))).rgb;
  float crusted = smoothstep(0.04, 0.2, crust.r - crust.b);
  float field = vnoise(at * 0.31 + 13.0) * 0.55 + vnoise(at * 0.9 + 4.0) * 0.3 + 0.15 * vnoise(vWorld.xz * 0.11 + y * 0.07);
  float patchL = smoothstep(0.575, 0.635, field + 0.1 * (crusted - 0.5) + 0.05 * top) * crusted;
  // White on the tops where the colony stands, in splashes; never one sheet of it.
  float splash = smoothstep(0.42, 0.58, vnoise(vWorld.xz * 0.45 + 3.0) * 0.5 + vnoise(vWorld.xz * 1.7) * 0.3 + 0.2 * hgt + 0.1 * grain);
  // The white hangs from the lip of a ledge deep enough to hold a roost: a rim at the lip and thin strings of unlike length under it.
  float lip = smoothstep(0.55, 0.9, vLay.y);
  // Each string has its own length, and is a finger wide: bars of one width and one length are a fence.
  float reach = (0.4 + 3.4 * pow(vnoise(vec2(arc * 1.9, 3.5)), 2.0)) * (0.35 + 1.3 * vnoise(vec2(arc * 14.0, 1.5)));
  float strings = smoothstep(0.5, 0.6, vnoise(vec2(arc * 15.0, y * 0.3 + 7.0)) * 0.6 + vnoise(vec2(arc * 37.0, y * 0.8)) * 0.4 + 0.3 * smoothstep(0.35, 0.0, vLay.x));
  float drip = lip * strings * smoothstep(reach, 0.35 * reach, vLay.x) * smoothstep(0.22, 0.42, vnoise(vec2(arc * 0.6, 11.5))) * (1.0 - top);
  float roost = smoothstep(0.34, 0.56, vnoise(vWorld.xz * 0.17 + y * 0.13 + 7.0));
  // The strings hang where the colony stands thick, and long stretches of lip have none.
  float flock = smoothstep(0.38, 0.6, vnoise(vec2(arc * 0.11, y * 0.16) + 44.0));
  float white = max(0.8 * splash * top * (0.4 + 0.6 * roost), 0.9 * drip * (0.12 + 0.88 * flock) * (0.5 + 0.5 * roost));
  albedo = mix(albedo, mix(crust, vec3(0.4, 0.26, 0.07), 0.45) * vec3(0.8, 0.78, 0.7) * (0.75 + 0.25 * grain), 0.9 * patchL * (1.0 - white));
  albedo = mix(albedo, vec3(0.68, 0.675, 0.64) * (0.7 + 0.3 * grain), white);
  float tide = uTide - 4.0 + 7.0 * (vnoise(vWorld.xz / 13.0) - 0.5) + 3.0 * (vnoise(vWorld.xz / 2.7) - 0.5) + 3.0 * (hgt - 0.5);
  float band = smoothstep(tide + 5.0, tide + 0.5, y);
  // Wet and darker low down: the spray of every tide stands in it.
  float low = smoothstep(uKelp + 5.0 + 4.0 * (macro - 0.5), uKelp - 1.5, y);
  albedo *= mix(1.0, 0.62, low) * mix(1.0, 0.45, band);
  // The weed: the picture's own hanks hang from the weed line, and under them the dark weed of the shore.
  float line = uKelp + 8.0 * (vnoise(vec2(arc / 9.0, 4.5)) - 0.5) + 3.0 * (vnoise(vec2(arc / 1.7, 9.5)) - 0.5);
  float down = line - y;
  // The weed is the Builder's own sheet of hanging wrack, laid by the face at its own size (3.2 m): limp straps, olive black, a few amber.
  vec2 uk = top > 0.5 ? vWorld.xz / 3.2 : vec2(arc, y) / 3.2;
  vec3 wk = textureLod(tWeed, uk, log2(max(foot * 1024.0 / 3.2, 1e-6))).rgb;
  float wl = dot(wk, vec3(0.333));
  vec3 kelp = wk * 1.5 + vec3(0.05, 0.034, 0.008) * smoothstep(0.03, 0.09, wl);
  // Its upper edge is ragged by the hank: a hank hangs lower or higher than its neighbour, and its tips are the sheet's own.
  float weed = smoothstep(-0.25, 0.35, down + 1.1 * (vnoise(vec2(arc * 2.9, 2.5 + y * 0.15)) - 0.5) + 6.0 * (wl - 0.05));
  albedo = mix(albedo, kelp, weed);
  // The weed is no mirror of the rock: it lies over the stone's cracks, and its straps catch the sky each its own way.
  n = normalize(mix(n, n0 + (round0 * (wk.g - wk.r) + rise * (wl - 0.06)) * 3.0, weed));
  float rough = mix(mix(mix(0.74, 0.88, top), 0.6, max(max(band, 0.7 * low), 0.6 * seep)), 0.56, weed);
  // Ledges of unequal depth: here and there, for some strides along the crag, a ledge overhangs deep and the face under its lip stands in its shade.
  float hang = vnoise(vec2(arc * 0.09, y * 0.19) + 21.0);
  float deep = smoothstep(0.36, 0.56, hang) * (1.0 - top) * smoothstep(1.2 + 4.0 * hang, 0.2, vLay.x) * (1.0 - white);
  albedo *= 1.0 - 0.5 * deep;
  float occ = (0.5 + 0.5 * smoothstep(0.2, 0.6, hgt)) * mix(1.0, 0.6, weed) * max(vShade, 0.4) * (1.0 - 0.6 * deep);
  vec3 lit = rigShade(vWorld, n, v, albedo, rough, occ);
  // Under a ledge the rock still takes the sky and the bounce of the wet floor: no shade here is black.
  vec3 fill = albedo * (skyIrradiance(vec3(0.0, 1.0, 0.0)) + 0.5 * vec3(dot(uSunColour, vec3(0.36, 0.36, 0.28))) * cloudShade(vWorld)) * (0.3 / 3.14159) * (0.75 + 0.25 * occ);
  lit = max(lit, fill);
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;

// The weed stirs in the wind: each hank a hand's breadth, the hems more than the roots.
export const WEED_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
attribute float aShade;
varying vec2 vUv;
varying float vShade;
uniform float uTime;
uniform sampler2D tWallN;
uniform float uProud;
void main() {
  vShade = aShade;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * normal);
  // The hanks of the wall's sheet stand out of the face: its hem against the light is theirs.
  float proud = textureLod(tWallN, uv / 40.0 + vec2(0.0, 0.93), 1.0).z;
  float gust = sin(uTime * 1.1 + w.x * 0.05 + w.z * 0.08);
  float hank = sin(uTime * 2.3 + uv.x * 1.9 + uv.y * 0.7 + 1.7 * gust) + 0.5 * sin(uTime * 3.7 + uv.x * 5.3 - uv.y * 1.1);
  // The hanks are lumps, not flutes: no one of them runs the height of the wall.
  float lump = sin(uv.x * 0.9 + 2.0 * sin(uv.y * 0.7)) * sin(uv.y * 1.3 + uv.x * 0.4) + 0.6 * sin(uv.x * 2.3 - uv.y * 2.9);
  w.xyz += n * ((proud - 0.35) * uProud * (0.55 + 0.45 * lump) + 0.1 * lump + 0.07 * hank * proud) + vec3(0.03, 0.0, 0.05) * gust * proud;
  vWorld = w.xyz;
  vNormal = n;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// The weed of a blade's foot: one sheet of a real weed-hung wall, 40 m by 40 m, hung from the weed line and mirrored where it meets itself,
// with the strap picture under it for what the lens sees from a stride away.
export const WEED_FRAGMENT = /* glsl */ `
${HEAD}
varying vec2 vUv;
varying float vShade;
uniform sampler2D tWall;
uniform sampler2D tWallN;
uniform sampler2D tWeed;
uniform sampler2D tWeedN;
uniform sampler2D tBare;
uniform sampler2D tBareN;
uniform float uBare;
uniform float uDark;
uniform vec4 uRill;
void main() {
  vec3 n0 = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec2 uw = vUv / 40.0 + vec2(0.0, 0.93);
  vec2 m = 1.0 - 2.0 * mod(floor(uw), 2.0);
  vec3 wall = texture2D(tWall, uw).rgb;
  vec3 wn = texture2D(tWallN, uw).rgb;
  vec2 ud = vUv / 2.7;
  vec3 det = texture2D(tWeed, ud).rgb;
  vec3 nh = texture2D(tWeedN, ud).rgb;
  // The sheet's hanks stand out of it here more and there less: one depth of groove over the whole wall is a comb's work.
  vec3 n = bump(n0, vWorld, uw, (wn.xy - 0.5) * m * (0.3 + 1.3 * vnoise(vUv / vec2(9.0, 6.0) + 2.0)));
  n = normalize(n + (bump(n0, vWorld, ud, (nh.xy - 0.5) * 1.1) - n0));
  float fine = dot(det, vec3(0.333)) / 0.039;
  // Wet weed: dark olive and brown, its own colour where a hem turns to the light.
  // Brown black in the mass (uDark: how much of the sheet's own tone is left).
  vec3 albedo = mix(vec3(dot(wall, vec3(0.333))), wall, 0.85) * mix(1.0, fine, 0.45) * 0.11 * vec3(1.08, 0.96, 0.7) * uDark;
  // Close under a lens the weed is the strap weed itself at its true size (a frond a stride long), laid twice at unlike sizes so that
  // no hank comes round again; the wall's sheet gives only where it is thick and where thin.
  float closeW = smoothstep(90.0, 30.0, length(cameraPosition - vWorld));
  vec3 nc = n;
  // Slopes are taken here, before the branch: taken inside it they differ from one run to the next.
  vec3 dpx = dFdx(vWorld);
  vec3 dpy = dFdy(vWorld);
  vec2 dux = dFdx(vUv);
  vec2 duy = dFdy(vUv);
  if (closeW > 0.001) {
    // Fronds a stride wide and two long: the lens that comes this close looks along the wall, and narrower ones close up to threads.
    vec2 u1 = vUv / vec2(17.0, 8.0) + vec2(0.17, 0.0);
    vec2 u2 = vUv / vec2(26.0, 12.6) + vec2(0.61, 0.43);
    float pickW = smoothstep(0.42, 0.58, vnoise(vUv / vec2(9.0, 5.1) + 5.0));
    vec2 s1 = 1.0 / vec2(17.0, 8.0);
    vec2 s2 = 1.0 / vec2(26.0, 12.6);
    vec2 s3 = 1.0 / vec2(11.0, 5.3);
    vec3 w1 = mix(textureGrad(tWeed, u1, dux * s1, duy * s1).rgb, textureGrad(tWeed, u2, dux * s2, duy * s2).rgb, pickW);
    vec3 n1 = mix(textureGrad(tWeedN, u1, dux * s1, duy * s1).rgb, textureGrad(tWeedN, u2, dux * s2, duy * s2).rgb, pickW);
    vec2 u3 = vUv / vec2(11.0, 5.3) + vec2(0.3, 0.7);
    vec3 n3 = textureGrad(tWeedN, u3, dux * s3, duy * s3).rgb;
    // The sheet gives only the broad tone here, read soft: its hanks a stride wide are not this weed's.
    float tone = dot(textureLod(tWall, uw, 5.0).rgb, vec3(0.333)) / 0.1;
    vec3 strap = w1 * vec3(0.24, 0.17, 0.06) * (0.6 + 0.4 * tone) * (0.6 + 0.4 * dot(textureGrad(tWeed, u3, dux * s3, duy * s3).rgb, vec3(0.333)) / 0.039);
    albedo = mix(albedo, strap, closeW);
    nc = normalize(n0 + 0.12 * (n - n0) + (bumpD(n0, dpx, dpy, dux * s1, duy * s1, (n1.xy - 0.5) * 1.1) - n0) + (bumpD(n0, dpx, dpy, dux * s3, duy * s3, (n3.xy - 0.5) * 0.7) - n0));
    n = normalize(mix(n, nc, closeW));
    fine = mix(fine, dot(w1, vec3(0.333)) / 0.039, closeW);
    wn.z = mix(wn.z, 0.25 + 0.5 * n1.z, closeW);
  }
  // The hanks that stand proud are olive and gold brown, and wet.
  float hem = smoothstep(0.42, 0.72, wn.z + 0.25 * (fine - 1.0));
  albedo = mix(albedo, mix(vec3(0.06, 0.044, 0.016) * uDark, vec3(0.075, 0.046, 0.012), closeW) * (0.5 + 0.6 * fine), (0.45 - 0.1 * closeW) * hem);
  // Threads of water running down off the hems.
  // A thread is a stride long: threads the height of a hank, side by side, are grooves.
  float thread = smoothstep(0.8, 0.95, vnoise(vec2(vUv.x * 5.0, vUv.y * 1.1 + uTime * 0.9))) * smoothstep(0.55, 0.9, vnoise(vec2(vUv.x * 0.7, vUv.y * 0.11 + 3.0)));
  // One place on the wall where the water of the shelf above runs off: a band a stride or two wide that wanders as it comes down.
  float along = dot(vWorld.xz - uRill.xy, uRill.zw);
  float wander = along + 1.1 * (vnoise(vec2(vWorld.y * 0.3, 3.0)) - 0.5) + 0.3 * (vnoise(vec2(vWorld.y * 1.3, 7.0)) - 0.5);
  float rill = smoothstep(1.0, 0.15, abs(wander)) * smoothstep(50.0, 25.0, length(vWorld.xz - uRill.xy));
  // It falls in threads that break into drops, not in a ribbon.
  // Asked only where the water runs: the rest of the wall does not pay for it.
  float fall = 0.0;
  float runs = 0.0;
  if (rill > 0.0) {
    fall = smoothstep(0.55, 0.85, vnoise(vec2(wander * 17.0, vWorld.y * 0.5 + uTime * 6.0))) * (0.45 + 0.55 * vnoise(vec2(wander * 3.1, vWorld.y * 2.3 + uTime * 9.0))) * smoothstep(0.3, 0.75, vnoise(vec2(wander * 29.0, vWorld.y * 6.0 + uTime * 16.0)));
    runs = rill * smoothstep(0.42, 0.7, vnoise(vec2(wander * 6.0, vWorld.y * 0.4 + uTime * 4.0))) * smoothstep(0.4, 0.7, vnoise(vec2(wander * 21.0, vWorld.y * 3.0 + uTime * 8.0)));
  }
  albedo *= 1.0 - 0.4 * rill;
  // From far off the mass is matt: a wall of weed is no grey sheen of the sky, only its threads of water are bright.
  float rough = mix(mix(0.9 + 0.08 * (1.0 - wn.z), mix(0.86, 0.7, hem), closeW), 0.12, max(0.6 * thread * (1.0 - closeW), runs));
  // A hank seen along its flank from far off is no strip of the sky: its skin is rougher than the lens sees, and is lit as if it stood half toward the lens.
  n = normalize(n + v * (max(0.0, 0.5 - dot(n, v)) * (1.0 - closeW)));
  float occ = (0.25 + 0.75 * smoothstep(0.08, 0.5, wn.z)) * (0.6 + 0.4 * smoothstep(0.2, 0.7, nh.z)) * (0.6 + 0.4 * vShade);
  // On a wall of beds the weed hangs in clumps from each ledge and thins toward the next one down: between the clumps the wall is bare
  // wet rock with its barnacles, dark under the ledge it hangs from.
  float bare = 0.0;
  if (uBare > 0.0) {
  float bedAt = (vWorld.y + 7.0 * vnoise(vec2(vUv.x / 31.0, 1.5)) + 9.0 * vnoise(vec2(vWorld.y / 26.0, 4.5))) / 6.5;
  float under = fract(bedAt);
  // The clumps are of every width, and run over two or three beds where the weed is thick: no grid of them.
  float clump = 0.45 * vnoise(vec2(vUv.x / 13.0, vWorld.y / 21.0) + 3.0) + 0.3 * vnoise(vec2(vUv.x / 5.0, floor(bedAt) * 7.3)) + 0.25 * vnoise(vec2(vUv.x / 1.7, vWorld.y / 4.0));
  bare = uBare * smoothstep(0.1, -0.06, clump + 0.25 * under - 0.52 + 0.35 * (wn.z - 0.5)) * smoothstep(5.0, 11.0, vWorld.y) * (0.35 + 0.65 * smoothstep(700.0, 200.0, length(cameraPosition - vWorld)));
  vec2 ur = vec2(vUv.x, vWorld.y) / 5.0;
  vec3 rk = texture2D(tBare, ur).rgb;
  vec3 rn = texture2D(tBareN, ur).rgb;
  vec3 nr = bump(n0, vWorld, ur, (rn.xy - 0.5) * 1.6);
  float crack = smoothstep(0.25, 0.0, abs(under - 0.97) * 6.5);
  albedo = mix(albedo, mix(vec3(dot(rk, vec3(0.333))), rk, 0.8) * vec3(0.62, 0.54, 0.45) * (1.0 - 0.5 * crack), bare);
  n = normalize(mix(n, nr, bare));
  rough = mix(rough, 0.3 + 0.3 * (1.0 - rn.z), bare);
  occ = mix(occ, (0.45 + 0.55 * smoothstep(0.15, 0.6, rn.z)) * (0.55 + 0.45 * smoothstep(1.0, 0.6, under)), bare);
  }
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  c += thread * 0.035 * uDark * skyIrradiance(vec3(0.0, 1.0, 0.0)) * skyOpen(vWorld);
  // No shade here is black: what faces away still takes the sky and the bounce of the wet floor. The wet hems hold a glint of the sky.
  vec3 above = skyIrradiance(vec3(0.0, 1.0, 0.0));
  c = max(c, albedo * above * (0.36 / 3.14159) * (0.6 + 0.4 * occ));
  // Close, the wet shows as small glints on the blades of weed that turn to the sky, not as a sheen over the whole wall.
  c += above * vec3(1.0, 0.9, 0.7) * (0.05 * closeW * pow(max(dot(n, normalize(v + vec3(0.0, 1.0, 0.0))), 0.0), 60.0) * (0.4 + 0.6 * occ));
  // The black wet between the fronds holds the sky in beads: points of light, none of them a stride from the next.
  float bead = smoothstep(0.91, 0.96, vnoise(vUv * vec2(43.0, 37.0))) * smoothstep(0.3, 0.7, vnoise(vUv * vec2(1.7, 0.6) + 9.0)) * (0.3 + 0.7 * vnoise(vUv * vec2(7.0, 5.0)));
  c += above * (0.25 * closeW * closeW * bead * (0.3 + 0.7 * occ) * pow(max(dot(n, normalize(v + vec3(0.0, 1.0, 0.0))), 0.0), 4.0));
  c += above * (rill * (0.02 + 1.8 * fall * fall));
  // And the water that runs off it: thin bright threads down the fronds, each a few strides long, coming and going.
  float run = smoothstep(0.8, 0.96, vnoise(vec2(vUv.x * 9.0, vUv.y * 0.3 + uTime * 1.6))) * smoothstep(0.55, 0.8, vnoise(vec2(vUv.x * 1.1, vUv.y * 0.13 - uTime * 0.07) + 3.0));
  c += above * (0.05 * closeW * run * (0.4 + 0.6 * occ));
  c += above * vec3(1.0, 0.9, 0.72) * ((1.0 - 0.7 * closeW) * 0.03 * uDark * uDark * hem * (1.0 - bare) * smoothstep(0.55, 0.9, nh.z + 0.3 * vnoise(vUv * 3.0 + uTime * 0.25)));
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The floor: wet shingle and cobbles on what stands highest, coarse dark sand in the hollows, a film of water that mirrors the sky on what is
// just over the pools, dark drifts of wrack. The bed is the mesh, 0.14 m low, plus the rig's fine relief: the sheets of water end where that bed meets them.
export const GROUND_FRAGMENT = /* glsl */ `
${HEAD}
uniform sampler2D tPlate;
uniform sampler2D tPlateN;
uniform sampler2D tShingle;
uniform sampler2D tShingleN;
uniform sampler2D tSand;
uniform sampler2D tNear;
uniform sampler2D tNearN;
uniform sampler2D tWeed;
uniform sampler2D tWeedN;
uniform float uPool;
uniform vec4 uPath;
uniform vec2 uGate;
// One laying of the ground plate (a real stretch of tide flat, 48 m by 27 m, mirrored where it meets itself): turned by cs, its colour,
// and its slope in the world (x, z) with its height.
// A floor seen along itself: the picture is read by the short side of the pixel's foot (to most times it), not by the long one, so that
// stones stay stones at a low lens; the film's many samples a frame take up what that leaves.
vec3 skimmed(sampler2D t, vec2 uv, float most) {
  return textureLod(t, uv, footLevel(t, dFdx(uv), dFdy(uv), most)).rgb;
}
void plateAt(vec2 xz, vec2 cs, vec2 size, vec2 shift, out vec3 colour, out vec3 slope) {
  vec2 uv = vec2(xz.x * cs.x + xz.y * cs.y, xz.y * cs.x - xz.x * cs.y) / size + shift;
  vec2 m = 1.0 - 2.0 * mod(floor(uv), 2.0);
  colour = skimmed(tPlate, uv, 3.0);
  vec3 nh = skimmed(tPlateN, uv, 3.0);
  vec2 g = (nh.xy - 0.5) * m;
  slope = vec3(g.x * cs.x + g.y * cs.y, g.x * cs.y - g.y * cs.x, nh.z);
}
// The height of one laying of the plate, read at one level whatever the lens: the map of the wet is drawn from it, and a map that took
// the lens's level would move its pools as the lens moved.
float plateHigh(vec2 xz, vec2 cs, vec2 size, vec2 shift) {
  vec2 uv = vec2(xz.x * cs.x + xz.y * cs.y, xz.y * cs.x - xz.x * cs.y) / size + shift;
  return textureLod(tPlateN, uv, 3.0).b;
}
void main() {
  vec2 xz = vWorld.xz;
  vec3 v = normalize(cameraPosition - vWorld);
  // The floor is the plate laid twice, at unlike sizes and turns; which one shows is chosen in fields of a few strides, along the plate's
  // own bars and hollows, so that no bar comes round again.
  vec3 ca;
  vec3 sa;
  vec3 cb;
  vec3 sb;
  plateAt(xz, vec2(0.966, 0.259), vec2(48.0, 27.0), vec2(0.31, 0.12), ca, sa);
  plateAt(xz, vec2(0.342, -0.94), vec2(86.0, 48.4), vec2(0.77, 0.43), cb, sb);
  float ha = plateHigh(xz, vec2(0.966, 0.259), vec2(48.0, 27.0), vec2(0.31, 0.12));
  float hb = plateHigh(xz, vec2(0.342, -0.94), vec2(86.0, 48.4), vec2(0.77, 0.43));
  float pick = smoothstep(-0.1, 0.1, 0.45 * (ha - hb) + vnoise(xz / 23.0 + 3.0) - 0.5);
  // The plate's height as the map of the wet has it: nothing of the lens in it.
  float pz = mix(hb, ha, pick);
  vec3 plate = mix(cb, ca, pick);
  vec3 ps = mix(sb, sa, pick);
  // Under the plate's reach (a thumb to the pixel) the stones and the sand are their own pictures.
  vec2 ud = xz / 2.0;
  float close0 = smoothstep(70.0, 8.0, length(cameraPosition - vWorld));
  // Past a hundred metres a stone is far under a pixel: there the pictures are not read at all, and their mean stands for them.
  float reach = smoothstep(110.0, 80.0, length(cameraPosition - vWorld));
  vec2 us = vec2(xz.y, -xz.x) / 4.0 + 0.37;
  vec2 udx = dFdx(ud);
  vec2 udy = dFdy(ud);
  vec2 usx = dFdx(us);
  vec2 usy = dFdy(us);
  vec3 det = vec3(0.122);
  vec3 nh = vec3(0.5);
  vec3 sand = vec3(0.128);
  // Close under a lens the floor is the Builder's own stretch of it, stones, grit and cast weed laid at their true size and mirrored
  // where it meets itself: no stone comes round again within a stride, and each stands a little out of the bed toward the eye.
  // The stones lie in drifts drawn out across the strait, bare wet sand between them: a third of the flat at most.
  float driftAt = vnoise(vec2(xz.x / 27.0 + 0.2 * xz.y / 19.0, xz.y / 5.5) + 31.0) * 0.62 + vnoise(xz / 2.3 + 17.0) * 0.38;
  float driftN = smoothstep(0.64, 0.7, driftAt);
  float nearBy = smoothstep(60.0, 28.0, length(cameraPosition - vWorld)) * driftN;
  vec2 un = vec2(xz.x * 0.94 + xz.y * 0.342, xz.y * 0.94 - xz.x * 0.342) / 1.9 + vec2(0.13, 0.41);
  float ln = footLevel(tNear, dFdx(un), dFdy(un), 2.5);
  vec3 nearC = vec3(0.13);
  vec3 nearN = vec3(0.5);
  if (reach > 0.0) {
    det = mix(det, textureLod(tShingle, ud, footLevel(tShingle, udx, udy, 3.0)).rgb, (0.35 + 0.65 * close0) * reach);
    nh = mix(nh, textureLod(tShingleN, ud, footLevel(tShingleN, udx, udy, 3.0)).rgb, (0.35 + 0.65 * close0) * reach);
    // Silt, not rippled sand: the picture gives its grain and little of its ripple.
    sand = mix(sand, textureLod(tSand, us, footLevel(tSand, usx, usy, 2.0)).rgb, 0.4 * reach);
    if (nearBy > 0.0) {
      // No lift of a stone toward the eye: laid on by one step it made the stones swim as the lens went by.
      vec2 mirror = 1.0 - 2.0 * mod(floor(un), 2.0);
      vec2 up = un;
      vec3 nn = textureLod(tNearN, up, ln).rgb;
      vec2 gn = (nn.xy - 0.5) * mirror;
      // The slopes of the picture, turned back to the floor's own way.
      nearN = vec3(0.5 + gn.x * 0.94 - gn.y * 0.342, 0.5 + gn.y * 0.94 + gn.x * 0.342, nn.b);
      nearC = textureLod(tNear, up, ln).rgb;
    }
  }
  float fine = bedFine(xz);
  // The bed is the rig's: the same one the sheets of water are laid on. The plate's own relief stands on it.
  float h = landAt(xz).r + fine + 0.2 * (pz - 0.35);
  float over = h - uPool;
  // The map of the wet comes first: sheets of soaked sand drawn out toward the sea, with hard edges, between the bars of gravel. Soaked,
  // the floor is dark and a mirror; dry, it is pale and matt.
  vec2 sq = vec2(xz.x * 0.3 + 0.12 * xz.y, xz.y * 0.9);
  float soak = vnoise(sq / 13.0 + 11.0) * 0.5 + vnoise(sq / 4.7 + 4.0) * 0.32 + vnoise(xz / 1.9) * 0.18;
  // The lane of standing water down the middle of the strait: it widens and wanders as it goes.
  vec2 rel = xz - uPath.xy;
  float along = dot(rel, uPath.zw);
  float across = dot(rel, vec2(-uPath.w, uPath.z)) + (7.0 + 0.08 * along) * (vnoise(vec2(along / 37.0, 2.5)) - 0.5) + 2.0 * (vnoise(xz / 3.1 + 8.0) - 0.5);
  float lane = smoothstep(1.0, 0.35, abs(across) / (3.5 + 0.075 * max(along, 0.0))) * smoothstep(-4.0, 12.0, along);
  float soaked = smoothstep(0.485, 0.515, soak - 0.3 * (pz - 0.35) - 1.5 * clamp(over - 0.06, 0.0, 0.25) + 0.34 + 0.45 * lane - 0.25 * driftN);
  // Stones where the floor stands proud, rippled sand where it lies low.
  // Gravel lies in bars a few strides long, where the floor stands proud; between them the floor is silt.
  float bar = smoothstep(0.4, 0.6, pz + 0.5 * clamp(over, -0.2, 0.3) + 0.5 * (vnoise(vec2(xz.x / 14.0, xz.y / 5.0) + 2.0) - 0.42));
  bar *= 1.0 - 0.8 * soaked;
  // Gravel shows only round the drifts of stones: everywhere else the stones lie under silt, and the floor is dark wet mud.
  bar *= smoothstep(0.54, 0.64, driftAt);
  vec3 grain = mix(sand / 0.128, det / 0.122, bar);
  // Wet grey shingle: slate more than sand.
  grain = mix(vec3(dot(grain, vec3(0.333))), grain, 0.22) * vec3(0.94, 0.98, 1.04);
  // Close under the lens the plate is a smear: there it gives only its broad tone, and the stones and the sand carry the floor.
  float close = smoothstep(70.0, 8.0, length(cameraPosition - vWorld));
  vec3 broad = mix(plate, vec3(0.123, 0.13, 0.136), 0.8 * close) * 0.86;
  vec3 albedo = mix(broad, vec3(dot(broad, vec3(0.333))), 0.7) * mix(vec3(1.0), grain, mix(0.7, 1.0, close)) * 0.43;
  // Cast weed lies in dark patches on the bars and at the edge of the pools.
  // Before the gate the flat is the weed's: dark mats of it between the sheets of standing water.
  float gateNear = smoothstep(90.0, 25.0, length(xz - uGate));
  float castWeed = smoothstep(0.58, 0.625, vnoise(xz / 7.3 + 7.0) * 0.55 + vnoise(xz / 2.1 + 1.0) * 0.3 + 0.15 * vnoise(xz / 0.45 + 3.0) + 0.14 * bar + 0.06 * gateNear) * smoothstep(0.36, 0.5, vnoise(xz / 1.3 + 5.0) * 0.7 + 0.3 * vnoise(xz / 0.31 + 2.0));
  // Wrack, not ripples: where weed is cast the floor is the Builder's own sheet of strap weed laid flat at its true size, olive and
  // brown straps over black gaps. Its level is taken here, outside the branch that reads it.
  vec2 uwf = vec2(xz.x * 0.8 + xz.y * 0.6, xz.y * 0.8 - xz.x * 0.6) / 2.6 + vec2(0.37, 0.11);
  float lwf = footLevel(tWeed, dFdx(uwf), dFdy(uwf), 3.0);
  vec3 wk = vec3(0.03);
  vec3 wkn = vec3(0.5);
  if (castWeed > 0.01) {
    wk = textureLod(tWeed, uwf, lwf).rgb;
    wkn = textureLod(tWeedN, uwf, lwf).rgb;
  }
  float wl = dot(wk, vec3(0.333));
  vec3 weedC = wk * vec3(1.0, 1.05, 1.0);
  albedo = mix(albedo, weedC, 0.9 * castWeed);
  // What lies under the sheets is dark drowned sand; the plate's hollows hold a film that shows the sky; every stone above is wet.
  float under = smoothstep(0.01, -0.05, over);
  float low = smoothstep(0.24, 0.12, pz);
  float wet = max(smoothstep(0.08, 0.01, over), 0.7 * low);
  wet = max(wet, soaked * (1.0 - castWeed));
  float film = wet * (1.0 - under) * (1.0 - castWeed);
  float damp = smoothstep(0.4, 0.1, over);
  float rough = mix(mix(0.6, 0.45, damp), 0.06, film);
  rough = mix(rough, 0.9, under);
  rough = mix(rough, mix(0.9, 0.55, smoothstep(0.03, 0.1, wl)), castWeed * (1.0 - under));
  // Dry shingle under a break in the cloud stays slate: the sun's warmth is taken out of it.
  albedo *= mix(1.25, 0.5, max(wet, 0.35 * damp)) * mix(1.0, 0.55, under) * mix(vec3(0.86, 0.95, 1.08), vec3(0.88, 0.96, 1.07), max(wet, under));
  // Close under the lens the stones are the picture's own: each keeps its colour and its slope, wet and dark where it lies low in the film.
  float lowN = smoothstep(0.5, 0.3, nearN.z);
  float filmN = film * lowN;
  vec3 nearAlbedo = nearC * mix(1.0, 0.55, max(filmN, under)) * mix(1.0, 0.78, damp) * vec3(0.93, 0.98, 1.05);
  // Few stones: only the tall ones of the picture stand out of the silt, which lies between them as it lies on the open floor.
  float siltN = smoothstep(0.62, 0.4, nearN.z);
  nearAlbedo = mix(nearAlbedo, albedo, max(0.85 * siltN, castWeed));
  albedo = mix(albedo, nearAlbedo, nearBy);
  // Before the gate what is not a sheet of water is dark: soaked sand and mats of weed that show no sky.
  float sunk = gateNear * (1.0 - film * mix(1.0, lowN, nearBy));
  albedo = mix(albedo, albedo * vec3(0.42, 0.4, 0.34), sunk);
  albedo = mix(albedo, weedC, 0.9 * castWeed * gateNear);
  rough = mix(rough, mix(mix(0.7, 0.5, damp), 0.08, filmN), nearBy * (1.0 - under) * (1.0 - castWeed));
  film = mix(film, filmN, nearBy);
  rough = mix(rough, 0.95, gateNear * (1.0 - film));
  vec2 g = mix((nh.xy - 0.5) * 2.2 * max(bar, 0.1 * close) * mix(1.0, 0.05, wet), (nearN.xy - 0.5) * 1.7 * (1.0 - 0.9 * filmN) * (1.0 - 0.8 * siltN), nearBy);
  g = mix(g, (wkn.xy - 0.5) * 0.55, castWeed);
  vec3 n = normalize(vNormal + vec3(ps.x, 0.0, ps.y) * 2.6 * (1.0 - 0.85 * film) * (1.0 - 0.7 * close) * (1.0 - 0.8 * under) * (1.0 - 0.6 * nearBy) + vec3(g.x, 0.0, -g.y));
  float cavity = 0.55 + 0.45 * smoothstep(0.08, 0.4, ps.z);
  float occ = mix(cavity * (0.5 + 0.5 * smoothstep(0.1, 0.55, nh.z)), 1.0, wet);
  occ = mix(occ, mix(0.4 + 0.6 * smoothstep(0.1, 0.55, nearN.z), 1.0, filmN), nearBy);
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  // The film of water shows the cloud, not only the smooth sky; ruffled, it shows the sky a hand higher than a still one would.
  // The sky's picture and the land's are read at named levels (skyOpen, spelled out): a level taken from the pixel inside a branch is
  // not defined at the edge of a film, and the edge of every pool would take another level with every move of the lens.
  if (film > 0.02) {
    vec4 landF = textureLod(tLand, (xz - uLandRect.xy) * uLandRect.zw, 0.0);
    vec2 uc = (xz - uContactRect.xy) * uContactRect.zw;
    vec2 ue = min(uc, 1.0 - uc);
    float aboveF = vWorld.y - landF.r;
    float openF = mix(landF.g, 1.0, clamp(aboveF / 120.0, 0.0, 1.0)) * (1.0 - textureLod(tContact, uc, 0.0).r * smoothstep(0.0, 0.03, min(ue.x, ue.y)) * smoothstep(4.0, 0.0, aboveF));
    vec3 r = reflect(-v, n);
    r.y = abs(r.y) + 0.06;
    r = normalize(r);
    float f = 0.04 + 0.96 * pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 5.0);
    c = max(c + film * f * (skyMirror(r, 3.0) * (1.0 + 1.6 * lane) - skyRadiance(r)) * openF, vec3(0.0));
    // Before the gate the sheets lie under the wall of water and the stacks: they show those, dark, and the bright of the sky only in
    // long bands across, where the ruffled film turns up to it.
    float band = smoothstep(0.5, 0.74, vnoise(vec2(xz.x / 11.0, xz.y / 1.3) + 5.0) * 0.7 + vnoise(vec2(xz.x / 2.7, xz.y / 0.4)) * 0.3);
    c *= mix(1.0, mix(0.4, 1.5, band), gateNear * film);
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The blades in the wet floor: each blade drawn again upside down and laid flat on the water by the line of sight, so that it lies where its
// mirror image shows, under whatever stands in front of the floor. Only where the floor is wet, and stronger the lower the eye.
export const MIRROR_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vAt;
uniform float uPool;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec3 q = vec3(w.x, uPool - max(w.y - uPool, 0.2), w.z);
  float h = uPool + 0.03;
  vec3 p = cameraPosition + (q - cameraPosition) * ((cameraPosition.y - h) / (cameraPosition.y - q.y));
  vAt = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const MIRROR_FRAGMENT = /* glsl */ `
${HEAD}
varying vec3 vAt;
uniform float uPool;
uniform float uTide;
void main() {
  float over = landAt(vAt.xz).r + bedFine(vAt.xz) - uPool;
  float wet = smoothstep(0.24, 0.08, over) * smoothstep(-3.5, -0.4, over);
  vec3 toEye = cameraPosition - vAt;
  float f = 0.04 + 0.96 * pow(1.0 - clamp(toEye.y / length(toEye), 0.0, 1.0), 5.0);
  float tide = uTide - 4.0 + 7.0 * (vnoise(vWorld.xz / 13.0) - 0.5);
  vec3 albedo = mix(vec3(0.17, 0.175, 0.18), vec3(0.08, 0.078, 0.07), smoothstep(tide + 3.0, tide - 3.0, vWorld.y));
  vec3 c = rigShade(vWorld, normalize(vNormal), normalize(vAt - vWorld), albedo, 1.0, 0.8);
  c = mix(uHaze * 0.9, c, exp(-length(vWorld - vAt) * 0.0006));
  // The wind's ripple breaks the image into streaks that lie across the line of sight.
  float streak = 0.5 + 0.5 * vnoise(vec2(dot(vAt.xz, normalize(toEye.xz)) * 1.7, dot(vAt.xz, normalize(toEye.zx * vec2(1.0, -1.0))) * 0.3) + uTime * 0.5);
  // Close under a lens the image is lost in the ripple: it comes in over fifty metres.
  float nearLens = smoothstep(12.0, 60.0, length(toEye));
  gl_FragColor = vec4(rigOut(c), 0.5 * wet * smoothstep(0.02, 0.45, f) * streak * nearLens * (1.0 - uSolo));
  // Last, so that every picture above is read with whole neighbours.
  if (wet < 0.01) discard;
}`;

// Loose rock on the floor: dark and wet, weed on what faces up.
export const BOULDER_FRAGMENT = /* glsl */ `
${HEAD}
uniform sampler2D tBoulder;
uniform sampler2D tBoulderN;
uniform sampler2D tWeed;
uniform sampler2D tWeedN;
uniform float uWeedy;
uniform float uWarm;
uniform vec2 uGate;
uniform float uPool;
// A stone's own tone, as what is added to one, and how far it stands drained: 0 soaked to its crown, 1 dark only at its wet foot.
uniform vec3 uTint;
uniform float uDry;
uniform vec3 uFeed;
void main() {
  vec3 n0 = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  // The picture is laid on the plane the face lies nearest, so that it is not drawn out on any side.
  vec3 an = abs(n0);
  vec2 flat2 = an.y > max(an.x, an.z) ? vWorld.xz : (an.x > an.z ? vWorld.zy : vWorld.xy);
  vec2 us = flat2 / mix(1.1, 1.9, uWeedy) + 0.31;
  vec2 ut = flat2 / 1.7;
  vec3 side = texture2D(tBoulder, us).rgb;
  vec3 nh = texture2D(tBoulderN, us).rgb;
  vec3 wc = texture2D(tWeed, ut).rgb;
  vec3 n = bump(n0, vWorld, us, (nh.xy - 0.5) * mix(1.0, 1.5, uWeedy));
  // The weed on a rock is a tangle of straps: its own slopes and its own hollows, not the stone's.
  vec3 wn = texture2D(tWeedN, ut).rgb;
  // Weed lies thick on the rocks of one stretch of the flat and thin on the next.
  float weedPatch = smoothstep(0.35, 0.55, vnoise(vWorld.xz / 17.0 + 3.0));
  float cover = smoothstep(mix(0.1, -0.3, weedPatch), mix(0.7, 0.3, weedPatch), n0.y + 0.8 * (vnoise(vWorld.xz * 0.9) - 0.5) + 0.3 * (nh.z - 0.5));
  // Before the gate every rock wears it.
  cover = max(cover, smoothstep(90.0, 25.0, length(vWorld.xz - uGate)) * smoothstep(-0.6, 0.1, n0.y));
  // The rock at the feeders' lens is grown over on every crown.
  cover = max(cover, uWarm * smoothstep(-0.1, 0.45, n0.y + 0.6 * (vnoise(vWorld.xz * 0.9) - 0.5)));
  cover *= uWeedy;
  // A stone on the floor has its own tone: some slate, some nearly black, a few pale.
  float tone = vnoise(vWorld.xz * 2.3 + 0.5);
  side = mix(vec3(dot(side, vec3(0.333))), side, 0.45) * (1.0 + uTint);
  // Cast weed on a rock: olive and gold brown where its straps turn up, wet. Under it barnacles in pale crusts on the bare stone.
  vec3 gold = mix(vec3(0.62, 0.7, 0.72), vec3(1.0), weedPatch) * mix(wc * 0.5, vec3(0.105, 0.07, 0.022) * (0.4 + 2.2 * wc.g / 0.04 * 0.5), smoothstep(0.03, 0.09, wc.g) * 0.2);
  // Under a low sun the weed on a rock is gold where a strap turns up and umber between.
  // And the weed lies on it in tufts, ochre where it is thick, the wet rock near black between: no strap runs the height of a rock.
  float tuft = smoothstep(0.45, 0.6, 0.45 * vnoise(vWorld.xz * 2.1 + 4.0) + 0.3 * vnoise(vWorld.xz * 6.3 + vWorld.y * 3.0) + 0.25 * vnoise(vWorld.xz * 19.0 + vWorld.y * 11.0) + 0.3 * (n0.y - 0.6)) * (0.25 + 0.75 * smoothstep(0.02, 0.075, wc.g));
  // Where the feeders' lens stands every rock wears it so.
  float warm = max(uWarm, uFeed.z * smoothstep(45.0, 20.0, length(vWorld.xz - uFeed.xy)));
  // Elsewhere the same tufts in olive brown: a rock of the flat is grown over and matt, no black glass.
  vec3 grown = mix(vec3(0.022, 0.018, 0.012), mix(vec3(0.1, 0.068, 0.02), vec3(0.23, 0.125, 0.02), warm), tuft) * (0.75 + 0.5 * smoothstep(0.015, 0.11, wc.g));
  gold = mix(gold, grown, max(warm, 0.75));
  float crust = smoothstep(0.55, 0.7, vnoise(flat2 * 3.1 + 2.0) * 0.5 + vnoise(flat2 * 23.0) * 0.5 + 0.3 * (nh.z - 0.5)) * (1.0 - cover) * uWeedy;
  vec3 albedo = mix(side * mix(0.55 + 0.85 * tone, 0.6, uWeedy), gold, 0.85 * cover);
  albedo = mix(albedo, vec3(0.3, 0.29, 0.26), 0.6 * crust);
  // Weed is no mirror: wet straps, matt in the mass, bright only in small glints.
  float rough = mix(mix(mix(0.3, 0.66, uDry), 0.45, uWeedy), 0.72 - 0.34 * smoothstep(0.62, 0.8, wn.z), cover);
  // What stands in the pool or just out of it is soaked: near black and bright where it turns to the sky.
  float soak = smoothstep(uPool + mix(0.75, 0.035, uDry), uPool + mix(0.15, 0.004, uDry), vWorld.y + mix(0.3, 0.02, uDry) * (vnoise(vWorld.xz * mix(1.7, 11.0, uDry)) - 0.5));
  albedo *= mix(1.0, mix(0.58, 0.7, uWeedy) * mix(1.0, 0.55, uDry), soak);
  rough = mix(rough, 0.2, soak * (1.0 - cover));
  float occ = 0.5 + 0.5 * smoothstep(0.2, 0.6, nh.z);
  n = normalize(mix(n, bump(n0, vWorld, ut, (wn.xy - 0.5) * mix(1.3, 0.5, warm)), cover));
  occ = mix(occ, 0.3 + 0.7 * smoothstep(0.15, 0.6, wn.z), cover);
  gl_FragColor = vec4(rigOut(rigShade(vWorld, n, v, albedo, rough, occ)), 1.0);
}`;

// A cobble heaped on a bar, drained: the shingle's own picture on the plane its face lies nearest, its tone its own and unlike its neighbour's,
// from slate to bone, soaked only where it stands in the film of water. There are thousands under the low lens: it asks for nothing it does not show.
export const COBBLE_FRAGMENT = /* glsl */ `
${HEAD}
uniform sampler2D tBoulder;
uniform sampler2D tBoulderN;
uniform float uPool;
void main() {
  vec3 n0 = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 an = abs(n0);
  vec2 flat2 = an.y > max(an.x, an.z) ? vWorld.xz : (an.x > an.z ? vWorld.zy : vWorld.xy);
  vec2 us = flat2 / 1.1 + 0.31;
  vec3 side = texture2D(tBoulder, us).rgb;
  vec3 nh = texture2D(tBoulderN, us).rgb;
  vec3 n = bump(n0, vWorld, us, (nh.xy - 0.5) * 1.6);
  float own = vnoise(vWorld.xz * 9.0 + 4.0);
  vec3 albedo = mix(vec3(0.095, 0.1, 0.105), vec3(0.36, 0.34, 0.3), own * (0.55 + 0.45 * own)) * (0.5 + 2.2 * dot(side, vec3(0.333)));
  float soak = 1.0 - 0.75 * smoothstep(uPool + 0.02, uPool + 0.12, vWorld.y);
  albedo *= mix(1.0, 0.42, soak);
  float occ = 0.5 + 0.5 * smoothstep(0.2, 0.6, nh.z);
  gl_FragColor = vec4(rigOut(rigShade(vWorld, n, v, albedo, mix(0.6, 0.16, soak), occ)), 1.0);
}`;

/** The mirror in the card loop: the ripple that breaks the image goes round a closed way, about as far as it runs in the film, and is back where it began. */
export const MIRROR_LOOP_FRAGMENT = loopText(MIRROR_FRAGMENT, [
  ['void main() {', 'uniform vec2 uLoop;\nvoid main() {'],
  ['+ uTime * 0.5);', '+ uLoop.x * 0.5 + 0.64 * vec2(sin(6.283185 * uLoop.y), 1.0 - cos(6.283185 * uLoop.y)));'],
]);

// A bar of sand that stands a finger out of the film: ripple marks a hand apart lying along it, water in their troughs, shingle strewn
// on it. Warm wet sand, pale where a crest has drained.
export const SANDBAR_FRAGMENT = /* glsl */ `
${HEAD}
uniform sampler2D tSand;
uniform sampler2D tShingle;
uniform sampler2D tShingleN;
uniform float uPool;
void main() {
  vec3 n0 = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec2 xz = vWorld.xz;
  float near = smoothstep(110.0, 35.0, length(cameraPosition - vWorld));
  // The marks wander and fork: two sets of unlike spacing, each bent by the lie of the bar, one or the other by the stride.
  float bend = 2.4 * vnoise(xz / 2.3 + 3.0) + 0.8 * vnoise(xz / 0.53 + 9.0);
  float pa = 6.2832 * ((xz.y + 0.22 * xz.x) / 0.14 + bend);
  float pb = 6.2832 * ((xz.y - 0.3 * xz.x) / 0.19 + 1.3 * bend + 0.37);
  float which = smoothstep(0.4, 0.6, vnoise(xz / 1.1 + 21.0));
  float wave = mix(sin(pa), sin(pb), which);
  float lean = mix(cos(pa) / 0.14, cos(pb) / 0.19, which);
  float crest = smoothstep(-0.3, 0.8, wave);
  vec2 us = vec2(xz.y, -xz.x) / 4.0 + 0.37;
  vec2 ud = xz / 2.0;
  vec3 sand = texture2D(tSand, us).rgb / 0.128;
  vec3 det = texture2D(tShingle, ud).rgb / 0.122;
  vec3 nh = texture2D(tShingleN, ud).rgb;
  // Shingle lies in drifts on the bar, thick toward its crown.
  float strewn = smoothstep(0.6, 0.7, 0.6 * vnoise(xz / 0.9 + 5.0) + 0.4 * vnoise(xz / 0.21 + 1.0));
  vec3 n = normalize(n0 + vec3(0.22, 0.0, 1.0) * (-0.02 * lean * near * (1.0 - strewn)));
  n = normalize(mix(n, bump(n0, vWorld, ud, (nh.xy - 0.5) * 1.4), strewn * near));
  vec3 albedo = vec3(0.135, 0.103, 0.07) * mix(vec3(1.0), sand, 0.6) * (0.62 + 0.7 * crest * near);
  albedo = mix(albedo, vec3(0.062, 0.06, 0.058) * det * (0.5 + 1.1 * vnoise(xz * 2.3 + 0.5)), strewn);
  // What lies at the film is soaked and dark; a trough holds water.
  float wet = smoothstep(uPool + 0.022, uPool + 0.004, vWorld.y + 0.012 * (vnoise(xz / 0.6) - 0.5) + 0.006 * wave * near);
  albedo *= mix(1.0, 0.55, wet);
  float rough = mix(mix(mix(0.2, 0.62, crest), 0.55, strewn), 0.07, wet);
  float occ = mix(0.7 + 0.3 * crest, 0.5 + 0.5 * smoothstep(0.2, 0.6, nh.z), strewn);
  gl_FragColor = vec4(rigOut(rigShade(vWorld, n, v, albedo, rough, occ)), 1.0);
}`;
