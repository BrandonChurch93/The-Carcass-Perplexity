// Everything molten of the lake: the melt in the wide gaps, the fountains, what the lake writes into the glow map.
// A stand-in that draws nothing, put here by the crust owner so that the call in index.ts exists. The lava owner replaces this file.
import type * as THREE from 'three';
import type { HeartContext } from '../shared/context';
import type { Net } from './net';

export interface LavaPiece {
  setTime(seconds: number): void;
  solo(part: string | null): void;
  dispose(): void;
}

/**
 * ctx: the place. net: the baked net of plates (net.wide, net.fine). shared: the uniforms the crust's shaders run on
 * (the rig's, tNet, uNetRect, tNetFine, uNetFineRect, uPool, uSunk, tRopeNh, uRidge, uRidgeSize, the foundering's):
 * spread them into a material that includes HEAT_GLSL.
 */
export function createLava(_ctx: HeartContext, _net: Net, _shared: Record<string, THREE.IUniform>): LavaPiece {
  return {
    setTime: () => undefined,
    solo: () => undefined,
    dispose: () => undefined,
  };
}
