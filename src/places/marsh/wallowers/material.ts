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
  float wob = vnoise(uv * vec2(1.3, 2.1) + seed * 7.0);
  float a = abs(fract(uv.x / 0.31 + 1.1 * wob + 0.25 * vnoise(uv * vec2(4.0, 9.0))) - 0.5) * 2.0;
  float b = abs(fract(uv.x / 0.117 + 2.3 * wob + 0.3 * vnoise(uv * vec2(7.0, 5.0) + 3.0)) - 0.5) * 2.0;
  float gate = smoothstep(0.3, 0.6, vnoise(uv * vec2(0.9, 1.7) + seed * 3.0 + 11.0));
  return 1.0 - deep * (1.0 - smoothstep(0.0, 0.5, a)) - 0.45 * deep * gate * (1.0 - smoothstep(0.0, 0.6, b));
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

  vec2 uvH = vUv / 1.3 + seed * vec2(3.7, 1.9);
  vec3 hide = texture2D(tHide, uvH).rgb;
  vec3 nhH = texture2D(tHideNh, uvH).rgb;
  // A second, wider reading under the first breaks the repeat and gives the hide its blotches.
  vec3 wide = texture2D(tHide, uvH * 0.29 + 0.37).rgb;
  hide = hide * (0.55 + 0.45 * wide / vec3(0.155, 0.097, 0.067));

  float neck = smoothstep(0.52, 0.66, vLook.y) * (1.0 - smoothstep(0.86, 0.97, vLook.y));
  float deep = trunk * (0.3 + 0.5 * neck) + leg * 0.45 * (1.0 - smoothstep(0.5, 0.9, vLook.y));
  vec2 uvC = mix(vUv, vUv.yx * vec2(1.0, 1.0), 0.0);
  float e = 0.012;
  float c0 = creases(uvC, seed, deep);
  float cx = creases(uvC + vec2(e, 0.0), seed, deep);
  float cy = creases(uvC + vec2(0.0, e), seed, deep);
  vec2 slope = vec2(cx - c0, cy - c0) / e * 0.035 + (nhH.rg - 0.5) * 1.1 * (1.0 - 0.7 * feeler);

  // Salt: caked where the skin looks up and stays dry, thick along the back, blown thin on the flanks.
  vec2 uvS = vUv / 0.9 + seed * vec2(1.3, 5.1);
  vec3 salt = texture2D(tSalt, uvS).rgb;
  vec3 nhS = texture2D(tSaltNh, uvS).rgb;
  float patchy = fbm(vUv * 2.3 + seed * 13.0);
  float up = ng.y + 0.5 * (patchy - 0.5) + 0.25 * (nhH.b - 0.5);
  float cake = smoothstep(0.62, 0.9, up + 0.5 * (nhS.b - 0.5)) * clamp(vInfo.x, 0.0, 1.0) * (1.0 - feeler);
  cake = max(cake, dead * smoothstep(0.25, 0.6, patchy + 0.4 * ng.y + 0.3 * (nhS.b - 0.5)));
  // A bloom of dry salt in the creases and over the upper half: the hide dries grey.
  float dust = clamp(vInfo.x, 0.0, 1.0) * smoothstep(-0.2, 0.7, ng.y) * (0.35 + 0.5 * (1.0 - c0) + 0.3 * patchy) * (1.0 - feeler);

  // Wet: everything that has been under the brine is dark, red and shines. The line is ragged and runs lower in dribbles.
  float streak = vnoise(vec2(mix(vUv.x, vUv.y * 2.0, leg) * 7.0, vWorld.y * 0.7) + seed * 5.0);
  float ragged = 0.55 * (fbm(vUv * vec2(1.6, 0.9) + seed * 17.0) - 0.5) + 0.22 * (streak - 0.5);
  float wet = (1.0 - smoothstep(vWet - 0.3 + ragged, vWet + 0.22 + ragged, vWorld.y)) * (1.0 - dead);
  float soaked = 1.0 - smoothstep(0.02, 0.3 + 0.15 * streak, vWorld.y);
  cake *= 1.0 - wet;
  dust *= 1.0 - wet;

  vec3 albedo = hide * vec3(1.55, 1.75, 1.95) * (0.6 + 0.4 * c0);
  albedo = mix(albedo, vec3(dot(albedo, vec3(0.3, 0.5, 0.2))) * vec3(1.02, 0.98, 0.95) + 0.06, 0.45);
  albedo = mix(albedo, vec3(0.42, 0.39, 0.37) * (0.7 + 0.6 * nhH.b), dust * 0.6);
  // The feelers: old ivory, grooved, stained at the root and the tip.
  vec3 ivory = vec3(0.52, 0.43, 0.31) * (0.7 + 0.5 * hide.g / 0.097 * 0.5) * (0.75 + 0.25 * smoothstep(0.0, 0.3, vLook.y));
  ivory = mix(ivory, vec3(0.2, 0.09, 0.06), 0.55 * smoothstep(0.55, 1.0, vLook.y) + 0.35 * (1.0 - smoothstep(0.0, 0.2, vLook.y)));
  albedo = mix(albedo, ivory, feeler);
  albedo = mix(albedo, salt * 1.7 + 0.08, cake);
  slope = mix(slope, (nhS.rg - 0.5) * 2.2, cake);
  vec3 wetC = albedo * vec3(0.5, 0.2, 0.15) + vec3(0.035, 0.006, 0.004);
  albedo = mix(albedo, wetC, wet * (0.85 - 0.3 * feeler));
  // Red mud, thick and smooth, on what stands in it.
  vec3 mud = vec3(0.16, 0.045, 0.032) * (0.7 + 0.6 * streak);
  albedo = mix(albedo, mud, soaked * 0.85);

  vec3 n = normalize(ng - (T * slope.x + B * slope.y) * (1.0 - 0.5 * soaked));
  float rough = mix(0.9, 0.34, wet);
  rough = mix(rough, 0.22, soaked);
  rough = mix(rough, 0.95, cake);
  float occ = vInfo.y * (0.45 + 0.55 * smoothstep(0.0, 0.7, c0)) * (0.8 + 0.2 * nhH.b);
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
