// The cloud as one field of the world, so that the surface that takes its shade and the sheets that draw it read the same cloud.
// Where the weather stands comes from sky/cover.png (assets-src/reveal/sky/make_cover.py); what it looks like comes from the Builder's
// photographs of cloud from orbit (public/assets/reveal/mat). Lengths are kilometres, the drift is a pure function of the time.
import { AT, KM, X, Z } from './anchors';

/** The rectangle of the world the picture of the cover lies on: x and z of its corner, one over its width and its height. */
export const COVER_RECT: [number, number, number, number] = [X(-900), Z(-820), 1 / (8500 * KM), 1 / (((8500 * 9) / 16) * KM)];
/** Height over the sea, km: the low field of small cloud, the fronts, the veil of ice. */
export const LOW_KM = 2.6;
export const FRONT_KM = 6.5;
export const HIGH_KM = 10.5;
/** The fronts: centre x and y (px of the master), half size (px), turn (degrees). make_cover.py holds the same numbers. */
export const FRONTS: [number, number, number, number][] = [
  [4950, -180, 1250, 22],
  [500, 3750, 1150, -8],
];
/** Km a second: staged far faster than weather, so the held frame is seen to live. */
export const LOW_DRIFT: [number, number] = [3.6, 1.0];
export const FRONT_DRIFT: [number, number] = [1.7, -1.0];

const f = (n: number): string => n.toFixed(4);

export const WEATHER_GLSL = /* glsl */ `
uniform sampler2D uCloudTile;
uniform sampler2D uCover;
uniform sampler2D uMatPopcorn;
uniform sampler2D uMatStreaks;
uniform vec4 uCoverRect;

const vec2 LOW_DRIFT = vec2(${f(LOW_DRIFT[0])}, ${f(LOW_DRIFT[1])});
const vec2 FRONT_DRIFT = vec2(${f(FRONT_DRIFT[0])}, ${f(FRONT_DRIFT[1])});

vec3 coverAt(vec2 xz) {
  return texture2D(uCover, clamp((xz - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0)).rgb;
}

// How much cloud a photograph shows at a point: its light, once the dark floor of the sea under it is taken off.
float seen(vec3 c, float least, float full) {
  return smoothstep(least, full, dot(c, vec3(0.3, 0.55, 0.15)));
}

// One layer of puffs: the sea is cut in cells of a few kilometres, and a cell holds one round soft top or none.
float puffs(vec2 w, float cell, float share) {
  vec2 g = w / cell;
  vec2 id = floor(g);
  vec2 at = 0.5 + 0.4 * (vec2(hash12(id + 17.3), hash12(id + 41.7)) - 0.5);
  float size = mix(0.12, 0.34, hash12(id + 71.1) * hash12(id + 71.1));
  float d = length(fract(g) - at);
  return (1.0 - smoothstep(0.1 * size, 1.15 * size, d)) * step(hash12(id + 3.1), share) * (0.55 + 0.45 * hash12(id + 5.5));
}

// The photograph of the low field at a point of its own drifting ground: from near a field of small cumulus at its real size
// (laid at 150 km a repeat), from orbit the fine wind-drawn streaks that cover the sea (laid at 900 km a repeat). One read, two while they change over.
float lowPicture(vec2 w) {
  float away = smoothstep(330.0, 760.0, uViewKm);
  float pic = 0.0;
  if (away < 1.0) {
    // Small cumulus stand in streets along the wind, with clear sea between: thousands of separate puffs, each a few kilometres
    // across and far smaller than a valley. Where they stand comes from the photographs (the streaks say where a street runs, the
    // popcorn field how full it is); each puff is one soft round top, of its own size, in its own place.
    vec2 pw = mat2(0.8, 0.6, -0.6, 0.8) * w;
    float street = dot(texture2D(uMatStreaks, mat2(0.9, 0.44, -0.44, 0.9) * w / vec2(880.0, 520.0) + vec2(0.4, 0.1), 1.5).rgb, vec3(0.3, 0.55, 0.15));
    float full = dot(texture2D(uMatPopcorn, pw / 260.0 + vec2(0.13, 0.4), 3.0).rgb, vec3(0.3, 0.55, 0.15));
    float share = 0.006 + 0.98 * smoothstep(0.24, 0.4, street) * (0.5 + 0.5 * smoothstep(0.06, 0.26, full));
    float puff = max(max(puffs(pw, 3.6, share), puffs(mat2(0.6, 0.8, -0.8, 0.6) * w + 31.0, 5.0, share)), puffs(mat2(0.96, -0.28, 0.28, 0.96) * w + 77.0, 2.6, share));
    pic += (1.0 - away) * puff;
  }
  if (away > 0.0) {
    // From orbit: the streaks, laid fine and finer, so the sea is covered in thin torn lines along the wind and nothing is a clump.
    vec2 sw = mat2(0.97, -0.24, 0.24, 0.97) * w;
    float wideLay = seen(texture2D(uMatStreaks, sw / vec2(840.0, 620.0) + vec2(0.3, 0.7)).rgb, 0.3, 0.8);
    float fineLay = seen(texture2D(uMatStreaks, sw / vec2(430.0, 300.0) + vec2(0.7, 0.2)).rgb, 0.36, 0.85);
    pic += away * (0.6 * wideLay + 0.75 * fineLay * (0.25 + 0.75 * wideLay));
  }
  return pic;
}

// The ground of the low field: the world, read through a slow bend so the streets curve, and drifting.
vec2 lowGround(vec2 at) {
  return at + 90.0 * vec2(sin(at.y / 610.0 + 1.3 * sin(at.x / 1130.0)), sin(at.x / 870.0 + 1.7 * sin(at.y / 1370.0))) - uTime * LOW_DRIFT;
}

// The low cloud: x how thick (0 to 1), y the photograph's own light there (the build of its tops).
// The share of the sky it takes comes from the cover and from slow noise that drifts with it: thick here, torn there, clear between.
vec2 lowField(vec2 at) {
  vec2 w = lowGround(at);
  // The sky stands clear over the lake of the Eye, where the rise begins.
  float amount = coverAt(at).g * smoothstep(100.0, 230.0, length(at - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))})));
  float slow = 0.6 * texture2D(uCloudTile, w / 2900.0 + vec2(0.15, 0.55), 4.0).b + 0.4 * texture2D(uCloudTile, w / 1100.0 + vec2(0.7, 0.2), 3.5).b;
  // From orbit the field is seen whole: an even scatter over all the sea, a little thicker here and thinner there.
  float even = smoothstep(330.0, 760.0, uViewKm);
  float field = amount * (mix(0.45, 0.5, even) + mix(0.55, 0.5, even) * smoothstep(0.34, 0.72, slow + 0.2 * (amount - 0.6)));
  float pic = lowPicture(w);
  // The field takes its share of the photograph's cloud softly: thick here, thin there, and nowhere cut to an edge.
  float thick = min(1.0, 1.1 * pic) * smoothstep(0.0, 0.5, field);
  return vec2(thick, pic);
}

// The share of the sun that reaches a point of the ground under the cloud.
float cloudShade(vec2 xz) {
  vec2 toSun = uSunDir.xz / max(uSunDir.y, 0.2);
  // From orbit the shadows are drawn longer than they fall, as relief is on a map, so that each height of cloud is seen to stand off the sea.
  float lift = mix(1.0, 3.0, smoothstep(150.0, 700.0, uViewKm));
  float low = lowField(xz + toSun * ${LOW_KM.toFixed(1)} * lift).x;
  vec2 under = xz + toSun * ${FRONT_KM.toFixed(1)} * lift;
  float front = coverAt(under - uTime * FRONT_DRIFT).r;
  float standing = coverAt(under).b;
  return (1.0 - mix(0.5, 0.72, smoothstep(300.0, 900.0, uViewKm)) * smoothstep(0.04, 0.6, low)) * (1.0 - 0.1 * front * uArrive) * (1.0 - 0.16 * standing * uArrive);
}`;

/** The two fronts as GLSL: the plate read at a point of the world (km), x how thick, y its light. */
export const FRONTS_GLSL = /* glsl */ `
vec2 frontPlate(sampler2D plate, vec2 at, vec2 shift) {
  vec2 best = vec2(0.0);
${FRONTS.map(([cx, cy, half, turn]) => {
  const c = Math.cos((turn * Math.PI) / 180);
  const s = Math.sin((turn * Math.PI) / 180);
  return `  {
    vec2 q = mat2(${f(c)}, ${f(-s)}, ${f(s)}, ${f(c)}) * (at - vec2(${f(X(cx))}, ${f(Z(cy))})) / ${f(2 * half * KM)} + 0.5 + shift;
    vec2 m = min(q, 1.0 - q);
    float lum = dot(texture2D(plate, clamp(q, 0.0, 1.0)).rgb, vec3(0.3, 0.55, 0.15)) * smoothstep(0.0, 0.03, min(m.x, m.y));
    best = max(best, vec2(smoothstep(0.2, 0.9, lum), lum));
  }`;
}).join('\n')}
  return best;
}`;
