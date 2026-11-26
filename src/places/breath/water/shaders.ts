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
uniform float uHigh;
uniform vec2 uWind;
uniform sampler2D tMirror;
uniform sampler2D tRings;
uniform vec2 uFrame;
${NOISE_GLSL}
${RIG_GLSL}
// One band of waves (maps.ts): waves of nearly one length that run nearly one way. The square is read where the band's group has been carried to,
// at the band's group speed and with the stream, and its two halves are turned against each other at what is left of the band's frequency:
// so every crest runs at its own phase speed, which is the speed water gives a wave of that length. Nothing is slid as a picture.
vec2 band(sampler2D map, vec2 xz, vec2 dir, float tile, float group, float omega, vec2 stream) {
  vec2 p = xz - (stream + dir * group) * uTime;
  vec2 across = vec2(-dir.y, dir.x);
  vec4 w = texture2D(map, vec2(dot(p, dir), dot(p, across)) / tile) * 2.0 - 1.0;
  float turn = omega * uTime;
  vec2 s = w.rg * cos(turn) + w.ba * sin(turn);
  return dir * s.x + across * s.y;
}
vec2 turned(vec2 d, float by) {
  return vec2(d.x * cos(by) - d.y * sin(by), d.x * sin(by) + d.y * cos(by));
}
// The water at a pixel that has water: everything after the test of the depth, kept apart so that a pixel of dry land costs only that test.
vec4 water(vec2 xz, float depth, vec4 land) {
  // The water begins along a ragged line, and the line is not still: the swell lifts it a finger up the rock and lets it fall.
  float ragged = depth < 0.2 ? vnoise(xz * 1.7) * 0.05 + vnoise(xz * 9.0) * 0.015 + 0.008 * sin(uTime * 1.7 + 9.0 * vnoise(xz * 0.9)) : 0.0;
  float cover = smoothstep(0.0, 0.012, depth - 0.6 * ragged);
  if (cover <= 0.0) return vec4(-1.0);

  vec3 toEye = cameraPosition - vWorld;
  float far = length(toEye);
  vec3 v = toEye / far;
  float above = uSea - land.r;
  float open = mix(land.g, 1.0, clamp(above / 30.0, 0.0, 1.0)) * (1.0 - (far < 60.0 ? contactDrawn(vWorld) * smoothstep(60.0, 45.0, far) : 0.0) * smoothstep(4.0, 0.0, above));
  float sunHere = sunSeen(land, uSea + 0.3) * sunCloud(xz);

  // The wind does not lie evenly on the water: it comes down on it in patches that travel with it, and between them the water is nearly glass.
  vec2 gone = uWind * uTime;
  float airs = 0.6 * vnoise((xz - gone * 2.6) * 0.085) + 0.4 * vnoise((xz - gone * 3.4) * vec2(0.31, 0.23) + 7.0);
  float broad = vnoise((xz - gone * 1.2) * 0.011 + 3.0);
  float gust = smoothstep(0.42, 0.7, airs + 0.3 * (broad - 0.5));
  // Shallow water over a bed carries less of a wave, and a film over a plate none.
  float deep = 0.25 + 0.75 * smoothstep(0.0, 0.3, depth);
  // How much water a pixel covers, on its longer side: a wave shorter than that is not seen as a wave but as a roughness.
  float foot = max(length(dFdx(xz)), length(dFdy(xz)));
  // The stream: the channel runs out to the sea, slowly.
  vec2 stream = vec2(0.03, 0.12);

  // The stream is seen: it draws what floats on it into lanes that lie along it and go down with it, slicks of still water between
  // ruffled water, a metre or less across and many metres long. They wander, and where the water is a film there are none.
  vec2 sdir = normalize(stream);
  vec2 carried = xz - stream * uTime;
  float sAlong = dot(carried, sdir);
  float sAcross = dot(xz, vec2(-sdir.y, sdir.x)) + 2.4 * vnoise(vec2(sAlong * 0.13, 3.0) + 0.05 * xz) + 0.6 * vnoise(vec2(sAlong * 0.5, 9.0) + 0.21 * xz);
  float lanes = 0.62 * vnoise(vec2(sAcross * 1.25, sAlong * 0.06)) + 0.38 * vnoise(vec2(sAcross * 3.4 + 5.0, sAlong * 0.17));
  float inStream = smoothstep(0.06, 0.3, depth) * (1.0 - smoothstep(70.0, 140.0, far));
  float slick = smoothstep(0.5, 0.62, lanes) * inStream;

  // Five bands, from a swell five metres long to ripples a hand long. Each is read only where a pixel can show it. [length, root mean square of its slope]
  vec2 slope = vec2(0.0);
  float lost = 0.0;
  float a5 = 0.022 + 0.02 * broad;
  float a1 = (0.028 + 0.018 * gust) * deep * (1.0 - 0.3 * slick);
  float a04 = (0.03 + 0.06 * gust) * deep * (1.0 - 0.65 * slick);
  float a016 = (0.012 + 0.13 * gust) * deep * (1.0 - 0.75 * slick);
  float a008 = (0.004 + 0.12 * gust) * deep * (1.0 - 0.85 * slick);
  float k5 = 1.0 - smoothstep(1.3, 5.3, foot);
  float k1 = 1.0 - smoothstep(0.36, 1.42, foot);
  float k04 = 1.0 - smoothstep(0.1, 0.42, foot);
  float k016 = 1.0 - smoothstep(0.04, 0.16, foot);
  float k008 = 1.0 - smoothstep(0.02, 0.08, foot);
  if (k5 > 0.0 && foot > 0.02) slope += band(tWave, xz, turned(uWind, 0.14), 64.0, 1.6, 1.2, stream) * (4.0 * a5);
  if (k1 > 0.0) slope += band(tRipple, xz, turned(uWind, -0.25), 17.0, 0.75, 3.2, stream) * (4.0 * a1);
  if (k04 > 0.0) slope += band(tWave, xz, turned(uWind, 0.38), 5.0, 0.4, 6.1, stream) * (4.0 * a04);
  if (k016 > 0.0) slope += band(tRipple, xz, turned(uWind, -0.52), 1.9, 0.27, 9.1, stream) * (4.0 * a016);
  if (k008 > 0.0) slope += band(tWave, xz, turned(uWind, 0.66), 0.96, 0.235, 9.95, stream) * (4.0 * a008);
  // What the pixel could not show of them stays in the water as roughness: the variance of the slope it has lost.
  lost = 2.0 * (a5 * a5 * (1.0 - k5) + a1 * a1 * (1.0 - k1) + a04 * a04 * (1.0 - k04) + a016 * a016 * (1.0 - k016) + a008 * a008 * (1.0 - k008));
  // The rings round what stands in the water, as the waders folder drew them for this camera.
  vec4 rings = texture2D(tRings, gl_FragCoord.xy / uFrame);
  slope += rings.rg * 4.2;
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
  float rough = sqrt(lost);

  // A mirror that is rough to the eye shows the sky higher up than a flat one would, and never mirrors whole however low the eye.
  float nv = max(dot(n, v), 1.3 * rough + 0.03);
  float fresnel = 0.02 + 0.98 * pow(1.0 - min(nv, 1.0), 5.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y) + 0.01 + 1.6 * rough;
  r = normalize(r);
  vec3 mirror = skyRadiance(r) * open;
  vec3 skyUp = skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159;
  // Where the mirrored ray meets the land the water shows the land: dark rock, paler with the fog between.
  vec2 way = r.xz / max(length(r.xz), 1e-4);
  float rise = r.y / max(length(r.xz), 1e-4);
  float hit = 0.0;
  float reach = 2.4;
  for (int i = 0; i < 2; i++) {
    if (far > 260.0) break;
    vec2 at2 = (xz + way * reach - uLandRect.xy) * uLandRect.zw;
    float over = texture2D(tLand, at2).r - (uSea + rise * reach);
    hit = max(hit, smoothstep(0.0, 0.5 + 0.03 * reach, over) * exp(-reach / 45.0));
    reach *= 7.0;
  }
  mirror = mix(mirror, vec3(0.16, 0.14, 0.12) * skyUp, hit * 0.7);

  // The sun on the water. A face of the water throws the sun to the lens when its slope is the one slope that does; the faces of a pixel are
  // spread round the slope drawn by as much as the pixel has lost, and the sun in this fog is a disc some degrees wide. So near the lens the gold
  // lies along the crests that are turned right, wave by wave, and far off it gathers into the sun's path, cut by every swell and every gust.
  vec3 h = normalize(v + uSunDir);
  vec2 want = h.xz / max(h.y, 0.05);
  vec2 miss = -slope - want;
  float spread = 0.0022 + lost;
  float faces = exp(-dot(miss, miss) / spread) / (3.14159 * spread);
  float hy2 = max(h.y * h.y, 0.01);
  float vh = clamp(dot(v, h), 0.0, 1.0);
  float glint = (0.02 + 0.98 * pow(1.0 - vh, 5.0)) * faces / (4.0 * max(v.y, 0.04) * hy2 * hy2);
  mirror += uSunColour * vec3(1.0, 0.74, 0.42) * (min(glint, 7.0) * sunHere * (1.0 - hit));

  // What stands in the water is mirrored in it, broken by the waves: the image is read a little aside, more along the line of sight than across it.
  float low = 1.0 - smoothstep(3.0, 7.0, cameraPosition.y - uSea);
  vec2 at = gl_FragCoord.xy / uFrame + vec2(slope.x * 0.05, slope.y * 0.12) * smoothstep(0.0, 6.0, far) * min(1.0, 14.0 / far);
  vec4 image = texture2D(tMirror, at);
  // The image is of things in the shade of their own bodies, seen from below: darker than what stands over it.
  mirror = mirror * (1.0 - mix(0.85, 0.96, low) * image.a) + mix(0.4, 0.26, low) * image.rgb;

  // What is in the water. It is clear: a hand deep the bed shows whole, knee deep the water's own colour has taken its place, and that
  // colour is teal, a little milky with silt, darker where the channel has depth.
  float path = depth / max(nv, 0.25);
  float clear = exp(-path * 4.5);
  vec3 tone = mix(vec3(0.13, 0.18, 0.18), mix(vec3(0.07, 0.175, 0.2), vec3(0.04, 0.125, 0.165), smoothstep(0.25, 0.9, depth)), smoothstep(0.03, 0.25, depth));
  // The low sun goes into the water as well and lights the silt in it.
  // The silt goes down in the same lanes: the water's colour is streaked along the stream, milkier and clearer by turns.
  tone *= 1.0 + 0.45 * inStream * (lanes - 0.5);
  vec3 body = tone * (skyUp * open + uSunColour * (0.06 * sunHere));

  vec3 colour = fresnel * mirror + (1.0 - fresnel) * (1.0 - clear) * body;
  // A wet bed is darker than a dry one: under the thinnest film of water the rock has already lost a third of its light, so the water
  // has a dark glossy margin where it meets the dry rock.
  float alpha = 1.0 - (1.0 - fresnel) * clear * 0.62;
  // And where the water meets what stands in it, it climbs it a hair and turns the sky away: a thin dark line along every bank and stone.
  float meet = 1.0 - smoothstep(0.0, 0.022, depth - 0.6 * ragged);
  alpha = max(alpha, 0.6 * meet);
  colour *= 1.0 - 0.7 * meet;
  // Looked down on, the water mirrors little, and still the image of what stands in it is seen: the animal is between the sky and
  // the water under it, so the silt there is in its shade and the bed is hidden by it.
  colour = mix(colour * (1.0 - 0.35 * image.a), mix(0.4, 0.26, low) * image.rgb, mix(0.5, 0.75, low) * image.a);
  alpha = mix(alpha, 1.0, 0.6 * image.a);
  // What the water leaves at its edge: a broken line of scum and small bubbles, pale, that rides the ragged line of the bank.
  float line = depth - ragged;
  float scum = line > 0.1 || far > 60.0 ? 0.0 : smoothstep(0.012, 0.03, line) * smoothstep(0.075, 0.04, line) * smoothstep(0.4, 0.6, vnoise(xz * 3.1 + 0.2 * uTime * stream) + 0.25 * vnoise(xz * 17.0)) * smoothstep(60.0, 20.0, far);
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
