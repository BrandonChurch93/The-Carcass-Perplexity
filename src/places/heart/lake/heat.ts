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

// One gap in the crust: d metres from its middle, half width, kelvin in its core. A gap narrower than a pixel is drawn a pixel
// wide and dimmer by the same factor, so that its light is the same and it does not crawl. Returns cover and kelvin.
vec2 gapHeat(float d, float wide, float core, float least) {
  float ww = max(wide, 0.5 * max(least, fwidth(d)));
  float x = d / ww;
  float cover = (1.0 - smoothstep(0.6, 1.0, x)) * min(1.0, wide / ww) * step(1e-3, wide);
  return vec2(cover, mix(core, 1085.0, smoothstep(0.1, 0.95, x)));
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

  // The life of a seam: it opens, widens, its skin grows in from the edges, it closes. Different seams are at different places in that life.
  float u = fract(n.g + uTime / 54.0);
  float widen = smoothstep(0.0, 0.36, u) * (1.0 - smoothstep(0.9, 1.0, u));
  float skin = smoothstep(0.46, 0.84, u);
  float along = smoothstep(0.2, 0.75, vnoise(q / 12.0 + 3.1)) * (0.6 + 0.8 * vnoise(q / 2.7 + 7.0));
  float reach = n.a * mix(along * plain, 0.85 + 0.3 * vnoise(q / 1.7), shown);
  float gape = reach * mix(widen, 1.0, max(shown, byPool));
  float hotHalf = gape * mix(1.0 - 0.92 * skin, 1.0, max(shown, byPool));
  float core = 1395.0 - 330.0 * clamp(n.g - 2.0, 0.0, 1.0) * shown + 70.0 * (vnoise(q * 0.6 + vec2(uTime * 0.07, 0.0)) - 0.5) + 80.0 * (beat - 0.5) - 110.0 * skin * (1.0 - shown);
  vec2 g = gapHeat(d, hotHalf, core, least);

  // The margin: the skin is torn from the rock along a crooked line, and a thin glow shows in the tear.
  float tear = 0.5 + 1.3 * vnoise(q / 4.3 + 9.0);
  float tearHalf = 0.3 * smoothstep(0.3, 0.75, vnoise(q / 17.0 + 21.0)) * (0.5 + vnoise(q / 2.1 + 5.0));
  vec2 m = gapHeat(abs(lake - tear), tearHalf, 1235.0 + 60.0 * (beat - 0.5), least);
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
