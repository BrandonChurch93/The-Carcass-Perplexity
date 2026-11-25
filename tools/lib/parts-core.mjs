export const SCHEMA = 'carcass/parts 1';
export const STATES = ['stand-in', 'built', 'fallback'];
export const PICTURES = 'out/stills/parts';
export const EVENT_OFFSETS = [0, 15, 45];
export const WIDER_STEP = 30;

const unique = (list) => [...new Set(list)].sort((a, b) => a - b);

export function spanOf(cut, unit) {
  const place = cut.places.find((p) => p.unit === unit);
  if (!place) throw new Error(`The cut list has no place for the unit ${unit}`);
  return { first: place.first, last: place.last };
}

export function candidateFrames(cut, cfg, unit) {
  const { first, last } = spanOf(cut, unit);
  const inside = (f) => Number.isInteger(f) && f >= first && f <= last;
  const keys = cfg.keys.filter((k) => k.unit === unit).map((k) => cut.keyFrames[k.id]);
  const events = cut.events.filter((e) => e.unit === unit).flatMap((e) => EVENT_OFFSETS.map((d) => e.frame + d));
  return unique([...keys, ...events].filter(inside));
}

export function widerFrames(cut, unit, step = WIDER_STEP) {
  const { first, last } = spanOf(cut, unit);
  const shots = cut.shots.filter((s) => s.unit === unit && s.picture !== 'black');
  const out = [];
  for (const s of shots) {
    const a = Math.max(first, s.first);
    const b = Math.min(last, s.last);
    for (let f = a; f <= b; f += step) out.push(f);
    out.push(b);
  }
  return unique(out);
}

export function countFlagged(data, channels = 4) {
  let n = 0;
  for (let i = 0; i < data.length; i += channels) if (data[i] >= 128) n++;
  return n;
}

export function pickFrame(counts) {
  let best = null;
  for (const c of counts) if (c.flagged > 0 && (best === null || c.flagged > best.flagged || (c.flagged === best.flagged && c.frame < best.frame))) best = c;
  return best;
}

export const pictureOf = (part) => `${PICTURES}/${part.unit}/${part.name}.png`;

export function entryOf(live, { hash, files }) {
  if (!STATES.includes(live.state)) throw new Error(`The part ${live.id} has the state ${live.state}, which the register does not know`);
  const entry = { id: live.id, unit: live.unit, name: live.name, kind: live.kind, state: live.state, fallbackStep: null, files, hash };
  if (live.state === 'stand-in') entry.standIn = { hash, picture: null, frame: null, format: null, tier: null, shown: null };
  return entry;
}

// `units` names the units the page was asked about. The entries of every other unit are kept as
// they are: their state was not read from the page, so their hashes may not move either, and
// `fresh` does not forget them, because nothing takes their pictures again.
export function mergeRegister(old, live, { hashes, files, order, fresh = false, units = null }) {
  const faults = [];
  const forgotten = (p) => fresh && (units === null || units.includes(p.unit));
  const before = new Map((old?.parts ?? []).filter((p) => !forgotten(p)).map((p) => [p.id, p]));
  const seen = new Set();
  const parts = [];
  for (const l of live) {
    if (seen.has(l.id)) {
      faults.push(`The page lists the part ${l.id} twice.`);
      continue;
    }
    seen.add(l.id);
    const now = { hash: hashes[l.unit], files: files[l.unit] };
    const was = before.get(l.id);
    if (units !== null && !units.includes(l.unit)) {
      parts.push(was ?? l);
      continue;
    }
    if (!was) {
      parts.push(entryOf(l, now));
      continue;
    }
    const { missing, ...kept } = was;
    const next = { ...kept, kind: l.kind, state: l.state, files: now.files, hash: now.hash };
    if (l.state === 'stand-in' && was.standIn) next.standIn = { ...was.standIn, hash: now.hash };
    if (l.state === 'stand-in' && !was.standIn) faults.push(`The part ${l.id} is a stand-in on the page, and the register holds it as ${was.state} with no stand-in record.`);
    parts.push(next);
  }
  for (const [id, was] of before) {
    if (seen.has(id)) continue;
    parts.push({ ...was, missing: true });
    faults.push(`The part ${id} is in the register and not on the page. Nothing leaves the register except a transition that ends as a plain cut.`);
  }
  const rank = (p) => {
    const i = order.indexOf(p.unit);
    return i < 0 ? order.length : i;
  };
  const at = new Map(parts.map((p, i) => [p.id, i]));
  parts.sort((a, b) => rank(a) - rank(b) || at.get(a.id) - at.get(b.id));
  return { register: { schema: SCHEMA, parts }, faults };
}

export function needsPicture(part, refresh = false) {
  return part.state === 'stand-in' && !!part.standIn && (refresh || !part.standIn.picture);
}

export function counts(register, order) {
  const rows = order.map((unit) => {
    const mine = register.parts.filter((p) => p.unit === unit);
    const row = { unit, parts: mine.length };
    for (const s of STATES) row[s] = mine.filter((p) => p.state === s).length;
    return row;
  });
  const total = { unit: 'all', parts: register.parts.length };
  for (const s of STATES) total[s] = register.parts.filter((p) => p.state === s).length;
  return { rows, total };
}

export function summaryTable(register, order) {
  const { rows, total } = counts(register, order);
  const line = (r, tick = '`') => `| ${tick}${r.unit}${tick} | ${r.parts} | ${r['stand-in']} | ${r.built} | ${r.fallback} |`;
  return ['| Unit | Parts | Stand-in | Built | Fallback |', '| --- | --- | --- | --- | --- |', ...rows.map((r) => line(r)), line(total, '')].join('\n');
}

export function namesLine(register, unit) {
  return register.parts.filter((p) => p.unit === unit).map((p) => p.name).join(', ');
}
