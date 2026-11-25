// The hide of a wader in the light of the rig: thin pale bare skin, like a plucked bird's, over ribs and joints; wet, clumped tendrils.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const VERTEX = /* glsl */ `
attribute vec2 aUv;
attribute vec4 aInfo;
attribute vec2 aLook;
attribute float aHeat;
attribute float aWho;
uniform float uPixel;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying vec4 vInfo;
varying vec2 vLook;
varying float vWet;
void main() {
  vec3 n = normalize(normal);
  vec3 p = position;
  // A leg or a strand a long way off is thinner than a pixel and would flicker: it is never drawn thinner than a pixel and a half.
  float far = length(cameraPosition - p);
  float least = aLook.x > 1.5 && aLook.x < 2.5 ? 0.8 : 1.3;
  p += n * max(0.0, least * uPixel * far - aInfo.z);
  vWorld = p;
  vNormal = n;
  vUv = aUv;
  vInfo = aInfo;
  vLook = aLook;
  vWet = aHeat;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying vec4 vInfo;
varying vec2 vLook;
varying float vWet;
uniform float uSea;
uniform float uPixel;
uniform float uDead;
${NOISE_GLSL}
${RIG_GLSL}
// A relief given as a height in metres turns the face: the slope is taken on the screen.
vec3 relief(vec3 p, vec3 n, float h) {
  vec3 dpx = dFdx(p);
  vec3 dpy = dFdy(p);
  vec3 r1 = cross(dpy, n);
  vec3 r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 g = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  return normalize(abs(det) * n - g);
}
void main() {
  vec3 n = normalize(vNormal);
  vec3 toEye = cameraPosition - vWorld;
  float far = length(toEye);
  vec3 v = toEye / far;
  float kind = vLook.x;
  float u = vLook.y;
  float seed = vInfo.w;
  // How many metres a pixel covers here: detail finer than that is left out, not drawn as noise.
  float px = uPixel * far;
  float fine = smoothstep(0.012, 0.003, px);
  float mid = smoothstep(0.05, 0.012, px);

  vec2 q = vUv + seed * 1.37;
  float blotch = fbm(q * vec2(2.3, 3.1));
  float crease = vnoise(q * vec2(9.0, 46.0)) * 0.6 + vnoise(q * vec2(31.0, 140.0)) * 0.4;
  float pimple = vnoise(q * 210.0);
  float vein = 1.0 - smoothstep(0.0, 0.07, abs(vnoise(q * vec2(5.0, 7.0) + 7.3) - 0.5));

  vec3 albedo;
  float rough = 0.78;
  float height = 0.0;
  float occ = vInfo.y;
  float wet = 0.0;
  if (kind < 0.5) {
    // The trunk: bone-white, the ribs and the points of the hips standing through the skin, the belly splashed with silt.
    float phi = vUv.y / 0.32;
    float flank = smoothstep(0.25, 0.8, abs(cos(phi))) * smoothstep(0.3, 0.42, u) * smoothstep(0.9, 0.72, u);
    float ribs = sin(u * 30.0 + 0.9 * sin(phi * 2.0 + seed) + 1.2 * blotch);
    float spine = smoothstep(0.86, 1.0, sin(phi)) * (0.6 + 0.4 * sin(u * 52.0));
    height = 0.011 * ribs * flank * mid + 0.012 * spine * mid + 0.004 * crease * mid + 0.0012 * pimple * fine;
    albedo = mix(vec3(0.66, 0.565, 0.5), vec3(0.8, 0.735, 0.67), blotch);
    albedo = mix(albedo, vec3(0.66, 0.43, 0.4), 0.3 * flank * smoothstep(0.2, -0.6, ribs));
    albedo = mix(albedo, vec3(0.45, 0.47, 0.56), 0.22 * vein * mid);
    // Raw and pink where the skin is thin: the rump, the root of the neck, the hips.
    albedo = mix(albedo, vec3(0.7, 0.42, 0.4), 0.35 * smoothstep(0.55, 0.9, vnoise(q * 3.7 + 3.0)) + 0.25 * smoothstep(0.85, 1.0, u));
    float belly = smoothstep(-0.2, -0.9, sin(phi));
    albedo = mix(albedo, vec3(0.42, 0.4, 0.37), belly * (0.3 + 0.5 * smoothstep(0.4, 0.7, vnoise(q * 11.0))));
    occ *= 1.0 - 0.3 * flank * smoothstep(0.3, -0.8, ribs);
  } else if (kind < 1.5) {
    // The neck: rings of loose skin, pinker toward the end, the last of it stained by what it feeds in.
    float rings = sin(vUv.x * 46.0 + 2.0 * blotch);
    height = 0.004 * rings * mid * (1.0 - 0.6 * u) + 0.003 * crease * mid + 0.001 * pimple * fine;
    albedo = mix(vec3(0.68, 0.58, 0.52), vec3(0.8, 0.73, 0.67), blotch);
    albedo = mix(albedo, vec3(0.45, 0.47, 0.56), 0.18 * vein * mid);
    albedo = mix(albedo, vec3(0.62, 0.3, 0.3), smoothstep(0.55, 1.0, u) * (0.45 + 0.4 * blotch));
    albedo *= 1.0 - 0.18 * smoothstep(0.2, -0.8, rings) * mid;
  } else if (kind < 2.5) {
    // A tendril: flesh-pink at the root, wine-red along it, pale and frayed at the tip. Wet: dark, with a line of light down it.
    albedo = mix(vec3(0.62, 0.3, 0.3), vec3(0.4, 0.085, 0.11), smoothstep(0.0, 0.45, u));
    albedo = mix(albedo, vec3(0.62, 0.42, 0.36), smoothstep(0.8, 1.0, u) * vInfo.x);
    albedo *= 0.7 + 0.5 * vInfo.x;
    wet = 0.55 + 0.45 * vWet;
    occ *= 0.75 + 0.25 * u;
  } else {
    // A leg: hard and thin, the joints knuckled and raw, grey silt dried on it to above the joint.
    float joint = exp(-pow((u - 0.47) / 0.07, 2.0)) + exp(-pow((u - 0.93) / 0.05, 2.0));
    height = 0.002 * crease * mid + 0.0015 * vnoise(q * vec2(40.0, 90.0)) * mid;
    albedo = mix(vec3(0.64, 0.55, 0.49), vec3(0.78, 0.71, 0.65), blotch);
    albedo = mix(albedo, vec3(0.66, 0.38, 0.36), 0.55 * joint);
    float silt = smoothstep(0.38, 0.6, u + 0.12 * (blotch - 0.5));
    albedo = mix(albedo, vec3(0.47, 0.45, 0.42), silt * (0.55 + 0.35 * crease));
    // Wet from the water up to where it last stood deeper.
    wet = smoothstep(uSea + 0.32, uSea + 0.04, vWorld.y + 0.1 * (blotch - 0.5));
  }
  if (uDead > 0.5) {
    // Dead some days: the colour gone out of it, the skin dried grey and leathery, salt in every hollow and on every upward face.
    wet = 0.0;
    float grey = dot(albedo, vec3(0.3, 0.5, 0.2));
    albedo = mix(albedo, grey * vec3(0.78, 0.74, 0.66), kind > 1.5 && kind < 2.5 ? 0.55 : 0.7);
    albedo *= kind > 1.5 && kind < 2.5 ? 0.55 : 0.8 + 0.2 * blotch;
    float salt = smoothstep(0.45, 0.75, fbm(vWorld.xz * 9.0 + seed) + 0.3 * n.y - 0.15);
    albedo = mix(albedo, vec3(0.8, 0.78, 0.74), 0.55 * salt);
    rough = 0.92;
  }
  albedo *= 1.0 - 0.45 * wet;
  rough = mix(rough, 0.25, wet);
  if (mid > 0.01) n = relief(vWorld, n, height);

  vec3 colour = rigShade(vWorld, n, v, albedo, rough, occ);
  // Thin skin against the light: the sun comes a little way through at the edges, warm.
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float against = clamp(dot(v, -uSunDir), 0.0, 1.0);
  float thin = kind > 1.5 && kind < 2.5 ? 1.0 : 0.45;
  colour += albedo * vec3(1.0, 0.55, 0.42) * uSunColour * (thin * 0.5 * against * against * pow(1.0 - nv, 1.5) * sunAt(vWorld));
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;
