// The shape and the timing of a strike, both from its seed and the seconds since its frame: nothing is stepped.
import type { Rng } from '../../../core/rng';
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
  // And it forks as the first did, by ways of its own: three branches off its upper part that die in the air, each with a twig.
  for (let f = 0; f < 3; f++) {
    const i = Math.min(path.length - 3, Math.max(1, Math.floor(rng.range(0.22, 0.7) * (path.length - 1))));
    const a = path[i] as Vec3;
    const reach = site.rise * rng.range(0.24, 0.46);
    const dir: Vec3 = [rng.range(-1, 1), rng.range(-0.8, -0.35), rng.range(-1, 1)];
    const fork = crooked(rng, a, add(a, dir, reach / len(dir)), 5 + fine, 0.2);
    lines.push({ points: fork, width: 0.42, gain: 0.7, from: i / (path.length - 1), to: 1, branch: 1 });
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
  /** Seconds after the strike's frame for which its channel goes on burning: to a judged frame that falls inside the strike, so that
   * the frame has its bolt. 0 where no judged frame does: then the channel is seen on its own frame and as a thread on the next. */
  hold: number;
  /** Seconds (under zero) at which one cloud of the storm is brightest with its own inner light before the stroke comes to
   * ground, or null: it lights that cloud and what the cloud lights, and no channel is seen. */
  fore: number | null;
  /** Seconds over which the cloud comes up before the stroke, where that is not the usual. */
  swell?: number;
}

const ramp = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** The stroke as a camera at 60 frames a second takes it: full for the whole of the open shutter of its frame (the half frame from
 * its instant), gone before the next frame opens. Smooth, and exactly nothing 14 ms after it. */
const pulse = (age: number): number => ramp(-0.0016, -0.0002, age) * (1 - ramp(0.0092, 0.014, age));
/** What a strike's light leaves once the stroke's own frame is over: this share of it on the next frame, sinking by `over` seconds,
 * and exactly nothing `end` seconds after the stroke. One fall and no second rise: a strike is one flash. */
const fall = (age: number, share: number, over: number, end: number): number => (age < 0.012 ? 0 : share * ramp(0.012, 0.0165, age) * Math.exp(-(age - 0.0165) / over) * (1 - ramp(0.6 * end, end, age)));

/** The light inside the cloud in the tenth of a second before the stroke: the breakdown that sends the leader down. It flickers and grows. */
export const breakdown = (age: number): number => {
  if (age >= 0 || age < -0.3) return 0;
  const k = Math.min(1, Math.max(0, (age + 0.11) / 0.09));
  const early = 0.05 * Math.max(0, Math.sin((age + 0.3) * 31) * Math.sin((age + 0.3) * 10.5)) * (1 + age / 0.3);
  return (early + 0.3 * k * k * (0.7 + 0.3 * Math.sin(age * 190))) * (1 - ramp(-0.004, -0.0016, age));
};

/** A cloud lit from inside, at seconds from its brightest: it comes up over a tenth of a second, wavers, and sinks under the
 * stroke. No frame of it is a flash. */
const inner = (t: number): number => ramp(-0.1, 0, t) * (1 - ramp(0.012, 0.085, t)) * (0.88 + 0.12 * Math.sin(t * 95));

/** The light a strike throws, by the frame, as shares of the stroke's own: 1, then 0.4 and sinking by a quarter each frame, nothing
 * after a quarter of a second. */
const LIGHT_KEEPS = 0.4;
const LIGHT_OVER = 0.062;
const LIGHT_END = 0.25;
/** The glow of the cloud about the channel goes sooner: nothing of it six frames after the channel is dark. */
const GLOW_KEEPS = 0.42;
const GLOW_OVER = 0.026;
const GLOW_END = 0.1;
/** A channel that goes on burning (hold) keeps this share of the stroke on the next frame, and sinks by `HELD_OVER` seconds until the
 * hold is over; then it is a thread for three frames. */
const HELD_KEEPS = 0.9;
const HELD_OVER = 0.22;
/** And its light on the land: this share on the next frame, sinking by `HELD_LIGHT_OVER` seconds, nothing after `HELD_LIGHT_END`. */
const HELD_LIGHT = 0.72;
const HELD_LIGHT_OVER = 0.1;
const HELD_LIGHT_END = 0.3;

/** The cloud comes up over this many seconds before a stroke. */
const RISE_OVER = 0.07;
/** A stroke on the last frame of a shot is seen for that one frame and then from another lens: alone it is a single brighter frame
 * before a cut. Its cloud comes up over this many seconds instead, and the land with it (index.ts), so the light swells into the cut. */
const SWELL_OVER = 0.15;

/** One strike at seconds since its frame. `light`: what it throws on the land, the sea and the storm, one rise and one fall.
 * `channel` and `branch`: how bright the channel and its branches are drawn. `glow`: the cloud about the channel, lit from inside.
 * `rise`: the cloud coming up before the stroke, 0 to 1. `cloud`: one cloud lit from inside before the stroke (fore), or 0. */
export function envelope(s: Strokes, age: number): { light: number; channel: number; branch: number; glow: number; rise: number; cloud: number } {
  const on = pulse(age);
  // While the channel burns on, its light goes on with it and sinks slower: no second rise.
  const light = on + (s.hold > 0 ? fall(age, HELD_LIGHT, HELD_LIGHT_OVER, HELD_LIGHT_END) : fall(age, LIGHT_KEEPS, LIGHT_OVER, LIGHT_END));
  let channel: number;
  if (s.hold > 0) {
    const past = age - s.hold - 0.0092;
    channel = on + (past <= 0 ? fall(age, HELD_KEEPS, HELD_OVER, 9) : HELD_KEEPS * Math.exp(-s.hold / HELD_OVER) * Math.exp(-past / 0.016) * (1 - ramp(0.04, 0.07, past)));
  } else channel = on + fall(age, 0.3, 0.014, 0.05);
  const glow = Math.max(on + fall(age, GLOW_KEEPS, GLOW_OVER, GLOW_END), s.hold > 0 ? 0.6 * channel : 0);
  const rise = age < 0 ? Math.max(0, 1 + age / (s.swell ?? RISE_OVER)) ** 2 * (1 - on) : 0;
  return { light, channel, branch: s.hold > 0 ? 0.85 * channel : channel, glow, rise, cloud: s.fore === null ? 0 : inner(age - s.fore) };
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
/** How long a strike's channel burns, from its name alone. */
export function timingOf(id: string): Strokes {
  let t = TIMING.get(id);
  if (!t) {
    t = { hold: 0, fore: null };
    const site = STRIKES.find((s) => s.id === id);
    for (const frame of Object.values(cut.keyFrames)) {
      const age = site ? secondsInPlace(UNIT, frame) - site.seconds : -1;
      // A judged frame just before the strike's own has a cloud lit from inside: the channel is not there yet.
      if (age < -0.002 && age > -0.06) t.fore = age;
      // A judged frame that falls inside the strike has the bolt in it: the channel burns on until that frame.
      if (age >= 0.012 && age <= 0.3) t.hold = Math.max(t.hold, age);
    }
    if (site && cut.shots.some((shot) => Math.abs(secondsInPlace(UNIT, shot.last) - site.seconds) < 0.004)) t.swell = SWELL_OVER;
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
    return { at: site.to, power: e.light + 0.2 * e.rise, spire: site.spire, age };
  }
  return null;
}
