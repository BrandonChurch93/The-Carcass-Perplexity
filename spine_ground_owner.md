# The Spine · ridge, storm cloud, light and cameras · `spine_ground_owner` · branch `agent/spine-ground`

Read the attached shared sheet `PLACE-OWNERS.md` first: it is the contract. This is what is yours.

- Your place: `spine`. Its approved pictures: `references/approved/5-spine/`. Its text: `kit/02-SUBJECT.md`, section 3, "The Spine · `spine`". Its pictures in words: `references/drafts/NOTES.md`, lines 680 to 839.
- Your branch: `agent/spine-ground`. Your looks branch: `agent/spine-ground-looks`.
- Your folders under `src/places/spine/`: `shared/`, the root (`index.ts`, `ridge.ts`), `land/`, `air/`.
- Your parts: `land` (in `land/`); `sky`, `air`, `cloud-sea`, `cloud`, `spindrift` (in `air/`).
- Your wide key: `spine-0`. Keys that show your work: all five.
- Your share of the cost: 5 of the place's 7 seconds (about 2 for the ridge, 3 for the sky and the cloud). Your partner has 2.
- Your partner: `/root/spine_storm_owner`, branch `agent/spine-storm`, folders `strikes/` (parts `strike-1` to `strike-6`), `kites/` (`tether-kites`) and `runners/` (`ridge-runners`). Message them directly when the foundation is pushed and whenever an anchor moves.

## You are the lead of this place

1. **The foundation, pushed by minute 35.** By recipe 5: copy the Heart's `shared/context.ts` (interfaces renamed `Context`, `Piece`, `Folder`), `shared/glsl.ts`, `shared/rig.ts` and `shared/stage.ts` into `src/places/spine/shared/`, cut what this place does not have (the lake's glow map, the crust's drift) and keep every name the sheet lists. Move the blockout's stand-ins into `shared/blockout.ts` behind `createStandIns(scene, parts, owned)`, so that every part no folder owns yet is drawn exactly as the blockout draws it now. Put the place's fixed points (where things stand, when things happen, sea level, the sun) in `shared/anchors.ts`. Make the root `index.ts` call the folders in draw order, as the Heart's does. Create the partner's folders `strikes/`, `kites/` and `runners/`, each with an `index.ts` that exports `PARTS = []` and a `create` that returns `{}`, and list them in the root. `npx tsc --noEmit -p .`, build, render the wide key (it must look as the blockout did), push, and tell your partner by message that it is there.
2. **The light is yours.** Dusk, above the cloud, with a storm standing against one side of the ridge: no sun, a last band of orange at the horizon, cold blue-grey from above, and the lightning. The six strikes are your partner's parts, and their light is the main light of the place when they fire: keep the rig's `emitters` (your partner pushes and times them, tell them how many they may hold at once) and make sure the rock, the snow AND the cloud take that light, so the storm flickers from inside and a spire stands black against a lit cloud for a few frames. Staging is not the lead's whim here: strike 1 opens the place on its first frame.
3. **The cameras are yours.** Every shot's key frame must match its approved picture: fit each with `npm run -s compare`, height first, then heading, then lens. The land is built round the cameras, not the other way: the camera positions are fixed numbers in the world. Then the route: the items below. A camera never passes through a solid, never goes under the ground or a fluid and never shows the edge of the world: the land reaches the haze in every direction a camera looks.
4. **Then your parts**, in the order of "What is yours to reach".

## What is yours to reach

- **The ridge** (`land`): a knife ridge of vertebrae above a sea of cloud. Each vertebra is a mountain with a leaning spire, the tip of every spire burned black. Blue-grey rock, snow in the saddles and on the lee, rime, cornices, scree chutes. The spires stand about 800 m apart. In the blockout the first spire is "a clean triangle where the picture has a leaning, broken blade". A canal runs through the whole ridge from one vertebra to the next: key `spine-4` and shot `spine-05` are inside it (a tunnel of bone-rock with a far mouth, where the herd shelters and the lightning shows through the mouth), so the canal needs an inside, a mouth and a threshold the camera crosses.
- **The storm and the cloud sea** (`cloud`, `cloud-sea`, `air`, `spindrift`): the cloud sea lies about two thousand metres below and drifts. The storm stands against one side of the ridge and pours over the low saddles: cloud with a body, an edge and a direction, falling down the lee like water. Spindrift and hail in the gale. Recipe 3. This is "the place closest to a poster": the weather moving is what makes it a place.
- **Sky**: dusk, the orange band, the first dark.

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
