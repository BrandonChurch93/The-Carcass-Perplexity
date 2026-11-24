import fs from 'node:fs';
import path from 'node:path';
import { CUT_LIST, MUSIC_DIR, KEPT_NARRATION, KEPT_LINES, readJsonIf, listFiles, report, tool, isWhole } from './inputs.mjs';

export const ANIMATIC_FOLDERS = ['deliver/film', 'out/work/film'];

export function parseProbe(json) {
  const streams = JSON.parse(json).streams ?? [];
  const video = streams.find((s) => s.codec_type === 'video') ?? null;
  const [n, d] = String(video?.r_frame_rate ?? '').split('/').map(Number);
  return {
    width: video?.width ?? null,
    height: video?.height ?? null,
    fps: video && d ? n / d : null,
    frames: video && video.nb_read_packets !== undefined ? Number(video.nb_read_packets) : null,
    sound: streams.some((s) => s.codec_type === 'audio')
  };
}

export const animaticFrames = (cut, cfg) => Math.ceil((cut.frameCount * cfg.film.previewFps) / cfg.film.fps - 1e-9);

export function animaticFaults({ file, probe, cut, soundExists }, cfg) {
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

  if (cut === null) skipped.push(`no ${CUT_LIST} yet, so the frame count of ${file} was not read against it`);
  else if (!isWhole(cut.frameCount)) faults.push(`${CUT_LIST} holds no whole number in frameCount.`);
  else {
    const want = animaticFrames(cut, cfg);
    const line = `${file} has ${probe.frames ?? 'an unknown number of'} frames, and the ${cut.frameCount} frames of the cut list at ${rate} frames a second are ${want}`;
    if (probe.frames !== want) faults.push(`${line}.`);
    else info.push(`${line}.`);
  }

  if (soundExists && !probe.sound) faults.push(`${file} has no sound stream, and the music or a narration file exists.`);
  else info.push(probe.sound ? `${file} has a sound stream.` : `${file} has no sound stream, and neither the music nor any narration file exists.`);

  return { faults, info, skipped };
}

export function findAnimatic(root, cfg) {
  const name = cfg.export.files.animatic;
  return ANIMATIC_FOLDERS.map((d) => `${d}/${name}`).find((f) => fs.existsSync(path.join(root, f))) ?? null;
}

export function soundExists(root, cfg) {
  return fs.existsSync(path.join(root, MUSIC_DIR, cfg.music.file)) || listFiles(root, KEPT_NARRATION).length > 0 || listFiles(root, KEPT_LINES).length > 0;
}

export function probeFile(full) {
  const r = tool('ffprobe', ['-v', 'error', '-count_packets', '-show_entries', 'stream=codec_type,width,height,r_frame_rate,nb_read_packets', '-of', 'json', full]);
  if (r.code !== 0) throw new Error(`ffprobe could not read ${path.basename(full)}: ${(r.err || r.out).trim().split('\n')[0]}`);
  return parseProbe(r.out);
}

export async function runD1(ctx, probe = probeFile) {
  const cfg = ctx.config;
  const file = findAnimatic(ctx.root, cfg);
  if (file === null) {
    return { ok: false, lines: [`There is no ${cfg.export.files.animatic} in ${ANIMATIC_FOLDERS.join(' or in ')}.`], skipped: [] };
  }
  return report(animaticFaults({ file, probe: probe(path.join(ctx.root, file)), cut: readJsonIf(ctx.root, CUT_LIST), soundExists: soundExists(ctx.root, cfg) }, cfg));
}
