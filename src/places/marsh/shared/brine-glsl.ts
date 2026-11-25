// The look of the brine, shared by the brine's own surface and by the land, which draws the far channels itself (a channel three metres wide
// two kilometres out is thinner than the land's mesh can cut). Needs RIG_GLSL and a sampler `tGrain` (see land/tiles.ts) above it.
export const BRINE_GLSL = /* glsl */ `
// s: metres to the shore, negative in the brine. n: the surface's normal (ripples and rings laid in by the caller). foam: 0 to 1 scum on top.
vec3 brineShade(vec3 p, vec3 n, vec3 v, float s, float foam) {
  float deep = clamp(-s, 0.0, 6.0);
  // Thick with iron and salt: nothing shows through it past a hand's depth.
  vec3 shallow = vec3(0.1, 0.032, 0.027);
  vec3 body = vec3(0.052, 0.0125, 0.011);
  vec3 pit = vec3(0.034, 0.008, 0.0075);
  vec3 albedo = mix(shallow, body, smoothstep(0.0, 0.5, deep));
  albedo = mix(albedo, pit, smoothstep(0.6, 3.2, deep));
  // Slow clouds of paler silt carried in it.
  float silt = texture2D(tGrain, p.xz / 23.0 + vec2(uTime * 0.0011, uTime * 0.0006)).r;
  albedo *= 0.8 + 0.5 * silt;
  // Scum gathers along the shore.
  float edge = smoothstep(-0.16, -0.02, s) * (0.3 + 0.7 * texture2D(tGrain, p.xz / 1.9).g);
  foam = max(foam, edge * 0.8);
  albedo = mix(albedo, vec3(0.2, 0.115, 0.1), foam);
  // It is thick and dull: a skin of iron and salt lies on it, and it gives back the sky only as a grey sheen where the view skims it.
  float open = skyOpen(p);
  vec3 lit = albedo * skyIrradiance(n) * (open / 3.14159);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  // The seep pool is fresh from the ground and still liquid on top: it shows more of the sky than the skinned brine of the channels.
  float fresh = smoothstep(15.0, 8.0, length(p.xz));
  float mirror = (0.004 + (0.032 + 0.03 * fresh) * pow(1.0 - nv, 5.0)) * (0.55 + 0.9 * silt) * (1.0 - 0.8 * foam);
  return lit + skyRadiance(r) * (open * mirror);
}`;
