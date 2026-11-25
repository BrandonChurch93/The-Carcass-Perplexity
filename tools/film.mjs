import { args, config } from './lib/paths.mjs';
import { isMain, one } from './lib/img.mjs';
import { makeFilm, copyFilm, closeRenderer } from './lib/film-run.mjs';

export const USAGE =
  'usage: npm run film -- --format uhd|hd|preview --tier draft|review|final [--first N] [--last N] [--unit ID] [--fps N] [--join] [--silent] [--chunks A,B,C | --of K --part I] | --format uhd|hd|preview --from FILE [--fps N]';
const say = (line) => console.log(`film: ${line}`);
const opt = (v) => (v === undefined || v === true ? null : one(v, null));

export async function run(a, cfg = config()) {
  const format = opt(a.format);
  if (format === null) throw new Error(`--format is needed. ${USAGE}`);
  if (a.from !== undefined) {
    if (a.from === true) throw new Error('--from takes the path of a larger film of the same build.');
    return copyFilm({ cfg, src: one(a.from), format, fps: opt(a.fps), say });
  }
  const tier = opt(a.tier);
  if (tier === null) throw new Error(`--tier is needed. ${USAGE}`);
  const share = a.chunks !== undefined || a.of !== undefined || a.part !== undefined ? { chunks: opt(a.chunks), of: opt(a.of), part: opt(a.part) } : null;
  return makeFilm({ cfg, format, tier, fps: opt(a.fps), first: opt(a.first), last: opt(a.last), unit: opt(a.unit), joinOnly: Boolean(a.join), silent: Boolean(a.silent), share, say });
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
    console.error(`film: ${String(e.message).split('\n')[0]}`);
    process.exitCode = 1;
  } finally {
    await closeRenderer();
  }
}
