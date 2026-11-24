import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, rel, writeJson } from '../../tools/lib/paths.mjs';

const REVEAL_START = 158;
const REVEAL_END = 172;
const KEY_GAP_SECONDS = 2.5;
const BLACK_SECONDS = 1.5;
const MOVES = ['in', 'left', 'out', 'right', 'in'];

const label = (title) => {
  const [place, what] = title.split(': ');
  return `${place} \u00b7 ${what.charAt(0).toLowerCase()}${what.slice(1)}`;
};

export function trialCutlist(cfg = config()) {
  const fps = cfg.film.fps;
  const frameCount = Math.round(cfg.film.targetSeconds * fps);
  const fr = (s) => Math.round(s * fps);
  const openingSeconds = cfg.music.landmarks.firstHit;
  const titanSeconds = cfg.music.landmarks.revealHit;
  const order = cfg.film.order;
  const revealUnit = order[order.length - 1];
  const units = order.slice(0, -1);
  const shots = [];
  const places = [];
  const keyFrames = {};
  const first = cfg.keys.find((k) => k.unit === units[0]);
  shots.push({ id: `${units[0]}-01`, unit: units[0], first: 0, last: fr(openingSeconds) - 1, key: null, picture: first.id, move: 'in', label: `${first.title.split(': ')[0]} \u00b7 the approach` });
  const start = fr(openingSeconds);
  const end = fr(REVEAL_START);
  const keys = units.flatMap((u) => cfg.keys.filter((k) => k.unit === u).sort((a, b) => a.order - b.order));
  keys.forEach((k, i) => {
    const a = start + Math.round(((end - start) * i) / keys.length);
    const b = start + Math.round(((end - start) * (i + 1)) / keys.length) - 1;
    const n = shots.filter((s) => s.unit === k.unit).length + 1;
    shots.push({ id: `${k.unit}-${String(n).padStart(2, '0')}`, unit: k.unit, first: a, last: b, key: k.id, picture: k.id, move: MOVES[k.order % MOVES.length], label: label(k.title) });
    keyFrames[k.id] = Math.round((a + b) / 2);
  });
  const rk = cfg.keys.filter((k) => k.unit === revealUnit);
  const titanFrame = fr(titanSeconds);
  rk.forEach((k, i) => (keyFrames[k.id] = titanFrame - fr(KEY_GAP_SECONDS) * (rk.length - 1 - i)));
  const name = rk[0].title.split(': ')[0];
  const black = frameCount - fr(BLACK_SECONDS);
  shots.push({ id: `${revealUnit}-01`, unit: revealUnit, first: end, last: fr(REVEAL_END) - 1, key: rk[rk.length - 1].id, picture: rk[rk.length - 1].id, move: 'out', label: `${name} \u00b7 the pull back` });
  shots.push({ id: `${revealUnit}-02`, unit: revealUnit, first: fr(REVEAL_END), last: black - 1, key: null, picture: rk[rk.length - 1].id, move: 'hold', label: `${name} \u00b7 the body` });
  shots.push({ id: `${revealUnit}-03`, unit: revealUnit, first: black, last: frameCount - 1, key: null, picture: 'black', move: 'hold', label: `${name} \u00b7 black` });
  for (const u of order) {
    const mine = shots.filter((s) => s.unit === u);
    places.push({ unit: u, first: mine[0].first, last: mine[mine.length - 1].last });
  }
  return {
    schema: 'carcass/cutlist 1',
    fps,
    frameCount,
    music: { file: `audio/supplied/${cfg.music.file}`, pieces: [{ from: 0, to: cfg.film.targetSeconds, at: 0 }], cut: null },
    places,
    shots,
    keyFrames,
    lines: [],
    events: [],
    titanFrame,
    sounds: [],
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const file = rel('out', 'work', 'animatic', 'trial-cutlist.json');
  writeJson(file, trialCutlist());
  console.log(`animatic: wrote ${path.relative(rel(), file)}`);
}
