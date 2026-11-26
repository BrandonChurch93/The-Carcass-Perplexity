# Hand-over of the Ribs: shared, root, land, air

Owner in wave 2 until version 3: `ribs_ground_owner_2`, branch `agent/ribs-ground-2`. Partner: `ribs_sea_owner_2` (`sea/`, `wings/`, `drowned/`).
Written with version 3. Numbers are measured unless a line says otherwise; hd draft looks, not final uhd, unless said.

## How each part is drawn

- `land` (floor): `land/height.ts` (`bed`) baked by `shared/rig.ts`. `GROUND_FRAGMENT`: the Builder's `mat/plate.jpg` laid twice (48 m and 86 m), `mat/shingle.jpg` at 2 m and `mat/flat.jpg` at 4 m inside 110 m of the lens. A wet map (`soaked`) comes first: soaked sand is dark and a mirror, bars are pale slate shingle; the map drains off whatever stands over the pool. `uPath` lays a lane of standing water from the ribs-02 key lens toward the gap. Also under `land`: the blades' mirror decal (`MIRROR_FRAGMENT`, fades in 12 to 60 m from the lens).
- `ribs` (blades): `layout.ts` fins from the ribs-0 picture; `land/blade.ts` `bladeRelief` (masses, bites, joints; the flutes are nearly gone). `ROCK_FRAGMENT` with `uFin 1`: `mat/bone.jpg`, my `land/fin.jpg` at 6 percent only, grey-white, dark water streaks by the fall line, lichen toward sky and sun, black band and weed under `LEVELS.tide`. The two gate stacks (`stackRock`, `stackRadius`) are bedded pillars, made unlike.
- `ledges` (colony): `shared/crag.ts`. `cragRadius(angle, y)` is a body (cone, three buttresses, benches, columns) cut into blocks of three sizes in thrown cells (`blockAt`: 11 x 7.5 m, 4.2 x 2.8 m, 1.9 x 1.3 m), beds leaning by `lean`. `cragPerch(angle, height, across)` gives a block top on the mesh's own rows (0.3 m): the partner's animals stand by it. `COLONY_FRAGMENT`: `mat/ledge.jpg` at 10 m and `mat/rock.jpg` at 3 m by world position on three axes, dark grey, wet low, lichen patches, white that hangs from each lip (the mesh carries the drop under the lip and the ledge's depth in `uv`), running water with sliding beads, a floor of fill so no shade is black.
- `weed`: skirts and `stackWeed`; `WEED_FRAGMENT` with `mat/wall.jpg` (40 m, mirrored) and `mat/weed.jpg`; gold hems with a moving glint; `uBare 1` on the gate stacks gives clumps with bare rock between.
- `rocks`: instanced `boulderShape` (cut blocks), `BOULDER_FRAGMENT` with weed tangle, barnacle crusts, soaked dark near the pool. 30,000 pebbles on the bar before the wide lens.
- `sky`, `cloud`: dome in `air/index.ts` with `skyCloud` (`mat/sky.jpg`, heavier contrast) and `mat/far.jpg`; cloud shadow in `shared/rig.ts`.
- `air`: one volume pass; haze by distance (`uAir (0.0013, 75, 0.0003, 12)`, onset 130 to 600 m).
- Light: `SUN.toward [-0.55, 0.7, 0.25]`: high, from the left, a little behind the strait cameras. `rigOut` refuses NaN and negatives.

## Tried and did not work

- Reading pictures with `textureGrad` (two slopes): right, but the software renderer takes about seven times a `textureLod` read. All reads now go by `footLevel` (long side of the pixel's foot, cut to a few times the short one): land 5.3 s to 1.05 s.
- The colony as coursed bands with level ledges (`CRAG.band`): judged a staircase, then masonry. Blocks in thrown cells are better; joints still read too level.
- The colony's sheet `mat/colony.jpg` laid round the rock (`roundSpace`): pulled long down every face. Dropped for tiles on three axes.
- The fin sheet at 32 percent and flutes of 2 to 3 m: every blade banded like wood grain. Both cut. The bands also came through the shade: the sheet's heights (`nh.z`) and the `beds` noise both fed `occ`. Both are now off for `uFin`. A thin water streak at 0.8 m spacing made a hatch of its own: streaks are now wide, few and grouped.
- Camera drift to pass M2: not done, by order. M2 is measured with the camera held.
- Sun low from the right (wave 1): the lens side of everything in shade.
- Software renderer ignores anisotropy at grazing angles: `skimmed` and `footLevel` do it by hand.

## Still wrong beside the approved pictures, worst first

- ribs-3: joints between blocks still run nearly level; no overhangs, no rounded noses, no cracks through several beds; white runs are even threads; the bench top nearest the lens is a flat picture seen along itself.
- Blades: a faint fine slanted hatch is still on the near blade at ribs-3 at uhd and I did not find its last source (suspects: `mat/bone.jpg` at 25 percent in the fin albedo, the wide relief read `nhW`). Dark crescents stand on every blade: I took them for the upper rims of the bites in `bladeRelief` and eased the shade under overhangs, and they stayed, so look at `aShade`. Flat grey, lichen sparse, no pitting. No arch through the middle blade (only the first owner's standing arch).
- ribs-0 flat: stones on the bar are one size class and ringed pale; the lane is brighter but does not hold the blades upside down near the lens (the decal fades out there); the left foreground lacks the dark weed rocks.
- ribs-4: the stacks are pillars, near black on the lens side, with clumped weed that reads grey, not gold; stones are low loaves; nothing dark and out of focus lies before the lens.
- ribs-1: wall weed is still one sheet; no straps standing free.
- ribs-1 and ribs-2 fine detail is 2.5 and 2.9 times the picture's: an even stipple on weed and water (the water is the partner's).

## Round 10, each severe and major issue that is mine

- "arches and cliff are flat grey, dark-sided silhouettes with no sunlit faces, no orange lichen": sun moved high and left; lichen back; faces lit but still flat. Partly.
- "the arches are thick dark leaning tusks and spires": fins redrawn from the picture in `layout.ts`. No new arch.
- "a smooth grey sheet with a few stones and big flat black shadow blobs": wet map, shingle bar, 30,000 pebbles, lane, weed heaps, rock knots. Partly.
- "the cliff is stepped dark strata with almost no seaweed curtain": `mat/wall.jpg` curtain on `L1` with gold hems. Partly.
- "a dark furry streaked texture with no wetness": wall sheet, threads of water, glints; shade no longer black. Partly.
- "the arches have become spires; big rounded boulders fill the lower right": boulders cut to flat blocks and thinned. Partly.
- "the hazy curved arches are now square-topped stacks": fins and haze by distance. Partly.
- "a sharp blocky textured mound with no seaweed glow": weed tangle with gold on boulders. Not defocused (the lens is the engine's).
- "smooth, evenly curved terraces with a noisy, repeating grey procedural texture": new technique, the crag of blocks and its own shader. Partly.
- "bright blue sky and sunlit white cumulus": heavy dark cloud with one break. Done as far as I can judge.
- "a near, sharp, brown rock wall with no aerial haze and no birds on it": `R2` moved back into haze. Birds are the partner's.
- "the camera looks steeply up a terraced slope": colony lens at 45.2 m, looking along the face. Done.
- "curved, horn-like stacks fading into spray haze and a dark sky": sky and haze. Partly.
- "rounded, fuzzy, fur-textured lumps": bedded stacks with bare rock. Partly.
- "a flat, dull grey plane": wet map and films that hold the sky. Partly.
- "smooth, fuzzy domes that are not in -a": cut blocks, lower, fewer. Partly.
- "heavily smeared, soft, and glossy like melted plastic with pure black crevices": wall sheet at low slope strength, fill under shade. Partly.
- "repeating woven-grid tiling pattern and a visible UV seam": boulders laid by the nearest plane at 1.9 m. Not checked at native size.
- "cross-hatched moire bump pattern": plate relief cut near the lens and under films. Not checked at final uhd.
- "blurred, stretched, low-resolution textures" (ribs-3): tiles on three axes at one size. Done for the faces.
- "vertically stretched, glossy procedural texture that looks like matted fibers": weed in clumps, rock between. Partly.
- Invalid pixels (M1): the floor film's sky term went negative. Fixed; 0 pixels at five keys.

## Staged by shot

Placed by a key camera's pose and kept for the whole film: stones strewn before the lenses of ribs-02, ribs-04, ribs-06; weed heaps, rock knots, the pebble bar and the lane of water before ribs-02. By time: the mist veil in `air/index.ts`, shot ribs-03 only.

## Cost, seconds a sample at 3840 x 2160, key ribs-0, draft tier

At 04:41 UTC, version 3, `npm run -s cost -- --key ribs-0 --format uhd --tier draft --parts land ribs weed rocks ledges sky cloud air`: whole 10.85, empty 2.12, ribs 1.74, rocks 1.00 (the pebbles), land 0.84, weed 0.19, sky 0.06, ledges 0. Mine 3.83 against a share of 4.5. The whole is over 7: the rest is the partner's water and animals and the engine's empty frame.
