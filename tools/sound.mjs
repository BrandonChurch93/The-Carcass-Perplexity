import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT, args, config, readJson, writeJson } from './lib/paths.mjs';
import { isMain, one, STYLE, SEP, clean } from './lib/img.mjs';
import { decode, probe, writeWav } from './lib/loudness.mjs';
import { readHandle, subscription, spawnRunner, curl, hide, API, HANDLE_ENV, HANDLE_FILE } from './lib/eleven.mjs';
import { headerDay, takesLine } from './lib/voice-core.mjs';
import { KEPT_SOUNDS, RECORDS, ASSETS, CUT_LIST } from './checks/inputs.mjs';
import * as core from './lib/sound-core.mjs';

export const USAGE = 'usage: npm run sound -- --cue ID [--takes N] [--dry-run] | --cue ID --take FILE | --cue ID --keep N | --cue ID --status | --sheet [--out PATH], each with [--root DIR]';
export const WORK = 'out/work/sound';
export const TAKES = 'out/work/sound/takes';
export const SHEET = 'out/work/sound/sheet.png';
export const CUES = 'audio/cues';
export { KEPT_SOUNDS, RECORDS, ASSETS };
const SHEET_WIDTH = 1600;
const SHEET_FONT = 15;
const SHEET_HEAD = 18;
const SHEET_WAVE = 96;
const MAX_CHANNELS = 2;
const BODY_SHOWN = 300;

const takeFile = (root, id, k, ext) => path.join(root, TAKES, id, `take-${k}.${ext}`);
const readIf = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null);
const jsonIf = (file) => (fs.existsSync(file) ? readJson(file) : null);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const lastLine = (text) => String(text).trim().split('\n').pop() ?? '';
const keptPath = (cue) => `${KEPT_SOUNDS}/${cue.unit}/${cue.id}.wav`;

export function takesOnDisk(root, id) {
  const dir = path.join(root, TAKES, id);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  return fs
    .readdirSync(dir)
    .map((f) => /^take-(\d+)\.json$/.exec(f))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}

export function keptState(root, id) {
  const text = readIf(path.join(root, RECORDS, `${id}.md`));
  return text === null ? null : core.readRecord(text);
}

export function loadCue(root, id) {
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`a cue id is lower case letters, digits and hyphens. ${USAGE}`);
  const cut = jsonIf(path.join(root, CUT_LIST));
  const listed = (cut?.sounds ?? []).find((s) => s.id === id) ?? null;
  const file = path.join(root, CUES, `${id}.json`);
  if (!fs.existsSync(file)) throw new Error(`${CUES}/${id}.json does not exist, so ${id} has no description to send`);
  let json;
  try {
    json = readJson(file);
  } catch {
    throw new Error(`${CUES}/${id}.json is not JSON`);
  }
  return core.readCue(json, id, listed);
}

export function cuesOfUnit(root, unit) {
  const ids = [];
  const keptDir = path.join(root, KEPT_SOUNDS, unit);
  if (fs.existsSync(keptDir)) for (const f of fs.readdirSync(keptDir)) if (fs.existsSync(path.join(root, RECORDS, `${path.parse(f).name}.md`))) ids.push(path.parse(f).name);
  const recordDir = path.join(root, RECORDS);
  if (fs.existsSync(recordDir)) for (const f of fs.readdirSync(recordDir)) if (f.endsWith('.md') && core.readRecord(fs.readFileSync(path.join(recordDir, f), 'utf8')).unit === unit) ids.push(path.parse(f).name);
  const takeDir = path.join(root, TAKES);
  if (fs.existsSync(takeDir)) {
    for (const id of fs.readdirSync(takeDir)) {
      const first = takesOnDisk(root, id)[0];
      if (first !== undefined && jsonIf(takeFile(root, id, first, 'json'))?.unit === unit) ids.push(id);
    }
  }
  return [...new Set(ids)].sort();
}

function room(ctx, cue) {
  const takeMax = ctx.cfg.audio.maxTakesPerCue;
  const placeMax = ctx.cfg.audio.maxCuesPerPlace;
  const place = core.placeRoom({ cue: cue.id, unit: cue.unit, cuesOfUnit: cuesOfUnit(ctx.root, cue.unit), max: placeMax });
  if (!place.ok) throw new Error(`${cue.unit} has its ${plural(placeMax, 'cue')} (${place.others.join(', ')}), so ${cue.id} is not made`);
  const next = core.nextTake(takesOnDisk(ctx.root, cue.id), keptState(ctx.root, cue.id)?.made ?? null, takeMax);
  if (!next.ok) throw new Error(`${cue.id} has its ${plural(takeMax, 'take')}, so no more are made`);
  return next.take;
}

export function soundEffect({ body, into, handle, runner = spawnRunner }) {
  const files = { request: `${into}.request.json`, headers: `${into}.headers.txt`, mp3: `${into}.mp3` };
  fs.mkdirSync(path.dirname(into), { recursive: true });
  fs.writeFileSync(files.request, JSON.stringify(body, null, 1));
  const r = runner(curl(handle, ['-X', 'POST', core.requestUrl(API), '-H', 'Content-Type: application/json', '--data-binary', `@${files.request}`, '-D', files.headers, '-o', files.mp3, '-w', '%{http_code}']));
  const status = Number(String(r.stdout).trim().slice(-3));
  const fail = (why, quota = false) => {
    for (const f of Object.values(files)) fs.rmSync(f, { force: true });
    if (fs.existsSync(path.dirname(into)) && fs.readdirSync(path.dirname(into)).length === 0) fs.rmdirSync(path.dirname(into));
    return { ok: false, quota, status: Number.isFinite(status) ? status : 0, body: hide(why, handle).replace(/\s+/g, ' ').slice(0, BODY_SHOWN) };
  };
  if (r.status !== 0) return fail(lastLine(r.stderr) || `the command ended with ${r.status}`);
  if (status !== 200) {
    const text = fs.existsSync(files.mp3) ? fs.readFileSync(files.mp3).subarray(0, 4096).toString('utf8') : '';
    const no = core.refusal(status, text);
    return fail(no.message || text, no.quota);
  }
  if (!fs.existsSync(files.mp3) || fs.statSync(files.mp3).size === 0) return fail('the answer holds no sound');
  return { ok: true, status, files };
}

export function fileTake(ctx, cue, k, soundFile, { source = null, day = null, characterCost = null } = {}) {
  const rate = ctx.cfg.audio.sampleRate;
  const channels = decode(soundFile, { rate, channels: Math.min(MAX_CHANNELS, probe(soundFile).channels) });
  if (channels[0].length === 0) throw new Error(`${path.basename(soundFile)} holds no sound`);
  const done = core.processTake(channels, rate, cue);
  const check = { ...done.check, take: k, source, day, characterCost };
  writeWav(takeFile(ctx.root, cue.id, k, 'wav'), done.channels, rate);
  writeJson(takeFile(ctx.root, cue.id, k, 'json'), check);
  ctx.print(`sound: ${cue.id} take ${k}, ${core.takeSummary(check)}. ${check.rejected ? `A fault by measure. ${check.reasons.join(' ')}` : 'No fault by measure.'}`);
  ctx.print(`sound: wrote ${path.relative(ctx.root, takeFile(ctx.root, cue.id, k, 'wav'))}`);
  return check;
}

export function make(cue, ctx, { takes = 1, dryRun = false } = {}) {
  const made = [];
  for (let n = 0; n < takes; n++) {
    const k = room(ctx, cue);
    const body = core.requestBody(cue);
    const cost = core.costOf(cue);
    if (dryRun) {
      ctx.print(`sound: ${cue.id} take ${k} would cost about ${cost} credits. The request: ${JSON.stringify(body)}`);
      break;
    }
    const handle = readHandle({ env: ctx.env, root: ctx.root });
    if (!handle) throw new Error(`no handle. Set ${HANDLE_ENV} or write it as the one line of ${HANDLE_FILE}`);
    const sub = subscription({ handle, runner: ctx.runner });
    if (!sub.ok) throw new Error(`the account could not be read: ${sub.why}`);
    if (sub.left < cost) throw new Error(`${cue.id} was not made. It needs about ${cost} credits and the account has ${sub.left} left. Nothing was written.`);
    const into = path.join(ctx.root, TAKES, cue.id, `take-${k}`);
    const r = soundEffect({ body, into, handle, runner: ctx.runner });
    if (!r.ok && r.quota) throw new Error(`${cue.id} was not made. The account refused it for quota: ${r.body}. Nothing was written.`);
    if (!r.ok) throw new Error(`${cue.id} take ${k} failed with status ${r.status}: ${r.body}`);
    const headers = readIf(r.files.headers);
    const cost2 = Number(/^character-cost:\s*(\d+)/im.exec(headers ?? '')?.[1]);
    made.push(fileTake(ctx, cue, k, r.files.mp3, { day: headerDay(headers), characterCost: Number.isFinite(cost2) ? cost2 : null }));
  }
  return made;
}

export function standIn(cue, ctx, file) {
  const from = path.resolve(ctx.cwd, file);
  if (!fs.existsSync(from)) throw new Error(`${file} does not exist`);
  const k = room(ctx, cue);
  return fileTake(ctx, cue, k, from, { source: path.basename(from) });
}

function readTakes(ctx, cue) {
  return takesOnDisk(ctx.root, cue.id).map((k) => {
    const c = jsonIf(takeFile(ctx.root, cue.id, k, 'json'));
    const verdict = jsonIf(takeFile(ctx.root, cue.id, k, 'verdict.json'));
    return verdict?.fault ? { ...c, rejected: true, reasons: [...c.reasons, `The Builder's verdict names a fault: ${verdict.fault}.`] } : c;
  });
}

export function keep(cue, ctx, n) {
  const takes = readTakes(ctx, cue);
  const kept = takes.find((t) => t.take === n);
  if (!kept) throw new Error(`${cue.id} has no take ${n}. It has ${takes.length ? `take ${takes.map((t) => t.take).join(', ')}` : 'no take'}`);
  const placeMax = ctx.cfg.audio.maxCuesPerPlace;
  const place = core.placeRoom({ cue: cue.id, unit: cue.unit, cuesOfUnit: cuesOfUnit(ctx.root, cue.unit), max: placeMax });
  if (!place.ok) throw new Error(`${cue.unit} has its ${plural(placeMax, 'cue')} (${place.others.join(', ')}), so ${cue.id} is not kept`);
  const file = keptPath(cue);
  fs.mkdirSync(path.dirname(path.join(ctx.root, file)), { recursive: true });
  fs.copyFileSync(takeFile(ctx.root, cue.id, n, 'wav'), path.join(ctx.root, file));
  const listeners = [1, 2].map((i) => readIf(takeFile(ctx.root, cue.id, n, `listener-${i}.txt`))).filter((t) => t !== null).map((t) => t.trim().replace(/\s+/g, ' '));
  const record = core.recordText({ cue, takes, kept, listeners, day: kept.day, file, cueFile: `${CUES}/${cue.id}.json`, api: API, rate: ctx.cfg.audio.sampleRate });
  fs.mkdirSync(path.join(ctx.root, RECORDS), { recursive: true });
  fs.writeFileSync(path.join(ctx.root, RECORDS, `${cue.id}.md`), record);
  ctx.print(`sound: ${cue.id}. ${core.keepWhy(kept, takes)}`);
  ctx.print(`sound: wrote ${file} and ${RECORDS}/${cue.id}.md`);
  const row = core.assetsRow({ file, takes: takesLine(takes.length, kept.take, kept.rejected), day: kept.day, source: kept.source });
  ctx.print(`sound: the row for ${ASSETS}: ${row}`);
  return { cue: cue.id, file, record, row, kept };
}

export function status(cue, ctx) {
  const takes = readTakes(ctx, cue);
  const state = keptState(ctx.root, cue.id);
  ctx.print(`sound: ${cue.id}, a ${cue.kind} in ${cue.unit}, ${state?.kept ? `take ${state.kept} kept${state.withFault ? ' with a fault' : ''}` : 'not kept'}, ${plural(takes.length, 'take')} on disk of ${ctx.cfg.audio.maxTakesPerCue} allowed, ${plural(cuesOfUnit(ctx.root, cue.unit).length, 'cue')} in ${cue.unit} of ${ctx.cfg.audio.maxCuesPerPlace} allowed`);
  for (const t of takes) ctx.print(`sound: ${cue.id} take ${t.take}, ${core.takeSummary(t)}. ${t.rejected ? `A fault. ${t.reasons.join(' ')}` : 'No fault by measure.'}`);
  return takes;
}

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textSvg = (x, y, text, { size = SHEET_FONT, ink = STYLE.ink, weight = 400 } = {}) => `<text x="${x}" y="${y}" font-family="${STYLE.family}" font-size="${size}" font-weight="${weight}" fill="${ink}">${esc(clean(text))}</text>`;

export function keptSounds(root, cfg) {
  const dir = path.join(root, KEPT_SOUNDS);
  if (!fs.existsSync(dir)) return [];
  const order = cfg.film.order;
  const place = (u) => (order.includes(u) ? order.indexOf(u) : order.length);
  const out = [];
  for (const unit of fs.readdirSync(dir).filter((u) => fs.statSync(path.join(dir, u)).isDirectory())) {
    for (const f of fs.readdirSync(path.join(dir, unit)).sort()) out.push({ unit, id: path.parse(f).name, file: `${KEPT_SOUNDS}/${unit}/${f}` });
  }
  return out.sort((a, b) => place(a.unit) - place(b.unit) || (a.unit < b.unit ? -1 : a.unit > b.unit ? 1 : 0) || (a.id < b.id ? -1 : 1));
}

export function sheetRows(ctx) {
  const rate = ctx.cfg.audio.sampleRate;
  return keptSounds(ctx.root, ctx.cfg).map((s) => {
    const channels = decode(path.join(ctx.root, s.file), { rate, channels: Math.min(MAX_CHANNELS, probe(path.join(ctx.root, s.file)).channels) });
    const m = core.measure(channels, rate);
    return { ...s, state: keptState(ctx.root, s.id), samples: core.monoOf(channels), seconds: m.seconds, lufs: m.lufs, truePeakDb: m.truePeakDb };
  });
}

export function sheetSvg(rows) {
  const pad = 20;
  const inner = SHEET_WIDTH - 2 * pad;
  const parts = [];
  let y = pad;
  if (rows.length === 0) {
    parts.push(textSvg(pad, y + SHEET_HEAD, 'No sound is kept yet', { size: SHEET_HEAD, weight: 700 }));
    y += SHEET_HEAD + 26;
  }
  const longest = Math.max(1, ...rows.map((r) => r.seconds));
  for (const row of rows) {
    const s = row.state;
    const head = [row.id, row.unit, s?.kind ?? 'no record', `${row.seconds.toFixed(2)} s`, `${row.lufs} LUFS`, `true peak ${row.truePeakDb} dB`, s?.kept ? `take ${s.kept} kept${s.withFault ? ' with a fault' : ''} of ${plural(s.made, 'take')}` : 'kept, with no record'].join(SEP);
    parts.push(textSvg(pad, y + SHEET_HEAD, head, { size: SHEET_HEAD, weight: 700 }));
    y += SHEET_HEAD + 10;
    if (s?.description) {
      parts.push(textSvg(pad, y + SHEET_FONT, s.description.length > 170 ? `${s.description.slice(0, 167)}...` : s.description, { ink: STYLE.dim }));
      y += SHEET_FONT + 10;
    }
    const width = Math.max(40, Math.round((row.seconds / longest) * inner));
    parts.push(`<rect x="${pad}" y="${y}" width="${inner}" height="${SHEET_WAVE}" fill="${STYLE.ground}" stroke="${STYLE.stripGround}"/>`);
    parts.push(`<rect x="${pad}" y="${y}" width="${width}" height="${SHEET_WAVE}" fill="${STYLE.stripGround}"/>`);
    const mid = y + SHEET_WAVE / 2;
    const env = core.envelope(row.samples, width);
    const scale = env.top > 0 ? (SHEET_WAVE / 2 - 6) / env.top : 0;
    const up = [];
    const down = [];
    for (let x = 0; x < width; x++) {
      up.push(`${pad + x},${(mid - env.up[x] * scale - 0.5).toFixed(1)}`);
      down.push(`${pad + x},${(mid - env.down[x] * scale + 0.5).toFixed(1)}`);
    }
    parts.push(`<polygon points="${[...up, ...down.reverse()].join(' ')}" fill="${STYLE.ink}"/>`);
    for (let t = 0; t <= row.seconds; t++) parts.push(`<rect x="${(pad + (t / longest) * inner).toFixed(1)}" y="${y + SHEET_WAVE}" width="1" height="5" fill="${STYLE.dim}"/>`);
    y += SHEET_WAVE + 30;
  }
  if (rows.length) {
    parts.push(textSvg(pad, y, `one tick is one second${SEP}every sound is drawn to the same scale of time${SEP}each wave is drawn to its own peak`, { ink: STYLE.dim }));
    y += 10;
  }
  const height = y + pad;
  return { width: SHEET_WIDTH, height, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_WIDTH}" height="${height}"><rect width="${SHEET_WIDTH}" height="${height}" fill="${STYLE.ground}"/>${parts.join('')}</svg>` };
}

export async function sheet(ctx, out = null) {
  const file = path.resolve(ctx.root, out ?? SHEET);
  const rows = sheetRows(ctx);
  const { svg, width, height } = sheetSvg(rows);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(file);
  writeJson(`${file}.json`, { kind: 'sound-sheet', width, height, sounds: rows.map((r) => ({ id: r.id, unit: r.unit, file: r.file, seconds: r.seconds, lufs: r.lufs, truePeakDb: r.truePeakDb, take: r.state?.kept ?? null })) });
  ctx.print(`sound: wrote ${path.relative(ctx.root, file)} with ${plural(rows.length, 'sound')}`);
  return file;
}

export async function soundCommand(a, deps = {}) {
  const ctx = {
    cfg: deps.cfg ?? config(),
    root: deps.root ?? (typeof a.root === 'string' ? path.resolve(a.root) : ROOT),
    cwd: deps.cwd ?? process.cwd(),
    print: deps.print ?? ((l) => console.log(l)),
    runner: deps.runner ?? spawnRunner,
    env: deps.env ?? process.env
  };
  const out = { ctx };
  if (a.cue !== undefined) {
    const cue = loadCue(ctx.root, one(a.cue, null));
    out.cue = cue;
    if (a.status !== undefined) out.takes = status(cue, ctx);
    else if (a.keep !== undefined) {
      const n = Number(one(a.keep, NaN));
      if (!Number.isInteger(n) || n < 1) throw new Error(`--keep takes the number of a take. ${USAGE}`);
      out.kept = keep(cue, ctx, n);
    } else if (a.take !== undefined) {
      if (typeof a.take !== 'string') throw new Error(`--take takes one sound file. ${USAGE}`);
      out.made = [standIn(cue, ctx, a.take)];
    } else {
      const takes = a.takes === undefined ? 1 : Number(one(a.takes, NaN));
      if (!Number.isInteger(takes) || takes < 1) throw new Error(`--takes takes a whole number of 1 or more. ${USAGE}`);
      out.made = make(cue, ctx, { takes, dryRun: a['dry-run'] !== undefined });
    }
  } else if (a.sheet === undefined) throw new Error(`name a cue or ask for the sheet. ${USAGE}`);
  if (a.sheet !== undefined) out.sheet = await sheet(ctx, typeof a.out === 'string' ? a.out : null);
  return out;
}

if (isMain(import.meta)) {
  soundCommand(args()).catch((e) => {
    console.error(`sound: ${String(e.message).split('\n')[0]}`);
    process.exit(1);
  });
}
