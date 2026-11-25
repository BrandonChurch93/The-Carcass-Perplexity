// Where things stand and when things happen in the Spine. Owned by the root. The partner's folders read these and never hold a copy.
// World metres: origin at the foot of the first spire, on its axis. The ridge runs toward +x. The storm stands on -z (l < 0 in ridge coordinates),
// the cloud sea and the last light lie on +z (l > 0). Ridge coordinates: s metres along the crest from the first spire, l metres across it.
import type { Vec3 } from '../../../core/cameras';
import { cut, eventsOf, keyPart, secondsInPlace, shotById, shotLength } from '../../../film/cut';
import { CANAL_L, EXIT, EXIT_FLARE, FIRST, FLOOR, MOUTH_S, canalL, finEdge, first, heightAbove, on, spires, tipOf, world, type Spire } from '../ridge';

export const UNIT = 'spine';
export const RAD = Math.PI / 180;

/** Seconds, in the time of the place, of a key frame. */
export const keySeconds = (key: string): number => secondsInPlace(UNIT, cut.keyFrames[key] as number);

/** Seconds of the six strikes, in the time of the place, in order: strike-1 at 0. Each lasts STRIKE_SECONDS in the blockout. */
export const STRIKES: readonly number[] = eventsOf(UNIT).map((e) => e.seconds);
export const STRIKE_IDS: readonly string[] = eventsOf(UNIT).map((e) => e.id);
export const STRIKE_FRAMES = 6;

/** The gale: the direction the air moves in (x, y, z), out of the storm and over the crest toward the open side. Metres a second for spindrift and cloud. */
export const WIND: Vec3 = [0.2, 0, 0.98];
export const WIND_SPEED = 26;
/** The top of the cloud sea. */
export const SEA_LEVEL = -2000;
/** The last light: the direction toward the orange band at the horizon (level). */
export const DUSK: Vec3 = [0.83, 0, 0.56];

export const heading = (a: Vec3, b: Vec3): number => Math.atan2(b[2] - a[2], b[0] - a[0]) / RAD;
export const pitchTo = (a: Vec3, b: Vec3): number => Math.atan2(b[1] - a[1], Math.hypot(b[0] - a[0], b[2] - a[2])) / RAD;
export const step = (p: Vec3, h: number, dist: number, up = 0): Vec3 => [p[0] + Math.cos(h * RAD) * dist, p[1] + up, p[2] + Math.sin(h * RAD) * dist];

/** The n-th spire the film sees: 1 is the first spire (the origin), 2 the next down the ridge, and so on. */
export const spire = (n: number): Spire => spires[FIRST + n - 1] as Spire;
/** A point in the canal: d metres in from the near mouth, l metres right of its axis, h metres over its floor. */
export const tube = (d: number, l: number, h: number): Vec3 => world(MOUTH_S + d, canalL(d) + l, FLOOR + h);
/** A point moved to `up` metres over the ground under it. */
export const raised = (p: Vec3, up: number): Vec3 => [p[0], p[1] - heightAbove(p) + up, p[2]];
/** The near mouth of the canal, 8 m over its floor. */
export const MOUTH = tube(0, 0, 8);

/** The trail the runners trod to the mouth: l at s. */
export const trail = (s: number): number => 2.2 * Math.sin(s / 31) * (1 - Math.min(1, Math.max(0, (s - MOUTH_S + 160) / 150))) + CANAL_L * Math.min(1, Math.max(0, (s - MOUTH_S + 160) / 150)) ** 2;

/** Where lightning came to ground: the carcass on the saddle, with the mouth ahead. `carcassView` is the heading of the key's lens, degrees. */
export const CARCASS_S = first.s - 655;
export const CARCASS = on(CARCASS_S, 1.5, 0);
export const carcassView = heading(CARCASS, MOUTH) + 9;
export const carcassAxis = carcassView + 80;
export const carcassBody = step(CARCASS, carcassAxis, 0.5);

/** The edge of the first spire where the kites are tethered (key spine-2). */
export const kiteEdge = finEdge(first, 0.74, 1);

/** The tip of the third spire: the strike of key spine-3. */
export const strikeTip = tipOf(spire(3));

/** What each strike hits, in order of the events: the tip, how thick the stand-in bolt is, how high it starts, its lean, and a branch. */
export const STRIKE_TARGETS: { to: Vec3; thick: number; rise: number; lean: Vec3 | null; branch: Vec3 | null }[] = [
  { to: tipOf(spire(2)), thick: 7, rise: 1150, lean: null, branch: null },
  { to: tipOf(spire(3)), thick: 9, rise: 1150, lean: null, branch: null },
  { to: tipOf(spire(5)), thick: 9, rise: 1150, lean: null, branch: null },
  { to: strikeTip, thick: 2.6, rise: 420, lean: [120, 0, 60], branch: tipOf(spire(4)) },
  { to: tipOf(spire(3)), thick: 8, rise: 1150, lean: null, branch: null },
  { to: tipOf(spire(4)), thick: 9, rise: 1150, lean: null, branch: null },
];

/** Inside the canal: d of the lens of key spine-4, and the far mouth. */
export const CANAL_KEY = EXIT - EXIT_FLARE - 5;
export const canalFar = tube(EXIT - 6, 0, 4);
/** Seconds of the place from which the camera is on its way into the canal (shot spine-05), and of its key. */
export const INSIDE_FROM = secondsInPlace(UNIT, shotById('spine-05').first);
export const CANAL_KEY_AT = INSIDE_FROM + (keyPart(shotById('spine-05')) * shotLength(shotById('spine-05'))) / cut.fps;
