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
// On the storm's side the deck climbs into the storm: by so much, kilometres out, and to so much over the height the dusk side stops at.
const float WALL_RISE = 1000.0;
const float WALL_TOP = 1100.0;
// The top of the cloud under the crest: far out the sea itself, billowed; against the lee of the ridge a bank some hundreds of metres under the crest,
// so that the flank goes down into cloud; and in the saddles the storm's cloud, which comes over the crest and falls down the lee into the bank.
const float CLOUD_UNDER = 130.0;
// Out from the ridge the deck falls away: it is banked against the rock and lies this much deeper a kilometre off, so that the lens on
// the crest looks down into it.
const float CLOUD_DEEP = 360.0;
// The rock goes into the deck's mist from this far under the crest, and is gone in it this much deeper, metres.
const float MIST_FROM = 85.0;
const float MIST_RISE = 150.0;
// seaLod is how small the deck is read at a place, by its distance: 0 at 2.9 km, one more for each doubling, under 0 nearer.
// The deck's own light: what the sky gives its heads, and what the dusk gives the faces that look at it.
const vec3 SEA_COLD = vec3(0.115, 0.125, 0.18);
const vec3 SEA_WARM = vec3(0.3, 0.165, 0.09);
// The heaps of the deck (air/heaps.ts): metres a repeat, and metres from the floor of a hollow to the crown of a head.
const float HEAP_SPAN = 2300.0;
const float HEAP_TALL = 180.0;
// How far the grain of the real deck turns a face of a heap, and how far it moves a place between hollow and crown.
const float GRAIN_TILT = 0.5;
const float GRAIN_HEAD = 0.9;
// Metres of the mist over the tops that hide two thirds of what lies behind.
const float MIST_LONG = 240.0;
// What the deck takes of a stroke's key (the land's uStrikeAt): its share, the metres past which it falls off with the square of
// the distance, and the radiance it closes on.
const float SEA_KEY = 0.05;
const float SEA_KEY_REACH = 1800.0;
const float SEA_KEY_CEIL = 0.3;
// The puffs on the heaps are cut from the storm's own noise (its red: round lumps at three sizes), which is a body and not a
// picture: it flows through the heaps down the gale faster than they travel, and upward, so a head's top turns over as it goes.
// Metres a repeat, their height as a share of a heap's, and metres a second along the gale and upward.
const float PUFF_SPAN = 600.0;
const float PUFF_TALL = 0.4;
const float PUFF_RUN = 78.0;
const float PUFF_CLIMB = 13.0;
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
// Left by the march: how much of the mist that lies over the tops the ray went through on its way (metres of it), and the same weighted
// by the distance, so that the place of it can be found.
float seaMist = 0.0;
float seaMistAt = 0.0;
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
    // (Read at one size: they are there only as far as the lens holds them, and fade out with the distance.)
    float seen = 1.0 - smoothstep(-0.8, 1.2, seaLod);
    if (seen > 0.0) {
      float puff = (noise(vec3(p.x - 0.2 * PUFF_RUN * uTime, p.y - PUFF_CLIMB * uTime, p.z - 0.98 * PUFF_RUN * uTime) / PUFF_SPAN).r - 0.5) * seen;
      n += PUFF_TALL * puff * (0.3 + 1.2 * heap.r);
      seaHead += 0.34 * puff;
    }
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
  // (In the storm the heads are low and broad: the deck climbs there, the lens looks at its face, and a steep head on a steep face is
  // stepped over by the march.)
  float calm = lee < 0.0 ? 1.0 - 0.9 * smoothstep(200.0, 1300.0, -lee) : 1.0;
  seaTall = HEAP_TALL * calm * (1.0 + (n > 0.0 ? range : 0.0));
  float lift = HEAP_TALL * calm * (n + 0.1 * out_ + range * max(n, 0.0)) + 40.0 * bank;
  // On the storm's side it dips a little under the crest and then climbs into the storm, a dark wall and no level: left level there it
  // lay to the horizon as a ruled plane. The dusk side is as it was.
  float wall = lee < 0.0 ? smoothstep(350.0, 5200.0, -lee) : 0.0;
  // Beside the ridge no billow stands over the crest: a head that rolled up there stood as a dark hill before the spires for a quarter
  // of a second. A head that would is pressed down, the more the higher it reaches, and keeps its shape; farther out the deck may
  // heap as it likes.
  float room = CLOUD_UNDER - 28.0 + 0.2 * max(abs(lee) - 200.0, 0.0) + 0.5 * WALL_RISE * wall;
  if (lift > 0.4 * room) {
    float press = exp(-(lift - 0.4 * room) / (0.6 * room));
    seaTall *= press;
    lift = room - 0.6 * room * press;
  }
  // Kilometres out it stands up again: the lens looks down into a trough of the deck and across it to banks at its own height. Left
  // low to the horizon, the last of it was a level dark band under the sky with a ruled edge, like water.
  // (By the place alone and not by the long swell: the march reads the swell at every other stride and keeps it between, and a
  // height that hung on it stood in terraces, one to a stride.)
  float back = smoothstep(3500.0, 8500.0, abs(lee));
  float top = ridge.y - CLOUD_UNDER - CLOUD_DEEP * smoothstep(150.0, 2000.0, abs(lee)) * (1.0 - 0.8 * back) * (1.0 - wall) + WALL_RISE * wall + lift;
  // The tallest of the far heads stop short of the height nothing of this cloud stands over, rounded and not cut.
  float ceil_ = BANK_TOP + WALL_TOP * wall;
  float high = top - (ceil_ - 170.0);
  if (high > 0.0) top = ceil_ - 170.0 + 160.0 * (1.0 - exp(-high / 160.0));
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
// How much of what lies behind the mist it hides, and its place along the ray. The grain of the real deck tears it.
float seaVeil(vec3 ro, vec3 rd, out float at) {
  at = seaMistAt / max(seaMist, 1e-3);
  vec3 pm = ro + rd * at;
  vec2 gm = (pm.xz - vec2(0.2, 0.98) * (uTime * 39.0)) / 1700.0;
  float torn = textureLod(tSeaNh, vec2(0.629 * gm.x - 0.777 * gm.y, 0.777 * gm.x + 0.629 * gm.y) + 0.61, max(log2(max(at, 30.0) * seaPix) + 2.6, 1.0)).b;
  return 1.0 - exp(-seaMist * (0.45 + 1.5 * smoothstep(0.15, 0.95, torn)) / MIST_LONG);
}
// Kilometres out the deck is not walked to as a surface: it is a body of cloud, asked at eight distances from the lens (a sixth
// farther each time, the same for every ray) how thick it stands there. Its towers are cut from the storm's noise in the world, so
// they pass one before another as the lens moves, drift down the gale and turn over upward; the long swell of the real deck says
// where a range of them stands and where a gap lies. Each is lit on its crown and dark in its body. rgb: light, a: what they hide.
const float CROWN_SPAN = 6800.0;
const float CROWN_TALL = 200.0;
vec4 seaCrowns(vec3 ro, vec3 rd, float until) {
  vec3 c = vec3(0.0);
  float kept = 1.0;
  // (From a little under the height the deck's own far heads stop at, upward: that height is a level, and stood as a ruled line.
  // Under it the deck is the walked surface's and they have no body: laid over its hollows they were a slab.)
  float base = BANK_TOP - 60.0;
  vec2 round_ = rd.xz * inversesqrt(max(dot(rd.xz, rd.xz), 1e-6));
  float toDusk = max(dot(round_, vec2(cos(DUSK_AZ), sin(DUSK_AZ))), 0.0);
  vec3 pale = SEA_COLD * vec3(1.05, 1.1, 1.26) + SEA_WARM * (0.12 + 0.3 * toDusk * toDusk);
  // Toward the heart of the dusk they are low mounds: the band lies clear over them, and a tower before a gap in the far spires
  // filled the gap.
  float low = 1.0 - 0.75 * smoothstep(0.78, 0.97, toDusk);
  vec3 dark = SEA_COLD * vec3(0.4, 0.46, 0.66);
  for (int i = 0; i < 8; i++) {
    float ts = 5000.0 * exp(0.16 * float(i));
    if (ts > until) break;
    vec3 p = ro + rd * ts;
    float h = (p.y - base) / CROWN_TALL;
    if (h > 1.6 || h < -0.6) continue;
    vec2 at = p.xz - vec2(0.42, 0.91) * (uTime * 31.0);
    float range = textureLod(tSeaNh, at / 11000.0 + 0.27, 3.0).b;
    vec4 body = noise(vec3(at.x / CROWN_SPAN, p.y / (0.5 * CROWN_SPAN) - uTime * 0.004, at.y / CROWN_SPAN));
    // A tower stands only where the noise is at its fullest: between two of them the deck is low and the band of the dusk is seen over
    // it. Its fine billows (the noise's blue) bite its outline and model its face.
    float billow = body.b - 0.5;
    float inside = smoothstep(0.38, 0.75, range) * 1.5 * smoothstep(0.4, 0.8, body.r) * low + 0.2 * billow - max(h, 0.0);
    float thick = smoothstep(0.0, 0.3, inside) * smoothstep(-0.6, -0.1, h) * smoothstep(4400.0, 6200.0, ts);
    if (thick <= 0.0) continue;
    // Its crown takes the sky and the dusk and its foot is in the shade of the row before it (by its height, not by its edge: lit
    // round its edge, each tower was a pale ring). The rows behind go into the air's slate, as the deck under them does.
    float up = smoothstep(-0.3, 1.0, h);
    vec3 tone = pale * (0.55 + 0.4 * up - 0.15 * smoothstep(0.1, 0.7, inside)) * (1.0 + 0.7 * billow);
    tone = mix(tone, dark * (0.8 + 0.5 * up) * (1.0 + 0.5 * billow), 1.0 - exp(-ts * ts / 5.0e7));
    tone += STRIKE_COLOUR * min(uStrikeTop.w * 0.02, 0.04) * up;
    c += kept * thick * tone;
    kept *= 1.0 - thick;
    if (kept < 0.02) break;
  }
  return vec4(c, 1.0 - kept);
}
`;

/** In main, first: the march of the view ray to the deck. It leaves seaAt, the distance to it, or under zero. */
export const SEA_MARCH_GLSL = /* glsl */ `
  // The cloud under the crest: a surface with a soft top, found by walking to it.
  float seaAt = -1.0;
  // Whether the ray came to a head of the deck, or only to the level it lies at far out.
  float seaCeil = BANK_TOP + (rd.z < 0.0 ? WALL_TOP : 0.0);
  float tSea = ro.y > seaCeil ? (rd.y < -1e-4 ? (seaCeil - ro.y) / rd.y : 1e9) : 0.0;
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
      float stride = max(0.9 * d, 4.0 + 0.022 * t) / fall;
      // Over every top lies mist, thinning upward: a ray that passes low over a head goes a long way through it and a ray that falls
      // steeply into one hardly any. The march's own strides add it up, so a head has no cut edge against what stands behind it.
      float soft = 18.0 + 0.02 * t;
      // (Only near: far out a stride is longer than a head is wide, and the sum of a few of them changed from one pixel row to the next, as dashes.)
      float w = max(1.0 - d / soft, 0.0) * min(stride, 2.0 * soft) * exp(-t * t / 8.0e5);
      seaMist += w;
      seaMistAt += w * t;
      t += stride;
      p = ro + rd * t;
      if (t > far || (rd.y > 0.0 && p.y > seaCeil)) {
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
        if (rd.y > 0.0 && p.y > seaCeil) break;
        // The rows stand an eighth of their distance apart, and a head narrower than that was met by some rays and stepped over by their
        // neighbours: it stood as a slab with stepped sides. So the heaps are read here no finer than a row can find them.
        seaLod = log2(ts * seaPix) + 2.6;
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
      // And over the level the deck's mist climbs the flank: the rock goes down into it and is not cut by it.
      // (By its depth under the crest, whatever the deck does there: the flank is built to go into cloud and not to be seen low.)
      float sunk = max(top - seaTall * seaN - h.y, ridgeAt(h.x).y - MIST_FROM - h.y);
      if (sunk > 0.0) {
        seaCover = 1.0 - exp(-sunk * sunk / (0.55 * MIST_RISE * MIST_RISE));
        t = far - 0.5;
        found = true;
      }
    }
    if (!found && rd.y < -1e-4) {
      t = max(t, (ridgeAt(p.x).y - CLOUD_UNDER - CLOUD_DEEP - ro.y) / rd.y);
      found = true;
    }
    if (found && t < far) seaAt = t;
  }
`;

/** In main, after the storm's air is measured: the deck's light, laid over what stands behind it. */
export const SEA_SHADE_GLSL = /* glsl */ `
  // The far towers of the deck stand before whatever the ray meets behind them: the deck's own far level, the land, the sky.
  // (Not behind the long lens of the strike: its few degrees hold one tower, which stood in the picture's dark sky as a pale ball.)
  if (uShow.y > 0.0 && rd.y > -0.075 && rd.y < 0.06 && through > 0.01 && stormSide(rd) < 0.98 && uInvProjection[1][1] > 0.29) {
    vec4 crowns = seaCrowns(ro, rd, seaAt > 0.0 ? min(seaAt, far) : far);
    float hid = crowns.a * (1.0 - stormSide(rd));
    light += through * crowns.rgb * (1.0 - stormSide(rd));
    through *= 1.0 - hid;
  }
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
    // Where the deck has climbed into the storm it is the storm's own cloud: dark, soft, without the dusk.
    // (Some way off only: close under the lens the deck on that side is the deck as on the other. Dark from the ridge's foot, it lay
    // at the foot of the first spire's cliff as a dark wedge.)
    // (Not where the lens looks into the dusk itself: the deck beyond the ridge, seen there between two far spires, is lit by the dusk
    // before it and takes the air's pale haze as they do. Dark as the wall's foot, it stood between them as a notch of blue water.)
    float intoDusk = dot(rd.xz, vec2(cos(DUSK_AZ), sin(DUSK_AZ))) * inversesqrt(max(dot(rd.xz, rd.xz), 1e-6));
    float wallAt = smoothstep(150.0, 1400.0, ridgeAt(p.x).x - p.z) * smoothstep(500.0, 2000.0, t);
    float inWall = wallAt * (1.0 - smoothstep(0.6, 0.9, intoDusk));
    float inStorm = max(stormSide(rd), inWall);
    float head = mix(smoothstep(-0.2, 0.55, seaHead), 0.45, 0.5 * inWall);
    // The way a face of it looks, from the heights a little way off on two hands: wider with the distance, as the lens sees less of it.
    float e = 5.0 + 0.012 * t;
    vec3 facing = normalize(vec3(tall * (n0 - seaLift(p + vec3(e, 0.0, 0.0), 1, false)), e, tall * (n0 - seaLift(p + vec3(0.0, 0.0, e), 1, false))));
    // What a baked heap cannot have: the grain of real cloud. The picture of a deck seen from above (mat/cloudsea-nh: its slope in red and
    // green, its height in blue) lies on the heaps at two sizes and goes with them, the smaller a little faster, so that the tops change
    // as they travel. Its slope turns the faces, so the small billows take the dusk on one side; its height tells crown from crease.
    vec2 g1 = (p.xz - vec2(0.42, 0.91) * (uTime * 31.0)) / 3400.0;
    vec2 g2 = (p.xz - vec2(0.2, 0.98) * (uTime * 39.0)) / 980.0;
    vec3 grainA = textureLod(tSeaNh, vec2(0.891 * g1.x + 0.454 * g1.y, -0.454 * g1.x + 0.891 * g1.y), max(seaLod + 1.6, 2.2)).rgb;
    vec3 grainB = textureLod(tSeaNh, vec2(0.629 * g2.x - 0.777 * g2.y, 0.777 * g2.x + 0.629 * g2.y) + 0.37, max(seaLod + 3.4, 2.6)).rgb;
    // The smaller grain is gone where the lens cannot hold it: far out the deck keeps only its banks.
    float fineSeen = 1.0 - smoothstep(-1.0, 1.5, seaLod);
    vec2 tilt = (grainA.rg - 0.5) * 1.5 + (grainB.rg - 0.5) * (1.1 * fineSeen);
    // (And the larger goes soft far out, where the march finds a head only to an eighth of its distance: sharp there, it showed each row as a cut slab.)
    float coarseSeen = (1.0 - 0.8 * smoothstep(0.0, 2.5, seaLod)) * (1.0 - 0.8 * inWall);
    tilt *= coarseSeen;
    float grain = (0.62 * (grainA.b - 0.5) + 0.38 * fineSeen * (grainB.b - 0.5)) * coarseSeen;
    facing = normalize(facing + vec3(0.891 * tilt.x - 0.454 * tilt.y, 0.0, 0.454 * tilt.x + 0.891 * tilt.y) * GRAIN_TILT);
    float headBroad = clamp(head + 0.3 * GRAIN_HEAD * grain, 0.0, 1.0);
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
    vec3 cold = SEA_COLD * (0.03 + 2.05 * above + 1.75 * dusk * (0.12 + 0.88 * head)) * mix(vec3(0.5, 0.68, 1.3), vec3(0.97, 0.98, 1.03), head);
    // The crown of a head that the dusk reaches is warm.
    // (By the crown of the heap and by what stands between it and the dusk, and not by the way each billow faces: lit by its facing,
    // the warm lay on the deck as thin bright crescents, one to a billow, which read as specks.)
    vec3 warm = SEA_WARM * (0.15 + 0.85 * open) * (0.06 + 0.94 * headBroad * headBroad) * 1.8 * (1.0 - 0.7 * inStorm);
    vec3 sea = cold + warm;
    // What lies deep under the crest lies in the shade of the ridge and of the banks round it: the hollows down there are dark blue
    // and only the heads stand pale in the last light. It is this, more than its height, that tells the lens how far down the deck is.
    float deep = smoothstep(70.0, 420.0, ridgeAt(p.x).y - p.y);
    vec3 shade = mix(vec3(1.0), vec3(0.3, 0.42, 0.85), max(deep, 0.5) * (1.0 - 0.8 * head));
    sea *= shade;
    // The mist the ray came through over the heads before this one: pale and warm toward the dusk, cold toward the storm.
    vec3 mistTone = mix(SEA_COLD * vec3(1.55, 1.55, 1.4) + 0.55 * SEA_WARM, SEA_COLD * vec3(1.55, 1.65, 1.95), inStorm);
    // On the rock over the deck it is mist alone, torn by the grain; only deep under the level is it the deck's own cloud.
    if (seaCover > 0.0) {
      sea = mix(mistTone * (0.8 + 0.5 * head) * mix(vec3(1.0), shade, 0.7), sea, seaCover * seaCover);
      seaCover = clamp(seaCover * (1.0 + 1.0 * grain * (1.0 - seaCover)), 0.0, 1.0);
    }
    if (seaMist > 0.0) {
      float mistAt;
      sea = mix(sea, mistTone, 0.48 * seaVeil(ro, rd, mistAt));
    }
    // The air over the deck is thick with its own vapour: row behind row the heads go paler and bluer and their hollows fill.
    // (The vapour takes the contrast of a far bank and leaves its form: the banks of the real deck are read large there, lit on top.)
    float farBank = 0.62 + 0.76 * grainA.b;
    // Kilometres out the lens looks along the deck, and heads laid on a level lie down there to dashes: ripples on water. There the
    // deck is the real deck's own picture, which was taken as low, laid round the lens by bearing and by dip: its banks stand row
    // behind row as they stood for that camera, large and soft, and drift down the gale. (Four pictures round the circle, each the mirror
    // of the next, so no seam stands anywhere before a short lens.)
    float lowSeen = smoothstep(3000.0, 8500.0, t) * (1.0 - inStorm);
    if (lowSeen > 0.0) {
      float turnP = az * 1.27324 + uTime * 0.0011;
      // (A long lens sees a few degrees of it: the picture is laid finer for it, or one bank filled the frame.)
      float finer = pow(seaLens, 0.6);
      // (Behind the long lens its rows are read larger and softer: thin and sharp there they were ripples on water.)
      float longP = clamp(seaLens - 1.6, 0.0, 1.0);
      float downP = 0.13 + mix(3.0, 2.2, longP) * finer * tan(dip);
      vec2 uvLow = vec2(abs(fract(0.5 * turnP * finer) * 2.0 - 1.0), 1.0 - abs(fract(0.5 * downP) * 2.0 - 1.0));
      float bankP = dot(textureLod(tDeck, uvLow, 1.5 + 0.8 * longP).rgb, vec3(0.3, 0.5, 0.2)) / 0.135;
      farBank = mix(farBank, mix(0.2 + 0.85 * bankP * bankP, 0.3 + 0.62 * bankP * bankP, longP), lowSeen);
    }
    // (What the air's own vapour does not pale is the deck in the dusk under a dark sky: slate, its banks told by a little light on
    // their tops. Paled whole, behind a long lens and far from any stroke it lay under the dark sky as a lit plane, like open water.)
    // (Only behind the long lens of the strike, where the sky is the picture's: slate under the paler dusk of the plain it stood
    // between the far spires as a notch of blue water.)
    vec2 uvP = vec2(0.0);
    float plate = uPlate.w > 0.0 ? plateAt(az, -dip, uvP) : 0.0;
    float paled = 0.8 * (1.0 - exp(-t / (6000.0 * seaLens * seaLens)));
    float hazed = max(paled, 0.85 * lowSeen);
    vec3 farTone = mix(SEA_COLD * vec3(0.3, 0.34, 0.43) * (0.55 + 0.45 * farBank), (SEA_COLD * vec3(0.95, 1.0, 1.1) + 0.2 * SEA_WARM * (1.0 - inStorm)) * farBank, mix(1.0, clamp(paled / max(hazed, 1e-4), 0.0, 1.0), plate));
    sea = mix(sea, farTone, hazed);
    // Toward the storm the deck lies under the wall, darker; it takes the flash and each strike.
    float lit = clamp(cloudLit(ro, normalize(vec3(rd.x, 0.03, rd.z))) + 0.12 * min(dot(uFlash, vec3(0.33)), 1.0) * inStorm, 0.0, 1.5);
    sea = sea * (1.0 - 0.5 * inStorm) * mix(vec3(1.0), vec3(0.8, 0.88, 1.06), inStorm) * (1.0 + 0.7 * lit) + vec3(0.05, 0.035, 0.1) * lit * 0.5 + min(strikeLight(p) * 0.02, vec3(0.01));
    // In the flash of a stroke the heads of the deck that stand up toward the channel are lit and its hollows are not.
    // (By the light the storm's cloud keeps of a stroke, which builds and dies over some frames, and to kilometres off: the whole deck
    // answers a strike, its tops most. Lit only close under the channel and only on the stroke's own frame, the sea kept its exposure
    // through a flash.)
    vec3 flare = vec3(0.0);
    if (uStrikeTop.w > 0.0) {
      vec2 toStroke = uStrikeTop.xz - p.xz;
      float span2 = dot(toStroke, toStroke);
      // The stroke's key, from the channel by direction as the land takes it (uStrikeAt): cloud is lit through, so it goes more
      // than half round a head, and the hollows behind the heads stay in the dusk. It closes on a ceiling: the deck goes pale in a
      // stroke and never white.
      vec3 toKey = uStrikeAt.xyz - p;
      float key2 = dot(toKey, toKey);
      float faceS = clamp((dot(facing, toKey) * inversesqrt(max(key2, 1.0)) + 0.6) / 1.6, 0.0, 1.0);
      float keyS = uStrikeAt.w * SEA_KEY * faceS * faceS * (0.08 + 0.92 * head * head) / (1.0 + key2 / (SEA_KEY_REACH * SEA_KEY_REACH));
      float fillS = min(uStrikeTop.w * 0.05 * (0.2 + 0.8 * head) * (0.6 + 0.6 * facing.y) * (0.35 + 0.65 / (1.0 + span2 / 9.0e6)), 0.09);
      float sumS = keyS + fillS;
      flare = STRIKE_COLOUR * vec3(0.86, 0.84, 1.0) * (sumS / (1.0 + sumS / SEA_KEY_CEIL));
      sea += flare;
    }
    // At the horizon it goes into the dome's own cloud.
    float gone = 1.0 - exp(-t * t / (1.1e8 * seaLens * seaLens * seaLens));
    // The sky's foot is read only where the deck goes into it: near the lens on the dusk side it has no part.
    // (By the way the lens looks and not by where the deck stands: looked at from a spire toward the dusk, the deck under the storm
    // given the sky's foot whole lay at the cliff's foot as a flat dark wedge.)
    float toWall = stormSide(rd) * (1.0 - exp(-t / 1500.0));
    bool needFoot = gone > 0.003 || toWall > 0.003 || uPlate.w > 0.0;
    // (Read soft: read sharp, each mass of the sky's foot stood on the deck as an upright streak under itself, like a reflection in water.)
    vec3 domeFar = needFoot ? skyCloud(ro, normalize(vec3(rd.x, 0.0003, rd.z)), 2.5) : vec3(0.0);
    // Behind the long lens of the strike the sea is the picture's own: the surface here only rolls it, and far out it is the picture alone.
#if PLATE == 1
    if (plate > 0.0) {
      vec3 seaP = skyCloud(ro, rd, 0.0);
      // (A share of it: the picture's own sea is a dark level, and the deck's banks stand in it to the last.)
      sea = mix(sea, seaP * (0.55 + 0.9 * head * head) * (0.75 + 0.5 * dusk), 0.35 * plate);
      domeFar = mix(domeFar, seaP, plate);
      gone = mix(gone, smoothstep(6000.0, 16000.0, t), plate);
    }
#endif
    // The last rows are the sky's own value at its foot, read as sharp as the sky over them, and keep a little of their shape under
    // it: the band of the dusk lies on them, and no line stands between the deck and the sky.
    float crown = mix(head, clamp(0.5 + 1.6 * n0, 0.0, 1.0), smoothstep(0.5, 2.5, seaLod));
    float shape = mix(0.66 + 0.62 * crown * (0.4 + 0.6 * dusk), 1.0, 1.0 - exp(-t * t / (9.0e8 * seaLens * seaLens)));
    // (Behind the long lens the rows the march finds are thin level lines: the banks there are the deck picture's alone.)
    shape = mix(shape, 1.0, 0.8 * plate);
    // The far deck is cloud to the last: it pales and takes a share of the dusk's own colour as the air thickens, and only in its last
    // sliver under the horizon is it the sky's foot. Given the foot's colour two degrees deep it lay there as a level of bright water.
    if (needFoot) {
      sea = mix(sea, mix(mix(SEA_COLD * vec3(1.2, 1.25, 1.4), SEA_COLD * vec3(0.3, 0.34, 0.44), plate), domeFar, 0.42) * shape * mix(farBank, 1.0, 1.0 - exp(-t * t / (9.0e8 * seaLens * seaLens))), gone);
      // (Under the storm the foot is the dark wall's and the deck goes into it whole: kept pale there it stood as a ruled line against it.)
      sea = mix(sea, domeFar, plate > 0.0 ? 0.4 * gone : mix(1.0 - exp(-t * t / (1.3e9 * seaLens * seaLens * seaLens)), gone, inStorm));
    }
    // (Behind the long lens the deck is slate under the dark sky, and pale only while a stroke lights it.)
    sea += flare * (0.7 * plate);
    // Under the storm wall the sea goes into the wall's own foot: no line stands between them.
    if (needFoot) sea = mix(sea, domeFar, toWall);
    // Under the wall the air's haze stays on the deck to its last degree and thins only there, into the sky's foot. Thinned as on the
    // dusk side, the far deck stood bare behind the last hazed head as a dark level band with that head's stepped outline on it.
    // (By how low the ray lies, not by how far its head stands: a head met short of the last level takes the air of the level behind it.)
    float lastAt = (ro.y - ridgeAt(ro.x + rd.x * 16000.0).y + CLOUD_UNDER + CLOUD_DEEP) / max(-rd.y, 1e-5);
    // (The air there is many times thicker than it takes to hide the deck: thinned evenly it stayed whole to the last and ended in a line.)
    float last = 1.0 - smoothstep(15000.0, 50000.0, lastAt);
    last *= last * last;
    seaGone = mix(gone, 1.0 - last * last, inStorm);
    // Where the deck has climbed into the storm it takes the air the open sky behind it takes: the ridge's veil laid over it as over
    // a far spire stood on its face in pale bands.
    seaGone = max(seaGone, max(toWall, smoothstep(0.0, 0.45, inWall)));
    stormAir *= 1.0 - seaGone;
    // Its edge against the land is soft: the cloud thins where it laps the rock.
    // (By the depth of cloud before the rock, as cloud hides: forty metres of it hide nearly all. Thinned evenly over some hundreds of
    // metres, the flank under the deck showed through every near head as a weave.)
    float lap = 0.985 * max(1.0 - exp(-max(far - t, 0.0) * (1.0 + 1.4 * grain) / (40.0 + 0.03 * t)), seaCover);
    // Where it has climbed into the storm its last heads thin into the wall's own air: they have no edge against the sky.
    lap *= 1.0 - inStorm * smoothstep(0.03, 0.15, rd.y);
    // And far along the ridge, where the lens looks down the wall's length, it is the sky's own dark foot and no more: kept whole there,
    // its top stood against the band of the dusk as a slab with a ruled edge.
    lap *= 1.0 - wallAt * smoothstep(3500.0, 8500.0, t) * smoothstep(-0.012, 0.012, rd.y);
    light += through * sea * lap;
    through *= 1.0 - lap;
    // (And what is drawn after it, the scud and the glow of a stroke in the air, is drawn there as before the open sky.)
    far = inWall > 0.5 ? max(far, 60001.0) : min(far, t);
  } else if (seaAt <= 0.0 && far > 50000.0 && rd.y > -0.004 && rd.y < 0.03 && through > 0.01 && stormSide(rd) < 0.98) {
    // Past the last of the deck stand the tops of banks too far off to be walked to: a low uneven line of them before the band of
    // the dusk, each some degrees wide, which rise and sink slowly. Without them the deck ended against the band in a ruled line.
    vec2 round_ = normalize(rd.xz);
    float b1 = textureLod(tSeaNh, round_ * 0.7 + vec2(uTime * 0.0006, 0.31), 3.0).b;
    float b2 = textureLod(tSeaNh, round_ * 2.3 - vec2(0.77, uTime * 0.0011), 2.0).b;
    // (Only before a short lens: a long one sees a few degrees of them, which is a level band.)
    float lensS = max(0.466 / uInvProjection[1][1], 1.0);
    float topS = 0.0015 + 0.017 * smoothstep(0.3, 0.8, 0.65 * b1 + 0.35 * b2);
    float bankS = smoothstep(topS, 0.55 * topS - 0.002, rd.y) * (1.0 - stormSide(rd)) * 0.9 * clamp(2.6 - 1.6 * lensS, 0.0, 1.0);
    // They are the far deck's own pale vapour with a share of the sky's foot, and their tops take the band.
    vec3 footS = skyCloud(ro, normalize(vec3(rd.x, 0.0003, rd.z)), 2.5);
    vec3 toneS = mix(footS, SEA_COLD * vec3(1.1, 1.15, 1.3) + 0.3 * SEA_WARM, 0.55) * (0.85 + 0.3 * smoothstep(0.4 * topS, topS, rd.y));
    light += through * toneS * bankS;
    through *= 1.0 - bankS;
  } else if (seaMist > 0.0 && through > 0.01) {
    // A ray that passed low over a head and went on to the rock or the sky: the mist over that head lies before what it met.
    float mistAt;
    float veil = 0.85 * seaVeil(ro, rd, mistAt) * exp(-mistAt * mistAt / (1.1e8 * seaLens * seaLens * seaLens));
    vec3 mist = mix(SEA_COLD * vec3(1.55, 1.55, 1.4) + 0.55 * SEA_WARM, SEA_COLD * vec3(1.55, 1.65, 1.95), stormSide(rd)) * (1.0 - 0.5 * stormSide(rd)) * mix(vec3(1.0), vec3(0.8, 0.88, 1.06), stormSide(rd));
    light += through * mist * veil;
    through *= 1.0 - veil;
  }
`;
