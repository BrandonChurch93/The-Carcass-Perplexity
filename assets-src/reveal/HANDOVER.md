# Hand-over of the Reveal (unit `reveal`, film frames 9541 to 11860)

Written by the lead of the unit at the end of the wide polish. Branch `agent/p6-reveal-polish`. Keys: reveal-1 at 9627, reveal-2 at 9675, reveal-3 at 9756, reveal-4 (the titan frame) at 10027; the ending runs 10881 to 11743. Approved pictures: `references/approved/7-reveal/`.

## 1. Done, part by part

Sky (`src/places/reveal/sky/`, `src/places/reveal/shared/`):
- V1b `9c687f0`: both cloud decks take their density from the cloud photographs through Beer's law and are lit by their own relief.
- V2 `a1d752c`: a fine field of popcorn cumulus gathered in flows, a softer and brighter ice, the lake kept clear.
- V3 `2e4ae27`: weather travels while the frame is held (10027 to 11743), night staged for the body, banks only where land stands up the wind.
- V4c, merged as `c8e1c42`: ice gate of crossing swells, sky open over the sun's image, the low field turned round the cyclone, early outs for cost. The cyclone itself is as before.
- V6, merged as `5a71997`: the sea field in bent flows with open sea between, the limb one crisp blue line as in reveal-4, banks as knots, recipe for `sky/banks.png`.
- V7, merged as `8626259`: the field is knots of popcorn grain in its flows, not dashes stretched at one angle; banks one body in the core.

Land (`src/places/reveal/land/`, `continent.json`, maps):
- V1 `609f827`: baked shore distance, horizon angle and open sky; a coast line, a shelf, rivers by drainage that carry silt, cast shadow; no coast line by night.
- V2, merged as `f4ad003`: dark scalloped lakes, the strait as drowned valleys, deltas, islands round the skull, cheaper at 9541; the land follows `startOffsetAt(frame)`.
- V4 `b45daec`, merged as `ffdce8f`: throat mouths with lip, stepped wall and floor (they were flat black blots), tile relief marched below 150 km, a smooth glint from orbit, the strait by height, salt toned, a softer and shallower thrown shadow below orbit, river banks that fade over a texel of the bake, and the recipes of the eight `light` and `shore` maps (G8 green). The rib burial is in the code and off (`RIB_BURIAL = 0.0`). `45b6f22` adds the builder's own list of open items to `ROWS-reveal_land_builder.md`.

Climb and join (`src/places/reveal/join/`, `handoff.json`, `rise.json`, and in the Eye only `src/places/eye/handoff.json` and `src/places/eye/flight.ts`):
- V1c, merged as `508e5eb`: the Eye climbs straight up over its lake, and the Eye and the rise draw one bank of cloud over the lake with one function from one set of numbers, so 9540 to 9541 is a join where there was an empty cloud frame. Through the gap only deep water shows on both sides.
- V3, merged as `8b8da28`: grain on the bank tops, the gap opens at one steady rate (banks leave 9544 to 9592, lake clear at 9596), and the grey pane, brown blob and ruled lines at 9563 are gone at the final tier.

## 2. Still wrong, worst first

1. Frames 9700 to 9900 (9705, 9751, 9797): the ribs read as a ribcage, even and parallel, and the skull with its sockets is plain from 9700. Brandon's note 10 asks: "It should read as a continent first: mountain ranges, coasts, rivers, cloud at several heights, real scale" and "The body should only come together near the top of the rise." Tried: land V3 buried the ribs below about 9900 in olive country. It fell short twice: 9756 became a flat olive wash with a seam at the neck, away from reveal-3, and the ribs switched on in one second (9864 to 9892), a dissolve in place. A second try (crests broken by a threshold rising with height, full relief) was built by the land builder and never checked in motion; it is described in `ROWS-reveal_land_builder.md`.
2. Frames 9502 to 9600, the join: the banks of cloud are not footage. At 9541 the grain reads as veins and is soft at native size; from 9552 to 9568 streaks radiate from the rim and the gap follows the lake's outline, so the opening reads as an iris; at 9560 a small bluish pane with a stepped edge stands right of the lake at the draft tier; the entry 9504 to 9514 is big soft masses. Nothing approved exists for these frames; the bar is footage of a climb through a broken deck. Tried: V1c (airbrushed banks, a pane, a blob and ruled lines at 9563, real at the final tier), V3 (merged, cured 9563), V4 (held, see below).
3. Cloud from orbit, 10027 to 11743: the cyclone is five even brushed arms with no grain (hold it against the storm in reveal-4); the knots of the sea field are greyer and blobbier than reveal-4's specks, with few fine wisps; the bank on the collar at 10027 is a bright patch; puffs at 9675 have cut edges; night cloud after 11300 is grey flakes. Tried: a cyclone as a decal (V4) and as a rosette (V4b), both held; a third try lacked grain and was reverted by the builder.
4. Land, all keys: every ridge carries one cream comb at one scale; rivers are even ribbons; the lake at 9627 has no foam edge; the shade at 9756 is a little flatter than reveal-3 since land V4's softer shadow.
5. A straight seam in the sea west of the land in the hold frames, reported by the sky builder as absent in cloud alone; not looked into.

## 3. Held versions (made, not merged)

- Sky V1 `aa2b1b2` on `agent/p6-reveal-sky`: grey flakes of cloud at 11300, the ice cut off at a threshold, hard clusters. V1b answered it.
- Sky V4 `e98e20b`: the cyclone read as a decal laid on the sea, and a stair-stepped notch stood in the ice at 10027.
- Sky V4b `b74f76d`: the cyclone was a rosette of even arms.
- Sky V5 `c0415a3`: haze pooled over low ground read as grey smears on glass over coast and sea and flattened the ribs at 10027; the limb in three layers was wider and paler than reveal-4's crisp blue line.
- Climb V1 `389b996` on `agent/p6-reveal-climb`: 9540 and 9541 differed to the eye (mean absolute difference 6.0 5.2 4.5 on 8 bits): a cut, not a join.
- Climb V1b `9937e5c`: the join held, but the banks dissolved in place over the lake 9597 to 9624 and frame 9336 of the Eye changed.
- Climb V4 `9dfaf48` on `agent/p6-reveal-climb` (only `join/lid.ts` differs from V3): the pane and iris at 9560 are cured (haze sheet and water veil gone by 9551 and 9557, the rim bends in lobes), but at 9541 the banks read as combed cream on a plaster crater, a solid model, and the mean absolute difference from frame to frame grew to 5.88 4.86 3.75 at 9540 to 9541 and the same on either side (5.99, 5.71) against 3.4 in V3: not a step at the cut but the relief grain changing in every frame, a shimmer risk. Also open in it: a grey collar with faint arcs at 9508 to 9520, and the lid's cost at 9541 (0.8 to 1.0 s, not proven under 1.0). Its fallback without the last step, `46a157a`, arrived too late to be checked.
- Land V3 `c8df8d5` on `agent/p6-reveal-land`: the rib burial (flat olive wash at 9756, seam at the neck, a one second dissolve 9864 to 9892) and ochre threads in the lake at 9627 that read as scratches, away from reveal-1. V4 is V3 with both off.

## 4. What to try next, for the worst three

1. Ribs as a ribcage from 9700: do not change the land with the camera's height unless the change is too slow to see (spread over all of 9700 to 10027) and the buried spans keep full relief and contrast. Better: change the land once, for every height. Break the crests, vary length and spacing of the ranges, clothe the lower flanks, and let cloud banks and their shadows lie across two or three ribs during 9700 to 9900 so the comb is interrupted; the sky already places banks where land stands up the wind. Check with a sheet 9700 to 10027 in steps of 10, and hold 10027 against reveal-4.
2. The join: start from climb V4's cure of the pane and the lobed rim (`9dfaf48`, `join/lid.ts`), with V3's soft shading in place of the relief lit from the sun side. Give the banks the sky's cloud photographs (`sky/` knots and veil) instead of a noise grain, and judge 9541, 9560 and 9572 at hd review and at the final tier. Any change here changes the join's numbers and the proposed test.
3. Cyclone: it returns only with popcorn grain in its bands, built from the same photographs as the field, with ragged outer arms and gaps; compare at 10027 hd against reveal-4 at native size, and against the hold sheet 10027 to 11743 for a turn that does not slide.

## 5. What a newcomer would trip over

- `tests/rise-core.test.ts`, the test 'starts with nothing in frame but the deep water and the rings' (line 136), is red on this branch by design: the join no longer shows rings. Its replacement is `assets-src/reveal/proposed/rise-core-join.test.ts`; copied into `tests/` its imports turn from `../../../src/` to `../src/`. If the join or any number in `handoff.json` changes, that test changes in the same commit.
- `src/places/eye/handoff.json` and `src/places/reveal/handoff.json` must stay equal, key for key; the proposed test asserts it. Nothing else in the Eye's folder belongs to this unit. Frames of the Eye up to 9336 must not change.
- Frames of the Eye do not repeat byte for byte from one render to the next (5725, 8305, 8412, 8600, 8761, 9003, 9221, 9300 measured). Use 1241, 4409 and 7234 as guard frames; they were byte for byte equal at every report of this wave.
- The join's mean absolute difference between 9540 and 9541 at the draft tier is 3.35 2.79 2.19 since climb V3, as large as the steps beside it (3.44 and 3.18), because the grain of the banks moves with the climb. Pin numbers anew after any change to the lid.
- `startOffsetAt(frame)` in `shared/anchors.ts` reads `startOffsetKm` from `rise.json` (full at 9541, zero by 9627); land and join both follow it. The camera path after 10028 is not to be moved; re-centring or pulling back the titan frame was declined.
- `lakeShorePx` and `lakeDeepPx` are the join's contract with the land; the land reads `cloudShade` only from 60 km up.
- Maps not computed in the build are recorded in `assets-src/reveal/ROWS-<builder>.md` and need a `## ` heading with the full path in a `RECIPE.md` under `assets-src/reveal/` or G8 goes red.
- Cost limits (uhd draft, seconds a sample, 30 percent over the numbers before the wave): 10027 13.5, 9541 15.6, 9756 15.1.
- Declined on purpose, do not reopen without Brandon: softening the white ovals of the spine or the red-veined pelvis; "reads as a skeleton" at the top is his choice.
- Pushing: logins come and go on the machines. A bundle (`git bundle create <file> origin/main..HEAD`) is the fallback.

## State at the close

- Head of `agent/p6-reveal-polish` at the last picture change: `ffdce8f`; the commits after it are text only (the land builder's rows file and this file).
- Guard frames 1241, 4409 and 7234: byte for byte equal with the files rendered from origin/main before the wave.
- G8, G12 and G15 pass. Unit tests: 939, one red, the test named in section 5. The proposed join test passes when copied into `tests/`.
- Cost (uhd draft, seconds a sample, before the wave and now): 10027 10.41 and 11.53, 11.38; 9541 12.0 and 12.81, 12.89; 9756 11.59 and 12.71.
- Two early merge commits of the lead carry no trailer line; they were pushed before the rule came and were left as they are.
