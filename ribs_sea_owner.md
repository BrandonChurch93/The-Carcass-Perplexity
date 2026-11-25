# The Ribs · the sea, the bore and the animals · `ribs_sea_owner` · branch `agent/ribs-sea`

Read the attached shared sheet `PLACE-OWNERS.md` first: it is the contract. This is what is yours.

- Your place: `ribs`. Its approved pictures: `references/approved/1-ribs/`. Its text: `kit/02-SUBJECT.md`, section 3, "The Ribs · `ribs` · with the opening". Its pictures in words: `references/drafts/NOTES.md`, lines 22 to 194.
- Your branch: `agent/ribs-sea`. Your looks branch: `agent/ribs-sea-looks`.
- Your folders under `src/places/ribs/`: `sea/`, `wings/`, `drowned/`.
- Your parts: `sea`, `surf`, `runnels`, `bore` (in `sea/`); `kite-wings` (in `wings/`); `drowned` (in `drowned/`).
- Your wide key: `ribs-0`. Keys that show your work: `ribs-0` and the opening (the sea, the surf), `ribs-2` (the feeders in the pools), `ribs-3` (the colony), `ribs-1` (the drowned), `ribs-4` (the bore).
- Your share of the cost: 2.5 of the place's 7 seconds. The lead has 4.5.
- Your partner: `/root/ribs_ground_owner`, branch `agent/ribs-ground`: the lead. It owns `shared/`, the root, the cameras, `land/` (the floor, the blades, the weed, the ledges, the rocks) and `air/`.

## You are the second owner of this place

- The lead builds the foundation first and pushes it to `origin/agent/ribs-ground` by about minute 35, with your folders already listed in the root as empty stubs. **Do not wait for it idle.** In those minutes: read; look at your pictures; then write your shapes, your cycle and your shaders in your own folders against the Heart's signatures (the sheet lists them), which the lead keeps. Import from `../shared/context`, `../shared/glsl`, `../shared/rig`, `../shared/stage` and `../shared/anchors` as the Heart's folders do: the imports resolve once the foundation is merged. Each of your folders has an `index.ts` that exports `PARTS` and `create(ctx)`.
- From minute 35: `git fetch -q origin "+refs/heads/agent/ribs-ground:refs/remotes/origin/agent/ribs-ground" && git merge -q --no-edit -X ours origin/agent/ribs-ground` (your own files win over the lead's empty stubs of your folders), then check that the root lists your folders and render the whole place. If the lead's branch is not there by minute 50, message the lead and `/root`, and go on in your folders.
- The land, the light and the cameras are the lead's. Read heights and anchors from `shared/`, never keep your own copy of a number. If you need an anchor that is not there (where an animal stands, the line of a shore), ask the lead by message for exactly that and carry on with a local constant marked `TEMPORARY`.
- Your version 1 is due by minute 80: every part of yours built plainly, in place, at the right size, lit by the rig.

## What is yours to reach

In this order:

- **The sea and the surf** (`sea`, `surf`): slate-green water in the strait and out to the horizon, in every frame of the place and the whole of the opening's 17 seconds, where the camera is low over it. Swell with a direction, wind streaks, foam lanes, white surf and spray breaking at the feet of the blades and on the sand, the sky in it at grazing angles, the wet edge on the sand. The scale of the blades is read off the surf at their feet: make the surf small and fine against them. Recipe 2. Its sky comes from the rig's `skyRadiance`.
- **The bore** (`bore`, the event at frame 2402): the tide comes back through the cage as ONE wall of water. The approved picture `ribs-4` "looks more like storm surf than one wall of water. The words say the sea returns all at once. Make it one wall." A front with height and weight that travels up the strait between the blades, breaks on them and buries the flats: seen coming in shot `ribs-06` and standing in frame at its key.
- **The kite-wings** (`kite-wings`): pale long-legged fliers with a tuft of tendrils for a head, no eyes. Wading and feeding in the pools at low tide (key `ribs-2`, close), nesting on the ledges above the weed line (key `ribs-3`, the colony), landing, lifting off, crossing the sky in the wide view and the opening, and leaving before the bore. Recipe 4: weight shifts before a step, a flock is never in step, something always pauses, turns or looks up.
- **The drowned** (`drowned`): one that stayed, hanging in the weed on the near blade, key `ribs-1`, the camera looking up at it. Decomposed: sodden, torn, weed through it, not a clean model.
- **The runnels** (`runnels`): water draining across the sand in braids, and the tide pools the feeders stand in, with rings round their legs.

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
