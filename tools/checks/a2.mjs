import { RECORD_LABELS } from './repo.mjs';
import { KEPT_NARRATION, KEPT_SOUNDS, RECORDS, ASSETS, listFiles, listFolders, readTextIf, idOf, recordField, report, skip, count } from './inputs.mjs';

export const EVERY_LABEL = [...RECORD_LABELS, 'The listener:'];
export const NARRATION_LABELS = ['Voice:', 'Transcript:'];

export function recordLacks(text, id, narration) {
  const lines = text.split('\n').map((l) => l.trim());
  const out = [];
  if (!lines.includes(`## ${id}`)) out.push(`## ${id}`);
  for (const label of [...EVERY_LABEL, ...(narration ? NARRATION_LABELS : [])]) {
    const value = recordField(text, label);
    if (value === null || value === '') out.push(label);
  }
  return out;
}

export const hasRow = (assetsText, file) => assetsText.split('\n').some((l) => l.trim().startsWith('|') && l.includes(file));

export function recordFaults(kept, assetsText) {
  const faults = [];
  let full = 0;
  let rows = 0;
  for (const k of kept) {
    const record = `${RECORDS}/${k.id}.md`;
    if (k.record === null) faults.push(`${k.file} has no record ${record}.`);
    else {
      const lacks = recordLacks(k.record, k.id, k.narration);
      if (lacks.length) faults.push(`${record} lacks ${lacks.map((m) => `"${m}"`).join(', ')}.`);
      else full++;
    }
    if (assetsText !== null && hasRow(assetsText, k.file)) rows++;
    else faults.push(`${k.file} has no row in ${ASSETS} that names its path.`);
  }
  return { faults, info: [`Of ${count(kept.length, 'kept clip and sound', 'kept clips and sounds')}, ${full} have a full record and ${rows} have a row in ${ASSETS}.`], skipped: [] };
}

export function keptFiles(root) {
  const read = (file, narration) => ({ file, id: idOf(file), narration, record: readTextIf(root, `${RECORDS}/${idOf(file)}.md`) });
  return [
    ...listFiles(root, KEPT_NARRATION).map((f) => read(f, true)),
    ...listFolders(root, KEPT_SOUNDS).flatMap((d) => listFiles(root, d)).map((f) => read(f, false))
  ];
}

export async function runA2(ctx) {
  const kept = keptFiles(ctx.root);
  if (kept.length === 0) return skip(`no kept clip in ${KEPT_NARRATION} and no kept sound in ${KEPT_SOUNDS} yet`);
  return report(recordFaults(kept, readTextIf(ctx.root, ASSETS)));
}
