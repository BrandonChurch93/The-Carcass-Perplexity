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
- Rendering at 3840 x 2160 while `make_land.py` runs: out of memory on 7.9 GB. Run it alone (15 minutes). A seventh take of `cyclone` and `cloud-cover` was made by mistake at version 2 and thrown away.

## Still wrong beside the approved pictures, worst first

1. `reveal-4`: the bones carry the grain of rock now, but it is the range tile laid 8 and 15 times its real size, not relief of their own; the pale band under it keeps a soft edge and a dark surround that reads as tinted at native size.
2. `reveal-4`: the top of the frame is brighter than approved (the front there), and approved has many small scattered clouds toward the limb where this has a few large systems. Means are near (see the hand-back).
3. `reveal-4`, `reveal-3`: cloud scraps keep hard edges at native size, and the low deck has no depth of its own (one height). No picture of a front is used: `mat/front.jpg` is not placed.
4. `reveal-2`, `reveal-3`: one family of dendritic valleys still carries the head. The three kinds of country change grain and colour, the tableland only a little of the large shape.
5. `reveal-1`, `reveal-2`: near cloud is the old tile, soft and without structure.
6. `reveal-4`: the storm is better lit but still one bright mass; its right edge fades by a circle, not by its own shape.
7. `reveal-4`: the bay in the far leg is cut in the shader as an ellipse with a noisy edge. It has no river mouth, no shoals; its water is the grey of the glare.
8. `reveal-4`: a few islands west of the pelvis read dark as the sea with a thin shore line.
9. `mat/shelf` and `mat/redflat` are not used: the shelves and the salt pan have no fine detail.

## Round 13 (judged on version 2), in the order given: closed, tried, not reached

1. Body at the top: tried, and by my own look at 400 px closed (skull, ribs, pelvis, legs told apart): `bones.jpg` turns the crests of the great ranges ivory and the land between dark slate, above 680 km only. Not shown to fresh viewers. The gaps between the ribs are still dark land, not sea.
2. Rings in the basin: closed. From the second frame they bend, break into arcs, soften, weaken outward, and are gone by frame 9578 (`uBreak`, `RING_FADE`). Frame 9541 is unchanged against the Eye.
3. Cyan shore line: tried. Shallows are darkened where the ground is steep or a noise says no shoal, silted ochre in the shoals, surf on the windward side only. The pale rim is in `ground-*.jpg` itself: weaker and uneven now, not gone. The cure is land take 6.
4. One procedural terrain: tried (three `mat` tiles near, the range tile on the bones from orbit). The valleys of `erode.c` still carry the head; near, the pictures are read through a small bend, which hides the straight grid valleys at `reveal-1`. The banding at `reveal-1` (8 bit height in `shape-d.jpg`) and the master as colour and height source: not reached.
5. Weather that moves: the spiral is closed (the cyclone is the photograph, turning 2.2 times faster); deck and veil drift about twice as fast, against each other. A fine field of small cumulus over the open sea: tried twice (`FINE_FIELD` in `shared/weather.ts`, the cells photograph laid 240 km), left off: the deck cuts its edge hard in `sky`, so it reads as flecks and lifts the mean to 52/63/74.
6. Cold light: tried. Rock is grey blue, the green soil province is gone, the glare is silver. Olive lowland baked in `ground-b.jpg` stays at `reveal-2`.
7. Water: not reached, but for the glare and the shoals. Lakes are still flat. 8. Vapour: not reached. Lava: points small, the halo a third and only on slopes facing the vent.

## Staged, by shot (`reveal-01`)

- The relief is drawn up with distance (slope times up to 1.6, a side light across whole ranges from the height read 9 texels each way).
- Cloud shadows are drawn up to three times their true length from far. Cloud drifts at 3 km a second and the cyclone turns in minutes: both far faster than weather.
- The body is brought in by the height of the eye (680 to 1,380 km), not by anything in the world. It is not drawn near the salt pan.
- The front is cleared round the storm (`STORM_AT`) and the low deck thinned over the body (to 15 and 40 percent) so the figure shows.
- The glint and glare sit at `uGlint`, placed for the last frame; the lake shore is bent by noise only near the lake.
- The bay (`BAY_AT`, `BAY_SIZE`) is in the shader and not in the pictures or in `bones.jpg`.
- Fine country tiles are laid 1 and about 3.4 times their real size; the larger lay takes over with distance.
- From orbit (above 1,050 km) the range tile is laid 330 and 610 km a repeat, 8 and 15 times its real size, most of all on the bones.
- Level swaps of the pictures fall near frames 9675 and 9756 (largest step about 3 percent of mean).

## Cost, seconds a sample at 3840 x 2160, key `reveal-4`, draft, 4 cores (`npm run -s cost`)

- As handed in (`ORBIT_GRAIN` and `SELF_SHADE` on): whole frame 7.91; an empty frame 1.68 (7.79 before the round 13 shore work). Runs of the same code differ by about 0.3.
- `continent` with `sea`, `salt`, `lake`, `lava`: 4.33 above empty (3.84 before the shore work). `cloud`: 2.14. `vapour`, `storm`, `cyclone`, `space`, `atmosphere`: each under 0.15.
- Cheaper land: `ORBIT_GRAIN = false` in `land/index.ts` (the great ranges smooth from orbit): about 0.4 less (7.40 against 7.79, measured before round 13).
- Cheaper cloud: `SELF_SHADE = false` in `sky/index.ts` (cloud lit by its photograph alone): 0.28 less (6.98 against 6.70, measured before the bay and the grain).
- Dearer shade: `FULL_SHADE = true` in `shared/weather.ts` (three reads of the deck for the ground shade): about 0.95 more (measured at version 2).
- So the aim of 7 is missed by about 0.9 as handed in, and by about 0.2 with both cheaper settings.

## Next, in order

1. Give the bones relief of their own in the heights (with land take 6) in place of the wide lay of the range tile, and break the edge of the pale band by slope and snow line.
2. Scatter small cloud toward the limb in place of the upper front, and bring the sea up in blue, to the approved means.
3. Place `mat/front.jpg` for the two fronts and give the deck a second height with its own shadow.
4. In that same land take 6 (the last allowed): the bay, a river mouth, and two more provinces in the heights themselves.
5. Use `mat/shelf` on the shelves and `mat/redflat` on the pan; replace the near cloud tile with the photographs at a smaller lay.
