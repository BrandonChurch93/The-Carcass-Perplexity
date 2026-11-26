// The hide of a crust-walker in the light of the rig.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const VERTEX = /* glsl */ `
attribute vec2 aUv;
attribute vec4 aInfo;
attribute vec2 aLook;
attribute float aHeat;
attribute float aWho;
attribute vec3 aBake;
uniform float uPixel;
uniform vec4 uPools[14];
uniform vec4 uFeet[56];
uniform highp sampler2D tGround;
uniform float uFeetN;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying vec4 vInfo;
varying vec2 vLook;
varying float vHeat;
varying float vWho;
varying vec3 vBake;
void main() {
  vec3 n = normalize(normal);
  vec3 p = position;
  // A foot stands on the plate of crust it is over, whatever that plate's level: the leg below the knee goes up or down with it.
  if (aLook.x > 2.5 && aLook.x < 4.5 && p.y < 4.0) {
    float first = floor(aWho + 0.5) * 4.0;
    float near = 1e9;
    float top = 0.0;
    float off = 0.0;
    for (int j = 0; j < 4; j++) {
      vec2 at = vec2((first + float(j) + 0.5) / uFeetN, 0.5);
      vec4 foot = uFeet[int(first) + j];
      float d = distance(foot.xy, p.xz);
      if (d < near) {
        near = d;
        top = texture2D(tGround, at).r;
        off = foot.z;
      }
    }
    // A foot in the air is not on a plate: it comes down on the next one.
    top = mix(top, 0.1, smoothstep(0.02, 0.3, off));
    p.y += top * (1.0 - smoothstep(1.2, 4.0, p.y));
  }
  // A leg a long way off is thinner than a pixel and would flicker: it is never drawn thinner than two pixels.
  float far = length(cameraPosition - p);
  // A leg or a neck is never thinner than three pixels, a root never thinner than four: far off the roots are a few stout cords, not threads.
  float least = aLook.x > 2.5 && aLook.x < 3.5 || aLook.x > 0.5 && aLook.x < 1.5 ? 1.5 : aLook.x > 1.5 && aLook.x < 2.5 ? 1.9 : 1.25;
  p += n * max(0.0, least * uPixel * far - aInfo.z);
  vWorld = p;
  vNormal = n;
  vUv = aUv;
  vInfo = aInfo;
  vLook = aLook;
  vHeat = aHeat;
  vWho = aWho;
  vBake = aBake;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  // One that is not in this shot is not drawn.
  if (uPools[int(aWho + 0.5)].w > 0.5) gl_Position = vec4(0.0, 0.0, 3.0, 1.0);
}`;

/** The top of the crust under each foot, one texel a foot. `crust` is the crust's own height function (lake/index.ts). */
export const GROUND_VERTEX = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
export const GROUND_FRAGMENT = (crust: string): string => /* glsl */ `
precision highp float;
${NOISE_GLSL}
${RIG_GLSL}
${crust}
uniform vec4 uFeet[56];
void main() {
  vec4 foot = uFeet[int(gl_FragCoord.x)];
  // The highest of the plates under the pad: a foot does not go down into a gap, it bears on what stands highest.
  float top = crustAt(crustPoint(foot.xy)).y;
  for (int i = 0; i < 4; i++) {
    float a = 1.5708 * float(i) + 0.6;
    top = max(top, crustAt(crustPoint(foot.xy + 0.3 * foot.w * vec2(cos(a), sin(a)))).y);
  }
  gl_FragColor = vec4(clamp(top, -0.5, 1.2), 0.0, 0.0, 1.0);
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
varying vec3 vBake;
uniform float uPixel;
uniform sampler2D tTorso;
uniform sampler2D tTorsoNh;
uniform sampler2D tLimb;
uniform sampler2D tLimbNh;
uniform sampler2D tTrunk;
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
const float LAKE_UNDER = 0.25;
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
  vec3 hu = gu * inversesqrt(max(dot(gu, gu), 1e-12));
  vec3 hv = gv * inversesqrt(max(dot(gv, gv), 1e-12));
  gu /= max(1.0, length(gu));
  gv /= max(1.0, length(gv));

  // The skin is two photographs of dry hide, drawn at their own contrast: on the trunk a sheet of shrunken, cracked, peeling hide; on the legs
  // and the neck a sheet of dry cords and bark whose grain runs along the limb and winds round it a little as it goes down.
  float onLimb = 1.0 - max(body, rag);
  vec2 uvS = mix(vUv.yx / vec2(3.0, 3.4) + seed * 3.1, vec2(vUv.y + 0.07 * vUv.x, vUv.x) / vec2(1.25, 2.3) + seed * 1.7, onLimb);
  vec2 sx = dFdx(uvS);
  vec2 sy = dFdy(uvS);
  vec2 bakeUv = vec2(vBake.x, (clamp(vBake.y, 0.003, 0.997) + floor(vBake.z + 0.5)) / 3.0);
  vec2 bx = dFdx(bakeUv);
  vec2 by = dFdy(bakeUv);
  float fine = smoothstep(260.0, 60.0, far);
  vec3 skinC;
  vec3 nh;
  vec3 slopeW;
  float ao = 1.0;
  float plate = 0.0;
  if (onLimb > 0.5) {
    skinC = textureGrad(tLimb, uvS, sx, sy).rgb;
    nh = textureGrad(tLimbNh, uvS, sx, sy).rgb;
    // Across the sheet is round the limb, down the sheet is along it.
    slopeW = (gv * (nh.r - 0.5) - gu * (nh.g - 0.5)) * 2.6 * fine;
    // Over the cords what is left of the hide: plates with cracks between them, some lifted at an edge, the cords bare where a plate has gone.
    vec2 uvP = vUv / vec2(1.9, 1.5) + seed * 5.3;
    vec2 px = dFdx(uvP);
    vec2 py = dFdy(uvP);
    vec3 plateN = textureGrad(tTorsoNh, uvP, px, py).rgb;
    vec3 plateC = textureGrad(tTorso, uvP, px, py).rgb;
    plate = smoothstep(0.42, 0.58, plateN.b + 0.25 * (vnoise(vUv * vec2(0.5, 0.9) + seed * 3.0) - 0.5)) * (1.0 - tendril);
    slopeW = mix(slopeW, slopeW * 0.35 + (gu * (plateN.r - 0.5) - gv * (plateN.g - 0.5)) * 3.0 * fine, plate);
    skinC = mix(skinC * 0.72, plateC * 2.3, plate);
    nh.b = mix(nh.b * 0.8, 0.25 + 0.75 * plateN.b, plate);
  } else {
    skinC = textureGrad(tTorso, uvS, sx, sy).rgb;
    nh = textureGrad(tTorsoNh, uvS, sx, sy).rgb;
    slopeW = (gv * (nh.r - 0.5) - gu * (nh.g - 0.5)) * 2.2 * fine;
    if (body > 0.5) {
      // The trunk's own fine surface, made outside the film: its ribs, its spine, its wrinkles and tears, and how far each place is shut in.
      vec3 tk = textureGrad(tTrunk, bakeUv, bx, by).rgb;
      slopeW += (hu * (tk.r - 0.5) + hv * (tk.g - 0.5)) * 3.0;
      ao = tk.b;
    }
  }
  float high = nh.b;
  // The sheets are browner than the animals of the pictures, which are the grey of old bone and ash with a little umber in it.
  skinC = mix(vec3(dot(skinC, vec3(0.3, 0.55, 0.15))), skinC, mix(0.6, 0.3, onLimb));

  // Rings round the neck, closer and deeper toward the crown; creases across a joint.
  float crown = smoothstep(0.62, 0.95, vLook.y) * neck;
  float ringAt = vUv.x * 6.2832 / 0.42 + mix(11.0, 2.5, neck) * vnoise(vUv * vec2(0.9, 5.0) + seed) + mix(5.0, 1.0, neck) * vnoise(vUv * vec2(2.3, 11.0) + seed * 1.7);
  float crease = (1.0 - neck) * limb * (1.0 - tendril) * vLook.y * 0.55;
  float ringAmp = (0.04 * crown + crease + 0.015 * neck) * fine;
  slopeW += gu * ringAmp * sin(ringAt) * 1.1;
  float ridge = 0.5 + 0.5 * cos(ringAt);
  vec3 n = normalize(ng + slopeW * (1.0 - 0.8 * tendril));

  // No two alike: each is sootier or browner than the next.
  float crack = mix(smoothstep(0.1, 0.5, high), 0.75, 0.7);
  float sooty = fract(sin(vWho * 12.9898 + 4.1) * 43758.5453);
  float warm = fract(sin(vWho * 78.233 + 1.7) * 43758.5453);
  float pale = vInfo.x;
  vec3 tone = mix(vec3(1.07, 1.0, 0.93), vec3(0.95, 1.0, 1.06), warm) * (0.78 + 0.5 * sooty);
  // The trunk is ash grey and umber; a leg is darker and browner (45 29 23 in its shade on the picture's hero, about 70 50 40 where the sky finds it).
  vec3 albedo = skinC * tone * mix(vec3(1.0), vec3(0.38), onLimb) * (0.9 + 0.25 * (pale - 0.4));
  // What is shut in is dark with soot: the gaps between the ribs, the creases, the pits where the hide is torn.
  float shut = smoothstep(0.25, 0.85, ao);
  albedo *= mix(0.3, 1.0, shut);
  albedo *= 1.0 - 0.3 * ringAmp * (1.0 - ridge);
  // The pits of the grain are black and its ridges worn pale.
  float pit = smoothstep(0.2, 0.62, high);
  albedo *= mix(1.0, mix(0.6, 1.12, pit), (1.0 - tendril) * fine);
  float stain = smoothstep(0.35, 0.75, vnoise(vUv * vec2(1.3, 9.0) + seed * 2.0));
  // The last third of the neck pales to bone and is ribbed like a spine; the roots are pale fibre, cream with brown stains. They do not glow:
  // they are pale things in the light of the pool.
  vec3 bone = vec3(0.38, 0.33, 0.265) * mix(1.0, 0.5, stain) * (0.7 + 0.3 * crack);
  float crownPale = neck * mix(0.04, 1.0, smoothstep(0.28, 0.93, vLook.y));
  // The lower neck and the crown are dry wood, brown, with pale worn cords that run down them into the roots and dark gaps between.
  // The grain runs along the neck: each cord holds for metres, so that none steps across to the next in a zigzag.
  float cord = 0.5 * vnoise(vec2(vUv.x * 0.3, vUv.y * 60.0) + seed * 1.3) + 0.5 * vnoise(vec2(vUv.x * 0.7, vUv.y * 140.0) + seed * 2.1);
  vec3 wood = vec3(0.2, 0.158, 0.122) * mix(1.0, 0.6, stain) * (0.6 + 0.4 * crack);
  albedo = mix(albedo, wood * mix(0.6, 1.4, smoothstep(0.3, 0.7, cord)) * (0.8 + 0.2 * ridge) * (0.8 + 0.24 * vnoise(vUv * vec2(2.6, 15.0) + seed)), 0.85 * crownPale);
  // A root is dark where it leaves the crown and tan below, where the pool finds it.
  // A tuft that is not over a pool has nothing to light it from below: its roots are dull and brown there, not pale specks under the sky.
  float fed = uPools[int(vWho + 0.5)].z;
  vec3 fibre = bone * mix(vec3(0.5, 0.4, 0.3), vec3(1.0, 0.95, 0.85), fed);
  // A root is brown wood where it leaves the crown and pale fibre lower down, streaked along its length.
  float streak = vnoise(vec2(vUv.x * 2.0, vUv.y * 55.0) + seed);
  albedo = mix(albedo, mix(vec3(0.2, 0.158, 0.122), fibre * vec3(0.8, 0.7, 0.58), smoothstep(0.1, 0.7, vLook.y)) * mix(0.3, 1.25, smoothstep(0.25, 0.6, streak)) * (0.85 + 0.3 * vnoise(vUv * vec2(3.0, 40.0) + seed)), tendril);

  // Ash lies on whatever faces the sky, in the hollows first, and dust is carried up the legs from the crust.
  float grit = vnoise(vUv * 9.0 + seed);
  float up = smoothstep(0.2, 0.8, ng.y);
  float ash = up * smoothstep(0.95, 0.35, high + 0.4 * grit - 0.6 * up) * (1.0 - tendril) * (0.55 + 0.45 * body);
  float dust = smoothstep(2.6, 0.1, vWorld.y) * (0.25 + 0.5 * grit) * (1.0 - tendril);
  albedo = mix(albedo, vec3(0.146, 0.146, 0.15) * (0.7 + 0.3 * grit), 0.55 * ash * smoothstep(0.4, 3.0, vWorld.y));
  // The dust is the crust's own: a foot is as dark as what it stands on.
  albedo = mix(albedo, vec3(0.115, 0.108, 0.1) * (0.6 + 0.6 * grit), dust * (0.45 + 0.4 * (1.0 - pit)));
  // The foot itself is caked dark with what it treads in.
  albedo = mix(albedo, vec3(0.058, 0.05, 0.045) * (0.6 + 0.6 * grit), 0.6 * max(smoothstep(0.8, 0.2, vWorld.y), smoothstep(3.4, 3.9, kind) * (1.0 - rag)) * (1.0 - tendril));

  float own = mix(1.0, 0.15 + 0.85 * ao * ao, body) * (0.5 + 0.5 * crack) * (1.0 - 0.35 * ringAmp * (1.0 - ridge));
  float occ = vInfo.y * own;
  // The hide is dull: no shine on it at all. Only the roots are wet.
  // The rig's light, put together here from its own parts and not by rigShade: its lake light gives a face that looks up a share of the
  // lava round it, which is right for rough ground at the lake's level and wrong for a back ten metres over it. An animal takes the sky
  // on what faces up and the lake on what faces down: the belly, the inside of the legs, the under side of the neck.
  float open = skyOpen(vWorld) * occ;
  float ny = mix(ng.y, n.y, 0.3);
  // On the trunk only what looks well down counts as under: a flank that leans in a little is still a flank.
  float under = mix(smoothstep(0.05, -0.7, ny), smoothstep(-0.45, -0.9, ny), body);
  // The fire's rim: a leg near a seam takes its light on the faces turned to it, low down, where a flank high over the lake does not.
  float rim = LEG_RIM * smoothstep(0.55, -0.25, ny) * smoothstep(8.0, 1.5, vWorld.y) * (1.0 - body) * (1.0 - 0.85 * tendril * smoothstep(0.3, 1.8, vWorld.y));
  // The flank and the back of the trunk are dark grey brown with ash on them: the warm light belongs under the belly and on the inner legs.
  float flank = body * (1.0 - under);
  vec3 e = skyIrradiance(n) * open + ((LAKE_UNDER * under + rim) * lakeBelow(vWorld, mix(ng, n, 0.3)) + FAR_FIRE * (1.0 - 0.6 * flank) * emitterIrradiance(vWorld, normalize(mix(ng, n, 0.25)))) * occ;
  // The pool it feeds at lights it from below at any reach (the rig's apron): the belly takes it, the legs and the neck a little less, the back and the flanks next to none.
  // The roots and the crown have the pool's own glare already (poolLight below).
  vec2 poolWay;
  e += poolApron(vWorld, normalize(mix(ng, n, 0.3)), 14.0, poolWay) * own * mix(0.1, 0.15 * mix(0.1, 1.0, under), body) * (1.0 - 0.85 * tendril) * (1.0 - 0.7 * crown);
  // The grey crust under it sends some of the sky back up at what faces down or sideways: without it a flank has only the red of the lake.
  e += CRUST_BOUNCE * skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.5 - 0.5 * n.y) * open;
  vec3 c = albedo * e / 3.14159;
  vec3 rs = reflect(-v, n);
  // Dull, with the faint sheen of old leather on what faces the sky.
  float topside = smoothstep(0.15, 0.8, n.y) * (1.0 - tendril) * (1.0 - 0.7 * dust);
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
  if (pool.z > 0.0) c += blackbody(1350.0) * poolLight(pool, vWorld, normalize(mix(ng, n, 0.3 + 0.7 * tendril)), v, albedo, 0.25 * tendril, tendril) * own * POOL * (1.0 - 0.2 * tendril) * (1.0 - 0.75 * flank);
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
