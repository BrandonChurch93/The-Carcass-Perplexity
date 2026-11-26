# Hand-over: the ground, shaft, vapour, sky and cameras of the Breath

From `breath_ground_owner`, branch `agent/breath-ground`, at version 3. Folders: `src/places/breath/` root (`index.ts`, `land.ts`), `shared/`, `land/`, `air/`. Wide key `breath-0`. Partner: `agent/breath-life` (`water/`, `plumes/`, `waders/`, `dead/`).

## How each part is drawn

- `land`: `land.ts` is the height of the ground (shelf, rim, channel, far flats); `land/index.ts` meshes it near and far. `land/rock.ts` SHELF_FRAGMENT: a tile baked in code (cell pavement: level in green, edge in blue) read at 71 m, 13.7 m and 2.3 m, plus `mat/shelf.jpg` and `mat/shelf-nh.png` at 6, 23 and 1.7 m. Steps are shadow and sunward rim (the tile read again toward the sun), never an outline.
- `shaft`: `shaftWall()` in `land/shapes.ts`, BONE_FRAGMENT with `uBone` 0.25 and `mat/wall`; collars of the smaller shafts. Dark with depth (`sunk`), black recess under each hoop, pale beds in the top 9 m.
- `hoops`: `hoop()` in `land/shapes.ts`, 15 broken arcs on 6 levels (`LEVELS`, `HOOPS` in `land/index.ts`) with `mat/hoop`, plus the brim ledge (4 lengths that follow the rim) with `mat/strata`. Ragged slanted ends, bites, chips, streaked faces.
- `slabs`: 10 blocks on a rubble ramp at the east-south-east (`heap()`), 6 on the terraces; `slab()` in `land/shapes.ts`, `mat/strata`.
- `cliff`: one mesh 3 km on (`cliff()`), 700 m tall, CLIFF_FRAGMENT with `mat/cliff` at 330 m and 1250 m; cave mouth cut in the mesh (`CAVE_MOUTH`).
- `sky`: `air/sky.ts`, a dome in closed form (`skyRadiance`, `sunHalo` in `shared/glsl.ts`). `mat/sky.jpg` is not used yet.
- `air`, `fog`, `vapour`, `exhale`: one half-size pass, `air/volume.ts`. Four things in it: a thin sheet marched in 12 steps on the rock round the shaft and channel; the mist in the shaft in closed form (a cylinder under a tilted, folded level); up to 32 ellipsoid bodies, each ray against ellipsoid with lumps from a baked noise block (`air/noise.ts`): columns of the smaller shafts, lip wisps, cave fog, haze layers, banks, the partner's `ctx.sources.steam`; the haze in closed form.
- `exhale`: `breathAt()` and `exhaleBodies()` in `air/index.ts`: the level in the shaft rises, six billows well up over 3 s and slide north-west, thinning.
- Light: `shared/rig.ts` and `shared/glsl.ts`. One sun (bearing -15, elevation 8.5), sky fill dimmed on faces turned from the sun, a baked land map (height, sky seen, top of the land's shadow, wet).
- Cameras: `index.ts`, one `look()` per key and offsets before and after, fitted by projection (scratch `out/work/proj.py`, not committed).

## Tried, and it did not work

- Contour-line plates in the mesh: stair-stepped outlines. Regular pits in the shelf: polka dots. Plate edges drawn by distance to the edge: cracked mud.
- Marched mist inside the shaft with jitter: speckle, white-out when the lens enters it, an opaque dome. Jitter anywhere at one sample a frame: speckle.
- Hoops taller than wide (tall = thick x 1.5): smooth bands that hide the wall. A boulder near left at the wide key. A high wide camera (24 m): looks down on a strip.
- Height of the material pictures through screen differences (`raised()`): glitter at preview size. Their slope now turns the normal directly.
- Anisotropy 8 on the material pictures: 4 s a sample more at 3840 x 2160. It is 1.
- Shelf albedo over 0.8 with a strong haze fill: reads as snow. Cave fog and banks at full sun: a white band along the horizon.
- A check that only looks for the word ERROR in a render's output: a shader that does not compile slipped through once. Check that the picture was written.

## Still wrong beside the approved pictures, worst first

- `breath-3`: no dark shaft at lower right, it is brim ledge and blocks in flat beige; no backlit steam behind the frond; the frond is flat red, without rim light; the sun's glow does not come through it.
- `breath-4`: the frond covers the left 45 percent and a pale blade of brim crosses the bottom; no fallen slab rests on a hoop in view; ledges are even grey rings, not pale broken arcs of different width with ochre stain; the mist is a soft cloud at top right, not a body that hangs lit in the left half.
- `breath-0`: the picture is pale pink beige, not gold against cold shade; the shelf has too little relief at distance and no layered plates in the foreground; the inside of the pit is too dark at the right (0.06 against 0.14 linear); no vapour pours over the near brim; fog under the cliff is still a pale band; steam columns are round; the cliff has no overhang and no cave band in view; the channel is flat grey (partner's `sea`), not green and clear.
- `breath-1`, `breath-2`: the shelf near the lens is smooth and pale where the approved one is dark, wet, layered rock with glitter; shaded faces are not yet a fifth of the sunlit ones; no low mist round the legs at `breath-1`; the brim at `breath-2` is clean blocks, not ragged layered rock with rubble.
- Native size (3840 x 2160): at `breath-4` a black speckled strip of the shaft wall shows between the shelf's edge and the brim ledge, and the shelf beside it has blurred dark blotches (the small step shadows of SHELF_FRAGMENT seen close); the ledges are matte and plain, with little grain of their own.
- Everywhere: the exhale reads as a grey lid rising in the shaft (frames 4719 to 4768), not as mass with lit tops.

## Round 8 (judged on version 2: match 2, filmed 4, motion 4), what I did with it

- Closed in part. Light: sun gold and 40 percent stronger, fill cut a fifth and cooler, orange core to the halo (`shared/rig.ts`, `sunHalo`). The shaft is no longer a black void: ledge tops take the disc of sky, faces take bounce, the wall is paler and its top 9 m pale beds. Stretched streaks: the wall's `run` read was drawn out 8 to 1, now 2.5 to 1, and the streaks on hoop faces are cut to a fifth. Skin: the material pictures replaced the drawn cracks on every surface. Shot 02 now ends over the depth of the pit with the far rim and a wader; shot 03 stops its push early with the shore beyond the frond.
- Tried, not enough. Vapour that moves: lumps drift 3 times faster and columns climb twice as fast, but each body is still one ellipsoid with one outline, so it reads as a card. The breath wells over 3 s instead of 2 and slides north-west, but it is still a soft cream blob, and the mist in the shaft a grey veil. The white band under the cliff is cut to half, not gone.
- Not reached. Shape before skin: the hoops and slabs are still smooth swept sections with bevelled ends, the banks of the channel a smooth rounded edge, the shelf has no ledges in its mesh. No bright seam lines were looked for at native size after the new materials. No depth of field (the lens is not opened in `index.ts`). No overhang on the cliff. No wet margin where water meets rock.

## Checks at version 3

- `npx tsc --noEmit -p .` clean, `npm run -s build` passes, every key writes its picture.
- `npm run -s determinism` prints FAIL: film frame 1241 (the Ribs) differs between two page loads. `npm run -s gate -- --phase 1 --only G10` prints FAIL: frame 5930 (the Marsh) differs with portable extensions only. Neither frame is in the Breath (4221 to 5617), and my branch differs from main only under the Breath's folders. Both passed at version 2, before the merges of main. I did not run them on main alone, so that it is main's is inferred, not shown.
- My own check of the Breath (scratch, `out/work/mine.mjs`, same method): frames 4409, 4731, 4973 pixel-identical across two page loads and both orders at review tier; frames 4409 and 4731 pixel-identical with portable extensions only.

## Staged by shot

Nothing. Every part is one layout for all five shots; `stagedSeconds()` is not used in my folders.

## Cost, seconds a sample at 3840 x 2160, draft, wide key, 4-core VM

Measured with `npm run -s cost -- --key breath-0 --format uhd --tier draft --parts ...`, one sample a frame, four runs at version 3 (the last one two small shader changes before the final commit).

- Whole frame: 10.1 to 10.3 s with `FINE = true` in `land/rock.ts` (the better version, committed); 9.5 s with `FINE = false` (each material picture read once). The aim was 7 s for the place, 5 s for my share. It is over.
- Empty frame (the cheapest part alone): 2.0 s. The tool never splits out the volume pass, so `air`, `fog`, `vapour` and `exhale` have no number of their own.
- Above the empty frame, `FINE = true`: `land` 2.35 to 2.43, `hoops` 0.87, `shaft` 0.31 to 0.42, `slabs` 0.06 to 0.15, `sky` 0.07 to 0.32, `cliff` 0.00. With `FINE = false`: `land` 1.81, `hoops` 0.71, `shaft` 0.20.
- Partner's parts: `sea` 0.25, `gill-plumes` 0.31, `waders` 0.07, `dead-wader` 0.00.
- The parts add up to 6.6 s with the empty frame; 3.7 s of the whole frame is in no part. Not measured, my guess: the marched sheet of the volume pass, which only runs where rock lies under the ray, so it is not in the empty frame. First thing to try for cost: `STEPS` 12 to 8 in `air/volume.ts`, or drop the sheet beyond 120 m.
- Before the material pictures (version 2): 7.75 s whole frame.

## What I would do next, in order

1. Shape before skin (round 8, first reason of 18 jurors of 25): rebuild `hoop()` and `slab()` in `land/shapes.ts` as eroded, fractured forms with a displaced silhouette, not swept sections.
2. Light: get shaded faces at keys 0 and 1 to a fifth of the sunlit ones (cut `uFill` again), then check the shelf does not go to mud.
3. `breath-3`: move the brim ledge away from under that camera (lengths in `land/index.ts`), put one lit lip body behind the frond toward the sun, darken the far wall.
4. `breath-4`: stand the camera 3 m further from bush 196, break the hoops into more and shorter arcs with different widths, lay two slabs on the second and third hoop in view.
5. Shelf: use `mat/strata` on every riser of the shelf (the `steep` term in SHELF_FRAGMENT), and real ledges in the mesh for the first 40 m round the rim.
6. Exhale: give the billows a top (the `tops` term) lit by the sun and keep them under 60 percent of the frame; pour the sheet over the near brim at key 0 (`apron` in `breathAt`).
7. Cliff: an overhang over the cave band (`cliff()` in `land/shapes.ts`), and use `mat/sky.jpg` on the dome.
