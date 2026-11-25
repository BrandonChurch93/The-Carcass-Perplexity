import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, rel, args, config, utc, readJson, writeJson } from './lib/paths.mjs';
import { isMain, one, relPath } from './lib/img.mjs';
import * as progress from './lib/progress.mjs';

export const USAGE = 'usage: npm run budget [-- --frame N] [--runs N] [--scene "text"] [--merge FILE ...] [--agents N] [--measure-only] [--reuse] [--write]';
export const SECTION = 'Render budget';
export const AGENT_MIN_CORES = 4;
const DEFAULT_RUNS = 3;
const CUT_LIST = 'cut/CUTLIST.json';
const HOUR = 3600;
const round = (v, digits = 4) => Number(v.toFixed(digits));

export function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function perSample({ draft, final, tiers }) {
  const nd = draft.samples;
  const nf = final.samples;
  let secondsPerSample;
  let fixedSeconds;
  if (nf === nd) {
    secondsPerSample = final.seconds / nf;
    fixedSeconds = 0;
  } else {
    secondsPerSample = (final.seconds - draft.seconds) / (nf - nd);
    if (secondsPerSample <= 0) {
      secondsPerSample = 0;
      fixedSeconds = Math.max(draft.seconds, final.seconds);
    } else {
      fixedSeconds = draft.seconds - nd * secondsPerSample;
      if (fixedSeconds < 0) {
        fixedSeconds = 0;
        secondsPerSample = Math.max(draft.seconds / nd, final.seconds / nf);
      }
    }
  }
  const frameSeconds = {};
  for (const [tier, t] of Object.entries(tiers)) frameSeconds[tier] = round(fixedSeconds + t.samplesPerFrame * secondsPerSample);
  return { secondsPerSample: round(secondsPerSample), fixedSeconds: round(fixedSeconds), frameSeconds };
}

export function thisMachine() {
  return { host: os.hostname(), cores: os.cpus().length, memGb: round(os.totalmem() / 2 ** 30, 1) };
}

export async function measure({ renderer, frame = null, runs = DEFAULT_RUNS, scene = 'not named', cfg = config(), log = () => {} }) {
  const start = await renderer.startCost();
  const page = await renderer.pageInfo();
  const at = frame ?? Math.floor((await renderer.filmInfo()).frameCount / 2);
  const formats = {};
  for (const f of Object.values(cfg.formats)) {
    await renderer.timeFrame({ frame: at, tier: 'draft', format: f.id });
    const timed = {};
    for (const tier of ['draft', 'final']) {
      const seconds = [];
      let samples = cfg.tiers[tier].samplesPerFrame;
      for (let i = 0; i < runs; i++) {
        const r = await renderer.timeFrame({ frame: at, tier, format: f.id });
        seconds.push(r.seconds);
        if (Number.isFinite(r.samples) && r.samples > 0) samples = r.samples;
      }
      timed[tier] = { seconds: median(seconds), samples };
      log(`budget: ${f.id} ${tier}, ${timed[tier].seconds.toFixed(3)} s for a frame of ${samples} ${samples === 1 ? 'sample' : 'samples'}, the median of ${runs}`);
    }
    formats[f.id] = perSample({ ...timed, tiers: cfg.tiers });
  }
  return { machine: thisMachine(), at: utc(), engine: page.engine, scene, frame: at, startSeconds: round(start.seconds), formats };
}

export function pickAgentMachine(here, merged = [], cfg = config()) {
  const id = cfg.formats.master.id;
  const fit = merged.filter((m) => m.machine.cores >= AGENT_MIN_CORES);
  if (fit.length === 0) {
    const why = merged.length === 0 ? 'no other machine was merged' : `no merged machine has ${AGENT_MIN_CORES} or more cores`;
    return { measurement: here, merged: false, why };
  }
  const best = fit.reduce((a, b) => (b.formats[id].frameSeconds.final < a.formats[id].frameSeconds.final ? b : a));
  return { measurement: best, merged: true, why: `the fastest merged machine with ${AGENT_MIN_CORES} or more cores` };
}

export function estimateJobs({ measurement, agents, filmFrames = null, cfg = config() }) {
  const { film, formats, sandbox, deliver } = cfg;
  const stride = film.fps / film.previewFps;
  const filmAt = (fps) => (filmFrames === null ? Math.round(film.targetSeconds * fps) : fps === film.fps ? filmFrames : Math.ceil(filmFrames / stride));
  const list = [
    { job: 'preview film', format: formats.preview.id, tier: 'draft', fps: film.previewFps, frames: filmAt(film.previewFps), limitHours: sandbox.previewFilmMaxHours },
    { job: `film in ${formats.hd.id}`, format: formats.hd.id, tier: 'final', fps: film.fps, frames: filmAt(film.fps), limitHours: sandbox.hdFilmMaxHours },
    { job: 'master', format: formats.master.id, tier: 'final', fps: film.fps, frames: filmAt(film.fps), limitHours: sandbox.masterMaxHours },
    { job: 'card loop', format: formats.master.id, tier: 'final', fps: film.fps, frames: Math.round(deliver.cardLoop.seconds * film.fps), limitHours: sandbox.cardLoopMaxHours }
  ];
  return list.map((j) => {
    const chunkFrames = Math.max(1, Math.round(sandbox.chunkSeconds * j.fps));
    const chunks = Math.ceil(j.frames / chunkFrames);
    const at = (tier) => {
      const frameSeconds = measurement.formats[j.format].frameSeconds[tier];
      const one = j.frames * frameSeconds + chunks * measurement.startSeconds;
      const busiest = Math.ceil(chunks / agents) * (chunkFrames * frameSeconds + measurement.startSeconds);
      const across = Math.min(one, busiest);
      return { frameSeconds, hoursOneMachine: round(one / HOUR), hoursAcrossAgents: round(across / HOUR), fits: across / HOUR <= j.limitHours };
    };
    const highestTier = Object.keys(cfg.tiers).reduce((best, tier) => (at(tier).fits ? tier : best), null);
    return { ...j, chunks, ...at(j.tier), highestTier };
  });
}

const row = (cells) => `| ${cells.join(' | ')} |`;
const table = (head, rows) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');
const hours = (h) => (h < 0.01 && h > 0 ? h.toFixed(4) : h.toFixed(2));

export function budgetTables({ here, merged = [], agent, jobs, agents, cfg = config() }) {
  const tiers = Object.keys(cfg.tiers);
  const machines = [here, ...merged];
  const measurements = table(
    ['Machine', 'Cores', 'Format', 'Seconds for one sample', ...tiers.map((t) => `Seconds for a ${t} frame`), 'Start cost in seconds'],
    machines.flatMap((m) =>
      Object.values(cfg.formats).map((f) => {
        const v = m.formats[f.id];
        return [m.machine.host, m.machine.cores, f.id, v.secondsPerSample.toFixed(3), ...tiers.map((t) => v.frameSeconds[t].toFixed(2)), m.startSeconds.toFixed(1)];
      })
    )
  );
  const jobTable = table(
    ['Job', 'Format', 'Tier', 'Frames', 'Hours on one machine', `Hours across ${agents} agents`, 'Limit in hours', 'Fits'],
    jobs.map((j) => [j.job, j.format, j.tier, j.frames, hours(j.hoursOneMachine), hours(j.hoursAcrossAgents), j.limitHours, j.fits ? 'fits' : 'does not fit'])
  );
  const others = merged.filter((m) => m.scene !== here.scene || m.engine !== here.engine).map((m) => `${m.machine.host} was measured on ${m.at.slice(0, 10)} on the scene "${m.scene}"${m.engine !== here.engine ? ', with another engine hash' : ''}.`);
  const line = [
    `Measured ${here.at.slice(0, 10)} on the scene "${here.scene}", frame ${here.frame}.`,
    `The jobs are estimated on ${agent.measurement.machine.host}, ${agent.merged ? agent.why : `this machine, because ${agent.why}`}.`,
    ...others
  ].join(' ');
  return { line, measurements, jobs: jobTable, text: [line, measurements, jobTable].join('\n\n') };
}

// The rows under the jobs table that are not one of the estimated jobs: the Builder adds one by hand
// for each kind of job when it ends, and a new measurement keeps them.
export function addedRows(body, jobs) {
  const names = new Set(jobs.map((j) => j.job));
  const lines = body.split('\n');
  const head = lines.findIndex((l) => /^\|\s*Job\s*\|/.test(l));
  if (head < 0) return [];
  const out = [];
  for (let i = head + 2; i < lines.length && lines[i].startsWith('|'); i++) {
    if (!names.has(lines[i].split('|')[1].trim())) out.push(lines[i]);
  }
  return out;
}

export function budgetSection(text, tables, jobs = []) {
  const body = progress.getSection(SECTION, text);
  const first = body.split(/\n\s*\n/)[0];
  const kept = addedRows(body, jobs);
  return progress.setSection(SECTION, [first, tables.line, tables.measurements, [tables.jobs, ...kept].join('\n')].join('\n\n'), text);
}

function checkMeasurement(m, file, cfg) {
  const ok = m && m.machine && Number.isFinite(m.startSeconds) && m.formats && Object.values(cfg.formats).every((f) => m.formats[f.id]?.frameSeconds);
  if (!ok) throw new Error(`${file} is not a budget measurement`);
  return m;
}

export async function budgetCommand(a, deps = {}) {
  const cfg = deps.cfg ?? config();
  const root = deps.root ?? ROOT;
  const print = deps.print ?? ((l) => console.log(l));
  const dir = deps.dir ?? rel('out', 'work', 'budget');
  const file = path.join(dir, `${os.hostname()}.json`);
  const whole = (name, fallback, least) => {
    if (a[name] === undefined) return fallback;
    const n = Number(one(a[name], NaN));
    if (!Number.isInteger(n) || n < least) throw new Error(`--${name} takes a whole number of ${least} or more. ${USAGE}`);
    return n;
  };
  const runs = whole('runs', DEFAULT_RUNS, 1);
  const frame = whole('frame', null, 0);
  const agents = whole('agents', cfg.sandbox.maxAgents, 1);
  const mergeFiles = a.merge === undefined || a.merge === true ? [] : [].concat(a.merge);
  const merged = mergeFiles.map((f) => checkMeasurement(readJson(path.resolve(f)), f, cfg));
  const needsFilm = fs.existsSync(path.join(root, CUT_LIST));

  let renderer = deps.renderer ?? null;
  let opened = false;
  const get = async () => {
    if (!renderer) {
      renderer = await import('./lib/render.mjs');
      opened = true;
    }
    return renderer;
  };
  try {
    let here;
    if (a.reuse) {
      if (!fs.existsSync(file)) throw new Error(`--reuse needs ${relPath(file)}, which does not exist`);
      here = checkMeasurement(readJson(file), relPath(file), cfg);
      print(`budget: using ${relPath(file)}, measured ${here.at}`);
    } else {
      here = await measure({ renderer: await get(), frame, runs, scene: one(a.scene, 'not named'), cfg, log: print });
      writeJson(file, here);
      print(`budget: ${relPath(file)}`);
    }
    if (a['measure-only']) return { file, here };

    const filmFrames = needsFilm ? (await (await get()).filmInfo()).frameCount : null;
    const agent = pickAgentMachine(here, merged, cfg);
    const jobs = estimateJobs({ measurement: agent.measurement, agents, filmFrames, cfg });
    const tables = budgetTables({ here, merged, agent, jobs, agents, cfg });
    print('');
    print(tables.text);
    print('');
    print(
      filmFrames === null
        ? `budget: no cut list yet, so the film is counted as film.targetSeconds, ${cfg.film.targetSeconds} seconds`
        : `budget: the film is counted as the ${filmFrames} frames of the cut list`
    );
    print(`budget: the highest tier that fits its limit. ${jobs.map((j) => `${j.job}: ${j.highestTier ?? 'none'}`).join(', ')}`);
    if (a.write) {
      if (deps.progressFile) fs.writeFileSync(deps.progressFile, budgetSection(fs.readFileSync(deps.progressFile, 'utf8'), tables, jobs));
      else progress.write(budgetSection(progress.read(), tables, jobs));
      print(`budget: wrote the "${SECTION}" section of ${relPath(deps.progressFile ?? rel('kit', 'PROGRESS.md'))}`);
    }
    return { file, here, merged, agent, jobs, tables };
  } finally {
    if (opened) await renderer.closeRenderer().catch(() => {});
  }
}

if (isMain(import.meta)) {
  budgetCommand(args()).catch((e) => {
    console.error(`budget: ${String(e.message).split('\n')[0]}`);
    process.exit(1);
  });
}
