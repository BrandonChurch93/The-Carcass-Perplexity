import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { CUT_LIST, MIX, readJsonIf, report, num } from './inputs.mjs';
import { probeFile } from './d1.mjs';
import { findFilm, FILM_FOLDERS, previewFaults } from './d2.mjs';
import { state } from '../lib/hash.mjs';

// D4 in kit/07-QUALITY-BAR.md: the preview film exists as export.files.preview, rendered from the
// phase's final build, with the mix. The picture is read as D2 reads the film of the blockout: its
// size, its rate, its frame count and the build it came from. The sound is read three ways: the film
// has a sound stream, its record names the mix, and that stream heard beside the mix is the same sound.

// Both sounds are heard as one channel at this many samples a second.
export const LISTEN_RATE = 8000;
// The film is compared with the mix one window at a time, so one changed line cannot hide in the whole.
export const WINDOW_SECONDS = 1;
// The encoder may move the sound by a few milliseconds. Further than this it is not the same sound.
export const MAX_SHIFT_SECONDS = 0.05;
// A window in which the mix is quieter than this is not compared: there is nothing to compare.
export const QUIET_RMS = 1e-4;
// The lowest likeness a compared window may have, where 1 is the same wave and 0 is no likeness.
export const SAME = 0.9;
// The two sounds may differ in length by the encoder's padding and no more.
export const LENGTH_SLACK_SECONDS = 0.1;

const dot = (a, b, from, to, shift) => {
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = from; i < to; i += 1) {
    const j = i + shift;
    if (j < 0 || j >= b.length) continue;
    ab += a[i] * b[j];
    aa += a[i] * a[i];
    bb += b[j] * b[j];
  }
  return { ab, aa, bb };
};

const likeness = ({ ab, aa, bb }) => (aa > 0 && bb > 0 ? ab / Math.sqrt(aa * bb) : 0);

// How far the film's sound sits from the mix, in samples: the shift, inside the limit, at which the
// first loud stretch of the mix is most like the film.
export function bestShift(mix, film, rate = LISTEN_RATE) {
  const limit = Math.round(MAX_SHIFT_SECONDS * rate);
  const span = Math.min(mix.length, 20 * rate);
  let first = 0;
  while (first < mix.length && Math.abs(mix[first]) < QUIET_RMS * 10) first += 1;
  const from = Math.min(first, Math.max(0, mix.length - span));
  const to = Math.min(mix.length, from + span);
  let best = { shift: 0, value: -Infinity };
  for (let shift = -limit; shift <= limit; shift += 1) {
    const value = likeness(dot(mix, film, from, to, shift));
    if (value > best.value) best = { shift, value };
  }
  return best.shift;
}

// The film's sound beside the mix: how many windows were compared, and the least alike of them.
export function heardBeside(mix, film, rate = LISTEN_RATE) {
  const shift = bestShift(mix, film, rate);
  const size = Math.round(WINDOW_SECONDS * rate);
  let compared = 0;
  let lowest = { value: 1, second: null };
  for (let from = 0; from + size <= mix.length; from += size) {
    const sums = dot(mix, film, from, from + size, shift);
    if (Math.sqrt(sums.aa / size) < QUIET_RMS) continue;
    compared += 1;
    const value = likeness(sums);
    if (value < lowest.value) lowest = { value, second: from / rate };
  }
  return { shift, compared, lowest: lowest.value, lowestAt: lowest.second, mixSeconds: mix.length / rate, filmSeconds: film.length / rate };
}

export function soundFaults({ file, probe, record, mixExists, heard }) {
  const faults = [];
  const info = [];
  if (!probe.sound) return { faults: [`${file} has no sound stream, so it does not carry the mix.`], info };

  const named = record?.sound ?? null;
  if (!mixExists) faults.push(`There is no ${MIX}, so ${file} cannot be heard beside it.`);
  if (named === null) faults.push(`The record of ${file} names no sound, so it is not known which mix it carries.`);
  else if (named !== MIX) faults.push(`The record of ${file} names ${named} as its sound, and the mix is ${MIX}.`);
  else info.push(`The record of ${file} names ${MIX} as its sound.`);

  if (mixExists && heard) {
    const lengths = `the sound of ${file} is ${num(heard.filmSeconds, 3)} s long and ${MIX} is ${num(heard.mixSeconds, 3)} s long`;
    if (Math.abs(heard.filmSeconds - heard.mixSeconds) > LENGTH_SLACK_SECONDS) faults.push(`${lengths[0].toUpperCase()}${lengths.slice(1)}.`);
    else info.push(`${lengths[0].toUpperCase()}${lengths.slice(1)}.`);

    const line = `heard beside ${MIX} in windows of ${WINDOW_SECONDS} s, the least alike of ${heard.compared} is ${num(heard.lowest, 3)}${heard.lowestAt === null ? '' : ` at ${num(heard.lowestAt, 1)} s`}, and the limit is ${SAME}`;
    if (heard.compared === 0) faults.push(`${MIX} is silent from end to end, so the sound of ${file} cannot be heard beside it.`);
    else if (heard.lowest < SAME) faults.push(`The sound of ${file} is not the mix: ${line}.`);
    else info.push(`The sound of ${file} is the mix: ${line}.`);
  }
  return { faults, info };
}

// One channel of a sound, or of the first sound stream of a film, as samples between -1 and 1.
export function readSound(full, rate = LISTEN_RATE) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', full, '-map', '0:a:0', '-ac', '1', '-ar', String(rate), '-f', 'f32le', 'pipe:1'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1 << 28
  });
  if (r.error || r.status !== 0) throw new Error(`ffmpeg could not read the sound of ${path.basename(full)}: ${(r.error?.message ?? r.stderr.toString()).trim().split('\n')[0]}`);
  const bytes = r.stdout;
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength - (bytes.byteLength % 4)));
}

export async function runD4(ctx, probe = probeFile, now = state, listen = readSound) {
  const cfg = ctx.config;
  const name = cfg.export.files.preview;
  const file = findFilm(ctx.root, name);
  if (file === null) return { ok: false, lines: [`There is no ${name} in ${FILM_FOLDERS.join(' or in ')}.`], skipped: [] };
  const full = path.join(ctx.root, file);
  const read = probe(full);
  const record = readJsonIf(ctx.root, `${file}.json`);
  const picture = previewFaults({ file, probe: read, record, cut: readJsonIf(ctx.root, CUT_LIST), now: now() }, cfg);
  if (read.width === null) return report(picture);
  const mixFull = path.join(ctx.root, MIX);
  const mixExists = fs.existsSync(mixFull);
  const heard = read.sound && mixExists ? heardBeside(listen(mixFull), listen(full)) : null;
  const sound = soundFaults({ file, probe: read, record, mixExists, heard });
  return report({ faults: [...picture.faults, ...sound.faults], info: [...picture.info, ...sound.info], skipped: picture.skipped });
}
