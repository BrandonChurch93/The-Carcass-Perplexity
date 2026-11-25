import { args, config } from './lib/paths.mjs';
import { isMain, one } from './lib/img.mjs';
import { makeLoop, closeRenderer } from './lib/film-run.mjs';

export const USAGE = 'usage: npm run loop -- --format uhd|hd|preview --tier draft|review|final [--first N] [--last N] [--join]';
const say = (line) => console.log(`loop: ${line}`);
const opt = (v) => (v === undefined || v === true ? null : one(v, null));

export async function run(a, cfg = config()) {
  const format = opt(a.format);
  const tier = opt(a.tier);
  if (format === null || tier === null) throw new Error(`--format and --tier are needed. ${USAGE}`);
  return makeLoop({ cfg, format, tier, first: opt(a.first), last: opt(a.last), joinOnly: Boolean(a.join), say });
}

if (isMain(import.meta)) {
  const a = args();
  if (a.help) {
    console.log(USAGE);
    process.exit(0);
  }
  try {
    await run(a);
  } catch (e) {
    console.error(`loop: ${String(e.message).split('\n')[0]}`);
    process.exitCode = 1;
  } finally {
    await closeRenderer();
  }
}
