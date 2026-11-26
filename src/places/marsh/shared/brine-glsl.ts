// The look of the brine, shared by the brine's own surface and by the land, which draws the far channels itself (a channel three metres wide
// two kilometres out is thinner than the land's mesh can cut). Needs RIG_GLSL and a sampler `tGrain` (see land/tiles.ts) above it.
export const BRINE_GLSL = /* glsl */ `
// s: metres to the shore, negative in the brine. n: the surface's normal (ripples and rings laid in by the caller). foam: 0 to 1 scum on top.
vec3 brineShade(vec3 p, vec3 n, vec3 v, float s, float foam) {
  float deep = clamp(-s, 0.0, 6.0);
  // Thick with iron and salt: nothing shows through it past a hand's depth.
  vec3 shallow = vec3(0.1, 0.027, 0.018);
  vec3 body = vec3(0.058, 0.0095, 0.008);
  vec3 pit = vec3(0.032, 0.005, 0.0045);
  // Slow clouds of paler silt carried in it.
  float silt = texture2D(tGrain, p.xz / 23.0 + vec2(uTime * 0.0011, uTime * 0.0006)).r;
  // Thin and rust-coloured over the shelf at the shore, blood red past it, near black where it is deep.
  float d2 = max(deep + (silt - 0.5) * 0.7, 0.0);
  vec3 albedo = mix(shallow, body, smoothstep(0.0, 0.35, d2));
  albedo = mix(albedo, pit, smoothstep(0.8, 4.5, d2));
  albedo *= 0.75 + 0.5 * silt;
  // Scum gathers along the shore.
  float edge = smoothstep(-0.07, -0.01, s) * smoothstep(0.45, 0.62, texture2D(tGrain, p.xz / 1.9).g);
  foam = max(foam, edge * 0.8);
  albedo = mix(albedo, vec3(0.17, 0.1, 0.085), foam);
  // It is thick and dull: a skin of iron and salt lies on it, and it gives back the sky only as a grey sheen where the view skims it.
  float open = skyOpen(p);
  vec3 lit = albedo * skyIrradiance(n) * (open / 3.14159);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  // Seen from above it is red; seen low, where the view skims it, it is a pale glare. The turn from one to the other is quick, so every
  // ripple that leans away from the lens shows as a line of light.
  // The sky it gives back is an overcast with lumps in it, so the sheen lies on the brine in patches.
  // How wide a pixel lies on the brine is taken from the place itself, not from the mirrored ray: where a neighbour in the renderer's block
  // of four is cut away at a shore, the ray there is not worked out, and a read sized by it is not the same on every load of the page.
  vec2 cloudAt = (p.xz + r.xz / max(r.y, 0.12) * 40.0) / 230.0;
  float cloud = textureGrad(tGrain, cloudAt, dFdx(p.xz) / 230.0, dFdy(p.xz) / 230.0).g;
  float mirror = (0.02 + 0.42 * pow(1.0 - nv, 14.0)) * (0.5 + 0.9 * smoothstep(0.25, 0.75, cloud)) * (1.0 - 0.8 * foam);
  return lit + skyRadiance(r) * (open * mirror);
}`;
