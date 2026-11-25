# The Blood Marsh · the wallowers, the stalks and the dead · `marsh_life_owner` · branch `agent/marsh-life`

Read the attached shared sheet `PLACE-OWNERS.md` first: it is the contract. This is what is yours.

- Your place: `marsh`. Its approved pictures: `references/approved/4-marsh/`. Its text: `kit/02-SUBJECT.md`, section 3, "The Blood Marsh · `marsh`". Its pictures in words: `references/drafts/NOTES.md`, lines 521 to 679.
- Your branch: `agent/marsh-life`. Your looks branch: `agent/marsh-life-looks`.
- Your folders under `src/places/marsh/`: `stalks/`, `wallowers/`, `dead/`, `fliers/`.
- Your parts: `stalks`, `insects` (in `stalks/`); `wallowers` (in `wallowers/`); `dead` (in `dead/`); `fliers` (in `fliers/`).
- Your wide key: `marsh-0`. Keys that show your work: `marsh-3` (the wallowers), `marsh-2` (the stalk colony), `marsh-4` (the one on the thin crust), `marsh-0`, `marsh-1`.
- Your share of the cost: 2.5 of the place's 7 seconds. The lead has 4.5.
- Your partner: `/root/marsh_ground_owner`, branch `agent/marsh-ground`: the lead. It owns `shared/`, the root, the cameras, `land/` (the flats and the salt crust), `brine/` (the red water, the gas domes, the burst) and `air/`.

## You are the second owner of this place

- The lead builds the foundation first and pushes it to `origin/agent/marsh-ground` by about minute 35, with your folders already listed in the root as empty stubs. **Do not wait for it idle.** In those minutes: read; look at your pictures; then write your shapes, your cycle and your shaders in your own folders against the Heart's signatures (the sheet lists them), which the lead keeps. Import from `../shared/context`, `../shared/glsl`, `../shared/rig`, `../shared/stage` and `../shared/anchors` as the Heart's folders do: the imports resolve once the foundation is merged. Each of your folders has an `index.ts` that exports `PARTS` and `create(ctx)`.
- From minute 35: `git fetch -q origin "+refs/heads/agent/marsh-ground:refs/remotes/origin/agent/marsh-ground" && git merge -q --no-edit -X ours origin/agent/marsh-ground` (your own files win over the lead's empty stubs of your folders), then check that the root lists your folders and render the whole place. If the lead's branch is not there by minute 50, message the lead and `/root`, and go on in your folders.
- The land, the light and the cameras are the lead's. Read heights and anchors from `shared/`, never keep your own copy of a number. If you need an anchor that is not there (where an animal stands, the line of a shore), ask the lead by message for exactly that and carry on with a local constant marked `TEMPORARY`.
- Your version 1 is due by minute 80: every part of yours built plainly, in place, at the right size, lit by the rig.

## What is yours to reach

In this order:

- **The wallowers** (`wallowers`): heavy eyeless animals with tusk-like feelers, rooting in the channels of red brine. Key `marsh-3` is close on them, with a young one. "The wallowers sit close to a walrus": push them further from anything on Earth. Wet hide caked with salt and red mud, folds that move when the weight moves, brine running off. Recipe 4: weight first, then the step; never in step with each other.
- **The stalk colonies** (`stalks`, `insects`): salt-crusted stalks with crimson fans, growing round the seep pools, with small winged insects round them. Key `marsh-2`. "The stalks read as palms": push them further from anything on Earth. Fans that drip, crust that flakes, a stand that is dense in clumps with bare salt between. In the blockout the red tufts were too large and thick stalks covered the frame as the camera passed: the lead routes the camera, you keep the stand thin along its path (ask where it runs).
- **The dead and the one that is not** (`dead`): between the channels a thin salt crust lies over deep mud, and the mud holds what steps on it. The dead are still there, crusted with salt, and one is still alive: key `marsh-4`, "the one on the thin crust", over which the narration says "The salt keeps whatever it catches. Forever." Decomposed and salt-eaten, half sunk; the live one moves, slowly, and cannot get out.
- **The fliers** (`fliers`): read the blockout to see where the flock is and when it moves.

## Your place in the cut

The place `marsh` is frames 5618 to 7014 of the film, 23.3 s. `setTime` gets seconds since frame 5618.

| shot | frames | seconds of the place | key | key frame | key at | move | what |
|---|---|---|---|---|---|---|---|
| `marsh-01` | 5618 to 5832 | 0.00 to 3.58 | `marsh-0` | 5725 | 1.78 s | in | the red flats |
| `marsh-02` | 5833 to 6047 | 3.58 to 7.17 | `marsh-2` | 5940 | 5.37 s | right | the stalks |
| `marsh-03` | 6048 to 6262 | 7.17 to 10.75 | `marsh-1` | 6102 | 8.07 s | in | the seep pool bursts |
| `marsh-04` | 6263 to 6585 | 10.75 to 16.13 | `marsh-3` | 6424 | 13.43 s | left | the wallowers |
| `marsh-05` | 6586 to 7014 | 16.13 to 23.28 | `marsh-4` | 6800 | 19.70 s | in | the one on the thin crust |

Events (each falls on an accent of the music, so its frame is fixed):

- `burst`: frame 6158, 9.00 s of the place. The seep pool bursts.

## What the blockout left open, in the critics' words

These are carried to this phase. The camera items are the lead's. Read them all the same: they say where things have to be.

- blockout, carried to Phase 4 where the place is built. After the refit (`7168ea3`, merged 01:28 UTC) the rock rise in the establishing frame (5725) reaches 0.49 of the width, the tall stalks stand at the left, the pool sits where the picture has it and the stuck one at key marsh-4 (6800) is right of centre. After the follow-up (`abf9e5d`, merged 02:31 UTC) the burst of shot marsh-03 (frames 6158 to about 6250) is a dome that breaks into drops with two rings on the pool, and the camera ends 0.4 m past the key. Left: the outline of the rock rise has one notch where the picture has a broken edge; at key marsh-2 (5940) the red tufts are larger than in the picture and cover the adult behind them; at key marsh-3 (6424) the young sits lower than in the picture; shot marsh-02 opens through the tall stalks, which pass close to the lens until about frame 5930 without crossing it; in shot marsh-03 a stalk stands close on the left for the first second and the drops of the burst are flat pink ovals. Steam, rain and fans are plain opaque shapes, as stand-ins are.
- blockout round 2, severe, carried to Phase 4 · frames 6506 to 6633 · the critic's words: "the camera jumps from among the plant stalks beside the red pool to the open grey salt flat on another heading with no travel between them; it plays as a cut in the middle of a move". Tried: nothing, round 1 raised no issue here. Next: `marsh-05` starts wide with the pool and the stalks still in frame behind the stuck one and keeps the heading of `marsh-04`, or `marsh-04` ends by leaving the stalks over the bank.
- blockout round 2, major, carried to Phase 4 · frames 5872 and 6506 · the critic's words: "thick stalks cross the foreground and cover large parts of the frame as the camera passes through the plant stand". Tried: the refit of 01:28 UTC kept the stalks from crossing the lens, not from covering the frame. Next: route `marsh-02` and `marsh-04` so the stalks stay at the edges of the frame, or thin the stand along the path.
- blockout round 2, major, carried to Phase 4 · frame 5725, the establishing key · the critic's words: "the foreground mass covers about a quarter of the frame and is larger and higher than the near rock in [the picture], and the camera sits higher looking down, so the pool and channel with the animals are pushed back and smaller than in the target". Tried: the refit of 01:28 UTC set the rock rise at 0.49 of the width. Next: lower the camera and bring it forward so the near rock sits in the lower left corner only.
- The rule for every place: inside a place each shot starts where the last one ended and keeps its heading, and the subject of each detail is in frame, small, at the end of the shot before it, so a cut reads as going closer. `kit/01-FILM.md` leaves the order of the details and the camera's route and speed to the Builder.
