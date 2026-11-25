// The hide of a crust-walker in the light of the rig.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const VERTEX = /* glsl */ `
attribute vec2 aUv;
attribute vec4 aInfo;
attribute vec2 aLook;
attribute float aHeat;
attribute float aWho;
uniform float uPixel;
uniform vec4 uPools[14];
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
  // A leg a long way off is thinner than a pixel and would flicker: it is never drawn thinner than two pixels.
  float far = length(cameraPosition - p);
  p += n * max(0.0, 1.0 * uPixel * far - aInfo.z);
  vWorld = p;
  vNormal = n;
  vUv = aUv;
  vInfo = aInfo;
  vLook = aLook;
  vHeat = aHeat;
  vWho = aWho;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  // One that is not in this shot is not drawn.
  if (uPools[int(aWho + 0.5)].w > 0.5) gl_Position = vec4(0.0, 0.0, 3.0, 1.0);
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
  // It is a small light: past eight metres the fume has most of it, as it has of the rig's round lights. Without that the pool, twelve metres
  // from the body, lit a flank as hard as the sky did, in red, wherever the grain of the hide happened to face it.
  float q2 = d2 / 64.0;
  // A root stands in the pool: its foot is in the full glare and its top, a few metres up in the fume, has little of it.
  float e = q.z * 3.14159 * 2.25 / (d2 + 2.25) * facing / (1.0 + q2 * q2) * mix(1.0, 2.6 / (1.0 + 2.5 * p.y * p.y), gloss);
  return (albedo / 3.14159 + vec3(gloss * 0.2 * pow(nh, 20.0))) * e * uCast;
}
// The lake's light on a face that looks down or sideways at it: the rig's own taps (lakeIrradiance) without its share for faces that look up.
vec3 lakeBelow(vec3 p, vec3 n) {
  float h = max(p.y, 0.35);
  float side = length(n.xz);
  vec2 dir = side > 1e-4 ? n.xz / side : vec2(0.0);
  vec2 reach = dir * h * side;
  vec3 e = lakeGlow(p.xz + reach * 0.9, h * 0.8) * 2.0;
  e += lakeGlow(p.xz + reach * 2.6, h * 1.6) * 1.2;
  e += lakeGlow(p.xz + reach * 6.5, h * 4.0) * 0.2;
  return e * 3.14159 * lakeReach(h);
}
// The share of the round lights (the fountains, the fall) that an animal takes. A round light has no shade in it and wraps a quarter of the
// way round whatever it lights, so a flank that faces a row of fountains 75 m off was as red as its belly. The pictures have them dark against
// the glow: smoke and the animal's own legs stand between.
const float FAR_FIRE = 0.08;
// The share of the lake's light under it that a down face takes, and the share of the sky that the crust sends back up. Measured on the
// flank of the feeding picture's hero: 36 26 23 there.
const float LAKE_UNDER = 0.12;
const float LEG_RIM = 0.8;
const float CRUST_BOUNCE = 1.0;
// How hard the pool lights the animal that feeds at it, against a bare round light of its size.
const float POOL = 2.0;
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
  vec2 uvH = mix(vec2(vUv.y * 0.8 - vUv.x * 0.25, vUv.x * 0.9 + vUv.y * 0.2) / 2.2, wound / vec2(0.62, 1.15), limb) + seed * 1.7;
  vec3 flakeC = texture2D(tFlake, uvF).rgb;
  vec3 hideC = texture2D(tHide, uvH).rgb;
  vec3 nhF = texture2D(tFlakeNh, uvF).rgb;
  vec3 nhH = texture2D(tHideNh, uvH).rgb;
  float fine = smoothstep(260.0, 60.0, far);
  // The grain of the two pictures is a few centimetres across: two or three pixels of the hero. Turned as far as the pictures have it, it
  // put half of those pixels in the dark and the hide came out as red and black sand. It is kept as a faint tooth; the relief that reads is the folds.
  vec2 slopeF = (nhF.rg - 0.5) * 0.4;
  vec2 slopeH = (nhH.rg - 0.5) * 0.35 * fine;
  // On a limb of the hero the grain is what the lens is focused on: it is turned up there, and its pits are darkened below.
  vec2 slope = mix(slopeF + vec2(slopeH.x * 0.8 + slopeH.y * 0.6, slopeH.y * 0.8 - slopeH.x * 0.6), slopeF.yx * 1.6 + slopeH.yx * 2.4, limb);
  float high = mix(nhF.b, nhH.b, 0.5 * fine);

  // Rings round the neck, closer and deeper toward the crown; creases across a joint.
  float crown = smoothstep(0.62, 0.95, vLook.y) * neck;
  float ringAt = vUv.x * 6.2832 / 0.42 + 11.0 * vnoise(vUv * vec2(0.9, 5.0) + seed) + 5.0 * vnoise(vUv * vec2(2.3, 11.0) + seed * 1.7);
  float crease = (1.0 - neck) * limb * (1.0 - tendril) * vLook.y * 0.55;
  float ringAmp = (0.11 * crown + crease + 0.03 * neck) * fine;
  slope.x += ringAmp * sin(ringAt) * 1.1;
  float ridge = 0.5 + 0.5 * cos(ringAt);

  // Where the hide is drawn together at the two ends of the body its pattern would pinch: it lies plain there.
  float pole = body * smoothstep(0.4, 0.8, vLook.y);
  slope *= 1.0 - pole;
  // Leather: folds that run along a limb and hang down a flank, finer ones across them, and rings of slack skin round a joint.
  float px = far * uPixel;
  float folds = (1.0 - tendril) * (1.0 - rag) * (1.0 - pole) * smoothstep(0.12, 0.03, px);
  float fold = 0.5;
  if (folds > 0.0) {
    // On a limb they are the grain of dead wood: short, and they wander round it, so that no line runs the length of a bone.
    vec2 fu = mix(vec2(vUv.x * 2.6, vUv.y * 0.5), vec2(vUv.x * 2.6 + 1.6 * vnoise(vUv * vec2(1.7, 6.0) + seed * 3.1), vUv.y * 13.0 + 4.5 * vnoise(vUv * vec2(2.3, 3.0) + seed * 2.3)), limb) + seed * 5.3;
    float f1 = vnoise(fu);
    float f2 = vnoise(fu * vec2(2.3, 2.1) + 7.0);
    fold = 0.65 * f1 + 0.35 * f2;
    vec2 across = mix(vec2(1.0, 0.0), vec2(0.0, 1.0), limb);
    // The body is shrivelled: its folds are deeper and cross one another.
    float f3 = vnoise(fu.yx * vec2(1.7, 1.3) + 3.0);
    slope += folds * across * ((f1 - 0.5) * 1.5 + (f2 - 0.5) * 0.9) * (1.0 + 1.3 * body);
    slope += folds * across.yx * (f3 - 0.5) * 1.6 * body;
    fold = mix(fold, 0.6 * fold + 0.4 * f3, body);
  }
  // The body is dried flesh: strands that run along it, each a ridge with a dark gap beside it, none straight.
  float strand = 1.0;
  float flesh = body * (1.0 - pole) * folds;
  if (flesh > 0.0) {
    vec2 su = vec2(vUv.x * 0.8 + 0.7 * vnoise(vUv * vec2(1.3, 2.9) + seed * 2.0), vUv.y * 3.4 + 2.6 * vnoise(vUv * vec2(1.5, 2.1) + seed * 4.0)) + seed * 2.3;
    float s0 = 1.0 - abs(2.0 * vnoise(su) - 1.0);
    float s1 = 1.0 - abs(2.0 * vnoise(su + vec2(0.0, 0.22)) - 1.0);
    float t0 = 1.0 - abs(2.0 * vnoise(su * vec2(2.6, 2.3) + 5.0) - 1.0);
    float t1 = 1.0 - abs(2.0 * vnoise(su * vec2(2.6, 2.3) + vec2(5.0, 5.22)) - 1.0);
    strand = 0.65 * s0 + 0.35 * t0;
    slope.y += flesh * ((s1 - s0) * 3.2 + (t1 - t0) * 1.6);
  }
  vec3 n = normalize(ng + (gu * slope.x + gv * slope.y) * (1.0 - 0.7 * tendril) * (1.0 - 0.25 * body));

  // A hide the colour of the crust it walks on: charcoal, a little brown, darker in its folds. No two alike: each is sootier or browner than the next.
  float lum = 0.55 * dot(flakeC, vec3(4.0)) + 0.45 * dot(hideC, vec3(5.2));
  lum = mix(lum, 0.9, pole);
  float crack = mix(smoothstep(0.1, 0.5, high), 0.8, pole);
  crack = mix(crack, 0.75, 0.7);
  float mottle = vnoise(vUv * 0.9 + seed * 7.0);
  float sooty = fract(sin(vWho * 12.9898 + 4.1) * 43758.5453);
  float warm = fract(sin(vWho * 78.233 + 1.7) * 43758.5453);
  // The look of the place deepens the colour of what is dark: a hide a tenth warmer than grey comes out brown-black, as in the pictures.
  vec3 hide = vec3(0.085, 0.088, 0.09) * mix(vec3(1.05, 1.0, 0.95), vec3(0.97, 1.0, 1.03), warm) * (0.84 + 0.42 * sooty);
  // pale: a little lighter at the joints and where the skin is worn, never bone.
  vec3 albedo = hide * (0.86 + 0.14 * lum) * (0.6 + 0.4 * crack) * (0.82 + 0.3 * mottle + 0.25 * (pale - 0.4)) * (0.8 + 0.4 * fold) * (1.0 - 0.35 * body * smoothstep(0.55, 0.3, fold)) * mix(1.0, 0.5 + 0.75 * strand, flesh);
  albedo *= 1.0 - 0.3 * ringAmp * (1.0 - ridge);
  // Dry sinew and torn flesh: the pits of the grain are black, its ridges worn pale, and ash is caked on it in scabs with hard edges.
  float rough = (1.0 - tendril) * (1.0 - rag) * (1.0 - pole) * fine * (1.0 - 0.75 * neck * smoothstep(0.3, 0.9, vLook.y));
  float pit = smoothstep(0.22, 0.62, high);
  albedo *= mix(1.0, mix(0.42, 1.12, pit), rough);
  albedo *= mix(1.0, mix(0.68, 1.1, smoothstep(0.3, 0.7, fold)), rough * limb);
  // A leg is darker and browner than the back: measured on the picture's hero, 45 29 23 in its shade and about 70 50 40 where the sky finds it.
  albedo *= mix(vec3(1.0), vec3(0.7, 0.6, 0.54), limb * (1.0 - tendril));
  float cake = smoothstep(0.56, 0.6, vnoise(vUv * vec2(1.6, 4.5) + seed * 9.0) + 0.3 * (high - 0.5) + 0.12 * (fold - 0.5)) * rough;
  albedo = mix(albedo, vec3(0.125, 0.115, 0.105) * (0.55 + 0.6 * high), 0.6 * cake * mix(0.7, 0.8, limb));
  // Scab like the crust's own skin, in patches on the back and the rump.
  float scab = body * smoothstep(-0.1, 0.5, ng.y) * smoothstep(0.5, 0.68, vnoise(vUv * 0.55 + seed * 3.0) + 0.25 * (nhF.b - 0.5)) * (1.0 - pole);
  albedo = mix(albedo, vec3(0.1, 0.097, 0.094) * (0.6 + 0.4 * dot(flakeC, vec3(4.0))) * (0.7 + 0.3 * crack), 0.8 * scab);
  // The last third of the neck pales to bone and is ribbed like a spine; the roots are pale fibre, cream with brown stains. They do not glow:
  // they are pale things in the light of the pool.
  float stain = smoothstep(0.35, 0.75, vnoise(vUv * vec2(1.3, 9.0) + seed * 2.0));
  vec3 bone = vec3(0.38, 0.33, 0.265) * mix(1.0, 0.5, stain) * (0.7 + 0.3 * crack);
  float crownPale = neck * mix(0.04, 1.0, smoothstep(0.28, 0.93, vLook.y));
  albedo = mix(albedo, bone * (0.8 + 0.2 * ridge) * (0.8 + 0.24 * vnoise(vUv * vec2(2.6, 15.0) + seed)), 0.8 * crownPale);
  // A root is dark where it leaves the crown and tan below, where the pool finds it.
  // A tuft that is not over a pool has nothing to light it from below: its roots are dull and brown there, not pale specks under the sky.
  float fed = uPools[int(vWho + 0.5)].z;
  vec3 fibre = bone * mix(vec3(0.5, 0.4, 0.3), vec3(1.0, 0.95, 0.85), fed);
  albedo = mix(albedo, fibre * (0.85 + 0.3 * vnoise(vUv * vec2(3.0, 40.0) + seed)) * mix(0.9, 1.0, smoothstep(0.0, 0.4, vLook.y)), tendril);

  // Ash lies on whatever faces the sky, in the hollows first, and dust is carried up the legs from the crust.
  float grit = vnoise(vUv * 9.0 + seed);
  float up = smoothstep(0.2, 0.8, ng.y);
  float ash = up * smoothstep(0.95, 0.35, high + 0.4 * grit - 0.6 * up) * (1.0 - tendril) * (0.55 + 0.45 * body);
  float dust = smoothstep(2.6, 0.1, vWorld.y) * (0.25 + 0.5 * grit) * (1.0 - tendril);
  albedo = mix(albedo, vec3(0.146, 0.146, 0.15) * (0.7 + 0.3 * grit), 0.55 * ash * smoothstep(0.4, 3.0, vWorld.y));
  // The dust is the crust's own: a foot is as dark as what it stands on.
  albedo = mix(albedo, vec3(0.085, 0.078, 0.074) * (0.7 + 0.5 * grit), 0.6 * dust);
  // The foot itself is caked dark with what it treads in.
  albedo = mix(albedo, vec3(0.058, 0.05, 0.045) * (0.6 + 0.6 * grit), 0.92 * max(smoothstep(0.8, 0.2, vWorld.y), smoothstep(3.4, 3.9, kind) * (1.0 - rag)) * (1.0 - tendril));

  float own = mix(1.0, 0.5 + 0.5 * strand, flesh) * (0.5 + 0.5 * crack) * (1.0 - 0.35 * ringAmp * (1.0 - ridge)) * (0.75 + 0.25 * smoothstep(0.2, 0.6, fold));
  float occ = vInfo.y * own;
  // The hide is dull: no shine on it at all. Only the roots are wet.
  // The rig's light, put together here from its own parts and not by rigShade: its lake light gives a face that looks up a share of the
  // lava round it, which is right for rough ground at the lake's level and wrong for a back ten metres over it. An animal takes the sky
  // on what faces up and the lake on what faces down: the belly, the inside of the legs, the under side of the neck.
  float open = skyOpen(vWorld) * occ;
  float ny = mix(ng.y, n.y, 0.3);
  float under = smoothstep(0.05, -0.7, ny);
  // The fire's rim: a leg near a seam takes its light on the faces turned to it, low down, where a flank high over the lake does not.
  float rim = LEG_RIM * smoothstep(0.55, -0.25, ny) * smoothstep(8.0, 1.5, vWorld.y) * (1.0 - body) * (1.0 - 0.85 * tendril * smoothstep(0.3, 1.8, vWorld.y));
  vec3 e = skyIrradiance(n) * open + ((LAKE_UNDER * under + rim) * lakeBelow(vWorld, mix(ng, n, 0.3)) + FAR_FIRE * emitterIrradiance(vWorld, normalize(mix(ng, n, 0.25)))) * occ;
  // The grey crust under it sends some of the sky back up at what faces down or sideways: without it a flank has only the red of the lake.
  e += CRUST_BOUNCE * skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.5 - 0.5 * n.y) * open;
  vec3 c = albedo * e / 3.14159;
  vec3 rs = reflect(-v, n);
  // Dull, with the faint sheen of old leather on what faces the sky.
  float topside = smoothstep(0.15, 0.8, n.y) * (1.0 - tendril) * (1.0 - 0.7 * ash);
  if (topside > 0.01) {
    float nvs = clamp(dot(n, v), 0.0, 1.0);
    c += topside * (0.012 + 0.1 * pow(1.0 - nvs, 4.0)) * skyIrradiance(normalize(rs + n)) / 3.14159 * open;
  }
  if (tendril > 0.01 && rs.y > 0.15) {
    float nv = clamp(dot(n, v), 0.0, 1.0);
    c += tendril * 0.35 * (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * skyRadiance(rs) * smoothstep(0.15, 0.7, rs.y) * own;
  }
  // The pool under its tuft lights what faces it: the roots, the lower neck, the inside of the legs, the belly.
  vec4 pool = uPools[int(vWho + 0.5)];
  if (pool.z > 0.0) c += blackbody(1350.0) * poolLight(pool, vWorld, normalize(mix(ng, n, 0.3 + 0.7 * tendril)), v, albedo, 0.5 * tendril, tendril) * own * POOL * (1.0 - 0.2 * tendril);
  // The roots are thin: the heat under them shows through them.
  float thin = tendril * 0.4 * smoothstep(2.5, 0.3, vWorld.y);
  if (thin > 0.01) c += thin * albedo * lakeIrradianceFar(vWorld, vec3(0.0, -1.0, 0.0)) * occ / 3.14159;
  // Nothing on the animal glows by itself but the tips of the roots that are in the melt. The pose says which rings are down in a seam;
  // the lake's own map must agree that it is open there: a texel of it must carry at least a sixth of what lava under a thin skin sends out.
  if (vHeat > 0.001) {
    float hot = min(vHeat, 1.0);
    c += blackbody(mix(1050.0, 1230.0, hot)) * hot;
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
