// The look of the brine, shared by the brine's own surface and by the land, which draws the far channels itself (a channel three metres wide
// two kilometres out is thinner than the land's mesh can cut). Needs RIG_GLSL and a sampler `tGrain` (see land/tiles.ts) above it.
export const BRINE_GLSL = /* glsl */ `
// s: metres to the shore, negative in the brine. n: the surface's normal (ripples and rings laid in by the caller). foam: 0 to 1 scum on top.
vec3 brineShade(vec3 p, vec3 n, vec3 v, float s, float foam) {
  float deep = clamp(-s, 0.0, 6.0);
  // Thick with iron and salt: nothing shows through it past a hand's depth.
  vec3 shallow = vec3(0.115, 0.04, 0.034);
  vec3 body = vec3(0.064, 0.017, 0.015);
  vec3 pit = vec3(0.042, 0.011, 0.01);
  vec3 albedo = mix(shallow, body, smoothstep(0.0, 0.5, deep));
  albedo = mix(albedo, pit, smoothstep(0.6, 3.2, deep));
  // Slow clouds of paler silt carried in it.
  float silt = texture2D(tGrain, p.xz / 23.0 + vec2(uTime * 0.0011, uTime * 0.0006)).r;
  albedo *= 0.8 + 0.5 * silt;
  // Scum gathers along the shore.
  float edge = smoothstep(-0.16, -0.02, s) * (0.3 + 0.7 * texture2D(tGrain, p.xz / 1.9).g);
  foam = max(foam, edge * 0.8);
  albedo = mix(albedo, vec3(0.26, 0.17, 0.155), foam);
  // It is thick and dull: it shows the sky only where the view skims it.
  vec3 lit = rigShade(p, n, v, albedo, 1.0, 1.0);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  float mirror = (0.006 + 0.3 * pow(1.0 - nv, 6.0)) * (1.0 - 0.7 * foam);
  return mix(lit, skyRadiance(r) * skyOpen(p), mirror);
}`;
