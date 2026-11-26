// The sea of cloud under the ridge, as the half-size air pass (volume.ts) draws it: the deck's shape, the march of a view ray to it, and
// its light. volume.ts lays the three pieces into its shader where they stood; everything here reads only what that shader declares
// before them (noise, ridgeAt, the rig, the dome's cloud).
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { bakeHeaps } from './heaps';

/** The pictures the sea is read from. The air folder lays them among the volume's uniforms and disposes of them with it. */
export function seaUniforms(ctx: Context): { uniforms: Record<string, THREE.IUniform>; dispose(): void } {
  const heaps = bakeHeaps(ctx.rng('air/heaps'));
  return {
    uniforms: {
      tDeck: { value: ctx.assets.texture('mat/cloudsea.jpg') },
      tSeaNh: { value: ctx.assets.texture('mat/cloudsea-nh.png', { kind: 'data' }) },
      tHeaps: { value: heaps },
    },
    dispose: () => heaps.dispose(),
  };
}

/** The deck's shape: its uniforms, its constants and what stands how high where. Laid before main. */
export const SEA_GLSL = /* glsl */ `
uniform sampler2D tDeck;
uniform sampler2D tSeaNh;
uniform sampler2D tHeaps;
// Nothing of the cloud under the crest stands higher than this.
const float BANK_TOP = 240.0;
// The top of the cloud under the crest: far out the sea itself, billowed; against the lee of the ridge a bank some hundreds of metres under the crest,
// so that the flank goes down into cloud; and in the saddles the storm's cloud, which comes over the crest and falls down the lee into the bank.
const float CLOUD_UNDER = 130.0;
// seaLod is how small the deck is read at a place, by its distance: 0 at 2.9 km, one more for each doubling, under 0 nearer.
// The deck's own light: what the sky gives its heads, and what the dusk gives the faces that look at it.
const vec3 SEA_COLD = vec3(0.115, 0.125, 0.18);
const vec3 SEA_WARM = vec3(0.16, 0.085, 0.045);
// The heaps of the deck (air/heaps.ts): metres a repeat, and metres from the floor of a hollow to the crown of a head.
const float HEAP_SPAN = 2300.0;
const float HEAP_TALL = 180.0;
// How far the grain of the real deck turns a face of a heap, and how far it moves a place between hollow and crown.
const float GRAIN_TILT = 0.55;
const float GRAIN_HEAD = 0.6;
float seaLod = 1.0;
// Laid a little turned from the ridge, so that no row of heads runs along it or straight away from the lens.
vec2 heapUv(vec2 at) {
  return vec2(0.891 * at.x + 0.454 * at.y, -0.454 * at.x + 0.891 * at.y) / HEAP_SPAN;
}
// How high the deck stands over its own mean at a place, in shares of HEAP_TALL. detail 0 is the heaps alone (what the march walks
// to), 1 adds the billows on them. swell reads the long swell anew; without it the last one
// read is kept, which over a few hundred metres is the same. It leaves seaN at what it returns and seaHead at how far the place
// stands over the body of the heaps round it: under 0 in a hollow, over 0 on a head.
float seaHead = 0.0;
float seaN = 0.0;
float seaSwell = 0.5;
// Left by seaTop: metres of height for each share seaLift returns (a head is pressed down beside the ridge and stands taller far from it).
float seaTall = HEAP_TALL;
// Left by the march: how thick the thin cloud lies over land that stands in a hollow of the deck, 0 where the ray met the deck itself.
float seaCover = 0.0;
// Left by seaTop: the deck's own level at the place, under its heaps.
float seaLevel = 0.0;
// Left by main: how far the deck has gone into the sky at the place the ray met it, the share of a metre one pixel sees at one metre
// (times a constant), and how long the lens is against the usual one.
float seaGone = 0.0;
float seaPix = 0.00035;
float seaLens = 1.0;
float seaLift(vec3 p, int detail, bool swell) {
  // Its long swell is that of the picture of a cloud deck seen from above (mat/cloudsea, 10 km a repeat), read soft: where it stands
  // high the heaps are tall, where it lies low they are small, so no two kilometres of the deck are alike.
  if (swell) seaSwell = textureLod(tSeaNh, (p.xz - uWind.xz * (uTime * 38.0)) / 10000.0, max(seaLod, 2.5)).b;
  vec3 q2 = p - vec3(0.42, 0.0, 0.91) * (uTime * 31.0);
  // The heaps: round heads with hollows between, read smaller with the distance so that the deck goes flat toward the horizon.
  vec4 heap = textureLod(tHeaps, heapUv(q2.xz), max(seaLod + 1.25, 0.0));
  float n = 0.3 * (seaSwell - 0.5) + (0.45 + 1.1 * seaSwell) * (heap.r - 0.42);
  seaHead = heap.r - heap.b;
  // The billows on a head run faster than the heap and a little across it, and stand on its crown more than in its creases: the deck rolls.
  if (detail > 0) {
    vec3 q3 = p - vec3(0.2, 0.0, 0.98) * (uTime * 47.0);
    float small = textureLod(tHeaps, heapUv(q3.zx) * 3.7 + 0.37, max(seaLod + 2.25, 0.0)).g - 0.45;
    n += 0.14 * small * (0.35 + 1.3 * heap.r);
    seaHead += 0.1 * small;
  }
  seaN = n;
  return n;
}
float seaTop(vec3 p, bool swell) {
  float n = seaLift(p, 0, swell);
  vec3 ridge = ridgeAt(p.x);
  float lee = p.z - ridge.x;
  // The sea lies close under the crest on both hands, level to the horizon, and stands a little higher against the rock:
  // the ridge is a knife out of cloud, and its flanks go down into it.
  float bank = smoothstep(900.0, 120.0, abs(lee));
  // Kilometres out from the ridge its heads stand taller, in ranges, some of them over the height of the lens: the far edge of the
  // deck is rows of heads against the sky and not a ruled line.
  float out_ = smoothstep(1800.0, 6500.0, abs(lee));
  // The ranges stand where the long swell is high and leave gaps where it is low, so they are seen at different distances.
  float range = out_ * (0.3 + 1.0 * smoothstep(0.4, 0.75, seaSwell)) * (lee > 0.0 ? 1.5 : 1.0);
  seaTall = HEAP_TALL * (1.0 + (n > 0.0 ? range : 0.0));
  float lift = HEAP_TALL * (n + 0.1 * out_ + range * max(n, 0.0)) + 70.0 * bank;
  // Beside the ridge no billow stands over the crest: a head that rolled up there stood as a dark hill before the spires for a quarter
  // of a second. A head that would is pressed down, the more the higher it reaches, and keeps its shape; farther out the deck may
  // heap as it likes.
  float room = CLOUD_UNDER - 28.0 + 0.2 * max(abs(lee) - 200.0, 0.0);
  if (lift > 0.4 * room) {
    float press = exp(-(lift - 0.4 * room) / (0.6 * room));
    seaTall *= press;
    lift = room - 0.6 * room * press;
  }
  float top = ridge.y - CLOUD_UNDER + lift;
  // The tallest of the far heads stop short of the height nothing of this cloud stands over, rounded and not cut.
  float high = top - (BANK_TOP - 170.0);
  if (high > 0.0) top = BANK_TOP - 170.0 + 160.0 * (1.0 - exp(-high / 160.0));
  // (The pour is read only where it could stand over the deck: at its fullest it is 110 m under the crest's own height in a saddle.)
  float gone = 1.0 - ridge.z * smoothstep(-700.0, -160.0, lee) * smoothstep(1500.0, 150.0, lee);
  if (ridge.z > 0.01 && lee > -700.0 && lee < 1500.0 && ridge.y + 110.0 * ridge.z - 0.5 * max(lee, 0.0) - 700.0 * gone * gone > top) {
    vec3 c = p - uWind.xyz * (uTime * uWind.w);
    float m = 0.45 * noise(vec3(c.xz / 520.0, 0.37)).r + 0.2 * noise(vec3(c.xz / 140.0, 0.81)).b + 0.35 * textureLod(tSeaNh, c.xz / 1300.0 + 0.11, max(seaLod, 0.0)).b;
    float pour = ridge.y + (140.0 * m - 30.0) * ridge.z - 0.5 * max(lee, 0.0) - 700.0 * gone * gone;
    top = max(top, pour);
  }
  seaLevel = top - seaTall * n;
  return top;
}
`;

/** In main, first: the march of the view ray to the deck. It leaves seaAt, the distance to it, or under zero. */
export const SEA_MARCH_GLSL = /* glsl */ `
  // The cloud under the crest: a surface with a soft top, found by walking to it.
  float seaAt = -1.0;
  // Whether the ray came to a head of the deck, or only to the level it lies at far out.
  float tSea = ro.y > BANK_TOP ? (rd.y < -1e-4 ? (BANK_TOP - ro.y) / rd.y : 1e9) : 0.0;
  if (tSea < far && uShow.y > 0.0) {
    float t = tSea;
    float fall = max(-rd.y, 0.0) + 0.6;
    // A long lens sees a far head as large as a short one sees a near head: it reads the deck as finely, and its haze stands as much farther off.
    seaLens = max(0.466 / uInvProjection[1][1], 1.0);
    // It reads no finer than its pixel is deep on the deck: a ray that grazes it takes in a long strip of it, many heads to a pixel
    // row, and read fine there each row of the picture is a different slice of them, drawn as dashes. So the lens's gain is given
    // back as the ray lies flatter, and a short lens reads as it did.
    seaPix = 0.00035 / seaLens * clamp(0.12 / max(-rd.y, 1e-3), 1.0, seaLens);
    vec3 p = ro + rd * t;
    bool found = false;
    float before = t;
    // How far over the deck the ray stood at the last place it asked, and how far under it stands inside a head: the face lies
    // between the two, found by halves and then by the straight line between the last two, so that no stride shows as a terrace.
    float over = 1.0;
    bool out_ = false;
    for (int i = 0; i < 20; i++) {
      seaLod = log2(max(t, 30.0) * seaPix);
      float d = p.y - seaTop(p, (i & 1) == 0);
      if (d < 2.0 + 0.003 * t) {
        // A head is steep: a stride may end inside one.
        if (d < -(2.0 + 0.003 * t) && i > 0) {
          float lo = before;
          float hi = t;
          float under = d;
          for (int j = 0; j < 3; j++) {
            t = 0.5 * (lo + hi);
            p = ro + rd * t;
            float dm = p.y - seaTop(p, false);
            if (dm < 0.0) {
              hi = t;
              under = dm;
            } else {
              lo = t;
              over = dm;
            }
          }
          t = lo + (hi - lo) * over / (over - under);
        }
        found = true;
        break;
      }
      before = t;
      over = d;
      t += max(0.9 * d, 4.0 + 0.022 * t) / fall;
      p = ro + rd * t;
      if (t > far || (rd.y > 0.0 && p.y > BANK_TOP)) {
        out_ = true;
        break;
      }
    }
    // Far out the deck is looked at so low that only its heads are seen, one row behind another. There the ray asks at fixed
    // distances from the lens, an eighth farther each time and the same for every ray, whether it is inside a head: the rows it finds
    // are whole and smooth along their tops, and a head between two of them is passed over, which so far off is not seen.
    if (!found && !out_) {
      float k = ceil(log(max(t, 400.0) / 400.0) / 0.12);
      for (int i = 0; i < 32; i++) {
        float ts = 400.0 * exp(0.12 * (k + float(i)));
        if (ts > far || ts > 16000.0) break;
        p = ro + rd * ts;
        if (rd.y > 0.0 && p.y > BANK_TOP) break;
        seaLod = log2(ts * seaPix);
        float d = p.y - seaTop(p, (i & 1) == 0);
        if (d < 0.0) {
          float lo = before;
          float hi = ts;
          float under = d;
          for (int j = 0; j < 3; j++) {
            t = 0.5 * (lo + hi);
            p = ro + rd * t;
            float dm = p.y - seaTop(p, false);
            if (dm < 0.0) {
              hi = t;
              under = dm;
            } else {
              lo = t;
              over = dm;
            }
          }
          t = lo + (hi - lo) * over / (over - under);
          found = true;
          break;
        }
        before = ts;
        over = d;
        t = ts;
      }
    }
    p = ro + rd * t;
    // A ray that has not come down to it by then meets it far out, where it is level.
    // Where the ray comes to land that lies under the deck's own level, in a hollow between two heads, the hollow is not empty:
    // thin cloud lies in it, the thicker the deeper the land stands under the level. Without it the land shows as pale floes.
    if (!found && far < 50000.0) {
      vec3 h = ro + rd * far;
      seaLod = log2(max(far, 30.0) * seaPix);
      float top = seaTop(h, true);
      float sunk = top - seaTall * seaN - h.y;
      if (sunk > 0.0) {
        seaCover = smoothstep(0.0, 60.0, sunk);
        t = far - 0.5;
        found = true;
      }
    }
    if (!found && rd.y < -1e-4) {
      t = max(t, (ridgeAt(p.x).y - CLOUD_UNDER - ro.y) / rd.y);
      found = true;
    }
    if (found && t < far) seaAt = t;
  }
`;

/** In main, after the storm's air is measured: the deck's light, laid over what stands behind it. */
export const SEA_SHADE_GLSL = /* glsl */ `
  if (seaAt > 0.0 && through > 0.01) {
    float t = seaAt;
    vec3 p = ro + rd * t;
    seaLod = log2(max(t, 30.0) * seaPix);
    float az = atan(rd.z, rd.x);
    float dip = asin(clamp(-rd.y, 0.0, 1.0));
    // The march walked to the heaps; the billows on them are found from there, two short strides along the ray. The deck's level
    // and its swell are kept from that place: only the heaps and their billows are read again.
    seaLod = log2(max(t, 30.0) * seaPix);
    float level = seaLevel;
    float tall = seaTall;
    if (seaLod < 0.5 && seaCover <= 0.0) {
      float slant = max(-rd.y, 0.0) + 0.45;
      for (int i = 0; i < 2; i++) {
        t += clamp((p.y - level - tall * seaLift(p, 1, false)) / slant, -60.0, 60.0);
        p = ro + rd * t;
      }
      seaLod = log2(max(t, 30.0) * seaPix);
    }
    float n0 = seaLift(p, 1, false);
    // 0 on the floor of a hollow, 1 on the crown of a head.
    float head = smoothstep(-0.12, 0.34, seaHead);
    // The way a face of it looks, from the heights a little way off on two hands: wider with the distance, as the lens sees less of it.
    float e = 5.0 + 0.012 * t;
    vec3 facing = normalize(vec3(tall * (n0 - seaLift(p + vec3(e, 0.0, 0.0), 1, false)), e, tall * (n0 - seaLift(p + vec3(0.0, 0.0, e), 1, false))));
    // What a baked heap cannot have: the grain of real cloud. The picture of a deck seen from above (mat/cloudsea-nh: its slope in red and
    // green, its height in blue) lies on the heaps at two sizes and goes with them, the smaller a little faster, so that the tops change
    // as they travel. Its slope turns the faces, so the small billows take the dusk on one side; its height tells crown from crease.
    vec2 g1 = (p.xz - vec2(0.42, 0.91) * (uTime * 31.0)) / 3400.0;
    vec2 g2 = (p.xz - vec2(0.2, 0.98) * (uTime * 39.0)) / 980.0;
    vec3 grainA = textureLod(tSeaNh, vec2(0.891 * g1.x + 0.454 * g1.y, -0.454 * g1.x + 0.891 * g1.y), max(seaLod + 1.6, 1.0)).rgb;
    vec3 grainB = textureLod(tSeaNh, vec2(0.629 * g2.x - 0.777 * g2.y, 0.777 * g2.x + 0.629 * g2.y) + 0.37, max(seaLod + 3.4, 1.0)).rgb;
    // The smaller grain is gone where the lens cannot hold it: far out the deck keeps only its banks.
    float fineSeen = 1.0 - smoothstep(-1.0, 1.5, seaLod);
    vec2 tilt = (grainA.rg - 0.5) * 1.5 + (grainB.rg - 0.5) * (1.1 * fineSeen);
    float grain = 0.62 * (grainA.b - 0.5) + 0.38 * fineSeen * (grainB.b - 0.5);
    facing = normalize(facing + vec3(0.891 * tilt.x - 0.454 * tilt.y, 0.0, 0.454 * tilt.x + 0.891 * tilt.y) * GRAIN_TILT);
    head = clamp(head + GRAIN_HEAD * grain, 0.0, 1.0);
    // The last light comes low over the deck from the dusk: a face that looks at it is lit, a face turned away is in its own shade, and a
    // head that stands between a place and the dusk shades it. Cloud is lit through, so the light goes a little round each head.
    vec3 toDusk = vec3(cos(DUSK_AZ), 0.0, sin(DUSK_AZ));
    vec3 toLight = normalize(toDusk + vec3(0.0, 0.24, 0.0));
    float r1 = 110.0 + 0.02 * t;
    float rise = tall * (seaLift(p + toDusk * r1, 0, false) - n0) / r1;
    float open = 1.0 - smoothstep(0.04, 0.42, rise);
    float dusk = clamp(0.22 + 0.78 * dot(facing, toLight), 0.0, 1.0) * open;
    // The sky from above reaches a crown whole and the floor of a hollow hardly at all: the hollows are deep blue-violet.
    float above = (0.3 + 0.7 * facing.y) * (0.03 + 0.97 * head * head);
    vec3 cold = SEA_COLD * (0.03 + 2.05 * above + 1.75 * dusk * (0.12 + 0.88 * head)) * mix(vec3(0.62, 0.74, 1.24), vec3(0.97, 0.98, 1.03), head);
    // The side of a head that looks at the dusk has a warm rim.
    float rim = clamp(dot(facing, toDusk) * 1.6, 0.0, 1.0);
    vec3 warm = SEA_WARM * dusk * (0.1 + 0.9 * head) * (0.4 + 2.4 * rim * rim) * (1.0 - 0.7 * stormSide(rd));
    vec3 sea = cold + warm;
    // A top of cloud is no surface: where the ray would leave the head again a little way on, it has gone through wisps and not into
    // cloud. How deep it stands under the top at two places ahead says how much cloud it met; the grain tears the edge.
    float slantF = max(-rd.y, 0.06);
    float thick = 0.0;
    for (int i = 0; i < 2; i++) {
      float deep = i == 0 ? 14.0 : 48.0;
      vec3 pf = p + rd * (deep / slantF);
      thick += clamp((level + tall * seaLift(pf, 0, false) - pf.y) / deep, -1.0, 1.5);
    }
    float feather = smoothstep(0.1, 1.5, thick + 1.1 * grain + 0.25);
    sea = mix(SEA_COLD * (1.0 + 0.9 * dusk) * vec3(0.95, 1.0, 1.1) + SEA_WARM * dusk * (0.5 - 0.35 * stormSide(rd)), sea, 0.35 + 0.65 * feather);
    // The air over the deck is thick with its own vapour: row behind row the heads go paler and bluer and their hollows fill.
    // (The vapour takes the contrast of a far bank and leaves its form: the banks of the real deck are read large there, lit on top.)
    float farBank = 0.62 + 0.76 * grainA.b;
    sea = mix(sea, (SEA_COLD * vec3(0.95, 1.0, 1.1) + 0.2 * SEA_WARM * (1.0 - stormSide(rd))) * farBank, 0.8 * (1.0 - exp(-t / (6000.0 * seaLens * seaLens))));
    // Toward the storm the deck lies under the wall, darker; it takes the flash and each strike.
    float lit = clamp(cloudLit(ro, normalize(vec3(rd.x, 0.03, rd.z))) + 0.12 * min(dot(uFlash, vec3(0.33)), 1.0) * stormSide(rd), 0.0, 1.5);
    sea = sea * (1.0 - 0.5 * stormSide(rd)) * mix(vec3(1.0), vec3(0.8, 0.88, 1.06), stormSide(rd)) * (1.0 + 0.7 * lit) + vec3(0.05, 0.035, 0.1) * lit * 0.5 + min(strikeLight(p) * 0.02, vec3(0.01));
    // In the flash of a stroke the heads of the deck that stand up toward the channel are lit and its hollows are not.
    if (uStrikeAt.w > 0.0) {
      vec3 toStroke = uStrikeAt.xyz - p;
      float span2 = dot(toStroke, toStroke);
      sea += STRIKE_COLOUR * (uStrikeTop.w * 0.07 * head * head * (0.6 + 0.6 * facing.y) / (1.0 + span2 / 4.0e6));
    }
    // At the horizon it goes into the dome's own cloud.
    float gone = 1.0 - exp(-t * t / (1.1e8 * seaLens * seaLens * seaLens));
    // The sky's foot is read only where the deck goes into it: near the lens on the dusk side it has no part.
    float toWall = stormSide(rd) * 0.6 * (1.0 - exp(-t / 5000.0));
    bool needFoot = gone > 0.003 || toWall > 0.003 || uPlate.w > 0.0;
    vec3 domeFar = needFoot ? skyCloud(ro, normalize(vec3(rd.x, 0.0003, rd.z)), 0.0) : vec3(0.0);
    // Behind the long lens of the strike the sea is the picture's own: the surface here only rolls it, and far out it is the picture alone.
    vec2 uvP = vec2(0.0);
    float plate = uPlate.w > 0.0 ? plateAt(az, -dip, uvP) : 0.0;
#if PLATE == 1
    if (plate > 0.0) {
      vec3 seaP = skyCloud(ro, rd, 0.0);
      sea = mix(sea, seaP * (0.55 + 0.9 * head * head) * (0.75 + 0.5 * dusk), plate);
      domeFar = mix(domeFar, seaP, plate);
      gone = mix(gone, smoothstep(2500.0, 7000.0, t), plate);
    }
#endif
    // The last rows are the sky's own value at its foot, read as sharp as the sky over them, and keep a little of their shape under
    // it: the band of the dusk lies on them, and no line stands between the deck and the sky.
    float crown = mix(head, clamp(0.5 + 1.6 * n0, 0.0, 1.0), smoothstep(0.5, 2.5, seaLod));
    float shape = mix(0.66 + 0.62 * crown * (0.4 + 0.6 * dusk), 1.0, 1.0 - exp(-t * t / (9.0e8 * seaLens * seaLens)));
    // The far deck is cloud to the last: it pales and takes a share of the dusk's own colour as the air thickens, and only in its last
    // sliver under the horizon is it the sky's foot. Given the foot's colour two degrees deep it lay there as a level of bright water.
    if (needFoot) {
      sea = mix(sea, mix(SEA_COLD * vec3(1.2, 1.25, 1.4), domeFar, 0.42) * shape * mix(farBank, 1.0, 1.0 - exp(-t * t / (9.0e8 * seaLens * seaLens))), gone);
      sea = mix(sea, domeFar, plate > 0.0 ? gone : 1.0 - exp(-t * t / (1.3e9 * seaLens * seaLens * seaLens)));
    }
    stormAir *= 1.0 - gone;
    seaGone = gone;
    // Under the storm wall the sea goes into the wall's own foot: no line stands between them.
    if (needFoot) sea = mix(sea, domeFar, toWall);
    // Its edge against the land is soft: the cloud thins where it laps the rock.
    float lap = 0.94 * max(smoothstep(0.0, 1.0, (far - t) / (220.0 + 0.07 * t) + 0.35 * grain), seaCover);
    light += through * sea * lap;
    through *= 1.0 - lap;
    far = min(far, t);
  }
`;
