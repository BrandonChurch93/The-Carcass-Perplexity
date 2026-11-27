// The ground of the Blood Marsh, made of its pictures: every material is a picture with its own heights (public/assets/marsh/mat), the
// ground close to a lens is raised by those heights in its mesh, and the brine's level stands against them. What lies under the level is
// flooded and mirrors the sky; what lies a little over it is dark and wet; the rims over that carry the salt. One rule draws the shore, the
// wet margin, the puddles of the mud and the red pooled in the lows.
import { DEAD, K1_AT, K1_DIR, STUCK, rel } from '../shared/anchors';
import { BRINE_GLSL } from '../shared/brine-glsl';
import { RIG_GLSL } from '../shared/glsl';

/** True: the fine patches are raised by the pictures' heights (their vertices read the height maps). False: they are level and only shaded. */
export const RELIEF: boolean = true;

// What the fine patches' vertices and every fragment share: how the ground is broken into pans, and what the thin crust does to them.
const PLATE_GLSL = /* glsl */ `
uniform sampler2D tPanN;
// The width of a pan in metres, near. (Far off, where one of these is a pixel, the pans drawn are five times that.)
const float PAN = 1.3;
vec2 panHash(vec2 c) {
  vec3 q = fract(vec3(c.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}
// The flats are broken into many-sided pans, each grown from its own seed. At a spot: e, the metres to the nearest edge of its pan;
// c, the metres from the pan's seed to the spot; dir, the way to that edge; r, two numbers that are the pan's own.
void panAt(vec2 xz, float size, out float e, out vec2 c, out vec2 dir, out vec2 r) {
  vec2 q = xz / size;
  vec2 ip = floor(q);
  vec2 fp = q - ip;
  float d1 = 9.0;
  float d2 = 9.0;
  vec2 c1 = vec2(0.0);
  vec2 c2 = vec2(1.0, 0.0);
  vec2 id = ip;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      vec2 at = o + 0.12 + 0.76 * panHash(ip + o) - fp;
      float d = dot(at, at);
      if (d < d1) {
        d2 = d1;
        c2 = c1;
        d1 = d;
        c1 = at;
        id = ip + o;
      } else if (d < d2) {
        d2 = d;
        c2 = at;
      }
    }
  }
  dir = normalize(c2 - c1);
  e = dot(0.5 * (c1 + c2), dir) * size;
  c = -c1 * size;
  r = panHash(id + 17.3);
}
// Where the sheet of the crust's surface (mat/pan, three metres by two) lies in a pan: every pan turns and shifts it on its own, so no
// stretch of it is found twice and its joins lie under the rims. turn is the pan's (cos, sin).
vec2 panSheet(vec2 xz, vec2 r, out vec2 turn) {
  float a = r.x * 6.2832;
  turn = vec2(cos(a), sin(a));
  return vec2(turn.x * xz.x - turn.y * xz.y, turn.y * xz.x + turn.x * xz.y) / vec2(3.0, 2.0) + vec2(r.y, fract(r.x * 7.31 + r.y * 3.17));
}
// Thin crust: the pans are plates lying loose on the mud. Each has drawn back from its edge by its own measure (one in sixteen is gone
// altogether), and each is tipped its own way.
// (Where the stuck one went through, the plates whose middles lay over the hole are gone into it, and those round it stand further apart.)
const vec2 HOLE = vec2(${rel(STUCK[0], STUCK[1])[0].toFixed(3)}, ${rel(STUCK[0], STUCK[1])[1].toFixed(3)});
float panGap(float thin, vec2 r, vec2 seed) {
  float d = length(seed - HOLE);
  return smoothstep(0.0, 0.5, thin) * (0.012 + 0.15 * r.x * r.x + 3.0 * step(r.y, 0.06) + 3.0 * step(d, 2.1) + 0.035 * smoothstep(4.5, 2.1, d));
}
// The bank of the seep pool is a rind of salt knobs (mat/knob, a metre and a bit across), laid twice, turned unlike ways; at a spot
// the lay that stands higher there is the one seen, so no stretch of the sheet is met twice in a row. KNOB_A and KNOB_B are (cos, sin).
uniform sampler2D tKnobN;
const vec2 KNOB_A = vec2(0.8, 0.6);
const vec2 KNOB_B = vec2(0.28, -0.96);
const vec2 BANK_AT = vec2(${K1_AT[0].toFixed(3)}, ${K1_AT[1].toFixed(3)});
// How much of a spot is the bank's knobs: all of it under the third lens, and outward in tongues and islands, never a ring.
float bankAt(sampler2D grain, vec2 xz) {
  float r = length(xz - BANK_AT);
  float n = textureLod(grain, xz / 11.0 + 0.3, 2.0).r + 0.5 * textureLod(grain, xz / 4.3 + 0.7, 2.0).r - 0.75;
  return smoothstep(8.5, 5.0, r + n * 9.0 * smoothstep(2.0, 5.0, r));
}
// How far a spot is from the strip of bank the third lens stands on and looks along (that strip is kept as it was approved).
float bankFar(vec2 xz) {
  vec2 d = xz - BANK_AT;
  vec2 f = vec2(${K1_DIR[0].toFixed(4)}, ${K1_DIR[1].toFixed(4)});
  float along = dot(d, f);
  float side = abs(d.x * f.y - d.y * f.x);
  return 1.0 - smoothstep(-0.9, -0.3, along) * smoothstep(1.9, 1.1, side);
}
// Where the knob bank has sunk: 1 in a hollow, 0 on the firm bed, and nothing at all on the strip before the third lens.
float bankLow(sampler2D grain, vec2 xz) { return textureLod(grain, xz / 2.3 + 0.21, 2.0).r - textureLod(grain, xz / 3.1 + 0.67, 2.0).r; }
float bankSunk(sampler2D grain, vec2 xz) { return smoothstep(0.0, 0.08, bankLow(grain, xz)) * bankFar(xz); }
// What has run out of the dead into the mud round them: 1 beside one, 0 three strides off.
float deadSeep(vec2 xz) {
  float s = 0.0;
${DEAD.map((d) => `  s = max(s, 1.0 - smoothstep(${(0.8 * d.size).toFixed(2)}, ${(2.9 * d.size).toFixed(2)}, length(xz - vec2(${rel(d.d, d.l)[0].toFixed(3)}, ${rel(d.d, d.l)[1].toFixed(3)}))));`).join(' ')}
  return s;
}
vec2 knobUv(vec2 xz, vec2 t, float size) { return vec2(t.x * xz.x - t.y * xz.y, t.y * xz.x + t.x * xz.y) / size; }
vec2 panTilt(vec2 r) { return (fract(r * 7.13 + r.yx * 3.71) - 0.5) * 0.2; }
// (A plate tipped far enough has its low edge under the mud: SUNK is the mud's level against the plates'.)
const float SUNK = -0.02;
float panLift(vec2 r, vec2 c) { return clamp(dot(panTilt(r), c) * 1.5, -0.05, 0.03) + 0.008; }
// How far a broken plate's edge wanders from its pan's line, in metres: a wide wander and a chipping the mesh can still follow.
float panRag(sampler2D grain, vec2 xz) {
  return (textureLod(grain, xz / 2.5 + 0.23, 3.0).r - 0.5) * 0.3 + (textureLod(grain, xz / 1.4 + 0.61, 3.0).r - 0.5) * 0.13;
}
`;

// The heights the fine patches are raised by, read at a vertex. y0 is the ground's own height there.
const RELIEF_GLSL = /* glsl */ `
uniform sampler2D tGrain;
uniform float uCell;
uniform vec4 uPatch;
uniform vec2 uAlong;
// What comes back: y the raising, x and z a shift along the ground.
vec3 reliefAt(vec2 xz, float y0) {
  float rock = smoothstep(0.28, 0.75, y0);
  float thin = fieldAt(xz).g;
  float e;
  vec2 c;
  vec2 dir;
  vec2 r;
  vec2 turn;
  vec2 w = xz + (vec2(textureLod(tGrain, xz / 7.6, 3.0).r, textureLod(tGrain, xz.yx / 9.1 + 0.37, 3.0).r) - 0.5) * 0.7;
  panAt(w, PAN, e, c, dir, r);
  float sh = textureLod(tPanN, panSheet(xz, r, turn), log2(uCell * 512.0)).b;
  float k = smoothstep(0.0, 0.5, thin);
  // (The mesh takes the edge without the sheet's grain: a grain finer than the mesh would comb it.)
  float ep = e + (sh - 0.5) * 0.06 * (1.0 - k) - panGap(thin, r, w - c);
  if (k > 0.0) ep += panRag(tGrain, xz) * k;
  // A pan's rim stands two fingers over it.
  float rim = 1.0 - smoothstep(0.0, (0.03 + 0.04 * r.x) * 1.6, ep);
  float up = ((sh - 0.45) * 0.02 + 0.022 * rim) * smoothstep(-0.05, 0.25, y0);
  // (A plate of the thin crust stands on the mud by its own tilt: one edge lifted, the other down in it.)
  vec2 shift = vec2(0.0);
  if (k > 0.0) {
    // A broken edge is a clean line, and a mesh of squares cannot follow one: so every vertex within two cells of a plate's edge is
    // moved onto the edge itself, those inside it at the plate's height and those outside it down on the mud. The edge is then a
    // sheer face along its own line, not a stair of cells. (Two cells: no side or diagonal of a cell then crosses an edge with an end
    // left off it.)
    float loose = step(0.5, k);
    float reach = uCell * 1.8;
    shift = dir * ep * step(abs(ep), reach) * loose;
    float top = mix(smoothstep(-0.05, 0.02, ep), step(0.0, ep), loose);
    // (Its edges have curled up as it dried, each plate by its own measure; its low edge goes down under the mud.)
    float curl = 0.014 * r.y * exp(-max(ep, 0.0) / 0.08);
    up = mix(up, mix(SUNK, max(SUNK, (sh - 0.45) * 0.008 + 0.004 * rim + curl + panLift(r, c + shift)), top), k);
  }
  float bank = bankAt(tGrain, xz);
  if (bank > 0.0) {
    float lod = log2(uCell * 1024.0);
    float a = textureLod(tKnobN, knobUv(xz, KNOB_A, 1.0), lod).b;
    float b = textureLod(tKnobN, knobUv(xz, KNOB_B, 1.43) + 0.37, lod).b;
    float pick = smoothstep(-0.08, 0.08, b - a + (textureLod(tGrain, xz / 3.1 + 0.6, 3.0).r - 0.5) * 1.2);
    // (The knobs stand a hand high, in the brine as on the bank: the waterline is theirs.)
    up = mix(up, (mix(a, b, pick) - 0.45) * 0.1, bank);
    // (Away from the third lens the bank is not one bed: it has sunk in places, and the brine stands in them and comes in from the shore.)
    up -= bankSunk(tGrain, xz) * 0.2 * bank;
  }
  // (The rock's blocks are in the mesh's own heights: nothing is added to them here.)
  return vec3(shift.x, up, shift.y) * (1.0 - rock);
}`;

export const FIELD_GLSL = /* glsl */ `
uniform sampler2D tFieldNear;
uniform sampler2D tFieldFar;
// The steps of the ground from one pixel to the next, in metres, for fieldAt's reads. A fragment shader sets them ONCE, as the first
// lines of main and outside every branch: fieldDx = dFdx(vWorld.xz); fieldDy = dFdy(vWorld.xz);. Left at zero the finest level is read.
// (fieldAt branches, and is called from branches: a read that takes its level from the screen inside a branch is not the same twice
// in the software renderer, which shades four pixels together. So the steps are given, never taken there.)
vec2 fieldDx = vec2(0.0);
vec2 fieldDy = vec2(0.0);
// r metres to the shore (negative in brine), g how thin the crust is, b how stained the ground is.
vec3 fieldAt(vec2 xz) {
  vec2 a = abs(xz);
  float m = max(a.x, a.y);
  if (m < 236.0) return textureGrad(tFieldNear, xz / 512.0 + 0.5, fieldDx / 512.0, fieldDy / 512.0).rgb;
  vec3 far = vec3(6.0, 0.0, 0.3);
  if (m < 2040.0) far = mix(textureGrad(tFieldFar, xz / 4096.0 + 0.5, fieldDx / 4096.0, fieldDy / 4096.0).rgb, far, smoothstep(1900.0, 2040.0, m));
  if (m < 254.0) return mix(textureGrad(tFieldNear, xz / 512.0 + 0.5, fieldDx / 512.0, fieldDy / 512.0).rgb, far, smoothstep(236.0, 254.0, m));
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
  q += reliefAt(q.xz, q.y) * inner;
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
uniform sampler2D tKnob;
uniform sampler2D tCrustN;
uniform sampler2D tMud;
uniform sampler2D tMudN;
uniform sampler2D tRock;
uniform sampler2D tRockN;
uniform sampler2D tRockS;
uniform sampler2D tRockSN;
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

void main() {
  vec3 p = vWorld;
  vec3 toEye = cameraPosition - p;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec3 ng = normalize(vNormal);
  // The steps of the ground from one pixel to the next, taken here, once, before any branch. Every sheet read inside a branch below is
  // given its steps from these (textureGrad): a step taken inside a branch is not the same twice in the software renderer.
  vec3 px3 = dFdx(p);
  vec3 py3 = dFdy(p);
  vec2 px = px3.xz;
  vec2 py = py3.xz;
  fieldDx = px;
  fieldDy = py;
  vec3 f = fieldAt(p.xz);
  vec4 wide = texture2D(tGrain, p.xz / 97.0 + 0.11);
  vec4 mid = texture2D(tGrain, (p.xz + (wide.ba - 0.5) * 7.0) / 13.0 + 0.37);
  vec4 fine = vec4(0.5);
  if (dist < 420.0) fine = textureGrad(tGrain, p.xz / 1.9, px / 1.9, py / 1.9);
  float s = f.r + (fine.r - 0.5) * 0.1;
  float t = max(s, 0.0);
  // Where the crust is thin it is broken slabs on wet mud. (A shore of the flats is the pans themselves, going under.)
  float thin = f.g;
  float stain = f.b;
  float rock = smoothstep(0.28, 0.75, vBase);
  float near = smoothstep(90.0, 30.0, dist);
  float close = smoothstep(16.0, 6.0, dist);

  // The salt pans. The ground is broken into pans (panAt): each has a raised rim of crystals along its edge, drawn from the edge itself and
  // so as sharp as the picture is fine; its face is the sheet of the crust's surface (mat/pan), turned and shifted pan by pan. Where a
  // pan is smaller than a few pixels the pans drawn are five times the size. Their heights are what the brine's level stands against.
  float big = smoothstep(0.1, 0.3, max(length(px), length(py)));
  float k = smoothstep(0.0, 0.5, thin);
  vec3 sheet = vec3(1.0);
  float sh = 0.5;
  vec2 bend = vec2(0.0);
  float tone = 1.0;
  float rim = 0.0;
  float prof = 0.0;
  float footM = 0.0;
  float slab = 1.0;
  float ep = 1.0;
  float ea = 0.01;
  float lift = 0.0;
  vec2 tilt = vec2(0.0);
  vec2 edgeDir = vec2(0.0);
  // (The seep pool's bank is all knobs: no pan is worked out under them.)
  float bankDry = bankAt(tGrain, p.xz);
  bool onBank = bankDry >= 1.0;
  if (big < 1.0 && !onBank) {
    float e;
    vec2 pc;
    vec2 pdir;
    vec2 pr;
    vec2 turn;
    // (The edges wander by the grain's smooth height, read twice and wide: anything finer than the mesh would comb the plates' edges.)
    vec2 pw = p.xz + (vec2(textureLod(tGrain, p.xz / 7.6, 3.0).r, textureLod(tGrain, p.xz.yx / 9.1 + 0.37, 3.0).r) - 0.5) * 0.7;
    panAt(pw, PAN, e, pc, pdir, pr);
    vec2 uv = panSheet(p.xz, pr, turn);
    vec2 ax = vec2(turn.x * px.x - turn.y * px.y, turn.y * px.x + turn.x * px.y) / vec2(3.0, 2.0);
    vec2 ay = vec2(turn.x * py.x - turn.y * py.y, turn.y * py.x + turn.x * py.y) / vec2(3.0, 2.0);
    // (Seen along the ground a pixel is many times longer than it is wide: the sheet is read no more than three widths long, or it
    // would be smeared to the softness of snow.)
    float la = length(ax);
    float lb = length(ay);
    float lo = min(la, lb) * 3.0;
    ax *= min(1.0, lo / max(la, 1e-7));
    ay *= min(1.0, lo / max(lb, 1e-7));
    vec4 nA = textureGrad(tPanN, uv, ax, ay);
    sheet = textureGrad(tPan, uv, ax, ay).rgb / PAN_MEAN;
    sh = nA.b;
    vec2 sl = nA.rg - 0.5;
    // Under a lens the sheet's grain is coarser than a pixel: the same sheet lies on it again a fifth the size, as the crystals.
    float crystal = smoothstep(0.0016, 0.0006, min(length(px), length(py)));
    if (crystal > 0.0) {
      vec2 uc = uv * 5.3 + pr.yx;
      vec4 nC = textureGrad(tPanN, uc, ax * 5.3, ay * 5.3);
      sheet *= mix(vec3(1.0), 0.45 + 0.55 * textureGrad(tPan, uc, ax * 5.3, ay * 5.3).rgb / PAN_MEAN, crystal);
      sl += (nC.rg - 0.5) * 0.7 * crystal;
      sh += (nC.b - 0.5) * 0.15 * crystal;
    }
    bend = vec2(turn.x * sl.x + turn.y * sl.y, turn.x * sl.y - turn.y * sl.x) * 2.4;
    // (The rim is knobbed: its edge follows the lumps of the crust.)
    ep = e + (sh - 0.5) * 0.06 * (1.0 - 0.75 * k) - panGap(thin, pr, pw - pc);
    // (A broken plate's edge is ragged.)
    float rv = textureGrad(tGrain, p.xz / 0.9 + 0.13, px / 0.9, py / 0.9).r;
    float rv2 = textureLod(tGrain, p.xz / 2.3 + 0.5, 2.0).r;
    // (And chipped: here and there the top has flaked off the edge, and what shows is what the plate lies on.)
    if (k > 0.0) ep += (panRag(tGrain, p.xz) - 0.05 * smoothstep(0.5, 0.68, rv)) * k;
    ea = max(abs(dot(pdir, px)) + abs(dot(pdir, py)), 0.002);
    // (No rim is one width all the way round: it swells, thins and gives out.)
    float rimW = (0.03 + 0.04 * pr.x) * (1.0 - 0.45 * k) * mix(0.45 + 1.1 * rv2, 0.2 + 1.9 * smoothstep(0.3, 0.7, rv2), k);
    slab = smoothstep(-ea, ea, ep);
    rim = smoothstep(rimW + ea, rimW * 0.5 - ea, ep) * slab;
    prof = (1.0 - smoothstep(0.0, rimW * 1.6, ep)) * slab;
    footM = smoothstep(rimW * 3.0 + ea, rimW * 1.3, ep) * (1.0 - rim) * slab;
    bend -= pdir * prof * (1.0 - prof) * mix(2.0, 5.0, k);
    tone = 0.88 + 0.24 * pr.y;
    tilt = panTilt(pr);
    edgeDir = pdir;
    lift = panLift(pr, pc);
    rim *= mix(0.55 + 0.45 * smoothstep(0.35, 0.6, rv), smoothstep(0.42, 0.6, rv * 0.5 + rv2 * 0.5), k);
    // (The low edge of a tipped plate is under the mud.)
    float drowned = smoothstep(SUNK + 0.008, SUNK - 0.002, lift + (sh - 0.5) * 0.014 + 0.014 * pr.y * exp(-max(ep, 0.0) / 0.08)) * k;
    slab *= 1.0 - drowned;
    rim *= 1.0 - drowned;
    prof *= 1.0 - drowned;
    footM *= 1.0 - drowned;
  }
  if (big > 0.0) {
    float e;
    vec2 pc;
    vec2 pdir;
    vec2 pr;
    panAt(p.xz + (fine.rg - 0.5) * 1.2 + 31.7, PAN * 5.0, e, pc, pdir, pr);
    float a2 = max(abs(dot(pdir, px)) + abs(dot(pdir, py)), 0.002);
    float e2 = e - panGap(thin, pr, vec2(1e4)) * 4.0;
    float slab2 = smoothstep(-a2, a2, e2);
    float w2 = 0.14 + 0.16 * pr.x;
    rim = mix(rim, smoothstep(w2 + a2, w2 * 0.5 - a2, e2) * slab2, big);
    prof = mix(prof, (1.0 - smoothstep(0.0, w2 * 1.6, e2)) * slab2, big);
    footM *= 1.0 - big;
    slab = mix(slab, slab2, big);
    tone = mix(tone, 0.88 + 0.24 * pr.y, big);
    sheet = mix(sheet, vec3(1.0), big);
    sh = mix(sh, 0.5, big);
    bend *= 1.0 - big;
    lift *= 1.0 - big;
    tilt *= 1.0 - big;
  }
  // hgt: how high this spot stands among its neighbours, 0 to 1.
  float hgt = mix(0.42 + (sh - 0.5) * 0.5 + (tone - 1.0) * 0.6, 0.9, prof) * 0.88 + mid.g * 0.12;
  vec3 colour = greyed(sheet, 0.7) * vec3(0.3, 0.287, 0.275) * (0.86 + 0.28 * wide.r) * tone;
  // Salt stands white and crystalline on the rims; at a rim's foot the damp lies dark, and here and there the red has dried in it.
  colour = mix(colour, vec3(0.53, 0.515, 0.5) * (0.82 + 0.3 * sh), rim * 0.9);
  colour = mix(colour, vec3(0.11, 0.05, 0.04), max(footM * mix(0.1 + 0.3 * stain, 0.2 + 0.5 * stain, smoothstep(0.0, 0.5, thin)), smoothstep(0.3, 0.1, hgt) * (0.2 + 0.4 * stain) * (1.0 - big)));
  float occ = 1.0 - (0.3 * footM + 0.3 * smoothstep(0.4, 0.1, hgt)) * mix(0.5, 1.0, near);
  float rough = 1.0;
  float ground = 1.0;
  // The crust lies ON grey brown mud, in patches: back from the rims the mud shows wet where no crust has grown.
  float bare = smoothstep(0.55, 0.66, wide.g * 0.5 + mid.r * 0.5) * smoothstep(0.62, 0.4, hgt) * smoothstep(1.0, 3.0, t) * (1.0 - rock);
  float mudShare = max(bare * 0.55, smoothstep(0.34, 0.14, hgt) * 0.25 * (1.0 - rock));
  colour = mix(colour, vec3(0.2, 0.158, 0.132) * (0.7 + 0.6 * mid.b), mudShare);
  rough = mix(rough, 0.86, mudShare);

  // Slopes of the ground from the plates' relief, in metres a metre, on top of the mesh's own.
  vec2 lean = vec2(0.0);
  float foot = max(length(abs(px) + abs(py)) * 1.5, 0.07);

  float seep = 0.0;
  float crack = 0.0;
  // Thin crust over mud: the same pans, loose. Each is a plate lying on wet mud, drawn back from its neighbours and tipped; the gaps
  // between them are a hand to a stride wide and brine stands in them. A lifted edge shows its broken section and throws its shade.
  if (k > 0.0) {
    vec3 silt = textureGrad(tSilt, p.xz / 3.0, px / 3.0, py / 3.0).rgb;
    vec4 nS = textureGrad(tSiltN, p.xz / 3.0, px / 3.0, py / 3.0);
    // The wallow (painted into the fine patch): its mud is lower, wetter and darker than any other, and the slabs tipped round it are whole.
    float sunk = vPaint.x * k;
    float tipped = vPaint.y * k;
    slab = max(slab, tipped);
    // (Rust under the plates; grey where the stuck one has stirred it.)
    seep = deadSeep(p.xz + (nS.rg - 0.5) * 2.2) * k;
    crack = smoothstep(-0.22, -0.03, ep) * (1.0 - slab) * k;
    float stirred = 1.0 - smoothstep(2.0, 5.5, length(p.xz - vec2(${rel(STUCK[0], STUCK[1])[0].toFixed(3)}, ${rel(STUCK[0], STUCK[1])[1].toFixed(3)})));
    vec3 mudCol = silt * mix(vec3(0.27, 0.15, 0.12), vec3(0.27, 0.205, 0.18), stirred) * mix(vec3(1.0), vec3(0.5, 0.42, 0.38), sunk);
    vec2 grain = -(nS.rg - 0.5) * 0.8;
    if (close > 0.0) {
      // Close to the lens the silt's own grain is on the mud.
      vec4 nS2 = textureGrad(tSiltN, p.xz / 0.7 + 0.31, px / 0.7, py / 0.7);
      mudCol *= mix(vec3(1.0), 0.6 + 0.4 * textureGrad(tSilt, p.xz / 0.7 + 0.31, px / 0.7, py / 0.7).rgb / vec3(0.32, 0.281, 0.257), close);
      grain -= (nS2.rg - 0.5) * 0.5 * close;
    }
    mudCol *= mix(vec3(1.0), vec3(0.42, 0.2, 0.17), seep);
    float shade = smoothstep(-(0.03 + max(lift, 0.0) * 1.6), 0.0, ep) * (1.0 - big);
    mudCol *= 1.0 - 0.65 * shade;
    float section = smoothstep(-0.03 - ea, -0.03 + ea, ep) * (0.35 + 0.65 * smoothstep(0.005, 0.035, lift)) * (1.0 - big);
    mudCol = mix(mudCol, mix(vec3(0.15, 0.07, 0.055), vec3(0.44, 0.4, 0.37), smoothstep(-0.014, -0.004, ep)) * (0.75 + 0.5 * sh), section);
    colour = mix(colour, mix(mudCol, mix(colour * vec3(0.66, 0.59, 0.55), colour, rim * 0.45) * mix(vec3(1.0), vec3(0.6, 0.36, 0.31), 0.9 * seep * smoothstep(0.7, 0.35, sh + (nS.b - 0.5) * 0.5)), slab), k);
    hgt = mix(hgt, mix(0.08 + 0.3 * nS.b, max(hgt, 0.5), slab), k);
    bend = mix(bend, mix(grain, bend - tilt * 4.0, slab), k);
    occ = mix(occ, mix(0.72 - 0.3 * shade, occ, slab), k);
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
    vec2 uTx = vec2(px.x * 0.8 - px.y * 0.6, px.x * 0.6 + px.y * 0.8) / 3.1;
    vec2 uTy = vec2(py.x * 0.8 - py.y * 0.6, py.x * 0.6 + py.y * 0.8) / 3.1;
    vec2 uVx = vec2(px.x * 0.6 + px.y * 0.8, px.y * 0.6 - px.x * 0.8) / 4.7;
    vec2 uVy = vec2(py.x * 0.6 + py.y * 0.8, py.y * 0.6 - py.x * 0.8) / 4.7;
    vec4 nT = textureGrad(tRockN, uT, uTx, uTy);
    vec4 nV = textureGrad(tRockN, uV, uVx, uVy);
    float pickT = smoothstep(-0.1, 0.1, (mid.a - 0.5) * 2.5 + nT.b - nV.b);
    vec3 pat = mix(textureGrad(tRock, uV, uVx, uVy).rgb, textureGrad(tRock, uT, uTx, uTy).rgb, pickT);
    float pitT = mix(nV.b, nT.b, pickT);
    vec2 lT = mix(vec2(0.6 * (nV.r - 0.5) - 0.8 * (nV.g - 0.5), 0.8 * (nV.r - 0.5) + 0.6 * (nV.g - 0.5)), vec2(0.8 * (nT.r - 0.5) + 0.6 * (nT.g - 0.5), 0.8 * (nT.g - 0.5) - 0.6 * (nT.r - 0.5)), pickT) * 2.2;
    if (seen > 0.0) {
      vec2 uU = vec2(p.x * 0.28 + p.z * 0.96, p.z * 0.28 - p.x * 0.96) / 0.83 + 0.37;
      vec2 uUx = vec2(px.x * 0.28 + px.y * 0.96, px.y * 0.28 - px.x * 0.96) / 0.83;
      vec2 uUy = vec2(py.x * 0.28 + py.y * 0.96, py.y * 0.28 - py.x * 0.96) / 0.83;
      vec4 nU = textureGrad(tRockN, uU, uUx, uUy);
      pat *= mix(vec3(1.0), 0.5 + 0.5 * textureGrad(tRock, uU, uUx, uUy).rgb / vec3(0.379, 0.317, 0.286), seen);
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
      vec2 uXx = px3.zy / 1.7;
      vec2 uXy = py3.zy / 1.7;
      vec2 uZx = px3.xy / 1.7;
      vec2 uZy = py3.xy / 1.7;
      vec4 nX = textureGrad(tRockSN, uX, uXx, uXy);
      vec4 nZ = textureGrad(tRockSN, uZ, uZx, uZy);
      patS = mix(textureGrad(tRockS, uZ, uZx, uZy).rgb, textureGrad(tRockS, uX, uXx, uXy).rgb, ax);
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
  vec3 gn = normalize(cross(px3, py3));
  float sheer = smoothstep(0.86, 0.62, min(abs(gn.y), ng.y)) * (1.0 - rock) * smoothstep(120.0, 60.0, dist) * (1.0 - k);
  if (sheer > 0.0) {
    vec4 gb = textureGrad(tGrain, vec2(dot(p.xz, vec2(0.7, 0.71)) / 0.9, p.y / 0.11), vec2(dot(px, vec2(0.7, 0.71)) / 0.9, px3.y / 0.11), vec2(dot(py, vec2(0.7, 0.71)) / 0.9, py3.y / 0.11));
    vec3 section = mix(vec3(0.17, 0.085, 0.07), vec3(0.4, 0.365, 0.34), 0.35 * smoothstep(0.35, 0.65, gb.r) + 0.65 * smoothstep(0.03, 0.07, p.y - vBase + 0.02)) * (0.7 + 0.5 * gb.g);
    // (Its foot stands in the brine and is dark with it.)
    section = mix(vec3(0.085, 0.04, 0.032), section, smoothstep(0.02, 0.16, p.y + (gb.b - 0.5) * 0.08));
    colour = mix(colour, section, sheer);
    bend *= 1.0 - sheer;
    occ *= 1.0 - 0.2 * sheer;
  }
  // A plate's broken edge seen side on: a finger of pale salt over the rust it grew on, dark where it goes down to the mud.
  float cut = k * smoothstep(0.9, 0.7, abs(gn.y)) * (1.0 - big) * (1.0 - rock);
  if (cut > 0.0) {
    float rise = p.y - vBase;
    vec3 sect = mix(vec3(0.15, 0.07, 0.055), vec3(0.47, 0.44, 0.41), smoothstep(lift - 0.014, lift - 0.006, rise));
    // (Its beds lie level: the sheet laid from above would run down it in stripes.)
    sect *= 0.8 + 0.4 * textureGrad(tGrain, vec2(dot(p.xz, vec2(0.7, 0.71)) / 0.6, p.y / 0.07), vec2(dot(px, vec2(0.7, 0.71)) / 0.6, px3.y / 0.07), vec2(dot(py, vec2(0.7, 0.71)) / 0.6, py3.y / 0.07)).r;
    sect *= 0.5 + 0.5 * smoothstep(SUNK, lift, rise);
    colour = mix(colour, sect, cut);
    bend *= 1.0 - cut;
    hgt = mix(hgt, 1.0, cut);
  }
  // The bank the third lens lies on is salt thrown up by the pool: it stands dry over the level and is knobbed all over.
  vec3 knobCol = vec3(0.0);
  float knobH = 0.5;
  if (bankDry > 0.0) {
    vec2 uA = knobUv(p.xz, KNOB_A, 1.0);
    vec2 uB = knobUv(p.xz, KNOB_B, 1.43) + 0.37;
    vec2 uAx = knobUv(px, KNOB_A, 1.0);
    vec2 uAy = knobUv(py, KNOB_A, 1.0);
    vec2 uBx = knobUv(px, KNOB_B, 1.43);
    vec2 uBy = knobUv(py, KNOB_B, 1.43);
    vec4 nA = textureGrad(tKnobN, uA, uAx, uAy);
    vec4 nB = textureGrad(tKnobN, uB, uBx, uBy);
    float pick = smoothstep(-0.08, 0.08, nB.b - nA.b + (textureLod(tGrain, p.xz / 3.1 + 0.6, 3.0).r - 0.5) * 1.2);
    bool second = pick > 0.5;
    vec2 uP = second ? uB : uA;
    vec2 gx = second ? uBx : uAx;
    vec2 gy = second ? uBy : uAy;
    knobCol = textureGrad(tKnob, uP, gx, gy).rgb;
    knobH = mix(nA.b, nB.b, pick);
    vec2 sA = nA.rg - 0.5;
    vec2 sB = nB.rg - 0.5;
    vec2 kb = mix(vec2(KNOB_A.x * sA.x + KNOB_A.y * sA.y, KNOB_A.x * sA.y - KNOB_A.y * sA.x), vec2(KNOB_B.x * sB.x + KNOB_B.y * sB.y, KNOB_B.x * sB.y - KNOB_B.y * sB.x), pick) * 2.6;
    // Under the lens the sheet's grain is coarser than a pixel: the same sheet again a sixth the size, as the crystals of the knobs.
    float crystal = smoothstep(0.0016, 0.0005, min(length(px), length(py)));
    if (crystal > 0.0) {
      vec2 uC = uP * 6.1 + 0.23;
      vec4 nC = textureGrad(tKnobN, uC, gx * 6.1, gy * 6.1);
      vec3 cC = textureGrad(tKnob, uC, gx * 6.1, gy * 6.1).rgb;
      knobCol *= mix(1.0, 0.55 + 0.45 * dot(cC, vec3(0.3333)) / 0.235, crystal * smoothstep(0.35, 0.6, knobH));
      vec2 sC = nC.rg - 0.5;
      kb += (second ? vec2(KNOB_B.x * sC.x + KNOB_B.y * sC.y, KNOB_B.x * sC.y - KNOB_B.y * sC.x) : vec2(KNOB_A.x * sC.x + KNOB_A.y * sC.y, KNOB_A.x * sC.y - KNOB_A.y * sC.x)) * 0.8 * crystal;
    }
    bend = mix(bend, kb, bankDry);
    hgt = mix(hgt, knobH, bankDry);
    occ = mix(occ, 0.5 + 0.5 * smoothstep(0.2, 0.6, knobH), bankDry);
  }
  if (close > 0.0) {
    float dryish = max(max(slab, rock), (1.0 - smoothstep(0.0, 0.5, thin)) * smoothstep(0.35, 0.6, hgt));
    vec2 uG = p.xz / 0.62 + 0.31;
    // (What is dry has its crystals from the pan's own sheet, laid small; the silt's grain is for the mud.)
    float muddy = close * (1.0 - rock) * (1.0 - dryish);
    vec3 g = vec3(1.0);
    vec4 ng2 = vec4(0.5);
    if (muddy > 0.0) {
      g = textureGrad(tSilt, uG, px / 0.62, py / 0.62).rgb / vec3(0.32, 0.281, 0.257);
      ng2 = textureGrad(tSiltN, uG, px / 0.62, py / 0.62);
    }
    colour *= mix(vec3(1.0), 0.62 + 0.38 * g, muddy);
    // The rind at a waterline and the rims a stride back from it: salt grown in knobs a few fingers across, white on top, stained in
    // the clefts, each with its own small hard shadow from the brighter quarter of the sky. The crust's picture, laid small.
    float knobby = (1.0 - bankDry) * (1.0 - smoothstep(0.0, 0.5, thin)) * smoothstep(3.0, 0.8, t) * smoothstep(0.4, 0.65, hgt) * close * (1.0 - rock) * step(0.0, s);
    if (knobby > 0.0) {
      vec2 uK = vec2(p.x * 0.6 - p.z * 0.8, p.x * 0.8 + p.z * 0.6) / 0.55;
      vec2 uKx = vec2(px.x * 0.6 - px.y * 0.8, px.x * 0.8 + px.y * 0.6) / 0.55;
      vec2 uKy = vec2(py.x * 0.6 - py.y * 0.8, py.x * 0.8 + py.y * 0.6) / 0.55;
      vec4 nk = textureGrad(tCrustN, uK, uKx, uKy);
      float lit2 = textureGrad(tCrustN, uK + vec2(-0.86 * 0.6 - 0.5 * 0.8, -0.86 * 0.8 + 0.5 * 0.6) * 0.035, uKx, uKy).b;
      vec3 ck = textureGrad(tCrust, uK, uKx, uKy).rgb / vec3(0.413, 0.304, 0.269);
      vec3 knob = mix(vec3(0.2, 0.075, 0.06), mix(vec3(0.52, 0.5, 0.48), vec3(0.42, 0.3, 0.26), exp(-t / 0.4)) * (0.6 + 0.4 * greyed(ck, 0.4)), smoothstep(0.4, 0.72, nk.b));
      colour = mix(colour, knob, knobby * 0.85);
      bend -= (nk.rg - 0.5) * 2.4 * knobby;
      occ *= 1.0 - knobby * (0.5 * smoothstep(0.5, 0.15, nk.b) + 0.45 * smoothstep(0.03, 0.14, lit2 - nk.b));
      hgt += (nk.b - 0.5) * 0.25 * knobby;
    }
    bend -= (ng2.rg - 0.5) * 0.7 * muddy;
    hgt += (ng2.b - 0.5) * 0.16 * muddy;
    occ *= 1.0 - 0.3 * smoothstep(0.45, 0.15, ng2.b) * muddy;
  }

  // (That salt is wet with the pool's spray and stained by it.)
  // Where the big ones wade the banks are trodden mud: clods and prints, wet, with the red standing in every print.
  float churn = smoothstep(9.5, 6.0, length(p.xz - vec2(${rel(34.3, 3)[0].toFixed(3)}, ${rel(34.3, 3)[1].toFixed(3)}))) * (1.0 - rock) * step(0.0, s);
  if (churn > 0.0) {
    // (Where the brine lies against the trodden bank the ground is soaked dark for a foot or two back from it, unevenly.)
    colour *= mix(vec3(1.0), vec3(0.42, 0.3, 0.27), churn * smoothstep(0.6, 0.05, t + (mid.g - 0.5) * 0.5));
    // The slick mud's sheet (mat/slick, a stride and a half across), laid twice and turned unlike ways as the bank's knobs are: at a spot
    // the lay that stands higher is the one seen. Under it the treading itself: hollows a foot across, from the grain's pits.
    vec2 uA = knobUv(p.xz, KNOB_A, 1.5);
    vec2 uB = knobUv(p.xz, KNOB_B, 2.1) + 0.37;
    vec2 uAx = knobUv(px, KNOB_A, 1.5);
    vec2 uAy = knobUv(py, KNOB_A, 1.5);
    vec2 uBx = knobUv(px, KNOB_B, 2.1);
    vec2 uBy = knobUv(py, KNOB_B, 2.1);
    vec4 nA = textureGrad(tSlickN, uA, uAx, uAy);
    vec4 nB = textureGrad(tSlickN, uB, uBx, uBy);
    float pick = smoothstep(-0.08, 0.08, nB.b - nA.b + (textureLod(tGrain, p.xz / 2.7 + 0.2, 3.0).r - 0.5) * 1.2);
    bool second = pick > 0.5;
    vec2 uP = second ? uB : uA;
    vec3 cM = textureGrad(tSlick, uP, second ? uBx : uAx, second ? uBy : uAy).rgb / SLICK_MEAN;
    vec4 nP = textureGrad(tGrain, p.xz / 3.7 + 0.21, px / 3.7, py / 3.7);
    float clod = mix(nA.b, nB.b, pick) * 0.5 + nP.g * 0.5;
    vec2 sA = nA.rg - 0.5;
    vec2 sB = nB.rg - 0.5;
    vec2 kb = mix(vec2(KNOB_A.x * sA.x + KNOB_A.y * sA.y, KNOB_A.x * sA.y - KNOB_A.y * sA.x), vec2(KNOB_B.x * sB.x + KNOB_B.y * sB.y, KNOB_B.x * sB.y - KNOB_B.y * sB.x), pick);
    // (Dark and red with the brine in it, and wet through: it shines.)
    colour = mix(colour, vec3(0.1, 0.04, 0.031) * cM * (0.5 + 0.8 * clod), churn);
    hgt = mix(hgt, clod, churn);
    bend = mix(bend, kb * 2.2 - (nP.ba - 0.5) * 0.35, churn);
    occ = mix(occ, 1.0 - 0.5 * smoothstep(0.55, 0.25, clod), churn);
    rough = mix(rough, 0.42, churn);
  }

  // The brine's level against the heights. At the shore most of the relief is under it and only the plates' tops stand out; a stride back
  // only the cracks hold it; where the flats lie low it comes up again in sheets.
  float lowland = smoothstep(0.52, 0.72, wide.g * 0.55 + mid.g * 0.2 + 0.3 * stain + 0.25 * (wide.r - 0.5));
  // (A pan stands dry right up to its shore: back from the waterline the level reaches only the cracks and the lowest dishes.)
  float level = 0.85 * exp(-t / 0.14) + 0.2 * exp(-t / (2.5 + 5.0 * wide.r)) + lowland * mix(0.1, 0.15, smoothstep(140.0, 50.0, dist)) * smoothstep(700.0, 150.0, dist);
  level = min(level, 0.97) * (1.0 - rock);
  level = mix(level, mix(0.35, 0.24, smoothstep(12.0, 40.0, dist)) + 0.12 * lowland + 0.2 * exp(-t / 0.6), smoothstep(0.0, 0.5, thin));
  level *= 1.0 - 0.25 * bankDry;
  level = mix(level, 0.4, churn);
  float over = hgt - level;
  float aa = max(0.02 + 0.1 * smoothstep(30.0, 200.0, dist) + 0.01 * churn, fwidth(over) * 1.3);
  float flood = smoothstep(aa, -aa, over);
  // At a shore the brine does not stand on ground that is over its level: there the ground is wet, not under.
  flood *= mix(1.0, smoothstep(0.05, 0.005, p.y), smoothstep(0.6, 0.2, t) * (1.0 - smoothstep(0.0, 0.5, f.g)) * (1.0 - churn)) * (1.0 - bankDry);
  float damp = smoothstep(0.34, 0.03, over);
  // Damp ground is darker and redder, and what the brine has soaked is stained by it.
  // (Damp salt is grey, not pink: the red is only in what the brine itself has soaked, a stride from it.)
  colour = mix(colour, colour * mix(vec3(0.62, 0.575, 0.55), vec3(0.5, 0.33, 0.29), clamp(exp(-t / 0.9) * 0.8, 0.0, 1.0) * (1.0 - 0.6 * smoothstep(0.0, 0.5, thin))), damp * (1.0 - 0.8 * churn));
  rough = mix(rough, mix(0.95, 0.86, smoothstep(0.0, 0.5, thin) * (1.0 - slab)), damp * (1.0 - rock) * (1.0 - churn));
  // The last hand's breadths before the brine are soaked with it: dark, red and shining.
  // (Seen from far the band is wider than a hand: the wet margin of a channel is strides of dark mud, and no shore is a cut line.)
  float farBand = 1.5 * smoothstep(15.0, 80.0, dist);
  // (Its width is the ground's: a stride where the pans lie low, a hand where a rim stands up to the brine.)
  float wetTo = 0.3 + 0.9 * mid.g + farBand;
  float tw = t + (hgt - 0.45) * 0.7 * smoothstep(120.0, 40.0, dist);
  float soaked = smoothstep(wetTo, 0.05, tw) * step(0.0, s) * (1.0 - rock) * (1.0 - bankDry);
  // (That margin is slick mud of its own, mat/slick: dark rust, shining, with the last of the salt going under in it.)
  if (soaked > 0.0) {
    vec2 uS = vec2(p.x * 0.6 + p.z * 0.8, p.z * 0.6 - p.x * 0.8) / 1.7;
    vec2 uSx = vec2(px.x * 0.6 + px.y * 0.8, px.y * 0.6 - px.x * 0.8) / 1.7;
    vec2 uSy = vec2(py.x * 0.6 + py.y * 0.8, py.y * 0.6 - py.x * 0.8) / 1.7;
    vec3 cS = textureGrad(tSlick, uS, uSx, uSy).rgb / SLICK_MEAN;
    vec2 sS = textureGrad(tSlickN, uS, uSx, uSy).rg - 0.5;
    float seenS = smoothstep(60.0, 20.0, dist);
    float m = soaked * (1.0 - 0.75 * churn);
    colour = mix(colour * mix(vec3(1.0), vec3(0.5, 0.3, 0.26), m), vec3(0.085, 0.04, 0.032) * mix(vec3(1.0), cS, seenS), m * 0.85);
    bend = mix(bend, vec2(0.6 * sS.x - 0.8 * sS.y, 0.8 * sS.x + 0.6 * sS.y) * 1.6, m * 0.7 * seenS);
  }
  rough = mix(rough, 0.82, soaked * (1.0 - churn));
  // Round every pool, a stride back from its wet margin, the brine has left its salt: a pale rim, broken, wider here and narrower there.
  float rimAt = wetTo + 0.3 + 0.5 * mid.r;
  float salted = smoothstep(wetTo * 0.5, wetTo, tw) * smoothstep(rimAt + 0.9, rimAt, t) * smoothstep(0.3, 0.55, mid.b * 0.6 + fine.b * 0.4) * (1.0 - rock) * step(0.0, s) * (1.0 - flood) * (1.0 - churn) * (1.0 - 0.8 * sheer) * (1.0 - 0.85 * k);
  colour = mix(colour, vec3(0.53, 0.512, 0.495) * (0.72 + 0.45 * hgt) * mix(1.0, dot(sheet, vec3(0.3333)), 0.45), salted * mix(0.7, 0.55, close));
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

  // The seep pool's bank: the knobs' own picture. Their tops are dry white salt; the hollows between them, and all of it for a hand
  // over the brine, are wet and red with it.
  float wetK = 0.0;
  float bay = 0.0;
  if (bankDry > 0.0) {
    wetK = max(smoothstep(0.5, 0.26, knobH), smoothstep(0.07, 0.0, p.y) * smoothstep(0.75, 0.45, knobH));
    // (Away from the lens it is stained in patches where the brine has stood on it, and wet for a stride in from every shore.)
    // (More of it lies low toward the shore, so the brine comes in there in bays and stands further in as pools: no clean outline.)
    float lowK = bankLow(tGrain, p.xz) + 0.09 * smoothstep(1.8, 0.0, t);
    float away = bankFar(p.xz);
    float sunkK = smoothstep(-0.05, 0.06, lowK) * away;
    bay = smoothstep(0.07, 0.09, lowK + (0.5 - knobH) * 0.07) * away * bankDry * (1.0 - rock);
    float stood = sunkK * smoothstep(0.95, 0.5, knobH);
    wetK = max(wetK, max(0.9 * stood, smoothstep(0.16, 0.02, p.y) * smoothstep(0.95, 0.5, knobH)));
    knobCol *= 0.82 + 0.36 * wide.r;
    vec3 kc = knobCol * 0.8 * mix(vec3(1.0), vec3(0.52, 0.3, 0.27) * (1.0 - 0.35 * stood), wetK);
    kc *= 1.0 + clamp(0.3 * dot(bend, bright), -0.35, 0.3);
    colour = mix(colour, kc, bankDry * (1.0 - rock));
    rough = mix(rough, mix(1.0, 0.55, wetK), bankDry);
    wetK *= bankDry;
  }
  vec3 n = normalize(ng + vec3(bend.x, 0.0, bend.y) * (1.0 - 0.8 * flood));
  // (A broken edge is lit as one face along its plate's side, not facet by facet of the mesh that follows it.)
  if (cut > 0.0) n = normalize(mix(n, vec3(edgeDir.x, 0.3, edgeDir.y), 0.8 * cut));
  // (Rock keeps the lie of its own faces: a riser stays upright under its grain.)
  if (rock > 0.0) n = normalize(mix(n, normalize(normalize(vNormal) + rockBend), rock));
  vec3 lit = rigShade(p, n, v, colour, rough, occ);
  // (The trodden mud is wet: every clod that leans from the lens shows a little of the sky, sharp and small, never a sheet of it.)
  // (So is the mud between the slabs of the thin crust, and the bare mud back from the rims.)
  float wetMud = max(max(max(churn, wetK), soaked * 0.7), max(smoothstep(0.0, 0.5, thin) * (1.0 - slab) * 0.85, mudShare * 0.5)) * (1.0 - rock) * step(0.0, s);
  {
    // (The sheen is the mud's broad lie, not its grain: a grain that winks pixel by pixel is salt, not wet.)
    vec3 nw = normalize(ng + vec3(bend.x, 0.0, bend.y) * 0.3);
    vec3 rm = reflect(-v, nw);
    rm.y = abs(rm.y);
    lit += skyRadiance(rm) * vec3(1.0, 0.8, 0.76) * wetMud * occ * (0.01 + 0.11 * pow(1.0 - clamp(dot(nw, v), 0.0, 1.0), 4.0)) * (1.0 + 1.2 * churn);
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
    // (Along a plate's broken edge and in every narrow crack the brine itself stands, red; and what has run out of the dead is darker.)
    body = mix(body, mix(vec3(0.115, 0.022, 0.016), vec3(0.085, 0.012, 0.009), 1.0 - exp(-deep * 40.0)), crack * (1.0 - 0.5 * slurry * step(length(p.xz - HOLE), 3.0)));
    body = mix(body, vec3(0.05, 0.011, 0.009), 0.8 * seep);
    // (In the trodden mud what stands in the prints is the brine with the mud in it: brown red, never a bright sheet.)
    body = mix(body, mix(vec3(0.1, 0.035, 0.028), vec3(0.085, 0.016, 0.012), 1.0 - exp(-deep * 30.0)), churn);
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
  // (And where the knob bank lies under the level, in its bays and pools: a hand of brine over the knobs.)
  under = max(under, bay);
  if (under > 0.0) {
    vec2 run = (textureGrad(tGrain, p.xz / 7.3 + vec2(0.034, 0.019) * uTime, px / 7.3, py / 7.3).ba - 0.5) * 0.06 + (textureGrad(tGrain, p.xz / 4.1 - vec2(0.021, 0.05) * uTime, px / 4.1, py / 4.1).ba - 0.5) * 0.04;
    lit = mix(lit, brineShade(vec3(p.x, 0.0, p.z), normalize(vec3(run.x, 1.0, run.y)), v, mix(s, -0.1, bay), vec4(0.0)), under);
  }
  // In the brine's mirror the ground under the brine's level is not there: it would stand between the mirror's lens and the world.
  if (uMirror > 0.5 && p.y < -0.015) discard;
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;
