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
  vec3 ng = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float far = length(cameraPosition - vWorld);
  float kind = vLook.x;
  float body = 1.0 - smoothstep(0.4, 0.6, kind);
  float neck = smoothstep(0.5, 0.9, kind) * (1.0 - smoothstep(1.1, 1.5, kind));
  float tendril = smoothstep(1.5, 1.9, kind) * (1.0 - smoothstep(2.1, 2.5, kind));
  float pad = smoothstep(3.5, 3.9, kind) * (1.0 - smoothstep(4.1, 4.5, kind));
  float rag = smoothstep(4.5, 4.9, kind);
  float limb = 1.0 - max(body, rag);
  float pale = vInfo.x;
  float seed = vInfo.w;

  // Which way the skin's own two directions run in the world here, so that relief drawn on the skin can turn the normal.
  vec3 dpx = dFdx(vWorld);
  vec3 dpy = dFdy(vWorld);
  vec2 dux = dFdx(vUv);
  vec2 duy = dFdy(vUv);
  vec3 r1 = cross(dpy, ng);
  vec3 r2 = cross(ng, dpx);
  float det = dot(dpx, r1);
  det = (det < 0.0 ? -1.0 : 1.0) * max(abs(det), 1e-10);
  vec3 gu = (r1 * dux.x + r2 * duy.x) / det;
  vec3 gv = (r1 * dux.y + r2 * duy.y) / det;
  gu /= max(1.0, length(gu));
  gv /= max(1.0, length(gv));

  // Two pictures of skin: flaking hide in broad patches, and cracked hide finer. On a limb the fine one is drawn out along it
  // and winds round it a little as it goes down, as a dried root does.
  vec2 wound = vec2(vUv.y + 0.22 * vUv.x, vUv.x);
  vec2 uvF = mix(vUv / 2.5, vUv.yx / vec2(1.2, 1.7), limb) + seed * 3.1;
  vec2 uvH = mix(vec2(vUv.x * 0.8 - vUv.y * 0.6, vUv.x * 0.6 + vUv.y * 0.8) / 0.8, wound / vec2(0.62, 1.15), limb) + seed * 1.7;
  vec3 flakeC = texture2D(tFlake, uvF).rgb;
  vec3 hideC = texture2D(tHide, uvH).rgb;
  vec3 nhF = texture2D(tFlakeNh, uvF).rgb;
  vec3 nhH = texture2D(tHideNh, uvH).rgb;
  float fine = smoothstep(260.0, 60.0, far);
  vec2 slopeF = (nhF.rg - 0.5) * 1.5;
  vec2 slopeH = (nhH.rg - 0.5) * 1.3 * fine;
  vec2 slope = mix(slopeF + vec2(slopeH.x * 0.8 + slopeH.y * 0.6, slopeH.y * 0.8 - slopeH.x * 0.6), slopeF.yx + slopeH.yx, limb);
  float high = mix(nhF.b, nhH.b, 0.5 * fine);

  // Rings round the neck, closer and deeper toward the crown; creases across a joint.
  float crown = smoothstep(0.62, 0.95, vLook.y) * neck;
  float ringAt = vUv.x * 6.2832 / 0.21 + 2.2 * vnoise(vUv * vec2(1.6, 6.0) + seed);
  float crease = (1.0 - neck) * limb * (1.0 - tendril) * vLook.y * 0.55;
  float ringAmp = (0.4 * crown + crease + 0.1 * neck) * fine;
  slope.x += ringAmp * sin(ringAt) * 1.1;
  float ridge = 0.5 + 0.5 * cos(ringAt);
  // The knobs of the spine along the top of the body.
  float spine = body * smoothstep(0.7, 0.98, ng.y) * fine;
  slope.x += spine * 0.5 * sin(vUv.x * 6.2832 / 0.42);

  vec3 n = normalize(ng + (gu * slope.x + gv * slope.y) * (1.0 - 0.7 * tendril));

  // A dry ashen hide. Soot lies in the cracks, in the creases of the joints and under the belly; the crown and the roots are bone.
  float lum = 0.55 * dot(flakeC, vec3(4.0)) + 0.45 * dot(hideC, vec3(5.2));
  float crack = smoothstep(0.16, 0.48, high);
  float mottle = vnoise(vUv * 0.9 + seed * 7.0);
  float tone = clamp(pale + 0.2 * (mottle - 0.5) + 0.3 * (lum - 1.0) - 0.2 * ringAmp * (1.0 - ridge), 0.0, 1.0);
  vec3 soot = vec3(0.03, 0.029, 0.03);
  vec3 skin = vec3(0.25, 0.24, 0.228) * (0.5 + 0.5 * mix(lum, 1.0, 0.35 * limb));
  vec3 bone = vec3(0.45, 0.41, 0.34) * (0.5 + 0.5 * lum);
  vec3 albedo = mix(mix(soot, skin, smoothstep(0.0, 0.5, tone)), bone, smoothstep(0.5, 1.0, tone)) * (0.35 + 0.65 * crack);

  // Ash lies on whatever faces the sky, in the hollows first, and dust is carried up the legs from the crust.
  float grit = vnoise(vUv * 9.0 + seed);
  float up = smoothstep(0.15, 0.75, ng.y);
  float ash = up * smoothstep(0.85, 0.3, high + 0.4 * grit - 0.6 * up) * (1.0 - tendril) * (0.6 + 0.4 * body);
  float dust = smoothstep(2.6, 0.1, vWorld.y) * (0.25 + 0.5 * grit) * (1.0 - tendril);
  albedo = mix(albedo, vec3(0.33, 0.325, 0.32) * (0.7 + 0.5 * grit), clamp(0.85 * ash + 0.6 * dust, 0.0, 0.9));

  float occ = vInfo.y * (0.5 + 0.5 * crack) * (1.0 - 0.35 * ringAmp * (1.0 - ridge));
  vec3 c = rigShade(vWorld, n, v, albedo, 0.93, occ);
  // The tendrils and the rags are thin: the heat under them shows through them.
  float thin = tendril * 0.22 + rag * 0.15;
  c += thin * albedo * lakeIrradiance(vWorld, vec3(0.0, -1.0, 0.0)) * occ / 3.14159;
  // Where a root lies in open lava it glows from the tip: the lake itself says where it is open.
  if (vHeat > 0.001) {
    float open = dot(lakeGlow(vWorld.xz, 0.6), vec3(0.3, 0.6, 0.1)) / (max(uCast, 0.05) * dot(blackbody(1150.0), vec3(0.3, 0.6, 0.1)));
    float hot = vHeat * smoothstep(0.02, 0.3, open);
    c += blackbody(mix(820.0, 1150.0, hot)) * hot * hot * 0.6;
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
