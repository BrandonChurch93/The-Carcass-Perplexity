// The script sheet: lays cut/SCRIPT-DRAFT.json against the cut list and writes cut/SCRIPT-SHEET.json, cut/SCRIPT-SHEET.md,
// one small picture for every shot a line falls on and one sheet picture a clip, all under out/stills/script.
// It makes no sound and it does not touch narration.clips in the config: the draft stays a draft until the script is final.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { ROOT, rel, readJson, writeJson, config, args } from './lib/paths.mjs';
import { layout, disagreements, markdown, clipHtml, unnamedHtml, rulesHtml, clock, SHEET_CSS } from './lib/script-sheet-core.mjs';

export const DRAFT = rel('cut', 'SCRIPT-DRAFT.json');
export const SHEET = rel('cut', 'SCRIPT-SHEET.json');
export const SHEET_MD = rel('cut', 'SCRIPT-SHEET.md');
export const DIR = rel('out', 'stills', 'script');
const THUMB = { width: 480, height: 270 };
const PREVIEW = rel('deliver', 'film', 'the-carcass-preview.mp4');
const HEART = rel('deliver', 'film', 'heart-review.mp4');
// Shots that are one long move: a key picture shows one moment of them, so a frame of the blockout shows what the camera sees as the line is said.
const MOVES = ['ribs-01', 'reveal-01'];
const PAGE_WIDTH = 800;
const PAGE_SCALE = 1.5;

export const PAGE_VARS = `:root { --bg: #151210; --raise: #1d1916; --well: #0d0b0a; --line: #2f2925; --text: #e7e0d6; --soft: #a89e93; --faint: #80776e; --ember: #e8662c; --serif: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif; --sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }`;

const short = (f) => path.relative(ROOT, f);
const tag = (s) => String(Math.round(s * 10)).padStart(4, '0');

async function fromVideo(video, seconds, file) {
  const tmp = path.join(os.tmpdir(), `carcass-script-${process.pid}.png`);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', Math.max(0, seconds).toFixed(3), '-i', video, '-frames:v', '1', tmp], { encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(tmp)) throw new Error(`no frame at ${seconds.toFixed(2)} s of ${short(video)}: ${(r.stderr ?? '').trim()}`);
  await sharp(tmp).resize(THUMB.width, THUMB.height, { fit: 'cover' }).jpeg({ quality: 82 }).toFile(file);
  fs.rmSync(tmp, { force: true });
}

async function fromKey(image, file) {
  await sharp(rel(image)).resize(THUMB.width, THUMB.height, { fit: 'cover' }).jpeg({ quality: 82 }).toFile(file);
}

// Which pictures stand beside a line: one for each shot it falls on, the two it lies on longest, in film order.
export function picturePlan(row, cut, cfg, have = { heart: true, preview: true }) {
  const fps = cut.fps;
  const heart = cut.places.find((p) => p.unit === 'heart');
  const top = [...row.shots].sort((a, b) => b.seconds - a.seconds).slice(0, 2).sort((a, b) => a.from - b.from);
  const out = [];
  const keyOf = (id) => cfg.keys.find((k) => k.id === id);
  for (const s of top) {
    const unit = cut.shots.find((x) => x.id === s.id).unit;
    const mid = (Math.max(row.start, s.from) + Math.min(row.end, s.to)) / 2;
    if (unit === 'heart' && have.heart) {
      out.push({ video: HEART, at: mid - heart.first / fps, name: `${row.id.replace('.', '-')}-${s.id}-${tag(mid)}`, label: `${s.id} at ${clock(mid)} · the Heart review clip, final tier` });
    } else if (MOVES.includes(s.id)) {
      if (have.preview) out.push({ video: PREVIEW, at: mid, name: `${row.id.replace('.', '-')}-${s.id}-${tag(mid)}`, label: `${s.id} at ${clock(mid)} · blockout, framing only` });
      const near = cfg.keys
        .filter((k) => k.unit === unit && cut.keyFrames[k.id] !== undefined && (s.id !== 'ribs-01' || k.id === s.picture))
        .sort((a, b) => Math.abs(cut.keyFrames[a.id] / fps - mid) - Math.abs(cut.keyFrames[b.id] / fps - mid))[0];
      if (near) out.push({ key: near.id, name: `key-${near.id}`, label: `approved key picture ${near.id}, which falls at ${clock(cut.keyFrames[near.id] / fps)}` });
    } else if (keyOf(s.picture)) {
      out.push({ key: s.picture, name: `key-${s.picture}`, label: `${s.id} · approved key picture ${s.picture}` });
    }
  }
  return out.slice(0, 2);
}

async function make(plan, cfg, made) {
  const file = path.join(DIR, `${plan.name}.jpg`);
  if (!made.has(file)) {
    if (plan.video) await fromVideo(plan.video, plan.at, file);
    else await fromKey(cfg.keys.find((k) => k.id === plan.key).image, file);
    made.add(file);
  }
  return { file: short(file), label: plan.label, width: THUMB.width, height: THUMB.height };
}

const dataUrl = (file) => `data:image/jpeg;base64,${fs.readFileSync(rel(file)).toString('base64')}`;

export function sheetPage(sheet, clip, n, of) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
${PAGE_VARS}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.5 var(--sans); -webkit-font-smoothing: antialiased; }
main { width: ${PAGE_WIDTH}px; padding: 26px 28px 6px; }
.top { display: flex; justify-content: space-between; margin: 0 0 20px; color: var(--faint); font: 13px/1 var(--mono); letter-spacing: 0.04em; text-transform: uppercase; }
${SHEET_CSS}
.script-clip { margin: 0; }
.script-clip .row:last-child { border-bottom: 0; }
</style></head><body><main class="script-sheet narrow"><div class="top"><span>The Carcass · the script sheet · draft</span><span>${n} of ${of}</span></div>
${clipHtml(sheet, clip, { src: (p) => dataUrl(p.file) })}
</main></body></html>`;
}

async function pictures(sheet) {
  const { chromium } = await import('playwright-core');
  const { browserPath, FLAGS } = await import('./lib/render.mjs');
  const browser = await chromium.launch({ executablePath: browserPath(), headless: true, args: FLAGS });
  const out = [];
  try {
    const page = await browser.newPage({ viewport: { width: PAGE_WIDTH, height: 900 }, deviceScaleFactor: PAGE_SCALE });
    for (const [i, c] of sheet.clips.entries()) {
      await page.setContent(sheetPage(sheet, c.id, i + 1, sheet.clips.length), { waitUntil: 'load' });
      const png = await (await page.$('main')).screenshot({ type: 'png' });
      const file = path.join(DIR, `script-${c.id}.jpg`);
      const info = await sharp(png).jpeg({ quality: 88, chromaSubsampling: '4:4:4' }).toFile(file);
      out.push({ clip: c.id, file: short(file), width: info.width, height: info.height });
    }
  } finally {
    await browser.close();
  }
  return out;
}

// The whole sheet for the thread: one block of markup a clip, the two closing lists and the style, with the small pictures inside it.
export function inlineSheet(sheet) {
  const src = (p) => dataUrl(p.file);
  return {
    css: `${PAGE_VARS.replace(':root', '.script-sheet')}\n${SHEET_CSS}`,
    totals: sheet.totals,
    clips: sheet.clips.map((c) => ({ id: c.id, title: c.title, marked: sheet.rows.filter((r) => r.clip === c.id && r.mark).length, html: clipHtml(sheet, c.id, { src }) })),
    unnamed: unnamedHtml(sheet, { src }),
    rules: rulesHtml(sheet)
  };
}

export function table(sheet) {
  return sheet.rows
    .map((r) => `${r.id.padEnd(5)} ${clock(r.start).padStart(7)} to ${clock(r.end).padStart(7)} ${r.seconds.toFixed(2).padStart(5)} s  spare ${(r.spare === null ? '  -' : r.spare.toFixed(2)).padStart(5)}  spill ${r.spill.toFixed(2)}  ${r.verdict.padEnd(8)} ${r.mark ? `[${r.mark.kind}] ${r.mark.replace.map((x) => `${x.seconds.toFixed(2)} s ${x.verdict} ${x.spare === null ? '-' : x.spare.toFixed(2)}`).join(' | ')}` : ''}${r.faults.length ? `\n        ${r.faults.join('\n        ')}` : ''}`)
    .join('\n');
}

async function main() {
  const a = args();
  const cfg = config();
  const cut = readJson(rel('cut', 'CUTLIST.json'));
  const map = readJson(rel('cut', 'MAP.json'));
  const sheet = layout(readJson(DRAFT), cut, map, cfg);
  console.log(table(sheet));
  const bad = disagreements(sheet);
  if (bad.length) {
    console.error(`\nscript: the marks in ${short(DRAFT)} and the estimate disagree in ${bad.length} place(s):\n- ${bad.join('\n- ')}`);
    if (!a.force) process.exit(1);
  }
  if (a.check) {
    console.log(`\nscript: ${sheet.totals.lines} lines, ${sheet.totals.marked} marked (${sheet.totals.byKind.length} too long, ${sheet.totals.byKind.tight} tight, ${sheet.totals.byKind.picture} for the picture). The marks and the estimate agree.`);
    return;
  }

  fs.mkdirSync(DIR, { recursive: true });
  const have = { heart: fs.existsSync(HEART), preview: fs.existsSync(PREVIEW) };
  if (!have.heart) console.log(`script: ${short(HEART)} is not here, the Heart's lines get their approved key pictures`);
  if (!have.preview) console.log(`script: ${short(PREVIEW)} is not here, the two long moves get their approved key pictures only`);
  const made = new Set();
  for (const r of sheet.rows) {
    r.pictures = [];
    for (const p of picturePlan(r, cut, cfg, have)) r.pictures.push(await make(p, cfg, made));
  }
  for (const u of sheet.unnamed) {
    const shot = cut.shots.find((x) => x.id === u.shot);
    const mid = (u.from + u.to) / 2;
    const heart = cut.places.find((p) => p.unit === 'heart');
    const plan =
      shot.unit === 'heart' && have.heart
        ? { video: HEART, at: mid - heart.first / cut.fps, name: `shown-${u.shot}-${tag(mid)}`, label: `${u.shot} at ${clock(mid)} · the Heart review clip, final tier` }
        : { key: u.picture, name: `key-${u.picture}`, label: `${u.shot} · approved key picture ${u.picture}` };
    u.thumb = await make(plan, cfg, made);
  }
  sheet.sheets = a['no-pictures'] ? [] : await pictures(sheet);
  for (const s of sheet.sheets) made.add(rel(s.file));
  for (const f of fs.readdirSync(DIR)) if (!made.has(path.join(DIR, f))) fs.rmSync(path.join(DIR, f));
  writeJson(SHEET, sheet);
  fs.writeFileSync(SHEET_MD, markdown(sheet));
  if (typeof a.inline === 'string') {
    writeJson(path.resolve(a.inline), inlineSheet(sheet));
    console.log(`script: wrote the sheet for the thread to ${short(path.resolve(a.inline))}`);
  }
  console.log(`\nscript: ${sheet.totals.lines} lines, ${sheet.totals.marked} marked (${sheet.totals.byKind.length} too long, ${sheet.totals.byKind.tight} tight, ${sheet.totals.byKind.picture} for the picture).`);
  console.log(`script: wrote ${short(SHEET)}, ${short(SHEET_MD)}, ${made.size - sheet.sheets.length} small pictures and ${sheet.sheets.length} sheets in ${short(DIR)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(`script: ${e.message}`);
    process.exit(1);
  });
}
