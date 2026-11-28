// The banks: what is left of the evening cloud over the socket once the lens is well over it. One deck of plain geometry at one height,
// a flat sheet with painted maps (the photographs of cloud in cloud.data.ts) for where cloud stands, how high its heads are and how the
// sun of the rise falls on them. It stays where it is: the lens leaves it below, it shrinks as anything left below shrinks, and its
// open places widen as the lens sees more of it at once, until thin wisps are left about one place, and then nothing. It comes in under
// the mist of the lid as the mist goes, by the height of the lens alone; nothing of it goes by the clock. Measures are the lid's: one
// unit across is half the height of the view on the water at the cut, one unit up is the height of the camera at the cut.
import * as THREE from 'three';

/** The one deck. low and top: between which heights it stands. last: the place, in units across from the line of the climb at the cut, where its last wisps stand. */
export const BANK_DECK = { low: 0.82, top: 0.9, last: [0.72, -0.1], relief: 0.012 };

/** The half axes, in units across, of the lake about the line of the climb: the banks are fewest over it at first. */
export const BANK_LAKE = [1.17, 0.84];

/** How high the lens is, in heights of the camera at the cut, when the banks begin to come, and when they stand whole. */
export const BANK_FROM = 1.015;
export const BANK_FULL = 1.075;

/** How high the lens is when nothing is left of the banks: from there on they are not drawn. */
export const BANK_GONE = 3.0;

/**
 * The uniforms of the banks, from those of the lid: the same frame, colours, shade and photographs, lit by the sun of the rise.
 */
export function banksUniforms(lid: Record<string, THREE.IUniform>, sun: readonly number[]): Record<string, THREE.IUniform> {
  const of = (name: string): THREE.IUniform => lid[name] as THREE.IUniform;
  return {
    uBankFrame: of('uLidFrame'),
    uBankSun: { value: new THREE.Vector3(sun[0], sun[1], sun[2]).normalize() },
    uBankSunlit: of('uLidSunlit'),
    uBankShade: of('uLidShade'),
    uBankInside: of('uLidInside'),
    uBankShadow: of('uLidShadow'),
    uBankWater: of('uLidWater'),
    uBankMap: of('uLidMap'),
    // The rows of pixels the banks are read for at the height of the cut; as the lens climbs they are read finer.
    uBankRows: { value: 720 },
  };
}

const G = (n: number): string => n.toFixed(4);

export const BANKS_GLSL = /* glsl */ `
uniform vec4 uBankFrame;
uniform vec3 uBankSun;
uniform vec3 uBankSunlit;
uniform vec3 uBankShade;
uniform vec3 uBankInside;
uniform float uBankShadow;
uniform vec4 uBankWater;
uniform sampler2D uBankMap;
uniform float uBankRows;

const float BANK_LOW = ${G(BANK_DECK.low)};
const float BANK_TOP = ${G(BANK_DECK.top)};
const float BANK_RELIEF = ${G(BANK_DECK.relief)};
const vec2 BANK_LAST = vec2(${G(BANK_DECK.last[0] as number)}, ${G(BANK_DECK.last[1] as number)});
const float BANK_TILE = ${G(512)};
const vec2 BANK_LAKE = vec2(${BANK_LAKE.map(G).join(', ')});

// The deck at a place, read from the photographs of banks of cumulus. x: how much cloud stands there: banks of two sizes with their
// smaller heads, and open places between them, some wide and some narrow. y: how high its heads stand, 0 to 1: the banks, the same banks
// smaller on them, and smaller again, so the top has heads of every size the lens is near enough to see. 'lod' is how coarse the eye
// sees the place: nothing finer than a pixel is read, so nothing swims.
vec2 bankHeads(vec2 p, float lod, bool fine, float soft) {
  float big = textureLod(uBankMap, p * 1.6 + vec2(0.31, 0.62), max(lod + 0.68, 0.0) + 0.7 * soft).r;
  vec2 p2 = vec2(0.8 * p.x - 0.6 * p.y, 0.6 * p.x + 0.8 * p.y);
  float mid = textureLod(uBankMap, p2 * 5.3 + 0.37, max(lod + 2.41, 0.0)).r;
  float small = textureLod(uBankMap, p2.yx * 13.0 + vec2(0.63, 0.18), max(lod + 3.7, 0.0)).r;
  float h = 0.4 * big + 0.34 * mid + 0.26 * small;
  if (fine) h += 0.12 * (textureLod(uBankMap, p.yx * 31.0 + 0.11, max(lod + 4.95, 0.0)).r - 0.3) * (1.0 - smoothstep(4.0, 7.0, lod + 4.95));
  // From far over it the eye takes the deck by its banks: the small heads no longer break their edges into flecks.
  return vec2(max(big, 0.85 * mid * (1.0 - 0.75 * soft)) * (0.74 + 0.26 * mix(small, 0.6, soft)), h);
}

// How much of the banks stands at a place of the deck, 0 to 1, for a lens at a height. The open places of the photographs are open air
// and only their banks stand. As the lens sees more of the deck at once the open places widen, until thin wisps are left about one
// place, and then nothing. All by the height of the lens.
float bankStands(vec2 p, float n, float camA) {
  float above = camA - BANK_TOP;
  float near = 1.0 - smoothstep(0.08, 0.45, length(p - BANK_LAST));
  // About the first open place the banks are few; farther out more of them stand, and thin with the height like the rest.
  float first = mix(0.5, 0.3, smoothstep(1.0, 2.2, length(p / (BANK_LAKE * uBankWater.w * (1.0 - BANK_TOP)))));
  float open = mix(first, 0.95, smoothstep(0.15, 0.7, above)) - 0.38 * near * smoothstep(0.3, 0.8, above) + 1.2 * smoothstep(1.9, ${G(BANK_GONE)}, camA);
  // The edge of a bank is a soft one, softer from far over it.
  float feather = smoothstep(0.12, 0.3, above);
  float cloud = smoothstep(open - 0.12 - 0.08 * feather, open + 0.18 + 0.2 * feather, n);
  return cloud;
}

// The banks between the eye and whatever lies at 'far' along the ray: rgb is their light, a is how much of what lies behind comes through.
vec4 banksOver(vec3 ro, vec3 rd, float far) {
  float camA = ro.y / uBankFrame.w;
  vec2 from = (ro.xz - uBankFrame.xy) / uBankFrame.z;
  // The ray in the lid's measure, by the height it has come down to.
  vec2 lean = rd.xz / uBankFrame.z / (rd.y / uBankFrame.w);
  // How far a pixel reaches across, for each unit of height under the lens: reckoned from the lens and the rows of the picture, not
  // measured between neighbouring pixels, which under a branch is not the same twice. As the lens leaves the deck below it is read finer.
  float narrow = uBankFrame.w / uBankFrame.z;
  float rows = uBankRows * (1.0 + 2.0 * smoothstep(1.0, 1.3, camA));
  float reach = min((2.0 / rows) * (1.0 + dot(lean, lean) / (narrow * narrow)), 0.2);
  float floorA = camA + rd.y * far / uBankFrame.w;
  vec3 ld = normalize(vec3(rd.x, rd.y * uBankFrame.z / uBankFrame.w, rd.z));
  vec2 sunSide = normalize(uBankSun.xz);
  float above = camA - BANK_TOP;
  float come = smoothstep(${G(BANK_FROM)}, ${G(BANK_FULL)}, camA);
  vec3 sum = vec3(0.0);
  float tr = 1.0;
  if (camA > BANK_LOW && floorA < BANK_LOW) {
    float soft = smoothstep(0.12, 0.3, above);
    float lod = log2(max(reach * max(above, 0.0) * BANK_TILE, 1.0));
    // Where the ray meets the deck: on its top. The heads stand to the top and the folds
    // between them lie lower, so a leaning ray meets a fold a little farther on: the heads slide against the folds as the lens moves.
    vec2 q = from - lean * above;
    vec2 h = bankHeads(q, lod, true, soft);
    q = from - lean * (above + BANK_RELIEF * (1.0 - h.y));
    h = bankHeads(q, lod, true, soft);
    float alpha = bankStands(q, h.x, camA);
    if (alpha > 0.0) {
      // One low sun: a head is lit where the cloud a little way toward the sun stands no higher, and in its own shade on the other side.
      // How far toward the sun the eye compares: by how much of the deck it sees, so a head has a lit and a shaded side at any height.
      float span = clamp(above / 0.3, 0.25, 1.5);
      vec2 hs = bankHeads(q + sunSide * 0.02 * span, lod + 0.5, true, soft);
      vec2 hf = bankHeads(q + sunSide * 0.005 * span, lod, true, soft);
      vec2 hb = bankHeads(q + sunSide * 0.06 * span, lod + 1.5, true, soft);
      // Slow swells in the top of the deck, wider than the heads: no place of it is one flat tone.
      float swell = 0.6 * vnoise(q * 23.0 + 3.7) + 0.4 * vnoise(q * 61.0 + 8.1);
      // The photographs are of cloud in the light: where they are bright a head stands in the sun, where they are dark lies a fold.
      // Near the deck the heads of every size tell; from high over it, the banks as the photographs have them, with their own soft light.
      float far = smoothstep(0.15, 0.6, above);
      float tone = smoothstep(0.25, 1.0, h.x);
      float lit = mix(0.06 + 0.2 * h.y + 0.3 * tone, 0.1 + 0.45 * tone + 0.2 * (h.y - 0.3), far) + mix(1.7, 1.5, far) * (1.0 * (h.y - hs.y) + 1.0 * (h.y - hf.y) + 0.9 * (h.y - hb.y));
      // A head throws its shade on the lower cloud behind it.
      lit -= 0.45 * smoothstep(0.06, 0.3, hb.y - h.y);
      // A bank is lit on its side toward the sun and in its own shade on the other, and so is the edge of the deck.
      lit += 0.8 * clamp(h.x - hs.x, -0.3, 0.3) + 0.55 * clamp(h.x - hb.x, -0.3, 0.3);
      // The edge of an open place is a side of cloud: lit where it faces the sun, in shade where it faces away.
      lit += 0.5 * clamp(alpha - bankStands(q + sunSide * 0.02 * span, hs.x, camA), -1.0, 1.0);
      // What is left at the last is thin and in shade.
      float late = smoothstep(0.35, 0.8, above);
      lit *= 1.0 - 0.55 * late;
      // The low cloud between the heads lies in their shade, and is not one tone either.
      lit = clamp(max(lit, -0.04) + 0.06 + 0.24 * swell, 0.0, 1.0);
      // The shade of a bank is not one blue: the light that comes through the cloud warms it where the bank is heaped.
      vec3 shade = mix(uBankShade, uBankInside * 1.25, 0.5 * smoothstep(0.35, 0.95, h.y));
      // The top of a deck lies under the whole sky and beside lit cloud: its folds are in soft shade, never dark.
      shade = mix(shade, uBankSunlit, 0.22);
      // The eye reads light by its ratio: the half tones of a bank lie low between its shade and its sunlit heads.
      float bright = smoothstep(0.0, 1.1, lit);
      vec3 colour = mix(shade, uBankSunlit * 1.05, bright * bright * (0.35 + 0.65 * bright));
      // Where the cloud is thin the light goes through it: a veil is pale, not a sheet of shade.
      colour = mix(colour, mix(uBankShade, uBankSunlit, 0.42 + 0.4 * lit), 0.3 * (1.0 - smoothstep(0.1, 0.9, alpha)) * (1.0 - late));
      // The banks come as the mist over them goes: thin at first, whole by the time the mist is gone.
      alpha *= come;
      alpha *= 1.0 - 0.6 * late;
      sum = alpha * colour;
      tr = 1.0 - alpha;
    }
  }
  // The shade of the banks lies on the water and the shore under them, thrown away from the sun, and comes down soft: they stand high.
  float shadeIn = uBankShadow * come * smoothstep(1.0, 1.1, camA);
  vec2 g = from + lean * (floorA - camA);
  if (shadeIn > 0.0 && tr > 0.02 && floorA < 0.45) {
    vec2 q = g + sunSide * 0.42 * (BANK_TOP - floorA);
    float lod = log2(max(reach * (camA - floorA) * BANK_TILE, 1.0));
    vec2 h = bankHeads(q, lod + 2.6, false, 1.0);
    tr *= 1.0 - 0.62 * shadeIn * bankStands(q, h.x, camA) * (1.0 - 0.6 * smoothstep(0.35, 0.8, above));
  }
  return vec4(sum, tr);
}`;
