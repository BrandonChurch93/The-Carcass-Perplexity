import { MUSIC_DIR, MS, near, num, isWhole } from '../checks/inputs.mjs';
import { lengths } from '../checks/g7.mjs';
import { cutFollowsMusic, accentsOf, nearest, musicTime } from '../checks/g11.mjs';
import { words, scriptLines } from '../checks/g16.mjs';
import { recordedLines } from './script.mjs';

// The film plays the cleaned track when the config names one: the supplied track with two spots of laughter
// taken out, the same length to the sample, so the map made from the supplied track holds for both.
export function musicFile(cfg) {
  const cleaned = cfg.music && cfg.music.cleaned;
  return cleaned && cleaned.file ? cleaned.file : `${MUSIC_DIR}/${cfg.music.file}`;
}

export const SCHEMA = 'carcass/cutlist 1';
export const PLAN_SCHEMA = 'carcass/plan 1';
export const HIT_REACH_SECONDS = 0.06;
export const STRIKES = ['firstHit', 'midHit', 'revealHit', 'finalHit'];
export const STRIKE_BEFORE_SECONDS = 0.15;
export const STRIKE_AFTER_SECONDS = 0.5;
export const MOVES = ['in', 'out', 'hold', 'left', 'right'];
export const BLACK = 'black';
export const DEFAULT_ESTIMATE = { secondsPerCharacter: 0.105, secondsPerStop: 0.5, secondsPerComma: 0.2, minSeconds: 0.9 };
export const FORMS = ['frame', 'film', 'music', 'bar', 'hit', 'landmark', 'after', 'before', 'shot', 'event'];
const EXTRA = { bar: ['beat'], after: ['gap'], before: ['gap'], shot: ['part'] };
const EPS = 1e-6;
const BUSY = Symbol('busy');

export class PlanError extends Error {}

const stop = (text) => {
  throw new PlanError(text);
};
const r4 = (v) => Number(v.toFixed(4));
const r2 = (v) => Number(v.toFixed(2));
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
export const lineId = (l) => `${l.clip}-${l.line}`;
export const framesOf = (seconds, fps) => Math.max(1, Math.ceil(seconds * fps - EPS));

export function musicToFilm(m, join) {
  if (!join || m <= join.out + EPS) return m;
  if (m >= join.in - EPS) return m - (join.in - join.out);
  return stop(`music second ${num(m)} is cut away, the music is cut from ${num(join.out)} s to ${num(join.in)} s`);
}

export function filmToMusic(t, join) {
  return !join || t <= join.out + EPS ? t : t + (join.in - join.out);
}

export function joinOf(plan, map) {
  const c = plan.musicCut ?? null;
  if (c === null) return null;
  const bars = map.bars ?? [];
  for (const k of ['outBar', 'inBar']) if (!isWhole(c[k]) || !isNum(bars[c[k]])) stop(`musicCut.${k} is ${c[k]}, and the map has no such bar line (it holds bar lines 0 to ${bars.length - 1})`);
  if (!(c.inBar > c.outBar)) stop(`musicCut.inBar ${c.inBar} has to come after musicCut.outBar ${c.outBar}`);
  return { outBar: c.outBar, inBar: c.inBar, out: bars[c.outBar], in: bars[c.inBar] };
}

export function estimateSeconds(text, estimate = {}) {
  const e = { ...DEFAULT_ESTIMATE, ...estimate };
  const chars = [...text];
  const stops = chars.filter((c, i) => c === '.' && i !== chars.length - 1).length;
  const commas = chars.filter((c) => c === ',').length;
  return Math.max(e.minSeconds, chars.length * e.secondsPerCharacter + stops * e.secondsPerStop + commas * e.secondsPerComma);
}

export function wavSeconds(buf) {
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return null;
  let at = 12;
  let bytesPerSecond = null;
  while (at + 8 <= buf.length) {
    const id = buf.toString('ascii', at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    if (id === 'fmt ') bytesPerSecond = buf.readUInt16LE(at + 20) * buf.readUInt32LE(at + 12);
    if (id === 'data') return bytesPerSecond ? Math.min(size, buf.length - at - 8) / bytesPerSecond : null;
    at += 8 + size + (size % 2);
  }
  return null;
}

// What a shortened line may be cut in: a stretch of the kept line where no sample reaches this level.
export const CUT_SILENCE_DBFS = -60;

function pcm16(buf) {
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return null;
  let at = 12;
  let fmt = null;
  while (at + 8 <= buf.length) {
    const id = buf.toString('ascii', at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    if (id === 'fmt ') fmt = { format: buf.readUInt16LE(at + 8), channels: buf.readUInt16LE(at + 10), rate: buf.readUInt32LE(at + 12), bits: buf.readUInt16LE(at + 22) };
    if (id === 'data') {
      if (!fmt || fmt.format !== 1 || fmt.bits !== 16) return null;
      const bytes = Math.min(size, buf.length - at - 8);
      return { ...fmt, data: buf.subarray(at + 8, at + 8 + bytes - (bytes % (2 * fmt.channels))) };
    }
    at += 8 + size + (size % 2);
  }
  return null;
}

// The short form of a kept line: the kept line from its start to endSeconds, sample for sample, with a raised cosine
// fade out over its last fadeOutSeconds. No gain, no limiter, no dither, so the level of what stays is the kept line's.
// The cut has to lie in a silence: from the start of the fade to the cut no sample of the kept line reaches
// CUT_SILENCE_DBFS. The same kept line and the same numbers give the same bytes on every run.
export function shortenWav(buf, { endSeconds, fadeOutSeconds }) {
  const wav = pcm16(buf);
  if (wav === null) throw new Error('it is no 16 bit PCM WAV file');
  const step = 2 * wav.channels;
  const total = wav.data.length / step;
  const frames = Math.round(endSeconds * wav.rate);
  const fade = Math.round(fadeOutSeconds * wav.rate);
  if (!(frames > 0 && frames < total)) throw new Error(`it is ${num(total / wav.rate, 4)} s long, so it cannot end at ${endSeconds} s and be shorter`);
  if (!(fade >= 0 && fade <= frames)) throw new Error(`a fade of ${fadeOutSeconds} s does not go into ${endSeconds} s`);
  const limit = 32768 * 10 ** (CUT_SILENCE_DBFS / 20);
  const loud = (frame) => {
    for (let c = 0; c < wav.channels; c++) if (Math.abs(wav.data.readInt16LE(frame * step + 2 * c)) >= limit) return true;
    return false;
  };
  let from = frames;
  while (from > 0 && !loud(from - 1)) from--;
  let to = frames;
  while (to < total && !loud(to)) to++;
  const silence = { from: from / wav.rate, to: to / wav.rate };
  if (from > frames - fade || to <= frames) {
    throw new Error(`the cut at ${endSeconds} s with a fade of ${fadeOutSeconds} s does not lie in a silence: the kept line is under ${CUT_SILENCE_DBFS} dBFS from ${num(silence.from, 3)} s to ${num(silence.to, 3)} s only`);
  }
  const out = Buffer.alloc(44 + frames * step);
  out.write('RIFF', 0, 'ascii');
  out.writeUInt32LE(36 + frames * step, 4);
  out.write('WAVEfmt ', 8, 'ascii');
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(wav.channels, 22);
  out.writeUInt32LE(wav.rate, 24);
  out.writeUInt32LE(wav.rate * step, 28);
  out.writeUInt16LE(step, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36, 'ascii');
  out.writeUInt32LE(frames * step, 40);
  wav.data.copy(out, 44, 0, frames * step);
  for (let i = 0; i < fade; i++) {
    const g = 0.5 + 0.5 * Math.cos((Math.PI * (i + 1)) / fade);
    for (let c = 0; c < wav.channels; c++) {
      const at = 44 + (frames - fade + i) * step + 2 * c;
      out.writeInt16LE(Math.round(out.readInt16LE(at) * g), at);
    }
  }
  return { bytes: out, rate: wav.rate, channels: wav.channels, frames, seconds: frames / wav.rate, keptSeconds: total / wav.rate, fadeFrames: fade, silence };
}

function lazy(kind, has, work) {
  const memo = new Map();
  return (id, own = false) => {
    if (!memo.has(id)) {
      if (!has(id)) stop(`there is no ${kind} ${id}`);
      memo.set(id, BUSY);
      try {
        memo.set(id, { value: work(id) });
      } catch (e) {
        memo.set(id, { failed: e });
        throw e;
      }
    }
    const got = memo.get(id);
    if (got === BUSY) stop(`the ${kind} ${id} leans on itself`);
    if (got.failed) {
      if (own || !(got.failed instanceof PlanError)) throw got.failed;
      stop(`it leans on the ${kind} ${id}, which could not be placed`);
    }
    return got.value;
  };
}

export function formOf(pos) {
  if (pos === null || typeof pos !== 'object' || Array.isArray(pos)) stop(`a position has to be an object, and this is ${JSON.stringify(pos)}`);
  const forms = FORMS.filter((k) => pos[k] !== undefined);
  if (forms.length !== 1) stop(`${JSON.stringify(pos)} is an unknown position form, it needs exactly one of ${FORMS.join(', ')}`);
  const form = forms[0];
  const allowed = [form, 'plus', ...(EXTRA[form] ?? [])];
  const odd = Object.keys(pos).filter((k) => !allowed.includes(k));
  if (odd.length) stop(`${JSON.stringify(pos)} is an unknown position form, ${odd.join(', ')} does not go with ${form}`);
  for (const k of ['plus', 'gap', 'beat', 'part']) if (pos[k] !== undefined && !isNum(pos[k])) stop(`${k} in ${JSON.stringify(pos)} is no number`);
  if (pos.part !== undefined && !(pos.part >= 0 && pos.part <= 1)) stop(`part in ${JSON.stringify(pos)} has to be from 0 to 1`);
  return form;
}

export function barBeat(map, bar, beat = 1) {
  const bars = map.bars ?? [];
  const beats = map.beats ?? [];
  if (!isWhole(bar) || !isNum(bars[bar])) stop(`there is no bar line ${bar} in the map (it holds bar lines 0 to ${bars.length - 1})`);
  if (beat === 1) return bars[bar];
  if (!(beat >= 1)) stop(`beat ${beat} of bar ${bar} is under 1`);
  const t = nearest(beats, bars[bar]);
  if (t === null || !near(t, bars[bar], MS)) stop(`bar line ${bar} at ${num(bars[bar])} s is not among the beats of the map`);
  const step = beat - 1;
  const lo = beats.indexOf(t) + Math.floor(step);
  const part = step - Math.floor(step);
  if (!isNum(beats[lo]) || (part > 0 && !isNum(beats[lo + 1]))) stop(`beat ${beat} of bar ${bar} lies past the last beat of the map`);
  return part > 0 ? beats[lo] + part * (beats[lo + 1] - beats[lo]) : beats[lo];
}

export function hitNear(map, t) {
  const got = nearest((map.hits ?? []).map((h) => h.t), t);
  if (got === null || Math.abs(got - t) > HIT_REACH_SECONDS + EPS) stop(`there is no hit within ${HIT_REACH_SECONDS} s of music second ${num(t)}${got === null ? '' : `, the nearest is at ${num(got)} s`}`);
  return got;
}

export function compile({ plan, map, cfg, kept = {} }) {
  const errors = [];
  const attempt = (name, fn) => {
    try {
      return fn();
    } catch (e) {
      if (!(e instanceof PlanError)) throw e;
      errors.push(`${name}: ${e.message}`);
      return null;
    }
  };
  const done = (cut = null) => ({ cut, errors });

  if (plan === null || typeof plan !== 'object') return done(attempt('plan', () => stop('the plan is no object')));
  if (plan.schema !== PLAN_SCHEMA) errors.push(`plan: schema is ${JSON.stringify(plan.schema)} and has to be "${PLAN_SCHEMA}"`);
  const fps = cfg.film.fps;
  const order = cfg.film.order;
  const keyIds = cfg.keys.map((k) => k.id);
  const script = scriptLines(cfg);
  const planShots = Array.isArray(plan.shots) ? plan.shots : [];
  const planLines = Array.isArray(plan.lines) ? plan.lines : [];
  const planEvents = Array.isArray(plan.events) ? plan.events : [];
  const frameOf = (seconds) => {
    const f = Math.round(seconds * fps + EPS);
    if (f < 0) stop(`it lands on film second ${num(seconds)}, before the film starts`);
    return f;
  };

  const join = attempt('musicCut', () => joinOf(plan, map));
  if (errors.length) return done();

  let frameCount = null;
  const shotAt = (id) => planShots.findIndex((s) => s.id === id);
  const lineAt = (id) => script.findIndex((l) => lineId(l) === id);

  const shotFirst = lazy(
    'shot',
    (id) => shotAt(id) >= 0,
    (id) => frameOf(resolve(planShots[shotAt(id)].at))
  );
  const shotSpan = (id) => {
    const i = shotAt(id);
    const first = shotFirst(id);
    const last = i + 1 < planShots.length ? shotFirst(planShots[i + 1].id) - 1 : frameCount - 1;
    if (last < first) stop(`the shot ${id} has no frame of its own`);
    return { first, last };
  };
  const partOf = ({ first, last }, part) => first + Math.round(part * (last - first));
  const eventFrame = lazy(
    'event',
    (id) => planEvents.some((e) => e.id === id),
    (id) => frameOf(resolve(planEvents.find((e) => e.id === id).at))
  );
  const lineSpan = lazy(
    'line',
    (id) => lineAt(id) >= 0 && planLines.some((l) => lineId(l) === id),
    (id) => {
      const at = lineAt(id);
      const entry = planLines.find((l) => lineId(l) === id);
      const have = kept[id] ?? null;
      if (!have && entry.seconds !== undefined && !(isNum(entry.seconds) && entry.seconds > 0)) stop(`seconds is ${JSON.stringify(entry.seconds)} and has to be a number over 0`);
      const seconds = have ? have.seconds : entry.seconds ?? estimateSeconds(script[at].text, plan.estimate);
      const frames = framesOf(seconds, fps);
      const pos = entry.at;
      const form = formOf(pos);
      let first;
      if (form === 'before') {
        const target = typeof pos.before === 'string' ? lineSpan(pos.before).first / fps : resolve(pos.before);
        first = frameOf(target - (pos.gap ?? 0) + (pos.plus ?? 0)) - frames;
        if (first < 0) stop(`it would start ${-first} frames before the film`);
      } else {
        if (form === 'after' && !(lineAt(pos.after) >= 0 && lineAt(pos.after) < at)) stop(`after names ${pos.after}, and a line may point at an earlier line only`);
        first = frameOf(resolve(pos));
      }
      return { first, frames, made: Boolean(have), file: have ? have.file : null };
    }
  );

  function resolve(pos) {
    const form = formOf(pos);
    const plus = pos.plus ?? 0;
    const need = (ok, text) => ok || stop(text);
    switch (form) {
      case 'frame':
        need(isWhole(pos.frame), `frame ${pos.frame} is no whole frame number`);
        return pos.frame / fps + plus;
      case 'film':
        need(isNum(pos.film), `film ${pos.film} is no number`);
        return pos.film + plus;
      case 'music':
        need(isNum(pos.music), `music ${pos.music} is no number`);
        return musicToFilm(pos.music, join) + plus;
      case 'bar':
        return musicToFilm(barBeat(map, pos.bar, pos.beat ?? 1), join) + plus;
      case 'hit':
        need(isNum(pos.hit), `hit ${pos.hit} is no number`);
        return musicToFilm(hitNear(map, pos.hit), join) + plus;
      case 'landmark':
        need(isNum(map.landmarks?.[pos.landmark]), `there is no landmark ${pos.landmark} in the map`);
        return musicToFilm(map.landmarks[pos.landmark], join) + plus;
      case 'after': {
        const l = lineSpan(pos.after);
        return (l.first + l.frames) / fps + (pos.gap ?? 0) + plus;
      }
      case 'shot':
        return (pos.part === undefined ? shotFirst(pos.shot) : partOf(shotSpan(pos.shot), pos.part)) / fps + plus;
      case 'event':
        return eventFrame(pos.event) / fps + plus;
      default:
        return stop('before is for a line only');
    }
  }

  const end = attempt('end', () => {
    const film = resolve(plan.end);
    const music = filmToMusic(film, join);
    const limit = map.source?.seconds ?? cfg.music.seconds;
    if (music > limit + EPS) stop(`it lies at music second ${num(music)}, past the end of the music at ${num(limit)} s`);
    if (join && film <= join.out + EPS) stop(`it lies at film second ${num(film)}, before the cut in the music at ${num(join.out)} s`);
    if (!(film * fps >= 1)) stop(`it lies at film second ${num(film)}, which leaves no frame`);
    return { film, music };
  });
  if (end === null) return done();
  frameCount = Math.floor(end.film * fps + EPS);

  if (planShots.length === 0) errors.push('shots: the plan holds no shot');
  const shots = [];
  const seen = new Set();
  for (const [i, s] of planShots.entries()) {
    const name = `shot ${s.id ?? `number ${i + 1}`}`;
    const first = attempt(name, () => {
      if (typeof s.id !== 'string' || !s.id) stop('it has no id');
      if (seen.has(s.id)) stop('its id is used twice');
      seen.add(s.id);
      if (!order.includes(s.unit)) stop(`its unit ${s.unit} is not in film.order`);
      if (s.key !== null && !keyIds.includes(s.key)) stop(`its key ${JSON.stringify(s.key)} is no key of the config and not null`);
      if (s.picture !== BLACK && !keyIds.includes(s.picture)) stop(`its picture ${JSON.stringify(s.picture)} is no key of the config and not "${BLACK}"`);
      if (!MOVES.includes(s.move)) stop(`its move ${JSON.stringify(s.move)} is not one of ${MOVES.join(', ')}`);
      const f = shotFirst(s.id, true);
      const before = shots[shots.length - 1];
      if (i === 0 && f !== 0) stop(`it is the first shot and starts on frame ${f}, not on frame 0`);
      if (before && before.first !== null && f <= before.first) stop(`it starts on frame ${f}, which is not after the shot ${before.id} on frame ${before.first}, so the shots are out of order or overlap`);
      if (f >= frameCount) stop(`it starts on frame ${f} and the film ends on frame ${frameCount - 1}`);
      return f;
    });
    shots.push({ id: s.id, unit: s.unit, first, last: null, key: s.key, picture: s.picture, move: s.move, label: s.label ?? '' });
  }
  shots.forEach((s, i) => (s.last = i + 1 < shots.length ? (shots[i + 1].first ?? 0) - 1 : frameCount - 1));

  const places = [];
  for (const s of shots) {
    const open = places[places.length - 1];
    if (open && open.unit === s.unit) open.last = s.last;
    else if (places.some((p) => p.unit === s.unit)) errors.push(`shot ${s.id}: the unit ${s.unit} is split, its shots do not follow one another`);
    else places.push({ unit: s.unit, first: s.first, last: s.last });
  }

  const titanFrame = attempt('titan', () => frameOf(resolve(plan.titan)));

  const accents = accentsOf(map);
  const events = planEvents.map((e, i) => {
    const name = `event ${e.id ?? `number ${i + 1}`}`;
    return attempt(name, () => {
      if (typeof e.id !== 'string' || !e.id) stop('it has no id');
      if (planEvents.filter((o) => o.id === e.id).length > 1) stop('its id is used twice');
      if (!order.includes(e.unit)) stop(`its unit ${e.unit} is not in film.order`);
      const frame = eventFrame(e.id, true);
      const want = e.accent ?? filmToMusic(resolve(e.at), join);
      const accent = nearest(accents, want);
      if (accent === null) stop('the map holds no accent');
      if (e.accent !== undefined && !near(accent, e.accent, MS)) stop(`it names the accent ${num(e.accent)} s, which is no accent of the map, the nearest is at ${num(accent)} s`);
      return { id: e.id, unit: e.unit, frame, accent: r4(accent), what: e.what ?? '' };
    });
  });

  const ids = script.map(lineId);
  const recordedIds = recordedLines(cfg).map(lineId);
  const given = planLines.map(lineId);
  for (const id of ids) if (!given.includes(id)) errors.push(`line ${id}: it is in the spoken script and missing from the plan`);
  given.forEach((id, i) => {
    if (!ids.includes(id)) errors.push(`line ${id}: it is extra, ${recordedIds.includes(id) ? 'narration.cut drops that line' : 'narration.clips holds no such line'}`);
    else if (given.indexOf(id) !== i) errors.push(`line ${id}: it is in the plan twice`);
  });
  const sameSet = ids.length === given.length && ids.every((id) => given.includes(id));
  const wrong = sameSet ? ids.findIndex((id, i) => given[i] !== id) : -1;
  if (wrong >= 0) errors.push(`line ${given[wrong]}: it is out of script order, the script has ${ids[wrong]} at place ${wrong + 1}`);
  const lines = script
    .filter((l) => given.includes(lineId(l)))
    .map((l) => {
      const id = lineId(l);
      const entry = planLines.find((p) => lineId(p) === id);
      return attempt(`line ${id}`, () => {
        const span = lineSpan(id, true);
        const made = { clip: l.clip, line: l.line, text: l.text, unit: l.unit, first: span.first, frames: span.frames, file: span.file, carried: entry.carried === true };
        // A line that Brandon's note places on a strike (review round 1, note 7: the third line of the Reveal lands on the reveal strike) says so in the plan.
        if (entry.onStrike !== undefined) {
          if (!STRIKES.includes(entry.onStrike)) stop(`onStrike names ${JSON.stringify(entry.onStrike)}, which is none of ${STRIKES.join(', ')}`);
          made.onStrike = entry.onStrike;
        }
        return made;
      });
    });

  const keyFrames = {};
  for (const id of Object.keys(plan.keyFrames ?? {})) if (!keyIds.includes(id)) errors.push(`key ${id}: keyFrames names it and it is no key of the config`);
  for (const id of keyIds) {
    keyFrames[id] = attempt(`key ${id}`, () => {
      const pos = plan.keyFrames?.[id];
      if (pos !== undefined) return frameOf(resolve(pos));
      const shot = shots.find((s) => s.key === id);
      if (!shot) stop('it has no frame, keyFrames does not list it and no shot has it as its key');
      if (shot.first === null) stop(`it leans on the shot ${shot.id}, which could not be placed`);
      return partOf(shot, 0.5);
    });
  }

  const sounds = (Array.isArray(plan.sounds) ? plan.sounds : []).map((s, i) =>
    attempt(`sound ${s.id ?? `number ${i + 1}`}`, () => {
      const first = frameOf(resolve(s.at));
      return Object.fromEntries(Object.entries(s).map(([k, v]) => (k === 'at' ? ['first', first] : [k, v])));
    })
  );

  if (errors.length) return done();

  const pieces = join
    ? [
        { from: 0, to: r4(join.out), at: 0 },
        { from: r4(join.in), to: r4(end.music), at: r4(join.out) }
      ]
    : [{ from: 0, to: r4(end.music), at: 0 }];
  const cut = {
    schema: SCHEMA,
    fps,
    frameCount,
    music: {
      file: musicFile(cfg),
      pieces,
      cut: join ? { outBar: join.outBar, inBar: join.inBar, out: r4(join.out), in: r4(join.in), frame: Math.round(join.out * fps) } : null
    },
    places,
    shots,
    keyFrames,
    lines,
    events,
    titanFrame,
    sounds
  };
  if (plan.mix !== undefined) cut.mix = plan.mix;
  return done(cut);
}

export function strikeSpans(cut, map) {
  const join = cut.music?.cut ?? null;
  const spans = [];
  for (const name of STRIKES) {
    const t = map.landmarks?.[name];
    if (!isNum(t)) continue;
    const hit = nearest((map.hits ?? []).map((h) => h.t), t) ?? t;
    const at = Math.abs(hit - t) <= HIT_REACH_SECONDS + EPS ? hit : t;
    if (join && at > join.out + EPS && at < join.in - EPS) continue;
    const film = musicToFilm(at, join);
    spans.push({ name, music: at, film, from: film - STRIKE_BEFORE_SECONDS, to: film + STRIKE_AFTER_SECONDS });
  }
  return spans;
}

const lineName = (l) => `Line ${l.line} of clip ${l.clip}`;

export function ownRules(cut, map, cfg, { spans = true } = {}) {
  const faults = [];
  const fps = cut.fps;
  const min = cfg.narration.linePauseMinSeconds;
  const lines = cut.lines ?? [];
  for (let i = 1; i < lines.length; i++) {
    const a = lines[i - 1];
    const b = lines[i];
    const gap = (b.first - (a.first + a.frames)) / fps;
    if (gap < 0 && !spans) continue;
    if (gap < 0) faults.push(`${lineName(b)} starts on frame ${b.first}, ${num(-gap, 3)} s before ${lineName(a).replace(/^L/, 'l')} ends on frame ${a.first + a.frames - 1}, so the two overlap.`);
    else if (gap < min - EPS) faults.push(`The pause between ${lineName(a).replace(/^L/, 'l')} and ${lineName(b).replace(/^L/, 'l')} is ${num(gap, 3)} s and narration.linePauseMinSeconds is ${min} s.`);
  }
  for (const l of spans ? lines : []) {
    if (l.carried === true) continue;
    const place = (cut.places ?? []).find((p) => p.unit === l.unit);
    const last = l.first + l.frames - 1;
    if (!place) faults.push(`${lineName(l)} belongs to ${l.unit}, which has no place, and it is not carried.`);
    else if (l.first < place.first) faults.push(`${lineName(l)} starts on frame ${l.first}, ${place.first - l.first} frames before its place ${l.unit} starts on frame ${place.first}, and it is not carried.`);
    else if (last > place.last) faults.push(`${lineName(l)} ends on frame ${last}, ${last - place.last} frames after its place ${l.unit} ends on frame ${place.last}, and it is not carried.`);
  }
  for (const s of strikeSpans(cut, map)) {
    for (const l of lines) {
      const from = l.first / fps;
      const to = (l.first + l.frames) / fps;
      // The one exception: a line placed on this strike by name starts on it, within a frame, and may then run over its clear time.
      if (l.onStrike === s.name) {
        if (Math.abs(from - s.film) > 1 / fps + EPS) faults.push(`${lineName(l)} is placed on the strike ${s.name} and starts at ${num(from, 2)} s, not on the strike at film second ${num(s.film, 2)}.`);
        continue;
      }
      if (from < s.to - EPS && to > s.from + EPS) faults.push(`${lineName(l)} runs from ${num(from, 2)} s to ${num(to, 2)} s and lies over the strike ${s.name} at film second ${num(s.film, 2)}, which is kept clear from ${num(s.from, 2)} s to ${num(s.to, 2)} s.`);
    }
  }
  for (const k of cfg.keys) {
    const f = cut.keyFrames?.[k.id];
    const place = (cut.places ?? []).find((p) => p.unit === k.unit);
    if (!place) faults.push(`The key ${k.id} belongs to ${k.unit}, which has no place.`);
    else if (!(f >= place.first && f <= place.last)) faults.push(`The key frame of ${k.id} is frame ${f}, outside its place ${k.unit}, frames ${place.first} to ${place.last}.`);
  }
  const lastShot = (cut.shots ?? [])[cut.shots.length - 1];
  if (lastShot && lastShot.picture !== BLACK) faults.push(`The last shot ${lastShot.id} has the picture ${lastShot.picture} and has to end the film on ${BLACK}.`);
  return faults;
}

export function check(cut, map, cfg) {
  const gates = [
    ['G7', lengths(cut, cfg)],
    ['G11', cutFollowsMusic(cut, map, cfg)],
    ['G16', words(cut, cfg)]
  ];
  const faults = [];
  const info = [];
  for (const [gate, r] of gates) {
    for (const f of r.faults) faults.push(`${gate}. ${f}`);
    for (const f of r.info) info.push(`${gate}. ${f}`);
  }
  for (const f of ownRules(cut, map, cfg, { spans: false })) faults.push(f);
  return { faults, info };
}

export function accentNear(map, t) {
  const kinds = [
    ['hit', (map.hits ?? []).map((h) => h.t)],
    ['bar', map.bars ?? []],
    ['beat', map.beats ?? []]
  ];
  let best = null;
  for (const [kind, list] of kinds) {
    const v = nearest(list, t);
    if (v !== null && (best === null || Math.abs(v - t) < Math.abs(best.t - t) - EPS)) best = { kind, t: v };
  }
  return best;
}

export function timeCode(frame, fps) {
  const s = Math.floor(frame / fps);
  const two = (n) => String(n).padStart(2, '0');
  return `${Math.floor(s / 60)}:${two(s % 60)}.${two(frame % fps)}`;
}

export function tables(cut, map) {
  const fps = cut.fps;
  const sec = (frames) => r2(frames / fps);
  const places = cut.places.map((p) => {
    const spoken = cut.lines.reduce((n, l) => n + Math.max(0, Math.min(l.first + l.frames, p.last + 1) - Math.max(l.first, p.first)), 0);
    return { unit: p.unit, first: sec(p.first), seconds: sec(p.last - p.first + 1), spoken: sec(spoken) };
  });
  const lines = cut.lines.map((l, i) => {
    const before = cut.lines[i - 1];
    const place = cut.places.find((p) => p.unit === l.unit);
    return {
      id: lineId(l),
      first: sec(l.first),
      seconds: sec(l.frames),
      kind: l.file ? 'made' : 'est',
      gap: before ? sec(l.first - (before.first + before.frames)) : null,
      left: place ? sec(place.last + 1 - (l.first + l.frames)) : null
    };
  });
  const cuts = cut.shots.slice(1).map((s) => {
    const t = musicTime(s.first, cut);
    const a = t === null ? null : accentNear(map, t);
    return { shot: s.id, frame: s.first, music: t === null ? null : r4(t), accent: a ? a.t : null, frames: a ? r2(Math.abs(t - a.t) * fps) : null, kind: a ? a.kind : null };
  });
  return { places, lines, cuts };
}

const pad = (v, n) => String(v ?? '-').padStart(n);
const fix = (v, n) => (v === null || v === undefined ? '-' : v.toFixed(2)).padStart(n);

export function printed(cut, t, name = 'cut') {
  const fps = cut.fps;
  const join = cut.music.cut;
  const out = [];
  const say = (text) => out.push(`${name}: ${text}`);
  say(`film ${cut.frameCount} frames, ${num(cut.frameCount / fps, 2)} s at ${fps} fps, titan frame ${cut.titanFrame}`);
  say(join ? `music cut from bar ${join.outBar} at ${num(join.out)} s to bar ${join.inBar} at ${num(join.in)} s, on frame ${join.frame}` : 'music not cut');
  say(`${'place'.padEnd(8)}${pad('first s', 9)}${pad('length s', 10)}${pad('spoken s', 10)}`);
  for (const p of t.places) say(`${p.unit.padEnd(8)}${fix(p.first, 9)}${fix(p.seconds, 10)}${fix(p.spoken, 10)}`);
  say(`${'line'.padEnd(8)}${pad('start s', 9)}${pad('length s', 10)}${pad('kind', 6)}${pad('gap s', 8)}${pad('left s', 8)}`);
  for (const l of t.lines) say(`${l.id.padEnd(8)}${fix(l.first, 9)}${fix(l.seconds, 10)}${pad(l.kind, 6)}${fix(l.gap, 8)}${fix(l.left, 8)}`);
  const wide = Math.max(8, ...t.cuts.map((c) => c.shot.length + 2));
  say(`${'cut into'.padEnd(wide)}${pad('frame', 7)}${pad('off', 7)}  kind`);
  for (const c of t.cuts) say(`${c.shot.padEnd(wide)}${pad(c.frame, 7)}${fix(c.frames, 7)}  ${c.kind ?? 'no music'}`);
  return out;
}

const cell = (v) => String(v ?? '').replace(/\|/g, '/');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)];

export function cuesText(cut, map) {
  const fps = cut.fps;
  const tc = (f) => timeCode(f, fps);
  const sec = (frames) => num(frames / fps, 2);
  const join = cut.music.cut;
  const t = tables(cut, map);
  const shotOf = (frame) => cut.shots.find((s) => frame >= s.first && frame <= s.last)?.id ?? 'none';
  const under = (frame) => {
    const m = musicTime(frame, cut);
    return m === null ? 'none' : num(m, 2);
  };
  const out = ['# Cues', '', 'Written by `npm run cut` from `cut/PLAN.json`. Do not edit by hand. Frames count from 0. A time code is minutes, seconds and frames.', ''];
  out.push('## The film', '');
  out.push(
    ...table(
      ['what', 'value'],
      [
        ['frames', cut.frameCount],
        ['seconds', sec(cut.frameCount)],
        ['frames a second', fps],
        ['music file', cut.music.file],
        ['titan frame', `${cut.titanFrame} (${tc(cut.titanFrame)})`],
        ['cut in the music', join ? `from bar line ${join.outBar} at ${num(join.out)} s to bar line ${join.inBar} at ${num(join.in)} s` : 'none'],
        ['cut in the music, in the film', join ? `frame ${join.frame}, ${num(join.frame / fps, 2)} s (${tc(join.frame)})` : 'none']
      ]
    )
  );
  out.push('', '## Places', '');
  out.push(...table(['unit', 'first frame', 'last frame', 'first second', 'length s'], cut.places.map((p) => [p.unit, p.first, p.last, sec(p.first), sec(p.last - p.first + 1)])));
  out.push('', '## Shots', '');
  out.push(
    ...table(
      ['id', 'unit', 'first frame', 'time code', 'length s', 'key', 'picture', 'move', 'label', 'accent of its cut', 'frames off'],
      cut.shots.map((s, i) => {
        const c = i === 0 ? null : t.cuts[i - 1];
        return [s.id, s.unit, s.first, tc(s.first), sec(s.last - s.first + 1), s.key ?? 'none', s.picture, s.move, s.label, c === null ? 'start of the film' : c.accent === null ? 'no music' : `${c.kind} at ${num(c.accent)} s`, c === null || c.frames === null ? '' : num(c.frames, 2)];
      })
    )
  );
  out.push('', '## Narration', '');
  out.push(
    ...table(
      ['clip', 'line', 'words', 'first frame', 'time code', 'length s', 'file', 'starts on shot', 'music second'],
      cut.lines.map((l) => [l.clip, l.line, l.text, l.first, tc(l.first), sec(l.frames), l.file ?? 'not made yet', shotOf(l.first), under(l.first)])
    )
  );
  out.push('', '## Events', '');
  if (cut.events.length === 0) out.push('none yet');
  else out.push(...table(['id', 'unit', 'frame', 'time code', 'accent s', 'what'], cut.events.map((e) => [e.id, e.unit, e.frame, tc(e.frame), num(e.accent), e.what])));
  out.push('', '## Sounds', '');
  if (cut.sounds.length === 0) out.push('none yet');
  else {
    out.push(
      ...table(
        ['id', 'unit', 'kind', 'first frame', 'time code', 'length s', 'level dB', 'fade in s', 'fade out s', 'loop', 'file'],
        cut.sounds.map((s) => [s.id, s.unit, s.kind, s.first, tc(s.first), isNum(s.frames) ? sec(s.frames) : '', s.gainDb ?? 0, s.fadeInSeconds ?? 0, s.fadeOutSeconds ?? 0, s.loop ? 'yes' : 'no', s.file ?? 'not made yet'])
      )
    );
  }
  out.push('', '## The music as placed', '');
  out.push(
    ...table(
      ['piece', 'music from s', 'music to s', 'film from s', 'film to s', 'first frame', 'frames'],
      cut.music.pieces.map((p, i) => {
        const first = Math.round(p.at * fps);
        const next = i + 1 < cut.music.pieces.length ? Math.round(cut.music.pieces[i + 1].at * fps) : cut.frameCount;
        return [i + 1, num(p.from), num(p.to), num(p.at), num(p.at + (p.to - p.from)), first, next - first];
      })
    )
  );
  return out.join('\n') + '\n';
}
