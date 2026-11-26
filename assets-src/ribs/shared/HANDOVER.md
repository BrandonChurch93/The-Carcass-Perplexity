# Hand-over of the Ribs: shared, root, land, air

Last owner, wave 3: `ribs_ground_owner_3`, branch `agent/ribs-ground-3`. Partner: `ribs_sea_owner_3` (`sea/`, `wings/`, `drowned/`).
Written with version 3. Numbers are measured unless a line says otherwise. Looks are uhd draft unless said; every key was rendered once at the final tier.

## How each part is drawn

- `land` (floor): `land/height.ts` (`bed`) baked by `shared/rig.ts`. `GROUND_FRAGMENT`: a wet map (`soaked`) first, so most of the flat is dark wet sand that mirrors the sky, with pale slate bars; `mat/plate.jpg` twice (48 m, 86 m), `mat/shingle.jpg` and `mat/flat.jpg` near the lens, `mat/nearbar.jpg` (12 m) on the bar before the wide lens with heights in `land/nearbar-nh.png`. `uGate` draws the flat before the gate: dark sunk sand, cast weed mats, bright bands. The partner's `runnels` sheet lies over my bed there.
- `ribs` (blades): `layout.ts` fins; `land/fin.ts` `FIN_FRAGMENT`: `mat/colony.jpg` rock laid by world position on three planes in mirrored courses, mixed toward its mean so the marks are faint; a second scale (`far2`, 37 m, turned) breaks the repeat; `bedding` gives shelves that look up, with white on them and lichen in patches; cold grey to warm ivory over hundreds of metres. `uCap 1` on `L1`: cream cap, and under it `wetWall`, one dark wet mass down to the weed with only a pale rim above. `STACK_FRAGMENT`: the two gate stacks (`mat/stack-a.jpg`, `mat/stack-b.jpg`), capped, weed 11 m lower.
- `ledges` (colony): `shared/crag.ts`. `cragRadius(angle, y)` is a body cut by `blockAt` into level courses, each faulted every 1.4 blocks, with slanted joints, turned faces and one block in five far proud or fallen. `cragPerch` gives block tops on the mesh rows (0.3 m): the partner's animals stand by it. `COLONY_FRAGMENT`: `mat/ledge.jpg` and `mat/rock.jpg` on three axes, orange lichen in large patches (`patchL`), white that runs down from every real lip (`drip`), dark wet rock at the foot.
- `weed`: skirts and `stackWeed`; `WEED_FRAGMENT` with `mat/wall.jpg` and `mat/weed.jpg`; near the lens: strap fronds, a tight glint, threads of water that run down by `uTime`. The crag's skirt is `curtain` (the widest radius near a place), 9 m lower than the ledges' line `uKelp`.
- `rocks`: instanced `boulderShape`, `BOULDER_FRAGMENT`. `gathered` in `land/index.ts` keeps stones only near `L1`, at the gate and feeding poses and in long patches; grit to boulder. `STATIONS.foreground` holds the big weed rock before the gate lens (`mat/weedrock.jpg`).
- `sky`, `cloud`: dome in `air/index.ts` (`mat/sky.jpg`, `mat/far.jpg`); the break turns 0.6 degrees a second; cloud shadow in `shared/rig.ts`.
- `air`: one volume pass: haze by distance, low mist banks that go with the wind round the blades' feet, the opening's fog bank.
- Cameras (`cameras.ts`): lens widths are small on purpose: colony focus 27 / 0.035, feeding 17 / 0.02, gate 60 / 0.03, drowned 18 / 0.07.

## Tried and did not work

- Wider lenses for the critics' depth of field: M3 fell to 0.51 (ribs-2) and 0.69 (ribs-3). Cut back; blur is on the near rock only. Do not raise them.
- The wide relief sheet on the blades (`nhW`, flutes, hollows): rope and wood grain on every blade, and 0.2 s a sample. Removed.
- A kelp curtain raised to the crag's own line: read as a thatch mat over the ledges. The curtain stays low.
- The crag as thrown cells of three sizes (wave 2): stacked plates and slivers. Level courses alone: a block wall (the Builder's word). Courses with faults, slanted joints and turned blocks is what stands; it is still too regular.
- The rock's marks at full strength on the `L1` cap: a mirrored tile showed in the opening. Now fainter there than on any blade.
- Stones scattered evenly: "dropped evenly over the whole flat". `gathered` took about three quarters away.
- Reading pictures with `textureGrad`: seven times the cost of `textureLod` in the software renderer. All reads go by `footLevel`.

## Still wrong beside the approved pictures, worst first

- ribs-3: ledges are faulted but still mostly level; no overhangs or rounded noses; the weed at the foot is a swirled sheet, not hanging blades; lichen is right in amount but its edges follow the tile.
- ribs-0: the flat has few low rock shelves and no pebble trails along runnels; the blades are grey more than cream and the sunlit side is only a little warmer than the shaded one; the middle blade has no arch through it.
- ribs-4: four tips over the wave where the picture has five; the left stack is still a lump under its weed; the near weed rock is dark but small.
- ribs-1: fronds are flat straps; gloss is a glint, not a wet sheet; no stream of water, only threads.
- ribs-2: boulders near the feeders are weed loaves; haze steps between far masses are small.
- Motion: mist banks and the break move, slowly; nothing on the land itself moves but water threads on weed and crag.

## Round 16 and the Builder's lists, each severe and major issue that is mine

- "the stacks look smooth, sculpted, and clay-like with blurry vertical streaking" and "The same stretched gray striations run over broad, smooth faces": blades redrawn as world-laid rock with shelves; the sheet read removed. "an unrequested vertical stone tower": the far blades lean now (`L4`, `L5`, `R4`, `R5`). Done.
- "flat overcast grey with none of the warm sunlight": warm and cold over the blades, break in the cloud. Partly.
- "severe repeating diagonal and concentric hatched line artifacts" and "stretched fine grooves and lacquer-like glints": `mat/nearbar.jpg` with its own heights; hatch gone at uhd. "pebble bed looks smeared... fine detail swims": checked on the held sheet; partly.
- "dry, jagged dark procedural rock topped by a smooth featureless grey wall": `L1` is one wet weed mass with a pale rim. Done; the Builder's "layered cake" answered by `wetWall`.
- "missing the thick glossy kelp carpet, cascading water stream and droplets": strap fronds, glint, running threads. Partly; no stream.
- "entire frame is in sharp focus": lenses set, then cut for M3. Partly, by decision.
- "bare striped foreground boulders", "smooth dark boulders": weed-covered, matt. Partly.
- "distant rock spire on the left: oversized": `R2` behind the crag carries faint beds now; not moved. Partly.
- "stretched vertical black-and-white striping and smeared orange patches", "same black and white bands stretch over rounded corners", "floating flat grey polygon strips", "thin blue-grey water trickles": crag rebuilt in courses; white only under real lips; lichen in patches. Mostly done.
- "only a single smooth, pale leaning spike": four tips now. "pitch-black, glossy, blobby overhang": stacks capped, weed lowered, matt. "bright cloud break sits on the left": not moved (it is right for ribs-0). "a straight shelf exposes a strip of vertically dragged texture": stack rock by world position. Partly.
- "arch tips have blunt, faceted ends": not changed.
- "smooth flattened tubes with uniform highlights and blunt cut ends": fronds vary in width and gloss. Partly.
- "Several distant rock masses turn the same gray at once": mist banks between them. Partly.
- "the place reads as a still picture": break turns, banks drift, threads run. Partly. "translucent flat card": `R2` now has rock on it. "white streaks... read as painted texture": they start at lips now.
- Jury: "rock textures stretched or tiled": three planes, second scale; the cap tile ended. "a shape that reads as a face": checked in all five keys and the opening sheet: none found.
- Builder on version 2: stones gathered (done); blades pale with faint banding (partly: grey, not cream); near cliff one wet mass (done); crag ledges broken, lichen patches, streaks, wet foot (partly); five blades (four); weed gloss and drip (partly); opening checked (no face).

## Staged by shot

By time (`stagedSeconds`): the fog bank of the opening (ribs-01); the gate stacks and their weed (ribs-06); thicker air at the colony (ribs-03). By place, kept all film: the crag's kelp line `uKelp` 46.3; the weed rock and stones before the gate lens; stones before the feeding lens.

## Cost, seconds a sample at 3840 x 2160, key ribs-0, draft tier

COSTLINE
