// The dead of the thin crust: wallowers that broke through, sank to the belly and were kept by the salt. And one that is still alive in it.
import * as THREE from 'three';
import { DEAD, STUCK, rel, relYaw } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { newDrive } from '../wallowers/animal';
import { Beast } from '../wallowers/body';
import { mudWallow } from './mud';

export const PARTS: readonly string[] = ['dead'];

const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// A dead one is the picture of one the salt kept, seen from above, raised into a mound by its own relief: the wide form of the body from the
// relief blurred, the ribs and the knobs of salt from it sharp. Where the picture ends the mound runs on as an apron of salt into the crust.
const MOUND_GLSL = /* glsl */ `
uniform sampler2D tRelief;
uniform float uFlip;
uniform float uHigh;
uniform float uSink;
vec2 cardUv(vec2 xz) {
  float u = xz.x + 0.5;
  return vec2(mix(u, 1.0 - u, uFlip), 0.5 - xz.y);
}
float moundAt(vec2 xz, float level) {
  vec2 uv = cardUv(xz);
  float wide = textureLod(tRelief, uv, 6.5).r;
  float mid = textureLod(tRelief, uv, 5.0).r;
  float fine = textureLod(tRelief, uv, level + 2.0).r;
  // The relief is nearer a lit clay than a depth: it is trusted for the wide form and only a little for the fine. Seen from a man's height
  // anything sharp in it stands up as a spike.
  return uHigh * (1.35 * wide + 0.22 * mid + 0.05 * (fine - mid)) - uSink;
}`;

const CARD_VERTEX = /* glsl */ `
varying vec2 vAt;
varying vec3 vWorld;
${MOUND_GLSL}
void main() {
  vAt = position.xz;
  vec4 world = modelMatrix * vec4(position.x, 0.0, position.z, 1.0);
  world.y += moundAt(position.xz, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const CARD_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vAt;
varying vec3 vWorld;
uniform sampler2D tPic;
uniform sampler2D tSalt;
uniform sampler2D tSaltNh;
uniform vec2 uSize;
uniform vec2 uTurn;
uniform float uGround;
uniform float uSeed;
${NOISE_GLSL}
${RIG_GLSL}
${MOUND_GLSL}
const vec3 LUMA = vec3(0.3, 0.5, 0.2);
const vec3 RIME_MEAN = vec3(0.389, 0.306, 0.282);
void main() {
  vec2 uv = cardUv(vAt);
  float relief = textureLod(tRelief, uv, 1.0).r;
  float mid = textureLod(tRelief, uv, 3.5).r;
  float cover = smoothstep(0.035, 0.1, relief);
  vec3 pic = texture2D(tPic, uv).rgb;
  // The slope of the mound, in its own frame, and the slope the picture's light and dark give the small things on it.
  vec2 e = vec2(2.5 / 1672.0, 2.5 / 941.0);
  float hx = moundAt(vAt + vec2(e.x, 0.0), 1.5) - moundAt(vAt - vec2(e.x, 0.0), 1.5);
  float hz = moundAt(vAt + vec2(0.0, e.y), 1.5) - moundAt(vAt - vec2(0.0, e.y), 1.5);
  vec3 nl = normalize(vec3(-hx / (2.0 * e.x * uSize.x), 1.0, -hz / (2.0 * e.y * uSize.y)));
  vec2 wq = vWorld.xz * 2.0 + uSeed;
  vec3 rime = texture2D(tSalt, wq).rgb / RIME_MEAN;
  vec3 rimeN = texture2D(tSaltNh, wq).rgb;
  // The ribs and the knobs: the light and dark of the picture, as slope.
  float l0 = dot(pic, LUMA);
  vec2 de = vec2(1.5 / 1672.0, 1.5 / 941.0);
  float lx = dot(texture2D(tPic, cardUv(vAt + vec2(de.x, 0.0))).rgb, LUMA) - l0;
  float lz = dot(texture2D(tPic, cardUv(vAt + vec2(0.0, de.y))).rgb, LUMA) - l0;
  nl = normalize(nl + vec3(rimeN.r - 0.5, 0.0, rimeN.g - 0.5) * mix(1.4, 0.4, cover) - vec3(lx, 0.0, lz) * 2.2 * cover / (l0 + 0.08));
  vec3 n = vec3(nl.x * uTurn.x + nl.z * uTurn.y, nl.y, -nl.x * uTurn.y + nl.z * uTurn.x);
  vec3 v = normalize(cameraPosition - vWorld);

  // The salt apron round it, and the kept body: bone and dried hide under knobs of salt.
  vec3 apron = vec3(0.2, 0.172, 0.16) * mix(vec3(1.0), rime, 0.7);
  // A top-down picture smears on a steep side: there the salt has caked over it.
  float steep = smoothstep(0.75, 0.45, nl.y);
  vec3 albedo = mix(apron, pic * 0.52 * mix(vec3(1.0), rime, 0.25), cover * (1.0 - 0.6 * steep));
  // What ran out of it stains the foot of the mound, and the mud it sank into still holds it.
  float above = vWorld.y - uGround;
  float stain = (1.0 - smoothstep(0.0, 0.07, above + 0.1 * (vnoise(vWorld.xz * 3.0 + uSeed) - 0.5))) * (0.5 + 0.5 * vnoise(vWorld.xz * 1.3 + uSeed * 2.0));
  albedo = mix(albedo, albedo * vec3(0.3, 0.2, 0.17), 0.85 * stain);
  // A hollow between the ribs sees little sky.
  float hollow = smoothstep(-0.22, 0.08, relief - mid);
  float occ = mix(1.0, 0.35 + 0.65 * hollow, cover) * (0.7 + 0.3 * smoothstep(0.0, 0.12, above));
  float rough = mix(0.95, 0.5, 0.6 * stain);
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

function grid(across: number, down: number): THREE.BufferGeometry {
  const position = new Float32Array((across + 1) * (down + 1) * 3);
  const index = new Uint32Array(across * down * 6);
  let p = 0;
  for (let j = 0; j <= down; j++) for (let i = 0; i <= across; i++) position.set([i / across - 0.5, 0, j / down - 0.5], p++ * 3);
  let q = 0;
  for (let j = 0; j < down; j++)
    for (let i = 0; i < across; i++) {
      const a = j * (across + 1) + i;
      const b = a + across + 1;
      index.set([a, b, a + 1, a + 1, b, b + 1], q);
      q += 6;
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return g;
}

export function create(ctx: Context): Piece {
  const rng = ctx.rng('dead');
  // TEMPORARY, until the anchors give it: where the lens of the stuck one stands. The dead it looks across are taken finer.
  const lens = rel(24.6, 19.6);
  const fineGrid = grid(360, 202);
  const coarseGrid = grid(140, 78);
  const nearest = DEAD.reduce((a, b) => (Math.hypot(a.d - STUCK[0], a.l - STUCK[1]) < Math.hypot(b.d - STUCK[0], b.l - STUCK[1]) ? a : b));
  const tPic = ctx.assets.texture('mat/deadone.jpg', { kind: 'colour', repeat: false, anisotropy: 4 });
  const tRelief = ctx.assets.texture('mat/deadone-h.png', { kind: 'data', repeat: false });
  const tSalt = ctx.assets.texture('mat/rime.jpg', { kind: 'colour', anisotropy: 4 });
  const tSaltNh = ctx.assets.texture('mat/rime-nh.png', { kind: 'data', anisotropy: 4 });
  const cards: { mesh: THREE.Mesh; material: THREE.ShaderMaterial; x: number; z: number; yaw: number; size: number }[] = [];
  for (const d of DEAD) {
    const p = rel(d.d, d.l);
    const size = 3.7 * d.size * rng.range(0.92, 1.08);
    const ground = Math.min(0.1, ctx.rig.land.height(p[0], p[1]));
    // The one that lies nearest the live one is the furthest gone: it stands no higher than a knee, and the lens of the thin crust looks over it.
    const under = d === nearest ? 1 : 0;
    const high = (0.62 - 0.2 * under) * d.size * rng.range(0.85, 1.1);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...ctx.rig.uniforms,
        tPic: { value: tPic },
        tRelief: { value: tRelief },
        tSalt: { value: tSalt },
        tSaltNh: { value: tSaltNh },
        uFlip: { value: rng.next() < 0.5 ? 1 : 0 },
        uHigh: { value: high },
        uSink: { value: high * rng.range(0.16, 0.3) + 0.03 },
        uSize: { value: new THREE.Vector2(size, (size * 941) / 1672) },
        uTurn: { value: new THREE.Vector2(Math.cos(d.yaw), Math.sin(d.yaw)) },
        uGround: { value: ground },
        uSeed: { value: rng.range(1, 60) },
      },
      vertexShader: CARD_VERTEX,
      fragmentShader: CARD_FRAGMENT,
    });
    const near = Math.hypot(p[0] - lens[0], p[1] - lens[1]) < 9;
    const mesh = new THREE.Mesh(near ? fineGrid : coarseGrid, material);
    mesh.position.set(p[0], ground, p[1]);
    mesh.rotation.y = d.yaw;
    mesh.scale.set(size, 1, (size * 941) / 1672);
    mesh.frustumCulled = false;
    mesh.updateMatrixWorld();
    cards.push({ mesh, material, x: p[0], z: p[1], yaw: d.yaw, size });
  }
  // The live one: sunk to the shoulders, head up, working to get out and getting nowhere.
  const at = rel(STUCK[0], STUCK[1]);
  const yaw = relYaw(-0.97, -0.03);
  const ground = Math.min(0.1, ctx.rig.land.height(at[0], at[1]));
  const stuck = new Beast(ctx, { k: 1, young: 0, seed: 23.7, bulk: 1, salt: 0.5 }, { cell: 0.024, wet: ground + 0.3, mudded: 1, relief: 0.022 });
  const live = newDrive();
  const mud = mudWallow(ctx, at[0], at[1], [Math.cos(yaw), -Math.sin(yaw)]);
  // Round each dead one the crust is stained dark: what ran out of it, and the mud it sank into.
  const stains = cards.map((c, i) => mudWallow(ctx, c.x, c.z, [Math.cos(c.yaw), -Math.sin(c.yaw)], 0.2 * c.size, [0.06, 0.042, 0.036], 'dead-stain-' + i));
  const meshes = [...cards.map((c) => c.mesh), stuck.mesh, stuck.feelers, mud.mesh, ...stains.map((w) => w.mesh)];
  ctx.parts.built('dead', ...(meshes as [(typeof meshes)[number], ...typeof meshes]));
  for (const mesh of meshes) ctx.scene.add(mesh);

  const discs = ctx.rig.contactDiscs(cards.length + 1);
  cards.forEach((c, i) => ctx.rig.setDisc(discs, i, c.x, c.z, 0.42 * c.size, 0.3, 1.8, c.yaw));

  return {
    setTime: (seconds) => {
      // A heave every few seconds: it gathers, strains up and forward, holds, and sinks back to where it was.
      const period = 5.2;
      const c = seconds / period + 0.3;
      const u = c - Math.floor(c);
      const heave = smooth(0.08, 0.34, u) * (1 - smooth(0.42, 0.9, u));
      const tremble = heave * 0.012 * Math.sin(seconds * 23);
      live.ox = at[0];
      live.oz = at[1];
      live.oy = ground - 1.56 + 0.12 * heave + tremble;
      live.dir = [Math.cos(yaw), -Math.sin(yaw)];
      live.surge = 0.1 * heave;
      live.pitch = -0.5 - 0.06 * heave;
      live.roll = 0.05 * Math.sin(seconds * 0.9) + 0.05 * heave * Math.sin(seconds * 2.7);
      live.shift = 0.04 * Math.sin(seconds * 0.9 - 0.6);
      live.bend = 0.04 * Math.sin(seconds * 0.6);
      live.headPitch = -0.5 - 0.14 * heave + 0.05 * Math.sin(seconds * 1.7);
      live.headYaw = 0.3 * Math.sin(seconds * 0.43) + 0.1 * Math.sin(seconds * 1.1);
      live.breath = Math.sin(seconds * 2.4);
      live.splay = 0.2 + 0.25 * heave;
      live.floor = ground + 0.1;
      live.curl[0] = 0.85 + 0.35 * heave;
      // The feet are held by the mud: they stay where they are while the trunk strains above them.
      live.feet.forEach((foot, l) => {
        const side = l < 2 ? -1 : 1;
        const fore = l % 2 === 1 ? 1 : -1;
        foot[0] = (fore > 0 ? 0.78 : -1.22) + 0.05;
        foot[1] = 0;
        foot[2] = side * 0.68;
      });
      const stood = stuck.pose(live, seconds);
      ctx.rig.setDisc(discs, cards.length, stood.x, stood.z, 1.7, 0.8, 1.7, stood.yaw);
      mud.set(heave, seconds);
    },
    dispose: () => {
      fineGrid.dispose();
      coarseGrid.dispose();
      for (const c of cards) c.material.dispose();
      stuck.dispose();
      mud.dispose();
      for (const w of stains) w.dispose();
    },
  };
}
