// Where the bones lie, for the bones and for the rock of the shelf under them (land/shelf.ts): ahead and to the right of the camera of
// the edge shot, then out to the rim of the lip from there.
import { KEYS } from '../cameras';
import { lipAt } from '../land/height';
import { DEG } from '../layout';

/** Metres ahead of the edge shot's camera, degrees to its right, and the way the hind end points, degrees. */
export const BONES = { ahead: 6.4, right: 16, along: 112 };
// The bones are built at the size of a small animal and laid half as large again: it was a grown one.
export const SCALE = 1.98;

/** The middle of the bones on the ground, the way the spine runs (skull to hind feet) and the way to the camera of the edge shot. */
export interface Seat {
  x: number;
  z: number;
  along: [number, number];
  toCamera: [number, number];
}

export function bonesSeat(): Seat {
  const from = KEYS.edge.position;
  const px = from[0] + Math.sin(BONES.right * DEG) * BONES.ahead;
  const pz = from[2] - Math.cos(BONES.right * DEG) * BONES.ahead;
  const a = Math.atan2(px, -pz);
  const lipPoint = (angle: number): [number, number] => [Math.sin(angle) * lipAt(angle), -Math.cos(angle) * lipAt(angle)];
  // It lies the way the lip runs there, its skull toward the left of the edge shot and its belly toward that camera: `along` is only
  // the side of the lip its hind end points to.
  const span = 2.6 / lipAt(a);
  const [ax, az] = lipPoint(a - span);
  const [bx, bz] = lipPoint(a + span);
  const l = Math.hypot(bx - ax, bz - az);
  let along: [number, number] = [(bx - ax) / l, (bz - az) / l];
  if (along[0] * Math.sin(BONES.along * DEG) - along[1] * Math.cos(BONES.along * DEG) < 0) along = [-along[0], -along[1]];
  let toCamera: [number, number] = [-along[1], along[0]];
  if (toCamera[0] * Math.sin(a) - toCamera[1] * Math.cos(a) < 0) toCamera = [-toCamera[0], -toCamera[1]];
  // As near the lip as its ragged line lets every bone lie on the floor: the hind limb that trails farthest back is 0.35 from the spine.
  const [lx, lz] = lipPoint(a);
  let back = 0;
  for (let pass = 0; pass < 3; pass++) {
    let short = -Infinity;
    for (let u = -1.35; u <= 1.85; u += 0.2) {
      const qx = lx + (along[0] * (u - 0.35) + toCamera[0] * (back - 0.36)) * SCALE;
      const qz = lz + (along[1] * (u - 0.35) + toCamera[1] * (back - 0.36)) * SCALE;
      short = Math.max(short, lipAt(Math.atan2(qx, -qz)) + 0.1 - Math.hypot(qx, qz));
    }
    back += short / SCALE;
  }
  return { x: lx + (toCamera[0] * back - along[0] * 0.35) * SCALE, z: lz + (toCamera[1] * back - along[1] * 0.35) * SCALE, along, toCamera };
}
