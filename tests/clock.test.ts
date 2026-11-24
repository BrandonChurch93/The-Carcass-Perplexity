import { describe, it, expect } from 'vitest';

const load = (p: string): Promise<any> => import(p);
const core = await load('../tools/lib/clock-core.mjs');
const { config } = await load('../tools/lib/paths.mjs');

const budget = config().budget;
const H = 3600;
const BOOT = 'boot-a';
const OTHER_BOOT = 'boot-b';
const T0 = Date.parse('2031-03-04T05:06:07Z');
const at = (seconds: number) => new Date(T0 + seconds * 1000).toISOString().replace(/\.\d+Z$/, 'Z');

const order: string[] = Object.keys(budget.phaseHours).sort((a, b) => Number(a) - Number(b));
const boxOf = (k: string) => budget.phaseHours[k] * H;
const upTo = (k: string) => order.filter((p) => Number(p) <= Number(k)).reduce((a, p) => a + boxOf(p), 0);
const allowed = budget.runHours * H;
const pick = (list: string[], i: number): string => {
  const v = list.at(i);
  if (v === undefined) throw new Error('the budget has too few phases for this test');
  return v;
};
const first = pick(order, 0);
const last = pick(order, -1);
const reserved = Object.keys(budget.reserveHours ?? {});
const plain = order.filter((k) => !reserved.includes(k));

const started = () => core.start(core.emptyState(), at(0), BOOT);
const phaseAfter = (k: string, seconds: number) => core.tickPhase(started(), at(seconds), BOOT, k, budget);
const total = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

describe('what a tick adds', () => {
  it('adds nothing on --start, and the next tick counts from it', () => {
    const a = core.tickPhase(started(), at(600), BOOT, first, budget).state;
    const b = core.start(a, at(600 + 9 * H), BOOT);
    expect(b.phases).toEqual(a.phases);
    expect(b.reviewRounds).toEqual(a.reviewRounds);
    expect(b.extensions).toEqual(a.extensions);
    expect(b.ticks).toBe(a.ticks);
    const c = core.tickPhase(b, at(600 + 9 * H + 45), BOOT, first, budget);
    expect(c.added).toBe(45);
    expect(c.state.phases[first]).toBe(645);
  });

  it('adds nothing on the first tick of an empty clock', () => {
    const r = core.tickPhase(core.emptyState(), at(500), BOOT, first, budget);
    expect(r.added).toBe(0);
    expect(r.state.phases[first]).toBe(0);
  });

  it('adds nothing on a tick made on a new machine boot, then counts in full again', () => {
    const a = core.tickPhase(started(), at(300), BOOT, first, budget).state;
    const b = core.tickPhase(a, at(300 + 7 * H), OTHER_BOOT, first, budget);
    expect(b.added).toBe(0);
    expect(b.state.phases[first]).toBe(300);
    const c = core.tickPhase(b.state, at(300 + 7 * H + 120), OTHER_BOOT, first, budget);
    expect(c.added).toBe(120);
    expect(c.state.phases[first]).toBe(420);
  });

  it('adds nothing on a new boot to a review round or an extension', () => {
    const a = core.tickPhase(started(), at(300), BOOT, first, budget).state;
    expect(core.tickReviewRound(a, at(5000), OTHER_BOOT, 1, budget).added).toBe(0);
    expect(core.tickExtension(a, at(5000), OTHER_BOOT, 1, budget).added).toBe(0);
  });

  it('counts every other gap in full, in the phase that ticked', () => {
    const gaps = [1, 59, 3600, 7, 86399, 1234, 2];
    let s = started();
    let t = 0;
    const want: Record<string, number> = {};
    gaps.forEach((g, i) => {
      t += g;
      const k = pick(order, i % order.length);
      const r = core.tickPhase(s, at(t), BOOT, k, budget);
      expect(r.added).toBe(g);
      want[k] = (want[k] ?? 0) + g;
      s = r.state;
    });
    expect(s.phases).toEqual(want);
    expect(total(s.phases)).toBe(t);
    expect(s.ticks).toBe(gaps.length);
  });
});

describe('review rounds and extensions', () => {
  it('keeps the build, each review round and each extension apart', () => {
    let s = core.tickPhase(started(), at(100), BOOT, first, budget).state;
    s = core.tickReviewRound(s, at(300), BOOT, 1, budget).state;
    s = core.tickExtension(s, at(600), BOOT, 1, budget).state;
    s = core.tickReviewRound(s, at(650), BOOT, 2, budget).state;
    s = core.tickExtension(s, at(690), BOOT, 2, budget).state;
    const r = core.tickPhase(s, at(760), BOOT, first, budget);
    expect(r.state.phases).toEqual({ [first]: 170 });
    expect(r.state.reviewRounds).toEqual({ '1': 200, '2': 50 });
    expect(r.state.extensions).toEqual({ '1': 300, '2': 40 });
    expect(r.report.buildUsed).toBe(170);
    expect(r.report.phaseUsed).toBe(170);
  });

  it('leaves the lines of the build unchanged however long a review round or an extension runs', () => {
    const a = core.tickPhase(started(), at(60), BOOT, first, budget);
    let s = core.tickReviewRound(a.state, at(60 + 2 * allowed), BOOT, 1, budget).state;
    s = core.tickExtension(s, at(60 + 4 * allowed), BOOT, 1, budget).state;
    const b = core.reportPhase(s, at(60 + 4 * allowed), first, budget);
    expect(b.buildUsed).toBe(60);
    expect(b.budgetReportDue).toBe(false);
    expect(b.extraRounds).toBe(a.report.extraRounds);
    expect(b.halfPoint).toBe(false);
    expect(b.boxEnd).toBe(false);
  });

  const sides: [string, (...a: any[]) => any, number][] = [
    ['review round', core.tickReviewRound, budget.reviewRoundHours * H],
    ['extension', core.tickExtension, budget.extendHours * H]
  ];
  for (const [label, tick, box] of sides) {
    it(`switches extra rounds of a ${label} once its hours are used, and never prints the budget report`, () => {
      const before = tick(started(), at(box - 1), BOOT, 3, budget);
      expect(before.report.used).toBe(box - 1);
      expect(before.report.allowed).toBe(box);
      expect(core.linesSide(before.report)).toContain('extra rounds: yes');
      const on = tick(started(), at(box), BOOT, 3, budget);
      expect(core.linesSide(on.report)).toContain('extra rounds: no');
      const far = tick(started(), at(box + 2 * allowed), BOOT, 3, budget);
      const lines: string[] = core.linesSide(far.report);
      expect(lines).toContain('extra rounds: no');
      expect(lines[0]?.startsWith(`${label} 3: `)).toBe(true);
      expect(lines.some((l) => l.includes('budget report'))).toBe(false);
    });
  }
});

describe('the lines of a phase tick', () => {
  it('prints the time used and allowed for the phase and the build', () => {
    const r = phaseAfter(first, boxOf(first) / 4);
    const lines: string[] = core.linesPhase(r.report);
    expect(lines[0]).toBe(`phase ${first}: ${core.hours(boxOf(first) / 4)} h used of ${core.hours(boxOf(first))} h`);
    expect(lines[1]).toBe(`build: ${core.hours(boxOf(first) / 4)} h used of ${core.hours(allowed)} h`);
  });

  for (const k of plain) {
    it(`switches extra rounds in phase ${k} when the build reaches the sum of the boxes up to it`, () => {
      const edge = upTo(k);
      expect(core.linesPhase(phaseAfter(k, edge - 1).report)).toContain('extra rounds: yes');
      expect(core.linesPhase(phaseAfter(k, edge).report)).toContain('extra rounds: no');
    });
  }

  it('measures extra rounds on the time of the whole build, not of the phase', () => {
    const a = pick(plain, 0);
    const b = pick(plain, 1);
    const edge = upTo(b);
    const s = core.tickPhase(started(), at(edge - 1), BOOT, a, budget).state;
    expect(core.reportPhase(s, at(edge - 1), b, budget).extraRounds).toBe(true);
    const r = core.tickPhase(s, at(edge), BOOT, b, budget);
    expect(r.report.phaseUsed).toBe(1);
    expect(r.report.extraRounds).toBe(false);
  });

  for (const k of reserved) {
    it(`switches extra rounds in phase ${k} when the time left falls under its reserve`, () => {
      const reserve = budget.reserveHours[k] * H;
      const edge = allowed - reserve;
      expect(edge + 1).toBeLessThan(upTo(k));
      expect(core.linesPhase(phaseAfter(k, edge).report)).toContain('extra rounds: yes');
      expect(core.linesPhase(phaseAfter(k, edge + 1).report)).toContain('extra rounds: no');
      const none = { ...budget, reserveHours: {} };
      expect(core.tickPhase(started(), at(edge + 1), BOOT, k, none).report.extraRounds).toBe(true);
    });

    it(`applies the reserve of phase ${k} to no other phase`, () => {
      const reserve = budget.reserveHours[k] * H;
      const s = core.tickPhase(started(), at(allowed - reserve + 1), BOOT, k, budget).state;
      for (const p of plain) {
        const r = core.reportPhase(s, at(allowed - reserve + 1), p, budget);
        expect(r.extraRounds).toBe(allowed - reserve + 1 < upTo(p));
      }
    });
  }

  for (const k of order) {
    it(`prints half point and box end for phase ${k} at half and at all of its own box`, () => {
      const box = boxOf(k);
      const half = Math.ceil(box / 2);
      const l1: string[] = core.linesPhase(phaseAfter(k, half - 1).report);
      expect(l1).not.toContain('half point: reached');
      expect(l1).not.toContain('box end: reached');
      const l2: string[] = core.linesPhase(phaseAfter(k, half).report);
      expect(l2).toContain('half point: reached');
      expect(l2).not.toContain('box end: reached');
      const l3: string[] = core.linesPhase(phaseAfter(k, box - 1).report);
      expect(l3).toContain('half point: reached');
      expect(l3).not.toContain('box end: reached');
      const l4: string[] = core.linesPhase(phaseAfter(k, box).report);
      expect(l4).toContain('half point: reached');
      expect(l4).toContain('box end: reached');
    });
  }

  it('reads half point and box end from the phase itself, not from the build', () => {
    const a = pick(order, 0);
    const b = pick(order, 1);
    const s = core.tickPhase(started(), at(boxOf(a) + boxOf(b)), BOOT, a, budget).state;
    const r = core.reportPhase(s, at(boxOf(a) + boxOf(b)), b, budget);
    expect(r.phaseUsed).toBe(0);
    expect(r.halfPoint).toBe(false);
    expect(r.boxEnd).toBe(false);
  });

  it('prints the budget report once the build has used the time allowed', () => {
    const s = core.tickPhase(started(), at(1000), BOOT, first, budget).state;
    const before = core.tickPhase(s, at(allowed - 1), BOOT, last, budget);
    expect(before.report.buildUsed).toBe(allowed - 1);
    expect(core.linesPhase(before.report)).not.toContain('budget report: due');
    const on = core.tickPhase(s, at(allowed), BOOT, last, budget);
    expect(core.linesPhase(on.report)).toContain('budget report: due');
    expect(core.linesPhase(on.report)).toContain('extra rounds: no');
  });

  it('prints status overdue once the gap passes the limit', () => {
    const gap = budget.statusMaxGapMinutes * 60;
    const s = core.markStatus(started(), at(40));
    const on: string[] = core.linesPhase(core.tickPhase(s, at(40 + gap), BOOT, first, budget).report);
    expect(on.some((l) => l.includes('status overdue'))).toBe(false);
    expect(on).toContain(`minutes since the last status: ${budget.statusMaxGapMinutes}`);
    const past: string[] = core.linesPhase(core.tickPhase(s, at(40 + gap + 1), BOOT, first, budget).report);
    expect(past.some((l) => l.endsWith(', status overdue'))).toBe(true);
    const again = core.markStatus(core.tickPhase(s, at(40 + gap + 1), BOOT, first, budget).state, at(40 + gap + 1));
    const fresh: string[] = core.linesPhase(core.tickPhase(again, at(40 + gap + 2), BOOT, first, budget).report);
    expect(fresh.some((l) => l.includes('status overdue'))).toBe(false);
  });

  it('never calls a status overdue before the first one', () => {
    const lines: string[] = core.linesPhase(phaseAfter(first, 10 * budget.statusMaxGapMinutes * 60).report);
    expect(lines).toContain('minutes since the last status: no status yet');
    expect(lines.some((l) => l.includes('status overdue'))).toBe(false);
  });

  it('prints no em dash and no exclamation point', () => {
    const s = core.markStatus(started(), at(1));
    const lines: string[] = [
      ...core.linesPhase(core.tickPhase(s, at(allowed + 1), BOOT, last, budget).report),
      ...core.linesSide(core.tickReviewRound(s, at(allowed + 1), BOOT, 1, budget).report),
      ...core.linesSide(core.tickExtension(s, at(allowed + 1), BOOT, 1, budget).report)
    ];
    for (const l of lines) expect(/[\u2014!]/.test(l)).toBe(false);
  });
});

describe('--continue', () => {
  const done = order.slice(0, 3);
  const open = order.slice(3);
  const open0 = pick(open, 0);
  const open1 = pick(open, 1);
  const openHours = open.reduce((a, k) => a + budget.phaseHours[k], 0);
  const factor = budget.continueHours / openHours;
  const spent = allowed + 500;
  const before = () => core.tickPhase(started(), at(spent), BOOT, open0, budget).state;
  const gapToContinue = 5 * H;
  const continued = () => core.continueBuild(before(), at(spent + gapToContinue), BOOT, 1, budget, done);

  it('adds no time and counts nothing between the last tick and the continuation', () => {
    const s = continued();
    expect(s.phases).toEqual(before().phases);
    const r = core.tickPhase(s, at(spent + gapToContinue + 30), BOOT, open0, budget);
    expect(r.added).toBe(30);
  });

  it('gives the unfinished phases new boxes in proportion, and the finished ones none', () => {
    const c = continued().continuations[0];
    expect(c.n).toBe(1);
    expect(c.allowed).toBe(budget.continueHours * H);
    for (const k of done) expect(c.box[k]).toBe(0);
    for (const k of open) expect(c.box[k]).toBeCloseTo(budget.phaseHours[k] * factor * H, 6);
    for (const k of open) expect(c.box[k] / c.box[open0]).toBeCloseTo(budget.phaseHours[k] / budget.phaseHours[open0], 9);
    expect(total(c.box)).toBeCloseTo(budget.continueHours * H, 6);
  });

  it('scales the reserve of a phase by the same factor as its box', () => {
    const c = continued().continuations[0];
    for (const k of reserved) {
      if (done.includes(k)) expect(c.reserve[k]).toBeUndefined();
      else {
        expect(c.reserve[k]).toBeCloseTo(budget.reserveHours[k] * factor * H, 6);
        expect(c.reserve[k] / c.box[k]).toBeCloseTo(budget.reserveHours[k] / budget.phaseHours[k], 9);
      }
    }
  });

  it('measures every line from the start of the continuation against the new boxes', () => {
    const s = continued();
    const t = spent + gapToContinue;
    const zero = core.reportPhase(s, at(t), open0, budget);
    expect(zero.buildUsed).toBe(0);
    expect(zero.phaseUsed).toBe(0);
    expect(zero.buildUsedAll).toBe(spent);
    expect(zero.buildAllowed).toBe(budget.continueHours * H);
    expect(zero.extraRounds).toBe(true);
    expect(zero.halfPoint).toBe(false);
    expect(zero.boxEnd).toBe(false);
    expect(zero.budgetReportDue).toBe(false);

    const k = open0;
    const box = budget.phaseHours[k] * factor * H;
    const tick = (seconds: number) => core.linesPhase(core.tickPhase(s, at(t + seconds), BOOT, k, budget).report) as string[];
    expect(tick(Math.floor(box / 2) - 1)).not.toContain('half point: reached');
    expect(tick(Math.ceil(box / 2) + 1)).toContain('half point: reached');
    expect(tick(Math.floor(box) - 1)).not.toContain('box end: reached');
    expect(tick(Math.floor(box) - 1)).toContain('extra rounds: yes');
    expect(tick(Math.ceil(box) + 1)).toContain('box end: reached');
    expect(tick(Math.ceil(box) + 1)).toContain('extra rounds: no');
    expect(tick(budget.continueHours * H - 1)).not.toContain('budget report: due');
    expect(tick(budget.continueHours * H)).toContain('budget report: due');
  });

  it('switches extra rounds on the scaled reserve after a continuation', () => {
    const s = continued();
    const t = spent + gapToContinue;
    for (const k of reserved.filter((p) => open.includes(p))) {
      const edge = budget.continueHours * H - budget.reserveHours[k] * factor * H;
      const tick = (seconds: number) => core.tickPhase(s, at(t + seconds), BOOT, k, budget).report;
      expect(tick(Math.floor(edge) - 1).extraRounds).toBe(true);
      expect(tick(Math.ceil(edge) + 1).extraRounds).toBe(false);
    }
  });

  it('starts a second continuation from the time used at that moment', () => {
    const t = spent + gapToContinue;
    let s = core.tickPhase(continued(), at(t + 4000), BOOT, open1, budget).state;
    s = core.continueBuild(s, at(t + 9000), BOOT, 2, budget, [...done, open0]);
    expect(s.continuations).toHaveLength(2);
    expect(s.continuations[1].box[open0]).toBe(0);
    const r = core.tickPhase(s, at(t + 9100), BOOT, open1, budget).report;
    expect(r.buildUsed).toBe(100);
    expect(r.phaseUsed).toBe(100);
    expect(r.buildUsedAll).toBe(spent + 4100);
  });

  it('switches box end on the exact second of a new box (fault: continueBuild keeps float error in its boxes)', () => {
    for (let n = 0; n < order.length; n++) {
      const finished = order.slice(0, n);
      const rest = order.slice(n);
      const hoursOpen = rest.reduce((a, k) => a + budget.phaseHours[k], 0);
      const base = core.continueBuild(started(), at(0), BOOT, 1, budget, finished);
      for (const k of rest) {
        const exact = (budget.phaseHours[k] * budget.continueHours * H) / hoursOpen;
        if (!Number.isInteger(exact)) continue;
        expect(core.tickPhase(base, at(exact), BOOT, k, budget).report.boxEnd).toBe(true);
        expect(core.tickPhase(base, at(exact - 1), BOOT, k, budget).report.boxEnd).toBe(false);
      }
    }
  });
});
