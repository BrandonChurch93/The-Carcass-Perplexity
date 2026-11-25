// The paint of the ground: salt in polygon plates, wet films, the white rim and the red stain along every shore, grey mud where the crust is
// thin, pale bedded rock where the land stands up, and the far channels of brine.
import { BRINE_GLSL } from '../shared/brine-glsl';
import { RIG_GLSL } from '../shared/glsl';

export const LAND_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vWorld = position;
  vNormal = normal;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

export const FIELD_GLSL = /* glsl */ `
uniform sampler2D tFieldNear;
uniform sampler2D tFieldFar;
// r metres to the shore (negative in brine), g how thin the crust is, b how stained the ground is.
vec3 fieldAt(vec2 xz) {
  vec2 a = abs(xz);
  float m = max(a.x, a.y);
  vec3 far = vec3(6.0, 0.0, 0.3);
  if (m < 2040.0) far = mix(texture2D(tFieldFar, xz / 4096.0 + 0.5).rgb, far, smoothstep(1900.0, 2040.0, m));
  if (m < 254.0) return mix(texture2D(tFieldNear, xz / 512.0 + 0.5).rgb, far, smoothstep(236.0, 254.0, m));
  return far;
}`;

export const LAND_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
uniform sampler2D tPlates;
uniform sampler2D tGrain;
${RIG_GLSL}
${FIELD_GLSL}
${BRINE_GLSL}

void main() {
  vec3 p = vWorld;
  vec3 toEye = cameraPosition - p;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec3 ng = normalize(vNormal);
  vec3 f = fieldAt(p.xz);
  vec4 fine = texture2D(tGrain, p.xz / 1.9);
  vec4 mid = texture2D(tGrain, p.xz / 13.0 + 0.37);
  vec4 wide = texture2D(tGrain, p.xz / 97.0 + 0.11);
  float s = f.r + (fine.r - 0.5) * 0.1 + (mid.r - 0.5) * 0.25 * smoothstep(0.0, 1.5, f.r);
  float thin = f.g;
  float stain = f.b;
  float rock = smoothstep(0.28, 0.75, p.y) ;

  // Salt in plates of two sizes: a hand's breadth of raised rim round plates half a metre across, and the great polygons they sit in.
  vec4 small = texture2D(tPlates, p.xz / 5.3);
  vec4 big = texture2D(tPlates, p.xz / 41.0 + 0.23);
  float smallSeen = smoothstep(90.0, 25.0, dist);
  float bigSeen = smoothstep(700.0, 200.0, dist);
  float rim = max(small.r * smallSeen * 0.8, big.r * bigSeen);

  vec3 salt = mix(vec3(0.21, 0.18, 0.172), vec3(0.33, 0.3, 0.29), wide.r * 0.6 + small.g * 0.25 * smallSeen + big.g * 0.3 * bigSeen);
  salt = mix(salt, vec3(0.34, 0.2, 0.18), clamp(stain * 1.1 - 0.15, 0.0, 1.0) * 0.55);
  salt = mix(salt, vec3(0.5, 0.48, 0.47), rim * 0.4);
  salt *= 0.86 + 0.28 * fine.r;
  // Films of standing wet: darker, and they mirror the sky.
  float film = smoothstep(0.52, 0.62, mid.g * 0.5 + wide.g * 0.5 + 0.12 * stain) * (1.0 - rim);
  float rough = mix(0.9, 0.12, film * 0.8);
  salt *= 1.0 - 0.3 * film;

  // The shore: wet red ground at the brine, then the white frill of salt it leaves as it dries, then a stain that fades over metres.
  float wetBand = smoothstep(0.55, 0.05, s);
  float frill = smoothstep(0.12, 0.3, s) * smoothstep(1.1, 0.5, s) * (0.55 + 0.45 * fine.g);
  float halo = exp(-max(s, 0.0) / 1.6);
  salt = mix(salt, vec3(0.27, 0.12, 0.1), halo * 0.55);
  salt = mix(salt, vec3(0.66, 0.64, 0.62), frill * 0.85);
  salt = mix(salt, vec3(0.15, 0.045, 0.038), wetBand);
  rough = mix(rough, 0.95, frill);
  rough = mix(rough, 0.1, wetBand);

  // Thin crust over mud: grey, wet, the plates parted by dark cracks.
  float crack = smoothstep(0.35, 0.8, small.r) * smallSeen;
  vec3 mud = mix(vec3(0.17, 0.15, 0.14), vec3(0.27, 0.245, 0.23), small.g * 0.5 + fine.r * 0.5);
  mud = mix(mud, vec3(0.06, 0.035, 0.03), crack * 0.8);
  mud = mix(mud, vec3(0.15, 0.045, 0.038), wetBand);
  vec3 colour = mix(salt, mud, thin * 0.9);
  rough = mix(rough, mix(0.45, 0.1, crack), thin * 0.9);

  // Rock: pale beds, rust where water runs down them, salt on what looks up.
  if (rock > 0.0) {
    vec4 bed = texture2D(tGrain, vec2(p.y / 3.1 + (mid.r - 0.5) * 0.25, dot(p.xz, vec2(0.021, 0.013))));
    vec3 stone = mix(vec3(0.17, 0.135, 0.115), vec3(0.36, 0.31, 0.27), bed.r);
    stone = mix(stone, vec3(0.25, 0.11, 0.07), smoothstep(0.5, 0.75, bed.g * 0.6 + mid.g * 0.4) * 0.6);
    stone *= 0.75 + 0.5 * fine.r;
    float top = smoothstep(0.82, 0.97, ng.y);
    stone = mix(stone, vec3(0.5, 0.48, 0.46) * (0.85 + 0.3 * fine.g), top * 0.5 * smoothstep(0.35, 0.6, mid.r));
    colour = mix(colour, stone, rock);
    rough = mix(rough, 0.95, rock);
  }

  // The small relief of the paint, as a bent normal.
  vec2 bend = (small.ba - 0.5) * 1.5 * smallSeen * (1.0 - film) + (big.ba - 0.5) * 0.7 * bigSeen + (fine.ba - 0.5) * 0.9 * smoothstep(60.0, 10.0, dist);
  vec3 n = normalize(ng + vec3(bend.x, 0.0, bend.y) * (1.0 - 0.7 * wetBand));
  float occ = 1.0 - 0.35 * rim * (1.0 - small.r) - 0.4 * crack * thin;
  vec3 lit = rigShade(p, n, v, colour, rough, occ);

  // The brine, where this ground is under it: the far channels are drawn here, the near ones are covered by the brine's own surface.
  float w = max(fwidth(f.r) * 0.75, 0.015);
  float under = smoothstep(w, -w, s) * (1.0 - rock);
  if (under > 0.0) lit = mix(lit, brineShade(vec3(p.x, 0.0, p.z), vec3(0.0, 1.0, 0.0), v, s, 0.0), under);
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;
