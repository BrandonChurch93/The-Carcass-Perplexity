// Everything that stands over the surface: the cloud at its heights, the cyclone, the storm on the spine, the vapour of the throat, and at the
// edge of the planet the air and the black behind it. Each is a sheet at its own height, so the rise passes them at their own speeds.
// The cloud itself is one field of the world (shared/weather.ts): the surface takes its shade from the same field.
import * as THREE from 'three';
import { AT, KM, LIMB, LIMB_FOLLOW, LIVE_FROM, RISE_FIRST, X, Z, driftAt } from '../shared/anchors';
import { FPS } from '../../../config';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { BANK_KM, FOG_KM, GROUND_RECT, HIGH_KM, LOW_KM, WEATHER_GLSL } from '../shared/weather';

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
// How much air lies between a cloud top and the eye: one over the cosine of the slant, to the thirty fold of the very edge of the
// planet, where the cloud is lost in the haze it is seen along.
float airPath(float mu) {
  float path = 1.0 / sqrt(mu * mu + 0.0009);
  float beyond = max(path - 1.5, 0.0);
  return 0.008 * path + 0.0006 * beyond * beyond;
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
    float airDusk = 1.0 - exp(-airPath(mu) * (1.0 - 0.6 * high));
    return exposed(mix(cDusk, uAirColour * 0.7 * airLightAt(sunH), airDusk));
  }
  float sun = uSunDir.y * (0.3 + 1.3 * clamp(facing, 0.0, 1.0)) * (0.5 + 0.5 * thick) * day;
  vec3 c = 0.72 * (uSunColour * mix(vec3(1.0, 0.8, 0.62), vec3(1.0), day) * sun + uSkyColour * 0.9 * (0.5 + 0.5 * day)) / 3.14159;
  float air = 1.0 - exp(-airPath(mu) * (1.0 - 0.6 * high));
  return mix(c, uAirColour * 0.7, air);
}`;

const CLOUD_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${WEATHER_GLSL}
${CLOUD_LIGHT_GLSL}
uniform sampler2D uGround;
uniform vec4 uGroundRect;
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
  if (bankIs > 0.0) bankSlope = 0.8 * (pic(uMatPopcornNh, bankUvA, bankGA).rg * 2.0 - 1.0) * BANK_A;
  if (bankIs > 0.0 && bankNear > 0.0) bankSlope += bankNear * 0.7 * (pic(uMatSpecksNh, bankUvB, bankGB).rg * 2.0 - 1.0) * BANK_B;
  float bankSelf = clamp(0.5 + 1.25 * dot(bankSlope, toSun), 0.0, 1.0);
  float bankA = (1.0 - exp(-1.3 * bankIs)) * uArrive;
  // Stratus fills its pools to a level: what stands in the way of the light is how far the ground lies under that level.
  // (The height is the land's own widest relief, so the edge of the stratus is the contour of the valley it lies in.)
  float pool = fogDepth(fogAt);
  vec2 uvGround = (fogAt - uGroundRect.xy) * uGroundRect.zw;
  // (The change of each place across the pixel, before the branch: see pic in shared/weather.ts.)
  uvGround = clamp(uvGround, 0.0, 1.0);
  vec4 gGround = GRADS(uvGround);
  float fogIs = 0.0;
  if (pool > 0.0) {
    float height = pic(uGround, uvGround, gGround).b;
    // (Only the floors fill: the level stays under the flanks, so the stratus is the branching of the valley and never a
    // sheet over a range. Nor over water: the relief holds the shelf and the sounds a little over its sea level.)
    fogIs = 7.0 * max(0.415 + 0.14 * pool - height, 0.0) * smoothstep(0.34, 0.41, height) * (0.55 + 0.45 * smoothstep(0.7, 1.3, fogVeil));
  }
  float fogA = 0.8 * (1.0 - exp(-1.2 * fogIs)) * uArrive;
  vec2 fogSlope = vec2(0.0);
  if (fogIs > 0.0) fogSlope = (pic(uMatVeilNh, fogUv, fogG).rg * 2.0 - 1.0) * mat2(0.5, 0.87, -0.87, 0.5);
  float fogSelf = clamp(0.5 + 0.3 * dot(fogSlope, toSun), 0.0, 1.0);
  // (Read in every pixel, cloud under it or not: read only under cloud, the pixels at the edge of a cloud took the fineness of
  // the read from neighbours that had not made it, and one of them came out a level different from one run to the next.)
  float under = highDepth(xz + uSunDir.xz / max(uSunDir.y, 0.2) * ${(HIGH_KM - LOW_KM).toFixed(1)});

  vec3 lowColour = cloudLight(xz, 0.12 + 0.95 * self, 0.35 + 0.65 * low.x, 0.0) * (0.72 + 0.5 * low.y) * (1.0 - 0.3 * under);
  vec3 highColour = cloudLight(up, 0.5 + 0.45 * highFlank, 0.5 + 0.5 * high, 1.0);
  vec3 bankColour = cloudLight(bankAt, 0.12 + 0.95 * bankSelf, 0.35 + 0.65 * bankA, 0.25) * (0.72 + 0.5 * clamp(bankIs / 3.5, 0.0, 1.0));
  // (Fog is seen from above as a level pale floor, a little blue, with no relief of its own.)
  // (Stratus has a top all the same: long low swells that the sun grazes, and it is thin and blue toward its edge.)
  vec3 fogColour = cloudLight(fogAt, 0.22 + 0.6 * fogSelf, 0.4 + 0.5 * clamp(fogIs, 0.0, 1.0), 0.0) * mix(vec3(0.5, 0.6, 0.78), vec3(0.62, 0.68, 0.78), clamp(fogIs * 0.7, 0.0, 1.0));
  // Over the sun's image on the sea the low air is lit from behind: it scatters the sun forward, warm, so the sheet of light
  // is gold through it and not the white of the bare glitter.
  // (No haze is laid over the low land: pooled there it read as grey smears on glass and flattened the ranges.)
  float image = sunImage(fogAt);
  float goldA = 0.7 * smoothstep(0.05, 0.7, image) * uArrive;
  // (The lit air is not one smooth ramp, which an encoder cuts into bands: it lies in layers the wind has drawn out, thin
  // cloud and thicker air, a few percent either way, and they pass in the hold.)
  vec2 hazeAt = fogAt - uWx * vec2(9.0, 3.0);
  vec2 hazeUvA = mat2(0.91, 0.42, -0.42, 0.91) * hazeAt / vec2(1500.0, 520.0) + vec2(0.23, 0.61);
  vec2 hazeUvB = mat2(0.97, -0.24, 0.24, 0.97) * hazeAt / vec2(560.0, 230.0) + vec2(0.74, 0.12);
  vec4 hazeGA = GRADS(hazeUvA);
  vec4 hazeGB = GRADS(hazeUvB);
  if (goldA > 0.0) {
    float layers = dot(0.6 * pic(uMatVeil, hazeUvA, hazeGA, 1.0).rgb + 0.4 * pic(uMatVeil, hazeUvB, hazeGB, 1.0).rgb, vec3(0.3, 0.55, 0.15));
    goldA *= 0.76 + 0.24 * smoothstep(0.1, 0.42, layers) + 0.2 * (layers - 0.262);
  }
  vec3 gold = uSunColour * vec3(1.0, 0.8, 0.52) * (0.08 + 0.34 * image);
  if (uDusk > 0.0) {
    gold = exposed(gold * sunTint(max(uSunDir.y, 0.0)));
    goldA *= uCalm.z;
  }
  if (goldA > 0.0) {
    fogColour = (fogColour * fogA + gold * goldA * (1.0 - fogA)) / max(1.0 - (1.0 - fogA) * (1.0 - goldA), 1e-4);
    fogA = 1.0 - (1.0 - fogA) * (1.0 - goldA);
  }
  // (Against the sun's image on the sea a cloud is seen dark: its lit top is dimmer than the sheet of light under it.)
  vec2 sunOnSea = (xz - vec2(${X(5875).toFixed(1)}, ${Z(703).toFixed(1)}) - (uTime - 8.1) * vec2(-9.0, -8.0)) * vec2(1.0, 0.48);
  if (uLive > 0.0) sunOnSea -= uLive * vec2(-20.0, 0.0) * vec2(1.0, 0.48);
  lowColour *= 1.0 - 0.4 * smoothstep(0.2, 0.7, exp(-pow(dot(sunOnSea, sunOnSea) / 55000.0, 0.463)));
  float a = low.x * 0.96;
  float b = min(high * 0.46, 0.32);
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
    // (Brought up for the open eye it is eased toward its ceiling, never cut off at it: cut off, every sheet came out one even
    // grey to its edge, a flake, where the photograph's own fibre should carry through it.)
    float bNight = 0.5 * (1.0 - exp(-b * (1.0 - 0.5 * gone + 0.7 * (1.0 - smoothstep(-0.52, -0.3, sunHeight(xz)))) / 0.5));
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
uniform sampler2D uMatVeil;
uniform sampler2D uCloudTile;
varying vec3 vWorld;
varying vec2 vUv;
float lum(vec3 c) {
  return dot(c, vec3(0.3, 0.55, 0.15));
}
// How thick the storm stands at a point. It is cloud of the same kinds as the field round it, wound round the eye: the photograph
// of soft drawn-out cloud (mat/veil.jpg) twice across one turn and read soft gives the arms, so they are unequal in number, width
// and length as the photograph's own bands are, and the photograph of streaks of small cells (mat/streaks.jpg) fills them. Outward
// only the strongest arms are left and they end where the photograph's bands end; between arms is open sea.
float storm(vec2 p, float turn, float lopsided, float shorter, float drawnIn) {
  float r = max(length(p), 1e-3);
  float around = atan(p.y, p.x) / 6.28318 - turn;
  float lr = log(r);
  // (The photographs are laid in the coordinates of a spiral that keep a square square: twice round the eye one way, once the
  // other, and the logarithm of the distance in the proportion that goes with those. Laid with any other proportion a cell is
  // drawn out along the arm, three to six times its width, and the storm is strokes. Whole multiples of the angle keep the
  // winding without a seam.)
  float phase = around - 0.3183 * lr;
  vec2 wound = vec2(2.0 * around + 0.1592 * lr, phase);
  vec2 bend = texture2D(uCloudTile, p * 0.3 + 0.3, 3.0).rg - 0.5;
  float grain = 1.0 / max(r, 0.05);
  vec2 gx = dFdx(vUv) * grain;
  vec2 gy = dFdy(vUv) * grain;
  // (The arms are the one lay drawn out, two to one along the winding: a band of cloud is longer than it is wide.)
  // (Watched, cloud is drawn in along the arms: the bands pass through the cells that fill them, so an arm swells, thins and
  // breaks as it turns and no arm is the same a few seconds on.)
  vec2 ua = vec2(wound.x + drawnIn, 2.0 * wound.y) + vec2(0.13, 0.41) + 0.03 * bend;
  float arms = lum(textureGrad(uMatVeil, ua, gx * 2.0, gy * 2.0).rgb) / 0.262;
  vec2 ub = wound + vec2(0.57, 0.22) + 0.02 * bend;
  vec2 uc = 2.0 * wound + vec2(0.21, 0.73) + 0.02 * bend;
  vec2 ud = 4.0 * wound + vec2(0.83, 0.37) + 0.02 * bend;
  // (The same photograph at three sizes, the finer the farther out, where the winding has drawn the coarse one out to strokes.)
  float outer = smoothstep(0.15, 0.65, r);
  float clumps = lum(textureGrad(uStreaks, ub, gx * 0.75, gy * 0.75).rgb);
  float fine = (mix(0.3, 0.1, outer) * clumps + mix(0.5, 0.35, outer) * lum(textureGrad(uStreaks, uc, gx * 1.5, gy * 1.5).rgb) + mix(0.2, 0.55, outer) * lum(textureGrad(uStreaks, ud, gx * 3.0, gy * 3.0).rgb)) / 0.304;
  // (Left whole, the arms read from far off as five bold strokes of one weight. A second lay of the bands, finer and at
  // its own place along the winding, and the clumps of the cell photograph break each into lengths of unlike weight.)
  vec2 ue = vec2(2.0 * wound.x - 1.7 * drawnIn, 3.0 * wound.y) + vec2(0.67, 0.09) + 0.03 * bend;
  arms = (0.62 * arms + 0.38 * lum(textureGrad(uMatVeil, ue, gx * 3.0, gy * 3.0).rgb) / 0.262) * mix(1.0, clumps / 0.304, 0.45 * smoothstep(0.08, 0.3, r));
  float core = 1.0 - smoothstep(0.02, 0.14, r);
  // (A strong arm reaches farther out than a weak one, so the storm has no round rim.)
  // (Nor is it a disc: it stands in a wind of its own, which draws it out on one side and cuts it short on the other.)
  float reach = 1.0 - smoothstep(0.25, 0.8, r * shorter * (1.45 - 0.45 * min(arms, 2.0)));
  float least = mix(0.7, 1.3, smoothstep(0.05, 0.75, r));
  // (No storm is the same all the way round: as it is watched one side grows heavy and the side across from it thins.)
  least -= 0.25 * lopsided * cos(6.28318 * phase + 0.6);
  float band = smoothstep(least - 0.35, least + 0.35, arms);
  float cover = max(0.8 * core, band * (0.1 + 0.9 * reach));
  // (Outward the air between the cells widens, so an arm ends in separate cells and not in a drawn line.)
  float cells = smoothstep(0.45 + 0.45 * smoothstep(0.3, 0.8, r * shorter), 1.85, fine);
  // (Toward the eye a band is one body of cloud and its cells are the lumps of its top; outward it opens into rows of them.)
  float body = cover * mix(cells, 0.2 + 0.8 * cells, max(core, band * (1.0 - outer)));
  return body * smoothstep(0.006, 0.036, r) * (1.0 - smoothstep(0.8, 0.98, r * shorter));
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
  float drawnIn = 0.0;
  if (uLive > 0.0) {
    drawnIn = 0.011 * uWx;
    lopsided = smoothstep(0.0, 9.0, uWx);
    turn = ${LIVE_FROM.toFixed(6)} * (0.009 + 0.05 / (1.0 + 14.0 * r)) / 6.28318;
    float wound = uWx * (0.05 + 0.035 / (1.0 + 14.0 * r));
    body = mat2(cos(wound), sin(wound), -sin(wound), cos(wound)) * p;
  }
  vec2 sunStep = normalize(uSunDir.xz);
  // (How much shorter the storm stands on a side than on its longest: this stands on the planet and does not turn with it.)
  float side = atan(p.y, p.x);
  float shorter = 1.32 - 0.3 * cos(side - 3.4) - 0.12 * cos(2.0 * side + 1.0) + 0.5 * (texture2D(uCloudTile, p * 0.17 + vec2(0.71, 0.38), 3.0).b - 0.5);
  float thick = storm(body, turn, lopsided, max(shorter, 1.0), drawnIn);
  // Each band is lit on its side toward the sun and takes its neighbour's shade on the other; the wall round the eye stands highest.
  // (How its thickness falls toward the sun, from the change of it across the pixel.)
  vec2 across = vec2(dFdx(thick), dFdy(thick));
  vec2 sx = dFdx(p);
  vec2 sy = dFdy(p);
  float det = sx.x * sy.y - sx.y * sy.x;
  vec2 fall = abs(det) > 1e-12 ? vec2(sy.y * across.x - sx.y * across.y, sx.x * across.y - sy.x * across.x) / det : vec2(0.0);
  float self = clamp(0.62 - 0.6 * clamp(0.014 * dot(fall, sunStep), -0.6, 0.6), 0.0, 1.0);
  float tall = 1.0 - smoothstep(0.02, 0.2, r);
  vec3 colour = cloudLight(vWorld.xz, 0.74 + 0.1 * thick + 0.2 * self, 0.9 + 0.1 * tall, 0.5 * tall) * (0.74 + 0.34 * thick);
  // (By night the cyclone is a dim wheel, no brighter than the bone.)
  if (uDusk > 0.0) colour *= 1.0 - 0.45 * uEmber.x;
  // Where it is thin it is haze over the sea, and blue as haze is; only the bands are white.
  // (A thin veil of high cloud lies over all of it and is drawn off one side, away down the wind, in long fine threads.)
  float veil = 0.04 * pow(1.0 - smoothstep(0.02, 0.85, r), 1.5) + 0.1 * (1.0 - smoothstep(0.004, 0.05, r));
  float bands = 0.96 * min(1.5 * thick, 1.0);
  float alpha = bands + veil * (1.0 - bands);
  colour = mix(dot(colour, vec3(0.3, 0.55, 0.15)) * vec3(0.6, 0.74, 0.98), colour, bands / max(alpha, 1e-3));
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
  if (uDusk > 0.0) colour *= 1.0 - 0.45 * uEmber.x;
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
// One ribbon of the breath: where it lies across the trail and how wide, its own slow wander down the wind.
float ribbon(float across, float gone, float centre, float spread, float width, vec4 own, float sway) {
  float at = centre + spread * (own.x + 0.22 * sin(gone * own.y + own.z + sway));
  float x = (across - at) / width;
  return own.w * exp(-x * x);
}
void main() {
  vec2 d = vWorld.xz - uThroat;
  // along runs from the throat (0) down the wind (1) over 640 km; across is in units of 300 km.
  float along = dot(d, uWind) / 640.0;
  float across = dot(d, vec2(-uWind.y, uWind.x)) / 300.0;
  // The wind carries the curls: the ribbons wander through a bend that travels down the trail, wider the farther they have gone.
  float carried = uTime * 0.011;
  if (uLive > 0.0) carried += uWx * 0.03;
  vec2 flow = texture2D(uCloudTile, vec2(along * 0.05 - carried * 0.17, across * 0.02 + 0.3), 2.0).rg - 0.5;
  float gone = clamp(along, 0.0, 1.3);
  // (The approved pictures show the breath as a few long luminous ribbons that leave the neck together, part, and bend
  // as one toward the right of the wind: each is a smooth line of vapour, the photograph gives only the fibre along it.)
  float centre = 0.3 * gone * gone + 0.1 * sin(5.0 * gone + 0.8) * smoothstep(0.0, 0.3, gone) + 0.6 * flow.y * smoothstep(0.03, 0.6, gone);
  float spread = 0.015 + 0.3 * pow(gone, 0.8);
  float width = 0.006 + 0.024 * gone;
  float sway = 2.0 * flow.x;
  float ribbons = ribbon(across, gone, centre, spread, width, vec4(-0.95, 5.1, 0.4, 0.75), sway)
    + ribbon(across, gone, centre, spread, width * 1.5, vec4(-0.3, 3.7, 2.2, 1.0), sway)
    + ribbon(across, gone, centre, spread, width * 0.8, vec4(0.25, 6.3, 4.0, 0.6), sway)
    + ribbon(across, gone, centre, spread, width * 1.2, vec4(0.9, 4.4, 5.3, 0.85), sway)
    + ribbon(across, gone, centre, spread, width * 0.7, vec4(-0.62, 2.9, 1.1, 0.55), sway)
    + ribbon(across, gone, centre, spread, width * 0.9, vec4(0.58, 3.3, 3.1, 0.7), sway);
  float off = (across - centre) / (1.25 * spread + 0.03);
  float between = 0.05 * exp(-off * off);
  // The fibre along a ribbon: the photograph of trails read stretched down the wind, and a slow unevenness over it.
  float fibre = dot(texture2D(uPicture, vec2(0.3 + 0.55 * fract(along * 0.9 - carried * 0.5), 0.5 + 0.14 * off), 1.0).rgb, vec3(0.3, 0.55, 0.15));
  float uneven = texture2D(uCloudTile, vec2(along * 1.9 - carried + 0.1, across * 2.3 + 0.6), 1.0).b;
  // Puffs leave the throat one after another and thin as they go.
  float puff = 0.88 + 0.12 * sin(along * 26.0 - uTime * 0.5 + 3.0 * flow.x);
  if (uLive > 0.0) puff = 0.88 + 0.12 * sin(along * 26.0 - uTime * 0.5 - uLive * 1.6 + 3.0 * flow.x);
  float inside = smoothstep(0.0, 0.03, along) * (1.0 - smoothstep(0.45, 1.0, along));
  float thick = (ribbons * (0.62 + 0.4 * uneven + 0.4 * fibre) + between * (0.4 + 1.2 * uneven)) * inside * puff;
  vec3 colour = cloudLight(vWorld.xz, 0.7, 0.4 + 0.5 * min(thick, 1.0), 0.3);
  float alpha = clamp(thick * 0.72, 0.0, 0.85);
  // (And the vapour of the throat is seen to trail: a little denser while the frame is held.)
  if (uLive > 0.0) alpha = clamp(thick * (0.72 + 0.15 * smoothstep(0.0, 3.0, uLive)), 0.0, 0.85);
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
    // (The air stands in layers, each thinner than the one under it: the dense air is one crisp bright blue line a few kilometres
    // deep against the planet, the clear air above it a narrow deeper blue, and the last thin air is all but black.)
    float up = max(km, 0.0);
    vec3 glow = vec3(0.04, 0.3, 1.0) * 0.8 * exp(-up / 6.0) + vec3(0.03, 0.16, 0.8) * 0.16 * exp(-up / 18.0) + vec3(0.02, 0.06, 0.3) * 0.04 * exp(-up / 60.0);
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
  // Inside the edge the eye looks along the air, not down through it: how much air the ray crosses is one over the cosine of its
  // slant, and at the very edge, where the planet curves away under it, some thirty times the air straight down. The clear air
  // scatters blue all the way in; it is thick only toward the edge.
  float mu = sqrt(max(1.0 - d * d, 0.0));
  float path = 1.0 / sqrt(mu * mu + 0.0009);
  // (Where this sheet begins the air it adds is nothing: the ground and the cloud carry their own air up to there.)
  float beyond = max(path - 2.3, 0.0);
  float clearAir = 1.0 - exp(-0.08 * beyond);
  // (And the dense air seen edge on is the same crisp blue line as outside the edge, a few kilometres deep: never a pale band.)
  vec3 colour = km < 0.0 ? vec3(0.05, 0.17, 0.55) * 0.2 * clearAir + vec3(0.04, 0.3, 1.0) * 0.8 * exp(km / 6.0) : vec3(0.0);
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
  sheet('vapour', quad({ x: AT.throat.x + (wind.x * 330) / KM, y: AT.throat.y + (wind.y * 330) / KM }, 560 / KM, 560 / KM, 1.5, 0), VAPOUR_FRAGMENT, {
    uPicture: { value: data('mat/wisps.jpg', false) },
    uThroat: { value: throat },
    uWind: { value: wind },
  });
  // (The stratus is filled against the land's own widest relief, blue the height: the picture and its rectangle are the land's, read only.)
  sheet('cloud', new THREE.PlaneGeometry(90000, 90000).rotateX(-Math.PI / 2).translate(0, LOW_KM, 0), CLOUD_FRAGMENT, {
    uGround: { value: data('land/relief-a.png', false) },
    uGroundRect: { value: new THREE.Vector4(...GROUND_RECT) },
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
