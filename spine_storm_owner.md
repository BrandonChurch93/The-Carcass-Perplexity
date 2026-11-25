# The Spine · the lightning, the kites and the herd · `spine_storm_owner` · branch `agent/spine-storm`

Read the attached shared sheet `PLACE-OWNERS.md` first: it is the contract. This is what is yours.

- Your place: `spine`. Its approved pictures: `references/approved/5-spine/`. Its text: `kit/02-SUBJECT.md`, section 3, "The Spine · `spine`". Its pictures in words: `references/drafts/NOTES.md`, lines 680 to 839.
- Your branch: `agent/spine-storm`. Your looks branch: `agent/spine-storm-looks`.
- Your folders under `src/places/spine/`: `strikes/`, `kites/`, `runners/`.
- Your parts: `strike-1` to `strike-6` (in `strikes/`); `tether-kites` (in `kites/`); `ridge-runners` (in `runners/`).
- Your wide key: `spine-0`. Keys that show your work: `spine-3` (the strike on the third spire, long lens), `spine-1` (where lightning came to ground: the scorched one), `spine-4` (the herd inside the canal), `spine-2` (the kites on the first spire), `spine-0`.
- Your share of the cost: 2 of the place's 7 seconds. The lead has 5.
- Your partner: `/root/spine_ground_owner`, branch `agent/spine-ground`: the lead. It owns `shared/`, the root, the cameras, `land/` (the ridge, the spires, the canal) and `air/` (the sky, the storm cloud, the cloud sea, the spindrift).

## You are the second owner of this place

- The lead builds the foundation first and pushes it to `origin/agent/spine-ground` by about minute 35, with your folders already listed in the root as empty stubs. **Do not wait for it idle.** In those minutes: read; look at your pictures; then write your shapes, your cycle and your shaders in your own folders against the Heart's signatures (the sheet lists them), which the lead keeps. Import from `../shared/context`, `../shared/glsl`, `../shared/rig`, `../shared/stage` and `../shared/anchors` as the Heart's folders do: the imports resolve once the foundation is merged. Each of your folders has an `index.ts` that exports `PARTS` and `create(ctx)`.
- From minute 35: `git fetch -q origin "+refs/heads/agent/spine-ground:refs/remotes/origin/agent/spine-ground" && git merge -q --no-edit -X ours origin/agent/spine-ground` (your own files win over the lead's empty stubs of your folders), then check that the root lists your folders and render the whole place. If the lead's branch is not there by minute 50, message the lead and `/root`, and go on in your folders.
- The land, the light and the cameras are the lead's. Read heights and anchors from `shared/`, never keep your own copy of a number. If you need an anchor that is not there (where an animal stands, the line of a shore), ask the lead by message for exactly that and carry on with a local constant marked `TEMPORARY`.
- Your version 1 is due by minute 80: every part of yours built plainly, in place, at the right size, lit by the rig.

## What is yours to reach

In this order:

- **The lightning** (`strike-1` to `strike-6`): the lightning walks the ridge from spire to spire, and each strike falls on an accent of the music, so its frame is fixed (the events below). Violet-white. A strike is a channel with branches that comes to ground on a spire's tip, holds for a few frames with a flicker of return strokes, and leaves an afterglow; and it is a light: push it into `ctx.rig.emitters` (ask the lead how many you may hold at once) so the rock, the snow and the cloud are lit by it for those frames. Strike 1 is the first frame of the place. Key `spine-3` is the strike on the third spire through a long lens. Strikes 5 and 6 are seen from inside the canal, as light through its mouth. A pure function of time: the shape of a strike comes from its seed and the seconds since its frame.
- **The ridge-runners** (`ridge-runners`): shaggy animals with tendrils for a face, no eyes. They cross the snow saddles and shelter inside the canal: key `spine-4` is the herd sheltering there, shifting, lit by the strikes through the mouth. Key `spine-1` is the scorched one where a bolt came to ground, on the saddle: burned, split, snow melted round it and frozen again. "The ridge-runners read as dogs": push them further. "The shaggy coat is also the hardest surface in the film to build": `kit/03-METHOD.md` section 4 says what to do if it will not hold up close. Recipe 4.
- **The tether-kites** (`tether-kites`): translucent ribbons that stream downwind from stalks anchored on the lee face of each spire. Key `spine-2`. They stream in a gale: waves travel down each ribbon from the anchor, never in step, and they take the lightning through them.

## Your place in the cut

The place `spine` is frames 7015 to 8304 of the film, 21.5 s. `setTime` gets seconds since frame 7015.

| shot | frames | seconds of the place | key | key frame | key at | move | what |
|---|---|---|---|---|---|---|---|
| `spine-01` | 7015 to 7337 | 0.00 to 5.38 | `spine-0` | 7234 | 3.65 s | in | the ridge in the storm |
| `spine-02` | 7338 to 7498 | 5.38 to 8.07 | `spine-2` | 7418 | 6.72 s | right | the kites |
| `spine-03` | 7499 to 7659 | 8.07 to 10.75 | `spine-1` | 7579 | 9.40 s | in | where lightning came to ground |
| `spine-04` | 7660 to 7874 | 10.75 to 14.33 | `spine-3` | 7668 | 10.88 s | in | the strike |
| `spine-05` | 7875 to 8304 | 14.33 to 21.50 | `spine-4` | 8090 | 17.92 s | in | inside the canal |

Events (each falls on an accent of the music, so its frame is fixed):

- `strike-1`: frame 7015, 0.00 s of the place. Lightning: the place opens on it.
- `strike-2`: frame 7231, 3.60 s of the place. Lightning on the ridge.
- `strike-3`: frame 7450, 7.25 s of the place. Lightning under the kites.
- `strike-4`: frame 7665, 10.83 s of the place. Lightning, spire to spire.
- `strike-5`: frame 7874, 14.32 s of the place. Lightning seen from inside the canal.
- `strike-6`: frame 8091, 17.93 s of the place. Lightning seen from inside the canal.

## What the blockout left open, in the critics' words

These are carried to this phase. The camera items are the lead's. Read them all the same: they say where things have to be.

- blockout, carried to Phase 4. After the fixes of round 1 (`518a38e`, merged 02:26 UTC as `3a8b2a5`) the carcass at key spine-1 (7579) is a low body on its side that the camera stops short of, about 30 percent of the frame; shot spine-02 travels 60 m and shot spine-04 302 m; shot spine-05 is a steady push of 13 m toward a far mouth of the canal and nothing crosses the lens. Left: the cut from spine-02 to spine-03 (frame 7499) jumps about 580 m back along the crest, because the approved picture has the carcass on the saddle with the cave ahead; shot spine-04 is the quietest (the spire grows 1.18 times); in shot spine-05 the sleepers on the left wall cover about the left third of the frame near frame 8070 before they slide off, a second spire shows at the left of the far mouth, and at key spine-4 (8090) the mouth is in the upper right and smaller than in the picture; strikes 5 and 6 moved to the third and fourth spires; in the establishing frame (7234) the first spire is a clean triangle where the picture has a leaning, broken blade and the tip of the second spire is at 0.39 of the height where the picture has 0.45. The lenses of keys spine-2 and spine-3 are wider than the 300 and 600 mm the notes give.
- blockout round 2, severe, carried to Phase 4 · frames 7338 to 7900, about 2:02 to 2:12 · the critic's words: "After the opening push, the view jumps from the near spire to a wider look back at the approach, then to the next spires and inside the cave. The route into the cave stops reading as one camera journey." Tried: after round 1 every shot travels the same way along the ridge and `spine-05` pushes toward a far mouth; the cut from `spine-02` to `spine-03` still jumps 580 m back along the crest. Next: change the order of the details so the route runs one way, the carcass on the saddle with the mouth ahead (key spine-1) before the kites on the first spire (key spine-2), then the strike, and start `spine-05` outside the mouth so the camera crosses the threshold in the shot; check the order against the words of clip `n6`.
- The rule for every place: inside a place each shot starts where the last one ended and keeps its heading, and the subject of each detail is in frame, small, at the end of the shot before it, so a cut reads as going closer. `kit/01-FILM.md` leaves the order of the details and the camera's route and speed to the Builder.
