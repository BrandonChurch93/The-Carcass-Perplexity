# Hand-over of the marsh's life (wallowers, stalks, insects, dead, fliers)

Branch `agent/marsh-life-3`, third and last owner, written at version 3. Folders: `src/places/marsh/{wallowers,stalks,dead,fliers}/`. Pictures used are the Builder's, under `public/assets/marsh/mat/` and `public/assets/marsh/wallowers/`.

## How each part is drawn

- `wallowers`: one skin for each animal, class `Beast` in `wallowers/body.ts` (a distance field on 17 bones in `field.ts`, its surface taken once on a grid in `nets.ts`, `cell` 0.03 m near and 0.065 far). `animal.ts` keeps the gait: `walk(plan, build, seconds, drive)` is a pure function of the seconds.
- Hide: the flank picture and the hide tile on three axes; with `FINE` (near animals) a net of creases in two sizes, a tone for each scale, single salt grains and a point of light on a wet scale. Near live hides (`uNear`) are lifted by number, folded, and take a red bounce from the ground below. Looks: `wet` (ragged dark red line, damp band, mud thrown up the flank), `line` (a dark shining meniscus where the body meets brine or mud), `mudded` (the stuck one: bare hide folded round the neck, caked plates, a dark wet band where it is sunk), `crust` (the fallen dead one), `tile` (`hair` on the lying one). Feelers: a hand of thick ones (`reach`, `droop`), or with `tendrils` many thin ones (`hang`, `thick`, `long`).
- `wet.ts`: drops from chin and belly and their small rings; a ring at a foot only while that foot is lifted, one at the muzzle, one swell round a lying body. No ring where nothing moves.
- `dead/mud.ts` (`mudWallow`): churned mud pushed up round a bank animal and round the stuck one.
- `stalks`: stems within reach of a lens are tubes (`STEM_*` in `shaders.ts`): cream salt on horn, rusty joints, palm scales, a broken mouth with a thick torn wall and a dark hollow with pith. All others are cards of `mat/stalk.jpg` with the fan `mat/fan.jpg` (`palms.ts`), stained red brown and ragged at the foot; those by the seep are damp. Close plumes are cards of `mat/lock.jpg` (`locks.ts`). The open flats are bare: a card stalk is drawn only within 2 m of a water's edge or beside a lens.
- `insects`: cards of `mat/insect.jpg`, amber body and pale wings, each on one unbroken path round its plume.
- `dead`: salt domes with the picture heaps on them, a rime `Beast` on its side, the stuck one (a live `Beast`, `mudded`), stains.
- `fliers`: the insects at the stalk tops, and a far string of sixteen that crosses the sky of the wide shot.

## Tried and dropped, so nobody tries it twice

- All of the second owner's list still holds (fur locks, plume ribbons, albedo above 0.15 on a smooth body, reads after a discard, anisotropy on cut-outs, birds at 0.3 m, taupe hide).
- `rigShade` with low roughness inside a hollow stem: the hollow mirrors the sky white. The inside is shaded diffuse only.
- A hug ring round every standing leg: the jury read them as stamped rings. Rings start only where something moves.
- The hero sunk to the belly: it lost its legs and stood in open liquid. It stands on the ground owner's mud bank.
- Thin hanging feelers on the stuck one (`hang` 0.85): a comb. A fan of fifteen thicker ones (`hang` 0.5) reads as the picture's.
- Ninety clumps on the flats: dots on a map. Thicker trunks for the far grove without a head scale: giant crowns (the card head is 19 times the trunk).
- Filtering the stalk list: every card after it changes, as they share one stream. Bury a stalk (base y -60), do not remove it.

## Still wrong beside the approved pictures, worst first

- Motion: skin does not slide over the bones and the brine does not part round a moving leg; the mud does not drip from the stuck one as it heaves.
- marsh-3: the hide still reads nearer coarse fibre than wet folded skin. Upper flank 110,95,89 against 126,108,98; lower 59,34,29 against 76,47,37.
- marsh-0: the approved picture has a dense tall stand round the seep; here the clumps by the water are small. At that size the animals are humps.
- marsh-4: the heaps are coarse and none shows a jaw; the stuck one's plates are faint.
- marsh-2: the near stems are procedural, with no clear drops on them and no split flap on the broken one.
- marsh-1: the stalk in the seep is one plain tube; the far wader is a small shape and nothing more.
- Measures at version 3, uhd draft: M2 25.2, 49.8, 58.3, 54.7, 21.7 %; M3 1.23, 1.14, 0.96, 1.39, 1.37. At the final tier before the ground's last lenses: 1.01, 0.79, 0.74, 1.10, 1.12.

## Staged by shot

- By shot, through `stagedSeconds()`: in marsh-04 herd 6, 7, 8, 9 are off the set; in marsh-03 the herd within 17 m of the seep and the colony's wader are off and one small far wader is on; in marsh-05 the stalks in that lens's cone are low and thick (`uGrove`); in marsh-01 the card heads are 0.6 (`uHead`) and the far string of fliers is on the set.
- The great one at 0.9 size on the bank with drooped feelers; the young one at rel(34.25, 5.25); the one behind at rel(49, 9.5); `LOOKS` head lifts; the lying one's head at the surface.
- TEMPORARY: animals nearer than 26 m to the wide lens at 0.6 size, the two nearest turned across it; far waders' walk anchored half way.
- One wader for the colony's lens (0.74, bank bearing 37 at 11.5 m, ground -0.15).
- Stalks: nine far clumps by the water and three groups behind the great one (`stalks-far`, `stalks-back`); list stalks more than 2 m from water not drawn; tall shut ones half open and short shut ones shorter; four by the great one moved; close plumes combed to the colony lens's right; a dozen insects on the plumes nearest it.
- Dead: states and pictures by anchor index; the fallen one moved 1.7 m into the frame of marsh-4.

## Cost, seconds a sample at 3840 x 2160, key marsh-0, draft, above the empty frame

- Two runs at version 3, before the ground owner's last merge: dead 1.26 and 1.15, stalks 0.66 and 0.58, insects 0.32 and 0.07, wallowers 0.27 and 0.17, fliers 0.00 and 0.00: 2.51 s and 1.97 s in all, 2.24 s the mean (received 2.31). Whole frame 17.06 s and 17.44 s (received 18.26), empty frame 4.28 s and 4.53 s: the tool moves by a quarter of a second a run. Measured at 08:19 and 08:21 UTC with `npm run -s cost -- --key marsh-0 --format uhd --tier draft --parts wallowers stalks dead insects fliers`, alone on the machine.

## What I would do next, in order

1. The hide of the three at marsh-3 from a picture of wet folded skin, hair only along the back.
2. Brine that parts round a walking leg and mud that drips from the stuck one (needs a surface the life can write to: the ground owner's).
3. A dense stand of tube stalks round the seep for the wide shot.
4. The heaps: one end open to a jaw or a row of feelers.
5. Remove what is unused: `Animal` and `skin.ts`, `PLUME_*` and `BEAD_*` in `stalks/shaders.ts`.

## Round 17, each severe or major issue on these parts and what was done

- "every animal ... is completely frozen like a statue", "ripples ... stay locked in place" (severe), "the background creature stands completely frozen", "the creature stands completely motionless" (major): every animal walks, roots, breathes or rolls; far waders stride at a pace seen from far; rings start only at a moving foot. Closed by sheet.
- "the flying creatures pop in and out and jump erratic distances" (severe): each insect is on one unbroken path. Closed by sheet.
- "red fronds on the stalks stay rigid with no wind sway", "plants ... remain static" (major): plumes and card heads gust. Partly closed.
- "pivots upward without disturbing or dripping any mud" (major): mud wallow and a wet band move with it; no drip. Open.
- "perfect bright white concentric rings of even width" (severe), "near-identical neat concentric ripple rings" (major): hug rings gone. Closed.
- "large adults bunch in a line", "scarcely readable as creatures" (severe), "noisy displaced blobs" (major): near ones smaller and turned across, far ones walk. Partly closed.
- "much larger, closer and more sharply defined" (severe, marsh-1): a small far wader for that shot. Closed.
- "raised, oversize and close" (severe, marsh-2): wader smaller, lower, in the brine. Closed.
- "Several rather large animals crowd the right middle distance", "several large cropped backs crowd the right background" (marsh-4, marsh-3): four off the set in shot marsh-04; one remains by the grove at marsh-4. Partly closed.
- "adult should feed into a muddy shelf", "rides high and stretches across the pool": the great one stands on the mud bank, muzzle down in it. Closed.
- "sparse, repetitive clusters with conspicuous bare truncated trunks" (major): flats bare, clumps by the water, shut poles half open. One thick colony stem still stands as a pole with a small tuft at the left of the wide key: four tries did not change it. Partly closed.
- "string of distant flying silhouettes is absent" (major): sixteen cross the wide sky. Closed.
- "dark specks", "flat dark silhouettes, one doubled into a smeared transparent ghost" (major): amber bodies and pale wings from the insect picture, opaque. Closed at the size they have.
- "Dry mottled bark ... flat dark opening", "paper-thin shell with a flat brown interior ... regular rings" (major): thick torn wall, hollow with pith, salt flakes, rings of unequal spacing; no drops. Partly closed.
- "broad even gray-to-red stain and dark underside" (major), "smooth uniform fur-shaded model look; legs enter the liquid with no ripple ring, no wet darkening", "no wet line" (major): hide lifted by number, wet ragged line, meniscus, drops. Partly closed.
- "mostly dark and dry ... uniform matte finish", "no meniscus, no ripple, no wet darkening and no salt" (major, the stuck one): dark wet band and meniscus where it is sunk, caked plates, paler wet feelers of unequal length. Partly closed.
- "spikes are near-identical, evenly spaced and stiffly parallel" (major): fifteen feelers of unequal length that hang and sway. Closed.
- "Thick, cropped trunks", "palm trunks at left ... jagged and noisy ... blotches repeat", "Tall, thick, densely grouped leaning trunks" (major): trunks lean, stained and ragged at the foot; the far grove low. Partly closed.
- "similar coarse, rock-like surface" (major, heaps): mound darker by number only. Open.
- "thin bright outline halo ... no meniscus or ripple" (major, claws): meniscus line. Partly closed.

Looks used this round, about: wallowers 42, dead 25, stalks and insects 44, fliers 3 (limit 40 each: two parts went a little over in the last hour).
