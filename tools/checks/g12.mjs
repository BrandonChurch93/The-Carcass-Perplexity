import { CUT_LIST, readJsonIf, report, skip, placeOf } from './inputs.mjs';
import { loadRenderer } from './parts.mjs';
import { riseFaults } from '../lib/rise-core.mjs';

export function riseSpan(cut, cfg) {
  const unit = cfg.film.order[cfg.film.order.length - 1];
  const place = placeOf(cut, unit);
  if (place === null || !Number.isInteger(cut.titanFrame)) return null;
  if (cut.titanFrame < place.first || cut.titanFrame > place.last) return null;
  return { unit, first: place.first, last: cut.titanFrame };
}

const km = (v) => (v >= 100 ? v.toFixed(0) : v.toFixed(1));

export function riseIsOneShot(states, span) {
  const faults = [];
  const ids = [...new Set(states.map((s) => s.shot))];
  if (states.length !== span.last - span.first + 1) faults.push(`The film gave ${states.length} states for frames ${span.first} to ${span.last}.`);
  if (ids.length !== 1) faults.push(`The rise from frame ${span.first} to the titan frame ${span.last} runs through ${ids.length} shots: ${ids.join(', ')}.`);
  const heights = states.map((s) => s.camera?.height);
  if (heights.some((h) => !Number.isFinite(h))) faults.push('The film gave no camera height for a frame of the rise.');
  else faults.push(...riseFaults(heights, { first: span.first }));
  const info = [
    `The rise is the one shot ${ids[0]}, frames ${span.first} to ${span.last}. The camera climbs from ${km(heights[0])} to ${km(heights[heights.length - 1])} and never falls or jumps.`,
  ];
  return { faults: faults.slice(0, 12), info };
}

export async function runG12(ctx) {
  const cut = readJsonIf(ctx.root, CUT_LIST);
  if (cut === null) return skip(`no ${CUT_LIST} yet`);
  const span = riseSpan(cut, ctx.config);
  if (span === null) return { ok: false, lines: [`${CUT_LIST} has no titan frame inside the span of the last place of film.order.`], skipped: [] };
  const { renderer, error } = await loadRenderer(ctx);
  if (error) return { ok: false, lines: [error], skipped: [] };
  const states = await renderer.filmStates({ first: span.first, last: span.last });
  return report(riseIsOneShot(states, span));
}
