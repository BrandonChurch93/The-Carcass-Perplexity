export interface JudgedEntry {
  id: string;
  unit: string;
  frame?: number | null;
  loop?: number;
  what: string;
  added?: boolean;
}
export function riseShot(cut: unknown): { id: string; first: number; last: number } | null;
export function lakeFrame(cut: unknown): number | null;
export function lastPictureFrame(cut: unknown): number;
export function judgedList(cfg: unknown, cut: unknown, extra?: JudgedEntry[]): JudgedEntry[];
export function judgedFrames(cfg: unknown, cut: unknown, extra?: JudgedEntry[]): Record<string, number>;
export function judgedTable(list: JudgedEntry[]): string;
export function readJudgedTable(text: string): JudgedEntry[];
export function judgedFaults(list: JudgedEntry[], logged: JudgedEntry[]): string[];
