// The four nested satellite maps of the ground (public/assets/reveal/maps/maps.json holds the same numbers): the whole body, the head and
// shoulders, the skull, the lake. Each is 16:9. Centre and width are px of the master.
import { KM, X, Z } from '../shared/anchors';

export interface Level {
  name: string;
  /** x and z of the corner, then one over the width and one over the height: world km. */
  rect: [number, number, number, number];
  /** Width in px of the master. */
  width: number;
}

const level = (name: string, cx: number, cy: number, width: number): Level => {
  const height = (width * 9) / 16;
  return { name, rect: [X(cx - width / 2), Z(cy - height / 2), 1 / (width * KM), 1 / (height * KM)], width };
};

/** From the widest to the closest. */
export const LEVELS: Level[] = [level('a', 2983.67, 1727.13, 5295.59), level('b', 1554, 1581, 2620), level('c', 1272.85, 1580.8, 1130), level('d', 1272.85, 1580.8, 320)];

/** The pair of levels a view of that width (px of the master) is drawn from, and how much of the closer one is left.
 *  The closer level fades into the wider one before the view outgrows the wider one's picture, so the swap of a pair is never seen. */
export function pairFor(width: number): { coarse: number; fine: number; mix: number } {
  for (let i = LEVELS.length - 1; i >= 1; i--) {
    const coarse = LEVELS[i - 1] as Level;
    if (width < coarse.width * 0.955 || i === 1) {
      const t = Math.min(1, Math.max(0, (width / coarse.width - 0.66) / (0.92 - 0.66)));
      return { coarse: i - 1, fine: i, mix: 1 - t * t * (3 - 2 * t) };
    }
  }
  return { coarse: 0, fine: 1, mix: 0 };
}
