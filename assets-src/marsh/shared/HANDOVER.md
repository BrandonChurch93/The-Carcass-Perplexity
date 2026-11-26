# Blood Marsh, ground and weather: hand-over from marsh_ground_owner

Branch `agent/marsh-ground`. Folders: `src/places/marsh/shared/`, root `index.ts`, `land/`, `brine/`, `air/`. Written at minute 175 of 240 and brought up to date at minute 190 after the result of round 11; costs filled in at the last checks.

## How each part is drawn

- **land** (`land/field.ts`, `land/mesh.ts`, `land/shaders.ts`, `land/index.ts`). One height field made on the processor (shores from stamped pools and creeks, made ragged; layered mounds; a bedded rock rise at `rel(9,-7.5)`), drawn as rings of mesh round the cameras plus two fine patches (rock foot, cell 7 cm; bank at the first camera of marsh-03, cell 2 cm, with salt lumps in the mesh). One fragment shader paints wet and dry ground, red films, rimstone pans, shore soak, crystal frill, far brine. With `#define MATS 1` it reads the Builder's pictures `mat/crust`, `mat/mud`, `mat/rock` (colour and slope) at two sizes; without it the ground is the painted one of version 2.
- **crust** (`land/index.ts`, same shader with `CRUST`). A 15 m patch round the stuck one: slabs with leaning tops in the mesh, mud between, red pooled in the mud.
- **brine** (`brine/shaders.ts`, `shared/brine-glsl.ts`). Flat strips of two metres laid only where there is brine, cut at the shore for each pixel (same line as the land). Colour by depth (rust, oxblood, black-red), a mirror of the sky only where the view skims it (patched by cloud, read with `textureGrad`), a bright meniscus line along every shore, two crossing swells that travel far off, slow swell, four ripple trains within 26 m, rings from the seep and from each dome.
- **domes**, **burst** (`brine/index.ts`). Instanced low caps with a thin pink skin, grit in it and a foot that runs into the pool; each swells on its own clock, then tears open from one side over ten frames (`TEAR`, hole cut with `discard`, dark rolled rim) while it sags; a crown (a tube thrown up in tongues) and 10 drops leave when the skin is half open; three rings from each burst and two from each swelling dome.
- **sky** (`air/sky.ts`): a dome with a mottled overcast and a dark belly under the rain. **air**, **rain**, **steam** (`air/volume.ts`, `air/index.ts`): one pass after the scene: layered haze, a wide soft rain curtain at bearing 61 degrees, steam marched through `ctx.sources.steam`. The rain shaft drifts and its sheets fall; steam rises and wanders.
- **cameras** (`index.ts`): the five keys and their moves; lens openings (`focus`, `aperture`) on marsh-1, marsh-2, marsh-3 and marsh-4 for a shallow depth of field.
- Light (`shared/rig.ts`, `shared/glsl.ts`): sky only, no sun. Relief comes from occlusion painted in the mesh (`vPaint`), a brighter quarter away from the rain, and albedo.

## Tried and dropped (do not try twice)

- Gloss on wet flats: the grazing sheen gives back white sky and the flats turn to plaster. Fixed in `rigShade` with `(1.0 - 0.94 * rough)`; keep land roughness high.
- Voronoi block rock (spiky, then pillows). Ridge noise finer than three mesh cells (combed hair at native size). Sharp bed steps in a 7 cm mesh (saw teeth along every ledge): beds are 0.34 m with soft risers now; a finer rock patch or steps cut in the mesh along the beds is the real answer.
- A sheen (rough under 0.6) on rock or mud that carries a slope picture: wood-grain squiggles of white sky.
- Grain read by height on rock faces (`p.y` in a texture coordinate) without a blur: contour lines. The strata read now has a bias of 4.5.
- Floating crust flakes on the brine (white tiles). Scum lines from stretched grain (dashes). Brine chop bent by a fast texture (marbling).
- The mud picture's slope at full strength under a sheen: wavy contour lines. It is at 0.5 now.

## Round 11 (failed: match 2, filmed 4, motion 4): what I closed, tried, and did not reach

- Closed or moved, see it in `out/work/compare/`: domes no longer swapped for dots in one frame (tear over ten frames, sag, grit, thin skin); brine oxblood and darkest tone at marsh-1, mirror only at grazing, meniscus line at shores, rings spread and fade; haze thicker (`AIR.density` 0.00048), far mounds low and round past 110 m (no mesas); rain shaft drifts, steam moves faster; shallow depth of field at four keys; material pictures on crust, mud and rock with no warp (the warp of 0.8 m made the stretched look at the thin crust); G10.
- Tried, only half there: the near rock (beds 0.34 m, soft risers, red taken out of the hollows) is still a smooth eroded lump; the dome is still a clean cap, its foot shows a faint line; the crown is a thick sheet, not a thin jagged one.
- Not reached: fractured rock ledge in the mesh; foam and small bubbles at the lower left of marsh-1; a crusty shoreline of cream lumps at the bottom of marsh-1; wet edge, meniscus and wake at each body and stalk (needs the partner's anchors passed to the brine); depth seen through the shallows; steam as layered plumes; granular salt without cones at marsh-4; broken plates over red pools at marsh-4; contact shadows and wet highlights at marsh-3; M3 fine detail at marsh-0 (0.37 against 0.75).

## Still wrong beside the approved pictures, worst first

- **marsh-4**: smooth mud round the stuck one, too few broken plates, no blood-red pool under the nearest slab edges; the near mound is a smooth lump.
- **marsh-0**: flats pale and low in fine detail; near rock soft, no craggy beds, no white rind at the waterline; crust at right flat (no lifted plate edges in the mesh); far distance still ends in a faint line.
- **marsh-1**: bank fringe is a wide grey-white band, not cream lumps with red crevices; no foam, no small bubbles; dome too clean; crown thick.
- **marsh-2**, **marsh-3**: ground between stalks and round the wallowers is plain; no wet edge where a body or stalk stands in the brine; steam an even veil.

## Gate G10 (failed at version 2, fixed)

Two fresh loads of frame 5930 differed in 50 to 70 pixels, all in the first row of brine under a shore. Cause: `brineShade` read the sky's cloud patch at a place taken from the mirrored ray, so the renderer sized that read from the ray in the neighbouring pixels; in pixels cut away by `discard` the software renderer does not work out values set inside an `if` or a loop, and the size was different on every load. Fix: `textureGrad` with the slope of the place itself (`shared/brine-glsl.ts`). Rule for every shader of the place: after an early `discard`, never let the renderer size a read whose place comes from values set inside an `if` or a loop. `out/work/nd.mjs` with `out/work/ndcmp.py` renders one part twice and counts the pixels that differ.

## Staged, by shot

- marsh-03: the hero dome bursts at 9.00 s (event frame 6158). A small dome bursts 0.22 s before key marsh-1. Nothing else is staged in my folders; no test of `stagedSeconds()` in land, brine or air. The lens openings are camera settings in `index.ts`, the same in every frame of a shot.

## Cost at 3840 x 2160, key marsh-0, draft, seconds a sample above the empty frame

Measured at minute 192 with `npm run -s cost -- --key marsh-0 --format uhd --tier draft` (one sample a frame, each part alone, the empty frame 1.74 s taken off).

- Whole frame with the partner's parts: 11.25 s (aim 7). With `MATS = false` in `land/shaders.ts` (the painted ground of version 2): 9.93 s.
- land 4.13 (2.18 with `MATS = false`), crust 0.99 (0.41), brine 0.74, sky 0.36, burst 0.12, domes 0.05. Air, rain and steam are one pass after the scene and sit inside the empty frame. Mine together 6.39 against a share of 4.5; the pictures on the ground are the better look, the constant keeps the cheaper one.
- Partner, for the sum: stalks 1.25, dead 0.76, wallowers 0.75, insects 0.09, fliers 0.00.

## Checks at hand-over

`npx tsc --noEmit -p .` clean, build passes, gate G10 passes, two fresh loads of marsh frame 5930 differ in 0 pixels. `npm run -s determinism` prints FAIL: its film frame 1241 (before the marsh's first frame 5618, so another place) differs in 500 of 518400 pixels; its late frame 11386 and loop frame 288 are identical. Not in my folders, not fixed by me.

## What I would do next, in order

1. marsh-4: more and smaller slabs in `crustPaint` with lifted, broken rims; red brine standing in the lowest mud; salt as grains from `mat/rime`, not cones.
2. Near rock: a finer patch (cell 2 cm) with the beds cut as steps along joints; the rock picture's height to break each face; a white rind at the waterline.
3. Brine at bodies and stalks: pass the partner's anchors (`shared/anchors.ts`) to the brine for a meniscus, a wet dark band and slow rings at each.
4. marsh-1: narrow the fringe to a hand, bigger lumps (`knobs` at 0.2 m) with `mat/rime`; foam and small bubbles as instanced caps along the bank; a thinner crown with more, finer drops.
5. marsh-0: fine detail on the flats (M3): the crust picture at a third scale near, more held red in the pans past 150 m; a backplate for the far hills from the Builder.
6. Steam as three or four separate plumes with their own sources. Cost: the land's two plate reads and the three-sided rock read are the first to cut.
