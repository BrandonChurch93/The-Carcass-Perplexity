// The light rig of the Blood Marsh: the uniforms every surface shares, the map of contact shade and the baked land.
// Owned by the root. Folders read it and never change it, except through the calls below.
// It is the Heart's rig without its fire: the sky dome alone. The Heart's names stay (glowScene, emitters, flow), so that code written against
// the Heart's rig runs here; nothing in the marsh glows and nothing drifts.
import * as THREE from 'three';
import { rockHeight } from './anchors';

/** The ground the cameras stand on: 512 m round the seep pool, in cells of half a metre. */
export const LAND = { minX: -256, maxX: 256, minZ: -256, maxZ: 256, width: 1024, height: 1024 };
export const CONTACT = { size: 1024, minRadius: 14, maxRadius: 160 };
export const MAX_EMITTERS = 8;
/** The air: how much of a surface's light is lost in a metre at the ground, and how fast the air thins with height (1 / metres). The air folder draws it. */
export const AIR = { density: 0.00024, thin: 1 / 320 };

export type Height = (x: number, z: number) => number;

interface Grid {
  height: Float32Array;
  open: Float32Array;
  shore: Float32Array;
  thin: Float32Array;
}

function sample(data: Float32Array, x: number, z: number): number {
  const fx = Math.min(LAND.width - 1.001, Math.max(0, ((x - LAND.minX) / (LAND.maxX - LAND.minX)) * LAND.width - 0.5));
  const fz = Math.min(LAND.height - 1.001, Math.max(0, ((z - LAND.minZ) / (LAND.maxZ - LAND.minZ)) * LAND.height - 0.5));
  const i = Math.floor(fx);
  const j = Math.floor(fz);
  const u = fx - i;
  const v = fz - j;
  const a = j * LAND.width + i;
  const b = a + LAND.width;
  return ((data[a] as number) * (1 - u) + (data[a + 1] as number) * u) * (1 - v) + ((data[b] as number) * (1 - u) + (data[b + 1] as number) * u) * v;
}

// How much of the sky each cell of the ground sees over the land round it: 1 on the open flats, less at the foot of the rock and in a hollow.
// Eight directions, five reaches from one metre to sixteen, read from the baked heights.
function skyOpen(height: Float32Array): Float32Array {
  const w = LAND.width;
  const h = LAND.height;
  const cell = (LAND.maxX - LAND.minX) / w;
  const out = new Float32Array(w * h);
  const reach = [2, 4, 8, 16, 32];
  const dirs: [number, number][] = [];
  for (let k = 0; k < 8; k++) dirs.push([Math.cos(((k + 0.5) / 8) * Math.PI * 2), Math.sin(((k + 0.5) / 8) * Math.PI * 2)]);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const y = Math.max(0, height[j * w + i] as number);
      let sum = 0;
      for (const d of dirs) {
        let slope = 0;
        for (const r of reach) {
          const x = Math.min(w - 1, Math.max(0, Math.round(i + d[0] * r)));
          const z = Math.min(h - 1, Math.max(0, Math.round(j + d[1] * r)));
          const rise = ((height[z * w + x] as number) - y) / (r * cell);
          if (rise > slope) slope = rise;
        }
        sum += 1 - slope / Math.hypot(1, slope);
      }
      out[j * w + i] = sum / 8;
    }
  }
  return out;
}

function gridTexture(grid: Grid): THREE.DataTexture {
  const n = LAND.width * LAND.height;
  const data = new Uint16Array(n * 4);
  for (let i = 0; i < n; i++) {
    data[i * 4] = THREE.DataUtils.toHalfFloat(grid.height[i] as number);
    data[i * 4 + 1] = THREE.DataUtils.toHalfFloat(grid.open[i] as number);
    data[i * 4 + 2] = THREE.DataUtils.toHalfFloat(grid.shore[i] as number);
    data[i * 4 + 3] = THREE.DataUtils.toHalfFloat(grid.thin[i] as number);
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
  // Full shade over the inner 0.4 of the radius: a disc is the foot of the thing and a rim of shade round it.
  float a = vStrength * (1.0 - smoothstep(0.4, 1.0, r));
  gl_FragColor = vec4(a, a, a, a);
}`;

export interface Emitter {
  position: THREE.Vector3;
  radius: number;
  /** Radiance, scene linear. */
  radiance: THREE.Vector3;
}

export interface Rig {
  /** Spread into the uniforms of every material that includes RIG_GLSL: `uniforms: { ...rig.uniforms, mine: { value } }`. */
  readonly uniforms: Record<string, THREE.IUniform>;
  /** The Heart's map of what glows. Nothing in the marsh glows: the scene is never drawn. */
  readonly glowScene: THREE.Scene;
  /** Soft shapes that hide the sky from the ground under whatever stands on it. Use `contactDiscs`. */
  readonly contactScene: THREE.Scene;
  /** The round lights. The marsh has none of its own. Push at creation, move and recolour in setTime. At most eight. */
  readonly emitters: Emitter[];
  /** The land as the rig knows it. Before the land folder calls `setLand` it is level salt with the blockout's rock rise. */
  readonly land: {
    /** Metres above the brine (y = 0). Negative in a channel or a pool: the bed under the brine. */
    height(x: number, z: number): number;
    /** 0 to 1, how much of the sky the ground there sees. */
    open(x: number, z: number): number;
    /** Metres to the edge of the brine, positive on land. Exact within 6 m of an edge, 6 beyond. */
    shore(x: number, z: number): number;
    /** 0 firm ground, 1 thin crust over deep mud. */
    thin(x: number, z: number): number;
  };
  /** The Heart's drift of the crust. Nothing drifts here: every point stays where it is. */
  readonly flow: {
    velocity(x: number, z: number): [number, number];
    drift(x: number, z: number, seconds: number): [number, number];
    readonly t0: number;
  };
  /** Called by the land folder, once, at creation: the true height of the land everywhere, the distance to the brine and how thin the crust is. */
  setLand(height: Height, shore?: Height, thin?: Height): void;
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

  const emitters: Emitter[] = [];
  const emitterPlaces = Array.from({ length: MAX_EMITTERS }, () => new THREE.Vector4(0, -1000, 0, 0));
  const emitterRadiance = Array.from({ length: MAX_EMITTERS }, () => new THREE.Vector3());

  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uPulse: { value: 0 },
    uSolo: { value: 0 },
    tLand: { value: null },
    uLandRect: { value: new THREE.Vector4(LAND.minX, LAND.minZ, 1 / (LAND.maxX - LAND.minX), 1 / (LAND.maxZ - LAND.minZ)) },
    tContact: { value: contactTarget.texture },
    uContactRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    // The white overcast, measured against the approved wide view: its sky reads 215 215 220 a third of the way up and 232 230 230 in the
    // haze at the horizon. Scene linear, before the place's exposure.
    uSkyZenith: { value: new THREE.Vector3(0.74, 0.745, 0.78) },
    uSkyHorizon: { value: new THREE.Vector3(0.9, 0.89, 0.89) },
    // What pale wet salt throws back up at the underside of things: about a third of the sky, a little warm and pink.
    uSkyGround: { value: new THREE.Vector3(0.3, 0.27, 0.265) },
    uFill: { value: new THREE.Vector3(1, 1, 1) },
    // The air pales the distance toward this, the horizon's white.
    uAirColour: { value: new THREE.Vector3(0.84, 0.845, 0.87) },
    uAir: { value: new THREE.Vector4(AIR.density, AIR.thin, 0, 0) },
    uEmitterCount: { value: 0 },
    uEmitters: { value: emitterPlaces },
    uEmitterRadiance: { value: emitterRadiance },
  };

  let landHeight: Height = (x, z) => Math.max(0.05, rockHeight(x, z));
  let landShore: Height = () => 6;
  let landThin: Height = () => 0;
  let grid: Grid | null = null;
  let texture: THREE.DataTexture | null = null;

  const bake = (): void => {
    const { width: w, height: h } = LAND;
    const cx = (LAND.maxX - LAND.minX) / w;
    const cz = (LAND.maxZ - LAND.minZ) / h;
    const height = new Float32Array(w * h);
    const shore = new Float32Array(w * h);
    const thin = new Float32Array(w * h);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const x = LAND.minX + (i + 0.5) * cx;
        const z = LAND.minZ + (j + 0.5) * cz;
        height[j * w + i] = landHeight(x, z);
        shore[j * w + i] = landShore(x, z);
        thin[j * w + i] = landThin(x, z);
      }
    }
    grid = { height, open: skyOpen(height), shore, thin };
    texture?.dispose();
    texture = gridTexture(grid);
    (uniforms.tLand as THREE.IUniform).value = texture;
  };

  const read = (pick: (g: Grid) => Float32Array, x: number, z: number): number => {
    if (!grid) bake();
    return sample(pick(grid as Grid), x, z);
  };

  const land = {
    height: (x: number, z: number): number => landHeight(x, z),
    open: (x: number, z: number): number => read((g) => g.open, x, z),
    shore: (x: number, z: number): number => landShore(x, z),
    thin: (x: number, z: number): number => landThin(x, z),
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
  const centre = new THREE.Vector3();
  const forward = new THREE.Vector3();

  return {
    uniforms,
    glowScene,
    contactScene,
    emitters,
    land,
    flow: { velocity: () => [0, 0], drift: (x, z) => [x, z], t0 },
    setLand: (height, shore, thin) => {
      landHeight = height;
      if (shore) landShore = shore;
      if (thin) landThin = thin;
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
      (uniforms.uPulse as THREE.IUniform<number>).value = 0.5 + 0.5 * Math.sin(seconds * 1.05);
    },
    beforeSample: (renderer, camera) => {
      if (!grid) bake();
      const count = Math.min(MAX_EMITTERS, emitters.length);
      for (let i = 0; i < count; i++) {
        const e = emitters[i] as Emitter;
        (emitterPlaces[i] as THREE.Vector4).set(e.position.x, e.position.y, e.position.z, e.radius);
        (emitterRadiance[i] as THREE.Vector3).copy(e.radiance);
      }
      (uniforms.uEmitterCount as THREE.IUniform<number>).value = count;

      // The contact map follows the view: it is centred where the lower third of the frame meets the ground, and sized to that distance.
      camera.getWorldDirection(forward);
      const height = Math.max(0.5, camera.position.y - Math.max(0, landHeight(camera.position.x, camera.position.z)));
      const half = Math.atan(1 / (camera.projectionMatrix.elements[5] as number));
      const pitch = Math.max(Math.asin(Math.min(1, Math.max(-1, -forward.y))) + half / 3, 0.03);
      const reach = Math.min(600, height / Math.tan(pitch));
      const radius = Math.min(CONTACT.maxRadius, Math.max(CONTACT.minRadius, reach * 0.9));
      const ahead = Math.max(reach * 0.9, radius * 0.8);
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
      discGeometry.dispose();
      discMaterial.dispose();
    },
  };
}
