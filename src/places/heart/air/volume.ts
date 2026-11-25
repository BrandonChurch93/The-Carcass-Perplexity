// The half-size passes of the Heart's air. VOLUME writes the light the air scatters toward the camera in rgb and how much of the scene it lets through in alpha;
// WARP writes how far the scene behind each pixel is bent by hot air. Both read the rig, so the air is lit by what lights the ground.
import { HASH_GLSL } from '../../../core/post';
import { RIG_GLSL } from '../shared/glsl';

export const MAX_STEAM = 16;
export const MAX_HEAT = 12;

/** March steps. The cost of the volume is close to linear in these. */
export const STEPS = { air: 12, column: 24, steam: 9 };

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
uniform int uSteamCount;
uniform vec4 uSteamA[${MAX_STEAM}];
uniform vec4 uSteamB[${MAX_STEAM}];
uniform vec4 uSteamC[${MAX_STEAM}];

const vec3 AIR_ALBEDO = vec3(0.93, 0.92, 0.9);
const vec3 FUME_ALBEDO = vec3(0.66, 0.58, 0.51);
const vec3 STEAM_ALBEDO = vec3(0.9, 0.92, 0.95);
const vec3 SMOKE_ALBEDO = vec3(0.52, 0.46, 0.4);
const vec3 FUME_BASE = vec3(585.0, 0.0, -285.0);
const vec3 LOW_BASE = vec3(760.0, 0.0, -40.0);
const float LAKE_WIDE = 2.0;
const vec3 SKY_DIR = vec3(-0.38, 0.9, 0.22);

// What the round lights of the rig scatter toward the camera from a point of air.
vec3 roundLights(vec3 p) {
  vec3 e = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (i >= uEmitterCount) break;
    vec3 d = uEmitters[i].xyz - p;
    float r2 = uEmitters[i].w * uEmitters[i].w;
    float d2 = dot(d, d);
    // The air between takes the light up: a round light does not tint the far side of the lake.
    e += uEmitterRadiance[i] * (r2 / (d2 + r2)) * exp(-sqrt(d2) / 520.0);
  }
  return e * 0.25 * uCast;
}
// The light of the sky on a point of air. Low in the caldera it comes down through the brown fume and is the rig's fill; above the fume it is the open sky.
vec3 skyLight(float y) {
  return uSkyMean * mix(uFill, vec3(1.0), smoothstep(80.0, 380.0, y));
}

vec2 fumeAxis(float h) {
  float a = max(h - 150.0, 0.0) / 640.0;
  vec2 foot = mix(FUME_BASE.xz, vec2(500.0, -390.0), smoothstep(0.0, 170.0, h));
  return foot + vec2(-420.0 * a * a, -200.0 * a);
}
// The lower mass climbs from the open lake beyond the buttress and leans the same way.
vec2 lowAxis(float h) {
  float a = max(h, 0.0) / 500.0;
  return LOW_BASE.xz + vec2(-40.0 * a - 260.0 * a * a, -60.0 * a);
}
// The air itself: thin everywhere, heavier low over the lake, in banks that drift west, thickest where the lake is open.
// With it, the smoke the fume sheds: a broad soft veil round each of its two columns, brown where the sky lights it and orange where the lake does.
vec3 airWarm;
// How much air and how much smoke the last call found, apart: what is seen against the sky passes some of its light on, and the two do so differently.
float airHaze;
float airSmoke;
void airAt(vec3 p, out float sigma, out vec3 emit) {
  vec4 land = texture2D(tLand, (p.xz - uLandRect.xy) * uLandRect.zw);
  float y = max(p.y, 0.0);
  float overLake = smoothstep(40.0, -90.0, land.b);
  vec3 glow = lakeGlow(p.xz, max(2.0 * y, 30.0));
  float hot = clamp(lum(glow) * 0.6, 0.0, 1.0);
  vec3 q = p + vec3(1.3, -0.15, -0.45) * uTime;
  vec4 n = noise(q * vec3(0.0013, 0.0042, 0.0013));
  float banks = smoothstep(0.3, 0.75, n.g * 0.65 + n.a * 0.35);
  float open = mix(land.g, 1.0, clamp((p.y - land.r) / 80.0, 0.0, 1.0));
  vec3 lights = roundLights(p);
  // The lake lights the air over it twice: what is open right under a point, and the whole glowing floor of the caldera round it.
  vec3 under = (0.32 + 0.6 * exp(-y / 40.0)) * glow + LAKE_WIDE * exp(-y / 60.0) * lakeGlow(p.xz, 450.0);
  vec3 sky = skyLight(y);
  // The heavy air hugs the lake: a view along the surface is deep in it, a view up at the walls leaves it at once. It is heaviest downwind of the open lava.
  float layer = exp(-y / 12.0);
  float east = smoothstep(-150.0, 550.0, p.x);
  float haze = uShowAir * (0.00042 * exp(-y / 260.0) * (0.7 + 0.6 * n.a) * (0.45 + 0.55 * overLake)
        + 0.0045 * layer * overLake * (0.45 + 0.55 * east) * (0.15 + 1.7 * banks)
        + 0.0024 * exp(-y / 90.0) * smoothstep(-350.0, 350.0, p.x) * (0.4 + 1.2 * banks)
        + 0.0035 * hot * exp(-y / 70.0) * (0.35 + 1.3 * banks));
  // The smoke hangs as a curtain between the column and the lower mass: thin and narrow at the column, broad and heavy over the open lake.
  vec2 axisA = fumeAxis(p.y);
  vec2 span = lowAxis(p.y) - axisA;
  vec2 rel = p.xz - axisA;
  float along = clamp(dot(rel, span) / dot(span, span), 0.0, 1.0);
  float off = length(rel - span * along) / mix(95.0 + 0.5 * y, 230.0 + 0.7 * y, along);
  float tall = mix(smoothstep(-10.0, 80.0, p.y) * (1.0 - smoothstep(550.0, 880.0, p.y)), (0.5 + 0.5 * exp(-y / 150.0)) * (1.0 - smoothstep(520.0, 860.0, p.y)), along);
  float veil = exp(-off * off) * tall;
  // The wind draws the smoke out along itself: its billows are long downwind and keep their shape across it.
  vec3 drawn = q - vec3(0.92, 0.0, -0.4) * (0.92 * dot(q.xz, vec2(0.92, -0.4)));
  vec4 m = noise(drawn * vec3(0.0017, 0.0019, 0.0017) + 0.31);
  vec4 m2 = noise(drawn * vec3(0.0047, 0.0051, 0.0047) + 0.67);
  float billow = smoothstep(0.28, 0.72, 0.65 * m.r + 0.35 * m2.r);
  float smoke = uShowFume * mix(0.0012, 0.004, along) * veil * (0.1 + 2.1 * billow);
  float shade = exp(-1.5 * veil) * (0.6 + 0.4 * billow);
  sigma = haze + smoke;
  airHaze = haze;
  airSmoke = smoke;
  // The lake and the warm side of the sky light the low air; the high air has the colour of the sky it is seen against.
  float low = exp(-y / 250.0);
  emit = haze * AIR_ALBEDO * ((mix(0.64, 1.0, smoothstep(80.0, 380.0, y)) * sky + airWarm * low) * open + under * low + lights)
       + smoke * FUME_ALBEDO * (mix(0.7, 1.5, smoothstep(120.0, 380.0, y)) * sky * open * shade + 4.0 * under + 1.3 * lights);
}

// 0 outside the column, 1 on its axis.
float columnShape(vec3 p) {
  float h = p.y;
  if (h < -5.0 || h > 800.0) return 0.0;
  float d = length(p.xz - fumeAxis(h)) / (62.0 + 0.55 * h);
  return clamp(1.0 - d, 0.0, 1.0) * (1.0 - smoothstep(560.0, 800.0, h)) * smoothstep(-5.0, 30.0, h);
}
// The plume's own flow: the lumps climb and drift west as one body. One speed for the whole of it, so that the lumps are never drawn out by the time that has passed.
vec3 columnFlow(vec3 p) {
  return p + vec3(1.1, -3.4, 0.3) * uTime;
}
// The body of a plume: lumps of three sizes cut by its shape, so that its surface is where the lumps end. Cheap: one read.
float lumps(vec3 q, float shape) {
  return clamp((noise(q / 300.0).r + shape * 1.5 - 1.0) * 5.0, 0.0, 1.0);
}
// The same with the small lumps on the surface, and the smallest only where the surface is: one read inside and outside, up to three on the skin.
float fumeDensity(vec3 q, float shape) {
  float body = noise(q / 300.0).r + shape * 1.5 - 1.0;
  if (body < -0.25) return 0.0;
  if (body < 0.5) {
    body += (noise(q / 77.0 + 0.37).r - 0.55) * 0.5;
    if (abs(body) < 0.14) body += (noise(q / 21.0 + 0.71).b - 0.5) * 0.16;
  }
  return clamp(body * 6.0, 0.0, 1.0);
}

// One of the vapours the other folders ask for: a column that widens and thins as it rises and bends with the wind.
void steamOne(int i, vec3 ro, vec3 rd, float far, float jitter, inout vec3 sum, inout float trans, inout float first) {
  vec4 A = uSteamA[i];
  vec4 B = uSteamB[i];
  vec4 C = uSteamC[i];
  float rise = B.z;
  vec3 lean = vec3(B.x, 1.0, B.y);
  float kind = min(C.w, 1.0);
  bool fume = C.w > 1.5;
  float spread = fume ? 0.42 : mix(0.24, 0.3, kind);
  // Steam is gone well before its top and smoke a little before: the bounds stop where there is nothing left to see.
  float top = rise * mix(0.72, 0.86, kind);
  // Bounds: in the space where the column stands upright it is inside a round tower.
  float shear = mix(1.1, 1.2, kind);
  vec3 o = ro - A.xyz;
  vec2 oxz = o.xz - B.xy * shear * o.y;
  vec2 dxz = rd.xz - B.xy * shear * rd.y;
  float tower = 1.4 * (A.w + top * spread) + rise * mix(0.1, 0.16, kind) * length(B.xy) + (A.w * 0.3 + top * 0.125);
  float qa = dot(dxz, dxz);
  float qb = dot(oxz, dxz);
  float qc = dot(oxz, oxz) - tower * tower;
  float t0 = 0.0;
  float t1 = far;
  if (qa > 1e-8) {
    float qh = qb * qb - qa * qc;
    if (qh < 0.0) return;
    qh = sqrt(qh);
    t0 = max(t0, (-qb - qh) / qa);
    t1 = min(t1, (-qb + qh) / qa);
  } else if (qc > 0.0) return;
  if (abs(rd.y) > 1e-5) {
    float ya = -o.y / rd.y;
    float yb = (top - o.y) / rd.y;
    t0 = max(t0, min(ya, yb));
    t1 = min(t1, max(ya, yb));
  } else if (o.y < 0.0 || o.y > top) return;
  if (t1 <= t0) return;
  vec3 albedo = C.w > 1.5 ? FUME_ALBEDO : mix(STEAM_ALBEDO, SMOKE_ALBEDO, C.w);
  // A fume stands over open lava and is seen against it: it takes far more of that light than a wisp of steam does.
  float lit = fume ? 1.7 : mix(1.5, 1.0, kind);
  float dt = (t1 - t0) / float(${STEPS.steam});
  for (int k = 0; k < ${STEPS.steam}; k++) {
    float t = t0 + (float(k) + jitter) * dt;
    vec3 p = ro + rd * t;
    float h = p.y - A.y;
    float u = h / rise;
    if (u < 0.0 || u > 1.0) continue;
    vec2 centre = A.xz + B.xy * h * (0.45 + 1.1 * u) + (noise(vec3(u * 0.7, uTime * 0.11, C.x)).ga - 0.5) * (A.w * 0.6 + h * 0.25);
    float r = A.w + h * spread;
    float d = length(p.xz - centre) / r;
    if (d >= 1.4) continue;
    vec3 q = p - A.xyz;
    q -= lean * (C.y * uTime);
    q = q / C.z + C.x;
    // Its outline is ragged by the same lumps that fill it; it is thick at the vent, thinned by its own widening, and gone well before the top.
    float n1 = noise(q).r;
    float ragged = d + (n1 - 0.5) * 0.8;
    if (ragged >= 1.0) continue;
    float thin = A.w / r;
    float body = (1.0 - smoothstep(0.2, 1.0, ragged)) * smoothstep(0.0, 0.05, u) * pow(1.0 - u, fume ? 1.6 : mix(3.0, 2.6, kind)) * mix(1.0, thin, 0.6);
    float fine = mix(0.32, 0.12, u);
    float wisps = smoothstep(mix(0.36, 0.44, kind), 0.82, n1 * (1.0 - fine) + noise(q * 2.7).b * fine);
    // Steam is a veil with knots in it; smoke is lumps with gaps between them.
    float dens = body * mix(0.05 + 1.6 * wisps, 2.6 * wisps, kind);
    if (dens <= 0.0) continue;
    float sigma = dens * B.w;
    vec3 light = mix(1.25, 0.7, kind) * skyLight(p.y) * (1.0 - 0.35 * min(dens, 1.0)) + lit * (0.3 * lakeGlow(p.xz, max(1.5 * h, 6.0)) + roundLights(p));
    float a = 1.0 - exp(-sigma * dt);
    sum += trans * a * albedo * light;
    trans *= 1.0 - a;
    if (first < 0.0) first = t;
  }
}

void main() {
  vec3 ro;
  vec3 rd;
  float far;
  viewRay(ro, rd, far);
  // One draw of chance for the pixel and the frame, moved on by the golden ratio for each sample: the samples of a frame fall between each other, so four of them march four times as finely.
  float jitter = fract(rnd(ivec2(gl_FragCoord.xy), uint(uSeq)) + 0.61803399 * float(uSampleIndex));

  // The vapours first, each as a sheet at its own distance; the air is then marched from the camera and takes them in as it passes them.
  vec3 steamSum = vec3(0.0);
  float steamTrans = 1.0;
  float steamAt = -1.0;
  vec3 fumeSum = vec3(0.0);
  float fumeTrans = 1.0;
  float fumeAt = -1.0;

  if (uShowFume > 0.5) {
    for (int i = 0; i < ${MAX_STEAM}; i++) {
      if (i >= uSteamCount) break;
      steamOne(i, ro, rd, far, fract(jitter + 0.618 * float(i + 1)), steamSum, steamTrans, steamAt);
    }

    // The column: four balls along its axis bound it.
    float c0 = 1e9;
    float c1 = -1e9;
    float a0;
    float a1;
    if (hitBall(ro, rd, vec3(fumeAxis(70.0), 70.0).xzy, 150.0, a0, a1)) { c0 = min(c0, a0); c1 = max(c1, a1); }
    if (hitBall(ro, rd, vec3(fumeAxis(230.0), 230.0).xzy, 215.0, a0, a1)) { c0 = min(c0, a0); c1 = max(c1, a1); }
    if (hitBall(ro, rd, vec3(fumeAxis(420.0), 420.0).xzy, 300.0, a0, a1)) { c0 = min(c0, a0); c1 = max(c1, a1); }
    if (hitBall(ro, rd, vec3(fumeAxis(640.0), 640.0).xzy, 400.0, a0, a1)) { c0 = min(c0, a0); c1 = max(c1, a1); }
    c0 = max(c0, 0.0);
    c1 = min(c1, far);
    if (c1 > c0) {
      // Find where the view enters the column from its shape alone, which costs no reads; then walk in short steps from there, so that the lumps keep their edges.
      float coarse = (c1 - c0) / 20.0;
      float entry = -1.0;
      for (int k = 0; k <= 20; k++) {
        float t = c0 + float(k) * coarse;
        if (columnShape(ro + rd * t) > 0.03) { entry = max(t - coarse, c0); break; }
      }
      float weight = 0.0;
      float where = 0.0;
      if (entry >= 0.0) {
        float lo = entry;
        float hi = entry + coarse;
        for (int k = 0; k < 3; k++) {
          float mid = 0.5 * (lo + hi);
          if (columnShape(ro + rd * mid) > 0.03) hi = mid; else lo = mid;
        }
        float dt = 7.0;
        float t = lo + fract(jitter + 0.37) * dt;
        for (int k = 0; k < ${STEPS.column}; k++) {
          if (t > c1) break;
          vec3 p = ro + rd * t;
          float here = t;
          float len = dt;
          t += dt;
          dt *= 1.06;
          float shape = columnShape(p);
          if (shape <= 0.0) continue;
          vec3 q = columnFlow(p);
          float dens = fumeDensity(q, shape);
          if (dens <= 0.0) continue;
          // Its own shade: how much of the plume lies between this point and the sky, and between it and the lake.
          vec3 p1 = p + SKY_DIR * 9.0;
          vec3 p2 = p + SKY_DIR * 48.0;
          vec3 p3 = p - vec3(0.0, 45.0, 0.0);
          // The near one tells which way the lump's face looks, the far one what stands over it.
          float skyT = exp(-(fumeDensity(columnFlow(p1), columnShape(p1)) * 1.5 + lumps(columnFlow(p2), columnShape(p2)) * 0.8));
          float underT = exp(-lumps(columnFlow(p3), columnShape(p3)) * 1.6);
          vec3 light = skyLight(p.y) * (0.2 + 1.45 * skyT) + (roundLights(p) + 0.5 * lakeGlow(p.xz, max(2.0 * p.y, 60.0))) * (0.25 + 0.75 * underT);
          float a = 1.0 - exp(-dens * 0.045 * len);
          fumeSum += fumeTrans * a * FUME_ALBEDO * light;
          weight += fumeTrans * a;
          where += fumeTrans * a * here;
          fumeTrans *= 1.0 - a;
          if (fumeTrans < 0.02) break;
        }
      }
      if (weight > 0.0) fumeAt = where / weight;
    }
  }

  vec3 sum = vec3(0.0);
  float trans = 1.0;
  float reach = min(far, 3400.0);
  if (rd.y > 0.0) reach = min(reach, max((900.0 - ro.y) / rd.y, 0.0));
  float prev = 0.0;
  float j = fract(jitter + 0.13);
  // The warm side of the rig's sky reaches the air too: it is seen when the view runs toward it.
  float toward = max(dot(rd, uWarmDir), 0.0);
  airWarm = uWarmColour * (0.2 * toward * toward);
  float thick = 0.0;
  for (int i = 0; i < ${STEPS.air}; i++) {
    float edge = reach * pow((float(i) + 1.0) / float(${STEPS.air}), 1.7);
    float dt = edge - prev;
    vec3 p = ro + rd * mix(prev, edge, j);
    float sigma;
    vec3 emit;
    airAt(p, sigma, emit);
    vec3 glowing = sigma > 0.0 ? emit / sigma : vec3(0.0);
    // A vapour that stands inside this stretch of air is laid at its own distance: the air before it, the vapour, then the rest of the air.
    float from = prev;
    for (int n = 0; n < 2; n++) {
      bool steamIn = steamAt >= 0.0 && steamAt < edge;
      bool fumeIn = fumeAt >= 0.0 && fumeAt < edge;
      if (!steamIn && !fumeIn) break;
      bool steamFirst = steamIn && (!fumeIn || steamAt <= fumeAt);
      float at = max(steamFirst ? steamAt : fumeAt, from);
      float a = 1.0 - exp(-sigma * (at - from));
      sum += trans * a * glowing;
      trans *= 1.0 - a;
      from = at;
      if (steamFirst) { sum += trans * steamSum; trans *= steamTrans; steamAt = -1.0; }
      else { sum += trans * fumeSum; trans *= fumeTrans; fumeAt = -1.0; }
    }
    float a = 1.0 - exp(-sigma * (edge - from));
    sum += trans * a * glowing;
    trans *= 1.0 - a;
    thick += (0.9 * airHaze + 0.12 * airSmoke) * dt;
    prev = edge;
  }
  if (steamAt >= 0.0) { sum += trans * steamSum; trans *= steamTrans; }
  if (fumeAt >= 0.0) { sum += trans * fumeSum; trans *= fumeTrans; }
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
  float jitter = rnd(ivec2(gl_FragCoord.xy), uint(uSeq) * 8u + uint(uSampleIndex));

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
