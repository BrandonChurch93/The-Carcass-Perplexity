// The true ground of the Eye: the floor of the shallows, the beach, the scree aprons, the cliffs of the socket with their beds and gullies,
// the plateau behind them, the spur the wide camera stands on, the ravine of the stream beside it and the bluff of the last shot.
// One function, used by the mesh, the rig's maps, the cameras and whatever stands on the ground.
import { BLUFF, DEEP, DEG, SHORE, bump, shoreAt, smooth } from '../layout';
import { fbm, ridged, vnoise } from '../shared/noise';

/** The radial the wide camera stands on, and the frame of the spur and the ravine: metres out from the shore along it, metres to the right of a camera that looks at the lake. */
export const AXIS = { bearing: 198 };
const OUT: [number, number] = [Math.sin(AXIS.bearing * DEG), -Math.cos(AXIS.bearing * DEG)];
const RIGHT: [number, number] = [OUT[1], -OUT[0]];
const ORIGIN: [number, number] = [OUT[0] * shoreAt(AXIS.bearing), OUT[1] * shoreAt(AXIS.bearing)];

export function onAxis(along: number, across: number): [number, number] {
  return [ORIGIN[0] + OUT[0] * along + RIGHT[0] * across, ORIGIN[1] + OUT[1] * along + RIGHT[1] * across];
}

export function axisOf(x: number, z: number): [number, number] {
  const px = x - ORIGIN[0];
  const pz = z - ORIGIN[1];
  return [px * OUT[0] + pz * OUT[1], px * RIGHT[0] + pz * RIGHT[1]];
}

/** The stream: it leaves the lake left of the spur and runs out through the rim. `across` of its middle at `along`, and the level of its bed. */
export const streamAcross = (along: number): number => -40 + 7 * Math.sin(along / 37 + 0.6) + 4 * Math.sin(along / 13 + 2);
export const streamBed = (along: number): number => -0.35 - 0.05 * Math.max(0, along - 18) - 1.2 * smooth(52, 60, along) - 1.6 * smooth(96, 106, along) - 1.4 * smooth(150, 162, along);

/** The depth of the shelf of the shallows, metres below the water: knee-deep, with hollows and bare bars. */
export function shelfDepth(x: number, z: number, inFromShore: number): number {
  const hollows = 0.3 + 0.32 * fbm(x / 46, z / 46, 3);
  const depth = Math.min(inFromShore * 0.04, hollows);
  // At the lip the floor ends in a rim of pale crust that stands out of the water in places.
  const w = Math.hypot(x, z) - lipAt(Math.atan2(x, -z));
  if (w > 10) return depth;
  const crust = -0.17 + 0.3 * fbm(x / 1.9, z / 1.9, 3) + 0.12 * fbm(x / 0.43 + 7, z / 0.43, 3) - 0.1 * smooth(1.6, 0.2, w);
  const s = smooth(1.2, 10, w);
  return crust * (1 - s) + depth * s;
}

/** The edge of the deep: an irregular lip, metres from the centre at that angle. */
export function lipAt(a: number): number {
  const cx = Math.cos(a);
  const cz = Math.sin(a);
  const b = (((a / DEG) % 360) + 360) % 360;
  // A bay bitten out of the lip beside the place of the edge shot, so that the wall of the shaft is seen from the lip.
  const bay = 9 * smooth(LIP_BAY, LIP_BAY + 1.3, b) * (1 - smooth(LIP_BAY + 1.6, LIP_BAY + 4.2, b));
  return DEEP + 9 * (vnoise(cx * 9 + 3, cz * 9 + 7) - 0.5) + 5 * (vnoise(cx * 31 + 1, cz * 31 + 5) - 0.5) + 2.4 * (vnoise(cx * 110, cz * 110) - 0.5) - bay;
}

/** The bearing at which the bay in the lip begins: the edge shot stands just short of it. */
export const LIP_BAY = 197.2;

/** Metres from the shore to the foot of the cliff at that angle, the height of the scree at the foot, and the height of the top. */
export function wallAt(a: number): { foot: number; scree: number; top: number } {
  const cx = Math.cos(a);
  const cz = Math.sin(a);
  const east = bump(a, 92, 52);
  const west = bump(a, 270, 48);
  const south = bump(a, 182, 50);
  // Buttresses and bays: the wall stands in blocks, forward and back, at three sizes, with sharp corners.
  const block = (f: number, o: number, lo: number, hi: number): number => smooth(lo, hi, vnoise(cx * f + o, cz * f + o * 1.7));
  const blocks = 56 * (block(11, 3.1, 0.38, 0.62) - 0.5) + 16 * (block(29, 8.3, 0.3, 0.7) - 0.5);
  const foot = BROW.recess * browAt(a) + 64 + 150 * west + 470 * south - 20 * east + 22 * Math.sin(5 * a + 0.7) + 14 * Math.sin(11 * a + 2.1) + 46 * (vnoise(cx * 7 + 11, cz * 7 + 4) - 0.5) + blocks * (1 - 0.6 * browAt(a));
  const scree = 24 + 50 * west + 76 * south - 12 * east + 9 * Math.sin(7 * a + 2) + 22 * (vnoise(cx * 16 + 5, cz * 16) - 0.5);
  const top =
    214 +
    20 * Math.sin(3 * a + 0.5) +
    11 * Math.sin(8 * a + 1.9) -
    62 * west -
    84 * south -
    170 * bump(a, 224, 30) -
    70 * bump(a, 326, 20) +
    34 * (fbm(cx * 38 + 4, cz * 38 + 2, 3) - 0.5) +
    (44 + 90 * smooth(48, 96, a / DEG)) * browAt(a) +
    64 * (block(9, 5.7, 0.3, 0.7) - 0.5) +
    22 * (block(27, 2.2, 0.38, 0.62) - 0.5) +
    9 * (block(90, 7.1, 0.4, 0.6) - 0.5);
  return { foot: Math.max(46, foot), scree: Math.max(3, Math.min(scree, 0.6 * Math.max(26, top))), top: Math.max(26, top) };
}

const BEACH = 30;
const FACE = 62;

/** 0 to 1 along the wall: where the brow hangs over the east shore. */
export function browAt(a: number): number {
  const b = (((a / DEG) % 360) + 360) % 360;
  return smooth(24, 50, b) * (1 - smooth(118, 144, b));
}

/** How far the wall stands back under the brow, metres, and the profile of the brow itself: the level of the under side of its lip and how far the lip hangs out from the wall behind. */
export const BROW = { recess: 90, lipLevel: 168, reach: 128, thick: 36 };

/** The height below which the brow hides the sun, at a point on the ground. It is baked into the rig's map with the shadows of the cliffs. */
export function browCover(x: number, z: number): number {
  const a = Math.atan2(x, -z);
  const e = browAt(a);
  if (e <= 0.01) return -1000;
  const r = Math.hypot(x, z);
  const lip = shoreAt(a / DEG) + wallAt(a).foot - BROW.reach * e;
  const front = lip - r;
  // Under the roof everything below the lip is in shade; in front of it the shade falls away with the distance.
  return (BROW.lipLevel + 10) * Math.min(1, e * 2) - Math.max(0, front) * 0.42;
}

export function landHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const a = Math.atan2(x, -z);
  const ds = r - shoreAt(a / DEG);

  if (ds < -1) {
    if (r < lipAt(a)) return -400;
    return -shelfDepth(x, z, -ds);
  }

  const wall = wallAt(a);
  let y: number;
  if (ds < BEACH) y = 0.03 * ds + 0.25 * smooth(4, 30, ds) * (fbm(x / 7, z / 7, 3) - 0.5);
  else {
    const s = Math.min(1, (ds - BEACH) / (wall.foot - BEACH));
    const face = smooth(wall.foot, wall.foot + FACE, ds);
    const far = Math.max(0, ds - wall.foot - FACE);
    // The scree stands in cones under the gullies and thin under the buttresses.
    const cone = 0.5 + 2.8 * vnoise(Math.cos(a) * 14 + 3, Math.sin(a) * 14 + 8) ** 2.2;
    y = 0.03 * BEACH + wall.scree * cone * s ** 1.3 + (wall.top - wall.scree * cone) * face + far * 0.02 + 14 * smooth(0, 500, far) * Math.sin(x * 0.0041 + 1.2) * Math.cos(z * 0.0037);
    y += 5 * s * (fbm(x / 60, z / 60, 3) - 0.5) + 9 * smooth(0, 300, far) * (fbm(x / 130, z / 130, 3) - 0.5);
    // The beds of the cliff: ledges and risers, their level wandering along the wall.
    const onFace = smooth(0, 0.06, face) * (1 - smooth(0.9, 1, face));
    if (onFace > 0) {
      const bed = 19 + 7 * vnoise(Math.cos(a) * 5 + 1, Math.sin(a) * 5 + 2);
      const t = y / bed + 0.6 * vnoise(Math.cos(a) * 30, Math.sin(a) * 30 + 6) + 0.25 * vnoise(x / 26, z / 26);
      const whole = Math.floor(t);
      const stepped = (whole + smooth(0.34, 0.66, t - whole) - (t - y / bed)) * bed;
      y += (stepped - y) * 0.78 * onFace;
      // Flutes down the face.
      y -= 1.5 * onFace * ridged(Math.cos(a) * 150, Math.sin(a) * 150, 2) * (0.4 + 0.6 * vnoise(Math.cos(a) * 12 + 9, Math.sin(a) * 12));
    }
  }

  // The bluff of the last shot, on the shore at x = 0.
  if (z > 0) y += BLUFF * smooth(6, 70, ds) * (1 - smooth(95, 150, ds)) * Math.exp(-((x / 44) ** 2));

  const [along, across] = axisOf(x, z);
  if (along > -40 && along < 2600 && Math.abs(across) < 400) {
    // The spur the wide camera stands on: bedrock ribs that step down to the beach, steep on the side of the stream.
    const lateral = across > 0 ? Math.exp(-((across / 78) ** 2)) : Math.exp(-((across / 36) ** 2));
    const crest = 42 * smooth(62, 150, along) + 14 * smooth(150, 320, along);
    const rough = 0.86 + 0.28 * fbm(x / 21, z / 21, 3);
    let spur = crest * rough;
    const ledge = 3.2;
    const t = spur / ledge + 0.8 * vnoise(x / 15, z / 15);
    const whole = Math.floor(t);
    spur += ((whole + smooth(0.3, 0.7, t - whole) - (t - spur / ledge)) * ledge - spur) * 0.6;
    if (spur > y) y += (spur - y) * lateral * smooth(20, 60, along);

    // The ravine of the stream.
    const off = Math.abs(across - streamAcross(along));
    const open = smooth(3.5 + 2.5 * vnoise(along / 9, 3.3), 30 + 14 * vnoise(along / 31, 7.7), off);
    const bed = streamBed(along) + 0.5 * (vnoise(x / 2.3, z / 2.3) - 0.5) * smooth(18, 40, along);
    const from = smooth(-30, 6, along);
    y = y * (1 - from) + (bed * (1 - open) + y * open) * from;
  }
  return y;
}

/** The slope of the ground, for normals: the unit vector that points up out of it. */
export function landNormal(x: number, z: number, reach = 0.75): [number, number, number] {
  const dx = landHeight(x + reach, z) - landHeight(x - reach, z);
  const dz = landHeight(x, z + reach) - landHeight(x, z - reach);
  const nx = -dx;
  const nz = -dz;
  const ny = 2 * reach;
  const l = Math.hypot(nx, ny, nz);
  return [nx / l, ny / l, nz / l];
}

export { SHORE };
