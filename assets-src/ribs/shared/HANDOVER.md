# Hand-over of the Ribs: shared, root, land, air

Owner until version 3: `ribs_ground_owner`, branch `agent/ribs-ground`. Partner: `ribs_sea_owner` (`sea/`, `wings/`, `drowned/`).
Written before the last checks of version 3. Numbers are measured unless a line says otherwise.

## How each part is drawn

- `land` (floor): `land/height.ts` (`bed`) is the one height of the floor, baked by `shared/rig.ts` into `tLand` (4.9 x 4.8 m cells) plus the tile `tBedFine`. The bed lies mostly under `LEVELS.pool`, so the partner's pool sheet covers it and the bars stand out. `GROUND_FRAGMENT` in `land/shaders.ts`: `mat/flat.jpg` at 4 m and 19 m, my own `land/shingle.jpg` on the bars, a wet film that mirrors `skyCloud`. Also under `land`: the mirror decal of each blade on a plane at pool + 0.03 (`MIRROR_FRAGMENT`).
- `ribs` (blades): `layout.ts` gives spine and radii (`radii()` slims all but `L1` and `S`); `land/shapes.ts` `bladeShape` and `relief` break the outline at three scales. `ROCK_FRAGMENT`: `mat/bone.jpg` at 12 m and 57 m with my own beds, courses, lichen, white runs, damp and the black band under `LEVELS.tide`.
- `weed`: skirts on each blade (`skirtShape`, tiers of 7.5 m from `weedTier`, 84 rows on `L1`), `WEED_FRAGMENT` with `mat/weed.jpg` at 8 m and about 40 m; `WEED_VERTEX` stirs the hems by `uTime`.
- `ledges`: the colony buttress `S`, treads at exact tier heights (`COLONY.step` 2.1 m). Same rock shader with `uTier > 0`: `mat/ledge.jpg`, one course a tread.
- `rocks`: instanced `boulderShape` in three grades, `BOULDER_FRAGMENT` with `mat/rock.jpg`; big ones are weed-grown. Strewn by noise, before each floor key by camera pose, round every blade foot, and as weed heaps in the water before the wide lens. Each big one has a contact disc.
- `sky`: a dome in `air/index.ts`; `skyCloud(from, d)` in `shared/glsl.ts` lays `mat/sky.jpg` by heading and height, turning 0.2 degrees a second; bright parts are multiplied up so the break burns.
- `air`: one volume pass, 8 steps, in `air/index.ts`; density two layers (`uAir`), light `uHaze` plus sun with a forward lobe; sources come through `ctx.sources`.
- `cloud`: no geometry of its own: the drifting cloud shadow (`cloudShade`, a baked mask plus one bright break) in `shared/rig.ts`.
- Light: `SUN` in `shared/anchors.ts` is low and from the right (yaw 58, pitch 20 degrees; the sky break stays at yaw 36), sky fill in `shared/rig.ts`. `rigShade` and `rigOut` in `shared/glsl.ts`.

## Tried and did not work

- Sun behind the camera: even grey, no glare. Sun ahead at yaw 36 (version 2): glare, but every face toward the lens unlit, judged flat and dull in round 10. Now at the side.
- Cutting the sky fill by half with the sun ahead: everything facing the lens went black. The fill was raised instead (about 1.65 times the first value).
- Finding the bars before the wide camera by noise alone (`out/work/bedfit.ts`): no bar came to the right of the lens. They are laid by hand (`LAID` in `land/height.ts`).
- Wet film thresholds tight to the pool level: the floor read as dry pebbles. The bed was lowered under the pool instead.
- The forward lobe of the air at 2.2: the near right blade washed out to white. Now 0.8.
- The first generated rock, weed, sand and storm pictures and the copies of the Heart's boulder: replaced by the Builder's `mat/` pictures and deleted.
- `--diag solo` shows a part unoccluded and dim. It is not how the part sits in the frame.
- A `discard` before a picture read in a fragment shader: the mip level at the cut edge changes from render to render and determinism fails (the partner found it in the pool sheet). Keep every `discard` on the last line, as in `MIRROR_FRAGMENT`.
- Weed heaps as plain weed-grown boulders: they read as brown domes. They are now squashed, sunk and darkened; proper lumps would be better.

## Still wrong beside the approved pictures, worst first

- ribs-0: the blades are dark horns with faint beds and a lit right edge; the approved ones are pale sunlit arches that close, with orange lichen and broken stacks. This is the largest gap: shape first, then light.
- ribs-0: the water sheet is still too clean and too large. Few weed heaps, no braided runnels across the near floor, the bar on the right is one even field of shingle with dark dots for stones.
- ribs-0: the near cliff `L1` has weed in pillowed tiers, not hanging ropes; its pale ledged top is brown and striped.
- ribs-0: middle and far blades are flat cut-outs in haze: no arch, no pierced stack, no second outline behind.
- ribs-3: the colony is brown with regular treads and vertical streaks; the approved one is pale with white runs and orange lichen, irregular.
- ribs-1: the weed behind the drowned is one dark mass with little colour; the rock top is not in frame.
- ribs-2: the heap at the left is a brown dome with one even texture; the sky behind the feeders is flat, no glare behind them (the sun lies outside the frame).
- ribs-4: the cliffs left and right are dark and even; the floor is a dark sheet with few stones.
- ribs-0 at native size: the top of `L1` reads as shaggy brown strands, not rock; the shingle bar is one relief pattern at one scale.

## Round 10 (judged on version 2: match 2, filmed 3, motion 5), item by item

- Invalid pixels (M1) at 1241 and 2081: on the current tree `still --diag invalid --tier final --format uhd` showed none at ribs-0 and at ribs-1 (00:30 UTC, final tree; I read the diag picture as one even grey, which I take to mean no pixel is marked). Cause as far as known: the partner's shaders read pictures after a `discard`; my mirror decal had the same fault and is fixed. A full `measure` at final uhd did not finish in 8 minutes and was stopped: run it first.
- Light: tried and changed. Sky is now the dark storm picture `mat/sky.jpg` with its bright parts multiplied up; the sun moved again, to the right side (58 degrees right of north, 20 up), so right flanks are lit. Not reached: sunlit arch faces as in the approved picture; the colony and the bore keys now lie mostly in shade.
- Rock textures (smeared, tiled, fur-like): tried. All rock, weed, flat and boulders now read the Builder's `mat/` pictures at two scales. Still mapped by the surface's own coordinates, not on three axes, so stretch remains on steep relief; faceted outlines not touched.
- Blades as closing arches: not reached. The layout is still single horns; no arch, no window stack.
- Flat: tried. Weed heaps in the water, rubble at blade feet, contact rings weaker, blade mirror thinner. Not reached: pebble beds blended in, rivulets, the cross-hatched bump (two rotated scales of one normal picture).
- Kelp wall (ribs-1): only recoloured by `mat/weed.jpg`. No straps, no running water, no drops.
- Colony as a stepped cliff seen along its face: not reached (needs the camera and the buttress shape).
- Cloud moves in the held frame: changed (0.35 degrees a second, warp works four times faster). The grid in the sky: the air's per-pixel jitter is halved, not removed; the volume is drawn at half size, which is where the grid comes from.
- Pushing: GitHub refused my pushes from 00:16 UTC (no credential in the sandbox). Commits after `2290395` went to the director as a bundle.

## Staged by shot

Nothing of mine is staged by time or by shot. Three things are placed by a key camera's pose and stay for the whole film: the small stones strewn before the lens of ribs-02, ribs-04 and ribs-06, the weed heaps before ribs-02, and the bars laid by hand before ribs-02.

## Cost, seconds a sample at 3840 x 2160, key ribs-0, draft tier

Measured 00:34 UTC on the final tree with `npm run -s cost -- --key ribs-0 --format uhd --tier draft --parts ...`, each part alone less the empty frame (1.93 s). Runs differ by about 0.1 s a part.

- Mine, 3.44 in all (share 4.5): `land` 1.39, `ribs` 1.24, `rocks` 0.52, `weed` 0.23, `sky` 0.06, `ledges` 0.00. `air` and `cloud` are not listed by the tool: they ride in the empty frame and in each part's shading.
- Partner, 4.52 in all (share 2.5): `sea` 1.83, `runnels` 1.31, `kite-wings` 1.30, `surf` 0.04, `bore` 0.04, `drowned` 0.00.
- The whole frame: 10.05 s against the aim of 7.

No cheaper version sits behind a constant: nothing of mine was built over its share.

## What I would do next, in order

1. Run the full `measure` at final uhd and close M1 for certain. Then tune `SUN` (now at the side), the fill and `uHaze` together on ribs-0 until the blade faces are sunlit as in the approved picture.
2. Break the water sheet: more bars and islets in `bed`, weed heaps as proper lumps (`weedLump`), runnels.
3. `L1`: hang the weed as ropes (long narrow strips from `skirtShape`), pale ledged rock above the tide band.
4. Blades: an arch between two blades and broken stacks at the feet as real geometry; a second row behind in the haze.
5. Colony: irregular treads, white runs by `mat/ledge.jpg` height, lichen in patches.
6. Ask the Builder for a far backplate of blades in haze for ribs-0 and ribs-4.
7. Bring the whole frame from 10 s toward 7: the pool sheet and the sea are the largest; of mine, the floor (two pictures at two scales plus the mirror of the sky) and the blade rock.
