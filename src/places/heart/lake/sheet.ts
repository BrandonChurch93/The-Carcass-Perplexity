// A photographed sheet laid without a repeat: shared by the crust (index.ts, skin.ts), the melt (lava.ts) and the fall.
// The ground is cut into three-cornered patches a third of the sheet across. Each corner reads the sheet turned and shifted
// its own way, and whoever reads it weighs the three readings so that one lies on the other with a ragged edge.
// GLSL; put NOISE_GLSL before it.
export const SHEET_GLSL = /* glsl */ `
vec3 gSheetW;
vec2 gSheetBase;
float gSheetSide;
// span: metres the long side of the sheet covers (it is twice as long as it is high).
void sheetGrid(vec2 q, float span) {
  vec2 sk = mat2(1.0, 0.0, -0.57735027, 1.15470054) * (q * (3.4641016 / span));
  gSheetBase = floor(sk);
  vec3 t = vec3(sk - gSheetBase, 0.0);
  t.z = 1.0 - t.x - t.y;
  gSheetSide = step(0.0, -t.z);
  float s2 = 2.0 * gSheetSide - 1.0;
  gSheetW = vec3(-t.z * s2, gSheetSide - t.y * s2, gSheetSide - t.x * s2);
}
// Corner i of the patch sheetGrid found: its weight, and how its reading is turned and shifted. spread: 1 turns a reading
// any way, less keeps it so near its own lay.
float sheetCorner(int i, float seed, float spread, out mat2 turn, out vec2 shift) {
  float s = gSheetSide;
  vec2 h = hash22(gSheetBase + (i == 0 ? vec2(s, s) : i == 1 ? vec2(s, 1.0 - s) : vec2(1.0 - s, s)) + seed);
  float a = 6.2832 * spread * (h.x - 0.5);
  float ca = cos(a);
  float sa = sin(a);
  turn = mat2(ca, sa, -sa, ca);
  shift = fract(h.yx * 13.7 + 0.31);
  float w = i == 0 ? gSheetW.x : i == 1 ? gSheetW.y : gSheetW.z;
  return w * w * w;
}`;

// GLSL; put SHEET_GLSL before it.
export const MELT_GLSL = /* glsl */ `
uniform sampler2D tMeltNh;
// The photographed melt (melt-nh: r, g the slope of the skin, b the heat, 0 dark skin to 1 white melt) at a point p of what
// the stream carries, with the footprint of a pixel there. Returns the slope of the skin (of a height that runs 0 to 1, per
// metre, in p's own axes) and the heat.
vec3 meltAt(vec2 p, float span, vec2 gx, vec2 gy, float seed) {
  sheetGrid(p, span);
  // Seen low a pixel is many times as long as it is wide: past three the long way is cut, or every edge of the skin would
  // be read as a band of one width.
  float lx = max(length(gx), 1e-6);
  float ly = max(length(gy), 1e-6);
  gx *= min(1.0, 3.0 * ly / lx);
  gy *= min(1.0, 3.0 * lx / ly);
  vec2 scale = vec2(1.0, 2.0) / span;
  vec3 got = vec3(0.0);
  float sum = 0.0;
  for (int i = 0; i < 3; i++) {
    mat2 turn;
    vec2 shift;
    float w = sheetCorner(i, seed, 0.16, turn, shift);
    vec4 nh = textureGrad(tMeltNh, (turn * p) * scale + shift, (turn * gx) * scale, (turn * gy) * scale);
    // Where two readings meet, the skin of one lies on the melt of the other.
    float k = w * exp(5.0 * (1.0 - nh.b));
    got += k * vec3(vec2(nh.r - 0.5, 0.5 - nh.g) * turn, nh.b);
    sum += k;
  }
  got /= sum;
  return vec3(got.xy * (682.7 / span), got.z);
}`;
