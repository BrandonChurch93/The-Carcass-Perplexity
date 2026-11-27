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
  /** How far from the middle that water is laid, in LID_LAKE: inside the deep water of both places. */
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

/**
 * The uniforms of the lid. `unit` is the world length of one unit across, `tall` the world height of the camera at the cut. `grade` is
 * how a place must weigh the colours of the lid for them to come out of its own finish as they come out of the other's.
 */
export function lidUniforms(n: LidNumbers, centre: [number, number], unit: number, tall: number, grade: number[] = [1, 1, 1], deep: number[] = grade, lit: number[] = grade): Record<string, THREE.IUniform> {
  const v = (a: number[]): THREE.Vector3 => new THREE.Vector3((a[0] as number) * (grade[0] as number), (a[1] as number) * (grade[1] as number), (a[2] as number) * (grade[2] as number));
  return {
    // x: 1 while the lid is drawn (0: no surface reads it). y: seconds since the cut. z: how far it has broken up. w: how dark its shade lies on the water.
    uLid: { value: new THREE.Vector4(0, 0, 0, 0) },
    uLidFrame: { value: new THREE.Vector4(centre[0], centre[1], unit, tall) },
    uLidSun: { value: new THREE.Vector3(n.sun[0], n.sun[1], n.sun[2]).normalize() },
    uLidSunlit: { value: new THREE.Vector3((n.sunlit[0] as number) * (lit[0] as number), (n.sunlit[1] as number) * (lit[1] as number), (n.sunlit[2] as number) * (lit[2] as number)) },
    uLidShade: { value: v(n.shade) },
    uLidInside: { value: v(n.inside) },
    uLidWarm: { value: v(n.insideWarm) },
    uLidDrift: { value: new THREE.Vector2(n.drift[0], n.drift[1]) },
    uLidShadow: { value: n.shadow },
    uLidWater: { value: new THREE.Vector4((n.water[0] as number) * (deep[0] as number), (n.water[1] as number) * (deep[1] as number), (n.water[2] as number) * (deep[2] as number), n.waterReach) },
    uLidMap: { value: cloudTile() },
    // The rows of pixels the cloud is read for. Both places keep this one number, whatever the size of the frame, so the banks are as
    // fine on one side of the cut as on the other: it suits the full frame, where both draw the lid on about a thousand rows.
    uLidRows: { value: 720 },
  };
}

/**
 * The decks, from the top down. foot and top: between which heights the banks stand. across: how many tiles of the photograph lie on one
 * unit across. open: how bright the photograph must be for cloud to stand. at: the place in the tile that lies on the line of the climb
 * when the lens passes, a place of open air with a bank near it. turn: how the tile is turned. passed: the seconds before the cut at
 * which the lens passes the deck. wind: how far the deck drifts in a second, each deck its own way, so the open air the lens came up
 * through has moved off by the cut and no hole stands over the middle of the lake.
 */
export const LID_DECKS = [
  // Shreds over the height of the cut: neither place sees them on the frames of the cut, and the rise climbs through them after it.
  { foot: 1.02, top: 1.075, across: 0.9, open: 0.3, at: [0.58, 0.16], turn: 1.3, passed: -0.6, wind: [-0.05, -0.06] },
  { foot: 0.905, top: 0.965, across: 2.2, open: 0.15, at: [0.69, 0.455], turn: 0.5, passed: 1.07, wind: [0.035, 0.07] },
  { foot: 0.85, top: 0.895, across: 1.6, open: 0.14, at: [0.885, 0.34], turn: 2.2, passed: 1.69, wind: [-0.06, 0.045] },
  { foot: 0.795, top: 0.84, across: 1.2, open: 0.12, at: [0.31, 0.955], turn: 4.1, passed: 2.1, wind: [0.075, -0.03] },
];

/** foot: the height at which the Eye begins to draw the banks. lowest: the foot of the lowest deck: no bank stands where the lens could have seen it from under the foot. */
export const LID_GAP = { foot: 0.79, lowest: LID_DECKS[LID_DECKS.length - 1]!.foot };

/** The half axes, in units across, of the water both places share about the cut, for a reach of 1: the rise's lake is longer than it is wide. */
export const LID_LAKE = [1.17, 0.84];

/**
 * How much of its height each deck has lost when it has sunk, from the top down. The lens climbs slowly on the first frames of the rise;
 * the decks fall away under it instead, the lowest most, so each keeps its own height and its own speed against the ground.
 */
export const LID_SINK = [0.1, 0.2, 0.26, 0.32];

/**
 * Between which shares of the breaking up each deck goes, from the top down. The lowest goes first: far under the lens its banks are
 * too small to read as cloud over a country, and the higher decks are left to pass over shore and land alike.
 */
export const LID_GOES = [
  [0.72, 1.0],
  [0.4, 0.68],
  [0.3, 0.56],
  [0.2, 0.44],
];

/** How far from the line of the climb, in units across, the air of the highest deck under the cut is open where the lens passes it. */
export function lidGapSeen(): number {
  return 0.06 / LID_DECKS[1]!.across;
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
uniform float uLidRows;

const int LID_DECKS = ${LID_DECKS.length};
const int LID_CUTS = 8;
// From the top down. x: the flat foot of the banks. y: the height of their highest heads. z: tiles of the photograph to a unit across. w: how bright the photograph must be for cloud to stand.
const vec4 LID_DECK[LID_DECKS] = vec4[LID_DECKS](${LID_DECKS.map(deckRow).join(', ')});
// xy: the place in the tile on the line of the climb. zw: the turn of the tile.
const vec4 LID_LAY[LID_DECKS] = vec4[LID_DECKS](${LID_DECKS.map(layRow).join(', ')});
// The seconds before the cut at which the lens passes each deck: the wind has the open air on the line of the climb then.
const vec4 LID_SINK = vec4(${LID_SINK.map(G).join(', ')});
const vec2 LID_GOES[LID_DECKS] = vec2[LID_DECKS](${LID_GOES.map((g) => `vec2(${G(g[0] as number)}, ${G(g[1] as number)})`).join(', ')});
const vec2 LID_LAKE = vec2(${LID_LAKE.map(G).join(', ')});
const vec4 LID_PASSED = vec4(${LID_DECKS.map((d) => G(d.passed)).join(', ')});
const vec2 LID_WIND[LID_DECKS] = vec2[LID_DECKS](${LID_DECKS.map((d) => `vec2(${G(d.wind[0] as number)}, ${G(d.wind[1] as number)})`).join(', ')});
// The Eye begins to draw the banks when its lens is this high. No bank stands where the lens could have seen it from lower down.
const float LID_FOOT = ${G(LID_GAP.foot)};
const float LID_TILE = ${G(512)};
const float LID_THICK = 44.0;

// After the cut the lens leaves the banks under it faster than the land grows: every height of the lid is this much of what it was at the cut.
// It leaves from rest, so the cut has one rate of climb on both sides, and ends where cloud stands over land seen from so high.
// How much brighter the photograph must be for cloud to stand, as a deck goes: a bank loses its edges first.
float lidLess(int i) {
  return 0.06 * smoothstep(0.1, 0.7, uLid.z) + 0.3 * smoothstep(LID_GOES[i].x, LID_GOES[i].y, uLid.z);
}

// How much of a deck is left: what stands of a bank thins to a veil and is gone, it does not shrink to a fleck.
float lidLeft(int i) {
  return 1.0 - smoothstep(mix(LID_GOES[i].x, LID_GOES[i].y, 0.25), LID_GOES[i].y, uLid.z);
}

float lidSunk(int i) {
  float gone = smoothstep(0.0, 0.8, uLid.z);
  return 1.0 - LID_SINK[i] * gone * sqrt(gone);
}

// Where a place lies in the photograph of a deck.
vec2 lidTile(vec2 q, int i) {
  vec4 lay = LID_LAY[i];
  // After the cut the lens is soon too high to see a bank drift.
  vec2 p = q + LID_WIND[i] * (uLid.y / (1.0 + 1.2 * max(uLid.y, 0.0)) + LID_PASSED[i]);
  return vec2(lay.z * p.x - lay.w * p.y, lay.w * p.x + lay.z * p.y) * LID_DECK[i].z + lay.xy;
}

// How high the bank stands over a place, 0 to 1 of the deck, read from the photograph: its banks, and the same banks smaller, which
// tear the edges and heap the tops. 'lod' is how coarse the eye sees the place: nothing finer than a pixel is read, so nothing swims.
float lidBank(vec2 q, int i, float open, float lod, bool rough) {
  vec2 p = lidTile(q, i);
  // The banks stand in fields with thinner cloud between the fields, wider than a bank, so no deck repeats itself to the eye. Each deck
  // has its fields in other places: no height has its cloud gathered over the lake. As the lens climbs the fields draw apart, and what
  // is left of a deck stands in unlike patches with clear air between.
  open += (0.2 + 0.25 * smoothstep(0.2, 0.5, uLid.z)) * (1.0 - smoothstep(0.05, 0.3, textureLod(uLidMap, (p - LID_LAY[i].xy) * 0.37 + vec2(0.656, 0.719) + float(i) * vec2(0.37, 0.21), 5.0).r));
  float big = textureLod(uLidMap, p, lod).r;
  if (big <= open) return 0.0;
  vec2 p2 = vec2(0.8 * p.x - 0.6 * p.y, 0.6 * p.x + 0.8 * p.y) * 3.3 + 0.37;
  float n = big * (0.68 + 0.32 * textureLod(uLidMap, p2, lod + 1.72).r);
  if (!rough) n -= 0.1 * (1.0 - textureLod(uLidMap, p.yx * 9.7 + 0.11, lod + 3.28).g) * (1.0 - smoothstep(1.0, 3.0, lod));
  return clamp((n - open) / max(1.0 - open, 0.2), 0.0, 1.0);
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
  // How far a pixel reaches across, for each unit of height under the lens: reckoned from the lens and the rows of the picture, not
  // measured between neighbouring pixels, which under a branch is not the same twice.
  float narrow = uLidFrame.w / uLidFrame.z;
  float reach = min((2.0 / uLidRows) * (1.0 + dot(lean, lean) / (narrow * narrow)), 0.2);
  float floorA = camA + rd.y * far / uLidFrame.w;
  vec3 ld = normalize(vec3(rd.x, rd.y * uLidFrame.z / uLidFrame.w, rd.z));
  float down = max(-ld.y, 0.3);
  vec2 sunSide = normalize(uLidSun.xz);
  vec3 sum = vec3(0.0);
  float tr = 1.0;
  for (int i = 0; i < LID_DECKS; i++) {
    vec4 deck = LID_DECK[i];
    float sunk = lidSunk(i);
    deck.xy *= sunk;
    float top = min(deck.y, camA);
    float foot = max(deck.x, floorA);
    if (top <= foot) continue;
    float open = deck.w + lidLess(i);
    float thin = lidLeft(i);
    if (thin <= 0.0) continue;
    float tall = deck.y - deck.x;
    // The more the ray leans, the farther it slides across the banks on its way down through the deck, and the more cuts it takes to find them.
    float least = 3.0;
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
        thick += smoothstep(0.0, 0.6, body) * each;
        if (thick * thin * LID_THICK > 4.0 * down * sunk) break;
      }
      was = min(body, 0.0);
      wasH = h;
    }
    if (met < 0.0) continue;
    float alpha = 1.0 - exp(-thin * LID_THICK * thick / (down * sunk));
    // A bank the lens is about to enter is a haze before the glass, not a white wall: it does not flash past from one frame to the next.
    alpha *= 0.3 + 0.7 * smoothstep(0.0, 0.05, camA - met);
    vec2 q = from + lean * (met - camA);
    float up = (met - deck.x) / tall;
    float lod = log2(max(reach * (camA - met) * deck.z * LID_TILE, 1.0));
    // One low sun: a bank is lit where the cloud a little way toward the sun stands no higher, and in its own shade on the other side.
    float hs = lidBank(q + sunSide * 0.06 / deck.z, i, open, lod + 1.0, true);
    // The heads and folds of the photograph, as far as the eye is near enough to see them.
    vec2 p = lidTile(q, i);
    float fine = textureLod(uLidMap, p, lod).r;
    float grain = clamp(0.5 + 2.2 * (fine - textureLod(uLidMap, p, lod + 2.5).r), 0.0, 1.0);
    // The photograph is of cloud in the light: where it is bright a head stands in the sun, where it is dark lies a fold or a thin edge.
    // The side toward the sun is brighter than the side away from it, and the heads brighter than the feet.
    float lit = clamp(0.1 + 0.75 * fine + 5.5 * (metH - hs) + 0.6 * (grain - 0.5) + 0.3 * (up - 0.4), 0.0, 1.0);
    lit = smoothstep(0.12, 0.9, lit);
    // The shade of a bank is not one blue: the light that comes through the cloud warms it where the bank is heaped.
    vec3 shade = mix(uLidShade, uLidInside * 1.25, 0.5 * smoothstep(0.35, 0.95, metH));
    vec3 colour = mix(shade, uLidSunlit * 1.3, lit);
    // A deck under another stands in the shade the higher one throws away from the sun, and the folds between the heads are darker than the heads.
    float over = 1.0;
    if (i > 0) {
      vec4 higher = LID_DECK[i - 1];
      float a = lidSunk(i - 1) * mix(higher.x, higher.y, 0.3);
      over = 1.0 - 0.5 * lidLeft(i - 1) * smoothstep(0.0, 0.5, lidBank(q + sunSide * 0.42 * (a - met), i - 1, higher.w + lidLess(i - 1), lod + 1.0, true));
    }
    colour *= over;
    // Where a bank is thin the light goes through it: a veil is pale, not a sheet of shade.
    colour = mix(colour, mix(uLidShade, uLidSunlit, 0.42 + 0.4 * lit), 0.7 * (1.0 - smoothstep(0.1, 0.9, alpha)));
    // Seen close, the cloud is paler and its lumps are soft.
    colour = mix(colour, mix(uLidInside, uLidWarm, lit) * 1.5, 0.35 * (1.0 - smoothstep(0.0, 0.05, camA - met)));
    sum += tr * alpha * colour;
    tr *= 1.0 - alpha;
    if (tr < 0.04) break;
  }
  // How much of the one water under the banks is drawn: all of it on the frames about the cut.
  float about = smoothstep(0.8, 0.99, camA) * (1.0 - smoothstep(0.03, 0.7, uLid.z));
  // The shade of the banks lies on the water and the shore under them, thrown away from the sun and farther the higher the bank.
  float shadeIn = uLidShadow * smoothstep(LID_FOOT, LID_FOOT + 0.05, camA) * (1.0 - smoothstep(0.94, 1.0, uLid.z));
  vec2 g = from + lean * (floorA - camA);
  float lightLeft = 1.0;
  // What comes through the banks before their shade is laid on the ground: the mist stands over the ground and takes little of that shade.
  float clear = tr;
  if (shadeIn > 0.0 && tr > 0.06 && floorA < 0.45) {
    float lod = log2(max(reach * (camA - floorA) * LID_TILE, 1.0));
    for (int i = 0; i < LID_DECKS; i++) {
      vec4 deck = LID_DECK[i];
      float a = lidSunk(i) * (deck.x + 0.3 * (deck.y - deck.x));
      vec2 q = g + sunSide * 0.42 * (a - floorA);
      lightLeft *= 1.0 - 0.75 * lidLeft(i) * smoothstep(0.12, 0.6, lidBank(q, i, deck.w + lidLess(i), lod + log2(deck.z), true));
    }
    tr *= 1.0 - shadeIn * (1.0 - lightLeft);
  }
  // About the cut the land round the lake lies in the shade of the banks and in the evening mist under them, in patches: what is the Eye's
  // shore on one side of the cut and the rise's on the other is seen through it, and neither is seen bare on those frames.
  if (about > 0.0 && tr > 0.02 && floorA < 0.02) {
    float patches = textureLod(uLidMap, g * 0.9 + 0.3, max(log2(max(reach * camA * 0.9 * LID_TILE, 1.0)), 4.5)).g;
    // It stands thick wherever the one water is not drawn whole, so neither place shows its own shore under it on the frames of the cut.
    // Its edge is no oval: tongues of it lie out over the water, some far, some not at all.
    float tongues = smoothstep(0.3, 0.75, 0.6 * vnoise(g * 1.7 + 3.1) + 0.4 * vnoise(g * 4.3 + 8.2));
    float torn = 0.6 * vnoise(g * 9.0 + 6.1) + 0.4 * vnoise(g * 21.0 + 0.9);
    float cover = smoothstep(0.8, 0.93, length(g / (LID_LAKE * uLidWater.w)) * (1.0 + 0.3 * tongues + 0.08 * (torn - 0.5)));
    // Banks of it lie on the water as well, so the water is seen in several places of unlike shape and not as one dark round.
    cover = max(cover, smoothstep(0.55, 0.65, 0.55 * vnoise(g * 2.9 + 11.3) + 0.3 * vnoise(g * 6.7 + 4.9) + 0.15 * torn));
    // Seen from above it is a low sheet of cloud with heads of its own, which the sun finds.
    float lumps = 0.5 * vnoise(g * 3.7 + 1.9) + 0.3 * vnoise(g * 8.9 + 5.3) + 0.2 * vnoise(g * 19.0 + 2.7);
    float heads = smoothstep(0.3, 0.8, lumps);
    // It comes and goes in patches, the thin places first, not all at once as a picture fades.
    float mist = cover * (1.0 - smoothstep(0.0, 0.3, (1.0 - about) * 1.35 - lumps)) * (0.975 + 0.025 * patches);
    vec3 fog = mix(uLidShade * (0.42 + 0.3 * patches), uLidSunlit * 0.8, 0.35 * heads);
    sum += clear * mist * fog * mix(1.0, lightLeft, 0.4);
    tr *= 1.0 - mist;
  }
  // One water under the banks. On the frames about the cut the deep water of the lake is drawn here, the same in both places, with the wind
  // on it and the shade of the banks: the Eye's own water goes over to it as the lens nears the cut, and it goes over to the rise's after.
  // It has no edge: toward the shores each place keeps its own lake, and the banks hide what differs.
  float water = about * (1.0 - smoothstep(0.93, 1.02, length(g / (LID_LAKE * uLidWater.w))));
  if (water > 0.0 && tr > 0.02 && floorA < 0.02) {
    vec2 wind = normalize(uLidDrift);
    vec2 along = vec2(wind.x * g.x + wind.y * g.y, -wind.y * g.x + wind.x * g.y) * vec2(0.3, 1.0);
    float windOn = 0.5 * vnoise(along * 7.0 + uLid.y * vec2(0.5, 0.0) + 4.4) + 0.3 * vnoise(along * 19.0 - uLid.y * vec2(1.1, 0.0) + 1.3) + 0.2 * vnoise(along * 47.0 + 7.7);
    sum += tr * water * uLidWater.rgb * (0.78 + 0.44 * windOn);
    tr *= 1.0 - water;
  }
  return vec4(sum, tr);
}`;
