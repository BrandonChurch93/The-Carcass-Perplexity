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
vec3 lowCloud(vec2 xz) {
  vec2 drift = uTime * vec2(1.3, -0.35);
  vec3 cover = coverAt(xz);
  vec3 wide = texture2D(uCloudTile, (xz - drift) / 760.0).rgb;
  vec3 mid = texture2D(uCloudTile, (xz - drift * 1.15) / 173.0 + vec2(0.37, 0.61)).rgb;
  float close = 1.0 - smoothstep(60.0, 420.0, uViewKm);
  vec3 near = texture2D(uCloudTile, (xz - drift * 1.2) / 41.0 + vec2(0.13, 0.77)).rgb;
  float field = 0.56 * wide.r + 0.44 * mid.r + close * 0.16 * (near.r - 0.5);
  float share = cover.r + 0.55 * cover.b;
  float edge = mix(0.1, 0.05, close);
  float thick = smoothstep(1.0 - share, 1.0 - share + edge + 0.2 * share, field);
  float facing = 0.5 + (wide.g - 0.5) * 0.5 + (mid.g - 0.5) * 0.9 + close * (near.g - 0.5) * 0.6;
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

// The share of the sun that reaches a point of the ground under the cloud.
float cloudShade(vec2 xz) {
  vec2 toSun = uSunDir.xz / max(uSunDir.y, 0.2);
  float low = lowCloud(xz + toSun * ${LOW_KM.toFixed(1)}).x;
  float high = highCloud(xz + toSun * ${HIGH_KM.toFixed(1)});
  return (1.0 - 0.78 * low) * (1.0 - 0.3 * high);
}`;
