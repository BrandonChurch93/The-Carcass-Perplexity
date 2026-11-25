// The script sheet: a draft of the narration laid against the cut list.
// Every line gets the shot it falls on, its time in the film, a length worked out with the cut's own estimate,
// and a verdict a machine can repeat: fits, tight or too long. Marks on what the picture shows are the Builder's and are kept in the draft file.
import { estimateSeconds, strikeSpans, DEFAULT_ESTIMATE, STRIKE_BEFORE_SECONDS, STRIKE_AFTER_SECONDS } from './cut-core.mjs';

export const DRAFT_SCHEMA = 'carcass/script-draft 1';
export const SHEET_SCHEMA = 'carcass/script-sheet 1';
export const SPILL_SECONDS = 0.5; // more of a line than this on shots it does not describe counts as not fitting
export const MISS_SECONDS = 0.44; // the largest miss of the estimate on the four measured lines of clip n8
export const KINDS = ['length', 'tight', 'picture'];
const SPARE_STEP = 0.01;
const SPARE_STEPS = 150; // the search for what a line has to spare stops at 1.5 s

const EPS = 1e-6;
const r2 = (x) => Math.round(x * 100) / 100;

export const clock = (s) => {
  const t = Math.max(0, s);
  const m = Math.floor(t / 60);
  const rest = t - m * 60;
  return `${m}:${rest.toFixed(1).padStart(4, '0')}`;
};

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function startOf(at, spans, name) {
  if (at && typeof at.film === 'number') return at.film;
  if (at && typeof at.strike === 'string') {
    const s = spans.find((x) => x.name === at.strike);
    if (!s) throw new Error(`${name}: the cut has no strike ${at.strike}`);
    return s.film + (at.plus ?? 0);
  }
  throw new Error(`${name}: its position has to be { "film": seconds } or { "strike": name }`);
}

const tail = (label) => (label.includes(' · ') ? label.split(' · ').slice(1).join(' · ') : label);

// The spans of the sentences of one line, by the same estimate that gives the line its length.
export function sentences(text, start, estimate = {}) {
  const e = { ...DEFAULT_ESTIMATE, ...estimate };
  const chars = [...text];
  const out = [];
  let t = start;
  let buf = [];
  chars.forEach((c, i) => {
    buf.push(c);
    const last = i === chars.length - 1;
    const inner = c === '.' && !last;
    if (!inner && !last) return;
    const lead = buf.findIndex((x) => x !== ' ');
    const to = t + buf.length * e.secondsPerCharacter + buf.filter((x) => x === ',').length * e.secondsPerComma;
    out.push({ text: buf.join('').trim(), from: t + Math.max(0, lead) * e.secondsPerCharacter, to });
    t = to + (inner ? e.secondsPerStop : 0);
    buf = [];
  });
  return out;
}

// One text at one start, alone: where it ends, what it lies on and what it breaks by itself.
export function own({ text, start, on, onStrike = false, place, shots, spans, fps, estimate, grow = 0 }) {
  const seconds = estimateSeconds(text, estimate) + grow;
  const end = start + seconds;
  const parts = shots
    .map((s) => ({ id: s.id, from: s.first / fps, to: (s.last + 1) / fps }))
    .map((s) => ({ ...s, seconds: Math.max(0, Math.min(end, s.to) - Math.max(start, s.from)) }))
    .filter((s) => s.seconds > EPS);
  const spill = Math.max(0, seconds - parts.filter((p) => on.includes(p.id)).reduce((a, p) => a + p.seconds, 0));
  const faults = [];
  const p = { from: place.first / fps, to: (place.last + 1) / fps };
  if (start < p.from - EPS) faults.push(`starts ${(p.from - start).toFixed(2)} s before its place begins`);
  if (end > p.to + EPS) faults.push(`ends ${(end - p.to).toFixed(2)} s after its place ends at ${clock(p.to)}`);
  for (const s of spans) {
    if (onStrike) continue;
    if (start < s.to - EPS && end > s.from + EPS) faults.push(`lies over the strike at ${clock(s.film)}, which is kept clear of speech from ${STRIKE_BEFORE_SECONDS} s before it to ${STRIKE_AFTER_SECONDS} s after it`);
  }
  if (spill > SPILL_SECONDS + EPS) {
    const off = parts.filter((x) => !on.includes(x.id)).map((x) => `${x.seconds.toFixed(1)} s on ${x.id}`);
    faults.push(`has ${spill.toFixed(1)} s off its picture (${off.join(', ')})`);
  }
  return { seconds, end, parts, spill, faults };
}

// A text in the place of line i of its clip. The lines after it keep their starts unless it pushes them:
// each has to wait for the pause after the line before it. What breaks anywhere down the chain is this text's fault.
export function chain(lines, i, text, start, ctx, grow = 0) {
  const me = own({ ...ctx, ...lines[i], text, start, grow });
  const faults = me.faults.map((f) => `it ${f}`);
  let end = me.end;
  for (let j = i + 1; j < lines.length; j++) {
    const l = lines[j];
    const s = Math.max(l.start, end + ctx.pause);
    if (s <= l.start + EPS) break;
    const o = own({ ...ctx, ...l, start: s });
    const moved = `it pushes ${l.id} from ${clock(l.start)} to ${clock(s)}`;
    if (l.onStrike) faults.push(`${moved}, off the strike it has to start on`);
    else if (o.faults.length) faults.push(`${moved}, where ${l.id} ${o.faults.join(' and ')}`);
    end = o.end;
  }
  return { ...me, faults };
}

export function judge(lines, i, text, start, ctx) {
  const at0 = chain(lines, i, text, start, ctx);
  let spare = null;
  if (!at0.faults.length) {
    spare = 0;
    for (let d = 1; d <= SPARE_STEPS; d++) {
      if (chain(lines, i, text, start, ctx, d * SPARE_STEP).faults.length) break;
      spare = d * SPARE_STEP;
    }
  }
  const room = ctx.shots.filter((s) => lines[i].on.includes(s.id)).reduce((a, s) => a + (s.last + 1 - s.first) / ctx.fps, 0);
  const verdict = at0.faults.length ? 'too long' : spare < MISS_SECONDS - EPS ? 'tight' : 'fits';
  return {
    text,
    characters: [...text].length,
    start: r2(start),
    seconds: r2(at0.seconds),
    end: r2(at0.end),
    room: r2(room),
    spill: r2(at0.spill),
    spare: spare === null ? null : r2(spare),
    parts: at0.parts.map((x) => ({ id: x.id, seconds: r2(x.seconds) })),
    sentences: sentences(text, start, ctx.estimate).map((s) => ({ text: s.text, from: r2(s.from), to: r2(s.to) })),
    verdict,
    faults: at0.faults
  };
}

// What a sentence of a line falls on: a hit of the music, a strike or a shot. The words are made here so they cannot drift from the numbers.
function landing(l, j, cut, spans, name) {
  const s = j.sentences[(l.sentence ?? 1) - 1];
  if (!s) throw new Error(`${name}: it has no sentence ${l.sentence}`);
  const q = `"${s.text}"`;
  const hit = (t, what) => {
    if (t < s.from - EPS) return `${q} starts ${(s.from - t).toFixed(1)} s after ${what} at ${clock(t)}.`;
    if (t > s.to + EPS) return `${q} ends ${(t - s.to).toFixed(1)} s before ${what} at ${clock(t)}.`;
    return `${q} runs from ${clock(s.from)} to ${clock(s.to)}, across ${what} at ${clock(t)}.`;
  };
  if (l.event) {
    const e = cut.events.find((x) => x.id === l.event);
    if (!e) throw new Error(`${name}: the cut list holds no event ${l.event}`);
    return hit(e.frame / cut.fps, `the hit where ${e.what.charAt(0).toLowerCase()}${e.what.slice(1)}`);
  }
  if (l.strike) {
    const k = spans.find((x) => x.name === l.strike);
    if (!k) throw new Error(`${name}: the cut has no strike ${l.strike}`);
    return hit(k.film, l.what ?? 'the strike');
  }
  const shot = cut.shots.find((x) => x.id === l.shot);
  if (!shot) throw new Error(`${name}: the cut list holds no shot ${l.shot}`);
  const from = shot.first / cut.fps;
  const to = (shot.last + 1) / cut.fps;
  const got = Math.max(0, Math.min(s.to, to) - Math.max(s.from, from));
  const len = s.to - s.from;
  if (got >= len - 0.05) return `${q} falls wholly on ${shot.id}, ${tail(shot.label)}.`;
  if (got <= EPS) return `${q} does not fall on ${shot.id}, ${tail(shot.label)}: it runs from ${clock(s.from)} to ${clock(s.to)} and the shot from ${clock(from)} to ${clock(to)}.`;
  return `${got.toFixed(1)} s of ${q} (${len.toFixed(1)} s) fall on ${shot.id}, ${tail(shot.label)}.`;
}

// Words the note rules out anywhere, and words that would say outright that the land is a body before the Reveal.
export const BANNED_ANYWHERE = ['i', 'me', 'my', 'mine', 'you', 'your', 'yours', 'we', 'us', 'our', 'man', 'men', 'woman', 'women', 'people', 'person', 'human', 'humans', 'map', 'maps', 'god', 'gods'];
export const BODY_WORDS = ['body', 'corpse', 'carcass', 'flesh', 'bone', 'bones', 'rib', 'ribs', 'heart', 'blood', 'eye', 'skull', 'spine', 'titan', 'giant', 'limb', 'limbs', 'vein', 'veins'];
export const REVEAL_CLIP = 'n8';

export const wordsOf = (text) => text.toLowerCase().replace(/[^a-z' ]+/g, ' ').split(/\s+/).filter(Boolean);

// Every text on the sheet: the draft's lines and the replacement lines.
export function texts(rows) {
  return rows.flatMap((r) => [{ id: r.id, clip: r.clip, text: r.text }, ...(r.mark?.replace ?? []).map((x, i) => ({ id: `${r.id} ${'AB'[i]}`, clip: r.clip, text: x.text }))]);
}

export function bannedIn(rows) {
  const out = [];
  for (const t of texts(rows)) {
    const w = wordsOf(t.text);
    for (const b of BANNED_ANYWHERE) if (w.includes(b)) out.push(`${t.id} says "${b}"`);
    if (t.clip !== REVEAL_CLIP) for (const b of BODY_WORDS) if (w.includes(b)) out.push(`${t.id} says "${b}" before the Reveal`);
  }
  return out;
}

function ruleChecks(draft, rows, clips, spans, fps) {
  const out = [];
  const bad = bannedIn(rows);
  const early = bad.filter((x) => x.endsWith('before the Reveal'));
  const plain = bad.filter((x) => !x.endsWith('before the Reveal'));
  out.push(plain.length ? `No "I", no "you", no people, no maps, no god: not met. ${plain.join('; ')}.` : 'No "I", no "you", no people, no maps, no god: met by every line of the draft and by every replacement line.');
  const body = rows.filter((r) => r.clip !== REVEAL_CLIP);
  out.push(
    early.length
      ? `Nothing says outright that the land is a body before the Reveal: not met. ${early.join('; ')}.`
      : `Nothing says outright that the land is a body before the Reveal: met. None of the ${body.length} lines before clip ${REVEAL_CLIP}, and none of their replacements, names a body or a part of one. "Skin", "breathes" and "bleeds" stand as the figures of speech the note asks for.`
  );
  const shape = draft.clips.every((c) => c.lines.length === 4) && draft.clips.length === 8;
  out.push(shape ? 'Eight clips, four lines each: met.' : `Eight clips, four lines each: not met, the draft has ${draft.clips.length} clips with ${draft.clips.map((c) => c.lines.length).join(', ')} lines.`);
  const total = clips.reduce((a, c) => a + c.seconds, 0);
  const old = clips.reduce((a, c) => a + (c.approvedSeconds ?? 0), 0);
  const repaired = rows.reduce((a, r) => a + (r.mark?.replace?.[0]?.seconds ?? r.seconds), 0);
  out.push(`About the same length as now: the draft is ${total.toFixed(1)} s of speech where the approved script is ${old.toFixed(1)} s, by the same estimate. With the first replacement of every marked line it is ${repaired.toFixed(1)} s. No shot moves either way.`);
  const marked = rows.filter((r) => r.mark);
  const kinds = { length: 'too long for their shots', tight: 'with too little to spare', picture: 'that do not match what the shot shows' };
  const parts = KINDS.map((k) => [marked.filter((r) => r.mark.kind === k).length, kinds[k] ?? k]).filter(([n]) => n > 0).map(([n, what]) => `${n} ${what}`);
  const said = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts.join('');
  out.push(
    marked.length
      ? `Every line falls on the picture it describes: ${rows.length - marked.length} of the ${rows.length} do as written. The other ${marked.length} are marked: ${said}.`
      : `Every line falls on the picture it describes: all ${rows.length} do as written.`
  );
  const third = rows.find((r) => r.id === `${REVEAL_CLIP}.3`);
  const hit = spans.find((x) => x.name === 'revealHit');
  if (third && hit) out.push(third.first === Math.round(hit.film * fps) ? `The third line of the Reveal lands on the reveal strike: it starts on frame ${third.first}, the frame of the strike at ${clock(hit.film)}.` : `The third line of the Reveal lands on the reveal strike: not met, it starts on frame ${third.first} and the strike is frame ${Math.round(hit.film * fps)}.`);
  return out;
}

export function layout(draft, cut, map, cfg) {
  if (draft.schema !== DRAFT_SCHEMA) throw new Error(`the draft's schema is ${draft.schema}, not ${DRAFT_SCHEMA}`);
  const fps = cut.fps;
  const pause = cfg.narration.linePauseMinSeconds;
  const estimate = draft.estimate ?? {};
  const spans = strikeSpans(cut, map);
  const errors = [];
  const rows = [];
  for (const c of draft.clips) {
    const place = cut.places.find((p) => p.unit === c.unit);
    if (!place) {
      errors.push(`${c.id}: the unit ${c.unit} has no place in the cut list`);
      continue;
    }
    const ctx = { place, shots: cut.shots, spans, fps, pause, estimate };
    // The repaired clip: a marked line stands as its first replacement, so each line is judged against neighbours that fit.
    const lines = c.lines.map((l, i) => {
      const id = `${c.id}.${i + 1}`;
      const a = l.mark?.replace?.[0];
      for (const s of l.on ?? []) if (!cut.shots.some((x) => x.id === s)) errors.push(`${id}: it names the shot ${s}, which the cut list does not hold`);
      return { id, text: a?.text ?? l.text, start: startOf(a?.at ?? l.at, spans, id), on: l.on ?? [], onStrike: l.onStrike === true };
    });
    c.lines.forEach((l, i) => {
      const id = lines[i].id;
      const start = startOf(l.at, spans, id);
      const mine = judge(lines, i, l.text, start, ctx);
      const lands = (l.lands ?? []).map((x) => landing(x, mine, cut, spans, id));
      const mark = l.mark
        ? {
            kind: l.mark.kind,
            why: l.mark.why,
            replace: (l.mark.replace ?? []).map((x, k) => {
              const j = judge(lines, i, x.text, x.at ? startOf(x.at, spans, id) : start, ctx);
              return { ...j, ...(x.note ? { note: x.note } : {}), lands: (x.lands ?? []).map((y) => landing(y, j, cut, spans, `${id} replacement ${k + 1}`)) };
            })
          }
        : null;
      if (mark && !KINDS.includes(mark.kind)) errors.push(`${id}: its mark is ${JSON.stringify(mark.kind)}, not one of ${KINDS.join(', ')}`);
      if (mark && mark.replace.length !== 2) errors.push(`${id}: a marked line needs two replacement lines and has ${mark.replace.length}`);
      rows.push({
        id,
        clip: c.id,
        line: i + 1,
        unit: c.unit,
        first: Math.round(start * fps),
        ...mine,
        on: lines[i].on,
        onStrike: lines[i].onStrike,
        shots: mine.parts.map((p) => {
          const s = cut.shots.find((x) => x.id === p.id);
          return { id: s.id, label: s.label, from: r2(s.first / fps), to: r2((s.last + 1) / fps), seconds: p.seconds, picture: s.picture };
        }),
        lands,
        mark,
        note: l.note ?? null
      });
    });
  }
  if (errors.length) throw new Error(errors.join('\n'));

  const approved = new Map(cfg.narration.clips.map((c) => [c.id, c]));
  // A clip's stretch of the film: its place, shared in film order where two clips speak in one place.
  const opens = (c) => Math.min(...c.lines.flatMap((l) => l.on ?? []).map((id) => cut.shots.find((x) => x.id === id).first));
  const clips = draft.clips.map((c, k) => {
    const mine = rows.filter((r) => r.clip === c.id);
    const old = approved.get(c.id);
    const place = cut.places.find((p) => p.unit === c.unit);
    const before = draft.clips.slice(0, k).some((x) => x.unit === c.unit);
    const next = draft.clips.slice(k + 1).find((x) => x.unit === c.unit);
    const name = cfg.units.find((u) => u.id === c.unit)?.name ?? c.unit;
    return {
      id: c.id,
      name: c.name,
      unit: c.unit,
      place: name,
      title: c.name === 'opening' ? 'The opening' : name.split(',')[0],
      from: r2((before ? opens(c) : place.first) / fps),
      to: r2((next ? opens(next) : place.last + 1) / fps),
      lines: mine.length,
      characters: mine.reduce((a, r) => a + r.characters, 0),
      seconds: r2(mine.reduce((a, r) => a + r.seconds, 0)),
      approvedCharacters: old ? old.lines.reduce((a, t) => a + [...t].length, 0) : null,
      approvedSeconds: old ? r2(old.lines.reduce((a, t) => a + estimateSeconds(t, estimate), 0)) : null
    };
  });
  return {
    schema: SHEET_SCHEMA,
    fps,
    pause,
    estimate: { ...DEFAULT_ESTIMATE, ...estimate },
    miss: MISS_SECONDS,
    spillLimit: SPILL_SECONDS,
    strikes: spans.map((s) => ({ name: s.name, film: r2(s.film), from: r2(s.from), to: r2(s.to) })),
    clips,
    rows,
    unnamed: (draft.unnamed ?? []).map((u) => {
      const s = cut.shots.find((x) => x.id === u.shot);
      if (!s) throw new Error(`shown and not named: the cut list holds no shot ${u.shot}`);
      return { shot: s.id, label: tail(s.label), from: r2(s.first / fps), to: r2((s.last + 1) / fps), when: `${clock(s.first / fps)} to ${clock((s.last + 1) / fps)}`, picture: s.picture, what: u.what };
    }),
    rules: [...ruleChecks(draft, rows, clips, spans, fps), ...(draft.rules ?? [])],
    totals: {
      lines: rows.length,
      characters: rows.reduce((a, r) => a + r.characters, 0),
      seconds: r2(rows.reduce((a, r) => a + r.seconds, 0)),
      approvedCharacters: clips.reduce((a, c) => a + (c.approvedCharacters ?? 0), 0),
      approvedSeconds: r2(clips.reduce((a, c) => a + (c.approvedSeconds ?? 0), 0)),
      marked: rows.filter((r) => r.mark).length,
      byKind: Object.fromEntries(KINDS.map((k) => [k, rows.filter((r) => r.mark?.kind === k).length]))
    }
  };
}

// The Builder's marks have to agree with the machine: a line the machine finds too long or tight is marked,
// a line marked for length is one the machine finds too long, and every replacement line fits.
export function disagreements(sheet) {
  const out = [];
  for (const r of sheet.rows) {
    const kind = r.mark?.kind ?? null;
    if (r.verdict === 'too long' && kind !== 'length' && kind !== 'picture') out.push(`${r.id} is too long by the estimate and is not marked for length: ${r.faults.join('; ')}`);
    if (r.verdict === 'tight' && kind === null) out.push(`${r.id} is tight by the estimate (${r.spare} s to spare) and is not marked`);
    if (kind === 'length' && r.verdict !== 'too long') out.push(`${r.id} is marked for length and the estimate finds that it ${r.verdict === 'fits' ? 'fits' : 'is only tight'}`);
    if (kind === 'tight' && r.verdict !== 'tight') out.push(`${r.id} is marked as tight and the estimate finds it ${r.verdict}`);
    for (const [i, x] of (r.mark?.replace ?? []).entries()) {
      if (x.verdict === 'too long') out.push(`${r.id}, replacement ${i + 1} does not fit: ${x.faults.join('; ')}`);
      if (x.verdict === 'tight' && !x.note) out.push(`${r.id}, replacement ${i + 1} is tight (${x.spare} s to spare) and carries no note that says so`);
    }
  }
  return out;
}

const KIND_WORDS = { length: 'Too long', tight: 'Tight', picture: 'Picture' };
const verdictWords = (r) => (r.mark ? KIND_WORDS[r.mark.kind] : 'Fits');

const shotWords = (r) =>
  r.shots.map((s) => `${s.id} (${clock(s.from)} to ${clock(s.to)}${r.shots.length > 1 ? `, ${s.seconds.toFixed(1)} s of the line` : ''})`).join(' then ');

// One replacement line in words: its length, where it starts if that moves, the verdict and what its sentences fall on.
export function factWords(x, r) {
  const fit = x.verdict === 'fits' ? `fits with ${x.spare.toFixed(1)} s to spare` : x.verdict === 'tight' ? `tight, ${x.spare.toFixed(1)} s to spare` : 'too long';
  const head = `${x.seconds.toFixed(1)} s${x.start !== r.start ? `, from ${clock(x.start)}` : ''}, ${fit}.`;
  return [head, x.note, ...(x.lands ?? [])].filter(Boolean).join(' ');
}

export const spareWords = (r) => (r.spare === null ? '' : `${r.spare >= 1.5 ? 'over 1.5' : r.spare.toFixed(1)} s to spare`);

export function rowHtml(r, { src }) {
  const pics = (r.pictures ?? [])
    .map((p) => `<figure><img src="${esc(src(p))}" alt="${esc(p.label)}" width="${p.width}" height="${p.height}" loading="lazy" decoding="async"><figcaption>${esc(p.label)}</figcaption></figure>`)
    .join('');
  const replace = r.mark
    ? `<ol class="swap">${r.mark.replace
        .map(
          (x) =>
            `<li><span class="alt">${esc(x.text)}</span><span class="fact">${esc(factWords(x, r))}</span></li>`
        )
        .join('')}</ol>`
    : '';
  return [
    `<article class="row${r.mark ? ` marked ${r.mark.kind}` : ''}">`,
    `<div class="when"><span class="id">${esc(r.id)}</span><span class="time">${clock(r.start)}</span><span class="len">${r.seconds.toFixed(1)} s, to ${clock(r.end)}</span>${r.spare !== null ? `<span class="len">${spareWords(r)}</span>` : ''}<span class="chip">${verdictWords(r)}</span></div>`,
    `<div class="pics${(r.pictures ?? []).length === 1 ? ' one' : ''}">${pics}</div>`,
    '<div class="say">',
    `<p class="text">${esc(r.text)}</p>`,
    `<p class="shot">${esc(shotWords(r))}</p>`,
    r.lands.length ? `<p class="lands">${esc(r.lands.join(' '))}</p>` : '',
    r.mark ? `<p class="why">${esc(r.mark.why)}</p>` : '',
    replace,
    r.note ? `<p class="note">${esc(r.note)}</p>` : '',
    '</div>',
    '</article>'
  ]
    .filter(Boolean)
    .join('\n');
}

export function clipHtml(sheet, clip, opts) {
  const c = sheet.clips.find((x) => x.id === clip);
  const rows = sheet.rows.filter((r) => r.clip === clip);
  const marked = rows.filter((r) => r.mark).length;
  const tag = opts.tag ?? 'section';
  return [
    `<${tag} class="script-clip"${opts.id ? ` id="${esc(opts.id)}"` : ''}>`,
    `<header><span class="id">${esc(c.id)}</span><span class="title">${esc(c.title)}</span><span class="facts">${clock(c.from)} to ${clock(c.to)} · ${c.seconds.toFixed(1)} s of speech, ${c.approvedSeconds === null ? 'no approved clip' : `${c.approvedSeconds.toFixed(1)} s in the approved script`} · ${marked ? `${marked} of ${rows.length} lines marked` : 'no line marked'}</span></header>`,
    ...rows.map((r) => rowHtml(r, opts)),
    `</${tag}>`
  ].join('\n');
}

export function unnamedHtml(sheet, { src }) {
  if (!sheet.unnamed.length) return '';
  return `<ul class="unnamed">${sheet.unnamed
    .map((u) => `<li>${u.thumb ? `<img src="${esc(src(u.thumb))}" alt="${esc(u.thumb.label)}" width="${u.thumb.width}" height="${u.thumb.height}" loading="lazy" decoding="async">` : '<span></span>'}<div><span class="name">${esc(u.shot)}, ${esc(u.label)}</span><span class="when">${esc(u.when)}</span><p>${esc(u.what)}</p></div></li>`)
    .join('')}</ul>`;
}

export const rulesHtml = (sheet) => `<ul class="checks">${sheet.rules.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;

export const SHEET_CSS = `
.script-clip { margin: 0 0 36px; }
.script-clip > header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 16px; padding: 0 0 12px; border-bottom: 1px solid var(--line); }
.script-clip > header .id { color: var(--ember); font: 600 15px/1 var(--mono); }
.script-clip > header .title { font: 400 30px/1.15 var(--serif); }
.script-clip > header .facts { color: var(--soft); font-size: 15px; }
.row { display: grid; grid-template-columns: 124px 420px minmax(0, 1fr); gap: 20px; padding: 18px 0; border-bottom: 1px solid var(--line); align-items: start; }
.row .when { display: flex; flex-direction: column; gap: 4px; }
.row .when .id { color: var(--soft); font: 600 14px/1.2 var(--mono); }
.row .when .time { font: 400 26px/1.1 var(--serif); font-variant-numeric: tabular-nums; }
.row .when .len { color: var(--soft); font-size: 14px; line-height: 1.3; }
.row .chip { align-self: flex-start; margin-top: 6px; padding: 3px 9px; border: 1px solid var(--line); border-radius: 999px; color: var(--soft); font-size: 13px; font-weight: 600; letter-spacing: 0.02em; }
.row.marked .chip { border-color: var(--ember); background: var(--ember); color: #1a0f08; }
.row.tight .chip { background: transparent; color: var(--ember); }
.row .pics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.row .pics figure { margin: 0; }
.row .pics img { display: block; width: 100%; height: auto; border-radius: 3px; background: var(--well); }
.row .pics figcaption { margin-top: 5px; color: var(--faint); font-size: 12px; line-height: 1.3; }
.row .pics.one { grid-template-columns: minmax(0, 300px); }
.row .say p { margin: 0; }
.row .lands { margin-top: 6px !important; color: var(--soft); font-size: 14px; line-height: 1.4; }
.row .text { font: 400 25px/1.3 var(--serif); }
.row .shot { margin-top: 8px !important; color: var(--soft); font-size: 14px; line-height: 1.4; }
.row .why { margin-top: 10px !important; padding-left: 12px; border-left: 2px solid var(--ember); font-size: 15px; line-height: 1.45; }
.row .note { margin-top: 10px !important; color: var(--soft); font-size: 15px; line-height: 1.45; }
.row .swap { margin: 10px 0 0; padding: 0; list-style: none; counter-reset: swap; }
.row .swap li { counter-increment: swap; display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 2px 8px; padding: 8px 0 0; }
.row .swap li::before { content: counter(swap, upper-alpha); grid-row: 1 / span 2; color: var(--ember); font: 600 14px/1.9 var(--mono); }
.row .swap .alt { font: 400 21px/1.3 var(--serif); }
.row .swap .fact { color: var(--soft); font-size: 14px; line-height: 1.4; }
.narrow .row { grid-template-columns: 92px 250px minmax(0, 1fr); gap: 16px; }
.narrow .row .pics, .narrow .row .pics.one { grid-template-columns: 1fr; }
.narrow .row .text { font-size: 24px; }
.narrow .row .why, .narrow .row .note { font-size: 15.5px; }
.narrow .row .shot, .narrow .row .lands, .narrow .row .swap .fact, .narrow .row .when .len { font-size: 14.5px; }
.narrow .row .pics figcaption { font-size: 13px; color: var(--soft); }
.inline .row { grid-template-columns: 210px minmax(0, 1fr); grid-template-rows: auto 1fr; grid-template-areas: "when say" "pics say"; gap: 10px 20px; }
.inline .row .when { grid-area: when; flex-direction: row; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
.inline .row .when .time { font-size: 22px; }
.inline .row .chip { margin-top: 0; }
.inline .row .pics, .inline .row .pics.one { grid-area: pics; grid-template-columns: 1fr; align-self: start; }
.inline .row .say { grid-area: say; }
.inline .row .text { font-size: 23px; }
.inline .row .swap .alt { font-size: 20px; }
.inline .unnamed li { grid-template-columns: 210px minmax(0, 1fr); }
@media (max-width: 560px) {
  .inline .row { grid-template-columns: 1fr; grid-template-areas: "when" "say" "pics"; }
  .inline .unnamed li { grid-template-columns: 1fr; }
}
.unnamed { margin: 0; padding: 0; list-style: none; }
.unnamed li { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--line); align-items: start; }
.unnamed img { display: block; width: 100%; height: auto; border-radius: 3px; background: var(--well); }
.unnamed .name { display: block; font: 400 22px/1.25 var(--serif); }
.unnamed .when { display: block; margin: 2px 0 6px; color: var(--soft); font-size: 14.5px; }
.unnamed p { margin: 0; font-size: 15.5px; line-height: 1.45; }
.checks { margin: 0; padding: 0 0 0 20px; }
.checks li { margin: 0 0 8px; font-size: 15.5px; line-height: 1.45; }
@media (max-width: 900px) {
  .unnamed li { grid-template-columns: 1fr; }
  .row { grid-template-columns: 1fr; gap: 12px; }
  .row .when { flex-direction: row; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; }
  .row .chip { margin-top: 0; }
}
`;

// The two opening lines of the sheet, the same in the markdown copy and on the review page.
export const intro = (sheet) => [
  `The draft of ${sheet.totals.lines} lines laid against the cut list. Lengths are worked out, not measured: ${sheet.estimate.secondsPerCharacter ?? 0.105} s a character, ${sheet.estimate.secondsPerStop ?? 0.5} s for a full stop inside a line, ${sheet.estimate.secondsPerComma ?? 0.2} s for a comma. On the four measured lines of clip n8 that was off by up to ${sheet.miss} s, so a line with less than ${sheet.miss} s to spare is called tight.`,
  `Marked: ${sheet.totals.marked} of ${sheet.totals.lines} lines (${sheet.totals.byKind.length} too long, ${sheet.totals.byKind.tight} tight, ${sheet.totals.byKind.picture} for the picture).`
];

// A clip's speech with the first replacement of each of its marked lines in place.
export const repaired = (sheet, clip) =>
  sheet.rows.filter((r) => clip === undefined || r.clip === clip).reduce((a, r) => a + (r.mark?.replace?.[0]?.seconds ?? r.seconds), 0);

export function markdown(sheet) {
  const out = ['# The script sheet', ''];
  const [first, second] = intro(sheet);
  out.push(first, '', second, '');
  out.push('| Clip | Place | In the film | Draft | Approved script |', '| --- | --- | --- | --- | --- |');
  for (const c of sheet.clips) out.push(`| ${c.id} | ${c.title} | ${clock(c.from)} to ${clock(c.to)} | ${c.seconds.toFixed(1)} s, ${c.characters} characters | ${c.approvedSeconds?.toFixed(1) ?? '?'} s, ${c.approvedCharacters ?? '?'} characters |`);
  out.push(`| all | | | ${sheet.totals.seconds.toFixed(1)} s, ${sheet.totals.characters} characters | ${sheet.totals.approvedSeconds.toFixed(1)} s, ${sheet.totals.approvedCharacters} characters |`, '');
  for (const c of sheet.clips) {
    out.push(`## ${c.id} · ${c.title}`, '');
    for (const r of sheet.rows.filter((x) => x.clip === c.id)) {
      out.push(`**${r.id}** · ${clock(r.start)} to ${clock(r.end)} (${r.seconds.toFixed(1)} s${r.spare !== null ? `, ${spareWords(r)}` : ''}) · ${verdictWords(r)}`, '', `> ${r.text}`, '', `On: ${shotWords(r)}.${r.lands.length ? ` ${r.lands.join(' ')}` : ''}`);
      if ((r.pictures ?? []).length) out.push('', r.pictures.map((p) => `![${p.label}](../${p.file})`).join(' '));
      if (r.mark) {
        out.push('', `Marked: ${r.mark.why}`, '');
        r.mark.replace.forEach((x, i) => out.push(`- ${'AB'[i]}: "${x.text}" ${factWords(x, r)}`));
      }
      if (r.note) out.push('', `Note: ${r.note}`);
      out.push('');
    }
  }
  if (sheet.unnamed.length) {
    out.push('## Shown and not named', '');
    for (const u of sheet.unnamed) out.push(`- ${u.shot}, ${u.label} (${u.when}): ${u.what}`);
    out.push('');
  }
  if (sheet.rules.length) {
    out.push('## The rules of the note, checked on the draft', '');
    for (const u of sheet.rules) out.push(`- ${u}`);
    out.push('');
  }
  return out.join('\n');
}
