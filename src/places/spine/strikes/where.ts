// Where the storm's things stand. TEMPORARY: every number here is the blockout root's, copied until the lead's shared/anchors.ts gives it.
import type { Vec3 } from '../../../core/cameras';
import { eventsOf, secondsInPlace, shotById } from '../../../film/cut';
import { CANAL_L, EXIT, EXIT_FLARE, FIRST, FLOOR, MOUTH_S, canalL, finEdge, first, frameAt, ground, on, spires, tipOf, world, type Spire } from '../ridge';

export const UNIT = 'spine';
const RAD = Math.PI / 180;

/** The gale: it blows from the storm (-z) across the ridge. */
export const WIND: Vec3 = [0.2, 0, 0.98];
export const WIND_SPEED = 26;

export const spire = (n: number): Spire => spires[FIRST + n - 1] as Spire;
export { FIRST, spires, finEdge, tipOf, ground, on, world, frameAt, first, type Spire };

const heading = (a: Vec3, b: Vec3): number => Math.atan2(b[2] - a[2], b[0] - a[0]) / RAD;
const stepTo = (p: Vec3, h: number, dist: number, up = 0): Vec3 => [p[0] + Math.cos(h * RAD) * dist, p[1] + up, p[2] + Math.sin(h * RAD) * dist];

/** A point of the canal: metres in from the mouth, metres across, metres over its floor. */
export const tube = (d: number, l: number, h: number): Vec3 => world(MOUTH_S + d, canalL(d) + l, FLOOR + h);
export const MOUTH = tube(0, 0, 8);
export const CANAL_KEY = EXIT - EXIT_FLARE - 5;
/** Heading of the canal at the herd, radians about y as three.js turns. */
export const CANAL_ALONG = Math.atan2(-frameAt(MOUTH_S + CANAL_KEY).tz, frameAt(MOUTH_S + CANAL_KEY).tx);

/** The trail the herd keeps on the saddle: metres across the crest at a place along it. */
export const trail = (s: number): number => 2.2 * Math.sin(s / 31) * (1 - Math.min(1, Math.max(0, (s - MOUTH_S + 160) / 150))) + CANAL_L * Math.min(1, Math.max(0, (s - MOUTH_S + 160) / 150)) ** 2;
export const MOUTH_AT = MOUTH_S;

/** The scorched one. */
export const CARCASS = on(first.s - 655, 1.5, 0);
const carcassView = heading(CARCASS, MOUTH) + 15;
export const CARCASS_VIEW = carcassView;
export const CARCASS_AXIS = carcassView + 80;
export const CARCASS_BODY = stepTo(CARCASS, CARCASS_AXIS, 0.5);
export const SCORCH_AT = stepTo(CARCASS, carcassView + 185, 1.0);
export { stepTo };

export interface StrikeSite {
  id: string;
  seconds: number;
  to: Vec3;
  /** How far up the channel enters the cloud, metres over the tip. */
  rise: number;
  /** Where the top of the channel stands from the tip, or null for the storm's side. */
  lean: Vec3 | null;
  /** A second tip the bolt forks to, or null. */
  branch: Vec3 | null;
  /** Which spire is struck, counted from the first. */
  spire: number;
}

const TARGETS: { n: number; rise: number; lean: Vec3 | null; branch: number | null }[] = [
  { n: 2, rise: 1150, lean: null, branch: null },
  { n: 3, rise: 1150, lean: null, branch: null },
  { n: 5, rise: 1150, lean: null, branch: null },
  { n: 3, rise: 420, lean: [120, 0, 60], branch: 4 },
  { n: 3, rise: 1150, lean: null, branch: null },
  { n: 4, rise: 1150, lean: null, branch: null },
];

export const STRIKES: StrikeSite[] = eventsOf(UNIT).map((event, i) => {
  const t = TARGETS[i % TARGETS.length] as (typeof TARGETS)[number];
  return { id: event.id, seconds: event.seconds, to: tipOf(spire(t.n)), rise: t.rise, lean: t.lean, branch: t.branch === null ? null : tipOf(spire(t.branch)), spire: t.n };
});

/** The span of a shot in seconds of the place, a little wide so that every sample of its frames is inside. */
export const during = (shot: string): { from: number; to: number } => {
  const s = shotById(shot);
  return { from: secondsInPlace(UNIT, s.first) - 0.3 / 60, to: secondsInPlace(UNIT, s.last) + 0.7 / 60 };
};
