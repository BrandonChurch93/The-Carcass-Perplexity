// The light rig of the Heart: the uniforms every surface shares, the map of the lake's glow, the map of contact shade,
// the baked land, and the drift of the crust. Owned by the root. Folders read it and never change it, except through the calls below.
import * as THREE from 'three';
import { secondsInPlace, shotById } from '../../../film/cut';
import { FAN_FROM, TUBE, createCourse } from '../fall/path';
import { apronSlope } from '../fall/shape';
import { MOUTH, ground, smooth } from '../layout';
import { GROUP, UNIT } from './anchors';
import { stagedSeconds } from './stage';

export const GLOW = { minX: -600, maxX: 1320, minZ: -480, maxZ: 560, width: 1536, height: 832 };
export const LAND = { minX: -1300, maxX: 1500, minZ: -640, maxZ: 760, width: 1024, height: 512 };
export const LAND_FINE = { minX: -700, maxX: -380, minZ: 60, maxZ: 380, width: 512, height: 512 };
// The contact map stays 1024 wide: at 2048 it cost half a second a sample at the wide key. For long lenses it is aimed at the ground the lens sees.
export const CONTACT = { size: 1024, minRadius: 30, maxRadius: 220 };
export const FLOW = { foot: [MOUTH.x - 6, -326] as [number, number], speed: 0.28, toward: [0.94, 0.34] as [number, number] };
export const MAX_EMITTERS = 8;
// The bank of smoke that stands over the group feeding at the seam in the shot of key heart-3 (the approved picture has the three animals inside
// lit smoke, on warm ground: 76 52 46 where the sky alone gives 57 50 56). It hides `shade` of the sky from what is under its middle and is a wide
// dim round light, 25 m up: the lake's light caught by the smoke and thrown down. Its colour is paler than the lava's, as scattered light is.
// It stands in that shot alone, so the wide view keeps its neutral lake.
// Its radiance was 1.5, 0.66, 0.11: halved when the crust's own seams began to light their banks (the crust skin), and less yellow, since
// smoke lit from below is paler than the fire: the floor away from the seams stood mustard under it.
// Its green and blue were 0.36 and 0.12 and it hid a quarter of the sky: the floor of that shot stood 1.9 times as red as blue against the
// picture's 1.5, lit by the bank more than by the sky. The smoke is pale grey lit from below and thin enough to pass the sky: the same red, more
// green and blue, a tenth of the sky hidden. The red of the floor is then the melt's own, within a few metres of it.
export const BANK = { shot: 'heart-02', at: [GROUP[0] + 30, 25, GROUP[2] - 10] as const, radius: 60, shadeRadius: 110, shade: 0.1, radiance: [0.75, 0.52, 0.38] as const };
// The pools of the seam the walkers feed at, as the lava draws them (lake/heat.ts, heroPool and stringPools): where each lies on the crust at the
// reference time, its long axis, its half length and half width in metres. Each lights an apron of crust round itself, bright at the brim and
// gone 3 m out (emitterIrradiance). The radiance has the colour of the lava at 1400 K and three and a half times its level: the crust at a brim is near black (albedo 0.014 to 0.05).
export const POOLS = {
  at: [[-404.9, 204.0], [-418.8, 203.8], [-385.1, 195.4]] as const,
  axis: [[0.734, -0.679], [0.95, -0.3], [0.9, -0.44]] as const,
  halves: [[3.0, 0.9], [1.2, 0.7], [1.5, 0.6]] as const,
  radiance: [70, 9.5] as const,
};

// The stream of the fall as a light: the lava from the lip of the mouth down the foot of the wall to the lake, as the fall draws it (fall/path.ts).
// It is kept as `rows` cross sections of the main stream, evenly spaced along z from the lip to the toe of the fan: its middle at that z, half
// the width of its open lava, and how high its surface stands. The course's own width is the bed's; the lava that shows is the middle `open` of it.
// The rock beside it takes its light from that strip (emitterIrradiance): `share` of the lava at 1400 K at the brim, half of that `half` metres
// out, nothing past 18 m. The fan is crust with open rivulets, not a sheet of melt: from where the stream spreads it casts `fan` of that.
// A round light that stands on the stream above the fan (the fall's light for the body of the stream) casts `core` on surfaces in place of
// EMITTER_CORE: it stood for the whole river as one disc 36 m wide and washed the slope evenly for 20 m each side, which hid the fall-off the
// strip now gives. The air reads the round lights for itself and is not touched by this.
export const STREAM = { rows: 48, open: 0.5, half: 3.5, share: 2.4, fan: 0.1, core: 1, mouth: 0.5 };
/** What a small round light casts on surfaces, against its disc's own share (see emitterIrradiance). A light wider than 60 m casts once. */
export const EMITTER_CORE = 4.5;

export type Height = (x: number, z: number) => number;

interface Grid {
  spec: typeof LAND;
  height: Float32Array;
  open: Float32Array;
  /** What the same look takes within 14 m alone: the fine grid replaces that share with its own. */
  near: Float32Array;
  shore: Float32Array;
}

function sample(data: Float32Array, spec: typeof LAND, x: number, z: number): number {
  const fx = Math.min(spec.width - 1.001, Math.max(0, ((x - spec.minX) / (spec.maxX - spec.minX)) * spec.width - 0.5));
  const fz = Math.min(spec.height - 1.001, Math.max(0, ((z - spec.minZ) / (spec.maxZ - spec.minZ)) * spec.height - 0.5));
  const i = Math.floor(fx);
  const j = Math.floor(fz);
  const u = fx - i;
  const v = fz - j;
  const a = j * spec.width + i;
  const b = a + spec.width;
  return ((data[a] as number) * (1 - u) + (data[a + 1] as number) * u) * (1 - v) + ((data[b] as number) * (1 - u) + (data[b + 1] as number) * u) * v;
}

const inside = (spec: typeof LAND, x: number, z: number): boolean => x >= spec.minX && x <= spec.maxX && z >= spec.minZ && z <= spec.maxZ;

// Distance to the edge of the lake, metres, positive on land. A two pass sweep over the grid.
function shoreDistance(height: Float32Array, spec: typeof LAND): Float32Array {
  const w = spec.width;
  const h = spec.height;
  const dx = (spec.maxX - spec.minX) / w;
  const dz = (spec.maxZ - spec.minZ) / h;
  const dd = Math.hypot(dx, dz);
  const out = new Float32Array(w * h);
  for (const lake of [true, false]) {
    const d = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) d[i] = ((height[i] as number) <= 0) === lake ? 1e9 : 0;
    const relax = (i: number, j: number, oi: number, oj: number, cost: number): void => {
      const x = i + oi;
      const y = j + oj;
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const v = (d[y * w + x] as number) + cost;
      if (v < (d[j * w + i] as number)) d[j * w + i] = v;
    };
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        relax(i, j, -1, 0, dx);
        relax(i, j, 0, -1, dz);
        relax(i, j, -1, -1, dd);
        relax(i, j, 1, -1, dd);
      }
    }
    for (let j = h - 1; j >= 0; j--) {
      for (let i = w - 1; i >= 0; i--) {
        relax(i, j, 1, 0, dx);
        relax(i, j, 0, 1, dz);
        relax(i, j, 1, 1, dd);
        relax(i, j, -1, 1, dd);
      }
    }
    for (let i = 0; i < w * h; i++) if (((height[i] as number) <= 0) === lake) out[i] = (lake ? -1 : 1) * ((d[i] as number) - 0.5 * Math.min(dx, dz));
  }
  return out;
}

// How much of the sky each point of the ground sees over the land round it: 1 on the open lake, less under a wall.
// `reach` lists the distances looked at in each of eight directions, and `at` reads the land's height anywhere.
function skyOpen(at: Height, spec: typeof LAND, step: number, reach: readonly number[]): Float32Array {
  const w = Math.ceil(spec.width / step);
  const h = Math.ceil(spec.height / step);
  const cx = (spec.maxX - spec.minX) / spec.width;
  const cz = (spec.maxZ - spec.minZ) / spec.height;
  const low = new Float32Array(w * h);
  const DIRS = 8;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const x = spec.minX + (i * step + 0.5) * cx;
      const z = spec.minZ + (j * step + 0.5) * cz;
      const y = Math.max(0, at(x, z));
      let sum = 0;
      for (let k = 0; k < DIRS; k++) {
        const a = ((k + 0.5) / DIRS) * Math.PI * 2;
        const ax = Math.cos(a);
        const az = Math.sin(a);
        let slope = 0;
        for (const r of reach) {
          const rise = (at(x + ax * r, z + az * r) - y) / r;
          if (rise > slope) slope = rise;
        }
        sum += 1 - slope / Math.hypot(1, slope);
      }
      low[j * w + i] = sum / DIRS;
    }
  }
  if (step === 1) return low;
  const lowSpec = { ...spec, width: w, height: h };
  const out = new Float32Array(spec.width * spec.height);
  for (let j = 0; j < spec.height; j++) {
    for (let i = 0; i < spec.width; i++) out[j * spec.width + i] = sample(low, lowSpec, spec.minX + (i + 0.5) * cx, spec.minZ + (j + 0.5) * cz);
  }
  // Read through a linear filter, a map that was itself stretched linearly shows its cells as creases on a steep wall, where the sky open changes
  // by half within two cells: a faint regular grid. Two passes of a 1 2 1 blur round the creases off.
  return soften(soften(out, spec.width, spec.height), spec.width, spec.height);
}

function soften(data: Float32Array, w: number, h: number): Float32Array {
  const across = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const a = data[j * w + Math.max(0, i - 1)] as number;
      const b = data[j * w + Math.min(w - 1, i + 1)] as number;
      across[j * w + i] = 0.25 * a + 0.5 * (data[j * w + i] as number) + 0.25 * b;
    }
  }
  const out = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const a = across[Math.max(0, j - 1) * w + i] as number;
      const b = across[Math.min(h - 1, j + 1) * w + i] as number;
      out[j * w + i] = 0.25 * a + 0.5 * (across[j * w + i] as number) + 0.25 * b;
    }
  }
  return out;
}

const REACH_FAR = [6, 14, 30, 60, 110, 190, 320, 520, 800];
// The fine grid looks at its own ground from 0.7 m out, so that a crack, the foot of a step and the hollow between two blocks lose the sky
// on the bench the camera stands on. Beyond 14 m the coarse grid has already looked: the two are multiplied.
const REACH_NEAR = [0.7, 1.4, 2.8, 5.5, 11];

function bakeGrid(spec: typeof LAND, height: Height, openFrom: Grid | null): Grid {
  const { width: w, height: h } = spec;
  const cx = (spec.maxX - spec.minX) / w;
  const cz = (spec.maxZ - spec.minZ) / h;
  const heights = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) heights[j * w + i] = height(spec.minX + (i + 0.5) * cx, spec.minZ + (j + 0.5) * cz);
  let open: Float32Array;
  if (openFrom) {
    const far = openFrom;
    const near = skyOpen((x, z) => (inside(spec, x, z) ? sample(heights, spec, x, z) : sample(far.height, far.spec, x, z)), spec, 1, REACH_NEAR);
    open = new Float32Array(w * h);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const x = spec.minX + (i + 0.5) * cx;
        const z = spec.minZ + (j + 0.5) * cz;
        // The coarse grid saw the same ground at 6 and 14 m through cells of 5 m: what it took there is given back before the near look is taken.
        const wide = sample(far.open, far.spec, x, z);
        open[j * w + i] = wide * Math.min(1, (near[j * w + i] as number) / Math.max(0.05, sample(far.near, far.spec, x, z)));
      }
    }
  } else open = skyOpen((x, z) => sample(heights, spec, x, z), spec, 2, REACH_FAR);
  return { spec, height: heights, open, near: openFrom ? open : skyOpen((x, z) => sample(heights, spec, x, z), spec, 2, [6, 14]), shore: shoreDistance(heights, spec) };
}

function gridTexture(grid: Grid): THREE.DataTexture {
  const n = grid.spec.width * grid.spec.height;
  const data = new Uint16Array(n * 4);
  for (let i = 0; i < n; i++) {
    data[i * 4] = THREE.DataUtils.toHalfFloat(grid.height[i] as number);
    data[i * 4 + 1] = THREE.DataUtils.toHalfFloat(grid.open[i] as number);
    data[i * 4 + 2] = THREE.DataUtils.toHalfFloat(grid.shore[i] as number);
    data[i * 4 + 3] = THREE.DataUtils.toHalfFloat(1);
  }
  const t = new THREE.DataTexture(data, grid.spec.width, grid.spec.height, THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

const rect = (spec: { minX: number; maxX: number; minZ: number; maxZ: number }): THREE.Vector4 => new THREE.Vector4(spec.minX, spec.minZ, 1 / (spec.maxX - spec.minX), 1 / (spec.maxZ - spec.minZ));

/** The colour of anything that glows by its own heat, the same numbers as `blackbody` in the shaders. */
export function blackbody(kelvin: number): [number, number, number] {
  const r = 60 * Math.exp(-23587 * (1 / kelvin - 1 / 1500));
  const clip = 1 / (1 + Math.exp((1540 - kelvin) / 32));
  return [r, r * (2.87 * Math.exp(-4386 / kelvin) + 0.6 * clip), r * (0.003 + 0.12 * clip)];
}

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
  // Full shade over the inner 0.4 of the radius (it was 0.15, a point): a disc is the foot of the thing and a rim of shade round it.
  float a = vStrength * (1.0 - smoothstep(0.4, 1.0, r));
  gl_FragColor = vec4(a, a, a, a);
}`;

export interface Emitter {
  position: THREE.Vector3;
  radius: number;
  /** Radiance, scene linear. Use `blackbody`. */
  radiance: THREE.Vector3;
}

export interface Rig {
  /** Spread into the uniforms of every material that includes RIG_GLSL: `uniforms: { ...rig.uniforms, mine: { value } }`. */
  readonly uniforms: Record<string, THREE.IUniform>;
  /** Everything that glows on or near the lake is drawn here a second time, seen from above, with a material that writes its radiance. The rig renders it into `tGlow` once a frame. Additive blending is safest. */
  readonly glowScene: THREE.Scene;
  /** Soft shapes that hide the sky from the ground under whatever stands on it. Use `contactDiscs`. */
  readonly contactScene: THREE.Scene;
  /** The round lights. Push at creation, move and recolour in setTime. At most eight. */
  readonly emitters: Emitter[];
  /** The land as the rig knows it. Before the land folder calls `setLand` it is the rough ground of the layout. */
  readonly land: {
    height(x: number, z: number): number;
    /** 0 to 1, how much of the sky the ground there sees. */
    open(x: number, z: number): number;
    /** Metres to the edge of the lake, positive on land. */
    shore(x: number, z: number): number;
  };
  readonly flow: {
    /** Metres a second. */
    velocity(x: number, z: number): [number, number];
    /** Where the crust that is at (x, z) at the reference time is at `seconds`. */
    drift(x: number, z: number, seconds: number): [number, number];
    /** The reference time: the key frame of the establishing picture. */
    readonly t0: number;
  };
  /** Called by the land folder, once, at creation: the true height of the land everywhere. Negative or zero means lake. */
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

export function createRig(t0: number): Rig {
  const glowTarget = new THREE.WebGLRenderTarget(GLOW.width, GLOW.height, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: true,
    depthBuffer: false,
    stencilBuffer: false,
    colorSpace: THREE.NoColorSpace,
  });
  const glowCamera = new THREE.OrthographicCamera(-(GLOW.maxX - GLOW.minX) / 2, (GLOW.maxX - GLOW.minX) / 2, (GLOW.maxZ - GLOW.minZ) / 2, -(GLOW.maxZ - GLOW.minZ) / 2, 1, 2000);
  glowCamera.position.set((GLOW.minX + GLOW.maxX) / 2, 1000, (GLOW.minZ + GLOW.maxZ) / 2);
  glowCamera.up.set(0, 0, -1);
  glowCamera.lookAt(glowCamera.position.x, 0, glowCamera.position.z);
  glowCamera.updateMatrixWorld(true);

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

  const bankShot = shotById(BANK.shot);
  const bankFrom = secondsInPlace(UNIT, bankShot.first) - 0.3 / 60;
  const bankTo = secondsInPlace(UNIT, bankShot.last) + 0.7 / 60;
  const bankLight: Emitter = { position: new THREE.Vector3(BANK.at[0], -1000, BANK.at[2]), radius: BANK.radius, radiance: new THREE.Vector3() };
  const emitters: Emitter[] = [bankLight];
  const emitterPlaces = Array.from({ length: MAX_EMITTERS }, () => new THREE.Vector4(0, -1000, 0, 0));
  const emitterRadiance = Array.from({ length: MAX_EMITTERS }, () => new THREE.Vector3());
  const emitterCore = new Float32Array(MAX_EMITTERS);
  const streamRows = Array.from({ length: STREAM.rows }, () => new THREE.Vector4(0, 0, -1000, 0));
  const streamSpan = new THREE.Vector4(0, 1, STREAM.rows - 1, 0);
  const streamRadiance = blackbody(1400);
  const poolPlaces = POOLS.at.map((at, i) => new THREE.Vector4(at[0], at[1], (POOLS.axis[i] as readonly [number, number])[0], (POOLS.axis[i] as readonly [number, number])[1]));

  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uPulse: { value: 0 },
    uSolo: { value: 0 },
    tGlow: { value: glowTarget.texture },
    uGlowRect: { value: new THREE.Vector4(GLOW.minX, GLOW.maxZ, 1 / (GLOW.maxX - GLOW.minX), -1 / (GLOW.maxZ - GLOW.minZ)) },
    uGlowTexels: { value: GLOW.width / (GLOW.maxX - GLOW.minX) },
    tLand: { value: null },
    uLandRect: { value: rect(LAND) },
    tLandFine: { value: null },
    uLandFineRect: { value: rect(LAND_FINE) },
    tContact: { value: contactTarget.texture },
    uContactRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    uBank: { value: new THREE.Vector4(0, 0, 1, 0) },
    // The dusk sky, measured against the approved wide view: its sky reads 0.22, 0.25, 0.35 at 13 degrees up, and bare rock under it about 0.015.
    uSkyZenith: { value: new THREE.Vector3(0.09, 0.118, 0.2) },
    uSkyHorizon: { value: new THREE.Vector3(0.175, 0.21, 0.33) },
    // What dark ground throws back up at the underside of things: rock of albedo 0.1 under this sky, neutral.
    uSkyGround: { value: new THREE.Vector3(0.012, 0.0115, 0.012) },
    uCast: { value: 0.75 },
    uFill: { value: new THREE.Vector3(0.78, 0.64, 0.4) },
    uWarmDir: { value: new THREE.Vector3(0.86, 0.22, -0.46).normalize() },
    uWarmColour: { value: new THREE.Vector3(0.03, 0.0135, 0.006) },
    uEmitterCount: { value: 0 },
    uEmitters: { value: emitterPlaces },
    uEmitterRadiance: { value: emitterRadiance },
    uEmitterCore: { value: emitterCore },
    uRigPools: { value: poolPlaces },
    uRigPoolSize: { value: POOLS.halves.map((h) => new THREE.Vector4(h[0], h[1], POOLS.radiance[0], POOLS.radiance[1])) },
    uRigStream: { value: streamRows },
    uRigStreamSpan: { value: streamSpan },
    uRigStreamLight: { value: new THREE.Vector4(streamRadiance[0] * STREAM.share, streamRadiance[1] * STREAM.share, 1 / (STREAM.half * STREAM.half), 0) },
    uFlowFoot: { value: new THREE.Vector2(FLOW.foot[0], FLOW.foot[1]) },
    uFlowT0: { value: t0 },
  };

  let landHeight: Height = ground;
  let coarse: Grid | null = null;
  let fine: Grid | null = null;
  let coarseTexture: THREE.DataTexture | null = null;
  let fineTexture: THREE.DataTexture | null = null;

  const bake = (): void => {
    coarse = bakeGrid(LAND, landHeight, null);
    fine = bakeGrid(LAND_FINE, landHeight, coarse);
    coarseTexture?.dispose();
    fineTexture?.dispose();
    coarseTexture = gridTexture(coarse);
    fineTexture = gridTexture(fine);
    (uniforms.tLand as THREE.IUniform).value = coarseTexture;
    (uniforms.tLandFine as THREE.IUniform).value = fineTexture;
    layStream();
  };

  // 1 for a round light anywhere, less for one that stands on the stream above its fan, where the strip lights the rock.
  const onStream = (e: Emitter): number => {
    const at = (e.position.z - streamSpan.x) * streamSpan.y;
    if (e.radius > 30 || at > STREAM.rows - 1) return 1;
    // The light inside the mouth of the tube stands for the lava under the roof, which the slope outside sees through the mouth alone: half
    // its share (the slope 20 m west of the stream stood 83 60 53 at its median against the picture's 61 53 52).
    if (at < 1.5) return at > -8 && Math.abs(e.position.x - (streamRows[0] as THREE.Vector4).x) < 45 ? STREAM.mouth : 1;
    const row = streamRows[Math.round(at)] as THREE.Vector4;
    if (Math.abs(e.position.x - row.x) > row.y + 15 || Math.abs(e.position.y - row.z) > 15) return 1;
    const share = 1 - Math.max(row.w - 1, 0) / 2;
    return 1 + (STREAM.core / EMITTER_CORE - 1) * (share - STREAM.fan) / (1 - STREAM.fan);
  };

  // The stream's rows, from the fall's own course over the true land (the same call the fall makes).
  const layStream = (): void => {
    const course = createCourse(
      (x, z) => (z > TUBE.lipZ + 8 ? Math.max(apronSlope(x, z), landHeight(x, z) + 0.8) : apronSlope(x, z)),
      (x, z) => (z > TUBE.lipZ + 8 ? landHeight(x, z) + 0.7 : -1e3),
    );
    const main = course.main;
    let first = 0;
    while (first < main.n - 1 && (main.len[first] as number) < 0) first++;
    const z0 = main.z[first] as number;
    const z1 = main.z[main.n - 1] as number;
    const gap = (z1 - z0) / (STREAM.rows - 1);
    streamSpan.set(z0, 1 / gap, STREAM.rows - 1, z1);
    let i = first;
    for (let r = 0; r < STREAM.rows; r++) {
      const z = z0 + r * gap;
      while (i < main.n - 1 && (main.z[i] as number) < z) i++;
      const a = Math.max(first, i - 3);
      const b = Math.min(main.n - 1, i + 3);
      const tx = (main.x[b] as number) - (main.x[a] as number);
      const tz = (main.z[b] as number) - (main.z[a] as number);
      // Where the stream runs askew to z, a point beside it at the same z is nearer to it than it is to the stream's middle at that z.
      const lean = Math.max(0.35, Math.abs(tz) / (Math.hypot(tx, tz) || 1));
      // The fan spreads to a sheet 170 m wide where the crust has closed over it: its light is that of its head, where the rivulets are open.
      const share = 1 + (STREAM.fan - 1) * smooth(FAN_FROM, FAN_FROM + 30, main.len[i] as number);
      // The last number holds two things: the lean (up to 1, on the slope, where the share is whole) and the share (from 1 up, on the fan, which runs straight).
      (streamRows[r] as THREE.Vector4).set(main.x[i] as number, (main.half[i] as number) * STREAM.open, main.y[i] as number, share < 1 ? 1 + 2 * (1 - share) : lean);
    }
  };

  const read = (pick: (g: Grid) => Float32Array, x: number, z: number): number => {
    if (!coarse || !fine) bake();
    const c = coarse as Grid;
    const f = fine as Grid;
    const far = sample(pick(c), c.spec, x, z);
    if (!inside(f.spec, x, z)) return far;
    const ex = Math.min(x - f.spec.minX, f.spec.maxX - x) / (f.spec.maxX - f.spec.minX);
    const ez = Math.min(z - f.spec.minZ, f.spec.maxZ - z) / (f.spec.maxZ - f.spec.minZ);
    const k = smooth(0, 0.06, Math.min(ex, ez));
    return far + (sample(pick(f), f.spec, x, z) - far) * k;
  };

  const land = {
    height: (x: number, z: number): number => landHeight(x, z),
    open: (x: number, z: number): number => read((g) => g.open, x, z),
    shore: (x: number, z: number): number => read((g) => g.shore, x, z),
  };

  const velocity = (x: number, z: number): [number, number] => {
    const lake = -land.shore(x, z);
    const ox = x - FLOW.foot[0];
    const oz = z - FLOW.foot[1];
    const far = Math.hypot(ox, oz);
    const k = smooth(150, 600, far);
    let dx = (ox / Math.max(far, 1)) * (1 - k) + FLOW.toward[0] * k;
    let dz = (oz / Math.max(far, 1)) * (1 - k) + FLOW.toward[1] * k;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l;
    dz /= l;
    const s = FLOW.speed * smooth(8, 140, lake) * smooth(0, 30, far);
    return [dx * s, dz * s];
  };

  // The shader draws the crust's pattern at p - v(p) (t - t0). A thing that rides the crust must sit where that pattern sits: solve q + v(p) (t - t0) = p for p.
  const drift = (x: number, z: number, seconds: number): [number, number] => {
    const dt = seconds - t0;
    let px = x;
    let pz = z;
    for (let i = 0; i < 4; i++) {
      const v = velocity(px, pz);
      px = x + v[0] * dt;
      pz = z + v[1] * dt;
    }
    return [px, pz];
  };

  const glowScene = new THREE.Scene();
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

  let glowKey = NaN;
  let now = 0;
  const centre = new THREE.Vector3();
  const forward = new THREE.Vector3();

  return {
    uniforms,
    glowScene,
    contactScene,
    emitters,
    land,
    flow: { velocity, drift, t0 },
    setLand: (height) => {
      landHeight = height;
      coarse = null;
      fine = null;
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
      now = seconds;
      (uniforms.uTime as THREE.IUniform<number>).value = seconds;
      (uniforms.uPulse as THREE.IUniform<number>).value = 0.5 + 0.5 * Math.sin(seconds * 1.05);
      const staged = stagedSeconds();
      const banked = staged >= bankFrom && staged <= bankTo;
      bankLight.position.y = banked ? BANK.at[1] : -1000;
      bankLight.radiance.set(BANK.radiance[0], BANK.radiance[1], BANK.radiance[2]).multiplyScalar(banked ? 1 : 0);
      (uniforms.uBank as THREE.IUniform<THREE.Vector4>).value.set(BANK.at[0], BANK.at[2], 1 / BANK.shadeRadius, banked ? BANK.shade : 0);
      // The pools ride the crust.
      POOLS.at.forEach((at, i) => {
        const here = drift(at[0], at[1], seconds);
        const place = poolPlaces[i] as THREE.Vector4;
        place.x = here[0];
        place.y = here[1];
      });
    },
    beforeSample: (renderer, camera) => {
      if (!coarse) bake();
      const count = Math.min(MAX_EMITTERS, emitters.length);
      for (let i = 0; i < count; i++) {
        const e = emitters[i] as Emitter;
        (emitterPlaces[i] as THREE.Vector4).set(e.position.x, e.position.y, e.position.z, e.radius);
        (emitterRadiance[i] as THREE.Vector3).copy(e.radiance);
        emitterCore[i] = (EMITTER_CORE + (1 - EMITTER_CORE) * smooth(20, 60, e.radius)) * onStream(e);
      }
      (uniforms.uEmitterCount as THREE.IUniform<number>).value = count;

      const key = Math.floor(now * 60 + 1e-6);
      if (key !== glowKey) {
        glowKey = key;
        renderer.setRenderTarget(glowTarget);
        renderer.clear(true, false, false);
        renderer.render(glowScene, glowCamera);
      }

      camera.getWorldDirection(forward);
      // The map follows the view: it is centred where the middle of the frame meets the ground, and sized to that distance.
      const height = Math.max(1, camera.position.y - Math.max(0, landHeight(camera.position.x, camera.position.z)));
      // A long lens that looks level has its subject on the ground a third of the way up the frame, not where the middle of the frame meets
      // the ground (hundreds of metres on): the map is aimed there, so that the feet in its view have texels of 6 cm and not of 28.
      const half = Math.atan(1 / (camera.projectionMatrix.elements[5] as number));
      const long = smooth(0.26, 0.16, half);
      const pitch = Math.max(Math.asin(Math.min(1, Math.max(-1, -forward.y))) + (long * half) / 3, 0.026);
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
      glowTarget.dispose();
      contactTarget.dispose();
      coarseTexture?.dispose();
      fineTexture?.dispose();
      discGeometry.dispose();
      discMaterial.dispose();
    },
  };
}
