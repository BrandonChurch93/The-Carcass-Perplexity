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

function bakeGrid(spec: typeof LAND, height: Height, cover: Height | null): Grid {
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
  const under = new Float32Array(w * h).fill(-Infinity);
  // The shade is carried from cell to cell away from the sun: a cell is in the shade of the cell next to it toward the sun, or of whatever
  // that cell is in the shade of, lowered by the fall of the light over the way between them. Every crest is met, whatever its distance,
  // so the edge of a long shadow has no steps; a march with far steps met a far crest in one cell and missed it in the next.
  const alongX = Math.abs(hx) * cz >= Math.abs(hz) * cx;
  const lines = alongX ? w : h;
  const across = alongX ? h : w;
  const toward = (alongX ? hx : hz) > 0 ? 1 : -1;
  const way = alongX ? cx / Math.abs(hx) : cz / Math.abs(hz);
  const slip = alongX ? (hz * way) / cz : (hx * way) / cx;
  const cell = (line: number, k: number): number => (alongX ? k * w + line : line * w + k);
  // How far the shade at a cell has been thrown, in metres.
  const thrown = new Float32Array(w * h);
  for (let n = 0; n < lines; n++) {
    const line = toward > 0 ? lines - 1 - n : n;
    for (let k = 0; k < across; k++) {
      if (n === 0) {
        shade[cell(line, k)] = Math.max(-50, (heights[cell(line, k)] as number) - 5 * fall);
        continue;
      }
      const f = Math.min(across - 1, Math.max(0, k + slip));
      const k0 = Math.min(across - 2, Math.floor(f));
      const a0 = cell(line + toward, k0);
      const a1 = cell(line + toward, k0 + 1);
      const own0 = (heights[a0] as number) >= (shade[a0] as number);
      const own1 = (heights[a1] as number) >= (shade[a1] as number);
      const v0 = own0 ? (heights[a0] as number) : (shade[a0] as number);
      const v1 = own1 ? (heights[a1] as number) : (shade[a1] as number);
      const t0 = own0 ? 0 : (thrown[a0] as number);
      const t1 = own1 ? 0 : (thrown[a1] as number);
      shade[cell(line, k)] = Math.max(-50, v0 + (v1 - v0) * (f - k0) - fall * way);
      thrown[cell(line, k)] = t0 + (t1 - t0) * (f - k0) + way;
    }
  }
  // The edge of a long shadow on the ground is as soft as the shadow is thrown far: the shade deepens inward from its edge over a width that
  // grows with the way it has come, so no shadow from the far rim ends in a line. The way to the edge is measured in two passes over the grid.
  const inward = new Float32Array(w * h);
  const lit = (c: number): boolean => (shade[c] as number) <= Math.max(heights[c] as number, 0);
  const diag = Math.hypot(cx, cz);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const c = j * w + i;
      let d = lit(c) ? 0 : 1e9;
      if (d > 0) {
        if (i > 0) d = Math.min(d, (inward[c - 1] as number) + cx);
        if (j > 0) d = Math.min(d, (inward[c - w] as number) + cz);
        if (i > 0 && j > 0) d = Math.min(d, (inward[c - w - 1] as number) + diag);
        if (i < w - 1 && j > 0) d = Math.min(d, (inward[c - w + 1] as number) + diag);
      }
      inward[c] = d;
    }
  }
  for (let j = h - 1; j >= 0; j--) {
    for (let i = w - 1; i >= 0; i--) {
      const c = j * w + i;
      let d = inward[c] as number;
      if (d > 0) {
        if (i < w - 1) d = Math.min(d, (inward[c + 1] as number) + cx);
        if (j < h - 1) d = Math.min(d, (inward[c + w] as number) + cz);
        if (i < w - 1 && j < h - 1) d = Math.min(d, (inward[c + w + 1] as number) + diag);
        if (i > 0 && j < h - 1) d = Math.min(d, (inward[c + w - 1] as number) + diag);
      }
      inward[c] = d;
    }
  }
  for (let c = 0; c < w * h; c++) {
    const d = inward[c] as number;
    if (d <= 0) continue;
    const wide = Math.min(110, Math.max(8, 0.09 * (thrown[c] as number)));
    if (d < wide) shade[c] = Math.min(shade[c] as number, Math.max(heights[c] as number, 0) - 1.6 + (3.2 * d) / wide);
  }
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (!cover) continue;
      const c = cover(spec.minX + (i + 0.5) * cx, spec.minZ + (j + 0.5) * cz);
      if (c > (shade[j * w + i] as number)) {
        under[j * w + i] = c;
        open[j * w + i] = (open[j * w + i] as number) * (1 - 0.55 * Math.min(1, Math.max(0, (c - (heights[j * w + i] as number)) / 40)));
      }
    }
  }
  // The shade of what hangs over the ground has no ruled edge: it deepens over the first hundred and seventy metres in from the edge of the cover,
  // so that seen from above, where the cover itself is not drawn, the shade falls off and is no bound.
  const SOFT = 170;
  const cells = Math.ceil(SOFT / Math.min(cx, cz));
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const c = under[j * w + i] as number;
      if (c === -Infinity) continue;
      let nearest = SOFT;
      for (let dj = -cells; dj <= cells; dj++) {
        const jj = j + dj;
        if (jj < 0 || jj >= h) continue;
        for (let di = -cells; di <= cells; di++) {
          const ii = i + di;
          if (ii < 0 || ii >= w || under[jj * w + ii] !== -Infinity) continue;
          const d = Math.hypot(di * cx, dj * cz);
          if (d < nearest) nearest = d;
        }
      }
      const ground = Math.max(heights[j * w + i] as number, 0);
      const soft = nearest >= SOFT ? c : Math.min(c, ground - 1.6 + (3.2 * nearest) / SOFT + Math.max(0, nearest - 0.8 * SOFT) * 2);
      if (soft > (shade[j * w + i] as number)) shade[j * w + i] = soft;
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
  /** `cover` is the height below which something that is not ground (the brow) hides the sun and part of the sky at that point. */
  setLand(height: Height, cover?: Height): void;
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

/** The film's tone curve, backward: for the level a picture shows (to the power 1 / 2.2), the radiance the film would have to be given to show it. */
function ungradeTexture(): THREE.DataTexture {
  const curve = (x: number): number => {
    const x2 = x * x;
    const x4 = x2 * x2;
    return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
  };
  const N = 256;
  const data = new Uint16Array(N * 4);
  let u = 0;
  for (let i = 0; i < N; i++) {
    const want = Math.min(0.975, i / (N - 1));
    while (u < 1 && curve(u) < want) u += 1 / 8192;
    const v = THREE.DataUtils.toHalfFloat(2 ** (u * 16.5 - 12.47393));
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = THREE.DataUtils.toHalfFloat(1);
  }
  const t = new THREE.DataTexture(data, N, 1, THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
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
  const contactScene = new THREE.Scene();

  let landHeight: Height = layoutHeight;
  let landCover: Height | null = null;
  let grid: Grid | null = null;
  let texture: THREE.DataTexture | null = null;

  const sunDirection = new THREE.Vector3(...SUN_DIR);
  // The glow of the low sky stands to the north of the sun, where the establishing picture has it: on the left of a camera that looks north.
  const glowBearing = (324 * Math.PI) / 180;
  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uSolo: { value: 0 },
    tLand: { value: null },
    uLandRect: { value: new THREE.Vector4(LAND.minX, LAND.minZ, 1 / (LAND.maxX - LAND.minX), 1 / (LAND.maxZ - LAND.minZ)) },
    tContact: { value: contactTarget.texture },
    uContactRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    uSkyZenith: { value: new THREE.Vector3(0.1, 0.18, 0.36) },
    uSkyHorizon: { value: new THREE.Vector3(0.52, 0.52, 0.56) },
    uSkyGround: { value: new THREE.Vector3(0.1, 0.09, 0.085) },
    uSunDir: { value: sunDirection },
    uSunColour: { value: new THREE.Vector3(9.0, 4.3, 1.5) },
    uGlowDir: { value: new THREE.Vector3(Math.sin(glowBearing), 0, -Math.cos(glowBearing)) },
    uGlowColour: { value: new THREE.Vector3(3.2, 1.9, 0.8) },
    uFill: { value: new THREE.Vector3(0.58, 0.66, 0.82) },
    // The far world: one picture of the rim and the sky beyond the lake, hung on a cylinder round the camera of the shot it belongs to.
    // The air folder sets it by shot. uPlateAt: the middle of the cylinder (y is the level of the picture's horizon) and its radius.
    // uPlateLens: the bearing of the picture's middle (radians), tan of half its field across, tan of half its field up, v of its horizon row.
    // uPlateTone: gain on the picture, and in w whether a picture is hung at all.
    tPlate: { value: null },
    tUngrade: { value: ungradeTexture() },
    uPlateAt: { value: new THREE.Vector4(0, 0, 0, 1800) },
    uPlateLens: { value: new THREE.Vector4(0, 0.65, 0.364, 0.5) },
    uPlateTone: { value: new THREE.Vector4(1, 1, 1, 0) },
    // While a picture is hung: the built land is drawn only within this many metres (z) of this point (xy are x and z); beyond it the picture is the land.
    uNear: { value: new THREE.Vector4(0, 0, 400, 0) },
    // The evening shade over the south shore: unit way it deepens (x, z), metres along it where it starts, climb of its top per metre.
    uPlateShade: { value: new THREE.Vector2(0, 0.2) },
    uPlateAir: { value: new THREE.Vector4(1, 0.3, 0, 0.1) },
    uPlateSoft: { value: 0 },
    uPlateDraw: { value: 1 },
    uCirrusA: { value: new THREE.Vector4(0, 0, 0.1, 0) },
    uCirrusB: { value: new THREE.Vector4(0, 0, 0.1, 0) },
    uCirrus: { value: new THREE.Vector2(0, 0) },
    uShade: { value: new THREE.Vector4(Math.sin((198 * Math.PI) / 180), -Math.cos((198 * Math.PI) / 180), 588, 0.55) },
    // The mist: the air folder makes its noise and sets its form by shot. See glsl.ts.
    tMistNoise: { value: null },
    uMistA: { value: new THREE.Vector4() },
    uMistB: { value: new THREE.Vector4() },
    uMistC: { value: new THREE.Vector4() },
    uMistD: { value: new THREE.Vector4() },
    uMistTone: { value: 1 },
    uMistOn: { value: 0 },
  };

  const bake = (): void => {
    grid = bakeGrid(LAND, landHeight, landCover);
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
    setLand: (height, cover) => {
      landHeight = height;
      landCover = cover ?? null;
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
      // An eye on the rim looks down on the shore: its height is taken over the water there, not over the ledge it stands on.
      const high = camera.position.y > 20;
      const height = high ? camera.position.y : Math.max(1, camera.position.y - Math.max(0, landHeight(camera.position.x, camera.position.z)));
      const half = Math.atan(1 / (camera.projectionMatrix.elements[5] as number));
      const long = smooth(0.26, 0.16, half);
      const pitch = Math.max(Math.asin(Math.min(1, Math.max(-1, -forward.y))) + (long * half) / 3, 0.026);
      const reach = Math.min(900, height / Math.tan(pitch));
      const radius = Math.min(CONTACT.maxRadius, Math.max(CONTACT.minRadius, reach * 0.6));
      const ahead = Math.max(reach * (high ? 0.45 : 0.75), radius * 0.72);
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
