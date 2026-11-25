// The shaders of the land. One ground shader in three variants (the wall and the country, the bench, the bench by the camera)
// and one for the loose rocks. All take their light from the rig, composed here from the functions under rigShade so that
// the land map is read once for each pixel.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const GROUND_VERTEX = /* glsl */ `
attribute vec3 aSlope;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vWorld = position;
  vNormal = aSlope;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

const COMMON = /* glsl */ `
precision highp float;
${NOISE_GLSL}
${RIG_GLSL}

// rigShade with the land map already read. lit: 1 reads the lake's light with four taps, 0 with one.
vec3 landShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float rough, float occ, vec4 land, float shade) {
  float above = p.y - land.r;
  float vis = mix(land.g, 1.0, clamp(above / 80.0, 0.0, 1.0));
  float open = vis * (1.0 - shade) * occ;
  #ifdef FAR_LIGHT
  vec3 lake = lakeIrradianceFar(p, n);
  #else
  vec3 lake = lakeIrradiance(p, n);
  #endif
  vec3 e = skyIrradiance(n) * open + (lake + emitterIrradiance(p, n)) * occ;
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float f = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.8 * rough);
  vec3 r = reflect(-v, n);
  // A glazed face that looks down at the lake carries the lake in it.
  vec3 glint = vec3(0.0);
  #ifdef GLAZE
  if (r.y < 0.0 && rough < 0.8) {
    float reach = min(max(p.y, 0.3) / max(-r.y, 0.08), 60.0);
    glint = lakeGlow(p.xz + r.xz * reach, 0.6 + reach * rough) * occ;
  }
  #endif
  r.y = abs(r.y);
  vec3 env = mix(skyRadiance(r), skyIrradiance(n) / 3.14159, rough * rough);
  return c + f * (env * open + glint);
}

float segmentDistance(vec2 p, vec4 s) {
  vec2 e = s.zw - s.xy;
  float t = clamp(dot(p - s.xy, e) / dot(e, e), 0.0, 1.0);
  return length(p - s.xy - e * t);
}
`;

// Defines: BENCH (ropy lava on the flats, the sulphur of the crack), NEAR (a second, finer reading of the rock for the camera's bench), FAR_LIGHT, GLAZE.
export const GROUND_FRAGMENT = /* glsl */ `
${COMMON}
varying vec3 vWorld;
varying vec3 vNormal;
uniform sampler2D tCliff;
uniform sampler2D tCliffNh;
uniform sampler2D tLava;
uniform sampler2D tLavaNh;
uniform sampler2D tTalus;
uniform sampler2D tTalusNh;
uniform sampler2D tBoulder;
uniform sampler2D tBoulderNh;
uniform sampler2D tSulphur;
uniform sampler2D tStrata;
uniform vec4 uCrackA;
uniform vec4 uCrackB;

const mat2 TURN = mat2(0.7986, -0.6018, 0.6018, 0.7986);

void main() {
  vec3 n0 = normalize(vNormal);
  vec3 toCamera = cameraPosition - vWorld;
  float far = length(toCamera);
  vec3 v = toCamera / far;
  vec4 land = landAt(vWorld.xz);
  float slope = 1.0 - n0.y;
  float big = vnoise(vWorld.xz / 47.0 + 3.0);
  float mid = vnoise(vWorld.xz / 6.1);
  float steep = smoothstep(0.3, 0.52, slope + 0.12 * (mid - 0.5));

  // The wall: each lava flow reads the cliff picture at its own place, so the bands run level and no two repeat.
  vec4 flow = texture2D(tStrata, vec2((vWorld.y + 5.0 * (vnoise(vWorld.xz / 310.0 + vec2(2.0, 0.0)) - 0.5)) / 340.0, 0.5));
  float wx = n0.x * n0.x;
  float wz = n0.z * n0.z;
  float kx = smoothstep(0.3, 0.7, wx / (wx + wz + 1e-5));
  float shift = flow.r * 7.0 + 0.2 * big;
  // The low crags of the bench are the same rock seen close: the picture at a fifth of the size.
  #ifdef BENCH
  const float CLIFF = 13.0;
  #else
  const float CLIFF = 60.0;
  #endif
  vec2 uvA = vec2(vWorld.z, vWorld.y) / CLIFF;
  vec2 uvB = vec2(vWorld.x, vWorld.y) / CLIFF;
  vec3 cliff = vec3(0.0);
  vec3 cliffNh = vec3(0.0);
  vec3 bump = vec3(0.0);
  if (steep > 0.003) {
    if (kx > 0.003) {
      vec2 gx = dFdx(uvA);
      vec2 gy = dFdy(uvA);
      vec3 c = textureGrad(tCliff, uvA + vec2(shift, 0.0), gx, gy).rgb;
      vec3 r = textureGrad(tCliffNh, uvA + vec2(shift, 0.0), gx, gy).rgb;
      cliff += c * kx;
      cliffNh += r * kx;
      bump += kx * (vec3(0.0, 0.0, 1.0) * (r.r - 0.5) - vec3(0.0, 1.0, 0.0) * (r.g - 0.5));
    }
    if (kx < 0.997) {
      vec2 gx = dFdx(uvB);
      vec2 gy = dFdy(uvB);
      vec3 c = textureGrad(tCliff, uvB + vec2(shift, 0.0), gx, gy).rgb;
      vec3 r = textureGrad(tCliffNh, uvB + vec2(shift, 0.0), gx, gy).rgb;
      cliff += c * (1.0 - kx);
      cliffNh += r * (1.0 - kx);
      bump += (1.0 - kx) * (vec3(1.0, 0.0, 0.0) * (r.r - 0.5) - vec3(0.0, 1.0, 0.0) * (r.g - 0.5));
    }
    // Hard flows are darker and stand proud, the rubble between them is paler; streaks run down the face.
    float streak = vnoise(vec2((vWorld.x + vWorld.z) * 0.21, vWorld.y * 0.018 + big * 2.0));
    cliff *= (0.7 + 0.8 * flow.g) * (0.75 + 0.5 * streak);
    cliff = mix(cliff, vec3(0.26, 0.25, 0.23) * (0.5 + cliffNh.b), 0.6 * smoothstep(0.5, 0.85, flow.b * (0.4 + 0.9 * big)) * smoothstep(0.4, 0.7, streak));
  }

  // The flats.
  vec2 p1 = vWorld.xz / 8.0;
  vec2 p2 = TURN * vWorld.xz / 37.0 + 0.37;
  vec3 talusA = texture2D(tTalus, p1).rgb;
  vec3 talusNhA = texture2D(tTalusNh, p1).rgb;
  vec3 talusB = texture2D(tTalus, p2).rgb;
  vec3 plain = mix(talusA, talusB, 0.5) * (0.85 + 0.6 * big);
  // Fans of fine pale scree run down the fall line between the coarse dark rubble.
  vec2 fall = n0.xz / max(length(n0.xz), 1e-3);
  float fan = vnoise(vec2(dot(vWorld.xz, vec2(-fall.y, fall.x)) / 9.0, vWorld.y / 55.0 + big));
  plain = mix(plain, vec3(0.2, 0.195, 0.185) * (0.5 + talusNhA.b), 0.55 * smoothstep(0.5, 0.8, fan) * smoothstep(0.08, 0.3, slope));
  vec3 plainNh = talusNhA;
  vec2 tip = (talusNhA.rg - 0.5) * vec2(1.0, -1.0);
  float rough = 0.92;
  #ifdef BENCH
  vec2 q1 = vWorld.xz / 6.0 + 0.11 * vec2(big, mid);
  vec2 q2 = TURN * vWorld.xz / 29.0 + 0.71;
  // Seen along the ground the picture is blurred by its long axis: near the camera take it a mip finer, far away a little coarser so no rope thinner than two pixels crawls.
  float lod = mix(-1.0, 0.5, smoothstep(12.0, 90.0, far));
  vec3 lavaA = texture2D(tLava, q1, lod).rgb;
  vec3 lavaNhA = texture2D(tLavaNh, q1, lod).rgb;
  vec3 lavaB = texture2D(tLava, q2).rgb;
  vec3 lavaNhB = texture2D(tLavaNh, q2).rgb;
  // Ropy sheets and fields of cinder and rubble, in patches tens of metres across.
  float ropy = smoothstep(0.38, 0.62, vnoise(vWorld.xz / 19.0 + 11.0) + 0.3 * (lavaNhB.b - 0.5) - 0.9 * smoothstep(0.1, 0.3, slope));
  vec3 lava = lavaA * (0.55 + 7.0 * lavaB.g) * (0.8 + 0.4 * big);
  vec2 lavaTip = (lavaNhA.rg - 0.5) * vec2(1.0, -1.0) + 1.2 * (TURN * ((lavaNhB.rg - 0.5) * vec2(1.0, -1.0)));
  plain = mix(plain, lava, ropy);
  plainNh = mix(talusNhA, vec3(lavaNhA.rg, lavaNhA.b * (0.5 + lavaNhB.b)), ropy);
  tip = mix(tip, lavaTip, ropy);
  rough = mix(0.92, 0.78, ropy * smoothstep(0.45, 0.8, lavaNhA.b));
  #endif

  vec3 albedo = mix(plain, cliff, steep);
  // Old lava under a dusk sky is a cool grey, not the brown of the pictures' daylight.
  albedo = mix(albedo, dot(albedo, vec3(0.3333)) * vec3(0.96, 1.0, 1.05), 0.6);
  float height = mix(plainNh.b, cliffNh.b, steep);
  float fade = smoothstep(900.0, 250.0, far);
  vec3 n = normalize(n0 + (vec3(tip.x, 0.0, tip.y) * (1.0 - steep) * 0.55 + bump * steep * 1.1 * sign(vec3(n0.x, 1.0, n0.z))) * mix(0.35, 1.0, fade) * (0.3 + 0.7 * smoothstep(170.0, 30.0, far)));
  float occ = mix(1.0, 0.55 + 0.45 * smoothstep(0.2, 0.6, height), mix(0.5, 1.0, fade));

  #ifdef NEAR
  // The camera's bench: the same rock read again at the scale of a hand.
  float close = smoothstep(26.0, 6.0, far);
  if (close > 0.0) {
    vec2 f0 = steep > 0.5 ? (kx > 0.5 ? vWorld.zy : vWorld.xy) : TURN * vWorld.xz;
    vec2 f1 = f0 / 1.3 + vec2(mid, big) * 0.4;
    vec3 fine = texture2D(tBoulder, f1, -0.7).rgb;
    vec3 fineNh = texture2D(tBoulderNh, f1, -0.7).rgb;
    albedo *= mix(vec3(1.0), fine * 20.0, 0.65 * close);
    vec2 t2 = TURN * ((fineNh.rg - 0.5) * vec2(1.0, -1.0));
    n = normalize(n + vec3(t2.x, 0.0, t2.y) * 0.7 * close * (1.0 - steep));
    occ *= mix(1.0, 0.6 + 0.4 * smoothstep(0.2, 0.6, fineNh.b), close);
  }
  #endif

  #ifdef BENCH
  // The sulphur of the crack: white crystals on the lips, yellow round them, orange-brown stain fading out over metres.
  float dc = min(segmentDistance(vWorld.xz, uCrackA), segmentDistance(vWorld.xz, uCrackB) * 2.2);
  if (dc < 9.0) {
    vec2 s1 = vWorld.xz / 2.0;
    vec3 sul = texture2D(tSulphur, s1).rgb;
    float grain = 0.6 * vnoise(vWorld.xz / 0.7) + 0.4 * vnoise(vWorld.xz / 0.13);
    // Crystals grow where the gas comes out: in clumps along the lips, not in a band.
    float clump = vnoise(vWorld.xz / 2.1 + 5.0);
    float crust = smoothstep(2.9, 0.3, dc + 3.4 * (clump - 0.45) + 1.6 * (grain - 0.5) - 1.2 * (height - 0.5));
    float stain = smoothstep(8.0, 1.0, dc + 9.0 * (mid - 0.5) + 4.0 * (clump - 0.5)) * 0.5;
    vec3 yellow = mix(vec3(0.36, 0.28, 0.07), vec3(0.6, 0.57, 0.45), smoothstep(1.1, 0.2, dc + grain + clump));
    albedo = mix(albedo, albedo * vec3(2.1, 1.3, 0.6) + vec3(0.035, 0.02, 0.004), stain);
    albedo = mix(albedo, mix(sul, yellow, 0.6) * (0.6 + 0.8 * grain), crust);
    rough = mix(rough, 0.95, crust);
  }
  // By the line the rock is glazed black with spatter, and nothing pale survives.
  float rind = smoothstep(3.5, 0.2, land.b + 1.5 * (mid - 0.5));
  albedo *= mix(1.0, 0.5, rind);
  rough = mix(rough, 0.45, rind * smoothstep(0.35, 0.7, height));
  #endif

  // Under an overhang of rock, or deep in a gap, less of everything arrives.
  float shade = contactAt(vWorld) * smoothstep(4.0, 0.0, vWorld.y - land.r);
  vec3 c = landShade(vWorld, n, v, albedo, rough, occ, land, shade);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export const ROCK_VERTEX = /* glsl */ `
attribute vec4 aSeed;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vObject;
varying vec3 vObjectNormal;
varying vec3 vAxisX;
varying vec3 vAxisY;
varying vec3 vAxisZ;
varying vec4 vSeed;
void main() {
  mat3 m = mat3(instanceMatrix);
  vec3 scale = vec3(length(m[0]), length(m[1]), length(m[2]));
  vAxisX = m[0] / scale.x;
  vAxisY = m[1] / scale.y;
  vAxisZ = m[2] / scale.z;
  vec3 on = normalize(normal / scale);
  vObjectNormal = on;
  vObject = position * scale + aSeed.x * 37.0;
  vNormal = vAxisX * on.x + vAxisY * on.y + vAxisZ * on.z;
  vec4 w = instanceMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vSeed = aSeed;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// aSeed: x a random number, y the size of the rock in metres, z the height of its foot (where the ground meets it), w its tone.
export const ROCK_FRAGMENT = /* glsl */ `
${COMMON}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vObject;
varying vec3 vObjectNormal;
varying vec3 vAxisX;
varying vec3 vAxisY;
varying vec3 vAxisZ;
varying vec4 vSeed;
uniform sampler2D tBoulder;
uniform sampler2D tBoulderNh;
uniform vec4 uCrackA;

void main() {
  vec3 toCamera = cameraPosition - vWorld;
  float far = length(toCamera);
  vec3 v = toCamera / far;
  vec3 on = normalize(vObjectNormal);
  vec3 w = on * on;
  w *= w;
  w /= w.x + w.y + w.z;
  float size = vSeed.y;
  // Big blocks carry the rock picture at its true size and again coarser; pebbles carry it small.
  float span = clamp(size * 0.9, 0.35, 2.2);
  vec3 q = vObject / span;
  vec3 albedo = vec3(0.0);
  vec3 bump = vec3(0.0);
  float height = 0.0;
  #ifdef SIMPLE
  vec3 cx = texture2D(tBoulder, q.zy).rgb;
  vec3 cy = texture2D(tBoulder, q.xz).rgb;
  albedo = mix(cx, cy, w.y);
  height = 0.5;
  #else
  if (w.x > 0.02) {
    vec3 c = texture2D(tBoulder, q.zy).rgb;
    vec3 r = texture2D(tBoulderNh, q.zy).rgb;
    albedo += c * w.x;
    height += r.b * w.x;
    bump += w.x * (vec3(0.0, 0.0, 1.0) * (r.r - 0.5) - vec3(0.0, 1.0, 0.0) * (r.g - 0.5));
  }
  if (w.y > 0.02) {
    vec3 c = texture2D(tBoulder, q.xz).rgb;
    vec3 r = texture2D(tBoulderNh, q.xz).rgb;
    albedo += c * w.y;
    height += r.b * w.y;
    bump += w.y * (vec3(1.0, 0.0, 0.0) * (r.r - 0.5) - vec3(0.0, 0.0, 1.0) * (r.g - 0.5));
  }
  if (w.z > 0.02) {
    vec3 c = texture2D(tBoulder, q.xy).rgb;
    vec3 r = texture2D(tBoulderNh, q.xy).rgb;
    albedo += c * w.z;
    height += r.b * w.z;
    bump += w.z * (vec3(1.0, 0.0, 0.0) * (r.r - 0.5) - vec3(0.0, 1.0, 0.0) * (r.g - 0.5));
  }
  #endif
  // Close to, the same picture again at a quarter of the size: grain at the scale of a finger.
  float close = smoothstep(14.0, 4.0, far) * smoothstep(0.3, 0.8, size);
  if (close > 0.0) {
    vec2 f = (w.y > w.x && w.y > w.z ? q.xz : (w.x > w.z ? q.zy : q.xy)) * 4.3 + 0.37;
    vec3 fine = texture2D(tBoulder, f).rgb;
    float fh = texture2D(tBoulderNh, f).b;
    albedo *= mix(vec3(1.0), fine * 20.0, 0.55 * close);
    height = mix(height, 0.5 * (height + fh), close);
  }
  // Broken rock has faces: half the normal is the triangle's own.
  vec3 facet = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  vec3 n0 = normalize(normalize(vNormal) + 0.8 * facet * smoothstep(0.004, 0.02, size / far));
  vec3 n = normalize(n0 + (vAxisX * bump.x + vAxisY * bump.y + vAxisZ * bump.z) * 0.8 * smoothstep(400.0, 60.0, far));
  albedo *= vSeed.w * 1.6;
  albedo = mix(albedo, dot(albedo, vec3(0.3333)) * vec3(0.96, 1.0, 1.05), 0.6);
  vec4 land = landAt(vWorld.xz);
  // The rock sits in the ground: its foot is in its own shade, and dust lies on what faces up.
  float lift = (vWorld.y - vSeed.z) / max(size, 0.05);
  float foot = smoothstep(-0.08, 0.3, lift);
  float occ = (0.35 + 0.65 * foot) * (0.6 + 0.4 * smoothstep(0.15, 0.6, height));
  float dust = smoothstep(0.45, 0.9, n0.y + 0.5 * (height - 0.5)) * (0.35 + 0.65 * fract(vSeed.x * 7.3));
  float rind = smoothstep(3.0, 0.3, land.b);
  albedo = mix(albedo, vec3(0.17, 0.165, 0.155) * (0.6 + 0.8 * height), 0.6 * dust * (1.0 - rind));
  albedo *= mix(1.0, 0.55, rind);
  float dc = segmentDistance(vWorld.xz, uCrackA);
  float sul = smoothstep(3.6, 0.6, dc + 2.4 * (height - 0.5)) * smoothstep(-0.4, 0.4, n0.y) * step(0.35, fract(vSeed.x * 3.1));
  albedo = mix(albedo, mix(vec3(0.34, 0.27, 0.08), vec3(0.55, 0.52, 0.4), smoothstep(0.5, 0.8, height)), sul * 0.85);
  float rough = mix(0.78, 0.5, rind * smoothstep(0.4, 0.7, height));
  vec3 c = landShade(vWorld, n, v, albedo, rough, occ, land, 0.0);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
