// The lake of the Eye, drawn by one surface: what the still water mirrors (the far world of the rig, and whatever stands in it),
// the bed seen through it (the knee-deep shelf with its amber mats, the pale lip, the wall of the shaft going down into the dark),
// the rings that leave the centre and every mouth and leg, the breath of air on it, and what rises at its centre.
// There is no floor mesh under the shallows: the bed is worked out where the bent ray meets it, so there is one sheet of water and no box.
import * as THREE from 'three';
import { DEG, smooth } from '../layout';
import { LIP_BAY, lipAt } from '../land/height';
import { during } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { BED_GLSL, bedUniforms } from './bed';
import { createBefore } from './before';
import { createMirror } from './water';
import { WAVES_GLSL, WAVE_TILES, createWaves } from './waves';

export const PARTS: readonly string[] = ['lake', 'shallows', 'shaft', 'mats', 'riser'];

/** Seconds after the crest of the dome at which the view from over the lake begins to come in: film frame 9330. */
const LEAVE_FROM = (9330 - 9221) / 60;

const LAPS = 22;

// The water the centre lifts. x: its height, y: its reach, z: the time, w: how hard the water round it is churned.
// It is no solid of revolution: its foot wanders in and out, and its back is a slow boil of swellings that come up and go down in place.
const DOME_GLSL = /* glsl */ `
uniform vec4 uDome;
// Its own smooth noise, so that the corners of the water and its pixels read the same height.
float domeHash(vec2 q) {
  return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453);
}
float domeNoise(vec2 q) {
  vec2 i = floor(q);
  vec2 f = fract(q);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(domeHash(i), domeHash(i + vec2(1.0, 0.0)), f.x), mix(domeHash(i + vec2(0.0, 1.0)), domeHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float domeAt(vec2 xz) {
  float r = length(xz);
  if (r > uDome.y * 1.3) return 0.0;
  float reach = uDome.y * (0.84 + 0.42 * domeNoise(xz / 41.0 + 3.7));
  float u = clamp(r / reach, 0.0, 1.0);
  float k = 1.0 - u * u;
  float t = uDome.z;
  float boil = (domeNoise(xz / 14.0 + 9.0) - 0.5) * sin(t * 0.9 + 1.0) + (domeNoise(xz / 14.0 + 31.0) - 0.5) * cos(t * 0.9 + 1.0)
    + 0.5 * ((domeNoise(xz / 6.0 + 2.0) - 0.5) * sin(t * 1.7) + (domeNoise(xz / 6.0 + 17.0) - 0.5) * cos(t * 1.7));
  return uDome.x * k * k * (0.74 + 0.26 * k + 0.3 * boil);
}`;

const WATER_VERTEX = /* glsl */ `
${DOME_GLSL}
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  w.y += domeAt(w.xz);
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
// x: seconds since the centre rose (negative before).
uniform vec4 uCentre;
// The view from over the centre as the camera leaves. x: how far it has come in (0 until the camera begins to look down: nothing below reads it).
// y: seconds since the dome began to sink. z: how far the rings of the Eye have died away under a lens that looks straight down (at 1 nothing reads them).
uniform vec4 uLeave;
// The breathing of the mirror: the slope of the three fields of long waves.
uniform vec4 uBreath;
// Each length of ring: x its turns a metre, y its turns a second, z the speed it travels at, w its slope.
uniform vec4 uRing[6];
uniform vec4 uRiserRing[3];
uniform vec4 uLapRing[3];
uniform float uRise;
uniform float uRingsOn;
// How clear the water of the shaft is beside the amber water of the shelf.
uniform float uClear;
${NOISE_GLSL}
${RIG_GLSL}
${BED_GLSL}
${WAVES_GLSL}
${DOME_GLSL}

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

  // The surface. The lake is still: what moves on it is the long breathing of a mirror, and the rings of whatever has touched it.
  // Each wave is drawn as a slope only where the pixels can hold it. What they cannot hold is not thrown away: it is counted in lost
  // and comes back as a mirror that is drawn out up and down, which is what water too fine to be seen does to what it mirrors.
  vec2 fx = dFdx(p.xz);
  vec2 fy = dFdy(p.xz);
  float covers = max(length(fx), length(fy));
  vec2 level = normalize(-v.xz + vec2(1e-5, 0.0));
  vec2 slope = vec2(0.0);
  // The rings of what drinks, kept apart: they are read on the whole of the water, the mirror and what lies under it.
  vec2 lapped = vec2(0.0);
  float lost = 0.0;
  float churn = 0.0;
  float lifted = 0.0;
  float alive = 1.0 - uLeave.z;
  if (alive > 0.0) {
    // A wave is drawn as a slope only if it is some pixels long: shorter, it would move what it mirrors by more than its own length, in steps.
    float k0 = waveKept(covers * 4.0, ${WAVE_TILES[0].toFixed(1)});
    float k1 = waveKept(covers * 4.0, ${WAVE_TILES[1].toFixed(1)});
    float k2 = waveKept(covers * 4.0, ${WAVE_TILES[2].toFixed(1)});
    vec3 breath = uBreath.xyz * alive;
    if (k0 > 0.02) slope += breath.x * waveRead(tWave0, p.xz, ${WAVE_TILES[0].toFixed(1)}, 2.0);
    if (k1 > 0.02) slope += breath.y * waveRead(tWave1, p.xz, ${WAVE_TILES[1].toFixed(1)}, 2.0);
    // The longest field is as wide as the lake: it is read once, there is no second tile of it to hide.
    slope += breath.z * texture2D(tWave2, p.xz / ${WAVE_TILES[2].toFixed(1)}, 2.0).rg;
    lost += breath.x * breath.x * (1.0 - k0) + breath.y * breath.y * (1.0 - k1) + breath.z * breath.z * (1.0 - k2);
  }
  // Rings that leave the centre. Whatever heaves there sends out waves of four lengths, each at the speed water gives a wave of that length,
  // so that the long ones run ahead and the train never repeats. Each length is sent in its own uneven bursts and is stronger on one bearing
  // than the next, and its crests are bent by the ground they cross: no ring is whole, no two are the same way apart.
  if (r < 1500.0 && alive > 0.0) {
    float rim = uDome.y;
    float from = max(r - rim * 0.7, 0.0);
    float since = uCentre.x;
    float dr = 0.0;
    float fp = max(abs(dot(out2, fx)), abs(dot(out2, fy)));
    // The bend of the crests and the bearing a train is strong on are told once and shared out among the lengths.
    float bentA = vnoise(p.xz / 70.0 + 13.0);
    float bentB = vnoise(p.xz / 160.0 + 31.0);
    float bearA = vnoise(out2 * 2.4 + vec2(5.0, uTime * 0.05));
    float bearB = vnoise(out2 * 5.1 + vec2(23.0, -uTime * 0.04));
    for (int j = 0; j < 6; j++) {
      vec4 ring = uRing[j];
      float fj = float(j);
      // The long ones, as long as the swell that makes them is wide, cross the whole lake.
      float reach = j < 4 ? 40.0 + 45.0 * fj : 350.0 + 550.0 * (fj - 4.0);
      // A length that has died on the way here is not counted.
      if (from > 3.2 * reach) continue;
      // Nor one too short for the pixels here: it would be no more than a softer mirror.
      float told = smoothstep(1.2, 0.45, ring.x * fp);
      if (told <= 0.0) continue;
      // When the water here was sent: the train travels at the speed of its waves.
      float sent = uTime - from / ring.z;
      float bursts = 0.25 + 1.5 * vnoise(vec2(sent * 0.23 + fj * 7.3, fj * 3.1));
      // What rose at the crest of the place threw a train of its own: it is there before the dome stands, and dies in ten seconds.
      float thrownAt = sent - (uRise - 1.6);
      float thrown = thrownAt > 0.0 ? 5.0 * smoothstep(0.0, 1.2, thrownAt) * exp(-thrownAt / 4.5) : 0.0;
      // And what went down again threw another, the larger of the two.
      float fellAt = sent - (uRise + 2.0);
      if (fellAt > 0.0) thrown += 6.0 * smoothstep(0.0, 1.5, fellAt) * exp(-fellAt / 7.0);
      float turn = fract(fj * 0.37 + 0.2);
      float bearing = 0.2 + 1.6 * mix(bearA, 1.0 - bearB, turn);
      float bent = 2.2 * mix(bentA, bentB, fj / 5.0) + fj * 2.4;
      float amp = ring.w * (bursts + thrown) * bearing * inversesqrt(max(r, rim) / rim) * exp(-from / reach);
      // No ring goes all the way round: each is a run of arcs, and where an arc ends changes as the ring travels.
      amp *= smoothstep(0.3, 0.62, vnoise(out2 * (3.0 + 1.3 * fj) + vec2(fj * 11.0, sent * 0.35)));
      dr += amp * told * sin(ring.x * r - ring.y * uTime + bent);
      lost += 0.5 * amp * amp * (1.0 - told * told);
    }
    dr *= smoothstep(rim * 0.25, rim * 0.8, r) * alive * uRingsOn;
    slope += out2 * dr;
    // The swell itself, by its own lie.
    if (r < rim * 1.6) {
      float h0 = domeAt(p.xz);
      vec2 lie = vec2(domeAt(p.xz + vec2(0.75, 0.0)) - h0, domeAt(p.xz + vec2(0.0, 0.75)) - h0) / 0.75;
      slope += lie;
      // The water it lifted runs off it. The small waves that lie on the swell are carried down its fall, wherever that leads: they are read
      // at two moments half a beat apart and passed from one to the other, so they travel and never come round again.
      lifted = smoothstep(1.8, 4.5, uDome.x) * smoothstep(0.06, 0.45, h0);
      if (lifted > 0.0) {
        float steepness = length(lie);
        vec2 way = steepness > 0.004 ? -lie / steepness : vec2(0.0);
        float carry = 7.0 * min(steepness * 6.0, 1.0);
        float beatA = fract(uTime / 2.3);
        float beatB = fract(uTime / 2.3 + 0.5);
        float share = 1.0 - abs(2.0 * beatA - 1.0);
        vec2 runA = waveRead(tWave1, (p.xz - way * carry * beatA), ${WAVE_TILES[1].toFixed(1)}, 0.0);
        vec2 runB = waveRead(tWave1, (p.xz - way * carry * beatB) + 19.0, ${WAVE_TILES[1].toFixed(1)}, 0.0);
        slope += mix(runB, runA, share) * (lifted * (0.07 + 0.1 * min(uDome.w, 1.0)) * inversesqrt(share * share + (1.0 - share) * (1.0 - share)));
      }
      // Where the water it has lifted runs off it and meets the lake, the lake is churned: a torn band of short steep water round its foot,
      // heavier on one side than the next, that comes and goes.
      float du = r / rim;
      float torn = vnoise(p.xz / 11.0 + 5.0) * (0.5 + 0.5 * sin(uTime * 0.7 + 6.28 * vnoise(p.xz / 23.0 + 1.0)));
      churn = uDome.w * smoothstep(0.35, 0.95, du + 0.3 * (torn - 0.25)) * smoothstep(1.6, 1.05, du) * (0.25 + 1.5 * torn);
      if (churn > 0.0) {
        slope += churn * 0.1 * waveRead(tWave0, p.xz * 2.25, ${WAVE_TILES[0].toFixed(1)}, 0.0);
        lost += churn * churn * 0.01 * (1.0 - waveKept(covers, ${(WAVE_TILES[0] / 2.25).toFixed(1)}));
      }
    }
  }
  // Each small thing that breaks the surface round the swell sends out its own rings, which cross those of the centre.
  float splash = 0.0;
  if (r < 320.0 && alive > 0.0) {
    for (int i = 0; i < 9; i++) {
      vec3 at = uRiser[i];
      vec2 d = p.xz - at.xy;
      float m = length(d);
      if (m < 60.0) {
        vec2 dir = d / max(m, 1e-3);
        float fp = max(abs(dot(dir, fx)), abs(dot(dir, fy)));
        float dm = 0.0;
        for (int j = 0; j < 3; j++) {
          vec4 ring = uRiserRing[j];
          float sent = uTime - m / ring.z;
          float bursts = smoothstep(0.35, 0.8, vnoise(vec2(sent * 0.45 + at.z * 3.7, at.z * 9.1 + float(j) * 2.3)));
          float amp = ring.w * bursts * exp(-m / (9.0 + 7.0 * float(j))) * inversesqrt(m + 0.6) * smoothstep(0.2, 1.2, m);
          float told = smoothstep(2.4, 0.9, ring.x * fp);
          dm += amp * told * sin(ring.x * m - ring.y * uTime + at.z * 5.0);
          lost += 0.5 * amp * amp * (1.0 - told * told);
        }
        slope += dir * dm * alive;
        // Where it breaks the surface the water is white with it, most as it comes up.
        if (m < 9.0) splash += smoothstep(8.0, 1.0, m + 4.0 * vnoise(p.xz * 0.9 + uTime * vec2(0.7, 0.4) + at.z)) * (0.55 + 0.45 * cos(uTime * 0.7 + at.z * 3.0));
      }
    }
  }
  // Rings where something drinks or stands: three lengths of small wave that leave it in the beat of its lapping, each at its own speed, and die within a few metres.
  for (int i = 0; i < ${LAPS}; i++) {
    if (i >= uLapCount) break;
    vec4 l = uLap[i];
    vec2 d = p.xz - l.xy;
    float m = length(d);
    if (l.w > 0.0 && m < 14.0) {
      vec2 dir = d / max(m, 1e-3);
      float fp = max(abs(dot(dir, fx)), abs(dot(dir, fy)));
      float dm = 0.0;
      for (int j = 0; j < 3; j++) {
        vec4 ring = uLapRing[j];
        float sent = uTime + l.z - m / ring.z;
        float bursts = 0.3 + 1.1 * vnoise(vec2(sent * 1.1 + l.z * 5.3, l.z * 3.3 + float(j) * 4.1));
        float amp = l.w * ring.w * bursts * exp(-m / (2.6 + 1.6 * float(j))) * inversesqrt(m + 0.25) * smoothstep(0.03, 0.3, m);
        float told = smoothstep(2.4, 0.9, ring.x * fp);
        dm += amp * told * sin(ring.x * m - ring.y * (uTime + l.z));
        lost += 0.5 * amp * amp * (1.0 - told * told);
      }
      slope += dir * dm;
      lapped += dir * dm;
    }
  }
  float close = 1.0 - smoothstep(25.0, 110.0, away);

  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float f = 0.02 + 0.98 * pow(1.0 - nv, 5.0);

  float rimEye = smoothstep(8.0, 40.0, cameraPosition.y);
  // The line of the lip wanders, and its edge is the broken edge of its crust.
  vec3 lip = lipHere(p.xz);
  float w = lip.x;
  // Seen from the rim the shelf does not end at its crust: it shoals away under deepening water over a hundred metres, in tongues.
  float shoalAt = rimEye > 0.0 ? w + rimEye * (46.0 * (vnoise(p.xz / 57.0 + 6.0) - 0.5) + 18.0 * (vnoise(p.xz / 17.0) - 0.5)) : w;
  float shoal = rimEye * smoothstep(95.0, 0.0, shoalAt);
  float crusted = mix(lipCover(p.xz, lip), smoothstep(-14.0, 10.0, shoalAt), rimEye);
  // A low eye over the deep: the mirror is for the far water, where the look lies along it, and it is soft. Near, the eye goes into the dark.
  float lowDeep = (1.0 - crusted) * (1.0 - rimEye) * (1.0 - uLeave.x);

  // What the water mirrors: the far world. Where waves too fine for the pixels lie on it, the mirror is read three times, one above another:
  // a wave tips what it mirrors up and down and hardly at all to the side, so the wall in the water is drawn out in soft upright shapes.
  float lowEye = (1.0 - rimEye) * (1.0 - uLeave.x);
  float spread = max(sqrt(0.5 * lost), 0.012 * lowDeep);
  float soft = 0.5 + 1.0 * smoothstep(100.0, 1400.0, away) + 1.7 * lowEye + 1.5 * uLeave.x;
  vec3 rd = reflect(-v, n);
  rd.y = max(abs(rd.y), 0.003);
  rd = normalize(rd);
  vec3 refl;
  if (spread > 0.0045 && uPlateTone.w < 1.5) {
    soft += log2(1.0 + spread * 420.0);
    vec2 tip = level * (1.3 * spread);
    vec3 nUp = normalize(vec3(-slope.x - tip.x, 1.0, -slope.y - tip.y));
    vec3 nDown = normalize(vec3(-slope.x + tip.x, 1.0, -slope.y + tip.y));
    // A face that leans to the eye is seen more of than one that leans away.
    float wUp = 0.3 * max(dot(nUp, v), 0.0);
    float wMid = 0.4 * nv;
    float wDown = 0.3 * max(dot(nDown, v), 0.0);
    vec3 rUp = reflect(-v, nUp);
    rUp.y = max(abs(rUp.y), 0.003);
    vec3 rDown = reflect(-v, nDown);
    rDown.y = max(abs(rDown.y), 0.003);
    refl = (wUp * farRadiance(p, normalize(rUp), soft) + wMid * farRadiance(p, rd, soft) + wDown * farRadiance(p, normalize(rDown), soft)) / max(wUp + wMid + wDown, 1e-4);
  } else {
    // A little of it is no more than a softer mirror.
    refl = farRadiance(p, rd, soft + log2(1.0 + spread * 420.0));
  }
  // The face of the swell leans to the eye and looks up past the wall: it holds the open sky of the hour, and every small wave on it holds another part of it.
  if (lifted > 0.0) refl = mix(refl, skyRadiance(rd) * vec3(0.62, 0.66, 0.72), lifted * smoothstep(0.1, 0.3, rd.y));
  // From over the water the mirror looks up past the top of the wall: what it holds there is the sky, not the wall drawn out in straight lines.
  if (uLeave.x > 0.0) refl = mix(refl, skyRadiance(rd), uLeave.x * smoothstep(0.1, 0.3, rd.y));
  refl *= mix(vec3(0.78, 0.8, 0.84), vec3(0.8, 0.86, 0.95), smoothstep(8.0, 40.0, cameraPosition.y) * step(uPlateTone.w, 1.5));
  // Staged by shot: the far water of the shore shot lies under the shaded wall and the high sky, and is the colour of them.
  refl *= mix(vec3(1.0), uMirror.rgb, smoothstep(12.0, 90.0, away));
  // Under the long lens the wall's gold lies on the water in long broken streaks, and the water between them is dark.
  if (uPlateTone.w > 1.5) refl *= clamp(pow(max(dot(refl, vec3(0.3, 0.5, 0.2)), 1e-4) / 0.2, 0.7), 0.4, 1.5);
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

  // What lies under it. One water from the shore to the middle: a bed that lies knee-deep under the shelf, comes up to the crust of the lip
  // and falls away under it, lit from above through the water over it and seen through the water between it and the eye. The colour and the
  // dark of the lake are what that water takes from the light on the way, nowhere a second surface.
  vec3 rf = refract(-v, n, 0.752);
  float fall = max(-rf.y, 0.3);
  vec3 skyDown = skyIrradiance(vec3(0.0, 1.0, 0.0));
  vec3 under = vec3(0.0);
  float dry = 0.0;
  if (crusted > 0.0) {
    float depth = shelfDepthAt(p.xz, inShore, w);
    vec2 b = p.xz + rf.xz * (max(depth, 0.0) / fall);
    vec3 lip2 = lipNear(b, p.xz, lip);
    float w2 = lip2.x;
    float in2 = shoreIn(b);
    Bed bed = bedAt(b, lip2, in2, shelfDepthAt(b, in2, max(w2, 0.0)), away);
    // The shoal: the same bed, sunk. Its mats no longer lie in the surface, and the amber water over them takes their colour down to brown.
    float sunk = 3.2 * shoal * shoal + 0.9 * shoal;
    float depth2 = bed.depth + sunk;
    vec3 at = vec3(b.x, 0.0, b.y);
    float sun = sunAt(at);
    float open = skyOpen(at);
    vec3 bn = normalize(vec3(bed.tilt.x, 1.0, bed.tilt.y));
    vec3 e = skyDown * open + uSunColour * (sun * (max(dot(bn, normalize(vec3(uSunDir.x, uSunDir.y + 0.35, uSunDir.z))), 0.0) * 0.8 + bed.glow));
    // The light that reaches the bed has come through amber water: it is warm, whatever the sky.
    e = mix(e, dot(e, vec3(0.3, 0.5, 0.2)) * vec3(1.2, 1.0, 0.74), 0.65);
    vec3 lit = bed.albedo * e * (bed.occ / 3.14159);
    float d = max(depth2, 0.0);
    vec3 through = exp(-uAbsorb * d * (1.0 + 1.0 / fall));
    vec3 shelf = lit * through + uDeep * skyDown * open * 0.7 * (1.0 - through);
    under = shelf * crusted;
    // Where a slab, the crust of the lip or the top of a mat stands out of the water it is wet stone and weed, not a mirror.
    dry = bed.dry * crusted * exp(-sunk * 5.0);
    // A low eye that looks a long way along the water finds only the mirror: what stands a finger out of it far off is lost in the glance.
    dry *= mix(1.0, smoothstep(520.0, 220.0, away), smoothstep(12.0, 4.0, cameraPosition.y));
    dry *= 1.0 - smoothstep(600.0, 1000.0, away) * (1.0 - smoothstep(0.03, 0.07, v.y));
  }
  if (crusted < 1.0) {
    // Under the lip the bed falls away, steep and then steeper, ledge under ledge: pale rock, seen for as far down as the water lets the light go and come back.
    float inside = max(-shoalAt, 0.0) + 0.2;
    float down = 0.3 + 3.2 * rimEye + mix(1.7, 0.22, rimEye) * inside + mix(0.16, 0.004, rimEye) * inside * inside;
    vec2 b = p.xz + rf.xz * (min(down, 12.0) / fall) * 0.4;
    vec3 at = vec3(p.x, 0.0, p.z);
    // Out over the deep the whole sky is overhead: the land map's own count of it is coarse there and would draw its steps on the water.
    float open = mix(skyOpen(at), 0.92, smoothstep(4.0, 60.0, inside));
    // The low sun hardly enters the deep: what little does is the same everywhere, so the shade of the rim draws no edge on it.
    vec3 e = skyDown * open + uSunColour * 0.05;
    // Down to the rock from the sky overhead, and up again along the look.
    vec3 through = exp(-uAbsorb * mix(1.5, uClear, rimEye) * down * (1.0 + 1.0 / fall));
    vec3 deep = uDeep * skyDown * open * (1.0 - through);
    // Where no light comes back from the rock it is not looked for.
    if (through.b > 0.015) {
      Bed bed = wallAt(b, down, inside);
      deep += bed.albedo * e * (bed.occ / 3.14159) * through;
    }
    // What rises: a pale shape under the dome, never the whole of it.
    float du = clamp(r / (uDome.y * 0.8), 0.0, 1.0);
    float pale = clamp((uDome.x - 1.5) / 4.0, 0.0, 1.0) * (1.0 - du * du) * (0.55 + 0.45 * vnoise(p.xz / 9.0 + 3.0));
    deep += vec3(0.11, 0.12, 0.115) * skyDown * pale * (0.5 + 0.5 * smoothstep(0.1, 0.6, v.y));
    // Seen low, what comes up out of the shaft is green and blue: the warm of the evening does not go down there.
    deep *= mix(vec3(1.0), vec3(0.55, 0.84, 0.98), smoothstep(12.0, 4.0, cameraPosition.y));
    under += deep * (1.0 - crusted);
  }
  f *= 1.0 - dry;
  f *= mix(1.0, mix(0.03, 1.0, smoothstep(28.0, 120.0, away)), lowDeep * (1.0 - step(1.5, uPlateTone.w)));
  // The last metres before the shore are a finger deep: the eye goes through to the wet stones, and the mirror comes on in tongues, never at a line.
  float margin = inShore > 18.0 ? 1.0 : smoothstep(0.0, mix(2.0, 11.0, rimEye), inShore + mix(1.0, 7.0, rimEye) * (vnoise(p.xz / 5.3) - 0.5) + mix(0.3, 4.0, rimEye) * (vnoise(p.xz / 1.4 + 3.0) - 0.5));
  f *= mix(0.12, 1.0, margin);
  vec3 c = mix(under, refl, f);
  // The churned water is white in flecks, no finer than the pixels can hold, each in its own time.
  if (churn > 0.0) {
    float grain = max(0.5, 2.5 * covers);
    // Rafts of froth some metres long with lace in them, not a scatter of points.
    float raft = 0.6 * vnoise(p.xz / (9.0 * grain) + 40.0) + 0.4 * vnoise(p.xz / (3.2 * grain) + 7.0);
    raft *= 0.6 + 0.4 * sin(uTime * 0.9 + 6.28 * vnoise(p.xz / (14.0 * grain) + 3.0));
    float lace = 0.45 + 0.55 * smoothstep(0.3, 0.7, vnoise(p.xz / grain + 21.0));
    float foam = smoothstep(0.5, 0.78, raft + 0.3 * churn - 0.12) * lace * min(churn * 1.4, 1.0);
    c = mix(c, skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.8 / 3.14159), 0.75 * smoothstep(0.03, 0.4, v.y) * foam);
  }
  // The swell is wet in the last sun.
  if (lifted > 0.0) c += lifted * rigGlint(p, n, v, 0.12);
  // A low sun on moving water: a hard glitter where a wavelet turns its face to it.
  vec3 hv = normalize(uSunDir + v);
  float sharp = 1400.0 / (1.0 + away * away / 3600.0) + 60.0;
  float glint = pow(max(dot(n, hv), 0.0), sharp) * (sharp / 1400.0) * sunAt(vec3(p.x, 0.5, p.z));
  c += uSunColour * glint * 0.6 * (close + 0.3);
  // Seen from over it the white is a fleck, not a flower.
  c = mix(c, skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.8 / 3.14159), 0.6 * min(splash, 1.0) * smoothstep(0.35, 0.7, vnoise(p.xz / max(0.9, covers * 1.4) + vec2(uTime * 0.23, 7.0))) * mix(0.2, 1.0, smoothstep(0.6, 0.2, v.y)) * (1.0 - uLeave.x) * (1.0 - lifted));
  // A ring round a muzzle or a leg, seen low: the face that leans to the eye shows the dark under the water, the face that leans away the bright of the sky.
  float lap = tanh(22.0 * dot(lapped, normalize(v.xz)) * 0.08 / max(v.y, 0.04));
  c = c * (1.0 - 0.45 * max(lap, 0.0)) + skyRadiance(vec3(-v.x, 0.12, -v.z)) * (0.3 * max(-lap, 0.0));

  // The water from over its centre as the camera leaves. Straight down the mirror is almost gone and the eye is in the deep: the surface shows only by its light.
  if (uLeave.x > 0.0) {
    float downward = uLeave.x * smoothstep(0.3, 0.8, v.y);
    float lanes = vnoise(p.xz / 90.0 + 9.0);
    float along = vnoise(p.xz / 37.0 + 4.0);
    // How much water one pixel covers, in metres: no wave shorter than a few of them is drawn, so none can beat against the pixels.
    float covers = max(length(dFdx(p.xz)), length(dFdy(p.xz)));
    // Over the place where it went down the water lies smooth, a slick with a torn edge: the wind has no hold on it yet.
    float slick = smoothstep(0.0, 9.0, length((p.xz - vec2(9.0, -6.0)) * vec2(1.0, 1.5)) - 13.0 - 22.0 * along);
    // The wind lays a fine ripple on the rest, in patches. Two reads of the field of small waves, the second turned against the first, so that no row of them shows.
    float patches = smoothstep(0.3, 0.78, lanes + 0.5 * (along - 0.5)) * slick;
    float keepFine = smoothstep(4.0, 8.0, 1.15 / covers);
    float keepMid = smoothstep(4.0, 8.0, 2.1 / covers);
    vec2 ripple = keepMid * 0.6 * waveRead(tWave1, p.xz * 2.6, ${WAVE_TILES[1].toFixed(1)}, 0.0);
    if (keepFine > 0.0) ripple += keepFine * 0.6 * waveRead(tWave0, p.xz * 0.6, ${WAVE_TILES[0].toFixed(1)}, 0.0);
    ripple *= 0.075 * (0.12 + 0.88 * patches);
    // The face of a wave that looks at the lit cliffs takes their light, the face that looks away takes the dark of the east:
    // a crest is a bright line toward the sun with a dark one behind it.
    vec2 toSun = vec2(-0.9, 0.44);
    float crestLit = dot(slope, toSun);
    float rippleLit = dot(ripple, toSun);
    float face = clamp(30.0 * crestLit + 4.0 * rippleLit, -1.0, 1.0);
    c += uSunColour * vec3(0.0026, 0.0026, 0.003) * max(face, 0.0) * downward;
    c *= 1.0 - 0.4 * max(-face, 0.0) * downward;
    vec3 pale = skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.8 / 3.14159);
    // Where the wind has roughened it the water gives back more of the low sky and is paler for it, as a whole.
    float clump = vnoise(p.xz / 6.3 + vec2(uTime * 0.17, -uTime * 0.11));
    c = mix(c, pale, 0.05 * patches * (0.7 + 0.6 * clump) * downward);
    // The low sun itself is thrown only from the side of the frame that looks toward it: a path of small hard glints, no two alike, that thins to nothing away from it.
    float sunward = dot(-v.xz, toSun) / max(v.y, 0.3);
    float across = dot(-v.xz, vec2(toSun.y, -toSun.x)) / max(v.y, 0.3);
    float path = smoothstep(0.08, 0.7, sunward + 0.3 * (lanes - 0.5)) * exp(-across * across / 0.12);
    float steep = rippleLit * (0.15 + 1.5 * clump) + 3.0 * max(crestLit, 0.0);
    // Where the ripple is too fine for the pixels its glints are still there, as few and as uneven: they are drawn no smaller than the pixels can hold.
    if (keepMid < 1.0 && path > 0.0) steep += 0.3 * (1.0 - keepMid) * (0.12 + 0.88 * patches) * max(vnoise(p.xz / (2.4 * covers) + vec2(uTime * 0.9, -uTime * 0.7)) - 0.45, 0.0) * (0.15 + 1.5 * clump);
    float thrown = path * smoothstep(0.09, 0.22, steep * (0.4 + 0.9 * path));
    c += (0.5 * pale + uSunColour * 0.012) * thrown * thrown * downward;
    // Air comes up from what went down: a tight knot of froth that boils on the surface, spreads, thins and is gone. No two are alike and none is round.
    vec2 knotAt = p.xz / 34.0;
    vec2 knot = floor(knotAt);
    vec2 rnd = hash22(knot);
    if (rnd.x < 0.85 - r / 150.0) {
      float age = fract(uTime * (0.16 + 0.1 * rnd.y) + rnd.x * 17.0);
      vec2 dk = (knotAt - knot - 0.3 - 0.4 * rnd) * 34.0;
      float reach = 1.2 + 5.0 * age;
      float m = length(dk) + 0.9 * reach * (vnoise(dk * 0.45 + rnd * 40.0) - 0.5);
      if (m < reach) {
        // The froth is drawn no finer than the pixels can hold.
        float grain = max(0.28, 2.2 * covers);
        float froth = smoothstep(0.52, 0.74, vnoise(p.xz / grain + rnd * 91.0 + vec2(uTime * 0.6, 0.0)));
        float boil = froth * smoothstep(reach, 0.3 * reach, m) * smoothstep(0.0, 0.08, age) * (1.0 - age) * (1.0 - age);
        c = mix(c, pale * 0.9, min(0.85 * boil, 1.0) * downward);
      }
    }
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
  for (let i = 0; i < N; i++) {
    const a = ((i + 0.5) / N) * Math.PI * 2;
    const b = a / DEG;
    data[i * 4] = THREE.DataUtils.toHalfFloat(lipAt(a));
    // The same lip without the tongue that stands out beside the edge shot: drawn in for the wide shot, that tongue would be a step in the pool.
    data[i * 4 + 1] = THREE.DataUtils.toHalfFloat(lipAt(a) + 34 * smooth(LIP_BAY - 1.2, LIP_BAY + 2.6, b) * (1 - smooth(LIP_BAY + 5.5, LIP_BAY + 9.5, b)));
  }
  const t = new THREE.DataTexture(data, N, 1, THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Waves of these lengths (metres) as the shader wants them: turns a metre, turns a second, the speed the train travels at, the slope. */
function ringsOf(lengths: number[], slopes: number[], pace: number): THREE.Vector4[] {
  return lengths.map((length, i) => {
    const k = (2 * Math.PI) / length;
    const omega = Math.sqrt(9.81 * k + 7.4e-5 * k * k * k);
    return new THREE.Vector4(k, omega, (omega / k) * pace, slopes[i] as number);
  });
}

export function create(ctx: Context): Piece {
  const rig = ctx.rig.uniforms;
  const mirror = createMirror();
  const seed = ctx.rng('ripple');
  const ripple = rippleTexture(() => seed.next());
  const lip = lipTexture();
  const waveSeed = ctx.rng('waves');
  const waves = createWaves(() => waveSeed.next());
  const bed = bedUniforms(ctx, lip);
  const laps = Array.from({ length: LAPS }, () => new THREE.Vector4(0, 0, 0, 0));
  const dome = new THREE.Vector4(0, 60, 0, 0);
  const centre = new THREE.Vector4(-100, 0, 0, 0);
  const leave = new THREE.Vector4(0, 0, 0, 0);
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
      uLeave: { value: leave },
      ...waves.uniforms,
      uBreath: { value: new THREE.Vector4(0.0012, 0.0022, 0.004, 0) },
      uRing: { value: ringsOf([3.2, 6, 11, 21, 48, 97], [0.013, 0.012, 0.011, 0.011, 0.012, 0.012], 1) },
      uRiserRing: { value: ringsOf([1.1, 2.0, 3.6], [0.03, 0.03, 0.025], 0.8) },
      uLapRing: { value: ringsOf([0.28, 0.5, 0.9], [0.03, 0.035, 0.03], 0.75) },
      uRise: { value: ctx.events.rise },
      uRingsOn: { value: 1 },
      uClear: { value: 0.55 },
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
  // The climb out of the Eye is drawn with the water as it was: the same sheet, its old material, shown for that shot alone.
  const before = createBefore(ctx, mirror.uniforms);
  const surfaceBefore = new THREE.Mesh(surface.geometry, before.material);
  surfaceBefore.frustumCulled = false;
  surfaceBefore.visible = false;
  const waters = new THREE.Group();
  waters.add(surface, surfaceBefore);
  ctx.scene.add(ctx.parts.built('lake', waters));
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
      before.setTime(t);
      surfaceBefore.visible = during('eye-05');
      surface.visible = !surfaceBefore.visible;
      waves.setTime(t);
      const swell = smooth(rise - 1.9, rise - 0.1, t) * (1 - smooth(rise + 1.0, rise + 3.2, t));
      // The centre is never still: a low hump of water that breathes, and at the crest of the place it stands up.
      dome.x = 1.0 + 0.3 * Math.sin(t * 0.8) + 0.15 * Math.sin(t * 1.9 + 1) + 8.5 * swell * (1 + 0.05 * Math.sin(t * 2.3));
      dome.z = t;
      // The water round it is churned as it comes up, while it stands, and most as it goes down; then that dies in a few seconds.
      dome.w = Math.max(0.12, smooth(rise - 1.9, rise - 0.6, t) * (0.7 + 0.5 * smooth(rise + 1.0, rise + 2.2, t)) * (1 - smooth(rise + 3.0, rise + 7.5, t)));
      // Staged for the wide shot: the lip is drawn 270 m nearer the centre at the sides, so that the dark of the deep is an oval the frame holds whole.
      (material.uniforms.uLipIn as THREE.IUniform<number>).value = during('eye-01') ? 270 : 0;
      const mirrorTone = material.uniforms.uMirror as THREE.IUniform<THREE.Vector4>;
      if (during('eye-04')) mirrorTone.value.set(0.56, 0.78, 1.0, 0.3);
      else if (during('eye-05')) mirrorTone.value.set(0.76, 0.78, 0.8, 1);
      else if (during('eye-03')) mirrorTone.value.set(1.4, 1.26, 1.12, 1);
      else mirrorTone.value.set(1, 1, 1, 1);
      centre.x = t - rise;
      // The camera leaves: from the frame it begins to look down, the water is drawn as it is from over it.
      leave.set(during('eye-05') ? smooth(rise + LEAVE_FROM, rise + LEAVE_FROM + 1.2, t) : 0, t - (rise + 1.0), during('eye-05') ? 0 : 0, 0);
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
      (before.material.uniforms.uMirrorOn as THREE.IUniform<number>).value = on ? 1 : 0;
      if (!on) return;
      (material.uniforms.uLens as THREE.IUniform<number>).value = camera.projectionMatrix.elements[5] as number;
      (before.material.uniforms.uLens as THREE.IUniform<number>).value = camera.projectionMatrix.elements[5] as number;
      // Only what stands in or at the water is drawn into the mirror: the far world the water takes from the rig.
      hidden.length = 0;
      for (const o of ctx.scene.children) if (!reflected.includes(o)) hidden.push(o);
      mirror.render(renderer, ctx.scene, camera, hidden);
    },
    resize: (width, height) => mirror.resize(width, height),
    dispose: () => {
      mirror.dispose();
      before.dispose();
      waves.dispose();
      ripple.dispose();
      lip.dispose();
      surface.geometry.dispose();
      material.dispose();
      spike.dispose();
      (risers.material as THREE.ShaderMaterial).dispose();
    },
  };
}
