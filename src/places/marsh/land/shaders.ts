// The ground of the Blood Marsh, made of its pictures: every material is a picture with its own heights (public/assets/marsh/mat), the
// ground close to a lens is raised by those heights in its mesh, and the brine's level stands against them. What lies under the level is
// flooded and mirrors the sky; what lies a little over it is dark and wet; the rims over that carry the salt. One rule draws the shore, the
// wet margin, the puddles of the mud and the red pooled in the lows.
import { K1_AT } from '../shared/anchors';
import { BRINE_GLSL } from '../shared/brine-glsl';
import { RIG_GLSL } from '../shared/glsl';

/** True: the fine patches are raised by the pictures' heights (their vertices read the height maps). False: they are level and only shaded. */
export const RELIEF: boolean = true;

// Thickness of the rock's beds in metres.
const BED = '0.34';

// The two ground plates (pictures of one piece of ground from straight above, each with its relief) and where they lie. A plate does not
// repeat: it is laid out again and again, every second copy turned over so its edges meet themselves.
const PLATE_GLSL = /* glsl */ `
uniform sampler2D tLedgeH;
uniform sampler2D tThinH;
uniform sampler2D tShoreH;
// x, z of the plate's middle, then the unit vector its width runs along.
uniform vec4 uLedgeAt;
uniform vec4 uThinAt;
vec2 turned(vec2 c) { return 1.0 - abs(1.0 - mod(c, 2.0)); }
// Where a spot is on a plate, before it is turned over: one unit a copy.
vec2 plateAt(vec2 xz, vec4 at, vec2 size) {
  vec2 d = xz - at.xy;
  return vec2(dot(d, at.zw), dot(d, vec2(-at.w, at.z))) / size + 0.5;
}
const vec2 LEDGE = vec2(14.0, 7.98);
const vec2 THIN = vec2(5.0, 2.81);
// The thin crust is two lays of one plate, one turned over and moved: which a spot shows is the choice of the ground's slow grain
// (mid, at 13 m; fineG at 1.9 m). Returns the place on the plate and, in z, the choice: over 0 the second lay, 0 where they meet.
vec3 thinLay(vec2 xz, vec4 at, vec4 mid, float fineG) {
  vec2 c = plateAt(xz, at, THIN) + (mid.rg - 0.5) * 0.06;
  float pick = mid.a + (fineG - 0.5) * 0.3 - 0.5;
  if (pick > 0.0) c = vec2(1.43 - c.x, c.y + 0.71);
  return vec3(c, pick);
}
const float LEDGE_RISE = 0.42;
const float THIN_RISE = 0.035;
// The shore's plate is a strip across the waterline, 4 m of shore by 2.25 m: dry crust at its top, the rind of salt, the wet red mud, the
// line of froth (0.6 of the way down), then brine. It is laid along every shore by the way to the brine.
const vec2 SHORE = vec2(2.6, 1.46);
const float SHORE_RISE = 0.1;
float shoreRow(float s) { return clamp(0.6 - s / SHORE.y, 0.004, 0.996); }
// No shore keeps one width: the band is a stride wide here and a hand there, and its line wanders. g is the grain at xz / 13 + 0.37.
// The rind does not run all the way round anything: stretches of a shore carry it, and between them the ground goes under as it is.
float shoreHeld(vec4 g) { return smoothstep(0.36, 0.52, g.g); }
float shoreBand(float s, vec4 g) { return s * 1.35 / (0.45 + 1.5 * g.r) + (g.b - 0.5) * 0.4 * smoothstep(0.0, 0.3, s); }
// Which way is inland, from the field's own slope; and how much the shore there runs along x (1) or along z (0).
vec3 shoreWay(vec2 xz, float here) {
  vec2 g = vec2(fieldAt(xz + vec2(0.4, 0.0)).r - here, fieldAt(xz + vec2(0.0, 0.4)).r - here);
  g = g / max(length(g), 1e-4);
  return vec3(g, g.y * g.y);
}`;

// The heights the fine patches are raised by, read at a vertex. y0 is the ground's own height there.
const RELIEF_GLSL = /* glsl */ `
uniform sampler2D tCrustN;
uniform sampler2D tGrain;
uniform float uCell;
uniform vec4 uPatch;
uniform vec2 uAlong;
float reliefAt(vec2 xz, float y0) {
  float rock = smoothstep(0.28, 0.75, y0);
  float thin = smoothstep(0.0, 0.5, fieldAt(xz).g);
  float lod = log2(uCell * 205.0);
  float up = (textureLod(tCrustN, xz / 5.0, lod).b - 0.5) * 0.085 * smoothstep(-0.05, 0.25, y0);
  vec4 fine = textureLod(tGrain, xz / 1.9, 0.0);
  if (thin > 0.0) {
    vec4 wide = textureLod(tGrain, xz / 97.0 + 0.11, 0.0);
    vec4 mid = textureLod(tGrain, (xz + (wide.ba - 0.5) * 7.0) / 13.0 + 0.37, 0.0);
    up = mix(up, (textureLod(tThinH, turned(thinLay(xz, uThinAt, mid, fine.g).xy), lod + 0.8).r - 0.5) * THIN_RISE, thin);
  }
  float fr = fieldAt(xz).r;
  float s = fr + (fine.r - 0.5) * 0.1;
  if (s > -0.3 && s < 1.4) {
    vec3 way = shoreWay(xz, fr);
    vec4 sg = textureLod(tGrain, xz / 13.0 + 0.37, 0.0);
    float sb = shoreBand(s, sg);
    float row = shoreRow(sb);
    float h = mix(textureLod(tShoreH, vec2(turned(vec2(xz.y / SHORE.x + 0.37, 0.0)).x, row), lod + 2.0).r, textureLod(tShoreH, vec2(turned(vec2(xz.x / SHORE.x, 0.0)).x, row), lod + 2.0).r, way.z);
    up = mix(up, (h - 0.1) * SHORE_RISE, smoothstep(0.95, 0.7, sb) * smoothstep(-0.3, 0.0, s) * shoreHeld(sg));
  }
  if (rock > 0.0) up = mix(up, (textureLod(tLedgeH, turned(plateAt(xz, uLedgeAt, LEDGE)), lod + 0.8).r - 0.45) * LEDGE_RISE, rock);
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
uniform sampler2D tRime;
uniform sampler2D tRimeN;
uniform sampler2D tSilt;
uniform sampler2D tSiltN;
uniform sampler2D tLedge;
uniform sampler2D tThin;
uniform sampler2D tShore;
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
  vec3 f = fieldAt(p.xz);
  vec4 wide = texture2D(tGrain, p.xz / 97.0 + 0.11);
  vec4 mid = texture2D(tGrain, (p.xz + (wide.ba - 0.5) * 7.0) / 13.0 + 0.37);
  vec4 fine = vec4(0.5);
  if (dist < 420.0) fine = texture2D(tGrain, p.xz / 1.9);
  float s = f.r + (fine.r - 0.5) * 0.1;
  float t = max(s, 0.0);
  // Where the crust is thin, and along every shore a few strides back, it is broken slabs on wet mud.
  float thin = max(f.g, 0.8 * exp(-t / 3.5) * step(0.0, s));
  float stain = f.b;
  float rock = smoothstep(0.28, 0.75, vBase);
  float near = smoothstep(90.0, 30.0, dist);
  float close = smoothstep(16.0, 6.0, dist);

  // The salt crust: one picture at three sizes. Far off its plates are strides wide, turned and bent by the wide grain so no repeat shows;
  // near, the picture at its true size; at the lens the same again small, for the grain of a hand's breadth.
  vec2 uA = (vec2(p.x * 0.8 - p.z * 0.6, p.x * 0.6 + p.z * 0.8) + (wide.ba - 0.5) * 9.0) / 17.0;
  vec3 crust = texture2D(tCrust, uA).rgb;
  vec4 nA = texture2D(tCrustN, uA);
  // hgt: how high this spot stands among its neighbours, 0 to 1, from the pictures' heights.
  float hgt = nA.b * 0.7 + mid.g * 0.3;
  vec2 bend = -(nA.rg - 0.5) * 0.9 * (1.0 - near);
  if (near > 0.0) {
    vec2 uB = p.xz / 5.0;
    vec3 cB = texture2D(tCrust, uB).rgb;
    vec4 nB = texture2D(tCrustN, uB);
    crust = mix(crust, cB * (0.4 + 0.6 * crust / vec3(0.413, 0.304, 0.269)), near);
    hgt = mix(hgt, nB.b * 0.8 + nA.b * 0.2, near);
    bend -= (nB.rg - 0.5) * 2.2 * near;
    if (close > 0.0) {
      vec2 uC = vec2(p.x * 0.6 + p.z * 0.8, p.z * 0.6 - p.x * 0.8) / 1.3;
      vec3 cC = texture2D(tCrust, uC).rgb;
      vec4 nC = texture2D(tCrustN, uC);
      crust *= mix(vec3(1.0), 0.5 + 0.5 * cC / vec3(0.413, 0.304, 0.269), close);
      hgt += (nC.b - 0.5) * 0.22 * close;
      bend -= (nC.rg - 0.5) * 1.5 * close;
    }
  }
  vec3 colour = greyed(crust, 0.55) * (0.72 + 0.26 * wide.r);
  // Salt stands white on what is highest; the hollows between the plates are dark with old red.
  colour = mix(colour, vec3(0.42, 0.395, 0.375) * (0.75 + 0.5 * hgt), smoothstep(0.62, 0.88, hgt) * 0.3);
  colour = mix(colour, colour * vec3(0.62, 0.36, 0.32), smoothstep(0.42, 0.14, hgt) * (0.35 + 0.5 * stain));
  float occ = 1.0 - 0.4 * smoothstep(0.45, 0.1, hgt) * mix(0.5, 1.0, near);
  float rough = 1.0;
  float ground = 1.0;
  // The crust lies ON grey brown mud, in patches: back from the rims the mud shows wet where no crust has grown, and in the seams between
  // the plates.
  float bare = smoothstep(0.44, 0.54, wide.g * 0.5 + mid.r * 0.5) * smoothstep(1.0, 3.0, t) * (1.0 - rock);
  float mudShare = max(bare * 0.95, smoothstep(0.44, 0.2, hgt) * 0.7 * (1.0 - rock));
  colour = mix(colour, vec3(0.12, 0.092, 0.08) * (0.7 + 0.6 * mid.b), mudShare);
  rough = mix(rough, 0.5, mudShare);

  // Slopes of the ground from the plates' relief, in metres a metre, on top of the mesh's own.
  vec2 lean = vec2(0.0);
  // How wide a pixel is on the ground: the relief is read no finer than that.
  // The reliefs are soft clay models, not strict heights: slopes are taken from them a hand apart and blurred, and the sharp picture is
  // kept as how closed a spot is.
  float foot = max(length(fwidth(p.xz)) * 1.5, 0.07);

  // Thin crust over mud: the plate of it, broken slabs lying on wet grey mud with red in the gaps. Far off the plate gives way to wet silt.
  float slab = 0.0;
  {
    float k = smoothstep(0.0, 0.5, thin);
    // Where the two lays meet there is a gap of mud, as between any two rafts of crust.
    vec3 lay = thinLay(p.xz, uThinAt, mid, fine.g);
    vec2 c = lay.xy;
    float gap = smoothstep(0.045, 0.0, abs(lay.z));
    float plateSeen = smoothstep(110.0, 45.0, dist);
    vec3 pc = texture2D(tThin, turned(c)).rgb;
    float h0 = texture2D(tThinH, turned(c)).r * (1.0 - 0.6 * gap);
    float hm = texture2D(tThinH, turned(c), 2.5).r;
    float ha = texture2D(tThinH, turned(c + vec2(foot / THIN.x * (lay.z > 0.0 ? -1.0 : 1.0), 0.0)), 2.5).r;
    float hb = texture2D(tThinH, turned(c + vec2(0.0, foot / THIN.y)), 2.5).r;
    vec2 side = vec2(-uThinAt.w, uThinAt.z);
    vec2 grad = (uThinAt.zw * (ha - hm) + side * (hb - hm)) * (THIN_RISE * 2.0 / foot) * plateSeen;
    vec3 silt = texture2D(tSilt, p.xz / 3.0).rgb;
    vec4 nS = texture2D(tSiltN, p.xz / 3.0);
    vec3 mudCol = mix(silt, pc, plateSeen);
    // Close to the lens the silt's own grain is on the plate's mud, which is soft in the picture.
    slab = smoothstep(0.5, 0.62, h0 + (mid.b - 0.5) * 0.2) * plateSeen;
    // The wallow (painted into the fine patch): its mud is lower, wetter and darker than any other, and the slabs tipped round it are whole.
    float inCrust = smoothstep(0.0, 0.5, f.g);
    float sunk = vPaint.x * inCrust;
    float tipped = vPaint.y * inCrust;
    slab = max(slab * (1.0 - sunk), tipped);
    h0 = mix(mix(h0, 0.42 * h0 + 0.1, sunk), max(h0, 0.66), tipped);
    mudCol *= mix(vec3(1.0), vec3(0.5, 0.36, 0.33), sunk);
    if (close > 0.0) {
      vec4 nS2 = texture2D(tSiltN, p.xz / 0.7 + 0.31);
      mudCol *= mix(vec3(1.0), 0.6 + 0.4 * texture2D(tSilt, p.xz / 0.7 + 0.31).rgb / vec3(0.32, 0.281, 0.257), close * (1.0 - slab));
      grad -= (nS2.rg - 0.5) * 0.5 * close * (1.0 - slab);
    }
    // The slabs keep their salt; the mud between them is wet, and dark with it.
    colour = mix(colour, mudCol * mix(vec3(0.3, 0.225, 0.205), vec3(0.72), slab), k);
    hgt = mix(hgt, mix(nS.b * 0.6, h0, plateSeen), k);
    bend = mix(bend, -(nS.rg - 0.5) * 0.8 * (1.0 - plateSeen), k);
    lean += grad * k;
    occ = mix(occ, 1.0 - 0.45 * smoothstep(0.3, 0.05, h0) * plateSeen, k);
  }

  // Rock: the plate of it, bedded stone broken into blocks and ledges with red dried in its fractures, raised by its own relief. A face
  // too steep for a picture laid on from above takes the rock tile from the side it looks to.
  if (rock > 0.0) {
    float seen = smoothstep(160.0, 50.0, dist);
    vec2 c = plateAt(p.xz, uLedgeAt, LEDGE);
    vec3 pc = texture2D(tLedge, turned(c)).rgb;
    float h0 = texture2D(tLedgeH, turned(c)).r;
    float hm = texture2D(tLedgeH, turned(c), 2.5).r;
    float ha = texture2D(tLedgeH, turned(c + vec2(foot / LEDGE.x, 0.0)), 2.5).r;
    float hb = texture2D(tLedgeH, turned(c + vec2(0.0, foot / LEDGE.y)), 2.5).r;
    vec2 side = vec2(-uLedgeAt.w, uLedgeAt.z);
    vec2 grad = (uLedgeAt.zw * (ha - hm) + side * (hb - hm)) * (LEDGE_RISE / foot);
    float steep = smoothstep(2.2, 4.0, length(grad));
    vec3 stone = pc;
    if (steep > 0.0) {
      vec2 uS = (abs(grad.x) > abs(grad.y) ? vec2(p.z, p.y * 1.4) : vec2(p.x, p.y * 1.4)) / 2.2 + 0.37;
      stone = mix(stone, texture2D(tRock, uS).rgb * (0.55 + 0.5 * pc / max(dot(pc, vec3(0.333)), 0.05) * 0.4), steep * 0.75);
    }
    stone *= vec3(1.0, 0.94, 0.84) * (0.5 + 0.2 * mid.g);
    // The sharp relief is how closed a spot is: fractures are dark, and the red has dried in them.
    float crack = smoothstep(0.38, 0.12, h0);
    stone = mix(stone, stone * vec3(0.55, 0.3, 0.24), crack * 0.7);
    // The foot of the rise is wet and red where the brine has wicked up it.
    float wick = smoothstep(1.0, 0.3, vBase + (mid.r - 0.5) * 0.6);
    stone = mix(stone, stone * vec3(0.62, 0.34, 0.3), wick * 0.6);
    float pit = smoothstep(0.4, 0.08, h0);
    colour = mix(colour, stone, rock);
    occ = mix(occ, (1.0 - 0.6 * pit) * (1.0 - 0.3 * steep) * (1.0 - 0.35 * vPaint.x) * (1.0 - 0.3 * vPaint.y), rock);
    bend *= 1.0 - rock;
    lean += grad * rock * mix(0.35, 1.0, seen);
    hgt = mix(hgt, 1.0, rock);
  }

  // The shore: its plate laid across the waterline. The rind of salt, the wet red mud under it and the line of froth are the picture's.
  vec4 sg = textureLod(tGrain, p.xz / 13.0 + 0.37, 0.0);
  float sb = shoreBand(s, sg);
  float shoreW = smoothstep(0.95, 0.7, sb) * step(0.0, s) * (1.0 - rock) * smoothstep(70.0, 30.0, dist) * shoreHeld(sg);
  if (shoreW > 0.0) {
    vec3 way = shoreWay(p.xz, f.r);
    float row = shoreRow(sb);
    float rowIn = shoreRow(sb + foot);
    float ux = turned(vec2(p.x / SHORE.x, 0.0)).x;
    float uz = turned(vec2(p.z / SHORE.x + 0.37, 0.0)).x;
    vec3 sc = mix(texture2D(tShore, vec2(uz, row)).rgb, texture2D(tShore, vec2(ux, row)).rgb, way.z);
    float sh = mix(texture2D(tShoreH, vec2(uz, row)).r, texture2D(tShoreH, vec2(ux, row)).r, way.z);
    float h0 = mix(texture2D(tShoreH, vec2(uz, row), 2.0).r, texture2D(tShoreH, vec2(ux, row), 2.0).r, way.z);
    float h1 = mix(texture2D(tShoreH, vec2(uz, rowIn), 2.0).r, texture2D(tShoreH, vec2(ux, rowIn), 2.0).r, way.z);
    colour = mix(colour, sc * 0.62, shoreW);
    hgt = mix(hgt, 0.25 + 0.75 * sh, shoreW);
    bend *= 1.0 - shoreW;
    lean = mix(lean, way.xy * (h1 - h0) * (SHORE_RISE * 1.6 / foot), shoreW);
    occ = mix(occ, 1.0 - 0.5 * smoothstep(0.75, 0.3, sh) * smoothstep(0.2, 0.3, sh), shoreW);
    slab = mix(slab, smoothstep(0.55, 0.75, sh), shoreW);
  }

  // At the lens a plate is softer than the eye: the grain of a hand's breadth is laid over it, granular salt on what is dry and high, the
  // silt's pits and ripple marks on the mud.
  // A face too steep for a picture laid on from above shows the crust's own section: salt in thin beds, stained between them.
  vec3 gn = normalize(cross(dFdx(p), dFdy(p)));
  float sheer = smoothstep(0.62, 0.38, abs(gn.y)) * (1.0 - rock) * smoothstep(40.0, 15.0, dist) * step(0.0, s);
  if (sheer > 0.0) {
    vec4 gb = texture2D(tGrain, vec2(dot(p.xz, vec2(0.7, 0.71)) / 0.9, p.y / 0.11));
    vec3 section = mix(vec3(0.3, 0.13, 0.11), vec3(0.6, 0.55, 0.51), smoothstep(0.35, 0.65, gb.r)) * (0.7 + 0.5 * gb.g);
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
    colour *= mix(vec3(1.0), 0.45 + 0.55 * g, close);
    colour *= mix(1.0, 0.75 + 0.5 * nh.b, nearer * dryish);
    // The rind at a waterline and the rims a stride back from it: salt grown in knobs a few fingers across, white on top, stained in
    // the clefts, each with its own small hard shadow from the brighter quarter of the sky. The crust's picture, laid small.
    float knobby = max(max(shoreW * smoothstep(0.32, 0.55, hgt), bankDry * smoothstep(0.26, 0.46, hgt)), (1.0 - smoothstep(0.0, 0.5, thin)) * smoothstep(3.0, 0.8, t) * smoothstep(0.4, 0.65, hgt)) * close * (1.0 - rock) * step(0.0, s);
    if (knobby > 0.0) {
      vec2 uK = vec2(p.x * 0.6 - p.z * 0.8, p.x * 0.8 + p.z * 0.6) / 0.55;
      vec4 nk = texture2D(tCrustN, uK);
      float lit2 = texture2D(tCrustN, uK + vec2(-0.86 * 0.6 - 0.5 * 0.8, -0.86 * 0.8 + 0.5 * 0.6) * 0.035).b;
      vec3 ck = texture2D(tCrust, uK).rgb / vec3(0.413, 0.304, 0.269);
      vec3 knob = mix(vec3(0.2, 0.075, 0.06), mix(vec3(0.7, 0.64, 0.585), vec3(0.6, 0.4, 0.35), exp(-t / 0.5)) * (0.6 + 0.4 * ck), smoothstep(0.28, 0.6, nk.b));
      colour = mix(colour, knob, knobby * 0.85);
      bend -= (nk.rg - 0.5) * 2.4 * knobby;
      occ *= 1.0 - knobby * (0.5 * smoothstep(0.5, 0.15, nk.b) + 0.45 * smoothstep(0.03, 0.14, lit2 - nk.b));
      hgt += (nk.b - 0.5) * 0.25 * knobby;
    }
    bend -= (ng2.rg - 0.5) * mix(0.9, 1.7, dryish) * close + (nh.rg - 0.5) * 1.2 * nearer * dryish;
    hgt += (ng2.b - 0.5) * 0.16 * close * (1.0 - rock);
    occ *= 1.0 - 0.3 * smoothstep(0.45, 0.15, ng2.b) * close;
  }

  // The brine's level against the heights. At the shore most of the relief is under it and only the plates' tops stand out; a stride back
  // only the cracks hold it; where the flats lie low it comes up again in sheets.
  float lowland = smoothstep(0.52, 0.72, wide.g * 0.55 + mid.g * 0.2 + 0.3 * stain + 0.25 * (wide.r - 0.5));
  float level = 0.85 * exp(-t / 0.35) + 0.5 * exp(-t / (2.5 + 5.0 * wide.r)) + lowland * mix(0.2, 0.3, smoothstep(140.0, 50.0, dist)) * smoothstep(700.0, 150.0, dist);
  level = min(level, 0.97) * (1.0 - rock);
  level = mix(level, 0.41 + 0.14 * lowland + 0.2 * exp(-t / 0.6), smoothstep(0.0, 0.5, thin));
  level = mix(level, 0.3, shoreW) * (1.0 - 0.9 * bankDry);
  float over = hgt - level;
  float aa = 0.02 + 0.1 * smoothstep(30.0, 200.0, dist);
  float flood = smoothstep(aa, -aa, over);
  float damp = smoothstep(0.34, 0.03, over);
  // Damp ground is darker and redder, and what the brine has soaked is stained by it.
  colour = mix(colour, colour * mix(vec3(0.6, 0.52, 0.5), vec3(0.5, 0.24, 0.2), clamp(stain * 0.8 + exp(-t / 1.5) * 0.7, 0.0, 1.0) * (1.0 - 0.6 * smoothstep(0.0, 0.5, thin))), damp);
  rough = mix(rough, mix(0.72, 0.42, smoothstep(0.0, 0.5, thin) * (1.0 - slab)), damp * (1.0 - rock));
  // Round every pool, a stride back from its wet margin, the brine has left its salt: a pale rim, broken, wider here and narrower there.
  float rimAt = 0.45 + 0.5 * mid.r;
  float salted = smoothstep(0.12, 0.3, t) * smoothstep(rimAt + 0.9, rimAt, t) * smoothstep(0.3, 0.55, mid.b * 0.6 + fine.b * 0.4) * (1.0 - rock) * step(0.0, s) * (1.0 - flood);
  colour = mix(colour, vec3(0.6, 0.57, 0.545) * (0.8 + 0.4 * hgt), salted * 0.7);
  // An overcast is not the same all round: the quarter away from the rain is the brighter, and every lump and lip shows it.
  vec2 bright = vec2(-0.86, 0.5);
  // The plates' slopes are real slopes: the mesh's normal leans by them.
  lean = lean * min(1.0, 4.0 / max(length(lean), 1e-3));
  ng = normalize(vec3(ng.x / max(ng.y, 0.2) - lean.x, 1.0, ng.z / max(ng.y, 0.2) - lean.y));
  colour *= 1.0 + clamp(0.22 * dot(bend, bright) + mix(0.25, 0.32, rock) * dot(ng.xz, bright), -0.45, 0.35);
  // Far off, the red of stalks and growth too small to draw lies on the flats as a haze of colour.
  colour = mix(colour, vec3(0.16, 0.06, 0.055), smoothstep(0.44, 0.6, wide.g * 0.5 + mid.g * 0.5) * smoothstep(150.0, 500.0, dist) * 0.22 * (1.0 - rock));

  vec3 n = normalize(ng + vec3(bend.x, 0.0, bend.y) * (1.0 - 0.8 * flood));
  vec3 lit = rigShade(p, n, v, colour, rough, occ);
  // What is under the level: a film of brine over the ground, clear where it is a hair deep and blood where it is a finger, and a mirror.
  if (flood > 0.0) {
    float deep = max(-over, 0.0) * mix(0.3, 0.1, smoothstep(0.0, 0.5, thin));
    vec3 body = mix(vec3(0.2, 0.074, 0.05), vec3(0.085, 0.022, 0.018), 1.0 - exp(-deep * 26.0));
    body = mix(body, colour * 0.5, exp(-deep * mix(60.0, 25.0, smoothstep(0.0, 0.5, thin))));
    vec3 nf = normalize(vec3(bend.x * 0.03, 1.0, bend.y * 0.03));
    float share = mirrorShare(nf, v);
    float open = skyOpen(p) * mix(occ, 1.0, 0.5);
    vec3 film = body * skyIrradiance(vec3(0.0, 1.0, 0.0)) * (open / 3.14159) * (1.0 - share) + mirrorAt(p, nf) * share * mix(1.0, open, 0.5);
    lit = mix(lit, film, flood);
  }

  // The brine, where this ground is under it: the far channels are drawn here, the near ones are covered by the brine's own surface.
  float w = max(fwidth(f.r) * 0.75, 0.015);
  float under = smoothstep(w, -w, s) * (1.0 - rock) * (1.0 - smoothstep(0.2, 0.6, thin));
  if (under > 0.0) {
    vec2 run = (texture2D(tGrain, p.xz / 7.3 + vec2(0.034, 0.019) * uTime).ba - 0.5) * 0.06 + (texture2D(tGrain, p.xz / 4.1 - vec2(0.021, 0.05) * uTime).ba - 0.5) * 0.04;
    lit = mix(lit, brineShade(vec3(p.x, 0.0, p.z), normalize(vec3(run.x, 1.0, run.y)), v, s, vec4(0.0)), under);
  }
  // In the brine's mirror the ground under the brine's level is not there: it would stand between the mirror's lens and the world.
  if (uMirror > 0.5 && p.y < -0.015) discard;
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;
