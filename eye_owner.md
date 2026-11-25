# The Eye · the whole place · `eye_owner` · branch `agent/eye-place`

Read the attached shared sheet `PLACE-OWNERS.md` first: it is the contract. This is what is yours.

- Your place: `eye`. Its approved pictures: `references/approved/6-eye/`. Its text: `kit/02-SUBJECT.md`, section 3, "The Eye · `eye`". Its pictures in words: `references/drafts/NOTES.md`, lines 840 to 1037.
- Your branch: `agent/eye-place`. Your looks branch: `agent/eye-place-looks`.
- Your folders under `src/places/eye/`: all of `src/places/eye/`: `shared/`, the root (`index.ts`, `cameras.ts`, `flight.ts`, `land.ts`), `land/`, `lake/`, `air/`, `drinkers/`, `skeleton/`. `handoff.json` is not yours to change (see below).
- Your parts: `land`, `brow`, `scree`, `stream` (in `land/`); `lake`, `shallows`, `shaft`, `mats`, `riser` (in `lake/`); `sky`, `air`, `mist` (in `air/`); `drinkers` (in `drinkers/`); `skeleton` (in `skeleton/`).
- Your wide key: `eye-0`. Keys that show your work: all five.
- Your share of the cost: the whole 7 seconds (about 2.5 for the lake, 2 for the land, 1.5 for the sky and the air, 1 for the animals).

## You build the whole place

1. **The foundation, pushed by minute 35.** By recipe 5: copy the Heart's `shared/context.ts` (interfaces renamed `Context`, `Piece`, `Folder`), `shared/glsl.ts`, `shared/rig.ts` and `shared/stage.ts` into `src/places/eye/shared/`, cut what this place does not have (the lake's glow map, the crust's drift) and keep every name the sheet lists. Move the blockout's stand-ins into `shared/blockout.ts` behind `createStandIns(scene, parts, owned)`, so that every part no folder owns yet is drawn exactly as the blockout draws it now. Put the place's fixed points (where things stand, when things happen, sea level, the sun) in `shared/anchors.ts`. Make the root `index.ts` call the folders in draw order, as the Heart's does. `npx tsc --noEmit -p .`, build, render the wide key (it must look as the blockout did), push.
2. **The light is yours.** A clear, still evening: warm low light on pale cliffs, black-blue water, no wind at all. So this rig has what the Heart's has not, a sun: one direction, low, and one warm colour. The sun does not move in the 21 seconds of the place, so bake the long shadows of the cliffs and the brow once at creation into the rig's land map; the animals cast theirs through the contact discs, stretched along the sun. The lake mirrors the cliffs and the sky: with no wind the mirror is nearly whole and only rings break it.
3. **The cameras are yours.** Every shot's key frame must match its approved picture: fit each with `npm run -s compare`, height first, then heading, then lens. The land is built round the cameras, not the other way: the camera positions are fixed numbers in the world. Then the route: the items below. A camera never passes through a solid, never goes under the ground or a fluid and never shows the edge of the world: the land reaches the haze in every direction a camera looks.
4. **Then your parts**, in the order of "What is yours to reach".

## What is yours to reach

You are alone on this place for now, with fourteen parts. A second owner for the animals joins when a slot is free, and takes `drinkers/` and `skeleton/` as they then stand: keep those two folders free of anything else. So the order matters:

- **The lake** (`lake`, `shallows`, `shaft`): a round lake about two kilometres across in a socket of cliffs two hundred metres high. A ring of amber shallows, knee-deep and clear, surrounds a centre that goes all the way down: a shaft with sheer walls and no bottom in sight. "Still. Gold at the edge. Black at the center." The edge where the floor stops without warning is key `eye-3`. Clear water over a lit floor, then black: depth by absorption, the cliffs and the sky mirrored, rings spreading, threads of bubbles. Recipe 2.
- **The socket** (`land`, `brow`, `scree`, `stream`): pale cliffs in warm low light, a brow of cliff that overhangs the water on one side, scree at the foot, a shore of rock and gravel (the blockout's "flat grey gravel where the picture has rock"), a stream leaving through a gap in the rim. Recipe 1.
- **Sky, air, mist**: a clear evening, mist at the foot of the cliffs. Recipe 3 and 5.
- **The drinkers** (`drinkers`): pale eyeless long-necked animals that come down to the shore in a herd and never go deeper than their ankles. Key `eye-1`. "The least alien animals in the set. They may be pushed further." Recipe 4: weight before the step, never in step, rings where they drink.
- **The mats** (`mats`): amber filament mats on the floor of the shallows, all combed toward the centre, swaying toward it. Key `eye-2`.
- **The skeleton** (`skeleton`): on the lip where the floor stops, key `eye-3`. Old, half under water, mats growing through it.
- **What rises** (`riser`): key `eye-4`. "What rises is never shown whole. A dome of water, a pale shape under it, and the camera is already leaving." Pale forms hang in the deep.

"This is the quietest place in the film and should feel like held breath, not like a still picture."

**The handoff.** The last shot, `eye-05`, flies from its key to straight above the centre of the lake, and the next frame of the film is the first frame of the rise to orbit, which another owner (`/root/reveal_owner`) builds. Both sides draw the same picture on the frames either side of that cut: `src/places/eye/handoff.json` (the colour of the water, the nine rings, the height of the view, the rate of climb) has an identical copy in `src/places/reveal/` and a test fails if the two differ. Keep to it. If the built lake needs different numbers, agree them with `/root/reveal_owner` by message and tell `/root`: both copies then change in one commit that `/root` makes.

## Your place in the cut

The place `eye` is frames 8305 to 9540 of the film, 20.6 s. `setTime` gets seconds since frame 8305.

| shot | frames | seconds of the place | key | key frame | key at | move | what |
|---|---|---|---|---|---|---|---|
| `eye-01` | 8305 to 8519 | 0.00 to 3.58 | `eye-0` | 8412 | 1.78 s | in | the still lake |
| `eye-02` | 8520 to 8680 | 3.58 to 6.27 | `eye-2` | 8600 | 4.92 s | right | the amber mats |
| `eye-03` | 8681 to 8841 | 6.27 to 8.95 | `eye-3` | 8761 | 7.60 s | left | the edge |
| `eye-04` | 8842 to 9164 | 8.95 to 14.33 | `eye-1` | 9003 | 11.63 s | right | the drinkers |
| `eye-05` | 9165 to 9540 | 14.33 to 20.60 | `eye-4` | 9221 | 15.27 s | in | the centre, in the quiet |

## What the blockout left open, in the critics' words

These are carried to this phase. The camera items are the lead's. Read them all the same: they say where things have to be.

- blockout, carried to Phase 4. After the fixes of round 1 (`76559f2`, merged 02:27 UTC as `e6394d2`, and the Builder's tuning) the establishing key (8412) sits 34 m up and 115 m behind the shoreline with the lake across the frame, shot eye-01 glides 176 m toward the lake through it, shot eye-04 is a track along the waterline that comes to rest, and shot eye-05 is one flight from the key to straight above the centre. Left: in the establishing frame the deep water is a thinner band than in the picture, the animals are about half the picture's size and the bottom of the frame is flat grey gravel where the picture has rock; in shot eye-04 the near animal still covers about the right third of the frame by the end (frames 9100 to 9164); in shot eye-05 the centre of the lake reaches the exact middle of the frame only by about frame 9369; at key eye-4 (9221) the bottom third of the frame is amber shallows where the picture has grey water, because the shelf is 340 m wide at the binding scale; at key eye-3 (8761) the lip lies flatter than in the picture, and shot eye-03 was not touched in round 1.
- blockout round 2, major, contested, carried to Phase 4 · frame 8412, the establishing key · the critic's words: "The lake is framed as a thin horizontal strip and too much of the image is given to flat foreground. The target gives the basin substantially more depth in frame." and its fix, "Raise the opening viewpoint and angle it down". Round 1 asked for the opposite, a lower and nearer camera, and that change was made. The camera is not moved a third time in the blockout. Next: in Phase 4 the lake is built at its real depth and the establishing camera is fitted against the picture with `npm run compare`, height first.
- blockout round 2, severe, carried to Phase 4 · frames 8832 to 9084 · the critic's words: "reaching the lake shore at 2:27 only to cut back onto the dry plain at 2:31 in place 6" and its fix, "in place 6 stay on the path into the lake once reaching the shore". Tried: after round 1 `eye-04` became a track along the waterline and `eye-05` one flight out over the lake. Next: once the camera is at the shore, every later shot stays at the water or over it.
- The rule for every place: inside a place each shot starts where the last one ended and keeps its heading, and the subject of each detail is in frame, small, at the end of the shot before it, so a cut reads as going closer. `kit/01-FILM.md` leaves the order of the details and the camera's route and speed to the Builder.
