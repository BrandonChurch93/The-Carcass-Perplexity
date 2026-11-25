// The cloud as one field of the world, so that the surface that takes its shade and the sheets that draw it read the same cloud.
// The pictures come from assets-src/reveal/sky/make_sky.py. Lengths are kilometres, the drift is a pure function of the time.
import { KM, X, Z } from './anchors';

/** The rectangle of the world the picture of the cover lies on: x and z of its corner, one over its width and its height. */
export const COVER_RECT: [number, number, number, number] = [X(-900), Z(-820), 1 / (8500 * KM), 1 / (((8500 * 9) / 16) * KM)];
/** Height of the low cloud and of the high cloud over the sea, km. */
export const LOW_KM = 2.6;
export const HIGH_KM = 10.5;

export const WEATHER_GLSL = /* glsl */ `
uniform sampler2D uCloudTile;
uniform sampler2D uCloudCover;
uniform vec4 uCoverRect;

vec3 coverAt(vec2 xz) {
  return texture2D(uCloudCover, clamp((xz - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0)).rgb;
}

// The low cloud: x how thick (0 to 1), y how much it faces the sun (0.5 is level), z how fine its edge is drawn.
// Fields of cells, each a few km across, in streets and clumps: the share of the sky they take comes from the cover.
vec3 lowCloud(vec2 at) {
  vec2 drift = uTime * vec2(1.3, -0.35);
  float px = fwidth(at.x) + fwidth(at.y);
  float away = smoothstep(0.25, 1.6, px);
  // The wind is not straight: the whole field is read through a slow bend, so its streets curve.
  vec2 bend = vec2(sin(at.y / 610.0 + 1.3 * sin(at.x / 1130.0)), sin(at.x / 870.0 + 1.7 * sin(at.y / 1370.0)));
  vec2 xz = at + 130.0 * bend;
  vec3 cover = coverAt(at);
  vec3 wide = texture2D(uCloudTile, (xz - drift) / 760.0).rgb;
  vec3 mid = texture2D(uCloudTile, (xz - drift * 1.15) / 173.0 + vec2(0.37, 0.61)).rgb;
  // The same cells again, turned and at another size, so no street of them is seen twice.
  vec2 turned = mat2(0.8, 0.6, -0.6, 0.8) * (xz - drift * 1.1);
  vec3 other = texture2D(uCloudTile, turned / 109.0 + vec2(0.71, 0.18)).rgb;
  float close = 1.0 - smoothstep(60.0, 420.0, uViewKm);
  vec3 near = texture2D(uCloudTile, (xz - drift * 1.2) / 41.0 + vec2(0.13, 0.77)).rgb;
  float share = 0.74 * smoothstep(0.2, 0.62, cover.r) + 0.4 * cover.b;
  // Where the fields of cloud are, and in them the cells: the fuller the field, the more of its cells have grown.
  float systems = mix(0.8 * wide.r + 0.2 * mid.r, 0.45 * wide.r + 0.55 * wide.b, away);
  float fieldOf = smoothstep(0.9 - 1.25 * share, 1.45 - 1.25 * share, systems) * smoothstep(0.0, 0.06, share);
  // From far no sea is quite clear of cloud: between the fields there is thin broken cloud.
  fieldOf = mix(fieldOf, 0.3 * smoothstep(0.02, 0.2, share) + 0.7 * fieldOf, away);
  float cells = 0.42 * mid.r + 0.38 * other.r + 0.2 * wide.r + close * 0.16 * (near.r - 0.5);
  float least = mix(0.78, 0.46, fieldOf);
  // The edge of a cell is as soft as the eye is far: a puff from orbit, a hard head only from near.
  float soft = mix(mix(0.2, 0.1, close), 0.3, smoothstep(0.4, 3.0, px));
  float thick = smoothstep(least - 0.35 * (soft - 0.15), least + 0.65 * soft, cells);
  // From far the cells are grains, and what is seen is how the wind has drawn them out: torn lines of grains with a thin veil round them.
  float lines = 0.62 * wide.b + 0.38 * mid.b;
  float drawn = smoothstep(0.74 - 0.3 * fieldOf, 1.02 - 0.3 * fieldOf, lines);
  float grains = 0.55 * mid.r + 0.45 * other.r;
  float edge = mix(0.98, 0.42, drawn);
  float torn = max(0.92 * smoothstep(edge, edge + 0.3, grains), 0.22 * drawn * drawn);
  thick = mix(thick, torn, away);
  // Past the size a pixel can show, the cells are seen as their share of the field.
  float coarse = smoothstep(3.0, 9.0, px);
  thick = mix(thick, 0.5 * fieldOf * fieldOf, coarse);
  float facing = 0.5 + (wide.g - 0.5) * 0.3 + (mid.g - 0.5) * 0.8 + (other.g - 0.5) * 0.6 + close * (near.g - 0.5) * 0.6;
  return vec3(thick, facing, mid.r);
}

// The high cloud: thin streaks of ice drawn out along the wind.
float highCloud(vec2 xz) {
  vec2 drift = uTime * vec2(2.6, -0.9);
  vec3 cover = coverAt(xz);
  float wide = texture2D(uCloudTile, (xz - drift) / 2300.0 + vec2(0.21, 0.4)).b;
  float mid = texture2D(uCloudTile, (xz - drift * 1.1) / 610.0).b;
  float field = 0.6 * wide + 0.4 * mid;
  return smoothstep(1.0 - cover.g, 1.0 - cover.g + 0.35, field);
}

// The middle cloud: wide thin sheets, rippled, between the two.
float midCloud(vec2 xz) {
  vec2 drift = uTime * vec2(1.9, -0.6);
  vec3 cover = coverAt(xz);
  float sheet = texture2D(uCloudTile, (xz - drift) / 3300.0 + vec2(0.55, 0.12)).r;
  float ripple = texture2D(uCloudTile, (xz - drift) / 290.0 + vec2(0.4, 0.9)).r;
  float fine = texture2D(uCloudTile, (xz - drift * 1.1) / 67.0).r;
  float streaks = texture2D(uCloudTile, (xz - drift) / 900.0 + vec2(0.1, 0.3)).b;
  float wisp = texture2D(uCloudTile, (xz - drift * 1.05) / 260.0 + vec2(0.6, 0.2)).b;
  return smoothstep(0.62, 1.15, sheet) * smoothstep(0.12, 0.3, cover.g) * smoothstep(0.45, 1.0, 0.3 * ripple + 0.15 * fine + 0.45 * streaks + 0.4 * wisp);
}

// The share of the sun that reaches a point of the ground under the cloud.
float cloudShade(vec2 xz) {
  vec2 toSun = uSunDir.xz / max(uSunDir.y, 0.2);
  float low = lowCloud(xz + toSun * ${LOW_KM.toFixed(1)}).x;
  float high = highCloud(xz + toSun * ${HIGH_KM.toFixed(1)});
  float mid = midCloud(xz + toSun * 5.5);
  return (1.0 - 0.78 * low) * (1.0 - 0.3 * high) * (1.0 - 0.4 * mid);
}`;
