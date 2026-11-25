import path from 'node:path';
import { ROOT, args, config } from './lib/paths.mjs';
import { isMain } from './lib/img.mjs';
import { spawnRunner } from './lib/eleven.mjs';
import * as core from './lib/credits-core.mjs';
import * as credits from './lib/credits.mjs';

export const USAGE = 'usage: npm run credits -- --status | --read | --baseline | --line, each with [--root DIR]';

export function creditsCommand(a, deps = {}) {
  const ctx = { cfg: deps.cfg ?? config(), root: deps.root ?? (typeof a.root === 'string' ? path.resolve(a.root) : ROOT), print: deps.print ?? ((l) => console.log(l)), runner: deps.runner ?? spawnRunner, env: deps.env ?? process.env, now: deps.now };
  if (a.baseline !== undefined) {
    const ledger = credits.baseline(ctx);
    ctx.print(`credits: ${core.line(ledger)}`);
    return ledger;
  }
  if (a.read !== undefined) {
    const read = credits.read(ctx);
    ctx.print(`credits: ${core.line(read)}`);
    return read;
  }
  const ledger = credits.load(ctx.root, ctx.cfg);
  if (!ledger) throw new Error('the config holds no credits.cap');
  if (a.line !== undefined) {
    ctx.print(core.line(ledger));
    return ledger;
  }
  if (a.status === undefined) throw new Error(USAGE);
  ctx.print(`credits: ${core.line(ledger)}`);
  const per = core.perSecond(ledger);
  if (per) ctx.print(`credits: a second of sound cost ${per.perSecond.toFixed(2)} credits, measured over ${per.calls} call${per.calls === 1 ? '' : 's'} and ${per.seconds.toFixed(1)} s (${core.num(per.spent)} credits).`);
  for (const c of ledger.calls) ctx.print(`credits: ${c.at} ${c.tool} ${c.id}: ${core.num(c.before)} used before, ${core.num(c.after)} after, ${core.num(c.spent)} counted${c.header === null ? ', by how far the account moved' : ', as the answer states'}${c.ok ? '' : ', the call failed'}${c.afterRead === 'read' ? '' : `, ${c.afterRead}`}`);
  return ledger;
}

if (isMain(import.meta)) {
  try {
    creditsCommand(args());
  } catch (e) {
    console.error(`credits: ${String(e.message).split('\n')[0]}`);
    process.exit(1);
  }
}
