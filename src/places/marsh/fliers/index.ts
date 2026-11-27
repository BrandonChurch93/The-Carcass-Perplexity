// The fliers: long four-winged insects the length of a hand, hanging and darting over the tops of the stalk colonies; a string of great ones
// that crosses the far flats; and the midges that dance in columns over the brine where the wallowers root.
import * as THREE from 'three';
import { EYE_HEIGHT, R, T0, TAU, UNIT, keyTime, makePools, makeStalks, rel } from '../shared/anchors';
import { secondsInPlace, shotsOf } from '../../../film/cut';
import { stagedSeconds } from '../shared/stage';
import type { Context, Piece } from '../shared/context';
import { RIG_GLSL } from '../shared/glsl';

export const PARTS: readonly string[] = ['fliers'];

/** The second of the place at which the wide shot is cut: half way from its key to the key of the colony. */
const WIDE_ENDS = 0.5 * (T0 + keyTime('marsh-2')) + 0.005;

const VERTEX = /* glsl */ `
attribute vec4 aStart;
attribute vec4 aWay;
uniform float uSeconds;
uniform vec2 uHeading;
uniform float uFrom;
uniform float uString;
varying vec3 vWorld;
varying float vFar;
varying float vPair;
varying vec3 vNormal;
varying float vTone;
vec3 hash3(float n) {
  return fract(sin(vec3(n, n + 17.3, n + 41.7) * vec3(127.1, 269.5, 419.2)) * 43758.5453);
}
// One of the colonies hangs in the air over its stalk, and darts to another place over it: the places it hangs at, one after another.
vec3 hangAt(float n) {
  vec3 h = hash3(n * 1.37 + aWay.x * 57.0) - 0.5;
  return aStart.xyz + vec3(h.x * 4.4 * aStart.w, h.y * 0.9, h.z * 4.4 * aStart.w);
}
float dartRate() {
  return 0.5 + 0.34 * fract(aWay.y * 3.7);
}
vec3 flierAt(float t) {
  if (aStart.w < 0.0) {
    // One of the far string goes on at its own speed (aStart.w below nought), on a line that bends slowly, weaving, and rises and sinks on the air.
    float run = -aStart.w * (t - uFrom);
    float weave = 2.2 * sin(t * 0.61 + aWay.x) + 0.8 * sin(t * 1.53 + aWay.y);
    vec2 side = vec2(-uHeading.y, uHeading.x);
    float climb = 1.1 * sin(t * 0.83 + aWay.y) + 0.5 * sin(t * 1.9 + aWay.x);
    return aStart.xyz + vec3(uHeading.x, 0.0, uHeading.y) * run + vec3(side.x, 0.0, side.y) * (weave - 0.004 * run * run) + vec3(0.0, climb + 0.02 * run, 0.0);
  }
  float u = t * dartRate() + aWay.w;
  float n = floor(u);
  float f = u - n;
  float go = smoothstep(0.55, 1.0, f);
  vec3 p = mix(hangAt(n), hangAt(n + 1.0), go * go * (3.0 - 2.0 * go));
  // Where it hangs it is not still: it is held on its wings.
  return p + vec3(0.05 * sin(t * 7.1 + aWay.x), 0.06 * sin(t * 5.3 + aWay.y), 0.05 * sin(t * 6.3 + aWay.w));
}
vec3 headingAt(float t) {
  if (aStart.w < 0.0) return normalize(flierAt(t + 0.2) - flierAt(t - 0.2));
  // It turns where it hangs to the way it will go, and then goes.
  float u = t * dartRate() + aWay.w;
  float n = floor(u);
  float f = u - n;
  vec3 was = hangAt(n) - hangAt(n - 1.0);
  vec3 will = hangAt(n + 1.0) - hangAt(n);
  vec3 d = mix(normalize(was), normalize(will), smoothstep(0.12, 0.5, f));
  d.y *= 0.3;
  return normalize(d + vec3(0.0001, 0.0, 0.0));
}
void main() {
  float t = uSeconds;
  vec3 at = flierAt(t);
  vec3 fwd = headingAt(t);
  vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  // It banks into its weave.
  float bank = aStart.w < 0.0 ? 0.45 * cos(t * 0.61 + aWay.x) : 0.3 * sin(t * 2.3 + aWay.x);
  vec3 up = cross(right, fwd);
  vec3 r2 = right * cos(bank) + up * sin(bank);
  vec3 u2 = up * cos(bank) - right * sin(bank);
  // position: x along the body, y up, z out along the wing. uv.x: 0 the body, 1 the fore wings, 2 the hind wings.
  float pair = uv.x;
  float span = abs(position.z);
  float rate = 9.0 / aWay.z;
  // Bursts of beats and glides between them. The stroke runs out along the wing, and the hind pair comes a quarter beat after the fore pair.
  float work = 0.55 + 0.45 * sin(t * 0.37 + aWay.w);
  float ph = t * rate + aWay.w - (pair - 1.0) * 1.57;
  float stroke = work * (0.62 * sin(ph - 0.45 * span) + 0.1 * sin(2.0 * ph - 0.9 * span)) + 0.12;
  vec3 local = position;
  if (pair > 0.5) {
    local.y += span * sin(stroke);
    local.z = sign(position.z) * span * cos(stroke);
  }
  // The body rides against the wings: down as they go up.
  local.y -= 0.16 * work * sin(ph) * step(pair, 0.5) + 0.16 * work * sin(ph) * step(0.5, pair);
  // The far string is on the set for the wide shot only: uString is nought in every other.
  vec3 p = at + (fwd * local.x + u2 * local.y + r2 * local.z) * aWay.z * 0.8 * (aStart.w < 0.0 ? uString : 1.0);
  vWorld = p;
  vec3 ln = pair > 0.5 ? vec3(0.0, cos(stroke), -sign(position.z) * sin(stroke)) : normal;
  vNormal = normalize(fwd * ln.x + u2 * ln.y + r2 * ln.z);
  vTone = uv.y;
  vFar = aStart.w < 0.0 ? 1.0 : 0.0;
  vPair = pair;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vTone;
varying float vFar;
varying float vPair;
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  if (dot(n, v) < 0.0) n = -n;
  // By the stalks: an amber body and pale wings the sky comes through. The far string is dark against the sky, as anything is at that distance.
  float wing = step(0.5, vPair) * (1.0 - vFar);
  vec3 albedo = mix(mix(vec3(0.2, 0.1, 0.035), vec3(0.46, 0.26, 0.09), vTone), vec3(0.4, 0.36, 0.31), wing);
  albedo = mix(albedo, vec3(0.06, 0.05, 0.05), vFar);
  vec3 c = rigShade(vWorld, n, v, albedo, 0.6, 1.0);
  c += wing * 0.6 * rigShade(vWorld, -n, v, albedo, 0.9, 1.0);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The midges: each goes round and round in its own knot inside the column, and the column leans and drifts on the air over the brine.
const MIDGE_VERTEX = /* glsl */ `
attribute vec4 aHome;
attribute vec4 aOwn;
uniform float uSeconds;
uniform float uShown;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vWing;
vec3 midgeAt(float t) {
  vec3 w = 2.4 + 3.6 * fract(aOwn.xyz * vec3(7.1, 3.3, 5.7));
  vec3 p = vec3(sin(t * w.x + aOwn.x * 40.0), sin(t * w.y + aOwn.y * 40.0), sin(t * w.z + aOwn.z * 40.0));
  p = 0.62 * p + 0.38 * vec3(sin(t * w.y * 2.3 + aOwn.z * 17.0), sin(t * w.z * 2.7 + aOwn.x * 23.0), sin(t * w.x * 2.1 + aOwn.y * 31.0));
  vec3 c = aHome.xyz + vec3(0.16 * sin(t * 0.5 + aHome.x), 0.07 * sin(t * 0.7 + aHome.z), 0.16 * sin(t * 0.43 + aHome.z));
  // The column is taller than it is wide, and leans as the air moves it.
  c.xz += (p.y + 1.0) * 0.12 * vec2(sin(t * 0.31 + aHome.z), cos(t * 0.27 + aHome.x));
  return c + p * aHome.w * vec3(1.0, 1.5, 1.0) * (0.3 + 0.7 * aOwn.w);
}
void main() {
  float t = uSeconds;
  vec3 at = midgeAt(t);
  vec3 fwd = normalize(midgeAt(t + 0.03) - midgeAt(t - 0.03) + vec3(0.00001, 0.0, 0.0));
  vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)) + vec3(0.0, 0.0, 0.00001));
  vec3 up = cross(right, fwd);
  // Its wings are a blur: they are drawn where the stroke is at this instant, and no two are in time.
  float beat = sin(t * 190.0 + aOwn.w * 60.0);
  vec3 local = position;
  if (uv.x > 0.5) local.y += abs(position.z) * 0.9 * beat;
  vec3 p = at + (fwd * local.x + up * local.y + right * local.z) * (0.012 + 0.008 * aOwn.z) * uShown;
  vWorld = p;
  vNormal = normalize(fwd * normal.x + up * normal.y + right * normal.z);
  vWing = uv.x;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const MIDGE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vWing;
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  if (dot(n, v) < 0.0) n = -n;
  // Pale and half clear: a straw body and wings the sky shows through. Lit by the sky alone: at a pixel wide a glint is a white dot and a dark body a black one.
  vec3 albedo = mix(vec3(0.2, 0.165, 0.12), vec3(0.34, 0.32, 0.29), step(0.5, vWing));
  vec3 c = albedo * skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.7 + 0.3 * n.y) / 3.14159;
  gl_FragColor = vec4(rigOut(c), mix(0.6, 0.28, step(0.5, vWing)));
}`;

const WALLOW_SHOT = shotsOf(UNIT).find((s) => s.id === 'marsh-04');
const WALLOW_SPAN: [number, number] = WALLOW_SHOT ? [secondsInPlace(UNIT, WALLOW_SHOT.first) - 0.004, secondsInPlace(UNIT, WALLOW_SHOT.last) + 0.004] : [0, -1];

function makeMidges(ctx: Context): { mesh: THREE.Mesh; material: THREE.ShaderMaterial; geometry: THREE.InstancedBufferGeometry } {
  const rng = ctx.rng('midges');
  // A body like a grain of rice and two wings laid back from the shoulders.
  const position = [0.5, 0, 0, -0.5, 0, 0, 0, 0.16, 0, 0, -0.16, 0, 0, 0, 0.16, 0, 0, -0.16, 0.15, 0.1, 0.05, -0.45, 0.12, 0.75, -0.55, 0.1, 0.2, 0.15, 0.1, -0.05, -0.45, 0.12, -0.75, -0.55, 0.1, -0.2];
  const normal = [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
  const uv = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
  const index = [0, 2, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2, 1, 4, 2, 1, 3, 4, 1, 5, 3, 1, 2, 5, 6, 7, 8, 9, 11, 10];
  // STAGED for the lens of the wallowers: columns over the brine beyond the young one. None before the one that lies in it: so near the lens they drew as specks on the brine.
  const columns: { d: number; l: number; y: number; r: number; n: number }[] = [
    { d: 38.6, l: 7.6, y: 1.1, r: 0.5, n: 90 },
    { d: 41.5, l: 5.2, y: 1.3, r: 0.6, n: 80 },
  ];
  const count = columns.reduce((sum, c) => sum + c.n, 0);
  const home = new Float32Array(count * 4);
  const own = new Float32Array(count * 4);
  let i = 0;
  for (const c of columns) {
    const at = rel(c.d, c.l);
    for (let j = 0; j < c.n; j++, i++) {
      home.set([at[0], c.y, at[1], c.r], i * 4);
      own.set([rng.next(), rng.next(), rng.next(), Math.sqrt(rng.next())], i * 4);
    }
  }
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.setAttribute('aHome', new THREE.InstancedBufferAttribute(home, 4));
  geometry.setAttribute('aOwn', new THREE.InstancedBufferAttribute(own, 4));
  geometry.instanceCount = count;
  const material = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, uSeconds: { value: 0 }, uShown: { value: 0 } },
    vertexShader: MIDGE_VERTEX,
    fragmentShader: MIDGE_FRAGMENT,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  return { mesh, material, geometry };
}

export function create(ctx: Context): Piece {
  const rng = ctx.rng('fliers');
  const NEAR = 28;
  // The string of them that crosses the far flats, low over the horizon of the wide view.
  const STRING = 9;
  const COUNT = NEAR + STRING;
  const tall = makeStalks(makePools()).filter((st) => st.kind !== 2 && st.h > 1.2 && Math.hypot(st.x, st.z) < 45);
  const position: number[] = [];
  const normal: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  // The body: a long spindle with a whip of a tail.
  const RINGS = 9;
  const SIDES = 6;
  for (let i = 0; i <= RINGS; i++) {
    const u = i / RINGS;
    const x = 0.9 - 2.6 * u;
    const r = u < 0.45 ? 0.17 * Math.sin(Math.PI * Math.min(1, u / 0.45 + 0.08) ** 0.7) : 0.035 * (1 - u) + 0.006;
    for (let j = 0; j < SIDES; j++) {
      const a = (j / SIDES) * TAU;
      position.push(x, Math.cos(a) * r * 0.8, Math.sin(a) * r * 1.2);
      normal.push(0, Math.cos(a), Math.sin(a));
      uv.push(0, 0.3 + 0.4 * Math.max(0, Math.cos(a)));
    }
  }
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < SIDES; j++) {
      const a = i * SIDES + j;
      const b = i * SIDES + ((j + 1) % SIDES);
      index.push(a, b, a + SIDES, b, b + SIDES, a + SIDES);
    }
  }
  // Two pairs of long narrow wings, each a strip of six parts so that the stroke can run out along it.
  const wing = (x: number, length: number, chord: number, sweep: number, pair: number, side: number): void => {
    const start = position.length / 3;
    const N = 6;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const c = chord * (1 - 0.75 * u * u);
      const z = side * (0.1 + length * u);
      const xm = x - sweep * u * u;
      position.push(xm + c * 0.4, 0, z, xm - c * 0.6, 0, z);
      normal.push(0, 1, 0, 0, 1, 0);
      uv.push(pair, 0.5 * u, pair, 0.9);
    }
    for (let i = 0; i < N; i++) {
      const a = start + i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  };
  for (const side of [-1, 1]) {
    wing(0.45, 1.9, 0.46, 0.5, 1, side);
    wing(-0.15, 1.2, 0.34, 0.6, 2, side);
  }
  const base = new THREE.BufferGeometry();
  base.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  base.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  base.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  base.setIndex(index);

  const start = new Float32Array(COUNT * 4);
  const way = new Float32Array(COUNT * 4);
  for (let i = 0; i < NEAR; i++) {
    // Each keeps to the top of one stalk of the colonies by the pool and the vein.
    const perch = tall[rng.int(tall.length)] as (typeof tall)[number];
    start.set([perch.x + rng.range(-0.8, 0.8), perch.h + rng.range(0.3, 1.2), perch.z + rng.range(-0.8, 0.8), rng.range(0.6, 1.6)], i * 4);
    // The larger the slower its beat.
    const size = rng.range(0.05, 0.085);
    way.set([rng.range(0, TAU), rng.range(0, TAU), size, rng.range(0, TAU)], i * 4);
  }
  for (let j = 0; j < STRING; j++) {
    const i = NEAR + j;
    // A loose line, the leaders higher: 130 metres out and to the left of the wide lens, going to its right, each at its own ten to thirteen metres a second.
    const at = rel(128 + rng.range(-9, 9) - 1.5 * j, -40 + 3.4 * j + rng.range(-1.2, 1.2));
    start.set([at[0], EYE_HEIGHT + 0.9 + 0.28 * j + rng.range(-0.4, 0.4), at[1], -rng.range(9.5, 13)], i * 4);
    way.set([rng.range(0, TAU), rng.range(0, TAU), rng.range(0.55, 0.78), rng.range(0, TAU)], i * 4);
  }
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  for (const name of ['position', 'normal', 'uv']) g.setAttribute(name, base.attributes[name] as THREE.BufferAttribute);
  g.setAttribute('aStart', new THREE.InstancedBufferAttribute(start, 4));
  g.setAttribute('aWay', new THREE.InstancedBufferAttribute(way, 4));
  g.instanceCount = COUNT;
  const material = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, uSeconds: { value: 0 }, uFrom: { value: T0 }, uString: { value: 1 }, uHeading: { value: new THREE.Vector2(R[0], R[1]) } },
    vertexShader: VERTEX.replace('TAU_F', '6.2831853'),
    fragmentShader: FRAGMENT,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, material);
  mesh.frustumCulled = false;
  const midges = makeMidges(ctx);
  ctx.parts.built('fliers', mesh, midges.mesh);
  ctx.scene.add(mesh);
  ctx.scene.add(midges.mesh);
  return {
    setTime: (seconds) => {
      (material.uniforms.uSeconds as THREE.IUniform<number>).value = seconds;
      // STAGED for the wide shot: the far string crosses its sky and no other.
      (material.uniforms.uString as THREE.IUniform<number>).value = stagedSeconds() < WIDE_ENDS ? 1 : 0;
      const staged = stagedSeconds();
      (midges.material.uniforms.uSeconds as THREE.IUniform<number>).value = seconds;
      (midges.material.uniforms.uShown as THREE.IUniform<number>).value = staged >= WALLOW_SPAN[0] && staged <= WALLOW_SPAN[1] ? 1 : 0;
    },
    dispose: () => {
      g.dispose();
      material.dispose();
      midges.geometry.dispose();
      midges.material.dispose();
    },
  };
}
