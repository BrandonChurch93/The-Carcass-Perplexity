import { moved, through, type CameraPath, type Pose, type Vec3 } from '../../core/cameras';
import { FPS } from '../../config';
import { keyPart, placeOf, shotById, shotLength } from '../../film/cut';
import { flight, type FlightPlan } from './flight';
import handoff from './handoff.json';
import { landHeight, lipAt, onAxis } from './land/height';
import { DEG, FAN, SHORE, at } from './layout';

function look(position: Vec3, bearing: number, pitch: number, fov: number): Pose {
  const c = Math.cos(pitch * DEG);
  const reach = 100;
  return {
    position,
    aim: [position[0] + Math.sin(bearing * DEG) * c * reach, position[1] + Math.sin(pitch * DEG) * reach, position[2] - Math.cos(bearing * DEG) * c * reach],
    fov,
  };
}

function standOn(along: number, across: number, above: number): Vec3 {
  const [x, z] = onAxis(along, across);
  return [x, landHeight(x, z) + above, z];
}

export const SHORE_TURN = -5;
/** The shore shot and its animals are swung round together, so that the lit north wall stands behind them and the brow on their right. */
export const SHORE_SWING = 32;
export const SHORE_HEADING = 338 + SHORE_TURN + SHORE_SWING;
const CENTRE_PITCH = -2.51;

export function onShore(x: number, out: number, y: number): Vec3 {
  const r = SHORE - FAN + out;
  const b = (180 + SHORE_TURN) * DEG - x / r;
  return [Math.sin(b) * r, y, -Math.cos(b) * r];
}

function above(x: number, z: number, y: number): Vec3 {
  return [x, Math.max(0, landHeight(x, z)) + y, z];
}

const front = SHORE - FAN;
const matsAt = at(196, front - 42);
const edgeAt = at(197, lipAt(197 * DEG) + 7.5);

export const KEYS = {
  wide: look(standOn(150, 0, 6.2), 18, -4.6, 40),
  mats: look([matsAt[0], 1.1, matsAt[1]], 8, -11.2, 45),
  edge: look([edgeAt[0], 2.6, edgeAt[1]], 2, -13.6, 40),
  shore: { ...look(onShore(-75, 8.5, 1.8), SHORE_HEADING, -5.5, 25), aperture: 0.012, focus: 26 },
  centre: look(above(0, front + 98, 2.3), 0, CENTRE_PITCH, 8),
};

const last = shotById('eye-05');
const centreAt = KEYS.centre.position;

export const FLIGHT: FlightPlan = {
  keyFrame: last.first + keyPart(last) * shotLength(last),
  riseFrame: placeOf('eye').last + 1,
  fps: FPS,
  keyHeight: centreAt[1],
  keyDistance: centreAt[2],
  keyPitch: CENTRE_PITCH,
  keyFov: KEYS.centre.fov,
  endFov: 50,
  creep: 4,
  settle: 24,
  easeIn: 0.3,
  easeOut: 0.35,
  climbPerFrame: handoff.climbPerFrame,
  halfHeight: handoff.eyeHalfHeightMetres,
};

function leave(frame: number): Pose {
  const f = flight(frame, FLIGHT);
  const reach = 100;
  return {
    // A long lens held on the centre of the lake: the two that stand under it are a little soft, and their coats still read.
    aperture: 0.005,
    focus: Math.max(30, Math.hypot(f.y, f.z)),
    position: [0, f.y, f.z],
    aim: [0, f.y - f.sin * reach, f.z - f.cos * reach],
    up: [0, f.cos, -f.sin],
    fov: f.fov,
  };
}

const key = (id: string): number => keyPart(shotById(id));

function arc(part: number, at: number, from: number, to: number): number {
  const bend = from / at + to / (1 - at);
  const rate = to / (1 - at) - bend * (1 - at);
  return rate * (part - at) + bend * (part - at) ** 2;
}

function track(part: number): Pose {
  const at = key('eye-04');
  return moved(KEYS.shore, { right: arc(part, at, -3.6, 0.3), forward: arc(part, at, -1.2, -2), turn: arc(part, at, 8, -1) });
}

export const shots: Record<string, CameraPath> = {
  'eye-01': through(KEYS.wide, key('eye-01'), { forward: -52, up: 5.5, right: 0 }, { forward: 52, up: -9, right: 0 }),
  'eye-02': through(KEYS.mats, key('eye-02'), { right: -5, forward: -8, up: -0.3, turn: 4 }, { right: 5, forward: 3.5, up: 1.2, turn: -13 }),
  'eye-03': through(KEYS.edge, key('eye-03'), { right: 4, forward: -5, up: 0.7, turn: -6 }, { right: -2.6, forward: 1, up: 0.4, turn: 7 }),
  'eye-04': (part) => track(part),
  'eye-05': (_part, frame) => leave(frame),
};
