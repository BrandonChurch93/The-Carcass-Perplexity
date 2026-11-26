# The Spine: ground, light and air. Hand-over at version 3

Owner: spine_ground_owner. Folders: `src/places/spine/` root, `shared/`, `land/`, `air/`. Partner folders (strikes, kites, runners) are not described here.

## How each part is drawn

- **land** (`ridge.ts`, `land/height.ts`, `land/meshes.ts`, `land/shaders.ts`, `land/index.ts`). One layout in `ridge.ts` (crest path, spires, canal, trail); a height field baked from it; a fine strip along the crest, coarse flanks, one blade mesh a spire, a tube for the canal. One shader for all of it, drawn depth first.
  Rock, snow and canal wall are read from `public/assets/spine/mat/` (spire at 30 m, 103 m and 8.3 m; rubble at 19 m and 5 m; snow at 27 m and 4 m; canal at 4 m and 13 m), tinted by the mean, lit by the rig. Drawn slabs stay on the spires only.
- **sky** (`air/sky.ts`, `shared/glsl.ts`). A dome with an analytic sky: dusk band on the lee horizon, storm dark on the windward hand, bars of cloud from the noise volume. No picture is used.
- **air, cloud, cloud-sea, spindrift** (`air/volume.ts`, `air/index.ts`). One pass at half size over the land's depth. The storm and the cloud sea are surfaces found by walking a ray to a height or density field, then shaded as surfaces with a soft edge; no grain.
  The cloud sea takes its lumps from the blue channel of `mat/cloudsea-nh.png` at 10 km and 2.9 km and its tone from `mat/cloudsea.jpg`. Steam and smoke from `ctx.sources.steam` (first eight) are plumes down the wind. Spindrift is a layer on the ground hit.
- **light** (`shared/glsl.ts`, `index.ts`). Sky irradiance by normal, the strikes as emitters, sky seen from a point from the baked land. Exposure 1.45, bloom 0.006.
- **cameras** (`index.ts`). Five keys fitted to the approved pictures; moves between them by shot.

## Tried, and not worth trying again

- A marched volume with a jittered stride for the storm: grain at one sample, and dear.
- An additive glow pool of fixed size in metres round the bolt: a veil over the frame in the long lens. It is sized by the lens now.
- A storm wall that follows the bend of the ridge: it hides the dusk band and reads as a wall.
- A lee wall steeper than about 61 degrees: one flat slab in the wide.
- Broad spire roots under a knife crest: a grey slab out of the flank. Each spire has a buttress under it instead.
- The Heart's cliff maps on this rock: blotchy, wrong beds. Deleted.
- Drawn snow ripples and drawn black cracks: stripes. The pictures give both now.
- Drawing the depth first: it saves about 0.4 s only. Dropping the drawn slabs from the ground: 0.1 s only.

## Still wrong beside the approved pictures, worst first

- **spine-0**: the first spire stands on a dome like a tower on a hill; in the picture the ridge runs up into it as one mass with great sunlit slabs. The ground rock is streaked where it should be blocks. The mouth has a toothed lip (the ground mesh is too coarse there), a dark surround and no icicles.
  The storm has no towering billows or rain veils; its lower left still reads as a dark hill. The cloud sea is blue-grey now but streaked, not puffed. The trail of prints is faint.
- **spine-3**: the bolt is right; the spires are thin cones with little slab relief; the band is thick in the 14 degree lens; the foreground ground is mesh facets.
- **spine-2**: the spire face is the picture at 8 m and holds, but its edge against the sky is a straight line and the far spires are small.
- **spine-1**: the ground before the carcass is smooth and dark; the mouth behind is a flat black hole.
- **spine-4**: the ribs of the canal zig-zag at the mesh seams; the floor is dotted; the mouth is round and clean where the picture has hanging ice.
- Motion: see the report for what was looked at. The cut from spine-02 to spine-03 still jumps about 580 m; spine-05 does not start outside the mouth; the lenses of spine-2 and spine-3 are wider than the 300 and 600 mm notes, by choice, to hold the picture.

## Staged by shot

- Spindrift is off from the cut into spine-05 (`uStage.x`).
- `uUnder` goes to 40 at the cut into spine-05: the canal is exposed for its inside there, and its walls are black from outside in every other shot.
- Nothing else is staged. The strikes and the kites are the partner's.

## Cost at 3840 x 2160, seconds a sample (cost tool, draft, frame 7234, one sample)

COSTS

## What I would do next, in order

1. Refine the ground mesh round the mouth (a 0.5 m lattice for 60 m) and hang ice from `mat/canal` on its lip.
2. Rebuild the first spire's foot so the crest climbs into it: raise the massif on the storm side only, keep the lee face sheer.
3. Give the storm real towers: a second, larger lump field with a flat anvil base, and rain veils as streaks under it on the windward hand.
4. Use `mat/sky.jpg` for the layered cloud over the band on the lee.
5. Cut the land's cost: it is in the fragment shader's picture lookups, see the numbers above.
6. The continuity items: start spine-05 outside the mouth, move spine-03's start to where spine-02 ends.
