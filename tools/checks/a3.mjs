import fs from 'node:fs';
import path from 'node:path';
import { MIX, report, skip, tool } from './inputs.mjs';

export const LOUDNESS_UNITS = 1;

export function parseLoudness(text) {
  const summary = text.slice(Math.max(0, text.lastIndexOf('Summary:')));
  const read = (re) => {
    const m = summary.match(re);
    return m ? Number(m[1]) : null;
  };
  return { lufs: read(/\bI:\s+(-?[\d.]+|-inf)\s+LUFS/), truePeakDb: read(/\bPeak:\s+(-?[\d.]+|-inf)\s+dBFS/) };
}

export function mixLevelFaults({ lufs, truePeakDb, sampleRate }, cfg) {
  const faults = [];
  const info = [];
  const a = cfg.audio;
  const say = (ok, line) => (ok ? info : faults).push(line);
  say(Number.isFinite(lufs) && Math.abs(lufs - a.loudnessLufs) <= LOUDNESS_UNITS, `The mix measures ${Number.isFinite(lufs) ? lufs : 'no'} LUFS and has to be within ${LOUDNESS_UNITS} of ${a.loudnessLufs}.`);
  say(Number.isFinite(truePeakDb) && truePeakDb <= a.truePeakDb, `The true peak of the mix is ${Number.isFinite(truePeakDb) ? truePeakDb : 'not measured, in'} dB and has to be at or under ${a.truePeakDb}.`);
  say(sampleRate === a.sampleRate, `The mix is at ${sampleRate ?? 'an unknown number of'} samples a second and audio.sampleRate is ${a.sampleRate}.`);
  return { faults, info, skipped: [] };
}

export function measureMix(full) {
  const m = tool('ffmpeg', ['-hide_banner', '-nostats', '-i', full, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  if (m.code !== 0) throw new Error(`ffmpeg could not measure ${path.basename(full)}: ${m.err.trim().split('\n').pop()}`);
  const p = tool('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate', '-of', 'default=nw=1:nk=1', full]);
  return { ...parseLoudness(m.err), sampleRate: p.code === 0 ? Number(p.out.trim()) : null };
}

export async function runA3(ctx, measure = measureMix) {
  const full = path.join(ctx.root, MIX);
  if (!fs.existsSync(full)) return skip(`no ${MIX} yet`);
  return report(mixLevelFaults(measure(full), ctx.config));
}
