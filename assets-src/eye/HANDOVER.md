# The Eye, frames 8305 to 9540: hand-over of the third wave of the wide polish

Written by the lead of the third wave at minute 206 of 240, from `agent/p8-eye-polish` at 7176230 (base `origin/main` 967bb1c). What came after that minute is in section 6. Builders: ground (`land/`, `skeleton/`), fluid (`lake/`), sky (`air/`, `shared/`), life (`drinkers/`). Keys: eye-0 is frame 8412, eye-1 9003, eye-2 8600, eye-3 8761, eye-4 9221.

## 1. Done, part by part

**Lake (fluid).**
- 1153964 (V1, ae1368d): the mats at 8412 are flats with pale pools between, no longer combed tongues.
- 6f5184b (1ba046f): the mirror's level far out is softer. This ended the pale row in the box at the right of 9003 (x 83 to 100 percent, y 25 to 42 percent, uhd final). The row was drawn by part `eye/lake` alone, not by the engine.
- 63a6af2 (V2, 275c92e): the swell at 9221 sheds in sheets with runnels; rings reach the near water; 8600 has two sliding mat beds, pale slabs, a wet line and bubble threads.
- 2f230d3 (V3, 1bbacbf): the gold of the lit wall is back in the water at 9221, ring trains are torn and die with distance; the deep at 8761 is black-blue beyond a rounding ledge; no row in the 9221 box.
- 3df14a0 (cf863df): the bed by the shore reads through ground's `shoreLay` (`land/lay.ts`).
- 7176230 (1badd81, picked alone): no bubble threads in the shore shot. They stood as white squiggles over the stones at 9003.

**Ground and skeleton (ground).**
- eda93fc (V1, e7b9dd0): a bedrock bench at the lower left of 8412 with the stream on it, one crag (`land/knob.ts`).
- e7da5bb (V2, 0eb47da): the left crag split along breaks with fallen slabs, a right crag, talus; the stream in white bars; the skeleton sculpted in Blender (`skeleton/sculpt.ts`, `assets-src/eye/skeleton/make_bones.py`).
- 3df14a0 (V3b, 0338cde): ribs flat and pale, vertebrae with blades; the shore sheet at 9003 laid in turned and shifted bands (`SHORE_BANDS` on in `land/lay.ts`); the stream scrap under the bench gone; knob cuts lower.

**Drinkers (life).**
- c37578e (V1, c67a41b): the herd at 8412 walks on planted feet (`drinkers/gait.ts`); footfalls go into `ctx.laps` and ring the water.
- 70ceac0 (V2, bc3478a): the herd's added sun is out and the hides are pale in the rig's shade, by `/root`'s ruling. Mean brightness of the herd at 8412: 119.2 before, 102.6 after, 99.3 in `eye-0`. At 9003: four builds, mottled hides, wet dark legs, shifting weight, falling drops (`drinkers/drips.ts`).
- 988d3a2 (V3b, 7a77274): the two at 9221 are skinned bodies with heads, no longer cards. Their footfalls are not in `ctx.laps` and they are left out of the lake's mirror, for cost.

**Air and far walls (sky).**
- 99085e2 (V1, 5c807a7): the mist at 8600 and 9221 is a bank with a torn top; the wall behind it is softened.
- a5ea200 (V2, 5179a09): the far wall of eye-4 is cut into three layers (scree foot, buttresses, far face) on cylinders 150 m apart, in a sky program of its own (`WALL_LAYERS`); the bank lower and warmer; cirrus drifts.
- 98ee2bc (V3, 8014f23): wisps curl off the bank at 8600; a thicker sheet at the waterline of 9221; the veil from 9450 in torn patches.

**Numbers at 7176230.** Guards 1241, 4409, 7234 byte equal to their before files at every report. Cost in seconds (uhd draft, before then now, cap): 8305 15.21, 15.67, 16.73; 8412 14.77, 15.21, 16.25; 9003 19.38, 20.06, 21.32; 9221 16.04, 17.59, 17.64. Size added: 0.81 MB of 12. Measures: all green where run (M3 at 8412 1.52, 9003 1.98, 8600 2.24 after report 2); see section 6 for 8761 and 9221.

## 2. Still wrong, worst first

1. The swell at 9221. It is a glassy mound with drawn streaks and no breaking crest; rings at the right are still regular. From 9330 it reads as a bullseye.
2. The two animals at 9221. The hide is peach where the herd is cream, the rumps carry hard dark patches, the outlines are sharp where the picture is out of focus, and the backs are seen from higher than in `eye-4`.
3. The skeleton at 8761. It is small in the frame against `eye-3`, the spine is a row of beads, and it lies on mat, not on rock: the shelf has no craggy rock above the water. The water at the left is bright peach.
4. The beach at 8412: even grey stones of one size, evenly spread. The left crag is soft and cool grey.
5. The mist: no crisp wisps at 9221, the bank at 8600 whiter and taller than `eye-2`, its motion small.
6. The animals at 9003: hind legs all fold alike, smooth cone tails, neck rings too even. The herd at 8412 is still one body shape in knots.
7. The mats: flat and soft as watercolour at uhd at 8412 and 8600, more rust than amber.
8. 9472: weather over the pool now, but the pool itself is near empty.

## 3. Held versions

- ground V3, `agent/p8-eye-ground` 9379c6c, the shelf rock (`land/shelf.ts`, in the tree and unused): a height field of broken plates that reads as a pink scaled slab with a cut outline laid on the mat, streaked on its steep faces. Worse than the before.
- life V3, `agent/p8-eye-life` b299e83: the same bodies as V3b at 0.85 s more at 9221, which left no room under the cap. Replaced by V3b.
- The herd's light is closed for this wave by `/root`: it was called dark in round 29 and bright in round 30, and is logged as contested. Do not change it again without `/root`'s word.
- Tried and dropped by builders, not to be tried again as they were: foam on the swell (fluid); two sizings of the beach stones (ground); wind ripples on the lake and ear or tail flicks were ruled out by `/root` before the wave.

## 4. What to try next, for the worst three

1. The swell. It is drawn on a height field in `lake/index.ts`; streaks painted on a smooth mound stay painted. Give the crest its own geometry where the height's slope passes a limit (a folding lip that falls), and let the fall feed the ring trains, so rings start where water lands and not on a ruled spacing. Cost at 9221 is the limit: 17.59 s against 17.64. Win cost first (the ring loop is the lake's dearest read, and the mirror reads the sky program).
2. The two at 9221. Take the hide colour from the herd's (one constant, in `drinkers/herd.ts`), blur the outline by the lens (the picture's near animals are out of focus), and lower the lens's view of the backs only by moving the animals, never the camera.
3. The shelf at 8761. A height field under a mat does not read as rock. Sculpt three or four real blocks in Blender as the crags were (`assets-src/eye/land/make_knobs.py`), set them at the lip with the skeleton across them, let the mat lie only in their hollows, and take their tone from the pale wall under water, not from the mat.

After these: beach stones in clusters with bare gaps and damp dark ones by the water; crisp wisps as separate thin sheets; hind legs and tails at 9003.

## 5. What a newcomer would trip over

- `src/places/eye/handoff.json` and `src/places/eye/flight.ts` are the Reveal's `climb` builder's. The lid of cloud in `air/index.ts` (the lines that read `lidAt`, `lidUniforms`, `LID_GLSL`) changes only on the Reveal lead's ask, through the Eye's lead. In this wave the Reveal's lead asked once for `lid.sun` in `handoff.json` and withdrew it; both files are equal to `origin/main`.
- The Eye's camera ends at 663.5 m and the cut is at 9540 to 9541. Neither moves. No camera path changes.
- The repeat fault shows only on the pinned browser (Chrome for Testing 147.0.7727.15). Take footprints at the top of `main` and read with `textureLod`.
- The renderer pays for every line of a shader on every pixel, taken or not. Only `#if` names save time: the layered wall is a second sky program for that reason, and the bubble threads are compiled out of the shore shot (`EYE_SHINGLE`).
- A change in `shared/glsl.ts` moves lake and drinkers too. The rig changes only by sky, on the lead's word.
- `ctx.laps` has 22 slots (x, z, strength, offset). The lake's ring loop over them is most of what an animal costs: the two at 9221 are left out of it.
- The bed by the shore and the beach must read the same laying (`shoreLay` in `land/lay.ts`), or stones part at the waterline at 9003. `SHORE_BANDS` off gives the old single sheet in both.
- At 9003 the lip mesh in `land/lip.ts` is wound face down and the coarse ground lies over it. It stays so unless a beach is brought that beats the coarse ground.
- A change to `land/outcrop.ts` or `land/height.ts` needs the bake again: `npx tsx assets-src/eye/land/bake-outcrop.ts`. The knobs and the bones come from Blender scripts under `assets-src/eye/`.
- G8 wants a recipe beside every picture under `public/assets/eye/`.
- `npm run -s measure -- --unit eye --only 8761` once ran 22 minutes without ending on the lead's machine (it takes about 4.5). Run it under `timeout`.
- Cost at 9221 varies by 0.3 s between runs on one machine. Compare pairs drawn back to back.
- The lead's pushes to origin failed at times (EXIT 128, no sign in); bundles went to `/root` with each report.
- The before set of this wave lies in `out/work/before/` on the lead's machine (scratch, not committed): preview draft of the five keys, the three guards and seven more frames, hd review of 8412, 8761 and 9003.
- No em dashes and no exclamation points in any text, and every commit ends with the one trailer.
