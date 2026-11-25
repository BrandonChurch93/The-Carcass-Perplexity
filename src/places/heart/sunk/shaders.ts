// The surfaces of the one that sank. Both read the relief baked in shape.ts: the crust reads its own slope and hollows from it,
// the carcass reads how high it stands over the crust, which is where the lava that climbed it stops and where it is in shade.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { BODY, CORD, TEAR } from './shape';

const tearPoint = (i: number): string => `vec3(${(TEAR[i] as [number, number])[0].toFixed(2)}, -0.12, ${(TEAR[i] as [number, number])[1].toFixed(2)})`;

const COMMON = /* glsl */ `
// Ash, on the skin and on the hide.
const vec3 ASH = vec3(0.143, 0.146, 0.15);
uniform sampler2D tRelief;
uniform sampler2D tMask;
uniform sampler2D tLines;
uniform vec4 uField;
uniform vec2 uTurn;
uniform vec2 uOrigin;
uniform float uTearKelvin;
uniform float uTearGain;
uniform vec3 uAsh;
uniform sampler2D tSkin;
uniform sampler2D tSkinNh;
uniform sampler2D tRopy;
uniform sampler2D tRopyNh;

// The count of the cords along their phase and the width of the cord there: the sums of shape.ts.
float cordCount(float u) {
  float th = ${CORD.turn.toFixed(1)} * u;
  return ${CORD.base.toFixed(1)} * u + ${CORD.swing.toFixed(1)} * (0.375 * u - 0.5 * cos(th) / ${CORD.turn.toFixed(1)} - sin(2.0 * th) / ${(16 * CORD.turn).toFixed(1)});
}
vec2 fieldUv(vec2 l) { return (l - uField.xy) * uField.z; }
// The local frame to the world, for directions on the ground.
vec2 turned(vec2 l) { return vec2(l.x * uTurn.x - l.y * uTurn.y, l.x * uTurn.y + l.y * uTurn.x); }

// The light of the tear on a point near it, in the local frame: the glow map says the same to the rest of the place, but its
// texel is wider than the tear, and what is a metre from open lava is lit by it far harder than a mean over that texel says.
vec3 tearLight(vec3 p, vec3 n) {
  float e = 0.0;
  for (int i = 0; i < 3; i++) {
    vec3 t = i == 0 ? ${tearPoint(1)} : i == 1 ? ${tearPoint(2)} : ${tearPoint(3)};
    vec3 d = t - p;
    float d2 = dot(d, d) + 0.05;
    float inv = inversesqrt(d2);
    float facing = clamp((dot(n, d) * inv + 0.2) / 1.2, 0.0, 1.0);
    // Open lava sends most of its light up; its lips and the hot air over it send a little along the ground.
    float sent = 0.25 + 0.75 * clamp(-d.y * inv, 0.0, 1.0);
    e += 0.17 * facing * sent / d2;
  }
  return blackbody(uTearKelvin) * e * uTearGain * uCast;
}

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
  vec3 low = uSkyHorizon * 0.3 + uWarmColour * w * w * w * 0.6;
  return mix(low, skyRadiance(vec3(r.x, max(r.y, wall), r.z)), sky);
}

void main() {
  vec2 l = vLocal.xz;
  float halfSpan = 0.5 / uField.z;
  float r = length(l - (uField.xy + halfSpan));
  // The relief has died away well inside the rim: the last metres only hand the surface over to the lake's own crust, and read
  // nothing of the relief, so they cost what the lake's crust costs.
  float alpha = 1.0;
  #ifdef RIM
  alpha = smoothstep(halfSpan - 2.3, halfSpan - 4.4, r + 1.2 * (vnoise(l * 0.31) - 0.5) + 0.4 * (vnoise(l * 1.7) - 0.5));
  vec4 rl = vec4(0.5, 0.5, 1.0, 0.0);
  vec4 mk = vec4(0.0, 0.0, 0.5, 0.5);
  vec4 ln = vec4(0.0);
  #else
  vec4 rl = texture2D(tRelief, fieldUv(l));
  vec4 mk = texture2D(tMask, fieldUv(l));
  vec4 ln = texture2D(tLines, fieldUv(l));
  #endif
  vec2 grad = (rl.rg - 0.5) * 2.0 * uField.w;
  vec3 v = normalize(cameraPosition - vWorld);
  float far = length(cameraPosition - vWorld);
  float close = smoothstep(70.0, 18.0, far);
  float folded = rl.a;

  // The skin between the cords: the lake's own ropy skin at the lake's own size, so the pad is the same stuff as the plates.
  vec2 q = uOrigin + turned(l);
  float grainSize = max(length(dFdx(q)), length(dFdy(q)));
  float near = 1.0 - smoothstep(0.03, 0.14, grainSize);
  float mid = 1.0 - smoothstep(0.4, 2.5, grainSize);
  vec2 uvA = q / 6.1;
  vec4 nhA = texture2D(tRopyNh, uvA);
  vec3 rope = texture2D(tRopy, uvA, -0.3).rgb;
  vec2 uvD = vec2(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) / 1.37 + 0.13;
  vec4 grainNh = vec4(0.5);
  if (near > 0.0) grainNh = texture2D(tSkinNh, uvD, -0.7);
  float broad = vnoise(l * 0.4 + 2.0);
  float small = vnoise(l * 2.0 + 7.0);
  // The lake's own skin, by the lake's own sums (lake/index.ts): black and glassy where young, grey and rough where old, in the
  // same broad patches. At the rim the sheet is nothing but that, so no edge shows where the lake's plates take over.
  float age = clamp(0.5 + 1.6 * (0.65 * vnoise(q / 110.0 + 4.0) + 0.35 * vnoise(q / 37.0 + 9.0) - 0.5), 0.0, 1.0);
  // Each sheet of the folded skin is of its own age.
  float sheet = mk.a;
  age = clamp(age + folded * (0.9 * (sheet - 0.5) + 0.25 * (broad - 0.5)), 0.0, 1.0);
  vec3 albedo = mix(vec3(0.03, 0.031, 0.033), vec3(0.056, 0.056, 0.058), age) * (0.9 + 0.2 * vnoise(q / 3.1 + 13.0));
  // The ropy skin has a grain the lake's plain plates have not.
  albedo *= mix(1.0, (0.35 + 0.65 * dot(rope, vec3(5.7))) * (0.85 + 0.3 * grainNh.b), folded * mid);

  // The cords: each bundle is counted along its own phase; a cord is a rounded strip, the crease between two a line of shade.
  float count = cordCount(ln.r + sheet * 94.0);
  float seen = smoothstep(0.7, 0.25, fwidth(count));
  // On a wall the cords are drawn out to nothing.
  float amp = clamp(ln.a, 0.0, 1.0) * seen * smoothstep(2.4, 0.9, length(grad));
  float x = 2.0 * fract(count) - 1.0;
  float k = 1.0 - x * x;
  float cordTone = fract(sin(floor(count) * 12.9898) * 43758.5453);
  float stands = 0.55 + 0.9 * cordTone;
  vec2 cordSlope = ln.gb * (-1.2 * x * pow(max(k, 0.04), -0.3) * amp * stands);
  float crease = pow(abs(x), 3.0) * amp;
  float crown = k * k * amp;
  albedo *= (1.0 - 0.6 * crease) * (1.0 + amp * 0.5 * (cordTone - 0.5));

  // What stands up and lies level has gone grey and carries the ash that fell since; what is down in a crease is black.
  float lying = smoothstep(0.5, 0.9, inversesqrt(1.0 + dot(grad, grad)));
  float stood = smoothstep(0.4, 0.55, mk.b);
  albedo *= mix(1.0, 0.45 + 0.55 * smoothstep(0.3, 0.5, mk.b), folded);
  vec2 fromBody = l - vec2(${BODY.centre.x.toFixed(2)}, ${BODY.centre.z.toFixed(2)});
  float ashed = smoothstep(8.0, 3.5, length(fromBody) + 2.0 * (broad - 0.5));
  float ash = folded * ashed * (1.0 - crease) * clamp(lying * stood * (0.75 + 0.25 * smoothstep(0.25, 0.7, small + 0.5 * (broad - 0.5))) + crown * 0.45 * (0.3 + 0.7 * small), 0.0, 1.0);
  albedo = mix(albedo, ASH * (0.75 + 0.5 * grainNh.b), ash);

  vec2 detail = (nhA.rg - 0.5) * 0.7 * mid * (1.0 - 0.6 * amp);
  detail += vec2(0.8 * (grainNh.r - 0.5) + 0.6 * (grainNh.g - 0.5), -0.6 * (grainNh.r - 0.5) + 0.8 * (grainNh.g - 0.5)) * 0.35 * near;
  vec2 gl = grad + cordSlope;
  vec2 sw = turned(gl) - detail * folded;
  vec3 n = normalize(vec3(-sw.x, 1.0, -sw.y));

  float occ = mix(1.0, mix(0.5 + 0.5 * rl.b, rl.b, close) * (0.8 + 0.2 * nhA.b) * (1.0 - 0.75 * crease), folded);
  float rough = clamp(0.22 + 0.45 * age + 0.15 * folded, 0.15, 0.92);
  rough = mix(rough, 0.95, ash);
  vec4 land = landAt(vWorld.xz);
  float open = land.g * occ;
  // The lake's glow from afar reaches only the faces that are turned toward it, as on the lake's own crust.
  float wallFace = 1.0 - smoothstep(0.35, 0.9, n.y);
  vec3 light = skyIrradiance(n) * open + lakeIrradianceFar(vec3(vWorld.x, 1.5, vWorld.z), n) * mix(1.0, occ, 0.5) * (0.12 + 0.6 * wallFace) + emitterIrradiance(vec3(vWorld.x, max(vWorld.y, 0.02), vWorld.z), n) * mix(1.0, occ, 0.7);
  #ifndef RIM
  light += tearLight(vLocal, normalize(vec3(-gl.x, 1.0, -gl.y))) * (0.4 + 0.6 * occ);
  #endif
  vec3 c = albedo * light / 3.14159;
  // The shine is the lake's satin one. On the folds it comes off a surface gentler than the cords, each of which carries a strip
  // of the sky along its crown.
  vec2 ss = sw * mix(1.0, 0.45, folded);
  vec3 ns = normalize(vec3(-ss.x, 1.0 + 0.6 * folded, -ss.y));
  float nv = clamp(dot(ns, v), 0.0, 1.0);
  float gloss = (1.0 - rough) * (1.0 - rough);
  float fresnel = (0.03 + 0.97 * pow(1.0 - nv, 4.0)) * (0.09 + 0.24 * gloss);
  vec3 rf = reflect(-v, ns);
  rf.y = abs(rf.y);
  c += fresnel * crustMirror(rf, rough) * open;

  // The tear: open lava at the bottom, a skin that still glows on its walls.
  float heat = mk.r;
  float hot = smoothstep(0.12, 0.6, heat * (0.8 + 0.4 * small));
  float breath = 25.0 * sin(uTime * 1.5708 + 6.0 * small);
  float kelvin = mix(1020.0, uTearKelvin - 70.0 + 90.0 * vnoise(l * 5.0 + 3.0) + breath, hot);
  c *= 1.0 - 0.9 * smoothstep(0.05, 0.4, heat);
  c += blackbody(kelvin) * smoothstep(0.04, 0.3, heat);

  gl_FragColor = vec4(rigOut(c), alpha);
  // Last, so the pixels beside a dropped one still have their derivatives.
  #ifdef RIM
  if (alpha < 0.004) discard;
  #endif
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
uniform float uTime;
void main() {
  vLocal = position;
  vLocalNormal = normal;
  vMap = aMap;
  vSurf = aSurf;
  // What hangs by one end stirs in the air that rises off the crust: most at its free end, never the same twice in eight seconds.
  float hangs = step(1.5, aMap.w) * aMap.y / 1.6;
  float stir = hangs * hangs * (0.05 * sin(uTime * 2.3562 + position.x * 1.7) + 0.025 * sin(uTime * 5.4978 + position.z * 2.3));
  vec4 w = modelMatrix * vec4(position + vec3(0.35, 0.0, 1.0) * stir, 1.0);
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

  // On the body the hide is drawn out along the cords it dried in; on a limb along the limb.
  float lump = vnoise3(vLocal * 1.1 + 4.0);
  vec2 uvH = mix(vec2(vMap.x * vMap.z, vMap.y / 0.6), vec2(vMap.y * 0.6 + 0.15 * lump, vMap.x * 9.0), isBody);
  vec2 uvP = mix(vec2(vMap.x * vMap.z + 0.37, vMap.y / 0.52 + 0.11), vec2(vMap.y * 1.4 + 0.37, vMap.x * 11.0 + 0.11), isBody);
  vec3 hide = texture2D(tHide, uvH).rgb;
  vec4 hideNh = texture2D(tHideNh, uvH);
  vec3 flake = texture2D(tFlake, uvP).rgb;
  vec4 flakeNh = texture2D(tFlakeNh, uvP);
  float grey = dot(hide, vec3(0.33));
  float tone = dot(flake, vec3(0.33));
  // A charred bark of hide, brown-black; the creases between its cords hold the soot.
  vec3 bark = vec3(0.088, 0.072, 0.061) * (0.3 + 9.0 * grey) * (0.45 + 1.25 * hideNh.b * hideNh.b) * (1.0 + 0.5 * isBody);
  // The scabs and plates that lift off it are the same hide, dried a little paler.
  vec3 scab = vec3(0.16, 0.138, 0.115) * (0.55 + 5.0 * tone) * (0.7 + 0.5 * flakeNh.b);

  // On a leg the plates are in its shape; on the body the hide scabs in patches.
  float worn = lump + 0.5 * flakeNh.b - 0.25;
  float onLeg = smoothstep(0.35, 0.6, vSurf.y);
  float lifted = mix(isBody * smoothstep(0.5, 0.62, flakeNh.b + 0.35 * (lump - 0.5)) * (1.0 - 0.8 * vSurf.y), onLeg, isLeg);
  vec3 albedo = mix(bark, scab, lifted);
  vec2 bump = mix((hideNh.rg - 0.5) * 1.8, (flakeNh.rg - 0.5) * 2.6, lifted) * (0.35 + 0.65 * close);
  float cavity = mix(0.6 + 0.4 * hideNh.b, 0.6 + 0.4 * flakeNh.b, lifted);

  // Where a plate has gone from a leg: dried flesh, almost black, strung with sinew along the limb.
  float cordAt = vMap.x * vMap.z * 21.0 + 1.5 * vnoise(vec2(vMap.x * vMap.z * 3.0, vMap.y * 0.9));
  float cordTone = fract(sin(floor(cordAt) * 78.233) * 43758.5453);
  float cordRun = smoothstep(0.35, 0.6, vnoise(vec2(floor(cordAt) * 7.3, vMap.y * 0.8 + cordTone * 9.0)));
  float cs = 2.0 * fract(cordAt) - 1.0;
  float cord = (1.0 - cs * cs) * cordRun * step(0.3, cordTone) * smoothstep(1.2, 0.5, fwidth(cordAt)) * isLeg;
  vec3 flesh = bark * 0.75;
  vec3 sinew = vec3(0.1, 0.085, 0.07) * (0.55 + 0.6 * hideNh.b);
  float bare = isLeg * (1.0 - onLeg);
  albedo = mix(albedo, mix(flesh, sinew, 0.5 * smoothstep(0.3, 0.9, cord)), bare);
  bump = mix(bump, (hideNh.rg - 0.5) * 0.8 + vec2(-0.9 * cs * cord, 0.0), bare);
  // The torn edge of a plate stands over what is under it and shades it.
  float under = isLeg * smoothstep(0.03, 0.3, vSurf.y) * (1.0 - smoothstep(0.3, 0.62, vSurf.y));
  // The cords of the body's hide are dry and grey-brown on their backs; the furrows between them are black.
  float ridge = isBody * smoothstep(0.18, 0.5, hideNh.b * (1.0 - vSurf.y) + 0.25 * (lump - 0.5));
  albedo = mix(albedo * (1.0 - 0.6 * isBody * vSurf.y), vec3(0.2, 0.19, 0.18) * (0.6 + 6.0 * grey), 0.8 * ridge);

  // The lava that climbed it and froze. Its edge is cut by the grain of the skin so it is not a drawn line.
  vec2 uvL = vec2(vMap.x * vMap.z * 0.5, vMap.y / 1.9);
  vec4 lavaNh = texture2D(tRopyNh, uvL);
  float coat = smoothstep(0.36, 0.64, vSurf.x + 0.3 * (lavaNh.b - 0.5));
  vec3 lava = vec3(0.045, 0.045, 0.047) * (0.35 + 0.65 * dot(texture2D(tRopy, uvL).rgb, vec3(5.7)));
  albedo = mix(albedo, lava * (0.75 + 0.5 * lavaNh.b), coat);
  bump = mix(bump, (lavaNh.rg - 0.5) * 1.2, coat);
  cavity = mix(cavity, 0.75 + 0.25 * lavaNh.b, coat);

  // The end of the body by the tear is stained by its heat.
  vec2 fromTear = vLocal.xz - vec2(${(TEAR[2] as [number, number])[0].toFixed(2)}, ${(TEAR[2] as [number, number])[1].toFixed(2)});
  albedo *= mix(vec3(1.0), vec3(1.1, 0.9, 0.8), isBody * exp(-dot(fromTear, fromTear) / 9.0));
  // Ash lies on whatever faces up: thick on the tops of the plates and the cords, none underneath.
  float grit = vnoise3(vLocal * 9.0);
  float up = mix(smoothstep(0.1, 0.7, nl.y), smoothstep(-0.1, 0.45, nl.y), isLeg);
  float dust = up * (0.2 + 0.8 * smoothstep(0.3, 0.65, 1.0 - lump + 0.4 * (grit - 0.5) + 0.5 * (flakeNh.b - 0.5))) * mix(1.0, 0.3, bare) * (1.0 - 0.7 * isBody * vSurf.y) * (1.0 - 0.5 * coat);
  albedo = mix(albedo, mix(uAsh, ASH, isBody) * (0.7 + 0.5 * grit) * (0.7 + 0.6 * mix(hideNh.b, flakeNh.b, lifted)), dust * mix(0.5, 0.92, lifted) * mix(1.0, 0.45, isBody));

  // The bump is laid on the surface along its own directions.
  vec3 along = normalize(cross(n, vec3(0.31, 0.9, 0.29)));
  vec3 round2 = cross(n, along);
  n = normalize(n + (along * bump.x + round2 * bump.y) * 0.9);

  float occ = cavity * vSurf.z * (1.0 - 0.75 * under * (1.0 - coat));
  float rough = mix(0.9 - 0.4 * cord * bare, 0.78, coat);
  vec3 c = sunkShade(vWorld, n, v, albedo, rough, occ);
  c += albedo * tearLight(vLocal, nl) * (0.5 + 0.5 * occ) / 3.14159;
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
