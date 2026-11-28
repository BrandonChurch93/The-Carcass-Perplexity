// The dead of the thin crust: wallowers that broke through, sank to the belly and were kept by the salt. And one that is still alive in it.
import * as THREE from 'three';
import { DEAD, STUCK, TAU, rel, relYaw } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { newDrive } from '../wallowers/animal';
import { Beast } from '../wallowers/body';
import { heavePhase, mudWallow } from './mud';

export const PARTS: readonly string[] = ['dead'];

const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// What the salt has finished with is a mound of it: a low dome of knobs, pink at its foot. One stands alone (the oldest of the dead). The
// others are what is left of a body on such a mound, built as heights over its bed: the girdles of shoulder and hip still stand, the middle
// has fallen in, the hide has sunk between the ribs and along the spine, and the salt has grown over all of it but the hollows.
const DOME_GLSL = /* glsl */ `
uniform sampler2D tSaltNh;
uniform sampler2D tKnobN;
uniform sampler2D tBodyNh;
uniform sampler2D tBodyM;
uniform vec4 uDome;
uniform vec4 uLumps;
uniform vec2 uTurn;
// Half its length, half its width, its height, and 1 where there is a body at all.
uniform vec4 uBody;
// How far it has fallen in (0 to 1), (unused), how far the salt has grown over it (0 to 1), and which flank is up (1 or -1).
uniform vec4 uVar;
// The sculpted body (dead/carcass-nh, dead/carcass-m: assets-src/marsh/dead/make-carcass.py), laid along the mound and half sunk in it.
// q: metres along the body (the head at +x) and across it. t: where that is on the sheet, and z, how much of it is on the sheet at all.
vec3 carcassAt(vec2 q) {
  vec2 x = q / (uBody.x / 1.14);
  vec2 t = vec2((x.x - 0.13) / 2.56 + 0.5, 0.5 + uVar.w * x.y / 1.6);
  vec2 inside = smoothstep(vec2(0.5), vec2(0.47), abs(t - 0.5));
  return vec3(t, inside.x * inside.y * uBody.w);
}
// How far the mud has taken it: one flank lies deeper than the other, and the hind end deepest.
float carcassSunk(vec2 q) {
  vec2 x = q / (uBody.x / 1.14);
  return (0.02 + 0.03 * uVar.x) * (1.0 + 0.8 * x.y * uVar.w - 0.3 * x.x);
}
// (The back still stands: under its salt the hide of the back holds a dome from hip to shoulder, and it is the flank that has fallen
// in to the ribs. cover: how far the dome stands over what the sheet has there.)
float carcass(vec2 q, float bl, out float cover) {
  vec3 t = carcassAt(q);
  float s = uBody.x / 1.14;
  float f = textureLod(tBodyNh, t.xy, bl).b;
  vec2 d = (t.xy - vec2(0.33, 0.44)) / vec2(0.26, 0.155);
  float back = 0.72 * pow(max(0.0, 1.0 - dot(d, d)), 0.85) * mix(1.0, 0.8, uVar.x);
  cover = smoothstep(0.0, 0.07, back - f) * t.z;
  return max(0.0, max(f, back) * 0.5 * mix(1.85, 1.55, uVar.x) - carcassSunk(q)) * s * t.z;
}
// m: x and y as the body gives them, z how much of the spot is salt, w where the hide between the ribs is torn through.
float domeAt(vec2 xz, float level, float bl, out vec4 m) {
  vec2 d = xz - uDome.xy;
  vec2 along = vec2(d.x * uTurn.x + d.y * uTurn.y, -d.x * uTurn.y + d.y * uTurn.x);
  vec2 q = along * vec2(1.0, uLumps.y);
  float r = length(q) / uDome.z;
  float body = pow(max(0.0, 1.0 - r * r), 1.4);
  // A second, lower hump leans on the first: no mound of it is round.
  vec2 q2 = q - uLumps.zw * uDome.z;
  float r2 = length(q2) / (0.6 * uDome.z);
  body += 0.55 * pow(max(0.0, 1.0 - r2 * r2), 1.4) * (1.0 - 0.6 * body);
  float knobs = textureLod(tSaltNh, xz * 0.3 + uLumps.x, level + 3.0).b;
  float fine = textureLod(tSaltNh, xz * 0.9 + uLumps.x * 1.7, level + 2.0).b;
  // (The salt's own knobs, a hand across: mat/knob, the sheet the seep pool's bank is made of.)
  float kn = textureLod(tKnobN, xz / 1.1 + uLumps.x, level + 3.6).b;
  float skirt = smoothstep(1.45, 0.7, r);
  float h = uDome.w * body * (0.8 + 0.4 * knobs) + skirt * ((knobs - 0.42) * 0.1 + (fine - 0.4) * 0.03 + (kn - 0.4) * 0.07);
  m = vec4(0.0, 0.0, 1.0, 0.0);
  if (uBody.w > 0.5) {
    float cover;
    float c = carcass(along, bl, cover);
    vec3 t = carcassAt(along);
    vec3 bm = textureLod(tBodyM, t.xy, bl).rgb * vec3(1.0 - cover, 1.0 - cover, 1.0);
    float on = smoothstep(0.0, 0.012, c);
    float sunk = smoothstep(0.55, 0.2, bm.b) * (1.0 - cover);
    float torn = bm.g * on;
    // (Salt lies thickest on what faces the sky, the back and the tops of the masses: least on bare bone and in what hangs torn.)
    // (Its edge on the hide is hairy: the salt creeps up in fine whiskers across the body, never in a clean line.)
    float hair = textureLod(tSaltNh, vec2(along.x * 7.0, along.y * 0.8) + uLumps.x, max(level - 1.0, 0.0)).b;
    float grown = mix(1.0, smoothstep(0.4, 0.6, 0.5 * knobs + 0.5 * kn + uVar.z - 0.38 - 0.6 * bm.r - 0.6 * sunk + 0.9 * (c / uBody.z - 0.72) + 0.5 * (hair - 0.5) * (1.0 - cover) + 0.7 * cover) * (1.0 - torn), on);
    h = mix(h, max(h, 0.0) * 0.3, on) + c + on * grown * (kn - 0.2) * 0.03;
    m = vec4(bm.r * on, sunk * on, grown, torn);
  }
  // (The grid's own border lies deep under the ground: no straight edge of it shows where the ground is low.)
  return h - 0.3 * smoothstep(1.3, 1.5, r);
}`;

const DOME_VERTEX = /* glsl */ `
varying vec3 vWorld;
${DOME_GLSL}
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec4 m;
  world.y += domeAt(world.xz, 1.0, 3.0, m);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const DOME_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform sampler2D tSalt;
uniform sampler2D tKnob;
uniform float uGround;
${NOISE_GLSL}
${RIG_GLSL}
${DOME_GLSL}
const vec3 RIME_MEAN = vec3(0.389, 0.306, 0.282);
const vec3 THIRD = vec3(0.3333);
void main() {
  vec2 xz = vWorld.xz;
  float e = 0.015;
  vec4 m;
  vec4 m2;
  // (The sculpt's sheet: its level from the pixel's short side, the long side counted at most three times it.)
  vec2 fx = dFdx(xz);
  vec2 fy = dFdy(xz);
  float fa = dot(fx, fx);
  float fb = dot(fy, fy);
  float bl = max(0.0, 0.5 * log2(max(min(max(fa, fb), min(fa, fb) * 9.0), 1e-12)) - log2(2.56 * uBody.x / 1.14 / 1024.0));
  float coarse = max(bl, 3.0);
  domeAt(xz, 1.5, bl, m);
  float hx = domeAt(xz + vec2(e, 0.0), 1.5, coarse, m2) - domeAt(xz - vec2(e, 0.0), 1.5, coarse, m2);
  float hz = domeAt(xz + vec2(0.0, e), 1.5, coarse, m2) - domeAt(xz - vec2(0.0, e), 1.5, coarse, m2);
  // (What the sheet's own normal has that the heights round the spot do not: ribs, folds, the edges of the tears.)
  vec2 dq = xz - uDome.xy;
  vec3 bt = carcassAt(vec2(dq.x * uTurn.x + dq.y * uTurn.y, -dq.x * uTurn.y + dq.y * uTurn.x));
  vec2 bn = (textureLod(tBodyNh, bt.xy, bl).rg - textureLod(tBodyNh, bt.xy, coarse).rg) * 2.0 * bt.z * (1.0 - 0.5 * m.z);
  bn.y *= uVar.w;
  vec2 bw = vec2(bn.x * uTurn.x - bn.y * uTurn.y, bn.x * uTurn.y + bn.y * uTurn.x) * 1.6;
  float salt = m.z;
  vec2 uk = xz / 1.1 + uLumps.x;
  vec4 kn = texture2D(tKnobN, uk);
  vec3 kc = texture2D(tKnob, uk).rgb;
  // Near the lens the crystals of the knobs show: the same sheet again, a sixth the size.
  float nearBy = 1.0 - smoothstep(4.0, 12.0, length(cameraPosition - vWorld));
  vec4 kn2 = texture2D(tKnobN, uk * 6.1 + 0.23);
  float k2 = dot(texture2D(tKnob, uk * 6.1 + 0.23).rgb, THIRD) / 0.235;
  // (Old salt is fine grained, like sugar: its lumps are soft and what the lens sees close is the grain, the sheet again at a
  // twentieth the size.)
  vec4 kn3 = texture2D(tKnobN, uk * 21.7 + 0.61);
  float k3 = dot(texture2D(tKnob, uk * 21.7 + 0.61).rgb, THIRD) / 0.235;
  float grainy = 1.0 - smoothstep(1.5, 5.0, length(cameraPosition - vWorld));
  vec2 lean = ((kn.rg - 0.5) * 0.9 + (kn2.rg - 0.5) * 1.1 * nearBy + (kn3.rg - 0.5) * 1.3 * grainy) * salt;
  // The hide where it shows: dried hard, creased along the body, the rime's grain in it.
  vec2 uh = vec2(xz.x * uTurn.x + xz.y * uTurn.y, -xz.x * uTurn.y + xz.y * uTurn.x) * vec2(0.7, 2.6) + uLumps.x;
  vec3 hideN = texture2D(tSaltNh, uh).rgb;
  float crease = dot(texture2D(tSalt, uh).rgb / RIME_MEAN, THIRD);
  vec2 hl = (hideN.rg - 0.5) * 1.1 * (1.0 - salt);
  vec3 n = normalize(vec3(-hx / (2.0 * e) + lean.x + bw.x - (hl.x * uTurn.x - hl.y * uTurn.y), 1.0, -hz / (2.0 * e) + lean.y + bw.y - (hl.x * uTurn.y + hl.y * uTurn.x)));
  vec3 v = normalize(cameraPosition - vWorld);
  // Salt: grey white on the knobs, the red of the brine dried in its hollows.
  // (It is old salt, grown thick: dirty grey white all through, its hollows a shade darker and faintly pink, never the wet red of the bank.)
  float kl = clamp(dot(kc, THIRD) / 0.235, 0.55, 1.35);
  vec3 saltC = vec3(0.3, 0.268, 0.24) * (0.72 + 0.28 * kl) * mix(1.0, 0.7 + 0.3 * k2, nearBy) * mix(1.0, 0.72 + 0.28 * k3, grainy);
  saltC *= mix(vec3(1.0), vec3(0.8, 0.62, 0.56), 0.6 * smoothstep(0.5, 0.26, kn.b));
  vec3 hide = vec3(0.085, 0.06, 0.049) * (0.45 + 0.65 * crease) * (1.0 - 0.6 * m.y);
  // (Sunk between the ribs it is dark, damp and stained by what was under it.)
  hide = mix(hide, vec3(0.045, 0.016, 0.012) * (0.6 + 0.4 * crease), 0.7 * smoothstep(0.3, 0.8, m.y));
  // (Bone, where a rib or a knuckle of the spine has come through.)
  hide = mix(hide, vec3(0.2, 0.12, 0.07) * (0.7 + 0.3 * crease), 0.9 * smoothstep(0.3, 0.7, m.x));
  // (Where the hide is torn through, what is under it: dark, wet and red.)
  hide = mix(hide, vec3(0.05, 0.02, 0.015) * (0.6 + 0.6 * crease), m.w);
  vec3 albedo = mix(hide, saltC, salt);
  // The brine wicks up into the foot of it, and what ran out of the body it grew on still stains it.
  float above = vWorld.y - uGround;
  float stain = (1.0 - smoothstep(0.0, 0.22, above + 0.14 * (vnoise(xz * 3.0 + uLumps.x) - 0.5))) * (0.45 + 0.55 * vnoise(xz * 1.3 + uLumps.x * 2.0));
  albedo = mix(albedo, albedo * vec3(0.7, 0.4, 0.36), 0.75 * stain);
  float occ = mix((1.0 - 0.5 * m.y) * (1.0 - 0.6 * m.w), 0.8 + 0.2 * smoothstep(0.2, 0.6, kn.b), salt) * (0.7 + 0.3 * smoothstep(0.0, 0.15, above));
  vec3 c = rigShade(vWorld, n, v, albedo, mix(mix(0.78, 0.4, m.w), mix(0.96, 0.6, 0.5 * stain), salt), occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The feelers of a dead one: horn, the last of it the salt takes. They stand out of the crust where the head went down.
const HORN_VERTEX = /* glsl */ `
attribute float aAlong;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vAlong;
void main() {
  vWorld = position;
  vNormal = normal;
  vAlong = aAlong;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

const HORN_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vAlong;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float fleck = vnoise(vec2(vAlong * 37.0, vWorld.x * 23.0 + vWorld.z * 31.0));
  // Yellowed horn, brown toward the point and in its cracks, crusted white where it comes out of the salt.
  vec3 albedo = mix(vec3(0.25, 0.205, 0.145), vec3(0.11, 0.075, 0.055), clamp(0.75 * smoothstep(0.5, 1.0, vAlong) + 0.3 * fleck, 0.0, 1.0));
  albedo = mix(albedo, vec3(0.3, 0.28, 0.26), 0.5 * smoothstep(0.34, 0.0, vAlong) * smoothstep(0.3, 0.55, fleck + 0.25));
  // (The discard comes last: a read that takes its level from the screen after a discard is not the same twice in the software renderer.)
  gl_FragColor = vec4(rigOut(rigShade(vWorld, n, v, albedo, 0.62, 0.6 + 0.4 * smoothstep(0.0, 0.3, vAlong))), 1.0);
  if (uMirror > 0.5 && vWorld.y < -0.015) discard;
}`;

type Horn = { from: THREE.Vector3; over: THREE.Vector3; to: THREE.Vector3; thick: number };
// Each feeler is a bent horn that tapers to a point: rings of six round a curve through three places.
function horns(list: Horn[]): THREE.BufferGeometry {
  const RINGS = 16;
  const SIDES = 6;
  const position: number[] = [];
  const normal: number[] = [];
  const along: number[] = [];
  const index: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  list.forEach((h) => {
    const base = position.length / 3;
    for (let i = 0; i <= RINGS; i++) {
      const t = i / RINGS;
      const at = h.from.clone().multiplyScalar((1 - t) * (1 - t)).addScaledVector(h.over, 2 * t * (1 - t)).addScaledVector(h.to, t * t);
      const tangent = h.over.clone().sub(h.from).multiplyScalar(1 - t).addScaledVector(h.to.clone().sub(h.over), t).normalize();
      const side = tangent.clone().cross(up).normalize();
      const over = side.clone().cross(tangent);
      const radius = h.thick * (1 - 0.92 * Math.pow(t, 1.4));
      for (let j = 0; j < SIDES; j++) {
        const a = (j / SIDES) * TAU;
        const out = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(over, Math.sin(a));
        position.push(at.x + out.x * radius, at.y + out.y * radius, at.z + out.z * radius);
        normal.push(out.x, out.y, out.z);
        along.push(t);
      }
    }
    for (let i = 0; i < RINGS; i++)
      for (let j = 0; j < SIDES; j++) {
        const a = base + i * SIDES + j;
        const b = base + i * SIDES + ((j + 1) % SIDES);
        index.push(a, b, a + SIDES, b, b + SIDES, a + SIDES);
      }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  g.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
  g.setIndex(index);
  return g;
}

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

// What each of the dead is, in the order of the anchors: 'heap' is one fallen in on itself under its salt, built; 'mound' is the oldest, only
// salt; 'fallen' lies on its side as it went down.
type State = 'heap' | 'mound' | 'fallen';
const STATES: State[] = ['heap', 'heap', 'heap', 'mound', 'fallen', 'heap'];
const FALLEN = DEAD[4] as (typeof DEAD)[number];

export function create(ctx: Context): Piece {
  const rng = ctx.rng('dead');
  // TEMPORARY, until the anchors give it: where the lens of the stuck one stands. The dead it looks across are taken finer.
  const lens = rel(24.6, 19.6);
  const fineGrid = grid(110, 110);
  const coarseGrid = grid(48, 48);
  const longGrid = grid(176, 96);
  const farGrid = grid(88, 48);
  const tSalt = ctx.assets.texture('mat/rime.jpg', { kind: 'colour', anisotropy: 4 });
  const tSaltNh = ctx.assets.texture('mat/rime-nh.png', { kind: 'data', anisotropy: 4 });
  const tKnob = ctx.assets.texture('mat/knob.jpg', { kind: 'colour', repeat: true, anisotropy: 4 });
  const tKnobN = ctx.assets.texture('mat/knob-nh.jpg', { kind: 'data', repeat: true, anisotropy: 1 });
  const tBodyNh = ctx.assets.texture('dead/carcass-nh.jpg', { kind: 'data', repeat: false, anisotropy: 4 });
  const tBodyM = ctx.assets.texture('dead/carcass-m.jpg', { kind: 'data', repeat: false, anisotropy: 4 });
  const cards: { mesh: THREE.Mesh; material: THREE.ShaderMaterial; x: number; z: number; yaw: number; size: number }[] = [];
  const feelers: Horn[] = [];
  let heaps = 0;
  DEAD.forEach((d, index) => {
    const state = STATES[index] ?? 'heap';
    const p = rel(d.d, d.l);
    const ground = Math.min(0.1, ctx.rig.land.height(p[0], p[1]));
    const size = 3.7 * d.size * rng.range(0.92, 1.08);
    const alone = state === 'mound';
    const heap = state === 'heap';
    const near = Math.hypot(p[0] - lens[0], p[1] - lens[1]) < 9;
    // STAGED for the lens of the thin crust: the heads of those it looks across lie toward it and off to a side, as the approved picture has them.
    const yaw = heap && near ? Math.atan2(lens[1] - p[1], lens[0] - p[0]) + (heaps % 2 === 0 ? 0.95 : -1.1) : d.yaw;
    const radius = (alone ? 1.75 : heap ? 1.25 : 1.5) * d.size * rng.range(0.9, 1.1);
    const high = (alone ? 0.62 : heap ? 0.16 : 0.1) * d.size * rng.range(0.85, 1.1);
    const lean = rng.range(0, TAU);
    // The body: about three metres of it. No two have fallen in alike: one is all but whole under its salt, the next is ribs and hide.
    const long = 1.45 * d.size * rng.range(0.9, 1.1);
    const wide = 0.72 * d.size * rng.range(0.9, 1.1);
    const tall = 0.46 * d.size * rng.range(0.85, 1.1);
    const fallenIn = heap ? [0.95, 0.55, 0.8, 0.7][heaps % 4] ?? 0.8 : 0;
    const grown = heap ? [0.5, 0.72, 0.6, 0.66][heaps % 4] ?? 0.6 : 1;
    const seed = rng.range(1, 60);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...ctx.rig.uniforms,
        tSalt: { value: tSalt },
        tSaltNh: { value: tSaltNh },
        tKnob: { value: tKnob },
        tKnobN: { value: tKnobN },
        tBodyNh: { value: tBodyNh },
        tBodyM: { value: tBodyM },
        uDome: { value: new THREE.Vector4(p[0], p[1], radius, high) },
        uLumps: { value: new THREE.Vector4(seed, heap ? 1.5 : rng.range(1.0, 1.7), 0.5 * Math.cos(lean), 0.5 * Math.sin(lean)) },
        uTurn: { value: new THREE.Vector2(Math.cos(yaw), Math.sin(yaw)) },
        uBody: { value: new THREE.Vector4(long, wide, tall, heap ? 1 : 0) },
        uVar: { value: new THREE.Vector4(fallenIn, 0.16 * d.size * rng.range(0.9, 1.15), grown, heaps % 2 === 0 ? 1 : -1) },
        uGround: { value: ground },
      },
      vertexShader: DOME_VERTEX,
      fragmentShader: DOME_FRAGMENT,
    });
    const mesh = new THREE.Mesh(heap ? (near ? longGrid : farGrid) : near ? fineGrid : coarseGrid, material);
    // The grid lies a finger under the crust: only the mound and the knobs round it stand out of the ground.
    mesh.position.set(p[0], ground - 0.035, p[1]);
    if (heap) {
      // (A body's grid lies along it and is as long and wide as its mound.)
      mesh.rotation.y = -yaw;
      mesh.scale.set(radius * 3.1, 1, (radius * 3.1) / 1.5);
    } else mesh.scale.set(radius * 3.1, 1, radius * 3.1);
    mesh.frustumCulled = false;
    mesh.updateMatrixWorld();
    cards.push({ mesh, material, x: p[0], z: p[1], yaw, size });
    if (!heap) return;
    heaps++;
    // Its feelers: out of the salt where the head went down, bent over and down to the crust, no two alike.
    const cs = Math.cos(yaw);
    const sn = Math.sin(yaw);
    const place = (a: number, b: number, y: number): THREE.Vector3 => new THREE.Vector3(p[0] + cs * a - sn * b, ground + y, p[1] + sn * a + cs * b);
    const count = 6 + Math.floor(rng.range(0, 3));
    for (let f = 0; f < count; f++) {
      const side = (f + 0.5) / count - 0.5;
      const reach = long * rng.range(0.28, 0.5);
      const out = side * 2 * wide * rng.range(0.7, 1.3);
      feelers.push({
        from: place(long * 0.84, side * wide * 0.5, high * 0.5 + tall * 0.12),
        over: place(long * 0.9 + reach * rng.range(0.35, 0.7), out * 0.6, high * 0.5 + tall * rng.range(0.25, 0.5)),
        to: place(long * 0.9 + reach, out, rng.range(-0.03, 0.03)),
        thick: 0.021 * d.size * rng.range(0.8, 1.25),
      });
    }
  });
  const hornGeometry = horns(feelers);
  const hornMaterial = new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms }, vertexShader: HORN_VERTEX, fragmentShader: HORN_FRAGMENT });
  const hornMesh = new THREE.Mesh(hornGeometry, hornMaterial);
  hornMesh.frustumCulled = false;
  // The live one: sunk to the shoulders, head up, working to get out and getting nowhere.
  const at = rel(STUCK[0], STUCK[1]);
  const yaw = relYaw(-0.97, -0.03);
  // The crust has given way under it: the land's hollow is 0.2 m deep here, and the rig's land height does not include it.
  const ground = Math.min(0.1, ctx.rig.land.height(at[0], at[1])) - 0.2;
  const stuck = new Beast(ctx, { k: 1, young: 0, seed: 23.7, bulk: 1, salt: 0.5 }, { cell: 0.03, wet: ground + 0.26, mudded: 1, relief: 0.022, tendrils: 15, hang: 0.5, thick: 1.6, long: 0.8, droop: 0.9, line: ground + 0.13 });
  const live = newDrive();
  const mud = mudWallow(ctx, at[0], at[1], [Math.cos(yaw), -Math.sin(yaw)], 0.8, [0.1, 0.072, 0.054], 'dead-mud', 0.6, 0.2);
  // One of the dead is not yet a heap: it lies on its side as it fell, half under, caked and salted, the upper legs stiff in the air.
  const fa = rel(FALLEN.d, FALLEN.l);
  const fl = Math.hypot(lens[0] - fa[0], lens[1] - fa[1]);
  // STAGED for the lens of the thin crust: it lies a stride and a half to the left of its anchor as that lens sees it, whole in the frame.
  const fp: [number, number] = [fa[0] - ((lens[1] - fa[1]) / fl) * 1.7, fa[1] + ((lens[0] - fa[0]) / fl) * 1.7];
  const fGround = Math.min(0.1, ctx.rig.land.height(fp[0], fp[1]));
  const fallen = new Beast(ctx, { k: 0.85, young: 0, seed: 41.3, bulk: 0.86, salt: 0.3 }, { cell: 0.03, wet: fGround - 5, crust: 1, relief: 0 });
  const lie = newDrive();
  {
    const k = 0.85;
    const across: [number, number] = [-(lens[1] - fp[1]), lens[0] - fp[0]];
    const al = Math.hypot(across[0], across[1]);
    lie.dir = [across[0] / al, across[1] / al];
    // Its legs lie toward the lens of the thin crust.
    if (lie.dir[1] * (lens[0] - fp[0]) - lie.dir[0] * (lens[1] - fp[1]) < 0) lie.dir = [-lie.dir[0], -lie.dir[1]];
    lie.ox = fp[0];
    lie.oz = fp[1];
    lie.oy = fGround - 0.42 * k;
    lie.roll = 1.32;
    lie.shift = -1.12 * k;
    lie.pitch = 0.06;
    lie.bend = 0.12;
    lie.headPitch = 0.3;
    lie.headYaw = -0.25;
    lie.breath = -1;
    lie.splay = 0.12;
    lie.floor = -1e9;
    lie.curl.fill(0.9);
    lie.feet.forEach((foot, l) => {
      const upper = l < 2;
      const fore = l % 2 === 1;
      foot[0] = (fore ? 1.05 : -1.5) * k;
      foot[1] = (upper ? (fore ? 0.48 : 0.3) : -0.6) * k;
      foot[2] = (upper ? -1.25 : -0.9) * k * 0.86;
    });
    fallen.pose(lie, 0);
  }
  // Round each dead one the crust is stained dark: what ran out of it, and the mud it sank into.
  const stains = cards.map((c, i) => mudWallow(ctx, c.x, c.z, [Math.cos(c.yaw), -Math.sin(c.yaw)], 0.14 * c.size, [0.05, 0.022, 0.017], 'dead-stain-' + i, 1, 0, false));
  const meshes = [...cards.map((c) => c.mesh), hornMesh, stuck.mesh, stuck.feelers, fallen.mesh, fallen.feelers, mud.mesh, ...stains.map((w) => w.mesh)];
  ctx.parts.built('dead', ...(meshes as [(typeof meshes)[number], ...typeof meshes]));
  for (const mesh of meshes) ctx.scene.add(mesh);

  const discs = ctx.rig.contactDiscs(cards.length + 1);
  cards.forEach((c, i) => ctx.rig.setDisc(discs, i, c.x, c.z, 0.42 * c.size, 0.3, 1.8, c.yaw));

  return {
    setTime: (seconds) => {
      // A heave every few seconds: it gathers, strains up and forward, holds, and sinks back to where it was.
      const u = heavePhase(seconds);
      const heave = smooth(0.08, 0.34, u) * (1 - smooth(0.42, 0.9, u));
      const tremble = heave * 0.012 * Math.sin(seconds * 23);
      live.ox = at[0];
      live.oz = at[1];
      live.oy = ground - 1.74 + 0.12 * heave + tremble;
      live.dir = [Math.cos(yaw), -Math.sin(yaw)];
      live.surge = 0.1 * heave;
      live.pitch = -0.66 - 0.06 * heave;
      live.roll = 0.05 * Math.sin(seconds * 0.9) + 0.05 * heave * Math.sin(seconds * 2.7);
      live.shift = 0.04 * Math.sin(seconds * 0.9 - 0.6);
      live.bend = 0.04 * Math.sin(seconds * 0.6);
      live.headPitch = -0.5 - 0.14 * heave + 0.05 * Math.sin(seconds * 1.7);
      live.headYaw = 0.3 * Math.sin(seconds * 0.43) + 0.1 * Math.sin(seconds * 1.1);
      live.breath = Math.sin(seconds * 2.4);
      live.splay = 0.12 + 0.2 * heave;
      live.floor = ground + 0.07;
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
      ctx.rig.setDisc(discs, cards.length, stood.x, stood.z, 1.7, 0.3, 1.7, stood.yaw);
      mud.set(heave, seconds, u);
    },
    dispose: () => {
      fineGrid.dispose();
      coarseGrid.dispose();
      for (const c of cards) c.material.dispose();
      longGrid.dispose();
      farGrid.dispose();
      hornGeometry.dispose();
      hornMaterial.dispose();
      stuck.dispose();
      fallen.dispose();
      mud.dispose();
      for (const w of stains) w.dispose();
    },
  };
}
