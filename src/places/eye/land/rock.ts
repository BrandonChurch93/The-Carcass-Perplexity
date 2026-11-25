// The stone of the Eye: pale bedded limestone on the faces, grey gravel and talus on the flats. One chunk of GLSL, used by the land, the brow,
// the scree and the wall of the shaft, so that all the rock is the same rock.
//   tCliff, tCliffNh, tTalus, tTalusNh: the pictures in public/assets/eye/land/.
import type * as THREE from 'three';
import type { Context } from '../shared/context';

export function rockUniforms(ctx: Context): Record<string, THREE.IUniform> {
  return {
    tCliff: { value: ctx.assets.texture('land/cliff.jpg', { anisotropy: 2 }) },
    tCliffNh: { value: ctx.assets.texture('land/cliff-nh.png', { kind: 'data' }) },
    tTalus: { value: ctx.assets.texture('land/talus.jpg', { anisotropy: 2 }) },
    tTalusNh: { value: ctx.assets.texture('land/talus-nh.png', { kind: 'data' }) },
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
// Each kind is worked out only where it shows, which is most of the cost of the land.
Rock rockAt(vec3 p, vec3 n, float face) {
  Rock k;
  float around = atan(p.x, -p.z) * 1150.0;
  vec2 ua = vec2(around, p.y * 1.25) / 96.0;
  vec2 ub = vec2(around, p.y) / 17.0 + vec2(0.37, 0.11);
  // The spur in the south is no wall of the socket: its rock is grey, and lies as the rock itself lies.
  float bearing = degrees(atan(p.x, -p.z));
  float wall = 1.0 - smoothstep(150.0, 165.0, abs(bearing)) * step(length(p.xz), 1100.0);
  if (wall < 0.5) {
    vec2 side = abs(n.x) > abs(n.z) ? p.zy : p.xy;
    ua = side / 31.0;
    ub = side / 7.7 + vec2(0.37, 0.11);
  }
  vec2 ga = p.xz / 7.3;
  vec2 gb = p.xz / 41.0 + vec2(0.21, 0.63);
  vec3 stone = vec3(0.0);
  vec3 bentFace = vec3(0.0);
  float fh = 0.5;
  float arch = 0.0;
  if (face > 0.01) {
    float ca = dot(texture2D(tCliff, ua).rgb, vec3(0.33));
    float cb = dot(texture2D(tCliff, ub).rgb, vec3(0.33));
    vec3 na = texture2D(tCliffNh, ub).rgb;
    fh = na.b;
    // The face: wrapped around the lake, so that the beds lie level.
    vec3 tu = normalize(vec3(-p.z, 0.0, p.x) + vec3(1e-4, 0.0, 0.0));
    vec2 fd = (na.xy * 2.0 - 1.0) * 1.6;
    float thin = vnoise(vec2(around / 300.0, p.y / 1.3));
    float beds = 0.6 * vnoise(vec2(around / 900.0, p.y / 6.5 + 2.0 * vnoise(vec2(around / 260.0, 3.0)))) + 0.4 * vnoise(vec2(around / 410.0, p.y / 2.9));
    // Black streaks where water has run down the face from the ledges, in a few places and not everywhere.
    float wet = smoothstep(0.56, 0.72, vnoise(vec2(around / 170.0, 9.0)));
    float streak = 0.0;
    if (wet > 0.0) {
      float run = 0.6 * vnoise(vec2(around / 5.5, p.y / 190.0 + 4.0)) + 0.4 * vnoise(vec2(around / 1.7, p.y / 60.0));
      streak = smoothstep(0.46, 0.68, run) * wet * smoothstep(-10.0, 60.0, p.y) * smoothstep(0.15, 0.6, face);
    }
    // Alcoves in the wall: dark arches, a few along its length, and a row of them under the brow.
    streak *= wall;
    float roofed = smoothstep(24.0, 50.0, bearing) * (1.0 - smoothstep(118.0, 144.0, bearing));
    float span = mix(310.0, 170.0, step(0.5, roofed));
    float cell = floor(around / span);
    float pick = hash12(vec2(cell, 3.7));
    float mid = (cell + 0.3 + 0.4 * hash12(vec2(cell, 9.1))) * span;
    float wide = 15.0 + 24.0 * hash12(vec2(cell, 5.3));
    float base = mix(22.0 + 50.0 * hash12(vec2(cell, 1.9)), 34.0 + 30.0 * hash12(vec2(cell, 1.9)), roofed);
    float ax = (around - mid) / wide;
    float ay = (p.y - base) / (wide * 1.15);
    float rim = length(vec2(ax, max(ay, 0.0))) + 0.14 * (thin - 0.5) + 0.1 * (na.b - 0.5);
    arch = wall * step(mix(0.5, 0.25, roofed), pick) * (1.0 - smoothstep(0.7, 1.0, rim)) * smoothstep(-0.5, -0.3, ay) * smoothstep(0.3, 0.8, face);
    stone = mix(vec3(0.6, 0.57, 0.53), vec3(0.82, 0.73, 0.6), wall) * (0.4 + 4.9 * ca * (0.45 + 5.0 * cb));
    stone *= mix(vec3(0.84, 0.81, 0.78), vec3(1.08, 1.02, 0.94), smoothstep(0.3, 0.7, beds)) * (0.93 + 0.14 * thin);
    // Rust under the ledges and in the joints.
    stone = mix(stone, stone * vec3(1.0, 0.7, 0.42), 0.5 * smoothstep(0.5, 0.2, fh) * smoothstep(0.35, 0.65, vnoise(vec2(around / 60.0, p.y / 22.0))));
    stone = mix(stone, stone * vec3(0.17, 0.16, 0.17), 0.88 * streak);
    stone *= 1.0 - 0.93 * arch;
    bentFace = (tu * fd.x + vec3(0.0, 1.0, 0.0) * fd.y) * 0.6;
  }
  vec3 gravel = vec3(0.0);
  vec3 bentFlat = vec3(0.0);
  float gh = 0.5;
  if (face < 0.99) {
    float ta = dot(texture2D(tTalus, ga).rgb, vec3(0.33));
    float tb = dot(texture2D(tTalus, gb).rgb, vec3(0.33));
    vec3 ha = texture2D(tTalusNh, ga).rgb;
    gh = ha.b;
    // The flat: gravel, at two sizes so that it does not repeat.
    vec2 gd = (ha.xy * 2.0 - 1.0) * 1.5;
    float patchy = 0.65 * vnoise(p.xz / 63.0) + 0.35 * vnoise(p.xz / 19.0 + 4.0);
    gravel = vec3(0.4, 0.375, 0.345) * (0.62 + 3.4 * ta * (0.6 + 3.6 * tb));
    gravel *= mix(vec3(0.78, 0.79, 0.82), vec3(1.1, 1.04, 0.94), patchy);
    bentFlat = vec3(gd.x, 0.0, gd.y) * 0.55;
  }
  k.albedo = clamp(mix(gravel, stone, face), 0.0, 0.92);
  vec3 bent = mix(bentFlat, bentFace, face);
  k.normal = normalize(n + bent - n * dot(bent, n) * 0.5);
  float h = mix(gh, fh, face);
  k.occ = (0.5 + 0.5 * smoothstep(0.05, 0.55, h)) * (1.0 - 0.85 * arch * face);
  k.rough = 0.92;
  return k;
}`;
