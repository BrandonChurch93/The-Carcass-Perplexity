// The lid: the evening cumulus that stands over the socket of the Eye, a broken deck in banks at three heights, each with its own open air.
// The camera climbs up between the banks, and over the highest of them the Eye hands over to the rise. The banks are read from
// photographs of cloud (cloud.data.ts), each deck at its own size, turn and place, so the gaps are many, unlike and off the middle. Both places draw
// the banks with this one function, from the numbers of handoff.json, in the lid's own measure: one unit across is half the height of the
// view on the water at the cut, and one unit up is the height of the camera at the cut. A ray straight down through the same point of the frame is then the same ray
// in both places, so each layer slides against the water as it does on the other side of the cut.
import * as THREE from 'three';
import { CLOUD_BYTES, CLOUD_SIZE } from './cloud.data';

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
  /** The deep water of the lake as both places show it under the gap on the frames about the cut. */
  water: number[];
  /** How far from the middle that water is laid, in units across: inside the deep water of both places. */
  waterReach: number;
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

let cloudMap: THREE.DataTexture | null = null;

/** The photographs of cloud as one tile that repeats: red is how high a bank stands, green how high a field of small cloud stands. */
function cloudTile(): THREE.DataTexture {
  if (cloudMap) return cloudMap;
  const raw = atob(CLOUD_BYTES);
  const data = new Uint8Array(CLOUD_SIZE * CLOUD_SIZE * 4);
  for (let i = 0; i < CLOUD_SIZE * CLOUD_SIZE; i++) {
    data[4 * i] = raw.charCodeAt(2 * i);
    data[4 * i + 1] = raw.charCodeAt(2 * i + 1);
    data[4 * i + 3] = 255;
  }
  const map = new THREE.DataTexture(data, CLOUD_SIZE, CLOUD_SIZE, THREE.RGBAFormat, THREE.UnsignedByteType);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.colorSpace = THREE.NoColorSpace;
  map.needsUpdate = true;
  cloudMap = map;
  return map;
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
    uLidWater: { value: new THREE.Vector4(n.water[0], n.water[1], n.water[2], n.waterReach) },
    uLidMap: { value: cloudTile() },
  };
}

/**
 * The decks, from the top down. foot and top: between which heights the banks stand. across: how many tiles of the photograph lie on one
 * unit across. open: how bright the photograph must be for cloud to stand. at: the place in the tile that lies on the line of the climb
 * when the lens passes, a place of open air with a bank near it. turn: how the tile is turned. passed: the seconds before the cut at
 * which the lens passes the deck.
 */
export const LID_DECKS = [
  { foot: 0.905, top: 0.965, across: 2.2, open: 0.3, at: [0.57, 0.52], turn: 0.5, passed: 1.02 },
  { foot: 0.85, top: 0.895, across: 1.6, open: 0.2, at: [0.065, 0.535], turn: 2.2, passed: 1.58 },
  { foot: 0.795, top: 0.84, across: 1.2, open: 0.16, at: [0.575, 0.02], turn: 4.1, passed: 1.96 },
];

/** foot: the height at which the Eye begins to draw the banks. lowest: the foot of the lowest deck: no bank stands where the lens could have seen it from under the foot. */
export const LID_GAP = { foot: 0.79, lowest: LID_DECKS[2]!.foot };

/** How far from the line of the climb, in units across, the air of the highest deck is open where the lens passes it. */
export function lidGapSeen(): number {
  return 0.06 / LID_DECKS[0]!.across;
}

const G = (n: number): string => n.toFixed(4);
const deckRow = (d: (typeof LID_DECKS)[number]): string => `vec4(${G(d.foot)}, ${G(d.top)}, ${G(d.across)}, ${G(d.open)})`;
const layRow = (d: (typeof LID_DECKS)[number]): string => `vec4(${G(d.at[0] as number)}, ${G(d.at[1] as number)}, ${G(Math.cos(d.turn))}, ${G(Math.sin(d.turn))})`;

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
uniform vec4 uLidWater;
uniform sampler2D uLidMap;

const int LID_DECKS = 3;
const int LID_CUTS = 8;
// From the top down. x: the flat foot of the banks. y: the height of their highest heads. z: tiles of the photograph to a unit across. w: how bright the photograph must be for cloud to stand.
const vec4 LID_DECK[3] = vec4[3](${LID_DECKS.map(deckRow).join(', ')});
// xy: the place in the tile on the line of the climb. zw: the turn of the tile.
const vec4 LID_LAY[3] = vec4[3](${LID_DECKS.map(layRow).join(', ')});
// The seconds before the cut at which the lens passes each deck: the wind has the open air on the line of the climb then.
const vec3 LID_PASSED = vec3(${LID_DECKS.map((d) => G(d.passed)).join(', ')});
// The Eye begins to draw the banks when its lens is this high. No bank stands where the lens could have seen it from lower down.
const float LID_FOOT = ${G(LID_GAP.foot)};
const float LID_TILE = ${G(512)};
const float LID_THICK = 44.0;

// After the cut the lens leaves the banks under it faster than the land grows: every height of the lid is this much of what it was at the cut.
// It leaves from rest, so the cut has one rate of climb on both sides, and ends where cloud stands over land seen from so high.
float lidSunk() {
  return 1.0 - 0.93 * smoothstep(0.0, 0.7, uLid.z);
}

// Where a place lies in the photograph of a deck.
vec2 lidTile(vec2 q, int i) {
  vec4 lay = LID_LAY[i];
  vec2 p = q + uLidDrift * (uLid.y + LID_PASSED[i]);
  return vec2(lay.z * p.x - lay.w * p.y, lay.w * p.x + lay.z * p.y) * LID_DECK[i].z + lay.xy;
}

// How high the bank stands over a place, 0 to 1 of the deck, read from the photograph: its banks, and the same banks smaller, which
// tear the edges and heap the tops. 'lod' is how coarse the eye sees the place: nothing finer than a pixel is read, so nothing swims.
float lidBank(vec2 q, int i, float open, float lod, bool rough) {
  vec2 p = lidTile(q, i);
  float big = textureLod(uLidMap, p, lod).r;
  if (big <= open) return 0.0;
  vec2 p2 = vec2(0.8 * p.x - 0.6 * p.y, 0.6 * p.x + 0.8 * p.y) * 3.3 + 0.37;
  float n = big * (0.6 + 0.4 * textureLod(uLidMap, p2, lod + 1.72).r);
  if (!rough) n -= 0.1 * (1.0 - textureLod(uLidMap, p.yx * 9.7 + 0.11, lod + 3.28).g) * (1.0 - smoothstep(1.0, 3.0, lod));
  return clamp((n - open) / (1.0 - open), 0.0, 1.0);
}

// How far inside a bank a point is, by the height of the bank over it and its own height in the deck: a bank is widest at its foot.
float lidBody(float h, float up) {
  return h - 0.05 - 0.8 * up * sqrt(up);
}

// The cloud between the eye and whatever lies at 'far' along the ray: rgb is its light, a is how much of what lies behind comes through.
vec4 lidOver(vec3 ro, vec3 rd, float far) {
  float camA = ro.y / uLidFrame.w;
  vec2 from = (ro.xz - uLidFrame.xy) / uLidFrame.z;
  // The ray in the lid's measure, by the height it has come down to.
  vec2 lean = rd.xz / uLidFrame.z / (rd.y / uLidFrame.w);
  // How far a pixel reaches across, for each unit of height under the lens.
  float reach = min(length(fwidth(lean)), 0.2);
  float floorA = camA + rd.y * far / uLidFrame.w;
  vec3 ld = normalize(vec3(rd.x, rd.y * uLidFrame.z / uLidFrame.w, rd.z));
  float down = max(-ld.y, 0.3);
  vec2 sunSide = normalize(uLidSun.xz);
  float sunk = lidSunk();
  // At the end the banks go as small cloud goes: from their edges inward, to nothing.
  float less = 0.75 * smoothstep(0.7, 1.0, uLid.z);
  float thin = 1.0 - smoothstep(0.92, 1.0, uLid.z);
  vec3 sum = vec3(0.0);
  float tr = 1.0;
  for (int i = 0; i < LID_DECKS; i++) {
    vec4 deck = LID_DECK[i];
    deck.xy *= sunk;
    float top = min(deck.y, camA);
    float foot = max(deck.x, floorA);
    if (top <= foot) continue;
    float open = deck.w + less;
    float tall = deck.y - deck.x;
    // The more the ray leans, the farther it slides across the banks on its way down through the deck, and the more cuts it takes to find them.
    // Under a bank that already hides most of it a deck is found with fewer.
    float least = tr < 0.5 ? 2.0 : 3.0;
    int cuts = int(clamp(ceil(least + 4.0 * length(lean) * (top - foot) * deck.z), least, float(LID_CUTS)));
    float each = (top - foot) / float(cuts);
    float thick = 0.0;
    // Where the ray first meets the bank: between the last cut in the air and the first in the cloud, so the face it sees has no terraces.
    float was = -1.0;
    float met = -1.0;
    float metH = 0.0;
    float wasH = 0.0;
    for (int k = 0; k < LID_CUTS; k++) {
      if (k >= cuts) break;
      float a = top - (float(k) + 0.5) * each;
      vec2 q = from + lean * (a - camA);
      float lod = log2(max(reach * (camA - a) * deck.z * LID_TILE, 1.0));
      float h = lidBank(q, i, open, lod, false);
      float body = lidBody(h, (a - deck.x) / tall);
      if (body > 0.0) {
        if (met < 0.0) {
          float back = k == 0 ? 0.0 : clamp(body / (body - was), 0.0, 1.0);
          met = a + back * each;
          metH = mix(h, wasH, back);
        }
        thick += smoothstep(0.0, 0.45, body) * each;
        if (thick * thin * LID_THICK > 4.0 * down * sunk) break;
      }
      was = min(body, 0.0);
      wasH = h;
    }
    if (met < 0.0) continue;
    float alpha = 1.0 - exp(-thin * LID_THICK * thick / (down * sunk));
    vec2 q = from + lean * (met - camA);
    float up = (met - deck.x) / tall;
    float lod = log2(max(reach * (camA - met) * deck.z * LID_TILE, 1.0));
    // One low sun: a bank is lit where the cloud a little way toward the sun stands no higher, and in its own shade on the other side.
    float hs = lidBank(q + sunSide * 0.3 / deck.z, i, open, lod + 2.0, true);
    // The heads and folds of the photograph, as far as the eye is near enough to see them.
    vec2 p = lidTile(q, i);
    float grain = clamp(0.5 + 2.2 * (textureLod(uLidMap, p, lod).r - textureLod(uLidMap, p, lod + 2.5).r), 0.0, 1.0);
    float lit = clamp(0.5 + 2.6 * (metH - hs) + 0.9 * (grain - 0.5), 0.0, 1.0);
    lit = lit * lit * (3.0 - 2.0 * lit);
    // The heads stand in the light and the feet in the shade of the bank over them.
    float crest = pow(max(metH - 0.05, 0.0) / 0.6, 0.5);
    float high = clamp(0.3 * up + 0.75 * min(crest, 1.25), 0.0, 1.0);
    high = high * high * (3.0 - 2.0 * high);
    // The shade of a bank is not one blue: the light that comes through the cloud warms it where the bank is heaped.
    vec3 shade = mix(uLidShade, uLidInside * 1.25, 0.55 * smoothstep(0.35, 0.95, metH));
    vec3 colour = mix(shade * (0.6 + 0.7 * high), uLidSunlit * (0.8 + 0.5 * high), lit * (0.35 + 0.65 * high));
    // A deck under another stands in the shade the higher one throws away from the sun, and the folds between the heads are darker than the heads.
    float over = 1.0;
    if (i > 0) {
      vec4 higher = LID_DECK[i - 1];
      float a = sunk * mix(higher.x, higher.y, 0.3);
      over = 1.0 - 0.5 * smoothstep(0.0, 0.5, lidBank(q + sunSide * 0.42 * (a - met), i - 1, higher.w + less, lod + 1.0, true));
    }
    colour *= over * (0.84 + 0.16 * smoothstep(0.3, 0.8, metH)) * (0.72 + 0.56 * grain);
    // Where a bank is thin the light goes through it: a veil is pale, not a sheet of shade.
    colour = mix(colour, mix(uLidShade, uLidSunlit, 0.62), 0.7 * (1.0 - smoothstep(0.1, 0.9, alpha)));
    // Seen close, the cloud is paler and its lumps are soft.
    colour = mix(colour, mix(uLidInside, uLidWarm, lit) * 1.5, 0.35 * (1.0 - smoothstep(0.0, 0.05, camA - met)));
    sum += tr * alpha * colour;
    tr *= 1.0 - alpha;
    if (tr < 0.04) break;
  }
  // How much of the one water under the banks is drawn: all of it on the frames about the cut.
  float about = smoothstep(0.955, 0.99, camA) * (1.0 - smoothstep(0.03, 0.3, uLid.z));
  // The shade of the banks lies on the water and the shore under them, thrown away from the sun and farther the higher the bank.
  float shadeIn = uLidShadow * thin * smoothstep(LID_FOOT, LID_FOOT + 0.05, camA) * (1.0 - smoothstep(0.6, 0.9, uLid.z));
  vec2 g = from + lean * (floorA - camA);
  float lightLeft = 1.0;
  if (shadeIn > 0.0 && tr > 0.06 && floorA < 0.45) {
    float lod = log2(max(reach * (camA - floorA) * LID_TILE, 1.0));
    for (int i = 0; i < LID_DECKS; i++) {
      vec4 deck = LID_DECK[i];
      float a = sunk * (deck.x + 0.3 * (deck.y - deck.x));
      vec2 q = g + sunSide * 0.42 * (a - floorA);
      lightLeft *= 1.0 - 0.45 * smoothstep(0.0, 0.5, lidBank(q, i, deck.w + less, lod + log2(deck.z), true));
    }
    tr *= 1.0 - shadeIn * (1.0 - lightLeft);
  }
  // One water under the banks. On the frames about the cut the deep water of the lake is drawn here, the same in both places, with the wind
  // on it and the shade of the banks: the Eye's own water goes over to it as the lens nears the cut, and it goes over to the rise's after.
  // It has no edge: toward the shores each place keeps its own lake, and the banks hide what differs.
  float water = about * (1.0 - smoothstep(0.45, 0.85, length(g) / uLidWater.w));
  if (water > 0.0 && tr > 0.02 && floorA < 0.02) {
    vec2 wind = normalize(uLidDrift);
    vec2 along = vec2(wind.x * g.x + wind.y * g.y, -wind.y * g.x + wind.x * g.y) * vec2(0.3, 1.0);
    float windOn = 0.5 * vnoise(along * 7.0 + uLid.y * vec2(0.5, 0.0) + 4.4) + 0.3 * vnoise(along * 19.0 - uLid.y * vec2(1.1, 0.0) + 1.3) + 0.2 * vnoise(along * 47.0 + 7.7);
    sum += tr * water * uLidWater.rgb * (0.78 + 0.44 * windOn);
    tr *= 1.0 - water;
  }
  return vec4(sum, tr);
}`;
