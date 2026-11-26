# The Eye: hand-over from eye_owner_3 (version 3 of wave 3)

Honest state: round 18 judged the place I received at match 3, filmed 4, motion 6, jury 0 of 25. This version has not been judged. Measures at draft tier in uhd are green (M3 1.84, 1.86, 3.72, 3.31, 1.86 for eye-0 to eye-4); the final-tier measure of frame 8412 was started and stopped after 15 minutes without a result, so it is not known. Read "Still wrong" first.

## How each part is drawn (all under `src/places/eye/`)

- Far world (`shared/glsl.ts`, `farRadiance`): the Builder's far pictures (`mat/far` at double size, `far-low`, `far-long`) hung per shot group; built land beyond `uNear` and the brow hidden while one hangs. `uPlateShade` gives the wall of eye-01 contrast and shades its east end. The water mirrors the picture by the reflected ray; `uMirror` tones the far mirror per shot.
- `land`, `brow` (`land/height.ts`, `land/rock.ts`): one height field. Under a low eye the shore is the Builder's shore picture (`mat/shoreplate`) at its own size with its relief; from the rim the same picture laid 2.6 times larger, read only 280 to 430 m from the eye.
- `scree` (`land/index.ts`): instanced blocks, triplanar, faces under a tenth of weight not read. The corner blocks of the wide shot are 1.7 times larger. 13000 pebbles before the shore camera, laid in drifts with bare grit between and a cobble here and there.
- `lake`, `shallows`, `shaft` (`lake/index.ts`, `lake/bed.ts`): one water surface, the bed worked out in the shader where the bent ray meets it. Rings from the centre in two crossing trains; lap rings per leg pair and muzzle; under a low eye the shaft is teal under the lip and the wall shows only where it faces the eye. The pool's edge from the rim is a soft pale band.
- `mats` (`bed.ts`): filaments for low eyes (ridges of noise in four finenesses). From the rim (`rimEye`) a mottled field with no direction: rust and amber patches, dark channels, pale pools, thinning to silt at the shore; the water over them takes their colour (`onMats`). Under an eye on the lip the strands run over the whole shelf to the edge (`onFoot`).
- Swell (`lake/index.ts`, `uDome`): the water mesh itself is lifted, 60 m across and up to 8.5 m, profile `(1-u^2)^3`; dark near face, pale crown, threads of run-off, wide broken rings (36 m apart, fading over 120 m).
- `riser`: instanced tips, a ring and a small splash each (the splash fades seen from above).
- `sky`, `air`, `mist` (`air/index.ts`): rig sky; a mist bank at the foot of the hung picture, its weight set by shot; grey under the long lens; drift fog for low eyes.
- `drinkers` (`drinkers/`): lit cards from the Builder's sheets with relief; backs of eye-05 sharp (lens 0.005), skin blur and tan lowered; the wide herd darkened so that it stands against the flat.
- `skeleton`: the Builder's picture and relief, bone pale (times 2.9), on the very lip (`back` 0.7), tipped up 36 degrees, its ribs and hind end over the dark water.
- Contact shadows (`shared/rig.ts`): the map of a high eye is centred on the shore; before this the herd and stones of eye-01 had none.

## Tried and did not work (do not try twice)

- All of the former lists stand: combed polar picture warps, the mat picture warped by noise, lap rings near 1 s, glossy damp gravel, `textureGrad`, shingle as one cell size, sharp relief at full strength on backs, the mirrored ray taking the full wave throw under a long lens, a fan that begins at the waterline.
- `mat/matfield` over the whole shelf: reads as cloth from the rim; declined. Mats combed toward the pool from the rim: blurred cloth (the Builder's word). Now mottled.
- Swell as a silver disc; as a dome 8 m high with strong threads (a parasol); rings 11 m apart under the long lens, and rings 21 m apart running whole (parallel bands).
- Large blotches or level wrinkle bands on the backs: stripes. A soft crust with a green band over the pool's edge: a teal outline.
- Two tries at the far-shore seam of eye-3 through fog and a calm mirror: no visible change.

## Round 18 critics and jury: each issue and what was done

- eye-0 "flat grey mud plain edged with low-poly rocks", "ruler-straight shoreline edge", "pale curved strip": larger corner blocks, contact shadows, warmer stone, the strip gone. Blocks are still few and coarse.
- eye-0 "even field of brown-orange tiger stripes", jury "visibly seamed foreground": mats mottled with channels and pools, thinning to silt. Not the picture's streaks of many colours.
- eye-0 held "the herd holds the same silhouettes", eye-04 "posed models", jury "same flatly shaded animal model copied", "clay-like sculpted skin", "repeated stripe patterns": not closed. Cards cannot step; heads dip and rings run. The wide herd is darker and shadowed.
- eye-1 "hard, perfectly straight horizontal edge", "flat band of haze": camera nearer, mist lighter (0.22), far mirror toned; the line remains level.
- eye-1 "even field of pebbles", "low-poly, faceted", jury "uniformly scattered", "necks intersect the water without visibly displacing it": drifts, cobbles, rings at each muzzle and leg pair. No drops; pebbles still read made.
- eye-2 "flat, sandy, speckled ground under painted caustic lines", "blurry procedural noise", jury "uniform, repeated filament-like streaks": filaments kept from the last owner; no bubble trails. "mirror seam on the right edge": the hung picture; not seen in my frames.
- eye-3 "bones melted and smeared", "clay-like model", jury "3D asset laid on top, very little contact shadow": bone pale, on the lip, tipped up, with a contact disc. No skull reads; no weed across it.
- eye-3 "algae a flat orange texture", "underwater wall missing", jury "jagged cutout edge": strands over the shelf to the edge, teal wall under the lip.
- eye-3 and eye-4 "ruler-straight line at the cliff base", "flat grainy mist band", jury "hard horizon seam", "uniform fog layer": mist greyer and lower under the long lens; the line itself not closed.
- eye-4 "mathematically uniform rings", "no meniscus, wet runoff", jury "uniform, parallel ripple bands", "tiny spikes without any splash": wide broken rings, a raised swell with run-off threads, splashes. eye-05 "clean target-like rings" at the end is the profile agreed with the reveal and was left.

## Still wrong beside the approved pictures, worst first

- eye-0: mats are mottled, the picture's have many colours and fine drawn streaks; the wall is still paler than the picture's gold; the herd is small plain cards; no trickle bottom left; blocks coarse.
- eye-4: water browner than the picture's silver, rings wider but still regular from above (frames 9335 to 9370); heads are neck ends; backs pinker.
- eye-3: skeleton thick-limbed with no skull, no weed over it; far water dark under the wall foot; no wall across a bay; no depth of field.
- eye-1: animals half the picture's size, no drops, pebbles still even in size; the far waterline level.
- eye-2: untouched this wave beyond tone. M3 above 3 at draft in eye-2 and eye-3 (fine strands); grain not judged at playing speed.

## Staged by shot

Far picture per shot group; built land beyond `uNear` hidden while a plate hangs; `uShade` and `uPlateShade` in eye-01; `uLipIn` 270 in eye-01; drinkers per shot camera; `wideOnly` herd; mist weight by shot (0.22 eye-04, 0.5 eye-01, 0.8 eye-05, 0.6 else); drift fog for low eyes and the long lens; lens blur in eye-04 and eye-05; rings times 0.3 and paler sky from high; far-mirror tone in eye-03, eye-04, eye-05. By camera height, not by shot: mats mottling, cover and the soft pool edge from high; strands over the shelf and the teal shaft from low; corner blocks; splashes fade from above; backs of eye-05 sunk.

## Cost, seconds a sample at 3840 x 2160, frame 8412, draft tier

`npm run -s cost -- --key eye-0 --format uhd --tier draft`. Received 16.01 on this machine; now 15.11 and 15.46 in two runs (16.00 at version 2), which is 3 to 6 percent under and not a clear margin (empty stage 1.75; above it: lake 5.7, land 4.2, scree 1.8, sky 1.05, drinkers 0.26, stream 0.14). Saved by: lip radius read once a pixel, lap slots counted, scree and shore relief read only where seen, the mats picture not read from the rim, the long heave and the fine crust made of numbers from the rim. The aim of 7 is far off: the land's 4 s for a third of the frame and the water's 5.6 s are the places to look (texture reads over large areas are the cost, about 0.2 s each).

## What I would do next, in order

1. Animals: cards with a second pose to blend, or meshes; nothing else moves the jury.
2. eye-0 mats from the Builder's picture laid once, unwarped, under the mottling; gold on the wall.
3. eye-3 a skull and weed on the bones; a shore across the bay.
4. eye-4 heads; silver water.
5. Cost: the land shader under the rim eye.
