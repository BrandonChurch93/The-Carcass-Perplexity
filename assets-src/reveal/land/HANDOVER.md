# The Reveal: hand-over (reveal_owner_3, version 3, the last of wave 3)

Unit `reveal`, shot `reveal-01`, frames 9541 to 11860, keys `reveal-1` to `reveal-4`. Code in `src/places/reveal/`. Round 19, issue by issue and word for word, with what was done: `ROUND-19.md` beside this file. The second owner's notes on what failed before still hold and are kept in git history of this file.

## How each part is drawn

- `continent` (`land/index.ts`): the Builder's nested maps and `land/relief-*.png`, read through a bend of three scales of sines (`bendA`, `bendB`, `bendC`; 14, 5 and 1.3 km; off in the lake), so no ridge runs straight.
  `kind` (three slow sine fields) gives each range its own depth of cut, tone and snow, and from orbit its country: forest, scree, green plain, silt shore.
  `worn` (40 to 900 km) lays whole provinces and the red plains smooth: the map is read drawn together there and the ground photographs give the fine relief.
  `soften` draws the map's contrast toward the country's light between 90 and 900 km. Flanks of the ranges are dark from orbit, so the bones stand thin and pale; snow only on the highest crests.
- West and south of the skull the map's low islands are flooded (`west`, `stand`): open sea. Wide teal shelves by depth from orbit (`shelfWide`), none inside the skull, whose waters are dark.
- `lake`: `shoreR` is a ragged shore (bays cut into the land, three scales of noise). The amber follows it: graded by depth, wide to the south-west, nearly gone to the north-east, swirls in its brightness. The rim is a wall in blocks (`tall`, `crestAt`, `fall`) that follows the shore, gullies only under 190 km. A stream enters from the north. A second, long crater lake lies north of it. Under 240 km the east wall is lit warm and the south-west valleys lie in cool haze.
- `sea`: `mat/glitter.jpg` read only on water. Red plume east of the pelvis that grows and bends (`plume`, `grown`), ochre threads round the lower leg (`siltAt`). One glint, brighter at its middle, that slides (`uGlint`).
- `lava`: vents waver in time (noise of `uTime`, gated to 400 km of `uLava`), spill on the ground, larger from orbit; the beat at frame 11334 is unchanged (`uBeat`).
- `cloud` (`shared/weather.ts`, `sky/index.ts`): under 330 km placed puffs with a soft body where a street is full. From 450 km the first lay stands in streets: `mat/streaks.jpg`, carried with the lay, gates the dots of `mat/specks.jpg` and is itself the thin cloud; fields and gaps from `lowFieldOf`. A second lay crosses on another wind. A band north of the skull (`arc`). Cloud over the glint is drawn dark against it (in `sky`).
- `cyclone`, `vapour`, `storm`, `space`, `atmosphere`: as at heartbeat 5. The cyclone is larger, thinner, graded; the vapour is one thin veil.
- Handoff frames: rings widen and break with `uBreak`, lake wind lanes.

## Tried, and not worth trying again

- Bending the map by a texture read: marbled streaks and cost. Sines do it.
- Soft cloud bodies that replace the puffs at reveal-2: M3 fell to 0.53. The dots carry the measure there.
- `worn` at orbit: it smears the limbs and the body is lost at 400 px. It ends at 900 km.
- `worn` without the ground photographs: reads out of focus.
- Streak wisps at a base under 0.5, or read softer than mip 0.5: M3 at reveal-4 falls under 0.9 (0.69 at 0.36).
- Amber threshold above the shore value: `smoothstep` with crossed edges painted tan stripes in the lake. It is clamped.
- `mat/seacloud.jpg` was never used: laid large it gives torn flakes like the popcorn tile.

## Still wrong beside the approved pictures, worst first, by key

1. `reveal-2`, `reveal-1`, `reveal-3`: the skull massif and the ribs still carry the map's feathered ridges at one scale outside the worn provinces; valleys do not gather into trunks.
2. `reveal-2`: sea cloud is still small separate puffs, not curved streets.
3. `reveal-4`, `reveal-3`: the streets are white dashes, harder and larger than the picture's fine wisps; the land is wider and browner than the picture; the cyclone is streakier.
4. Frame 9541: still soft even rings on dark water; 9563 very dark with faint structure.
5. `reveal-1`: no delta where the stream meets the lake, no mist over the water; the land greyer than the picture.
6. `reveal-3`: vapour faint, no long curling threads. Small dark islets speckle the flooded margin north of the skull from orbit.
7. The climb's speed (fast, then flat) was not changed.

## Staged, by shot (`reveal-01`)

- Everything the second owner listed, and: map bend, `kind`, `worn` (40 to 900 km), flooded west sea, drawn lake shore and rim, second crater lake, pits on the rust plain (120 to 1,300 km).
- Lake haze and lit east wall only under 240 km; streets from 450 km; shelves and dark skull waters from 600 km; chest crust below 800 km; vents enlarged from orbit.
- In the hold: cloud travels 24 km a second, the second lay (12, -24), the glint (-9, -8), the terminator 24 km a second, the cyclone turns, the plume grows.
- Cloud shadows from orbit are thrown by the body of the first lay only.

## Cost, seconds a sample at 3840 x 2160, key `reveal-4`, draft (`npm run -s cost`)

- Whole frame 8.50 (received 8.7; runs differ by about 0.3). `continent` 4.15 above an empty frame of 1.69, `cloud` 2.53, `cyclone` about 0.2, `vapour` 0.1, `space` 0.1, `atmosphere` 0.1, `storm` 0.0.
- Cuts made: reads skipped in shadow mode, glitter only on water, one veil noise at orbit, no read where the field is empty, streets replace two group reads. The aim of 7 is missed.

## Next, in order

1. Relief of two more kinds in the maps themselves (dendritic trunks, fans): the shader can only hide the one pattern.
2. reveal-2 cloud as streets without losing M3.
3. Finer, softer streets from orbit; less land beyond the bones.
4. The first frame on real ripples; the climb eased.
