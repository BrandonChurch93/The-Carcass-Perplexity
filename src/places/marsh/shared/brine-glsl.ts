// The look of the brine, shared by the brine's own surface and by the land, which draws the far channels itself (a channel three metres wide
// two kilometres out is thinner than the land's mesh can cut). Needs RIG_GLSL and a sampler `tGrain` (see land/tiles.ts) above it.
// The brine is a level mirror over a turbid red body. What it mirrors is a picture of the scene drawn small from under its own level before
// every sample (tMirror, brine/index.ts), so the sky, the stalks and the animals stand in it; how much of that picture shows is Fresnel's.
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
  return seen * vec3(1.0, 0.6, 0.55);
}
// How churned with mud the brine is here, 0 to 1: set by the brine's own surface where the big ones wade.
float brineMud = 0.0;
// s: metres to the shore, negative in the brine. n: the surface's normal (ripples and rings laid in by the caller). froth: the colour of the
// scum on top and how much of it there is.
vec3 brineShade(vec3 p, vec3 n, vec3 v, float s, vec4 froth) {
  float foam = froth.a;
  float deep = clamp(-s, 0.0, 6.0);
  // Slow clouds of paler silt carried in it.
  float silt = texture2D(tGrain, p.xz / 23.0 + vec2(uTime * 0.0011, uTime * 0.0006)).r;
  float d2 = max(deep + (silt - 0.5) * 0.35, 0.0);
  // Over the salt shelf at the shore it is milky and pink; a stride out a dull maroon; in the channels a brown red near black.
  vec3 bed = vec3(0.23, 0.058, 0.046);
  vec3 body = vec3(0.08, 0.0105, 0.0085);
  vec3 pit = vec3(0.03, 0.0045, 0.0038);
  vec3 albedo = mix(bed, body, 1.0 - exp(-d2 * 4.0));
  albedo = mix(albedo, pit, smoothstep(0.7, 4.0, d2));
  albedo *= 0.8 + 0.4 * silt;
  albedo = mix(albedo, vec3(0.04, 0.017, 0.012), brineMud * 0.85);
  albedo = mix(albedo, froth.rgb, foam);
  float open = skyOpen(p);
  // The body is lit from inside the liquid: the ripples do not shade it.
  vec3 lit = albedo * skyIrradiance(vec3(0.0, 1.0, 0.0)) * (open / 3.14159);
  // Far off the ripples are smaller than a pixel: half of every pixel there is a slope that shows the body, so the sheen stops short.
  float away = length(cameraPosition - p);
  // (Far off more of the unseen ripples look at the sky than the level surface does.)
  float fres = (mirrorShare(n, v) + 0.05 * smoothstep(6.0, 28.0, away)) * (1.0 - 0.8 * foam) * mix(1.0, 0.75, smoothstep(25.0, 140.0, away)) * (1.0 + 0.3 * brineMud);
  float tilt = dot(n.xz, normalize(v.xz + vec2(1e-4)));
  lit *= clamp(1.0 + tilt * 1.5, 0.8, 1.12);
  // What stands over the brine and closes the sky also stands in the mirror; the mirror is not shaded twice.
  return lit * (1.0 - fres) + mirrorAt(p, n) * fres * mix(1.0, open, 0.5);
}`;
