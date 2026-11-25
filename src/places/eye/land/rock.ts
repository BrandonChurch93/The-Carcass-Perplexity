// The stone of the Eye: pale bedded limestone on the faces, grey gravel and talus on the flats. One chunk of GLSL, used by the land, the brow,
// the scree and the wall of the shaft, so that all the rock is the same rock.
//   tCliff, tCliffNh, tTalus, tTalusNh: the pictures in public/assets/eye/land/.
import type * as THREE from 'three';
import type { Context } from '../shared/context';

export function rockUniforms(ctx: Context): Record<string, THREE.IUniform> {
  return {
    tCliff: { value: ctx.assets.texture('land/cliff.jpg', { anisotropy: 4 }) },
    tCliffNh: { value: ctx.assets.texture('land/cliff-nh.png', { kind: 'data', anisotropy: 4 }) },
    tTalus: { value: ctx.assets.texture('land/talus.jpg', { anisotropy: 4 }) },
    tTalusNh: { value: ctx.assets.texture('land/talus-nh.png', { kind: 'data', anisotropy: 4 }) },
  };
}

export const ROCK_GLSL = /* glsl */ `
uniform sampler2D tCliff;
uniform sampler2D tCliffNh;
uniform sampler2D tTalus;
uniform sampler2D tTalusNh;

struct Rock {
  vec3 albedo;
  vec3 normal;
  float rough;
  float occ;
};

// The rock at p with the normal of the shape n. face: 1 on a cliff, 0 on flat ground. Flat ground is gravel; a face is bedded stone.
Rock rockAt(vec3 p, vec3 n, float face) {
  Rock k;
  // The face: wrapped around the lake, so that the beds lie level.
  float around = atan(p.x, -p.z) * 1150.0;
  vec3 tu = normalize(vec3(-p.z, 0.0, p.x) + vec3(1e-4, 0.0, 0.0));
  vec2 ua = vec2(around, p.y * 1.25) / 96.0;
  vec2 ub = vec2(around, p.y) / 17.0 + vec2(0.37, 0.11);
  vec3 ca = texture2D(tCliff, ua).rgb;
  vec3 cb = texture2D(tCliff, ub).rgb;
  vec3 na = texture2D(tCliffNh, ua).rgb;
  vec3 nb = texture2D(tCliffNh, ub).rgb;
  vec2 fd = (na.xy * 2.0 - 1.0) * 1.3 + (nb.xy * 2.0 - 1.0) * 0.7;
  float fh = 0.6 * na.b + 0.4 * nb.b;
  float beds = fbm(vec2(around / 900.0, p.y / 6.5 + 2.0 * vnoise(vec2(around / 260.0, 3.0))));
  float thin = vnoise(vec2(around / 300.0, p.y / 1.3));
  float streak = smoothstep(0.5, 0.78, fbm(vec2(around / 11.0, p.y / 170.0 + 4.0))) * smoothstep(0.35, 0.7, vnoise(vec2(around / 130.0, p.y / 60.0 + 9.0)));
  vec3 stone = vec3(0.62, 0.55, 0.46) * (0.45 + 4.6 * dot(ca, vec3(0.33)) * (0.45 + 5.0 * dot(cb, vec3(0.33))));
  stone *= mix(vec3(0.78, 0.74, 0.7), vec3(1.12, 1.06, 0.96), smoothstep(0.3, 0.7, beds)) * (0.9 + 0.2 * thin);
  stone = mix(stone, stone * vec3(0.34, 0.3, 0.28), 0.8 * streak);

  // The flat: gravel, at two sizes so that it does not repeat.
  vec2 ga = p.xz / 7.3;
  vec2 gb = p.xz / 41.0 + vec2(0.21, 0.63);
  vec3 ta = texture2D(tTalus, ga).rgb;
  vec3 tb = texture2D(tTalus, gb).rgb;
  vec3 ha = texture2D(tTalusNh, ga).rgb;
  vec3 hb = texture2D(tTalusNh, gb).rgb;
  vec2 gd = (ha.xy * 2.0 - 1.0) * 1.0 + (hb.xy * 2.0 - 1.0) * 0.8;
  float gh = 0.6 * ha.b + 0.4 * hb.b;
  float patchy = fbm(p.xz / 63.0);
  vec3 gravel = vec3(0.47, 0.44, 0.4) * (0.4 + 5.2 * dot(ta, vec3(0.33)) * (0.5 + 4.6 * dot(tb, vec3(0.33))));
  gravel *= mix(vec3(0.8, 0.8, 0.82), vec3(1.1, 1.04, 0.94), patchy);

  k.albedo = clamp(mix(gravel, stone, face), 0.0, 0.92);
  vec3 bent = mix(vec3(gd.x, 0.0, gd.y) * 0.55, (tu * fd.x + vec3(0.0, 1.0, 0.0) * fd.y) * 0.6, face);
  k.normal = normalize(n + bent - n * dot(bent, n) * 0.5);
  float h = mix(gh, fh, face);
  k.occ = 0.5 + 0.5 * smoothstep(0.05, 0.55, h);
  k.rough = 0.92;
  return k;
}`;
