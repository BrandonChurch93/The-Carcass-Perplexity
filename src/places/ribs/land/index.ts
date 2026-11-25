import type { Context, Piece } from '../shared/context';

export const PARTS: readonly string[] = [];

export function create(_ctx: Context): Piece {
  return {};
}

export { landAt as bed } from '../layout';
