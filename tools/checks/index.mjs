import { commandCheck } from './commands.mjs';
import { runG4 } from './g4.mjs';
import { runG10 } from './g10.mjs';
import { checkG8, checkG9 } from './repo.mjs';

const fromRepo = (check) => async (ctx) => {
  const r = await check({ root: ctx.root });
  return { ok: r.pass, lines: r.lines, skipped: [] };
};

const BUILT = {
  G1: commandCheck(['run', 'build']),
  G2: commandCheck(['test']),
  G3: commandCheck(['run', 'determinism']),
  G4: runG4,
  G8: fromRepo(checkG8),
  G9: fromRepo(checkG9),
  G10: runG10
};

const MACHINE = [
  ['G1', 0, 'npm run build exits clean with no type errors'],
  ['G2', 0, 'Unit tests pass'],
  ['G3', 0, 'npm run determinism passes'],
  ['G4', 0, 'Stills are the size of their format, and the film and the loop have the right frame counts'],
  ['G5', 2, 'No interface in a frame, and every frame is read from the canvas'],
  ['G6', 2, 'The config passes startup validation and the judged list is in kit/PROGRESS.md'],
  ['G7', 2, 'The lengths of the film, of every place and of the loop, and the order of the places'],
  ['G8', 0, 'Third-party files, recipes and sound records are all written down'],
  ['G9', 0, 'File sizes, secrets, untracked folders, sound on a public repo and the approved hashes'],
  ['G10', 0, 'Only WebGL2 core and portable extensions, with a half float path'],
  ['G11', 2, 'The cut follows the music'],
  ['G12', 2, 'The rise is one shot'],
  ['G13', 3, 'No covered part is a stand-in'],
  ['G14', 5, 'The seam of the loop'],
  ['G15', 2, 'Every key has a key frame inside its unit, and the rise covers its windows'],
  ['G16', 2, 'The words of the narration in the cut list']
];

const DELIVERABLE = [
  ['D1', [1], 'The animatic exists'],
  ['D2', [2], 'A film of the blockout exists'],
  ['D3', [3], 'The Heart review clip exists'],
  ['D4', [5], 'The preview film exists with the mix'],
  ['D5', [6], 'The film exists'],
  ['D6', [6], 'The card exists'],
  ['D7', [2, 6], 'The local render proof exists']
];

const SOUND = [
  ['A1', 1, 'The transcript of every kept narration clip equals its lines'],
  ['A2', 1, 'Every kept clip and sound has its record and a row in ASSETS.md'],
  ['A3', 1, 'The loudness, the peak and the sample rate of the mix'],
  ['A4', 1, 'A mix made twice is byte equal'],
  ['A5', 1, 'No clip, line, cue or place is over its limit of takes or cues'],
  ['A6', 1, 'The ducking of the music, and nothing louder than the voice']
];

const entry = (kind, id, phase, title, extra = {}) => ({ id, title, phase, kind, ...extra, run: BUILT[id] ?? null });

export const REGISTRY = [
  ...MACHINE.map(([id, phase, title]) => entry('machine', id, phase, title)),
  ...DELIVERABLE.map(([id, phases, title]) => entry('deliverable', id, phases[0], title, { phases })),
  ...SOUND.map(([id, phase, title]) => entry('sound', id, phase, title, { advisory: true }))
];
