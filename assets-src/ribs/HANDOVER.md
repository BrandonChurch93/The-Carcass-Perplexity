# Hand-over of the Ribs (unit `ribs`, film frames 0 to 2506, the opening and the card loop)

Written by the lead of the wide polish, wave p7 (second wave). Branch `agent/p7-ribs-polish`, last commit of picture work 90ddcb6, forked from `origin/main` 6e539cf. Builders' branches: `agent/p7-ribs-ground`, `-sea`, `-sky`, `-life`, `-opening`. Everything below was looked at in rendered frames beside `references/approved/1-ribs/`. Keys: ribs-0 is frame 1241, ribs-1 is 2081, ribs-2 is 1759, ribs-3 is 1546, ribs-4 is 2401.

State of the checks at the last commit: guard frames 4409 and 7234 byte for byte equal to the before files; G8 passes; nothing outside `src/places/ribs/`, `public/assets/ribs/`, `assets-src/ribs/` changed; loop frame 0 equals frame 480 byte for byte. The full G14 passed on the opening builder's machine at ca65422 (seam 1.75, largest elsewhere 2.32) and again on the opening builder's head 2dfd08e, which holds opening V4 (seam 1.57 levels, largest elsewhere 2.05). It was NOT run in full on the last commit, which also holds ground V5, sea V4, sky V4 and life V4: run `npm run -s gate -- --phase 5 --only G14` (about 30 minutes) before anything is built on this branch.

Cost, uhd draft, `--parts none --runs 2`, seconds a sample on the lead's machine, before to now: frame 1241 12.68 to 13.08 (limit 15.1); frame 0 13.29 to 14.67 (limit 15.8); frame 1546 13.66 to 13.79 (limit 16.3); frame 2081 18.49 on main, 19.4 to 20.0 with ground V5 (limit 22.0).

## 1. Done, part by part

Ground (`land/`, `drowned/`, `layout.ts`; one function `bedFine` in `shared/glsl.ts` by leave):
- cb8fa1c (merge 012992b): the great blades are clean tapering sweeps again with fine relief on the surface; the crag is laid in beds with lichen in patches, not stripes.
- 80f6cb6 (merge 27dbf17): no `normalize` of a zero vector at a blade's tip. This was the white disc and its strobe. Checked on consecutive frames 2083 to 2091 and at 2250.
- c3f756c (merge 7493cc1): the blades' stone lies in the world in level beds, L1 in the same stone, skirts on blocks on every blade but OR.
- fda6b6d (merge 2afdc81): the floor's wet map is free of the lens, `bedFine` is pinned, the hung weed at 2081 is narrow olive fronds.
- 177c8ca (merge 1b1099f): silt and wrack on the floor at 1241, blade edges broken in small steps, the weed wall's hems near the lens olive and gold.

Sea (`sea/`):
- 571edd9 (merge 748acff): the open sea lifted from near black to slate green at frames 120 and 600, foam lit by its height.
- d865319 (merge 48a16b4): sea and flat mirror the rig's sky (`skyMirror`), the flat is rippled silver, rings and a meniscus stand at every foot, the bore's cards are opaque clots.
- 9288347 (merge d91b9b8): the bore at 2401 has no ruled strips, the spindrift cards at frame 0 are smaller, a swash runs at 770 to 790, the veil at 1759 is thinner.

Sky and light (`air/`, `shared/` but not `opening.ts` and `looptext.ts`):
- 24bc9b5 (merge cc50a70): a new dome in slate blue with white heads, the air in two layers, an ivory sun.
- a5ae51f (merge 9432497): the blades' heads take the low sun, a floor light under every shade, mist banks worked by gusts.
- 29ad9eb (merge a53aa41): the dome's white shut to a torn break, scud, the colony's sky light halved, `storm.jpg` removed.
- 68ef602 (merge a8f23cd): the storm heads take sun so L1 is lit warm on slate from frame 0, the water mirrors the break wider (1759 mean 106, picture 107), less sky and bounce in the strait's held shot.

Life (`wings/`):
- 595162b (merge bc7ed47): fliers are geometry, no flier is cut by the edge at frame 0.
- 29cb2f8 (merge 4bd42a0): the leading fliers end by the seventh second.
- 8c057e7 (merge 9a540fe): the colony is opaque jointed bodies, one hero flier stands whole in the bright gap of the first frame, leavers are small and dark.
- dbe5008 (merge 90ddcb6): the colony is 134 smaller, paler bodies with feet on their own ledges, the hero flier climbs past the lens with the under side of both sails, feeders are darker and shift their weight.

Opening and loop (`shared/opening.ts`, `shared/looptext.ts`, `cameras.ts`):
- d5e98d7 (merge f8d3261): the first two seconds restaged, the start moved east, OR wipes off the right.
- 0590090 (merge 8f64a57): the start at (580, 885) clear of OR's flank, a taller strike; full G14 pass, seam 0.78.
- 4bb15d1 (merge 6860a60): the strike in two pulses, the breaker up L1 at 2.8 s.
- ca65422 (merge 20b8912): the loop camera's swing cut to a ring of 0.7 by 0.3 m, so the near rock stays in the frame; full G14 pass on the builder's machine.
- 1283fb0 (merge e8fb7e1): the strike's foot 50 m west, the breaker stands against the left spire at frames 390 to 440.

## 2. Still wrong, worst first

1. Nothing takes off, walks or lands. The colony at 1514 and the waders at 1766 still read as placed; the far waders glide; every colony body is one build with one neck curve. No gaits were built in this wave.
2. The wave break at 2440 to 2506 has no falling water: no droplets, no collapsing sheet. The flier there holds one wing pose. Untouched by life, only the bore's strips were closed by the sea.
3. Frame 1241 is too light in its darks (5th percentile 44, picture 24). The sky builder found it held up by the near cliff's weed, which went from brown-black to grey-green with the ground's last versions, and by the wet flats, not by the rig.
4. The weed wall at 2081 is a mottled sheet whose flutes read as bark, not fronds; the rivulet is glassy and sits beside the body.
5. The crag at 1546 is grey and even, its ledges steps of one depth; no shade patch under a bird, no nests, no white streaks.
6. The breaker of the opening: drop cards of one size that do not fall; the first pulse is small; OR is a plain wall in frame 0.
7. Frames 720 to 800: no white surf line along z = 330 where the lens crosses the shore, only a swash. The dark slab at 770 to 798 is the ground's berm at z = 315 to 322, cut by the level sea in a polyline.
8. Scud stands only on the dome, behind the arches. The sky is soft at uhd. The water at 1759 is a pale sheet without sparkle.
9. At 2500 the two fliers before the wave are grey, low at the left, one cut by the edge. Animals' mirror images are whole away from the legs; two pale cards lie on OR's foot at frame 0; a pebble patch stays mid floor at 1241.

## 3. Versions held back

- `agent/p7-ribs-life` 9a3d1c8: eight sitters drew black at 1546.
- `agent/p7-ribs-ground` 906241f: L1's top became a smooth orange post at 900 and 1241. Replaced by cb8fa1c.
- `agent/p7-ribs-life` a059431: the colony's lying bodies read as a heap of arrows run into each other at 1546.
- `agent/p7-ribs-ground` 0119b3b: OR's skirt blocks stood as glossy black stairs in the corner of frame 120. Replaced by c3f756c.
- `agent/p7-ribs-sea` 9318de4: the flat became smooth glass with whole mirror legs at 1759, the glitter was lost at 2081 and 900. Replaced by d865319.
- Never rendered: the sky builder's patch for scud before the arches, `out/work/rags.py` in that builder's scratch (uniform `uRags`).

## 4. What to try next for the worst three

1. Motion of the animals: hand a roost to `wings/leaving.ts` for take-offs; a second body sheet beside `feeder-a` and more neck shapes in `roost.ts` (SEAT, HEADS); a stepping gait for the feeders in place of the slow sway; a wing cycle for the flier at 2501 to 2506.
2. Falling water at 2440 to 2506: a droplet family in `sea/bore.ts` `thrownNow`, small opaque clots on long ballistic arcs; the same idea for DROPS in `sea/strike.ts` with mixed sizes and falling streaks. A third pulse of the breaker needs Burst and `strikeAge` widened.
3. Darks at 1241: darken the near cliff's weed in `land/` toward brown-black and take the sheen off the wet flats before touching the rig; the sky's floor, sky and bounce numbers barely move it.

Beyond those: cover the wall near the hung body with `land/curtain.ts` fronds instead of the sheet and draw the rivulet as thin cards; change ledge depth in `shared/crag.ts` together with life, since the birds stand on it; spray puffs along the berm's true waterline by `rig.land.height` (puffs are excluded for x > -262 in `sea/index.ts`) and a shelving bed so `surfAt` rollers can break; for sparkle at 1759 move ribs-04 `yaw` so the break stands low before the lens or lower the glint threshold in `sea/shaders.ts` (it needs `skyMirror` over 1.25 times the mean sky).

## 5. What a newcomer would trip over

- The full G14 renders all 480 loop frames and takes 21 to 30 minutes. A loop change needs it. Loop periods must divide 480.
- Stills build from the live source: no git work and no build while a render runs. One render process at a time.
- Repeat tests are trusted only on browser 147 (`chromium_headless_shell-1217`); this wave's determinism runs were on 1255.
- In `land/shaders.ts` any implicit-level texture read or `dFdx` inside an `if` breaks repeat: take the level outside with `footLevel`, read with `textureLod` or `textureGrad`. A rotation or large warp of world coordinates that varies in space draws rings.
- `weedPoint`, `radii`, `surface`, `partAtHeight` and L1's foot are read by other parts. `bladeCrag`'s `gain` scales edge relief by blade breadth. The rivulet is placed by `RILL_ALONG` and `DROWNED` in `land/index.ts`; the cost at 2081 is mostly the 7000 fronds.
- Sea: swap anchors in `sea/shaders.ts` must match exactly once or the build throws; `--diag solo --part` shows nothing useful for sea parts, test by `mesh.visible = false`; the pool sheet stands at 1.15 m and its vertex ignores `mesh.position`; the bore's run-out is cut by the `bare` discard, keep its rim sunk; never change the swell, `cameras.ts` holds copies of it.
- Sky: `domeTone` has a fourth argument (0 dome, toward 1 mirror) and `skyMirror` passes 0.6. Per-shot numbers live in `BREAK_BY_SHOT` (`sky`, `shade`, `bounce`, `heads`); ribs-02 has no row and takes `BREAK` plus `HELD`. The air is summed only before built things; the sea and the water sheets haze themselves (`uHaze` times 1.9 and 0.9), so the line where sea meets haze is theirs. The first wave's `ROWS-ribs_sky_builder.md` still lists the removed `sheet.py` and `storm-1.png`.
- Life: flier pitch is nose up positive, body `Pose.pitch` nose down positive. `Pose.shade` darkens by height over `p.floor` at the end of `Bodies.put()`. Roost bodies draw only inside `shotSpan('ribs-03')`, never in the loop. `HEROES` are placed in the lens frame from `openingCamera`: any camera change at 0 to 2 s moves them. Rig contact discs only work within 4 m of the baked floor.
- Opening: `STRIKE.foot` must sit on the line from the lens to L1, recheck frames 300 to 440 after any OPEN change; `OPEN.floor` and the sinks keep the lens off the water; `openingCamera` must equal the arrival from frame 960; the lens crosses FLOOR.south (z = 330) at frame 792.
- Cost runs drift about 0.3 s within an hour on one machine: measure two trees back to back. Frame 0 is the tightest (limit 15.8 s).
- The builders' branches have several merge bases with the lead's branch, so a three-dot diff lists foreign files. Check a version with `git diff --name-only <lead> <scratch merge>`.
- `index.ts` of the place belongs to nobody. Frames of the Eye are never guards.
