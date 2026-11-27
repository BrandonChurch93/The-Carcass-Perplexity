// The water in the light of the rig: what the sky puts on it, what shows through it, and the low sun's glitter.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { FASTEST } from './flow';

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
uniform sampler2D tLines;
uniform sampler2D tCarried;
uniform vec4 uFlowRect;
${NOISE_GLSL}
${RIG_GLSL}
// One band of waves (maps.ts): waves of nearly one length that run nearly one way. The square is read where the band's group has been carried to,
// at the band's group speed and with the stream, and its two halves are turned against each other at what is left of the band's frequency:
// so every crest runs at its own phase speed, which is the speed water gives a wave of that length. Nothing is slid as a picture.
// The level of the square is worked out from the pixel's footprint, taken once at the top of main: a read that chooses its own level
// inside a branch takes its derivatives from pixels that did not go that way, and the frame does not come out the same twice.
vec2 band(sampler2D map, vec2 xz, vec2 dir, float tile, float group, float omega, vec2 stream, float foot) {
  vec2 p = xz - (stream + dir * group) * uTime;
  vec2 across = vec2(-dir.y, dir.x);
  vec4 w = textureLod(map, vec2(dot(p, dir), dot(p, across)) / tile, log2(max(foot, 1e-5) * 256.0 / tile) - 0.35) * 2.0 - 1.0;
  float turn = omega * uTime;
  vec2 s = w.rg * cos(turn) + w.ba * sin(turn);
  return dir * s.x + across * s.y;
}
vec2 turned(vec2 d, float by) {
  return vec2(d.x * cos(by) - d.y * sin(by), d.x * sin(by) + d.y * cos(by));
}
// The water at a pixel that has water: everything after the test of the depth, kept apart so that a pixel of dry land costs only that test.
vec4 water(vec2 xz, float depth, vec4 land, float shelf, float foot) {
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
  // Shallow water over a bed carries less of a wave, and a film over a plate none. Ankle deep it is still ruffled all over: the picture of the
  // feeding waders has no glass in it.
  float deep = smoothstep(0.004, 0.05, depth) * (0.5 + 0.5 * smoothstep(0.03, 0.25, depth));
  // The stream: the channel runs out to the sea, slowly.
  vec2 stream = vec2(0.03, 0.12);

  // The stream (flow.ts): where it goes, how fast, where it breaks, and what it carries.
  vec2 fu = (xz - uFlowRect.xy) * uFlowRect.zw;
  vec2 fe = min(fu, 1.0 - fu);
  float inStream = smoothstep(0.0, 0.02, min(fe.x, fe.y)) * (1.0 - smoothstep(110.0, 170.0, far)) * smoothstep(0.01, 0.05, depth);
  float slick = 0.0;
  float flecks = 0.0;
  float broken = 0.0;
  float lanes = 0.5;
  if (inStream > 0.0) {
    vec4 ln = texture2D(tLines, fu);
    vec4 ca = texture2D(tCarried, fu);
    float speed = ca.r * ${FASTEST.toFixed(2)};
    float moving = smoothstep(0.015, 0.06, speed) * inStream;
    broken = ca.b * inStream;
    // What floats goes down with the stream: the pattern is read where the fleck was a moment ago. Two readings half a turn apart, each
    // faded out before it has been carried far enough to tear, and each turn a new place in the pattern, so nothing comes round again.
    vec2 vel = ln.gb;
    float level = log2(max(foot, 1e-5) * 256.0 / 1.7);
    float load = min(ca.g * 2.0, 1.0);
    // Lanes many metres long of smooth water between ruffled water lie along the lines of the stream and go down with it too.
    // They are a noise of two sizes across the stream, a metre and three. A square of waves read here drew them as stripes of one
    // spacing along every line of the stream, a pressed record metres wide in the high view: do not go back to it.
    lanes = smoothstep(0.22, 0.78, 0.62 * vnoise(vec2(ln.r * 0.3 + 0.61, 0.12 * xz.y - 0.023 * uTime)) + 0.38 * vnoise(vec2(ln.r * 0.85 + 4.0, 0.31 * xz.y - 0.06 * uTime)));
    // Froth: small pale rafts a hand long, few, in drifts, thick below a stone or a bar. Open water that nothing has broken carries
    // none, and its two readings are not made there.
    float there = moving * (1.0 - smoothstep(0.03, 0.12, foot)) * smoothstep(0.03, 0.14, load);
    if (there > 0.0) {
      float turn = uTime / 3.2 + 1.7 * vnoise(xz * 0.19);
      float turn2 = turn + 0.5;
      float n1 = floor(turn);
      float n2 = floor(turn2);
      float p1 = turn - n1;
      float p2 = turn2 - n2;
      float w1 = 1.0 - abs(2.0 * p1 - 1.0);
      vec4 f1 = textureLod(tWave, (xz - vel * (3.2 * (p1 - 0.5))) / 1.7 + vec2(0.37, 0.61) * n1, level);
      vec4 f2 = textureLod(tRipple, (xz - vel * (3.2 * (p2 - 0.5))) / 1.7 + vec2(0.37, 0.61) * n2 + 0.5, level);
      float cut = mix(0.96, 0.66, load) - 0.3 * (lanes - 0.5);
      flecks = there * mix(smoothstep(cut, cut + 0.14, f2.r + f2.b - 1.0 + 0.5 * (f2.a - 0.5)),
                           smoothstep(cut, cut + 0.14, f1.r + f1.b - 1.0 + 0.5 * (f1.a - 0.5)), w1);
    }
    slick = smoothstep(0.3, 0.8, lanes) * moving;
  }

  // Five bands, from a swell five metres long to ripples a hand long. Each is read only where a pixel can show it. [length, root mean square of its slope]
  vec2 slope = vec2(0.0);
  float lost = 0.0;
  // Between the gusts the water is not glass: a light air lies on all of it and keeps every band alive. A gust doubles the short ones.
  // The swell is the sea's: on the shelf, in a channel twenty metres wide, a wave five metres long has no room.
  float a5 = (0.022 + 0.02 * broad) * (1.0 - 0.88 * shelf);
  // Where it is too low to be seen it is not read.
  a5 *= smoothstep(0.0035, 0.007, a5);
  // From the high wide view the light air is not seen as a grain over the whole channel: the water lies silky there between the gusts,
  // which cross it as darker ruffled patches.
  float air = 1.0 - 0.6 * uHigh;
  float a1 = (0.016 * air + 0.012 * gust * air) * deep * (1.0 - 0.3 * slick);
  float a04 = (0.032 * air + 0.05 * gust * (0.5 + 0.5 * air)) * deep * (1.0 - 0.55 * slick);
  // Fast water over a shallow bar is broken: the short bands stand up there whatever the wind does.
  float a016 = (0.036 * air + 0.085 * gust + 0.1 * broken) * deep * (1.0 - 0.7 * slick);
  float a008 = (0.028 * air + 0.085 * gust + 0.11 * broken) * deep * (1.0 - 0.8 * slick);
  // A band alone is corduroy: ridges of one spacing as far as the eye goes. Water over an uneven bed bends its ripples and gathers them
  // into groups, so the short bands are read a little aside, by a field that stays where the bed is, and stand high and low by turns.
  float bend1 = vnoise(xz * 0.7 + 2.0);
  float bend2 = vnoise(xz * 1.9 + 8.0);
  vec2 bent = xz + (vec2(bend1, bend2) - 0.5) * vec2(0.7, 0.35);
  a04 *= 0.45 + 1.1 * bend1;
  a016 *= 0.45 + 1.1 * bend2;
  a008 *= 0.45 + 1.1 * bend2;
  float k5 = 1.0 - smoothstep(1.3, 5.3, foot);
  float k1 = 1.0 - smoothstep(0.36, 1.42, foot);
  float k04 = 1.0 - smoothstep(0.1, 0.42, foot);
  float k016 = 1.0 - smoothstep(0.04, 0.16, foot);
  float k008 = 1.0 - smoothstep(0.02, 0.08, foot);
  if (k5 > 0.0 && foot > 0.02 && a5 > 0.0) slope += band(tWave, xz, turned(uWind, 0.14), 64.0, 1.6, 1.2, stream, foot) * (4.0 * a5);
  if (k1 > 0.0) slope += band(tRipple, xz, turned(uWind, -0.25), 17.0, 0.75, 3.2, stream, foot) * (4.0 * a1);
  if (k04 > 0.0) slope += band(tWave, bent, turned(uWind, 0.38), 5.0, 0.4, 6.1, stream, foot) * (4.0 * a04);
  if (k016 > 0.0) slope += band(tRipple, bent, turned(uWind, -0.52), 1.9, 0.27, 9.1, stream, foot) * (4.0 * a016);
  if (k008 > 0.0) slope += band(tWave, bent, turned(uWind, 0.66), 0.96, 0.235, 9.95, stream, foot) * (4.0 * a008);
  // What the pixel could not show of them stays in the water as roughness: the variance of the slope it has lost.
  lost = 2.0 * (a5 * a5 * (1.0 - k5) + a1 * a1 * (1.0 - k1) + a04 * a04 * (1.0 - k04) + a016 * a016 * (1.0 - k016) + a008 * a008 * (1.0 - k008));
  // The rings round what stands in the water, as the waders folder drew them for this camera.
  // They are read a little aside by the wind's own slope, so a ring crosses the ripples as a bent, broken line and not as a drawn circle.
  // A second, slower push aside makes their spacing uneven, and they stand only in short arcs: where the small ripples stand high (bend2) a ring is lost.
  // Far off a ring is a pixel wide and is read where it lies.
  float nearBy = 1.0 - smoothstep(40.0, 60.0, far);
  float part = bend2;
  vec2 aside = vec2(0.0);
  if (nearBy > 0.0) aside = (vec2(vnoise(xz * 4.3 + 0.3 * gone), part) - 0.5) * nearBy;
  vec4 rings = texture2D(tRings, gl_FragCoord.xy / uFrame + (slope * vec2(0.012, 0.03) + aside * vec2(0.02, 0.016)) * min(1.0, 8.0 / far));
  float held = clamp(rings.a, 0.0, 1.0);
  float arcs = 1.0 - smoothstep(0.34, 0.56, part);
  // Where a ring is steep, and hard against a leg or a mop, the water is worked into small steep faces.
  float stirred = min(1.0, smoothstep(0.04, 0.2, rings.b) + smoothstep(0.0, 0.25, held));
  // From the high wide view a ring is a faint thing: whole circles metres wide round every animal read as a pressed record.
  slope += rings.rg * (2.4 * (0.05 + 0.95 * arcs) * (1.0 - 0.55 * uHigh));
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
  // Near the lens the gold is in points: the smallest ripples, a thumb long, each turn a face to the sun for a moment. They are too small to
  // bend the mirror and are read for the sun alone.
  vec2 facet = slope;
  float kPoint = 1.0 - smoothstep(0.004, 0.016, foot);
  // Read only where a facet could reach the sun's slope at all: a band is the dearest thing in this shader.
  vec2 miss0 = -slope - want;
  // Stirred water has many more of them and steeper: some face the sun from well off its path, so what stands or falls in the water is
  // ringed with lit points.
  if (kPoint > 0.0 && dot(miss0, miss0) < 0.25 + 1.5 * stirred) facet += band(tRipple, xz, turned(uWind, 1.1), 0.33, 0.18, 14.0, stream, foot) * (4.0 * kPoint * (0.05 + 0.07 * gust + 0.45 * stirred) * deep);
  vec2 miss = -facet - want;
  float spread = 0.0022 + lost;
  float faces = exp(-dot(miss, miss) / spread) / (3.14159 * spread);
  float hy2 = max(h.y * h.y, 0.01);
  float vh = clamp(dot(v, h), 0.0, 1.0);
  float glint = (0.02 + 0.98 * pow(1.0 - vh, 5.0)) * faces / (4.0 * max(v.y, 0.04) * hy2 * hy2);
  mirror += uSunColour * vec3(1.0, 0.66, 0.3) * (min(glint, 11.0) * sunHere * (1.0 - hit));

  // What stands in the water is mirrored in it, broken by the waves: the image is read a little aside, more along the line of sight than across it.
  float low = 1.0 - smoothstep(3.0, 7.0, cameraPosition.y - uSea);
  vec2 at = gl_FragCoord.xy / uFrame + vec2(slope.x * 0.05, slope.y * 0.12) * smoothstep(0.0, 6.0, far) * min(1.0, 14.0 / far);
  vec4 image = texture2D(tMirror, at);
  // The image is of things in the shade of their own bodies, seen from below: darker than what stands over it.
  mirror = mirror * (1.0 - mix(0.85, 0.96, low) * image.a) + mix(0.4, 0.26, low) * image.rgb;

  // What is in the water. It is clear: a hand deep the bed shows whole, knee deep the water's own colour has taken its place, and that
  // colour is teal, a little milky with silt, darker where the channel has depth.
  float path = depth / max(nv, 0.25);
  // It is milky: the silt hides the bed a hand deep. With clearer water the wide view showed the gravel of the bed through the whole
  // channel as a speckle, where the picture has one soft opaque green.
  float clear = exp(-path * 14.0);
  vec3 tone = mix(vec3(0.215, 0.3, 0.275), mix(vec3(0.13, 0.265, 0.25), vec3(0.068, 0.2, 0.212), smoothstep(0.2, 0.7, depth)), smoothstep(0.03, 0.2, depth));
  // Seen from low down and against the light the body of shallow water is not green: what comes back out of it is the low sun in its silt,
  // a dull warm olive, as under the feeding waders in the picture. From above it is the teal of the wide view.
  // Only where the eye is low and the look is flat: looked down on by more than a quarter of a right angle the teal comes through again,
  // except from the wading camera, a man's height over the water, whose picture has no green in it at all.
  float eyeUp = cameraPosition.y - uSea;
  float flat2 = mix(1.0 - smoothstep(0.26, 0.42, v.y), 1.0, 1.0 - smoothstep(2.4, 3.2, eyeUp));
  tone = mix(tone, vec3(0.15, 0.13, 0.095), 0.92 * flat2 * (1.0 - smoothstep(2.6, 5.0, eyeUp)));
  // The low sun goes into the water as well and lights the silt in it.
  // The silt goes down in the same lanes: the water's colour is streaked along the stream, milkier and clearer by turns.
  tone *= 1.0 + 0.12 * inStream * (lanes - 0.5);
  vec3 body = tone * (skyUp * open + uSunColour * (0.06 * sunHere));

  vec3 colour = fresnel * mirror + (1.0 - fresnel) * (1.0 - clear) * body;
  // A wet bed is darker than a dry one: under the thinnest film of water the rock has already lost a third of its light, so the water
  // has a dark glossy margin where it meets the dry rock.
  float alpha = 1.0 - (1.0 - fresnel) * clear * 0.62;
  // And where the water meets what stands in it, it climbs it a hair and turns the sky away: a thin dark line along every bank and stone.
  float meet = 1.0 - smoothstep(0.0, 0.022, depth - 0.6 * ragged);
  alpha = max(alpha, 0.6 * meet);
  colour *= 1.0 - 0.7 * meet;
  // The same round a leg or a wet mop that stands in it (the waders folder says where): a dark line where the water climbs it.
  float touch = smoothstep(0.1, 0.55, held);
  alpha = max(alpha, 0.9 * touch);
  colour *= 1.0 - 0.85 * touch;
  // Looked down on, the water mirrors little, and still the image of what stands in it is seen: the animal is between the sky and
  // the water under it, so the silt there is in its shade and the bed is hidden by it.
  colour = mix(colour * (1.0 - 0.35 * image.a), mix(0.4, 0.26, low) * image.rgb, mix(0.5, 0.75, low) * image.a);
  alpha = mix(alpha, 1.0, 0.6 * image.a);
  // What the stream carries is drawn on the water: pale, matt, lit by the sky and the low sun.
  if (flecks > 0.0) {
    vec3 pale = vec3(0.6, 0.58, 0.52) * (skyUp * open + uSunColour * (0.22 * sunHere));
    // Against the glare a raft of froth is still the paler thing: it is wet, and takes part of the shine of the water it rides.
    pale = max(pale, 1.2 * colour);
    colour = mix(colour, pale, 0.6 * flecks);
    alpha = mix(alpha, 1.0, 0.6 * flecks);
  }
  alpha *= cover;
  colour *= cover;
  float keep = 1.0 - uSolo;
  return vec4(rigOut(colour), alpha * keep);
}
void main() {
  vec2 xz = vWorld.xz;
  // How much water a pixel covers, on its longer side: a wave shorter than that is not seen as a wave but as a roughness.
  vec2 dx = dFdx(xz);
  vec2 dy = dFdy(xz);
  float foot = max(length(dx), length(dy));
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
  float steep = length(vec2(dFdx(depth), dFdy(depth))) / max(length(vec2(length(dx), length(dy))), 1e-5);
  if (depth <= 0.0 || depth > 1.6 || steep > 2.0) {
    discard;
  } else {
    vec4 drawn = water(xz, depth, land, inNear, foot);
    if (drawn.a < 0.0) discard;
    gl_FragColor = drawn;
  }
}`;
