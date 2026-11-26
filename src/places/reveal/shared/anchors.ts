// The fixed points of the rise: the scale of the world, where the six places sit on the body, the path of the camera, the sun, and when things happen.
// The world is measured in kilometres. x runs right across the master picture, z runs down it, y is height over the sea.
import pullback from '../../../../references/approved/7-reveal/pullback.json';
import { risePath, type RiseWindow } from '../../../../tools/lib/rise-core.mjs';
import { config, FPS } from '../../../config';
import type { Pose } from '../../../core/cameras';
import { cut, eventSeconds, shotsOf } from '../../../film/cut';
import traced from '../continent.json';
import handoff from '../handoff.json';
import tuning from '../rise.json';

export const UNIT = 'reveal';
export const KM = pullback.scale_STATED.km_per_master_px;
export const MASTER_W = pullback.master.width;
export const MASTER_H = pullback.master.height;
export const FILM_ASPECT = config.formats.master.width / config.formats.master.height;
export const FOV = 30;
export const HALF_TAN = Math.tan((FOV * Math.PI) / 360);
export const SEA_LEVEL = 0;

/** World kilometres of a point of the master, px. */
export const X = (px: number): number => (px - MASTER_W / 2) * KM;
export const Z = (py: number): number => (py - MASTER_H / 2) * KM;

export interface Mark {
  x: number;
  y: number;
}

const frame4 = pullback.frames['4'].window_in_master_px;
const first = pullback.frames['1'].window_in_master_px;
/** A point given in percent of the widest key, in px of the master. */
export const mark = (percentX: number, percentY: number): Mark => ({ x: frame4.x0 + (percentX / 100) * frame4.w, y: frame4.y0 + (percentY / 100) * frame4.h });

/** Where the six places and the cyclone sit, px of the master. */
export const AT = {
  lake: { x: first.x0 + first.w / 2, y: first.y0 + first.h / 2 },
  lava: mark(37.45, 38.75),
  throat: mark(28.6, 42.2),
  strait: mark(40.2, 46.4),
  salt: mark(62.89, 47.68),
  storm: mark(53.5, 45.63),
  cyclone: { x: 5557, y: 3007 },
};

/** The edge of the planet as the master draws it: a circle, px of the master. */
export const LIMB = traced.limb;

/** The sun stands low toward the top of the picture and a little to its left, the side the maps of the ground are lit from. Toward the sun. */
export const SUN: [number, number, number] = [-0.2, 0.5, -0.78];

function keysOfRise(): { frames: number[]; windows: RiseWindow[] } {
  const frames: number[] = [];
  const windows: RiseWindow[] = [];
  const byFile = new Map(config.keys.map((k) => [k.image.split('/').pop() as string, k.id]));
  for (const n of Object.keys(pullback.frames).sort((a, b) => Number(a) - Number(b))) {
    const f = pullback.frames[n as keyof typeof pullback.frames];
    const id = byFile.get(f.file);
    if (!id) throw new Error(`No key in the config has the picture ${f.file}`);
    const at = cut.keyFrames[id];
    if (!Number.isFinite(at)) throw new Error(`The cut list has no key frame for ${id}`);
    const w = f.window_in_master_px;
    frames.push(at as number);
    windows.push({ x: w.x0, y: w.y0, w: w.w, h: w.h });
  }
  return { frames, windows };
}

export const riseShots = shotsOf(UNIT).filter((s) => s.picture !== 'black');
const riseKeys = keysOfRise();
export const RISE_FIRST = (riseShots[0] as (typeof riseShots)[number]).first;
export const RISE_LAST = (riseShots[riseShots.length - 1] as (typeof riseShots)[number]).last;
export const TITAN = riseKeys.frames[riseKeys.frames.length - 1] as number;
const START_WIDTH = (2 * handoff.revealHalfHeightKm * FILM_ASPECT) / KM;

/** The path of the rise: the window of the master the camera sees at each frame of the film. */
export const rise = risePath({
  start: RISE_FIRST,
  ...riseKeys,
  cover: tuning.cover,
  startWidth: START_WIDTH,
  startSpeed: handoff.climbPerFrame,
  endSpeed: tuning.settlePerFrame,
  endFrames: tuning.settleFrames,
  holdSpeed: tuning.holdPerFrame,
  hold: { ...tuning.holdCentre, frames: RISE_LAST - TITAN },
});

/** Half the height of the view on the sea, km, at a frame of the film. */
export const halfHeightKm = (frame: number): number => (rise.at(frame).w * KM) / FILM_ASPECT / 2;
/** The same by the seconds of the place. */
export const halfHeightAt = (seconds: number): number => halfHeightKm(RISE_FIRST + seconds * FPS);

/** The camera at a frame of the film: straight above its window, looking down, the top of the master at the top of the frame. */
export function poseAt(frame: number): Pose {
  const v = rise.at(frame);
  const x = X(v.cx);
  const z = Z(v.cy);
  const height = (v.w * KM) / FILM_ASPECT / 2 / HALF_TAN;
  if (frame > DRIFT_FROM) {
    const [driftX, driftZ] = driftAt(frame);
    const dx = x + driftX;
    const dz = z + driftZ;
    // (And the camera turns a little about its own eye as it rides the orbit: the edge of the planet swings, slow, one way.)
    const turned = rollAt(frame);
    return { position: [dx, height, dz], aim: [dx, 0, dz], fov: FOV, up: [Math.sin(turned), 0, -Math.cos(turned)] };
  }
  return { position: [x, height, z], aim: [x, 0, z], fov: FOV, up: [0, 0, -1] };
}
/** The drift of the hold and the ending: the film frame it starts after, km a second once it runs, the seconds it takes to come up, and its way on the ground. */
const DRIFT_FROM = 10028;
const DRIFT_SPEED = 32;
const DRIFT_EASE = 6;
const DRIFT_TOWARD: [number, number] = [-0.97, -0.24];
/** The turn of the camera about its own eye, radians a second once it runs: about twelve degrees by the last frame. */
const ROLL_RATE = (0.62 * Math.PI) / 180;
/** As the day ends the turn gathers this much more, radians a second, over ROLL_GATHER seconds: about twenty six degrees by the last frame. */
const ROLL_MORE = (0.8 * Math.PI) / 180;
const ROLL_GATHER = 4;
/** And from there the camera's way on the ground bends: a second move comes up from rest over DRIFT_BEND seconds, DRIFT_ACROSS km a second toward DRIFT_ACROSS_TOWARD, as the first settles. */
const DRIFT_ACROSS = 22;
const DRIFT_ACROSS_TOWARD: [number, number] = [0.25, -0.97];
const DRIFT_BEND = 5;
/** From this many seconds into the drift (film frame 10880, where the day ends) its speed settles, over DRIFT_SETTLE seconds, to DRIFT_SLOW km a second: the body stays whole and near the middle of the frame, and the camera never stops. */
const DRIFT_SLOW_FROM = (10880 - DRIFT_FROM) / FPS;
const DRIFT_SLOW = 9;
const DRIFT_SETTLE = 3.5;
/** Seconds of a move that comes up from rest over DRIFT_EASE seconds and then runs with the clock. */
function eased(t: number): number {
  const u = Math.min(t, DRIFT_EASE) / DRIFT_EASE;
  return DRIFT_EASE * (u * u * u - (u * u * u * u) / 2) + Math.max(t - DRIFT_EASE, 0);
}
/** How much of the camera's drift the edge of the planet makes with it: the camera rides its orbit, so the ground slides under it faster than the edge turns. */
export const LIMB_FOLLOW = 0.7;
/**
 * The camera never comes to a dead stop: as the day ends the rise eases into a slow drift along the orbit, one direction to the
 * last frame. How far it has gone at a frame of the film, km on the ground (x, z); nothing up to DRIFT_FROM. Its speed comes up
 * from rest over DRIFT_EASE seconds and holds.
 */
export function driftAt(frame: number): [number, number] {
  if (!(frame > DRIFT_FROM)) return [0, 0];
  const t = (frame - DRIFT_FROM) / FPS;
  let km = DRIFT_SPEED * eased(Math.min(t, DRIFT_SLOW_FROM));
  const late = t - DRIFT_SLOW_FROM;
  if (late > 0) km += DRIFT_SLOW * late + (DRIFT_SPEED - DRIFT_SLOW) * DRIFT_SETTLE * (1 - Math.exp(-late / DRIFT_SETTLE));
  const across = DRIFT_ACROSS * gathered(t, DRIFT_SLOW_FROM, DRIFT_BEND);
  return [DRIFT_TOWARD[0] * km + DRIFT_ACROSS_TOWARD[0] * across, DRIFT_TOWARD[1] * km + DRIFT_ACROSS_TOWARD[1] * across];
}
/** The turn of the camera about its own eye at a frame of the film, radians: nothing up to DRIFT_FROM. */
function rollAt(frame: number): number {
  const t = (frame - DRIFT_FROM) / FPS;
  return ROLL_RATE * eased(t) + ROLL_MORE * gathered(t, DRIFT_SLOW_FROM, ROLL_GATHER);
}

/** Seconds of the place at which the Heart's glow beats once on the body. */
export const BEAT = eventSeconds(UNIT, 'heartbeat');

/** Seconds of the place at which the day begins to end: one whole frame after film frame 10880, so that no sample of that frame's shutter sees any of it. */
export const DUSK_FROM = (10881 - RISE_FIRST) / FPS;

/** Seconds of the place from which the planet is seen to live while the frame is held: one whole frame after film frame 10027, the last frame that is kept as it was. */
export const LIVE_FROM = (10028 - RISE_FIRST) / FPS;
/** The seconds the planet has lived at a second of the place: nothing up to LIVE_FROM, then it gathers way from rest over three seconds and runs with the clock. */
export function liveAt(seconds: number): number {
  const t = seconds - LIVE_FROM;
  if (!(t > 0)) return 0;
  const u = Math.min(t, 3) / 3;
  return 3 * (u * u * u - (u * u * u * u) / 2) + Math.max(t - 3, 0);
}

/** Seconds of a move that starts from rest at from, comes up over the given seconds and then runs with the clock. */
function gathered(t: number, from: number, over: number): number {
  const s = t - from;
  if (!(s > 0)) return 0;
  const u = Math.min(s, over) / over;
  return over * (u * u * u - (u * u * u * u) / 2) + Math.max(s - over, 0);
}
/**
 * The clock of the weather, seconds: the cloud, the cyclone and the vapour are carried by it. The light of the ending runs hours
 * in seconds, and the weather runs on the same clock: nothing up to LIVE_FROM, the pace of liveAt at first, then it gathers way
 * through the hold (2.5 times by film frame 10880), runs fastest while the terminator crosses (3.5 times, film frames 11050 to
 * 11320) and eases a little for the night. Its pace never falls and it never turns back.
 */
export function weatherAt(seconds: number): number {
  const t = seconds - LIVE_FROM;
  if (!(t > 0)) return 0;
  return liveAt(seconds) + 1.5 * gathered(t, 2, 12) + gathered(t, 12, 5) - 0.7 * gathered(t, 21.5, 5);
}

/** The rings on the lake that the Eye hands over fade out between these widths of the view, in units of the width at the first frame. */
export const RING_FADE: [number, number] = [1.0, 1.9];
export { handoff, traced, tuning };
