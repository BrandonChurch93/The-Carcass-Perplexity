# The Breath: hand-over from the third wave of the wide polish

Unit `breath`, film frames 4221 to 5617. Branch `agent/p8-breath-polish`. Written by the lead of the unit at the end of the wave. Every statement about a picture below was looked at on stills (preview size at the draft tier; 4731 also in `hd` at the review tier), beside the before set and the approved pictures in `references/approved/3-breath/`. Motion was looked at on the builders' sheets of consecutive frames only, not on a played clip.

Keys: breath-0 is frame 4409, breath-1 is 5242, breath-2 is 5510, breath-3 is 4973, breath-4 is 4731.

## 1. Done

Part by part, with the merge commit on `agent/p8-breath-polish` and the builder's own commit in brackets.

The pit, the ground and the dead one (ground builder, `land/`, `land.ts`, `dead/`)
- `c57eae8` (a9d4998): the one pixel with no number at 4409 cured at the arches' closed ends (M1 green since), the three sheets of the shelf joined as one surface, the north lip of the shaft lower so the far rim lies under the eye at 4731.
- `fe7f361` (b6fbf82, branch `agent/p8-breath-ground-cam`): the breath-02 key pose 3 m higher (y 7.4) and 3 degrees steeper (pitch -28). One line, line 38 of `src/places/breath/index.ts`, on `/root`'s word: the wave's one exception to "a file that is nobody's". The end offset is untouched. `/root` ruled: no further change to this camera without its word; pitch -32 was refused.
- `b4f23d8` (effbafc), merged on a draft look, not measured: the terrace crust comes over the brim as a ragged pale lip with the wall dark under it; the wall reads its picture with `textureLod` (the builder's cost at 4731 fell from 30.62 to 27.80 s on its machine).
- `4f49afc` (9b65512): the wall's first slope under the brim drawn as wall (beds, runs, relief, darker and wet; this mends a pale sheet at 4597 that the new camera showed); the dead one with a fallen belly, a flat slack neck, finer folds, a dusty paler hide torn on the flank. The hoops in this commit are the old bedded hoops: the ribs were taken back by the builder (see section 3).

The water (water builder, `water/`)
- `25ad85f` (899e879): a collar mesh round every contact point with a meniscus, uneven drifting rings, froth in the lee.
- `3e925e5` (b9af873, tip 64fefe1): the pool's colour and silt from how much water lies round a place, pale margins, dabbing rings under a mop, froth and crust in grains, ripples that shoal toward the shelves, sun points of many sizes, a crown round a foot going in or out, a clearer teal on the new grade.
- `fd59f33` (baa2622, which is V3 bb26a37 and V4 together): gust patches with an edge, ripple size by depth and changing inside a gust, crests sent back off dropping banks, wider paler margins with teal kept in the deep middle.

The growth (growth builder, `plumes/`)
- `caffbb4` (743d204): the plume of breath-03 as fleshy blades in locks with beads, gusts stalk by stalk; the tall plumes keep their first form; the animal on the flats stands clear at 4973.
- `3302c19` (c64de03): bushes of coral at the rim, each of its own build; threads out of focus drawn as wide as part of the blur; the hanging mass restaged to the higher lens of breath-02, from the top left and down the left edge, weeping blades in place of wires.
- `ed8725b` (6d1b63b), merged on a draft look, not measured: at 4731 the fronds half as many and twice as wide, arching over, gathered in locks; the low bush at the lens is gone, so the mass is smaller.

The vapour, the sky and the light (sky builder, `air/`, `shared/`, the `look` line of `index.ts`)
- `66a25c4` (2f85491): a warm sky as measured on the approved pictures, a tight sun and halo, three layers of haze with drifting banks, the far plume a column that widens from its vent, the pit vapour's light cooled against the gold grade.
- `8fe4c6b` (f5f36a4): the pit vapour a thin fog with a soft top, in billows lit on the side toward the light, the wall read through it. The wave's best single change.
- `eb720bf` (03a3f8f, which carries dcef0bc): the vapour heavier in its billows with hollows kept low, a column over the west well (the left of 4731), the breath's steam gathered over the wells, the high haze thicker so the far cliff stands in the air, the far plume's rim softer.
- `cbd9800` (f1a0fb3), merged on a draft look, not measured: the breath's steam thinner off the wells so the hoops read as rock through it at 4757; the far plume's crown fades over a wider band.

The waders (life builder, `waders/`, `public/assets/breath/waders/relief.jpg`)
- `b612bd1` (f3ca50f): the far herd as a pale row, footfalls for the one at the rim, walkers on the flats, the third of the trio nearer, pale far light.
- `2e6da6c` (c1d2ac2): each of the four seen close wears its own sculpted relief (the baked `relief.jpg`, recipe in `assets-src/breath/waders-relief/`), pale shanks, a wet line that fades, the far herd scattered in depth, drips as beads, the rim wader comes to its place a foot at a time.
- `ce58827` (f96cba4): the hide paler and less red, bead trains off the mop, scars as long thin scratches (none reads as a closed eye), the animal in the glare at 4973 larger, side on and back lit as breath-3 has it, the fold at the hind leg at 5510 drawn as skin and not as a dark slit.
- `8f48242` (a0c6212, by bundle), merged on a draft look, not measured: the mop pink with dark weed on its wet half, the body sinks and leans further over the bearing feet, more sun and warm rim on the near hides.

Numbers at the end of the wave
- Proofs of report 3, at `ce58827`: guard frames 1241 and 7234 byte equal with the before files; frame 5242 drawn three times fresh, byte equal; `--diag invalid` at 4409, final tier in uhd: 0; G8 passes; the diff against `origin/main` lists only `src/places/breath/`, `public/assets/breath/` and `assets-src/breath/`.
- After the four last versions, at `8f48242`: guard frames 1241 and 7234 drawn again, byte equal; the name list still breath only. Nothing else was proven again at `8f48242`: no measure, no cost, no three draws, no invalid count.
- Measures at `ce58827`: breath-0 (4409) M1 0 pixels, M2 30.47 percent, M3 1.426, all green. At `8fe4c6b` (report 2): breath-1 (5242) M1 0, M2 49.37 percent, M3 1.2208; breath-4 (4731) M1 0, M2 84.48 percent, M3 7.9551; invalid 0 at 4597, 4731 and 4865. M3 at 4731 at `ce58827`: 5.0124 (1.8862 without growth). breath-2 and breath-3 were not measured by the lead in this wave.
- Cost, uhd draft, seconds a sample, before, at `ce58827`, and the cap (5 percent over before): 4221 25.04, 23.13, 26.29; 4409 27.88, 25.33, 29.27; 4731 30.13, 29.02, 31.64.
- Size: 1.01 MB added (du) against a limit of 12, nearly all of it `public/assets/breath/waders/relief.jpg`.
- The camera guards of `fe7f361`, run for report 2: frames 4596 and 4866 and the judged frames 4409, 5242, 5510 and 4973 byte equal across the camera commit.
- The before set is in `out/work/before/`, the report sets in `out/work/r1/`, `r2/`, `r3/`. None is committed.

Against the approved pictures, from the start of the wave to its end
- 4409 (breath-0): the same in layout, a little nearer in the air and the water. The channel's plan was not touched (decided at the start: not this wave).
- 5242 (breath-1): the same. The blocking was closed as it stands; hide and water are finer.
- 5510 (breath-2): nearer. The dead one has a fallen belly and a slack neck; the slit is gone.
- 4973 (breath-3): nearer. The animal in the glare has the key's size and place.
- 4731 (breath-4): nearer. The higher camera stacks the hoops, the mass hangs from the top left, the steam rises at the left and the pit is open. `/root` asked for the frame of the shot nearest the key's view: it is still 4731 (the frames between 4597 and 4865 were not looked at one by one).

## 2. Still wrong, worst first

None of the five shots would pass as footage yet. The list is what a viewer sees first.

1. The hanging mass, 4640 to 4865 (key 4731). Since growth V4 the fronds are fewer and wider and read as lance leaves, and the mass is thin; breath-4 has a heavy mass of soft feathery clumps down the left edge. Before V4 the strands were thin, even blades, and M3 at 4731 showed it: 5.0124 of the approved picture's fine detail with the growth, 1.8862 with all growth left out (measure's own call, final tier in uhd, minute 199, at `ce58827`). A reading far above 1 is detail the approved picture does not have there; it is no merit. breath-4 shows soft, dark, feathery clumps. M3 was not run again after V4. Before V4 the tips broke into rows of dots where they crossed lit steam (section 5, the dots); in the growth builder's one to one crop of V4 at the final tier the tips are whole, which the lead did not draw itself. The motion of the new fronds was not looked at by anyone.
2. The hoops, 4409, 4731, 4865, 4973, 5510. They are bedded rock arches; breath-4 shows ribs, cream and rust. The ribs were tried and held back (section 3).
3. The banks at 4409. The ledge drops straight into the pool; breath-0 has shelving, wet, pale margins. The water has pale margins now but will not paint a bed: it needs a strip of ledge a hand above and below the water from the ground.
4. The vapour at native size, 4731 to 4770 and 5242. One lobe with a drawn edge at the centre left of 4757, one on the crown of the far plume at 5242; at 4757 and 4770 the vapour covers the lower left hoops.
5. The far cliff is crisp and streaked with snow where the approved pictures have it soft in haze. The pale ledges stay by ruling (they are in `public/assets/breath/air/far.jpg`); only the haze may do the work, and sky V3 raised it.
6. The bushes at 5510 are tall and open, each strand read singly; breath-2 has low dense mounds. Not reached.
7. The near waders at 5242 share one rib sequence (the jury's note in round 30). Not reached.
8. The water: the pool's ripples are one family of shapes, crests sent back off the banks are faint, no ring spreads from a standing leg, only a crown while a foot goes in or out (the water builder's own list).

## 3. Versions held back

- ground `ac794c9` and `fd6e6b8` (rib commits `c3a1cd7`, `af78b79` on `agent/p8-breath-ground`): the hoops as ribs with a baked skin. At 5510 and 4409 they read as one smooth pale loaf with weak, even rust stripes, further from breath-4 than the bedded hoops. The builder reverted them in `07e6a59` and `0fe7cfd`; the bake script stays in the tree.
- sky `0b23278`: the far plume a ball, the vapour browner. Mended as `2f85491`.
- growth `68736c6`: blades covered the animal at 4973. Mended as `743d204`.
- From earlier waves and still out: sky `7d72432` on `agent/p7-breath-sky-engine-line` (needs a line of `src/core/engine.ts`, which is `/root`'s); ground `467534c` (tidy corpse); growth `0e25c65` (straight wires); sky `b3c6913`.
- Nothing of the last versions was held back: all five builders' last versions are on the branch (water's V4 came in with `fd59f33`).

## 4. What to try next

For the worst three of section 2:

1. The mass at 4731: V4 has the right width of frond; now build the mass back down the left edge with them (never toward the centre), in soft overlapping clumps with frayed, feathery edges in place of clean lance outlines, and measure M3 with the growth until it stands near the 1.89 the frame has without it. Look at a sheet of consecutive frames of the new fronds first. Judge by a native crop beside breath-4, not by the preview. To draw 4731 without the mass (the growth builder's line): `sed -i 's/hangGroup.visible = hung;/hangGroup.visible = false;/' src/places/breath/plumes/index.ts`, draw, then `git checkout src/places/breath/plumes/index.ts`. `out/work/m3.mjs` (not committed) calls measure's own M3 on one frame; it is ten lines round `renderStill({frame, tier:'final', format:'uhd', look:false})` and `sharpnessRatio` from `tools/lib/measure-core.mjs`.
2. The hoops as ribs (the ground builder's own words): what broke was one swept round section with a skin-scale bake (plates, cracks a finger wide), which is below what 4409, 5510 and 4731 can see through the mist, so the form read as a smooth tube; the ivory was near white; the rust was laid by a few fields along the rib and came out as even stripes. To try: keep the old bedded hoops and break their outline in the mesh at 0.3 to 1 m (missing lengths, notched ends, a section that changes), bake relief at that scale, hold the cream at breath-4's mid tone, and take the rust from the underside and the baked hollows, not from fields along the length.
3. The banks at 4409: today the ground only shades the waterline in `land/rock.ts` (weed at the tide line, a dark wet band about a hand high, a pale bed from 1 cm under); no geometry is cut there. A real strip, a hand above and below the water, means a step in the height field (`land.ts`, `land/field.ts`) along the 4409 bank. It moves the water's edge, so it needs the water builder's level and `water/edge.ts` beside it, and a measure run at breath-0. The channel's plan at 4409 (a broad teal arm from the lower left to the pit) is the same piece of work and was left for it.

## 5. What a newcomer would trip over

- The dots where a strand crosses lit haze (4731 tips, 5510 bushes). The growth builder's reading, likely and not proven: `src/core/engine.ts` lines 47 to 48 with the half-size `volumeTarget` at line 255: each air texel is marched to the depth of the full-size pixel at twice its index, so a tip about one pixel wide (the floor in `src/places/breath/plumes/shaders.ts` line 111, `least = 0.55 * uPixel * far`) takes the lit steam on alternate pixels, a dashed line. Drawn alone (`--diag solo`) the tips are whole lines. There is no alpha test and no texture read in the strand shader. `src/core/` is `/root`'s; nobody in the unit changes it. A wider floor at 4731 was not tested.
- Fetch a builder's branch and check the hash against its mail before the look. Twice in this wave the branch head was already a version newer than the mail (water `baa2622` under a V3 mail, sky `03a3f8f` under `dcef0bc`), and the lead merged the head without seeing it. The looks were of the merged tree, so nothing wrong went in, but the names in report 3 had to be corrected.
- The life builder's pushes answered 128 from minute 173; its last versions came as a bundle (`git fetch <bundle> agent/p8-breath-life`).
- Never build while a render runs: the render reads `dist`. One render process at a time. Run `npm run -s cost` under `timeout 240`. Long renders in the foreground: background jobs are killed.
- Cost at 4731 is the tight one now: the higher camera sees more wall and hoop. The old hoops are dearer than the ribs were (ground builder: 30.62 with the hoops, 27.86 with the ribs, on its machine).
- The `look` line of `src/places/breath/index.ts` is the sky builder's; line 38 (the breath-02 key pose) is closed by `/root`.
- A preview still at the draft tier hides the vapour's drawn edges, the dots and the thin strands. Look at a native crop before a merge.
- The right-edge bush at 4409 is not to be moved a third time; the 4731 mass may grow down the left edge, never toward the centre; nothing living has eyes or ears (the dark tear on the dead one's flank must never read as an eye).
- The flat plate at the foot of 5242 is the ground's stone; the froth line on it is the water's.
- The lead's scripts are in `out/work/` and are not committed: `take.sh`, `frames.sh`, `frames2.sh`, `keys.sh`, `proofs.sh`, `camguards.sh`, `beside.cjs`, `m3.mjs`.
