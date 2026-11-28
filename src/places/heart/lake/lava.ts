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
import { AUTHORED, LINE_POOLS, OWN as NET_OWN, lineBend, type Net } from './net';
import { MELT_GLSL, SHEET_GLSL } from './sheet';
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
  ...LINE_POOLS.map((pool) => ({ seam: 'line', ...pool })),
];

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The level of a seam's melt, the same as meltLevel in heat.ts. */
const levelOf = (heat: number): number => {
  if (heat >= 1.3) return -0.2;
  const full = smooth(0.01, 0.04, heat);
  const k = smooth(0, 0.2, heat);
  const low = 0.17 + (0.1 - 0.17) * full;
  const string = smooth(0.06, 0.075, heat) * (1 - smooth(0.105, 0.115, heat));
  const level = low + (0.08 - low) * k;
  return -(level + (0.045 - level) * string);
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
    const line = seamLine(name, name === 'group' ? 160 : 80);
    if (name === 'line') {
      // The channel at the line runs left of its drawn line, as the net lays it.
      const head = line[0] as [number, number];
      const tail = line[line.length - 1] as [number, number];
      const l = Math.hypot(tail[0] - head[0], tail[1] - head[1]) || 1;
      line.forEach((p, i) => {
        const k = lineBend(i / (line.length - 1)) / l;
        p[0] -= (tail[1] - head[1]) * k;
        p[1] += (tail[0] - head[0]) * k;
      });
    }
    out.push({ name, line, half: shape.half, lumps: shape.lumps, heat: shape.heat, speed: speeds[name] ?? 0.6 });
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

const MAX_POOLS = 6;
const TONGUE = { at: 25.4, half: 3.4 };

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
${SHEET_GLSL}

uniform sampler2D tPour;
${MELT_GLSL}

const float CYCLE = 12.0;
// One coil in so many metres of stream.
const float COIL = 2.4;
// A rope of the skin, crest to crest, and how high it stands, metres.
const float ROPE = 0.066;
const float ROPE_TALL = 0.03;
// A raft of skin, metres along and across the stream.
const vec2 RAFT = vec2(0.85, 0.6);
// Metres a second the rafts ride down the stream, and the thin skin of the core.
const float RAFT_SPEED = 0.6;
const float CORE_SPEED = 0.9;
// Metres a second the cooling skin of the line rides: it drags on the banks and the melt runs out from under it.
const float SKIN_SPEED = 0.34;

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
  float seen = 1.0 - smoothstep(0.022, 0.046, longest);

  // The hottest tongue does not run down the middle: it lies against one bank, and wanders a little along the channel.
  vec2 up = vec2(netAt(q + vec2(0.25, 0.0)).r, netAt(q + vec2(0.0, 0.25)).r) - n.r;
  float bankSide = dot(up, vec2(0.96, 0.27)) < 0.0 ? -1.0 : 1.0;
  // The seam the walkers feed at is a string of pools: each has a hot middle and a dark rolled skin at its rim, so there the
  // measure is the way in from the brim.
  float feeding = stringOf(n);
  // The skin reaches in from the brim in ragged lobes, a hand to most of a metre; a small pool is skinned over whole.
  float hero = step(0.001, heroPool(q));
  // The skin grows in while the pool is slack and is eaten back when the heat of the seam comes through: it folds and drifts.
  float drawnIn = drawAt(q);
  float skinEdge = (0.1 + 0.4 * vnoise(q / 0.9 + 31.0 + vec2(uTime * 0.13, -uTime * 0.05)) + 0.15 * vnoise(q / 0.31 + 7.0)) * (1.0 - 0.5 * hero) * mix(1.5, 0.5, drawnIn);
  float inFrom = clamp(0.4 + skinEdge + bank, 0.0, 1.0);
  // Rafts of the same skin, torn from the rim, lie on the open melt and drift along it.
  vec2 rafted = q + vec2(0.95, -0.3) * (0.2 * uTime);
  float raft = feeding * smoothstep(0.5, 0.58, vnoise(rafted / 0.55 + 47.0) * 0.72 + vnoise(rafted / 0.19 + 3.0 + vec2(0.0, uTime * 0.2)) * 0.28 - 0.12 * (drawnIn - 0.5));
  // On the line the tongue lies nearer the middle, so the bare melt reaches most of the way to both banks.
  float strays = (0.5 + 0.2 * vnoise(vec2(vFlow.x / 5.0, vSeam.y * 1.9))) * (abs(vSeam.y - uTongue.w) < 0.5 ? 0.45 : 1.0);
  float lean = mix(abs(bankSide * ax - strays), mix(ax, inFrom, feeding), max(stir, feeding));
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
  vec2 coilAt = vec2(0.0);
  float coilTurn = 0.0;
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
    // The channel at the line runs too full for many: two in three of its coils are not there.
    w *= 1.0 - (abs(vSeam.y - uTongue.w) < 0.5 ? 1.0 : 0.0) * step(0.33, fract(h.y * 7.3));
    psi = mix(psi, middle.y - side * r, w);
    if (w > held) {
      coilAt = middle;
      coilTurn = -side * (0.16 + 0.14 * fract(h.y * 3.1));
    }
    held = max(held, w);
    core = max(core, 1.0 - smoothstep(0.0, 0.5 * reach, r));
    mids[e] = middle;
    // A coil turns once in 20 to 40 seconds, with the stream that passes it.
    spins[e] = vec2(reach, -side * (0.16 + 0.14 * fract(h.y * 3.1)));
  }
  psi = mix(psi, length(vFlow - poolAt) * 0.9, 0.85 * smoothstep(0.3, 0.8, pool));
  // In a pool of the string the ropes lie along the rim, rolled.
  psi = mix(psi, bank + 0.15 * vnoise(q * 1.1 + 5.0), feeding);
  held *= 1.0 - feeding;
  core *= 1.0 - feeding;

  // How fast the stream runs here: fastest in mid stream and in a narrows, slowest at the banks, in a coil and in the slack of a pool.
  float narrow = 1.0 - smoothstep(0.3, 1.2, gape);
  float slowest = 0.1 * vSeam.z;
  float fast = vSeam.z * (0.1 + (0.36 + 0.2 * narrow) * (1.0 - ax * ax) * (1.0 - 0.75 * pool) * (1.0 - 0.7 * held)) * (1.0 - 0.8 * feeding);

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
    for (int e = 0; e < 3; e++) p = wind(p, mids[e], spins[e].x * 0.9, spins[e].y * run * (1.0 - feeding));
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
  float reachOpen = smoothstep(0.5, 0.62, vnoise(vec2(vFlow.x / 6.5 - uTime * 0.02, vSeam.y * 3.7)));
  if (abs(vSeam.y - uTongue.w) < 0.5) reachOpen = 1.0 - smoothstep(0.6, 1.0, abs(vFlow.x - uTongue.x - 0.3 * sin(uTime * 0.21)) / uTongue.y);
  float onLine = abs(vSeam.y - uTongue.w) < 0.5 ? 1.0 : 0.0;
  float wide = max(smoothstep(0.4, 0.7, gape) * reachOpen * (1.0 - feeding), feeding * smoothstep(0.18, 0.4, gape));
  wide = max(wide, stir);
  float edgeNoise = 0.3 * (fixedBig - 0.5) + 0.2 * (carried.z - 0.5);
  // The line's tongue is 0.8 m across; the others are narrower.
  float openTo = 0.2 + 0.35 * onLine * reachOpen + 0.2 * feeding;
  float open = wide * (1.0 - smoothstep(openTo, openTo + 0.1, lean + edgeNoise - 0.3 * stir)) * (1.0 - 0.9 * held * (1.0 - stir) * (1.0 - 0.6 * onLine));
  open *= 1.0 - raft;

  // Across the stream the skin is ordered: bare melt in the core on the fast side, then orange melt with the first plates on it,
  // then, on the slow side and in the bays, rafts of dark skin 0.3 to 1 m across, each a plate of its own with its ropes parallel
  // and curved one way, parted from the next by a glowing crack. The rafts ride the slow water whole; one that comes too near
  // the core goes under.
  float onRafts = (1.0 - feeding) * (1.0 - stir) * smoothstep(0.3, 0.45, gape);
  // The skin of a coil is plates too: they turn with it, whole.
  float inCoil = step(0.5, held);
  vec2 fromCoil = here - coilAt;
  float coilC = cos(coilTurn * uTime);
  float coilS = sin(coilTurn * uTime);
  vec2 turned = coilAt + vec2(fromCoil.x * coilC - fromCoil.y * coilS, fromCoil.x * coilS + fromCoil.y * coilC) + 37.0;
  vec2 rode = mix(vec2(here.x - RAFT_SPEED * uTime, here.y), turned, inCoil);
  // No plate has a straight edge: the edges are torn.
  // The warp is gentle enough that it never folds: a fold would close a crack into a ring.
  vec2 ragged = vec2(vnoise(rode * 1.3 + 5.0), vnoise(rode * 1.3 + 31.0)) - 0.5;
  vec2 jagged = vec2(vnoise(rode * 7.0 + 2.0), vnoise(rode * 7.0 + 17.0)) - 0.5;
  vec2 pr = (rode + 0.3 * ragged + 0.03 * jagged) / RAFT;
  vec2 prCell = floor(pr);
  vec2 prIn = pr - prCell;
  float near1 = 9.0;
  float near2 = 9.0;
  vec2 at1 = vec2(0.0);
  vec2 at2 = vec2(1.0);
  vec2 plateId = vec2(0.0);
  vec2 otherId = vec2(1.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      // Each plate drifts a hand or two about its place in the pack, at a pace of its own: the cracks between plates open and
      // shut and the plates jostle as they ride.
      vec2 placed = hash22(prCell + o + vSeam.y * 13.0);
      vec2 sway = vec2(sin(uTime * (0.8 + 0.7 * placed.y) + 40.0 * placed.x), sin(uTime * (0.7 + 0.8 * placed.x) + 55.0 * placed.y));
      vec2 pt = o + 0.16 + 0.68 * placed + 0.15 * sway - prIn;
      float dd = dot(pt, pt);
      if (dd < near1) {
        near2 = near1;
        at2 = at1;
        otherId = plateId;
        near1 = dd;
        at1 = pt;
        plateId = prCell + o;
      } else if (dd < near2) {
        near2 = dd;
        at2 = pt;
        otherId = prCell + o;
      }
    }
  }
  vec2 apart = at2 - at1;
  // Metres to the edge of the plate.
  float border = dot(0.5 * (at1 + at2), apart / max(length(apart), 1e-4)) * RAFT.y;
  vec2 plateHash = hash22(plateId * 1.7 + 3.1 + vSeam.y);
  // Where the plate's middle lies across the stream.
  float sideOf = dot(vAcross, vec2(0.96, 0.27)) < 0.0 ? -1.0 : 1.0;
  float leanMid = abs(sideOf * (here.y + at1.y * RAFT.y) / gape - strays);
  float slowSide = max(smoothstep(0.3, 0.8, leanMid), inCoil);
  // The stream is skinned from bank to bank but for its core, where the skin is thin and tears. The plates part in cracks of a
  // centimetre or two, and here and there, for a while, a tear opens between them and closes again.
  // From far the core is narrower and darker at its edge: a streak of yellow in dark skin, not a field of orange.
  float farAway = smoothstep(12.0, 20.0, length(vWorld.xz - cameraPosition.xz)) * onLine;
  float coreTo = (0.16 + 0.3 * max(reachOpen, 0.75 * onLine) + (0.5 + 0.25 * pool) * onLine) * (1.0 - 0.45 * farAway);
  float present = max(smoothstep(-0.03, 0.03, leanMid - coreTo - 0.12 * (plateHash.x - 0.5)), inCoil);
  // The plates are welded into sheets and lie over one another at their rims: nothing glows inside a sheet. A plate burns only
  // where it meets the open melt: one rim, 2 to 5 cm wide.
  float leanOther = abs(sideOf * (here.y + at2.y * RAFT.y) / gape - strays);
  float presentOther = max(smoothstep(-0.03, 0.03, leanOther - coreTo - 0.12 * (hash22(otherId * 1.7 + 3.1 + vSeam.y).x - 0.5)), inCoil);
  float rimWide = 0.02 + 0.03 * plateHash.y;
  float burnt = present * (1.0 - presentOther) * (1.0 - smoothstep(0.5 * rimWide, rimWide + grain, border)) * min(1.0, rimWide / (rimWide + grain));
  // 1 where this plate lies over its neighbour, 0 where it lies under.
  float over = step(hash12(otherId * 1.3 + vSeam.y + 5.0), hash12(plateId * 1.3 + vSeam.y + 5.0));
  float plate = present;
  // The edge of a plate is rolled and thick: colder than its middle.
  float rolled = present * (1.0 - smoothstep(0.015, 0.06, border));
  open = mix(open, 1.0 - plate, onRafts);
  float thin = wide * (1.0 - smoothstep(openTo + 0.08, openTo + 0.3, lean + edgeNoise));

  // How hot the skin is here: hot beside the tongue and down the fast side of the stream, where the stream has stretched it thin,
  // and where it has torn; cold in the heart of a coil, in the slack, and against the banks.
  // Most of the skin is cold and dark. The fire gathers in three places: beside the tongue, in a strip down the fast side, and on the rims of the coils.
  float fastSide = 1.0 - smoothstep(0.05, 0.45, lean);
  float torn = smoothstep(0.66, 0.76, carried.z + 0.2 * fastSide - 0.15 * core);
  // The rim of a coil shears against the stream that passes it.
  float rim = 4.0 * held * (1.0 - held) * (1.0 - smoothstep(0.5, 1.0, ax));
  // A narrow crack between two pools glows along its whole length.
  float neck = feeding * (1.0 - smoothstep(0.1, 0.25, gape));
  float hotness = clamp(0.02 + 0.5 * neck + (0.3 * fastSide + 0.34 * rim) * (0.45 + 1.1 * alive) + 0.3 * (alive - 0.62) + 0.55 * thin + 0.3 * torn * (0.3 + 0.7 * fastSide) - 0.2 * core - 0.3 * smoothstep(0.6, 1.0, ax) - 0.75 * raft, 0.0, 1.0);

  // A raft is cold and dark; one near the core, and one in five, is thin and hot.
  hotness = mix(hotness, clamp(0.03 + 0.3 * (1.0 - slowSide) + 0.3 * step(0.8, fract(plateHash.x * 11.0)) + 0.2 * (alive - 0.5) - 0.3 * rolled, 0.0, 1.0), onRafts);

  // The ropes: uneven in width, bundled, each of its own height.
  float ropes = 6.28318 / ROPE;
  float turnAt = ropes * psi + 3.5 * (carried.x - 0.5) + 3.0 * vnoise(here * vec2(0.6, 1.7) + 41.0) + 2.0 * fixedBig;
  if (onRafts > 0.5) {
    // On a raft the ropes are arcs about one point beside it: parallel, and curved one way.
    // A plate turns slowly as it rides, a quarter of a radian each way, each at its own pace.
    float plateTurn = 0.45 * sin(uTime * (0.5 + 0.6 * plateHash.y) + 30.0 * plateHash.x);
    float turnC = cos(plateTurn);
    float turnS = sin(plateTurn);
    vec2 inPlate = -at1 * RAFT;
    inPlate = vec2(inPlate.x * turnC - inPlate.y * turnS, inPlate.x * turnS + inPlate.y * turnC);
    float lay = (plateHash.y - 0.5) * 1.4 + plateTurn;
    float bend = (1.1 + 1.5 * fract(plateHash.x * 7.3)) * (fract(plateHash.y * 5.1) < 0.5 ? -1.0 : 1.0);
    // They are wrinkled, never ringed: the point they bend about lies outside the plate.
    vec2 wrinkled = inPlate - 0.25 * ragged - 0.03 * jagged;
    turnAt = 0.5 * ropes * length(wrinkled - bend * vec2(-sin(lay), cos(lay))) + 40.0 * plateHash.x + 1.5 * vnoise(inPlate * 2.6 + plateId);
  }
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
  // A rope finer than three pixels is not drawn: it would beat against them into rings.
  float fine = 1.0 - smoothstep(0.9, 1.9, max(abs(fx), abs(fy)));
  float roped = seen * fine * ropedHere;
  // Thick, cold skin stands in high ropes; thin hot skin is nearly flat.
  float tall = ROPE_TALL * (1.0 - 0.3 * onRafts) * mix(1.25, 0.5, hotness) * roped * (0.45 + 1.1 * hash12(vec2(ropeId, vSeam.y + 7.0)));
  // A crest is round and a crease is sharp: height tall * (1 - (1 - crest)^2).
  float rise = tall * 2.0 * (1.0 - crest) * (u < 0.5 ? 1.0 : -1.0) / 3.14159;
  vec3 nrm = normalize(vec3(-rise * grad.x, 1.0, -rise * grad.y));

  // The crease glows: wide and yellow where the skin is hot, a hair of dark red where it is cold, and in cold skin only one crease in a few glows at all.
  // Along its length a living crease comes and goes.
  float lives = smoothstep(-0.12, 0.12, hash12(vec2(creaseId, vSeam.y + 3.0)) - 0.72 + 1.5 * hotness + 0.5 * (carried.z - 0.5) + 0.25 * (alive - 0.5));
  // A crease keeps its width in metres where the ropes run wide.
  float creaseWide = mix(0.16, 0.4, hotness) * (0.3 + 0.7 * lives) * clamp(steep / ropes, 0.25, 1.4);
  float crease = 1.0 - smoothstep(0.45 * creaseWide, creaseWide, crest);
  crease = mix(0.55 * creaseWide, crease * ropedHere, seen * fine);
  // Where the skin is pulled apart a vein of bare melt runs across the ropes.
  float vein = (1.0 - smoothstep(0.012, 0.03, abs(carried.z - 0.56))) * smoothstep(0.25, 0.6, fastSide + 0.6 * (alive - 0.5)) * seen * (1.0 - onRafts);
  // On a raft no crease burns: its skin is dark from rim to rim.
  crease *= 1.0 - onRafts;
  crease = max(crease, vein);
  float kCrest = mix(870.0, 1010.0, hotness) + 50.0 * thin + 25.0 * (carried.z - 0.5);
  // A raft does not glow of itself: no red in its tone.
  kCrest = mix(kCrest, 780.0, onRafts);
  // The melt beside a raft heats its edge: red-orange at the rim, dark a hand and a half in.
  float edgeGlow = present * (1.0 - presentOther) * (1.0 - smoothstep(0.0, 0.18, border));
  kCrest += 340.0 * edgeGlow * edgeGlow * onRafts;
  float kCrease = mix(1130.0, 1350.0, hotness) * mix(0.82, 1.0, lives) + 60.0 * torn;
  kCrease = mix(kCrease, max(kCrease, 1330.0), vein);
  vec3 hot = mix(blackbody(kCrest), blackbody(kCrease), crease);

  // The bare melt is hottest in its core; flow lines run along it, and threads of new skin, drawn out thin, ride on it.
  float heart = 1.0 - smoothstep(0.0, 0.2, lean + edgeNoise);
  float streak = vnoise(vec2(vFlow.x * 0.4 - uTime * 0.25, vFlow.y * 7.0) + 7.0);
  float thread = smoothstep(0.62, 0.8, vnoise(vec2(vFlow.x * 0.5 - uTime * 0.3, vFlow.y * 16.0) + 19.0)) * seen;
  // A pool is white-yellow only in its middle and falls to orange toward its skin.
  // The pool under the tuft and one in a few of the others are that hot; the rest are orange.
  float chosen = max(hero, smoothstep(0.62, 0.74, vnoise(q / 13.0 + 91.0)));
  float poolHeart = (1.0 - smoothstep(0.1, 0.4, lean + edgeNoise)) * chosen;
  // Across the tongue the heat falls from white-yellow in the middle through yellow to orange at its edge; beyond the tongue the
  // core of the stream is orange, and so is the melt between the rafts.
  float coreHeat = 1.0 - smoothstep(0.0, 1.0, (lean + 0.5 * edgeNoise) / (openTo + 0.1));
  // The core is one smooth body of bare melt: white-yellow along the middle of the flow, orange at its edges, with long folds
  // drawn out along the flow. No bands across it.
  float acrossCore = (bankSide * ax - strays) * gape;
  float drawn = here.x - CORE_SPEED * uTime;
  float mid = 1.0 - smoothstep(0.15, 0.9, lean / max(coreTo, 1e-3));
  float folds = vnoise(vec2(drawn * 0.16, acrossCore * 4.5 + 0.5 * vnoise(vec2(drawn * 0.5, 3.0))) + 3.0) * 0.65 + vnoise(vec2(drawn * 0.5, acrossCore * 12.0) + 7.0) * 0.35;
  float kBody = mix(1250.0, mix(1490.0, 1575.0, reachOpen) - 40.0 * farAway, mid) + 100.0 * (folds - 0.5);
  // Between the rafts the melt is orange.
  float inCore = 1.0 - smoothstep(coreTo * 0.9, coreTo * 1.3, lean);
  float kStream = mix(1200.0, kBody, inCore);
  kStream = mix(kStream, 1490.0 + 60.0 * heart + 20.0, stir);
  hot = mix(hot, blackbody(mix(kStream, 1300.0 + 230.0 * poolHeart + 150.0 * (drawnIn - 0.45), feeding) + 60.0 * (streak - 0.5) - 90.0 * thread * (1.0 - 0.6 * heart)), open);
  // The stream as it was photographed: dark plates of half-cooled skin, torn and wrinkled, on bright melt. The sheet is read in
  // what the stream carries whole. The plug in mid stream rides fast, the skin of the margins slowly, a coil turns as one,
  // and between plug and margin the skin is sheared open: no reading is ever dissolved into another.
  float photo = (1.0 - feeding) * (1.0 - stir);
  vec2 hx = dFdx(here);
  vec2 hy = dFdy(here);
  // The cooling skin of the line: how thick it is here (0 bare melt, 1 cold), and its slope in the stream's own axes.
  float lineThick = 0.0;
  vec2 lineLay = vec2(0.0);
  float lineSkin = 0.0;
  if (photo > 0.0) {
    float plugEdge = lean + 0.35 * (fixedBig - 0.5) - coreTo - 0.22;
    float inPlug = (1.0 - smoothstep(-0.04, 0.04, plugEdge)) * (1.0 - inCoil);
    vec3 plug = vec3(0.0);
    vec3 side = vec3(0.0);
    if (inPlug > 0.0) plug = meltAt(vec2(here.x - CORE_SPEED * uTime, here.y), 3.4, hx, hy, 5.0);
    if (inPlug < 1.0) side = meltAt(rode, 2.4, hx, hy, 9.0);
    // Mid stream the melt is bare and what skin rides on it is thin and red; at the margins the plates crowd and are cold,
    // and the melt between them is orange.
    // The edge of a plate is not a line of one width: here it is sharp, black on yellow where the plate lies over the melt,
    // there it thins out through red over a hand or two.
    float edgy = vnoise(rode * 2.3 + 31.0);
    vec3 cut = vec3(mix(0.02, 0.2, edgy), mix(0.5, 0.26, edgy), 0.0);
    float sideHeat = smoothstep(cut.x, cut.x + cut.y, side.z) * (0.55 + 0.45 * side.z);
    float plugHeat = smoothstep(cut.x, cut.x + cut.y, plug.z) * (0.55 + 0.45 * plug.z);
    // The bare melt is not one colour: the folds of the sheet show in it, yellow-white where it wells and orange between.
    // Mid stream the skin is drawn into cords as the crust's is (the slab sheet, riding with the plug): a cord's top is
    // dark red skin, and the furrow between two cords is torn open to the melt, a thread of yellow white.
    vec2 coilScale = vec2(1.0, 2.0) / 1.7;
    vec2 coilAt = vec2(here.x - CORE_SPEED * uTime, here.y);
    float coil = textureGrad(tPour, coilAt * coilScale + 0.37, hx * coilScale, hy * coilScale).b;
    float furrow = 1.0 - smoothstep(0.3, 0.58, coil);
    float heatPlug = clamp(mix(0.22 + 0.2 * mid, 0.72 + 0.3 * mid, furrow) + 0.3 * plugHeat, 0.0, 1.0);
    // In the slack of a pool of the line, and along its open tongue, the melt lies bare and broad, yellow white, and what skin
    // there is rides on it as dark wrinkled islands with the cords of the sheet on them.
    float broad = onLine * max(max(smoothstep(0.2, 0.6, pool), 0.55 * reachOpen), 0.82 + 0.18 * smoothstep(0.35, 0.65, vnoise(coilAt * vec2(0.16, 0.5) + 83.0)));
    float isle = smoothstep(0.5, 0.58, 0.7 * vnoise(coilAt * vec2(0.4, 1.1) + 41.0) + 0.3 * vnoise(coilAt * vec2(1.3, 3.1) + 7.0) + 0.3 * (coil - 0.45) + 0.12 * smoothstep(0.5, 1.1, lean));
    heatPlug = mix(heatPlug, mix(0.9 + 0.1 * mid, mix(0.06, 0.4, furrow * furrow), isle), broad);
    float heatSide = mix(0.08, 1.0, sideHeat) * mix(0.95, 0.65, smoothstep(0.4, 1.0, lean));
    float heat = mix(heatSide, heatPlug, inPlug);
    // Where the sheet is bare the melt still shows how it runs: lines drawn out along the stream and films of new skin a shade
    // darker, both riding with the melt they lie on.
    vec2 ride = inPlug > 0.5 ? vec2(here.x - CORE_SPEED * uTime, here.y) : rode;
    float bare = smoothstep(0.72, 0.95, heat);
    float lines = vnoise(vec2(ride.x * 0.45, ride.y * 7.0) + 7.0);
    float film = smoothstep(0.5, 0.7, vnoise(vec2(ride.x * 0.8, ride.y * 2.6) + 23.0));
    heat -= bare * (0.14 * (lines - 0.2) + 0.16 * film) + bare * onLine * 0.28 * smoothstep(0.35, 0.75, coil);
    float sheared = (1.0 - smoothstep(0.0, 0.04 + grain, abs(plugEdge) * gape)) * smoothstep(0.35, 0.6, vnoise(vec2(here.x * 1.3 - 0.4 * uTime, 3.0 + vSeam.y))) * (1.0 - inCoil);
    heat = max(heat, 0.85 * sheared);
    // The cooling skin of the line is a layer of its own. It rides slower than the melt under it. It is thin where the melt
    // wells in mid stream and thick toward the banks, thicker where it is old, thinner in the furrows of its creases. Where the
    // stream pulls it, it tears across the flow, and where the plug shears past the margin it is torn along it. What glows
    // is the melt through the skin: the thicker the skin, the darker, and nothing else sets the glow.
    if (onLine > 0.5) {
      vec2 sk = vec2(here.x - SKIN_SPEED * uTime, here.y);
      float leanN = lean / max(coreTo + 0.22, 1e-3);
      float age = 0.6 * vnoise(sk * vec2(0.42, 1.5) + 61.0) + 0.4 * vnoise(sk * vec2(1.6, 4.1) + 17.0);
      vec4 fold = textureGrad(tPour, sk * coilScale + 0.71, hx * coilScale, hy * coilScale);
      float creased = fold.b;
      float thick = 0.14 + 1.05 * smoothstep(0.0, 0.85, leanN) + 0.8 * (age - 0.42) + 0.55 * (creased - 0.45) + 0.2 * (film - 0.3);
      // In the furrow of a crease the skin is thin: there the melt shows as a thread.
      thick -= 0.6 * (1.0 - smoothstep(0.16, 0.42, creased)) * smoothstep(0.25, 0.6, age);
      // Pulled apart: gashes across the flow, open to the melt, most where the skin is still thin.
      float gash = smoothstep(0.6, 0.7, 0.75 * vnoise(vec2(sk.x * 2.4, sk.y * 0.8) + 37.0) + 0.25 * vnoise(sk * 6.5 + 3.0));
      thick -= 0.7 * gash * (1.0 - smoothstep(0.5, 1.1, leanN));
      thick = clamp(thick, 0.0, 1.0) * (1.0 - 0.9 * sheared);
      // The open melt is no flat pale field: a film of new skin lies on all of it, drawn out in lines along the stream, and
      // the melt is yellow where the film is thinnest and orange under the rest.
      thick = max(thick, clamp(0.01 + 0.12 * lines + 0.08 * film + 0.08 * (creased - 0.45), 0.0, 0.25) * (1.0 - sheared));
      // Fragments torn from the skin ride the open melt: those in mid stream fast, those nearer the banks slower, so that
      // one overtakes the next.
      for (int lane = 0; lane < 3; lane++) {
        float fl = float(lane);
        float pace = mix(0.84, 0.5, 0.5 * fl);
        float off = abs(leanN - 0.12 - 0.26 * fl) / 0.2;
        vec2 fp = vec2(here.x - pace * uTime, here.y);
        float piece = 0.7 * vnoise(fp * vec2(1.3, 3.4) + 19.0 + 23.0 * fl) + 0.3 * vnoise(fp * vec2(4.1, 8.3) + 5.0 + 11.0 * fl) - 0.16 * off * off;
        // No fragment is a cut-out: its rim is torn, and thin enough there for the melt to show red through it, and the
        // furrows of its creases stay alight across it.
        piece += 0.08 * (vnoise(fp * vec2(9.0, 21.0) + 3.0 + 7.0 * fl) - 0.5);
        thick = max(thick, (0.5 + 0.7 * creased) * pow(smoothstep(0.57, 0.75, piece), 0.6) * (1.0 - 0.5 * gash));
      }
      float through = (1.0 - thick) * (1.0 - thick);
      heat = mix(0.03, 1.0, through * mix(0.75, 1.0, mid));
      lineThick = thick;
      lineLay = vec2(fold.r - 0.5, 0.5 - fold.g) * 4.0 * smoothstep(0.25, 0.6, thick);
      lineSkin = 1.0;
    }
    hot = mix(hot, blackbody(800.0 + (780.0 + 60.0 * reachOpen * inPlug - 40.0 * farAway) * heat), photo);
    open = mix(open, smoothstep(0.1, 0.28, heat), photo);
    vec2 lay = mix(mix(side.xy, plug.xy, inPlug) * 0.02, lineLay, lineSkin);
    vec2 onLake = lay.x * vec2(vAcross.y, -vAcross.x) + lay.y * vAcross;
    nrm = normalize(mix(nrm, normalize(vec3(-onLake.x, 1.0, -onLake.y)), photo));
  }
  // The heat of the melt creeps along it: no even pulse.
  hot *= 1.0 + 0.12 * (creepAt(q) - 0.5) * (0.4 + 0.6 * pool);
  // From the rim of the bowl whole reaches of it flare and dim as the heat travels through the lake.
  hot *= mix(1.0, mix(0.3, 1.5, smoothstep(0.22, 0.78, surgeAt(q))), smoothstep(50.0, 140.0, length(vWorld.xz - cameraPosition.xz)));
  float skin = 1.0 - open;
  hot = mix(hot, blackbody(1270.0 + 110.0 * plateHash.x), burnt * onRafts * (1.0 - photo));
  skin *= 1.0 - burnt * onRafts * (1.0 - photo);

  // Against the bank a thin dark skin clings, torn, and the glow shows through the tears. Where the stream shears past it a bright line opens.
  float inside = -bank;
  float reach = 0.1 + 0.3 * vnoise(q * 0.9 + 4.0) + 0.1 * vnoise(q * 3.7 + 1.0);
  float ripped = smoothstep(0.5, 0.66, vnoise(q * 3.3 + vec2(9.0, uTime * 0.04)) * 0.62 + vnoise(q * 9.5) * 0.38);
  float cling = (1.0 - smoothstep(reach * 0.55, reach, inside + 0.06 * (vnoise(q * 14.0) - 0.5))) * (1.0 - ripped * smoothstep(0.02, 0.09, inside));
  float shear = (1.0 - smoothstep(0.0, 0.03 + 2.0 * grain, abs(inside - reach))) * smoothstep(0.42, 0.62, vnoise(q * 1.4 + vec2(uTime * 0.11, 0.0))) * (1.0 - pool) * min(1.0, 0.03 / (0.03 + 2.0 * grain));
  // It is creased as the stream drags it: crooked lines a finger wide where it has folded and split, alight in some stretches
  // and dark in the next, and patches of it a shade apart. No even dark band.
  float fret = abs(vnoise(q * 11.0 + 3.0 * vnoise(q * 2.3 + 5.0)) - 0.5);
  float creased = (1.0 - smoothstep(0.015, 0.045 + 6.0 * grain, fret)) * smoothstep(0.38, 0.6, vnoise(q * 1.9 + 7.0)) * min(1.0, 0.04 / (0.04 + 6.0 * grain));
  hot = mix(hot, blackbody(mix(830.0 + 230.0 * vnoise(q * 6.1 + 2.0), 1270.0, creased)), cling);
  skin = max(skin, cling);
  hot = mix(hot, blackbody(1330.0), shear * 0.85 * (1.0 - cling));
  // Where the melt meets the foot of the far wall it is torn open: the brightest thin line of the place, broken along its length.
  vec2 toBank = up / max(length(up), 1e-4);
  vec2 sightAt = normalize(vWorld.xz - cameraPosition.xz);
  float foot = (1.0 - smoothstep(0.12 + 0.03 * vnoise(q * 5.0) + grain, 0.14 + 0.03 * vnoise(q * 5.0) + 2.0 * grain, inside)) * smoothstep(0.1, 0.4, dot(toBank, sightAt))
    * smoothstep(0.5 - 0.08 * lineSkin, 0.58 + 0.12 * lineSkin, vnoise(vec2(vFlow.x * 2.6 + uTime * 0.05, 5.0)) * 0.7 + vnoise(vec2(vFlow.x * 9.0, 11.0)) * 0.3) * (1.0 - feeding) * (1.0 - stir);
  // On the line it is no row of yellow blocks: the tear is orange, thins out along its length, and is no brighter than the core.
  foot *= 1.0 - 0.35 * lineSkin;
  hot = mix(hot, blackbody(1400.0 - 150.0 * lineSkin + 170.0 * vnoise(q * 3.1 + 7.0)), foot);
  skin *= 1.0 - foot;
  // Under the crust nothing glows.
  hot *= 1.0 - smoothstep(0.0, 0.08, bank);

  // The skin is a surface: the sky lights the crests and leaves the creases dark, and its sheen lies on every rope that faces it.
  vec3 v = normalize(cameraPosition - vWorld);
  float openSky = landAt(vWorld.xz).g;
  // A raft is one dark plate of thick ropes, a hand and a half from crest to crest.
  float shade = mix(1.0, mix(0.12, 0.72, onRafts) + mix(0.88, 0.28, onRafts) * smoothstep(0.0, 0.85, crest), roped) * (1.0 - 0.48 * onRafts);
  // The skin of a plate is rough and dull: grained, pitted, without the sheen of new skin.
  float pitted = vnoise(rode * 23.0 + 3.0) * 0.55 + vnoise(rode * vec2(61.0, 47.0) + 9.0) * 0.45;
  shade *= mix(1.0, 0.45 + 1.1 * pitted, onRafts * (1.0 - smoothstep(0.02, 0.05, grain)));
  float toCore = sideOf * strays * gape - here.y;
  vec3 fireFrom = normalize(vec3(vAcross.x * sign(toCore), 0.4, vAcross.y * sign(toCore)));
  float fireLit = clamp(dot(nrm, fireFrom), 0.0, 1.0) / (1.0 + 14.0 * toCore * toCore);
  // Where two welded plates meet, one lies over the other: its rim catches the sky, and the one beneath is in its shadow for a hand's breadth.
  float lapped = onRafts * present * (1.0 - burnt);
  shade *= mix(1.0, mix(0.4 + 0.6 * smoothstep(0.0, 0.08, border), 1.0 + 0.35 * (1.0 - smoothstep(0.0, 0.035, border)), over), lapped);
  float nv = clamp(dot(nrm, v), 0.0, 1.0);
  float fresnel = (0.02 + 0.07 * pow(1.0 - nv, 5.0)) * (1.0 - 0.7 * onRafts);
  vec3 r = reflect(-v, nrm);
  r.y = abs(r.y) + 0.05;
  // A raft is old skin, as dark as the crust: the sky hardly lights it, and what light it has is the glow of the melt at its edge.
  vec3 lit = skin * shade * mix(openSky, max(openSky, 0.7), onRafts) * (mix(0.06, 0.022, onRafts) * skyIrradiance(nrm) / 3.14159 + fresnel * 0.4 * skyRadiance(normalize(r)))
    // The open melt of the channel lights the skin beside it: brown, never grey.
    + skin * shade * 0.012 * (1.0 - onRafts) * blackbody(1300.0) * (0.4 + 0.6 * wide) * uLavaOn
    // A raft is lit from the side by the core: the flanks of its ropes that face the fire are red-brown, the others black.
    + skin * onRafts * (0.45 + 1.1 * pitted) * blackbody(1280.0) * 0.012 * fireLit * uLavaOn
    // The glow of the creases lies on the flanks of the ropes beside them: the skin is brown, not grey.
    + skin * 0.1 * (1.0 - 0.9 * onRafts) * blackbody(kCrease) * (1.0 - crease) * (0.25 + 0.75 * (1.0 - crest)) * uLavaOn;
  // A photographed plate is dark old skin: the sky lights its crests, and the melt it rides on lights the flanks that face it.
  if (photo > 0.0) {
    float faces = clamp(0.5 + 1.5 * dot(nrm.xz, fireFrom.xz), 0.0, 1.0);
    lit = mix(lit, skin * (openSky * (0.035 * skyIrradiance(nrm) / 3.14159 + fresnel * 0.4 * skyRadiance(normalize(r))) + blackbody(1300.0) * (0.02 * (0.3 + 0.7 * faces)) * mix(1.0, (0.06 + 0.7 * faces * faces) * (1.0 - 0.6 * smoothstep(0.55, 0.95, lineThick)), lineSkin) * uLavaOn), photo);
  }
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
  for (const [x, z, reach] of [[-401.5, 203.3, 2.0], [-493.8, 225.6, 1.6], [-491.0, 241.2, 1.6], [-416.9, 204.5, 1.0], [-383.2, 196.1, 1.2]] as const) {
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
