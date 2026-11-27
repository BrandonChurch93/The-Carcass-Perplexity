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
    tCliff: { value: ctx.assets.texture('mat/cliff.jpg', { anisotropy: 1 }) },
    tCliffNh: { value: ctx.assets.texture('mat/cliff-nh.png', { kind: 'data' }) },
    tTalus: { value: ctx.assets.texture('mat/shore.jpg', { anisotropy: 1 }) },
    tTalusNh: { value: ctx.assets.texture('mat/shore-nh.png', { kind: 'data', anisotropy: 1 }) },
    tShoreP: { value: mirrored(ctx.assets.texture('mat/shoreplate.jpg', { anisotropy: 1 })) },
    tShorePH: { value: mirrored(ctx.assets.texture('mat/shoreplate-h.png', { kind: 'data', anisotropy: 1 })) },
    tScree: { value: mirrored(ctx.assets.texture('mat/screeplate.jpg', { anisotropy: 1 })) },
    tScreeH: { value: mirrored(ctx.assets.texture('mat/screeplate-h.png', { kind: 'data', anisotropy: 1 })) },
    tGravel: { value: ctx.assets.texture('land/gravel.jpg', { anisotropy: 1 }) },
    tGravelNh: { value: ctx.assets.texture('land/gravel-nh.jpg', { kind: 'data', anisotropy: 2 }) },
  };
}

export const ROCK_GLSL = /* glsl */ `
uniform sampler2D tCliff;
uniform sampler2D tCliffNh;
uniform sampler2D tTalus;
uniform sampler2D tTalusNh;
uniform sampler2D tShoreP;
uniform sampler2D tShorePH;
uniform sampler2D tScree;
uniform sampler2D tScreeH;
uniform sampler2D tGravel;
uniform sampler2D tGravelNh;

// The plate of the scree slope, 24 m by 13.5 m of broken grey stone seen from above, laid on the ground as it lies. Returns colour and, in a, its height.
// The software renderer shades four pixels together, and a screen derivative taken under a branch (or a sheet read there without one
// given) takes stale memory from the pixels that did not go that way: no frame then renders the same twice. So the lie of the ground
// across the screen is taken once, first thing in main and before any branch, and every sheet below is read with it.
vec3 gDx;
vec3 gDy;
vec4 screeAt(vec2 xz, vec2 dx, vec2 dy) {
  vec2 per = vec2(24.0, 13.51);
  return vec4(textureGrad(tScree, xz / per, dx / per, dy / per).rgb, textureGrad(tScreeH, xz / per, dx / per, dy / per).r);
}
vec2 turned(vec2 a, float c, float s) {
  return vec2(a.x * c - a.y * s, a.x * s + a.y * c);
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
  // Where the grey of the spur gives way to the talus of the socket is no line: it wanders, far from any camera.
  float wall = 1.0 - smoothstep(128.0, 143.0, abs(bearing) + 14.0 * (vnoise(p.xz / 45.0) - 0.5)) * step(length(p.xz), 1100.0);
  if (wall < 0.5) {
    // By the axis the rock faces most, at one scale each way, so that nothing is pulled long over a slope.
    vec3 an = abs(n);
    vec2 side = an.y > max(an.x, an.z) ? p.xz : an.x > an.z ? p.zy : p.xy;
    ua = side / 23.0 + vec2(0.0, 0.4);
    ub = side / 7.0 + vec2(0.37, 0.61);
  }
  // How each of those runs across the screen.
  float ring = 1150.0 / max(dot(p.xz, p.xz), 1.0);
  vec2 rx = vec2(ring * (p.x * gDx.z - p.z * gDx.x), gDx.y);
  vec2 ry = vec2(ring * (p.x * gDy.z - p.z * gDy.x), gDy.y);
  vec2 uax = rx / 120.0;
  vec2 uay = ry / 120.0;
  vec2 ubx = rx / 41.0;
  vec2 uby = ry / 41.0;
  if (wall < 0.5) {
    vec3 an = abs(n);
    vec2 sx = an.y > max(an.x, an.z) ? gDx.xz : an.x > an.z ? gDx.zy : gDx.xy;
    vec2 sy = an.y > max(an.x, an.z) ? gDy.xz : an.x > an.z ? gDy.zy : gDy.xy;
    uax = sx / 23.0;
    uay = sy / 23.0;
    ubx = sx / 7.0;
    uby = sy / 7.0;
  }
  vec2 ga = p.xz / 4.0;
  vec2 gb = p.xz / 21.0 + vec2(0.21, 0.63);
  vec3 stone = vec3(0.0);
  vec3 bentFace = vec3(0.0);
  float fh = 0.5;
  float arch = 0.0;
  if (face > 0.01 && wall >= 0.5) {
    vec3 ca = textureGrad(tCliff, ua, uax, uay).rgb;
    vec3 cb = textureGrad(tCliff, ub, ubx, uby).rgb;
    vec3 nb = textureGrad(tCliffNh, ua, uax, uay).rgb;
    vec3 na = textureGrad(tCliffNh, ub, ubx, uby).rgb;
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
    vec3 ta = textureGrad(tTalus, ga, gDx.xz / 4.0, gDy.xz / 4.0).rgb;
    vec3 tb = textureGrad(tTalus, gb, gDx.xz / 21.0, gDy.xz / 21.0).rgb;
    vec3 ha = textureGrad(tTalusNh, ga, gDx.xz / 4.0, gDy.xz / 4.0).rgb;
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
      vec3 tc = textureGrad(tTalus, gc, gDx.xz / 1.37, gDy.xz / 1.37).rgb * vec3(0.92, 1.02, 1.14);
      vec3 hc = textureGrad(tTalusNh, gc, gDx.xz / 1.37, gDy.xz / 1.37).rgb;
      gravel = mix(gravel, tc * (0.7 + 0.5 * smoothstep(0.1, 0.6, hc.b)), 0.6 * close);
      bentFlat = mix(bentFlat, vec3(hc.x * 2.0 - 1.0, 0.0, hc.y * 2.0 - 1.0) * 1.1, 0.75 * close);
      gh = mix(gh, hc.b, close);
    }
  }
  float lowEye = smoothstep(12.0, 4.0, cameraPosition.y);
  if (wall < 0.5 && lowEye < 0.01) {
    // Seen from the spur, the slope is graded scree: the sheet of broken gravel at its true size, three metres a repeat, and through it
    // the stones of the same sheet laid three times larger and turned, more of them the higher the ground. Four reads in all.
    vec3 gn = normalize(cross(gDx, gDy));
    vec3 an = abs(gn);
    float lie = an.y > 0.8 * max(an.x, an.z) ? 0.0 : an.x > an.z ? 1.0 : 2.0;
    vec2 at = lie < 0.5 ? p.xz : lie < 1.5 ? p.zy + 11.0 : p.xy + 23.0;
    vec2 ax = lie < 0.5 ? gDx.xz : lie < 1.5 ? gDx.zy : gDx.xy;
    vec2 ay = lie < 0.5 ? gDy.xz : lie < 1.5 ? gDy.zy : gDy.xy;
    float away = length(cameraPosition - p);
    // Three sizes of the one sheet, each turned from the last: eleven metres a repeat is the rubble the spur camera sees, twenty-three
    // the blocks that stand through it, and three the grit under the lens, read only where the lens is near enough to see it.
    vec2 um = vec2(at.x * 0.8 - at.y * 0.6, at.x * 0.6 + at.y * 0.8) / 11.3 + 0.37;
    vec2 uh = vec2(at.x * 0.28 + at.y * 0.96, -at.x * 0.96 + at.y * 0.28) / 23.0 + 0.61;
    vec2 umx = turned(ax, 0.8, 0.6) / 11.3;
    vec2 umy = turned(ay, 0.8, 0.6) / 11.3;
    vec2 uhx = turned(ax, 0.28, -0.96) / 23.0;
    vec2 uhy = turned(ay, 0.28, -0.96) / 23.0;
    vec3 cm = textureGrad(tGravel, um, umx, umy).rgb;
    vec3 hm = textureGrad(tGravelNh, um, umx, umy).rgb;
    vec3 cb = textureGrad(tGravel, uh, uhx, uhy).rgb;
    vec3 hb = textureGrad(tGravelNh, uh, uhx, uhy).rgb;
    float close = 1.0 - smoothstep(14.0, 32.0, away);
    vec3 cf = vec3(0.32);
    vec3 hf = vec3(0.5);
    if (close > 0.0) {
      cf = textureGrad(tGravel, at / 3.1, ax / 3.1, ay / 3.1).rgb;
      hf = textureGrad(tGravelNh, at / 3.1, ax / 3.1, ay / 3.1).rgb;
    }
    // Coarse at the spur, fine at the water, and in drifts of its own between.
    float drift = 0.55 * vnoise(p.xz / 19.0 + 2.0) + 0.45 * vnoise(p.xz / 5.3 + 7.0);
    float coarse = clamp(0.3 + 0.45 * smoothstep(2.0, 45.0, p.y) + 0.8 * (drift - 0.5), 0.0, 1.0);
    // A large stone stands through the rubble where it is highest: the rubble lies round its foot.
    float big = smoothstep(-0.05, 0.05, hb.b - 0.4 * hm.b - (0.58 - 0.5 * coarse));
    vec3 col = mix(cm, cb * (0.55 + 0.45 * cm / vec3(0.32)) * 1.12, big);
    col *= mix(vec3(1.0), cf / vec3(0.32), 0.6 * close);
    float h = mix(hm.b, 0.4 + 0.6 * hb.b, big);
    h = mix(h, h * (0.5 + hf.b), 0.5 * close);
    vec2 lm = hm.rg - 0.5;
    lm = vec2(0.8 * lm.x + 0.6 * lm.y, -0.6 * lm.x + 0.8 * lm.y);
    vec2 lb = hb.rg - 0.5;
    lb = vec2(0.28 * lb.x - 0.96 * lb.y, 0.96 * lb.x + 0.28 * lb.y);
    vec2 l = (mix(lm * 3.2, lb * 4.2 + lm * 1.2, big) + (hf.rg - 0.5) * 2.2 * close) * (1.0 - smoothstep(160.0, 340.0, away));
    // Grey limestone gone buff where it has lain long, each drift of its own tone.
    float aged = 0.6 * vnoise(p.xz / 37.0 + 5.0) + 0.4 * vnoise(p.xz / 9.0);
    gravel = col * mix(vec3(1.2, 1.15, 1.08), vec3(1.62, 1.5, 1.3), aged);
    // Stretches of it are darker: finer, and stained where water has stood.
    gravel *= mix(0.62, 1.0, smoothstep(0.3, 0.62, 0.6 * vnoise(p.xz / 13.0 + 31.0) + 0.4 * vnoise(p.xz / 3.7 + 2.0)));
    // Dirt and shade lie in the hollows between the stones.
    gravel *= mix(0.42, 1.0, smoothstep(0.18, 0.5, h)) * mix(0.82, 1.0, big);
    stone = gravel;
    bentFlat = lie < 0.5 ? vec3(l.x, 0.0, l.y) : lie < 1.5 ? vec3(0.0, l.y, l.x) : vec3(l.x, l.y, 0.0);
    bentFace = bentFlat;
    gh = h;
    fh = h;
  } else if (wall < 0.5) {
    // The spur and the beach under it are one slope of broken grey stone: the plate of the scree, laid on the ground at its own size,
    // and again larger and turned so that the eye finds no repeat. Its relief gives every stone its faces.
    // Which way each face of the ground truly looks, from the ground itself, so that no face has the plate pulled long over it.
    vec3 gn = normalize(cross(gDx, gDy));
    vec3 w3 = pow(abs(gn), vec3(4.0));
    w3 /= w3.x + w3.y + w3.z;
    vec4 a = screeAt(p.xz, gDx.xz, gDy.xz) * w3.y;
    // Under the feet of a low eye the same broken stone is small: cobbles and pebbles, the plate laid six times finer.
    float fine = mix(1.0 - smoothstep(280.0, 430.0, length(cameraPosition - p)), 1.0 - smoothstep(16.0, 40.0, length(cameraPosition - p)), lowEye) * w3.y * w3.y;
    if (w3.x > 0.02) a += screeAt(p.zy + 11.0, gDx.zy, gDy.zy) * w3.x;
    if (w3.z > 0.02) a += screeAt(p.xy + 23.0, gDx.xy, gDy.xy) * w3.z;
    vec2 qr = vec2(p.x * 0.8 - p.z * 0.6, p.x * 0.6 + p.z * 0.8) * 0.31 + 7.3;
    vec4 b = screeAt(qr, turned(gDx.xz, 0.8, 0.6) * 0.31, turned(gDy.xz, 0.8, 0.6) * 0.31);
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
    if (fine > 0.02) {
      // The picture of the shore itself, eight metres of it at its own size: stones of every size in wet grit, with weed dried on them.
      // From the rim the same picture is laid two and a half times larger and turned: cobbles are boulders there, in beds of gravel.
      vec2 su = mix(vec2(p.x * 0.88 + p.z * 0.47, -p.x * 0.47 + p.z * 0.88) / 2.6, p.xz, lowEye) / vec2(8.0, 4.5);
      float seen = fine;
      vec2 sux = mix(turned(gDx.xz, 0.88, -0.47) / 2.6, gDx.xz, lowEye) / vec2(8.0, 4.5);
      vec2 suy = mix(turned(gDy.xz, 0.88, -0.47) / 2.6, gDy.xz, lowEye) / vec2(8.0, 4.5);
      vec3 sc = textureGrad(tShoreP, su, sux, suy).rgb;
      // The lie of each stone is read only by an eye that stands among them; from the rim the picture's own tone is all that is seen of it.
      float sh = a.a;
      vec2 lean = vec2(0.0);
      if (lowEye > 0.01) {
        sh = textureGrad(tShorePH, su, sux, suy).r;
        float es = 0.012;
        lean = 2.0 * vec2(textureGrad(tShorePH, su + vec2(es / 8.0, 0.0), sux, suy).r - sh, textureGrad(tShorePH, su + vec2(0.0, es / 4.5), sux, suy).r - sh);
      } else {
        // Its grit is finer gravel of the same stone, read from the picture again at its own size.
        vec3 grit = textureGrad(tShoreP, p.xz / vec2(8.0, 4.5) + 0.37, gDx.xz / vec2(8.0, 4.5), gDy.xz / vec2(8.0, 4.5)).rgb;
        sc *= 0.55 + 0.45 * grit / vec3(0.222, 0.161, 0.119);
      }
      sc = mix(sc, vec3(dot(sc, vec3(0.333))), 0.45 * (1.0 - lowEye));
      // Dry gravel in the last light is pale: its grit is hardly darker than its stones.
      sc = mix(sc * 0.6 + 0.16, sc, lowEye);
      gravel = mix(gravel, sc * mix(vec3(2.3, 2.14, 1.96), vec3(1.5, 1.56, 1.66), lowEye), seen);
      pebbleBent = vec3(-lean.x, 0.0, -lean.y) * 3.0 * seen;
      a.a = mix(a.a, sh, seen);
      shingle = seen;
    }
    stone = gravel;
    // The relief of the plate turns the faces of each stone.
    float e = 0.08;
    vec2 per = vec2(24.0, 13.51);
    float h0 = textureGrad(tScreeH, p.xz / per, gDx.xz / per, gDy.xz / per).r;
    float hx = textureGrad(tScreeH, (p.xz + vec2(e, 0.0)) / per, gDx.xz / per, gDy.xz / per).r - h0;
    float hz = textureGrad(tScreeH, (p.xz + vec2(0.0, e)) / per, gDx.xz / per, gDy.xz / per).r - h0;
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
