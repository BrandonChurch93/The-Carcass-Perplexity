import { MIX_REPORT, readJsonIf, report, skip, count } from './inputs.mjs';

const db = (v) => Number(Number(v).toFixed(2));

export function duckFaults(mix, cfg) {
  const faults = [];
  const max = cfg.audio.duckMaxDb;
  const lines = Array.isArray(mix.lines) ? mix.lines : [];
  let deepest = 0;
  for (const l of lines) {
    const name = `Under line ${l.line} of clip ${l.clip}`;
    for (const field of ['duckDb', 'marginDb', 'voiceDb', 'restDb']) if (!Number.isFinite(l[field])) faults.push(`${name} ${MIX_REPORT} holds no number in ${field}.`);
    if (l.duckDb > max) faults.push(`${name} the music is ducked by ${db(l.duckDb)} dB and audio.duckMaxDb is ${max}.`);
    if (l.marginDb <= 0) faults.push(`${name} the voice is ${db(-l.marginDb)} dB under everything else in the band of speech: ${db(l.voiceBandDb)} dB against ${db(l.restBandDb)} dB.`);
    if (l.voiceDb - l.restDb <= 0) faults.push(`${name} the voice is ${db(l.restDb - l.voiceDb)} dB under everything else across the whole band: ${db(l.voiceDb)} dB against ${db(l.restDb)} dB.`);
    if (Number.isFinite(l.duckDb)) deepest = Math.max(deepest, l.duckDb);
  }
  const info = [`Under ${count(lines.length, 'line')} the music is ducked by at most ${db(deepest)} dB, where ${max} dB is allowed, and the voice is the loudest thing.`];
  return { faults, info, skipped: lines.length ? [] : [`${MIX_REPORT} holds no line, so no ducking was read`] };
}

export async function runA6(ctx) {
  const mix = readJsonIf(ctx.root, MIX_REPORT);
  if (mix === null) return skip(`no ${MIX_REPORT} yet`);
  return report(duckFaults(mix, ctx.config));
}
