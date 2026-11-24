import fs from 'node:fs';
import path from 'node:path';
import { ROOT, args, config, readJson, writeJson } from './lib/paths.mjs';
import { isMain, one } from './lib/img.mjs';
import { CUT_LIST, MAP, KEPT_LINES } from './checks/inputs.mjs';
import { scriptLines } from './checks/g16.mjs';
import { compile, check, tables, printed, cuesText, wavSeconds, lineId } from './lib/cut-core.mjs';

export const USAGE = 'usage: npm run cut [-- --plan PATH] [--map PATH] [--out PATH] [--cues PATH] [--lines DIR] [--json] [--check]';
export const NAME = 'cut';
const PLAN = 'cut/PLAN.json';
const CUES = 'cut/CUES.md';

const named = (file) => path.relative(ROOT, path.resolve(ROOT, file)).split(path.sep).join('/');

export function keptLines(dir, cfg) {
  const kept = {};
  for (const l of scriptLines(cfg)) {
    const id = lineId(l);
    const file = path.join(dir, `${id}.wav`);
    if (!fs.existsSync(file)) continue;
    const seconds = wavSeconds(fs.readFileSync(file));
    if (seconds === null || !(seconds > 0)) throw new Error(`${named(file)} is no WAV file with sound in it`);
    kept[id] = { seconds, file: named(file) };
  }
  return kept;
}

export function cutCommand(a = {}, deps = {}) {
  const print = deps.print ?? console.log;
  const cfg = deps.cfg ?? config();
  const planFile = path.resolve(ROOT, one(a.plan, PLAN));
  const mapFile = path.resolve(ROOT, one(a.map, MAP));
  const outFile = path.resolve(ROOT, one(a.out, CUT_LIST));
  const cuesFile = path.resolve(ROOT, one(a.cues, CUES));
  const linesDir = path.resolve(ROOT, one(a.lines, KEPT_LINES));
  const asJson = a.json === true;
  for (const file of [planFile, mapFile]) if (!fs.existsSync(file)) throw new Error(`${named(file)} does not exist`);
  const read = (file) => {
    try {
      return readJson(file);
    } catch {
      throw new Error(`${named(file)} is not valid JSON`);
    }
  };
  const plan = read(planFile);
  const map = read(mapFile);
  const { cut, errors } = compile({ plan, map, cfg, kept: keptLines(linesDir, cfg) });
  if (cut === null) {
    if (asJson) print(JSON.stringify({ ok: false, errors, faults: [], info: [], tables: null, wrote: [] }, null, 2));
    else {
      for (const e of errors) print(`${NAME}: error. ${e}`);
      print(`${NAME}: ${errors.length} ${errors.length === 1 ? 'error' : 'errors'} in ${named(planFile)}, nothing written`);
    }
    return { ok: false, errors, faults: [], wrote: [] };
  }
  const { faults, info } = check(cut, map, cfg);
  const t = tables(cut, map);
  const wrote = [];
  if (a.check !== true) {
    writeJson(outFile, cut);
    fs.mkdirSync(path.dirname(cuesFile), { recursive: true });
    fs.writeFileSync(cuesFile, cuesText(cut, map));
    wrote.push(named(outFile), named(cuesFile));
  }
  const ok = faults.length === 0;
  if (asJson) print(JSON.stringify({ ok, errors: [], faults, info, tables: t, wrote }, null, 2));
  else {
    for (const line of printed(cut, t, NAME)) print(line);
    for (const f of faults) print(`${NAME}: fault. ${f}`);
    const count = `${faults.length} ${faults.length === 1 ? 'fault' : 'faults'}`;
    print(wrote.length ? `${NAME}: wrote ${wrote.join(' and ')}, ${count}` : `${NAME}: checked ${named(planFile)} and wrote nothing, ${count}`);
  }
  return { ok, errors: [], faults, info, tables: t, wrote, cut };
}

if (isMain(import.meta)) {
  const a = args();
  if (a.help) {
    console.log(USAGE);
    process.exit(0);
  }
  try {
    process.exit(cutCommand(a).ok ? 0 : 1);
  } catch (e) {
    console.log(`${NAME}: ${e.message.split('\n')[0]}`);
    process.exit(1);
  }
}
