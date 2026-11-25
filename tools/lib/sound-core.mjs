import { integratedLufs, truePeakDb, oversampledPeaks, db, fromDb, SILENCE_DB } from './loudness.mjs';
import { LEVEL, LIMITS, takesLine } from './voice-core.mjs';

export const SOUND = {
  path: '/sound-generation',
  model: 'eleven_text_to_sound_v3',
  outputFormat: 'mp3_44100_192',
  creditsPerSecond: 40,
  minSeconds: 0.5,
  maxSeconds: 30,
  maxDescription: 450,
  defaultPromptInfluence: 0.3
};

export const EDGE = {
  windowSeconds: 0.01,
  quietDb: -60,
  roomSeconds: 0.02,
  fadeSeconds: 0.01,
  tailFadeSeconds: 0.05,
  seamSeconds: 0.5,
  silentLufs: -60,
  lengthSlack: 0.1,
  longSilenceSeconds: 0.5
};

export const GAIN = { rounds: 4, nearDb: 0.1 };
export const CUE_SCHEMA = 'carcass/cue 1';
export const TAKE_SCHEMA = 'carcass/sound-take 1';
export const KINDS = ['bed', 'spot'];
export const NO_LISTENER = "The listener's calls are in the Builder's log.";
export const NO_DAY = 'not in the headers of the kept take';

const r2 = (v) => Number(v.toFixed(2));
const r3 = (v) => Number(v.toFixed(3));
const quote = (t) => JSON.stringify(t);
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

export function readCue(file, id, listed = null) {
  const fail = (why) => {
    throw new Error(`the cue file of ${id} ${why}`);
  };
  if (file === null || typeof file !== 'object' || Array.isArray(file)) fail('is not an object');
  if (file.schema !== CUE_SCHEMA) fail(`has the schema ${quote(file.schema ?? null)}, not ${quote(CUE_SCHEMA)}`);
  if (file.id !== id) fail(`names the cue ${quote(file.id ?? null)}`);
  if (typeof file.description !== 'string' || file.description.trim() === '') fail('has no description');
  if (file.description.length > SOUND.maxDescription) fail(`has a description of ${file.description.length} characters, over ${SOUND.maxDescription}`);
  if (!isNumber(file.seconds) || file.seconds < SOUND.minSeconds || file.seconds > SOUND.maxSeconds) fail(`asks for ${quote(file.seconds ?? null)} seconds, outside ${SOUND.minSeconds} to ${SOUND.maxSeconds}`);
  const influence = file.promptInfluence ?? null;
  if (influence !== null && (!isNumber(influence) || influence < 0 || influence > 1)) fail(`has a prompt influence of ${quote(influence)}, outside 0 to 1`);
  if (file.loop !== undefined && typeof file.loop !== 'boolean') fail('has a loop that is not true or false');
  const unit = listed?.unit ?? file.unit ?? null;
  const kind = listed?.kind ?? file.kind ?? null;
  if (typeof unit !== 'string' || unit === '') fail('names no unit, and the cut list does not list the cue');
  if (!KINDS.includes(kind)) fail(`has the kind ${quote(kind)}, not bed or spot`);
  if (listed && file.unit !== undefined && file.unit !== listed.unit) fail(`says the unit is ${file.unit} and the cut list says ${listed.unit}`);
  if (listed && file.kind !== undefined && file.kind !== listed.kind) fail(`says the kind is ${file.kind} and the cut list says ${listed.kind}`);
  const loop = file.loop ?? Boolean(listed?.loop);
  return { id, unit, kind, description: file.description, seconds: file.seconds, promptInfluence: influence, loop, listed: Boolean(listed) };
}

export function requestBody(cue, sound = SOUND) {
  const body = { text: cue.description, model_id: sound.model, duration_seconds: cue.seconds };
  if (cue.promptInfluence !== null) body.prompt_influence = cue.promptInfluence;
  if (cue.loop) body.loop = true;
  return body;
}

export const requestUrl = (api, sound = SOUND) => `${api}${sound.path}?output_format=${sound.outputFormat}`;
export const costOf = (cue, sound = SOUND) => Math.ceil(cue.seconds * sound.creditsPerSecond - 1e-9);

export function settingsLine(cue, sound = SOUND) {
  return [
    `duration_seconds ${cue.seconds}`,
    cue.promptInfluence === null ? `prompt_influence not sent (the default is ${sound.defaultPromptInfluence})` : `prompt_influence ${cue.promptInfluence}`,
    cue.loop ? 'loop true' : 'loop not sent (the default is false)',
    `output format ${sound.outputFormat}`,
    'no seed (the endpoint takes none)'
  ].join(', ');
}

export function refusal(status, text) {
  let detail = null;
  try {
    detail = JSON.parse(text).detail ?? null;
  } catch {
    detail = null;
  }
  const code = typeof detail === 'object' && detail !== null ? String(detail.status ?? detail.code ?? '') : '';
  const message = typeof detail === 'object' && detail !== null ? String(detail.message ?? '') : typeof detail === 'string' ? detail : String(text ?? '');
  const quota = /quota|credits?|character/i.test(`${code} ${message}`) && [401, 402, 403, 429].includes(status) && !/rate_limit|concurrent/i.test(code);
  return { quota, code, message: message.replace(/\s+/g, ' ').trim() };
}

function windowDb(channels, rate, seconds = EDGE.windowSeconds) {
  const size = Math.max(1, Math.round(seconds * rate));
  const length = channels[0].length;
  const out = new Float32Array(Math.ceil(length / size));
  for (let w = 0; w < out.length; w++) {
    const to = Math.min(length, (w + 1) * size);
    let sum = 0;
    for (const ch of channels) for (let i = w * size; i < to; i++) sum += ch[i] * ch[i];
    out[w] = db(Math.sqrt(sum / (channels.length * Math.max(1, to - w * size))));
  }
  return { size, levels: out };
}

export function edges(channels, rate, edge = EDGE) {
  const length = channels[0].length;
  const { size, levels } = windowDb(channels, rate, edge.windowSeconds);
  let first = 0;
  while (first < levels.length && levels[first] <= edge.quietDb) first++;
  if (first === levels.length) return { silent: true, from: 0, to: length, headSeconds: length / rate, tailSeconds: length / rate };
  let last = levels.length - 1;
  while (last > first && levels[last] <= edge.quietDb) last--;
  const from = first * size;
  const to = Math.min(length, (last + 1) * size);
  return { silent: false, from, to, headSeconds: from / rate, tailSeconds: (length - to) / rate };
}

export function clippedRuns(channels, limits = LIMITS) {
  let runs = 0;
  for (const ch of channels) {
    let run = 0;
    for (let i = 0; i < ch.length; i++) {
      if (Math.abs(ch[i]) >= limits.fullScale) {
        run++;
        if (run === limits.fullScaleRun) runs++;
      } else run = 0;
    }
  }
  return runs;
}

function meanDb(channels, from, to) {
  let sum = 0;
  for (const ch of channels) for (let i = from; i < to; i++) sum += ch[i] * ch[i];
  const n = channels.length * Math.max(1, to - from);
  return db(Math.sqrt(sum / n));
}

export function seamDb(channels, rate, seconds = EDGE.seamSeconds) {
  const length = channels[0].length;
  const n = Math.min(Math.round(seconds * rate), Math.floor(length / 2));
  if (n < 1) return 0;
  return r2(Math.abs(meanDb(channels, 0, n) - meanDb(channels, length - n, length)));
}

export function measure(channels, rate) {
  const length = channels[0].length;
  const e = edges(channels, rate);
  const lufs = length === 0 ? SILENCE_DB : integratedLufs(channels, rate);
  return {
    seconds: r3(length / rate),
    channels: channels.length,
    lufs: r2(lufs),
    truePeakDb: length === 0 ? SILENCE_DB : r2(truePeakDb(channels, rate)),
    clippedRuns: clippedRuns(channels),
    headSilenceSeconds: r3(e.headSeconds),
    tailSilenceSeconds: r3(e.tailSeconds),
    silent: e.silent || lufs <= EDGE.silentLufs,
    seamDb: seamDb(channels, rate)
  };
}

export function faultsOf(measured, cue, edge = EDGE) {
  const out = [];
  if (measured.silent) out.push('It is silent, or close to it.');
  if (measured.clippedRuns > 0) out.push(`It clips: ${measured.clippedRuns} ${measured.clippedRuns === 1 ? 'run' : 'runs'} of samples at full scale.`);
  if (Math.abs(measured.seconds - cue.seconds) > cue.seconds * edge.lengthSlack) out.push(`It is ${measured.seconds.toFixed(2)} s long where ${cue.seconds} s was asked for.`);
  if (!measured.silent && !cue.loop && measured.headSilenceSeconds > edge.longSilenceSeconds) out.push(`It starts with ${measured.headSilenceSeconds.toFixed(2)} s of silence.`);
  return out;
}

export function trim(channels, rate, { loop = false, edge = EDGE } = {}) {
  const length = channels[0].length;
  if (loop) return { channels: channels.map((c) => Float32Array.from(c)), from: 0, to: length, cutHeadSeconds: 0, cutTailSeconds: 0, faded: false };
  const e = edges(channels, rate, edge);
  const room = Math.round(edge.roomSeconds * rate);
  const from = e.silent ? 0 : Math.max(0, e.from - room);
  const to = e.silent ? length : Math.min(length, e.to + room);
  const n = Math.min(Math.round(edge.fadeSeconds * rate), Math.floor((to - from) / 2));
  const m = Math.min(Math.round(edge.tailFadeSeconds * rate), Math.floor((to - from) / 2));
  const out = channels.map((c) => {
    const part = Float32Array.from(c.subarray(from, to));
    for (let i = 0; i < n; i++) part[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / n);
    for (let i = 0; i < m; i++) part[part.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / m);
    return part;
  });
  return { channels: out, from, to, cutHeadSeconds: r3(from / rate), cutTailSeconds: r3((length - to) / rate), faded: n > 0 };
}

export function limit(channels, rate, gainDb, level = LEVEL) {
  const gain = fromDb(gainDb);
  const n = channels[0].length;
  const reach = Math.max(1, Math.round(level.attackSeconds * rate));
  const hold = Math.exp(-1 / (level.releaseSeconds * rate));
  const loud = channels.map((c) => {
    const o = new Float32Array(n);
    for (let i = 0; i < n; i++) o[i] = c[i] * gain;
    return o;
  });
  if (n === 0) return loud;
  const peaks = oversampledPeaks(loud);
  let ceiling = level.limit;
  let out = loud;
  for (let round = 0; round < level.rounds; round++) {
    const need = new Float64Array(n);
    for (let i = 0; i < n; i++) need[i] = peaks[i] > ceiling ? ceiling / peaks[i] : 1;
    const low = new Float64Array(n);
    const queue = new Int32Array(n);
    let head = 0;
    let tail = 0;
    for (let i = 0; i < n + reach; i++) {
      if (i < n) {
        while (tail > head && need[queue[tail - 1]] >= need[i]) tail--;
        queue[tail++] = i;
      }
      const c = i - reach;
      if (c < 0) continue;
      while (queue[head] < c - reach) head++;
      low[c] = need[queue[head]];
    }
    let g = 1;
    for (let i = 0; i < n; i++) {
      g = Math.min(low[i], 1 - (1 - g) * hold);
      low[i] = g;
    }
    const half = Math.floor(reach / 2);
    const curve = new Float64Array(n);
    let sum = 0;
    let count = 0;
    for (let i = 0; i < Math.min(n, half); i++) {
      sum += low[i];
      count++;
    }
    for (let i = 0; i < n; i++) {
      if (i + half < n) {
        sum += low[i + half];
        count++;
      }
      if (i - half - 1 >= 0) {
        sum -= low[i - half - 1];
        count--;
      }
      curve[i] = sum / count;
    }
    out = loud.map((c) => {
      const o = new Float32Array(n);
      for (let i = 0; i < n; i++) o[i] = c[i] * curve[i];
      return o;
    });
    if (truePeakDb(out, rate) <= level.truePeakDb) break;
    ceiling *= 0.9;
  }
  return out;
}

export function toLevel(channels, rate, lufs = LEVEL.listenLufs, level = LEVEL) {
  const start = channels[0].length === 0 ? SILENCE_DB : integratedLufs(channels, rate);
  if (start <= EDGE.silentLufs) return { gainDb: 0, rounds: 0, channels: channels.map((c) => Float32Array.from(c)), lufs: r2(start), truePeakDb: r2(channels[0].length === 0 ? SILENCE_DB : truePeakDb(channels, rate)) };
  let gainDb = r2(lufs - start);
  let out = limit(channels, rate, gainDb, level);
  let now = integratedLufs(out, rate);
  let rounds = 1;
  while (rounds < GAIN.rounds && Math.abs(lufs - now) > GAIN.nearDb) {
    gainDb = r2(gainDb + lufs - now);
    out = limit(channels, rate, gainDb, level);
    now = integratedLufs(out, rate);
    rounds++;
  }
  return { gainDb, rounds, channels: out, lufs: r2(now), truePeakDb: r2(truePeakDb(out, rate)) };
}

export function processTake(channels, rate, cue) {
  const asReturned = measure(channels, rate);
  const faults = faultsOf(asReturned, cue);
  const cut = trim(channels, rate, { loop: cue.loop });
  const levelled = toLevel(cut.channels, rate);
  const asFiled = measure(levelled.channels, rate);
  return {
    channels: levelled.channels,
    check: {
      schema: TAKE_SCHEMA,
      cue: cue.id,
      unit: cue.unit,
      kind: cue.kind,
      loop: cue.loop,
      asked: { description: cue.description, seconds: cue.seconds, promptInfluence: cue.promptInfluence, loop: cue.loop },
      asReturned,
      trim: { cutHeadSeconds: cut.cutHeadSeconds, cutTailSeconds: cut.cutTailSeconds, faded: cut.faded },
      level: { targetLufs: LEVEL.listenLufs, truePeakLimitDb: LEVEL.truePeakDb, gainDb: levelled.gainDb, rounds: levelled.rounds },
      asFiled,
      rate,
      rejected: faults.length > 0,
      reasons: faults
    }
  };
}

export function nextTake(taken, made, max) {
  const used = Math.max(taken.length, made ?? 0);
  if (used >= max) return { ok: false, used };
  return { ok: true, used, take: Math.max(0, ...taken, made ?? 0) + 1 };
}

export function placeRoom({ cue, unit, cuesOfUnit, max }) {
  const others = [...new Set(cuesOfUnit)].filter((id) => id !== cue).sort();
  return { ok: others.length < max, others, unit };
}

export function takeSummary(c) {
  const a = c.asReturned;
  const f = c.asFiled;
  return `${a.seconds.toFixed(2)} s, ${a.lufs} LUFS, true peak ${a.truePeakDb} dB, ${a.channels === 1 ? '1 channel' : `${a.channels} channels`}, ${a.headSilenceSeconds.toFixed(2)} s of silence at the head and ${a.tailSilenceSeconds.toFixed(2)} s at the tail, ${a.clippedRuns === 0 ? 'no clipping' : `clipping in ${a.clippedRuns} ${a.clippedRuns === 1 ? 'run' : 'runs'}`} as returned. As filed: ${f.seconds.toFixed(2)} s, gain ${c.level.gainDb} dB, ${f.lufs} LUFS, true peak ${f.truePeakDb} dB${c.loop ? `, the two ends ${f.seamDb} dB apart` : ''}`;
}

export function keepWhy(kept, takes) {
  if (kept.rejected) return `Take ${kept.take} was kept with a fault. ${kept.reasons.join(' ')}`;
  return takes.length === 1 ? `Take ${kept.take} was kept: the only take, with no fault by measure.` : `Take ${kept.take} was kept: the Builder chose it of the ${takes.length} made, with no fault by measure.`;
}

export function madeBy(take, api, sound = SOUND) {
  return take.source ? `tools/sound.mjs, from the file ${take.source} and not from the account` : `tools/sound.mjs, POST ${requestUrl(api, sound)}, model ${sound.model}`;
}

export function recordText({ cue, takes, kept, listeners = [], day = null, file, cueFile, api, rate, sound = SOUND }) {
  const out = [
    `## ${cue.id}`,
    `Made by: ${madeBy(kept, api, sound)}`,
    `Text or description: ${quote(cue.description)}`,
    `Settings: ${settingsLine(cue, sound)}`,
    `Takes: ${takesLine(takes.length, kept.take, kept.rejected)}. ${keepWhy(kept, takes)}`,
    `Measured: ${takeSummary(kept)}, ${rate} Hz, 16 bit`,
    `The listener: ${listeners.length ? listeners.map((l, k) => `call ${k + 1}: ${quote(l)}`).join(' ') : NO_LISTENER}`,
    `Date: ${day ?? NO_DAY}`,
    '',
    `Files: ${file}`,
    `Cue: a ${cue.kind} in ${cue.unit}${cue.loop ? ', looped' : ''}, described in ${cueFile}`,
    `Level chain: silence cut to ${EDGE.roomSeconds * 1000} ms at each end with a fade of ${EDGE.fadeSeconds * 1000} ms in and ${EDGE.tailFadeSeconds * 1000} ms out${cue.loop ? ' (not for this cue: a loop keeps its whole length)' : ''}, then a gain toward ${LEVEL.listenLufs} LUFS and a limiter that holds the true peak at or under ${LEVEL.truePeakDb} dB, no dither`,
    ...takes.map((t) => `Take ${t.take}: ${takeSummary(t)}. ${t.take === kept.take ? keepWhy(kept, takes) : t.rejected ? `Rejected. ${t.reasons.join(' ')}` : 'Not kept: the Builder chose another take.'}`)
  ];
  return out.join('\n') + '\n';
}

export function readRecord(text) {
  const field = (label) => {
    const line = text.split('\n').find((l) => l.startsWith(label));
    return line ? line.slice(label.length).trim() : null;
  };
  const takes = /^(\d+) made, take (\d+) kept( with a fault)?/.exec(field('Takes:') ?? '');
  const unit = /^a (bed|spot) in ([^,\s]+)/.exec(field('Cue:') ?? '');
  let description = field('Text or description:');
  try {
    description = description === null ? null : JSON.parse(description);
  } catch {
    description = String(description);
  }
  return { made: takes ? Number(takes[1]) : null, kept: takes ? Number(takes[2]) : null, withFault: Boolean(takes?.[3]), kind: unit ? unit[1] : null, unit: unit ? unit[2] : null, description };
}

export function assetsRow({ file, takes, day, source = null, sound = SOUND }) {
  return `| \`${file}\` | ${source ? `A stand-in from the file ${source}` : `ElevenLabs sound effects, \`${sound.model}\``} | ${takes} | ${day ?? 'not recorded'} |`;
}

export function monoOf(channels) {
  const n = channels[0].length;
  const out = new Float32Array(n);
  for (const ch of channels) for (let i = 0; i < n; i++) out[i] += ch[i] / channels.length;
  return out;
}

export function envelope(samples, columns) {
  const per = samples.length / columns;
  const up = new Float32Array(columns);
  const down = new Float32Array(columns);
  let top = 0;
  for (let x = 0; x < columns; x++) {
    let lo = 0;
    let hi = 0;
    for (let i = Math.floor(x * per); i < Math.floor((x + 1) * per); i++) {
      if (samples[i] < lo) lo = samples[i];
      if (samples[i] > hi) hi = samples[i];
    }
    up[x] = hi;
    down[x] = lo;
    top = Math.max(top, hi, -lo);
  }
  return { up, down, top };
}
