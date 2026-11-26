// The drinkers: tall lean grazers at the water. Each is one skin, taken from a picture of the whole animal (four sheets: neck down, neck up,
// seen from behind, a calf) and stood as a card in the place, lit by the place's own light from the relief of the sheet.
// A card is honest only from the side it was made from and at a distance: the herd stands off, backlit, cut by the water and its own rings,
// and the shots that came close have been restaged further off (the mats, the shore and the last shot).
import * as THREE from 'three';
import { DEG, shoreOf } from '../layout';
import { landHeight } from '../land/height';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { herd, type Drinker } from './herd';

export const PARTS: readonly string[] = ['drinkers'];

interface Sheet {
  file: string;
  /** Pixels of the sheet. */
  size: [number, number];
  /** Where the feet stand and where the top of the back is, as v from the top of the sheet; the middle of the body as u. */
  feet: number;
  back: number;
  middle: number;
  /** Metres from the feet to the back at size 1. */
  tall: number;
  /** 1 if the sheet's animal faces the right of the picture, -1 if the left, 0 if it is seen from behind. */
  faces: number;
  /** The root of the neck (u, v from the top) and the way the weight of the neck comes on, in u (side sheets) or v (from behind). */
  pivot: [number, number];
  from: number;
  to: number;
  /** Where its mouth is when it drinks, in metres ahead of its middle. */
  reach: number;
}

const SHEETS: Record<'down' | 'up' | 'back' | 'calf', Sheet> = {
  down: { file: 'mat/drinker-down', size: [1536, 1024], feet: 0.931, back: 0.105, middle: 0.36, tall: 2.4, faces: 1, pivot: [0.63, 0.3], from: 0.62, to: 0.76, reach: 2.25 },
  up: { file: 'mat/drinker-up', size: [1448, 1086], feet: 0.962, back: 0.24, middle: 0.62, tall: 2.4, faces: -1, pivot: [0.36, 0.33], from: 0.4, to: 0.28, reach: 0 },
  back: { file: 'mat/drinker-back', size: [1024, 1536], feet: 0.965, back: 0.35, middle: 0.5, tall: 2.45, faces: 0, pivot: [0.5, 0.37], from: 0.4, to: 0.3, reach: 0 },
  calf: { file: 'mat/calf', size: [1448, 1086], feet: 0.897, back: 0.093, middle: 0.4, tall: 1.3, faces: 1, pivot: [0.66, 0.3], from: 0.64, to: 0.78, reach: 1.15 },
};

const VERTEX = /* glsl */ `
attribute vec4 aStand;
attribute vec4 aPose;
uniform vec4 uSheet;
uniform vec4 uNeck;
uniform vec2 uMetres;
varying vec3 vWorld;
varying vec2 vUv;
varying vec3 vAxis;
varying vec3 vFace;
varying float vFeet;
void main() {
  // position.xy runs 0 to 1 over the sheet, y up. aStand: x, ground level, z, bearing it faces (radians). aPose: size, angle of the neck, lean, flip.
  vec2 q = vec2(position.x - uSheet.z, uSheet.x - (1.0 - position.y)) * uMetres;
  // The neck turns about its root: the further out along it, the more.
  float along = uSheet.w > 0.5 ? position.x : 1.0 - position.y;
  float w = smoothstep(uNeck.z, uNeck.w, along);
  vec2 pivot = vec2(uNeck.x - uSheet.z, uSheet.x - uNeck.y) * uMetres;
  vec2 d = q - pivot;
  if (uSheet.y == 0.0) {
    // Seen from behind, a neck that leans out over the water is seen short.
    float up = max(d.y, 0.0);
    q.y = pivot.y + min(d.y, 0.0) + up * (1.0 - aPose.y);
    q.x += aPose.z * 14.0 * up * up;
  } else {
    float a = aPose.y * w;
    q = pivot + vec2(d.x * cos(a) - d.y * sin(a), d.x * sin(a) + d.y * cos(a));
  }
  // Its weight goes from side to side over feet that stay where they are.
  q.x += aPose.z * q.y;
  q *= aPose.x;
  vec3 axis;
  if (uSheet.y == 0.0) {
    // Seen from behind: the card is turned to whoever looks, round the upright.
    vec2 to = normalize(cameraPosition.xz - aStand.xz + vec2(1e-4, 0.0));
    axis = vec3(to.y, 0.0, -to.x);
  } else {
    axis = vec3(sin(aStand.w), 0.0, -cos(aStand.w)) * uSheet.y * aPose.w;
  }
  vec3 world = vec3(aStand.x, aStand.y, aStand.z) + axis * q.x + vec3(0.0, q.y, 0.0);
  vWorld = world;
  vUv = vec2(position.x, position.y);
  vAxis = axis;
  vec3 face = cross(axis, vec3(0.0, 1.0, 0.0));
  vFace = dot(face, cameraPosition - world) < 0.0 ? -face : face;
  vFeet = aStand.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const CUT = /* glsl */ `
uniform sampler2D tRelief;
varying vec2 vUv;
float coverAt(vec2 uv) {
  return texture2D(tRelief, uv, -2.5).r;
}`;

const DEPTH = /* glsl */ `
${CUT}
void main() {
  if (coverAt(vUv) < 0.16) discard;
  gl_FragColor = vec4(0.0);
}`;

const FRAGMENT = /* glsl */ `
uniform sampler2D tSkin;
uniform vec2 uTexel;
varying vec3 vWorld;
varying vec3 vAxis;
varying vec3 vFace;
varying float vFeet;
${CUT}
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  float h = coverAt(vUv);
  if (h < 0.16) discard;
  vec3 skin = texture2D(tSkin, vUv, -2.5).rgb;
  // The form of the body, from the relief read soft: it turns away toward every outline.
  vec2 e = uTexel * 12.0;
  float hx = texture2D(tRelief, vUv + vec2(e.x, 0.0), 4.0).r - texture2D(tRelief, vUv - vec2(e.x, 0.0), 4.0).r;
  float hy = texture2D(tRelief, vUv + vec2(0.0, e.y), 4.0).r - texture2D(tRelief, vUv - vec2(0.0, e.y), 4.0).r;
  float soft = texture2D(tRelief, vUv, 3.0).r;
  vec3 axis = normalize(vAxis);
  vec3 face = normalize(vFace);
  vec3 n = normalize(face * 0.42 - axis * hx * 1.0 - vec3(0.0, 1.0, 0.0) * hy * 1.0);
  vec3 v = normalize(cameraPosition - vWorld);
  // Wet and dark below, where it has stood in the lake; dry and dusty above.
  float above = vWorld.y - max(vFeet, 0.0);
  float wet = smoothstep(0.6, 0.15, above + 0.25 * vnoise(vWorld.xy * 3.0 + vWorld.z));
  vec3 albedo = min(mix(skin, vec3(dot(skin, vec3(0.3, 0.5, 0.2))), 0.25) * vec3(1.3, 1.34, 1.38), 0.95) * mix(1.0, 0.5, wet);
  float occ = 0.5 + 0.5 * smoothstep(0.15, 0.75, soft);
  vec3 c = rigShade(vec3(vWorld.x, vWorld.y + 3.2, vWorld.z), n, v, albedo, mix(0.9, 0.55, wet), occ * mix(0.7, 1.0, smoothstep(0.0, 1.2, above)));
  // The pale gravel and the water under it throw the sky back up at it.
  c += albedo * skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.16 * skyOpen(vWorld) / 3.14159);
  // The low sun in the short hair along every outline that is turned to it.
  float rim = smoothstep(0.5, 0.12, soft) * max(dot(n, uSunDir) + 0.35, 0.0);
  c += skin * uSunColour * (0.11 * rim * sunAt(vWorld));
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const COLS = 28;
const ROWS = 20;

function cardGeometry(): THREE.InstancedBufferGeometry {
  const position = new Float32Array((COLS + 1) * (ROWS + 1) * 3);
  for (let j = 0; j <= ROWS; j++) {
    for (let i = 0; i <= COLS; i++) {
      const o = (j * (COLS + 1) + i) * 3;
      position[o] = i / COLS;
      position[o + 1] = j / ROWS;
    }
  }
  const index: number[] = [];
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const a = j * (COLS + 1) + i;
      index.push(a, a + 1, a + COLS + 1, a + 1, a + COLS + 2, a + COLS + 1);
    }
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setIndex(index);
  return g;
}

interface Group {
  sheet: Sheet;
  members: { animal: Drinker; index: number }[];
  stand: THREE.InstancedBufferAttribute;
  pose: THREE.InstancedBufferAttribute;
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
}

export function create(ctx: Context): Piece {
  const animals = herd(ctx.rng('drinkers'), ctx.events.rise - 1.7);
  const groups: Group[] = [];
  for (const name of ['down', 'up', 'back', 'calf'] as const) {
    const sheet = SHEETS[name];
    const members = animals.map((animal, index) => ({ animal, index })).filter((m) => m.animal.sheet === name);
    if (members.length === 0) continue;
    const geometry = cardGeometry();
    const stand = new THREE.InstancedBufferAttribute(new Float32Array(members.length * 4), 4);
    const pose = new THREE.InstancedBufferAttribute(new Float32Array(members.length * 4), 4);
    stand.setUsage(THREE.DynamicDrawUsage);
    pose.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aStand', stand);
    geometry.setAttribute('aPose', pose);
    geometry.instanceCount = members.length;
    const perPixel = sheet.tall / ((sheet.feet - sheet.back) * sheet.size[1]);
    const side = sheet.faces !== 0;
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...ctx.rig.uniforms,
        tSkin: { value: ctx.assets.texture(`${sheet.file}.jpg`, { repeat: false, anisotropy: 4 }) },
        tRelief: { value: ctx.assets.texture(`${sheet.file}-h.png`, { kind: 'data', repeat: false }) },
        uTexel: { value: new THREE.Vector2(1 / sheet.size[0], 1 / sheet.size[1]) },
        uSheet: { value: new THREE.Vector4(sheet.feet, sheet.faces, sheet.middle, side ? 1 : 0) },
        uNeck: { value: new THREE.Vector4(sheet.pivot[0], sheet.pivot[1], sheet.from, sheet.to) },
        uMetres: { value: new THREE.Vector2(sheet.size[0] * perPixel, sheet.size[1] * perPixel) },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: THREE.DoubleSide,
    });
    material.userData.depthFragment = DEPTH;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    ctx.scene.add(mesh);
    ctx.reflected.push(mesh);
    groups.push({ sheet, members, stand, pose, mesh, material });
  }
  ctx.parts.built('drinkers', (groups[0] as Group).mesh, ...groups.slice(1).map((g) => g.mesh));
  const shade = ctx.rig.contactDiscs(animals.length);
  for (let i = 0; i < 22; i++) ctx.laps.push({ x: 0, z: 0, strength: 0, offset: i * 0.37 });
  const sun = ctx.rig.sun;

  return {
    setTime: (t) => {
      let lap = 0;
      const ring = (x: number, z: number, strength: number): void => {
        const slot = ctx.laps[lap];
        if (!slot || strength <= 0) return;
        slot.x = x;
        slot.z = z;
        slot.strength = strength;
        lap++;
      };
      for (const g of groups) {
        g.members.forEach(({ animal: d, index: i }, k) => {
          const size = d.size;
          const ground = d.level ?? Math.max(-0.5, landHeight(d.x, d.z));
          const down = Math.min(1, Math.max(0, d.down(t)));
          // A sheet with its neck down lifts its head by turning the neck about its root; one with its neck up only looks about.
          const drinks = g.sheet.reach > 0;
          const neck = g.sheet.faces === 0 ? 0.38 + 0.3 * down : drinks ? (1 - down) * 1.25 * g.sheet.faces + 0.012 * Math.sin(t * 1.9 + i * 2.3) : 0.05 * Math.sin(t * 0.43 + i * 2.1) + 0.03 * Math.sin(t * 1.1 + i * 0.7) + 0.16 * (1 - down - 0.7);
          const lean = 0.012 * Math.sin(t * 0.83 + i * 1.7) + 0.006 * Math.sin(t * 0.31 + i * 0.9);
          g.stand.setXYZW(k, d.x, ground - 0.03 * size, d.z, d.facing * DEG);
          g.pose.setXYZW(k, size, neck, lean, d.flip);
          const long = 2.6;
          const off = size * 1.5 * (long - 1) * 0.5;
          ctx.rig.setDisc(shade, i, d.x - sun.direction.x * off, d.z - sun.direction.z * off, size * 1.2, d.level === undefined ? 0.5 : 0, long, sun.shadowYaw);
          // Rings where its mouth is in the water and round its legs, for the ones the shots are about.
          if (drinks) {
            const reach = g.sheet.reach * size * d.flip;
            const mx = d.x + Math.sin(d.facing * DEG) * reach;
            const mz = d.z - Math.cos(d.facing * DEG) * reach;
            const wet = Math.hypot(mx, mz) < shoreOf(mx, mz) - 0.2;
            if (wet && (d.close || down > 0.9)) ring(mx, mz, Math.min(1, Math.max(0, (down - 0.82) / 0.12)));
          }
          if (d.close && ground < -0.03) ring(d.x, d.z, 0.35 + 0.2 * Math.sin(t * 0.83 + i * 1.7));
        });
        g.stand.needsUpdate = true;
        g.pose.needsUpdate = true;
      }
      for (; lap < ctx.laps.length; lap++) {
        const slot = ctx.laps[lap];
        if (slot) slot.strength = 0;
      }
    },
    dispose: () => {
      for (const g of groups) {
        g.mesh.geometry.dispose();
        g.material.dispose();
      }
    },
  };
}
