// The shaders of the fall's folder.
import { MOUTH } from '../layout';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { FAN_FROM, FAN_HEAD, TUBE } from './path';

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
  return 0.006 + 0.85 * exp(-d / 6.0) * mix(uFlare, 1.0, smoothstep(1.0, 9.0, d));
}
// d is metres into the tube from its rim, negative outside.
vec3 riverLight(vec3 p, vec3 n, float d) {
  if (d < -16.0) return vec3(0.0);
  vec2 to = vec2(riverX(max(d, 0.0)) - p.x, ${f(TUBE.floor)} - p.y);
  float far = length(to);
  float w = 15.0;
  float form = pow(w / sqrt(w * w + far * far), 1.25);
  float facing = clamp(dot(n.xy, to / max(far, 0.01)) * 0.92 + 0.08, 0.0, 1.0);
  // Out on the face of the cliff the light dies away raggedly: it is the fume before the mouth that carries it there.
  float outside = max(-d, 0.0) * (0.7 + 0.6 * vnoise(p.xy / 9.0));
  float reach = pow(smoothstep(9.0, 0.0, outside), 2.0);
  // The roof fall heaped on the floor stands between the river and the foot of the far wall.
  reach *= mix(1.0, smoothstep(0.1, 0.45, -to.y / max(far, 0.01)), smoothstep(15.0, 40.0, far));
  // The lip hides the river from the cliff below it.
  if (d < 0.0) reach *= smoothstep(${f(TUBE.floor - 1)}, ${f(TUBE.floor + 4)}, p.y);
  return blackbody(1300.0) * riverOpen(max(d, 0.0)) * 3.14159 * 3.5 * form * facing * reach;
}
// The rig's shading, with the day and the lake shut out as the tube goes in.
vec3 rockShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float occ, vec3 more, float d) {
  float deep = smoothstep(2.0, 34.0, d);
  float lit = (1.0 - deep) * (1.0 - deep);
  float open = skyOpen(p) * occ * lit;
  vec3 e = skyIrradiance(n) * open + (lakeIrradiance(p, n) + emitterIrradiance(p, n) * smoothstep(14.0, 3.0, d)) * occ * lit + riverLight(p, n, d) * occ + more * occ;
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
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float inside = vSkin.z;
  // The face of the cliff has no skin: its distance from the arch is reckoned from the arch itself.
  vec2 q = vec2(abs(vWorld.x - uArch.x) / uArch.z, max(vWorld.y - uArch.y, 0.0) / uArch.w);
  float beyond = max((pow(pow(q.x, ${f(TUBE.power)}) + pow(q.y, ${f(TUBE.power)}), ${f(1 / TUBE.power)}) - 1.0) * 58.0, uArch.y - vWorld.y);
  float d = vSkin.x >= 0.5 ? -vSkin.y : -max(beyond, 0.0);
  vec3 c = vec3(0.0);
  // Far inside no light reaches and there is no rock to draw.
  if (inside < 0.5 || d < 90.0) {
    // The wall, mapped as the land maps it (the picture upright on the face, sixty metres to a repeat) so the two do not show a join.
    // On the rim and in the tube that mapping has no direction (the roof, the bevel), and the picture is laid on from the three axes.
    float own = step(0.5, vSkin.x) * smoothstep(36.0, 18.0, vSkin.y);
    vec3 cliff = vec3(0.0);
    float tri = max(own, inside);
    float out_ = 1.0 - inside;
    if (tri < 1.0) {
      float kx = smoothstep(0.3, 0.7, n.x * n.x / (n.x * n.x + n.z * n.z + 1e-5));
      vec2 uv = mix(vWorld.xy, vWorld.zy, step(0.5, kx)) / 60.0;
      vec3 relief = texture2D(tCliffNh, uv).rgb;
      cliff += (1.0 - tri) * texture2D(tCliff, uv).rgb * (0.6 + 0.8 * relief.b);
      n = normalize(n + (1.0 - tri) * 1.6 * (mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), step(0.5, kx)) * (relief.r - 0.5) - vec3(0.0, 1.0, 0.0) * (relief.g - 0.5)));
    }
    if (tri > 0.0) cliff += tri * threeWay(tCliff, vWorld / 47.0, n);
    cliff *= 0.75 + 0.5 * vnoise(vec2(vWorld.y * 0.9 + 3.0 * vnoise(vWorld.xz / 25.0), 0.5));
    // Beds and joints: the wall breaks in ledges along its beds and in cracks down its joints.
    float along = vWorld.x + 0.4 * vWorld.z;
    float bedY = vWorld.y * 0.32 + 1.8 * vnoise(vWorld.xz / 31.0) + 0.5 * vnoise(vec2(along / 7.0, vWorld.y / 5.0));
    float ledge = vnoise(vec2(bedY, 7.0)) - vnoise(vec2(bedY + 0.25, 7.0));
    n = normalize(n + vec3(0.0, 1.0, 0.0) * ledge * 2.4 * out_);
    float joint = abs(vnoise(vec2(along / 5.5 + 0.7 * vnoise(vec2(vWorld.y / 9.0, along / 30.0)), floor(bedY) * 3.7 + vWorld.y / 6.5)) - 0.5);
    cliff *= 1.0 - out_ * (0.5 * smoothstep(0.05, 0.22, ledge) + 0.5 * smoothstep(0.025, 0.0, joint));
    cliff *= fineRock(vWorld, max(own, 0.6 * out_), n);
    // Soot and glaze inside: the lining of a tube is darker than the wall it runs through.
    cliff *= mix(1.0, 0.5, smoothstep(0.0, 30.0, -vSkin.y) * inside);
    // Under the sill the wall is draped with what has slopped over it, black and glazed.
    cliff *= mix(1.0, 0.5, smoothstep(${f(TUBE.floor + 3)}, ${f(TUBE.floor - 5)}, vWorld.y) * smoothstep(${f(TUBE.floor - 70)}, ${f(TUBE.floor - 30)}, vWorld.y) * out_);
    // The rim is the youngest rock of the wall, glazed by what has poured through it.
    cliff *= mix(1.0, 0.6, own);
    // The roof and walls go back in ribs, one for each time the tube ran full, and the side of each rib that faces the mouth
    // catches the light of the melt on the floor there. They go into the dark one behind another.
    vec3 more = vec3(0.0);
    if (inside > 0.5 && d > 2.0) {
      float ph = d / 12.0 + 1.5 * vnoise(vec2(vWorld.x / 21.0 + vWorld.y / 27.0, d / 37.0)) + 0.35 * vnoise(vec2(vWorld.x / 4.0, vWorld.y / 4.0 + d / 9.0));
      float rib = fract(ph);
      float lit = smoothstep(0.0, 0.08, rib) * smoothstep(0.42, 0.1, rib);
      vec2 to = vec2(riverX(0.0) - vWorld.x, ${f(TUBE.floor)} - vWorld.y);
      float form = 34.0 / sqrt(34.0 * 34.0 + dot(to, to));
      more = blackbody(1300.0) * 3.14159 * 1.5 * lit * form * exp(-d / 15.0) * smoothstep(2.0, 11.0, d) * (0.35 + 1.0 * vnoise(vec2(vWorld.x / 5.0 + vWorld.y / 7.0, d / 3.5)));
      cliff *= 1.0 + 0.6 * lit;
    }
    c = rockShade(vWorld, n, v, cliff, 1.0, more, d);
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
  // Last, so that no texture is read beside a pixel already thrown away.
  if (hiddenByWall(vWorld, vSkin.z)) discard;
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
  return (1.0 - smoothstep(0.24 * w, 0.36 * w, m)) * step(0.3, h);
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
  // The fuller stream does not widen evenly: lobes of it ride down each edge with the lava and fold over the bank.
  float lobe = vnoise(vec2(age * 1.1 + 3.0, s > 0.0 ? 5.0 : 13.0)) + 0.5 * vnoise(vec2(age * 3.1, s > 0.0 ? 7.0 : 17.0)) - 0.25;
  float half_ = flow.z * ragged * (1.0 + behind * (0.1 + 0.6 * lobe) * (1.0 - 0.8 * smoothstep(${f(FAN_FROM)}, ${f(FAN_FROM + 12)}, len)) + front * (0.6 + 0.6 * lobe));
  // At a drop the stream necks as it quickens.
  half_ *= 1.0 - 0.28 * smoothstep(2.4, 5.2, speed) * (1.0 - smoothstep(${f(FAN_FROM - 4)}, ${f(FAN_FROM + 6)}, len));
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
  // A thin skin over most of it, orange; open lava down the middle and wherever a cascade tears the skin; red at the margins.
  // Open lava only in threads, most of them down the middle and where a cascade pulls the skin apart. Rock in the stream chills what passes it.
  float thread = mk.y;
  float kelvin = mix(1100.0, 1370.0, 1.0 - smoothstep(0.25, 0.97, u)) - 170.0 * (streak - 0.47) + fast * (30.0 + 30.0 * wave) + 70.0 * smoothstep(40.0, 0.0, len);
  // Down a cascade the sheet parts into strands, and what runs between them is thinner and cooler.
  float strand = smoothstep(0.5, 0.68, 0.7 * vnoise(vec2(s * 0.8 + 2.0, age * 0.22)) + 0.3 * vnoise(vec2(s * 2.6, age * 0.9 + 4.0)));
  kelvin -= 170.0 * strand * fast * smoothstep(1.0, 7.0, len);
  kelvin = mix(kelvin, 1500.0, clamp(thread * (0.35 + 0.65 * fast + 0.5 * (1.0 - smoothstep(0.0, 0.5, u))), 0.0, 1.0) * (0.25 + 0.75 * streak) * (1.0 - 0.7 * smoothstep(0.35, 0.95, u)));
  kelvin -= 150.0 * smoothstep(0.0, 0.3, away.y);
  kelvin = min(kelvin, 1520.0);
  // Rafts of skin: they gather on the benches and along the margins, and the cascades tear them.
  float plate = 0.6 * vnoise(vec2(s * 0.75 + 5.0, age * 1.7)) + 0.4 * vnoise(vec2(s * 1.9, age * 4.1 + 2.0));
  float want = mix(0.47, 0.72, fast) - 0.2 * smoothstep(0.45, 0.95, u) + 0.1 * behind - 0.12 * smoothstep(0.0, -90.0, len);
  float raft = smoothstep(want, want + 0.07, plate) * (1.0 - lay);
  float tear = smoothstep(0.05, 0.0, abs(vnoise(vec2(s * 1.6 + 2.0, age * 2.6)) - 0.5));
  float skin = mix(880.0, 1095.0, pow(vnoise(vec2(s * 1.2 + 4.0, age * 3.0)), 2.0));
  kelvin = mix(kelvin, mix(skin, 1360.0, tear), raft);
  // Where the slope gives out the stream spreads into a fan and skins over; it goes on under the skin and in a few open lanes.
  // The stream crosses the fan in a few thin channels that fork toward the shore; the rest is crust.
  float r = length(out_);
  float open = channel(fs, fl, r, 12.0, 2.0, 1.5);
  open = max(open, channel(fs, fl, r, 9.0, 13.0, 1.0) * smoothstep(${f(FAN_FROM + 6)}, ${f(FAN_FROM + 16)}, fl));
  open = max(open, channel(fs, fl, r, 6.0, 29.0, 0.7) * smoothstep(${f(FAN_FROM + 20)}, ${f(FAN_FROM + 32)}, fl));
  open = max(open, (1.0 - smoothstep(0.7, 1.3, abs(s + 1.2 * sin(len * 0.5)))) * smoothstep(${f(FAN_FROM + 16)}, ${f(FAN_FROM + 5)}, len));
  // Where the fan meets the lake its skin is broken by the lake's own heave and the lava shows along the shore.
  open = max(open, smoothstep(uSurge.w - 9.0, uSurge.w - 3.0, len) * smoothstep(0.5, 0.7, vnoise(vec2(fs * 0.21 + 3.0, uTime * 0.03))));
  float crack = smoothstep(0.022, 0.0, abs(vnoise(vec2(fs * 0.55 + 1.0 + 1.5 * vnoise(vec2(fl * 0.13, 1.0)), fl * 0.14 + age * 0.03)) - 0.5)) * (0.4 + 0.6 * vnoise(vec2(fs * 0.2, fl * 0.2 + 5.0)));
  float crack2 = smoothstep(0.018, 0.0, abs(vnoise(vec2(fs * 1.7 + 6.0 + 1.2 * vnoise(vec2(fl * 0.3, 7.0)), fl * 0.4 + age * 0.03)) - 0.5));
  float crust = mix(mix(700.0, 1060.0, pow(vnoise(vec2(fs * 0.8, fl * 0.8)), 2.0)), 1380.0, max(crack, 0.8 * crack2 * smoothstep(0.4, 0.7, vnoise(vec2(fs * 0.11 + 8.0, fl * 0.11)))));
  // In the fan the open lanes are what is left of the stream, and they are as hot as it was.
  kelvin = mix(kelvin, 1390.0 - 170.0 * streak + 140.0 * thread, fan);
  kelvin = mix(kelvin, crust, fan * (1.0 - open) * (1.0 - 0.45 * behind));
  // The surge: everything behind its front runs hotter and the front itself is the hottest thing in the frame.
  kelvin = mix(kelvin, 1440.0, 0.45 * behind * (1.0 - 0.7 * raft) * (0.4 + 0.6 * streak + 0.5 * thread));
  kelvin = mix(kelvin, 1530.0, front * front * (0.2 + 0.8 * smoothstep(0.25, 0.7, streak)) * (1.0 - 0.55 * raft));
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
  vec2 lava = stream(vFlow, vBank.w, vIn.yz, vWorld.xz);
  // Where the toe of the fan goes under the lake its skin is broken by the lake's heave, and the edge glows.
  lava.y = mix(lava.y, max(lava.y, 1390.0), smoothstep(0.5, 0.12, vWorld.y) * smoothstep(${f(FAN_FROM + 8)}, ${f(FAN_FROM + 16)}, vFlow.w) * (0.35 + 0.65 * vnoise(vWorld.xz / 2.7 + uTime * 0.05)));
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
    float young = max(smoothstep(22.0, 2.0, side) * (0.7 + 0.3 * vnoise(vWorld.xz * 0.35)), vApron);
    vec3 fresh = threeWay(tTalus, vWorld / 9.0, n) * 0.42;
    vec3 albedo = mix(rock, fresh, 0.9 * young);
    float own = max(max(smoothstep(30.0, 14.0, side), vIn.x), vApron);
    // Flows laid one on another: the flanks of the benches break in ledges, not in columns.
    float bedY = vWorld.y * 0.55 + 0.9 * vnoise(vWorld.xz / 9.5) + 0.5 * vnoise(vWorld.xz / 1.7);
    float ledge = vnoise(vec2(bedY, 3.0)) - vnoise(vec2(bedY + 0.22, 3.0));
    n = normalize(n + vec3(0.0, 1.0, 0.0) * ledge * 3.2 * steep * own);
    albedo *= 1.0 - 0.22 * steep * own * smoothstep(0.06, 0.2, ledge);
    albedo *= fineRock(vWorld, own, n);
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
    r += blackbody(max(1110.0 - 420.0 * max(side, 0.0), 500.0)) * smoothstep(1.0, 0.0, side) * (0.5 + 0.5 * vnoise(vWorld.xz * 2.3));
    c = mix(r, c, lava.x);
  }
  // Skin that has gone dark is a surface again: it takes the light of what still glows round it.
  float cool = lava.x * smoothstep(1090.0, 950.0, lava.y);
  if (cool > 0.0) {
    vec3 n = normalize(vNormal);
    // On the stream the skin rides with the flow; on the fan it has stopped and lies where it froze.
    float still_ = smoothstep(${f(FAN_FROM)}, ${f(FAN_FROM + 18)}, vFlow.w);
    vec2 uv = vec2(vFlow.y, vFlow.w - 2.5 * (uTime - vFlow.x)) / 5.0;
    vec3 skin = vec3(0.0);
    vec2 slope = vec2(0.0);
    if (still_ < 1.0) {
      skin += (1.0 - still_) * texture2D(tCrust, uv).rgb;
      slope += (1.0 - still_) * (texture2D(tCrustNh, uv).rg - 0.5);
    }
    if (still_ > 0.0) {
      skin += still_ * texture2D(tCrust, vWorld.xz / 6.0).rgb;
      slope += still_ * (texture2D(tCrustNh, vWorld.xz / 6.0).rg - 0.5 + 0.7 * (texture2D(tCrustNh, vWorld.xz / 1.3).rg - 0.5));
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
