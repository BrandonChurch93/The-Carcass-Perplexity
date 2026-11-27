// The hide of a wader in the light of the rig: thin pale bare skin, like a plucked bird's, over ribs and joints; wet, clumped tendrils.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const VERTEX = /* glsl */ `
attribute vec2 aUv;
attribute vec4 aInfo;
attribute vec2 aLook;
attribute float aHeat;
attribute float aWho;
attribute vec3 aRest;
attribute vec3 aRestN;
attribute vec4 aPic;
attribute float aLimb;
varying vec4 vPic;
varying float vLimb;
varying vec3 vRest;
varying vec3 vRestN;
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
  bool strand = aLook.x > 1.5 && aLook.x < 2.5;
  float least = strand ? 0.6 : 0.55;
  p += n * max(0.0, least * uPixel * far - aInfo.z);
  vWorld = p;
  vNormal = n;
  vUv = aUv;
  vInfo = aInfo;
  vLook = aLook;
  vWet = aHeat;
  vRest = aRest;
  vRestN = aRestN;
  vPic = aPic;
  vLimb = aLimb;
  // The mirror image: the same animal upside down under the level of the water.
  if (uMirror > 0.5) p.y = 2.0 * uSea - p.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  // Beyond sixty metres a mop is smaller than a pixel and, drawn at a pixel, is a red dot: there it is left off.
  if (strand && far > 60.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
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
varying vec3 vRest;
varying vec3 vRestN;
uniform float uSea;
uniform float uPixel;
uniform float uDead;
uniform float uMirror;
uniform sampler2D tHide;
uniform sampler2D tHideNh;
uniform sampler2D tWader;
uniform sampler2D tWaderA;
varying vec4 vPic;
varying float vLimb;
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
  // The dead one is drawn from both sides: whatever the lens sees of it faces the lens.
  if (uDead > 0.5 && dot(n, v) < 0.0) n = -n;
  float kind = vLook.x;
  float u = vLook.y;
  float seed = vInfo.w;
  float tendril = kind > 1.5 && kind < 2.5 ? 1.0 : 0.0;
  // How many metres a pixel covers here: detail finer than that is left out, not drawn as noise.
  float px = uPixel * far;
  float fine = smoothstep(0.014, 0.003, px);
  float mid = smoothstep(0.06, 0.012, px);

  float whole = step(3.5, kind);
  // One skin has no seam to lay a picture along: everything on it is laid by where the skin is on the animal at rest, on three axes.
  vec3 rn = normalize(vRestN + vec3(1e-5));
  vec3 tw = pow(abs(rn), vec3(4.0));
  tw /= tw.x + tw.y + tw.z;
  vec2 q = mix(vUv, vRest.xy + vRest.z * vec2(0.83, 0.41), whole) + seed * 1.37;
  float blotch = fbm(q * vec2(2.6, 3.4));
  float mottle = fbm(q * vec2(9.0, 11.0) + 5.0);
  float pimple = smoothstep(0.72, 0.9, vnoise(q * 95.0)) * fine;
  float vein = (1.0 - smoothstep(0.0, 0.05, abs(vnoise(q * vec2(4.0, 6.0) + 7.3) - 0.5))) * smoothstep(0.35, 0.6, vnoise(q * 1.7 + 2.0));
  // The picture of bare skin, one repeat 0.6 m wide, read at that size and at a third of it: its colour, its veins and its wrinkles.
  vec2 uvH = vUv / 0.6 + seed * 0.731;
  vec2 uvF = vUv.yx / 0.19 + seed * 0.417;
  vec3 hideC = vec3(0.693, 0.585, 0.53);
  vec3 hideF = hideC;
  float grain = 0.5;
  float swell = 0.5;
  if (whole > 0.5) {
    vec3 r6 = vRest / 0.6 + seed * 0.731;
    vec3 r2 = vRest / 0.19 + seed * 0.417;
    hideC = tw.x * texture2D(tHide, r6.zy).rgb + tw.y * texture2D(tHide, r6.xz).rgb + tw.z * texture2D(tHide, r6.xy).rgb;
    swell = tw.x * texture2D(tHideNh, r6.zy).b + tw.y * texture2D(tHideNh, r6.xz).b + tw.z * texture2D(tHideNh, r6.xy).b;
    vec2 one = tw.z > max(tw.x, tw.y) ? r2.xy : tw.y > tw.x ? r2.xz : r2.zy;
    hideF = texture2D(tHide, one).rgb;
    grain = texture2D(tHideNh, one).b;
  } else if (tendril < 0.5) {
    hideC = texture2D(tHide, uvH).rgb;
    hideF = texture2D(tHide, uvF).rgb;
    swell = texture2D(tHideNh, uvH).b;
    grain = texture2D(tHideNh, uvF).b;
  }
  // What the picture says of the skin beside its own mean: applied to the colour the shader sets for each part.
  vec3 told = mix(vec3(1.0), (0.85 * hideC + 0.15 * hideF) / vec3(0.693, 0.585, 0.53), mid);
  told = mix(vec3(dot(told, vec3(0.333))), told, 1.1);
  float crack = clamp(dot(told, vec3(0.333)), 0.0, 2.0);

  vec3 pale = mix(vec3(0.55, 0.38, 0.35), vec3(0.8, 0.65, 0.59), smoothstep(0.25, 0.7, blotch)) * (0.78 + 0.44 * mottle) * clamp(mix(vec3(1.0), told, kind > 2.5 ? 0.45 : 1.0), 0.0, 2.0);
  vec3 raw = vec3(0.58, 0.34, 0.3);
  vec3 albedo;
  float rough = 0.7;
  float height = 0.0;
  float occ = vInfo.y;
  float wet = 0.0;
  float thin = 0.5;
  float soaked = 0.0;
  if (whole > 0.5) {
    // One skin over the whole animal: bare, pale, thin. The ribs and the bones are in its shape; here they are sharpened and coloured.
    float legT = vInfo.x;
    float neckU = vLook.y;
    float cage = vUv.y;
    float each = 0.45 + 0.55 * hash12(vec2(floor(vUv.x + 0.5) * 3.7, seed));
    float rib = pow(0.5 + 0.5 * cos(vUv.x * 6.2832), 1.6) * each;
    float between = cage * (each - rib);
    float drape = fbm(q * vec2(5.0, 7.0) + 9.0) - 0.5;
    float crease = fbm(q * vec2(23.0, 31.0) + 3.0) - 0.5;
    // Slack skin in folds across the neck where it leaves the chest, and round every joint.
    float joint = exp(-pow((legT - 0.47) / 0.05, 2.0)) + exp(-pow((legT - 0.94) / 0.03, 2.0));
    float shank = smoothstep(0.42, 0.52, legT);
    float fold = 0.5 * (vnoise(vec2(dot(vRest.xy, vec2(0.89, 0.45)) * 46.0 + 3.0 * vnoise(q * 7.0), vRest.z * 9.0 + dot(vRest.xy, vec2(-0.45, 0.89)) * 7.0) + seed) - 0.5) * smoothstep(0.02, 0.12, neckU);
    height = (0.002 * rib * cage + 0.0045 * (swell - 0.5) + 0.0012 * (grain - 0.5) + 0.012 * drape * (1.0 - 0.7 * cage) * (1.0 - 0.8 * shank) + 0.0035 * crease + 0.004 * fold) * mid;
    pale = mix(vec3(0.74, 0.63, 0.58), vec3(0.95, 0.89, 0.82), smoothstep(0.2, 0.65, blotch)) * (0.84 + 0.32 * mottle) * clamp(told, 0.0, 2.0);
    albedo = pale * (0.78 + 0.22 * crack) * (1.0 + (0.42 * drape + 0.34 * crease + 0.34 * fold) * mid);
    occ *= 1.0 - 0.14 * between * mid;
    albedo = mix(albedo, vec3(0.4, 0.4, 0.52), 0.42 * vein * mid * (1.0 - shank));
    // Raw where bone rubs the skin from inside: the points of the hips, the spine, the joints, the end of the neck.
    float bony = smoothstep(0.55, 0.95, rn.y) * (1.0 - step(0.01, legT)) * (1.0 - smoothstep(0.0, 0.1, neckU));
    float sore = smoothstep(0.42, 0.66, mottle) * (0.25 + 0.45 * smoothstep(0.4, 0.65, blotch)) + 0.5 * smoothstep(0.52, 0.7, fbm(q * vec2(1.3, 1.9) + 3.0)) + 0.3 * bony + 0.75 * joint + smoothstep(0.62, 1.0, neckU) * (0.5 + 0.4 * blotch);
    albedo = mix(albedo, raw, 0.36 * clamp(sore, 0.0, 0.9));
    albedo = mix(albedo, vec3(0.62, 0.3, 0.28), 0.35 * pimple * smoothstep(0.4, 0.7, mottle));
    // The belly and the legs are splashed grey with silt; the foot is dark horn.
    float belly = smoothstep(-0.3, -0.9, rn.y) * (1.0 - step(0.01, legT)) * (1.0 - step(0.02, neckU));
    albedo = mix(albedo, vec3(0.36, 0.34, 0.31), belly * (0.3 + 0.4 * smoothstep(0.35, 0.65, vnoise(q * 13.0))));
    albedo = mix(albedo, vec3(0.42, 0.33, 0.29) * (0.6 + 0.6 * mottle), 0.5 * shank);
    float horn = smoothstep(0.955, 0.972, legT + 0.01 * (mottle - 0.5));
    albedo = mix(albedo, vec3(0.07, 0.055, 0.05) * (0.7 + 0.6 * crack), horn);
    rough = mix(rough, 0.45, horn);
    // The side view picture of a living one, laid on the skin where it is at rest: the trunk in its box, each leg down its own line,
    // the neck along its arc. It gives the skin its wrinkles, its ribs as soft shadows, its knees and its hooves.
    float limb = smoothstep(0.2, 0.8, vLimb);
    vec3 shot = mix(texture2D(tWader, vPic.xy).rgb, texture2D(tWader, vPic.zw).rgb, limb);
    float cover = mix(texture2D(tWaderA, vPic.xy).r, texture2D(tWaderA, vPic.zw).r, limb);
    float shown = smoothstep(0.5, 0.95, cover) * smoothstep(0.02, 0.06, dot(shot, vec3(0.333))) * mid * (1.0 - uDead);
    // The picture is of a whole animal and gives out before the lens is close: the sheet of bare skin, pores, creases, veins and blotches, is laid over it.
    albedo = mix(albedo, mix(shot, dot(shot, vec3(0.333)) * vec3(1.04, 1.0, 0.93), 0.66) * 3.0 * (0.92 + 0.16 * mottle) * mix(vec3(1.0), clamp(told, 0.0, 2.0), 0.8), 0.88 * shown);
    // Bare skin with little blood in it: grey cream, the red left to the blotches and the creases.
    albedo = mix(dot(albedo, vec3(0.3, 0.5, 0.2)) * vec3(1.06, 0.97, 0.93), albedo, 0.7);
    height = height * (1.0 - 0.3 * shown) + 0.0035 * (dot(shot, vec3(0.333)) - 0.3) * shown * fine;
    // Below the joint the leg is hard, scaled and grey with silt; the joints are knotted and raw; the foot is dark horn.
    float scaled = vnoise(q * vec2(70.0, 110.0));
    vec3 shankC = mix(vec3(0.11, 0.095, 0.085), vec3(0.24, 0.2, 0.175), mottle) * (0.55 + 0.9 * scaled);
    albedo = mix(albedo, shankC, 0.86 * shank * (1.0 - 0.6 * min(joint, 1.0)));
    // The skin over a joint is slack and creased across the leg.
    float knuckle = vnoise(vec2(legT * 150.0, q.x * 12.0 + seed));
    albedo = mix(albedo, vec3(0.52, 0.2, 0.17) * (0.5 + 0.95 * knuckle), 0.7 * min(joint, 1.0));
    height += 0.003 * (knuckle - 0.5) * min(joint, 1.0) * mid;
    albedo = mix(albedo, vec3(0.07, 0.055, 0.05) * (0.7 + 0.6 * crack), horn);
    height += 0.0016 * (scaled - 0.5) * shank * fine;
    // No two are one colour: one is chalk pale, the next ruddy, the next grey with old silt.
    float own = hash12(vec2(seed, 1.7));
    albedo *= mix(vec3(0.8, 0.77, 0.77), vec3(1.08, 1.02, 0.99), own) * mix(vec3(1.0), vec3(1.04, 0.95, 0.92), step(0.6, hash12(vec2(seed, 6.1))));
    // Wet from the water up to where it last stood deeper, and dark with it.
    wet = smoothstep(0.3, 0.42, legT) * smoothstep(uSea + 0.8, uSea + 0.15, vWorld.y + 0.3 * (blotch - 0.5));
    thin = mix(0.5, 0.75, smoothstep(0.1, 0.5, neckU)) * (1.0 - 0.3 * shank);
    // The back is damp with the breath of the shaft: it takes a sheen from the low sun.
    rough = mix(rough, 0.36, 0.7 * smoothstep(0.1, 0.8, n.y) * (1.0 - step(0.01, legT)));
  } else if (kind < 0.5) {
    // The trunk: the ribs show through the skin as fine ridges that curve down the flank, each a little unlike the next;
    // the points of the hips and the spine are rubbed raw, the belly is splashed grey with silt.
    float sn = sin(vUv.y / 0.32);
    float down = abs(cos(vUv.y / 0.32));
    float cage = smoothstep(0.36, 0.5, u) * smoothstep(0.92, 0.78, u) * smoothstep(0.55, 0.95, down) * smoothstep(-0.75, -0.25, sn) * smoothstep(0.6, 0.2, sn) * (0.55 + 0.45 * smoothstep(0.3, 0.6, blotch)) * (1.0 - uDead);
    // They lean back as they go down the flank, and none is quite the width of the next.
    float ribAt = (u - 0.2 * sn - 0.1 * sn * sn + 0.03 * (mottle - 0.5)) * 62.0 + 2.6 * vnoise(vec2(u * 7.0 + seed, vUv.y * 2.3));
    float rib = pow(0.5 + 0.5 * cos(ribAt), 2.0);
    float each = 0.35 + 0.65 * vnoise(vec2(floor(ribAt / 6.2832) * 7.1 + seed, vUv.y * 3.0));
    // The knuckles of the spine along the back, and the hollow of the flank behind the last rib.
    float back = smoothstep(0.9, 1.0, sn) * smoothstep(0.08, 0.2, u) * smoothstep(0.95, 0.8, u);
    float knuckle = back * pow(0.5 + 0.5 * cos(u * 70.0 + 2.0 * vnoise(vec2(u * 9.0, seed))), 2.0);
    // Between two ribs the skin is drawn in and sees less of the sky, whatever the light.
    float between_ = cage * (1.0 - rib) * each * mid;
    height = 0.017 * rib * each * cage * mid + 0.008 * knuckle * mid + (0.004 * (swell - 0.5) + 0.0008 * (grain - 0.5)) * mid;
    // Nothing under the skin is smooth: muscle gone slack, the heads of bones, old scars.
    float drape = fbm(q * vec2(5.0, 7.0) + 9.0) - 0.5;
    float crease = fbm(q * vec2(17.0, 23.0) + 3.0) - 0.5;
    height += (0.03 * drape + 0.003 * crease) * mid * (1.0 - 0.6 * cage);
    albedo = pale * (0.82 + 0.18 * crack) * (1.0 - 0.12 * between_) * (1.0 + (0.4 * drape + 0.12 * crease) * mid);
    float between = between_;
    occ *= 1.0 - 0.16 * between - 0.07 * back * (1.0 - knuckle) * mid;
    albedo = mix(albedo, vec3(0.4, 0.42, 0.52), 0.2 * vein * mid);
    float sore = smoothstep(0.42, 0.66, mottle) * (0.3 + 0.5 * smoothstep(0.4, 0.65, blotch)) + 0.55 * smoothstep(0.52, 0.7, fbm(q * vec2(1.3, 1.9) + 3.0)) + 0.4 * smoothstep(0.86, 1.0, u) + 0.3 * smoothstep(0.1, 0.0, u) + 0.3 * smoothstep(0.86, 1.0, sn);
    albedo = mix(albedo, raw, 0.55 * clamp(sore, 0.0, 0.8));
    albedo = mix(albedo, vec3(0.62, 0.3, 0.28), 0.35 * pimple * smoothstep(0.4, 0.7, mottle));
    float belly = smoothstep(-0.35, -0.95, sn);
    albedo = mix(albedo, vec3(0.36, 0.34, 0.31), belly * (0.35 + 0.45 * smoothstep(0.35, 0.65, vnoise(q * 13.0))));
  } else if (kind < 1.5) {
    // The neck: slack skin in folds where it leaves the chest, tighter and pinker along it, raw at the end where the tendrils root.
    float fold = vnoise(vec2(vUv.x * 34.0 + 3.0 * vnoise(vUv * 7.0 + seed), vUv.y * 9.0) + seed) - 0.5;
    height = 0.006 * fold * (1.0 - 0.45 * smoothstep(0.0, 0.4, u)) * mid + (0.003 * (swell - 0.5) + 0.0006 * (grain - 0.5)) * mid;
    albedo = pale * (0.82 + 0.18 * crack);
    albedo = mix(albedo, vec3(0.4, 0.42, 0.52), 0.16 * vein * mid);
    albedo = mix(albedo, raw, clamp(0.3 * smoothstep(0.5, 0.75, mottle) + smoothstep(0.6, 1.0, u) * (0.5 + 0.4 * blotch), 0.0, 0.85));
    albedo = mix(albedo, vec3(0.62, 0.3, 0.28), 0.3 * pimple * smoothstep(0.4, 0.7, mottle));
    albedo *= 1.0 + 0.22 * fold * (1.0 - 0.45 * smoothstep(0.0, 0.4, u)) * mid;
    thin = 0.7;
  } else if (kind < 2.5) {
    // The mop: roots of the same bare flesh as the neck where they leave it, rose down their length and blood dark at the thread of the tip;
    // the fine ends are redder; weed is weed. Wet, they are darker and shine. Thin as they are, the low sun comes through them.
    float type = floor(vInfo.x + 0.001);
    float tone = fract(vInfo.x);
    float own = hash12(vec2(seed, 9.0));
    soaked = step(0.25, vWet);
    float under = clamp(vWet * 2.0 - 1.0, 0.0, 1.0);
    float along = u + 0.16 * (vnoise(vec2(u * 6.0, seed * 13.0)) - 0.5);
    vec3 flesh = mix(vec3(0.8, 0.62, 0.57), vec3(0.72, 0.5, 0.47), own);
    vec3 rose = mix(vec3(0.7, 0.36, 0.34), vec3(0.78, 0.47, 0.43), tone);
    vec3 blood = mix(vec3(0.3, 0.06, 0.065), vec3(0.45, 0.11, 0.1), tone);
    albedo = mix(flesh, rose, smoothstep(0.1, 0.55, along));
    albedo = mix(albedo, blood, 0.85 * smoothstep(0.55, 1.0, along));
    // Ringed and blotched like a worm, not one even colour down its length.
    albedo *= 0.86 + 0.28 * vnoise(vec2(vUv.x * 70.0, seed * 7.0));
    float isWeed = step(1.5, type);
    // What has been dragged through the water has weed caught on its lower half, in patches.
    float caught = soaked * smoothstep(0.5, 0.72, vnoise(vec2(u * 8.0 + seed * 3.0, tone * 20.0))) * smoothstep(0.3, 0.6, u) * 0.75;
    float weed = max(isWeed, caught);
    albedo = mix(albedo, mix(vec3(0.05, 0.055, 0.02), vec3(0.12, 0.105, 0.04), tone), weed);
    rough = mix(0.5, 0.88, weed);
    // Far off the mop is one mass: no strand of it is seen for itself.
    albedo = mix(mix(vec3(0.6, 0.3, 0.29), vec3(0.42, 0.2, 0.19), soaked), albedo, smoothstep(0.03, 0.008, px));
    wet = soaked * (0.55 + 0.45 * under);
    occ *= 0.72 + 0.28 * u;
    thin = mix(mix(0.3, 0.75, smoothstep(0.15, 0.8, u)), 0.08, weed);
  } else {
    // A leg: the thigh is the skin of the trunk; below the joint it is hard, scaled and grey with dried silt, the joints knotted and raw.
    float shank = smoothstep(0.36, 0.5, u + 0.08 * (blotch - 0.5));
    float joint = exp(-pow((u - 0.47) / 0.06, 2.0)) + exp(-pow((u - 0.93) / 0.04, 2.0));
    float scale = vnoise(vUv * vec2(55.0, 110.0) + seed);
    // Cords stand under the skin above and below the joint.
    float cord = pow(0.5 + 0.5 * cos(vUv.y / max(vInfo.z, 0.004) * 3.0 + seed), 3.0) * exp(-pow((u - 0.47) / 0.16, 2.0)) * (1.0 - 0.6 * joint);
    height = (0.002 * (swell - 0.5) + 0.0005 * (grain - 0.5)) * mid + 0.0018 * (scale - 0.5) * shank * fine + 0.006 * cord * mid;
    occ *= 1.0 - 0.25 * cord;
    albedo = pale * (0.8 + 0.2 * crack);
    albedo = mix(albedo, vec3(0.4, 0.42, 0.52), 0.16 * vein * mid * (1.0 - shank));
    albedo = mix(albedo, raw, 0.5 * joint + 0.25 * smoothstep(0.5, 0.75, mottle) * (1.0 - shank));
    albedo = mix(albedo, vec3(0.1, 0.065, 0.058) * (0.7 + 0.5 * crack), shank * (0.75 + 0.25 * mottle) * (1.0 - 0.3 * joint));
    // Wet from the water up to where it last stood deeper.
    wet = smoothstep(uSea + 0.5, uSea + 0.08, vWorld.y + 0.2 * (blotch - 0.5));
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
      albedo = mix(albedo, grey * vec3(0.98, 0.9, 0.78), 0.8) * mix(0.56, 0.8, whole);
      float grime = fbm(vWorld.xz * 5.0 + vWorld.y * 7.0 + seed);
      albedo *= 0.5 + 0.85 * grime;
      // One skin has no seam: what dries on it is laid by where the skin is on the animal.
      vec2 duv = whole > 0.5 ? q : vUv;
      float scale_ = kind > 0.5 && kind < 1.5 ? smoothstep(0.25, 0.6, vnoise(duv * vec2(120.0, 90.0) + seed)) : 0.5;
      albedo *= 0.8 + 0.4 * scale_;
      float neckD = whole * smoothstep(0.05, 0.2, vLook.y);
      float wrinkle = kind < 0.5 || (whole > 0.5 && neckD < 0.5) ? fbm(duv * 26.0 + seed) - 0.5 : vnoise(vec2(dot(vRest.xy, vec2(0.89, 0.45)) * 70.0 + 3.0 * vnoise(duv * 9.0), duv.y * 16.0) + seed) - 0.5;
      float crease = vnoise(duv * vec2(21.0, 57.0) + seed) - 0.5;
      // On the trunk the skin hangs in folds from the spine; on the neck it has dried in rings; the legs are bone with a little skin on.
      float drape = kind < 0.5 || whole > 0.5 ? fbm(duv * vec2(7.0, 9.0) + seed + 5.0) - 0.5 : 0.0;
      float ringed = kind < 0.5 || whole > 0.5 ? 0.9 : kind < 1.5 ? 0.4 : 0.2;
      height += (0.007 * ringed * wrinkle + 0.004 * crease + 0.03 * drape * (1.0 - 0.6 * whole) + 0.004 * (swell - 0.5)) * mid;
      albedo *= 1.0 + (0.4 * ringed * wrinkle + 0.35 * drape) * mid;
      float hollow = 1.0 - vInfo.y;
      float rot = smoothstep(0.42, 0.68, fbm(q * vec2(3.1, 2.3) + 11.0) + 0.3 * hollow);
      albedo = mix(albedo, vec3(0.17, 0.08, 0.06), 0.8 * rot);
      // The shanks and the feet have gone dark and hard.
      if (kind > 2.5) albedo = mix(albedo, vec3(0.13, 0.1, 0.085), whole > 0.5 ? 0.6 * smoothstep(0.42, 0.56, vInfo.x) : 0.35 + 0.5 * smoothstep(0.4, 0.6, u));
      // Where it lies on the rock it is dark with what ran out of it and with the damp.
      albedo *= 0.45 + 0.55 * smoothstep(0.02, 0.2, vWorld.y - landAt(vWorld.xz).r);
      albedo = mix(albedo, vec3(0.3, 0.2, 0.15), 0.5 * hollow);
      float salt = smoothstep(0.45, 0.75, fbm(vWorld.xz * 9.0 + seed) + 0.3 * n.y - 0.15 + 0.2 * hollow);
      albedo = mix(albedo, vec3(0.8, 0.78, 0.74), 0.5 * salt);
    }
    rough = 0.92;
    thin *= 0.3;
  }
  albedo *= 1.0 - (0.62 - 0.3 * tendril) * wet;
  rough = mix(rough, mix(0.22, max(rough, 0.5), tendril), wet);
  // The slope is taken for every pixel, not behind a test that differs from one pixel to the next.
  vec3 turned = relief(vWorld, n, height);
  if (mid > 0.01 && tendril < 0.5) n = turned;

  // The shade an animal throws on the water under it is not on the animal: the light is asked for above the reach of that shade.
  vec3 colour = rigShade(vWorld + vec3(0.0, 5.0, 0.0), n, v, albedo, rough, occ);
  // The bright water and the fog all round throw the low sun back up at them, and a little of it wraps round through the thin skin.
  float lit = sunAt(vWorld);
  float wrap = clamp((dot(n, uSunDir) + 0.75) / 1.75, 0.0, 1.0);
  // Round the low sun the fog itself is bright: what faces up and toward it is lit by more than the disc.
  float halo = pow(clamp(0.5 + 0.5 * dot(n, normalize(uSunDir + vec3(0.0, 0.8, 0.0))), 0.0, 1.0), 2.0) * 0.7;
  // The fog they stand in is itself the brightest thing about them: it lights them from every side, more from the side of the sun.
  vec3 flat_ = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
  float fogLight = 0.5 * max(0.05, mix(0.54, 0.4, smoothstep(22.0, 110.0, far)) + 0.34 * dot(n, flat_) + 0.08 * n.y);
  vec3 fogColour = skyIrradiance(normalize(flat_ + vec3(0.0, 0.4, 0.0))) * vec3(1.14, 1.0, 0.86) / 3.14159;
  colour += albedo * (uSunColour * (0.2 * wrap * wrap + 3.0 * (1.0 - 0.3 * tendril) * halo * halo * halo) + fogColour * (4.9 * (1.0 - 0.45 * tendril) * fogLight * (1.0 + 1.2 * (1.0 - lit)))) * (occ * (0.7 + 0.3 * lit) * (1.0 - 0.6 * uDead));
  // Thin bare skin against a low sun: the light comes a little way through at the edge of every limb, warm, and the edge reads bright.
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float against = clamp(dot(v, -uSunDir), 0.0, 1.0);
  float edge = pow(1.0 - nv, 2.0) + (0.3 + 1.1 * smoothstep(0.3, 0.7, vnoise(vWorld.xy * 3.1 + vWorld.z * 2.3))) * pow(1.0 - nv, 3.0) * (1.0 - tendril) * smoothstep(-0.1, 0.5, n.y + 0.6 * dot(n, flat_));
  // The rim is the sun's own colour come through skin and blood, and only on the side the sun is on: the relief of the hide breaks it.
  vec3 through = mix(vec3(1.0, 0.52, 0.36), vec3(1.0, 0.36, 0.22), tendril);
  // A strand is thin all through, not only at its edge.
  edge = mix(edge, 0.45 + 0.55 * edge, tendril);
  colour += albedo * through * uSunColour * ((1.0 - 0.8 * uMirror) * thin * 2.3 * (0.3 + 0.7 * against * against) * edge * max(lit, 0.6) * (0.5 + 0.5 * occ) * smoothstep(-0.2, 0.5, dot(n, uSunDir)));
  if (uMirror > 0.5) {
    gl_FragColor = vec4(colour * (1.0 - uSolo), 1.0);
    return;
  }
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;
