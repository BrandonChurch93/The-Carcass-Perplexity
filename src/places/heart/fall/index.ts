// The vessel mouth in the wall, the fall that pours from it to the lake, and the surge.
// A name moves into PARTS when this folder draws it; until then the part keeps its stand-in from the blockout.
// The names this folder will own: 'vessel-mouth', 'lava-fall', 'surge'.
import type { HeartContext, HeartPiece } from '../shared/context';

export const PARTS: readonly string[] = [];

export function create(_ctx: HeartContext): HeartPiece {
  return {};
}
