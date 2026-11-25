// The skin of the loose rock: scoria and clinker, matte, near black to dark grey-brown, read from the rock's own position
// (three projections blended by its smooth normal) so nothing is stretched, with ash on what looks up, grit banked against
// the foot, and sulphur as a stain near the vents.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

// Set by measuring the frames against the pictures under the frozen light: the near bench of the wide picture stands at 38 36 35 to 47 43 43.
const ROCK_TONE = 1.5;

export const ROCK_VERTEX = /* glsl */ `
attribute vec4 aSeed;
attribute float aCave;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vObject;
varying vec3 vObjectNormal;
varying vec3 vAxisX;
varying vec3 vAxisY;
varying vec3 vAxisZ;
varying vec4 vSeed;
varying float vCave;
void main() {
  mat3 m = mat3(instanceMatrix);
  vec3 scale = vec3(length(m[0]), length(m[1]), length(m[2]));
  vAxisX = m[0] / scale.x;
  vAxisY = m[1] / scale.y;
  vAxisZ = m[2] / scale.z;
  vec3 on = normalize(normal / scale);
  vObjectNormal = on;
  vObject = position * scale + fract(aSeed.x) * 37.0;
  vNormal = vAxisX * on.x + vAxisY * on.y + vAxisZ * on.z;
  vec4 w = instanceMatrix * vec4(position, 1.0);
  vSeed = aSeed;
  vWorld = w.xyz;
  vCave = aCave;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

/** The carpet's bake: one texel a stone. `crust` is the crust's own height function (lake/index.ts), which wants the noise and the rig before it. */
export const CARPET_BAKE_VERTEX = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export const carpetBakeFragment = (crust: string): string => /* glsl */ `
precision highp float;
${NOISE_GLSL}
${RIG_GLSL}
${crust}
uniform sampler2D tRest;
uniform vec2 uCarpetSpan;
void main() {
  vec4 rest = texture2D(tRest, gl_FragCoord.xy / uCarpetSpan);
  vec2 q = rest.xz + rest.yw;
  vec3 p = crustAt(q);
  gl_FragColor = vec4(p.y, clamp(gBank, -8.0, 8.0), gSlabEdge, gMound);
}`;

// aSeed: x a random number (1 is added for a stone of the carpet on the crust), y the size of the rock in metres, z the height of the ground at its middle, w its tone.
// Defines: SIMPLE (a rock of a few tens of pixels or fewer: two reads of the picture, no relief, no pits).
export const ROCK_FRAGMENT = /* glsl */ `
precision highp float;
${NOISE_GLSL}
${RIG_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vObject;
varying vec3 vObjectNormal;
varying vec3 vAxisX;
varying vec3 vAxisY;
varying vec3 vAxisZ;
varying vec4 vSeed;
varying float vCave;
uniform sampler2D tBoulder;
uniform sampler2D tBoulderNh;
uniform vec4 uCrackA;
uniform vec4 uCrackB;

// The same rind the land's ground has where it stands in the lake (land/shaders.ts), so a rock in the lake is not cleaner than the shore beside it.
float lakeRind(vec3 p) {
  float top = 0.3 + 3.2 * pow(vnoise(p.xz / 23.0 + 5.0), 1.5) + 1.2 * vnoise(p.xz / 4.3);
  float away = max(smoothstep(-440.0, -400.0, p.x), smoothstep(12.0, 9.0, distance(p.xz, vec2(-453.4, 241.2))));
  return (1.0 - smoothstep(0.45 * top, top, p.y)) * away;
}

float segmentDistance(vec2 p, vec4 s) {
  vec2 e = s.zw - s.xy;
  float t = clamp(dot(p - s.xy, e) / dot(e, e), 0.0, 1.0);
  return length(p - s.xy - e * t);
}

void main() {
  vec3 toCamera = cameraPosition - vWorld;
  float far = length(toCamera);
  vec3 v = toCamera / far;
  vec3 n0 = normalize(vNormal);
  vec3 on = normalize(vObjectNormal);
  vec3 w = on * on;
  w *= w;
  w /= w.x + w.y + w.z;
  float size = vSeed.y;
  float rnd = fract(vSeed.x);
  // Big blocks carry the rock picture at its true size; pebbles carry it small.
  float span = clamp(size * 0.9, 0.3, 1.9);
  vec3 q = vObject / span;
  vec3 albedo = vec3(0.0);
  vec3 bump = vec3(0.0);
  float height = 0.5;
  float pit = 0.0;
  #ifdef SIMPLE
  albedo = mix(w.x > w.z ? texture2D(tBoulder, q.zy).rgb : texture2D(tBoulder, q.xy).rgb, texture2D(tBoulder, q.xz).rgb, w.y);
  #else
  height = 0.0;
  if (w.x > 0.02) {
    vec3 c = texture2D(tBoulder, q.zy).rgb;
    vec3 r = texture2D(tBoulderNh, q.zy).rgb;
    albedo += c * w.x;
    height += r.b * w.x;
    bump += w.x * (vec3(0.0, 0.0, 1.0) * (r.r - 0.5) - vec3(0.0, 1.0, 0.0) * (r.g - 0.5));
  }
  if (w.y > 0.02) {
    vec3 c = texture2D(tBoulder, q.xz).rgb;
    vec3 r = texture2D(tBoulderNh, q.xz).rgb;
    albedo += c * w.y;
    height += r.b * w.y;
    bump += w.y * (vec3(1.0, 0.0, 0.0) * (r.r - 0.5) - vec3(0.0, 0.0, 1.0) * (r.g - 0.5));
  }
  if (w.z > 0.02) {
    vec3 c = texture2D(tBoulder, q.xy).rgb;
    vec3 r = texture2D(tBoulderNh, q.xy).rgb;
    albedo += c * w.z;
    height += r.b * w.z;
    bump += w.z * (vec3(1.0, 0.0, 0.0) * (r.r - 0.5) - vec3(0.0, 1.0, 0.0) * (r.g - 0.5));
  }
  // Close to: the same picture again at a quarter of the size, and the pits of scoria, one to three centimetres, in three dimensions.
  float close = smoothstep(16.0, 5.0, far);
  if (close > 0.0) {
    vec2 f = (w.y > w.x && w.y > w.z ? q.xz : (w.x > w.z ? q.zy : q.xy)) * 4.3 + 0.37;
    vec3 fine = texture2D(tBoulder, f).rgb;
    vec3 fr = texture2D(tBoulderNh, f).rgb;
    albedo *= mix(vec3(1.0), fine * 20.0, 0.5 * close);
    height = mix(height, 0.5 * (height + fr.b), close);
    vec2 g = (fr.rg - 0.5) * close * 0.8;
    bump += w.y > w.x && w.y > w.z ? vec3(g.x, 0.0, -g.y) : (w.x > w.z ? vec3(0.0, -g.y, g.x) : vec3(g.x, -g.y, 0.0));
    float cells = vnoise3(vObject * 52.0) * 0.65 + vnoise3(vObject * 117.0 + 7.3) * 0.35;
    pit = smoothstep(0.56, 0.7, cells) * close;
  }
  #endif
  vec3 n = normalize(n0 + (vAxisX * bump.x + vAxisY * bump.y + vAxisZ * bump.z) * 2.4 * mix(0.5, 1.0, smoothstep(400.0, 60.0, far)));
  // Each rock its own tone, and some gone rusty brown where the iron in them has burnt.
  float grey = dot(albedo, vec3(0.3333)) * vSeed.w * ${ROCK_TONE.toFixed(2)};
  float rust = smoothstep(0.55, 0.95, fract(rnd * 13.7)) * (0.4 + 0.6 * vnoise3(vObject * 1.3 / span));
  albedo = grey * mix(vec3(1.03, 1.0, 0.97), vec3(1.25, 0.96, 0.8), 0.35 * rust);
  albedo *= 1.0 - 0.55 * pit;
  vec4 land = landAt(vWorld.xz);
  // The rock sits in the ground. A large one reads the ground under each point of its foot; a small one, finer than the land's map, knows only the ground at its middle.
  float ground = mix(vSeed.z, max(land.r, 0.0), smoothstep(0.6, 1.6, size));
  float lift = (vWorld.y - ground) / max(size, 0.05);
  float foot = smoothstep(-0.05, 0.28, lift);
  float occ = (0.12 + 0.88 * foot) * (0.5 + 0.6 * smoothstep(0.1, 0.7, vCave)) * (0.6 + 0.5 * smoothstep(0.15, 0.6, height)) * (1.0 - 0.5 * pit);
  // A stone of the carpet on the crust (its random number is 1 or more) is loose rock that fell there: it has no rind of the lake.
  float afloat = vSeed.x < 1.0 ? 0.0 : 1.0;
  float rind = smoothstep(2.2, 0.3, land.b) * (1.0 - afloat);
  float patch3 = vnoise3(vObject * 2.3 / span + 3.1);
  // Ash settles on what looks up, thickest in the hollows and thin on the knobs, in patches. None on a rock just out of the lake.
  float dust = smoothstep(0.25, 0.8, n0.y + 0.3 * (0.5 - vCave)) * smoothstep(0.25, 0.65, patch3 + 0.5 * (0.5 - vCave)) * (1.0 - 0.75 * rind) * smoothstep(0.4, 0.6, vSeed.w);
  // The ash lies in specks a centimetre or two across, paler than the rock: a speckled top over a black side.
  float speck = smoothstep(0.42, 0.62, vnoise3(vObject * 31.0 + 2.7));
  albedo = mix(albedo, vec3(0.15, 0.141, 0.13) * (0.5 + 0.9 * height) * (0.72 + 0.5 * speck), (0.7 - 0.25 * afloat) * dust);
  // Grit and scree banked against the foot, with a ragged top: the rock goes into the ground, it does not stand on it.
  float bank = (1.0 - smoothstep(0.02, 0.16, lift + 0.1 * (patch3 - 0.5))) * (1.0 - rind) * smoothstep(0.4, 0.6, vSeed.w);
  albedo = mix(albedo, vec3(0.07, 0.064, 0.06) * (0.6 + 0.8 * height), 0.7 * bank);
  albedo *= mix(1.0, 0.8, rind);
  // By the vents: sulphur, as a crust that fades out, yellow going to cream where it is thick. It lies low, in the hollows and on what looks up,
  // in blots a hand or two across, and the rock between stays black.
  float dc = min(segmentDistance(vWorld.xz, uCrackA), segmentDistance(vWorld.xz, uCrackB) * 1.7);
  float gas = smoothstep(3.6, 0.5, dc);
  if (gas > 0.0) {
    float low = 1.0 - smoothstep(0.15, 0.75, lift);
    float blot = 0.45 * vnoise3(vWorld * 2.6 + 1.7) + 0.4 * vnoise3(vWorld * 7.0 + 4.1) + 0.2 * (0.5 - vCave) + 0.12 * n0.y + 0.22 * low;
    float thin = 0.14 * gas + 0.2 * gas * gas * gas;
    float stain = smoothstep(0.84 - thin, 0.97 - thin, blot) * smoothstep(0.0, 0.35, gas) * (0.2 + 0.8 * smoothstep(-0.3, 0.4, n0.y));
    // A boulder keeps its black top: on a large rock the sulphur lies round the foot only.
    stain *= mix(1.0, low, smoothstep(0.5, 0.9, size));
    float thick = smoothstep(0.45, 0.9, stain) * smoothstep(0.3, 0.7, height);
    albedo = mix(albedo, mix(vec3(0.4, 0.3, 0.04), vec3(0.75, 0.6, 0.13), thick) * (0.6 + 0.8 * height), 0.92 * stain);
  }
  // One mound of crystals at the vent of the crag's foot, with the ground's (land/shaders.ts): the small stones within reach of the short crack
  // are crusted whole, lemon going to cream on what stands up.
  float mound = smoothstep(1.05, 0.7, segmentDistance(vWorld.xz, uCrackB)) * (1.0 - smoothstep(0.5, 0.9, size));
  albedo = mix(albedo, mix(vec3(0.9, 0.7, 0.1), vec3(0.94, 0.88, 0.58), smoothstep(0.35, 0.8, height)), mound);
  albedo = mix(albedo, vec3(0.04, 0.038, 0.038) * (0.7 + 0.6 * height), 0.92 * lakeRind(vWorld) * (1.0 - afloat));
  // Undersides and the faces that lean over see the ground, not the sky.
  occ *= mix(0.25, 1.0, smoothstep(-0.6, 0.1, n0.y)) * mix(0.6, 1.0, smoothstep(0.0, 0.55, n0.y));
  // The light, as the land takes it (land/shaders.ts), and nothing thrown back as a sheen: clinker and ash are matte.
  float above = vWorld.y - land.r;
  float vis = mix(land.g, 1.0, clamp(above / 80.0, 0.0, 1.0));
  vec3 lake;
  if (vWorld.y > 8.0) lake = lakeIrradianceFar(vWorld, n);
  else if (vWorld.y < 5.0) lake = lakeIrradiance(vWorld, n);
  else lake = mix(lakeIrradiance(vWorld, n), lakeIrradianceFar(vWorld, n), (vWorld.y - 5.0) / 3.0);
  vec3 e = skyIrradiance(n) * (vis * occ) + (lake + emitterIrradiance(vWorld, n)) * sqrt(occ);
  gl_FragColor = vec4(rigOut(albedo * e / 3.14159), 1.0);
}`;
