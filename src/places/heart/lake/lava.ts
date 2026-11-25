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
  return -(0.1 + (0.08 - 0.1) * k * k * (3 - 2 * k));
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
const TONGUE = { at: 23.2, half: 1.1 };

function build(all: Ribbon[]): { geometry: THREE.BufferGeometry; pools: THREE.Vector4[] } {
  const position: number[] = [];
  const flow: number[] = [];
  const seam: number[] = [];
  const across: number[] = [];
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
        across.push(-tz, tx);
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
  geometry.setAttribute('aAcross', new THREE.Float32BufferAttribute(across, 2));
  geometry.setAttribute('aSeam', new THREE.Float32BufferAttribute(seam, 4));
  geometry.setIndex(faces);
  return { geometry, pools };
}

const VERTEX = /* glsl */ `
attribute vec2 aFlow;
attribute vec4 aSeam;
attribute vec2 aAcross;
varying vec2 vAcross;
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
  vAcross = aAcross;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vDrift;
varying vec2 vFlow;
varying vec4 vSeam;
varying vec2 vAcross;
uniform float uLavaOn;
uniform vec4 uPoolFlow[${MAX_POOLS}];
uniform vec4 uTongue;
${NOISE_GLSL}
${RIG_GLSL}
${HEAT_GLSL}

const float CYCLE = 12.0;
// One coil in so many metres of stream.
const float COIL = 2.4;
// A rope of the skin, crest to crest, and how high it stands, metres.
const float ROPE = 0.046;
const float ROPE_TALL = 0.018;

// What the stream carries, at a point of the pattern: how the ropes are pushed out of line, how alive the creases are, where the skin is stretched thin.
vec3 carriedAt(vec2 p) {
  return vec3(vnoise(p * vec2(0.5, 2.1) + 3.0), vnoise(p * vec2(0.45, 1.3) + 23.0), vnoise(p * vec2(1.3, 3.9) + 11.0) * 0.7 + vnoise(p * vec2(3.1, 9.0)) * 0.3);
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
  vec2 dqx = dFdx(q);
  vec2 dqy = dFdy(q);
  float grain = 1.2 * sqrt(length(dqx) * length(dqy));
  float longest = max(length(dqx), length(dqy));
  // Ropes finer than two pixels are not drawn: the skin shows the mean of crest and crease.
  float seen = 1.0 - smoothstep(0.016, 0.034, longest);

  // The hottest tongue does not run down the middle: it lies against one bank, and wanders a little along the channel.
  vec2 up = vec2(netAt(q + vec2(0.25, 0.0)).r, netAt(q + vec2(0.0, 0.25)).r) - n.r;
  float bankSide = dot(up, vec2(0.96, 0.27)) < 0.0 ? -1.0 : 1.0;
  float lean = mix(abs(bankSide * ax - 0.5 - 0.2 * vnoise(vec2(vFlow.x / 5.0, vSeam.y * 1.9))), ax, stir);
  // Metres across the stream from the middle of the gap as the net has it, signed, and smooth through the middle: the ribbon's own
  // middle line is up to a metre off it.
  vec2 here = vec2(vFlow.x, d * clamp(dot(up, vAcross) / 0.2, -1.0, 1.0));

  // The slack of a pool.
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

  // The skin of a stream is drawn into ropes that lie along it. psi is the line a rope follows: across the stream it counts the
  // ropes, and round a coil it counts them outward from the coil's middle, so the ropes of the stream run into the coil's rim
  // and wind round it. A coil stands in the slack against a bank, one in every few metres, as wide as the channel lets it be.
  float halfWide = max(vSeam.w * 1.15, 0.1);
  float cell = floor(vFlow.x / COIL);
  float psi = here.y;
  float held = 0.0;
  float core = 0.0;
  vec2 mids[3];
  vec2 spins[3];
  for (int e = 0; e < 3; e++) {
    float c = cell + float(e) - 1.0;
    vec2 h = hash22(vec2(c, vSeam.y * 7.0 + 1.0));
    float side = mod(c, 2.0) < 0.5 ? -1.0 : 1.0;
    float reach = (0.5 + 0.45 * fract(h.x * 5.7)) * min(1.0, halfWide / 0.8);
    vec2 middle = vec2((c + 0.25 + 0.5 * h.x) * COIL, side * max(halfWide - 0.75 * reach, 0.0));
    vec2 rel = here - middle;
    // Not a circle: a coil is pressed by the stream and by its neighbour.
    float r = length(rel * vec2(0.8, 1.0)) * (1.0 + 0.16 * sin(3.0 * atan(rel.y, rel.x) + 6.28 * h.x));
    float w = 1.0 - smoothstep(0.55 * reach, 1.2 * reach, r);
    psi = mix(psi, middle.y - side * r, w);
    held = max(held, w);
    core = max(core, 1.0 - smoothstep(0.0, 0.5 * reach, r));
    mids[e] = middle;
    // A coil turns once in 20 to 40 seconds, with the stream that passes it.
    spins[e] = vec2(reach, -side * (0.16 + 0.14 * fract(h.y * 3.1)));
  }
  psi = mix(psi, length(vFlow - poolAt) * 0.9, 0.85 * smoothstep(0.3, 0.8, pool));

  // How fast the stream runs here: fastest in mid stream and in a narrows, slowest at the banks, in a coil and in the slack of a pool.
  float narrow = 1.0 - smoothstep(0.3, 1.2, gape);
  float slowest = 0.1 * vSeam.z;
  float fast = vSeam.z * (0.1 + (0.36 + 0.2 * narrow) * (1.0 - ax * ax) * (1.0 - 0.75 * pool) * (1.0 - 0.7 * held));

  // Two copies of what the stream carries, half a cycle apart. Each starts unsheared and is carried for a cycle; it is at full weight
  // in the middle of its run and at none when it starts again. The cycle is out of step from place to place, so the lake never pulses as one.
  float phase = uTime / CYCLE + 1.7 * vnoise(q * 0.21 + vSeam.y * 3.1);
  vec3 carried = vec3(0.0);
  float lead = 0.0;
  for (int copy = 0; copy < 2; copy++) {
    float ph = phase + 0.5 * float(copy);
    float run = fract(ph) * CYCLE;
    float weight = smoothstep(0.2, 0.8, 1.0 - abs(2.0 * fract(ph) - 1.0));
    float turnOf = floor(ph);
    vec2 p = here;
    for (int e = 0; e < 3; e++) p = wind(p, mids[e], spins[e].x * 0.9, spins[e].y * run);
    p = wind(p, vec2(poolAt.x, 0.0), poolReach * 0.9, -0.3 * run * step(0.01, pool));
    p.x -= slowest * uTime + (fast - slowest) * run;
    p += vec2(turnOf * 17.31 + vSeam.y * 9.7, turnOf * 5.17 + float(copy) * 31.0);
    vec3 got = carriedAt(p);
    if (copy == 0) {
      carried = got;
      lead = weight;
    } else {
      carried = mix(got, carried, lead);
      // The mean of two is flatter than either: give it back its range.
      carried = 0.5 + (carried - 0.5) * inversesqrt(lead * lead + (1.0 - lead) * (1.0 - lead));
    }
  }
  float alive = carried.y;
  float fixedBig = vnoise(here * vec2(0.35, 1.3) + 3.0 + vSeam.y);

  // The tongue of bare lava: one in a reach, against the far bank. The line has it where the picture has it.
  float feeding = smoothstep(0.04, 0.07, vSeam.x) * (1.0 - stir);
  float reachOpen = smoothstep(0.5, 0.62, vnoise(vec2(vFlow.x / 6.5 - uTime * 0.02, vSeam.y * 3.7)));
  if (abs(vSeam.y - uTongue.w) < 0.5) reachOpen = 1.0 - smoothstep(0.6, 1.0, abs(vFlow.x - uTongue.x - 0.3 * sin(uTime * 0.21)) / uTongue.y);
  float wide = max(smoothstep(0.4, 0.7, gape) * reachOpen, feeding * smoothstep(0.2, 0.45, gape) * (0.4 + 0.6 * reachOpen));
  wide = max(wide, stir);
  float edgeNoise = 0.3 * (fixedBig - 0.5) + 0.2 * (carried.z - 0.5);
  float open = wide * (1.0 - smoothstep(0.2, 0.3, lean + edgeNoise - 0.3 * stir)) * (1.0 - 0.9 * held * (1.0 - stir));
  float thin = wide * (1.0 - smoothstep(0.3, 0.6, lean + edgeNoise));

  // How hot the skin is here: hot beside the tongue and down the fast side of the stream, where the stream has stretched it thin,
  // and where it has torn; cold in the heart of a coil, in the slack, and against the banks.
  float fastSide = 1.0 - smoothstep(0.1, 0.9, lean);
  float torn = smoothstep(0.62, 0.74, carried.z + 0.2 * fastSide - 0.15 * core);
  // The rim of a coil shears against the stream that passes it.
  float rim = 4.0 * held * (1.0 - held) * (1.0 - smoothstep(0.5, 1.0, ax));
  float hotness = clamp(0.03 + 0.26 * fastSide * fastSide + 0.7 * (alive - 0.5) + 0.45 * thin + 0.4 * torn + 0.22 * rim - 0.2 * core - 0.3 * smoothstep(0.6, 1.0, ax), 0.0, 1.0);

  // The ropes: uneven in width, bundled, each of its own height.
  float ropes = 6.28318 / ROPE;
  float turnAt = ropes * psi + 3.5 * (carried.x - 0.5) + 3.0 * vnoise(here * vec2(0.6, 1.7) + 41.0) + 2.0 * fixedBig;
  turnAt += 0.8 * sin(turnAt * 0.21 + 3.0 * fixedBig) + 0.45 * sin(turnAt * 0.47 + 1.3);
  float u = fract(turnAt / 6.28318);
  float ropeId = floor(turnAt / 6.28318);
  float creaseId = floor(turnAt / 6.28318 + 0.5);
  // 0 in the crease between two ropes, 1 on the crest.
  float crest = 1.0 - abs(2.0 * u - 1.0);
  // The slope of the skin: the gradient of the count of ropes on the lake, from its change over a pixel.
  float fx = dFdx(turnAt);
  float fy = dFdy(turnAt);
  float det = dqx.x * dqy.y - dqx.y * dqy.x;
  vec2 grad = vec2(fx * dqy.y - fy * dqx.y, fy * dqx.x - fx * dqy.x) / (abs(det) < 1e-12 ? 1e-12 : det);
  float steep = length(grad);
  // Where the count runs too fast or too slow for a rope (a coil's eye, a seam of the pattern) the skin is smooth.
  float ropedHere = (1.0 - open) * (1.0 - smoothstep(2.2 * ropes, 4.0 * ropes, steep)) * smoothstep(0.1 * ropes, 0.3 * ropes, steep);
  float roped = seen * ropedHere;
  // Thick, cold skin stands in high ropes; thin hot skin is nearly flat.
  float tall = ROPE_TALL * mix(1.25, 0.5, hotness) * roped * (0.45 + 1.1 * hash12(vec2(ropeId, vSeam.y + 7.0)));
  // A crest is round and a crease is sharp: height tall * (1 - (1 - crest)^2).
  float rise = tall * 2.0 * (1.0 - crest) * (u < 0.5 ? 1.0 : -1.0) / 3.14159;
  vec3 nrm = normalize(vec3(-rise * grad.x, 1.0, -rise * grad.y));

  // The crease glows: wide and yellow where the skin is hot, a hair of dark red where it is cold, and in cold skin only one crease in a few glows at all.
  float lives = smoothstep(-0.15, 0.15, hash12(vec2(creaseId, vSeam.y + 3.0)) - 1.0 + 1.5 * hotness);
  // A crease keeps its width in metres where the ropes run wide.
  float creaseWide = mix(0.08, 0.36, hotness) * (0.35 + 0.65 * lives) * clamp(steep / ropes, 0.25, 1.4);
  float crease = 1.0 - smoothstep(0.45 * creaseWide, creaseWide, crest);
  crease = mix(0.55 * creaseWide, crease * ropedHere, seen);
  // Where the skin is pulled apart a vein of bare melt runs across the ropes.
  float vein = (1.0 - smoothstep(0.012, 0.03, abs(carried.z - 0.56))) * smoothstep(0.25, 0.6, fastSide + 0.6 * (alive - 0.5)) * seen;
  crease = max(crease, vein);
  float kCrest = mix(940.0, 1090.0, hotness) + 85.0 * thin + 25.0 * (carried.z - 0.5);
  float kCrease = mix(1000.0, 1340.0, hotness) * mix(0.93, 1.0, lives) + 60.0 * torn;
  kCrease = mix(kCrease, max(kCrease, 1330.0), vein);
  vec3 hot = mix(blackbody(kCrest), blackbody(kCrease), crease);

  // The bare melt is hottest in its core; flow lines run along it, and threads of new skin, drawn out thin, ride on it.
  float heart = 1.0 - smoothstep(0.0, 0.2, lean + edgeNoise);
  float streak = vnoise(vec2(vFlow.x * 0.4 - uTime * 0.25, vFlow.y * 7.0) + 7.0);
  float thread = smoothstep(0.62, 0.8, vnoise(vec2(vFlow.x * 0.5 - uTime * 0.3, vFlow.y * 16.0) + 19.0)) * seen;
  hot = mix(hot, blackbody(1440.0 + 100.0 * heart + 70.0 * (streak - 0.5) + 20.0 * stir - 190.0 * thread * (1.0 - 0.6 * heart)), open);
  // The melt breathes with the lake.
  hot *= 1.0 + 0.3 * (beatAt(q) - 0.5) * (0.4 + 0.6 * pool);
  float skin = 1.0 - open;

  // Against the bank a thin dark skin clings, torn, and the glow shows through the tears. Where the stream shears past it a bright line opens.
  float inside = -bank;
  float reach = 0.1 + 0.3 * vnoise(q * 0.9 + 4.0) + 0.1 * vnoise(q * 3.7 + 1.0);
  float ripped = smoothstep(0.5, 0.66, vnoise(q * 3.3 + vec2(9.0, uTime * 0.04)) * 0.62 + vnoise(q * 9.5) * 0.38);
  float cling = (1.0 - smoothstep(reach * 0.55, reach, inside + 0.06 * (vnoise(q * 14.0) - 0.5))) * (1.0 - ripped * smoothstep(0.02, 0.09, inside));
  float shear = (1.0 - smoothstep(0.0, 0.03 + 2.0 * grain, abs(inside - reach))) * smoothstep(0.42, 0.62, vnoise(q * 1.4 + vec2(uTime * 0.11, 0.0))) * (1.0 - pool) * min(1.0, 0.03 / (0.03 + 2.0 * grain));
  hot = mix(hot, blackbody(880.0 + 170.0 * vnoise(q * 6.1 + 2.0)), cling);
  skin = max(skin, cling);
  hot = mix(hot, blackbody(1330.0), shear * 0.85 * (1.0 - cling));
  // Under the crust nothing glows.
  hot *= 1.0 - smoothstep(0.0, 0.08, bank);

  // The skin is a surface: the sky lights the crests and leaves the creases dark, and its sheen lies on every rope that faces it.
  vec3 v = normalize(cameraPosition - vWorld);
  float openSky = landAt(vWorld.xz).g;
  float shade = mix(1.0, 0.25 + 0.75 * smoothstep(0.0, 0.6, crest), roped);
  float nv = clamp(dot(nrm, v), 0.0, 1.0);
  float fresnel = 0.04 + 0.22 * pow(1.0 - nv, 5.0);
  vec3 r = reflect(-v, nrm);
  r.y = abs(r.y) + 0.05;
  vec3 lit = skin * shade * openSky * (0.075 * skyIrradiance(nrm) / 3.14159 + fresnel * 0.4 * skyRadiance(normalize(r)))
    // The glow of the creases lies on the flanks of the ropes beside them: the skin is brown, not grey.
    + skin * 0.1 * blackbody(kCrease) * (1.0 - crease) * (0.25 + 0.75 * (1.0 - crest)) * uLavaOn;
  gl_FragColor = vec4(rigOut(lit) + hot * uLavaOn, 1.0);
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
  // The open tongue of the line: metres along its ribbon, half its length, and which ribbon.
  const tongue = new THREE.Vector4(TONGUE.at, TONGUE.half, 0, Math.max(0, all.findIndex((r) => r.name === 'line')));
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { ...shared, uLavaOn: on, uPoolFlow: { value: pools }, uTongue: { value: tongue } },
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
