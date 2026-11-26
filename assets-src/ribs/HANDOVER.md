# Hand-over of the Ribs (unit `ribs`, film frames 0 to 2506, the opening and the card loop)

Written by the lead of the wide polish, wave p6. Branch `agent/p6-ribs-polish`, last commit of picture work 204c548. Builders' branches: `agent/p6-ribs-ground`, `-sea`, `-sky`, `-life`, `-opening`. Everything below was looked at in rendered frames beside `references/approved/1-ribs/`.

## 1. Done, part by part

Opening (`shared/opening.ts`, `cameras.ts`):
- afe929d, then bfa45e8 (merge f5784c6): the first shot restaged. The lens starts low behind a crest, the near blade L1 fills most of the height, staging facts STRIKE, FLOCK and SHAFT_TARGET live in `shared/opening.ts` and the other parts read them.
- 57930a4 (merge 3783e45): the lens rides the swell from frame 0 to 121, kept clear of all water within 12 m, no pit at frames 6 to 22.
- 35ad43b (merge 8c26cdc): the lens rides the long swell only, it no longer shakes with the short sea.
- eff1998 (merge 204c548): the lens slews 5 degrees onto its mark through the first 2.4 s, so frames 22 to 55 reframe on every frame; the lens is 29.5 degrees (L1 is 74 percent of frame 0's height) and widens from 3 s.

Sky and light (`air/`, `shared/look.ts`, `index.ts` look line):
- 2db0821: key light from the right, 24 degrees up, a break chosen per shot, bounce, one grade, the slab fog gone.
- fe799d5 (merge 7f07fde): painted storm sheet turned per shot, fog with a scale height.
- ed57265 (merge ed848c5): break and haze cooled to silver, a small break stands on the hung body, haze in banks.
- 0276e53 (merge c8c1fd5): sky rebuilt without sharpening halos, cloud pulled to slate, the lee faces of the strait warmed, recipes of `storm.jpg` and `storm-fine.jpg` written (G8 green).
- b6b81b6 (merge 6756331, holds 3dc8a94): the low mist's banks stand a little more apart and the breath on the flats is half between them; thin lit rims of the sky sheet are held back, they read as drawn lines when magnified.

Ground (`land/`, `drowned/`, far blades in `layout.ts`):
- 6ff4130 (merge cd1cebc): blades are fractured pale stone with quiet faces and lichen sunward, six far blades are arches of unlike bend with blunt heads.
- 2b93b41 (merge fd2c10c): the colony crag is grey with lichen in patches, the hung body is pale flesh, the weed is a curtain of ribbons.
- 14b2098 (merge 0d5b574): the bed at 1241 is a wet flat with few flat stones and weed mats, fronds are flat olive strips, the crag base is hanging strands.
- a442004 (merge 28805d1): the crag's faces are matt and pitted with less of the sheet's slope; pebbles are wet grey, not black; the near cliff's cap goes toward ivory.

Sea (`sea/`):
- 6f9351a (merge f5784c6): peaked swell, light through crests, a strike of thrown water on L1's foot.
- 1ef2570 (merge 03f2747): cool water, white foam, finer beads, spindrift, a silver path.
- 3bda574 (merge 84e5226): the burst is cool white with a crown and a wash, foam has thickness and a crest rim, hanging beads cleared at 600, the bore's spray is white and silver.
- 7991326 (merge 7bd78e0): the surf's white water is drawn where it was masked off (frames 757 to 852), its fronts in fingers; the open sea's foam stands in the lifted light.

Life (`wings/`):
- d8907fe (merge 122b1c6): the shore feeders are jointed bodies with planted feet instead of cards, the card loop's waders step and no longer slide (loop frames 100 to 148 checked against the rocks).
- fbb2101 (merge 88e2043): every wader is the posed body, pale; nine jointed fliers at the bore; a flock in frame 0.
- 91cc11c (merge b8306a3): fliers are bodies with a bent sail, a crowd over the colony, leavers set back at the bore.
- bcccff3 (merge 9335a52): the leavers at the bore stand on bent legs with raised necks and fly across; the leaders of the flock hold their heads off their way with one sail low (frames 0 and 600); the shade that made the black blot at 1546 is lighter (0.62 to 0.4); every hide is by draw range, so a solo of one part holds.

## 2. Still wrong, worst first

1. Frame 0 at full size (the opening's first frame). It shows: the fliers are smooth pale dolls with stick limbs, and since the last merge the nearest one, banked now, is cut by the left edge of the frame; the foam on the near crest is a flat grey sheet of noise with no thickness. The subject sheet asks for a first two seconds that hold a viewer and for no part that reads as a model. Tried: wings went from cards to jointed bodies with a bent sail in four versions (d8907fe, fbb2101, 91cc11c, bcccff3, where the leader stopped facing the lens); the sea gave foam a rim and thickness (3bda574) and lifted its light (7991326); the lens slews through frames 22 to 55 (eff1998). It fell short because the near flier is seen larger than any other and its body has no surface of its own, because the near crest's foam was not among the sea's last items, and because the slew moves the frame without anything passing near the lens.
2. Frame 1546 (ribs-3, the colony crag). It shows: rock faces that are smeared and glassy like a painting pulled large, lichen in vertical stripes, a dark blot at the top right (x 0.96, y 0.1), smaller since bcccff3, and a rookery of flat sheets that overlap. The approved picture shows dry broken rock with ledges and a crowd of separate animals. Tried: grey rock with lichen in patches (2b93b41), matt and pitted faces (a442004), a crowd over the colony (91cc11c). It fell short because the faces are still `mat/colony.jpg` magnified many times, and the blot is the shade of a hidden sitter of `wings/` stamped on the rock in front, lightened from 0.62 to 0.4 and not removed.
3. Frame 600 (the end of the opening's rise). It shows: a straight pale band along the far edge of the sea; the flier at the foot of L1, a streak before bcccff3, is now a body with drooped sails that still reads as pasted on. The picture set shows the sea going into mist with no line. Tried: haze in banks (ed57265), banks set apart (b6b81b6), beads cleared at 600 (3bda574). It fell short because the band is where the sea's far edge meets the haze at one height, and no part owned that meeting.
4. Frame 2081 (ribs-1, the hung body). The weed reads as dark hoses and brown fronds; the picture asks for wet olive ribbons. Three versions of `drowned/curtain.ts`; the brown comes from the specular under the warm key.
5. Frame 1241 (ribs-0). The weed mats are black blobs and the mist at the blades' feet is one even band; the picture has broken low mist and pale wet flats. The bed, the stones and the blades were remade (14b2098); the mats and the mist were not reached.
6. The break in the cloud is soft at uhd: the sky source is 1536 wide and is seen six times magnified. Edges were kept free of halos (0276e53), not made sharper.
7. L1's tip stands out of the top of the frame from about frame 60, a little more since the lens of 29.5 degrees (eff1998).
8. The surf has no pitching lip, the sea meets the sand at a hard line, the burst has no falling sheets.
9. Frame 1759 (ribs-2): the body is a cooler grey than the picture's warm white; white blobs stand at the left animal's feet. 

## 3. Held versions

- sky 1ec615b on `agent/p6-ribs-sky`: first key light. Held: the crag at 1546 went black and the bore at 2401 turned warm milk. Replaced by 2db0821.
- ground 2300b92 on `agent/p6-ribs-ground`: first fractured blades. Held: every blade dark brown and evenly cobbled like bark, away from ribs-0. Replaced by 6ff4130.
- life cf0565b on `agent/p6-ribs-life`: first bodies. Held: at 1759 the body was mid grey with a tube neck and a brush tuft, worse than the card. Replaced by d8907fe.
- sea 848d472 on `agent/p6-ribs-sea`: Held for one part: the bore's spray at 2401 was tan dust. Replaced by 3bda574, one line in `sea/bore.ts`.
- Nothing else is held. Every builder's last commit is in the branch.

## 4. What to try next, for each of the worst three

For frame 0:
- The near flier: give the one flier nearest the lens its own body (a skin with ribs and a wing membrane with fingers), keep it whole inside the frame through the slew of the lens, or move the flock's nearest member back to where the others fly. The flock's place is FLOCK in `shared/opening.ts`.
- The near crest's foam: in `sea/`, read the foam picture by 2.0 times the pixel on steep faces (the sea builder's note: foot-long pictures go flat there), and add the rim and thickness of 3bda574 to the near crest too.
- Frames 22 to 55: stage one event there (a second strike, or the flock crossing), named in `shared/opening.ts`.

For frame 1546:
- Replace the close-up albedo of the crag with computed strata and joints; keep `mat/colony.jpg` for the far view only. Place lichen by noise alone, not by the picture's columns (the ground builder's note).
- Lay no shade from hidden or stacked sitters in `wings/` (pass a shade below zero, as members of a clump do); it is the dark blot.
- Build the rookery from separate small bodies on ledges, not sheets.

For frame 600:
- Let the sea's far edge fade into the haze: the sky's haze needs more than 8 strides or a blur of its half-size pass (the sky builder's note), and the sea needs a fade of its own over the last part of its reach.
- The flier at L1's foot: set it farther from the lens path or leave it out of the opening.

Further, in the builders' own words. Weed: `drowned/curtain.ts` fronds take brown from the specular under the key, try roughness 0.3 and a sheen from the sky, and give the weed mats an olive material of their own. Blades: the cream and lichen thresholds in `land/fin.ts` are the two dials; the rubble feet reuse boulderShape. Break: a larger sky take (1 of 6 was used) or a computed rim. Cheapest cut of cost: drop the `lumps` read in the sky. Burst: falling sheets and a second, later wash ring in `sea/strike.ts`. Surf: a lip in surfAt (a vertex push where b is near 1), puffs along surf.y, coverage 0.6 times surf.z. The bore's mist went with the steam columns; if wanted back, few and low, in `index.ts`.

From the life builder. Rookery: give the forty sitters nearest the colony lens crouched bodies from `wings/body.ts` and keep sheets beyond; the gap of a clump is range(1.45, 2.2) times size in `wings/index.ts`. Fliers: fold the neck in flight and shorten the legs in `wings/flier.ts` (SPINE, LEG); let the leaders curve off the lens instead of crabbing (CRAB in `wings/index.ts`); the leavers need a foot and a thicker thigh.

From the opening builder. Frames 22 to 55 still lean on the slew of the lens; a nearer foreground (wreckage, or a rock passed close at 0.5 s) would give real parallax. The burst peaks at 3 to 7 s, not in the first second: `STRIKE.times[0]` in `shared/opening.ts` could go earlier.

## 5. What a newcomer would trip over

- The full seam gate (`npm run -s gate -- --phase 5 --only G14`) renders all 480 loop frames. It took 27 minutes on one builder's machine and did not finish in 35 on the lead's. A quick check that it will not fail on identity: `npm run -s still -- --loop 0 --tier draft --format preview --force` and the same with `--loop 480`, then `cmp`: byte equal.
- Guard frames 4409 and 7234 (other units) repeat byte for byte at draft, preview, on the lead's machine; the before files are `out/work/before/frame-4409-preview-draft.png` and `frame-7234-preview-draft.png` (not in the repository, render them anew from origin/main).
- Cost (`npm run -s cost -- --frame N --format uhd --tier draft`) is noisy by about half a second a sample on a shared machine; frame 0 read between 12.1 and 13.8 s within the hour on nearly the same picture. Measure twice before blaming a part.
- Staging facts of the opening are in `src/places/ribs/shared/opening.ts`; sea, wings and air read them. Move the strike or the flock there, not in the parts.
- `wings/contacts.ts` exports where feet and strands touch the water; the sea draws rings and crowns from it. Beads stay in wings.
- `layout.ts` was opened to the ground builder for the far blades only; OL and OR were not moved; the feet of all blades are where they were.
- The merge commits before 3783e45 carry no `Co-authored-by` trailer; they are pushed and were not rewritten.
- Pushing failed on some machines of this wave (no login); a bundle of `origin/main..HEAD` was the road.
- Stills and cost build from the live source. An edit, a checkout or a merge while a render runs leaks into that render. One render at a time, and no git work on `src/` while it runs.
- The engine has a depth prepass. A `discard` in a fragment shader of a part drops its depth twin; holes then show the wrong depth.
- Sky: use `textureLod` inside the march; the pass is half size; `uStillAir` holds the air for the loop; the opening's fog is separate (FOG_STEPS 14) and the loop has `LOOP_MIST`. There is one sun, in `anchors.ts`; the break is staged per shot in `rig.ts` (`BREAK_BY_SHOT`), with `BREAK.bounce`; the grade is in `look.ts`. `opening.ts` is read, never copied. Measure the sky's cost with `--parts sky` only.
- `assets-src/ribs/air/sheet.py` and `fine.py` remake `public/assets/ribs/air/storm.jpg` and `storm-fine.jpg`. If either file is remade, RECIPE.md and its ROWS must follow or G8 goes red (`npm run gate -- --phase 6 --only G8 --json` must name no file under `public/assets/ribs/`).
- Sea: the opening's variants are string swaps on SEA_FRAGMENT and SEA_VERTEX; keep the anchor lines whole or the swap silently does nothing. `feet` is metres, depth is `-land.r`. A `vec3 e` in the fragment is unused.
- origin/main moved (49a907e to 02a577d) during the last hour of the wave. This branch was not rebased; its fork point is 49a907e.
- The unit tests (`npm test`, 36 files) passed at 84e5226 with no numbers pinned anew. They were not run again on the last merges.
- Wings: never set `mesh.visible` in the update; the solo view owns that switch. Use `Flight.draw(n)` or `Figures.hide(i)`.
- Wings: a figure's shade is drawn with GreaterDepth on anything nearer than its plane, so stacked or hidden figures blot the rock in front. Members of a clump pass a shade below zero to lay none.
- Wings: the card loop draws no bodies in the air (flight, fleet and escort draw 0) and keeps the sheets (airSheet grey 0.6). Every period must divide 480 frames.
- `cameras.ts`: SEA_SWELL, OPEN_SEA_STANDS and seaCalm are copies of `sea/tide.ts`, `sea/index.ts` and the sea's vertex shader (an import would be a cycle). If the swell changes in the sea, the lens no longer clears it and a straight-walled pit shows wherever a crest stands within 12 m of the lens. The opening builder checked 1.4 m clear on all 1042 frames against the surf of 3bda574, not against 7991326.
- `shared/opening.ts`: the names STRIKE, FLOCK and SHAFT_TARGET are read by sea, wings and air. `openingCamera` must equal the arrival to the bit from 16 s (frame 960).
- `shared/looptext.ts` was not touched in this wave. Any change to the loop needs the full G14, about 30 minutes.
- G14 (the loop's seam) passed in full on 84e5226, run by the opening builder (30 minutes): loop frame 480 equals 0 at draft, review and final, seam step 0.79 levels, largest step 6.94 at 116 to 117. On the last commit only the quick check was run: loop 0 equals loop 480 byte for byte at draft preview on 9335a52, and loop 0 is byte equal before and after eff1998. The full gate was not run on the last commit.
