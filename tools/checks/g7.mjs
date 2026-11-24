import { CUT_LIST, readJsonIf, report, num, isWhole } from './inputs.mjs';

export const sixPlaces = (cfg) => cfg.film.order.slice(0, -1);

export function lengths(cut, cfg) {
  const faults = [];
  const info = [];
  const fps = cfg.film.fps;
  const { minSeconds, maxSeconds, minPlaceSeconds, order } = cfg.film;
  const loop = cfg.deliver.cardLoop;

  if (cut === null) info.push(`There is no ${CUT_LIST} yet, so only the loop was read.`);
  else {
    if (cut.fps !== fps) faults.push(`${CUT_LIST} is at ${cut.fps} frames a second and film.fps is ${fps}.`);
    if (!isWhole(cut.frameCount)) faults.push(`${CUT_LIST} holds no whole number in frameCount.`);
    else {
      const seconds = cut.frameCount / fps;
      const line = `The film is ${num(seconds, 2)} s (${cut.frameCount} frames) and has to be between ${minSeconds} s and ${maxSeconds} s`;
      if (seconds < minSeconds) faults.push(`${line}: it is ${num(minSeconds - seconds, 2)} s too short.`);
      else if (seconds > maxSeconds) faults.push(`${line}: it is ${num(seconds - maxSeconds, 2)} s too long.`);
      else info.push(`${line}.`);
    }

    const places = Array.isArray(cut.places) ? cut.places : [];
    for (const unit of sixPlaces(cfg)) {
      const found = places.filter((p) => p.unit === unit);
      if (found.length === 0) {
        faults.push(`The place ${unit} is not in places of ${CUT_LIST}, and every place needs at least ${minPlaceSeconds} s.`);
        continue;
      }
      const frames = found.reduce((n, p) => n + (p.last - p.first + 1), 0);
      const seconds = frames / fps;
      if (!(seconds >= minPlaceSeconds)) faults.push(`The place ${unit} has ${num(seconds, 2)} s (${frames} frames) and every place needs at least ${minPlaceSeconds} s.`);
      else info.push(`The place ${unit} has ${num(seconds, 2)} s, at least ${minPlaceSeconds} s.`);
    }

    const got = places.map((p) => p.unit);
    if (got.join(' ') !== order.join(' ')) faults.push(`The places come in the order ${got.join(', ') || 'none'} and film.order is ${order.join(', ')}.`);
    else info.push(`The places come in the order of film.order: ${order.join(', ')}.`);

    let next = 0;
    for (const p of places) {
      if (!isWhole(p.first) || !isWhole(p.last) || p.last < p.first) faults.push(`The place ${p.unit} runs from frame ${p.first} to frame ${p.last}, which is no span.`);
      else if (p.first !== next) faults.push(`The place ${p.unit} starts on frame ${p.first} and the place before it left off at frame ${next - 1}, so there is ${p.first > next ? 'a gap' : 'an overlap'} of ${Math.abs(p.first - next)} frames.`);
      if (isWhole(p.last)) next = p.last + 1;
    }
    if (places.length && isWhole(cut.frameCount) && next !== cut.frameCount) faults.push(`The places end on frame ${next - 1} and the film ends on frame ${cut.frameCount - 1}.`);
  }

  const loopLine = `The loop is ${loop.seconds} s and has to be between ${loop.minSeconds} s and ${loop.maxSeconds} s`;
  if (!(loop.seconds >= loop.minSeconds && loop.seconds <= loop.maxSeconds)) faults.push(`${loopLine}.`);
  else info.push(`${loopLine}.`);

  return { faults, info, skipped: cut === null ? [`no ${CUT_LIST} yet, so the film, the places and their order were not read`] : [] };
}

export async function runG7(ctx) {
  return report(lengths(readJsonIf(ctx.root, CUT_LIST), ctx.config));
}
