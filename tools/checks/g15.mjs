import { CUT_LIST, readJsonIf, report, skip, count, isWhole, placeOf } from './inputs.mjs';
import { loadRenderer } from './parts.mjs';
import { pullbackPath, revealKeys } from '../lib/animatic-core.mjs';

export const RISE_SKIPPED = 'the windows of the rise: read from the film in Phase 2';
export const RISE_FROM = 2;

export function keysHaveFrames(cut, cfg) {
  const faults = [];
  const frames = cut.keyFrames ?? {};
  for (const key of cfg.keys) {
    const frame = frames[key.id];
    if (!isWhole(frame)) {
      faults.push(`The key ${key.id} has no key frame in keyFrames of ${CUT_LIST}.`);
      continue;
    }
    const place = placeOf(cut, key.unit);
    if (place === null) faults.push(`The key ${key.id} has its key frame at ${frame}, and its unit ${key.unit} has no span in places.`);
    else if (frame < place.first || frame > place.last) faults.push(`The key ${key.id} has its key frame at ${frame}, outside the span of its unit ${key.unit}, frames ${place.first} to ${place.last}.`);
  }
  const info = [`${count(cfg.keys.length, 'key')} of the config, ${cfg.keys.length - faults.length} with a key frame inside the span of its own unit.`];
  return { faults, info, skipped: [RISE_SKIPPED] };
}

const SLACK = 0.001;

export function riseCoversWindows(keys, states, tolerance) {
  const faults = [];
  const info = [];
  keys.forEach((key, i) => {
    const view = states[i]?.view?.master;
    const win = key.window;
    if (!view || ![view.x0, view.y0, view.w, view.h].every(Number.isFinite)) {
      faults.push(`The film gives no view of the master at the key frame of ${key.id}.`);
      return;
    }
    const slack = SLACK * win.w;
    const room = tolerance * win.w;
    const edges = [
      ['left', win.x - view.x0],
      ['top', win.y - view.y0],
      ['right', view.x0 + view.w - (win.x + win.w)],
      ['bottom', view.y0 + view.h - (win.y + win.h)],
    ];
    const short = edges.filter(([, over]) => over < -slack);
    const wide = edges.filter(([, over]) => over > room);
    for (const [edge, over] of short) faults.push(`At the key frame of ${key.id} the view stops ${(-over).toFixed(1)} px of the master short of the ${edge} edge of its window.`);
    for (const [edge, over] of wide) faults.push(`At the key frame of ${key.id} the view runs ${over.toFixed(1)} px of the master past the ${edge} edge of its window, and ${room.toFixed(1)} px is allowed.`);
    if (!short.length && !wide.length) info.push(`${key.id}: the view covers its window, with at most ${Math.max(...edges.map(([, over]) => over)).toFixed(1)} px of the master to spare where ${room.toFixed(1)} px is allowed.`);
  });
  return { faults, info };
}

export async function runG15(ctx) {
  const cut = readJsonIf(ctx.root, CUT_LIST);
  if (cut === null) return { ...skip(`no ${CUT_LIST} yet`), skipped: [`no ${CUT_LIST} yet`, RISE_SKIPPED] };
  const frames = keysHaveFrames(cut, ctx.config);
  if (ctx.phase < RISE_FROM) return report(frames);
  const pullback = readJsonIf(ctx.root, pullbackPath(ctx.config));
  if (pullback === null) return report({ faults: [...frames.faults, `${pullbackPath(ctx.config)} is missing.`], info: frames.info });
  const keys = revealKeys(ctx.config, pullback).filter((k) => isWhole(cut.keyFrames?.[k.id]));
  const { renderer, error } = await loadRenderer(ctx);
  if (error) return report({ faults: [...frames.faults, error], info: frames.info });
  const states = await renderer.filmStates(keys.map((k) => cut.keyFrames[k.id]));
  const rise = riseCoversWindows(keys, states, ctx.config.film.riseWindowTolerance);
  return report({ faults: [...frames.faults, ...rise.faults], info: [...frames.info, ...rise.info] });
}
