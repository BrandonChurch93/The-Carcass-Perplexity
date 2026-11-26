# The Eye, frames 8305 to 9540: hand-over of the wide polish

Branch `agent/p6-eye-polish`. Written by the unit's lead at the end of the wave. Shots: eye-01 8305 to 8519 (key 8412), eye-02 8520 to 8680 (8600), eye-03 8681 to 8841 (8761), eye-04 8842 to 9164 (9003), eye-05 9165 to 9540 (9221). Approved pictures: `references/approved/6-eye/eye-0` to `eye-4`.

## 1. Done, part by part

Land and skeleton (ground builder, branch `agent/p6-eye-ground`)
- 90ba96e: the blocks of the shore are raised from a baked atlas of eight broken stones with limestone skin at true size; corners merged, skin left out where a stone is a few pixels.
- 2af5f33: gravel sheet under the stones, bedded stones of mixed size, the stream in a cut bed.
- 2624ee7: the flooded bay at 9003, real bones along the lip at 8761, a glassy stream with thin froth, beach stones gathered, larger corner masses at 8412.
- 9587cfb: the corner masses of 8412 as rubble ridges under large blocks (left about 38 percent of the frame's height, right 35), worn pebbles in three kinds of stone standing through the shallows at 9003 and cut to cost, ribs out of step, more weed and a rag of hide on the cage, recipes of the land's pictures.

Lake (fluid builder, branch `agent/p6-eye-fluid`)
- 05d549f: one water for eye-01 to eye-04, mats combed from the rim, the wall falling to blue-black under the lip.
- 3e6f7d9: the deep blue back under the mirror at 8412, the dome of eye-05 as lifted lake water with broken rings, the ribbed wall under the lip, the recipe of the mats.
- e841620 (fluid V4): the deep at 8761 taken from bright blue to dark blue-green and black, the pale fringe inside the lip broken into runs with gaps, the rust grains of the bed at 9003 greyed.
- 0d4b1cb: through eye-05 the mirror of the far world is read twice instead of three times, which brought 9221 from 23.2 s back to 22.0 s; the look holds.

Air and far pictures (sky builder, branch `agent/p6-eye-sky`)
- a5aa132: a glint term in the shared rig for wet things.
- 9558c01: mist as a marched volume, a thin breath at the wall's foot in eye-01, heaped forms in eye-05.
- d86b281: the far rim for eye-03, a soft bank in the mirror of eye-02, cirrus in eye-01, mist in tongues, the grade.
- dc8f1f5: the eye-05 wall hung three times as wide at two thirds of its size (`mat/far-long3.jpg`), gold across the left half, the cave small as in approved eye-4, no repeat as the camera climbs; recipes of the far pictures; the lit wall swells and fades by 5 percent.

Drinkers (life builder, branch `agent/p6-eye-life`)
- 25a73b2: the shore animals of eye-04 are skinned bodies that breathe, shift, step and sip. The other shots keep their cards.
- 2482432: hide on necks and legs, hooves sunk to the pastern, a ring at each standing leg.
- 337383c: rounded rump, hanging tail, belly drawn up behind the girth, even dark legs.
- d9b7096: recipes of `drinker/hide.png` and `drinker/coat.jpg`, no picture change.

## 2. Still wrong, worst first

1. 9400 to 9505, the climb over the lake. The frame is near-empty murky blue with a few pale specks and a warm haze in one corner. The subject sheet asks for the pool seen whole from above with mats, wake and mist that have form. A stronger wake was tried by fluid and dropped, because it bent the view under the surface into arcs. With the Reveal's flight at 9500 the combed mats round the dark pool read as an iris, fringe or not. The fringe was broken into runs in e841620; gaps are still few on the left arc.
2. 8761, the deep. The approved picture shows a dark blue-green that goes to black with the drowned wall visible far down. Now the wall and the near deep are right, but the far deep is flat black under a level edge and has no depth of its own. Before e841620 it was a bright saturated blue.
3. 9003, the shore. The bed under the shallow water at lower right is one flat picture (`mat/shoreplate.jpg`, `lake/bed.ts`); the approved picture has clear water with rings over fine gravel. The animals' legs are smooth and their hide is one tone; the approved animals are pale, creased and scarred. Pebbles now stand over most of the bed (9587cfb), but they are smooth eggs with a pale rim and no grit, and the plate still shows between them at right.
4. 8412, the establishing frame. The blue pool is back but lies as a thinner strip than approved; the mats are a brighter orange and more combed than approved; the animals are cards and stand too small and too dark. The left corner mass is now as high as approved, but its blocks are large, grey and clean where the approved banks are warm weathered rock with the stream running through. The hide on the skeleton reads as torn card and the bones are clean.
5. Eye-05, 9221 to 9365. The far wall is one flat picture on a cylinder, so cave, scree and cliff do not shift against each other as the camera climbs 60 m. It is paler and softer than approved eye-4. Under it the lake has a level brown shelf, orange from 9340, and the mist is still close to level. The dome reads as water, but its skin is smoother than the approved broken swell.
6. Mist, 8305 to 8519, 8600, 9003. One noise volume with one sun term: smooth fog without fine wisps at uhd, slow to change form, and in the mirror at 8600 a cheaper single bank than in the air.
7. Sky and rim pictures. The sky is baked into each far picture; cirrus is drawn only in eye-01, the streaks at 8761 are baked and still; 8600 and 9003 share one rim picture at two sizes, and at 9003 its slopes are a little chalky. No shadow moves on the wall.
8. Bodies exist only in eye-04. At 8412, 8600 and 9221 the animals are still cards, because the bodies did not equal the cards there.

## 3. Held versions

- fluid V1, `agent/p6-eye-fluid` 0a93814: the deep at 8761 a pale grey, the mirror stepped.
- fluid V1b, `agent/p6-eye-fluid` 7e63e6b: the dome of eye-05 silver with a crisp foot, its rings lost; from overhead a ringed disc with white flecks that read as an iris. The rest of it came in later with V1c (9320b5d, merged as 05d549f).
- sky V1, `agent/p6-eye-sky` 8c2eac5: a white level ribbon of mist at 8305 and 8412.
- sky V1b, `agent/p6-eye-sky` 95d0418: a white level stripe in eye-05.
- sky V2, `agent/p6-eye-sky` f4aa506: a new wall for eye-05 (`far-long2`) lit only in a corner, the water dull, a flat brown band, a mirrored cone at 9300.
- sky V2b, `agent/p6-eye-sky` 3889821: the eye-05 wall red-orange in one third, the cave lost.
- life V1, `agent/p6-eye-life` 6f77a40: bodies in every shot; they read as clay, thin, and the stills at 9003, 9221 and 8600 were worse than the cards.
- ground V4 in its first form, `agent/p6-eye-ground` d2eeb34: better to look at, but 9003 cost 26.28 s against a limit of 24.83. Its cheaper form db961eb was merged as 9587cfb.

## 4. What to try next, for the worst three

1. The climb, 9400 to 9505. Give the overhead view its own content in `lake/`: the mats broken into islands of unequal size instead of one combed ring, a pool edge that is not a circle (bays and a shelf on one side), and a wake drawn as surface foam only, so that it does not bend the view under the water. Look at it through the Reveal's `flight.ts` each time, and settle with `reveal_lead` what the join frames 9400, 9500 and 9540 must show.
2. The deep at 8761. Let the drowned wall carry on down in steps that fade by distance through the water, with a few pale shafts or hanging weed far down as in the approved picture, in place of a fall to flat black; soften the level edge where the deep meets the mirror.
3. The shore at 9003. Replace the flat bed picture by real relief under the water: fine gravel as a height field with the water's rings refracting it, and no second picture. On the animals, a creased and scarred hide map with lighter tone, and a narrower leg with tendon and joint. Keep an eye on cost: this frame sits at the limit.

## 5. What a newcomer would trip over

- Eye frames do not repeat byte for byte. Known: 8305, 8412, 8600, 8761, 9003, 9221, 9300 (for example 8412: 196 pixels by up to 6 levels; 9003: 51 pixels by up to 9). Compare by eye or with a tolerance, never with `cmp`. The guard frames of other units, 1241, 4409 and 7234, do repeat and were equal at every report.
- `src/places/eye/handoff.json` and `src/places/eye/flight.ts` belong to the Reveal's climb (`reveal_climb_builder`, lead `reveal_lead`). They are untouched on this branch. The flight looks straight down on the lake at 9500, so anything round with radial strokes reads as an iris there.
- Cost. Before the wave (uhd draft, one sample): 8305 18.5 s, 9003 19.1 s, 9221 17.1 s. The limit is 30 percent more. At the end: 8305 23.2 s (limit 24.05), 9003 24.6 s (limit 24.83), 9221 22.0 s (limit 22.26). All three sit at the limit, so anything added must be paid for by a cut elsewhere, and one run varies by about 0.3 s. The lake is more than half of every frame's cost.
- The cost tool takes the cheapest part as the empty frame, and that part changes from frame to frame (3.5 s at 9003, 1.9 s at 8305), so compare whole frames.
- G8 wants a recipe beside every picture under `public/assets/eye/`: they sit in `assets-src/eye/<folder>/RECIPE.md`. G8 named no Eye file at 9587cfb.
- The `look` line in `src/places/eye/index.ts` is the sky builder's alone. The stream is the ground builder's. The flooded bed at 9003 (`lake/bed.ts`) is the fluid builder's. `rigBounce` in the shared rig is opt-in and has not been tried on a surface.
- The lake is still and there is no wind: nothing may slide or pulse. The far walls are hung pictures (`air/plates.ts`), one for each shot.
- One slip in this wave: life's branch head 48b63f5 was merged two small commits beyond the checked 12d149c. It was looked at after the merge and found better; every later merge was made by its checked commit.
