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
  vNormal = normalize(mat3(modelMatrix) * normal);
  vBlade = aBlade;
  vNb = aNb;
  vAlong = aAlong;
  vAcross = aAcross;
  vCrag = aCrag;
  gl_Position = projectionMatrix * viewMatrix * w;
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
// One laying of the sheet, size metres along the spine: its colour and (slope along, slope across, height).
void laid(vec2 at, float size, float lod, out vec3 colour, out vec3 slopes) {
  vec2 uc = vec2(at.x / size, at.y / (size * 0.6667));
  colour = textureLod(tTusk, uc, lod).rgb;
  vec3 nh = textureLod(tTuskN, uc, lod).rgb;
  slopes = vec3(nh.xy - 0.5, nh.z);
}
void main() {
  vec3 n0 = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 w = abs(normalize(vNb));
  w *= w;
  // 0 on a broad face, 1 on the thin edge of the blade.
  float edge = smoothstep(0.3, 0.7, w.y / (w.y + w.z + 1e-4));
  float thin = step(0.5, edge);
  float foot = max(length(dFdx(vWorld)), length(dFdy(vWorld)));
  float macro = vnoise(vWorld.xz * 0.006 + vWorld.y * 0.004) * 0.6 + vnoise(vBlade.yx * vec2(0.06, 0.027) + 5.0) * 0.4;
  float crack = vCrag.x;
  float tone = vCrag.y;
  float deep = vCrag.z;
  // The seams wander a little across the blade, so that no line of the sheet runs ruled for its whole length.
  float bedY = mix(vBlade.y, vBlade.z + 31.0, thin) + 5.0 * (vnoise(vec2(vBlade.x * 0.006, vBlade.y * 0.02 + 3.0)) - 0.5);
  vec2 lay = vec2(vBlade.x, bedY);
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
  if (nearF > 0.001) laid(lay * mat2(0.978, 0.208, -0.208, 0.978) + vec2(17.0, 5.0), FINE, lf, cF, sF);
  float meanLum = dot(uTuskMean, vec3(0.333));
  float lumW = dot(cW, vec3(0.333)) / meanLum;
  float lumF = mix(1.0, dot(cF, vec3(0.333)) / meanLum, nearF);
  // The marks of both sheets at more than their own strength: a seam is a dark line from a mile off.
  float marks = clamp(1.0 + 1.25 * (lumW - 1.0), 0.4, 1.4) * clamp(1.0 + 1.7 * (lumF - 1.0), 0.35, 1.5);
  // Long fine grooves along the sweep, computed: narrow across the blade, a blade's width long, at two sizes, each gone before it is finer than a pixel.
  float grooveA = (vnoise(vec2(vBlade.x * 0.035, bedY * 2.6)) - 0.5) * (1.0 - smoothstep(0.12, 0.4, foot));
  float grooveB = (vnoise(vec2(vBlade.x * 0.013 + 3.0, bedY * 0.62)) - 0.5) * (1.0 - smoothstep(0.5, 1.6, foot));
  float grooveC = (vnoise(vec2(vBlade.x * 0.005 + 7.0, bedY * 0.17)) - 0.5) * (1.0 - smoothstep(2.0, 6.0, foot));
  marks *= 1.0 + 0.3 * grooveA + 0.3 * grooveB + 0.28 * grooveC;
  vec3 alongW = normalize(vAlong);
  vec3 acrossW = thin > 0.5 ? normalize(cross(vAlong, vAcross)) : normalize(vAcross);
  vec2 g = sW.xy * 2.6 + sF.xy * 1.9 * nearF;
  vec3 lean = alongW * g.x - acrossW * g.y;
  lean -= n0 * dot(lean, n0);
  vec3 n = normalize(n0 + lean);
  float shelf = smoothstep(0.3, 0.7, n0.y);
  float under = smoothstep(-0.15, -0.6, n0.y);

  // Pale stone: ivory where it is dry and sunned, cold grey in its hollows and on its lee. Each plate has its own tone.
  vec3 hue = mix(cW / max(dot(cW, vec3(0.333)), 1e-3), vec3(1.0), 0.35);
  vec3 albedo = hue * vec3(0.56, 0.545, 0.5) * marks * (0.8 + 0.4 * macro) * (1.0 + 0.3 * tone);
  albedo *= mix(vec3(0.95, 0.98, 1.03), vec3(1.07, 1.0, 0.9), smoothstep(0.3, 0.7, macro));
  float sunny = 0.5 + 0.5 * dot(n0, uSunDir);
  float field = vnoise(vWorld.xz * 0.019 + vWorld.y * 0.027 + 9.0) * 0.6 + vnoise(vWorld.xz * 0.11 + vWorld.y * 0.09) * 0.4;
  // Lichen: rust and ochre where a face sees the sky and the sun, in patches a house across whose edges are the crusts of the sheet.
  float LICH = uSize.y * 1.3;
  vec2 ul = vec2(vWorld.y + 0.37 * lay.y, mix(vBlade.w, vBlade.z, edge) * 1.5 + 0.21 * lay.x) / LICH + 0.19;
  float ll = log2(max(foot * 1536.0 / LICH, 1e-6));
  vec3 crust = textureLod(tLichen, ul, ll).rgb;
  float crusted = smoothstep(0.06, 0.3, crust.r - crust.b);
  float lichen = smoothstep(0.6, 0.66, 0.95 * field + 0.2 * n0.y + 0.22 * (sunny - 0.5) + 0.1 * shelf + 0.14 * (crusted - 0.5) + 0.08 * edge - 0.2 * deep);
  lichen *= 0.7 + 0.3 * crusted;
  albedo = mix(albedo, mix(vec3(0.5, 0.25, 0.06), crust * vec3(1.2, 1.0, 0.75), 0.5) * clamp(marks, 0.6, 1.3), 0.85 * lichen);
  // What runs down a face runs by the level way across it and the height.
  vec2 fall = vec2(mix(vBlade.w, vBlade.z, edge), vWorld.y);
  // White lies on what looks up, where things roost, and runs down from it in thin streaks.
  float runs = smoothstep(0.58, 0.8, vnoise(vec2(fall.x * 0.55, fall.y * 0.035 + 3.0)) * 0.65 + 0.35 * vnoise(vec2(fall.x * 1.9, fall.y * 0.11)));
  float white = max(0.6 * shelf, 0.45 * runs * (1.0 - under)) * smoothstep(0.42, 0.62, field + 0.1 * tone) * (1.0 - 0.6 * crack);
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
  float seep = smoothstep(0.62, 0.8, vnoise(vec2(bedY * 0.021, 7.0 + fall.x * 0.004)) * 0.7 + 0.3 * macro) * smoothstep(0.35, 0.6, field);
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
