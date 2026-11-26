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
// The sun's path on the water: its disc is behind fog, so the path is a broad soft warmth. The light of it is in the glints, drawn one by one below.
vec3 sunGlitter(vec3 r) {
  float rs = max(dot(r, uSunDir), 0.0);
  float rs2 = rs * rs;
  float rs8 = rs2 * rs2 * rs2 * rs2;
  float rs64 = rs8 * rs8 * rs8 * rs8 * rs8 * rs8 * rs8 * rs8;
  float broad = rs64 * rs64 * 0.004 + rs64 * 0.0016 + rs8 * rs8 * 0.0003;
  // Through that much fog the sun is gold, and so is its path.
  return uSunColour * vec3(1.0, 0.74, 0.46) * broad;
}
// The water at a pixel that has water: everything after the test of the depth, kept apart so that a pixel of dry land costs only that test.
vec4 water(vec2 xz, float depth, vec4 land) {
  // The water begins along a ragged line. A film a finger deep over a plate is still water to a low eye: it mirrors the sky whole, and
  // a lens that travels over a shoal must not see the sheet come and go.
  float ragged = depth < 0.2 ? vnoise(xz * 1.7) * 0.05 + vnoise(xz * 9.0) * 0.015 : 0.0;
  float cover = smoothstep(0.0, 0.035, depth - 0.6 * ragged);
  if (cover <= 0.0) return vec4(-1.0);

  vec3 toEye = cameraPosition - vWorld;
  float far = length(toEye);
  vec3 v = toEye / far;
  // The rig's light at the water, from the land it has already read here (skyOpen and sunAt of the rig, without reading the land again).
  float above = uSea - land.r;
  float open = mix(land.g, 1.0, clamp(above / 30.0, 0.0, 1.0)) * (1.0 - contactDrawn(vWorld) * smoothstep(4.0, 0.0, above));
  float sunHere = sunSeen(land, uSea + 0.3) * sunCloud(xz);

  // Two sheets of small waves crossing, carried down the channel; a third, slow and large, so the far water is not one tone.
  vec2 drift = vec2(0.25, 0.97);
  vec2 g1 = texture2D(tWave, xz * 0.21 + drift * uTime * 0.17).rg - 0.5;
  vec2 g2 = texture2D(tWave, vec2(xz.y, -xz.x) * 0.067 + vec2(0.31, -0.17) * uTime * 0.05).rg - 0.5;
  vec3 g3 = texture2D(tWave, xz * 0.0113 + drift * uTime * 0.006).rgb - 0.5;
  // Shallow water over a bed is nearly still: the waves grow with the depth.
  float deep = smoothstep(0.0, 0.22, depth);
  vec2 slope = (g1 * 0.3 + g2 * 0.26) * (0.4 + 0.6 * deep) + g3.rg * 0.1;
  // Near the lens the small ripples show one by one.
  float close = smoothstep(120.0, 8.0, far);
  // The wind does not lie evenly on it: it is ruffled in patches that drift, and between them it is nearly glass.
  // A cat's paw crosses the water at the pace of the wind, some metres in a second: the held frame is never still.
  float airs = 0.58 * vnoise(xz * 0.13 + vec2(uTime * 0.5, uTime * 0.24)) + 0.42 * clamp(0.5 + 1.6 * g2.y, 0.0, 1.0);
  float gust = smoothstep(0.45, 0.8, airs);
  float ruffle = smoothstep(0.25, 0.75, airs);
  if (far < 70.0) {
    // Two sheets of them of unlike size and bearing, so no square of either shows.
    vec2 ra = far < 42.0 ? texture2D(tRipple, vec2(xz.x * 0.829 - xz.y * 0.559, xz.x * 0.559 + xz.y * 0.829) * 0.37 + drift.yx * uTime * 0.11).rg - 0.5 : vec2(0.0);
    vec2 rb = texture2D(tRipple, vec2(xz.x * 0.391 + xz.y * 0.92, -xz.x * 0.92 + xz.y * 0.391) * 0.113 + drift * uTime * 0.05).rg - 0.5;
    // Under the lens the short ones lead; farther off they are too small to see and the longer ones carry the picture.
    float off = smoothstep(5.0, 28.0, far);
    slope = slope * (1.0 - 0.7 * smoothstep(24.0, 6.0, far)) + smoothstep(70.0, 26.0, far) * (ra * mix(1.9, 1.0, off) * smoothstep(42.0, 30.0, far) + rb * mix(2.1, 2.8 + 0.6 * smoothstep(30.0, 42.0, far), off)) * close * (0.45 + 0.55 * deep) * (0.7 + 0.5 * gust) * (0.3 + 1.2 * smoothstep(0.38, 0.62, g3.b + 0.5 + 0.35 * g2.x));
  }
  // A hand's depth of water over a plate cannot carry a wave: it lies nearly flat, and shows the sky whole.
  slope *= 0.6 + 0.4 * smoothstep(0.02, 0.1, depth);
  // The rings round what stands in the water, as the waders folder drew them for this camera.
  vec4 rings = texture2D(tRings, gl_FragCoord.xy / uFrame);
  slope += rings.rg * 4.2;
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));

  float nv = clamp(dot(n, v), 0.0, 1.0);
  // Water with small waves on it never mirrors whole, however low the eye: seen far off it shows the tilted faces, and they show more of the water's own colour.
  // The mirror is that of the sheet as a whole more than of each face: a face tipped to the lens is dark with the sky overhead, not a window on the bed.
  float nvFlat = clamp(dot(normalize(vec3(-slope.x * 0.35, 1.0, -slope.y * 0.35)), v), 0.0, 1.0);
  float fresnel = min(0.02 + 0.98 * pow(1.0 - nvFlat, 5.0), mix(0.82, 0.56, smoothstep(10.0, 90.0, far)));
  vec3 r = reflect(-v, n);
  r.y = abs(r.y) + 0.02 + 0.3 * smoothstep(8.0, 100.0, far);
  r = normalize(r);
  // Under a haze the water gives back less than the sky it faces: every small wave face shows some of the dark bed.
  vec3 mirror = 1.35 * skyRadiance(r) * open;
  // A face tipped toward the lens shows the dim sky overhead, one tipped away the bright fog at the horizon: that is what draws every ripple and ring.
  float tip = dot(slope - g3.rg * 0.1, normalize(v.xz));
  float drawn = 1.0 - 0.8 * tanh(3.4 * tip);
  mirror *= drawn;
  // Toward the sun the fog is a glare the water gives back broken: the troughs there stay dark.
  vec3 rFlat = reflect(-v, vec3(0.0, 1.0, 0.0));
  float sunFlat = max(dot(normalize(vec3(rFlat.x, abs(rFlat.y) + 0.02, rFlat.z)), uSunDir), 0.0);
  mirror *= 1.0 - 0.7 * pow(sunFlat, 8.0);
  // And the faces that turn the sun itself to the lens are the glints of its path: each a hard point or a short bright line on one wavelet.
  float hard = pow(max(dot(r, uSunDir), 0.0), 700.0) * 2.4 * smoothstep(160.0, 10.0, far);
  // The warm of the low sky is the fog's; the water gives it back greyer and a little green, as wet stone and shallow water do.
  mirror = mix(mirror, dot(mirror, vec3(0.3, 0.55, 0.15)) * vec3(0.98, 1.0, 0.9), 0.1 + 0.3 * smoothstep(0.04, 0.22, v.y)) * mix(0.96, 0.8, smoothstep(0.06, 0.3, v.y)) * vec3(1.12, 0.94, 0.76);
  vec3 skyUp = skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159;
  // Where the mirrored ray meets the land the water shows the land: dark rock, paler with the fog between.
  vec2 way = r.xz / max(length(r.xz), 1e-4);
  float rise = r.y / max(length(r.xz), 1e-4);
  float hit = 0.0;
  float reach = 2.4;
  for (int i = 0; i < 2; i++) {
    vec2 at2 = (xz + way * reach - uLandRect.xy) * uLandRect.zw;
    float over = texture2D(tLand, at2).r - (uSea + rise * reach);
    hit = max(hit, smoothstep(0.0, 0.5 + 0.03 * reach, over) * exp(-reach / 45.0));
    reach *= 7.0;
  }
  // The bank is wet rock in its own shade, with the fog between: brown-grey, not black.
  mirror = mix(mirror, vec3(0.16, 0.14, 0.12) * skyUp, hit * 0.65);
  mirror += (sunGlitter(r) + uSunColour * vec3(1.0, 0.78, 0.5) * hard) * sunHere;
  // Sparks: here and there a facet smaller than a ripple turns the sun to the lens for a moment, far outside its path. Each is a point that lives a tenth of a second.
  float px = far * 2.0 / (uFrame.y * 1.6);
  float rsun = max(dot(normalize(vec3(r.x, abs(rFlat.y), r.z)), uSunDir), 0.0);
  // The faces tipped away from the lens are the ones that find the sun: the glints ride the crests of the wavelets.
  float crest = smoothstep(0.05, 0.4, -tip);
  // The sun is a broad glare in the fog: its glints reach far to either side of its path, fewer the farther.
  float sunPath = pow(rsun, 48.0);
  float lobe = (0.7 + 0.3 * pow(rsun, 3.0) + 1.0 * sunPath) * (0.2 + 1.6 * crest) * (0.7 + 0.3 * gust) * (0.5 + 2.2 * rings.b);
  float sparks = 0.0;
  // A glint is a facet a few pixels wide wherever it is: near the lens a finger of water, far off a hand, then a wavelet. Two sizes
  // of them are laid at once and the nearer size gives way to the farther with the distance.
  float level = max(log2(px / 0.0035), 0.0);
  float whole = floor(level);
  float seen = smoothstep(7.5, 5.5, level);
  if (seen > 0.0 && sunHere > 0.01) {
    for (int o = 0; o < 2; o++) {
      float size = 0.022 * exp2(whole + float(o));
      float share = o == 0 ? 1.0 - smoothstep(0.3, 0.7, level - whole) : smoothstep(0.3, 0.7, level - whole);
      if (share <= 0.0) continue;
      float tick = uTime * 5.0 + float(o) * 0.5;
      float slot = floor(tick);
      float life = 1.0 - abs(fract(tick) * 2.0 - 1.0);
      vec2 cellAt = xz / size + float(o) * 17.3 + whole * 5.1;
      vec2 id = floor(cellAt);
      vec2 rnd = hash22(id + slot * 7.13);
      float on = step(1.0 - min(0.34 * lobe, 0.5), fract(rnd.x * 7.77 + rnd.y * 3.31));
      float dot_ = smoothstep(0.34, 0.1, length(fract(cellAt) - 0.5 - 0.3 * (rnd - 0.5)));
      sparks += on * dot_ * life * share;
    }
  }
  mirror += uSunColour * vec3(1.0, 0.88, 0.7) * sunHere * (sparks * seen * (2.2 + 1.0 * sunPath) + (1.0 - seen) * lobe * 0.003 + 0.02 * crest * crest * pow(rsun, 4.0) * smoothstep(60.0, 20.0, far));
  // What stands in the water is mirrored in it, broken by the waves: the image is read a little aside, more along the line of sight than across it.
  vec2 at = gl_FragCoord.xy / uFrame + vec2(slope.x * 0.03 + (g1.x + g2.y) * 0.01, (slope.y + g1.y * 0.5) * 0.07) * smoothstep(0.0, 6.0, far) * min(1.0, 14.0 / far);
  vec4 image = texture2D(tMirror, at);
  // The image is of things in the shade of their own bodies, seen from below: darker than what stands over it.
  mirror = mirror * (1.0 - 0.85 * image.a) + 0.4 * image.rgb;

  // What is in the water: fine silt lit by the sky. The bed shows through it where it is thin.
  float path = depth / max(nv, 0.1);
  vec3 through = exp(-path * vec3(2.6, 1.9, 2.2));
  float clear = dot(through, vec3(0.3, 0.5, 0.2));
  // Warm grey silt in the shallows; where the channel has depth the silt has settled and it is green going to blue.
  vec3 body = mix(vec3(0.52, 0.42, 0.31), vec3(0.25, 0.36, 0.31), smoothstep(0.25, 1.1, depth)) * (0.6 + 6.0 * v.y * v.y) * (0.7 + 0.3 * drawn) * skyUp * open;
  // The line of weed and damp at the water's edge.
  float rim = smoothstep(0.16, 0.06, depth);

  vec3 colour = fresnel * mirror + (1.0 - fresnel) * (1.0 - clear) * body;
  // Ruffled water turns many small faces up to the dimmer sky overhead and hides the bed: the patch under a gust is darker than the glass beside it.
  colour *= 1.0 - 0.16 * ruffle;
  float alpha = 1.0 - (1.0 - fresnel) * clear * (1.0 - 0.5 * rim);
  // Looked down on, the water mirrors little, and still the image of what stands in it is seen: the animal is between the sky and
  // the water under it, so the silt there is in its shade and the bed is hidden by it.
  colour = mix(colour * (1.0 - 0.35 * image.a), 0.4 * image.rgb, 0.5 * image.a);
  alpha = mix(alpha, 1.0, 0.6 * image.a);
  // What the water leaves at its edge: a broken line of scum and small bubbles, pale, that rides the ragged line of the bank.
  float line = depth - ragged;
  float scum = line > 0.15 || far > 60.0 ? 0.0 : smoothstep(0.045, 0.07, line) * smoothstep(0.15, 0.085, line) * smoothstep(0.42, 0.62, vnoise(xz * 3.1 + 0.2 * uTime * drift) + 0.25 * vnoise(xz * 17.0)) * smoothstep(60.0, 20.0, far);
  if (scum > 0.0) {
    float bubbles = 0.55 + 0.45 * smoothstep(0.35, 0.7, vnoise(xz * 70.0));
    vec3 froth = vec3(0.62, 0.58, 0.5) * bubbles * skyUp * (0.6 + 0.8 * sunHere);
    colour = mix(colour, froth, 0.7 * scum);
    alpha = mix(alpha, 1.0, 0.7 * scum);
  }
  alpha *= cover;
  colour *= cover;
  float keep = 1.0 - uSolo;
  return vec4(rigOut(colour), alpha * keep);
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
  if (depth <= 0.0 || depth > 1.6 || steep > 2.0) {
    discard;
  } else {
    vec4 drawn = water(xz, depth, land);
    if (drawn.a < 0.0) discard;
    gl_FragColor = drawn;
  }
}`;
