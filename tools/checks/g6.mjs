import fs from 'node:fs';
import path from 'node:path';
import { CUT_LIST, readJsonIf, readTextIf, report, count } from './inputs.mjs';
import { ROOT } from '../lib/paths.mjs';
import { judgedList, readJudgedTable, judgedFaults } from '../lib/judged.mjs';

export const PROGRESS = 'kit/PROGRESS.md';
export const SECTION = 'Judged frames';
export const CONFIG = 'config/showcase.json';
export const APPROVED = 'references/approved';

export function sectionOf(text, title) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^#{2,3} /.test(l) && l.replace(/^#+ /, '').trim() === title);
  if (start < 0) return null;
  const level = lines[start].match(/^#+/)[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#+) /);
    if (m && m[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join('\n');
}

export function judgedOnList(cfg, cut, text) {
  if (text === null) return { faults: [`There is no ${PROGRESS}.`], info: [], skipped: [] };
  const section = sectionOf(text, SECTION);
  if (section === null) return { faults: [`${PROGRESS} has no section named ${SECTION}.`], info: [], skipped: [] };
  let list;
  try {
    list = judgedList(cfg, cut);
  } catch (e) {
    return { faults: [`The judged list could not be computed from ${CUT_LIST}: ${String(e.message).split('\n')[0]}`], info: [], skipped: [] };
  }
  const logged = readJudgedTable(section);
  const faults = judgedFaults(list, logged);
  const added = logged.filter((e) => !list.some((x) => x.id === e.id)).length;
  const info = [`${count(list.length, 'judged frame')} computed from the config and ${CUT_LIST}, ${list.length - new Set(faults.map((f) => f.split(' ')[3])).size} of them on the list in ${PROGRESS}${added ? `, which holds ${added} more` : ''}.`];
  return { faults, info, skipped: [] };
}

export function configFaults(problems) {
  const faults = problems.map((p) => `${CONFIG} does not pass startup validation: ${p}`);
  return { faults, info: faults.length ? [] : [`${CONFIG} passes startup validation.`], skipped: [] };
}

function walk(root, dir) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(root, `${dir}/${e.name}`) : e.name === '.DS_Store' ? [] : [`${dir}/${e.name}`]))
    .sort();
}

export async function validateConfig(cfg, root) {
  const { createServer } = await import('vite');
  const server = await createServer({ root: ROOT, configFile: false, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { validate } = await server.ssrLoadModule('/src/config.ts');
    return validate(cfg, walk(root, APPROVED));
  } finally {
    await server.close();
  }
}

export async function runG6(ctx, validate = validateConfig) {
  const parts = [];
  try {
    parts.push(configFaults(await validate(ctx.config, ctx.root)));
  } catch (e) {
    parts.push({ faults: [`The startup validation of ${CONFIG} could not be run: ${String(e.message).split('\n')[0]}`], info: [], skipped: [] });
  }
  const cut = readJsonIf(ctx.root, CUT_LIST);
  if (cut === null) parts.push({ faults: [], info: [], skipped: [`no ${CUT_LIST} yet, so the judged list was not computed`] });
  else parts.push(judgedOnList(ctx.config, cut, readTextIf(ctx.root, PROGRESS)));
  return report({ faults: parts.flatMap((p) => p.faults), info: parts.flatMap((p) => p.info), skipped: parts.flatMap((p) => p.skipped) });
}
