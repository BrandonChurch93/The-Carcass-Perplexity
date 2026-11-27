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

// What is drawn does not pulse: its heat creeps along the seams, 0.5 to 0.8 m a second, uneven. The mean is the beat's.
float creepAt(vec2 q) {
  float c = vnoise(q / 6.0 + vec2(uTime * 0.13, -uTime * 0.07)) * 0.6 + vnoise(q / 2.3 + vec2(-uTime * 0.2, uTime * 0.23)) * 0.4;
  return clamp(0.5 + 1.8 * (c - 0.5), 0.0, 1.0);
}

// What is drawn also surges: whole reaches of the lake flare and dim as heat travels through the web of seams, in lumps 25 to
// 70 m long that cross a reach in three or four seconds, so that the move is seen from the rim of the bowl. 0 to 1, mean a half.
float surgeAt(vec2 q) {
  float a = vnoise(q / 70.0 + vec2(uTime * 0.27, -uTime * 0.16));
  float b = vnoise(q / 23.0 + vec2(-uTime * 0.33, uTime * 0.29));
  return clamp(0.5 + 2.1 * (a * 0.62 + b * 0.38 - 0.5), 0.0, 1.0);
}

// The roots of the one that feeds draw on the seam: heat runs along the string of pools toward the pool under its crown in slow
// pulses, eight metres long and three seconds apart, and the cracks round it open and close with them. 0 to 1.
float drawAt(vec2 q) {
  return 0.5 + 0.5 * sin(uTime * 2.0 + 0.8 * length(q - vec2(-404.9, 204.0)) + 4.0 * vnoise(q / 6.0 + 3.0));
}

// The edge of a gap is torn: metres to add to the distance from its middle.
float tornAt(vec2 q) {
  return (vnoise(q * 1.7 + 11.0) - 0.5) * 0.5 + (vnoise(q * 5.3 + 3.0) - 0.5) * 0.07;
}

// One gap in the crust: d metres from its middle, half width, kelvin in its core. A gap narrower than a pixel is drawn a pixel
// wide and dimmer by the same factor, so that its light is the same and it does not crawl. Returns cover and kelvin.
vec3 gLip;
float gAcross;
float gIsle;
// The least share of a pixel a gap fills: a far seam seen edge on shows its lit far wall and the glow over it, and never thins to nothing.
float gFloor = 0.0;
float gFoot = 0.0;
// Islands of dark crust stand in the stream of a wide channel, away from its banks.
float isleAt(vec2 q, float across) {
  return smoothstep(0.6, 0.66, vnoise(q / 1.7 + 31.0) * 0.72 + vnoise(q / 0.45 + 7.0) * 0.28) * (1.0 - smoothstep(0.4, 0.62, across));
}
vec2 gapHeat(float d, float wide, float core, float least) {
#ifdef LAKE_VERTEX
  float foot = least;
#else
  float foot = max(least, fwidth(d));
#endif
  gFoot = foot;
  // The glow map keeps its own measure: its energy is as it was.
  float onSheet = least > 0.5 ? 0.0 : 1.0;
  float ww = max(max(wide, mix(0.75, 1.2, onSheet) * foot), 1e-4);
  // Seen from far, a gap of a few pixels shows the mean of its melt, not the skin at its edges: the profile across it fades out.
  float far = smoothstep(0.1, 0.55, foot / max(wide, 1e-3));
  float x = d / ww;
  float lit = step(1e-3, wide);
  gAcross = x;
  // A gap of a pixel or two has a soft edge, two to three pixels across in all, and the same light: never a hard line one pixel wide.
  float cover = (1.0 - smoothstep(mix(0.82, 0.25, far * onSheet), 1.0, x)) * min(1.0, max(wide / (mix(1.0, 0.65, far * onSheet) * ww), gFloor)) * lit;
#ifdef LAKE_LIP
  // What the lava in the gap throws on the skin beside it.
  float off = max(d - wide, 0.0);
  // Seen close it ends within a metre; from far it is a pixel and a half of warmth beside the seam.
  gLip += blackbody(core - 90.0) * (lit * wide / (wide + 1.3 * off + 0.004) * exp(-off / (0.3 + 1.5 * foot)) * (1.0 - smoothstep(0.6 + 3.0 * foot, 1.0 + 5.0 * foot, off)));
#endif
  // Yellow only in the middle of a wide gap, orange over most of it, deep red where the skin begins.
  float k = mix(core, min(core, 1190.0), smoothstep(0.15, 0.6, x));
  k = mix(k, 1030.0, smoothstep(0.55, 1.0, x));
  return vec2(cover, mix(k, core - 20.0, far));
}

// The half width of the gap at the nearest seam now, and in y how far its skin has grown back (0 to 1).
// The life of a seam: it opens, widens, its skin grows in from the edges, it closes. Different seams are at different places in that life.
const float LINE_NARROW = 0.85;
// How much wider the net has the gap than it is drawn, as of the last call of gapeAt.
float gWas = 1.0;
// The seam the walkers feed at and the cracks that run from its pool (heat classes 0.08 and 0.1) are no even channel: an uneven
// string of small pools joined by narrow cracks.
float stringOf(vec4 n) {
  float c = n.g - 2.0;
  return step(1.5, n.g) * smoothstep(0.06, 0.075, c) * (1.0 - smoothstep(0.105, 0.115, c));
}
// A pool of the string that has its place: metres inside its brim (0 outside). at: its middle on the crust at the reference time.
float poolIn(vec2 q, vec2 at, vec2 axis, vec2 halves) {
  vec2 rel = q - at;
  vec2 e = vec2(dot(rel, axis), dot(rel, vec2(-axis.y, axis.x))) / halves;
  return max(1.0 - length(e) - 0.45 * (vnoise(q / 0.8 + 3.0) - 0.5) - 0.25 * (vnoise(q / 0.27 + 8.0) - 0.5), 0.0) * halves.y;
}
// The pool under the tuft of the one that feeds is long toward the lens of the feeding picture (about 1.8 m by 6 m); two more
// lie along the seam left and right of it in that picture.
float heroPool(vec2 q) {
  return poolIn(q, vec2(-404.9, 204.0), vec2(0.734, -0.679), vec2(3.0, 0.9));
}
float stringPools(vec2 q) {
  float a = heroPool(q);
  a = max(a, poolIn(q, vec2(-418.8, 203.8), vec2(0.95, -0.3), vec2(1.2, 0.7)));
  return max(a, poolIn(q, vec2(-385.1, 195.4), vec2(0.9, -0.44), vec2(1.5, 0.6)));
}
vec2 gapeAt(vec2 q, vec4 n) {
  float shown = step(1.5, n.g);
  vec2 pr = (q - uPool.xy) * uPool.zw;
  float byPool = 1.0 - smoothstep(1.0, 2.7, length(pr));
  float plain = smoothstep(uSunk.z - 1.0, uSunk.z + 5.0, length(q - uSunk.xy));
  float u = fract(n.g + uTime / 54.0);
  float widen = smoothstep(0.0, 0.36, u) * (1.0 - smoothstep(0.9, 1.0, u));
  float along = smoothstep(0.2, 0.6, vnoise(q / 38.0 + 3.1)) * (0.45 + 1.1 * vnoise(q / 5.7 + 7.0));
  float reach = n.a * mix(along * plain, 0.85 + 0.3 * vnoise(q / 1.7), shown);
  // The channel at the line is a narrow crack, half a metre to a metre and a half wide.
  // It stays wide enough for the crust to cut it down to the melt.
  float narrowed = mix(reach, max(LINE_NARROW * reach, min(reach, 0.32)), shown * (1.0 - smoothstep(0.01, 0.04, n.g - 2.0)));
  gWas = reach / max(narrowed, 1e-3);
  reach = narrowed;
  float strung = stringOf(n);
  if (strung > 0.0) {
    float bead = smoothstep(0.42, 0.64, vnoise(q / 2.6 + 71.0) * 0.8 + vnoise(q / 0.9 + 13.0) * 0.2);
    float beaded = min(max(reach * mix(0.2, 1.3, bead), 0.08), 1.4);
    float inPool = stringPools(q);
    if (inPool > 0.0) beaded = max(beaded, n.r + tornAt(q) * smoothstep(0.0, 0.3, n.a) + inPool);
    beaded = mix(reach, beaded, strung);
    // The glow map keeps the seam's power: what the string takes from its width it gives back in brightness.
    gWas *= reach / max(beaded, 1e-3);
    reach = beaded;
  }
  return vec2(reach * mix(widen, 1.0, max(shown, byPool)), smoothstep(0.46, 0.84, u));
}

// Signed metres from a point of the crust to the brim of the nearest gap: negative in the gap. n is netAt(q), untouched.
// The crust cuts its wall where this is zero and the melt's skin clings there: both read this one function.
float bankAt(vec2 q, vec4 n) {
  return n.r + tornAt(q) * smoothstep(0.0, 0.3, n.a) - gapeAt(q, n).x;
}

// The height of the melt in the gap of a seam the pictures show, metres (the brim is zero). One level for a seam, so the liquid
// lies level. The channel at the line and its fingers lie in a trench, 0.3 m down: the near bank hides the near edge of the melt
// and the far bank stands over it as a wall. The other gaps are nearly full: the long seam of the group at 0.045 m, the narrow
// near seams highest (0.08 m), the fountain lines at 0.2 m.
float meltLevel(vec4 n) {
  float c = n.g - 2.0;
  float level = mix(mix(mix(0.3, 0.1, smoothstep(0.01, 0.04, c)), 0.08, smoothstep(0.0, 0.2, c)), 0.2, step(1.3, c));
  // The pools of the string stand brimful: a long lens five degrees over the crust sees into them.
  return -mix(level, 0.045, smoothstep(0.06, 0.075, c) * (1.0 - smoothstep(0.105, 0.115, c)));
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
  // The picture shows a warm wash for about the width of the channel and little more, and a wall that glows dimly, not a lamp:
  // most of what the melt sends up is taken by the air and the skin on it.
  // Level crust more than three metres from a gap gets nothing.
  float reach = exp(-max(off, 0.0) / (0.5 + 0.6 * w)) * (1.0 - smoothstep(1.5, 3.0, off));
  // The bank is a thin dark lip with a hair of orange at its foot: the direct light dies a hand above the melt.
  float foot = smoothstep(-0.15, 0.0, y - level) * exp(-max(y - level, 0.0) / 0.05);
  return blackbody(meltKelvin(q, n)) * (3.14159 * uCast * wide * reach * (0.3 * direct * foot + 0.2 * air * smoothstep(0.3, 0.8, nrm.y)));
}

#ifdef LAKE_LIP
// How much of the melt in a gap the lens sees over the gap's near bank. The melt lies below the brim, so a gap of width wide whose
// melt lies deep below it shows only when the line of sight is steeper than deep / wide: from a low lens across the lake a far
// seam is dark, and what is left is short lights where the melt stands nearly to the brim, where a gap is wide, and where a seam
// runs along the line of sight (across: the cosine between the sight line and the way across the gap). From high up all of it shows.
float seenOver(vec2 q, float wide, float deep, float across) {
  vec3 toEye = cameraPosition - vec3(q.x, 0.0, q.y);
  float rise = toEye.y / max(length(toEye), 1.0);
  float lies = deep * (0.3 + 1.5 * vnoise(q / 6.3 + 17.0));
  return smoothstep(0.4, 1.2, rise * wide / max(lies * max(across, 0.15), 1e-4));
}
#endif

// The open lake is large plates of crust that ride the melt, each with a way and a turn of its own on top of the lake's drift.
// A plate is the crust nearest its middle, so no two lap or part: where two pull apart new skin grows between them and the
// seam stands open and bright from end to end, where they close on each other it is shut and dark. So the bright seams are
// few, long, and joined, and they move as the plates do. Leaves: gPlateEdge (metres to the nearest seam), gPlateHalf (half
// the width of the melt that shows there, metres), gPlateAcross (unit, across that seam), gPlateShift (add it to a point to
// read what its plate carries: the paint rides the plate), gPlateId.
const float PLATE = 64.0;
float gPlateEdge = 1e3;
float gPlateHalf = 0.0;
vec2 gPlateAcross = vec2(1.0, 0.0);
vec2 gPlateShift = vec2(0.0);
float gPlateId = 0.0;
// moves: 1 where the plates are free, 0 where things stand on the crust.
void plateAt(vec2 q, float moves) {
  // A seam is crooked at every size.
  vec2 p = q + 18.0 * (vec2(vnoise(q / 41.0 + 3.0), vnoise(q / 41.0 + 13.0)) - 0.5) + 5.0 * (vec2(vnoise(q / 9.1 + 5.0), vnoise(q / 9.1 + 15.0)) - 0.5);
  // Time as the plates count it: none strays more than a third of its own width in the whole of the film's stay.
  float dt = 22.0 * tanh((uTime - uFlowT0) / 22.0) * moves;
  vec2 base = floor(p / PLATE);
  vec2 at[9];
  vec2 vel[9];
  float best = 1e12;
  int bi = 4;
  for (int n = 0; n < 9; n++) {
    vec2 c = base + vec2(float(n - 3 * (n / 3)), float(n / 3)) - 1.0;
    vec2 h = hash22(c + 17.0);
    vec2 k = hash22(c + 71.0);
    vec2 rest = (c + 0.5 + 0.56 * (h - 0.5)) * PLATE;
    // The melt under the crust turns in slow cells a few plates wide; a plate goes with the cell under it, more or less.
    float way = 6.2832 * vnoise(rest / 330.0 + 9.0) + 1.2 * (k.x - 0.5);
    vel[n] = (0.3 + 0.6 * k.y) * vec2(cos(way), sin(way));
    at[n] = rest + vel[n] * dt;
    vec2 r = at[n] - p;
    float d = dot(r, r);
    if (d < best) {
      best = d;
      bi = n;
    }
  }
  vec2 mine = at[bi];
  float edge = 1e3;
  int oi = bi;
  for (int n = 0; n < 9; n++) {
    if (n == bi) continue;
    vec2 r = at[n] - p;
    float e = (dot(r, r) - best) / (2.0 * length(at[n] - mine));
    if (e < edge) {
      edge = e;
      oi = n;
    }
  }
  gPlateEdge = edge;
  gPlateAcross = normalize(at[oi] - mine);
  float parting = dot(vel[oi] - vel[bi], gPlateAcross);
  float slide = abs(dot(vel[oi] - vel[bi], vec2(gPlateAcross.y, -gPlateAcross.x)));
  // Wide where two plates part fast, a hot hairline where one slides past the other, nothing where they close.
  gPlateHalf = (0.05 + 0.4 * smoothstep(0.12, 0.6, parting)) * smoothstep(0.04, 0.16, parting) * (0.7 + 0.6 * vnoise(p / 37.0 + 21.0)) + 0.025 * smoothstep(0.25, 0.6, slide);
  vec2 cell = base + vec2(float(bi - 3 * (bi / 3)), float(bi / 3));
  gPlateId = hash12(cell + 3.7);
  float turned = 0.016 * (gPlateId - 0.5) * dt;
  vec2 arm = p - mine;
  gPlateShift = vec2(cos(turned) * arm.x + sin(turned) * arm.y, cos(turned) * arm.y - sin(turned) * arm.x) - arm - vel[bi] * dt;
}
// Where the lake is plates of that kind (0 to 1): away from the rock, from the seams the pictures show, from the pool at the
// foot of the fall and from the ground the near cameras look down on, where a seam must be cut into the relief.
float plateZone(vec2 q, float lake, vec4 n) {
  vec2 pr = (q - uPool.xy) * uPool.zw;
  return smoothstep(20.0, 45.0, lake) * smoothstep(2.4, 3.6, length(pr)) * smoothstep(uSunk.z + 20.0, uSunk.z + 50.0, length(q - uSunk.xy))
    * smoothstep(14.0, 30.0, length(q - vec2(-404.9, 204.0))) * smoothstep(45.0, 75.0, length(q - vec2(-505.0, 245.0)))
    * mix(1.0, smoothstep(8.0, 22.0, n.r), step(1.5, n.g));
}

// x: how much of the place is open lava, 0 to 1. y: kelvin of the lava that shows. z: metres to the edge of the nearest gap that
// is or was open (negative inside it). w: how young the skin is, 1 beside a living seam, 0 on an old plate.
// lake is metres from the rock, n is netAt(q), least is a floor on the width a gap is drawn at (zero for the surface, a texel for the glow map).
vec4 heatAt(vec2 q, float lake, vec4 n, float least) {
  float d = n.r;
  float shown = step(1.5, n.g);
  // The glow map keeps the beat of the lake, so its sum is what it was; the drawn surface creeps and crusts.
  float beat = least > 0.5 ? beatAt(q) : creepAt(q);
  float pace = least > 0.5 ? 1.0 : 2.6;
  // The drawn surface alone surges; the glow map does not know of it.
  float drawnOnly = least > 0.5 ? 0.0 : 1.0;
  float surge = surgeAt(q);
  // Where the surge is low a reach of the web skins over and goes dark; where it is high its seams gape and flare.
  float flare = smoothstep(0.22, 0.78, surge);
  float swell = mix(1.0, mix(0.15, 1.85, flare), drawnOnly);
  float flared = mix(1.0, mix(0.1, 1.0, flare), drawnOnly);
  // Out on the lake, far from every route, the picture has few seams: long, broken, of unlike brightness, with wide dark crust
  // between them. Of the web's seams less than half the reaches are drawn live there, and those in pieces. The glow map keeps all.
  float outThere = smoothstep(70.0, 170.0, length(q - vec2(-505.0, 245.0))) * drawnOnly;
  float pieces = smoothstep(0.3, 0.5, vnoise(q / 27.0 + 40.0));
  float sparse = mix(1.0, smoothstep(0.47, 0.62, vnoise(q / 90.0 + 17.0)) * pieces, outThere);
  float unlike = outThere * 150.0 * (vnoise(q / 41.0 + 60.0) - 0.5);
  vec2 pr = (q - uPool.xy) * uPool.zw;
  float pool = length(pr) + 0.34 * (vnoise(q / 13.0 + 2.0) - 0.5) + 0.12 * (vnoise(q / 3.1) - 0.5);
  float byPool = 1.0 - smoothstep(1.0, 2.7, pool);
  float plain = smoothstep(uSunk.z - 1.0, uSunk.z + 5.0, length(q - uSunk.xy));

  vec2 life = gapeAt(q, n);
  float gape = life.x;
  float skin = life.y;
  float was = gWas;
  float hotHalf = gape * mix(1.0 - 0.8 * skin, 1.0, max(shown, byPool));
  // A plate edge of the web flares and dims: its gap of bare melt widens as the heat comes through and skins over behind it.
  hotHalf *= mix(swell * sparse, 1.0, max(shown, byPool));
  // Out on the lake the seams are those between the plates, and the web's own are shut there.
  float zone = plateZone(q, lake, n) * plain;
  float farD = 1e3;
  float farHalf = 0.0;
  float farMeet = 0.0;
  vec2 farAcross = vec2(1.0, 0.0);
  gPlateShift = vec2(0.0);
  if (zone > 0.0) {
    // Where the group feeds, the plates lie still under its feet.
    plateAt(q, zone * smoothstep(60.0, 110.0, length(q - vec2(-404.9, 204.0))));
    farD = gPlateEdge;
    farAcross = gPlateAcross;
    // The glow map keeps the light the lake gave: the web's seams stay in it, and the plates' go in wider than they are drawn.
    farHalf = gPlateHalf * zone * mix(4.0, 1.0, drawnOnly);
    hotHalf *= mix(1.0, 1.0 - zone * drawnOnly, 1.0 - shown);
  }
  // A seam is brighter where it is wide, and a few are fully open. Hot spots come and go along it, slowly.
  float fully = smoothstep(0.72, 0.9, fract(n.g * 7.13 + 0.37));
  float stirred = step(3.3, n.g);
  float core = mix(1250.0 + 110.0 * smoothstep(0.06, 0.4, hotHalf) + 70.0 * fully, mix(1190.0, 1400.0 - 300.0 * clamp(n.g - 2.0, 0.0, 1.0) * (1.0 - stirred), max(smoothstep(0.12, 0.25, hotHalf), stirred)), shown);
  // Where the line is too narrow for the crust to cut it down to the melt, this sheet draws it: skinned over, dark red, not a slab of orange.
  core = mix(core, 1085.0, shown * (1.0 - smoothstep(0.01, 0.04, n.g - 2.0)) * (1.0 - smoothstep(0.26, 0.34, hotHalf)));
  float spot = vnoise(q / 5.3 + vec2(uTime * 0.05 * pace, 2.0)) * 0.7 + vnoise(q / 1.9 + vec2(3.0, uTime * 0.09 * pace)) * 0.3;
  core -= mix(150.0, 110.0, shown) * smoothstep(0.6, 0.4, spot);
  core += 70.0 * (vnoise(q * 0.6 + vec2(uTime * 0.07, 0.0)) - 0.5) + 80.0 * (beat - 0.5) - 70.0 * skin * (1.0 - shown) + drawnOnly * mix(170.0, 110.0, shown) * (surge - 0.5) + unlike * (1.0 - shown);
  float drawn = drawAt(q);
  core += drawnOnly * stringOf(n) * 130.0 * (drawn - 0.5);
  gLip = vec3(0.0);
  gIsle = 0.0;
  float seenFloor = least > 0.5 ? 0.0 : 1.0;
  gFloor = 0.45 * smoothstep(0.03, 0.15, hotHalf) * (1.0 - shown) * seenFloor;
  vec2 g = gapHeat(d, hotHalf, core, least);
  gFloor = 0.0;
  // From far a seam the pictures show flares and dims along its length too; seen close its melt is the lava's own mesh.
  g.x *= mix(flared, mix(1.0, mix(0.4, 1.0, flare), drawnOnly * smoothstep(0.04, 0.12, gFoot)), shown);
#ifdef LAKE_LIP
  // The fountains stand above their brim and are seen from anywhere.
  float sight = mix(seenOver(q, 2.0 * hotHalf, mix(0.04, -meltLevel(n), shown), 1.0), 1.0, stirred);
  // The narrow cracks that join the pools of the feeding seam glow along their far wall, which stands in sight.
  sight = max(sight, 0.85 * stringOf(n) * (1.0 - smoothstep(0.1, 0.2, hotHalf)));
  g.x *= sight;
  // The lip of a hidden gap still shows a little of the glow on it.
  gLip *= 0.3 + 0.7 * sight;
#endif
  if (farHalf > 0.0) {
    float hotSpot = vnoise(q / 9.0 + vec2(uTime * 0.04, 6.0));
    gFloor = (0.2 + 0.3 * smoothstep(0.1, 0.6, farHalf)) * seenFloor;
    vec2 f = gapHeat(farD, farHalf, 1320.0 + 80.0 * smoothstep(0.15, 0.9, farHalf) + 60.0 * farMeet + 90.0 * (hotSpot - 0.5) + 50.0 * (beat - 0.5) + drawnOnly * 190.0 * (surge - 0.5) + unlike, least);
#ifdef LAKE_LIP
    vec2 sightLine = q - cameraPosition.xz;
    // How far the melt lies under its brim changes over tens of metres, not every few: seen from low a seam shows in long
    // reaches and is hidden in long reaches, never in dashes.
    vec3 farEye = cameraPosition - vec3(q.x, 0.0, q.y);
    float farLies = 0.035 * (0.3 + 1.5 * vnoise(q / 53.0 + 17.0));
    float farSight = smoothstep(0.4, 1.2, (farEye.y / max(length(farEye), 1.0)) * 2.0 * farHalf / max(farLies * max(abs(dot(farAcross, sightLine / max(length(sightLine), 1.0))), 0.15), 1e-4));
    // A seam between plates is brimful, a hand under its crust: seen from low across it the near edge hides most of it,
    // and what is left is a dull line, not a bar.
    farSight = max(farSight, 0.25);
    f.x *= farSight;
#endif
    f.x *= mix(0.6, 1.0, flare);
    if (f.x > g.x) g = f;
    gFloor = 0.0;
#ifdef LAKE_LIP
    // The warm halo on the crust beside a far seam.
    float beside = max(farD - farHalf, 0.0);
    gLip += blackbody(1300.0) * ((0.3 + 0.7 * farSight) * 3.0 * farHalf / (farHalf + 0.4 * beside + 0.01) * exp(-beside / (0.4 + 1.5 * gFoot)));
    // And the crust is warm for a metre or two beside it: the thin new skin there is hot from below.
    gLip += blackbody(1180.0) * (0.9 * farHalf / (farHalf + 0.08) * exp(-beside / (1.8 + 2.0 * gFoot)));
#endif
  }
#ifdef LAKE_LIP
  // Round the seam the walkers feed at the crust is crazed: short hairline cracks within five metres of it glow dull red.
  float crazed = stringOf(n) * (1.0 - smoothstep(2.5, 5.5, n.r));
  if (crazed > 0.0) {
    vec2 w = q + 0.8 * vec2(vnoise(q / 1.3 + 3.0), vnoise(q / 1.3 + 13.0));
    float f = vnoise(w / 2.1 + 57.0);
    vec2 gr = vec2(vnoise((w + vec2(0.15, 0.0)) / 2.1 + 57.0), vnoise((w + vec2(0.0, 0.15)) / 2.1 + 57.0)) - f;
    float dh = abs(f - 0.5) * 0.15 / max(length(gr), 0.004);
    // They open and close slowly: the field that chooses them drifts, and the pulse of the seam widens them as it passes.
    float lane = smoothstep(0.52, 0.68, vnoise(q / 1.7 + 9.0 + vec2(uTime * 0.11, -uTime * 0.08)) + 0.16 * (drawn - 0.5)) * crazed;
    vec3 lipWas = gLip;
    // Off the pool under the tuft they are wider and brighter for a few metres.
    float byHero = 1.0 - smoothstep(2.0, 6.0, length(q - vec2(-404.9, 204.0)));
    vec2 hair = gapHeat(dh, (0.014 + 0.02 * byHero) * lane * mix(0.55, 1.5, drawn), 1070.0 + 120.0 * byHero + 70.0 * vnoise(q / 0.8 + 2.0) + 120.0 * (drawn - 0.5), least);
    gLip = lipWas;
    if (hair.x > g.x) g = hair;
  }
#endif
  // The glow map lights feet, legs, ground and air beside a seam the pictures show: there the melt goes in at its true width
  // and at the mean heat of the open melt, not at the heat of its skin. A seam narrower than a texel keeps its power.
  if (least > 0.5 && shown > 0.5) {
    // Most of a channel is dark skin: the map carries the share of it that shows bright, more at the seams the walkers have torn open to feed.
    float c = n.g - 2.0;
    float feeding = smoothstep(0.04, 0.07, c) * (1.0 - step(1.3, c));
    // The line is drawn narrower than the net has it: its share rises by as much, and the map's energy is what it was.
    float bright = mix(0.07 + 0.13 * max(smoothstep(0.4, 0.7, gape * was), stirred), 0.22, feeding) * was;
    g = vec2(gapHeat(d, gape, core, least).x * bright, clamp(meltKelvin(q, n), 1320.0, 1400.0));
    gLip = vec3(0.0);
  }
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
    // Read at the level the footprint asks for, by hand: inside a branch the sampler's own choice of level is not defined.
    float t = sqrt(textureLod(tRope, run / 2.3, log2(max(gFoot * (1024.0 / 2.3), 1.0))).g);
    float t2 = sqrt(textureLod(tRope, vec2(run.y, -run.x) / 4.7 + 0.37, log2(max(gFoot * (1024.0 / 4.7), 1.0))).g);
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
    // Seen close, the melt of a seam the pictures show is the lava's own mesh, down in its trench: the crust's wall over it is
    // rock, lit by the melt and not molten. Seen from far, where the trench is less than a few pixels, this sheet draws the seam.
    g.x *= 1.0 - shown * smoothstep(0.2, 0.3, hotHalf) * (1.0 - smoothstep(0.04, 0.12, gFoot));
  }
#endif

  // The margin: the skin is torn from the rock along a crooked line, and a thin glow shows in the tear.
  float tear = 0.5 + 1.3 * vnoise(q / 4.3 + 9.0);
  float tearHalf = 0.22 * smoothstep(0.42, 0.78, vnoise(q / 17.0 + 21.0)) * smoothstep(0.25, 0.6, vnoise(q / 2.1 + 5.0));
  vec2 m = gapHeat(abs(lake - tear), tearHalf, 1150.0 + 130.0 * vnoise(q / 6.3 + 1.7) + 60.0 * (beat - 0.5), least);
#ifdef LAKE_LIP
  m.x *= seenOver(q, 2.0 * tearHalf, 0.04, 1.0);
#endif
  if (m.x > g.x) g = m;
  float edge = min(d - gape, abs(lake - tear) - tearHalf);

  // The pool at the foot of the fall: open lava that skins over outward, in rafts that ride away from the fall.
  // As drawn the rafts ride out at 3.8 m a second, so that the pool is seen to move from the rim of the bowl; the glow map keeps 1.5.
  float open = 1.0 - smoothstep(0.55, 1.02, pool);
  if (open > 0.0) {
    vec2 out2 = q - uFlowFoot;
    float ring = length(out2);
    vec2 polar = vec2(atan(out2.y, out2.x) * 9.0, ring / 7.0 - uTime * (least > 0.5 ? 0.22 : 0.55));
    float raft = smoothstep(0.42, 0.7, vnoise(polar) * 0.6 + vnoise(polar * 2.7 + 5.0) * 0.4 + 0.45 * (pool - 0.6));
    float k = 1440.0 - 150.0 * pool - 230.0 * raft + 50.0 * (beat - 0.5) + 40.0 * (vnoise(polar * 6.0) - 0.5);
    float c = open * (1.0 - 0.75 * raft * smoothstep(0.3, 0.8, pool));
    // In the glow map the pool carries the share of it that is bare: the fume over it is lit from this.
    if (least > 0.5) c *= 0.4;
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
