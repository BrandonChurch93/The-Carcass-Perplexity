// The half-size passes of the Heart's air. VOLUME writes the light the air scatters toward the camera in rgb and how much of the scene it lets through in alpha:
// the haze is marched here, to the scene's depth, and the smoke (smoke.ts, marched before the scene is drawn) is laid into it at its own distance;
// WARP writes how far the scene behind each pixel is bent by hot air. Both read the rig, so the air is lit by what lights the ground.
import { HASH_GLSL } from '../../../core/post';
import { RIG_GLSL } from '../shared/glsl';

export const MAX_HEAT = 12;

/** March steps. The cost of the volume is close to linear in these. */
export const STEPS = { air: 8 };

const COMMON = /* glsl */ `
precision highp float;
precision highp sampler3D;
uniform highp sampler2D tDepth;
uniform mat4 uInvProjection;
uniform mat4 uCameraWorld;
uniform int uSeq;
uniform int uSampleIndex;
uniform highp sampler3D tNoise;
varying vec2 vUv;
${HASH_GLSL}
${RIG_GLSL}

vec4 noise(vec3 p) {
  return textureLod(tNoise, p, 0.0);
}
float lum(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}
// The ray of this pixel: where it starts, where it goes, and how far it gets before it meets the scene.
void viewRay(out vec3 ro, out vec3 rd, out float far) {
  // The engine lays this half-size pass over the scene by depth, and takes each texel to have been marched to the depth of the full-size pixel at twice its index.
  ivec2 pixel = 2 * ivec2(gl_FragCoord.xy);
  float depth = texelFetch(tDepth, pixel, 0).r;
  vec2 uv = (vec2(pixel) + 0.5) / vec2(textureSize(tDepth, 0));
  vec4 view = uInvProjection * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec3 world = (uCameraWorld * vec4(view.xyz / view.w, 1.0)).xyz;
  ro = uCameraWorld[3].xyz;
  rd = world - ro;
  far = length(rd);
  rd /= far;
  if (depth >= 1.0) far = 30000.0;
}
bool hitBall(vec3 ro, vec3 rd, vec3 centre, float radius, out float t0, out float t1) {
  vec3 oc = ro - centre;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - radius * radius;
  float h = b * b - c;
  if (h < 0.0) return false;
  h = sqrt(h);
  t0 = -b - h;
  t1 = -b + h;
  return t1 > 0.0;
}`;

export const VOLUME_FRAGMENT = /* glsl */ `
${COMMON}
uniform float uShowAir;
uniform float uShowFume;
uniform vec3 uSkyMean;
uniform sampler2D tSmokeNear;
uniform sampler2D tSmokeFar;
uniform sampler2D tSmokeNearAt;
uniform sampler2D tSmokeFarAt;
uniform vec2 uSmokeFit;

// The air of a caldera at dusk carries smoke: it is a little rose, never neutral.
const vec3 AIR_ALBEDO = vec3(0.95, 0.89, 0.87);
// The heavy air low over the lake is half smoke: it is darker than the clear air and warmer.
const vec3 HEAVY_ALBEDO = vec3(0.72, 0.64, 0.6);
const float LAKE_WIDE = 0.75;
const float LAYER = 12.0;

// The round lights this view passes near enough to matter: found once for the pixel, so that the march asks only those.
int nearLights[8];
int nearCount;
// The share of a round light that reaches a point, as the rig casts it on the ground: the square of the distance, then the fume takes it
// (half is left at 70 m and 1.5 radii, a sixteenth at twice that); a small light is the core of more open lava than its disc.
float lightShare(float d2, float r) {
  float reach = max(45.0 + 1.2 * r, 3.2 * r - 110.0);
  float q = (d2 + r * r) / (reach * reach);
  return r * r / (d2 + r * r) / (1.0 + q * q) * mix(4.5, 1.0, smoothstep(20.0, 60.0, r));
}
void findLights(vec3 ro, vec3 rd, float reach) {
  nearCount = 0;
  for (int i = 0; i < 8; i++) {
    if (i >= uEmitterCount) break;
    vec3 oc = uEmitters[i].xyz - ro;
    vec3 d = oc - rd * clamp(dot(oc, rd), 0.0, reach);
    if (lightShare(dot(d, d), uEmitters[i].w) > 0.004) { nearLights[nearCount] = i; nearCount++; }
  }
}
// What the round lights of the rig scatter toward the camera from a point of air.
vec3 roundLights(vec3 p) {
  vec3 e = vec3(0.0);
  for (int k = 0; k < 8; k++) {
    if (k >= nearCount) break;
    int i = nearLights[k];
    vec3 d = uEmitters[i].xyz - p;
    e += uEmitterRadiance[i] * max(lightShare(dot(d, d), uEmitters[i].w) - 0.004, 0.0);
  }
  return e * 0.25 * uCast;
}
// The light of the sky on a point of air. Low in the caldera it comes down through the brown fume and is the rig's fill; above the fume it is the open sky.
vec3 skyLight(float y) {
  return uSkyMean * mix(uFill, vec3(1.0), smoothstep(80.0, 380.0, y));
}

// The air itself: thin everywhere, heavier low over the lake, in banks that drift west, thickest where the lake is open.
vec3 airWarm;
// The glow of the whole floor of the caldera round two points of the view, near and far: it changes slowly, so the march reads it there and nowhere else.
vec3 wideNear;
vec3 wideFar;
// p is where the air is asked for, part is where that is between the two points the wide glow was read at (0 to 1), ya and yb the heights of the two ends of the stretch it stands for.
void airAt(vec3 p, float part, float ya, float yb, out float sigma, out vec3 emit) {
  vec4 land = texture2D(tLand, (p.xz - uLandRect.xy) * uLandRect.zw);
  float y = max(p.y, 0.0);
  float overLake = smoothstep(40.0, -90.0, land.b);
  vec3 q = p + vec3(1.3, -0.15, -0.45) * uTime;
  vec4 n = noise(q * vec3(0.0013, 0.0042, 0.0013));
  float banks = smoothstep(0.3, 0.75, n.g * 0.65 + n.a * 0.35);
  float open = mix(land.g, 1.0, clamp((p.y - land.r) / 80.0, 0.0, 1.0));
  vec3 lights = roundLights(p);
  // The heavy air hugs the lake: a view along the surface is deep in it, a view up at the walls leaves it at once.
  // Its share of a stretch is worked out, not drawn by chance, so a view that dives through it is as smooth as one that runs along it.
  float lo = max(min(ya, yb), 0.0);
  float hi = max(max(ya, yb), lo + 0.01);
  float layer = hi - lo < 1.0 ? exp(-0.5 * (lo + hi) / LAYER) : LAYER * (exp(-lo / LAYER) - exp(-hi / LAYER)) / (hi - lo);
  // The lake lights the air over it twice: what is open right under a point, and the whole glowing floor of the caldera round it.
  vec3 wide = mix(wideNear, wideFar, part);
  vec3 under = LAKE_WIDE * (0.3 * exp(-y / 110.0) + 0.7 * exp(-y / 14.0)) * wide;
  vec3 sky = skyLight(y);
  float east = smoothstep(-150.0, 550.0, p.x);
  // What the fume sheds settles against the buttress and east of it: a bank that stands off its west face by a few hundred metres.
  float west = -(p.x - 445.0) * 0.859 - (p.z + 322.0) * 0.512;
  float bank = smoothstep(380.0, 100.0, west) * smoothstep(-260.0, -60.0, west);
  // Clear toward the bench, heavy toward the open lake in the east: and in banks with dark air between them, not as one veil.
  float thin = uShowAir * (0.0003 * exp(-y / 260.0) * (0.7 + 0.6 * n.a) * (0.45 + 0.55 * overLake) * (0.75 + 0.35 * east + 0.45 * smoothstep(100.0, -450.0, p.z))
        + 0.0014 * exp(-y / 90.0) * bank * (0.15 + 1.7 * banks));
  // What is left of the heavy low layer away from the banks of smoke: a trace.
  float heavy = uShowAir * 0.0012 * layer * overLake * (0.2 + 0.8 * east) * (0.05 + 2.4 * banks * banks);
  float haze = thin + heavy;
  sigma = haze;
  // The lake and the warm side of the sky light the low air; the high air has the colour of the sky it is seen against.
  float low = exp(-y / 250.0);
  emit = thin * AIR_ALBEDO * ((sky + airWarm * low) * open + 0.25 * lights + 0.6 * under)
       + heavy * HEAVY_ALBEDO * ((0.9 * sky * exp(-2.8 * exp(-y / LAYER)) + airWarm * low) * open + 0.6 * under * low + 0.4 * lights);
}

// One layer of smoke as it stands before this pixel's scene: its light and what it lets through, its distance, and how much of it is in front of the scene.
void layer(sampler2D tColour, sampler2D tAt, vec2 uv, float unit, float far, out vec3 light, out float through, out float at) {
  vec4 c = texture2D(tColour, uv);
  vec4 w = texture2D(tAt, uv);
  light = vec3(0.0);
  through = 1.0;
  at = -1.0;
  if (w.w < 0.002) return;
  float mean = unit * w.x / w.w;
  float spread = max(unit * sqrt(w.z / w.w), 0.5);
  // A thing that stands inside the smoke is hidden by the part of it that is nearer.
  float part = smoothstep(mean - 1.6 * spread, mean + 1.6 * spread, far);
  if (part <= 0.0) return;
  light = c.rgb * part;
  through = mix(1.0, c.a, part);
  at = min(mean, far);
}

void main() {
  vec3 ro;
  vec3 rd;
  float far;
  viewRay(ro, rd, far);

  float reach = min(far, 3400.0);
  if (rd.y > 0.0) reach = min(reach, max((900.0 - ro.y) / rd.y, 0.0));
  findLights(ro, rd, reach);
  float wideA = min(reach * 0.3, 400.0);
  float wideB = max(min(reach * 0.85, 1300.0), wideA + 1.0);
  wideNear = lakeGlow(ro.xz + rd.xz * wideA, 450.0);
  wideFar = lakeGlow(ro.xz + rd.xz * wideB, 450.0);

  // The smoke, in two sheets at their own distances; the air is then marched from the camera and takes them in as it passes them.
  vec3 nearSum = vec3(0.0);
  float nearTrans = 1.0;
  float nearAt = -1.0;
  vec3 farSum = vec3(0.0);
  float farTrans = 1.0;
  float farAt = -1.0;
  if (uShowFume > 0.5) {
    ivec2 pixel = 2 * ivec2(gl_FragCoord.xy);
    vec2 uv = (vec2(pixel) + 0.5) / vec2(textureSize(tDepth, 0)) * uSmokeFit;
    layer(tSmokeNear, tSmokeNearAt, uv, 1.0, far, nearSum, nearTrans, nearAt);
    layer(tSmokeFar, tSmokeFarAt, uv, 100.0, far, farSum, farTrans, farAt);
  }

  vec3 sum = vec3(0.0);
  float trans = 1.0;
  float prev = 0.0;
  // The warm side of the rig's sky reaches the air too: it is seen when the view runs toward it.
  float toward = max(dot(rd, uWarmDir), 0.0);
  airWarm = uWarmColour * (0.2 * toward * toward);
  float thick = 0.0;
  // The air changes slowly along a view, so it is read at the middle of each stretch and not by chance: no grain.
  for (int i = 0; i < ${STEPS.air}; i++) {
    float edge = reach * pow((float(i) + 1.0) / float(${STEPS.air}), 1.7);
    float dt = edge - prev;
    float at = mix(prev, edge, 0.5);
    vec3 p = ro + rd * at;
    float sigma;
    vec3 emit;
    airAt(p, clamp((at - wideA) / (wideB - wideA), 0.0, 1.0), ro.y + rd.y * prev, ro.y + rd.y * edge, sigma, emit);
    vec3 glowing = sigma > 0.0 ? emit / sigma : vec3(0.0);
    // A sheet of smoke that stands inside this stretch of air is laid at its own distance: the air before it, the smoke, then the rest of the air.
    float from = prev;
    for (int n = 0; n < 2; n++) {
      bool nearIn = nearAt >= 0.0 && nearAt < edge;
      bool farIn = farAt >= 0.0 && farAt < edge;
      if (!nearIn && !farIn) break;
      bool nearFirst = nearIn && (!farIn || nearAt <= farAt);
      float cut = max(nearFirst ? nearAt : farAt, from);
      float a = 1.0 - exp(-sigma * (cut - from));
      sum += trans * a * glowing;
      trans *= 1.0 - a;
      from = cut;
      if (nearFirst) { sum += trans * nearSum; trans *= nearTrans; nearAt = -1.0; }
      else { sum += trans * farSum; trans *= farTrans; farAt = -1.0; }
    }
    float a = 1.0 - exp(-sigma * (edge - from));
    sum += trans * a * glowing;
    trans *= 1.0 - a;
    thick += 0.9 * sigma * dt;
    prev = edge;
  }
  if (nearAt >= 0.0) { sum += trans * nearSum; trans *= nearTrans; }
  if (farAt >= 0.0) { sum += trans * farSum; trans *= farTrans; }
  // The first metres of air over open lava glow with it: read at two places along the last of the view's way down to the lake.
  if (uShowAir > 0.5 && far < 3000.0 && ro.y + rd.y * far < 14.0) {
    float slant = min(min(8.0 / max(abs(rd.y), 0.03), 160.0), far);
    vec3 g1 = ro + rd * (far - slant * 0.2);
    vec3 g2 = ro + rd * (far - slant * 0.65);
    float y1 = max(g1.y, 0.0);
    float y2 = max(g2.y, 0.0);
    sum += trans * (lakeGlow(g1.xz, max(2.0 * y1, 8.0)) * exp(-y1 / 5.0) + lakeGlow(g2.xz, max(2.0 * y2, 8.0)) * exp(-y2 / 5.0)) * ((1.0 - exp(-slant * 0.05)) * 0.035);
  }
  // Air seen against the sky sends some of the sky's light on toward the camera: the sky behind a haze is paler, not darker, by less than the haze takes.
  if (far > 20000.0) sum += mix(uSkyHorizon, uSkyZenith, pow(clamp(rd.y, 0.0, 1.0), 0.45)) * trans * min(thick, 1.0);
  gl_FragColor = vec4(sum, trans);
}`;

export const WARP_FRAGMENT = /* glsl */ `
${COMMON}
uniform float uShowAir;
uniform int uHeatCount;
uniform vec4 uHeatA[${MAX_HEAT}];
uniform vec4 uHeatB[${MAX_HEAT}];

void main() {
  vec3 ro;
  vec3 rd;
  float far;
  viewRay(ro, rd, far);

  // Metres of hot air the view passes through before it reaches the scene: the last of its way down to open lava, and its way through the sources.
  float heat = 0.0;
  vec3 end = ro + rd * min(far, 2500.0);
  if (end.y < 12.0 && far < 2500.0) {
    float slant = min(9.0 / max(abs(rd.y), 0.02), 220.0);
    heat += slant * clamp(lum(lakeGlow(end.xz - rd.xz * slant * 0.4, 6.0)) / (5.0 * uCast), 0.0, 1.0) * exp(-max(end.y, 0.0) / 9.0);
  }
  for (int i = 0; i < ${MAX_HEAT}; i++) {
    if (i >= uHeatCount) break;
    vec4 A = uHeatA[i];
    vec4 B = uHeatB[i];
    // The source as a ball stretched to its height: the length of the view inside it.
    vec3 squash = vec3(1.0, A.w / max(B.x, 0.01), 1.0);
    vec3 centre = (A.xyz + vec3(0.0, B.x * 0.5, 0.0)) * squash;
    vec3 dir = rd * squash;
    float scale = length(dir);
    float t0;
    float t1;
    if (!hitBall(ro * squash, dir / scale, centre, A.w, t0, t1)) continue;
    t0 = max(t0, 0.0) / scale;
    t1 = min(t1 / scale, far);
    if (t1 > t0) heat += (t1 - t0) * B.y * 2.0;
  }
  float amount = 1.0 - exp(-heat / 36.0);
  if (amount < 0.004 || uShowAir < 0.5) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  // Fine cells that rise, tied to the direction of view and to the lens, so that they are the same few pixels wide through any lens.
  float lens = 1.0 / uInvProjection[1][1];
  vec2 ang = vec2(atan(rd.x, -rd.z), asin(clamp(rd.y, -1.0, 1.0))) * lens;
  vec3 q = vec3(ang.x * 8.0, ang.y * 8.0 - uTime * 2.3, uTime * 0.7);
  vec2 n = (noise(q).ga - 0.5) + 0.6 * (noise(q * 2.6 + 0.4).ag - 0.5);
  gl_FragColor = vec4(n * amount * 0.0034, 0.0, 1.0);
}`;
