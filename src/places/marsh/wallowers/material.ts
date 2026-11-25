// The hide of the wallowers, alive and dead: grey creased skin, salt caked on what looks up, red brine and mud on what has been under.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

const VERTEX = /* glsl */ `
attribute vec2 aUv;
attribute vec4 aInfo;
attribute vec2 aLook;
attribute float aWet;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying vec4 vInfo;
varying vec2 vLook;
varying float vWet;
void main() {
  vWorld = position;
  vNormal = normal;
  vUv = aUv;
  vInfo = aInfo;
  vLook = aLook;
  vWet = aWet;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying vec4 vInfo;
varying vec2 vLook;
varying float vWet;
uniform sampler2D tHide;
uniform sampler2D tHideNh;
uniform sampler2D tSalt;
uniform sampler2D tSaltNh;
uniform float uSeconds;
${NOISE_GLSL}
${RIG_GLSL}

// Bare skin: plates a few centimetres across with a crease round each. Returns how far from a crease (0 in it) and a number of the plate's own.
vec2 plates(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float f1 = 9.0;
  float f2 = 9.0;
  float id = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash22(i + g);
      float d = length(g + o - f);
      if (d < f1) { f2 = f1; f1 = d; id = o.x; } else if (d < f2) { f2 = d; }
    }
  }
  return vec2(f2 - f1, id);
}
float skinHeight(vec2 uv, float seed) {
  // Wrinkles lie round the body, not along it: the cells are long across the spine and short along it.
  vec2 w = uv + 0.035 * vec2(vnoise(uv * 4.3 + seed), vnoise(uv * 3.7 + seed + 9.0));
  float a = abs(vnoise(w * vec2(44.0, 8.0) + seed) - 0.5) * 2.0;
  float c = abs(vnoise(w * vec2(100.0, 21.0) + seed * 2.0) - 0.5) * 2.0;
  vec2 b = plates(w * vec2(95.0, 38.0) + seed * 3.0);
  return 0.45 * smoothstep(0.0, 0.22, a) + 0.3 * smoothstep(0.0, 0.3, c) + 0.25 * smoothstep(0.0, 0.3, b.x);
}

// The big creases: slack skin hangs in rolls round the trunk, closer and deeper at the neck. Returns how high the skin stands, 0 in a crease.
float creases(vec2 uv, float seed, float deep) {
  float wob = vnoise(uv * vec2(2.3, 3.1) + seed * 7.0);
  float a = abs(fract(uv.x / 0.09 + 1.6 * wob + 0.3 * vnoise(uv * vec2(9.0, 14.0))) - 0.5) * 2.0;
  float b = abs(fract((uv.x * 0.4 + uv.y) / 0.13 + 1.9 * wob) - 0.5) * 2.0;
  float gate = smoothstep(0.35, 0.6, vnoise(uv * vec2(1.9, 2.7) + seed * 3.0 + 11.0));
  return 1.0 - deep * (1.0 - smoothstep(0.0, 0.45, a)) - 0.6 * deep * gate * (1.0 - smoothstep(0.0, 0.5, b));
}

// Crystals grown into each other: round lumps the size of a fist with smaller ones on them.
float knobHeight(vec2 uv, float seed) {
  float a = sqrt(clamp(plates(uv * vec2(11.0, 12.0) + seed).x * 2.2, 0.0, 1.0));
  float b = sqrt(clamp(plates(uv * vec2(37.0, 41.0) + seed * 2.0).x * 2.2, 0.0, 1.0));
  float c = sqrt(clamp(plates(uv * vec2(103.0, 97.0) + seed * 3.0).x * 2.2, 0.0, 1.0));
  return 0.4 * a + 0.35 * b + 0.25 * c;
}

void main() {
  vec3 ng = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float kind = vLook.x;
  float leg = step(0.5, kind) * (1.0 - step(1.5, kind));
  float feeler = step(1.5, kind);
  float trunk = 1.0 - step(0.5, kind);
  float seed = vInfo.w;
  float dead = smoothstep(1.0, 1.4, vInfo.x);
  // The one that is stuck is smeared with the grey mud it is in.
  float mudded = step(vInfo.x, -0.5);

  // A frame on the skin from the picture's own coordinates.
  vec3 dpx = dFdx(vWorld);
  vec3 dpy = dFdy(vWorld);
  vec2 dux = dFdx(vUv);
  vec2 duy = dFdy(vUv);
  vec3 T = dpx * duy.y - dpy * dux.y;
  vec3 B = dpy * dux.x - dpx * duy.x;
  T = T - ng * dot(T, ng);
  B = B - ng * dot(B, ng);
  float tl = max(length(T), 1e-9);
  float bl = max(length(B), 1e-9);
  T /= tl;
  B /= bl;

  vec2 uvH = vUv / 0.75 + seed * vec2(3.7, 1.9);
  vec3 hide = texture2D(tHide, uvH).rgb / vec3(0.155, 0.097, 0.067);
  vec3 nhH = texture2D(tHideNh, uvH).rgb;
  // A second, wider reading under the first breaks the repeat and gives the hide its blotches.
  vec3 wide = texture2D(tHide, uvH * 0.23 + 0.37).rgb / vec3(0.155, 0.097, 0.067);
  hide = mix(vec3(1.0), hide, 0.25) * mix(vec3(1.0), wide, 0.5);

  // The fine wrinkles between the folds of the shape.
  float neck = smoothstep(0.52, 0.66, vLook.y) * (1.0 - smoothstep(0.9, 0.99, vLook.y));
  float deep = trunk * (0.22 + 0.3 * neck) + leg * 0.3;
  float e = 0.008;
  float c0 = creases(vUv, seed, deep);
  float cx = creases(vUv + vec2(e, 0.0), seed, deep);
  float cy = creases(vUv + vec2(0.0, e), seed, deep);
  float e2 = 0.0015;
  float s0 = skinHeight(vUv, seed);
  vec2 skinSlope = vec2(skinHeight(vUv + vec2(e2, 0.0), seed) - s0, skinHeight(vUv + vec2(0.0, e2), seed) - s0) / e2 * 0.004 * (1.0 - feeler);
  vec2 slope = vec2(cx - c0, cy - c0) / e * 0.02 + (nhH.rg - 0.5) * 0.22 + skinSlope;
  // The crust of a dead one: crystals as big as a fist, grown into each other.
  float k0 = plates(vUv * vec2(19.0, 21.0) + seed).x;
  // Far off the crystals are smaller than a pixel: what is left of them is their mean.
  float afar = smoothstep(9.0, 30.0, length(cameraPosition - vWorld));
  float knob = mix(knobHeight(vUv, seed), 0.72, afar);
  vec2 knobSlope = vec2(knobHeight(vUv + vec2(0.004, 0.0), seed) - knob, knobHeight(vUv + vec2(0.0, 0.004), seed) - knob) / 0.004 * 0.3 * (1.0 - afar);
  // How deep in a fold of the shape this is: 1 on the top of a fold, toward 0 in its crease.
  float fold = smoothstep(0.3, 0.95, vInfo.y / (0.55 + 0.45 * smoothstep(-0.9, 0.1, ng.y)));

  // Salt: caked where the skin looks up and stays dry, thick along the back, flaking at its edges, lying in the creases lower down.
  vec2 uvS = vUv / 0.8 + seed * vec2(1.3, 5.1);
  vec3 salt = texture2D(tSalt, uvS).rgb / vec3(0.343, 0.286, 0.27);
  vec3 nhS = texture2D(tSaltNh, uvS).rgb;
  float patchy = fbm(vUv * 2.1 + seed * 13.0);
  float flake = fbm(vUv * 9.0 + seed * 3.0);
  float up = ng.y + 0.55 * (patchy - 0.5) + 0.3 * (flake - 0.5) + 0.3 * (nhS.b - 0.5);
  float cake = smoothstep(0.84, 0.93, up) * clamp(vInfo.x, 0.0, 1.0) * (1.0 - feeler);
  cake = max(cake, dead * smoothstep(0.3, 0.42, patchy + 0.45 * ng.y + 0.35 * (nhS.b - 0.5) + 0.2 * (flake - 0.5)));
  // A bloom of dry salt over the upper half and in the creases: the hide dries grey.
  float dust = clamp(vInfo.x, 0.0, 1.0) * smoothstep(-0.35, 0.6, ng.y) * (0.25 + 0.3 * fold + 0.35 * patchy) * (1.0 - feeler);

  // Wet: everything that has been under the brine is dark, red and shines. The line is ragged, and below it the brine still runs down in threads.
  float lane = mix(vUv.x, vUv.y * 2.0, leg);
  float streak = vnoise(vec2(lane * 9.0, vWorld.y * 0.6) + seed * 5.0);
  float thread = smoothstep(0.55, 0.8, vnoise(vec2(lane * 23.0, vWorld.y * 0.9 - uSeconds * 0.35) + seed * 9.0));
  float ragged = 0.6 * (fbm(vUv * vec2(1.4, 0.8) + seed * 17.0) - 0.5) + 0.1 * (streak - 0.5);
  float wet = (1.0 - smoothstep(vWet - 0.12 + ragged, vWet + 0.1 + ragged, vWorld.y)) * (1.0 - dead);
  float smear = mudded * smoothstep(0.42, 0.62, fbm(vUv * vec2(1.7, 1.2) + seed * 5.0) + 0.55 * (1.0 - smoothstep(vWet - 0.2, vWet + 0.9, vWorld.y)) + 0.25 * (1.0 - fold));
  float damp = (1.0 - smoothstep(vWet + ragged, vWet + 0.55 + ragged, vWorld.y)) * (1.0 - dead);
  float soaked = 1.0 - smoothstep(0.03, 0.28 + 0.2 * streak, vWorld.y);
  cake *= 1.0 - damp;
  dust *= 1.0 - damp;

  vec3 albedo = mix(vec3(0.088, 0.066, 0.05), vec3(0.17, 0.125, 0.11), mudded) * hide * (0.72 + 0.28 * c0) * (0.5 + 0.5 * fold) * (0.72 + 0.28 * s0) * (0.88 + 0.24 * fbm(vUv * vec2(6.0, 3.0) + seed));
  albedo = mix(albedo, vec3(0.2, 0.185, 0.17) * (0.75 + 0.5 * nhH.b), dust * 0.15);
  // Mud from the last wallow has dried on it in plates: pale where it is dry, and it has cracked off the tops of the folds.
  float caked = smoothstep(0.4, 0.58, fbm(vUv * vec2(2.3, 1.9) + seed * 7.0) + 0.12 * (1.0 - fold)) * (0.45 + 0.55 * smoothstep(0.25, 0.5, fbm(vUv * vec2(11.0, 9.0) + seed))) * (1.0 - mudded) * (1.0 - dead) * (1.0 - feeler) * (1.0 - damp);
  albedo = mix(albedo, vec3(0.15, 0.122, 0.098) * (0.6 + 0.4 * s0) * (0.8 + 0.4 * nhH.b), caked * 0.6);
  // The feelers: old ivory, grooved along their length, stained at the root and the tip.
  float groove = 0.8 + 0.2 * sin(vUv.y / max(vInfo.z, 0.01) * 5.0 + seed * 40.0);
  vec3 ivory = vec3(0.4, 0.33, 0.22) * groove * mix(vec3(1.0), hide, 0.5);
  ivory = mix(ivory, vec3(0.2, 0.12, 0.08), 0.45 * smoothstep(0.7, 1.0, vLook.y) + 0.5 * (1.0 - smoothstep(0.0, 0.14, vLook.y)));
  albedo = mix(albedo, ivory, feeler);
  albedo = mix(albedo, mix(vec3(0.42, 0.4, 0.38), vec3(0.62, 0.58, 0.54), dead) * mix(salt, vec3(1.0), 0.5 * dead), cake);
  slope = mix(slope, (nhS.rg - 0.5) * 2.4 + dead * knobSlope, cake);
  albedo = mix(albedo, albedo * (0.5 + 0.5 * knob) * mix(vec3(1.0), vec3(0.85, 0.7, 0.64), 1.0 - knob), dead * cake);
  albedo = mix(albedo, albedo * mix(vec3(0.42, 0.3, 0.25), vec3(1.0), smoothstep(0.15, 0.8, vInfo.y)), dead);
  // Old salt is not clean: dust and the red of the flats have blown into it.
  albedo = mix(albedo, albedo * mix(vec3(0.78, 0.7, 0.64), vec3(1.0), smoothstep(0.3, 0.7, fbm(vUv * vec2(1.9, 1.6) + seed * 3.0))), dead);
  // Damp hide is darker and redder; wet hide is the red of the brine itself.
  albedo = mix(albedo, albedo * mix(vec3(0.72, 0.5, 0.45), vec3(0.7), mudded), damp * (1.0 - wet));
  vec3 wetC = mix(albedo * vec3(0.75, 0.2, 0.12) + vec3(0.03, 0.003, 0.002), albedo * 0.6, mudded);
  albedo = mix(albedo, wetC, wet * (0.9 - 0.4 * feeler));
  albedo = mix(albedo, albedo * mix(vec3(0.7, 0.45, 0.4), vec3(0.7), mudded), 0.6 * thread * damp);
  // Red mud, thick and smooth, on what stands in it.
  vec3 mud = mix(vec3(0.075, 0.02, 0.014), vec3(0.085, 0.074, 0.066), mudded) * (0.7 + 0.6 * streak);
  // Grey mud: wet and dark where it is fresh, paler and cracked where it has dried on the back.
  vec3 greyWet = vec3(0.085, 0.074, 0.066);
  // It dries in plates of its own, and the hide shows red brown between them.
  float plate = smoothstep(0.38, 0.6, fbm(vUv * vec2(2.6, 2.1) + seed * 7.0)) * (0.5 + 0.5 * smoothstep(0.2, 0.5, fbm(vUv * vec2(9.0, 7.0) + seed)));
  vec3 greyDry = mix(vec3(0.13, 0.085, 0.066), vec3(0.24, 0.215, 0.19), plate) * (0.6 + 0.4 * s0);
  albedo = mix(albedo, mix(greyDry, greyWet, wet), smear * 0.92 * (1.0 - 0.7 * feeler));
  albedo = mix(albedo, mud, soaked * 0.85);

  vec3 n = normalize(ng - (T * slope.x + B * slope.y) * (1.0 - 0.5 * soaked));
  float rough = mix(0.92, 0.58, max(wet, 0.8 * thread * damp));
  rough = mix(rough, 0.3, soaked);
  rough = mix(rough, 0.95, cake);
  rough = mix(rough, 0.5, feeler * (1.0 - soaked));
  // At a grazing look a rough wet hide does not mirror the sky as a clean rim.
  rough = mix(rough, 1.0, 0.8 * pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0));
  float occ = vInfo.y * (0.6 + 0.4 * smoothstep(0.0, 0.7, c0)) * (0.8 + 0.2 * nhH.b) * (0.7 + 0.3 * s0);
  occ *= 1.0 - 0.55 * pow(1.0 - clamp(dot(ng, v), 0.0, 1.0), 3.0);
  occ = mix(occ, vInfo.y * (0.75 + 0.25 * nhS.b) * mix(1.0, 0.3 + 0.7 * knob, dead), cake);
  // The mouth: a dark pit in the end of the muzzle.
  float pit = trunk * (1.0 - dead) * smoothstep(0.99, 0.997, vLook.y);
  albedo = mix(albedo, vec3(0.03, 0.014, 0.011), 0.7 * pit);
  occ *= 1.0 - 0.45 * pit;
  // The eyes: two small wet beads low on the head, each sunk in its own ring of hide.
  float kk = vInfo.z / 0.58;
  float eyeAlong = (vLook.y - 0.925) * 3.55 * kk;
  float eyeRound = min(abs(vUv.y - 0.4 * kk), abs(vUv.y - 2.113 * kk));
  float eyeD = length(vec2(eyeAlong, eyeRound)) / max(kk, 0.05);
  float socket = trunk * (1.0 - dead) * (1.0 - smoothstep(0.03, 0.075, eyeD));
  float bead = trunk * (1.0 - dead) * (1.0 - smoothstep(0.022, 0.03, eyeD));
  albedo = mix(albedo, albedo * 0.45, socket);
  occ *= 1.0 - 0.4 * socket;
  albedo = mix(albedo, vec3(0.006, 0.004, 0.004), bead);
  rough = mix(rough, 0.12, bead);
  n = normalize(mix(n, ng, bead));
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export function hideMaterial(ctx: Context): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...ctx.rig.uniforms,
      tHide: { value: ctx.assets.texture('wallowers/hide.jpg', { kind: 'colour', anisotropy: 4 }) },
      tHideNh: { value: ctx.assets.texture('wallowers/hide-nh.png', { kind: 'data', anisotropy: 4 }) },
      tSalt: { value: ctx.assets.texture('wallowers/salt.jpg', { kind: 'colour', anisotropy: 4 }) },
      tSaltNh: { value: ctx.assets.texture('wallowers/salt-nh.png', { kind: 'data', anisotropy: 4 }) },
      uSeconds: { value: 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
  });
}
