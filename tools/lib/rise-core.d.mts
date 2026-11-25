export interface RiseWindow {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RiseView {
  cx: number;
  cy: number;
  w: number;
}

export function monotone(ts: number[], ys: number[], startSlope?: number, endSlope?: number): (t: number) => number;
export function riseSpeeds(frames: number[], heights: number[], endSpeed?: number): number[];
export function riseLaunch(t0: number, t1: number, z0: number, z1: number, v0: number, v1: number): (t: number) => number;
export function riseCurve(
  start: number,
  frames: number[],
  heights: number[],
  options?: { launch?: { height: number; speed: number } | null; endSpeed?: number },
): { at: (t: number) => number; start: number; speeds: number[] | null };
export function risePath(options: {
  start: number;
  frames: number[];
  windows: RiseWindow[];
  cover?: number;
  creep?: number;
  creepFrames?: number;
  startWidth?: number | null;
  startSpeed?: number;
  endSpeed?: number;
  endFrames?: number;
  hold?: { x: number; y: number; frames: number } | null;
}): {
  at: (frame: number) => RiseView;
  startWidth: number;
  speeds: number[] | null;
};
export function riseFaults(heights: number[], options?: { first?: number; maxTurn?: number; still?: number }): string[];
