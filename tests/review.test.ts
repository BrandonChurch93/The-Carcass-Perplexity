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

  it('has the seven parts in order, each with an anchor', () => {
    const ids = [...html.matchAll(/<section id="([a-z]+)">/g)].map((m) => m[1]);
    expect(ids).toEqual(['latest', 'watch', 'script', 'listen', 'card', 'comparisons', 'motion']);
    const anchors = [...html.matchAll(/<a href="#([a-z]+)">/g)].map((m) => m[1]);
    expect(anchors).toEqual(ids);
  });

  it('says one quiet line where a part is empty', () => {
    for (const id of ['latest', 'watch', 'script', 'card', 'comparisons', 'motion']) {
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
    expect(lines).toHaveLength(8);
    expect(lines.map((l: string) => l.split(':')[0])).toEqual(['latest', 'watch', 'script', 'listen', 'card', 'comparisons', 'motion', 'total']);
    expect(lines[2]).toBe('script: no sheet');
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
    put(path.join(r, 'deliver', 'film', 'mid.mp4.json'), JSON.stringify({ kind: 'film', note: 'The Heart <as it stands> & music only.' }));
    fs.utimesSync(path.join(r, 'deliver', 'film', 'big.mp4'), new Date('2026-11-25T08:00:00Z'), new Date('2026-11-25T08:00:00Z'));
    fs.utimesSync(path.join(r, 'deliver', 'film', 'mid.mp4'), new Date('2026-11-25T09:00:00Z'), new Date('2026-11-25T09:00:00Z'));
    fs.utimesSync(path.join(r, 'out', 'clips', 'heart.mp4'), new Date('2026-11-25T07:00:00Z'), new Date('2026-11-25T07:00:00Z'));
    const clip = cfg.narration.clips[0];
    put(path.join(r, 'audio', 'kept', 'narration', `${clip.id}.mp3`), 'x');
    // Its record quotes other words than the script holds: the clip was made before the script changed.
    put(path.join(r, 'audio', 'records', `${clip.id}.md`), `## ${clip.id}\nText or description: ${JSON.stringify('[slowly, gravely] An older first line.\n\nAn older second line.')}\nSettings: none\n`);
    put(path.join(r, 'audio', 'kept', 'sounds', cfg.units[0].id, 'low-churn.wav'), 'x');
    put(path.join(r, 'audio', 'records', 'low-churn.md'), '## low-churn\nMade by: a tool\nText or description: A slow churn under a crust.\nSettings: none\n');
    put(path.join(r, 'audio', 'kept', 'sounds', cfg.units[0].id, 'crack.wav'), 'x');
    put(
      path.join(r, 'audio', 'records', 'crack.md'),
      "## crack\nText or description: \"One crack.\"\nTakes: 2 made, take 2 kept with a fault. Take 2 was kept with a fault. The Builder's verdict names a fault: No thick fold <here> & one call hears glass..\n"
    );
    put(path.join(r, 'audio', 'kept', 'sounds', cfg.units[0].id, 'drip.wav'), 'x');
    put(path.join(r, 'audio', 'records', 'drip.md'), '## drip\nText or description: "One drip."\nTakes: 1 made, take 1 kept. Take 1 was kept: the only take, with no fault by measure.\n');
    // The music's two spots: the report of the cleaning tool, the page's list of clips, the clips and one picture.
    put(
      path.join(r, 'audio', 'cleaned', 'cleaned.json'),
      JSON.stringify({ spots: [{ id: 'spot-1', asked: 'a laugh', from: '1:14.163', to: '1:16.642' }, { id: 'spot-2', asked: 'a child', from: '2:34.350', to: '2:40.000' }] })
    );
    put(
      path.join(r, 'audio', 'cleaned', 'proof', 'proof.json'),
      JSON.stringify({
        intro: 'Two spots <of> laughter & nothing else.',
        spots: [
          { id: 'spot-1', name: 'The first laugh', way: 'Only the laugh.', facts: ['Fact one.', 'Fact two.'], picture: 'out/stills/music/spot-1.png', pictureCaption: 'Spot 1 drawn', clips: [{ file: 'spot-1-before.wav', label: 'Before', what: 'as supplied' }, { file: 'spot-1-after.wav', label: 'After', what: 'cleaned' }] },
          { id: 'spot-2', name: 'The second laugh', way: 'The whole voice.', facts: [], picture: 'out/stills/music/gone.png', clips: [{ file: 'spot-2-before.wav', label: 'Before' }, { file: 'spot-2-after.wav', label: 'After' }, { file: 'gone.wav', label: 'Gone' }] }
        ]
      })
    );
    for (const n of ['spot-1-before.wav', 'spot-1-after.wav', 'spot-2-before.wav', 'spot-2-after.wav']) put(path.join(r, 'audio', 'cleaned', 'proof', n), 'x');
    await picture(path.join(r, 'out', 'stills', 'music', 'spot-1.png'), 'png');
    put(path.join(r, 'cut', 'CUTLIST.json'), JSON.stringify({ fps: 60, music: { pieces: [{ from: 0, to: 174, at: 0 }] }, places: [{ unit: cfg.units[1].id, first: 0, last: 9299 }, { unit: cfg.units[0].id, first: 9300, last: 11000 }] }));
    // The script sheet as the repo has it, with a small picture standing in for each of its pictures.
    const sheet = JSON.parse(fs.readFileSync(new URL('../cut/SCRIPT-SHEET.json', import.meta.url), 'utf8'));
    put(path.join(r, 'cut', 'SCRIPT-SHEET.json'), JSON.stringify(sheet));
    const small = new Set<string>([...sheet.rows.flatMap((x: any) => x.pictures.map((p: any) => p.file)), ...sheet.unnamed.map((u: any) => u.thumb.file)]);
    const one = await picture(path.join(r, 'out', 'work', 'one.jpg'), 'jpeg');
    for (const f of small) put(path.join(r, f), fs.readFileSync(one));
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

  it('shows the note of a film\'s record under it, and nothing where there is none', () => {
    const part = html.split('<section id="watch">')[1].split('</section>')[0];
    expect(part).toContain('<p class="about">The Heart &lt;as it stands&gt; &amp; music only.</p>');
    expect(part.match(/<p class="about">/g)).toHaveLength(1);
  });

  it('puts each narration clip under its words, one line a row', () => {
    const clip = cfg.narration.clips[0];
    const part = html.split('<section id="listen">')[1].split('</section>')[0];
    expect(part.split('<ol class="lines">')[1].split('</ol>')[0].match(/<li>/g)).toHaveLength(clip.lines.length);
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

  it('says under each sound which take was kept, and the fault it was kept with', () => {
    const part = html.split('<section id="listen">')[1].split('</section>')[0];
    const of = (id: string) => part.split(`<span class="title">${id}</span>`)[1].split('</article>')[0];
    expect(of('crack')).toContain('<p class="take fault"><span class="chip">Kept with a fault</span><span>Take 2 of 2. No thick fold &lt;here&gt; &amp; one call hears glass.</span></p>');
    expect(of('drip')).toContain('<p class="take"><span>Take 1 of 1, kept. No fault found by measure, by the listener or in the picture of the sound.</span></p>');
    expect(of('low-churn')).not.toContain('class="take');
    for (const id of ['crack', 'drip', 'low-churn']) expect(of(id).indexOf('class="words"')).toBeLessThan(of(id).indexOf('<audio'));
  });

  it('plays each of the music\'s two spots before and after, with its picture and where it falls in the film', () => {
    const part = html.split('<section id="listen">')[1].split('</section>')[0];
    expect(part).toContain("<h3>The music's two spots</h3>");
    expect(part).toContain('Two spots &lt;of&gt; laughter &amp; nothing else.');
    const spots = part.split('<article class="spot">').slice(1).map((x: string) => x.split('</article>')[0]);
    expect(spots).toHaveLength(2);
    expect(spots[0]).toContain('The first laugh');
    expect(spots[0]).toContain(`1:14.163 to 1:16.642 of the track · The same time in the film, in ${cfg.units[1].name.split(',')[0].replace(/^The /, 'the ')}`);
    expect([...spots[0].matchAll(/<audio controls preload="metadata" src="review\/music\/([^"]+)"/g)].map((m) => m[1])).toEqual(['spot-1-before.wav', 'spot-1-after.wav']);
    expect(spots[0]).toContain('<b>Before</b> · as supplied');
    expect(spots[0]).toMatch(/<img src="review\/music\/spot-1\.png" alt="Spot 1 drawn" width="64" height="36"/);
    expect(spots[0].match(/<li>/g)).toHaveLength(2);
    expect(spots[1]).toContain(`in ${cfg.units[1].name.split(',')[0].replace(/^The /, 'the ')} and ${cfg.units[0].name.split(',')[0].replace(/^The /, 'the ')}`);
    expect([...spots[1].matchAll(/src="review\/music\/([^"]+)"/g)].map((m) => m[1])).toEqual(['spot-2-before.wav', 'spot-2-after.wav']);
    expect(spots[1]).not.toContain('<img');
    expect(part.indexOf("The music's two spots")).toBeLessThan(part.indexOf('The mix alone'));
    expect(out.model.listen.music.spots.map((x: any) => x.clips.length)).toEqual([2, 2]);
    expect(review.counts(out.model).listen).toBe(1 + 3 + 4 + 1);
  });

  it('marks a kept narration clip that was made from other words than the script holds', () => {
    const part = html.split('<section id="listen">')[1].split('</section>')[0];
    const clip = part.split('<article class="clip">')[1].split('</article>')[0];
    expect(clip).toContain('Made before the script changed.');
    expect(clip.indexOf('Made before the script changed.')).toBeLessThan(clip.indexOf('<audio'));
  });

  it('reads the words a clip was made from out of its record, and marks no clip made from the script as it stands', () => {
    const lines = cfg.narration.clips[1].lines;
    const record = `## n2\nMade by: a tool\nText or description: ${JSON.stringify(`[slowly, gravely] ${lines.join('\n\n')}`)}\nSettings: none\n`;
    expect(review.madeFrom(record)).toEqual(lines);
    expect(review.madeFrom('## x\nText or description: A slow churn under a crust.\n')).toEqual([]);
    expect(review.madeFrom('## x\nSettings: none\n')).toEqual([]);
    // The kept clips of the repo are made from the script the config holds.
    const model = review.collect();
    expect(model.listen.narration.map((c: any) => c.id)).toEqual(cfg.narration.clips.map((c: any) => c.id));
    for (const c of model.listen.narration) expect(c.replaced, c.id).toBe(false);
  });

  it('shows under each clip the words the film speaks, and says what else its recording holds', () => {
    const model = review.collect();
    const of = (id: string) => model.listen.narration.find((c: any) => c.id === id);
    expect(model.listen.narration.flatMap((c: any) => c.lines)).toHaveLength(22);
    expect(model.listen.narration.map((c: any) => c.lines.length)).toEqual([4, 2, 3, 2, 3, 3, 2, 3]);
    expect(of('n1')).toMatchObject({ lines: cfg.narration.clips[0].lines, cut: [], shortened: [], recorded: 4 });
    expect(review.cutNote(of('n1'))).toBe('');
    expect(of('n8').lines).toEqual(['The land has a shape.', 'It was a titan.', 'Everything here feeds on it.']);
    expect(of('n8').spoken.map((l: any) => l.line)).toEqual([1, 3, 4]);
    expect(of('n8').cut).toEqual([{ line: 2, text: 'None of it was ever land.' }]);
    expect(of('n8').shortened).toEqual([{ line: 4, text: 'Everything here feeds on it.', recorded: 'Everything here feeds on it. And it is not finished.' }]);
    expect(review.cutNote(of('n8'))).toBe(
      'The film speaks 3 of the 4 lines this clip was recorded with. The recording below is the kept clip whole, so it says more than the lines above. Cut from the film: line 2, "None of it was ever land." Line 4 is cut to its first words in the film and goes on in the recording: "Everything here feeds on it. And it is not finished."'
    );
    expect(review.cutNote(of('n7'))).toContain('Cut from the film: line 3, "The herds drink. None of them looks down."; line 4, "The center has no floor. Something looks back."');
    const page = review.render(model);
    const part = page.split('<section id="listen">')[1].split('</section>')[0];
    const n8 = part.split('<article class="clip">').find((a: string) => a.includes('<span class="id">n8</span>')) ?? '';
    expect(n8).toContain('<li>The land has a shape.</li>');
    expect(n8).toContain('<li value="3">It was a titan.</li>');
    expect(n8).toContain('<li value="4">Everything here feeds on it.</li>');
    expect(n8).not.toContain('<li>None of it was ever land.</li>');
    expect(n8.indexOf('The film speaks 3 of the 4 lines')).toBeLessThan(n8.indexOf('<audio'));
    expect(part.match(/The film speaks \d of the 4 lines this clip was recorded with/g)).toHaveLength(7);
  });

  it('says the script is final once the config holds the draft as it was settled, and not before', () => {
    const sheet = out.model.script.sheet;
    expect(out.model.script.final).toBe(true);
    expect(review.scriptIsFinal(sheet, cfg.narration.clips)).toBe(true);
    const before = cfg.narration.clips.map((c: any, i: number) => (i === 0 ? { ...c, lines: ['Another line.', ...c.lines.slice(1)] } : c));
    expect(review.scriptIsFinal(sheet, before)).toBe(false);
    expect(review.scriptIsFinal(sheet, cfg.narration.clips.slice(1))).toBe(false);
    expect(review.scriptIsFinal(null, cfg.narration.clips)).toBe(false);
  });

  it('lays the script sheet out clip by clip, with the lengths, the marks and the two closing lists', () => {
    const part = html.split('<section id="script">')[1].split('</section>')[0];
    const sheet = out.model.script.sheet;
    expect(part.match(/<article class="row/g)).toHaveLength(32);
    expect(part.match(/<article class="row marked/g)).toHaveLength(sheet.totals.marked);
    expect([...part.matchAll(/<div class="script-clip" id="(script-n\d)">/g)].map((m) => m[1])).toEqual(sheet.clips.map((c: any) => `script-${c.id}`));
    for (const c of sheet.clips) expect(part).toContain(`<a href="#script-${c.id}">${c.id}</a>`);
    for (const x of sheet.rows) {
      expect(part).toContain(`<p class="text">${review.esc(x.text)}</p>`);
      for (const alt of x.mark?.replace ?? []) expect(part).toContain(`<span class="alt">${review.esc(alt.text)}</span>`);
    }
    expect(part).toContain(`<tr class="all"><td>all</td><td></td><td></td><td>${sheet.totals.seconds.toFixed(1)} s</td>`);
    expect(part).toContain('<h3>Shown and not named</h3>');
    expect(part).toContain('<h3>The rules of the note, checked on the draft</h3>');
    expect(part).toContain('The script is final.');
    // The last column of the sheet is the approved script, the 22 lines the film speaks, since the narration was cut.
    expect(part).toContain('<th>Approved script</th>');
    expect(part).toContain('The film speaks 22 of these 32 lines, with 10 lines cut from the film whole and 1 line cut to its first words.');
    expect(part).toContain('its last column is the approved script, the lines the film speaks');
    expect(part.match(/<p class="film">/g)).toHaveLength(11);
    expect(part).not.toContain('No narration is made from this draft');
    expect(part).not.toContain('<section');
    expect(review.counts(out.model).script).toBe(32);
  });

  it('shows the sheet\'s small pictures from the review folder, each copied once', () => {
    const part = html.split('<section id="script">')[1].split('</section>')[0];
    const shown = new Set([...part.matchAll(/<img src="(review\/script\/[^"]+)"/g)].map((m) => m[1]));
    expect(shown.size).toBe(out.model.script.pictures.length);
    expect(shown.size).toBeGreaterThan(30);
    for (const f of shown) expect(fs.existsSync(path.join(r, 'dist', decodeURIComponent(f)))).toBe(true);
    expect(fs.readdirSync(path.join(r, 'dist', 'review', 'script'))).toHaveLength(shown.size);
  });

  it('keeps the sheet\'s style from the page\'s own rules for sections and times', () => {
    const style = html.match(/<style>([\s\S]*?)<\/style>/)![1];
    expect(style).toContain('.script-sheet .row .when { margin: 0; color: inherit; }');
    expect(style).toContain('.row .swap .alt');
    expect(style).not.toMatch(/url\(|@import/);
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
  it('reads which take of a sound was kept and the fault it was kept with', () => {
    expect(review.takes('Takes: 2 made, take 2 kept with a fault. Take 2 was kept with a fault. The Builder\'s verdict names a fault: Three thumps where one is asked..\n')).toEqual({ made: 2, kept: 2, fault: 'Three thumps where one is asked' });
    expect(review.takes('x\nTakes: 2 made, take 1 kept. Take 1 was kept: the Builder chose it of the 2 made, with no fault by measure.\ny')).toEqual({ made: 2, kept: 1, fault: null });
    expect(review.takes('Takes: 1 made, take 1 kept')).toEqual({ made: 1, kept: 1, fault: null });
    expect(review.takes('Takes: 2 made, take 1 kept with a fault.')).toEqual({ made: 2, kept: 1, fault: 'The record does not say which' });
    expect(review.takes('Text or description: none')).toBeNull();
  });

  it('reads every sound record of the repo', () => {
    const dir = new URL('../audio/records/', import.meta.url);
    const sounds = fs.readdirSync(dir).filter((n) => /-(bed|life|event|thud)\.md$/.test(n));
    expect(sounds).toHaveLength(20);
    const read = sounds.map((n) => review.takes(fs.readFileSync(new URL(n, dir), 'utf8')));
    for (const t of read) {
      expect(t).not.toBeNull();
      expect(t.kept).toBeLessThanOrEqual(t.made);
      expect(t.made).toBeLessThanOrEqual(2);
    }
    expect(read.filter((t) => t.fault).length).toBe(8);
  });

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

  it('plays the Heart review clip first while the review waits, though the animatic was made after it', () => {
    const film = path.join(r, 'deliver', 'film');
    const clip = cfg.export.files.heartReview;
    const animatic = cfg.export.files.animatic;
    const file = path.join(r, 'kit', 'PROGRESS.md');
    const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    put(path.join(film, clip), 'the clip');
    put(path.join(film, animatic), 'the animatic');
    fs.utimesSync(path.join(film, clip), new Date('2026-11-25T19:42:00Z'), new Date('2026-11-25T19:42:00Z'));
    fs.utimesSync(path.join(film, animatic), new Date('2026-11-25T19:50:00Z'), new Date('2026-11-25T19:50:00Z'));
    const names = () => review.collect(r, cfg).watch.videos.map((v: any) => v.name).filter((n: string) => n === clip || n === animatic);
    put(file, '# Progress\n\n## Status\n\n- Review: not reached\n- Review round: none\n');
    expect(names()).toEqual([animatic, clip]);
    put(file, '# Progress\n\n## Status\n\n- Review: waiting\n- Review round: round 1 in progress\n');
    expect(names()).toEqual([clip, animatic]);
    put(file, '# Progress\n\n## Status\n\n- Review: approved\n');
    expect(names()).toEqual([animatic, clip]);
    if (before === null) fs.rmSync(file);
    else put(file, before);
  });

  it('keeps the time a short clip was made, and the page plays a film before a clip made at the same time', async () => {
    const film = path.join(r, 'out', 'work', 'film');
    const clips = path.join(r, 'out', 'work', 'clips');
    const clip = cfg.export.files.heartReview;
    const made = new Date('2026-11-25T16:11:48Z');
    put(path.join(film, clip), 'the clip');
    fs.utimesSync(path.join(film, clip), made, made);
    fs.mkdirSync(clips, { recursive: true });
    ffmpeg('-f', 'lavfi', '-i', 'color=c=black:s=64x36:r=10:d=0.5', '-pix_fmt', 'yuv420p', path.join(clips, 'heart.mp4'));
    fs.utimesSync(path.join(clips, 'heart.mp4'), made, made);
    await keeper.keep({ root: r, cfg, film: true });
    const out = await keeper.keep({ root: r, cfg, unit: 'heart' });
    expect(out.kept.map((k: any) => k.file)).toContain('out/clips/heart.mp4');
    expect(fs.statSync(path.join(r, 'out', 'clips', 'heart.mp4')).mtime.toISOString()).toBe('2026-11-25T16:11:48.000Z');
    const shown = review.collect(r, cfg).watch.videos.map((v: any) => `${v.kind}/${v.name}`);
    expect(shown.indexOf(`film/${clip}`)).toBeGreaterThanOrEqual(0);
    expect(shown.indexOf(`film/${clip}`)).toBeLessThan(shown.indexOf('clip/heart.mp4'));
  });
});
