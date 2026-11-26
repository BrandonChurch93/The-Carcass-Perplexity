// Everything that stands over the surface: the cloud at its heights, the cyclone, the storm on the spine, the vapour of the throat, and at the
// edge of the planet the air and the black behind it. Each is a sheet at its own height, so the rise passes them at their own speeds.
// The cloud itself is one field of the world (shared/weather.ts): the surface takes its shade from the same field.
import * as THREE from 'three';
import { AT, KM, LIMB, LIMB_FOLLOW, LIVE_FROM, RISE_FIRST, X, Z, driftAt } from '../shared/anchors';
import { FPS } from '../../../config';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { BANK_KM, FOG_KM, HIGH_KM, LOW_KM, WEATHER_GLSL } from '../shared/weather';

export const PARTS = ['cloud', 'cyclone', 'storm', 'vapour', 'space', 'atmosphere'] as const;

const UV_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// The light on a cloud top: the sun on the faces turned to it, the sky on all of it, and the air between it and the eye.
const CLOUD_LIGHT_GLSL = /* glsl */ `
// The beat of the Heart on the underside of the cloud that stands over the chest: a dull red, small, come and gone in a second.
vec3 beatOnCloud(vec2 xz) {
  vec2 fromHeart = xz - vec2(${X(AT.lava.x).toFixed(1)}, ${Z(AT.lava.y).toFixed(1)});
  // (By night the fire is on the underside of the cloud all the time, dull, and the beat swells it.)
  if (uDusk > 0.0) return vec3(1.0, 0.2, 0.04) * (0.3 * max(uBeat - 0.12, 0.0) + uEmber.x * 0.012 * (0.4 + 1.6 * uBeat) * (1.0 + emberWork())) * exp(-dot(fromHeart, fromHeart) / 90000.0);
  return vec3(1.0, 0.2, 0.04) * 0.3 * max(uBeat - 0.12, 0.0) * exp(-dot(fromHeart, fromHeart) / 90000.0);
}
vec3 cloudLight(vec2 xz, float facing, float thick, float high) {
  float mu = limbCos(xz);
  float day = dayAt(xz);
  if (uDusk > 0.0) {
    // Cloud stands over the ground: it keeps the sun a moment after the ground under it has lost it, the high cloud longest.
    // (A top 2.6 km up sees over the curve of the planet by the sine of 1.6 degrees, the ice at 10.5 km by the sine of 3.3.)
    float sunH = sunHeight(xz) + uTerm.w * (0.03 + 0.03 * high);
    float low = mix(uSunDir.y, 0.2 + 0.62 * max(sunH, 0.0), uTerm.w);
    vec3 lit = sunLightAt(sunH, day) * low * (0.3 + 1.3 * clamp(facing, 0.0, 1.0)) * (0.5 + 0.5 * thick);
    vec3 cDusk = 0.72 * (lit + uSkyColour * 0.9 * skyLightAt(sunH, day) + moonAt(sunH) * (0.1 + 0.26 * clamp(facing, 0.0, 1.0)) * (0.5 + 0.5 * thick)) / 3.14159;
    float airDusk = 1.0 - exp(-0.008 * (1.0 - 0.6 * high) / max(mu, 0.12));
    return exposed(mix(cDusk, uAirColour * 0.7 * airLightAt(sunH), airDusk));
  }
  float sun = uSunDir.y * (0.3 + 1.3 * clamp(facing, 0.0, 1.0)) * (0.5 + 0.5 * thick) * day;
  vec3 c = 0.72 * (uSunColour * mix(vec3(1.0, 0.8, 0.62), vec3(1.0), day) * sun + uSkyColour * 0.9 * (0.5 + 0.5 * day)) / 3.14159;
  float air = 1.0 - exp(-0.008 * (1.0 - 0.6 * high) / max(mu, 0.12));
  return mix(c, uAirColour * 0.7, air);
}`;

const CLOUD_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${WEATHER_GLSL}
${CLOUD_LIGHT_GLSL}
varying vec3 vWorld;
void main() {
  vec2 xz = vWorld.xz;
  vec2 toSun = normalize(uSunDir.xz);
  // What one ray meets on its way down: the ice, then the low field, each at its own height.
  vec2 lean = (cameraPosition.xz - xz) / max(cameraPosition.y - ${LOW_KM.toFixed(1)}, 1.0);
  vec2 up = xz + lean * ${(HIGH_KM - LOW_KM).toFixed(1)};

  // The low field. Its tops are relief: a flank that falls toward the sun is lit, the flank behind it is in its own shade, and the
  // ice above throws its shadow down on it.
  vec2 low = lowField(xz);
  float flank = dot(lowSlope, toSun);
  float self = clamp(0.5 + 1.25 * flank, 0.0, 1.0);
  float high = highField(up);
  float highFlank = clamp(0.5 + 0.9 * dot(highSlope, toSun), 0.0, 1.0);
  // What the land holds: the banks on the ranges, above the low field, and the fog on the valley floors, under it.
  vec2 bankAt = xz + lean * ${(BANK_KM - LOW_KM).toFixed(1)};
  vec2 fogAt = xz - lean * ${(LOW_KM - FOG_KM).toFixed(1)};
  float bankIs = max(bankDepth(bankAt), 0.0);
  vec2 bankSlope = vec2(0.0);
  if (bankIs > 0.0) bankSlope = 0.8 * (texture2D(uMatPopcornNh, bankUvA).rg * 2.0 - 1.0) * BANK_A;
  if (bankIs > 0.0 && bankNear > 0.0) bankSlope += bankNear * 0.7 * (texture2D(uMatSpecksNh, bankUvB).rg * 2.0 - 1.0) * BANK_B;
  float bankSelf = clamp(0.5 + 1.25 * dot(bankSlope, toSun), 0.0, 1.0);
  float bankA = (1.0 - exp(-1.3 * bankIs)) * uArrive;
  float fogA = 0.5 * (1.0 - exp(-1.2 * max(fogDepth(fogAt), 0.0))) * uArrive;
  float under = 0.0;
  if (low.x > 0.0) under = highDepth(xz + uSunDir.xz / max(uSunDir.y, 0.2) * ${(HIGH_KM - LOW_KM).toFixed(1)});

  vec3 lowColour = cloudLight(xz, 0.12 + 0.95 * self, 0.35 + 0.65 * low.x, 0.0) * (0.72 + 0.5 * low.y) * (1.0 - 0.3 * under);
  vec3 highColour = cloudLight(up, 0.5 + 0.45 * highFlank, 0.5 + 0.5 * high, 1.0);
  vec3 bankColour = cloudLight(bankAt, 0.12 + 0.95 * bankSelf, 0.35 + 0.65 * bankA, 0.25) * (0.72 + 0.5 * clamp(bankIs / 3.5, 0.0, 1.0));
  // (Fog is seen from above as a level pale floor, a little blue, with no relief of its own.)
  vec3 fogColour = cloudLight(fogAt, 0.5, 0.5, 0.0) * vec3(0.84, 0.9, 0.98);
  // (Against the sun's image on the sea a cloud is seen dark: its lit top is dimmer than the sheet of light under it.)
  vec2 sunOnSea = (xz - vec2(${X(5875).toFixed(1)}, ${Z(703).toFixed(1)}) - (uTime - 8.1) * vec2(-9.0, -8.0)) * vec2(1.0, 0.48);
  if (uLive > 0.0) sunOnSea -= uLive * vec2(-20.0, 0.0) * vec2(1.0, 0.48);
  lowColour *= 1.0 - 0.4 * smoothstep(0.2, 0.7, exp(-pow(dot(sunOnSea, sunOnSea) / 55000.0, 0.463)));
  float a = low.x * 0.96;
  float b = high * 0.4;
  // (Held, the veil is seen: sheets of ice that cross the land against the wind of the low field.)
  if (uLive > 0.0) b *= 1.0 + 0.35 * smoothstep(0.0, 12.0, uWx);
  // From the ground up: the fog, the low field, the banks, the ice.
  vec3 colour = fogColour * fogA * (1.0 - a);
  colour = (colour + lowColour * a + beatOnCloud(xz) * a) * (1.0 - bankA) + bankColour * bankA;
  colour = colour * (1.0 - b) + highColour * b;
  float heldA = 1.0 - (1.0 - fogA) * (1.0 - bankA);
  if (uDusk > 0.0) {
    // (Under a low sun and by night only the body of a cloud is seen, and its edge is soft: the thin of it and the veil of ice
    // take too little light to show over the ground.)
    float gone = uTerm.w * (1.0 - smoothstep(-0.1, 0.34, sunHeight(xz)));
    // (By night the low field is seen by the moon, dimmer and thinner than by day: its bodies stay, its thin is lost.)
    float sunk = 1.0 - smoothstep(-0.34, -0.06, sunHeight(xz));
    float aNight = a * mix(1.0, 0.45 + 0.5 * a, gone) * (1.0 - 0.35 * sunk);
    // (The thin ice far above is lost against the day; with the camera's eye open it is seen, a veil of fibres that catches the
    // moon and crosses the land on its own wind. It is the same ice as by day, the photograph's own, and it never hides the ground.)
    float bNight = min(0.45, b * (1.0 - 0.5 * gone + 0.7 * (1.0 - smoothstep(-0.52, -0.3, sunHeight(xz)))));
    // (What the land holds goes the way of the low field: only its body is left to the moon.)
    float heldNight = mix(1.0, 0.5, gone) * (1.0 - 0.8 * sunk);
    bankA *= heldNight;
    fogA *= heldNight;
    colour = fogColour * fogA * (1.0 - aNight);
    colour = (colour + lowColour * aNight + exposed(beatOnCloud(xz)) * a) * (1.0 - bankA) + bankColour * bankA;
    colour = colour * (1.0 - bNight) + highColour * bNight;
    heldA = 1.0 - (1.0 - fogA) * (1.0 - bankA);
    a = aNight;
    b = bNight;
  }
  float alpha = 1.0 - (1.0 - a) * (1.0 - b) * (1.0 - heldA);
  gl_FragColor = vec4(colour * (1.0 - uSolo), alpha * (1.0 - uSolo)) * uArrive;
}`;

// The cyclone: drawn from the Builder's photographs of wind-drawn streaks and of small cumulus, wound round its eye (the cyclone of round 19:
// the photograph of a whole cyclone that stood here in round 25 read soft and flat at native size).
const CYCLONE_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${CLOUD_LIGHT_GLSL}
uniform sampler2D uStreaks;
uniform sampler2D uMatPopcorn;
uniform sampler2D uMatSpecks;
uniform sampler2D uMatStreaksNh;
uniform sampler2D uCloudTile;
varying vec3 vWorld;
varying vec2 vUv;
// How the tops of the bands fall, on the storm's own sheet (set by storm).
vec2 stormSlope = vec2(0.0);
// How much cloud a photograph holds at a point of the wound storm, against its own mean. The photograph is read along the arms,
// which a ring of pixels cannot follow across the seam of the angle: its fineness is told from the distance to the eye.
float woundIn(sampler2D t, vec2 uv, float mean, float fine, float r) {
  vec2 gx = dFdx(vUv) * fine / max(r, 0.03);
  vec2 gy = dFdy(vUv) * fine / max(r, 0.03);
  return dot(textureGrad(t, uv, gx, gy).rgb, vec3(0.3, 0.55, 0.15)) / mean;
}
// How much water stands in the way at a point of the storm (0 the open sea, about 1 the thin of a band, 3 and more a core): the
// photographs of the low field, wound round the eye and multiplied as they are there, never cut at a level. Wind streaks drawn
// out along the arms are the bands; the same photograph three times as wide gathers them into arms of unlike width with sea
// between; a field of small cumulus and its puffs break every band into cells. Thickest in the wall round a small eye, thinning
// to the rim, and heavier on one side than the other: no storm is the same all the way round.
float storm(vec2 p, float turn, float lopsided) {
  float r = max(length(p), 1e-3);
  float around = atan(p.y, p.x) / 6.28318 - turn;
  float lr = log(r);
  vec2 bend = 0.02 * (texture2D(uCloudTile, p * 0.4 + 0.3, 3.0).rg - 0.5);
  float band = woundIn(uStreaks, vec2(2.0 * around + 0.212 * lr, 0.955 * lr - 4.0 * around) + bend, 0.31, 1.5, r);
  // (The fall of the tops is the photograph's own, turned from the grid of the spiral to the sheet: along the arm and across it.)
  vec2 fallen = textureGrad(uMatStreaksNh, vec2(2.0 * around + 0.212 * lr, 0.955 * lr - 4.0 * around) + bend, dFdx(vUv) * 1.5 / max(r, 0.03), dFdy(vUv) * 1.5 / max(r, 0.03)).rg * 2.0 - 1.0;
  vec2 away = p / r;
  vec2 along = vec2(-away.y, away.x);
  stormSlope = fallen.x * (0.318 * along + 0.212 * away) + fallen.y * (0.955 * away - 0.637 * along);
  // (The arms: the same photograph twice as wide and read soft, so only where its streaks are gathered is left, bands of unlike width.)
  float arm = smoothstep(0.5, 1.6, woundIn(uStreaks, vec2(around + 0.106 * lr, 0.478 * lr - 2.0 * around) + vec2(0.37, 0.61) + 0.5 * bend, 0.31, 4.0, r));
  // (The cumulus is read without a pull along the arm, on the grid of the spiral itself: a cell is as long as it is wide at every
  // distance from the eye, and its rows lie along the arms.)
  float cells = woundIn(uMatPopcorn, vec2(0.955 * lr - 4.0 * around, 6.0 * around + 0.637 * lr) + vec2(0.19, 0.44) + bend, 0.34, 3.6, r);
  float puffs = woundIn(uMatSpecks, vec2(9.0 * around + 0.955 * lr, 1.432 * lr - 6.0 * around) + vec2(0.53, 0.08), 0.2, 5.4, r);
  float heavy = 0.5 + 0.5 * cos(6.28318 * (around - 0.239 * lr) + 0.6);
  float wall = exp(-pow(r / 0.12, 1.5));
  float reach = pow(1.0 - smoothstep(0.1, 0.96 - 0.2 * lopsided * (0.5 + 0.5 * cos(6.28318 * around + 2.2)), r), 1.3);
  // (The eye is small and soft: thin cloud lies in it, and the bands curl into it.)
  float stands = (0.9 * wall + reach * mix(0.5, 1.1, heavy * (0.6 + 0.4 * lopsided))) * mix(0.3, 1.0, smoothstep(0.006, 0.05, r));
  // (Round the eye the storm is one shield of cloud, thick enough that its fibres are fused and only their relief is seen. The
  // arms part from it farther out, and only out there does the cloud break into cumulus with sea between.)
  float shield = exp(-pow(r / 0.24, 2.0));
  float broken = smoothstep(0.16, 0.6, r);
  float gathered = mix(1.0, 0.3 + 1.45 * arm, smoothstep(0.02, 0.22, r));
  float body = 0.3 * band + pow(band * mix(1.0, cells, max(broken, 0.4)) * mix(1.0, puffs, 0.5 * max(broken, 0.4)), 0.6);
  return max(body * gathered * stands * (1.0 + 0.25 * shield) - mix(0.36, 0.62, smoothstep(0.06, 0.45, r)), 0.0);
}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  // The whole storm turns, the middle faster than the rim, so its arms wind as the frame is held.
  float turn = uTime * (0.009 + 0.05 / (1.0 + 14.0 * r)) / 6.28318;
  // (Held from orbit it turns about its eye as one body, on the clock of the weather: every band, clump and gap goes round with it,
  // the inner bands faster than the outer, so the arms keep their shape and wind tighter. The slide of the streaks along the arms
  // stops where the body's own turn begins: a slide through arms that stand still is not seen as a turn.)
  vec2 body = p;
  float lopsided = 0.0;
  float woundBy = 0.0;
  if (uLive > 0.0) {
    lopsided = smoothstep(0.0, 9.0, uWx);
    turn = ${LIVE_FROM.toFixed(6)} * (0.009 + 0.05 / (1.0 + 14.0 * r)) / 6.28318;
    float wound = uWx * (0.0192 + 0.0454 / (1.0 + 14.0 * r));
    woundBy = wound;
    body = mat2(cos(wound), sin(wound), -sin(wound), cos(wound)) * p;
  }
  vec2 sunStep = normalize(uSunDir.xz);
  float depth = storm(body, turn, lopsided);
  float thick = 1.0 - exp(-1.1 * depth);
  // Each band is lit on its side toward the sun and takes its neighbour's shade on the other: the fall of its top is the
  // photograph's, carried round with the body of the storm.
  vec2 fall = stormSlope * mat2(cos(woundBy), sin(woundBy), -sin(woundBy), cos(woundBy));
  float self = clamp(0.5 + 1.6 * dot(vec2(fall.x, -fall.y), sunStep), 0.0, 1.0);
  // (Round the eye the bands are fused: thin cloud lies between the fibres of the shield, and the sea is not seen through it.)
  float veil = 0.42 * exp(-pow(r / 0.21, 2.0)) * (0.45 + 0.55 * smoothstep(0.006, 0.05, r));
  float tall = 1.0 - smoothstep(0.05, 0.45, r);
  vec3 colour = cloudLight(vWorld.xz, 0.12 + 0.95 * self, 0.35 + 0.65 * thick, 0.3 * tall) * (0.72 + 0.5 * clamp(depth / 3.5, 0.0, 1.0)) * (1.0 + 0.3 * tall);
  // (By night the cyclone is a dim wheel, no brighter than the bone.)
  if (uDusk > 0.0) colour *= 1.0 - 0.2 * uEmber.x;
  float alpha = 1.0 - (1.0 - 0.96 * thick) * (1.0 - veil);
  gl_FragColor = vec4(colour * alpha * (1.0 - uSolo), alpha * (1.0 - uSolo)) * uArrive;
}`;

const STORM_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${CLOUD_LIGHT_GLSL}
uniform sampler2D uPicture;
uniform sampler2D uCloudTile;
varying vec3 vWorld;
varying vec2 vUv;
// A flash inside the anvil: where and how bright, for one of the cells of the clock.
vec3 flash(float cell, float rate) {
  float n = floor(uTime * rate + cell * 0.37);
  float f = fract(uTime * rate + cell * 0.37);
  float lit = step(0.62, hash12(vec2(n, cell * 7.0)));
  vec2 at = vec2(0.2 + 0.6 * hash12(vec2(n, cell + 3.0)), 0.32 + 0.36 * hash12(vec2(n, cell + 9.0)));
  // Two strokes close together, then dark.
  float pulse = exp(-f * 16.0) + 0.7 * exp(-pow((f - 0.16) * 22.0, 2.0));
  return vec3(at, lit * pulse);
}
// One tower of the system: the photograph of merged anvils from orbit (public/assets/reveal/mat/storm.jpg), read small and turned.
float tower(vec2 p, vec3 where, float turn) {
  float c = cos(turn);
  float s = sin(turn);
  vec2 q = mat2(c, s, -s, c) * (p - where.xy) / where.z + 0.5;
  vec2 m = min(q, 1.0 - q);
  return dot(texture2D(uPicture, clamp(q, 0.0, 1.0)).rgb, vec3(0.3, 0.55, 0.15)) * smoothstep(0.0, 0.06, min(m.x, m.y));
}
// The storm is a long system that lies along the backbone: five towers of it in a row, the greatest in the middle, each the photograph
// turned its own way, so the tops are lumpy and the windward edge is the photograph's own ragged one. Its light is its cover.
float lightOf(vec2 p) {
  float best = tower(p, vec3(-1.12, 0.03, 0.56), 1.9);
  best = max(best, tower(p, vec3(-0.66, -0.05, 0.8), 4.1));
  best = max(best, tower(p, vec3(-0.12, 0.03, 0.98), 0.4));
  best = max(best, tower(p, vec3(0.5, -0.02, 1.0), 2.9));
  best = max(best, tower(p, vec3(1.06, 0.04, 0.8), 5.3));
  return best;
}
void main() {
  // The tops boil: the photograph is read through a slow drifting bend, so its towers swell and its edge works while the frame is held.
  vec2 bend = texture2D(uCloudTile, vUv * vec2(1.6, 0.5) + uTime * vec2(0.004, -0.003)).rg - 0.5;
  vec2 p = (vUv - 0.5) * vec2(3.2, 1.0) + bend * 0.05;
  float seenLight = lightOf(p);
  float thick = smoothstep(0.14, 0.6, seenLight);
  // This place's sun lights it: a tower stands bright on its sunward side and throws its shade down the far one.
  vec2 sunUv = normalize(uSunDir.xz) * vec2(1.0, -1.0);
  float sunward = lightOf(p + sunUv * 0.035);
  float lee = lightOf(p - sunUv * 0.08);
  float self = clamp(0.5 + 2.4 * (seenLight - sunward) - 0.9 * max(lee - seenLight, 0.0), 0.0, 1.0);
  vec3 colour = cloudLight(vWorld.xz, 0.08 + 0.8 * self, 0.8, 0.6) * (0.3 + 0.7 * pow(seenLight, 1.5));
  // The light of the strikes comes through the cloud from inside: soft, violet, brightest where the cloud is thin over it. Two of the
  // towers hold a low glimmer between the strikes, so the held frame is never without it.
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec3 f = flash(float(i), 0.55 + 0.17 * float(i));
    vec2 d = (vUv - f.xy) * vec2(3.2, 1.0);
    glow += vec3(0.6, 0.5, 1.0) * f.z * exp(-dot(d, d) * 26.0) * (0.4 + 0.6 * seenLight) * thick;
  }
  vec2 d1 = p - vec2(-0.2, 0.05);
  vec2 d2 = p - vec2(0.62, -0.06);
  float glimmer = (0.14 + 0.16 * vnoise(vec2(uTime * 0.9, 3.0))) * exp(-dot(d1, d1) * 40.0) + (0.1 + 0.16 * vnoise(vec2(uTime * 1.3, 11.0))) * exp(-dot(d2, d2) * 55.0);
  glow += vec3(0.55, 0.42, 1.0) * glimmer * thick;
  // (Held from orbit the storm is watched long enough to see it work: the strokes inside the anvils tell.)
  if (uLive > 0.0) glow *= 1.0 + 1.8 * smoothstep(0.0, 2.0, uLive);
  if (uDusk > 0.0) glow *= uCalm.x;
  // (The storm dies down with the day: by night its towers are no brighter than the bone.)
  if (uDusk > 0.0) colour *= 1.0 - 0.2 * uEmber.x;
  if (uDusk > 0.0) colour += exposed(beatOnCloud(vWorld.xz)) - beatOnCloud(vWorld.xz);
  colour += glow * 1.6 + beatOnCloud(vWorld.xz);
  float alpha = clamp(thick, 0.0, 0.98);
  gl_FragColor = vec4(colour * alpha * (1.0 - uSolo), alpha * (1.0 - uSolo)) * uArrive;
}`;

// The breath of the throat: thin trails of steam that leave the neck together and curl apart down the wind, as a volcano's do from orbit.
const VAPOUR_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${CLOUD_LIGHT_GLSL}
uniform sampler2D uPicture;
uniform sampler2D uCloudTile;
uniform vec2 uThroat;
uniform vec2 uWind;
varying vec3 vWorld;
void main() {
  vec2 d = vWorld.xz - uThroat;
  // along runs from the throat (0) down the wind (1) over 600 km; across is the width of the photograph, 340 km.
  float along = dot(d, uWind) / 560.0;
  float across = dot(d, vec2(-uWind.y, uWind.x)) / 300.0;
  // The wind carries the curls: the trail is read through a bend that travels down it, stronger the farther it has gone.
  vec2 flow = texture2D(uCloudTile, vec2(along * 1.3 - uTime * 0.011, across * 0.8 + 0.3)).rg - 0.5;
  if (uLive > 0.0) flow = texture2D(uCloudTile, vec2(along * 1.3 - uTime * 0.011 - uWx * 0.03, across * 0.8 + 0.3)).rg - 0.5;
  vec2 q = vec2(along + 0.02, across * (1.0 - 0.35 * along) + 0.5 + 0.1 * sin(along * 5.0 + 1.0) * along) + flow * vec2(0.04, 0.26) * smoothstep(0.02, 0.5, along);
  // (Read soft: each trail a thin veil with a denser thread in it, and the three of unlike strength.)
  float seenLight = 0.25 * dot(texture2D(uPicture, clamp(q, 0.0, 1.0), 1.0).rgb, vec3(0.3, 0.55, 0.15)) + 1.2 * dot(texture2D(uPicture, clamp(q, 0.0, 1.0), 4.5).rgb, vec3(0.3, 0.55, 0.15));
  seenLight *= 0.55 + 0.9 * texture2D(uCloudTile, vec2(along * 0.4 + 0.1, across * 1.7 + 0.6), 3.0).b;
  // Puffs leave the throat one after another and thin as they go.
  float puff = 0.78 + 0.22 * sin(along * 26.0 - uTime * 0.5 + 3.0 * flow.x);
  if (uLive > 0.0) puff = 0.78 + 0.22 * sin(along * 26.0 - uTime * 0.5 - uLive * 1.6 + 3.0 * flow.x);
  float inside = smoothstep(0.0, 0.02, q.x) * (1.0 - smoothstep(0.55, 0.98, q.x)) * smoothstep(0.0, 0.08, q.y) * (1.0 - smoothstep(0.92, 1.0, q.y));
  float thick = smoothstep(0.03, 0.95, seenLight) * inside * puff * (1.0 - 0.5 * smoothstep(0.2, 0.9, along));
  vec3 colour = cloudLight(vWorld.xz, 0.7, 0.7, 0.3);
  float alpha = clamp(thick * 0.5, 0.0, 1.0);
  // (And the vapour of the throat is seen to trail: a little denser while the frame is held.)
  if (uLive > 0.0) alpha = clamp(thick * (0.5 + 0.25 * smoothstep(0.0, 3.0, uLive)), 0.0, 1.0);
  gl_FragColor = vec4(colour * alpha * (1.0 - uSolo), alpha * (1.0 - uSolo)) * uArrive;
}`;

// The edge of the planet. Inside it the air thickens to a blue band; outside it thins into the black within a few tens of kilometres,
// and behind the black stand a few stars.
const EDGE_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
uniform float uWhich;
varying vec3 vWorld;
void main() {
  float d = limbShare(vWorld.xz);
  float km = (d - 1.0) * uLimb.z;
  if (uWhich < 0.5) {
    // space: the black beyond the edge, the last of the air against it, and the stars
    float a = smoothstep(-3.0, 3.0, km);
    float outer = exp(-max(km, 0.0) / 26.0);
    vec3 glow = mix(vec3(0.05, 0.17, 0.55), vec3(0.4, 0.64, 1.0), outer * outer) * outer * 0.5;
    vec2 cell = floor(vWorld.xz / 40.0);
    vec2 within = fract(vWorld.xz / 40.0) - 0.5;
    float pick = hash12(cell);
    vec2 off = vec2(hash12(cell + 7.3), hash12(cell + 19.1)) - 0.5;
    float star = step(0.94, pick) * exp(-dot(within - 0.6 * off, within - 0.6 * off) * 520.0) * (0.25 + 0.75 * hash12(cell + 3.7)) * smoothstep(20.0, 90.0, km);
    vec3 colour = (glow + vec3(0.85, 0.9, 1.0) * star * 0.3) * a;
    if (uDusk > 0.0) {
      // The air at the edge keeps the sun longest, on the side the sun went: a twilight arc, warm against the planet and blue above,
      // and when that has gone a thin line of airglow all round. The stars come out as the exposure opens.
      float sunH = sunHeight(vWorld.xz) + uTerm.w * 0.08;
      // (The stars stand with the edge of the planet, not with the ground that slides under the drifting camera.)
      vec2 fixedSky = vWorld.xz - (uLimb.xy - vec2(${X(LIMB.cx).toFixed(3)}, ${Z(LIMB.cy).toFixed(3)}));
      vec2 cellSky = floor(fixedSky / 40.0);
      vec2 withinSky = fract(fixedSky / 40.0) - 0.5;
      vec2 offSky = vec2(hash12(cellSky + 7.3), hash12(cellSky + 19.1)) - 0.5;
      star = step(0.94, hash12(cellSky)) * exp(-dot(withinSky - 0.6 * offSky, withinSky - 0.6 * offSky) * 520.0) * (0.25 + 0.75 * hash12(cellSky + 3.7)) * smoothstep(20.0, 90.0, km);
      // (Layered as it is seen from orbit: red against the planet, orange, a pale band, and blue above. Held under the opening exposure.)
      float lowSun = uTerm.w * (1.0 - smoothstep(0.05, 0.32, sunH));
      vec3 layers = mix(mix(vec3(0.85, 0.13, 0.03), vec3(1.0, 0.46, 0.12), smoothstep(1.0, 12.0, km)), mix(vec3(0.8, 0.78, 0.7), vec3(0.2, 0.4, 0.95), smoothstep(22.0, 62.0, km)), smoothstep(9.0, 30.0, km));
      vec3 arc = mix(glow, layers * exp(-max(km, 0.0) / 34.0) * 0.5, lowSun) * mix(1.0, sunSeen(sunH - 0.05) + 0.03 * skySeen(sunH), uTerm.w);
      float airglow = exp(-pow((km - 16.0) / 20.0, 2.0));
      colour = (exposed(arc * uEmber.w * pow(uGain, -0.88) + vec3(0.2, 0.36, 0.8) * 0.0011 * airglow * uDusk) + vec3(0.85, 0.9, 1.0) * star * 0.3 * pow(uGain, 0.45) * (uEmber.y > 3.0 ? min(1.0, uGain / 5.0) : 1.0)) * a;
    }
    gl_FragColor = vec4(colour * (1.0 - uSolo), a * (1.0 - uSolo));
    return;
  }
  float inner = exp(min(km, 0.0) / 150.0) * 0.5 + exp(min(km, 0.0) / 30.0) * 0.5;
  float band = km < 0.0 ? inner : 0.0;
  vec3 blue = mix(vec3(0.06, 0.2, 0.62), vec3(0.42, 0.66, 1.0), band * band);
  vec3 colour = blue * band * 0.5;
  if (uDusk > 0.0) {
    float sunH = sunHeight(vWorld.xz) + uTerm.w * 0.05;
    vec3 arc = mix(vec3(1.0), mix(vec3(1.25, 0.5, 0.16), vec3(0.75, 0.85, 1.1), sunSeen(sunH - 0.12)) * sunSeen(sunH - 0.03) + 0.04 * skySeen(sunH), uTerm.w);
    colour = exposed(colour * arc * pow(uGain, -0.88));
  }
  gl_FragColor = vec4(colour * (1.0 - uSolo), 0.0);
}`;

export function create(ctx: Context): Piece {
  const data = (file: string, repeat: boolean): THREE.Texture => ctx.assets.texture(file, { kind: 'data', repeat });
  const tile = data('sky/cloud-tile.jpg', true);
  // Where the weather stands (assets-src/reveal/sky/make_cover.py), and the Builder's photographs of cloud from orbit (assets-src/reveal/mat/RECIPE.md).
  const shared: [string, string, boolean][] = [['uCover', 'sky/cover.png', false], ['uMatPopcorn', 'mat/popcorn.jpg', true], ['uMatStreaks', 'mat/streaks.jpg', true], ['uMatSpecks', 'mat/specks.jpg', true], ['uMatCellsNh', 'mat/cells-nh.png', true], ['uMatPopcornNh', 'mat/popcorn-nh.png', true], ['uMatSpecksNh', 'mat/specks-nh.png', true], ['uMatStreaksNh', 'mat/streaks-nh.png', true], ['uMatVeilNh', 'mat/veil-nh.png', true], ['uMatVeil', 'mat/veil.jpg', true], ['uBanks', 'sky/banks.png', false]];
  (ctx.rig.uniforms.uCloudTile as THREE.IUniform).value = tile;
  for (const [uniform, file, repeat] of shared) (ctx.rig.uniforms[uniform] as THREE.IUniform).value = data(file, repeat);

  const made: { geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial }[] = [];
  let order = 10;
  const sheet = (name: string, geometry: THREE.BufferGeometry, fragment: string, extra: Record<string, THREE.IUniform> = {}, additive = false): THREE.Mesh => {
    const material = new THREE.ShaderMaterial({
      uniforms: { ...ctx.rig.uniforms, ...extra },
      vertexShader: UV_VERTEX,
      fragmentShader: fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = order++;
    made.push({ geometry, material });
    ctx.scene.add(ctx.parts.built(name, mesh));
    return mesh;
  };
  const quad = (at: { x: number; y: number }, halfX: number, halfZ: number, height: number, turn: number): THREE.BufferGeometry =>
    new THREE.PlaneGeometry(2 * halfX * KM, 2 * halfZ * KM)
      .rotateX(-Math.PI / 2)
      .rotateY(turn)
      .translate(X(at.x), height, Z(at.y));

  // The breath of the throat: it leaves the neck and is carried up the picture and to the left by the wind.
  const wind = new THREE.Vector2(-0.43, -0.9).normalize();
  const throat = new THREE.Vector2(X(AT.throat.x), Z(AT.throat.y));
  sheet('vapour', quad({ x: AT.throat.x + (wind.x * 400) / KM, y: AT.throat.y + (wind.y * 400) / KM }, 560 / KM, 560 / KM, 1.5, 0), VAPOUR_FRAGMENT, {
    uPicture: { value: data('mat/wisps.jpg', false) },
    uThroat: { value: throat },
    uWind: { value: wind },
  });
  sheet('cloud', new THREE.PlaneGeometry(90000, 90000).rotateX(-Math.PI / 2).translate(0, LOW_KM, 0), CLOUD_FRAGMENT, {
  });
  sheet('storm', quad({ x: AT.storm.x - 40, y: AT.storm.y }, 256, 80, 7, 0.03), STORM_FRAGMENT, { uPicture: { value: data('mat/storm.jpg', false) } });
  sheet('cyclone', quad(AT.cyclone, 1250, 1250, 6, 0), CYCLONE_FRAGMENT, { uStreaks: { value: data('mat/streaks.jpg', true) } });
  const centre = { x: LIMB.cx, y: LIMB.cy };
  const ring = (inner: number, outer: number): THREE.BufferGeometry =>
    new THREE.RingGeometry(inner * LIMB.r * KM, outer * LIMB.r * KM, 720, 1).rotateX(-Math.PI / 2).translate(X(centre.x), 12, Z(centre.y));
  const edges = [sheet('space', ring(0.995, 4), EDGE_FRAGMENT, { uWhich: { value: 0 } }), sheet('atmosphere', ring(0.9, 1.03), EDGE_FRAGMENT, { uWhich: { value: 1 } }, true)];

  return {
    // (As the camera drifts at the end the edge of the planet goes most of the way with it: shared/anchors.ts.)
    setTime: (seconds) => {
      const [driftX, driftZ] = driftAt(RISE_FIRST + seconds * FPS);
      for (const edge of edges) edge.position.set(LIMB_FOLLOW * driftX, 0, LIMB_FOLLOW * driftZ);
    },
    dispose: () => {
      for (const m of made) {
        m.geometry.dispose();
        m.material.dispose();
      }
    },
  };
}
