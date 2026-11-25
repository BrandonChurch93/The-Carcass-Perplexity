// The lake of the Heart: the crust, the lava that shows in its seams, and the crust that founders at the fountains.
// The crust is one sheet. What it shows is read from the net of plates (net.ts), which rides the drift of the lake:
// seams that open, widen, skin over and close, the open pool at the foot of the fall, the torn margin against the rock.
// The same heat is drawn into the rig's glow map, so that what lights the land and the animals is what the camera sees.
import * as THREE from 'three';
import type { HeartContext, HeartPiece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { SUNK, seamLine } from '../shared/anchors';
import { NET, NET_FINE, POOL, RIDGES, bakeNet } from './net';
import { createFoundering } from './founder';
import { HEAT_GLSL } from './heat';
import { createLava } from './lava';

export const PARTS: readonly string[] = ['crust', 'lava', 'foundering'];

// The ropes of the skin, and the height of the crust in metres where it is close enough to the camera to be built:
// ropes, the lip that rides up at a channel, the channel's floor a hand under the skin, a pressure ridge.
const RELIEF_GLSL = /* glsl */ `
uniform sampler2D tRopeNh;
uniform vec4 uRidge[2];
uniform vec2 uRidgeSize[2];
vec4 ropeAt(vec2 q, float bias) {
  vec2 ua = q / 6.1;
  vec2 ub = vec2(q.x * 0.391 - q.y * 0.921, q.x * 0.921 + q.y * 0.391) / 7.7 + 0.31;
  float pick = smoothstep(0.38, 0.62, vnoise(q / 19.0 + 6.0));
#ifdef LAKE_VERTEX
  vec4 nhA = textureLod(tRopeNh, ua, 4.6);
  vec4 nhB = textureLod(tRopeNh, ub, 4.6);
#else
  vec4 nhA = texture2D(tRopeNh, ua, bias);
  vec4 nhB = texture2D(tRopeNh, ub, bias);
#endif
  vec2 slope = mix(nhA.rg - 0.5, vec2(0.391 * (nhB.r - 0.5) + 0.921 * (nhB.g - 0.5), -0.921 * (nhB.r - 0.5) + 0.391 * (nhB.g - 0.5)), pick);
  return vec4(slope, mix(nhA.b, nhB.b, pick), pick);
}
// Pressure ridges: two slabs shoved against each other, steep on one side, with a broken crest.
float ridgeAt(vec2 q) {
  float h = 0.0;
  for (int i = 0; i < 2; i++) {
    vec2 ab = uRidge[i].zw - uRidge[i].xy;
    vec2 rel = q - uRidge[i].xy;
    float t = clamp(dot(rel, ab) / dot(ab, ab), 0.0, 1.0);
    float side = (rel.x * ab.y - rel.y * ab.x) / length(ab);
    float across = length(rel - ab * t);
    float tall = (0.55 + 0.45 * vnoise(q / (1.9 * uRidgeSize[i].y) + 3.0)) * pow(sin(t * 3.14159), 0.6);
    float reach = (side > 0.0 ? 1.0 + 0.5 * vnoise(q / 1.3) : 2.1 + 0.8 * vnoise(q / 2.3 + 9.0)) * uRidgeSize[i].y;
    float rise = max(0.0, 1.0 - across / reach);
    // Broken slabs: the slope goes up in steps.
    float slab = vnoise(q / (0.9 * uRidgeSize[i].y) + 17.0);
    rise = mix(rise, floor(rise * 3.0 + slab) / 3.0, 0.25 * smoothstep(0.05, 0.3, rise));
    h += uRidgeSize[i].x * tall * rise;
  }
  return h;
}
float gDeep;
float reliefAt(vec2 q) {
  vec4 n = netAt(q);
  float rope = ropeAt(q, 0.0).b;
  float gape = gapeAt(q, n).x;
  float edge = n.r + (rope - 0.5) * 0.3 + tornAt(q) * smoothstep(0.0, 0.3, n.a) - gape;
  float channel = smoothstep(0.04, 0.25, gape);
  // A narrow gap is full to the brim. Only a wide channel lies low between its banks.
  // The long seam the group feeds at is full to the brim too, and its lips lie flat, so a low camera sees into it.
  float low = 1.0 - smoothstep(2.02, 2.06, n.g);
  float deep = 0.03 + 0.25 * smoothstep(0.35, 0.65, gape) * low;
  float h = (rope - 0.5) * 0.16 * (1.0 - 0.7 * (1.0 - low) * exp(-max(edge, 0.0) / 1.5)) + (0.1 + 0.1 * low * vnoise(q / 1.1 + 5.0)) * exp(-max(edge, 0.0) / 0.45) * channel * (0.15 + 0.85 * low) + ridgeAt(q);
  float isle = isleAt(q, n.r / max(gape, 1e-3)) * smoothstep(0.45, 0.6, gape) * (1.0 - step(3.3, n.g));
  gDeep = smoothstep(0.06, -0.2, edge) * step(1e-3, n.a) * (1.0 - isle);
  return mix(h, -deep * channel + 0.012 * rope, gDeep) - 0.05 * isle * (1.0 - rope);
}`;

const VERTEX = /* glsl */ `
varying vec3 vNormalG;
varying float vDeep;
varying vec3 vWorld;
varying vec2 vDrift;
${RIG_GLSL}
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  // The drift is smooth over tens of metres: it is found at the corners and carried across the face.
  vDrift = flowVelocity(w.xz) * (uTime - uFlowT0);
  vNormalG = vec3(0.0, 1.0, 0.0);
  vDeep = 1.0;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// The crust near the camera, built: the same sheet in cells of a hand, lifted by its relief.
const PATCH_VERTEX = /* glsl */ `
attribute float aLift;
varying vec3 vWorld;
varying vec2 vDrift;
varying vec3 vNormalG;
varying float vDeep;
#define LAKE_VERTEX
${NOISE_GLSL}
${RIG_GLSL}
${HEAT_GLSL}
${RELIEF_GLSL}
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vDrift = flowVelocity(w.xz) * (uTime - uFlowT0);
  vec2 q = w.xz - vDrift;
  float e = 0.1;
  float h = reliefAt(q);
  vDeep = mix(1.0, gDeep, aLift);
  float hx = reliefAt(q + vec2(e, 0.0));
  float hz = reliefAt(q + vec2(0.0, e));
  w.y += h * aLift;
  vWorld = w.xyz;
  vNormalG = normalize(vec3((h - hx) * aLift, e, (h - hz) * aLift));
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vDrift;
varying vec3 vNormalG;
varying float vDeep;
uniform sampler2D tSkin;
uniform sampler2D tSkinNh;
uniform sampler2D tRope;
uniform sampler2D tRopeWide;
uniform sampler2D tRopeNhWide;
uniform float uLava;
uniform vec4 uGroupSeam;
${NOISE_GLSL}
${RIG_GLSL}
#define LAKE_LIP
${HEAT_GLSL}
${RELIEF_GLSL}

// What a mirror on the lake sees toward r: the sky above the walls, the walls and the haze under it, the fume lit by the lake.
vec3 lakeMirror(vec3 r, float rough) {
  float wall = 0.16 + 0.2 * max(-r.z, 0.0);
  float soft = 0.05 + 0.5 * rough;
  float sky = smoothstep(wall - soft, wall + soft, r.y);
  float w = max(dot(normalize(vec3(r.x, max(r.y, 0.0), r.z)), uWarmDir), 0.0);
  vec3 low = uSkyHorizon * 0.5 + uWarmColour * w * w * w * 0.8;
  return mix(low, skyRadiance(vec3(r.x, max(r.y, wall), r.z)), sky);
}

void main() {
  vec2 xz = vWorld.xz;
  vec4 land = landAt(xz);
  // Rock that stands above the lake hides the crust. Ground that lies no higher than the lake is flooded.
  vec3 toCamera = cameraPosition - vWorld;
  float far = length(toCamera);
  float lake = -land.b;
  vec3 v = toCamera / far;
  vec2 q = xz - vDrift;
  vec4 net = netAt(q);

  // Which way is away from the nearest seam, from how its distance changes across the picture.
  vec2 qx = dFdx(q);
  vec2 qy = dFdy(q);
  float det = qx.x * qy.y - qx.y * qy.x;
  float rx = dFdx(net.r);
  float ry = dFdy(net.r);
  vec2 away = vec2(rx * qy.y - ry * qx.y, ry * qx.x - rx * qy.x) / (abs(det) > 1e-10 ? det : 1e-10);
  float steep = length(away);
  away = steep > 0.35 && steep < 3.0 ? away / steep : vec2(0.0);
  // Plates of different age lie at different heights: where two meet, one stands a hand above the other.
  float bx = dFdx(net.b);
  float by = dFdy(net.b);
  vec2 stepUp = clamp(vec2(bx * qy.y - by * qx.y, by * qx.x - bx * qy.x) / (abs(det) > 1e-10 ? det : 1e-10), -1.5, 1.5);

  // The skin: ropes of a hand to an arm across, twice and turned so that no repeat shows, wrinkles under them close to the
  // camera, and the same two pictures many times larger for the far lake, where a rope is smaller than a pixel.
  // How much of each scale the lens resolves: by the size of a pixel on the crust, so a long lens far off sees what a wide one sees close.
  float grainSize = max(length(qx), length(qy));
  float near = 1.0 - smoothstep(0.03, 0.14, grainSize);
  float close = 1.0 - smoothstep(0.06, 0.5, grainSize);
  float mid = 1.0 - smoothstep(0.4, 2.5, grainSize);
  // A long lens low over the crust squeezes every rope into a line along the frame: there the ropes give way to the swells.
  float fineSize = min(length(qx), length(qy));
  float streak = smoothstep(3.0, 9.0, grainSize / max(fineSize, 1e-5)) * (1.0 - smoothstep(0.01, 0.04, fineSize));
  float wide = smoothstep(1500.0, 300.0, far);
  vec2 uvA = q / 6.1;
  vec2 uvB = vec2(q.x * 0.391 - q.y * 0.921, q.x * 0.921 + q.y * 0.391) / 7.7 + 0.31;
  // The folds of tens of metres lie differently on every plate, so the lake never shows the same fold twice.
  vec2 uvC = vec2(q.x * 0.5 + q.y * 0.866, -q.x * 0.866 + q.y * 0.5) / 47.0 + net.b * vec2(37.0, 61.0);
  vec2 uvD = vec2(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) / 1.37 + 0.13;
  vec4 ropes = ropeAt(q, 0.0);
  vec2 ropeSlope = ropes.xy;
  float ropeHigh = ropes.z;
  vec4 nhC = texture2D(tRopeNhWide, uvC);
  vec3 rope = mix(texture2D(tRope, uvA, -0.3).rgb, texture2D(tRope, uvB, -0.3).rgb, ropes.w);
  vec3 skinC = texture2D(tRopeWide, uvC).rgb;
  vec4 grainNh = vec4(0.5);
  vec3 grain = vec3(1.0 / 17.0);
  if (near > 0.0) {
    grainNh = texture2D(tSkinNh, uvD, -0.7);
    grain = texture2D(tSkin, uvD, -0.7).rgb;
  }
  // Swells a few strides across: what a low lens sees of the crust before it sees any rope.
  vec4 nhE = texture2D(tRopeNhWide, vec2(q.x * 0.2 + q.y * 0.98, -q.x * 0.98 + q.y * 0.2) / 13.0 + 0.57);

  // The edge of a gap follows the ropes.
  net.r += (ropeHigh - 0.5) * 0.3 * mid + tornAt(q) * smoothstep(0.0, 0.3, net.a);
  vec4 heat = heatAt(q, lake, net, 0.0);
  float edge = heat.z;
  float young = heat.w;
  float plain = smoothstep(uSunk.z - 1.0, uSunk.z + 5.0, length(q - uSunk.xy));
  float age = mix(0.55, clamp(net.b + 0.35 * (vnoise(q / 37.0 + 4.0) - 0.5), 0.0, 1.0) * (1.0 - young), plain);
  // The crust the group feeds on is the youngest of the lake: dark, glassy, hardly a day old.
  vec2 gab = uGroupSeam.zw - uGroupSeam.xy;
  float fresh = 1.0 - smoothstep(12.0, 55.0, length(q - uGroupSeam.xy - gab * clamp(dot(q - uGroupSeam.xy, gab) / dot(gab, gab), 0.0, 1.0)) + 14.0 * (vnoise(q / 17.0 + 8.0) - 0.5));
  age *= 1.0 - 0.8 * fresh;
  // Round that seam the young crust has broken into slabs a few strides across, each tilted its own way.
  vec2 slabTilt = vec2(0.0);
  float slabEdge = 1.0;
  float slabTone = 1.0;
  // Only a lens that resolves a slab pays for them.
  float slabSeen = fresh * (1.0 - smoothstep(0.1, 0.3, grainSize));
  if (slabSeen > 0.01) {
    vec2 sp = q / 3.4 + 0.45 * vec2(vnoise(q / 2.1 + 3.0), vnoise(q / 2.1 + 11.0));
    vec2 base = floor(sp);
    float d1 = 9.0;
    float d2 = 9.0;
    vec2 id = vec2(0.5);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 c2 = base + vec2(float(i), float(j));
        vec2 h2 = fract(sin(vec2(dot(c2, vec2(127.1, 311.7)), dot(c2, vec2(269.5, 183.3)))) * 43758.5453);
        float dd = length(c2 + 0.15 + 0.7 * h2 - sp);
        if (dd < d1) {
          d2 = d1;
          d1 = dd;
          id = h2;
        } else if (dd < d2) {
          d2 = dd;
        }
      }
    }
    slabTilt = (id - 0.5) * 0.4 * slabSeen;
    slabEdge = mix(1.0, smoothstep(0.0, 0.04 + 0.4 * grainSize / 3.4, d2 - d1), slabSeen);
    slabTone = 1.0 + (id.x - 0.5) * 0.6 * slabSeen;
  }

  // The crust rides up at the edge of a gap: a lip a hand high that leans away from the lava.
  float off = max(edge, 0.0);
  float lip = exp(-off / 0.3);
  // Young plates are smooth, old ones ropy, and the ropes come and go across a plate.
  float ropy = mid * mix(1.0, mix(0.3 + 0.9 * age * smoothstep(0.25, 0.7, vnoise(q / 29.0 + 2.0)), 1.0, near), plain) * (1.0 - 0.92 * streak);
  float swell = plain * smoothstep(700.0, 120.0, far) * (1.0 - 0.6 * fresh);
  vec2 slope = ropeSlope * (0.35 + 0.55 * close) * ropy;
  slope += vec2(0.2 * (nhE.r - 0.5) - 0.98 * (nhE.g - 0.5), 0.98 * (nhE.r - 0.5) + 0.2 * (nhE.g - 0.5)) * 0.3 * swell;
  slope += vec2(0.5 * (nhC.r - 0.5) - 0.866 * (nhC.g - 0.5), 0.866 * (nhC.r - 0.5) + 0.5 * (nhC.g - 0.5)) * 0.5 * wide;
  slope *= 1.0 - 0.5 * young;
  slope += vec2(0.8 * (grainNh.r - 0.5) + 0.6 * (grainNh.g - 0.5), -0.6 * (grainNh.r - 0.5) + 0.8 * (grainNh.g - 0.5)) * 0.3 * near;
  slope += away * (0.45 * lip * mid * step(1e-3, net.a)) * step(0.999, vNormalG.y);
  slope -= stepUp * 0.5 * plain * smoothstep(450.0, 120.0, far);
  slope += slabTilt;
  vec3 n = normalize(vNormalG + vec3(slope.x, 0.0, slope.y));

  // Old skin is grey and dull, young skin beside a seam is dark, smooth and glassy.
  vec3 albedo = mix(vec3(0.057), mix(vec3(0.057), rope, 0.8), ropy) * mix(vec3(1.0), grain * 17.0, near * 0.4);
  albedo *= mix(vec3(1.0), min(skinC * 17.0, 2.2), 0.6) * vec3(1.02, 1.0, 0.98);
  albedo *= (0.45 + 1.9 * age) * (0.78 + 0.44 * vnoise(q / 21.0 + 13.0));
  albedo = mix(albedo, vec3(dot(albedo, vec3(0.33))), 0.4 * age);
  albedo *= (1.0 - 0.45 * young) * (1.0 - 0.45 * fresh) * slabTone;
  float hollow = mix(1.0, 0.86 + 0.28 * ropeHigh, ropy) * mix(1.0, 0.92 + 0.16 * grainNh.b, near) * mix(1.0, 0.55 + 0.9 * nhE.b, swell);
  // The creases between ropes see little of the sky.
  hollow *= mix(1.0, 0.5 + 0.5 * smoothstep(0.15, 0.6, ropeHigh), close * ropy);
  float hair = smoothstep(0.02 + 0.0015 * far, 0.0, net.r) * smoothstep(700.0, 60.0, far) * smoothstep(0.2, 0.5, vnoise(q / 23.0 + 9.0));
  float crack = (1.0 - 0.6 * hair * plain) * (0.25 + 0.75 * slabEdge);
  float rough = clamp(0.3 + 0.45 * age - 0.12 * (1.0 - age) * plain - 0.3 * (ropeHigh - 0.5) * ropy + 0.25 * (1.0 - mid), 0.18, 0.92);

  vec3 p = vec3(xz.x, 0.02, xz.y);
  float open = land.g * (1.0 - contactAt(p)) * hollow * crack;
  vec3 light = skyIrradiance(n) * open + lakeIrradianceFar(vec3(xz.x, 1.5, xz.y), n) + emitterIrradiance(p, n);
  // The lava in a gap lights the lip of the crust beside it, most where the lip leans toward it.
  light += gLip * (0.12 + 0.8 * max(dot(n.xz, -away), 0.0)) * crack;
  vec3 c = albedo * light / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  // A rough skin seen at a low angle hides its own shine: only the crests of the ropes and swells keep it.
  float fresnel = (0.03 + 0.25 * (1.0 - rough) * (1.0 - rough) * pow(1.0 - nv, 5.0)) * mix(1.0, 0.25 + 0.9 * smoothstep(0.45, 0.75, nhE.b), streak * plain);
  vec3 r = reflect(-v, normalize(n + vec3(0.0, 1.5 - 1.1 * close, 0.0)));
  r.y = abs(r.y);
  c += fresnel * lakeMirror(r, rough) * mix(vec3(1.0), uFill / uFill.r, mix(0.75, 1.0, plain)) * open;

  // The bank of a channel is crust seen on edge: dark, lit hard by the lava at its foot, glowing where it meets it.
  vec3 facet = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  float steepFace = 1.0 - smoothstep(0.5, 0.9, min(abs(facet.y), normalize(vNormalG).y + 0.12));
  float bank = max(smoothstep(-0.02, -0.07, vWorld.y) * max(1.0 - smoothstep(0.8, 0.97, vDeep), steepFace), steepFace * smoothstep(0.5, 0.15, edge) * step(1e-3, net.a)) * step(vNormalG.y, 0.9995);
  float foot = smoothstep(-0.16, -0.3, vWorld.y);
  float torn = vnoise(vec2(q.x + q.y, vWorld.y * 9.0) * 4.0) * 0.6 + vnoise(q * 23.0) * 0.4;
  float kelvin = mix(heat.y, 800.0 + 230.0 * foot * foot * (0.4 + 0.6 * torn), bank);
  heat.x = mix(heat.x, smoothstep(0.7, 1.0, foot + 0.3 * (torn - 0.5)) * 0.35, bank);
  c = mix(c, albedo * (0.22 * light / 3.14159 + gLip * 0.012 * (0.15 + foot) * torn), bank);
  // A wall is crust seen on edge: the skin's picture would smear down it, so it wears a plain dark break instead.
  c = mix(c, vec3(0.05, 0.046, 0.044) * (0.5 + 1.0 * torn) * (0.6 * light + gLip * 0.22 * (0.15 + foot)) / 3.14159, bank);

  // The ridge of key heart-4 has split along its crest, on the side of the lens, and glows in the split.
  vec2 rab = uRidge[0].zw - uRidge[0].xy;
  vec2 rrel = q - uRidge[0].xy;
  float rt = dot(rrel, rab) / dot(rab, rab);
  float rside = (rrel.x * rab.y - rrel.y * rab.x) / length(rab);
  float split = (1.0 - smoothstep(0.02, 0.06, abs(rside - 0.42 - 0.3 * (vnoise(q / 1.7 + 2.0) - 0.5)))) * smoothstep(0.42, 0.6, vnoise(q / 4.3 + 12.0)) * step(0.06, rt) * step(rt, 0.94) * smoothstep(0.5, 0.8, vNormalG.y);
  if (split > heat.x) {
    heat.x = split;
    kelvin = 1060.0 + 170.0 * vnoise(q * 2.1 + 5.0);
  }
  // Skin too cold to glow is seen by the light that falls on it.
  heat.x *= smoothstep(900.0, 1010.0, kelvin);
  // Open lava hides the crust. The skin beside it still glows.
  vec3 hot = blackbody(kelvin) * heat.x;
  hot += blackbody(mix(760.0, 1040.0, lip * lip)) * 0.5 * step(1e-3, heat.x + young) * young * (1.0 - bank);
  gl_FragColor = vec4(rigOut(c * (1.0 - heat.x)) + hot * uLava, 1.0);
  // Last, after every derivative is taken: a discard before them leaves the neighbours' derivatives undefined.
  // Far off the crust runs on under the rock, which hides it: no gap opens where the far shore is drawn coarsely.
  if (land.b > 1.5 + 0.6 * max(far - 150.0, 0.0)) discard;
}`;

const GLOW_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vDrift;
${NOISE_GLSL}
${RIG_GLSL}
${HEAT_GLSL}
void main() {
  vec2 xz = vWorld.xz;
  float shore = landAt(xz).b;
  vec2 q = xz - vDrift;
  vec4 heat = heatAt(q, -shore, netAt(q), 1.0 / uGlowTexels);
  gl_FragColor = vec4(blackbody(heat.y) * heat.x, 1.0);
  if (shore > 1.5) discard;
}`;

// The sheet of the lake, cut to the lake's outline: a face that lies wholly under the land is left out, because this renderer
// pays for every fragment drawn, seen or not.
const CELL = 6;
const X0 = NET.minX - 12;
const Z0 = NET.minZ - 12;
// The cells of the sheet that are built in relief, with the size of their squares: fine along the channels of the near
// shore and at the ridge, coarser along the long seam the group feeds at.
function builtCells(): Map<string, number> {
  const cells = new Map<string, number>();
  const mark = (x: number, z: number, reach: number, fine: number): void => {
    for (let i = Math.floor((x - reach - X0) / CELL); i <= Math.floor((x + reach - X0) / CELL); i++) {
      for (let j = Math.floor((z - reach - Z0) / CELL); j <= Math.floor((z + reach - Z0) / CELL); j++) {
        const key = `${i},${j}`;
        cells.set(key, Math.min(cells.get(key) ?? 1e9, fine));
      }
    }
  };
  for (const p of seamLine('line', 80)) mark(p[0], p[1], 3.4, 0.1);
  for (const name of ['nearA', 'nearB']) for (const p of seamLine(name, 60)) mark(p[0], p[1], 2.6, 0.2);
  for (const p of seamLine('group', 120)) {
    // The feeding picture looks down on this seam from (-454.9, 250.3): the crust is built 15 m either side of it there.
    const lens = Math.hypot(p[0] + 454.9, p[1] - 250.3);
    mark(p[0], p[1], lens > 36 && lens < 112 ? 15 : 3.0, 0.3);
  }
  RIDGES.forEach((r, which) => {
    const reach = 2.9 * r.reach + 1.4;
    for (let k = 0; k <= 24; k++) mark(r.from[0] + ((r.to[0] - r.from[0]) * k) / 24, r.from[1] + ((r.to[1] - r.from[1]) * k) / 24, reach, which === 0 ? 0.2 : 0.1);
  });
  return cells;
}

// The built cells. The lift falls to nothing at the edge of the patch and where squares of two sizes meet, so no gap opens.
function patchSheet(cells: Map<string, number>): THREE.BufferGeometry {
  const position: number[] = [];
  const lift: number[] = [];
  const faces: number[] = [];
  for (const [key, fine] of cells) {
    const n = Math.round(CELL / fine);
    const has = (i: number, j: number): boolean => cells.get(`${i},${j}`) === fine;
    const [ci, cj] = key.split(',').map(Number) as [number, number];
    const base = position.length / 3;
    const west = has(ci - 1, cj);
    const east = has(ci + 1, cj);
    const north = has(ci, cj - 1);
    const south = has(ci, cj + 1);
    const nw = has(ci - 1, cj - 1);
    const ne = has(ci + 1, cj - 1);
    const sw = has(ci - 1, cj + 1);
    const se = has(ci + 1, cj + 1);
    for (let b = 0; b <= n; b++) {
      for (let a = 0; a <= n; a++) {
        const u = a * fine;
        const v = b * fine;
        let edge = 1e9;
        if (!west) edge = Math.min(edge, u);
        if (!east) edge = Math.min(edge, CELL - u);
        if (!north) edge = Math.min(edge, v);
        if (!south) edge = Math.min(edge, CELL - v);
        if (!nw) edge = Math.min(edge, Math.hypot(u, v));
        if (!ne) edge = Math.min(edge, Math.hypot(CELL - u, v));
        if (!sw) edge = Math.min(edge, Math.hypot(u, CELL - v));
        if (!se) edge = Math.min(edge, Math.hypot(CELL - u, CELL - v));
        position.push(X0 + ci * CELL + u, 0, Z0 + cj * CELL + v);
        const k = Math.min(1, edge / 1.2);
        lift.push(k * k * (3 - 2 * k));
      }
    }
    for (let b = 0; b < n; b++) {
      for (let a = 0; a < n; a++) {
        const p = base + b * (n + 1) + a;
        faces.push(p, p + n + 1, p + 1, p + 1, p + n + 1, p + n + 2);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute('aLift', new THREE.Float32BufferAttribute(lift, 1));
  g.setIndex(faces);
  return g;
}

function lakeSheet(ctx: HeartContext, cell: number, skip: Map<string, number>): THREE.BufferGeometry {
  const x0 = X0;
  const z0 = Z0;
  const nx = Math.ceil((NET.width * NET.cell + 24) / cell);
  const nz = Math.ceil((NET.height * NET.cell + 24) / cell);
  const wet = new Uint8Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) wet[j * (nx + 1) + i] = ctx.rig.land.shore(x0 + i * cell, z0 + j * cell) < 2.5 + cell + 0.6 * Math.max(Math.hypot(x0 + i * cell + 520, z0 + j * cell - 250) - 200, 0) ? 1 : 0;
  const index = new Map<number, number>();
  const position: number[] = [];
  const faces: number[] = [];
  const corner = (i: number, j: number): number => {
    const k = j * (nx + 1) + i;
    let v = index.get(k);
    if (v === undefined) {
      v = position.length / 3;
      position.push(x0 + i * cell, 0, z0 + j * cell);
      index.set(k, v);
    }
    return v;
  };
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * (nx + 1) + i;
      if (!(wet[k] || wet[k + 1] || wet[k + nx + 1] || wet[k + nx + 2]) || skip.has(`${i},${j}`)) continue;
      const a = corner(i, j);
      const b = corner(i + 1, j);
      const c = corner(i, j + 1);
      const d = corner(i + 1, j + 1);
      faces.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setIndex(faces);
  return g;
}

export function create(ctx: HeartContext): HeartPiece {
  const net = bakeNet((x, z) => -ctx.rig.land.shore(x, z));
  const shared = {
    ...ctx.rig.uniforms,
    tNet: { value: net.wide },
    uNetRect: { value: new THREE.Vector4(NET.minX, NET.minZ, 1 / (NET.width * NET.cell), 1 / (NET.height * NET.cell)) },
    tNetFine: { value: net.fine },
    uNetFineRect: { value: new THREE.Vector4(NET_FINE.minX, NET_FINE.minZ, 1 / (NET_FINE.width * NET_FINE.cell), 1 / (NET_FINE.height * NET_FINE.cell)) },
    uPool: { value: new THREE.Vector4(POOL.x, POOL.z, 1 / POOL.rx, 1 / POOL.rz) },
    uSunk: { value: new THREE.Vector3(SUNK[0], SUNK[2], 14) },
    tRopeNh: { value: ctx.assets.texture('mat/pahoehoe-nh.png', { kind: 'data' }) },
    uRidge: { value: RIDGES.map((r) => new THREE.Vector4(r.from[0], r.from[1], r.to[0], r.to[1])) },
    uRidgeSize: { value: RIDGES.map((r) => new THREE.Vector2(r.tall, r.reach)) },
  };
  const foundering = createFoundering(ctx);
  Object.assign(shared, foundering.uniforms);
  const lava = { value: 1 };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...shared,
      tSkin: { value: ctx.assets.texture('mat/crust-skin.jpg') },
      tSkinNh: { value: ctx.assets.texture('mat/crust-skin-nh.png', { kind: 'data' }) },
      tRope: { value: ctx.assets.texture('mat/pahoehoe.jpg') },
      tRopeWide: { value: ctx.assets.texture('mat/pahoehoe.jpg') },
      tRopeNhWide: { value: ctx.assets.texture('mat/pahoehoe-nh.png', { kind: 'data' }) },
      uLava: lava,
      uGroupSeam: { value: new THREE.Vector4(-458.8, 221.3, -326.8, 179.3) },
    },
  });
  material.userData.depthFragment = `precision highp float;\nvarying vec3 vWorld;\n${RIG_GLSL}\nvoid main() { if (landAt(vWorld.xz).b > 1.5 + 0.6 * max(length(cameraPosition - vWorld) - 150.0, 0.0)) discard; gl_FragColor = vec4(0.0); }`;
  const built = builtCells();
  const sheet = new THREE.Mesh(lakeSheet(ctx, CELL, built), material);
  const patchMaterial = new THREE.ShaderMaterial({ vertexShader: PATCH_VERTEX, fragmentShader: FRAGMENT, uniforms: material.uniforms });
  patchMaterial.userData.depthFragment = material.userData.depthFragment;
  const patch = new THREE.Mesh(patchSheet(built), patchMaterial);
  patch.frustumCulled = false;
  const crust = new THREE.Group();
  crust.add(sheet, patch);
  ctx.scene.add(ctx.parts.built('crust', crust));
  // The lava is drawn by the same sheet: it is an effect of the crust, and alone it is the sheet with everything but its heat blacked.
  ctx.parts.effect('lava', 'built');

  const glowMaterial = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: GLOW_FRAGMENT, uniforms: shared, depthTest: false, depthWrite: false });
  const glow = new THREE.Mesh(sheet.geometry, glowMaterial);
  glow.frustumCulled = false;
  ctx.rig.glowScene.add(glow);

  // Everything molten is the lava owner's: its meshes are added after the crust, so the depth test lays the melt in the gaps.
  const molten = createLava(ctx, net, shared);

  return {
    setTime: (seconds) => {
      foundering.setTime(seconds);
      molten.setTime(seconds);
    },
    solo: (part) => {
      lava.value = part === null || part === 'heart/lava' ? 1 : 0;
      foundering.solo(part);
      molten.solo(part);
    },
    dispose: () => {
      sheet.geometry.dispose();
      patch.geometry.dispose();
      patchMaterial.dispose();
      material.dispose();
      glowMaterial.dispose();
      net.wide.dispose();
      net.fine.dispose();
      foundering.dispose();
      molten.dispose();
    },
  };
}
