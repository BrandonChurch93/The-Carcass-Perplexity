// The bore: one breaking wall of water across the strait. A swept section (a run-out over the flat, a hollow face, a lip that pitches forward
// and falls, a back that stands at the new level of the sea) whose height and state of breaking change along the wall and in time,
// with white water laid on it in metres and thrown water as lit cards. Every number of place and time comes from tide.ts and the anchors.
import * as THREE from 'three';
import { hash2 } from '../../../core/rng';
import { NOISE_GLSL, RIG_GLSL, RIG_UNIFORMS_GLSL } from '../shared/glsl';
import { WALL_A } from './crest';

/** The sheet that stands before the last shot's lens: mat/borewall-c.jpg, a dark standing face under a pitching lip. Its crest is level in the picture: the heads along it are given here. */
const WALL_B = { foot: 0.185, crest: 0.8, aspect: 2048 / 768, profile: Array.from({ length: WALL_A.profile.length }, (_, i) => {
    // Not one height along it: left of the lens it is already down, in the middle it stands and curls, toward the right stack it rears.
    const u = i / (WALL_A.profile.length - 1);
    const down = 1 - Math.min(1, Math.max(0, (u - 0.1) / 0.3));
    const rears = Math.min(1, Math.max(0, (u - 0.62) / 0.25));
    return 0.95 - 0.24 * down * down * (3 - 2 * down) + 0.09 * rears * rears * (3 - 2 * rears) + 0.028 * Math.sin(i * 0.19) + 0.014 * Math.sin(i * 0.53 + 1);
  }),
};
import { BORE_SPEED, boreArrives, boreFront } from './tide';
import { shotSpan } from '../shared/anchors';
import { loopPhase, stagedSeconds } from '../shared/stage';

const rand = (a: number, b: number): number => hash2(a, b) / 4294967296;
const f = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);

/** Metres of the section along its own length: the run-out ahead of the foot, the face from foot to lip, the lip's wrap, then the back. */
const APRON = 45;
const FACE = 40;
const LIP = 6;
/** Seconds from one fall of the lip to the next at one place on the wall. */
const BREAK_PERIOD = 2.9;
/** Metres of wall that one feature sheet of the breaking wave covers; it is laid mirrored on either side of itself, so its ends always join. */
const SHEET = 100;
/** Where along x the middle of sheet B stands (the last shot's lens looks at it), and how far sheet A is slid. */
const SLIDE_A = 0.37;
/** The built lip stands this far under the crest of the picture, so that nothing of the picture's sky is ever drawn on the wall. */
const UNDER = 0.95;
/** The height on both sheets, as a part of foot to crest, of the lower edge of the white that falls from the lip. */
const PIC_EDGE = 0.45;
/** The curtain of thrown water over the crest: its height as a part of the wall's. */
const CURTAIN = 0.36;
/** The sea ahead of the wall lifts to meet it: the height of that swell at the foot as a part of the lip's, and the metres over which it dies out ahead. */
const SWELL = 0.12;
const SWELL_RUN = 15;
const swellAt = (ahead: number, T: number): number => SWELL * T * Math.max(Math.exp(-Math.max(ahead, 0) / SWELL_RUN) - 0.05, 0);
const SPAN_A = (SHEET / WALL_A.aspect) * (WALL_A.crest - WALL_A.foot);
const SPAN_B = (SHEET / WALL_B.aspect) * (WALL_B.crest - WALL_B.foot);

const smooth = (lo: number, hi: number, v: number): number => {
  const u = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return u * u * (3 - 2 * u);
};
const mirrored = (u: number): number => {
  const m = u - 2 * Math.floor(u / 2);
  return m > 1 ? 2 - m : m;
};
const profileAt = (profile: number[], u: number): number => {
  const at = mirrored(u) * (profile.length - 1);
  const i = Math.min(profile.length - 2, Math.floor(at));
  const k = at - i;
  return (profile[i] as number) * (1 - k) + (profile[i + 1] as number) * k;
};

// The same sums on the processor and in the shader, so that thrown water is born exactly where the drawn lip is.
const lineAt = (x: number, t: number): number => 20 * Math.sin(x * 0.0076 + 1.3) + 8 * Math.sin(x * 0.021 + t * 0.25) + 3 * Math.sin(x * 0.09 - t * 0.6);
const whichAt = (x: number, focusX: number): number => smooth(0.4, 0.6, 0.5 + 0.5 * Math.cos((6.2832 * (x - focusX)) / (4 * SHEET)));
/** The height of the picture's crest over the flat at x, metres. */
const highAt = (x: number, focusX: number): number => {
  const strait = smooth(520, 950, 1470 - Math.abs(x - 80));
  const a = SPAN_A * profileAt(WALL_A.profile, x / SHEET + SLIDE_A);
  const b = SPAN_B * profileAt(WALL_B.profile, (x - focusX) / SHEET + 0.5);
  const w = whichAt(x, focusX);
  return (a * (1 - w) + b * w) * (0.3 + 0.7 * strait);
};
const curlAt = (x: number, t: number): number => {
  const ph = (6.2832 * t) / BREAK_PERIOD + 2.1 * Math.sin(x * 0.031 + 0.7) + 1.7 * Math.sin(x * 0.0573 + 2.1) + 1.2 * Math.sin(x * 0.113 + 4.0);
  return smooth(0.15, 0.85, 0.5 + 0.5 * Math.sin(ph));
};
/** The tip of the lip at x: metres ahead of the foot, and its height, as the shader draws it. */
const tipAt = (x: number, t: number, focusX: number): [number, number] => {
  const T = highAt(x, focusX) * UNDER;
  return [T * (-0.38 + 0.45 * curlAt(x, t)), T];
};

const SHAPE_GLSL = /* glsl */ `
uniform float uFront;
uniform float uPoolLevel;
uniform float uFocus;
uniform sampler2D tFoam;
uniform sampler2D tProfile;
float boreLine(float x) {
  return 20.0 * sin(x * 0.0076 + 1.3) + 8.0 * sin(x * 0.021 + uTime * 0.25) + 3.0 * sin(x * 0.09 - uTime * 0.6);
}
// Which of the two sheets stands at x: 1 is sheet B, before the last shot's lens.
float boreWhich(float x) {
  return smoothstep(0.4, 0.6, 0.5 + 0.5 * cos(6.2832 * (x - uFocus) / ${f(4 * SHEET)}));
}
// The height of the picture's crest over the flat at x.
float boreHigh(float x) {
  float strait = smoothstep(520.0, 950.0, 1470.0 - abs(x - 80.0));
  float a = ${f(SPAN_A)} * 2.0 * textureLod(tProfile, vec2(x / ${f(SHEET)} + ${f(SLIDE_A)}, 0.25), 0.0).r;
  float b = ${f(SPAN_B)} * 2.0 * textureLod(tProfile, vec2((x - uFocus) / ${f(SHEET)} + 0.5, 0.75), 0.0).r;
  return mix(a, b, boreWhich(x)) * (0.3 + 0.7 * strait);
}
// 0: the wall stands up clean and its lip begins to pitch. 1: the lip has fallen and the face is a tumbling pile of white.
float boreCurl(float x) {
  float ph = 6.2832 * uTime / ${f(BREAK_PERIOD)} + 2.1 * sin(x * 0.031 + 0.7) + 1.7 * sin(x * 0.0573 + 2.1) + 1.2 * sin(x * 0.113 + 4.0);
  return smoothstep(0.15, 0.85, 0.5 + 0.5 * sin(ph));
}
vec2 bez3(vec2 a, vec2 b, vec2 c, vec2 d, float t) {
  float s = 1.0 - t;
  return s * s * s * a + 3.0 * s * s * t * b + 3.0 * s * t * t * c + t * t * t * d;
}
// The section at x: a metres along it, T the height of its lip. Returns metres ahead of the foot and metres over the flat.
vec2 boreSection(float a, float T, float c) {
  vec2 tip = vec2(T * (-0.38 + 0.45 * c), T);
  vec2 crest = vec2(-0.6 * T, 0.96 * T);
  vec2 p;
  float swell = ${f(SWELL)} * T * 0.95;
  if (a < 0.0) {
    p = vec2(-a, 0.08 + 0.7 * exp(a / 9.0) + ${f(SWELL)} * T * max(exp(a / ${f(SWELL_RUN)}) - 0.05, 0.0));
  } else if (a < ${f(FACE)}) {
    float q = a / ${f(FACE)};
    p = bez3(vec2(0.0, 0.78 + swell), vec2(-0.5 * T, 0.06 * T + swell), vec2(T * (-0.66 + 0.3 * c), 0.82 * T), tip, q);
    // The fallen lip lies on the face as a pile that rolls ahead of the foot.
    float pile = c * sin(3.14159 * clamp(q * 1.5, 0.0, 1.0));
    p.x += 0.34 * T * pile;
  } else if (a < ${f(FACE + LIP)}) {
    float q = (a - ${f(FACE)}) / ${f(LIP)};
    float s = 1.0 - q;
    p = s * s * tip + 2.0 * s * q * (tip + vec2(0.03 * T, 0.0)) + q * q * crest;
  } else {
    float b = a - ${f(FACE + LIP)};
    p = vec2(crest.x - b, T * (0.6 + 0.36 * exp(-b / (0.8 * T))));
  }
  return p;
}
// A point of the bore in the world; w is its height as a part of the picture's crest (0 the foot, 1 the crest).
vec4 boreAt(float x, float a) {
  float T = boreHigh(x) * ${f(UNDER)};
  float c = boreCurl(x);
  vec2 p = boreSection(a, T, c);
  // White water stands in heads: the face is lumped toward and away from the lens, never up and down (the picture lies on it by height).
  float up = smoothstep(-8.0, 2.0, a) * (1.0 - smoothstep(${f(FACE - 4)}, ${f(FACE)}, a));
  vec2 ride = vec2(x, a + uTime * 5.0);
  float big = textureLod(tFoam, ride / 61.0, 1.0).r - 0.5;
  float mid = textureLod(tFoam, ride / 23.0 + 0.37, 1.5).g - 0.35;
  p.x += up * 0.09 * T * (1.2 * big + 0.8 * mid);
  p.y += 0.25 * (1.0 - smoothstep(-8.0, 2.0, a)) * mid;
  float z = uFront + boreLine(x) + p.x;
  float bed = max(texture2D(tLand, (vec2(x, z) - uLandRect.xy) * uLandRect.zw).r, uPoolLevel);
  float base = a < 0.0 ? p.y : ${f(SWELL)} * T * 0.95;
  return vec4(x, bed + p.y, z, (p.y - base) / (T / ${f(UNDER)} - base));
}`;

const VERTEX = /* glsl */ `
${RIG_UNIFORMS_GLSL}
${SHAPE_GLSL}
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vRide;
varying float vLift;
void main() {
  float x = position.x;
  float a = position.y;
  vLift = 0.0;
#ifdef CURTAIN
  // The thrown water over the crest: a sheet that stands on the lip and carries the top of the picture.
  float T = boreHigh(x) * ${f(UNDER)};
  vec2 tip = vec2(T * (-0.38 + 0.45 * boreCurl(x)), T);
  float z = uFront + boreLine(x) + tip.x + 0.4;
  float bed = max(texture2D(tLand, (vec2(x, z) - uLandRect.xy) * uLandRect.zw).r, uPoolLevel);
#ifdef BACK
  // A second wall behind the first: the wave is deep, and what breaks behind the crest stands over it, paler with the air between.
  float t = 0.35 + 1.05 * a;
  vWorld = vec3(x, bed + 1.18 * t * T / ${f(UNDER)}, z - 38.0 - 6.0 * a);
#else
  float t = ${f(UNDER)} * (1.0 - 0.06 + (${f(CURTAIN)} + 0.06) * a);
  vWorld = vec3(x, bed + t * T / ${f(UNDER)}, z - 1.5 * a);
#endif
  vNormalW = vec3(0.0, 0.3, 0.95);
  vRide = vec3(x, a, t);
#else
  vec4 at = boreAt(x, a);
  float da = a < ${f(FACE + LIP + 4)} ? 0.45 : 0.15 * (a - ${f(FACE + LIP)}) + 0.45;
  vec3 ax = boreAt(x + 0.6, a).xyz - boreAt(x - 0.6, a).xyz;
  vec3 aa = boreAt(x, a + da).xyz - boreAt(x, a - da).xyz;
  vWorld = at.xyz;
  vNormalW = normalize(cross(aa, ax));
  vRide = vec3(x, a, at.w);
  vLift = ${f(SWELL)} * boreHigh(x) * ${f(UNDER)} * max(exp(min(a, 0.0) / ${f(SWELL_RUN)}) - 0.05, 0.0);
#endif
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
${NOISE_GLSL}
${RIG_GLSL}
uniform sampler2D tFoam;
uniform sampler2D tFoamPic;
uniform sampler2D tWallA;
uniform sampler2D tWallB;
uniform float uFocus;
uniform float uFront;
uniform float uLast;
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vRide;
varying float vLift;
// The breaking wave as the two sheets show it, at x and at the height t (0 the foot, 1 the crest, more is the thrown water over it).
// The white water in it works: two readings slide past each other down the face, each fading in as the other fades out.
// The same clock as the built lip (boreCurl): 0 the wall stands clean, 1 its lip has fallen.
float curlAt(float x, float later) {
  float ph = 6.2832 * (uTime + later) / ${f(BREAK_PERIOD)} + 2.1 * sin(x * 0.031 + 0.7) + 1.7 * sin(x * 0.0573 + 2.1) + 1.2 * sin(x * 0.113 + 4.0);
  return smoothstep(0.15, 0.85, 0.5 + 0.5 * sin(ph));
}
// The height on the face down to which the white of the lip has fallen at x: high while the wall stands, at the foot when it has broken.
float fallenTo(float x) {
  float rag = texture2D(tFoam, vec2(x / 41.0, uTime * 0.07)).r - 0.5;
  // Curtains of it hang lower than the rest, a few metres wide.
  float hang = texture2D(tFoam, vec2(x / 13.0 + 0.3, uTime * 0.21)).g - 0.5;
  return clamp(mix(0.62, 0.22, curlAt(x, 0.0)) + 0.22 * rag + 0.16 * hang, 0.1, 0.8);
}
float fallen;
vec3 wallAt(float x, float t0) {
  // The sheets hold the white's lower edge at one height (${f(PIC_EDGE)}): the face is read through that edge moved to where the white has fallen to.
  float e = fallenTo(x);
  fallen = e;
#ifdef CURTAIN
  float t = t0;
#else
  float t = t0 > 1.0 || uLast < 0.5 ? t0 : (t0 < e ? t0 * ${f(PIC_EDGE)} / e : ${f(PIC_EDGE)} + (t0 - e) * ${f(1 - PIC_EDGE)} / (1.0 - e));
#endif
  float w = smoothstep(0.4, 0.6, 0.5 + 0.5 * cos(6.2832 * (x - uFocus) / ${f(4 * SHEET)}) + 0.12 * (vnoise(vec2(x * 0.05, t * 3.0)) - 0.5));
  float ua = x / ${f(SHEET)} + ${f(SLIDE_A)};
  float ub = (x - uFocus) / ${f(SHEET)} + 0.5;
  float va = mix(${f(WALL_A.foot)}, ${f(WALL_A.crest)}, t);
  float vb = mix(${f(WALL_B.foot)}, ${f(WALL_B.crest)}, t);
  float ph = uTime * 0.8;
  float p1 = fract(ph);
  float p2 = fract(ph + 0.5);
  // The water moves most where it is thrown and where it lands.
  float reach = 0.028 * (0.4 + 0.6 * smoothstep(0.5, 1.1, t) + 0.5 * smoothstep(0.35, 0.0, t));
  vec2 wob = 0.004 * vec2(sin(x * 0.7 + uTime * 2.3), 0.0);
  vec2 f1 = vec2(0.0, (p1 - 0.5) * reach) + wob;
  vec2 f2 = vec2(0.0, (p2 - 0.5) * reach) - wob;
  float k = abs(2.0 * p1 - 1.0);
  vec3 a = mix(texture2D(tWallA, vec2(ua, va) + f1).rgb, texture2D(tWallA, vec2(ua, va) + f2).rgb, k);
  vec3 b = mix(texture2D(tWallB, vec2(ub, vb) + f1).rgb, texture2D(tWallB, vec2(ub, vb) + f2).rgb, k);
  return mix(a, b, w);
}
void main() {
#ifdef BACK
  // The second wall is a sheet of sky colour with an edge when no thrown water hides it: in the last shot mist stands there instead.
  if (uLast > 0.5) discard;
#endif
  vec3 v = normalize(cameraPosition - vWorld);
  float x = vRide.x;
  float a = vRide.y;
  float t = vRide.z;
#ifdef BACK
  vec3 pic = wallAt(x + 143.0, t);
#else
  vec3 pic = wallAt(x, t);
#endif
  // The sheets were shot in flat light: here the white stays white and the green water goes down dark.
  pic = pow(pic, vec3(1.3)) * 1.12;
  // A wall of water: its face is dark and green under the lip, and only the far sheet's flat light is lifted a little.
  pic = mix(vec3(0.16, 0.2, 0.19), pic, smoothstep(0.0, 0.3, dot(pic, vec3(0.3, 0.5, 0.2))));
  float lum = dot(pic, vec3(0.3, 0.5, 0.2));
#ifndef CURTAIN
  // The face is water at work, and the sheets give only its large form: how white it is at each place. The white itself is broken water
  // photographed (the foam tile) at two sizes, running down the face at the pace water falls; on the dark band between the falling lip
  // and the pile at the foot it is thin streaks, long up the face, that the wave draws toward its lip.
  if (uLast > 0.5) {
    float heads = texture2D(tFoam, vec2(x / 19.0, uTime * 0.16)).g * 1.1;
    float big = dot(texture2D(tFoamPic, vec2(x / 29.0, a / 33.0 - uTime * 0.24)).rgb, vec3(0.3333));
    float fine = dot(texture2D(tFoamPic, vec2(x / 7.3 + 0.31, a / 9.0 - uTime * 0.85)).rgb, vec3(0.3333));
    float streak = dot(texture2D(tFoamPic, vec2(x / 15.0 + 0.6, a / 41.0 + uTime * 0.07)).rgb, vec3(0.3333));
    float white = smoothstep(0.3, 0.62, lum);
    float lace = mix(0.6 * streak + 0.4 * fine, 0.55 * big + 0.45 * fine, white);
    // The tile is nearly all white: its range is opened so that the foam has lumps, shade and holes at this distance.
    float n = clamp((lace - 0.24) / 0.32, 0.0, 1.0);
    // The pile at the foot: white the whole width of the wall, in heads that stand and sink, higher after the lip has come down on it.
    float pileTop = 0.26 + 0.2 * curlAt(x, -0.45) + 0.24 * (heads - 0.6);
    // The white of the lip hangs down the face to where it has fallen, and its lower edge is foam, not a line.
    float e = fallen + 0.4;
    float edge = t + 0.3 * (n - 0.5);
    white = max(white, max(1.0 - smoothstep(pileTop - 0.07, pileTop + 0.07, edge), smoothstep(e - 0.07, e + 0.07, edge)) * step(0.0, a));
    // All of the tile's white shows where the sheet is white, only its brightest threads on the dark water.
    float show = smoothstep(0.0, 0.25, n - (1.0 - white) * 0.82);
    vec3 water = vec3(0.094, 0.108, 0.08) * (0.75 + 0.8 * lum);
    // Its thickest lumps stand in the sun.
    vec3 foamed = mix(vec3(0.24, 0.275, 0.265), vec3(0.95, 0.96, 0.95), smoothstep(0.2, 0.85, n)) * (0.7 + 0.3 * white) * (1.0 + 0.45 * smoothstep(0.5, 1.0, n));
    pic = mix(water, foamed, show);
    lum = dot(pic, vec3(0.3, 0.5, 0.2));
  }
#endif
  vec4 land = landAt(vWorld.xz);
  // The wall stands over the blades' shade: half of it is always in the sun.
  float sun = mix(sunAt(vWorld + vec3(0.0, 30.0, 0.0), land), 1.0, 0.5);
  vec3 lightUp = skyIrradiance(vec3(0.0, 1.0, 0.0));
#ifdef CURTAIN
  float alpha = smoothstep(0.02, 0.22, lum) * (1.0 - smoothstep(0.6, 1.0, a)) * (1.0 - uSolo);
  // Thrown water is lumps and holes: no sheet of it has an edge, least of all where it leaves the lip.
  vec3 lumps = texture2D(tFoamPic, vec2(x / 13.0, a * 1.7 - uTime * 0.22)).rgb;
  float lump = dot(lumps, vec3(0.3333));
  alpha *= smoothstep(0.0, 0.3, a + 0.6 * (lump - 0.5)) * smoothstep(0.22 + 0.3 * a, 0.62 + 0.3 * a, lump + 0.25);
  pic = mix(lumps * 1.15 + 0.1, pic, smoothstep(0.1, 0.4, a));
  vec3 col = pic * (lightUp * 0.9 + uSunColour * 0.45 * sun) / 3.14159;
  // Thrown water is thin at its top and the bright sky behind the wave shows in it.
  vec3 behind = skyRadiance(-v);
  col = mix(col, behind * 1.05, (1.0 - alpha) * 0.7 + 0.12);
#ifdef BACK
  // Only its white stands over the first: its dark water would be a slab in the air.
  alpha *= smoothstep(0.0, 0.12, a) * 0.85 * smoothstep(0.3, 0.55, lum);
  col = mix(col, behind, 0.35);
#endif
  gl_FragColor = vec4(rigOut(col) * alpha, alpha);
#else
  // The churn at the foot and the run-out over the flat: broken white water seen from above, laid in metres on the ground.
  vec2 g = vWorld.xz - vec2(0.0, uFront);
  vec3 churn = texture2D(tFoamPic, g / 6.0 + vec2(0.0, uTime * 0.35)).rgb * 0.6 + texture2D(tFoamPic, g.yx / 17.0 + 0.3).rgb * 0.5;
  float churnLum = dot(churn, vec3(0.333));
  float ahead = clamp(-a / ${f(APRON)}, 0.0, 1.0);
  float tongue = texture2D(tFoam, vec2(x, uTime * 2.0) / 53.0).r + 0.6 * texture2D(tFoam, vec2(x, a + uTime * 5.0) / 19.0).r;
  float run = 1.3 - 2.2 * ahead / (0.2 + tongue);
  float apron = smoothstep(0.3, 0.8, run + 0.9 * (churnLum - 0.45));
  // Ahead of the white the lifted sea is dark water; where it has not yet lifted the flat's own sheet shows.
  float lifted = smoothstep(0.05, 0.4, vLift - 0.12 * tongue);
  bool bare = a < 0.0 && apron < 0.3 && lifted <= 0.0;
  float foot = a < 0.0 ? 1.0 : smoothstep(0.1, 0.0, t);
  pic = mix(pic, max(churn, vec3(0.5) * step(a, 0.0) * 0.0) + 0.25 * apron * step(a, 0.0), foot);
  // No wave has an outline: the top of the wall is churned white with holes in it, torn lower in one place than the next.
  vec3 top = texture2D(tFoamPic, vec2(x / 9.0, t * 2.2 - uTime * 0.3)).rgb;
  float torn = smoothstep(0.7, 1.0, t) * 1.3 - dot(top, vec3(0.3333)) - 0.25 * (tongue - 0.8);
  pic = mix(pic, top * 1.1 + 0.12, smoothstep(0.72, 0.9, t) * step(0.0, a));
  bare = bare || (a > 0.0 && torn > 0.32);
  lum = dot(pic, vec3(0.3, 0.5, 0.2));
  float foam = smoothstep(0.2, 0.6, lum);
  vec3 n = normalize(vNormalW);
  if (dot(n, v) < 0.0) n = -n;
  // The picture has its own form: the built face lights it broadly, and only the dark water takes the sky's glint.
  vec3 nf = normalize(mix(n, vec3(0.0, 0.45, 0.89), 0.6 + 0.3 * foam));
  // Under the falling lip the face is in its shade: a dark trough before the white of the run-out.
  float trough = smoothstep(0.02, 0.16, t) * (1.0 - smoothstep(0.3, 0.62, t)) * step(0.0, a);
  // The dark water is torn and aerated, not glass: the sun lies on it as a broad sheen, never as bright threads.
  vec3 col = rigShade(vWorld, nf, v, pic * 0.8 * (1.0 - 0.22 * trough), mix(uLast > 0.5 ? 0.58 : 0.3, 1.0, foam), 1.0 - 0.3 * trough);
  col += pic * (uSunColour * 0.12 * sun + lightUp * 0.1) / 3.14159;
  if (a < 0.0) {
    vec3 nw = normalize(n + vec3(texture2D(tFoam, g / 7.1 + vec2(0.0, uTime * 0.2)).rg + texture2D(tFoam, g.yx / 2.9 - vec2(uTime * 0.3, 0.0)).gr - 1.0, 0.0).xzy * 0.2);
    vec3 r = reflect(-v, nw);
    r.y = abs(r.y) + 0.02;
    float fr = 0.02 + 0.98 * pow(1.0 - clamp(dot(nw, v), 0.0, 1.0), 5.0);
    // It leans toward the lens and mirrors the wall over it more than the sky.
    vec3 over = mix(skyRadiance(normalize(r)), vec3(0.2, 0.25, 0.24) * lightUp / 3.14159, 0.6);
    vec3 water = fr * over + (1.0 - fr) * vec3(0.05, 0.065, 0.06) * (lightUp + uSunColour * 0.3 * sun) / 3.14159;
    col = mix(water, col, smoothstep(0.3, 0.6, apron));
  }
  gl_FragColor = vec4(rigOut(col), 1.0);
  if (bare) discard;
#endif
}`;

const CARD_VERTEX = /* glsl */ `
${RIG_GLSL}
attribute vec4 aAt;
attribute vec4 aLook;
attribute vec4 aMore;
varying vec2 vUv;
varying vec2 vRaw;
varying vec4 vLook;
varying vec4 vMore;
varying vec3 vSky;
varying vec3 vSun;
varying vec3 vSunView;
varying vec3 vBehind;
void main() {
  vec4 centre = viewMatrix * vec4(aAt.xyz, 1.0);
  float turn = aLook.z;
  vec2 corner = position.xy * vec2(1.0, aLook.w);
  vec2 turned = vec2(corner.x * cos(turn) - corner.y * sin(turn), corner.x * sin(turn) + corner.y * cos(turn));
  centre.xy += turned * aAt.w;
  vUv = position.xy;
  vRaw = turned;
  vLook = aLook;
  vMore = aMore;
  vec4 land = landAt(aAt.xz);
  float open = mix(land.g, 1.0, clamp((aAt.y - land.r) / 60.0, 0.0, 1.0));
  vSky = skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.35 + 0.65 * open) / 3.14159;
  vSun = uSunColour * mix(sunAt(aAt.xyz + vec3(0.0, 30.0, 0.0), land), 1.0, 0.45) / 3.14159;
  vSunView = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
  // The sky that stands behind it from the lens: thin water takes its light from there.
  vec3 past = normalize(aAt.xyz - cameraPosition);
  vBehind = skyRadiance(normalize(vec3(past.x, abs(past.y) + 0.12, past.z)));
  gl_Position = projectionMatrix * centre;
}`;

const CARD_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_UNIFORMS_GLSL}
uniform sampler2D tFoam;
uniform sampler2D tAtlas;
uniform float uAtlas;
varying vec2 vUv;
varying vec2 vRaw;
varying vec4 vLook;
varying vec4 vMore;
varying vec3 vSky;
varying vec3 vSun;
varying vec3 vSunView;
varying vec3 vBehind;
void main() {
  float r2 = dot(vUv, vUv);
  float mist = vMore.y;
  vec2 o = vLook.y * vec2(3.1, 7.3);
  vec4 t = texture2D(tFoam, vUv * mix(0.33, 0.2, mist) + o);
  vec4 g = texture2D(tFoam, vUv * 1.3 + o.yx);
  vec4 k = texture2D(tFoam, vUv * 0.37 + o * 1.7);
  // Thrown water is not a ball: a torn clot, thick only at its heart, that breaks toward its rim into strings and then into single drops.
  float clot = 1.0 - smoothstep(-0.15, 0.85, r2 + 1.5 * (t.r - 0.5) + 0.7 * (0.45 - g.g));
  float grain = smoothstep(0.5 - 0.45 * clot, 0.62 - 0.3 * clot, k.b + 0.3 * (k.a - 0.3));
  float soft = 1.0 - smoothstep(mix(0.0, -0.1, mist), 0.95, r2 + 0.3 * (t.r - 0.5));
  float dens = mix(clot * grain * (1.0 - smoothstep(0.75, 1.0, r2)), soft, mist);
  vec2 cell = vec2(mod(floor(vMore.z), 4.0), floor(vMore.z / 4.0));
  vec3 pic = texture2D(tAtlas, (cell + clamp(vUv * vec2(0.5, 0.5) + 0.5, 0.03, 0.97)) / 4.0).rgb;
  float lum = dot(pic, vec3(0.333));
  float cut = smoothstep(0.03, 0.4, lum) * (1.0 - smoothstep(0.6, 0.98, max(abs(vUv.x), abs(vUv.y))));
  // Thrown water thins: with its age the strings and the single drops go first and only the heart of the clot is left, and then that goes.
  float age = vMore.w;
  if (age > 0.0) cut *= smoothstep(0.55 * age, 0.25 + 0.7 * age, lum);
  dens = mix(mix(dens, cut, uAtlas), dens, mist);
  float alpha = clamp(dens * vLook.x, 0.0, 1.0) * (1.0 - uSolo);
  // Lit through, not on a skin: the side toward the sun a little brighter, the heart of a mass grey, the thin rim against the sun burning.
  float side = 0.5 + 0.5 * dot(normalize(vRaw + 1e-4), normalize(vSunView.xy + 1e-4)) * sqrt(r2);
  float rim = pow(max(-vSunView.z, 0.0), 2.0) * (1.0 - clot) * 1.2;
  float deep = vMore.x;
  vec3 col = vec3(0.92, 0.94, 0.95) * (vSky * (0.85 + 0.3 * vUv.y) * (1.0 - 0.45 * deep - 0.2 * clot) + vSun * (0.3 + 0.6 * side + rim) * (1.0 - 0.6 * deep));
  col *= mix(mix(1.0, 0.55 + 0.75 * lum, uAtlas), 0.55, mist);
  // Lit from behind: where the water is thin, at the torn rim of every clot and in the mist, the bright sky behind the wave glows in it.
  col += vBehind * (0.75 * (1.0 - clot) * (1.0 - 0.5 * deep) + 0.25 * mist);
  gl_FragColor = vec4(col * alpha, alpha);
}`;

/** Thrown water: cards that face the lens, each placed anew from the time alone. */
class Cards {
  readonly mesh: THREE.Mesh;
  private readonly at: THREE.InstancedBufferAttribute;
  private readonly look: THREE.InstancedBufferAttribute;
  private readonly more: THREE.InstancedBufferAttribute;
  private readonly geometry: THREE.InstancedBufferGeometry;
  readonly material: THREE.ShaderMaterial;
  private used = 0;

  constructor(readonly count: number, uniforms: Record<string, THREE.IUniform>) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.at = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    this.look = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    this.more = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    for (const attribute of [this.at, this.look, this.more]) attribute.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aAt', this.at);
    g.setAttribute('aLook', this.look);
    g.setAttribute('aMore', this.more);
    this.geometry = g;
    this.material = new THREE.ShaderMaterial({
      vertexShader: CARD_VERTEX,
      fragmentShader: CARD_FRAGMENT,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }

  begin(): void {
    this.used = 0;
  }

  /** deep: 0 at the lit skin of a mass of spray, 1 in its core. mist: 0 thrown water, 1 hanging mist. */
  put(x: number, y: number, z: number, size: number, alpha: number, seed: number, turn: number, stretch: number, deep: number, mist: number, age = 0): void {
    if (this.used >= this.count || alpha <= 0.003) return;
    this.at.setXYZW(this.used, x, y, z, size);
    this.look.setXYZW(this.used, alpha, seed, turn, stretch);
    this.more.setXYZW(this.used, deep, mist, Math.floor(seed * 16), age <= 0 ? 0 : Math.min(1, Math.max(1e-4, age)));
    this.used++;
  }

  end(): void {
    this.geometry.instanceCount = this.used;
    this.at.needsUpdate = true;
    this.look.needsUpdate = true;
    this.more.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

function sheet(focusX: number): THREE.BufferGeometry {
  const xs: number[] = [];
  const side = (sign: number): number[] => {
    const out: number[] = [];
    let x = sign > 0 ? focusX : focusX - 0.45;
    let d = 0.45;
    while (Math.abs(x - focusX) < 2500) {
      out.push(x);
      if (Math.abs(x - focusX) > 120) d = Math.min(60, d * 1.07);
      x += sign * d;
    }
    return out;
  };
  xs.push(...side(-1).reverse(), ...side(1));
  const as: number[] = [];
  for (let a = -APRON; a < 0; a += 1.5) as.push(a);
  for (let a = 0; a < FACE + LIP + 4; a += 0.45) as.push(a);
  let a = FACE + LIP + 4;
  let d = 0.6;
  while (a < 4000) {
    as.push(a);
    d = Math.min(240, d * 1.13);
    a += d;
  }
  const positions: number[] = [];
  const index: number[] = [];
  for (const av of as) for (const xv of xs) positions.push(xv, av, 0);
  const W = xs.length;
  for (let j = 0; j < as.length - 1; j++) {
    for (let i = 0; i < W - 1; i++) {
      const k = j * W + i;
      index.push(k, k + 1, k + W, k + 1, k + W + 1, k + W);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  return g;
}

export interface BoreSite {
  /** Where the wall strikes something that stands: its place, and how wide it stands, metres. */
  x: number;
  z: number;
  reach: number;
  id: number;
  /** A cliff close to the last shot's lens: the burst there is the tallest thing in the frame. */
  near: boolean;
  /** How hard it bursts there, 1 as a cliff of the gate. */
  power?: number;
}

export interface Bore {
  wall: THREE.Mesh;
  curtain: THREE.Mesh;
  back: THREE.Mesh;
  cards: THREE.Mesh;
  /** `front`: the seconds of the place the wall stands at, when it does not run with the world (the card loop). */
  setTime(seconds: number, front?: number): void;
  dispose(): void;
}

const DEBUG_NO_CARDS = false;
const LIPS = 1100;
const PLUME = 520;
const FOOT = 960;
/** Of the last shot: the clots thrown off the crest, the strands that fall from the lip, the cards of mist. */
const CREST = 1300;
const FALLS = 700;
const MIST = 160;
const FOOT_BEFORE = 380;
/** The foot's thrown water leaves it in this many bursts at a time. */
const FOOT_BURSTS = 64;
const VEIL = 150;
const BURST_NEAR = 300;
const BURST_FAR = 40;

function curtainSheet(focusX: number): THREE.BufferGeometry {
  const xs: number[] = [];
  for (let x = focusX - 420; x <= focusX + 420; x += 1.5) xs.push(x);
  const positions: number[] = [];
  const index: number[] = [];
  const ROWS = 5;
  for (let j = 0; j < ROWS; j++) for (const x of xs) positions.push(x, j / (ROWS - 1), 0);
  const W = xs.length;
  for (let j = 0; j < ROWS - 1; j++) {
    for (let i = 0; i < W - 1; i++) {
      const k = j * W + i;
      index.push(k, k + 1, k + W, k + 1, k + W + 1, k + W);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  return g;
}

/** The crest of each sheet by column, as a picture the vertex shader reads: row 0 sheet A, row 1 sheet B, half the value. */
function profileTexture(): THREE.DataTexture {
  const N = WALL_A.profile.length;
  const data = new Uint8Array(N * 2 * 4);
  [WALL_A.profile, WALL_B.profile].forEach((profile, row) => {
    profile.forEach((v, i) => {
      data[(row * N + i) * 4] = Math.round(Math.min(1, v / 2) * 255);
      data[(row * N + i) * 4 + 3] = 255;
    });
  });
  const t = new THREE.DataTexture(data, N, 2, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = THREE.MirroredRepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

export interface BorePictures {
  /** The two feature sheets of the breaking wall, colour. */
  wallA: THREE.Texture;
  wallB: THREE.Texture;
  /** Broken white water seen from above, a repeating tile of 6 m. */
  foam: THREE.Texture;
  /** Sixteen bursts of thrown water on black, four by four. */
  spray: THREE.Texture;
}

export function createBore(
  rigUniforms: Record<string, THREE.IUniform>,
  foam: THREE.Texture,
  front: THREE.IUniform<number>,
  poolLevel: number,
  focus: [number, number],
  sites: BoreSite[],
  pictures: BorePictures,
): Bore {
  // The sheets join their own mirror images along the wall and never repeat upward.
  for (const t of [pictures.wallA, pictures.wallB]) {
    t.wrapS = THREE.MirroredRepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 4;
  }
  const profile = profileTexture();
  const last = { value: 0 };
  const lastShot = shotSpan('ribs-06');
  const uniforms = {
    ...rigUniforms,
    tFoam: { value: foam },
    uFront: front,
    uPoolLevel: { value: poolLevel },
    uFocus: { value: focus[0] },
    uLast: last,
    tProfile: { value: profile },
    tFoamPic: { value: pictures.foam },
    tWallA: { value: pictures.wallA },
    tWallB: { value: pictures.wallB },
  };
  const wallMaterial = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(sheet(focus[0]), wallMaterial);
  wall.frustumCulled = false;
  const curtainMaterial = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    defines: { CURTAIN: 1 },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const curtain = new THREE.Mesh(curtainSheet(focus[0]), curtainMaterial);
  curtain.frustumCulled = false;
  curtain.renderOrder = 4;
  const backMaterial = curtainMaterial.clone();
  backMaterial.uniforms = uniforms;
  backMaterial.defines = { CURTAIN: 1, BACK: 1 };
  const back = new THREE.Mesh(curtain.geometry, backMaterial);
  back.frustumCulled = false;
  back.renderOrder = 3;

  const count = Math.max(LIPS + PLUME + FOOT_BEFORE + VEIL, CREST + FALLS + FOOT + MIST) + sites.reduce((n, s) => n + (s.near ? BURST_NEAR : BURST_FAR), 0);
  const cards = new Cards(count, { ...rigUniforms, tFoam: { value: foam }, tAtlas: { value: pictures.spray }, uAtlas: { value: 1 } });
  const X = focus[0];
  const high = (x: number): number => highAt(x, X);
  const tip = (x: number, t: number): [number, number] => tipAt(x, t, X);

  return {
    wall,
    curtain,
    back,
    cards: cards.mesh,
    setTime: (seconds, front = seconds) => {
      // The wave of the last shot: from its first frame on, and never in the card loop.
      const late = loopPhase() === null && stagedSeconds() >= lastShot.from;
      last.value = late ? 1 : 0;
      cards.begin();
      if (DEBUG_NO_CARDS) { cards.end(); return; }
      // What stands close to the last lens has a lee: the wall goes round it and its thrown water with it, so none is ever seen before the rock
      // or cut by it. The lee opens as it runs on. Returns how far a card of that size must stand from the middle of the nearest such thing, less its own distance.
      const lee = (x: number, z: number, size: number): number => {
        let deep = 0;
        for (const s of sites) {
          if (!s.near) continue;
          const dz = z - s.z;
          const clear = s.reach * 1.05 + size * 0.8;
          if (dz < -clear) continue;
          const wide = dz < 0 ? Math.sqrt(Math.max(clear * clear - dz * dz, 0)) : clear + 0.3 * dz;
          deep = Math.max(deep, wide - Math.abs(x - s.x));
        }
        return deep;
      };
      const thrown = (x: number, y: number, z: number, size: number, alpha: number, seed: number, turn: number, stretch: number, deep: number, mist: number, age = 0): void => {
        const hid = lee(x, z, size);
        if (hid < size) cards.put(x, y, z, size, alpha * (1 - Math.max(0, hid) / size), seed, turn, stretch, deep, mist, age);
      };
      // The wave's own clock at x, in turns: a whole number is the moment the lip there begins to pitch (see curlAt).
      const turns = (x: number): number => seconds / BREAK_PERIOD + (2.1 * Math.sin(x * 0.031 + 0.7) + 1.7 * Math.sin(x * 0.0573 + 2.1) + 1.2 * Math.sin(x * 0.113 + 4.0)) / 6.2832 + 0.123;
      const frontNow = boreFront(front);
      // Nothing of the thrown water is seen from more than three kilometres.
      if (Math.abs(frontNow - focus[1]) > 3000) {
        cards.end();
        return;
      }
      const across = (i: number, salt: number, span: number): number => X + span * (rand(i, salt) - 0.5);
      // The wall does not throw evenly: along it there are stretches that explode and stretches already spent.
      const gust = (x: number): number => 0.5 + 0.3 * Math.sin(x * 0.043 + 0.7) + 0.2 * Math.sin(x * 0.117 + 2.1);

      // Before the last shot the wall is far off down the strait and those frames are closed: its thrown water is drawn there exactly as it was.
      const thrownBefore = (): void => {
        // The veil: water too fine to fall, hanging over and behind the crest. It hides the feet of the far blades and the white stands against it.
        for (let i = 0; i < VEIL; i++) {
          const x = across(i, 21, 620);
          const life = 5 + 3 * rand(i, 22);
          const beat = seconds / life + rand(i, 23);
          const n = Math.floor(beat);
          const a = (beat - n) * life;
          const H = high(x);
          // One in three rolls ahead of the foot, low over the flat: the wall arrives in its own mist.
          const rolls = i % 3 === 0;
          const z = frontNow + lineAt(x, seconds) + (rolls ? 5 + 34 * rand(i, n + 24) + 3 * a : -H * (0.9 + 3.5 * rand(i, n + 24)) - 6 * a);
          const y = rolls ? 1.5 + 5 * rand(i, n + 25) + 0.6 * a : H * (0.5 + 1.0 * rand(i, n + 25)) + 1.5 * a;
          const fade = Math.min(1, a / 1.2) * Math.min(1, (life - a) / 1.5);
          thrown(x, y, z, (rolls ? 7 + 6 * rand(i, n + 28) : 11 + 9 * rand(i, n + 28)) * (1 + 0.05 * a), (rolls ? 0.05 : 0.1) * fade, rand(i, n + 29), rand(i, n + 30) * 6.28, 0.8, 0.5, 1);
        }

        // Water torn off the crest and blown up: it is born on the top of the wall, climbs, and is left behind as the wall runs on.
        for (let i = 0; i < PLUME; i++) {
          const x = i % 4 < 3 ? across(i, 11, 260) : across(i, 11, 700);
          const life = 1.6 + 1.8 * rand(i, 12);
          const beat = seconds / life + rand(i, 13);
          const n = Math.floor(beat);
          const a = (beat - n) * life;
          const born = seconds - a;
          const H = high(x);
          const c = curlAt(x, born);
          const z0 = boreFront(born) + lineAt(x, born) - H * (0.3 + 0.3 * rand(i, n + 14));
          const g = gust(x);
          const up = (6 + 12 * rand(i, n + 16)) * (0.6 + 0.8 * c) * (0.45 + 1.3 * g);
          const y = H * (0.95 - 0.1 * c) + up * a - 3.2 * a * a;
          // The wind is behind the wall: what is torn off the crest is carried on ahead of it, toward the land.
          const z = z0 + BORE_SPEED * a * (1 + 0.2 * a / life);
          const fade = Math.min(1, a / 0.15) * Math.pow(Math.max(0, 1 - a / life), 1.5);
          const size = (2.2 + 3.4 * a) * (0.6 + 0.8 * rand(i, n + 17)) * (0.65 + 0.8 * g);
          thrown(x, y, z, size, 0.5 * fade, rand(i, n + 18), (rand(i, n + 19) - 0.5) * 0.9, 1.3, 0.1 + 0.3 * rand(i, n + 20), 0.3 * a / life);
        }

        // The lip: where it pitches, a ragged edge of water is thrown ahead of the face and falls; where it has fallen, white boils up from the pile.
        for (let i = 0; i < LIPS; i++) {
          const x = i % 5 < 4 ? across(i, 51, 230) : across(i, 51, 640);
          const life = 0.7 + 0.7 * rand(i, 52);
          const beat = seconds / life + rand(i, 53);
          const n = Math.floor(beat);
          const a = (beat - n) * life;
          const born = seconds - a;
          const c = curlAt(x, born);
          const lip = tip(x, born);
          const H = high(x);
          const low = i % 6 === 0;
          // A third of them boil on the fallen pile, low on the face.
          const f0 = low ? H * (0.15 + 0.3 * c) * rand(i, n + 54) : lip[0] - 0.5 + 1.5 * rand(i, n + 54);
          const y0 = low ? H * (0.1 + 0.45 * rand(i, n + 55)) * (0.4 + 0.6 * c) : lip[1] + 0.8 * (rand(i, n + 55) - 0.4);
          const vf = low ? 3 + 5 * rand(i, n + 56) : 2 + 7 * rand(i, n + 56) * (0.5 + c);
          const g = gust(x);
          const vy = (low ? 3 + 6 * rand(i, n + 57) : 1 + 5 * rand(i, n + 57)) * (0.55 + 0.95 * g);
          const z = boreFront(born) + lineAt(x, born) + f0 + (BORE_SPEED + vf) * a;
          const y = y0 + vy * a - 4.9 * a * a;
          if (y < 0.3) continue;
          const fade = Math.min(1, a / 0.08) * Math.min(1, (life - a) / 0.3) * (low ? 0.4 + 0.6 * c : 1);
          const size = (low ? 1.0 + 1.2 * rand(i, n + 58) : 0.6 + 1.0 * rand(i, n + 58)) * (1 + 0.9 * a) * (0.55 + 1.0 * g);
          thrown(x, y, z, size, (low ? 0.5 : 0.8) * fade, rand(i, n + 59), rand(i, n + 60) * 6.28, 1.2, low ? 0.45 : 0.1, 0);
        }

        // The foot: the run-out is flung ahead over the flat, low and fast.
        for (let i = 0; i < FOOT_BEFORE; i++) {
          const x = i % 4 < 3 ? across(i, 71, 240) : across(i, 71, 600);
          const life = 0.6 + 0.8 * rand(i, 72);
          const beat = seconds / life + rand(i, 73);
          const n = Math.floor(beat);
          const a = (beat - n) * life;
          const born = seconds - a;
          const z = boreFront(born) + lineAt(x, born) + 1 + 6 * rand(i, n + 74) + (BORE_SPEED + 4 + 9 * rand(i, n + 75)) * a;
          const rise = 0.7 + (3 + 6 * rand(i, n + 76)) * a - 4.9 * a * a;
          if (rise < 0.2) continue;
          const y = rise + swellAt(z - frontNow - lineAt(x, seconds), high(x) * UNDER);
          const fade = Math.min(1, a / 0.06) * Math.min(1, (life - a) / 0.3);
          thrown(x, y, z, (0.6 + 1.1 * rand(i, n + 77)) * (1 + 1.2 * a), 0.7 * fade, rand(i, n + 78), rand(i, n + 79) * 6.28, 1.3, 0.25, 0);
        }

        // Where the wall strikes a blade or a cliff the water has nowhere to go but up. The surge ahead of the wall strikes first.
        for (const s of sites) {
          const count = s.near ? BURST_NEAR : BURST_FAR;
          const since = front - boreArrives(s.z - s.reach) + (s.near ? 1.5 : 0.4);
          if (since < 0 || since > 8) continue;
          for (let j = 0; j < count; j++) {
            const seed = 9000 + s.id * 977 + j;
            const a = since - 2.6 * rand(seed, 1) * rand(seed, 8);
            if (a < 0 || a > 5.5) continue;
            const power = s.power ?? (s.near ? 1 : 0.7);
            if (j > count * Math.min(1, power)) break;
            const up = (14 + 20 * rand(seed, 2)) * power;
            const y = 1 + up * a - 4.0 * a * a;
            if (y < 0) continue;
            const ang = (rand(seed, 3) - 0.5) * 2.6;
            const rr = s.reach * (0.85 + 0.25 * rand(seed, 9));
            const out = (3 + 8 * rand(seed, 4)) * a;
            const x = s.x + Math.sin(ang) * (rr + out * 0.6);
            const z = s.z - Math.cos(ang) * rr * 0.9 + (10 + 16 * rand(seed, 10)) * a;
            const fade = Math.min(1, a / 0.2) * Math.max(0, 1 - a / 5.2);
            const size = (2.6 + 3.6 * a) * (0.6 + 0.9 * rand(seed, 5));
            thrown(x, y, z, size, 0.8 * fade, rand(seed, 6), (rand(seed, 7) - 0.5) * 0.6, 1.35, 0.1 + 0.6 * rand(seed, 11), Math.min(0.5, 0.12 * a));
          }
        }
      };
      const thrownNow = (): void => {
        // Mist: water too fine to fall. Most of it hangs over and behind the crest and is left there as the wall runs on, and the white of the
        // crest stands against it; one card in four rolls low over the flat ahead of the foot.
        for (let i = 0; i < MIST; i++) {
          const x = across(i, 21, 520);
          const life = 4 + 3 * rand(i, 22);
          const beat = seconds / life + rand(i, 23);
          const n = Math.floor(beat);
          const a = (beat - n) * life;
          const born = seconds - a;
          const H = high(x);
          const rolls = i % 4 === 0;
          const z = rolls ? frontNow + lineAt(x, seconds) + 5 + 30 * rand(i, n + 24) + 3 * a : boreFront(born) + lineAt(x, born) - H * (0.3 + 1.2 * rand(i, n + 24)) + (BORE_SPEED - 9) * a;
          const y = rolls ? 1.5 + 5 * rand(i, n + 25) + 0.6 * a : H * (0.85 + 0.5 * rand(i, n + 25)) + 2.2 * a;
          const fade = Math.min(1, a / 0.8) * Math.min(1, (life - a) / 2);
          thrown(x, y, z, (rolls ? 7 + 6 * rand(i, n + 28) : 8 + 7 * rand(i, n + 28)) * (1 + 0.08 * a), (rolls ? 0.05 : 0.16) * fade, rand(i, n + 29), rand(i, n + 30) * 6.28, 0.8, 0.5, 1);
        }

        // Water thrown off the crest as the lip pitches and falls: it leaves the lip with the wall's speed, climbs, hangs, comes down as water
        // comes down, and the air holds it back, so the wall runs on from under it and it is seen on and over the crest, never before the face.
        for (let i = 0; i < CREST; i++) {
          const x0 = i % 5 < 4 ? across(i, 11, 230) : across(i, 11, 640);
          const life = 1.2 + 1.5 * rand(i, 12);
          // The crest is never bare: one clot in three keeps no beat and is torn off by the wind at any time.
          const beat = i % 3 === 0 ? seconds / BREAK_PERIOD + rand(i, 13) : turns(x0) - (0.05 + 1.1 * rand(i, 13)) / BREAK_PERIOD;
          const n = Math.floor(beat);
          const a = (beat - n) * BREAK_PERIOD;
          if (a > life) continue;
          const born = seconds - a;
          const H = high(x0);
          const lip = tip(x0, born);
          const g = gust(x0);
          const up = (4 + 10 * rand(i, n + 16) * rand(i, n + 21)) * (0.5 + 1.0 * g);
          const y = lip[1] * (0.9 + 0.08 * rand(i, n + 22)) + up * a - 4.9 * a * a;
          if (y < 0.6 * H) continue;
          const z = boreFront(born) + lineAt(x0, born) + lip[0] + 0.6 + BORE_SPEED * a + (1 + 3 * rand(i, n + 14)) * a - 5.5 * a * a;
          const x = x0 + 1.5 * a * a + 2.5 * (rand(i, n + 15) - 0.5) * a;
          const old = a / life;
          const fade = Math.min(1, a / 0.1) * Math.pow(1 - old, 1.2);
          const size = (1.2 + 1.5 * a) * (0.6 + 0.8 * rand(i, n + 17)) * (0.7 + 0.7 * g);
          thrown(x, y, z, size, 0.8 * fade, rand(i, n + 18), (rand(i, n + 19) - 0.5) * 0.7 + 0.25 * a, 1.3, 0.1 + 0.3 * rand(i, n + 20), 0.35 * old, old);
        }

        // The lip: as it pitches, a ragged edge of water leaves it ahead of the face and falls down it, small and drawn out along its fall.
        for (let i = 0; i < FALLS; i++) {
          const x = i % 5 < 4 ? across(i, 51, 230) : across(i, 51, 640);
          const life = 0.9 + 0.9 * rand(i, 52);
          const beat = turns(x) - 0.9 * rand(i, 53) / BREAK_PERIOD;
          const n = Math.floor(beat);
          const a = (beat - n) * BREAK_PERIOD;
          if (a > life) continue;
          const born = seconds - a;
          const lip = tip(x, born);
          const vf = 1.5 + 4 * rand(i, n + 56);
          const vy = (4 * rand(i, n + 57) - 1) * (0.55 + 0.95 * gust(x));
          const z = boreFront(born) + lineAt(x, born) + lip[0] + 1.2 * rand(i, n + 54) + (BORE_SPEED + vf) * a;
          const y = lip[1] + 0.8 * (rand(i, n + 55) - 0.6) + vy * a - 4.9 * a * a;
          if (y < 0.3) continue;
          const old = a / life;
          const fade = Math.min(1, a / 0.08) * Math.min(1, (life - a) / 0.35);
          thrown(x, y, z, (0.45 + 0.6 * rand(i, n + 58)) * (1 + 0.5 * a), 0.8 * fade, rand(i, n + 59), 3.1416 + (rand(i, n + 60) - 0.5) * 0.8, 1.2 + 1.1 * a, 0.15, 0, 0.3 + 0.6 * old);
        }

        // The foot: where the pile lands on the flat it is flung up and ahead in bursts. A burst is many small clots that leave one place
        // on one beat, each on its own throw, so it opens, hangs and comes down and is never one picture. Most of them stand where the lens looks.
        for (let i = 0; i < FOOT; i++) {
          const b = i % FOOT_BURSTS;
          const cycle = 1.2 + 0.7 * rand(b, 72);
          const beat = seconds / cycle + rand(b, 73);
          const n = Math.floor(beat);
          const a = (beat - n) * cycle - 0.3 * rand(i, 81);
          const life = 0.6 + 0.7 * rand(i, 82);
          if (a < 0 || a > life) continue;
          const born = (n - rand(b, 73)) * cycle;
          const span = b % 4 < 3 ? Math.min(240, Math.max(60, 1.6 * (focus[1] - boreFront(born)))) : 600;
          const x0 = X + span * (rand(b, n + 71) - 0.5);
          // One burst in two is a heavy one: the pile comes down whole there.
          const heavy = b % 2 === 0 ? 1.8 : 1;
          const power = (0.5 + 0.9 * rand(b, n + 76) * (0.4 + 1.2 * gust(x0))) * (heavy > 1 ? 1.5 : 1);
          const since = seconds - born;
          const z0 = boreFront(born) + lineAt(x0, born) + 1 + 6 * rand(b, n + 74) + BORE_SPEED * since;
          const wide = (1.5 + 2.5 * rand(b, n + 83)) * heavy;
          const x = x0 + wide * (rand(i, n + 84) - 0.5) * (1 + 1.6 * a);
          const z = z0 + (3 + 10 * rand(i, n + 75)) * a + 2 * (rand(i, n + 85) - 0.5);
          const rise = 0.5 + (2 + 9 * rand(i, n + 86) * rand(i, n + 87)) * power * a - 4.9 * a * a;
          if (rise < 0.15) continue;
          const y = rise + swellAt(z - frontNow - lineAt(x, seconds), high(x) * UNDER);
          const old = a / life;
          const fade = Math.min(1, a / 0.05) * Math.min(1, (life - a) / 0.25);
          thrown(x, y, z, (0.35 + 0.6 * rand(i, n + 77)) * (1 + 1.1 * a) * (0.7 + 0.5 * power) * heavy, 0.8 * fade, rand(i, n + 78), (rand(i, n + 79) - 0.5) * 1.2 + (rand(i, n + 80) - 0.5) * 2 * a, 1.25, 0.25, 0, 0.7 * old);
        }

        // Where the wall strikes a blade or a cliff the water has nowhere to go but up. The surge ahead of the wall strikes first.
        for (const s of sites) {
          const count = s.near ? BURST_NEAR : BURST_FAR;
          // The surge runs well ahead of the wall between the two stacks of the gate: they are struck a second before it stands at them.
          const since = front - boreArrives(s.z - s.reach) + (s.near ? 2.4 : 0.4);
          if (since < 0 || since > 8) continue;
          for (let j = 0; j < count; j++) {
            const seed = 9000 + s.id * 977 + j;
            const a = since - 2.6 * rand(seed, 1) * rand(seed, 8);
            if (a < 0 || a > 5.5) continue;
            const power = s.power ?? (s.near ? 1 : 0.7);
            if (j > count * Math.min(1, power)) break;
            const up = (14 + 20 * rand(seed, 2)) * power;
            const y = 1 + up * a - 4.0 * a * a;
            if (y < 0) continue;
            const ang = (rand(seed, 3) - 0.5) * 2.6;
            const rr = s.reach * (0.85 + 0.25 * rand(seed, 9));
            const out = (3 + 8 * rand(seed, 4)) * a;
            const x = s.x + Math.sin(ang) * (rr + out * 0.6);
            const z = s.z - Math.cos(ang) * rr * 0.9 + (10 + 16 * rand(seed, 10)) * a;
            const fade = Math.min(1, a / 0.2) * Math.max(0, 1 - a / 5.2);
            const size = (2.6 + 3.6 * a) * (0.6 + 0.9 * rand(seed, 5));
            thrown(x, y, z, size, 0.8 * fade, rand(seed, 6), (rand(seed, 7) - 0.5) * 0.6, 1.35, 0.1 + 0.6 * rand(seed, 11), Math.min(0.5, 0.12 * a), 0.8 * a / 5.2);
          }
        }
      };
      if (late) thrownNow();
      else thrownBefore();
      cards.end();
    },
    dispose: () => {
      wall.geometry.dispose();
      wallMaterial.dispose();
      curtain.geometry.dispose();
      curtainMaterial.dispose();
      backMaterial.dispose();
      profile.dispose();
      cards.dispose();
    },
  };
}
