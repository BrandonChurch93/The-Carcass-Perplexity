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
  vec3 detA = textureGrad(tRock, a1, gax, gay).rgb;
  vec3 nhA = textureGrad(tRockN, a1, gax, gay).rgb;
  vec3 detB = textureGrad(tRock, b1, gbx, gby).rgb;
  vec3 nhB = textureGrad(tRockN, b1, gbx, gby).rgb;
  // The wide laying, sheared so that its grooves do not line up with the small one's.
  vec2 uvW = mix(uvA, uvB, step(0.5, kB));
  vec2 a2 = vec2(uvW.x + 0.17 * uvW.y, uvW.y) / uGrain.y + 0.61;
  float sc = uGrain.x / uGrain.y;
  // The fin's sheet stands above its own weed: the film's weed and tide line are drawn here, not taken from it.
  vec2 lay = vec2(vLay.x, 0.215 + 0.78 * vLay.y);
  vec2 wx = mix(mix(gax, gbx, step(0.5, kB)) * sc, dFdx(lay), uFin);
  vec2 wy = mix(mix(gay, gby, step(0.5, kB)) * sc, dFdy(lay), uFin);
  a2 = mix(a2, lay, uFin);
  vec3 big = textureGrad(tWide, a2, wx, wy).rgb;
  vec3 nhW = textureGrad(tWideN, a2, wx, wy).rgb;
  vec3 det = mix(detA, detB, kB);
  vec3 nh = mix(nhA, nhB, kB);
  // The colony's sheet is mirrored where it meets itself: its slopes turn with it.
  vec2 mA = mix(vec2(1.0), 1.0 - 2.0 * mod(floor(a1), 2.0), step(0.5, uTier));
  vec2 mB = mix(vec2(1.0), 1.0 - 2.0 * mod(floor(b1), 2.0), step(0.5, uTier));
  float sheet = mix(1.3, 0.45, step(0.5, uTier));
  vec3 nA = bump(n0, vWorld, a1, (nhA.xy - 0.5) * mA * sheet);
  vec3 nB = bump(n0, vWorld, b1, (nhB.xy - 0.5) * mB * sheet);
  vec3 n = normalize(mix(nA, nB, kB));
  n = normalize(n + (bump(n0, vWorld, a2, (nhW.xy - 0.5) * mix(1.8, 1.6, uFin)) - n0));
  float lum = dot(big, vec3(0.333));
  float macro = vnoise(vBlade.yx * vec2(0.021, 0.008)) * 0.6 + vnoise(vBlade.yx * vec2(0.06, 0.027) + 5.0) * 0.4;
  vec3 albedo = mix(det * mix(vec3(1.0), big / 0.26, 0.4) * (0.85 + 0.4 * macro), big * mix(vec3(1.0), det / 0.265, 0.45) * (0.92 + 0.16 * macro), uFin);
  // Pale stone: ivory more than brown, the warmth left to the lichen.
  albedo = mix(vec3(dot(albedo, vec3(0.333))), albedo, mix(0.5, 0.75, uFin)) * uRockTint;
  // Beds that run the length of the blade: the soft ones worn back, grey and damp.
  float beds = vnoise(vec2(vBlade.y * 0.21 + 0.7 * macro, vBlade.x * 0.012)) * 0.6 + vnoise(vec2(vBlade.y * 0.74, vBlade.x * 0.03 + 3.0)) * 0.4;
  float soft = smoothstep(0.56, 0.4, beds) * (1.0 - kB);
  albedo *= 1.0 - 0.2 * soft;
  // The hollows of the wide laying hold the dark and the damp.
  float hollow = smoothstep(0.55, 0.2, nhW.z);
  albedo *= 1.0 - 0.22 * hollow;
  float y = vWorld.y;
  float tide = uTide - 4.0 + 7.0 * (vnoise(vWorld.xz / 13.0) - 0.5) + 3.0 * (vnoise(vWorld.xz / 2.7) - 0.5) + 3.0 * (nh.z - 0.5);
  float weed = smoothstep(tide + 0.5, tide - 0.5, y);
  float band = smoothstep(tide + 5.0, tide + 0.5, y);
  float damp = smoothstep(tide + 26.0, tide + 2.0, y);
  // The run of water and of white down a face: by the level way across it and the height, whichever plane it is laid on.
  vec2 fall = vec2(mix(vBlade.w, vBlade.z, kB * (1.0 - top)), y);
  float stain = smoothstep(0.42, 0.7, vnoise(fall * vec2(0.23, 0.021)) * 0.6 + vnoise(fall * vec2(0.9, 0.06) + 7.0) * 0.4);
  albedo *= mix(vec3(1.0), vec3(0.6, 0.62, 0.6), stain * 0.7);
  float roost = vnoise(fall * vec2(0.031, 0.045) + 2.0) * 0.65 + vnoise(fall * vec2(0.11, 0.13)) * 0.35;
  float run = vnoise(fall * vec2(1.3, 0.05) + 11.0) * 0.6 + vnoise(fall * vec2(4.1, 0.16)) * 0.4;
  float white = smoothstep(0.45, 0.75, run * (0.35 + 1.1 * roost) + 0.25 * (nh.z - 0.5)) * smoothstep(0.3, 0.55, roost);
  white = max(white, 0.8 * smoothstep(0.55, 0.9, n0.y) * smoothstep(0.3, 0.6, roost + 0.3 * (nh.z - 0.5)));
  white *= (1.0 - band) * smoothstep(tide + 4.0, tide + 30.0, y);
  // Rust lichen: in fields the size of a house, broken at the size of a hand, on what leans to the sky and the sun, never in the wet.
  float sunny = 0.5 + 0.5 * dot(n0, uSunDir);
  float field = vnoise(vWorld.xz * 0.019 + vWorld.y * 0.023 + 9.0) * 0.55 + vnoise(vBlade.yx * 0.09) * 0.3 + vnoise(vBlade.yx * 0.47) * 0.15;
  float lichen = smoothstep(0.6, 0.7, field + 0.3 * (nh.z - 0.5) + 0.28 * n0.y + 0.22 * (sunny - 0.5) - 0.25 * hollow) * (1.0 - band) * (1.0 - 0.8 * stain);
  if (uTier > 0.0) {
    // The colony's rock: dark wet grey, coursed; the white hangs from the edge of each ledge and the lichen lies in patches.
    // One sheet of a real stepped cliff, 40 m by 40 m: its own white and its own lichen; a little more of each is laid over it.
    // The coursed tile is laid small over it for what the lens sees at arm's length.
    albedo = det * mix(vec3(1.0), big / vec3(0.229, 0.21, 0.178), 0.6) * (0.9 + 0.2 * macro) * uRockTint;
    damp *= 0.4;
    albedo = mix(albedo, vec3(0.62, 0.3, 0.06) * (0.6 + 0.8 * nhW.z), 0.25 * lichen * (1.0 - 0.7 * white));
    albedo = mix(albedo, vec3(0.8, 0.79, 0.75) * (0.75 + 0.5 * nhW.z), 0.35 * white);
  } else {
    albedo = mix(albedo, vec3(0.62, 0.34, 0.09) * (0.5 + 1.6 * det.r), 0.75 * lichen * (1.0 - 0.6 * uFin));
    albedo = mix(albedo, vec3(0.8, 0.79, 0.76) * (0.6 + 1.3 * det.g), 0.6 * white);
  }
  albedo *= mix(1.0, 0.72, damp) * mix(1.0, 0.14, band);
  vec3 wc = texture2D(tWeed, fall / 7.0).rgb;
  albedo = mix(albedo, wc * 0.9, weed);
  float rough = mix(0.92, 0.45, max(weed, band));
  float occ = (0.45 + 0.55 * smoothstep(0.2, 0.6, nh.z)) * (0.55 + 0.45 * smoothstep(0.25, 0.6, nhW.z)) * mix(1.0, 0.45, weed) * vShade * (1.0 - 0.3 * soft);
  occ = mix(occ, 0.5 + 0.5 * occ, step(0.5, uTier));
  vec3 lit = rigShade(vWorld, n, v, albedo, rough, occ);
  // Against the light the edge of the stone burns: the sun grazes round the rough rim toward the lens.
  float edge = 1.0 - max(dot(n, v), 0.0);
  float back = max(dot(-v, uSunDir), 0.0);
  lit += albedo * uSunColour * (0.3 * edge * edge * edge * back * back * sunAt(vWorld, landAt(vWorld.xz)) * occ);
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
  vec3 n = bump(n0, vWorld, uw, (wn.xy - 0.5) * m * 2.2);
  n = normalize(n + (bump(n0, vWorld, ud, (nh.xy - 0.5) * 1.1) - n0));
  float fine = dot(det, vec3(0.333)) / 0.039;
  vec3 albedo = wall * mix(1.0, fine, 0.45) * 0.7;
  // Threads of water running down off the hems.
  float thread = smoothstep(0.78, 0.95, vnoise(vec2(vUv.x * 5.0, vUv.y * 0.35 + uTime * 0.9))) * smoothstep(0.5, 0.9, vnoise(vec2(vUv.x * 0.7, vUv.y * 0.11 + 3.0)));
  float rough = mix(0.38 + 0.3 * (1.0 - wn.z), 0.12, thread);
  float occ = (0.25 + 0.75 * smoothstep(0.08, 0.5, wn.z)) * (0.6 + 0.4 * smoothstep(0.2, 0.7, nh.z)) * (0.6 + 0.4 * vShade);
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
void plateAt(vec2 xz, vec2 cs, vec2 size, vec2 shift, out vec3 colour, out vec3 slope) {
  vec2 uv = vec2(xz.x * cs.x + xz.y * cs.y, xz.y * cs.x - xz.x * cs.y) / size + shift;
  vec2 m = 1.0 - 2.0 * mod(floor(uv), 2.0);
  colour = texture2D(tPlate, uv).rgb;
  vec3 nh = texture2D(tPlateN, uv).rgb;
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
  vec3 det = texture2D(tShingle, ud).rgb;
  vec3 nh = texture2D(tShingleN, ud).rgb;
  vec3 sand = texture2D(tSand, vec2(xz.y, -xz.x) / 4.0 + 0.37).rgb;
  float fine = bedFine(xz);
  // The bed is the rig's: the same one the sheets of water are laid on. The plate's own relief stands on it.
  float h = landAt(xz).r + fine + 0.2 * (ps.z - 0.35) + 0.03 * (nh.z - 0.5);
  float over = h - uPool;
  // Stones where the floor stands proud, rippled sand where it lies low.
  float bar = smoothstep(0.3, 0.52, ps.z + 0.5 * clamp(over, -0.2, 0.3) + 0.1 * (nh.z - 0.5));
  vec3 grain = mix(sand / 0.128, det / 0.122, bar);
  vec3 albedo = plate * mix(vec3(1.0), grain, 0.7) * 1.15;
  // What lies under the sheets is dark drowned sand; the plate's hollows hold a film that shows the sky; every stone above is wet.
  float under = smoothstep(0.01, -0.05, over);
  float low = smoothstep(0.24, 0.12, ps.z + 0.08 * (nh.z - 0.5));
  float wet = max(smoothstep(0.16, 0.03, over), low);
  float film = wet * (1.0 - under);
  float damp = smoothstep(0.4, 0.1, over);
  float rough = mix(mix(0.5, 0.34, damp), 0.06, film);
  rough = mix(rough, 0.9, under);
  albedo *= mix(1.0, 0.72, damp) * mix(1.0, 0.55, under);
  vec2 g = (nh.xy - 0.5) * 3.5 * bar;
  vec3 n = normalize(vNormal + vec3(ps.x, 0.0, ps.y) * 2.6 * (1.0 - 0.85 * film) + vec3(g.x, 0.0, -g.y) * mix(1.0, 0.05, wet));
  float cavity = 0.55 + 0.45 * smoothstep(0.08, 0.4, ps.z);
  float occ = mix(cavity * (0.5 + 0.5 * smoothstep(0.1, 0.55, nh.z)), 1.0, wet);
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  // The film of water shows the cloud, not only the smooth sky; ruffled, it shows the sky a hand higher than a still one would.
  if (film > 0.02) {
    vec3 r = reflect(-v, n);
    r.y = abs(r.y) + 0.06;
    r = normalize(r);
    float f = 0.04 + 0.96 * pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 5.0);
    c += film * f * (skyCloud(vWorld, r) - skyRadiance(r)) * skyOpen(vWorld);
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
  vec3 albedo = mix(vec3(0.17, 0.175, 0.18), vec3(0.045, 0.042, 0.035), smoothstep(tide + 3.0, tide - 3.0, vWorld.y));
  vec3 c = rigShade(vWorld, normalize(vNormal), normalize(vAt - vWorld), albedo, 1.0, 0.8);
  c = mix(uHaze * 0.9, c, exp(-length(vWorld - vAt) * 0.0006));
  // The wind's ripple breaks the image into streaks that lie across the line of sight.
  float streak = 0.5 + 0.5 * vnoise(vec2(dot(vAt.xz, normalize(toEye.xz)) * 1.7, dot(vAt.xz, normalize(toEye.zx * vec2(1.0, -1.0))) * 0.3) + uTime * 0.5);
  gl_FragColor = vec4(rigOut(c), 0.5 * wet * smoothstep(0.02, 0.45, f) * streak * (1.0 - uSolo));
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
void main() {
  vec3 n0 = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  // The picture is laid on the plane the face lies nearest, so that it is not drawn out on any side.
  vec3 an = abs(n0);
  vec2 flat2 = an.y > max(an.x, an.z) ? vWorld.xz : (an.x > an.z ? vWorld.zy : vWorld.xy);
  vec2 us = flat2 / mix(1.1, 3.0, uWeedy) + 0.31;
  vec2 ut = flat2 / 1.7;
  vec3 side = texture2D(tBoulder, us).rgb;
  vec3 nh = texture2D(tBoulderN, us).rgb;
  vec3 wc = texture2D(tWeed, ut).rgb;
  vec3 n = bump(n0, vWorld, us, (nh.xy - 0.5) * mix(1.0, 2.6, uWeedy));
  float cover = smoothstep(-0.25, 0.35, n0.y + 0.7 * (vnoise(vWorld.xz * 0.9) - 0.5) + 0.3 * (nh.z - 0.5));
  cover *= uWeedy;
  // A stone on the floor has its own tone: some slate, some nearly black, a few pale.
  float tone = vnoise(vWorld.xz * 2.3 + 0.5);
  vec3 albedo = mix(side * mix(0.7 + 0.9 * tone, 0.6, uWeedy), wc * 0.55, 0.75 * cover);
  float rough = mix(mix(0.3, 0.45, uWeedy), 0.35, cover);
  float occ = 0.5 + 0.5 * smoothstep(0.2, 0.6, nh.z);
  gl_FragColor = vec4(rigOut(rigShade(vWorld, n, v, albedo, rough, occ)), 1.0);
}`;
