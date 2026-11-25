// The light rig of the Eye: the uniforms every surface shares, the map of the land (height, open sky, the edge of the lake, and the long
// shadows of the cliffs, baked once because the sun does not move) and the map of contact shade. The functions that read them are in glsl.ts.
import * as THREE from 'three';
import { landHeight as layoutHeight, shoreOf } from '../layout';
import { SUN, SUN_DIR } from './anchors';

export const LAND = { minX: -1900, maxX: 1900, minZ: -1900, maxZ: 1900, width: 832, height: 832 };
export const CONTACT = { size: 1024, minRadius: 14, maxRadius: 220 };

export type Height = (x: number, z: number) => number;

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

const REACH = [9, 22, 50, 110, 240, 480];

interface Grid {
  height: Float32Array;
  open: Float32Array;
  shade: Float32Array;
}

function bakeGrid(spec: typeof LAND, height: Height): Grid {
  const { width: w, height: h } = spec;
  const cx = (spec.maxX - spec.minX) / w;
  const cz = (spec.maxZ - spec.minZ) / h;
  const heights = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) heights[j * w + i] = height(spec.minX + (i + 0.5) * cx, spec.minZ + (j + 0.5) * cz);
  const at = (x: number, z: number): number => sample(heights, spec, x, z);

  // The open sky, at half the grid.
  const lw = w / 2;
  const lh = h / 2;
  const low = new Float32Array(lw * lh);
  const DIRS = 8;
  for (let j = 0; j < lh; j++) {
    for (let i = 0; i < lw; i++) {
      const x = spec.minX + (i * 2 + 1) * cx;
      const z = spec.minZ + (j * 2 + 1) * cz;
      const y = Math.max(0, at(x, z));
      let sum = 0;
      for (let k = 0; k < DIRS; k++) {
        const a = ((k + 0.5) / DIRS) * Math.PI * 2;
        const ax = Math.cos(a);
        const az = Math.sin(a);
        let slope = 0;
        for (const r of REACH) {
          const rise = (at(x + ax * r, z + az * r) - y) / r;
          if (rise > slope) slope = rise;
        }
        sum += 1 - slope / Math.hypot(1, slope);
      }
      low[j * lw + i] = sum / DIRS;
    }
  }
  const lowSpec = { ...spec, width: lw, height: lh };
  let open: Float32Array = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) open[j * w + i] = sample(low, lowSpec, spec.minX + (i + 0.5) * cx, spec.minZ + (j + 0.5) * cz);
  open = soften(open, w, h);

  // The long shadows: for each cell, the height below which the land toward the sun hides it.
  const hx = SUN_DIR[0] / Math.hypot(SUN_DIR[0], SUN_DIR[2]);
  const hz = SUN_DIR[2] / Math.hypot(SUN_DIR[0], SUN_DIR[2]);
  const fall = Math.tan((SUN.elevation * Math.PI) / 180);
  let shade: Float32Array = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const x = spec.minX + (i + 0.5) * cx;
      const z = spec.minZ + (j + 0.5) * cz;
      let top = -50;
      for (let d = 5; d < 2700; d += Math.max(4, d * 0.045)) {
        const c = at(x + hx * d, z + hz * d) - d * fall;
        if (c > top) top = c;
      }
      shade[j * w + i] = top;
    }
  }
  shade = soften(shade, w, h);
  return { height: heights, open, shade };
}

function gridTexture(grid: Grid, spec: typeof LAND): THREE.DataTexture {
  const n = spec.width * spec.height;
  const cx = (spec.maxX - spec.minX) / spec.width;
  const cz = (spec.maxZ - spec.minZ) / spec.height;
  const data = new Uint16Array(n * 4);
  for (let i = 0; i < n; i++) {
    const x = spec.minX + ((i % spec.width) + 0.5) * cx;
    const z = spec.minZ + (Math.floor(i / spec.width) + 0.5) * cz;
    data[i * 4] = THREE.DataUtils.toHalfFloat(grid.height[i] as number);
    data[i * 4 + 1] = THREE.DataUtils.toHalfFloat(grid.open[i] as number);
    data[i * 4 + 2] = THREE.DataUtils.toHalfFloat(Math.hypot(x, z) - shoreOf(x, z));
    data[i * 4 + 3] = THREE.DataUtils.toHalfFloat(grid.shade[i] as number);
  }
  const t = new THREE.DataTexture(data, spec.width, spec.height, THREE.RGBAFormat, THREE.HalfFloatType);
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
  /** Soft shapes that hide the light from the ground under whatever stands on it. Use `contactDiscs`. */
  readonly contactScene: THREE.Scene;
  /** Kept for the name: nothing in the Eye glows, and the rig lights nothing from this list. */
  readonly emitters: Emitter[];
  /** The unit vector toward the sun, and the yaw that lays a stretched disc along its shadow. */
  readonly sun: { direction: THREE.Vector3; shadowYaw: number; stretch: number };
  /** The land as the rig knows it. Before the land folder calls `setLand` it is the rough ground of the layout. */
  readonly land: {
    height(x: number, z: number): number;
    /** 0 to 1, how much of the sky the ground there sees. */
    open(x: number, z: number): number;
    /** Metres to the edge of the lake, positive on land. */
    shore(x: number, z: number): number;
    /** True where a point at that height stands in the sun. */
    sunlit(x: number, y: number, z: number): boolean;
  };
  /** Called by the land folder, once, at creation: the true height of the land everywhere. Negative or zero means lake. */
  setLand(height: Height): void;
  /** `count` soft round shades for the contact map. Place each with `setDisc`. */
  contactDiscs(count: number): THREE.InstancedMesh;
  /** Centre on the ground, radius in metres, strength 0 to 1. `stretch` lengthens it along its own x, `yaw` turns it: `rig.sun.shadowYaw` lays it along the sun. */
  setDisc(mesh: THREE.InstancedMesh, index: number, x: number, z: number, radius: number, strength: number, stretch?: number, yaw?: number): void;
  /** For the root. */
  bake(): void;
  setTime(seconds: number): void;
  beforeSample(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void;
  dispose(): void;
}

const smooth = (lo: number, hi: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
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
  const contactCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
  contactCamera.up.set(0, 0, -1);
  const contactScene = new THREE.Scene();

  let landHeight: Height = layoutHeight;
  let grid: Grid | null = null;
  let texture: THREE.DataTexture | null = null;

  const sunDirection = new THREE.Vector3(...SUN_DIR);
  // The glow of the low sky stands to the north of the sun, where the establishing picture has it: on the left of a camera that looks north.
  const glowBearing = (312 * Math.PI) / 180;
  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uSolo: { value: 0 },
    tLand: { value: null },
    uLandRect: { value: new THREE.Vector4(LAND.minX, LAND.minZ, 1 / (LAND.maxX - LAND.minX), 1 / (LAND.maxZ - LAND.minZ)) },
    tContact: { value: contactTarget.texture },
    uContactRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    uSkyZenith: { value: new THREE.Vector3(0.2, 0.3, 0.47) },
    uSkyHorizon: { value: new THREE.Vector3(0.62, 0.6, 0.62) },
    uSkyGround: { value: new THREE.Vector3(0.16, 0.14, 0.13) },
    uSunDir: { value: sunDirection },
    uSunColour: { value: new THREE.Vector3(5.2, 3.3, 1.75) },
    uGlowDir: { value: new THREE.Vector3(Math.sin(glowBearing), 0, -Math.cos(glowBearing)) },
    uGlowColour: { value: new THREE.Vector3(1.5, 1.05, 0.6) },
    uFill: { value: new THREE.Vector3(1, 1, 1) },
  };

  const bake = (): void => {
    grid = bakeGrid(LAND, landHeight);
    texture?.dispose();
    texture = gridTexture(grid, LAND);
    (uniforms.tLand as THREE.IUniform).value = texture;
  };
  const ready = (): Grid => {
    if (!grid) bake();
    return grid as Grid;
  };

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
  const forward = new THREE.Vector3();
  const centre = new THREE.Vector3();

  return {
    uniforms,
    contactScene,
    emitters: [],
    sun: {
      direction: sunDirection,
      // A disc's long axis is its own x: this yaw turns it to lie along the ground away from the sun.
      shadowYaw: Math.atan2(SUN_DIR[2], -SUN_DIR[0]),
      stretch: 1 / Math.tan((SUN.elevation * Math.PI) / 180),
    },
    land: {
      height: (x, z) => landHeight(x, z),
      open: (x, z) => sample(ready().open, LAND, x, z),
      shore: (x, z) => Math.hypot(x, z) - shoreOf(x, z),
      sunlit: (x, y, z) => y > sample(ready().shade, LAND, x, z),
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
    },
    beforeSample: (renderer, camera) => {
      if (!grid) bake();
      camera.getWorldDirection(forward);
      // The map follows the view: it is centred where the lower part of the frame meets the ground, and sized to that distance.
      const height = Math.max(1, camera.position.y - Math.max(0, landHeight(camera.position.x, camera.position.z)));
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
      contactTarget.dispose();
      texture?.dispose();
      discGeometry.dispose();
      discMaterial.dispose();
    },
  };
}
