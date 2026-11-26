# Hand-over: the ground, shaft, vapour, sky and cameras of the Breath

From `breath_ground_owner_3`, branch `agent/breath-ground-3`, at version 3 (Phase 4, wave 3, the last owner). Folders: `src/places/breath/` root (`index.ts`, `land.ts`), `shared/`, `land/`, `air/`. Wide key `breath-0`. Partner: `agent/breath-life-3` (`water/`, `plumes/`, `waders/`, `dead/`).

## How each part is drawn

- `land`: `land.ts` gives the height, as before (`smoothGround`, `bedded` Voronoi plates, `ground` with the plate relief, the pad `padAt`, the dark rocks `lumps`). New: the channel floor is sunk under the breath-04 lens (x -58.5 to -38.5, z -44.5 to -19.5) so water covers it. `land/field.ts` bakes height, shadow, slope, stones and pool film over `FINE`. Shader `SHELF_FRAGMENT` in `land/rock.ts`: grain laid on three planes by the surface direction (no stretch on steep faces), a finer octave near the lens, a dark wet band along the waterline, bed `vec3(0.21, 0.32, 0.3)` under the tide. The pad under the dead one: pale warm rock from `mat/drypad`, joints from the `mat/pebbles` tile at 5.3 m (`padCrack`), damp hollows (`padLow`), grit at 0.31 m.
- `shaft`, `hoops`: one displaced wall (`land/wall.ts`, `land/ribs.ts`). The first rib lies 1.7 m under the brim, each tier has its own reach and profile. `WALL_FRAGMENT`: three-plane grain, ribs pale, the wall between ribs darker with depth, rust runs and green damp by bearing and depth. The collar at the brim is lobed.
- `slabs`: fallen blocks (`boulder()` in `land/shapes.ts`, `rock.bone`) in the pale grey-cream of the rim, on a rubble fan (`heap()`, `talusHeight`) at bearing 108 to 112 degrees whose head lies 11 m under the brim; each block has a contact shade on the heap.
- `cliff`, `sky`: `air/sky.ts`. The far scarp is `air/far.jpg` read through `untoned`; `farPicture` tones its white patches to pale rock (knee at luminance 0.15 to 0.26) and darkens the whole cliff to 0.8. No mesh for the cliff any more.
- `air`, `fog`, `vapour`, `exhale`: one pass, `air/volume.ts`, `STEPS` 16. `vapourRho`: a fog layer that fills the shaft, high on the west (top near `uBreath.x + 2.5`), 12 m lower in the middle and east so the core stays dark; three columns that well up out of it at (-19, -9), (-10, 11), (-2, -5); a pour over the west lip; a torn mist layer on the wet shelf. `vapourNear(p)` skips steps where none of these can be, before the land is read. Light: warm ambient that falls with depth cubed, the sun on the side that faces it.
- Light: `shared/rig.ts`, `shared/glsl.ts`, unchanged: sun bearing -15, elevation 8.5; `sunCloud()` dims it by drifting banks.
- Cameras: `index.ts`. breath-01 `look([-41.5, 11, 42.3], 21, -15, 50)`; breath-02 `look([-8.6, 4.4, 31.2], 13, -25, 50)`; lenses open at breath-03 (0.02, 4.8 m), breath-04 (0.04, 10.5 m), breath-05 (0.012, 6.2 m).

## Tried, and it did not work

- A rib that roofed the pit near the breath-02 lens: read as a tent; removed. Vapour as one heaped body: a lump; as thin columns only: a wisp in a clear shaft.
- The heap of fallen slabs with its head at the brim: a wall of cream blocks filling a fifth of breath-4; at 8.5 m under the brim still a heap in the lens; 11 m and narrower is what stands.
- Fallen slabs in tan: read as clay. Blocks squared off harder: read as cut stone.
- The far cliff with its white left in: read as snow at every tone tried above luminance 0.2.
- GLSL names `round` and `patch` do not compile. Renders in the background are killed.
- Fog ambient at (0.265, 0.24, 0.212) with a 34 m fall: the left of breath-4 measured 75/66/58 against the picture's 102/90/81 and the core 74 against 50.

## Still wrong beside the approved pictures, worst first

- `breath-0`: the shelf by the channel is larger, smoother plates than the picture's many broken, partly drowned shelves; the pit shows little fog from this side (the east stands low) and one pale square of vapour between two tiers; the right edge has almost no fallen rock now.
- `breath-4`: the heap at the lower right is still a pile of rounded cream blocks, not two slabs on a mid shelf; the wall between ribs has regular vertical flutes; the fog column has a soft even edge; no glints on the far water (partner's water).
- `breath-2`: the pad is even and a little dark (101/89/81 against 110/95/85), with few loose stones and no lit edges toward the sun; the tier recesses behind are brighter than the picture's.
- `breath-3`: the brim at the right is soft under the open lens; the base under the plants is coarse dark rock, no pebbles; the engine's blur leaves a pale outline on the rock silhouette.
- `breath-1`: the foreground boulders are round and stand as a strip; mist round the legs is thin.
- Motion: all five shots watched as sheets at 07:42. In breath-02 after frame 4768 the column crosses the left third as a pale diagonal with a straight edge. The exhale at frames 4650 to 4661 was not re-checked after the fog change. `sunCloud` bars were not re-checked. Nothing was looked at in native 3840 x 2160 crops in the last hour.

## Round 2 of wave 3, each severe and major issue, and what I did

- "A wide, gray-brown pool replaces much of the broken pale rock pavement ... target has a discrete blue-green channel": bed made blue-green, wet band at the waterline, floor sunk where it stood dry. The water is the partner's (its sheet let the bed through at some frames; they have a cure). Closed in part.
- "opens farther left and takes up more of the frame. Straight vertical fluting and neat ledges make it read as a stepped quarry": tiers given their own reach and profile, stains by bearing; breath-01 pose moved. Flutes remain. Closed in part.
- "A dry-looking, continuous, finely patterned slab ... straight edge makes a prominent diagonal boundary"; "fur-like or carpet noise texture ... thin hard line with a brown seam": pad redrawn from `drypad` with joints, hollows and grit; carpet noise removed. Closed in part (still even).
- "straight, terraced vertical cut rather than an angled wall with thick, pale, rounded layers ... broad gray veil hangs across the middle": ribs thickened and paled over dark recesses; veil replaced by fog that stands in the pit with columns. Closed in part.
- "Broad, clean, nearly flat shelves run across the front right ... The far cliff also sits higher": lens opened to 0.02; cliff not moved. Not closed.
- "Cool gray haze forms a broad horizontal blanket rather than warm, localized plumes": the pale level band is the far shelf and sea through the open lens, not fog; the vapour is now columns lit warm. Closed in part.
- "a near ledge below it" (breath-4 left rim): breath-02 key moved to the south rim, the tent rib removed. Closed.
- "wider, more open amphitheater of thin jagged benches and repetitive fluted walls ... prominent brown blocks"; "clean box-shaped slabs with straight edges and flat faces read as placed primitives": blocks made pale rim rock, smaller, dropped 11 m into the pit. Closed in part (no single large slab on a shelf).
- "gray veil is spread through much of the pit ... defined steam columns ... a much darker core": fog high on the west, three columns, core darkened by number. Closed in part.
- "prominent pale far slope and muted water strip ... lacks the strong warm glints": cliff darkened to 0.8; glints are the water's. Closed in part.
- "the rock is soft, pale and smeared like clay ... texture is stretched across the tilted faces"; "faceted planar faces with texture stretched": three-plane projection on shelf, wall and blocks, finer grain near the lens. Closed in part (facets remain on near plates).
- Major: "cliff is sharper and more heavily white-streaked, and a broad horizontal fog blanket": white toned to rock; blanket replaced by the torn mist layer. Closed in part. "flat grey veil with no internal structure and no light in it ... a visible straight line": mist top heaped and torn by noise, lit by the sun's side. Closed in part. "melted clay or plastic ... waxy sheen, one material"; "pale glossy mineral crust, ochre flow marks, dark green damp patches": rust runs and green damp added; no glossy crust. Closed in part. "coarse bare dark rock rather than ... mixed warm stone, damp grit, rounded pebbles": not reached. "bright halo outline runs along the rock silhouette": the engine's blur; not mine to change. "mist silhouette and density shift noticeably from one frame to the next" (4650 to 4661); "breath-03 and breath-05 mist static"; "distant cliff clouds" frozen: the vapour is now a fog layer and columns cut from drifting noise in place of the old bodies, so it moves in every shot (M2 below); the boil at the exhale was not checked on a held sheet. Not closed.
- Minor: "perfect circular disc sits on the surface like a placed prop": collar lobed. Closed in part.

## Checks at version 3, staging, cost

- At the handed-back commit: `npx tsc --noEmit -p .` clean, `npm run -s build` passes, `npm run -s determinism` prints `determinism: pass`, `npm run -s gate -- --phase 1 --only G10` passes.
- `npm run measure -- --unit breath --tier draft` (uhd), keys 0 to 4: M1 0 invalid pixels; M2 22.4, 52.4, 28.0, 59.2, 68.1 percent (floor 8); M3 1.11, 1.43, 1.79, 2.03, 3.25 (breath-4 is over 3: the fog's grain at draft adds to it) (floor 0.75).
- Every key rendered once at `--tier final`, hd (50 to 63 s each): no difference in kind from draft.
- Staged by shot: nothing. `stagedSeconds()` is not used in my folders.
- Cost, `npm run -s cost -- --key breath-0 --format uhd --tier draft --parts land shaft slabs hoops`, one sample: whole frame 23.71 s, empty frame 3.47 s; above the empty frame `land` 8.34, `shaft` 1.75, `hoops` 0.90, `slabs` 0.00. Received at 24.76 s whole. Saved: the march (32 steps to 16, early-out before the land is read, a lower roof), the cliff mesh, dead bodies of the old exhale. The land shader is the dearest part and was not cut: its three-plane grain costs what the march saved. The aim of 5 s for my share is not met.

## What I would do next, in order

1. Hold a sheet on the exhale (frames 4640 to 4670) and on breath-03 and breath-05: the fog must drift visibly and must not boil.
2. breath-4: one large pale slab angled across a mid shelf in place of the heap's upper blocks; break the wall's flutes with the tier's own noise.
3. breath-0: a second, smaller size of plate along the channel, half drowned; raise the fog on the east so the pit reads full from the west.
4. breath-2: loose stones and lit edges on the pad; darken the recesses (100/86/75 against 55/52/47).
5. Cost: in `SHELF_FRAGMENT`, read the three planes only where the slope needs them (one plane on level rock).
