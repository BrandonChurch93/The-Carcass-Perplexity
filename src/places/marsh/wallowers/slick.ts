// The hide of a wallower that the lens stands by: three coats with hard ragged borders between them, each with its own surface.
// Low on it the red mud it wades in, wet and shining; above that its own folded skin, dark where it is damp; on the back the mud of
// other days, dried pale, cracked into plates and flaking. The coats lie on the animal, not in the world: they are measured on the body
// as it is built, so nothing swims over the skin as it moves.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const SLICK_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vRest;
varying vec3 vRestN;
varying vec3 vWorld;
varying vec4 vInfo;
varying vec3 vR0;
varying vec3 vR1;
varying vec3 vR2;
varying float vRaise;
varying vec2 vBlade;
varying float vOpen;
uniform sampler2D tHide;
uniform sampler2D tHideNh;
uniform sampler2D tCake;
uniform sampler2D tCakeNh;
uniform float uK;
uniform vec3 uShift;
uniform float uSeed;
uniform float uMud;
// x: how high the wet mud stands on the trunk, metres on the body as built. y: the height the dry cake begins at. z: 1 for one that is wet all over.
// w: the grey of the mud it is in, 0 the red of the vein, 1 the grey slurry of the thin crust.
uniform vec4 uCoat;
uniform float uStrand;
uniform vec3 uShade;
${NOISE_GLSL}
${RIG_GLSL}
const vec3 HIDE_MEAN = vec3(0.163, 0.103, 0.075);
const vec3 CAKE_MEAN = vec3(0.277, 0.205, 0.171);
const vec3 LUMA = vec3(0.3, 0.5, 0.2);

void main() {
  vec3 nr = normalize(vRestN);
  vec3 q = vRest * uK + uShift;
  vec3 w = pow(abs(nr), vec3(4.0));
  w /= w.x + w.y + w.z;
  float fold = vInfo.x;
  float horn = vInfo.y;
  float leg = vInfo.z;

  vec3 sq = q * 0.9;
  vec3 skin = w.x * texture2D(tHide, sq.zy).rgb + w.y * texture2D(tHide, sq.xz).rgb + w.z * texture2D(tHide, sq.xy).rgb;
  vec3 hx = texture2D(tHideNh, sq.zy).rgb;
  vec3 hy = texture2D(tHideNh, sq.xz).rgb;
  vec3 hz = texture2D(tHideNh, sq.xy).rgb;
  float skinH = w.x * hx.b + w.y * hy.b + w.z * hz.b;
  vec3 cq = q * 1.25 + 0.37;
  vec3 cake = w.x * texture2D(tCake, cq.zy).rgb + w.y * texture2D(tCake, cq.xz).rgb + w.z * texture2D(tCake, cq.xy).rgb;
  vec3 cx = texture2D(tCakeNh, cq.zy).rgb;
  vec3 cy = texture2D(tCakeNh, cq.xz).rgb;
  vec3 cz = texture2D(tCakeNh, cq.xy).rgb;
  float cakeH = w.x * cx.b + w.y * cy.b + w.z * cz.b;

  float patchy = vnoise3(q * 1.3 + uSeed);
  float mid = vnoise3(q * 4.3 + uSeed * 3.0);
  float fine = vnoise3(q * 15.0 + uSeed * 5.0);
  float y = vRest.y;
  // The head roots in it: it is wet higher than the flank, and the legs higher than the belly.
  float snout = smoothstep(0.95, 1.6, vRest.x) * (1.0 - leg);
  // The line it leaves is no line: the mud stands higher in every crease, runs down between, and is thrown up in tongues where the legs churn it.
  float lane = vnoise(vec2(vRest.x * 6.5 + vRest.z * 2.0, uSeed)) - 0.5;
  // And it runs up the hide in strands where the animal has shaken and rolled: narrow tongues, each to its own height, none level with the next.
  float strandA = smoothstep(0.5, 0.92, vnoise(vec2(vRest.x * 17.0 + vRest.z * 6.0 + 0.6 * y, uSeed * 2.0 + 3.0)));
  float strandB = smoothstep(0.45, 0.95, vnoise(vec2(vRest.x * 41.0 - vRest.z * 13.0 + 1.1 * y, uSeed * 4.0 + 7.0)));
  // (And it is no band with a level top. Where the legs threw it up it ran back down the hide: narrow runs, each to its own height and thinning to a point,
  // between them the hide clean almost to the belly. The measure runs round the animal, so a run goes straight down its side.)
  float along = vRest.x + vRest.z * abs(nr.x);
  float runA = smoothstep(0.5, 0.78, vnoise(vec2(along * 43.0, uSeed * 6.0 + 1.0))) * (0.06 + 0.55 * vnoise(vec2(along * 11.0, uSeed * 8.0 + 2.0)));
  float runB = smoothstep(0.45, 0.8, vnoise(vec2(along * 15.0, uSeed * 3.0 + 5.0))) * (0.04 + 0.32 * vnoise(vec2(along * 4.0 + 3.0, uSeed * 9.0)));
  float tide = mix(uCoat.x + 0.3 * leg - 0.42 * snout + 0.3 * (patchy - 0.5) + 0.12 * (mid - 0.5) + 0.05 * (fine - 0.5) + 0.12 * lane + 0.22 * (1.0 - smoothstep(0.1, 0.7, fold)) + uStrand * (0.2 * strandA * (0.4 + 0.9 * patchy) + 0.09 * strandB) + (runA + runB) * (1.0 - 0.6 * leg), 9.0, uCoat.z);
  float wet = 1.0 - smoothstep(-0.03, 0.03, y - tide);
  // Thrown up the flank as it wades: clots, thick by the line and thinning to nothing a stride above it.
  float above = clamp((y - tide) / 0.75, 0.0, 1.0);
  float clot = smoothstep(0.6, 0.63, 0.6 * mid + 0.4 * fine + 0.3 * (1.0 - above) * (1.0 - above)) * (1.0 - above);
  // (The horn at the lip roots in it all day and is never clean: a pale one on a dark muzzle reads as an eye.)
  float mud = max(max(wet, clot), horn * (1.0 - leg));
  // (It is wet from the line to the shoulder, and dries out only where the back turns to the sky.)
  float damp = smoothstep(0.0, 0.6, 1.0 - (y - tide) / (1.1 + 0.6 * patchy + 0.25 * (mid - 0.5))) * (1.0 - mud);
  // The cake of other days lies on what looks at the sky, and breaks off at an edge.
  float up = smoothstep(uCoat.y - 0.45, uCoat.y + 0.45, y) + 0.5 * nr.y - 0.4 * leg;
  float lie = 0.5 * up + 0.3 * patchy + 0.3 * (cakeH - 0.5) + 0.14 * (mid - 0.5);
  float dry = smoothstep(0.5, 0.525, lie) * (1.0 - mud) * (1.0 - horn);

  // The skin: brown with pink in it, every crease of the tile dark, and darker still in the deep folds the body is built with.
  vec3 tone = skin / HIDE_MEAN;
  vec3 albedo = vec3(0.083, 0.064, 0.049) * mix(vec3(1.0), mix(vec3(dot(tone, LUMA)), tone, 0.6), 0.78);
  // The head is the darkest of it: heavy and grey.
  albedo *= 1.0 - 0.35 * smoothstep(1.0, 1.7, vRest.x) * (1.0 - leg);
  albedo *= mix(0.5, 1.06, smoothstep(0.05, 0.8, fold));
  // (The damp above the line is the red of the brine drawn up the hide.)
  // (A hand of it wicks up from the line and from every run, in the creases and not on the tops of the folds.)
  float stain = (1.0 - smoothstep(0.0, 0.07 + 0.16 * patchy * mid, y - tide)) * mix(1.0, 0.45, smoothstep(0.4, 0.75, skinH));
  albedo = mix(albedo, albedo * mix(vec3(0.6, 0.55, 0.53), vec3(0.5, 0.17, 0.11), stain), damp);
  // The cake: pale and matt, each plate dark at the edge where it has lifted, and the salt has come out of it white on the spine.
  vec3 plate = vec3(0.1, 0.081, 0.062) * mix(vec3(dot(cake, LUMA) / dot(CAKE_MEAN, LUMA)), cake / CAKE_MEAN, 0.7);
  plate *= 0.62 + 0.38 * smoothstep(0.525, 0.6, lie);
  // (The salt lies on it as dust: white on what looks straight up, in drifts, and gone a hand down the flank.)
  float salt = smoothstep(0.5, 0.66, cakeH + 0.35 * (fine - 0.5) + 0.25 * (mid - 0.5)) * smoothstep(0.3, 0.85, nr.y) * smoothstep(0.54, 0.66, lie);
  plate = mix(plate, vec3(0.5, 0.48, 0.46), 0.8 * salt);
  albedo = mix(albedo, plate, dry);
  // The mud: blood red where it is thick and fresh, rust where it thins out toward the line.
  float thick = 1.0 - smoothstep(-0.5, 0.0, y - tide);
  vec3 red = mix(vec3(0.036, 0.0105, 0.0065), vec3(0.027, 0.0075, 0.0048), thick) * (0.55 + 0.9 * skinH);
  vec3 grey = mix(vec3(0.17, 0.125, 0.105), vec3(0.085, 0.06, 0.05), thick) * (0.55 + 0.9 * skinH);
  // One coated to the top of its back is wet hide under a wash of the brine: brown, the red only where it lies in it.
  red = mix(red, mix(vec3(0.03, 0.008, 0.005), vec3(0.025, 0.014, 0.009), smoothstep(0.0, 0.3, vWorld.y - vRaise)) * (0.45 + 1.1 * skinH), uCoat.z);
  albedo = mix(albedo, mix(red, grey, uCoat.w), mud);
  // What stands in the mud is mud.
  float wy = vWorld.y - vRaise;
  float deep = 1.0 - smoothstep(0.0, 0.1, wy - uMud + 0.08 * (mid - 0.5));
  // (It keeps the hide under it: the mud lies in the creases and runs off the folds, so each fold stands out of it wet and paler.)
  float crease = smoothstep(0.3, 0.72, skinH);
  vec3 sunk = mix(vec3(0.04, 0.015, 0.0105), vec3(0.11, 0.046, 0.031), crease) * mix(vec3(1.0), mix(vec3(dot(tone, LUMA)), tone, 0.6), 0.7);
  albedo = mix(albedo, mix(sunk, vec3(0.06, 0.043, 0.036) * (0.6 + 0.8 * skinH), uCoat.w), max(deep, 0.9 * horn * leg));

  // The slope of each coat: the grain of the skin, the plates of the cake, and the mud lying thick enough to fill the pores.
  float grainK = mix(mix(mix(1.6, 1.5, mud), 0.5, dry) * (1.0 - 0.5 * leg), 2.4, deep);
  vec2 sx = (hx.rg - 0.5) * grainK + (cx.rg - 0.5) * 2.2 * dry;
  vec2 sy = (hy.rg - 0.5) * grainK + (cy.rg - 0.5) * 2.2 * dry;
  vec2 sz = (hz.rg - 0.5) * grainK + (cz.rg - 0.5) * 2.2 * dry;
  vec3 bump = w.x * vec3(0.0, sx.y, sx.x) + w.y * vec3(sy.x, 0.0, sy.y) + w.z * vec3(sz.x, sz.y, 0.0);
  bump += vec3(vBlade, 0.0);
  vec3 nb = normalize(nr - (bump - nr * dot(bump, nr)) * (1.0 - 0.7 * horn));
  mat3 r = mat3(vR0, vR1, vR2);
  vec3 ng = normalize(r * nr);
  vec3 v = normalize(cameraPosition - vWorld);
  float graze = pow(1.0 - clamp(dot(ng, v), 0.0, 1.0), mix(2.5, 1.1, leg));
  vec3 n = normalize(mix(normalize(r * nb), ng, 0.9 * graze));

  // (A young one is paler all over, hide and mud: its legs are no dark smear.)
  albedo *= uShade;
  // Wet mud shows the sky on the top of every fold; the skin is dull, the cake dead.
  float rough = mix(mix(0.9, 0.78, damp), 1.0, dry);
  rough = mix(rough, mix(0.88, 0.76, smoothstep(0.5, 0.85, skinH)), mud);
  rough = mix(rough, mix(0.6, 0.8, crease), deep);
  rough = mix(rough, 1.0, 0.7 * graze);
  float occ = mix(vOpen * sqrt(vOpen), max(vOpen, 0.62), 0.85 * leg) * (0.5 + 0.5 * smoothstep(0.0, 0.85, fold)) * mix(0.7 + 0.3 * smoothstep(0.15, 0.6, skinH), 0.7 + 0.3 * smoothstep(0.2, 0.6, cakeH), dry);
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  // What looks down is lit by the wet red ground under it.
  vec3 skyUp = skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159 * skyOpen(vWorld);
  c += albedo * skyUp * vec3(0.26, 0.17, 0.14) * (0.5 - 0.5 * ng.y) * (0.4 + 0.6 * vOpen);
  // The wet of it: every fold that stands out of the mud, and the hide a hand over the line, throws back the bright side of the sky.
  float sheen = max(deep, max(0.7 * mud, 0.4 * damp)) * (1.0 - dry);
  // (A hard small light on the tops of the folds: a broad one lies over the whole hide as a pale veil and dries it.)
  float glint = pow(clamp(dot(reflect(-v, n), normalize(vec3(-0.45, 0.72, -0.53))), 0.0, 1.0), 90.0);
  c += skyUp * (0.32 * glint * sheen * (0.15 + 0.85 * crease) * (0.3 + 0.7 * vOpen));
  // Nothing gives back less than no light, or more than the picture can hold: the brine's mirror takes this as it stands, ungraded.
  c = clamp(c, 0.0, 8.0);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
