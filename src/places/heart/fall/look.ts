// The shaders of the fall's folder.
import { WALL_ROCK_GLSL } from '../land/rock';
import { MOUTH } from '../layout';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { FAN_FROM, FAN_HEAD, FAN_POOL, TUBE } from './path';
import { COLLAR } from './shape';

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

// The collar ends in a broken edge, the land's own wall showing between its last pieces, so no line is drawn where the two meet.
const TORN_GLSL = /* glsl */ `
bool torn(vec3 world, vec3 skin) {
  if (skin.z > 0.5 || skin.y < 0.0) return false;
  return ${f(COLLAR)} - skin.y < 1.2 + 5.5 * (0.6 * vnoise(world.xy / 9.0 + world.z / 13.0) + 0.4 * vnoise(world.xy / 2.3 + world.z / 3.1));
}`;

const PLATES_GLSL = /* glsl */ `
// Cells: plates of skin on the stream in its own coordinates, slabs of crust on the shelf, blocks of rock on the rim. x: 0 on a seam between two plates, rising to the plate's middle; y: the plate's own number.
vec2 plates(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  float id = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 r = g + hash22(i + g) - f;
      float d = dot(r, r);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = hash12(i + g + 7.7);
      } else if (d < d2) {
        d2 = d;
      }
    }
  }
  return vec2(sqrt(d2) - sqrt(d1), id);
}`;

// The river inside the tube, for the light it throws on the walls and the roof, and the light common to all the rock of this folder.
const TUBE_GLSL = /* glsl */ `
${PLATES_GLSL}
// Albedo of the rock the river built, against the talus picture's 0.085: fresh basalt is 0.05 to 0.08.
const float APRON_TONE = 0.48;
// Albedo of the cliff picture on the rim, the face and the tube, set by measure under the frozen light.
const float WALL_TONE = 0.6;
// How much brighter than its plain geometry the melt lights the rim: the fume in the mouth glows and lights it too.
const float RIM_LIGHT = 12.0;
uniform float uFlare;
float tubeAxis(float d) {
  float k = smoothstep(25.0, 200.0, d);
  return ${f(MOUTH.x)} - 58.0 * k * k;
}
float riverX(float d) {
  return tubeAxis(d) - 16.0 + 6.0 * sin(d * 0.045 + 1.0);
}
// How much of the river is open lava at depth d: it comes out from under a crust.
float riverOpen(float d) {
  return 0.006 + 0.85 * (0.7 * exp(-d / 2.2) + 0.3 * exp(-d / 9.0)) * mix(uFlare, 1.0, smoothstep(1.0, 9.0, d));
}
// Light of a level pool of melt of radius r at c, on a face at p.
float poolLight(vec3 p, vec3 n, vec3 c, float r) {
  vec3 to = c - p;
  float d2 = dot(to, to);
  float inv = inversesqrt(d2);
  float facing = clamp(dot(n, to) * inv * 0.9 + 0.1, 0.0, 1.0);
  // A pool shines most straight up.
  float lift = clamp(-to.y * inv, 0.0, 1.0);
  return r * r / (d2 + r * r) * facing * (0.25 + 0.75 * lift);
}
// The light of the melt on the floor of the mouth, on the rock inside the rim. d is metres into the tube from its rim, negative outside.
// Three pools stand for it: the open pool at the lip where the river leaves, the crusted shelf east of it, and the river further in.
vec3 riverLight(vec3 p, vec3 n, float d) {
  // The rim's own edge stands between the melt and the outer face.
  if (d < 0.0) return vec3(0.0);
  // Soot and the roof's own steps stand in the way: the lip's pool lights the bevel of the rim and little beyond it.
  float shade = mix(1.0, 0.22, smoothstep(14.0, 40.0, d)) * exp(-d / 80.0);
  // The pool lies under the west half of the arch. The east side and the feet of the arch stand behind the heaps on the floor and get little of it,
  // and the brow, the first metres of the cut, looks out and not down: it stays the dark of the wall.
  float reach = mix(1.0, 0.04, smoothstep(${f(MOUTH.x - 24)}, ${f(MOUTH.x + 46)}, p.x)) * smoothstep(${f(TUBE.floor + 3)}, ${f(TUBE.floor + 16)}, p.y) * smoothstep(1.5, 6.5, d);
  float e = poolLight(p, n, vec3(${f(MOUTH.x - 34)}, ${f(TUBE.floor)}, ${f(TUBE.lipZ - 9)}), 13.0) * uFlare * shade * reach;
  e += 0.014 * poolLight(p, n, vec3(${f(MOUTH.x + 22)}, ${f(TUBE.floor)}, ${f(TUBE.lipZ - 12)}), 24.0) * shade * smoothstep(1.5, 6.5, d);
  // The river further in shows the ribs of the roof that face it, dull red.
  e += 0.11 * poolLight(p, n, vec3(riverX(40.0), ${f(TUBE.floor)}, ${f(TUBE.lipZ - 40)}), 13.0) * exp(-abs(d - 40.0) / 30.0);
  return blackbody(1390.0) * 3.14159 * RIM_LIGHT * e;
}
// The rig's shading, with the day and the lake shut out as the tube goes in.
vec3 rockShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float occ, vec3 more, float d) {
  // The cut of the rim looks in and down: a few metres in, the day no longer reaches it.
  float deep = smoothstep(0.5, 13.0, d);
  float lit = (1.0 - deep) * (1.0 - deep);
  float open = skyOpen(p) * occ * lit;
  // Nothing is read that would be multiplied by nothing: past the bevel the round lights are shut out, and far in the lake is too.
  vec3 lake = lit < 0.01 ? vec3(0.0) : (p.y > 30.0 ? lakeIrradianceFar(p, n) : lakeIrradiance(p, n));
  // On the cut of the rim the east side stands behind the heaps on the floor, as it does for the pool's own light.
  if (d < 7.0) lake += emitterIrradiance(p, n) * smoothstep(7.0, 0.0, d) * mix(1.0, mix(1.0, 0.12, smoothstep(${f(MOUTH.x - 10)}, ${f(MOUTH.x + 50)}, p.x)), smoothstep(0.0, 1.5, d));
  vec3 e = skyIrradiance(n) * open + lake * occ * lit + riverLight(p, n, d) * occ + more * occ;
  // Rock is grey: what warmth it shows is the light's.
  albedo = mix(albedo, vec3(dot(albedo, vec3(0.2126, 0.7152, 0.0722))), 0.6);
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float fr = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * 0.1;
  return c + fr * skyIrradiance(n) / 3.14159 * open;
}
uniform sampler2D tBoulderNh;
uniform sampler2D tTalus;
// The slopes of the place across the pixel, taken first thing in main. Every picture is read with them, and not with the slope the
// renderer would take of the coordinate where it is read: inside a branch, or beside a pixel that took another branch or was thrown
// away, that slope is not defined, and the software renderer gives a different value on every render.
vec3 gDx;
vec3 gDy;
// 0: laid from above, 1: on a face that looks along x, 2: on a face that looks along z.
vec2 lie(vec3 q, int axis) {
  return axis == 0 ? q.xz : (axis == 1 ? q.zy : q.xy);
}
int lieOf(vec3 n) {
  return abs(n.y) > 0.62 ? 0 : (abs(n.x) > abs(n.z) ? 1 : 2);
}
vec4 laid(sampler2D map, vec3 p, int axis, float scale, float shift) {
  return textureGrad(map, lie(p, axis) / scale + shift, lie(gDx, axis) / scale, lie(gDy, axis) / scale);
}
// What the big pictures cannot hold at this distance: the small relief of the rock, laid on from the three axes of the world so that it
// neither swims nor stretches on a face of any slope. It bends the normal and returns the shade of its pits and knobs.
float fineRock(vec3 p, float amount, inout vec3 n) {
  if (amount < 0.01) return 1.0;
  // One reading of each scale, from the axis the face looks along most: at this size a seam between two of them does not show.
  vec3 w = abs(n);
  int axis = w.y >= w.x && w.y >= w.z ? 0 : (w.x > w.z ? 1 : 2);
  vec4 a = laid(tBoulderNh, p, axis, 3.3, 0.0);
  vec4 a2 = laid(tBoulderNh, p, axis, 0.71, 0.37);
  vec2 sa = a.rg - 0.5 + 0.6 * (a2.rg - 0.5);
  vec3 bend = axis == 0 ? vec3(sa.x, 0.0, sa.y) : (axis == 1 ? vec3(0.0, sa.y, sa.x) : vec3(sa.x, sa.y, 0.0));
  n = normalize(n - bend * 1.7 * amount);
  float h = a.b * (0.55 + 0.9 * a2.b);
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
${WALL_ROCK_GLSL}
${TORN_GLSL}
void main() {
  gDx = dFdx(vWorld);
  gDy = dFdy(vWorld);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float inside = vSkin.z;
  // The land's rock, read before anything branches. On the collar it is all there is: the same rock under the same light as the wall.
  vec3 wn;
  float wocc;
  vec3 wall = wallRockAt(vWorld, n, gDx, gDy, wn, wocc);
  // The lip itself is the wall's rock too: the fall's own rock begins where the cut turns in.
  float collar = smoothstep(-1.2, 0.2, vSkin.y);
  float d = -vSkin.y;
  vec3 c = vec3(0.0);
  bool ragged = torn(vWorld, vSkin);
  // Far inside no light reaches and there is no rock to draw; between, only the melt's light on plain dark rock.
  if (inside > 0.5 && d > 26.0) {
    if (d < 110.0) c = vec3(0.06) * (0.25 + 0.8 * vnoise(vWorld.xy / 3.0 + vWorld.z / 4.0) + 0.7 * vnoise(vWorld.xy / 10.0 + vWorld.z / 8.0)) * riverLight(vWorld, n, d) / 3.14159;
  } else if (!ragged) {
    // The rim and the tube have no upright direction (the roof, the bevel): the picture is laid on from the axis the face looks along.
    vec3 cliff = laid(tCliff, vWorld, lieOf(n), 47.0, 0.0).rgb;
    cliff *= fineRock(vWorld, 1.0, n);
    // Soot and glaze inside: the lining of a tube is darker than the wall it runs through.
    cliff *= mix(1.0, 0.5, smoothstep(0.0, 30.0, -vSkin.y) * inside);
    // The cut rock of the bevel and the roof is broken in blocks: each takes the light at its own angle and the joints between them are black.
    if (vSkin.y < 2.0) {
      // The cut rock of the bevel and the roof is folded along the tube, as the melt that once filled it left it: ridges that go back into
      // the dark, grooves between them that the light from below does not reach, and a break across them here and there.
      float broken = smoothstep(2.0, -3.0, vSkin.y);
      float along = vSkin.x / 3.4 + 0.9 * vnoise(vec2(vSkin.y / 11.0, vSkin.x / 17.0));
      float fold = vnoise(vec2(along, vSkin.y / 26.0)) + 0.35 * vnoise(vec2(along * 3.1 + 5.0, vSkin.y / 9.0));
      float next = vnoise(vec2(along + 0.25, vSkin.y / 26.0)) + 0.35 * vnoise(vec2(along * 3.1 + 5.775, vSkin.y / 9.0));
      float cross_ = smoothstep(0.07, 0.0, abs(vnoise(vec2(vSkin.x / 9.0 + 2.0, vSkin.y / 6.5 + 0.8 * vnoise(vec2(vSkin.x / 4.0, 1.0)))) - 0.5));
      vec3 round_ = normalize(cross(n, vec3(0.0, 0.0, 1.0)) + 1e-4);
      // And it is broken in big pieces that each lie their own way: one takes the light, the next is in its shade.
      vec2 q = vec2(vSkin.x / 6.5, vSkin.y / 5.0);
      float lump = vnoise(q);
      vec2 lean = vec2(vnoise(q + vec2(0.35, 0.0)), vnoise(q + vec2(0.0, 0.35))) - lump;
      n = normalize(n + broken * (round_ * ((next - fold) * 4.5 + lean.x * 3.2) + vec3(0.0, 0.0, 1.0) * lean.y * 3.2));
      cliff *= 1.0 - broken * (0.6 * smoothstep(0.62, 0.36, fold) + 0.5 * cross_);
      cliff *= mix(1.0, 0.3 + 1.1 * smoothstep(0.2, 0.75, lump), broken);
    }
    vec3 more = vec3(0.0);
    c = rockShade(vWorld, n, v, cliff, 1.0, more, d);
    if (collar > 0.0) c = mix(c, rigShade(vWorld, wn, v, wall, 0.92, wocc), collar);
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
  // Last, so that no texture is read beside a pixel already thrown away.
  if (ragged || hiddenByWall(vWorld, vSkin.z)) discard;
}`;

export const BED_VERTEX = /* glsl */ `
attribute vec4 aFlow;
attribute vec4 aBank;
attribute vec3 aIn;
attribute float aApron;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vFlow;
varying vec4 vBank;
varying vec3 vIn;
varying float vApron;
uniform vec4 uSurge;
${WINDOW_VERTEX}
void main() {
  // The surge has height: behind its front the stream stands fuller in its bed, and the front itself is a rounded head a man's height proud of it.
  float full = smoothstep(uSurge.x + 4.0, uSurge.x - 8.0, aFlow.w) * uSurge.y;
  float head = max(exp(-max(uSurge.x - aFlow.w, 0.0) / 7.0) * smoothstep(uSurge.x + 3.0, uSurge.x, aFlow.w) * uSurge.y, uSurge.z * smoothstep(7.0, -5.0, aFlow.w));
  float across = aIn.y / max(aFlow.z * (1.0 + 0.4 * full + 0.9 * head), 0.1);
  vec3 p = position;
  p.y += (0.45 * full + 1.5 * head) * sqrt(max(1.0 - across * across, 0.0)) * (1.0 - smoothstep(${f(FAN_FROM)}, ${f(FAN_FROM + 12)}, aFlow.w)) * (1.0 - aIn.z);
  vWorld = p;
  vNormal = normal;
  vFlow = aFlow;
  vBank = aBank;
  vIn = aIn;
  vApron = aApron;
  gl_Position = throughWindow(p, aIn.x);
}`;

// Kelvin of the stream at a point, and how much of the point is stream. Shared by the surface and the glow map.
// Everything on the surface is drawn in the stream's own coordinates: metres across it and the second at which that lava left the lip,
// so a mark keeps its place in the lava, rides down at the speed of the flow and is drawn out where the flow quickens.
const STREAM_GLSL = /* glsl */ `
uniform vec4 uSurge;
// x: streaks drawn out down the flow, y: threads of open lava. s is metres across, age the second the lava left the lip.
vec2 marks(float s, float age) {
  float streak = 0.5 * vnoise(vec2(s * 0.7, age * 1.1)) + 0.3 * vnoise(vec2(s * 2.3 + 7.0, age * 2.7)) + 0.2 * vnoise(vec2(s * 6.5 + 3.0, age * 6.0));
  float thread = smoothstep(0.06, 0.0, abs(vnoise(vec2(s * 0.85 + 11.0, age * 0.45)) - 0.5)) + 0.6 * smoothstep(0.045, 0.0, abs(vnoise(vec2(s * 2.1 + 5.0, age * 1.3)) - 0.5));
  return vec2(streak, thread);
}
// A channel across the fan: one to a cell of the fan's lay, of its own width in metres, wandering as it goes out.
// fs is metres round the fan at 45 m from its head, fl metres out, r metres from the head.
float channel(float fs, float fl, float r, float spacing, float seed, float width) {
  float x = fs / spacing + 1.2 * vnoise(vec2(fl * 0.1, seed)) + seed;
  float i = floor(x);
  float h = fract(sin(i * 127.1 + seed * 311.7) * 43758.5453);
  float pos = clamp(0.3 + 0.4 * h + 0.75 * (vnoise(vec2(fl * 0.15, i * 7.3 + seed)) - 0.5), 0.06, 0.94);
  float m = abs(x - i - pos) * spacing * r / 45.0;
  float w = width * (0.6 + 0.8 * vnoise(vec2(fl * 0.21, i * 3.1 + seed)));
  return (1.0 - smoothstep(0.24 * w, 0.36 * w, m)) * step(0.42, h);
}
// x: cover 0 to 1, y: kelvin.
// away: x metres from the middle of the stream, y how much of an island of rock stands here.
vec2 stream(vec4 flow, float speed, vec2 away, vec2 at) {
  float len = flow.w;
  float s = flow.y;
  // The marks are as long as before though the lava runs slower: the seconds are counted short.
  float age = (flow.x - uTime) * 0.4;
  // The surge: uSurge.x is how far down its front is, y how far it has come up (it eases in before it breaks over the lip),
  // z the swell of the head at the lip. Nothing below the front has changed yet.
  float behind = smoothstep(uSurge.x + 4.0, uSurge.x - 8.0, len) * uSurge.y;
  float front = exp(-max(uSurge.x - len, 0.0) / 9.0) * smoothstep(uSurge.x + 4.0, uSurge.x, len) * uSurge.y;
  front = max(front, uSurge.z * smoothstep(7.0, -5.0, len));
  float ragged = 0.66 + 0.5 * vnoise(vec2(len * 0.21, s > 0.0 ? 3.0 : 11.0)) + 0.22 * vnoise(vec2(len * 1.1, s > 0.0 ? 4.0 : 12.0));
  // The fan's edge is ragged where it lies, in lobes: on the lake the sheet itself gives it, on the shore this does.
  ragged = mix(ragged, 0.8 + 0.45 * vnoise(at / 11.0 + 2.0) + 0.14 * vnoise(at / 3.1), smoothstep(${f(FAN_FROM)}, ${f(FAN_FROM + 14)}, len));
  // The fuller stream does not widen evenly: lobes of it ride down each edge with the lava and fold over the bank.
  float lobe = vnoise(vec2(age * 1.1 + 3.0, s > 0.0 ? 5.0 : 13.0)) + 0.5 * vnoise(vec2(age * 3.1, s > 0.0 ? 7.0 : 17.0)) - 0.25;
  float half_ = flow.z * ragged * (1.0 + behind * (0.1 + 0.6 * lobe) * (1.0 - 0.8 * smoothstep(${f(FAN_FROM)}, ${f(FAN_FROM + 12)}, len)) + front * (0.6 + 0.6 * lobe));
  // At a drop the stream necks as it quickens.
  half_ *= 1.0 - 0.12 * smoothstep(2.4, 5.2, speed) * (1.0 - smoothstep(${f(FAN_FROM - 4)}, ${f(FAN_FROM + 6)}, len));
  float cover = (1.0 - smoothstep(0.9, 1.0, away.x / max(half_, 0.1))) * (1.0 - smoothstep(0.3, 0.5, away.y));
  if (cover <= 0.0) return vec2(0.0, 600.0);
  float u = abs(s) / max(half_, 0.1);
  float fast = smoothstep(2.4, 5.2, speed);
  float fan = smoothstep(${f(FAN_FROM - 3)}, ${f(FAN_FROM + 4)}, len);
  // The fan's own marks are laid out from its head, in metres round it and metres out from it.
  vec2 out_ = at - vec2(${f(FAN_HEAD[0])}, ${f(FAN_HEAD[1])});
  float fl = ${f(FAN_FROM - 15)} + length(out_);
  float fs = atan(out_.x, out_.y) * 45.0;
  // On the fan the moving marks go over to the fan's lay, so nothing is drawn across the grain of the mesh.
  float lay = smoothstep(${f(FAN_FROM - 6)}, ${f(FAN_FROM + 2)}, len);
  vec2 mk = lay < 1.0 ? marks(s, age) : vec2(0.0);
  if (lay > 0.0) mk = mix(mk, marks(fs, (fl / 1.6 - uTime) * 0.2), lay);
  float streak = mk.x;
  float wave = sin(len * 2.3 + 2.5 * vnoise(vec2(s * 0.6, len * 0.4)) + 0.7 * sin(uTime * 6.0 + s * 1.7));
  // Open melt from bank to bank, yellow down the middle and orange toward the margins, a little hotter where a drop stirs it.
  float thread = mk.y;
  float kelvin = mix(1340.0, 1475.0, 1.0 - smoothstep(0.45, 0.95, u)) - 50.0 * (streak - 0.5) + fast * (8.0 + 10.0 * wave);
  kelvin = mix(kelvin, 1450.0, clamp(thread * (0.35 + 0.65 * fast), 0.0, 1.0) * (0.25 + 0.75 * streak) * (1.0 - 0.7 * smoothstep(0.35, 0.95, u)));
  // Down a drop the sheet is drawn into veils: yellow strands with thinner, redder melt between them.
  float veil = vnoise(vec2(s * 1.9 + 2.0, age * 0.35)) + 0.5 * vnoise(vec2(s * 5.3, age * 0.8 + 4.0));
  kelvin += fast * smoothstep(1.0, 7.0, len) * 110.0 * (veil - 0.95);
  kelvin -= 150.0 * smoothstep(0.0, 0.3, away.y);
  kelvin = min(kelvin, 1450.0);
  // Plates of dark skin ride it: nearly half of a tread is under them, they crowd the margins, and a drop tears most of them up.
  // In the tube the river comes out from under its crust, and the fuller melt of the surge breaks what skin it carries.
  vec2 cell = plates(vec2(s / 1.9 + 0.5 * vnoise(vec2(age * 2.2, 3.0)), (flow.x - uTime) / 0.8));
  float want = mix(0.22, 0.03, fast) + mix(0.5, 0.22, fast) * smoothstep(0.62, 0.95, u) + 0.4 * smoothstep(-14.0, -50.0, len) - 0.25 * smoothstep(-6.0, 4.0, len) * smoothstep(14.0, 6.0, len) - 0.25 * behind;
  float raft = smoothstep(want + 0.03, want - 0.03, cell.y) * smoothstep(0.03, 0.1, cell.x) * (1.0 - lay);
  float skin = mix(mix(880.0, 1095.0, pow(vnoise(vec2(s * 1.2 + 4.0, age * 3.0)), 2.0)), 1290.0, smoothstep(0.26, 0.08, cell.x));
  kelvin = mix(kelvin, skin, raft);
  // Its margins are slag: a border of cooled, ropy crust a metre or so wide that the stream has frozen against its banks,
  // ragged on its inner side and torn through where a drop quickens the melt.
  float slagAt = u + 0.16 * (vnoise(vec2(len * 0.5, s > 0.0 ? 2.0 : 9.0)) - 0.5) + 0.07 * (vnoise(vec2(len * 1.9, s * 1.3)) - 0.5);
  float slag = smoothstep(0.8, 0.9, slagAt) * (1.0 - 0.75 * fast) * (1.0 - lay) * smoothstep(1.0, 6.0, len) * (1.0 - 0.6 * behind);
  kelvin = mix(kelvin, mix(820.0, 1080.0, pow(vnoise(vec2(len * 1.4, s * 2.6)), 2.0)) + 170.0 * smoothstep(0.86, 0.8, slagAt), slag);
  // Where the slope eases the stream spreads into a fan and skins over. The fan is slabs of black crust with the melt alight in the seams
  // between them; the stream crosses it in braided channels that fork toward the shore, stands as a pool where the cascade lands,
  // and breaks out along the fan's edge. Where the two small walkers of the fall's picture stand the crust is whole.
  float r = length(out_);
  float calm = smoothstep(2.5, 6.0, min(length(at - vec2(-51.1, -298.4)), length(at - vec2(-28.3, -282.1))));
  float open = channel(fs, fl, r, 13.0, 2.0, 3.4);
  open = max(open, channel(fs, fl, r, 9.0, 13.0, 2.6) * smoothstep(${f(FAN_FROM + 6)}, ${f(FAN_FROM + 16)}, fl));
  float pool = 1.0 - smoothstep(5.0, 10.0, length(at - vec2(${f(FAN_POOL[0])}, ${f(FAN_POOL[1])})) * (0.75 + 0.5 * vnoise(at / 4.0)));
  float rim = smoothstep(0.8, 0.93, u) * smoothstep(0.42, 0.6, vnoise(at / 6.5 + vec2(0.0, uTime * 0.02)) + 0.2 * vnoise(at / 2.1));
  open = max(max(open, pool), rim) * calm;
  vec2 slab = plates(at / 4.7 + 1.1 * vec2(vnoise(at / 7.0), vnoise(at / 7.0 + 7.0)));
  // The seams are widest where the fan is youngest: near the channels, down its middle and toward its edge.
  float lively = clamp(1.25 * vnoise(at / 13.0 + 3.0) - 0.22 + 0.3 * smoothstep(0.75, 0.1, u) + 0.45 * smoothstep(0.6, 0.92, u) + 0.35 * behind, 0.0, 1.0) * (0.3 + 0.7 * calm);
  float seam = smoothstep(0.06 + 0.12 * lively, 0.0, slab.x) * smoothstep(0.2, 0.55, lively + 0.3 * slab.y);
  float crust = mix(mix(700.0, 1060.0, pow(vnoise(at / 1.9), 2.0)), mix(1180.0, 1410.0, clamp(lively * 1.3 - 0.1 + 0.35 * (slab.y - 0.5), 0.0, 1.0)), seam);
  // In the fan the open lanes are what is left of the stream, and they are as hot as it was.
  kelvin = mix(kelvin, 1440.0 - 80.0 * streak + 40.0 * thread, fan);
  kelvin = mix(kelvin, crust, fan * (1.0 - open) * (1.0 - 0.3 * behind * lively));
  // The surge: everything behind its front runs hotter and the front itself is the hottest thing in the frame.
  kelvin = mix(kelvin, 1440.0, 0.45 * behind * (1.0 - 0.7 * raft) * (0.4 + 0.6 * streak + 0.5 * thread));
  kelvin = mix(kelvin, 1475.0, front * front * (0.2 + 0.8 * smoothstep(0.25, 0.7, streak)) * (1.0 - 0.55 * raft));
  return vec2(cover, kelvin);
}`;

export const BED_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vFlow;
varying vec4 vBank;
varying vec3 vIn;
varying float vApron;
uniform sampler2D tCliff;
uniform sampler2D tCrust;
uniform sampler2D tCrustNh;
${NOISE_GLSL}
${RIG_GLSL}
${WINDOW_FRAGMENT}
${TUBE_GLSL}
${STREAM_GLSL}
void main() {
  // The true lie of the surface, for the sheer drop under the sill where the sheet is drawn out and its own normals streak.
  gDx = dFdx(vWorld);
  gDy = dFdy(vWorld);
  vec4 fDx = dFdx(vFlow);
  vec4 fDy = dFdy(vFlow);
  vec3 flat_ = normalize(cross(gDx, gDy));
  vec2 lava = stream(vFlow, vBank.w, vIn.yz, vWorld.xz);
  // Where the toe of the fan goes under the lake its skin is broken by the lake's heave, and the edge glows.
  lava.y = mix(lava.y, max(lava.y, 1430.0), smoothstep(1.7, 0.3, vWorld.y) * smoothstep(${f(FAN_FROM + 8)}, ${f(FAN_FROM + 16)}, vFlow.w) * smoothstep(0.3, 0.5, vnoise(vWorld.xz / 4.3 + uTime * 0.05) + 0.25 * vnoise(vWorld.xz / 1.3)) * smoothstep(2.0, 5.0, min(length(vWorld.xz - vec2(-51.1, -298.4)), length(vWorld.xz - vec2(-28.3, -282.1)))));
  vec3 c = blackbody(lava.y);
  // The sheet's own mark: above zero the apron the river built, below zero the skinned shelf of melt on the floor of the mouth.
  float apron = max(vApron, 0.0);
  float shelf = max(-vApron, 0.0);
  if (lava.x < 1.0) {
    vec3 v = normalize(cameraPosition - vWorld);
    vec3 n = normalize(vNormal);
    if (dot(flat_, v) < 0.0) flat_ = -flat_;
    n = normalize(mix(n, flat_, smoothstep(0.8, 0.93, 1.0 - flat_.y) * (1.0 - apron) * (1.0 - vIn.x)));
    float steep = smoothstep(0.22, 0.55, 1.0 - n.y);
    vec3 t = normalize(vec3(-n.z, 0.0, n.x) + 1e-4);
    vec2 wrap = vec2(dot(vWorld.xz, t.xz), vWorld.y);
    vec3 rock = vec3(0.0);
    if (steep > 0.0) rock += steep * textureGrad(tCliff, wrap / 60.0 + 0.13 * vnoise(vWorld.xz / 90.0), vec2(dot(gDx.xz, t.xz), gDx.y) / 60.0, vec2(dot(gDy.xz, t.xz), gDy.y) / 60.0).rgb * (0.75 + 0.5 * vnoise(vec2(vWorld.y * 0.9 + 3.0 * vnoise(vWorld.xz / 25.0), 0.5)));
    if (steep < 1.0) rock += (1.0 - steep) * laid(tTalus, vWorld, 0, 23.0, 0.0).rgb;
    rock *= 1.1;
    // What the river built is younger and blacker than the wall: welded spatter and levees close in, a dusting of it further out.
    float side = mix(vIn.y - vFlow.z, 0.3, smoothstep(0.3, 0.5, vIn.z));
    float young = max(smoothstep(22.0, 2.0, side) * (0.7 + 0.3 * vnoise(vWorld.xz * 0.35)), apron);
    vec3 fresh = laid(tTalus, vWorld, lieOf(n), 9.0, 0.0).rgb * APRON_TONE;
    vec3 albedo = mix(rock, fresh, 0.9 * young);
    float own = max(max(smoothstep(30.0, 14.0, side), vIn.x), apron);
    // Flows laid one on another: the flanks of the benches break in ledges, not in columns.
    float bedY = vWorld.y * 0.55 + 0.9 * vnoise(vWorld.xz / 9.5) + 0.5 * vnoise(vWorld.xz / 1.7);
    float ledge = vnoise(vec2(bedY, 3.0)) - vnoise(vec2(bedY + 0.22, 3.0));
    n = normalize(n + vec3(0.0, 1.0, 0.0) * ledge * 3.2 * steep * own);
    albedo *= 1.0 - 0.22 * steep * own * smoothstep(0.06, 0.2, ledge);
    albedo *= fineRock(vWorld, own, n);
    // The shelf is crust in plates, a day old: black, its seams still alight where the melt under it shows.
    vec2 slab = vec2(0.0);
    if (shelf > 0.0) {
      slab = plates(vWorld.xz / 6.5 + 0.35 * vec2(vnoise(vWorld.xz / 3.1), vnoise(vWorld.xz / 3.1 + 9.0)));
      albedo = mix(albedo, laid(tCrust, vWorld, 0, 6.0, 0.0).rgb * 0.8, shelf);
      vec2 tilt = laid(tCrustNh, vWorld, 0, 6.0, 0.0).rg - 0.5;
      n = normalize(mix(n, vec3(tilt.x * 1.6 + 0.2 * (slab.y - 0.5), 1.0, tilt.y * 1.6), shelf));
    }
    // The stream's own light on its banks: it is a long bright strip, and what faces it glows.
    vec3 to = vec3(vBank.x * max(side, 0.0), vBank.z - vWorld.y + 0.4, vBank.y * max(side, 0.0));
    float far = length(to);
    float form = vFlow.z / sqrt(vFlow.z * vFlow.z + far * far);
    float behind = smoothstep(uSurge.x + 4.0, uSurge.x - 8.0, vFlow.w) * uSurge.y;
    float fan = smoothstep(${f(FAN_FROM)}, ${f(FAN_FROM + 18)}, vFlow.w);
    float seen = smoothstep(2.5, 0.0, to.y);
    vec3 strip = blackbody(1400.0) * 3.14159 * (0.3 + 0.4 * behind) * (1.0 - 0.75 * fan) * form * form * form * seen * clamp(dot(n, to / far), 0.0, 1.0) * (1.0 - vIn.x);
    vec3 r = rockShade(vWorld, n, v, albedo, 1.0, strip, ${f(TUBE.lipZ)} - vWorld.z);
    // The rock the lava touches is itself hot for a hand's breadth.
    r += blackbody(max(1110.0 - 420.0 * max(side, 0.0), 500.0)) * smoothstep(1.0, 0.0, side) * (0.5 + 0.5 * vnoise(vWorld.xz * 2.3)) * (1.0 - shelf);
    if (shelf > 0.0) {
      // Seams between the plates: wide and yellow near the pool, thin and red further off, some of them healed.
      float nearPool = smoothstep(46.0, 4.0, side);
      float seam = smoothstep(0.05 + 0.09 * nearPool, 0.0, slab.x) * smoothstep(0.25 - 0.5 * nearPool, 0.6, vnoise(vWorld.xz / 11.0 + 4.0) + 0.3 * slab.y);
      r += blackbody(mix(1090.0, 1400.0, seam * (0.45 + 0.55 * nearPool))) * seam * shelf;
    }
    c = mix(r, c, lava.x);
  }
  // Skin that has gone dark is a surface again: it takes the light of what still glows round it.
  float cool = lava.x * smoothstep(1090.0, 950.0, lava.y);
  if (cool > 0.0) {
    vec3 n = normalize(vNormal);
    // On the stream the skin rides with the flow; on the fan it has stopped and lies where it froze.
    float still_ = smoothstep(${f(FAN_FROM)}, ${f(FAN_FROM + 18)}, vFlow.w);
    vec2 uv = vec2(vFlow.y, vFlow.w - 2.5 * (uTime - vFlow.x)) / 5.0;
    vec2 ux = vec2(fDx.y, fDx.w + 2.5 * fDx.x) / 5.0;
    vec2 uy = vec2(fDy.y, fDy.w + 2.5 * fDy.x) / 5.0;
    vec3 skin = vec3(0.0);
    vec2 slope = vec2(0.0);
    if (still_ < 1.0) {
      skin += (1.0 - still_) * textureGrad(tCrust, uv, ux, uy).rgb;
      slope += (1.0 - still_) * (textureGrad(tCrustNh, uv, ux, uy).rg - 0.5);
    }
    if (still_ > 0.0) {
      skin += still_ * laid(tCrust, vWorld, 0, 6.0, 0.0).rgb;
      slope += still_ * (laid(tCrustNh, vWorld, 0, 6.0, 0.0).rg - 0.5 + 0.7 * (laid(tCrustNh, vWorld, 0, 1.3, 0.0).rg - 0.5));
    }
    n = normalize(n + vec3(slope.x, 0.0, slope.y) * 1.8);
    vec3 glow = blackbody(1300.0) * 3.14159 * 0.16 * (0.5 + 0.5 * n.y);
    c += cool * rockShade(vWorld, n, normalize(cameraPosition - vWorld), skin * 0.8, 1.0, glow, ${f(TUBE.lipZ)} - vWorld.z);
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
  if (hiddenByWall(vWorld, vIn.x)) discard;
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

// The whole river outside the mouth is in the map. High on the wall it counts for less: what the map lights lies under it, and the round lights
// carry the rest.
export const GLOW_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec4 vFlow;
varying vec3 vSpeed;
${NOISE_GLSL}
${RIG_GLSL}
${PLATES_GLSL}
${STREAM_GLSL}
void main() {
  float low = mix(0.3, 0.6, smoothstep(40.0, 6.0, vWorld.y)) * smoothstep(-6.0, 2.0, vFlow.w);
  vec2 s = stream(vFlow, vSpeed.x, vSpeed.yz, vWorld.xz);
  gl_FragColor = vec4(blackbody(s.y) * s.x * low, 1.0);
  if (low <= 0.0) discard;
}`;

export const GOB_VERTEX = /* glsl */ `
attribute vec4 aSeed;
varying float vHeat;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vHeat = aSeed.x;
  vNormal = normalize(mat3(instanceMatrix) * normal);
  // A clot, not a ball: every corner of it stands in or out by its own amount.
  float lump = fract(sin(dot(position, vec3(12.9898, 78.233, 37.719)) + aSeed.y * 40.0) * 43758.5453);
  vec4 world = instanceMatrix * vec4(position * (0.6 + 0.7 * lump), 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

export const GOB_FRAGMENT = /* glsl */ `
precision highp float;
varying float vHeat;
varying vec3 vNormal;
varying vec3 vWorld;
${RIG_GLSL}
void main() {
  // The skin of a gob chills first where it is thinnest, at its edge as seen.
  float nv = abs(dot(normalize(vNormal), normalize(cameraPosition - vWorld)));
  gl_FragColor = vec4(rigOut(blackbody(vHeat - 190.0 * (1.0 - nv) * (1.0 - nv))), 1.0);
}`;

// The discards alone, for the engine's depth pass.
export const ROCK_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vSkin;
${NOISE_GLSL}
${WINDOW_FRAGMENT}
${TORN_GLSL}
void main() {
  if (torn(vWorld, vSkin)) discard;
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
