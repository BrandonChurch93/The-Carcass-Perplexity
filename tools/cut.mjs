import fs from 'node:fs';
import path from 'node:path';
import { ROOT, args, config, readJson, writeJson, utc } from './lib/paths.mjs';
import { isMain, one } from './lib/img.mjs';
import { CUT_LIST, MAP, KEPT_LINES, RECORDS, recordField, num } from './checks/inputs.mjs';
import { scriptLines } from './checks/g16.mjs';
import { compile, check, tables, printed, cuesText, wavSeconds, lineId, shortenWav, CUT_SILENCE_DBFS } from './lib/cut-core.mjs';
import { checkedCut } from './lib/script.mjs';
import { decode, integratedLufs, truePeakDb } from './lib/loudness.mjs';

export const USAGE = 'usage: npm run cut [-- --plan PATH] [--map PATH] [--out PATH] [--cues PATH] [--lines DIR] [--json] [--check] | npm run cut -- --shorten [--lines DIR]';
export const NAME = 'cut';
const PLAN = 'cut/PLAN.json';
const CUES = 'cut/CUES.md';

const named = (file) => path.relative(ROOT, path.resolve(ROOT, file)).split(path.sep).join('/');

// The kept line a spoken line is laid from. A line that narration.cut shortens is laid from its short form, which
// `npm run cut -- --shorten` makes from the kept line. A short form that is missing, or that is not what the kept
// line gives with the numbers of the config, stops the cut: the cut list never names a stale file.
export function keptLines(dir, cfg, root = ROOT) {
  const kept = {};
  const { shortened } = checkedCut(cfg);
  for (const l of scriptLines(cfg)) {
    const id = lineId(l);
    const whole = path.join(dir, `${id}.wav`);
    if (!fs.existsSync(whole)) continue;
    const short = shortened.find((s) => s.id === id);
    const file = short ? path.resolve(root, short.file) : whole;
    if (short) {
      const want = shortOf(whole, short).bytes;
      if (!fs.existsSync(file)) throw new Error(`${named(file)}, the short form of line ${id}, is not made yet. Run npm run cut -- --shorten`);
      if (!fs.readFileSync(file).equals(want)) throw new Error(`${named(file)} is not what ${named(whole)} gives with narration.cut. Run npm run cut -- --shorten`);
    }
    const seconds = wavSeconds(fs.readFileSync(file));
    if (seconds === null || !(seconds > 0)) throw new Error(`${named(file)} is no WAV file with sound in it`);
    kept[id] = { seconds, file: named(file) };
  }
  return kept;
}

function shortOf(whole, short) {
  try {
    return shortenWav(fs.readFileSync(whole), short);
  } catch (e) {
    throw new Error(`${named(whole)} cannot be shortened: ${e.message}`);
  }
}

const recordOf = (file) => path.join(RECORDS, `${path.basename(file, path.extname(file))}.md`);
const field = (text, label) => recordField(text, label) ?? '';

// The record of a short line, beside the record of the kept line it is cut from.
export function shortRecord({ short, made, measured, wholeFile, wholeRecord, date }) {
  const id = path.basename(short.file, path.extname(short.file));
  const ms = Math.round(short.fadeOutSeconds * 1000);
  return [
    `## ${id}`,
    `Made by: tools/cut.mjs with --shorten, cut from ${wholeFile}, whose record is ${recordOf(wholeFile).split(path.sep).join('/')}`,
    `Text or description: ${JSON.stringify(short.text)}`,
    `Settings: ${made.rate} Hz, ${made.channels === 1 ? 'mono' : `${made.channels} channels`}, 16 bit. The kept line from its start to ${short.endSeconds} s, sample for sample, with a fade out over its last ${ms} ms. No gain, no limiter, no dither. The cut lies in a silence of the kept line, which is under ${CUT_SILENCE_DBFS} dBFS from ${num(made.silence.from, 2)} s to ${num(made.silence.to, 2)} s`,
    `Takes: 0 made, nothing was recorded for it. It is cut from the kept take of ${path.basename(wholeFile, path.extname(wholeFile))}${field(wholeRecord, 'Takes:') ? `, whose record says: ${field(wholeRecord, 'Takes:')}` : ''}`,
    `Measured: ${made.seconds.toFixed(2)} s of the ${made.keptSeconds.toFixed(2)} s of the kept line, ${measured.lufs} LUFS, true peak ${measured.truePeakDb} dB`,
    `Date: ${date}`,
    ''
  ].join('\n');
}

// Makes the short form of every line narration.cut shortens, from its kept line, and writes its record.
// It reads the kept line and never writes it. It calls no service and costs nothing.
export function shortenCommand(a = {}, deps = {}) {
  const print = deps.print ?? console.log;
  const cfg = deps.cfg ?? config();
  const root = deps.root ?? ROOT;
  const linesDir = path.resolve(root, one(a.lines, KEPT_LINES));
  const { shortened } = checkedCut(cfg);
  const wrote = [];
  for (const short of shortened) {
    const whole = path.join(linesDir, `${short.id}.wav`);
    const wholeFile = path.relative(root, whole).split(path.sep).join('/');
    if (!fs.existsSync(whole)) throw new Error(`${wholeFile}, the kept line of ${short.id}, does not exist, so it cannot be shortened`);
    const made = shortOf(whole, short);
    const file = path.resolve(root, short.file);
    if (path.resolve(file) === path.resolve(whole)) throw new Error(`narration.cut names ${short.file} for the short line, and that is the kept line itself`);
    const same = fs.existsSync(file) && fs.readFileSync(file).equals(made.bytes);
    if (!same) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, made.bytes);
    }
    const samples = decode(file);
    const measured = { lufs: num(integratedLufs(samples, made.rate), 1), truePeakDb: num(truePeakDb(samples, made.rate), 2) };
    const recordFile = path.join(root, recordOf(short.file));
    const old = fs.existsSync(recordFile) ? fs.readFileSync(recordFile, 'utf8') : null;
    const wholeRecordFile = path.join(root, recordOf(wholeFile));
    const text = shortRecord({
      short,
      made,
      measured,
      wholeFile,
      wholeRecord: fs.existsSync(wholeRecordFile) ? fs.readFileSync(wholeRecordFile, 'utf8') : '',
      date: (old && field(old, 'Date:')) || (deps.today ?? utc().slice(0, 10))
    });
    if (old !== text) {
      fs.mkdirSync(path.dirname(recordFile), { recursive: true });
      fs.writeFileSync(recordFile, text);
    }
    wrote.push(short.file);
    print(`${NAME}: ${short.file} ${same ? 'is already what the kept line gives' : 'written'}: ${JSON.stringify(short.text)}, ${made.seconds.toFixed(2)} s of the ${made.keptSeconds.toFixed(2)} s of ${wholeFile}, a fade out of ${Math.round(short.fadeOutSeconds * 1000)} ms, ${measured.lufs} LUFS, true peak ${measured.truePeakDb} dB`);
    print(`${NAME}: the cut at ${short.endSeconds} s lies in a silence of the kept line, under ${CUT_SILENCE_DBFS} dBFS from ${num(made.silence.from, 3)} s to ${num(made.silence.to, 3)} s`);
  }
  if (shortened.length === 0) print(`${NAME}: narration.cut shortens no line`);
  return { ok: true, wrote };
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
    process.exit((a.shorten === true ? shortenCommand(a) : cutCommand(a)).ok ? 0 : 1);
  } catch (e) {
    console.log(`${NAME}: ${e.message.split('\n')[0]}`);
    process.exit(1);
  }
}
