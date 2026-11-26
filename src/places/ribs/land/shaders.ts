// The surfaces of the land. Each takes its light from the rig and ends in rigOut.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

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
  float proud = textureLod(tWideN, vec2(uv.x, 0.215 + 0.78 * uv.y), 1.0).z - 0.5;
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
  // The colony's sheet is mirrored where it meets itself: its slopes turn with it.
  vec2 mA = mix(vec2(1.0), 1.0 - 2.0 * mod(floor(a1), 2.0), step(0.5, uTier));
  vec2 mB = mix(vec2(1.0), 1.0 - 2.0 * mod(floor(b1), 2.0), step(0.5, uTier));
  float sheet = mix(1.3, 0.45, step(0.5, uTier));
  vec3 nA = bump(n0, vWorld, a1, (nhA.xy - 0.5) * mA * sheet);
  vec3 nB = bump(n0, vWorld, b1, (nhB.xy - 0.5) * mB * sheet);
  vec3 n = normalize(mix(nA, nB, kB));
  n = normalize(n + (bump(n0, vWorld, a2, (nhW.xy - 0.5) * mix(1.8, 0.55, uFin)) - n0));
  float lum = dot(big, vec3(0.333));
  float macro = vnoise(vBlade.yx * vec2(0.021, 0.008)) * 0.6 + vnoise(vBlade.yx * vec2(0.06, 0.027) + 5.0) * 0.4;
  vec3 albedo = mix(det * mix(vec3(1.0), big / 0.26, 0.4) * (0.85 + 0.4 * macro), mix(vec3(0.5, 0.485, 0.46), big, 0.32) * mix(vec3(1.0), det / 0.265, 0.4) * (0.92 + 0.16 * macro), uFin);
  // Pale stone: ivory more than brown, the warmth left to the lichen.
  albedo = mix(vec3(dot(albedo, vec3(0.333))), albedo, mix(0.5, 0.55, uFin)) * uRockTint;
  // Beds that run the length of the blade: the soft ones worn back, grey and damp.
  float beds = vnoise(vec2(vBlade.y * 0.21 + 0.7 * macro, vBlade.x * 0.012)) * 0.6 + vnoise(vec2(vBlade.y * 0.74, vBlade.x * 0.03 + 3.0)) * 0.4;
  float soft = smoothstep(0.56, 0.4, beds) * (1.0 - kB);
  albedo *= 1.0 - 0.2 * soft;
  // The hollows of the wide laying hold the dark and the damp.
  float hollow = smoothstep(0.55, 0.2, nhW.z);
  albedo *= 1.0 - mix(0.22, 0.12, uFin) * hollow;
  float y = vWorld.y;
  float tide = uTide - 4.0 + 7.0 * (vnoise(vWorld.xz / 13.0) - 0.5) + 3.0 * (vnoise(vWorld.xz / 2.7) - 0.5) + 3.0 * (nh.z - 0.5);
  float weed = smoothstep(tide + 0.5, tide - 0.5, y);
  float band = smoothstep(tide + 5.0, tide + 0.5, y);
  float damp = smoothstep(tide + 40.0 + 30.0 * (macro - 0.5), tide + 2.0, y);
  // The run of water and of white down a face: by the level way across it and the height, whichever plane it is laid on.
  vec2 fall = vec2(mix(vBlade.w, vBlade.z, kB * (1.0 - top)), y);
  float stain = smoothstep(0.42, 0.7, vnoise(fall * vec2(0.23, 0.021)) * 0.6 + vnoise(fall * vec2(0.9, 0.06) + 7.0) * 0.4);
  albedo *= mix(vec3(1.0), vec3(0.6, 0.62, 0.6), stain * 0.7 * (1.0 - step(0.5, uTier)));
  float roost = vnoise(fall * vec2(0.031, 0.045) + 2.0) * 0.65 + vnoise(fall * vec2(0.11, 0.13)) * 0.35;
  float run = vnoise(fall * vec2(1.3, 0.05) + 11.0) * 0.6 + vnoise(fall * vec2(4.1, 0.16)) * 0.4;
  // Fine upright fractures and runs of water down a blade's face.
  albedo *= mix(1.0, 0.9 + 0.2 * run, uFin);
  float white = smoothstep(0.45, 0.75, run * (0.35 + 1.1 * roost) + 0.25 * (nh.z - 0.5)) * smoothstep(0.3, 0.55, roost);
  white = max(white, 0.8 * smoothstep(0.55, 0.9, n0.y) * smoothstep(0.3, 0.6, roost + 0.3 * (nh.z - 0.5)));
  white *= (1.0 - band) * smoothstep(tide + 4.0, tide + 30.0, y);
  // Rust lichen: in fields the size of a house, broken at the size of a hand, on what leans to the sky and the sun, never in the wet.
  float sunny = 0.5 + 0.5 * dot(n0, uSunDir);
  float field = vnoise(vWorld.xz * 0.019 + vWorld.y * 0.023 + 9.0) * 0.55 + vnoise(vBlade.yx * 0.09) * 0.3 + vnoise(vBlade.yx * 0.47) * 0.15;
  float lichen = smoothstep(0.6, 0.7, field + 0.05 * uFin + 0.3 * (nh.z - 0.5) + 0.28 * n0.y + 0.22 * (sunny - 0.5) - 0.25 * hollow) * (1.0 - band) * (1.0 - 0.8 * stain);
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
  vec3 wc = texture2D(tWeed, fall / 7.0).rgb;
  albedo = mix(albedo, wc * 0.9, weed);
  float rough = mix(0.92, 0.45, max(weed, band));
  float occ = (0.45 + 0.55 * smoothstep(0.2, 0.6, nh.z)) * (mix(0.55, 0.72, uFin) + mix(0.45, 0.28, uFin) * smoothstep(0.25, 0.6, nhW.z)) * mix(1.0, 0.45, weed) * vShade * (1.0 - 0.3 * soft);
  occ = mix(occ, 0.5 + 0.5 * occ, step(0.5, uTier));
  // What hangs over is dark: the under side of a leaning blade sees the wet floor, not the sky.
  occ *= 0.45 + 0.55 * smoothstep(-0.55, 0.25, n0.y);
  vec3 lit = rigShade(vWorld, n, v, albedo, rough, occ);
  // Against the light the edge of the stone burns: the sun grazes round the rough rim toward the lens.
  float edge = 1.0 - max(dot(n, v), 0.0);
  float back = max(dot(-v, uSunDir), 0.0);
  lit += albedo * uSunColour * (0.3 * edge * edge * edge * back * back * sunAt(vWorld, landAt(vWorld.xz)) * occ);
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;

// The colony's crag. Its two stones are laid by the world's own position on three axes at one size each (ten metres for the bedded
// ledge stone, three for the shore rock over it), so that no picture is drawn out down a face. Mid grey-brown, wet and darker low
// down, rust lichen in patches on what leans to the sky and the sun, thin white runs down the faces under the perches. What hangs
// over is never black: it takes the sky and the floor's bounce, a quarter of the lit rock.
export const COLONY_FRAGMENT = /* glsl */ `
${HEAD}
varying vec4 vBlade;
varying vec3 vNb;
varying vec2 vLay;
varying float vShade;
uniform sampler2D tRock;
uniform sampler2D tLedge;
uniform sampler2D tLedgeN;
uniform sampler2D tWeed;
uniform float uTide;
void main() {
  vec3 n0 = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  // A ledge is narrow: its top and its riser are told apart by the face itself, not by the rounded normal between them.
  vec3 ng = normalize(cross(dFdx(vWorld), dFdy(vWorld)) + vec3(0.0, 1e-9, 0.0));
  ng *= sign(dot(ng, v) + 1e-6);
  vec3 nf = normalize(mix(n0, ng, 0.5) + vec3(0.0, 1e-6, 0.0));
  vec3 w = nf * nf;
  w = w * w;
  w /= w.x + w.y + w.z;
  vec3 pl = vWorld / 10.0;
  vec3 pr = vWorld / 3.0 + 0.37;
  vec3 lx = dFdx(pl);
  vec3 ly = dFdy(pl);
  vec3 rx = dFdx(pr);
  vec3 ry = dFdy(pr);
  // Only the planes that show are read.
  vec3 cx = vec3(0.0);
  vec3 cy = vec3(0.0);
  vec3 cz = vec3(0.0);
  vec3 hx = vec3(0.5);
  vec3 hy = vec3(0.5);
  vec3 hz = vec3(0.5);
  vec3 dx = vec3(0.0);
  vec3 dy = vec3(0.0);
  vec3 dz = vec3(0.0);
  if (w.x > 0.02) {
    cx = textureLod(tLedge, pl.zy, footLevel(tLedge, lx.zy, ly.zy, 2.0)).rgb;
    hx = textureLod(tLedgeN, pl.zy, footLevel(tLedgeN, lx.zy, ly.zy, 2.0)).rgb;
    dx = textureLod(tRock, pr.zy, footLevel(tRock, rx.zy, ry.zy, 2.0)).rgb;
  }
  if (w.y > 0.02) {
    cy = textureLod(tLedge, pl.xz, footLevel(tLedge, lx.xz, ly.xz, 2.0)).rgb;
    hy = textureLod(tLedgeN, pl.xz, footLevel(tLedgeN, lx.xz, ly.xz, 2.0)).rgb;
    dy = textureLod(tRock, pr.xz, footLevel(tRock, rx.xz, ry.xz, 2.0)).rgb;
  }
  if (w.z > 0.02) {
    cz = textureLod(tLedge, pl.xy, footLevel(tLedge, lx.xy, ly.xy, 2.0)).rgb;
    hz = textureLod(tLedgeN, pl.xy, footLevel(tLedgeN, lx.xy, ly.xy, 2.0)).rgb;
    dz = textureLod(tRock, pr.xy, footLevel(tRock, rx.xy, ry.xy, 2.0)).rgb;
  }
  vec3 ws = w * step(vec3(0.02), w);
  ws /= ws.x + ws.y + ws.z;
  vec3 led = cx * ws.x + cy * ws.y + cz * ws.z;
  vec3 det = dx * ws.x + dy * ws.y + dz * ws.z;
  float hgt = hx.z * ws.x + hy.z * ws.y + hz.z * ws.z;
  // The pictures' slopes are a clay model's more than a height field's: taken at a low strength.
  vec3 n = normalize(bump(n0, vWorld, pl.zy, (hx.xy - 0.5) * 0.7) * ws.x + bump(n0, vWorld, pl.xz, (hy.xy - 0.5) * 0.7) * ws.y + bump(n0, vWorld, pl.xy, (hz.xy - 0.5) * 0.7) * ws.z);
  float y = vWorld.y;
  float arc = vBlade.y;
  float macro = vnoise(vWorld.xz * 0.05 + y * 0.04) * 0.6 + vnoise(vec2(arc, y) * 0.13 + 5.0) * 0.4;
  // Mid grey-brown rock: the ledge stone gives its beds and its marks, the shore rock its grain.
  vec3 albedo = vec3(0.04, 0.041, 0.042) * mix(vec3(1.0), led / vec3(0.229, 0.21, 0.177), 0.75) * mix(vec3(1.0), det / vec3(0.111, 0.088, 0.061), 0.5) * (0.85 + 0.3 * macro);
  albedo *= 0.8 + 0.4 * smoothstep(0.25, 0.65, hgt);
  float tide = uTide - 4.0 + 7.0 * (vnoise(vWorld.xz / 13.0) - 0.5) + 3.0 * (vnoise(vWorld.xz / 2.7) - 0.5) + 3.0 * (hgt - 0.5);
  float weed = smoothstep(tide + 0.5, tide - 0.5, y);
  float band = smoothstep(tide + 5.0, tide + 0.5, y);
  // Wet and darker low down: the spray of every tide stands in it.
  float low = smoothstep(tide + 30.0 + 14.0 * (macro - 0.5), tide + 4.0, y);
  float face = 1.0 - smoothstep(0.35, 0.75, nf.y);
  // Thin white runs down a face, under where the colony stands; a splash of white on the tops.
  float perch = vnoise(vec2(arc * 0.11, y * 0.12) + 2.0);
  float thin = vnoise(vec2(arc * 4.3, y * 0.09) + 11.0) * 0.55 + vnoise(vec2(arc * 11.7, y * 0.31)) * 0.45;
  float runs = smoothstep(0.66, 0.74, thin + 0.3 * (perch - 0.5) + 0.1 * (hgt - 0.5)) * face;
  float splash = (1.0 - face) * smoothstep(0.56, 0.68, vnoise(vWorld.xz * 0.45 + 3.0) * 0.6 + vnoise(vWorld.xz * 1.7) * 0.4 + 0.3 * (hgt - 0.5));
  float white = max(0.7 * runs, 0.55 * splash) * (1.0 - band) * (1.0 - 0.5 * low);
  // Rust lichen: patches a stride or two across with broken edges, on the tops and on what faces the sun, never in the wet.
  float sunny = 0.5 + 0.5 * dot(nf, uSunDir);
  float field = vnoise(vWorld.xz * 0.13 + y * 0.11 + 9.0) * 0.45 + vnoise(vWorld.xy * 0.41 + vWorld.z * 0.33) * 0.3 + vnoise(vWorld.zy * 1.4 + vWorld.x * 1.2 + 4.0) * 0.25;
  float lichen = smoothstep(0.64, 0.67, field + 0.12 * nf.y + 0.2 * (sunny - 0.5) + 0.35 * (hgt - 0.5) + 0.1 * (dot(det, vec3(3.8)) - 1.0)) * (1.0 - smoothstep(0.2, 0.7, low)) * (1.0 - white);
  albedo = mix(albedo, vec3(0.115, 0.047, 0.006) * (0.5 + 1.0 * hgt), 0.9 * lichen);
  albedo = mix(albedo, vec3(0.3, 0.3, 0.285) * (0.7 + 0.6 * hgt), white);
  albedo *= mix(1.0, 0.5, low) * mix(1.0, 0.3, band);
  vec3 wc = texture2D(tWeed, vec2(arc, y) / 7.0).rgb;
  albedo = mix(albedo, wc * 0.9, weed);
  float rough = mix(0.92, 0.45, max(weed, max(band, 0.7 * low)));
  float occ = (0.6 + 0.4 * smoothstep(0.2, 0.6, hgt)) * mix(1.0, 0.45, weed) * max(vShade, 0.4);
  vec3 lit = rigShade(vWorld, n, v, albedo, rough, occ);
  // Under a ledge the rock still takes the sky and the bounce of the wet floor: no shade here is black.
  vec3 fill = albedo * (skyIrradiance(vec3(0.0, 1.0, 0.0)) + 0.5 * uSunColour * cloudShade(vWorld)) * (0.24 / 3.14159) * (0.75 + 0.25 * occ);
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
  w.xyz += n * ((proud - 0.35) * uProud + 0.07 * hank * proud) + vec3(0.03, 0.0, 0.05) * gust * proud;
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
  vec3 n = bump(n0, vWorld, uw, (wn.xy - 0.5) * m * 1.5);
  n = normalize(n + (bump(n0, vWorld, ud, (nh.xy - 0.5) * 1.1) - n0));
  float fine = dot(det, vec3(0.333)) / 0.039;
  // Wet weed: dark olive and brown, its own colour where a hem turns to the light.
  vec3 albedo = mix(vec3(dot(wall, vec3(0.333))), wall, 0.85) * mix(1.0, fine, 0.45) * 0.6;
  // Threads of water running down off the hems.
  float thread = smoothstep(0.78, 0.95, vnoise(vec2(vUv.x * 5.0, vUv.y * 0.35 + uTime * 0.9))) * smoothstep(0.5, 0.9, vnoise(vec2(vUv.x * 0.7, vUv.y * 0.11 + 3.0)));
  float rough = mix(0.38 + 0.3 * (1.0 - wn.z), 0.12, thread);
  float occ = (0.25 + 0.75 * smoothstep(0.08, 0.5, wn.z)) * (0.6 + 0.4 * smoothstep(0.2, 0.7, nh.z)) * (0.6 + 0.4 * vShade);
  // On a wall of beds the weed hangs in clumps from each ledge and thins toward the next one down: between the clumps the wall is bare
  // wet rock with its barnacles, dark under the ledge it hangs from.
  float bedAt = (vWorld.y + 2.5 * vnoise(vec2(vUv.x / 14.0, 1.5))) / 6.5;
  float under = fract(bedAt);
  float clump = 0.6 * vnoise(vec2(vUv.x / 5.0, floor(bedAt) * 7.3)) + 0.4 * vnoise(vec2(vUv.x / 1.7, vWorld.y / 4.0));
  float bare = uBare * smoothstep(0.1, -0.06, clump + 0.45 * under - 0.6 + 0.35 * (wn.z - 0.5)) * smoothstep(5.0, 11.0, vWorld.y);
  vec2 ur = vec2(vUv.x, vWorld.y) / 5.0;
  vec3 rk = texture2D(tBare, ur).rgb;
  vec3 rn = texture2D(tBareN, ur).rgb;
  vec3 nr = bump(n0, vWorld, ur, (rn.xy - 0.5) * 1.6);
  float crack = smoothstep(0.25, 0.0, abs(under - 0.97) * 6.5);
  albedo = mix(albedo, mix(vec3(dot(rk, vec3(0.333))), rk, 0.8) * vec3(0.62, 0.54, 0.45) * (1.0 - 0.5 * crack), bare);
  n = normalize(mix(n, nr, bare));
  rough = mix(rough, 0.3 + 0.3 * (1.0 - rn.z), bare);
  occ = mix(occ, (0.45 + 0.55 * smoothstep(0.15, 0.6, rn.z)) * (0.55 + 0.45 * smoothstep(1.0, 0.6, under)), bare);
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  c += thread * 0.035 * skyIrradiance(vec3(0.0, 1.0, 0.0)) * skyOpen(vWorld);
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
uniform float uPool;
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
  float pick = smoothstep(-0.1, 0.1, 0.45 * (sa.z - sb.z) + vnoise(xz / 23.0 + 3.0) - 0.5);
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
  if (reach > 0.0) {
    det = mix(det, textureLod(tShingle, ud, footLevel(tShingle, udx, udy, 2.0)).rgb, (0.35 + 0.65 * close0) * reach);
    nh = mix(nh, textureLod(tShingleN, ud, footLevel(tShingleN, udx, udy, 2.0)).rgb, (0.35 + 0.65 * close0) * reach);
    sand = mix(sand, textureLod(tSand, us, footLevel(tSand, usx, usy, 2.0)).rgb, reach);
  }
  float fine = bedFine(xz);
  // The bed is the rig's: the same one the sheets of water are laid on. The plate's own relief stands on it.
  float h = landAt(xz).r + fine + 0.2 * (ps.z - 0.35) + 0.03 * (nh.z - 0.5);
  float over = h - uPool;
  // The map of the wet comes first: sheets of soaked sand drawn out toward the sea, with hard edges, between the bars of gravel. Soaked,
  // the floor is dark and a mirror; dry, it is pale and matt.
  vec2 sq = vec2(xz.x + 0.3 * xz.y, xz.y * 0.4);
  float soak = vnoise(sq / 13.0 + 11.0) * 0.5 + vnoise(sq / 4.7 + 4.0) * 0.32 + vnoise(xz / 1.9) * 0.18;
  float soaked = smoothstep(0.485, 0.515, soak - 0.3 * (ps.z - 0.35) - 0.12 * clamp(over, 0.0, 0.5) + 0.05 * (nh.z - 0.5) * close0 + 0.17);
  // Stones where the floor stands proud, rippled sand where it lies low.
  float bar = smoothstep(0.3, 0.52, ps.z + 0.5 * clamp(over, -0.2, 0.3) + 0.1 * (nh.z - 0.5) + 0.12 * close0);
  bar *= 1.0 - 0.8 * soaked;
  vec3 grain = mix(sand / 0.128, det / 0.122, bar);
  grain = mix(vec3(dot(grain, vec3(0.333))), grain, 0.5);
  // Close under the lens the plate is a smear: there it gives only its broad tone, and the stones and the sand carry the floor.
  float close = smoothstep(70.0, 8.0, length(cameraPosition - vWorld));
  vec3 broad = mix(plate, vec3(0.123, 0.13, 0.136), 0.8 * close);
  vec3 albedo = mix(broad, vec3(dot(broad, vec3(0.333))), 0.35) * mix(vec3(1.0), grain, mix(0.7, 1.0, close)) * 0.52;
  // Cast weed lies in dark patches on the bars and at the edge of the pools.
  float castWeed = smoothstep(0.6, 0.66, vnoise(xz / 7.3 + 7.0) * 0.55 + vnoise(xz / 2.1 + 1.0) * 0.3 + 0.15 * nh.z + 0.1 * bar);
  albedo = mix(albedo, vec3(0.04, 0.03, 0.012) * (0.5 + nh.z), 0.9 * castWeed);
  // What lies under the sheets is dark drowned sand; the plate's hollows hold a film that shows the sky; every stone above is wet.
  float under = smoothstep(0.01, -0.05, over);
  float low = smoothstep(0.24, 0.12, ps.z + 0.08 * (nh.z - 0.5));
  float wet = max(smoothstep(0.08, 0.01, over), 0.7 * low);
  wet = max(wet, soaked * (1.0 - castWeed));
  float film = wet * (1.0 - under);
  float damp = smoothstep(0.4, 0.1, over);
  float rough = mix(mix(0.6, 0.45, damp), 0.06, film);
  rough = mix(rough, 0.9, under);
  albedo *= mix(1.6, 0.5, max(wet, 0.35 * damp)) * mix(1.0, 0.55, under);
  vec2 g = (nh.xy - 0.5) * 2.2 * max(bar, 0.5 * close);
  vec3 n = normalize(vNormal + vec3(ps.x, 0.0, ps.y) * 2.6 * (1.0 - 0.85 * film) * (1.0 - 0.7 * close) * (1.0 - 0.8 * under) + vec3(g.x, 0.0, -g.y) * mix(1.0, 0.05, wet));
  float cavity = 0.55 + 0.45 * smoothstep(0.08, 0.4, ps.z);
  float occ = mix(cavity * (0.5 + 0.5 * smoothstep(0.1, 0.55, nh.z)), 1.0, wet);
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  // The film of water shows the cloud, not only the smooth sky; ruffled, it shows the sky a hand higher than a still one would.
  if (film > 0.02) {
    vec3 r = reflect(-v, n);
    r.y = abs(r.y) + 0.06;
    r = normalize(r);
    float f = 0.04 + 0.96 * pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 5.0);
    c = max(c + film * f * (skyCloud(vWorld, r) - skyRadiance(r)) * skyOpen(vWorld), vec3(0.0));
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
uniform float uWeedy;
uniform float uPool;
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
  float cover = smoothstep(-0.25, 0.35, n0.y + 0.7 * (vnoise(vWorld.xz * 0.9) - 0.5) + 0.3 * (nh.z - 0.5));
  cover *= uWeedy;
  // A stone on the floor has its own tone: some slate, some nearly black, a few pale.
  float tone = vnoise(vWorld.xz * 2.3 + 0.5);
  side = mix(vec3(dot(side, vec3(0.333))), side, 0.45);
  vec3 albedo = mix(side * mix(0.4 + 0.6 * tone, 0.55, uWeedy), wc * 0.5, 0.8 * cover);
  float rough = mix(mix(0.3, 0.45, uWeedy), 0.35, cover);
  // What stands in the pool or just out of it is soaked: near black and bright where it turns to the sky.
  float soak = smoothstep(uPool + 0.75, uPool + 0.15, vWorld.y + 0.3 * (vnoise(vWorld.xz * 1.7) - 0.5));
  albedo *= mix(1.0, 0.42, soak);
  rough = mix(rough, 0.16, soak);
  float occ = 0.5 + 0.5 * smoothstep(0.2, 0.6, nh.z);
  gl_FragColor = vec4(rigOut(rigShade(vWorld, n, v, albedo, rough, occ)), 1.0);
}`;
