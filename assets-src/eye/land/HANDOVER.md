# The Eye: hand-over from eye_owner (version 3)

Honest state: round 12 judged version 2 a fail (match 3, filmed 2, motion 2). Version 3 moves and has the Builder's material pictures, but it is still far from the approved pictures. Read "Still wrong" before anything else.

## How each part is drawn (all under `src/places/eye/`)

- `land` (`land/index.ts`, `land/rock.ts`, `land/height.ts`): one height field for the basin, walls and beach. Rock is `mat/cliff` at 120 m and 41 m along the wall with my beds, ledge lines, streaks and arches; gravel is `mat/shore` at 4 m, 21 m and 1.37 m near the camera. Damp dark band below about 1.9 m.
- `brow` (`land/index.ts`): the overhang on the east side, same rock, under side forced dark (cave term by bearing 26 to 142).
- `scree` (`land/index.ts`): instanced blocks, `mat/cliff` at 9 m, desaturated 60 per cent and tinted cool grey.
- `stream` (`land/index.ts`): a strip down the left shoulder with white water where the bed drops. Barely reads at eye-0.
- `lake`, `shallows` (`lake/index.ts`, `lake/water.ts`): one fragment shader over the surface: planar mirror of the land (`createMirror`), sky from the rig, rings from the centre, lap rings at muzzles and legs (22 slots), wind heave at 46 m, 9 m and 1.9 m, gust lanes. Floor under it with `mat/sinter` crust at the lip.
- `mats` (`MATS_GLSL` in `lake/index.ts`): `mat/mat.jpg` by ground position at 3 m, 1.05 m and 14 m; hair mask from the red to green ratio; beds are noise patches with some rays; gold tint; from far off the bed goes to its mean colour so the repeat does not show.
- `shaft` (`lake/index.ts`): wall ring under the lip with fall-off by depth, closed by a disc at 390 m down, pale forms at 38 to 80 m.
- `riser` (`lake/index.ts`): a dome on the surface (`uDome`, 8.5 m high, radius 66 m), a dark back sphere, rise rings, small tips. Tied to the `rise` event.
- `sky`, `air`, `mist` (`air/index.ts`): rig sky with one cloud streak; height haze; mist marched in 10 steps through a 30 m layer at the foot of the far walls.
- `drinkers` (`drinkers/`): one instanced body (`shape.ts`), neck, head, legs and tail posed in the vertex shader; `herd.ts` places them and gives each its neck over time; `mat/hide` on the skin.
- `skeleton` (`skeleton/index.ts`): tubes and spheres: a cage rolled 62 degrees, broken ribs, nine loose pieces.

## Tried and did not work (do not try twice)

- Mats in a combed polar space (round the lake by out from the centre, with bends): it pulled the picture into long wood-grain streaks (9 jurors). Now laid by ground position.
- Lap rings at 6.2 radians a second: the period is 1.01 s, so on evenly spaced sheets the rings stood still. Now two unlike trains.
- Damp gravel made glossy (rough 0.35): at a grazing camera it mirrors the sky and goes paler, not darker. Damp is now dark and rough.
- `ctx.parts.built(a, b)` returns only `a`: the second object was never in the scene. That was the grey disc of eye-05.
- `textureGrad` in the rock shader: far too slow.
- The dome mirroring the land: brown stripes and a pinched seam. It now takes dim sky only, but its outline still steps down at the middle at eye-4: I believe the surface mesh is too coarse at the centre or its column seam shows, not checked.
- Centre key close to the animals: the flight to the handoff needs the key at least about 31 m half height, so the key is a long lens (8 degrees) from the bluff crest and the two animals are small and whole, not cropped backs.
- Copies of the Heart's maps: deleted, do not bring them back.

## Round 12 order: what is closed

1. Frozen: partly closed. Water heaves and gust lanes cross it, rings travel, drinkers sip and lift (`sips` in `herd.ts`, set so each key matches its picture), lean the neck, shift weight over still feet, breathe; mist and cloud drift faster. At the held wide key the change over 6 s is real but small in a thumbnail. No animal takes a step (no leg solver; a step would slide). The far herd changes neck only every 9 to 17 s.
2. Disc: closed (the cap is in the scene). Bullseye: not closed. It is the flat rest picture from `handoff.json`, mixed in over the last 2.7 s; it still reads as a graphic.
3. Pulled textures: closed on the mats. Not reached: the pale crust band along the lip at eye-3 is still stretched; the seam where water meets the beach at eye-1 is darker but still one straight line.
4. Cut box and two sheets at eye-2 and eye-3: not reached, not diagnosed.
5. Drinkers: tried (hide picture, dark hooves, bonier trunk). Not closed: no modelled head, smooth joints, no folds, no wet legs.
6. Far rim: not reached. Still a striped wall with arches (`rock.ts`), not terraces and rubble fans.

## Still wrong beside the approved pictures, worst first

- eye-1, eye-4, eye-2: the animals read as models. Tube legs, head fused to the neck, same body everywhere.
- eye-3: the water is a cut box with a hard blue panel; the lip is a flat shelf with a straight corner, not a broken diagonal lip; skeleton is thin tubes on top of the crust, not sunk in growth.
- eye-4: wall flat and hazy with no cave or scree slope; dome has a seam; water still warm brown on the right; animals small and central.
- eye-0: rim too tall, striped and regular; brow one black roof; near scree is a few warm boulders with the cliff picture's beds on them, not a grey graded slope; stream does not read; lake nearly black, not a blue oval; mats a flat orange apron with no blue gaps.
- eye-2: right shelf of the brow too large; mist a thin line; mats better but flatter and redder than the picture, no pale slabs standing through.
- eye-1: standing head now in frame but the group is larger and tighter than the picture; reflections still zigzag near the legs.
- eye-05: about a second of plain dark water before the rest rings.
- Draft-tier speckle on near gravel never checked at `final` tier. Nothing in version 3 was looked at above preview size except the last uhd compare of eye-0.

## Staged by shot

Nothing uses `stagedSeconds()` or `during()`. The head lift of the two animals at eye-4, the dome and the rise rings follow the `rise` event; `sips` are phased to the key frames 9003 and 8600 by time, not by shot.

## Cost, seconds a sample at 3840 x 2160, eye-0, draft tier

Measured with `npm run -s cost -- --key eye-0 --format uhd --tier draft`: the whole frame 10.72 s (version 2 was 8.83 s; the aim is 7), an empty frame 1.78 s. Above the empty frame: land 2.54, shallows 1.46, lake 1.23, shaft 1.20, mats 1.06, scree 0.95, sky 0.28, brow 0.15, drinkers 0.12, stream 0.09, skeleton 0.04, riser 0.00 (not in this frame). The tool gave no line for air or mist.
No cheaper variant is kept behind a constant. The wind (12 noise reads a water pixel) and anisotropy 8 on `mat/shore` are the first things to cut.

## What I would do next, in order

1. Drinkers: a real head and jaw, knees and hocks, hooves, hide folds at the neck root, a wet dark band on the legs; two or three body variants.
2. eye-3: find why two sheets and a panel show (lake and shallows surfaces, shaft wall top); break the lip; sink the skeleton into mats.
3. Far rim: lower and round the skyline, benches and rubble fans, drop the arches, cool fill under the brow.
4. eye-0 near shore: graded grey scree slope and a stream that reads; cool the lake toward blue.
5. eye-4: fix the dome seam, give the wall a cave and scree, ask the Builder whether the key may sit closer.
6. Check every key at `final` tier and native size; measure cost again and cut.
