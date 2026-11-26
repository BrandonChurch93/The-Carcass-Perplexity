# The Reveal: hand-over (reveal_owner, version 3)

Unit `reveal`, shot `reveal-01`, keys `reveal-1` to `reveal-4`. Code in `src/places/reveal/`, pictures in `public/assets/reveal/land/` and `sky/`, the Builder's in `mat/`.

## How each part is drawn

- `continent` (`land/index.ts`, one sheet, one shader): four levels of two pictures each, `ground-a..d.jpg` (colour) and `shape-a..d.jpg` (slope in red and green, height in blue), swapped by pairs as the eye rises (`land/levels.ts`). They come from `assets-src/reveal/land/make_land.py` and `erode.c`: the traced outline in `continent.json`, grown to land, then worn by water.
  Lit by the rig. From orbit the range tile is laid wide on the bones (`ORBIT_GRAIN`). Fine grain and small relief from `mat/range`, `mat/plain`, `mat/badland` (colour, and `-nh` of two), each laid twice, turned and bent, mixed by height and by dry province; they fade out above 1,050 km.
- `sea`: the same shader, where the shape is under the shore. Colour from the ground picture by depth, blooms by noise, a glint lobe at `uGlint`, a broad warm glare round it, surf at the coast. No picture of its own.
- `salt`: the pale pan in the ground picture, kept white in the shader (no growth, no bone tint), with its own edge in `inPan`.
- `lake`: the lake of the Eye. The pictures are read through a small bend so the shore has bays; black middle, amber shelf by noise.
- `lava`: six vents and cracks in the shader, blackbody colour, swelling with `uBeat`; a glow added after the air.
- `cloud` (`sky/index.ts`, `shared/weather.ts`): one sheet at the low height. Where weather stands comes from `sky/cloud-cover.jpg` and slow noise; what it looks like from far comes from `mat/cells.jpg`, `mat/streets.jpg` (low deck, each read twice, turned) and `mat/veil.jpg` (high ice, drifting against the deck).
  From near (under 560 km) the older look from `sky/cloud-tile.jpg` takes over. The shade of the deck on the ground is the same function read once, offset along the sun (`cloudShade`).
- `cyclone`: `mat/cyclone.jpg` on a quad 1,440 km wide, turning slowly, the middle faster; lit by the place's sun through its own brightness.
- `storm`: `mat/storm.jpg` on a quad 430 by 330 km over the spine; lit side and lee from the picture read towards and away from the sun; four flashes on a clock.
- `vapour`: a noise plume from the throat, in the shader alone.
- `space`, `atmosphere`: a ring past the limb and the air term by the cosine at the limb (`limbCos`), in shaders alone.
- The body: `land/bones.jpg` (from `make_bones.py`, the traced ranges only) tints the great ranges pale and darkens the land between, only between 680 and 1,380 km of height. Below that the place is only land.

## Tried, and not worth trying again

- Bones mask taken from the blue of `cloud-cover.jpg`: patchy, the ribs broke up. The traced picture is the answer.
- Cloud cells from Worley noise and streets from stretched noise: read as one stamp with hard lace at every edge. Photographs inside large masks read far better.
- A log spiral cyclone in the shader: read as painted at any setting.
- Pale ranges drawn as colour without relief: chalk lines. The pale tint must follow the slope light.
- Thresholding a cloud photograph hard (`grown` with a narrow step): flecks and blocks of the JPEG show. Wide step, floor taken off, half a mip of blur.
- Rendering at 3840 x 2160 while `make_land.py` runs: out of memory on 7.9 GB. Run the generator alone (15 minutes).
- A seventh take of `cyclone` and `cloud-cover` was made by mistake at version 2 and thrown away; the limit is six.

## Still wrong beside the approved pictures, worst first

1. `reveal-4`: the bones carry the grain of rock now, but it is the range tile laid 8 and 15 times its real size, not relief of their own; the pale band under it keeps a soft edge and a dark surround that reads as tinted at native size.
2. `reveal-4`: red is still high (mean 55/63/72 against 47/62/73). The land and the warm glare carry it; the top of the frame is hazier than approved.
3. `reveal-4`, `reveal-3`: cloud scraps keep hard edges at native size, and the low deck has no depth of its own (one height). No picture of a front is used: `mat/front.jpg` is not placed.
4. `reveal-2`, `reveal-3`: one family of dendritic valleys still carries the head. The three kinds of country change grain and colour, the tableland only a little of the large shape.
5. `reveal-1`, `reveal-2`: near cloud is the old tile, soft and without structure.
6. `reveal-4`: the storm is better lit but still one bright mass; its right edge fades by a circle, not by its own shape.
7. `reveal-4`: the bay in the far leg is cut in the shader as an ellipse with a noisy edge. It has no river mouth, no shoals; its water is the grey of the glare.
8. `reveal-4`: a few islands west of the pelvis read dark as the sea with a thin shore line.
9. `mat/shelf` and `mat/redflat` are not used: the shelves and the salt pan have no fine detail.

## Staged, by shot (`reveal-01`)

- The relief is drawn up with distance (slope times up to 1.6, a side light across whole ranges from the height read 9 texels each way).
- Cloud shadows are drawn up to three times their true length from far.
- The body is brought in by the height of the eye (680 to 1,380 km), not by anything in the world. It is not drawn near the salt pan.
- The front is cleared round the storm (`STORM_AT`) and the low deck thinned over the body (to 15 and 40 percent) so the figure shows.
- The glint and glare sit at `uGlint`, placed for the last frame; the lake shore is bent by noise only near the lake.
- The bay (`BAY_AT`, `BAY_SIZE`) is in the shader and not in the pictures or in `bones.jpg`.
- Fine country tiles are laid 1 and about 3.4 times their real size; the larger lay takes over with distance.
- From orbit (above 1,050 km) the range tile is laid 330 and 610 km a repeat, 8 and 15 times its real size, most of all on the bones.
- Level swaps of the pictures fall near frames 9675 and 9756 (largest step about 3 percent of mean).

## Cost, seconds a sample at 3840 x 2160, key `reveal-4`, draft, 4 cores (`npm run -s cost`)

- As handed in (`ORBIT_GRAIN` and `SELF_SHADE` on): whole frame 7.79; an empty frame 1.70. Runs of the same code differ by about 0.3.
- `continent` with `sea`, `salt`, `lake`, `lava`: 3.84 above empty. `cloud`: 2.14. `vapour`, `storm`, `cyclone`, `space`, `atmosphere`: each under 0.15.
- Cheaper land: `ORBIT_GRAIN = false` in `land/index.ts` (the great ranges smooth from orbit): whole 7.40, continent 3.64.
- Cheaper cloud: `SELF_SHADE = false` in `sky/index.ts` (cloud lit by its photograph alone): 0.28 less (6.98 against 6.70, measured before the bay and the grain).
- Dearer shade: `FULL_SHADE = true` in `shared/weather.ts` (three reads of the deck for the ground shade): about 0.95 more (measured at version 2).
- So the aim of 7 is missed by about 0.8 as handed in, and is only about met with both cheaper settings.

## Next, in order

1. Give the bones relief of their own in the heights (with land take 6) in place of the wide lay of the range tile, and break the edge of the pale band by slope and snow line.
2. Take red down on the land from far and thin the air at the top of the frame, to the approved means.
3. Place `mat/front.jpg` for the two fronts and give the deck a second height with its own shadow.
4. In that same land take 6 (the last allowed): the bay, a river mouth, and two more provinces in the heights themselves.
5. Use `mat/shelf` on the shelves and `mat/redflat` on the pan; replace the near cloud tile with the photographs at a smaller lay.
