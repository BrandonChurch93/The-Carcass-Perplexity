import { args } from './lib/paths.mjs';
import { renderStill, closeRenderer } from './lib/render.mjs';

const USAGE = 'usage: npm run still -- --frame N | --key ID | --id ID | --loop N [--tier draft|review|final] [--format uhd|hd|preview] [--diag invalid|depth] [--force] [--caption TEXT] [--by NAME]';

const a = args();
const one = (v) => (Array.isArray(v) ? v.join(' ') : v);
const what = {};
if (a.key !== undefined) what.key = one(a.key);
else if (a.id !== undefined) what.id = one(a.id);
else if (a.loop !== undefined) what.loop = Number(a.loop);
else if (a.frame !== undefined) what.frame = Number(a.frame);
else {
  console.log(USAGE);
  process.exit(2);
}

try {
  const r = await renderStill({
    ...what,
    tier: a.tier === true || a.tier === undefined ? 'review' : a.tier,
    format: a.format === true || a.format === undefined ? 'hd' : a.format,
    diag: a.diag === true || a.diag === undefined ? null : a.diag,
    force: Boolean(a.force),
    caption: a.caption === undefined ? null : one(a.caption),
    by: a.by === undefined ? 'builder' : one(a.by),
  });
  console.log(`${r.reused ? 'reused' : 'rendered'}: ${r.file}${r.reused ? '' : ` in ${r.seconds.toFixed(1)} s`}`);
} catch (e) {
  console.error(`still: ${e.message}`);
  process.exitCode = 1;
} finally {
  await closeRenderer();
}
