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

// The low cloud: x how thick (0 to 1), y how high its tops stand there (0 to 1).
// One field at every height of the camera: four photographs of cloud fields laid one inside the other, each about a third the size
// of the last (clusters, the cells in a cluster, the puffs in a cell, the lumps of a puff), and the share of the sky the field
// takes (the cover, slow noise that drifts with it, the lanes along the wind) says how deep into that relief the sea shows.
// A lay finer than a pixel falls to its mean by itself, so nothing is switched as the camera climbs.
vec2 lowField(vec2 at) {
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
    // (And the cells in a cluster and the puffs in a cell ride winds a little off each other: a cluster is seen to work, not to slide as a card.)
    wCell += uWx * vec2(2.2, -3.0);
    wPuff += uWx * vec2(-1.6, 2.4);
  }
  float torn = texture2D(uCloudTile, wSlow / 1100.0 + vec2(0.7, 0.2), 3.5).b;
  float slow = 0.6 * texture2D(uCloudTile, w / 2900.0 + vec2(0.15, 0.55), 4.0).b + 0.4 * torn;
  float lane = texture2D(uCloudTile, mat2(0.97, -0.24, 0.24, 0.97) * wLane / vec2(4200.0, 1150.0) + vec2(0.52, 0.18), 2.0).b;
  float banked = 0.25 + 0.75 * smoothstep(0.3, 0.52, lane);
  if (uLive > 0.0) banked = mix(banked, (0.05 + 1.1 * smoothstep(0.34, 0.6, lane)) * (0.1 + 1.3 * smoothstep(0.36, 0.62, torn)), 0.3 * smoothstep(0.0, 14.0, uWx));
  float share = amount * (0.12 + 0.88 * smoothstep(0.3, 0.66, slow + 0.2 * (amount - 0.6))) * banked * (0.45 + 0.55 * smoothstep(0.12, 0.45, limbCos(at)));

  // (Five lays, each a little under three times finer than the last, each turned its own way: 2400, 880, 330, 120 and 45 km a repeat.)
  vec3 cluster = cloudRelief(uMatCellsNh, w, mat2(0.97, -0.24, 0.24, 0.97), 2400.0, vec2(0.3, 0.7));
  vec3 cell = cloudRelief(uMatPopcornNh, wCell, mat2(0.8, 0.6, -0.6, 0.8), 880.0, vec2(0.13, 0.4));
  vec3 puff = cloudRelief(uMatSpecksNh, wPuff, mat2(0.28, 0.96, -0.96, 0.28), 330.0, vec2(0.61, 0.27));
  vec3 lump = cloudRelief(uMatPopcornNh, wCell, mat2(-0.6, 0.8, -0.8, -0.6), 120.0, vec2(0.83, 0.52));
  vec3 grain = cloudRelief(uMatSpecksNh, w, mat2(0.71, -0.7, 0.7, 0.71), 45.0, vec2(0.37, 0.91));
  float tops = 0.5 + 0.42 * (cluster.z - 0.5) + 0.42 * (cell.z - 0.5) + 0.36 * (puff.z - 0.5) + 0.3 * (lump.z - 0.5) + 0.24 * (grain.z - 0.5);
  lowSlope = 0.35 * cluster.xy + 0.7 * cell.xy + 0.7 * puff.xy + 0.6 * lump.xy + 0.5 * grain.xy;
  float least = mix(0.75, 0.5, share);
  float thick = smoothstep(least, least + 0.12, tops) * smoothstep(0.0, 0.1, share);
  return vec2(thick, tops);
}

// The ice far above (HIGH_KM): thin sheets and long threads drawn out along its own wind, which blows across the wind of the low
// field. at is a point of its own height. How thick, 0 to 1.
float highField(vec2 at) {
  vec2 hv = at + uTime * vec2(6.5, -3.8);
  vec2 hs = hv;
  if (uLive > 0.0) {
    hv += uWx * vec2(36.0, -21.0);
    hs += uWx * vec2(44.0, -16.0);
  }
  vec3 sheet = cloudRelief(uMatVeilNh, hv, mat2(0.9, 0.44, -0.44, 0.9), 1700.0, vec2(0.2, 0.6));
  vec3 thread = cloudRelief(uMatStreaksNh, hs, mat2(0.84, 0.54, -0.54, 0.84), 520.0, vec2(0.7, 0.2));
  float where = 0.6 * vnoise(hv / 1500.0 + 3.0) + 0.4 * vnoise(hv / 640.0 + 11.0);
  highSlope = 0.6 * sheet.xy + 0.8 * thread.xy;
  float least = mix(0.74, 0.5, smoothstep(0.45, 0.8, where));
  return smoothstep(least, least + 0.22, 0.5 + 0.5 * (sheet.z - 0.5) + 0.7 * (thread.z - 0.5)) * smoothstep(0.42, 0.6, where) * smoothstep(300.0, 1100.0, length(at - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))})));
}

// The share of the sun that reaches a point of the ground under the cloud. Each height of cloud throws its own shadow, as far from
// itself as it stands high, so the shadow of the ice lies well off the shadow of the puffs under it.
float cloudShade(vec2 xz) {
  vec2 toSun = uSunDir.xz / max(uSunDir.y, 0.2);
  // From orbit the shadows are drawn longer than they fall, as relief is on a map, so that each height of cloud is seen to stand off the sea.
  float lift = mix(1.0, 3.0, smoothstep(150.0, 700.0, uViewKm));
  float low = lowField(xz + toSun * ${LOW_KM.toFixed(1)} * lift).x;
  float high = highField(xz + toSun * ${HIGH_KM.toFixed(1)} * lift);
  float standing = coverAt(xz + toSun * 6.5 * lift).b;
  // The cyclone shades the sea: a soft shadow, thrown well away from the sun.
  float fromStorm = length(xz + toSun * 110.0 - vec2(${f(X(AT.cyclone.x))}, ${f(Z(AT.cyclone.y))})) / ${f(1250 * KM)};
  float stormShade = pow(1.0 - smoothstep(0.02, 0.48, fromStorm), 1.3) * uArrive;
  return (1.0 - mix(0.55, 0.78, smoothstep(300.0, 900.0, uViewKm)) * smoothstep(0.04, 0.6, low)) * (1.0 - 0.22 * high * uArrive) * (1.0 - 0.16 * standing * uArrive) * (1.0 - 0.13 * stormShade);
}`;
