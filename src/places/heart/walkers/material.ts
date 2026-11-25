// The hide of a crust-walker in the light of the rig.
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
varying float vHeat;
varying float vWho;
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
  vWho = aWho;
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
varying float vWho;
uniform float uPixel;
uniform sampler2D tHide;
uniform sampler2D tHideNh;
uniform sampler2D tFlake;
uniform sampler2D tFlakeNh;
uniform vec4 uPools[14];
${NOISE_GLSL}
${RIG_GLSL}
// The pool a tuft stands in is a small light on the animal that feeds there: x and z of it, and how far it is open.
// What comes back is the light a face of that albedo sends on, the dull part and a wet glint, before the colour of the heat.
vec3 poolLight(vec4 q, vec3 p, vec3 n, vec3 v, vec3 albedo, float wrap, float gloss) {
  vec3 d = vec3(q.x, 0.15, q.y) - p;
  float d2 = dot(d, d);
  vec3 l = d * inversesqrt(d2);
  float facing = max(mix(dot(n, l), 1.0, wrap), 0.0);
  float nh = max(dot(n, normalize(l + v)), 0.0);
  float e = q.z * 3.14159 * 2.25 / (d2 + 2.25) * facing;
  return (albedo / 3.14159 + vec3(gloss * 0.2 * pow(nh, 20.0))) * e * uCast;
}
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

  // Where the hide is drawn together at the two ends of the body its pattern would pinch: it lies plain there.
  float pole = body * smoothstep(0.4, 0.8, vLook.y);
  slope *= 1.0 - pole;
  // Scab plates, 20 to 60 cm, with dark gaps between them; each lies at its own small tilt and rounds off toward its edge.
  float px = far * uPixel;
  float plated = (1.0 - tendril) * (1.0 - rag) * (1.0 - pole) * smoothstep(0.09, 0.03, px);
  float gap = 0.0;
  float lip = 0.0;
  float plate = 0.5;
  if (plated > 0.0) {
    float across = mix(0.42, 0.27, limb);
    vec2 pu = mix(vUv / 0.42, vUv / vec2(0.6, 0.27), limb) + seed * 5.3;
    pu += 0.55 * (vec2(vnoise(pu * 1.3), vnoise(pu * 1.3 + 19.0)) - 0.5);
    vec2 cell = floor(pu);
    vec2 fr = pu - cell;
    float d1 = 9.0;
    float d2 = 9.0;
    vec2 p1 = vec2(0.0);
    vec2 p2 = vec2(0.0);
    vec2 id = cell;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = g + hash22(cell + g) - fr;
        float d = dot(o, o);
        if (d < d1) {
          d2 = d1;
          p2 = p1;
          d1 = d;
          p1 = o;
          id = cell + g;
        } else if (d < d2) {
          d2 = d;
          p2 = o;
        }
      }
    }
    vec2 toward = (p2 - p1) / max(length(p2 - p1), 1e-4);
    float edge = dot(0.5 * (p1 + p2), toward) * across;
    // Not every plate has come away from its neighbour: over much of the hide the gap is a hairline or closed.
    float open = smoothstep(0.38, 0.62, vnoise(vUv * 1.1 + seed * 9.0));
    gap = plated * (0.25 + 0.75 * open) * (1.0 - smoothstep(0.004 + 0.008 * open, 0.006 + 0.008 * open + max(0.006, px), edge));
    lip = plated * (0.3 + 0.7 * open) * smoothstep(0.07, 0.012, edge);
    plate = hash12(id + 3.7);
    slope += plated * ((hash22(id + 11.0) - 0.5) * 0.22 + toward * lip * 0.5);
  }
  vec3 n = normalize(ng + (gu * slope.x + gv * slope.y) * (1.0 - 0.7 * tendril));

  // A charred hide, near black, cracked like burnt wood, with pale flakes and tendon showing; the crown and the roots are bone.
  float lum = 0.55 * dot(flakeC, vec3(4.0)) + 0.45 * dot(hideC, vec3(5.2));
  lum = mix(lum, 0.9, pole);
  float crack = mix(smoothstep(0.16, 0.48, high), 0.8, pole);
  float mottle = vnoise(vUv * 0.9 + seed * 7.0);
  float tone = clamp(pale + 0.2 * (mottle - 0.5) + 0.1 * (lum - 1.0) - 0.2 * ringAmp * (1.0 - ridge), 0.0, 1.0);
  vec3 soot = vec3(0.03, 0.029, 0.03);
  // No two hides alike: each animal is sootier or greyer, and warmer or colder, than the next.
  float sooty = fract(sin(vWho * 12.9898 + 4.1) * 43758.5453);
  float warm = fract(sin(vWho * 78.233 + 1.7) * 43758.5453);
  vec3 skin = vec3(0.105, 0.097, 0.09) * mix(vec3(1.12, 1.0, 0.86), vec3(0.9, 1.0, 1.1), warm) * (0.62 + 0.7 * sooty) * (0.78 + 0.22 * lum) * (0.75 + 0.5 * plate);
  vec3 bone = vec3(0.45, 0.41, 0.34) * (0.5 + 0.5 * lum);
  vec3 albedo = mix(mix(soot, skin, smoothstep(0.0, 0.5, tone)), bone, smoothstep(0.5, 1.0, tone)) * (0.35 + 0.65 * crack);

  // Pale belongs to the edges of the plates, where the hide has dried to the colour of bone, and the gaps are black.
  albedo = mix(albedo, bone * 0.7, 0.75 * lip * (1.0 - gap) * smoothstep(0.35, 0.75, plate + 0.3 * (mottle - 0.5)));
  albedo *= 1.0 - 0.85 * gap;
  // The roots are clean bone: the lava keeps them scoured.
  albedo = mix(albedo, vec3(0.58, 0.53, 0.44) * (0.75 + 0.25 * crack), 0.75 * tendril);

  // Ash lies on whatever faces the sky, in the hollows first, and dust is carried up the legs from the crust.
  float grit = vnoise(vUv * 9.0 + seed);
  float up = smoothstep(0.15, 0.75, ng.y);
  float ash = up * smoothstep(0.85, 0.3, high + 0.4 * grit - 0.6 * up) * (1.0 - tendril) * (0.6 + 0.4 * body);
  float dust = smoothstep(2.6, 0.1, vWorld.y) * (0.25 + 0.5 * grit) * (1.0 - tendril);
  albedo = mix(albedo, vec3(0.33, 0.325, 0.32) * (0.7 + 0.5 * grit), 0.4 * ash * smoothstep(0.4, 3.0, vWorld.y));
  // The dust is the crust's own: a foot is as dark as what it stands on.
  albedo = mix(albedo, vec3(0.17, 0.16, 0.155) * (0.7 + 0.5 * grit), 0.5 * dust);

  float own = (0.5 + 0.5 * crack) * (1.0 - 0.35 * ringAmp * (1.0 - ridge)) * (1.0 - 0.7 * gap);
  float occ = vInfo.y * own;
  vec3 c = rigShade(vWorld, n, v, albedo, 0.93, occ);
  // The lake's light from below is not held back by the shade a body throws on itself from the sky.
  if (own - occ > 0.03 && n.y < 0.3) c += albedo * lakeIrradianceFar(vWorld, n) * (own - occ) / 3.14159;
  // The hide is wet with what it sweats: a narrow glint of the sky along whatever turns up to it.
  float wet = (1.0 - tendril) * (1.0 - rag) * (0.35 + 0.65 * smoothstep(0.35, 0.7, high));
  vec3 rs = reflect(-v, n);
  if (rs.y > 0.15) {
    float nv = clamp(dot(n, v), 0.0, 1.0);
    c += wet * 0.5 * (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * skyRadiance(rs) * smoothstep(0.15, 0.7, rs.y) * own;
  }
  // The pool under its tuft lights what faces it.
  vec4 pool = uPools[int(vWho + 0.5)];
  if (pool.z > 0.0) c += blackbody(1350.0) * poolLight(pool, vWorld, n, v, albedo, 0.5 * tendril, wet) * own * 3.0 * (1.0 - 0.75 * tendril);
  // The tendrils and the rags are thin: the heat under them shows through them.
  float thin = tendril * 0.4 + rag * 0.15;
  if (thin > 0.01) c += thin * albedo * lakeIrradianceFar(vWorld, vec3(0.0, -1.0, 0.0)) * occ / 3.14159;
  // Where a root lies in open lava it glows from the tip: the lake itself says where it is open.
  if (vHeat > 0.001) {
    float open = dot(lakeGlow(vWorld.xz, 0.6), vec3(0.3, 0.6, 0.1)) / (max(uCast, 0.05) * dot(blackbody(1150.0), vec3(0.3, 0.6, 0.1)));
    float hot = min(vHeat, 1.0) * max(smoothstep(0.004, 0.08, open), clamp(vHeat - 1.0, 0.0, 1.0));
    c += blackbody(mix(1100.0, 1400.0, hot)) * hot * hot * (0.5 + 0.5 * crack);
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
