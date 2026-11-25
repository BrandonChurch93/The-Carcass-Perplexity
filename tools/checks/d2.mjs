import fs from 'node:fs';
import path from 'node:path';
import { CUT_LIST, readJsonIf, report, isWhole } from './inputs.mjs';
import { probeFile, animaticFrames } from './d1.mjs';
import { state } from '../lib/hash.mjs';

export const FILM_FOLDERS = ['deliver/film', 'out/work/film'];

const sorted = (o) => JSON.stringify(Object.entries(o ?? {}).sort(([a], [b]) => (a < b ? -1 : 1)));
export const sameState = (a, b) => Boolean(a && b) && a.engine === b.engine && sorted(a.units) === sorted(b.units);

export function findFilm(root, name, folders = FILM_FOLDERS) {
  return folders.map((d) => `${d}/${name}`).find((f) => fs.existsSync(path.join(root, f))) ?? null;
}

export function previewFaults({ file, probe, record, cut, now }, cfg) {
  const faults = [];
  const info = [];
  const skipped = [];
  const size = cfg.formats.preview;
  const rate = cfg.film.previewFps;
  if (probe.width === null) return { faults: [`${file} holds no picture stream.`], info, skipped };

  const sizeLine = `${file} is ${probe.width} x ${probe.height} and formats.preview is ${size.width} x ${size.height}`;
  if (probe.width !== size.width || probe.height !== size.height) faults.push(`${sizeLine}.`);
  else info.push(`${sizeLine}.`);

  const rateLine = `${file} runs at ${probe.fps === null ? 'an unknown number of' : Number(probe.fps.toFixed(3))} frames a second and film.previewFps is ${rate}`;
  if (probe.fps === null || Math.abs(probe.fps - rate) > 1e-6) faults.push(`${rateLine}.`);
  else info.push(`${rateLine}.`);

  if (cut === null) faults.push(`There is no ${CUT_LIST}, so the frame count of ${file} cannot be read against it.`);
  else if (!isWhole(cut.frameCount)) faults.push(`${CUT_LIST} holds no whole number in frameCount.`);
  else {
    const want = animaticFrames(cut, cfg);
    const line = `${file} has ${probe.frames ?? 'an unknown number of'} frames, and the ${cut.frameCount} frames of the cut list at ${rate} frames a second are ${want}`;
    if (probe.frames !== want) faults.push(`${line}.`);
    else info.push(`${line}.`);
  }

  if (record === null) faults.push(`${file} has no record beside it, so it is not known which build it was rendered from.`);
  else if (!sameState(record.built, now)) faults.push(`${file} was rendered from another build than the one in this folder: its record holds the engine ${record.built?.engine ?? 'none'} and the engine is now ${now.engine}.`);
  else info.push(`${file} was rendered from the build in this folder, engine ${now.engine}.`);

  return { faults, info, skipped };
}

export async function runD2(ctx, probe = probeFile, now = state) {
  const cfg = ctx.config;
  const name = cfg.export.files.preview;
  const file = findFilm(ctx.root, name);
  if (file === null) return { ok: false, lines: [`There is no ${name} in ${FILM_FOLDERS.join(' or in ')}.`], skipped: [] };
  return report(previewFaults({ file, probe: probe(path.join(ctx.root, file)), record: readJsonIf(ctx.root, `${file}.json`), cut: readJsonIf(ctx.root, CUT_LIST), now: now() }, cfg));
}
