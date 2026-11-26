import { CUT_LIST, RECORDS, listFiles, readTextIf, readJsonIf, idOf, recordField, report, skip, count } from './inputs.mjs';

import { narrationCut } from '../lib/script.mjs';

export const TAKES = 'Takes:';

export function takesMade(line) {
  const m = (line ?? '').match(/^(\d+)\b/);
  return m ? Number(m[1]) : null;
}

// A clip, a line of a clip, or the short form of a line that narration.cut shortens.
export function isNarration(id, cfg) {
  return cfg.narration.clips.some((c) => id === c.id || c.lines.some((_, i) => id === `${c.id}-${i + 1}`)) || narrationCut(cfg).shortened.some((s) => typeof s?.file === 'string' && idOf(s.file) === id);
}

export function takeFaults(records, cut, cfg) {
  const faults = [];
  const info = [];
  const clipMax = cfg.narration.maxTakesPerClip;
  const cueMax = cfg.audio.maxTakesPerCue;
  let read = 0;
  for (const r of records) {
    const made = takesMade(r.takes);
    if (made === null) {
      faults.push(`The "${TAKES}" line of ${RECORDS}/${r.id}.md does not begin with a whole number, so its takes cannot be counted.`);
      continue;
    }
    read++;
    const narration = isNarration(r.id, cfg);
    const max = narration ? clipMax : cueMax;
    if (made > max) faults.push(`${narration ? 'The narration' : 'The sound'} ${r.id} used ${count(made, 'take')} and ${narration ? 'narration.maxTakesPerClip' : 'audio.maxTakesPerCue'} is ${max}.`);
  }
  info.push(`${count(read, 'record')} read: no narration clip or line over ${clipMax} takes and no sound over ${cueMax}.`);

  if (cut !== null) {
    const perUnit = new Map();
    for (const s of cut.sounds ?? []) perUnit.set(s.unit, (perUnit.get(s.unit) ?? 0) + 1);
    const max = cfg.audio.maxCuesPerPlace;
    for (const [unit, n] of perUnit) if (n > max) faults.push(`The place ${unit} has ${count(n, 'cue')} in sounds of ${CUT_LIST} and audio.maxCuesPerPlace is ${max}.`);
    info.push(`${count((cut.sounds ?? []).length, 'cue')} in ${count(perUnit.size, 'place')}: none has more than ${max}.`);
  }
  return { faults, info, skipped: cut === null ? [`no ${CUT_LIST} yet, so the cues of each place were not counted`] : [] };
}

export function takeRecords(root) {
  return listFiles(root, RECORDS)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ id: idOf(f), takes: recordField(readTextIf(root, f), TAKES) }))
    .filter((r) => r.takes !== null);
}

export async function runA5(ctx) {
  const records = takeRecords(ctx.root);
  const cut = readJsonIf(ctx.root, CUT_LIST);
  if (records.length === 0 && cut === null) return skip(`no record with a "${TAKES}" line in ${RECORDS} and no ${CUT_LIST} yet`);
  return report(takeFaults(records, cut, ctx.config));
}
