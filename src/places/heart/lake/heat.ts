import { OUTLINE_GLSL } from './outline';

// The heat of the lake at a point of the crust, for the surface and for the glow map: one function, so that the light the lake
// gives is the heat the camera sees. Needs NOISE_GLSL and RIG_GLSL before it.
export const HEAT_GLSL = /* glsl */ `
uniform sampler2D tNet;
uniform vec4 uNetRect;
uniform sampler2D tNetFine;
uniform vec4 uNetFineRect;
uniform vec4 uPool;
uniform vec3 uSunk;
uniform vec4 uFounder[2];
uniform vec4 uFounderLie[2];
uniform vec4 uFounderSeed[2];
${OUTLINE_GLSL}

// The nearest seam at a point of the crust: r metres to its centre line, g its number (2 and above: a seam the pictures show),
// b the age of the plate, a the half width the seam reaches when it is open.
vec4 netAt(vec2 q) {
  vec2 f = (q - uNetFineRect.xy) * uNetFineRect.zw;
  vec2 e = min(f, 1.0 - f);
  float k = smoothstep(0.0, 0.04, min(e.x, e.y));
  if (k >= 1.0) return texture2D(tNetFine, f);
  vec4 wide = texture2D(tNet, (q - uNetRect.xy) * uNetRect.zw);
  if (k <= 0.0) return wide;
  return mix(wide, texture2D(tNetFine, f), k);
}

// The beat of the lake. It leaves the foot of the fall and crosses the lake in about three seconds.
float beatAt(vec2 q) {
  return 0.5 + 0.5 * sin(uTime * 1.05 - length(q - uFlowFoot) / 240.0);
}

// The edge of a gap is torn: metres to add to the distance from its middle.
float tornAt(vec2 q) {
  return (vnoise(q * 1.7 + 11.0) - 0.5) * 0.5 + (vnoise(q * 5.3 + 3.0) - 0.5) * 0.2;
}

// One gap in the crust: d metres from its middle, half width, kelvin in its core. A gap narrower than a pixel is drawn a pixel
// wide and dimmer by the same factor, so that its light is the same and it does not crawl. Returns cover and kelvin.
vec3 gLip;
float gAcross;
float gIsle;
// Islands of dark crust stand in the stream of a wide channel, away from its banks.
float isleAt(vec2 q, float across) {
  return smoothstep(0.6, 0.66, vnoise(q / 1.7 + 31.0) * 0.72 + vnoise(q / 0.45 + 7.0) * 0.28) * (1.0 - smoothstep(0.4, 0.62, across));
}
vec2 gapHeat(float d, float wide, float core, float least) {
#ifdef LAKE_VERTEX
  float ww = max(max(wide, 0.5 * least), 1e-4);
#else
  float ww = max(max(wide, 0.5 * max(least, fwidth(d))), 1e-4);
#endif
  float x = d / ww;
  float lit = step(1e-3, wide);
  gAcross = x;
  float cover = (1.0 - smoothstep(0.82, 1.0, x)) * min(1.0, wide / ww) * lit;
#ifdef LAKE_LIP
  // What the lava in the gap throws on the skin beside it.
  float off = max(d - wide, 0.0);
  gLip += blackbody(core - 90.0) * (lit * wide / (wide + 1.3 * off + 0.004) * exp(-off / 2.6));
#endif
  // Yellow only in the middle of a wide gap, orange over most of it, deep red where the skin begins.
  float k = mix(core, min(core, 1190.0), smoothstep(0.0, 0.42, x));
  return vec2(cover, mix(k, 1030.0, smoothstep(0.4, 1.0, x)));
}

// The half width of the gap at the nearest seam now, and in y how far its skin has grown back (0 to 1).
// The life of a seam: it opens, widens, its skin grows in from the edges, it closes. Different seams are at different places in that life.
vec2 gapeAt(vec2 q, vec4 n) {
  float shown = step(1.5, n.g);
  vec2 pr = (q - uPool.xy) * uPool.zw;
  float byPool = 1.0 - smoothstep(1.0, 2.7, length(pr));
  float plain = smoothstep(uSunk.z - 1.0, uSunk.z + 5.0, length(q - uSunk.xy));
  float u = fract(n.g + uTime / 54.0);
  float widen = smoothstep(0.0, 0.36, u) * (1.0 - smoothstep(0.9, 1.0, u));
  float along = smoothstep(0.2, 0.6, vnoise(q / 38.0 + 3.1)) * (0.45 + 1.1 * vnoise(q / 5.7 + 7.0));
  float reach = n.a * mix(along * plain, 0.85 + 0.3 * vnoise(q / 1.7), shown);
  return vec2(reach * mix(widen, 1.0, max(shown, byPool)), smoothstep(0.46, 0.84, u));
}

// Signed metres from a point of the crust to the brim of the nearest gap: negative in the gap. n is netAt(q), untouched.
// The crust cuts its wall where this is zero and the melt's skin clings there: both read this one function.
float bankAt(vec2 q, vec4 n) {
  return n.r + tornAt(q) * smoothstep(0.0, 0.3, n.a) - gapeAt(q, n).x;
}

// The height of the melt in the gap of a seam the pictures show, metres (the brim is zero). One level for a seam, so the liquid lies level:
// the channel at the line and its fingers lowest, the long seam of the group a hand higher, the narrow near seams highest, the fountain lines low.
float meltLevel(vec4 n) {
  float c = n.g - 2.0;
  return -mix(mix(0.55, 0.3, smoothstep(0.0, 0.2, c)), 0.5, step(1.3, c));
}

// The mean heat of the melt of a wide gap, as the light it throws: kelvin. Hot spots come and go slowly along a seam.
float meltKelvin(vec2 q, vec4 n) {
  float c = n.g - 2.0;
  float k = mix(mix(1335.0, 1250.0, smoothstep(0.0, 0.25, c)), 1385.0, step(1.3, c));
  return k + 70.0 * (vnoise(q / 3.7 + vec2(uTime * 0.06, 3.0)) - 0.5) + 30.0 * (beatAt(q) - 0.5);
}

// The light a long strip of melt throws on a point, as a part of what a whole sky of it would: n2 is the normal in the plane across
// the gap (x away from the gap, y up), a and b the near and far edge of the strip from the point in that plane.
float stripLight(vec2 n2, vec2 a, vec2 b) {
  float ca = dot(n2, a);
  float cb = dot(n2, b);
  float ta = clamp(atan(n2.x * a.y - n2.y * a.x, ca), -1.5708, 1.5708);
  float tb = clamp(atan(n2.x * b.y - n2.y * b.x, cb), -1.5708, 1.5708);
  return 0.5 * abs(sin(tb) - sin(ta)) * smoothstep(-0.02, 0.05, max(ca / max(length(a), 1e-3), cb / max(length(b), 1e-3)));
}

// The light of the melt in the nearest wide gap on a point of the crust beside it: irradiance, to be multiplied by albedo / pi.
// off: metres outside the brim of the gap (negative inside it). below: metres under the brim. nrm: the normal of the face.
// away: the unit vector on the ground from the middle of the gap to the point (zero if not known).
// Strong within one gap width and gone within a few: the foot of a wall that faces the melt gets most, a face that looks away none,
// and the flat crust beside the gap gets what the hot air and the far wall over the melt send back.
vec3 meltLight(vec2 q, vec4 n, float off, float below, vec3 nrm, vec2 away) {
  float w = gapeAt(q, n).x;
  float wide = step(1.5, n.g) * smoothstep(0.12, 0.25, w);
  float level = meltLevel(n);
  vec2 n2 = vec2(dot(nrm.xz, away), nrm.y);
  float y = -below;
  float span = max(2.0 * w - 0.06, 0.1);
  float direct = stripLight(n2, vec2(-0.06 - off, level - y), vec2(-span - off, level - y));
  float lift = 0.2 + 0.5 * w;
  float air = stripLight(n2, vec2(0.1 - off, lift - y), vec2(-span - 0.1 - off, lift - y));
  // Nothing reaches a point far below the melt or far from it.
  float reach = exp(-max(off, 0.0) / (1.5 + 4.0 * w));
  return blackbody(meltKelvin(q, n)) * (3.14159 * uCast * wide * reach * (direct * smoothstep(-0.35, 0.0, y - level) + 0.3 * air));
}

// x: how much of the place is open lava, 0 to 1. y: kelvin of the lava that shows. z: metres to the edge of the nearest gap that
// is or was open (negative inside it). w: how young the skin is, 1 beside a living seam, 0 on an old plate.
// lake is metres from the rock, n is netAt(q), least is a floor on the width a gap is drawn at (zero for the surface, a texel for the glow map).
vec4 heatAt(vec2 q, float lake, vec4 n, float least) {
  float d = n.r;
  float shown = step(1.5, n.g);
  float beat = beatAt(q);
  vec2 pr = (q - uPool.xy) * uPool.zw;
  float pool = length(pr) + 0.34 * (vnoise(q / 13.0 + 2.0) - 0.5) + 0.12 * (vnoise(q / 3.1) - 0.5);
  float byPool = 1.0 - smoothstep(1.0, 2.7, pool);
  float plain = smoothstep(uSunk.z - 1.0, uSunk.z + 5.0, length(q - uSunk.xy));

  vec2 life = gapeAt(q, n);
  float gape = life.x;
  float skin = life.y;
  float hotHalf = gape * mix(1.0 - 0.92 * skin, 1.0, max(shown, byPool));
  // Few seams are fully open: most show the orange of lava under a thin skin.
  float fully = smoothstep(0.72, 0.9, fract(n.g * 7.13 + 0.37));
  float stirred = step(3.3, n.g);
  float core = mix(1265.0 + 135.0 * fully, 1400.0 - 300.0 * clamp(n.g - 2.0, 0.0, 1.0) * (1.0 - stirred), shown);
  core -= 190.0 * smoothstep(0.66, 0.44, vnoise(q / 3.3 + vec2(uTime * 0.03, 2.0)));
  core += 70.0 * (vnoise(q * 0.6 + vec2(uTime * 0.07, 0.0)) - 0.5) + 80.0 * (beat - 0.5) - 110.0 * skin * (1.0 - shown);
  gLip = vec3(0.0);
  gIsle = 0.0;
  vec2 g = gapHeat(d, hotHalf, core, least);
#ifdef LAKE_LIP
  // Seen close, a wide gap is a channel: a floor of orange under a skin that drifts and darkens in plates, and the open lava
  // shows only in thin lines, where the skin tears and where it shears against the lip.
  float big = smoothstep(0.1, 0.28, hotHalf) * (1.0 - stirred);
  if (big > 0.0 && g.x > 0.0) {
    vec2 run = q + vec2(uTime * 0.035, uTime * 0.012);
    float s1 = vnoise(run * 1.3);
    float s2 = vnoise(run * 4.1 + 5.0);
    // The skin on it is ropy like the crust it will become: orange where it is thin, dark where it has thickened,
    // and the open lava shows brightest in the creases where it tears and where it shears against the lip.
    float t = sqrt(texture2D(tRope, run / 2.3).g);
    float t2 = sqrt(texture2D(tRope, vec2(run.y, -run.x) / 4.7 + 0.37).g);
    // Yellow only down the middle of the stream, an orange body, dull red against the banks.
    float middle = 1.0 - smoothstep(0.12, 0.6, gAcross + 0.35 * (s1 - 0.5));
    float kFloor = mix(1165.0 + 70.0 * t2, 1250.0 + 55.0 * t, middle * smoothstep(0.25, 0.45, hotHalf));
    float skinOn = smoothstep(0.2, 0.3, t * 0.45 + t2 * 0.25 + 0.3 * s1 + 0.1 * (gAcross - 0.4));
    kFloor = mix(kFloor, 1010.0 + 230.0 * t2 * s1, skinOn * (1.0 - 0.8 * middle));
    kFloor = mix(kFloor, 985.0 + 115.0 * t, smoothstep(0.78, 0.98, gAcross));
    // The open lava shows palest in thin lines, where the skin tears and where the stream shears against the bank.
    float tear = (1.0 - smoothstep(0.13, 0.2, t)) * smoothstep(0.3, 0.6, s1);
    float rim = smoothstep(0.7, 0.8, gAcross) * (1.0 - smoothstep(0.84, 0.92, gAcross)) * smoothstep(0.45, 0.65, vnoise(q * 1.3 + 4.0));
    kFloor = mix(kFloor, core - 60.0, tear * 0.95);
    // Where the stream widens into a pool the lava wells up fresh: a pale core.
    kFloor = mix(kFloor, 1310.0 + 80.0 * t, smoothstep(1.25, 1.8, hotHalf) * middle * (1.0 - 0.6 * skinOn));
    kFloor = mix(kFloor, 1225.0, rim);
    // Rafts of thick skin, black and cold, lie against the banks.
    float raft = smoothstep(0.5, 0.56, s2 * 0.55 + 0.45 * vnoise(run * 0.8 + 17.0) + 0.3 * (gAcross - 0.6));
    kFloor = mix(kFloor, 850.0 + 150.0 * t, raft * (1.0 - 0.8 * rim));
    gIsle = isleAt(q, gAcross) * big * smoothstep(0.45, 0.6, hotHalf);
    g.x *= 1.0 - gIsle;
    g.y = mix(g.y, kFloor, big);
  }
#endif

  // The margin: the skin is torn from the rock along a crooked line, and a thin glow shows in the tear.
  float tear = 0.5 + 1.3 * vnoise(q / 4.3 + 9.0);
  float tearHalf = 0.22 * smoothstep(0.42, 0.78, vnoise(q / 17.0 + 21.0)) * smoothstep(0.25, 0.6, vnoise(q / 2.1 + 5.0));
  vec2 m = gapHeat(abs(lake - tear), tearHalf, 1150.0 + 130.0 * vnoise(q / 6.3 + 1.7) + 60.0 * (beat - 0.5), least);
  if (m.x > g.x) g = m;
  float edge = min(d - gape, abs(lake - tear) - tearHalf);

  // The pool at the foot of the fall: open lava that skins over outward, in rafts that ride away from the fall.
  float open = 1.0 - smoothstep(0.55, 1.02, pool);
  if (open > 0.0) {
    vec2 out2 = q - uFlowFoot;
    float ring = length(out2);
    vec2 polar = vec2(atan(out2.y, out2.x) * 9.0, ring / 7.0 - uTime * 0.22);
    float raft = smoothstep(0.42, 0.7, vnoise(polar) * 0.6 + vnoise(polar * 2.7 + 5.0) * 0.4 + 0.45 * (pool - 0.6));
    float k = 1440.0 - 150.0 * pool - 230.0 * raft + 50.0 * (beat - 0.5) + 40.0 * (vnoise(polar * 6.0) - 0.5);
    float c = open * (1.0 - 0.75 * raft * smoothstep(0.3, 0.8, pool));
    if (c > g.x) g = vec2(c, k);
    edge = min(edge, (pool - 0.9) * 20.0);
#ifdef LAKE_LIP
    gLip += blackbody(1290.0) * (0.6 * exp(-max((pool - 0.95) * 20.0, 0.0) / 2.5));
#endif
  }
  // Where a plate founders: a seam opens round it, and lava shows where its top has gone under the level of the lake.
  for (int i = 0; i < 2; i++) {
    vec2 rel = q - uFounder[i].xy;
    vec2 loc = vec2(dot(rel, uFounderSeed[i].xy), dot(rel, vec2(-uFounderSeed[i].y, uFounderSeed[i].x)));
    vec2 unit = loc * uFounder[i].zw;
    float rr = length(unit) / founderOutline(atan(unit.y, unit.x), uFounderSeed[i].z);
    float metres = (rr - 0.985) / max(uFounder[i].z, uFounder[i].w);
    float stir = vnoise(q * 0.45 + vec2(uTime * 0.31, -uTime * 0.17));
    vec2 ringHeat = gapHeat(abs(metres), 0.12 + 0.75 * uFounderLie[i].z, 1330.0 + 90.0 * (stir - 0.5) + 60.0 * (beat - 0.5), least);
    if (ringHeat.x > g.x) g = ringHeat;
    float top = uFounderLie[i].x - loc.y * uFounderLie[i].y;
    float flood = (1.0 - smoothstep(0.93, 0.985, rr)) * smoothstep(0.06, -0.1, top);
    if (flood > g.x) g = vec2(flood, 1300.0 + 150.0 * stir + 60.0 * (beat - 0.5));
    edge = min(edge, abs(metres) - 0.12 - 0.75 * uFounderLie[i].z);
  }
  float young = (1.0 - smoothstep(0.0, 0.25 + 3.0 * n.a, d - gape)) * step(1e-3, n.a) * mix(plain, 1.0, shown);
  young = max(young, 1.0 - smoothstep(0.9, 1.9, pool));
  return vec4(g.x, g.y, edge, young);
}`;
