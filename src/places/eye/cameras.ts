import { through, type CameraPath, type Pose, type Vec3 } from '../../core/cameras';
import { FPS } from '../../config';
import { keyPart, shotById, shotLength } from '../../film/cut';
import { DEG, FAN, SHORE } from './land';

function look(position: Vec3, bearing: number, pitch: number, fov: number): Pose {
  const c = Math.cos(pitch * DEG);
  const reach = 100;
  return {
    position,
    aim: [position[0] + Math.sin(bearing * DEG) * c * reach, position[1] + Math.sin(pitch * DEG) * reach, position[2] - Math.cos(bearing * DEG) * c * reach],
    fov,
  };
}

const smoother = (t: number): number => {
  const u = Math.min(1, Math.max(0, t));
  return u * u * u * (u * (u * 6 - 15) + 10);
};

export const END_HEIGHT = 250;
export const END_FOV = 40;

export const SHORE_TURN = -5;
const CENTRE_PITCH = -1.94;

export function onShore(x: number, out: number, y: number): Vec3 {
  const r = SHORE - FAN + out;
  const b = (180 + SHORE_TURN) * DEG - x / r;
  return [Math.sin(b) * r, y, -Math.cos(b) * r];
}

export const KEYS = {
  wide: look([-455, 128, 1168], 22.5, -7.4, 40),
  mats: look([-150, 1.1, 760], 8, -11.2, 45),
  edge: look([-372.3, 1.7, 312.4], 12, -13.6, 40),
  shore: look(onShore(25, 4.5, 1.9), 338 + SHORE_TURN, -5.5, 25),
  centre: look([0, 25.75, SHORE - FAN + 80], 0, CENTRE_PITCH, 8),
};

const last = shotById('eye-05');
const lastKey = keyPart(last);
const lastSeconds = shotLength(last) / FPS;
const CREEP = 4;
const ARRIVE = 0.9;
const RISE = 11;

function leave(part: number): Pose {
  const start = KEYS.centre.position;
  const afterSeconds = lastSeconds * (1 - lastKey);
  let z = start[2];
  let y = start[1];
  let v = 0;
  if (part <= lastKey) {
    z += CREEP * (lastKey - part) * lastSeconds;
  } else {
    v = (part - lastKey) / (1 - lastKey);
    const w = Math.min(1, v / ARRIVE);
    const creep = CREEP * afterSeconds * v * (1 - w) ** 2;
    z = Math.max(0, start[2] * (1 - smoother(w)) - creep);
    y = start[1] + (END_HEIGHT - start[1] - RISE) * smoother(w) ** 1.5 + RISE * v ** 3;
  }
  const sink = (Math.tan(-CENTRE_PITCH * DEG) * start[2] - start[1]) * (1 - smoother(v / 0.4));
  const pitch = z <= 0 ? -Math.PI / 2 : -Math.atan2(y + sink, z);
  const fov = Math.exp(Math.log(KEYS.centre.fov) + (Math.log(END_FOV) - Math.log(KEYS.centre.fov)) * smoother(v / 0.7));
  const reach = 100;
  return {
    position: [0, y, z],
    aim: [0, y + Math.sin(pitch) * reach, z - Math.cos(pitch) * reach],
    up: [0, Math.cos(pitch), Math.sin(pitch)],
    fov,
  };
}

const key = (id: string): number => keyPart(shotById(id));

export const shots: Record<string, CameraPath> = {
  'eye-01': through(KEYS.wide, key('eye-01'), { forward: -90, up: 34, right: -10 }, { forward: 120, up: -30, right: 8 }),
  'eye-02': through(KEYS.mats, key('eye-02'), { right: -5, forward: -8, up: -0.3, turn: 4 }, { right: 5, forward: 3.5, up: 1.2, turn: -13 }),
  'eye-03': through(KEYS.edge, key('eye-03'), { right: 4, forward: -5, up: 0.7, turn: -6 }, { right: -2.6, forward: 1, up: 0.4, turn: 7 }),
  'eye-04': through(KEYS.shore, key('eye-04'), { forward: -3, right: -1.4, up: -0.2 }, { forward: 2.2, right: 1.1, up: 0.3 }),
  'eye-05': (part) => leave(part),
};
