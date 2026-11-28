# Blood Marsh: hand-over of the third wave of the wide polish

Unit `marsh`, film frames 5618 to 7014. Five shots: marsh-01 5618 to 5832 (key 5725), marsh-02 5833 to 6047 (key 5940), marsh-03 6048 to 6262 (key 6102, the dome bursts at 6158), marsh-04 6263 to 6585 (key 6424), marsh-05 6586 to 7014 (key 6800). Branch `agent/p8-marsh-polish`, started at `967bb1cb`. The last merge is `2fc4aa6`; this file is the one commit after it.

The lead wrote this and wrote no picture code. Every line was seen in rendered frames held against `references/approved/4-marsh/`, unless it says a builder reported it. The wave began with M3 red at key `marsh-3`, frame 6424 (0.6544 against the floor 0.75). No critic has seen the last state.

## 1. Done

Part by part. The first hash is the builder's commit, the second the merge on `agent/p8-marsh-polish`.

Ground and the dead (`land/`, `dead/`):

- V1 `75dcc32`, merge `60acad3`: dark trodden mud at 6424 in place of the pale smear.
- V2 `e013df9`, merge `2ffa138`: thin plates as relief with wider gaps of slick mud, a film of grey water right of the stuck one at 6800, the wallow as level liquid that mirrors the sky, pits as dark level brine with a wet rim, broken plates lower right of 6424.
- V3 `dfe5c9b`, merge `45dc2ae`: the dead from one Blender sculpt baked to a height and normal sheet (`public/assets/marsh/dead/carcass-nh.jpg`, `carcass-m.jpg`, recipe in `assets-src/marsh/dead/`): salted back, flank fallen in to ribs, torn hide, legs. A swell in the mud as the stuck one heaves, a pale lip and dark undercut on lifted plate edges.
- V4 `11c9383`, merge `2fc4aa6`, merged on a draft look, not measured: salt laid down the steep sides of the dead so the streaks go and the mound at the left of 6800 no longer reads as a row of cut slabs; no puddle beside the dead at 5725; a sheet's level worked out once. The builder found no cost cut.

Brine (`brine/`, `shared/brine-glsl.ts`):

- V1 `dcdb1b0`, merge `78060b9`: dark wine brine with counted ripples; the mosaic on the surface gone.
- V2 `21c994e`, merge `e23e7cd`: the dome tears from one point (lobed hole, rolled rim), strings of beads on thrown paths that part into drops, a column, a low lip; the far ripple patch at 5725 dropped; a soaked dark edge.
- V3 `bf617da` and V4 `e70590b`: not merged, see section 3.

Air and sky (`air/`, `shared/`):

- V1 `209ee5a`, merge `8ef682b`: near air cleared at 6424 (this alone took M3 at 6424 from 0.6544 to 0.7726).
- V2 `aaba9bd`, merge `10e9fac`: banks of vapour as bodies behind the subject of each shot in place of ground mist, the rain as a veil under a dark belly in the sky, softer horizon and far plants at 6800 and 6424.
- V3 `48eeb87`, merge `9f5acf1`: near banks keep tops and undersides, the dark band over the horizon at 6800 gone, veil trails broad and uneven, masses in the sky.
- V4 `6ac1ac2`, merge `79d260d`, merged on a draft look, not measured: in marsh-01 only, banks thinned and begun at 120 to 500 m, far air cooled, a faint strata shade on the far flats of 5725.

Stalks and insects (`stalks/`):

- V2 `fd262d0`, merge `3650fe8` (it holds V1 `d6f9e37`, which was held for cost alone and then fitted by not drawing far heads and stems outside each shot's wedge): thick pale ringed trunks under drooping red heads in clumps at 5725, 6102, 5940; insects of marsh-02 as an instanced mesh with segmented body, legs, tails and veined wings, no eyes.
- V3 `ea2db7a` and V4 `ee5787b`: not merged, see section 3.

Wallowers and fliers (`wallowers/`, `fliers/`, `shared/anchors.ts` for `BEASTS` only):

- V1 `78b2c5c`, merge `533d74b`: the wallow sheet as churned wet mud (`mire.ts`, `slick.ts`), 2.56 MB of churn tiles.
- V2 `0867585`, merge `5d4602f`: hides dark grey brown with a rust stain low and salt dust, clods slumped, feelers thick and tapered with tips sunk, rings at planted legs, the sheet's far mesh beyond 24 m (cost). Motion: rung 3, step 1 of the fallback chain of `kit/03-METHOD.md` section 5 kept at the first try: nobody walks, feet planted, heads at the mud, the great one lifts late.
- V3 `f5e5223`, merge `a374945`: the stain as narrow runs from a broken line, strings under the belly, breath and sway enlarged, the great one lifted to the knee, the herd at 5725 and the far ones at 6800 standing to the shin (`sink` in `BEASTS`).
- V4 `53bba3f`, merge `5c5e1ba`, merged on a draft look, not measured: hide warmer, folds and tile contrast softer, feelers brown, the young one paler, a wet mud sleeve at the stuck one's leg root that covers the streak fan (hidden, not mended).

Numbers at the last merge:

- Cost, s for one sample of uhd draft, lead's machine, frames 5725 / 5618 / 6800. Before (`967bb1cb`, at the start): 17.09 / 16.35 / 19.46. Cap, 5 percent over: 17.94 / 17.17 / 20.43. At `45dc2ae`: 17.93 / 16.75 / 20.19. Back to back from minute 217 to 232: 5725, three runs: `967bb1cb` 17.26, `2fc4aa6` 17.90. 6800, two runs: `5c5e1ba` 21.00, `2fc4aa6` 20.96, `967bb1cb` 19.94. So 6800 reads over the fixed cap at the last merge; the ground V4 added nothing there, the rise came between `45dc2ae` and `5c5e1ba` (the life V4, or the machine: the start itself reads 2.5 percent slower than it did, and against that reading the last merge stands at 5.1 percent). 5618 was not measured after `45dc2ae`.
- Size: 2.96 MB added of 12 (start 112,544,617 bytes, 115,503,146 at `45dc2ae`; the ground V4 reports plus 0.39 MB over its start, not weighed by the lead).
- Measures (final uhd, floor 0.75), all green: at `45dc2ae` 6424 M3 1.9415, 5725 M3 1.1255, 6800 M3 1.2646; at `3650fe8` 5940 M3 1.178, 6102 M3 2.1967. Not measured after `45dc2ae`.
- Proofs at `45dc2ae`: guard frames 1241, 4409, 7234 byte equal to the start; three draws of 6424 equal; invalid at 5725: 0; G8 pass; no file outside the unit. Not rerun after; the three merges after touch `air/volume.ts`, three files of `wallowers/`, `dead/index.ts`, `land/field.ts` and `land/shaders.ts` only.

## 2. Still wrong, worst first

1. The wallowers close up (6424, all of marsh-04). The hide is grey and hard creased where `marsh-3-mud-wallowers.jpg` is brown, soft and wet; the legs are stumps and the young one's foreleg has no form; four feelers show where the picture has ten spread in the mud; the bank face under them is streaked, with a notched shelf. The motion is step 1 of the fallback chain: in place only. Breath and sway were enlarged in V3 but were judged on small frames, never on a full-size sheet.
2. The far shore at 6102 and 5940, and the layout of the wide. The backdrop is a dense pale grove along the whole far shore and reads as palms (pointed straps for heads; the held `ee5787b` turns them to red sprays, by the builder's picture); the picture has a few red crowned trunks sinking into fog. M3 at 6102 stands at 2.2 of the picture, which says the frame is far crisper than the picture. The nine layout issues of the critic of likeness at 5725 were left for a wave of their own, as told.
3. The ground from above and the dead (6620, 5725, 6800). Plates are still pale polygon tiles, the lip is thin from above, the left of 6800 is blotchy. The dead are fallen bodies now, but their steep sides are streaked (a height sheet on a plane) and they are very white. The last merge `2fc4aa6` laid salt down the steep sides and took the red puddle at 5725 out, seen at draft only.
4. The burst (6158 to 6190). It tears from one point and throws strings now, but the strings are glossy worms of even width, the column is a stake at 6186 (the held `e70590b` tapers and darkens it), the last of the skin at 6162 is a dark wire round a flat band, there is no bubbly foam. The feelers at 6424 are not mirrored in the wallow.
5. The air. Banks are level strata with fine level lines, not rounded crowns; the far flats at 5725 are too pale; the veil is soft and may read weak; the sky at 5940 is nearly flat.
6. The stuck one of marsh-05: stretched streaks under its chest as it rears (6860 to 6900, the Beast body); the swell in the mud is faint.
7. Small things: bare white posts at the right of 6424 and 6800; the insects of marsh-02 read as white moths with stiff wings; the fliers were not touched and are still birds.

## 3. Versions held back

All wait on their own branches. None was held for its picture.

- Brine V4, `agent/p8-marsh-brine` at `e70590b` (it replaces V3 `bf617da`, held at report 3 for cost): only drops in the air are drawn, the second wake read removed, the jet lower, tapered, dark wine with lumps on its skin, a froth ring. Seen by the lead at draft 6186: nearer than the stake, skin still smooth. Held for cost: on `2fc4aa6` it read 18.22 at 5725 against the cap 17.94 (three runs, `2fc4aa6` itself 17.90); the builder's own pair says it is cheaper than `45dc2ae` at 5725 and plus 0.07 s at 5618.
- Growth V4, `agent/p8-marsh-growth` at `ee5787b` (it replaces V3 `ea2db7a`, held for cost): far heads as red sprays off the tip at 6102, 5940, 6800, insect wings without glare. Arrived at minute 220; the lead saw the builder's pictures only. Held for cost not cleared: the builder reads 5725 level, 5618 and 6800 1 to 3 percent over. Sent to `/root` as `OVER CAP marsh` at minute 223.
- Growth V1 `d6f9e37` was held for cost alone and came in fitted inside `fd262d0`.

To take one in: merge it alone onto `agent/p8-marsh-polish`, read 5725, 5618 and 6800 three times each back to back with `967bb1cb`, and merge only under the cap. `/root` ruled at minute 212 that the cap is not raised.

## 4. What to try next for the worst three

1. Wallowers. Hide: lower the crease frequency and depth, brown the base, lay mud in the creases by a noise that follows the folds, and wet the lower third with a broad soft sheen (one hard glint reads as plastic). Legs: give each a knee, a column and a pushed-up collar of mud in `mire.ts`. Feelers: ten, spread flat on the mud with tips sunk. Motion: keep step 1; make it read by a shift of weight from leg to leg, a head that roots and pushes mud, drips from the belly strings, and judge it on a sheet of hd frames at full size. Do not go back to a walk in a polish wave.
2. Far shore. At 6102 cut the far trunks to about a third, keep the heads red, and make them soft hanging mops with blunt ends in place of pointed straps; let the far ones sink into the banks by distance. Do not add vapour or blur at 6102. Watch M3 at 6102 fall toward 1 as a sign, not as a goal. The layout of the wide needs one session with `/root`'s leave and re-approved cameras; do not start it piece by piece.
3. Ground and the dead. First take cost out at 6800 and 5725 (the ground builder looked for a cut in its last hour and found none: working the swell out within 5 m only gained nothing, leaving close work out of the program in marsh-01 was dearer). Then the dead: cap the slope of the height sheet or give the steep sides their own strip of geometry so the texture does not stretch, and grey the salt. Plates from above: draw the lip in the fragment from `ep` twice as wide when the lens is high, tilt each plate a little, and let brine stand in the lowest gaps.

## 5. What a newcomer would trip over

- The wallowers do not walk. That is step 1 of the fallback chain and it was kept on purpose; `/root` marks `marsh/wallowers` `fallback`. `speed` in `BEASTS` is still there and is not a walk.
- The unit stands at its cost cap. At `45dc2ae` one sample of uhd draft took 17.93 s at 5725 against a cap of 17.94. Two runs of the same tree differ by 0.2 to 0.3 s on the lead's machine and builders' machines read up to 1 s apart, so only pairs taken back to back on one machine count. Every merge of this wave added a little; the next change that draws more must first take cost out.
- Draft stills speckle the sky and the banks in level patches (6800, 5940). At hd review the speckle is gone. Judge air at hd review, never at draft preview.
- The stuck one at 6800 is in `dead/` but is built from life's `Beast`: the stretched streaks under its chest as it rears (6860 to 6900) are the Beast body, not the ground's sculpt.
- The dead are a height sheet on a plane, so steep sides stretch into streaks. More height makes it worse.
- `shared/anchors.ts` is the sky builder's file except `BEASTS`, which is life's. `shared/brine-glsl.ts` is the brine's alone. `src/places/marsh/index.ts` was given to no one and no camera was changed.
- The place has no wind (`kit/02-SUBJECT.md`): no gusts on stalks, the veil hangs and falls, steam drifts slowly. Stalks must not read as palms; the far heads at 6102 and 5940 still do.
- White V flecks on the brine at 6800 and 5725 were the brine's carried scum strings (the brine builder reports them removed in `bf617da`, which is held back); the white specks on the mud are no builder's by their own word and were not traced.
- Shader rule for every part (G10): no derivative and no implicit mipmapped read under a per-pixel branch or after a discard; every read in a branch is `textureLod`.
- `slick.ts` writes negative colour into the brine's mirror pass; it is held by clamps in `brineMirror`, `mirrorAt` and at the end of `slick.ts` and both body fragments. Remove one and one-pixel specks appear at 6424.
- The air is laid over the frame by depth: anything transparent that writes no depth takes the haze of what lies behind it.
- `GRADE_SHOTS`, `BOUNCE_SHOTS`, `DUSK_SHOTS`, `SWALLOW`, `SEEP_SHOT` switch on `uTime` at a shot's first frame: a recut moves them. No more vapour or blur at 6102.
- Stalks: both band loops draw from the one stream `stalks-band`; a new name or one more draw moves every stalk at 6102 and 5725. Judge far heads at hd, never at preview.
- The measure reads fine detail against the approved picture; every key is far above the floor now (6102 at 2.2), which says the frames are crisper than the pictures, not that they are right. The picture leads, not the number.
- The cost tool died once with "Target page, context or browser has been closed" when another node process ran beside it. Run nothing beside a cost or a measure.
- Empty a try folder before a new version goes into it, and keep the frames of each merged state under its hash: they are the before of the next look.
