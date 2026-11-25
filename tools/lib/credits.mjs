import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson, writeJson, utc } from './paths.mjs';
import { readHandle, subscription, spawnRunner, HANDLE_ENV, HANDLE_FILE } from './eleven.mjs';
import * as progress from './progress.mjs';
import * as core from './credits-core.mjs';

const AFTER_TRIES = 8;
const AFTER_WAIT_MS = 6000;
const READ_TRIES = 5;
const READ_WAIT_MS = 8000;
const BUSY = /rate_limit|too many requests/i;
const wait = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const file = (root) => path.join(root, core.LEDGER);

export class CapError extends Error {}

export function capOf(cfg) {
  const c = cfg.credits;
  if (!c || !Number.isInteger(c.cap) || !Number.isInteger(c.narrationHold)) return null;
  return { cap: c.cap, narrationHold: c.narrationHold };
}

export function load(root, cfg) {
  const cap = capOf(cfg);
  if (!fs.existsSync(file(root))) return cap ? core.empty(cap) : null;
  const ledger = core.check(readJson(file(root)));
  return cap ? { ...ledger, ...cap } : ledger;
}

export function save(root, ledger) {
  fs.mkdirSync(path.dirname(file(root)), { recursive: true });
  writeJson(file(root), { ...ledger, spent: core.spentOf(ledger) });
  if (path.resolve(root) === path.resolve(ROOT)) {
    try {
      progress.write(progress.setLine(core.PROGRESS_KEY, core.line(ledger)));
    } catch {
      // the line is added to PROGRESS by hand once; without it the ledger still holds the count
    }
  }
}

function account(ctx) {
  const handle = readHandle({ env: ctx.env ?? process.env, root: ctx.root });
  if (!handle) throw new Error(`no handle. Set ${HANDLE_ENV} or write it as the one line of ${HANDLE_FILE}`);
  // The account answers "too many requests" when it is read too often, so a busy answer is waited out and asked again.
  const tries = ctx.readTries ?? READ_TRIES;
  const waitMs = ctx.readWaitMs ?? READ_WAIT_MS;
  let sub = null;
  for (let i = 0; i < tries; i++) {
    sub = subscription({ handle, runner: ctx.runner ?? spawnRunner });
    if (sub.ok || !BUSY.test(sub.why)) break;
    if (i < tries - 1 && waitMs > 0) wait(waitMs);
  }
  if (!sub.ok) throw new Error(`the account could not be read: ${sub.why}`);
  return { handle, sub };
}

// Read the account and write it as the count before any call. Done once, when the cap begins.
export function baseline(ctx) {
  const ledger = load(ctx.root, ctx.cfg);
  if (!ledger) throw new Error('credits: the config holds no credits.cap, so there is no cap to count against');
  if (ledger.baseline) return ledger;
  const { sub } = account(ctx);
  ledger.baseline = { at: (ctx.now ?? utc)(), used: sub.character_count, limit: sub.character_limit };
  save(ctx.root, ledger);
  return ledger;
}

// Before a call: read the account, and refuse the call if it would pass the cap. With no cap in the config the call is let through uncounted.
export function begin(ctx, { tool, purpose, id, estimate, seconds = null }) {
  const ledger = load(ctx.root, ctx.cfg);
  const { handle, sub } = account(ctx);
  if (!ledger) return { ledger: null, handle, sub, tool, purpose, id, estimate, seconds, before: sub.character_count };
  if (!ledger.baseline) ledger.baseline = { at: (ctx.now ?? utc)(), used: sub.character_count, limit: sub.character_limit };
  const r = core.room({ ledger, purpose, estimate });
  if (!r.ok) throw new CapError(core.refusal(r, { purpose, id }));
  return { ledger, handle, sub, tool, purpose, id, estimate, seconds, before: sub.character_count };
}

// After a call: read the account again and write the call into the ledger, whether or not it returned anything.
// The account posts a call late, so it is read until it has moved by the cost the answer states, or until the wait runs out.
export function end(ctx, open, { ok, header = null, waitMs = AFTER_WAIT_MS, tries = AFTER_TRIES }) {
  if (!open.ledger) return null;
  const want = ok ? (Number.isFinite(header) ? header : 1) : 0;
  let after = null;
  let afterRead = 'read';
  for (let i = 0; i < tries; i++) {
    // The account posts a call some seconds late, so the wait comes before each reading and not after it.
    if (waitMs > 0) wait(waitMs);
    const sub = subscription({ handle: open.handle, runner: ctx.runner ?? spawnRunner });
    if (sub.ok) {
      after = sub.character_count;
      if (after - open.before >= want) break;
    }
  }
  if (after === null) {
    after = open.before + (ok ? (Number.isFinite(header) ? header : Math.ceil(open.estimate)) : 0);
    afterRead = Number.isFinite(header) && ok ? 'the account could not be read after the call, so the cost in the answer was counted' : 'the account could not be read after the call, so the estimate was counted';
  } else if (after - open.before < want) afterRead = `read ${tries} times over ${Math.round((tries * waitMs) / 1000)} s, and the account had not posted the whole call yet`;
  const made = core.entry({ at: (ctx.now ?? utc)(), tool: open.tool, purpose: open.purpose, id: open.id, estimate: open.estimate, before: open.before, after, ok, header, seconds: open.seconds, afterRead });
  open.ledger.calls.push(made);
  delete open.ledger.read;
  save(ctx.root, open.ledger);
  return made;
}

// Read the account now and keep the reading, so the ledger can say what the account did between calls.
export function read(ctx) {
  const ledger = load(ctx.root, ctx.cfg);
  if (!ledger) throw new Error('credits: the config holds no credits.cap, so there is no cap to count against');
  const { sub } = account(ctx);
  if (!ledger.baseline) ledger.baseline = { at: (ctx.now ?? utc)(), used: sub.character_count, limit: sub.character_limit };
  else ledger.read = { at: (ctx.now ?? utc)(), used: sub.character_count };
  save(ctx.root, ledger);
  return ledger;
}

export const lineOf = (root, cfg) => {
  if (!fs.existsSync(file(root))) return null;
  return core.line(load(root, cfg));
};
