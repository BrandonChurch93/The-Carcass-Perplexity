// @ts-nocheck
import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const tool = (name) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const core = await tool('lib/pack-core');
const cmd = await tool('pack');
const img = await tool('lib/img');
const { sheet } = await tool('sheet');
const { config, rel, readJson, ROOT } = await tool('lib/paths');
const { judgedFrames, judgedList, riseShot } = await tool('lib/judged');

const cfg = config();
const cut = readJson(rel('cut', 'CUTLIST.json'));
const max = cfg.critics.maxFilesPerMessage;
const count = cfg.critics.contactSheetFrames;
const places = cfg.film.order.slice(0, -1);
const reveal = cfg.film.order[cfg.film.order.length - 1];
const filmUnit = cfg.units[cfg.units.length - 1].id;
const dir = fs.mkdtempSync(path.join(rel('out', 'work'), 'test-pack-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const loop = { frameCount: cfg.deliver.cardLoop.seconds * cut.fps, unit: cfg.deliver.cardLoop.unit };
const realFilm = () => ({ fps: cut.fps, frameCount: cut.frameCount, shots: cut.shots, places: cut.places, keyFrames: cut.keyFrames, judged: judgedFrames(cfg, cut), events: cut.events, titanFrame: cut.titanFrame, loop });
const testScene = () => ({ fps: 60, frameCount: 600, shots: [{ id: 'test', unit: null, first: 0, last: 599, key: null }], keyFrames: {}, events: [], titanFrame: null, loop: { frameCount: 480, unit: 'heart' } });
const filled = (film = realFilm()) => core.standInFilm(film, cut, cfg).film;
const items = (plan) => plan.groups.flatMap((g) => g.items);
const withFiles = (groups) => groups.map((g) => ({ items: g.items.map((i) => ({ ...i, files: i.kind === 'pair' ? [{ side: 'a', buffer: Buffer.from('a') }, { side: 'b', buffer: Buffer.from('b') }] : [{ side: null, buffer: Buffer.from('s') }] })) }));
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function chunks(file) {
  const b = fs.readFileSync(file);
  const out = [];
  for (let p = 8; p < b.length; ) {
    const len = b.readUInt32BE(p);
    out.push(b.toString('latin1', p + 4, p + 8));
    p += 12 + len;
  }
  return out;
}

function tree(base) {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(base, p)] = sha(p);
    }
  };
  walk(base);
  return out;
}

async function build(name, a = {}) {
  const base = path.join(dir, name);
  const lines = [];
  const r = await cmd.packCommand(
    { round: '1', unit: filmUnit, critic: 'R4b', tier: 'draft', format: 'preview', ...a },
    { renderer: img.fakeRenderer(path.join(dir, 'stills')), outDir: path.join(base, 'packs'), keyDir: path.join(base, 'keys'), scratch: path.join(base, 'work'), root: base, print: (l) => lines.push(l) },
  );
  return { base, lines, ...r };
}

describe('which critics get a pack for a unit', () => {
  it('follows the table of the quality bar', () => {
    for (const p of places) expect(core.criticsFor(cfg, p)).toEqual(['R1', 'R2', 'R3', 'R4']);
    expect(core.criticsFor(cfg, reveal)).toEqual(['R1', 'R2', 'R3', 'R4', 'R8']);
    expect(core.criticsFor(cfg, filmUnit)).toEqual(['R2', 'R4', 'R5', 'R6', 'R7']);
  });

  it('gives the blockout critic only when asked, and only for the film', () => {
    expect(core.criticsFor(cfg, filmUnit, 'R4b')).toEqual(['R4b']);
    expect(() => core.criticsFor(cfg, 'heart', 'R4b')).toThrow(/R4b judges only the unit film/);
    expect(() => core.criticsFor(cfg, 'heart', 'R5')).toThrow(/R5 does not judge the unit heart/);
    expect(() => core.criticsFor(cfg, 'nowhere')).toThrow(/no unit nowhere/);
  });
});

describe('neutral names', () => {
  it('are of the form set-A-07.png, with -a and -b for a pair', () => {
    expect(core.neutralName(0, 7)).toBe('set-A-07.png');
    expect(core.neutralName(2, 11, 'b')).toBe('set-C-11-b.png');
    expect(core.setLetter(25)).toBe('Z');
    expect(core.setLetter(26)).toBe('AA');
  });

  it('never hold a banned word, the name of a unit or of a key', () => {
    for (let p = 0; p < 30; p++) for (const side of [null, 'a', 'b']) expect(core.nameFaults(core.neutralName(p, p + 1, side), cfg)).toEqual([]);
    expect(core.nameFaults(core.SETTLED_FILE, cfg)).toEqual([]);
    const banned = core.bannedWords(cfg);
    for (const w of ['render', 'target', 'approved', 'generated', 'final', 'blockout', ...cfg.units.map((u) => u.id), ...cfg.keys.map((k) => k.id)]) expect(banned).toContain(w);
    for (const bad of ['heart-0.png', 'set-A-01-final.png', 'approved-a.png', 'blockout-sheet.png', 'reveal-4-b.png']) expect(core.nameFaults(bad, cfg).length).toBeGreaterThan(0);
  });
});

describe('the limits of a picture', () => {
  it('come from the config, and are tighter for the carbon family', () => {
    expect(core.packLimits(cfg)).toEqual({ maxEdge: cfg.critics.maxImageLongEdgePx, maxMegapixels: cfg.critics.maxImageMegapixels });
    expect(core.packLimits(cfg, 'carbon').maxEdge).toBe(Math.min(1048, cfg.critics.maxImageLongEdgePx));
  });
});

describe('stand-in data where the film on the page has none', () => {
  it('leaves a whole film alone', () => {
    const r = core.standInFilm(realFilm(), cut, cfg);
    expect(r.notes).toEqual([]);
    expect(r.film.places).toEqual(cut.places);
    expect(r.film.lake).toBe(riseShot(cut).first);
  });

  it('scales the cut list to the test scene and says so', () => {
    const r = core.standInFilm(testScene(), cut, cfg);
    expect(r.notes.length).toBe(4);
    for (const n of r.notes) expect(n).toMatch(/stand-in data: the cut list scaled from 11861 frames to the 600 frames of the film on the page\.$/);
    expect(r.film.places.map((p) => p.unit)).toEqual(cfg.film.order);
    expect(r.film.places[0].first).toBe(0);
    expect(r.film.places[r.film.places.length - 1].last).toBe(599);
    r.film.places.slice(1).forEach((p, i) => expect(p.first).toBe(r.film.places[i].last + 1));
    for (const k of cfg.keys) {
      const p = r.film.places.find((x) => x.unit === k.unit);
      expect(r.film.keyFrames[k.id]).toBeGreaterThanOrEqual(p.first);
      expect(r.film.keyFrames[k.id]).toBeLessThanOrEqual(p.last);
    }
    expect(r.film.titanFrame).toBe(Math.round((cut.titanFrame * 599) / (cut.frameCount - 1)));
    expect(r.film.lake).toBe(0);
  });

  it('takes the cut list as it is when only the frame counts agree', () => {
    const film = realFilm();
    delete film.places;
    delete film.judged;
    const r = core.standInFilm(film, cut, cfg);
    expect(r.film.places).toEqual(cut.places);
    expect(r.notes).toEqual(['The film on the page has no places, so the spans of the places are taken from the cut list.', 'The film on the page has no judged list, so the judged frames are taken from the cut list.']);
  });
});

describe('the R4 blockout plan', () => {
  const plan = core.planR4b({ cfg, cut, film: filled(), unit: filmUnit });
  const all = items(plan);

  it('holds the whole film sheets, a sheet for each place and one for the rise', () => {
    const sheets = all.filter((i) => i.kind === 'sheet');
    expect(sheets.length).toBe(core.FILM_SHEETS + cut.places.length + 1);
    expect(sheets[0].frames[0]).toBe(0);
    expect(sheets[core.FILM_SHEETS - 1].frames.at(-1)).toBe(cut.frameCount - 1);
    const rise = sheets[core.FILM_SHEETS];
    expect(rise.frames[0]).toBe(riseShot(cut).first);
    expect(rise.frames.at(-1)).toBe(cut.titanFrame);
    cut.places.forEach((p, i) => {
      const s = plan.groups[i + 1].items[0];
      expect([s.frames[0], s.frames.at(-1)]).toEqual([p.first, p.last]);
      expect(s.frames.length).toBe(count);
    });
    for (const s of sheets) expect(s.title).not.toMatch(new RegExp(core.bannedWords(cfg).filter((w) => !['film', 'sheet'].includes(w)).join('|'), 'i'));
  });

  it('pairs each establishing key with its key frame, and uses the last key of the rise for the reveal', () => {
    const pairs = all.filter((i) => i.kind === 'pair');
    const want = [...cfg.keys.filter((k) => k.kind === 'establishing').map((k) => k.id), 'reveal-4'];
    expect(pairs.map((p) => p.key)).toEqual(want);
    for (const p of pairs) {
      expect(p.frame).toBe(cut.keyFrames[p.key]);
      expect(p.settled).toEqual([...cfg.settledAll, ...(cfg.settled[p.key] ?? [])]);
    }
    expect(plan.left).toEqual([]);
  });

  it('keeps the sheet of a place in one group with its pair', () => {
    for (const g of plan.groups.slice(1)) expect(g.items.map((i) => i.kind)).toEqual(['sheet', 'pair']);
  });
});

describe('the plans of the other critics', () => {
  it('R1: a pair and matching crops for each key of the unit', () => {
    const plan = core.planR1({ cfg, cut, film: filled(), unit: 'heart' });
    expect(plan.groups.map((g) => g.items.map((i) => `${i.kind} ${i.key}`))).toEqual(cfg.keys.filter((k) => k.unit === 'heart').map((k) => [`pair ${k.id}`, `match ${k.id}`]));
    expect(plan.groups[3].items[0].settled).toEqual([...cfg.settledAll, ...cfg.settled['heart-3']]);
  });

  it('R3: every judged frame of the unit, each with its crops', () => {
    const plan = core.planR3({ cfg, cut, film: filled(), unit: reveal });
    expect(plan.groups.length).toBe(cfg.keys.filter((k) => k.unit === reveal).length + 4);
    for (const g of plan.groups) expect(g.items.map((i) => i.kind)).toEqual(['still', 'crops']);
    expect(items(plan).some((i) => i.frame === cut.titanFrame)).toBe(true);
  });

  it('R4 for a place: a sheet for each shot, consecutive frames at each key and event, and it says what it left out', () => {
    const plan = core.planR4({ cfg, cut, film: filled(), unit: 'ribs' });
    const shots = cut.shots.filter((s) => s.unit === 'ribs');
    const events = cut.events.filter((e) => e.unit === 'ribs');
    expect(items(plan).length).toBe(shots.length + 5 + events.length);
    const runs = items(plan).slice(shots.length);
    for (const r of runs) expect(r.frames).toEqual(Array.from({ length: count }, (_, i) => r.frames[0] + i));
    expect(plan.left.join(' ')).toMatch(/camera held still was left out/);
  });

  it('R4 for the reveal: the whole rise in two sheets and consecutive frames of the handoff', () => {
    const plan = core.planR4({ cfg, cut, film: filled(), unit: reveal });
    const all = items(plan);
    expect(all.length).toBe(3);
    expect(all[0].frames[0]).toBe(riseShot(cut).first);
    expect(all[1].frames.at(-1)).toBe(cut.titanFrame);
    expect(all[2].frames[0]).toBeGreaterThan(riseShot(cut).first);
    expect(all[2].frames.at(-1)).toBeLessThan(cut.keyFrames['reveal-1']);
  });

  it('R4 for the film: the film, each change of place, the first and last seconds, the loop and its seam', () => {
    const plan = core.planR4({ cfg, cut, film: filled(), unit: filmUnit });
    const all = items(plan);
    expect(all.length).toBe(core.FILM_SHEETS + (cut.places.length - 1) + 2 + 2);
    const change = all[core.FILM_SHEETS];
    expect(change.frames).toContain(cut.places[1].first);
    expect(change.frames).toContain(cut.places[1].first - 1);
    const seam = all.at(-1).loopFrames;
    expect(seam.slice(0, count / 2).at(-1)).toBe(loop.frameCount - 1);
    expect(seam[count / 2]).toBe(0);
  });

  it('R5: the film sheets, the judged frames of the film in order four to a picture, and one sheet of the opening views', () => {
    const plan = core.planR5({ cfg, cut, film: filled(), unit: filmUnit });
    const tiles = items(plan).filter((i) => i.kind === 'tiles');
    const shown = tiles.flatMap((t) => t.entries);
    expect(shown[0]).toEqual({ id: `${filmUnit}-first`, frame: 0 });
    expect(shown.filter((e) => e.loop !== undefined).length).toBe(4);
    expect(shown.map((e) => e.id)).toEqual(judgedList(cfg, cut).filter((e) => e.unit === filmUnit).map((e) => e.id));
    for (const t of tiles) expect(t.entries.length).toBeLessThanOrEqual(4);
    const last = items(plan).at(-1);
    expect(last.frames).toEqual([...places.map((p) => cut.keyFrames[`${p}-0`]), cut.titanFrame]);
    const packs = core.splitGroups(withFiles(plan.groups), max);
    expect(packs.length).toBe(1);
  });

  it('R6: frame 0 and frames across the hook, at phone width, in one pack', () => {
    const plan = core.planR6({ cfg, cut, film: filled(), unit: filmUnit });
    const all = items(plan);
    expect(all.length).toBe(max);
    expect(all[0].frame).toBe(0);
    expect(all.at(-1).frame).toBe(cfg.film.hookSeconds * cut.fps);
    for (const i of all) expect(i.width).toBe(cfg.critics.phonePreviewWidthPx);
  });

  it('R7: no pack, and the plan says why', () => {
    expect(core.planFor('R7', {})).toEqual({ groups: [], left: ['The R7 pack was left out: there is no stress encode yet to take stills from.'] });
  });

  it('R2: one picture a pack, the keys first up to the limit, then the approved pictures as controls', () => {
    const plan = core.planR2({ cfg, cut, film: filled(), unit: reveal });
    expect(plan.single).toBe(true);
    const all = items(plan);
    const keys = cfg.keys.filter((k) => k.unit === reveal);
    expect(all.filter((i) => i.kind === 'still').map((i) => i.id)).toEqual([...keys.map((k) => k.id), `${reveal}-titan`, `${reveal}-handoff-1`].slice(0, cfg.quality.jury.stillsPerUnit));
    expect(all.filter((i) => i.kind === 'control').map((i) => i.image)).toEqual(keys.map((k) => k.image));
    const record = core.planR2({ cfg, cut, film: filled(), unit: reveal, record: true });
    expect(items(record).filter((i) => i.kind === 'still').length).toBe(keys.length + 4);
    const whole = core.planR2({ cfg, cut, film: filled(), unit: filmUnit });
    expect(items(whole).filter((i) => i.kind === 'control').map((i) => i.image)).toEqual([...cfg.keys.filter((k) => k.kind === 'establishing'), cfg.keys.find((k) => k.id === 'reveal-4')].map((k) => k.image));
    expect(items(whole)[0].frame).toBe(0);
  });

  it('R8: the titan frame and its control, each alone, at the width of the recognition test', () => {
    const plan = core.planR8({ cfg, cut, film: filled(), unit: reveal });
    expect(plan.single).toBe(true);
    expect(items(plan).map((i) => [i.kind, i.width])).toEqual([['still', cfg.quality.recognition.widthPx], ['control', cfg.quality.recognition.widthPx]]);
    expect(items(plan)[0].frame).toBe(cut.titanFrame);
    expect(items(plan)[1].image).toBe(cfg.keys.find((k) => k.id === 'reveal-4').image);
  });

  it('renders judged frames at the final tier in the master format and sheets at the review tier', () => {
    expect(core.usualFor('R1', { kind: 'pair' }, cfg)).toEqual({ tier: 'final', format: cfg.formats.master.id });
    expect(core.usualFor('R4', { kind: 'sheet' }, cfg)).toEqual({ tier: 'review', format: cfg.formats.preview.id });
  });
});

describe('splitting into packs', () => {
  it('never goes over the limit, counts the settled file and keeps a pair and a group whole', () => {
    const plan = core.planR4b({ cfg, cut, film: filled(), unit: filmUnit });
    const packs = core.namePacks(core.splitGroups(withFiles(plan.groups), max));
    expect(packs.length).toBe(3);
    let pairs = 0;
    for (const p of packs) {
      const n = p.files.length + (p.pairs ? 1 : 0);
      expect(n).toBeLessThanOrEqual(max);
      const a = p.files.filter((f) => /-a\.png$/.test(f.name)).map((f) => f.name.replace('-a.png', ''));
      const b = p.files.filter((f) => /-b\.png$/.test(f.name)).map((f) => f.name.replace('-b.png', ''));
      expect(a).toEqual(b);
      pairs += a.length;
      expect(new Set(p.files.map((f) => f.name)).size).toBe(p.files.length);
    }
    expect(pairs).toBe(7);
    expect(packs[0].files.map((f) => f.name)).toEqual(['set-A-01.png', 'set-A-02.png', 'set-A-03.png', 'set-A-04.png', 'set-A-05.png', 'set-A-06.png', 'set-A-07-a.png', 'set-A-07-b.png']);
  });

  it('splits a group that is too large between its pieces, and refuses a piece that cannot fit', () => {
    const big = withFiles([{ items: Array.from({ length: 7 }, (_, i) => ({ kind: 'sheet', what: `s${i}` })) }]);
    expect(core.splitGroups(big, 3).map((p) => p.files)).toEqual([3, 3, 1]);
    const pairs = withFiles([{ items: [{ kind: 'pair', what: 'p', settled: [] }] }, { items: [{ kind: 'pair', what: 'q', settled: [] }] }]);
    expect(core.splitGroups(pairs, 4).map((p) => p.files)).toEqual([3, 3]);
    expect(core.splitGroups(pairs, 5).map((p) => p.files)).toEqual([5]);
    expect(() => core.splitGroups(pairs, 2)).toThrow(/does not fit a pack of 2 files/);
  });

  it('writes the settled lines of each pair under its heading and the names of its two files, word for word', () => {
    const plan = core.planR1({ cfg, cut, film: filled(), unit: 'heart' });
    const packs = core.namePacks(core.splitGroups(withFiles(plan.groups), max));
    const text = core.settledText(packs[0]);
    const blocks = text.trimEnd().split('\n\n');
    expect(blocks[0]).toBe(['Settled', 'set-A-01-a.png and set-A-01-b.png', ...cfg.settledAll, ...cfg.settled['heart-0']].join('\n'));
    expect(blocks[1]).toBe(['Settled', 'set-A-03-a.png and set-A-03-b.png', ...cfg.settledAll].join('\n'));
    expect(core.settledText({ items: [{ kind: 'sheet' }], files: [] })).toBe(null);
  });
});

describe('an R4 blockout pack built from stand-in data', () => {
  it('holds only neutral PNG files inside the limits with no metadata, and a key file outside', async () => {
    const r = await build('one');
    expect(r.code).toBe(0);
    const entry = r.entries[0];
    expect(entry.packs.map((p) => p.id)).toEqual(['R4b-1', 'R4b-2', 'R4b-3']);
    expect(entry.notes.length).toBeGreaterThan(0);
    const limits = core.packLimits(cfg);
    let pictures = 0;
    for (const p of entry.packs) {
      const folder = path.join(r.base, p.folder);
      expect(fs.readdirSync(folder).sort()).toEqual([...p.files].sort());
      expect(p.files.length).toBeLessThanOrEqual(max);
      expect(p.attach.length).toBe(p.files.length);
      expect(p.files.includes('settled.txt')).toBe(p.pairs > 0);
      for (const name of p.files.filter((f) => f !== 'settled.txt')) {
        expect(core.nameFaults(name, cfg)).toEqual([]);
        const m = await sharp(path.join(folder, name)).metadata();
        expect(m.format).toBe('png');
        expect(img.inside(m.width, m.height, limits)).toBe(true);
        expect(chunks(path.join(folder, name)).filter((c) => !['IHDR', 'IDAT', 'IEND'].includes(c))).toEqual([]);
        pictures++;
      }
      const text = fs.readFileSync(path.join(folder, 'settled.txt'), 'utf8');
      expect(text.split('\n').filter((l) => l === 'Settled').length).toBe(p.pairs);
      for (const name of p.files.filter((f) => /-a\.png$/.test(f))) {
        const a = await sharp(path.join(folder, name)).metadata();
        const b = await sharp(path.join(folder, name.replace('-a.png', '-b.png'))).metadata();
        expect([a.width, a.height]).toEqual([b.width, b.height]);
        expect(text).toContain(`${name} and ${name.replace('-a.png', '-b.png')}`);
      }
    }
    expect(pictures).toBe(core.FILM_SHEETS + 1 + 7 + 14);
    const key = JSON.parse(fs.readFileSync(path.join(r.base, entry.key), 'utf8'));
    expect(path.relative(path.join(r.base, 'packs'), path.join(r.base, entry.key)).startsWith('..')).toBe(true);
    expect(Object.values(key.packs).flatMap((p) => Object.keys(p)).length).toBe(pictures);
    expect(key.packs['R4b-3'][entry.packs[2].files.find((f) => /-a\.png$/.test(f))]).toMatch(/approved picture/);
    const manifest = JSON.parse(fs.readFileSync(r.manifest, 'utf8'));
    expect(manifest.critics.map((c) => c.critic)).toEqual(['R4b']);
    expect(JSON.stringify(manifest)).not.toMatch(/20\d\d-\d\d-\d\dT/);
    for (const l of r.lines) expect(l.startsWith('pack: ')).toBe(true);
  }, 120000);

  it('is byte equal when it is built twice', async () => {
    const a = await build('one');
    const b = await build('two');
    const ta = tree(a.base);
    const tb = tree(b.base);
    for (const k of Object.keys(ta).filter((k) => !k.startsWith('work'))) expect(tb[k]).toBe(ta[k]);
    expect(Object.keys(tb).filter((k) => !k.startsWith('work')).length).toBe(Object.keys(ta).filter((k) => !k.startsWith('work')).length);
  }, 120000);

  it('keeps every picture inside 1048 px for the carbon family', async () => {
    const r = await build('carbon', { family: 'carbon' });
    for (const p of r.entries[0].packs) {
      for (const name of p.files.filter((f) => f !== 'settled.txt')) {
        const m = await sharp(path.join(r.base, p.folder, name)).metadata();
        expect(Math.max(m.width, m.height)).toBeLessThanOrEqual(1048);
      }
    }
  }, 120000);
});

describe('the crops and the pictures of the other packs', () => {
  it('makes native size crop sheets inside the limits, and matching crops with -a and -b', async () => {
    const r = img.fakeRenderer(path.join(dir, 'stills'));
    const still = await r.renderStill({ frame: 40, tier: 'draft', format: 'hd' });
    const limits = core.packLimits(cfg, 'carbon');
    const alone = await core.cropSheets({ frame: still.file, regions: core.lattice(), limits, title: 'frame 40' });
    expect(alone.length).toBe(2);
    const approved = rel(cfg.keys[0].image);
    const match = await core.cropSheets({ frame: still.file, approved, regions: await core.detailRegions(approved, { left: 0, top: 0, width: 1672, height: 940 }), limits, title: 'matching parts' });
    expect(match.length).toBe(1);
    for (const b of [...alone, ...match]) {
      const m = await sharp(b).metadata();
      expect(img.inside(m.width, m.height, limits)).toBe(true);
    }
  });

  it('strips every chunk of a PNG that is not the picture', async () => {
    const withText = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#336699' } }).withMetadata({ density: 300 }).png().toBuffer();
    const out = core.stripPng(withText);
    const file = path.join(dir, 'stripped.png');
    fs.writeFileSync(file, out);
    expect(chunks(file).every((c) => core.KEPT_CHUNKS.includes(c))).toBe(true);
    const m = await sharp(out).metadata();
    expect([m.width, m.height]).toEqual([8, 8]);
    expect((await sharp(out).raw().toBuffer()).equals(await sharp(withText).raw().toBuffer())).toBe(true);
  });

  it('tiles judged frames two across with the frame number under each', async () => {
    const r = img.fakeRenderer(path.join(dir, 'stills'));
    const item = { kind: 'tiles', entries: [{ id: 'x', frame: 0 }, { id: 'y', frame: 120 }, { id: 'z', loop: 240 }], title: 'frames of the film in order' };
    const made = await core.buildItem(item, { critic: 'R5', cfg, renderer: r, sheet, limits: core.packLimits(cfg), tier: 'draft', format: 'preview', scratch: path.join(dir, 'w'), approvedPath: rel });
    expect(made.files.length).toBe(1);
    const m = await sharp(made.files[0].buffer).metadata();
    expect(img.inside(m.width, m.height, core.packLimits(cfg))).toBe(true);
    expect(m.width).toBeGreaterThan(1000);
  });

  it('resizes a still to the phone width for R6 and strips it', async () => {
    const r = img.fakeRenderer(path.join(dir, 'stills'));
    const made = await core.buildItem({ kind: 'still', frame: 0, width: cfg.critics.phonePreviewWidthPx }, { critic: 'R6', cfg, renderer: r, sheet, limits: core.packLimits(cfg), tier: 'draft', format: 'preview', scratch: path.join(dir, 'w'), approvedPath: rel });
    const m = await sharp(made.files[0].buffer).metadata();
    expect(m.width).toBe(cfg.critics.phonePreviewWidthPx);
    expect(m.format).toBe('png');
    expect(m.exif ?? m.icc ?? m.xmp ?? null).toBe(null);
  });
});

describe('the one picture packs of R2 and R8', () => {
  it('gives each juror one file, with the control the same size and encoding as the judged image', async () => {
    const base = path.join(dir, 'r8');
    const deps = { renderer: img.fakeRenderer(path.join(dir, 'stills')), outDir: path.join(base, 'packs'), keyDir: path.join(base, 'keys'), scratch: path.join(base, 'work'), root: base, print: () => {} };
    const r8 = await cmd.packCommand({ round: '1', unit: reveal, critic: 'R8', tier: 'draft', format: 'preview' }, deps);
    expect(r8.entries[0].packs.map((p) => p.files)).toEqual([['set-A-01.png'], ['set-B-01.png']]);
    const sizes = [];
    for (const p of r8.entries[0].packs) {
      const m = await sharp(path.join(base, p.folder, p.files[0])).metadata();
      sizes.push([m.width, m.height, m.format, m.channels]);
    }
    expect(sizes[0]).toEqual(sizes[1]);
    expect(sizes[0][0]).toBe(cfg.quality.recognition.widthPx);
    const r2 = await cmd.packCommand({ round: '1', unit: reveal, critic: 'R2', tier: 'draft', format: 'preview' }, deps);
    const packs = r2.entries[0].packs;
    expect(packs.length).toBe(Math.min(cfg.quality.jury.stillsPerUnit, 8) + 4);
    for (const p of packs) expect(p.files.length).toBe(1);
    const first = await sharp(path.join(base, packs[0].folder, packs[0].files[0])).metadata();
    const last = await sharp(path.join(base, packs.at(-1).folder, packs.at(-1).files[0])).metadata();
    expect([last.width, last.height]).toEqual([first.width, first.height]);
    const manifest = JSON.parse(fs.readFileSync(r2.manifest, 'utf8'));
    expect(manifest.critics.map((c) => c.critic)).toEqual(['R2', 'R8']);
  }, 120000);
});

describe('the command', () => {
  it('exits 1 with one line on a missing round, an unknown unit and a critic that does not judge the unit', async () => {
    for (const a of [{ unit: filmUnit }, { round: '1', unit: 'nowhere' }, { round: '1', unit: 'heart', critic: 'R5' }, { round: '1', unit: filmUnit, critic: 'R4b', tier: 'best' }]) {
      const lines = [];
      const r = await cmd.packCommand({ fake: true, ...a }, { print: (l) => lines.push(l), outDir: path.join(dir, 'never') });
      expect(r.code).toBe(1);
      expect(lines.length).toBe(1);
      expect(lines[0].startsWith('pack: ')).toBe(true);
    }
    expect(fs.existsSync(path.join(dir, 'never'))).toBe(false);
  });

  it('writes a manifest that says what was left out when a critic has no pack', async () => {
    const base = path.join(dir, 'r7');
    const lines = [];
    const r = await cmd.packCommand({ round: '2', unit: filmUnit, critic: 'R7' }, { renderer: img.fakeRenderer(path.join(dir, 'stills')), outDir: path.join(base, 'packs'), keyDir: path.join(base, 'keys'), scratch: path.join(base, 'work'), root: base, print: (l) => lines.push(l) });
    expect(r.code).toBe(0);
    expect(r.entries[0].packs).toEqual([]);
    expect(r.entries[0].leftOut).toEqual(['The R7 pack was left out: there is no stress encode yet to take stills from.']);
    expect(lines).toContain('pack: R7: no pack');
  });
});
