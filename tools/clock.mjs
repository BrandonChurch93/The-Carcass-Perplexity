import fs from 'node:fs';
import os from 'node:os';
import { rel, readJson, writeJson, config, args, utc } from './lib/paths.mjs';
import * as core from './lib/clock-core.mjs';

const FILE = rel('kit', 'CLOCK.json');

export function bootId() {
  try {
    return fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
  } catch {
    return 'boot-' + Math.round((Date.now() / 1000 - os.uptime()) / 120);
  }
}

export function load() {
  return fs.existsSync(FILE) ? readJson(FILE) : core.emptyState();
}

function donePhases() {
  const p = rel('kit', 'PROGRESS.md');
  if (!fs.existsSync(p)) return [];
  const out = [];
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\|\s*(\d)\s*·[^|]*\|\s*done\s*\|/);
    if (m) out.push(m[1]);
  }
  return out;
}

export function run(a) {
  const budget = config().budget;
  const now = typeof a.at === 'string' ? utc(new Date(a.at)) : utc();
  const boot = bootId();
  let state = load();
  let lines = [];
  if (a.start) {
    state = core.start(state, now, boot);
    lines.push(`clock started at ${now}`);
  } else if (a.continue !== undefined) {
    state = core.continueBuild(state, now, boot, a.continue, budget, typeof a.done === 'string' ? a.done.split(',') : donePhases());
    lines.push(`continuation ${a.continue} recorded at ${now}: ${budget.continueHours} h over the phases that are not done`);
  } else if (a['review-round'] !== undefined) {
    const r = core.tickReviewRound(state, now, boot, a['review-round'], budget);
    state = r.state;
    lines = core.linesSide(r.report);
  } else if (a.extension !== undefined) {
    const r = core.tickExtension(state, now, boot, a.extension, budget);
    state = r.state;
    lines = core.linesSide(r.report);
  } else if (a.phase !== undefined) {
    const r = core.tickPhase(state, now, boot, a.phase, budget);
    state = r.state;
    lines = core.linesPhase(r.report);
  } else if (a.show !== undefined) {
    lines = core.linesPhase(core.reportPhase(state, now, a.show, budget));
  } else {
    lines.push('usage: npm run clock -- --start | --phase N | --review-round N | --extension N | --continue N | --show N [--status-posted]');
  }
  if (a['status-posted']) state = core.markStatus(state, now);
  if (!a.show || a['status-posted']) writeJson(FILE, state);
  return { state, lines, now };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = run(args());
  console.log(`${r.now}`);
  for (const l of r.lines) console.log(l);
}
