// @ts-nocheck
import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const tool = (name) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const g6 = await tool('checks/g6');
const { config, rel, readJson, ROOT } = await tool('lib/paths');
const { judgedList, judgedTable } = await tool('lib/judged');

const cfg = config();
const cut = readJson(rel('cut', 'CUTLIST.json'));
const list = judgedList(cfg, cut);
const clone = (v) => JSON.parse(JSON.stringify(v));
const progress = (body) => ['# Progress', '', '## Open items', '', 'none', '', `## ${g6.SECTION}`, '', 'The list.', '', body, '', '## Look lock', '', '| `ribs-0` | `ribs` | 1 | not this table |', ''].join('\n');
const dir = fs.mkdtempSync(path.join(rel('out', 'work'), 'test-g6-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

function root(name, { cutList = cut, text = progress(judgedTable(list)) } = {}) {
  const r = path.join(dir, name);
  fs.mkdirSync(path.join(r, 'cut'), { recursive: true });
  fs.mkdirSync(path.join(r, 'kit'), { recursive: true });
  if (cutList) fs.writeFileSync(path.join(r, 'cut', 'CUTLIST.json'), JSON.stringify(cutList));
  if (text !== null) fs.writeFileSync(path.join(r, 'kit', 'PROGRESS.md'), text);
  return r;
}

describe('the section of the judged frames', () => {
  it('reads only the lines under its heading', () => {
    const s = g6.sectionOf(progress('| `a` | `b` | 3 | x |'), g6.SECTION);
    expect(s).toContain('| `a` | `b` | 3 | x |');
    expect(s).not.toContain('not this table');
    expect(g6.sectionOf('# P\n\n## Other\n', g6.SECTION)).toBe(null);
  });
});

describe('the judged list against kit/PROGRESS.md', () => {
  it('passes when every computed frame is on the list', () => {
    const r = g6.judgedOnList(cfg, cut, progress(judgedTable(list)));
    expect(r.faults).toEqual([]);
    expect(r.info[0]).toBe(`${list.length} judged frames computed from the config and cut/CUTLIST.json, ${list.length} of them on the list in kit/PROGRESS.md.`);
  });

  it('names every frame that is missing while the list says none', () => {
    const r = g6.judgedOnList(cfg, cut, progress('none'));
    expect(r.faults.length).toBe(list.length);
    expect(r.faults[0]).toBe(`The judged frame ${list[0].id} is not on the judged list in kit/PROGRESS.md.`);
  });

  it('does not read a row of another section as a judged frame', () => {
    const table = judgedTable(list.filter((e) => e.id !== 'ribs-0'));
    expect(g6.judgedOnList(cfg, cut, progress(table)).faults).toEqual(['The judged frame ribs-0 is not on the judged list in kit/PROGRESS.md.']);
  });

  it('fails when the cut list moved a frame and the list did not follow', () => {
    const moved = clone(cut);
    moved.keyFrames['heart-2'] += 7;
    const r = g6.judgedOnList(cfg, moved, progress(judgedTable(list)));
    expect(r.faults).toEqual([`The judged frame heart-2 is at ${cut.keyFrames['heart-2'] + 7} and kit/PROGRESS.md says ${cut.keyFrames['heart-2']}.`]);
  });

  it('fails on a wrong unit and on a wrong loop frame', () => {
    const wrong = judgedTable(list).replace('| `heart-1` | `heart` |', '| `heart-1` | `ribs` |').replace('| loop 120 |', '| loop 121 |');
    const r = g6.judgedOnList(cfg, cut, progress(wrong));
    expect(r.faults.length).toBe(2);
    expect(r.faults.join(' ')).toMatch(/heart-1 belongs to heart and kit\/PROGRESS.md says ribs/);
    expect(r.faults.join(' ')).toMatch(/loop-1 is at loop 120 and kit\/PROGRESS.md says loop 121/);
  });

  it('lets the list hold entries that were added', () => {
    const more = judgedTable([...list, { id: 'heart-extra', unit: 'heart', frame: 3000, what: 'One more', added: true }]);
    const r = g6.judgedOnList(cfg, cut, progress(more));
    expect(r.faults).toEqual([]);
    expect(r.info[0]).toMatch(/which holds 1 more\.$/);
  });

  it('fails with one line when the file, the section or the places are missing', () => {
    expect(g6.judgedOnList(cfg, cut, null).faults).toEqual(['There is no kit/PROGRESS.md.']);
    expect(g6.judgedOnList(cfg, cut, '# P\n').faults).toEqual(['kit/PROGRESS.md has no section named Judged frames.']);
    const bare = clone(cut);
    delete bare.places;
    expect(g6.judgedOnList(cfg, bare, progress('none')).faults[0]).toMatch(/^The judged list could not be computed from cut\/CUTLIST.json: /);
  });
});

describe('the startup validation', () => {
  it('runs validate of src/config.ts on the config and passes', async () => {
    expect(await g6.validateConfig(cfg, ROOT)).toEqual([]);
  });

  it('gives the problems of a broken config', async () => {
    const bad = clone(cfg);
    delete bad.film.fps;
    bad.keys[0].image = 'references/approved/not-there.jpg';
    expect(await g6.validateConfig(bad, ROOT)).toEqual(['missing key: film.fps']);
    const worse = clone(cfg);
    worse.keys[0].image = 'references/approved/not-there.jpg';
    const problems = await g6.validateConfig(worse, ROOT);
    expect(problems.length).toBeGreaterThan(0);
    expect(g6.configFaults(problems).faults[0]).toMatch(/^config\/showcase.json does not pass startup validation: /);
  });
});

describe('G6', () => {
  it('passes on a valid config with the whole list written down', async () => {
    const r = await g6.runG6({ root: root('good'), config: cfg, phase: 2 }, async () => []);
    expect(r.ok).toBe(true);
    expect(r.lines).toEqual(['config/showcase.json passes startup validation.', `${list.length} judged frames computed from the config and cut/CUTLIST.json, ${list.length} of them on the list in kit/PROGRESS.md.`]);
    expect(r.skipped).toEqual([]);
  });

  it('fails when validation finds a problem, and still reads the list', async () => {
    const r = await g6.runG6({ root: root('invalid'), config: cfg, phase: 2 }, async () => ['missing key: film.fps']);
    expect(r.ok).toBe(false);
    expect(r.lines[0]).toBe('config/showcase.json does not pass startup validation: missing key: film.fps');
    expect(r.lines[1]).toMatch(/^noted: \d+ judged frames/);
  });

  it('fails when the list in kit/PROGRESS.md says none', async () => {
    const r = await g6.runG6({ root: root('none', { text: progress('none') }), config: cfg, phase: 2 }, async () => []);
    expect(r.ok).toBe(false);
    expect(r.lines.filter((l) => /is not on the judged list/.test(l)).length).toBe(list.length);
  });

  it('fails with one line when validation cannot be run', async () => {
    const r = await g6.runG6({ root: root('broken'), config: cfg, phase: 2 }, async () => {
      throw new Error('no such module\nmore');
    });
    expect(r.ok).toBe(false);
    expect(r.lines[0]).toBe('The startup validation of config/showcase.json could not be run: no such module');
  });

  it('says what it did not check when there is no cut list', async () => {
    const r = await g6.runG6({ root: root('nocut', { cutList: null }), config: cfg, phase: 2 }, async () => []);
    expect(r.ok).toBe(true);
    expect(r.skipped).toEqual(['no cut/CUTLIST.json yet, so the judged list was not computed']);
  });

  it('runs for real on this repo and reports the state of the list', async () => {
    const r = await g6.runG6({ root: ROOT, config: cfg, phase: 2 });
    expect(r.lines.some((l) => /config\/showcase.json passes startup validation\.$/.test(l))).toBe(true);
    expect(typeof r.ok).toBe('boolean');
  });
});
