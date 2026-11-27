// The shape and the timing of a strike, both from its seed and the seconds since its frame: nothing is stepped.
import { stream, type Rng } from '../../../core/rng';
import type { Vec3 } from '../../../core/cameras';
import { cut, secondsInPlace } from '../../../film/cut';
import { UNIT } from '../shared/anchors';
import { STRIKES, type StrikeSite } from './where';

export interface Line {
  points: Vec3[];
  /** Radius of the lit channel, metres. */
  width: number;
  /** Share of the main channel's brightness. */
  gain: number;
  /** 0 at the cloud, 1 at the ground: where along the leader's way down each end of the line is. */
  from: number;
  to: number;
  /** 0 the main channel, 1 a branch (lit by the first stroke only). */
  branch: number;
}

const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

/** A crooked path between two points: each span is broken at a point near its middle and pushed sideways by a share of its own length, so it is crooked at every size and straight between kinks. */
function crooked(rng: Rng, from: Vec3, to: Vec3, depth: number, wander: number): Vec3[] {
  let pts: Vec3[] = [from, to];
  for (let d = 0; d < depth; d++) {
    const next: Vec3[] = [pts[0] as Vec3];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i] as Vec3;
      const b = pts[i + 1] as Vec3;
      const span = sub(b, a);
      const l = len(span);
      const k = rng.range(0.32, 0.68);
      // A channel wanders at the size of hundreds of metres and is sharply kinked at the size of metres, which is what a long lens sees of it.
      const push = l * wander * (d < 2 ? 1 : d < 4 ? 0.8 : 1.35);
      const m: Vec3 = [a[0] + span[0] * k + rng.range(-1, 1) * push, a[1] + span[1] * k + rng.range(-0.45, 0.45) * push, a[2] + span[2] * k + rng.range(-1, 1) * push];
      next.push(m, b);
    }
    pts = next;
  }
  return pts;
}

/** The whole figure of one strike: the channel from the cloud to the tip and its branches. */
export function figure(rng: Rng, site: StrikeSite): Line[] {
  const drift: Vec3 = site.lean ?? [rng.range(-200, 260), 0, -rng.range(260, 620)];
  const top: Vec3 = [site.to[0] + drift[0], site.to[1] + site.rise, site.to[2] + drift[2]];
  // How finely it is broken: a channel a long lens watches from close is crooked down to a metre, the others to some nine metres.
  const fine = site.rise < 500 ? 2 : 0;
  const main = crooked(rng, top, site.to, 7 + fine, 0.17);
  const lines: Line[] = [{ points: main, width: 1, gain: 1, from: 0, to: 1, branch: 0 }];
  const fork = (path: Vec3[], at: number, share: number, level: number, reach: number): void => {
    const i = Math.min(path.length - 3, Math.max(1, Math.floor(at * (path.length - 1))));
    const a = path[i] as Vec3;
    const ahead = sub(path[Math.min(path.length - 1, i + (6 << fine))] as Vec3, a);
    const l = len(ahead) || 1;
    // A branch leaves at 20 to 55 degrees from the way the channel goes, and always downward.
    const side: Vec3 = [rng.range(-1, 1), rng.range(-0.25, 0.1), rng.range(-1, 1)];
    const sl = len(side) || 1;
    const lean = rng.range(0.4, 1.3);
    const dir: Vec3 = [ahead[0] / l + (side[0] / sl) * lean, Math.min(-0.25, ahead[1] / l + (side[1] / sl) * lean), ahead[2] / l + (side[2] / sl) * lean];
    const dl = len(dir);
    const end = add(a, dir, reach / dl);
    const path2 = crooked(rng, a, end, (level === 0 ? 5 : 4) + fine, 0.2);
    lines.push({ points: path2, width: 0.5 * share + 0.12, gain: 0.5 * share, from: at, to: Math.min(1, at + (reach / site.rise) * 0.9), branch: 1 });
    if (level < 2) {
      const twigs = level === 0 ? (1 + rng.int(3)) : (0 + rng.int(2));
      for (let t = 0; t < twigs; t++) fork(path2, rng.range(0.2, 0.85), share * rng.range(0.35, 0.6), level + 1, reach * rng.range(0.3, 0.55));
    }
  };
  const forks = site.rise > 800 ? (5 + rng.int(4)) : (4 + rng.int(3));
  for (let f = 0; f < forks; f++) {
    const at = 0.06 + 0.8 * Math.pow((f + rng.range(0.1, 0.9)) / forks, 0.85);
    fork(main, at, rng.range(0.45, 1), 0, site.rise * (1 - at) * rng.range(0.25, 0.6) + 30);
  }
  if (site.branch) {
    // The bolt forks to a second spire: a branch that comes to ground, thinner and fainter than the main channel.
    const i = Math.floor(0.42 * (main.length - 1));
    const path2 = crooked(rng, main[i] as Vec3, site.branch, 6 + fine, 0.16);
    lines.push({ points: path2, width: 0.25, gain: 0.08, from: 0.42, to: 1, branch: 0 });
  }
  // Fine side branches near the tip: short hairs off the last hundred metres.
  for (let h = 0; h < 5; h++) fork(main, rng.range(0.82, 0.985), rng.range(0.15, 0.3), 2, rng.range(18, 60));
  return lines.concat(streamers(rng, site));
}

/** The channel a later stroke takes: it leaves the same cloud and lands on the same tip by another way, and of the first stroke's
 * branches it finds only the lowest again, faintly. */
export function restruck(rng: Rng, site: StrikeSite, first: Line[]): Line[] {
  const main = (first[0] as Line).points;
  // It keeps the first stroke's way through its upper half, where the air is still hot, and leaves it lower down.
  const at = Math.floor(main.length * rng.range(0.35, 0.55));
  const kept = main.slice(0, at + 1);
  const fine = site.rise < 500 ? 2 : 0;
  const fresh = crooked(rng, main[at] as Vec3, site.to, 6 + fine, 0.2);
  const path = kept.concat(fresh.slice(1));
  const lines: Line[] = [{ points: path, width: 0.85, gain: 1, from: 0, to: 1, branch: 0 }];
  for (let h = 0; h < 3; h++) {
    const i = Math.min(path.length - 3, Math.floor(rng.range(0.55, 0.97) * (path.length - 1)));
    const a = path[i] as Vec3;
    const reach = rng.range(20, 70);
    const dir: Vec3 = [rng.range(-1, 1), rng.range(-0.9, -0.3), rng.range(-1, 1)];
    lines.push({ points: crooked(rng, a, add(a, dir, reach / len(dir)), 4 + fine, 0.2), width: 0.3, gain: 0.3, from: i / (path.length - 1), to: 1, branch: 1 });
  }
  // And it forks as the first did, by ways of its own: two branches off its upper part that die in the air, each with a twig.
  for (let f = 0; f < 2; f++) {
    const i = Math.min(path.length - 3, Math.max(1, Math.floor(rng.range(0.22, 0.7) * (path.length - 1))));
    const a = path[i] as Vec3;
    const reach = site.rise * rng.range(0.16, 0.34);
    const dir: Vec3 = [rng.range(-1, 1), rng.range(-0.8, -0.35), rng.range(-1, 1)];
    const fork = crooked(rng, a, add(a, dir, reach / len(dir)), 5 + fine, 0.2);
    lines.push({ points: fork, width: 0.42, gain: 0.5, from: i / (path.length - 1), to: 1, branch: 1 });
    const j = Math.floor(rng.range(0.3, 0.7) * (fork.length - 1));
    const c = fork[j] as Vec3;
    const dir2: Vec3 = [rng.range(-1, 1), rng.range(-0.8, -0.3), rng.range(-1, 1)];
    lines.push({ points: crooked(rng, c, add(c, dir2, (0.45 * reach) / len(dir2)), 4 + fine, 0.2), width: 0.28, gain: 0.3, from: i / (path.length - 1), to: 1, branch: 1 });
  }
  return lines.concat(streamers(rng, site));
}

/** Where the channel lands: short threads that leave the tip upward to meet it. They are the contact flash, a few metres of it. */
function streamers(rng: Rng, site: StrikeSite): Line[] {
  const lines: Line[] = [];
  for (let k = 0; k < 5; k++) {
    const az = rng.range(0, Math.PI * 2);
    const up = rng.range(0.15, 1);
    const flat = Math.sqrt(1 - up * up);
    const reach = rng.range(1.5, 5.5);
    const end: Vec3 = [site.to[0] + Math.cos(az) * flat * reach, site.to[1] + up * reach, site.to[2] + Math.sin(az) * flat * reach];
    lines.push({ points: crooked(rng, site.to, end, 4, 0.3), width: 0.3, gain: 0.45, from: 1, to: 1, branch: 1 });
  }
  return lines;
}

export interface Strokes {
  /** Seconds after the strike's frame of each return stroke, and its share. */
  at: number[];
  share: number[];
  /** Seconds (under zero) at which one cloud of the storm is brightest with its own inner light before the first stroke comes to
   * ground, or null: it lights that cloud and what the cloud lights, and no channel is seen. */
  fore: number | null;
}

/** The frames after a strike's own on which it strikes again, by which strike it is. One each, three to five frames on: more
 * of them strobed, and between the two the land and the cloud keep a sinking share of the light (kept), so no frame is dark. */
const RESTRIKES: readonly (readonly number[])[] = [[4], [3], [5], [3], [4], [3]];

export function strokes(rng: Rng, which = 0): Strokes {
  // The first stroke is the flash; each restrike is weaker than the one before it, by an uneven share.
  const frames = RESTRIKES[which % RESTRIKES.length] as readonly number[];
  const at = [0];
  const share = [1];
  let last = rng.range(0.5, 0.62);
  for (const f of frames) {
    at.push(f / 60);
    share.push(last);
    last *= rng.range(0.5, 0.72);
  }
  return { at, share, fore: null };
}

const ramp = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** One return stroke as a camera at 60 frames a second takes it: full for the whole of the open shutter of its frame (the half frame from
 * its instant), gone before the next frame opens. Smooth, and exactly nothing 14 ms after it. */
const pulse = (age: number): number => ramp(-0.0016, -0.0002, age) * (1 - ramp(0.0092, 0.014, age));
/** The current that goes on in the channel after the first stroke: a dim frame and a dimmer one, then nothing. */
const current = (age: number): number => (age < 0.012 || age > 0.06 ? 0 : 0.085 * ramp(0.012, 0.016, age) * Math.exp(-(age - 0.016) / 0.013) * (1 - ramp(0.04, 0.06, age)));

/** The light inside the cloud in the tenth of a second before the first stroke: the breakdown that sends the leader down. It flickers and grows. */
export const breakdown = (age: number): number => {
  if (age >= 0 || age < -0.3) return 0;
  const k = Math.min(1, Math.max(0, (age + 0.11) / 0.09));
  const early = 0.05 * Math.max(0, Math.sin((age + 0.3) * 31) * Math.sin((age + 0.3) * 10.5)) * (1 + age / 0.3);
  return (early + 0.3 * k * k * (0.7 + 0.3 * Math.sin(age * 190))) * (1 - ramp(-0.004, -0.0016, age));
};

/** A cloud lit from inside, at seconds from its brightest: it comes up over a tenth of a second, wavers, and sinks under the first
 * strokes. No frame of it is a flash. */
const inner = (t: number): number => ramp(-0.1, 0, t) * (1 - ramp(0.012, 0.085, t)) * (0.88 + 0.12 * Math.sin(t * 95));

/** What the strokes leave behind them, as a share of the first: each stroke's light sinks by `tau` seconds and the brightest of them
 * counts, so that a frame between two strokes is darker than both and lit. Smooth, and exactly nothing 0.45 s after the last stroke. */
const kept = (s: Strokes, age: number, tau: number): number => {
  let most = 0;
  for (let i = 0; i < s.at.length; i++) {
    const t = age - (s.at[i] as number);
    if (t > 0) most = Math.max(most, (s.share[i] as number) * (1 - Math.exp(-t / 0.003)) * Math.exp(-t / tau));
  }
  return most * (1 - ramp(0.25, 0.45, age - (s.at[s.at.length - 1] as number)));
};

/** How bright the main channel is, the branches are, and the glow the cloud keeps, at seconds since the strike's frame. `leader` is 1: a
 * camera does not see the leader, and nothing is drawn of the channel before its first stroke. */
export function envelope(s: Strokes, age: number): { main: number; branch: number; after: number; leader: number; cloud: number; held: number; glow: number; channel: number } {
  let main = current(age);
  for (let i = 0; i < s.at.length; i++) main += (s.share[i] as number) * pulse(age - (s.at[i] as number));
  // What the cloud holds after each stroke: a dull glow that sinks in an eighth of a second. Nothing of it is in the channel.
  let after = 0;
  for (let i = 0; i < s.at.length; i++) {
    const t = age - (s.at[i] as number);
    if (t > 0) after += 0.05 * (s.share[i] as number) * (1 - Math.exp(-t / 0.004)) * Math.exp(-t / 0.12);
  }
  // What is seen of the channel: each stroke whole for its frame, then the current it leaves, a fifth of it and sinking fast.
  let channel = 0;
  for (let i = 0; i < s.at.length; i++) {
    const t = age - (s.at[i] as number);
    channel = Math.max(channel, (i === 0 ? 1 : Math.max(0.7, s.share[i] as number)) * (pulse(t) + (t > 0.01 ? 0.2 * ramp(0.01, 0.016, t) * Math.exp(-(t - 0.016) / 0.012) * (1 - ramp(0.03, 0.045, t)) : 0)));
  }
  return { main, branch: pulse(age) + (age > 0.01 ? 0.2 * ramp(0.01, 0.016, age) * Math.exp(-(age - 0.016) / 0.012) * (1 - ramp(0.03, 0.045, age)) : 0), after, leader: 1, cloud: s.fore === null ? 0 : inner(age - s.fore), held: kept(s, age, 0.07), glow: kept(s, age, 0.14), channel };
}

/** Which return stroke the channel last carried at these seconds since the strike's frame: each takes a way of its own. */
export function strokeAt(s: Strokes, age: number): number {
  let n = 0;
  for (let i = 1; i < s.at.length; i++) if (age >= (s.at[i] as number) - 0.002) n = i;
  return n;
}

export interface Flash {
  /** The struck tip. */
  at: Vec3;
  /** Brightness of the stroke, 0 to about 1. */
  power: number;
  /** Which spire, counted from the first. */
  spire: number;
  /** Seconds since the strike's frame. */
  age: number;
}

const TIMING = new Map<string, Strokes>();
/** The return strokes of a strike, from its name alone. */
export function timingOf(id: string): Strokes {
  let t = TIMING.get(id);
  if (!t) {
    t = strokes(stream(`spine/strokes/${id}`), Math.max(0, STRIKES.findIndex((s) => s.id === id)));
    // A frame the film is judged on that falls inside the flicker of a strike has a stroke of its own: the stroke nearest to it burns on that frame.
    const site = STRIKES.find((s) => s.id === id);
    for (const frame of Object.values(cut.keyFrames)) {
      const age = site ? secondsInPlace(UNIT, frame) - site.seconds : -1;
      // A judged frame just before the strike's own has a cloud lit from inside: the channel is not there yet.
      if (age < -0.002 && age > -0.06) t.fore = age;
      if (age < 0.025 || age > 0.3) continue;
      let near = 1;
      for (let i = 1; i < t.at.length; i++) if (Math.abs((t.at[i] as number) - age) < Math.abs((t.at[near] as number) - age)) near = i;
      t.at[near] = age;
      // It is a restrike: bright enough to be the picture of a strike, and under the flash of the first.
      t.share[near] = Math.max(t.share[near] as number, 0.62);
      for (let i = near + 1; i < t.at.length; i++) t.at[i] = Math.max(t.at[i] as number, (t.at[i - 1] as number) + 2 / 60);
      for (let i = near - 1; i >= 1; i--) t.at[i] = Math.min(t.at[i] as number, (t.at[i + 1] as number) - 2 / 60);
    }
    TIMING.set(id, t);
  }
  return t;
}

/** The strike that lights the place at a time: the kites and the herd read it. Null between strikes. */
export function flashAt(seconds: number): Flash | null {
  for (const site of STRIKES) {
    const age = seconds - site.seconds;
    if (age < -0.12 || age > 1.2) continue;
    const e = envelope(timingOf(site.id), age);
    return { at: site.to, power: e.main + e.after + 0.6 * breakdown(age), spire: site.spire, age };
  }
  return null;
}
