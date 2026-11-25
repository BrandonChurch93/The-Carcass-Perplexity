// The count of ElevenLabs credits spent from review round 1 on. Brandon's note of 2026-11-25 sets a hard cap for
// narration, sounds and tests together, with a part of it held for the narration. Pure: no file and no network here.

export const SCHEMA = 'carcass/credits 1';
export const LEDGER = 'audio/records/CREDITS.json';
export const PURPOSES = ['sound', 'narration', 'test'];
export const PROGRESS_KEY = 'ElevenLabs credits';

const whole = (v) => Number.isInteger(v) && v >= 0;
export const num = (n) => Number(n).toLocaleString('en-US');

export function empty({ cap, narrationHold }) {
  if (!whole(cap) || !whole(narrationHold) || narrationHold > cap) throw new Error('credits: the cap and the hold are whole numbers, and the hold is no more than the cap');
  return { schema: SCHEMA, cap, narrationHold, baseline: null, calls: [] };
}

export function check(ledger) {
  if (ledger?.schema !== SCHEMA) throw new Error(`credits: the ledger is not ${SCHEMA}`);
  if (!whole(ledger.cap) || !whole(ledger.narrationHold) || !Array.isArray(ledger.calls)) throw new Error('credits: the ledger is missing its cap, its hold or its calls');
  for (const c of ledger.calls) if (!whole(c.before) || !whole(c.after) || !whole(c.spent) || !PURPOSES.includes(c.purpose)) throw new Error(`credits: the call "${c.id}" in the ledger cannot be read`);
  if (ledger.read !== undefined && ledger.read !== null && (!whole(ledger.read.used) || typeof ledger.read.at !== 'string')) throw new Error('credits: the last reading in the ledger cannot be read');
  return ledger;
}

export const spentOf = (ledger, purpose = null) => ledger.calls.filter((c) => purpose === null || c.purpose === purpose).reduce((s, c) => s + c.spent, 0);
export const limitFor = (purpose, ledger) => (purpose === 'narration' ? ledger.cap : ledger.cap - ledger.narrationHold);

export function room({ ledger, purpose, estimate }) {
  if (!PURPOSES.includes(purpose)) throw new Error(`credits: "${purpose}" is not one of ${PURPOSES.join(', ')}`);
  if (!Number.isFinite(estimate) || estimate < 0) throw new Error('credits: the estimate is a number of 0 or more');
  const spent = spentOf(ledger);
  const limit = limitFor(purpose, ledger);
  const left = Math.max(0, limit - spent);
  return { ok: Math.ceil(estimate) <= left, spent, limit, left, estimate: Math.ceil(estimate) };
}

export function refusal(r, { purpose, id }) {
  const held = purpose === 'narration' ? '' : ' after the part held for the narration';
  return `${id} was not made. It would cost about ${num(r.estimate)} credits, ${num(r.spent)} are spent, and the cap leaves ${num(r.left)} for a ${purpose} call${held}. Nothing was sent.`;
}

// A call is counted by the cost its answer states, which is exact and comes with the answer. The account posts the same
// cost some seconds later (measured on 2026-11-25: up to half a minute), so the two readings are kept as they were read
// and serve as the check. With no cost in the answer, the call is counted by how far the account moved.
export function entry({ at, tool, purpose, id, estimate, before, after, ok, header = null, seconds = null, afterRead = 'read' }) {
  if (!PURPOSES.includes(purpose)) throw new Error(`credits: "${purpose}" is not one of ${PURPOSES.join(', ')}`);
  if (!whole(before) || !whole(after)) throw new Error('credits: the count before and the count after are whole numbers');
  const moved = after - before;
  const spent = whole(header) && ok ? header : Math.max(0, moved);
  return { at, tool, purpose, id, ok: Boolean(ok), estimate: Math.ceil(estimate), before, after, moved, spent, header, seconds, afterRead };
}

// The newest reading of the account that the ledger holds.
export function lastRead(ledger) {
  const reads = [];
  if (ledger.baseline) reads.push({ at: ledger.baseline.at, used: ledger.baseline.used });
  for (const c of ledger.calls) reads.push({ at: c.at, used: c.after });
  if (ledger.read) reads.push(ledger.read);
  return reads.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)).pop() ?? null;
}

// What the account moved by since the count before any call, less what the Builder's calls cost: the part no call of the
// Builder explains. Below nothing means the account has not yet posted a call.
export function drift(ledger) {
  const last = lastRead(ledger);
  if (!ledger.baseline || !last) return 0;
  return last.used - ledger.baseline.used - spentOf(ledger);
}

// Credits for one second of sound, measured from the calls that returned sound.
export function perSecond(ledger, purpose = 'sound') {
  const calls = ledger.calls.filter((c) => c.purpose === purpose && c.ok && c.seconds > 0 && c.spent > 0);
  if (calls.length === 0) return null;
  const seconds = calls.reduce((s, c) => s + c.seconds, 0);
  return { calls: calls.length, seconds, spent: calls.reduce((s, c) => s + c.spent, 0), perSecond: calls.reduce((s, c) => s + c.spent, 0) / seconds };
}

export function line(ledger) {
  const spent = spentOf(ledger);
  const forSounds = Math.max(0, ledger.cap - ledger.narrationHold - spent);
  const n = ledger.calls.length;
  const parts = [`${num(spent)} spent of the ${num(ledger.cap)} cap in ${n} call${n === 1 ? '' : 's'}`];
  const by = PURPOSES.map((p) => [p, spentOf(ledger, p)]).filter(([, v]) => v > 0);
  if (by.length) parts.push(by.map(([p, v]) => `${p === 'test' ? 'tests' : p === 'sound' ? 'sounds' : p} ${num(v)}`).join(', '));
  parts.push(`${num(ledger.narrationHold)} held for the narration, so ${num(forSounds)} left for sounds and tests`);
  const last = lastRead(ledger);
  if (!last) parts.push('the account is not read yet');
  else if (n === 0 && !ledger.read) parts.push(`the account read ${num(ledger.baseline.used)} used of ${num(ledger.baseline.limit)} at ${ledger.baseline.at}, before any call`);
  else {
    const moved = last.used - ledger.baseline.used;
    const other = drift(ledger);
    const why = other === 0 ? 'the same as the calls cost' : other > 0 ? `${num(other)} more than the calls cost, spent by other use of the account` : `${num(-other)} less than the calls cost, because the account posts a call some seconds late`;
    parts.push(`the account read ${num(last.used)} used at ${last.at}, ${num(moved)} more than before the first call: ${why}`);
  }
  return parts.join('; ');
}
