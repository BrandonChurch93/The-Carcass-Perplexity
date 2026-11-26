// The lid: the evening cumulus that stands over the socket of the Eye, in banks at three heights with a gap over the middle of the lake.
// The camera climbs up through the gap looking straight down, and over the highest bank the Eye hands over to the rise. Both places draw
// the banks with this one function, from the numbers of handoff.json, in the lid's own measure: one unit across is half the height of the
// view on the water at the cut, and one unit up is the height of the camera at the cut. A ray straight down through the same point of the frame is then the same ray
// in both places, so each layer slides against the water as it does on the other side of the cut.
import * as THREE from 'three';

export interface LidNumbers {
  sun: number[];
  sunlit: number[];
  shade: number[];
  inside: number[];
  insideWarm: number[];
  drift: number[];
  erodeFrames: number;
  erodePower: number;
  shadow: number;
}

export interface LidState {
  /** Seconds since the first frame of the rise: negative in the Eye. */
  tau: number;
  /** How far the sheet has broken up: 0 whole, 1 gone. */
  eroded: number;
}

/** The lid at a time, in seconds since the first frame of the rise. A pure function of the time. */
export function lidAt(tau: number, n: LidNumbers, fps: number): LidState {
  const u = Math.min(1, Math.max(0, (tau * fps) / n.erodeFrames));
  return { tau, eroded: u ** n.erodePower };
}

/** The uniforms of the lid. `unit` is the world length of one unit across, `tall` the world height of the camera at the cut. */
export function lidUniforms(n: LidNumbers, centre: [number, number], unit: number, tall: number): Record<string, THREE.IUniform> {
  const v = (a: number[]): THREE.Vector3 => new THREE.Vector3(a[0], a[1], a[2]);
  return {
    // x: 1 while the lid is drawn (0: no surface reads it). y: seconds since the cut. z: how far it has broken up. w: how dark its shade lies on the water.
    uLid: { value: new THREE.Vector4(0, 0, 0, 0) },
    uLidFrame: { value: new THREE.Vector4(centre[0], centre[1], unit, tall) },
    uLidSun: { value: v(n.sun).normalize() },
    uLidSunlit: { value: v(n.sunlit) },
    uLidShade: { value: v(n.shade) },
    uLidInside: { value: v(n.inside) },
    uLidWarm: { value: v(n.insideWarm) },
    uLidDrift: { value: new THREE.Vector2(n.drift[0], n.drift[1]) },
    uLidShadow: { value: n.shadow },
  };
}

/**
 * The gap the lens climbs through, in the lid's measure. foot: the height at which the Eye begins to draw the banks. narrow: the gap's
 * least half width, which it has from the foot up. widen: how much wider it is for each unit of height under the foot. least: the least
 * the bend of its edge can shrink a distance. long: how much longer than wide it is. off: where its middle lies. lowest: the foot of the
 * highest deck, the edge through which the water is seen from the cut.
 */
export const LID_GAP = { foot: 0.79, narrow: 0.06, widen: 2.4, least: 0.65, long: 1 / 0.75, off: [0.025, -0.02], lowest: 0.835 };

/** The farthest from the middle of the frame, in halves of its height, that anything under the banks is seen through the gap from the height of the cut. */
export function lidGapSeen(): number {
  return ((LID_GAP.narrow / LID_GAP.least) * LID_GAP.long + Math.hypot(LID_GAP.off[0] as number, LID_GAP.off[1] as number)) / (1 - LID_GAP.lowest);
}

const G = (n: number): string => n.toFixed(4);

// Needs vnoise before it.
export const LID_GLSL = /* glsl */ `
uniform vec4 uLid;
uniform vec4 uLidFrame;
uniform vec3 uLidSun;
uniform vec3 uLidSunlit;
uniform vec3 uLidShade;
uniform vec3 uLidInside;
uniform vec3 uLidWarm;
uniform vec2 uLidDrift;
uniform float uLidShadow;

const int LID_DECKS = 3;
const int LID_CUTS = 12;
// From the top down. x: the flat foot of the banks. y: the height of their highest heads. z: lumps to a unit across. w: how much of the deck is open air.
const vec4 LID_DECK[3] = vec4[3](vec4(${G(LID_GAP.lowest)}, 0.895, 8.0, 0.35), vec4(0.675, 0.74, 5.0, 0.41), vec4(0.52, 0.595, 3.1, 0.45));
// The Eye begins to draw the banks when its lens is this high. No bank stands where the lens could have seen it from lower down.
const float LID_FOOT = ${G(LID_GAP.foot)};

// How far a place is outside the gap the lens climbs through, at a height: under 0 is open air. The gap is long, bent, off the middle, and it
// widens downward, so that every bank comes into the frame over its edge and none is switched on inside it.
float lidOutside(vec2 q, float a) {
  vec2 w = q - vec2(${G(LID_GAP.off[0] as number)}, ${G(LID_GAP.off[1] as number)});
  w = vec2(0.8 * w.x + 0.6 * w.y, -0.6 * w.x + 0.8 * w.y);
  w.x /= ${G(LID_GAP.long)};
  float r = length(w);
  float gap = ${G(LID_GAP.widen)} * max(LID_FOOT - a, 0.0) + ${G(LID_GAP.narrow)};
  // Well inside the gap and well outside it the bend of its edge changes nothing.
  if (r <= gap) return r - gap;
  float least = ${G(LID_GAP.least)};
  if (least * r - gap >= 0.05) return least * r - gap;
  return r * (least + 0.2 * vnoise(q * 13.0 + vec2(3.7, 8.2)) + 0.15 * vnoise(q * 31.0 + vec2(1.4, 6.6))) - gap;
}

// Over the lake the banks stand closest, a cap of cloud with the gap in it: as much of each deck as the lens sees from the height of the cut.
// Farther out they stand apart. (Less open air, by this much.)
float lidCap(vec2 q, float a) {
  float reach = 2.2 * (1.0 - a);
  return 0.2 * (1.0 - smoothstep(reach, reach + 0.3, length(q)));
}

// How high the bank stands over a place, 0 to 1 of the deck: lumps drawn out along the wind, with air between them. 'near' is how far under
// the lens the place is: the closer, the finer the grain the eye can see. 'rough' leaves the finest grain out.
float lidBank(vec2 q, vec4 deck, float open, float near, float up, bool rough) {
  vec2 wind = normalize(uLidDrift);
  vec2 p = q + uLidDrift * uLid.y * (0.6 + deck.x);
  vec2 f = vec2(wind.x * p.x + wind.y * p.y, -wind.y * p.x + wind.x * p.y) * vec2(0.7, 1.0) * deck.z + deck.x * 41.0;
  float big = vnoise(f);
  if (0.56 * big + 0.44 <= open) return 0.0;
  vec2 f2 = vec2(0.8 * f.x - 0.6 * f.y, 0.6 * f.x + 0.8 * f.y);
  // The lumps are not the same shape all the way up: a bank is not a wall.
  float n = 0.56 * big + 0.27 * vnoise(f2 * 2.7 + 5.3 + up * 0.8);
  if (rough) return smoothstep(open, open + 0.55, n + 0.085);
  vec2 f3 = vec2(0.33 * f.x - 0.94 * f.y, 0.94 * f.x + 0.33 * f.y);
  n += 0.17 * vnoise(f3 * 6.9 + 1.9 - up * 2.1);
  if (near < 0.45) {
    float close = 1.0 - near / 0.45;
    n += 0.1 * close * (vnoise(f * 17.0 + 9.1 + up * 4.3) - 0.5);
    if (near < 0.12) n += 0.06 * (1.0 - near / 0.12) * (vnoise(f2 * 43.0 + 2.3) - 0.5);
  }
  return smoothstep(open, open + 0.55, n);
}

// The cloud between the eye and whatever lies at 'far' along the ray: rgb is its light, a is how much of what lies behind comes through.
vec4 lidOver(vec3 ro, vec3 rd, float far) {
  float camA = ro.y / uLidFrame.w;
  vec2 from = (ro.xz - uLidFrame.xy) / uLidFrame.z;
  // The ray in the lid's measure, by the height it has come down to.
  vec2 lean = rd.xz / uLidFrame.z / (rd.y / uLidFrame.w);
  float floorA = camA + rd.y * far / uLidFrame.w;
  vec3 ld = normalize(vec3(rd.x, rd.y * uLidFrame.z / uLidFrame.w, rd.z));
  float down = max(-ld.y, 0.3);
  vec2 sunSide = normalize(uLidSun.xz);
  // The banks break up after the cut: the air opens, they thin, and the last of them is gone before they stop being drawn.
  float broken = smoothstep(0.7, 1.0, uLid.z);
  // Whole, the banks stand close: on the two frames of the cut only the deep water shows in the gap. After it the air between them widens.
  float loose = 0.17 * smoothstep(0.04, 0.5, uLid.z) + 0.3 * broken;
  float thin = (1.0 - 0.5 * broken) * (1.0 - smoothstep(0.88, 1.0, uLid.z));
  vec3 sum = vec3(0.0);
  float tr = 1.0;
  for (int i = 0; i < LID_DECKS; i++) {
    vec4 deck = LID_DECK[i];
    float top = min(deck.y, camA);
    float foot = max(deck.x, floorA);
    if (top <= foot) continue;
    float open = deck.w + loose;
    float tall = deck.y - deck.x;
    // The more the ray leans, the farther it slides across the lumps on its way down through the deck, and the more cuts it takes to draw them whole.
    int cuts = int(clamp(ceil(3.0 + 4.0 * length(lean) * (top - foot) * deck.z), 3.0, float(LID_CUTS)));
    float each = (top - foot) / float(cuts);
    float lit = -1.0;
    for (int k = 0; k < LID_CUTS; k++) {
      if (k >= cuts) break;
      float a = top - (float(k) + 0.5) * each;
      vec2 q = from + lean * (a - camA);
      float outside = lidOutside(q, a);
      if (outside <= 0.0) continue;
      float near = camA - a;
      float up = (a - deck.x) / tall;
      float edge = smoothstep(0.0, 0.05, outside);
      float h = lidBank(q, deck, open - lidCap(q, a), near, up, false) * edge;
      // A bank is widest at its foot and narrows to its heads.
      float body = h - up * sqrt(up) * 0.8 - 0.04;
      if (body <= 0.0) continue;
      if (lit < 0.0) {
        // One low sun: a bank is lit where the cloud a little way toward the sun stands no higher, and in its own shade on the other side.
        vec2 toSun = q + sunSide * 0.45 / deck.z;
        float hs = lidBank(toSun, deck, open - lidCap(toSun, a), near, up, true) * smoothstep(0.0, 0.05, lidOutside(toSun, a));
        lit = clamp(0.5 + 7.0 * (h - hs), 0.0, 1.0);
        lit = lit * lit * (3.0 - 2.0 * lit);
      }
      float alpha = 1.0 - exp(-thin * 46.0 * smoothstep(0.0, 0.3, body) * each / down);
      // The heads stand in the light and the feet in the shade of the bank over them.
      float high = smoothstep(0.0, 1.0, up + 0.6 * (h - 0.5));
      vec3 colour = mix(uLidShade * (0.55 + 0.5 * high), uLidSunlit * (0.75 + 0.5 * high), lit * (0.35 + 0.65 * high));
      // Where a bank is thin the light goes through it: a veil is pale, not a sheet of shade.
      colour = mix(colour, mix(uLidShade, uLidSunlit, 0.62), 0.75 * (1.0 - smoothstep(0.1, 0.5, h)));
      // Seen close, the cloud is paler and its lumps are soft.
      colour = mix(colour, mix(uLidInside, uLidWarm, lit) * 1.5, 0.35 * (1.0 - smoothstep(0.0, 0.12, near)));
      sum += tr * alpha * colour;
      tr *= 1.0 - alpha;
      if (tr < 0.02) break;
    }
    if (tr < 0.02) break;
  }
  // The shade of the banks lies on the water and the shore under them, thrown away from the sun and farther the higher the bank.
  float shadeIn = uLidShadow * thin * smoothstep(LID_FOOT, 0.93, camA);
  if (shadeIn > 0.0 && tr > 0.02 && floorA < 0.45) {
    vec2 g = from + lean * (floorA - camA);
    float lightLeft = 1.0;
    for (int i = 0; i < LID_DECKS; i++) {
      vec4 deck = LID_DECK[i];
      float a = deck.x + 0.3 * (deck.y - deck.x);
      vec2 q = g + sunSide * 0.42 * (a - floorA);
      float outside = lidOutside(q, a);
      if (outside <= 0.0) continue;
      lightLeft *= 1.0 - 0.8 * smoothstep(0.05, 0.45, lidBank(q, deck, deck.w + loose - lidCap(q, a), 1.0, 0.3, true) * smoothstep(0.0, 0.05, outside));
    }
    tr *= 1.0 - shadeIn * (1.0 - lightLeft);
  }
  return vec4(sum, tr);
}`;
