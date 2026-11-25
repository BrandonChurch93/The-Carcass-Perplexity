// The stone of the Eye: pale bedded limestone on the faces, grey gravel and talus on the flats. One chunk of GLSL, used by the land, the brow,
// the scree and the wall of the shaft, so that all the rock is the same rock.
//   tCliff, tCliffNh (cliff, 120 m a repeat, beds level, rubble at its foot), tTalus, tTalusNh (shore, 4 m), tSinter, tSinterNh (sinter, 3 m): the pictures in public/assets/eye/mat/.
import type * as THREE from 'three';
import type { Context } from '../shared/context';

export function rockUniforms(ctx: Context): Record<string, THREE.IUniform> {
  return {
    tCliff: { value: ctx.assets.texture('mat/cliff.jpg', { anisotropy: 2 }) },
    tCliffNh: { value: ctx.assets.texture('mat/cliff-nh.png', { kind: 'data' }) },
    tTalus: { value: ctx.assets.texture('mat/shore.jpg', { anisotropy: 2 }) },
    tTalusNh: { value: ctx.assets.texture('mat/shore-nh.png', { kind: 'data' }) },
    tSinter: { value: ctx.assets.texture('mat/sinter.jpg', { anisotropy: 2 }) },
    tSinterNh: { value: ctx.assets.texture('mat/sinter-nh.png', { kind: 'data' }) },
  };
}

export const ROCK_GLSL = /* glsl */ `
uniform sampler2D tCliff;
uniform sampler2D tCliffNh;
uniform sampler2D tTalus;
uniform sampler2D tTalusNh;
uniform sampler2D tSinter;
uniform sampler2D tSinterNh;

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
  // One repeat of the cliff picture is 120 m, with its rubble at the foot of the wall. A second layer at a third of that, its height broken so that no course runs round the lake.
  vec2 ua = vec2(around, p.y - 3.0) / 120.0;
  vec2 ub = vec2(around, p.y + 26.0 * vnoise(vec2(around / 130.0, 1.0))) / 41.0 + vec2(0.37, 0.43);
  // The spur in the south is no wall of the socket: its rock is grey, and lies as the rock itself lies.
  float bearing = degrees(atan(p.x, -p.z));
  float wall = 1.0 - smoothstep(150.0, 165.0, abs(bearing)) * step(length(p.xz), 1100.0);
  if (wall < 0.5) {
    vec2 side = abs(n.x) > abs(n.z) ? p.zy : p.xy;
    ua = side / 53.0 + vec2(0.0, 0.4);
    ub = side / 17.0 + vec2(0.37, 0.61);
  }
  vec2 ga = p.xz / 4.0;
  vec2 gb = p.xz / 21.0 + vec2(0.21, 0.63);
  vec3 stone = vec3(0.0);
  vec3 bentFace = vec3(0.0);
  float fh = 0.5;
  float arch = 0.0;
  if (face > 0.01) {
    vec3 ca = texture2D(tCliff, ua).rgb;
    vec3 cb = texture2D(tCliff, ub).rgb;
    vec3 nb = texture2D(tCliffNh, ua).rgb;
    vec3 na = texture2D(tCliffNh, ub).rgb;
    fh = mix(nb.b, na.b, 0.45);
    // The face: wrapped around the lake, so that the beds lie level.
    vec3 tu = normalize(vec3(-p.z, 0.0, p.x) + vec3(1e-4, 0.0, 0.0));
    vec2 fd = (nb.xy * 2.0 - 1.0) * 1.5 + (na.xy * 2.0 - 1.0) * 1.1;
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
    stone = mix(ca, cb, 0.42) * mix(vec3(1.0, 1.12, 1.3), vec3(1.25, 1.2, 1.18), wall);
    stone *= mix(vec3(0.7, 0.71, 0.73), vec3(1.12, 0.98, 0.8), smoothstep(0.3, 0.7, beds)) * (0.9 + 0.2 * thin);
    // Rust under the ledges and in the joints.
    stone = mix(stone, stone * vec3(1.0, 0.7, 0.42), 0.5 * smoothstep(0.5, 0.2, fh) * smoothstep(0.35, 0.65, vnoise(vec2(around / 60.0, p.y / 22.0))));
    stone = mix(stone, stone * vec3(0.17, 0.16, 0.17), 0.88 * streak);
    stone *= 1.0 - 0.93 * arch;
    bentFace = (tu * fd.x + vec3(0.0, 1.0, 0.0) * fd.y) * 0.6;
    // The wall is broken in blocks and ledges that the mesh does not have: faces turned to the sun and from it, shelves that hold shade under them.
    float b0 = vnoise(vec2(around / 34.0, p.y / 23.0));
    float b1 = vnoise(vec2(around / 34.0 + 0.3, p.y / 23.0));
    float c0 = vnoise(vec2(around / 9.0 + 5.0, p.y / 7.5));
    float c1 = vnoise(vec2(around / 9.0 + 5.3, p.y / 7.5));
    float shelf = vnoise(vec2(around / 120.0, p.y / 4.2 + 1.5 * b0));
    bentFace += tu * (2.6 * (b1 - b0) + 1.5 * (c1 - c0)) * wall;
    bentFace += vec3(0.0, 1.0, 0.0) * (0.7 * (smoothstep(0.35, 0.65, shelf) - 0.5)) * wall;
    stone *= 1.0 - wall * smoothstep(0.5, 0.3, shelf) * (0.22 + 0.33 * smoothstep(0.45, 0.55, c0));
    // Under each ledge a dark line of shade and stain, broken along its length.
    stone *= 1.0 - 0.6 * wall * smoothstep(0.44, 0.5, shelf) * (1.0 - smoothstep(0.5, 0.53, shelf)) * smoothstep(0.3, 0.6, c0 + 0.3 * b0);
  }
  vec3 gravel = vec3(0.0);
  vec3 bentFlat = vec3(0.0);
  float gh = 0.5;
  if (face < 0.99) {
    vec3 ta = texture2D(tTalus, ga).rgb;
    vec3 tb = texture2D(tTalus, gb).rgb;
    vec3 ha = texture2D(tTalusNh, ga).rgb;
    gh = ha.b;
    // The flat: gravel, at two sizes so that it does not repeat.
    vec2 gd = (ha.xy * 2.0 - 1.0) * 1.5;
    float patchy = 0.65 * vnoise(p.xz / 63.0) + 0.35 * vnoise(p.xz / 19.0 + 4.0);
    gravel = mix(ta, tb, 0.4) * vec3(0.92, 1.02, 1.14);
    gravel *= mix(vec3(0.5, 0.52, 0.56), vec3(1.15, 1.08, 0.96), smoothstep(0.25, 0.7, patchy));
    bentFlat = vec3(gd.x, 0.0, gd.y) * 0.55;
    // Close to the camera the gravel is pebbles, each with its own shade.
    float close = smoothstep(26.0, 7.0, length(cameraPosition - p));
    if (close > 0.0) {
      vec2 gc = p.xz / 1.37 + vec2(0.4, 0.8);
      vec3 tc = texture2D(tTalus, gc).rgb * vec3(0.92, 1.02, 1.14);
      vec3 hc = texture2D(tTalusNh, gc).rgb;
      gravel = mix(gravel, tc * (0.7 + 0.5 * smoothstep(0.1, 0.6, hc.b)), 0.6 * close);
      bentFlat = mix(bentFlat, vec3(hc.x * 2.0 - 1.0, 0.0, hc.y * 2.0 - 1.0) * 1.1, 0.75 * close);
      gh = mix(gh, hc.b, close);
    }
  }
  k.albedo = clamp(mix(gravel, stone, face), 0.0, 0.92);
  vec3 bent = mix(bentFlat, bentFace, face);
  k.normal = normalize(n + bent - n * dot(bent, n) * 0.5);
  float h = mix(gh, fh, face);
  k.occ = (0.5 + 0.5 * smoothstep(0.05, 0.55, h)) * (1.0 - 0.85 * arch * face);
  k.rough = 0.92;
  return k;
}`;
