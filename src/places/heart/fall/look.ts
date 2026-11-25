// The shaders of the fall's folder.
import { MOUTH } from '../layout';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { TUBE } from './path';

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

// The river inside the tube, for the light it throws on the walls and the roof.
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
  return mix(0.62, 0.03, smoothstep(2.0, 55.0, d));
}
uniform float uFlare;
vec3 riverLight(vec3 p, vec3 n) {
  float d = ${f(TUBE.lipZ)} - p.z;
  if (d < -20.0) return vec3(0.0);
  vec2 to = vec2(riverX(max(d, 0.0)) - p.x, ${f(TUBE.floor)} - p.y);
  float far = length(to);
  float w = 11.0;
  float form = w / sqrt(w * w + far * far);
  float facing = clamp(dot(n.xy, to / max(far, 0.01)) * 0.75 + 0.25, 0.0, 1.0);
  return blackbody(1390.0) * riverOpen(max(d, 0.0)) * uFlare * 3.14159 * form * facing * smoothstep(-20.0, 4.0, d);
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
${NOISE_GLSL}
${RIG_GLSL}
${WINDOW_FRAGMENT}
${TUBE_GLSL}
void main() {
  if (hiddenByWall(vWorld, vSkin.z)) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float inside = vSkin.z;
  // The cliff, mapped as the land maps it so the two do not show a join; inside, the same rock wrapped round the tube.
  vec2 wrap = vec2(dot(vWorld.xz, normalize(vec2(-n.z, n.x) + 1e-4)), vWorld.y);
  vec2 uvOut = wrap / 60.0 + 0.13 * vnoise(vWorld.xz / 90.0);
  vec2 uvIn = vec2(vSkin.y, vSkin.x) / 60.0;
  vec3 cliff = mix(texture2D(tCliff, uvOut).rgb, texture2D(tCliff, uvIn).rgb, inside);
  cliff *= 0.75 + 0.5 * vnoise(vec2(vWorld.y * 0.9 + 3.0 * vnoise(vWorld.xz / 25.0), 0.5));
  float deep = smoothstep(-3.0, 32.0, behindWindow(vWorld));
  float open = skyOpen(vWorld) * (1.0 - deep);
  vec3 e = skyIrradiance(n) * open + lakeIrradiance(vWorld, n) * (1.0 - deep) + emitterIrradiance(vWorld, n) * (1.0 - 0.75 * deep) + riverLight(vWorld, n);
  vec3 c = cliff * e / 3.14159;
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export const BED_VERTEX = /* glsl */ `
attribute vec4 aFlow;
attribute float aIn;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vFlow;
varying float vIn;
${WINDOW_VERTEX}
void main() {
  vWorld = position;
  vNormal = normal;
  vFlow = aFlow;
  vIn = aIn;
  gl_Position = throughWindow(position, aIn);
}`;

// Kelvin of the stream at a point, and how much of the point is stream. Shared by the surface and the glow map.
const STREAM_GLSL = /* glsl */ `
uniform vec4 uSurge;
// x: cover 0 to 1, y: kelvin.
vec2 stream(vec4 flow) {
  float len = flow.w;
  float half_ = flow.z * (0.86 + 0.28 * vnoise(vec2(len * 0.21, 3.0)));
  float u = flow.y / max(half_, 0.1);
  float cover = 1.0 - smoothstep(0.86, 1.0, u);
  float age = flow.x - uTime;
  float streak = vnoise(vec2(flow.y * 0.9, age * 2.6)) * 0.6 + vnoise(vec2(flow.y * 2.7 + 9.0, age * 6.5)) * 0.4;
  float raft = smoothstep(0.52, 0.7, vnoise(vec2(flow.y * 0.35 + 4.0, age * 0.9)));
  float inside = smoothstep(0.0, -110.0, len);
  float kelvin = mix(1180.0, 1440.0, smoothstep(1.0, 0.25, u)) - 110.0 * streak - 330.0 * raft * (0.45 + 0.55 * inside) - 240.0 * inside;
  // The surge: everything behind its front runs hotter and the front itself is the hottest thing in the frame.
  float behind = smoothstep(uSurge.x + 2.0, uSurge.x - 6.0, len) * uSurge.y;
  float front = exp(-abs(len - uSurge.x) / 5.0) * uSurge.y;
  kelvin = mix(kelvin, 1455.0, 0.7 * behind) + 60.0 * front;
  return vec2(cover, kelvin);
}`;

export const BED_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vFlow;
varying float vIn;
uniform sampler2D tCliff;
uniform sampler2D tTalus;
${NOISE_GLSL}
${RIG_GLSL}
${WINDOW_FRAGMENT}
${TUBE_GLSL}
${STREAM_GLSL}
void main() {
  if (hiddenByWall(vWorld, vIn)) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float steep = smoothstep(0.22, 0.55, 1.0 - n.y);
  vec2 wrap = vec2(dot(vWorld.xz, normalize(vec2(-n.z, n.x) + 1e-4)), vWorld.y);
  vec3 cliff = texture2D(tCliff, wrap / 60.0 + 0.13 * vnoise(vWorld.xz / 90.0)).rgb;
  vec3 talus = texture2D(tTalus, vWorld.xz / 23.0).rgb;
  vec3 rock = mix(talus, cliff, steep);
  // What the river built is younger and blacker than the wall.
  float near = smoothstep(26.0, 3.0, vFlow.y - vFlow.z);
  vec3 albedo = mix(rock, vec3(0.032, 0.03, 0.03) * (0.6 + 0.8 * vnoise(vWorld.xz * 0.8)), 0.85 * near);
  float deep = smoothstep(-3.0, 32.0, behindWindow(vWorld));
  float open = skyOpen(vWorld) * (1.0 - deep);
  vec3 e = skyIrradiance(n) * open + lakeIrradiance(vWorld, n) * (1.0 - deep) + emitterIrradiance(vWorld, n) * (1.0 - 0.75 * deep) + riverLight(vWorld, n);
  vec3 c = albedo * e / 3.14159;
  vec2 s = stream(vFlow);
  c = mix(c, blackbody(s.y), s.x);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export const GLOW_VERTEX = /* glsl */ `
attribute vec4 aFlow;
varying vec3 vWorld;
varying vec4 vFlow;
void main() {
  vWorld = position;
  vFlow = aFlow;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

// Only the foot of the fall lights the lake from the map: higher up the round lights do it.
export const GLOW_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec4 vFlow;
${NOISE_GLSL}
${RIG_GLSL}
${STREAM_GLSL}
void main() {
  vec2 s = stream(vFlow);
  float low = smoothstep(16.0, 5.0, vWorld.y);
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
varying float vIn;
${WINDOW_FRAGMENT}
void main() {
  if (hiddenByWall(vWorld, vIn)) discard;
  gl_FragColor = vec4(0.0);
}`;
