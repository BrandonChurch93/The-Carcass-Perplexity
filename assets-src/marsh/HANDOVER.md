# Blood Marsh: hand-over of the second wave of the wide polish

Unit `marsh`, film frames 5618 to 7014. Five shots: marsh-01 5618 to 5832 (key 5725), marsh-02 5833 to 6047 (key 5940), marsh-03 6048 to 6262 (key 6102, the dome bursts at 6158), marsh-04 6263 to 6585 (key 6424), marsh-05 6586 to 7014 (key 6800). Branch `agent/p7-marsh-polish`, started at `4e84d7b5`; `origin/main` is `9e217b12`. The last merge is `35cf7ff`; this file is the one commit after it.

The lead wrote this and wrote no picture code. Every line was seen in rendered frames held against `references/approved/4-marsh/`, unless it says a builder reported it. Round 29 stood at R1 5, R3 4, R4 5 (bar 9) and 5 of 25 jury votes when the wave began; no critic has seen the last state.

## 1. Done

Part by part. The first hash is the builder's commit, the second the merge on `agent/p7-marsh-polish`.

G10 (two results at frame 5930): the cause was a derivative and implicit mipmapped reads under per-pixel branches in `brine/shaders.ts` (`brineShade`) with the ground's `fieldAt`. Cure brine `f1d8718` over ground `3a28ee5`, merge `435022a`, in main as `9e217b12`. On the test machine (browser 147.0.7727.15) every merged state tested since gave 1 result twice in a row; the last merge `35cf7ff` did so as lead-11 (all 12 draws byte equal). `31b1409` and `25fbf9e` were not tested on their own; both are inside `35cf7ff`.

Ground and the dead (`land/`, `dead/`):

- V1 `f20f143`, merge `26fccc2`: grey beige crust in place of white, trodden mud.
- Cost `f4cb9e9`, merge `47ba70b`: field and land reads by one level, `textureLod`.
- V2 `dfffb27`, merge `62a2b41`: the rock rise from one baked sheet, thin crust plates.
- V3 `e0dd539`, merge `da6b799`: 6102 bank as a cream salt ridge on the lip over dark red mud, narrower plate cracks, softer mound.
- V4 `19843a7`, merge `046bae8`: plates without mesh teeth or extruded sides, grey mud in the gaps, small pools in the 6102 bank mud.

Brine (`brine/`, `shared/brine-glsl.ts`):

- V1 `9cb5d6d`, merge `26fccc2`: the dome as a red film, not a milky cap.
- `4543ce9`, merge `12a3dbc`: pool slope field and reflections; the cure's reads taken once at the top (cost of the cure cut back).
- V2 `cdf60dc`, merge `e9a5921`: mirror throw by height, glints, lobed burst wall.
- V3 `dfb3ddd`, merge `d75eed3`: rings at domes, wet lip at stalks, thin torn skin, mirror read clamped (the black specks at 6424).
- V4 `eeb6cf1`, merge `116f2ff`: sheen by lens height, froth line and meniscus at a dome's foot, late drops off the burst crown.
- V5 `57f9572`, merge `31b1409`: the dome skin writes depth, so the air lies on it; cap and wall are one body at 6157.

Air and sky (`air/`, `shared/`):

- V1 `1d802a2`, merge `915c40c`: one soft curtain, steam wall gone, air by height.
- V2 `f566337`, merge `3d3fb82`: far air in stretches, a curtain that falls, grade per shot, thin seep wisp.
- V3 `962eb41`, merge `cc996b4`: far air banks, hills at the picture's height, warm haze behind the animals.
- V4 `adecf26`, merge `ce27c9b`: curtain top torn into the cloud, ground bounce for the low lenses, wisp in strands.

Stalks (`stalks/`):

- V1b `521e9a4`, merge `d4d6594`: plume locks, crust trunks with ridge, seam and rust; far stands no longer palms.
- V2b `96b9587`, merge `68c0138`: heads as one tip spray on far and mid stalks, a staged band at 6102, sway per strap.
- V4 `b420dd4`, merge `35cf7ff`: the 5725 stand tall again and thinned to a third, the far shore band kept for 6102, the thicket with lone stalks, far heads that rise and hang by their ends.

Wallowers and fliers (`wallowers/`, `fliers/`, `index.ts`):

- V1b `520588e`, merge `b27386e`: bodies built from the spine, a liquid mud sheet at the legs (`mire.ts`).
- V4 `af48152`, merge `25fbf9e`: olive hide with a rust mud coat running up in strands, long mud fingers on the great one, the lying one wet with mud to its back, the stuck one at 6800 with its head up and a fan, the mirror clamp at the bodies.

Numbers at the last merge:

- Guard frames of other units at `35cf7ff`, draft preview, against the files rendered from `origin/main` at the start: 1241 byte equal, 4409 byte equal, 7234 byte equal.
- Files changed against `origin/main`: only under `src/places/marsh/`, `public/assets/marsh/` and `assets-src/marsh/`.
- G8 passes at `35cf7ff`.
- Cost of one sample, uhd draft, seconds, before and now (cap 11 percent over before): 5725 21.44 and 22.64 (up 5.6 percent); 5618 19.03 and 20.02 (up 5.2 percent); 6800 27.19 and 27.88 (up 2.5 percent).
- Keys against the approved pictures since the wave began: 5725 nearer, 6102 nearer, 5940 same, 6424 nearer, 6800 nearer. M3 at 6102 was 0.78 in round 29 (floor 0.75) and was not measured at the last merge.

## 2. Still wrong, worst first

1. The wallowers close up (6424, all of marsh-04; R1 lines 48, 52 to 55, 102, 121). The coat is now the picture's colour, but the strands read as stripes on the great one and the young; the fingers hang as a straight bunch of six where the picture has ten spread in the mud; no leg pushes mud aside, nothing drips, the mud sheet's edge toward the brine is straight. The lens was not moved back: the restage (`RESTAGED` in `wallowers/restage.ts`, off) was rendered and refused, because at 3.4 m further and fov 20 the animal fills the frame as before and the pool is lost.
2. The layout of the wide (R1 lines 21 to 26, 50, 51, 54). 5725 has one channel, a pool and a central stand where `marsh-0-establishing.jpg` has many red channels and mounds to the horizon; the far flats are plain salt (the sky builder found the picture's bands are ground, not air). Not attempted: it moves the channel course, the vent pool rim, the central stand, the herd and the cameras of 5725, 6424 and 6800, about six hours.
3. The ground close up at 6800 and 5725 (lines 49, 73, 97). The plates lost their teeth and sides in V4 but are now pale soft patches with no lip, undercut, tilt or sag; the gap mud is streaked like a stretched texture at full size; the dead are untouched since the first wave; the near mound is lumpy.
4. The dome and the pool. The burst bowl is smooth, the torn edge is a hard dark arc at 6162 to 6166, a faint horizon shows through the dome. No rain rings on the pool (the place's rain falls 1800 m off). The pool at 6309 and 6561 has no wet darkening or disturbance at the legs (film critic R5): the legs stand on life's mud sheet, so the brine's contact map is empty there.
5. The plants. Far tufts are pointed straps, not soft mops; trunk rings are regular; the same few head forms repeat at 5940.
6. The curtain at 5618 to 5623 still shows as a comb of strands (film critic R4); the fliers are still birds.
7. Compression critic R7 at 6128 to 6187: the dark red under the dome got a froth ring and the dome's reflection, the left mid-distance ripple lines were not touched. Not measured again.

## 3. Versions held back

- Growth V1 `3350362`: trunks as white plaster. Growth V2 `b26c14e`: the 5725 stand one red thicket, cost up 4.5 percent (replaced by `96b9587`). Growth V3 `8a7651c`: the 5725 stand a low pale scrub; its 6102 far band and 5940 variety were better.
- Life V1 `433296a`: orange coat. Life V2 `0bb8f82`: about 100 black one-pixel specks by the lying one, a black muzzle. Life V3 `de2ff46`: two pale stubs on the lying one's muzzle read as eyes at 6498, a dipped salmon coat with a hard band. Life V3b `96e5f60`: the lying one cream with tiger stripes and two hooks (cured in `af48152`).
- Sky V1 `487ad7b`: a white wedge at 5725. Sky V2 `8aec8af`: 6102 vapour milky.
- Ground `4041006`: the 6102 bank white as a flat hard-edged mask (replaced by `e0dd539`).

## 4. What to try next for the worst three

1. Wallowers: break the strands by a noise that follows the hide's folds (mud lies in the creases, not in lines), spread the ten fingers flat on the mud with their tips sunk, and give each standing leg a pushed-up collar and a wet dark ring in `mire.ts`; then give the mud sheet a ragged edge toward the brine. If stripes remain at 6424, cut strand height by half before anything else.
2. Layout: restage the wide in one session with `/root`'s leave: several narrower channels and low mounds to the horizon in `land/`, cameras of 5725, 6424 and 6800 re-approved against the pictures. Do not start it in a polish wave.
3. Plates: draw the edge in the fragment from `ep` (never move vertices onto it again): a lifted lip with a thin dark undercut, a slight tilt per plate, and standing brine that mirrors the sky in the lowest gaps; replace the stretched gap mud by the trodden mud's tile at its own scale.

## 5. What a newcomer would trip over

- Shader rule for every part (G10): no derivative and no implicit mipmapped read under a per-pixel branch or after a discard. Set `fieldDx`, `fieldDy` (and `pxDome`) in the first lines of `main`; every read in a branch is `textureLod`. A repeat test counts only on browser 147.0.7727.15; the lead's machine has 159.
- The great wallower's body (`wallowers/slick.ts`) writes negative colour into the brine's mirror pass; the cause is not found. It is held by clamps in `brineMirror`, `mirrorAt` and at the end of `slick.ts` and both body fragments. Remove one and one-pixel specks appear at 6424.
- The air is laid over the frame by depth. Anything transparent that writes no depth takes the haze of what lies behind it; the dome skin is therefore drawn three times (through, lit, depth only). Anything transparent drawn after the brine and behind a dome is now cut by its depth.
- Wallower legs stand on life's mud sheet (`mire.ts`), not on the brine: leg contact is life's to build. The stuck one in `dead/` is built from the same Beast, so a change to the feeler shaders moves 6800.
- `GRADE_SHOTS`, `BOUNCE_SHOTS`, `DUSK_SHOTS`, `SWALLOW`, `SEEP_SHOT` switch on `uTime` at a shot's first frame: a recut moves them. 6102 p5 must stay at most 70, and its M3 stood at 0.78 against a floor of 0.75: do not lay more vapour or blur on that frame.
- `tNoise` is a 64 cube tile: a field read along the horizon must slide through the tile's depth or the curtain is a comb. Far air lod comes from distance, never from the frame's size.
- Stalks: both band loops draw from the one stream `stalks-band`; a new name or one more draw moves every stalk at 6102 and 5725. The 6102 pool is about 20 m long and a clump cast in it is culled. Judge far heads at hd, never at preview.
- Ground: plate teeth came from moving vertices onto the edge in `reliefAt`. Red in the crust's gaps is the land shader's own flood level, not the brine. The 6102 bank lies in the trodden zone; `bankKept` and `bankFar` keep it only before the third lens.
- Brine: the sheen is scaled by lens height on purpose (oxblood from above at 6102, sky at stalk height at 5940): retune both frames together. Do not raise the boil above `min(boil*0.8, 0.45)`. No backticks in GLSL comments.
- The lead's try folder kept frames of an older version under the same name and one was judged as new (ground V4, held wrongly for a few minutes, then merged). Empty a try folder before a new version goes into it, and never start a second try while one renders.
- Push to origin failed for about twelve minutes around 03:50 UTC ("could not read Username"); bundles to `/root` are the agreed way if it happens again.
