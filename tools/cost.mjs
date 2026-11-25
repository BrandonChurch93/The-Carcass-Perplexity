// What each part of a place costs: the seconds of one frame with the part drawn alone, beside the whole frame and the empty frame.
// A part alone is not hidden by the others, so the parts can add up to more than the whole.
import { args, config, writeJson, rel } from './lib/paths.mjs';
import { closeRenderer, filmInfo, renderRaw, unitParts } from './lib/render.mjs';

const USAGE = 'usage: npm run cost -- --key ID | --frame N [--tier draft] [--format uhd] [--parts NAME ...] [--runs 1]';
const a = args();
const one = (v) => (Array.isArray(v) ? v[0] : v);
const list = (v) => (v === undefined || v === true ? [] : Array.isArray(v) ? v : [v]);
if (a.key === undefined && a.frame === undefined) {
  console.log(USAGE);
  process.exit(1);
}
const tier = one(a.tier) ?? 'draft';
const format = one(a.format) ?? 'uhd';
const runs = Number(one(a.runs) ?? 1);
const at = a.key !== undefined ? { key: String(one(a.key)) } : { frame: Number(one(a.frame)) };
const samples = config().tiers[tier].samplesPerFrame;

async function timed(diag, part) {
  let best = Infinity;
  for (let i = 0; i < runs; i++) best = Math.min(best, (await renderRaw({ ...at, tier, format, diag, part })).seconds);
  return best;
}

try {
  const film = await filmInfo();
  const frame = at.key !== undefined ? film.keyFrames[at.key] : at.frame;
  if (frame === undefined) throw new Error(`No such key frame: ${at.key}`);
  const unit = film.shots.find((s) => frame >= s.first && frame <= s.last)?.unit;
  if (!unit) throw new Error(`Frame ${frame} shows no place`);
  // The first frame pays for the creation of the place: it is drawn and thrown away.
  await renderRaw({ ...at, tier, format });
  const whole = await timed(null, null);
  const parts = (await unitParts(unit)).filter((p) => p.kind === 'solid');
  const wanted = list(a.parts);
  const rows = [];
  let empty = null;
  for (const p of parts) {
    if (wanted.length && !wanted.includes(p.name)) continue;
    const seconds = await timed('solo', p.id);
    rows.push({ part: p.id, state: p.state, seconds });
    empty = empty === null ? seconds : Math.min(empty, seconds);
  }
  const base = Math.min(empty ?? whole, whole);
  console.log(`cost: frame ${frame} of ${unit}, ${format} ${tier}, ${samples} sample${samples === 1 ? '' : 's'} a frame`);
  console.log(`cost: the whole frame ${whole.toFixed(2)} s; the cheapest part alone ${base.toFixed(2)} s, taken as the cost of an empty frame`);
  for (const r of rows.sort((x, y) => y.seconds - x.seconds)) console.log(`cost: ${r.part.padEnd(28)} ${r.state.padEnd(9)} ${r.seconds.toFixed(2)} s alone, ${((r.seconds - base) / samples).toFixed(2)} s a sample above the empty frame`);
  const file = rel('out', 'work', 'cost', `${unit}-${frame}-${format}-${tier}.json`);
  writeJson(file, { unit, frame, format, tier, samples, whole, empty: base, parts: rows });
  console.log(`cost: ${file}`);
} finally {
  await closeRenderer();
}
