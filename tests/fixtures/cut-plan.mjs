import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TRIAL_PLAN = 'out/work/cut/trial-plan.json';

const UNIT_BARS = {
  heart: [12, 14, 15, 17, 18],
  breath: [19, 21, 22, 24, 25],
  marsh: [26, 28, 29, 31, 32],
  spine: [33, 35, 36, 37, 38],
  eye: [39, 41, 42, 43, 44]
};
const NAMES = { ribs: 'The Ribs', heart: 'The Heart', breath: 'The Breath', marsh: 'The Blood Marsh', spine: 'The Spine', eye: 'The Eye', reveal: 'The Reveal' };
const MOVES = ['in', 'left', 'hold', 'right', 'out'];
const two = (n) => String(n).padStart(2, '0');

export function trialPlan() {
  const shot = (unit, n, at, key, picture, move, what) => ({ id: `${unit}-${two(n)}`, unit, at, key, picture, move, label: `${NAMES[unit]} · ${what}` });
  const shots = [
    shot('ribs', 1, { frame: 0 }, null, 'ribs-0', 'in', 'the approach'),
    shot('ribs', 2, { hit: 17.368 }, 'ribs-0', 'ribs-0', 'in', 'establishing view'),
    shot('ribs', 3, { bar: 6 }, 'ribs-1', 'ribs-1', 'left', 'detail 1'),
    shot('ribs', 4, { bar: 8 }, 'ribs-2', 'ribs-2', 'hold', 'detail 2'),
    shot('ribs', 5, { bar: 9, beat: 3 }, 'ribs-3', 'ribs-3', 'right', 'detail 3'),
    shot('ribs', 6, { hit: 40.0291 }, 'ribs-4', 'ribs-4', 'out', 'detail 4')
  ];
  for (const [unit, bars] of Object.entries(UNIT_BARS)) {
    bars.forEach((bar, i) => shots.push(shot(unit, i + 1, { bar }, `${unit}-${i}`, `${unit}-${i}`, MOVES[i], i === 0 ? 'establishing view' : `detail ${i}`)));
  }
  shots.push(
    shot('reveal', 1, { bar: 45 }, null, 'eye-0', 'out', 'the pull back starts'),
    shot('reveal', 2, { landmark: 'revealHit' }, 'reveal-1', 'reveal-1', 'out', 'the whole body'),
    shot('reveal', 3, { bar: 48 }, 'reveal-2', 'reveal-2', 'out', 'higher'),
    shot('reveal', 4, { bar: 58 }, 'reveal-3', 'reveal-3', 'out', 'orbit'),
    shot('reveal', 5, { bar: 60 }, 'reveal-4', 'reveal-4', 'hold', 'the last look'),
    shot('reveal', 6, { bar: 63 }, null, 'black', 'hold', 'black')
  );

  const chain = (clip, first, gap = 0.7) => [
    { clip, line: 1, at: first },
    { clip, line: 2, at: { after: `${clip}-1`, gap } },
    { clip, line: 3, at: { after: `${clip}-2`, gap } },
    { clip, line: 4, at: { after: `${clip}-3`, gap } }
  ];
  const lines = [
    { clip: 'n1', line: 1, at: { music: 2.5 } },
    { clip: 'n1', line: 2, at: { after: 'n1-1', gap: 1.2 } },
    { clip: 'n1', line: 3, at: { after: 'n1-2', gap: 0.7 } },
    { clip: 'n1', line: 4, at: { before: { hit: 17.368 }, gap: 0.5 } },
    ...chain('n2', { bar: 5, beat: 3 }),
    ...chain('n3', { shot: 'heart-01', plus: 1 }),
    ...chain('n4', { film: 71.5 }),
    { clip: 'n5', line: 1, at: { frame: 5790 } },
    { clip: 'n5', line: 2, at: { after: 'n5-1', gap: 0.7 } },
    { clip: 'n5', line: 3, at: { event: 'strike', plus: 1 } },
    { clip: 'n5', line: 4, at: { after: 'n5-3', gap: 0.7 } },
    ...chain('n6', { bar: 33, beat: 2.5 }),
    ...chain('n7', { shot: 'eye-01', part: 0.25 }),
    { clip: 'n8', line: 1, at: { bar: 45, plus: 0.5 } },
    { clip: 'n8', line: 2, at: { landmark: 'revealHit', plus: 0.8 } },
    { clip: 'n8', line: 3, at: { after: 'n8-2', gap: 1 }, carried: false, seconds: 1.12 },
    { clip: 'n8', line: 4, at: { after: 'n8-3', gap: 1 } }
  ];

  return {
    schema: 'carcass/plan 1',
    musicCut: { outBar: 49, inBar: 58 },
    end: { music: 233.51 },
    titan: { landmark: 'revealHit' },
    estimate: { secondsPerCharacter: 0.07, secondsPerStop: 0.3, secondsPerComma: 0.15, minSeconds: 0.9 },
    shots,
    keyFrames: { 'ribs-0': { shot: 'ribs-02', part: 0.5 }, 'reveal-1': { landmark: 'revealHit', plus: 0.5 } },
    lines,
    events: [
      { id: 'bore', unit: 'ribs', at: { hit: 40.0291 }, what: 'The bore comes through the cage' },
      { id: 'strike', unit: 'marsh', at: { landmark: 'midHit' }, accent: 102.6262, what: 'The middle strike' },
      { id: 'last', unit: 'reveal', at: { hit: 224.7239 }, what: 'The last strike' }
    ],
    mix: { voiceGainDb: 0 }
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = path.join(ROOT, TRIAL_PLAN);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(trialPlan(), null, 2) + '\n');
  console.log(`cut-plan: wrote ${TRIAL_PLAN}`);
}
