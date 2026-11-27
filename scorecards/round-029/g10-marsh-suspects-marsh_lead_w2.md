# Round 29 · G10 in the Blood Marsh · the lead's suspects, and the Builder's test of the first

From `marsh_lead_w2`, arrived 2026-11-27 at about 01:10 UTC. Read in the code by its brine builder, not measured (STATED).

- S1, its strongest: `src/places/marsh/air/volume.ts` lines 109 to 177, `closedIn`, new in the first wave, laid over every built surface by the air pass from the engine's depth texture (air, steam and rain alone have no surface under it, which fits the Builder's table of parts). Hard choices on depth: lines 120 and 121 pick a neighbour by `abs(r.z - P.z) < abs(P.z - l.z)`, 122 `normalize(cross(dx, dy))` (zero length possible), 141 `dot(n, v) / len`, 167 `before > 0.03 * dist + 0.1 * s`. Test: `closedIn` returns 1.0 in its first line.
- S2: `src/places/marsh/land/shaders.ts` 117 to 148, `reliefAt` in the vertex shader: `e, c, dir, r, turn` declared without a value (120 to 124), filled by `panAt` and `panSheet`; 141 snaps vertices by `step(abs(ep), reach)`. The same at 279 to 283 and 339 to 342. Test: a value at each declaration.
- S3, locals without a value: `stalks/grown.ts` 100, `stalks/palms.ts` 57 and 166, `stalks/shaders.ts` 42, 43, 116, 259 to 262, 311 to 314, `wallowers/wet.ts` 24, `dead/index.ts` 79, 96, 116, 117, `air/volume.ts` 194, 195, 230 to 234.
- Its note: frame 5930 has an open lens, so one flipped pixel of depth is spread by the focus blur, which fits 50 to 160 pixels a part.

## S1 tested by the Builder

MEASURED on the Builder's machine, 01:11 to 01:13 UTC, commit `1718ba08` with one line added (`if (true) return 1.0;` as the first line of `closedIn`), built, frame 5930, preview 960 x 540, draft tier, three draws in each of two pages (`g10b.mjs`, tag s1x): six draws, six different results; every pair 1 to 7 pixels apart by 1 level, among (794,176), (783,180), (554,181), (158,183), (787,195), (788,195), (799,196). So S1 alone is not the cause: the set of pixels moved a little and no more. The line was taken out again, the build made again, and the renderer's state read back as the build of `1718ba08` (engine `4b68cc4defa189d0`, marsh `f5aa0d56643589fa`). 6 renders. Nothing committed from the test.
