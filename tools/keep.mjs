import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { ROOT, config, args } from './lib/paths.mjs';

const MB = 1e6;
const JPEG_QUALITY = 92;
const SOURCES = [
  ['stills', 'still'],
  ['compare', 'compare'],
  ['crops', 'crops'],
  ['sheets', 'sheet']
];
const FILMS = ['master', 'hd', 'preview', 'heartReview', 'animatic'];

const fmt = (bytes) => (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`);

export function tracked(root, dir) {
  const r = spawnSync('git', ['-C', root, 'check-ignore', '-q', path.join(dir, 'x')], { stdio: 'ignore' });
  return r.status !== 0;
}

export function hasSound(file) {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return out.trim().length > 0;
  } catch {
    return null;
  }
}

export function keptName(prefix, file) {
  const base = path.basename(file).replace(/\.png$/i, '');
  return `${prefix}-${base.startsWith(`${prefix}-`) ? base.slice(prefix.length + 1) : base}.jpg`;
}

const readRecord = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

export async function keep({ root = ROOT, cfg = config(), unit = null, phase = null, film = false, deliver = false } = {}) {
  const r = (...p) => path.join(root, ...p);
  const shown = (p) => path.relative(root, p).split(path.sep).join('/');
  const limit = cfg.repo.maxFileMb * MB;
  const kept = [];
  const refused = [];
  const missing = [];
  const isTracked = new Map();
  const inTracked = (dir) => {
    if (!isTracked.has(dir)) isTracked.set(dir, tracked(root, dir));
    return isTracked.get(dir);
  };
  const tooLarge = (bytes, dir) => inTracked(dir) && bytes > limit;
  const say = (bytes) => `${fmt(bytes)} is over repo.maxFileMb, ${cfg.repo.maxFileMb} MB`;

  const copyFile = (src, to, { mustBeSilent = false } = {}) => {
    if (!fs.existsSync(src)) {
      missing.push(shown(src));
      return;
    }
    const dir = path.dirname(to);
    const bytes = fs.statSync(src).size;
    if (tooLarge(bytes, dir)) return void refused.push({ file: shown(to), why: say(bytes) });
    if ((mustBeSilent || inTracked(dir)) && /\.(mp4|mov|m4v|webm)$/i.test(src)) {
      const sound = hasSound(src);
      if (sound === null) return void refused.push({ file: shown(to), why: 'ffprobe could not read it, so it is not known to be silent' });
      if (sound) return void refused.push({ file: shown(to), why: 'it has a sound stream' });
    }
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(src, to);
    kept.push({ file: shown(to), bytes });
  };

  if (unit !== null || phase !== null) {
    const label = unit !== null ? String(unit) : `phase-${phase}`;
    const dir = r('out', 'stills', label);
    const match = (rec) =>
      rec?.keep === true && (unit !== null ? Object.prototype.hasOwnProperty.call(rec.units ?? {}, String(unit)) : Number(rec.phase) === Number(phase));
    for (const [folder, prefix] of SOURCES) {
      const from = r('out', 'work', folder);
      if (!fs.existsSync(from)) continue;
      for (const n of fs.readdirSync(from).filter((x) => /\.png$/i.test(x)).sort()) {
        const src = path.join(from, n);
        const rec = readRecord(`${src}.json`);
        if (!match(rec)) continue;
        const to = path.join(dir, keptName(prefix, n));
        const jpeg = await sharp(src).flatten({ background: '#000000' }).jpeg({ quality: JPEG_QUALITY }).toBuffer();
        if (tooLarge(jpeg.length, dir)) {
          refused.push({ file: shown(to), why: say(jpeg.length) });
          continue;
        }
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(to, jpeg);
        fs.copyFileSync(`${src}.json`, `${to}.json`);
        kept.push({ file: shown(to), bytes: jpeg.length });
      }
    }
    copyFile(r('out', 'work', 'clips', `${label}.mp4`), r('out', 'clips', `${label}.mp4`), { mustBeSilent: true });
  }

  if (film) {
    const from = r('out', 'work', 'film');
    const all = fs.existsSync(from)
      ? fs.readdirSync(from, { withFileTypes: true }).filter((e) => e.isFile() && /\.mp4$/i.test(e.name)).map((e) => e.name)
      : [];
    let any = false;
    for (const k of FILMS) {
      const name = cfg.export.files[k];
      const stem = name.replace(/\.mp4$/i, '');
      const newest = all
        .filter((n) => n === name || n.startsWith(`${stem}-`) || n.startsWith(`${stem}.`))
        .map((n) => ({ n, t: fs.statSync(path.join(from, n)).mtimeMs }))
        .sort((a, b) => b.t - a.t || a.n.localeCompare(b.n))[0];
      if (!newest) continue;
      any = true;
      copyFile(path.join(from, newest.n), r('deliver', 'film', name));
      const record = path.join(from, `${newest.n}.json`);
      if (fs.existsSync(record)) fs.copyFileSync(record, r('deliver', 'film', `${name}.json`));
      else fs.rmSync(r('deliver', 'film', `${name}.json`), { force: true });
    }
    if (!any) missing.push(`${shown(from)}/*.mp4 with a name from export.files`);
  }

  if (deliver) {
    const f = cfg.export.files;
    copyFile(r('out', 'work', 'loop', f.cardLoop), r('deliver', 'film', f.cardLoop));
    copyFile(r('out', 'work', 'loop', f.cardLoopWeb), r('deliver', f.cardLoopWeb));
    copyFile(r('out', 'work', 'loop', f.cardStill), r('deliver', f.cardStill));
  }

  return { kept, refused, missing };
}

export function report({ kept, refused, missing }) {
  const out = [];
  for (const k of kept) out.push(`kept ${k.file} (${fmt(k.bytes)})`);
  for (const x of refused) out.push(`refused ${x.file}: ${x.why}`);
  for (const m of missing) out.push(`not there ${m}`);
  out.push(`kept ${kept.length}, refused ${refused.length}`);
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = args();
  const cfg = config();
  const usage = () => {
    console.error('usage: npm run keep -- --unit ID | --phase N [--film] [--deliver]');
    process.exit(1);
  };
  const unit = a.unit === undefined ? null : a.unit;
  const phase = a.phase === undefined ? null : a.phase;
  if (unit === true || phase === true || Array.isArray(unit) || Array.isArray(phase)) usage();
  if (unit !== null && phase !== null) usage();
  if (unit === null && phase === null && !a.film && !a.deliver) usage();
  if (unit !== null && !cfg.units.some((u) => u.id === unit)) {
    console.error(`keep: no unit ${unit} in the config. Units: ${cfg.units.map((u) => u.id).join(', ')}`);
    process.exit(1);
  }
  if (phase !== null && !Object.prototype.hasOwnProperty.call(cfg.budget.phaseHours, String(phase))) {
    console.error(`keep: no phase ${phase} in the config. Phases: ${Object.keys(cfg.budget.phaseHours).join(', ')}`);
    process.exit(1);
  }
  const result = await keep({ cfg, unit, phase: phase === null ? null : Number(phase), film: Boolean(a.film), deliver: Boolean(a.deliver) });
  for (const line of report(result)) console.log(line);
}
