// The water in the light of the rig: what the sky puts on it, what shows through it, and the low sun's glitter.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform sampler2D tBedFar;
uniform vec4 uBedFar;
uniform sampler2D tWave;
uniform sampler2D tRipple;
uniform float uSea;
uniform sampler2D tMirror;
uniform sampler2D tRings;
uniform vec2 uFrame;
${NOISE_GLSL}
${RIG_GLSL}
// The sun's path on the water: its disc is behind fog, so the path is broad and soft, with sparks where a wave face turns it to the lens.
vec3 sunGlitter(vec3 r, float far) {
  float rs = max(dot(r, uSunDir), 0.0);
  float rs2 = rs * rs;
  float rs8 = rs2 * rs2 * rs2 * rs2;
  float rs64 = rs8 * rs8 * rs8 * rs8 * rs8 * rs8 * rs8 * rs8;
  float broad = rs64 * 0.2 + rs8 * rs8 * 0.012;
  float spark = rs64 * rs64 * rs64 * rs64 * 40.0 * smoothstep(160.0, 10.0, far);
  return uSunColour * (broad + spark);
}
void main() {
  vec2 xz = vWorld.xz;
  // On the shelf the depth is the rig's own land, known to the millimetre; beyond it, the coarse map of the sea bed.
  vec2 un = (xz - uLandRect.xy) * uLandRect.zw;
  vec2 edge = min(un, 1.0 - un);
  float inNear = smoothstep(0.0, 0.02, min(edge.x, edge.y));
  vec4 land = texture2D(tLand, un);
  float depth = uSea - land.r;
  if (inNear < 1.0) {
    vec4 bedF = texture2D(tBedFar, (xz - uBedFar.xy) * uBedFar.z);
    depth = mix(bedF.g > 0.5 ? 9.0 : bedF.r * 2.5 - 0.5, depth, inNear);
  }
  // The wall of the shaft falls through the level of the sea: no water hangs on it.
  float steep = length(vec2(dFdx(depth), dFdy(depth))) / max(length(vec2(length(dFdx(xz)), length(dFdy(xz)))), 1e-5);
  if (depth > 1.6 || steep > 2.0) discard;
  // A film a finger deep on a level plate is wet rock, not a pool: the water begins where it has some depth, along a ragged line.
  float ragged = vnoise(xz * 1.7) * 0.05 + vnoise(xz * 9.0) * 0.015;
  float cover = smoothstep(0.03, 0.1, depth - ragged);
  if (cover <= 0.0) discard;

  vec3 toEye = cameraPosition - vWorld;
  float far = length(toEye);
  vec3 v = toEye / far;

  // Two sheets of small waves crossing, carried down the channel; a third, slow and large, so the far water is not one tone.
  vec2 drift = vec2(0.25, 0.97);
  vec2 g1 = texture2D(tWave, xz * 0.21 + drift * uTime * 0.085).rg - 0.5;
  vec2 g2 = texture2D(tWave, vec2(xz.y, -xz.x) * 0.067 + vec2(0.31, -0.17) * uTime * 0.05).rg - 0.5;
  vec3 g3 = texture2D(tWave, xz * 0.0113 + drift * uTime * 0.006).rgb - 0.5;
  // Shallow water over a bed is nearly still: the waves grow with the depth.
  float deep = smoothstep(0.0, 0.5, depth);
  vec2 slope = (g1 * 0.3 + g2 * 0.26) * (0.4 + 0.6 * deep) + g3.rg * 0.1;
  // Near the lens the small ripples show one by one.
  float close = smoothstep(120.0, 8.0, far);
  // The wind does not lie evenly on it: it is ruffled in patches that drift, and between them it is nearly glass.
  float gust = smoothstep(0.3, 0.72, 0.65 * vnoise(xz * 0.13 + vec2(uTime * 0.035, uTime * 0.011)) + 0.35 * vnoise(xz * 0.61 - vec2(uTime * 0.05, 0.0)));
  if (close > 0.0) {
    // Two sheets of them of unlike size and bearing, so no square of either shows.
    vec2 ra = texture2D(tRipple, vec2(xz.x * 0.829 - xz.y * 0.559, xz.x * 0.559 + xz.y * 0.829) * 0.37 + drift.yx * uTime * 0.07).rg - 0.5;
    vec2 rb = texture2D(tRipple, vec2(xz.x * 0.391 + xz.y * 0.92, -xz.x * 0.92 + xz.y * 0.391) * 0.113 + drift * uTime * 0.031).rg - 0.5;
    slope = slope * (1.0 - 0.6 * close) + (ra * 0.55 + rb * 1.15) * close * (0.45 + 0.55 * deep) * (0.22 + 1.0 * gust);
  }
  // The rings round what stands in the water, as the waders folder drew them for this camera.
  vec4 rings = texture2D(tRings, gl_FragCoord.xy / uFrame);
  slope += rings.rg * 3.2;
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));

  float nv = clamp(dot(n, v), 0.0, 1.0);
  // Water with small waves on it never mirrors whole, however low the eye: seen far off it shows the tilted faces, and they show more of the water's own colour.
  float fresnel = min(0.02 + 0.98 * pow(1.0 - nv, 5.0), mix(0.62, 0.26, smoothstep(10.0, 90.0, far)));
  vec3 r = reflect(-v, n);
  r.y = abs(r.y) + 0.02 + 0.3 * smoothstep(8.0, 100.0, far);
  r = normalize(r);
  // Under a haze the water gives back less than the sky it faces: every small wave face shows some of the dark bed.
  vec3 mirror = 0.6 * skyRadiance(r) * skyOpen(vWorld);
  // A face tipped toward the lens shows the dim sky overhead, one tipped away the bright fog at the horizon: that is what draws every ripple and ring.
  float tip = dot(slope - g3.rg * 0.1, normalize(v.xz));
  float drawn = 1.0 - 0.85 * tanh(3.0 * tip);
  mirror *= drawn;
  // The warm of the low sky is the fog's; the water gives it back greyer and a little green, as wet stone and shallow water do.
  mirror = mix(mirror, dot(mirror, vec3(0.3, 0.55, 0.15)) * vec3(1.05, 1.0, 0.88), 0.45 * smoothstep(0.04, 0.3, v.y)) * mix(0.72, 1.3, smoothstep(0.06, 0.3, v.y));
  // Where the mirrored ray meets the land the water shows the land: dark rock, paler with the fog between.
  vec2 way = r.xz / max(length(r.xz), 1e-4);
  float rise = r.y / max(length(r.xz), 1e-4);
  float hit = 0.0;
  float reach = 6.0;
  for (int i = 0; i < 4; i++) {
    vec2 at2 = (xz + way * reach - uLandRect.xy) * uLandRect.zw;
    float over = texture2D(tLand, at2).r - (uSea + rise * reach);
    hit = max(hit, smoothstep(0.0, 0.5 + 0.03 * reach, over) * exp(-reach / 260.0));
    reach *= 2.9;
  }
  mirror = mix(mirror, vec3(0.05, 0.045, 0.04) * skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159, hit * 0.85);
  float sunHere = sunAt(vWorld + vec3(0.0, 0.3, 0.0));
  mirror += sunGlitter(r, far) * sunHere;
  // Sparks: here and there a facet smaller than a ripple turns the sun to the lens for a moment, far outside its path. Each is a point that lives a tenth of a second.
  float px = far * 2.0 / (uFrame.y * 1.6);
  float lobe = pow(max(dot(r, uSunDir), 0.0), 9.0) * (0.3 + 0.7 * gust) * (0.4 + 2.2 * rings.b);
  float sparks = 0.0;
  float seen = smoothstep(0.012, 0.004, px);
  if (seen > 0.0 && lobe > 0.002) {
    for (int o = 0; o < 2; o++) {
      float tick = uTime * 9.0 + float(o) * 0.5;
      float slot = floor(tick);
      float life = 1.0 - abs(fract(tick) * 2.0 - 1.0);
      vec2 cellAt = xz / 0.022 + float(o) * 17.3;
      vec2 id = floor(cellAt);
      vec2 rnd = hash22(id + slot * 7.13);
      float on = step(1.0 - 0.16 * lobe, hash12(id * 1.37 + slot * 3.1));
      float dot_ = smoothstep(0.34, 0.1, length(fract(cellAt) - 0.5 - 0.3 * (rnd - 0.5)));
      sparks += on * dot_ * life;
    }
  }
  mirror += uSunColour * sunHere * (sparks * seen * 0.9 + (1.0 - seen) * lobe * 0.012);
  // What stands in the water is mirrored in it, broken by the waves: the image is read a little aside, more along the line of sight than across it.
  vec2 at = gl_FragCoord.xy / uFrame + vec2(slope.x * 0.07 + (g1.x + g2.y) * 0.012, (slope.y + g1.y * 0.5) * 0.2) * smoothstep(0.0, 6.0, far) * min(1.0, 14.0 / far);
  vec4 image = texture2D(tMirror, at);
  // The image is of things in the shade of their own bodies, seen from below: darker than what stands over it.
  mirror = mirror * (1.0 - 0.8 * image.a) + 0.2 * image.rgb;

  // What is in the water: fine silt lit by the sky. The bed shows through it where it is thin.
  float path = depth / max(nv, 0.25);
  vec3 through = exp(-path * vec3(4.2, 1.9, 2.2));
  float clear = dot(through, vec3(0.3, 0.5, 0.2));
  vec3 body = mix(vec3(0.21, 0.18, 0.145), vec3(0.21, 0.225, 0.18), smoothstep(0.28, 0.6, v.y)) * (0.3 + 5.7 * v.y * v.y) * (0.82 + 0.18 * drawn) * skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159 * skyOpen(vWorld);
  // The line of weed and damp at the water's edge.
  float rim = smoothstep(0.16, 0.06, depth);

  vec3 colour = fresnel * mirror + (1.0 - fresnel) * (1.0 - clear) * body;
  float alpha = 1.0 - (1.0 - fresnel) * clear * (1.0 - 0.5 * rim);
  // What the water leaves at its edge: a broken line of scum and small bubbles, pale, that rides the ragged line of the bank.
  float line = depth - ragged;
  float scum = smoothstep(0.045, 0.07, line) * smoothstep(0.15, 0.085, line) * smoothstep(0.42, 0.62, vnoise(xz * 3.1 + 0.2 * uTime * drift) + 0.25 * vnoise(xz * 17.0)) * smoothstep(60.0, 20.0, far);
  float bubbles = 0.55 + 0.45 * smoothstep(0.35, 0.7, vnoise(xz * 70.0));
  vec3 froth = vec3(0.62, 0.58, 0.5) * bubbles * skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159 * (0.6 + 0.8 * sunHere);
  colour = mix(colour, froth, 0.7 * scum);
  alpha = mix(alpha, 1.0, 0.7 * scum);
  alpha *= cover;
  colour *= cover;
  float keep = 1.0 - uSolo;
  gl_FragColor = vec4(rigOut(colour), alpha * keep);
}`;
