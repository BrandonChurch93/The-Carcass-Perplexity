# 04 · The look

## 1 · The bar, in Brandon's words

- Hyper-realistic means the viewer believes they are looking at something real, even when the subject could not exist. It never means limited to real things.
- The standard is a top-budget film or a AAA game cinematic. He named GTA 6 and Avengers: Doomsday.
- "A truly alien world, a fantasy styled world that felt alive, not some barren desert wasteland."
- "These have to be like 3D environments, not just an image."
- "Make it super realistic and heavy, whatever we have to do to make it look ultra realistic, as long as the motion is still there and it feels like it's a real 3D environment."
- Of the 34 approved pictures: they "look absolutely incredible". They are the bar made concrete. When words and an approved picture disagree, the picture wins.
- Of the film as a whole: tough, harsh, mature. It is for X.

What it is never: cartoon, painterly, stylized, flat, plastic, a concept painting, a matte painting that slides, a web 3D demo, a game from ten years ago.

## 2 · What makes a frame of this film

- A camera took it. A lens with a real field of view, focus on one thing and softness in front of and behind it in the close views, a little bloom on what is truly bright, grain fine enough to be felt and not seen. The approved details show the depth of field to aim for.
- Light has a source and a time of day, and each place has its own: after-storm daylight in the strait, nightfall lit from below at the lake of fire, low sun through fog on the shelf, flat white overcast on the flats, dusk and lightning on the ridge, a clear still evening at the lake.
- Air is in the picture. Haze, vapour, spray, fume, spindrift, mist. It separates near from far and it moves.
- Scale is felt. Something small and alive is in frame near something enormous.
- One saturated colour for each place, carried by what lives or leaks there, against stone and water. The film must never slide back to uniform grey rock: that was the fault of the first rejected references.
- The frame is composed. The subject is where the eye goes first, and the camera's move ends on a picture as good as the one it started on.

## 3 · The camera

- It moves like a heavy camera on a crane, a boat or a slow aircraft: eased, deliberate, never floaty and never mechanical. It pushes in. It does not orbit for the sake of orbiting.
- It travels through the place. Parallax is constant.
- Motion blur comes from the shutter, `film.shutterDegrees`, across the samples of each frame.
- A long lens for the far strike on the Spine. Low and wide at the water in the strait and on the flats. Close and shallow on the animals.
- The first `film.hookSeconds` seconds have to hold someone who is scrolling with the sound off. Something large is already in frame, and something is already moving.

## 4 · Grade and finish

- One grade for the whole film, set at the look lock, so the six places read as one world filmed by one crew. Each place keeps its own colour inside it.
- Blacks are never crushed and whites never clip, except the core of lava and of lightning.
- No vignette you could point at. No lens flare for decoration. No chromatic fringes.
- The picture has to survive the platform's compression: avoid large flat dark areas that band, and fine noise that turns to blocks. `kit/07-QUALITY-BAR.md` tests a stress encode.

## 5 · Diagnostic views

The frame interface can draw these in place of the finished picture, for the harness and for your own looking:

- `standins`: every pixel drawn by a part that is a stand-in, in a flat warning colour.
- `motion`: the difference between two frames `motion.checkGapSeconds` apart with the camera frozen at the first.
- `depth`: distance from the camera.
- `solo`: one named part drawn alone, with everything else hidden.

## 6 · The ladder

When the same issue survives `quality.plateauRounds` rounds in a row, stop tuning and move one rung for that problem. Log the rung.

1. Change the technique for the part that causes it.
2. Restage it: change the distance, the lens, the light or the weather so that the weakness is not what the eye lands on, while the view still shows what its key shows.
3. The fallback chain in `kit/03-METHOD.md` section 5, from its first step.

When the rungs are used up the problem becomes an open item. It is never a blocker.
