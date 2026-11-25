// The light rig of the Heart: the uniforms every surface shares, the map of the lake's glow, the map of contact shade,
// the baked land, and the drift of the crust. Owned by the root. Folders read it and never change it, except through the calls below.
import * as THREE from 'three';
import { MOUTH, ground, smooth } from '../layout';

export const GLOW = { minX: -600, maxX: 1320, minZ: -480, maxZ: 560, width: 1536, height: 832 };
export const LAND = { minX: -1300, maxX: 1500, minZ: -640, maxZ: 760, width: 1024, height: 512 };
export const LAND_FINE = { minX: -700, maxX: -380, minZ: 60, maxZ: 380, width: 512, height: 512 };
export const CONTACT = { size: 1024, minRadius: 30, maxRadius: 220 };
export const FLOW = { foot: [MOUTH.x - 6, -326] as [number, number], speed: 0.28, toward: [0.94, 0.34] as [number, number] };
export const MAX_EMITTERS = 8;

export type Height = (x: number, z: number) => number;

interface Grid {
  spec: typeof LAND;
  height: Float32Array;
  open: Float32Array;
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
function skyOpen(height: Float32Array, spec: typeof LAND, step: number): Float32Array {
  const w = Math.ceil(spec.width / step);
  const h = Math.ceil(spec.height / step);
  const cx = (spec.maxX - spec.minX) / spec.width;
  const cz = (spec.maxZ - spec.minZ) / spec.height;
  const low = new Float32Array(w * h);
  const DIRS = 8;
  const REACH = [6, 14, 30, 60, 110, 190, 320, 520, 800];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const x = spec.minX + (i * step + 0.5) * cx;
      const z = spec.minZ + (j * step + 0.5) * cz;
      const y = Math.max(0, sample(height, spec, x, z));
      let sum = 0;
      for (let k = 0; k < DIRS; k++) {
        const a = ((k + 0.5) / DIRS) * Math.PI * 2;
        const ax = Math.cos(a);
        const az = Math.sin(a);
        let slope = 0;
        for (const r of REACH) {
          const rise = (sample(height, spec, x + ax * r, z + az * r) - y) / r;
          if (rise > slope) slope = rise;
        }
        sum += 1 - slope / Math.hypot(1, slope);
      }
      low[j * w + i] = sum / DIRS;
    }
  }
  const lowSpec = { ...spec, width: w, height: h };
  const out = new Float32Array(spec.width * spec.height);
  for (let j = 0; j < spec.height; j++) {
    for (let i = 0; i < spec.width; i++) out[j * spec.width + i] = sample(low, lowSpec, spec.minX + (i + 0.5) * cx, spec.minZ + (j + 0.5) * cz);
  }
  return out;
}

function bakeGrid(spec: typeof LAND, height: Height, openFrom: Grid | null): Grid {
  const { width: w, height: h } = spec;
  const cx = (spec.maxX - spec.minX) / w;
  const cz = (spec.maxZ - spec.minZ) / h;
  const heights = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) heights[j * w + i] = height(spec.minX + (i + 0.5) * cx, spec.minZ + (j + 0.5) * cz);
  let open: Float32Array;
  if (openFrom) {
    open = new Float32Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) open[j * w + i] = sample(openFrom.open, openFrom.spec, spec.minX + (i + 0.5) * cx, spec.minZ + (j + 0.5) * cz);
  } else open = skyOpen(heights, spec, 2);
  return { spec, height: heights, open, shore: shoreDistance(heights, spec) };
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
  float a = vStrength * (1.0 - smoothstep(0.15, 1.0, r));
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

  const emitters: Emitter[] = [];
  const emitterPlaces = Array.from({ length: MAX_EMITTERS }, () => new THREE.Vector4(0, -1000, 0, 0));
  const emitterRadiance = Array.from({ length: MAX_EMITTERS }, () => new THREE.Vector3());

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
    // The dusk sky, measured against the approved wide view: its sky reads 0.22, 0.25, 0.35 at 13 degrees up, and bare rock under it about 0.015.
    uSkyZenith: { value: new THREE.Vector3(0.09, 0.118, 0.2) },
    uSkyHorizon: { value: new THREE.Vector3(0.175, 0.21, 0.33) },
    uSkyGround: { value: new THREE.Vector3(0.034, 0.036, 0.045) },
    uCast: { value: 0.75 },
    uFill: { value: new THREE.Vector3(0.78, 0.64, 0.4) },
    uWarmDir: { value: new THREE.Vector3(0.86, 0.22, -0.46).normalize() },
    uWarmColour: { value: new THREE.Vector3(0.03, 0.0135, 0.006) },
    uEmitterCount: { value: 0 },
    uEmitters: { value: emitterPlaces },
    uEmitterRadiance: { value: emitterRadiance },
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
    },
    beforeSample: (renderer, camera) => {
      if (!coarse) bake();
      const count = Math.min(MAX_EMITTERS, emitters.length);
      for (let i = 0; i < count; i++) {
        const e = emitters[i] as Emitter;
        (emitterPlaces[i] as THREE.Vector4).set(e.position.x, e.position.y, e.position.z, e.radius);
        (emitterRadiance[i] as THREE.Vector3).copy(e.radiance);
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
      const pitch = Math.max(Math.asin(Math.min(1, Math.max(-1, -forward.y))), 0.026);
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
