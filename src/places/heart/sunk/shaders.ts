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

// What the lake's crust mirrors, as the lake folder draws it: the rim of the folds is that crust and has to shine as it does.
vec3 crustMirror(vec3 r, float rough) {
  float wall = 0.16 + 0.2 * max(-r.z, 0.0);
  float soft = 0.05 + 0.5 * rough;
  float sky = smoothstep(wall - soft, wall + soft, r.y);
  float w = max(dot(normalize(vec3(r.x, max(r.y, 0.0), r.z)), uWarmDir), 0.0);
  vec3 low = uSkyHorizon * 0.5 + uWarmColour * w * w * w * 0.8;
  return mix(low, skyRadiance(vec3(r.x, max(r.y, wall), r.z)), sky);
}

void main() {
  vec2 l = vLocal.xz;
  float halfSpan = 0.5 / uField.z;
  float r = length(l - (uField.xy + halfSpan));
  // The relief has died away well inside the rim: the last metres only hand the surface over to the lake's own crust.
  float alpha = 1.0;
  #ifdef RIM
  alpha = smoothstep(halfSpan - 1.3, halfSpan - 3.6, r + 1.6 * (vnoise(l * 0.31) - 0.5) + 0.5 * (vnoise(l * 1.7) - 0.5));
  if (alpha < 0.004) discard;
  #endif
  vec4 rl = texture2D(tRelief, fieldUv(l));
  vec4 mk = texture2D(tMask, fieldUv(l));
  vec4 ln = texture2D(tLines, fieldUv(l));
  vec2 grad = (rl.rg - 0.5) * 2.0 * uField.w;
  vec3 v = normalize(cameraPosition - vWorld);
  float far = length(cameraPosition - vWorld);
  float near = smoothstep(140.0, 20.0, far);
  float mid = smoothstep(420.0, 90.0, far);
  float close = smoothstep(70.0, 18.0, far);

  // The skin of the lake as the lake draws it (the same pictures at the same sizes, a plate of middling age), so the rim is the same stuff.
  vec2 q = uOrigin + turned(l);
  vec2 uvA = q / 5.0;
  vec2 uvB = vec2(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) / 19.0 + 0.31;
  vec4 nhA = texture2D(tSkinNh, uvA);
  vec4 nhB = texture2D(tSkinNh, uvB);
  vec3 skin = mix(texture2D(tSkin, uvB).rgb, texture2D(tSkin, uvA).rgb, 0.3 + 0.4 * near);
  const float AGE = 0.55;
  vec3 plain = skin * (0.75 + 1.1 * AGE);
  plain = mix(plain, vec3(dot(plain, vec3(0.33))), 0.35 * AGE);

  // The folded skin: the same skin, roped. The ropes are in the relief; the pictures give the grain, and crests are worn paler than creases.
  float broad = vnoise(l * 0.4 + 2.0);
  float small = vnoise(l * 2.0 + 7.0);
  float folded = smoothstep(10.5, 5.0, ln.r + 2.0 * (broad - 0.5)) * smoothstep(11.6, 8.6, r);
  vec2 uvR = l / 2.6 + 0.17;
  vec2 uvF = vec2(l.x * 0.6 + l.y * 0.8, -l.x * 0.8 + l.y * 0.6) / 0.83;
  vec3 ropy = texture2D(tRopy, uvR).rgb;
  vec4 nhR = texture2D(tRopyNh, uvR);
  vec4 nhF = texture2D(tSkinNh, uvF);
  float crest = clamp(mk.b * 2.0 - 0.5, 0.0, 1.3);
  vec3 old = mix(plain, ropy * 1.6, 0.5) * (0.4 + 0.95 * crest) * (0.75 + 0.5 * nhF.b) * (0.8 + 0.4 * broad);
  // From far off the creases are smaller than a pixel and what is seen is the ash on the crowns.
  old *= mix(1.4, 1.0, close);
  vec3 albedo = mix(plain, old, folded);

  // Ash has fallen on it since: a thin grey on whatever lies level, thick in the hollows.
  float lying = smoothstep(0.55, 0.95, inversesqrt(1.0 + dot(grad, grad)));
  albedo = mix(albedo, vec3(0.25, 0.24, 0.23), folded * lying * 0.4 * (0.35 + 0.65 * small));
  // Ash in the hollows, pale and dead flat.
  float ash = mk.g * (0.35 + 0.65 * smoothstep(0.3, 0.7, 1.0 - small)) * folded;
  albedo = mix(albedo, vec3(0.3, 0.285, 0.27) * (0.7 + 0.5 * nhF.b), ash * 0.62);

  // The fine wrinkles of the skin run along the folds: they are drawn from the same bent distance the folds were.
  float ph = ln.r / 0.09 + 2.5 * vnoise(l * 1.9) + 1.5 * nhF.b;
  float fw = fwidth(ph);
  float wt = 2.0 * fract(ph) - 1.0;
  float wrinkle = -2.0 * wt * (0.05 + 1.2 * smoothstep(0.35, 0.8, 0.6 * small + 0.4 * broad)) * smoothstep(0.42, 0.1, fw) * folded;
  vec2 wr = ln.gb * wrinkle * 0.5;
  // The lake's own small slopes, in the world, as the lake lays them.
  vec2 detail = (nhA.rg - 0.5) * 0.6 * near;
  detail += vec2(0.8 * (nhB.r - 0.5) + 0.6 * (nhB.g - 0.5), -0.6 * (nhB.r - 0.5) + 0.8 * (nhB.g - 0.5)) * 0.4 * mid;
  detail *= 1.0 - 0.7 * folded;
  vec2 fine = (nhR.rg - 0.5) * 0.9 * folded + (nhF.rg - 0.5) * 1.0 * close * folded;
  vec2 sw = turned(grad - fine + wr) - detail;
  vec3 n = normalize(vec3(-sw.x, 1.0, -sw.y));

  float hollow = mix(1.0, 0.7 + 0.6 * nhB.b, mid) * mix(1.0, 0.8 + 0.4 * nhA.b, near);
  float occ = mix(hollow, mix(0.5 + 0.5 * rl.b, rl.b, close) * (0.72 + 0.28 * nhR.b), folded);
  float rough = mix(0.34 + 0.5 * AGE + 0.25 * (nhB.b - 0.5) * mid, 0.36 + 0.3 * nhR.b, folded);
  rough = mix(rough, 0.95, ash);
  vec4 land = landAt(vWorld.xz);
  float open = land.g * occ;
  vec3 light = skyIrradiance(n) * open + lakeIrradianceFar(vec3(vWorld.x, 1.5, vWorld.z), n) * mix(1.0, rl.b, folded) + emitterIrradiance(vWorld, n);
  vec3 c = albedo * light / 3.14159;
  // The shine of the skin is taken off a gentler surface than the folds themselves: each rope carries a strip of the sky along its
  // crown, and from the bench those strips are finer than the folds are steep.
  vec2 ss = sw * mix(1.0, 0.38, folded);
  vec3 ns = normalize(vec3(-ss.x, 1.0, -ss.y));
  float nv = clamp(dot(ns, v), 0.0, 1.0);
  float fresnel = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - rough) * (1.0 - 0.6 * rough);
  vec3 rf = reflect(-v, ns);
  rf.y = abs(rf.y);
  c += fresnel * crustMirror(rf, rough) * open;

  // The tear: lava under a skin that has only just closed, and the little light it throws on its own lips.
  float heat = mk.r;
  float veins = smoothstep(0.7, 0.15, abs(nhF.b - 0.5) * 3.0 + 0.5 * (small - 0.5));
  float kelvin = mix(820.0, uTearKelvin, smoothstep(0.3, 0.9, heat) * (0.5 + 0.5 * veins));
  c *= 1.0 - 0.85 * smoothstep(0.1, 0.6, heat);
  c += blackbody(kelvin) * smoothstep(0.1, 0.5, heat);
  c += albedo * blackbody(uTearKelvin) * mk.a * 0.8;

  gl_FragColor = vec4(rigOut(c), alpha);
}`;

export const CARCASS_VERTEX = /* glsl */ `
attribute vec4 aMap;
attribute vec4 aSurf;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vLocalNormal;
varying vec4 vMap;
varying vec4 vSurf;
void main() {
  vLocal = position;
  vLocalNormal = normal;
  vMap = aMap;
  vSurf = aSurf;
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
varying vec4 vMap;
varying vec4 vSurf;
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
  float isBody = step(0.5, vMap.w) * step(vMap.w, 1.5);
  float isLeg = step(vMap.w, 0.5);

  // On the body the hide is drawn out along its length: it dried hanging from the spine, in long pleats.
  float lump = vnoise3(vLocal * 1.1 + 4.0);
  vec2 uvH = mix(vec2(vMap.x * vMap.z, vMap.y / 0.6), vec2(vMap.x * 17.0 + vMap.y * 1.4 + 1.6 * lump, vMap.y / 2.6), isBody);
  vec2 uvP = vec2(vMap.x * vMap.z + 0.37, vMap.y / 0.52 + 0.11);
  vec3 hide = texture2D(tHide, uvH).rgb;
  vec4 hideNh = texture2D(tHideNh, uvH);
  vec3 flake = texture2D(tFlake, uvP).rgb;
  vec4 flakeNh = texture2D(tFlakeNh, uvP);
  float grey = dot(hide, vec3(0.33));
  // Soot and ash have taken the brown out of the hide.
  vec3 dead = vec3(0.3, 0.25, 0.2) * (0.25 + 9.0 * grey);
  // Caked ash and dried skin, the colour of old paper, darker where the plate is thin.
  float tone = dot(flake, vec3(0.33));
  vec3 pale = mix(vec3(0.33, 0.29, 0.24), vec3(0.58, 0.52, 0.43), smoothstep(0.2, 0.8, flakeNh.b)) * (1.1 + 3.5 * tone);

  // On the body the hide lifts in patches; on the legs it is the plates that are left.
  float worn = lump + 0.5 * flakeNh.b - 0.25;
  float lifted = mix(vSurf.y * smoothstep(-0.2, 0.15, flakeNh.b + 0.5 * worn), smoothstep(0.62, 0.7, lump + 0.12 * (flakeNh.b - 0.5)), 1.0 - isLeg);
  float split = isBody * smoothstep(0.35, 0.6, vSurf.y + 0.25 * (hideNh.b - 0.5));
  lifted *= 1.0 - split;
  // The crests of the dried cords are rubbed pale and the creases between hold the soot.
  vec3 albedo = mix(dead * (0.5 + 1.5 * hideNh.b * hideNh.b) * mix(1.0, 1.25, isBody), pale, lifted);
  vec2 bump = mix((hideNh.rg - 0.5) * 1.6, (flakeNh.rg - 0.5) * 2.6, lifted) * (0.35 + 0.65 * close);
  float cavity = mix(0.7 + 0.3 * hideNh.b, 0.6 + 0.4 * flakeNh.b, lifted);

  // Under the hide: dried flesh, almost black, strung with pale sinew along the limb; in the splits of the body, the ribs.
  float strand = smoothstep(0.35, 0.75, vnoise(vec2(vMap.x * vMap.z * 9.0, vMap.y * 1.3)) * 0.7 + 0.3 * hideNh.b);
  vec3 flesh = mix(vec3(0.04, 0.03, 0.026), vec3(0.13, 0.095, 0.075), hideNh.b);
  vec3 sinew = vec3(0.4, 0.36, 0.29) * (0.55 + 0.6 * hideNh.b);
  float bare = mix(isLeg * (1.0 - vSurf.y), split, isBody);
  float boney = clamp(vSurf.w * (0.55 + 0.9 * strand), 0.0, 1.0) * mix(0.45, 1.0, isBody);
  albedo = mix(albedo, mix(flesh, sinew, boney), bare);
  bump = mix(bump, (hideNh.rg - 0.5) * 0.8, bare);

  // The lava that climbed it and froze. Its edge is cut by the grain of the skin so it is not a drawn line.
  vec2 uvL = vec2(vMap.x * vMap.z * 0.5, vMap.y / 1.9);
  vec4 lavaNh = texture2D(tSkinNh, uvL);
  float coat = smoothstep(0.36, 0.64, vSurf.x + 0.3 * (lavaNh.b - 0.5));
  vec3 lava = texture2D(tSkin, uvL).rgb * 1.5;
  albedo = mix(albedo, lava * (0.75 + 0.5 * lavaNh.b), coat);
  bump = mix(bump, (lavaNh.rg - 0.5) * 1.2, coat);
  cavity = mix(cavity, 0.75 + 0.25 * lavaNh.b, coat);

  // Ash lies on whatever faces up.
  float dust = smoothstep(0.35, 0.95, nl.y) * (0.35 + 0.65 * (1.0 - lump)) * (1.0 - 0.5 * coat);
  albedo = mix(albedo, vec3(0.36, 0.34, 0.315), dust * 0.6);
  albedo = mix(albedo, vec3(0.27, 0.26, 0.25), coat * 0.5 * (1.0 - lump));

  // The bump is laid on the surface along its own directions.
  vec3 along = normalize(cross(n, vec3(0.31, 0.9, 0.29)));
  vec3 round2 = cross(n, along);
  n = normalize(n + (along * bump.x + round2 * bump.y) * 0.9);

  float occ = cavity * vSurf.z;
  float rough = mix(0.88, 0.78, coat);
  vec3 c = sunkShade(vWorld, n, v, albedo, rough, occ);
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
