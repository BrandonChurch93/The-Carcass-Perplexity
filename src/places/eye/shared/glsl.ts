// The one light model of the Eye. Every built surface includes RIG_GLSL in its fragment shader and reads its light from these functions,
// so that the water, the land and the animals sit in the same light: a clear, still evening with one low warm sun.
// Radiance is scene linear; the grade and the exposure come after, in the post.

export const NOISE_GLSL = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.3, 9.1);
    a *= 0.5;
  }
  return s;
}
// Pebbles: every stone is an oval of its own, turned and squashed its own way, and where two overlap the higher lies on top. x is its
// dome (0 in the grit between stones), yz the way from here to the middle of the stone, w a number the stone keeps for itself.
vec4 pebbleAt(vec2 x) {
  vec2 cell = floor(x);
  vec2 f = fract(x);
  float best = 0.0;
  vec2 to = vec2(0.0);
  float own = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      float o = hash12(cell + g + 17.0);
      vec2 r = g + 0.15 + 0.7 * hash22(cell + g) - f;
      float turn = o * 19.0;
      vec2 axis = vec2(cos(turn), sin(turn));
      float squash = 1.2 + 0.9 * fract(o * 7.7);
      vec2 q = vec2(dot(r, axis), (r.y * axis.x - r.x * axis.y) * squash);
      float rad = 0.42 + 0.3 * fract(o * 3.3);
      float h = (1.0 - dot(q, q) / (rad * rad)) * rad;
      if (h > best) {
        best = h;
        own = o;
        to = (axis * q.x + vec2(-axis.y, axis.x) * q.y * squash) / rad;
      }
    }
  }
  return vec4(sqrt(best / (0.42 + 0.3 * fract(own * 3.3))), to, own);
}

// The shingle of the shore at xz, stone by stone: its colour and, in a, the dome of the stone (0 in the grit). xs is the same ground counted
// in fist-sized stones, lean the way each dome turns its face, tall the metres the stone stands above the grit. Four sizes lie on one
// another, the large ones fewest, and a size smaller than the pixel that looks at it is left out. One shore above the water and under it.
vec4 shingleAt(vec2 xz, vec2 xs, out vec2 lean, out float tall) {
  float foot = length(fwidth(xs));
  // Beds of larger and smaller stone.
  float bed = vnoise(xz / 1.9 + 11.0);
  float dome = 0.0;
  float own = 0.0;
  vec2 to = vec2(0.0);
  tall = 0.0;
  for (int l = 0; l < 4; l++) {
    float count = l == 0 ? 4.1 : l == 1 ? 2.0 : l == 2 ? 1.0 : 0.43;
    float keep = l == 0 ? 0.95 : l == 1 ? 0.75 : l == 2 ? 0.25 + 0.4 * bed : 0.05 + 0.2 * bed;
    float seen = smoothstep(1.1, 0.35, foot * count);
    if (seen <= 0.0) continue;
    vec4 s = pebbleAt(xs * count + 7.3 * float(l) + (l > 1 ? 0.0 : 0.6) * vec2(vnoise(xz * 9.0), vnoise(xz * 9.0 + 3.0)));
    if (fract(s.w * 11.3) > keep) continue;
    float h = s.x * seen * (0.42 + 0.3 * fract(s.w * 3.3)) * 0.085 / count;
    if (h > tall) {
      tall = h;
      dome = s.x * seen;
      to = s.yz;
      own = fract(s.w * 5.7 + 0.37 * float(l));
    }
  }
  // Limestone mostly: pale grey, some buff, a dark one now and then, each with a speck or a vein of its own.
  vec3 shade = mix(vec3(0.18, 0.15, 0.12), vec3(0.78, 0.64, 0.48), own * own);
  shade = mix(shade, vec3(0.55, 0.4, 0.26), smoothstep(0.74, 0.8, fract(own * 13.0)));
  shade = mix(shade, vec3(0.07, 0.07, 0.08), smoothstep(0.86, 0.9, fract(own * 29.0)));
  shade *= 0.75 + 0.5 * vnoise(xz * 37.0 + own * 50.0);
  // Where a stone goes down into the ones beside it there is a dark gap.
  shade *= 0.25 + 0.75 * smoothstep(0.0, 0.5, dome);
  vec3 grit = vec3(0.2, 0.185, 0.165) * (0.2 + 0.7 * vnoise(xz * 110.0));
  lean = -to * (2.4 * (1.0 - dome) * step(0.01, dome) + 0.9 * dome);
  return vec4(mix(grit, shade, step(0.001, dome)), dome);
}
`;

export const RIG_UNIFORMS_GLSL = /* glsl */ `
uniform float uTime;
uniform float uSolo;
uniform sampler2D tLand;
uniform vec4 uLandRect;
uniform sampler2D tContact;
uniform vec4 uContactRect;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyGround;
uniform vec3 uSunDir;
uniform vec3 uSunColour;
uniform vec3 uGlowDir;
uniform vec3 uGlowColour;
uniform vec3 uFill;
uniform sampler2D tPlate;
uniform vec4 uPlateAt;
uniform vec4 uPlateLens;
uniform vec4 uPlateTone;
// x: how much the wide shot deepens the dark of its far picture, y: the brightness under which a part of it is rock in shade.
uniform vec2 uPlateShade;
uniform vec4 uNear;
uniform vec4 uShade;
uniform sampler2D tUngrade;`;

export const RIG_GLSL = /* glsl */ `
${RIG_UNIFORMS_GLSL}

// Radiance of the evening sky toward d. The glow is the bright low sky on the side of the sun.
vec3 skyRadiance(vec3 d) {
  float up = clamp(d.y, -1.0, 1.0);
  vec3 c = mix(uSkyHorizon, uSkyZenith, pow(clamp(up, 0.0, 1.0), 0.45));
  c = mix(c, uSkyGround, smoothstep(0.0, -0.25, up));
  float w = max(dot(normalize(vec3(d.x, 0.0, d.z) + vec3(0.0, 1e-4, 0.0)), uGlowDir), 0.0);
  float w2 = w * w;
  return c + uGlowColour * ((0.75 * w2 * w2 + 0.25 * w2) * exp(-3.2 * max(up, 0.0)) * smoothstep(-0.12, 0.02, up));
}

// A picture is what a camera made of a place. The film will make its own picture of whatever radiance it is given, so a picture that is to be seen
// as it is has to be taken back through the film's tone curve first: this is that curve, backward (the three matrices and the curve of the grade).
vec3 ungrade(vec3 c) {
  const mat3 TO_2020 = mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));
  const mat3 FROM_2020 = mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
  const mat3 INSET = mat3(vec3(0.856627153315983, 0.137318972929847, 0.11189821299995), vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903), vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
  const mat3 OUTSET = mat3(vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826), vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294), vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
  vec3 x = INSET * pow(max(TO_2020 * c, 0.0), vec3(1.0 / 2.2));
  x = vec3(texture2D(tUngrade, vec2(x.r, 0.5)).r, texture2D(tUngrade, vec2(x.g, 0.5)).r, texture2D(tUngrade, vec2(x.b, 0.5)).r);
  return max(FROM_2020 * (OUTSET * x), 0.0);
}

// The far world along a ray: the picture of the rim and the sky on its cylinder, and the rig's sky above its top edge.
// The picture is carried on round the camera mirrored, so it has no side edge. bias softens it (a mirror in moving water).
vec3 farRadiance(vec3 ro, vec3 rd, float bias) {
  vec3 sky = skyRadiance(rd);
  if (uPlateTone.w < 0.5) return sky;
  vec2 o = ro.xz - uPlateAt.xz;
  vec2 d = rd.xz;
  float a = max(dot(d, d), 1e-6);
  float b = dot(o, d);
  float c = dot(o, o) - uPlateAt.w * uPlateAt.w;
  float t = (-b + sqrt(max(b * b - a * c, 0.0))) / a;
  vec3 q = ro + rd * t - uPlateAt.xyz;
  float az = atan(q.x, -q.z) - uPlateLens.x;
  az = atan(sin(az), cos(az));
  float halfField = atan(uPlateLens.y);
  float k = az / halfField;
  float phi = (1.0 - abs(mod(k + 1.0, 4.0) - 2.0)) * halfField;
  float u = 0.5 + 0.5 * tan(phi) / uPlateLens.y;
  float v = uPlateLens.w + 0.5 * (q.y / (uPlateAt.w * cos(phi))) / uPlateLens.z;
  // Above a picture of a wall alone (w is 2) a mirror still holds rock, the wall told over again, dimmed toward the slate of the dusk over the rim.
  bool tall = uPlateTone.w > 1.5 && bias > 0.0;
  float over = tall ? smoothstep(0.9, 2.8, v) : 0.0;
  float vv = tall && v > 0.95 ? 0.5 + 0.45 * abs(fract((v - 0.95) * 0.55) * 2.0 - 1.0) : v;
  vec3 plate = ungrade(texture2D(tPlate, vec2(u, clamp(vv, 0.004, 0.996)), bias + 2.5 * over + (tall ? 2.0 : 0.0)).rgb) * uPlateTone.rgb;
  // In the water under a long lens the wall is drawn out up and down: three looks one above another, the outer two soft, so that it runs in soft streaks.
  if (tall) {
    plate = 0.4 * plate + 0.3 * uPlateTone.rgb * (ungrade(texture2D(tPlate, vec2(u + 0.005, clamp(vv + 0.035, 0.004, 0.996)), bias + 3.2 + 2.5 * over).rgb)
      + ungrade(texture2D(tPlate, vec2(u - 0.005, clamp(vv - 0.035, 0.004, 0.996)), bias + 3.2 + 2.5 * over).rgb));
  }
  // Seen from high on the rim the sky of the picture is the pale sky of the hour, more silver than blue, in the air and in the water alike.
  if (uPlateTone.w < 1.5) {
    float paler = smoothstep(0.0, 0.25, (plate.b - plate.r) / max(plate.b, 1e-3)) * smoothstep(8.0, 40.0, cameraPosition.y);
    plate = mix(plate, dot(plate, vec3(0.3, 0.5, 0.2)) * vec3(1.04, 1.05, 1.1), 0.6 * paler);
    // And the wall stands in the last light with its caves deep: what is dark in the picture is darker, and the east end under the brow is in shade.
    float fromHigh = smoothstep(8.0, 40.0, cameraPosition.y);
    float lum = dot(plate, vec3(0.3, 0.5, 0.2));
    float rockish = smoothstep(uPlateShade.y * 1.5, uPlateShade.y, lum);
    plate *= mix(1.0, clamp(pow(max(lum, 1e-4) / uPlateShade.y, 0.45), 0.5, 1.0), fromHigh * rockish * uPlateShade.x);
    plate *= mix(1.0, 0.62, fromHigh * rockish * uPlateShade.x * smoothstep(0.42, 0.72, atan(q.x, -q.z)));
  }
  // The sky of the picture itself, in a mirror, is the low warm sky: water that is never quite still gives back less of the blue overhead.
  if (bias > 0.0) {
    // That is how a low eye sees it. An eye that stands high over the water looks down into the mirror and finds the sky overhead in it.
    float high = smoothstep(8.0, 40.0, cameraPosition.y);
    float blue = smoothstep(0.0, 0.25, (plate.b - plate.r) / max(plate.b, 1e-3));
    plate = mix(plate, dot(plate, vec3(0.3, 0.5, 0.2)) * vec3(0.95, 0.72, 0.56), 0.85 * blue * (1.0 - high));
    sky = mix(skyRadiance(normalize(vec3(rd.x, min(rd.y, 0.1), rd.z))) * vec3(0.5, 0.46, 0.44), sky * 1.25, high);
    if (tall) {
      vec3 slate = skyRadiance(normalize(vec3(rd.x, max(rd.y, 0.35), rd.z))) * mix(0.62, 0.26, smoothstep(0.03, 0.3, rd.y));
      float lum = dot(plate, vec3(0.3, 0.5, 0.2));
      plate = mix(plate, slate, over * (1.0 - 0.75 * smoothstep(0.5, 1.6, lum / max(dot(slate, vec3(0.33)), 1e-3) * 0.25)));
      return plate;
    }
  }
  return mix(plate, sky, smoothstep(0.9, 0.995, v));
}

// Metres along a ray to the picture of the far world.
float plateDistance(vec3 ro, vec3 rd) {
  vec2 o = ro.xz - uPlateAt.xz;
  float a = max(dot(rd.xz, rd.xz), 1e-6);
  float b = dot(o, rd.xz);
  float c = dot(o, o) - uPlateAt.w * uPlateAt.w;
  return (-b + sqrt(max(b * b - a * c, 0.0))) / a;
}

// True where the built land gives way to the picture of the far world.
bool beyondNear(vec3 p) {
  return uNear.w > 0.5 && length(p.xz - uNear.xy) > uNear.z;
}

// Irradiance from the whole sky on a face with normal n, before anything hides the sky.
// An upright face sees half the sky and the ground; a face that leans down sees the ground alone.
vec3 skyIrradiance(vec3 n) {
  float up = 0.5 + 0.5 * n.y;
  vec3 e = mix(uSkyGround, mix(uSkyHorizon, uSkyZenith, 0.6), up);
  float w = 0.5 + 0.5 * dot(n, uGlowDir);
  return 3.14159 * (e + uGlowColour * (0.1 * w * w * up)) * uFill;
}

// The land under a point: r height in metres, g how much of the sky the ground there sees (0 to 1),
// b metres to the edge of the lake (positive on land, negative on the water), a the height below which the sun is hidden there by the land.
vec4 landAt(vec2 xz) {
  return texture2D(tLand, (xz - uLandRect.xy) * uLandRect.zw);
}

// What stands on the ground, as drawn in the contact map: the discs of the animals and the stones, stretched along the sun.
float contactDrawn(vec3 p) {
  vec2 uv = (p.xz - uContactRect.xy) * uContactRect.zw;
  vec2 e = min(uv, 1.0 - uv);
  return texture2D(tContact, uv).r * smoothstep(0.0, 0.03, min(e.x, e.y));
}

// 0 open, 1 covered: how much of the light is hidden at the ground by something standing over it.
float contactAt(vec3 p) {
  return contactDrawn(p);
}

// 1 in the sun, 0 in the long shadow of the cliffs, from the land map alone. The edge is as soft as a shadow thrown a kilometre.
float sunOver(vec4 land, vec3 p) {
  // The shade of the evening: the rim behind the wide camera has already taken the sun from the south shore and the spur. uShade: the way the shade
  // deepens (unit, on the ground), where it starts along that way, how fast its top climbs, and whether it is there at all.
  float thrown = uShade.w * (dot(p.xz, uShade.xy) - uShade.z);
  float edge = 1.6 + 0.12 * max(dot(p.xz, uShade.xy) - uShade.z + 120.0, 0.0);
  return smoothstep(-1.6, 1.6, p.y - land.a) * (uShade.w > 0.0 ? smoothstep(-edge, edge, p.y - thrown) : 1.0);
}

// The same with what stands on the ground: within three metres of the ground the contact map hides the sun.
float sunAt(vec3 p) {
  vec4 land = landAt(p.xz);
  return sunOver(land, p) * (1.0 - contactDrawn(p) * smoothstep(3.0, 0.3, p.y - max(land.r, 0.0)));
}

// How much of the sky a point sees: the land's own horizon, opening with height above the ground, and whatever stands over it.
float skyOpen(vec3 p) {
  vec4 land = landAt(p.xz);
  float above = p.y - max(land.r, 0.0);
  float vis = mix(land.g, 1.0, clamp(above / 80.0, 0.0, 1.0));
  return vis * (1.0 - 0.7 * contactDrawn(p) * smoothstep(3.0, 0.0, above));
}

// The shading every opaque surface uses. v points from the surface to the camera. occ is the surface's own small-scale occlusion, 1 for none.
vec3 rigShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float rough, float occ) {
  vec4 land = landAt(p.xz);
  float above = p.y - max(land.r, 0.0);
  float drawn = contactDrawn(p);
  float open = mix(land.g, 1.0, clamp(above / 80.0, 0.0, 1.0)) * (1.0 - 0.7 * drawn * smoothstep(3.0, 0.0, above)) * occ;
  float sun = sunOver(land, p) * (1.0 - drawn * smoothstep(3.0, 0.3, above));
  float nl = max(dot(n, uSunDir), 0.0);
  vec3 e = skyIrradiance(n) * open + uSunColour * (nl * sun * (0.4 + 0.6 * occ));
  // The warm light thrown back by sunlit rock and gravel on what is turned from the sun.
  e += uSunColour * (0.035 * (0.5 - 0.5 * n.y + 0.25) * open);
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float f = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.8 * rough);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  vec3 env = mix(skyRadiance(r), skyIrradiance(n) / 3.14159, rough * rough);
  return c + f * env * open;
}

// The last line of every built surface: gl_FragColor = vec4(rigOut(colour), 1.0). It blacks the surface when an effect is drawn alone.
vec3 rigOut(vec3 c) {
  return c * (1.0 - uSolo);
}`;

// A plain vertex shader for a built mesh: world position and normal, with instancing.
export const RIG_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
  p = instanceMatrix * p;
  n = mat3(instanceMatrix) * n;
  #endif
  vec4 w = modelMatrix * p;
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
