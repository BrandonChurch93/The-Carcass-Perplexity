// The cloud as one field of the world, so that the surface that takes its shade and the sheets that draw it read the same cloud.
// Where the weather stands comes from sky/cover.png (assets-src/reveal/sky/make_cover.py); what it looks like comes from the Builder's
// photographs of cloud from orbit (public/assets/reveal/mat). Lengths are kilometres, the drift is a pure function of the time.
import { AT, KM, X, Z } from './anchors';

/** The rectangle of the world the picture of the cover lies on: x and z of its corner, one over its width and its height. */
export const COVER_RECT: [number, number, number, number] = [X(-900), Z(-820), 1 / (8500 * KM), 1 / (((8500 * 9) / 16) * KM)];
/** Height over the sea, km: the low field of small cloud, the fronts, the veil of ice. */
export const LOW_KM = 2.6;
export const HIGH_KM = 10.5;
/** The banks a range holds on the flank that faces the wind, and the fog on the floors between ranges. */
export const BANK_KM = 5.0;
export const FOG_KM = 0.7;
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
uniform sampler2D uBanks;
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
// The image of the sun on the sea, 0 to 1 (the land draws it: the same place, the same slide). Over it the sky stands open: the
// sheet of light is seen on open water, and what cloud is left there is seen against it.
float sunImage(vec2 xz) {
  vec2 from = xz - vec2(${f(X(5875))}, ${f(Z(703))}) - (uTime - 8.1) * vec2(-9.0, -8.0);
  if (uDusk > 0.0) from -= uCalm.y * normalize(uSunDir.xz);
  if (uLive > 0.0) from -= uLive * vec2(-20.0, 0.0);
  from *= vec2(1.0, 0.48);
  return exp(-pow(dot(from, from) / 55000.0, 0.463));
}

// The wind round the cyclone: the field is drawn round its eye, most near it and less with every thousand kilometres, so the
// streaks of the low field curve into its arms.
vec2 roundStorm(vec2 at) {
  vec2 from = at - vec2(${f(X(AT.cyclone.x))}, ${f(Z(AT.cyclone.y))});
  float turned = 1.1 * exp(-length(from) / ${f(1100 * KM)});
  return vec2(${f(X(AT.cyclone.x))}, ${f(Z(AT.cyclone.y))}) + mat2(cos(turned), sin(turned), -sin(turned), cos(turned)) * from;
}

vec2 lowGround(vec2 at) {
  at = roundStorm(at);
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
vec2 lowNear = vec2(0.0);

const mat2 LOW_A = mat2(0.97, -0.24, 0.24, 0.97);
const mat2 LOW_B = mat2(0.8, 0.6, -0.6, 0.8);
const mat2 LOW_C = mat2(0.28, 0.96, -0.96, 0.28);
const mat2 LOW_D = mat2(-0.6, 0.8, -0.8, -0.6);
const mat2 LOW_E = mat2(0.71, -0.7, 0.7, 0.71);

// The low cloud as the light meets it: how much water stands in the way (0 where the sea is clear, about 1 in the thin body of a
// streak, 3 and more in the core of a cluster). The cloud is the photographs' own: wind streaks (820 by 470 km a repeat) say where
// cloud lies at all, and inside them a field of cumulus clusters (340 km), the puffs of a cluster (150 km), the lumps of a puff
// (64 km) and its grain (22 km) each thin it or thicken it. The photographs are multiplied, never cut at a level: a streak thins
// out to nothing through its own veil, and a cluster keeps the thin body the photograph shows round it.
float lowDepth(vec2 at) {
  vec2 w = lowGround(at);
  // The sky stands clear over the lake of the Eye, where the rise begins.
  float amount = max(coverAt(at).g, 0.6 * westSea(at)) * smoothstep(100.0, 230.0, length(at - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))})));
  // (Held, the weather is seen to pass: where cloud stands at all is carried by the wind too. The painted cover, which stands on
  // the ground, gives way through the hold to systems that travel, and only its wide clearing over the land and round the
  // cyclone stays where it is.)
  if (uLive > 0.0) {
    float open = smoothstep(0.12, 0.4, texture2D(uCover, clamp((at - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0), 5.0).g);
    float travels = texture2D(uCloudTile, mat2(0.88, 0.47, -0.47, 0.88) * (w + uWx * vec2(6.0, -9.0)) / 3300.0 + vec2(0.37, 0.81), 3.0).b;
    amount = mix(amount, open * (0.2 + 0.8 * smoothstep(0.36, 0.62, travels)) * smoothstep(100.0, 230.0, length(at - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))}))), smoothstep(0.0, 22.0, uWx));
  }
  // (The field runs in under the outer arms of the cyclone: the painted cover leaves a round hole there, wider than the storm.)
  float nearStorm = length(at - vec2(${f(X(AT.cyclone.x))}, ${f(Z(AT.cyclone.y))})) / ${f(1250 * KM)};
  amount = max(amount, 0.75 * smoothstep(0.3, 0.55, nearStorm) * (1.0 - smoothstep(0.7, 1.1, nearStorm)));
  amount *= 1.0 - 0.94 * smoothstep(0.03, 0.3, sunImage(at));
  // (The wind over an ocean does not blow straight: it bends round highs and lows three thousand kilometres across, and the
  // streaks of the field lie along it. The ground the photographs are laid on is bent so, by a field that stands on the planet:
  // the lanes curve, the dashes turn with them, and cloud carried through a bend is seen to turn.)
  vec2 bendAt = at / ${f(KM)};
  w += ${f(KM)} * vec2(
    360.0 * sin(bendAt.y / 1300.0 + 1.3 * sin(bendAt.x / 2300.0) + 0.6) + 100.0 * sin((bendAt.y + 0.5 * bendAt.x) / 520.0 + 2.1),
    520.0 * sin(bendAt.x / 1150.0 + 1.1 * sin(bendAt.y / 1900.0) + 1.9) + 130.0 * sin((bendAt.x - 0.6 * bendAt.y) / 560.0 + 0.4));
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
  vec2 wFlow = wSlow + 380.0 * vec2(sin(wSlow.y / 1250.0 + 0.9 * sin(wSlow.x / 2100.0)), sin(wSlow.x / 1650.0 + 1.3 * sin(wSlow.y / 2600.0)));
  // (From orbit a puff of cumulus must still be wider than a pixel, or the photographs of puffs fall to their mean and only the
  // stretched streak is left to give the field its shape, which then reads as brush strokes at one angle. The clusters and the
  // specks are laid so a puff is five to eight kilometres, two sizes on two winds; the finer lays come in below, as before.)
  lowUvA = LOW_A * wLane / vec2(1050.0, 760.0) + vec2(0.3, 0.7);
  lowUvB = LOW_B * wCell / 540.0 + vec2(0.13, 0.4);
  lowUvC = LOW_C * wPuff / 700.0 + vec2(0.61, 0.27);
  lowUvD = LOW_D * wCell / 64.0 + vec2(0.83, 0.52);
  lowUvE = LOW_E * w / 22.0 + vec2(0.37, 0.91);
  // (Every place a picture is read at is worked out here, before the first way out of this function, in every pixel: a picture
  // is read at the fineness its neighbours' places give, and a neighbour that has left early must still hold a true place. Left
  // unset, one pixel at the edge of a clearing came out a level different from one run to the next.)
  vec2 uvTorn = wSlow / 1100.0 + vec2(0.7, 0.2);
  vec2 uvSlow = w / 2900.0 + vec2(0.15, 0.55);
  vec2 uvLane = LOW_A * wLane / vec2(4200.0, 1150.0) + vec2(0.52, 0.18);
  vec2 uvFlow = mat2(0.92, 0.39, -0.39, 0.92) * wFlow / vec2(4200.0, 1500.0) + vec2(0.62, 0.35);
  vec2 uvGrown = w / 1700.0 + vec2(0.44, 0.08);
  // (Where the sky stands clear nothing more is read: most of the cost of the field is its photographs.)
  lowWeigh = vec3(0.0);
  lowNear = vec2(0.0);
  if (amount <= 0.0) return 0.0;
  // (Where it is thick and where torn is carried by winds of its own, a little off the wind of the field: the banks change as they go.)
  float torn = texture2D(uCloudTile, uvTorn, 3.5).b;
  float slow = 0.6 * texture2D(uCloudTile, uvSlow, 4.0).b + 0.4 * torn;
  float lane = texture2D(uCloudTile, uvLane, 2.0).b;
  float banked = 0.45 + 0.55 * smoothstep(0.3, 0.52, lane);
  if (uLive > 0.0) banked = mix(banked, (0.05 + 1.1 * smoothstep(0.34, 0.6, lane)) * (0.1 + 1.3 * smoothstep(0.36, 0.62, torn)), 0.3 * smoothstep(0.0, 14.0, uWx));
  float share = amount * (0.34 + 0.66 * smoothstep(0.3, 0.66, slow + 0.2 * (amount - 0.6))) * banked * (0.45 + 0.55 * smoothstep(0.12, 0.45, limbCos(at)));

  // (The field is gathered in flows: long lanes of cloud that bend as the wind bends, a thousand kilometres and more, with open
  // sea between them. The lanes are the streak photograph's own, read wide and soft so only where its streaks are gathered is
  // left, on ground that the wind has bent; the cloud inside a lane is the fine field as before.)
  float flow = dot(texture2D(uMatStreaks, uvFlow, 2.0).rgb, vec3(0.3, 0.55, 0.15)) / 0.31;
  share *= 0.1 + 0.9 * smoothstep(0.6, 1.4, flow);
  if (share <= 0.02) return 0.0;
  float streak = cloudIn(uMatStreaks, lowUvA, 0.31);
  // (The streaks are gathered in flows a thousand kilometres long, with open sea between: the same photograph, three times as wide, on a wind of its own.)
  streak *= mix(1.0, flow, 0.6);
  float cluster = cloudIn(uMatPopcorn, lowUvB, 0.34);
  float puff = cloudIn(uMatSpecks, lowUvC, 0.2);
  // (The two finest lays are finer than a pixel from high up, where each has fallen to its mean: they are read only while the
  // camera is near enough to see them, and come in from that mean, so nothing is switched.)
  float lump = 1.0;
  float grain = 1.0;
  lowNear = vec2(1.0 - smoothstep(240.0, 360.0, uViewKm), 1.0 - smoothstep(85.0, 130.0, uViewKm));
  if (lowNear.x > 0.0) lump = mix(1.0, cloudIn(uMatPopcorn, lowUvD, 0.34), lowNear.x);
  if (lowNear.y > 0.0) grain = mix(1.0, cloudIn(uMatSpecks, lowUvE, 0.2), lowNear.y);
  // (A field is not one kind of cloud: here it is all fine specks along the wind, there the clusters have grown.)
  float grown = smoothstep(0.35, 0.65, texture2D(uCloudTile, uvGrown, 3.0).b);
  float byCluster = mix(0.35, 0.9, grown);
  float byPuff = mix(1.0, 0.7, grown);
  float knots = mix(1.0, cluster, byCluster) * mix(1.0, puff, byPuff);
  float fine = mix(1.0, lump, 0.55) * mix(1.0, grain, 0.4);
  lowWeigh = vec3(byCluster, byPuff, share);
  // (The streak is the thin body; the clusters stand in it, and a little beside it.)
  // (The streak alone is the thin veil the wind draws out between the clusters; the clusters stand in it.)
  // (The share of the sky the field takes moves its level a little, never much: the field is fine and even, as trade cumulus is,
  // and only thins away where the sky is to stand clear.)
  // (So the field is two things, as in a photograph from orbit: the knots of cumulus, dense and bright with open sea between
  // them, and the thin veil the wind draws along the streak, which the sea shows through. The knots keep the contrast the
  // photograph of them has; nothing is pressed flat into a raft.)
  float level = mix(0.56, 0.9, share);
  // (The knots take their shape from the puffs, not from the streak: the streak only says where they gather.)
  float dense = max(pow(streak, 0.35) * pow(knots * fine, 1.5) * level - 1.2, 0.0);
  float drawn = 0.17 * max(streak * level - 0.85, 0.0) * mix(1.0, lump, 0.4);
  return (dense + drawn) * smoothstep(0.02, 0.3, share);
}

// The low cloud: x how thick it is to the eye (0 to 1), y how high its tops stand there (0 to 1). The thin of it lets the sea
// through as water lets light through (the law of Beer), so nothing has a cut edge.
vec2 lowField(vec2 at) {
  float depth = lowDepth(at);
  lowSlope = vec2(0.0);
  // (The fall of the tops is read only where there is cloud to light.)
  if (depth <= 0.0) return vec2(0.0);
  vec3 a = texture2D(uMatStreaksNh, lowUvA).rgb;
  vec3 b = texture2D(uMatPopcornNh, lowUvB).rgb;
  vec3 c = texture2D(uMatSpecksNh, lowUvC).rgb;
  vec3 d = vec3(0.5);
  vec3 e = vec3(0.5);
  if (lowNear.x > 0.0) d = mix(d, texture2D(uMatPopcornNh, lowUvD).rgb, lowNear.x);
  if (lowNear.y > 0.0) e = mix(e, texture2D(uMatSpecksNh, lowUvE).rgb, lowNear.y);
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
  float far = smoothstep(300.0, 1100.0, length(at - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))})));
  if (far <= 0.0) return 0.0;
  vec2 hv = at + uTime * vec2(6.5, -3.8);
  vec2 hs = hv;
  if (uLive > 0.0) {
    hv += uWx * vec2(36.0, -21.0);
    hs += uWx * vec2(44.0, -16.0);
  }
  highUvSheet = mat2(0.9, 0.44, -0.44, 0.9) * hv / 1900.0 + vec2(0.2, 0.6);
  highUvThread = mat2(0.84, 0.54, -0.54, 0.84) * hs / vec2(1250.0, 900.0) + vec2(0.7, 0.2);
  // (Where the ice stands at all: two soft swells that cross, carried with it. They are waves and not a picture or a noise of
  // cells, so the pattern has no corner, no step and no flat for the last sun to redden: the fibre of the photographs is all the
  // outline the ice has.)
  vec2 g = mat2(0.78, -0.62, 0.62, 0.78) * hv + vec2(1300.0, 600.0);
  vec2 h = mat2(0.5, 0.87, -0.87, 0.5) * hv;
  float wide = 0.5 + 0.5 * sin(g.x / 480.0 + 1.7 * sin(g.y / 620.0 + 0.4)) * sin(g.y / 530.0 + 1.3 * sin(g.x / 700.0 + 1.9));
  float fine = 0.5 + 0.5 * sin(h.x / 205.0 + 1.5 * sin(h.y / 260.0)) * sin(h.y / 225.0 + 1.2 * sin(h.x / 310.0 + 0.8));
  float where = 0.8 * smoothstep(0.56, 0.96, 0.6 * wide + 0.4 * fine) * (1.0 - 0.95 * smoothstep(0.08, 0.4, sunImage(at)));
  if (where <= 0.0) return 0.0;
  float sheet = cloudIn(uMatVeil, highUvSheet, 0.27);
  float thread = cloudIn(uMatStreaks, highUvThread, 0.31);
  float depth = sheet * mix(1.0, thread, 0.55) * where * 1.7 - 0.85;
  return (1.0 - exp(-1.1 * max(depth, 0.0))) * far;
}

float highField(vec2 at) {
  float thick = highDepth(at);
  highSlope = vec2(0.0);
  if (thick <= 0.0) return 0.0;
  highSlope = 0.6 * (texture2D(uMatVeilNh, highUvSheet).rg * 2.0 - 1.0) * mat2(0.9, 0.44, -0.44, 0.9) + 0.8 * (texture2D(uMatStreaksNh, highUvThread).rg * 2.0 - 1.0) * mat2(0.84, 0.54, -0.54, 0.84);
  return thick;
}

// The cloud the land holds (sky/banks.png, made from the relief of the land by assets-src/reveal/sky/make_banks.py): x the bank a
// range holds on the flank that faces the wind (BANK_KM), y the fog that lies on the floors between ranges (FOG_KM), each as the
// light meets it (0 clear, 1 the thin of it, 3 a core). A bank stands where its range makes it and the cloud streams through it:
// the photographs it is made of are carried by the wind, the place it shows in is not. Not every range holds a bank on one day.
vec2 bankUvA = vec2(0.0);
vec2 bankUvB = vec2(0.0);
float bankNear = 0.0;
const mat2 BANK_A = mat2(0.6, 0.8, -0.8, 0.6);
const mat2 BANK_B = mat2(0.94, 0.34, -0.34, 0.94);
float bankDepth(vec2 bankAt) {
  float held = texture2D(uBanks, clamp((bankAt - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0)).r;
  // (The sky stands clear over the lake of the Eye, where the rise begins.)
  float clear = smoothstep(100.0, 230.0, length(bankAt - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))})));
  bankNear = 0.0;
  // (The places the pictures are read at, before the way out: see lowDepth.)
  vec2 w = bankAt - uTime * 1.5 * LOW_DRIFT;
  if (uLive > 0.0) w -= uWx * vec2(27.0, 8.0);
  bankUvA = BANK_A * w / 420.0 + vec2(0.47, 0.11);
  bankUvB = BANK_B * w / 130.0 + vec2(0.29, 0.73);
  vec2 uvToday = bankAt / 2600.0 + vec2(0.21, 0.67);
  vec2 uvDrawn = LOW_A * w / vec2(560.0, 300.0) + vec2(0.71, 0.36);
  if (held * clear <= 0.004) return -0.6;
  float body = cloudIn(uMatPopcorn, bankUvA, 0.34);
  float fine = 1.0;
  bankNear = 1.0 - smoothstep(420.0, 600.0, uViewKm);
  if (bankNear > 0.0) fine = mix(1.0, cloudIn(uMatSpecks, bankUvB, 0.2), bankNear);
  float today = smoothstep(0.32, 0.6, texture2D(uCloudTile, uvToday, 3.0).b);
  // (A bank is the wind's own cloud, caught: it is drawn out along the wind in streaks as the low field is, torn where the streak
  // photograph is clear and thin round its clusters, so no bank has the outline of the range that holds it.)
  float drawn = cloudIn(uMatStreaks, uvDrawn, 0.31);
  // (And it is made as the field is: knots of cumulus with air between them, crowded where the range holds them and few at
  // the edge of its hold, and the thin veil of the streak among them. What the range holds is how many knots stand, never
  // how bright one soft mass is: a bank has no outline to be a lump by.)
  float gather = held * today * clear;
  // (Where the range holds it hardest the bank is one body, as cloud piled on a windward slope is: the knots have closed up,
  // and what is left of them is the lumped top of the bank, which the sun models. Out from there the body opens into knots
  // again, so the bank has a torn edge and no outline. Knots alone, all the way in, read as specks of snow on the range.)
  float core = smoothstep(0.25, 0.8, gather);
  float lumps = pow(body * mix(1.0, fine, 0.6), mix(1.5, 0.7, core));
  float dense = max(pow(drawn, mix(0.6, 0.25, core)) * lumps * (0.35 + 1.5 * gather) - mix(1.0, 0.48, core), 0.0);
  float thin = 0.3 * max(drawn * 1.6 * gather - 0.5, 0.0);
  return (dense + thin) * smoothstep(0.02, 0.2, gather) - 0.001;
}
float fogDepth(vec2 fogAt) {
  float held = texture2D(uBanks, clamp((fogAt - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0)).g;
  float clear = smoothstep(100.0, 230.0, length(fogAt - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))})));
  // (The places the pictures are read at, before the way out: see lowDepth.)
  vec2 w = fogAt - uTime * vec2(0.9, -0.5);
  if (uLive > 0.0) w -= uWx * vec2(3.0, -2.0);
  vec2 uvVeil = mat2(0.5, 0.87, -0.87, 0.5) * w / 520.0 + vec2(0.4, 0.9);
  vec2 uvToday = fogAt / 1900.0 + vec2(0.83, 0.37);
  if (held * clear <= 0.004) return -0.5;
  // (Fog lies level: its top has the soft fibre of a veil and no lumps, and it thins up the slopes through that fibre.)
  float veil = cloudIn(uMatVeil, uvVeil, 0.27);
  float today = smoothstep(0.34, 0.62, texture2D(uCloudTile, uvToday, 3.0).b);
  return held * today * clear * (0.3 + 0.9 * veil) * 1.5 - 0.5;
}

// The haze that pools over low ground (sky/banks.png, blue): 0 to 1. It lies in the plains and on the wide valley floors and the
// ranges stand out of it; it is thicker on some days' reaches than on others, and has no edge.
float hazeAt(vec2 xz) {
  float pooled = texture2D(uBanks, clamp((xz - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0)).b;
  if (pooled <= 0.004) return 0.0;
  vec2 w = xz - uTime * vec2(0.5, -0.3);
  if (uLive > 0.0) w -= uWx * vec2(2.0, -1.2);
  return pooled * (0.45 + 0.55 * smoothstep(0.3, 0.62, texture2D(uCloudTile, w / 2300.0 + vec2(0.27, 0.59), 3.0).b));
}

// The share of the sun that reaches a point of the ground under the cloud. Each height of cloud throws its own shadow, as far from
// itself as it stands high, so the shadow of the ice lies well off the shadow of the puffs under it.
float cloudShade(vec2 xz) {
  vec2 toSun = uSunDir.xz / max(uSunDir.y, 0.2);
  // From orbit the shadows are drawn longer than they fall, as relief is on a map, so that each height of cloud is seen to stand off the sea.
  float lift = mix(1.0, 3.0, smoothstep(150.0, 700.0, uViewKm));
  float low = 1.0 - exp(-1.3 * max(lowDepth(xz + toSun * ${LOW_KM.toFixed(1)} * lift), 0.0));
  float high = highDepth(xz + toSun * ${HIGH_KM.toFixed(1)} * lift);
  float bank = 1.0 - exp(-1.3 * max(bankDepth(xz + toSun * ${BANK_KM.toFixed(1)} * lift), 0.0));
  float standing = coverAt(xz + toSun * 6.5 * lift).b;
  // The cyclone shades the sea: a soft shadow, thrown well away from the sun.
  float fromStorm = length(xz + toSun * 110.0 - vec2(${f(X(AT.cyclone.x))}, ${f(Z(AT.cyclone.y))})) / ${f(1250 * KM)};
  float stormShade = pow(1.0 - smoothstep(0.02, 0.48, fromStorm), 1.3) * uArrive;
  return (1.0 - mix(0.55, 0.78, smoothstep(300.0, 900.0, uViewKm)) * smoothstep(0.04, 0.6, low)) * (1.0 - 0.22 * high * uArrive) * (1.0 - 0.6 * bank * uArrive) * (1.0 - 0.16 * standing * uArrive) * (1.0 - 0.13 * stormShade);
}`;
