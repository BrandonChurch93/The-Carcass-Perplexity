// Foundering: at the two fountain lines a plate of the crust tilts and slides under, and a ragged line of spatter is thrown up
// where the lava wells over it. The spatter is gobs and torn sheets on arcs, every one a pure function of time.
import * as THREE from 'three';
import type { HeartContext } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { SPATTER_LEFT, SPATTER_RIGHT, seamLine } from '../shared/anchors';
import { blackbody } from '../shared/rig';
import { outline } from './outline';

/** The two plates that go under. `at` is the middle of the plate at the reference time, `toward` the bearing of the edge that dips first. */
export const FOUNDERS = [
  { line: 'spatterRight', at: [-408.8, 267.8] as [number, number], size: [13, 8.5] as [number, number], turn: 0.71, begins: -3, lasts: 30, seed: 3 },
  { line: 'spatterLeft', at: [-472.5, 130.2] as [number, number], size: [7, 4.6] as [number, number], turn: 0.467, begins: 4, lasts: 26, seed: 8 },
];

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const SPATTER_VERTEX = /* glsl */ `
attribute vec3 aOrigin;
attribute vec3 aThrow;
attribute vec4 aLife;
varying vec2 vUv;
varying vec3 vWorld;
varying vec4 vGob;
varying vec2 vFlight;
varying vec3 vShape;
${NOISE_GLSL}
uniform float uTime;
void main() {
  float period = aLife.x;
  float turn = (uTime + aLife.y * period) / period;
  float launch = floor(turn);
  float age = fract(turn) * period;
  float seed = aOrigin.y;
  float r1 = hash12(vec2(seed * 91.7, launch));
  float r2 = hash12(vec2(launch, seed * 53.3 + 1.7));
  // A fountain comes in bursts: what leaves the vent together leaves with the same strength.
  float when = uTime - age;
  float burst = 0.62 + 0.38 * sin(when * 2.3 + aOrigin.x * 0.21) * sin(when * 0.9 + aOrigin.z * 0.17 + 1.0);
  vec3 vel = aThrow * (0.55 + 0.6 * r1) * burst;
  vel.xz += (vec2(r2, fract(r2 * 7.31)) - 0.5) * 2.5;
  vec3 at = vec3(aOrigin.x, 0.1, aOrigin.z) + vel * age + vec3(0.0, -4.9 * age * age, 0.0);
  vec3 now = vel + vec3(0.0, -9.8 * age, 0.0);
  float size = aLife.z * (0.7 + 0.6 * r2);
  float jet = aLife.w;
  // A jet stands on the seam: a tongue of melt that rises with the burst and falls back, torn at its top.
  float jetBurst = 0.62 + 0.38 * sin(uTime * 2.3 + aOrigin.x * 0.21) * sin(uTime * 0.9 + aOrigin.z * 0.17 + 1.0);
  float jetTall = aThrow.y * 0.95 * (0.45 + 0.75 * r1) * jetBurst * pow(sin(3.14159 * fract(turn)), 0.7);
  at = mix(at, vec3(aOrigin.x, 0.1, aOrigin.z), jet);
  vec4 centre = viewMatrix * vec4(at, 1.0);
  // Never a point of light: from far a gob is drawn two to three pixels wide (at 1080 lines) and dimmer by as much as it is widened.
  float pixel = 2.0 * max(-centre.z, 0.1) / (projectionMatrix[1][1] * 1080.0);
  float drawn = max(size, 1.25 * pixel);
  vFlight = vec2(age / max(2.0 * vel.y / 9.8, 0.2), size / drawn);
  size = drawn;
  // A gob draws a tail behind it along its path, as long as it flies in a fourteenth of a second: an arc, not a speck.
  float pull = 1.0 + min(5.0, 0.035 * length(now) / size);
  vec2 along = normalize((viewMatrix * vec4(now, 0.0)).xy + vec2(1e-4, 0.0));
  vec2 across = vec2(-along.y, along.x);
  float shown = max(step(0.0, at.y) * step(0.02, age), jet);
  vec2 corner = position.xy * shown;
  float jetUp = 0.5 * (corner.y + 1.0) * jetTall;
  vec2 flown = along * (corner.y * pull - (pull - 1.0) * shown) * size + across * corner.x * size;
  vec2 stood = vec2(corner.x * size * 2.3 + (r2 - 0.5) * 0.6 * jetUp, jetUp);
  centre.xy += mix(flown, stood, jet);
  vShape = vec3(pull, jet, uTime);
  vUv = position.xy;
  vWorld = at;
  vGob = vec4(age, size, seed + launch * 0.37, aLife.w);
  gl_Position = projectionMatrix * centre;
}`;

const SPATTER_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vWorld;
varying vec4 vGob;
varying vec2 vFlight;
varying vec3 vShape;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  // Never a round dot: a ragged lump with a tail behind it, torn at the edge.
  vec2 p = vUv;
  float pull = vShape.x;
  // Metres along the path in units of the lump: 0 at its middle, 1 at its front, falling to the end of the tail.
  float ahead = p.y * pull - (pull - 1.0);
  float tail = clamp(-ahead / (2.0 * pull - 1.0), 0.0, 1.0);
  float body = ahead > 0.0 ? length(vec2(p.x, ahead)) : abs(p.x) / mix(1.0, 0.5, tail) + smoothstep(0.75, 1.0, tail);
  float ragged = vnoise(vec2(p.x, ahead) * 2.6 + vGob.z * 13.0) * 0.6 + vnoise(vec2(p.x, ahead) * 6.5 + vGob.z * 29.0) * 0.4;
  float shape = body + (ragged - 0.5) * 0.9;
  float thin = smoothstep(0.1, 0.62, shape);
  // It leaves the vent yellow and cools as it flies, small and thin parts first, and lands red.
  // About 1480 K at the vent and 1120 K where it lands. Round in its shading: hottest in its middle, a cooler rim, a cooler tail.
  float cool = vFlight.x * (0.75 + 0.5 * fract(vGob.z * 3.7)) + 0.12 * (ragged - 0.5);
  float kelvin = mix(1480.0, 1120.0, clamp(cool, 0.0, 1.0)) - 110.0 * thin * thin - 150.0 * tail;
  float gone = shape - 0.62;
  if (vShape.y > 0.5) {
    // A jet: widest and yellow at its foot, torn into shreds toward its top, where it is orange and then red.
    float up = 0.5 * (p.y + 1.0);
    float slow = vnoise(vec2(p.x * 1.6 + vGob.z * 17.0, up * 3.0 - vShape.z * 1.7 + vGob.z * 5.0));
    float quick = vnoise(vec2(p.x * 4.5 + vGob.z * 9.0, up * 8.0 - vShape.z * 3.1));
    float wide = 1.0 - 0.8 * pow(up, 0.8);
    float torn = abs(p.x - 0.7 * up * (slow - 0.5)) / wide + (0.6 * slow + 0.4 * quick - 0.5) * (0.5 + 1.7 * up);
    kelvin = mix(1530.0, 1150.0, smoothstep(0.0, 1.0, up + 0.3 * (quick - 0.5))) - 140.0 * smoothstep(0.4, 1.0, torn);
    gone = torn - 1.0;
  }
  vec3 c = blackbody(kelvin) * vFlight.y + vec3(0.004, 0.0035, 0.003) * vFlight.y;
  gl_FragColor = vec4(rigOut(c), 1.0);
  if (gone > 0.0) discard;
}`;

const SLAB_VERTEX = /* glsl */ `
attribute float aSide;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying float vSide;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vLocal = position;
  vSide = aSide;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SLAB_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying float vSide;
uniform sampler2D tSkin;
uniform sampler2D tSkinNh;
uniform vec2 uAt;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec2 q = vLocal.xz + uAt;
  vec3 skin = texture2D(tSkin, q / 5.0).rgb * 0.6 + texture2D(tSkin, vec2(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) / 19.0 + 0.31).rgb * 0.6;
  vec2 slope = (texture2D(tSkinNh, q / 5.0).rg - 0.5) * 1.2 * (1.0 - vSide);
  n = normalize(n + vec3(slope.x, 0.0, slope.y));
  vec3 c = rigShade(vWorld, n, v, skin * 0.42 * (1.0 - 0.6 * vSide), 0.75, 1.0);
  // The broken edge and the underside of a plate are still hot: red rock under a thin black skin.
  float hot = vSide * (0.35 + 0.65 * vnoise(vLocal.xz * 1.7 + vLocal.y * 3.0)) * smoothstep(0.1, -0.5, vLocal.y);
  c += blackbody(mix(820.0, 1240.0, hot));
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const DISC_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uRadiance;
void main() {
  float r = length(vUv * 2.0 - 1.0);
  gl_FragColor = vec4(uRadiance * (1.0 - smoothstep(0.2, 1.0, r)), 1.0);
}`;

const DISC_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}`;

function slabGeometry(size: [number, number], seed: number, thick: number): THREE.BufferGeometry {
  const N = 44;
  const position: number[] = [];
  const normal: number[] = [];
  const side: number[] = [];
  const rim: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = outline(a, seed);
    rim.push([Math.cos(a) * r * size[0], Math.sin(a) * r * size[1]]);
  }
  const push = (x: number, y: number, z: number, nx: number, ny: number, nz: number, s: number): void => {
    position.push(x, y, z);
    normal.push(nx, ny, nz);
    side.push(s);
  };
  for (let i = 0; i < N; i++) {
    const a = rim[i] as [number, number];
    const b = rim[(i + 1) % N] as [number, number];
    // The top, the wall, the underside.
    push(0, 0, 0, 0, 1, 0, 0);
    push(b[0], 0, b[1], 0, 1, 0, 0);
    push(a[0], 0, a[1], 0, 1, 0, 0);
    const ex = b[0] - a[0];
    const ez = b[1] - a[1];
    const l = Math.hypot(ex, ez) || 1;
    const nx = ez / l;
    const nz = -ex / l;
    push(a[0], 0, a[1], nx, 0, nz, 1);
    push(b[0], 0, b[1], nx, 0, nz, 1);
    push(b[0], -thick, b[1], nx, 0, nz, 1);
    push(a[0], 0, a[1], nx, 0, nz, 1);
    push(b[0], -thick, b[1], nx, 0, nz, 1);
    push(a[0], -thick, a[1], nx, 0, nz, 1);
    push(0, -thick, 0, 0, -1, 0, 1);
    push(a[0], -thick, a[1], 0, -1, 0, 1);
    push(b[0], -thick, b[1], 0, -1, 0, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  return g;
}

export interface Foundering {
  /** For the lake's shaders: where each plate is and how its top lies, so that lava shows where the plate has gone under. */
  uniforms: { uFounder: THREE.IUniform<THREE.Vector4[]>; uFounderLie: THREE.IUniform<THREE.Vector4[]>; uFounderSeed: THREE.IUniform<THREE.Vector4[]> };
  setTime(seconds: number): void;
  solo(part: string | null): void;
  dispose(): void;
}

export function createFoundering(ctx: HeartContext): Foundering {
  const group = new THREE.Group();
  const rng = ctx.rng('lake/foundering');
  const lines = [seamLine('spatterRight', 24), seamLine('spatterLeft', 16)];
  // Few: about seventy jets on the long line and four hundred lumps, of which a third are in the air at once.
  const COUNTS = [470, 170];
  const total = (COUNTS[0] as number) + (COUNTS[1] as number);
  const origin = new Float32Array(total * 3);
  const thrown = new Float32Array(total * 3);
  const life = new Float32Array(total * 4);
  let k = 0;
  lines.forEach((line, which) => {
    const tall = which === 0 ? 1 : 0.72;
    for (let i = 0; i < (COUNTS[which] as number); i++, k++) {
      // Spatter leaves from a few vents along the line, not evenly.
      const vent = (rng.int(which === 0 ? 5 : 3) + 0.5) / (which === 0 ? 5 : 3);
      const u = Math.min(0.97, Math.max(0.03, vent + rng.range(-0.11, 0.11) + 0.05 * (rng.next() - 0.5)));
      const f = u * (line.length - 1);
      const a = line[Math.floor(f)] as [number, number];
      const b = line[Math.min(line.length - 1, Math.floor(f) + 1)] as [number, number];
      const t = f - Math.floor(f);
      const sheet = rng.next() < 0.17 ? 1 : 0;
      origin[k * 3] = a[0] + (b[0] - a[0]) * t + rng.range(-0.8, 0.8);
      origin[k * 3 + 1] = rng.next();
      origin[k * 3 + 2] = a[1] + (b[1] - a[1]) * t + rng.range(-0.8, 0.8);
      // A low dome: most gobs rise two to four metres, the highest about six.
      const up = sheet ? rng.range(3.5, 6) : rng.range(5, 11);
      thrown[k * 3] = rng.range(-2.6, 2.6);
      thrown[k * 3 + 1] = up * tall;
      thrown[k * 3 + 2] = rng.range(-2.6, 2.6);
      life[k * 4] = rng.range(2.6, 4.0);
      life[k * 4 + 1] = rng.next();
      // Gobs of 5 to 40 cm: this is half the size.
      life[k * 4 + 2] = sheet ? rng.range(0.15, 0.3) : 0.025 + 0.175 * Math.pow(rng.next(), 2.2);
      life[k * 4 + 3] = sheet;
    }
  });
  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  quad.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(origin, 3));
  quad.setAttribute('aThrow', new THREE.InstancedBufferAttribute(thrown, 3));
  quad.setAttribute('aLife', new THREE.InstancedBufferAttribute(life, 4));
  quad.instanceCount = total;
  const spatterMaterial = new THREE.ShaderMaterial({ vertexShader: SPATTER_VERTEX, fragmentShader: SPATTER_FRAGMENT, uniforms: { ...ctx.rig.uniforms }, side: THREE.DoubleSide });
  const spatter = new THREE.Mesh(quad, spatterMaterial);
  spatter.frustumCulled = false;
  group.add(spatter);

  const skin = ctx.assets.texture('mat/crust-skin.jpg', { anisotropy: 4 });
  const skinNh = ctx.assets.texture('mat/crust-skin-nh.png', { kind: 'data', anisotropy: 4 });
  const slabs = FOUNDERS.map((f) => {
    const material = new THREE.ShaderMaterial({
      vertexShader: SLAB_VERTEX,
      fragmentShader: SLAB_FRAGMENT,
      uniforms: { ...ctx.rig.uniforms, tSkin: { value: skin }, tSkinNh: { value: skinNh }, uAt: { value: new THREE.Vector2(f.at[0], f.at[1]) } },
    });
    const mesh = new THREE.Mesh(slabGeometry(f.size, f.seed, 0.9), material);
    mesh.rotation.order = 'YXZ';
    group.add(mesh);
    return mesh;
  });
  ctx.scene.add(ctx.parts.built('foundering', group));

  // One round light a line, and its mark in the glow map.
  const centres = [SPATTER_RIGHT, SPATTER_LEFT].map((row) => {
    const c = new THREE.Vector3();
    for (const p of row) c.add(new THREE.Vector3(p[0], 0, p[2]));
    return c.multiplyScalar(1 / row.length);
  });
  const RADIUS = [8, 5];
  const HEIGHT = [5, 3.2];
  const hot = blackbody(1370);
  const emitters = centres.map((c, i) => {
    const e = { position: new THREE.Vector3(c.x, HEIGHT[i] as number, c.z), radius: RADIUS[i] as number, radiance: new THREE.Vector3() };
    ctx.rig.emitters.push(e);
    return e;
  });
  const discGeometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const discs = centres.map((c, i) => {
    const material = new THREE.ShaderMaterial({ vertexShader: DISC_VERTEX, fragmentShader: DISC_FRAGMENT, uniforms: { uRadiance: { value: new THREE.Vector3() } }, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true });
    const disc = new THREE.Mesh(discGeometry, material);
    disc.position.set(c.x, 0.5, c.z);
    disc.scale.set((RADIUS[i] as number) * 3.2, 1, (RADIUS[i] as number) * 3.2);
    disc.frustumCulled = false;
    ctx.rig.glowScene.add(disc);
    return material;
  });

  centres.forEach((c, i) => {
    ctx.sources.steam.push({ at: [c.x, 0.5, c.z], radius: i === 0 ? 15 : 8, strength: i === 0 ? 0.6 : 0.42, rise: i === 0 ? 70 : 40, kind: 'smoke', lean: [0.273, -0.119] });
    ctx.sources.heat.push({ at: [c.x, 0, c.z], radius: i === 0 ? 18 : 10, height: i === 0 ? 16 : 9, strength: i === 0 ? 0.9 : 0.7 });
  });

  const uniforms = {
    uFounder: { value: FOUNDERS.map((f) => new THREE.Vector4(f.at[0], f.at[1], 1 / f.size[0], 1 / f.size[1])) },
    uFounderLie: { value: FOUNDERS.map(() => new THREE.Vector4(0, 0, 1, 0)) },
    uFounderSeed: { value: FOUNDERS.map((f) => new THREE.Vector4(Math.cos(f.turn), Math.sin(f.turn), f.seed, 0)) },
  };

  return {
    uniforms,
    setTime: (seconds) => {
      FOUNDERS.forEach((f, i) => {
        // The plate rides the drift of the crust until it goes.
        const [x, z] = ctx.rig.flow.drift(f.at[0], f.at[1], seconds);
        const s = smooth(0, 1, (seconds - f.begins) / f.lasts);
        const tilt = 0.5 * s + 0.2 * s * s;
        const slide = 7 * s * s;
        const lift = 0.12 - 5.2 * s * s * s - 0.5 * s;
        const mesh = slabs[i] as THREE.Mesh;
        // The plate turns about its long axis and slides down along its short one.
        mesh.position.set(x - Math.sin(f.turn) * slide, lift, z + Math.cos(f.turn) * slide);
        mesh.rotation.set(tilt, -f.turn, 0.05 * Math.sin(seconds * 0.7 + i) * s);
                // The height of the plate's top over the lake at a point: lift + across * slope, across measured along the short axis.
        (uniforms.uFounderLie.value[i] as THREE.Vector4).set(lift, Math.tan(tilt), s, 0);
      });
      emitters.forEach((e, i) => {
        const burst = 0.72 + 0.28 * Math.sin(seconds * 2.3 + i * 2) * Math.sin(seconds * 0.9 + 1 + i);
        e.radiance.set(hot[0], hot[1], hot[2]).multiplyScalar(0.3 * burst);
        ((discs[i] as THREE.ShaderMaterial).uniforms.uRadiance as THREE.IUniform<THREE.Vector3>).value.set(hot[0], hot[1], hot[2]).multiplyScalar(0.22 * burst);
      });
    },
    solo: () => undefined,
    dispose: () => {
      quad.dispose();
      spatterMaterial.dispose();
      for (const s of slabs) {
        s.geometry.dispose();
        (s.material as THREE.Material).dispose();
      }
      discGeometry.dispose();
      for (const d of discs) d.dispose();
    },
  };
}
