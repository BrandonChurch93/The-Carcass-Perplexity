// The stone of a blade. A blade is one whole thing, so it is drawn from one whole picture: the Builder's blade seen side on, rectified to
// a sheet (land/fin.jpg and its heights), laid once over each broad face by (part across, part along the spine). Its ledges, flutes and
// holes are raised out of the blade in the vertex shader, and the light falls on its slopes turned into the world by the ring's own
// frame (aAlong, aAcross): no screen derivative, so nothing hatches at a distance. The bone tile only breaks it up close.
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
  vNormal = normalize(mat3(modelMatrix) * normal);
  vBlade = aBlade;
  vNb = aNb;
  vAlong = aAlong;
  vAcross = aAcross;
  vCrag = aCrag;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

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
  vec3 n0 = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 w = abs(normalize(vNb));
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
  vec3 alongW = normalize(vAlong);
  vec3 acrossW = thin > 0.5 ? normalize(cross(vAlong, vAcross)) : normalize(vAcross);
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
  stone *= mix(1.0, clamp(lumF / 0.3, 0.45, 1.7), 0.6 * nearF);
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
  float stoneLum = lumW * mix(1.0, clamp(lumF / 0.3, 0.45, 1.7), 0.6 * nearF);
  float sunny = 0.5 + 0.5 * dot(n0, uSunDir);
  float field = vnoise(vWorld.xz * 0.019 + vWorld.y * 0.027 + 9.0) * 0.6 + vnoise(vWorld.xz * 0.11 + vWorld.y * 0.09) * 0.4;
  // Lichen: rust and ochre where a face sees the sky and the sun, in patches, thick on the ledges; the sheet's own rust shows through it.
  float rusty = smoothstep(0.03, 0.14, stone.r - stone.b);
  float lichen = smoothstep(0.74, 0.92, field + 0.35 * n0.y + 0.3 * (sunny - 0.5) + 0.25 * shelf + 0.12 * rusty + 0.04 * uCap - 0.3 * deep);
  vec3 albedo = mix(vec3(stoneLum) * vec3(0.97, 1.0, 1.05), stone * vec3(1.12, 1.0, 0.86), 0.1 + 0.2 * rusty);
  albedo *= mix(3.1, 2.5, uCap) * mix(1.0, clamp(far2, 0.4, 1.8), 0.4) * fineLum * (0.82 + 0.36 * macro) * (1.0 + 0.2 * tone);
  albedo = mix(albedo, vec3(0.55, 0.27, 0.05) * clamp(stoneLum / 0.22, 0.5, 1.6), 0.7 * lichen);
  // Over hundreds of metres the stone changes: cold grey here, warm ivory there.
  albedo *= mix(vec3(0.94, 0.98, 1.04), vec3(1.07, 1.0, 0.9), smoothstep(0.3, 0.7, macro));
  // The near cliff's cap: pale layered stone, cream more than grey, its lichen in patches.
  if (uCap > 0.0) {
    vec3 cream = vec3(0.36, 0.34, 0.3) * clamp(stoneLum / 0.19, 0.45, 1.6) * fineLum * (0.85 + 0.3 * macro) * (1.0 + 0.2 * tone);
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
  albedo *= mix(1.0, 0.62, crack * crack) * mix(1.0, 0.85, deep);

  float y = vWorld.y;
  float tide = uTide - 4.0 + 7.0 * (far2 - 1.0) + 3.0 * (field - 0.5);
  float weed = smoothstep(tide + 0.5, tide - 0.5, y);
  float band = smoothstep(tide + 5.0, tide + 0.5, y);
  float damp = smoothstep(tide + 40.0 + 30.0 * (macro - 0.5), tide + 2.0, y);
  // Seep: dark wet bands that follow the beds, a few to a blade, each broken along its length.
  float seep = smoothstep(0.6, 0.8, vnoise(vec2(bedY * 0.021, 7.0 + fall.x * 0.004)) * 0.7 + 0.3 * macro) * smoothstep(0.35, 0.6, field);
  albedo *= mix(vec3(1.0), vec3(0.6, 0.62, 0.62), 0.7 * seep);
  albedo *= mix(1.0, 0.5, damp * (1.0 - 0.85 * uCap)) * mix(1.0, 0.14, band);
  // The near cliff is one wet dark mass well above its weed: only its rim is pale.
  float wetWall = uCap * smoothstep(tide + 24.0 + 9.0 * (field - 0.5), tide + 13.0 + 9.0 * (field - 0.5), y);
  albedo = mix(albedo, vec3(0.036, 0.033, 0.026) * (0.5 + stoneLum / 0.19), 0.9 * wetWall);
  if (weed > 0.001) albedo = mix(albedo, texture2D(tWeed, fall / 7.0).rgb * 0.9, weed);
  float rough = mix(mix(0.92, 0.45, max(weed, band)), 0.72, wetWall * (1.0 - max(weed, band)));
  // The hollows of both sheets, the cracks and the gone plates hold shade; what hangs over sees the wet floor and not the sky.
  float hollow = smoothstep(0.2, 0.55, slopes.z) * mix(1.0, smoothstep(0.15, 0.5, slopesF.z), 0.7 * nearF);
  float occ = (0.6 + 0.4 * hollow) * (0.8 + 0.2 * smoothstep(0.55, 1.0, fineLum)) * mix(1.0, 0.45, weed);
  occ *= (1.0 - 0.5 * crack * crack) * (1.0 - 0.3 * deep) * (0.55 + 0.45 * smoothstep(-0.55, 0.25, n0.y));
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
  vec3 n0 = normalize(vNormal);
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
