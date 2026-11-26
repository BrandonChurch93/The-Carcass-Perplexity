# Blood Marsh: hand-over of the wide polish

Unit `marsh`, film frames 5618 to 7014. Five shots: marsh-01 5618 to 5832 (key 5725), marsh-02 5833 to 6047 (key 5940), marsh-03 6048 to 6262 (key 6102, the dome bursts at 6158), marsh-04 6263 to 6585 (key 6424), marsh-05 6586 to 7014 (key 6800). Branch `agent/p6-marsh-polish`, started from `origin/main` at `49a907e`. The last merge is `6e46a38`; this file is the one commit after it.

The lead of the unit wrote this and wrote no picture code. Every line below was seen in rendered frames, held against `references/approved/4-marsh/`, not taken from a builder's mail, unless the line says a builder reported it.

## 1. Done

Part by part. The first hash is the builder's commit, the second the merge on `agent/p6-marsh-polish`.

Carried in first: `agent/marsh-plants` at `166329f`, merge `533e39a`.

Wallowers and fliers (`src/places/marsh/wallowers/`, `src/places/marsh/fliers/`):

- V1 `b370fd0`, in at `927d099`: the walk is solved from the legs up, a foot that carries stays planted, mud collars and prints at each foot.
- V2 `05ba78b`, in at `e977c85`: hide as folded skin without the noise layers, pad prints with claw dents and thrown lumps, the young walks on, the lying one looks up.
- V3b `26df16d`, merge `9dcf1eb`: the fringe is gone, a girdle sits over the standing foot, the lying one is sunk in the mud, the far ones roam (`roam.ts`), the fliers dart, midges over the pool.
- V4 `deb8164`, merge `7ff7918`: legs with elbow and knee, shoulder blade and hip plate under the hide, four blunt toes.
- V5 `2bbd574`, merge `e6591d6`: crisp creases in the fold zones of the hide, legs in the hide's tile with rings at the joints. The camera of marsh-04 after its key (one pose in `src/places/marsh/index.ts`) now holds the distance of the key and goes left with the great one, where before it closed in until the animal filled the frame at 6561.

Brine (`src/places/marsh/brine/`, `src/places/marsh/shared/brine-glsl.ts`):

- V1 `2b9151c`, in at `87c585d`: depth in the pool, the sky mirrored, reflections of the stalks, film domes that swell and tear.
- V3 `90cb639`, merge `085ccf7`: near channel as dark rust under gust lanes in the wide, pool body red at low lenses, torn dome with drops, froth in clumps.
- Last `20ca76d`, merge `ff47043`: the heaved mound at 6170 to 6178 was a pale plate and now takes the pool's mirror and colour, froth at the bank with a wet sill, more scum down the channel.

Air and sky (`src/places/marsh/air/`, `src/places/marsh/shared/`):

- V0b `71c193c`: the rig, mist with depth, creases in the cloud, a milky grade with lifted darks as the approved pictures have.
- V2 `740dcce`, merge `b931ec2`: rain drawn by the air pass, near air thinned, steam, a cheaper rig. This version took the painted rain out of the far and sky pictures (`mat/far-dry.jpg`, `mat/sky-dry.jpg`), and for one report the rain curtain was gone from the film.
- V3 `01def18`, merge `99cb106`: the rain curtain back as hanging trails far off, thinner far air, cast shade under bodies and stalks, steam columns at the seeps.
- V4 `8de216c`, merge `f15ed3d`: the rain as one grey veil with darker trails (the gaps had read as pale sunbeams), firmer steam, cast shade cut to three reads, recipes for `far-dry.jpg` and `sky-dry.jpg`.

Stalks and plumes (`src/places/marsh/stalks/`):

- V2 `34598a9`, merge `8f2dc1b`: all plants as instanced geometry, trunks with bark ledges, plumes in locks, loose upright stands in the wide.
- V3 `088f612`, merge `73b6eba`: trunk ledges broken and crusted, far stems in horn, gusts through the plumes, insects settled on the colony.
- V4 `4bf32c0`, merge `db79543`: red plumes back at the left of 6424, fewer and stouter stalks with larger weeping heads in the wide.
- V5 and V6 were not merged; see part 3.

Ground and the dead (`src/places/marsh/land/`, `src/places/marsh/dead/`):

- V2b `f0d6c99`, merge `28cad58`: salt pans with rims, the rock rise in blocks, thin chipped plates at 6800, a knobbed salt bank at the seep pool.
- V3 `09d088c`, merge `e208b7b`: the dead as built carcasses with ribs and torn hide, red brine in the cracks between plates, trodden mud, recipes for the ground's sheets.
- V4 `64235c5`, merge `6e46a38`: the island at 5725 broken by bays and brine pools, the salt on the dead grey as crust, ribs uneven and some broken, pans less pillowed, the foreground mound at 6800 greyer.

Numbers at the last merge:

- Guard frames of other units at `6e46a38`, draft preview, against the files rendered from `49a907e`: 1241 byte equal, 4409 byte equal, 7234 byte equal.
- Files changed against `origin/main`: only under `src/places/marsh/`, `public/assets/marsh/` and `assets-src/marsh/`.
- G8 is green for the Blood Marsh at `6e46a38`.
- Cost of one sample, uhd draft, seconds, before and now: 5618 15.59 and 18.59 (up 19 percent, ceiling 20.4); 6800 24.54 and 26.74 (up 9 percent, ceiling 31.9). 6102 was 18.03 before and 6424 18.52; the lead last measured 6102 at `28cad58` (18.88), and the builders report 20.4 at 6102 and 21.8 at 6424 on their machines (ceilings 23.4 and 24.3).

## 2. Still wrong, worst first

1. The wallowers close up, 6424 and all of marsh-04 (6263 to 6585). The frame shows a great soft body whose hide now has folds and creases, on legs that are dark, short and smooth, with faint rings at the joints; a lifted foot is a club with no mud hanging from it and nothing dripping; the feelers are smooth tubes; the flank shows its stripes at the size of the sheet. `marsh-3-mud-wallowers.jpg` asks for wet, caked, heavy animals whose skin breaks into plates and cracks at the joints and whose legs are sunk and smeared. Tried: five versions, from a gait solver with planted feet (the feet no longer slide, the weight is taken) to bones under the hide and a hide of folded skin. It fell short because the surface is still one soft tile over a smooth form: no caked mud, no wet against dry, no silhouette breakup at the legs. They are not footage close up. Decided, as Brandon allows: the lens no longer goes nearer than the key after 6424. The key itself (K3) was left where it is, and at that distance they still read as built.
2. The ground. 5725: the island below the colony was an even pink pebbled patch; V4 breaks it with bays and pools, but the pools are flat and matte and the patch between them is still even. 6490 to 6534: white ragged splotches on the trodden mud right of the wallowers read as torn paper or snow. 6800: the foreground mound is harsh white and noisy, the near pans are cobbled, the carcasses seen from above are evenly ridged with stretched salt streaks. `marsh-4-the-one-on-the-thin-crust.jpg` and `marsh-0-establishing.jpg` ask for thin wet crust, stained and translucent at its edges, with standing water. Tried: four versions of pans, plates and banks; each traded one even pattern for a finer one. What is missing is wetness: no part of the ground mirrors the sky.
3. The brine and the plants. The pool is a flat red sheet with few glints; the froth has no relief and reads as flakes; the torn film is a striped band; the flow hardly reads in motion; the pool is a little darker and redder than `marsh-1-the-bubbling-seep-pool.jpg` (the brine builder reports sat 37 and median 84 against 32 and 93). Plume heads are tidy mops, matte beyond the colony; the left trunk at 6102 is near white; sway in the wide is about a head's width.
4. The air. No low steam lies on the brine at 6102. The toe at 6424 is 35 against 44 in the picture, while 5618 is already lighter than its picture (76 against 67), so one grade cannot serve both. The far flats at 5618 are still paler than `marsh-0-establishing.jpg` and the escarpment is faint.
5. The far wallowers, the fliers and the midges were made to move in V3b and not looked at again closely. At 6309 the far hump has a dark round end.

## 3. Held versions

Every version that was made and not merged. Unless a line says "not superseded", a later version from the same builder was merged, so the work is not lost; the reasons are worth knowing before the same road is tried again.

| Version | Branch | Commit | Why it was held |
|---|---|---|---|
| sky V0 | `agent/p6-marsh-sky` | `2266906` | The grade crushed the darks. The approved pictures are milky with lifted darks (5725 has luma 69 at the fifth percentile). |
| growth V1 | `agent/p6-marsh-growth` | `1f9d503` | Trunks read as white plastic with even rings, the stand at 6800 lost its heads, cost at 5618 up 20 percent for this one part. |
| ground V1 | `agent/p6-marsh-ground` | `058728a` | The crust at 6800 smeared to white, the wide flats went soft as snow, cost up 20 percent. |
| life V3 | `agent/p6-marsh-life` | `568cf7d` | The lying wallower read as a dark felt log, and a dark slug shape sat in the channel at 5725. V3b took both out. |
| brine V2 | `agent/p6-marsh-brine` | `54744f7` | The pool at 6102 and 5940 went milky grey and the blood was lost: saturation 14 against 31 in the approved picture. |
| ground V2 | `agent/p6-marsh-ground` | `cdb47cc` | The plates at 6800 read as paving slabs with even piped rims. V2b broke them up. |
| growth V5 | `agent/p6-marsh-growth` | `e8a0fcd` | At 6102 the head of the far stalk at the top of the frame (x 0.43, y 0.02) burns out to a white disc, 398 pure white pixels at draft preview where the merged state has none. Everything else in it was better: heads swept to one side and of several sizes, brown bark and rust under the ledges of the close trunks in marsh-03, more sway in the wide. Not superseded: this work is not in the branch. |
| growth V6 | `agent/p6-marsh-growth` | `7f6181b` | V5 with the wet line on the plumes put back to V4, which the builder took for the cause. On the merged state the white disc is still there, so the cause is elsewhere. Not superseded. |

## 4. What to try next

For the wallowers: stop adding to the one hide tile. Give the body two materials with a hard, ragged border between them: caked drying mud up to a tide line on the legs and belly, wet dark mud below it with a mirror share, and bare cracked skin above. Break the outline of the legs with hanging clots and build the foot as a pad with mud that stretches and drops when it lifts (strings and drips are a few instanced strands tied to the foot's lift in the gait solver, which already knows when each foot leaves the ground). Until that reads at the key, pull K3 itself back or lower the lens so the legs are hidden by the bank; this hand-over only moved the pose after the key.

For the ground: wetness before pattern. Give the pans and the trodden mud a mirror share where the height field is low, so standing water shows the sky, and let the crust be thin and darker at its wet edge. Find the owner of the white splotches at 6490 to 6534 first: the ground builder greyed its own salt there and nothing changed at 6510, so the white is likely the brine's froth or the wallow layer drawn by the wallowers' `mudWallow`. Render the frame with each part switched off in turn (`npm run parts`) before touching anything.

For the brine and the plants: first take up growth V6 (`7f6181b`): it is one fault away from merging. Find what burns out the far head at 6102 at draft preview (the head scale of 0.6 to 1.3 or the sweep by seed are the suspects, since the wet line is back at V4 values there), and count pure white pixels in every key frame before and after. Then glints: they need a sun share in the mirror that the overcast rig does not give; try a narrow bright band in the sky lookup for the brine alone. Give the froth height (a few instanced lumps on the clumps, not a painted sheet). For the white trunk at 6102: the growth builder painted it pure green as a test and it came out pale green, so the steam in front whitens it, not the bark; the cure is in the air's clear zone, not in the stalks.

## 5. What a newcomer would trip over

- Pushing. The lead's machine had no login for origin. `/root` pushed this branch from bundles, so `agent/p6-marsh-polish` on origin is only as new as the last bundle `/root` pushed. Two builders lost their push for a time and sent bundles; `agent/p6-marsh-ground` on origin may be older than `64235c5`.
- `src/places/marsh/index.ts` holds the camera paths. It was changed once, in life V5, and only in the last pose of marsh-04. K3 at 6424 and every other path are as on main.
- `src/places/marsh/shared/brine-glsl.ts` lies in the sky builder's folder and belongs to the brine. `mudWallow`, `landShared`, `bakeRipple` and `FIELD_GLSL` are the ground's and are read by the wallowers and the brine. `Beast` and `newDrive` are the wallowers' and are read by others. The exported names of `rig.ts`, `glsl.ts` and `anchors.ts` were kept, but two changed meaning in sky V2: `skyOpen` no longer carries cloud shade, and `rigGrade` has no power curve. New: `rigPlain`, `rigCloud`.
- `public/assets/marsh/mat/far.jpg` and `mat/sky.jpg` are loaded by no page of the marsh any more. They stay because `assets-src/marsh/air/dry.py` makes `far-dry.jpg` and `sky-dry.jpg` from them. Other places have files of the same names in their own folders; those are not these.
- The clear zone round the wallowers (`uClear[0]` in `src/places/marsh/air/index.ts`, 12 m) cuts all steam out of nearly the whole pool as the 6102 lens sees it. That is why there is no low steam on the brine, and opening it puts steam between the 6424 and 6800 lenses and the animals.
- Cost. The wide is near its ceiling (see the numbers above: 5618 against 20.4 s). Anything new in the wide has to pay for itself. The cost tool's spread from run to run on this machine is about 0.3 s, so a saving smaller than that cannot be shown.
- Frames that do not repeat byte for byte on `origin/main`, by the lead's sheet: 5725 (in this unit), 8305, 8412, 9221, 9300. At `6e46a38` frame 5725 came out byte equal when rendered twice at draft preview on this machine, and each builder reported its determinism check as passed; no other frame of the unit was rendered twice by the lead. The guard frames of other units are 1241, 4409 and 7234; `out/work/lead/guard.sh` renders them and compares them with `out/work/before/`. `out/` is not committed, so a newcomer has to render the before set from `49a907e`.
- Tests. At `6e46a38` 932 tests pass, one is skipped (`tests/music-clean.test.ts`) and none fails. No test had to have its numbers pinned anew. `tests/repo-checks.test.ts` (the real repo passes G8) was red from sky V2 until sky V4. On this machine vitest's default reporter dies with `Map.groupBy is not a function` whenever a test fails and hides which one; run `npx vitest run --reporter=json --outputFile=<file>` to see the name.
- G8. Every file under `public/assets/marsh/` needs its full path in backticks under a `## ` heading of a `RECIPE.md` under `assets-src/marsh/`. Check with `npm run gate -- --phase 6 --only G8 --json`. It was red for two files from sky V2 until sky V4.
