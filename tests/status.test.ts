// @ts-nocheck
import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const status = await import(new URL('../tools/status.mjs', import.meta.url).href);
const paths = await import(new URL('../tools/lib/paths.mjs', import.meta.url).href);
const progress = await import(new URL('../tools/lib/progress.mjs', import.meta.url).href);

const cfg = paths.config();
const dirs = [];
const READING = {
  now: '2026-11-24T21:30:12Z',
  lines: ['phase 0: 1.00 h used of 3.00 h', 'build: 1.00 h used of 72.00 h', 'extra rounds: yes', 'minutes since the last status: 21'],
};

async function picture(file, width = 64, height = 36) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp({ create: { width, height, channels: 3, background: { r: 200, g: 90, b: 30 } } }).toFile(file);
  return file;
}

async function world() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'carcass-status-'));
  dirs.push(root);
  const progressFile = path.join(root, 'PROGRESS.md');
  fs.copyFileSync(paths.rel('tests', 'fixtures', 'progress-at-status-3.md'), progressFile);
  await picture(path.join(root, 'references', 'approved', 'contact-sheet.jpg'), 80, 60);
  const said = [];
  const calls = [];
  const base = {
    root,
    cfg,
    progressFile,
    reading: READING,
    looks: [],
    phase: 0,
    log: (l) => said.push(l),
    compareKey: async (a) => {
      calls.push(a);
      return { file: await picture(path.join(root, 'out', 'work', 'compare', `${a.key}.png`), 320, 180), files: [] };
    },
  };
  return { root, progressFile, said, calls, base, stills: path.join(root, 'out', 'stills', 'status'), work: path.join(root, 'out', 'work', 'status') };
}

async function looks(root, count, width = 64, height = 36) {
  const out = [];
  for (let i = 1; i <= count; i++) {
    const file = path.join('out', 'work', 'stills', `look-${i}.png`);
    await picture(path.join(root, file), width, height);
    out.push({ file, caption: `look ${i}`, at: `2026-11-24T21:${String(i).padStart(2, '0')}:00Z`, by: 'builder' });
  }
  return out;
}

const jpgs = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort();

afterAll(() => {
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
});

describe('the pictures a status chooses', () => {
  it('puts the sound sheet first, then the picks, the comparison and the newest looks, inside the limit', async () => {
    const w = await world();
    await picture(path.join(w.root, 'out', 'work', 'sound', 'sheet.png'));
    await picture(path.join(w.root, 'picked', 'one.png'));
    const out = await status.buildStatus({
      ...w.base,
      sounds: true,
      unit: 'heart',
      picks: [{ file: 'picked/one.png', caption: 'the picked one' }],
      looks: await looks(w.root, 6),
    });
    const firstKey = cfg.keys.find((k) => k.unit === 'heart').id;
    expect(out.pictures.length).toBe(cfg.status.maxPictures);
    expect(out.pictures.map((p) => p.source).slice(0, 3)).toEqual([
      path.join('out', 'work', 'sound', 'sheet.png'),
      path.join('picked', 'one.png'),
      path.join('out', 'work', 'compare', `${firstKey}.png`),
    ]);
    expect(out.pictures[1].caption).toBe('the picked one');
    expect(out.pictures.slice(3).map((p) => p.caption)).toEqual(['look 6'].slice(0, cfg.status.maxPictures - 3));
    expect(w.calls).toEqual([{ key: firstKey, tier: 'review', format: 'hd', by: 'status' }]);
    expect(out.pictures.map((p) => p.name)).toEqual(jpgs(w.stills));
    expect(out.pictures[0].name).toBe('01-sounds.jpg');
    expect(out.pictures[1].name).toBe('02-one.jpg');
  });

  it('takes the key that is asked for', async () => {
    const w = await world();
    const key = cfg.keys.filter((k) => k.unit === 'heart')[1].id;
    await status.buildStatus({ ...w.base, unit: 'heart', key });
    expect(w.calls.map((c) => c.key)).toEqual([key]);
  });

  it('never goes over the config value, and takes a smaller limit', async () => {
    const w = await world();
    const all = await looks(w.root, cfg.status.maxPictures + 3);
    const big = await status.buildStatus({ ...w.base, looks: all, max: cfg.status.maxPictures + 5 });
    expect(big.pictures.length).toBe(cfg.status.maxPictures);
    const w2 = await world();
    const small = await status.buildStatus({ ...w2.base, looks: await looks(w2.root, 5), max: 1 });
    expect(small.pictures.map((p) => p.caption)).toEqual(['look 5']);
  });

  it('never comes back empty', async () => {
    const w = await world();
    const out = await status.buildStatus({ ...w.base });
    expect(out.pictures.length).toBe(1);
    expect(out.pictures[0].source).toBe(path.join('references', 'approved', 'contact-sheet.jpg'));
    expect(out.pictures[0].caption).toBe('The approved contact sheet. Nothing has been rendered yet');
    expect(jpgs(w.stills)).toEqual(['01-contact-sheet.jpg']);
  });

  it('shows no look twice across two runs, newest first, and skips files that are gone', async () => {
    const w = await world();
    const all = await looks(w.root, cfg.status.maxPictures + 2);
    fs.rmSync(path.join(w.root, all[all.length - 2].file));
    const one = await status.buildStatus({ ...w.base, looks: all });
    const two = await status.buildStatus({ ...w.base, looks: all });
    const first = one.pictures.map((p) => p.source);
    const second = two.pictures.map((p) => p.source);
    expect(first[0]).toBe(all[all.length - 1].file);
    expect(first).not.toContain(all[all.length - 2].file);
    expect(first.length).toBe(cfg.status.maxPictures);
    expect(second.length).toBe(1);
    expect(second.filter((s) => first.includes(s))).toEqual([]);
    expect(new Set([...first, ...second]).size).toBe(first.length + second.length);
    const three = await status.buildStatus({ ...w.base, looks: all });
    expect(three.pictures.map((p) => p.source)).toEqual([path.join('references', 'approved', 'contact-sheet.jpg')]);
    expect(three.pictures[0].caption).toMatch(/^The approved contact sheet\. Nothing new/);
    const shown = paths.readJson(path.join(w.work, 'shown.json')).shown;
    expect(Object.keys(shown).sort()).toEqual([...first, ...second].sort());
  });

  it('shows a look again when its file was made anew, and a picked file once', async () => {
    const w = await world();
    const all = await looks(w.root, 2);
    const one = await status.buildStatus({ ...w.base, looks: all, picks: [{ file: all[1].file, caption: 'picked' }] });
    expect(one.pictures.map((p) => p.caption)).toEqual(['picked', 'look 1']);
    const again = [...all, { ...all[0], caption: 'look 1 again', at: '2026-11-24T21:40:00Z' }];
    const two = await status.buildStatus({ ...w.base, looks: again });
    expect(two.pictures.map((p) => p.caption)).toEqual(['look 1 again']);
  });
});

describe('rendering', () => {
  it('renders nothing with no render', async () => {
    const w = await world();
    const out = await status.buildStatus({ ...w.base, unit: 'heart', render: false, looks: await looks(w.root, 1) });
    expect(w.calls).toEqual([]);
    expect(out.compared).toBe(false);
    expect(out.pictures.map((p) => p.caption)).toEqual(['look 1']);
  });

  it('renders nothing while a live render job holds the lock', async () => {
    const w = await world();
    const lock = path.join(w.root, 'out', 'work', 'render.lock');
    fs.mkdirSync(path.dirname(lock), { recursive: true });
    fs.writeFileSync(lock, `${process.pid}\n`);
    await status.buildStatus({ ...w.base, unit: 'heart' });
    expect(w.calls).toEqual([]);
    expect(w.said.some((l) => /render job is running/.test(l))).toBe(true);
  });

  it('renders when the lock names a process that is gone', async () => {
    const w = await world();
    const lock = path.join(w.root, 'out', 'work', 'render.lock');
    fs.mkdirSync(path.dirname(lock), { recursive: true });
    fs.writeFileSync(lock, '2147483646\n');
    await status.buildStatus({ ...w.base, unit: 'heart' });
    expect(w.calls.length).toBe(1);
  });

  it('carries on with one line when the comparison throws', async () => {
    const w = await world();
    const out = await status.buildStatus({
      ...w.base,
      unit: 'heart',
      compareKey: async () => {
        throw new Error('no renderer yet');
      },
    });
    expect(w.said.filter((l) => /comparison/.test(l)).length).toBe(1);
    expect(out.pictures.length).toBe(1);
  });
});

describe('what a status writes', () => {
  it('resizes to the long edge and never enlarges, as jpeg', async () => {
    const w = await world();
    const edge = cfg.status.pictureLongEdgePx;
    await picture(path.join(w.root, 'wide.png'), edge * 2, edge);
    await picture(path.join(w.root, 'tall.png'), Math.round(edge / 2), edge + 100);
    await picture(path.join(w.root, 'small.png'), 90, 50);
    const out = await status.buildStatus({
      ...w.base,
      picks: ['wide.png', 'tall.png', 'small.png'].map((file) => ({ file, caption: file })),
    });
    const sizes = [];
    for (const p of out.pictures) {
      const m = await sharp(p.file).metadata();
      expect(m.format).toBe('jpeg');
      sizes.push([m.width, m.height]);
    }
    expect(sizes[0]).toEqual([edge, edge / 2]);
    expect(sizes[1][1]).toBe(edge);
    expect(sizes[1][0]).toBeLessThan(edge / 2);
    expect(sizes[2]).toEqual([90, 50]);
    expect(out.pictures.map((p) => [p.w, p.h])).toEqual(sizes);
  });

  it('writes STATUS.md in the exact shape and counts up', async () => {
    const w = await world();
    await picture(path.join(w.root, 'spike-still.png'));
    const out = await status.buildStatus({ ...w.base, picks: [{ file: 'spike-still.png', caption: 'the caption of the picture' }] });
    expect(out.number).toBe(4);
    expect(fs.readFileSync(path.join(w.stills, 'STATUS.md'), 'utf8')).toBe(
      '# Status 4\n\n2026-11-24 21:30 UTC. Phase 0, ground truth.\n\n- `01-spike-still.jpg`: the caption of the picture\n',
    );
    const next = await status.buildStatus({ ...w.base, phase: 3, unit: 'heart', render: false });
    expect(next.number).toBe(5);
    const md = fs.readFileSync(path.join(w.stills, 'STATUS.md'), 'utf8').split('\n');
    expect(md[0]).toBe('# Status 5');
    expect(md[2]).toBe('2026-11-24 21:30 UTC. Phase 3, the look lock: the Heart. Unit heart.');
    const set = await status.buildStatus({ ...w.base, number: 12 });
    expect(set.number).toBe(12);
    expect(fs.readFileSync(path.join(w.stills, 'STATUS.md'), 'utf8').startsWith('# Status 12\n')).toBe(true);
  });

  it('removes the old pictures', async () => {
    const w = await world();
    await picture(path.join(w.stills, '01-old.jpg'));
    await picture(path.join(w.stills, '02-older.jpg'));
    await status.buildStatus({ ...w.base, looks: await looks(w.root, 1) });
    expect(jpgs(w.stills)).toEqual(['01-look-1.jpg']);
    const again = await status.buildStatus({ ...w.base, picks: [{ file: path.join(w.stills, '01-look-1.jpg'), caption: 'the same again' }] });
    expect(again.pictures.map((p) => p.name)).toEqual(['01-look-1.jpg']);
    expect(fs.readdirSync(w.stills).sort()).toEqual(['01-look-1.jpg', 'STATUS.md']);
  });

  it('writes the json the widget reads, and the note', async () => {
    const w = await world();
    const out = await status.buildStatus({ ...w.base, looks: await looks(w.root, 2, 320, 180), notes: ['What changed \u2014 a lot\u0021', 'What is next'] });
    const json = paths.readJson(path.join(w.work, 'status.json'));
    expect(Object.keys(json)).toEqual(['pics']);
    expect(json.pics.length).toBe(2);
    for (const [i, p] of json.pics.entries()) {
      expect(Object.keys(p)).toEqual(['label', 'w', 'h', 'src']);
      expect(p.label).toBe(out.pictures[i].caption);
      expect([p.w, p.h]).toEqual([320, 180]);
      expect(p.src.startsWith('data:image/jpeg;base64,')).toBe(true);
      const data = Buffer.from(p.src.split(',')[1], 'base64');
      expect(data.equals(fs.readFileSync(out.pictures[i].file))).toBe(true);
    }
    const note = fs.readFileSync(path.join(w.work, 'note.txt'), 'utf8');
    expect(note).toBe(out.lines.join('\n') + '\n');
    expect(w.said).toEqual(out.lines);
    expect(out.lines).toEqual([
      'Status 4. Phase 0, ground truth.',
      'What changed - a lot',
      'What is next',
      'phase 0: 1.00 h used of 3.00 h',
      'build: 1.00 h used of 72.00 h',
      '- 01-look-2.jpg: look 2',
      '- 02-look-1.jpg: look 1',
    ]);
    expect(note).not.toMatch(/[\u2014!]/);
  });

  it('prints the review page once there is one', async () => {
    const w = await world();
    fs.writeFileSync(w.progressFile, progress.setLine('Review page', 'https://example.org/review', fs.readFileSync(w.progressFile, 'utf8')));
    const out = await status.buildStatus({ ...w.base, reviewRound: 2 });
    expect(out.lines[0]).toBe('Status 4. Phase 0, ground truth. Review round 2.');
    expect(out.lines[out.lines.length - 1]).toBe('Review page: https://example.org/review');
  });

  it('updates the two sections of the progress file and nothing else', async () => {
    const w = await world();
    const before = fs.readFileSync(w.progressFile, 'utf8');
    await status.buildStatus({ ...w.base, looks: await looks(w.root, 2) });
    const after = fs.readFileSync(w.progressFile, 'utf8');
    const latest = progress.getSection('Latest pictures', after).split('\n');
    expect(latest[0]).toBe(progress.getSection('Latest pictures', before).split('\n')[0]);
    expect(latest.slice(1, 6)).toEqual(['', 'Status 4, 2026-11-24 21:30 UTC:', '', '- `01-look-2.jpg`: look 2', '- `02-look-1.jpg`: look 1']);
    const mentions = latest.slice(7);
    expect(mentions.length).toBe(3);
    expect(mentions.map((m) => m.match(/^Status (\d+), \d{4}-\d\d-\d\d \d\d:\d\d UTC, showed/)?.[1])).toEqual(['3', '2', '1']);
    expect(progress.getSection('Clock', after)).toBe(
      [progress.getSection('Clock', before).split('\n')[0], '', '```', READING.now, ...READING.lines, '```'].join('\n'),
    );
    const others = (t) => progress.setSection('Clock', 'x', progress.setSection('Latest pictures', 'x', t));
    expect(others(after)).toBe(others(before));

    await status.buildStatus({ ...w.base, tick: false, now: READING.now, reading: { now: '2026-11-24T21:45:00Z', lines: ['phase 0: 2.00 h used of 3.00 h'] } });
    const text = fs.readFileSync(w.progressFile, 'utf8');
    expect(progress.getSection('Clock', text)).toBe(progress.getSection('Clock', after));
    const last = progress.getSection('Latest pictures', text).split('\n');
    expect(last[2]).toBe('Status 5, 2026-11-24 21:30 UTC:');
    const kept = last.filter((l) => /^Status \d+, .* UTC, showed/.test(l));
    expect(kept.map((m) => m.match(/^Status (\d+)/)[1])).toEqual(['4', '3', '2']);
    expect(kept[0]).toBe('Status 4, 2026-11-24 21:30 UTC, showed: look 2; look 1.');
    expect(mentions[0]).toBe('Status 3, 2026-11-24 21:09 UTC, showed: how many digits of a test chart each model family read, at the size the critics will be sent and at a size over the limit.');
  });
});

describe('the command line', () => {
  it('pairs each picked file with its caption', () => {
    const o = status.parse(['--phase', '2', '--pick', 'a.png=first one', '--pick', 'b.png', '--caption', 'second one', '--note', 'one', '--note', 'two', '--no-render', '--no-tick', '--max', '2']);
    expect(o.picks).toEqual([
      { file: 'a.png', caption: 'first one' },
      { file: 'b.png', caption: 'second one' },
    ]);
    expect(o.notes).toEqual(['one', 'two']);
    expect([o.phase, o.render, o.tick, o.sounds, o.max]).toEqual(['2', false, false, false, '2']);
    expect(status.USAGE).not.toMatch(/[\u2014!]/);
  });
});
