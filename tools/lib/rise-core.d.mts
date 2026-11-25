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
export function riseSpeeds(frames: number[], heights: number[]): number[];
export function riseCurve(start: number, frames: number[], heights: number[]): { at: (t: number) => number; start: number; speeds: number[] | null };
export function risePath(options: { start: number; frames: number[]; windows: RiseWindow[]; cover?: number; creep?: number; creepFrames?: number }): {
  at: (frame: number) => RiseView;
  startWidth: number;
  speeds: number[] | null;
};
export function riseFaults(heights: number[], options?: { first?: number; maxTurn?: number; still?: number }): string[];
