import { CUT_LIST, readJsonIf, report, skip, num, count, isWhole, placeOf } from './inputs.mjs';

export const TITAN_LINE = 3;

export const scriptLines = (cfg) =>
  cfg.narration.clips.flatMap((c) => c.lines.map((text, i) => ({ clip: c.id, line: i + 1, text, unit: c.unit })));

export const titanClip = (cfg) => cfg.narration.clips[cfg.narration.clips.length - 1];

const name = (l) => `Line ${l.line} of clip ${l.clip}`;

export function words(cut, cfg) {
  const faults = [];
  const info = [];
  const fps = cut.fps;
  const want = scriptLines(cfg);
  const got = Array.isArray(cut.lines) ? cut.lines : [];

  if (got.length !== want.length) faults.push(`${CUT_LIST} holds ${count(got.length, 'line')} and narration.clips holds ${want.length}.`);
  let same = 0;
  for (let i = 0; i < Math.min(got.length, want.length); i++) {
    const g = got[i];
    const w = want[i];
    if (g.clip !== w.clip || g.line !== w.line) faults.push(`Line ${i + 1} of the cut list is line ${g.line} of clip ${g.clip}, and the script has line ${w.line} of clip ${w.clip} there.`);
    else if (g.text !== w.text) faults.push(`${name(w)} reads "${g.text}" in the cut list and "${w.text}" in narration.clips.`);
    else same++;
  }
  info.push(`${same} of ${count(want.length, 'line')} of narration.clips are in the cut list word for word and in order.`);

  const timed = got.filter((l) => {
    const ok = isWhole(l.first) && isWhole(l.frames) && l.frames > 0;
    if (!ok) faults.push(`${name(l)} has no whole first frame and length: first is ${l.first} and frames is ${l.frames}.`);
    return ok;
  });
  const end = (l) => l.first + l.frames - 1;

  const sorted = [...timed].sort((a, b) => a.first - b.first);
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (b.first <= end(a)) faults.push(`${name(a)} runs from frame ${a.first} to frame ${end(a)} and ${name(b).replace(/^L/, 'l')} starts on frame ${b.first}, so they overlap by ${Math.min(end(a), end(b)) - b.first + 1} frames.`);
  }

  for (const l of timed) {
    if (l.carried === true) continue;
    const unit = cfg.narration.clips.find((c) => c.id === l.clip)?.unit ?? l.unit;
    const place = placeOf(cut, unit);
    if (place === null) faults.push(`${name(l)} belongs to the unit ${unit}, which has no span in places, and it is not marked as carried.`);
    else if (l.first < place.first || end(l) > place.last) faults.push(`${name(l)} runs from frame ${l.first} to frame ${end(l)}, outside the span of its unit ${unit}, frames ${place.first} to ${place.last}, and it is not marked as carried.`);
  }

  const last = titanClip(cfg);
  const third = got.find((l) => l.clip === last.id && l.line === TITAN_LINE);
  if (!third) faults.push(`Line ${TITAN_LINE} of clip ${last.id} is not in the cut list, so it cannot start on or after the titan frame.`);
  else if (!isWhole(cut.titanFrame)) faults.push(`${CUT_LIST} holds no titan frame for line ${TITAN_LINE} of clip ${last.id} to start on or after.`);
  else if (!(third.first >= cut.titanFrame)) faults.push(`Line ${TITAN_LINE} of clip ${last.id} starts on frame ${third.first}, which is ${cut.titanFrame - third.first} frames before the titan frame ${cut.titanFrame}.`);
  else info.push(`Line ${TITAN_LINE} of clip ${last.id} starts on frame ${third.first}, on or after the titan frame ${cut.titanFrame}.`);

  let shortest = null;
  for (let i = 1; i < got.length; i++) {
    const a = got[i - 1];
    const b = got[i];
    if (a.clip !== b.clip || !timed.includes(a) || !timed.includes(b)) continue;
    const gap = (b.first - end(a) - 1) / fps;
    if (shortest === null || gap < shortest.gap) shortest = { gap, a, b };
  }
  const min = cfg.narration.linePauseMinSeconds;
  if (shortest) info.push(`The shortest gap between two lines of one clip is ${num(shortest.gap, 3)} s, between lines ${shortest.a.line} and ${shortest.b.line} of clip ${shortest.a.clip}. narration.linePauseMinSeconds is ${min} s.`);

  return { faults, info, skipped: [] };
}

export async function runG16(ctx) {
  const cut = readJsonIf(ctx.root, CUT_LIST);
  if (cut === null) return skip(`no ${CUT_LIST} yet`);
  return report(words(cut, ctx.config));
}
