// Everything molten of the lake that lies open in a wide gap: the melt as a surface of its own, below the brim of the crust.
// A ribbon lies along each seam the pictures show, flat, at the level of that seam (meltLevel in heat.ts), wider than the gap:
// the crust cuts the gap and builds its walls, and the depth test leaves of the ribbon what shows at the bottom.
// The ribbon carries a coordinate along the seam and across it. The pattern of the melt (hot streaks of the core, plates of
// skin, the creases where the skin tears, the ropes where it is pushed) is carried downstream in it, fastest in the middle,
// as a pure function of time: two copies half a cycle apart, cross-faded, so the shear never winds up and nothing pops.
import * as THREE from 'three';
import type { HeartContext } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { SEAMS, seamLine } from '../shared/anchors';
import type { Net } from './net';
import { HEAT_GLSL } from './heat';

export interface LavaPiece {
  setTime(seconds: number): void;
  solo(part: string | null): void;
  dispose(): void;
}

// The seams of net.ts as it bakes them: half width at the two ends and the middle, how lumpy, the heat class.
// A copy, because net.ts does not export them yet (asked of the crust owner): keep the two the same.
const AUTHORED: Record<string, { half: [number, number, number]; lumps: number; heat: number }> = {
  line: { half: [0.55, 0.85, 0.3], lumps: 0.45, heat: 0.0 },
  group: { half: [0.45, 1.05, 0.4], lumps: 0.75, heat: 0.08 },
  nearA: { half: [0.1, 0.3, 0.14], lumps: 0.55, heat: 0.2 },
  nearB: { half: [0.14, 0.26, 0.08], lumps: 0.55, heat: 0.25 },
  spatterRight: { half: [0.5, 2.3, 0.5], lumps: 0.5, heat: 1.5 },
  spatterLeft: { half: [0.4, 1.7, 0.4], lumps: 0.5, heat: 1.5 },
};
const OWN: { line: [number, number][]; half: [number, number, number]; lumps: number; heat: number }[] = [
  { line: [[-497.6, 191.5], [-499.3, 188.0]], half: [0.4, 0.32, 0.1], lumps: 0.4, heat: 0.0 },
  { line: [[-497.0, 190.0], [-494.6, 186.2]], half: [0.4, 0.3, 0.08], lumps: 0.4, heat: 0.0 },
  { line: [[-496.5, 188.5], [-497.4, 184.6]], half: [0.4, 0.26, 0.08], lumps: 0.4, heat: 0.0 },
  { line: [[-398.0, 60.0], [-344.0, 80.0]], half: [0.5, 1.3, 0.4], lumps: 0.6, heat: 0.05 },
  { line: [[-427.9, 205.1], [-427.1, 208.5]], half: [0.04, 0.16, 0.03], lumps: 0.9, heat: 0.08 },
  { line: [[-416.7, 207.2], [-413.8, 208.8]], half: [0.04, 0.21, 0.03], lumps: 0.9, heat: 0.15 },
  { line: [[-427.3, 212.2], [-424.3, 215.3]], half: [0.04, 0.26, 0.03], lumps: 0.9, heat: 0.22 },
  { line: [[-414.2, 185.3], [-411.8, 186.8]], half: [0.04, 0.16, 0.03], lumps: 0.9, heat: 0.08 },
  { line: [[-397.8, 185.9], [-395.8, 190.2]], half: [0.04, 0.21, 0.03], lumps: 0.9, heat: 0.15 },
  { line: [[-396.5, 170.1], [-392.0, 173.3]], half: [0.04, 0.26, 0.03], lumps: 0.9, heat: 0.22 },
  { line: [[-376.4, 164.7], [-375.1, 169.4]], half: [0.04, 0.16, 0.03], lumps: 0.9, heat: 0.08 },
  { line: [[-426.2, 193.6], [-422.3, 194.0]], half: [0.04, 0.21, 0.03], lumps: 0.9, heat: 0.15 },
];
/** Where a seam opens into a pool: the middle on the crust at the reference time, metres added to the half width, and the square of its reach. */
const POOLS: { seam: string; x: number; z: number; add: number; reach2: number }[] = [
  { seam: 'group', x: -403.4, z: 202.6, add: 1.25, reach2: 5.0 },
  { seam: 'nearA', x: -493.8, z: 225.6, add: 1.1, reach2: 4.0 },
  { seam: 'nearB', x: -491.6, z: 241.0, add: 1.1, reach2: 4.0 },
];

/** The level of a seam's melt, the same as meltLevel in heat.ts. */
const levelOf = (heat: number): number => {
  if (heat >= 1.3) return -0.5;
  const k = Math.min(1, Math.max(0, heat / 0.2));
  return -(0.55 + (0.3 - 0.55) * k * k * (3 - 2 * k));
};

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

interface Ribbon {
  name: string;
  line: [number, number][];
  half: [number, number, number];
  lumps: number;
  heat: number;
  /** Metres a second in mid stream. */
  speed: number;
}

function ribbons(): Ribbon[] {
  const out: Ribbon[] = [];
  const speeds: Record<string, number> = { line: 1.0, group: 0.75, nearA: 0.55, nearB: 0.55, spatterRight: 0.8, spatterLeft: 0.8 };
  for (const name of Object.keys(SEAMS)) {
    const shape = AUTHORED[name];
    if (!shape) continue;
    out.push({ name, line: seamLine(name, name === 'group' ? 160 : 80), half: shape.half, lumps: shape.lumps, heat: shape.heat, speed: speeds[name] ?? 0.6 });
  }
  for (const own of OWN) {
    const a = own.line[0] as [number, number];
    const b = own.line[1] as [number, number];
    const line: [number, number][] = [];
    for (let k = 0; k <= 16; k++) line.push([a[0] + ((b[0] - a[0]) * k) / 16, a[1] + ((b[1] - a[1]) * k) / 16]);
    out.push({ name: '', line, half: own.half, lumps: own.lumps, heat: own.heat, speed: 0.5 });
  }
  return out;
}

const MAX_POOLS = 4;

function build(all: Ribbon[]): { geometry: THREE.BufferGeometry; pools: THREE.Vector4[] } {
  const position: number[] = [];
  const flow: number[] = [];
  const seam: number[] = [];
  const faces: number[] = [];
  const pools: THREE.Vector4[] = [];
  all.forEach((r, which) => {
    const base = position.length / 3;
    const count = r.line.length - 1;
    // Each ribbon lies a hair above the next, so that where two cross the depth test picks one and the same every frame.
    const y = levelOf(r.heat) - 0.002 * which;
    let s = 0;
    for (let i = 0; i <= count; i++) {
      const p = r.line[i] as [number, number];
      const a = r.line[Math.max(0, i - 1)] as [number, number];
      const b = r.line[Math.min(count, i + 1)] as [number, number];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const tx = (b[0] - a[0]) / l;
      const tz = (b[1] - a[1]) / l;
      if (i > 0) {
        const before = r.line[i - 1] as [number, number];
        s += Math.hypot(p[0] - before[0], p[1] - before[1]);
      }
      const u = i / count;
      const along = u < 0.5 ? r.half[0] + (r.half[1] - r.half[0]) * smooth(0, 0.5, u) : r.half[1] + (r.half[2] - r.half[1]) * smooth(0.5, 1, u);
      let wide = along * (1 + r.lumps);
      for (const pool of POOLS) if (pool.seam === r.name) wide += pool.add * Math.exp(-((p[0] - pool.x) ** 2 + (p[1] - pool.z) ** 2) / pool.reach2);
      // The net bends the ground under a seam by up to a metre and a half: the ribbon reaches past that.
      wide += 2.1;
      for (const side of [-1, 1]) {
        position.push(p[0] - tz * wide * side, y, p[1] + tx * wide * side);
        flow.push(s, wide * side);
        seam.push(r.heat, which, r.speed, along);
      }
      if (i < count) {
        const v = base + i * 2;
        faces.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      }
    }
    for (const pool of POOLS) {
      if (pool.seam !== r.name || pools.length >= MAX_POOLS) continue;
      // Where the pool lies along its ribbon.
      let best = 1e9;
      let at = 0;
      let run = 0;
      for (let i = 0; i <= count; i++) {
        const p = r.line[i] as [number, number];
        if (i > 0) {
          const before = r.line[i - 1] as [number, number];
          run += Math.hypot(p[0] - before[0], p[1] - before[1]);
        }
        const d = Math.hypot(p[0] - pool.x, p[1] - pool.z);
        if (d < best) {
          best = d;
          at = run;
        }
      }
      pools.push(new THREE.Vector4(at, 0, Math.sqrt(pool.reach2) * 0.8, which));
    }
  });
  while (pools.length < MAX_POOLS) pools.push(new THREE.Vector4(0, 0, 1, -9));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 2));
  geometry.setAttribute('aSeam', new THREE.Float32BufferAttribute(seam, 4));
  geometry.setIndex(faces);
  return { geometry, pools };
}

const VERTEX = /* glsl */ `
attribute vec2 aFlow;
attribute vec4 aSeam;
varying vec3 vWorld;
varying vec2 vDrift;
varying vec2 vFlow;
varying vec4 vSeam;
${RIG_GLSL}
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  // The gap rides the drift of the crust, and the melt lies in it: find where this point of the crust is now.
  float dt = uTime - uFlowT0;
  vec2 d = flowVelocity(w.xz) * dt;
  d = flowVelocity(w.xz + d) * dt;
  d = flowVelocity(w.xz + d) * dt;
  w.xz += d;
  vDrift = d;
  vWorld = w.xyz;
  vFlow = aFlow;
  vSeam = aSeam;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vDrift;
varying vec2 vFlow;
varying vec4 vSeam;
uniform float uLavaOn;
uniform vec4 uPoolFlow[${MAX_POOLS}];
${NOISE_GLSL}
${RIG_GLSL}
${HEAT_GLSL}

const float CYCLE = 7.0;

// The melt at a point of the pattern that the stream carries. p: metres along and across. ax: 0 in mid stream, 1 at the bank.
// push: how hard the skin is pushed here (a narrows, a bank, the slack of a pool). stir: 1 under a fountain. grain: metres a pixel.
// Returns kelvin and how much of the point is skin.
vec2 meltAt(vec2 p, float ax, float push, float stir, float grain) {
  // The core: streaks of the hottest melt, drawn out downstream.
  float streak = vnoise(vec2(p.x * 0.23, p.y * 2.7)) * 0.62 + vnoise(vec2(p.x * 0.8, p.y * 6.3) + 7.0) * 0.38;
  float core = 1395.0 + 150.0 * smoothstep(0.34, 0.72, streak) - 85.0 * ax * ax + 40.0 * stir;
  // Skin forms as plates: more of it toward the banks and where the stream is held up.
  float form = vnoise(p * vec2(0.5, 0.95) + 3.0) * 0.56 + vnoise(p * vec2(1.5, 2.4) + 11.0) * 0.3 + vnoise(p * vec2(4.3, 6.1)) * 0.14;
  float cover = form + 0.36 * ax * ax + 0.22 * push - 0.3 * stir;
  float soft = 0.03 + 0.6 * grain;
  float plate = smoothstep(0.5 - soft, 0.5 + soft, cover);
  float thick = smoothstep(0.5, 0.74, cover);
  // Pushed skin folds into ropes across the stream, bowed downstream.
  float fold = 0.5 + 0.5 * sin(p.x * 15.0 + 6.0 * vnoise(p * 0.8 + 5.0) + 2.5 * p.y);
  float ropy = smoothstep(0.25, 0.7, push + 0.5 * thick) * (1.0 - smoothstep(0.03, 0.12, grain));
  float skin = mix(1255.0, 1085.0, thick) + (fold - 0.5) * 110.0 * ropy + 40.0 * (vnoise(p * 2.9 + 23.0) - 0.5);
  // A plate tears open across the pull, and the core shows in the crease.
  float split = abs(vnoise(p * vec2(1.2, 2.6) + 19.0) - 0.5);
  float lineHalf = 0.016 + 0.5 * grain;
  float crease = (1.0 - smoothstep(lineHalf * 0.5, lineHalf, split)) * plate * min(1.0, 0.016 / lineHalf * 2.0);
  float k = mix(core, skin, plate);
  k = mix(k, core + 15.0, crease * 0.92);
  return vec2(k, plate * (1.0 - crease));
}

// An eddy winds what it holds round its middle: more the longer the copy has run.
vec2 wind(vec2 p, vec2 middle, float reach, float turn) {
  vec2 rel = p - middle;
  float a = turn * exp(-dot(rel, rel) / (reach * reach));
  float c = cos(a);
  float s = sin(a);
  return middle + vec2(rel.x * c - rel.y * s, rel.x * s + rel.y * c);
}

void main() {
  vec2 q = vWorld.xz - vDrift;
  vec4 n = netAt(q);
  float gape = max(gapeAt(q, n).x, 0.02);
  float d = n.r + tornAt(q) * smoothstep(0.0, 0.3, n.a);
  float bank = d - gape;
  float ax = clamp(d / gape, 0.0, 1.0);
  float stir = step(1.3, vSeam.x);
  float grain = max(length(dFdx(q)), length(dFdy(q)));

  // How fast the stream runs here: fastest in mid stream and in a narrows, slowest at the banks and in the slack of a pool.
  float pool = 0.0;
  vec2 poolAt = vec2(0.0);
  float poolReach = 1.0;
  for (int i = 0; i < ${MAX_POOLS}; i++) {
    if (abs(uPoolFlow[i].w - vSeam.y) > 0.5) continue;
    vec2 rel = vFlow - uPoolFlow[i].xy;
    float g = exp(-dot(rel, rel) / (uPoolFlow[i].z * uPoolFlow[i].z * 2.2));
    if (g > pool) {
      pool = g;
      poolAt = uPoolFlow[i].xy;
      poolReach = uPoolFlow[i].z;
    }
  }
  float narrow = 1.0 - smoothstep(0.3, 1.2, gape);
  float slowest = 0.3 * vSeam.z;
  float fast = vSeam.z * (0.3 + (0.6 + 0.3 * narrow) * (1.0 - ax * ax) * (1.0 - 0.75 * pool));
  float push = clamp(0.55 * narrow + 0.5 * smoothstep(0.55, 1.0, ax) + 0.6 * pool, 0.0, 1.0);

  // Two copies of the pattern, half a cycle apart. Each starts unsheared and is carried for a cycle; it is at full weight in
  // the middle of its run and at none when it starts again. The cycle is out of step from place to place, so the lake never pulses as one.
  float phase = uTime / CYCLE + 1.7 * vnoise(q * 0.21 + vSeam.y * 3.1);
  vec2 kelvin = vec2(0.0);
  float total = 0.0;
  for (int copy = 0; copy < 2; copy++) {
    float ph = phase + 0.5 * float(copy);
    float run = fract(ph) * CYCLE;
    float weight = smoothstep(0.0, 0.42, 1.0 - abs(2.0 * fract(ph) - 1.0));
    float turnOf = floor(ph);
    vec2 p = vFlow;
    // Eddies stand behind the islands and in the slack of the bends: one in every few metres of bank, turning with the stream beside it.
    float cell = floor(p.x / 4.2);
    for (int e = -1; e <= 1; e++) {
      vec2 h = hash22(vec2(cell + float(e), vSeam.y * 7.0 + 1.0));
      float side = h.y < 0.5 ? -1.0 : 1.0;
      vec2 middle = vec2((cell + float(e) + 0.2 + 0.6 * h.x) * 4.2, side * (0.25 + 0.5 * fract(h.y * 7.3)) * (0.4 + vSeam.w));
      p = wind(p, middle, 0.28 + 0.3 * fract(h.x * 5.7), side * 0.75 * run);
    }
    p = wind(p, poolAt, poolReach * 0.9, 0.42 * run * step(0.01, pool));
    p.x -= slowest * uTime + (fast - slowest) * run;
    p += vec2(turnOf * 17.31 + vSeam.y * 9.7, turnOf * 5.17 + float(copy) * 31.0);
    kelvin += meltAt(p, ax, push, stir, grain) * weight;
    total += weight;
  }
  kelvin /= total;
  float k = kelvin.x;
  float skin = kelvin.y;
  // The melt breathes with the lake.
  k += 35.0 * (beatAt(q) - 0.5) * (0.4 + 0.6 * pool);

  // Against the bank a thin dark skin clings, torn, and the glow shows through the tears. Where the stream shears past it a bright line opens.
  float inside = -bank;
  float reach = 0.1 + 0.34 * vnoise(q * 0.9 + 4.0) + 0.1 * vnoise(q * 3.7 + 1.0);
  float torn = smoothstep(0.5, 0.66, vnoise(q * 3.3 + vec2(9.0, uTime * 0.04)) * 0.62 + vnoise(q * 9.5) * 0.38);
  float cling = (1.0 - smoothstep(reach * 0.55, reach, inside + 0.06 * (vnoise(q * 14.0) - 0.5))) * (1.0 - torn * smoothstep(0.02, 0.09, inside));
  float shear = (1.0 - smoothstep(0.0, 0.03 + grain, abs(inside - reach))) * smoothstep(0.42, 0.62, vnoise(q * 1.4 + vec2(uTime * 0.11, 0.0))) * (1.0 - pool);
  k = mix(k, 905.0 + 150.0 * vnoise(q * 6.1 + 2.0), cling);
  skin = max(skin, cling);
  k = mix(k, 1430.0, shear * 0.85 * (1.0 - cling));
  // Under the crust nothing glows.
  k = mix(k, 820.0, smoothstep(0.0, 0.08, bank));

  // The skin has a sheen of the sky; the open melt shows nothing but its own heat.
  vec3 v = normalize(cameraPosition - vWorld);
  float fresnel = 0.04 + 0.5 * pow(1.0 - clamp(v.y, 0.0, 1.0), 5.0);
  vec3 sheen = skin * (0.02 * skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159 + fresnel * 0.35 * skyRadiance(vec3(-v.x, abs(v.y) + 0.25, -v.z))) * landAt(vWorld.xz).g * 0.6;
  gl_FragColor = vec4(rigOut(sheen) + blackbody(k) * uLavaOn, 1.0);
}`;

export function createLava(ctx: HeartContext, _net: Net, shared: Record<string, THREE.IUniform>): LavaPiece {
  const all = ribbons();
  const { geometry, pools } = build(all);
  const on = { value: 1 };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { ...shared, uLavaOn: on, uPoolFlow: { value: pools } },
  });
  const melt = new THREE.Mesh(geometry, material);
  melt.frustumCulled = false;
  melt.renderOrder = 1;
  // The part 'lava' is registered by the crust as an effect of the lake: alone, it is everything molten with the rest blacked.
  ctx.scene.add(melt);

  return {
    setTime: () => undefined,
    solo: (part) => {
      on.value = part === null || part === 'heart/lava' ? 1 : 0;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
