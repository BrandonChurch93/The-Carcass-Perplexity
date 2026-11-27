// The drinkers as cards: each is one skin, taken from a picture of the whole animal (four sheets: neck down, neck up, seen from behind, a calf)
// and stood as a card in the place, lit by the place's own light from the relief of the sheet.
// They stand wherever the bodies of index.ts do not yet: everywhere but the four of the shore shot while that shot runs.
import * as THREE from 'three';
import { DEG, shoreOf, smooth } from '../layout';
import { landHeight } from '../land/height';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { during } from '../shared/anchors';
import { herd, type Drinker } from './cardsHerd';

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

const SHEETS: Record<'down' | 'up' | 'back' | 'calf' | 'quarter', Sheet> = {
  down: { file: 'mat/drinker-down', size: [1536, 1024], feet: 0.931, back: 0.105, middle: 0.36, tall: 2.4, faces: 1, pivot: [0.63, 0.3], from: 0.62, to: 0.76, reach: 2.25 },
  up: { file: 'mat/drinker-up', size: [1448, 1086], feet: 0.962, back: 0.24, middle: 0.62, tall: 2.4, faces: -1, pivot: [0.36, 0.33], from: 0.4, to: 0.28, reach: 0 },
  back: { file: 'mat/drinker-back', size: [1024, 1536], feet: 0.965, back: 0.35, middle: 0.5, tall: 2.45, faces: 0, pivot: [0.5, 0.37], from: 0.4, to: 0.3, reach: 0 },
  quarter: { file: 'mat/drinker-quarter', size: [1024, 1536], feet: 0.975, back: 0.4, middle: 0.47, tall: 2.45, faces: 0, pivot: [0.66, 0.28], from: 0.3, to: 0.18, reach: 0 },
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
varying float vOwn;
varying float vSize;
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
    q.x += aPose.z * 4.0 * up * up;
  } else {
    float a = aPose.y * w;
    q = pivot + vec2(d.x * cos(a) - d.y * sin(a), d.x * sin(a) + d.y * cos(a));
  }
  // Its weight goes from side to side over feet that stay where they are.
  q.x += aPose.z * q.y;
  // Now and then it shifts a leg: the hind pair goes back a little and the fore pair forward, and the feet come up as they go.
  float pace = abs(aPose.w) - 1.0;
  if (uSheet.y != 0.0) {
    float hind = step((position.x - uSheet.z) * uSheet.y, 0.0);
    float leg = smoothstep(1.15, 0.1, q.y);
    q.x += uSheet.y * leg * mix(0.55, -1.0, hind) * pace;
    q.y += leg * 2.4 * pace * (1.0 - pace / 0.17) * hind;
  }
  q *= aPose.x;
  vec3 axis;
  if (uSheet.y == 0.0) {
    // Seen from behind: the card is turned to whoever looks, round the upright.
    vec2 to = normalize(cameraPosition.xz - aStand.xz + vec2(1e-4, 0.0));
    axis = vec3(to.y, 0.0, -to.x);
  } else {
    axis = vec3(sin(aStand.w), 0.0, -cos(aStand.w)) * uSheet.y * sign(aPose.w);
  }
  vec3 world = vec3(aStand.x, aStand.y, aStand.z) + axis * q.x + vec3(0.0, q.y, 0.0);
  vWorld = world;
  vUv = vec2(position.x, position.y);
  vAxis = axis;
  vec3 face = cross(axis, vec3(0.0, 1.0, 0.0));
  vFace = dot(face, cameraPosition - world) < 0.0 ? -face : face;
  vFeet = aStand.y;
  vSize = max(aPose.x, 0.01);
  vOwn = fract(sin(dot(aStand.xz, vec2(12.9898, 78.233))) * 43758.5453);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const CUT = /* glsl */ `
uniform sampler2D tRelief;
uniform vec2 uTexel;
varying vec2 vUv;
// Every read of a sheet names its level. The level is taken once, at the top of main, above the first branch: a read that leaves the level to
// the renderer below a discard or a branch does not come out the same twice.
float levelOf(vec2 uv) {
  return log2(max(max(length(dFdx(uv) / uTexel), length(dFdy(uv) / uTexel)), 1e-6));
}
float coverAt(vec2 uv, float level) {
  return textureLod(tRelief, uv, max(level - 2.5, 0.0)).r;
}`;

const DEPTH = /* glsl */ `
${CUT}
void main() {
  float level = levelOf(vUv);
  if (coverAt(vUv, level) < 0.16) discard;
  gl_FragColor = vec4(0.0);
}`;

const FRAGMENT = /* glsl */ `
uniform sampler2D tSkin;
uniform vec4 uSheet;
varying vec3 vWorld;
varying vec3 vAxis;
varying vec3 vFace;
varying float vFeet;
varying float vOwn;
varying float vSize;
${CUT}
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  float level = levelOf(vUv);
  float h = coverAt(vUv, level);
  if (h < 0.16) discard;
  vec3 skin = textureLod(tSkin, vUv, max(level + -2.5, 0.0)).rgb;
  // The form of the body, from the relief read soft: it turns away toward every outline.
  // Seen from behind and close, only the great forms are read: the barrel, the hips, the root of the neck.
  float broad = uSheet.y == 0.0 ? 1.0 : 0.0;
  vec2 e = uTexel * mix(12.0, 44.0, broad);
  float lod = mix(4.0, 6.0, broad);
  float hx = (textureLod(tRelief, vUv + vec2(e.x, 0.0), max(level + lod, 0.0)).r - textureLod(tRelief, vUv - vec2(e.x, 0.0), max(level + lod, 0.0)).r) * mix(1.0, 0.5, broad);
  float hy = (textureLod(tRelief, vUv + vec2(0.0, e.y), max(level + lod, 0.0)).r - textureLod(tRelief, vUv - vec2(0.0, e.y), max(level + lod, 0.0)).r) * mix(1.0, 0.5, broad);
  float soft = textureLod(tRelief, vUv, max(level + 3.0, 0.0)).r;
  vec3 axis = normalize(vAxis);
  vec3 face = normalize(vFace);
  // The hide over the form, from the relief read sharp: the ribs, the points of the hip and the shoulder, the folds at the neck and the knee,
  // and the lie of the short coat. Each fold is dark in its hollow.
  vec2 e2 = uTexel * 2.0;
  float fx = textureLod(tRelief, vUv + vec2(e2.x, 0.0), max(level + 0.5, 0.0)).r - textureLod(tRelief, vUv - vec2(e2.x, 0.0), max(level + 0.5, 0.0)).r;
  float fy = textureLod(tRelief, vUv + vec2(0.0, e2.y), max(level + 0.5, 0.0)).r - textureLod(tRelief, vUv - vec2(0.0, e2.y), max(level + 0.5, 0.0)).r;
  // A back seen close from behind is a short coat lying smooth over the spine and the hips: its folds are faint.
  float creased = uSheet.y == 0.0 ? 0.14 : 0.3;
  // The picture's own shading of the ribs is not the hide's colour: half of it is taken out, and each animal has a coat of its own tone, with dust and marks in it.
  skin = mix(skin, textureLod(tSkin, vUv, max(level + 4.5, 0.0)).rgb, uSheet.y == 0.0 ? 0.2 : 0.55);
  float coat = 0.6 * vnoise(vUv * vec2(9.0, 6.0) + vOwn * 40.0) + 0.4 * vnoise(vUv * vec2(70.0, 34.0) + vOwn * 17.0);

  // What the picture holds of its own light, the dark of a hollow or a mark on the coat, is not the hide's: seen from behind the hide is one pale cream, as the bodies of the other shots are.
  if (uSheet.y == 0.0) {
    skin = mix(skin, vec3(0.7, 0.63, 0.52) * (0.8 + 0.4 * dot(skin, vec3(0.3, 0.5, 0.2)) / 0.38), 0.62);
    // Dust lies in the coat.
    skin *= 0.86 + 0.28 * vnoise(vUv * vec2(520.0, 800.0));
    // A short pale coat, mottled, lying in whorls; dark along the spine, whose bumps stand under it.
    float mottle = 0.5 * vnoise(vUv * vec2(26.0, 38.0) + vOwn * 30.0) + 0.3 * vnoise(vUv * vec2(90.0, 130.0)) + 0.2 * vnoise(vUv * vec2(330.0, 520.0));
    skin *= 0.84 + 0.32 * mottle;
    float spine = smoothstep(0.022, 0.004, abs(vUv.x - uSheet.z - 0.01 * sin(vUv.y * 9.0))) * smoothstep(0.0, 0.3, vUv.y);
    skin *= 1.0 - 0.1 * spine * (0.55 + 0.45 * sin(vUv.y * 260.0));
  }
  skin *= mix(vec3(0.78, 0.76, 0.74), vec3(1.12, 1.08, 1.02), vOwn) * (0.84 + 0.32 * coat);
  float fold = clamp(1.0 + 5.0 * creased * (textureLod(tRelief, vUv, max(level + 0.0, 0.0)).r - textureLod(tRelief, vUv, max(level + 2.5, 0.0)).r), 0.45, 1.35);
  vec3 n = normalize(face * 0.42 - axis * (hx + 2.2 * creased * fx) - vec3(0.0, 1.0, 0.0) * (hy + 2.2 * creased * fy));
  vec3 v = normalize(cameraPosition - vWorld);
  // Wet and dark below, where it has stood in the lake; dry and dusty above.
  float above = vWorld.y - max(vFeet, 0.0);
  float wet = smoothstep(0.6, 0.15, above + 0.25 * vnoise(vWorld.xy * 3.0 + vWorld.z));
  vec3 albedo = min(mix(skin, vec3(dot(skin, vec3(0.3, 0.5, 0.2))), mix(0.25, 0.62, step(0.1, uShade.w))) * vec3(1.3, 1.34, 1.38), 0.95) * mix(1.0, 0.5, wet);
  float occ = (0.5 + 0.5 * smoothstep(0.15, 0.75, soft)) * fold;
  // Far off in the shade of the evening the herd is pale: tan going to grey.
  if (uShade.w > 0.1) {
    albedo = mix(albedo, vec3(0.5, 0.445, 0.385), 0.75);
    // The sky lights its back and leaves its belly in its own shade: a small solid thing, told by that alone.
    albedo *= mix(0.6, 1.1, smoothstep(0.5, 0.95, above / (2.4 * vSize)));
  }
  // Its legs are dark with the mud and the water of the shore, to the knee.
  albedo *= mix(0.5, 1.0, smoothstep(0.25, 0.62, above / (1.2 * vSize) + 0.12 * vnoise(vUv * 30.0 + vOwn * 9.0)));
  vec3 c = rigShade(vec3(vWorld.x, vWorld.y + 3.2, vWorld.z), n, v, albedo, mix(0.9, 0.55, wet), occ * mix(0.7, 1.0, smoothstep(0.0, 1.2, above)));
  // The pale gravel and the water under it throw the sky back up at it.
  c += albedo * skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.16 * skyOpen(vWorld) / 3.14159);
  // The low sun in the short hair along every outline that is turned to it.
  float rim = smoothstep(0.5, 0.12, soft) * max(dot(n, uSunDir) + 0.35, 0.0);
  c += skin * uSunColour * (0.11 * rim * sunAt(vWorld));
  // In the shade of the evening the bright sky where the sun went down still warms the side turned to it.
  c += albedo * uSunColour * (0.022 * step(0.1, uShade.w) * max(dot(n, uSunDir) + 0.3, 0.0));
  if (uSheet.y == 0.0) {
    // Seen from behind it stands against the lit wall it watches: that wall's warm light lies along its outline, on the side the sun went down.
    vec3 wallLight = normalize(vec3(-v.x, 0.3, -v.z) - axis * 0.7);
    float edge = smoothstep(0.62, 0.2, soft) * max(dot(n, wallLight) + 0.45, 0.0);
    c += skin * vec3(1.0, 0.66, 0.36) * skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.5 * edge);
  }
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

export interface Cards {
  meshes: THREE.Mesh[];
  /** Sets the cards at t and writes their rings from the first slot on; `bodies` says which of them are drawn as bodies just now and so have no card. Returns the next free slot. */
  setTime: (t: number, bodies: (index: number) => boolean) => number;
  dispose: () => void;
}

export function createCards(ctx: Context): Cards {
  const animals = herd(ctx.rng('drinkers'), ctx.events.rise - 1.7);
  const groups: Group[] = [];
  for (const name of ['down', 'up', 'back', 'calf', 'quarter'] as const) {
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
  const shade = ctx.rig.contactDiscs(animals.length);
  const sun = ctx.rig.sun;

  return {
    meshes: groups.map((g) => g.mesh),
    setTime: (t, bodies) => {
      let lap = 0;
      const ring = (x: number, z: number, strength: number): void => {
        const slot = ctx.laps[lap];
        if (!slot || strength <= 0) return;
        slot.x = x;
        slot.z = z;
        slot.strength = strength;
        lap++;
      };
      const wide = during('eye-01');
      for (const g of groups) {
        g.members.forEach(({ animal: d, index: i }, k) => {
          const size = (d.wideOnly && !wide) || bodies(i) ? 0 : d.size;
          const ground = d.level ?? Math.max(-0.5, landHeight(d.x, d.z));
          const down = Math.min(1, Math.max(0, d.down(t)));
          // A sheet with its neck down lifts its head by turning the neck about its root; one with its neck up only looks about.
          const drinks = g.sheet.reach > 0;
          const neck = g.sheet.faces === 0 ? 0.38 + 0.3 * down : drinks ? (1 - down) * 1.25 * g.sheet.faces + 0.012 * Math.sin(t * 1.9 + i * 2.3) : 0.14 * Math.sin(t * 0.9 + i * 2.1) + 0.05 * Math.sin(t * 2.1 + i * 0.7) + 0.16 * (1 - down - 0.7);
          const lean = 0.03 * Math.sin(t * 0.83 + i * 1.7) + 0.012 * Math.sin(t * 0.31 + i * 0.9);
          g.stand.setXYZW(k, d.x, ground - 0.03 * size, d.z, d.facing * DEG);
          // Every so many seconds it shifts its legs and settles again; each at a time of its own.
          const every = 5.5 + 4 * ((i * 0.618) % 1);
          const u = (((t / every + i * 0.37) % 1) + 1) % 1;
          const pace = 0.17 * smooth(0.0, 0.1, u) * (1 - smooth(0.45, 0.6, u));
          g.pose.setXYZW(k, size, neck, lean, d.flip * (1 + pace));
          const long = wide ? 1.3 : 2.6;
          const off = size * 1.5 * (long - 1) * 0.5;
          ctx.rig.setDisc(shade, i, d.x - sun.direction.x * off, d.z - sun.direction.z * off, size * (wide ? 1.7 : 1.2), d.level === undefined ? (wide ? 1 : 0.7) : 0, long, sun.shadowYaw);
          // Rings where its mouth is in the water and round its legs, for the ones the shots are about.
          if (drinks && size > 0) {
            const reach = g.sheet.reach * size * d.flip;
            const mx = d.x + Math.sin(d.facing * DEG) * reach;
            const mz = d.z - Math.cos(d.facing * DEG) * reach;
            const wet = Math.hypot(mx, mz) < shoreOf(mx, mz) - 0.2;
            if (wet && (d.close || down > 0.9)) ring(mx, mz, 1.3 * Math.min(1, Math.max(0, (down - 0.82) / 0.12)));
          }
          if (d.close && size > 0 && ground < -0.03) {
            // Its fore legs and its hind legs each stand in rings of their own; they come stronger as it shifts its weight.
            const half = 0.52 * size * d.flip;
            const fx = Math.sin(d.facing * DEG) * half;
            const fz = -Math.cos(d.facing * DEG) * half;
            ring(d.x + fx, d.z + fz, 0.6 + 0.25 * Math.sin(t * 0.83 + i * 1.7) + 2 * pace);
            ring(d.x - fx, d.z - fz, 0.5 + 0.25 * Math.sin(t * 0.71 + i * 2.9) + 2 * pace);
          }
        });
        g.stand.needsUpdate = true;
        g.pose.needsUpdate = true;
      }
      return lap;
    },
    dispose: () => {
      for (const g of groups) {
        g.mesh.geometry.dispose();
        g.material.dispose();
      }
    },
  };
}
