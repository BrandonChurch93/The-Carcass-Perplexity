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
export const LID_DECK = { low: 0.82, top: 0.9, last: [0.15, 0.06], relief: 0.012 };

/** foot: the height at which the Eye begins to draw the lid. lowest: the foot of the deck: no cloud stands where the lens could have seen it from under the foot. */
export const LID_GAP = { foot: 0.79, lowest: LID_DECK.low };

/** The half axes, in units across, of the water both places share about the cut, for a reach of 1: the rise's lake is longer than it is wide. */
export const LID_LAKE = [1.17, 0.84];

/** How high the lens is, in heights of the camera at the cut, when nothing is left of the deck: from there on the rise does not draw it. */
export const LID_GONE = 3.8;

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

// The deck at a place, read from the photographs of banks of cumulus. x: how much cloud stands there: a bank with its smaller heads,
// and open places between the banks. y: how high its heads stand, 0 to 1: the banks, the same banks smaller on them, and smaller again,
// so the top has heads of every size the lens is near enough to see. 'lod' is how coarse the eye sees the place: nothing finer than a
// pixel is read, so nothing swims.
vec2 lidHeads(vec2 p, float lod, bool fine) {
  float big = textureLod(uLidMap, p * 1.6 + vec2(0.31, 0.62), max(lod + 0.68, 0.0)).r;
  vec2 p2 = vec2(0.8 * p.x - 0.6 * p.y, 0.6 * p.x + 0.8 * p.y);
  float mid = textureLod(uLidMap, p2 * 5.3 + 0.37, max(lod + 2.41, 0.0)).r;
  float small = textureLod(uLidMap, p2.yx * 13.0 + vec2(0.63, 0.18), max(lod + 3.7, 0.0)).r;
  // Between the banks lies lower cloud in small heads.
  float low = textureLod(uLidMap, p2 * 8.3 + vec2(0.21, 0.77), max(lod + 3.05, 0.0)).g;
  float h = 0.4 * big + 0.3 * mid + 0.2 * small + 0.1 * low;
  if (fine) h += 0.12 * (textureLod(uLidMap, p.yx * 31.0 + 0.11, max(lod + 4.95, 0.0)).r - 0.3) * (1.0 - smoothstep(4.0, 7.0, lod + 4.95));
  return vec2(big * (0.7 + 0.3 * mid), h);
}

// How much cloud stands at a place of the deck, over nothing: the deck is thickest about its last heads and thins away from them, and
// 'open' is how much of it the height of the lens has opened. The banks stay longest, and their edges are those of the photographs.
float lidBody(vec2 p, vec2 h, float open) {
  float m = 1.1 - 1.75 * length(p - LID_LAST);
  return m + 0.9 * smoothstep(0.03, 0.42, h.x) - open;
}

// How open the deck is to a lens at a height: whole while the lens is in it and just over it, then gaps open as the lens sees more of
// the deck at once, and what is left thins to nothing far below. By the height alone, the same in both places.
float lidOpen(float camA) {
  return 0.15 + 1.25 * smoothstep(0.11, 0.8, camA - LID_TOP) + 1.8 * smoothstep(2.0, ${G(LID_GONE)}, camA);
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
  float open = lidOpen(camA);
  vec3 sum = vec3(0.0);
  float tr = 1.0;
  if (camA > LID_LOW && floorA < LID_LOW) {
    float lod = log2(max(reach * max(above, 0.0) * LID_TILE, 1.0));
    // Where the ray meets the deck: on its top, or at the lens itself while the lens is inside. The heads stand to the top and the folds
    // between them lie lower, so a leaning ray meets a fold a little farther on: the heads slide against the folds as the lens moves.
    vec2 q = from + lean * (min(above, 0.0) - max(above, 0.0));
    vec2 h = lidHeads(q, lod, true);
    if (above > 0.0) {
      q = from - lean * (above + LID_RELIEF * (1.0 - h.y));
      h = lidHeads(q, lod, true);
    }
    float body = lidBody(q, h, open);
    float alpha = smoothstep(0.0, 0.3, body);
    // Once the lens is high enough for gaps to open, no cloud stands where the photograph has none: the deck leaves no veil behind it.
    alpha *= mix(1.0, smoothstep(0.02, 0.2, h.x), smoothstep(0.11, 0.45, above));
    if (alpha > 0.0) {
      // One low sun: a head is lit where the cloud a little way toward the sun stands no higher, and in its own shade on the other side.
      vec2 hs = lidHeads(q + sunSide * 0.02, lod + 0.5, false);
      vec2 hf = lidHeads(q + sunSide * 0.005, lod, true);
      vec2 hb = lidHeads(q + sunSide * 0.06, lod + 1.5, false);
      // Slow swells in the top of the deck, wider than the heads: no place of it is one flat tone.
      float swell = 0.6 * vnoise(q * 23.0 + 3.7) + 0.4 * vnoise(q * 61.0 + 8.1);
      // The photographs are of cloud in the light: where they are bright a head stands in the sun, where they are dark lies a fold.
      // Near the deck the heads of every size tell; from high over it, the banks as the photographs have them, with their own soft light.
      float far = smoothstep(0.15, 0.6, above);
      float lit = mix(0.6 * h.y + 0.12 * h.x, 0.08 + 0.8 * h.x + 0.25 * (h.y - 0.3), far) + mix(1.0, 0.45, far) * (1.0 * (h.y - hs.y) + 1.0 * (h.y - hf.y) + 0.9 * (h.y - hb.y));
      // A head throws its shade on the lower cloud behind it.
      lit -= 0.3 * smoothstep(0.08, 0.3, hb.y - h.y);
      // A bank is lit on its side toward the sun and in its own shade on the other, and so is the edge of the deck.
      lit += 1.3 * clamp(h.x - hs.x, -0.3, 0.3) + 0.9 * clamp(h.x - hb.x, -0.3, 0.3);
      float edge = clamp(body - lidBody(q + sunSide * 0.02, hs, open), -0.4, 0.4);
      lit += (edge > 0.0 ? 0.8 : 1.3) * edge * (1.0 - smoothstep(0.25, 0.9, body));
      // The low cloud between the heads lies in their shade, and is not one tone either.
      lit = clamp(max(lit, -0.04) + 0.06 + 0.24 * swell, 0.0, 1.0);
      // The shade of a bank is not one blue: the light that comes through the cloud warms it where the bank is heaped.
      vec3 shade = mix(uLidShade, uLidInside * 1.25, 0.5 * smoothstep(0.35, 0.95, h.y));
      vec3 colour = mix(shade, uLidSunlit * 1.22, smoothstep(0.0, 0.9, lit));
      // Where the cloud is thin the light goes through it: a veil is pale, not a sheet of shade.
      colour = mix(colour, mix(uLidShade, uLidSunlit, 0.42 + 0.4 * lit), 0.7 * (1.0 - smoothstep(0.1, 0.9, alpha)));
      // Inside the deck and just over it the cloud is the white before the glass, with no more than a breath of the heads in it.
      float close = 1.0 - smoothstep(0.0, 0.05, above);
      colour = mix(colour, mix(uLidInside, uLidWarm, 0.35 + 0.3 * lit) * 2.1, close);
      // The lens climbs into the deck from under it: the more of the deck lies under the lens, the less of the water comes through.
      if (above < 0.0) alpha *= 1.0 - exp(-4.5 * (camA - LID_LOW) / ((LID_TOP - LID_LOW) * max(-ld.y, 0.3)));
      sum = alpha * colour;
      tr = 1.0 - alpha;
    }
  }
  // The shade of the deck lies on the water and the shore under it, thrown away from the sun, with the gaps of the deck in it.
  float shadeIn = uLidShadow * smoothstep(LID_FOOT, LID_FOOT + 0.05, camA);
  if (shadeIn > 0.0 && tr > 0.02 && floorA < 0.45) {
    vec2 g = from + lean * (floorA - camA);
    vec2 q = g + sunSide * 0.42 * (LID_TOP - floorA);
    float lod = log2(max(reach * (camA - floorA) * LID_TILE, 1.0));
    vec2 h = lidHeads(q, lod + 1.0, false);
    tr *= 1.0 - 0.9 * shadeIn * smoothstep(0.0, 0.3, lidBody(q, h, open)) * mix(1.0, smoothstep(0.02, 0.2, h.x), smoothstep(0.11, 0.45, above));
  }
  return vec4(sum, tr);
}`;
