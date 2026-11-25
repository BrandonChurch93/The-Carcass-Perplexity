import { KEPT_NARRATION, RECORDS, listFiles, readTextIf, idOf, recordField, report, skip, count } from './inputs.mjs';

export const TRANSCRIPT = 'Transcript:';

export const plain = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

export function transcriptFaults(clips, cfg) {
  const faults = [];
  let same = 0;
  for (const { id, record } of clips) {
    const clip = cfg.narration.clips.find((c) => c.id === id);
    if (!clip) {
      faults.push(`The kept clip ${id} is no clip of narration.clips, so it has no lines to read its transcript against.`);
      continue;
    }
    if (record === null) {
      faults.push(`The kept clip ${id} has no record ${RECORDS}/${id}.md, so it has no transcript.`);
      continue;
    }
    const said = recordField(record, TRANSCRIPT);
    if (said === null || said === '') {
      faults.push(`${RECORDS}/${id}.md has no "${TRANSCRIPT}" line.`);
      continue;
    }
    const quoted = /^"([^"]*)"/.exec(said.trim());
    const got = plain(quoted ? quoted[1] : said).split(' ');
    const want = plain(clip.lines.join(' ')).split(' ');
    const at = want.findIndex((w, i) => w !== got[i]);
    if (at === -1 && got.length === want.length) same++;
    else {
      const i = at === -1 ? want.length : at;
      faults.push(`The transcript of clip ${id} has ${count(got.length, 'word')} and its lines have ${want.length}. They part at word ${i + 1}: the transcript has "${got[i] ?? 'nothing'}" and the lines have "${want[i] ?? 'nothing'}".`);
    }
  }
  return { faults, info: [`${same} of ${count(clips.length, 'kept narration clip')} have a transcript that equals their lines word for word.`], skipped: [] };
}

export async function runA1(ctx) {
  const kept = listFiles(ctx.root, KEPT_NARRATION);
  if (kept.length === 0) return skip(`no kept narration clip in ${KEPT_NARRATION} yet`);
  const ids = [...new Set(kept.map(idOf))];
  return report(transcriptFaults(ids.map((id) => ({ id, record: readTextIf(ctx.root, `${RECORDS}/${id}.md`) })), ctx.config));
}
