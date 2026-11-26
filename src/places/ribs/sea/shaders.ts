// The water of the Ribs in the light of the rig: the open sea with its surf, the pools and runnels on the floor, the bore, and thrown spray.
import { NOISE_GLSL, RIG_GLSL, RIG_UNIFORMS_GLSL } from '../shared/glsl';
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
// White water of the wind sea: each of its waves breaks in patches along its crest and leaves a lace behind it that the wave runs out from under.
// x: the fresh break at the crest. y: the older foam trailing behind it.
vec2 whitecaps(vec2 p, float t, float px, sampler2D chop) {
  vec2 cap = vec2(0.0);
${SWELL.map(([dx, dz, length, amp], n) => {
  if (dz <= 0 || length < 20) return '';
  const k = (Math.PI * 2) / length;
  const w = Math.sqrt(9.81 * k);
  const group = (0.5 * w) / k;
  return `  {
    float ph = ${f(k)} * dot(p, vec2(${f(dx)}, ${f(dz)})) - ${f(w)} * t;
    // 0 on the crest, falling behind it; the wave runs toward +phase.
    float back = mod(ph + 0.6, 6.2832) - 0.6;
    back = back > 3.4 ? back - 6.2832 : back;
    vec2 ride = p - vec2(${f(dx)}, ${f(dz)}) * ${f(group)} * t;
    // A break is short along its crest: a few lengths of the wave's own height, never a bar from side to side.
    vec2 lay = vec2(dot(ride, vec2(${f(dx)}, ${f(dz)})) / ${f(length * 0.9)}, dot(ride, vec2(${f(-dz)}, ${f(dx)})) / ${f(length * 0.38)});
    float torn = textureLod(chop, lay + ${f(0.37 * n)}, log2(max(px * 256.0 / ${f(length * 0.38)}, 1e-6))).b;
    float keep = 1.0 - smoothstep(0.35, 1.0, ${f(k)} * px);
    // And not at every crest, nor evenly along one: whole stretches of the sea break and whole stretches do not.
    float where = textureLod(chop, lay.yx * 0.19 + ${f(0.61 * n + 0.2)}, log2(max(px * 256.0 / ${f(length * 2)}, 1e-6))).a;
    float on = smoothstep(${f(0.47 + 0.02 * n)}, ${f(0.62 + 0.02 * n)}, torn + 0.9 * (where - 0.55)) * keep;
    // Thickest in the middle of its length and thinning to nothing at its ends.
    cap.x = max(cap.x, on * smoothstep(-0.2 - 0.45 * on, -0.1, back) * (1.0 - smoothstep(0.05, 0.3, back)));
    cap.y = max(cap.y, on * smoothstep(-3.2, -0.6, back) * (1.0 - smoothstep(-0.2, 0.4, back)));
  }`;
}).join('\n')}
  return cap;
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
  float calm = smoothstep(0.2, 4.5, -bed);
  vec2 g;
  float h = swellAt(p, uTime, r * 0.02 + 0.1, 0.5, 1.3, g) * calm;
  // No crest ever stands over a low lens: close under it the water keeps a clear metre below.
  h = min(h, mix(uEye.y - 1.4, 1e3, smoothstep(12.0, 55.0, r)));
  vWorld = vec3(p.x, h, p.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

export const SEA_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
uniform sampler2D tChop;
uniform sampler2D tFeet;
uniform sampler2D tFoamPic;
uniform vec2 uWind;
uniform float uFeetReach;
varying vec3 vWorld;
${SWELL_GLSL}
// The level of a picture laid over the sea at so many metres a repeat, by the long side of the pixel's foot on the water (as the pool film reads).
vec2 footX;
vec2 footY;
float levelOf(sampler2D t, float metres) {
  float size = float(textureSize(t, 0).x) / metres;
  return log2(max(max(length(footX), length(footY)) * size, 1e-6));
}
void main() {
  vec2 p = vWorld.xz;
  footX = dFdx(p);
  footY = dFdy(p);
  vec3 toEye = cameraPosition - vWorld;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec4 land = landAt(p);
  float depth = -land.r;
  float px = length(fwidth(p));
  // Under the floor of the strait no lens ever sees the sea: nothing is worked out for it there.
  vec3 col = vec3(0.03, 0.034, 0.03);
  if (land.r < 0.6) {
  float feet = texture2D(tFeet, (p - uLandRect.xy) * uLandRect.zw).r * uFeetReach;
  // Water shoals toward the sand and toward the foot of a blade alike.
  float ragged = (textureLod(tChop, p / 173.0, levelOf(tChop, 173.0)).b - 0.5) * 5.0 + (textureLod(tChop, p.yx / 39.0, levelOf(tChop, 39.0)).b - 0.5) * 2.0;
  float shoal = min(depth + ragged * smoothstep(0.0, 3.0, depth), 0.2 + feet * 0.4);
  float calm = smoothstep(0.2, 4.5, depth);
  vec2 g;
  float h = swellAt(p, uTime, px, 0.9, 2.4, g) * calm;
  g *= calm;

  vec4 c1 = textureLod(tChop, p / 47.0 - uTime * uWind * 0.064, levelOf(tChop, 47.0));
  vec4 c2 = textureLod(tChop, vec2(p.y, -p.x) / 13.7 + uTime * vec2(uWind.y, -uWind.x) * 0.117, levelOf(tChop, 13.7));
  vec4 c3 = textureLod(tChop, (p + (c1.xy - 0.5) * 2.0) / 3.9 - uTime * uWind * 0.23, levelOf(tChop, 3.9));
  vec2 s2 = c2.xy - 0.5;
  float lively = 0.3 + 0.7 * smoothstep(0.0, 2.5, depth);
  // The smallest faces only where the lens can hold them.
  vec4 c4 = textureLod(tChop, (vec2(-p.y, p.x) + (c2.xy - 0.5) * 0.7) / 0.97 + uTime * uWind * 0.31, levelOf(tChop, 0.97));
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
  float nv = clamp(dot(n, v), 0.0, 1.0);
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
  // Slate grey-green, never teal: the water of a cold strait after a storm, full of sand where it shoals.
  vec3 deep = vec3(0.027, 0.043, 0.039);
  vec3 shallow = vec3(0.092, 0.098, 0.08);
  vec3 body = mix(shallow, deep, smoothstep(0.0, 5.0, depth));
  // Light comes through the thin top of a tall wave: only the highest water of the heaviest crests, green where the sun is on it.
  float thin = smoothstep(1.3, 3.3, h + 1.6 * (c1.b - 0.5)) * calm;
  body += vec3(0.022, 0.05, 0.036) * thin * (0.5 + 1.5 * sun);
  col = mix(body * e / 3.14159, refl, fres);

  // White water. The lace is the Builder's picture of broken water seen from above, laid in metres and carried a little by the wind.
  float lacePic = dot(textureLod(tFoamPic, p / 9.0 - uTime * uWind * 0.05, levelOf(tFoamPic, 9.0)).rgb, vec3(0.3333));
  float fine = textureLod(tChop, p.yx / 1.9 + uTime * 0.05, levelOf(tChop, 1.9)).a;
  float lace = 0.72 * lacePic + 0.28 * fine;
  // A patch of broken water is read by the short side of the pixel: by the long side, at a glance, every crest would be one band.
  vec2 caps = whitecaps(p, uTime, min(length(dFdx(p)), length(dFdy(p))), tChop) * calm;
  // Streaks down the wind: what the breakers leave is drawn out into long lines, in drifts, thick in one stretch of sea and absent in the next.
  vec2 across = vec2(-uWind.y, uWind.x);
  float streak = dot(textureLod(tFoamPic, vec2(dot(p, across) / 13.0, dot(p, uWind) / 110.0 - uTime * 0.03), levelOf(tFoamPic, 13.0)).rgb, vec3(0.3333));
  float drift = smoothstep(0.38, 0.7, textureLod(tChop, p / 290.0 + 0.11, levelOf(tChop, 290.0)).b);
  float lane = smoothstep(0.5, 0.78, streak) * (0.15 + 0.85 * drift) * calm * (1.0 - 0.6 * far);
  float ph = swellPhase(p, uTime) + 0.9 * shoal;
  float crest = pow(0.5 + 0.5 * cos(ph), 3.0);
  float wet = smoothstep(-0.25, 0.25, depth);
  float surfZone = smoothstep(5.5, 1.2, shoal) * wet;
  float wash = smoothstep(1.7, 0.15, shoal) * wet;
  float amount = max(0.7 * caps.y * (1.0 - smoothstep(0.05, 0.4, px)), 0.55 * lane);
  amount = max(amount, surfZone * (0.3 + 0.7 * crest) + wash * (0.55 + 0.4 * sin(ph - 1.2)));
  float foam = smoothstep(1.0 - amount, 1.3 - amount, lace) * smoothstep(0.0, 0.25, amount);
  // The break itself is thick white water, ragged at its rim.
  float fresh = smoothstep(0.42, 0.66, caps.x * (0.22 + 0.75 * lacePic + 0.5 * mix(fine, 0.5, smoothstep(0.02, 0.2, px))));
  foam = max(foam, fresh);
  // Fresh white water is thick and white; what trails is thin, and the green shows through it.
  vec3 foamCol = vec3(0.78, 0.82, 0.84) * (0.5 + 0.5 * mix(lace, 0.8, fresh)) * mix(0.8, 1.12, max(fresh, surfZone)) * e / 3.14159;
  col = mix(col, foamCol, clamp(foam, 0.0, 1.0));
  }
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
uniform float uFront;
uniform float uBoreHeight;
uniform int uRingCount;
uniform float uPoolLevel;
uniform vec2 uDrain;
uniform sampler2D tFeet;
uniform float uFeetReach;
uniform sampler2D tFoamPic;
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
// The level of a picture laid over the flat at so many metres a repeat, by the long side of the pixel's foot on the ground.
// Read so, a picture costs the software renderer a fraction of what a read by its own slopes costs, and it is the same level.
vec2 footX;
vec2 footY;
float levelOf(sampler2D t, float metres) {
  float size = float(textureSize(t, 0).x) / metres;
  return log2(max(max(length(footX), length(footY)) * size, 1e-6));
}
// Ripples seen at a glance keep their crests: read by the long side they went to glass a stone's throw out. Between the long side and the short.
float rippleLevel(sampler2D t, float metres) {
  float size = float(textureSize(t, 0).x) / metres;
  return 0.5 * log2(max(max(dot(footX, footX), dot(footY, footY)) * min(dot(footX, footX), dot(footY, footY)), 1e-12)) * 0.5 + log2(size) + 0.7;
}
// The rig's sky, cloud shadow and contact, word for word (shared/glsl.ts: skyCloud, cloudShade, contactDrawn), but each picture read at a
// stated level: over the rippled sheet a read by its own slopes is several times the cost for the same picture. Keep in step with the rig.
vec3 mirrorSky(vec3 d) {
  float az = atan(d.x, -d.z);
  float el = asin(clamp(d.y, 0.0, 1.0));
  vec2 uv = vec2(0.5 + (az - uSkyTurn.x) / 2.62, 1.0 - exp(-el / 0.3));
  // The cloud's slow working is left out: the ripples bend the picture far more than it does.
  vec3 c = textureLod(tSky, uv, 1.0).rgb * uSkyTurn.w;
  c *= 0.5 + 0.5 * smoothstep(0.08, 0.3, dot(c, vec3(0.333))) + 2.4 * smoothstep(0.3, 0.85, dot(c, vec3(0.333)));
  c = mix(c, uSkyZenith * 0.8, smoothstep(1.0, 1.35, el));
  float s = max(dot(d, uSkyBreak), 0.0);
  float s2 = s * s;
  float low = 0.7 * smoothstep(0.07, 0.0, d.y);
  return mix(c, uHaze * (1.0 + 0.5 * s2 * s2), low);
}
float sunOn(vec3 at, vec4 land) {
  vec2 q = at.xz - uSunDir.xz * (at.y / uSunDir.y);
  vec2 d = q - uCloudBreak.xy;
  vec2 e = q - uCloudBreak2.xy;
  float c = textureLod(tCloudShade, q * uCloudShade.z - uCloudShade.xy, 0.0).r * 0.62 + uCloudBreak.w * exp(-dot(d, d) * uCloudBreak.z) + uCloudBreak2.w * exp(-dot(e, e) * uCloudBreak2.z);
  return land.b * mix(uCloudShade.w, 1.0, smoothstep(0.42, 0.62, c));
}
float stoodOver(vec3 at) {
  vec2 uv = (at.xz - uContactRect.xy) * uContactRect.zw;
  vec2 e = min(uv, 1.0 - uv);
  return textureLod(tContact, uv, 0.0).r * smoothstep(0.0, 0.03, min(e.x, e.y));
}
void main() {
  vec2 p = vWorld.xz;
  footX = dFdx(p);
  footY = dFdy(p);
  vec3 toEye = cameraPosition - vWorld;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  // The land and its fine relief, read at a stated level (the same pictures the rig reads; a read by its own slopes costs several times this).
  vec4 land = textureLod(tLand, (p - uLandRect.xy) * uLandRect.zw, 0.0);
  float fineBed = 0.2 * (textureLod(tBedFine, p / 37.0, levelOf(tBedFine, 37.0)).r - 0.5) + 0.07 * (textureLod(tBedFine, p.yx / 9.7, levelOf(tBedFine, 9.7)).r - 0.5);
  vec4 barA = textureLod(tChop, p / 29.0, levelOf(tChop, 29.0));
  vec4 barB = textureLod(tChop, p / 7.3, levelOf(tChop, 7.3));
  // Two trains of ripples that cross, each bent by the slow water under it so that no crest runs straight or evenly spaced.
  vec2 bend = (barB.xy - 0.5) * 0.9 + (barA.xy - 0.5) * 2.2;
  // Before the bore the flat is sucked out toward it: what lies on the water is drawn to the wall, and the level falls a hand.
  float drawn = smoothstep(190.0, 80.0, p.y - uFront - 20.0 * sin(p.x * 0.0076 + 1.3));
  bend.y += 14.0 * drawn * drawn;
  vec4 c1 = textureLod(tChop, (p + bend) / 3.1 - uTime * uWind * 0.16, rippleLevel(tChop, 3.1));
  vec4 c2 = textureLod(tChop, (vec2(p.y, -p.x) + bend.yx * 0.4) / 0.83 + uTime * vec2(uWind.y, -uWind.x) * 0.3, rippleLevel(tChop, 0.83));
  // The true bed under this pixel: the sheet ends where the bed breaks the level, in braids.
  // Over the level of the pools it is a draining film that follows the bed and lies in its fine lows, thinner the higher the bed, and none over uDrain.y.
  float over = max(land.r - uPoolLevel, 0.0);
  float depth = uPoolLevel + uDrain.x * over - (land.r + fineBed) - 0.03 * smoothstep(0.0, 0.1, over) - 0.1 * smoothstep(0.5 * uDrain.y, uDrain.y, over);
  // The sheet is not one sheet: bars of bare wet sand break it wherever the bed comes within a hand of the level.
  // Round a wader's legs the water stays: its rings and its mirror need it.
  float waded = 1e3;
  vec2 ringSlope = vec2(0.0);
  for (int i = 0; i < ${rings}; i++) {
    if (i >= uRingCount) break;
    vec2 d = p - uRings[i].xy;
    float l = length(d) + 1e-3;
    waded = min(waded, l);
    // No ruled circles: each ring is pushed about by the ripples it crosses, and they go out in packets, a few crests and then slack water.
    float lr = l + 0.5 * (barB.b - 0.5) + 0.22 * (c1.b - 0.5);
    float packet = 0.5 + 0.5 * sin(lr * 2.3 - uTime * 2.1 + uRings[i].z * 1.7);
    float wave = sin(lr * 17.0 - uTime * 10.0 + uRings[i].z) * exp(-l * 1.9) * packet * uRings[i].w;
    ringSlope += (d / l) * wave * 0.13;
  }
  depth -= 0.16 * smoothstep(0.36, 0.62, barA.b + 0.5 * (barB.b - 0.5)) * (1.0 - smoothstep(0.0, 0.05, over)) * smoothstep(0.9, 2.4, waded);
  // No discard here: a picture read after a discard has no slope to pick its level by where a neighbour is gone, and the edge of every bar came out different on every render. The sheet is cut at the end.
  // The sheet is never still: thin water comes on and drains back round every stone and bar, a hand's breadth, each stretch in its own time.
  float tide = barA.g;
  depth += 0.004 * sin(uTime * 0.9 + tide * 19.0) + 0.004 * sin(uTime * 2.3 + p.x * 0.9 + p.y * 0.7 + tide * 7.0);
  depth -= 0.07 * drawn;
  // What the water has just left is wet and dark: a band on every stone and bar above the line.
  bool dry = depth < -0.09;
  float wetBand = 0.42 * smoothstep(-0.09, -0.004, depth);
  float edge = smoothstep(0.0, 0.012, depth);
  // No branch round the work: a picture read inside one has no slope at its border, and the waterlines came out different on every page load.
  vec3 col = vec3(0.0);
  float alpha = 0.0;
  vec2 s2 = c2.xy - 0.5;
  // The wind works the sheet in cats' paws: ruffled dark stretches and slack bright ones, a few metres each, that drift.
  float paw = smoothstep(0.3, 0.7, 0.6 * barA.a + 0.4 * barB.a + 0.25 * sin(uTime * 0.35 + barA.r * 12.0));
  float gust = 0.35 + 0.65 * paw;
  float ruffle = 0.2 + 0.8 * paw;
  vec2 slope = ((c1.xy - 0.5) * 0.3 + vec2(-s2.y, s2.x) * 0.26) * ruffle * smoothstep(0.0, 0.07, depth);
  slope += ringSlope;
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float fres = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y) + 0.01;
  r = normalize(r);
  float open = land.g * (1.0 - stoodOver(vWorld));
  float sun = sunOn(vWorld, land);
  // The water of the flat is full of sand: what it mirrors it mirrors warm and a little dulled.
  vec3 refl = mirrorSky(r) * mix(1.0, open, 0.5) * vec3(0.86, 0.79, 0.72);
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
    // Its dark face stands in the mirror between the white of its foot and of its lip.
    refl = mix(refl, mix(vec3(0.2, 0.25, 0.24), vec3(0.9), white) * lit, 0.8 * wall * mix(1.0, 0.55, smoothstep(1.0, 1.15, k)));
  }
  // Sparkle: here and there a ripple's flank finds the break in the cloud and throws it at the lens, a point at a time.
  refl += uSunColour * 0.22 * smoothstep(0.8, 0.95, c2.a) * smoothstep(0.5, 0.75, c1.a) * ruffle * sun * smoothstep(0.02, 0.08, depth);
  vec3 hv = normalize(v + uSunDir);
  // The glare path toward the sun: a hard core, and the broken glitter of the ripples round it.
  refl += uSunColour * (pow(max(dot(n, hv), 0.0), 500.0) * 4.0 + pow(max(dot(n, hv), 0.0), 90.0) * 0.9 * (0.4 + 1.2 * c2.a)) * sun;
  vec3 e = skyIrradiance(vec3(0.0, 1.0, 0.0)) * open + uSunColour * (uSunDir.y * sun);
  float murk = 1.0 - exp(-max(depth, 0.0) * 1.3);
  vec3 body = vec3(0.125, 0.11, 0.085) * e / 3.14159;
  // The meniscus: where the water climbs a stone it turns up to the sky, a bright thread along the line.
  float lip = smoothstep(0.001, 0.006, depth) * (1.0 - smoothstep(0.006, 0.028, depth));
  fres = mix(fres, 0.8, 0.18 * lip);
  col = fres * refl + (1.0 - fres) * murk * body;
  alpha = fres + (1.0 - fres) * murk;
  // Foam: lace left along the line where the water works against stone and sand, and in lanes the wind draws out over the open sheet.
  vec2 drift = uTime * uWind * 0.05;
  float lace = dot(textureLod(tFoamPic, p / 6.0 - drift, levelOf(tFoamPic, 6.0)).rgb, vec3(0.3333));
  float stretch = smoothstep(0.35, 0.65, barA.r);
  float lanes = smoothstep(0.62, 0.85, 0.5 * barB.g + 0.5 * barA.g) * smoothstep(0.03, 0.12, depth);
  float foamed = smoothstep(0.38, 0.7, lace) * clamp((1.0 - smoothstep(0.0, 0.07, depth)) * stretch + 0.45 * lanes * gust, 0.0, 1.0) * edge;
  col = mix(col, vec3(0.8, 0.82, 0.8) * e / 3.14159, foamed);
  alpha = mix(alpha, 1.0, foamed);
  // A bar the water has just left is wet: dark from above, and at a glance it holds the sky as the water beside it does. No hole in the mirror.
  float band = wetBand / 0.42;
  col = mix(0.85 * fres * refl * band, col, edge);
  alpha = mix(band * max(0.42, 0.85 * fres), alpha, edge);
  gl_FragColor = vec4(rigOut(col), alpha) * (1.0 - uSolo);
  if (dry) discard;
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
${NOISE_GLSL}
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
  float lifted = smoothstep(0.4 + tear, 0.54 + tear, u) * smoothstep(0.8 + 0.5 * tear, 0.68 + 0.5 * tear, u);
  // Not a band from side to side: windows, each some tens of metres long, in a wall that is otherwise broken white.
  float pane = 0.65 * vnoise(vec2(vRide.x / 34.0 + 7.0, uTime * 0.07)) + 0.35 * vnoise(vec2(vRide.x / 11.0, u * 5.0 + uTime * 0.3));
  lifted *= smoothstep(0.34, 0.56, pane + 0.22 * (f1.r - 0.45) + 0.12 * (strings - 0.45));
  float amount = mix(0.5 + 0.4 * exp(-max(u - 1.0, 0.0) * 0.1), 1.08 - 0.8 * lifted, face);
  // Ahead of the wall foam runs out over the wet flat in tongues, thinning to lace.
  float ahead = clamp(-vRide.y / 48.0, 0.0, 1.0);
  float tongue = texture2D(tFoam, vec2(vRide.x, uTime * 2.0) / 61.0).r + 0.5 * texture2D(tFoam, vec2(vRide.x, vRide.y * 0.5 + uTime * 5.0) / 23.0).r;
  amount = mix(amount, 1.25 - 2.3 * ahead / (0.25 + tongue), step(u, 0.0));
  float foam = smoothstep(1.0 - amount, mix(1.2, 1.5, face) - amount, mix(lace, 0.16 + 0.34 * strings + 0.3 * f1.r + 0.24 * fine, face * smoothstep(0.0, 0.5, lifted)));
  // Cut at the end, not here (see the pools).
  bool bare = u < 0.0 && foam < 0.35;
  vec2 bump = vec2(f2.g - f1.a, f2.a - f1.g) * 0.5 + (a.xy - 0.5) * (1.0 - face);
  // White water is not a skin: its light comes from all through it, so the folds of the sheet under it count for less.
  vec3 n = normalize(mix(vNormalW, vec3(0.0, 0.62, 0.78), mix(0.6, 0.95, smoothstep(0.55, 0.7, u)) * foam * face) + vec3(bump.x, 0.0, bump.y) * mix(0.35, 0.3, foam));
  if (dot(n, v) < 0.0) n = reflect(n, v);
  // The creases between the heads hold no light.
  float crease = smoothstep(0.02, 0.4, ch.x) * (0.5 + 0.5 * smoothstep(0.02, 0.35, ch.y));
  float pit = (0.55 + 0.45 * smoothstep(0.3, 0.62, f1.r)) * (0.7 + 0.3 * smoothstep(0.3, 0.6, f2.r)) * (0.75 + 0.25 * smoothstep(0.03, 0.3, f2.g));
  float hollow = mix(1.0, (0.5 + 0.5 * crease) * pit, face);
  // The lifted water is thick with sand: slate green, brown where it is thin at the lip.
  vec3 water = mix(vec3(0.04, 0.055, 0.046), vec3(0.11, 0.095, 0.06), smoothstep(0.55, 0.85, u) * face);
  // White water is lit all through: it holds more light than a painted wall.
  vec3 white = vec3(0.95, 0.96, 0.96);
  // Not one sheet of white: thick heads and thin runs between them, streaming down the face, grey where the dark water shows through.
  float thick = smoothstep(0.15, 0.7, 0.14 * strings + 0.5 * f1.r + 0.36 * fine);
  white *= mix(1.0, 0.42 + 0.58 * thick, face);
  vec3 albedo = mix(water, white, foam);
  vec3 col = rigShade(vWorld, n, v, albedo, mix(0.45, 1.0, foam), mix(1.0, hollow, foam));
  // Lit from behind: where the lifted water thins toward the lip the light comes through it green, and the crest's white burns.
  float behind = 0.35 + 0.65 * pow(max(dot(-v, uSunDir), 0.0), 2.0);
  float thin = smoothstep(0.5, 0.85, u) * face;
  col += (1.0 - foam) * vec3(0.05, 0.065, 0.04) * thin * behind * (uSunColour * 0.25 + skyIrradiance(vec3(0.0, 1.0, 0.0)) * 0.25);
  col += foam * hollow * white * uSunColour * 0.2 * behind * smoothstep(0.3, 0.6, u);
  col += foam * hollow * white * skyIrradiance(vec3(0.0, 1.0, 0.0)) * 0.2;
  gl_FragColor = vec4(rigOut(col), 1.0);
  if (bare) discard;
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
  vLight += uSunColour * through * mix(0.07, 0.012, vMist) * mix(0.35, 1.0, open);
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
  // Thrown water is ragged: the picture is laid finer over a head of spray than over a bank of mist.
  vec4 t = texture2D(tFoam, vUv * mix(0.4, 0.19, vMist) + vLook.y * vec2(3.1, 7.3));
  // A head of thrown water: eaten at the rim into lumps and strings, thick in the middle.
  float eat = r2 + mix(1.5, 0.22, vMist) * (t.r - 0.5) + mix(0.6, 0.0, vMist) * (0.5 - t.g);
  float body = 1.0 - smoothstep(mix(0.22, -0.1, vMist), mix(0.72, 0.95, vMist), eat);
  float alpha = clamp(body * (0.55 + 0.45 * t.a) * vLook.x, 0.0, 1.0) * (1.0 - uSolo);
  vec3 col = vec3(0.95, 0.96, 0.96) * vLight * (0.9 + 0.6 * t.g) * mix(0.62 + 0.3 * body + 0.42 * vUv.y + 0.25 * (t.r - 0.5), 0.6, vMist);
  gl_FragColor = vec4(col * alpha, alpha);
}`;
