// The hide of a crust-walker in the light of the rig.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const VERTEX = /* glsl */ `
attribute vec2 aUv;
attribute vec4 aInfo;
attribute vec2 aLook;
attribute float aHeat;
uniform float uPixel;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying vec4 vInfo;
varying vec2 vLook;
varying float vHeat;
void main() {
  vec3 n = normalize(normal);
  vec3 p = position;
  // A leg a long way off is thinner than a pixel and would flicker: it is never drawn thinner than about a pixel.
  float far = length(cameraPosition - p);
  p += n * max(0.0, 0.5 * uPixel * far - aInfo.z);
  vWorld = p;
  vNormal = n;
  vUv = aUv;
  vInfo = aInfo;
  vLook = aLook;
  vHeat = aHeat;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying vec4 vInfo;
varying vec2 vLook;
varying float vHeat;
uniform sampler2D tHide;
uniform sampler2D tHideNh;
uniform sampler2D tFlake;
uniform sampler2D tFlakeNh;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float far = length(cameraPosition - vWorld);
  float pale = vInfo.x;
  float tendril = step(1.5, vLook.x) * step(vLook.x, 2.5);
  vec2 uv = vUv / 0.6 + vInfo.w * 3.1;
  vec3 hide = texture2D(tHide, uv).rgb;
  vec3 soot = vec3(0.03, 0.026, 0.024) * (0.5 + 3.0 * hide);
  vec3 bone = vec3(0.42, 0.36, 0.27) * (0.6 + 1.6 * hide);
  vec3 albedo = mix(soot, bone, pale);
  float occ = vInfo.y;
  vec3 c = rigShade(vWorld, n, v, albedo, 0.9, occ);
  // The tendrils are thin and pale: the heat under them shows through them.
  c += tendril * albedo * lakeIrradiance(vWorld, vec3(0.0, -1.0, 0.0)) * (0.35 / 3.14159);
  c += blackbody(mix(850.0, 1180.0, vHeat)) * vHeat * 0.6;
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
