// Where the shore sheet is read for a place on the ground, so that no repeat of it can be found. The ground is cut into bands
// by a slow noise, and each band lays the sheet turned and shifted its own way. Where two bands meet, the stone that stands
// higher of the two layings is the one that is seen, so the join runs round the stones and never through one. Everything that
// reads the sheet at the size of the lip (land/lip.ts, the near ground of land/rock.ts, the bed of the lake by the shore) asks
// here, so a stone half in the water is one stone. It stands by itself and can be put in a vertex shader.
export const SHORE_LAY_GLSL = /* glsl */ `
float shoreNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  f = f * f * (3.0 - 2.0 * f);
  vec4 h = fract(sin(vec4(dot(i, vec2(127.1, 311.7)), dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7)), dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7)), dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7)))) * 43758.5453);
  return mix(mix(h.x, h.y, f.x), mix(h.z, h.w, f.x), f.y);
}
vec4 shoreLayOf(float band, vec2 xz) {
  vec2 shift = fract(sin(vec2(band * 12.9898 + 3.1, band * 78.233 + 1.7)) * 43758.5453);
  float turn = 6.2832 * fract(sin(band * 39.346 + 0.7) * 24634.6345);
  float c = cos(turn);
  float s = sin(turn);
  return vec4(vec2(c * xz.x + s * xz.y, -s * xz.x + c * xz.y) / vec2(2.0, 1.125) + 2.0 * shift, c, s);
}
// In xy where the sheet is read. In zw the cosine and sine of the turn: a lean measured along the sheet's own two axes is
// brought back to the ground's by shoreLean.
vec4 shoreLay(sampler2D high, vec2 xz) {
  float k = 7.0 * (0.6 * shoreNoise(xz / 2.9 + 5.3) + 0.4 * shoreNoise(xz / 1.1 + 17.1));
  float band = floor(k);
  float t = smoothstep(0.3, 0.7, k - band);
  vec4 a = shoreLayOf(band, xz);
  if (t <= 0.0) return a;
  vec4 b = shoreLayOf(band + 1.0, xz);
  if (t >= 1.0) return b;
  float ha = textureLod(high, a.xy, 3.0).r;
  float hb = textureLod(high, b.xy, 3.0).r;
  return ha - hb > 0.7 * (2.0 * t - 1.0) ? a : b;
}
vec2 shoreLean(vec4 lay, vec2 lean) {
  return vec2(lay.z * lean.x - lay.w * lean.y, lay.w * lean.x + lay.z * lean.y);
}`;
