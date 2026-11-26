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
