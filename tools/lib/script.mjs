// The two scripts of the narration.
// The recorded script is every line of narration.clips: what the voice read. The kept clips, the kept lines,
// the records and check A1 belong to it, and nothing here changes it.
// The spoken script is what the film says: the recorded script less the lines narration.cut drops, with a
// shortened line in its short words. The plan, the cut list, the cue sheet, the mix and check G16 read it.
// A line keeps its id in both: n8-3 is line 3 of clip n8 whether or not line 2 is spoken.

export const idOfLine = (l) => `${l.clip}-${l.line}`;

export const recordedLines = (cfg) =>
  cfg.narration.clips.flatMap((c) => c.lines.map((text, i) => ({ clip: c.id, line: i + 1, text, unit: c.unit })));

export function narrationCut(cfg) {
  const cut = cfg.narration.cut ?? {};
  return { dropped: cut.dropped ?? [], shortened: cut.shortened ?? [] };
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// What is wrong with narration.cut, in words. src/config.ts holds the same rules for the page, and it also asks
// that the entry be there. A config without one, as a test may build, cuts nothing here.
export function cutFaults(cfg) {
  const faults = [];
  const cut = cfg.narration.cut;
  if (cut === undefined) return faults;
  if (cut === null || typeof cut !== 'object' || !Array.isArray(cut.dropped) || !Array.isArray(cut.shortened)) return ['narration.cut needs a list "dropped" and a list "shortened"'];
  const recorded = new Map(recordedLines(cfg).map((l) => [idOfLine(l), l]));
  cut.dropped.forEach((id, i) => {
    if (!recorded.has(id)) faults.push(`narration.cut.dropped names ${JSON.stringify(id)}, which is no line of narration.clips`);
    else if (cut.dropped.indexOf(id) !== i) faults.push(`narration.cut.dropped names ${id} twice`);
  });
  cut.shortened.forEach((s, i) => {
    const where = `narration.cut.shortened[${i}]`;
    if (s === null || typeof s !== 'object') return faults.push(`${where} is not an object`);
    const line = recorded.get(s.id);
    if (!line) return faults.push(`${where} names ${JSON.stringify(s.id)}, which is no line of narration.clips`);
    if (cut.dropped.includes(s.id)) faults.push(`${where} shortens ${s.id}, which narration.cut.dropped drops`);
    if (cut.shortened.findIndex((o) => o && o.id === s.id) !== i) faults.push(`${where} shortens ${s.id} a second time`);
    if (typeof s.text !== 'string' || s.text === '' || s.text === line.text || !line.text.startsWith(s.text)) faults.push(`${where}.text has to be the first words of the recorded line ${s.id}, and shorter than it`);
    if (!isNum(s.endSeconds) || !(s.endSeconds > 0)) faults.push(`${where}.endSeconds has to be a number over 0`);
    if (!isNum(s.fadeOutSeconds) || s.fadeOutSeconds < 0 || !(s.fadeOutSeconds <= s.endSeconds)) faults.push(`${where}.fadeOutSeconds has to be a number from 0 to endSeconds`);
    if (typeof s.file !== 'string' || s.file === '') faults.push(`${where}.file has to name the sound file of the short line`);
  });
  return faults;
}

export function checkedCut(cfg) {
  const faults = cutFaults(cfg);
  if (faults.length) throw new Error(`config/showcase.json is not valid:\n- ${faults.join('\n- ')}`);
  return narrationCut(cfg);
}

export function spokenLines(cfg) {
  const { dropped, shortened } = checkedCut(cfg);
  return recordedLines(cfg)
    .filter((l) => !dropped.includes(idOfLine(l)))
    .map((l) => {
      const short = shortened.find((s) => s.id === idOfLine(l));
      return short ? { ...l, text: short.text } : l;
    });
}

// One entry a recorded line, in script order: how it stands in the film.
export function lineStates(cfg) {
  const { dropped, shortened } = checkedCut(cfg);
  return recordedLines(cfg).map((l) => {
    const id = idOfLine(l);
    const short = shortened.find((s) => s.id === id);
    return { ...l, id, recorded: l.text, spoken: dropped.includes(id) ? null : short ? short.text : l.text, shortened: Boolean(short) };
  });
}
