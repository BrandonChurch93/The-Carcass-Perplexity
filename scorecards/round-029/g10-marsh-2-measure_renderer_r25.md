# Round 29 · G10 at the Blood Marsh, second search on a render machine

From `/root/measure_renderer_r25`, received 2026-11-27 at 00:33 UTC. Commit `15ca80c8` (the picture code of `1718ba08`), no tracked file changed, nothing pushed. About 7 minutes, 12 single renders. STATED by the machine unless marked.

## Step 1 · the fault does not follow the number of processors

- `taskset -c 0,1 node g10a.mjs 5930 t2`: six renders, 1 distinct file, 0 of 15 pairs differ (about 22 s a render).
- `taskset -c 0 node g10a.mjs 5930 t1`: six renders, 1 distinct file, 0 of 15 pairs differ (about 31 s a render).
- All 12 are the same file as its earlier 24 at four processors: PNG sha256 begins `2775411803b1`.
- The limit reached the browser: the drawing process showed affinity list 0 during the one-processor run, and a page in the same browser reports `navigator.hardwareConcurrency` 4 with no limit, 2 under `taskset -c 0,1`, 1 under `taskset -c 0`.
- Its machine: Intel Xeon 2.90 GHz, 4 cores, 1 thread a core, avx2, fma and avx512f; browser 159.0.8154.6; SwiftShader flags from `tools/lib/render.mjs`. Six renders with six busy loops running on four processors were equal as well.

## Step 2 · not run (no fault in hand); three facts from reading

- The mirror (`brine/index.ts` line 64) is drawn into at lines 301 to 303 with the whole scene less the water; while it is drawn the shared `tMirror` uniform holds the 1 x 1 blank picture (line 298) and is set to the mirror only afterwards (line 307). Its readers are the brine and the land, through `shared/brine-glsl.ts` lines 29 to 31 and 65. The contact map (`shared/rig.ts` line 158) is drawn into at lines 336 to 338 from a scene of its own that holds only the contact discs, which read no texture. No surface of the Marsh reads a target while it is drawn into.
- The contact map is made with `depthBuffer: false`, so clearing depth there can change nothing.
- At preview size the mirror is 160 wide, so `brine-glsl.ts` line 64 gives level 0: the new mipmap levels are generated but not read at this format.
- UNKNOWN, a pointer: in an effect's solo view every built surface is drawn black (`uSolo`, `shared/glsl.ts` line 219), so a fault in the shading of built surfaces is hidden there. That points at something all built surfaces share (the engine's depth-first pass and its `seen` depth texture read in the main pass, `src/core/engine.ts` lines 305 to 329 and 367 to 374, or the shared air and grade in `shared/glsl.ts`) rather than at one part.

## The Builder's machine, MEASURED 2026-11-27 00:22 to 00:30 UTC (2 processors)

- Six fresh renders of frame 5930 at the draft tier, 960 x 540: six distinct files; pairs differ in 1 to 5 pixels by 1 level of 255, among (153,182), (205,205), (230,205), (469,240), (787,195), (788,195).
- Two renders of each single part (`--diag solo`): differ in `brine` 134 pixels, `stalks` 71, `insects` 52, `fliers` 151 (up to 2 levels), `domes` 134 (up to 2), `land` 63, `sky` 62 (up to 10 levels), `wallowers` 162, `crust` 61, `burst` 112, `dead` 97, all between rows 165 and 365 of 540; equal in `air`, `steam` and `rain`. The solo views of `brine`, `crust`, `burst` and `dead` show one and the same picture (385,542 pixels that are not black).

Cause: UNKNOWN. The fault shows only on the Builder's machine, so the search goes on there.
