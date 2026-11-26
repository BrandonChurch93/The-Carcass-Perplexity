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
  vec3 apron = vec3(0.3, 0.262, 0.245) * mix(vec3(1.0), rime, 0.7);
  // A top-down picture smears on a steep side: there the salt has caked over it.
  float steep = smoothstep(0.75, 0.45, nl.y);
  vec3 albedo = mix(apron, pic * 0.52 * mix(vec3(1.0), rime, 0.25), 0.35 * cover * (1.0 - 0.6 * steep));
  // What ran out of it stains the foot of the mound, and the mud it sank into still holds it.
  float above = vWorld.y - uGround;
  float stain = (1.0 - smoothstep(0.0, 0.07, above + 0.1 * (vnoise(vWorld.xz * 3.0 + uSeed) - 0.5))) * (0.5 + 0.5 * vnoise(vWorld.xz * 1.3 + uSeed * 2.0));
  albedo = mix(albedo, albedo * vec3(0.5, 0.27, 0.23), 0.6 * stain);
  // A hollow between the ribs sees little sky.
  float hollow = smoothstep(-0.22, 0.08, relief - mid);
  float occ = mix(1.0, 0.35 + 0.65 * hollow, cover) * (0.7 + 0.3 * smoothstep(0.0, 0.12, above));
  float rough = mix(0.95, 0.5, 0.6 * stain);
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The kept body itself: the picture of one, stood on the apron as a card that leans back and turns to the lens, raised by its own relief.
// The picture is of a dead one seen from the side and a little above, which is how every lens here sees them.
const BODY_GLSL = /* glsl */ `
uniform sampler2D tPic;
uniform sampler2D tRelief;
uniform float uFlip;
uniform vec4 uBody;
uniform vec4 uShape;
varying vec2 vUv;
varying vec2 vCard;
varying vec3 vWorld;
varying vec3 vRight;
varying vec3 vUp;
float bodyCover(vec2 uv) {
  vec3 pic = texture2D(tPic, uv).rgb;
  return max(smoothstep(0.03, 0.07, max(pic.r, max(pic.g, pic.b))), smoothstep(0.05, 0.1, textureLod(tRelief, uv, 2.0).r));
}
// What is left of each is a different heap: one whole, one slumped to an end, one broken in the middle into two.
float bodyTop(vec2 c) {
  float f = 1.0;
  if (uShape.x > 1.5) f = 0.3 + 0.7 * pow(abs(cos(3.14159 * (c.x * 1.05 + 0.12))), 0.8);
  else if (uShape.x > 0.5) f = mix(0.26, 1.0, smoothstep(0.08, 0.72, c.x));
  if (uShape.x > 0.5) {
    f *= smoothstep(0.0, 0.12, c.x) * (1.0 - smoothstep(0.88, 1.0, c.x));
    f += 0.035 * sin(c.x * 31.0 + uShape.w) + 0.02 * sin(c.x * 83.0 + uShape.w * 1.7);
  }
  return uBody.w + (1.0 - uBody.w) * f;
}`;

const BODY_VERTEX = /* glsl */ `
uniform vec4 uAt;
${BODY_GLSL}
void main() {
  vec2 uv = vec2(position.x + 0.5, 0.5 - position.z);
  vCard = uv;
  vUv = vec2(mix(uShape.y, uShape.z, mix(uv.x, 1.0 - uv.x, uFlip)), uv.y);
  vec2 tc = normalize(cameraPosition.xz - uAt.xz);
  vec3 toLens = vec3(tc.x, 0.0, tc.y);
  vRight = vec3(tc.y, 0.0, -tc.x);
  vUp = vec3(0.0, cos(uBody.z), 0.0) - toLens * sin(uBody.z);
  vec3 nrm = toLens * cos(uBody.z) + vec3(0.0, sin(uBody.z), 0.0);
  float swell = textureLod(tRelief, vUv, 5.0).r;
  // Each has gone down its own way: rolled so that one end of it is under the crust.
  float roll = uAt.w;
  vec3 r2 = vRight * cos(roll) + vUp * sin(roll);
  vec3 u2 = vUp * cos(roll) - vRight * sin(roll);
  vRight = r2;
  vUp = u2;
  vWorld = vec3(uAt.x, uAt.y, uAt.z) + vRight * (position.x * uBody.x) + vUp * ((uv.y - uBody.w) * uBody.y) + nrm * (swell * 0.3 * uBody.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

const BODY_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec4 uAt;
uniform sampler2D tSalt;
uniform float uSeed;
${NOISE_GLSL}
${RIG_GLSL}
${BODY_GLSL}
const vec3 LUMA = vec3(0.3, 0.5, 0.2);
const vec3 RIME_MEAN = vec3(0.389, 0.306, 0.282);
void main() {
  float top = bodyTop(vCard);
  float covered = bodyCover(vUv) * (1.0 - step(top, vCard.y));
  float lip = smoothstep(top - 0.12, top, vCard.y) * step(0.5, uShape.x);
  vec3 pic = texture2D(tPic, vUv).rgb;
  float l0 = dot(pic, LUMA);
  // Its form from the relief, blurred; its ribs and knobs from the light and dark of the picture.
  vec2 e = vec2(8.0 / 1672.0, 8.0 / 941.0);
  float sign_ = mix(1.0, -1.0, uFlip);
  float hx = (textureLod(tRelief, vUv + vec2(e.x, 0.0), 3.5).r - textureLod(tRelief, vUv - vec2(e.x, 0.0), 3.5).r) * sign_;
  float hy = textureLod(tRelief, vUv + vec2(0.0, e.y), 3.5).r - textureLod(tRelief, vUv - vec2(0.0, e.y), 3.5).r;
  vec2 de = vec2(1.5 / 1672.0, 1.5 / 941.0);
  float lx = (dot(texture2D(tPic, vUv + vec2(de.x, 0.0)).rgb, LUMA) - l0) * sign_;
  float ly = dot(texture2D(tPic, vUv + vec2(0.0, de.y)).rgb, LUMA) - l0;
  // Over all of it the salt has grown: clumps the size of a fist and needles between them.
  vec2 cq = vUv * vec2(uBody.x, uBody.y) * 1.6 + uSeed;
  vec3 clump = texture2D(tSalt, cq).rgb / RIME_MEAN;
  float cl = dot(clump, LUMA);
  vec2 cs = vec2(dot(texture2D(tSalt, cq + vec2(0.004, 0.0)).rgb / RIME_MEAN, LUMA) - cl, dot(texture2D(tSalt, cq + vec2(0.0, 0.004)).rgb / RIME_MEAN, LUMA) - cl);
  float crusted = smoothstep(0.25, 0.6, vnoise(vUv * vec2(9.0, 5.0) + uSeed) * 0.6 + 0.4 * cl);
  vec3 face = normalize(cross(vRight, vUp));
  vec3 n = normalize(face - vRight * (hx * 9.0 + lx * 0.7 / (l0 + 0.1) + cs.x * 5.0) - vUp * (hy * 9.0 + ly * 0.7 / (l0 + 0.1) + cs.y * 5.0) + vec3(0.0, 0.35, 0.0) + vUp * (1.6 * lip));
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 rime = texture2D(tSalt, vWorld.xz * 2.0 + vWorld.y * 1.3 + uSeed).rgb / RIME_MEAN;
  // Every read of a picture comes before any discard: the software renderer leaves the slopes of a dropped pixel's neighbours undefined.
  if (covered < 0.5) discard;
  if (uMirror > 0.5 && vWorld.y < -0.015) discard;
  // Salt white on the knobs, bone and dried hide between them, and the dark of the hollows kept dark.
  vec3 albedo = pic * 0.62 * mix(vec3(1.0), rime, 0.2);
  float hollow = smoothstep(0.05, 0.38, l0);
  // The bars of the ribs are all but grown over: what is left of the animal is its shape and the dark of its deepest hollows.
  vec3 crust = vec3(0.26, 0.246, 0.238) * (0.5 + 0.62 * cl);
  albedo = mix(albedo, crust, (0.5 + 0.38 * crusted) * (0.35 + 0.65 * hollow));
  // In places the crust has broken away and the hide under it shows, dark and drawn tight over what is left.
  float bare = smoothstep(0.5, 0.62, vnoise(vCard * vec2(5.0, 3.0) + uSeed * 1.3) + 0.22 * (cl - 1.0));
  albedo = mix(albedo, vec3(0.085, 0.066, 0.058) * (0.45 + 1.5 * l0), 0.88 * bare);
  hollow = mix(hollow, 1.0, 0.45);
  float above = vWorld.y - uAt.y;
  float stain = (1.0 - smoothstep(0.0, 0.16, above + 0.12 * (vnoise(vWorld.xz * 3.0 + uSeed) - 0.5)));
  // Where it meets the crust the brine wicks up into the salt and it is pink.
  albedo = mix(albedo, albedo * vec3(0.74, 0.4, 0.37), 0.8 * stain);
  float occ = (0.3 + 0.7 * hollow) * (0.6 + 0.4 * smoothstep(0.0, 0.25, above));
  vec3 c = rigShade(vWorld, n, v, albedo, 0.97, occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const BODY_DEPTH = /* glsl */ `
precision highp float;
${BODY_GLSL}
void main() {
  if (bodyCover(vUv) * (1.0 - step(bodyTop(vCard), vCard.y)) < 0.5) discard;
  gl_FragColor = vec4(0.0);
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

// Which heap each dead one is, in the order of the anchors: the three the lens of the thin crust sees are all different.
const KINDS = [1, 0, 2, 2, 0, 1];

export function create(ctx: Context): Piece {
  const rng = ctx.rng('dead');
  // TEMPORARY, until the anchors give it: where the lens of the stuck one stands. The dead it looks across are taken finer.
  const lens = rel(24.6, 19.6);
  const fineGrid = grid(140, 78);
  const coarseGrid = grid(90, 50);
  const bodyGrid = grid(40, 24);
  const bodies: { mesh: THREE.Mesh; material: THREE.ShaderMaterial }[] = [];
  const nearest = DEAD.reduce((a, b) => (Math.hypot(a.d - STUCK[0], a.l - STUCK[1]) < Math.hypot(b.d - STUCK[0], b.l - STUCK[1]) ? a : b));
  const tPic = ctx.assets.texture('mat/deadone.jpg', { kind: 'colour', repeat: false });
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
    const high = (0.3 - 0.1 * under) * d.size * rng.range(0.85, 1.1);
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
    // The body: about three metres of it, sunk in its apron to a different depth each, the furthest gone the deepest.
    const kind = KINDS[bodies.length % KINDS.length] as number;
    const crop: [number, number] = kind === 1 ? [0, 0.72] : kind === 2 ? [0.22, 1] : [0, 1];
    const wide = 3.3 * d.size * rng.range(0.75, 1.2) * (crop[1] - crop[0]) * (kind === 0 ? 1 : 1.15);
    const bodyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ...ctx.rig.uniforms,
        tPic: { value: tPic },
        tRelief: { value: tRelief },
        tSalt: { value: tSalt },
        uFlip: { value: rng.next() < 0.5 ? 1 : 0 },
        uAt: { value: new THREE.Vector4(p[0], ground + 0.04, p[1], under ? 0 : (rng.next() < 0.5 ? -1 : 1) * rng.range(0.12, 0.42)) },
        uShape: { value: new THREE.Vector4(kind, crop[0], crop[1], rng.range(0, 6)) },
        uBody: { value: new THREE.Vector4(wide, (wide * 941) / 1672 / (crop[1] - crop[0]) / (kind === 0 ? 1 : 1.15), under ? 0.95 : rng.range(0.45, 0.85), under ? 0.6 : rng.range(0.22, 0.5)) },
        uSeed: { value: rng.range(1, 60) },
      },
      vertexShader: BODY_VERTEX,
      fragmentShader: BODY_FRAGMENT,
      side: THREE.DoubleSide,
    });
    bodyMaterial.userData.depthFragment = BODY_DEPTH;
    const body = new THREE.Mesh(bodyGrid, bodyMaterial);
    body.frustumCulled = false;
    bodies.push({ mesh: body, material: bodyMaterial });
  }
  // The live one: sunk to the shoulders, head up, working to get out and getting nowhere.
  const at = rel(STUCK[0], STUCK[1]);
  const yaw = relYaw(-0.97, -0.03);
  // The crust has given way under it: the land's hollow is 0.2 m deep here, and the rig's land height does not include it.
  const ground = Math.min(0.1, ctx.rig.land.height(at[0], at[1])) - 0.2;
  const stuck = new Beast(ctx, { k: 1, young: 0, seed: 23.7, bulk: 1, salt: 0.5 }, { cell: 0.024, wet: ground + 0.14, mudded: 1, relief: 0.022, tendrils: 26 });
  const live = newDrive();
  const mud = mudWallow(ctx, at[0], at[1], [Math.cos(yaw), -Math.sin(yaw)], 0.5, [0.1, 0.072, 0.054], 'dead-mud', 0.6, 0.2);
  // Round each dead one the crust is stained dark: what ran out of it, and the mud it sank into.
  const stains = cards.map((c, i) => mudWallow(ctx, c.x, c.z, [Math.cos(c.yaw), -Math.sin(c.yaw)], 0.14 * c.size, [0.05, 0.022, 0.017], 'dead-stain-' + i, 1));
  const meshes = [...cards.map((c) => c.mesh), ...bodies.map((b) => b.mesh), stuck.mesh, stuck.feelers, mud.mesh, ...stains.map((w) => w.mesh)];
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
      live.splay = 0.2 + 0.25 * heave;
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
      mud.set(heave, seconds);
    },
    dispose: () => {
      fineGrid.dispose();
      coarseGrid.dispose();
      for (const c of cards) c.material.dispose();
      for (const b of bodies) b.material.dispose();
      bodyGrid.dispose();
      stuck.dispose();
      mud.dispose();
      for (const w of stains) w.dispose();
    },
  };
}
