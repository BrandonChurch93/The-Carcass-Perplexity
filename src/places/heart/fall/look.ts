// The shaders of the fall's folder.
import { MOUTH } from '../layout';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { FAN_FROM, TUBE } from './path';

const f = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);

// The land is a height field and cannot hold a cave, and its alcove is a slot about 45 m deep with a back wall. The tube is drawn through
// a window instead: what lies behind the window plane keeps its place on screen but is brought forward in depth, so it wins over the
// land's slot, and it is thrown away where the line of sight does not pass through the arch. In front of the window nothing changes.
const WINDOW_VERTEX = /* glsl */ `
uniform vec4 uWindow;
vec4 throughWindow(vec3 world, float inside) {
  vec4 clip = projectionMatrix * viewMatrix * vec4(world, 1.0);
  float side = dot(uWindow.xyz, world) + uWindow.w;
  float cam = dot(uWindow.xyz, cameraPosition) + uWindow.w;
  if (inside > 0.0 && side < 0.0 && cam > 0.0) {
    float at = clip.w * cam / (cam - side);
    float d = mix(clip.w, at + 22.0 * (1.0 - exp(-(clip.w - at) / 60.0)), inside);
    clip.z = (projectionMatrix[2][2] * -d + projectionMatrix[3][2]) / d * clip.w;
  }
  return clip;
}`;

const WINDOW_FRAGMENT = /* glsl */ `
uniform vec4 uWindow;
uniform vec4 uArch;
// Metres behind the window, positive inside the tube.
float behindWindow(vec3 world) {
  return -(dot(uWindow.xyz, world) + uWindow.w);
}
bool hiddenByWall(vec3 world, float inside) {
  float side = dot(uWindow.xyz, world) + uWindow.w;
  float cam = dot(uWindow.xyz, cameraPosition) + uWindow.w;
  if (inside < 0.5 || side >= 0.0 || cam <= 0.0) return false;
  vec3 hit = mix(cameraPosition, world, cam / (cam - side));
  vec2 q = vec2(abs(hit.x - uArch.x) / (uArch.z * 1.22), (hit.y - uArch.y) / (uArch.w * 1.22));
  if (q.y < -0.3) return true;
  return pow(q.x, ${f(TUBE.power)}) + pow(max(q.y, 0.0), ${f(TUBE.power)}) > 1.0;
}`;

// The river inside the tube, for the light it throws on the walls and the roof, and the light common to all the rock of this folder.
const TUBE_GLSL = /* glsl */ `
float tubeAxis(float d) {
  float k = smoothstep(25.0, 200.0, d);
  return ${f(MOUTH.x)} - 58.0 * k * k;
}
float riverX(float d) {
  return tubeAxis(d) - 16.0 + 6.0 * sin(d * 0.045 + 1.0);
}
// How much of the river is open lava at depth d: it comes out from under a crust.
float riverOpen(float d) {
  return mix(0.5, 0.012, smoothstep(0.0, 60.0, d));
}
uniform float uFlare;
// d is metres into the tube from its rim, negative outside.
vec3 riverLight(vec3 p, vec3 n, float d) {
  if (d < -14.0) return vec3(0.0);
  vec2 to = vec2(riverX(max(d, 0.0)) - p.x, ${f(TUBE.floor)} - p.y);
  float far = length(to);
  float w = 11.0;
  float form = w / sqrt(w * w + far * far);
  float facing = clamp(dot(n.xy, to / max(far, 0.01)) * 0.8 + 0.2, 0.0, 1.0);
  return blackbody(1390.0) * riverOpen(max(d, 0.0)) * uFlare * 3.14159 * form * facing * smoothstep(-14.0, 3.0, d);
}
// The rig's shading, with the day and the lake shut out as the tube goes in.
vec3 rockShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float occ, vec3 more, float d) {
  float deep = smoothstep(2.0, 34.0, d);
  float lit = (1.0 - deep) * (1.0 - deep);
  float open = skyOpen(p) * occ * lit;
  vec3 e = skyIrradiance(n) * open + (lakeIrradiance(p, n) + emitterIrradiance(p, n)) * occ * lit + riverLight(p, n, d) * occ + more * occ;
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float fr = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * 0.28;
  return c + fr * skyIrradiance(n) / 3.14159 * open;
}
uniform sampler2D tBoulderNh;
uniform sampler2D tTalus;
// A picture laid on from the three axes of the world.
vec3 threeWay(sampler2D map, vec3 p, vec3 n) {
  vec3 w = pow(abs(n), vec3(4.0));
  w /= w.x + w.y + w.z;
  return w.x * texture2D(map, p.zy).rgb + w.y * texture2D(map, p.xz).rgb + w.z * texture2D(map, p.xy).rgb;
}
// What the big pictures cannot hold at this distance: the small relief of the rock, laid on from the three axes of the world so that it
// neither swims nor stretches on a face of any slope. It bends the normal and returns the shade of its pits and knobs.
float fineRock(vec3 p, float amount, inout vec3 n) {
  if (amount < 0.01) return 1.0;
  vec3 w = pow(abs(n), vec3(4.0));
  w /= w.x + w.y + w.z;
  vec4 a = texture2D(tBoulderNh, p.zy / 3.3);
  vec4 b = texture2D(tBoulderNh, p.xz / 3.3);
  vec4 c = texture2D(tBoulderNh, p.xy / 3.3);
  vec4 a2 = texture2D(tBoulderNh, p.zy / 0.71 + 0.37);
  vec4 b2 = texture2D(tBoulderNh, p.xz / 0.71 + 0.37);
  vec4 c2 = texture2D(tBoulderNh, p.xy / 0.71 + 0.37);
  vec2 sa = a.rg - 0.5 + 0.6 * (a2.rg - 0.5);
  vec2 sb = b.rg - 0.5 + 0.6 * (b2.rg - 0.5);
  vec2 sc = c.rg - 0.5 + 0.6 * (c2.rg - 0.5);
  vec3 bend = w.x * vec3(0.0, sa.y, sa.x) + w.y * vec3(sb.x, 0.0, sb.y) + w.z * vec3(sc.x, sc.y, 0.0);
  n = normalize(n - bend * 1.7 * amount);
  float h = dot(w, vec3(a.b, b.b, c.b)) * (0.55 + 0.9 * dot(w, vec3(a2.b, b2.b, c2.b)));
  return mix(1.0, 0.45 + 1.3 * h, amount);
}`;

export const ROCK_VERTEX = /* glsl */ `
attribute vec3 aSkin;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vSkin;
${WINDOW_VERTEX}
void main() {
  vWorld = position;
  vNormal = normal;
  vSkin = aSkin;
  gl_Position = throughWindow(position, aSkin.z);
}`;

export const ROCK_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vSkin;
uniform sampler2D tCliff;
uniform sampler2D tCliffNh;
${NOISE_GLSL}
${RIG_GLSL}
${WINDOW_FRAGMENT}
${TUBE_GLSL}
void main() {
  if (hiddenByWall(vWorld, vSkin.z)) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float inside = vSkin.z;
  // The cliff, mapped as the land maps it so the two do not show a join. On the rim and in the tube that mapping has no direction
  // (the roof, the bevel), and the skin is used: metres round the arch and along it, so the linings run with the flow.
  vec3 t = normalize(vec3(-n.z, 0.0, n.x) + 1e-4);
  vec2 wrap = vec2(dot(vWorld.xz, t.xz), vWorld.y);
  float own = step(0.5, vSkin.x) * smoothstep(36.0, 18.0, vSkin.y);
  vec2 skin = vec2(vSkin.y * 0.6, vSkin.x);
  vec3 cliff = vec3(0.0);
  if (own < 1.0) cliff += (1.0 - own) * texture2D(tCliff, wrap / 60.0 + 0.13 * vnoise(vWorld.xz / 90.0)).rgb;
  if (own > 0.0) {
    cliff += own * texture2D(tCliff, skin / 47.0).rgb;
    vec2 slope = texture2D(tCliffNh, skin / 47.0).rg - 0.5;
    vec3 along = normalize(cross(n, vec3(0.0, 0.0, 1.0)) + 1e-4);
    n = normalize(n - (cross(along, n) * slope.x + along * slope.y) * 0.8 * own);
  }
  cliff *= 0.75 + 0.5 * vnoise(vec2(vWorld.y * 0.9 + 3.0 * vnoise(vWorld.xz / 25.0), 0.5));
  cliff *= fineRock(vWorld, own, n);
  // Soot and glaze inside: the lining of a tube is darker than the wall it runs through.
  cliff *= mix(1.0, 0.5, smoothstep(0.0, 30.0, -vSkin.y) * inside);
  vec3 c = rockShade(vWorld, n, v, cliff, 1.0, vec3(0.0), -vSkin.y);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export const BED_VERTEX = /* glsl */ `
attribute vec4 aFlow;
attribute vec4 aBank;
attribute vec3 aIn;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vFlow;
varying vec4 vBank;
varying vec3 vIn;
${WINDOW_VERTEX}
void main() {
  vWorld = position;
  vNormal = normal;
  vFlow = aFlow;
  vBank = aBank;
  vIn = aIn;
  gl_Position = throughWindow(position, aIn.x);
}`;

// Kelvin of the stream at a point, and how much of the point is stream. Shared by the surface and the glow map.
// Everything on the surface is drawn in the stream's own coordinates: metres across it and the second at which that lava left the lip,
// so a mark keeps its place in the lava, rides down at the speed of the flow and is drawn out where the flow quickens.
const STREAM_GLSL = /* glsl */ `
uniform vec4 uSurge;
// x: cover 0 to 1, y: kelvin.
// away: x metres from the middle of the stream, y how much of an island of rock stands here.
vec2 stream(vec4 flow, float speed, vec2 away) {
  float len = flow.w;
  float s = flow.y;
  float age = flow.x - uTime;
  float behind = smoothstep(uSurge.x + 3.0, uSurge.x - 8.0, len) * uSurge.y;
  float front = exp(-max(uSurge.x - len, 0.0) / 7.0) * smoothstep(uSurge.x + 1.5, uSurge.x, len) * uSurge.y;
  float ragged = 0.84 + 0.3 * vnoise(vec2(len * 0.23, s > 0.0 ? 3.0 : 11.0));
  float half_ = flow.z * ragged * (1.0 + 0.22 * behind + 0.45 * front);
  float cover = (1.0 - smoothstep(0.9, 1.0, away.x / max(half_, 0.1))) * (1.0 - smoothstep(0.3, 0.5, away.y));
  if (cover <= 0.0) return vec2(0.0, 600.0);
  float u = abs(s) / max(half_, 0.1);
  float fast = smoothstep(5.5, 11.0, speed);
  float fan = smoothstep(${f(FAN_FROM)}, ${f(FAN_FROM + 18)}, len);
  float streak = 0.5 * vnoise(vec2(s * 0.7, age * 1.1)) + 0.3 * vnoise(vec2(s * 2.3 + 7.0, age * 2.7)) + 0.2 * vnoise(vec2(s * 6.5 + 3.0, age * 6.0));
  float wave = sin(len * 2.3 + 2.5 * vnoise(vec2(s * 0.6, len * 0.4)) + 0.7 * sin(uTime * 6.0 + s * 1.7));
  // A thin skin over most of it, orange; open lava down the middle and wherever a cascade tears the skin; red at the margins.
  // Open lava only in threads, most of them down the middle and where a cascade pulls the skin apart. Rock in the stream chills what passes it.
  float thread = smoothstep(0.1, 0.0, abs(vnoise(vec2(s * 0.85 + 11.0, age * 0.45)) - 0.5)) + 0.6 * smoothstep(0.07, 0.0, abs(vnoise(vec2(s * 2.1 + 5.0, age * 1.3)) - 0.5));
  float kelvin = mix(1090.0, 1250.0, 1.0 - smoothstep(0.3, 1.0, u)) - 170.0 * (streak - 0.45) + fast * (95.0 + 40.0 * wave);
  kelvin = mix(kelvin, 1440.0, clamp(thread * (0.35 + 0.65 * fast + 0.5 * (1.0 - smoothstep(0.0, 0.5, u))), 0.0, 1.0) * (0.25 + 0.75 * streak));
  kelvin -= 150.0 * smoothstep(0.0, 0.3, away.y);
  kelvin = min(kelvin, 1450.0);
  // Rafts of skin: they gather on the benches and along the margins, and the cascades tear them.
  float plate = 0.65 * vnoise(vec2(s * 0.33 + 5.0, age * 0.55)) + 0.35 * vnoise(vec2(s * 0.9, age * 1.4 + 2.0));
  float want = mix(0.45, 0.8, fast) - 0.2 * smoothstep(0.45, 0.95, u) + 0.25 * behind - 0.12 * smoothstep(0.0, -90.0, len);
  float raft = smoothstep(want, want + 0.07, plate);
  float tear = smoothstep(0.05, 0.0, abs(vnoise(vec2(s * 1.6 + 2.0, age * 2.6)) - 0.5));
  float skin = mix(830.0, 1090.0, pow(vnoise(vec2(s * 1.2 + 4.0, age * 3.0)), 2.0));
  kelvin = mix(kelvin, mix(skin, 1290.0, tear), raft);
  // Where the slope gives out the stream spreads into a fan and skins over; it goes on under the skin and in a few open lanes.
  float lane = abs(vnoise(vec2(s * 0.17 + 1.6 * vnoise(vec2(len * 0.07, 2.0)), len * 0.03 + 9.0)) - 0.5);
  float open = smoothstep(0.16, 0.09, lane);
  float crack = smoothstep(0.045, 0.0, abs(vnoise(vec2(s * 0.55 + 1.0, len * 0.5 + age * 0.12)) - 0.5)) * (0.4 + 0.6 * vnoise(vec2(s * 0.2, len * 0.2 + 5.0)));
  float crack2 = smoothstep(0.035, 0.0, abs(vnoise(vec2(s * 1.7 + 6.0, len * 1.5 + age * 0.12)) - 0.5));
  float crust = mix(mix(700.0, 930.0, vnoise(vec2(s * 0.8, len * 0.8))), 1260.0, max(crack, 0.7 * crack2));
  // In the fan the open lanes are what is left of the stream, and they are as hot as it was.
  kelvin = mix(kelvin, 1330.0 - 170.0 * streak + 110.0 * thread, fan);
  kelvin = mix(kelvin, crust, fan * (1.0 - open) * (1.0 - 0.6 * behind));
  // The surge: everything behind its front runs hotter and the front itself is the hottest thing in the frame.
  kelvin = mix(kelvin, 1462.0, 0.7 * behind * (1.0 - 0.5 * raft)) + 70.0 * front;
  return vec2(cover, kelvin);
}`;

export const BED_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vFlow;
varying vec4 vBank;
varying vec3 vIn;
uniform sampler2D tCliff;
uniform sampler2D tCrust;
uniform sampler2D tCrustNh;
${NOISE_GLSL}
${RIG_GLSL}
${WINDOW_FRAGMENT}
${TUBE_GLSL}
${STREAM_GLSL}
void main() {
  if (hiddenByWall(vWorld, vIn.x)) discard;
  vec2 lava = stream(vFlow, vBank.w, vIn.yz);
  vec3 c = blackbody(lava.y);
  if (lava.x < 1.0) {
    vec3 v = normalize(cameraPosition - vWorld);
    vec3 n = normalize(vNormal);
    float steep = smoothstep(0.22, 0.55, 1.0 - n.y);
    vec3 t = normalize(vec3(-n.z, 0.0, n.x) + 1e-4);
    vec2 wrap = vec2(dot(vWorld.xz, t.xz), vWorld.y);
    vec3 cliff = texture2D(tCliff, wrap / 60.0 + 0.13 * vnoise(vWorld.xz / 90.0)).rgb;
    cliff *= 0.75 + 0.5 * vnoise(vec2(vWorld.y * 0.9 + 3.0 * vnoise(vWorld.xz / 25.0), 0.5));
    vec3 talus = texture2D(tTalus, vWorld.xz / 23.0).rgb;
    vec3 rock = mix(talus, cliff, steep);
    // What the river built is younger and blacker than the wall: welded spatter and levees close in, a dusting of it further out.
    float side = mix(vIn.y - vFlow.z, 0.3, smoothstep(0.3, 0.5, vIn.z));
    float young = smoothstep(22.0, 2.0, side) * (0.7 + 0.3 * vnoise(vWorld.xz * 0.35));
    vec3 fresh = threeWay(tTalus, vWorld / 9.0, n) * 0.42;
    vec3 albedo = mix(rock, fresh, 0.9 * young);
    float own = max(smoothstep(30.0, 14.0, side), vIn.x);
    albedo *= fineRock(vWorld, own, n);
    // The stream's own light on its banks: it is a long bright strip, and what faces it glows.
    vec3 to = vec3(vBank.x * max(side, 0.0), vBank.z - vWorld.y + 0.4, vBank.y * max(side, 0.0));
    float far = length(to);
    float form = vFlow.z / sqrt(vFlow.z * vFlow.z + far * far);
    float behind = smoothstep(uSurge.x + 3.0, uSurge.x - 8.0, vFlow.w) * uSurge.y;
    float fan = smoothstep(${f(FAN_FROM)}, ${f(FAN_FROM + 18)}, vFlow.w);
    float seen = smoothstep(2.5, 0.0, to.y);
    vec3 strip = blackbody(1400.0) * 3.14159 * (0.3 + 0.4 * behind) * (1.0 - 0.75 * fan) * form * form * form * seen * clamp(dot(n, to / far), 0.0, 1.0) * (1.0 - vIn.x);
    vec3 r = rockShade(vWorld, n, v, albedo, 1.0, strip, ${f(TUBE.lipZ)} - vWorld.z);
    // The rock the lava touches is itself hot for a hand's breadth.
    r += blackbody(max(1090.0 - 420.0 * max(side, 0.0), 500.0)) * smoothstep(1.0, 0.0, side) * (0.5 + 0.5 * vnoise(vWorld.xz * 2.3));
    c = mix(r, c, lava.x);
  }
  // Skin that has gone dark is a surface again: it takes the light of what still glows round it.
  float cool = lava.x * smoothstep(1080.0, 900.0, lava.y);
  if (cool > 0.0) {
    vec3 n = normalize(vNormal);
    vec2 uv = vec2(vFlow.y, vFlow.w - 5.5 * (uTime - vFlow.x) * (1.0 - smoothstep(${f(FAN_FROM)}, ${f(FAN_FROM + 18)}, vFlow.w))) / 5.0;
    vec3 skin = texture2D(tCrust, uv).rgb;
    vec2 slope = texture2D(tCrustNh, uv).rg - 0.5;
    n = normalize(n + vec3(slope.x, 0.0, slope.y) * 1.8);
    vec3 glow = blackbody(1300.0) * 3.14159 * 0.16 * (0.5 + 0.5 * n.y);
    c += cool * rockShade(vWorld, n, normalize(cameraPosition - vWorld), skin * 0.8, 1.0, glow, ${f(TUBE.lipZ)} - vWorld.z);
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export const GLOW_VERTEX = /* glsl */ `
attribute vec4 aFlow;
attribute vec4 aBank;
varying vec3 vWorld;
varying vec4 vFlow;
attribute vec3 aIn;
varying vec3 vSpeed;
void main() {
  vWorld = position;
  vFlow = aFlow;
  vSpeed = vec3(aBank.w, aIn.yz);
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

// Only the foot of the fall lights the lake from the map: higher up the round lights do it.
export const GLOW_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec4 vFlow;
varying vec3 vSpeed;
${NOISE_GLSL}
${RIG_GLSL}
${STREAM_GLSL}
void main() {
  float low = smoothstep(16.0, 5.0, vWorld.y);
  if (low <= 0.0) discard;
  vec2 s = stream(vFlow, vSpeed.x, vSpeed.yz);
  gl_FragColor = vec4(blackbody(s.y) * s.x * low, 1.0);
}`;

export const GOB_VERTEX = /* glsl */ `
attribute vec4 aSeed;
varying float vHeat;
varying vec3 vNormal;
void main() {
  vHeat = aSeed.x;
  vNormal = normalize(mat3(instanceMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * instanceMatrix * vec4(position, 1.0);
}`;

export const GOB_FRAGMENT = /* glsl */ `
precision highp float;
varying float vHeat;
varying vec3 vNormal;
${RIG_GLSL}
void main() {
  gl_FragColor = vec4(rigOut(blackbody(vHeat)), 1.0);
}`;

// The discards alone, for the engine's depth pass.
export const ROCK_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vSkin;
${WINDOW_FRAGMENT}
void main() {
  if (hiddenByWall(vWorld, vSkin.z)) discard;
  gl_FragColor = vec4(0.0);
}`;

export const BED_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vIn;
${WINDOW_FRAGMENT}
void main() {
  if (hiddenByWall(vWorld, vIn.x)) discard;
  gl_FragColor = vec4(0.0);
}`;
