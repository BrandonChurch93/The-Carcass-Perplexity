// The stone of a blade. A blade is one clean sweep whose plates and keel are in the mesh (blade.ts); its stone is one generated sheet laid
// along the sweep (TUSK_FRAGMENT). The light falls on the sheet's slopes turned into the world by the ring's own frame (aAlong, aAcross).
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const FIN_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vBlade;
varying vec3 vNb;
varying vec2 vLay;
varying vec3 vAlong;
varying vec3 vAcross;
varying vec3 vCrag;
attribute vec4 aBlade;
attribute vec3 aNb;
attribute vec3 aAlong;
attribute vec3 aAcross;
attribute vec3 aCrag;
void main() {
  // The broken rock is in the mesh itself (blade.ts): nothing is raised here, so the normal is the rock's own.
  vLay = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  // No normalize of what may have no length: a value that is no number spreads over every pixel of its triangles.
  vec3 nw = mat3(modelMatrix) * normal;
  vNormal = nw * inversesqrt(max(dot(nw, nw), 1e-12));
  vBlade = aBlade;
  vNb = aNb;
  vAlong = aAlong;
  vAcross = aAcross;
  vCrag = aCrag;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// The stone of the near cliff, as it was: the Builder's blade seen side on, rectified to a sheet (land/fin.jpg and its heights), with the
// colony's bedded stone on its cap. The tusks do not use it.
export const FIN_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vBlade;
varying vec3 vNb;
varying vec2 vLay;
varying vec3 vAlong;
varying vec3 vAcross;
varying vec3 vCrag;
${RIG_GLSL}
${NOISE_GLSL}
uniform sampler2D tRock;
uniform sampler2D tWide;
uniform sampler2D tWideN;
uniform sampler2D tWeed;
uniform float uTide;
uniform sampler2D tColony;
uniform sampler2D tColonyN;
uniform float uGrain;
uniform float uLift;
uniform float uRock;
uniform float uCap;
// The cliff's sheet on the upright plane a face looks along, to and fro up the blade so that it has no seam: (colour, height) and its slopes.
// The sheet's foot is weed and its top a ledge: both are left out.
void cliff(vec2 at, float size, float lod, out vec3 colour, out vec3 slopes) {
  float up = at.y / (0.78 * size);
  float fro = abs(fract(up * 0.5) * 2.0 - 1.0);
  vec2 uc = vec2(at.x / size, 0.14 + 0.78 * fro);
  colour = textureLod(tColony, uc, lod).rgb;
  vec3 nh = textureLod(tColonyN, uc, lod).rgb;
  float mirror = 1.0 - 2.0 * mod(floor(uc.x), 2.0);
  float froSign = fract(up * 0.5) < 0.5 ? -1.0 : 1.0;
  slopes = vec3((nh.xy - 0.5) * vec2(mirror, froSign), nh.z);
}
void main() {
  vec3 n0 = normalize(vNormal + vec3(0.0, 1e-5, 0.0));
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 w = abs(normalize(vNb + vec3(1e-5)));
  w *= w;
  // 0 on a broad face, 1 on the thin edge of the blade.
  float edge = smoothstep(0.3, 0.7, w.y / (w.y + w.z + 1e-4));
  // The metres one pixel covers here: every picture laid by the world takes its level from it.
  float foot = max(length(dFdx(vWorld)), length(dFdy(vWorld)));
  float macro = vnoise(vWorld.xz * 0.006 + vWorld.y * 0.004) * 0.6 + vnoise(vBlade.yx * vec2(0.06, 0.027) + 5.0) * 0.4;
  float crack = vCrag.x;
  float tone = vCrag.y;
  float deep = vCrag.z;

  // The rock is laid by the world, never along the blade: on the upright plane the face looks along. Twice: beds of a house's height,
  // and the same sheet again a third the size, turned and shifted, for the breaks a man could climb.
  float h2 = n0.x * n0.x + n0.z * n0.z;
  float facing = step(0.5, n0.x * n0.x / (h2 + 1e-5));
  float level0 = smoothstep(0.62, 0.8, abs(n0.y));
  vec2 plane = facing > 0.5 ? vWorld.zy : vWorld.xy + vec2(47.0, 0.0);
  vec3 level1 = facing > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  // The beds of the blade lie along its spine, as a tusk's do: the wide sheet is laid by the blade's own metres (along, across on a broad
  // face, through on a thin edge), its beds along the spine, and goes to and fro across so that it has no seam.
  float thin = step(0.5, edge);
  float bedY = mix(vBlade.y, vBlade.z + 31.0, thin) + 14.0 * (macro - 0.5);
  vec2 wide = vec2(vBlade.x, bedY);
  // The near cliff is a drum, not a blade: its beds lie level, by the world.
  if (uCap > 0.5) wide = vec2(plane.x, vWorld.y + 0.16 * vWorld.x - 0.11 * vWorld.z + 14.0 * (macro - 0.5));
  float lr = log2(max(foot * 1254.0 / uRock, 1e-6));
  vec3 stone;
  vec3 slopes;
  cliff(wide, uRock, lr, stone, slopes);
  vec3 alongW = normalize(vAlong + vec3(0.0, 1e-5, 0.0));
  vec3 acrossW = thin > 0.5 ? normalize(cross(vAlong, vAcross) + vec3(0.0, 0.0, 1e-5)) : normalize(vAcross + vec3(1e-5, 0.0, 0.0));
  if (uCap > 0.5) {
    alongW = level1;
    acrossW = vec3(0.0, 1.0, 0.0);
  }
  float fineSize = uRock * 0.29;
  vec2 fine = plane * mat2(0.96, 0.28, -0.28, 0.96) + vec2(11.0, 0.0);
  float lf = log2(max(foot * 1254.0 / fineSize, 1e-6));
  vec3 stoneF = vec3(0.3);
  vec3 slopesF = vec3(0.0, 0.0, 0.5);
  float nearF = 1.0 - smoothstep(2.5, 4.5, lf);
  if (nearF > 0.001) cliff(fine, fineSize, lf, stoneF, slopesF);
  // A face that looks up or down has the sheet lying on it.
  if (level0 > 0.001) {
    vec2 ut = vWorld.xz / (uRock * 0.5) * vec2(1.0, 0.7) + vec2(0.0, 0.2);
    stone = mix(stone, textureLod(tColony, ut, lr + 1.0).rgb, level0);
  }
  float lumW = dot(stone, vec3(0.333));
  float lumF = dot(stoneF, vec3(0.333));
  // The fine sheet carries its marks into the wide one: its darks are cracks, its lights the faces between.
  stone *= mix(1.0, clamp(lumF / 0.2, 0.5, 1.6), 0.5 * nearF);
  // The same rock again, four times the size and turned: no repeat of the first is seen from far off.
  vec2 uf = plane * mat2(0.83, 0.56, -0.56, 0.83) / 37.0 + 0.31;
  float far2 = 0.55 + 0.9 * vnoise(uf);

  // The bone tile, small, only where the lens is near enough to see it: on the broad face by (across, along), on the edge by (through, along).
  vec2 a1 = vBlade.yx / uGrain;
  vec2 b1 = vBlade.zx / uGrain + 0.37;
  float la = log2(max(foot * 1024.0 / uGrain, 1e-6));
  float near = 1.0 - smoothstep(0.5, 2.5, la);
  vec3 dA = vec3(0.265);
  vec3 dB = vec3(0.265);
  if (near > 0.001 && edge < 0.999) dA = textureLod(tRock, a1, la).rgb;
  if (near > 0.001 && edge > 0.001) dB = textureLod(tRock, b1, la).rgb;
  float fineLum = mix(1.0, dot(mix(dA, dB, edge), vec3(0.333)) / 0.265, near);

  // The slopes of both sheets turn the rock's own normal on the plane it is laid by.
  vec2 gr = slopesF.xy * 1.6 * nearF * (1.0 - level0);
  vec3 lean = -(level1 * gr.x + vec3(0.0, 1.0, 0.0) * gr.y) - (alongW * slopes.x + acrossW * slopes.y) * 2.0;
  lean -= n0 * dot(lean, n0);
  vec3 n = normalize(n0 + lean);
  // A ledge is where the broken rock looks up; under an overhang it looks down.
  float shelf = smoothstep(0.3, 0.7, n0.y);
  float under = smoothstep(-0.15, -0.6, n0.y);

  // Pale bone-stone: weathered limestone, grey-ivory, with the sheet's own marks at their full strength. Each plate has its own tone.
  float stoneLum = lumW * mix(1.0, clamp(lumF / 0.2, 0.5, 1.6), 0.5 * nearF);
  float sunny = 0.5 + 0.5 * dot(n0, uSunDir);
  float field = vnoise(vWorld.xz * 0.019 + vWorld.y * 0.027 + 9.0) * 0.6 + vnoise(vWorld.xz * 0.11 + vWorld.y * 0.09) * 0.4;
  // Lichen: rust and ochre where a face sees the sky and the sun, in patches, thick on the ledges; the sheet's own rust shows through it.
  float rusty = smoothstep(0.03, 0.14, stone.r - stone.b);
  float lichen = smoothstep(0.7, 0.8, field + 0.35 * n0.y + 0.3 * (sunny - 0.5) + 0.25 * shelf + 0.12 * rusty + 0.04 * uCap - 0.3 * deep);
  vec3 albedo = mix(vec3(mix(0.2, stoneLum, 0.62)) * vec3(1.03, 1.0, 0.95), stone * vec3(1.12, 1.0, 0.86), 0.08 + 0.12 * rusty);
  albedo *= mix(3.1, 3.3, uCap) * mix(1.0, clamp(far2, 0.4, 1.8), 0.25) * fineLum * (0.82 + 0.36 * macro) * (1.0 + 0.2 * tone);
  albedo = mix(albedo, vec3(0.62, 0.29, 0.045) * clamp(stoneLum / 0.22, 0.5, 1.6), 0.8 * lichen);
  // Over hundreds of metres the stone changes: cold grey here, warm ivory there.
  albedo *= mix(vec3(0.97, 0.99, 1.02), vec3(1.07, 1.0, 0.9), smoothstep(0.3, 0.7, macro));
  // The near cliff's cap: pale layered stone, cream more than grey, its lichen in patches.
  if (uCap > 0.0) {
    vec3 cream = vec3(0.48, 0.455, 0.405) * clamp(stoneLum / 0.19, 0.45, 1.6) * fineLum * (0.85 + 0.3 * macro) * (1.0 + 0.2 * tone);
    cream = mix(cream, vec3(0.42, 0.2, 0.04) * clamp(stoneLum / 0.19, 0.6, 1.4), 0.6 * smoothstep(0.56, 0.7, field + 0.25 * shelf));
    albedo = mix(albedo, cream, 0.85 * uCap);
  }
  // What runs down a face runs by the level way across it and the height.
  vec2 fall = vec2(mix(vBlade.w, vBlade.z, edge), vWorld.y);
  // White lies on the ledges where things roost, and runs down from them in streaks.
  float runs = smoothstep(0.55, 0.8, vnoise(vec2(fall.x * 0.55, fall.y * 0.035 + 3.0)) * 0.65 + 0.35 * vnoise(vec2(fall.x * 1.9, fall.y * 0.11)));
  float white = max(0.7 * shelf, 0.55 * runs * (1.0 - under)) * smoothstep(0.4, 0.62, field + 0.1 * tone) * (1.0 - 0.6 * crack);
  albedo = mix(albedo, vec3(0.66, 0.65, 0.62) * (0.7 + 0.5 * stoneLum / 0.19), white * (1.0 - 0.75 * lichen));
  // A crack between two plates is black, and what lies deep among its neighbours is stained.
  albedo *= mix(1.0, 0.8, crack * crack) * mix(1.0, 0.85, deep * deep);

  float y = vWorld.y;
  float tide = uTide - 4.0 + 7.0 * (far2 - 1.0) + 3.0 * (field - 0.5);
  float weed = smoothstep(tide + 0.5, tide - 0.5, y);
  float band = smoothstep(tide + 5.0, tide + 0.5, y);
  // The foot of a blade is wet and dark to well over a house's height, its upper line ragged and following the beds.
  float wetTop = tide + 46.0 + 50.0 * (macro - 0.5) + 16.0 * (far2 - 1.0);
  float damp = max(smoothstep(tide + 40.0 + 30.0 * (macro - 0.5), tide + 2.0, y), 1.3 * smoothstep(wetTop + 5.0, wetTop - 5.0, y));
  // Seep: dark wet bands that follow the beds, a few to a blade, each broken along its length.
  float seep = smoothstep(0.6, 0.8, vnoise(vec2(bedY * 0.021, 7.0 + fall.x * 0.004)) * 0.7 + 0.3 * macro) * smoothstep(0.35, 0.6, field);
  albedo *= mix(vec3(1.0), vec3(0.6, 0.62, 0.62), 0.7 * seep);
  albedo *= mix(1.0, 0.42, min(damp, 1.3) * (1.0 - 0.85 * uCap)) * mix(1.0, 0.14, band);
  // The near cliff is one wet dark mass well above its weed: only its rim is pale.
  float wetWall = uCap * smoothstep(tide + 24.0 + 9.0 * (field - 0.5), tide + 13.0 + 9.0 * (field - 0.5), y);
  albedo = mix(albedo, vec3(0.036, 0.033, 0.026) * (0.5 + stoneLum / 0.19), 0.9 * wetWall);
  if (weed > 0.001) albedo = mix(albedo, texture2D(tWeed, fall / 7.0).rgb * 0.9, weed);
  float rough = mix(mix(0.92, 0.45, max(weed, band)), 0.72, wetWall * (1.0 - max(weed, band)));
  // The hollows of both sheets, the cracks and the gone plates hold shade; what hangs over sees the wet floor and not the sky.
  float hollow = smoothstep(0.2, 0.55, slopes.z) * mix(1.0, smoothstep(0.15, 0.5, slopesF.z), 0.7 * nearF);
  float occ = (0.78 + 0.22 * hollow) * (0.88 + 0.12 * smoothstep(0.55, 1.0, fineLum)) * mix(1.0, 0.45, weed);
  occ *= (1.0 - 0.4 * crack * crack) * (1.0 - 0.4 * deep * deep) * (0.6 + 0.4 * smoothstep(-0.55, 0.25, n0.y));
  vec3 lit = rigShade(vWorld, n, v, albedo, rough, occ);
  // Against the light the edge of the stone burns.
  float rim = 1.0 - max(dot(n, v), 0.0);
  float back = max(dot(-v, uSunDir), 0.0);
  if (back * rim > 0.2) lit += albedo * uSunColour * (0.3 * rim * rim * rim * back * back * sunAt(vWorld, landAt(vWorld.xz)) * occ);
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;

// The stone of a tusk blade (every blade but the near cliff). One generated sheet of pale fractured limestone whose seams run along its
// x (land/tusk.jpg, with its slopes) is laid by the blade's own metres, seams along the spine, at two sizes turned against each other;
// lichen is a second sheet (land/lichen.jpg) whose crusts cut the edge of every patch. The mesh carries the plates and the keel.
export const TUSK_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vBlade;
varying vec3 vNb;
varying vec2 vLay;
varying vec3 vAlong;
varying vec3 vAcross;
varying vec3 vCrag;
${RIG_GLSL}
${NOISE_GLSL}
uniform sampler2D tTusk;
uniform sampler2D tTuskN;
uniform sampler2D tLichen;
uniform sampler2D tWeed;
uniform float uTide;
uniform vec3 uTuskMean;
uniform vec2 uSize;
uniform float uLichen;
// One laying of the sheet, size metres along the spine: its colour and (slope along, slope across, height).
void laid(vec2 at, float size, float lod, out vec3 colour, out vec3 slopes) {
  vec2 uc = vec2(at.x / size, at.y / (size * 0.6667));
  colour = textureLod(tTusk, uc, lod).rgb;
  vec3 nh = textureLod(tTuskN, uc, lod).rgb;
  slopes = vec3(nh.xy - 0.5, nh.z);
}
void main() {
  vec3 n0 = normalize(vNormal + vec3(0.0, 1e-5, 0.0));
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 w = abs(normalize(vNb + vec3(1e-5)));
  w *= w;
  // 0 on a broad face, 1 on the thin edge of the blade.
  float edge = smoothstep(0.3, 0.7, w.y / (w.y + w.z + 1e-4));
  float thin = step(0.5, edge);
  float foot = max(length(dFdx(vWorld)), length(dFdy(vWorld)));
  float macro = vnoise(vWorld.xz * 0.006 + vWorld.y * 0.004) * 0.6 + vnoise(vBlade.yx * vec2(0.06, 0.027) + 5.0) * 0.4;
  float crack = vCrag.x;
  float tone = vCrag.y;
  float deep = vCrag.z;
  // The stone is bedded in the world, not along the blade: its beds lie near level, dip one way over the whole reef, and the sweep
  // of a blade cuts across them. A sheet laid along the spine made grooves the length of the blade, which read as grain or as horn.
  // The sheet is laid on the upright plane a face looks out of most squarely, x or z, and on a top by the ground; the height of a
  // bed is the same in each, so that the beds join round a corner. One plane for all would smear on the faces that lie along it.
  float warp = 6.0 * (vnoise(vWorld.xz * 0.011 + vWorld.y * 0.006 + 2.0) - 0.5);
  vec3 an = abs(n0);
  float top = step(0.8, an.y);
  float side = step(an.z, an.x) * (1.0 - top);
  vec2 lay = vec2(mix(vWorld.x, vWorld.z + 13.0, side), vWorld.y + 0.16 * vWorld.x + mix(0.4, 1.0, top) * vWorld.z + warp);
  float WIDE = uSize.x;
  float FINE = uSize.y;
  float lw = log2(max(foot * 1536.0 / WIDE, 1e-6));
  vec3 cW;
  vec3 sW;
  laid(lay, WIDE, lw, cW, sW);
  float lf = log2(max(foot * 1536.0 / FINE, 1e-6));
  float nearF = 1.0 - smoothstep(3.0, 5.0, lf);
  vec3 cF = uTuskMean;
  vec3 sF = vec3(0.0, 0.0, 0.5);
  if (nearF > 0.001) laid(lay * mat2(0.995, 0.1, -0.1, 0.995) + vec2(17.0, 5.0), FINE, lf, cF, sF);
  float meanLum = dot(uTuskMean, vec3(0.333));
  float lumW = dot(cW, vec3(0.333)) / meanLum;
  float lumF = mix(1.0, dot(cF, vec3(0.333)) / meanLum, nearF);
  float marks = clamp(1.0 + 1.5 * (lumW - 1.0), 0.4, 1.4) * clamp(1.0 + 1.9 * (lumF - 1.0), 0.35, 1.5);
  // The same sheet stood on end: there its seams are joints that stand across the beds, and with them cut the stone into angular blocks.
  float CROSS = uSize.x * 0.45;
  vec2 layX = vec2(lay.y + 0.3 * lay.x, lay.x + 4.0 * (vnoise(lay.yx * vec2(0.05, 0.016)) - 0.5)) + vec2(31.0, 7.0);
  vec3 cX;
  vec3 sX;
  laid(layX, CROSS, log2(max(foot * 1536.0 / CROSS, 1e-6)), cX, sX);
  marks *= clamp(1.0 + 1.3 * (dot(cX, vec3(0.333)) / meanLum - 1.0), 0.45, 1.35);
  // Beds of unlike thickness, each of its own tone; a strong one stands out as a low ledge with a dark line under it, and a ledge
  // dies out along the face. Gone before a bed is finer than two pixels.
  float BED = 5.2;
  float bedAt = lay.y / BED;
  float bc = bedAt + 0.34 * sin(bedAt * 2.1) + 0.14 * sin(bedAt * 5.3 + 1.0);
  float bk = floor(bc);
  float bf = bc - bk;
  float bedPx = foot / BED;
  float bedShow = 1.0 - smoothstep(0.2, 0.5, bedPx);
  float bedStrong = smoothstep(0.4, 0.66, vnoise(vec2(bk * 1.7 + 0.5, lay.x * 0.021))) * bedShow;
  float bedAbove = smoothstep(0.4, 0.66, vnoise(vec2((bk + 1.0) * 1.7 + 0.5, lay.x * 0.021))) * bedShow;
  // bf runs upward: the lip of the bed below is at bf 0, and the dark under a ledge lies at the top of a bed, under the next.
  float lip = bedStrong * (1.0 - smoothstep(0.0, max(0.06, 1.5 * bedPx), bf));
  float ledge = bedAbove * smoothstep(1.0 - max(0.1, 2.0 * bedPx), 1.0, bf);
  marks *= (1.0 + 0.24 * (hash12(vec2(bk, 3.5)) - 0.5) * bedShow) * (1.0 - 0.55 * ledge) * (1.0 + 0.16 * lip);
  // Under a ledge the white of what roosts on it has run down the face in thin streaks, a bed or less long.
  float strings = smoothstep(0.5, 0.7, vnoise(vec2(lay.x * 1.3, bk * 7.3)) * 0.6 + 0.4 * vnoise(vec2(lay.x * 4.1, bk * 3.1 + bc * 0.7)));
  float streaked = bedAbove * smoothstep(0.25, 0.95, bf) * strings;
  // The ways the sheet's x and y run on this face.
  vec3 du = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), side);
  vec3 dv = vec3(0.16, 1.0, mix(0.4, 1.0, top));
  vec3 alongW = du - n0 * dot(du, n0);
  alongW *= inversesqrt(max(dot(alongW, alongW), 1e-6));
  vec3 acrossW = dv - n0 * dot(dv, n0);
  acrossW *= inversesqrt(max(dot(acrossW, acrossW), 1e-6));
  vec2 g = sW.xy * 2.8 + sF.xy * 2.1 * nearF;
  vec3 lean = alongW * (g.x - 2.0 * sX.y) - acrossW * (g.y - 2.0 * sX.x + 1.2 * ledge - 0.5 * lip);
  lean -= n0 * dot(lean, n0);
  vec3 n = normalize(n0 + lean);
  float shelf = smoothstep(0.3, 0.7, n0.y);
  float under = smoothstep(-0.15, -0.6, n0.y);

  // Pale stone: ivory where it is dry and sunned, cold grey in its hollows and on its lee. Each plate has its own tone.
  vec3 hue = mix(cW / max(dot(cW, vec3(0.333)), 1e-3), vec3(1.0), 0.35);
  vec3 albedo = hue * vec3(0.6, 0.59, 0.555) * marks * (0.8 + 0.4 * macro) * (1.0 + 0.3 * tone);
  albedo *= mix(vec3(0.95, 0.98, 1.03), vec3(1.07, 1.0, 0.9), smoothstep(0.3, 0.7, macro));
  float sunny = 0.5 + 0.5 * dot(n0, uSunDir);
  float field = vnoise(vWorld.xz * 0.019 + vWorld.y * 0.027 + 9.0) * 0.6 + vnoise(vWorld.xz * 0.11 + vWorld.y * 0.09) * 0.4;
  // Lichen: rust and ochre where a face sees the sky and the sun, in patches a house across whose edges are the crusts of the sheet.
  float LICH = uSize.y * 1.3;
  vec2 ul = vec2(vWorld.y + 0.37 * lay.y, mix(vBlade.w, vBlade.z, edge) * 1.5 + 0.21 * lay.x) / LICH + 0.19;
  float ll = log2(max(foot * 1536.0 / LICH, 1e-6));
  vec3 crust = textureLod(tLichen, ul, ll).rgb;
  float crusted = smoothstep(0.06, 0.3, crust.r - crust.b);
  float lichen = smoothstep(0.57 + uLichen, 0.63 + uLichen, 0.95 * field + 0.2 * n0.y + 0.22 * (sunny - 0.5) + 0.1 * shelf + 0.14 * (crusted - 0.5) + 0.08 * edge - 0.2 * deep);
  lichen *= 0.7 + 0.3 * crusted;
  albedo = mix(albedo, mix(vec3(0.5, 0.25, 0.06), crust * vec3(1.2, 1.0, 0.75), 0.5) * clamp(marks, 0.6, 1.3), 0.85 * lichen);
  // What runs down a face runs by the level way across it and the height.
  vec2 fall = vec2(mix(vBlade.w, vBlade.z, edge), vWorld.y);
  // White lies on what looks up, where things roost, and runs down from it in thin streaks.
  float runs = smoothstep(0.58, 0.8, vnoise(vec2(fall.x * 0.55, fall.y * 0.035 + 3.0)) * 0.65 + 0.35 * vnoise(vec2(fall.x * 1.9, fall.y * 0.11)));
  float white = max(max(0.6 * shelf, 0.45 * runs * (1.0 - under)), 0.75 * streaked * (1.0 - under)) * smoothstep(0.42, 0.62, field + 0.1 * tone) * (1.0 - 0.6 * crack);
  albedo = mix(albedo, vec3(0.7, 0.69, 0.66) * clamp(marks, 0.7, 1.2), white * (1.0 - 0.8 * lichen));
  // A crack between two plates is dark, and what lies deep among its neighbours is stained.
  albedo *= mix(1.0, 0.86, crack * crack) * mix(1.0, 0.9, deep * deep);

  float y = vWorld.y;
  float far2 = 0.55 + 0.9 * vnoise((vWorld.xy + vWorld.zz) * mat2(0.83, 0.56, -0.56, 0.83) / 37.0 + 0.31);
  float tide = uTide - 4.0 + 7.0 * (far2 - 1.0) + 3.0 * (field - 0.5);
  float weed = smoothstep(tide + 0.5, tide - 0.5, y);
  float band = smoothstep(tide + 5.0, tide + 0.5, y);
  // The foot of a blade is wet and grey to well over a house's height, its upper line ragged.
  float wetTop = tide + 40.0 + 44.0 * (macro - 0.5) + 14.0 * (far2 - 1.0);
  float damp = max(smoothstep(tide + 36.0 + 30.0 * (macro - 0.5), tide + 2.0, y), 1.2 * smoothstep(wetTop + 6.0, wetTop - 6.0, y));
  // Seep: dark wet bands that follow the seams, a few to a blade, each broken along its length.
  float seep = smoothstep(0.62, 0.8, vnoise(vec2(lay.x * 0.004 + 7.0, lay.y * 0.05)) * 0.7 + 0.3 * macro) * smoothstep(0.35, 0.6, field);
  albedo *= mix(vec3(1.0), vec3(0.8, 0.81, 0.82), 0.5 * seep);
  albedo *= mix(1.0, 0.5, min(damp, 1.2)) * mix(1.0, 0.14, band);
  albedo = mix(albedo, textureLod(tWeed, fall / 7.0, log2(max(foot * 1024.0 / 7.0, 1.0))).rgb * 0.9, weed);
  float rough = mix(0.9, 0.45, max(weed, band));
  float hollow = smoothstep(0.25, 0.55, sW.z) * mix(1.0, smoothstep(0.2, 0.5, sF.z), 0.6 * nearF);
  float occ = (0.8 + 0.2 * hollow) * mix(1.0, 0.45, weed);
  occ *= (1.0 - 0.2 * crack * crack) * (1.0 - 0.3 * deep * deep) * (0.62 + 0.38 * smoothstep(-0.55, 0.25, n0.y));
  vec3 lit = rigShade(vWorld, n, v, albedo, rough, occ);
  // Against the light the edge of the stone burns.
  float rim = 1.0 - max(dot(n, v), 0.0);
  float back = max(dot(-v, uSunDir), 0.0);
  if (back * rim > 0.2) lit += albedo * uSunColour * (0.3 * rim * rim * rim * back * back * sunAt(vWorld, landAt(vWorld.xz)) * occ);
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;

// A stack of the gate, drawn from the Builder's own stack (land/stack-a.jpg, stack-b.jpg: 70 m of dark wet rock, its lower half hung with
// olive weed), laid round the pillar by (way round, height), mirrored where it meets itself; its seam is turned from the lens. Above the
// 70 m of the picture its upper rock goes on, to and fro.
export const STACK_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
${RIG_GLSL}
${NOISE_GLSL}
uniform sampler2D tStack;
uniform sampler2D tStackN;
uniform sampler2D tRock;
uniform sampler2D tWeed;
uniform vec4 uStack;
void main() {
  vec3 n0 = normalize(vNormal + vec3(0.0, 1e-5, 0.0));
  vec3 v = normalize(cameraPosition - vWorld);
  vec2 d = vWorld.xz - uStack.xy;
  float arc = atan(d.x, d.y) * uStack.z;
  float y = vWorld.y + 3.0 * (vnoise(vec2(arc / 23.0, 1.5)) - 0.5);
  float over = max(y - 60.0, 0.0) / 24.0;
  float vv = y < 60.0 ? 0.03 + y / 70.0 : 0.887 - 0.34 * abs(fract(over * 0.5) * 2.0 - 1.0);
  vec2 uc = vec2(arc / uStack.w, vv);
  vec2 flat0 = vec2(arc / uStack.w, vWorld.y / 70.0);
  vec2 size = vec2(textureSize(tStack, 0));
  float lv = log2(max(max(length(dFdx(flat0) * size), length(dFdy(flat0) * size)), 1e-6));
  float mirror = 1.0 - 2.0 * mod(floor(uc.x), 2.0);
  vec3 pic = textureLod(tStack, uc, lv).rgb;
  vec3 nhp = textureLod(tStackN, uc, lv).rgb;
  vec2 ud = vec2(arc, vWorld.y) / 3.0;
  vec2 sized = vec2(textureSize(tRock, 0));
  vec3 det = textureLod(tRock, ud, log2(max(max(length(dFdx(ud) * sized), length(dFdy(ud) * sized)), 1e-6))).rgb;
  float grain = dot(det, vec3(3.8));
  vec3 round0 = normalize(cross(vec3(0.0, 1.0, 0.0), n0) + vec3(1e-6, 0.0, 0.0));
  vec3 rise = normalize(cross(n0, round0));
  vec2 g = (nhp.xy - 0.5) * vec2(mirror, 1.0);
  vec3 n = normalize(n0 + (round0 * g.x - rise * g.y) * 1.1);
  float macro = vnoise(vec2(arc, vWorld.y) * 0.05) * 0.6 + vnoise(vec2(arc, vWorld.y) * 0.17 + 5.0) * 0.4;
  // The weed of the picture is wet and takes the sky; the rock over it is damp and dull.
  float weedy = smoothstep(0.02, 0.1, pic.r - pic.b) * smoothstep(48.0, 36.0, vWorld.y);
  // Close to, the picture is soft: the hanks of the weed tile and the grain of the rock tile are drawn into it.
  vec2 uw = vec2(arc, vWorld.y) / 5.0;
  float hank = dot(textureLod(tWeed, uw, log2(max(max(length(dFdx(uw) * 1024.0), length(dFdy(uw) * 1024.0)), 1e-6))).rgb, vec3(2.4));
  vec3 albedo = pic * 0.9 * mix(mix(1.0, grain, 0.6), clamp(hank, 0.3, 2.0), 0.85 * weedy) * (0.85 + 0.3 * macro);
  // Over the weed the stack is pale layered rock with lichen on it: the cap of the picture.
  float cap = smoothstep(19.0, 27.0, vWorld.y + 7.0 * (macro - 0.5));
  float lum = dot(pic, vec3(0.333));
  float rust = smoothstep(0.55, 0.68, vnoise(vec2(arc, vWorld.y) * 0.21 + 9.0) * 0.6 + vnoise(vec2(arc, vWorld.y) * 0.9) * 0.4);
  vec3 pale = vec3(0.39, 0.385, 0.365) * clamp(lum / 0.1, 0.8, 1.35) * mix(1.0, grain, 0.8) * (0.8 + 0.4 * macro);
  pale = mix(pale, vec3(0.3, 0.14, 0.03) * (0.6 + 0.6 * grain), 0.22 * smoothstep(0.1, 0.25, rust * macro));
  albedo = mix(albedo, pale, cap);
  weedy *= 1.0 - cap;
  float rough = mix(0.8, 0.42, weedy);
  float occ = 0.55 + 0.45 * smoothstep(0.25, 0.6, nhp.z);
  vec3 lit = rigShade(vWorld, n, v, albedo, rough, occ);
  vec3 fill = albedo * (skyIrradiance(vec3(0.0, 1.0, 0.0)) + 0.5 * uSunColour * cloudShade(vWorld)) * (0.2 / 3.14159) * (0.7 + 0.3 * occ);
  lit = max(lit, fill);
  float rim = 1.0 - max(dot(n, v), 0.0);
  float back = max(dot(-v, uSunDir), 0.0);
  lit += albedo * uSunColour * (0.3 * rim * rim * rim * back * back * sunAt(vWorld, landAt(vWorld.xz)) * occ);
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;
