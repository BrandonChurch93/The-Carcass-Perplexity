# The Blood Marsh · flats, brine, weather and cameras · `marsh_ground_owner` · branch `agent/marsh-ground`

Read the attached shared sheet `PLACE-OWNERS.md` first: it is the contract. This is what is yours.

- Your place: `marsh`. Its approved pictures: `references/approved/4-marsh/`. Its text: `kit/02-SUBJECT.md`, section 3, "The Blood Marsh · `marsh`". Its pictures in words: `references/drafts/NOTES.md`, lines 521 to 679.
- Your branch: `agent/marsh-ground`. Your looks branch: `agent/marsh-ground-looks`.
- Your folders under `src/places/marsh/`: `shared/`, the root (`index.ts`), `land/`, `brine/`, `air/`.
- Your parts: `land`, `crust` (in `land/`); `brine`, `domes`, `burst` (in `brine/`); `sky`, `air`, `rain`, `steam` (in `air/`).
- Your wide key: `marsh-0`. Keys that show your work: all five.
- Your share of the cost: 4.5 of the place's 7 seconds. Your partner has 2.5.
- Your partner: `/root/marsh_life_owner`, branch `agent/marsh-life`, folders `stalks/` (parts `stalks`, `insects`), `wallowers/` (`wallowers`), `dead/` (`dead`) and `fliers/` (`fliers`). Message them directly when the foundation is pushed and whenever an anchor moves.

## You are the lead of this place

1. **The foundation, pushed by minute 35.** By recipe 5: copy the Heart's `shared/context.ts` (interfaces renamed `Context`, `Piece`, `Folder`), `shared/glsl.ts`, `shared/rig.ts` and `shared/stage.ts` into `src/places/marsh/shared/`, cut what this place does not have (the lake's glow map, the crust's drift) and keep every name the sheet lists. Move the blockout's stand-ins into `shared/blockout.ts` behind `createStandIns(scene, parts, owned)`, so that every part no folder owns yet is drawn exactly as the blockout draws it now. Put the place's fixed points (where things stand, when things happen, sea level, the sun) in `shared/anchors.ts`. Make the root `index.ts` call the folders in draw order, as the Heart's does. Create the partner's folders `stalks/`, `wallowers/`, `dead/` and `fliers/`, each with an `index.ts` that exports `PARTS = []` and a `create` that returns `{}`, and list them in the root. `npx tsc --noEmit -p .`, build, render the wide key (it must look as the blockout did), push, and tell your partner by message that it is there.
2. **The light is yours.** A white overcast with no wind: flat white light and no sun, so the rig is the sky dome alone, close to the Heart's without its fire. The danger is a flat frame. Depth here comes from contact shade under everything, from wet against dry (sheen on the brine and on wet salt, matte crust), from the sky mirrored in still red water, and from air that pales the distance to the escarpment six kilometres on.
3. **The cameras are yours.** Every shot's key frame must match its approved picture: fit each with `npm run -s compare`, height first, then heading, then lens. The land is built round the cameras, not the other way: the camera positions are fixed numbers in the world. Then the route: the items below. A camera never passes through a solid, never goes under the ground or a fluid and never shows the edge of the world: the land reaches the haze in every direction a camera looks.
4. **Then your parts**, in the order of "What is yours to reach".

## What is yours to reach

- **The brine** (`brine`): the old blood still seeps up: pools and branching channels of oxblood brine with white salt rims. The main channel, the vein, is about ten metres wide. The largest seep pool steams and bubbles (key `marsh-1`). Still, dense water: dark red in depth, the white sky on it at grazing angles, a meniscus and a salt rim at every edge, stained crust beside it. Recipe 2.
- **The domes and the burst** (`domes`, `burst`): gas domes rise in the seep pool and burst, and rings spread on the pool. The burst is the event at frame 6158, in shot `marsh-03`: one large dome swells, tears, falls back as drops and sends rings out. In the blockout "the drops of the burst are flat pink ovals".
- **The crust and the flats** (`crust`, `land`): salt flats to the horizon: polygon plates with raised rims, pressure ridges, blisters, grey mud showing through where it is thin, pink where the brine stains it. Between the channels the crust is thin over deep mud and holds what steps on it (key `marsh-4`: your partner draws the one that is stuck, you give the broken crust and the mud it stands in). A rock rise in the near left of the establishing view, an escarpment six kilometres on.
- **Sky, air, rain, steam**: white overcast, a rain curtain hanging far off, steam off the seep pool. Recipe 3.

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
