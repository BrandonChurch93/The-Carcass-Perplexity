const fixed = (n, digits = 2) => Number(n).toFixed(digits);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function sameSize(a, b, channels) {
  if (a.length !== b.length) throw new Error(`The two frames are not the same size: ${a.length} and ${b.length} bytes.`);
  if (a.length === 0 || a.length % channels !== 0) throw new Error(`A frame of ${a.length} bytes is not whole pixels of ${channels} channels.`);
}

// Both read red, green and blue only: the fourth channel of a frame from the canvas is not picture.
export function differing(a, b, channels = 4) {
  sameSize(a, b, channels);
  let pixels = 0;
  let max = 0;
  for (let i = 0; i < a.length; i += channels) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    if (d === 0) continue;
    pixels += 1;
    if (d > max) max = d;
  }
  return { pixels, total: a.length / channels, max };
}

export function meanDifference(a, b, channels = 4) {
  sameSize(a, b, channels);
  let sum = 0;
  for (let i = 0; i < a.length; i += channels) sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  return sum / (3 * (a.length / channels));
}

// steps[i] is the mean difference between loop frames i and i + 1.
export function largestStep(steps) {
  let at = -1;
  for (let i = 0; i < steps.length; i += 1) if (at < 0 || steps[i] > steps[at]) at = i;
  return at < 0 ? null : { from: at, to: at + 1, mean: steps[at] };
}

export function seamMeasure({ steps, seam, ratio }) {
  const largest = largestStep(steps);
  if (largest === null) return { largest: null, seam, limit: null, times: null, ok: false };
  const limit = ratio * largest.mean;
  return { largest, seam, limit, times: largest.mean > 0 ? seam / largest.mean : null, ok: seam <= limit };
}

export function identityFaults(identity, frameCount) {
  return identity
    .filter((t) => t.pixels > 0)
    .map((t) => `Loop frame ${frameCount}, drawn at its own time, differs from frame 0 in ${plural(t.pixels, 'pixel')} of ${t.total} at the ${t.tier} tier, by up to ${plural(t.max, 'level')} out of 255. It must be the same picture.`);
}

export function seamFaults({ frameCount, steps, seam, ratio }) {
  if (!(Number.isFinite(ratio) && ratio > 0)) return ['deliver.cardLoop.seamMaxRatio is not a number above 0, so the seam cannot be judged.'];
  if (steps.length !== frameCount - 1) return [`${plural(steps.length, 'step')} between neighbouring frames ${steps.length === 1 ? 'was' : 'were'} measured and a loop of ${frameCount} frames has ${frameCount - 1}.`];
  const m = seamMeasure({ steps, seam, ratio });
  if (m.largest === null) return [`A loop of ${plural(frameCount, 'frame')} has no two neighbouring frames to compare the seam with.`];
  if (m.ok) return [];
  const last = frameCount - 1;
  if (m.largest.mean === 0) return [`Loop frame ${last} and frame 0 differ by a mean of ${fixed(seam)} levels, and no two neighbouring frames elsewhere in the loop differ at all.`];
  return [`Loop frame ${last} and frame 0 differ by a mean of ${fixed(seam)} levels, ${fixed(m.times)} times the largest step elsewhere in the loop (${fixed(m.largest.mean)} levels, between frames ${m.largest.from} and ${m.largest.to}). At most ${ratio} times is allowed.`];
}

export function identityLine(identity, frameCount) {
  if (!identity.length || identity.some((t) => t.pixels > 0)) return null;
  return `loop frame ${frameCount} is the same picture as frame 0 at the ${identity.map((t) => t.tier).join(', ')} ${identity.length === 1 ? 'tier' : 'tiers'}`;
}

export function seamLine({ frameCount, steps, seam, ratio }) {
  if (seamFaults({ frameCount, steps, seam, ratio }).length) return null;
  const { largest } = seamMeasure({ steps, seam, ratio });
  return `frame ${frameCount - 1} to frame 0 is a step of ${fixed(seam)} levels; the largest elsewhere is ${fixed(largest.mean)}, between frames ${largest.from} and ${largest.to}, and ${ratio} times that is allowed`;
}

export function countLine(faults) {
  return `${plural(faults.length, 'fault')} at the loop's seam.`;
}
