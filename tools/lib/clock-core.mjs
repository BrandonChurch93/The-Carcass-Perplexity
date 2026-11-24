const H = 3600;

export function emptyState() {
  return {
    version: 1,
    bootId: null,
    last: null,
    lastStatus: null,
    phases: {},
    continuations: [],
    reviewRounds: {},
    extensions: {},
    ticks: 0
  };
}

const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const sec = (a, b) => Math.max(0, (Date.parse(b) - Date.parse(a)) / 1000);

export function start(state, now, bootId) {
  const s = structuredClone(state);
  s.bootId = bootId;
  s.last = { at: now, kind: 'start' };
  return s;
}

function gap(state, now, bootId) {
  if (!state.last || state.bootId !== bootId) return 0;
  return sec(state.last.at, now);
}

function boxes(state, budget) {
  const c = state.continuations[state.continuations.length - 1];
  if (!c) {
    return {
      box: Object.fromEntries(Object.entries(budget.phaseHours).map(([k, v]) => [k, v * H])),
      reserve: Object.fromEntries(Object.entries(budget.reserveHours ?? {}).map(([k, v]) => [k, v * H])),
      allowed: budget.runHours * H,
      base: Object.fromEntries(Object.keys(budget.phaseHours).map((k) => [k, 0])),
      baseTotal: 0
    };
  }
  return { box: c.box, reserve: c.reserve, allowed: c.allowed, base: c.base, baseTotal: c.baseTotal };
}

export function tickPhase(state, now, bootId, phase, budget) {
  const s = structuredClone(state);
  const add = gap(s, now, bootId);
  const k = String(phase);
  s.phases[k] = (s.phases[k] ?? 0) + add;
  s.bootId = bootId;
  s.last = { at: now, kind: 'tick', what: `phase ${k}` };
  s.ticks += 1;
  return { state: s, added: add, report: reportPhase(s, now, phase, budget) };
}

export function reportPhase(state, now, phase, budget) {
  const k = String(phase);
  const b = boxes(state, budget);
  const totalAll = sum(state.phases);
  const used = totalAll - b.baseTotal;
  const phaseUsed = (state.phases[k] ?? 0) - (b.base[k] ?? 0);
  const box = b.box[k] ?? 0;
  const order = Object.keys(budget.phaseHours).map(Number).sort((x, y) => x - y);
  const upTo = order.filter((p) => p <= Number(phase)).reduce((a, p) => a + (b.box[String(p)] ?? 0), 0);
  const left = b.allowed - used;
  let extra = used < upTo;
  if (b.reserve[k] !== undefined && left < b.reserve[k]) extra = false;
  const sinceStatus = state.lastStatus ? sec(state.lastStatus, now) / 60 : null;
  return {
    phase: Number(phase),
    phaseUsed,
    phaseAllowed: box,
    buildUsed: used,
    buildUsedAll: totalAll,
    buildAllowed: b.allowed,
    extraRounds: extra,
    halfPoint: box > 0 && phaseUsed >= box / 2,
    boxEnd: box > 0 && phaseUsed >= box,
    budgetReportDue: used >= b.allowed,
    minutesSinceStatus: sinceStatus,
    statusOverdue: sinceStatus !== null && sinceStatus > budget.statusMaxGapMinutes
  };
}

function tickSide(state, now, bootId, bucket, n, allowedHours, label) {
  const s = structuredClone(state);
  const add = gap(s, now, bootId);
  const k = String(n);
  s[bucket][k] = (s[bucket][k] ?? 0) + add;
  s.bootId = bootId;
  s.last = { at: now, kind: 'tick', what: `${label} ${k}` };
  s.ticks += 1;
  const used = s[bucket][k];
  const sinceStatus = s.lastStatus ? sec(s.lastStatus, now) / 60 : null;
  return {
    state: s,
    added: add,
    report: { label, n: Number(n), used, allowed: allowedHours * H, extraRounds: used < allowedHours * H, minutesSinceStatus: sinceStatus }
  };
}

export const tickReviewRound = (state, now, bootId, n, budget) =>
  tickSide(state, now, bootId, 'reviewRounds', n, budget.reviewRoundHours, 'review round');

export const tickExtension = (state, now, bootId, n, budget) =>
  tickSide(state, now, bootId, 'extensions', n, budget.extendHours, 'extension');

export function continueBuild(state, now, bootId, n, budget, donePhases) {
  const s = structuredClone(state);
  const done = new Set(donePhases.map(String));
  const open = Object.keys(budget.phaseHours).filter((k) => !done.has(k));
  const openSum = open.reduce((a, k) => a + budget.phaseHours[k], 0);
  const factor = openSum > 0 ? budget.continueHours / openSum : 0;
  const box = {};
  const reserve = {};
  for (const k of Object.keys(budget.phaseHours)) box[k] = done.has(k) ? 0 : budget.phaseHours[k] * factor * H;
  for (const [k, v] of Object.entries(budget.reserveHours ?? {})) if (!done.has(k)) reserve[k] = v * factor * H;
  const base = {};
  for (const k of Object.keys(budget.phaseHours)) base[k] = s.phases[k] ?? 0;
  s.continuations.push({ n: Number(n), at: now, box, reserve, allowed: budget.continueHours * H, base, baseTotal: sum(s.phases) });
  s.bootId = bootId;
  s.last = { at: now, kind: 'start', what: `continuation ${n}` };
  return s;
}

export function markStatus(state, now) {
  const s = structuredClone(state);
  s.lastStatus = now;
  return s;
}

export const hours = (seconds) => (seconds / H).toFixed(2);

export function linesPhase(r) {
  const out = [];
  out.push(`phase ${r.phase}: ${hours(r.phaseUsed)} h used of ${hours(r.phaseAllowed)} h`);
  out.push(`build: ${hours(r.buildUsed)} h used of ${hours(r.buildAllowed)} h`);
  out.push(`extra rounds: ${r.extraRounds ? 'yes' : 'no'}`);
  if (r.halfPoint) out.push('half point: reached');
  if (r.boxEnd) out.push('box end: reached');
  if (r.budgetReportDue) out.push('budget report: due');
  if (r.minutesSinceStatus === null) out.push('minutes since the last status: no status yet');
  else out.push(`minutes since the last status: ${r.minutesSinceStatus.toFixed(0)}${r.statusOverdue ? ', status overdue' : ''}`);
  return out;
}

export function linesSide(r) {
  const out = [];
  out.push(`${r.label} ${r.n}: ${hours(r.used)} h used of ${hours(r.allowed)} h`);
  out.push(`extra rounds: ${r.extraRounds ? 'yes' : 'no'}`);
  if (r.minutesSinceStatus !== null) out.push(`minutes since the last status: ${r.minutesSinceStatus.toFixed(0)}`);
  return out;
}
