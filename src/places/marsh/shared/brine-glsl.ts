// The look of the brine, shared by the brine's own surface and by the land, which draws the far channels itself (a channel three metres wide
// two kilometres out is thinner than the land's mesh can cut). Needs RIG_GLSL and a sampler `tGrain` (see land/tiles.ts) above it.
// The brine is a level mirror over a turbid red body. What it mirrors is a picture of the scene drawn small from under its own level before
// every sample (tMirror, brine/index.ts), so the sky, the stalks and the animals stand in it; how much of that picture shows is Fresnel's.
export const BRINE_GLSL = /* glsl */ `
// How much of the mirror shows. The surface is never still at the scale of a hair: the mirror is a soft one and never the whole of the
// light.
float mirrorShare(vec3 n, vec3 v) {
  float nv = clamp(dot(n, v), 0.0, 1.0);
  // A rippled skin never shows the eye its true grazing angle: the share stops well short of a mirror's.
  return 0.02 + 0.2 * pow(1.0 - nv, 3.0);
}
// What a level wet surface at p mirrors, stained by the red film on it. A ripple swings the mirrored ray by twice its lean times the way to
// what it mirrors, which is not known, so a share of the way to the lens stands for it.
vec3 mirrorAt(vec3 p, vec3 n) {
  float away = length(cameraPosition - p);
  vec2 swing = n.xz * 2.0 * clamp(away * 0.22, 0.2, 14.0);
  vec4 q = uMirrorMatrix * vec4(p.x + swing.x, p.y, p.z + swing.y, 1.0);
  return textureLod(tMirror, clamp(q.xy / q.w, 0.003, 0.997), 0.0).rgb * vec3(1.0, 0.8, 0.79);
}
// s: metres to the shore, negative in the brine. n: the surface's normal (ripples and rings laid in by the caller). froth: the colour of the
// scum on top and how much of it there is.
vec3 brineShade(vec3 p, vec3 n, vec3 v, float s, vec4 froth) {
  float foam = froth.a;
  float deep = clamp(-s, 0.0, 6.0);
  // Slow clouds of paler silt carried in it.
  float silt = texture2D(tGrain, p.xz / 23.0 + vec2(uTime * 0.0011, uTime * 0.0006)).r;
  float d2 = max(deep + (silt - 0.5) * 0.25, 0.0);
  // A finger of it over the shelf at the shore lets the bed show, rust and pale; a stride out it is blood; in the pits near black.
  vec3 bed = vec3(0.17, 0.05, 0.034);
  vec3 body = vec3(0.08, 0.009, 0.0075);
  vec3 pit = vec3(0.04, 0.0055, 0.005);
  vec3 albedo = mix(bed, body, 1.0 - exp(-d2 * 4.5));
  albedo = mix(albedo, pit, smoothstep(0.7, 4.0, d2));
  albedo *= 0.8 + 0.4 * silt;
  albedo = mix(albedo, froth.rgb, foam);
  float open = skyOpen(p);
  // The body is lit from inside the liquid: the ripples do not shade it.
  vec3 lit = albedo * skyIrradiance(vec3(0.0, 1.0, 0.0)) * (open / 3.14159);
  float fres = mirrorShare(n, v) * (1.0 - 0.8 * foam);
  // What stands over the brine and closes the sky also stands in the mirror; the mirror is not shaded twice.
  return lit * (1.0 - fres) + mirrorAt(p, n) * fres * mix(1.0, open, 0.5);
}`;
