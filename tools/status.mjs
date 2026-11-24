import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT, config, readJson, writeJson, utc } from './lib/paths.mjs';
import * as progress from './lib/progress.mjs';
import * as core from './lib/clock-core.mjs';
import { run as clockRun, load as clockLoad } from './clock.mjs';
import { readLooks } from './look.mjs';
import { compareKey as realCompare } from './compare.mjs';
import { STYLE, clean, isMain } from './lib/img.mjs';

export const USAGE =
  'usage: npm run status -- --phase N [--unit ID] [--key ID] [--review-round N | --extension N] [--sounds] [--no-render] [--no-tick] [--note "one line" ...] [--pick "FILE=caption" ...] [--pick FILE --caption "text" ...] [--number N] [--max N]';

export const JPEG_QUALITY = 84;
export const SLUG_LENGTH = 28;
export const MENTIONS = 3;
export const MENTION_LENGTH = 140;
export const CONTACT_CAPTION = 'The approved contact sheet. Nothing has been rendered yet';
export const CONTACT_CAPTION_AGAIN = 'The approved contact sheet. Nothing new has been rendered since the last status';
export const SOUNDS_CAPTION = 'The kept narration and sounds as waveforms, each with its name and length. They can be heard on the review page';

const PICTURE = /\.(jpe?g|png|webp)$/i;
const STAMP = '\\d{4}-\\d\\d-\\d\\d \\d\\d:\\d\\d';

const stamp = (iso) => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

export function slug(text) {
  const s = String(text).toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/^\d+-(?=.)/, '');
  if (s.length <= SLUG_LENGTH) return s || 'picture';
  const cut = s.slice(0, SLUG_LENGTH);
  const at = cut.lastIndexOf('-');
  return (at > SLUG_LENGTH / 2 ? cut.slice(0, at) : cut).replace(/-+$/, '');
}

export function phaseName(text, phase) {
  for (const line of progress.getSection('Phases', text).split('\n')) {
    const m = line.match(/^\|\s*(\d+)\s*·\s*([^|]+?)\s*\|/);
    if (m && Number(m[1]) === Number(phase)) return `Phase ${m[1]}, ${lower(m[2])}.`;
  }
  return `Phase ${phase}.`;
}

export function renderLocked(file) {
  if (!fs.existsSync(file)) return false;
  const m = fs.readFileSync(file, 'utf8').match(/\d+/);
  if (!m) return false;
  try {
    process.kill(Number(m[0]), 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

export async function shrink(file, longEdge) {
  const { data, info } = await sharp(file)
    .flatten({ background: STYLE.ground })
    .resize({ width: longEdge, height: longEdge, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function lastReading({ phase, reviewRound, extension, budget }) {
  const state = clockLoad();
  const at = state.last?.at ?? utc();
  if (reviewRound === undefined && extension === undefined) return clockRun({ show: String(phase), at });
  const round = reviewRound !== undefined;
  const n = String(round ? reviewRound : extension);
  const used = (round ? state.reviewRounds : state.extensions)[n] ?? 0;
  const allowed = (round ? budget.reviewRoundHours : budget.extendHours) * 3600;
  const since = state.lastStatus ? Math.max(0, Date.parse(at) - Date.parse(state.lastStatus)) / 60000 : null;
  const report = { label: round ? 'review round' : 'extension', n: Number(n), used, allowed, extraRounds: used < allowed, minutesSinceStatus: since };
  return { now: at, lines: core.linesSide(report) };
}

function readClock(o, budget) {
  if (o.reading) return o.reading;
  if (o.tick === false) return lastReading({ ...o, budget });
  const a = { 'status-posted': true };
  if (o.phase !== undefined) a.phase = String(o.phase);
  if (o.reviewRound !== undefined) a['review-round'] = String(o.reviewRound);
  if (o.extension !== undefined) a.extension = String(o.extension);
  return (o.clock ?? clockRun)(a);
}

function previous(body, number) {
  const lines = body.split('\n');
  const out = [];
  const head = new RegExp(`^Status (\\d+), (${STAMP}) UTC:\\s*$`);
  const start = lines.findIndex((l) => head.test(l));
  let rest = lines.slice(1);
  if (start >= 0) {
    const m = lines[start].match(head);
    const captions = [];
    let i = start + 1;
    for (; i < lines.length; i++) {
      const c = lines[i].match(/^- `[^`]*`: (.*)$/);
      if (c) captions.push(c[1].trim().replace(/\.+$/, ''));
      else if (lines[i].trim() !== '') break;
    }
    let said = (captions.join('; ') || 'no picture') + '.';
    if (said.length > MENTION_LENGTH) {
      const cut = said.slice(0, MENTION_LENGTH);
      const end = cut.lastIndexOf('. ');
      said = end > 0 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '').replace(/[,;:.]+$/, '') + '...';
    }
    out.push({ n: Number(m[1]), text: `Status ${m[1]}, ${m[2]} UTC, showed: ${said}` });
    rest = lines.slice(i);
  }
  const split = new RegExp(`(?=Status \\d+, ${STAMP} UTC, )`);
  for (const part of rest.join(' ').split(split)) {
    const t = part.trim();
    const m = t.match(/^Status (\d+), /);
    if (m) out.push({ n: Number(m[1]), text: t });
  }
  return out.filter((x) => x.n < number).slice(0, MENTIONS).map((x) => x.text);
}

export async function buildStatus(options = {}) {
  const o = { render: true, tick: true, notes: [], picks: [], ...options };
  const cfg = o.cfg ?? config();
  const root = o.root ?? ROOT;
  const stillsDir = o.stillsDir ?? path.join(root, 'out', 'stills', 'status');
  const workDir = o.workDir ?? path.join(root, 'out', 'work', 'status');
  const lockFile = o.lockFile ?? path.join(root, 'out', 'work', 'render.lock');
  const soundSheet = o.soundSheet ?? path.join(root, 'out', 'work', 'sound', 'sheet.png');
  const contactSheet = o.contactSheet ?? path.join(root, 'references', 'approved', 'contact-sheet.jpg');
  const log = o.log ?? console.log;
  const abs = (f) => path.resolve(root, f);
  const short = (f) => path.relative(root, abs(f));

  const readProgress = () => (o.progressFile ? fs.readFileSync(o.progressFile, 'utf8') : progress.read());
  const writeProgress = (s) => (o.progressFile ? fs.writeFileSync(o.progressFile, s) : progress.write(s));

  const reading = readClock(o, cfg.budget);
  const at = o.now ?? (o.tick === false ? utc() : reading.now);
  let text = readProgress();

  const limit = Math.max(1, Math.min(cfg.status.maxPictures, o.max === undefined ? cfg.status.maxPictures : Number(o.max) || cfg.status.maxPictures));
  const looks = (typeof o.looks === 'function' ? o.looks() : o.looks ?? readLooks()).filter((l) => l && l.file);
  const newest = new Map();
  for (const l of looks) if (!newest.has(short(l.file)) || newest.get(short(l.file)).at <= l.at) newest.set(short(l.file), l);
  const shownFile = path.join(workDir, 'shown.json');
  const shown = fs.existsSync(shownFile) ? readJson(shownFile).shown ?? {} : {};

  const chosen = [];
  const seen = new Set();
  const add = async (file, caption, name, seenAt) => {
    const full = abs(file);
    if (chosen.length >= limit || seen.has(full)) return false;
    if (!fs.existsSync(full)) {
      log(`status: no such picture ${short(file)}, left out`);
      return false;
    }
    let small;
    try {
      small = await shrink(full, cfg.status.pictureLongEdgePx);
    } catch (e) {
      log(`status: ${short(file)} could not be read, left out`);
      return false;
    }
    seen.add(full);
    chosen.push({ source: short(file), caption: clean(caption), slug: slug(name ?? path.basename(full)), seenAt, ...small });
    return true;
  };
  const stampOf = (file) => {
    const l = newest.get(short(file));
    return l && l.at > at ? l.at : at;
  };

  if (o.sounds && fs.existsSync(soundSheet)) await add(soundSheet, SOUNDS_CAPTION, 'sounds', stampOf(soundSheet));
  for (const p of o.picks) {
    const caption = p.caption ?? newest.get(short(p.file))?.caption ?? path.basename(p.file);
    await add(p.file, caption, null, stampOf(p.file));
  }

  let compared = false;
  if (o.unit !== undefined && chosen.length < limit) {
    const key = o.key ?? cfg.keys.find((k) => k.unit === o.unit)?.id;
    if (!key) log(`status: no key for the unit ${o.unit}, no comparison`);
    else if (!o.render) log('status: rendering is off, no comparison');
    else if (renderLocked(lockFile)) log('status: a render job is running, no comparison');
    else {
      compared = true;
      try {
        const made = await (o.compareKey ?? realCompare)({ key, tier: 'review', format: 'hd', by: 'status' });
        const title = cfg.keys.find((k) => k.id === key)?.title ?? key;
        await add(made.file, `${title}. The approved picture beside the frame as it renders now`, `compare-${key}`, utc());
      } catch (e) {
        log(`status: the comparison of ${key} failed, carrying on without it: ${clean(e.message)}`);
      }
    }
  }

  const fresh = [...newest.values()].filter((l) => !(shown[short(l.file)] >= l.at)).sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  for (const l of fresh) {
    if (chosen.length >= limit) break;
    if (!PICTURE.test(l.file) || !fs.existsSync(abs(l.file))) continue;
    await add(l.file, l.caption || path.basename(l.file), null, l.at);
  }

  if (!chosen.length) {
    const before = looks.length > 0 || Object.keys(shown).length > 0;
    await add(contactSheet, before ? CONTACT_CAPTION_AGAIN : CONTACT_CAPTION, 'contact-sheet', null);
  }
  if (!chosen.length) throw new Error('status: no picture could be read, not even the approved contact sheet');

  const digits = Math.max(2, String(chosen.length).length);
  chosen.forEach((p, i) => {
    p.name = `${String(i + 1).padStart(digits, '0')}-${p.slug}.jpg`;
  });

  const statusFile = path.join(stillsDir, 'STATUS.md');
  let number = o.number !== undefined ? Number(o.number) : null;
  if (number === null) {
    const old = fs.existsSync(statusFile) ? fs.readFileSync(statusFile, 'utf8').match(/^# Status (\d+)/m) : null;
    const logged = progress.getSection('Latest pictures', text).match(/^Status (\d+),/m);
    number = (old ? Number(old[1]) : logged ? Number(logged[1]) : 0) + 1;
  }

  const head = [];
  if (o.phase !== undefined) head.push(phaseName(text, o.phase));
  if (o.unit !== undefined) head.push(`Unit ${o.unit}.`);
  if (o.reviewRound !== undefined) head.push(`Review round ${o.reviewRound}.`);
  if (o.extension !== undefined) head.push(`Extension ${o.extension}.`);
  const headline = head.join(' ');
  const list = chosen.map((p) => `- \`${p.name}\`: ${p.caption}`);

  fs.mkdirSync(stillsDir, { recursive: true });
  for (const f of fs.readdirSync(stillsDir)) if (PICTURE.test(f)) fs.rmSync(path.join(stillsDir, f));
  for (const p of chosen) fs.writeFileSync(path.join(stillsDir, p.name), p.data);
  fs.writeFileSync(statusFile, [`# Status ${number}`, '', `${stamp(at)} UTC.${headline ? ' ' + headline : ''}`, '', ...list, ''].join('\n'));

  const page = (progress.getSection('Status', text).match(/^- Review page:\s*(.*)$/m)?.[1] ?? 'none').trim();
  const lines = [
    `Status ${number}. ${headline}`.trim(),
    ...o.notes.map(clean).filter(Boolean),
    ...reading.lines.filter((l) => / used of /.test(l)),
    ...chosen.map((p) => `- ${p.name}: ${p.caption}`),
  ];
  if (page && page !== 'none') lines.push(`Review page: ${page}`);

  const jsonFile = path.join(workDir, 'status.json');
  writeJson(jsonFile, { pics: chosen.map((p) => ({ label: p.caption, w: p.w, h: p.h, src: `data:image/jpeg;base64,${p.data.toString('base64')}` })) });
  fs.writeFileSync(path.join(workDir, 'note.txt'), lines.join('\n') + '\n');
  for (const p of chosen) if (p.seenAt) shown[p.source] = p.seenAt;
  writeJson(shownFile, { shown });

  const latest = progress.getSection('Latest pictures', text);
  const first = latest.split('\n')[0];
  const keep = /^Status \d+,/.test(first) ? [] : [first, ''];
  const mentions = previous(latest, number);
  text = progress.setSection('Latest pictures', [...keep, `Status ${number}, ${stamp(at)} UTC:`, '', ...list, ...(mentions.length ? ['', ...mentions] : [])].join('\n'), text);
  const clock = progress.getSection('Clock', text).split('\n')[0];
  if (o.tick !== false) text = progress.setSection('Clock', [...(clock.startsWith('```') ? [] : [clock, '']), '```', reading.now, ...reading.lines, '```'].join('\n'), text);
  writeProgress(text);

  for (const l of lines) log(l);
  return {
    number,
    at,
    lines,
    clock: [reading.now, ...reading.lines],
    compared,
    statusFile,
    jsonFile,
    pictures: chosen.map((p) => ({ name: p.name, file: path.join(stillsDir, p.name), source: p.source, caption: p.caption, w: p.w, h: p.h })),
  };
}

function every(argv, name) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== `--${name}`) continue;
    while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) out.push(argv[++i]);
  }
  return out;
}

export function parse(argv = process.argv.slice(2), root = ROOT) {
  const value = (name) => every(argv, name)[0];
  const captions = every(argv, 'caption');
  const picks = every(argv, 'pick').map((p) => {
    const cut = p.indexOf('=');
    if (cut > 0 && !fs.existsSync(path.resolve(root, p))) return { file: p.slice(0, cut), caption: p.slice(cut + 1) };
    return { file: p, caption: captions.shift() };
  });
  return {
    phase: value('phase'),
    unit: value('unit'),
    key: value('key'),
    reviewRound: value('review-round'),
    extension: value('extension'),
    number: value('number'),
    max: value('max'),
    sounds: argv.includes('--sounds'),
    render: !argv.includes('--no-render'),
    tick: !argv.includes('--no-tick'),
    notes: every(argv, 'note'),
    picks,
  };
}

async function command() {
  const o = parse();
  if (o.phase === undefined && o.reviewRound === undefined && o.extension === undefined) {
    console.log(USAGE);
    process.exitCode = 1;
    return;
  }
  const out = await buildStatus(o);
  if (out.compared) {
    try {
      await (await import('./lib/render.mjs')).closeRenderer();
    } catch {}
  }
  console.log('');
  console.log('The clock, for the Builder and not part of the status:');
  for (const l of out.clock) console.log(l);
}

if (isMain(import.meta)) {
  command().catch((e) => {
    console.error(`status: ${e.message}`);
    process.exit(1);
  });
}
