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
  return { position: [x, height, z], aim: [x, 0, z], fov: FOV, up: [0, 0, -1] };
}

/** Seconds of the place at which the Heart's glow beats once on the body. */
export const BEAT = eventSeconds(UNIT, 'heartbeat');

/** The rings on the lake that the Eye hands over fade out between these widths of the view, in units of the width at the first frame. */
export const RING_FADE: [number, number] = [1.0, 1.13];
export { handoff, traced, tuning };
