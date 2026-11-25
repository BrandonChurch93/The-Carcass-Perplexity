// @ts-nocheck
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { config, rel, readJson } from '../tools/lib/paths.mjs';
import {
  DRAFT_SCHEMA,
  SHEET_SCHEMA,
  REVEAL_CLIP,
  layout,
  disagreements,
  bannedIn,
  sentences,
  texts,
  clipHtml,
  unnamedHtml,
  rulesHtml,
  markdown
} from '../tools/lib/script-sheet-core.mjs';

// The draft as Brandon wrote it in his review notes of 2026-11-25 (note 7 in kit/PROGRESS.md), word for word.
const NOTE = [
  ['n1', ['Past the last calm water, there is a shore.', 'Nothing on it has a name.', 'Nothing on it should be alive.', 'All of it is.']],
  [
    'n2',
    [
      'The strait.',
      'Blades of stone, taller than the storms that break on them.',
      'At low tide the winged ones come down to feed. They do not have long.',
      'High in the weed hangs one that stayed. Then the sea returns. All at once.'
    ]
  ],
  ['n3', ['The fire.', 'A lake of it, under a black skin.', 'The tall ones walk the skin, and drink from the cracks.', 'Sometimes the skin gives way. The fire beneath has never cooled.']],
  ['n4', ['The pits.', 'The ground breathes here. Slow. From far below.', 'Red growth crowds the rim, feeding on the breath.', 'The pale herds graze the channel, and never the rim. One did.']],
  ['n5', ['The red flats.', 'The ground still bleeds here. No rain made this.', 'The heavy ones wallow in it, and grow fat.', 'The salt keeps whatever it catches. Forever.']],
  ['n6', ['The ridge.', 'Above the cloud. Above the storm.', 'Every night the lightning walks it. Spire to spire.', 'The herds shelter in the hollow beneath, and wait for morning.']],
  ['n7', ['The lake.', 'Still. Gold at the edge. Black at the center.', 'The herds drink at the shallows. None of them looks down.', 'The center has no floor. Something there looks back.']],
  ['n8', ['From high enough, the land has a shape.', 'None of it was ever land.', 'It was a body.', 'Everything here feeds on it. And it is not finished.']]
] as const;

const cfg = config();
const cut = readJson(rel('cut', 'CUTLIST.json'));
const map = readJson(rel('cut', 'MAP.json'));
const draft = readJson(rel('cut', 'SCRIPT-DRAFT.json'));
const sheet = layout(draft, cut, map, cfg);
const saved = readJson(rel('cut', 'SCRIPT-SHEET.json'));
const row = (id: string) => sheet.rows.find((r: any) => r.id === id);

describe('the draft of the script', () => {
  it('holds Brandon\'s words unchanged: eight clips of four lines', () => {
    expect(draft.schema).toBe(DRAFT_SCHEMA);
    expect(draft.clips.map((c: any) => c.id)).toEqual(NOTE.map(([id]) => id));
    for (const [id, lines] of NOTE) {
      const clip = draft.clips.find((c: any) => c.id === id);
      expect(clip.lines.map((l: any) => l.text)).toEqual([...lines]);
    }
  });

  it('gives two replacement lines for every line it marks, and none that repeats the line', () => {
    for (const c of draft.clips)
      for (const l of c.lines) {
        if (!l.mark) continue;
        expect(l.mark.why.length).toBeGreaterThan(20);
        expect(l.mark.replace).toHaveLength(2);
        const said = l.mark.replace.map((x: any) => x.text);
        expect(new Set([l.text, ...said]).size).toBe(3);
      }
  });

  it('is not in the config: narration.clips keeps the approved script until the script is final', () => {
    expect(cfg.narration.clips).toHaveLength(8);
    expect(cfg.narration.clips[0].lines[0]).toBe('Listen.');
    expect(cfg.narration.clips[7].lines).toEqual(['Now you see it.', 'This was never land.', 'It was a god.', 'Gods die slow. This one is not finished.']);
    for (const [id, lines] of NOTE) expect(cfg.narration.clips.find((c: any) => c.id === id).lines).not.toEqual([...lines]);
  });
});

describe('the script sheet', () => {
  it('lays all 32 lines against the cut list, each on shots of its own place', () => {
    expect(sheet.schema).toBe(SHEET_SCHEMA);
    expect(sheet.rows).toHaveLength(32);
    for (const r of sheet.rows) {
      expect(r.shots.length).toBeGreaterThan(0);
      const place = cut.places.find((p: any) => p.unit === r.unit);
      expect(r.first).toBeGreaterThanOrEqual(place.first);
      expect(r.first).toBeLessThanOrEqual(place.last);
      expect(r.start).toBeCloseTo(r.first / cut.fps, 1);
      for (const id of r.on) expect(cut.shots.some((s: any) => s.id === id)).toBe(true);
    }
  });

  it('keeps the lines of a clip in order, a pause apart', () => {
    for (const c of sheet.clips) {
      const rows = sheet.rows.filter((r: any) => r.clip === c.id);
      expect(rows.map((r: any) => r.line)).toEqual([1, 2, 3, 4]);
      for (let i = 1; i < rows.length; i++) expect(rows[i].start).toBeGreaterThanOrEqual(rows[i - 1].start);
    }
  });

  it('agrees with the Builder\'s marks: what the estimate finds too long or tight is marked, and every replacement fits', () => {
    expect(disagreements(sheet)).toEqual([]);
    for (const r of sheet.rows) for (const x of r.mark?.replace ?? []) expect(x.verdict).not.toBe('too long');
  });

  it('marks 11 lines: 5 too long, 2 tight and 4 for the picture', () => {
    expect(sheet.totals.marked).toBe(11);
    expect(sheet.totals.byKind).toEqual({ length: 5, tight: 2, picture: 4 });
    expect(sheet.rows.filter((r: any) => r.mark).map((r: any) => r.id)).toEqual(['n2.2', 'n2.3', 'n3.4', 'n4.3', 'n4.4', 'n5.2', 'n6.2', 'n6.4', 'n7.3', 'n7.4', 'n8.1']);
  });

  it('has none of the words the note rules out, in the draft or in a replacement', () => {
    expect(bannedIn(sheet.rows)).toEqual([]);
    const all = texts(sheet.rows).map((t: any) => t.text).join(' ');
    expect(all).not.toMatch(/\b(I|you|your|men|man|people|map|maps|god|gods)\b/i);
  });

  it('names no body before the Reveal', () => {
    const before = texts(sheet.rows.filter((r: any) => r.clip !== REVEAL_CLIP)).map((t: any) => t.text).join(' ');
    expect(before).not.toMatch(/\b(body|bodies|corpse|carcass|rib|ribs|heart|spine|eye|blood|flesh|bone|bones|skull|titan|giant)\b/i);
    expect(row(`${REVEAL_CLIP}.3`).text).toBe('It was a body.');
  });

  it('starts the third line of the Reveal on the frame of the reveal strike', () => {
    const third = row('n8.3');
    expect(third.first).toBe(10027);
    expect(third.onStrike).toBe(true);
    const strike = sheet.strikes.find((s: any) => s.name === 'revealHit');
    expect(Math.round(strike.film * cut.fps)).toBe(third.first);
    expect(row('n8.2').end).toBeLessThan(strike.from);
  });

  it('times each sentence of a line, and the sentences add up to the line', () => {
    for (const r of sheet.rows) {
      expect(r.sentences.map((s: any) => s.text).join(' ')).toBe(r.text);
      expect(r.sentences[0].from).toBeCloseTo(r.start, 2);
      expect(r.sentences[r.sentences.length - 1].to).toBeCloseTo(r.end, 1);
      for (let i = 1; i < r.sentences.length; i++) expect(r.sentences[i].from).toBeGreaterThanOrEqual(r.sentences[i - 1].to - 0.001);
    }
    expect(sentences('The center has no floor. Something there looks back.', 0)).toHaveLength(2);
  });

  it('says how long the draft is against the approved script', () => {
    expect(sheet.totals.seconds).toBeCloseTo(sheet.rows.reduce((a: number, r: any) => a + r.seconds, 0), 1);
    expect(sheet.totals.approvedSeconds).toBeGreaterThan(100);
    expect(sheet.totals.seconds).toBeGreaterThan(sheet.totals.approvedSeconds);
    expect(sheet.rules.some((r: string) => r.startsWith('About the same length as now'))).toBe(true);
  });

  it('answers each of the note\'s rules in one line', () => {
    const starts = ['No "I", no "you"', 'Nothing says outright', 'Eight clips, four lines each: met.', 'About the same length', 'Every line falls on the picture', 'The third line of the Reveal lands', 'Short, blunt lines'];
    for (const s of starts) expect(sheet.rules.filter((r: string) => r.startsWith(s))).toHaveLength(1);
    expect(sheet.rules.find((r: string) => r.startsWith('Every line falls'))).toContain('21 of the 32 do as written. The other 11 are marked: 5 too long for their shots, 2 with too little to spare and 4 that do not match what the shot shows.');
  });

  it('lists what a shot shows and no line names', () => {
    expect(sheet.unnamed.map((u: any) => u.shot)).toEqual(['heart-05', 'marsh-02', 'spine-02', 'spine-03', 'eye-03']);
    for (const u of sheet.unnamed) {
      expect(cut.shots.some((s: any) => s.id === u.shot)).toBe(true);
      expect(u.what.length).toBeGreaterThan(20);
    }
  });
});

describe('the sheet that is committed', () => {
  const bare = (s: any) => ({
    ...s,
    sheets: undefined,
    rows: s.rows.map((r: any) => ({ ...r, pictures: undefined })),
    unnamed: s.unnamed.map((u: any) => ({ ...u, thumb: undefined }))
  });

  it('is what the tool makes from the draft and the cut list today', () => {
    expect(JSON.parse(JSON.stringify(bare(saved)))).toEqual(JSON.parse(JSON.stringify(bare(sheet))));
  });

  it('carries a picture for every line and every unnamed thing, and the files are there', () => {
    for (const r of saved.rows) {
      expect(r.pictures.length).toBeGreaterThan(0);
      for (const p of r.pictures) expect(fs.existsSync(rel(p.file))).toBe(true);
    }
    for (const u of saved.unnamed) expect(fs.existsSync(rel(u.thumb.file))).toBe(true);
    expect(saved.sheets).toHaveLength(8);
    for (const s of saved.sheets) expect(fs.existsSync(rel(s.file))).toBe(true);
  });

  it('reads the same in the markdown copy', () => {
    const md = fs.readFileSync(rel('cut', 'SCRIPT-SHEET.md'), 'utf8');
    expect(md).toBe(markdown(saved));
    for (const [, lines] of NOTE) for (const l of lines) expect(md).toContain(l);
    expect(md.replace(/!\[/g, '[')).not.toMatch(/[\u2014!]/);
  });

  it('draws as a page part with no em dash, no exclamation point and nothing from outside', () => {
    const html = [...saved.clips.map((c: any) => clipHtml(saved, c.id, { src: (p: any) => `script/${p.file.split('/').pop()}` })), unnamedHtml(saved, { src: (p: any) => `script/${p.file.split('/').pop()}` }), rulesHtml(saved)].join('\n');
    expect(html).not.toMatch(/https?:|<script|<link/i);
    expect(html.replace(/<[^>]+>/g, ' ')).not.toMatch(/[\u2014!]/);
    expect(html.match(/<img /g)!.length).toBeGreaterThanOrEqual(32);
    expect(html).toContain('It was a body.');
  });
});
