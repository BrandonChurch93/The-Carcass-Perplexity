# The Reveal · the rise to orbit · `reveal_owner` · branch `agent/reveal-place`

Read the attached shared sheet `PLACE-OWNERS.md` first: it is the contract. This is what is yours.

- Your place: `reveal`. Its approved pictures: `references/approved/7-reveal/`. Its text: `kit/02-SUBJECT.md`, section 4, "The reveal · `reveal`". Its pictures in words: `references/drafts/NOTES.md`, lines 1038 to 1472.
- Your branch: `agent/reveal-place`. Your looks branch: `agent/reveal-place-looks`.
- Your folders under `src/places/reveal/`: all of `src/places/reveal/`. `handoff.json` is not yours to change (see below). `continent.json` and `rise.json` are yours.
- Your parts: `sea`, `continent`, `salt`, `lake`, `lava`, `vapour`, `storm`, `cloud`, `cyclone`, `space`, `atmosphere`.
- Your wide key: `reveal-4`. Keys that show your work: `reveal-1`, `reveal-2`, `reveal-3`, `reveal-4`: four heights of one rising camera.
- Your share of the cost: the whole 7 seconds for one sample at 3840 x 2160 at key `reveal-4`.

## You build the whole place

1. **The foundation, pushed by minute 35.** By recipe 5: copy the Heart's `shared/context.ts` (interfaces renamed `Context`, `Piece`, `Folder`), `shared/glsl.ts`, `shared/rig.ts` and `shared/stage.ts` into `src/places/reveal/shared/`, cut what this place does not have (the lake's glow map, the crust's drift) and keep every name the sheet lists. Move the blockout's stand-ins into `shared/blockout.ts` behind `createStandIns(scene, parts, owned)`, so that every part no folder owns yet is drawn exactly as the blockout draws it now. Put the place's fixed points (where things stand, when things happen, sea level, the sun) in `shared/anchors.ts`. The Heart's folder pattern serves a landscape; for one shot from a lake to orbit keep what serves (the parts registered by name, one light, `rigOut`, the stand-ins drawn until a part is built) and lay the rest out as the shot needs. `npx tsc --noEmit -p .`, build, render the wide key (it must look as the blockout did), push.
2. **The light is yours.** From orbit there is one sun. Relief that catches it, cloud that casts shadow on the sea and the land, sunglint sliding on the water, haze that thickens toward the edge of the planet, and the thin bright edge of the atmosphere against space. Take from the Heart's rig what serves (the names `rigOut`, the solo switch, the fire ramp `blackbody` for the lava glow in the chest) and build this light for a planet.
3. **The cameras are yours.** Every shot's key frame must match its approved picture: fit each with `npm run -s compare`, height first, then heading, then lens. The land is built round the cameras, not the other way: the camera positions are fixed numbers in the world. Then the route: the items below. A camera never passes through a solid, never goes under the ground or a fluid and never shows the edge of the world: the land reaches the haze in every direction a camera looks.
4. **Then your parts**, in the order of "What is yours to reach".

## What is yours to reach

This unit is one shot, `reveal-01`: the camera leaves the surface of the lake in the Eye and rises until the whole continent is in frame, with no cut, then holds, still widening, to the end. The continent is the titan: a dead giant on its back, head at the left, feet at the right, weathered down to bone-pale mountain ranges in a dark sea. Read `kit/02-SUBJECT.md` section 4 and `kit/03-METHOD.md` section 6 before anything else, then `references/drafts/NOTES.md` lines 1038 to 1107 and `assets-src/reveal/RECIPE.md`.

**Brandon's note on this unit, which outranks the approved pictures where they differ** (review round 1, his words):

> The Reveal's look, for when it is built. In the draft it reads as a person lying on the ocean. That is not what I want.
> - It should read as a continent first: mountain ranges, coasts, rivers, cloud at several heights, real scale. More land around the bones, less bare figure on open water.
> - The body should only come together near the top of the rise. In the last frame it must still read as a body.

The critics are told: "`-b` may read more as a continent and less as a figure than `-a`: more land around the bones and more scale." And the kit's rule stays: "the outline says corpse, the surface says continent". The body has come apart: the jaw fallen open, the breastbone gone, the belly gone, one knee bent. Do not tidy it and do not add flesh. A viewer shown only the last frame at phone size must name a giant human body or skeleton at once (that is tested), and on the way up it must read as geography.

What that asks of you:

- **Land around the bones** (`continent`, `salt`): the bone ranges are the high ground of a continent, not a figure cut out of the sea. Give them forelands: foothills, plains, deltas, shelves of shallow water, bars and islands, drainage that runs from the ranges to the coasts, so that at keys `reveal-1` to `reveal-3` the frame is country and coast, and the figure is only the pattern of the highest ground once the whole is in view.
- **Relief** from height, lit by the sun, with rivers, snow or pale rock on the heights and dark lowlands: structure at every scale the rise passes through. The lower keys "read as smaller places than intended" and the texture was "too even": scale comes from haze, cloud at several heights with shadows, and detail that keeps arriving as the view widens.
- **The six places, findable from orbit in their own colours**: the strait between the rib ranges, the lava glow in the chest (`lava`, which beats once at frame 11334), the airways in the throat with their vapour (`vapour`), the red salt flats in the hips (`salt`), the storm on the backbone flickering from inside (`storm`), the round lake in the eye socket (`lake`). `pullback.json` says where each sits.
- **Cloud** (`cloud`, `cyclone`) at its own heights, drifting, with shadow on the sea; the storm "reads as a cotton wad" in the picture.
- **Sea, atmosphere, space**: dark sea with sunglint, the curve of the planet at one edge of the widest frame only, the edge of the air.

**Pictures as data, for this unit only.** `references/approved/7-reveal/reveal-master.jpg` and `pullback.json` may be read as data: the outline and the height of the land may be taken from the master (`npm run trace` already makes `continent.json` from it), and you may make height, colour and cloud maps for the continent with an image tool or in code (recipes under `assets-src/reveal/`). Do not ship the master as the picture: a zoom through nested pictures is the fallback of this unit, not the build.

**The machine checks of this unit**: G12 (the rise is one shot: the camera's height never falls and never jumps) and G15 (at each key's frame the view covers the window `pullback.json` gives for that key). Run `npm run -s gate -- --phase 2 --only G12,G15` before every hand-back. The path of the rise is in `rise.json`: slow at the lake, fastest in the middle, settling as the body fills the frame, and never still.

**The handoff.** The frame before your first frame is the last frame of the Eye (shot `eye-05`, straight above the centre of the lake), which another owner (`/root/eye_owner`) builds. Both sides draw the same picture on the frames either side of that cut: `src/places/reveal/handoff.json` has an identical copy in `src/places/eye/` and a test fails if the two differ. Keep to it. If you need different numbers, agree them with `/root/eye_owner` by message and tell `/root`: both copies then change in one commit that `/root` makes. The scale does not agree across the cut (the Eye's lake is two kilometres across, yours about a hundred) and does not have to: weather, speed and height hide it.

## Your place in the cut

The place `reveal` is frames 9541 to 11860 of the film, 38.7 s. `setTime` gets seconds since frame 9541.

| shot | frames | seconds of the place | key | key frame | key at | move | what |
|---|---|---|---|---|---|---|---|
| `reveal-01` | 9541 to 11743 | 0.00 to 36.72 | `reveal-4` | 10027 | 8.10 s | out | one shot, from the lake to orbit, then the hold |
| `reveal-02` | 11744 to 11860 | 36.72 to 38.67 | none |  |  | hold | black |

Events (each falls on an accent of the music, so its frame is fixed):

- `heartbeat`: frame 11334, 29.88 s of the place. From orbit, the Heart's glow beats once on the body.

## What the blockout left open, in the critics' words

These are carried to this phase. The camera items are the lead's. Read them all the same: they say where things have to be.

- the handoff, frames 9480 to 9590, settled in the blockout after round 1: both sides of the cut read one contract (`handoff.json`, the same bytes in `src/places/eye/` and `src/places/reveal/`, compared by a test) for the colour of the water, the nine rings, the height of the view and the rate of climb, 0.6 percent a frame. MEASURED at the draft tier of the preview format: the edge of the outer ring is 370.5 px from the centre on frame 9540 and 368.5 px on frame 9541 and shrinks about 2 px a frame on both sides; the two frames differ by 2.15 levels on average and their neighbours by 2.03 and 2.00; the colours at the centre and the corners agree within 0.6 levels. Carried to Phase 4: the rings are flat bands and the water has no light of the sky on it yet. The rise after it, MEASURED from its path: 0.6 percent a frame at the start, a peak of 3.9 percent a frame at key reveal-1, the largest change of rate between two frames 2.62 percent of the peak, and from the titan frame (10027) to the last frame (11743) the view widens 22 percent at a steady 0.01 percent a frame, so the hold never stops.
- The rule for every place: inside a place each shot starts where the last one ended and keeps its heading, and the subject of each detail is in frame, small, at the end of the shot before it, so a cut reads as going closer. `kit/01-FILM.md` leaves the order of the details and the camera's route and speed to the Builder.
