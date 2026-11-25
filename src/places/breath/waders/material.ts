// The hide of a wader in the light of the rig: thin pale bare skin, like a plucked bird's, over ribs and joints; wet, clumped tendrils.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const VERTEX = /* glsl */ `
attribute vec2 aUv;
attribute vec4 aInfo;
attribute vec2 aLook;
attribute float aHeat;
attribute float aWho;
uniform float uPixel;
uniform float uMirror;
uniform float uSea;
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
  float least = aLook.x > 1.5 && aLook.x < 2.5 ? 0.4 : 0.8;
  p += n * max(0.0, least * uPixel * far - aInfo.z);
  vWorld = p;
  vNormal = n;
  vUv = aUv;
  vInfo = aInfo;
  vLook = aLook;
  vWet = aHeat;
  // The mirror image: the same animal upside down under the level of the water.
  if (uMirror > 0.5) p.y = 2.0 * uSea - p.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

/** The skin cuts no holes in the film's own picture (only in the water's mirror), so its depth can be laid before the picture, where the fog reads it. */
export const DEPTH_FRAGMENT = 'void main() { gl_FragColor = vec4(0.0); }';

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
uniform float uMirror;
uniform sampler2D tHide;
uniform sampler2D tHideNh;
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
  // In the water's mirror only what stands above the water is seen, from the mirrored eye.
  vec3 eye = cameraPosition;
  if (uMirror > 0.5) {
    if (vWorld.y < uSea) discard;
    eye.y = 2.0 * uSea - eye.y;
  }
  vec3 n = normalize(vNormal);
  vec3 toEye = eye - vWorld;
  float far = length(toEye);
  vec3 v = toEye / far;
  float kind = vLook.x;
  float u = vLook.y;
  float seed = vInfo.w;
  float tendril = kind > 1.5 && kind < 2.5 ? 1.0 : 0.0;
  // How many metres a pixel covers here: detail finer than that is left out, not drawn as noise.
  float px = uPixel * far;
  float fine = smoothstep(0.014, 0.003, px);
  float mid = smoothstep(0.06, 0.012, px);

  vec2 q = vUv + seed * 1.37;
  float blotch = fbm(q * vec2(2.6, 3.4));
  float mottle = fbm(q * vec2(9.0, 11.0) + 5.0);
  float pimple = smoothstep(0.72, 0.9, vnoise(q * 95.0)) * fine;
  float vein = (1.0 - smoothstep(0.0, 0.05, abs(vnoise(q * vec2(4.0, 6.0) + 7.3) - 0.5))) * smoothstep(0.35, 0.6, vnoise(q * 1.7 + 2.0));
  // The picture of cracked hide gives the grain of the skin: fine wrinkles that run round a limb and down a flank.
  vec2 uvH = (kind > 2.5 ? vUv * vec2(2.2, 3.4) : vUv.yx * vec2(1.9, 1.5)) + seed * 0.731;
  vec3 hideC = vec3(0.064);
  float grain = 0.5;
  if (tendril < 0.5 && mid > 0.0) {
    hideC = texture2D(tHide, uvH).rgb;
    grain = texture2D(tHideNh, uvH).b;
  }
  float crack = clamp(dot(hideC, vec3(0.333)) / 0.064, 0.0, 2.0);
  crack = mix(1.0, crack, mid);

  vec3 pale = mix(vec3(0.66, 0.57, 0.51), vec3(0.8, 0.74, 0.68), blotch);
  vec3 raw = vec3(0.62, 0.3, 0.27);
  vec3 albedo;
  float rough = 0.7;
  float height = 0.0;
  float occ = vInfo.y;
  float wet = 0.0;
  float thin = 0.5;
  if (kind < 0.5) {
    // The trunk: the ribs show through the skin as fine ridges that curve down the flank, each a little unlike the next;
    // the points of the hips and the spine are rubbed raw, the belly is splashed grey with silt.
    float sn = sin(vUv.y / 0.32);
    float down = abs(cos(vUv.y / 0.32));
    float cage = smoothstep(0.36, 0.5, u) * smoothstep(0.92, 0.78, u) * smoothstep(0.55, 0.95, down) * smoothstep(-0.75, -0.25, sn) * smoothstep(0.6, 0.2, sn) * (0.55 + 0.45 * smoothstep(0.3, 0.6, blotch)) * (1.0 - uDead);
    // They lean back as they go down the flank, and none is quite the width of the next.
    float ribAt = (u - 0.2 * sn - 0.1 * sn * sn + 0.03 * (mottle - 0.5)) * 110.0 + 1.5 * vnoise(vec2(u * 9.0 + seed, vUv.y * 1.5));
    float rib = pow(0.5 + 0.5 * cos(ribAt), 2.0);
    float each = 0.35 + 0.65 * vnoise(vec2(floor(ribAt / 6.2832) * 7.1 + seed, vUv.y * 3.0));
    // The knuckles of the spine along the back, and the hollow of the flank behind the last rib.
    float back = smoothstep(0.9, 1.0, sn) * smoothstep(0.08, 0.2, u) * smoothstep(0.95, 0.8, u);
    float knuckle = back * pow(0.5 + 0.5 * cos(u * 120.0), 2.0);
    height = 0.015 * rib * each * cage * mid + 0.008 * knuckle * mid + 0.003 * (grain - 0.5) * mid;
    albedo = pale * (0.82 + 0.18 * crack);
    // Between two ribs the skin is drawn in and sees less of the sky, whatever the light.
    float between = cage * (1.0 - rib) * each * mid;
    occ *= 1.0 - 0.42 * between - 0.25 * back * (1.0 - knuckle) * mid;
    albedo = mix(albedo, vec3(0.4, 0.42, 0.52), 0.2 * vein * mid);
    float sore = smoothstep(0.46, 0.7, mottle) * (0.25 + 0.4 * smoothstep(0.4, 0.65, blotch)) + 0.4 * smoothstep(0.86, 1.0, u) + 0.3 * smoothstep(0.1, 0.0, u) + 0.3 * smoothstep(0.86, 1.0, sn);
    albedo = mix(albedo, raw, clamp(sore, 0.0, 0.8));
    albedo = mix(albedo, vec3(0.62, 0.3, 0.28), 0.35 * pimple * smoothstep(0.4, 0.7, mottle));
    float belly = smoothstep(-0.35, -0.95, sn);
    albedo = mix(albedo, vec3(0.36, 0.34, 0.31), belly * (0.35 + 0.45 * smoothstep(0.35, 0.65, vnoise(q * 13.0))));
  } else if (kind < 1.5) {
    // The neck: slack skin in folds where it leaves the chest, tighter and pinker along it, raw at the end where the tendrils root.
    float fold = vnoise(vec2(vUv.x * 34.0, vUv.y * 5.0) + seed) - 0.5;
    height = 0.006 * fold * (1.0 - 0.75 * smoothstep(0.0, 0.4, u)) * mid + 0.0025 * (grain - 0.5) * mid;
    albedo = pale * (0.82 + 0.18 * crack);
    albedo = mix(albedo, vec3(0.4, 0.42, 0.52), 0.16 * vein * mid);
    albedo = mix(albedo, raw, clamp(0.3 * smoothstep(0.5, 0.75, mottle) + smoothstep(0.6, 1.0, u) * (0.5 + 0.4 * blotch), 0.0, 0.85));
    albedo = mix(albedo, vec3(0.62, 0.3, 0.28), 0.3 * pimple * smoothstep(0.4, 0.7, mottle));
    albedo *= 1.0 + 0.5 * fold * (1.0 - 0.75 * smoothstep(0.0, 0.4, u)) * mid;
    thin = 0.7;
  } else if (kind < 2.5) {
    // A tendril: raw pink where it roots, dark wine-red along it, and the ends darker still with what they have dragged through.
    float tone = vInfo.x;
    albedo = mix(vec3(0.55, 0.27, 0.26), mix(vec3(0.13, 0.03, 0.035), vec3(0.34, 0.11, 0.1), tone), smoothstep(0.0, 0.3, u));
    // A few are pale and fleshy, the pink of the neck's end carried down them.
    albedo = mix(albedo, vec3(0.56, 0.3, 0.27), step(0.7, hash12(vec2(seed, 9.0))) * 0.7);
    albedo = mix(albedo, vec3(0.09, 0.075, 0.04), smoothstep(0.55, 1.0, u) * smoothstep(0.35, 0.8, tone));
    // Some of what hangs there is weed it has dragged up: dark, olive.
    albedo = mix(albedo, vec3(0.07, 0.065, 0.035), step(0.82, hash12(vec2(seed, 5.0))) * smoothstep(0.1, 0.3, u));
    wet = 0.6 + 0.4 * vWet;
    occ *= 0.7 + 0.3 * u;
    thin = 1.0;
  } else {
    // A leg: the thigh is the skin of the trunk; below the joint it is hard, scaled and grey with dried silt, the joints knotted and raw.
    float shank = smoothstep(0.36, 0.5, u + 0.08 * (blotch - 0.5));
    float joint = exp(-pow((u - 0.47) / 0.06, 2.0)) + exp(-pow((u - 0.93) / 0.04, 2.0));
    float scale = vnoise(vUv * vec2(55.0, 110.0) + seed);
    height = 0.0025 * (grain - 0.5) * mid + 0.0018 * (scale - 0.5) * shank * fine;
    albedo = pale * (0.8 + 0.2 * crack);
    albedo = mix(albedo, vec3(0.4, 0.42, 0.52), 0.16 * vein * mid * (1.0 - shank));
    albedo = mix(albedo, raw, 0.5 * joint + 0.25 * smoothstep(0.5, 0.75, mottle) * (1.0 - shank));
    albedo = mix(albedo, vec3(0.33, 0.3, 0.27) * (0.7 + 0.5 * crack), shank * (0.7 + 0.25 * mottle) * (1.0 - 0.4 * joint));
    // Wet from the water up to where it last stood deeper.
    wet = smoothstep(uSea + 0.36, uSea + 0.05, vWorld.y + 0.12 * (blotch - 0.5));
    thin = 0.35;
  }
  if (uDead > 0.5) {
    // Dead some days: the colour gone out of it, the skin dried to parchment and drawn into wrinkles, brown where it has leaked,
    // salt in every hollow and on every upward face; the weed on it is nearly black.
    wet = 0.0;
    if (tendril > 0.5) {
      albedo = vInfo.x > 1.5 ? mix(vec3(0.13, 0.11, 0.06), vec3(0.22, 0.18, 0.1), hash12(vec2(seed, 2.0))) : mix(albedo * 0.8, vec3(0.2, 0.1, 0.085), 0.45 + 0.4 * hash12(vec2(seed, 4.0)));
    } else {
      float grey = dot(albedo, vec3(0.3, 0.5, 0.2));
      albedo = mix(albedo, grey * vec3(0.98, 0.88, 0.74), 0.55);
      float wrinkle = vnoise(vec2(vUv.x * 70.0 + 3.0 * vnoise(vUv * 9.0), vUv.y * 16.0) + seed) - 0.5;
      float crease = vnoise(vUv * vec2(21.0, 57.0) + seed) - 0.5;
      // On the trunk the skin hangs in folds from the spine; on the neck it has dried in rings; the legs are bone with a little skin on.
      float drape = kind < 0.5 ? vnoise(vec2(vUv.x * 9.0, vUv.y * 46.0 + 4.0 * vnoise(vUv * 6.0)) + seed) - 0.5 : 0.0;
      float ringed = kind < 0.5 ? 0.35 : kind < 1.5 ? 0.7 : 0.2;
      height += (0.007 * ringed * wrinkle + 0.004 * crease + 0.012 * drape) * mid;
      albedo *= 1.0 + (0.4 * ringed * wrinkle + 0.35 * drape) * mid;
      float hollow = 1.0 - vInfo.y;
      float rot = smoothstep(0.5, 0.72, fbm(q * vec2(3.1, 2.3) + 11.0) + 0.3 * hollow);
      albedo = mix(albedo, vec3(0.2, 0.085, 0.06), 0.7 * rot);
      albedo = mix(albedo, vec3(0.3, 0.2, 0.15), 0.5 * hollow);
      float salt = smoothstep(0.45, 0.75, fbm(vWorld.xz * 9.0 + seed) + 0.3 * n.y - 0.15 + 0.2 * hollow);
      albedo = mix(albedo, vec3(0.8, 0.78, 0.74), 0.5 * salt);
    }
    rough = 0.92;
    thin *= 0.3;
  }
  albedo *= 1.0 - 0.5 * wet;
  rough = mix(rough, 0.22, wet);
  if (mid > 0.01 && tendril < 0.5) n = relief(vWorld, n, height);

  // The shade an animal throws on the water under it is not on the animal: the light is asked for above the reach of that shade.
  vec3 colour = rigShade(vWorld + vec3(0.0, 5.0, 0.0), n, v, albedo, rough, occ);
  // The bright water and the fog all round throw the low sun back up at them, and a little of it wraps round through the thin skin.
  float lit = sunAt(vWorld);
  float wrap = clamp((dot(n, uSunDir) + 0.75) / 1.75, 0.0, 1.0);
  // Round the low sun the fog itself is bright: what faces up and toward it is lit by more than the disc.
  float halo = pow(max(dot(n, normalize(uSunDir + vec3(0.0, 0.8, 0.0))), 0.0), 3.0);
  // The fog they stand in is itself the brightest thing about them: it lights them from every side, more from the side of the sun.
  vec3 flat_ = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
  float fogLight = (0.36 + 1.0 * smoothstep(25.0, 140.0, far)) * (0.5 + 0.34 * dot(n, flat_) + 0.16 * n.y);
  colour += albedo * uSunColour * ((0.2 * wrap * wrap + 1.5 * halo + fogLight * (1.0 + 1.2 * (1.0 - lit))) * occ * (0.7 + 0.3 * lit) * (1.0 - 0.5 * uDead));
  // Thin bare skin against a low sun: the light comes a little way through at the edge of every limb, warm, and the edge reads bright.
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float against = clamp(dot(v, -uSunDir), 0.0, 1.0);
  float edge = pow(1.0 - nv, 1.6);
  vec3 through = mix(vec3(1.0, 0.6, 0.45), vec3(1.0, 0.2, 0.14), tendril);
  colour += albedo * through * uSunColour * (thin * 3.2 * (0.3 + 0.7 * against * against) * edge * lit * (0.5 + 0.5 * occ) * smoothstep(-0.5, 0.3, dot(n, uSunDir)));
  if (uMirror > 0.5) {
    gl_FragColor = vec4(colour * (1.0 - uSolo), 1.0);
    return;
  }
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;
