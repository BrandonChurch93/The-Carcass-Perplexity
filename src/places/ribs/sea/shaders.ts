// The water of the Ribs in the light of the rig: the open sea with its surf, the pools and runnels on the floor, the bore, and thrown spray.
import { RIG_GLSL, RIG_UNIFORMS_GLSL } from '../shared/glsl';
import { SWELL } from './tide';

const f = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);

// The swell as a sum of peaked waves: height in metres and its slope. `fine` is the spacing of whoever asks (a vertex ring, a pixel on the water):
// a wave it cannot carry is faded out between `lo` and `hi` of wave number times spacing.
const SWELL_GLSL = /* glsl */ `
float swellAt(vec2 p, float t, float fine, float lo, float hi, out vec2 grad) {
  float h = 0.0;
  grad = vec2(0.0);
${SWELL.map(([dx, dz, length, amp]) => {
  const k = (Math.PI * 2) / length;
  const w = Math.sqrt(9.81 * k);
  return `  {
    float ph = ${f(k)} * dot(p, vec2(${f(dx)}, ${f(dz)})) - ${f(w)} * t;
    float keep = 1.0 - smoothstep(lo, hi, ${f(k)} * fine);
    h += keep * ${f(amp)} * (cos(ph) + ${f(0.9 * k * amp)} * cos(2.0 * ph));
    grad -= keep * ${f(amp * k)} * (sin(ph) + ${f(1.8 * k * amp)} * sin(2.0 * ph)) * vec2(${f(dx)}, ${f(dz)});
  }`;
}).join('\n')}
  return h;
}
float swellPhase(vec2 p, float t) {
  return ${f((Math.PI * 2) / (SWELL[0] as number[])[2]!)} * dot(p, vec2(${f((SWELL[0] as number[])[0]!)}, ${f((SWELL[0] as number[])[1]!)})) - ${f(Math.sqrt((9.81 * Math.PI * 2) / (SWELL[0] as number[])[2]!))} * t;
}`;

export const SEA_VERTEX = /* glsl */ `
${RIG_UNIFORMS_GLSL}
uniform vec3 uEye;
varying vec3 vWorld;
${SWELL_GLSL}
void main() {
  vec2 p = position.xz + uEye.xz;
  float r = length(position.xz);
  float bed = texture2D(tLand, (p - uLandRect.xy) * uLandRect.zw).r;
  float calm = smoothstep(0.3, 9.0, -bed);
  vec2 g;
  float h = swellAt(p, uTime, r * 0.02 + 0.1, 0.5, 1.3, g) * calm;
  vWorld = vec3(p.x, h, p.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

export const SEA_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
uniform sampler2D tChop;
uniform sampler2D tFeet;
uniform vec2 uWind;
uniform float uFeetReach;
varying vec3 vWorld;
${SWELL_GLSL}
void main() {
  vec2 p = vWorld.xz;
  vec3 toEye = cameraPosition - vWorld;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec4 land = landAt(p);
  float depth = -land.r;
  float feet = texture2D(tFeet, (p - uLandRect.xy) * uLandRect.zw).r * uFeetReach;
  // Water shoals toward the sand and toward the foot of a blade alike.
  float ragged = (texture2D(tChop, p / 173.0).b - 0.5) * 5.0 + (texture2D(tChop, p.yx / 39.0).b - 0.5) * 2.0;
  float shoal = min(depth + ragged * smoothstep(0.0, 3.0, depth), 0.2 + feet * 0.4);
  float calm = smoothstep(0.3, 9.0, depth);
  float px = length(fwidth(p));
  vec2 g;
  float h = swellAt(p, uTime, px, 0.9, 2.4, g) * calm;
  g *= calm;

  vec4 c1 = texture2D(tChop, p / 47.0 - uTime * uWind * 0.064);
  vec4 c2 = texture2D(tChop, vec2(p.y, -p.x) / 13.7 + uTime * vec2(uWind.y, -uWind.x) * 0.117);
  vec4 c3 = texture2D(tChop, (p + (c1.xy - 0.5) * 2.0) / 3.9 - uTime * uWind * 0.23);
  vec2 s2 = c2.xy - 0.5;
  float lively = 0.3 + 0.7 * smoothstep(0.0, 2.5, depth);
  // The smallest faces only where the lens can hold them.
  vec4 c4 = texture2D(tChop, (vec2(-p.y, p.x) + (c2.xy - 0.5) * 0.7) / 0.97 + uTime * uWind * 0.31);
  float fineKeep = 1.0 - smoothstep(0.004, 0.03, px);
  vec2 chop = ((c1.xy - 0.5) * 0.55 + vec2(-s2.y, s2.x) * 0.5 + (c3.xy - 0.5) * 0.45 + (c4.xy - 0.5) * 0.4 * fineKeep) * lively;
  vec3 n = normalize(vec3(-(g.x + chop.x), 1.0, -(g.y + chop.y)));

  // What the lens cannot resolve it still sees: of all the small faces of a wind sea, the ones turned to it. Their mean leans to the eye,
  // by the rms slope when the view grazes and less as it steepens. So the far sea is no mirror: it shows the sky well over the horizon, dimly.
  float far = smoothstep(150.0, 2600.0, dist);
  float graze = max(v.y, 0.0);
  float sigma = 0.21 * lively;
  float lean = sigma * sigma / (graze + 1.25 * sigma);
  n = normalize(n + vec3(v.x, 0.0, v.z) / max(length(v.xz), 1e-4) * lean);
  float nv = max(dot(n, v), 0.0);
  float fres = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y) + 0.02;
  r = normalize(r);
  float open = land.g;
  float sun = sunAt(vWorld, land);
  // Near, the water mirrors the cloud's shapes; far, where a pixel holds a thousand faces, the mean sky.
  vec3 refl = mix(skyCloud(vWorld, r), skyRadiance(r), far) * mix(1.0, open, 0.6);
  vec3 hv = normalize(v + uSunDir);
  float gl = pow(max(dot(n, hv), 0.0), mix(700.0, 60.0, far));
  refl += uSunColour * gl * sun * mix(6.0, 0.8, far);

  vec3 e = skyIrradiance(vec3(0.0, 1.0, 0.0)) * open + uSunColour * (uSunDir.y * sun);
  vec3 deep = vec3(0.024, 0.056, 0.052);
  vec3 shallow = vec3(0.095, 0.105, 0.088);
  vec3 body = mix(shallow, deep, smoothstep(0.0, 5.0, depth));
  // Light comes through the thin top of a wave that faces the lens.
  body *= 1.0 + 1.6 * smoothstep(0.3, 1.2, h + 2.0 * (c1.b - 0.5)) * calm;
  vec3 col = mix(body * e / 3.14159, refl, fres);

  float lace = 0.55 * texture2D(tChop, p / 7.3 - uTime * uWind * 0.08).a + 0.45 * texture2D(tChop, p.yx / 1.9 + uTime * 0.05).a;
  float cap = smoothstep(0.6, 0.76, c1.b * 0.55 + c2.b * 0.35 + 0.1 * h) * calm;
  vec2 across = vec2(-uWind.y, uWind.x);
  float lane = texture2D(tChop, vec2(dot(p, across) / 31.0, dot(p, uWind) / 330.0 - uTime * 0.012)).b;
  lane = smoothstep(0.66, 0.9, lane) * calm * 0.55;
  float ph = swellPhase(p, uTime) + 0.9 * shoal;
  float crest = pow(0.5 + 0.5 * cos(ph), 3.0);
  float wet = smoothstep(-0.25, 0.25, depth);
  float surfZone = smoothstep(5.5, 1.2, shoal) * wet;
  float wash = smoothstep(1.7, 0.15, shoal) * wet;
  float amount = max(max(cap * 0.9, lane), surfZone * (0.3 + 0.7 * crest) + wash * (0.55 + 0.4 * sin(ph - 1.2)));
  float foam = smoothstep(1.0 - amount, 1.3 - amount, lace) * smoothstep(0.0, 0.25, amount);
  vec3 foamCol = vec3(0.8, 0.81, 0.8) * (0.7 + 0.3 * lace) * e / 3.14159;
  col = mix(col, foamCol, clamp(foam, 0.0, 1.0));
  gl_FragColor = vec4(rigOut(col), 1.0);
}`;

export const POOL_VERTEX = /* glsl */ `
attribute float aDepth;
varying vec3 vWorld;
varying float vDepth;
void main() {
  vWorld = position;
  vDepth = aDepth;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

export const POOL_FRAGMENT = (rings: number): string => /* glsl */ `
precision highp float;
${RIG_GLSL}
uniform sampler2D tChop;
uniform vec2 uWind;
uniform vec4 uRings[${rings}];
uniform vec4 uStands[${rings}];
uniform float uFront;
uniform float uBoreHeight;
uniform int uRingCount;
uniform float uPoolLevel;
uniform vec2 uDrain;
uniform sampler2D tFeet;
uniform float uFeetReach;
varying vec3 vWorld;
varying float vDepth;
// What stands in the mirror: the blades. The mirrored ray is walked out over the plan of their feet; xyz how much of it a blade fills, and how far off.
vec2 standing(vec2 p, vec3 r) {
  vec2 dir = normalize(r.xz + 1e-5);
  float rise = r.y / max(length(r.xz), 1e-3);
  float hit = 0.0;
  float far = 0.0;
  float t = 14.0;
  for (int i = 0; i < 8; i++) {
    float feet = texture2D(tFeet, (p + dir * t - uLandRect.xy) * uLandRect.zw).r * uFeetReach;
    float h = (1.0 - smoothstep(-4.0, 14.0, feet - 0.06 * t * rise)) * (1.0 - smoothstep(240.0, 380.0, t * rise));
    far = mix(far, t, step(hit, 0.02) * step(0.02, h));
    hit = max(hit, h);
    t *= 1.85;
  }
  return vec2(hit, far);
}
void main() {
  vec2 p = vWorld.xz;
  vec3 toEye = cameraPosition - vWorld;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec4 land = landAt(p);
  vec4 c1 = texture2D(tChop, p / 3.1 - uTime * uWind * 0.16);
  vec4 c2 = texture2D(tChop, vec2(p.y, -p.x) / 0.83 + uTime * vec2(uWind.y, -uWind.x) * 0.3);
  float gust = smoothstep(0.38, 0.72, texture2D(tChop, p / 97.0 - uTime * uWind * 0.11).b);
  // The true bed under this pixel: the sheet ends where the bed breaks the level, in braids.
  // Over the level of the pools it is a draining film that follows the bed and lies in its fine lows, thinner the higher the bed, and none over uDrain.y.
  float over = max(land.r - uPoolLevel, 0.0);
  float depth = uPoolLevel + uDrain.x * over - (land.r + bedFine(p)) - 0.03 * smoothstep(0.0, 0.1, over) - 0.1 * smoothstep(0.5 * uDrain.y, uDrain.y, over);
  if (depth < 0.0) discard;
  float edge = smoothstep(0.0, 0.012, depth);
  vec2 s2 = c2.xy - 0.5;
  vec2 slope = ((c1.xy - 0.5) * 0.11 + vec2(-s2.y, s2.x) * 0.07) * (0.2 + 0.8 * gust) * smoothstep(0.0, 0.07, depth);
  for (int i = 0; i < ${rings}; i++) {
    if (i >= uRingCount) break;
    vec2 d = p - uRings[i].xy;
    float l = length(d) + 1e-3;
    float wave = sin(l * 13.0 - uTime * 9.0 + uRings[i].z) * exp(-l * 1.1) * uRings[i].w;
    slope += (d / l) * wave * 0.16;
  }
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
  float nv = max(dot(n, v), 0.0);
  float fres = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y) + 0.01;
  r = normalize(r);
  float open = land.g * (1.0 - contactDrawn(vWorld));
  float sun = sunAt(vWorld, land);
  vec3 refl = skyCloud(vWorld, r) * mix(1.0, open, 0.5);
  // The blades stand in it, dark, paler with the air between.
  // The lead draws each blade's true image on the water after this sheet (land/, MIRROR): the walked mirror here stood as a block beside it and is off.
#ifdef WALKED_MIRROR
  vec2 stood = standing(p, r);
#else
  vec2 stood = vec2(0.0, 1e6);
#endif
  vec3 rock = skyIrradiance(vec3(0.0, 1.0, 0.0)) * 0.05;
  refl = mix(refl, mix(rock, uHaze, 1.0 - exp(-stood.y / 500.0)), stood.x * 0.9);
  // The wall of the bore stands in it as it comes: white at the foot, the dark lifted water, the white crest and the spray over it.
  float toWall = (uFront + 20.0 * sin(p.x * 0.0076 + 1.3) - p.y) / min(r.z, -1e-3);
  if (toWall > 0.0 && toWall < 1500.0) {
    float k = toWall * r.y / (uBoreHeight * (0.9 + 0.2 * c1.b));
    float wall = (1.0 - smoothstep(1.15, 1.7, k)) * smoothstep(1500.0, 700.0, toWall) * (stood.x < 0.02 || toWall < stood.y ? 1.0 : 1.0 - stood.x);
    float white = max(1.0 - smoothstep(0.1, 0.2, k), smoothstep(0.7, 0.86, k));
    vec3 lit = skyIrradiance(vec3(0.0, 0.6, 0.8)) / 3.14159;
    refl = mix(refl, mix(vec3(0.07, 0.085, 0.07), vec3(0.9), white) * lit, wall * mix(1.0, 0.55, smoothstep(1.0, 1.15, k)));
  }
  // The waders stand in it too: each leg a post, each body a ball, met by the mirrored ray. Feet and mirror join at the water.
  float rl = max(length(r.xz), 1e-3);
  vec2 rd = r.xz / rl;
  float mirrored = 0.0;
  for (int i = 0; i < ${rings}; i++) {
    if (i >= uRingCount) break;
    vec4 st = uStands[i];
    if (st.w == 0.0) continue;
    vec2 to = st.xy - p;
    float t = dot(to, rd);
    float miss = abs(to.x * rd.y - to.y * rd.x);
    float high = t * r.y / rl;
    float hit = st.w > 0.0
      ? (1.0 - smoothstep(st.w * 0.5, st.w * 1.5, miss)) * (1.0 - smoothstep(st.z - 0.15, st.z, high))
      : 1.0 - smoothstep(-st.w * 0.7, -st.w, length(vec2(miss, (high - st.z) * 1.3)));
    mirrored = max(mirrored, hit * step(0.0, t));
  }
  refl = mix(refl, vec3(0.46, 0.44, 0.4) * skyIrradiance(vec3(0.0, 0.3, 0.0) - vec3(rd.x, 0.0, rd.y)) / 3.14159, mirrored * 0.85);
  vec3 hv = normalize(v + uSunDir);
  // The glare path toward the sun: a hard core, and the broken glitter of the ripples round it.
  refl += uSunColour * (pow(max(dot(n, hv), 0.0), 900.0) * 8.0 + pow(max(dot(n, hv), 0.0), 90.0) * 0.9 * (0.4 + 1.2 * c2.a)) * sun;
  vec3 e = skyIrradiance(vec3(0.0, 1.0, 0.0)) * open + uSunColour * (uSunDir.y * sun);
  float murk = 1.0 - exp(-max(depth, 0.0) * 5.0);
  vec3 body = vec3(0.1, 0.105, 0.09) * e / 3.14159;
  vec3 col = fres * refl + (1.0 - fres) * murk * body;
  float alpha = (fres + (1.0 - fres) * murk) * edge;
  gl_FragColor = vec4(rigOut(col * edge), alpha * (1.0 - uSolo));
}`;

const BORE_SHAPE_GLSL = /* glsl */ `
uniform float uFront;
uniform float uBoreHeight;
uniform sampler2D tChop;
uniform sampler2D tFoam;
// How far the front runs ahead of or behind its line at x: the wall is one wall, and it is not ruled.
float boreLine(float x) {
  return 20.0 * sin(x * 0.0076 + 1.3) + 8.0 * sin(x * 0.021 + uTime * 0.25) + 3.0 * sin(x * 0.09 - uTime * 0.6);
}
float boreHigh(float x) {
  float strait = smoothstep(950.0, 520.0, abs(x - 80.0));
  return uBoreHeight * (0.3 + 0.7 * strait) * (0.88 + 0.12 * sin(x * 0.021 + uTime * 0.7) + 0.08 * sin(x * 0.063 - uTime * 1.1));
}
// The churn of the face: round heads of white water with sharp creases between, falling down the face as the wall runs. x: big heads, y: small.
vec2 boreChurn(float x, float s) {
  // Read no finer than the sheet is meshed (0.7 m): finer would stand as a curtain of ridges down the face.
  float a = textureLod(tFoam, vec2(x * 0.8, s + uTime * 6.0) / 64.0, 2.3).g;
  float b = textureLod(tFoam, vec2(x + 2.0 * uTime, s * 1.2 + uTime * 9.0) / 21.0, 3.7).g;
  return vec2(a, b);
}
// A point of the bore: x across the strait, s metres behind the front along the bed. Returns the world place, w = s in wall heights.
vec4 boreAt(float x, float s) {
  float H = boreHigh(x);
  float u = s / H;
  float uc = clamp(u / 0.75, 0.0, 1.0);
  // A breaking face: hollow at the foot, steepest under the lip, and the lip thrown forward over it.
  float rise = pow(uc, 1.6);
  // Behind the lip the water falls away at once: from the flat nothing of the back stands over the lip.
  float back = 0.6 + 0.4 * exp(-max(u - 0.75, 0.0) / 0.3);
  float y = u < 0.0 ? 0.26 * (1.0 + s / 48.0) + 0.04 : 0.3 + (H - 0.3) * rise * back;
  float fwd = H * 0.5 * uc * uc * uc * exp(-max(u - 0.75, 0.0) / 0.25) * step(0.0, u);
  float lumpA = textureLod(tFoam, vec2(x, s + uTime * 7.0) / 83.0, 1.8).r - 0.5;
  float lumpB = textureLod(tFoam, vec2(x + 3.0 * uTime, s - uTime * 4.0) / 31.0, 3.2).r - 0.5;
  float amp = H * smoothstep(-0.02, 0.3, u) * (0.2 * exp(-max(u - 0.75, 0.0) / 0.4) + 0.03);
  y += amp * (1.3 * lumpA + 0.7 * lumpB);
  fwd += amp * 0.9 * lumpB;
  // White water piles on the face and the crest in heads.
  vec2 ch = boreChurn(x, s);
  // The heads pile at the foot and again on the lip; the hollow face between is drawn smooth.
  float churn = smoothstep(-0.01, 0.1, u) * (1.0 - 0.75 * smoothstep(0.2, 0.3, u) * smoothstep(0.75, 0.6, u)) * exp(-max(u - 0.75, 0.0) / 0.12);
  float puff = H * churn * (0.2 * ch.x + 0.09 * ch.y);
  y += puff * 0.55;
  fwd += puff;
  float z = uFront + boreLine(x) - s + fwd;
  float bed = max(texture2D(tLand, (vec2(x, z) - uLandRect.xy) * uLandRect.zw).r, 0.0);
  return vec4(x, bed + y, z, u);
}`;

export const BORE_VERTEX = /* glsl */ `
${RIG_UNIFORMS_GLSL}
${BORE_SHAPE_GLSL}
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vRide;
void main() {
  vec4 at = boreAt(position.x, position.y);
  vec3 ax = boreAt(position.x + 1.6, position.y).xyz - boreAt(position.x - 1.6, position.y).xyz;
  vec3 as = boreAt(position.x, position.y + 1.0).xyz - boreAt(position.x, position.y - 1.0).xyz;
  vWorld = at.xyz;
  vNormalW = normalize(cross(ax, as));
  vRide = vec3(position.x, position.y, at.w);
  gl_Position = projectionMatrix * viewMatrix * vec4(at.xyz, 1.0);
}`;

export const BORE_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
${BORE_SHAPE_GLSL}
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vRide;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float u = vRide.z;
  vec2 ch = boreChurn(vRide.x, vRide.y);
  // Marks ride with the wall and tumble down its face.
  // Down the face they are laid by the height (the face is too steep for the metres along the bed to carry them: they would hang as a curtain); over the back by the bed.
  float Hh = boreHigh(vRide.x);
  float down = mix(-1.1 * (Hh - vWorld.y), vRide.y - 0.75 * Hh, smoothstep(0.7, 0.85, u));
  // One speed for all of it: a scroll that changed with the place on the wall sheared the marks into a curtain of lines.
  vec2 q = vec2(vRide.x, down - uTime * 8.0);
  vec4 a = texture2D(tChop, q / 29.0);
  vec4 f1 = texture2D(tFoam, q * vec2(1.0, 0.5) / 13.0);
  // Strings of white running down the face: long down it, a hand to a metre across.
  vec4 f2 = texture2D(tFoam, vec2(q.y * 0.2, q.x * 1.3) / 3.1 + f1.rb * 0.35);
  float strings = 0.6 * f2.r + 0.4 * texture2D(tFoam, vec2(q.y * 0.3, q.x * 2.9) / 3.1 + 0.37 + f1.ga * 0.2).g;
  float fine = texture2D(tFoam, q / 4.1 + f1.rb * 0.2).r;
  float face = smoothstep(1.9, 0.7, u);
  float lace = mix(0.5 * a.a + 0.5 * texture2D(tChop, q.yx / 3.3).a, 0.2 + 0.35 * f1.r + 0.3 * fine, face);
  // Under the heads of the crest the lifted water shows dark in windows; at the foot it is all broken white.
  float big = texture2D(tFoam, vec2(vRide.x, uTime * 3.0) / 97.0).r;
  // The face is one dark band of lifted water from the churn at the foot to the heads of the crest; its edges are torn, strings of white run down it.
  float tear = 0.2 * (big - 0.5) + 0.05 * (f1.r - 0.5);
  float lifted = smoothstep(0.36 + tear, 0.5 + tear, u) * smoothstep(0.8 + 0.5 * tear, 0.68 + 0.5 * tear, u);
  float amount = mix(0.5 + 0.4 * exp(-max(u - 1.0, 0.0) * 0.1), 1.2 - 0.86 * lifted, face);
  // Ahead of the wall foam runs out over the wet flat in tongues, thinning to lace.
  float ahead = clamp(-vRide.y / 48.0, 0.0, 1.0);
  float tongue = texture2D(tFoam, vec2(vRide.x, uTime * 2.0) / 61.0).r + 0.5 * texture2D(tFoam, vec2(vRide.x, vRide.y * 0.5 + uTime * 5.0) / 23.0).r;
  amount = mix(amount, 1.25 - 2.3 * ahead / (0.25 + tongue), step(u, 0.0));
  float foam = smoothstep(1.0 - amount, 1.2 - amount, mix(lace, 0.2 + 0.75 * strings + 0.12 * (f1.g - 0.3), face * smoothstep(0.0, 0.5, lifted)));
  if (u < 0.0 && foam < 0.35) discard;
  vec2 bump = vec2(f2.g - f1.a, f2.a - f1.g) * 0.5 + (a.xy - 0.5) * (1.0 - face);
  // White water is not a skin: its light comes from all through it, so the folds of the sheet under it count for less.
  vec3 n = normalize(mix(vNormalW, vec3(0.0, 0.62, 0.78), mix(0.6, 0.95, smoothstep(0.55, 0.7, u)) * foam * face) + vec3(bump.x, 0.0, bump.y) * mix(0.35, 0.3, foam));
  if (dot(n, v) < 0.0) n = reflect(n, v);
  // The creases between the heads hold no light.
  float crease = smoothstep(0.02, 0.4, ch.x) * (0.5 + 0.5 * smoothstep(0.02, 0.35, ch.y));
  float pit = (0.55 + 0.45 * smoothstep(0.3, 0.62, f1.r)) * (0.7 + 0.3 * smoothstep(0.3, 0.6, f2.r)) * (0.75 + 0.25 * smoothstep(0.03, 0.3, f2.g));
  float hollow = mix(1.0, (0.5 + 0.5 * crease) * pit, face);
  // The lifted water is thick with sand: slate green, brown where it is thin at the lip.
  vec3 water = mix(vec3(0.045, 0.07, 0.058), vec3(0.13, 0.115, 0.07), smoothstep(0.55, 0.85, u) * face);
  // White water is lit all through: it holds more light than a painted wall.
  vec3 white = vec3(0.95, 0.96, 0.96);
  vec3 albedo = mix(water, white, foam);
  vec3 col = rigShade(vWorld, n, v, albedo, mix(0.45, 1.0, foam), mix(1.0, hollow, foam));
  // Lit from behind: where the lifted water thins toward the lip the light comes through it green, and the crest's white burns.
  float behind = 0.35 + 0.65 * pow(max(dot(-v, uSunDir), 0.0), 2.0);
  float thin = smoothstep(0.5, 0.85, u) * face;
  col += (1.0 - foam) * vec3(0.05, 0.13, 0.095) * thin * behind * (uSunColour * 0.25 + skyIrradiance(vec3(0.0, 1.0, 0.0)) * 0.25);
  col += foam * hollow * white * uSunColour * 0.2 * behind * smoothstep(0.3, 0.6, u);
  col += foam * hollow * white * skyIrradiance(vec3(0.0, 1.0, 0.0)) * 0.2;
  gl_FragColor = vec4(rigOut(col), 1.0);
}`;

export const SPRAY_VERTEX = /* glsl */ `
${RIG_GLSL}
attribute vec4 aAt;
attribute vec4 aLook;
varying vec2 vUv;
varying vec4 vLook;
varying vec3 vLight;
varying float vMist;
void main() {
  vec4 centre = viewMatrix * vec4(aAt.xyz, 1.0);
  float turn = aLook.z;
  vec2 corner = position.xy * aAt.w;
  corner = vec2(corner.x * cos(turn) - corner.y * sin(turn), corner.x * sin(turn) + corner.y * cos(turn));
  centre.xy += corner * vec2(1.0, aLook.w);
  vUv = position.xy;
  vLook = aLook;
  vMist = step(1.0, aLook.x);
  vLook.x -= vMist;
  vec4 land = landAt(aAt.xz);
  float open = mix(land.g, 1.0, clamp((aAt.y - land.r) / 120.0, 0.0, 1.0));
  // Thrown water in the open air: lit from every side, the sky's light all round it.
  vLight = (skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.5 + 0.9 * open) + uSunColour * 0.6 * sunAt(aAt.xyz, land)) / 3.14159;
  // Mist is water too thin to be white: it holds the grey of the storm.
  vLight *= mix(vec3(1.0), vec3(0.23, 0.26, 0.28), vMist);
  // Thrown water between the lens and the sun burns: the light comes forward through it.
  float through = pow(max(dot(normalize(aAt.xyz - cameraPosition), uSunDir), 0.0), 3.0);
  vLight += uSunColour * through * mix(0.16, 0.012, vMist) * mix(0.35, 1.0, open);
  gl_Position = projectionMatrix * centre;
}`;

export const SPRAY_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_UNIFORMS_GLSL}
uniform sampler2D tFoam;
varying vec2 vUv;
varying vec4 vLook;
varying vec3 vLight;
varying float vMist;
void main() {
  float r2 = dot(vUv, vUv);
  vec4 t = texture2D(tFoam, vUv * 0.19 + vLook.y * vec2(3.1, 7.3));
  // A head of thrown water: eaten at the rim into lumps and strings, thick in the middle.
  float eat = r2 + mix(1.5, 0.5, vMist) * (t.r - 0.5) + mix(0.6, 0.0, vMist) * (0.5 - t.g);
  float body = 1.0 - smoothstep(mix(0.22, -0.1, vMist), mix(0.72, 0.95, vMist), eat);
  float alpha = body * (0.55 + 0.45 * t.a) * vLook.x * (1.0 - uSolo);
  vec3 col = vec3(0.95, 0.96, 0.96) * vLight * (0.9 + 0.6 * t.g) * mix(0.62 + 0.3 * body + 0.42 * vUv.y + 0.25 * (t.r - 0.5), 1.0, vMist);
  gl_FragColor = vec4(col * alpha, alpha);
}`;
