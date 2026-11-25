import { commandCheck } from './commands.mjs';
import { runG4 } from './g4.mjs';
import { runG5 } from './g5.mjs';
import { runG10 } from './g10.mjs';
import { checkG8, checkG9 } from './repo.mjs';
import { runG6 } from './g6.mjs';
import { runG7 } from './g7.mjs';
import { runG11 } from './g11.mjs';
import { runG12 } from './g12.mjs';
import { runG13 } from './g13.mjs';
import { runG14 } from './g14.mjs';
import { runG15 } from './g15.mjs';
import { runG16 } from './g16.mjs';
import { runD1 } from './d1.mjs';
import { runD2 } from './d2.mjs';
import { runD7 } from './d7.mjs';
import { runA1 } from './a1.mjs';
import { runA2 } from './a2.mjs';
import { runA3 } from './a3.mjs';
import { runA4 } from './a4.mjs';
import { runA5 } from './a5.mjs';
import { runA6 } from './a6.mjs';

const fromRepo = (check) => async (ctx) => {
  const r = await check({ root: ctx.root });
  return { ok: r.pass, lines: r.lines, skipped: [] };
};

const BUILT = {
  G1: commandCheck(['run', 'build'], { CARCASS_OUT_DIR: 'out/work/gate/dist' }),
  G2: commandCheck(['test']),
  G3: commandCheck(['run', 'determinism']),
  G4: runG4,
  G5: runG5,
  G6: runG6,
  G7: runG7,
  G8: fromRepo(checkG8),
  G9: fromRepo(checkG9),
  G10: runG10,
  G11: runG11,
  G12: runG12,
  G13: (ctx) => runG13(ctx),
  G14: (ctx) => runG14(ctx),
  G15: runG15,
  G16: runG16,
  D1: (ctx) => runD1(ctx),
  D2: (ctx) => runD2(ctx),
  D7: (ctx) => runD7(ctx),
  A1: runA1,
  A2: runA2,
  A3: (ctx) => runA3(ctx),
  A4: runA4,
  A5: runA5,
  A6: runA6
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

const READ_FROM_THE_CUT_LIST = ['G7', 'G11', 'G15', 'G16'];
const CUT_LIST_PHASE = DELIVERABLE[0][1][0];
const LAST_PHASE = Math.max(...DELIVERABLE.flatMap(([, phases]) => phases));
const fromTheCutList = (id) =>
  READ_FROM_THE_CUT_LIST.includes(id) ? { phases: Array.from({ length: LAST_PHASE - CUT_LIST_PHASE + 1 }, (_, i) => CUT_LIST_PHASE + i) } : {};

const entry = (kind, id, phase, title, extra = {}) => ({ id, title, phase, kind, ...extra, run: BUILT[id] ?? null });

export const REGISTRY = [
  ...MACHINE.map(([id, phase, title]) => entry('machine', id, phase, title, fromTheCutList(id))),
  ...DELIVERABLE.map(([id, phases, title]) => entry('deliverable', id, phases[0], title, { phases })),
  ...SOUND.map(([id, phase, title]) => entry('sound', id, phase, title, { advisory: true }))
];
