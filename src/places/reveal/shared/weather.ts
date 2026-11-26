// The cloud as one field of the world, so that the surface that takes its shade and the sheets that draw it read the same cloud.
// Where the weather stands comes from sky/cover.png (assets-src/reveal/sky/make_cover.py); what it looks like comes from the Builder's
// photographs of cloud from orbit (public/assets/reveal/mat). Lengths are kilometres, the drift is a pure function of the time.
import { AT, KM, X, Z } from './anchors';

/** The rectangle of the world the picture of the cover lies on: x and z of its corner, one over its width and its height. */
export const COVER_RECT: [number, number, number, number] = [X(-900), Z(-820), 1 / (8500 * KM), 1 / (((8500 * 9) / 16) * KM)];
/** Height over the sea, km: the low field of small cloud, the fronts, the veil of ice. */
export const LOW_KM = 2.6;
export const HIGH_KM = 10.5;
/** Km a second: staged far faster than weather, so the held frame is seen to live. */
export const LOW_DRIFT: [number, number] = [5.4, 1.5];

const f = (n: number): string => n.toFixed(4);

export const WEATHER_GLSL = /* glsl */ `
uniform sampler2D uCloudTile;
uniform sampler2D uCover;
uniform sampler2D uMatPopcorn;
uniform sampler2D uMatStreaks;
uniform sampler2D uMatSpecks;
uniform sampler2D uMatVeil;
uniform sampler2D uMatCellsNh;
uniform sampler2D uMatPopcornNh;
uniform sampler2D uMatSpecksNh;
uniform sampler2D uMatStreaksNh;
uniform sampler2D uMatVeilNh;
uniform vec4 uCoverRect;

const vec2 LOW_DRIFT = vec2(${f(LOW_DRIFT[0])}, ${f(LOW_DRIFT[1])});

vec3 coverAt(vec2 xz) {
  return texture2D(uCover, clamp((xz - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0)).rgb;
}

// The open sea west and south of the skull, where the map's low islands lie under the water: 0 on the body's side, 1 well out.
float westSea(vec2 xz) {
  vec2 fromSkull = (xz - vec2(${f(X(1350))}, ${f(Z(1566))})) / vec2(${f(330 * KM)}, ${f(270 * KM)});
  // (Its edge runs south from the skull and then south east, along the outside of the arm.)
  float limit = ${f(X(1700))} + 0.6 * max(xz.y - ${f(Z(1700))}, 0.0);
  return smoothstep(1.08, 1.6, length(fromSkull)) * (1.0 - smoothstep(limit - 130.0, limit + 130.0, xz.x));
}

// One read of the relief of a cloud photograph (mat/*-nh.png: red and green the slope of its tops, blue their height), laid at
// km a repeat and turned by m. xy: the way the tops fall, in the world's x and z. z: how high they stand, 0 to 1.
vec3 cloudRelief(sampler2D t, vec2 w, mat2 m, float km, vec2 shift) {
  vec3 c = texture2D(t, m * w / km + shift).rgb;
  return vec3((c.rg * 2.0 - 1.0) * m, c.b);
}

// Set by lowField and highField for the sheet that draws them: the way the tops fall at the point last read.
vec2 lowSlope = vec2(0.0);
vec2 highSlope = vec2(0.0);

// The ground of the low field: the world, read through a slow bend so the streets curve, and drifting.
vec2 lowGround(vec2 at) {
  // (From orbit the drift of the field is seen: it gathers way as the rise ends, and the whole field is carried on while the frame is held.)
  float held = uTime < 8.0 ? 0.125 * max(uTime - 4.0, 0.0) * max(uTime - 4.0, 0.0) : uTime - 6.0;
  vec2 carried = at + 90.0 * vec2(sin(at.y / 610.0 + 1.3 * sin(at.x / 1130.0)), sin(at.x / 870.0 + 1.7 * sin(at.y / 1370.0))) - uTime * LOW_DRIFT - held * vec2(24.0, 8.0);
  // (While the frame is held the wind is seen: the field runs on at a pace the eye can follow from orbit.)
  if (uLive > 0.0) carried -= uWx * vec2(20.0, 7.0);
  return carried;
}

// How much cloud a photograph of a cloud field holds at a point, against its own mean (1 on the mean; the dark sea of the
// photograph is near 0, its brightest tops 2.5 to 3.5). A lay finer than a pixel falls to 1 by itself.
float cloudIn(sampler2D t, vec2 uv, float mean) {
  return dot(texture2D(t, uv).rgb, vec3(0.3, 0.55, 0.15)) / mean;
}

// Where the five lays of the low field were last read, and how much of the field each one made there (set by lowDepth).
vec2 lowUvA = vec2(0.0);
vec2 lowUvB = vec2(0.0);
vec2 lowUvC = vec2(0.0);
vec2 lowUvD = vec2(0.0);
vec2 lowUvE = vec2(0.0);
vec3 lowWeigh = vec3(0.0);

const mat2 LOW_A = mat2(0.97, -0.24, 0.24, 0.97);
const mat2 LOW_B = mat2(0.8, 0.6, -0.6, 0.8);
const mat2 LOW_C = mat2(0.28, 0.96, -0.96, 0.28);
const mat2 LOW_D = mat2(-0.6, 0.8, -0.8, -0.6);
const mat2 LOW_E = mat2(0.71, -0.7, 0.7, 0.71);

// The low cloud as the light meets it: how much water stands in the way (0 where the sea is clear, about 1 in the thin body of a
// streak, 3 and more in the core of a cluster). The cloud is the photographs' own: wind streaks (1100 by 640 km a repeat) say where
// cloud lies at all, and inside them a field of cumulus clusters (500 km), the puffs of a cluster (210 km), the lumps of a puff
// (90 km) and its grain (30 km) each thin it or thicken it. The photographs are multiplied, never cut at a level: a streak thins
// out to nothing through its own veil, and a cluster keeps the thin body the photograph shows round it.
float lowDepth(vec2 at) {
  vec2 w = lowGround(at);
  // The sky stands clear over the lake of the Eye, where the rise begins.
  float amount = max(coverAt(at).g, 0.6 * westSea(at)) * smoothstep(100.0, 230.0, length(at - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))})));
  // (Where it is thick and where torn is carried by winds of its own, a little off the wind of the field: the banks change as they go.)
  vec2 wSlow = w;
  vec2 wLane = w;
  vec2 wCell = w;
  vec2 wPuff = w;
  if (uLive > 0.0) {
    wSlow += uWx * vec2(-3.0, 4.0);
    wLane += uWx * vec2(3.0, -5.0);
    // (And the clusters in a streak and the puffs in a cluster ride winds a little off each other: a bank is seen to work, not to slide as a card.)
    wCell += uWx * vec2(2.2, -3.0);
    wPuff += uWx * vec2(-1.6, 2.4);
  }
  float torn = texture2D(uCloudTile, wSlow / 1100.0 + vec2(0.7, 0.2), 3.5).b;
  float slow = 0.6 * texture2D(uCloudTile, w / 2900.0 + vec2(0.15, 0.55), 4.0).b + 0.4 * torn;
  float lane = texture2D(uCloudTile, LOW_A * wLane / vec2(4200.0, 1150.0) + vec2(0.52, 0.18), 2.0).b;
  float banked = 0.25 + 0.75 * smoothstep(0.3, 0.52, lane);
  if (uLive > 0.0) banked = mix(banked, (0.05 + 1.1 * smoothstep(0.34, 0.6, lane)) * (0.1 + 1.3 * smoothstep(0.36, 0.62, torn)), 0.3 * smoothstep(0.0, 14.0, uWx));
  float share = amount * (0.12 + 0.88 * smoothstep(0.3, 0.66, slow + 0.2 * (amount - 0.6))) * banked * (0.45 + 0.55 * smoothstep(0.12, 0.45, limbCos(at)));

  lowUvA = LOW_A * wLane / vec2(1100.0, 640.0) + vec2(0.3, 0.7);
  lowUvB = LOW_B * wCell / 500.0 + vec2(0.13, 0.4);
  lowUvC = LOW_C * wPuff / 210.0 + vec2(0.61, 0.27);
  lowUvD = LOW_D * wCell / 90.0 + vec2(0.83, 0.52);
  lowUvE = LOW_E * w / 30.0 + vec2(0.37, 0.91);
  float streak = cloudIn(uMatStreaks, lowUvA, 0.31);
  float cluster = cloudIn(uMatPopcorn, lowUvB, 0.34);
  float puff = cloudIn(uMatSpecks, lowUvC, 0.2);
  float lump = cloudIn(uMatPopcorn, lowUvD, 0.34);
  float grain = cloudIn(uMatSpecks, lowUvE, 0.2);
  // (A field is not one kind of cloud: here it is all fine specks along the wind, there the clusters have grown.)
  float grown = smoothstep(0.35, 0.65, texture2D(uCloudTile, w / 1700.0 + vec2(0.44, 0.08), 3.0).b);
  float byCluster = mix(0.45, 1.0, grown);
  float byPuff = mix(0.9, 0.5, grown);
  float knots = mix(1.0, cluster, byCluster) * mix(1.0, puff, byPuff);
  float fine = mix(1.0, lump, 0.55) * mix(1.0, grain, 0.4);
  lowWeigh = vec3(byCluster, byPuff, share);
  // (The streak is the thin body; the clusters stand in it, and a little beside it.)
  return pow(streak * knots * fine, 0.6) * share * 1.5 - mix(0.72, 0.48, share);
}

// The low cloud: x how thick it is to the eye (0 to 1), y how high its tops stand there (0 to 1). The thin of it lets the sea
// through as water lets light through (the law of Beer), so nothing has a cut edge.
vec2 lowField(vec2 at) {
  float depth = lowDepth(at);
  vec3 a = texture2D(uMatStreaksNh, lowUvA).rgb;
  vec3 b = texture2D(uMatPopcornNh, lowUvB).rgb;
  vec3 c = texture2D(uMatSpecksNh, lowUvC).rgb;
  vec3 d = texture2D(uMatPopcornNh, lowUvD).rgb;
  vec3 e = texture2D(uMatSpecksNh, lowUvE).rgb;
  lowSlope = 0.3 * ((a.rg * 2.0 - 1.0) * vec2(1.0, 1.5)) * LOW_A + 0.75 * lowWeigh.x * (b.rg * 2.0 - 1.0) * LOW_B + 0.75 * lowWeigh.y * (c.rg * 2.0 - 1.0) * LOW_C
    + 0.6 * (d.rg * 2.0 - 1.0) * LOW_D + 0.45 * (e.rg * 2.0 - 1.0) * LOW_E;
  float thick = 1.0 - exp(-1.3 * max(depth, 0.0));
  return vec2(thick, clamp(depth / 3.5, 0.0, 1.0));
}

// The ice far above (HIGH_KM): thin fibrous sheets and long threads drawn out along its own wind, which blows across the wind of
// the low field. at is a point of its own height. How thick, 0 to 1. It is the photograph of a veil of cirrus, thinned and
// thickened by a finer lay of wind streaks, and it fades to nothing through its own fibre.
vec2 highUvSheet = vec2(0.0);
vec2 highUvThread = vec2(0.0);
// The ice without the fall of its tops (what a shadow needs).
float highDepth(vec2 at) {
  vec2 hv = at + uTime * vec2(6.5, -3.8);
  vec2 hs = hv;
  if (uLive > 0.0) {
    hv += uWx * vec2(36.0, -21.0);
    hs += uWx * vec2(44.0, -16.0);
  }
  highUvSheet = mat2(0.9, 0.44, -0.44, 0.9) * hv / 1900.0 + vec2(0.2, 0.6);
  highUvThread = mat2(0.84, 0.54, -0.54, 0.84) * hs / vec2(1000.0, 600.0) + vec2(0.7, 0.2);
  float sheet = cloudIn(uMatVeil, highUvSheet, 0.27);
  float thread = cloudIn(uMatStreaks, highUvThread, 0.31);
  float where = smoothstep(0.5, 0.85, 0.6 * vnoise(hv / 1500.0 + 3.0) + 0.4 * vnoise(hv / 640.0 + 11.0));
  float depth = sheet * mix(1.0, thread, 0.8) * where * 1.7 - 0.8;
  return (1.0 - exp(-1.1 * max(depth, 0.0))) * smoothstep(300.0, 1100.0, length(at - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))})));
}

float highField(vec2 at) {
  float thick = highDepth(at);
  highSlope = 0.6 * (texture2D(uMatVeilNh, highUvSheet).rg * 2.0 - 1.0) * mat2(0.9, 0.44, -0.44, 0.9) + 0.8 * (texture2D(uMatStreaksNh, highUvThread).rg * 2.0 - 1.0) * mat2(0.84, 0.54, -0.54, 0.84);
  return thick;
}

// The share of the sun that reaches a point of the ground under the cloud. Each height of cloud throws its own shadow, as far from
// itself as it stands high, so the shadow of the ice lies well off the shadow of the puffs under it.
float cloudShade(vec2 xz) {
  vec2 toSun = uSunDir.xz / max(uSunDir.y, 0.2);
  // From orbit the shadows are drawn longer than they fall, as relief is on a map, so that each height of cloud is seen to stand off the sea.
  float lift = mix(1.0, 3.0, smoothstep(150.0, 700.0, uViewKm));
  float low = 1.0 - exp(-1.3 * max(lowDepth(xz + toSun * ${LOW_KM.toFixed(1)} * lift), 0.0));
  float high = highDepth(xz + toSun * ${HIGH_KM.toFixed(1)} * lift);
  float standing = coverAt(xz + toSun * 6.5 * lift).b;
  // The cyclone shades the sea: a soft shadow, thrown well away from the sun.
  float fromStorm = length(xz + toSun * 110.0 - vec2(${f(X(AT.cyclone.x))}, ${f(Z(AT.cyclone.y))})) / ${f(1250 * KM)};
  float stormShade = pow(1.0 - smoothstep(0.02, 0.48, fromStorm), 1.3) * uArrive;
  return (1.0 - mix(0.55, 0.78, smoothstep(300.0, 900.0, uViewKm)) * smoothstep(0.04, 0.6, low)) * (1.0 - 0.22 * high * uArrive) * (1.0 - 0.16 * standing * uArrive) * (1.0 - 0.13 * stormShade);
}`;
