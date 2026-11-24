import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ROOT, config, args, utc } from './lib/paths.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MB = 1e6;
const PICTURE = /\.(jpe?g|png|webp)$/i;
const SOUND = /\.(mp3|wav|m4a)$/i;
const DEFAULT_MAX_MB = 450;
const POSTER_AT = 0.25;
const POSTER_WIDTH = 1280;

export const PARTS = [
  ['latest', 'Latest'],
  ['watch', 'Watch'],
  ['listen', 'Listen'],
  ['card', 'The card'],
  ['comparisons', 'Comparisons'],
  ['motion', 'Motion']
];

const NONE = {
  latest: 'No status pictures yet.',
  watch: 'No films or clips yet.',
  narration: 'No narration kept yet.',
  sounds: 'No sounds kept yet.',
  mix: 'No mix yet.',
  card: 'No card loop or card still yet.',
  comparisons: 'No comparison images kept yet.',
  motion: 'No sheets kept yet.'
};

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const url = (p) => p.split('/').map(encodeURIComponent).join('/');

export function fmtSize(bytes) {
  if (bytes >= 100 * MB) return `${Math.round(bytes / MB)} MB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${bytes > 0 ? Math.max(1, Math.round(bytes / 1000)) : 0} KB`;
}

export function fmtLength(seconds) {
  if (seconds === null || !Number.isFinite(seconds)) return 'length unknown';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function poster(v, dir) {
  const to = path.join(dir, `${v.to.replace(/[\/.]/g, '-')}.jpg`);
  const have = fs.existsSync(to) ? fs.statSync(to) : null;
  if (!have || have.mtimeMs < v.mtime) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      execFileSync(
        'ffmpeg',
        ['-y', '-v', 'error', '-ss', String(((v.seconds ?? 0) * POSTER_AT).toFixed(3)), '-i', v.src, '-frames:v', '1', '-vf', `scale='min(${POSTER_WIDTH},iw)':-2`, '-q:v', '4', to],
        { stdio: 'ignore' }
      );
    } catch {
      return null;
    }
  }
  return fs.existsSync(to) ? { ...item(to, `posters/${path.basename(to)}`) } : null;
}

function probe(file) {
  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', file],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const j = JSON.parse(out);
    const v = (j.streams ?? []).find((s) => s.codec_type === 'video');
    const d = Number(j.format?.duration);
    return { seconds: Number.isFinite(d) ? d : null, width: v?.width ?? null, height: v?.height ?? null };
  } catch {
    return { seconds: null, width: null, height: null };
  }
}

const list = (dir, test) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isFile() && test.test(e.name))
        .map((e) => e.name)
        .sort()
    : [];

function walk(dir, test, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, test, out);
    else if (test.test(e.name)) out.push(p);
  }
  return out;
}

const item = (src, to) => {
  const st = fs.statSync(src);
  return { src, to, name: path.basename(src), size: st.size, mtime: st.mtimeMs };
};

const newestFirst = (a, b) => b.mtime - a.mtime || a.name.localeCompare(b.name);

export function parseStatus(text) {
  const lines = text.split('\n');
  const pictures = [];
  let first = -1;
  lines.forEach((l, i) => {
    const m = l.match(/^- `([^`]+)`:\s*(.*)$/);
    if (!m) return;
    if (first < 0) first = i;
    pictures.push({ file: m[1], caption: m[2].trim() });
  });
  let when = '';
  for (let i = (first < 0 ? lines.length : first) - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (l && !l.startsWith('#')) {
      when = l.replace(/:$/, '');
      break;
    }
  }
  const title = (lines.find((l) => l.startsWith('# ')) ?? '').slice(2).trim();
  return { title, when, pictures };
}

export function phaseLine(text) {
  const m = text.match(/^- Phase:\s*(.+)$/m);
  return m ? m[1].trim() : 'not recorded';
}

export function clockLine(state, budget) {
  if (!state) return `no clock yet, of ${budget.runHours.toFixed(2)} h allowed`;
  const c = (state.continuations ?? [])[(state.continuations ?? []).length - 1];
  const all = Object.values(state.phases ?? {}).reduce((a, b) => a + b, 0);
  const used = all - (c?.baseTotal ?? 0);
  const allowed = c?.allowed ?? budget.runHours * 3600;
  return `${(used / 3600).toFixed(2)} h used of ${(allowed / 3600).toFixed(2)} h`;
}

export function description(text) {
  const m = text.match(/^Text or description:\s*(.*)$/m);
  return m ? m[1].trim() : '';
}

const groupName = (folder, cfg) => {
  const u = cfg.units.find((x) => x.id === folder);
  if (u) return u.name;
  const p = folder.match(/^phase-(\d+)$/);
  if (p) return `Phase ${p[1]}`;
  return folder === '.' ? 'Loose' : folder;
};

function pictureGroups(root, cfg, prefix) {
  const base = path.join(root, 'out', 'stills');
  const groups = new Map();
  for (const f of walk(base, PICTURE)) {
    if (!path.basename(f).startsWith(prefix)) continue;
    const folder = path.relative(base, path.dirname(f)).split(path.sep).join('/') || '.';
    if (!groups.has(folder)) groups.set(folder, []);
    groups.get(folder).push(item(f, `stills/${folder === '.' ? '' : folder + '/'}${path.basename(f)}`));
  }
  const order = cfg.units.map((u) => u.id);
  const rank = (k) => (order.includes(k) ? order.indexOf(k) : order.length);
  return [...groups.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
    .map(([folder, items]) => ({ folder, name: groupName(folder, cfg), items }));
}

export function collect(root = ROOT, cfg = config()) {
  const r = (...p) => path.join(root, ...p);

  const statusDir = r('out', 'stills', 'status');
  const statusFile = path.join(statusDir, 'STATUS.md');
  const status = fs.existsSync(statusFile) ? parseStatus(fs.readFileSync(statusFile, 'utf8')) : { title: '', when: '', pictures: [] };
  const listed = status.pictures.filter((p) => fs.existsSync(path.join(statusDir, p.file)));
  const latestPictures = (listed.length ? listed : list(statusDir, PICTURE).map((file) => ({ file, caption: '' }))).map((p) => ({
    ...item(path.join(statusDir, p.file), `status/${p.file}`),
    caption: p.caption
  }));

  const videos = [
    ...list(r('deliver', 'film'), /\.mp4$/i).map((n) => ({ ...item(r('deliver', 'film', n), `film/${n}`), kind: 'film' })),
    ...list(r('out', 'clips'), /\.mp4$/i).map((n) => ({ ...item(r('out', 'clips', n), `clips/${n}`), kind: 'clip' }))
  ].sort(newestFirst);

  const narrDir = r('audio', 'kept', 'narration');
  const narrFiles = list(narrDir, SOUND);
  const byId = new Map(narrFiles.map((n) => [n.replace(SOUND, ''), n]));
  const narration = [];
  for (const c of cfg.narration.clips) {
    if (!byId.has(c.id)) continue;
    const n = byId.get(c.id);
    byId.delete(c.id);
    narration.push({
      ...item(path.join(narrDir, n), `narration/${n}`),
      id: c.id,
      title: c.name ?? '',
      place: cfg.units.find((u) => u.id === c.unit)?.name ?? c.unit ?? '',
      lines: c.lines ?? []
    });
  }
  for (const [id, n] of byId) narration.push({ ...item(path.join(narrDir, n), `narration/${n}`), id, title: '', place: '', lines: [] });

  const soundDir = r('audio', 'kept', 'sounds');
  const order = cfg.units.map((u) => u.id);
  const folders = fs.existsSync(soundDir)
    ? fs.readdirSync(soundDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
    : [];
  const rank = (k) => (order.includes(k) ? order.indexOf(k) : order.length);
  const sounds = folders
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((unit) => ({
      unit,
      name: groupName(unit, cfg),
      items: list(path.join(soundDir, unit), SOUND).map((n) => {
        const id = n.replace(SOUND, '');
        const rec = r('audio', 'records', `${id}.md`);
        return {
          ...item(path.join(soundDir, unit, n), `sounds/${unit}/${n}`),
          id,
          description: fs.existsSync(rec) ? description(fs.readFileSync(rec, 'utf8')) : ''
        };
      })
    }))
    .filter((g) => g.items.length);

  const mixDir = r('audio', 'mix');
  const mix = list(mixDir, SOUND).map((n) => item(path.join(mixDir, n), `mix/${n}`)).sort(newestFirst)[0] ?? null;

  const loop = r('deliver', cfg.export.files.cardLoopWeb);
  const still = r('deliver', cfg.export.files.cardStill);
  const card = {
    loop: fs.existsSync(loop) ? item(loop, `card/${path.basename(loop)}`) : null,
    still: fs.existsSync(still) ? item(still, `card/${path.basename(still)}`) : null
  };

  const progress = r('kit', 'PROGRESS.md');
  const clock = r('kit', 'CLOCK.json');
  return {
    name: cfg.name,
    phase: fs.existsSync(progress) ? phaseLine(fs.readFileSync(progress, 'utf8')) : 'not recorded',
    clock: clockLine(fs.existsSync(clock) ? JSON.parse(fs.readFileSync(clock, 'utf8')) : null, cfg.budget),
    latest: { title: status.title, when: status.when, pictures: latestPictures },
    watch: { videos, leftOut: [] },
    listen: { narration, sounds, mix },
    card,
    comparisons: pictureGroups(root, cfg, 'compare-'),
    motion: pictureGroups(root, cfg, 'sheet-')
  };
}

export function files(model) {
  return [
    ...model.latest.pictures,
    ...model.watch.videos,
    ...model.watch.videos.flatMap((v) => (v.poster ? [v.poster] : [])),
    ...model.listen.narration,
    ...model.listen.sounds.flatMap((g) => g.items),
    ...(model.listen.mix ? [model.listen.mix] : []),
    ...(model.card.loop ? [model.card.loop] : []),
    ...(model.card.still ? [model.card.still] : []),
    ...model.comparisons.flatMap((g) => g.items),
    ...model.motion.flatMap((g) => g.items)
  ];
}

export function fit(model, maxMb) {
  const limit = maxMb * MB;
  let total = files(model).reduce((a, f) => a + f.size, 0);
  const bySize = [...model.watch.videos].sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
  const out = new Set();
  for (const v of bySize) {
    if (total <= limit) break;
    out.add(v);
    total -= v.size;
  }
  model.watch.leftOut = model.watch.videos.filter((v) => out.has(v));
  model.watch.videos = model.watch.videos.filter((v) => !out.has(v));
  return { total, over: total > limit };
}

async function measure(model, work) {
  const pics = [
    ...model.latest.pictures,
    ...(model.card.still ? [model.card.still] : []),
    ...model.comparisons.flatMap((g) => g.items),
    ...model.motion.flatMap((g) => g.items)
  ];
  for (const p of pics) {
    try {
      const m = await sharp(p.src).metadata();
      p.width = m.width;
      p.height = m.height;
    } catch {
      p.width = null;
      p.height = null;
    }
  }
  for (const v of [...model.watch.videos, ...model.watch.leftOut, ...(model.card.loop ? [model.card.loop] : [])]) Object.assign(v, probe(v.src));
  for (const v of model.watch.videos) v.poster = work ? poster(v, work) : null;
}

const size = (p) => (p.width && p.height ? ` width="${p.width}" height="${p.height}"` : '');
const none = (k) => `<p class="none">${NONE[k]}</p>`;
const stem = (n, prefix = '') => n.replace(/\.[^.]+$/, '').replace(new RegExp(`^${prefix}`), '').replace(/[-_]+/g, ' ');

function picture(p, caption, alt) {
  const src = `review/${url(p.to)}`;
  return [
    '<figure>',
    `  <a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="${esc(alt)}"${size(p)} loading="lazy" decoding="async"></a>`,
    `  <figcaption><span class="cap">${esc(caption)}</span><span class="file">${esc(p.name)}</span></figcaption>`,
    '</figure>'
  ].join('\n');
}

function video(v) {
  const src = `review/${url(v.to)}`;
  return [
    '<article class="video">',
    `  <video controls playsinline preload="metadata" src="${src}"${v.poster ? ` poster="review/${url(v.poster.to)}"` : ''}${size(v)}></video>`,
    `  <div class="under"><span class="title">${esc(v.name)}</span><span class="facts">${fmtLength(v.seconds)} · ${fmtSize(v.size)} · ${v.kind}</span></div>`,
    '</article>'
  ].join('\n');
}

const audio = (a) => `<audio controls preload="metadata" src="review/${url(a.to)}"></audio>`;

function groups(sets, prefix, key) {
  if (!sets.length) return none(key);
  return sets
    .map((g) => [`<h3>${esc(g.name)}</h3>`, ...g.items.map((p) => picture(p, stem(p.name, prefix), `${g.name}, ${stem(p.name, prefix)}`))].join('\n'))
    .join('\n');
}

export function counts(model) {
  return {
    latest: model.latest.pictures.length,
    watch: model.watch.videos.length,
    listen: model.listen.narration.length + model.listen.sounds.reduce((a, g) => a + g.items.length, 0) + (model.listen.mix ? 1 : 0),
    card: (model.card.loop ? 1 : 0) + (model.card.still ? 1 : 0),
    comparisons: model.comparisons.reduce((a, g) => a + g.items.length, 0),
    motion: model.motion.reduce((a, g) => a + g.items.length, 0)
  };
}

export function render(model, { date = utc(), total = 0 } = {}) {
  const n = counts(model);
  const body = {};

  body.latest = model.latest.pictures.length
    ? [
        model.latest.when ? `<p class="when">${esc([model.latest.title, model.latest.when].filter(Boolean).join(' · '))}</p>` : '',
        ...model.latest.pictures.map((p) => picture(p, p.caption || stem(p.name), p.caption || stem(p.name)))
      ].join('\n')
    : none('latest');

  const left = model.watch.leftOut.length
    ? [
        '<ul class="left-out">',
        ...model.watch.leftOut.map(
          (v) => `  <li><b>${esc(v.name)}</b>, ${fmtLength(v.seconds)}, ${fmtSize(v.size)}. Too large for this page. It is attached to the thread instead.</li>`
        ),
        '</ul>'
      ].join('\n')
    : '';
  body.watch = [model.watch.videos.length ? model.watch.videos.map(video).join('\n') : left ? '' : none('watch'), left].filter(Boolean).join('\n');

  const narration = model.listen.narration.length
    ? [
        '<div class="clips">',
        ...model.listen.narration.map((c) =>
          [
            '<article class="clip">',
            `  <header><span class="id">${esc(c.id)}</span><span class="title">${esc(c.title || c.name)}</span>${c.place ? `<span class="place">${esc(c.place)}</span>` : ''}</header>`,
            c.lines.length ? `  <ol class="lines">\n${c.lines.map((l) => `    <li>${esc(l)}</li>`).join('\n')}\n  </ol>` : '  <p class="words">No words for this clip in the script.</p>',
            `  ${audio(c)}`,
            '</article>'
          ].join('\n')
        ),
        '</div>'
      ].join('\n')
    : none('narration');
  const sounds = model.listen.sounds.length
    ? model.listen.sounds
        .map((g) =>
          [
            `<h3>Sounds · ${esc(g.name)}</h3>`,
            '<div class="clips">',
            ...g.items.map((s) =>
              [
                '<article class="sound">',
                `  <header><span class="title">${esc(s.id)}</span></header>`,
                `  <p class="words">${esc(s.description || 'No description on record.')}</p>`,
                `  ${audio(s)}`,
                '</article>'
              ].join('\n')
            ),
            '</div>'
          ].join('\n')
        )
        .join('\n')
    : `<h3>Sounds</h3>\n${none('sounds')}`;
  const mix = model.listen.mix
    ? ['<article class="sound">', `  <header><span class="title">${esc(model.listen.mix.name)}</span><span class="place">${fmtSize(model.listen.mix.size)}</span></header>`, `  ${audio(model.listen.mix)}`, '</article>'].join('\n')
    : none('mix');
  body.listen = ['<h3>Narration</h3>', narration, sounds, '<h3>The mix alone</h3>', mix].join('\n');

  const { loop, still } = model.card;
  body.card =
    loop || still
      ? [
          '<div class="card">',
          loop
            ? `<figure>\n  <video autoplay loop muted playsinline controls preload="metadata" src="review/${url(loop.to)}"${size(loop)}></video>\n  <figcaption><span class="cap">The loop, as the card plays it</span><span class="file">${esc(loop.name)} · ${fmtLength(loop.seconds)} · ${fmtSize(loop.size)}</span></figcaption>\n</figure>`
            : '<p class="none">No card loop yet.</p>',
          still ? picture(still, 'The still', 'The card still') : '<p class="none">No card still yet.</p>',
          '</div>'
        ].join('\n')
      : none('card');

  body.comparisons = groups(model.comparisons, 'compare-', 'comparisons');
  body.motion = groups(model.motion, 'sheet-', 'motion');

  const nav = PARTS.map(([id, label]) => `    <a href="#${id}">${label}<span class="n">${n[id]}</span></a>`).join('\n');
  const parts = PARTS.map(([id, label]) => `<section id="${id}">\n<h2>${label}</h2>\n${body[id]}\n</section>`).join('\n');
  const fill = {
    style: fs.readFileSync(path.join(HERE, 'review', 'style.css'), 'utf8').trim(),
    name: esc(model.name),
    date: esc(date),
    phase: esc(model.phase),
    clock: esc(model.clock),
    nav,
    parts,
    foot: `${files(model).length} files, ${fmtSize(total)}`
  };
  return fs.readFileSync(path.join(HERE, 'review', 'template.html'), 'utf8').replace(/\{\{(\w+)\}\}/g, (_, k) => fill[k] ?? '');
}

function copy(model, dest) {
  const want = new Set();
  for (const f of files(model)) {
    const to = path.join(dest, ...f.to.split('/'));
    want.add(to);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    const have = fs.existsSync(to) ? fs.statSync(to) : null;
    if (have && have.size === f.size && have.mtimeMs >= f.mtime) continue;
    fs.copyFileSync(f.src, to);
  }
  for (const f of walk(dest, /./)) if (!want.has(f)) fs.rmSync(f);
  const prune = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) prune(path.join(dir, e.name));
    if (dir !== dest && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  };
  if (fs.existsSync(dest)) prune(dest);
}

export async function build({ root = ROOT, cfg = config(), maxMb = DEFAULT_MAX_MB, now = new Date() } = {}) {
  const model = collect(root, cfg);
  const fitted = fit(model, maxMb);
  await measure(model, path.join(root, 'out', 'work', 'review', 'posters'));
  const total = fitted.total + model.watch.videos.reduce((a, v) => a + (v.poster?.size ?? 0), 0);
  const over = total > maxMb * MB;
  const dist = path.join(root, 'dist');
  fs.mkdirSync(path.join(dist, 'review'), { recursive: true });
  copy(model, path.join(dist, 'review'));
  const date = utc(now).replace('T', ' ').replace(/:\d\dZ$/, ' UTC');
  const html = render(model, { date, total });
  const file = path.join(dist, 'review.html');
  fs.writeFileSync(file, html);
  return { model, total, over, file, html };
}

export function report({ model, total, over, file }, root = ROOT, maxMb = DEFAULT_MAX_MB) {
  const n = counts(model);
  const s = (k, one, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;
  const l = model.listen;
  const sounds = l.sounds.reduce((a, g) => a + g.items.length, 0);
  const out = [
    `latest: ${s(n.latest, 'picture')}`,
    `watch: ${s(n.watch, 'video')}${model.watch.leftOut.length ? `, ${model.watch.leftOut.length} left out for size: ${model.watch.leftOut.map((v) => v.name).join(', ')}` : ''}`,
    `listen: ${s(l.narration.length, 'narration clip')}, ${s(sounds, 'sound')}, ${l.mix ? '1 mix' : '0 mixes'}`,
    `card: ${s(n.card, 'file')}`,
    `comparisons: ${s(n.comparisons, 'picture')}`,
    `motion: ${s(n.motion, 'sheet')}`,
    `total: ${fmtSize(total)} in ${s(files(model).length, 'file')}, ${path.relative(root, file)}`
  ];
  if (over) out.push(`over the limit of ${maxMb} MB with every video left out`);
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = args();
  const maxMb = a['max-mb'] === undefined ? DEFAULT_MAX_MB : Number(a['max-mb']);
  if (!Number.isFinite(maxMb) || maxMb <= 0) {
    console.error('usage: npm run review -- [--max-mb N]');
    process.exit(1);
  }
  const result = await build({ maxMb });
  for (const line of report(result, ROOT, maxMb)) console.log(line);
}
