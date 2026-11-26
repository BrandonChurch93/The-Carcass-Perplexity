import { add, scale, through, type CameraPath, type Pose, type Vec3 } from '../../core/cameras';
import { cut, keyPart, shotById, shotLength } from '../../film/cut';
import { BUTTRESS, buttressRadius, groundAt, ribByName, weedPoint } from './layout';

const RAD = Math.PI / 180;

const onGround = (x: number, z: number, above: number): Vec3 => [x, groundAt(x, z) + above, z];

function heading(yaw: number, pitch: number): Vec3 {
  return [Math.sin(yaw * RAD) * Math.cos(pitch * RAD), Math.sin(pitch * RAD), -Math.cos(yaw * RAD) * Math.cos(pitch * RAD)];
}

function looking(position: Vec3, yaw: number, pitch: number, fov: number, reach = 200): Pose {
  return { position, aim: add(position, scale(heading(yaw, pitch), reach)), fov };
}

const DROWNED_PHI = 0.35;
const DROWNED_HEIGHT = 9.5;
const GATE_Z = -1500;
const GATE_X = 105;
const ARRIVAL_YAW = 8;
const ARRIVAL_PITCH = 0.2;

const establish = looking(onGround(-180, 110, 1.9), ARRIVAL_YAW, ARRIVAL_PITCH, 48);
const COLONY_SIDE: [number, number] = [-0.8, 0.6];
// Between two ledges (they stand every 2.1 m): a ledge seen along its own top is a row of bars.
const COLONY_HEIGHT = 45.2;
const colonyReach = buttressRadius(COLONY_HEIGHT) + 22;
// The four close keys are seen through a lens of a real width: the focus in metres, the radius of the lens in metres.
const colony: Pose = { ...looking([BUTTRESS.x + COLONY_SIDE[0] * colonyReach, COLONY_HEIGHT, BUTTRESS.z + COLONY_SIDE[1] * colonyReach], 35, 15, 36), focus: 27, aperture: 0.021 };
const FEEDING_YAW = 10;
const feeding: Pose = { ...looking(onGround(-60, -420, 1.5), FEEDING_YAW, -3, 20), focus: 17, aperture: 0.014 };
const gate: Pose = { ...looking(onGround(GATE_X, GATE_Z + 170, 0.9), 0, 5, 40, 170), focus: 60, aperture: 0.03 };

function drownedPose(): Pose {
  const rib = ribByName('L1');
  const hang = weedPoint(rib, DROWNED_PHI, DROWNED_HEIGHT);
  const next = weedPoint(rib, DROWNED_PHI + 0.02, DROWNED_HEIGHT);
  const l = Math.hypot(next.x - hang.x, next.z - hang.z);
  const north: Vec3 = [-(next.x - hang.x) / l, 0, -(next.z - hang.z) / l];
  const out: Vec3 = [-north[2], 0, north[0]];
  const target: Vec3 = [hang.x, hang.y - 3.5, hang.z];
  const position = add(add(target, scale(north, -15)), scale(out, 10));
  const aim = add(add(position, scale(north, 52)), add(scale(out, -19), [0, 1.8, 0]));
  return { position, aim, fov: 35, focus: 18, aperture: 0.049 };
}

const drowned = drownedPose();

const opening = shotById('ribs-01');
const strait = shotById('ribs-02');
const ARRIVAL = {
  seconds: (shotLength(opening) + shotLength(strait)) / cut.fps,
  keySeconds: (shotLength(opening) + keyPart(strait) * shotLength(strait)) / cut.fps,
  fast: 110,
  slow: 10,
  far: 1400,
  archAhead: 496,
  hold: 0.7,
  turn: 1.2,
  offset: 50,
  drift: 14,
  rise: 5.5,
  tilt: 2.3,
  yaw: ARRIVAL_YAW,
  pitch: ARRIVAL_PITCH,
};

function travelled(seconds: number): number {
  const u = seconds / ARRIVAL.seconds;
  return ARRIVAL.slow * seconds + (ARRIVAL.fast - ARRIVAL.slow) * ARRIVAL.seconds * (u - u * u * u + 0.5 * u * u * u * u);
}

const TO_KEY = travelled(ARRIVAL.keySeconds);
const PAST_KEY = travelled(ARRIVAL.seconds) - TO_KEY;

// The approach opens on a wider and higher lens than the move it joins, so that the first frame holds two blades whole against the sky:
// how much wider, how many degrees higher, and the seconds over which both ease back into the move. From OPEN.seconds on the move is its own,
// to the bit: the staging is exactly nothing there (the strait's shot runs on in the same move).
const OPEN = { seconds: 11, wide: 0.32, pitch: 3.5, yaw: 7.5 };
/** 1 at the first frame of the film, 0 from OPEN.seconds on, level at both ends. */
export function openingLens(seconds: number): number {
  const q = Math.min(1, Math.max(0, 1 - seconds / OPEN.seconds));
  return q * q * (3 - 2 * q);
}

function arrival(seconds: number, staged = 0): Pose {
  const left = TO_KEY - travelled(seconds);
  const out = Math.max(0, left) / ARRIVAL.far;
  const past = Math.max(0, -left) / PAST_KEY;
  const along = heading(ARRIVAL.yaw, 0);
  const across: Vec3 = [-along[2], 0, along[0]];
  const side = ARRIVAL.offset * out * out + ARRIVAL.drift * past * past;
  const position = add(add(establish.position, scale(along, -left)), add(scale(across, side), [0, ARRIVAL.rise * Math.pow(out, 1.5), 0]));
  const lens = Math.tan((establish.fov * RAD) / 2) * Math.pow(ARRIVAL.archAhead / (ARRIVAL.archAhead + left), ARRIVAL.hold);
  if (staged > 0) return looking(position, ARRIVAL.yaw + ARRIVAL.turn * out * out + OPEN.yaw * staged, ARRIVAL.pitch + ARRIVAL.tilt * Math.pow(out, 1.5) + OPEN.pitch * staged, (2 * Math.atan(lens * (1 + OPEN.wide * staged))) / RAD);
  return looking(position, ARRIVAL.yaw + ARRIVAL.turn * out * out, ARRIVAL.pitch + ARRIVAL.tilt * Math.pow(out, 1.5), (2 * Math.atan(lens)) / RAD);
}

const approach: CameraPath = (part) => {
  const seconds = (part * shotLength(opening)) / cut.fps;
  return arrival(seconds, openingLens(seconds));
};
/** The approach as it was before it was restaged: what was scattered along it once (the fliers' clearances, the skein) stays where it was, so that no later frame moves. */
export const approachAsScattered: CameraPath = (part) => arrival((part * shotLength(opening)) / cut.fps);
const intoStrait: CameraPath = (part) => arrival((shotLength(opening) + part * shotLength(strait)) / cut.fps);

const key = (id: string): number => keyPart(shotById(id));

export const shots: Record<string, CameraPath> = {
  'ribs-01': approach,
  'ribs-02': intoStrait,
  'ribs-03': through(colony, key('ribs-03'), { right: 12, forward: -14, up: -2 }, { right: -16, forward: 10, up: 4 }),
  'ribs-04': through(feeding, key('ribs-04'), { forward: -24, up: 0.6 }, { forward: 5, up: -0.2 }),
  'ribs-05': through(drowned, key('ribs-05'), { forward: -30, up: -1.6, right: 9 }, { forward: 4, up: 1.2, right: 1 }),
  'ribs-06': through(gate, key('ribs-06'), { forward: 7 }, { forward: -5, up: 1.1, right: 2 }),
};

// The card loop: a heavy camera tracked out to the right of the establishing pose and back to it, with the lens held on the far cage.
// Metres to the right of that pose and up, at the far end of the move. The part is folded into 0 to 1 first, so that a whole number of turns gives the numbers of the start exactly.
const LOOP_TRACK = { right: 4, up: 0.45 };
const LOOP_REACH = 500;
export const loopPath: CameraPath = (part) => {
  // Out along one line and back along it, slow away from each end.
  const out = (1 - Math.cos(2 * Math.PI * (part - Math.floor(part)))) / 2;
  const along = heading(ARRIVAL_YAW, 0);
  const across: Vec3 = [-along[2], 0, along[0]];
  const position = add(add(establish.position, scale(across, LOOP_TRACK.right * out)), [0, LOOP_TRACK.up * out, 0]);
  const far = add(establish.position, scale(heading(ARRIVAL_YAW, ARRIVAL_PITCH), LOOP_REACH));
  const d: Vec3 = [far[0] - position[0], far[1] - position[1], far[2] - position[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  return { position, aim: add(position, scale(d, 200 / l)), fov: establish.fov };
};

const feedingAt = feeding.position;
// Dark rock close under the lens of the two low keys: metres ahead of the camera at the key, metres to its right, and the size.
const ahead = (from: Vec3, yaw: number, list: [number, number, number][]): [number, number, number][] =>
  list.map(([forward, right, size]) => [from[0] + Math.sin(yaw * RAD) * forward + Math.cos(yaw * RAD) * right, from[2] - Math.cos(yaw * RAD) * forward + Math.sin(yaw * RAD) * right, size]);

const feederYaw = Math.atan2(-Math.cos(10 * RAD), -Math.sin(10 * RAD));

export const STATIONS = {
  establish: [establish.position[0], establish.position[2]] as [number, number],
  arch: [150, -345] as [number, number],
  gateZ: gate.position[2] - 120,
  posts: [[gate.position[0] - 64, gate.position[2] - 74], [gate.position[0] + 78, gate.position[2] - 104]] as [number, number][],
  colonySide: COLONY_SIDE,
  drownedPhi: DROWNED_PHI,
  drownedHeight: DROWNED_HEIGHT,
  feeders: [
    ...([[40, 31], [46, -9], [58, -3], [64, -14], [80, 2], [96, 9], [120, -6], [150, 4]] as [number, number][]).map(([d, bearing], i): [number, number, number, number] => {
      const h = heading(bearing + 5, 0);
      return [establish.position[0] + h[0] * d, establish.position[2] + h[2] * d, 1.3 + i * 2.1, 1.1];
    }),
    [feedingAt[0] + 5.1, feedingAt[2] - 15.9, feederYaw, 1.15],
    [feedingAt[0] + 3.4, feedingAt[2] - 31.8, feederYaw + 0.3, 1.1],
    [feedingAt[0] - 3, feedingAt[2] - 52, feederYaw - 0.4, 1.1],
  ] as [number, number, number, number][],
  flee: [gate.position[0] + 4, gate.position[2] - 34] as [number, number],
  foreground: [
    ...ahead(feedingAt, FEEDING_YAW, [[9, -2.1, 1.8], [13.5, -3.9, 1.3], [8.2, -0.2, 0.55], [17, -5.2, 1.6]]),
    ...ahead(gate.position, 0, [[6.0, -4.4, 3.2], [13.2, -5.4, 1.4], [18, -9.5, 2.2], [12.4, 7.2, 1.3], [19, 5.5, 0.8]]),
  ] as [number, number, number][],
};
