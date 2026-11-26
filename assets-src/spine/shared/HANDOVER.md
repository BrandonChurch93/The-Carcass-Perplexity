# The Spine: ground, light and air. Hand-over at version 3

Owner: spine_ground_owner. Folders: `src/places/spine/` root, `shared/`, `land/`, `air/`. Partner folders (strikes, kites, runners) are not described here.

## How each part is drawn

- **land** (`ridge.ts`, `land/height.ts`, `land/meshes.ts`, `land/shaders.ts`, `land/index.ts`). One layout in `ridge.ts` (crest path, spires, canal, trail); a height field baked from it; a fine strip along the crest, coarse flanks, one blade mesh a spire, a tube for the canal. One shader for all of it, drawn depth first.
  Rock, snow and canal wall are read from `public/assets/spine/mat/` (spire at 30 m, 103 m and 8.3 m; rubble at 19 m and 5 m; snow at 27 m and 4 m; canal at 4 m and 13 m), tinted by the mean, lit by the rig. Ground cliffs use the rubble picture at 23 m and 67 m. Drawn slabs stay on the spires only.
- **sky** (`air/sky.ts`, `shared/glsl.ts`). A dome with an analytic sky: dusk band on the lee horizon, storm dark on the windward hand, dark over the band, bars of cloud from the noise volume. No picture is used (`mat/sky.jpg` is not loaded).
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
- The canal picture with its flutes round the canal: zig-zag rings. Along the canal at 4 m: long streaks to the vanishing point. It is at 21 m now.
- The spire picture turned on its side for the ground's cliffs, or upright on them: stripes either way.

## Round 9 (judged on version 2: match 3, filmed 2, motion 4), the order given, and where each stands

1. Textures pulled long, spires alike. Tried: ground cliffs and the rock over the mouth moved from the jointed spire picture to the rubble picture, measured along the slope; the snow drifts taken off the steep flanks and the gullies made broader (`land/height.ts`: these waves, 16 m across and 52 m long, were the long streaks, not a picture); spires 6 to 15 given unlike breadth, height and lean (`ridge.ts` TABLE). Better, not closed: streaks remain on the near right flank of spine-0, and the spire face close up (spine-2) is still the spire picture sheared along the lean. `ANISOTROPY` is 1.
2. Strikes that light the place. The partner raised the strikes' cast five times (CAST 2600); with it `EMITTER_CAST` is 0.07 (was 0.04), the storm's flash counts 2.6 times on what it lights, the cloud has a violet pool round the channel. At the keys the storm, the first spire and the snow take the light. Not reached: the cave taking the flash (the canal is lit by its mouths only, `skyOpen` in `shared/glsl.ts`).
3. Cloud that moves. Tried: storm billows drift at 16, 34 and 52 m/s by size and rise; the cloud sea's two layers run at 38 and 74 m/s across each other. Looked at on one held sheet of twelve small frames over 6 s at spine-0: the storm's billows change shape and place, the cloud sea's movement is hard to see at that size. Not judged at 4K or in the long lens. Air between far peaks: not reached (the haze is one term near the end of `volume.ts`).
4. Canal. Tried: wall beds along the canal at 21 m with the 6 m picture under them, floor as dark ice with snow banks from the snow picture, light 7 m into the mouth. The wall is still one picture on a smooth tube and smears near the lens. Not reached: icicles, slabs as geometry, the rising snow approach beyond the mouth.
5. Snow. Not reached beyond the snow picture at 27 m and 4 m: drifts are still smooth blankets and the prints an even line.
- Steam from `ctx.sources.steam` is drawn in the air pass (first eight sources) and was seen on the struck tips in the keys.

## Still wrong beside the approved pictures, worst first

- **spine-0**: the first spire stands on a dome like a tower on a hill; the picture has the ridge running up into it as one mass with great sunlit slabs. The storm has no towers or rain veils. The mouth is a clean dark arch with an arch line over it and no ice. The cloud sea is streaked, not puffed.
- **spine-3**: the two spires are cones on mounds with no near wall on the left; the band is thick in the 14 degree lens; snow lies as blankets.
- **spine-2**: one plane of mottled rock with a straight edge against the sky; far spires small and apart.
- **spine-1**: the ground before the carcass is level, banded and dark; no trail down to it, no wet stone.
- **spine-4**: a smooth tube, no slabs or icicles; beyond the mouth a level plain where the picture has a snow slope and a blade.
- Motion: the cut from spine-02 to spine-03 jumps about 580 m; spine-05 does not start outside the mouth; the lenses of spine-2 and spine-3 are wider than the 300 and 600 mm notes, by choice.

## Staged by shot

- Spindrift is off from the cut into spine-05 (`uStage.x`).
- `uUnder` goes to 40 at the cut into spine-05: the canal is exposed for its inside there, and its walls are black from outside in every other shot.
- Nothing else is staged. The strikes and the kites are the partner's.

## Cost at 3840 x 2160, seconds a sample (cost tool, draft, frame 7234, one sample)

- Whole frame with the partner's parts: 10.36. The aim was 7; it is not met.
- land: 5.75 above the empty frame (7.28 drawn alone). Not cut: 5.4 at version 2.
  Where it goes, by taking the shader apart: about 2.5 in triangles and the depth pass (a flat colour costs this), 1.1 in the rig's light, 1.8 in the picture lookups.
- sky: 0.53. air, cloud, cloud-sea, spindrift: one pass at half size, inside the 1.54 the tool reports as the empty frame; not measured apart.
- Kept behind constants: `SPIRE_MID` in `land/meshes.ts` ([170, 440] is the finer mesh on the spires beside the first, +0.3); `ANISOTROPY` in `land/index.ts` (4, +1.75); `SLABS_ON_GROUND` in `land/shaders.ts` (true, +0.1); `DEPTH_FIRST` in `land/index.ts` (false, +0.4).
- The partner's parts at this frame, before their last bundle: runners 0.80, kites 0.42, strikes about 0.1.

## Checks at hand-over

- `tsc` and the build are clean. Two fresh loads of spine-0 and spine-4 are pixel-identical.
- `npm run -s determinism` fails at film frame 1241 and gate G10 at frame 5930, G8 on `public/assets/breath/waders/`: none is a Spine frame or file (1241 is the Ribs, 5930 the Blood Marsh); they came in with a merge of main and were not traced. All three passed on version 2.

## What I would do next, in order

1. Refine the ground mesh round the mouth (a 0.5 m lattice for 60 m) and hang ice from `mat/canal` on its lip.
2. Rebuild the first spire's foot so the crest climbs into it: raise the massif on the storm side only, keep the lee face sheer.
3. Give the storm real towers: a second, larger lump field with a flat anvil base, and rain veils as streaks under it on the windward hand.
4. Use `mat/sky.jpg` for the layered cloud over the band on the lee.
5. Cut the land's cost in its triangles first: the crest strip is 2.5 m a row for 1100 m and shades nothing finer than the pictures give.
6. The continuity items: start spine-05 outside the mouth, move spine-03's start to where spine-02 ends.
