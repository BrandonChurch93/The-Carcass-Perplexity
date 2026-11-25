export function riseShot(cut) {
  return cut.shots.find((s) => cut.titanFrame >= s.first && cut.titanFrame <= s.last) ?? null;
}

export function lakeFrame(cut) {
  const shot = riseShot(cut);
  return shot ? shot.first : null;
}

export function lastPictureFrame(cut) {
  const shots = cut.shots.filter((s) => s.picture !== 'black');
  return shots.length ? shots[shots.length - 1].last : cut.frameCount - 1;
}

export function judgedList(cfg, cut, extra = []) {
  const out = [];
  const film = cfg.units[cfg.units.length - 1].id;
  const reveal = cfg.film.order[cfg.film.order.length - 1];
  for (const key of cfg.keys) {
    out.push({ id: key.id, unit: key.unit, frame: cut.keyFrames[key.id] ?? null, what: `The key frame of ${key.id}` });
  }
  const riseKeys = cfg.keys.filter((k) => k.unit === reveal).sort((a, b) => a.order - b.order);
  out.push({ id: `${reveal}-titan`, unit: reveal, frame: cut.titanFrame, what: 'The titan frame' });
  const lake = lakeFrame(cut);
  const first = riseKeys.length ? cut.keyFrames[riseKeys[0].id] : null;
  if (lake !== null && Number.isInteger(first)) {
    for (let i = 1; i <= 3; i++) {
      out.push({
        id: `${reveal}-handoff-${i}`,
        unit: reveal,
        frame: Math.round(lake + ((first - lake) * i) / 4),
        what: `Handoff frame ${i} of 3, between the last frame at the lake and the key frame of ${riseKeys[0].id}`,
      });
    }
  }
  out.push({ id: `${film}-first`, unit: film, frame: 0, what: 'Frame 0 of the film' });
  out.push({ id: `${film}-hook`, unit: film, frame: Math.round(cfg.film.hookSeconds * cut.fps), what: 'The frame at film.hookSeconds' });
  for (const place of cut.places.slice(1)) {
    out.push({ id: `${film}-open-${place.unit}`, unit: film, frame: place.first, what: `The first frame of ${place.unit}` });
  }
  for (const t of cut.transitions ?? []) {
    if (t.last > t.first) out.push({ id: `${film}-through-${t.id}`, unit: film, frame: Math.round((t.first + t.last) / 2), what: `The middle frame of the transition ${t.id}` });
  }
  out.push({ id: `${film}-titan`, unit: film, frame: cut.titanFrame, what: 'The titan frame' });
  out.push({ id: `${film}-last`, unit: film, frame: lastPictureFrame(cut), what: 'The last frame that is not black' });
  const loopFrames = Math.round(cfg.deliver.cardLoop.seconds * cut.fps);
  for (let i = 0; i < 4; i++) {
    out.push({ id: `loop-${i}`, unit: film, loop: Math.round((loopFrames * i) / 4), what: i === 0 ? 'Loop frame 0, the card still' : `The loop, ${i} quarter${i === 1 ? '' : 's'} of the way through` });
  }
  const have = new Set(out.map((e) => e.id));
  for (const e of extra) if (!have.has(e.id)) out.push({ ...e, added: true });
  return out;
}

export function judgedFrames(cfg, cut, extra = []) {
  return Object.fromEntries(judgedList(cfg, cut, extra).filter((e) => Number.isInteger(e.frame)).map((e) => [e.id, e.frame]));
}

export function judgedTable(list) {
  const rows = list.map((e) => `| \`${e.id}\` | \`${e.unit}\` | ${Number.isInteger(e.loop) ? `loop ${e.loop}` : e.frame === null ? 'none yet' : e.frame} | ${e.what}${e.added ? ' (added)' : ''} |`);
  return ['| Entry | Unit | Frame | What |', '| --- | --- | --- | --- |', ...rows].join('\n');
}

export function readJudgedTable(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const m = /^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*(loop\s+\d+|\d+|none yet)\s*\|\s*(.*?)\s*\|\s*$/.exec(line);
    if (!m) continue;
    const loop = /^loop\s+(\d+)$/.exec(m[3]);
    out.push({ id: m[1], unit: m[2], ...(loop ? { loop: Number(loop[1]) } : { frame: m[3] === 'none yet' ? null : Number(m[3]) }), what: m[4].replace(/ \(added\)$/, ''), added: / \(added\)$/.test(m[4]) });
  }
  return out;
}

export function judgedFaults(list, logged) {
  const faults = [];
  const byId = new Map(logged.map((e) => [e.id, e]));
  for (const e of list) {
    const got = byId.get(e.id);
    if (!got) {
      faults.push(`The judged frame ${e.id} is not on the judged list in kit/PROGRESS.md.`);
      continue;
    }
    const want = Number.isInteger(e.loop) ? `loop ${e.loop}` : String(e.frame);
    const have = Number.isInteger(got.loop) ? `loop ${got.loop}` : String(got.frame);
    if (want !== have) faults.push(`The judged frame ${e.id} is at ${want} and kit/PROGRESS.md says ${have}.`);
    if (got.unit !== e.unit) faults.push(`The judged frame ${e.id} belongs to ${e.unit} and kit/PROGRESS.md says ${got.unit}.`);
  }
  return faults;
}
