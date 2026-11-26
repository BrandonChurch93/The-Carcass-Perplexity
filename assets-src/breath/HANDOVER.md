# The Breath: hand-over from the wide polish

Unit `breath`, film frames 4221 to 5617. Branch `agent/p6-breath-polish`. Written by the lead of the unit at the end of the wave. Every statement about a picture below was looked at on stills at preview size, draft tier, and on the three review stills at hd (4221, 4973, 5242), unless it says otherwise. Nothing here was seen as moving film at full size.

## 1. Done

Part by part, with the merge commit on `agent/p6-breath-polish` and the builder's own commit in brackets.

The light and the grade (sky builder, `shared/`, `index.ts` look line only)
- `2299b91`: rig re-key. Stronger warmer sun, hot sun heart, wider glow in fog, cooler lower fill, thinner sun banks, less bloom, a little more contrast.

The pit and the ground (ground builder, `land/`, `land.ts`, `dead/`)
- `123a413` (541ff75): the pit wall as pale arches in `land/arches.ts` in place of the wall plate.
- `8c6b64d` (21e6099): six whole round hoops as swept tubes that sink into the rock, a crust cap on the rim, near ground with a relief layer, wet margin, chips as cut solids.
- `3fd3e8b` (0e8fdef): the dead one drawn in and lowered onto its plate with the stain in the rock, shingle only within 20 m of a lens and on the dead one's plate, the rim cap kept off the lip where the three lenses stand.
- `9a9bde2` (abe33fa): one relief on the hoops in the shader (beds along the run, pits, spalled patches), the slab face without the sun point fuzz, the shaft wall a hand under the brim so no black line stands on the rim, recipes for crust and gravel.
- `aded316` (96ff49f): the dead one's trunk a third lower, the belly fallen in, the low flank and hip a hand under the grit.

The water and the plumes (fluid builder, `water/`, `plumes/`)
- `ef40b2a` (1ef5ddc): the water mirrors the sky, carries a sun path, rings at the legs and reflections; the plumes are real geometry in place of flat cards.
- `3392ad8` (d5ffe0c): feather fronds in crimson, a fleshy holdfast, the channel in milky teal with a dark line at the bank.
- `965dd89` (0b420cc): at 4973 the growth is cut back to two thirds of the frame so the pit and its steam hold the right third, as in breath-3; locks hang, tips droop, dark wine; in breath-05 the two tall bushes are swapped for low domes.
- `8e4da64` (4b90745): limb ends lifted and arched downwind, locks trail, lock ends glow orange red where the sun comes through; low domes in place of the two tall bushes in breath-01 as well; drop strings under open tips; soft flow lanes in the channel.

The vapour and the sky (sky builder, `air/`)
- `9066d4d` (58ebd9b): the pit fog stands in towers with gaps, lit by the low sun through its own depth.
- `3f5ce2c` (6d46247): fog white on the sun side and grey in shade, in clumps; far plumes as heaps of steam; sky decks drift.
- `47bcefd` (eb534e2): fog as bodies, the shaft open on its centre and east so the hoops read down at 4731, a fan of sun rays, a firmer edge on the far plume.
- `20a25be` (294959e): ray fan broader and at under half strength, far plumes take half their colour from the haze they stand in, the settled mist drops between its heaps so hoops read at 4973 and 5510, far cliff deeper in its own shade.

The waders (life builder, `waders/`)
- `7a14ba9` (eb1a820): sixteen skinned waders, each with its own plan, a gait from planted footfalls.
- `e55f686` (ffee4fd): short deep egg trunks, drumstick thighs, knobbed joints, hooves, hide from a generated skin sheet, the tassel as flesh cords, drips. The builder's probe gives 0 mm foot drift.
- `0bb59f0` (f0bfedd): the mop as 130 cords in eight locks, dark when soaked, hide greyed to cream, thinner shanks.
- `f4fef35` (53d2f27): the fed mop hangs close in matted locks, smaller creased knees, the hide sheet remade by a committed script with its recipe.
- `5276dd0` (55c1624): one wader on the flats lies on its belly with its neck up (a new optional `rest` in the plan), about one in ten of the far flock lies too.

Numbers at the end of the wave
- Guard frames 1241 and 7234: both byte equal with main at `5276dd0` (the last merge; this file is the one commit after it).
- Cost, uhd draft, seconds a sample: 4221 23.0 before, 24.1 now; 4731 28.65 before, 32.6 now. The limit of the wave was 29.9 and 37.2.
- Unit tests: the whole suite was run at `3fd3e8b`: 933 tests, all passed but the G8 check. It was not run again after the last merges.
- G8: green at `5276dd0` (`npm run gate -- --phase 6 --only G8 --json`: 392 files, 0 with no recipe).

## 2. Still wrong, worst first

None of the five shots would pass as footage. The list is what a viewer sees first.

1. Plumes, 4640 to 4736 (breath-02). The hanging growth at the left is a large dark mass under one arched frond, lit orange at its fringes, and it runs down the left quarter of the frame to the bottom. breath-4 shows one soft dark mass of fine wet hair in the upper left only. Tried: flat fronds on limbs (V1, palm fronds), straight hanging threads (V2, a black curtain of combed hair with level rods, held), arched limbs with hanging sprays (V3, red palm leaves), lifted limbs with trailing locks (V4, merged). Each kept the limb as a visible rib with threads set evenly along it, which is what reads as a leaf or a bough.
2. Plumes, 4973 (breath-03). The layout is right: the growth ends at two thirds of the frame and the pit and its steam hold the right third. The growth itself still reads as a small conifer with stiff boughs. breath-3 shows feathery plumes that rise from the lip and arch downwind with the low sun through them, tips glowing orange red against the steam, and drops falling. V3 hung like a weeping tree in dark wine all through; V4 lifted the limb ends and lit the lock ends, which is nearer but not there. Drops are beads more than strings, the holdfast is half hidden, the bush is smaller than the picture's. The flat cards on main had a sweep nearer the picture's than any version of this wave.
3. Plumes, 4221 to 4536 (breath-01). The lip growth went from a tall scarlet tree (V1) to two brown black lumps like boulders (V3) to low domes (V4): red again, but small and beady. breath-0 shows one low spreading dark red mass along the lip.
4. Hoops, 4731 and 4865. Smooth putty tubes with blunt ends and loose blocks that hang like bricks. breath-4 shows thick layered travertine with pitted broken faces. Tried: planks (V1), round swept tubes (V2), slower entry into the wall (V3b). No bedding or fracture was drawn on them. The last version added a relief that leans the normal: shading only, the outline is still round and bulbous near the lens at 4973.
5. The dead one, 5403 to 5617. Lower and bedded now, but still a whole wader rig lying on a plate. breath-2 shows a collapsed body, slack skin over ribs, half sunk, with a soaked stain. Tried: drawn in trunk, hide filled between ribs, grit heap (V3, a line of dark beads, held), sparse grit (V3b).
6. Waders, 5081 to 5402. The fed mop is a wide rake of wires where breath-1 shows a narrow matted wet tassel; knees are smooth balls, thighs posts; far feeders past 60 m share poses at 4221. The last versions drew the mop close in matted locks (it parts in two bunches and the bare neck end shows through) and laid one far wader down; the hide is still smoother and pinker than breath-1's pale grey skin over bone.
7. Steam at 4973 is a flat grey veil in the rim's shade; breath-3 shows billows with a lit edge. The ray fan at the top of 4731 may read drawn. The white plume by the sun at 4221 reads pasted on. The last version softened the fan and seated the far plume in haze; the 4973 steam has billows but still no lit edge, and the heaps at 5510 are soft with hollows that are not dark.
8. Near slab face at 4536 and 5403 is noisy fuzz; a thin black line runs along the shelf's rim edge at 5510 and 4973. The last version cut the fuzz and the black line; a few pale streaks remain on the slab face.
9. No flow in the channel, no wet margin above the water line on the bank, no contact line at the waders' legs (the last needs data from `waders/ripples.ts`).
10. The far cliff was not touched and is soft at uhd.

## 3. Held versions

- sky V1, branch `agent/p6-breath-sky`, commit `8fef05b`: a flat tan fog wash with a level top at 4973, 5510 and 4731. Replaced by V1b `58ebd9b`, merged.
- fluid V2, branch `agent/p6-breath-fluid`, commit `e220a47`: at 4731 a black curtain of combed hair with level rods across a quarter of the frame, and grey olive water where breath-0 is milky teal. Replaced by V2b `d5ffe0c`, merged.
- ground V3, branch `agent/p6-breath-ground`, commit `d5ebd89`: shingle laid to 70 m put a brown stretched band across the lower left of 4221; the rim cap showed as a dark plate with a knife edge at 4973; a line of dark beads round the dead one. Replaced by V3b `0e8fdef`, merged.

Nothing else was held. Every other version sent was merged whole. The builders' branches on origin end at the commits merged last: ground `96ff49f`, fluid `4b90745`, sky `294959e`, life `55c1624`.

## 4. What to try next

- Hanging plume (4640 to 4736): drop the limb and frond build for this one. Grow strands from a soft drooping mass, clumped into wet locks of uneven length with the rib hidden inside, as hair on a card or strand system would be laid, and check it against breath-4 at 400 px before any detail work.
- Plume at 4973 and the lip growth: start from the sweep of the flat cards on main (rise from the lip, arch downwind), keep this wave's cut-back and real geometry, and hide the limb inside the feather. Light through the thin ends is in; the body needs to thin toward the tips so the sun comes through more than a fringe. On the lip at 4221 to 4536 grow one low spreading mass, not scattered domes. Check beside breath-3 and breath-0 at 400 px.
- Hoops (4731, 4865): displace the tubes with bedding layers along their length and break the ends with a fracture cut, not a cap; give the loose blocks a seat on a hoop or remove them. Check beside breath-4.
- The dead one: it needs its own model, not the wader rig posed flat. Ribs open, belly fallen in, one side sunk into the crust.

## 5. What a newcomer would trip over

- Frames 5725, 8305, 8412, 9221 and 9300 of other units do not repeat byte for byte. The guards of this unit, 1241 and 7234, do.
- `src/places/breath/shared/` (anchors, rig, glsl, stage) belongs to the sky role. Exported names in `shared/`, `waders/ripples.ts` and `waders/mirror.ts` were kept through the wave: add, do not rename. Waders own the ripple and mirror data, the water draws them.
- `src/places/breath/index.ts`: the camera paths were not touched. Only the `look` line was changed (bloom, vignette, contrast).
- The shelf's sun to shade ratio lives in `land/rock.ts` (`shelfShade`).
- The pale to dark flip of the ground between 4409 and 4440 was the shingle layer fading in by distance to the lens. It is now laid only within 20 m of a lens and on the dead one's plate. Laying it farther brings a brown band into 4221.
- In breath-05 the two tall plumes are swapped for low domes by staging, as `RIM_GROWTH` is. A change to the tall plumes does not show at 5510.
- The rim cap starts at bearing 283 so that the lenses at 4973 do not look along its top.
- 4731 is the heaviest frame of the unit (32.6 s). Fog, plumes and hoops all meet there.
- Fog at draft tier shows faint facets at 4865 that are gone at review tier.
- The lead's machine in this wave could not push. The branch on origin was pushed by the Builder from bundles.
- `public/assets/breath/waders/hide.jpg` and `hide-nh.png` were first made by hand and then remade by `assets-src/breath/waders/make-hide.py`: close to the first ones, not bit for bit.
- The lying wader (`rest` in the plan) has plain bent legs: fine at 100 m, not for a close view. It lowers its neck after 8 s.
- At the dead one's hip a small pale fragment of the hind leg stands alone out of the grit, and the hip is cut by the ground in a fairly straight line. Both came with the last lowering of the trunk.
