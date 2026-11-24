import { integratedLufs, truePeakDb, oversampledPeaks, db, fromDb, SILENCE_DB } from './loudness.mjs';

export const VOICE = {
  voiceId: 'GSUpY5pPm1gN8Crb8gqz',
  model: 'eleven_v4',
  tag: '[slowly, gravely] ',
  settings: { stability: 0.5, similarity_boost: 0.75 },
  outputFormat: 'mp3_44100_192',
  lineJoin: '\n\n',
  costPerCharacter: 0.44,
  transcriber: 'small.en'
};

export const LIMITS = {
  windowSeconds: 0.01,
  edgeReachSeconds: 0.25,
  edgeQuietDb: -40,
  edgeRoomSeconds: 0.03,
  peakDb: -0.3,
  fullScale: 0.999,
  fullScaleRun: 3,
  gapNoiseDb: -45,
  gapNoiseSeconds: 0.15,
  stallSeconds: 1.5,
  slowWpm: 60,
  fastWpm: 220,
  tailSeconds: 0.02,
  tailDb: -30,
  unclearProbability: 0.2,
  pitchMinHz: 40,
  pitchMaxHz: 300,
  pitchWindowSeconds: 0.05,
  pitchHopSeconds: 0.01,
  pitchPeakShare: 0.9,
  pitchClear: 0.45,
  pitchQuietShare: 0.1,
  pitchSpread: 0.2
};

export const LEVEL = {
  listenLufs: -16,
  linesLufs: -16,
  truePeakDb: -1.5,
  limit: 0.8,
  attackSeconds: 0.005,
  releaseSeconds: 0.08,
  fadeSeconds: 0.01,
  nearDb: 0.05,
  rounds: 6
};

export const CHECK_SCHEMA = 'carcass/voice-check 1';

const r4 = (v) => Number(v.toFixed(4));
const r2 = (v) => Number(v.toFixed(2));
const r1 = (v) => Number(v.toFixed(1));

export const seedOf = (take, cfg) => cfg.seed + take - 1;
export const requestText = (clip, voice = VOICE) => voice.tag + clip.lines.join(voice.lineJoin);
export const requestBody = (clip, take, cfg, voice = VOICE) => ({ text: requestText(clip, voice), model_id: voice.model, voice_settings: { ...voice.settings }, seed: seedOf(take, cfg) });
export const bodyText = (body) => JSON.stringify(body, null, 1);

export function header(text, name) {
  const lines = String(text ?? '').split(/\r?\n/).filter((l) => l.toLowerCase().startsWith(`${name.toLowerCase()}:`));
  return lines.length ? lines[lines.length - 1].slice(name.length + 1).trim() : null;
}

export function headerDay(text) {
  const d = new Date(header(text, 'date') ?? '');
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function costPerCharacter(headersText, requestTextOfThat, voice = VOICE) {
  const cost = Number(header(headersText, 'character-cost'));
  const length = String(requestTextOfThat ?? '').length;
  return Number.isFinite(cost) && cost > 0 && length > 0 ? cost / length : voice.costPerCharacter;
}

export const costOf = (text, perCharacter) => Math.ceil(text.length * perCharacter - 1e-9);

export const wordsOf = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean);

function swapPairs(words, pairs) {
  let s = ` ${words.join(' ')} `;
  const used = [];
  for (const p of pairs) {
    const [a, b] = p.pair.map((x) => wordsOf(x).join(' '));
    if (s.includes(` ${a} `)) {
      used.push(p);
      s = s.split(` ${a} `).join(` ${b} `);
    }
  }
  return { words: s.trim().split(' ').filter(Boolean), used };
}

export function diffWords(script, heard) {
  const n = script.length;
  const m = heard.length;
  const t = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i][j] = script[i] === heard[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const out = [];
  let i = 0;
  let j = 0;
  let open = null;
  const push = (kind, word) => {
    if (!open) out.push((open = { at: i, script: [], heard: [] }));
    open[kind].push(word);
  };
  while (i < n || j < m) {
    if (i < n && j < m && script[i] === heard[j]) {
      open = null;
      i++;
      j++;
    } else if (j >= m || (i < n && t[i + 1][j] >= t[i][j + 1])) push('script', script[i++]);
    else push('heard', heard[j++]);
  }
  return out.map((d) => ({ ...d, kind: d.script.length === 0 ? 'extra' : d.heard.length === 0 ? 'missing' : 'wrong' }));
}

export function compareWords(scriptText, heardText, pairs = []) {
  const script = wordsOf(scriptText);
  const heard = wordsOf(heardText);
  if (script.join(' ') === heard.join(' ')) return { result: 'match', pairs: [], differs: [] };
  const a = swapPairs(script, pairs);
  const b = swapPairs(heard, pairs);
  const differs = diffWords(a.words, b.words);
  if (differs.length === 0) {
    const used = [...a.used, ...b.used].filter((p, k, all) => all.indexOf(p) === k).filter((p) => !(a.used.includes(p) && b.used.includes(p)));
    return { result: 'sound-alike', pairs: used.map((p) => p.pair), differs: [] };
  }
  const norm = (x) => wordsOf(x).join(' ');
  const listed = (d) => pairs.some((p) => [norm(p.pair[0]), norm(p.pair[1])].sort().join('|') === [d.script.join(' '), d.heard.join(' ')].sort().join('|'));
  const plain = diffWords(script, heard).filter((d) => !listed(d));
  return {
    result: 'differs',
    pairs: [],
    differs: (plain.length ? plain : differs).map((d) => (d.kind === 'extra' ? `extra "${d.heard.join(' ')}"` : d.kind === 'missing' ? `missing "${d.script.join(' ')}"` : `"${d.heard.join(' ')}" for "${d.script.join(' ')}"`))
  };
}

export function windowLevels(samples, rate, seconds = LIMITS.windowSeconds) {
  const size = Math.round(seconds * rate);
  const count = Math.floor(samples.length / size);
  const levels = new Float64Array(count);
  let top = 0;
  for (let w = 0; w < count; w++) {
    let sum = 0;
    for (let i = w * size; i < (w + 1) * size; i++) sum += samples[i] * samples[i];
    levels[w] = Math.sqrt(sum / size);
    if (levels[w] > top) top = levels[w];
  }
  for (let w = 0; w < count; w++) levels[w] = top > 0 ? db(levels[w] / top) : SILENCE_DB;
  return { levels, seconds, top };
}

export function alignedLines(alignment, lines, tag = VOICE.tag) {
  const text = alignment.characters.join('');
  let at = text.startsWith(tag) ? tag.length : 0;
  return lines.map((line) => {
    const i = text.indexOf(line, at);
    if (i < 0) throw new Error(`the alignment does not hold the line "${line}"`);
    at = i + line.length;
    return { text: line, start: alignment.character_start_times_seconds[i], end: alignment.character_end_times_seconds[at - 1] };
  });
}

function edge(win, at, outward, reach, bound) {
  const { levels, seconds } = win;
  const quiet = (w) => w < 0 || w >= levels.length || levels[w] <= LIMITS.edgeQuietDb;
  const steps = Math.round(reach / seconds);
  const home = Math.min(levels.length - 1, Math.max(0, Math.floor(at / seconds + 1e-9) - (outward > 0 ? 1 : 0)));
  let found = null;
  if (quiet(home)) {
    let w = home;
    for (let k = 0; k < steps && quiet(w - outward); k++) w -= outward;
    if (!quiet(w - outward)) found = w;
  } else {
    for (let k = 1; k <= steps; k++) {
      if (quiet(home + outward * k)) {
        found = home + outward * k;
        break;
      }
    }
  }
  if (found === null) return at;
  const sound = outward < 0 ? (found + 1) * seconds : found * seconds;
  const t = sound + outward * LIMITS.edgeRoomSeconds;
  return outward < 0 ? Math.max(bound, t) : Math.min(bound, t);
}

export function trueLines(aligned, win, totalSeconds) {
  const fit = aligned.map((l) => ({ ...l, start: Math.max(0, Math.min(totalSeconds, l.start)), end: Math.max(0, Math.min(totalSeconds, l.end)) }));
  return fit.map((l, k) => {
    const before = k === 0 ? 0 : (fit[k - 1].end + l.start) / 2;
    const after = k === fit.length - 1 ? totalSeconds : (l.end + fit[k + 1].start) / 2;
    const start = edge(win, l.start, -1, LIMITS.edgeReachSeconds, before);
    const end = edge(win, l.end, 1, LIMITS.edgeReachSeconds, after);
    return { line: k + 1, text: l.text, alignedStart: r4(aligned[k].start), alignedEnd: r4(aligned[k].end), start: r4(start), end: r4(Math.max(start, end)) };
  });
}

export function pitchTrack(samples, rate) {
  const n = Math.round(LIMITS.pitchWindowSeconds * rate);
  const hop = Math.round(LIMITS.pitchHopSeconds * rate);
  const lo = Math.floor(rate / LIMITS.pitchMaxHz);
  const hi = Math.floor(rate / LIMITS.pitchMinHz);
  let all = 0;
  for (let i = 0; i < samples.length; i++) all += samples[i] * samples[i];
  const floor = LIMITS.pitchQuietShare * Math.sqrt(all / Math.max(1, samples.length) + 1e-12);
  const frames = [];
  const f = new Float64Array(n);
  const seg = new Float64Array(hi - lo);
  for (let at = 0; at < samples.length - n; at += hop) {
    let sum = 0;
    let sq = 0;
    for (let i = 0; i < n; i++) {
      sum += samples[at + i];
      sq += samples[at + i] * samples[at + i];
    }
    if (Math.sqrt(sq / n) < floor) {
      frames.push(0);
      continue;
    }
    const mean = sum / n;
    let zero = 0;
    for (let i = 0; i < n; i++) {
      f[i] = samples[at + i] - mean;
      zero += f[i] * f[i];
    }
    if (zero <= 0) {
      frames.push(0);
      continue;
    }
    let best = 0;
    for (let lag = lo; lag < hi; lag++) {
      let s = 0;
      for (let i = 0; i < n - lag; i++) s += f[i] * f[i + lag];
      seg[lag - lo] = s / zero;
      if (seg[lag - lo] > seg[best]) best = lag - lo;
    }
    let pick = best;
    for (let j = 1; j < seg.length - 1; j++) {
      if (seg[j] > seg[j - 1] && seg[j] >= seg[j + 1] && seg[j] >= LIMITS.pitchPeakShare * seg[best]) {
        pick = j;
        break;
      }
    }
    frames.push(seg[pick] > LIMITS.pitchClear ? rate / (pick + lo) : 0);
  }
  return { frames, hopSeconds: hop / rate };
}

function percentile(sorted, p) {
  const at = (sorted.length - 1) * p;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}

export function pitchStats(track, from = 0, to = Infinity) {
  const voiced = track.frames.filter((hz, k) => hz > 0 && k * track.hopSeconds >= from && k * track.hopSeconds < to - LIMITS.pitchWindowSeconds / 2).sort((a, b) => a - b);
  if (voiced.length === 0) return { medianHz: null, p10Hz: null, p90Hz: null, voiced: 0 };
  return { medianHz: r1(percentile(voiced, 0.5)), p10Hz: r1(percentile(voiced, 0.1)), p90Hz: r1(percentile(voiced, 0.9)), voiced: voiced.length };
}

const lufsOf = (samples, rate) => {
  const v = integratedLufs([samples], rate);
  return v <= SILENCE_DB ? null : r2(v);
};

const wpm = (words, seconds) => (seconds > 0 ? r1((words * 60) / seconds) : null);

export function measureTake(samples, rate, lines, track = pitchTrack(samples, rate)) {
  const total = samples.length / rate;
  const perLine = lines.map((l) => {
    const seconds = l.end - l.start;
    const words = wordsOf(l.text).length;
    const part = samples.subarray(Math.round(l.start * rate), Math.round(l.end * rate));
    return { ...l, seconds: r4(seconds), words, wpm: wpm(words, seconds), pitch: pitchStats(track, l.start, l.end), lufs: lufsOf(part, rate), truePeakDb: part.length ? r2(truePeakDb([part], rate)) : null };
  });
  const words = perLine.reduce((a, l) => a + l.words, 0);
  const spoken = perLine.reduce((a, l) => a + l.seconds, 0);
  const whole = perLine.length ? perLine[perLine.length - 1].end - perLine[0].start : 0;
  return {
    seconds: r4(total),
    wordCount: words,
    spokenSeconds: r4(spoken),
    wpmSpeaking: wpm(words, spoken),
    wpmWithPauses: wpm(words, whole),
    pauses: perLine.slice(1).map((l, k) => r4(l.start - perLine[k].end)),
    pitch: pitchStats(track),
    lufs: lufsOf(samples, rate),
    truePeakDb: r2(truePeakDb([samples], rate)),
    lines: perLine
  };
}

function longestRun(levels, from, to, test) {
  let best = 0;
  let run = 0;
  for (let w = Math.max(0, from); w < Math.min(levels.length, to); w++) {
    run = test(levels[w]) ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

export function findFaults({ samples, rate, win, lines, words = null }) {
  const faults = [];
  const s = win.seconds;
  let peak = 0;
  let run = 0;
  let flat = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    if (v > peak) peak = v;
    run = v >= LIMITS.fullScale ? run + 1 : 0;
    if (run > flat) flat = run;
  }
  if (db(peak) > LIMITS.peakDb || flat >= LIMITS.fullScaleRun) faults.push({ fault: 'clipped', text: `It is clipped: the peak is ${r2(db(peak))} dBFS${flat >= LIMITS.fullScaleRun ? ` and ${flat} samples in a row are at full scale` : ''}.` });
  for (let k = 0; k + 1 < lines.length; k++) {
    const noise = longestRun(win.levels, Math.ceil(lines[k].end / s - 1e-9), Math.floor(lines[k + 1].start / s + 1e-9), (v) => v > LIMITS.gapNoiseDb) * s;
    if (noise > LIMITS.gapNoiseSeconds + 1e-9) faults.push({ fault: 'gap noise', text: `There is a noise or a breath between lines ${k + 1} and ${k + 2}, ${r2(noise)} s long.` });
  }
  for (const l of lines) {
    const still = longestRun(win.levels, Math.ceil(l.start / s - 1e-9), Math.floor(l.end / s + 1e-9), (v) => v <= LIMITS.edgeQuietDb) * s;
    if (still > LIMITS.stallSeconds + 1e-9) faults.push({ fault: 'stalls', text: `Line ${l.line} stalls: a silence of ${r2(still)} s inside it.` });
    const pace = wpm(wordsOf(l.text).length, l.end - l.start);
    if (pace !== null && pace < LIMITS.slowWpm) faults.push({ fault: 'too slow', text: `Line ${l.line} runs at ${pace} words a minute, too slow to be speech.` });
    if (pace !== null && pace > LIMITS.fastWpm) faults.push({ fault: 'rushed', text: `Line ${l.line} runs at ${pace} words a minute, which is rushed.` });
  }
  const tail = Math.round(LIMITS.tailSeconds * rate);
  if (samples.length >= tail && win.top > 0) {
    let sum = 0;
    for (let i = samples.length - tail; i < samples.length; i++) sum += samples[i] * samples[i];
    const level = db(Math.sqrt(sum / tail) / win.top);
    if (level > LIMITS.tailDb) faults.push({ fault: 'cut off', text: `It is cut off: the last ${LIMITS.tailSeconds * 1000} ms are ${r1(-level)} dB under the loudest moment.` });
  }
  for (const w of words ?? []) {
    if (w[3] < LIMITS.unclearProbability) faults.push({ fault: 'unclear word', text: `The word "${w[0]}" at ${w[1]} s is unclear to the transcriber (probability ${w[3]}).` });
  }
  return faults;
}

export function checkTake({ samples, rate, alignment, clip, heard, pairs = [], verdict = null, voice = VOICE }) {
  const win = windowLevels(samples, rate);
  const lines = trueLines(alignedLines(alignment, clip.lines, voice.tag), win, samples.length / rate);
  const scriptText = clip.lines.join(' ');
  const words = heard?.ran
    ? { ...compareWords(scriptText, heard.text, pairs), transcript: heard.text, model: heard.model, heard: heard.words }
    : { result: 'not run', pairs: [], differs: [], transcript: null, model: null, heard: [], why: heard?.why ?? 'the transcriber was not run' };
  const faults = findFaults({ samples, rate, win, lines, words: heard?.ran ? heard.words : null });
  const numbers = measureTake(samples, rate, lines);
  const reasons = [];
  if (words.result === 'differs') reasons.push(`The words differ from the script: ${words.differs.join(', ')}.`);
  for (const f of faults) reasons.push(f.text);
  if (verdict?.fault) reasons.push(`The Builder's verdict names a fault: ${verdict.fault}.`);
  return { schema: CHECK_SCHEMA, clip: clip.id, script: scriptText, words, faults, verdict: verdict?.fault ?? null, rejected: reasons.length > 0, reasons, ...numbers };
}

export function keepOrder(takes, keptPitches = []) {
  const pool = takes.some((t) => !t.rejected) ? takes.filter((t) => !t.rejected) : takes;
  const mean = keptPitches.length ? keptPitches.reduce((a, b) => a + b, 0) / keptPitches.length : null;
  const far = (t) => mean !== null && t.pitchHz !== null && Math.abs(t.pitchHz - mean) > LIMITS.pitchSpread * mean;
  const big = (v) => (v === null || v === undefined ? Infinity : v);
  const rank = (t, key) => pool.filter((o) => big(o[key]) < big(t[key])).length;
  const score = (t) => rank(t, 'wpm') + rank(t, 'pitchHz');
  const order = (a, b) => Number(far(a)) - Number(far(b)) || score(a) - score(b) || big(a.pitchHz) - big(b.pitchHz) || a.take - b.take;
  const rest = takes.filter((t) => !pool.includes(t)).sort((a, b) => a.take - b.take);
  return [...[...pool].sort(order), ...rest].map((t) => ({ ...t, far: far(t), score: pool.includes(t) ? score(t) : null }));
}

export function chooseTake(takes, keptPitches = []) {
  if (takes.length === 0) return null;
  const order = keepOrder(takes, keptPitches);
  const best = order[0];
  const why = best.rejected
    ? `Every take was rejected, so take ${best.take} was kept with a fault: ${best.reasons.join(' ')}`
    : takes.length === 1
      ? `Take ${best.take} was kept: the only take, with no fault.`
      : `Take ${best.take} was kept: the slowest and lowest of the ${order.filter((t) => !t.rejected).length} with no fault.`;
  return { take: best.take, withFault: Boolean(best.rejected), why, order };
}

export function limit(samples, rate, gainDb, level = LEVEL) {
  const gain = fromDb(gainDb);
  const reach = Math.max(1, Math.round(level.attackSeconds * rate));
  const hold = Math.exp(-1 / (level.releaseSeconds * rate));
  const n = samples.length;
  let ceiling = level.limit;
  let out = new Float32Array(n);
  for (let round = 0; round < level.rounds; round++) {
    const loud = new Float32Array(n);
    for (let i = 0; i < n; i++) loud[i] = samples[i] * gain;
    const peaks = oversampledPeaks([loud]);
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
      out[i] = loud[i] * (sum / count);
    }
    if (truePeakDb([out], rate) <= level.truePeakDb) break;
    ceiling *= 0.9;
  }
  return out;
}

export function toLoudness(samples, rate, lufs, level = LEVEL) {
  const now = integratedLufs([samples], rate);
  const gainDb = now <= SILENCE_DB ? 0 : lufs - now;
  return { gainDb: r2(gainDb), samples: limit(samples, rate, r2(gainDb), level) };
}

export function fade(samples, rate, seconds = LEVEL.fadeSeconds) {
  const out = Float32Array.from(samples);
  const n = Math.min(Math.round(seconds * rate), Math.floor(out.length / 2));
  for (let i = 0; i < n; i++) {
    const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / n);
    out[i] *= g;
    out[out.length - 1 - i] *= g;
  }
  return out;
}

export function cutLines(samples, rate, lines, level = LEVEL) {
  const spans = lines.map((l) => [Math.round(l.start * rate), Math.round(l.end * rate)]);
  const joined = new Float32Array(spans.reduce((a, [from, to]) => a + to - from, 0));
  let at = 0;
  for (const [from, to] of spans) {
    joined.set(samples.subarray(from, to), at);
    at += to - from;
  }
  const now = integratedLufs([joined], rate);
  let gainDb = now <= SILENCE_DB ? 0 : r2(level.linesLufs - now);
  let parts = [];
  let lufs = null;
  const after = new Float32Array(joined.length);
  for (let round = 0; round < level.rounds; round++) {
    const whole = limit(samples, rate, gainDb, level);
    parts = spans.map(([from, to]) => fade(whole.subarray(from, to), rate, level.fadeSeconds));
    at = 0;
    for (const p of parts) {
      after.set(p, at);
      at += p.length;
    }
    const got = integratedLufs([after], rate);
    lufs = got <= SILENCE_DB ? null : r2(got);
    if (lufs === null || Math.abs(level.linesLufs - got) <= level.nearDb) break;
    gainDb = r2(gainDb + level.linesLufs - got);
  }
  const measured = parts.map((p) => ({ seconds: r4(p.length / rate), lufs: lufsOf(p, rate), truePeakDb: r2(truePeakDb([p], rate)) }));
  return { gainDb, parts, lufs, truePeakDb: r2(Math.max(...measured.map((m) => m.truePeakDb))), lines: measured };
}

const quote = (text) => JSON.stringify(text);
const hz = (v) => (v === null ? 'no pitch found' : `${v} Hz`);
const num = (v, unit) => (v === null ? `no ${unit} reading` : `${v} ${unit}`);

export const lineSummary = (l) => `${l.seconds.toFixed(2)} s, ${l.wpm} words a minute, median pitch ${hz(l.pitch.medianHz)}`;

export function takesLine(made, kept, withFault) {
  return `${made} made, take ${kept} kept${withFault ? ' with a fault' : ''}`;
}

export function recordText({ clip, cfg, takes, choice, kept, linesOut, listeners = [], day, voice = VOICE, paths }) {
  const body = requestBody(clip, kept.take, cfg, voice);
  const settings = Object.entries(voice.settings).map(([k, v]) => `${k} ${v}`).join(', ');
  const words = kept.words.result === 'not run' ? `not run (${kept.words.why})` : `${quote(kept.words.transcript)} from ${kept.words.model}. Against the script: ${kept.words.result}${kept.words.pairs.length ? ` (${kept.words.pairs.map((p) => `"${p[0]}" heard as "${p[1]}"`).join(', ')}: one sound spelled two ways)` : ''}${kept.words.differs.length ? ` (${kept.words.differs.join(', ')})` : ''}.`;
  const out = [
    `## ${clip.id}`,
    `Made by: tools/voice.mjs, POST https://api.elevenlabs.io/v1/text-to-speech/${voice.voiceId}/with-timestamps?output_format=${voice.outputFormat}, model ${voice.model}`,
    `Voice: ${cfg.narration.voiceName || `voice id ${voice.voiceId}`}`,
    `Text or description: ${quote(body.text)}`,
    `Settings: ${settings}, output format ${voice.outputFormat}, seed ${body.seed} for the kept take (the seed of take k is ${cfg.seed} plus k less 1)`,
    `Takes: ${takesLine(takes.length, kept.take, choice.withFault)}. ${choice.why}`,
    `Measured: ${kept.seconds.toFixed(2)} s, ${num(kept.lufs, 'LUFS')}, true peak ${kept.truePeakDb} dB as returned. ${kept.wpmSpeaking} words a minute while speaking, ${kept.wpmWithPauses} with its pauses. Median pitch ${hz(kept.pitch.medianHz)} (10th percentile ${hz(kept.pitch.p10Hz)}, 90th ${hz(kept.pitch.p90Hz)}). The lines as kept: gain ${linesOut.gainDb} dB, ${num(linesOut.lufs, 'LUFS')} joined, true peak ${linesOut.truePeakDb} dB`,
    `Transcript: ${words}`,
    `The listener: ${listeners.length ? listeners.map((l, k) => `call ${k + 1}: ${quote(l)}`).join(' ') : "The listener's calls are in the Builder's log."}`,
    `Date: ${day ?? 'not in the headers of the kept take'}`,
    '',
    `Files: ${paths.clip} and ${paths.lines.join(', ')}`,
    `Pauses between the lines of the kept take: ${kept.pauses.map((p) => `${p.toFixed(2)} s`).join(', ')}`,
    ...kept.lines.map((l) => `Line ${l.line}: ${quote(l.text)} starts ${l.start.toFixed(2)} s, ${lineSummary(l)}`),
    ...takes.map((t) => `Take ${t.take}: seed ${seedOf(t.take, cfg)}, ${t.seconds.toFixed(2)} s, ${t.wpmSpeaking} words a minute while speaking, median pitch ${hz(t.pitch.medianHz)}, ${num(t.lufs, 'LUFS')}, true peak ${t.truePeakDb} dB, words ${t.words.result}. ${t.take === kept.take ? choice.why : t.rejected ? `Rejected. ${t.reasons.join(' ')}` : 'Not kept: another take was slower and lower.'}`)
  ];
  return out.join('\n') + '\n';
}

export function lineRecordText({ clip, line, cfg, kept, takes, choice, linesOut, day, paths, level = LEVEL }) {
  const l = kept.lines[line - 1];
  const m = linesOut.lines[line - 1];
  return [
    `## ${clip.id}-${line}`,
    `Made by: tools/voice.mjs, cut from ${paths.clip}, whose record is audio/records/${clip.id}.md`,
    `Text or description: ${quote(l.text)}`,
    `Settings: ${cfg.audio.sampleRate} Hz, mono, 16 bit. Take ${kept.take} from ${l.start.toFixed(2)} s to ${l.end.toFixed(2)} s. A gain of ${linesOut.gainDb} dB for the whole clip, a limiter that holds the true peak at or under ${level.truePeakDb} dB, a fade of ${level.fadeSeconds * 1000} ms at each end, no dither`,
    `Takes: ${takesLine(takes.length, kept.take, choice.withFault)}`,
    `Measured: ${m.seconds.toFixed(2)} s, ${num(m.lufs, 'LUFS')}, true peak ${m.truePeakDb} dB, ${l.wpm} words a minute, median pitch ${hz(l.pitch.medianHz)}`,
    `Date: ${day ?? 'not in the headers of the kept take'}`
  ].join('\n') + '\n';
}

export function readRecord(text) {
  const field = (label) => {
    const line = text.split('\n').find((l) => l.startsWith(label));
    return line ? line.slice(label.length).trim() : null;
  };
  const takes = /^(\d+) made, take (\d+) kept( with a fault)?/.exec(field('Takes:') ?? '');
  const pitch = /Median pitch ([\d.]+) Hz/.exec(field('Measured:') ?? '');
  const seconds = /^([\d.]+) s/.exec(field('Measured:') ?? '');
  const lines = [];
  for (const l of text.split('\n')) {
    const m = /^Line (\d+): (".*") starts ([\d.]+) s, ([\d.]+) s, ([\d.]+) words a minute, median pitch (?:([\d.]+) Hz|no pitch found)$/.exec(l);
    if (m) lines.push({ line: Number(m[1]), text: JSON.parse(m[2]), start: Number(m[3]), seconds: Number(m[4]), wpm: Number(m[5]), pitchHz: m[6] ? Number(m[6]) : null });
  }
  return { made: takes ? Number(takes[1]) : null, kept: takes ? Number(takes[2]) : null, withFault: Boolean(takes?.[3]), pitchHz: pitch ? Number(pitch[1]) : null, seconds: seconds ? Number(seconds[1]) : null, lines };
}

export function assetsRow({ file, voice = VOICE, takes, day }) {
  return `| \`${file}\` | ElevenLabs speech, \`${voice.model}\` | ${takes} | ${day ?? 'not recorded'} |`;
}

export function withAssetsRow(text, file, row) {
  const lines = text.split('\n');
  const old = lines.findIndex((l) => l.trim().startsWith('|') && l.includes(file));
  if (old >= 0) {
    lines[old] = row;
    return lines.join('\n');
  }
  const head = lines.findIndex((l) => /^\|\s*Clip or cue\s*\|/.test(l));
  if (head < 0) throw new Error('ASSETS.md has no table that starts with "Clip or cue"');
  let last = head + 1;
  while (last + 1 < lines.length && lines[last + 1].trim().startsWith('|')) last++;
  lines.splice(last + 1, 0, row);
  return lines.join('\n');
}
