# The Breath · the waders, the red plumes and the water · `breath_life_owner` · branch `agent/breath-life`

Read the attached shared sheet `PLACE-OWNERS.md` first: it is the contract. This is what is yours.

- Your place: `breath`. Its approved pictures: `references/approved/3-breath/`. Its text: `kit/02-SUBJECT.md`, section 3, "The Breath · `breath`". Its pictures in words: `references/drafts/NOTES.md`, lines 354 to 520.
- Your branch: `agent/breath-life`. Your looks branch: `agent/breath-life-looks`.
- Your folders under `src/places/breath/`: `water/`, `plumes/`, `waders/`, `dead/`.
- Your parts: `sea` (in `water/`); `gill-plumes` (in `plumes/`); `waders` (in `waders/`); `dead-wader` (in `dead/`).
- Your wide key: `breath-0`. Keys that show your work: `breath-1` (the waders feeding in the channel), `breath-3` (the gill-plumes on the lip), `breath-2` (the rim with the dead one), `breath-0`.
- Your share of the cost: 2 of the place's 7 seconds. The lead has 5.
- Your partner: `/root/breath_ground_owner`, branch `agent/breath-ground`: the lead. It owns `shared/`, the root, the cameras, `land/` (the shelf, the shaft, its hoops and slabs, the cliff) and `air/` (the sky, the fog, the vapour, the exhale).

## You are the second owner of this place

- The lead builds the foundation first and pushes it to `origin/agent/breath-ground` by about minute 35, with your folders already listed in the root as empty stubs. **Do not wait for it idle.** In those minutes: read; look at your pictures; then write your shapes, your cycle and your shaders in your own folders against the Heart's signatures (the sheet lists them), which the lead keeps. Import from `../shared/context`, `../shared/glsl`, `../shared/rig`, `../shared/stage` and `../shared/anchors` as the Heart's folders do: the imports resolve once the foundation is merged. Each of your folders has an `index.ts` that exports `PARTS` and `create(ctx)`.
- From minute 35: `git fetch -q origin "+refs/heads/agent/breath-ground:refs/remotes/origin/agent/breath-ground" && git merge -q --no-edit -X ours origin/agent/breath-ground` (your own files win over the lead's empty stubs of your folders), then check that the root lists your folders and render the whole place. If the lead's branch is not there by minute 50, message the lead and `/root`, and go on in your folders.
- The land, the light and the cameras are the lead's. Read heights and anchors from `shared/`, never keep your own copy of a number. If you need an anchor that is not there (where an animal stands, the line of a shore), ask the lead by message for exactly that and carry on with a local constant marked `TEMPORARY`.
- Your version 1 is due by minute 80: every part of yours built plainly, in place, at the right size, lit by the rig.

## What is yours to reach

In this order:

- **The waders** (`waders`): tall pale four-legged animals with plumed tendrils for a head, no eyes, feeding in the tide channel. Key `breath-1` is close on them; the narration calls them the pale herds. One stands over the drop at the rim in key `breath-2`. Recipe 4: copy the pattern of the Heart's walkers, and mind what the critics said of those: "the bodies stay propped at almost the same height and attitude ... posing the limbs rather than transferring weight between feet". Weight shifts before a step, a herd is never in step, something always pauses, turns or looks up, and feet in water make rings.
- **The gill-plumes** (`gill-plumes`): crimson to wine-red feathered growths rooted on the lip of the shaft where the vapour leaves it: the red weed of the narration ("Red growth feeds on the breath."). At key `breath-3` the large one fills the left 60 percent of the frame, so it needs structure down to the barbs: fronds, filaments, wet tips that drip, a sway that travels from root to tip.
- **The dead one** (`dead-wader`): lies at the rim where the heavy air pools, key `breath-2`. Decomposed: collapsed, skin sunk on the frame, salt and weed on it, not a clean model lying down.
- **The water** (`sea`): teal water in the tide channel that crosses the shelf, and the sea beyond. Clear and shallow in the channel with the bed showing, moving, with the low sun on it and the fog in it. Recipe 2. Its sky comes from the rig's `skyRadiance`; its bed and banks from the lead's land.

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
