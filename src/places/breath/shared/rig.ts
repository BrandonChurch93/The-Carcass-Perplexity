// The light rig of the Breath: the uniforms every surface shares, the baked land (its height, how much sky it sees, and the shadow the low sun
// throws across it, baked once because the sun does not move), and the map of contact shade. Owned by the lead. Folders read it and never
// change it, except through the calls below.
import * as THREE from 'three';
import { DEPTH, bearingOf, ground, rimRadius } from '../land';
import { SHADOW_RUN, SUN_DIR } from './anchors';

/** The ground the land map covers, metres, and its size in texels: a cell is 0.31 m. */
export const LAND = { minX: -190, maxX: 130, minZ: -200, maxZ: 120, width: 1024, height: 1024 };
export const CONTACT = { size: 1024, minRadius: 14, maxRadius: 160 };
export const MAX_EMITTERS = 0;

export type Height = (x: number, z: number) => number;

function sample(data: Float32Array, w: number, h: number, fx: number, fz: number): number {
  const x = Math.min(w - 1.001, Math.max(0, fx));
  const z = Math.min(h - 1.001, Math.max(0, fz));
  const i = Math.floor(x);
  const j = Math.floor(z);
  const u = x - i;
  const v = z - j;
  const a = j * w + i;
  const b = a + w;
  return ((data[a] as number) * (1 - u) + (data[a + 1] as number) * u) * (1 - v) + ((data[b] as number) * (1 - u) + (data[b + 1] as number) * u) * v;
}

interface Grid {
  height: Float32Array;
  open: Float32Array;
  shadow: Float32Array;
}

const REACH = [0.7, 1.6, 3.5, 8, 18, 40];

function bakeGrid(at: Height): Grid {
  const { width: w, height: h } = LAND;
  const cx = (LAND.maxX - LAND.minX) / w;
  const cz = (LAND.maxZ - LAND.minZ) / h;
  const height = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) height[j * w + i] = at(LAND.minX + (i + 0.5) * cx, LAND.minZ + (j + 0.5) * cz);

  // The top of the land's shadow at every cell. The sun stands toward -z, so one sweep from the first row (nearest the sun) to the last does it:
  // the shadow at a cell is the shadow one row toward the sun, lower by what the sun's ray drops over that way, or the ground itself if that is higher.
  const shadow = new Float32Array(w * h);
  const toSunX = SUN_DIR[0] / -SUN_DIR[2];
  const run = cz * Math.hypot(1, toSunX);
  const drop = run / SHADOW_RUN;
  const shift = (toSunX * cz) / cx;
  for (let i = 0; i < w; i++) shadow[i] = height[i] as number;
  for (let j = 1; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const fx = Math.min(w - 1.001, Math.max(0, i + shift));
      const i0 = Math.floor(fx);
      const u = fx - i0;
      const before = (shadow[(j - 1) * w + i0] as number) * (1 - u) + (shadow[(j - 1) * w + i0 + 1] as number) * u - drop;
      shadow[j * w + i] = Math.max(height[j * w + i] as number, before);
    }
  }

  // How much of the sky each cell sees over the land round it, looked at on every second cell and stretched.
  const lw = w / 2;
  const lh = h / 2;
  const low = new Float32Array(lw * lh);
  const DIRS = 8;
  for (let j = 0; j < lh; j++) {
    for (let i = 0; i < lw; i++) {
      const fx = i * 2 + 0.5;
      const fz = j * 2 + 0.5;
      const y = sample(height, w, h, fx, fz);
      let sum = 0;
      for (let k = 0; k < DIRS; k++) {
        const a = ((k + 0.5) / DIRS) * Math.PI * 2;
        const ax = Math.cos(a) / cx;
        const az = Math.sin(a) / cz;
        let slope = 0;
        for (const r of REACH) {
          const rise = (sample(height, w, h, fx + ax * r, fz + az * r) - y) / r;
          if (rise > slope) slope = rise;
        }
        sum += 1 - slope / Math.hypot(1, slope);
      }
      low[j * lw + i] = sum / DIRS;
    }
  }
  const open = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) open[j * w + i] = sample(low, lw, lh, (i - 0.5) / 2, (j - 0.5) / 2);
  return { height, open, shadow };
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
  float a = vStrength * (1.0 - smoothstep(0.4, 1.0, r));
  gl_FragColor = vec4(a, a, a, a);
}`;

export interface Emitter {
  position: THREE.Vector3;
  radius: number;
  radiance: THREE.Vector3;
}

export interface Rig {
  /** Spread into the uniforms of every material that includes RIG_GLSL: `uniforms: { ...rig.uniforms, mine: { value } }`. */
  readonly uniforms: Record<string, THREE.IUniform>;
  /** Soft shapes that hide the sky and the sun from the ground under whatever stands on it. Use `contactDiscs`. */
  readonly contactScene: THREE.Scene;
  /** This place has no round lights: the list is kept for the Heart's signature and nothing reads it. */
  readonly emitters: Emitter[];
  /** The sun, which does not move: the unit vector toward it, the way its shadows fall on the ground (x, z) and how far for each metre of height. */
  readonly sun: { readonly direction: THREE.Vector3; readonly shadowWay: [number, number]; readonly shadowRun: number };
  /** The land as the rig knows it. Before the land folder calls `setLand` it is the ground of the layout. */
  readonly land: {
    height(x: number, z: number): number;
    /** 0 to 1, how much of the sky the ground there sees. */
    open(x: number, z: number): number;
    /** The height above which the sun is seen there, metres: equal to the ground's height where the ground is lit. */
    shadow(x: number, z: number): number;
  };
  /** Called by the land folder, once, at creation: the true height of the land everywhere, the inside of the shaft included. */
  setLand(height: Height, wet?: Height): void;
  /** `count` soft round shades for the contact map. Place each with `setDisc`. */
  contactDiscs(count: number): THREE.InstancedMesh;
  /** Centre on the ground, radius in metres, strength 0 to 1. `stretch` lengthens it along its own x, `yaw` turns it about y. For the shadow
   *  a thing throws, use `setShadow`. */
  setDisc(mesh: THREE.InstancedMesh, index: number, x: number, z: number, radius: number, strength: number, stretch?: number, yaw?: number): void;
  /** The long shadow of a thing that stands at (x, z), `tall` metres high and `radius` metres wide: a disc stretched away from the sun. */
  setShadow(mesh: THREE.InstancedMesh, index: number, x: number, z: number, radius: number, tall: number, strength: number): void;
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

  const sunDirection = new THREE.Vector3(...SUN_DIR).normalize();
  const shadowWay: [number, number] = [-SUN_DIR[0] / Math.hypot(SUN_DIR[0], SUN_DIR[2]), -SUN_DIR[2] / Math.hypot(SUN_DIR[0], SUN_DIR[2])];

  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uSolo: { value: 0 },
    tLand: { value: null },
    uLandRect: { value: new THREE.Vector4(LAND.minX, LAND.minZ, 1 / (LAND.maxX - LAND.minX), 1 / (LAND.maxZ - LAND.minZ)) },
    tContact: { value: contactTarget.texture },
    uContactRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    // The dawn sky under fog, scene linear. Measured against the approved wide view: the sky away from the sun reads a cold grey,
    // and pale rock in open shade reads about 0.3.
    uSkyZenith: { value: new THREE.Vector3(0.115, 0.112, 0.115) },
    uSkyHorizon: { value: new THREE.Vector3(0.17, 0.155, 0.145) },
    // What pale wet rock throws back up at the underside of things.
    uSkyGround: { value: new THREE.Vector3(0.06, 0.054, 0.048) },
    uSunDir: { value: sunDirection },
    // The sun through the fog on a face turned to it, and the fog's own glow round it.
    uSunColour: { value: new THREE.Vector3(1.25, 0.8, 0.45) },
    uGlowColour: { value: new THREE.Vector3(0.38, 0.3, 0.25) },
    uFill: { value: new THREE.Vector3(0.84, 0.95, 1.12) },
  };

  // Until the land folder says otherwise: the ground of the layout, with the shaft cut into it.
  let landHeight: Height = (x, z) => (Math.hypot(x, z) < rimRadius(bearingOf(x, z)) ? -DEPTH : ground(x, z));
  let landWet: Height | null = null;
  let grid: Grid | null = null;
  let landTexture: THREE.DataTexture | null = null;

  const bake = (): void => {
    grid = bakeGrid(landHeight);
    const { width: w, height: h } = LAND;
    const cx = (LAND.maxX - LAND.minX) / w;
    const cz = (LAND.maxZ - LAND.minZ) / h;
    const data = new Uint16Array(w * h * 4);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const k = j * w + i;
        // The outermost cells are what every point outside the map reads: open, lit and dry.
        const edge = i === 0 || j === 0 || i === w - 1 || j === h - 1;
        data[k * 4] = THREE.DataUtils.toHalfFloat(grid.height[k] as number);
        data[k * 4 + 1] = THREE.DataUtils.toHalfFloat(edge ? 1 : (grid.open[k] as number));
        data[k * 4 + 2] = THREE.DataUtils.toHalfFloat(edge ? -1000 : (grid.shadow[k] as number));
        data[k * 4 + 3] = THREE.DataUtils.toHalfFloat(edge || !landWet ? 0 : landWet(LAND.minX + (i + 0.5) * cx, LAND.minZ + (j + 0.5) * cz));
      }
    }
    landTexture?.dispose();
    landTexture = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
    landTexture.minFilter = THREE.LinearFilter;
    landTexture.magFilter = THREE.LinearFilter;
    landTexture.wrapS = THREE.ClampToEdgeWrapping;
    landTexture.wrapT = THREE.ClampToEdgeWrapping;
    landTexture.colorSpace = THREE.NoColorSpace;
    landTexture.needsUpdate = true;
    (uniforms.tLand as THREE.IUniform).value = landTexture;
  };

  const read = (pick: (g: Grid) => Float32Array, x: number, z: number, outside: number): number => {
    if (!grid) bake();
    if (x <= LAND.minX || x >= LAND.maxX || z <= LAND.minZ || z >= LAND.maxZ) return outside;
    const fx = ((x - LAND.minX) / (LAND.maxX - LAND.minX)) * LAND.width - 0.5;
    const fz = ((z - LAND.minZ) / (LAND.maxZ - LAND.minZ)) * LAND.height - 0.5;
    return sample(pick(grid as Grid), LAND.width, LAND.height, fx, fz);
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

  const setDisc: Rig['setDisc'] = (mesh, index, x, z, radius, strength, stretch = 1, yaw = 0) => {
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(radius * stretch, 1, radius);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, tint.setRGB(strength, strength, strength));
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  return {
    uniforms,
    contactScene,
    emitters: [],
    sun: { direction: sunDirection, shadowWay, shadowRun: SHADOW_RUN },
    land: {
      height: (x, z) => landHeight(x, z),
      open: (x, z) => read((g) => g.open, x, z, 1),
      shadow: (x, z) => read((g) => g.shadow, x, z, -1000),
    },
    setLand: (height, wet) => {
      landHeight = height;
      landWet = wet ?? null;
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
    setDisc,
    setShadow: (mesh, index, x, z, radius, tall, strength) => {
      // The shadow runs `tall` times the sun's run, but the fog eats it: past about six times the thing's own height it is gone.
      const length = Math.min(tall * SHADOW_RUN, tall * 6) + radius;
      const half = length / 2;
      setDisc(mesh, index, x + shadowWay[0] * (half - radius), z + shadowWay[1] * (half - radius), radius, strength, half / radius, Math.atan2(-shadowWay[1], shadowWay[0]));
    },
    bake,
    setTime: (seconds) => {
      (uniforms.uTime as THREE.IUniform<number>).value = seconds;
    },
    beforeSample: (renderer, camera) => {
      if (!grid) bake();
      camera.getWorldDirection(forward);
      // The contact map follows the view: it is centred where the middle of the frame meets the ground, and sized to that distance.
      const height = Math.max(1, camera.position.y - Math.max(0, landHeight(camera.position.x, camera.position.z)));
      const half = Math.atan(1 / (camera.projectionMatrix.elements[5] as number));
      const pitch = Math.max(Math.asin(Math.min(1, Math.max(-1, -forward.y))) + half / 3, 0.05);
      const reach = Math.min(600, height / Math.tan(pitch));
      const radius = Math.min(CONTACT.maxRadius, Math.max(CONTACT.minRadius, reach * 0.8));
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
      landTexture?.dispose();
      discGeometry.dispose();
      discMaterial.dispose();
    },
  };
}
