// The light rig of the Spine: the uniforms every surface shares, the baked land, the map of contact shade, and the round lights (the lightning).
// Owned by the root. Folders read it and never change it, except through the calls below.
import * as THREE from 'three';
import { ground, locate } from '../ridge';
import { CARCASS_FROM, DUSK, INSIDE_FROM, STRIKES, STRIKE_FROM, WIND, WIND_SPEED } from './anchors';
import { stagedSeconds } from './stage';

// The coarse map holds the first four spires and the ground every camera stands on; beyond it the land is taken as open.
export const LAND = { minX: -1800, maxX: 3800, minZ: -1100, maxZ: 1700, width: 1024, height: 512 };
// The fine map holds the saddle before the first spire, where three of the five cameras stand, and the near mouth of the canal.
export const LAND_FINE = { minX: -700, maxX: 140, minZ: -180, maxZ: 660, width: 512, height: 512 };
export const CONTACT = { size: 1024, minRadius: 30, maxRadius: 220 };
/** The round lights the rig holds. The strikes may hold six at once; two are kept for the lead. */
export const MAX_EMITTERS = 8;
/** How much of a round light's power the storm cloud throws back on the ridge as uFlash: radiance times radius squared, over this many square metres. */
export const FLASH_AREA = 3.6e8;

export type Height = (x: number, z: number) => number;
/** What lies under the ground at a point: null where it is solid, or the roof of the hollow (metres over the canal floor) and the share of the sky's light that reaches into it (0 to 1). */
export type Hollow = (x: number, z: number) => { roof: number; light: number } | null;

interface Grid {
  spec: typeof LAND;
  height: Float32Array;
  open: Float32Array;
  /** What the same look takes within 14 m alone: the fine grid replaces that share with its own. */
  near: Float32Array;
  roof: Float32Array;
  light: Float32Array;
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

const REACH_FAR = [6, 14, 30, 60, 110, 190, 320, 520];
const REACH_NEAR = [0.8, 1.6, 3.2, 6, 11];

function bakeGrid(spec: typeof LAND, height: Height, hollow: Hollow | null, openFrom: Grid | null): Grid {
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
        const wide = sample(far.open, far.spec, x, z);
        open[j * w + i] = wide * Math.min(1, (near[j * w + i] as number) / Math.max(0.05, sample(far.near, far.spec, x, z)));
      }
    }
  } else open = skyOpen((x, z) => sample(heights, spec, x, z), spec, 2, REACH_FAR);
  const roof = new Float32Array(w * h);
  const light = new Float32Array(w * h);
  if (hollow) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const under = hollow(spec.minX + (i + 0.5) * cx, spec.minZ + (j + 0.5) * cz);
        if (under) {
          roof[j * w + i] = under.roof;
          light[j * w + i] = under.light;
        }
      }
    }
  }
  return { spec, height: heights, open, near: openFrom ? open : skyOpen((x, z) => sample(heights, spec, x, z), spec, 2, [6, 14]), roof, light };
}

function gridTexture(grid: Grid): THREE.DataTexture {
  const n = grid.spec.width * grid.spec.height;
  const data = new Uint16Array(n * 4);
  for (let i = 0; i < n; i++) {
    data[i * 4] = THREE.DataUtils.toHalfFloat(grid.height[i] as number);
    data[i * 4 + 1] = THREE.DataUtils.toHalfFloat(grid.open[i] as number);
    data[i * 4 + 2] = THREE.DataUtils.toHalfFloat(grid.light[i] as number);
    data[i * 4 + 3] = THREE.DataUtils.toHalfFloat(grid.roof[i] as number);
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
  /** Radiance, scene linear. The open sky of the place is about 0.1; a bolt seen direct is hundreds. */
  radiance: THREE.Vector3;
}

export interface Rig {
  /** Spread into the uniforms of every material that includes RIG_GLSL: `uniforms: { ...rig.uniforms, mine: { value } }`. */
  readonly uniforms: Record<string, THREE.IUniform>;
  /** Soft shapes that hide the sky from the ground under whatever stands on it. Use `contactDiscs`. */
  readonly contactScene: THREE.Scene;
  /** The round lights: the lightning. Push at creation, move and recolour in setTime (a light at zero radiance costs nothing to the eye). At most eight. */
  readonly emitters: Emitter[];
  /** The land as the rig knows it. Before the land folder calls `setLand` it is the rough ground of the layout (ridge.ts). */
  readonly land: {
    height(x: number, z: number): number;
    /** 0 to 1, how much of the sky the ground there sees. */
    open(x: number, z: number): number;
  };
  /** Seconds of the six strikes, in the time of the place. */
  readonly strikes: readonly number[];
  /** Called by the land folder, once, at creation: the true height of the land everywhere, and the hollow under it (the canal). */
  setLand(height: Height, hollow?: Hollow): void;
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

const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

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
  const contactCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
  contactCamera.up.set(0, 0, -1);

  const emitters: Emitter[] = [];
  const emitterPlaces = Array.from({ length: MAX_EMITTERS }, () => new THREE.Vector4(0, -9000, 0, 0));
  const emitterRadiance = Array.from({ length: MAX_EMITTERS }, () => new THREE.Vector3());
  const flash = new THREE.Vector3();

  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uSolo: { value: 0 },
    tLand: { value: null },
    uLandRect: { value: rect(LAND) },
    tLandFine: { value: null },
    uLandFineRect: { value: rect(LAND_FINE) },
    tContact: { value: contactTarget.texture },
    uContactRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    // The dusk above the cloud, set against the approved wide view: the open sky above the band, the first dark overhead, the cloud sea below, the storm.
    uSkyZenith: { value: new THREE.Vector3(0.03, 0.037, 0.066) },
    uSkyHorizon: { value: new THREE.Vector3(0.096, 0.11, 0.156) },
    uSkyGround: { value: new THREE.Vector3(0.027, 0.033, 0.05) },
    uSkyStorm: { value: new THREE.Vector3(0.012, 0.012, 0.022) },
    uStormDir: { value: new THREE.Vector3(-WIND[0], 0, -WIND[2]).normalize() },
    uWarmDir: { value: new THREE.Vector3(DUSK[0], 0.04, DUSK[2]).normalize() },
    uWarmColour: { value: new THREE.Vector3(1.35, 0.78, 0.44) },
    uFill: { value: new THREE.Vector3(1, 1, 1) },
    // How much of the light that reaches into the canal is kept: staged by shot (see setTime).
    uUnder: { value: 1 },
    uFlash: { value: flash },
    uWind: { value: new THREE.Vector4(WIND[0], WIND[1], WIND[2], WIND_SPEED) },
    uEmitterCount: { value: 0 },
    uEmitters: { value: emitterPlaces },
    uEmitterRadiance: { value: emitterRadiance },
    // The stroke that burns now, set by the strikes: where its light comes from (a point on the channel) and its power, exactly 0 when
    // none burns; the tip it lands on (w: the pulse it sends in by the canal's far mouth), and where it enters the cloud (w: what the
    // cloud takes of it). Every w is exactly 0 when none burns.
    uStrikeAt: { value: new THREE.Vector4(0, 0, 0, 0) },
    uStrikeTip: { value: new THREE.Vector4(0, 0, 0, 0) },
    uStrikeTop: { value: new THREE.Vector4(0, 0, 0, 0) },
  };

  let landHeight: Height = (x, z) => {
    const at = locate(x, z);
    return ground(at.s, at.l);
  };
  let landHollow: Hollow | null = null;
  let coarse: Grid | null = null;
  let fine: Grid | null = null;
  let coarseTexture: THREE.DataTexture | null = null;
  let fineTexture: THREE.DataTexture | null = null;

  const bake = (): void => {
    coarse = bakeGrid(LAND, landHeight, landHollow, null);
    fine = bakeGrid(LAND_FINE, landHeight, landHollow, coarse);
    coarseTexture?.dispose();
    fineTexture?.dispose();
    coarseTexture = gridTexture(coarse);
    fineTexture = gridTexture(fine);
    (uniforms.tLand as THREE.IUniform).value = coarseTexture;
    (uniforms.tLandFine as THREE.IUniform).value = fineTexture;
  };

  const land = {
    height: (x: number, z: number): number => landHeight(x, z),
    open: (x: number, z: number): number => {
      if (!coarse || !fine) bake();
      const c = coarse as Grid;
      const f = fine as Grid;
      if (!inside(c.spec, x, z)) return 1;
      const far = sample(c.open, c.spec, x, z);
      if (!inside(f.spec, x, z)) return far;
      const ex = Math.min(x - f.spec.minX, f.spec.maxX - x) / (f.spec.maxX - f.spec.minX);
      const ez = Math.min(z - f.spec.minZ, f.spec.maxZ - z) / (f.spec.maxZ - f.spec.minZ);
      return far + (sample(f.open, f.spec, x, z) - far) * smooth(0, 0.06, Math.min(ex, ez));
    },
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

  return {
    uniforms,
    contactScene,
    emitters,
    land,
    strikes: STRIKES,
    setLand: (height, hollow) => {
      landHeight = height;
      landHollow = hollow ?? null;
      coarse = null;
      fine = null;
    },
    contactDiscs: (count) => {
      const mesh = new THREE.InstancedMesh(discGeometry, discMaterial, count);
      mesh.frustumCulled = false;
      for (let i = 0; i < count; i++) {
        dummy.position.set(0, -9000, 0);
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
      // Staged by shot: low by the dead one (spine-03) the lens is opened for the dusk on the snow, and the sky gives more.
      const byDead = stagedSeconds() >= CARCASS_FROM && stagedSeconds() < STRIKE_FROM;
      // The snow there is the cold blue grey of its approved picture, under a dark sky: opened, but less than the first wave had it.
      if (byDead) {
        (uniforms.uSkyZenith as THREE.IUniform<THREE.Vector3>).value.set(0.09, 0.094, 0.128);
        (uniforms.uSkyHorizon as THREE.IUniform<THREE.Vector3>).value.set(0.25, 0.258, 0.34);
        (uniforms.uSkyGround as THREE.IUniform<THREE.Vector3>).value.set(0.085, 0.088, 0.118);
      } else {
        // Before the long lens of the strike the spire stands in the storm's shadow: the sky gives less, and the stroke is the light.
        const shade = stagedSeconds() >= STRIKE_FROM && stagedSeconds() < INSIDE_FROM ? 0.62 : 1;
        (uniforms.uSkyZenith as THREE.IUniform<THREE.Vector3>).value.set(0.03, 0.037, 0.066).multiplyScalar(shade);
        (uniforms.uSkyHorizon as THREE.IUniform<THREE.Vector3>).value.set(0.096, 0.11, 0.156).multiplyScalar(shade);
        (uniforms.uSkyGround as THREE.IUniform<THREE.Vector3>).value.set(0.027, 0.033, 0.05).multiplyScalar(shade);
      }
      // Staged by shot: from the cut into the canal the lens is exposed for the dark, and the light that reaches in counts for more.
      (uniforms.uUnder as THREE.IUniform<number>).value = stagedSeconds() >= INSIDE_FROM ? 40 : 1;
      // Staged by shot: inside the canal the light is the cold of the mouths alone; the last warm band does not reach in. Low by the dead one
      // (spine-03) the light is the storm's cold, and the band gives a third of itself.
      (uniforms.uWarmColour as THREE.IUniform<THREE.Vector3>).value.set(1.35, 0.78, 0.44).multiplyScalar(stagedSeconds() >= INSIDE_FROM ? 0.08 : stagedSeconds() >= CARCASS_FROM && stagedSeconds() < STRIKE_FROM ? 0.22 : 0.6);
    },
    beforeSample: (renderer, camera) => {
      if (!coarse) bake();
      const count = Math.min(MAX_EMITTERS, emitters.length);
      flash.set(0, 0, 0);
      for (let i = 0; i < count; i++) {
        const e = emitters[i] as Emitter;
        (emitterPlaces[i] as THREE.Vector4).set(e.position.x, e.position.y, e.position.z, e.radius);
        (emitterRadiance[i] as THREE.Vector3).copy(e.radiance);
        flash.addScaledVector(e.radiance, (e.radius * e.radius) / FLASH_AREA);
      }
      (uniforms.uEmitterCount as THREE.IUniform<number>).value = count;

      camera.getWorldDirection(forward);
      // The contact map follows the view: centred where the middle of the frame meets the ground, and sized to that distance.
      const height = Math.max(1, camera.position.y - landHeight(camera.position.x, camera.position.z));
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
      contactCamera.position.set(centre.x, 3000, centre.z);
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
      coarseTexture?.dispose();
      fineTexture?.dispose();
      discGeometry.dispose();
      discMaterial.dispose();
    },
  };
}
