// @ts-nocheck
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as core from '../tools/lib/credits-core.mjs';
import * as credits from '../tools/lib/credits.mjs';
import { creditsCommand } from '../tools/credits.mjs';
import { config } from '../tools/lib/paths.mjs';

const cfg = config();
const HANDLE = 'custom-cred:test-handle';
const AT = '2026-11-25T18:00:00Z';
const CAP = { cap: 17000, narrationHold: 3000 };

function ledgerWith(spent: number[], purpose = 'sound') {
  const ledger = core.empty(CAP);
  ledger.baseline = { at: AT, used: 1000, limit: 131000 };
  let used = 1000;
  spent.forEach((s, i) => {
    ledger.calls.push(core.entry({ at: AT, tool: 'sound', purpose, id: `cue-${i} take 1`, estimate: s, before: used, after: used + s, ok: true, seconds: s / 40 }));
    used += s;
  });
  return ledger;
}

function account({ used = 1000, limit = 131000, cost = 800, failAfter = false, slow = 0 } = {}) {
  const calls: string[][] = [];
  let reads = 0;
  let pending = 0;
  const run = (argv: string[]) => {
    calls.push(argv);
    if (argv[argv.length - 1].endsWith('/user/subscription')) {
      reads++;
      if (failAfter && reads > 1) return { status: 7, stdout: '', stderr: 'curl: (7) could not connect' };
      if (pending > 0 && slow > 0) slow--;
      else {
        used += pending;
        pending = 0;
      }
      return { status: 0, stdout: JSON.stringify({ character_count: used, character_limit: limit }), stderr: '' };
    }
    return { status: 0, stdout: '200', stderr: '' };
  };
  const spend = () => {
    pending += cost;
  };
  return { calls, run, spend, reads: () => reads };
}

function freshRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'carcass-credits-'));
}

const ctxOf = (root: string, a: ReturnType<typeof account>) => ({ root, cfg, runner: a.run, env: { CARCASS_ELEVEN_HANDLE: HANDLE }, now: () => AT });

describe('the cap from the note of 2026-11-25', () => {
  it('is in the config: 17,000 in all, 3,000 of it held for the narration, 2 takes of a sound and 3 of a clip', () => {
    expect(cfg.credits).toEqual(CAP);
    expect(cfg.audio.maxTakesPerCue).toBe(2);
    expect(cfg.narration.maxTakesPerClip).toBe(3);
  });

  it('lets a sound or a test spend up to the cap less the hold, and the narration up to the cap', () => {
    const ledger = ledgerWith([13000, 600]);
    expect(core.spentOf(ledger)).toBe(13600);
    expect(core.room({ ledger, purpose: 'sound', estimate: 400 })).toEqual({ ok: true, spent: 13600, limit: 14000, left: 400, estimate: 400 });
    expect(core.room({ ledger, purpose: 'sound', estimate: 401 }).ok).toBe(false);
    expect(core.room({ ledger, purpose: 'test', estimate: 401 }).ok).toBe(false);
    expect(core.room({ ledger, purpose: 'narration', estimate: 3400 }).ok).toBe(true);
    expect(core.room({ ledger, purpose: 'narration', estimate: 3401 }).ok).toBe(false);
    expect(core.room({ ledger, purpose: 'narration', estimate: 0.2 }).estimate).toBe(1);
    expect(() => core.room({ ledger, purpose: 'music', estimate: 1 })).toThrow(/is not one of sound, narration, test/);
  });

  it('never reports room below nothing once the cap is passed', () => {
    const ledger = ledgerWith([14000, 200]);
    expect(core.room({ ledger, purpose: 'sound', estimate: 1 })).toMatchObject({ ok: false, left: 0 });
    expect(core.room({ ledger, purpose: 'narration', estimate: 2800 }).ok).toBe(true);
  });

  it('says what a refused call would have cost, in one line', () => {
    const ledger = ledgerWith([13900]);
    const r = core.room({ ledger, purpose: 'sound', estimate: 800 });
    expect(core.refusal(r, { purpose: 'sound', id: 'ribs-bed take 1' })).toBe('ribs-bed take 1 was not made. It would cost about 800 credits, 13,900 are spent, and the cap leaves 100 for a sound call after the part held for the narration. Nothing was sent.');
  });
});

describe('the count', () => {
  it('counts a call by the cost its answer states, and by how far the account moved when the answer states none', () => {
    expect(core.entry({ at: AT, tool: 'sound', purpose: 'sound', id: 'a', estimate: 800, before: 10, after: 236, ok: true, header: 220 })).toMatchObject({ spent: 220, moved: 226 });
    expect(core.entry({ at: AT, tool: 'sound', purpose: 'sound', id: 'a', estimate: 800, before: 10, after: 10, ok: true, header: 220 })).toMatchObject({ spent: 220, moved: 0 });
    expect(core.entry({ at: AT, tool: 'sound', purpose: 'sound', id: 'a', estimate: 799.2, before: 10, after: 810, ok: true }).spent).toBe(800);
    expect(core.entry({ at: AT, tool: 'sound', purpose: 'sound', id: 'a', estimate: 800, before: 810, after: 10, ok: true }).spent).toBe(0);
    expect(core.entry({ at: AT, tool: 'sound', purpose: 'sound', id: 'a', estimate: 800, before: 10, after: 40, ok: false, header: 220 }).spent).toBe(30);
    expect(() => core.entry({ at: AT, tool: 'sound', purpose: 'sound', id: 'a', estimate: 1, before: 1.5, after: 2, ok: true })).toThrow(/whole numbers/);
  });

  it('finds what the account moved by that no call of the Builder explains', () => {
    const ledger = ledgerWith([800, 320]);
    expect(core.drift(ledger)).toBe(0);
    ledger.calls[1].after += 50;
    expect(core.drift(ledger)).toBe(50);
    expect(core.line(ledger)).toContain('50 more than the calls cost, spent by other use of the account');
    ledger.read = { at: AT, used: 2000 };
    expect(core.lastRead(ledger)).toEqual({ at: AT, used: 2000 });
    expect(core.drift(ledger)).toBe(-120);
    expect(core.line(ledger)).toContain('120 less than the calls cost, because the account posts a call some seconds late');
  });

  it('measures the credits of a second of sound from the calls that returned sound', () => {
    const ledger = ledgerWith([800, 320]);
    expect(core.perSecond(ledger)).toEqual({ calls: 2, seconds: 28, spent: 1120, perSecond: 40 });
    expect(core.perSecond(core.empty(CAP))).toBe(null);
  });

  it('writes the one line for the progress file and the statuses', () => {
    const none = core.empty(CAP);
    expect(core.line(none)).toBe('0 spent of the 17,000 cap in 0 calls; 3,000 held for the narration, so 14,000 left for sounds and tests; the account is not read yet');
    const ledger = ledgerWith([800, 320]);
    expect(core.line(ledger)).toBe(`1,120 spent of the 17,000 cap in 2 calls; sounds 1,120; 3,000 held for the narration, so 12,880 left for sounds and tests; the account read 2,120 used at ${AT}, 1,120 more than before the first call: the same as the calls cost`);
  });

  it('refuses a ledger it cannot read', () => {
    expect(() => core.check({ schema: 'other' })).toThrow(/is not carcass\/credits 1/);
    expect(() => core.empty({ cap: 10, narrationHold: 11 })).toThrow(/no more than the cap/);
  });
});

describe('a call through the ledger', () => {
  it('reads the account before and after, and writes the call with both counts', () => {
    const root = freshRoot();
    const a = account({ used: 1079, cost: 812 });
    const ctx = ctxOf(root, a);
    const open = credits.begin(ctx, { tool: 'sound', purpose: 'sound', id: 'ribs-bed take 1', estimate: 800, seconds: 20 });
    expect(open.before).toBe(1079);
    a.spend();
    const made = credits.end(ctx, open, { ok: true, header: 800, waitMs: 0 });
    expect(made).toMatchObject({ before: 1079, after: 1891, moved: 812, spent: 800, header: 800, seconds: 20, afterRead: 'read', ok: true });
    expect(a.reads()).toBe(2);
    const onDisk = JSON.parse(fs.readFileSync(path.join(root, core.LEDGER), 'utf8'));
    expect(onDisk.schema).toBe(core.SCHEMA);
    expect(onDisk.spent).toBe(800);
    expect(onDisk.baseline).toEqual({ at: AT, used: 1079, limit: 131000 });
    expect(onDisk.calls).toHaveLength(1);
    expect(credits.lineOf(root, cfg)).toContain('800 spent of the 17,000 cap in 1 call;');
    expect(credits.lineOf(root, cfg)).toContain('12 more than the calls cost, spent by other use of the account');
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('reads again when a call returned sound and the count has not moved yet', () => {
    const root = freshRoot();
    const a = account({ used: 100, cost: 320, slow: 2 });
    const ctx = ctxOf(root, a);
    const open = credits.begin(ctx, { tool: 'sound', purpose: 'sound', id: 'ribs-event take 1', estimate: 320, seconds: 8 });
    a.spend();
    const made = credits.end(ctx, open, { ok: true, waitMs: 0 });
    expect(made.spent).toBe(320);
    expect(a.reads()).toBe(4);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('counts by the cost in the answer when the account has not posted the call by the end of the wait, and says so', () => {
    const root = freshRoot();
    const a = account({ used: 2426, cost: 220, slow: 99 });
    const ctx = ctxOf(root, a);
    const open = credits.begin(ctx, { tool: 'sound', purpose: 'sound', id: 'heart-bed take 1', estimate: 800, seconds: 20 });
    a.spend();
    const made = credits.end(ctx, open, { ok: true, header: 220, waitMs: 0, tries: 3 });
    expect(made).toMatchObject({ before: 2426, after: 2426, moved: 0, spent: 220 });
    expect(made.afterRead).toBe('read 3 times over 0 s, and the account had not posted the whole call yet');
    expect(a.reads()).toBe(4);
    expect(credits.lineOf(root, cfg)).toContain('220 less than the calls cost, because the account posts a call some seconds late');
    const later = account({ used: 2646 });
    const ledger = credits.read({ ...ctx, runner: later.run });
    expect(ledger.read).toEqual({ at: AT, used: 2646 });
    expect(credits.lineOf(root, cfg)).toContain('220 more than before the first call: the same as the calls cost');
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('writes a failed call too, with what the account says it cost', () => {
    const root = freshRoot();
    const a = account({ used: 100 });
    const ctx = ctxOf(root, a);
    const open = credits.begin(ctx, { tool: 'sound', purpose: 'sound', id: 'ribs-life take 1', estimate: 320, seconds: 8 });
    const made = credits.end(ctx, open, { ok: false, waitMs: 0 });
    expect(made).toMatchObject({ ok: false, spent: 0, before: 100, after: 100 });
    expect(a.reads()).toBe(2);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('counts the cost in the answer when the account cannot be read after the call', () => {
    const root = freshRoot();
    const a = account({ used: 100, failAfter: true });
    const ctx = ctxOf(root, a);
    const open = credits.begin(ctx, { tool: 'sound', purpose: 'sound', id: 'heart-bed take 1', estimate: 800, seconds: 20 });
    const made = credits.end(ctx, open, { ok: true, header: 790, waitMs: 0 });
    expect(made).toMatchObject({ spent: 790, after: 890 });
    expect(made.afterRead).toMatch(/could not be read after the call, so the cost in the answer was counted/);
    const ctx2 = { ...ctx, runner: account({ used: 890, failAfter: true }).run };
    const open2 = credits.begin(ctx2, { tool: 'sound', purpose: 'sound', id: 'heart-event take 1', estimate: 280, seconds: 7 });
    const made2 = credits.end(ctx2, open2, { ok: true, waitMs: 0 });
    expect(made2.spent).toBe(280);
    expect(made2.afterRead).toMatch(/so the estimate was counted/);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('refuses the call that would pass the cap, after one read of the account and with nothing sent', () => {
    const root = freshRoot();
    fs.mkdirSync(path.dirname(path.join(root, core.LEDGER)), { recursive: true });
    fs.writeFileSync(path.join(root, core.LEDGER), JSON.stringify(ledgerWith([13000, 700])));
    const a = account({ used: 14700 });
    const ctx = ctxOf(root, a);
    expect(() => credits.begin(ctx, { tool: 'sound', purpose: 'sound', id: 'eye-bed take 1', estimate: 800, seconds: 20 })).toThrow(credits.CapError);
    expect(() => credits.begin(ctx, { tool: 'sound', purpose: 'sound', id: 'eye-bed take 1', estimate: 800, seconds: 20 })).toThrow(/eye-bed take 1 was not made\. It would cost about 800 credits, 13,700 are spent, and the cap leaves 300 for a sound call after the part held for the narration\. Nothing was sent\./);
    expect(a.calls.every((c) => c[c.length - 1].endsWith('/user/subscription'))).toBe(true);
    const open = credits.begin(ctx, { tool: 'voice', purpose: 'narration', id: 'n1 take 1', estimate: 800 });
    expect(open.before).toBe(14700);
    expect(JSON.parse(fs.readFileSync(path.join(root, core.LEDGER), 'utf8')).calls).toHaveLength(2);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('fails plainly with no handle and when the account cannot be read', () => {
    const root = freshRoot();
    const a = account();
    expect(() => credits.begin({ root, cfg, runner: a.run, env: {} }, { tool: 'sound', purpose: 'sound', id: 'x', estimate: 1 })).toThrow(/no handle/);
    const dead = () => ({ status: 7, stdout: '', stderr: 'curl: (7) could not connect' });
    expect(() => credits.begin({ root, cfg, runner: dead, env: { CARCASS_ELEVEN_HANDLE: HANDLE } }, { tool: 'sound', purpose: 'sound', id: 'x', estimate: 1 })).toThrow(/the account could not be read/);
    expect(a.calls).toHaveLength(0);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('waits out a busy account and reads it again, and gives up plainly when it stays busy', () => {
    const root = freshRoot();
    const busy = JSON.stringify({ detail: { type: 'rate_limit_error', code: 'rate_limited', message: 'You have made too many requests. Please try again later.' } });
    let reads = 0;
    const twice = () => (++reads <= 2 ? { status: 0, stdout: busy, stderr: '' } : { status: 0, stdout: JSON.stringify({ character_count: 1200, character_limit: 131000 }), stderr: '' });
    const open = credits.begin({ root, cfg, runner: twice, env: { CARCASS_ELEVEN_HANDLE: HANDLE }, now: () => AT, readWaitMs: 0 }, { tool: 'sound', purpose: 'sound', id: 'x take 1', estimate: 66 });
    expect(open.before).toBe(1200);
    expect(reads).toBe(3);
    let asked = 0;
    const always = () => {
      asked++;
      return { status: 0, stdout: busy, stderr: '' };
    };
    expect(() => credits.begin({ root, cfg, runner: always, env: { CARCASS_ELEVEN_HANDLE: HANDLE }, now: () => AT, readWaitMs: 0, readTries: 4 }, { tool: 'sound', purpose: 'sound', id: 'y take 1', estimate: 66 })).toThrow(/the account could not be read/);
    expect(asked).toBe(4);
    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe('npm run credits', () => {
  it('writes the count before any call once, and prints the line with no handle in it', () => {
    const root = freshRoot();
    const a = account({ used: 1079 });
    const lines: string[] = [];
    const deps = { root, cfg, runner: a.run, env: { CARCASS_ELEVEN_HANDLE: HANDLE }, print: (l: string) => lines.push(l), now: () => AT };
    creditsCommand({ _: [], baseline: true }, deps);
    creditsCommand({ _: [], baseline: true }, deps);
    expect(a.reads()).toBe(1);
    creditsCommand({ _: [], status: true }, deps);
    expect(lines[2]).toBe(`credits: 0 spent of the 17,000 cap in 0 calls; 3,000 held for the narration, so 14,000 left for sounds and tests; the account read 1,079 used of 131,000 at ${AT}, before any call`);
    creditsCommand({ _: [], read: true }, deps);
    expect(lines[3]).toBe(`credits: 0 spent of the 17,000 cap in 0 calls; 3,000 held for the narration, so 14,000 left for sounds and tests; the account read 1,079 used at ${AT}, 0 more than before the first call: the same as the calls cost`);
    expect(lines.join('\n')).not.toContain(HANDLE);
    expect(() => creditsCommand({ _: [] }, deps)).toThrow(/usage: npm run credits/);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
