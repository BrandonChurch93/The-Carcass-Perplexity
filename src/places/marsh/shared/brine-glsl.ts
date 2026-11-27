// The look of the brine, shared by the brine's own surface and by the land, which draws the far channels itself (a channel three metres wide
// two kilometres out is thinner than the land's mesh can cut). Needs RIG_GLSL and a sampler `tGrain` (see land/tiles.ts) above it.
// The brine is a level mirror over a turbid red body. What it mirrors is a picture of the scene drawn small from under its own level before
// every sample (tMirror, brine/index.ts), so the sky, the stalks and the animals stand in it; how much of that picture shows is Fresnel's.
import { F, R } from './anchors';

const WIND = [R[0] * 0.8 + F[0] * 0.6, R[1] * 0.8 + F[1] * 0.6];
const CROSS = [-WIND[1], WIND[0]];
const v2 = (a: number[]): string => `vec2(${a[0].toFixed(4)}, ${a[1].toFixed(4)})`;

export const BRINE_GLSL = /* glsl */ `
// How much of the mirror shows. The surface is never still at the scale of a hair: the mirror is a soft one and never the whole of the
// light.
float mirrorShare(vec3 n, vec3 v) {
  float nv = clamp(dot(n, v), 0.0, 1.0);
  // Water's own law, held short of a whole mirror: the skin is never still at the scale of a hair. A slope that leans from the lens shows it
  // the sky and one that leans to it the red body, and that alone draws every ripple.
  return 0.02 + 0.21 * pow(1.0 - nv, 5.0);
}
// What a level wet surface at p mirrors, stained by the red film on it. A ripple swings the mirrored ray by twice its lean times the way to
// what it mirrors, which is not known, so a share of the way to the lens stands for it.
vec3 mirrorAt(vec3 p, vec3 n) {
  float away = length(cameraPosition - p);
  vec2 swing = n.xz * 2.0 * clamp(away * 0.22, 0.2, 14.0);
  vec4 q = uMirrorMatrix * vec4(p.x + swing.x, p.y, p.z + swing.y, 1.0);
  // Three ripples answer for a pixel, each swinging the ray its own way: what stands in the mirror is drawn out toward the lens and broken.
  vec4 q1 = uMirrorMatrix * vec4(p.x + swing.x * 2.3 - swing.y * 0.6, p.y, p.z + swing.y * 2.3 + swing.x * 0.6, 1.0);
  vec4 q2 = uMirrorMatrix * vec4(p.x - swing.x * 0.7 + swing.y * 0.8, p.y, p.z - swing.y * 0.7 - swing.x * 0.8, 1.0);
  vec3 seen = (textureLod(tMirror, clamp(q.xy / q.w, 0.003, 0.997), 0.0).rgb
    + textureLod(tMirror, clamp(q1.xy / q1.w, 0.003, 0.997), 0.0).rgb
    + textureLod(tMirror, clamp(q2.xy / q2.w, 0.003, 0.997), 0.0).rgb) / 3.0;
  // Far off, what stands in the mirror is smaller than the mirror's picture can hold (a bird there is one dark square): the mirror
  // gives way to the sky alone.
  vec3 d = (p - cameraPosition) / away;
  seen = mix(seen, skyRadiance(normalize(vec3(d.x + swing.x * 0.02, abs(d.y), d.z + swing.y * 0.02))) * 0.82, smoothstep(40.0, 95.0, away));
  return seen * vec3(1.0, 0.7, 0.66);
}
// How churned with mud the brine is here, 0 to 1: set by the brine's own surface where the big ones wade.
float brineMud = 0.0;
// How much of it is slurry, 0 to 1: grey brown with the mud of the thin crust stirred in, where the stuck one has worked its pocket.
float brineSlurry = 0.0;
// Set by the brine's own surface before it calls brineShade; the land's far channels leave them as they are.
// What the bed under the shallows looks like (its own picture of it), and where the silt has been carried to by the flow (0 to 1; under 0: not given).
vec3 brineBed = vec3(0.2, 0.13, 0.11);
float brineSilt = -1.0;
// The share of the surface that mirrors: Fresnel's law for water, held back, because the skin carries a film of scum and ripples too small
// to see, which turn part of it toward the lens: the mirror comes in late and never whole.
float brineFresnel(vec3 n, vec3 v) {
  float nv = max(dot(n, v), 0.02);
  // (Seen from high above, the fine ruffle on it turns a share of the skin to the sky: a lens low over it sees the body and the glints.)
  return 0.022 + 0.03 * smoothstep(0.22, 0.45, v.y) * smoothstep(3.0, 6.5, cameraPosition.y) + 0.015 * (1.0 - nv) + 0.2 * pow(1.0 - nv, 8.0);
}
// What the brine mirrors at p: the mirror's picture near the lens (so that the stalks, the banks and the animals stand in it), the sky alone far off.
// The film of scum on the skin stains it a little.
vec3 brineMirror(vec3 p, vec3 n, vec3 v) {
  float away = length(cameraPosition - p);
  vec2 swing = n.xz * 2.0 * clamp(away * 0.3, 0.15, 12.0);
  // (A slope that leans to the lens would mirror the brine before it, which mirrors the sky in its turn: it is not swung under the level.)
  vec2 toLens = normalize(cameraPosition.xz - p.xz);
  swing -= toLens * max(dot(swing, toLens), 0.0) * 0.75;
  vec4 q = uMirrorMatrix * vec4(p.x + swing.x, p.y, p.z + swing.y, 1.0);
  // Ripples finer than the lens can see answer for every pixel, each swinging the ray its own way: what stands in the mirror is soft,
  // never a sharp cut-out. (The mirror's picture is read some levels down, the same share of the frame at every size.)
  float soft = max(log2(float(textureSize(tMirror, 0).x) / 170.0), 0.0);
  vec3 seen = textureLod(tMirror, clamp(q.xy / q.w, 0.003, 0.997), soft).rgb;
  // (The air lies between the brine and what it mirrors too: what stands in the mirror is as pale as it stands over it.)
  seen = rigAir(seen, 3.0 + away * 0.8, 0.5);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y) + 0.02;
  return mix(seen, skyRadiance(normalize(r)) * 0.9, smoothstep(40.0, 95.0, away)) * vec3(1.0, 0.77, 0.71);
}
// s: metres to the shore, negative in the brine. n: the surface's normal (ripples and rings laid in by the caller). froth: the colour of the
// scum on top and how much of it there is.
// The brine is a clear dark liquid, not paint. Light goes into it, is taken by the red in it with every hand's breadth (Beer's law), and
// comes back from the bed where it is shallow and from the silt in it where it is deep. On top of that lies a mirror, by Fresnel's law.
// gx, gy: how p.xz falls across one pixel to the right and one up, taken by the caller of a varying before any branch of its own. The grain
// is read with them: a read that picks its own level under a branch (or after a discard) picks it from a fall that is not the same twice.
vec3 brineShade(vec3 p, vec3 n, vec3 v, float s, vec4 froth, vec2 gx, vec2 gy) {
  float foam = froth.a;
  float away = length(cameraPosition - p);
  // The bed as the land lays it (land/field.ts, flats): a shelf a finger under the level, then down a hand in every two strides.
  float depth = clamp(max(-s * 0.5 - 0.02, 0.03 * (1.0 - smoothstep(0.12, 0.27, s))), 0.0, 0.7);
  // Slow clouds of paler silt carried in it, drawn out along the flow where the caller knows the flow.
  float lod = log2(max(max(length(gx), length(gy)) * float(textureSize(tGrain, 0).x), 1e-6));
  float silt = textureLod(tGrain, p.xz / 23.0 + vec2(uTime * 0.0011, uTime * 0.0006), lod - ${Math.log2(23).toFixed(4)}).r;
  vec2 along = vec2(dot(p.xz, ${v2(F)}), dot(p.xz, ${v2(R)}));
  if (brineSilt >= 0.0) silt = mix(silt, brineSilt, 0.65);
  else silt = mix(silt, textureGrad(tGrain, vec2(along.x / 17.0 + uTime * 0.012, along.y / 5.0), vec2(dot(gx, ${v2(F)}) / 17.0, dot(gx, ${v2(R)}) / 5.0), vec2(dot(gy, ${v2(F)}) / 17.0, dot(gy, ${v2(R)}) / 5.0)).b, 0.5);
  // A light air crosses the basin in lanes some strides wide: where one passes, the skin is ruffled finer than a lens can see and gives
  // back more of the sky. Each lane wanders, swells and gives out.
  // (Only a lens that stands high over the brine sees the lanes so: from low over it they are lost in the glints, and are not looked up.)
  float aloft = smoothstep(3.0, 6.5, cameraPosition.y);
  float gust = 0.0;
  if (aloft > 0.0) {
    vec2 wind = vec2(dot(p.xz, ${v2(WIND)}) - 1.6 * uTime, dot(p.xz, ${v2(CROSS)}));
    vec4 wander = textureLod(tGrain, (p.xz - ${v2(WIND)} * (0.5 * uTime)) / 71.0, lod - ${Math.log2(71).toFixed(4)});
    wind.y += (wander.r - 0.5) * 9.0;
    vec2 wx = vec2(dot(gx, ${v2(WIND)}), dot(gx, ${v2(CROSS)}));
    vec2 wy = vec2(dot(gy, ${v2(WIND)}), dot(gy, ${v2(CROSS)}));
    gust = aloft * smoothstep(0.4, 0.68, textureGrad(tGrain, vec2(wind.x / 67.0, wind.y / 17.0), wx / vec2(67.0, 17.0), wy / vec2(67.0, 17.0)).g * 0.6 + textureGrad(tGrain, vec2(wind.x / 29.0 + 0.4 * uTime / 29.0, wind.y / 6.1 + 0.37), wx / vec2(29.0, 6.1), wy / vec2(29.0, 6.1)).b * 0.25 + wander.b * 0.15);
  }

  // The way light takes through the brine to the bed and back to the lens: down, and up along the bent line of sight.
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float upv = clamp(v.y, 0.05, 1.0);
  float path = depth * (1.0 + 1.0 / sqrt(1.0 - (1.0 - upv * upv) / 1.77));
  // What a metre of it takes of red, green and blue. The mud the big ones stir up takes all three.
  vec3 taken = vec3(3.4, 19.0, 23.0) * (0.75 + 0.5 * silt) + vec3(14.0) * brineMud + vec3(30.0) * brineSlurry;
  vec3 through = exp(-taken * path);
  // What the liquid itself gives back where no bed shows: a dark rust red, paler and browner where silt hangs in it.
  vec3 body = mix(vec3(0.038, 0.0085, 0.0065), vec3(0.072, 0.021, 0.016), smoothstep(0.25, 0.8, silt));
  body = mix(body, vec3(0.032, 0.0055, 0.0045), smoothstep(0.3, 0.7, depth) * 0.6);
  body = mix(body, vec3(0.045, 0.02, 0.014), brineMud * 0.85);
  body = mix(body, vec3(0.118, 0.086, 0.072) * (0.8 + 0.4 * silt), brineSlurry * 0.92);
  vec3 albedo = brineBed * through + body * (1.0 - through);
  albedo = mix(albedo, froth.rgb, foam);
  float open = skyOpen(p);
  // The body is lit from inside the liquid: the ripples do not shade it, they only turn the mirror. Froth stands on it and is lit as it leans.
  vec3 lit = albedo * skyIrradiance(normalize(mix(vec3(0.0, 1.0, 0.0), n, foam))) * (open / 3.14159);
  // Under a gust the skin is ruffled finer than a pixel and leans every way: seen from above, that lane gives back more of the sky than the
  // glass beside it. Broad pale lanes on dark brine.
  float fres = brineFresnel(n, v);
  fres = mix(fres, max(fres, 0.17), gust * (0.7 + 0.2 * smoothstep(8.0, 40.0, away)) * smoothstep(0.22, 0.45, v.y));
  // (Froth is wet too: each bubble carries its own small piece of the sky.)
  fres *= 1.0 - 0.55 * foam;
  // What stands over the brine and closes the sky also stands in the mirror; the mirror is not shaded twice.
  return lit * (1.0 - fres) + brineMirror(p, n, v) * fres * mix(1.0, open, 0.35);
}
// For a caller that has not taken the fall itself: it is taken here of the varying (never of p, which the caller set under its own branch).
vec3 brineShade(vec3 p, vec3 n, vec3 v, float s, vec4 froth) {
  return brineShade(p, n, v, s, froth, dFdx(vWorld.xz), dFdy(vWorld.xz));
}`;
