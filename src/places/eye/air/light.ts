// The sun in the mist. A surface is in the sun or out of it, and the rig's map of the long shadows says which to the metre. Mist is not a
// surface: a bank a kilometre off is lit through its whole depth, by the sun and by the lit mist beside it, and the wall of a shadow in it
// is never seen as a line. So the mist reads its sun from this map: the same shadows, taken at four heights and spread over the ground.
import * as THREE from 'three';
import { LAND } from '../shared/rig';

/** The heights (metres over the water) at which the sun is kept: r, g, b, a of the map. The mist is thin above the last. */
export const MIST_SUN_LEVELS = [2, 10, 24, 56] as const;

const CELLS = 192;
/** How far the light is spread over the ground, metres: wider than the mist bank is deep, so that no wall of shade is left in it. */
const SPREAD = 115;
/** Half the height over which a shadow's top fades in the mist. */
const FADE = 7;

const smooth = (lo: number, hi: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

function spread(data: Float32Array, n: number, cells: number): Float32Array {
  const reach = Math.ceil(cells * 3);
  const weights: number[] = [];
  let total = 0;
  for (let k = -reach; k <= reach; k++) {
    const w = Math.exp(-0.5 * (k / cells) ** 2);
    weights.push(w);
    total += w;
  }
  const pass = (from: Float32Array, dx: number, dy: number): Float32Array => {
    const to = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let k = -reach; k <= reach; k++) {
          const x = Math.min(n - 1, Math.max(0, i + k * dx));
          const y = Math.min(n - 1, Math.max(0, j + k * dy));
          sum += (from[y * n + x] as number) * (weights[k + reach] as number);
        }
        to[j * n + i] = sum / total;
      }
    }
    return to;
  };
  return pass(pass(data, 1, 0), 0, 1);
}

/** `sunlit` is the rig's: true where a point at that height stands in the sun. Laid over the same ground as the rig's map of the land. */
export function mistSunTexture(sunlit: (x: number, y: number, z: number) => boolean): THREE.DataTexture {
  const n = CELLS;
  const cx = (LAND.maxX - LAND.minX) / n;
  const cz = (LAND.maxZ - LAND.minZ) / n;
  // The top of the shade over each cell, found from the rig's own answer.
  const top = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = LAND.minX + (i + 0.5) * cx;
      const z = LAND.minZ + (j + 0.5) * cz;
      let lo = -60;
      let hi = 420;
      for (let k = 0; k < 13; k++) {
        const mid = 0.5 * (lo + hi);
        if (sunlit(x, mid, z)) hi = mid;
        else lo = mid;
      }
      top[j * n + i] = 0.5 * (lo + hi);
    }
  }
  const data = new Uint16Array(n * n * 4);
  MIST_SUN_LEVELS.forEach((level, c) => {
    const lit = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) lit[i] = smooth(-FADE, FADE, level - (top[i] as number));
    const soft = spread(lit, n, SPREAD / cx);
    for (let i = 0; i < n * n; i++) data[i * 4 + c] = THREE.DataUtils.toHalfFloat(soft[i] as number);
  });
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

// p in the world. The four heights are joined by straight lines, and above the last the mist keeps the last.
export const MIST_SUN_GLSL = /* glsl */ `
uniform sampler2D tMistSun;
float mistSun(vec3 p) {
  vec4 s = texture2D(tMistSun, (p.xz - uLandRect.xy) * uLandRect.zw);
  float y = max(p.y, 0.0);
  float lit = mix(s.r, s.g, clamp((y - ${MIST_SUN_LEVELS[0].toFixed(1)}) / ${(MIST_SUN_LEVELS[1] - MIST_SUN_LEVELS[0]).toFixed(1)}, 0.0, 1.0));
  lit = mix(lit, s.b, clamp((y - ${MIST_SUN_LEVELS[1].toFixed(1)}) / ${(MIST_SUN_LEVELS[2] - MIST_SUN_LEVELS[1]).toFixed(1)}, 0.0, 1.0));
  return mix(lit, s.a, clamp((y - ${MIST_SUN_LEVELS[2].toFixed(1)}) / ${(MIST_SUN_LEVELS[3] - MIST_SUN_LEVELS[2]).toFixed(1)}, 0.0, 1.0));
}`;
