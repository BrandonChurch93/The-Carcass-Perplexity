import path from 'node:path';
import { CUT_LIST, readJsonIf, report, isWhole } from './inputs.mjs';
import { probeFile, soundExists } from './d1.mjs';
import { findFilm, FILM_FOLDERS } from './d2.mjs';
import { state } from '../lib/hash.mjs';

// D3 in kit/07-QUALITY-BAR.md: the Heart review clip exists as export.files.heartReview, the span of
// the look lock unit in formats.hd at film.fps, with the right number of frames and a sound stream if
// any sound exists. It also has to come from the build in this folder, as D2 asks of the blockout film.

// The span of a unit in the cut list: from the first frame of its first shot to the last frame of its last.
export function unitFrames(cut, unit) {
  const shots = (cut?.shots ?? []).filter((s) => s.unit === unit && isWhole(s.first) && isWhole(s.last) && s.last >= s.first);
  if (!shots.length) return null;
  const first = Math.min(...shots.map((s) => s.first));
  const last = Math.max(...shots.map((s) => s.last));
  return { first, last, frames: last - first + 1 };
}

// The clip shows one place, so it is from this build when the engine and that place are unchanged.
export const sameUnit = (a, b, unit) => Boolean(a && b) && a.engine === b.engine && Boolean(a.units?.[unit]) && a.units[unit] === b.units?.[unit];

export function reviewClipFaults({ file, probe, record, cut, now, soundExists: sound }, cfg) {
  const faults = [];
  const info = [];
  const skipped = [];
  const unit = cfg.lookLockUnit;
  const size = cfg.formats.hd;
  const rate = cfg.film.fps;
  if (probe.width === null) return { faults: [`${file} holds no picture stream.`], info, skipped };

  const sizeLine = `${file} is ${probe.width} x ${probe.height} and formats.hd is ${size.width} x ${size.height}`;
  if (probe.width !== size.width || probe.height !== size.height) faults.push(`${sizeLine}.`);
  else info.push(`${sizeLine}.`);

  const rateLine = `${file} runs at ${probe.fps === null ? 'an unknown number of' : Number(probe.fps.toFixed(3))} frames a second and film.fps is ${rate}`;
  if (probe.fps === null || Math.abs(probe.fps - rate) > 1e-6) faults.push(`${rateLine}.`);
  else info.push(`${rateLine}.`);

  const span = cut === null ? null : unitFrames(cut, unit);
  if (cut === null) faults.push(`There is no ${CUT_LIST}, so the frame count of ${file} cannot be read against it.`);
  else if (span === null) faults.push(`${CUT_LIST} holds no shot of ${unit}, so the frame count of ${file} cannot be read against it.`);
  else {
    const line = `${file} has ${probe.frames ?? 'an unknown number of'} frames, and ${unit} runs from frame ${span.first} to frame ${span.last} of the cut list, ${span.frames} frames`;
    if (probe.frames !== span.frames) faults.push(`${line}.`);
    else info.push(`${line}.`);
    if (record && (isWhole(record.first) || isWhole(record.last)) && (record.first !== span.first || record.last !== span.last)) {
      faults.push(`The record of ${file} holds frames ${record.first} to ${record.last}, and ${unit} runs from ${span.first} to ${span.last} in the cut list.`);
    }
  }

  if (sound && !probe.sound) faults.push(`${file} has no sound stream, and the music or a narration file exists.`);
  else info.push(probe.sound ? `${file} has a sound stream.` : `${file} has no sound stream, and neither the music nor any narration file exists.`);

  if (record === null) faults.push(`${file} has no record beside it, so it is not known which build it was rendered from.`);
  else if (!sameUnit(record.built, now, unit)) {
    faults.push(
      `${file} was rendered from another build than the one in this folder: its record holds the engine ${record.built?.engine ?? 'none'} and ${unit} ${record.built?.units?.[unit] ?? 'none'}, and they are now ${now.engine} and ${now.units?.[unit] ?? 'none'}.`
    );
  } else info.push(`${file} was rendered at the ${record.tier ?? 'unnamed'} tier from the build in this folder, engine ${now.engine}, ${unit} ${now.units[unit]}.`);

  return { faults, info, skipped };
}

export async function runD3(ctx, probe = probeFile, now = state) {
  const cfg = ctx.config;
  const name = cfg.export.files.heartReview;
  const file = findFilm(ctx.root, name);
  if (file === null) return { ok: false, lines: [`There is no ${name} in ${FILM_FOLDERS.join(' or in ')}.`], skipped: [] };
  return report(
    reviewClipFaults(
      { file, probe: probe(path.join(ctx.root, file)), record: readJsonIf(ctx.root, `${file}.json`), cut: readJsonIf(ctx.root, CUT_LIST), now: now(), soundExists: soundExists(ctx.root, cfg) },
      cfg
    )
  );
}
