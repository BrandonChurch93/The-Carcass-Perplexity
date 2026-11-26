// The ground of the Blood Marsh, made of its pictures: every material is a picture with its own heights (public/assets/marsh/mat), the
// ground close to a lens is raised by those heights in its mesh, and the brine's level stands against them. What lies under the level is
// flooded and mirrors the sky; what lies a little over it is dark and wet; the rims over that carry the salt. One rule draws the shore, the
// wet margin, the puddles of the mud and the red pooled in the lows.
import { K1_AT, STUCK, rel } from '../shared/anchors';
import { BRINE_GLSL } from '../shared/brine-glsl';
import { RIG_GLSL } from '../shared/glsl';

/** True: the fine patches are raised by the pictures' heights (their vertices read the height maps). False: they are level and only shaded. */
export const RELIEF: boolean = true;

// What the fine patches' vertices and every fragment share: how the pans' sheet is laid, and where the thin crust has gone through.
const PLATE_GLSL = /* glsl */ `
// The salt pans are one sheet (mat/pan, three wide by two deep) laid twice over the same ground. The first lay is cut into cells, and in
// each cell the sheet is turned and shifted on its own; the second lies whole under it, turned once, and shows where two cells meet.
// Which of the two a spot shows is settled by their heights, so a join runs along rims and cracks and never across a pan.
uniform sampler2D tPanN;
vec2 panHash(vec2 c) { return fract(sin(vec2(dot(c, vec2(127.1, 311.7)), dot(c, vec2(269.5, 183.3)))) * 43758.5453); }
// size: the metres the sheet's width covers. bent: how far the cells' edges are pushed about there, so that none runs straight (the
// sheet itself is never bent: bent, its grain runs out into streaks). Gives the two places on the sheet and the turn of the first (cos, sin); returns the first
// lay's share before the heights are asked.
float panPlace(vec2 xz, vec2 bent, float size, out vec2 uA, out vec2 uB, out vec2 turn) {
  vec2 g = (xz + bent) / (size * 0.71);
  vec2 fr = fract(g);
  vec2 r = panHash(floor(g));
  float a = r.x * 6.2832;
  turn = vec2(cos(a), sin(a));
  uA = vec2(turn.x * xz.x - turn.y * xz.y, turn.y * xz.x + turn.x * xz.y) / vec2(size, size / 1.5) + vec2(r.y, fract(r.x * 7.31 + r.y * 3.17));
  uB = vec2(0.8 * xz.x - 0.6 * xz.y, 0.6 * xz.x + 0.8 * xz.y) / vec2(size * 0.87, size * 0.58) + 0.37;
  vec2 e = min(fr, 1.0 - fr);
  return smoothstep(0.0, 0.2, min(e.x, e.y));
}
float panPick(float w, float hA, float hB) { return smoothstep(-0.12, 0.12, (w * 2.0 - 1.0) + (hA - hB) * 1.4 * (1.0 - abs(w * 2.0 - 1.0))); }
// The thin crust: the height under which a pan's low parts have gone through to the mud. mid is the grain at 13 m, fineG at 1.9 m.
float thinGap(vec4 mid, float fineG) { return 0.31 + 0.2 * (mid.b - 0.5) + 0.1 * (fineG - 0.5); }
`;

// The heights the fine patches are raised by, read at a vertex. y0 is the ground's own height there.
const RELIEF_GLSL = /* glsl */ `
uniform sampler2D tGrain;
uniform float uCell;
uniform vec4 uPatch;
uniform vec2 uAlong;
float panHeight(vec2 xz, vec2 bent, float size, float lod) {
  vec2 uA;
  vec2 uB;
  vec2 turn;
  float w = panPlace(xz, bent, size, uA, uB, turn);
  float hA = textureLod(tPanN, uA, lod).b;
  float hB = textureLod(tPanN, uB, lod).b;
  return mix(hB, hA, panPick(w, hA, hB));
}
float reliefAt(vec2 xz, float y0) {
  float rock = smoothstep(0.28, 0.75, y0);
  float thin = smoothstep(0.0, 0.5, fieldAt(xz).g);
  float lod = log2(uCell * 205.0);
  vec4 wide = textureLod(tGrain, xz / 97.0 + 0.11, 0.0);
  float pan = panHeight(xz, (wide.ba - 0.5) * 5.0, 12.0, lod - 0.7);
  float up = ((pan - 0.45) * 0.075 + (panHeight(xz + 3.7, (wide.ba - 0.5) * 1.5, 2.3, lod + 1.7) - 0.45) * 0.014) * smoothstep(-0.05, 0.25, y0);
  if (thin > 0.0) {
    // (The slabs of the thin crust stand a finger over the mud they lie on.)
    vec4 fine = textureLod(tGrain, xz / 1.9, 0.0);
    vec4 mid = textureLod(tGrain, (xz + (wide.ba - 0.5) * 7.0) / 13.0 + 0.37, 0.0);
    up = mix(up, mix(-0.03, up * 0.6 + 0.008, smoothstep(-0.03, 0.05, pan * 0.85 + mid.g * 0.15 - thinGap(mid, fine.g))), thin);
  }
  // (The rock's blocks are in the mesh's own heights: nothing is added to them here.)
  up *= 1.0 - rock;
  return up;
}`;

export const FIELD_GLSL = /* glsl */ `
uniform sampler2D tFieldNear;
uniform sampler2D tFieldFar;
// r metres to the shore (negative in brine), g how thin the crust is, b how stained the ground is.
vec3 fieldAt(vec2 xz) {
  vec2 a = abs(xz);
  float m = max(a.x, a.y);
  if (m < 236.0) return texture2D(tFieldNear, xz / 512.0 + 0.5).rgb;
  vec3 far = vec3(6.0, 0.0, 0.3);
  if (m < 2040.0) far = mix(texture2D(tFieldFar, xz / 4096.0 + 0.5).rgb, far, smoothstep(1900.0, 2040.0, m));
  if (m < 254.0) return mix(texture2D(tFieldNear, xz / 512.0 + 0.5).rgb, far, smoothstep(236.0, 254.0, m));
  return far;
}`;


export const LAND_VERTEX = /* glsl */ `
attribute vec2 aPaint;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vPaint;
varying float vBase;
#ifdef RELIEF
${FIELD_GLSL}
${PLATE_GLSL}
${RELIEF_GLSL}
#endif
void main() {
  vec3 q = position;
  vBase = q.y;
#ifdef RELIEF
  // The raising dies out toward the patch's rim, where the plain ground takes over.
  vec2 d = q.xz - uPatch.xy;
  float inner = smoothstep(0.1, 1.2, min(uPatch.z - abs(dot(d, uAlong)), uPatch.w - abs(dot(d, vec2(-uAlong.y, uAlong.x)))));
  q.y += reliefAt(q.xz, q.y) * inner;
#endif
  vWorld = q;
  vNormal = normal;
  vPaint = aPaint;
  gl_Position = projectionMatrix * viewMatrix * vec4(q, 1.0);
}`;

export const LAND_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vPaint;
varying float vBase;
uniform sampler2D tCrust;
uniform sampler2D tCrustN;
uniform sampler2D tMud;
uniform sampler2D tMudN;
uniform sampler2D tRock;
uniform sampler2D tRockN;
uniform sampler2D tRockS;
uniform sampler2D tRockSN;
uniform sampler2D tRime;
uniform sampler2D tRimeN;
uniform sampler2D tSilt;
uniform sampler2D tSiltN;
uniform sampler2D tPan;
uniform sampler2D tSlick;
uniform sampler2D tSlickN;
const vec3 PAN_MEAN = vec3(0.371, 0.346, 0.337);
const vec3 SLICK_MEAN = vec3(0.193, 0.094, 0.076);
uniform sampler2D tGrain;
vec3 greyed(vec3 c, float keep) { return mix(vec3(dot(c, vec3(0.3, 0.5, 0.2))), c, keep); }
${RIG_GLSL}
${FIELD_GLSL}
${PLATE_GLSL}
${BRINE_GLSL}

// The pans' sheet at one spot: its colour, and in nh the lean of its surface on x and z and its height. px and py are how far the ground
// moves from one pixel to the next: a cell's edge is no edge to the sheet, so the sheet is told its own size on screen.
void panLay(vec2 xz, vec2 bent, float size, vec2 px, vec2 py, out vec3 col, out vec3 nh) {
  vec2 uA;
  vec2 uB;
  vec2 turn;
  float w = panPlace(xz, bent, size, uA, uB, turn);
  vec2 sz = vec2(size, size / 1.5);
  vec2 ax = vec2(turn.x * px.x - turn.y * px.y, turn.y * px.x + turn.x * px.y) / sz;
  vec2 ay = vec2(turn.x * py.x - turn.y * py.y, turn.y * py.x + turn.x * py.y) / sz;
  vec4 nA = textureGrad(tPanN, uA, ax, ay);
  vec4 nB = texture2D(tPanN, uB);
  float k = panPick(w, nA.b, nB.b);
  col = mix(texture2D(tPan, uB).rgb, textureGrad(tPan, uA, ax, ay).rgb, k);
  vec2 sA = nA.rg - 0.5;
  vec2 sB = nB.rg - 0.5;
  nh = vec3(mix(vec2(0.8 * sB.x + 0.6 * sB.y, 0.8 * sB.y - 0.6 * sB.x), vec2(turn.x * sA.x + turn.y * sA.y, turn.x * sA.y - turn.y * sA.x), k), mix(nB.b, nA.b, k));
}

void main() {
  vec3 p = vWorld;
  vec3 toEye = cameraPosition - p;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec3 ng = normalize(vNormal);
  vec3 f = fieldAt(p.xz);
  vec4 wide = texture2D(tGrain, p.xz / 97.0 + 0.11);
  vec4 mid = texture2D(tGrain, (p.xz + (wide.ba - 0.5) * 7.0) / 13.0 + 0.37);
  vec4 fine = vec4(0.5);
  if (dist < 420.0) fine = texture2D(tGrain, p.xz / 1.9);
  float s = f.r + (fine.r - 0.5) * 0.1;
  float t = max(s, 0.0);
  // Where the crust is thin it is broken slabs on wet mud. (A shore of the flats is the pans themselves, going under.)
  float thin = f.g;
  float stain = f.b;
  float rock = smoothstep(0.28, 0.75, vBase);
  float near = smoothstep(90.0, 30.0, dist);
  float close = smoothstep(16.0, 6.0, dist);

  // The salt pans: one sheet of them from above (mat/pan) laid at three sizes, and in each lay cut into cells in which the sheet is turned
  // and shifted on its own (panLay), so that no stretch of it is found twice. Far off a pan is strides across; near, one stride; at the
  // lens the same sheet a hand to a pan, which is the crystal rind itself. Its heights are what the brine's level stands against.
  vec2 bent = (wide.ba - 0.5) * 5.0;
  vec2 px = dFdx(p.xz);
  vec2 py = dFdy(p.xz);
  vec3 crust = vec3(1.0);
  vec3 nP = vec3(0.0, 0.0, 0.45);
  float farLay = smoothstep(30.0, 80.0, dist);
  if (farLay < 1.0) {
    panLay(p.xz, bent, 12.0, px, py, crust, nP);
    crust /= PAN_MEAN;
  }
  if (farLay > 0.0) {
    vec3 cQ;
    vec3 nQ;
    panLay(p.xz + 19.0, bent * 3.0, 53.0, px, py, cQ, nQ);
    crust = mix(crust, cQ / PAN_MEAN, farLay);
    nP = mix(nP, nQ, farLay);
  }
  // hgt: how high this spot stands among its neighbours, 0 to 1, from the sheet's heights.
  float hgt = nP.z * 0.85 + mid.g * 0.15;
  vec2 bend = nP.xy * 2.4;
  if (close > 0.0) {
    vec3 cC;
    vec3 nC;
    panLay(p.xz + 3.7, bent * 0.3, 2.3, px, py, cC, nC);
    crust *= mix(vec3(1.0), 0.45 + 0.55 * cC / PAN_MEAN, close);
    hgt += (nC.z - 0.45) * 0.25 * close;
    bend += nC.xy * 1.8 * close;
  }
  vec3 colour = greyed(crust, 0.7) * vec3(0.31, 0.297, 0.284) * (0.86 + 0.28 * wide.r);
  // Salt stands white and crystalline on the raised rims; in the cracks between the pans the red has dried dark.
  colour = mix(colour, vec3(0.52, 0.505, 0.49) * (0.8 + 0.25 * hgt), smoothstep(0.55, 0.78, hgt) * 0.8);
  colour = mix(colour, vec3(0.11, 0.05, 0.04), smoothstep(0.3, 0.1, hgt) * (0.45 + 0.4 * stain) * (1.0 - 0.5 * farLay));
  float occ = 1.0 - 0.45 * smoothstep(0.45, 0.1, hgt) * mix(0.5, 1.0, near);
  float rough = 1.0;
  float ground = 1.0;
  // The crust lies ON grey brown mud, in patches: back from the rims the mud shows wet where no crust has grown, and in the seams between
  // the plates.
  float bare = smoothstep(0.55, 0.66, wide.g * 0.5 + mid.r * 0.5) * smoothstep(0.62, 0.4, hgt) * smoothstep(1.0, 3.0, t) * (1.0 - rock);
  float mudShare = max(bare * 0.55, smoothstep(0.44, 0.2, hgt) * 0.25 * (1.0 - rock));
  colour = mix(colour, vec3(0.2, 0.158, 0.132) * (0.7 + 0.6 * mid.b), mudShare);
  rough = mix(rough, 0.86, mudShare);

  // Slopes of the ground from the plates' relief, in metres a metre, on top of the mesh's own.
  vec2 lean = vec2(0.0);
  // How wide a pixel is on the ground: the relief is read no finer than that.
  // The reliefs are soft clay models, not strict heights: slopes are taken from them a hand apart and blurred, and the sharp picture is
  // kept as how closed a spot is.
  float foot = max(length(fwidth(p.xz)) * 1.5, 0.07);

  // Thin crust over mud: the same pans, broken. Each pan is a slab lying on wet grey mud; the cracks between them have opened into gaps
  // a hand to a stride wide, wider here and narrower there, and brine stands in them.
  float slab = 0.0;
  {
    float k = smoothstep(0.0, 0.5, thin);
    vec3 silt = texture2D(tSilt, p.xz / 3.0).rgb;
    vec4 nS = texture2D(tSiltN, p.xz / 3.0);
    slab = smoothstep(-0.03, 0.05, hgt - thinGap(mid, fine.g));
    // The wallow (painted into the fine patch): its mud is lower, wetter and darker than any other, and the slabs tipped round it are whole.
    float sunk = vPaint.x * k;
    float tipped = vPaint.y * k;
    slab = max(slab * (1.0 - sunk), tipped);
    vec3 mudCol = silt * vec3(0.27, 0.205, 0.18) * mix(vec3(1.0), vec3(0.5, 0.42, 0.38), sunk);
    vec2 grain = -(nS.rg - 0.5) * 0.8;
    if (close > 0.0) {
      // Close to the lens the silt's own grain is on the mud.
      vec4 nS2 = texture2D(tSiltN, p.xz / 0.7 + 0.31);
      mudCol *= mix(vec3(1.0), 0.6 + 0.4 * texture2D(tSilt, p.xz / 0.7 + 0.31).rgb / vec3(0.32, 0.281, 0.257), close);
      grain -= (nS2.rg - 0.5) * 0.5 * close;
    }
    // The slabs keep their salt, a little soiled; the mud between them is wet, and dark with it. A slab's edge is its broken section.
    float edge = slab * (1.0 - slab) * 4.0;
    colour = mix(colour, mix(mudCol, colour * vec3(0.94, 0.9, 0.88), slab) * (1.0 - 0.35 * edge), k);
    hgt = mix(hgt, mix(0.08 + 0.3 * nS.b, max(hgt, 0.5), slab), k);
    bend = mix(bend, mix(grain, bend, slab), k);
    occ = mix(occ, mix(0.72, occ, slab), k);
  }

  // Rock: pale bedded stone broken into blocks (the blocks, their risers and joints are in the mesh, land/field.ts). What lies level
  // carries the sheet of the stone's top (mat/rocktop), laid twice at two sizes and turns, the higher of the two showing, and again small
  // close to; what stands upright carries the sheet of its side (mat/rockside), beds level, from whichever side the face looks to.
  vec3 rockBend = vec3(0.0);
  if (rock > 0.0) {
    vec3 gN = normalize(vNormal);
    float up = smoothstep(0.55, 0.8, gN.y);
    float seen = smoothstep(120.0, 40.0, dist);
    vec2 uT = vec2(p.x * 0.8 - p.z * 0.6, p.x * 0.6 + p.z * 0.8) / 3.1;
    vec2 uV = vec2(p.x * 0.6 + p.z * 0.8, p.z * 0.6 - p.x * 0.8) / 4.7 + 0.61;
    vec4 nT = texture2D(tRockN, uT);
    vec4 nV = texture2D(tRockN, uV);
    float pickT = smoothstep(-0.1, 0.1, (mid.a - 0.5) * 2.5 + nT.b - nV.b);
    vec3 pat = mix(texture2D(tRock, uV).rgb, texture2D(tRock, uT).rgb, pickT);
    float pitT = mix(nV.b, nT.b, pickT);
    vec2 lT = mix(vec2(0.6 * (nV.r - 0.5) - 0.8 * (nV.g - 0.5), 0.8 * (nV.r - 0.5) + 0.6 * (nV.g - 0.5)), vec2(0.8 * (nT.r - 0.5) + 0.6 * (nT.g - 0.5), 0.8 * (nT.g - 0.5) - 0.6 * (nT.r - 0.5)), pickT) * 2.2;
    if (seen > 0.0) {
      vec2 uU = vec2(p.x * 0.28 + p.z * 0.96, p.z * 0.28 - p.x * 0.96) / 0.83 + 0.37;
      vec4 nU = texture2D(tRockN, uU);
      pat *= mix(vec3(1.0), 0.5 + 0.5 * texture2D(tRock, uU).rgb / vec3(0.379, 0.317, 0.286), seen);
      pitT = mix(pitT, pitT * 0.6 + nU.b * 0.4, seen);
      lT += vec2(0.28 * (nU.r - 0.5) - 0.96 * (nU.g - 0.5), 0.96 * (nU.r - 0.5) + 0.28 * (nU.g - 0.5)) * 1.8 * seen;
    }
    vec3 bendT = vec3(lT.x, 0.0, lT.y);
    vec3 patS = pat;
    vec3 bendS = vec3(0.0);
    float pitS = 0.5;
    if (up < 1.0) {
      float ax = gN.x * gN.x / max(gN.x * gN.x + gN.z * gN.z, 1e-4);
      vec2 uX = vec2(p.z, p.y) / 1.7 + 0.11;
      vec2 uZ = vec2(p.x, p.y) / 1.7 + 0.53;
      vec4 nX = texture2D(tRockSN, uX);
      vec4 nZ = texture2D(tRockSN, uZ);
      patS = mix(texture2D(tRockS, uZ).rgb, texture2D(tRockS, uX).rgb, ax);
      pitS = mix(nZ.b, nX.b, ax);
      bendS = mix(vec3(nZ.r - 0.5, nZ.g - 0.5, 0.0), vec3(0.0, nX.g - 0.5, nX.r - 0.5), ax) * 2.6;
    }
    vec3 stone = mix(greyed(patS, 0.8) * 0.84, greyed(pat, 0.72) * 0.78, up) * (0.86 + 0.28 * mid.g);
    float pit = mix(pitS, pitT, up);
    rockBend = mix(bendS, bendT, up);
    // How closed a spot is: the joints and the feet of the risers (baked into the mesh), and the stone's own pits.
    float cleft = clamp(vPaint.x * 1.15 + 0.45 * vPaint.y + 0.35 * smoothstep(0.5, 0.2, pit) * seen, 0.0, 1.0);
    // The red has dried in every joint and run down from it; salt has crusted pale on what lies level and proud of its neighbours.
    float run = smoothstep(0.35, 0.75, cleft + 0.5 * (mid.b - 0.5) + 0.12 * (1.0 - up) * fine.g);
    stone = mix(stone, stone * vec3(0.9, 0.5, 0.38), run * 0.5);
    float salt = up * smoothstep(0.25, 0.0, cleft) * smoothstep(0.42, 0.62, 0.55 * pitT + 0.45 * fine.b) * (0.35 + 0.65 * smoothstep(0.4, 0.65, mid.r));
    stone = mix(stone, vec3(0.47, 0.445, 0.425) * (0.8 + 0.3 * pitT), salt * 0.62);
    // The foot of the rise is wet and red where the brine has wicked up it.
    float wick = smoothstep(0.62, 0.3, vBase + (mid.r - 0.5) * 0.3);
    stone = mix(stone, stone * vec3(0.5, 0.3, 0.26), wick * 0.7);
    colour = mix(colour, stone, rock);
    occ = mix(occ, (1.0 - 0.72 * smoothstep(0.0, 0.9, vPaint.x)) * (1.0 - 0.5 * vPaint.y) * (1.0 - 0.45 * smoothstep(0.5, 0.15, pit) * seen), rock);
    bend *= 1.0 - rock;
    hgt = mix(hgt, 1.0, rock);
  }

  // At the lens a plate is softer than the eye: the grain of a hand's breadth is laid over it, granular salt on what is dry and high, the
  // silt's pits and ripple marks on the mud.
  // A face too steep for a picture laid on from above shows the crust's own section: salt in thin beds, stained between them.
  // (A lip that only leans is already too steep for it when it faces the lens: the picture's grain would run down it in streaks.)
  vec3 gn = normalize(cross(dFdx(p), dFdy(p)));
  float sheer = smoothstep(0.86, 0.62, min(abs(gn.y), ng.y)) * (1.0 - rock) * smoothstep(120.0, 60.0, dist);
  if (sheer > 0.0) {
    vec4 gb = texture2D(tGrain, vec2(dot(p.xz, vec2(0.7, 0.71)) / 0.9, p.y / 0.11));
    vec3 section = mix(vec3(0.3, 0.13, 0.11), vec3(0.6, 0.55, 0.51), smoothstep(0.35, 0.65, gb.r)) * (0.7 + 0.5 * gb.g);
    // (Its foot stands in the brine and is dark with it.)
    section = mix(vec3(0.085, 0.04, 0.032), section, smoothstep(0.02, 0.16, p.y + (gb.b - 0.5) * 0.08));
    colour = mix(colour, section, sheer);
    bend *= 1.0 - sheer;
    occ *= 1.0 - 0.2 * sheer;
  }
  // The bank the third lens lies on is salt thrown up by the pool: it stands dry over the level and is knobbed all over.
  float bankDry = smoothstep(8.5, 5.0, length(p.xz - vec2(${K1_AT[0].toFixed(3)}, ${K1_AT[1].toFixed(3)})));
  if (close > 0.0) {
    float dryish = max(max(slab, rock), (1.0 - smoothstep(0.0, 0.5, thin)) * smoothstep(0.35, 0.6, hgt));
    vec2 uG = p.xz / 0.62 + 0.31;
    vec2 uH = vec2(p.x * 0.8 + p.z * 0.6, p.z * 0.8 - p.x * 0.6) / 0.19;
    float nearer = smoothstep(5.0, 1.5, dist);
    vec3 gs = texture2D(tSilt, uG).rgb / vec3(0.32, 0.281, 0.257);
    vec4 ns = texture2D(tSiltN, uG);
    vec3 gr = texture2D(tRime, uG * 0.7).rgb / vec3(0.389, 0.306, 0.282);
    vec4 nr = texture2D(tRimeN, uG * 0.7);
    vec4 nh = texture2D(tRimeN, uH);
    vec3 g = mix(gs, gr, dryish);
    vec4 ng2 = mix(ns, nr, dryish);
    colour *= mix(vec3(1.0), 0.62 + 0.38 * g, close * (1.0 - rock));
    colour *= mix(1.0, 0.85 + 0.3 * nh.b, nearer * dryish * (1.0 - rock));
    // The rind at a waterline and the rims a stride back from it: salt grown in knobs a few fingers across, white on top, stained in
    // the clefts, each with its own small hard shadow from the brighter quarter of the sky. The crust's picture, laid small.
    float knobby = max(bankDry * smoothstep(0.26, 0.46, hgt), (1.0 - smoothstep(0.0, 0.5, thin)) * smoothstep(3.0, 0.8, t) * smoothstep(0.4, 0.65, hgt)) * close * (1.0 - rock) * step(0.0, s);
    if (knobby > 0.0) {
      vec2 uK = vec2(p.x * 0.6 - p.z * 0.8, p.x * 0.8 + p.z * 0.6) / 0.55;
      vec4 nk = texture2D(tCrustN, uK);
      float lit2 = texture2D(tCrustN, uK + vec2(-0.86 * 0.6 - 0.5 * 0.8, -0.86 * 0.8 + 0.5 * 0.6) * 0.035).b;
      vec3 ck = texture2D(tCrust, uK).rgb / vec3(0.413, 0.304, 0.269);
      vec3 knob = mix(vec3(0.2, 0.075, 0.06), mix(vec3(0.52, 0.5, 0.48), vec3(0.42, 0.3, 0.26), exp(-t / 0.4)) * (0.6 + 0.4 * greyed(ck, 0.4)), smoothstep(0.4, 0.72, nk.b));
      colour = mix(colour, knob, knobby * 0.85);
      bend -= (nk.rg - 0.5) * 2.4 * knobby;
      occ *= 1.0 - knobby * (0.5 * smoothstep(0.5, 0.15, nk.b) + 0.45 * smoothstep(0.03, 0.14, lit2 - nk.b));
      hgt += (nk.b - 0.5) * 0.25 * knobby;
    }
    bend -= ((ng2.rg - 0.5) * mix(0.7, 1.1, dryish) * close + (nh.rg - 0.5) * 0.7 * nearer * dryish) * (1.0 - rock);
    hgt += (ng2.b - 0.5) * 0.16 * close * (1.0 - rock);
    occ *= 1.0 - 0.3 * smoothstep(0.45, 0.15, ng2.b) * close * (1.0 - rock);
  }

  // (That salt is wet with the pool's spray and stained by it.)
  // Where the big ones wade the banks are trodden mud: clods and prints, wet, with the red standing in every print.
  float churn = smoothstep(9.5, 6.0, length(p.xz - vec2(${rel(34.3, 3)[0].toFixed(3)}, ${rel(34.3, 3)[1].toFixed(3)}))) * (1.0 - rock) * step(0.0, s);
  {
    vec2 uM = p.xz / 1.1 + 0.17;
    vec4 nM = texture2D(tSiltN, uM);
    vec3 cM = texture2D(tSilt, uM).rgb / vec3(0.32, 0.281, 0.257);
    vec4 nP = texture2D(tGrain, p.xz / 0.83 + 0.4);
    // (Broad prints and clods, not a grain: a bank that flecks pixel by pixel is gravel, not mud.)
    float clod = nM.b * 0.4 + texture2D(tGrain, p.xz / 3.7 + 0.21).g * 0.6;
    // (The mud's own colour, wet: brown with the brine in it. The silt's picture gives it its grain, not its hue.)
    cM = mix(vec3(dot(cM, vec3(0.3333))), cM, 0.3);
    colour = mix(colour, vec3(0.092, 0.05, 0.039) * cM * (0.5 + 0.8 * clod), churn);
    hgt = mix(hgt, clod, churn);
    bend = mix(bend, -(nM.rg - 0.5) * 1.2 - (nP.ba - 0.5) * 0.25, churn);
    occ = mix(occ, 1.0 - 0.55 * smoothstep(0.55, 0.25, clod), churn);
    rough = mix(rough, 0.97, churn);
  }

  // The brine's level against the heights. At the shore most of the relief is under it and only the plates' tops stand out; a stride back
  // only the cracks hold it; where the flats lie low it comes up again in sheets.
  float lowland = smoothstep(0.52, 0.72, wide.g * 0.55 + mid.g * 0.2 + 0.3 * stain + 0.25 * (wide.r - 0.5));
  // (A pan stands dry right up to its shore: back from the waterline the level reaches only the cracks and the lowest dishes.)
  float level = 0.85 * exp(-t / 0.14) + 0.2 * exp(-t / (2.5 + 5.0 * wide.r)) + lowland * mix(0.1, 0.15, smoothstep(140.0, 50.0, dist)) * smoothstep(700.0, 150.0, dist);
  level = min(level, 0.97) * (1.0 - rock);
  level = mix(level, mix(0.35, 0.24, smoothstep(12.0, 40.0, dist)) + 0.12 * lowland + 0.2 * exp(-t / 0.6), smoothstep(0.0, 0.5, thin));
  level *= 1.0 - 0.25 * bankDry;
  level = mix(level, 0.27, churn);
  float over = hgt - level;
  float aa = max(0.02 + 0.1 * smoothstep(30.0, 200.0, dist) + 0.07 * churn, fwidth(over) * 1.3);
  float flood = smoothstep(aa, -aa, over);
  // At a shore the brine does not stand on ground that is over its level: there the ground is wet, not under.
  flood *= mix(1.0, smoothstep(0.05, 0.005, p.y), smoothstep(0.6, 0.2, t) * (1.0 - smoothstep(0.0, 0.5, f.g)) * (1.0 - churn)) * (1.0 - bankDry);
  float damp = smoothstep(0.34, 0.03, over);
  // Damp ground is darker and redder, and what the brine has soaked is stained by it.
  // (Damp salt is grey, not pink: the red is only in what the brine itself has soaked, a stride from it.)
  colour = mix(colour, colour * mix(vec3(0.62, 0.575, 0.55), vec3(0.5, 0.33, 0.29), clamp(exp(-t / 0.9) * 0.8, 0.0, 1.0) * (1.0 - 0.6 * smoothstep(0.0, 0.5, thin))), damp * (1.0 - 0.8 * churn));
  rough = mix(rough, mix(0.95, 0.86, smoothstep(0.0, 0.5, thin) * (1.0 - slab)), damp * (1.0 - rock));
  // The last hand's breadths before the brine are soaked with it: dark, red and shining.
  // (Seen from far the band is wider than a hand: the wet margin of a channel is strides of dark mud, and no shore is a cut line.)
  float farBand = 1.5 * smoothstep(15.0, 80.0, dist);
  // (Its width is the ground's: a stride where the pans lie low, a hand where a rim stands up to the brine.)
  float wetTo = 0.3 + 0.9 * mid.g + 1.6 * bankDry + farBand;
  float tw = t + (hgt - 0.45) * 0.7 * smoothstep(120.0, 40.0, dist);
  float soaked = smoothstep(wetTo, 0.05, tw) * step(0.0, s) * (1.0 - rock);
  // (That margin is slick mud of its own, mat/slick: dark rust, shining, with the last of the salt going under in it.)
  if (soaked > 0.0) {
    vec2 uS = vec2(p.x * 0.6 + p.z * 0.8, p.z * 0.6 - p.x * 0.8) / 1.7;
    vec3 cS = texture2D(tSlick, uS).rgb / SLICK_MEAN;
    vec2 sS = texture2D(tSlickN, uS).rg - 0.5;
    float seenS = smoothstep(60.0, 20.0, dist);
    float m = soaked * (1.0 - 0.75 * churn);
    colour = mix(colour * mix(vec3(1.0), vec3(0.5, 0.3, 0.26), m), vec3(0.085, 0.04, 0.032) * mix(vec3(1.0), cS, seenS), m * 0.85);
    bend = mix(bend, vec2(0.6 * sS.x - 0.8 * sS.y, 0.8 * sS.x + 0.6 * sS.y) * 1.6, m * 0.7 * seenS);
  }
  rough = mix(rough, 0.82, soaked);
  // Round every pool, a stride back from its wet margin, the brine has left its salt: a pale rim, broken, wider here and narrower there.
  float rimAt = wetTo + 0.3 + 0.5 * mid.r;
  float salted = smoothstep(wetTo * 0.5, wetTo, tw) * smoothstep(rimAt + 0.9, rimAt, t) * smoothstep(0.3, 0.55, mid.b * 0.6 + fine.b * 0.4) * (1.0 - rock) * step(0.0, s) * (1.0 - flood) * (1.0 - churn) * (1.0 - 0.8 * sheer);
  colour = mix(colour, vec3(0.53, 0.512, 0.495) * (0.72 + 0.45 * hgt) * mix(1.0, dot(crust, vec3(0.3333)), 0.45), salted * mix(0.7, 0.55, close));
  // An overcast is not the same all round: the quarter away from the rain is the brighter, and every lump and lip shows it.
  vec2 bright = vec2(-0.86, 0.5);
  // The plates' slopes are real slopes: the mesh's normal leans by them.
  lean = lean * min(1.0, 4.0 / max(length(lean), 1e-3));
  ng = normalize(vec3(ng.x / max(ng.y, 0.2) - lean.x, 1.0, ng.z / max(ng.y, 0.2) - lean.y));
  colour *= 1.0 + clamp(0.22 * dot(bend, bright) + mix(0.25, 0.32, rock) * dot(ng.xz, bright), -0.45, 0.35);
  // Far off, the red of stalks and growth too small to draw lies on the flats as a haze of colour.
  colour = mix(colour, vec3(0.16, 0.06, 0.055), smoothstep(0.5, 0.64, wide.g * 0.5 + mid.g * 0.5) * smoothstep(90.0, 400.0, dist) * 0.1 * (1.0 - rock));
  // And the salt itself pales with the damp air over it: the far flats are the lightest ground in the basin.
  colour = mix(colour, vec3(0.46, 0.44, 0.43), 0.15 * smoothstep(18.0, 150.0, dist) * (1.0 - rock)) * (1.0 + 0.3 * smoothstep(18.0, 150.0, dist) * (1.0 - rock));

  // (The salt of the third lens's bank is wet with the pool's spray and stained by it.)
  colour *= mix(vec3(1.0), mix(vec3(0.84, 0.56, 0.49), vec3(0.44, 0.19, 0.155), smoothstep(0.6, 0.25, hgt)), bankDry);
  // (Along that bank's waterline the salt has crusted white on every knob; under and between the knobs the bank stays red and wet.)
  float rimK = bankDry * smoothstep(0.1, 0.3, t) * smoothstep(1.4, 0.7, t) * step(0.0, s) * (1.0 - rock) * (1.0 - flood);
  colour = mix(colour, vec3(0.5, 0.445, 0.415) * (0.75 + 0.5 * hgt), rimK * smoothstep(0.42, 0.62, hgt) * 0.62);
  rough = mix(rough, 1.0, churn);
  vec3 n = normalize(ng + vec3(bend.x, 0.0, bend.y) * (1.0 - 0.8 * flood));
  // (Rock keeps the lie of its own faces: a riser stays upright under its grain.)
  if (rock > 0.0) n = normalize(mix(n, normalize(normalize(vNormal) + rockBend), rock));
  vec3 lit = rigShade(p, n, v, colour, rough, occ);
  // (The trodden mud is wet: every clod that leans from the lens shows a little of the sky, sharp and small, never a sheet of it.)
  // (So is the mud between the slabs of the thin crust, and the bare mud back from the rims.)
  float wetMud = max(max(churn, soaked * 0.7), max(smoothstep(0.0, 0.5, thin) * (1.0 - slab) * 0.85, mudShare * 0.5)) * (1.0 - rock) * step(0.0, s);
  {
    // (The sheen is the mud's broad lie, not its grain: a grain that winks pixel by pixel is salt, not wet.)
    vec3 nw = normalize(ng + vec3(bend.x, 0.0, bend.y) * 0.3);
    vec3 rm = reflect(-v, nw);
    rm.y = abs(rm.y);
    lit += skyRadiance(rm) * vec3(1.0, 0.8, 0.76) * wetMud * occ * (0.01 + 0.11 * pow(1.0 - clamp(dot(nw, v), 0.0, 1.0), 4.0)) * (1.0 - 0.45 * churn);
  }
  // What is under the level: a film of brine over the ground, clear where it is a hair deep and blood where it is a finger, and a mirror.
  if (flood > 0.0) {
    float deep = max(-over, 0.0) * mix(0.3, 0.1, smoothstep(0.0, 0.5, f.g));
    // On the thin crust what stands in the lows is slurry, grey brown with the mud in it; the red is only where it is deepest.
    float slurry = smoothstep(0.0, 0.5, f.g) * (1.0 - churn);
    vec3 body = mix(mix(vec3(0.12, 0.045, 0.036), vec3(0.13, 0.078, 0.064), slurry), mix(vec3(0.085, 0.014, 0.011), vec3(0.095, 0.027, 0.021), slurry), 1.0 - exp(-deep * mix(26.0, 60.0, slurry)));
    // (A hair of brine over salt is clear: the salt shows through it grey and wet, and only depth brings the red.)
    body = mix(body, colour * mix(vec3(0.46, 0.36, 0.34), vec3(0.5), slurry), exp(-deep * mix(60.0, 25.0, slurry)));
    // (Round the stuck one the film is its own slurry: grey brown, the mud of its pocket stirred into it.)
    body = mix(body, vec3(0.125, 0.092, 0.078), 0.85 * (1.0 - smoothstep(1.8, 4.2, length(p.xz - vec2(${rel(STUCK[0], STUCK[1])[0].toFixed(3)}, ${rel(STUCK[0], STUCK[1])[1].toFixed(3)})))));
    // (In the trodden mud what stands in the prints is the brine with the mud in it: brown red, never a bright sheet.)
    body = mix(body, mix(vec3(0.075, 0.035, 0.028), vec3(0.05, 0.014, 0.011), 1.0 - exp(-deep * 30.0)), churn);
    // Right at a pool's edge the film is the pool itself, come a hand's breadth over the shelf.
    body = mix(body, vec3(0.13, 0.03, 0.024), smoothstep(0.2, 0.05, t) * (1.0 - slurry));
    vec3 nf = normalize(vec3(bend.x * 0.03 + (fine.b - 0.5) * 0.3 * close, 1.0, bend.y * 0.03 + (fine.a - 0.5) * 0.3 * close));
    float share = mirrorShare(nf, v) * mix(1.0, 1.5, smoothstep(25.0, 120.0, dist));
    float open = skyOpen(p) * mix(occ, 1.0, 0.5);
    vec3 film = body * skyIrradiance(vec3(0.0, 1.0, 0.0)) * (open / 3.14159) * (1.0 - share) + mirrorAt(p, nf) * share * mix(1.0, open, 0.5);
    lit = mix(lit, film, flood);
  }

  // The brine, where this ground is under it: the far channels are drawn here, the near ones are covered by the brine's own surface.
  float w = max(fwidth(f.r) * 0.75, 0.015);
  float under = smoothstep(w, -w, s) * (1.0 - rock) * (1.0 - smoothstep(0.2, 0.6, thin)) * mix(smoothstep(0.04, 0.0, p.y), 1.0, smoothstep(20.0, 40.0, dist));
  if (under > 0.0) {
    vec2 run = (texture2D(tGrain, p.xz / 7.3 + vec2(0.034, 0.019) * uTime).ba - 0.5) * 0.06 + (texture2D(tGrain, p.xz / 4.1 - vec2(0.021, 0.05) * uTime).ba - 0.5) * 0.04;
    lit = mix(lit, brineShade(vec3(p.x, 0.0, p.z), normalize(vec3(run.x, 1.0, run.y)), v, s, vec4(0.0)), under);
  }
  // In the brine's mirror the ground under the brine's level is not there: it would stand between the mirror's lens and the world.
  if (uMirror > 0.5 && p.y < -0.015) discard;
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;
