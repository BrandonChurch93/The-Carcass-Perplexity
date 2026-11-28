// The lid: one deck of evening cloud that stands over the socket of the Eye, at one height for the whole climb. The lens comes up under it
// and sees its shade on the water, is in the white of it for a few frames, and comes out over its top, where the Eye hands over to the rise.
// From there the deck stays where it is: the lens leaves it below, it shrinks as anything left below shrinks, and gaps open in it as the
// lens sees more of it at once, until a few heads stand over the lake with their shade on the water. Nothing of it goes by the clock.
// The deck is a flat sheet with painted maps (the photographs of cloud in cloud.data.ts) for where cloud stands, how high its heads are and
// how the one low sun falls on them. Both places draw it with this one function, from the numbers of handoff.json, in the lid's own measure:
// one unit across is half the height of the view on the water at the cut, and one unit up is the height of the camera at the cut. A ray
// through one point of the frame is then the same ray in both places.
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

/** The one deck. low and top: between which heights it stands. last: the place, in units across from the line of the climb at the cut, where its last heads stand. */
export const LID_DECK = { low: 0.82, top: 0.9, last: [0.72, -0.1], relief: 0.012 };

/** foot: the height at which the Eye begins to draw the lid. lowest: the foot of the deck: no cloud stands where the lens could have seen it from under the foot. */
export const LID_GAP = { foot: 0.79, lowest: LID_DECK.low };

/** The half axes, in units across, of the water both places share about the cut, for a reach of 1: the rise's lake is longer than it is wide. */
export const LID_LAKE = [1.17, 0.84];

/** How high the lens is, in heights of the camera at the cut, when nothing is left of the deck: from there on the rise does not draw it. */
export const LID_GONE = 3.0;

/** How far from the line of the climb, in units across, open air is seen through the deck on the frames of the cut: none, the deck is whole there. */
export function lidGapSeen(): number {
  return 0;
}

const G = (n: number): string => n.toFixed(4);

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

// The Eye begins to draw the lid when its lens is this high.
const float LID_FOOT = ${G(LID_GAP.foot)};
const float LID_LOW = ${G(LID_DECK.low)};
const float LID_TOP = ${G(LID_DECK.top)};
const float LID_RELIEF = ${G(LID_DECK.relief)};
const vec2 LID_LAST = vec2(${G(LID_DECK.last[0] as number)}, ${G(LID_DECK.last[1] as number)});
const float LID_TILE = ${G(512)};
const vec2 LID_LAKE = vec2(${LID_LAKE.map(G).join(', ')});

// The deck at a place, read from the photographs of banks of cumulus. x: how much cloud stands there: banks of two sizes with their
// smaller heads, and open places between them, some wide and some narrow. y: how high its heads stand, 0 to 1: the banks, the same banks
// smaller on them, and smaller again, so the top has heads of every size the lens is near enough to see. 'lod' is how coarse the eye
// sees the place: nothing finer than a pixel is read, so nothing swims.
vec2 lidHeads(vec2 p, float lod, bool fine, float soft) {
  float big = textureLod(uLidMap, p * 1.6 + vec2(0.31, 0.62), max(lod + 0.68, 0.0) + 0.7 * soft).r;
  vec2 p2 = vec2(0.8 * p.x - 0.6 * p.y, 0.6 * p.x + 0.8 * p.y);
  float mid = textureLod(uLidMap, p2 * 5.3 + 0.37, max(lod + 2.41, 0.0)).r;
  float small = textureLod(uLidMap, p2.yx * 13.0 + vec2(0.63, 0.18), max(lod + 3.7, 0.0)).r;
  float h = 0.4 * big + 0.34 * mid + 0.26 * small;
  if (fine) h += 0.12 * (textureLod(uLidMap, p.yx * 31.0 + 0.11, max(lod + 4.95, 0.0)).r - 0.3) * (1.0 - smoothstep(4.0, 7.0, lod + 4.95));
  // From far over it the eye takes the deck by its banks: the small heads no longer break their edges into flecks.
  return vec2(max(big, 0.85 * mid * (1.0 - 0.75 * soft)) * (0.74 + 0.26 * mix(small, 0.6, soft)), h);
}

// Where the deck may open, 0 to 1, for a lens at a height. On the frames about the cut only over the deep water both places share, its
// edge a cloud's edge that keeps inside the lake's shore; from the cut on, farther and farther out, and soon everywhere.
float lidShared(vec2 p, float camA) {
  float wide = 1.0 + 6.0 * smoothstep(1.0, 1.06, camA) + 200.0 * smoothstep(1.04, 1.2, camA);
  float ragged = 1.0 + 0.16 * (1.0 - vnoise(p * 13.0 + 6.1)) + 0.18 * (1.0 - vnoise(p * 31.0 + 2.3)) + 0.1 * (1.0 - vnoise(p * 83.0 + 5.1));
  return (1.0 - smoothstep(0.81, 0.93, ragged * length(p / (LID_LAKE * uLidWater.w * (1.0 - LID_TOP))) / wide)) * smoothstep(0.0, 0.04, camA - LID_TOP);
}

// How much cloud stands at a place of the deck, x, 0 to 1, for a lens at a height, how whole the deck is there, y, and its banks alone, z. All by the
// height, the same in both places: while the lens is in the deck and as it leaves the top the deck is whole, the white before the
// glass. Over the top, where the deck may open, the open places of the photographs are open air and only their banks stand. As the
// lens sees more of the deck at once the open places widen, until thin wisps are left about one place, and then nothing.
vec3 lidStands(vec2 p, float n, float camA) {
  float above = camA - LID_TOP;
  float near = 1.0 - smoothstep(0.08, 0.45, length(p - LID_LAST));
  // About the first open place the banks are few; farther out more of them stand, and thin with the height like the rest.
  float first = mix(0.5, 0.3, smoothstep(1.0, 2.2, length(p / (LID_LAKE * uLidWater.w * (1.0 - LID_TOP)))));
  float open = mix(first, 0.95, smoothstep(0.15, 0.7, above)) - 0.38 * near * smoothstep(0.3, 0.8, above) + 1.2 * smoothstep(1.9, ${G(LID_GONE)}, camA);
  // The edge of a bank is a soft one, softer from far over it.
  float feather = smoothstep(0.12, 0.3, above);
  float cloud = smoothstep(open - 0.12 - 0.08 * feather, open + 0.18 + 0.2 * feather, n);
  float shared = lidShared(p, camA);
  return vec3(mix(1.0, cloud, shared), 1.0 - shared, cloud);
}

// The cloud between the eye and whatever lies at 'far' along the ray: rgb is its light, a is how much of what lies behind comes through.
vec4 lidOver(vec3 ro, vec3 rd, float far) {
  float camA = ro.y / uLidFrame.w;
  vec2 from = (ro.xz - uLidFrame.xy) / uLidFrame.z;
  // The ray in the lid's measure, by the height it has come down to.
  vec2 lean = rd.xz / uLidFrame.z / (rd.y / uLidFrame.w);
  // How far a pixel reaches across, for each unit of height under the lens: reckoned from the lens and the rows of the picture, not
  // measured between neighbouring pixels, which under a branch is not the same twice. On the frames about the cut both places read the
  // deck for the same rows; as the lens leaves the deck below, the rise reads it finer.
  float narrow = uLidFrame.w / uLidFrame.z;
  float rows = uLidRows * (1.0 + 2.0 * smoothstep(1.0, 1.3, camA));
  float reach = min((2.0 / rows) * (1.0 + dot(lean, lean) / (narrow * narrow)), 0.2);
  float floorA = camA + rd.y * far / uLidFrame.w;
  vec3 ld = normalize(vec3(rd.x, rd.y * uLidFrame.z / uLidFrame.w, rd.z));
  vec2 sunSide = normalize(uLidSun.xz);
  float above = camA - LID_TOP;
  vec3 sum = vec3(0.0);
  float tr = 1.0;
  if (camA > LID_LOW && floorA < LID_LOW) {
    float close = 1.0 - smoothstep(0.0, 0.05, above);
    float soft = smoothstep(0.12, 0.3, above);
    float lod = log2(max(reach * max(above, 0.0) * LID_TILE, 1.0)) + 3.0 * close;
    // Where the ray meets the deck: on its top, or at the lens itself while the lens is inside. The heads stand to the top and the folds
    // between them lie lower, so a leaning ray meets a fold a little farther on: the heads slide against the folds as the lens moves.
    vec2 q = from + lean * (min(above, 0.0) - max(above, 0.0));
    // Where the deck is whole it is one soft top, seen without the edges of its banks.
    lod += 2.0 * (1.0 - lidShared(q, camA)) * (1.0 - close);
    vec2 h = lidHeads(q, lod, true, soft);
    if (above > 0.0) {
      q = from - lean * (above + LID_RELIEF * (1.0 - h.y));
      h = lidHeads(q, lod, true, soft);
    }
    vec3 stands = lidStands(q, h.x, camA);
    float alpha = stands.x;
    if (alpha > 0.0) {
      // One low sun: a head is lit where the cloud a little way toward the sun stands no higher, and in its own shade on the other side.
      // How far toward the sun the eye compares: by how much of the deck it sees, so a head has a lit and a shaded side at any height.
      float span = clamp(above / 0.3, 0.25, 1.5);
      vec2 hs = lidHeads(q + sunSide * 0.02 * span, lod + 0.5, true, soft);
      vec2 hf = lidHeads(q + sunSide * 0.005 * span, lod, true, soft);
      vec2 hb = lidHeads(q + sunSide * 0.06 * span, lod + 1.5, true, soft);
      // Slow swells in the top of the deck, wider than the heads: no place of it is one flat tone.
      float swell = 0.6 * vnoise(q * 23.0 + 3.7) + 0.4 * vnoise(q * 61.0 + 8.1);
      vec2 qs = q + sunSide * 0.006;
      float swellSun = 0.6 * vnoise(qs * 23.0 + 3.7) + 0.4 * vnoise(qs * 61.0 + 8.1);
      // The photographs are of cloud in the light: where they are bright a head stands in the sun, where they are dark lies a fold.
      // Near the deck the heads of every size tell; from high over it, the banks as the photographs have them, with their own soft light.
      float far = smoothstep(0.15, 0.6, above);
      float tone = smoothstep(0.25, 1.0, h.x);
      float lit = mix(0.06 + 0.2 * h.y + 0.3 * tone, 0.1 + 0.45 * tone + 0.2 * (h.y - 0.3), far) + mix(1.7, 1.5, far) * (1.0 * (h.y - hs.y) + 1.0 * (h.y - hf.y) + 0.9 * (h.y - hb.y));
      // A head throws its shade on the lower cloud behind it.
      lit -= 0.45 * smoothstep(0.06, 0.3, hb.y - h.y);
      // A bank is lit on its side toward the sun and in its own shade on the other, and so is the edge of the deck.
      lit += 0.8 * clamp(h.x - hs.x, -0.3, 0.3) + 0.55 * clamp(h.x - hb.x, -0.3, 0.3);
      // Where the deck is whole, low cloud lies between the banks: lit too, in swells with a sunward and a shaded side.
      // Its top is small heads, far smaller than the banks, each with its lit side.
      float puffs = textureLod(uLidMap, q * 2.6 + vec2(0.2, 0.7), max(lod + 1.2, 0.0)).g;
      float puffsSun = textureLod(uLidMap, (q + sunSide * 0.012 * span) * 2.6 + vec2(0.2, 0.7), max(lod + 1.7, 0.0)).g;
      lit += stands.y * (1.0 - smoothstep(0.15, 0.6, h.x)) * (0.3 + 0.2 * puffs + 1.0 * (puffs - puffsSun) + 0.15 * swell + 1.6 * (swell - swellSun));
      // The edge of an open place is a side of cloud: lit where it faces the sun, in shade where it faces away.
      lit += 0.5 * clamp(alpha - lidStands(q + sunSide * 0.02 * span, hs.x, camA).x, -1.0, 1.0);
      // What is left at the last is thin and in shade.
      float late = smoothstep(0.35, 0.8, above);
      lit *= 1.0 - 0.55 * late;
      // The low cloud between the heads lies in their shade, and is not one tone either.
      lit = clamp(max(lit, -0.04) + 0.06 + 0.24 * swell, 0.0, 1.0);
      // The shade of a bank is not one blue: the light that comes through the cloud warms it where the bank is heaped.
      vec3 shade = mix(uLidShade, uLidInside * 1.25, 0.5 * smoothstep(0.35, 0.95, h.y));
      // The top of a deck lies under the whole sky and beside lit cloud: its folds are in soft shade, never dark.
      shade = mix(shade, uLidSunlit, mix(0.22, 0.4, stands.y));
      // The eye reads light by its ratio: the half tones of a bank lie low between its shade and its sunlit heads.
      float bright = smoothstep(0.0, 1.1, lit);
      vec3 colour = mix(shade, uLidSunlit * 1.05, bright * bright * (0.35 + 0.65 * bright));
      // Where the cloud is thin the light goes through it: a veil is pale, not a sheet of shade.
      colour = mix(colour, mix(uLidShade, uLidSunlit, 0.42 + 0.4 * lit), mix(0.3, 0.85, stands.y) * (1.0 - smoothstep(0.1, 0.9, alpha)) * (1.0 - late));
      // Inside the deck and just over it the cloud is the white before the glass, with no more than a breath of the heads in it.
      colour = mix(colour, mix(uLidInside, uLidWarm, 0.35 + 0.3 * lit) * 2.1, close);
      // The lens climbs into the deck from under it: the more of the deck lies under the lens, the less of the water comes through.
      if (above < 0.0) alpha *= 1.0 - exp(-4.5 * (camA - LID_LOW) / ((LID_TOP - LID_LOW) * max(-ld.y, 0.3)));
      alpha *= 1.0 - 0.6 * late;
      sum = alpha * colour;
      tr = 1.0 - alpha;
    }
  }
  // The shade of the banks lies on the water and the shore under them, thrown away from the sun. The low cloud between them is thin
  // and lets the light through: the lake under the deck is water in the evening light, with the shade of the banks on it.
  // While the deck is all but whole the water under it lies in one even shade; the shade of single banks comes as the deck opens.
  float shadeIn = uLidShadow * smoothstep(LID_FOOT, LID_FOOT + 0.05, camA) * smoothstep(1.0, 1.1, camA);
  vec2 g = from + lean * (floorA - camA);
  if (shadeIn > 0.0 && tr > 0.02 && floorA < 0.45) {
    vec2 q = g + sunSide * 0.42 * (LID_TOP - floorA);
    float lod = log2(max(reach * (camA - floorA) * LID_TILE, 1.0));
    // The banks stand high over the water: their shade comes down soft.
    vec2 h = lidHeads(q, lod + 2.6, false, 1.0);
    tr *= 1.0 - 0.62 * shadeIn * lidStands(q, h.x, max(camA, LID_TOP + 0.04)).z * (1.0 - 0.6 * smoothstep(0.35, 0.8, above));
  }
  // One water under the deck. On the frames about the cut the deep water of the lake is drawn here, the same in both places, with the wind
  // on it and the shade of the deck: the Eye's own water goes over to it as the lens nears the cut, and it goes over to the rise's as the
  // lens climbs on. It has no edge: toward the shores each place keeps its own lake, and on those frames the deck is whole over them.
  float about = smoothstep(0.8, 0.99, camA) * (1.0 - smoothstep(1.0, 1.06, camA));
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
