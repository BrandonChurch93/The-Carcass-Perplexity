// The shaders of the fall's folder.
import { WALL_ROCK_GLSL } from '../land/rock';
import { MOUTH } from '../layout';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { FAN_FROM, FAN_HEAD, TUBE } from './path';
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
const float RIM_LIGHT = 5.0;
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
  // The stream leaves the mouth: it lights the cut of the arch beside and above it and not the roof 40 m over it nor the back.
  // The pool lies under the west third of the arch, so the lit band is broad at the west and the upper west, thins over the crown
  // and is gone along the east side, which stands behind the heaps on the floor.
  float east = smoothstep(${f(MOUTH.x - 58)}, ${f(MOUTH.x + 34)}, p.x);
  float deepest = mix(21.0, 4.0, east);
  // Past the cut the light falls away into the dark over a few metres more; it does not stop at an edge.
  float shade = max(smoothstep(deepest, 0.3 * deepest, d), 0.22 * smoothstep(64.0, 20.0, d)) * smoothstep(0.6, 3.5, d);
  // The light is on the upper west of the cut and thins as it climbs: at the crown a third of it is left. The foot of the cut, where
  // it meets the cone in a comb of broken blocks, stays dark: lit, the comb stood as a row of bright spikes. East of the
  // stream's side it is gone within the first third of the arch.
  float reach = mix(1.0, 0.0, smoothstep(0.08, 0.62, east)) * smoothstep(${f(TUBE.floor + 3)}, ${f(TUBE.floor + 15)}, p.y) * mix(1.0, 0.33, smoothstep(${f(TUBE.floor + 8)}, ${f(TUBE.floor + 62)}, p.y));
  float e = poolLight(p, n, vec3(${f(MOUTH.x - 34)}, ${f(TUBE.floor)}, ${f(TUBE.lipZ - 9)}), 13.0) * uFlare * shade * reach;
  // The crusted shelf east of the pool gives the east wall just enough to show it as rock against the dark.
  e += 0.009 * poolLight(p, n, vec3(${f(MOUTH.x + 16)}, ${f(TUBE.floor)}, ${f(TUBE.lipZ - 12)}), 26.0) * smoothstep(46.0, 8.0, d) * smoothstep(0.6, 3.5, d);
  return blackbody(1390.0) * 3.14159 * RIM_LIGHT * e;
}
// What is left in the dark of the tube: the glow of the river far in, on soot. It shows the rock as rock and no more.
vec3 tubeDark(float d) {
  return blackbody(1250.0) * 0.011 * exp(-max(d, 0.0) / 70.0);
}
// The rig's shading, with the day and the lake shut out as the tube goes in.
vec3 rockShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float occ, vec3 more, float d) {
  // The cut of the rim looks in and down: a few metres in, the day no longer reaches it.
  // East of the pool the cut goes dark at once: that end of the mouth sinks into the cliff in shadow and shows no lit outline.
  float eastCut = smoothstep(${f(MOUTH.x - 40)}, ${f(MOUTH.x + 10)}, p.x);
  float deep = smoothstep(0.5, mix(13.0, 3.0, eastCut), d);
  float lit = (1.0 - deep) * (1.0 - deep);
  // The cut looks down and in: it has less of the sky than the face has, so the melt's orange is what shows on it.
  float open = skyOpen(p) * occ * lit * mix(1.0, 0.45, smoothstep(0.5, 3.0, d));
  // Nothing is read that would be multiplied by nothing: past the bevel the round lights are shut out, and far in the lake is too.
  vec3 lake = lit < 0.01 ? vec3(0.0) : (p.y > 30.0 ? lakeIrradianceFar(p, n) : lakeIrradiance(p, n));
  // On the cut of the rim the east side stands behind the heaps on the floor, as it does for the pool's own light.
  if (d < 7.0) lake += emitterIrradiance(p, n) * smoothstep(7.0, 0.0, d) * smoothstep(${f(TUBE.floor + 1)}, ${f(TUBE.floor + 12)}, p.y) * mix(1.0, mix(1.0, 0.05, smoothstep(${f(MOUTH.x - 30)}, ${f(MOUTH.x + 30)}, p.x)), smoothstep(0.0, 1.5, d));
  vec3 e = skyIrradiance(n) * open + lake * occ * lit + (riverLight(p, n, d) + tubeDark(d) * smoothstep(1.0, 8.0, d)) * occ + more * occ;
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
  // The lip itself is the wall's rock too: the fall's own rock begins where the cut turns in.
  float collar = smoothstep(-1.2, 0.2, vSkin.y);
  float d = -vSkin.y;
  vec3 c = vec3(0.0);
  bool ragged = torn(vWorld, vSkin);
  // What the wall hides is thrown away at the end and is not worked out: every picture is read with the slopes taken above.
  bool hidden = hiddenByWall(vWorld, vSkin.z);
  // Far inside no light reaches and there is no rock to draw; between, only the melt's light on plain dark rock.
  if (inside > 0.5 && d > 26.0) {
    // The same ribs go on round the tube, and only their fronts show.
    if (d < 110.0 && !hidden) {
      float deepRib = vnoise(vec2(vSkin.x / 17.0, vSkin.y / 2.1 + 2.4 * vnoise(vSkin.xy / 13.0)));
      c = vec3(0.06) * (0.12 + 1.6 * smoothstep(0.3, 0.72, deepRib)) * (tubeDark(d) + (d < 64.0 ? riverLight(vWorld, n, d) : vec3(0.0))) / 3.14159;
    }
  } else if (!ragged && !hidden) {
    if (collar < 1.0) {
      // The rim and the tube have no upright direction (the roof, the bevel): the picture is laid on from the axis the face looks along.
      vec3 cliff = laid(tCliff, vWorld, lieOf(n), 47.0, 0.0).rgb;
      cliff *= fineRock(vWorld, 1.0, n);
      // Soot and glaze inside: the lining of a tube is darker than the wall it runs through.
      cliff *= mix(1.0, 0.5, smoothstep(0.0, 30.0, d) * inside);
      // The cut of the arch is broken rock: blocks and ribs of one to four metres, each lying its own way, so one takes the light
      // from below, the next is in its shade, and the joints between them are black.
      float broken = smoothstep(2.0, -3.0, vSkin.y);
      // It came away in layers that follow the opening: ribs a metre or two deep that run round the arch, each standing a little
      // proud of the one behind it, uneven in depth and broken here and there along their length.
      float lay = vSkin.y / 2.1 + 2.4 * vnoise(vSkin.xy / 13.0) + 0.6 * vnoise(vSkin.xy / 3.3 + 4.0);
      float along = vSkin.x / 17.0;
      float rib = 0.7 * vnoise(vec2(along, lay)) + 0.3 * vnoise(vec2(along * 3.1 + 3.0, lay * 2.6));
      float ribIn = 0.7 * vnoise(vec2(along, lay + 0.22)) + 0.3 * vnoise(vec2(along * 3.1 + 3.0, (lay + 0.22) * 2.6));
      float ribBy = 0.7 * vnoise(vec2(along + 0.09, lay)) + 0.3 * vnoise(vec2(along * 3.1 + 3.28, lay * 2.6));
      vec3 round_ = normalize(cross(n, vec3(0.0, 0.0, 1.0)) + 1e-4);
      n = normalize(n + broken * (vec3(0.0, 0.0, 1.0) * (ribIn - rib) * 12.0 + round_ * (ribBy - rib) * 8.0));
      // The hollow under a rib is in its shade, and soot lies in it; here and there a rib is cracked through.
      float hollow = smoothstep(0.52, 0.34, rib);
      float crack = smoothstep(0.03, 0.0, abs(vnoise(vec2(vSkin.x / 4.3, lay * 0.9 + 7.0)) - 0.5)) * smoothstep(0.35, 0.6, vnoise(vSkin.xy / 8.0 + 21.0));
      cliff *= 1.0 - broken * max(0.8 * hollow, 0.7 * crack);
      cliff *= mix(1.0, (0.62 + 0.8 * rib) * (0.6 + 0.8 * vnoise(vSkin.xy / 14.0 + 7.0)), broken);
      c = rockShade(vWorld, n, v, cliff, 1.0, vec3(0.0), d);
    }
    if (collar > 0.0) {
      // The land's rock, read with the slopes taken at the top: the same rock under the same light as the wall.
      vec3 wn;
      float wocc;
      vec3 wall = wallRockAt(vWorld, normalize(vNormal), gDx, gDy, wn, wocc);
      c = mix(c, rigShade(vWorld, wn, v, wall, 0.92, wocc), collar);
    }
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
  // Last, so that no texture is read beside a pixel already thrown away.
  if (ragged || hidden) discard;
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
// Metres from the lip of the middle of each drop of the main stream, and 1e4 for the rest.
uniform float uFalls[12];
// Metres of the surface under one pixel. Marks finer than about two pixels are faded out: drawn, they would crawl as they ride.
float gPx = 0.3;
// Half the width of the lava here, in metres: the bed's half width as the stream has filled it.
float gHalf = 0.0;
// The lobe of fan crust this is on: x how far it is from the lobe's edge (in lobes), y the lobe's own number.
vec2 gCell = vec2(0.5, 0.0);
float seenAt(float metres) {
  return smoothstep(1.0, 2.6, metres / gPx);
}
// x: streaks drawn out down the flow, y: threads of open lava. s is metres across, age the second the lava left the lip.
vec2 marks(float s, float age) {
  float streak = 0.5 * vnoise(vec2(s * 0.7, age * 1.1)) + 0.3 * mix(0.5, vnoise(vec2(s * 2.3 + 7.0, age * 2.7)), seenAt(0.43)) + 0.2 * mix(0.5, vnoise(vec2(s * 6.5 + 3.0, age * 6.0)), seenAt(0.15));
  float thread = smoothstep(0.06, 0.0, abs(vnoise(vec2(s * 0.85 + 11.0, age * 0.45)) - 0.5)) + 0.6 * seenAt(0.48) * smoothstep(0.045, 0.0, abs(vnoise(vec2(s * 2.1 + 5.0, age * 1.3)) - 0.5));
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
  // Its width is uneven: hair-thin here, swollen there. Returned is its profile: 0 at its bank, 1 down its middle.
  float w = max(width * (0.3 + 1.05 * pow(vnoise(vec2(fl * 0.19, i * 3.1 + seed)), 1.5)), 1.0) * clamp(r / 45.0, 0.4, 1.0);
  return (1.0 - smoothstep(0.08 * w, 0.42 * w, m)) * step(0.26, h);
}
// Rivulets down the fan: strands that run out from its head down the fall line, each parting from its neighbour on one side and
// joining the one on the other, by turns. x is the place round the fan counted in strands, fl metres out, r metres from the head.
// Returned is the profile of the nearest strand: 0 at its bank, 1 down its middle.
float braid(float x, float fl, float r, float spacing, float seed, float width) {
  // Where neighbours run as one and where they stand apart: a slow wave down the fall line, out of step from place to place.
  // The whole braid wanders as it goes down: no strand is a ruled ray from the head.
  x += 1.5 * (vnoise(vec2(fl * 0.06, x * 0.22 + seed)) - 0.5) + 0.8 * (vnoise(vec2(fl * 0.21, x * 0.5 + 9.0)) - 0.5) + 0.3 * (vnoise(vec2(fl * 0.55, x * 0.9 + 4.0)) - 0.5);
  float c = clamp(1.2 * cos(fl * 0.105 + 3.5 * vnoise(vec2(x * 0.13 + seed, fl * 0.05))), -1.0, 1.0);
  float k = floor(x);
  float best = 0.0;
  for (int j = 0; j < 2; j++) {
    float i = k + float(j);
    float turn = mod(i, 2.0) < 0.5 ? 0.5 : -0.5;
    float h = fract(sin(i * 127.1 + seed * 311.7) * 43758.5453);
    float pos = i + turn * c + 0.3 * (vnoise(vec2(fl * 0.13, i * 7.3 + seed)) - 0.5) * (1.0 - abs(c));
    float m = abs(x - pos) * spacing * r / 45.0;
    // Its width is uneven, hair-thin here and swollen there, and here and there a strand is skinned over for a stretch.
    float w = width * (0.45 + 0.9 * vnoise(vec2(fl * 0.11, i * 3.1 + seed))) * clamp(r / 45.0, 0.5, 1.0);
    float on = smoothstep(0.36, 0.48, h + 0.75 * vnoise(vec2(fl * 0.075, i * 1.7 + seed)));
    best = max(best, (1.0 - smoothstep(0.15 * w, 0.5 * w, m)) * on);
  }
  return best;
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
  // The front is a wave and outruns the lava: for some twenty metres behind it the melt runs bare and at its brightest, the skin it
  // broke thrown to its margins. Further back the fuller river carries the crust of the tube out with it in slabs.
  float wake = behind * smoothstep(uSurge.x - 19.0, uSurge.x - 7.0, len);
  float full = behind - wake;
  float ragged = 0.66 + 0.5 * vnoise(vec2(len * 0.21, s > 0.0 ? 3.0 : 11.0)) + 0.22 * vnoise(vec2(len * 1.1, s > 0.0 ? 4.0 : 12.0));
  // The fan's edge is ragged where it lies, in lobes: on the lake the sheet itself gives it, on the shore this does.
  ragged = mix(ragged, 0.8 + 0.45 * vnoise(at / 11.0 + 2.0) + 0.14 * vnoise(at / 3.1), smoothstep(${f(FAN_FROM)}, ${f(FAN_FROM + 14)}, len));
  // The fuller stream does not widen evenly: lobes of it ride down each edge with the lava and fold over the bank.
  float lobe = vnoise(vec2(age * 1.1 + 3.0, s > 0.0 ? 5.0 : 13.0)) + 0.5 * vnoise(vec2(age * 3.1, s > 0.0 ? 7.0 : 17.0)) - 0.25;
  float half_ = flow.z * ragged * (1.0 + behind * (0.3 + 0.7 * lobe) * (1.0 - 0.8 * smoothstep(${f(FAN_FROM)}, ${f(FAN_FROM + 12)}, len)) + front * (0.6 + 0.6 * lobe));
  // At a drop the stream necks as it quickens.
  half_ *= 1.0 - 0.12 * smoothstep(2.4, 5.2, speed) * (1.0 - smoothstep(${f(FAN_FROM - 4)}, ${f(FAN_FROM + 6)}, len));
  gHalf = half_;
  float cover = (1.0 - smoothstep(0.9, 1.0, away.x / max(half_, 0.1))) * (1.0 - smoothstep(0.3, 0.5, away.y));
  if (cover <= 0.0) return vec2(0.0, 600.0);
  float u = abs(s) / max(half_, 0.1);
  float fast = smoothstep(2.4, 5.2, speed);
  // Far off the fine marks are under a pixel, and what shows that the stream runs is its long stretches: the skin comes down in
  // packs some metres long with open melt between them. They ride at the speed of the lava, so they crowd where it slows and are
  // drawn out where it drops; the middle of each runs ahead of its margins and none ends on a line straight across.
  float ride = flow.x - uTime + 0.5 * u * u + 0.4 * (vnoise(vec2(s * 0.45 + 3.0, (flow.x - uTime) * 0.6)) - 0.5);
  float stretch = vnoise(vec2(ride * 0.27, 2.0)) + 0.3 * (vnoise(vec2(ride * 0.8 + 5.0, 7.0)) - 0.5);
  float run = smoothstep(3.0, 10.0, len) * (1.0 - smoothstep(${f(FAN_FROM - 6)}, ${f(FAN_FROM + 2)}, len));
  float dark = smoothstep(0.56, 0.74, stretch) * run;
  float bright = smoothstep(0.47, 0.27, stretch) * run;
  // The foot of each drop: the sheet lands and churns there, and what skin came over with it is broken up.
  float pool = 0.0;
  for (int i = 0; i < 12; i++) {
    float past = len - uFalls[i];
    pool = max(pool, smoothstep(0.6, 2.4, past) * smoothstep(8.5, 4.0, past));
  }
  pool *= run;
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
  float wave = sin(len * 2.3 + 2.5 * vnoise(vec2(s * 0.6, len * 0.4)));
  // Open melt from bank to bank, yellow down the middle and orange toward the margins, a little hotter where a drop stirs it.
  float thread = mk.y;
  // Its marks are drawn out along the flow: streaks of hotter and cooler melt, a hand to a metre wide.
  float kelvin = mix(1390.0, 1290.0, smoothstep(0.2, 0.85, u)) - 95.0 * (streak - 0.5) - 55.0 * seenAt(0.38) * (vnoise(vec2(s * 2.6 + 7.0, age * 0.7)) - 0.5) + fast * (8.0 + 10.0 * wave);
  kelvin = mix(kelvin, 1430.0, clamp(thread * (0.35 + 0.65 * fast), 0.0, 1.0) * (0.25 + 0.75 * streak) * (1.0 - 0.7 * smoothstep(0.35, 0.95, u)));
  // The core: the fastest melt runs in a few threads, half a metre to a metre and a half wide, that split and join again as
  // they come down. They are near white at the lip and down each drop and cool to orange on the flat treads between.
  // Nothing of the stream is worked out on the fan, and nothing of the fan on the stream: only where one goes over to the other.
  float core = 0.0;
  float strandFar = 0.0;
  float lipHotAt = 0.0;
  if (lay < 1.0) {
    float lipHot = smoothstep(-7.0, -1.0, len) * smoothstep(10.0, 3.0, len);
    lipHotAt = lipHot;
    float hotDown = max(lipHot, smoothstep(${f(FAN_FROM + 3)}, ${f(FAN_FROM - 5)}, len) * smoothstep(-3.0, 2.0, len));
    // The pour's first third is its hottest: a broad sheet with a yellow-white core, before it has cooled on the ledges.
    float pour = smoothstep(50.0, 22.0, len) * smoothstep(-3.0, 2.0, len);
    float hotAt = clamp(lipHot + 0.25 + 1.3 * smoothstep(1.6, 3.6, speed) + 0.7 * bright + 0.6 * pour, 0.0, 1.0);
    // They are marks in the lava like the rest: they ride down with it at the speed of the flow and do not stand in place.
    float b1 = vnoise(vec2(s * 0.36 + 3.0, age * 0.47 + 1.0));
    float b2 = vnoise(vec2(s * 0.62 + 17.0, age * 0.72 + 5.0));
    // On a tread they are strands a metre wide; down a drop and at the lip they swell and run together.
    float wide = (0.096 + 0.075 * smoothstep(1.9, 3.4, speed)) * (1.0 + 2.1 * bright - 0.25 * dark) + 0.2 * lipHot + 0.05 * pour;
    float d1 = abs(b1 - 0.5);
    float d2 = abs(b2 - 0.47);
    core = max(1.0 - smoothstep(0.55 * wide, wide, d1), 1.0 - smoothstep(0.45 * wide, 0.85 * wide, d2));
    core *= (1.0 - smoothstep(0.62, 0.86, u)) * hotDown;
    kelvin = mix(kelvin, mix(1528.0, 1560.0, hotAt) + 30.0 * (streak - 0.5), core);
    // How far this is from the nearest strand, in strand widths, its outline torn.
    strandFar = min(d1, 1.15 * d2) / wide + 0.9 * (vnoise(vec2(s * 1.7 + 9.0, age * 2.3)) - 0.5) + 0.35 * seenAt(0.2) * (vnoise(vec2(s * 5.1, age * 6.1 + 3.0)) - 0.5);
  }
  // Down a drop the sheet is drawn into veils: yellow strands with thinner, redder melt between them.
  float drop = smoothstep(1.9, 3.2, speed) * (1.0 - lay);
  if (drop > 0.0) {
    float veil = vnoise(vec2(s * 1.9 + 2.0, age * 0.35)) + 0.5 * mix(0.5, vnoise(vec2(s * 5.3, age * 0.8 + 4.0)), seenAt(0.19));
    kelvin += drop * smoothstep(1.0, 7.0, len) * 190.0 * (veil - 0.9) * (1.0 - 0.6 * core);
  }
  kelvin -= 150.0 * smoothstep(0.0, 0.3, away.y);
  kelvin = min(kelvin, 1560.0);
  // A side channel is a thread of the stream and cooler than it: orange down its middle and red at its banks, never a pale panel.
  float thin = smoothstep(2.9, 2.5, flow.z) * (1.0 - lay) * smoothstep(2.0, 6.0, len);
  kelvin = mix(kelvin, min(kelvin, 1370.0 - 70.0 * (streak - 0.5)) - 150.0 * smoothstep(0.25, 1.0, u), thin);
  // Plates of dark skin ride it: nearly half of a tread is under them, they crowd the margins, and a drop tears most of them up.
  // In the tube the river comes out from under its crust, and the fuller melt of the surge breaks what skin it carries.
  // They are torn, not cut: the plates' lay is warped and their outline broken, and they turn a little as they ride.
  float raft = 0.0;
  if (lay < 1.0) {
    vec2 rq = vec2(s / 1.5 + 0.5 * vnoise(vec2(age * 2.2, 3.0)), (flow.x - uTime) / 0.8);
    rq += 0.8 * vec2(vnoise(rq * 0.6 + 3.0), vnoise(rq * 0.6 + 11.0)) + 0.22 * vec2(vnoise(rq * 2.3 + 5.0), vnoise(rq * 2.3 + 17.0));
    vec2 cell = plates(rq);
    cell.y += 0.16 * (vnoise(rq * 3.7 + 9.0) - 0.5);
    float want = mix(0.22, 0.03, fast) + mix(0.5, 0.22, fast) * smoothstep(0.62, 0.95, u) + 0.4 * smoothstep(-14.0, -50.0, len) - 0.25 * smoothstep(-6.0, 4.0, len) * smoothstep(14.0, 6.0, len) - 0.25 * wake - 0.1 * full - 0.2 * pool * behind + 0.4 * dark - 0.12 * bright;
    raft = smoothstep(want + 0.03, want - 0.03, cell.y) * smoothstep(0.03, 0.1, cell.x) * (1.0 - lay);
    // What skin the surge still carries is young: dull red, and never the black of old crust.
    float skin = mix(mix(880.0, 1095.0, pow(vnoise(vec2(s * 1.2 + 4.0, age * 3.0)), 2.0)) + 170.0 * behind, 1290.0 + 90.0 * behind, smoothstep(0.26, 0.08, cell.x));
    kelvin = mix(kelvin, skin, raft);
    // Between the strands a tread is under its skin: dark crust that rides with the melt, orange where it meets a strand, with a
    // crack or two alight along the flow. A drop tears it up, the lip has none yet, and the surge breaks most of it.
    float skinOn = smoothstep(1.5, 2.3, strandFar) * (1.0 - 0.92 * smoothstep(1.9, 3.2, speed)) * smoothstep(3.0, 10.0, len) * (1.0 - 0.97 * behind) * (1.0 - lay);
    float crustK = mix(790.0, 1030.0, pow(vnoise(vec2(s * 1.2 + 4.0, age * 3.0)), 2.0)) + 260.0 * smoothstep(3.1, 1.7, strandFar) + 190.0 * clamp(thread, 0.0, 1.0);
    // A pack is skin from bank to bank, torn here and there, and a drop does not tear all of it up.
    float pack = dark * (1.0 - 0.5 * fast) * (1.0 - 0.97 * behind) * smoothstep(0.2, 0.42, vnoise(vec2(s * 0.8 + 2.0, ride * 1.9)) + 0.3 * (1.0 - core));
    // The fast threads run on through it, white in the black.
    pack *= 0.92 * (1.0 - core);
    kelvin = mix(kelvin, max(kelvin, 1500.0), 0.7 * bright * (1.0 - raft) * (1.0 - skinOn));
    kelvin = mix(kelvin, crustK, skinOn);
    kelvin = mix(kelvin, mix(760.0, 990.0, pow(vnoise(vec2(s * 1.2 + 4.0, age * 3.0)), 2.0)) + 200.0 * clamp(thread, 0.0, 1.0), pack);
    skinOn = max(skinOn, pack);
    raft = max(raft, skinOn);
    // Its margins are slag: a border of cooled, ropy crust a metre or so wide that the stream has frozen against its banks,
    // ragged on its inner side and torn through where a drop quickens the melt.
    float slagAt = u + 0.16 * (vnoise(vec2(len * 0.5, s > 0.0 ? 2.0 : 9.0)) - 0.5) + 0.07 * (vnoise(vec2(len * 1.9, s * 1.3)) - 0.5);
    float slag = smoothstep(0.8, 0.9, slagAt) * (1.0 - 0.75 * fast) * (1.0 - lay) * smoothstep(1.0, 6.0, len) * (1.0 - 0.6 * behind);
    kelvin = mix(kelvin, mix(820.0, 1080.0, pow(vnoise(vec2(len * 1.4, s * 2.6)), 2.0)) + 170.0 * smoothstep(0.86, 0.8, slagAt), slag);
    // The fuller river behind the wake carries slabs of crust some metres across, large enough to be read from the lake. They are
    // marks in the lava and ride at its speed: on a tread they crowd until only seams of melt are left between them, a drop draws
    // them out and tears most of them up, and the pool under it has none.
    if (full > 0.001) {
      vec2 bq = vec2(s / 3.3 + 0.5 * vnoise(vec2(ride * 0.7, 5.0)), ride / 1.7);
      bq += 0.7 * vec2(vnoise(bq * 0.6 + 23.0), vnoise(bq * 0.6 + 31.0)) + 0.2 * vec2(vnoise(bq * 2.3 + 5.0), vnoise(bq * 2.3 + 17.0));
      vec2 slabCell = plates(bq);
      slabCell.y += 0.14 * (vnoise(bq * 3.1 + 9.0) - 0.5);
      float crowd = mix(0.58, 0.34, smoothstep(1.7, 3.3, speed)) * (1.0 - 0.9 * pool) + 0.16 * smoothstep(0.55, 0.95, u) - 0.3 * lipHotAt;
      float slab = smoothstep(crowd + 0.03, crowd - 0.03, slabCell.y) * smoothstep(0.03, 0.11, slabCell.x) * full * smoothstep(-30.0, -10.0, len);
      // Where they crowd they buckle: a slab is cracked across and the melt shows in the crack.
      float buckle = smoothstep(0.05, 0.0, abs(vnoise(vec2(s * 0.5 + 3.0, ride * 2.6)) - 0.5)) * (1.0 - fast) * seenAt(0.5);
      // A slab is crust lying on the melt and not a hole in it: its face is a dull red that it keeps as it rides, darker in its
      // middle where it is thickest, with its own net of cracks; its edge glows where the melt wells round it.
      vec2 inner = plates(bq * 2.7 + 13.0);
      float faceK = mix(1010.0, 1095.0, slabCell.y / max(crowd, 0.05)) - 50.0 * smoothstep(0.2, 0.5, slabCell.x) + 50.0 * (vnoise(bq * 4.0 + 3.0) - 0.5);
      float crack = max(smoothstep(0.09, 0.02, inner.x) * seenAt(0.6), 0.8 * buckle);
      float slabK = mix(mix(faceK, 1330.0, crack), 1400.0, smoothstep(0.17, 0.08, slabCell.x));
      kelvin = mix(kelvin, slabK, slab);
      // The melt stands a shade paler in the seam round a slab.
      kelvin = mix(kelvin, max(kelvin, 1545.0), 0.7 * full * (1.0 - slab) * smoothstep(crowd + 0.03, crowd - 0.03, slabCell.y) * smoothstep(-30.0, -10.0, len));
      raft = max(raft, slab);
    }
    // In the wake the skin the front broke rides the margins in torn pieces.
    float aside = wake * smoothstep(0.45, 0.8, u + 0.3 * (vnoise(vec2(ride * 1.5, s > 0.0 ? 2.0 : 9.0)) - 0.5)) * smoothstep(0.3, 0.55, vnoise(vec2(s * 0.8 + 6.0, ride * 1.3))) * smoothstep(-14.0, -4.0, len);
    kelvin = mix(kelvin, mix(1040.0, 1170.0, vnoise(vec2(s * 1.2 + 4.0, ride * 2.0))), 0.85 * aside);
    raft = max(raft, 0.85 * aside);
  }
  // Where the slope eases the stream spreads into a fan and skins over. The fan is slabs of black crust with the melt alight in the seams
  // between them; the stream crosses it in braided channels that fork toward the shore, stands as a pool where the cascade lands,
  // and breaks out along the fan's edge. Where the two small walkers of the fall's picture stand the crust is whole.
  if (fan > 0.0) {
    float r = length(out_);
    float calm = smoothstep(2.5, 6.0, min(length(at - vec2(-51.1, -298.4)), length(at - vec2(-28.3, -282.1))));
    // The rivulets are flow lines and nothing else is alight on the fan: no seam runs across the fall line.
    float lane = braid(fs / 5.5, fl, r, 5.5, 2.0, 1.5 * (1.0 + 0.6 * behind));
    float open = smoothstep(0.0, 0.22, lane);
    open *= calm;
    // Between them the skin is whole and dark.
    float crust = mix(600.0, 900.0, pow(vnoise(at / 1.9), 2.0));
    // In the fan the open lanes are what is left of the stream, and they are as hot as it was.
    // A rivulet is red at its banks, orange within, and pale down its middle where it runs fastest; many have skinned over
    // and show only as a dull line with breaks in it.
    float crusted = smoothstep(0.46, 0.66, vnoise(at / 10.0 + 41.0) + 0.25 * vnoise(at / 2.7 + 5.0) - 0.25 * behind);
    float inLane = lane;
    float laneK = mix(1130.0, 1360.0 - 70.0 * streak, smoothstep(0.05, 0.5, inLane));
    laneK = mix(laneK, 1500.0 + 45.0 * thread, smoothstep(0.62, 0.92, inLane) * (1.0 - 0.5 * smoothstep(${f(FAN_FROM + 40)}, ${f(FAN_FROM + 75)}, fl)));
    laneK = mix(laneK, mix(960.0, 1120.0, vnoise(at / 1.7 + 3.0)) + 260.0 * smoothstep(0.75, 0.95, lane) * smoothstep(0.5, 0.75, vnoise(vec2(fl * 0.3, fs * 0.2))), 0.9 * crusted);
    // The feed comes down the lanes in pulses: one stretch runs bright, the next has dimmed under a film, and they travel at the
    // fan's slow pace.
    float pulse = vnoise(vec2((fl - 1.6 * uTime) / 8.0, fs / 13.0 + 3.0));
    laneK = mix(laneK, min(laneK, 1110.0), 0.8 * smoothstep(0.5, 0.75, pulse));
    kelvin = mix(kelvin, laneK, fan);
    kelvin = mix(kelvin, crust, fan * (1.0 - open));
    // The crust lies in lobes, toes of the flow laid one on another, longer down the fall line than across it. The melt shows in
    // the joints between some of them: a net of short cracks, dull red for the most part and orange where a lobe is still fed.
    vec2 fq = vec2(fs / 4.5, fl / 8.0);
    fq += 0.7 * vec2(vnoise(fq * 0.7 + 3.0), vnoise(fq * 0.7 + 11.0)) + 0.2 * vec2(vnoise(fq * 2.3 + 5.0), vnoise(fq * 2.3 + 17.0));
    gCell = plates(fq);
    float fed = vnoise(at / 13.0 + 21.0) + 0.45 * gCell.y + 0.25 * behind;
    float joint = smoothstep(0.11, 0.035, gCell.x) * smoothstep(0.42, 0.62, fed) * seenAt(0.9) * calm;
    kelvin = mix(kelvin, max(kelvin, mix(1030.0, 1330.0, smoothstep(0.55, 0.95, fed) * vnoise(at / 3.3 + 7.0))), fan * joint);
  }
  // The surge: everything behind its front runs hotter and the front itself is the hottest thing in the frame.
  // The melt between the slabs is the brightest thing on the river; a slab keeps its own dark.
  kelvin = mix(kelvin, 1500.0, clamp((0.62 * behind + 0.18 * wake) * (0.45 + 0.6 * streak + 0.5 * thread), 0.0, 1.0) * (1.0 - mix(0.7, 0.96, full) * raft));
  // The bare melt of the wake is not one colour: films of skin form on it at once, a shade darker, and ride down with it.
  kelvin = mix(kelvin, 1340.0, 0.6 * wake * smoothstep(0.5, 0.68, vnoise(vec2(s * 0.8 + 13.0, (flow.x - uTime) * 0.9 + 0.4 * vnoise(vec2(s * 0.5, 7.0))))) * (1.0 - raft) * (1.0 - lay));
  if (behind > 0.0 && lay < 1.0) {
    // Down a drop the fuller sheet thins as it quickens and parts into strands: yellow ropes of melt, and between them a film so
    // thin that it has reddened and the rock shows dark through it.
    float strand = vnoise(vec2(s * 0.75 + 2.0, age * 0.9 + 3.0)) + 0.3 * (vnoise(vec2(s * 2.3 + 9.0, age * 2.1)) - 0.5) * seenAt(0.43);
    kelvin = mix(kelvin, mix(1150.0, 1545.0, smoothstep(0.34, 0.6, strand)), 0.85 * drop * behind * smoothstep(1.0, 7.0, len) * (1.0 - raft));
    // It lands in a pool that churns: paler than the reach above it, and mottled as it turns over.
    float churn = vnoise(vec2(s * 0.9 + 1.0, age * 5.0)) ;
    kelvin = mix(kelvin, 1505.0 + 55.0 * churn, pool * behind * (1.0 - drop) * (1.0 - raft) * (1.0 - 0.6 * smoothstep(0.5, 0.95, u)));
  }
  // The front shoves the skin of the reach it runs into before it: a dark collar of jammed plates that goes down with the head.
  float shove = smoothstep(uSurge.x + 13.0, uSurge.x + 4.5, len) * smoothstep(uSurge.x - 0.5, uSurge.x + 3.5, len) * uSurge.y * smoothstep(2.0, 9.0, len) * (1.0 - lay);
  if (shove > 0.0) {
    float jam = vnoise(vec2(s * 0.9 + 4.0, (len - uSurge.x) * 0.55));
    kelvin = mix(kelvin, mix(1000.0, 1130.0, jam) + 300.0 * smoothstep(0.07, 0.0, abs(jam - 0.5)), 0.9 * shove * smoothstep(0.1, 0.35, jam + 0.25 * (1.0 - u)));
  }
  kelvin = mix(kelvin, 1560.0, front * front * (0.45 + 0.55 * smoothstep(0.25, 0.7, streak)) * (1.0 - 0.4 * raft));
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
  gPx = max(max(length(gDx), length(gDy)), 0.01);
  vec2 lava = stream(vFlow, vBank.w, vIn.yz, vWorld.xz);
  // Where the toe of the fan goes under the lake its skin is broken by the lake's heave, and the edge glows.
  // There the melt pools behind its own crust in a ragged band, near white where it breaks out, and small flames stand along it.
  float toeFan = smoothstep(${f(FAN_FROM + 8)}, ${f(FAN_FROM + 16)}, vFlow.w) * lava.x;
  if (toeFan > 0.0 && vWorld.y < 14.5) {
    float toeTop = 1.5 + 5.0 * vnoise(vec2(vWorld.x / 5.0, 3.0)) + 1.5 * vnoise(vec2(vWorld.x / 1.4, 7.0));
    float toeOn = 0.7 + 0.3 * smoothstep(0.22, 0.42, vnoise(vec2(vWorld.x / 7.0, 11.0)) + 0.25 * vnoise(vWorld.xz / 1.3));
    float toe = smoothstep(toeTop, 0.55 * toeTop, vWorld.y) * toeFan * toeOn;
    float toeK = 1400.0 + 175.0 * smoothstep(0.35, 0.75, vnoise(vec2(vWorld.x / 2.3, vWorld.y * 1.4))) - 240.0 * smoothstep(0.55, 0.8, vnoise(vWorld.xz / 1.1 + 9.0));
    lava.y = mix(lava.y, max(lava.y, toeK), toe);
  }
  vec3 c = blackbody(lava.y);
  // The sheet's own mark: above zero the apron the river built, below zero the skinned shelf of melt on the floor of the mouth.
  float apron = max(vApron, 0.0);
  // The shelf is level melt under a skin: the sheer face of the sill under it is rock, and no seam of the shelf runs down it.
  float shelf = max(-vApron, 0.0) * smoothstep(0.55, 0.8, normalize(vNormal).y);
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
    // The stream's light on its banks is the rig's: it lays a strip of light along the course, and nothing is lit twice here.
    // The banks are rubble and spatter, not a screen: lumps of it stand in the stream's light and the hollows between them are in
    // their shade, so the lit bank is broken ground and no flat orange film.
    float lump = 0.45 * vnoise(vWorld.xz * 0.42 + vWorld.y * 0.3) + 0.35 * vnoise(vWorld.xz * 1.3 + 5.0) + 0.2 * plates(vWorld.xz / 2.6 + vWorld.y * 0.21).x;
    float bankOcc = mix(1.0, 0.16 + 0.84 * smoothstep(0.4, 0.52, lump), smoothstep(18.0, 6.0, side) * (1.0 - shelf) * (1.0 - vIn.x));
    // The rig's strip of light along the course is the river of the picture and does not know the surge. The fuller river lights
    // its banks more, the head most of all, and the light goes down the course with the front: nothing of it before the strike.
    float fuller = (0.5 * smoothstep(uSurge.x + 2.0, uSurge.x - 8.0, vFlow.w) + 2.0 * exp(-abs(vFlow.w - uSurge.x) / 9.0)) * uSurge.y * smoothstep(0.0, 6.0, uSurge.x) * smoothstep(${f(FAN_FROM + 16)}, ${f(FAN_FROM)}, vFlow.w);
    // It comes from the stream, low and from the side: a face that looks at the stream takes it and one that looks away does not,
    // so the lit bank keeps its form.
    float faces = clamp(dot(n, normalize(vec3(vBank.x, -0.3, vBank.y))) * 0.5 + 0.6, 0.0, 1.0);
    vec3 answer = blackbody(1480.0) * 3.14159 * 0.2 * fuller * faces * exp(-max(side, 0.0) / 8.0) * (1.0 - shelf);
    vec3 r = rockShade(vWorld, n, v, albedo, bankOcc, answer, ${f(TUBE.lipZ)} - vWorld.z);
    // The rock the lava touches is itself hot for a hand's breadth.
    // The hand's breadth is counted from where the lava ends, which is not everywhere the edge of its bed: counted from the bed, a
    // bed wider than its lava glowed as a flat panel.
    float brim = mix(vIn.y - gHalf, 0.3, smoothstep(0.3, 0.5, vIn.z));
    r += blackbody(max(1110.0 - 420.0 * max(brim, 0.0), 500.0)) * smoothstep(1.0, 0.0, brim) * smoothstep(-2.0, -0.6, brim) * (0.5 + 0.5 * vnoise(vWorld.xz * 2.3)) * (1.0 - shelf);
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
    // On the fan the crust lies between open rivulets and is warm with their light. On the stream it lies low in its bed between
    // the strands and takes little light: lit as the banks are, it stood as a flat orange film.
    // A lobe of the fan is lit at its rim by the joint beside it and is dark in its middle.
    vec3 glow = blackbody(1300.0) * 3.14159 * (0.06 - 0.02 * still_) * (0.5 + 0.5 * n.y) * mix(1.0, 0.3 + 1.7 * smoothstep(0.38, 0.0, gCell.x), still_);
    c += cool * rockShade(vWorld, n, normalize(cameraPosition - vWorld), skin * (0.8 - 0.45 * still_), mix(0.35, 1.0, still_), glow, ${f(TUBE.lipZ)} - vWorld.z);
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

// The fume the fall gives off: puffs that leave the foot of each drop, rise in the heat, lean east with the place's wind and thin out.
// Each is a pure function of time. `aFrom`: where it leaves, and its metres from the lip. `aLife`: its phase and its life in seconds,
// its rise in metres a second, its size. `aSeed`: its own numbers.
export const FUME_VERTEX = /* glsl */ `
uniform float uTime;
uniform vec4 uSurge;
attribute vec4 aFrom;
attribute vec4 aLife;
attribute vec4 aSeed;
varying vec2 vDisc;
varying vec4 vPuff;
varying float vHigh;
varying vec3 vCentre;
void main() {
  float age = mod(uTime + aLife.x, aLife.y);
  float k = age / aLife.y;
  // It leaves fast over the melt and slows as it cools, and the wind has more of it the higher it stands.
  float rise = aLife.z * age * (1.0 - 0.4 * k);
  float size = mix(1.3, 5.0 + 4.5 * aLife.w, pow(k, 0.75));
  vec3 centre = aFrom.xyz + vec3(0.65 * rise * (0.35 + 0.65 * k), rise, 0.12 * rise) + vec3(sin(age * 0.9 + aSeed.x * 6.28), 0.0, cos(age * 0.7 + aSeed.y * 6.28)) * 0.5 * k * size;
  vec4 view = viewMatrix * vec4(centre, 1.0);
  view.xy += position.xy * 2.0 * size;
  gl_Position = projectionMatrix * view;
  vDisc = position.xy * 2.0;
  // The river behind the surge's front gives off more.
  float more = 1.0 + 1.2 * smoothstep(uSurge.x + 4.0, uSurge.x - 12.0, aFrom.w) * uSurge.y;
  // Before the dark of the opening a puff would stand as a pale disc: by the height of the lip it has thinned to nothing.
  float below = smoothstep(${f(TUBE.floor + 3)}, ${f(TUBE.floor - 9)}, centre.y + 0.5 * size);
  vPuff = vec4(k, aSeed.z, smoothstep(0.0, 0.14, k) * pow(1.0 - k, 1.4) * more * aSeed.w * below, age);
  vCentre = centre;
  vHigh = rise + position.y * 2.0 * size;
}`;

export const FUME_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vDisc;
varying vec4 vPuff;
varying float vHigh;
varying vec3 vCentre;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  float r = length(vDisc);
  // No puff is a disc: its outline is eaten by its own turbulence, which rolls upward as it rises.
  float wisp = 0.6 * vnoise(vDisc * 1.5 + vPuff.y * 17.0 + vec2(0.0, -0.25 * vPuff.w)) + 0.4 * vnoise(vDisc * 3.4 + vPuff.y * 31.0 + vec2(0.0, -0.4 * vPuff.w));
  float alpha = smoothstep(1.0, 0.15, r + 0.75 * (wisp - 0.5)) * vPuff.z;
  // Lit from below by the melt it leaves, and by the dusk above that: orange at its foot, grey-brown where it has risen.
  vec3 c = vec3(0.5, 0.46, 0.43) * (blackbody(1400.0) * 0.026 * exp(-max(vHigh, 0.0) / 7.0) + skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159 * 0.4 * skyOpen(vCentre));
  gl_FragColor = vec4(rigOut(c), alpha);
  if (alpha < 0.003) discard;
}`;
