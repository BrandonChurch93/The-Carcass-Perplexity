// The fixed points of the Ribs: where things stand, when things happen, sea level, the sun and the wind. Owned by the root.
// World metres: the origin is on the strait floor between the first pair of ribs, level with the drowned rib. North is -z (down the strait, where
// the bore comes from), east is +x, sea level is y = 0. Both owners read this file; only the lead changes it, and says so when an anchor moves.
import { cut, eventSeconds, secondsInPlace, shotById } from '../../../film/cut';
import { STATIONS } from '../cameras';
import { cragPerch, cragRadius } from './crag';
import { BUTTRESS, FLOOR, POOL, RIBS, SEA, TIDE, buttressRadius, ribByName, weedPoint } from '../layout';

export const UNIT = 'ribs';

/** Seconds, in the time of the place, of a key frame. */
export const keySeconds = (key: string): number => secondsInPlace(UNIT, cut.keyFrames[key] as number);

/** The reference time of the place: the key frame of the establishing picture. */
export const T0 = keySeconds('ribs-0');

/** The bore comes through the cage, seconds in the time of the place. */
export const BORE = eventSeconds(UNIT, 'bore') ?? 1e9;

/** The span of a shot in seconds of the place, with the open shutter of its first and last frame: test `stagedSeconds()` against it. */
export function shotSpan(id: string): { from: number; to: number } {
  const shot = shotById(id);
  return { from: secondsInPlace(UNIT, shot.first) - 0.3 / 60, to: secondsInPlace(UNIT, shot.last) + 0.7 / 60 };
}

/** Sea level, the level the pools and runnels stand at on the floor, and the tide line on the blades (the top of the weed), metres. */
export const LEVELS = { sea: SEA, pool: POOL, tide: TIDE };

/** The sun. It does not move in the 42 seconds of the place. `toward` points from the ground to the sun. */
export const SUN = {
  // High, from the left of the cameras of the strait and a little behind them: a blade's left face and its top are lit hard, its right
  // face and what hangs over are in shade, as the approved pictures have them. The bright break stays ahead and right (the rig's skyBreak).
  toward: [0.3, 0.62, 0.72] as [number, number, number],
  /** Radiance times solid angle of the sun through thin cloud, scene linear: what a face turned to it takes over and above the sky. */
  colour: [7.0, 6.0, 4.7] as [number, number, number],
};

/** The wind: where it blows to (x, z), unit length, and metres a second low over the water. Cloud shadow, spray and weed lean with it. */
export const WIND = { to: [0.5, 0.866] as [number, number], speed: 14, cloud: 26 };

/** The bore: the z of its front at the event, and its speed toward +z, metres a second. Its front at `seconds` stands at gateZ + (seconds - BORE) * speed. */
export const BORE_FRONT = { gateZ: STATIONS.gateZ, speed: 45, height: 23 };

/** Where the drowned one hangs in the weed of the first left rib: a point on the weed's face 9.5 m over the sea. */
export const DROWNED = {
  rib: 'L1',
  phi: STATIONS.drownedPhi,
  height: STATIONS.drownedHeight,
  at: (out = 0): [number, number, number] => weedPoint(ribByName('L1'), STATIONS.drownedPhi, STATIONS.drownedHeight, out).toArray() as [number, number, number],
  /** The way down the weed's face from the point, over the 4 m below it: a unit vector. */
  down: (): [number, number, number] => {
    const rib = ribByName('L1');
    const high = weedPoint(rib, STATIONS.drownedPhi, STATIONS.drownedHeight);
    const low = weedPoint(rib, STATIONS.drownedPhi, STATIONS.drownedHeight - 4);
    return low.sub(high).normalize().toArray() as [number, number, number];
  },
  /** Straight out of the weed's face at the point, square to `down`: a unit vector. */
  normal: (): [number, number, number] => {
    const rib = ribByName('L1');
    const high = weedPoint(rib, STATIONS.drownedPhi, STATIONS.drownedHeight);
    const low = weedPoint(rib, STATIONS.drownedPhi, STATIONS.drownedHeight - 4);
    const along = low.sub(high).normalize();
    const out = weedPoint(rib, STATIONS.drownedPhi, STATIONS.drownedHeight - 2, 1).sub(weedPoint(rib, STATIONS.drownedPhi, STATIONS.drownedHeight - 2));
    return out.addScaledVector(along, -out.dot(along)).normalize().toArray() as [number, number, number];
  },
};

/**
 * The colony's rock: a crag. `radiusAt` is the mean cone it is cut from; `cragAt(angle, y)` is the rock itself, and
 * `perch(angle, height, across)` gives [radius, y] of the ledge nearest a height at an angle, where what nests there stands.
 */
export const COLONY = { ...BUTTRESS, radiusAt: buttressRadius, cragAt: cragRadius, perch: cragPerch, side: STATIONS.colonySide };

export { FLOOR, RIBS, STATIONS };
