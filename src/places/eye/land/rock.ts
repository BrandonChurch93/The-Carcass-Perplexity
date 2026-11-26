// The stone of the Eye: pale bedded limestone on the faces, grey gravel and talus on the flats. One chunk of GLSL, used by the land, the brow,
// the scree and the wall of the shaft, so that all the rock is the same rock.
//   tCliff, tCliffNh (cliff, 120 m a repeat, beds level, rubble at its foot), tTalus, tTalusNh (shore, 4 m), tSinter, tSinterNh (sinter, 3 m): the pictures in public/assets/eye/mat/.
import * as THREE from 'three';
import type { Context } from '../shared/context';

/** A plate is one piece of ground and does not repeat: laid end to end it is turned over at every edge, so no seam shows. */
export function mirrored(t: THREE.Texture): THREE.Texture {
  t.wrapS = THREE.MirroredRepeatWrapping;
  t.wrapT = THREE.MirroredRepeatWrapping;
  return t;
}

export function rockUniforms(ctx: Context): Record<string, THREE.IUniform> {
  return {
    tCliff: { value: ctx.assets.texture('mat/cliff.jpg', { anisotropy: 2 }) },
    tCliffNh: { value: ctx.assets.texture('mat/cliff-nh.png', { kind: 'data' }) },
    tTalus: { value: ctx.assets.texture('mat/shore.jpg', { anisotropy: 8 }) },
    tTalusNh: { value: ctx.assets.texture('mat/shore-nh.png', { kind: 'data', anisotropy: 4 }) },
    tSinter: { value: ctx.assets.texture('mat/sinter.jpg', { anisotropy: 2 }) },
    tSinterNh: { value: ctx.assets.texture('mat/sinter-nh.png', { kind: 'data' }) },
    tScree: { value: mirrored(ctx.assets.texture('mat/screeplate.jpg', { anisotropy: 6 })) },
    tScreeH: { value: mirrored(ctx.assets.texture('mat/screeplate-h.png', { kind: 'data', anisotropy: 3 })) },
  };
}

export const ROCK_GLSL = /* glsl */ `
uniform sampler2D tCliff;
uniform sampler2D tCliffNh;
uniform sampler2D tTalus;
uniform sampler2D tTalusNh;
uniform sampler2D tSinter;
uniform sampler2D tSinterNh;
uniform sampler2D tScree;
uniform sampler2D tScreeH;

// The plate of the scree slope, 24 m by 13.5 m of broken grey stone seen from above, laid on the ground as it lies. Returns colour and, in a, its height.
vec4 screeAt(vec2 xz) {
  vec2 uv = xz / vec2(24.0, 13.51);
  return vec4(texture2D(tScree, uv).rgb, texture2D(tScreeH, uv).r);
}

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
    // By the axis the rock faces most, at one scale each way, so that nothing is pulled long over a slope.
    vec3 an = abs(n);
    vec2 side = an.y > max(an.x, an.z) ? p.xz : an.x > an.z ? p.zy : p.xy;
    ua = side / 23.0 + vec2(0.0, 0.4);
    ub = side / 7.0 + vec2(0.37, 0.61);
  }
  vec2 ga = p.xz / 4.0;
  vec2 gb = p.xz / 21.0 + vec2(0.21, 0.63);
  vec3 stone = vec3(0.0);
  vec3 bentFace = vec3(0.0);
  float fh = 0.5;
  float arch = 0.0;
  if (face > 0.01 && wall >= 0.5) {
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
  if (face < 0.99 && wall >= 0.5) {
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
  if (wall < 0.5) {
    // The spur and the beach under it are one slope of broken grey stone: the plate of the scree, laid on the ground at its own size,
    // and again larger and turned so that the eye finds no repeat. Its relief gives every stone its faces.
    // Which way each face of the ground truly looks, from the ground itself, so that no face has the plate pulled long over it.
    vec3 gn = normalize(cross(dFdx(p), dFdy(p)));
    vec3 w3 = pow(abs(gn), vec3(4.0));
    w3 /= w3.x + w3.y + w3.z;
    vec4 a = screeAt(p.xz) * w3.y;
    // Under the feet of a low eye the same broken stone is small: cobbles and pebbles, the plate laid six times finer.
    float fine = (1.0 - smoothstep(7.0, 22.0, length(cameraPosition - p))) * smoothstep(12.0, 4.0, cameraPosition.y);
    if (w3.x > 0.02) a += screeAt(p.zy + 11.0) * w3.x;
    if (w3.z > 0.02) a += screeAt(p.xy + 23.0) * w3.z;
    vec2 qr = vec2(p.x * 0.8 - p.z * 0.6, p.x * 0.6 + p.z * 0.8) * 0.31 + 7.3;
    vec4 b = screeAt(qr);
    // The larger copy is laid from above: on a steep face it would be pulled long, so it fades there.
    vec3 grey = a.rgb * mix(vec3(1.0), 0.55 + 0.9 * b.rgb / vec3(0.33, 0.32, 0.31) * 0.5, w3.y * w3.y);
    gravel = grey * vec3(2.1, 1.95, 1.72);
    // Between the stones the flat is sand and fine gravel in beds of its own: the blocks stand in it, they do not pave it.
    float beds = smoothstep(0.42, 0.62, 0.6 * vnoise(p.xz / 13.0 + 4.0) + 0.4 * vnoise(p.xz / 3.7 + 9.0) + 0.25 * (0.5 - a.a)) * w3.y * w3.y;
    vec3 sand = vec3(0.37, 0.36, 0.34) * (0.8 + 0.25 * vnoise(p.xz * 2.3) + 0.2 * vnoise(p.xz * 11.0));
    gravel = mix(gravel, sand, 0.85 * beds);
    // Under the feet of a low eye the shore is pebbles and grit, each stone drawn for itself: small ones everywhere, a cobble among them here and there.
    float shingle = 0.0;
    vec3 pebbleBent = vec3(0.0);
    if (fine > 0.0) {
      vec2 xs = p.xz / 0.11 + 2.0 * vec2(vnoise(p.xz * 1.3), vnoise(p.xz * 1.3 + 7.0));
      // A stone smaller than the pixel that looks at it is not drawn: the shore keeps its tone and loses its grain.
      float seen = fine * smoothstep(1.1, 0.35, length(fwidth(xs)));
      if (seen > 0.0) {
        vec2 lean;
        vec4 stones = shingleAt(p.xz, xs, lean);
        gravel = mix(gravel, stones.rgb, seen);
        pebbleBent = vec3(lean.x, 0.0, lean.y) * seen;
        a.a = mix(a.a, 0.15 + 0.85 * stones.a, seen);
        shingle = seen;
      }
    }
    stone = gravel;
    // The relief of the plate turns the faces of each stone.
    float e = 0.04;
    float hx = screeAt(p.xz + vec2(e, 0.0)).a - screeAt(p.xz - vec2(e, 0.0)).a;
    float hz = screeAt(p.xz + vec2(0.0, e)).a - screeAt(p.xz - vec2(0.0, e)).a;
    bentFlat = pebbleBent + vec3(-hx, 0.0, -hz) * 5.0 * (1.0 - shingle) * (1.0 - 0.85 * beds) * (1.0 - smoothstep(120.0, 260.0, length(cameraPosition - p)));
    bentFace = bentFlat;
    gh = mix(a.a, b.a, 0.35);
    fh = gh;
    arch = 0.0;
  }
  k.albedo = clamp(mix(gravel, stone, face), 0.0, 0.92);
  vec3 bent = mix(bentFlat, bentFace, face);
  k.normal = wall < 0.5 ? normalize(n + bent) : normalize(n + bent - n * dot(bent, n) * 0.5);
  float h = mix(gh, fh, face);
  k.occ = (0.5 + 0.5 * smoothstep(0.05, 0.55, h)) * (1.0 - 0.85 * arch * face);
  k.rough = 0.92;
  return k;
}`;
