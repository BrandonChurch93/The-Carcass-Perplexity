// The surfaces of the Spine's land: rock and snow in one shader, read by world position so that the ridge, the spires and the mouth of the canal are one body.
import { CANAL_L, EXIT, EXIT_FLARE, EXIT_R, FLARE, MOUTH_R, MOUTH_S, THROAT, first } from '../ridge';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const LAND_VERTEX = /* glsl */ `
attribute float aTop;
attribute vec2 aSL;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vTop;
varying vec2 vSL;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vTop = aTop;
  vSL = aSL;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// uKind: 0 the ground, 1 a spire or the rock over the mouth, 2 the inside of the canal.
const LAND_PRELUDE = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vTop;
varying vec2 vSL;
uniform sampler2D tRock;
uniform sampler2D tRockNh;
uniform float uKind;
${RIG_GLSL}
${NOISE_GLSL}

const float MOUTH_S = ${MOUTH_S.toFixed(3)};
const float CANAL_L = ${CANAL_L.toFixed(3)};
const float TRAIL_FROM = ${(first.s - 660).toFixed(3)};
const vec3 ROCK_MEAN = vec3(0.102, 0.084, 0.076);

const float EXIT = ${EXIT.toFixed(3)};

// The canal of the layout (ridge.ts): its radius d metres in from the near mouth, and the l of its axis.
float flareAt(float d) {
  if (d <= 0.0) return ${MOUTH_R.toFixed(1)};
  if (d < ${FLARE.toFixed(1)}) return ${THROAT.toFixed(1)} + ${(MOUTH_R - THROAT).toFixed(1)} * pow(1.0 - d / ${FLARE.toFixed(1)}, 1.6);
  float e = EXIT - d;
  if (e <= 0.0) return ${EXIT_R.toFixed(1)};
  if (e < ${EXIT_FLARE.toFixed(1)}) return ${THROAT.toFixed(1)} + ${(EXIT_R - THROAT).toFixed(1)} * pow(1.0 - e / ${EXIT_FLARE.toFixed(1)}, 1.6);
  return ${THROAT.toFixed(1)};
}
float canalAt(float d) {
  float k = max(0.0, min(d, EXIT + 40.0) - 140.0);
  return CANAL_L + 0.0025 * k * k;
}

// The trail of the layout (anchors.ts): l at s.
float trailAt(float s) {
  float k = clamp((s - MOUTH_S + 160.0) / 150.0, 0.0, 1.0);
  return 2.2 * sin(s / 31.0) * (1.0 - k) + CANAL_L * k * k;
}

// The prints of the runners: two rows of pits along the trail, each with a raised rim of thrown snow. x is depth (-1 pit, +1 rim), yz its slope.
vec3 prints(vec2 sl) {
  float across = sl.y - trailAt(sl.x);
  if (abs(across) > 1.4 || sl.x < TRAIL_FROM || sl.x > MOUTH_S + 6.0) return vec3(0.0);
  float stride = 1.34;
  float row = floor(sl.x / stride);
  float side = mod(row, 2.0) < 0.5 ? -0.28 : 0.28;
  vec2 j = hash22(vec2(row, 3.7)) - 0.5;
  vec2 q = vec2(sl.x - (row + 0.5 + 0.3 * j.x) * stride, across - side - 0.12 * j.y);
  float r = length(q * vec2(1.0, 1.35)) / 0.27;
  float pit = smoothstep(1.0, 0.55, r);
  float rim = smoothstep(1.7, 1.15, r) * smoothstep(0.85, 1.15, r);
  vec2 slope = normalize(q + 1e-4) * (smoothstep(0.5, 1.0, r) * smoothstep(1.25, 1.0, r) * 1.4 - rim * 0.5);
  return vec3(rim * 0.6 - pit, slope);
}

`;

// The land is drawn twice: first its depth alone, with the mouths of the canal cut out of the ground, then its colour only where it is the
// nearest thing. The colour is dear and a software renderer shades every fragment it is given, so nothing hidden is shaded.
export const LAND_DEPTH_FRAGMENT = /* glsl */ `${LAND_PRELUDE}
void main() {
  // The mouths of the canal: the rock wall over each stands across it, and is open where the canal passes through.
  float dCanal = vSL.x - MOUTH_S;
  if (uKind < 0.5 && dCanal > -1.0 && dCanal < EXIT + 1.0 && vWorld.y > CANAL_FLOOR - 0.2) {
    float r = flareAt(dCanal);
    // The opening is broken rock, not a drawn circle: its edge stands in and out with the beds.
    vec2 across = vec2(vSL.y - canalAt(dCanal), vWorld.y - (CANAL_FLOOR + 0.62 * r));
    float ragged = 0.74 + 0.26 * vnoise(vec2(atan(across.y, across.x) * 2.3 + 5.0, 0.7)) - 0.1 * vnoise(vec2(vWorld.y * 0.9, vSL.y * 0.9));
    if (length(across * vec2(1.0, 1.0 + 0.25 * smoothstep(0.0, 1.0, across.y / r))) < (r - 0.8) * ragged) discard;
  }
  gl_FragColor = vec4(rigOut(vec3(0.0)), 1.0);
}`;

export const LAND_FRAGMENT = /* glsl */ `${LAND_PRELUDE}
void main() {
  float dCanal = vSL.x - MOUTH_S;
  vec3 smoothN = normalize(vNormal);
  if (uKind > 1.5 && !gl_FrontFacing) smoothN = -smoothN;
  vec3 toCamera = cameraPosition - vWorld;
  float far = length(toCamera);
  vec3 v = toCamera / far;
  bool spire = uKind > 0.5;
  bool inside = uKind > 1.5;
  // Broken rock is flat faces that meet in edges: the face of the triangle itself, more than the round of the mesh.
  vec3 facet = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (dot(facet, smoothN) < 0.0) facet = -facet;
  vec3 n0 = inside ? smoothN : normalize(mix(smoothN, facet, spire ? 0.8 : 0.15 + 0.4 * clamp(vTop, 0.0, 1.0)));

  // The rock, read on the two faces the surface is nearest to. On upright faces its beds are tipped, as the vertebrae lean.
  vec3 w = n0 * n0;
  float top = smoothstep(0.4, 0.75, w.y);
  vec2 sideAt = w.x > w.z ? vWorld.zy : vWorld.xy;
  // Along the beds the rock runs long: the picture is drawn out three times that way.
  sideAt = (mat2(0.34, 0.94, -0.94, 0.34) * sideAt) * vec2(1.0, spire ? 0.55 : 0.8);
  vec3 across = w.x > w.z ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  float wide = 64.0;
  vec3 rock = mix(texture2D(tRock, sideAt / wide).rgb, texture2D(tRock, vWorld.xz / wide).rgb, top);
  vec3 nh = mix(texture2D(tRockNh, sideAt / wide).rgb, texture2D(tRockNh, vWorld.xz / wide).rgb, top);
  vec2 t = (nh.rg - 0.5) * vec2(1.0, -1.0) * 1.1;
  float pit = nh.b;
  float close = smoothstep(420.0, 60.0, far);
  vec3 fine = vec3(0.5);
  vec3 fineNh = vec3(0.5);
  if (close > 0.0) {
    float small = 6.3;
    // Close to, the rock is not drawn out: its grain is as broad as it is long.
    vec2 fineAt = (w.x > w.z ? vWorld.zy : vWorld.xy) / small + 0.31;
    fine = mix(texture2D(tRock, fineAt).rgb, texture2D(tRock, vWorld.xz / small + 0.31).rgb, top);
    fineNh = mix(texture2D(tRockNh, fineAt).rgb, texture2D(tRockNh, vWorld.xz / small + 0.31).rgb, top);
    t += close * 1.1 * (fineNh.rg - 0.5) * vec2(1.0, -1.0);
    pit = mix(pit, pit * (0.5 + fineNh.b), close);
    rock = mix(rock, rock * fine / ROCK_MEAN, 0.6 * close);
  }
  vec3 nRock = normalize(n0 + mix(across * t.x + vec3(0.0, 1.0, 0.0) * t.y, vec3(t.x, 0.0, t.y), top));

  // Colour: blue-grey rock with beds of tan, paler where the weather has worked it.
  float bed = vnoise(vec2(dot(vWorld, vec3(0.011, 0.034, 0.017)), dot(vWorld.xz, vec2(0.004, -0.003))) * 3.0);
  float blotch = vnoise(vWorld.xz * 0.021 + vWorld.y * 0.013);
  vec3 tone = mix(vec3(0.27, 0.22, 0.19), vec3(0.66, 0.53, 0.39), smoothstep(0.3, 0.7, 0.6 * bed + 0.4 * blotch));
  vec3 albedo = tone * (0.55 + 0.45 * rock / ROCK_MEAN);
  // Strata: the beds of the rock, tipped as the vertebrae lean, some dark, some pale, a few metres each.
  float tilt = dot(vWorld, vec3(0.16, 0.95, 0.27));
  float strata = vnoise(vec2(tilt * 0.37, 1.7)) * 0.6 + vnoise(vec2(tilt * 0.09, 7.3)) * 0.4;
  albedo *= spire ? 0.62 + 0.76 * strata : 0.8 + 0.4 * strata;
  float rough = 0.85;
  float occ = 0.45 + 0.55 * smoothstep(0.2, 0.7, pit);
  // Slabs: the rock is jointed along the lean of the vertebrae and broken across it, each slab with its own tone and its own tilt,
  // a dark crack between it and the next, and a ledge at its foot where the snow lies.
  float ledgeSnow = 0.0;
  if (!inside) {
    vec2 j = top > 0.5 ? vec2(dot(vWorld.xz, vec2(0.82, 0.57)), dot(vWorld.xz, vec2(-0.57, 0.82))) : vec2(dot(vWorld, vec3(0.1, 0.94, -0.33)), (w.x > w.z ? vWorld.z : vWorld.x) + 0.35 * vWorld.y);
    float cv = j.y / 5.5 + 1.7 * vnoise(vec2(j.y * 0.06, j.x * 0.017)) + 0.5 * vnoise(vec2(j.y * 0.23, j.x * 0.03));
    float col = floor(cv);
    float hc = hash12(vec2(col, 7.0));
    float cu = j.x / (11.0 + 16.0 * hc) + hc * 17.0 + 0.6 * vnoise(vec2(j.y * 0.21, j.x * 0.05));
    float row = floor(cu);
    vec2 own = hash22(vec2(col, row));
    float span = 11.0 + 16.0 * hc;
    float dv = min(fract(cv), 1.0 - fract(cv)) * 5.5;
    float du = min(fract(cu), 1.0 - fract(cu)) * span;
    float thin = 0.14 + 0.0011 * far;
    // Far off the slabs go into the mass of the rock: what is left is its beds and the snow on its ledges.
    float near = smoothstep(1300.0, 220.0, far);
    float crack = (1.0 - smoothstep(0.0, thin, min(dv, du * 0.8))) * near;
    float mass = hash12(vec2(floor(cv * 0.23 + 0.4 * own.y), floor(cu * 0.4)));
    albedo *= mix(1.0, 0.66 + 0.68 * own.x, 0.3 + 0.7 * near) * (0.8 + 0.4 * mass) * (1.0 - 0.7 * crack);
    occ *= 1.0 - 0.6 * crack;
    nRock = normalize(nRock + (across * (own.y - 0.5) + vec3(0.0, own.x - 0.5, 0.0)) * 0.34);
    ledgeSnow = top > 0.5 ? 0.0 : smoothstep(0.9 + 1.6 * own.y + 0.004 * far, 0.2, fract(cu) * span) * smoothstep(0.25, 0.5, own.x + 0.3 * pit);
  }

  // The burn: the top of a spire is black glass where the lightning has come to it, time after time, and streaked below.
  float burn = 0.0;
  if (spire && !inside) {
    float ragged = vnoise(vWorld.xz * 0.21 + vWorld.y * 0.05) * 14.0 + vnoise(vec2(dot(vWorld.xz, vec2(0.7, 0.7)) * 0.9, vWorld.y * 0.06)) * 22.0;
    burn = smoothstep(52.0, 16.0, vTop + ragged - 12.0);
    albedo = mix(albedo, vec3(0.011, 0.011, 0.013) * (0.6 + 0.8 * pit), burn);
    rough = mix(rough, 0.45, burn);
  }

  // Snow lies where the face leans back, deeper in the lee and in the hollows of the rock; rime frosts what faces the gale.
  float lee = dot(n0.xz, uWind.xz);
  float lie = mix(smoothN.y, n0.y, spire ? 1.0 : 0.35) + (spire ? 0.1 : 0.14) * (pit - 0.5) + 0.12 * lee + 0.16 * (vnoise(vWorld.xz * 0.09) - 0.5);
  // Rock that stands out of the snow keeps it only on its level tops.
  float bare = spire ? 0.0 : clamp(vTop, 0.0, 1.0);
  float snow = smoothstep(0.42, 0.62, lie - 0.42 * bare);
  if (spire) {
    // On a spire the snow keeps to the ledges and the gullies: where the body of the rock leans back, and where a slab stands in from its neighbours.
    float held = 0.55 * smoothN.y + 0.45 * n0.y + 0.2 * smoothstep(1.0, -7.0, vSL.x) + 0.1 * (pit - 0.5) + 0.1 * lee;
    snow = smoothstep(0.5, 0.66, held);
    // Ledges: where a hard bed stands out the snow lies along it, in broken lines.
    float ledge = smoothstep(0.66, 0.8, vnoise(vec2(tilt * 0.14, 3.1))) * smoothstep(0.38, 0.6, vnoise(vWorld.xz * 0.045 + vWorld.y * 0.02)) * smoothstep(-0.3, 0.25, n0.y);
    snow = max(snow, 0.92 * ledge);
  }
  snow = max(snow, 0.9 * ledgeSnow * (spire ? 1.0 : bare));
  if (spire && !inside) {
    // A spire stands in the drift at its foot.
    float above = vWorld.y - landAt(vWorld.xz).r;
    snow = max(snow, smoothstep(5.0, 0.5, above + 3.0 * (pit - 0.5)));
    occ *= 0.55 + 0.45 * smoothstep(0.0, 14.0, above);
  }
  if (spire && !inside) {
    float proud = smoothstep(-9.0, 5.0, vSL.x);
    occ *= 0.3 + 0.7 * proud;
    albedo *= 0.75 + 0.25 * proud;
  }
  snow *= 1.0 - burn;
  float rime = smoothstep(0.15, 0.7, -lee) * smoothstep(0.35, 0.75, pit + 0.3 * vnoise(vWorld.xz * 0.6 + vWorld.y * 0.4)) * (1.0 - burn);
  if (inside) {
    snow = smoothstep(1.6, 0.2, vWorld.y - CANAL_FLOOR + 1.2 * (pit - 0.5)) * 0.85;
    rime = 0.5 * smoothstep(0.45, 0.8, pit);
    // The canal is black from outside: what the sky gives its walls is gone a few metres in.
    float lit = uUnder > 1.5 ? 1.0 : exp(-max(min(dCanal, EXIT - dCanal) - 1.0, 0.0) / 2.2);
    snow *= lit;
    rime *= lit;
    occ *= 0.04 + 0.96 * lit;
  }
  albedo = mix(albedo, vec3(0.62, 0.66, 0.72), 0.55 * rime);

  // The snow's own surface: wind crust in long ripples, and the prints.
  vec3 nSnow = normalize(mix(smoothN, n0, 0.35));
  float snowOcc = 1.0;
  if (snow > 0.0 && close > 0.0) {
    vec2 q = vec2(dot(vWorld.xz, vec2(0.98, -0.2)), dot(vWorld.xz, vec2(0.2, 0.98)));
    float e = 0.12;
    float h0 = vnoise(q * vec2(1.1, 0.33)) + 0.4 * vnoise(q * vec2(4.3, 1.4));
    float hx = vnoise((q + vec2(e, 0.0)) * vec2(1.1, 0.33)) + 0.4 * vnoise((q + vec2(e, 0.0)) * vec2(4.3, 1.4));
    float hz = vnoise((q + vec2(0.0, e)) * vec2(1.1, 0.33)) + 0.4 * vnoise((q + vec2(0.0, e)) * vec2(4.3, 1.4));
    vec2 g = vec2(h0 - hx, h0 - hz) / e * 0.2 * close;
    vec3 p = prints(vSL);
    g += 1.6 * p.yz;
    snowOcc = 1.0 + 0.8 * min(p.x, 0.0);
    // Wind crust: the troughs between the ripples are scoured hard and lie darker than the soft snow on their crests.
    snowOcc *= 1.0 - 0.3 * close * smoothstep(0.85, 0.3, h0);
    nSnow = normalize(nSnow + vec3(g.x, 0.0, g.y));
  }
  // Under a sky without a sun a drift shows by which way its faces lean: the lean of the snow is drawn out for the light.
  nSnow = normalize(vec3(nSnow.x * 2.4, nSnow.y, nSnow.z * 2.4));
  vec3 n = normalize(mix(nRock, nSnow, snow));
  // Packed by the wind in long plates, the snow is glazed and blue-grey; between them it lies soft and white.
  float plate = smoothstep(0.4, 0.62, vnoise(vec2(dot(vWorld.xz, vec2(0.98, -0.2)) * 0.19, dot(vWorld.xz, vec2(0.2, 0.98)) * 0.045)));
  albedo = mix(albedo, mix(vec3(0.84, 0.87, 0.91), vec3(0.6, 0.66, 0.76), 0.55 * plate), snow);
  rough = mix(rough, 0.7 - 0.3 * plate, snow);
  occ = mix(occ, snowOcc, snow);
  if (!spire) occ *= landHollow(vWorld, n0, 5.0);

  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  // Seen from outside the canal is black; the shot inside it is exposed for it (uUnder is staged up from that cut).
  if (inside && uUnder < 1.5) c *= 0.012 + 0.988 * exp(-max(min(dCanal, EXIT - dCanal) - 1.0, 0.0) / 2.2);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The ice on the floor of the canal: dark, wet and level, a mirror for the mouth.
export const ICE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
${RIG_GLSL}
${NOISE_GLSL}

void main() {
  vec3 toCamera = cameraPosition - vWorld;
  vec3 v = normalize(toCamera);
  float e = 0.05;
  float h0 = vnoise(vWorld.xz * 1.7) + 0.5 * vnoise(vWorld.xz * 6.1);
  float hx = vnoise((vWorld.xz + vec2(e, 0.0)) * 1.7) + 0.5 * vnoise((vWorld.xz + vec2(e, 0.0)) * 6.1);
  float hz = vnoise((vWorld.xz + vec2(0.0, e)) * 1.7) + 0.5 * vnoise((vWorld.xz + vec2(0.0, e)) * 6.1);
  vec3 n = normalize(vec3((h0 - hx) / e * 0.05, 1.0, (h0 - hz) / e * 0.05));
  float frost = smoothstep(0.45, 0.8, vnoise(vWorld.xz * 0.9 + 3.3));
  vec3 albedo = mix(vec3(0.06, 0.075, 0.1), vec3(0.6, 0.64, 0.7), 0.6 * frost);
  vec3 c = rigShade(vWorld, n, v, albedo, mix(0.12, 0.7, frost), 1.0);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
