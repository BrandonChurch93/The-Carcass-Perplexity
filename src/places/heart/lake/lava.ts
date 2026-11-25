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
import { AUTHORED, OWN as NET_OWN, type Net } from './net';
import { HEAT_GLSL } from './heat';

export interface LavaPiece {
  setTime(seconds: number): void;
  solo(part: string | null): void;
  dispose(): void;
}

// The seams of net.ts as it bakes them. Of its own lines the net bakes the first two points only, and a ribbon lies in those wide enough to open.
const OWN = NET_OWN.filter((o) => Math.max(...o.half) >= 0.15).map((o) => ({ ...o, line: o.line.slice(0, 2) }));
/** Where a seam opens into a pool: the middle on the crust at the reference time, metres added to the half width, and the square of its reach. */
const POOLS: { seam: string; x: number; z: number; add: number; reach2: number }[] = [
  { seam: 'group', x: -403.4, z: 202.6, add: 1.25, reach2: 5.0 },
  { seam: 'nearA', x: -493.8, z: 225.6, add: 1.1, reach2: 4.0 },
  { seam: 'nearB', x: -491.6, z: 241.0, add: 1.1, reach2: 4.0 },
];

/** The level of a seam's melt, the same as meltLevel in heat.ts. */
const levelOf = (heat: number): number => {
  if (heat >= 1.3) return -0.2;
  const k = Math.min(1, Math.max(0, heat / 0.2));
  return -(0.22 + (0.08 - 0.22) * k * k * (3 - 2 * k));
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
    const y = levelOf(r.heat) - 0.0015 * which;
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

const float CYCLE = 9.0;

// The melt at a point of the pattern that the stream carries. p: metres along and across. ax: 0 in mid stream, 1 at the bank.
// push: how hard the skin is pushed here (a narrows, a bank, the slack of a pool). stir: 1 under a fountain. grain: metres a pixel.
// Three things lie on a stream: the bare core in the middle third, yellow-white, drawn out in streaks; a thin skin beside it,
// orange, torn by a net of fine bright creases that the eddies wind into coils; and plates of thick skin, dark red, each of
// its own age, with the melt bright in the cracks between them: rafts of a few in mid stream, a pavement toward the banks,
// folded into ropes where they are pushed. Returns kelvin and how much of the point is skin.
vec2 meltAt(vec2 p, float ax, float push, float stir, float grain) {
  float big = vnoise(p * vec2(0.35, 1.3) + 3.0);
  float mid = vnoise(p * vec2(1.1, 3.4) + 11.0);
  float fine = vnoise(p * vec2(3.1, 9.0));
  float h = 0.1 + 0.6 * ax * ax + 0.26 * ax + 0.5 * (big - 0.5) + 0.3 * (mid - 0.5) + 0.25 * push - 0.32 * stir;
  float soft = 0.015 + 0.9 * grain;

  // The plates: cells, longer than wide.
  vec2 cellAt = p * vec2(1.45, 4.3) + 0.35 * vec2(mid, big);
  vec2 base = floor(cellAt);
  float d1 = 9.0;
  float d2 = 9.0;
  float id = 0.5;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = base + vec2(float(i), float(j));
      vec2 r = hash22(c);
      float dd = length(c + 0.12 + 0.76 * r - cellAt);
      if (dd < d1) {
        d2 = d1;
        d1 = dd;
        id = fract(r.x * 13.7 + r.y);
      } else if (dd < d2) {
        d2 = dd;
      }
    }
  }
  float between = d2 - d1;
  float age = h + 0.55 * (id - 0.5);
  float crackHalf = (0.02 + 0.03 * (1.0 - smoothstep(0.45, 0.9, age))) + 3.0 * grain;
  float plateOn = smoothstep(0.52 - soft, 0.52 + soft, age) * smoothstep(crackHalf, crackHalf * 1.8, between);

  float thin = smoothstep(0.3 - soft, 0.3 + soft, h + 0.12 * (fine - 0.5));
  float streak = vnoise(vec2(p.x * 0.4, p.y * 7.0) + 7.0);
  float core = 1508.0 + 50.0 * streak - 60.0 * smoothstep(0.05, 0.3, h);
  float skin = mix(1385.0, 1215.0, smoothstep(0.3, 0.75, h));
  // The thin skin tears along fine curved lines, and the core shows in them.
  float half1 = 0.012 + 0.6 * grain;
  float seen = min(1.0, 0.03 / half1);
  float c1 = 1.0 - smoothstep(1.2 * half1, 2.4 * half1, abs(vnoise(p * vec2(0.9, 2.8) + 19.0) - 0.5));
  float c2 = 1.0 - smoothstep(3.0 * half1, 6.0 * half1, abs(fine - 0.5));
  float crease = max(c1, 0.75 * c2) * seen;
  // Pushed skin folds into ropes across the stream.
  float fold = 0.5 + 0.5 * sin(p.x * 17.0 + 7.0 * mid + 2.0 * p.y);
  float ropy = smoothstep(0.2, 0.7, push) * (1.0 - smoothstep(0.02, 0.08, grain));
  skin += (fold - 0.5) * 60.0 * ropy;
  skin = mix(skin, 1490.0, crease);
  // A plate is darkest in its middle and where it is old, and glows toward the edge where it is thin.
  float plate = mix(1170.0, 1000.0, smoothstep(0.52, 1.0, age)) + 150.0 * (1.0 - smoothstep(0.0, 0.14, between)) + (fold - 0.5) * 90.0 * ropy + 30.0 * (fine - 0.5);
  float k = mix(mix(core, skin, thin), plate, plateOn);
  return vec2(k, max(plateOn, 0.3 * thin * (1.0 - crease)));
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
  float grain = 1.2 * sqrt(length(dFdx(q)) * length(dFdy(q)));

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
    float weight = smoothstep(0.3, 0.7, 1.0 - abs(2.0 * fract(ph) - 1.0));
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
  float reach = 0.16 + 0.42 * vnoise(q * 0.9 + 4.0) + 0.14 * vnoise(q * 3.7 + 1.0);
  float torn = smoothstep(0.5, 0.66, vnoise(q * 3.3 + vec2(9.0, uTime * 0.04)) * 0.62 + vnoise(q * 9.5) * 0.38);
  float cling = (1.0 - smoothstep(reach * 0.55, reach, inside + 0.06 * (vnoise(q * 14.0) - 0.5))) * (1.0 - torn * smoothstep(0.02, 0.09, inside));
  float shear = (1.0 - smoothstep(0.0, 0.03 + grain, abs(inside - reach))) * smoothstep(0.42, 0.62, vnoise(q * 1.4 + vec2(uTime * 0.11, 0.0))) * (1.0 - pool);
  k = mix(k, 880.0 + 170.0 * vnoise(q * 6.1 + 2.0), cling);
  skin = max(skin, cling);
  k = mix(k, 1430.0, shear * 0.85 * (1.0 - cling));
  // Under the crust nothing glows.
  k = mix(k, 820.0, smoothstep(0.0, 0.08, bank));

  // The skin has a sheen of the sky; the open melt shows nothing but its own heat.
  vec3 v = normalize(cameraPosition - vWorld);
  float fresnel = 0.04 + 0.5 * pow(1.0 - clamp(v.y, 0.0, 1.0), 5.0);
  vec3 sheen = skin * (0.02 * skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159 + fresnel * 0.35 * skyRadiance(vec3(-v.x, abs(v.y) + 0.25, -v.z))) * landAt(vWorld.xz).g * 0.6;
  gl_FragColor = vec4(rigOut(sheen) + blackbody(k) * uLavaOn, 1.0);
  // Last, after every derivative. The ribbon is wider than the gap: under the crust there is none, so a hollow of the crust never shows it.
  if (bank > 0.12) discard;
}`;

const DEPTH_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vDrift;
${NOISE_GLSL}
${RIG_GLSL}
${HEAT_GLSL}
void main() {
  vec2 q = vWorld.xz - vDrift;
  vec4 n = netAt(q);
  float bank = n.r + tornAt(q) * smoothstep(0.0, 0.3, n.a) - max(gapeAt(q, n).x, 0.02);
  gl_FragColor = vec4(0.0);
  if (bank > 0.12) discard;
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
  material.userData.depthFragment = DEPTH_FRAGMENT;
  const melt = new THREE.Mesh(geometry, material);
  melt.frustumCulled = false;
  melt.renderOrder = 1;
  // The part 'lava' is registered by the crust as an effect of the lake: alone, it is everything molten with the rest blacked.
  ctx.scene.add(melt);

  // The air over the melt. The air folder takes twelve heat sources in all and nine are taken, so three: the near channel at
  // its nearest to the line camera, the pool of the group, and one over the two near pools. Steam where each pool meets the wet crust.
  const near = all.find((r) => r.name === 'line');
  if (near) {
    let best = near.line[0] as [number, number];
    for (const p of near.line) if (Math.hypot(p[0] + 500, p[1] - 215) < Math.hypot(best[0] + 500, best[1] - 215)) best = p;
    ctx.sources.heat.push({ at: [best[0], 0, best[1]], radius: 11, height: 3.2, strength: 0.75 });
  }
  ctx.sources.heat.push({ at: [-401.5, 0, 203.3], radius: 5, height: 3.5, strength: 0.8 });
  ctx.sources.heat.push({ at: [-492.4, 0, 233.4], radius: 11, height: 2.6, strength: 0.6 });
  const wet = ctx.rng('lake/lava-steam');
  for (const [x, z, reach] of [[-401.5, 203.3, 2.0], [-493.8, 225.6, 1.6], [-491.0, 241.2, 1.6]] as const) {
    const turn = wet.range(0, Math.PI * 2);
    ctx.sources.steam.push({ at: [x + Math.cos(turn) * reach, 0.05, z + Math.sin(turn) * reach], radius: 0.35, strength: wet.range(0.3, 0.4), rise: wet.range(3, 5), kind: 'steam', lean: [-0.42, 0.2] });
  }

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
