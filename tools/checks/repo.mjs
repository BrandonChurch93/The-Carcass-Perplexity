import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ROOT, config } from '../lib/paths.mjs';

const MB = 1000 * 1000;
const GB = 1000 * MB;
const SCAN_MAX_BYTES = 2 * MB;
const ASSET_ROOT = 'public/assets/';

export const RECORD_LABELS = ['Made by:', 'Text or description:', 'Settings:', 'Takes:', 'Measured:', 'Date:'];
export const SOUND_EXTS = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus'];
export const VIDEO_EXTS = ['mp4', 'mov', 'mkv', 'webm'];
export const UNTRACKED_FOLDERS = ['references/cache/', 'out/work/', 'deliver/film/'];

const LITERAL = '[A-Za-z0-9_+/=.-]{20,}';
const SECRET_PATTERNS = [
  ['private key block', /-----BEGIN [A-Z0-9 ]*PRIVATE KEY( BLOCK)?-----/],
  ['sk- token', /(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{20,}/],
  ['ghp_ token', /(?<![A-Za-z0-9])ghp_[A-Za-z0-9]{20,}/],
  ['github_pat_ token', /(?<![A-Za-z0-9])github_pat_[A-Za-z0-9_]{20,}/],
  ['xi-api-key value', /xi-api-key["']?\s*[:=]\s*["']?(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{16,}/i],
  ['AKIA key id', /(?<![A-Z0-9])AKIA[0-9A-Z]{16}(?![0-9A-Z])/],
  [
    'long literal assigned to a secret name',
    new RegExp(
      `(?:KEY|TOKEN|SECRET|PASSWORD)["']?\\s*[:=]\\s*(?:"${LITERAL}"|'${LITERAL}'|(?=[A-Za-z0-9_+/=-]*\\d)[A-Za-z0-9_+/=-]{20,}(?![A-Za-z0-9_+/=.(-]))`
    )
  ]
];

export function findSecrets(text) {
  const out = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const [kind, re] of SECRET_PATTERNS) {
      if (re.test(lines[i])) {
        out.push({ line: i + 1, kind });
        break;
      }
    }
  }
  return out;
}

export function recipeHeadings(text) {
  const out = [];
  let fenced = false;
  for (const raw of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(raw)) fenced = !fenced;
    else if (!fenced && raw.startsWith('## ')) out.push(raw.slice(3).trim());
  }
  return out;
}

function headingTokens(heading) {
  const ticked = [...heading.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const raw = ticked.length ? ticked : [heading, ...heading.split(/\s*[,;]\s*|\s+and\s+/), ...heading.split(/[\s,;()]+/)];
  const out = new Set();
  for (const t of raw) {
    const v = t.trim().replace(/^\.\//, '').replace(/^\/+/, '').replace(/[.,:;]+$/, '');
    if (v) out.add(v);
  }
  return [...out];
}

function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else re += '.*';
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if (c === '{') {
      const end = glob.indexOf('}', i);
      if (end === -1) re += '\\{';
      else {
        re += '(?:' + glob.slice(i + 1, end).split(',').map((s) => s.replace(/[.+^$()|[\]\\]/g, '\\$&')).join('|') + ')';
        i = end;
      }
    } else re += c.replace(/[.+^$()|[\]\\}]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

function tokenCovers(token, file) {
  const isGlob = /[*?{]/.test(token);
  const bare = token.replace(/\/+$/, '');
  if (!bare) return false;
  const anchored = bare.startsWith(ASSET_ROOT) ? [bare] : bare.startsWith('assets/') ? [`public/${bare}`] : [`${ASSET_ROOT}${bare}`];
  if (!bare.includes('/')) anchored.push(`${ASSET_ROOT}**/${bare}`);
  for (const p of anchored) {
    if (/^[*/]*$/.test(p.slice(ASSET_ROOT.length))) continue;
    if (isGlob || p.includes('**')) {
      const re = globToRegExp(p);
      if (re.test(file)) return true;
      const parts = file.split('/');
      for (let n = parts.length - 1; n > 2; n--) if (re.test(parts.slice(0, n).join('/'))) return true;
    } else if (file === p || file.startsWith(`${p}/`)) return true;
  }
  return false;
}

export function recipeCovers(headings, file) {
  return headings.some((h) => headingTokens(h).some((t) => tokenCovers(t, file)));
}

export function recordMissing(text) {
  const lines = text.split('\n').map((l) => l.trim());
  return RECORD_LABELS.filter((label) => !lines.some((l) => l.startsWith(label) && l.slice(label.length).trim() !== ''));
}

const EMPTY_CELL = /^(|-+|\u2013|\u2014|\?+|none|unknown|tbd|tbc|n\/a|to be confirmed)$/i;
const cell = (s) => s.trim().replace(/^`+|`+$/g, '').trim();

export function thirdPartyRows(assetsText) {
  const lines = assetsText.split('\n');
  const start = lines.findIndex((l) => /^##\s+Third-party files\s*$/i.test(l.trim()));
  if (start === -1) return null;
  const rows = [];
  let header = null;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('## ')) break;
    if (!l.startsWith('|')) {
      if (header) break;
      continue;
    }
    const cells = l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell);
    if (!header) {
      header = cells.map((c) => c.toLowerCase());
      continue;
    }
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    const at = (re) => {
      const n = header.findIndex((h) => re.test(h));
      return n === -1 ? '' : cells[n] ?? '';
    };
    rows.push({ file: at(/^file/), source: at(/^source/), licence: at(/^licen[cs]e/) });
  }
  return rows;
}

export function thirdPartyFaults(rows, exists) {
  const out = [];
  rows.forEach((r, i) => {
    const name = r.file || `row ${i + 1}`;
    if (EMPTY_CELL.test(r.file)) out.push(`Row ${i + 1} of the third-party table names no file.`);
    else if (!exists(r.file)) out.push(`${name} is listed in the third-party table and does not exist.`);
    if (EMPTY_CELL.test(r.source)) out.push(`${name} has no source in the third-party table.`);
    if (EMPTY_CELL.test(r.licence)) out.push(`${name} has no licence in the third-party table.`);
  });
  return out;
}

export function repoIsPublic(progressText) {
  const line = progressText.split('\n').find((l) => l.trim().startsWith('- Repo is private:'));
  if (line === undefined) return { known: false, isPublic: true, value: '' };
  const value = line.trim().slice('- Repo is private:'.length).trim();
  return { known: true, isPublic: value.toLowerCase().startsWith('no'), value };
}

const ext = (f) => path.extname(f).slice(1).toLowerCase();
export const isSoundName = (f) => SOUND_EXTS.includes(ext(f));
export const isVideoName = (f) => VIDEO_EXTS.includes(ext(f));

const SKIP_NAMES = new Set(['.gitkeep', '.DS_Store']);

function walk(root, folder) {
  const base = path.join(root, folder);
  if (!fs.existsSync(base)) return [];
  const out = [];
  const go = (dir, relDir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const r = `${relDir}/${e.name}`;
      if (e.isDirectory()) go(path.join(dir, e.name), r);
      else if (!SKIP_NAMES.has(e.name)) out.push(r);
    }
  };
  go(base, folder);
  return out.sort();
}

const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const read = (root, file) => (fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : null);

export async function checkG8({ root = ROOT } = {}) {
  const lines = [];
  let pass = true;
  const fail = (line) => {
    pass = false;
    lines.push(line);
  };
  const assets = read(root, 'ASSETS.md');
  if (assets === null) fail('ASSETS.md is missing.');
  const assetsText = assets ?? '';

  const supplied = walk(root, 'audio/supplied');
  const unnamed = supplied.filter((f) => !assetsText.includes(f) && !assetsText.includes(path.basename(f)));
  lines.push(`audio/supplied holds ${count(supplied.length, 'file')}, ${unnamed.length} not named in ASSETS.md.`);
  for (const f of unnamed) fail(`${f} is not named in ASSETS.md.`);

  const recipes = walk(root, 'assets-src').filter((f) => path.basename(f) === 'RECIPE.md');
  const headings = recipes.flatMap((f) => recipeHeadings(fs.readFileSync(path.join(root, f), 'utf8')));
  const loaded = walk(root, 'public/assets');
  const bare = loaded.filter((f) => !recipeCovers(headings, f));
  lines.push(
    `public/assets holds ${count(loaded.length, 'file')}, ${bare.length} with no recipe, read against ${count(headings.length, 'heading')} in ${count(recipes.length, 'RECIPE.md file')}.`
  );
  for (const f of bare) fail(`${f} has no recipe under assets-src.`);

  const kept = walk(root, 'audio/kept');
  let badRecords = 0;
  const recordLines = [];
  for (const f of kept) {
    const record = `audio/records/${path.basename(f, path.extname(f))}.md`;
    const text = read(root, record);
    if (text === null) {
      badRecords++;
      recordLines.push(`${f} has no record ${record}.`);
      continue;
    }
    const missing = recordMissing(text);
    if (missing.length) {
      badRecords++;
      recordLines.push(`${record} lacks ${missing.map((m) => `"${m}"`).join(', ')}.`);
    }
  }
  lines.push(`audio/kept holds ${count(kept.length, 'file')}, ${badRecords} without a full record in audio/records.`);
  for (const l of recordLines) fail(l);

  const rows = thirdPartyRows(assetsText);
  if (rows === null) fail('ASSETS.md has no "Third-party files" table.');
  else {
    const faults = thirdPartyFaults(rows, (f) => fs.existsSync(path.join(root, f)));
    lines.push(`The third-party table holds ${count(rows.length, 'row')}, ${faults.length ? `${count(faults.length, 'fault')} found` : 'no fault found'}.`);
    for (const l of faults) fail(l);
  }
  return { id: 'G8', pass, lines };
}

function git(root, argv, options = {}) {
  return execFileSync('git', argv, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 512 * MB,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    ...options
  });
}

const zList = (s) => s.split('\0').filter(Boolean);

function looksLikeText(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(8192);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    return !buf.subarray(0, n).includes(0);
  } finally {
    fs.closeSync(fd);
  }
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function hasSoundStream(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return out.trim() !== '';
}

function remoteBranches(root) {
  const local = new Map();
  for (const l of git(root, ['for-each-ref', '--format=%(refname) %(objectname)', 'refs/remotes/origin']).split('\n')) {
    const [ref, hash] = l.trim().split(' ');
    if (!ref || ref === 'refs/remotes/origin/HEAD') continue;
    local.set(ref.slice('refs/remotes/origin/'.length), hash);
  }
  let listed = null;
  try {
    listed = new Map();
    for (const l of git(root, ['ls-remote', '--heads', 'origin'], { timeout: 20000 }).split('\n')) {
      const m = l.trim().match(/^([0-9a-f]+)\s+refs\/heads\/(.+)$/);
      if (m) listed.set(m[2], m[1]);
    }
  } catch {
    listed = null;
  }
  return { local, listed };
}

export async function checkG9({ root = ROOT } = {}) {
  const limits = config().repo;
  const lines = [];
  let pass = true;
  const fail = (line) => {
    pass = false;
    lines.push(line);
  };
  const maxFile = limits.maxFileMb * MB;
  const maxTree = limits.maxTreeGb * GB;
  const tracked = zList(git(root, ['ls-files', '-z']));
  const sized = [];
  let gone = 0;
  for (const f of tracked) {
    const st = fs.lstatSync(path.join(root, f), { throwIfNoEntry: false });
    if (!st || !st.isFile()) gone++;
    else sized.push({ f, size: st.size });
  }

  const big = sized.filter((x) => x.size > maxFile);
  const total = sized.reduce((a, x) => a + x.size, 0);
  const largest = sized.reduce((a, x) => (x.size > a.size ? x : a), { f: 'none', size: 0 });
  lines.push(
    `${count(tracked.length, 'tracked file')}${gone ? `, ${gone} not on disk` : ''}. ${big.length} over ${limits.maxFileMb} MB. The largest is ${largest.f} at ${(largest.size / MB).toFixed(2)} MB.`
  );
  for (const x of big) fail(`${x.f} is ${(x.size / MB).toFixed(2)} MB, over the limit of ${limits.maxFileMb} MB.`);
  const treeLine = `The tracked files take ${(total / GB).toFixed(3)} GB of the ${limits.maxTreeGb} GB allowed.`;
  if (total < maxTree) lines.push(treeLine);
  else fail(treeLine);

  let scanned = 0;
  const hits = [];
  for (const { f, size } of sized) {
    if (f === 'package-lock.json' || f.startsWith('references/') || size >= SCAN_MAX_BYTES || size === 0) continue;
    const abs = path.join(root, f);
    if (!looksLikeText(abs)) continue;
    scanned++;
    for (const h of findSecrets(fs.readFileSync(abs, 'utf8'))) hits.push(`${f} line ${h.line} looks like a secret: ${h.kind}.`);
  }
  lines.push(`${count(scanned, 'text file')} scanned for secrets, ${count(hits.length, 'hit')}.`);
  for (const l of hits) fail(l);

  const stray = tracked.filter((f) => UNTRACKED_FOLDERS.some((d) => f.startsWith(d)));
  lines.push(`${stray.length} tracked under ${UNTRACKED_FOLDERS.join(', ')}.`);
  for (const f of stray) fail(`${f} is tracked and must not be.`);

  const manifestFile = 'references/approved/MANIFEST.sha256';
  const manifest = read(root, manifestFile);
  if (manifest === null) fail(`${manifestFile} is missing.`);
  else {
    const entries = manifest.split('\n').map((l) => l.match(/^([0-9a-fA-F]{64})\s+\*?(.+?)\s*$/)).filter(Boolean);
    const wrong = [];
    for (const [, hash, name] of entries) {
      const abs = path.join(root, 'references/approved', name);
      if (!fs.existsSync(abs)) wrong.push(`references/approved/${name} is listed in the manifest and is missing.`);
      else if (sha256(abs) !== hash.toLowerCase()) wrong.push(`references/approved/${name} no longer has its listed hash.`);
    }
    lines.push(`${count(entries.length, 'approved file')} hashed against the manifest, ${wrong.length} changed or missing.`);
    if (entries.length === 0) fail(`${manifestFile} lists no file.`);
    for (const l of wrong) fail(l);
  }

  const progress = read(root, 'kit/PROGRESS.md');
  const priv = repoIsPublic(progress ?? '');
  if (priv.known && !priv.isPublic) {
    lines.push('The sound rule is skipped: the "Repo is private" line of kit/PROGRESS.md does not start with "no".');
  } else {
    lines.push(
      priv.known
        ? 'The "Repo is private" line of kit/PROGRESS.md starts with "no", so the sound rule applies.'
        : 'kit/PROGRESS.md has no "Repo is private" line, so the repo is read as public and the sound rule applies.'
    );
    const named = tracked.filter(isSoundName);
    for (const f of named) fail(`${f} is a sound file and is tracked on the current branch.`);
    const videos = sized.filter((x) => isVideoName(x.f));
    let withSound = 0;
    for (const { f } of videos) {
      try {
        if (hasSoundStream(path.join(root, f))) {
          withSound++;
          fail(`${f} carries a sound stream and is tracked on the current branch.`);
        }
      } catch {
        fail(`${f} could not be read by ffprobe, so it is not known to be silent.`);
      }
    }
    lines.push(`Current branch: ${count(named.length, 'sound file')}, ${count(videos.length, 'video file')} probed, ${withSound} with a sound stream.`);

    const { local, listed } = remoteBranches(root);
    let remoteSound = 0;
    for (const branch of local.keys()) {
      for (const f of zList(git(root, ['ls-tree', '-r', '--name-only', '-z', `origin/${branch}`])).filter(isSoundName)) {
        remoteSound++;
        fail(`${f} is a sound file and is tracked on origin/${branch}.`);
      }
    }
    lines.push(`${count(local.size, 'remote branch', 'remote branches')} read by name, ${count(remoteSound, 'sound file')}.`);
    if (listed === null) lines.push('The remote could not be listed, so only the branches fetched here were read.');
    else {
      for (const [branch, hash] of listed) {
        if (!local.has(branch)) fail(`origin/${branch} is not fetched here, so it was not read. Fetch every branch of the remote and run this again.`);
        else if (local.get(branch) !== hash) fail(`origin/${branch} is behind the remote here, so its newest files were not read. Fetch and run this again.`);
      }
    }
  }
  return { id: 'G9', pass, lines };
}

export function printable(result) {
  return [`${result.id}: ${result.pass ? 'pass' : 'fail'}`, ...result.lines.map((l) => `  ${l}`)];
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const results = [await checkG8(), await checkG9()];
  for (const r of results) for (const l of printable(r)) console.log(l);
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}
