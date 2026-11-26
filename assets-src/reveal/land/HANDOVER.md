# The Reveal: hand-over (reveal_owner_2, version 3)

Unit `reveal`, shot `reveal-01`, frames 9541 to 11860, keys `reveal-1` to `reveal-4`. Code in `src/places/reveal/`, pictures in `public/assets/reveal/land/` and `sky/`, the Builder's in `maps/` and `mat/`. Recipes in `assets-src/reveal/land/RECIPE.md` and `sky/RECIPE.md`.

## How each part is drawn

- `continent` (`land/index.ts`, one sheet, one shader): the Builder's four nested satellite maps (`maps/map-a..d.jpg`), read two at a time (wide and close), and my `land/relief-a..d.png` (`make_relief.py`: slope in red and green, height in blue, from the maps' heights). Nothing of the first owner's eroded land is left.
  Under the maps, where one map texel covers more than a pixel, the ground photographs (`mat/range`, `plain`, `badland`, `shelf`) are laid by world position in octaves and cross-faded, light and dark only.
  The colour is graded by height of the eye (`uViewKm`): `near` (under 300 km) warm tan; `midway` (90 to 1,300) teal lowland, red-brown pans and flanks, pale crests; `wide` and `top` (from 240 and 680) dark lowland, pale ranges, rust round the throat. The words `lowMid`, `flank`, `crestHi`, `offBone`, `dome`, `socket` in the shader each do one of these.
- `sea`: same shader where the relief's blue is under the shore. Deep colour, shoals from the map (clear teal from far), `mat/glitter.jpg` for how each patch throws the sky back, one warm glint at `uGlint` that slides during the hold.
- `lake`: black-blue middle, a graded gold margin with swirls drawn round into the dark (noise on a twisted ground), a pale crust at the foot of the rim, `mat/lakewater.jpg` read large and soft for the wind. The map's spits into the lake are drowned. The stream of the Eye leaves at the upper left (drawn in the shader: `stream`, `banks`).
- `salt`: the pan of the pelvis: white where the map is pale, dark red where the map itself is red (`rawBrine`, taken before any grading), and a red run east to the sea (`plume`).
- `lava`: six vents and cracks, swelling with `uBeat` (the heartbeat at frame 11334); loops gated by distance so they cost nothing elsewhere.
- `cloud` (`sky/index.ts`, `shared/weather.ts`): one sheet at 2.6 km. Near: thousands of separate puffs (`puffs`: hashed cells, sizes on a long tail, lumpy, soft) in streets taken from `mat/streaks.jpg`, fullness from `mat/popcorn.jpg`, fused masses in street cores, 10 km cells from 300 km up. From 450 km: the streaks photograph at two lays, turned against each other, with a few large soft masses; clear lanes and thinning toward the limb from `lowField`. A thin veil (`mat/veil.jpg`) drifts the other way above. `cloudShade` is the same field read once toward the sun.
- `cyclone`: no picture of a cyclone. `mat/streaks.jpg` and `mat/popcorn.jpg` wound on a log spiral (`fibre`, `storm`): a small grey-white core round a clear eye, arms of cells with sea in the gaps, threads of veil off one side, a soft shadow on the sea. It turns, the middle faster.
- `storm`: five reads of `mat/storm.jpg` in a row along the backbone (`tower`), lit from the sun side, violet glimmer and four strikes on a clock from inside.
- `vapour`: `mat/wisps.jpg` carried down the wind from the throat through a travelling bend.
- `space`, `atmosphere`: a ring past the limb and the air by `limbCos`, shaders alone.
- The body: there is no bones picture any more. The figure is the maps' own ranges; the grade by height makes crests pale and the country dark only from about 600 km up. From 680 km the skull is one pale dome and the basin beside the lake of the Eye is a second dark socket (from 140 km).

## Tried, and not worth trying again

- A grey veil over the whole cyclone to soften it: read as a grey disc on the sea. The gaps must be sea.
- The cyclone as streaks alone, however fine: combed hair. Cells along the arms (the popcorn photograph on the same spiral) are what break it.
- Two fronts from `mat/front.jpg` on the cloud sheet: large smears across the body at orbit. Removed; the red of `sky/cover.png` is no longer read.
- Puffs taken straight from the popcorn tile: soft patches at reveal-2, the dark sea floor of the tile shows. Placed puffs with the photographs as placement only.
- Relief light on top of the map colour between 110 and 900 km: reads as snow and as etched lines. The map's contrast is drawn toward its own blurred copy there instead (`soften`).
- Softening at reveal-1 by 0.45: M3 fell from 2.78 to 1.02 at draft. It is 0.14 there now.
- A lobed amber margin from one noise: reads drawn. The twisted, graded one is the answer.
- Uhd renders while python makes pictures: out of memory. One at a time.

## Still wrong beside the approved pictures, worst first

1. `reveal-4`: the inner turns of the cyclone are still a little combed, and it is darker in the gaps than approved, whose arms are softer and more numerous.
2. `reveal-4`: the land round the bones is wider and busier than approved (the maps hold a whole continent, approved has little land beyond the bones); the lowland east of the pelvis is still brown where approved is dark green.
3. `reveal-4`, `reveal-3`: small cloud over the sea is sparser and more dashed than approved's ragged white fields; it has one height and a faint veil.
4. `reveal-2`: the bone is etched by the map's fine valleys where approved is smoother with broad basins; puffs are smaller and more even than approved's bright knots.
5. `reveal-1`: the margin of the lake is close; the land is greyer and its valleys more regular than approved; the stream is short.
6. `reveal-3`: the vapour is a short trail where approved has long curling threads over the skull.
7. Glint: warm and at the right, but broader and flatter than approved.
8. Frames 9565 to 9581: the lake fills the frame as flat blue-black water with only faint lanes.

## Round 13 (judged on the first owner's version 2): what I did

1. Body at the top by value: closed by my look at 400 px (skeleton on a continent, two sockets, jaw). Whole figure first reads at about frame 9860; ribs at 9756 as in approved.
2. Rings 9563 to 9606: closed. Soft rest rings at 9541 agreed with the Eye, gone by 9565, amber margin in from 9581.
3. Cyan shore outline: closed. The land is the maps; shoals are the maps' own, teal only from far.
4. Procedural terrain and banding: closed. Maps and photographs; slope stored, never differenced from 8 bit height.
5. Weather that moves, cyclone loosened, held frame alive: cloud drifts at two heights with travelling shadows, cyclone turns and is built of cells, storm flickers, vapour trails, glint slides, lava beats. Camera drift is the Builder's `holdPerFrame`.
6. Cold blue-grey colour and silver glare: tried. Teal and rust lowland, ivory crests, warm small glint. Sea a shade darker than approved in the lower frame.
7. Water with depth, glint, wet edge, no flecks: lake and sea rebuilt on photographs; wet edge only at the lake (crust) and the shoals.
8. Vapour thin wisps: tried (photograph, thin). Lava small points: kept small, gated; ridges are not lit by it.
9. Salt flat with red veins and plume: closed at 9860 and at orbit.
10. Cumulus field over the sea at reveal-2: closed in place and cover, smaller in the knots.

## Staged, by shot (`reveal-01`)

- Grade by height of the eye: the body is brought in by `uViewKm`, not by anything in the world. Skull dome from 680 km, second socket from 140 km, both drawn in the shader, not in the maps.
- The country west of the skull is darkened to navy (`offBone`) so the skull stands out of it. The chest round the Heart is darkened to teal black (`crust`).
- The stream of the Eye, the drowned spits and the crust at the lake are shader, not map.
- Cloud shadows are drawn up to three times their length from far; cloud drifts at 3.6 km a second; the cyclone turns in minutes.
- The sky is clear over the lake at the start; the low field is thinned over land by `sky/cover.png` green.
- The cyclone's shadow is thrown 110 km; the glint is placed at `uGlint` for the last frame and slides 5 km a second after second 20 and draws in.
- The sea is lifted in blue from 700 km up; limb haze is thinner than physical.
- Rust plain round the throat, red flanks on the ranges from 300 km, the salt white and brine red are tints over the maps.

## Cost, seconds a sample at 3840 x 2160, key `reveal-4`, draft (`npm run -s cost`)

- Whole frame COSTWHOLE; an empty frame COSTEMPTY. `continent` COSTLAND above empty, `cloud` COSTCLOUD, `cyclone` COSTCYC, `vapour` COSTVAP, `storm` COSTSTORM, `space` and `atmosphere` under 0.05.
- The aim of 7 is missed by COSTMISS. Cheapest cuts: the 9.5 km cell layer and the masses in `lowPicture` (about 0.2), the second read of `lowField` for self shade in `sky` (about 0.3).

## Next, in order

1. Cyclone: more and thinner arms, softer cells, less dark between them.
2. Small cloud from orbit: ragged white fields in place of dashes; a second height with its own shadow.
3. reveal-2: smooth the bone at that height (broad basins), brighter knots of cloud.
4. Lowland east of the pelvis to dark green; less land beyond the bones if the maps can be cut.
5. Long vapour threads over the skull at reveal-3; lake water at 9565 to 9581.
