# The Breath: hand-over from the second wave of the wide polish

Unit `breath`, film frames 4221 to 5617. Branch `agent/p7-breath-polish`. Written by the lead of the unit at the end of the wave. Every statement about a picture below was looked at on stills (preview size at the draft tier; 4973, 4731 and 5510 also in `hd` at the review tier), beside the before set and the approved pictures in `references/approved/3-breath/`. Motion was looked at on sheets of consecutive frames only, not on a played clip.

Keys: breath-0 is frame 4409, breath-1 is 5242, breath-2 is 5510, breath-3 is 4973, breath-4 is 4731.

## 1. Done

Part by part, with the merge commit on `agent/p7-breath-polish` and the builder's own commit in brackets.

The pit, the ground and the dead one (ground builder, `land/`, `land.ts`, `dead/`)
- `8dc3268` (467534c, in part): hoops as bedded travertine banks with seated slabs. The dead one of that commit was held back.
- `cb4bb5a` (7ea5574): the dead one as its own swept model with sagging hide and a forked mop, cracked grey crust round it, tiers carried round the fallen side, low stones in the 5242 pool.
- `d85cd9c` (c1163e7): the pit wall as bedded rock, a ledge with great blocks on the fallen side, the dead one with uneven shallow ribs under drape folds, a cooler cracked bench.
- `fff268e` (b99ab44): the fallen side as darker angular blocks, the rim hoop broken into separate lengths, the dead one's stripes lower in contrast.
- `6c6f303` (e3b5d20): the dead one paler, less dirt on the hide.
- `826efac` (28a8217): the dead one's creases bent so their spacing is uneven, faded in patches and on what faces up, pale dust on the upper side.

The water (water builder, `water/`)
- `7c1a109` (71726eb): wind ripples, rings bent by the wind, a baked stream in the channel.
- `b9c536b` (2cfdc62): teal from above, gold point glints near the lens, a ribbon skin on shelving banks, scum off the shoals.
- `194b490` (3d73815): gold points on steep facets round legs and mops, a wider dark contact, a paler milk tone, skin on the rims of the low stones.
- `3862d2a` (b0052f7): the concentric arcs left of the near wader at 5242 gone, the channel at 4409 nearer teal.
- `8c7af8f` (dd6c43c): the smooth lanes lighter and wider; the dark blotch that b0052f7 left in the 4409 channel is gone.

The growth (growth builder, `plumes/`)
- `317a3bb` (28ca84b): a new grower in `plumes/sprays.ts`: stalks from one holdfast arched to the lee with hanging wet hair; the 4731 curtain back to the upper left.
- `375edf0` (d178a65): sway along the lean with travelling gusts, hanging drops, low wide mounds on the rim behind the wader, the 4409 corner bush cut.
- `1b82705` (88d13a5): strips whose ends curl under, the 4973 crown raised, a second mass at the left edge, a flesh holdfast, more drops.
- `76090a9` (ac95378, which carries 5d2234f): the 4731 mass ends higher at the left edge with curled, tapering ends; gusts doubled, larger drops; the bush on the south lip at the right edge of 4409 drawn dark.

The vapour, the sky and the light (sky builder, `air/`, `shared/`, the `look` line of `index.ts`)
- `a9f8659` (3258b8c): the pit vapour as one marched fog, the ray fan out.
- `eb586c6` (1f76580): the shaft fog as one pool level, deep in the middle and east, high at the west wall; a soft sun bloom; sky colours times 0.86 with the fill raised by the same factor.
- `8c22cff` (789dcc4): the fog lit from the bright sky with warm sides and dark hollows, the pool falling after the breath, the rock dimmer under the sheet.
- `af850ef` (91d1855): fog over the fallen side at 4973, a fuller pit fog at 4731 and 4865.
- `4a7299a` (4c35f02): a march step weighed over its whole length and the pool's top in the west thinned over 2.5 m, so the layer steps in the pit fog are softer.
- `cb49680` (8d7c1cf): the sky builder's rows for this wave.

The waders (life builder, `waders/`)
- `612db8c` (074c4cd): the contact data (`CONTACT`) that the water reads for rings and the dark contact at the legs.
- `91d06e1` (a2b0a82): a warm mottled hide, jointed legs, the mop as flesh roots, a varied far flock.
- `206a17b` (247f224): the rim wader restless, the 5510 wader in rear three quarter with its neck down before the growth, a thicker pink mop, the herd further out.
- `391ba1b` (c307c3d): one whole wader on the flat at 4973, the mop trailing on the water in thin pink tan hanks, the 5617 head in frame, the restless beat phase warped.
- `fa12c6c` (6c7cf42): outer animals of several ages, two of the wide trio turned and moved apart, a wet line with salt and silt on the legs, the mist wader shaded, darker mop tips.
- `da5e212` (2483a91): the wet line runs along the leg and goes with a lifted foot, salt in patches.

Numbers at the end of the wave
- Guard frames 1241 and 7234: both byte equal with the before files, rendered from `cb49680` (the last merge; this file is the one commit after it).
- Cost, uhd draft, seconds a sample, before and now: 4221 23.27 and 25.09 (plus 7.8 percent); 4409 26.19 and 27.48 (plus 4.9 percent); 4731 31.69 and 29.74 (minus 6.2 percent). The limit of the wave was 12 percent: 26.06, 29.33 and 35.49.
- G8: passes at `cb49680` (`npm run -s gate -- --phase 6 --only G8`).
- `npx tsc --noEmit -p .` clean and the build green at `cb49680`. The unit tests were not run by the lead in this wave; each builder ran the determinism check on its own versions.
- The diff against `origin/main` lists only `src/places/breath/`, `public/assets/breath/` and `assets-src/breath/`.
- The before set is in `out/work/before/`, the after set in `out/work/after/` (14 preview stills at the draft tier, and 4973, 4731, 5510 in `hd` at the review tier). Neither is committed.

Against the approved pictures, from the start of the wave to its end
- 4409 (breath-0): nearer. The channel reads teal, the herd has several ages, the bush at the right edge is dark. Still further than it should be in the pit, which is a cut ringed by cream hoops where the picture has a dark misted hollow, and in the channel's layout.
- 5242 (breath-1): nearer. Warm hide, wet legs, a trailing mop, dark stones at the foot. The blocking is still a row, not an overlap.
- 5510 (breath-2): nearer. The wader stands before the growth in rear three quarter and the dead one is a pale body with a stain. The body is still a model, not a collapse.
- 4973 (breath-3): nearer. A heavy plume leaning to the lee with the pit's fog at the right; at report 3 the right side showed bare cream blocks and was further, and the last sky and ground versions put it behind fog.
- 4731 (breath-4): nearer. The growth hangs in the upper left over a bedded wall with fog in the shaft. The hoops are paler and the view lower than in the picture.

## 2. Still wrong, worst first

None of the five shots would pass as footage. Round 29 gave 4, 4 and 4 against a bar of 9, and the jury 7 votes of 25. The list is what a viewer sees first.

1. The dead one, 5403 to 5617 (key 5510). It shows a pale body that is smooth and waxy on the neck and the upper flank, with creases that still run as bands round the trunk, legs as smooth tubes with knobs, and a mop that lies as a fan of thin noodles. breath-2 shows a collapsed gaunt body, slack dry skin over ribs, half sunk in the crust, with a soaked stain. Tried: a white kit with even rib rings (467534c, held back as a tidy corpse), a swept model with sagging hide (7ea5574), uneven ribs under drape folds (c1163e7), the stripes lowered (b99ab44), then bent, faded in patches and dusted (28a8217). It fell short because ribs and folds are drawn in the hide and not modelled: where they are faded the body goes to wax, where they stay they read as a striped coat, and the outline is still one smooth sweep with no collapse.
2. The hoops and the fallen side, 4731, 4865, 4973, 4409. The hoops are wide cream and orange bands in full sun, the brightest thing in the pit, and the fallen side is a heap of rounded pale blocks. breath-4 shows a dark wet tiered wall in mist with pale ledges only near the top; breath-0 shows the pit as a dark cut with a thin pale rim. Tried: bedded banks with seated slabs, tiers carried round, a bedded wall with a ledge, darker angular blocks, the rock dimmed under the fog sheet, fog laid over the fallen side at 4973. It fell short because the hoops keep a cream ground colour and stand clear of the fog, so "simple arches" (the jury's word) still holds.
3. The fog at native size, 4640 to 4865 and 4973. It shows scalloped creases (fewer since 4c35f02; one dark notch with a scalloped rim stays at the lower left of 4731) and a dot grain at one sample, the cream tier still shows at the right edge of 4973, the far plume is a soft ball, and at 4784 to 4806 the left third is a blank pale wall. breath-3 and breath-4 show soft billows with a lit edge and depth. Tried: one marched fog, one pool level, lighting from the sky with warm sides and dark hollows. It fell short because the vapour is drawn at half size and its layers step; where growth strands cross it they dither (see held versions, the engine line).
4. The growth, 4640 to 4736, 4866 to 5080 and 4221 to 4596. At 4731 the hanging mass is thinner and stringier than in breath-4 and its upper strands are straight wires at native size; at 4973 it reads as pampas more than as a gill, and a few specks differ from 4973 to 4974; the holdfast sits on bare rock with no stones or wet round it; where strands cross the haze they show as dots. breath-4 shows soft dark feathered gills in the upper left; breath-3 shows one heavy wet plume with a fleshy foot among stones. Tried: a new grower, curled ends, sway and gusts, low mounds, the mass held to the upper left. One version (0e25c65) went to long straight wires and was held back; the last (ac95378) curls the ends again.
5. The waders, 5081 to 5402 and the herd at 4409. One body shape at every size, a pale cuff above a fairly straight wet edge on the far standing leg, mop hairs thinner than the cords of breath-1, blotches on the hide that read painted, and the wader in the mist at 4973 pale and soft. Tried: a mottled warm hide, jointed legs, flesh root mops, ages from 0.62 to 1.15, a wet line that follows the leg. Mop strands thicker than one unit failed in the first wave and were not tried again. Three jurors named repeated stiff models at 4409; the ages help the wide but the lying ones do not read at that size.
6. The water. The lit points round the legs and the mops are all one size and read as glitter; the legs stand in nearly calm water and the dark contact is thin; the channel at 4409 is still greyer than the milky teal of breath-0 and its upper reach is warm; the far rim water line cuts the cliff foot. Tried: wind ripples, bent rings, a baked stream, teal from above, gold points, a wider dark contact, lighter smooth lanes.
7. The layouts that were not restaged: the channel at 4409, the blocking at 5242, the rim height at 4731 (see section 4).
8. The far plume and the cloud decks were not proven to move on a played clip; the fourth critic's items on frozen vapour stand unanswered.

## 3. Versions held back

- sky `b3c6913` on `agent/p7-breath-sky`: 4731 denser and darker, but the second hoop and the block pile vanished. The later sky versions took another way.
- ground `467534c`, the dead one only (`src/places/breath/dead/`): a white plaster kit with even rib rings, a tidy corpse. Superseded by 7ea5574.
- sky `7d72432` on `agent/p7-breath-sky-engine-line`: the sky's half of the cure for the dither where growth strands cross the haze. It needs one line in `src/core/engine.ts`, which belongs to `/root` and was not changed in this wave. The diff and a crop were sent to `/root` at minute 176.
- growth `0e25c65` on `agent/p7-breath-growth`: at 4731 the mass ended in long straight wires with strays in the lower left, the jury's "wire-like fronds". Superseded by ac95378.
- growth `5d2234f`: took the south lip bush off the set in breath-01, which moved 4409 away from breath-0, where a dark red bush is cut by the right edge. Superseded by ac95378, which puts it back.

## 4. What to try next

The three restages come first; they were noted for wave 3 by `/root`.

1. The channel at 4409. breath-0 has the channel as a broad milky teal arm that leads the eye from the lower left to the pit. Ours is narrower and greyer and bends away. This is a change of the terrain plan and the water depth in `land.ts` and `water/`, about 3 hours, and it moves the stones and the herd's footing with it.
2. The blocking at 5242. breath-1 has three waders overlapping in depth with the near one cut by the left edge and dark stones across the foot of the frame. Ours has them spread in a row. This is wader staging in `waders/` and a look at the breath-04 camera, about 2 hours. Camera paths stayed as they are in this wave.
3. The rim height at 4731. breath-4 looks down from higher, so the tiers stack and the growth hangs from the top left. This is the breath-02 camera, then the growth and the fog restaged to it, about 2 hours.

Then, for the worst three of section 2:

1. The dead one: stop drawing ribs and folds as bands. Model the collapse in the outline (hip and shoulder as the two high points, the belly fallen to the ground between them, the neck flat), put the ribs in as a few uneven ridges on the upper flank only, cover the upper side with dust from the crust and the low side with a wet stain, and replace the noodle mop with a few matted cords half bedded in the crust.
2. The hoops: take the cream out. Wet dark stone with pale mineral only on the upper lips, as breath-4 has it, and let the fog sheet sit above the second hoop so only the rim hoop is in sun. Break the outline of each hoop with missing lengths, not with added blocks.
3. The fog: take `/root`'s engine line with sky `7d72432`, then draw the vapour at full size inside the pit for breath-02 and breath-03 only (the cost is there: 4731 is below its before number), and jitter the layer steps by a blue noise that is fixed in world space so it does not crawl.

## 5. What a newcomer would trip over

- The lead's machine could not push. Every state of `agent/p7-breath-polish` went to `/root` as a bundle. Some builders' pushes failed too (water, sky) and came as bundles; fetch them as `refs/heads/b/<builder>` and delete the ref after the merge.
- `npm run -s cost` hung once for ten minutes. Run it under `timeout 240`.
- Never build while a render runs: the render reads `dist`. The lead's scripts in `out/work/` (`try.sh`, `frames.sh`, `set.sh`, `pair.cjs`, `keys.cjs`) assume one process at a time.
- The `look` line of `src/places/breath/index.ts` belongs to the sky builder alone. The sky colours carry a factor 0.86 and the fill its inverse; the water reads the same numbers from `shared/`.
- The waders own the contact data (`CONTACT`); the water only reads it. The dark wet band on the rock stays in `land/rock.ts`; swash and foam are drawn in `water/`. The low stones in the 5242 pool are in `land.ts`.
- The merge of ground 467534c took `land/` only and restored `dead/` by hand; that was a decision of the lead, not a conflict.
- Cost at 4409 is the tight one. Every version after minute 137 had to be cost neutral there.
- The repeat test is only to be trusted on Chrome 147.0.7727.15; this machine has headless_shell 1255.
- A preview still at the draft tier hides the fog creases, the strand dither and the wire ends. Look at a native crop before a merge.
