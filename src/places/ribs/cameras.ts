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

// The film's first shot, restaged (the rung 2 restaging of the opening): not the old move seen from farther out on a long lens, but a
// move of its own. It starts 850 m out and 400 m EAST of the old axis, low over the swell, on a 36 degree lens, at 66 metres a second
// mostly sideways, and sweeps west onto the old move in one arc, so that the near blade (L1) slides against the far ones the whole way in.
// From the east the tips of L1 and R1 stand 8 degrees apart with the arch of L2 between them: they cross only once both have left the top of the frame.
// From OPEN.seconds on (film frame 960) the pose is `arrival`'s own, to the bit, and the two join level in place, speed and acceleration.
export const OPEN = {
  seconds: 16,
  /** Where the lens is as the film opens (x, z), the way it is going (degrees, 0 is north, negative is west) and its speed. */
  from: [200, 850] as [number, number],
  heading: -50,
  speed: 66,
  /** Metres over the old move's height as the film opens, and the heave of a lens that rides the swell: metres, seconds a turn. */
  lift: 0.8,
  heave: [[1.0, 5.3, 0.9], [0.3, 2.3, 2.1]] as [number, number, number][],
  /** The point on the strait floor the lens is held on through the arc: under the gap between the tips of L1 and R1. */
  target: [-149, -193] as [number, number],
  /** Degrees over the level as the film opens and how far it tilts up as the blade grows; the lens as the film opens and as it widens. */
  pitch: 10.5,
  tilt: 3,
  fov: 36,
  widens: 10,
  /** The seconds from which the look eases into the old move's. */
  eases: 6,
  /** Degrees the lens rolls with the swell. */
  roll: 0.9,
};

const smoother = (a: number, b: number, x: number): number => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * u * (u * (6 * u - 15) + 10);
};
const smoothed = (a: number, b: number, x: number): number => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

/** 1 at the first frame of the film, 0 from OPEN.seconds on, level at both ends. */
export function openingLens(seconds: number): number {
  return 1 - smoother(0, OPEN.seconds, seconds);
}

function arrivalLook(seconds: number): { position: Vec3; yaw: number; pitch: number; fov: number } {
  const left = TO_KEY - travelled(seconds);
  const out = Math.max(0, left) / ARRIVAL.far;
  const past = Math.max(0, -left) / PAST_KEY;
  const along = heading(ARRIVAL.yaw, 0);
  const across: Vec3 = [-along[2], 0, along[0]];
  const side = ARRIVAL.offset * out * out + ARRIVAL.drift * past * past;
  const position = add(add(establish.position, scale(along, -left)), add(scale(across, side), [0, ARRIVAL.rise * Math.pow(out, 1.5), 0]));
  const lens = Math.tan((establish.fov * RAD) / 2) * Math.pow(ARRIVAL.archAhead / (ARRIVAL.archAhead + left), ARRIVAL.hold);
  return { position, yaw: ARRIVAL.yaw + ARRIVAL.turn * out * out, pitch: ARRIVAL.pitch + ARRIVAL.tilt * Math.pow(out, 1.5), fov: (2 * Math.atan(lens)) / RAD };
}

function arrival(seconds: number): Pose {
  const a = arrivalLook(seconds);
  return looking(a.position, a.yaw, a.pitch, a.fov);
}

// The join: the old move's place, speed and acceleration at OPEN.seconds (central differences of a smooth function of time).
const JOIN = ((): { p: Vec3; v: Vec3; a: Vec3 } => {
  const h = 1e-3;
  const p0 = arrivalLook(OPEN.seconds - h).position;
  const p1 = arrivalLook(OPEN.seconds).position;
  const p2 = arrivalLook(OPEN.seconds + h).position;
  return {
    p: p1,
    v: [(p2[0] - p0[0]) / (2 * h), 0, (p2[2] - p0[2]) / (2 * h)],
    a: [(p2[0] - 2 * p1[0] + p0[0]) / (h * h), 0, (p2[2] - 2 * p1[2] + p0[2]) / (h * h)],
  };
})();

/** The lens of the film's first shot at `seconds` of the place: where it is and how it looks. The old move's own from OPEN.seconds on. */
export function openingCamera(seconds: number): Pose {
  if (seconds >= OPEN.seconds) return arrival(seconds);
  const old = arrivalLook(seconds);
  const J = OPEN.seconds;
  const s = Math.max(0, seconds) / J;
  const s2 = s * s;
  const s3 = s2 * s;
  const s4 = s3 * s;
  const s5 = s4 * s;
  // A quintic between (place, velocity, no acceleration) as the film opens and (place, velocity, acceleration) of the old move at the join.
  const h0 = 1 - 10 * s3 + 15 * s4 - 6 * s5;
  const h1 = s - 6 * s3 + 8 * s4 - 3 * s5;
  const h3 = 0.5 * s3 - s4 + 0.5 * s5;
  const h4 = -4 * s3 + 7 * s4 - 3 * s5;
  const h5 = 10 * s3 - 15 * s4 + 6 * s5;
  const vx = OPEN.speed * Math.sin(OPEN.heading * RAD);
  const vz = -OPEN.speed * Math.cos(OPEN.heading * RAD);
  const x = h0 * OPEN.from[0] + h1 * J * vx + h3 * J * J * JOIN.a[0] + h4 * J * JOIN.v[0] + h5 * JOIN.p[0];
  const z = h0 * OPEN.from[1] + h1 * J * vz + h3 * J * J * JOIN.a[2] + h4 * J * JOIN.v[2] + h5 * JOIN.p[2];
  const own = openingLens(seconds);
  let heave = 0;
  let roll = 0;
  for (const [metres, period, phase] of OPEN.heave) {
    heave += metres * Math.sin((2 * Math.PI * seconds) / period + phase);
    roll += (metres / (OPEN.heave[0] as [number, number, number])[0]) * Math.sin((2 * Math.PI * seconds) / (period * 1.37) + phase + 1.3);
  }
  const position: Vec3 = [x, old.position[1] + own * (OPEN.lift + heave), z];
  const ease = smoother(OPEN.eases, J, seconds);
  const held = Math.atan2(OPEN.target[0] - x, z - OPEN.target[1]) / RAD;
  const yaw = held + (old.yaw - held) * ease;
  const pitch = OPEN.pitch + OPEN.tilt * smoothed(0, OPEN.eases, seconds);
  const fov = OPEN.fov + OPEN.widens * smoothed(0, 9, seconds);
  return { ...looking(position, yaw, pitch + (old.pitch - pitch) * ease, fov + (old.fov - fov) * ease), roll: OPEN.roll * roll * own };
}

const approach: CameraPath = (part) => openingCamera((part * shotLength(opening)) / cut.fps);
/** Where the lens of the approach is at `seconds` of the place, to the metre and smoothly. */
export const approachEye = (seconds: number): Vec3 => openingCamera(seconds).position;
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
