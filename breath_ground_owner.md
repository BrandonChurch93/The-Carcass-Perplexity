# The Breath · ground, shafts, vapour and cameras · `breath_ground_owner` · branch `agent/breath-ground`

Read the attached shared sheet `PLACE-OWNERS.md` first: it is the contract. This is what is yours.

- Your place: `breath`. Its approved pictures: `references/approved/3-breath/`. Its text: `kit/02-SUBJECT.md`, section 3, "The Breath · `breath`". Its pictures in words: `references/drafts/NOTES.md`, lines 354 to 520.
- Your branch: `agent/breath-ground`. Your looks branch: `agent/breath-ground-looks`.
- Your folders under `src/places/breath/`: `shared/`, the root (`index.ts`, `land.ts`), `land/`, `air/`.
- Your parts: `land`, `shaft`, `hoops`, `slabs`, `cliff` (in `land/`); `sky`, `air`, `fog`, `vapour`, `exhale` (in `air/`).
- Your wide key: `breath-0`. Keys that show your work: all five.
- Your share of the cost: 5 of the place's 7 seconds (about 2 for the land, 3 for the sky and the vapour). Your partner has 2.
- Your partner: `/root/breath_life_owner`, branch `agent/breath-life`, folders `water/` (part `sea`), `plumes/` (`gill-plumes`), `waders/` (`waders`) and `dead/` (`dead-wader`). Message them directly when the foundation is pushed and whenever an anchor moves.

## You are the lead of this place

1. **The foundation, pushed by minute 35.** By recipe 5: copy the Heart's `shared/context.ts` (interfaces renamed `Context`, `Piece`, `Folder`), `shared/glsl.ts`, `shared/rig.ts` and `shared/stage.ts` into `src/places/breath/shared/`, cut what this place does not have (the lake's glow map, the crust's drift) and keep every name the sheet lists. Move the blockout's stand-ins into `shared/blockout.ts` behind `createStandIns(scene, parts, owned)`, so that every part no folder owns yet is drawn exactly as the blockout draws it now. Put the place's fixed points (where things stand, when things happen, sea level, the sun) in `shared/anchors.ts`. Make the root `index.ts` call the folders in draw order, as the Heart's does. Create the partner's folders `water/`, `plumes/`, `waders/` and `dead/`, each with an `index.ts` that exports `PARTS = []` and a `create` that returns `{}`, and list them in the root. `npx tsc --noEmit -p .`, build, render the wide key (it must look as the blockout did), push, and tell your partner by message that it is there.
2. **The light is yours.** A cold dawn with sea fog and a low warm sun. So this rig has what the Heart's has not, a sun: one direction, low, and one warm colour, through cold blue-grey fog. The sun does not move in the 23 seconds of the place, so bake the long shadows of the land once at creation into the rig's land map; the animals and the plumes cast theirs through the contact discs, stretched along the sun, or a small target of your own. The fog takes the sun: bright toward it, cold away from it.
3. **The cameras are yours.** Every shot's key frame must match its approved picture: fit each with `npm run -s compare`, height first, then heading, then lens. The land is built round the cameras, not the other way: the camera positions are fixed numbers in the world. Then the route: the items below. A camera never passes through a solid, never goes under the ground or a fluid and never shows the edge of the world: the land reaches the haze in every direction a camera looks.
4. **Then your parts**, in the order of "What is yours to reach".

## What is yours to reach

- **The vapour** (`vapour`, `exhale`, `fog`, `air`): this is the subject of the place and "the hardest place to design, because its subject is air. The vapour has to read as a heavy thing with weight and a surface, not as haze." It slides out of the shaft, lies low over the rock, pools at the rim and spills. It has a top you can see, with slow folds, and it takes the low sun on that top. The `exhale` is the event at frame 4652: the shaft breathes out, a mass with weight, seen from above in shot `breath-02` (key `breath-4`, down the shaft). The fog bank stands off at sea and pours out of the cave in the far cliff. Recipe 3; the Heart's air was judged "a pale, even veil" where it failed.
- **The shaft** (`shaft`, `hoops`, `slabs`): the largest airway, about sixty metres across, sheer inside, ringed with ruined cartilage hoops, one side collapsed into slabs. Key `breath-4` looks down it; key `breath-2` is its rim; key `breath-3` its lip.
- **The shelf** (`land`): a tidal shelf of pale bone-rock planed flat by the sea: ivory, wet, pitted, with pools, joints, weed stains and a tide channel across it (your partner draws the water: publish the bed and the banks).
- **The cliff** (`cliff`): a sea cliff with a cave three kilometres on, fog pouring out of it down the scree. In the establishing picture it is tall across the upper right: an open item below.
- **Sky**: cold dawn, the low sun through fog.

## Your place in the cut

The place `breath` is frames 4221 to 5617 of the film, 23.3 s. `setTime` gets seconds since frame 4221.

| shot | frames | seconds of the place | key | key frame | key at | move | what |
|---|---|---|---|---|---|---|---|
| `breath-01` | 4221 to 4596 | 0.00 to 6.27 | `breath-0` | 4409 | 3.13 s | in | the shelf at dawn |
| `breath-02` | 4597 to 4865 | 6.27 to 10.75 | `breath-4` | 4731 | 8.50 s | in | down the shaft, it breathes out |
| `breath-03` | 4866 to 5080 | 10.75 to 14.33 | `breath-3` | 4973 | 12.53 s | out | the red weed at the rim |
| `breath-04` | 5081 to 5402 | 14.33 to 19.70 | `breath-1` | 5242 | 17.02 s | right | the pale herds |
| `breath-05` | 5403 to 5617 | 19.70 to 23.28 | `breath-2` | 5510 | 21.48 s | in | the one at the rim |

Events (each falls on an accent of the music, so its frame is fixed):

- `exhale`: frame 4652, 7.18 s of the place. The shaft breathes out.

## What the blockout left open, in the critics' words

These are carried to this phase. The camera items are the lead's. Read them all the same: they say where things have to be.

- blockout, carried to Phase 4. After the refit (`ec81ce7`, merged 01:37 UTC) the near wader at key breath-1 (5242) is whole, the large weed at key breath-3 (4973) fills the left 60 percent of the frame, and the establishing frame (4409) has rock at both lower corners and a narrower, ragged channel. After the follow-up (`708dff3`, merged 02:30 UTC) the exhale (event at frame 4652) is ten separate puffs that rise out of the shaft and drift, so key breath-4 (4731) shows the open shaft with a small pale dome on the left and no frame is filled by one pale shape. Left: at key breath-4 the pale dome is opaque where the picture has mist, and the column of puffs reads thin where the picture has a mass of vapour; the first frames of shot breath-03 (4866 to about 4905) have two or three pale balls at the right and top of the frame, which are the last puffs passing near the camera; at key breath-3 the second weed at the far left edge is a small wedge and the lower right shows pale slabs where the picture has the dark shaft; in the establishing frame the rim of the shaft sits about 5 percent of the width right of the picture and the channel widens too early at the upper left; in the first seconds of shot breath-01 two boulders pass under the middle of the frame, about 4 m below the camera.
- blockout round 2, severe, carried to Phase 4 · frames 4729 to 4982 · the critic's words: "the camera drives into the crater rim and then through the red plant, so for about four seconds the frame is a wall of rim stripes, a large pale blob and red blades with nothing legible to look at". Tried: before round 2 the exhale was broken into ten puffs so that no single pale shape fills the frame; the paths of `breath-02` and `breath-03` were not changed. Next: `breath-02` ends above the shaft with the far rim and a wader in frame and keeps clear of the wall; `breath-03` starts wide enough to read the weed as a plant on the rim and passes beside it, ending on the framing of key breath-3.
- blockout round 2, major, carried to Phase 4 · frame 4409, the establishing key · the critic's words: "the target frames a tall cliff with a cave mouth across the upper right; the blockout frame shows a low soft ridge and sky there, and the camera is lower and nearer the crater". Tried: the refit of 01:37 UTC moved the rim and the channel, not the cliff. Next: build the cliff at its height in the picture and pull the camera back and up until the cliff and the cave fill the upper right.
- blockout round 2, severe, carried to Phase 4 · frames 4794 to 5551 · the critic's words: "leaving the inside of the banded pool back to the bank in place 3". Tried: nothing in the blockout beyond the refit of 01:37 UTC. Next: one route from the establishing view to the rim, then along it, with no shot that steps back.
- The rule for every place: inside a place each shot starts where the last one ended and keeps its heading, and the subject of each detail is in frame, small, at the end of the shot before it, so a cut reads as going closer. `kit/01-FILM.md` leaves the order of the details and the camera's route and speed to the Builder.
