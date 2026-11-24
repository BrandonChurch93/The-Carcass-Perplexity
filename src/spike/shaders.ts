import { HASH_GLSL } from '../core/post';

const SKY_GLSL = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uSunColor;
vec3 skyColor(vec3 rd) {
  float up = max(rd.y, 0.0);
  vec3 c = mix(vec3(0.030, 0.034, 0.045), vec3(0.24, 0.125, 0.062), pow(1.0 - up, 3.5));
  float s = max(dot(rd, uSun), 0.0);
  c += uSunColor * (0.035 * pow(s, 5.0) + 0.35 * pow(s, 48.0));
  return c * mix(1.0, 0.45, smoothstep(0.0, -0.25, rd.y));
}`;

const FIRE_GLSL = /* glsl */ `
vec3 fire(float t) {
  return vec3(1.0, 0.10 + 0.40 * t, 0.015 + 0.11 * t * t) * t * t;
}`;

const SHADOW_GLSL = /* glsl */ `
uniform sampler2D tShadow;
uniform mat4 uShadowMatrix;
uniform float uShadowTexel;
float shadowTap(vec3 p) {
  vec4 sc = uShadowMatrix * vec4(p, 1.0);
  vec3 s = sc.xyz * 0.5 + 0.5;
  if (s.x <= 0.0 || s.x >= 1.0 || s.y <= 0.0 || s.y >= 1.0 || s.z >= 1.0) return 1.0;
  return step(s.z - 0.0007, textureLod(tShadow, s.xy, 0.0).r);
}
float shadowSoft(vec3 p) {
  vec4 sc = uShadowMatrix * vec4(p, 1.0);
  vec3 s = sc.xyz * 0.5 + 0.5;
  if (s.x <= 0.0 || s.x >= 1.0 || s.y <= 0.0 || s.y >= 1.0 || s.z >= 1.0) return 1.0;
  float sum = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      sum += step(s.z - 0.0007, textureLod(tShadow, s.xy + vec2(float(i), float(j)) * uShadowTexel * 1.5, 0.0).r);
    }
  }
  return sum / 9.0;
}`;

export const GROUND_VERTEX = /* glsl */ `
uniform sampler2D tMap;
uniform float uWorld;
varying vec3 vWorld;
void main() {
  vec3 p = position;
  p.y = texture2D(tMap, p.xz / uWorld + 0.5).r;
  vWorld = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const DEPTH_FRAGMENT = /* glsl */ `
void main() {
  gl_FragColor = vec4(1.0);
}`;

export const GROUND_FRAGMENT = /* glsl */ `
uniform sampler2D tMap;
uniform sampler2D tSlope;
uniform sampler2D tDetail;
uniform float uWorld;
uniform float uTime;
varying vec3 vWorld;
${HASH_GLSL}
${SKY_GLSL}
${FIRE_GLSL}
${SHADOW_GLSL}

void plates(vec2 p, uint k, out float border, out vec2 toward, out float id) {
  vec2 ip = floor(p);
  vec2 fp = p - ip;
  ivec2 ic = ivec2(ip);
  vec2 r1 = vec2(8.0);
  vec2 r2 = vec2(8.0);
  float d1 = 64.0;
  float d2 = 64.0;
  ivec2 c1 = ic;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      ivec2 c = ic + ivec2(i, j);
      uint h = hash2(hash2(uint(c.x), uint(c.y)), k);
      vec2 feature = vec2(float(h & 0xffffu), float(h >> 16)) / 65536.0;
      vec2 r = vec2(float(i), float(j)) + 0.1 + 0.8 * feature - fp;
      float d = dot(r, r);
      if (d < d1) {
        d2 = d1; r2 = r1; d1 = d; r1 = r; c1 = c;
      } else if (d < d2) {
        d2 = d; r2 = r;
      }
    }
  }
  vec2 e = r2 - r1;
  toward = e / max(length(e), 0.0001);
  border = dot(0.5 * (r1 + r2), toward);
  id = rnd(c1, k + 77u);
}

vec2 bump(vec2 uv, vec2 dx, vec2 dy, float metres, float amplitude, int channel) {
  float e = 1.0 / 256.0;
  float h = textureGrad(tDetail, uv, dx, dy)[channel];
  float hx = textureGrad(tDetail, uv + vec2(e, 0.0), dx, dy)[channel];
  float hy = textureGrad(tDetail, uv + vec2(0.0, e), dx, dy)[channel];
  return vec2(hx - h, hy - h) * amplitude / (e * metres);
}

void main() {
  vec2 uv = vWorld.xz / uWorld + 0.5;
  vec4 m = texture2D(tMap, uv);
  vec4 sl = texture2D(tSlope, uv);
  float lake = smoothstep(0.35, 0.65, m.g);
  float heat = m.b;
  float tone = m.a;
  vec3 toEye = cameraPosition - vWorld;
  float dist = length(toEye);
  vec3 V = toEye / dist;
  vec3 base = normalize(vec3(-sl.x, 1.0, -sl.y));
  vec2 gx = dFdx(vWorld.xz);
  vec2 gy = dFdy(vWorld.xz);

  vec4 broad = texture2D(tDetail, vWorld.xz / 210.0);
  vec4 fine = texture2D(tDetail, vWorld.xz / 6.5 + 0.37);

  vec3 albedo = vec3(0.0);
  float rough = 0.5;
  vec2 tilt = vec2(0.0);
  vec3 emission = vec3(0.0);

  if (lake > 0.001) {
    vec2 warp = (broad.ra - 0.5) * 34.0;
    float b1; vec2 t1; float id1;
    plates((vWorld.xz + warp) / 120.0 + 4096.0, 1u, b1, t1, id1);
    b1 *= 120.0;
    float b2; vec2 t2; float id2;
    plates((vWorld.xz + warp * 0.4) / 23.0 + 4096.0, 2u, b2, t2, id2);
    b2 *= 23.0;

    float w1 = mix(0.7, 5.5, heat) * (0.55 + 0.9 * fine.r);
    float crack1 = 1.0 - smoothstep(w1 * 0.3, w1, b1);
    float w2 = 0.55 * smoothstep(0.3, 1.0, heat) * (0.4 + 1.2 * id2);
    float crack2 = w2 > 0.01 ? 1.0 - smoothstep(w2 * 0.3, w2, b2) : 0.0;
    float pulse = 0.86 + 0.14 * sin(uTime * 0.7 + id1 * 40.0);
    float temp = max(pow(crack1, 1.4) * (0.5 + 0.5 * heat) * pulse, crack2 * 0.42 * heat);
    float halo = exp(-b1 / (3.0 + 9.0 * heat)) * heat;
    emission = fire(temp) * 34.0 + fire(0.55) * halo * 1.3;

    float a = id1 * 6.2831853;
    mat2 turn = mat2(cos(a), -sin(a), sin(a), cos(a));
    vec2 flow = turn * vWorld.xz;
    vec2 ropes = turn * bump(flow / 46.0, turn * gx / 46.0, turn * gy / 46.0, 46.0, 0.85, 1);
    vec2 grain = bump(vWorld.xz / 6.5 + 0.37, gx / 6.5, gy / 6.5, 6.5, 0.035, 2);
    float curl = 1.0 - smoothstep(0.0, 5.0 + 4.0 * heat, b1);
    tilt = ropes * (1.0 - 0.7 * curl) + grain + t1 * 0.42 * curl + vec2(cos(a * 3.0), sin(a * 3.0)) * 0.025;

    float crust = mix(0.030, 0.062, tone) * (0.75 + 0.5 * id1);
    albedo = vec3(crust, crust * 0.96, crust * 0.93) * (1.0 - 0.6 * max(crack1, crack2));
    rough = mix(0.5, 0.86, fine.r);
  }

  if (lake < 0.999) {
    vec2 strata = bump(vWorld.xz / 64.0, gx / 64.0, gy / 64.0, 64.0, 4.5, 1) + bump(vWorld.xz / 9.0 + 0.11, gx / 9.0, gy / 9.0, 9.0, 0.22, 0);
    float band = 0.5 + 0.5 * sin(vWorld.y * 0.21 + broad.a * 7.0 + tone * 3.0);
    vec3 stone = mix(vec3(0.085, 0.074, 0.066), vec3(0.165, 0.135, 0.105), 0.55 * band + 0.45 * fine.r);
    float stain = smoothstep(0.55, 0.8, tone) * (1.0 - smoothstep(20.0, 110.0, vWorld.y));
    stone = mix(stone, vec3(0.33, 0.27, 0.10), 0.55 * stain);
    albedo = mix(stone, albedo, lake);
    rough = mix(0.88, rough, lake);
    tilt = mix(strata, tilt, lake);
    emission *= lake;
  }

  vec3 N = normalize(base + vec3(-tilt.x, 0.0, -tilt.y));
  float NoL = max(dot(N, uSun), 0.0);
  float NoV = max(dot(N, V), 0.001);
  vec3 H = normalize(uSun + V);
  float NoH = max(dot(N, H), 0.0);
  float sh = shadowSoft(vWorld + base * 3.0);

  float a2 = rough * rough;
  a2 *= a2;
  float dd = NoH * NoH * (a2 - 1.0) + 1.0;
  float D = a2 / (3.14159265 * dd * dd);
  float k = (rough + 1.0) * (rough + 1.0) / 8.0;
  float G = (NoL / (NoL * (1.0 - k) + k)) * (NoV / (NoV * (1.0 - k) + k));
  float F = 0.04 + 0.96 * pow(1.0 - max(dot(V, H), 0.0), 5.0);
  float spec = D * G * F / max(4.0 * NoL * NoV, 0.001);

  vec3 direct = (albedo / 3.14159265 + vec3(spec)) * uSunColor * NoL * sh;
  vec3 ambient = albedo * (skyColor(normalize(N + vec3(0.0, 0.6, 0.0))) * (0.55 + 0.45 * N.y) + fire(0.6) * sl.b * 2.4 * (1.0 - 0.5 * N.y));
  float Fenv = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
  vec3 env = skyColor(reflect(-V, N)) * Fenv * (1.0 - rough) * (1.0 - rough) * (0.4 + 0.6 * sh);

  gl_FragColor = vec4(direct + ambient + env + emission, 1.0);
}`;

export const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 v = inverse(projectionMatrix) * vec4(position.xy, 1.0, 1.0);
  vDir = (inverse(viewMatrix) * vec4(v.xyz / v.w, 0.0)).xyz;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}`;

export const SKY_FRAGMENT = /* glsl */ `
uniform sampler2D tDetail;
uniform float uTime;
varying vec3 vDir;
${SKY_GLSL}
void main() {
  vec3 rd = normalize(vDir);
  vec3 c = skyColor(rd);
  float s = max(dot(rd, uSun), 0.0);
  c += uSunColor * 6.0 * smoothstep(0.99990, 0.99996, s);
  float lift = max(rd.y, 0.0);
  vec2 q = rd.xz / (lift + 0.06) * 0.11 + vec2(uTime * 0.0006, uTime * 0.0002);
  float n = texture2D(tDetail, q).r * 0.65 + texture2D(tDetail, q * 3.1 + 0.4).r * 0.35;
  float cover = smoothstep(0.42, 0.72, n) * smoothstep(0.0, 0.12, rd.y);
  vec3 ash = mix(vec3(0.020, 0.018, 0.018), vec3(0.20, 0.10, 0.05), pow(1.0 - lift, 5.0)) + uSunColor * 0.05 * pow(s, 3.0);
  c = mix(c, ash, 0.85 * cover);
  gl_FragColor = vec4(c, 1.0);
}`;

export const EMBER_VERTEX = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uPixelsPerMetre;
varying float vLife;
varying float vGain;
void main() {
  float f = fract(uTime / aSeed.y + aSeed.x);
  float age = f * aSeed.y;
  vec3 p = position;
  p.y += aSeed.z * age * (1.0 - 0.3 * f);
  p.x += 2.2 * age + 1.8 * sin(age * 1.7 + aSeed.x * 31.0) + 0.6 * sin(age * 4.3 + aSeed.x * 77.0);
  p.z += -0.8 * age + 1.5 * sin(age * 1.3 + aSeed.x * 53.0);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float px = aSeed.w * uPixelsPerMetre / max(-mv.z, 0.1);
  float size = clamp(px, 1.5, 28.0);
  gl_PointSize = size;
  vLife = f;
  vGain = smoothstep(0.0, 0.06, f) * (1.0 - f) * min(1.0, (px * px) / (size * size));
}`;

export const EMBER_FRAGMENT = /* glsl */ `
varying float vLife;
varying float vGain;
${FIRE_GLSL}
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = 1.0 - smoothstep(0.25, 1.0, r);
  gl_FragColor = vec4(fire(1.0 - 0.75 * vLife) * 70.0 * vGain * a, 1.0);
}`;

export const FUME_FRAGMENT = /* glsl */ `
uniform sampler2D tDepth;
uniform mat4 uInvProjection;
uniform mat4 uCameraWorld;
uniform int uSeq;
uniform int uSampleIndex;
uniform sampler2D tMap;
uniform sampler2D tSlope;
uniform highp sampler3D tNoise;
uniform float uWorld;
uniform float uTime;
varying vec2 vUv;
${HASH_GLSL}
${SKY_GLSL}
${FIRE_GLSL}
${SHADOW_GLSL}

const int STEPS = 32;
const float REACH = 5200.0;

float shape(vec3 p) {
  vec3 w = vec3(uTime * 1.6, -uTime * 0.5, uTime * 0.9);
  float n = textureLod(tNoise, (p + w) * 0.0042, 0.0).r;
  float n2 = textureLod(tNoise, (p + w * 1.7) * 0.019 + 0.31, 0.0).r;
  return max(n * 0.72 + n2 * 0.28 - 0.34, 0.0) * 2.4;
}

float layers(vec3 p, out float glow) {
  vec2 uv = p.xz / uWorld + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    glow = 0.0;
    return 0.0;
  }
  float groundY = textureLod(tMap, uv, 0.0).r;
  glow = textureLod(tSlope, uv, 0.0).b;
  float y = max(p.y - groundY, 0.0);
  float low = exp(-y / (10.0 + 60.0 * glow)) * (0.12 + 1.5 * glow);
  float high = smoothstep(130.0, 280.0, p.y) * (1.0 - smoothstep(430.0, 620.0, p.y)) * 0.20;
  return (low + high) * 0.0042;
}

float haze(vec3 ro, vec3 rd, float d) {
  float b = 1.0 / 420.0;
  float k = rd.y * b;
  float f = abs(k) < 0.00001 ? d : (1.0 - exp(-k * d)) / k;
  return 0.000055 * exp(-ro.y * b) * f;
}

void main() {
  float depth = texture2D(tDepth, vUv).r;
  vec4 view = uInvProjection * vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec3 world = (uCameraWorld * vec4(view.xyz / view.w, 1.0)).xyz;
  vec3 ro = uCameraWorld[3].xyz;
  vec3 rd = world - ro;
  float far = length(rd);
  rd /= far;
  if (depth >= 1.0) far = 30000.0;
  float reach = min(far, REACH);

  float jitter = rnd(ivec2(gl_FragCoord.xy), uint(uSeq) * 8u + uint(uSampleIndex));
  float cosine = dot(rd, uSun);
  float g = 0.62;
  float phase = (1.0 - g * g) / (12.566 * pow(1.0 + g * g - 2.0 * g * cosine, 1.5)) * 0.75 + 0.25 / 12.566;
  vec3 sky = skyColor(normalize(vec3(rd.x, 0.35, rd.z)));

  vec3 sum = vec3(0.0);
  float trans = 1.0;
  float prev = 0.0;
  for (int i = 0; i < STEPS; i++) {
    float u = (float(i) + 1.0) / float(STEPS);
    float edge = reach * u * u;
    float t = mix(prev, edge, jitter);
    float dt = edge - prev;
    prev = edge;
    vec3 p = ro + rd * t;
    float glow;
    float base = layers(p, glow);
    if (base <= 0.0) continue;
    float sigma = base * shape(p);
    if (sigma <= 0.0) continue;
    float lit = shadowTap(p) * exp(-shape(p + uSun * 28.0) * base * 110.0);
    vec3 light = uSunColor * lit * phase * 12.566 * 0.05 + sky * 0.32 + fire(0.62) * glow * 2.2 * exp(-max(p.y, 0.0) / 70.0);
    float a = 1.0 - exp(-sigma * dt);
    sum += trans * a * light * 0.9;
    trans *= 1.0 - a;
    if (trans < 0.01) break;
  }

  float thin = exp(-haze(ro, rd, far));
  vec3 veil = sky * 0.55 + uSunColor * phase * 0.3;
  gl_FragColor = vec4(sum * thin + veil * (1.0 - thin), trans * thin);
}`;
