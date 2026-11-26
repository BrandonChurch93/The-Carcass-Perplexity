// The lake of the Eye, drawn by one surface: what the still water mirrors (the far world of the rig, and whatever stands in it),
// the bed seen through it (the knee-deep shelf with its amber mats, the pale lip, the wall of the shaft going down into the dark),
// the rings that leave the centre and every mouth and leg, the breath of air on it, and what rises at its centre.
// There is no floor mesh under the shallows: the bed is worked out where the bent ray meets it, so there is one sheet of water and no box.
import * as THREE from 'three';
import handoff from '../handoff.json';
import { smooth } from '../layout';
import { lipAt } from '../land/height';
import { during } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { BED_GLSL, bedUniforms } from './bed';
import { createMirror } from './water';

export const PARTS: readonly string[] = ['lake', 'shallows', 'shaft', 'mats', 'riser'];

const LAPS = 22;

const WATER_VERTEX = /* glsl */ `
uniform vec4 uDome;
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  float u = clamp(length(w.xz) / uDome.y, 0.0, 1.0);
  float k = 1.0 - u * u;
  w.y += uDome.x * k * k;
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// What breaks the surface round the swell: a few small pale things, each a bent spike that stands a little and sinks a little.
const RISERS: readonly [number, number, number, number][] = [
  [-35, 40, 1.2, 0.3], [22, 78, 1, 1.7], [58, 22, 1.3, 2.9], [44, 62, 2.6, 4.1], [-8, 150, 1.4, 5.2],
  [-62, 112, 1.1, 0.9], [12, -48, 1.5, 3.3], [76, 108, 1, 2.2], [-22, 252, 1.6, 4.8],
];

const RISER_VERTEX = /* glsl */ `
uniform float uTime;
attribute vec4 aRiser;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  float h = clamp(position.y + 0.5, 0.0, 1.0);
  float stand = 2.0 * aRiser.z * (0.75 + 0.25 * sin(uTime * 0.7 + aRiser.w * 3.0));
  float lean = aRiser.w;
  vec2 to = vec2(cos(lean), sin(lean));
  vec3 q = vec3(position.x, (h - 0.25) * stand, position.z) * vec3(0.4 + 0.25 * aRiser.z, 1.0, 0.4 + 0.25 * aRiser.z);
  q.xz += to * (h * h * h * 0.6 * stand + 0.04 * sin(uTime * 1.3 + aRiser.w * 7.0) * h);
  vec3 w = vec3(aRiser.x, 0.0, aRiser.y) + q;
  vWorld = w;
  vNormal = normalize(vec3(normal.x, 0.25, normal.z));
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const RISER_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
${RIG_GLSL}
void main() {
  if (vWorld.y < 0.0) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float wet = smoothstep(0.5, 0.0, vWorld.y);
  vec3 colour = rigShade(vWorld, n, v, vec3(0.62, 0.55, 0.47) * (1.0 - 0.45 * wet), 0.55 - 0.3 * wet, 1.0);
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

const WATER_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
uniform sampler2D tRipple;
uniform vec3 uRiser[9];
uniform sampler2D tMirror;
uniform mat4 uMirrorMatrix;
uniform float uMirrorOn;
uniform float uLens;
uniform vec4 uLap[${LAPS}];
uniform int uLapCount;
uniform vec4 uMirror;
uniform vec4 uDome;
// x: seconds since the centre rose (negative before), y: how far the rest picture of the handoff has come in.
uniform vec4 uCentre;
uniform vec3 uRestWater;
uniform vec3 uRestRing;
uniform float uRestRadius[9];
uniform float uRestWidth;
${NOISE_GLSL}
${RIG_GLSL}
${BED_GLSL}

// Metres in from the shore. Where the built land has given way to the picture of the far world the water runs on, shallow, to the picture's own shore.
float shoreIn(vec2 xz) {
  float s = -landAt(xz).b;
  if (uNear.w > 0.5 && length(xz - uNear.xy) > uNear.z) s = max(s, 14.0);
  return s;
}

// The slope of the water from a field of small waves that repeats: two reads of it that cross make water that never comes round.
vec2 waves(vec2 q, vec2 drift) {
  return texture2D(tRipple, q + drift).rg + texture2D(tRipple, q * 0.73 + vec2(0.31, 0.57) - drift.yx * 1.3).rg;
}

void main() {
  vec3 p = vWorld;
  // The water ends where the picture of the far world stands on it.
  if (uPlateTone.w > 0.5 && length(p.xz - uPlateAt.xz) > uPlateAt.w) discard;
  vec3 toCamera = cameraPosition - p;
  float away = length(toCamera);
  vec3 v = toCamera / away;
  float r = length(p.xz);
  vec2 out2 = p.xz / max(r, 1e-3);
  vec4 land = landAt(p.xz);
  float inShore = shoreIn(p.xz);

  // The slope of the surface.
  vec2 slope = vec2(0.0);
  // The slow rings alone, kept apart: seen low, a face of a ring that leans to the eye is dark and one that leans away is bright.
  vec2 heave = vec2(0.0);
  // The rings of what drinks, kept apart: they are read on the whole of the water, the mirror and what lies under it.
  vec2 lapped = vec2(0.0);
  // Rings that leave the centre, always: low and long, stronger on one side, and a train of higher ones thrown by what rises.
  if (r < 700.0) {
    float broken = 0.45 + 1.1 * vnoise(out2 * 3.0 + r / 41.0);
    float quiet = 0.012 * (uPlateTone.w > 1.5 ? 0.3 : 1.0) * exp(-r / 260.0) * cos(r * 0.42 - uTime * 2.1) + 0.006 * exp(-r / 420.0) * cos(r * 0.19 - uTime * 1.3 + 1.0);
    // What heaves at the centre sends out wide slow rings, heavy water, one every five seconds.
    quiet += 0.2 * exp(-r / 170.0) * smoothstep(20.0, 60.0, r) * cos(r * 0.135 - uTime * 1.15 + 2.5 * vnoise(out2 * 2.0) + 7.0 * vnoise(p.xz / 83.0 + 5.0) + 2.4 * vnoise(p.xz / 21.0 + 1.7)) * (0.12 + 1.7 * pow(vnoise(p.xz / 37.0 + vec2(0.0, uTime * 0.02)), 1.6));
    // A second train comes back off the south shore across the first, so that no ring runs whole from side to side.
    quiet += 0.07 * exp(-r / 240.0) * smoothstep(40.0, 120.0, r) * cos(dot(p.xz, vec2(0.071, 0.118)) + uTime * 0.9 + 5.0 * vnoise(p.xz / 61.0 + 9.0)) * vnoise(p.xz / 44.0 + 3.0);
    // From high up the lake is a mirror first: the rings are there, slow and low, and the wall stands whole in them.
    quiet *= mix(1.0, 0.3, smoothstep(8.0, 30.0, cameraPosition.y) * step(uPlateTone.w, 1.5));
    // Round what heaves the rings stand close and high, each broken along its length, and they thin as they go out over a third of the lake.
    float nearDome = uDome.x * exp(-r / 85.0) * smoothstep(uDome.y * 0.6, uDome.y * 1.3, r);
    quiet += 0.045 * nearDome * cos(r * 0.3 - uTime * 2.0 + 2.0 * vnoise(p.xz / 47.0 + 2.0)) * (0.25 + 1.3 * vnoise(vec2(atan(p.x, p.z) * 5.0, r / 37.0 - uTime * 0.06)));
    float since = uCentre.x;
    float front = 70.0 + 40.0 * max(since, 0.0);
    float thrown = since > -1.5 ? 0.05 * smoothstep(-1.5, 0.3, since) * exp(-max(since, 0.0) / 3.5) * smoothstep(front + 30.0, front - 40.0, r) * exp(-r / 220.0) * cos(r * 0.3 - uTime * 2.6) : 0.0;
    // Chop on and round the swell: short waves that cross.
    float du = clamp(r / uDome.y, 0.0, 1.0);
    float dr = (quiet + thrown) * broken + uDome.x * 2.0 * (1.0 - du * du) * (-2.0 * du / uDome.y);
    slope += out2 * dr;
    heave += out2 * (quiet + thrown) * broken;
    float chop = clamp(uDome.x / 2.0, 0.0, 1.0) * smoothstep(210.0, 40.0, r) * (0.5 + vnoise(p.xz / 17.0 + uTime * 0.05));
    // The breath of the evening lays patches of small waves on the open water between the rings.
    float gust = smoothstep(0.5, 0.72, vnoise(p.xz / 95.0 + vec2(uTime * 0.035, 3.0))) * smoothstep(1500.0, 500.0, away) * smoothstep(40.0, 120.0, away);
    if (gust > 0.0) slope += gust * 0.022 * waves(p.xz / 4.6, vec2(uTime * 0.07, -uTime * 0.04));
    if (chop > 0.0) slope += chop * (0.05 * waves(p.xz / 13.0, vec2(uTime * 0.05, uTime * 0.03)) + 0.04 * waves(p.xz / 3.7, vec2(-uTime * 0.11, uTime * 0.08)));
  }
  // Each small thing that breaks the surface round the swell throws its own ring, one at a time, that widens and dies.
  if (r < 300.0) {
    for (int i = 0; i < 9; i++) {
      vec3 at = uRiser[i];
      vec2 d = p.xz - at.xy;
      float m = length(d);
      if (m < 50.0) {
        float age = fract(uTime / 7.0 + at.z * 0.37);
        float wide = 4.0 + 30.0 * age;
        float x = (m - wide) / 4.0;
        vec2 ring = d / max(m, 1e-3) * (0.035 * (1.0 - age) * x * exp(-x * x));
        slope += ring;
        heave += ring;
      }
    }
  }
  // Rings where something drinks or stands: two trains of unlike length that leave it and die within a few metres.
  for (int i = 0; i < ${LAPS}; i++) {
    if (i >= uLapCount) break;
    vec4 l = uLap[i];
    vec2 d = p.xz - l.xy;
    float m = length(d);
    if (l.w > 0.0 && m < 11.0) {
      // Seen low and from a way off, only a long ring reads: two metres from crest to crest, and a shorter train inside it.
      float ph = m * 3.2 - (uTime + l.z) * 2.7;
      float ph2 = m * 10.0 - (uTime + l.z * 2.3) * 5.2;
      // The short train is drawn only where the eye can tell one crest from the next.
      float told = smoothstep(2.4, 0.9, fwidth(m * 10.0));
      float pack = 0.6 + 0.4 * sin(m * 0.5 - uTime * 0.7 + l.z * 5.0);
      float env = l.w * 0.055 * exp(-m / 3.2) * smoothstep(0.03, 0.4, m) * pack;
      vec2 ring = d / max(m, 1e-3) * (env * (0.5 * cos(ph) + 0.9 * told * cos(ph2)));
      slope += ring;
      lapped += ring;
    }
  }
  // A breath of air: a long slow heave everywhere, wavelets nearer, and lanes where a cat's paw has roughened the mirror.
  vec2 wind = vec2(0.8, 0.6);
  float gust = smoothstep(0.38, 0.75, vnoise(vec2(dot(p.xz, wind), dot(p.xz, vec2(-wind.y, wind.x)) * 2.4) / 170.0 - vec2(uTime * 0.06, 0.0)));
  slope += 0.0035 * waves(p.xz / 71.0, wind * uTime * 0.011);
  float mid = 1.0 - smoothstep(260.0, 900.0, away);
  if (mid > 0.0) slope += (0.0015 + 0.007 * gust) * mid * waves(p.xz / 12.0, wind * uTime * 0.03);
  float close = 1.0 - smoothstep(25.0, 110.0, away);
  if (close > 0.0) slope += (0.0016 + 0.006 * gust) * close * waves(p.xz / 2.6, wind * uTime * 0.06);
  float closer = 1.0 - smoothstep(4.0, 22.0, away);
  if (closer > 0.0) slope += 0.002 * closer * waves(p.xz / 0.61, wind * uTime * 0.12);

  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float f = 0.02 + 0.98 * pow(1.0 - nv, 5.0);

  // What the water mirrors: the far world, softer the further off and where the air has roughened it.
  vec3 rd = reflect(-v, n);
  rd.y = abs(rd.y) + 0.003;
  // Seen low across water, a wave moves what it mirrors up and down and hardly at all to the side: the mirrored wall breaks into level bars.
  vec2 level = normalize(-v.xz);
  rd.xz = mix(level * length(rd.xz), rd.xz, 0.15 + 0.85 * smoothstep(0.12, 0.5, v.y));
  // Through a long lens the wall in the water is one picture, pulled long and only shaken by the ripples: a wave moves it a little, it does not deal it out in pieces.
  if (uPlateTone.w > 1.5) {
    vec3 still = reflect(-v, vec3(0.0, 1.0, 0.0));
    rd.y = max(mix(still.y, rd.y, 0.3), 0.003);
  }
  rd = normalize(rd);
  float soft = 0.5 + 1.0 * smoothstep(100.0, 1400.0, away) + 1.6 * gust * mid;
  vec3 refl = farRadiance(p, rd, soft) * mix(vec3(0.78, 0.8, 0.84), vec3(0.8, 0.86, 0.95), smoothstep(8.0, 40.0, cameraPosition.y) * step(uPlateTone.w, 1.5));
  // Far off the eye looks along the water: the mirror there is whole and as bright as what stands over it, and the mist that lies at the
  // foot of the far wall lies on the water too, so that no line shows where the water ends.
  if (uPlateTone.w > 0.5) {
    float toPlate = length(p.xz - uPlateAt.xz) / uPlateAt.w;
    vec3 mistLight = (0.3 * skyIrradiance(vec3(0.0, 1.0, 0.0)) + uSunColour * (0.13 * sunOver(land, p)) + 0.35 * skyRadiance(normalize(vec3(-v.x, 0.05, -v.z)))) * (2.4 / 3.14159);
    refl = mix(refl, mistLight, (uPlateTone.w > 1.5 ? 0.3 : 0.9) * smoothstep(0.72, 0.985, toPlate) * (1.0 - uSolo));
    // And the bank that stands at the foot of the far wall is in the mirror as it is in the air: a ray that leaves the water low finds it.
    refl = mix(refl, mistLight, 0.5 * uMirror.a * pow(smoothstep(0.03, 0.002, rd.y), 1.5) * (1.0 - uSolo));
  }
  // Staged by shot: the far water of the shore shot lies under the shaded wall and the high sky, and is the colour of them.
  refl *= mix(vec3(1.0), uMirror.rgb, smoothstep(12.0, 90.0, away));
  refl *= 1.0 + 0.42 * tanh(0.33 * dot(heave, normalize(v.xz)) / max(v.y, 0.03)) * smoothstep(0.5, 0.12, v.y);
  // Whatever stands in the water or at its edge, drawn once more from under it.
  if (uMirrorOn > 0.5) {
    vec4 m4 = uMirrorMatrix * vec4(p.x, 0.0, p.z, 1.0);
    vec3 bent = (viewMatrix * vec4(n.x, 0.0, n.z, 0.0)).xyz;
    vec2 uv = m4.xy / m4.w + vec2(bent.x * 0.04, -bent.z * 0.16) * uLens;
    vec4 seen = texture2D(tMirror, clamp(uv, 0.001, 0.999));
    // Nothing is known of what lies outside the mirror's own frame.
    vec2 inside = smoothstep(vec2(0.0), vec2(0.03), uv) * smoothstep(vec2(1.0), vec2(0.97), uv);
    seen.a *= inside.x * inside.y;
    refl = mix(refl, seen.rgb * 0.82, seen.a);
  }

  // What lies under it.
  vec3 rf = refract(-v, n, 0.752);
  float fall = max(-rf.y, 0.12);
  // The line of the lip wanders, and its edge is the broken edge of its crust.
  vec3 lip = lipHere(p.xz);
  float w = lip.x;
  float crusted = lipCover(p.xz, lip);
  float crustLine = crusted;
  // From the rim the mats do not stop at a line: they thin toward the lip in tongues, and the dark of the deep begins among them.
  crusted *= mix(1.0, smoothstep(0.0, 20.0, w + 16.0 * (vnoise(p.xz / 21.0 + 6.0) - 0.5) + 7.0 * (vnoise(p.xz / 5.1) - 0.5)), smoothstep(8.0, 40.0, cameraPosition.y));
  vec3 under;
  float dry = 0.0;
  vec3 shelf = vec3(0.0);
  if (crusted > 0.0) {
    float depth = shelfDepthAt(p.xz, inShore, w);
    vec2 b = p.xz + rf.xz * (max(depth, 0.0) / fall);
    vec3 lip2 = lipNear(b, p.xz, lip);
    float w2 = lip2.x;
    float in2 = shoreIn(b);
    Bed bed = bedAt(b, lip2, in2, shelfDepthAt(b, in2, max(w2, 0.0)), away);
    float depth2 = bed.depth;
    vec3 at = vec3(b.x, 0.0, b.y);
    float sun = sunAt(at);
    float open = skyOpen(at);
    vec3 bn = normalize(vec3(bed.tilt.x, 1.0, bed.tilt.y));
    vec3 e = skyIrradiance(bn) * open + uSunColour * (sun * (max(dot(bn, normalize(vec3(uSunDir.x, uSunDir.y + 0.35, uSunDir.z))), 0.0) * 0.8 + bed.glow));
    // The light that reaches the bed has come through amber water: it is warm, whatever the sky.
    e = mix(e, dot(e, vec3(0.3, 0.5, 0.2)) * vec3(1.2, 1.0, 0.74), 0.65);
    // The light of the low sky comes into the water far more easily than the sun does: the bed is lit from above.
    vec3 lit = bed.albedo * e * (bed.occ / 3.14159);
    float d = max(depth2, 0.0);
    vec3 through = exp(-uAbsorb * d * (1.0 + 1.0 / fall));
    shelf = lit * through + uDeep * skyIrradiance(vec3(0.0, 1.0, 0.0)) * open * 0.7 * (1.0 - through);
    under = shelf;
    // Where a slab, the crust of the lip or the top of a mat stands out of the water it is wet stone and weed, not a mirror.
    dry = bed.dry * crusted;
    // A low eye that looks a long way along the water finds only the mirror: what stands a finger out of it far off is lost in the glance.
    dry *= mix(1.0, smoothstep(520.0, 220.0, away), smoothstep(12.0, 4.0, cameraPosition.y));
    dry *= 1.0 - smoothstep(600.0, 1000.0, away) * (1.0 - smoothstep(0.03, 0.07, v.y));
  }
  if (crusted < 1.0) {
    // Over the shaft: the wall goes down pale and green under the lip and is lost in a few metres; then only the dark of the water.
    float inside = max(-w, 0.0) + 0.2;
    float down = 0.3 + 0.75 * inside + 0.05 * inside * inside;
    vec2 b = p.xz + rf.xz * (min(down, 9.0) / fall) * 0.25;
    Bed bed = wallAt(b, down, inside);
    // The wall under a lip looks toward the middle of the shaft: an eye on the shelf sees it only across a bay, where the lip turns to face it.
    // Under the lip at its own feet the floor stops and there is the dark of the water.
    vec2 lipOut = vec2(dFdx(w), dFdy(w)) * inverse(mat2(dFdx(p.xz), dFdy(p.xz)));
    float facing = smoothstep(-0.2, 0.4, dot(-normalize(lipOut + vec2(1e-6, 0.0)), normalize(cameraPosition.xz - p.xz)));
    facing = mix(facing, 1.0, smoothstep(6.0, 20.0, cameraPosition.y));
    bed.albedo *= mix(0.16, 1.0, facing);
    vec3 at = vec3(p.x, 0.0, p.z);
    // Out over the deep the whole sky is overhead: the land map's own count of it is coarse there and would draw its steps on the water.
    float open = mix(skyOpen(at), 0.92, smoothstep(4.0, 60.0, inside));
    // The low sun hardly enters the deep: what little does is the same everywhere, so the shade of the rim draws no edge on it.
    vec3 e = skyIrradiance(vec3(0.0, 1.0, 0.0)) * open + uSunColour * 0.05;
    vec3 through = exp(-uAbsorb * down * (2.6 + 1.2 / fall));
    // The wall is seen for some metres down from the lip: its picture carries the water's own tint, so the water here only takes it away with depth.
    float seen = exp(-down * 0.34);
    vec3 deep = bed.albedo * e * (bed.occ / 3.14159) * seen * exp(-uAbsorb * down * 0.9) * 1.1 + uDeep * skyIrradiance(vec3(0.0, 1.0, 0.0)) * open * (1.0 - through);
    // What rises: a pale shape under the dome, never the whole of it.
    float du = clamp(r / (uDome.y * 0.8), 0.0, 1.0);
    float pale = clamp((uDome.x - 1.5) / 4.0, 0.0, 1.0) * (1.0 - du * du) * (0.55 + 0.45 * vnoise(p.xz / 9.0 + 3.0));
    deep += vec3(0.05, 0.062, 0.06) * skyIrradiance(vec3(0.0, 1.0, 0.0)) * pale * (0.4 + 0.6 * smoothstep(0.1, 0.6, v.y));
    under = mix(deep, shelf, crusted);
    // Under the lip the water lies in its lee, flat, and the eye goes down the wall.
    f *= mix(0.3, 1.0, smoothstep(0.5, 14.0, inside));
    // An eye that looks down into the deep finds the dark of it, and the mirror only further out where it looks along the water.
    f *= mix(1.0, mix(1.0, 0.3, smoothstep(0.07, 0.28, v.y)), (1.0 - crusted) * smoothstep(12.0, 3.0, cameraPosition.y));
  }
  f *= 1.0 - dry;
  // The last metres before the shore are a finger deep: the eye goes through to the wet stones, and the mirror comes on in tongues, never at a line.
  float high2 = smoothstep(8.0, 40.0, cameraPosition.y);
  float margin = smoothstep(0.0, mix(2.0, 11.0, high2), inShore + mix(1.0, 7.0, high2) * (vnoise(p.xz / 5.3) - 0.5) + mix(0.3, 4.0, high2) * (vnoise(p.xz / 1.4 + 3.0) - 0.5));
  f *= mix(0.12, 1.0, margin);
  // From the rim the floor is seen to fall away: a band of green water over the pale wall, before the dark.
  if (crusted < 1.0) {
    float inside = max(-w, 0.0);
    float band = high2 * exp(-inside / 16.0) * (1.0 - crustLine) * smoothstep(0.0, 5.0, inside);
    f *= 1.0 - 0.6 * band;
    under += vec3(0.01, 0.055, 0.052) * skyIrradiance(vec3(0.0, 1.0, 0.0)) * band;
  }
  // The swell at the centre is a hump of dark water: its near face looks at the eye, and the eye looks into it.
  if (r < uDome.y) {
    float du = r / uDome.y;
    float hump = clamp(uDome.x / 2.5, 0.0, 1.0) * smoothstep(0.08, 0.45, du) * (1.0 - du * du) * 1.6 * smoothstep(-0.2, 0.5, dot(out2, normalize(v.xz))) * smoothstep(0.6, 0.25, v.y);
    // Its crown lies open to the sky and is pale with it.
    float crown = clamp((uDome.x - 1.5) / 3.0, 0.0, 1.0) * smoothstep(0.5, 0.05, du) * smoothstep(0.6, 0.25, v.y);
    refl = mix(refl, skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159 * 0.8, 0.55 * crown);
    f *= 1.0 - 0.45 * hump;
    under *= 1.0 - 0.4 * hump;
    // The water it has lifted runs off it in threads that catch the sky.
    float round2 = atan(p.x, p.z);
    float thread = smoothstep(0.62, 0.8, vnoise(vec2(round2 * 43.0, r / 9.0 - uTime * 1.2)) * (0.5 + 0.5 * vnoise(vec2(round2 * 9.0, 3.0))) + 0.25) * clamp((uDome.x - 1.2) / 2.0, 0.0, 1.0) * (1.0 - du * du);
    f = mix(f, 0.9, 0.3 * thread * smoothstep(0.15, 0.6, du));
  }
  vec3 c = mix(under, refl, f);
  // A low sun on moving water: a hard glitter where a wavelet turns its face to it.
  vec3 hv = normalize(uSunDir + v);
  float sharp = 1400.0 / (1.0 + away * away / 3600.0) + 60.0;
  float glint = pow(max(dot(n, hv), 0.0), sharp) * (sharp / 1400.0) * sunAt(vec3(p.x, 0.5, p.z));
  c += uSunColour * glint * 0.6 * (close + 0.3);
  // A ring round a muzzle or a leg, seen low: the face that leans to the eye shows the dark under the water, the face that leans away the bright of the sky.
  float lap = tanh(22.0 * dot(lapped, normalize(v.xz)) * 0.08 / max(v.y, 0.04));
  c = c * (1.0 - 0.45 * max(lap, 0.0)) + skyRadiance(vec3(-v.x, 0.12, -v.z)) * (0.3 * max(-lap, 0.0));

  // The last second of the place: the picture the rise begins with, soft rings on deep water seen from straight above.
  if (uCentre.y > 0.0) {
    float theta = atan(p.x, -p.z);
    float m = 0.0;
    for (int i = 0; i < 9; i++) {
      float x = (r - uRestRadius[i]) / (0.5 * uRestWidth * uRestRadius[i]);
      m += exp(-x * x) * (0.35 + 0.30 * (0.5 + 0.5 * sin(2.0 * theta + 2.4 * float(i))));
    }
    c = mix(c, mix(uRestWater, uRestRing, clamp(m, 0.0, 1.0)), uCentre.y);
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

function surfaceGeometry(): THREE.BufferGeometry {
  const COLS = 256;
  const radii: number[] = [];
  for (let r = 1; r < 72; r += 1.5) radii.push(r);
  for (let r = 72; r < 4200; r *= 1.07) radii.push(r);
  radii.push(4200);
  const R = radii.length;
  const positions = new Float32Array((COLS * R + 1) * 3);
  for (let i = 0; i < COLS; i++) {
    const a = (i / COLS) * Math.PI * 2;
    for (let j = 0; j < R; j++) {
      const o = (i * R + j) * 3;
      positions[o] = Math.sin(a) * (radii[j] as number);
      positions[o + 1] = 0;
      positions[o + 2] = -Math.cos(a) * (radii[j] as number);
    }
  }
  const index: number[] = [];
  for (let i = 0; i < COLS; i++) {
    const k = (i + 1) % COLS;
    for (let j = 0; j < R - 1; j++) {
      const a = i * R + j;
      const b = k * R + j;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
    index.push(COLS * R, k * R, i * R);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setIndex(index);
  return g;
}

/** A field of small waves that repeats: red and green are its slope, with a spread of one. Summed from waves of whole numbers of turns, so its edges meet. */
function rippleTexture(seed: () => number): THREE.DataTexture {
  const N = 256;
  const waves: [number, number, number, number][] = [];
  for (let i = 0; i < 28; i++) {
    const k = 3 + Math.floor(seed() * 11);
    const a = seed() * Math.PI * 2;
    const kx = Math.round(Math.cos(a) * k);
    const ky = Math.round(Math.sin(a) * k);
    waves.push([kx, ky, seed() * Math.PI * 2, 1 / Math.max(1, Math.hypot(kx, ky)) ** 0.5]);
  }
  const sx = new Float32Array(N * N);
  const sy = new Float32Array(N * N);
  let sum = 0;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      let dx = 0;
      let dy = 0;
      for (const [kx, ky, ph, amp] of waves) {
        const c = amp * Math.cos(((kx * i + ky * j) / N) * Math.PI * 2 + ph);
        dx += c * kx;
        dy += c * ky;
      }
      sx[j * N + i] = dx;
      sy[j * N + i] = dy;
      sum += dx * dx + dy * dy;
    }
  }
  const spread = Math.sqrt(sum / (N * N));
  const data = new Uint16Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    data[i * 4] = THREE.DataUtils.toHalfFloat((sx[i] as number) / spread);
    data[i * 4 + 1] = THREE.DataUtils.toHalfFloat((sy[i] as number) / spread);
    data[i * 4 + 3] = THREE.DataUtils.toHalfFloat(1);
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.HalfFloatType);
  // Far off, where one pixel holds many waves, the slopes average out: the water there is smooth, not noise.
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/** The lip of the shaft all round, metres from the centre, by bearing: the bed in the shader and the lip of the land are the same line. */
function lipTexture(): THREE.DataTexture {
  const N = 4096;
  const data = new Uint16Array(N * 4);
  for (let i = 0; i < N; i++) data[i * 4] = THREE.DataUtils.toHalfFloat(lipAt(((i + 0.5) / N) * Math.PI * 2));
  const t = new THREE.DataTexture(data, N, 1, THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

export function create(ctx: Context): Piece {
  const rig = ctx.rig.uniforms;
  const mirror = createMirror();
  const seed = ctx.rng('ripple');
  const ripple = rippleTexture(() => seed.next());
  const lip = lipTexture();
  const bed = bedUniforms(ctx, lip);
  const laps = Array.from({ length: LAPS }, () => new THREE.Vector4(0, 0, 0, 0));
  const linear = (hex: string): THREE.Vector3 => {
    const c = new THREE.Color(hex);
    return new THREE.Vector3(c.r, c.g, c.b);
  };
  const dome = new THREE.Vector4(0, 46, 0, 0);
  const centre = new THREE.Vector4(-100, 0, 0, 0);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...rig,
      ...bed,
      ...mirror.uniforms,
      tRipple: { value: ripple },
      uMirrorOn: { value: 0 },
      uLens: { value: 1 },
      uLap: { value: laps },
      uLapCount: { value: 0 },
      uMirror: { value: new THREE.Vector4(1, 1, 1, 1) },
      uDome: { value: dome },
      uRiser: { value: RISERS.map((q) => new THREE.Vector3(q[0], q[1], q[3])) },
      uCentre: { value: centre },
      uRestWater: { value: linear(handoff.water) },
      uRestRing: { value: linear(handoff.ring) },
      uRestRadius: { value: handoff.ringRadii.map((share) => share * handoff.eyeHalfHeightMetres) },
      uRestWidth: { value: handoff.ringWidth },
    },
    vertexShader: WATER_VERTEX,
    fragmentShader: WATER_FRAGMENT,
  });
  material.userData.depthFragment = /* glsl */ `
varying vec3 vWorld;
uniform vec4 uPlateTone;
uniform vec4 uPlateAt;
void main() {
  if (uPlateTone.w > 0.5 && length(vWorld.xz - uPlateAt.xz) > uPlateAt.w) discard;
  gl_FragColor = vec4(0.0);
}`;
  const surface = new THREE.Mesh(surfaceGeometry(), material);
  surface.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('lake', surface));
  for (const name of ['shallows', 'shaft', 'mats']) ctx.parts.effect(name, 'built');

  const spike = new THREE.CylinderGeometry(0.2, 0.42, 1, 7, 8, false);
  const risers = new THREE.InstancedMesh(
    spike,
    new THREE.ShaderMaterial({ uniforms: { ...rig }, vertexShader: RISER_VERTEX, fragmentShader: RISER_FRAGMENT, side: THREE.DoubleSide }),
    RISERS.length,
  );
  (risers.material as THREE.ShaderMaterial).userData.depthFragment = /* glsl */ `
varying vec3 vWorld;
void main() {
  if (vWorld.y < 0.0) discard;
  gl_FragColor = vec4(0.0);
}`;
  spike.setAttribute('aRiser', new THREE.InstancedBufferAttribute(new Float32Array(RISERS.flat()), 4));
  risers.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('riser', risers));
  ctx.reflected.push(risers);

  const rise = ctx.events.rise;
  const end = ctx.events.end;
  const hidden: THREE.Object3D[] = [];

  return {
    setTime: (t) => {
      const swell = smooth(rise - 1.9, rise - 0.1, t) * (1 - smooth(rise + 1.0, rise + 3.2, t));
      // The centre is never still: a low hump of water that breathes, and at the crest of the place it stands up.
      dome.x = 1.0 + 0.3 * Math.sin(t * 0.8) + 0.15 * Math.sin(t * 1.9 + 1) + 6.5 * swell * (1 + 0.05 * Math.sin(t * 2.3));
      // Staged for the wide shot: the lip is drawn 270 m nearer the centre at the sides, so that the dark of the deep is an oval the frame holds whole.
      (material.uniforms.uLipIn as THREE.IUniform<number>).value = during('eye-01') ? 270 : 0;
      const mirrorTone = material.uniforms.uMirror as THREE.IUniform<THREE.Vector4>;
      if (during('eye-04')) mirrorTone.value.set(0.56, 0.78, 1.0, 0.3);
      else mirrorTone.value.set(1, 1, 1, 1);
      centre.x = t - rise;
      centre.y = smooth(end - 0.45, end - 0.03, t);
      laps.forEach((lap, i) => {
        const from = ctx.laps[i];
        if (from) lap.set(from.x, from.z, from.offset, from.strength);
        else lap.set(0, 0, 0, 0);
      });
      // Only the rings that are there are counted over: they fill the list from its head.
      let count = 0;
      laps.forEach((lap, i) => {
        if (lap.w > 0) count = i + 1;
      });
      (material.uniforms.uLapCount as THREE.IUniform<number>).value = count;
    },
    beforeSample: (renderer, camera) => {
      const reflected = ctx.reflected;
      const on = reflected.length > 0 && camera.position.y < 60;
      (material.uniforms.uMirrorOn as THREE.IUniform<number>).value = on ? 1 : 0;
      if (!on) return;
      (material.uniforms.uLens as THREE.IUniform<number>).value = camera.projectionMatrix.elements[5] as number;
      // Only what stands in or at the water is drawn into the mirror: the far world the water takes from the rig.
      hidden.length = 0;
      for (const o of ctx.scene.children) if (!reflected.includes(o)) hidden.push(o);
      mirror.render(renderer, ctx.scene, camera, hidden);
    },
    resize: (width, height) => mirror.resize(width, height),
    dispose: () => {
      mirror.dispose();
      ripple.dispose();
      lip.dispose();
      surface.geometry.dispose();
      material.dispose();
      spike.dispose();
      (risers.material as THREE.ShaderMaterial).dispose();
    },
  };
}
