import { CUT_LIST, readJsonIf, report, skip, count, isWhole, placeOf } from './inputs.mjs';

export const RISE_SKIPPED = 'the windows of the rise: read from the film in Phase 2';

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

export async function runG15(ctx) {
  const cut = readJsonIf(ctx.root, CUT_LIST);
  if (cut === null) return { ...skip(`no ${CUT_LIST} yet`), skipped: [`no ${CUT_LIST} yet`, RISE_SKIPPED] };
  return report(keysHaveFrames(cut, ctx.config));
}
