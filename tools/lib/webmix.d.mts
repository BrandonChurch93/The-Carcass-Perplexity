export const WEB_MIX: string;
export const WEB_MIX_KBPS: number;
export function newestMix(dir?: string): string | null;
export function webMixArgs(source: string, target: string, kbps?: number): string[];
export function webMix(outDir: string, options?: { source?: string | null; cache?: string; run?: unknown }): { file: string | null; why: string | null; source?: string };
