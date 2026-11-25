// The cloud as one field of the world, so that the surface that takes its shade and the sheets that draw it read the same cloud.
// The pictures come from assets-src/reveal/sky/make_sky.py. Lengths are kilometres, the drift is a pure function of the time.
import { AT, KM, X, Z } from './anchors';

/** The rectangle of the world the picture of the cover lies on: x and z of its corner, one over its width and its height. */
export const COVER_RECT: [number, number, number, number] = [X(-900), Z(-820), 1 / (8500 * KM), 1 / (((8500 * 9) / 16) * KM)];
/** Height of the low cloud and of the high cloud over the sea, km. */
export const LOW_KM = 2.6;
export const HIGH_KM = 10.5;
/**
 * The dearer light of the cloud: the shade of the middle cloud on the ground, and the shade the high and the middle cloud throw on the low
 * cloud read at the place the sun's ray crosses them (not straight above). It costs about 0.5 s a sample at 3840 x 2160 and shows very little.
 */
export const FULL_SHADE = false;

export const WEATHER_GLSL = /* glsl */ `
uniform sampler2D uCloudTile;
uniform sampler2D uCloudCover;
uniform sampler2D uMatCells;
uniform sampler2D uMatStreets;
uniform sampler2D uMatVeil;
uniform vec4 uCoverRect;

// Where the storm on the spine stands: it is drawn by its own sheet, and no front lies over it.
const vec2 STORM_AT = vec2(${X(AT.storm.x).toFixed(2)}, ${Z(AT.storm.y).toFixed(2)});

vec3 coverAt(vec2 xz) {
  return texture2D(uCloudCover, clamp((xz - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0)).rgb;
}

// How much cloud a photograph shows at a point: its light, once the dark floor of the sea is taken off.
float seen(vec3 c, float least, float full) {
  return smoothstep(least, full, dot(c, vec3(0.3, 0.55, 0.15)));
}
// A field that is only partly grown keeps the thickest of its cloud and loses the rest.
float grown(float pic, float amount) {
  return pic * smoothstep(-0.08, 0.42, pic - 1.1 * (1.0 - amount));
}

vec2 cellHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

// A scatter of points, one to a square: how far the nearest is, and the next. Between them lie the walls of the cells of the cold sea.
vec2 cellsOf(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  float a = 8.0;
  float b = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = g + cellHash(i + g) - f;
      float d = dot(o, o);
      if (d < a) {
        b = a;
        a = d;
      } else if (d < b) {
        b = d;
      }
    }
  }
  return sqrt(vec2(a, b));
}

// The low cloud: x how thick (0 to 1), y how much it faces the sun (0.5 is level), z how fine its edge is drawn.
// Fields of cells, each a few km across, in streets and clumps: the share of the sky they take comes from the cover.
vec3 lowCloud(vec2 at) {
  vec2 drift = uTime * vec2(1.3, -0.35);
  float px = fwidth(at.x) + fwidth(at.y);
  float away = smoothstep(150.0, 700.0, uViewKm);
  // The wind is not straight: the whole field is read through a slow bend, so its streets curve.
  vec2 bend = vec2(sin(at.y / 610.0 + 1.3 * sin(at.x / 1130.0)), sin(at.x / 870.0 + 1.7 * sin(at.y / 1370.0)));
  vec2 xz = at + 130.0 * bend;
  vec3 cover = coverAt(at);
  vec3 wide = texture2D(uCloudTile, (xz - drift) / 760.0).rgb;
  float thick = 0.0;
  float facing = 0.5;
  float fieldOf = 0.0;
  // The near look, for the first of the rise: it is not worked out once the eye is far.
  if (away < 1.0) {
    vec3 mid = texture2D(uCloudTile, (xz - drift * 1.15) / 173.0 + vec2(0.37, 0.61)).rgb;
    // The same cells again, turned and at another size, so no street of them is seen twice.
    vec2 turned = mat2(0.8, 0.6, -0.6, 0.8) * (xz - drift * 1.1);
    vec3 other = texture2D(uCloudTile, turned / 109.0 + vec2(0.71, 0.18)).rgb;
    float close = 1.0 - smoothstep(60.0, 420.0, uViewKm);
    vec3 near = vec3(0.5);
    if (close > 0.0) near = texture2D(uCloudTile, (xz - drift * 1.2) / 41.0 + vec2(0.13, 0.77)).rgb;
    float share = 0.74 * smoothstep(0.2, 0.62, cover.r) + 0.4 * cover.b * (1.0 - away);
    // Where the fields of cloud are, and in them the cells: the fuller the field, the more of its cells have grown.
    float systems = mix(0.8 * wide.r + 0.2 * mid.r, 0.45 * wide.r + 0.55 * wide.b, away);
    fieldOf = smoothstep(0.9 - 1.25 * share, 1.45 - 1.25 * share, systems) * smoothstep(0.0, 0.06, share);
    float cells = 0.42 * mid.r + 0.38 * other.r + 0.2 * wide.r + close * 0.16 * (near.r - 0.5);
    float least = mix(0.93, 0.46, fieldOf) + 0.06 * close;
    // The edge of a cell is as soft as the eye is far: a puff from orbit, a hard head only from near.
    float soft = mix(mix(0.3, 0.36, close), 0.3, smoothstep(100.0, 900.0, uViewKm));
    thick = smoothstep(least - 0.35 * (soft - 0.15), least + 0.65 * soft, cells);
    facing = 0.5 + (wide.g - 0.5) * 0.3 + (mid.g - 0.5) * 0.8 + (other.g - 0.5) * 0.6 + close * (near.g - 0.5) * 0.6;
  }
  // From far the cloud is what a photograph from orbit shows (public/assets/reveal/mat): this place's own large fields decide where the
  // weather stands, the pictures decide what it looks like. Each picture is read twice, turned and at another size, and the two are
  // changed over by slow noise, so that no repeat is seen.
  float slow = texture2D(uCloudTile, (xz - drift) / 2300.0 + vec2(0.15, 0.55)).b;
  float shore = texture2D(uCloudCover, clamp((at - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0), 6.5).b;
  float overBody = smoothstep(0.004, 0.03, shore);
  float body = cover.r + 0.3 * (slow - 0.5) + 0.3 * (wide.b - 0.5);
  body -= 0.6 * (1.0 - smoothstep(0.6, 1.5, length((at - STORM_AT) / vec2(340.0, 460.0))));
  if (away > 0.0) {
    vec2 w = xz - drift;
    float c1 = seen(texture2D(uMatCells, mat2(0.8, 0.6, -0.6, 0.8) * w / 500.0 + vec2(0.13, 0.4)).rgb, 0.17, 0.78);
    float c2 = seen(texture2D(uMatCells, mat2(-0.28, 0.96, -0.96, -0.28) * w / 690.0 + vec2(0.6, 0.21)).rgb, 0.17, 0.78);
    float s1 = seen(texture2D(uMatStreets, mat2(0.92, -0.39, 0.39, 0.92) * w / 400.0 + vec2(0.3, 0.7)).rgb, 0.1, 0.78);
    float s2 = seen(texture2D(uMatStreets, mat2(0.31, 0.95, -0.95, 0.31) * w / 560.0 + vec2(0.8, 0.1)).rgb, 0.1, 0.78);
    float cellPic = mix(c1, c2, smoothstep(0.42, 0.58, wide.r));
    float region = smoothstep(-0.25, 0.25, sin(at.x / 1900.0 + 2.0 * sin(at.y / 1500.0)));
    float streetPic = mix(s1, s2, region);
    // Weather comes in few large systems with clear sea between them: whole regions of the ocean carry none.
    float system = cover.r + 0.55 * (slow - 0.5);
    float cold = smoothstep(0.0, 0.4, sin(at.x / 1400.0 + 1.9 * sin(at.y / 1150.0) + 2.4));
    // Cells stand over the cold sea, streets where the wind runs off it; over the body the sky is nearly clear.
    float cellField = smoothstep(0.54, 0.78, system) * cold;
    float streetField = smoothstep(0.52, 0.78, system) * (1.0 - cold);
    float field = max(grown(cellPic, cellField), grown(streetPic, streetField)) * (1.0 - 0.85 * overBody);
    // A front is a deck: smooth and bright along its spine, lumped by its cells, ragged where it thins.
    float lumped = 0.5 * c2 + 0.5 * s1;
    float spine = smoothstep(0.8, 0.98, body) * (0.42 + 0.42 * lumped);
    float front = max(spine, grown(lumped, smoothstep(0.56, 0.9, body))) * mix(1.0, 0.4, overBody);
    thick = mix(thick, max(field, front), away);
    // The photographs carry the build of the tops: bright heads, grey between them.
    facing = mix(facing, 0.28 + 0.62 * max(lumped, max(cellPic * cellField, streetPic * streetField)), away);
  }
  // Past the size a pixel can show, the cells are seen as their share of the field.
  float coarse = smoothstep(9.0, 26.0, px);
  thick = mix(thick, mix(0.5 * fieldOf * fieldOf, 0.7 * thick, away), coarse);
  return vec3(thick, facing, wide.r);
}

// The high cloud: thin streaks of ice drawn out along the wind.
float highCloud(vec2 xz) {
  // The wind aloft runs across the wind below, and the other way: in the rise the veil is seen to move against the deck.
  vec2 drift = uTime * vec2(-1.9, 1.2);
  vec3 cover = coverAt(xz);
  mat2 aloft = mat2(0.34, -0.94, 0.94, 0.34);
  vec2 w = aloft * (xz - drift);
  float wide = texture2D(uCloudTile, w / 2300.0 + vec2(0.21, 0.4)).b;
  float amount = smoothstep(1.0 - cover.g, 1.0 - cover.g + 0.35, wide);
  float fibres = seen(texture2D(uMatVeil, w / 800.0 + vec2(0.4, 0.15)).rgb, 0.12, 0.6);
  float other = seen(texture2D(uMatVeil, mat2(0.9, 0.44, -0.44, 0.9) * w / 1270.0 + vec2(0.7, 0.3)).rgb, 0.12, 0.6);
  return grown(mix(fibres, other, smoothstep(0.4, 0.6, texture2D(uCloudTile, w / 1700.0).r)), amount);
}

// The middle cloud: wide thin sheets, rippled, between the two.
float midCloud(vec2 xz) {
  vec2 drift = uTime * vec2(1.9, -0.6);
  vec3 cover = coverAt(xz);
  float sheet = texture2D(uCloudTile, (xz - drift) / 3300.0 + vec2(0.55, 0.12)).r;
  vec3 ripple = texture2D(uCloudTile, (xz - drift) / 290.0 + vec2(0.4, 0.9)).rgb;
  return smoothstep(0.62, 1.15, sheet) * smoothstep(0.12, 0.3, cover.g) * smoothstep(0.45, 1.0, 0.5 * ripple.r + 0.8 * ripple.b);
}

// The share of the sun that reaches a point of the ground under the cloud.
float cloudShade(vec2 xz) {
  vec2 toSun = uSunDir.xz / max(uSunDir.y, 0.2);
  // From orbit the shadows are drawn longer than they fall, as relief is on a map, so that each height of cloud is seen to stand off the sea.
  float lift = mix(1.0, 3.0, smoothstep(150.0, 700.0, uViewKm));
  float low = lowCloud(xz + toSun * ${LOW_KM.toFixed(1)} * lift).x;
  float high = highCloud(xz + toSun * ${HIGH_KM.toFixed(1)} * mix(1.0, 2.0, smoothstep(150.0, 700.0, uViewKm)));
  float mid = ${FULL_SHADE ? 'midCloud(xz + toSun * 5.5)' : '0.0'};
  return (1.0 - 0.78 * smoothstep(0.08, 0.7, low)) * (1.0 - 0.3 * high) * (1.0 - 0.4 * mid);
}`;
