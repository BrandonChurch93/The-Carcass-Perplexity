export const STAND_IN = 'stand-in';
export const FINISHED = 'finished';
// The solo view draws nothing but the part, on black. Grain lifts that black by a level or two, never past this.
export const GROUND_LEVEL = 6;

const ROW = /^\|\s*`([a-z0-9-]+)`\s*\|\s*(\d+)\s*\|\s*(not started|in progress|finished)\s*\|\s*(\d+)\s*\|/;

export function unitStates(progress) {
  const out = [];
  for (const line of String(progress ?? '').split('\n')) {
    const m = ROW.exec(line);
    if (m) out.push({ unit: m[1], phase: Number(m[2]), state: m[3], rounds: Number(m[4]) });
  }
  return out;
}

export function unitList(value) {
  if (value === undefined || value === null || value === true) return [];
  return [...new Set((Array.isArray(value) ? value : [value]).flatMap((v) => String(v).split(',')).map((s) => s.trim()).filter(Boolean))];
}

// With a unit named, G13 covers what the kit says a round covers. With none named it is the gate
// that closes a phase, and covers what kit/08-BUILD-ORDER.md names for that phase.
export function coverage({ phase, asked = [], states = [], units }) {
  const film = units[units.length - 1].id;
  for (const a of asked) if (!units.some((u) => u.id === a)) throw new Error(`No such unit: ${a}`);
  const why = new Map();
  const add = (id, reason) => {
    if (!why.has(id)) why.set(id, reason);
  };
  for (const a of asked) add(a, 'the unit under judgement');
  if (!asked.length) for (const u of units) if (u.phase <= phase) add(u.id, `a unit of Phase ${u.phase}, and the gate of Phase ${phase} named no unit`);
  for (const s of states) if (s.state === FINISHED && units.some((u) => u.id === s.unit)) add(s.unit, 'marked finished in kit/PROGRESS.md');
  const row = states.find((s) => s.unit === film);
  if (row && row.rounds > 0) add(film, `a round on ${film} has been run`);
  const all = why.has(film);
  return { all, units: units.map((u) => u.id).filter((id) => why.has(id)), why: Object.fromEntries(why), film };
}

export function coveredParts(register, cover) {
  return (register?.parts ?? []).filter((p) => cover.all || cover.units.includes(p.unit));
}

export function coverageLine(cover, count) {
  if (cover.all) return `G13 covers every part there is, ${count} of them, because ${cover.film} is ${cover.why[cover.film]}.`;
  if (!cover.units.length) return 'G13 covers no part: no unit is under judgement and none is marked finished in kit/PROGRESS.md.';
  return `G13 covers ${count} ${count === 1 ? 'part' : 'parts'}: ${cover.units.map((u) => `${u} (${cover.why[u]})`).join(', ')}.`;
}

// The judged frames that show a unit: its own entries of the judged list, the entries of the
// whole film that fall inside its place, and the judged loop frames when the loop is made of it.
export function judgedFramesOf(list, cut, unit, { film, loopUnit }) {
  const place = (cut.places ?? []).find((p) => p.unit === unit) ?? null;
  const seen = new Set();
  const out = [];
  for (const e of list) {
    if (Number.isInteger(e.frame)) {
      const mine = e.unit === unit || (e.unit === film && place !== null && e.frame >= place.first && e.frame <= place.last);
      if (!mine || seen.has(`f${e.frame}`)) continue;
      seen.add(`f${e.frame}`);
      out.push({ id: e.id, frame: e.frame });
    } else if (Number.isInteger(e.loop) && (unit === loopUnit || unit === film)) {
      if (seen.has(`l${e.loop}`)) continue;
      seen.add(`l${e.loop}`);
      out.push({ id: e.id, loop: e.loop });
    }
  }
  return out;
}

export const frameName = (at) => (Number.isInteger(at.loop) ? `loop frame ${at.loop}` : `frame ${at.frame}`) + (at.id ? ` (${at.id})` : '');

const lit = (d, i, level) => d[i] > level || d[i + 1] > level || d[i + 2] > level;

export function coveredPixels(data, { channels = 3, level = GROUND_LEVEL } = {}) {
  let n = 0;
  for (let i = 0; i < data.length; i += channels) if (lit(data, i, level)) n++;
  return n;
}

export function maskedMeanDifference(a, b, { channels = 3, level = GROUND_LEVEL } = {}) {
  if (a.length !== b.length) throw new Error(`The two pictures are not the same size: ${a.length} and ${b.length} bytes.`);
  let pixels = 0;
  let sum = 0;
  for (let i = 0; i < a.length; i += channels) {
    if (!lit(a, i, level) && !lit(b, i, level)) continue;
    pixels++;
    sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  }
  return { pixels, total: a.length / channels, mean: pixels ? sum / (3 * pixels) : null };
}

const levels = (v) => v.toFixed(2);
const percent = (share) => `${(share * 100).toFixed(share < 0.001 ? 3 : 1)} percent`;

// One part, the four tests. `seen` is what the runner measured: live is the part as the page
// draws it now, flagged the judged frames whose standins view flags it, listed whether
// info().standIns names it, picture what the comparison with the reference gave.
export function partFaults(part, seen, { min }) {
  const faults = [];
  const fail = (n, words) => faults.push({ part: part.id, test: n, line: `${part.id} fails test ${n}: ${words}` });
  if (part.state === STAND_IN) fail(1, 'the register still lists it as a stand-in.');
  else if (part.state !== 'built' && part.state !== 'fallback') fail(1, `the register gives it the state ${part.state}, which is none of built and fallback.`);
  if (part.standIn) {
    const now = seen.hashNow ?? part.hash;
    if (!part.standIn.hash) fail(2, 'the register holds no hash from when it was a stand-in, so the two cannot be told apart.');
    else if (now === part.standIn.hash) fail(2, `the hash of its files, ${now}, is the hash recorded when it was a stand-in.`);
    else if (seen.live?.state === STAND_IN) fail(2, `its files as they are today, hash ${now}, still draw it as a stand-in, so that is the hash of a stand-in.`);
  }
  if (part.missing || !seen.live) fail(3, 'the register lists it and the page does not draw it, so its pixels cannot be judged. Nothing leaves the register but a transition that ends as a plain cut.');
  else {
    const words = [];
    const flagged = seen.flagged ?? [];
    if (flagged.length) {
      const worst = flagged.reduce((a, b) => (b.share > a.share ? b : a));
      words.push(`the standins view flags it in ${flagged.length} of ${seen.frames} judged ${seen.frames === 1 ? 'frame' : 'frames'}, most at ${frameName(worst)}, ${percent(worst.share)} of the frame`);
    } else if (seen.live.state === STAND_IN) words.push(`the page draws it through its stand-in code, though none of the ${seen.frames} judged frames shows a pixel of it`);
    if (seen.listed) words.push('the page lists it in info().standIns');
    if (words.length) fail(3, `${words.join(', and ')}.`);
  }
  if (part.standIn && !part.missing && seen.live) {
    const p = seen.picture ?? {};
    if (!part.standIn.picture) {
      if (part.standIn.shown !== 0) fail(4, 'the register holds no reference picture of it as a stand-in. Run npm run parts.');
    } else if (p.missing) fail(4, `its reference picture ${part.standIn.picture} is not there.`);
    else if (p.error) fail(4, `its picture could not be compared with the reference: ${p.error}`);
    else if (p.mean === null || p.mean === undefined) fail(4, `it covers no pixel at frame ${part.standIn.frame}, in the reference or now, so nothing can be compared.`);
    else if (!(p.mean > min)) fail(4, `its picture at frame ${part.standIn.frame} differs from the reference by a mean of ${levels(p.mean)} levels over the ${p.pixels} pixels it covers, and more than ${min} is needed.`);
  }
  return faults;
}

export function unseen(parts) {
  return parts.filter((p) => p.standIn && !p.standIn.picture && p.standIn.shown === 0).map((p) => p.id);
}

export function strangers(live, register) {
  const known = new Set((register?.parts ?? []).map((p) => p.id));
  return live.filter((l) => !known.has(l.id)).map((l) => l.id);
}

export function countLine(parts, faults) {
  const failing = new Set(faults.map((f) => f.part));
  if (!failing.size) return `All ${parts.length} covered parts pass.`;
  const by = [1, 2, 3, 4].map((n) => [n, new Set(faults.filter((f) => f.test === n).map((f) => f.part)).size]).filter(([, c]) => c > 0);
  return `${failing.size} of ${parts.length} covered parts fail: ${by.map(([n, c]) => `${c} test ${n}`).join(', ')}.`;
}
