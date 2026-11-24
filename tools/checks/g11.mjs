import { CUT_LIST, MAP, MS, readJsonIf, report, skip, near, num, count, isWhole } from './inputs.mjs';

const EPS = 1e-6;

export function musicTime(frame, cut) {
  const t = frame / cut.fps;
  for (const p of cut.music?.pieces ?? []) {
    if (t >= p.at - EPS && t < p.at + (p.to - p.from) - EPS) return p.from + (t - p.at);
  }
  return null;
}

export function accentsOf(map) {
  const values = [...(map.beats ?? []), ...(map.bars ?? []), ...(map.hits ?? []).map((h) => h.t)];
  if (map.madeFrom === 'landmarks') values.push(...Object.values(map.landmarks ?? {}));
  return [...new Set(values.filter((v) => Number.isFinite(v)))].sort((a, b) => a - b);
}

export function nearest(values, t) {
  let best = null;
  for (const v of values) if (best === null || Math.abs(v - t) < Math.abs(best - t)) best = v;
  return best;
}

const within = (frames, tolerance) => frames <= tolerance + EPS;

export function cutFollowsMusic(cut, map, cfg) {
  const faults = [];
  const info = [];
  const fps = cut.fps;
  const tolerance = cfg.film.cutToleranceFrames;
  const accents = accentsOf(map);
  const pieces = cut.music?.pieces ?? [];
  const bars = map.bars ?? [];
  const beats = map.beats ?? [];
  const hits = (map.hits ?? []).map((h) => h.t);

  if (map.madeFrom === 'landmarks') info.push('The map was made from music.landmarks of the config, so the accents read here are the landmarks of the config, beside any beat, bar line and hit the map holds.');
  if (accents.length === 0) faults.push(`${MAP} holds no accent: no beat, no bar line and no hit.`);

  const place = (what, frame, target = null) => {
    if (!isWhole(frame)) return faults.push(`${what} has no whole frame number.`);
    const t = musicTime(frame, cut);
    if (t === null) return faults.push(`${what} at frame ${frame} has no music under it, so it lies on no accent.`);
    const to = target ?? nearest(accents, t);
    if (to === null) return null;
    const off = Math.abs(t - to) * fps;
    const name = target === null ? 'the nearest accent' : 'its accent';
    if (!within(off, tolerance)) faults.push(`${what} at frame ${frame} is at music second ${num(t)}, ${name} is at ${num(to)} s, and that is ${num(off, 2)} frames away where ${tolerance} are allowed.`);
    return t;
  };

  const cuts = (cut.shots ?? []).slice(1).map((s) => s.first);
  const times = cuts.map((f, i) => place(`The cut into shot ${cut.shots[i + 1].id}`, f));
  const sits = (list, t) => Number.isFinite(t) && list.some((v) => within(Math.abs(v - t) * fps, tolerance));
  const onBar = times.filter((t) => sits(bars, t)).length;
  const onBeat = times.filter((t) => !sits(bars, t) && sits(beats, t)).length;
  const onHit = times.filter((t) => sits(hits, t)).length;
  info.push(`Of ${count(cuts.length, 'cut')}, ${onBar} sit on a bar line, ${onBeat} on a beat that is no bar line and ${onHit} on a hit, each to within ${tolerance} frames.`);

  for (const e of cut.events ?? []) {
    if (!Number.isFinite(e.accent)) {
      faults.push(`The event ${e.id} names no accent.`);
      continue;
    }
    const known = nearest(accents, e.accent);
    if (known === null || !near(known, e.accent, MS)) faults.push(`The event ${e.id} names the accent ${num(e.accent)} s, which is no accent of ${MAP}${known === null ? '' : `: the nearest is at ${num(known)} s`}.`);
    place(`The event ${e.id}`, e.frame, e.accent);
  }

  const titan = cut.titanFrame;
  const reveal = map.landmarks?.revealHit;
  place('The titan frame', titan);
  if (!Number.isFinite(reveal)) faults.push(`${MAP} holds no landmarks.revealHit, so the titan frame cannot be read against the reveal strike.`);
  else if (isWhole(titan)) {
    const t = musicTime(titan, cut);
    if (t !== null) {
      const off = Math.abs(t - reveal) * fps;
      if (!within(off, tolerance)) faults.push(`The titan frame ${titan} is at music second ${num(t)} and the reveal strike is at ${num(reveal)} s, which is ${num(off, 2)} frames away where ${tolerance} are allowed.`);
      else info.push(`The titan frame ${titan} is at music second ${num(t)}, ${num(off, 2)} frames from the reveal strike at ${num(reveal)} s.`);
    }
  }

  const first = pieces[0];
  if (!first) faults.push(`${CUT_LIST} holds no piece of the music.`);
  else {
    if (!near(first.from, 0, EPS) || !near(first.at, 0, EPS)) faults.push(`The first piece of the music starts at music second ${num(first.from)} and film second ${num(first.at)}, and both have to be 0.`);
    const end = first.at + (first.to - first.from);
    if (isWhole(titan) && !(end > titan / fps + EPS)) faults.push(`The first piece of the music ends at film second ${num(end)} and the titan frame is at ${num(titan / fps)} s, so the music is cut before the titan frame.`);
  }

  const join = cut.music?.cut ?? null;
  if (pieces.length !== 2) faults.push(`The music is in ${count(pieces.length, 'piece')} and has to be in 2: it is cut once, after the titan frame.`);
  if (join === null) faults.push(`music.cut of ${CUT_LIST} is empty, so the music is not cut at two bar lines.`);
  else {
    for (const [side, t, index] of [['out', join.out, join.outBar], ['in', join.in, join.inBar]]) {
      const bar = Number.isFinite(t) ? nearest(bars, t) : null;
      if (bar === null || !near(bar, t, MS)) faults.push(`music.cut.${side} is ${Number.isFinite(t) ? `${num(t)} s` : 'missing'}, which is no bar line of ${MAP}${bar === null ? '' : `: the nearest is at ${num(bar)} s`}.`);
      else if (index !== undefined && !(Number.isFinite(bars[index]) && near(bars[index], t, MS))) faults.push(`music.cut.${side}Bar is ${index}, and bar line ${index} of ${MAP} is ${Number.isFinite(bars[index]) ? `at ${num(bars[index])} s` : 'missing'}, not at ${num(t)} s.`);
    }
    if (pieces.length === 2) {
      const [a, b] = pieces;
      if (!near(a.to, join.out, MS)) faults.push(`The first piece of the music ends at ${num(a.to)} s and music.cut.out is ${num(join.out)} s.`);
      if (!near(b.from, join.in, MS)) faults.push(`The second piece of the music starts at ${num(b.from)} s and music.cut.in is ${num(join.in)} s.`);
      const end = a.at + (a.to - a.from);
      if (!near(b.at, end, MS)) faults.push(`The second piece of the music is placed at film second ${num(b.at)} and the first ends at ${num(end)} s.`);
      if (isWhole(join.frame) && Math.abs(join.frame - b.at * fps) >= 1) faults.push(`music.cut.frame is ${join.frame} and the second piece starts at frame ${num(b.at * fps, 2)}.`);
      if (isWhole(titan) && isWhole(join.frame) && join.frame <= titan) faults.push(`The music is cut at frame ${join.frame}, which is not after the titan frame ${titan}.`);
    }
  }

  return { faults, info, skipped: [] };
}

export async function runG11(ctx) {
  const cut = readJsonIf(ctx.root, CUT_LIST);
  if (cut === null) return skip(`no ${CUT_LIST} yet`);
  const map = readJsonIf(ctx.root, MAP);
  if (map === null) return skip(`no ${MAP} yet`);
  return report(cutFollowsMusic(cut, map, ctx.config));
}
