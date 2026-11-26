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
attribute vec4 aBlade;
attribute vec3 aNb;
attribute vec3 aAlong;
attribute vec3 aAcross;
uniform sampler2D tWideN;
uniform float uLift;
void main() {
  vLay = uv;
  float proud = textureLod(tWideN, vec2(uv.x, 0.215 + 0.78 * uv.y), 2.0).z - 0.5;
  vec4 w = modelMatrix * vec4(position + normal * (proud * uLift), 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vBlade = aBlade;
  vNb = aNb;
  vAlong = aAlong;
  vAcross = aAcross;
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
${RIG_GLSL}
${NOISE_GLSL}
uniform sampler2D tRock;
uniform sampler2D tWide;
uniform sampler2D tWideN;
uniform sampler2D tWeed;
uniform float uTide;
uniform float uGrain;
uniform float uLift;
// The level of a picture for a pixel's foot, by its long side: a little soft at a slant, and it never crawls.
float levelOf(sampler2D t, vec2 dx, vec2 dy) {
  vec2 size = vec2(textureSize(t, 0));
  return log2(max(max(length(dx * size), length(dy * size)), 1e-6));
}
void main() {
  vec3 n0 = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 w = abs(normalize(vNb));
  w *= w;
  // 0 on a broad face, 1 on the thin edge of the blade.
  float edge = smoothstep(0.3, 0.7, w.y / (w.y + w.z + 1e-4));
  vec2 lay = vec2(vLay.x, 0.215 + 0.78 * vLay.y);
  float lw = levelOf(tWide, dFdx(lay), dFdy(lay));
  vec3 big = textureLod(tWide, lay, lw).rgb;
  vec3 nhW = textureLod(tWideN, lay, lw).rgb;
  // The bone tile, small: on the broad face by (across, along), on the edge by (through, along).
  vec2 a1 = vBlade.yx / uGrain;
  vec2 b1 = vBlade.zx / uGrain + 0.37;
  float la = levelOf(tRock, dFdx(a1), dFdy(a1));
  float lb = levelOf(tRock, dFdx(b1), dFdy(b1));
  vec3 dA = vec3(0.265);
  vec3 dB = vec3(0.265);
  if (edge < 0.999) dA = textureLod(tRock, a1, la).rgb;
  if (edge > 0.001) dB = textureLod(tRock, b1, lb).rgb;
  vec3 det = mix(dA, dB, edge);
  // And once more, large and sheared, so that the small one's grooves never run on in lines.
  vec2 a2 = vec2(a1.x + 0.23 * a1.y, a1.y * 0.8) / 4.3 + 0.61;
  vec3 det2 = textureLod(tRock, a2, la - 2.1).rgb;
  float fineLum = dot(det, vec3(0.333)) / 0.265;
  float wideLum = dot(det2, vec3(0.333)) / 0.265;

  // The slopes of the sheet, turned into the world: across the face is aAcross, along the spine aAlong.
  vec2 g = (nhW.xy - 0.5) * (1.0 - edge);
  vec3 lean = vAcross * g.x - vAlong * g.y;
  lean -= n0 * dot(lean, n0);
  vec3 n = normalize(n0 + lean * (0.22 * uLift));

  float macro = vnoise(vBlade.yx * vec2(0.021, 0.008)) * 0.6 + vnoise(vBlade.yx * vec2(0.06, 0.027) + 5.0) * 0.4;
  // Pale bone-stone: the sheet's own ivory, grey in its grooves, warm where it is stained.
  float bigLum = dot(big, vec3(0.333));
  // The sheet gives the marks: its warmth is cut to a third (the picture's blades are grey-ivory) and its darks are lifted.
  vec3 albedo = mix(vec3(bigLum), big, 0.3) * vec3(0.98, 1.0, 1.03);
  albedo = mix(vec3(0.3), albedo, 0.75) * 1.25 * mix(1.0, fineLum, 0.5) * mix(1.0, wideLum, 0.18) * (0.9 + 0.2 * macro);
  float hollow = smoothstep(0.5, 0.22, nhW.z);
  albedo *= 1.0 - 0.3 * hollow;

  float y = vWorld.y;
  float tide = uTide - 4.0 + 7.0 * (vnoise(vWorld.xz / 13.0) - 0.5) + 3.0 * (vnoise(vWorld.xz / 2.7) - 0.5);
  float weed = smoothstep(tide + 0.5, tide - 0.5, y);
  float band = smoothstep(tide + 5.0, tide + 0.5, y);
  float damp = smoothstep(tide + 40.0 + 30.0 * (macro - 0.5), tide + 2.0, y);
  // What runs down a face runs by the level way across it and the height.
  vec2 fall = vec2(mix(vBlade.w, vBlade.z, edge), y);
  // Dark water in a few broad broken streaks under the hollows, where it gathers.
  float streak = smoothstep(0.52, 0.8, vnoise(fall * vec2(0.3, 0.008) + 23.0) * 0.7 + vnoise(fall * vec2(0.085, 0.004) + 5.0) * 0.3) * smoothstep(0.4, 0.62, vnoise(fall * vec2(0.021, 0.013) + 40.0));
  albedo *= mix(vec3(1.0), vec3(0.55, 0.57, 0.56), 0.6 * streak);
  // White under the roosts: thick on what faces up, thinning in runs down the face under it.
  float roost = vnoise(fall * vec2(0.031, 0.045) + 2.0) * 0.65 + vnoise(fall * vec2(0.11, 0.13)) * 0.35;
  float run = vnoise(fall * vec2(0.9, 0.03) + 11.0) * 0.6 + vnoise(fall * vec2(2.7, 0.09)) * 0.4;
  float white = smoothstep(0.5, 0.8, run * (0.35 + 1.1 * roost) + 0.3 * (nhW.z - 0.5)) * smoothstep(0.35, 0.6, roost);
  white = max(white, smoothstep(0.35, 0.8, n.y) * smoothstep(0.3, 0.6, roost + 0.3 * (nhW.z - 0.5)));
  white *= (1.0 - band) * smoothstep(tide + 4.0, tide + 30.0, y);
  // Rust lichen: fields the size of a house on what leans to the sky and the sun, broken small, never in the wet or the grooves.
  float sunny = 0.5 + 0.5 * dot(n0, uSunDir);
  float field = vnoise(vWorld.xz * 0.023 + vWorld.y * 0.031 + 9.0) * 0.4 + vnoise(vBlade.yx * 0.11) * 0.33 + vnoise(vBlade.yx * 0.47) * 0.27;
  float lichen = smoothstep(0.72, 0.8, field + 0.3 * (nhW.z - 0.5) + 0.45 * n0.y + 0.25 * n.y + 0.15 * (sunny - 0.5) - 0.25 * hollow + 0.3 * (fineLum - 1.0)) * (1.0 - band) * (1.0 - 0.7 * streak) * (1.0 - damp);
  albedo = mix(albedo, vec3(0.6, 0.36, 0.12) * (0.55 + 0.7 * fineLum), 0.7 * lichen);
  albedo = mix(albedo, vec3(0.84, 0.83, 0.79) * (0.7 + 0.35 * fineLum), 0.55 * white);
  albedo *= mix(1.0, 0.5, damp) * mix(1.0, 0.14, band);
  albedo = mix(albedo, texture2D(tWeed, fall / 7.0).rgb * 0.9, weed);
  float rough = mix(0.92, 0.45, max(weed, band));
  // The grooves and holes of the sheet hold shade; what hangs over sees the wet floor and not the sky.
  float occ = (1.0 - 0.45 * hollow) * (0.8 + 0.2 * smoothstep(0.55, 1.0, fineLum)) * mix(1.0, 0.45, weed);
  occ *= 0.6 + 0.4 * smoothstep(-0.55, 0.25, n0.y);
  vec3 lit = rigShade(vWorld, n, v, albedo, rough, occ);
  // Against the light the edge of the stone burns.
  float rim = 1.0 - max(dot(n, v), 0.0);
  float back = max(dot(-v, uSunDir), 0.0);
  lit += albedo * uSunColour * (0.3 * rim * rim * rim * back * back * sunAt(vWorld, landAt(vWorld.xz)) * occ);
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
  vec3 n = normalize(n0 + (round0 * g.x - rise * g.y) * 1.8);
  float macro = vnoise(vec2(arc, vWorld.y) * 0.05) * 0.6 + vnoise(vec2(arc, vWorld.y) * 0.17 + 5.0) * 0.4;
  // The weed of the picture is wet and takes the sky; the rock over it is damp and dull.
  float weedy = smoothstep(0.02, 0.1, pic.r - pic.b) * smoothstep(48.0, 36.0, vWorld.y);
  // Close to, the picture is soft: the hanks of the weed tile and the grain of the rock tile are drawn into it.
  vec2 uw = vec2(arc, vWorld.y) / 5.0;
  float hank = dot(textureLod(tWeed, uw, log2(max(max(length(dFdx(uw) * 1024.0), length(dFdy(uw) * 1024.0)), 1e-6))).rgb, vec3(2.4));
  vec3 albedo = pic * 0.9 * mix(mix(1.0, grain, 0.6), clamp(hank, 0.3, 2.0), 0.85 * weedy) * (0.85 + 0.3 * macro);
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
