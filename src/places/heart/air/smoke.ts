// The smoke of the Heart: every body of smoke and every vapour, marched at a quarter of the frame's size before the scene is drawn, without the scene's depth.
// Each texel takes one of four offsets along its view, laid out two by two, and a tent filter over the result removes that pattern exactly: so every
// pixel of the filtered picture is a march four times as fine, with no grain at all. The volume pass lays the result into the air by depth.
// Two layers, near and far, each with the mean distance of its smoke and its spread, so that a thing standing between two smokes is hidden by one only.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { QUAD_VERTEX } from '../../../core/post';
import { RIG_GLSL } from '../shared/glsl';

export const MAX_STEAM = 16;
export const MAX_BODIES = 13;
/** March steps for each texel. Four texels with four offsets are averaged, so the march seen is four times as fine. */
export const SMOKE_STEPS = { body: 8, most: 11, reach: 14, steam: 6 };

export const SMOKE_FRAGMENT = /* glsl */ `
precision highp float;
precision highp sampler3D;
layout(location = 0) out highp vec4 oNear;
layout(location = 1) out highp vec4 oFar;
layout(location = 2) out highp vec4 oNearAt;
layout(location = 3) out highp vec4 oFarAt;
uniform mat4 uInvProjection;
uniform mat4 uCameraWorld;
uniform vec2 uSmokeFull;
uniform float uPhase;
uniform float uSplit;
uniform highp sampler3D tNoise;
uniform highp sampler3D tLumps;
uniform float uLumpsMean;
uniform vec3 uSkyMean;
uniform int uSteamCount;
uniform vec4 uSteamA[${MAX_STEAM}];
uniform vec4 uSteamB[${MAX_STEAM}];
uniform vec4 uSteamC[${MAX_STEAM}];
uniform int uBodyCount;
uniform vec4 uBodyA[${MAX_BODIES}];
uniform vec4 uBodyB[${MAX_BODIES}];
uniform vec4 uBodyC[${MAX_BODIES}];
uniform vec4 uBodyD[${MAX_BODIES}];
uniform vec4 uBodyE[${MAX_BODIES}];
uniform vec4 uBodyF[${MAX_BODIES}];
uniform vec4 uBodyG[${MAX_BODIES}];
${RIG_GLSL}

const vec3 STEAM_ALBEDO = vec3(0.88, 0.86, 0.84);
const vec3 SMOKE_ALBEDO = vec3(0.52, 0.46, 0.4);
const vec3 SKY_DIR = vec3(-0.58, 0.75, -0.29);
const vec2 SKY_SIDE = vec2(-0.895, -0.446);

vec4 noise(vec3 p) {
  return textureLod(tNoise, p, 0.0);
}
// The block the bodies are cut from (noise.ts, bakeLumps): r the billows, g and b their mean toward the sky near and far, a the fine billows.
vec4 lumps(vec3 p) {
  return textureLod(tLumps, p, 0.0);
}
// The fire's light as smoke hands it on (the same as the air's, volume.ts): orange, not the pink of pure red over a blue dusk.
vec3 fireOnSmoke(vec3 g) {
  return vec3(g.r, max(g.g, 0.3 * g.r), max(g.b, 0.12 * g.r)) * 1.2;
}

vec3 sumN = vec3(0.0);
float transN = 1.0;
vec4 atN = vec4(0.0);
vec3 sumF = vec3(0.0);
float transF = 1.0;
vec4 atF = vec4(0.0);
// One step of a march laid into its layer: the light, how much of the view it takes, where it is, and how far from the middle of its own body (the spread).
void lay(bool close, float t, float mid, vec3 light, float a) {
  if (close) {
    float w = transN * a;
    float d = t - mid;
    sumN += w * light;
    atN += w * vec4(t, 0.0, d * d, 1.0);
    transN *= 1.0 - a;
  } else {
    float w = transF * a;
    float d = (t - mid) * 0.01;
    sumF += w * light;
    atF += w * vec4(t * 0.01, 0.0, d * d, 1.0);
    transF *= 1.0 - a;
  }
}

// The round lights this view passes near enough to matter.
int nearLights[8];
int nearCount;
// The share of a round light that reaches a point, as the rig casts it on the ground: the square of the distance, then the fume takes it
// (half is left at 70 m and 1.5 radii, a sixteenth at twice that); a small light is the core of more open lava than its disc.
float lightShare(float d2, float r) {
  float reach = max(45.0 + 1.2 * r, 3.2 * r - 110.0);
  float q = (d2 + r * r) / (reach * reach);
  return r * r / (d2 + r * r) / (1.0 + q * q) * mix(4.5, 1.0, smoothstep(20.0, 60.0, r));
}
void findLights(vec3 ro, vec3 rd, float reach) {
  nearCount = 0;
  for (int i = 0; i < 8; i++) {
    if (i >= uEmitterCount) break;
    vec3 oc = uEmitters[i].xyz - ro;
    vec3 d = oc - rd * clamp(dot(oc, rd), 0.0, reach);
    if (lightShare(dot(d, d), uEmitters[i].w) > 0.004) { nearLights[nearCount] = i; nearCount++; }
  }
}
vec3 roundLights(vec3 p) {
  vec3 e = vec3(0.0);
  for (int k = 0; k < 8; k++) {
    if (k >= nearCount) break;
    int i = nearLights[k];
    vec3 d = uEmitters[i].xyz - p;
    e += uEmitterRadiance[i] * max(lightShare(dot(d, d), uEmitters[i].w) - 0.004, 0.0);
  }
  return e * 0.25 * uCast;
}
// The light of the sky on a point of smoke: low in the caldera it is the rig's fill, above the rim the open sky.
vec3 skyLight(float y) {
  return uSkyMean * mix(uFill, vec3(1.0), smoothstep(80.0, 380.0, y));
}

// A body of smoke: a leaning dome of lumps on a level base, wider with height if asked. 0 outside, up to 1 inside; above is the metres of the body over the point.
// A: x, z, radius at the base, height. B: lean in x and z (metres for each metre of height), seed, thickness for a metre.
// C: how strongly the lake lights it from below, to what height above its base, how strongly the round lights do, the height of its base.
// D: metres a second its lumps climb, how much wider its top is than its base, metres of one repeat of its lumps, how hard its edge is.
// E: its colour, and the share of its height over which it thins toward its foot.
// F: how strongly the whole glowing floor of the caldera lights it, to what height above its base, how much brighter than its body its sky-lit top is,
//    and how solid it is (1.4 is one mass with a lumpy skin, 0.6 is separate billows with gaps).
// G: how far its lumps are drawn out along its rise (1 is round, 2.5 is streaks), how fast it thins with height (0 not at all), how sparse its lumps are (0 as they come).
float bodyDensity(int i, vec3 p, out float above, out vec2 shade) {
  vec4 A = uBodyA[i];
  vec4 B = uBodyB[i];
  vec4 D = uBodyD[i];
  above = 0.0;
  shade = vec2(0.0);
  float yy = p.y - uBodyC[i].w;
  float u = yy / A.w;
  if (u < 0.0 || u >= 1.0) return 0.0;
  vec2 rel = p.xz - A.xy - B.xy * yy;
  float wide = A.z * (1.0 + D.y * u);
  // The push below moves a point by less than 0.45 of the width: what lies further out than that from the dome is empty, and is not read.
  float out0 = length(rel) / wide - 0.45;
  if (out0 > 0.0 && out0 * out0 + u * u >= 1.0) return 0.0;
  // Its outline is pushed in and out by slow drifts that climb with it: no body shows the dome it is made in.
  rel += (noise(vec3(rel.x, yy - D.x * uTime, rel.y) / (D.z * 1.7) + B.z * 1.3).ga - 0.5) * wide * 0.9;
  float d2 = dot(rel, rel) / (wide * wide);
  float dome = 1.0 - d2 - u * u;
  if (dome <= 0.0) return 0.0;
  above = A.w * sqrt(max(1.0 - d2, 0.0)) - yy;
  vec4 G = uBodyG[i];
  // The lumps climb with the body, in one read of the block. Two reads sheared against each other and cross faded (the middle of the column
  // overtaking its skin) cost a read at every pace of the widest body in the place and showed nothing in the length of a shot, and the fade
  // took the edge off every billow: one read keeps the block's own contrast, and the billow's edge is as hard as the block has it.
  vec3 q = vec3(rel.x, (yy - D.x * uTime) / G.x, rel.y) / D.z + B.z + vec3(0.026, 0.0, 0.015) * uTime;
  vec3 l = lumps(q).rgb;
  float g = uBodyF[i].w;
  // A body that is less solid is more of its lumps: they are drawn out the stronger, so that its outline is billows and not the dome.
  float gainOf = mix(2.6, 1.0, clamp(g, 0.0, 1.0));
  float lift = 0.5 + dome * g - (0.25 + 0.43 * g) - G.z;
  float body = (l.r - 0.5) * gainOf + lift;
  if (body > -0.25 && body < 0.5) body += (lumps(q * 2.3 + 0.37 + vec3(0.0, -0.02, 0.013) * uTime).r - 0.45) * 0.42;
  // What stands between the point and the sky, near (the billow's own top) and far (the mass over it): the block's means under the body's own threshold.
  // Half where the smoke toward the sky is as thick as the body's edge, none where it is clear, whole where it is deep: a billow's sky side is lit,
  // its far side is dark, and the turn between is as round as the billow.
  shade = clamp(0.5 + ((l.gb - 0.5) * gainOf + lift) * vec2(2.2, 1.6), 0.0, 1.0);
  float foot = uBodyE[i].w;
  // A body of separate billows still ends at its dome: softly, so that no outline of the dome is seen. A hard body ends in less room: its billows are its edge.
  return clamp(body * D.w, 0.0, 1.0) * smoothstep(0.0, mix(0.6, 0.22, clamp(g, 0.0, 1.0)) * min(1.0, 3.2 / D.w), dome) * (foot > 0.0 ? smoothstep(0.0, foot, u) : 1.0) * (G.y > 0.0 ? pow(1.0 - u, G.y) : 1.0);
}
// The renderer of the film draws four pixels at a time and runs every branch for all four, hidden or not: the march of a body or a vapour was paid
// once on every pixel for every one of them, met or not (a second and more a sample of the mouth's view). So what a view meets is listed first, by
// its bounds alone, and marched in a second loop that turns once for each thing on the list. This is the bounds of a body: the stretch of the view inside them.
bool bodySpan(int i, vec3 ro, vec3 rd, float far, out float t0, out float t1) {
  t0 = 0.0;
  t1 = far;
  vec4 A = uBodyA[i];
  vec4 B = uBodyB[i];
  if (B.w <= 0.0) return false;
  vec4 C = uBodyC[i];
  vec4 D = uBodyD[i];
  float oy = ro.y - C.w;
  vec2 oxz = ro.xz - A.xy - B.xy * oy;
  vec2 dxz = rd.xz - B.xy * rd.y;
  // The bounds hold the widest the body is, and the most its outline is pushed out.
  float reach = A.z * (1.0 + max(D.y, 0.0)) * 1.45;
  float qa = dot(dxz, dxz);
  float qb = dot(oxz, dxz);
  float qc = dot(oxz, oxz) - reach * reach;
  if (qa > 1e-8) {
    float qh = qb * qb - qa * qc;
    if (qh < 0.0) return false;
    qh = sqrt(qh);
    t0 = max(t0, (-qb - qh) / qa);
    t1 = min(t1, (-qb + qh) / qa);
  } else if (qc > 0.0) return false;
  if (abs(rd.y) > 1e-5) {
    float ya = -oy / rd.y;
    float yb = (A.w - oy) / rd.y;
    t0 = max(t0, min(ya, yb));
    t1 = min(t1, max(ya, yb));
  } else if (oy < 0.0 || oy > A.w) return false;
  if (t1 <= t0) return false;
  // A body that widens upward is narrow where the view meets it low: the bounds are drawn in to the widest it is over the heights the view crosses.
  if (D.y > 0.0 && qa > 1e-8) {
    float top = clamp(max(oy + rd.y * t0, oy + rd.y * t1) / A.w, 0.0, 1.0);
    float less = A.z * (1.0 + D.y * top) * 1.45;
    float qh = qb * qb - qa * (dot(oxz, oxz) - less * less);
    if (qh < 0.0) return false;
    qh = sqrt(qh);
    t0 = max(t0, (-qb - qh) / qa);
    t1 = min(t1, (-qb + qh) / qa);
    if (t1 <= t0) return false;
  }
  return true;
}

void bodyOne(int i, vec3 ro, vec3 rd, float t0, float t1, float jitter) {
  vec4 A = uBodyA[i];
  vec4 B = uBodyB[i];
  vec4 C = uBodyC[i];
  vec4 D = uBodyD[i];
  vec4 E = uBodyE[i];
  vec4 F = uBodyF[i];
  float mid = 0.5 * (t0 + t1);
  bool close = mid < uSplit;
  // A long way through a body of small lumps is taken in more paces, so that the lumps are met and not stepped over.
  float count = clamp(ceil((t1 - t0) / (0.2 * D.z)), float(${SMOKE_STEPS.body}), float(${SMOKE_STEPS.most}));
  float dt = (t1 - t0) / count;
  float through = 1.0;
  vec3 wide = F.x > 0.0 ? 4.0 * lakeGlow(A.xy + B.xy * 0.4 * A.w, 450.0) : vec3(0.0);
  vec4 G = uBodyG[i];
  // The paces are long (a fifth of a repeat at best) and each begins at a chance place in its length, so the face of the body was met anywhere in
  // a pace and its billows were averaged away: every body had a soft edge. Now the first pace that finds smoke is taken again from a quarter past
  // the last empty place in quarter paces, which lengthen as they go in: the face is found to a quarter of a pace and lit as what it is, and the
  // depth behind it, which is seen through it or not at all, is walked as before. The paces left always reach the far bound.
  float t = t0 + jitter * dt;
  float pace = dt;
  bool met = false;
  for (int k = 0; k < ${SMOKE_STEPS.reach}; k++) {
    if (t >= t1) break;
    pace = max(pace, (t1 - t) / float(${SMOKE_STEPS.reach} - k));
    vec3 p = ro + rd * t;
    float above;
    // Its own shade: what of it stands between the point and the sky, near and far. It comes with the thickness, in the same reads.
    vec2 shade;
    float dens = bodyDensity(i, p, above, shade);
    if (dens <= 0.0) {
      t += pace;
      continue;
    }
    if (!met) {
      met = true;
      if (k > 0) {
        t -= 0.75 * dt;
        pace = 0.25 * dt;
        continue;
      }
    }
    float skyward = shade.x;
    float skyT = exp(-B.w * 2.0 * above);
    // The top of each billow is open to the sky and its underside is not: the lumps read as lumps.
    // And the side of the whole body that faces the brighter west of the sky is paler than the side that faces away.
    vec2 off = (p.xz - A.xy - B.xy * (p.y - C.w)) / (A.z * (1.0 + D.y * clamp((p.y - C.w) / A.w, 0.0, 1.0)));
    float flank = clamp(0.5 + 0.5 * dot(off, SKY_SIDE), 0.0, 1.0);
    // A billow under the mass of others is darker again than one that is only turned from the sky: the creases of the body go deep.
    vec3 light = skyLight(p.y) * F.z * (0.2 + 0.75 * (1.0 - skyward) * (1.0 - 0.6 * shade.y) + 0.25 * skyT) * mix(0.9, 1.3, flank);
    // Lit from below: the open lava under it, the whole glowing floor round it, and the round lights where it stands by them. Its underside takes it, its top does not.
    // The lowest metres take the least: the crust right under them is dark, and it is the smoke a little higher that sees the open lava all round.
    float up = p.y - C.w;
    // A sheet that lies on the lake is all low: it is lit through.
    // A body whose floor light is held low takes it from its first metres: its glow stays under the dark of its upper smoke.
    float rise = 1.0 - 0.95 * exp(-up / min(10.0, F.y)) * smoothstep(8.0, 20.0, A.w);
    // What of the body stands under the point is guessed from how it thickens downward: the underside of a billow takes the fire, its top is shaded from it by its own mass.
    float under = mix(1.35, 0.3, clamp(2.0 * dens - skyward, 0.0, 1.0));
    vec3 fire = under * rise * exp(-up / C.y) * (C.x > 0.0 ? C.x * 5.0 * lakeGlow(p.xz, max(60.0, 2.0 * p.y)) : vec3(0.0));
    fire += under * F.x * rise * exp(-up / F.y) * (0.35 + 0.65 * (1.0 - skyT)) * wide;
    // G.w: a body that stands over open lava is lit through its own foot. Each metre of it takes its share of the fire on the way up, so that its
    // base burns orange and its upper smoke is dark against it, lump by lump, and it is never one flat colour.
    if (G.w > 0.0) fire *= exp(-G.w * B.w * up * (0.4 + 1.2 * dens));
    light += fireOnSmoke(fire);
    if (C.z > 0.0) light += C.z * roundLights(p) * (0.4 + 0.6 * skyT);
    float a = 1.0 - exp(-dens * B.w * pace);
    lay(close, t, mid, E.rgb * light, a);
    through *= 1.0 - a;
    if (through < 0.015) break;
    t += pace;
    pace = min(pace * 1.5, dt);
  }
}

// One of the vapours the other folders ask for: a column that widens and thins as it rises and bends with the wind.
// The bounds of a column of vapour (see bodySpan).
bool steamSpan(int i, vec3 ro, vec3 rd, float far, out float t0, out float t1) {
  t0 = 0.0;
  t1 = far;
  vec4 A = uSteamA[i];
  vec4 B = uSteamB[i];
  vec4 C = uSteamC[i];
  float rise = B.z;
  vec3 lean = vec3(B.x, 1.0, B.y);
  float kind = min(C.w, 1.0);
  float spread = mix(0.34, 0.3, kind);
  // Steam is gone well before its top and smoke a little before: the bounds stop where there is nothing left to see.
  float top = rise * mix(0.92, 0.86, kind);
  // Bounds: in the space where the column stands upright it is inside a round tower.
  float shear = mix(0.6, 1.2, kind);
  vec3 o = ro - A.xyz;
  vec2 oxz = o.xz - B.xy * shear * o.y;
  vec2 dxz = rd.xz - B.xy * shear * rd.y;
  // The tower is wider than anything the column does, and the column thins to nothing well inside it: no view shows the side of the tower as a straight edge.
  float tower = 1.25 * (1.4 * (A.w + top * spread) + rise * mix(0.12, 0.16, kind) * length(B.xy) + (A.w * 0.3 + top * 0.125));
  float qa = dot(dxz, dxz);
  float qb = dot(oxz, dxz);
  float qc = dot(oxz, oxz) - tower * tower;
  if (qa > 1e-8) {
    float qh = qb * qb - qa * qc;
    if (qh < 0.0) return false;
    qh = sqrt(qh);
    t0 = max(t0, (-qb - qh) / qa);
    t1 = min(t1, (-qb + qh) / qa);
  } else if (qc > 0.0) return false;
  if (abs(rd.y) > 1e-5) {
    float ya = -o.y / rd.y;
    float yb = (top - o.y) / rd.y;
    t0 = max(t0, min(ya, yb));
    t1 = min(t1, max(ya, yb));
  } else if (o.y < 0.0 || o.y > top) return false;
  if (t1 <= t0) return false;
  return true;
}

void steamOne(int i, vec3 ro, vec3 rd, float t0, float t1, float jitter) {
  vec4 A = uSteamA[i];
  vec4 B = uSteamB[i];
  vec4 C = uSteamC[i];
  float rise = B.z;
  vec3 lean = vec3(B.x, 1.0, B.y);
  float kind = min(C.w, 1.0);
  float spread = mix(0.34, 0.3, kind);
  // Steam is gone well before its top and smoke a little before: the bounds stop where there is nothing left to see.
  float top = rise * mix(0.92, 0.86, kind);
  float shear = mix(0.6, 1.2, kind);
  float tower = 1.25 * (1.4 * (A.w + top * spread) + rise * mix(0.12, 0.16, kind) * length(B.xy) + (A.w * 0.3 + top * 0.125));
  float mid = 0.5 * (t0 + t1);
  bool close = mid < uSplit;
  vec3 albedo = mix(STEAM_ALBEDO, SMOKE_ALBEDO, kind);
  // How much of the fire under it a vapour takes, and to what height: steam is white and takes a great deal close over its crack, smoke less and higher.
  float lit = mix(2.6, 1.5, kind);
  float fall = mix(9.0, 5.0, kind);
  float dt = (t1 - t0) / float(${SMOKE_STEPS.steam});
  for (int k = 0; k < ${SMOKE_STEPS.steam}; k++) {
    float t = t0 + (float(k) + jitter) * dt;
    vec3 p = ro + rd * t;
    float h = p.y - A.y;
    float u = h / rise;
    if (u < 0.0 || u > 1.0) continue;
    vec2 centre = A.xz + B.xy * h * mix(0.3 + 0.6 * u, 0.45 + 1.1 * u, kind);
    float r = A.w + h * spread;
    float sway = A.w * 0.6 + h * 0.25;
    vec2 away = p.xz - centre;
    float most = 1.4 * r + 0.5 * sway;
    if (dot(away, away) >= most * most) continue;
    // Puffs leave the vent unevenly and carry their sideways curl up with them: the pattern rides the flow, a puff of steam every second and a half, of smoke every four.
    vec4 w = noise(vec3(C.x, (h - C.y * uTime) / (mix(1.5, 4.0, kind) * C.y), C.x * 1.7 + 0.5 * u));
    centre += (w.ga - 0.5) * sway;
    float puff = mix(mix(0.2, 1.7, smoothstep(0.3, 0.62, w.r)), mix(0.55, 1.35, smoothstep(0.3, 0.62, w.r)), kind);
    float d = length(p.xz - centre) / r;
    if (d >= 1.4) continue;
    vec3 q = p - A.xyz;
    q -= lean * (C.y * uTime);
    q = q / C.z + C.x + vec3(0.013, 0.0, 0.007) * uTime;
    // Steam is drawn out along its rise into strands; smoke is round lumps.
    q.y *= mix(0.42, 1.0, kind);
    // Its outline is ragged by the same lumps that fill it; it is thick at the vent, thinned by its own widening, and gone well before the top.
    float n1 = noise(q).r;
    vec4 small = noise(q * 3.7);
    float ragged = d + (n1 - 0.5) * mix(1.0, 1.1, kind) + (small.g - 0.5) * 0.35;
    if (ragged >= 1.0) continue;
    float thin = A.w / r;
    float body = (1.0 - smoothstep(0.2, 1.0, ragged)) * smoothstep(0.0, 0.05, u) * pow(1.0 - u, mix(3.2, 1.7, kind)) * mix(1.0, thin, 0.6);
    float fine = mix(0.5, 0.25, u);
    float wisps = smoothstep(mix(0.36, 0.48, kind), mix(0.82, 0.74, kind), n1 * (1.0 - fine) + small.b * fine);
    // Steam is a veil with knots in it; smoke is lumps with gaps between them.
    vec2 off = (p.xz - A.xz) - B.xy * shear * h;
    float inside = (1.0 - smoothstep(0.55, 0.9, length(off) / tower)) * (1.0 - smoothstep(0.75 * top, 0.97 * top, h));
    // Steam was the same lumps as smoke, thinner: a soft pale blob. It is strands: the thin sheets where the drawn-out field crosses its own
    // middle, which stand as curling threads when looked through, broken along their length by the fine field, with next to nothing between them.
    float strand = smoothstep(0.72, 0.97, 1.0 - abs(2.0 * n1 - 1.0) * 1.4) * smoothstep(0.25, 0.6, small.b);
    float dens = body * puff * inside * mix(0.008 + 1.7 * strand + 0.35 * wisps * wisps, 4.0 * wisps, kind);
    if (dens <= 0.0) continue;
    // A fountain, a pool or a crack lights the vapour that is close over it; the rest is lit by the sky, like any smoke.
    // The top of a smoke is thin and open to the sky: it is paler than its foot.
    // A vapour that stands over open melt is seen against its fire: what the sky gives it is the lesser part, and it is orange and not pale.
    vec3 below = lakeGlow(p.xz, max(1.2 * h, 2.5));
    float hot = smoothstep(0.012, 0.15, below.r);
    // Steam off a vent in cold rock is white and thick where it leaves the vent, and a veil the rock is seen through above that. Over melt it is thin and the fire shows through it.
    float vent = 1.0 + 2.2 * pow(1.0 - u, 3.0);
    float sigma = dens * B.w * mix(mix(vent, 1.0, hot), 1.0, kind);
    vec3 light = mix(1.05, mix(0.8, 1.5, u), kind) * skyLight(p.y) * (1.0 - 0.35 * min(dens, 1.0)) * (1.0 - 0.5 * hot);
    float near = max(lit * exp(-h / fall) - 0.03, 0.0);
    // And the lava beside it: a vapour two paces from a channel stood grey against it. What lies within a few metres all round lights it as well,
    // less than what lies under it, and to the same height.
    // A vent in the rock of the bank stands over no lava and takes none of this: it is pale. Only a vapour whose foot is on the lake does.
    float onLake = smoothstep(2.0, 0.6, A.y);
    if (near > 0.0) light += near * fireOnSmoke(mix(0.45, 0.17, kind) * below + (onLake > 0.0 ? onLake * mix(0.3, 0.2, kind) * lakeGlow(p.xz, max(3.0 * h, 8.0)) : vec3(0.0)) + roundLights(p));
    float a = 1.0 - exp(-sigma * dt);
    lay(close, t, mid, albedo * light, a);
  }
}

// A vapour whose foot is on the lake stands as no column: the heat of the crust is spent in its first metre and the low wind lays it down. It leaves
// its crack in uneven puffs and is carried off along the ground as a trail that widens, lifts a little and thins, and the fire under it lights it:
// orange over open melt, a dim brown veil over dark crust. As an upright white strand lit by the sky it read cool against the place.
// A: its foot and the radius of it. B: the wind along the ground (x, z, a unit), the metres its trail runs, thickness for a metre.
// C: seed, metres a second it is carried, metres of one of its lumps, 3.
const vec3 GROUND_ALBEDO = vec3(0.5, 0.42, 0.37);
// Keeps of a stretch of a view (t0 to t1) the part where f0 + t * f1 is not below zero.
void clipTo(float f0, float f1, inout float t0, inout float t1) {
  float t = -f0 / (abs(f1) < 1e-6 ? 1e-6 : f1);
  if (f1 >= 1e-6 || abs(f1) < 1e-6) t0 = max(t0, t);
  else t1 = min(t1, t);
}
bool groundSpan(int i, vec3 ro, vec3 rd, float far, out float t0, out float t1) {
  t0 = 0.0;
  t1 = far;
  vec4 A = uSteamA[i];
  vec4 B = uSteamB[i];
  float len = B.z;
  float top = 0.61 + 1.52 * A.w + 0.183 * len;
  // Bounds: the wedge of the lake that holds the trail with all its swing (it opens downwind from the foot), and the slab of air it lies in.
  // Every pixel inside the bounds pays for the whole march, so they are drawn close.
  vec2 side = vec2(-B.y, B.x);
  vec2 oxz = ro.xz - A.xz;
  float s0 = dot(oxz, B.xy);
  float s1 = dot(rd.xz, B.xy);
  float c0 = dot(oxz, side);
  float c1 = dot(rd.xz, side);
  clipTo(s0 + A.w, s1, t0, t1);
  clipTo(len - s0, -s1, t0, t1);
  clipTo(3.4 * A.w + 0.65 * s0 - c0, 0.65 * s1 - c1, t0, t1);
  clipTo(3.4 * A.w + 0.65 * s0 + c0, 0.65 * s1 + c1, t0, t1);
  clipTo(ro.y, rd.y, t0, t1);
  clipTo(top - ro.y, -rd.y, t0, t1);
  return t1 > t0;
}

void groundOne(int i, vec3 ro, vec3 rd, float t0, float t1, float jitter) {
  vec4 A = uSteamA[i];
  vec4 B = uSteamB[i];
  vec4 C = uSteamC[i];
  float len = B.z;
  vec2 side = vec2(-B.y, B.x);
  float mid1 = 0.5 * (t0 + t1);
  bool close = mid1 < uSplit;
  float dt = (t1 - t0) / float(${SMOKE_STEPS.steam});
  for (int k = 0; k < ${SMOKE_STEPS.steam}; k++) {
    float t = t0 + (float(k) + jitter) * dt;
    vec3 p = ro + rd * t;
    float h = p.y;
    vec2 rel = p.xz - A.xz;
    float s = dot(rel, B.xy);
    float u = (s + A.w) / (len + A.w);
    if (u <= 0.0 || u >= 1.0) continue;
    float out1 = max(s, 0.0);
    // The gusts that leave the crack ride the wind, and each carries its own swing and its own lift with it: the pattern travels, it does not swell in place.
    vec4 w = noise(vec3(C.x, (s - C.y * uTime) / 11.0, C.x * 1.7 + 0.04 * s));
    float wide = 1.7 * A.w + 0.3 * out1;
    float c = dot(rel, side) - (w.g - 0.5) * (1.2 * A.w + 0.55 * out1);
    float roof = (0.3 + 0.75 * A.w + 0.09 * out1) * (0.55 + 0.9 * w.a);
    if (abs(c) >= 1.25 * wide || h >= 1.4 * roof) continue;
    vec3 q = vec3(s - C.y * uTime, 2.2 * h + 0.35 * s, c) / C.z + C.x;
    float n1 = noise(q).r;
    vec4 small = noise(q * 3.3 + 0.37);
    float edge = abs(c) / wide + (n1 - 0.5) * 0.9 + (small.g - 0.5) * 0.3;
    float lid = h / roof + (small.a - 0.5) * 0.5 + (n1 - 0.5) * 0.3;
    if (edge >= 1.0 || lid >= 1.0) continue;
    float shape = (1.0 - smoothstep(0.25, 1.0, edge)) * (1.0 - smoothstep(0.35, 1.0, lid));
    float wisps = smoothstep(0.34, 0.72, n1 * 0.6 + small.b * 0.4);
    float puff = mix(0.3, 1.45, smoothstep(0.3, 0.62, w.r));
    // It thins as it widens and is gone before the end of its run.
    float dens = shape * (0.2 + 1.1 * wisps) * puff * smoothstep(0.0, 0.08, u) * pow(1.0 - u, 1.3) * mix(1.0, 1.7 * A.w / wide, 0.75);
    if (dens <= 0.0) continue;
    // The fire under it and round it: what is open within a few metres of the point, most where it lies low.
    vec3 below = lakeGlow(p.xz, 2.5 + 1.5 * h);
    vec3 light = skyLight(h) * (0.85 - 0.3 * min(dens, 1.0));
    light += fireOnSmoke((0.7 + 1.4 * exp(-h / 2.5)) * below + 0.8 * roundLights(p));
    float a = 1.0 - exp(-dens * B.w * dt);
    lay(close, t, mid1, GROUND_ALBEDO * light, a);
  }
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSmokeFull;
  vec4 view = uInvProjection * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
  vec3 ro = uCameraWorld[3].xyz;
  vec3 rd = normalize((uCameraWorld * vec4(view.xyz / view.w, 1.0)).xyz - ro);
  // The lake is the floor under every smoke: a view that goes down stops there.
  float far = rd.y < -1e-4 ? ro.y / -rd.y : 30000.0;
  // Four offsets, two by two, with the two of a row half a step apart: the tent filter that follows averages the four.
  ivec2 px = ivec2(gl_FragCoord.xy) & 1;
  float order = px.y == 0 ? (px.x == 0 ? 0.0 : 2.0) : (px.x == 0 ? 3.0 : 1.0);
  float jitter = (order + uPhase) * 0.25;
  findLights(ro, rd, min(far, 3400.0));
  // What this view meets, in the order it is laid: the vapours, then the bodies.
  int listed[${MAX_STEAM}];
  vec2 spans[${MAX_STEAM}];
  int count = 0;
  for (int i = 0; i < ${MAX_STEAM}; i++) {
    if (i >= uSteamCount) break;
    float t0;
    float t1;
    bool low = uSteamC[i].w > 2.5;
    bool hit = groundSpan(i, ro, rd, far, t0, t1);
    float u0;
    float u1;
    bool hitColumn = steamSpan(i, ro, rd, far, u0, u1);
    if (low ? hit : hitColumn) {
      listed[count] = i;
      spans[count] = low ? vec2(t0, t1) : vec2(u0, u1);
      count++;
    }
  }
  for (int j = 0; j < count; j++) {
    int i = listed[j];
    if (uSteamC[i].w > 2.5) groundOne(i, ro, rd, spans[j].x, spans[j].y, fract(jitter + 0.618 * float(i + 1)));
    else steamOne(i, ro, rd, spans[j].x, spans[j].y, fract(jitter + 0.618 * float(i + 1)));
  }
  count = 0;
  for (int i = 0; i < ${MAX_BODIES}; i++) {
    if (i >= uBodyCount) break;
    float t0;
    float t1;
    if (bodySpan(i, ro, rd, far, t0, t1)) {
      listed[count] = i;
      spans[count] = vec2(t0, t1);
      count++;
    }
  }
  for (int j = 0; j < count; j++) {
    int i = listed[j];
    bodyOne(i, ro, rd, spans[j].x, spans[j].y, fract(jitter + 0.382 * float(i + 1)));
  }
  oNear = vec4(sumN, transN);
  oFar = vec4(sumF, transF);
  oNearAt = atN;
  oFarAt = atF;
}`;

// The tent: four filtered reads half a texel out on the diagonals are the nine texels round this one, weighted 1 2 1 each way.
const TENT_FRAGMENT = /* glsl */ `
precision highp float;
layout(location = 0) out highp vec4 oNear;
layout(location = 1) out highp vec4 oFar;
layout(location = 2) out highp vec4 oNearAt;
layout(location = 3) out highp vec4 oFarAt;
uniform sampler2D tNear;
uniform sampler2D tFar;
uniform sampler2D tNearAt;
uniform sampler2D tFarAt;
uniform vec2 uSmokeSize;
vec4 tent(sampler2D t, vec2 uv, vec2 h) {
  return 0.25 * (texture(t, uv + h) + texture(t, uv - h) + texture(t, uv + vec2(h.x, -h.y)) + texture(t, uv + vec2(-h.x, h.y)));
}
void main() {
  vec2 uv = gl_FragCoord.xy / uSmokeSize;
  vec2 h = 0.5 / uSmokeSize;
  oNear = tent(tNear, uv, h);
  oFar = tent(tFar, uv, h);
  oNearAt = tent(tNearAt, uv, h);
  oFarAt = tent(tFarAt, uv, h);
}`;

export interface Smoke {
  /** The uniforms of the march: the lists of bodies and vapours are set here. */
  readonly uniforms: Record<string, THREE.IUniform>;
  /** What the volume reads: the two layers and where each is. */
  readonly layers: { tSmokeNear: THREE.IUniform; tSmokeFar: THREE.IUniform; tSmokeNearAt: THREE.IUniform; tSmokeFarAt: THREE.IUniform; uSmokeFit: THREE.IUniform };
  render(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, phase: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export function createSmoke(rig: Record<string, THREE.IUniform>, noise: THREE.Data3DTexture, lumps: { texture: THREE.Data3DTexture; mean: number }, skyMean: THREE.Vector3): Smoke {
  const target = (): THREE.WebGLRenderTarget => {
    const t = new THREE.WebGLRenderTarget(4, 4, {
      count: 4,
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
      colorSpace: THREE.NoColorSpace,
    });
    for (const x of t.textures) {
      x.wrapS = THREE.ClampToEdgeWrapping;
      x.wrapT = THREE.ClampToEdgeWrapping;
    }
    return t;
  };
  const raw = target();
  const clean = target();
  const size = new THREE.Vector2(4, 4);
  // The frame in quarter texels (not whole), and the share of the texture it fills.
  const full = new THREE.Vector2(4, 4);
  const fit = new THREE.Vector2(1, 1);
  const vectors = (n: number): THREE.Vector4[] => Array.from({ length: n }, () => new THREE.Vector4());
  const uniforms: Record<string, THREE.IUniform> = {
    ...rig,
    tNoise: { value: noise },
    tLumps: { value: lumps.texture },
    uLumpsMean: { value: lumps.mean },
    uInvProjection: { value: new THREE.Matrix4() },
    uCameraWorld: { value: new THREE.Matrix4() },
    uSmokeFull: { value: full },
    uPhase: { value: 0 },
    uSplit: { value: 110 },
    uSkyMean: { value: skyMean },
    uSteamCount: { value: 0 },
    uSteamA: { value: vectors(MAX_STEAM) },
    uSteamB: { value: vectors(MAX_STEAM) },
    uSteamC: { value: vectors(MAX_STEAM) },
    uBodyCount: { value: 0 },
    uBodyA: { value: vectors(MAX_BODIES) },
    uBodyB: { value: vectors(MAX_BODIES) },
    uBodyC: { value: vectors(MAX_BODIES) },
    uBodyD: { value: vectors(MAX_BODIES) },
    uBodyE: { value: vectors(MAX_BODIES) },
    uBodyF: { value: vectors(MAX_BODIES) },
    uBodyG: { value: vectors(MAX_BODIES) },
  };
  const pass = (fragmentShader: string, u: Record<string, THREE.IUniform>): THREE.ShaderMaterial =>
    new THREE.ShaderMaterial({ vertexShader: QUAD_VERTEX, fragmentShader, uniforms: u, glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: false });
  const march = pass(SMOKE_FRAGMENT, uniforms);
  const tent = pass(TENT_FRAGMENT, {
    tNear: { value: raw.textures[0] },
    tFar: { value: raw.textures[1] },
    tNearAt: { value: raw.textures[2] },
    tFarAt: { value: raw.textures[3] },
    uSmokeSize: { value: size },
  });
  const quad = new FullScreenQuad();
  return {
    uniforms,
    layers: { tSmokeNear: { value: clean.textures[0] }, tSmokeFar: { value: clean.textures[1] }, tSmokeNearAt: { value: clean.textures[2] }, tSmokeFarAt: { value: clean.textures[3] }, uSmokeFit: { value: fit } },
    render: (renderer, camera, phase) => {
      camera.updateMatrixWorld();
      (uniforms.uInvProjection as THREE.IUniform<THREE.Matrix4>).value.copy(camera.projectionMatrixInverse);
      (uniforms.uCameraWorld as THREE.IUniform<THREE.Matrix4>).value.copy(camera.matrixWorld);
      (uniforms.uPhase as THREE.IUniform<number>).value = phase;
      const before = renderer.getRenderTarget();
      renderer.setRenderTarget(raw);
      quad.material = march;
      quad.render(renderer);
      renderer.setRenderTarget(clean);
      quad.material = tent;
      quad.render(renderer);
      renderer.setRenderTarget(before);
    },
    resize: (width, height) => {
      const w = Math.max(4, Math.ceil(width / 4));
      const h = Math.max(4, Math.ceil(height / 4));
      full.set(width / 4, height / 4);
      fit.set(width / (4 * w), height / (4 * h));
      if (raw.width === w && raw.height === h) return;
      raw.setSize(w, h);
      clean.setSize(w, h);
      size.set(w, h);
    },
    dispose: () => {
      raw.dispose();
      clean.dispose();
      march.dispose();
      tent.dispose();
      quad.dispose();
    },
  };
}
