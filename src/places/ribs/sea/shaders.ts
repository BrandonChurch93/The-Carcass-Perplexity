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
  float h = swellAt(p, uTime, r * 0.05, 0.5, 1.3, g) * calm;
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
  float shoal = min(depth, 0.2 + feet * 0.4);
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
  vec2 chop = ((c1.xy - 0.5) * 0.5 + vec2(-s2.y, s2.x) * 0.42 + (c3.xy - 0.5) * 0.36) * lively;
  vec3 n = normalize(vec3(-(g.x + chop.x), 1.0, -(g.y + chop.y)));

  float far = smoothstep(150.0, 2600.0, dist);
  float nv = max(dot(n, v), 0.0);
  float fres = (0.02 + 0.98 * pow(1.0 - nv, 5.0)) * (1.0 - 0.3 * far);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y) + 0.02 + 0.14 * far;
  r = normalize(r);
  float open = land.g;
  float sun = sunAt(vWorld, land);
  vec3 refl = skyRadiance(r) * mix(1.0, open, 0.6);
  vec3 hv = normalize(v + uSunDir);
  float gl = pow(max(dot(n, hv), 0.0), mix(700.0, 90.0, far));
  refl += uSunColour * gl * sun * mix(6.0, 1.2, far);

  vec3 e = skyIrradiance(vec3(0.0, 1.0, 0.0)) * open + uSunColour * (uSunDir.y * sun);
  vec3 deep = vec3(0.017, 0.043, 0.041);
  vec3 shallow = vec3(0.095, 0.105, 0.088);
  vec3 body = mix(shallow, deep, smoothstep(0.0, 5.0, depth));
  // Light comes through the thin top of a wave that faces the lens.
  body *= 1.0 + 1.6 * smoothstep(0.3, 1.2, h + 2.0 * (c1.b - 0.5)) * calm;
  vec3 col = mix(body * e / 3.14159, refl, fres);

  float lace = 0.55 * texture2D(tChop, p / 7.3 - uTime * uWind * 0.08).a + 0.45 * texture2D(tChop, p.yx / 1.9 + uTime * 0.05).a;
  float cap = smoothstep(0.74, 0.92, c1.b * 0.55 + c2.b * 0.35 + 0.12 * h) * calm;
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
uniform int uRingCount;
varying vec3 vWorld;
varying float vDepth;
void main() {
  vec2 p = vWorld.xz;
  vec3 toEye = cameraPosition - vWorld;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec4 land = landAt(p);
  vec4 c1 = texture2D(tChop, p / 3.1 - uTime * uWind * 0.16);
  vec4 c2 = texture2D(tChop, vec2(p.y, -p.x) / 0.83 + uTime * vec2(uWind.y, -uWind.x) * 0.3);
  float gust = smoothstep(0.38, 0.72, texture2D(tChop, p / 97.0 - uTime * uWind * 0.11).b);
  float depth = vDepth + 0.012 * (c1.b - 0.5);
  float edge = smoothstep(0.0, 0.02, depth);
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
  vec3 refl = skyRadiance(r) * mix(1.0, open, 0.5);
  vec3 hv = normalize(v + uSunDir);
  refl += uSunColour * pow(max(dot(n, hv), 0.0), 900.0) * sun * 8.0;
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
// How far the front runs ahead of or behind its line at x: the wall is one wall, and it is not ruled.
float boreLine(float x) {
  return 20.0 * sin(x * 0.0076 + 1.3) + 8.0 * sin(x * 0.021 + uTime * 0.25) + 3.0 * sin(x * 0.09 - uTime * 0.6);
}
float boreHigh(float x) {
  float strait = smoothstep(950.0, 520.0, abs(x - 80.0));
  return uBoreHeight * (0.3 + 0.7 * strait) * (0.88 + 0.12 * sin(x * 0.021 + uTime * 0.7) + 0.08 * sin(x * 0.063 - uTime * 1.1));
}
// A point of the bore: x across the strait, s metres behind the front along the bed. Returns the world place, w = s in wall heights.
vec4 boreAt(float x, float s) {
  float H = boreHigh(x);
  float u = s / H;
  float rise = 1.0 - pow(1.0 - clamp(u / 0.75, 0.0, 1.0), 2.6);
  float back = 0.72 + 0.28 * exp(-max(u - 0.75, 0.0) / 1.5);
  float y = u < 0.0 ? 0.3 * (1.0 + s / 16.0) - 0.08 : 0.22 + (H - 0.22) * rise * back;
  float fwd = H * 0.2 * sin(clamp(u / 0.75, 0.0, 1.0) * 3.14159) * step(0.0, u);
  float lumpA = texture2D(tChop, vec2(x, s + uTime * 7.0) / 61.0).b - 0.5;
  float lumpB = texture2D(tChop, vec2(x + 3.0 * uTime, s - uTime * 4.0) / 17.0).b - 0.5;
  float amp = H * smoothstep(-0.02, 0.3, u) * (0.2 * exp(-max(u - 0.75, 0.0) / 2.5) + 0.03);
  y += amp * (1.3 * lumpA + 0.7 * lumpB);
  fwd += amp * 0.9 * lumpB;
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
  vec3 ax = boreAt(position.x + 0.8, position.y).xyz - at.xyz;
  vec3 as = boreAt(position.x, position.y + 0.5).xyz - at.xyz;
  vWorld = at.xyz;
  vNormalW = normalize(cross(ax, as));
  vRide = vec3(position.x, position.y, at.w);
  gl_Position = projectionMatrix * viewMatrix * vec4(at.xyz, 1.0);
}`;

export const BORE_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
uniform sampler2D tChop;
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vRide;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float u = vRide.z;
  // Marks ride with the wall and tumble down its face.
  vec2 q = vec2(vRide.x, vRide.y + uTime * 8.0 * smoothstep(2.5, 0.0, u));
  vec4 a = texture2D(tChop, q / 29.0);
  vec4 b = texture2D(tChop, vec2(q.y, -q.x) / 6.3);
  vec4 c = texture2D(tChop, q / 1.37);
  float lace = 0.4 * a.a + 0.35 * b.a + 0.25 * c.a;
  float face = smoothstep(1.7, 0.6, u);
  float amount = mix(0.2 + 0.6 * exp(-max(u - 1.0, 0.0) * 0.1), 1.05, face);
  float foam = smoothstep(1.0 - amount, 1.3 - amount, lace);
  vec2 sb = b.xy - 0.5;
  vec2 bump = (a.xy - 0.5) * 1.1 + vec2(-sb.y, sb.x) * 0.9 + (c.xy - 0.5) * 0.7;
  vec3 n = normalize(vNormalW + vec3(bump.x, 0.0, bump.y) * mix(0.35, 0.8, foam));
  float hollow = 0.45 + 0.55 * smoothstep(0.25, 0.7, 0.5 * a.b + 0.3 * b.b + 0.2 * c.b);
  vec3 water = vec3(0.075, 0.08, 0.068);
  vec3 white = mix(vec3(0.5, 0.5, 0.46), vec3(0.84, 0.85, 0.84), hollow);
  vec3 albedo = mix(water, white, foam);
  vec3 col = rigShade(vWorld, n, v, albedo, mix(0.3, 1.0, foam), mix(1.0, hollow, foam));
  gl_FragColor = vec4(rigOut(col), 1.0);
}`;

export const SPRAY_VERTEX = /* glsl */ `
${RIG_GLSL}
attribute vec4 aAt;
attribute vec4 aLook;
varying vec2 vUv;
varying vec4 vLook;
varying vec3 vLight;
void main() {
  vec4 centre = viewMatrix * vec4(aAt.xyz, 1.0);
  float turn = aLook.z;
  vec2 corner = position.xy * aAt.w;
  corner = vec2(corner.x * cos(turn) - corner.y * sin(turn), corner.x * sin(turn) + corner.y * cos(turn));
  centre.xy += corner * vec2(1.0, aLook.w);
  vUv = position.xy;
  vLook = aLook;
  vec4 land = landAt(aAt.xz);
  float open = mix(land.g, 1.0, clamp((aAt.y - land.r) / 120.0, 0.0, 1.0));
  vLight = (skyIrradiance(vec3(0.0, 1.0, 0.0)) * open + uSunColour * 0.55 * sunAt(aAt.xyz, land)) / 3.14159;
  gl_Position = projectionMatrix * centre;
}`;

export const SPRAY_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_UNIFORMS_GLSL}
uniform sampler2D tChop;
varying vec2 vUv;
varying vec4 vLook;
varying vec3 vLight;
void main() {
  float r2 = dot(vUv, vUv);
  vec4 t = texture2D(tChop, vUv * 0.21 + vLook.y);
  float body = (1.0 - smoothstep(0.15, 1.0, r2 + 0.7 * (t.b - 0.5)));
  float alpha = body * (0.35 + 0.65 * t.a) * vLook.x * (1.0 - uSolo);
  vec3 col = vec3(0.86, 0.87, 0.86) * vLight * (0.8 + 0.4 * t.b);
  gl_FragColor = vec4(col * alpha, alpha);
}`;
