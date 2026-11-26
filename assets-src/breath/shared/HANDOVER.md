# Hand-over: the ground, shaft, vapour, sky and cameras of the Breath

From `breath_ground_owner_2`, branch `agent/breath-ground-2`, at version 3 (Phase 4, wave 2). Folders: `src/places/breath/` root (`index.ts`, `land.ts`), `shared/`, `land/`, `air/`. Wide key `breath-0`. Partner: `agent/breath-life-2` (`water/`, `plumes/`, `waders/`, `dead/`).

## How each part is drawn

- `land`: `land.ts` gives the height. `smoothGround()` is the shelf, lips, flats and the channel (`channelX`, `channelWidth`: it winds and varies 0.6 to 1.4 in width, fixed between z -40 and -16). `bedded()` breaks it into Voronoi plates about 5 m across (`SLAB`), each at its own level (`RISERS`, 8 to 60 cm) with its own tilt, level beside the channel, edges warped by the plate picture and fine noise. `ground()` adds the plate picture's relief (`mat/shelfplate-h`, laid turned by `PLATE_TURN`), the pad under the dead one (`padAt`, six sides) and the dark rocks under the breath-04 lens (`lumps`). `land/field.ts` bakes height, shadow, slope, stones and pool film into a 2048 map over `FINE`; stones lie at riser feet. Meshes: near 512 cells, mid 300, far 160. Shader `SHELF_FRAGMENT` in `land/rock.ts`: plate colour cooled, `mat/wetrock` grain near and at a quarter size close, face stone on true edges only, sheen broken by grain and seams, gold glare, bed grey-green under the tide.
- `shaft`, `hoops`: one displaced mesh from `mat/shaftwall-h` (`land/wall.ts`), `WALL_FRAGMENT`: stone cream-grey with thin tan bands, grey-green between the ribs, ribs pale, sky as a disc that closes with depth, bounce from the mist.
- `slabs`: 46 fractured blocks on a rubble heap and 6 on the ribs (`block()` in `land/ribs.ts`), `land/slabface.jpg` (made by `assets-src/breath/land/make-slabface.py`).
- `cliff`, `sky`: `air/sky.ts`. The far scarp and the sun-side sky are `air/far.jpg` (made by `assets-src/breath/air/make-far.py` from the Builder's `mat/far.jpg`), read through an inverse of the film's tone curve (`untoned`) so it lands as painted; the rest is the closed-form dome and `sunHalo`.
- `air`, `fog`, `vapour`, `exhale`: one pass, `air/volume.ts`. The vapour of the pit is a density marched in 32 steps (`vapourRho`: a heaped body under a noisy top, wisps, a veil at the west brim, one leaning column, a pour on the north-west lip), each step shaded by 2 taps toward the sun and 1 up. Then a low mist on water and wet shelf (4 taps in a layer 2.5 m deep, none within 7 m of a lens), the far bodies (ellipsoids, small-shaft plumes), and haze in two layers (`uHaze`), the lower thick with distance.
- Light: `shared/rig.ts`, `shared/glsl.ts`. Sun (3.3, 2.25, 1.25), bearing -15, elevation 8.5. `sunCloud()` in the rig dims the sun by drifting fog banks (0.5 to 1): every part gets it through `rigShadeOn` and `sunAt`.
- Cameras: `index.ts`. `lens(pose, aperture, focus)` opens the lens at keys breath-03 (0.03, 4.8 m), breath-04 (0.075, 10.5 m), breath-05 (0.028, 6.2 m).

## Tried, and it did not work

- Bedded contour sheets for the shelf: read as a layered model, risers like contour lines. Stones scattered evenly: read as droppings. A skirt of teeth under the brim.
- Leaning the plates with the bank: a beach of smooth rock. Bed colour starting 20 cm under the tide: a band of wet sand along both banks.
- The plate picture laid square: its beds ran across every lens as wood grain. Face stone wherever the map is steep: long streaks on level ground.
- Pale gold light: the film's tone curve washes it white; it must be saturated. A grey vapour ambient squared with depth: black pit.
- Vapour lowered into the pit with nothing over the shelf: M2 fell to 6.9 and 5.8 percent at breath-0 and breath-2 (floor 8).
- A loose big stone near the breath-05 lens: an unlit black lump in front of the dead one.

## Still wrong beside the approved pictures, worst first

- `breath-0`: plates are larger and cleaner than the picture's broken shelf, some stand cream-white toward the sun; no scum line along the channel; a teal patch in the channel's deep part (water, partner's); the far shelf does not melt into glare enough on the sun's side.
- `breath-4`: no plume at the left edge and the column does not read as one column; vapour hides the far wall; the wall's upper faces are still brown; slabs at right read as smooth blocks.
- `breath-2`: the ground by the dead one is paler now but streaked, with no grit, pebbles, roots or dark blurred rock at the lower left; the pit behind is a grey veil, not lit billows.
- `breath-1`: the dark rocks at the lower edge are round boulders, not broken plate; the far bank is a thin strip; no mist round the legs in the middle distance.
- `breath-3`: the brim at the right is a smooth pale blade; no weathered bone or pebbles at the root; the top of the frond reads washed.
- Motion: only shot breath-01 was watched as a sheet at version 3 (the column stands and leans, the mist drifts). In its last frames the shade of the fog banks (`sunCloud`) crosses the pale plates near the lens as dark parallel bars: too regular, soften or widen them. Shots 02 to 05 were not watched; the exhale at frame 4652 was not re-checked. Nothing was checked at 3840 x 2160 native crops this round.

## Round 8, each severe and major issue, and what I did

- "pitch-black void lined with dark blocky geometric slabs and an extra flat-topped volcanic vent": pit rebuilt as one displaced wall with rib ledges, lit by sky disc and bounce, vapour marched inside. Closed in part; vent body removed.
- "smooth dark-brown terrain with flat painted crack lines and an artificial smooth rounded mudbank": broken plates in the mesh, banks are plate edges. Closed in part (plates too clean).
- "smooth featureless brown ridge with no cave or snow and a stiff uniform white cloud band": the far picture is the cliff, with cave and snow; band removed. Closed.
- "straight canal-like channel of opaque grey-blue water": channel winds and varies in width, bed grey-green. Water itself is the partner's. Closed in part.
- "flat pale beige light and isolated, opaque, blurry smoke puffs": gold sun, halo, glare on wet rock, marched vapour, haze. Closed in part.
- "smooth mudbank and water show coarse CG shading... overcrowded with stiff reddish-brown models": bank is broken plate; waders scattered (`NEAR_WADERS` 3 to 8). Models are the partner's.
- "out-of-focus wet foreground rock shelf... completely absent, flat deep focus everywhere": rocks under the lens and an open lens at breath-04. Closed in part (boulders, not plate).
- "flat beige light, no ground mist, and a smooth brown ridge with a stiff white fog band"; "flat cool beige light, pale featureless water, and a smooth brown ridge without the cave overhang": gold sun, low drifting mist, far picture. Closed in part.
- "glossy flat brown cracked surface with no foreground rock framing": dry pale pad with grain and dust; no foreground rock (the one I placed read as a black lump and was removed). Not reached.
- "visibly pixelated, low-resolution repeating polygonal mud-crack texture": plate picture plus wetrock grain at 1.5 m and 0.4 m. Closed in part.
- "dark charcoal-brown blocky low-poly terraces falling into near-black darkness": wall mesh from the relief, ribs pale, rust in the plate. Closed in part (no moss).
- "large, opaque, blurry bright-beige fog patch hangs across the top": removed; vapour is in the depth. Closed; steam at lower left not reached.
- "pulled-back view of smooth, blocky, flat-shaded grey-brown cliff ledges and a tall smooth mountain ridge": breath-03 key moved in and lens opened; ridge is the far picture. Rim at the right still smooth. Closed in part.
- "flat desaturated beige fog with straight diagonal light streaks"; "flat clinical lighting with harsh black shadows on the left rock and zero depth of field": streaks removed, gold backlight; lens not opened at breath-02. Closed in part.
- "sharp, dry red palm-like shrub on a smooth, stretched-texture pale ledge with sharp polygonal edges": shrub is the partner's; the ledge is now the shelf's own plates. Closed in part.
- "thin, jagged bright-white polygon and UV-seam lines": the hoops and brim ledge that had them are gone (one mesh). Not looked for at native size.
- "pitch-black angular chasm with dark flat stepped blocks and a thin beige fog strip"; "rounded slab edges and near-black gaps turn the pit into stacked set pieces": continuous wall mesh, bounce in the gaps, strip removed. Closed in part.
- "pit vapor reads as a broad blur laid over the rocks and the distant band repeats the same curled profile": marched density that the wall occludes; band removed. Closed in part.
- "ground texture is dragged into long horizontal streaks and broad smears": plate turned, far ground takes the picture's mean. Closed in part.
- "diagonal facets have softly streaked faces and thin, evenly outlined cracks that look drawn on": slabs are fractured blocks with `slabface.jpg`. Closed in part (still smooth at breath-4).
- The partner's, not mine: "flat grey-green noisy plane... almost no drips or splash"; "bright airborne splash droplets... missing; tendrils show coarse tubular geometry"; "scattered short white vertical rain streaks"; "regularly sized ripple texture".
- "water-to-land transition turns into a smooth graphic stripe without a credible wet margin": plates stand to the tide, weed line at the water. Closed in part (no scum, no lapping).
- "rock reads as molded slabs, with angular cutouts, smooth bevels and thin bright cracks": wall and shelf rebuilt from reliefs. Closed in part.
- "broad, smooth patch of mist lies across the rim with a nearly horizontal lower edge": removed. Closed.
- "shelves disappear into near-black gaps with almost no reflected light"; "texture smears over the rounded edges in broad stripes": bounce term and vapour light; stone laid in the world on faces. Closed in part, not checked at native size.
- "stretched vertical streaks and abrupt polygonal breaks"; "squared-off steps and the nearby stone detail stretches into parallel ribbons": plate edges warped and broken; the brim at breath-3 still smooth. Not closed.
- "long, parallel bands behind a straight transition": haze thick with distance. Not checked.
- Motion: "keeps one soft, blobby outline for six seconds... like a flat card"; "pops instead of welling up"; "fixed shapes, not rising, wind-sheared columns"; "same soft blob from frame to frame"; "smeared, hard-edged dark band": the pit vapour is a marched density that rises and drifts (M2 27 percent at breath-0), the dark band is gone. The exhale and the far plumes were not watched as sheets this round: unproven.

## Checks at version 3, staging, cost

- At commit 2b081e6 (code as handed back): `npx tsc --noEmit -p .` clean, `npm run -s build` passes, `npm run -s determinism` prints `determinism: pass`, `npm run -s gate -- --phase 1 --only G10` passes.
- `npm run -s measure -- --unit breath --tier draft --format hd` (hd, not uhd), keys 0 to 4: M1 0 invalid pixels; M2 26.6, 48.6, 29.2, 41.7, 93.8 percent (floor 8); M3 1.17, 1.10, 1.09, 1.39, 0.96 (floor 0.75; breath-4 is near it, the vapour softens it).
- Staged by shot: nothing. `stagedSeconds()` is not used in my folders.
- Cost, `npm run -s cost -- --key breath-0 --format uhd --tier draft --parts land shaft hoops slabs cliff sky`, one sample, 4-core VM: whole frame 23.71 s, empty frame 2.14 s. Above the empty frame: `land` 8.55 (6.21 half an hour before; not explained, three plate reads were added), `shaft` 2.79, `slabs` 2.00, `hoops` 0.96, `sky` 0.47, `cliff` 0.00. The volume pass is not itemised. My share is about 15 s against an aim of 5: not met, and worse than the first owner's 10 s frame.

## What I would do next, in order

1. Watch every shot as a sheet; check the exhale at frame 4652 wells up, and that no mist crosses a subject.
2. breath-0: break the plates further (two sizes of Voronoi), rubble in seams, scum along the channel.
3. breath-4 and breath-2: light the vapour's tops from the sun's side so it reads as billows; one clear column; open the lens at breath-02.
4. Cost: the land (plate search in the bake is not the cost; the near mesh and the shelf shader are); try `STEPS` 24 in `air/volume.ts`.
5. Delete what is no longer read: `exhaleBodies`, `BILLOWS` in `air/index.ts`; `hoop`, `slab`, `shaftWall`, `cliff` in `land/shapes.ts`; `CLIFF_FRAGMENT` and `rock.cliff` in `land/rock.ts`.
