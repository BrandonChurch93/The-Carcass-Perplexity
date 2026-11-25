// The wall's rock as one GLSL function, for a face that is not the land's own mesh: the fall's sheet over the mouth, its collar.
// It is the cliff branch of GROUND_FRAGMENT without the land's map and without the flows (a sheet has neither): the same pictures
// at the same scale and place, the same masses, fractures and tone, so the two meet without a join.
//
// Needs NOISE_GLSL before it (vnoise, vnoise3) and three of the land's pictures as uniforms under these names, all repeating:
//   tCliff      ctx.assets.texture('mat/cliff.jpg')
//   tCliffNh    ctx.assets.texture('mat/cliff-nh.png', { kind: 'data' })
//   tBoulderNh  ctx.assets.texture('mat/boulder-nh.png', { kind: 'data' })
//
// p: world metres. n0: the unit normal of the face. px: metres of rock under one pixel, max(length(dFdx(p)), length(dFdy(p))).
// Returns the albedo, linear, at the wall's tone. n: the normal to shade with. occ: the occlusion to hand to rigShade.
// Call: vec3 n; float occ; vec3 a = wallRock(vWorld, n0, px, n, occ); colour = rigShade(vWorld, n, v, a, 0.92, occ);

/** The wall's tone under the frozen light. */
export const WALL_TONE = 0.8;

export const WALL_ROCK_GLSL = /* glsl */ `
vec3 wallRock(vec3 p, vec3 n0, float px, out vec3 n, out float occ) {
  const float CLIFF = 140.0;
  float big = vnoise(p.xz / 47.0 + 3.0);
  float sharp = smoothstep(0.8, 0.12, px);
  float kx = smoothstep(0.4, 0.6, n0.x * n0.x / (n0.x * n0.x + n0.z * n0.z + 1e-5));
  // A face that looks up or down (a ledge, a roof, a bevel) has no upright direction: there the picture is laid from above.
  float ky = smoothstep(0.12, 0.45, n0.y * n0.y);
  float wander = 26.0 * (vnoise(vec2((p.x + p.z) / 57.0, p.y / 90.0)) - 0.5) / CLIFF;
  vec3 cliff = vec3(0.0);
  vec3 nh = vec3(0.0);
  vec3 bump = vec3(0.0);
  if (kx > 0.003) {
    vec2 uv = p.zy / CLIFF + vec2(0.0, wander);
    vec3 r = texture2D(tCliffNh, uv).rgb;
    cliff += texture2D(tCliff, uv).rgb * kx;
    nh += r * kx;
    bump += kx * (vec3(0.0, 0.0, 1.0) * (r.r - 0.5) - vec3(0.0, 1.0, 0.0) * (r.g - 0.5));
  }
  if (kx < 0.997) {
    vec2 uv = p.xy / CLIFF + vec2(0.0, wander);
    vec3 r = texture2D(tCliffNh, uv).rgb;
    cliff += texture2D(tCliff, uv).rgb * (1.0 - kx);
    nh += r * (1.0 - kx);
    bump += (1.0 - kx) * (vec3(1.0, 0.0, 0.0) * (r.r - 0.5) - vec3(0.0, 1.0, 0.0) * (r.g - 0.5));
  }
  if (ky > 0.003) {
    vec2 uv = p.xz / CLIFF;
    cliff = mix(cliff, texture2D(tCliff, uv).rgb, ky);
    nh = mix(nh, texture2D(tCliffNh, uv).rgb, ky);
    bump *= 1.0 - ky;
  }
  // The beds of the picture count for less than the masses of the rock, and what the large picture cannot hold is read again
  // at the scale of a block: broken faces a metre or two across, with their own shade.
  cliff = mix(vec3(dot(cliff, vec3(0.3333))), cliff, 0.6) * 0.5 + 0.5 * vec3(0.105, 0.096, 0.088);
  if (px < 0.7) {
    vec2 fq = (ky > 0.5 ? p.xz : (kx > 0.5 ? p.zy : p.xy)) / 17.0 + vec2(0.37, 0.11);
    vec3 fr = texture2D(tBoulderNh, fq).rgb;
    float on = smoothstep(0.7, 0.3, px);
    cliff *= mix(1.0, 0.5 + 1.0 * fr.b, on);
    nh.b = mix(nh.b, nh.b * (0.4 + 1.2 * fr.b), on);
    bump += on * (1.0 - ky) * 0.9 * ((kx > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0)) * (fr.r - 0.5) - vec3(0.0, 1.0, 0.0) * (fr.g - 0.5));
  }
  // One dark rock in masses tens of metres across, some sooted, some weathered paler; streaks run down the face.
  float streak = vnoise(vec2((p.x + p.z) * 0.21, p.y * 0.018 + big * 2.0));
  float mass = vnoise3(p / 43.0 + 2.7);
  cliff *= (0.7 + 0.6 * streak) * (0.5 + 1.0 * mass);
  // Fractures: sheets of broken rock that stand near upright in the wall, tens of metres tall, and finer ones between them.
  // The rock between two fractures is a face of its own that leans its own way, so a light from the side picks the faces out.
  vec3 fp = vec3(p.x, p.y * 0.17, p.z);
  float f1 = vnoise3(fp / 7.5 + 3.1);
  vec3 along = normalize(vec3(-n0.z, 0.0, n0.x) + 1e-4);
  float w1 = 0.022 + px / 7.5;
  float crack = (1.0 - smoothstep(0.4 * w1, w1, abs(f1 - 0.5))) * smoothstep(1.6, 0.5, px);
  float f2 = vnoise3(fp / 2.3 + 9.7);
  float w2 = 0.03 + px / 2.3;
  float fineCrack = (1.0 - smoothstep(0.4 * w2, w2, abs(f2 - 0.5))) * smoothstep(0.5, 0.12, px);
  float ledge = (1.0 - 0.7 * crack) * (1.0 - 0.6 * fineCrack);
  vec3 lean = along * (f1 - 0.5) * 1.5 * smoothstep(1.6, 0.5, px);
  cliff *= mix(0.84, 1.14, smoothstep(0.42, 0.58, f2));
  // A few fresh breaks, buff against the soot.
  float fresh = smoothstep(0.7, 0.82, vnoise(vec2(p.x + p.z, p.y * 1.3) / 13.0 + 5.3)) * smoothstep(0.5, 0.62, f2);
  cliff = mix(cliff, vec3(0.2, 0.172, 0.135) * (0.55 + 0.9 * nh.b), 0.55 * fresh);
  // The pictures' rock leans warm (red over blue near 1.2): charcoal with a little brown, never blue.
  vec3 albedo = mix(cliff, dot(cliff, vec3(0.3333)) * vec3(1.07, 0.99, 0.92), 0.8) * ${WALL_TONE.toFixed(2)};
  n = normalize(n0 + bump * 1.1 * sign(vec3(n0.x, 1.0, n0.z)) * mix(0.3, 1.0, sharp) + lean);
  occ = mix(1.0, 0.3 + 0.7 * smoothstep(0.15, 0.6, nh.b), mix(0.5, 1.0, sharp)) * ledge;
  return albedo;
}`;
