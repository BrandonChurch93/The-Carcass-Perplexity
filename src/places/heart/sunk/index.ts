// The one that sank.
// A name moves into PARTS when this folder draws it; until then the part keeps its stand-in from the blockout.
// The names this folder will own: 'sunk-walker'.
import type { HeartContext, HeartPiece } from '../shared/context';

export const PARTS: readonly string[] = [];

export function create(_ctx: HeartContext): HeartPiece {
  return {};
}
