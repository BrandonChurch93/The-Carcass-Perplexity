# The Ribs · ground, blades, weather and cameras · `ribs_ground_owner` · branch `agent/ribs-ground`

Read the attached shared sheet `PLACE-OWNERS.md` first: it is the contract. This is what is yours.

- Your place: `ribs`. Its approved pictures: `references/approved/1-ribs/`. Its text: `kit/02-SUBJECT.md`, section 3, "The Ribs · `ribs` · with the opening". Its pictures in words: `references/drafts/NOTES.md`, lines 22 to 194.
- Your branch: `agent/ribs-ground`. Your looks branch: `agent/ribs-ground-looks`.
- Your folders under `src/places/ribs/`: `shared/`, the root (`index.ts`, `layout.ts`, `cameras.ts`), `land/`, `air/`.
- Your parts: `land`, `ribs`, `weed`, `ledges`, `rocks` (in `land/`); `sky`, `air`, `cloud` (in `air/`).
- Your wide key: `ribs-0`. Keys that show your work: all five, and the opening (shot `ribs-01`, which has no key).
- Your share of the cost: 4.5 of the place's 7 seconds (about 2.5 for the land, the blades and the weed, 2 for the sky, the air and the cloud). Your partner has 2.5.
- Your partner: `/root/ribs_sea_owner`, branch `agent/ribs-sea`, folders `sea/` (parts `sea`, `surf`, `runnels`, `bore`), `wings/` (`kite-wings`) and `drowned/` (`drowned`). Message them directly when the foundation is pushed and whenever an anchor moves.

## You are the lead of this place

1. **The foundation, pushed by minute 35.** By recipe 5: copy the Heart's `shared/context.ts` (interfaces renamed `Context`, `Piece`, `Folder`), `shared/glsl.ts`, `shared/rig.ts` and `shared/stage.ts` into `src/places/ribs/shared/`, cut what this place does not have (the lake's glow map, the crust's drift) and keep every name the sheet lists. Move the blockout's stand-ins into `shared/blockout.ts` behind `createStandIns(scene, parts, owned)`, so that every part no folder owns yet is drawn exactly as the blockout draws it now. Put the place's fixed points (where things stand, when things happen, sea level, the sun) in `shared/anchors.ts`. Make the root `index.ts` call the folders in draw order, as the Heart's does. Create the partner's folders `sea/`, `wings/` and `drowned/`, each with an `index.ts` that exports `PARTS = []` and a `create` that returns `{}`, and list them in the root. `npx tsc --noEmit -p .`, build, render the wide key (it must look as the blockout did), push, and tell your partner by message that it is there.
2. **The light is yours.** The sky is clearing after a storm: broken cloud, wind, a sun that comes through the gaps. So this rig has what the Heart's has not, a sun: one direction and one colour. The sun does not move in the 42 seconds of the place, so bake the shadow of the blades and the land once at creation into the rig's land map (march the height and the blade shapes toward the sun), and let moving cloud shadow be one drifting mask in the rig that every surface and the sea read through `rigShade`. The sea is your partner's and takes its sky from your `skyRadiance`: agree on it.
3. **The cameras are yours.** Every shot's key frame must match its approved picture: fit each with `npm run -s compare`, height first, then heading, then lens. The land is built round the cameras, not the other way: the camera positions are fixed numbers in the world. Then the route: the items below. A camera never passes through a solid, never goes under the ground or a fluid and never shows the edge of the world: the land reaches the haze in every direction a camera looks.
4. **Then your parts**, in the order of "What is yours to reach".

## What is yours to reach

- **The blades** (`ribs`): two rows of rib blades standing out of the sea and leaning in overhead, hundreds of metres high, the strait floor about 600 m wide. Pale stone above the weed line, streaked white by the colony, rust lichen, cracks, ledges, fallen pieces. They must be far larger than they first seem: scale comes from structure at 50 m, 5 m, 50 cm, from the weed line, the surf at their feet and the haze between one blade and the next. In the opening the first blades are large in frame from frame 0.
- **The weed** (`weed`): black weed covers every blade up to the tide line, about thirty metres up: a wet, hanging, dripping mass with a ragged upper edge, not a painted band. Water runs off it. The drowned animal hangs in it at key `ribs-1` (the camera looks up at it): your partner hangs the animal, you give the weed it hangs in.
- **The ledges** (`ledges`) where the colony nests, above the weed line (key `ribs-3`), and **the rocks** (`rocks`): the dark rock and weed of the foregrounds of keys `ribs-2` and `ribs-4`.
- **The floor** (`land`): at low tide, wet sand flats with ripple marks, pools and runnel beds, the entrance cliff, the arch rock, the far shores. Your partner draws the water that lies and runs on it: publish the bed.
- **Sky, air, cloud**: slate and pale, wind, broken cloud moving, spray haze low over the water, shafts of light where the cloud opens.
- **The opening** (shot `ribs-01`, 17 s, no approved picture): in from the open sea, low over the water, in this weather. It has to stop a scroll before a word is spoken: sea, spray and fliers move in the first two seconds.

## Your place in the cut

The place `ribs` is frames 0 to 2506 of the film, 41.8 s. `setTime` gets seconds since frame 0.

| shot | frames | seconds of the place | key | key frame | key at | move | what |
|---|---|---|---|---|---|---|---|
| `ribs-01` | 0 to 1041 | 0.00 to 17.37 | none |  |  | in | the approach from the sea, one shot up to the first strike |
| `ribs-02` | 1042 to 1439 | 17.37 to 24.00 | `ribs-0` | 1241 | 20.68 s | in | the strait |
| `ribs-03` | 1440 to 1651 | 24.00 to 27.53 | `ribs-3` | 1546 | 25.77 s | left | the colony |
| `ribs-04` | 1652 to 1866 | 27.53 to 31.12 | `ribs-2` | 1759 | 29.32 s | in | the feeders at low tide |
| `ribs-05` | 1867 to 2294 | 31.12 to 38.25 | `ribs-1` | 2081 | 34.68 s | in | the camera looks up at the drowned |
| `ribs-06` | 2295 to 2506 | 38.25 to 41.78 | `ribs-4` | 2401 | 40.02 s | hold | the bore comes through the cage |

Events (each falls on an accent of the music, so its frame is fixed):

- `bore`: frame 2402, 40.03 s of the place. The bore comes through the cage.

## What the blockout left open, in the critics' words

These are carried to this phase. The camera items are the lead's. Read them all the same: they say where things have to be.

- blockout, carried to Phase 4. After the fixes of round 1 (`61dc42c`, merged as `5b3085b`, and `3f82f38`) shots ribs-01 and ribs-02 are one approach of 1331 m along the axis of the establishing picture, one function of time across their cut, with the lens opening from 19.8 to 44.1 degrees, and the surf is four narrow streaks. Left: the near left rib reads pale from far out; by the builder's report the arch rock sits at 65 percent of the width where the picture has 85; in the establishing frame (1241) the horizon sits at 58 percent of the height where the picture has 52, the ribs at the centre are smaller and more crowded than in the picture and the fused arch reads as one blade; at key ribs-2 (1759) there is no dark rock in the left foreground; at key ribs-3 (1546) there are no large fliers near the camera; at key ribs-4 (2401) the foreground is flat where the picture has rock and weed. The feeders, the fliers and the drowned one are flat shapes, as stand-ins are.
- blockout round 2, severe, carried to Phase 4 · frames 0 to 1139, the opening · the critic's words: "it starts far out at sea behind the front-left rib (hiding the left carcass cliff, the broken arch, and the tidal flat) and drifts slowly over empty water with nothing clearly moving in the first two seconds, taking about 20 seconds to reach the target framing". Tried: after round 1 the approach was steered along the axis of the establishing picture and the surf became four streaks. The fix the critic names, opening on the wide view, is declined (see "Declined issues"). Next: in Phase 4 the opening is built so that the first blades are large in frame from frame 0 and the sea, the spray and the kite-wings move in the first `film.hookSeconds` seconds; critic R6 judges it in Phase 5.
- blockout round 2, severe, carried to Phase 4 · frames 1595 to 2278 · the critic's words: "leaving the tidal flat for the right mound then cutting back to the entrance cliff in place 1". Tried: after round 1 shots `ribs-01` and `ribs-02` became one approach. Next: order the Ribs' details along one route up the strait, each shot starting where the last ended.
- The rule for every place: inside a place each shot starts where the last one ended and keeps its heading, and the subject of each detail is in frame, small, at the end of the shot before it, so a cut reads as going closer. `kit/01-FILM.md` leaves the order of the details and the camera's route and speed to the Builder.
