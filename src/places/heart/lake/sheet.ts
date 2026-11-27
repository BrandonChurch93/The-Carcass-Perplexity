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

// The crust as it was poured: slabs three to ten metres across, each one whole reading of the slab sheet (coil-nh: r, g the
// slope of its height, b the height), turned, shifted and sized its own way, so the sheet's own slabs (1 to 2 m) and rope
// festoons lie in it unbroken. Each slab has a level of its own, and where two meet the higher lies on the lower: the border
// follows the relief of both, with a step and a black gap. Some slabs are bare satin (the sheet read blurred: its ropes are
// gone, its swells stay), some are roped. GLSL; put NOISE_GLSL and SHEET_GLSL before it.
export const POUR_GLSL = /* glsl */ `
uniform sampler2D tPour;
#define POUR_CELL 7.5
#define POUR_TALL 0.26
#define POUR_LEVEL 0.2
#define POUR_HOLD 0.6
// What pourCells leaves of the three slabs that can hold a point.
mat2 gPourTurn[3];
vec2 gPourShift[3];
// x the span of its reading, y its level in metres, z its kind (0 satin, 1 roped), w how far its reach holds the point.
vec4 gPourCell[3];
float gPourTag[3];
void pourCells(vec2 q) {
  vec2 a = q / 15.0;
  vec2 b = q / 4.3;
  vec2 w = q + 6.0 * (vec2(vnoise(a + 3.0), vnoise(a + 41.0)) - 0.5) + 1.7 * (vec2(vnoise(b + 13.0), vnoise(b + 67.0)) - 0.5);
  sheetGrid(vec2(0.82 * w.x + 0.3 * w.y, 1.12 * w.y - 0.2 * w.x), POUR_CELL * 3.4641016);
  float s = gSheetSide;
  for (int i = 0; i < 3; i++) {
    vec2 corner = gSheetBase + (i == 0 ? vec2(s, s) : i == 1 ? vec2(s, 1.0 - s) : vec2(1.0 - s, s));
    vec2 h1 = hash22(corner + 17.0);
    vec2 h2 = hash22(corner + 59.0);
    float ang = 6.2832 * h1.x;
    float ca = cos(ang);
    float sa = sin(ang);
    gPourTurn[i] = mat2(ca, sa, -sa, ca);
    gPourShift[i] = fract(h1.yx * 13.7 + 0.31);
    float w3 = i == 0 ? gSheetW.x : i == 1 ? gSheetW.y : gSheetW.z;
    // A slab reaches as far as it was fed: one takes three times the ground of the next. None reaches the far side of its patch.
    float reach = w3 * mix(0.55, 1.45, fract(h1.x * 5.3 + h2.x)) - 1.2 * (1.0 - smoothstep(0.0, 0.14, w3));
    gPourCell[i] = vec4(mix(4.4, 7.4, h2.x), POUR_LEVEL * (h2.y - 0.5), step(0.44, fract(h2.y * 7.3 + h1.x)), reach);
    gPourTag[i] = h1.y;
  }
}
// What the slab on top is, after pourPick: its index, the metres its score stands over the next one's (0 at the border), and
// whether it lies over the next one there (1) or under it (0).
int gPourTop;
float gPourEdge;
float gPourOver;
void pourPick(vec3 high) {
  vec3 score = vec3(gPourCell[0].y, gPourCell[1].y, gPourCell[2].y) + POUR_TALL * (high - 0.5) + POUR_HOLD * vec3(gPourCell[0].w, gPourCell[1].w, gPourCell[2].w);
  gPourTop = score.x >= score.y ? (score.x >= score.z ? 0 : 2) : (score.y >= score.z ? 1 : 2);
  float best = max(score.x, max(score.y, score.z));
  vec3 rest = vec3(gPourTop == 0 ? -1e3 : score.x, gPourTop == 1 ? -1e3 : score.y, gPourTop == 2 ? -1e3 : score.z);
  float next = max(rest.x, max(rest.y, rest.z));
  int second = rest.x >= rest.y ? (rest.x >= rest.z ? 0 : 2) : (rest.y >= rest.z ? 1 : 2);
  gPourEdge = best - next;
  gPourOver = step(gPourCell[gPourTop].w, gPourCell[second].w);
}
// The height of the poured crust in metres about its mean, read with samples so many metres apart. Leaves gPourSheet, the
// part of it that is the sheet's own relief (the skin has that slope whole).
float gPourSheet;
float pourHigh(vec2 q, float apart) {
  pourCells(q);
  vec3 high;
  for (int i = 0; i < 3; i++) {
    float span = gPourCell[i].x;
    float lod = log2(apart * (2048.0 / span)) + 0.5 + 4.5 * (1.0 - gPourCell[i].z);
    high[i] = textureLod(tPour, (gPourTurn[i] * q) * (vec2(1.0, 2.0) / span) + gPourShift[i], lod).b;
  }
  pourPick(high);
  gPourSheet = POUR_TALL * ((gPourTop == 0 ? high.x : gPourTop == 1 ? high.y : high.z) - 0.5);
  // The gap between two slabs is a groove a hand deep, as far as the samples can hold it.
  float groove = 0.07 * (1.0 - smoothstep(0.0, 0.014, gPourEdge)) * (1.0 - smoothstep(0.03, 0.07, apart));
  return gPourCell[gPourTop].y + gPourSheet - groove;
}
// The same for the paint, read with the footprint of a pixel (gx, gy): the slope of the height in metres a metre, and the
// sheet's height, 0 to 1.
vec3 pourAt(vec2 q, vec2 gx, vec2 gy) {
  pourCells(q);
  vec3 high;
  vec2 slope[3];
  float lx = max(length(gx), length(gy));
  for (int i = 0; i < 3; i++) {
    float span = gPourCell[i].x;
    vec2 scale = vec2(1.0, 2.0) / span;
    // A satin slab is read no finer than a rope is wide.
    float grow = max(1.0, (1.0 - gPourCell[i].z) * (22.0 / 2048.0) * span / max(lx, 1e-6));
    vec3 nh = textureGrad(tPour, (gPourTurn[i] * q) * scale + gPourShift[i], (gPourTurn[i] * gx) * scale * grow, (gPourTurn[i] * gy) * scale * grow).rgb;
    high[i] = nh.b;
    // The picture is loaded upside down, so its second slope is counted the other way.
    slope[i] = (vec2(nh.r - 0.5, 0.5 - nh.g) * gPourTurn[i]) * (819.2 / span);
  }
  pourPick(high);
  return gPourTop == 0 ? vec3(slope[0], high.x) : gPourTop == 1 ? vec3(slope[1], high.y) : vec3(slope[2], high.z);
}`;
