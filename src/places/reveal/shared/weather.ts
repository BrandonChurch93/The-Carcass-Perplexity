// The cloud as one field of the world, so that the surface that takes its shade and the sheets that draw it read the same cloud.
// Where the weather stands comes from sky/cover.png (assets-src/reveal/sky/make_cover.py); what it looks like comes from the Builder's
// photographs of cloud from orbit (public/assets/reveal/mat). Lengths are kilometres, the drift is a pure function of the time.
import { AT, KM, X, Z } from './anchors';

/** The rectangle of the world the picture of the cover lies on: x and z of its corner, one over its width and its height. */
export const COVER_RECT: [number, number, number, number] = [X(-900), Z(-820), 1 / (8500 * KM), 1 / (((8500 * 9) / 16) * KM)];
/** The rectangle of the land's widest relief (land/relief-a.png, the first of land/levels.ts), as COVER_RECT is given. */
export const GROUND_RECT: [number, number, number, number] = [X(2983.67 - 5295.59 / 2), Z(1727.13 - (5295.59 * 9) / 32), 1 / (5295.59 * KM), 1 / (((5295.59 * 9) / 16) * KM)];
/** Height over the sea, km: the low field of small cloud, the fronts, the veil of ice. */
export const LOW_KM = 2.6;
export const HIGH_KM = 10.5;
/** The banks a range holds on the flank that faces the wind, and the fog on the floors between ranges. */
export const BANK_KM = 5.0;
export const FOG_KM = 0.7;
/** Km a second: staged far faster than weather, so the held frame is seen to live. */
export const LOW_DRIFT: [number, number] = [5.4, 1.5];
/** The small low far off toward the planet's edge, px of the master: the wind winds round it as round the cyclone, a quarter as wide. */
export const LOW2 = { x: 1750, y: 2800 };
// How many storms the sea holds: 1 the cyclone alone, 2 with the far low. (The same number is given to
// assets-src/reveal/sky/make_weather.py as STORMS, which clears the sea round each.)
export const STORMS = 2;
// The other storms, each drawn by the cyclone's sheet (sky/index.ts): where (px of the master), the half width of its sheet (the
// cyclone's is 1250), how it is turned, where in the photographs its arms are taken from, and how much thinner it stands.
export const OTHER_STORMS = [{ at: LOW2, half: 460, turn: 0.32, arms: [0.37, 0.61], thinner: 0.0 }] as const;
// How far the weather systems travel down the wind for each unit of the weather's clock, km.
export const SYSTEMS_RUN = 0.9;
/** The rectangle the map of the weather systems lies on (sky/weather.png, assets-src/reveal/sky/make_weather.py), as COVER_RECT is given. */
export const WEATHER_RECT: [number, number, number, number] = [X(-2600), Z(-1400), 1 / (10800 * KM), 1 / (6075 * KM)];
const LOW_MUCH = 1.5;

const f = (n: number): string => n.toFixed(4);

export const WEATHER_GLSL = /* glsl */ `
uniform sampler2D uCloudTile;
uniform sampler2D uCover;
uniform sampler2D uWeather;
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
  float turned = 0.5 * exp(-length(from) / ${f(1100 * KM)});
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

// A picture read past a way out that not every pixel takes. The renderer shades four pixels together and works out how fine to
// read a picture from the places its neighbours read at: past a branch one of the four has not taken, that place is stale memory
// and the fineness changes from one run to the next. So the change of every place across the pixel is taken before the first
// such branch (GRADS) and handed to the read (pic, cloudAt), which is then the same read as texture2D would make, every run.
#define GRADS(uv) vec4(dFdx(uv), dFdy(uv))
float fineness(sampler2D t, vec4 g) {
  vec2 size = vec2(textureSize(t, 0));
  vec2 a = g.xy * size;
  vec2 b = g.zw * size;
  return 0.5 * log2(max(max(dot(a, a), dot(b, b)), 1e-12));
}
vec4 pic(sampler2D t, vec2 uv, vec4 g) {
  return textureLod(t, uv, fineness(t, g));
}
vec4 pic(sampler2D t, vec2 uv, vec4 g, float coarser) {
  return textureLod(t, uv, fineness(t, g) + coarser);
}
float cloudAt(sampler2D t, vec2 uv, vec4 g, float mean) {
  return dot(textureLod(t, uv, fineness(t, g)).rgb, vec3(0.3, 0.55, 0.15)) / mean;
}

// Where the five lays of the low field were last read, and how much of the field each one made there (set by lowDepth).
vec2 lowUvA = vec2(0.0);
vec2 lowUvB = vec2(0.0);
vec2 lowUvC = vec2(0.0);
vec2 lowUvD = vec2(0.0);
vec2 lowUvE = vec2(0.0);
vec4 lowGA = vec4(0.0);
vec4 lowGB = vec4(0.0);
vec4 lowGC = vec4(0.0);
vec4 lowGD = vec4(0.0);
vec4 lowGE = vec4(0.0);
vec3 lowWeigh = vec3(0.0);
vec2 lowNear = vec2(0.0);
// How much softer than the pixel the field is read (1 as it is seen; more for its shadow from orbit).
float lowSoft = 1.0;

// Two skies in one place. Below orbit, through the rise, the low field and the ice are the start's own, to the last bit
// (lowDepthWas, lowFieldWas, highDepthWas: the approved pictures of the rise are of that sky). From orbit they are the weather
// systems on the wind's map (lowDepthNow, lowFieldNow, highDepthNow). weatherNow says which: 0 the start's, 1 the systems, and
// between the two (uViewKm 660 to 1050, frames 9762 to 9903 of the rise) one gives way to the other as the camera climbs.
float weatherNow() {
  return smoothstep(660.0, 1050.0, uViewKm);
}

// The start's low field.
const mat2 WAS_A = mat2(0.97, -0.24, 0.24, 0.97);
const mat2 WAS_B = mat2(0.8, 0.6, -0.6, 0.8);
const mat2 WAS_C = mat2(0.94, -0.34, 0.34, 0.94);
const mat2 WAS_D = mat2(-0.6, 0.8, -0.8, -0.6);
const mat2 WAS_E = mat2(0.71, -0.7, 0.7, 0.71);

// The low cloud as the light meets it: how much water stands in the way (0 where the sea is clear, about 1 in the thin body of a
// streak, 3 and more in the core of a cluster). The cloud is the photographs' own: wind streaks (820 by 470 km a repeat) say where
// cloud lies at all, and inside them a field of cumulus clusters (340 km), the puffs of a cluster (150 km), the lumps of a puff
// (64 km) and its grain (22 km) each thin it or thicken it. The photographs are multiplied, never cut at a level: a streak thins
// out to nothing through its own veil, and a cluster keeps the thin body the photograph shows round it.
float lowDepthWas(vec2 at) {
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
    180.0 * sin(bendAt.y / 1300.0 + 1.3 * sin(bendAt.x / 2300.0) + 0.6) + 50.0 * sin((bendAt.y + 0.5 * bendAt.x) / 520.0 + 2.1),
    260.0 * sin(bendAt.x / 1150.0 + 1.1 * sin(bendAt.y / 1900.0) + 1.9) + 65.0 * sin((bendAt.x - 0.6 * bendAt.y) / 560.0 + 0.4));
  // (And within a few hundred kilometres it meanders: laid straight, the grain of the photographs stood at one angle over a
  // whole ocean. The filaments of specks now wander by a few degrees either way.)
  // (All the bends together must not draw a photograph out more than three to one, or its cells are strokes and, where the
  // ground folds on itself, straight hairlines that cross. As they stand the worst is 2.7 to 1 and the middle 1.3,
  // measured over the sea of the widest view by the change of the ground across ten kilometres. Whoever adds a bend measures again.)
  w += vec2(
    6.0 * sin(at.y / 61.0 + 1.4 * sin(at.x / 173.0 + 0.7) + 2.3) + 1.8 * sin((at.y - 0.7 * at.x) / 29.0 + 1.1),
    5.4 * sin(at.x / 67.0 + 1.2 * sin(at.y / 151.0 + 2.9) + 0.5) + 1.65 * sin((at.x + 0.6 * at.y) / 33.0 + 4.0));
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
  lowUvA = WAS_A * wLane / vec2(1050.0, 760.0) + vec2(0.3, 0.7);
  lowUvB = WAS_B * wCell / 330.0 + vec2(0.13, 0.4);
  lowUvC = WAS_C * wPuff / 700.0 + vec2(0.61, 0.27);
  lowUvD = WAS_D * wCell / 64.0 + vec2(0.83, 0.52);
  lowUvE = WAS_E * w / 22.0 + vec2(0.37, 0.91);
  // (Every place a picture is read at is worked out here, before the first way out of this function, in every pixel: a picture
  // is read at the fineness its neighbours' places give, and a neighbour that has left early must still hold a true place. Left
  // unset, one pixel at the edge of a clearing came out a level different from one run to the next.)
  vec2 uvTorn = wSlow / 1100.0 + vec2(0.7, 0.2);
  vec2 uvSlow = w / 2900.0 + vec2(0.15, 0.55);
  vec2 uvLane = WAS_A * wLane / vec2(4200.0, 1150.0) + vec2(0.52, 0.18);
  vec2 uvFlow = mat2(0.92, 0.39, -0.39, 0.92) * wFlow / vec2(4200.0, 1500.0) + vec2(0.62, 0.35);
  vec2 uvGrown = w / 1700.0 + vec2(0.44, 0.08);
  lowGA = GRADS(lowUvA) * lowSoft;
  lowGB = GRADS(lowUvB) * lowSoft;
  lowGC = GRADS(lowUvC) * lowSoft;
  lowGD = GRADS(lowUvD);
  lowGE = GRADS(lowUvE);
  vec4 gTorn = GRADS(uvTorn);
  vec4 gSlow = GRADS(uvSlow);
  vec4 gLane = GRADS(uvLane);
  vec4 gFlow = GRADS(uvFlow);
  vec4 gGrown = GRADS(uvGrown);
  // (Where the sky stands clear nothing more is read: most of the cost of the field is its photographs.)
  lowWeigh = vec3(0.0);
  lowNear = vec2(0.0);
  if (amount <= 0.0) return 0.0;
  // (Where it is thick and where torn is carried by winds of its own, a little off the wind of the field: the banks change as they go.)
  float torn = pic(uCloudTile, uvTorn, gTorn, 3.5).b;
  float slow = 0.6 * pic(uCloudTile, uvSlow, gSlow, 4.0).b + 0.4 * torn;
  float lane = pic(uCloudTile, uvLane, gLane, 2.0).b;
  float banked = 0.45 + 0.55 * smoothstep(0.3, 0.52, lane);
  if (uLive > 0.0) banked = mix(banked, (0.05 + 1.1 * smoothstep(0.34, 0.6, lane)) * (0.1 + 1.3 * smoothstep(0.36, 0.62, torn)), 0.3 * smoothstep(0.0, 14.0, uWx));
  float share = amount * (0.34 + 0.66 * smoothstep(0.3, 0.66, slow + 0.2 * (amount - 0.6))) * banked * (0.45 + 0.55 * smoothstep(0.12, 0.45, limbCos(at)));

  // (The field is gathered in flows: long lanes of cloud that bend as the wind bends, a thousand kilometres and more, with open
  // sea between them. The lanes are the streak photograph's own, read wide and soft so only where its streaks are gathered is
  // left, on ground that the wind has bent; the cloud inside a lane is the fine field as before.)
  float flow = dot(pic(uMatStreaks, uvFlow, gFlow, 2.0).rgb, vec3(0.3, 0.55, 0.15)) / 0.31;
  share *= 0.1 + 0.9 * smoothstep(0.6, 1.4, flow);
  if (share <= 0.02) return 0.0;
  float streak = cloudAt(uMatStreaks, lowUvA, lowGA, 0.31);
  // (The streaks are gathered in flows a thousand kilometres long, with open sea between: the same photograph, three times as wide, on a wind of its own.)
  streak *= mix(1.0, flow, 0.6);
  float cluster = cloudAt(uMatPopcorn, lowUvB, lowGB, 0.34);
  float puff = cloudAt(uMatSpecks, lowUvC, lowGC, 0.2);
  // (The two finest lays are finer than a pixel from high up, where each has fallen to its mean: they are read only while the
  // camera is near enough to see them, and come in from that mean, so nothing is switched.)
  float lump = 1.0;
  float grain = 1.0;
  lowNear = vec2(1.0 - smoothstep(240.0, 360.0, uViewKm), 1.0 - smoothstep(85.0, 130.0, uViewKm));
  if (lowNear.x > 0.0) lump = mix(1.0, cloudAt(uMatPopcorn, lowUvD, lowGD, 0.34), lowNear.x);
  if (lowNear.y > 0.0) grain = mix(1.0, cloudAt(uMatSpecks, lowUvE, lowGE, 0.2), lowNear.y);
  // (A field is not one kind of cloud: here it is all fine specks along the wind, there the clusters have grown.)
  float grown = smoothstep(0.46, 0.7, pic(uCloudTile, uvGrown, gGrown, 3.0).b);
  float byCluster = mix(0.0, 0.85, grown);
  float byPuff = mix(1.0, 0.6, grown);
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
  // (Cut at one level everywhere, the field was flecks of one size. The level stands low in some reaches, where the knots
  // run together into banks with a wide thin body round them, and high in others, where only fine specks are left.)
  float gathered = smoothstep(0.38, 0.62, torn);
  float dense = max(pow(streak, 0.15) * pow(knots * fine, 1.3) * level - mix(1.4, 0.85, gathered), 0.0);
  // (From orbit a tuft that barely clears the level is one hard white pixel, and a sea of them is a noise no encoder holds.
  // The least of them are let down to grey, the bodies keep their white, and the thin the wind draws out between near
  // neighbours is a little wider, so they stand joined in a veil.)
  float far = smoothstep(500.0, 1300.0, uViewKm);
  dense = dense * dense / (dense + 0.5 * far + 1e-4);
  float drawn = mix(0.1, 0.35, gathered) * mix(1.0, 2.2, far) * max(pow(streak, mix(0.5, 0.25, far)) * mix(1.0, knots, mix(0.7, 0.95, far)) * level - 0.8 + 0.08 * far, 0.0) * mix(1.0, lump, 0.4);
  return (dense + drawn) * smoothstep(0.02, 0.3, share);
}


vec2 lowFieldWas(vec2 at) {
  float depth = lowDepthWas(at);
  lowSlope = vec2(0.0);
  // (The fall of the tops is read only where there is cloud to light.)
  if (depth <= 0.0) return vec2(0.0);
  vec3 a = pic(uMatStreaksNh, lowUvA, lowGA).rgb;
  vec3 b = pic(uMatPopcornNh, lowUvB, lowGB).rgb;
  vec3 c = pic(uMatSpecksNh, lowUvC, lowGC).rgb;
  vec3 d = vec3(0.5);
  vec3 e = vec3(0.5);
  if (lowNear.x > 0.0) d = mix(d, pic(uMatPopcornNh, lowUvD, lowGD).rgb, lowNear.x);
  if (lowNear.y > 0.0) e = mix(e, pic(uMatSpecksNh, lowUvE, lowGE).rgb, lowNear.y);
  lowSlope = 0.3 * ((a.rg * 2.0 - 1.0) * vec2(1.0, 1.5)) * WAS_A + 0.75 * lowWeigh.x * (b.rg * 2.0 - 1.0) * WAS_B + 0.75 * lowWeigh.y * (c.rg * 2.0 - 1.0) * WAS_C
    + 0.6 * (d.rg * 2.0 - 1.0) * WAS_D + 0.45 * (e.rg * 2.0 - 1.0) * WAS_E;
  float thick = 1.0 - exp(-1.3 * max(depth, 0.0));
  return vec2(thick, clamp(depth / 3.5, 0.0, 1.0));
}

// The wind of the low air, as a map of the ground that keeps a square square: far from a storm it is the ground itself, turned so
// that x runs down the wind; round the cyclone and round the small low far off toward the planet's edge it winds in a spiral.
// (Each is U z plus c log(z - centre) of one complex number, which is such a map everywhere.) The cloud photographs are laid in
// it, so their streets run down the wind over the whole sea and turn into the arms of a storm, and a cell stays a cell. Going once
// round a storm the map jumps by a whole number of 600 km both ways (cyclone 4 and 2, far low 2 and 1): every lay is a whole
// number of repeats in 600 km, so no lay shows the jump. Whoever adds a lay keeps that; a function of the map that does not
// repeat so shows a seam running west from each storm.
// windFp: how the map stretches and turns the ground at the point last read (its derivative, a complex number).
vec2 windFp = vec2(1.0, 0.0);
vec2 cmul(vec2 a, vec2 b) {
  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}
vec2 windRound(vec2 d, vec2 c) {
  float r2 = max(dot(d, d), 4.0);
  windFp += cmul(c, vec2(d.x, -d.y)) / r2;
  return cmul(c, vec2(0.5 * log(r2), atan(d.y, d.x)));
}
const vec2 WIND_FAR = vec2(0.9511, -0.3090);
// How far the weather systems have travelled down the wind since the titan frame, km: the far low and the map of the systems
// (sky/weather.png) go together, far slower than the cloud that streams through them. Nothing before the frame is held.
vec2 systemsRun() {
  return uLive > 0.0 ? ${f(SYSTEMS_RUN)} * uWx * vec2(0.9511, 0.3090) : vec2(0.0);
}
vec2 windLay(vec2 at) {
  windFp = WIND_FAR;
  return cmul(WIND_FAR, at) + windRound(at - vec2(${f(X(AT.cyclone.x))}, ${f(Z(AT.cyclone.y))}), vec2(190.99, 381.97)) + windRound(at - systemsRun() - vec2(${f(X(LOW2.x))}, ${f(Z(LOW2.y))}), vec2(95.49, 190.99));
}
// The change of a lay across the pixel, from the change of the ground across it (the map is smooth; its jump is not in it).
vec4 windG(vec4 gAt, mat2 m) {
  return vec4(m * cmul(windFp, gAt.xy), m * cmul(windFp, gAt.zw));
}

// The lays of the low field in the wind's map (600 km a unit): whole numbers, each turned its own way to the wind.
const mat2 LOW_A = mat2(1.0, 0.0, 0.0, 1.0);
const mat2 LOW_B = mat2(3.0, 1.0, -1.0, 3.0);
const mat2 LOW_C = mat2(1.0, 1.0, -1.0, 1.0);
const mat2 LOW_D = mat2(9.0, 4.0, -4.0, 9.0);
// How much cloud stands over the open sea: 1 as built; 0.4 a clearer sea, 1.6 a fuller one (the choice sent to Brandon).
const float LOW_MUCH = ${f(LOW_MUCH)};
const mat2 LOW_E = mat2(25.0, 10.0, -10.0, 25.0);

// How much of the low field stands at a point, 0 to 1, before any of its cloud is read: the painted cover, the clear sky over
// the lake of the Eye and over the sun's image, and in the hold the systems that travel.
// What other land and the ice hold at the point last asked of lowAmount (sky/cover.png, red): 0 none, about 0.5 a street in
// the lee of an island or a coast, 1 a bank or a deck.
float lowHeld = 0.0;
// The body of the low field at the point last asked of lowDepth, soft, 0 to 1: where its clusters, fronts and decks stand, with
// none of their cells. It is what the moon shows of the weather by night.
float lowBody = 0.0;
float lowAmount(vec2 at) {
  vec3 stands = coverAt(at);
  float lake = smoothstep(100.0, 230.0, length(at - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))})));
  // The sky stands clear over the lake of the Eye, where the rise begins.
  float amount = max(stands.g, 0.6 * westSea(at)) * lake;
  // (Held, the weather is seen to pass: the painted clumps of the cover, which stand on the ground, give way through the hold
  // to the systems that travel, and only its wide clearing over the land and round the cyclone stays where it is.)
  if (uLive > 0.0) {
    float open = smoothstep(0.12, 0.4, textureLod(uCover, clamp((at - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0), 5.0).g);
    amount = mix(amount, open * lake, smoothstep(0.0, 22.0, uWx));
  }
  float glare = 1.0 - 0.94 * smoothstep(0.03, 0.3, sunImage(at));
  lowHeld = stands.r * glare;
  return amount * glare;
}

// The low cloud as the light meets it: how much water stands in the way (0 where the sea is clear, about 1 in the thin body of a
// streak, 3 and more in the core of a cluster). The cloud is the photographs' own, laid down the wind (windLay): the wind
// streaks, two to one along the wind and read soft, say where the chains of cumulus stand; in a chain the cells are the
// photographs of small cumulus at two sizes, crowded where the chain is strong and gone where it is not, so the sea between
// chains is clear; and the streak photograph read sharp is the thin veil the wind draws out among them.
float lowDepthNow(vec2 at) {
  vec4 gAt = GRADS(at);
  float amount = lowAmount(at);
  lowWeigh = vec3(0.0);
  lowNear = vec2(0.0);
  lowBody = 0.0;
  // (Where no cloud can stand, over the body and the clear sea, nothing more is worked out: the wind's map is the dear part of
  // this function and most of the picture below orbit is such ground. The one change across the pixel that the reads below
  // are made with, of the ground itself, is taken above, and every other is worked out from it: see GRADS and windG.)
  if (amount <= 0.02 && lowHeld <= 0.0) return 0.0;
  // (The wind over an ocean does not blow straight: it meanders over a thousand kilometres, and within a few hundred it wanders
  // a few degrees either way. The ground is bent so before the wind's map is taken, by a field that stands on the planet.)
  vec2 bent = at + vec2(
    120.0 * sin(at.y / 700.0 + 1.3 * sin(at.x / 1250.0) + 0.6) + 16.0 * sin(at.y / 47.0 + 1.4 * sin(at.x / 113.0 + 0.7) + 2.3) + 4.0 * sin(at.y / 19.0 + 1.7 * sin(at.x / 41.0 + 1.1)),
    140.0 * sin(at.x / 820.0 + 1.1 * sin(at.y / 1500.0) + 1.9) + 14.0 * sin(at.x / 53.0 + 1.2 * sin(at.y / 97.0 + 2.9) + 0.5) + 3.5 * sin(at.x / 23.0 + 1.5 * sin(at.y / 37.0 + 0.4)));
  vec2 q = windLay(bent) / 600.0;
  // (Carried down the wind: slowly through the rise, and held, at a pace the eye can follow from orbit. Each lay rides a wind
  // a little off the others, so a chain is seen to work and not to slide as a card.)
  float held = uTime < 8.0 ? 0.125 * max(uTime - 4.0, 0.0) * max(uTime - 4.0, 0.0) : uTime - 6.0;
  q.x -= (5.6 * uTime + 25.0 * held) / 600.0;
  vec2 qChain = q;
  vec2 qCell = q;
  vec2 qPuff = q;
  if (uLive > 0.0) {
    qChain -= uWx * vec2(17.0, 1.5) / 600.0;
    qCell -= uWx * vec2(23.0, -1.0) / 600.0;
    qPuff -= uWx * vec2(20.0, 2.0) / 600.0;
  }
  // (Where the systems stand is read on the ground itself, where they have travelled to: it is soft and wide.)
  vec2 lowPatch = (at - systemsRun() - vec2(${f(WEATHER_RECT[0])}, ${f(WEATHER_RECT[1])})) * vec2(${WEATHER_RECT[2].toFixed(9)}, ${WEATHER_RECT[3].toFixed(9)});
  vec4 lowGPatch = gAt * vec4(${WEATHER_RECT[2].toFixed(9)}, ${WEATHER_RECT[3].toFixed(9)}, ${WEATHER_RECT[2].toFixed(9)}, ${WEATHER_RECT[3].toFixed(9)});
  lowUvA = LOW_A * qChain + vec2(0.3, 0.7);
  lowUvB = LOW_B * qCell + vec2(0.13, 0.4);
  lowUvC = LOW_C * qPuff + vec2(0.61, 0.27);
  lowUvD = LOW_D * qCell + vec2(0.83, 0.52);
  lowUvE = LOW_E * qPuff + vec2(0.37, 0.91);
  // (Every place a picture is read at, and its change across the pixel, is worked out here, before the first way out of this
  // function, in every pixel: see GRADS.)
  lowGA = windG(gAt, LOW_A / 600.0) * lowSoft;
  lowGB = windG(gAt, LOW_B / 600.0) * (lowSoft - 0.4);
  lowGC = windG(gAt, LOW_C / 600.0) * (lowSoft - 0.4);
  lowGD = windG(gAt, LOW_D / 600.0);
  lowGE = windG(gAt, LOW_E / 600.0);
  // (Where the wind of a storm cancels the wind of the sea the air is calm and the map draws a photograph out without end:
  // the sky stands clear there, a dry slot beside the storm.)
  // (A deck stands whole over such a place: it has no streets to draw out.)
  float calm = dot(windFp, windFp);
  float slack = smoothstep(0.1, 0.4, calm);
  // (The systems, read first, so most of the open sea, which is clear, costs one read and no more: red how much cloud a
  // system holds, green the veil, blue its kind (0 open cells, 0.5 cumulus in chains, 1 closed cells). The reads are all at
  // places and fineness worked out above: see GRADS.)
  vec3 systems = pic(uWeather, clamp(lowPatch, 0.0, 1.0), lowGPatch).rgb;
  float cluster = max(amount * min(systems.r * LOW_MUCH, 1.0) * mix(slack, 1.0, clamp(2.0 * systems.b - 1.0, 0.0, 1.0)), lowHeld * slack);
  float veiled = amount * slack * systems.g;
  if (cluster <= 0.004 && veiled <= 0.004) return 0.0;
  float closed = max(clamp(2.0 * systems.b - 1.0, 0.0, 1.0) * (amount * systems.r >= lowHeld ? 1.0 : 0.0), smoothstep(0.62, 0.85, lowHeld));
  float opened = clamp(1.0 - 2.0 * systems.b, 0.0, 1.0) * (1.0 - closed);
  float chain = dot(pic(uMatStreaks, lowUvA, lowGA, 1.0).rgb, vec3(0.3, 0.55, 0.15)) / 0.31;
  // (Cumulus stands in chains down the wind; a front or a deck is cloud from side to side; open cells stand free of the chains.)
  // (In the heart of a cluster the chains stand closer.)
  float density = cluster * mix(smoothstep(0.7 - 0.3 * cluster, 1.8 - 0.5 * cluster, chain), 1.0, max(0.6 * closed, 0.7 * opened));
  // (Close round a low the map winds a photograph tight: its streaks would be drawn there as curved bars, so the veil stands
  // back, and the deck at the heart of the low is whole, with no cells to crack it.)
  float wound = max(smoothstep(1.6, 4.0, calm), 1.0 - slack);
  lowBody = density;
  // (Below orbit the veil reads as a smear on the lens: it is thinner there and comes to its full by orbit.)
  float drawn = 0.45 * veiled * pow(max(chain - 0.9, 0.0), 1.3) * (1.0 - 0.85 * wound) * (0.4 + 0.6 * smoothstep(500.0, 1300.0, uViewKm));
  if (density <= 0.0) return drawn;
  float cell = cloudAt(uMatPopcorn, lowUvB, lowGB, 0.34);
  float puff = cloudAt(uMatSpecks, lowUvC, lowGC, 0.2);
  // (The two finest lays are finer than a pixel from high up, where each has fallen to its mean: they are read only while the
  // camera is near enough to see them, and come in from that mean, so nothing is switched.)
  float lump = 1.0;
  float grain = 1.0;
  lowNear = vec2(1.0 - smoothstep(240.0, 360.0, uViewKm), 1.0 - smoothstep(85.0, 130.0, uViewKm));
  if (lowNear.x > 0.0) lump = mix(1.0, cloudAt(uMatPopcorn, lowUvD, lowGD, 0.34), lowNear.x);
  if (lowNear.y > 0.0) grain = mix(1.0, cloudAt(uMatSpecks, lowUvE, lowGE, 0.2), lowNear.y);
  // (Open cells are the photograph's cumulus hollowed: a wall of cloud round the clear air where each stood, clear between.)
  float knots = mix(cell, 2.6 * smoothstep(0.25, 0.7, cell) * (1.0 - smoothstep(0.7, 1.5, cell)), opened) * (0.45 + 0.55 * puff) * mix(1.0, lump, 0.55) * mix(1.0, grain, 0.4);
  lowWeigh = vec3(1.0, 0.55, density);
  // (A patch, a front or a storm has a body under its cells: the photograph of wind-drawn cloud itself, thick and thin as it
  // is, cracked where the cells part. It is the start's large soft patch, with tops on it.)
  // (At the heart of a low, where the wind's map is wound too tight to hold a cell, no patch stands: the storm's own sheet is there.)
  // (A body is white and whole at its tops and has an edge: the wind-drawn photograph says where it is thick, the larger lay of
  // cumulus breaks it into tops a few pixels wide from orbit with the sea dark between them, and the smaller lay lumps each top.)
  float form = pow(max(chain - 0.4, 0.0), 1.3);
  float tops = form * (0.42 + 0.58 * smoothstep(0.45, 1.25, puff)) * (0.55 + 0.45 * smoothstep(0.35, 0.9, cell));
  float stood = smoothstep(0.16, 0.34, tops) * (1.0 + 2.6 * tops);
  float dense = max(knots * (0.25 + 1.5 * density) - 1.0, 0.0) + closed * cluster * stood * (1.0 - wound);
  return 1.5 * dense + drawn;
}

// The low cloud: x how thick it is to the eye (0 to 1), y how high its tops stand there (0 to 1). The thin of it lets the sea
// through as water lets light through (the law of Beer), so nothing has a cut edge.
vec2 lowFieldNow(vec2 at) {
  float depth = lowDepthNow(at);
  lowSlope = vec2(0.0);
  // (The fall of the tops is read only where there is cloud to light.)
  if (depth <= 0.0) return vec2(0.0);
  vec3 a = pic(uMatStreaksNh, lowUvA, lowGA).rgb;
  vec3 b = pic(uMatPopcornNh, lowUvB, lowGB).rgb;
  vec3 c = vec3(0.5);
  if (lowWeigh.y > 0.0) c = pic(uMatSpecksNh, lowUvC, lowGC).rgb;
  vec3 d = vec3(0.5);
  vec3 e = vec3(0.5);
  if (lowNear.x > 0.0) d = mix(d, pic(uMatPopcornNh, lowUvD, lowGD).rgb, lowNear.x);
  if (lowNear.y > 0.0) e = mix(e, pic(uMatSpecksNh, lowUvE, lowGE).rgb, lowNear.y);
  // (A fall read in a lay is turned back to the ground: by the lay's own turn, then by the wind's.)
  vec2 inWind = 0.3 * (a.rg * 2.0 - 1.0) * vec2(1.0, 1.5) + 0.34 * lowWeigh.x * (b.rg * 2.0 - 1.0) * LOW_B + 0.53 * lowWeigh.y * (c.rg * 2.0 - 1.0) * LOW_C
    + 0.061 * (d.rg * 2.0 - 1.0) * LOW_D + 0.0167 * (e.rg * 2.0 - 1.0) * LOW_E;
  lowSlope = inWind * mat2(windFp.x, windFp.y, -windFp.y, windFp.x) / max(length(windFp), 1e-3);
  float thick = 1.0 - exp(-1.3 * max(depth, 0.0));
  return vec2(thick, clamp(depth / 3.5, 0.0, 1.0));
}

// The low field of the frame: the start's below orbit, the systems from orbit (weatherNow).
float lowDepth(vec2 at) {
  float now = weatherNow();
  if (now <= 0.0) {
    lowBody = 0.0;
    return lowDepthWas(at);
  }
  float systems = lowDepthNow(at);
  if (now >= 1.0) return systems;
  return mix(lowDepthWas(at), systems, now);
}

vec2 lowField(vec2 at) {
  float now = weatherNow();
  if (now <= 0.0) {
    lowBody = 0.0;
    return lowFieldWas(at);
  }
  vec2 systems = lowFieldNow(at);
  if (now >= 1.0) return systems;
  vec2 slope = lowSlope;
  vec2 start = lowFieldWas(at);
  lowSlope = mix(lowSlope, slope, now);
  return mix(start, systems, now);
}

// The ice far above (HIGH_KM): thin fibrous sheets and long threads drawn out along its own wind, which blows across the wind of
// the low field. at is a point of its own height. How thick, 0 to 1. It is the photograph of a veil of cirrus, thinned and
// thickened by a finer lay of wind streaks, and it fades to nothing through its own fibre.
vec2 highUvSheet = vec2(0.0);
vec2 highUvThread = vec2(0.0);
vec4 highGSheet = vec4(0.0);
vec4 highGThread = vec4(0.0);
// The ice without the fall of its tops (what a shadow needs).
float highDepthNow(vec2 at) {
  float far = smoothstep(240.0, 520.0, length(at - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))})));
  vec2 hv = at + uTime * vec2(6.5, -3.8);
  vec2 hs = hv;
  if (uLive > 0.0) {
    hv += uWx * vec2(52.0, -30.0);
    hs += uWx * vec2(62.0, -22.0);
  }
  // (The wind up there meanders too: a thread of ice is never straight for more than a hundred kilometres.)
  vec2 wander = vec2(95.0 * sin(hs.y / 260.0 + 1.3 * sin(hs.x / 410.0) + 0.9), 110.0 * sin(hs.x / 330.0 + 1.1 * sin(hs.y / 500.0) + 2.1));
  highUvSheet = mat2(0.9, 0.44, -0.44, 0.9) * (hv + 2.0 * wander) / 1000.0 + vec2(0.2, 0.6);
  highUvThread = mat2(0.84, 0.54, -0.54, 0.84) * (hs + wander) / vec2(900.0, 420.0) + vec2(0.7, 0.2);
  highGSheet = GRADS(highUvSheet) * 5.0;
  highGThread = GRADS(highUvThread) * 5.0;
  if (far <= 0.0) return 0.0;
  // (Where the ice stands at all: two soft swells that cross, carried with it. They are waves and not a picture or a noise of
  // cells, so the pattern has no corner, no step and no flat for the last sun to redden: the fibre of the photographs is all the
  // outline the ice has.)
  vec2 g = mat2(0.78, -0.62, 0.62, 0.78) * hv + vec2(1300.0, 600.0);
  vec2 h = mat2(0.5, 0.87, -0.87, 0.5) * hv;
  float wide = 0.5 + 0.5 * sin(g.x / 480.0 + 1.7 * sin(g.y / 620.0 + 0.4)) * sin(g.y / 530.0 + 1.3 * sin(g.x / 700.0 + 1.9));
  float fine = 0.5 + 0.5 * sin(h.x / 205.0 + 1.5 * sin(h.y / 260.0)) * sin(h.y / 225.0 + 1.2 * sin(h.x / 310.0 + 0.8));
  // (Away from the heart of the land more of the sky has ice in it, and the swells stand wider, so the sheets are of unlike
  // size, a few hundred kilometres to a thousand. That is a fact of the place and not of the time: the ice stands so before the
  // titan frame and after it, and only travels.)
  float more = smoothstep(380.0, 800.0, length(at - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))})));
  float where = mix(0.8, 1.0, more) * smoothstep(mix(0.6, 0.54, more), mix(0.96, 0.92, more), 0.6 * wide + 0.4 * fine) * (1.0 - 0.95 * smoothstep(0.08, 0.4, sunImage(at)));
  if (where <= 0.0) return 0.0;
  // (And it is ice of the open sea: over the land and round the cyclone, where the painted cover (sky/cover.png, green, read
  // wide and soft) keeps the low field off, a sheet that travels in thins to a breath, so the bone under it stays white.)
  where *= 0.12 + 0.88 * smoothstep(0.12, 0.4, textureLod(uCover, clamp((at - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0), 5.0).g);
  float sheet = cloudAt(uMatVeil, highUvSheet, highGSheet, 0.27);
  float thread = cloudAt(uMatStreaks, highUvThread, highGThread, 0.31);
  float depth = 0.1 * where * max(sheet * (0.6 + 0.4 * thread) - 0.7, 0.0);
  // (Ice in swaths over the land is not drawn: as straight drawn-out fibre it read as scratches on the plate.)
  return (1.0 - exp(-1.1 * max(depth, 0.0))) * far;
}

// The start's ice.
float highDepthWas(vec2 at) {
  float far = smoothstep(240.0, 520.0, length(at - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))})));
  vec2 hv = at + uTime * vec2(6.5, -3.8);
  vec2 hs = hv;
  if (uLive > 0.0) {
    hv += uWx * vec2(52.0, -30.0);
    hs += uWx * vec2(62.0, -22.0);
  }
  highUvSheet = mat2(0.9, 0.44, -0.44, 0.9) * hv / 1900.0 + vec2(0.2, 0.6);
  highUvThread = mat2(0.84, 0.54, -0.54, 0.84) * hs / vec2(1250.0, 900.0) + vec2(0.7, 0.2);
  highGSheet = GRADS(highUvSheet);
  highGThread = GRADS(highUvThread);
  if (far <= 0.0) return 0.0;
  // (Where the ice stands at all: two soft swells that cross, carried with it. They are waves and not a picture or a noise of
  // cells, so the pattern has no corner, no step and no flat for the last sun to redden: the fibre of the photographs is all the
  // outline the ice has.)
  vec2 g = mat2(0.78, -0.62, 0.62, 0.78) * hv + vec2(1300.0, 600.0);
  vec2 h = mat2(0.5, 0.87, -0.87, 0.5) * hv;
  float wide = 0.5 + 0.5 * sin(g.x / 480.0 + 1.7 * sin(g.y / 620.0 + 0.4)) * sin(g.y / 530.0 + 1.3 * sin(g.x / 700.0 + 1.9));
  float fine = 0.5 + 0.5 * sin(h.x / 205.0 + 1.5 * sin(h.y / 260.0)) * sin(h.y / 225.0 + 1.2 * sin(h.x / 310.0 + 0.8));
  // (Away from the heart of the land more of the sky has ice in it, and the swells stand wider, so the sheets are of unlike
  // size, a few hundred kilometres to a thousand. That is a fact of the place and not of the time: the ice stands so before the
  // titan frame and after it, and only travels.)
  float more = smoothstep(380.0, 800.0, length(at - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))})));
  float where = mix(0.8, 1.0, more) * smoothstep(mix(0.56, 0.47, more), mix(0.96, 0.9, more), 0.6 * wide + 0.4 * fine) * (1.0 - 0.95 * smoothstep(0.08, 0.4, sunImage(at)));
  if (where <= 0.0) return 0.0;
  // (And it is ice of the open sea: over the land and round the cyclone, where the painted cover (sky/cover.png, green, read
  // wide and soft) keeps the low field off, a sheet that travels in thins to a breath, so the bone under it stays white.)
  where *= 0.12 + 0.88 * smoothstep(0.12, 0.4, textureLod(uCover, clamp((at - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0), 5.0).g);
  float sheet = cloudAt(uMatVeil, highUvSheet, highGSheet, 0.27);
  float thread = cloudAt(uMatStreaks, highUvThread, highGThread, 0.31);
  float depth = sheet * mix(1.0, thread, 0.55) * where * 1.7 - 0.85;
  // (Ice in swaths over the land (sky/banks.png, blue) is not drawn: as straight drawn-out fibre it read as scratches on the plate.)
  return (1.0 - exp(-1.1 * max(depth, 0.0))) * far;
}

// The ice of the frame: the start's below orbit, the thinner threads from orbit (weatherNow).
float highDepth(vec2 at) {
  float now = weatherNow();
  if (now <= 0.0) return highDepthWas(at);
  float threads = highDepthNow(at);
  if (now >= 1.0) return threads;
  return mix(highDepthWas(at), threads, now);
}

float highField(vec2 at) {
  float thick = highDepth(at);
  highSlope = vec2(0.0);
  if (thick <= 0.0) return 0.0;
  highSlope = 0.6 * (pic(uMatVeilNh, highUvSheet, highGSheet).rg * 2.0 - 1.0) * mat2(0.9, 0.44, -0.44, 0.9) + 0.8 * (pic(uMatStreaksNh, highUvThread, highGThread).rg * 2.0 - 1.0) * mat2(0.84, 0.54, -0.54, 0.84);
  return thick;
}

// The cloud the land holds (sky/banks.png, made from the relief of the land by assets-src/reveal/sky/make_banks.py): x the bank a
// range holds on the flank that faces the wind (BANK_KM), y the fog that lies on the floors between ranges (FOG_KM), each as the
// light meets it (0 clear, 1 the thin of it, 3 a core). A bank stands where its range makes it and the cloud streams through it:
// the photographs it is made of are carried by the wind, the place it shows in is not. Not every range holds a bank on one day.
vec2 bankUvA = vec2(0.0);
vec2 bankUvB = vec2(0.0);
vec4 bankGA = vec4(0.0);
vec4 bankGB = vec4(0.0);
float bankNear = 0.0;
const mat2 BANK_A = mat2(0.6, 0.8, -0.8, 0.6);
const mat2 BANK_B = mat2(0.94, 0.34, -0.34, 0.94);
float bankHeld = 0.0;
float bankDepth(vec2 bankAt) {
  vec3 holds = texture2D(uBanks, clamp((bankAt - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0)).rgb;
  // (From orbit a bank keeps off the crests, the pale bone of a range (the blue of the same read): it lies in the valleys and
  // on the flanks, so no white puff sits on a white bone. Below orbit the ranges are not read as bones and nothing changes.)
  float held = holds.r * (1.0 - 0.92 * holds.b * smoothstep(700.0, 1300.0, uViewKm));
  bankHeld = 0.0;
  // (The sky stands clear over the lake of the Eye, where the rise begins.)
  float clear = smoothstep(100.0, 230.0, length(bankAt - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))})));
  bankNear = 0.0;
  // (The places the pictures are read at, before the way out: see lowDepth.)
  vec2 w = bankAt - uTime * 1.5 * LOW_DRIFT;
  if (uLive > 0.0) w -= uWx * vec2(27.0, 8.0);
  bankUvA = BANK_A * w / 420.0 + vec2(0.47, 0.11);
  bankUvB = BANK_B * w / 130.0 + vec2(0.29, 0.73);
  vec2 uvToday = bankAt / 2600.0 + vec2(0.21, 0.67);
  vec2 uvDrawn = WAS_A * w / vec2(560.0, 300.0) + vec2(0.71, 0.36);
  bankGA = GRADS(bankUvA);
  bankGB = GRADS(bankUvB);
  vec4 gToday = GRADS(uvToday);
  vec4 gDrawn = GRADS(uvDrawn);
  if (held * clear <= 0.004) return -0.6;
  float body = cloudAt(uMatPopcorn, bankUvA, bankGA, 0.34);
  float fine = 1.0;
  bankNear = 1.0 - smoothstep(420.0, 600.0, uViewKm);
  if (bankNear > 0.0) fine = mix(1.0, cloudAt(uMatSpecks, bankUvB, bankGB, 0.2), bankNear);
  // (The middle deck, the strongest of the picture, stands on every day.)
  float today = max(smoothstep(0.32, 0.6, pic(uCloudTile, uvToday, gToday, 3.0).b), smoothstep(0.4, 0.62, held));
  // (A bank is the wind's own cloud, caught: it is drawn out along the wind in streaks as the low field is, torn where the streak
  // photograph is clear and thin round its clusters, so no bank has the outline of the range that holds it.)
  float drawn = cloudAt(uMatStreaks, uvDrawn, gDrawn, 0.31);
  // (And it is made as the field is: knots of cumulus with air between them, crowded where the range holds them and few at
  // the edge of its hold, and the thin veil of the streak among them. What the range holds is how many knots stand, never
  // how bright one soft mass is: a bank has no outline to be a lump by.)
  float gather = held * today * clear;
  bankHeld = gather;
  // (Where the range holds it hardest the bank is one body, as cloud piled on a windward slope is: the knots have closed up,
  // and what is left of them is the lumped top of the bank, which the sun models. Out from there the body opens into knots
  // again, so the bank has a torn edge and no outline. Knots alone, all the way in, read as specks of snow on the range.)
  float core = smoothstep(0.25, 0.8, gather);
  float lumps = pow(body * mix(1.0, fine, 0.6), mix(1.5, 0.7, core));
  float dense = max(pow(drawn, mix(0.6, 0.25, core)) * lumps * (0.35 + 1.5 * gather) - mix(1.0, 0.48, core), 0.0);
  float thin = 0.3 * max(drawn * 1.6 * gather - 0.5, 0.0);
  return (dense + thin) * smoothstep(0.02, 0.2, gather) - 0.001;
}
vec2 fogUv = vec2(0.0);
vec4 fogG = vec4(0.0);
float fogVeil = 1.0;
float fogDepth(vec2 fogAt) {
  float held = texture2D(uBanks, clamp((fogAt - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0)).g;
  float clear = smoothstep(100.0, 230.0, length(fogAt - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))})));
  // (The places the pictures are read at, before the way out: see lowDepth.)
  vec2 w = fogAt - uTime * vec2(0.9, -0.5);
  if (uLive > 0.0) w -= uWx * vec2(3.0, -2.0);
  vec2 uvVeil = mat2(0.5, 0.87, -0.87, 0.5) * w / 520.0 + vec2(0.4, 0.9);
  vec2 uvToday = fogAt / 1900.0 + vec2(0.83, 0.37);
  fogUv = uvVeil;
  fogG = GRADS(uvVeil);
  vec4 gToday = GRADS(uvToday);
  if (held * clear <= 0.004) return 0.0;
  // (Fog lies level: its top has the soft fibre of a veil and no lumps, and it thins up the slopes through that fibre.)
  float veil = cloudAt(uMatVeil, uvVeil, fogG, 0.27);
  fogVeil = veil;
  float today = 0.55 + 0.45 * smoothstep(0.34, 0.62, pic(uCloudTile, uvToday, gToday, 3.0).b);
  // (How far a pool is filled, 0 to 1, with the fibre of its top: the sheet that draws it sets this against the height of the
  // ground, so the stratus lies in the valleys and its edge is the ground's own contour.)
  return held * today * clear * (0.8 + 0.3 * veil);
}

// The share of the sun that reaches a point of the ground under the cloud. Each height of cloud throws its own shadow, as far from
// itself as it stands high, so the shadow of the ice lies well off the shadow of the puffs under it.
float cloudShade(vec2 xz) {
  vec2 toSun = uSunDir.xz / max(uSunDir.y, 0.2);
  // From orbit the shadows are drawn longer than they fall, as relief is on a map, so that each height of cloud is seen to stand off the sea.
  float lift = mix(1.0, 3.0, smoothstep(150.0, 700.0, uViewKm));
  // (From orbit the shadow of the low field is read soft: sharp, every fleck of cloud had a dark twin cut to its own shape.)
  lowSoft = mix(1.0, 4.5, smoothstep(200.0, 700.0, uViewKm));
  float low = 1.0 - exp(-1.3 * max(lowDepth(xz + toSun * ${LOW_KM.toFixed(1)} * mix(min(lift, 1.7), 3.6, smoothstep(900.0, 2000.0, uViewKm))), 0.0));
  float high = highDepth(xz + toSun * ${HIGH_KM.toFixed(1)} * lift);
  // (The middle deck stands well off the ground, and its shadow is drawn well off it: that is what tells its height.)
  float bank = 1.0 - exp(-1.3 * max(bankDepth(xz + toSun * ${BANK_KM.toFixed(1)} * 2.2 * lift), 0.0));
  // (Under a deck of small cells the ground is dimmed as a whole as well: between the shadows of the cells the sun comes through
  // their thin, so the deck's shadow is one mottled body lying off it, not a scatter of dots lost among the cells.)
  bank = max(bank, 0.6 * smoothstep(0.15, 0.4, bankHeld));
  float standing = coverAt(xz + toSun * 6.5 * lift).b;
  // The cyclone shades the sea: a soft shadow, thrown well away from the sun.
  float fromStorm = length(xz + toSun * 110.0 - vec2(${f(X(AT.cyclone.x))}, ${f(Z(AT.cyclone.y))})) / ${f(1250 * KM)};
  float stormShade = pow(1.0 - smoothstep(0.02, 0.48, fromStorm), 1.3) * uArrive;
  return (1.0 - mix(0.55, 0.42, smoothstep(500.0, 1300.0, uViewKm)) * smoothstep(0.04, 0.6, low)) * (1.0 - 0.3 * high * uArrive) * (1.0 - 0.8 * bank * uArrive) * (1.0 - 0.16 * standing * uArrive) * (1.0 - 0.13 * stormShade);
}`;
