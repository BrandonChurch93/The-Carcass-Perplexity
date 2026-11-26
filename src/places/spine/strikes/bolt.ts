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
      // A real channel wanders most at the size of tens of metres and stays crooked below: the share falls slowly with depth.
      const push = l * wander * (d < 2 ? 1 : 0.8);
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
  const main = crooked(rng, top, site.to, 7, 0.17);
  const lines: Line[] = [{ points: main, width: 1, gain: 1, from: 0, to: 1, branch: 0 }];
  const fork = (path: Vec3[], at: number, share: number, level: number, reach: number): void => {
    const i = Math.min(path.length - 3, Math.max(1, Math.floor(at * (path.length - 1))));
    const a = path[i] as Vec3;
    const ahead = sub(path[Math.min(path.length - 1, i + 6)] as Vec3, a);
    const l = len(ahead) || 1;
    // A branch leaves at 20 to 55 degrees from the way the channel goes, and always downward.
    const side: Vec3 = [rng.range(-1, 1), rng.range(-0.25, 0.1), rng.range(-1, 1)];
    const sl = len(side) || 1;
    const lean = rng.range(0.4, 1.3);
    const dir: Vec3 = [ahead[0] / l + (side[0] / sl) * lean, Math.min(-0.25, ahead[1] / l + (side[1] / sl) * lean), ahead[2] / l + (side[2] / sl) * lean];
    const dl = len(dir);
    const end = add(a, dir, reach / dl);
    const path2 = crooked(rng, a, end, level === 0 ? 5 : 4, 0.2);
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
    const path2 = crooked(rng, main[i] as Vec3, site.branch, 6, 0.16);
    lines.push({ points: path2, width: 0.25, gain: 0.08, from: 0.42, to: 1, branch: 0 });
  }
  // Fine side branches near the tip: short hairs off the last hundred metres.
  for (let h = 0; h < 5; h++) fork(main, rng.range(0.82, 0.985), rng.range(0.15, 0.3), 2, rng.range(18, 60));
  return lines;
}

export interface Strokes {
  /** Seconds after the strike's frame of each return stroke, and its share. */
  at: number[];
  share: number[];
}

export function strokes(rng: Rng): Strokes {
  // No two strikes keep the same time: two to five strokes, the first the brightest by far, the gaps between them uneven (a quick pair,
  // then a wait), each restrike weaker than the one before it.
  const count = 2 + rng.int(4);
  const at = [0];
  const share = [1.3];
  const waitAt = 1 + rng.int(Math.max(1, count - 1));
  let last = rng.range(0.45, 0.7);
  for (let i = 1; i < count; i++) {
    // Each falls on the first instant of a frame, so that the open shutter sees it.
    at.push((at[i - 1] as number) + Math.round((i === waitAt ? rng.range(0.11, 0.19) : rng.range(0.03, 0.07)) * 60) / 60);
    share.push(last);
    last *= rng.range(0.45, 0.8);
  }
  return { at, share };
}

/** One return stroke: it rises in 3 ms, falls to a third in a frame, and a continuing current holds the channel lit, dimmer, for three
 * frames more. Smooth, so the four samples of a frame blur it and none of them pops. */
const pulse = (age: number): number => (age <= 0 ? 0 : (1 - Math.exp(-age / 0.003)) * (0.75 * Math.exp(-age / 0.012) + 0.25 * Math.exp(-age / 0.05)));
/** A restrike: as sharp, and gone sooner, with little current after it: the dark between the strokes is dark. */
const repulse = (age: number): number => (age <= 0 ? 0 : (1 - Math.exp(-age / 0.003)) * (0.9 * Math.exp(-age / 0.011) + 0.1 * Math.exp(-age / 0.03)));

/** The light inside the cloud in the tenth of a second before the first stroke: the breakdown that sends the leader down. It flickers and grows. */
export const breakdown = (age: number): number => {
  if (age >= 0 || age < -0.3) return 0;
  const k = Math.min(1, Math.max(0, (age + 0.11) / 0.09));
  const early = 0.05 * Math.max(0, Math.sin((age + 0.3) * 31) * Math.sin((age + 0.3) * 10.5)) * (1 + age / 0.3);
  return early + 0.3 * k * k * (0.7 + 0.3 * Math.sin(age * 190));
};

/** How bright the main channel is, the branches are, and the glow left in the channel, at seconds since the strike's frame. */
export function envelope(s: Strokes, age: number): { main: number; branch: number; after: number; leader: number } {
  // The engine's samples of the strike's own frame start at its first instant: the first stroke is lit from just before it.
  const t = age + 0.004;
  let main = 0;
  for (let i = 0; i < s.at.length; i++) main += (s.share[i] as number) * (i === 0 ? pulse(t) : repulse(t - (s.at[i] as number)));
  // What is left in the channel after the last stroke: a dull thread that cools in a tenth of a second.
  const last = s.at[s.at.length - 1] as number;
  const after = t <= last ? 0 : 0.02 * Math.exp(-(t - last) / 0.1) * (1 - Math.exp(-(t - last) / 0.02));
  // The leader finds its way down in the twentieth of a second before the stroke: 0 at the cloud to 1 at the ground.
  const leader = t < 0 ? Math.max(0, 1 + t / 0.05) : 1;
  return { main, branch: pulse(t), after, leader };
}

/** Which return stroke the channel last carried at these seconds since the strike's frame: each takes a way of its own. */
export function strokeAt(s: Strokes, age: number): number {
  let n = 0;
  for (let i = 1; i < s.at.length; i++) if (age + 0.004 >= (s.at[i] as number) - 0.002) n = i;
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
    t = strokes(stream(`spine/strokes/${id}`));
    // A frame the film is judged on that falls inside the flicker of a strike has a stroke of its own: the stroke nearest to it burns on that frame.
    const site = STRIKES.find((s) => s.id === id);
    for (const frame of Object.values(cut.keyFrames)) {
      const age = site ? secondsInPlace(UNIT, frame) - site.seconds : -1;
      if (age < 0.025 || age > 0.3) continue;
      let near = 1;
      for (let i = 1; i < t.at.length; i++) if (Math.abs((t.at[i] as number) - age) < Math.abs((t.at[near] as number) - age)) near = i;
      t.at[near] = age;
      t.share[near] = 1;
      for (let i = near + 1; i < t.at.length; i++) t.at[i] = Math.max(t.at[i] as number, (t.at[i - 1] as number) + 0.05);
      for (let i = near - 1; i >= 1; i--) t.at[i] = Math.min(t.at[i] as number, (t.at[i + 1] as number) - 0.03);
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
