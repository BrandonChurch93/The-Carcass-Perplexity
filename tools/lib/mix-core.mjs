import { integratedLufs, oversampledPeaks, bandLevelDb, levelDb, db, fromDb, SILENCE_DB } from './loudness.mjs';

export const SCHEMA = 'carcass/mix 1';
export const CUT_SCHEMA = 'carcass/cutlist 1';
export const DEFAULTS = { voiceGainDb: 0, musicGainDb: 0, marginDb: 6, attackSeconds: 0.15, releaseSeconds: 0.4 };
export const SPEECH_BAND = { lowHz: 300, highHz: 3400 };
export const JOIN = { fadeSeconds: 0.02, clearSeconds: 0.01 };
export const LIMITER = { lookAheadSeconds: 0.005, releaseSeconds: 0.1, headroomDb: 0.1, passes: 4 };
export const END_FADE_SECONDS = 0.05;
export const LOOP_FADE_SECONDS = 0.5;
export const BITS = 16;
const MOVED_LU = 0.005;
const PEAK_SLACK_DB = 0.005;

export const round = (v, digits) => Number(v.toFixed(digits));
const seconds = (v) => round(v, 4);
const level = (v) => round(v, 2);
const at = (t, rate) => Math.round(t * rate);
const stereo = (length) => [new Float32Array(length), new Float32Array(length)];
const both = (clip) => (clip.length === 1 ? [clip[0], clip[0]] : [clip[0], clip[1]]);

export function filmSamples(cut, rate) {
  return Math.round((cut.frameCount / cut.fps) * rate);
}

export function layMusic(music, pieces, rate, length) {
  const out = stereo(length);
  const fade = at(JOIN.fadeSeconds, rate);
  const early = fade + at(JOIN.clearSeconds, rate);
  pieces.forEach((piece, i) => {
    const start = at(piece.at, rate);
    const offset = at(piece.from, rate) - start;
    const first = i > 0 ? start - early : start;
    const next = pieces[i + 1];
    const fadeOut = next ? at(next.at, rate) - early : Infinity;
    const end = Math.min(length, next ? fadeOut + fade : at(piece.at + piece.to - piece.from, rate));
    for (let c = 0; c < 2; c++) {
      const src = music[Math.min(c, music.length - 1)];
      const dst = out[c];
      for (let n = Math.max(0, first); n < end; n++) {
        const m = n + offset;
        if (m < 0 || m >= src.length) continue;
        let g = 1;
        if (i > 0 && n < first + fade) g = (n - first) / fade;
        if (n >= fadeOut) g *= 1 - (n - fadeOut) / fade;
        dst[n] += src[m] * g;
      }
    }
  });
  return out;
}

export function musicAtEnd(music, pieces, rate, length) {
  return pieces.some((piece) => {
    const start = at(piece.at, rate);
    const end = at(piece.at + piece.to - piece.from, rate);
    return start < length && end >= length && length - 1 - start + at(piece.from, rate) < music[0].length;
  });
}

export function addClip(bus, clip, start, gain = 1) {
  const src = both(clip);
  const length = bus[0].length;
  for (let c = 0; c < 2; c++) {
    const from = Math.max(0, -start);
    const to = Math.min(src[c].length, length - start);
    for (let i = from; i < to; i++) bus[c][start + i] += src[c][i] * gain;
  }
  return bus;
}

export function shapeSound(clip, { rate, spanSamples, gainDb = 0, fadeInSeconds = 0, fadeOutSeconds = 0, loop = false }) {
  const src = both(clip);
  const size = src[0].length;
  const looped = loop && size < spanSamples && size > 1;
  const length = looped ? spanSamples : Math.min(size, spanSamples);
  const out = stereo(length);
  if (looped) {
    const cross = Math.max(1, Math.min(at(LOOP_FADE_SECONDS, rate), Math.floor(size / 4)));
    const hop = size - cross;
    for (let start = 0, turn = 0; start < length; start += hop, turn++) {
      for (let i = 0; i < size && start + i < length; i++) {
        let g = 1;
        if (turn > 0 && i < cross) g = Math.sin((Math.PI / 2) * (i / cross));
        if (i >= hop) g *= Math.cos((Math.PI / 2) * ((i - hop) / cross));
        for (let c = 0; c < 2; c++) out[c][start + i] += src[c][i] * g;
      }
    }
  } else {
    for (let c = 0; c < 2; c++) out[c].set(src[c].subarray(0, length));
  }
  const gain = fromDb(gainDb);
  const fadeIn = Math.min(length, at(fadeInSeconds, rate));
  const fadeOut = Math.min(length, at(fadeOutSeconds, rate));
  for (let c = 0; c < 2; c++) {
    for (let i = 0; i < length; i++) {
      let g = gain;
      if (i < fadeIn) g *= i / fadeIn;
      if (i >= length - fadeOut) g *= (length - 1 - i) / fadeOut;
      out[c][i] *= g;
    }
  }
  return out;
}

export function duckFor({ voiceBandDb, restBandDb, marginDb, maxDb }) {
  if (restBandDb <= SILENCE_DB) return 0;
  return Math.min(maxDb, Math.max(0, restBandDb + marginDb - voiceBandDb));
}

export function duckEnvelope(lines, rate, length, attackSeconds, releaseSeconds) {
  const env = new Float32Array(length);
  const attack = Math.max(1, at(attackSeconds, rate));
  const release = Math.max(1, at(releaseSeconds, rate));
  for (const line of lines) {
    if (!(line.duckDb > 0)) continue;
    const start = at(line.start, rate);
    const end = at(line.end, rate);
    const from = Math.max(0, start - attack);
    const to = Math.min(length, end + release);
    for (let n = from; n < to; n++) {
      let depth = 1;
      if (n < start) depth = (n - (start - attack)) / attack;
      else if (n >= end) depth = 1 - (n - end) / release;
      const v = -line.duckDb * depth;
      if (v < env[n]) env[n] = v;
    }
  }
  return env;
}

export function limiterGains(peaks, rate, ceilingDb) {
  const ceiling = fromDb(ceilingDb);
  const length = peaks.length;
  const ahead = Math.max(1, at(LIMITER.lookAheadSeconds, rate));
  const need = new Float32Array(length);
  let any = false;
  for (let n = 0; n < length; n++) {
    need[n] = peaks[n] > ceiling ? ceiling / peaks[n] : 1;
    if (need[n] < 1) any = true;
  }
  if (!any) return null;
  const held = new Float32Array(length);
  const queue = new Int32Array(length);
  let head = 0;
  let tail = 0;
  for (let n = length - 1; n >= 0; n--) {
    while (tail > head && need[queue[tail - 1]] >= need[n]) tail--;
    queue[tail++] = n;
    while (queue[head] > n + ahead) head++;
    held[n] = need[queue[head]];
  }
  const rise = 1 - Math.exp(-1 / (LIMITER.releaseSeconds * rate));
  let g = 1;
  for (let n = 0; n < length; n++) {
    g += (1 - g) * rise;
    if (held[n] < g) g = held[n];
    held[n] = g;
  }
  const gains = new Float32Array(length);
  const width = ahead + 1;
  let sum = held[0] * width;
  for (let n = 0; n < length; n++) {
    sum += held[n] - held[Math.max(0, n - width)];
    gains[n] = Math.min(1, sum / width);
  }
  return gains;
}

export function seedOf(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function generator(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dither(channels, seed) {
  const next = generator(seed);
  const scale = 2 ** (BITS - 1);
  const out = channels.map((ch) => new Int16Array(ch.length));
  const length = channels[0].length;
  for (let n = 0; n < length; n++) {
    for (let c = 0; c < channels.length; c++) {
      const v = Math.round(channels[c][n] * scale + next() - next());
      out[c][n] = Math.max(-scale, Math.min(scale - 1, v));
    }
  }
  return out;
}

export function fromPcm(pcm) {
  const scale = 2 ** (BITS - 1);
  return pcm.map((ch) => {
    const out = new Float32Array(ch.length);
    for (let i = 0; i < ch.length; i++) out[i] = ch[i] / scale;
    return out;
  });
}

function peakDb(channels) {
  const peaks = oversampledPeaks(channels);
  let top = 0;
  for (let i = 0; i < peaks.length; i++) if (peaks[i] > top) top = peaks[i];
  return { peaks, peak: db(top) };
}

function scale(channels, gain) {
  for (const ch of channels) for (let i = 0; i < ch.length; i++) ch[i] *= gain;
}

function scaleBy(channels, gains) {
  for (const ch of channels) for (let i = 0; i < ch.length; i++) ch[i] *= gains[i];
}

export function buildMix({ cut, cfg, music, clips, name = 'mix' }) {
  if (cut.schema !== CUT_SCHEMA) throw new Error(`the cut list is not ${CUT_SCHEMA}`);
  const rate = cfg.audio.sampleRate;
  const target = cfg.audio.loudnessLufs;
  const limit = cfg.audio.truePeakDb;
  const tune = { ...DEFAULTS, ...(cut.mix ?? {}) };
  const length = filmSamples(cut, rate);
  const printed = [];
  const say = (text) => printed.push(`${name}: ${text}`);

  const rest = layMusic(music, cut.music.pieces, rate, length);
  if (tune.musicGainDb !== 0) scale(rest, fromDb(tune.musicGainDb));
  const sounds = [];
  for (const s of cut.sounds ?? []) {
    if (!s.file) {
      say(`sound ${s.id} has no file yet and is skipped`);
      continue;
    }
    const shaped = shapeSound(clips(s.file), { rate, spanSamples: at(s.frames / cut.fps, rate), gainDb: s.gainDb ?? 0, fadeInSeconds: s.fadeInSeconds ?? 0, fadeOutSeconds: s.fadeOutSeconds ?? 0, loop: Boolean(s.loop) });
    addClip(rest, shaped, at(s.first / cut.fps, rate));
    sounds.push({ id: s.id, gainDb: level(s.gainDb ?? 0) });
  }

  const voice = stereo(length);
  const voiceGain = fromDb(tune.voiceGainDb);
  const laid = [];
  for (const line of cut.lines ?? []) {
    if (!line.file) {
      say(`line ${line.clip}-${line.line} has no file yet and is skipped`);
      continue;
    }
    addClip(voice, clips(line.file), at(line.first / cut.fps, rate), voiceGain);
    laid.push({ ...line, start: line.first / cut.fps, end: (line.first + line.frames) / cut.fps });
  }

  const band = (bus, line) => bandLevelDb(bus, rate, line.start, line.end, SPEECH_BAND.lowHz, SPEECH_BAND.highHz);
  for (const line of laid) {
    line.duckDb = duckFor({ voiceBandDb: band(voice, line), restBandDb: band(rest, line), marginDb: tune.marginDb, maxDb: cfg.audio.duckMaxDb });
  }
  const env = duckEnvelope(laid, rate, length, tune.attackSeconds, tune.releaseSeconds);
  for (const ch of rest) for (let i = 0; i < length; i++) if (env[i] < 0) ch[i] *= 10 ** (env[i] / 20);

  const endFade = musicAtEnd(music, cut.music.pieces, rate, length);
  if (endFade) {
    const fade = Math.min(length, at(END_FADE_SECONDS, rate));
    for (const ch of [...rest, ...voice]) for (let i = 0; i < fade; i++) ch[length - fade + i] *= (fade - 1 - i) / fade;
    say(`the music still sounds at the end, so the last ${END_FADE_SECONDS * 1000} ms fade out`);
  }

  const mix = stereo(length);
  for (let c = 0; c < 2; c++) for (let i = 0; i < length; i++) mix[c][i] = rest[c][i] + voice[c][i];
  const before = integratedLufs(mix, rate);
  if (before <= SILENCE_DB) throw new Error('the mix is silent, so it has no loudness to set');
  const master = new Float32Array(length).fill(1);
  let gainDb = target - before;
  scale(mix, fromDb(gainDb));
  let limited = false;
  let corrected = false;
  let state = peakDb(mix);
  for (let pass = 0; pass < LIMITER.passes && state.peak > limit - PEAK_SLACK_DB; pass++) {
    const gains = limiterGains(state.peaks, rate, limit - LIMITER.headroomDb * (pass + 1));
    if (!gains) break;
    scaleBy(mix, gains);
    scaleBy([master], gains);
    limited = true;
    if (!corrected) {
      corrected = true;
      const moved = target - integratedLufs(mix, rate);
      if (Math.abs(moved) >= MOVED_LU) {
        scale(mix, fromDb(moved));
        gainDb += moved;
      }
    }
    state = peakDb(mix);
  }
  scale([master], fromDb(gainDb));
  scaleBy(rest, master);
  scaleBy(voice, master);

  const pcm = dither(mix, seedOf(`${cfg.seed} ${name}`));
  const heard = fromPcm(pcm);
  const integrated = integratedLufs(heard, rate);
  const truePeak = peakDb(heard).peak;

  const lines = laid.map((line) => {
    const voiceBandDb = band(voice, line);
    const restBandDb = band(rest, line);
    return {
      clip: line.clip,
      line: line.line,
      first: line.first,
      frames: line.frames,
      duckDb: level(line.duckDb),
      voiceBandDb: level(voiceBandDb),
      restBandDb: level(restBandDb),
      marginDb: level(voiceBandDb - restBandDb),
      voiceDb: level(levelDb(voice, line.start, line.end, rate)),
      restDb: level(levelDb(rest, line.start, line.end, rate))
    };
  });

  const report = {
    schema: SCHEMA,
    file: null,
    seconds: seconds(length / rate),
    sampleRate: rate,
    channels: 2,
    integratedLufs: level(integrated),
    truePeakDb: level(truePeak),
    gainDb: level(gainDb),
    limited,
    inputs: [],
    lines,
    sounds
  };

  say(`${report.seconds} s, ${rate} Hz, ${BITS} bit, two channels`);
  say(`loudness ${report.integratedLufs.toFixed(2)} LUFS integrated, the target is ${target}`);
  say(`true peak ${report.truePeakDb.toFixed(2)} dB, the limit is ${limit}`);
  say(`gain ${report.gainDb.toFixed(2)} dB on the whole mix, ${limited ? 'with the limiter' : 'no limiter needed'}`);
  for (const l of lines) {
    const short = l.marginDb < tune.marginDb - 0.05 ? `, short of the ${tune.marginDb} dB asked` : '';
    say(`line ${l.clip}-${l.line} at frame ${l.first}, duck ${l.duckDb.toFixed(2)} dB, margin ${l.marginDb.toFixed(2)} dB${short}`);
  }
  if (lines.length > 0) {
    const ducks = lines.map((l) => l.duckDb);
    const margins = lines.map((l) => l.marginDb);
    const short = margins.filter((m) => m < tune.marginDb - 0.05).length;
    say(`${lines.length} lines, ducks from ${Math.min(...ducks).toFixed(2)} to ${Math.max(...ducks).toFixed(2)} dB, the smallest margin is ${Math.min(...margins).toFixed(2)} dB, ${short} short of the ${tune.marginDb} dB asked`);
  }
  if (truePeak > limit) say(`the true peak is over the limit by ${(truePeak - limit).toFixed(2)} dB`);
  if (Math.abs(integrated - target) > 0.1) say(`the loudness is ${Math.abs(integrated - target).toFixed(2)} LU from the target`);

  return { pcm, rate, report, printed, envelope: env, ok: truePeak <= limit };
}
