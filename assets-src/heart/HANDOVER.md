# The Heart, hand-over after the wide polish

Unit `heart`, film frames 2507 to 4220, branch `agent/p6-heart-polish`.
Written by the unit's lead at the end of the four hours. Every hash below is a merge on that branch unless it says otherwise. The last merge of picture code is `197238f`.

## 1. Done

The fall (`src/places/heart/fall/`)
- `65c1765`: the earlier rebuild of the lava fall (slabs of crust and fume) taken in from `agent/heart-lava-e`.
- `085ed9b`, `6fb85d3`: first and second pass.
- `fbcad90`: the fall carries dark plates in packs with a rind at its margins, and its delta spreads on the lake. Its outline changes from frame to frame in 4214 to 4220, where it stood fixed before.
- `c72b884`: the fall's sill past the cave lip runs down into the land, so no edge hangs at 4006.

The lake and its channel (`src/places/heart/lake/`)
- `085ed9b`: first pass of the crust.
- `6fb85d3`: the channel at the line (3477) has a torn skin, and the lake's seams connect and drift. The even moire stripes of the old crust at 3477 are gone.
- `c72b884`: a faint wet glaze on the feeding floor, far seams thinner.
- `cf245fa`: the recipes of the lake's sheets, for gate G8.

The ground (`src/places/heart/land/`)
- `7cf038f`: first pass of the far walls and the near heap.
- `ba8273d`: finer heap and crag at the line lens, sulphur crumbs, near rock at the sunk view, the butte's head worn round, the thin steam at the vent restored.
- `bf0613d`: the crag's joints show, the rim stands in lengths and notches, a finer slope under the mouth.
- `3c9fb64`: for cost only. Each face of the wall and buttress is sorted at build time into all cliff, all scree or both, and drawn by a material that holds only its half. The picture is the same but for some 70 single pixels a frame (69 at 4006, 57 at 2722, the largest by 14 levels).

The air (`src/places/heart/air/`, `shared/`, and the `look` line of `index.ts`)
- `683f976`: first pass of fume and veil.
- `a6b25ef`: the mouth keeps its dark back at the long lens (the first veil had washed it out at 4217), orange fume east of the butte, fewer steps.
- `ef67dfc`: fume lit from its foot, white steam at the vents, exposure 2.4 and bloom 0.07.
- `3ab5009`: the plume at 2722 in larger lumps that lean east, a clear blue sky west of it, fall smoke in rising streaks, fewer paces in the march.

The walkers and the sunk one (`src/places/heart/walkers/`, `sunk/`)
- `51efd64`: new legs, and a herd of different builds and carriage.
- `6b5354a`: the hero's trunk has a hump and a belly lobe, the sunk one's hull has fallen in between its ribs and flakes, the pair at the fall's foot moves.
- `197238f`: paler ash puffs, a darker contact under each pad, longer flank flaps, cheaper under sheets.
- `4506819`: the recipes of the walkers' sheets, for gate G8.

Gate G8 is green for the Heart, checked at `4506819` and again at `197238f`. The three guard frames (1241, 4409, 7234) were equal byte for byte at every report.

## 2. Still wrong, worst first

1. Frame 3156, the walkers at a seam. The picture `heart-3-crust-walkers-feeding-at-a-seam.jpg` asks for heavy animals whose pads press the crust. The film shows pads that leave no dent, a contact shade that barely reads, puffs of ash that are thin pale columns with no billow, small tatters, and a hero trunk that still reads as modelled. Tried: three trunks (a flat slab with a sawtooth spine, even rib stripes with a thin waist, rags that read as teats) before the one merged; thicker puffs and darker contact discs in the last version, a small gain. The dent was not built, because the crust belongs to the lake's folder and the pads to the walkers'.
2. Frame 3477, the lava surface at the line. The picture `heart-1-the-lava-surface-at-the-line.jpg` asks for ropy and slabby crust of many sizes with a bright channel under a broken skin. The film shows an even fine crumple over the whole lake, flat orange patches at the near bank ringed by red lines, a crag whose edges are ruled, and a crag steam that is a soft blob. M3 at this key was 0.26 at round 28; the lake's builder read about 0.41 after its second version, against a floor of 0.75. Tried: torn skin and connected seams (merged); slabs of clearly different sizes were not built.
3. Frames 4006 and 4214 to 4220, the mouth and its fall. The picture `heart-4-the-vessel-mouth-and-its-lava-fall.jpg` asks for a thick fall that breaks and throws crust. The film shows small plates, none of which tumbles, a thin stream at 4006, and a shelf at the mouth that is a smooth grey block. At draft tier the near lake at 4217 shows straight orange dashes; the builder found the seam is thinner than a pixel row there and is one whole line at hd review. Tried: plates in packs with a rind (merged); tumbling was not built.
4. Frame 2722, the establishing view. The picture `heart-0-establishing.jpg` asks for a billowing plume and a lit rim on the butte. The film shows plume lobes that are soft with no hard billow edge, and no rim light on the mesa. The smoke over the fall drifts more than it rolls and is soft at 4K.
5. Frame 4006, the scree under the mouth is soft at native size, its stones too small. Tried: the shader's pale chips enlarged from 0.34 to 0.85 m; they read as soft pale spots, not stones, and were taken back.
6. Cost. The rule was no more than before. Frame 4010 at uhd draft cost 31.88 and 32.46 s in two runs before, 33.37 s after the first versions, and 32.65 s at `197238f` in one run (land 11.61, crust 8.76, fall 2.44, mouth 1.34, sky 0.71, walkers 0.36 above an empty frame of 5.15). That is 0.2 s above the dearer of the two runs before and 0.8 s above the cheaper: inside the spread of the tool, but not shown to be under. The crust is about 0.5 s over its own figure before, by its builder's measure. The walkers at 3156 cost 0.79 s above an empty frame before and about 1.4 s now, by their builder's measure; the lead did not measure 3156 or 2507 again at the end.

## 3. Held versions

All four were replaced by a later version of the same builder that was merged.
- `agent/p6-heart-life`, `9d09f27` (V1): the hero's trunk was a shallow flat slab with a sawtooth spine and the legs had a red wood grain.
- `agent/p6-heart-life`, `a69485a` (V2): the trunk had even vertical rib stripes and a thin waist.
- `agent/p6-heart-life`, `311558e` (V2b): two rags under the hero read as teats or fingers and the top of the trunk was a pale ash grey.
- `agent/p6-heart-ground`, `4a4e2ca` (V2): a fat grey steam column hid the crag at 3477. The fault was in vent numbers the lead had passed on; `23bdf8d` put back radius 0.22, strength 0.2, rise 3.

One commit went in without a look first: `01579a7` of the life builder arrived between the lead's check and the lead's merge `6b5354a`. It was checked afterwards at 3685 and is level or better.

Tried by a builder and never sent: loose rock of 0.5 to 2.2 m on the slope under the mouth (`land/rocks.ts`, the `sized(0.3, 1.4, 2.4)` line) read well but cost 0.5 s; culled sectors of the land saved nothing.

## 4. What to try next

1. The walkers' weight at 3156: a shallow dent and a dark contact in the crust under each planted pad, drawn by the lake from the pads' places (the two folders must agree on one list of pad positions over time), a puff of ash at each set-down that billows and is large enough to read at 400 px, and a trunk that sags a little as a leg takes load. Judge it on a sheet of consecutive frames, not on a still.
2. The crust at 3477: break the lake into slabs of three clear sizes with the ropy fold only on some of them, and let the channel's skin tear into plates that drift. Break the crag's outline itself: chamfer and offset its corner vertices by the joint cells in `land/fracture.ts`, or stand loose blocks on the crest. Pay for it by drawing the far lake coarser; the land and the crust together are about 20 of the 33 seconds.
3. The fall at 4006 and 4214 to 4220: fewer and larger plates, some of which turn as they drop, a thicker body, and a broken face on the grey shelf. On the slope beside it, try the loose rocks again, fewer and larger; the last land version freed about 0.6 s for them.

## 5. What a newcomer would trip over

- Frames 5725, 8305, 8412, 9221 and 9300 do not repeat byte for byte on `main`. They are not the Heart's and not its guards, but a compare of the whole film will show them.
- The guards for this unit are 1241, 4409 and 7234 at preview draft. The lead's before files lie in `out/work/before/`, which git ignores, so a new machine must render them anew from `origin/main`.
- Since `3c9fb64` a frame of the Heart differs from the same frame one merge earlier in some 70 scattered single pixels. The cause is not proven; the builder suspects ties of equal depth between the sorted faces. The builder's determinism check passes, but a test that pins Heart frames by their bytes needs its numbers pinned anew.
- M3 for the keys heart-1, heart-2 and heart-3 was red before this wave and was not run again by the lead. Its numbers were not pinned anew.
- In the software renderer a branch in a shader saves nothing; every pixel pays both sides. Only a define saves time. The thresholds of `byFace` in `land/index.ts` mirror the `steep` test in `land/shaders.ts` and must move with it. More wall rows cost about 0.02 s each at 4010. The dearest thing left is the cast of the round lights in `shared/glsl`.
- The cost tool sometimes ends with a closed page; run it again. Its figures move by about 0.5 s from run to run and from machine to machine.
- Never build while a render runs. The frames of that render are spoiled and must be thrown away.
- `src/places/heart/index.ts` belongs to nobody but its `look` line, which the air builder may change. `layout.ts` and the cameras were given to nobody and did not change.
- Vent sources are in the ground's folder, the drawing of their steam is in the air's folder. A change of one without the other gave the fat column of the held version. Keep the steam sources at their present values.
- The shelf at the cave mouth is the fall's, not the land's.
- The GitHub login comes and goes on these machines. Reading works; when a push fails, pass the branch as a bundle.
- A builder may push between your check and your merge. Merge the hash you looked at, not the head of the branch.
