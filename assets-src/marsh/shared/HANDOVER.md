# Blood Marsh, ground and weather: hand-over from marsh_ground_owner

Branch `agent/marsh-ground`. Folders: `src/places/marsh/shared/`, root `index.ts`, `land/`, `brine/`, `air/`. Written at minute 225 of 240.

## How each part is drawn

- **land** (`land/field.ts`, `land/mesh.ts`, `land/shaders.ts`, `land/index.ts`). One height field made on the processor (shores from stamped pools and creeks, made ragged; layered mounds; a bedded rock rise at `rel(9,-7.5)`), drawn as rings of mesh round the cameras plus two fine patches (rock foot, cell 7 cm; bank at the first camera of marsh-03, cell 2 cm, with salt lumps in the mesh). One fragment shader paints wet and dry ground, red films, rimstone pans, shore soak, crystal frill, far brine. With `#define MATS 1` it reads the Builder's pictures `mat/crust`, `mat/mud`, `mat/rock` (colour and slope) at two sizes; without it the ground is the painted one of version 2.
- **crust** (`land/index.ts`, same shader with `CRUST`). A 15 m patch round the stuck one: slabs with leaning tops in the mesh, mud between, red pooled in the mud.
- **brine** (`brine/shaders.ts`, `shared/brine-glsl.ts`). Flat strips of two metres laid only where there is brine, cut at the shore for each pixel (same line as the land). Colour by depth (rust, oxblood, black-red), a narrow sheen of the sky patched by cloud, slow swell, four ripple trains within 26 m, rings from the seep and from each dome.
- **domes**, **burst** (`brine/index.ts`). Instanced half balls that swell and tear on their own clocks; a crown (a tube thrown up in tongues), 10 drops each, three rings each.
- **sky** (`air/sky.ts`): a dome with a mottled overcast and a dark belly under the rain. **air**, **rain**, **steam** (`air/volume.ts`, `air/index.ts`): one pass after the scene: layered haze, a wide soft rain curtain at bearing 61 degrees, steam marched through `ctx.sources.steam`.
- Light (`shared/rig.ts`, `shared/glsl.ts`): sky only, no sun. Relief comes from occlusion painted in the mesh (`vPaint`), a brighter quarter away from the rain, and albedo.

## Tried and dropped (do not try twice)

- Gloss on wet flats: the grazing sheen gives back white sky and the flats turn to plaster. Fixed in `rigShade` with `(1.0 - 0.94 * rough)`; keep land roughness high.
- Voronoi block rock (spiky, then pillows). Ridge noise finer than three mesh cells (combed hair at native size).
- Grain read by height on rock faces (`p.y` in a texture coordinate) without a blur: contour lines. The strata read now has a bias of 4.5.
- Floating crust flakes on the brine (white tiles). Scum lines from stretched grain (dashes). Brine chop bent by a fast texture (marbling).
- The mud picture's slope at full strength under a sheen: wavy contour lines. It is at 0.5 now.

## Still wrong beside the approved pictures, worst first

- **marsh-4**: too much smooth mud, too few broken plates; no blood-red pool under the nearest slab edges; slabs have soft rims.
- **marsh-1**: the bank's crystal fringe is a wide grey-white band, not cream lumps with red crevices; dome still reads a little plastic; crown thin; brine paler than the picture near the lens.
- **marsh-0**: far flats pale, too few dark red bands; the near rock is better with the rock picture but its steep faces are soft and its beds too even; crust at right is flat (no lifted plate edges in the mesh); steam grainy at draft.
- **marsh-2**, **marsh-3**: ground between stalks and round the wallowers is plain; shore stains too regular.
- Far distance: the escarpment is a faint line; the rain curtain has no streaks.

## Gate G10 fails (open)

Two fresh loads of frame 5930 differ in about 50 to 70 pixels of the whole frame. `out/work/nd.mjs` and `out/work/ndcmp.py` render one part twice and count. Land alone: 0. Sky alone: 0. Brine alone: 200 to 330 pixels, each a run of 2 to 26 pixels in the first row under a far shore of the brine surface (the row above is cut away by `discard`). Brine with a constant colour: 0. Brine with a level normal: 0. With the swell only: 0. With either the ripple trains or the ring block present, fenced by distance or not, with explicit texture levels or not: it differs. Not solved. Next test: draw the brine without the depth twin (`userData.depthFragment`), then without the cut (let the land cover it with a polygon offset).

## Staged, by shot

- marsh-03: the hero dome bursts at 9.00 s (event frame 6158). A small dome bursts 0.22 s before key marsh-1. Nothing else is staged in my folders; no test of `stagedSeconds()` in land, brine or air.

## Cost at 3840 x 2160, key marsh-0, draft, seconds a sample above the empty frame

See the last table in `out/work/agent.log` and the report; measured with `npm run -s cost -- --key marsh-0 --format uhd --tier draft`.
COST_TABLE

## What I would do next, in order

1. G10 (above).
2. marsh-4: more and smaller slabs in `crustPaint`, lifted rims, red brine in the lowest mud.
3. marsh-1: narrow the fringe to a hand, bigger lumps (`knobs` at 0.2 m), use `mat/rime` on them.
4. marsh-0 far flats: more held red in the pans past 150 m, fewer white frills; a backplate for the escarpment from the Builder.
5. Rock: break the beds with joints in the mesh; use the rock picture's height to step the faces.
6. Cost: the land's two plate reads (pans, far pans) and the three-sided rock read are the first to cut.
