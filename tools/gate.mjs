import path from 'node:path';
import { ROOT, rel, args, config, utc, writeJson } from './lib/paths.mjs';
import { isMain, one, relPath } from './lib/img.mjs';
import { REGISTRY } from './checks/index.mjs';
import { exec } from './checks/commands.mjs';

export { REGISTRY };

export const USAGE = 'usage: npm run gate -- --phase N [--only G3,G9] [--json]';

export function inPhase(check, phase) {
  return check.phases ? check.phases.includes(phase) : check.phase <= phase;
}

export function parseOnly(value) {
  if (value === undefined || value === null || value === true) return null;
  const list = (Array.isArray(value) ? value : [value]).flatMap((v) => String(v).split(',')).map((s) => s.trim().toUpperCase()).filter(Boolean);
  return list.length ? list : null;
}

export function selectChecks(registry, phase, only = null) {
  const ofPhase = registry.filter((c) => inPhase(c, phase));
  if (!only) return ofPhase;
  for (const id of only) {
    if (!registry.some((c) => c.id === id)) throw new Error(`no check ${id}`);
    if (!ofPhase.some((c) => c.id === id)) throw new Error(`${id} is not a check of phase ${phase}`);
  }
  return ofPhase.filter((c) => only.includes(c.id));
}

async function runOne(check, ctx) {
  const base = { id: check.id, title: check.title, kind: check.kind, phase: check.phase, advisory: Boolean(check.advisory) };
  if (typeof check.run !== 'function') return { ...base, status: 'not built', ok: false, lines: [], skipped: [], seconds: 0 };
  const t0 = Date.now();
  let r;
  try {
    r = await check.run(ctx);
  } catch (e) {
    r = { ok: false, lines: [`The check stopped with an error: ${String(e.message).split('\n')[0]}`], skipped: [] };
  }
  const ok = r.ok === true;
  return { ...base, status: ok ? 'pass' : 'fail', ok, lines: r.lines ?? [], skipped: r.skipped ?? [], seconds: Number(((Date.now() - t0) / 1000).toFixed(1)) };
}

export const counts = (r) => r.status === 'not built' || (r.status === 'fail' && !r.advisory);

export async function runGate({ phase, only = null, renderer = null, registry = REGISTRY, root = ROOT, dir = null, run = exec, cfg = config(), onResult = null }) {
  if (!Number.isInteger(phase) || phase < 0) throw new Error(USAGE);
  const picked = selectChecks(registry, phase, only);
  let loaded = renderer;
  let opened = false;
  const ctx = {
    phase,
    root,
    config: cfg,
    exec: run,
    renderer: async () => {
      if (!loaded) {
        loaded = await import('./lib/render.mjs');
        opened = true;
      }
      return loaded;
    }
  };
  const results = [];
  try {
    for (const check of picked) {
      const r = await runOne(check, ctx);
      results.push(r);
      if (onResult) onResult(r);
    }
  } finally {
    if (opened) await loaded.closeRenderer().catch(() => {});
  }
  const failed = results.filter(counts).map((r) => r.id);
  const out = { phase, at: utc(), only, ok: failed.length === 0, failed, results };
  const file = path.join(dir ?? rel('out', 'work', 'gate'), only ? `phase-${phase}-only.json` : `phase-${phase}.json`);
  writeJson(file, out);
  return { ...out, file };
}

export function resultLines(r) {
  const word = r.status === 'pass' ? 'pass' : r.status === 'fail' ? 'FAIL' : 'not built';
  const note = r.status === 'fail' && r.advisory ? ' (a sound check: an open item, it does not fail the gate)' : '';
  const out = [`${r.id} ${word}  ${r.title}${note}`];
  if (r.status === 'fail') out.push(...r.lines.map((l) => `    ${l}`));
  out.push(...r.skipped.map((l) => `    not checked: ${l}`));
  return out;
}

export function summaryLine(result) {
  const n = result.results.length;
  const passed = result.results.filter((r) => r.status === 'pass').length;
  const missing = result.results.filter((r) => r.status === 'not built').length;
  const open = result.results.filter((r) => r.status === 'fail' && r.advisory).length;
  const red = n - passed - missing - open;
  const parts = [`${passed} of ${n} passed`, `${red} failed`, `${missing} not built`];
  if (open) parts.push(`${open} sound ${open === 1 ? 'check' : 'checks'} open`);
  return `gate phase ${result.phase}${result.only ? ` (only ${result.only.join(', ')})` : ''}: ${result.ok ? 'pass' : 'FAIL'}. ${parts.join(', ')}.`;
}

export async function gateCommand(a, deps = {}) {
  const print = deps.print ?? ((l) => console.log(l));
  const phase = Number(one(a.phase, NaN));
  if (!Number.isInteger(phase) || phase < 0) {
    print(USAGE);
    return { code: 1, result: null };
  }
  const json = Boolean(a.json);
  let result;
  try {
    result = await runGate({
      ...deps,
      phase,
      only: parseOnly(a.only),
      onResult: json ? null : (r) => resultLines(r).forEach(print)
    });
  } catch (e) {
    print(`gate: ${e.message}`);
    return { code: 1, result: null };
  }
  if (json) print(JSON.stringify(result, null, 2));
  else {
    print(summaryLine(result));
    print(`gate: ${relPath(result.file)}`);
  }
  return { code: result.ok ? 0 : 1, result };
}

if (isMain(import.meta)) {
  gateCommand(args()).then(({ code }) => process.exit(code));
}
