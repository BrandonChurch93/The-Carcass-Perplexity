# Hand-over of the Ribs (unit `ribs`, film frames 0 to 2506, the opening and the card loop)

Written by the lead of the wide polish, wave p8 (third wave), at minute 212 of 240. Branch `agent/p8-ribs-polish`, forked from `origin/main` 967bb1c. Builders' branches: `agent/p8-ribs-ground`, `-sea`, `-sky`, `-life`, `-opening`. Everything below was looked at in rendered frames beside `references/approved/1-ribs/`. Keys: ribs-0 is frame 1241, ribs-1 is 2081, ribs-2 is 1759, ribs-3 is 1546, ribs-4 is 2401.

State of the checks at 310a2b0 (the head when report 3 went out): guard frames 4409 and 7234 byte for byte equal to the before files; three draws of 1759 equal; no invalid pixel at 1241 (final, uhd); G8 passes; nothing outside `src/places/ribs/` changed; 0 bytes added to the unit's folders. G14 passed twice on the opening builder's machine: on 965f760 (seam 1.37, largest elsewhere 1.87) and on 6e1f824 with the life's gait and the sky's loop mist (seam 1.32, largest elsewhere 1.78). The later merges are not in the loop's view, but G14 was not run again on them.

M3 at 1759 (`ribs-2`, the red of round 30, floor 0.75), by `npm run -s measure -- --unit ribs --only 1759`: 0.675 on main, 1.0165 at 965f760, 0.9728 at bf691b5, 0.8968 at 6e1f824, 0.8935 at 310a2b0 (the shore below the shore line 162.4 against 163.2; the 0.0033 came with life a7ff831, sea 5bc8281 or the weed cut 8f5e335, not told apart). The aperture of `feeding` stays 0.014: `/root` refused the lens as a way to the number. `/root` asks that M3 not fall under 0.8968 for the sake of the reflections.

**Cost: the branch is over its cap at frame 2081.** Cap: 5 percent over origin/main on the lead's machine at frames 1241, 0 and 2081. Back to back, uhd draft, `--parts none --runs 3`, origin/main to 310a2b0: 2081 14.39 and 14.35 to 15.20 and 15.12 s (5.4 to 5.6 percent; it was 6.4 to 6.8 before the ground's cut 8f5e335); frame 0 12.27 to 12.43 (measured at 01adb62); 1241 11.66 to 11.86 (measured at 2563a41). `/root` holds the cap and decides if no cut lands. The last commit that read under at 2081 is bf691b5 (14.90 at minute 104 beside 14.57 at minute 20, not back to back).

## 1. Done, part by part

Ground (`land/`, `drowned/`):
- 31b271d (merge e656155): 30000 instanced stones on the flat at 1759; the white disc at the frame's top cured by clamping `vCrag`; the drowned head closed.
- 53d6234 (merge bf691b5): the weed wall as 9000 ribbon fronds, olive brown and matt, each stirring in its own time; stones in four tones with wet feet; bars of rippled sand; ochre kelp on the near heap.
- 8f5e335 (merge 310a2b0): a cost cut in the wall's shader (the far sheet is not read inside 30 m). No change in the picture.

Sea (`sea/`):
- 32e569a (merge c020c54): computed ripples (`sea/ripples.ts`), the image of a wader breaks at its feet (`contacts.ts`), `flatBreak()` exported in `FLAT_RIPPLE_GLSL`.
- d7f1d46 (merge 6e1f824): the opening's slam drawn from `STRIKES`; ripples in sets with gust patches; a veil that follows the gusts so the waders' images stand broken in the slack.
- 5bc8281 (merge 01adb62): the slam reads `lean`, has a white dense core, clots and holes; the cloud shadow on the sheet reads the rig's `cloudCover`.

Sky and light (`air/`, `shared/glsl.ts`, `shared/rig.ts`):
- 8fe9072 (merge 699cb62): the deck's own gaps cut the sun; the break's light is warm, so 1759 reads warm grey (preview red less blue +2.8, picture +1.4); the loop's scud and mist banks as two sheets a loop apart (b05d264).

Life (`wings/`):
- 0b49493 (merge 854b031): a stepping gait with planted feet in film and loop; the far flyer of the first frame darker.
- 777e63e (merge 3b21145): colony animals differ in girth, neck, carriage, sail and tone; ankles roll; single beads off the tufts removed.
- a7ff831 (merge bb4bc28): thrown water as torn sheets and strings (`wings/water.ts`); colony seats lower, necks drawn in, thighs thicker.

Opening (`shared/opening.ts`):
- 4aa29a6, 5de48aa, c7acb91 (merges 965f760, fa778c3, 2563a41): the slam of the first two seconds stands on the outer right blade (OR), the stone nearest the lens: `STRIKES` row OR, foot [466, 0, 626], out [-0.3, 0.954], half 30, time -0.95, height 90, lean [0.5, -0.3]. This is step 1 of the opening's chain, kept on the first try. The camera of frames 0 to 120 is unchanged.

## 2. Still wrong, worst first

1. 2401 (`ribs-4`): the bore is a white frill on a green slab under a flat sky. Nothing on the merged branch touched it. The picture has a wall of torn water lit from behind and a dark broken sky.
2. The weed wall at 2081: fronds hang in combed lines with pale beads; at native size they read as hair. The picture has matted wet weed in masses with ochre patches and runoff.
3. 1759: the stones are alike in shape and lie evenly, as if sprinkled; the three waders read as one model at three distances; the reflections are short and faint.
4. The slam is one soft pale mass from frame 45 to 100, and its foot meets the sea without a splash line.
5. 1546: the crag steps evenly; the colony is one model stretched.
6. 1241: no bright struck flat and ridge; the blades are pale all over; the darkest twentieth is 38 against the picture's 24.
7. No surf line anywhere: the sea is not in view at 1241 or 1759 and would need a new drawn body.

## 3. Versions held back

- Ground version 3, `agent/p8-ribs-ground` a0ef063: fronds in hanks from one hold, stones in drifts, the cliff at 1241 darker, tone masses on the crag. Held back for cost at 2081 (15.13 to 15.38 s on the builder's machine against 14.88 for its version 2). The picture was not judged on the lead's machine. Take it only at 310a2b0's cost or less.
- Sky version 3, `agent/p8-ribs-sky` f1b9639: the bore's break moved right, the dome's white shut, the wet flat throws the break back brighter, frame 600's cloud white again. The picture is right (2401 a little nearer). Held back for cost at frame 0: 12.48 on the branch, 12.57 with life, 12.71 with it on top, against a cap of 12.88 with the slam still to come.
- Sky version 1 (18756f5) was held back because 1759 and 2401 went darker and colder; version 2 cured it and holds the same technique.
- Sea version 2 before its cut (259573c): the slam cost 11 percent at frame 0. The cut (0673940) took a fifth of the sheets and a sixth of the drops.

## 4. What to try next for the worst three

1. The bore at 2401: it is the sea's body and the sky's light together. Give the bore's face thrown sheets and falling curtains as the slam has them (`sea/strike.ts` shows how), and take the sky builder's f1b9639 for the broken sky if its cost at frame 0 is cut.
2. The weed wall: stop drawing single ribbons. Try broad matted blades in clumps that lie on one another, with dark gaps between clumps and no beads brighter than 156 (a0ef063 goes this way: look at it first). Find the cost first: every lit part at 2081 rose when measured alone (drowned 4.87 to 5.10, runnels 4.81 to 4.97, weed 6.35 to 6.48, kite-wings 4.41 to 4.56), while sea and sky stayed level. The lead suspects the shared light code of 8fe9072 (the deck's gaps and the warm break in `shared/glsl.ts` and `rig.ts`), read by every lit part. This was not proven: measure `--frame 2081 --parts weed drowned` on bf691b5 and on 699cb62 back to back.
3. 1759: stones of three or four different meshes gathered in drifts with bare wet sand between (a0ef063 has the drifts); the two far waders with another build and carriage, as the colony has; longer reflections in the slack patches without lowering M3 under 0.8968.

## 5. What a newcomer would trip over

- Seconds drift on one machine by 0.2 to 0.5 s within the hour. Never hold a number against one from an hour ago: check out origin/main, build, measure, check out the branch, build, measure, twice.
- Parts measured alone do not add up to the whole, and shared code changes the cost of parts its author never touched.
- `STRIKES` in `shared/opening.ts` belongs to the opening builder and `sea/index.ts` reads it. `out` sets the line of the burst; `lean` sets how it climbs. A later `time` takes the white out of frame 0.
- The measure exits 0 even when red. Read its lines.
- The veil that lets the waders' images stand costs fine detail: M3 fell from 1.0165 to 0.8968 with it.
- The white disc showed at the review tier at 2085 and 2092 but at the draft tier at 1852 and 2022. Test both tiers.
- The far wader at 2081 looks see-through because the lens blur thins its legs. It was so on main.
- The sky lightens the sky behind the far flyer only after the life builder's before and after. Brandon's choices stand: the far flyer of the first frame is not brought closer, the flyer of frames 76 to 84 keeps its distance, kite-wings at the colony stay 40 to 60 m off, nothing living has eyes or ears, and the jump at 2403 to 2405 is not changed.
- `take.sh`, `proofs.sh`, `disc.cjs`, `stat.cjs` and `m3parts.mjs` under `out/work/` are the lead's own and are not committed.
