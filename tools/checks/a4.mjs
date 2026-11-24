import fs from 'node:fs';
import path from 'node:path';
import { CUT_LIST, MIX_TOOL, report, skip } from './inputs.mjs';

export const WORK = 'out/work/checks';
export const RUNS = ['mix-a', 'mix-b'];

export function compareBytes(a, b) {
  if (a.equals(b)) return { faults: [], info: [`The mix made twice is byte equal: ${a.length} bytes each time.`], skipped: [] };
  const n = Math.min(a.length, b.length);
  let at = 0;
  while (at < n && a[at] === b[at]) at++;
  return { faults: [`The mix made twice differs: ${a.length} bytes and ${b.length} bytes, and the first byte that differs is byte ${at}.`], info: [], skipped: [] };
}

export async function runA4(ctx) {
  for (const f of [MIX_TOOL, CUT_LIST]) if (!fs.existsSync(path.join(ctx.root, f))) return skip(`no ${f} yet`);
  const made = [];
  for (const name of RUNS) {
    const out = `${WORK}/${name}.flac`;
    fs.mkdirSync(path.join(ctx.root, WORK), { recursive: true });
    fs.rmSync(path.join(ctx.root, out), { force: true });
    const argv = [MIX_TOOL, '--out', out, '--report', `${WORK}/${name}.json`];
    const r = await ctx.exec('node', argv, { cwd: ctx.root, timeoutMs: ctx.config.sandbox.stepTimeoutMinutes * 60 * 1000 });
    if (r.code !== 0 || r.timedOut) return { ok: false, lines: [`node ${argv.join(' ')} exited with code ${r.code}${r.timedOut ? ' after it was stopped for taking too long' : ''}.`, ...r.tail.map((l) => `| ${l}`)], skipped: [] };
    if (!fs.existsSync(path.join(ctx.root, out))) return { ok: false, lines: [`node ${argv.join(' ')} exited with code 0 and wrote no ${out}.`], skipped: [] };
    made.push(fs.readFileSync(path.join(ctx.root, out)));
  }
  return report(compareBytes(made[0], made[1]));
}
