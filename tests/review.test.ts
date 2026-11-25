import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import sharp from 'sharp';

const tool = (name: string) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const review: any = await tool('review');
const keeper: any = await tool('keep');
const paths: any = await import(new URL('../tools/lib/paths.mjs', import.meta.url).href);

const cfg = paths.config();
const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
const dirs: string[] = [];

function root(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'carcass-review-'));
  dirs.push(d);
  return d;
}

function put(file: string, data: string | Buffer = ''): string {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  return file;
}

async function picture(file: string, format: 'png' | 'jpeg' = 'png', width = 64, height = 36): Promise<string> {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp({ create: { width, height, channels: 3, background: { r: 200, g: 90, b: 30 } } })
    .toFormat(format)
    .toFile(file);
  return file;
}

function ffmpeg(...a: string[]): void {
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...a]);
}

function body(html: string): string {
  return html.replace(/<style>[\s\S]*?<\/style>/, '');
}

function text(html: string): string {
  return body(html).replace(/<[^>]+>/g, ' ');
}

afterAll(() => {
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
});

describe('the review page with nothing to show', () => {
  let html = '';
  let out: any;
  let r = '';

  beforeAll(async () => {
    r = root();
    out = await review.build({ root: r, cfg });
    html = out.html;
  });

  it('writes dist/review.html and an empty review folder', () => {
    expect(fs.existsSync(path.join(r, 'dist', 'review.html'))).toBe(true);
    expect(fs.readdirSync(path.join(r, 'dist', 'review'))).toEqual([]);
    expect(out.total).toBe(0);
  });

  it('has the six parts in order, each with an anchor', () => {
    const ids = [...html.matchAll(/<section id="([a-z]+)">/g)].map((m) => m[1]);
    expect(ids).toEqual(['latest', 'watch', 'listen', 'card', 'comparisons', 'motion']);
    const anchors = [...html.matchAll(/<a href="#([a-z]+)">/g)].map((m) => m[1]);
    expect(anchors).toEqual(ids);
  });

  it('says one quiet line where a part is empty', () => {
    for (const id of ['latest', 'watch', 'card', 'comparisons', 'motion']) {
      const part = html.split(`<section id="${id}">`)[1].split('</section>')[0];
      expect(part.match(/class="none"/g)).toHaveLength(1);
    }
    const listen = html.split('<section id="listen">')[1].split('</section>')[0];
    expect(listen.match(/class="none"/g)).toHaveLength(3);
  });

  it('carries the name and a clock line without a clock file', () => {
    expect(html).toContain(`<h1>${cfg.name}</h1>`);
    expect(html).toContain(`${cfg.budget.runHours.toFixed(2)} h`);
  });

  it('asks for nothing from outside, and its one script only opens a sound or film again', () => {
    expect(html).not.toMatch(/https?:|\/\/[a-z]/i);
    expect(html).not.toMatch(/<script[^>]+src|<link|@import|url\(/i);
    expect(html.match(/<script/gi)?.length).toBe(1);
    expect(html).toContain("addEventListener('error'");
    expect(html).not.toMatch(/fetch\(|XMLHttpRequest|import\(/);
  });

  it('has no em dash, exclamation point or emoji in its copy', () => {
    expect(text(html)).not.toMatch(/[\u2014!]|\p{Extended_Pictographic}/u);
  });

  it('prints one line for each part and the total', () => {
    const lines = review.report(out, r);
    expect(lines).toHaveLength(7);
    expect(lines.map((l: string) => l.split(':')[0])).toEqual(['latest', 'watch', 'listen', 'card', 'comparisons', 'motion', 'total']);
  });
});

describe('the review page with content', () => {
  let r = '';
  let out: any;
  let html = '';

  beforeAll(async () => {
    r = root();
    await picture(path.join(r, 'out', 'stills', 'status', '01-a.jpg'), 'jpeg');
    await picture(path.join(r, 'out', 'stills', 'status', '02-b.jpg'), 'jpeg');
    await picture(path.join(r, 'out', 'stills', 'status', 'old.jpg'), 'jpeg');
    put(
      path.join(r, 'out', 'stills', 'status', 'STATUS.md'),
      '# Status 7\n\n2026-11-25 09:10 UTC. Phase 3, the Heart.\n\n- `01-a.jpg`: the lake <wide> & far\n- `02-b.jpg`: the crust\n- `gone.jpg`: not on disk\n'
    );
    put(path.join(r, 'deliver', 'film', 'big.mp4'), Buffer.alloc(3_000_000));
    put(path.join(r, 'deliver', 'film', 'mid.mp4'), Buffer.alloc(1_500_000));
    put(path.join(r, 'out', 'clips', 'heart.mp4'), Buffer.alloc(200_000));
    fs.utimesSync(path.join(r, 'deliver', 'film', 'big.mp4'), new Date('2026-11-25T08:00:00Z'), new Date('2026-11-25T08:00:00Z'));
    fs.utimesSync(path.join(r, 'deliver', 'film', 'mid.mp4'), new Date('2026-11-25T09:00:00Z'), new Date('2026-11-25T09:00:00Z'));
    fs.utimesSync(path.join(r, 'out', 'clips', 'heart.mp4'), new Date('2026-11-25T07:00:00Z'), new Date('2026-11-25T07:00:00Z'));
    const clip = cfg.narration.clips[0];
    put(path.join(r, 'audio', 'kept', 'narration', `${clip.id}.mp3`), 'x');
    put(path.join(r, 'audio', 'kept', 'sounds', cfg.units[0].id, 'low-churn.wav'), 'x');
    put(path.join(r, 'audio', 'records', 'low-churn.md'), '## low-churn\nMade by: a tool\nText or description: A slow churn under a crust.\nSettings: none\n');
    put(path.join(r, 'audio', 'mix', 'mix-1.mp3'), 'old');
    put(path.join(r, 'audio', 'mix', 'mix-2.mp3'), 'new');
    fs.utimesSync(path.join(r, 'audio', 'mix', 'mix-1.mp3'), new Date('2026-11-25T07:00:00Z'), new Date('2026-11-25T07:00:00Z'));
    fs.utimesSync(path.join(r, 'audio', 'mix', 'mix-2.mp3'), new Date('2026-11-25T08:00:00Z'), new Date('2026-11-25T08:00:00Z'));
    put(path.join(r, 'deliver', cfg.export.files.cardLoopWeb), Buffer.alloc(1000));
    await picture(path.join(r, 'deliver', cfg.export.files.cardStill), 'jpeg');
    await picture(path.join(r, 'out', 'stills', cfg.units[0].id, 'compare-wide.jpg'), 'jpeg');
    await picture(path.join(r, 'out', 'stills', cfg.units[0].id, 'sheet-s01.jpg'), 'jpeg');
    await picture(path.join(r, 'out', 'stills', cfg.units[0].id, 'still-wide.jpg'), 'jpeg');
    await picture(path.join(r, 'out', 'stills', 'phase-2', 'sheet-film.jpg'), 'jpeg');
    put(path.join(r, 'kit', 'PROGRESS.md'), '# Progress\n\n## Status\n\n- Build: in progress\n- Phase: 3 · The look lock, in progress\n');
    put(path.join(r, 'kit', 'CLOCK.json'), JSON.stringify({ phases: { 0: 3600, 1: 5400 }, continuations: [] }));
    put(path.join(r, 'dist', 'review', 'stale', 'left.jpg'), 'x');
    out = await review.build({ root: r, cfg, maxMb: 2, now: new Date('2026-11-25T10:00:00Z') });
    html = out.html;
  });

  it('shows the status pictures the status file lists, with captions and the time', () => {
    const part = html.split('<section id="latest">')[1].split('</section>')[0];
    expect(part).toContain('Status 7 · 2026-11-25 09:10 UTC. Phase 3, the Heart.');
    expect(part).toContain('the lake &lt;wide&gt; &amp; far');
    expect(part.match(/<img /g)).toHaveLength(2);
    expect(part).not.toContain('old.jpg');
    expect(part).toMatch(/<a href="review\/status\/01-a\.jpg"[^>]*><img src="review\/status\/01-a\.jpg"/);
  });

  it('carries the date, the phase and the time used', () => {
    expect(html).toContain('2026-11-25 10:00 UTC');
    expect(html).toContain('3 · The look lock, in progress');
    expect(html).toContain(`2.50 h used of ${cfg.budget.runHours.toFixed(2)} h`);
  });

  it('leaves out the largest videos first and says so in Watch', () => {
    const part = html.split('<section id="watch">')[1].split('</section>')[0];
    expect(out.model.watch.leftOut.map((v: any) => v.name)).toEqual(['big.mp4']);
    expect(part).toContain('<b>big.mp4</b>');
    expect(part).toContain('attached to the thread instead');
    expect(part).not.toContain('src="review/film/big.mp4"');
    expect(fs.existsSync(path.join(r, 'dist', 'review', 'film', 'big.mp4'))).toBe(false);
    expect(fs.existsSync(path.join(r, 'dist', 'review', 'film', 'mid.mp4'))).toBe(true);
    expect(out.total).toBeLessThanOrEqual(2_000_000);
  });

  it('plays videos in the page, newest first, with metadata preload', () => {
    const part = html.split('<section id="watch">')[1].split('</section>')[0];
    const shown = [...part.matchAll(/<video controls playsinline preload="metadata" src="review\/([^"]+)"/g)].map((m) => m[1]);
    expect(shown).toEqual(['film/mid.mp4', 'clips/heart.mp4']);
  });

  it('puts each narration clip under its words, one line a row', () => {
    const clip = cfg.narration.clips[0];
    const part = html.split('<section id="listen">')[1].split('</section>')[0];
    expect(part.match(/<li>/g)).toHaveLength(clip.lines.length);
    for (const line of clip.lines) expect(part).toContain(`<li>${review.esc(line)}</li>`);
    expect(part.indexOf('<ol class="lines">')).toBeLessThan(part.indexOf(`review/narration/${clip.id}.mp3`));
  });

  it('groups sounds by place with the description that made them, then the newest mix alone', () => {
    const part = html.split('<section id="listen">')[1].split('</section>')[0];
    expect(part).toContain(`Sounds · ${cfg.units[0].name}`);
    expect(part).toContain('A slow churn under a crust.');
    expect(part).toContain('review/mix/mix-2.mp3');
    expect(part).not.toContain('mix-1.mp3');
  });

  it('loops the card muted and shows the still', () => {
    const part = html.split('<section id="card">')[1].split('</section>')[0];
    expect(part).toMatch(/<video autoplay loop muted[^>]*src="review\/card\/card-loop-web\.mp4"/);
    expect(part).toContain(`review/card/${cfg.export.files.cardStill}`);
  });

  it('groups comparisons and sheets by folder and takes nothing else', () => {
    const comparisons = html.split('<section id="comparisons">')[1].split('</section>')[0];
    const motion = html.split('<section id="motion">')[1].split('</section>')[0];
    expect(comparisons.match(/<img /g)).toHaveLength(1);
    expect(comparisons).toContain(`<h3>${cfg.units[0].name}</h3>`);
    expect(motion.match(/<img /g)).toHaveLength(2);
    expect(motion).toContain('<h3>Phase 2</h3>');
    expect(html).not.toContain('still-wide.jpg');
  });

  it('copies what it shows and clears what it no longer shows', () => {
    const d = path.join(r, 'dist', 'review');
    expect(fs.existsSync(path.join(d, 'stale'))).toBe(false);
    for (const m of body(html).matchAll(/(?:src|href|poster)="(review\/[^"#]+)/g)) {
      expect(fs.existsSync(path.join(r, 'dist', decodeURIComponent(m[1])))).toBe(true);
    }
  });

  it('asks for nothing from outside', () => {
    expect(html).not.toMatch(/https?:|<script[^>]+src|<link|@import|url\(/i);
  });
});

describe('the parsers', () => {
  it('reads the status file in the form the progress file uses', () => {
    const s = review.parseStatus('Status 1, 2026-11-24 20:36 UTC:\n\n- `01-x.jpg`: the approved pictures: six views\n');
    expect(s.when).toBe('Status 1, 2026-11-24 20:36 UTC');
    expect(s.pictures).toEqual([{ file: '01-x.jpg', caption: 'the approved pictures: six views' }]);
  });

  it('counts a continuation from its own start', () => {
    const state = { phases: { 0: 7200, 1: 3600 }, continuations: [{ allowed: 24 * 3600, baseTotal: 7200 }] };
    expect(review.clockLine(state, cfg.budget)).toBe('1.00 h used of 24.00 h');
  });

  it('formats lengths and sizes', () => {
    expect(review.fmtLength(182.4)).toBe('3:02');
    expect(review.fmtLength(null)).toBe('length unknown');
    expect(review.fmtSize(1_234_567)).toBe('1.2 MB');
    expect(review.fmtSize(450_000_000)).toBe('450 MB');
  });
});

describe('keep', () => {
  let r = '';

  const record = (file: string, value: object) => put(`${file}.json`, JSON.stringify(value));

  beforeAll(async () => {
    r = root();
    execFileSync('git', ['init', '-q', r]);
    put(path.join(r, '.gitignore'), 'out/work/\ndeliver/film/\n');
    const w = path.join(r, 'out', 'work');
    record(await picture(path.join(w, 'stills', 'a.png')), { units: { heart: 'h' }, keep: true, phase: 3 });
    record(await picture(path.join(w, 'stills', 'b.png')), { units: { heart: 'h' }, phase: 3 });
    record(await picture(path.join(w, 'stills', 'c.png')), { units: { ribs: 'r' }, keep: true, phase: 4 });
    await picture(path.join(w, 'stills', 'd.png'));
    record(await picture(path.join(w, 'compare', 'compare-a.png')), { units: { heart: 'h' }, keep: true, phase: 3 });
    record(await picture(path.join(w, 'crops', 'a.png')), { units: { heart: 'h', ribs: 'r' }, keep: true, phase: 3 });
    record(await picture(path.join(w, 'sheets', 's01.png')), { units: { heart: 'h' }, keep: true, phase: 3 });
  });

  it('names kept files by their kind without doubling the prefix', () => {
    expect(keeper.keptName('compare', 'compare-a.png')).toBe('compare-a.jpg');
    expect(keeper.keptName('sheet', 's01.png')).toBe('sheet-s01.jpg');
  });

  it('keeps what is marked for the unit as a JPEG with its record', async () => {
    const out = await keeper.keep({ root: r, cfg, unit: 'heart' });
    const d = path.join(r, 'out', 'stills', 'heart');
    expect(fs.readdirSync(d).sort()).toEqual([
      'compare-a.jpg',
      'compare-a.jpg.json',
      'crops-a.jpg',
      'crops-a.jpg.json',
      'sheet-s01.jpg',
      'sheet-s01.jpg.json',
      'still-a.jpg',
      'still-a.jpg.json'
    ]);
    expect((await sharp(path.join(d, 'still-a.jpg')).metadata()).format).toBe('jpeg');
    expect(JSON.parse(fs.readFileSync(path.join(d, 'still-a.jpg.json'), 'utf8')).units.heart).toBe('h');
    expect(out.kept).toHaveLength(4);
    expect(out.refused).toHaveLength(0);
  });

  it('keeps by phase into a phase folder', async () => {
    await keeper.keep({ root: r, cfg, phase: 4 });
    expect(fs.readdirSync(path.join(r, 'out', 'stills', 'phase-4')).sort()).toEqual(['still-c.jpg', 'still-c.jpg.json']);
  });

  it('refuses a file over the limit in a tracked folder and allows it in an ignored one', async () => {
    const tiny = { ...cfg, repo: { ...cfg.repo, maxFileMb: 0.0001 } };
    const f = tiny.export.files;
    put(path.join(r, 'out', 'work', 'loop', f.cardLoop), Buffer.alloc(5000));
    put(path.join(r, 'out', 'work', 'loop', f.cardStill), Buffer.alloc(5000));
    const out = await keeper.keep({ root: r, cfg: tiny, deliver: true });
    expect(out.kept.map((k: any) => k.file)).toEqual([`deliver/film/${f.cardLoop}`]);
    expect(out.refused.map((k: any) => k.file)).toEqual([`deliver/${f.cardStill}`]);
    expect(out.missing).toEqual([`out/work/loop/${f.cardLoopWeb}`]);
    expect(fs.existsSync(path.join(r, 'deliver', f.cardStill))).toBe(false);
    const lines = keeper.report(out);
    expect(lines.some((l: string) => l.startsWith('refused '))).toBe(true);
    expect(lines.at(-1)).toBe('kept 1, refused 1');
  });

  it('knows which folders git tracks', () => {
    expect(keeper.tracked(r, path.join(r, 'deliver'))).toBe(true);
    expect(keeper.tracked(r, path.join(r, 'out', 'stills', 'heart'))).toBe(true);
    expect(keeper.tracked(r, path.join(r, 'deliver', 'film'))).toBe(false);
  });

  it.skipIf(!hasFfmpeg)('copies a silent clip and refuses one with sound', async () => {
    const clips = path.join(r, 'out', 'work', 'clips');
    fs.mkdirSync(clips, { recursive: true });
    ffmpeg('-f', 'lavfi', '-i', 'color=c=black:s=64x36:r=10:d=0.5', '-pix_fmt', 'yuv420p', path.join(clips, 'heart.mp4'));
    ffmpeg('-f', 'lavfi', '-i', 'color=c=black:s=64x36:r=10:d=0.5', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=0.5', '-pix_fmt', 'yuv420p', '-shortest', path.join(clips, 'ribs.mp4'));
    const silent = await keeper.keep({ root: r, cfg, unit: 'heart' });
    expect(silent.kept.map((k: any) => k.file)).toContain('out/clips/heart.mp4');
    const loud = await keeper.keep({ root: r, cfg, unit: 'ribs' });
    expect(loud.refused.map((k: any) => k.file)).toEqual(['out/clips/ribs.mp4']);
    expect(fs.existsSync(path.join(r, 'out', 'clips', 'ribs.mp4'))).toBe(false);
  });

  it('copies the newest film under its name from the config', async () => {
    const film = path.join(r, 'out', 'work', 'film');
    const name = cfg.export.files.preview;
    const stem = name.replace(/\.mp4$/, '');
    put(path.join(film, `${stem}-a.mp4`), 'older');
    put(path.join(film, `${stem}-b.mp4`), 'newer');
    put(path.join(film, 'chunk-0001.mp4'), 'chunk');
    fs.utimesSync(path.join(film, `${stem}-a.mp4`), new Date('2026-11-25T07:00:00Z'), new Date('2026-11-25T07:00:00Z'));
    fs.utimesSync(path.join(film, `${stem}-b.mp4`), new Date('2026-11-25T08:00:00Z'), new Date('2026-11-25T08:00:00Z'));
    const out = await keeper.keep({ root: r, cfg, film: true });
    expect(out.kept.map((k: any) => k.file)).toEqual([`deliver/film/${name}`]);
    expect(fs.readFileSync(path.join(r, 'deliver', 'film', name), 'utf8')).toBe('newer');
  });

  it('keeps the time a film was made, so the review page plays the newest film first whatever the order of the copies', async () => {
    const film = path.join(r, 'out', 'work', 'film');
    const clip = cfg.export.files.heartReview;
    const animatic = cfg.export.files.animatic;
    put(path.join(film, clip), 'the clip');
    put(path.join(film, animatic), 'the animatic');
    fs.utimesSync(path.join(film, animatic), new Date('2026-11-25T00:02:00Z'), new Date('2026-11-25T00:02:00Z'));
    fs.utimesSync(path.join(film, clip), new Date('2026-11-25T16:40:00Z'), new Date('2026-11-25T16:40:00Z'));
    const out = await keeper.keep({ root: r, cfg, film: true });
    expect(out.kept.map((k: any) => k.file)).toEqual(expect.arrayContaining([`deliver/film/${animatic}`, `deliver/film/${clip}`]));
    expect(fs.statSync(path.join(r, 'deliver', 'film', clip)).mtime.toISOString()).toBe('2026-11-25T16:40:00.000Z');
    expect(fs.statSync(path.join(r, 'deliver', 'film', animatic)).mtime.toISOString()).toBe('2026-11-25T00:02:00.000Z');
    const model = review.collect(r, cfg);
    expect(model.watch.videos.map((v: any) => v.name).filter((n: string) => n === clip || n === animatic)).toEqual([clip, animatic]);
  });
});
