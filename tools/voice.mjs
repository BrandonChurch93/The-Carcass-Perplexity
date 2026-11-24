import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { ROOT, args, config, readJson } from './lib/paths.mjs';
import { isMain, one, STYLE, SEP, clean } from './lib/img.mjs';
import { decode, writeWav } from './lib/loudness.mjs';
import { readHandle, subscription, speak, spawnRunner, hide, HANDLE_ENV, HANDLE_FILE } from './lib/eleven.mjs';
import { KEPT_NARRATION, KEPT_LINES, RECORDS, ASSETS } from './checks/inputs.mjs';
import * as core from './lib/voice-core.mjs';

export const USAGE = 'usage: npm run voice [-- --status | --make [--takes N] [--dry-run] | --check | --keep | --sheet [--out PATH]] [n1 ... n8 | all]';
export const WORK = 'out/work/voice';
export const KEPT_CLIPS = KEPT_NARRATION;
export { KEPT_LINES, RECORDS, ASSETS };
export const SHEET = 'out/work/voice/sheet.png';
export const WORDS_TOOL = 'tools/voice/words.py';
export const SOUND_ALIKES = 'tools/voice/sound-alikes.json';
const STEPS = ['status', 'make', 'check', 'keep', 'sheet'];
const SHEET_WIDTH = 1600;
const SHEET_FONT = 15;
const SHEET_HEAD = 18;
const SPAN_INKS = ['#6fa8dc', '#e0a458', '#8fbf7f', '#c58fd6'];

const takeFile = (root, clip, k, ext) => path.join(root, WORK, clip, `take-${k}.${ext}`);
const readIf = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null);
const jsonIf = (file) => (fs.existsSync(file) ? readJson(file) : null);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function takesOnDisk(root, clip) {
  const dir = path.join(root, WORK, clip);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  return fs
    .readdirSync(dir)
    .map((f) => /^take-(\d+)\.mp3$/.exec(f))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}

export function keptState(root, clip) {
  if (!fs.existsSync(path.join(root, KEPT_CLIPS, `${clip}.mp3`))) return null;
  const text = readIf(path.join(root, RECORDS, `${clip}.md`));
  return text === null ? { made: null, kept: null, withFault: false, pitchHz: null, seconds: null, lines: [] } : core.readRecord(text);
}

export function newestCost(root, voice = core.VOICE) {
  const dir = path.join(root, WORK);
  let best = null;
  for (const clip of fs.existsSync(dir) ? fs.readdirSync(dir).sort() : []) {
    for (const k of takesOnDisk(root, clip)) {
      const headers = readIf(takeFile(root, clip, k, 'headers.txt'));
      const request = jsonIf(takeFile(root, clip, k, 'request.json'));
      if (!headers || !request || core.header(headers, 'character-cost') === null) continue;
      const at = new Date(core.header(headers, 'date') ?? 0).getTime() || 0;
      if (!best || at >= best.at) best = { at, perCharacter: core.costPerCharacter(headers, request.text, voice) };
    }
  }
  return best ? best.perCharacter : voice.costPerCharacter;
}

export function transcribe(file, { root = ROOT, model = core.VOICE.transcriber } = {}) {
  const r = spawnSync('python3', [path.join(root, WORDS_TOOL), model, file], { maxBuffer: 2 ** 26 });
  if (r.error) return { ran: false, why: 'python3 is missing' };
  if (r.status !== 0) {
    const err = String(r.stderr);
    return { ran: false, why: /No module named/.test(err) ? 'faster_whisper is missing' : `the transcriber failed: ${err.trim().split('\n').pop()}` };
  }
  const out = JSON.parse(String(r.stdout).trim().split('\n').pop());
  return { ran: true, model, text: out.text, words: out.words };
}

function clipsNamed(a, cfg) {
  const all = cfg.narration.clips.map((c) => c.id);
  const named = [a._, ...STEPS.map((s) => a[s]), a['dry-run']].flat().filter((v) => typeof v === 'string');
  if (named.length === 0 || named.includes('all')) return cfg.narration.clips;
  const wrong = named.find((n) => !all.includes(n));
  if (wrong) throw new Error(`${wrong} is not a clip. ${USAGE}`);
  return cfg.narration.clips.filter((c) => named.includes(c.id));
}

function account(ctx) {
  const handle = readHandle({ env: ctx.env, root: ctx.root });
  if (!handle) return { handle: null, sub: null };
  return { handle, sub: subscription({ handle, runner: ctx.runner }) };
}

export function status(clips, ctx) {
  const { handle, sub } = account(ctx);
  if (!handle) ctx.print('voice: no handle, so the account was not read.');
  else if (!sub.ok) ctx.print(`voice: the account could not be read: ${sub.why}`);
  else ctx.print(`voice: the account has ${sub.left} characters left of ${sub.character_limit}.`);
  for (const clip of clips) {
    const takes = takesOnDisk(ctx.root, clip.id);
    const checked = takes.filter((k) => fs.existsSync(takeFile(ctx.root, clip.id, k, 'check.json'))).length;
    const kept = keptState(ctx.root, clip.id);
    const state = kept ? `kept${kept.kept ? ` (take ${kept.kept}${kept.withFault ? ', with a fault' : ''})` : ''}` : 'not kept';
    ctx.print(`voice: ${clip.id} ${state}, ${plural(takes.length, 'take')} on disk, ${checked} checked`);
  }
}

export function make(clips, ctx, { takes = 1, dryRun = false, needHandle = true } = {}) {
  const handle = readHandle({ env: ctx.env, root: ctx.root });
  if (!handle) {
    if (needHandle) throw new Error(`no handle. Set ${HANDLE_ENV} or write it as the one line of ${HANDLE_FILE}`);
    ctx.print('voice: no handle, so no take was made.');
    return { made: [], stopped: false };
  }
  const made = [];
  const say = (line) => ctx.print(hide(line, handle));
  for (const clip of clips) {
    if (keptState(ctx.root, clip.id)) {
      say(`voice: ${clip.id} is kept, so no take was made`);
      continue;
    }
    for (let n = 0; n < takes; n++) {
      const have = takesOnDisk(ctx.root, clip.id);
      if (have.length >= ctx.cfg.narration.maxTakesPerClip) {
        say(`voice: ${clip.id} has its ${ctx.cfg.narration.maxTakesPerClip} takes, so no more are made`);
        break;
      }
      const k = (have[have.length - 1] ?? 0) + 1;
      const body = core.requestBody(clip, k, ctx.cfg);
      const cost = core.costOf(body.text, newestCost(ctx.root));
      const sub = subscription({ handle, runner: ctx.runner });
      if (!sub.ok) throw new Error(`the account could not be read: ${sub.why}`);
      if (dryRun) {
        say(`voice: ${clip.id} take ${k}, seed ${body.seed}, would cost about ${cost} characters of the ${sub.left} left. The text: ${JSON.stringify(body.text)}`);
        break;
      }
      if (sub.left < cost) {
        say(`voice: ${clip.id} not made. It needs about ${cost} characters and the account has ${sub.left} left.`);
        return { made, stopped: true };
      }
      const into = path.join(ctx.root, WORK, clip.id, `take-${k}`);
      const r = speak({ voiceId: core.VOICE.voiceId, body, into, handle, outputFormat: core.VOICE.outputFormat, runner: ctx.runner });
      if (!r.ok) throw new Error(`${clip.id} take ${k} failed with status ${r.status}: ${r.body.replace(/\s+/g, ' ')}`);
      made.push({ clip: clip.id, take: k });
      say(`voice: made ${path.relative(ctx.root, r.files.mp3)}, seed ${body.seed}`);
    }
  }
  return { made, stopped: false };
}

function loadTake(ctx, clip, k) {
  const rate = ctx.cfg.audio.sampleRate;
  const samples = decode(takeFile(ctx.root, clip.id, k, 'mp3'), { rate, channels: 1 })[0];
  return { rate, samples };
}

export function checkOne(clip, k, ctx) {
  const { rate, samples } = loadTake(ctx, clip, k);
  const response = jsonIf(takeFile(ctx.root, clip.id, k, 'response.json'));
  if (!response?.alignment) throw new Error(`${clip.id} take ${k} has no alignment in its response file`);
  const heard = ctx.transcribe(takeFile(ctx.root, clip.id, k, 'mp3'), { root: ctx.root });
  if (!heard.ran) ctx.print(`voice: the words of ${clip.id} take ${k} were not checked: ${heard.why}.`);
  const check = core.checkTake({ samples, rate, alignment: response.alignment, clip, heard, pairs: readJson(path.join(ctx.toolRoot, SOUND_ALIKES)), verdict: jsonIf(takeFile(ctx.root, clip.id, k, 'verdict.json')) });
  const headers = readIf(takeFile(ctx.root, clip.id, k, 'headers.txt'));
  const request = jsonIf(takeFile(ctx.root, clip.id, k, 'request.json'));
  const full = { ...check, take: k, seed: request?.seed ?? core.seedOf(k, ctx.cfg), day: core.headerDay(headers), characterCost: Number(core.header(headers, 'character-cost')) || null, requestId: core.header(headers, 'request-id'), historyItemId: core.header(headers, 'history-item-id') };
  fs.writeFileSync(takeFile(ctx.root, clip.id, k, 'check.json'), JSON.stringify(full, null, 2) + '\n');
  writeWav(takeFile(ctx.root, clip.id, k, 'listen.wav'), [core.toLoudness(samples, rate, core.LEVEL.listenLufs).samples], rate);
  return full;
}

export function check(clips, ctx) {
  const done = [];
  for (const clip of clips) {
    for (const k of takesOnDisk(ctx.root, clip.id)) {
      const old = jsonIf(takeFile(ctx.root, clip.id, k, 'check.json'));
      if (old && old.words?.result !== 'not run') continue;
      const c = checkOne(clip, k, ctx);
      done.push(c);
      ctx.print(`voice: ${clip.id} take ${k}, ${c.seconds.toFixed(2)} s, ${c.wpmSpeaking} words a minute while speaking, median pitch ${c.pitch.medianHz} Hz, ${c.lufs} LUFS, words ${c.words.result}. ${c.rejected ? `Rejected. ${c.reasons.join(' ')}` : c.words.result === 'not run' ? 'No fault by measure. The words were not checked.' : 'No fault.'}`);
    }
  }
  if (done.length === 0) ctx.print('voice: no take was waiting for a check');
  return done;
}

function withVerdict(c, verdict) {
  if (!verdict?.fault || c.verdict === verdict.fault) return c;
  return { ...c, verdict: verdict.fault, rejected: true, reasons: [...c.reasons, `The Builder's verdict names a fault: ${verdict.fault}.`] };
}

export function keepOne(clip, ctx) {
  const takes = takesOnDisk(ctx.root, clip.id);
  if (takes.length === 0) return null;
  const checks = takes.map((k) => withVerdict(jsonIf(takeFile(ctx.root, clip.id, k, 'check.json')) ?? checkOne(clip, k, ctx), jsonIf(takeFile(ctx.root, clip.id, k, 'verdict.json'))));
  const others = ctx.cfg.narration.clips.filter((c) => c.id !== clip.id).map((c) => keptState(ctx.root, c.id)?.pitchHz).filter((v) => Number.isFinite(v));
  const choice = core.chooseTake(checks.map((c) => ({ take: c.take, rejected: c.rejected, reasons: c.reasons, wpm: c.wpmSpeaking, pitchHz: c.pitch.medianHz })), others);
  const kept = checks.find((c) => c.take === choice.take);
  if (kept.words.result === 'not run') choice.why += ` Its words were not checked: ${kept.words.why}.`;
  const { rate, samples } = loadTake(ctx, clip, kept.take);
  const linesOut = core.cutLines(samples, rate, kept.lines);
  const paths = { clip: `${KEPT_CLIPS}/${clip.id}.mp3`, lines: kept.lines.map((l) => `${KEPT_LINES}/${clip.id}-${l.line}.wav`) };
  fs.mkdirSync(path.join(ctx.root, KEPT_CLIPS), { recursive: true });
  fs.copyFileSync(takeFile(ctx.root, clip.id, kept.take, 'mp3'), path.join(ctx.root, paths.clip));
  linesOut.parts.forEach((part, i) => writeWav(path.join(ctx.root, paths.lines[i]), [part], rate));
  const listeners = [1, 2].map((n) => readIf(takeFile(ctx.root, clip.id, kept.take, `listener-${n}.txt`))).filter((t) => t !== null).map((t) => t.trim().replace(/\s+/g, ' '));
  const record = core.recordText({ clip, cfg: ctx.cfg, takes: checks, choice, kept, linesOut, listeners, day: kept.day, paths });
  fs.mkdirSync(path.join(ctx.root, RECORDS), { recursive: true });
  fs.writeFileSync(path.join(ctx.root, RECORDS, `${clip.id}.md`), record);
  for (const l of kept.lines) fs.writeFileSync(path.join(ctx.root, RECORDS, `${clip.id}-${l.line}.md`), core.lineRecordText({ clip, line: l.line, cfg: ctx.cfg, kept, takes: checks, choice, linesOut, day: kept.day, paths }));
  const assets = path.join(ctx.root, ASSETS);
  const row = core.assetsRow({ file: paths.clip, takes: core.takesLine(checks.length, kept.take, choice.withFault), day: kept.day });
  fs.writeFileSync(assets, core.withAssetsRow(fs.readFileSync(assets, 'utf8'), paths.clip, row));
  ctx.print(`voice: ${clip.id}. ${choice.why}`);
  for (const l of kept.lines) ctx.print(`voice: ${paths.lines[l.line - 1]}, ${core.lineSummary(l)}`);
  return { clip: clip.id, choice, kept, linesOut, paths };
}

export function keep(clips, ctx) {
  const out = [];
  for (const clip of clips) {
    const r = keepOne(clip, ctx);
    if (r) out.push(r);
    else ctx.print(`voice: ${clip.id} has no take to keep`);
  }
  return out;
}

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textSvg = (x, y, text, { size = SHEET_FONT, ink = STYLE.ink, weight = 400 } = {}) => `<text x="${x}" y="${y}" font-family="${STYLE.family}" font-size="${size}" font-weight="${weight}" fill="${ink}">${esc(clean(text))}</text>`;

export function sheetRows(clips, ctx) {
  return clips.map((clip) => {
    const state = keptState(ctx.root, clip.id);
    if (!state) return { clip, kept: false };
    const rate = ctx.cfg.audio.sampleRate;
    const samples = decode(path.join(ctx.root, KEPT_CLIPS, `${clip.id}.mp3`), { rate, channels: 1 })[0];
    return { clip, kept: true, state, samples, seconds: samples.length / rate };
  });
}

export function sheetSvg(rows) {
  const pad = 20;
  const inner = SHEET_WIDTH - 2 * pad;
  const wave = 120;
  const lineStep = 24;
  const parts = [];
  let y = pad;
  for (const row of rows) {
    const name = `${row.clip.id}${SEP}${row.clip.name}`;
    if (!row.kept) {
      parts.push(textSvg(pad, y + SHEET_HEAD, `${name}${SEP}not made yet`, { size: SHEET_HEAD, weight: 700 }));
      row.clip.lines.forEach((l, i) => parts.push(textSvg(pad + (i % 2) * (inner / 2), y + SHEET_HEAD + lineStep * (1 + Math.floor(i / 2)), `${i + 1}${SEP}${l}`, { ink: STYLE.dim })));
      y += SHEET_HEAD + lineStep * 2 + 26;
      continue;
    }
    const s = row.state;
    const head = s.kept === null ? `${name}${SEP}kept, with no record` : `${name}${SEP}take ${s.kept} kept${s.withFault ? ' with a fault' : ''} of ${plural(s.made, 'take')}${SEP}${row.seconds.toFixed(2)} s${s.pitchHz ? `${SEP}median pitch ${s.pitchHz} Hz` : ''}`;
    parts.push(textSvg(pad, y + SHEET_HEAD, head, { size: SHEET_HEAD, weight: 700 }));
    y += SHEET_HEAD + 12;
    parts.push(`<rect x="${pad}" y="${y}" width="${inner}" height="${wave}" fill="${STYLE.stripGround}"/>`);
    const px = (t) => pad + (t / row.seconds) * inner;
    s.lines.forEach((l, i) => {
      const ink = SPAN_INKS[i % SPAN_INKS.length];
      parts.push(`<rect x="${px(l.start).toFixed(1)}" y="${y}" width="${(px(l.start + l.seconds) - px(l.start)).toFixed(1)}" height="${wave}" fill="${ink}" fill-opacity="0.22"/>`);
      parts.push(`<rect x="${px(l.start).toFixed(1)}" y="${y + wave - 4}" width="${(px(l.start + l.seconds) - px(l.start)).toFixed(1)}" height="4" fill="${ink}"/>`);
      parts.push(textSvg(px(l.start) + 6, y + SHEET_FONT + 4, String(l.line), { ink, weight: 700 }));
    });
    const mid = y + wave / 2;
    const per = row.samples.length / inner;
    let top = 0;
    for (let i = 0; i < row.samples.length; i++) top = Math.max(top, Math.abs(row.samples[i]));
    const scale = top > 0 ? (wave / 2 - 6) / top : 0;
    const up = [];
    const down = [];
    for (let x = 0; x < inner; x++) {
      let lo = 0;
      let hi = 0;
      for (let i = Math.floor(x * per); i < Math.floor((x + 1) * per); i++) {
        if (row.samples[i] < lo) lo = row.samples[i];
        if (row.samples[i] > hi) hi = row.samples[i];
      }
      up.push(`${pad + x},${(mid - hi * scale - 0.5).toFixed(1)}`);
      down.push(`${pad + x},${(mid - lo * scale + 0.5).toFixed(1)}`);
    }
    parts.push(`<polygon points="${[...up, ...down.reverse()].join(' ')}" fill="${STYLE.ink}"/>`);
    for (let t = 0; t <= row.seconds; t++) parts.push(`<rect x="${px(t).toFixed(1)}" y="${y + wave}" width="1" height="5" fill="${STYLE.dim}"/>`);
    y += wave + 8;
    parts.push(textSvg(pad + inner - 150, y + SHEET_FONT - 1, 'one tick is one second', { ink: STYLE.dim }));
    y += 4;
    s.lines.forEach((l, i) => {
      const ink = SPAN_INKS[i % SPAN_INKS.length];
      const ly = y + lineStep * (i + 1);
      parts.push(`<rect x="${pad}" y="${ly - 12}" width="12" height="12" fill="${ink}"/>`);
      parts.push(textSvg(pad + 20, ly, `${l.line}${SEP}${l.text}${SEP}${l.seconds.toFixed(2)} s${SEP}${l.wpm} words a minute${SEP}${l.pitchHz === null ? 'no pitch found' : `${l.pitchHz} Hz`}`));
    });
    y += lineStep * s.lines.length + 26;
  }
  const height = y + pad - 16;
  return { width: SHEET_WIDTH, height, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_WIDTH}" height="${height}"><rect width="${SHEET_WIDTH}" height="${height}" fill="${STYLE.ground}"/>${parts.join('')}</svg>` };
}

export async function sheet(clips, ctx, out = null) {
  const file = path.resolve(ctx.root, out ?? SHEET);
  const { svg } = sheetSvg(sheetRows(clips, ctx));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(file);
  ctx.print(`voice: wrote ${path.relative(ctx.root, file)}`);
  return file;
}

export async function voiceCommand(a, deps = {}) {
  const ctx = {
    cfg: deps.cfg ?? config(),
    root: deps.root ?? ROOT,
    toolRoot: deps.toolRoot ?? ROOT,
    print: deps.print ?? ((l) => console.log(l)),
    runner: deps.runner ?? spawnRunner,
    env: deps.env ?? process.env,
    transcribe: deps.transcribe ?? ((file) => transcribe(file, { root: deps.toolRoot ?? ROOT }))
  };
  const steps = STEPS.filter((s) => a[s] !== undefined);
  const clips = clipsNamed(a, ctx.cfg);
  const takes = a.takes === undefined ? 1 : Number(one(a.takes, NaN));
  if (!Number.isInteger(takes) || takes < 1) throw new Error(`--takes takes a whole number of 1 or more. ${USAGE}`);
  const whole = steps.length === 0;
  const does = (s) => whole || steps.includes(s);
  if (does('status') && !whole) status(clips, ctx);
  if (does('make')) {
    try {
      make(clips, ctx, { takes, dryRun: a['dry-run'] !== undefined, needHandle: !whole });
    } catch (e) {
      if (!whole) throw e;
      ctx.print(`voice: no take was made: ${String(e.message).split('\n')[0]}`);
    }
  }
  if (does('check')) check(clips, ctx);
  if (does('keep')) keep(clips, ctx);
  if (does('sheet')) await sheet(clips, ctx, typeof a.out === 'string' ? a.out : null);
  return ctx;
}

if (isMain(import.meta)) {
  voiceCommand(args()).catch((e) => {
    console.error(`voice: ${String(e.message).split('\n')[0]}`);
    process.exit(1);
  });
}
