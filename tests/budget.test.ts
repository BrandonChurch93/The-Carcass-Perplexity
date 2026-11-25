// @ts-nocheck
import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tool = (name) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const budget = await tool('budget');
const progress = await tool('lib/progress');
const { config, rel } = await tool('lib/paths');

const cfg = config();
const { film, sandbox, deliver, tiers } = cfg;
const ids = Object.values(cfg.formats).map((f) => f.id);
const master = cfg.formats.master.id;
const HOUR = 3600;

const dirs = [];
const temp = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'carcass-budget-'));
  dirs.push(d);
  return d;
};
afterAll(() => {
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
});

const COST = { uhd: { fixed: 2, sample: 4 }, hd: { fixed: 0.5, sample: 1 }, preview: { fixed: 0.25, sample: 0.25 } };

function fakeRenderer({ frameCount = 900, noise = [0, 0.3, -0.2], start = 12 } = {}) {
  const calls = [];
  let n = 0;
  return {
    calls,
    async startCost() {
      return { seconds: start };
    },
    async pageInfo() {
      return { engine: 'engine-1', gl: { extensions: [] } };
    },
    async filmInfo() {
      return { fps: film.fps, frameCount, loop: { frameCount: deliver.cardLoop.seconds * film.fps } };
    },
    async timeFrame({ frame, tier = 'draft', format = 'hd' }) {
      calls.push({ frame, tier, format });
      const samples = tiers[tier].samplesPerFrame;
      const c = COST[format];
      return { seconds: c.fixed + samples * c.sample + noise[n++ % noise.length], samples };
    },
    async closeRenderer() {}
  };
}

function measurement({ host = 'here', cores = 2, scale = 1, startSeconds = 10, scene = 'spike', engine = 'engine-1' } = {}) {
  const formats = {};
  for (const id of ids) {
    const fixed = COST[id].fixed * scale;
    const sample = COST[id].sample * scale;
    formats[id] = {
      secondsPerSample: sample,
      fixedSeconds: fixed,
      frameSeconds: Object.fromEntries(Object.entries(tiers).map(([t, v]) => [t, fixed + v.samplesPerFrame * sample]))
    };
  }
  return { machine: { host, cores, memGb: 8 }, at: '2026-11-24T10:00:00Z', engine, scene, frame: 450, startSeconds, formats };
}

describe('the sample arithmetic', () => {
  const nd = tiers.draft.samplesPerFrame;
  const nf = tiers.final.samplesPerFrame;

  it('takes the median of the runs', () => {
    expect(budget.median([3, 1, 2])).toBe(2);
    expect(budget.median([4, 1, 2, 3])).toBe(2.5);
    expect(budget.median([5])).toBe(5);
  });

  it('splits a frame into a fixed part and a part for each sample', () => {
    const r = budget.perSample({ draft: { seconds: 1 + nd * 2, samples: nd }, final: { seconds: 1 + nf * 2, samples: nf }, tiers });
    expect(r.secondsPerSample).toBe(2);
    expect(r.fixedSeconds).toBe(1);
    for (const [tier, t] of Object.entries(tiers)) expect(r.frameSeconds[tier]).toBe(1 + t.samplesPerFrame * 2);
  });

  it('never gives a negative part when the two measurements are noisy', () => {
    const flat = budget.perSample({ draft: { seconds: 5, samples: nd }, final: { seconds: 4, samples: nf }, tiers });
    expect(flat).toMatchObject({ secondsPerSample: 0, fixedSeconds: 5 });
    expect(flat.frameSeconds.final).toBe(5);
    const steep = budget.perSample({ draft: { seconds: 1, samples: nd }, final: { seconds: 1 + (nf - nd) * 2, samples: nf }, tiers });
    expect(steep.fixedSeconds).toBe(0);
    expect(steep.secondsPerSample).toBeGreaterThanOrEqual(1 / nd);
    expect(steep.frameSeconds.final).toBeGreaterThanOrEqual(1 + (nf - nd) * 2 - 1e-9);
  });

  it('measures each format after one warm-up frame, at the middle frame, as the median of the runs', async () => {
    const renderer = fakeRenderer();
    const lines = [];
    const m = await budget.measure({ renderer, runs: 3, scene: 'spike', cfg, log: (l) => lines.push(l) });
    expect(renderer.calls).toHaveLength(ids.length * 7);
    expect(new Set(renderer.calls.map((c) => c.frame))).toEqual(new Set([450]));
    for (const [i, id] of ids.entries()) {
      const mine = renderer.calls.slice(i * 7, i * 7 + 7);
      expect(mine.map((c) => c.format)).toEqual(Array(7).fill(id));
      expect(mine.map((c) => c.tier)).toEqual(['draft', 'draft', 'draft', 'draft', 'final', 'final', 'final']);
    }
    expect(Object.keys(m)).toEqual(['machine', 'at', 'engine', 'scene', 'frame', 'startSeconds', 'formats']);
    expect(m.machine).toEqual({ host: os.hostname(), cores: os.cpus().length, memGb: expect.any(Number) });
    expect(m).toMatchObject({ engine: 'engine-1', scene: 'spike', frame: 450, startSeconds: 12 });
    expect(Object.keys(m.formats)).toEqual(ids);
    expect(Object.keys(m.formats[master])).toEqual(['secondsPerSample', 'fixedSeconds', 'frameSeconds']);
    expect(Object.keys(m.formats[master].frameSeconds)).toEqual(Object.keys(tiers));
    expect(lines).toHaveLength(ids.length * 2);
  });

  it('recovers the cost of a sample from noisy runs', async () => {
    const m = await budget.measure({ renderer: fakeRenderer({ noise: [0, 0.3, -0.2, 0] }), runs: 3, frame: 7, cfg });
    expect(m.frame).toBe(7);
    for (const id of ids) {
      expect(m.formats[id].secondsPerSample).toBeCloseTo(COST[id].sample, 1);
      expect(m.formats[id].frameSeconds.final).toBeCloseTo(COST[id].fixed + tiers.final.samplesPerFrame * COST[id].sample, 0);
    }
  });
});

describe('the job estimates', () => {
  const m = measurement();
  const by = (jobs) => Object.fromEntries(jobs.map((j) => [j.job, j]));

  it('counts the film from film.targetSeconds when there is no cut list', () => {
    const jobs = budget.estimateJobs({ measurement: m, agents: 1, cfg });
    expect(jobs.map((j) => [j.job, j.format, j.tier, j.frames, j.limitHours])).toEqual([
      ['preview film', cfg.formats.preview.id, 'draft', film.targetSeconds * film.previewFps, sandbox.previewFilmMaxHours],
      [`film in ${cfg.formats.hd.id}`, cfg.formats.hd.id, 'final', film.targetSeconds * film.fps, sandbox.hdFilmMaxHours],
      ['master', master, 'final', film.targetSeconds * film.fps, sandbox.masterMaxHours],
      ['card loop', master, 'final', deliver.cardLoop.seconds * film.fps, sandbox.cardLoopMaxHours]
    ]);
  });

  it('counts the film from the frame count of the film when there is a cut list', () => {
    const jobs = by(budget.estimateJobs({ measurement: m, agents: 1, filmFrames: 1001, cfg }));
    expect(jobs.master.frames).toBe(1001);
    expect(jobs['preview film'].frames).toBe(Math.ceil(1001 / (film.fps / film.previewFps)));
    expect(jobs['card loop'].frames).toBe(deliver.cardLoop.seconds * film.fps);
  });

  it('adds one start cost for every chunk', () => {
    const jobs = by(budget.estimateJobs({ measurement: m, agents: 1, cfg }));
    const frames = film.targetSeconds * film.fps;
    const chunks = Math.ceil(film.targetSeconds / sandbox.chunkSeconds);
    const seconds = frames * m.formats[master].frameSeconds.final + chunks * m.startSeconds;
    expect(jobs.master.chunks).toBe(chunks);
    expect(jobs.master.hoursOneMachine).toBeCloseTo(seconds / HOUR, 3);
    expect(jobs.master.hoursAcrossAgents).toBeCloseTo(seconds / HOUR, 3);
    const p = jobs['preview film'];
    expect(p.chunks).toBe(chunks);
    expect(p.hoursOneMachine).toBeCloseTo((p.frames * m.formats[cfg.formats.preview.id].frameSeconds.draft + chunks * m.startSeconds) / HOUR, 3);
  });

  it('splits the chunks across the agents and takes the busiest one', () => {
    const agents = sandbox.maxAgents;
    const jobs = by(budget.estimateJobs({ measurement: m, agents, cfg }));
    const chunks = Math.ceil(film.targetSeconds / sandbox.chunkSeconds);
    const chunkSeconds = sandbox.chunkSeconds * film.fps * m.formats[master].frameSeconds.final + m.startSeconds;
    expect(jobs.master.hoursAcrossAgents).toBeCloseTo((Math.ceil(chunks / agents) * chunkSeconds) / HOUR, 3);
    expect(jobs.master.hoursAcrossAgents).toBeLessThan(jobs.master.hoursOneMachine);
    expect(jobs.master.hoursAcrossAgents).toBeGreaterThanOrEqual(jobs.master.hoursOneMachine / agents);
    const many = by(budget.estimateJobs({ measurement: m, agents: 100000, cfg }));
    expect(many.master.hoursAcrossAgents).toBeCloseTo(chunkSeconds / HOUR, 3);
  });

  it('sets each estimate against its own limit', () => {
    const fast = budget.estimateJobs({ measurement: measurement({ scale: 0.001, startSeconds: 0.01 }), agents: sandbox.maxAgents, cfg });
    expect(fast.map((j) => j.fits)).toEqual([true, true, true, true]);
    const slow = budget.estimateJobs({ measurement: measurement({ scale: 1000 }), agents: sandbox.maxAgents, cfg });
    expect(slow.map((j) => j.fits)).toEqual([false, false, false, false]);
    for (const j of [...fast, ...slow]) expect(j.fits).toBe(j.hoursAcrossAgents <= j.limitHours);
    const loopFrames = deliver.cardLoop.seconds * film.fps;
    const edge = measurement({ startSeconds: 0 });
    edge.formats[master].frameSeconds.final = (sandbox.cardLoopMaxHours * HOUR) / loopFrames;
    expect(by(budget.estimateJobs({ measurement: edge, agents: 1, cfg }))['card loop'].fits).toBe(true);
    edge.formats[master].frameSeconds.final *= 1.01;
    expect(by(budget.estimateJobs({ measurement: edge, agents: 1, cfg }))['card loop'].fits).toBe(false);
  });

  it('names the highest tier of each job that fits its limit', () => {
    const fast = budget.estimateJobs({ measurement: measurement({ scale: 0.001, startSeconds: 0.01 }), agents: sandbox.maxAgents, cfg });
    expect(fast.map((j) => j.highestTier)).toEqual(Array(4).fill(Object.keys(tiers).at(-1)));
    const slow = budget.estimateJobs({ measurement: measurement({ scale: 1000 }), agents: sandbox.maxAgents, cfg });
    expect(slow.map((j) => j.highestTier)).toEqual(Array(4).fill(null));
  });

  it('uses the fastest merged machine with enough cores, or this machine', () => {
    const here = measurement();
    expect(budget.pickAgentMachine(here, [], cfg)).toMatchObject({ measurement: here, merged: false, why: 'no other machine was merged' });
    const weak = measurement({ host: 'weak', cores: budget.AGENT_MIN_CORES - 1, scale: 0.1 });
    expect(budget.pickAgentMachine(here, [weak], cfg).measurement).toBe(here);
    const a = measurement({ host: 'vm-a', cores: budget.AGENT_MIN_CORES, scale: 0.8 });
    const b = measurement({ host: 'vm-b', cores: 8, scale: 0.5 });
    expect(budget.pickAgentMachine(here, [weak, a, b], cfg)).toMatchObject({ measurement: b, merged: true });
  });
});

describe('the tables', () => {
  const here = measurement();
  const vm = measurement({ host: 'vm-b', cores: 8, scale: 4, scene: 'spike two' });
  const agent = budget.pickAgentMachine(here, [vm], cfg);
  const jobs = budget.estimateJobs({ measurement: agent.measurement, agents: 16, cfg });
  const t = budget.budgetTables({ here, merged: [vm], agent, jobs, agents: 16, cfg });

  it('gives one line with the date, the scene and the machine the jobs were estimated on', () => {
    expect(t.line.split('\n')).toHaveLength(1);
    expect(t.line).toContain('Measured 2026-11-24 on the scene "spike"');
    expect(t.line).toContain('The jobs are estimated on vm-b, the fastest merged machine with 4 or more cores.');
    expect(t.line).toContain('vm-b was measured on 2026-11-24 on the scene "spike two".');
    const alone = budget.budgetTables({ here, agent: budget.pickAgentMachine(here, [], cfg), jobs, agents: 16, cfg });
    expect(alone.line).toContain('The jobs are estimated on here, this machine, because no other machine was merged.');
  });

  it('lists every machine and format with its seconds', () => {
    const rows = t.measurements.split('\n');
    expect(rows[0]).toBe(
      `| Machine | Cores | Format | Seconds for one sample | ${Object.keys(tiers).map((x) => `Seconds for a ${x} frame`).join(' | ')} | Start cost in seconds |`
    );
    expect(rows).toHaveLength(2 + 2 * ids.length);
    expect(rows[2]).toBe(`| here | 2 | ${master} | 4.000 | ${Object.values(tiers).map((x) => (2 + 4 * x.samplesPerFrame).toFixed(2)).join(' | ')} | 10.0 |`);
    expect(rows[2 + ids.length].startsWith('| vm-b | 8 |')).toBe(true);
  });

  it('lists the four jobs with their hours, limits and whether they fit', () => {
    const rows = t.jobs.split('\n');
    expect(rows[0]).toBe('| Job | Format | Tier | Frames | Hours on one machine | Hours across 16 agents | Limit in hours | Fits |');
    expect(rows).toHaveLength(6);
    jobs.forEach((j, i) => {
      const cells = rows[2 + i].split('|').slice(1, -1).map((c) => c.trim());
      expect(cells.slice(0, 4)).toEqual([j.job, j.format, j.tier, String(j.frames)]);
      expect(Number(cells[4])).toBeCloseTo(j.hoursOneMachine, 1);
      expect(Number(cells[5])).toBeCloseTo(j.hoursAcrossAgents, 1);
      expect(cells[6]).toBe(String(j.limitHours));
      expect(cells[7]).toBe(j.fits ? 'fits' : 'does not fit');
    });
    expect(new Set(jobs.map((j) => j.fits)).size).toBe(2);
    expect(t.text).not.toMatch(/[\u2014!]/);
  });
});

describe('the section of kit/PROGRESS.md', () => {
  const original = fs.readFileSync(rel('kit', 'PROGRESS.md'), 'utf8');
  const here = measurement();
  const agent = budget.pickAgentMachine(here, [], cfg);
  const jobs = budget.estimateJobs({ measurement: here, agents: 16, cfg });
  const tables = budget.budgetTables({ here, agent, jobs, agents: 16, cfg });
  const first = progress.getSection(budget.SECTION, original).split('\n\n')[0];
  // The real file may already hold rows added by hand under the jobs table, one for each kind of job that has ended.
  const kept = budget.addedRows(progress.getSection(budget.SECTION, original), jobs);

  it('keeps the first paragraph, writes the line and both tables, and touches nothing else', () => {
    const copy = path.join(temp(), 'PROGRESS.md');
    fs.writeFileSync(copy, budget.budgetSection(original, tables, jobs));
    const next = fs.readFileSync(copy, 'utf8');
    expect(progress.getSection(budget.SECTION, next)).toBe([first, tables.line, tables.measurements, [tables.jobs, ...kept].join('\n')].join('\n\n'));
    const cut = (text) => {
      const lines = text.split('\n');
      const a = lines.indexOf(`## ${budget.SECTION}`);
      const b = lines.findIndex((l, i) => i > a && l.startsWith('## '));
      return [...lines.slice(0, a + 1), ...lines.slice(b)].join('\n');
    };
    expect(cut(next)).toBe(cut(original));
    expect(budget.budgetSection(next, tables, jobs)).toBe(next);
  });

  it('reads the rows added by hand and none of the estimated jobs', () => {
    const body = ['| Job | Format |', '| --- | --- |', `| ${jobs[0].job} | hd |`, '| Heart review clip | hd |', '', '| Job | later |'].join('\n');
    expect(budget.addedRows(body, jobs)).toEqual(['| Heart review clip | hd |']);
    expect(budget.addedRows('no table here', jobs)).toEqual([]);
    for (const row of kept) expect(jobs.some((j) => row.split('|')[1].trim() === j.job)).toBe(false);
  });

  it('keeps a row that was added to the jobs table by hand', () => {
    const once = budget.budgetSection(original, tables, jobs);
    const added = '| Heart review clip, as it ran | hd | final | 1200 | 0.90 | 0.11 | 2 | fits |';
    const edited = once.replace(tables.jobs, `${tables.jobs}\n${added}`);
    const faster = budget.budgetTables({ here: measurement({ scale: 0.5 }), agent, jobs, agents: 16, cfg });
    const again = progress.getSection(budget.SECTION, budget.budgetSection(edited, faster, jobs));
    expect(again.endsWith([faster.jobs, added, ...kept].join('\n'))).toBe(true);
    for (const row of kept) expect(again.split(row)).toHaveLength(2);
    expect(again.split(added)).toHaveLength(2);
    expect(again).toContain(faster.measurements);
    expect(again).not.toContain(tables.measurements);
  });
});

describe('the command', () => {
  const run = async (a, extra = {}) => {
    const lines = [];
    const dir = extra.dir ?? temp();
    const out = await budget.budgetCommand({ _: [], ...a }, { renderer: fakeRenderer(), root: temp(), dir, print: (l) => lines.push(l), ...extra });
    return { out, lines, dir };
  };

  it('measures, writes the file named after this machine and stops with --measure-only', async () => {
    const { out, lines, dir } = await run({ 'measure-only': true, scene: 'spike', runs: '1' });
    expect(out.file).toBe(path.join(dir, `${os.hostname()}.json`));
    expect(JSON.parse(fs.readFileSync(out.file, 'utf8'))).toEqual(out.here);
    expect(out.jobs).toBeUndefined();
    expect(lines.at(-1)).toContain(`${os.hostname()}.json`);
    expect(lines.join('\n')).not.toContain('| Job |');
  });

  it('prints both tables and writes them into a copy of kit/PROGRESS.md with --write', async () => {
    const progressFile = path.join(temp(), 'PROGRESS.md');
    fs.copyFileSync(rel('kit', 'PROGRESS.md'), progressFile);
    const before = fs.readFileSync(rel('kit', 'PROGRESS.md'), 'utf8');
    const { out, lines } = await run({ scene: 'the Heart', write: true }, { progressFile });
    const text = lines.join('\n');
    expect(text).toContain(out.tables.measurements);
    expect(text).toContain(out.tables.jobs);
    expect(text).toContain('no cut list yet');
    expect(out.jobs.map((j) => j.frames)[1]).toBe(film.targetSeconds * film.fps);
    const section = progress.getSection(budget.SECTION, fs.readFileSync(progressFile, 'utf8'));
    expect(section).toContain('on the scene "the Heart"');
    expect(section).toContain(out.tables.jobs);
    expect(fs.readFileSync(rel('kit', 'PROGRESS.md'), 'utf8')).toBe(before);
  });

  it('merges another machine, uses the frame count of the film when a cut list exists, and can reuse its own file', async () => {
    const root = temp();
    fs.mkdirSync(path.join(root, 'cut'));
    fs.writeFileSync(path.join(root, 'cut', 'CUTLIST.json'), JSON.stringify({ frameCount: 900 }));
    const other = path.join(temp(), 'vm.json');
    fs.writeFileSync(other, JSON.stringify(measurement({ host: 'vm-b', cores: 8, scale: 0.01 })));
    const first = await run({ merge: other, agents: '4' }, { root });
    expect(first.out.agent.measurement.machine.host).toBe('vm-b');
    expect(first.out.jobs[2].frames).toBe(900);
    expect(first.out.tables.jobs).toContain('Hours across 4 agents');
    const renderer = fakeRenderer();
    const second = await run({ reuse: true, merge: [other] }, { root, dir: first.dir, renderer });
    expect(renderer.calls).toHaveLength(0);
    expect(second.out.here).toEqual(first.out.here);
    expect(second.out.jobs[2].frames).toBe(900);
  });

  it('refuses a file that is not a measurement and a bad number', async () => {
    const bad = path.join(temp(), 'bad.json');
    fs.writeFileSync(bad, '{}');
    await expect(run({ merge: bad })).rejects.toThrow('is not a budget measurement');
    await expect(run({ runs: '0' })).rejects.toThrow('--runs takes a whole number');
  });
});
