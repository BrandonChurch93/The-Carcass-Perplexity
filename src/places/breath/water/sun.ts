// TEMPORARY: the low sun as the water sees it. The rig is the lead's; until it names its sun, the water reads the warm side of the rig's sky.
export const SUN_GLSL = /* glsl */ `
vec3 sunDirection() {
  return normalize(uWarmDir);
}
// The sun's path on the water: its disc is behind fog, so the path is broad and soft, with sparks where a wave face turns it to the lens.
vec3 sunGlitter(vec3 r, vec3 n, vec3 v, float far, vec2 xz) {
  vec3 s = sunDirection();
  float rs = max(dot(r, s), 0.0);
  float broad = pow(rs, 90.0) * 5.0 + pow(rs, 14.0) * 0.5;
  float spark = pow(rs, 900.0) * 60.0 * smoothstep(120.0, 10.0, far);
  return uWarmColour * (broad + spark);
}`;
