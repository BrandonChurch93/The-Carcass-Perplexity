// The light rig of the Ribs: the uniforms every surface shares, the baked land (height, open sky, the sun's shadow), the drifting mask of
// cloud shadow and the map of contact shade. Owned by the root. Folders read it and never change it, except through the calls below.
import * as THREE from 'three';
import { config } from '../../../config';
import { stream } from '../../../core/rng';
import { RIBS, bladeSpine, landAt as layoutLand } from '../layout';
import { DROWNED, SUN, T0, WIND, keySeconds, shotSpan } from './anchors';
import { OPENING_END, SHAFT_TARGET, openingLight, openingWeight } from './opening';
import { loopPhase, stagedSeconds } from './stage';

// The land map covers the strait and the sea a camera can see the bed through: cells of 4.9 by 4.8 m.
export const LAND = { minX: -1200, maxX: 1300, minZ: -3500, maxZ: 1100, width: 512, height: 960 };
export const CONTACT = { size: 1024, minRadius: 30, maxRadius: 220 };
/** The cloud sheet: its height, metres of one repeat of the mask, and how much of the sun is left under a cloud. */
export const CLOUD = { height: 1500, repeat: 5200, shade: 0.12, size: 512 };
/**
 * The deck: the sun comes down only through the cloud's own gaps. Where the staged break stands the deck is thin, and the gaps of the
 * mask's third field open in it: `shut` is what the break is given where the field is closed, `open` what it is given over that where a
 * gap stands whole, `under` the share of the sky's own light a surface keeps under the shut deck in the approach and the strait (`staged` in a shot that names its own `deck`), `dome` how much further the dome's white is shut than a mirror's, `from` and `to` the field's values a gap's edge runs between, `whole` how far the break is cut by the gaps (0 is the
 * smooth pool of the first two waves). The gaps go with the cloud, so the lit patches cross blades, flats and water at the wind's pace.
 */
/** How many times faster than in the film the scud crosses the dome in the card loop, where the lens is held on the arches. */
export const LOOP_SCUD = 2.5;
export const DECK = { shut: 0.3, open: 1.05, from: 0.42, to: 0.54, whole: 1, under: 0.3, staged: 0.55, dome: 0.1, at: [340, 170] };
export const MAX_EMITTERS = 8;
/** The fine relief of the floor, laid over the bed twice from one tiling picture: metres of a repeat and metres of relief, wide and small. */
export const FINE = { size: 256, wide: 37, wideAmp: 0.2, small: 9.7, smallAmp: 0.07 };
/** The one wide break in the cloud that lets the sun down on the strait: where its light falls on the ground at the establishing key, and its radius, metres. */
export const BREAK = { x: 60, z: -560, radius: 760, gain: 0.8, cover: 0.62, bounce: 2.2 };
/**
 * The break by shot: where the low sun comes down on the ground at the shot's key and how wide, metres, and where the break stands in the
 * sky, degrees right of north. The approach and the strait are one move and keep BREAK. Inside a shot the light goes with the wind; at a cut
 * it stands where the next shot wants it, as a crew waits for the light: on the colony's rock (whose faces to the lens are its lee: there
 * the light the lit sea and flats throw back is raised, `bounce` times, as a crew would hold a white sheet), on the feeders and the water behind them, on the flats behind the one that hangs in the weed (pale against a cliff in shade), on the
 * bore's spray in the gate. `sky` is what the cloud's own brightness is given in the shot: the bore comes in under a heavier sky.
 * `deck` is how far the deck's gaps cut the light in the shot (1 where no row names it): the feeders stand in the break's open middle.
 * `warm` is how far the sky's light and the air go to the low sun's colour: the feeders' water is warm grey under a pale warm break.
 * `dome` is how much further the picture's white is shut on the dome itself, and not in what mirrors it: the bore comes in under a dark sky with one small break.
 * `shade` is what the sky's own light on things is given: the colony's rock keeps its folds dark under a sun that only tops its ledges.
 */
const BREAK_BY_SHOT: readonly { shot: string; key: string; x: number; z: number; radius: number; yaw: number; bounce?: number; shaft?: number; sky?: number; heads?: number; shade?: number; deck?: number; warm?: number; dome?: number }[] = [
  { shot: 'ribs-03', key: 'ribs-3', x: 196, z: -500, radius: 380, yaw: 16, bounce: 1.6, sky: 0.58, shade: 0.5, deck: 0.5, warm: -1 },
  { shot: 'ribs-04', key: 'ribs-2', x: -40, z: -500, radius: 380, yaw: 23, sky: 0.81, deck: 0.25, warm: 1 },
  { shot: 'ribs-05', key: 'ribs-1', x: -60, z: -420, radius: 220, yaw: 42, shaft: 2.4, deck: 0.1, warm: 0.5 },
  { shot: 'ribs-06', key: 'ribs-4', x: 120, z: -1440, radius: 260, yaw: 31, sky: 0.8, heads: 0.4, shade: 1.25, deck: 0.2, warm: 0.4, dome: 0.24 },
];
/** Where the break stands in the sky at the establishing key, degrees right of north: upper right of the strait's frame, left of the sun that burns through its edge. */
const BREAK_YAW = 42;
/**
 * The small break. As the film opens its shaft stands on the first blade (SHAFT_TARGET in opening.ts); from then on it stands on the one
 * that hangs in the weed, `radius` metres across the sun's way, or the `shaft` of the shot: close on it the wall round it stays in shade.
 */
export const BREAK2 = { radius: 5, gain: 0.9 };
/**
 * The approach: the storm stands over the strait as the film opens. The wide break is shut (`gain` is what its place in the cover is given)
 * and the sky's own light is cut by `dim`, both whole until `holds` seconds and back to the place's own by `ends`; the one light is the
 * small break's shaft (SHAFT_TARGET in opening.ts). `turn` is the radians the sky's picture is turned so that its burning break stands in
 * the right of the first frame, over the far row; `burn` is what it is given over its own brightness.
 */
export const STORM = { gain: -0.25, dim: 0.42, holds: 4.5, ends: 14, turn: -0.4, burn: 0.5 };
/** The dome's picture (`tDome`): the gain of the whole sky, the depth of air straight up that veils it (0.035 is three tenths of a veil at 6 degrees and two thirds at 2), what the break is given over the rest, how far the picture's white is shut away from the break, and the same under the storm of the approach. */
export const DOME = { gain: 1.0, veil: 0.035, lift: 1.2, shut: 0.62, storm: 0.85 };
/** The low sun on what stands high: from this height, whole by this one, how much thinner the cloud counts there (0.2 is a whole step of its edge); and the floor under every shade, as a share of the ground's light. */
export const HEADS = { from: 60, to: 260, thin: 0.3, floor: 0.9, storm: 1.0 };
/** The strait's held shot: what the sky's light and the lit flats' bounce are given there, so the near cliff and the stones keep the picture's blacks. */
const HELD = { shade: 0.8, bounce: 0.45 };
/** The sun of the approach: the low warm light of the first wave on the first blade, going to the place's ivory as the storm ends. */
const STORM_SUN = [7.6, 5.2, 3.0] as const;
/** What the lit flats and sea throw back up of the sun's light, by colour: wet sand and shingle, warm. */
const BOUNCE = [0.2, 0.185, 0.16] as const;
/** The colour a depth of air goes to: the horizon's pale slate. */
const HAZE = [0.172, 0.232, 0.312] as const;
const SKY_LIGHT = { zenith: [0.14, 0.18, 0.25], horizon: [0.33, 0.39, 0.48], ground: [0.085, 0.095, 0.11] } as const;
/** What the sun's colour of the anchors is given: the break's light is the one warm light of the place. */
const SUN_WARM = [1.04, 0.995, 0.9] as const;
/** How hard the lumps cut the edge between a cloud's body and its head on the dome: 0 leaves the picture's own soft edge. */
const DOME_CUT = 1.2;
/** What a shot's `warm` adds to the sky's light and the haze, by channel. */
const SKY_WARM = [0.09, 0.0, -0.11] as const;
/** What the sky and its air take of the sun's warmth at the break itself, falling off round it. */
const BREAK_WARM = [1.24, 1.0, 0.76] as const;


export type Height = (x: number, z: number) => number;

interface Grid {
  height: Float32Array;
  open: Float32Array;
  sunLow: Float32Array;
  sunHigh: Float32Array;
}

const cellX = (LAND.maxX - LAND.minX) / LAND.width;
const cellZ = (LAND.maxZ - LAND.minZ) / LAND.height;

function sample(data: Float32Array, w: number, h: number, x: number, z: number): number {
  const fx = Math.min(w - 1.001, Math.max(0, ((x - LAND.minX) / (LAND.maxX - LAND.minX)) * w - 0.5));
  const fz = Math.min(h - 1.001, Math.max(0, ((z - LAND.minZ) / (LAND.maxZ - LAND.minZ)) * h - 0.5));
  const i = Math.floor(fx);
  const j = Math.floor(fz);
  const u = fx - i;
  const v = fz - j;
  const a = j * w + i;
  const b = a + w;
  return ((data[a] as number) * (1 - u) + (data[a + 1] as number) * u) * (1 - v) + ((data[b] as number) * (1 - u) + (data[b + 1] as number) * u) * v;
}

/** Each blade as a chain of balls along its spine: what the sun's shadow and the open sky are marched against. */
interface Chain {
  cx: number;
  cy: number;
  cz: number;
  reach: number;
  balls: Float32Array;
}

function chains(): Chain[] {
  return RIBS.map((rib) => {
    const spine = bladeSpine(rib, 36);
    const balls = new Float32Array(spine.length * 4);
    let cx = 0;
    let cy = 0;
    let cz = 0;
    spine.forEach((s, i) => {
      balls.set([s.x, s.y, s.z, s.radius], i * 4);
      cx += s.x / spine.length;
      cy += s.y / spine.length;
      cz += s.z / spine.length;
    });
    let reach = 0;
    for (const s of spine) reach = Math.max(reach, Math.hypot(s.x - cx, s.y - cy, s.z - cz) + s.radius);
    return { cx, cy, cz, reach: reach * 1.2, balls };
  });
}

/** How much of a ray from (x, y, z) along (dx, dy, dz) passes the blades: 1 clear, 0 through one. `soft` widens the edge with the distance. */
function pastBlades(all: Chain[], x: number, y: number, z: number, dx: number, dy: number, dz: number, soft: number): number {
  let lit = 1;
  for (const c of all) {
    const ox = c.cx - x;
    const oy = c.cy - y;
    const oz = c.cz - z;
    const t = ox * dx + oy * dy + oz * dz;
    const d2 = ox * ox + oy * oy + oz * oz - t * t;
    if (t < -c.reach || d2 > c.reach * c.reach) continue;
    const b = c.balls;
    for (let i = 0; i < b.length; i += 4) {
      const px = (b[i] as number) - x;
      const py = (b[i + 1] as number) - y;
      const pz = (b[i + 2] as number) - z;
      const along = px * dx + py * dy + pz * dz;
      if (along <= 0) continue;
      const far = Math.sqrt(Math.max(0, px * px + py * py + pz * pz - along * along));
      const r = b[i + 3] as number;
      const edge = 2 + soft * along;
      const k = Math.min(1, Math.max(0, (far - r * 0.9 + edge) / (2 * edge)));
      if (k < lit) lit = k;
      if (lit <= 0) return 0;
    }
  }
  return lit;
}

function bakeGrid(height: Height): Grid {
  const w = LAND.width;
  const h = LAND.height;
  const heights = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) heights[j * w + i] = height(LAND.minX + (i + 0.5) * cellX, LAND.minZ + (j + 0.5) * cellZ);
  const at = (x: number, z: number): number => sample(heights, w, h, x, z);
  const all = chains();
  const [sx, sy, sz] = SUN.toward;
  const sl = Math.hypot(sx, sy, sz);
  const dx = sx / sl;
  const dy = sy / sl;
  const dz = sz / sl;
  // Half the cells each way for the marched quantities: a blade's shadow has an edge of ten metres and more at these distances.
  const lw = w / 2;
  const lh = h / 2;
  const openLow = new Float32Array(lw * lh);
  const sunLow = new Float32Array(lw * lh);
  const sunHigh = new Float32Array(lw * lh);
  const REACH = [8, 20, 45, 90, 170, 300, 500];
  const UP = [0.35, 0.8, 1.6];
  for (let j = 0; j < lh; j++) {
    for (let i = 0; i < lw; i++) {
      const x = LAND.minX + (i + 0.5) * cellX * 2;
      const z = LAND.minZ + (j + 0.5) * cellZ * 2;
      const y = Math.max(0, at(x, z));
      // The open sky: the land's own horizon in eight directions, and three rings of rays against the blades.
      let sum = 0;
      for (let k = 0; k < 8; k++) {
        const a = ((k + 0.5) / 8) * Math.PI * 2;
        const ax = Math.cos(a);
        const az = Math.sin(a);
        let slope = 0;
        for (const r of REACH) {
          const rise = (at(x + ax * r, z + az * r) - y) / r;
          if (rise > slope) slope = rise;
        }
        let ring = 0;
        for (const up of UP) {
          const l = Math.hypot(1, up);
          ring += pastBlades(all, x, y + 1, z, ax / l, up / l, az / l, 0.08) / UP.length;
        }
        sum += (1 - slope / Math.hypot(1, slope)) * (0.35 + 0.65 * ring);
      }
      openLow[j * lw + i] = sum / 8;
      // The sun: past the blades, and over the land (the mound, the cliffs) for 400 m.
      const shade = (from: number): number => {
        let lit = pastBlades(all, x, from, z, dx, dy, dz, 0.035);
        for (let s = 1; s <= 12 && lit > 0; s++) {
          const t = 6 * s + 2.2 * s * s;
          const over = at(x + dx * t, z + dz * t) - (from + dy * t);
          if (over > 0) lit = Math.min(lit, Math.max(0, 1 - over / (1 + 0.05 * t)));
        }
        return lit;
      };
      sunLow[j * lw + i] = shade(y + 0.5);
      sunHigh[j * lw + i] = shade(y + 60);
    }
  }
  const lift = (low: Float32Array): Float32Array => {
    const out = new Float32Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out[j * w + i] = sample(low, lw, lh, LAND.minX + (i + 0.5) * cellX, LAND.minZ + (j + 0.5) * cellZ);
    return out;
  };
  return { height: heights, open: lift(openLow), sunLow: lift(sunLow), sunHigh: lift(sunHigh) };
}

function gridTexture(grid: Grid): THREE.DataTexture {
  const n = LAND.width * LAND.height;
  const data = new Uint16Array(n * 4);
  for (let i = 0; i < n; i++) {
    data[i * 4] = THREE.DataUtils.toHalfFloat(grid.height[i] as number);
    data[i * 4 + 1] = THREE.DataUtils.toHalfFloat(grid.open[i] as number);
    data[i * 4 + 2] = THREE.DataUtils.toHalfFloat(grid.sunLow[i] as number);
    data[i * 4 + 3] = THREE.DataUtils.toHalfFloat(grid.sunHigh[i] as number);
  }
  const t = new THREE.DataTexture(data, LAND.width, LAND.height, THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/** The cloud mask: noise that repeats, so the sheet can drift for ever. r is the cover (0 to 1, about 0.5 at the edge of a cloud), g a finer field for the cloud's own lumps, b the deck's gaps (DECK): it lies in the same texel as the cover, so the sun through the deck costs a surface one read. */
function cloudMask(): { texture: THREE.DataTexture; cover: (u: number, v: number) => number; gaps: (u: number, v: number) => number } {
  const n = CLOUD.size;
  const rng = stream('ribs/rig/cloud');
  const layer = (cells: number): Float32Array => {
    const lattice = new Float32Array(cells * cells);
    for (let i = 0; i < lattice.length; i++) lattice[i] = rng.next();
    const out = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const fx = (i / n) * cells;
        const fy = (j / n) * cells;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const u = fx - x0;
        const v = fy - y0;
        const su = u * u * (3 - 2 * u);
        const sv = v * v * (3 - 2 * v);
        const g = (x: number, y: number): number => lattice[(y % cells) * cells + (x % cells)] as number;
        out[j * n + i] = (g(x0, y0) * (1 - su) + g(x0 + 1, y0) * su) * (1 - sv) + (g(x0, y0 + 1) * (1 - su) + g(x0 + 1, y0 + 1) * su) * sv;
      }
    }
    return out;
  };
  const fbm = (cells: number[], gains: number[]): Float32Array => {
    const out = new Float32Array(n * n);
    let total = 0;
    cells.forEach((c, k) => {
      const l = layer(c);
      const gain = gains[k] as number;
      total += gain;
      for (let i = 0; i < out.length; i++) out[i] = (out[i] as number) + (l[i] as number) * gain;
    });
    for (let i = 0; i < out.length; i++) out[i] = (out[i] as number) / total;
    return out;
  };
  const cover = fbm([3, 6, 12, 24, 48], [1, 0.6, 0.34, 0.2, 0.12]);
  const lumps = fbm([10, 20, 40, 80], [1, 0.6, 0.36, 0.2]);
  const gaps = fbm([7, 14, 28, 56, 112], [1, 0.66, 0.46, 0.32, 0.22]);
  const data = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) {
    data[i * 4] = Math.round(255 * Math.min(1, Math.max(0, ((cover[i] as number) - 0.5) * 2.2 + 0.5)));
    data[i * 4 + 1] = Math.round(255 * Math.min(1, Math.max(0, ((lumps[i] as number) - 0.5) * 2.2 + 0.5)));
    // The gaps stand where the strait's key wants them: the field is laid DECK.at texels off its own corner.
    const moved = (((Math.floor(i / n) + DECK.at[1]) % n) * n + (((i % n) + DECK.at[0]) % n)) as number;
    data[i * 4 + 2] = Math.round(255 * Math.min(1, Math.max(0, ((gaps[moved] as number) - 0.5) * 2.6 + 0.5)));
    data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  const read = (channel: number) => (u: number, v: number): number => {
    const i = ((Math.floor(u * n) % n) + n) % n;
    const j = ((Math.floor(v * n) % n) + n) % n;
    return (data[(j * n + i) * 4 + channel] as number) / 255;
  };
  return { texture: t, cover: read(0), gaps: read(2) };
}

/** One tiling picture of smooth relief, 0 to 1, and the same picture read on the processor exactly as the graphics card reads it. */
function fineTile(): { texture: THREE.DataTexture; read: (u: number, v: number) => number } {
  const n = FINE.size;
  const rng = stream('ribs/rig/fine');
  const sum = new Float32Array(n * n);
  let total = 0;
  [4, 8, 16, 32, 64].forEach((cells, k) => {
    const gain = Math.pow(0.55, k);
    total += gain;
    const lattice = new Float32Array(cells * cells);
    for (let i = 0; i < lattice.length; i++) lattice[i] = rng.next();
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const fx = (i / n) * cells;
        const fy = (j / n) * cells;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const u = fx - x0;
        const v = fy - y0;
        const su = u * u * (3 - 2 * u);
        const sv = v * v * (3 - 2 * v);
        const g = (x: number, y: number): number => lattice[(y % cells) * cells + (x % cells)] as number;
        sum[j * n + i] = (sum[j * n + i] as number) + gain * ((g(x0, y0) * (1 - su) + g(x0 + 1, y0) * su) * (1 - sv) + (g(x0, y0 + 1) * (1 - su) + g(x0 + 1, y0 + 1) * su) * sv);
      }
    }
  });
  const data = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) {
    const v = Math.round(255 * Math.min(1, Math.max(0, (((sum[i] as number) / total) - 0.5) * 2.4 + 0.5)));
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  const at = (i: number, j: number): number => data[((((j % n) + n) % n) * n + (((i % n) + n) % n)) * 4] as number;
  const read = (u: number, v: number): number => {
    const fx = u * n - 0.5;
    const fy = v * n - 0.5;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const a = fx - i;
    const b = fy - j;
    return ((at(i, j) * (1 - a) + at(i + 1, j) * a) * (1 - b) + (at(i, j + 1) * (1 - a) + at(i + 1, j + 1) * a) * b) / 255;
  };
  return { texture: t, read };
}

const rect = (spec: { minX: number; maxX: number; minZ: number; maxZ: number }): THREE.Vector4 => new THREE.Vector4(spec.minX, spec.minZ, 1 / (spec.maxX - spec.minX), 1 / (spec.maxZ - spec.minZ));

const CONTACT_VERTEX = /* glsl */ `
varying vec2 vUv;
varying float vStrength;
void main() {
  vUv = uv;
  vec4 p = vec4(position, 1.0);
  vStrength = 1.0;
  #ifdef USE_INSTANCING
  p = instanceMatrix * p;
  #endif
  #ifdef USE_INSTANCING_COLOR
  vStrength = instanceColor.r;
  #endif
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * p;
}`;

const CONTACT_FRAGMENT = /* glsl */ `
varying vec2 vUv;
varying float vStrength;
void main() {
  float r = length(vUv * 2.0 - 1.0);
  float a = vStrength * (1.0 - smoothstep(0.4, 1.0, r));
  gl_FragColor = vec4(a, a, a, a);
}`;

/** Kept from the Heart's contract. The Ribs have no round lights: the list is read by nothing. */
export interface Emitter {
  position: THREE.Vector3;
  radius: number;
  radiance: THREE.Vector3;
}

export interface Rig {
  /** Spread into the uniforms of every material that includes RIG_GLSL: `uniforms: { ...rig.uniforms, mine: { value } }`. */
  readonly uniforms: Record<string, THREE.IUniform>;
  /** Soft shapes that hide the sky from the ground under whatever stands on it. Use `contactDiscs`. */
  readonly contactScene: THREE.Scene;
  readonly emitters: Emitter[];
  /** The land as the rig knows it. Before the land folder calls `setLand` it is the rough ground of the layout. */
  readonly land: {
    /** The bed: sand and rock, metres, with its fine relief. Below 0 it is under the sea; the pools and runnels stand at LEVELS.pool. */
    height(x: number, z: number): number;
    /** The fine relief alone, metres, within plus and minus 0.14: in a shader it is bedFine(xz), and the bed is landAt(xz).r + bedFine(xz). */
    fine(x: number, z: number): number;
    /** 0 to 1, how much of the sky the ground there sees. */
    open(x: number, z: number): number;
    /** 0 to 1, how much of the sun reaches the ground there past the blades and the land (not the cloud). */
    sun(x: number, z: number): number;
  };
  /** 0 to 1, how much of the sun the drifting cloud lets through at a point of the ground at `seconds`. */
  cloudShade(x: number, z: number, seconds: number): number;
  /** Called by the land folder, once, at creation: the true height of the bed everywhere. */
  setLand(height: Height): void;
  /** `count` soft round shades for the contact map. Place each with `setDisc`. */
  contactDiscs(count: number): THREE.InstancedMesh;
  /** Centre on the ground, radius in metres, strength 0 to 1. */
  setDisc(mesh: THREE.InstancedMesh, index: number, x: number, z: number, radius: number, strength: number, stretch?: number, yaw?: number): void;
  /** For the root. */
  bake(): void;
  setTime(seconds: number): void;
  beforeSample(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void;
  dispose(): void;
}

export function createRig(): Rig {
  const contactTarget = new THREE.WebGLRenderTarget(CONTACT.size, CONTACT.size, {
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: false,
    depthBuffer: false,
    stencilBuffer: false,
    colorSpace: THREE.NoColorSpace,
  });
  const contactCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
  contactCamera.up.set(0, 0, -1);

  const mask = cloudMask();
  const tile = fineTile();
  const fine = (x: number, z: number): number => FINE.wideAmp * (tile.read(x / FINE.wide, z / FINE.wide) - 0.5) + FINE.smallAmp * (tile.read(z / FINE.small, x / FINE.small) - 0.5);
  const breakAt = new THREE.Vector4(BREAK.x, BREAK.z, 1 / (BREAK.radius * BREAK.radius), BREAK.gain);
  const break2At = new THREE.Vector4(0, 0, 1 / (BREAK2.radius * BREAK2.radius), BREAK2.gain);
  const sun = new THREE.Vector3(...SUN.toward).normalize();
  const cloudShade = new THREE.Vector4(0, 0, 1 / CLOUD.repeat, CLOUD.shade);
  const deck = new THREE.Vector4(DECK.shut, DECK.open, DECK.whole, DECK.under);
  const deckEdge = new THREE.Vector3(DECK.from, DECK.to, DECK.dome);
  const skyBreak = new THREE.Vector3();
  const skyTurn = new THREE.Vector4(0, 0, 0, 0);
  const dome = new THREE.Vector4(DOME.gain, DOME.veil, DOME.lift, DOME.shut);
  const straitSpan = shotSpan('ribs-02');
  const staging = BREAK_BY_SHOT.map((b) => ({ ...b, span: shotSpan(b.shot), at: keySeconds(b.key) }));
  /** The break's staging for the shot the camera stands in: its own, or the strait's. */
  const stagedBreak = (): { x: number; z: number; radius: number; yaw: number; at: number; bounce?: number; shaft?: number; sky?: number; heads?: number; shade?: number; deck?: number; warm?: number; dome?: number } => {
    const staged = stagedSeconds();
    const own = loopPhase() === null ? staging.find((b) => staged >= b.span.from && staged < b.span.to) : undefined;
    return own ?? { x: BREAK.x, z: BREAK.z, radius: BREAK.radius, yaw: BREAK_YAW, at: T0, bounce: BREAK.bounce };
  };
  const breakToward = (seconds: number, drifted = seconds): void => {
    // The break drifts with the cloud: six tenths of a degree a second, to the right. In the picture it lies 0.715 radians right of the middle.
    const own = stagedBreak();
    const yaw = ((own.yaw + 0.6 * (drifted - own.at)) * Math.PI) / 180;
    skyTurn.x = yaw - 0.715;
    // The lumps of the cloud work as it goes: fast enough that six seconds of a held lens show it.
    skyTurn.y = 0.021 * seconds;
    skyTurn.z = 0.027 * seconds;
    const phase = loopPhase();
    if (phase !== null) {
      // In the card loop the picture of the sky drifts on as in the film, and the loop's cross-fade brings it round: cloud is soft and
      // fades without a double edge. Its lumps work round a closed path: they leave as in the film and come back.
      const a = phase * Math.PI * 2;
      const r = config.deliver.cardLoop.seconds / (Math.PI * 2);
      skyTurn.y = 0.021 * T0 + r * (0.021 * Math.sin(a) - 0.027 * (1 - Math.cos(a)));
      skyTurn.z = 0.027 * T0 + r * (0.027 * Math.sin(a) + 0.021 * (1 - Math.cos(a)));
    }
    const pitch = (21 * Math.PI) / 180;
    skyBreak.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  };
  breakToward(T0);

  /** How far the storm of the approach stands at `world` seconds: 1 as the film opens, 0 from STORM.ends on and outside the approach. */
  const storm = (world: number): number => {
    if (openingWeight(world) === 0) return 0;
    const k = Math.min(1, Math.max(0, (STORM.ends - world) / (STORM.ends - STORM.holds)));
    return k * k * (3 - 2 * k);
  };
  // The small break at `world` seconds: x, z and radius of its light on the ground. In the approach it stands on the first blade's seaward
  // face and the water before it; then it goes to the one that hangs in the weed and stays, as a gap in a sheet stays in a blade's lee.
  const hung = DROWNED.at();
  const hungOn = [hung[0] - (SUN.toward[0] * hung[1]) / SUN.toward[1], hung[2] - (SUN.toward[2] * hung[1]) / SUN.toward[1]];
  const break2 = (world: number): [number, number, number] => {
    const radius = stagedBreak().shaft ?? BREAK2.radius;
    if (openingWeight(world) === 0) return [hungOn[0], hungOn[1], radius];
    const stay = 1 - Math.min(1, Math.max(0, (world - SHAFT_TARGET.stays) / (OPENING_END - 1 - SHAFT_TARGET.stays)));
    const held = stay * stay * (3 - 2 * stay);
    return [hungOn[0] + (SHAFT_TARGET.x - hungOn[0]) * held, hungOn[1] + (SHAFT_TARGET.z - hungOn[1]) * held, radius + (SHAFT_TARGET.radius - radius) * held];
  };

  /** The wide break at `sky` seconds of the cloud, for the shot the camera stands in: x, z and radius of its light on the ground. */
  const wideBreak = (sky: number): [number, number, number] => {
    const from = stagedBreak();
    return [from.x + WIND.to[0] * WIND.cloud * (sky - from.at), from.z + WIND.to[1] * WIND.cloud * (sky - from.at), from.radius];
  };

  const loopAt = new THREE.Vector2(T0, 0);
  const scud = new THREE.Vector3(0, 0, 0);
  const skyZenith = new THREE.Vector3(...SKY_LIGHT.zenith);
  const skyHorizon = new THREE.Vector3(...SKY_LIGHT.horizon);
  const skyGround = new THREE.Vector3(...SKY_LIGHT.ground);
  const haze = new THREE.Vector3(...HAZE);
  const bounce = new THREE.Vector3(...BOUNCE);
  const heads = new THREE.Vector4(HEADS.from, HEADS.to, HEADS.thin, HEADS.floor);
  const sunWarm = new THREE.Vector3(...SUN_WARM);
  const skyWarm = new THREE.Vector3(1, 1, 1);
  const sunColour = new THREE.Vector3(...SUN.colour).multiply(sunWarm);
  const stormSun = new THREE.Vector3(...STORM_SUN);
  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    // Read by the card loop's shaders alone: the seconds of its first frame, and its phase.
    uLoop: { value: loopAt },
    // The scud's seconds: its own, a second sheet's in the card loop, and that sheet's share (glsl.ts, skyDome).
    uScud: { value: scud },
    uBreakWarm: { value: new THREE.Vector3(...BREAK_WARM) },
    // How hard the lumps cut the dome picture's soft edges anew (glsl.ts, skyDome).
    uDomeCut: { value: DOME_CUT },
    uSolo: { value: 0 },
    tLand: { value: null },
    uLandRect: { value: rect(LAND) },
    tContact: { value: contactTarget.texture },
    uContactRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    tBedFine: { value: tile.texture },
    tCloudShade: { value: mask.texture },
    uCloudBreak: { value: breakAt },
    uCloudBreak2: { value: break2At },
    uCloudShade: { value: cloudShade },
    // The deck's gaps: what the break is given where they are shut, what over that where one is open, how far they cut the break; and the edge of a gap.
    uDeck: { value: deck },
    uDeckEdge: { value: deckEdge },
    // The sky after the storm, scene linear: slate overhead, pale and a little warm at the horizon where the cloud is thin.
    uSkyZenith: { value: skyZenith },
    uSkyHorizon: { value: skyHorizon },
    // What wet sand and sea throw back up at the underside of things.
    uSkyGround: { value: skyGround },
    uSunDir: { value: sun },
    uSunColour: { value: sunColour },
    uHeads: { value: heads },
    // The colour the air takes at the horizon: the volume pass and the dome meet in it.
    uHaze: { value: haze },
    uBounce: { value: bounce },
    // The way to the bright break in the storm sky, as the cameras of the strait see it: up and to the right of the way in.
    uSkyBreak: { value: skyBreak },
    // The picture of the storm sky (the air folder loads it); how far it has turned round the dome (radians), how far its lumps have worked, its gain.
    uSkyTurn: { value: skyTurn },
    // The picture on the dome (the air folder loads it) and what it is given: DOME.
    tDome: { value: null },
    uDome: { value: dome },
  };

  let landHeight: Height = layoutLand;
  let grid: Grid | null = null;
  let texture: THREE.DataTexture | null = null;

  const bake = (): void => {
    grid = bakeGrid(landHeight);
    texture?.dispose();
    texture = gridTexture(grid);
    (uniforms.tLand as THREE.IUniform).value = texture;
  };
  const read = (pick: (g: Grid) => Float32Array, x: number, z: number): number => {
    if (!grid) bake();
    return sample(pick(grid as Grid), LAND.width, LAND.height, x, z);
  };

  const contactScene = new THREE.Scene();
  const discGeometry = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  const discMaterial = new THREE.ShaderMaterial({
    vertexShader: CONTACT_VERTEX,
    fragmentShader: CONTACT_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.MaxEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const centre = new THREE.Vector3();
  const forward = new THREE.Vector3();
  // The card loop is eight seconds of one light on the ground: a shadow that went on over the flats would have to come back.
  const skySeconds = (seconds: number): number => (loopPhase() === null ? seconds : T0);
  const drift = (seconds: number): [number, number] => [(WIND.to[0] * WIND.cloud * seconds) / CLOUD.repeat, (WIND.to[1] * WIND.cloud * seconds) / CLOUD.repeat];

  return {
    uniforms,
    contactScene,
    emitters: [],
    land: {
      height: (x, z) => landHeight(x, z) + fine(x, z),
      fine,
      open: (x, z) => read((g) => g.open, x, z),
      sun: (x, z) => read((g) => g.sunLow, x, z),
    },
    cloudShade: (x, z, world) => {
      const seconds = skySeconds(world);
      const d = drift(seconds);
      const wide = wideBreak(seconds);
      const bx = x - wide[0];
      const bz = z - wide[1];
      const along = bx * sun.x + bz * sun.z;
      const wr = (wide[2] * wide[2] * (bx * bx + bz * bz)) / Math.max(1e-6, bx * bx + bz * bz - (0.84 * along * along) / (1 - sun.y * sun.y));
      const b = break2(world);
      const ex = x - b[0];
      const ez = z - b[1];
      const along2 = ex * sun.x + ez * sun.z;
      const dark = storm(world);
      const g = Math.min(1, Math.max(0, (mask.gaps(x / CLOUD.repeat - d[0], z / CLOUD.repeat - d[1]) - DECK.from) / (DECK.to - DECK.from)));
      const gate = 1 + DECK.whole * (stagedBreak().deck ?? 1) * (DECK.shut + DECK.open * g * g * (3 - 2 * g) - 1);
      const wideGain = BREAK.gain + (STORM.gain - BREAK.gain) * dark;
      const c =
        mask.cover(x / CLOUD.repeat - d[0], z / CLOUD.repeat - d[1]) * BREAK.cover +
        (wideGain > 0 ? wideGain * gate : wideGain) * Math.exp(-(bx * bx + bz * bz) / wr) +
        BREAK2.gain * Math.exp(-(ex * ex + ez * ez - (0.94 * along2 * along2) / (1 - sun.y * sun.y)) / (b[2] * b[2]));
      const k = Math.min(1, Math.max(0, (c - 0.42) / 0.2));
      return CLOUD.shade + (1 - CLOUD.shade) * k * k * (3 - 2 * k);
    },
    setLand: (height) => {
      landHeight = height;
      grid = null;
    },
    contactDiscs: (count) => {
      const mesh = new THREE.InstancedMesh(discGeometry, discMaterial, count);
      mesh.frustumCulled = false;
      for (let i = 0; i < count; i++) {
        dummy.position.set(0, -1000, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, tint.setRGB(0, 0, 0));
      }
      contactScene.add(mesh);
      return mesh;
    },
    setDisc: (mesh, index, x, z, radius, strength, stretch = 1, yaw = 0) => {
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(radius * stretch, 1, radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, tint.setRGB(strength, strength, strength));
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    bake,
    setTime: (seconds) => {
      (uniforms.uTime as THREE.IUniform<number>).value = seconds;
      loopAt.y = loopPhase() ?? 0;
      // In the film the scud goes with the world. In the card loop it goes LOOP_SCUD times as fast, as two sheets a loop apart.
      const round = loopPhase();
      if (round === null) scud.set(seconds, 0, 0);
      else scud.set(T0 + LOOP_SCUD * config.deliver.cardLoop.seconds * round, T0 + LOOP_SCUD * config.deliver.cardLoop.seconds * (round - 1), round);
      const sky = skySeconds(seconds);
      const d = drift(sky);
      cloudShade.x = d[0];
      cloudShade.y = d[1];
      breakToward(sky, seconds);
      const wide = wideBreak(sky);
      breakAt.x = wide[0];
      breakAt.y = wide[1];
      const b = break2(seconds);
      break2At.set(b[0], b[1], 1 / (b[2] * b[2]), BREAK2.gain);
      const weight = openingWeight(seconds);
      cloudShade.w = CLOUD.shade;
      breakAt.z = 1 / (wide[2] * wide[2]);
      breakAt.w = BREAK.gain;
      skyZenith.set(...SKY_LIGHT.zenith);
      skyHorizon.set(...SKY_LIGHT.horizon);
      skyGround.set(...SKY_LIGHT.ground);
      haze.set(...HAZE);
      const held = loopPhase() === null && stagedSeconds() >= straitSpan.from && stagedSeconds() < straitSpan.to;
      const shade = held ? HELD.shade : (stagedBreak().shade ?? 1);
      skyZenith.multiplyScalar(shade);
      skyHorizon.multiplyScalar(shade);
      skyGround.multiplyScalar(shade);
      bounce.set(...BOUNCE).multiplyScalar((stagedBreak().bounce ?? 1) * (held ? HELD.bounce : 1));
      dome.set(DOME.gain * (stagedBreak().sky ?? 1), DOME.veil, DOME.lift, DOME.shut);
      heads.z = HEADS.thin * (stagedBreak().heads ?? 1);
      deck.z = DECK.whole * (stagedBreak().deck ?? 1);
      const share = stagedBreak().deck;
      deck.w = share === undefined ? DECK.under : 1 - (1 - DECK.staged) * share;
      deckEdge.z = DECK.dome * (stagedBreak().deck ?? 1) + (stagedBreak().dome ?? 0);
      const warm = stagedBreak().warm ?? 0;
      if (warm !== 0) {
        skyWarm.set(1 + SKY_WARM[0] * warm, 1 + SKY_WARM[1] * warm, 1 + SKY_WARM[2] * warm);
        skyZenith.multiply(skyWarm);
        skyHorizon.multiply(skyWarm);
        skyGround.multiply(skyWarm);
        haze.multiply(skyWarm);
      }
      sunColour.set(...SUN.colour).multiply(sunWarm);
      if (weight !== 0) {
        // The burning break stands in the right of the frame as the film opens, and drifts to its own place.
        const turn = STORM.turn * weight;
        skyTurn.x += turn;
        const c = Math.cos(turn);
        const n = Math.sin(turn);
        skyBreak.set(skyBreak.x * c - skyBreak.z * n, skyBreak.y, skyBreak.z * c + skyBreak.x * n);
        // The storm: the wide break is shut and the sky's own light is low; the shaft is the one light, and the place's own comes back as the lens comes in.
        const dark = storm(seconds);
        breakAt.w = BREAK.gain + (STORM.gain - BREAK.gain) * dark;
        const dim = 1 - STORM.dim * dark;
        // The haze is dimmed below: the dome's picture goes down with it, its white shut all but at the break, which burns.
        dome.z = DOME.lift * (1 + STORM.burn * openingLight(seconds));
        dome.w = DOME.shut + (DOME.storm - DOME.shut) * dark;
        dome.x = DOME.gain * (1 - 0.5 * STORM.dim * dark);
        heads.z = HEADS.thin * (1 + HEADS.storm * dark);
        sunColour.set(...SUN.colour).multiply(sunWarm).lerp(stormSun, dark);
        skyZenith.multiplyScalar(dim);
        skyHorizon.multiplyScalar(dim);
        skyGround.multiplyScalar(dim);
        haze.multiplyScalar(dim);
      }
    },
    beforeSample: (renderer, camera) => {
      if (!grid) bake();
      camera.getWorldDirection(forward);
      // The contact map follows the view: centred where the middle of the frame meets the ground, and sized to that distance.
      const height = Math.max(1, camera.position.y - Math.max(0, landHeight(camera.position.x, camera.position.z)));
      const half = Math.atan(1 / (camera.projectionMatrix.elements[5] as number));
      const pitch = Math.max(Math.asin(Math.min(1, Math.max(-1, -forward.y))) + half / 3, 0.026);
      const reach = Math.min(900, height / Math.tan(pitch));
      const radius = Math.min(CONTACT.maxRadius, Math.max(CONTACT.minRadius, reach * 0.6));
      const ahead = Math.max(reach * 0.75, radius * 0.72);
      const flat = Math.hypot(forward.x, forward.z) || 1;
      const texel = (radius * 2) / CONTACT.size;
      centre.set(camera.position.x + (forward.x / flat) * ahead, 0, camera.position.z + (forward.z / flat) * ahead);
      centre.x = Math.round(centre.x / texel) * texel;
      centre.z = Math.round(centre.z / texel) * texel;
      contactCamera.left = -radius;
      contactCamera.right = radius;
      contactCamera.top = radius;
      contactCamera.bottom = -radius;
      contactCamera.position.set(centre.x, 1000, centre.z);
      contactCamera.lookAt(centre.x, 0, centre.z);
      contactCamera.updateProjectionMatrix();
      contactCamera.updateMatrixWorld(true);
      (uniforms.uContactRect as THREE.IUniform<THREE.Vector4>).value.set(centre.x - radius, centre.z + radius, 1 / (radius * 2), -1 / (radius * 2));
      renderer.setRenderTarget(contactTarget);
      renderer.clear(true, false, false);
      renderer.render(contactScene, contactCamera);
      renderer.setRenderTarget(null);
    },
    dispose: () => {
      contactTarget.dispose();
      texture?.dispose();
      mask.texture.dispose();
      tile.texture.dispose();
      discGeometry.dispose();
      discMaterial.dispose();
    },
  };
}
