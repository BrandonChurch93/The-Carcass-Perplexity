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
uniform vec4 uCoverRect;

// Where the storm on the spine stands: it is drawn by its own sheet, and no front lies over it.
const vec2 STORM_AT = vec2(${X(AT.storm.x).toFixed(2)}, ${Z(AT.storm.y).toFixed(2)});

vec3 coverAt(vec2 xz) {
  return texture2D(uCloudCover, clamp((xz - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0)).rgb;
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
  float fieldOf = smoothstep(0.9 - 1.25 * share, 1.45 - 1.25 * share, systems) * smoothstep(0.0, 0.06, share);
  float cells = 0.42 * mid.r + 0.38 * other.r + 0.2 * wide.r + close * 0.16 * (near.r - 0.5);
  float least = mix(0.93, 0.46, fieldOf) + 0.06 * close;
  // The edge of a cell is as soft as the eye is far: a puff from orbit, a hard head only from near.
  float soft = mix(mix(0.3, 0.36, close), 0.3, smoothstep(100.0, 900.0, uViewKm));
  float thick = smoothstep(least - 0.35 * (soft - 0.15), least + 0.65 * soft, cells);
  // From far the cells are grains, and what is seen is how the wind has drawn them out: torn lines of grains with a thin veil round them.
  // (The wind does not blow one way over a whole ocean: in some regions the lines run across the others.)
  float crossed = texture2D(uCloudTile, mat2(0.26, 0.97, -0.97, 0.26) * (xz - drift) / 640.0 + vec2(0.4, 0.1)).b;
  float region = smoothstep(-0.25, 0.25, sin(at.x / 1900.0 + 2.0 * sin(at.y / 1500.0)));
  float lines = mix(0.62 * wide.b + 0.38 * mid.b, 0.7 * crossed + 0.3 * other.b, region);
  float drawn = smoothstep(0.74 - 0.3 * fieldOf, 1.02 - 0.3 * fieldOf, lines);
  float grains = 0.55 * mid.r + 0.45 * other.r;
  float edge = mix(0.98, 0.42, drawn);
  float torn = max(0.86 * smoothstep(edge - 0.06, edge + 0.42, grains), 0.22 * drawn * drawn);
  float slow = texture2D(uCloudTile, (xz - drift) / 2300.0 + vec2(0.15, 0.55)).b;
  // Weather comes in systems with clear sea between them: whole regions of the ocean carry none.
  float present = smoothstep(0.34, 0.56, cover.r + 0.5 * (slow - 0.5));
  // Over the cold sea the cloud stands in cells, tens of km each: closed ones (a pavement of cloud, thin clear joints) and
  // open ones (rings of cloud round clear middles). The cells are not of one size: the scatter is read through the bent wind.
  float shore = texture2D(uCloudCover, clamp((at - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0), 6.5).b;
  float lumps = 0.5 * wide.r + 0.5 * mid.r;
  float cold = smoothstep(0.0, 0.4, sin(at.x / 1400.0 + 1.9 * sin(at.y / 1150.0) + 2.4));
  float held = smoothstep(0.46, 0.64, cover.r + 0.6 * (slow - 0.5)) * (1.0 - smoothstep(0.003, 0.02, shore));
  float celled = 0.0;
  // (The scatter is only worked out where there are cells to draw: it is the dear part of the cloud.)
  if (cold * held * away > 0.0) {
    vec2 lean = 26.0 * vec2(vnoise(xz / 160.0 + 2.0), vnoise(xz / 160.0 + 15.0));
    vec2 walls = cellsOf((xz - drift + lean) / 42.0);
    // From nearer a cell is seen to be made of heads: its edge is ragged and its top is broken.
    float inner = 1.0 - smoothstep(450.0, 1300.0, uViewKm);
    float reach = walls.x + 0.22 * (lumps - 0.5) + (0.1 + 0.3 * inner) * (grains - 0.5);
    // A closed cell is a round pillow over its own middle; an open one a ring of cloud round a clear middle.
    float closed = (1.0 - smoothstep(0.3, 0.6, reach)) * mix(0.7 + 0.3 * smoothstep(0.25, 0.6, grains), 0.35 + 0.65 * smoothstep(0.3, 0.62, grains), inner);
    float open = (1.0 - smoothstep(0.02, 0.27, abs(reach - 0.47 + 0.12 * (lumps - 0.5)))) * smoothstep(0.28, 0.6, 0.5 * lumps + 0.5 * grains);
    float openness = smoothstep(-0.2, 0.2, sin(at.x / 620.0 - at.y / 830.0 + 2.0 * sin(at.y / 540.0)));
    celled = 0.85 * mix(closed, open, openness) * held;
  }
  // Small puffs stand only over the land and off its coasts, where the ground warms the air.
  float puffs = 0.5 * smoothstep(0.012, 0.05, shore) * (1.0 - smoothstep(0.07, 0.14, shore)) * smoothstep(0.58, 0.9, lumps) * smoothstep(0.42, 1.0, grains);
  thick = mix(thick, max(mix(torn * present, celled, cold), puffs), away);
  // A front is a closed deck: a nearly whole sheet, lumped by its cells and torn at its edges.
  float body = cover.r + 0.3 * (slow - 0.5) + 0.3 * (wide.b - 0.5) + 0.05 * (mid.b - 0.5);
  body -= 0.6 * (1.0 - smoothstep(0.6, 1.5, length((at - STORM_AT) / vec2(340.0, 460.0))));
  float deck = smoothstep(0.62, 0.9, body);
  // Over the land a front breaks on the ranges and thins to a veil, so the ground is seen through it.
  deck *= mix(1.0, 0.4, smoothstep(0.01, 0.05, shore) * away);
  thick = max(thick, deck * (0.5 + 0.42 * smoothstep(0.1, 0.9, 0.45 * mid.b + 0.3 * wide.r + 0.25 * mid.r)));
  // Round the deck a thin veil, drawn out along the wind.
  thick = max(thick, 0.3 * smoothstep(0.5, 0.7, body) * smoothstep(0.3, 0.8, 0.6 * wide.b + 0.4 * mid.b));
  // Past the size a pixel can show, the cells are seen as their share of the field.
  float coarse = smoothstep(9.0, 26.0, px);
  thick = mix(thick, 0.5 * fieldOf * fieldOf, coarse);
  float facing = 0.5 + (wide.g - 0.5) * 0.3 + (mid.g - 0.5) * 0.8 + (other.g - 0.5) * 0.6 + close * (near.g - 0.5) * 0.6;
  return vec3(thick, facing, mid.r);
}

// The high cloud: thin streaks of ice drawn out along the wind.
float highCloud(vec2 xz) {
  // The wind aloft runs across the wind below, and the other way: in the rise the veil is seen to move against the deck.
  vec2 drift = uTime * vec2(-1.9, 1.2);
  vec3 cover = coverAt(xz);
  mat2 aloft = mat2(0.34, -0.94, 0.94, 0.34);
  float wide = texture2D(uCloudTile, aloft * (xz - drift) / 2300.0 + vec2(0.21, 0.4)).b;
  float mid = texture2D(uCloudTile, aloft * (xz - drift * 1.1) / 610.0).b;
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
  // From orbit the shadows are drawn longer than they fall, as relief is on a map, so that each height of cloud is seen to stand off the sea.
  float lift = mix(1.0, 3.0, smoothstep(150.0, 700.0, uViewKm));
  float low = lowCloud(xz + toSun * ${LOW_KM.toFixed(1)} * lift).x;
  float high = highCloud(xz + toSun * ${HIGH_KM.toFixed(1)} * mix(1.0, 2.0, smoothstep(150.0, 700.0, uViewKm)));
  float mid = ${FULL_SHADE ? 'midCloud(xz + toSun * 5.5)' : '0.0'};
  return (1.0 - 0.78 * low) * (1.0 - 0.3 * high) * (1.0 - 0.4 * mid);
}`;
