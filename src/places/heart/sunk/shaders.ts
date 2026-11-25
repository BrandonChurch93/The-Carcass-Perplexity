// The surfaces of the one that sank. Both read the relief baked in shape.ts: the crust reads its own slope and hollows from it,
// the carcass reads how high it stands over the crust, which is where the lava that climbed it stops and where it is in shade.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

const COMMON = /* glsl */ `
uniform sampler2D tRelief;
uniform sampler2D tMask;
uniform sampler2D tLines;
uniform vec4 uField;
uniform vec2 uTurn;
uniform vec2 uOrigin;
uniform float uTearKelvin;
uniform sampler2D tSkin;
uniform sampler2D tSkinNh;
uniform sampler2D tRopy;
uniform sampler2D tRopyNh;

vec2 fieldUv(vec2 l) { return (l - uField.xy) * uField.z; }
// The local frame to the world, for directions on the ground.
vec2 turned(vec2 l) { return vec2(l.x * uTurn.x - l.y * uTurn.y, l.x * uTurn.y + l.y * uTurn.x); }

// The light of the place on a surface of the carcass or of its folds. The same sums as rigShade, but the sky is hidden by what
// is baked here (the hollows, the body over the crust) and not by the round shades, which are for the crust beyond.
vec3 sunkShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float rough, float occ) {
  vec4 land = landAt(p.xz);
  float open = mix(land.g, 1.0, clamp((p.y - land.r) / 80.0, 0.0, 1.0)) * occ;
  vec3 e = skyIrradiance(n) * open + (lakeIrradiance(p, n) + emitterIrradiance(p, n)) * occ;
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float f = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.8 * rough);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  vec3 env = mix(skyRadiance(r), skyIrradiance(n) / 3.14159, rough * rough);
  return c + f * env * open;
}
`;

export const FIELD_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vLocal;
void main() {
  vLocal = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const FIELD_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vLocal;
${NOISE_GLSL}
${RIG_GLSL}
${COMMON}
void main() {
  vec2 l = vLocal.xz;
  float halfSpan = 0.5 / uField.z;
  float r = length(l - (uField.xy + halfSpan));
  // The relief has died away well inside the rim: the last metres only hand the surface over to the lake's own crust.
  float alpha = smoothstep(halfSpan - 0.4, halfSpan - 3.4, r + 1.6 * (vnoise(l * 0.31) - 0.5) + 0.5 * (vnoise(l * 1.7) - 0.5));
  if (alpha < 0.004) discard;
  vec4 rl = texture2D(tRelief, fieldUv(l));
  vec4 mk = texture2D(tMask, fieldUv(l));
  vec2 grad = (rl.rg - 0.5) * 2.0 * uField.w;
  vec3 v = normalize(cameraPosition - vWorld);
  float far = length(cameraPosition - vWorld);
  float near = smoothstep(160.0, 30.0, far);
  float close = smoothstep(70.0, 18.0, far);

  // The skin of the lake as the lake draws it, so the rim is the same stuff.
  vec2 q = uOrigin + turned(l);
  vec2 uvA = q / 5.0;
  vec2 uvB = vec2(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) / 17.0 + 0.31;
  vec3 skin = mix(texture2D(tSkin, uvB).rgb, texture2D(tSkin, uvA).rgb, 0.35 + 0.35 * near);
  vec4 nhA = texture2D(tSkinNh, uvA);
  vec4 nhB = texture2D(tSkinNh, uvB);
  float age = vnoise(q / 90.0 + 4.0);
  vec3 plain = skin * (2.0 + 1.0 * age);

  // The folded skin: older, darker, roped. The ropes of the picture are turned with the folds by the relief itself; the picture gives the grain.
  float folded = smoothstep(12.5, 6.5, length(l - vec2(1.2, 0.2)) + 2.0 * (vnoise(l * 0.4 + 2.0) - 0.5));
  vec2 uvR = l / 2.6 + 0.17;
  vec2 uvF = vec2(l.x * 0.6 + l.y * 0.8, -l.x * 0.8 + l.y * 0.6) / 0.83;
  vec3 ropy = texture2D(tRopy, uvR).rgb;
  vec4 nhR = texture2D(tRopyNh, uvR);
  vec4 nhF = texture2D(tSkinNh, uvF);
  float crest = clamp(mk.b * 2.0 - 0.5, 0.0, 1.3);
  vec3 old = mix(skin * 1.5, ropy * 1.9, 0.55) * (0.55 + 0.75 * crest) * (0.75 + 0.5 * nhF.b) * (0.8 + 0.4 * vnoise(l * 0.33 + 9.0));
  vec3 albedo = mix(plain, old, folded);

  // Ash in the hollows, pale and dead flat.
  float ash = mk.g * (0.35 + 0.65 * smoothstep(0.3, 0.7, vnoise(l * 2.3 + 7.0))) * folded;
  albedo = mix(albedo, vec3(0.3, 0.285, 0.27) * (0.7 + 0.5 * nhF.b), ash * 0.62);

  // The fine wrinkles of the skin run along the folds: they are drawn from the same bent distance the folds were.
  vec4 ln = texture2D(tLines, fieldUv(l));
  float ph = ln.r / 0.055 + 2.5 * vnoise(l * 1.9) + 1.2 * vnoise(l * 6.3);
  float fw = fwidth(ph);
  float wt = 2.0 * fract(ph) - 1.0;
  float wrinkle = -2.0 * wt * (0.5 + 0.9 * vnoise(l * 3.1 + 5.0)) * smoothstep(0.7, 0.2, fw) * folded;
  float ph2 = ln.r / 0.017 + 4.0 * vnoise(l * 5.0);
  float wrinkle2 = sin(6.2832 * ph2) * smoothstep(0.6, 0.15, fwidth(ph2)) * folded;
  vec2 wr = ln.gb * (wrinkle * 0.42 + wrinkle2 * 0.3);
  vec2 detail = (nhA.rg - 0.5) * (0.5 + near) + (nhB.rg - 0.5) * 0.8;
  detail *= 1.0 - 0.7 * folded;
  vec2 fine = (nhR.rg - 0.5) * 0.7 * folded + (nhF.rg - 0.5) * 0.6 * close * (0.4 + 0.6 * folded);
  vec2 sw = turned(grad - fine + wr) - detail * 0.8;
  vec3 n = normalize(vec3(-sw.x, 1.0, -sw.y));

  float occ = rl.b * mix(1.0, 0.72 + 0.28 * nhR.b, folded);
  float rough = mix(0.34 + 0.25 * nhA.b * near + 0.2 * age, 0.5 + 0.3 * nhR.b, folded);
  rough = mix(rough, 0.95, ash);
  vec3 c = sunkShade(vWorld, n, v, albedo, rough, occ);

  // The tear: lava under a skin that has only just closed, and the little light it throws on its own lips.
  float heat = mk.r;
  float veins = smoothstep(0.62, 0.12, abs(vnoise(l * 6.5 + 3.0) - 0.5) * 2.0 + 0.6 * (vnoise(l * 19.0) - 0.5));
  float kelvin = mix(760.0, uTearKelvin, smoothstep(0.25, 0.95, heat) * (0.35 + 0.65 * veins));
  c += blackbody(kelvin) * smoothstep(0.05, 0.4, heat);
  c += albedo * blackbody(uTearKelvin) * mk.a * 1.6;

  gl_FragColor = vec4(rigOut(c), alpha);
}`;

export const CARCASS_VERTEX = /* glsl */ `
attribute vec3 aMap;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vLocalNormal;
varying vec3 vMap;
void main() {
  vLocal = position;
  vLocalNormal = normal;
  vMap = aMap;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const CARCASS_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vLocalNormal;
varying vec3 vMap;
uniform sampler2D tHide;
uniform sampler2D tHideNh;
uniform sampler2D tFlake;
uniform sampler2D tFlakeNh;
${NOISE_GLSL}
${RIG_GLSL}
${COMMON}
void main() {
  vec3 n = normalize(vNormal);
  vec3 nl = normalize(vLocalNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float far = length(cameraPosition - vWorld);
  float close = smoothstep(90.0, 20.0, far);

  float above = vLocal.y - texture2D(tLines, fieldUv(vLocal.xz)).a;

  // The hide, dried on the frame, and the plates of it that have lifted.
  vec2 uvH = vec2(vMap.x * vMap.z, vMap.y / 0.6);
  vec2 uvP = vec2(vMap.x * vMap.z + 0.37, vMap.y / 0.52 + 0.11);
  vec3 hide = texture2D(tHide, uvH).rgb;
  vec4 hideNh = texture2D(tHideNh, uvH);
  vec3 flake = texture2D(tFlake, uvP).rgb;
  vec4 flakeNh = texture2D(tFlakeNh, uvP);
  float worn = vnoise3(vLocal * 1.1 + 4.0) + 0.5 * vnoise3(vLocal * 3.7) - 0.25;
  float lifted = smoothstep(0.3, 0.5, worn + 0.35 * (flakeNh.b - 0.5));
  // Soot black where the hide holds, ash grey where it has lifted and dried.
  vec3 albedo = mix(hide * 1.0, flake * vec3(1.25, 1.3, 1.36) * (0.9 + 1.6 * flakeNh.b), lifted);
  vec2 bump = mix((hideNh.rg - 0.5) * 1.6, (flakeNh.rg - 0.5) * 2.6, lifted) * (0.35 + 0.65 * close);
  float cavity = mix(0.7 + 0.3 * hideNh.b, 0.6 + 0.4 * flakeNh.b, lifted);

  // The lava that climbed it and froze: thick at the crust, ending in sagging drips.
  float drip = vnoise(vLocal.xz * 5.0 + vLocal.y * 0.4) * 0.7 + vnoise(vLocal.xz * 13.0) * 0.3;
  float line = 0.55 + 0.9 * vnoise(vLocal.xz * 0.9 + 3.0) + 0.75 * drip;
  float coat = smoothstep(line, line - 0.22, above);
  vec3 lava = texture2D(tSkin, vec2(vMap.x * vMap.z * 0.5, vMap.y / 1.9)).rgb * 1.9;
  vec4 lavaNh = texture2D(tSkinNh, vec2(vMap.x * vMap.z * 0.5, vMap.y / 1.9));
  albedo = mix(albedo, lava * (0.8 + 0.4 * lavaNh.b), coat);
  bump = mix(bump, (lavaNh.rg - 0.5) * 1.2, coat);
  cavity = mix(cavity, 0.75 + 0.25 * lavaNh.b, coat);

  // Ash lies on whatever faces up.
  float dust = smoothstep(0.45, 0.95, nl.y) * (0.35 + 0.65 * vnoise3(vLocal * 2.9 + 9.0)) * (1.0 - 0.5 * coat);
  albedo = mix(albedo, vec3(0.3, 0.285, 0.27), dust * 0.5);

  // The bump is laid on the surface along its own directions: round the limb and along it.
  vec3 along = normalize(cross(n, vec3(0.31, 0.9, 0.29)));
  vec3 round2 = cross(n, along);
  n = normalize(n + (along * bump.x + round2 * bump.y) * 0.9);

  // Where it enters the crust the sky is hidden.
  float occ = cavity * (0.25 + 0.75 * smoothstep(-0.05, 0.9, above));
  float rough = mix(0.85, 0.55, coat);
  vec3 c = sunkShade(vWorld, n, v, albedo, rough, occ);
  c += albedo * blackbody(uTearKelvin) * texture2D(tMask, fieldUv(vLocal.xz)).a * 1.2 * smoothstep(1.5, 0.0, above);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export const GLOW_VERTEX = /* glsl */ `
void main() {
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}`;

export const GLOW_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uRadiance;
void main() {
  gl_FragColor = vec4(uRadiance, 1.0);
}`;
