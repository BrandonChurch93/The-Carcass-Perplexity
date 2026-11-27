// The stream in the tide channel, worked out once at creation from the bed the land folder laid: which way the water goes at every place,
// how fast, where it breaks, and what it carries. Nothing here is drawn: the shader reads two pictures made from it.
//
// The water goes where the bed lets it. Its flux is the turned gradient of one number, psi, which is 0 on the west bank and 1 on the east
// one, so no water is made or lost anywhere, none crosses a bank, and it parts round every stone that stands in it. Deep water carries more
// than shallow (the bed's drag), so the stream keeps to the deep lane and crawls over the bars.
//
// What floats is carried in the shader by reading a pattern where the fleck was a moment ago, along the velocity baked here, in two
// readings half a turn apart. Reading a pattern at (psi, time of travel) was tried first and drew the flecks out into hairs wherever the
// lines of the stream close up: do not go back to it.
import * as THREE from 'three';

export interface Flow {
  /** Half floats. r: psi in metres across a channel 24 m wide, g and b: the velocity along x and z, m a second, a: the mean pace of the stream round the place. */
  lines: THREE.DataTexture;
  /** Bytes. r: the speed over FASTEST, g: what the stream carries (froth shed by stones, bars and banks upstream), b: how broken the water is (fast over a shallow bed). */
  carried: THREE.DataTexture;
  /** minX, minZ, 1 / width, 1 / depth of the ground the two pictures cover. */
  rect: THREE.Vector4;
}

export const FASTEST = 0.8;
const CELL = 0.5;
const AREA = { minX: -150, maxX: 0, minZ: -180, maxZ: 112 };
const ACROSS = 24;

export function flowMap(height: (x: number, z: number) => number, sea: number, middle: (z: number) => number): Flow {
  const w = Math.round((AREA.maxX - AREA.minX) / CELL);
  const h = Math.round((AREA.maxZ - AREA.minZ) / CELL);
  const n = w * h;
  const depth = new Float32Array(n);
  const carry = new Float32Array(n);
  // 0 water, 1 the west bank, 2 the east bank, 3 a stone or bar that stands in the stream.
  const kind = new Uint8Array(n);
  const psi = new Float32Array(n);
  for (let j = 0; j < h; j++) {
    const z = AREA.minZ + (j + 0.5) * CELL;
    const mid = middle(z);
    for (let i = 0; i < w; i++) {
      const x = AREA.minX + (i + 0.5) * CELL;
      const d = Math.max(0, sea - height(x, z));
      const o = j * w + i;
      depth[o] = Math.min(d, 1.2);
      // The bed's drag: what a column of water carries goes as its depth to the power five thirds.
      carry[o] = d > 0.012 ? Math.min(d, 1.2) ** 1.67 : 0;
      kind[o] = d > 0.012 ? 0 : 3;
      psi[o] = x < mid ? 0 : 1;
    }
  }
  // The banks: dry ground that is joined to the west or the east edge on its own side of the channel's middle line.
  const stack: number[] = [];
  const flood = (side: 1 | 2): void => {
    const i0 = side === 1 ? 0 : w - 1;
    for (let j = 0; j < h; j++) if (kind[j * w + i0] === 3) stack.push(j * w + i0);
    while (stack.length > 0) {
      const o = stack.pop() as number;
      if (kind[o] !== 3) continue;
      const i = o % w;
      const j = (o - i) / w;
      const west = AREA.minX + (i + 0.5) * CELL < middle(AREA.minZ + (j + 0.5) * CELL);
      if (west !== (side === 1)) continue;
      kind[o] = side;
      if (i > 0) stack.push(o - 1);
      if (i < w - 1) stack.push(o + 1);
      if (j > 0) stack.push(o - w);
      if (j < h - 1) stack.push(o + w);
    }
  };
  flood(1);
  flood(2);
  // Water that no stream reaches (a pool on the flats, shut in by one bank) keeps that bank's number and stands still.
  const free: number[] = [];
  for (let o = 0; o < n; o++) {
    if (kind[o] === 1) psi[o] = 0;
    else if (kind[o] === 2) psi[o] = 1;
    else free.push(o);
  }
  // Relaxed to rest, over and under by turns. The face between two cells passes what the shallower lets it.
  const pass = (a: number, b: number): number => 1 / (0.5 * ((carry[a] as number) + (carry[b] as number)) + 0.0015);
  const order = Uint32Array.from(free);
  for (let it = 0; it < 260; it++) {
    const back = it % 2 === 1;
    for (let q = 0; q < order.length; q++) {
      const o = order[back ? order.length - 1 - q : q] as number;
      const i = o % w;
      const j = (o - i) / w;
      const l = i > 0 ? o - 1 : o;
      const r = i < w - 1 ? o + 1 : o;
      const u = j > 0 ? o - w : o;
      const d = j < h - 1 ? o + w : o;
      const kl = pass(o, l);
      const kr = pass(o, r);
      const ku = pass(o, u);
      const kd = pass(o, d);
      const want = (kl * (psi[l] as number) + kr * (psi[r] as number) + ku * (psi[u] as number) + kd * (psi[d] as number)) / (kl + kr + ku + kd);
      psi[o] = (psi[o] as number) + 1.82 * (want - (psi[o] as number));
    }
  }
  // The speed: the flux over the depth. Out to the sea is +z.
  const vx = new Float32Array(n);
  const vz = new Float32Array(n);
  const speed = new Float32Array(n);
  const sorted: number[] = [];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const o = j * w + i;
      if (kind[o] !== 0) continue;
      const l = i > 0 ? o - 1 : o;
      const r = i < w - 1 ? o + 1 : o;
      const u = j > 0 ? o - w : o;
      const d = j < h - 1 ? o + w : o;
      const over = (depth[o] as number) + 0.04;
      vx[o] = -((psi[d] as number) - (psi[u] as number)) / over;
      vz[o] = ((psi[r] as number) - (psi[l] as number)) / over;
      speed[o] = Math.hypot(vx[o] as number, vz[o] as number);
      if ((depth[o] as number) > 0.2) sorted.push(speed[o] as number);
    }
  }
  sorted.sort((a, b) => a - b);
  // The narrow reach runs at a walk and the wide shallows above it crawl: all but the fastest thirtieth of the deep water is under 0.6 m a second.
  const scale = 0.6 / Math.max(sorted[Math.floor(sorted.length * 0.97)] ?? 1, 1e-6);
  for (let o = 0; o < n; o++) {
    const s = Math.min((speed[o] as number) * scale, FASTEST);
    const by = (speed[o] as number) > 1e-9 ? s / (speed[o] as number) : 0;
    vx[o] = (vx[o] as number) * by;
    vz[o] = (vz[o] as number) * by;
    speed[o] = s;
  }
  // The mean speed of the stream round a place: the speed spread over twelve metres, by depth.
  const blur = (from: Float32Array, weight: Float32Array, radius: number): Float32Array => {
    const sum = new Float32Array(n);
    const sumW = new Float32Array(n);
    const tmp = new Float32Array(n);
    const tmpW = new Float32Array(n);
    for (let j = 0; j < h; j++) {
      let a = 0;
      let b = 0;
      for (let i = -radius; i < w; i++) {
        const add = i + radius;
        if (add < w) {
          a += (from[j * w + add] as number) * (weight[j * w + add] as number);
          b += weight[j * w + add] as number;
        }
        const drop = i - radius - 1;
        if (drop >= 0) {
          a -= (from[j * w + drop] as number) * (weight[j * w + drop] as number);
          b -= weight[j * w + drop] as number;
        }
        if (i >= 0) {
          tmp[j * w + i] = a;
          tmpW[j * w + i] = b;
        }
      }
    }
    for (let i = 0; i < w; i++) {
      let a = 0;
      let b = 0;
      for (let j = -radius; j < h; j++) {
        const add = j + radius;
        if (add < h) {
          a += tmp[add * w + i] as number;
          b += tmpW[add * w + i] as number;
        }
        const drop = j - radius - 1;
        if (drop >= 0) {
          a -= tmp[drop * w + i] as number;
          b -= tmpW[drop * w + i] as number;
        }
        if (j >= 0) {
          sum[j * w + i] = a;
          sumW[j * w + i] = b;
        }
      }
    }
    for (let o = 0; o < n; o++) sum[o] = (sumW[o] as number) > 1e-6 ? Math.max(0, (sum[o] as number) / (sumW[o] as number)) : 0;
    return sum;
  };
  const mean = blur(blur(speed, depth, 12), depth, 12);
  // What floats is carried by the stream a metre and a half round it, not by the cell it is in: beside a stone the speed changes within a
  // cell, and a pattern carried by that is torn into streaks in a second.
  const eased = (f: Float32Array): Float32Array => {
    const up = blur(f.map((v) => v + 2), depth, 3);
    return up.map((v) => (v > 0 ? v - 2 : 0));
  };
  const carryX = eased(vx);
  const carryZ = eased(vz);

  // What the stream sheds and where it breaks. Froth is made where fast water runs thin over a bar, where it passes a stone, and along a bank it rubs.
  const broken = new Float32Array(n);
  const made = new Float32Array(n);
  for (let j = 1; j < h - 1; j++) {
    for (let i = 1; i < w - 1; i++) {
      const o = j * w + i;
      if (kind[o] !== 0) continue;
      const s = speed[o] as number;
      const thin = s / Math.sqrt(9.81 * ((depth[o] as number) + 0.02));
      broken[o] = Math.min(1, Math.max(0, (thin - 0.16) / 0.3));
      const stone = kind[o - 1] === 3 || kind[o + 1] === 3 || kind[o - w] === 3 || kind[o + w] === 3 ? 1 : 0;
      const bank = kind[o - 1] !== 0 || kind[o + 1] !== 0 || kind[o - w] !== 0 || kind[o + w] !== 0 ? 1 : 0;
      made[o] = (broken[o] as number) * 0.5 + stone * Math.min(1, s / 0.25) * 1.6 + bank * Math.min(1, s / 0.3) * 0.5;
    }
  }
  // What is carried, by going one cell back up the stream from every place. The rows are taken from the land toward the sea, which is
  // the way the stream goes, twice over, west to east and east to west, so that a reach that runs across the channel is served too.
  const froth = new Float32Array(n);
  const at = (f: Float32Array, x: number, z: number): number => {
    const fx = Math.min(w - 1.001, Math.max(0, x));
    const fz = Math.min(h - 1.001, Math.max(0, z));
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const tx = fx - i;
    const tz = fz - j;
    const o = j * w + i;
    return ((f[o] as number) * (1 - tx) + (f[o + 1] as number) * tx) * (1 - tz) + ((f[o + w] as number) * (1 - tx) + (f[o + w + 1] as number) * tx) * tz;
  };
  for (let sweep = 0; sweep < 4; sweep++) {
    for (let j = 0; j < h; j++) {
      for (let q = 0; q < w; q++) {
        const i = sweep % 2 === 0 ? q : w - 1 - q;
        const o = j * w + i;
        const s = speed[o] as number;
        if (kind[o] !== 0 || s < 0.004) {
          froth[o] = 0;
          continue;
        }
        const ux = (vx[o] as number) / s;
        const uz = (vz[o] as number) / s;
        // What is carried sinks and bursts: half of it is gone in twelve seconds.
        froth[o] = Math.min(4, at(froth, i - ux, j - uz) * Math.exp(-CELL / (Math.max(s, 0.03) * 17)) + (made[o] as number) * CELL * 0.35);
      }
    }
  }

  const lines = new Uint16Array(n * 4);
  const carried = new Uint8Array(n * 4);
  const half = THREE.DataUtils.toHalfFloat;
  for (let o = 0; o < n; o++) {
    lines[o * 4] = half((psi[o] as number) * ACROSS);
    lines[o * 4 + 1] = half(carryX[o] as number);
    lines[o * 4 + 2] = half(carryZ[o] as number);
    lines[o * 4 + 3] = half(Math.max(mean[o] as number, 0.12));
    carried[o * 4] = Math.round(255 * Math.min(1, (speed[o] as number) / FASTEST));
    carried[o * 4 + 1] = Math.round(255 * Math.min(1, (froth[o] as number) / 2));
    carried[o * 4 + 2] = Math.round(255 * (broken[o] as number));
    carried[o * 4 + 3] = 255;
  }
  const set = (t: THREE.DataTexture): THREE.DataTexture => {
    t.colorSpace = THREE.NoColorSpace;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  };
  return {
    lines: set(new THREE.DataTexture(lines, w, h, THREE.RGBAFormat, THREE.HalfFloatType)),
    carried: set(new THREE.DataTexture(carried, w, h, THREE.RGBAFormat, THREE.UnsignedByteType)),
    rect: new THREE.Vector4(AREA.minX, AREA.minZ, 1 / (AREA.maxX - AREA.minX), 1 / (AREA.maxZ - AREA.minZ)),
  };
}
