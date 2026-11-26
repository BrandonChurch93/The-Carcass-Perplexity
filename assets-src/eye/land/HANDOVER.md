# The Eye: hand-over from eye_owner_2 (version 3 of wave 2)

Honest state: the measures are green at draft tier in uhd (M1 0 invalid pixels; M2 16 to 62 percent moving; M3 1.5 to 4.5 against a floor of 0.75, eye-1 2.50 from 0.53). No round has judged this version. Read "Still wrong" first.

## How each part is drawn (all under `src/places/eye/`)

- Far world (`shared/glsl.ts`, `farRadiance`): one of the Builder's far pictures (`mat/far`, `far-low`, `far-long`) hung per shot group. Built land beyond `uNear` and the brow are hidden while a picture hangs. The water mirrors it by the reflected ray; under a long lens three looks one above another, soft.
- `land`, `brow` (`land/`): one height field. New: a fan of fallen stone under the spur (`height.ts`, along 30 to 135 m), so the wide camera has broken stone at the foot of its frame and the herd keeps a gravel flat. Under a low eye the shore is `shingleAt` (`shared/glsl.ts`): four sizes of oval stone, each turned and squashed its own way, the higher on top, each size left out when smaller than the pixel.
- `scree` (`land/index.ts`): instanced blocks. 1500 on the fan (0.45 to 4.6 m), each shown as one stone (the scree plate read large); 13000 pebbles (3 to 23 cm) before the shore camera with lit tops and wet feet.
- `stream`: a ribbon in the gully from along 30 m up; it no longer crosses the beach.
- `lake`, `shallows`, `shaft` (`lake/index.ts`, `lake/bed.ts`): one water surface; the bed is worked out in the shader where the bent ray meets it, so there is no box and no second sheet. Rings from the centre broken by noise; lap rings in two trains, read by shading the water with the ring slope; the wall of the shaft shows pale blue-green for 6 m in from the lip, then the dark.
- `mats` (`bed.ts`): no picture any more. Filaments: ridges of noise in four finenesses, combed toward the centre with a wandering current, bundles with pale crust between them, rust to amber to gold. From high on the spur the strands are not told: soft rust and amber streaks that go dark at the pool's edge. The strands go on over the crust of the lip (`mat/lip`).
- `riser`: instanced small tips with a ring each; a low dark hump at the centre tied to the `rise` event.
- `sky`, `air`, `mist` (`air/index.ts`): rig sky; a mist bank at the foot of the hung picture, higher for a low camera.
- `drinkers` (`drinkers/`): lit cards from the Builder's sheets (`drinker-down`, `-up`, `-back`, `-quarter`, `calf`) with their relief: soft for the form, sharp for ribs, hips and folds (faint on backs). Wet dark legs, rings at muzzles and legs, each mirrored in the water.
- `skeleton`: the Builder's picture and relief on the lip, bone pale.

## Tried and did not work (do not try twice)

- The first owner's list still stands (combed polar picture warps, lap rings near 1 s, glossy damp gravel, `textureGrad`, dome mirroring land, Heart map copies, `ctx.parts.built(a, b)` returns only `a`).
- The mat picture warped by noise to hide its repeat: marbled paper at every distance. Replaced by the filaments.
- Shingle as one size of cell laid edge to edge: paving. Replaced by piled ovals and real pebbles.
- Sharp relief at full strength on backs seen close: tiger stripes. Now 0.3 on back sheets.
- The mirrored ray taking the full throw of the waves under a long lens: a mosaic of bricks. Now 12 percent.
- The land map's sky count on the deep: a stepped dark shape late in eye-05. The deep now takes 0.92 beyond 60 m inside the lip.
- A fan that begins at the waterline: the herd stands among boulders. It begins at along 30 m.

## Round 12 order: what is closed

1. Frozen: closed by measure (M2 green at every key). No animal takes a step.
2. Disc and bullseye: the disc is gone; the rest rings come in only over the last 0.4 s, on the profile agreed with reveal_owner_2 (`handoff.json` untouched).
3. Pulled textures and the straight seam: mats and shingle are drawn, not stretched; at eye-1 stones taller than the water stand out of it and a thin wet band lies above it. The seam is still nearly level between stones.
4. Cut box and two sheets: closed (one surface, bed in the shader).
5. Drinkers: restaged further off (settled with the Builder); hide relief added. Not closed close to: cards, no joints that bend.
6. Far rim: closed by the hung pictures.

## Still wrong beside the approved pictures, worst first

- eye-0: the dark pool reads thinner and wider than the picture's oval; no mist at the cliff's foot in the mirror; mats have no blue wet gaps; blocks are coarse beside the picture's graded scree; the stream barely reads.
- eye-2: filaments are thinner and paler than the picture's dense red and gold tangle; no pale slabs standing through; 62 percent of the frame moves (the camera moves).
- eye-1: the shore is in cool shade where the picture has warm low light; rings are fainter than the picture's; the animals are smaller.
- eye-4: backs are smooth cards; the hump is small; the wall is pale at its foot.
- eye-3: the lip is a level shelf, not a broken diagonal; the skeleton lies on the crust, not in growth.
- M3 above 4 at eye-2 and eye-3: fine strands everywhere. Not checked at `final` tier.

## Staged by shot

Hung far picture per shot group; built land beyond `uNear` and the brow hidden while a picture hangs; evening shade over the south shore and a pale herd in eye-01 (`uShade`); the lip drawn in 270 m at the sides, so the dark pool is a compact oval, in eye-01 (`uLipIn`), with mats to the shore and denser; drinkers placed per shot camera; lens blur in eye-04 (slight) and eye-05. By camera height, not by shot: mirror tone, mats as streaks or strands, shingle and pebbles, wet band, mist bank height, block grain.

## Cost, seconds a sample at 3840 x 2160, eye-0, draft tier

`npm run -s cost -- --key eye-0 --format uhd --tier draft`: 11.60 s whole at 3840x2160, one sample, draft (empty stage 1.76; alone: lake 7.35, land 4.21, scree 3.28, sky 2.72, drinkers 2.05). The aim is 7. First things to cut: the two `lipHere` calls a water pixel (ten `lipRadius`), the 22 lap slots and 9 riser slots looped on every water pixel, the four filament layers where the camera is high.

## What I would do next, in order

1. eye-0: fit the pool (a compact oval, a third of the lake's face), mist in the mirror, blue gaps in the mats.
2. eye-2: denser, darker strands in three depths with pale slabs; fewer moving pixels.
3. eye-1: warm light on the shore (the shade is `uShade` and the land map), stronger rings.
4. Cost: the three cuts above, then measure.
5. Every key at `final` tier and native size.
