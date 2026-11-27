# The Eye, frames 8305 to 9540: hand-over of the second wave of the wide polish

Branch `agent/p7-eye-polish`, from `origin/main` at 4e84d7b. Written by the unit's lead at the end of the wave. Shots: eye-01 8305 to 8519 (key 8412), eye-02 8520 to 8680 (8600), eye-03 8681 to 8841 (8761), eye-04 8842 to 9164 (9003), eye-05 9165 to 9540 (9221). Approved pictures: `references/approved/6-eye/eye-0` to `eye-4`. The lead's machine cannot push; every state reached origin as a bundle pushed by the Builder.

## 1. Done, part by part

Each line names the merge commit on this branch, then the builder's commit it took.

Land and skeleton (ground builder, branch `agent/p7-eye-ground`)
- 1b799b8 (57a16c9): the large clean blocks in the lower corners of 8412 and 8305 are gone, in their place low scree and fractured slabs; the smooth egg pebbles at 9003 are gone; every sheet of the land is read at one level (`land/lod.ts`), which is both the cure of the land's part of the repeat fault and a cut in cost.
- 238042e (b78a6eb): the skeleton at 8761 and 8841 is a whole cage of pale bone, larger, half sunk, with contact shade; white water in the stream; the outcrop relief is baked into three pictures, so each render starts about 7 s sooner (9.9 s to 0.02 s on the builder's machine). The shore at 9003 is byte for byte what it was before this merge.
- 8d9afbe (339ab01): the skull at 8761 and 8841 is blunt, with cheeks, a hollow of shade, the notch of the nose and the jaw's line; stouter limbs; the grain of the bone coarser and weaker, the stains stronger; the stream is white in lumps at short riffles with glass between them.

Lake (fluid builder, branch `agent/p7-eye-fluid`)
- 24b258f (824fca6): the lake takes one footprint at the top of `main` and reads every picture with `textureLod`. This was the cause of the repeat fault: derivatives and implicit level reads under branches taken pixel by pixel.
- 9b92897 (ff83a77): each frame's lake program holds only what that frame uses, which cut the lake by a third at 8412; the mirrored seam of the mats is gone; the far water at 8600 gives back high sky instead of a cut-off reflection.
- c9b6aa5 (110a5b4): the deep at 8761 has a true surface, a mirror far off and a look into the water near the lip, over a stone wall; the risers are sunk before eye-04; the deep in the climb has no blotches and no radial rim; the far water at 8600 is dark blue with rings at the legs; the rings at 9003 are out of round.
- b60cc57 (c3c5c85): the top of the wall under the lip at 8761 is pale in the sun, with weed hanging from the lip; the bed at 9003 is small stones in place of flat slabs; the tresses of the mats are bent by the ground, with bunches of olive and ochre among the rust; the pale rim of the deep varies in width.

Air and far pictures (sky builder, branch `agent/p7-eye-sky`)
- 9d7096c (7e2e375): the rig's plate reads with explicit gradients (repeat fault, sky's part).
- 5d8a9e0 (ed4dd2a): the eye-03 far wall taken from the approved picture, standing level.
- 7a593c1 (922809c): the brow's shade falls off, so the round lit patch at 9420 is gone; mist banks with a torn top, cool sky light, a veil at the eye-03 wall.
- a580f09 (d434545): the shade is carried cell to cell from the sun in `bakeGrid` (`shared/rig.ts`), so its edge in the climb is neither stepped nor ruled; climb banks thinner and softer; mist light cooler; the far bank at 8600 fuller.
- dd320ac (1dcef75): the far rim picture at 8305 is carried on by one generated end (`far-wide.jpg`, recipe beside it), so the mirror seam on the far right cliff is gone; sky glow gold, not pink; the bank at 8761 in the wall's shade; the mist pass cheaper (early outs, 10 and 5 steps).
- 385c76c (bf26adf): `drawn` of the eye-03 plate in `air/plates.ts` from 2.8 to 1.25, so the cliff lies in the water at its own height and the upright smear in the mirror at 8761 is gone. Found by the fluid builder.
- e31e85c (4ef377d): seen from above, a low veil of mist in soft patches lies on the shallows and the mats round the pool from 9450 and laps its rim; it is gone before the pull (9505 is clear).

Drinkers (life builder, branch `agent/p7-eye-life`)
- da2e616 (58ae7e9): pale creased hide on the four bodies at the shore.
- a195c1c (6eb6047): a herd of 26 pale bodies at 8412 and 8500 in place of the small dark cards; cream hide, a resting leg, dark wet pasterns and a waterline at 9003; an upright animal at 8600. The necks of eye-05 keep the cards' geometry.
- 1318389 (008d35d): one near pale animal with its head down at 8600, as in the approved picture; the trunk leans over the bearing hind leg and the flank breathes at 9003; herd legs and bellies darker.
- 69d9c28 (dc5db0c): the animal at 8600 stands on the bed with the water half up the cannon and a dark waterline; skull and muzzle fuller; shoulder blade, ribs and hip as relief under the hide; a saddle of dirt; the three at 9003 change the resting leg at different times (9073, 9138). 9221 untouched.
- c4dcee7 (5b619e1): the four animals of the shore shot, 8842 to 9164, carry streaks of old mud down ribs and haunch and thin healed scars, as tone. The last merge of the wave.

Repeat fault. On the test machine (browser 147.0.7727.15, draft, 960 by 540) the baseline gave 6 results from 6 draws on each of 8305, 8412, 8600, 8761, 9003, 9221, 9300. At e31e85c, the state before the last merge, every one of those seven frames and 9450 gave 1 distinct byte result in each of two sets of six draws, and the two sets equal each other. The last merge (c4dcee7: tone on the animals of 8842 to 9164, no reads and no derivatives) was drawn there on 9003 and 8900 only, with 1 result twice on both; the other six frames of the fault were last drawn on e31e85c, not on the final head. Every set was draft tier at 960 by 540.

Cost, lead's machine, uhd draft, one sample, whole frame, before the wave to c4dcee7: 8305 22.51 to 18.12 s, 8412 20.41 to 15.84 s, 9003 22.80 to 20.18 s, 9221 21.79 to 17.25 s. No frame measured costs more than before the wave; the lake is still the largest part.

## 2. Still wrong, worst first

1. The animals. At 9003 the three stand small in the frame against the approved picture, where they fill it; the hide is still clean and even, the relief of rib and hip faint, the upright head a blunt wedge. They hold as stills but read as models when they move. The herd at 8412 is 26 like bodies with plain hides. Nothing walks: at 8580 the animals stand while the lens moves, which the film critics read as feet sliding. No footfall splash.
2. The mats and the near shore of eye-01. At 8412 the mats are long parallel tongues of flame colour, brighter and more combed than approved; the last version bent the tongues, but all together, so the look is the same. The scree in front is a field of like stones, and the lower corners have loose stones and no low broken outcrop with the stream running through it, as approved has. The stream is thin, and its glass between the white lumps is hard to see.
3. Eye-05, 9221 to 9365. The far wall is still one flat picture on a cylinder; cave, scree and cliff do not shift against each other as the lens rises. The necks in the foreground are the cards, striped faintly. The swell has no foam line and no wet edge; foam was tried by fluid and dropped as not better.
4. The climb, 9400 to 9540. On this branch the old flight still runs; the Reveal's branch restages it (see section 5). The veil of mist round the pool from 9450 is new and breaks the drawn rim, but its patches are soft round puffs without wisps, and it has not been seen under the restaged flight. No white flecks of fallen swell at 9500. The motion pop at 9535 to 9546 and the soft cloud ring at 9541 named by the film critics are the flight's and the Reveal's cloud, not cured here.
5. 8761. The pale wall under the lip and the weed are there now, but the weed is a short fringe, not long strands far down; the skull has a face, but its hollow is a slot and the whole is a squeezed ball; the bones are one even tone; the lake's far edge under the wall still carries a grey band.
6. 9003, lower third. The bed under the shallow water is small stones now; the near shore above the water is still coarse dark ground with small rubble where approved has pale warm gravel out of focus, and there is no orange growth beyond the animals.
7. Mist. Banks have torn tops now, but at uhd there are no fine wisps, and the pass costs more at 8412 than at the start of the wave (1.21 s against 0.8 s on the sky builder's machine).

## 3. Held versions

- ground V1, `agent/p7-eye-ground` bd8be63: over the cost limit, and smeared faces on the slabs at 8305.
- life V2, `agent/p7-eye-life` f05bb71, and V2b, 52b8e47: at 9221 the two necks became thick ringed stumps with blunt knobs and read as fingers. The rest came in with V2c (6eb6047), which kept the cards there.
- sky, `agent/p7-eye-sky` d4af72a: the shade march bent the way to the sun and threw a shadow sideways over the drinkers at 9003, who went grey and flat. Cured in d434545, merged.
- ground V3, `agent/p7-eye-ground` caa2924: the new beach at 9003 was a dark rust-specked mound with a hard outline.
- ground V3b, `agent/p7-eye-ground` b8ecf5a: the same beach as a flat pale tongue with a cut-out curve, which read as a sticker. V3c (b78a6eb, merged) leaves the lip out.

## 4. What to try next, for the worst three

1. The animals. First light the shaded flank from one side: flat fill hides every bone and mark at 9003. Bring the lens nearer at 9003 only if a critic's open item names the framing; otherwise work on what the frame shows: a hide map with scars, dirt and bald patches at the scale of the approved picture, ribs and hip as relief that catches the low sun, and a weight change that moves the whole trunk and the far shoulder, not one leg. For the herd, three hide tones and two sizes, and one animal that walks with planted feet at 8580, then a few, each footfall told to the lake so that it rings (the lake already rings standing legs).
2. The mats and shore of eye-01. The tongues are the comb picture (`tComb` in `lake/bed.ts`, where `EYE_RIM > 0`), which also decides where weed lies (`lies` by `combed`); bending its coordinates bends all tongues together. Let the round `cover` field alone say where weed lies, in patches with pale pools between as in approved eye-0, and keep the comb only as tone inside a patch, each patch turned its own way by `blobs`. Lower the chroma towards the approved amber. In the lower corners build one low broken outcrop each as a height field with eroded joints in `land/outcrop.ts`, rebaked, warm and weathered, with the stream falling through the left one in riffles between stones.
3. Eye-05. Relief read from the picture's darkness failed (too rough at fine levels, nothing at coarse ones), and one surface gives under 2 px of shift whatever its relief, since the lens moves 130 m at a field of 8 degrees. Cut the eye-05 plate by hand into three layers (far face, buttresses, scree foot), fill the holes, and hang them on cylinders about 150 m apart. Then a thin line of foam and a wet edge where the swell meets the shingle, drawn on the surface only, and real necks in place of the cards (`shotOf` gives 'none' for eye-05).

After these: the skull from a sculpted profile instead of a squeezed ball; long weed down the wall at 8761; white flecks of the fallen swell at 9500.

## 5. What a newcomer would trip over

- `src/places/eye/handoff.json` and `src/places/eye/flight.ts` belong to the Reveal's climb builder and are untouched here. They are changed on the Reveal's branch (`agent/p7-reveal-polish`, climb V2 ec04289: flight restaged 9385 to 9540, cut at 310 m, lens lower at a slant, the deep fills the frame 9470 to 9505). So frames 9385 to 9540 drawn from this branch alone show the old flight. To see the join, check the two files out from the Reveal's branch for a look and put them back; never merge them here.
- The repeat fault shows only on browser 147.0.7727.15. The lead's machine (159.0.8154.6) repeats everything and proves nothing. A shader that reads a picture with an implicit level, or takes `dFdx`, `dFdy` or `fwidth`, under a branch taken pixel by pixel brings the fault back: take one footprint at the top of `main` and read with `textureLod` (never `textureGrad`, which costs).
- 8305 was the last frame to fail: one level at one to four pixels along the stream line at lower left, in only some draws. It went with the ground builder's removal of the glint branches along the stream bank (57a16c9). Twelve equal draws are good evidence, not proof.
- Cost is measured with `npm run -s cost -- --frame 8412 --format uhd --tier draft --parts none`; without `--parts none` the tool also draws each part alone and takes the cheapest as the empty frame. The limit of this wave was the number before the wave, not 30 percent more. The lake is still the largest part (6.8 s of 15.9 s at 8412).
- At 9003 the lip mesh in `land/lip.ts` is wound face down and the coarse ground lies over it. That is the look that was kept: two tries to show a beach there were held. Whoever turns the lip up must bring a beach that beats the coarse ground beside the approved picture.
- `drawn` in `air/plates.ts` also sets how tall a far wall lies in the water (`farRadianceAt` in `shared/glsl.ts`). A wall made larger there stretches its mirror.
- The review script copies the last still of a frame even if the render died (it happened once: "Target page, context or browser has been closed"). Look for the `rendered` line of each frame before judging a pair.
- G8 wants a recipe beside every picture under `public/assets/eye/`, in `assets-src/eye/<folder>/RECIPE.md`. G8 passed at every report.
- Who holds what: the `look` line of `index.ts` and the far walls are the sky builder's; the stream is the ground builder's; the bed under the water is the fluid builder's. The sky builder's machine lost its sign in to origin at 03:49 UTC and sent bundles until its pushes went through again, by 04:10.
- No em dashes and no exclamation points in any text, and every commit ends with the one trailer.
- The renderer pays both sides of every branch in a shader, so in the lake only the `#if` names of `variantOf` (`lake/index.ts`, set in `beforeSample`) save time. The lake's measured time also holds the sky's mirror reads.
- `still` reads `src` live: no edit and no checkout while a render runs.
- Any change to `land/outcrop.ts` or `land/height.ts` needs the bake run again: `npx tsx assets-src/eye/land/bake-outcrop.ts`.
- The bed by the shore (fluid's) must stay on the ground's sheet at `xz / vec2(2.0, 1.125)`, or the stones under the water and the stones beside it part at the waterline.
- `uThin` fades all the air of the place over 9360 to 9462 and multiplies ring and banks inside `mistShape` (`air/index.ts`); only `uMistRound`, the veil seen from above, outlives it. `WIDER` must match `mat/far-wide.jpg`. Lake and drinkers read `RIG_GLSL` and `farRadiance`, so a change in `shared/` moves them too.
- Eye-05 has no bodies: its necks are cards. In the drinkers, `pose.pelvis[0]` is a yaw.
- The before set of this wave and the after set drawn from c4dcee7 lie in `out/work/before/` and `out/work/after/` on the lead's machine (preview draft, 1241 4409 7234 and fourteen frames of the Eye, with hd review stills of 8412, 8761 and 9003). They are scratch and not committed. At c4dcee7 the three guard frames are byte for byte their before files and G8 passes.
