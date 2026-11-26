// The light rig of the Ribs: the uniforms every surface shares, the baked land (height, open sky, the sun's shadow), the drifting mask of
// cloud shadow and the map of contact shade. Owned by the root. Folders read it and never change it, except through the calls below.
import * as THREE from 'three';
import { config } from '../../../config';
import { stream } from '../../../core/rng';
import { RIBS, bladeSpine, landAt as layoutLand } from '../layout';
import { SUN, T0, WIND } from './anchors';
import { loopPhase } from './stage';

// The land map covers the strait and the sea a camera can see the bed through: cells of 4.9 by 4.8 m.
export const LAND = { minX: -1200, maxX: 1300, minZ: -3500, maxZ: 1100, width: 512, height: 960 };
export const CONTACT = { size: 1024, minRadius: 30, maxRadius: 220 };
/** The cloud sheet: its height, metres of one repeat of the mask, and how much of the sun is left under a cloud. */
export const CLOUD = { height: 1500, repeat: 5200, shade: 0.12, size: 256 };
export const MAX_EMITTERS = 8;
/** The fine relief of the floor, laid over the bed twice from one tiling picture: metres of a repeat and metres of relief, wide and small. */
export const FINE = { size: 256, wide: 37, wideAmp: 0.2, small: 9.7, smallAmp: 0.07 };
/** The one wide break in the cloud that lets the sun down on the strait: where its light falls on the ground at the establishing key, and its radius, metres. */
export const BREAK = { x: 200, z: -500, radius: 420, gain: 0.8, cover: 0.62 };
/** The small break of the opening: where its light falls on the sea at the first frame of the place (it travels with the wind like the wide one), and its radius. */
export const BREAK2 = { x: -200, z: 530, radius: 170, gain: 0.9 };

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

/** The cloud mask: noise that repeats, so the sheet can drift for ever. r is the cover (0 to 1, about 0.5 at the edge of a cloud), g a finer field for the cloud's own lumps. */
function cloudMask(): { texture: THREE.DataTexture; cover: (u: number, v: number) => number } {
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
  const data = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) {
    data[i * 4] = Math.round(255 * Math.min(1, Math.max(0, ((cover[i] as number) - 0.5) * 2.2 + 0.5)));
    data[i * 4 + 1] = Math.round(255 * Math.min(1, Math.max(0, ((lumps[i] as number) - 0.5) * 2.2 + 0.5)));
    data[i * 4 + 2] = 0;
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
  const read = (u: number, v: number): number => {
    const i = ((Math.floor(u * n) % n) + n) % n;
    const j = ((Math.floor(v * n) % n) + n) % n;
    return (data[(j * n + i) * 4] as number) / 255;
  };
  return { texture: t, cover: read };
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
  const break2At = new THREE.Vector4(BREAK2.x, BREAK2.z, 1 / (BREAK2.radius * BREAK2.radius), BREAK2.gain);
  const sun = new THREE.Vector3(...SUN.toward).normalize();
  const cloudShade = new THREE.Vector4(0, 0, 1 / CLOUD.repeat, CLOUD.shade);
  const skyBreak = new THREE.Vector3();
  const skyTurn = new THREE.Vector4(0, 0, 0, 1.1);
  const breakToward = (seconds: number): void => {
    // The break drifts with the cloud: six tenths of a degree a second, to the right. In the picture it lies 0.786 radians right of the middle; it is laid a little left of the sun so that it shows between the blades.
    const yaw = ((36 + 0.6 * (seconds - T0)) * Math.PI) / 180;
    skyTurn.x = yaw - 0.93;
    // The lumps of the cloud work as it goes: fast enough that six seconds of a held lens show it.
    skyTurn.y = 0.021 * seconds;
    skyTurn.z = 0.027 * seconds;
    const phase = loopPhase();
    if (phase !== null) {
      // In the card loop the sheet of cloud stands and its lumps work round a closed path: they leave as in the film and come back.
      const a = phase * Math.PI * 2;
      const r = config.deliver.cardLoop.seconds / (Math.PI * 2);
      skyTurn.y = 0.021 * T0 + r * (0.021 * Math.sin(a) - 0.027 * (1 - Math.cos(a)));
      skyTurn.z = 0.027 * T0 + r * (0.027 * Math.sin(a) + 0.021 * (1 - Math.cos(a)));
    }
    const pitch = (21 * Math.PI) / 180;
    skyBreak.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  };
  breakToward(T0);

  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
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
    // The sky after the storm, scene linear: slate overhead, pale and a little warm at the horizon where the cloud is thin.
    uSkyZenith: { value: new THREE.Vector3(0.115, 0.14, 0.185) },
    uSkyHorizon: { value: new THREE.Vector3(0.33, 0.38, 0.45) },
    // What wet sand and sea throw back up at the underside of things.
    uSkyGround: { value: new THREE.Vector3(0.08, 0.088, 0.097) },
    uSunDir: { value: sun },
    uSunColour: { value: new THREE.Vector3(...SUN.colour) },
    // The colour the air takes at the horizon: the volume pass and the dome meet in it.
    uHaze: { value: new THREE.Vector3(0.29, 0.345, 0.42) },
    // The way to the bright break in the storm sky, as the cameras of the strait see it: up and to the right of the way in.
    uSkyBreak: { value: skyBreak },
    // The picture of the storm sky (the air folder loads it); how far it has turned round the dome (radians), how far its lumps have worked, its gain.
    tSky: { value: null },
    uSkyTurn: { value: skyTurn },
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
  // The card loop is eight seconds of one light: a sheet of cloud that went on would have to come back.
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
      const bx = x - (BREAK.x + WIND.to[0] * WIND.cloud * (seconds - T0));
      const bz = z - (BREAK.z + WIND.to[1] * WIND.cloud * (seconds - T0));
      const ex = x - (BREAK2.x + WIND.to[0] * WIND.cloud * seconds);
      const ez = z - (BREAK2.z + WIND.to[1] * WIND.cloud * seconds);
      const c = mask.cover(x / CLOUD.repeat - d[0], z / CLOUD.repeat - d[1]) * BREAK.cover + BREAK.gain * Math.exp(-(bx * bx + bz * bz) / (BREAK.radius * BREAK.radius)) + BREAK2.gain * Math.exp(-(ex * ex + ez * ez) / (BREAK2.radius * BREAK2.radius));
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
      const sky = skySeconds(seconds);
      const d = drift(sky);
      cloudShade.x = d[0];
      cloudShade.y = d[1];
      breakToward(sky);
      breakAt.x = BREAK.x + WIND.to[0] * WIND.cloud * (sky - T0);
      breakAt.y = BREAK.z + WIND.to[1] * WIND.cloud * (sky - T0);
      break2At.x = BREAK2.x + WIND.to[0] * WIND.cloud * sky;
      break2At.y = BREAK2.z + WIND.to[1] * WIND.cloud * sky;
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
