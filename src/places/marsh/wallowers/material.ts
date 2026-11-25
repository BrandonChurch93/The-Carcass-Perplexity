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

// The big creases: slack skin hangs in rolls round the trunk, closer and deeper at the neck. Returns how high the skin stands, 0 in a crease.
float creases(vec2 uv, float seed, float deep) {
  float wob = vnoise(uv * vec2(2.3, 3.1) + seed * 7.0);
  float a = abs(fract(uv.x / 0.09 + 1.6 * wob + 0.3 * vnoise(uv * vec2(9.0, 14.0))) - 0.5) * 2.0;
  float b = abs(fract((uv.x * 0.4 + uv.y) / 0.13 + 1.9 * wob) - 0.5) * 2.0;
  float gate = smoothstep(0.35, 0.6, vnoise(uv * vec2(1.9, 2.7) + seed * 3.0 + 11.0));
  return 1.0 - deep * (1.0 - smoothstep(0.0, 0.45, a)) - 0.6 * deep * gate * (1.0 - smoothstep(0.0, 0.5, b));
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
  hide = mix(vec3(1.0), hide, 0.55) * mix(vec3(1.0), wide, 0.5);

  // The fine wrinkles between the folds of the shape.
  float neck = smoothstep(0.52, 0.66, vLook.y) * (1.0 - smoothstep(0.9, 0.99, vLook.y));
  float deep = trunk * (0.22 + 0.3 * neck) + leg * 0.3;
  float e = 0.008;
  float c0 = creases(vUv, seed, deep);
  float cx = creases(vUv + vec2(e, 0.0), seed, deep);
  float cy = creases(vUv + vec2(0.0, e), seed, deep);
  vec2 slope = vec2(cx - c0, cy - c0) / e * 0.02 + (nhH.rg - 0.5) * 0.8 * (1.0 - 0.6 * feeler);
  // How deep in a fold of the shape this is: 1 on the top of a fold, toward 0 in its crease.
  float fold = smoothstep(0.3, 0.95, vInfo.y / (0.55 + 0.45 * smoothstep(-0.9, 0.1, ng.y)));

  // Salt: caked where the skin looks up and stays dry, thick along the back, flaking at its edges, lying in the creases lower down.
  vec2 uvS = vUv / 0.8 + seed * vec2(1.3, 5.1);
  vec3 salt = texture2D(tSalt, uvS).rgb / vec3(0.343, 0.286, 0.27);
  vec3 nhS = texture2D(tSaltNh, uvS).rgb;
  float patchy = fbm(vUv * 2.1 + seed * 13.0);
  float flake = fbm(vUv * 9.0 + seed * 3.0);
  float up = ng.y + 0.55 * (patchy - 0.5) + 0.3 * (flake - 0.5) + 0.3 * (nhS.b - 0.5);
  float cake = smoothstep(0.6, 0.68, up) * clamp(vInfo.x, 0.0, 1.0) * (1.0 - feeler);
  cake = max(cake, dead * smoothstep(0.3, 0.42, patchy + 0.45 * ng.y + 0.35 * (nhS.b - 0.5) + 0.2 * (flake - 0.5)));
  // A bloom of dry salt over the upper half and in the creases: the hide dries grey.
  float dust = clamp(vInfo.x, 0.0, 1.0) * smoothstep(-0.35, 0.6, ng.y) * (0.3 + 0.5 * (1.0 - fold) + 0.35 * patchy) * (1.0 - feeler);

  // Wet: everything that has been under the brine is dark, red and shines. The line is ragged, and below it the brine still runs down in threads.
  float lane = mix(vUv.x, vUv.y * 2.0, leg);
  float streak = vnoise(vec2(lane * 9.0, vWorld.y * 0.6) + seed * 5.0);
  float thread = smoothstep(0.55, 0.8, vnoise(vec2(lane * 23.0, vWorld.y * 0.9 - uSeconds * 0.35) + seed * 9.0));
  float ragged = 0.5 * (fbm(vUv * vec2(1.4, 0.8) + seed * 17.0) - 0.5) + 0.3 * (streak - 0.5);
  float wet = (1.0 - smoothstep(vWet - 0.12 + ragged, vWet + 0.1 + ragged, vWorld.y)) * (1.0 - dead);
  float damp = (1.0 - smoothstep(vWet + ragged, vWet + 0.55 + ragged, vWorld.y)) * (1.0 - dead);
  float soaked = 1.0 - smoothstep(0.03, 0.28 + 0.2 * streak, vWorld.y);
  cake *= 1.0 - damp;
  dust *= 1.0 - damp;

  vec3 albedo = vec3(0.2, 0.165, 0.14) * hide * (0.72 + 0.28 * c0) * (0.8 + 0.2 * fold);
  albedo = mix(albedo, vec3(0.34, 0.31, 0.285) * (0.75 + 0.5 * nhH.b), dust * 0.7);
  // The feelers: old ivory, grooved along their length, stained at the root and the tip.
  float groove = 0.8 + 0.2 * sin(vUv.y / max(vInfo.z, 0.01) * 5.0 + seed * 40.0);
  vec3 ivory = vec3(0.56, 0.47, 0.33) * groove * mix(vec3(1.0), hide, 0.5);
  ivory = mix(ivory, vec3(0.21, 0.1, 0.06), 0.6 * smoothstep(0.6, 1.0, vLook.y) + 0.5 * (1.0 - smoothstep(0.0, 0.18, vLook.y)));
  albedo = mix(albedo, ivory, feeler);
  albedo = mix(albedo, vec3(0.62, 0.59, 0.56) * salt, cake);
  slope = mix(slope, (nhS.rg - 0.5) * 2.4, cake);
  // Damp hide is darker and redder; wet hide is the red of the brine itself.
  albedo = mix(albedo, albedo * vec3(0.72, 0.5, 0.45), damp * (1.0 - wet));
  vec3 wetC = albedo * vec3(0.62, 0.2, 0.13) + vec3(0.05, 0.007, 0.004);
  albedo = mix(albedo, wetC, wet * (0.9 - 0.4 * feeler));
  albedo = mix(albedo, albedo * vec3(0.7, 0.45, 0.4), 0.6 * thread * damp);
  // Red mud, thick and smooth, on what stands in it.
  vec3 mud = vec3(0.15, 0.04, 0.028) * (0.7 + 0.6 * streak);
  albedo = mix(albedo, mud, soaked * 0.85);

  vec3 n = normalize(ng - (T * slope.x + B * slope.y) * (1.0 - 0.5 * soaked));
  float rough = mix(0.92, 0.3, max(wet, 0.8 * thread * damp));
  rough = mix(rough, 0.2, soaked);
  rough = mix(rough, 0.95, cake);
  rough = mix(rough, 0.5, feeler * (1.0 - soaked));
  float occ = vInfo.y * (0.6 + 0.4 * smoothstep(0.0, 0.7, c0)) * (0.8 + 0.2 * nhH.b);
  occ = mix(occ, vInfo.y * (0.75 + 0.25 * nhS.b), cake);
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
