# The Carcass, round 3: notes on the kept images

This file lists the model, the prompt and the references for every kept image of round 3. Part one is the full set of step 2: six places and the reveal from orbit, 31 pictures, in direction B (Titan-fall). Part two is step 1: the nine pictures of the three art directions for The Breath. Nothing from rounds 1 or 2 was used as an input anywhere.

## How the set was made

- Takes generated in round 3: 306 (`gpt_image_2_6_sunburst` 248, `seedream_5` 30, `nano_banana_pro` 18, `gpt_image_2_6_flare` 7, `nano_banana_2_1` 3). Step 1 used 226. Batch 23, one revision of each step 1 detail, used 16. Step 2 used 64: 18 for the establishing views and the reveal, 44 for the details, 2 for one redo. Every kept image is from `gpt_image_2_6_sunburst`. Every take is in `working/takes/`; the take-to-prompt mapping, my notes and the critic replies are in `working/log.json`.
- Direction. No pick of an art direction was given. After step 1 was shown, the user asked for speed and for the work not to stop, so step 2 ran in B, Titan-fall, which was my recommendation. A (Overgrowth) or C (Corpse-light) can still be picked; the full set would then be remade in that direction.
- Establishing views of step 2: a fresh generation from text plus one real public-domain photograph (two for The Spine), supplied only as the standard for how a camera records that kind of light and weather. Two or three takes per subject, one kept.
- Details of step 2: a fresh generation with two references that have separate jobs. Image 1 is the establishing view of the place, supplied as the place itself ("the same place, at the same moment"). Image 2 is a real photograph, supplied only as a rendering standard: lava, surf, snow, bare hide, a wading bird. Two takes per detail, one kept. One detail was redone with a changed approach (The Eye, detail 2).
- The Breath carries its establishing view over from step 1 unchanged. Its details 1 and 2 are the one-step revisions of the step 1 details made in batch 23; details 3 and 4 are new.
- How the step 2 pictures were chosen: by my own eye, from full-size views, with the faults written down as found. They were not blind-tested. The blind scores of step 1 are quoted only where they apply to the picture or to its parent.
- Layout sketches: drawn by a script (`working/tools/layouts.py`), not generated. Positions follow the pictures; distances and scale bars are design intent for the build and were not measured from the pictures.
- Real photographs: all from Wikimedia Commons, public domain or CC0 for every one passed to the generator. Each is credited under the image it was used for and in `working/real/CREDITS.md`.
- Detail numbers are the order in which the camera reaches them, which is not always the order in which they were generated; the take names keep the generation order (for example `ribs-d2-t1` is detail 1 of The Ribs).

## Part one: the full set, direction B (Titan-fall)

The rule of the direction: the body is the land, bare as geology. Life gathers only where the body still leaks something. Each place has its own colour, weather and animals. The killer is the place itself, and it is in the frame as a line you should not cross.

### The Ribs (place 1 of 6)

- The place: A tidal strait between two rows of rib blades that stand out of the sea and lean in overhead. Low tide, sea wind, the sky clearing after a storm. Black weed covers every rib up to the tide line, about thirty metres up; above it the rock is pale and streaked white by the colony.
- What lives there: Kite-wings: pale, long-legged fliers with a tuft of tendrils for a head, wading the pools at low tide and nesting on the ledges above the weed line. Small pale crabs. Worms in the pools.
- How it kills you: The tide comes back through the cage as one wall of water. The weed line shows how high it reaches, and below that line nothing that cannot fly is alive when it arrives.
- The camera route: From the strait floor to the drowned animal hanging in the weed on the near rib (1), across the floor to the tide-pool feeders (2), up to the colony ledges (3), then a turn seaward as the bore comes through between the ribs (4).
- What moves, for the build: Surf and spray, water running off the weed, runnels draining across the sand, kite-wings feeding, landing and lifting off, cloud moving, the bore.
- Layout sketch: `step-2-full-set/1-ribs/ribs-layout.png`. Scale bar 200 m. The strait floor is about 600 m wide between the two rows.
- Contact sheet: `step-2-full-set/1-ribs/ribs-contact-sheet.jpg`

#### The Ribs: establishing view

- Kept image: `step-2-full-set/1-ribs/ribs-0-establishing.jpg` (take `ribs-est-t2`, generated 02:07 UTC, 32 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/ribs-est.txt`, full text below
- References passed to the generator, in order:
  1. `working/real/plate-surf-1.jpg`: real photograph, "Waves breaking tides sea stack ocean rialto beach d archuleta march 06 2015 (17287769136).jpg" by Olympic National Park, Public domain, https://commons.wikimedia.org/wiki/File:Waves_breaking_tides_sea_stack_ocean_rialto_beach_d_archuleta_march_06_2015_(17287769136).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Two facing rows of rib blades curving in over a tidal flat: reads as a cage you walk through; weed line, drowned carcass, kite-wings and far surf at four distances.
- Known faults: More designed than the other places; the returning bore is only a thin surf line; two near kite-wings run in the same pose.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `ribs-est`:

```text
One reference image is supplied: a real photograph. Use it only as the standard for how the new picture is rendered: how a real camera records light, haze, exposure and colour; soft highlights; detail that softens with distance; large plain, unremarkable surfaces. Do not copy its subject, its layout or anything in it.

Make a new 16:9 photograph: one frame from a big-budget natural-history film about an alien world, shot on location with a large-format cinema camera and a 28 mm lens. It must be indistinguishable from real location photography.

THE PLACE. A tidal strait on a cold coast at low tide, on a bright windy day after a storm: heavy surf outside, flying spray, broken cloud with patches of hard sunlight and cloud shadow moving across the water. Out of the strait stand the ribs of a creature the size of a mountain range that died ages ago: two facing rows of colossal curved blades of pale weathered rock, each three to five hundred metres high, rooted in the sea bed and curving up and inward toward each other high overhead, so that the strait between them is like the nave of a roofless hall. The sea has worked on them for ages and they read as natural sea stacks and headlands: layered, ledged, cracked, undercut at the base, pierced by caves and worn-through arches, with fallen blocks at their feet. No two are alike and they are not evenly spaced: one is broken off at a third of its height, one has fallen and lies across the strait as a causeway of huge blocks, two have fused where their tips met into a natural arch high above, and the far ones are lower and half lost in spray and haze. Up to about thirty metres above the water every rib is black with wet weed and crust: the height the tide reaches. Above that line the rock is pale ivory, streaked white with droppings and blotched rust-orange with lichen along its ledges. Seen from a wet gravel bar in the middle of the strait at head height. The floor of the strait at low tide is a wide flat of wet dark sand and shingle with tide pools and shallow braided runnels that reflect the sky, leading away between the two rows: the route. Far down the strait, between the farthest ribs, one long white line lies right across the water from side to side: the tide coming back as a bore, a breaking wall of white water still two kilometres off, with spray smoking off its crest. High on the base of the nearest rib on the left, tangled in the hanging weed ten metres above the sand, hangs the drowned carcass of a large long-legged animal, left there by the last tide.

LIFE. Kite-wings: pale grey flying animals with long narrow wings of bare skin three metres across, rust-orange along the wing edges, and a long flexible neck that ends in a tuft of feeding tendrils instead of a head. They nest in tens of thousands on the ledges above the tide line, crowded like a seabird colony, and the air around the upper ribs is full of them wheeling like smoke, white where the sun catches them against dark cloud. About a dozen stand scattered on the wet flat at different distances from the viewer, feeding in the tide pools: each stands on two long thin legs with its wings folded up over its back like a closed umbrella; two are running into the wind to take off; none is nearer than thirty metres.

LIGHT. Sun high and to the right behind broken cloud; no sun disc. One patch of hard sunlight lies on the upper part of two ribs on the right and on a strip of wet sand; the rest is in cloud shadow under a dark blue-grey sky. Spray and haze soften everything beyond the fourth rib. Wet sand and pools are bright with reflected sky. Colours: slate grey-green sea, white surf, black weed, ivory rock, a little rust orange.

WHAT MAKES IT REAL. One light source and one weather, consistent everywhere. Most of the frame is plain and unremarkable. Surfaces have no repeating pattern, no scales, no crackle and no carved detail. Nothing is evenly spaced and nothing is repeated; every object differs in size, shape and state, and some are broken, half hidden or cut off by the edge of the frame. Animals are small in the frame, in different poses and facing different ways, some partly hidden; none is posed side-on for the camera. Far things are paler, softer and lower in contrast than near things. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

The land plainly continues beyond every edge of the frame. No people, no buildings, paths or railings, no equipment, no text, no watermark, no border.
```

#### The Ribs: detail 1, the drowned, hanging in the weed

- Kept image: `step-2-full-set/1-ribs/ribs-1-the-drowned-hanging-in-the-weed.jpg` (take `ribs-d2-t1`, generated 02:18 UTC, 33 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/ribs-d2.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/ribs-est-t2.jpg`: take `ribs-est-t2`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-surf-1.jpg`: real photograph, "Waves breaking tides sea stack ocean rialto beach d archuleta march 06 2015 (17287769136).jpg" by Olympic National Park, Public domain, https://commons.wikimedia.org/wiki/File:Waves_breaking_tides_sea_stack_ocean_rialto_beach_d_archuleta_march_06_2015_(17287769136).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: A drowned long-legged animal hanging head down in the weed with small pale crabs on it, water still running off, older bones higher up, rib blades behind.
- Known faults: The second skeleton above it is very neat.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `ribs-d2`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 50 mm lens from the foot of the nearest rib on the left of Image 1, looking up at the wall of weed. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The drowned animal of Image 1, exactly where it hangs in Image 1: ten metres up the black dripping wall of weed, caught by its legs. It is a large, pale, long-legged, long-necked animal, limp, hanging head-down with its neck and its tuft of tendrils trailing; its skin is sodden and beginning to slough, its ribs show, and one leg is broken. Weed is wrapped round it and water is still running out of the weed. A few small pale scavengers like crabs are already on it. Along the wall at the same height, caught in the weed, are older bones: the line the tide reaches.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The wet tidal flat with its pools; kite-wings standing far off; the far ribs; bright sky reflected in the pools.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

#### The Ribs: detail 2, tide-pool feeders

- Kept image: `step-2-full-set/1-ribs/ribs-2-tide-pool-feeders.jpg` (take `ribs-d3-t2`, generated 02:18 UTC, 33 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/ribs-d3.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/ribs-est-t2.jpg`: take `ribs-est-t2`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/ref-wader-1.jpg`: real photograph, "Black Necked Stilt at the Fish Springs National Wildlife Refuge (51665418218).jpg" by USFWS Mountain Prairie, Public domain, https://commons.wikimedia.org/wiki/File:Black_Necked_Stilt_at_the_Fish_Springs_National_Wildlife_Refuge_(51665418218).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Kite-wings wading; one pulls a worm from a pool with its tendril head, another shakes off water, surf behind.
- Known faults: The near animal has an eye; in the establishing view they read eyeless.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `ribs-d3`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light and exposure, and how a real long-legged wading animal looks. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 400 mm lens from a camera lying on the wet sand of the tidal flat in Image 1. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. Three kite-wings feeding in a tide pool, at different distances, so that only the nearest is fully sharp. Each stands on two long thin legs in ankle-deep water with its wings folded up over its back like a closed umbrella, rust-orange along the wing edges, its long neck lowered and its tuft of tendrils spread in the water, feeling under stones. One has pulled out something small that writhes. One is shaking water off. The farthest has begun to run into the wind with its wings half open, kicking up spray. Their skin is bare, thin, wrinkled, veined and wet, with sand stuck to the legs. Their reflections are broken by wind ripples.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The bases of the ribs, black with weed up to the tide line; the pale blades above; surf and spray; dark cloud with one sunlit patch.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

#### The Ribs: detail 3, the colony

- Kept image: `step-2-full-set/1-ribs/ribs-3-the-colony.jpg` (take `ribs-d1-t1`, generated 02:18 UTC, 42 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/ribs-d1.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/ribs-est-t2.jpg`: take `ribs-est-t2`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-surf-1.jpg`: real photograph, "Waves breaking tides sea stack ocean rialto beach d archuleta march 06 2015 (17287769136).jpg" by Olympic National Park, Public domain, https://commons.wikimedia.org/wiki/File:Waves_breaking_tides_sea_stack_ocean_rialto_beach_d_archuleta_march_06_2015_(17287769136).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Ledges crowded with kite-wings above the weed line, white streaks down the rock, orange crust, one landing.
- Known faults: Two blurred fliers in the foreground take a lot of the frame.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `ribs-d1`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 600 mm lens from the tidal flat of Image 1, looking up at the ledges of the large rib on the right, above the tide line. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. A stretch of ledges fifty metres up the pale rock, crowded with nesting kite-wings: hundreds of them, packed like a seabird colony but unevenly, with gaps. Each is a pale grey animal with long narrow wings of bare skin, rust-orange along the edges, folded up over its back like a closed umbrella; it stands on two thin legs and has a long flexible neck that ends in a tuft of tendrils instead of a head. Some sit low on nests of dried black weed; some stretch one wing; two squabble with their necks raised; one is landing with wings spread and legs out; several are in the air in front, blurred by their own movement. Their skin is thin, wrinkled, veined and dirty. The rock is streaked white with droppings and blotched rust-orange with lichen. At the bottom of the frame is the top of the black weed line.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. Dark blue-grey cloud; more of them wheeling as specks; the curve of another rib in haze.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

#### The Ribs: detail 4, the bore arrives

- Kept image: `step-2-full-set/1-ribs/ribs-4-the-bore-arrives.jpg` (take `ribs-d4-t1`, generated 02:18 UTC, 38 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/ribs-d4.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/ribs-est-t2.jpg`: take `ribs-est-t2`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-surf-1.jpg`: real photograph, "Waves breaking tides sea stack ocean rialto beach d archuleta march 06 2015 (17287769136).jpg" by Olympic National Park, Public domain, https://commons.wikimedia.org/wiki/File:Waves_breaking_tides_sea_stack_ocean_rialto_beach_d_archuleta_march_06_2015_(17287769136).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: A wall of white water coming through between two ribs, kite-wings lifting off ahead of it.
- Known faults: The kite-wings fly in an even line; the wave is closer to storm surf than to a single bore.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `ribs-d4`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records surf, spray and haze. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 600 mm lens from the tidal flat of Image 1, looking straight down the strait between the farthest ribs. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The tide coming back: a breaking wall of white water four metres high, right across the strait from one row of ribs to the other, a kilometre off and coming on. Behind its white front the water is brown-grey and churning; spray smokes off its crest in the wind, and it bursts up white where it meets the foot of a rib. In front of it the flat is still calm and wet with the last pools. Kite-wings that were feeding there are lifting off ahead of it in a ragged line, the last ones only just clear of the water. The bases of two ribs frame it, black with weed up to the tide line.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. Farther ribs in spray and haze; dark blue-grey sky with one patch of sunlight.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

### The Heart (place 2 of 6)

- The place: A caldera lake of lava about a kilometre across under walls three hundred metres high, at nightfall. The lake is covered by a grey-black crust broken into plates, with glowing seams between them. A vessel mouth in the far wall pours a lava fall into the lake. On the near side a bench of old solid lava runs along the shore, with one steaming sulphur crack in it.
- What lives there: Crust-walkers: tall animals on thin legs that walk the plates and feed at the seams through a trunk that frays into tendrils.
- How it kills you: The crust looks like ground. A plate founders and the lake takes whatever stood on it. One walker is half under the folded skin of the lava with two legs still arched out of it.
- The camera route: From the bench to the line where solid rock ends and the crust begins (1), out to the one that sank (2), on to the walkers feeding at a bright seam (3), then up to the vessel mouth and its lava fall (4).
- What moves, for the build: Seams opening and closing, plates drifting and foundering, spatter, the lava fall, fume, heat shimmer, sulphur steam, walkers stepping.
- Layout sketch: `step-2-full-set/2-heart/heart-layout.png`. Scale bar 200 m. The lake is about 1 km across.
- Contact sheet: `step-2-full-set/2-heart/heart-contact-sheet.jpg`

#### The Heart: establishing view

- Kept image: `step-2-full-set/2-heart/heart-0-establishing.jpg` (take `heart-est-t1`, generated 02:07 UTC, 34 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/heart-est.txt`, full text below
- References passed to the generator, in order:
  1. `working/real/plate-lava-1.jpg`: real photograph, "Kīlauea summit eruption in Halemaʻumaʻu crater - October 2, 2021 (96849).jpg" by USGS Hawaiian Volcano Observatory, Public domain, https://commons.wikimedia.org/wiki/File:K%C4%ABlauea_summit_eruption_in_Halema%CA%BBuma%CA%BBu_crater_-_October_2,_2021_(96849).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Reads as a real lava lake at dusk: bench route on the left, crust-walkers at three distances, the vessel mouth and its lava fall, the buttress, the foundered walker.
- Known faults: The five mid-distance walkers share a silhouette; near walker body is thin and sketchy; second chamber beyond the buttress is only a glow.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `heart-est`:

```text
One reference image is supplied: a real photograph. Use it only as the standard for how the new picture is rendered: how a real camera records light, haze, exposure and colour; soft highlights; detail that softens with distance; large plain, unremarkable surfaces. Do not copy its subject, its layout or anything in it.

Make a new 16:9 photograph: one frame from a big-budget natural-history film about an alien world, shot on location with a large-format cinema camera and a 28 mm lens. It must be indistinguishable from real location photography.

THE PLACE. The floor of a volcanic caldera at nightfall, seen from a ledge of black rock about thirty metres above it. The caldera is the collapsed heart of a creature the size of a mountain range that died ages ago, and its last heat is still here. Below and ahead lies a lake of lava nearly a kilometre across, almost entirely covered by a dull grey-black crust like elephant skin, broken into huge irregular plates. Between the plates run thin, crooked seams of orange glow, brighter where plates are pulling apart and nearly dark where they have closed. In two places far apart the crust is foundering: a plate tilts and slides under and a short ragged line of spatter fountains a few metres high. From the bottom of the frame a bench of solid black rock leads away along the left shore of the lake: the route. It is old cold lava with ropy folds, cinders and loose blocks, with brittle sulphur-yellow crusts only around a few small steaming cracks. Where the bench ends the crust begins with no change of level, and only one thin glowing crack marks the line between ground and lake. On the far side, a kilometre away, the caldera wall rises three hundred metres in dark layered cliffs with slopes of fallen rock at their feet. In that wall gapes one enormous ragged opening, the stump of a great vessel: a natural tunnel mouth eighty metres across, wider than it is tall, its lip sagging, its walls going back into darkness. A slow fall of lava pours from its floor down the cliff into the lake in one uneven rope, bright at the top and crusting darker as it falls, with a fan of brighter fresh lava where it lands. To the right of it a great buttress of rock runs out from the wall into the lake like a wall between two chambers, and beyond it a second, farther part of the lake glows under the fume.

LIFE. Crust-walkers: animals that cross the crust to feed at the glowing seams. Each has a small deep soot-black body carried high on four very long thin legs that end in broad flat pads, like a pond-skater as tall as a giraffe, and a long drooping neck that ends in a tuft of pale feeding tendrils instead of a head. They are scattered the way real animals are: a loose group of five on the crust in the middle distance working along one bright seam, lit orange from below, at different angles and partly overlapping; two far out, small black shapes against the glow; one near the shore, mid-step from the bench onto the crust. Close to the bench is one that did not get off its plate in time: only two legs and part of its back stand out of the crust at an angle, crusted over grey, cold.

LIGHT. Deep dusk. The last blue-grey light is fading from the sky above the far wall; no sun, no moon. The lava is the main light: everything facing the lake is lit warm orange from below and falls off quickly to black away from it. A broad column of fume rises from the lake, lit orange underneath, going grey-brown as it climbs and shearing off sideways in the wind at the height of the rim. The crust itself is dark and almost colourless. Rocks on the near bench are nearly black with faint orange rims. Exposed as a real camera records a lava lake at dusk: the seams are bright but not blown out, grading from yellow-white in the core to deep red at their edges, and the shadows are dark but still hold shape. Colours: black, ash grey, ember orange, a little sulphur yellow, a trace of cold blue in the sky.

WHAT MAKES IT REAL. One light source and one weather, consistent everywhere. Most of the frame is plain and unremarkable. Surfaces have no repeating pattern, no scales, no crackle and no carved detail. Nothing is evenly spaced and nothing is repeated; every object differs in size, shape and state, and some are broken, half hidden or cut off by the edge of the frame. Animals are small in the frame, in different poses and facing different ways, some partly hidden; none is posed side-on for the camera. Far things are paler, softer and lower in contrast than near things. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

The land plainly continues beyond every edge of the frame. No people, no buildings, paths or railings, no equipment, no text, no watermark, no border.
```

#### The Heart: detail 1, the lava surface at the line

- Kept image: `step-2-full-set/2-heart/heart-1-the-lava-surface-at-the-line.jpg` (take `heart-d1-t2`, generated 02:18 UTC, 32 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/heart-d1.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/heart-est-t1.jpg`: take `heart-est-t1`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-lava-2.jpg`: real photograph, "Kīlauea summit eruption in Halemaʻumaʻu crater - October 4, 2021 (96872).jpg" by USGS Hawaiian Volcano Observatory, Public domain, https://commons.wikimedia.org/wiki/File:K%C4%ABlauea_summit_eruption_in_Halema%CA%BBuma%CA%BBu_crater_-_October_4,_2021_(96872).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: The line itself: sulphur crack steaming on the solid bench, an open seam, a walker stepping out, the lava fall behind.
- Known faults: Foreground focus is shallow enough to hint at a tilt-shift miniature; the walkers repeat one silhouette.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `heart-d1`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records the surface of real lava: its crust, its incandescent seams, its exposure at dusk. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 100 mm lens from a camera set low on the edge of the black bench in Image 1, exactly where the solid rock ends and the crust of the lava lake begins, looking out across the crust. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The line between ground and lake, two metres from the lens: a crooked seam, a hand to an arm wide, where the crust is pulling apart. Inside it the lava is bright yellow-orange and moving, slowly welling and stretching into ropes and skins that dull to red and then to grey as they cool. The crust plates on either side are dull grey-black with a wrinkled ropy skin like elephant hide; their edges curl, crack and glow dull red just under the surface. A few small gobs of spatter have landed on the near plate and are going dark. Heat shimmer blurs everything seen across the seam and thin blue-white fume rises from it. At the left edge of the frame is the lip of the solid bench: cinders, loose blocks and a brittle crust of sulphur-yellow crystals round one small steaming crack.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The crust stretching away with other thin glowing seams; two or three crust-walkers as tall thin black shapes lit orange from below; the lava fall from the tunnel mouth in the far wall as a soft bright line; the fume lit from below; the dusk sky.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

#### The Heart: detail 2, the one that sank

- Kept image: `step-2-full-set/2-heart/heart-2-the-one-that-sank.jpg` (take `heart-d3-t1`, generated 02:18 UTC, 31 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/heart-d3.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/heart-est-t1.jpg`: take `heart-est-t1`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-lava-1.jpg`: real photograph, "Kīlauea summit eruption in Halemaʻumaʻu crater - October 2, 2021 (96849).jpg" by USGS Hawaiian Volcano Observatory, Public domain, https://commons.wikimedia.org/wiki/File:K%C4%ABlauea_summit_eruption_in_Halema%CA%BBuma%CA%BBu_crater_-_October_2,_2021_(96849).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Two legs arched out of the crust, the body already under folded lava skin, living walkers feeding behind it.
- Known faults: The far walkers are near-copies of each other.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `heart-d3`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 50 mm lens from a low camera on the edge of the bench in Image 1, a few metres from the crust-walker that sank into the crust. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The foundered crust-walker of Image 1, exactly where and how it lies in Image 1: two long thin legs and part of its back stand out of the crust at an angle and everything else is under. The legs are coated in a grey skin of chilled lava that has cracked and flaked to show charred black beneath, and the broad flat pad of one leg hangs in the air. The crust around it is wrinkled into ropy folds where it closed over the body, and one short crack beside it still glows dull red and leaks a little fume. A few steps beyond it, soft, the living crust-walker of Image 1 is stepping away across the crust on its four stilt legs, lit orange from below.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The crust with thin glowing seams; the lava fall and the tunnel mouth in the far wall; the buttress; the fume.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

#### The Heart: detail 3, crust-walkers feeding at a seam

- Kept image: `step-2-full-set/2-heart/heart-3-crust-walkers-feeding-at-a-seam.jpg` (take `heart-d2-t2`, generated 02:18 UTC, 30 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/heart-d2.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/heart-est-t1.jpg`: take `heart-est-t1`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/ref-hide-1.jpg`: real photograph, "African elephant, Dzanga Sangha, Central African Republic (18945940511).jpg" by U.S. Fish and Wildlife Service Headquarters, Public domain, https://commons.wikimedia.org/wiki/File:African_elephant,_Dzanga_Sangha,_Central_African_Republic_(18945940511).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Three walkers at a bright seam, the feeding trunk fraying into tendrils in the lava, the fall and the buttress behind.
- Known faults: The middle walker's lifted foot ends in a flat disc that looks designed.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `heart-d2`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light and exposure, and how the skin of a real animal looks. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 400 mm lens from the black bench in Image 1, looking out across the crust at the group of crust-walkers working the bright seam in the middle distance. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. Three of the crust-walkers of Image 1 at slightly different distances, so that only the nearest is fully sharp. Each has a small deep soot-black body carried four metres up on four very long thin legs with knobbly joints, ending in broad flat pads that spread its weight on the crust, and a long drooping neck that ends not in a head but in a tuft of pale feeding tendrils. Their skin is dry, creased and scarred, dusted grey with ash and cracked at the joints. The nearest has lowered its neck so that its tendrils hang just above the glowing seam, lit bright orange, their tips singed dark. Another is in mid-stride with one pad lifted and crumbs of crust falling from it. The third, partly hidden behind the first, has its neck raised. They are lit hard orange from below by the seam and are black on top against the fume. The crust sags a little under each pad. Heat shimmer rises between the lens and the animals.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The lava fall from the tunnel mouth, at the upper left; the dark far wall; the buttress; orange-lit fume.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

#### The Heart: detail 4, the vessel mouth and its lava fall

- Kept image: `step-2-full-set/2-heart/heart-4-the-vessel-mouth-and-its-lava-fall.jpg` (take `heart-d4-t2`, generated 02:18 UTC, 50 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/heart-d4.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/heart-est-t1.jpg`: take `heart-est-t1`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-lava-1.jpg`: real photograph, "Kīlauea summit eruption in Halemaʻumaʻu crater - October 2, 2021 (96849).jpg" by USGS Hawaiian Volcano Observatory, Public domain, https://commons.wikimedia.org/wiki/File:K%C4%ABlauea_summit_eruption_in_Halema%CA%BBuma%CA%BBu_crater_-_October_2,_2021_(96849).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: The vessel mouth lit from below, the fall braiding down the scree, two walkers at its foot for scale.
- Known faults: The bright seam along the bottom edge is out of focus and a little graphic.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `heart-d4`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 600 mm lens from the black bench in Image 1, looking right across the lake at the tunnel mouth in the far wall. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The enormous ragged tunnel mouth of Image 1, the stump of a great vessel: eighty metres across, wider than it is tall, its lip sagging, its walls marked with thick rounded bands that go back into darkness, the roof lit orange from below. From its floor lava pours down the cliff in one uneven rope: yellow-white at the top, crusting darker in clots as it falls, splitting round a ledge, and spreading at the bottom into a bright fan that pushes under the dark crust of the lake. Fume and heat shimmer rise along it. At the foot of the fall, tiny against it, two crust-walkers on their stilt legs pick their way along the edge of the fan.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. Dark layered cliff and slopes of fallen rock on either side; in front, out of focus, the dark crust with one glowing seam.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

### The Breath (place 3 of 6)

- The place: A tidal shelf of pale bone-rock planed flat by the sea, at a cold dawn with sea fog and a low sun. Shafts open in the shelf: the airways. The largest is ringed inside with ruined cartilage hoops and has one collapsed side. A tide channel crosses the shelf. A sea cliff with a cave stands three kilometres on, with fog pouring out of it down the scree.
- What lives there: Waders: tall, pale, four-legged animals with plumed tendrils for a head, feeding in the tide channel. Gill-plumes: crimson feathered growths rooted on the lip of the shaft, where the vapour leaves it.
- How it kills you: The air that slides out of the shafts is heavy and has nothing in it to breathe. It lies low over the rock and pools at the rim. One wader lies dead at the rim and another stands over the drop.
- The camera route: From the channel bank to the waders feeding in the channel (1), across the shelf to the rim (2), round the lip to the gill-plumes (3), then over the edge and down the shaft (4).
- What moves, for the build: Vapour sliding out of the shaft and pooling, the fog bank, water moving in the channel, waders feeding, plumes swaying and dripping.
- Layout sketch: `step-2-full-set/3-breath/breath-layout.png`. Scale bar 50 m. The main shaft is about 60 m across.
- Contact sheet: `step-2-full-set/3-breath/breath-contact-sheet.jpg`

#### The Breath: establishing view

- Kept image: `step-2-full-set/3-breath/breath-0-establishing.jpg` (take `B-est-t60`, generated 01:06 UTC, 34 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/B-est-plate3.txt`, full text below
- References passed to the generator, in order:
  1. `working/real/plate-terrace-2.jpg`: real photograph, "Great Fountain Geyser terraces at sunset (30766842144).jpg" by Yellowstone National Park, Public domain, https://commons.wikimedia.org/wiki/File:Great_Fountain_Geyser_terraces_at_sunset_(30766842144).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
  2. `working/layouts/B-layout.jpg`: a 768 x 432 blurred copy of an earlier round 3 take of my own (B-est-t38), supplied for positions only
- Why kept: Step 1 establishing view of direction B, carried into the full set unchanged. Landform carries the frame: tide channel, airway shaft with ruined hoops, flats and cliff cave at four distances; heavy vapour; waders small and scattered.
- Known faults: Far waders repeat a head-down silhouette; red plumes sit slightly on top of the rock; vapour plumes a little evenly spaced; cave soft.
- Critics: Blind packet 11 (this image): Sol 9 FILM, Opus 8 FILM, Carbon 5 PAINTING. Blind packet 10 (the same image): 8 FILM, 8 FILM, 9 FILM. Same-location test 3: all six details of step 1 placed in the correct wide view.

Prompt `B-est-plate3`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a real photograph. Use it only as the standard for how the new picture is rendered: how a real camera records light, haze, exposure and colour; soft highlights; detail that softens with distance; large plain, unremarkable surfaces. Do not copy its subject, its layout or anything in it.
Image 2 is a rough, blurred layout sketch of the place to photograph. Use it only for where things are: the viewpoint, the horizon, the route, the position and size of each landmark. Do not copy its surface texture, its sharpness or its rendering. Invent every surface fresh, as a camera would record real materials.

Make a new 16:9 photograph: one frame from a big-budget natural-history film about an alien world, shot on location with a large-format cinema camera and a 28 mm lens. It must be indistinguishable from real location photography.

THE PLACE. A vast tidal shelf on a cold coast at low tide, early morning, sea fog burning off. The shelf is the exposed lung of a creature the size of a mountain range that died ages ago, worn down by the sea into a wave-cut platform of pale grey-white bone-rock: smooth, water-worn, planed nearly flat in broad low steps, with a few long joints, shallow pools, wet patches and dry patches, and drifts of shingle in the hollows, like a real limestone shore. One shallow tide channel of pale teal water winds away from the bottom of the frame across the shelf: the route. On the right, about eighty metres away, the shelf is pierced by one of the creature's airways: a shaft about forty metres across that drops straight down into the dark. It is lopsided, not round: the near lip is undercut and overhanging, one side has collapsed into a ramp of broken slabs, and the far side is a sheer wall. Its inside wall shows the remains of three cartilage hoops one below another, like the rings inside a windpipe: thick rounded bands of ivory cartilage, as tall as a house, bulging from the rock wall. They are old and ruined: cracked across, pitted, flaking, stained tea-brown and green-black where water runs, slightly translucent like horn at broken edges. None is complete and no two are alike: the top one survives only as two separate arcs with a wide gap of bare rock between them, the second sags and has dropped a block the size of a truck onto the third, and the third is half lost in darkness and vapour. Low sun rakes across the far inside wall so each band throws a shadow on the one below, while the near inside wall is in deep shadow. They are grown, not built: part of the wall, never free-standing, never pipes, beams, steps or masonry. Cold white vapour wells up out of the shaft, leans on the wind and, being heavy, sinks and slides away low across the rock. Deep wine-red gill-plumes, soft wet feathery fronds like the gills of giant tube worms, grow only where the vapour is: one large ragged mass on the near lip spilling inward over the drop and lifting in the rising vapour, and a few thin scraps and seedlings of very different sizes along cracks elsewhere on the lip; they are dark and dull in shadow and glow red only where the light passes through them. Nothing grows anywhere else on the shelf except a thin dark line of weed at the waterline of the channel. Farther off, at different distances and off any line, two smaller shafts show only as dark holes with their own thin vapour, and far out one tall plume of vapour is being torn sideways and frayed by the wind. Kilometres away the coast rises to an ordinary weathered sea cliff with level beds, scree and snow lying in its gullies. In it is one very large ragged cave mouth, wider than it is tall; it is not a black hole: its roof, a floor of fallen boulders and its walls can be seen going back into dimness. A slow bank of fog with a clear upper surface slides out along the cave floor and spills down the scree apron onto the shelf like a waterfall in slow motion.

LIFE. Bone-white wading animals, each with a small solid body on four long legs and a long neck that ends in a tuft of pink feeding tendrils instead of a head. They are scattered the way real animals are, never in a row: a loose clump of seven far down the channel at different depths, overlapping one another, some with necks down in the water, one with its neck straight up, one sitting folded on the rock, two walking; a few stragglers at different distances; and a far flock like scattered grains of rice on the shallows, a few of them in the air. One stands alone on dry rock near the lip of the shaft, three-quarters turned away from the viewer, looking down into it, and throws a long soft shadow toward the viewer; another lies dead on its side near the lip. The nearest is no taller than a twenty-fifth of the frame height.

LIGHT. Backlit by a low sun that is outside the frame to the upper left; no sun disc is visible. A broad pale-gold glow comes through the fog. Everything facing the viewer is in soft cool shadow with warm rims; the vapour glows where the light passes through it; sun glitter lies on the channel and on rock that is actually wet, and dry rock is matte with no reflections. Colours: grey-white and ivory rock, pale teal water, a little dark wine-red, pale gold light.

WHAT MAKES IT REAL. One light source and one weather, consistent everywhere. Most of the frame is plain: bare pale rock, shallow water, fog and sky. Surfaces have no repeating pattern, no scales, no crackle and no carved detail. Nothing is evenly spaced and nothing is repeated; every object differs in size, shape and state, and some are broken, half hidden or cut off by the edge of the frame. Animals are small in the frame, in different poses and facing different ways, some partly hidden; none is posed side-on for the camera. Far things are paler, softer and lower in contrast than near things. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

The land plainly continues beyond every edge of the frame. No people, no buildings, paths or railings, no equipment, no text, no watermark, no border.
```

#### The Breath: detail 1, waders feeding in the channel

- Kept image: `step-2-full-set/3-breath/breath-1-waders-feeding-in-the-channel.jpg` (take `B-d2-t42`, generated 01:59 UTC, 40 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/B-d2-rev1.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/B-d2-t20.jpg`: take `B-d2-t20`, the frame being revised ("re-shoot the same frame, change only these things")
  2. `working/real/ref-wader-1.jpg`: real photograph, "Black Necked Stilt at the Fish Springs National Wildlife Refuge (51665418218).jpg" by USFWS Mountain Prairie, Public domain, https://commons.wikimedia.org/wiki/File:Black_Necked_Stilt_at_the_Fish_Springs_National_Wildlife_Refuge_(51665418218).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
  3. `working/real/ref-hide-2.jpg`: real photograph, "Adult Walrus Resting on Shore.jpg" by Ryan Kingsbery, Public domain, https://commons.wikimedia.org/wiki/File:Adult_Walrus_Resting_on_Shore.jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Lineage: a single-step revision of `B-d2-t20`, which was generated by `gpt_image_2_6_sunburst` from prompt `working/prompts/B-d2p3.txt` (full text in the step 1 part of this file) with the establishing view `B-est-t60` and `working/real/plate-terrace-2.jpg` as references.
- Why kept: Three waders feeding in the channel against the low sun, legs planted in the water, the cliff behind. One-step revision of the step 1 detail B-d2-t20: real bare hide, and the tidy lines of drips are gone.
- Known faults: The left animal is cut by the frame and soft. Adopted by eye and not blind-tested; the step 1 blind scores apply to the earlier B-d2-t20.
- Critics: Not blind-tested. Its parent `B-d2-t20` scored FILM 7 / FILM 5 / AMATEUR 4 in blind packet 13 (Sol / Opus / Carbon) and was placed in the correct wide view by all three critics in same-location test 3.

Prompt `B-d2-rev1`:

```text
Three images are supplied, with different jobs.
Image 1 is a frame from a big-budget natural-history film about an alien world. Re-shoot the same frame: the same location, the same camera position and lens, the same light and weather, the same composition, colours and depth of field, and the same real location-photography look with true lens perspective and fine physical surface detail. Output a wide 16:9 landscape frame. Change only the things listed below; everything else stays exactly as in Image 1, and nothing new is added anywhere else.
Image 2 is an unrelated real photograph of a real wading bird. Use it only as the standard for how a real long-legged animal stands in shallow water: thin hard legs with dirty knuckled joints, weight on the planted legs, a ring of ripples where each leg enters the water, a broken reflection. Do not copy the bird: no feathers, no beak, no head, none of its colours.
Image 3 is an unrelated real photograph of a real animal's bare hide. Use it only as the standard for how real bare skin looks to a camera: matte, creased, scarred, blotchy and dirty, never waxy, never rubbery, never glossy all over. Do not copy the animal, its shape or its brown colour.

CHANGES.
1. The skin of the wading animals. In Image 1 it is too smooth and waxy. It is thin, pale, bare skin like that of a plucked bird: matte, finely wrinkled and pimpled, with faint grey-blue veins and the edges of ribs, hips and shoulder blades showing through it, pinker and rawer at the joints, with scabs, scratches and old pale scars. Grey silt has dried on the legs up to the knee and is splashed on the bellies. The skin is wet and darker only where water has touched it. The animals keep their shape, their bone-white colour, their places and their poses.
2. The legs meet the water properly: around every leg that stands in the water there is a ring of ripples and a small cloud of stirred silt, and each animal has a broken, wobbling reflection. The lifted leg of the middle animal is caught in mid-step, with water running off the foot.
3. The water falling from the raised tendrils of the middle animal is not a line of beads. It is what a camera really records: a few thin broken dribbles and scattered drops of different sizes, bent a little by the breeze, some blurred by their fall, with small uneven splashes where they land.
4. The tendrils at the end of each neck are wet, heavy and clumped into uneven strands, with silt and shreds of weed caught in them. They hang and drip; they do not stand out like a brush.

It must still read as real location photography of a place you could walk into, not artwork and not computer graphics: irregular, weathered, dirty, unposed, with fine film grain. No people, no buildings or ruins, no cameras, drones or equipment, no text, no watermark, no border.
```

#### The Breath: detail 2, the rim

- Kept image: `step-2-full-set/3-breath/breath-2-the-rim.jpg` (take `B-d1-t42`, generated 01:59 UTC, 34 s, 1671x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/B-d1-rev1.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/B-d1-t32.jpg`: take `B-d1-t32`, the frame being revised ("re-shoot the same frame, change only these things")
  2. `working/real/ref-hide-2.jpg`: real photograph, "Adult Walrus Resting on Shore.jpg" by Ryan Kingsbery, Public domain, https://commons.wikimedia.org/wiki/File:Adult_Walrus_Resting_on_Shore.jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Lineage: a single-step revision of `B-d1-t32`, which was generated by `gpt_image_2_6_sunburst` from prompt `working/prompts/B-d1p4.txt` (full text in the step 1 part of this file) with the establishing view `B-est-t60` and `working/real/plate-terrace-2.jpg` as references.
- Why kept: The rim: the last one that came to it lying collapsed on the rock, a living wader standing over the drop with its head down, plumes rooted in the cracks, the ruined hoops in the shaft. One-step revision of the step 1 detail B-d1-t32: untidier carcass, real bare skin, uneven vapour.
- Known faults: The carcass is centred and evenly lit, which still reads a little staged. Adopted by eye and not blind-tested; the step 1 blind scores apply to the earlier B-d1-t32.
- Critics: Not blind-tested. Its parent `B-d1-t32` scored FILM 7 / FILM 6 / FILM 5 in blind packet 12 (Sol / Opus / Carbon) and was placed in the correct wide view by all three critics in same-location test 3.

Prompt `B-d1-rev1`:

```text
Two images are supplied, with different jobs.
Image 1 is a frame from a big-budget natural-history film about an alien world. Re-shoot the same frame: the same location, the same camera position and lens, the same light and weather, the same composition, colours and depth of field, and the same real location-photography look with true lens perspective and fine physical surface detail. Output a wide 16:9 landscape frame. Change only the things listed below; everything else stays exactly as in Image 1, and nothing new is added anywhere else.
Image 2 is an unrelated real photograph of a real animal's bare hide. Use it only as the standard for how real bare skin looks to a camera: matte, creased, scarred, blotchy and dirty, never waxy, never rubbery, never glossy all over. Do not copy the animal, its shape or its brown colour.

CHANGES.
1. The skin of both animals. In Image 1 it is too smooth and waxy. It is thin, pale, bare skin like that of a plucked bird: matte, finely wrinkled and pimpled, with faint grey-blue veins and the edges of ribs and hip bones showing through it, pinker and rawer at the joints, with scabs, scratches and old pale scars, and grey dust and dried silt on the legs and belly. Both animals keep their shape, their bone-white colour and their places.
2. The dead animal in the foreground lies where it fell a day ago, with its neck toward the left and its legs toward the right as in Image 1, but it is not laid out neatly. Its legs have collapsed untidily: one is folded under the body, one is bent back at the knee, two lie crossed. The belly has sunk, the skin hangs slack between the ribs, the neck is twisted, and the tendrils at its end lie flat, dry and matted with grit. Windblown grit has gathered against the body and a dark damp stain has spread on the rock beneath it. There is no loose bone lying beside it.
3. The living animal at the rim stands as a real animal stands: its weight is on three legs and one hind leg is slack, its body is turned a little away, and its neck hangs low so that the tendrils almost touch the rock. Its feet are planted, with small dark contact shadows.
4. The vapour is uneven: thick and slow low inside the shaft, torn into thin wisps where it comes over the rim.
5. The dark red plumes grow out of cracks in the rock, with their bases wet, dark and tangled; a few stems are broken and lie on the rock.

It must still read as real location photography of a place you could walk into, not artwork and not computer graphics: irregular, weathered, dirty, unposed, with fine film grain. No people, no buildings or ruins, no cameras, drones or equipment, no text, no watermark, no border.
```

#### The Breath: detail 3, gill-plumes on the lip

- Kept image: `step-2-full-set/3-breath/breath-3-gill-plumes-on-the-lip.jpg` (take `breath-d3-t1`, generated 02:18 UTC, 33 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/breath-d3.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/B-est-t60.jpg`: take `B-est-t60`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-terrace-2.jpg`: real photograph, "Great Fountain Geyser terraces at sunset (30766842144).jpg" by Yellowstone National Park, Public domain, https://commons.wikimedia.org/wiki/File:Great_Fountain_Geyser_terraces_at_sunset_(30766842144).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Crimson feathered plumes rooted on the lip, dripping, a bone at the root, a wader in the fog behind, vapour leaving the shaft.
- Known faults: Close to a red seaweed or a conifer branch.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `breath-d3`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 100 mm lens from a low camera on the lip of the large shaft in Image 1, beside the large mass of red gill-plumes. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. A few fronds of the deep wine-red gill-plumes at arm's length: soft wet feathery fronds like the gills of giant tube worms, each a central stem with hundreds of fine filaments, lifted and combed upward by the cold white vapour that streams up past them out of the shaft. The filaments stick together in wet clumps; some are torn and some are bleached pale at the tips; condensation beads on them unevenly. Where the low sun passes through them they glow red; elsewhere they are dark. At their base a fleshy holdfast grips a crack in the pale rock, with shingle and one small old bone beside it.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The dark drop of the shaft with one ruined ivory hoop on its far wall; the vapour; the bone-white wader standing at the rim as a soft pale shape; the gold fog and the pale shelf.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

#### The Breath: detail 4, down the shaft

- Kept image: `step-2-full-set/3-breath/breath-4-down-the-shaft.jpg` (take `breath-d4-t1`, generated 02:18 UTC, 34 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/breath-d4.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/B-est-t60.jpg`: take `B-est-t60`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-terrace-2.jpg`: real photograph, "Great Fountain Geyser terraces at sunset (30766842144).jpg" by Yellowstone National Park, Public domain, https://commons.wikimedia.org/wiki/File:Great_Fountain_Geyser_terraces_at_sunset_(30766842144).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Looking down the shaft: cartilage hoops, a slab fallen across them, vapour filling it, shelf and waders beyond.
- Known faults: The depth of the shaft is hidden by the vapour; the plume at left is soft and large.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `breath-d4`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 20 mm lens from a camera held out over the lip of the large shaft in Image 1, looking down into it. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The inside of the airway, forty metres across, dropping straight down. Its wall carries the ruined cartilage hoops of Image 1, one below another: thick rounded bands of ivory cartilage as tall as a house, cracked, pitted and flaking, stained tea-brown and green-black where water runs. The top one survives only as two arcs with bare rock between them; the second sags, with the fallen block the size of a truck lying on the third; below the third they go on down, dimmer and dimmer, into blackness with no bottom. Cold white vapour wells up the middle of the shaft toward the lens and spills over the low side of the lip. Low sun lights the top of the far wall and everything below is in shadow. At one edge of the frame wine-red gill-plumes hang inward over the lip, and water drips from them.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. At the top of the frame: the lip, the pale shelf and the tide channel beyond it, and the gold fog.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

### The Blood Marsh (place 4 of 6)

- The place: Salt flats under a white overcast, with no wind and rain hanging far off. The old blood still seeps up: pools and branching channels of red brine with white salt rims. The main channel, the vein, is about ten metres wide. The largest seep pool steams and bubbles. An escarpment stands six kilometres on.
- What lives there: Stalk colonies: salt-crusted stalks with crimson fans, growing round the seep pools, with small winged insects round them. Mud-wallowers: heavy eyeless animals with tusk-like feelers, rooting in the channels.
- How it kills you: Between the channels a thin salt crust lies over deep mud, and the mud holds what steps on it. The dead are still there, crusted with salt, and one is still alive. The wallowers keep to the channels.
- The camera route: From a low rock rise to the bubbling seep pool (1), round it to the stalk colony (2), along the bank to the mud-wallowers (3), out onto the thin crust to the one that is stuck (4), then away along the vein.
- What moves, for the build: Gas domes rising and bursting, rings spreading on the pools, steam, insects, wallowers rooting, fans dripping, the rain curtain far off.
- Layout sketch: `step-2-full-set/4-marsh/marsh-layout.png`. Scale bar 50 m.
- Contact sheet: `step-2-full-set/4-marsh/marsh-contact-sheet.jpg`

#### The Blood Marsh: establishing view

- Kept image: `step-2-full-set/4-marsh/marsh-0-establishing.jpg` (take `marsh-est-t3`, generated 02:07 UTC, 34 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/marsh-est.txt`, full text below
- References passed to the generator, in order:
  1. `working/real/plate-porcelain-1.jpg`: real photograph, "Thermal features in Porcelain Basin at Norris Geyser Basin (28326319329).jpg" by Yellowstone National Park, Public domain, https://commons.wikimedia.org/wiki/File:Thermal_features_in_Porcelain_Basin_at_Norris_Geyser_Basin_(28326319329).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Vein channel as the route, bubbling seep pool with steam, stalk colonies, wallowers, and the salt-crusted dead with one still alive on the thin crust, under flat white overcast with a rain curtain.
- Known faults: Gas domes in the pool look a little like smooth eggs; stalk fans resemble red palm fronds; far flats repeat small clusters.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `marsh-est`:

```text
One reference image is supplied: a real photograph. Use it only as the standard for how the new picture is rendered: how a real camera records light, haze, exposure and colour; soft highlights; detail that softens with distance; large plain, unremarkable surfaces. Do not copy its subject, its layout or anything in it.

Make a new 16:9 photograph: one frame from a big-budget natural-history film about an alien world, shot on location with a large-format cinema camera and a 28 mm lens. It must be indistinguishable from real location photography.

THE PLACE. A vast salt marsh in a lowland basin under a white overcast sky, late morning, windless, hot and humid, with a rain shower hanging in the distance. This is where a creature the size of a mountain range bled out when it died ages ago, and the old blood still seeps up through the ground as iron-red brine. Seen from a low rise of pale rock about fifteen metres above the flats. From the bottom of the frame a channel of opaque dark oxblood-red water ten metres wide winds away across the marsh: the route. It branches like a vein into smaller and smaller creeks that lose themselves in the flats. Between the creeks lie pans of white and dirty-white salt crust, cracked into irregular plates with raised ridges, grey and wet where the crust is thin, with dull crimson and rust-coloured slime along every waterline. Scattered across the flats at different distances are round seep pools from three to thirty metres across, darker and redder than the channel, each with a raised white rim of salt like a low crater. In the nearest one, forty metres away on the left, the water is domed and broken by slow fat gas bubbles and spreading rings, and a thin steam hangs over it. A few low rounded hummocks of pale rock stand out of the flats like islands, each with a skirt of rust-red. Far off the flats end at a long low pale escarpment, barely darker than the sky in the haze, and a grey curtain of rain hangs from the cloud in front of part of it.

LIFE. Stalk colonies: clusters of pale bone-coloured stalks, each as thick as an arm and two to four metres tall, standing in the shallows around the seep pools like dead reeds. Each stalk ends in a soft feathery crimson fan; some fans are open, some closed to a bud, some stalks are broken or leaning; the clusters are of very different sizes and the largest rings the nearest bubbling pool. Mud-wallowers: heavy, low, hairless animals the size of a hippopotamus, with pale grey wrinkled skin stained rust-red up to the waterline, a broad flat body, no eyes, and a wide mouth fringed with short feelers. A scatter of nine lie in and beside the main channel in the middle distance: some half under water, one walking along the bank, two small young ones close to an adult. They keep to the red water and the firm banks. One did not: thirty metres from the viewer on the right, out on the thin grey crust away from the channel, one is sunk to its shoulders in the mud with its head raised, and around it stand the white salt-crusted shapes of four others that sank there before it, in different stages, the oldest only a mound of crystals. A loose flock of small pale flying animals crosses low over the far flats.

LIGHT. Flat white overcast: no sun and no cast shadows, only soft contact shadows under things. The sky is a bright blank white-grey; the red water mirrors it as a pale sheen where you look along it and is deep oxblood where you look down into it. Haze thickens with distance. Colours: white, dirty grey, oxblood, crimson, rust. Nothing green and nothing blue.

WHAT MAKES IT REAL. One light source and one weather, consistent everywhere. Most of the frame is plain and unremarkable. Surfaces have no repeating pattern, no scales, no crackle and no carved detail. Nothing is evenly spaced and nothing is repeated; every object differs in size, shape and state, and some are broken, half hidden or cut off by the edge of the frame. Animals are small in the frame, in different poses and facing different ways, some partly hidden; none is posed side-on for the camera. Far things are paler, softer and lower in contrast than near things. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

The land plainly continues beyond every edge of the frame. No people, no buildings, paths or railings, no equipment, no text, no watermark, no border.
```

#### The Blood Marsh: detail 1, the bubbling seep pool

- Kept image: `step-2-full-set/4-marsh/marsh-1-the-bubbling-seep-pool.jpg` (take `marsh-d1-t1`, generated 02:18 UTC, 39 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/marsh-d1.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/marsh-est-t3.jpg`: take `marsh-est-t3`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-porcelain-1.jpg`: real photograph, "Thermal features in Porcelain Basin at Norris Geyser Basin (28326319329).jpg" by Yellowstone National Park, Public domain, https://commons.wikimedia.org/wiki/File:Thermal_features_in_Porcelain_Basin_at_Norris_Geyser_Basin_(28326319329).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: A dome of gas about to break, a burst beside it, the salt rim in front, stalks and a wallower behind.
- Known faults: The dome is very clean, close to glass.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `marsh-d1`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 100 mm lens from a camera set just above the salt rim of the bubbling seep pool on the left of Image 1, looking across the pool. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The surface of the pool, two to five metres from the lens: thick, opaque, oxblood-red water. Gas is coming up through it. One bubble has just swelled into a dome the size of a football, stretched thin and glossy, about to break. Another has just burst, leaving a ragged crown and a few drops in the air. Small ones cluster in foam near the edge, and slow rings spread and cross. The water is not smooth like paint: it carries scum, skins, threads of darker red, floating flecks of salt and dead insects. In the foreground is the rim: a raised crust of dirty-white salt in knobs and frills, wet, stained pink and rust at the waterline, with a film of crimson slime. Thin steam drifts over the surface.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The pale stalks standing in the shallows on the far side of the pool with their crimson fans; one mud-wallower as a grey shape; the white flats and the blank white sky.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

#### The Blood Marsh: detail 2, the stalk colony

- Kept image: `step-2-full-set/4-marsh/marsh-2-the-stalk-colony.jpg` (take `marsh-d2-t1`, generated 02:18 UTC, 33 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/marsh-d2.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/marsh-est-t3.jpg`: take `marsh-est-t3`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-porcelain-1.jpg`: real photograph, "Thermal features in Porcelain Basin at Norris Geyser Basin (28326319329).jpg" by Yellowstone National Park, Public domain, https://commons.wikimedia.org/wiki/File:Thermal_features_in_Porcelain_Basin_at_Norris_Geyser_Basin_(28326319329).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Salt-crusted stalks with crimson fans dripping, small winged insects round them, one stalk cut off dead, a wallower and a seep mound behind.
- Known faults: Reads a little like a palm from far off.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `marsh-d2`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 200 mm lens from a camera at head height among the stalk colony that rings the seep pool in Image 1. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The tops of five stalks at different distances. Each stalk is bone-coloured, as thick as an arm, ringed and scarred like the tube of a giant tube worm, crusted with salt, and some lean. At the top of the nearest the feeding fan is fully open: a soft plume of crimson filaments like the gills of a feather-duster worm, wet, clumped in places, with some filaments torn or bleached at the tips; small pale flying insects are caught in it and others hover round it. The fan of the next stalk is half drawn back into its tube. Another is closed to a dark red bud. One stalk is broken off and empty, with a dark hole at the top.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The steaming red pool; the white salt flats; one mud-wallower; the low rock hummock; the blank white sky and the far curtain of rain.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

#### The Blood Marsh: detail 3, mud-wallowers

- Kept image: `step-2-full-set/4-marsh/marsh-3-mud-wallowers.jpg` (take `marsh-d3-t2`, generated 02:18 UTC, 35 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/marsh-d3.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/marsh-est-t3.jpg`: take `marsh-est-t3`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/ref-hide-2.jpg`: real photograph, "Adult Walrus Resting on Shore.jpg" by Ryan Kingsbery, Public domain, https://commons.wikimedia.org/wiki/File:Adult_Walrus_Resting_on_Shore.jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: An adult and a calf rooting with tusk-like feelers, one more submerged, red water to the belly, no eyes.
- Known faults: Close to a walrus crossed with a tardigrade: the least alien animal in the set.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `marsh-d3`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light and exposure, and how the skin of a real animal looks. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 400 mm lens from the low rock rise of Image 1, looking down the red channel at the mud-wallowers. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The large mud-wallower of Image 1 standing at the edge of the channel with two young beside it. It is a heavy low animal the size of a hippopotamus with a broad flat body, short thick legs, no eyes and no ears, and a wide blunt mouth fringed with short thick feelers that are working the mud. Its skin is grey, deeply creased and scarred, flaking with dried salt along the back, wet and stained rust-red up to the waterline, with mud caked on the legs. Red water runs off its belly. One of the young is half under water with only its back and feelers showing; the other is climbing the bank. In the channel behind them the back of another adult breaks the surface like a boulder.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. Stalks with crimson fans; the white and grey salt flats; haze and the blank white sky.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

#### The Blood Marsh: detail 4, the one on the thin crust

- Kept image: `step-2-full-set/4-marsh/marsh-4-the-one-on-the-thin-crust.jpg` (take `marsh-d4-t2`, generated 02:18 UTC, 36 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/marsh-d4.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/marsh-est-t3.jpg`: take `marsh-est-t3`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/ref-hide-2.jpg`: real photograph, "Adult Walrus Resting on Shore.jpg" by Ryan Kingsbery, Public domain, https://commons.wikimedia.org/wiki/File:Adult_Walrus_Resting_on_Shore.jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: One alive and sunk to the shoulders in grey mud through broken crust, two salt-crusted dead beside it, the living herd in the channel behind. Take 2 kept because take 1 gave the animal an eye.
- Known faults: The front-left salt mound is out of focus and large in the frame.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `marsh-d4`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light and exposure, and how the skin of a real animal looks. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 85 mm lens from a low camera on firm ground at the edge of the thin grey crust on the right of Image 1. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The mud-wallower of Image 1 that left the channel: sunk to its shoulders in grey mud under a broken crust of salt, alive, its blunt eyeless head raised, the feelers round its mouth spread, mud drying pale on its creased back. The crust around it has cracked into plates that tilt into the wet mud, and red brine wells up in the cracks. Around it, at different distances, are the ones that sank here before: shapes of the same animal completely coated in white salt crystals, like figures covered in hoar frost. One shows only its back and head above the surface, one has fallen in on itself and shows dark bone, and the oldest is only a white mound. Flies hang over them.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The red channel with living mud-wallowers in it; stalk colonies with crimson fans; the far curtain of rain under the white sky.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

### The Spine (place 5 of 6)

- The place: A knife ridge of vertebrae above a sea of cloud, at dusk, with a storm standing against one side of it and a gale blowing across. Each vertebra is a mountain with a leaning spire, and the tip of every spire is burned black. A canal runs through the whole ridge from one vertebra to the next. The cloud sea lies about two thousand metres below.
- What lives there: Tether-kites: translucent ribbons that stream downwind from stalks anchored on the lee face of each spire. Ridge-runners: shaggy animals with tendrils for a face, which cross the snow saddles and shelter inside the canal.
- How it kills you: The lightning walks the ridge from spire to spire. Whatever is on the crest when it comes is where it comes to ground.
- The camera route: From the snow saddle to the scorched ridge-runner where a bolt came to ground (1), up to the tether-kites on the first spire (2), a long-lens look from there at the strike on the third spire (3), then down and into the canal through the ridge, where the herd is sheltering (4).
- What moves, for the build: Storm cloud pouring over the low saddles, lightning, spindrift and hail, kites streaming, the cloud sea drifting, the herd shifting.
- Layout sketch: `step-2-full-set/5-spine/spine-layout.png`. Scale bar 500 m. The spires stand about 800 m apart.
- Contact sheet: `step-2-full-set/5-spine/spine-contact-sheet.jpg`

#### The Spine: establishing view

- Kept image: `step-2-full-set/5-spine/spine-0-establishing.jpg` (take `spine-est-t2`, generated 02:08 UTC, 36 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/spine-est.txt`, full text below
- References passed to the generator, in order:
  1. `working/real/plate-ridge-1.jpg`: real photograph, "Alpine Ridge, Denali National Park, Alaska LCCN2010630304.tif" by Carol M. Highsmith, Public domain, https://commons.wikimedia.org/wiki/File:Alpine_Ridge,_Denali_National_Park,_Alaska_LCCN2010630304.tif . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
  2. `working/real/plate-storm-1.jpg`: real photograph, "Grand Canyon National Park — Summer Thunderstorm 70367 (51441851059).jpg" by Grand Canyon NPS, Public domain, https://commons.wikimedia.org/wiki/File:Grand_Canyon_National_Park_%E2%80%94_Summer_Thunderstorm_70367_(51441851059).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Blade spire with burned tip and streaming tether-kites, tracks leading to the canal mouth, the ridge of spires receding with a strike on the third, cloud sea and one line of orange.
- Known faults: The most dramatic and so the closest to a poster; lightning a touch too violet and clean; far spires small.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `spine-est`:

```text
Two reference images are supplied, both real photographs. Use them only as the standard for how the new picture is rendered: image 1 for how a real camera records a snow ridge above cloud (exposure of snow, rime and rock, haze, softness with distance); image 2 for how a real camera records lightning and storm cloud at dusk. Do not copy their subjects, their layouts or anything in them.

Make a new 16:9 photograph: one frame from a big-budget natural-history film about an alien world, shot on location with a large-format cinema camera and a 28 mm lens. It must be indistinguishable from real location photography.

THE PLACE. A knife-edged mountain ridge five thousand metres up, above a sea of cloud, at dusk, with a thunderstorm standing against it. The ridge is the spine of a creature the size of a mountain range that died ages ago: a single line of enormous vertebrae, each one a mountain of pale rock, receding into the distance in a slow curve. Each rises to a tall leaning blade-shaped spire three to six hundred metres high and throws out a lower buttress to either side; between one and the next is a narrow saddle of snow. They are worn like real mountains: frost-shattered, ledged, seamed with gullies of old snow, plastered with rime ice on the windward side, with scree and cornices. No two are alike: one spire has snapped and lies as a field of blocks across a saddle, one is split down the middle, some lean. The top thirty metres of every spire is burned black and glassy where lightning has struck it again and again, with black streaks running down from it. Seen from the snow saddle between two vertebrae, standing on the crest. From the bottom of the frame a narrow crest of wind-packed snow and bare rock leads forward to the foot of the next spire and round it: the route. Beside the route a dark ragged tunnel mouth opens in the base of that vertebra: the canal that runs through the whole ridge. On the left is the storm: a wall of dark blue-violet cloud as high as the frame, its base level with the ridge, hail falling from it in grey curtains, cloud pouring over the lower saddles like slow water. On the right, far below, the cloud sea stretches flat to a band of clear sky at the horizon where the last light is one thin line of orange.

LIFE. Tether-kites: from the upper part of each of the nearer spires stream dozens of long flat translucent ribbon-shaped animals, each ten to forty metres long and a hand to a metre wide, pale as fish skin with a faint violet sheen, each anchored by a thin dark stalk to a holdfast in a crack and flying out horizontally in the gale like kelp in a current, rippling. They feed on the charge of the storm. The colonies are of very different sizes; some ribbons are tattered, and two have torn loose and are tumbling away downwind. On the third spire along, the ribbons glow dim violet-blue along their edges, and one thin branched violet-white bolt of lightning joins the black tip of that spire to the cloud, lighting the snow, the rime and the cloud around it from inside. A fainter flicker lights the inside of the cloud farther off. In the snow of the near saddle a single line of animal tracks crosses the route toward the tunnel mouth.

LIGHT. Dusk: cold blue ambient light from the sky, a little warm light from the orange band at the horizon on the right-hand faces of the spires, and the violet-white flash on the third spire. No sun disc. Spindrift blows off the crests. The far spires fade into cloud. Colours: blue-grey rock, white snow and rime, dark violet cloud, violet-white lightning, one thin line of orange.

WHAT MAKES IT REAL. One light source and one weather, consistent everywhere. Most of the frame is plain and unremarkable. Surfaces have no repeating pattern, no scales, no crackle and no carved detail. Nothing is evenly spaced and nothing is repeated; every object differs in size, shape and state, and some are broken, half hidden or cut off by the edge of the frame. Animals are small in the frame, in different poses and facing different ways, some partly hidden; none is posed side-on for the camera. Far things are paler, softer and lower in contrast than near things. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

The land plainly continues beyond every edge of the frame. No people, no buildings, paths or railings, no equipment, no text, no watermark, no border.
```

#### The Spine: detail 1, where lightning came to ground

- Kept image: `step-2-full-set/5-spine/spine-1-where-lightning-came-to-ground.jpg` (take `spine-d4-t2`, generated 02:18 UTC, 34 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/spine-d4.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/spine-est-t2.jpg`: take `spine-est-t2`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-ridge-1.jpg`: real photograph, "Alpine Ridge, Denali National Park, Alaska LCCN2010630304.tif" by Carol M. Highsmith, Public domain, https://commons.wikimedia.org/wiki/File:Alpine_Ridge,_Denali_National_Park,_Alaska_LCCN2010630304.tif . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: A ridge-runner dead on the snow, rimed, a burn down its flank, bare scorched rock under it; the first spire with the tunnel mouth and tracks behind, lightning beyond.
- Known faults: The ice slab at bottom right is soft and large.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `spine-d4`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records snow, rime and rock in mountain light. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 50 mm lens from a low camera on the snow saddle of Image 1, at the foot of the nearest spire. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. Where lightning has come to ground. A patch of bare rock in the snow is burned black and glassy, with a branching pattern of fused channels spreading from it like roots. The snow has melted back from it in a ring and refrozen as clear ice. Lying across it is the body of a ridge-runner that was caught in the open: an animal the size of a goat with a coat of coarse white bristles, four short legs with hooked claws, no eyes, and a short neck ending in a tuft of dark tendrils. It lies on its side; the coat is singed off along one flank, the bristles burned to stubs and the skin split; it is already rimed over on the windward side and half drifted in with snow. Its tracks lead to this point and stop. Spindrift streams over it.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The spire above with its black top and its streaming ribbons; the dark tunnel mouth; the storm cloud; the cloud sea and the thin orange line at the horizon.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

#### The Spine: detail 2, tether-kites on the first spire

- Kept image: `step-2-full-set/5-spine/spine-2-tether-kites-on-the-first-spire.jpg` (take `spine-d1-t2`, generated 02:18 UTC, 32 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/spine-d1.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/spine-est-t2.jpg`: take `spine-est-t2`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-ridge-1.jpg`: real photograph, "Alpine Ridge, Denali National Park, Alaska LCCN2010630304.tif" by Carol M. Highsmith, Public domain, https://commons.wikimedia.org/wiki/File:Alpine_Ridge,_Denali_National_Park,_Alaska_LCCN2010630304.tif . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Translucent ribbons streaming from stalks anchored in cone-like holdfasts on the lee face, rime on the windward face, far spires.
- Known faults: The largest ribbon is close to a torn plastic sheet.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `spine-d1`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records snow, rime and rock in mountain light. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 300 mm lens from the snow crest in Image 1, looking up at the upper part of the nearest spire. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The holdfasts of the tether-kites on the windward edge of the spire. In cracks in the pale rock, just below where it is burned black, sit clusters of dark leathery knobs like the holdfasts of kelp, crusted with rime ice. From each a thin dark stalk runs out a few metres and widens into a long flat translucent ribbon, pale as fish skin with a faint violet sheen and fine veins, which streams out horizontally in the gale, rippling, its edges frayed. A dozen ribbons at different distances overlap; one is torn half through and one is knotted round another. Beads of ice hang along the stalks and spindrift blows through them. The rock is frost-shattered and plastered with feathers of rime on its windward side; above, the burned top is black, glassy and cracked.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. Dark blue-violet storm cloud; the next spires along the ridge; a violet flash far off; the cloud sea below.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

#### The Spine: detail 3, the strike on the third spire

- Kept image: `step-2-full-set/5-spine/spine-3-the-strike-on-the-third-spire.jpg` (take `spine-d2-t2`, generated 02:18 UTC, 34 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/spine-d2.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/spine-est-t2.jpg`: take `spine-est-t2`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-storm-1.jpg`: real photograph, "Grand Canyon National Park — Summer Thunderstorm 70367 (51441851059).jpg" by Grand Canyon NPS, Public domain, https://commons.wikimedia.org/wiki/File:Grand_Canyon_National_Park_%E2%80%94_Summer_Thunderstorm_70367_(51441851059).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: The bolt on the spire tip, sparks and steam, kites lit from inside, far spires and the orange horizon.
- Known faults: The left foreground rock is a large soft mass; the most poster-like frame of the details.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `spine-d2`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records lightning and storm cloud at dusk. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 600 mm lens from the snow crest in Image 1, looking along the ridge at the third spire. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The black burned tip of the third spire of Image 1 at the instant lightning strikes it: one thin crooked violet-white channel from the cloud to the rock, with fine side branches. At the point of contact there is a small white-hot spot, a spray of glowing fragments of rock, and a puff of steam where rime has flashed off. The ribbon-shaped tether-kites on this spire stand out stiffly in the wind, their edges glowing dim violet-blue, with small sparks at their tips. The snow, the rime and the cloud around the spire are lit by this one flash, with hard shadows; everything else is dusk-dark.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The wall of storm cloud lit from inside; farther spires as dark shapes; the thin orange line at the horizon above the cloud sea.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

#### The Spine: detail 4, inside the canal

- Kept image: `step-2-full-set/5-spine/spine-4-inside-the-canal.jpg` (take `spine-d3-t1`, generated 02:18 UTC, 34 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/spine-d3.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/spine-est-t2.jpg`: take `spine-est-t2`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-ridge-1.jpg`: real photograph, "Alpine Ridge, Denali National Park, Alaska LCCN2010630304.tif" by Carol M. Highsmith, Public domain, https://commons.wikimedia.org/wiki/File:Alpine_Ridge,_Denali_National_Park,_Alaska_LCCN2010630304.tif . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: The herd packed against the wall inside the canal, one standing at the mouth, ice on the roof, kites and the next spire outside.
- Known faults: The animals are close to shaggy dogs with tendril faces; the ice floor is very clean.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `spine-d3`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records snow, ice and rock in mountain light. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 20 mm lens from a camera inside the tunnel mouth of Image 1, a few metres in, looking back out through the mouth. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The inside of the canal that runs through the ridge: a natural tunnel eight metres across through pale rock, its walls rounded and wind-polished like the inside of a bone, with bands of harder rock standing out, clear ice glazing the floor, drifts of snow blown in, and icicles at the mouth bent sideways by the wind. Huddled along one wall, out of the wind, are five ridge-runners, the animals whose tracks cross the snow in Image 1: compact animals the size of a goat with a thick coat of coarse white bristles rimed with ice, four short strong legs with hooked climbing claws, no eyes, and a short neck ending in a tuft of dark tendrils held tucked against the chest. They press together; one is lying down; one stands at the mouth, lit violet by a flash outside. The rest are in cold blue shadow.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. Seen through the tunnel mouth: the snow crest with their tracks, the next spire with its streaming ribbons, dark storm cloud and blowing spindrift.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

### The Eye (place 6 of 6)

- The place: A round lake two kilometres across in a socket of cliffs two hundred metres high, on a clear, still evening. A ring of amber shallows, knee-deep and clear, surrounds a centre that goes all the way down: a shaft with sheer walls and no bottom in sight. On one side a brow of cliff overhangs the water. A stream leaves through a gap in the rim.
- What lives there: Drinkers: pale, eyeless, long-necked animals that come down to the shore in a herd and never go deeper than their ankles. Amber filament mats on the floor of the shallows, all combed toward the centre. Pale forms hanging in the deep.
- How it kills you: The shallows are safe to the ankle. The floor stops without warning at the edge of the deep, and something lives in the centre.
- The camera route: From the gap to the drinkers at the shore (1), out over the amber mats (2), to the edge where the floor stops (3), on to the centre as something rises (4), then straight up into the pull-back to orbit.
- What moves, for the build: Rings spreading on the water, filaments swaying toward the centre, threads of bubbles, mist at the foot of the cliffs, drinkers, the water doming at the centre.
- Layout sketch: `step-2-full-set/6-eye/eye-layout.png`. Scale bar 500 m. The lake is about 2 km across.
- Contact sheet: `step-2-full-set/6-eye/eye-contact-sheet.jpg`

#### The Eye: establishing view

- Kept image: `step-2-full-set/6-eye/eye-0-establishing.jpg` (take `eye-est-t1`, generated 02:07 UTC, 30 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/eye-est.txt`, full text below
- References passed to the generator, in order:
  1. `working/real/plate-crater-1.jpg`: real photograph, "Aerial Crater Lake (cropped).jpg" by Mike Doukas, USGS derivative work: User:Maps and stuff (cropped to 3:2 ratio; increased brightness in dark areas; color balanced; saved as a high quality JPG), Public domain, https://commons.wikimedia.org/wiki/File:Aerial_Crater_Lake_(cropped).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Round lake with amber radial shallows and a black centre carrying one set of rings, the brow overhang on the right, the herd at the near shore, the outflow at the bottom.
- Known faults: Herd animals are small and a little alike; the shallows-to-deep edge is softer on the left; outflow stream is cut by the frame.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `eye-est`:

```text
One reference image is supplied: a real photograph. Use it only as the standard for how the new picture is rendered: how a real camera records light, haze, exposure and colour; soft highlights; detail that softens with distance; large plain, unremarkable surfaces. Do not copy its subject, its layout or anything in it.

Make a new 16:9 photograph: one frame from a big-budget natural-history film about an alien world, shot on location with a large-format cinema camera and a 28 mm lens. It must be indistinguishable from real location photography.

THE PLACE. A perfectly still lake inside a ring of cliffs at the end of a clear evening, half an hour before sunset. It is the eye socket of a creature the size of a mountain range that died ages ago. Seen from the top of a scree slope just inside the one gap in the cliffs, about forty metres above the water, looking across the whole lake. The lake is two kilometres across and very nearly round. Its outer part is a broad ring of shallows over pale stone, knee-deep and clear, coloured amber, honey and rust by mats of fine filaments that all lie in lines radiating from the centre of the lake, like the lines in an iris, broken by pale bare patches and a few darker channels. Then, at a sharp, almost circular edge, the shallows stop and the water goes black-blue: the centre of the lake is a shaft several hundred metres across with sheer underwater walls that goes straight down out of sight. Nothing grows over it and it reflects only the sky. The cliffs around the lake are pale weathered rock two hundred metres high, in thick rounded ledges, with dark water streaks, scree aprons and a few caves. On the right they lean out over the water in one long overhanging brow that keeps that shore in shadow. From the bottom of the frame the outflow stream leaves the lake toward the viewer over a sill of pale rock, and a strip of dry pale gravel runs down the scree beside it to the near shore: the route. A thin mist lies on the water at the foot of the far cliffs.

LIFE. Drinkers: slender pale long-legged animals the size of a deer, hairless, with no eyes and a long soft snout. A herd of about thirty has come down to the near shore to drink at the edge of the shallows, strung out unevenly: some with snouts in the water, some standing alert, a few lying on the gravel, two small young ones. None of them goes in deeper than its ankles. Far out, the surface over the black centre is not quite still: one wide slow set of rings is spreading from the middle of the black water, with nothing visible to cause it. Three animals at the back of the herd have lifted their heads toward it.

LIGHT. Clear sky, low sun out of frame behind the cliffs on the left; no sun disc. The far cliffs and the far half of the shallows are in warm low sunlight; the near shore and the right-hand shore under the brow are in cool open shadow. The sky grades from pale gold near the cliffs to clear pale blue above, with no clouds except one thin streak. The shallows glow amber where the sun reaches them; the black centre mirrors the sky and the far cliffs. Colours: ivory and pale grey rock, amber and honey shallows, black-blue deep water, pale gold light.

WHAT MAKES IT REAL. One light source and one weather, consistent everywhere. Most of the frame is plain and unremarkable. Surfaces have no repeating pattern, no scales, no crackle and no carved detail. Nothing is evenly spaced and nothing is repeated; every object differs in size, shape and state, and some are broken, half hidden or cut off by the edge of the frame. Animals are small in the frame, in different poses and facing different ways, some partly hidden; none is posed side-on for the camera. Far things are paler, softer and lower in contrast than near things. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

The land plainly continues beyond every edge of the frame. No people, no buildings, paths or railings, no equipment, no text, no watermark, no border.
```

#### The Eye: detail 1, drinkers at the shore

- Kept image: `step-2-full-set/6-eye/eye-1-drinkers-at-the-shore.jpg` (take `eye-d1-t1`, generated 02:18 UTC, 32 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/eye-d1.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/eye-est-t1.jpg`: take `eye-est-t1`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/ref-dusk-1.jpg`: real photograph, "Bison at Dusk in Yellowstone National Park. NPS-Gwen Gerber (18686265711).jpg" by NPS Natural Resources, Public domain, https://commons.wikimedia.org/wiki/File:Bison_at_Dusk_in_Yellowstone_National_Park._NPS-Gwen_Gerber_(18686265711).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Adults and a calf drinking at the shore, eyeless tapering heads, rings spreading, far cliffs.
- Known faults: Anatomy is close to a camelid; the right-hand animal is cut by the frame and soft.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `eye-d1`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light and exposure, and how the skin of a real animal looks. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 400 mm lens from a camera low on the gravel of the near shore in Image 1, looking along the waterline. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. Four of the drinkers of Image 1 at different distances, so that only the second is fully sharp. Each is a slender long-legged animal the size of a deer, hairless, with pale skin that is creased at the joints, scarred, dusty and darker along the spine. They have no eyes at all: where eyes would be the skin is unbroken. Each has a long soft flexible snout. Two have their snouts in the amber water, drinking, with rings spreading from them. One stands with its head up and turned toward the middle of the lake, its snout lifted and still. A young one stands between the legs of an adult. Their feet are in a few centimetres of water over amber filaments, and their reflections break in the rings.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The amber shallows with their lines all pointing to the centre; the black-blue centre of the lake with one slow set of rings on it; the far cliffs in warm low sunlight with mist at their feet.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

#### The Eye: detail 2, the iris: amber mats

- Kept image: `step-2-full-set/6-eye/eye-2-the-iris-amber-mats.jpg` (take `eye-d2b-t2`, generated 02:25 UTC, 37 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/eye-d2b.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/eye-est-t1.jpg`: take `eye-est-t1`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-terrace-2.jpg`: real photograph, "Great Fountain Geyser terraces at sunset (30766842144).jpg" by Yellowstone National Park, Public domain, https://commons.wikimedia.org/wiki/File:Great_Fountain_Geyser_terraces_at_sunset_(30766842144).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Changed-approach redo. Amber filaments under clear water, threads of small bubbles, a full-size drinker at mid-distance so the lake reads at real scale.
- Known faults: The drinker here is heavier and more horse-like than in detail 1. First attempt (eye-d2-t1, t2) dropped: thumb-sized grazers read as miniature lambs.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `eye-d2b`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 100 mm lens from a camera just above the water in the shallows of Image 1, twenty metres out from the near shore, looking toward the centre of the lake. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The floor of the shallows seen through thirty centimetres of perfectly clear water: mats of fine filaments, amber, honey and rust, each strand as fine as hair and several metres long, all combed in one direction, toward the centre of the lake, like hair in a slow current. Threads of bubbles no bigger than peas rise out of them. There are bare patches of pale stone and one darker channel. There are no animals on the mats. Nearest the lens the surface is transparent and you look down through it; farther off it turns to a mirror of the sky.

FOR SCALE, SLIGHTLY SOFT. Fifteen metres off, at the left third of the frame, one adult drinker from Image 1 stands knee-deep among the filaments with its head down to the water. It is the size of a horse and small in the frame, and the filaments around its legs are longer than it is. Two more stand much farther off along the shallows.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The sharp line where the amber stops and the black-blue water begins; the slow rings on the black water; the far cliffs in warm low sunlight with mist at their feet.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

#### The Eye: detail 3, the edge, where the floor stops

- Kept image: `step-2-full-set/6-eye/eye-3-the-edge-where-the-floor-stops.jpg` (take `eye-d3-t2`, generated 02:18 UTC, 35 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/eye-d3.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/eye-est-t1.jpg`: take `eye-est-t1`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-crater-1.jpg`: real photograph, "Aerial Crater Lake (cropped).jpg" by Mike Doukas, USGS derivative work: User:Maps and stuff (cropped to 3:2 ratio; increased brightness in dark areas; color balanced; saved as a high quality JPG), Public domain, https://commons.wikimedia.org/wiki/File:Aerial_Crater_Lake_(cropped).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: The shelf ends, a submerged cliff drops into blue-black, pale forms hang in the deep, a skeleton lies at the edge. Take 2 kept because take 1 puts a skull with an eye socket in front of eyeless animals.
- Known faults: The skeleton is small and its head is hard to read.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `eye-d3`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 35 mm lens from a camera three metres above the water at the outer edge of the shallows in Image 1, exactly where the amber shelf ends, looking down and forward toward the centre of the lake. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The edge. In the lower part of the frame the amber shelf is seen through clear shallow water: pale stone and amber filaments combed toward the centre. It ends in an irregular lip of pale rock fringed with filaments. Beyond the lip there is no bottom: a sheer underwater wall of pale rock drops straight down and the water goes from clear blue to blue-black to black within a few metres. Low sunlight slants a little way down the wall and fades. Far down, at the limit of sight, several long pale shapes hang upright in the dark, too dim to make out. On the lip itself, half over the drop, lie the pale bones of one drinker. The surface over the deep water is a still dark mirror, and one slow ring is arriving from the centre.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The black-blue centre of the lake; the far cliffs in warm low sunlight and their reflection; thin mist.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

#### The Eye: detail 4, what rises from the centre

- Kept image: `step-2-full-set/6-eye/eye-4-what-rises-from-the-centre.jpg` (take `eye-d4-t1`, generated 02:18 UTC, 30 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/eye-d4.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/eye-est-t1.jpg`: take `eye-est-t1`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-crater-1.jpg`: real photograph, "Aerial Crater Lake (cropped).jpg" by Mike Doukas, USGS derivative work: User:Maps and stuff (cropped to 3:2 ratio; increased brightness in dark areas; color balanced; saved as a high quality JPG), Public domain, https://commons.wikimedia.org/wiki/File:Aerial_Crater_Lake_(cropped).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: The water domes at the centre and thin pale spines break the surface in a ring; two drinkers watch.
- Known faults: What rises is only hinted at; these two drinkers have ear-like nubs the others lack.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `eye-d4`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 600 mm lens from the near shore of Image 1, looking across the black centre of the lake. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The middle of the black water. The surface there is swelling into a low smooth dome a hundred metres across, as if something very large were rising under it without breaking through. Slow rings run outward from it. Just under the surface around the dome, dozens of long pale shapes, each as long as a tree trunk, lie spread outward like spokes, dim and blurred by the water. Where one of them touches the surface a thin pale tip stands a metre into the air, wet. Thin mist lies on the water. In the foreground, out of focus, are the backs and raised heads of two drinkers at the shore, turned toward it.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The far cliffs with warm low sunlight on their tops, and their reflection broken by the rings.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

### The Reveal

- The shot: the camera rises straight up out of The Eye until the whole continent is in frame. An astronaut's view from about four hundred kilometres, oblique toward the horizon. The continent, about three thousand kilometres long, is the titan lying on its side.
- What reads as the body: the skull massif with the round lake where the eye was, a hooked jaw peninsula, the spine as a snow range running the length of the land, the ribs as curved ridges that end in capes, the caldera with its fume plume (The Heart), the steaming pale shelf beside it (The Breath), the red river system and its delta (The Blood Marsh), and an arm ending in five spits.
- What makes it read at real scale: the curved limb and the thin line of atmosphere, sunglint on the sea, fields of small cumulus with their own shadows, lee-wave cloud off the range, a frontal band across the ribs, one cyclone over the open sea.
- Contact sheet: `step-2-full-set/7-reveal/reveal-contact-sheet.jpg`. Its lower half marks where the six places sit on the body; those positions were read off the picture and are approximate.

#### The Reveal: the continent from orbit

- Kept image: `step-2-full-set/7-reveal/reveal-from-orbit.jpg` (take `reveal-est-t3`, generated 02:07 UTC, 34 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/reveal-est.txt`, full text below
- References passed to the generator, in order:
  1. `working/real/plate-orbit-2.jpg`: real photograph, "ISS-40 Panoramic Image of South Africa.jpg" by NASA, Public domain, https://commons.wikimedia.org/wiki/File:ISS-40_Panoramic_Image_of_South_Africa.jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Reads as an astronaut photograph at real scale: limb, cloud fields with shadows, a cyclone, sunglint; skull with the eye lake, spine range, ribs as curved ridges and capes, the red delta, the caldera plume, the arm.
- Known faults: Skull and hand are very literal; ribs partly lost under cloud on the right; pelvis and legs fade into haze and barely read.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `reveal-est`:

```text
One reference image is supplied: a real photograph taken by an astronaut from low orbit. Use it only as the standard for how the new picture is rendered: how a real camera in orbit records a planet: the thin blue line of atmosphere on the curved horizon, the black of space, haze that thickens toward the horizon, the scale and texture of real cloud fields and their shadows, sunglint on the sea. Do not copy its landmass, its coastline, its layout or anything in it.

Make a new 16:9 photograph: a real astronaut photograph of an alien ocean world, taken from four hundred kilometres up with a wide lens, looking obliquely toward the horizon. It must be indistinguishable from a real photograph taken from orbit, and the land in it must read at its true scale: thousands of kilometres.

THE SUBJECT. One island continent, three thousand kilometres long, lies in a dark blue-black ocean and runs away from the viewer from the lower left toward the horizon at the upper right. Its landforms are the skeleton of a single gigantic creature lying on its side, half sunk in the sea and worn down by ages of weather, so that it reads first as real geology and a moment later, unmistakably, as a body. Nearest the viewer, at the lower left, is the skull: a broad rounded massif of pale rock with one perfectly round dark lake in a ring of pale cliffs where the eye was, a hooked peninsula for the lower jaw, and pale shallows around its shores. From the skull a long pale mountain range, the spine, runs the whole length of the continent in a slow curve: a knife-edged chain of evenly jointed peaks, snow on the highest, each throwing a long shadow. From the middle of the spine a series of about twelve long narrow curved ridges sweeps out and round to one side and runs into the sea as a row of curving capes with deep dark bays between them: the ribs. The outer ends of the capes break up into chains of pale islands and sea stacks with white surf lines. Inside the curve of the ribs lies a dark lowland basin; in it one volcanic caldera gives off a brown plume of fume that trails downwind for two hundred kilometres, with a small ember-orange glow at its source. Beside it a pale flat shelf steams with thin white vapour. Between the ribs and the spine a low flat country of white salt and rust-red is drained by a branching dark red river system whose delta stains the sea red-brown. Beyond the ribs the spine passes through a ring-shaped basin of highlands, the pelvis, and two long thin peninsulas, the legs, trail away into the haze near the horizon. One long peninsula jointed like an arm reaches out from below the skull and ends in five thin spits. The bare rock is ivory and pale grey; the lowlands are dark; nothing is green.

SCALE AND WEATHER. Real weather lies over all of it and proves its size: a field of small cumulus clouds casting tiny separate shadows on the lowlands; a long band of frontal cloud lying across the ribs and hiding parts of three of them; lee-wave cloud streaming off the spine; fog filling some of the bays; one large comma-shaped storm system over the open ocean to the right. On the left the sea is silver with sunglint, with wind streaks and island wakes showing in it. Shallow water round the coast is paler; rivers push fans of sediment into the sea. The coast is ragged with thousands of small bays and islets. Every bone is a mountain range with valleys, ridges, scree, rivers and snow, slightly irregular, eroded and broken, with parts under water or under cloud. Nothing is outlined and nothing is drawn like a diagram.

LIGHT. Low sun from the left, late afternoon on the ground: long relief shadows from the spine and the rib ridges, warm light on the cloud tops. Toward the upper right the land goes blue and pale with haze and dissolves into the bright curved horizon. Above the horizon a thin band of blue atmosphere, then black space with no stars visible. Natural exposure, soft contrast, fine grain, the slight softness of a photograph taken through a spacecraft window.

No spacecraft parts in frame, no text, no labels, no grid, no border, no watermark.
```

## Part two: step 1, three art directions for The Breath

Nine pictures: three art directions for The Breath, each one establishing view and two detail views of the same location, as shown at the end of step 1. The establishing view of B is the one used in the full set. The two B details shown here are the step 1 versions (`B-d1-t32`, `B-d2-t20`); the full set uses their one-step revisions.

- Method for the kept establishing views: a fresh generation with two references that have separate jobs. Image 1 is a public-domain real photograph, supplied only as the standard for how a camera records light. Image 2, where used, is a small blurred copy of an earlier take of my own, supplied only for where things are.
- Method for the kept details: a fresh generation from the establishing view ("the same place, at the same moment"), with the same real photograph again as the rendering standard.
- Two establishing views (A and C) were then revised once with a "re-shoot the same frame, change only these things" prompt. Earlier in the round, chains of such revisions grew a repeating texture, so revisions are limited to a single step.

### A. Overgrowth: establishing view

- Kept image: `step-1-kept/A-overgrowth-1-establishing.jpg` (take `A-est-t55`, generated 01:22 UTC, 40 s)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/A-est-edit6.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/A-est-t53.jpg`: a round 3 take of my own (A-est-t53)
  2. `working/takes/A-d2-t21.jpg`: a round 3 take of my own (A-d2-t21)
- Lineage: a single-step revision of `A-est-t53`, which was generated by `gpt_image_2_6_sunburst` from prompt `working/prompts/A-est-plate3.txt` (full text below) with these references:
  1. `working/real/plate-forest-1.jpg`: real photograph, "Hoh sunrise mist fog scenic j preston (17095320637).jpg", Olympic National Park, public domain, https://commons.wikimedia.org/wiki/File:Hoh_sunrise_mist_fog_scenic_j_preston_(17095320637).jpg . Supplied only as the standard for how a camera records light, haze and exposure; nothing in it was to be copied.
- Why kept: Reads as location photography of a cave you could walk into: river route, bones, herd, fallen ring and second skylight at four distances. Herd matches the detail view after one revision of A-est-t53.
- Known faults: Bone pile in the corner looks arranged; several animals share a head-down pose; the arch is too clean; herd about 1.4 times larger in frame than in t53; most Earth-like of the three.
- Critics: Blind packet 11 (this image): Sol 9 FILM, Opus 7 FILM, Carbon 4 PAINTING. Blind packet 10 scored its parent A-est-t53: 9 FILM, 7 FILM, 9 FILM.

Prompt `A-est-edit6`:

```text
Two images are supplied, with different jobs.
Image 1 is a frame from a big-budget natural-history film about an alien world. Re-shoot the same frame: the same location, the same camera position and lens, the same light and weather, the same composition and colours, and the same real location-photography look with true lens perspective and fine physical surface detail. Output a wide 16:9 landscape frame. Change only the things listed below; everything else stays exactly as in Image 1, and nothing new is added anywhere else.
Image 2 is a closer shot from the same film. Use it only to see what the animals of this herd really look like. Do not copy its framing, its background or anything else in it.

CHANGES.
1. The animals in Image 1 look too much like elephants. They are the animals of Image 2: heavy grazers with grey-brown wrinkled hide, a thick muscular neck about as long as their legs, and a blunt rounded head with no eyes, no ears, no trunk and no tusks, only a row of dark breathing slits along each side of the snout and a wide soft mouth. Each animal of Image 1 stays in its place, at its size, facing the way it faces now, but with this body. Not one of them has a trunk, tusks or ear flaps.
2. They are not alike. The one standing in the river facing the viewer has its neck lowered and its mouth in the water. One on the gravel holds its neck high. The one lying down has its neck laid along the ground. The calf is half hidden behind an adult. The two at the left are walking away into the ferns, seen from behind.
3. Where an animal stands in the river, the current breaks white around its legs and leaves a short wake downstream, its hide is dark and wet below the waterline, and it has a broken reflection.

It must still read as real location photography of a place you could walk into, not artwork: irregular, weathered, unposed. No people, no buildings or ruins, no cameras, drones or equipment, no text, no watermark, no border.
```

Prompt `A-est-plate3` (the parent take `A-est-t53`):

```text
Two reference images are supplied, with different jobs.
Image 1 is a real photograph. Use it only as the standard for how the new picture is rendered: how a real camera records light, haze, exposure and colour; soft highlights; detail that softens with distance; large plain, unremarkable surfaces. Do not copy its subject, its layout or anything in it.
Image 2 is a rough, blurred layout sketch of the place to photograph. Use it only for where things are: the viewpoint, the horizon, the route, the position and size of each landmark. Do not copy its surface texture, its sharpness or its rendering. Invent every surface fresh, as a camera would record real materials.

Make a new 16:9 photograph: one frame from a big-budget natural-history film about an alien world, shot on location with a large-format cinema camera and a 24 mm lens. It must be indistinguishable from real location photography.

THE PLACE. The inside of the windpipe of a creature the size of a mountain range that died ages ago, now a limestone-like cave passage about two hundred metres high and wide, running away from the viewer and curving out of sight. One part of the roof fell in long ago, leaving a single ragged skylight. Daylight comes down through it into wet air as one broad soft glow, with no separate beams, and under it rainforest has grown over the rubble: a continuous tangled canopy of tree ferns and pale-trunked trees of many heights, crowns overlapping, with dark gaps between them; a minority of the trees have dark red crowns, scattered among the green at different distances, none standing alone against the mist; one dead bare tree. A broad waterfall drops from the lip of the skylight behind the trees, strikes rock ledges, breaks into several strands and throws up spray that drifts through the canopy; its rock face is visible beside and behind it. It feeds a shallow river that runs toward the viewer over gravel bars and small rapids: the route. Past the forest the passage plainly goes on: the river comes round a bend out of blue-grey distance where, very far in, a second, much smaller patch of daylight shows. The cave is not a black frame around the picture: its walls and roof are dimly visible in bounced light, ordinary wet cave rock with flowstone, drip stains, ledges, fallen blocks and hanging roots. The creature's cartilage rings survive only in places, as enormous pale bands sunk in the rock like the ribs of a tunnel: one crosses the roof high overhead, cracked, stained green and brown and hung with roots; farther in, one has broken and its fallen half lies across the cave floor like a low curved bluff with ferns growing along its top; of another only a stub remains in the left wall. No two are alike in thickness, colour or state. They are part of the cave, never sculpture, never tusks.

LIFE. On the gravel bars and in the shallows near the forest, far from the viewer, a herd of about nine heavy, thick-skinned, eyeless grazing animals of clearly different sizes, bunched unevenly and overlapping one another: one large one standing belly-deep in the river facing the viewer, two seen from behind as they walk away into the ferns, one lying down, a calf pressed against an adult, one half hidden behind a boulder, two with their heads down drinking. They throw soft shadows and the wet gravel is churned and dark where they have walked. The largest is no taller than a twentieth of the frame height. On the near bank in the foreground, low and to one side, easy to miss: the scattered, half-buried, moss-covered bones of one of them among ferns and leaf litter, with an untidy cluster of pale leathery puffball bladders growing from them, of different sizes, some leaning, one burst and collapsed. No birds and no flying specks.

LIGHT. Only the daylight from the skylight: bright and soft on the canopy and the spray, green bounce on the nearest wall and the roof, a dim reflection on the river, cool shadow elsewhere that still shows the shape of the rock. Colours: deep green, wet near-black rock, pale bone, a little dark red.

WHAT MAKES IT REAL. One light source and one weather, consistent everywhere. Most of the frame is plain: dark wet rock, shadow, water and mist. Surfaces have no repeating pattern, no scales, no crackle and no carved detail. Nothing is evenly spaced and nothing is repeated; every object differs in size, shape and state, and some are broken, half hidden or cut off by the edge of the frame. Animals are small in the frame, in different poses and facing different ways, some partly hidden; none is posed side-on for the camera. Far things are paler, softer and lower in contrast than near things. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

The land plainly continues beyond every edge of the frame. No people, no buildings, paths or railings, no equipment, no text, no watermark, no border.
```

### A. Overgrowth: detail 1, spore bladders

- Kept image: `step-1-kept/A-overgrowth-2-detail-spore-bladders.jpg` (take `A-d1-t21`, generated 01:11 UTC, 31 s)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/A-d1p3.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/A-est-t53.jpg`: a round 3 take of my own (A-est-t53)
  2. `working/real/plate-forest-1.jpg`: real photograph, "Hoh sunrise mist fog scenic j preston (17095320637).jpg", Olympic National Park, public domain, https://commons.wikimedia.org/wiki/File:Hoh_sunrise_mist_fog_scenic_j_preston_(17095320637).jpg . Supplied only as the standard for how a camera records light, haze and exposure; nothing in it was to be copied.
- Why kept: Bladders venting gold dust on the bones, with the herd, the fallen ring and the far skylight soft behind: the kill told in one frame.
- Known faults: Made from A-est-t53, so the soft herd behind predates the herd revision; toothed jaw and venting bladder are not in the wide pile; fallen ring reads as a mound.
- Critics: Same-location test 3: placed in the correct wide view by all three critics; SURE Opus 8, Sol 9, Carbon 8.

Prompt `A-d1p3`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 100 mm lens from a camera lying on the mossy bank in the near foreground of Image 1, an arm's length from the old carcass. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The moss-covered bones of one of the grazing animals, half sunk in moss and wet leaf litter: a few rib ends and part of a jaw. Growing out of them is a small cluster of pale leathery puffball bladders of different sizes, from a plum to a melon: one taut and wet with droplets, one wrinkled and collapsed, one split open at the top and breathing out a thin drift of fine pale-gold dust that hangs in the still air and catches the daylight from the skylight. A few small dead insects are stuck to the skin of the largest bladder.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The shallow river; several of the heavy grazing animals in the shallows as small blurred shapes; the forest with a dark red crown among the green; the pale waterfall on its rock ledges under the skylight; the broad pale band of the cartilage ring crossing the cave roof.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

### A. Overgrowth: detail 2, the grazers

- Kept image: `step-1-kept/A-overgrowth-3-detail-grazers.jpg` (take `A-d2-t21`, generated 01:11 UTC, 32 s)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/A-d2p.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/A-est-t53.jpg`: a round 3 take of my own (A-est-t53)
  2. `working/real/plate-forest-1.jpg`: real photograph, "Hoh sunrise mist fog scenic j preston (17095320637).jpg", Olympic National Park, public domain, https://commons.wikimedia.org/wiki/File:Hoh_sunrise_mist_fog_scenic_j_preston_(17095320637).jpg . Supplied only as the standard for how a camera records light, haze and exposure; nothing in it was to be copied.
- Why kept: Eyeless long-necked grazers drinking, bladders and flies already on one back; the design the wide herd was revised to match.
- Known faults: Arch not visible; drinker heading differs from the wide; lying adult and dead tree missing.
- Critics: Same-location test 3: placed in the correct wide view by all three critics; SURE Opus 7, Sol 8, Carbon 7.

Prompt `A-d2p`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 300 mm lens from river level on the gravel bar in Image 1, about forty metres from the animals. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. Two adult grazing animals and one young one at the river's edge, the same animals as in Image 1. They are heavy, with thick grey-brown wrinkled hide like a rhinoceros, wet and muddy to the belly, a short flexible upper lip, and no eyes at all: smooth skin where eyes would be, and a row of dark breathing slits along each side of the snout. One drinks with its lip in the water, rings spreading from it. One has lifted its head and water runs from its mouth. The nearer adult has a few small pale puffball bladders sprouting from the skin along its spine and shoulder, the first sign of what will kill it, and small flies around them. The young one is half hidden behind an adult. The frame cuts through the hindquarters of the nearest animal.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. Tree ferns and undergrowth, the pale trunk and dark red crown of the tall tree, spray from the waterfall lit softly from above, the dark wet cave wall.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

### B. Titan-fall: establishing view

- Kept image: `step-1-kept/B-titan-fall-1-establishing.jpg` (take `B-est-t60`, generated 01:06 UTC, 34 s)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/B-est-plate3.txt`, full text below
- References passed to the generator, in order:
  1. `working/real/plate-terrace-2.jpg`: real photograph, "Great Fountain Geyser terraces at sunset (30766842144).jpg", Yellowstone National Park, public domain, https://commons.wikimedia.org/wiki/File:Great_Fountain_Geyser_terraces_at_sunset_(30766842144).jpg . Supplied only as the standard for how a camera records light, haze and exposure; nothing in it was to be copied.
  2. `working/layouts/B-layout.jpg`: a 768 x 432 blurred copy of an earlier round 3 take of my own (B-est-t38), supplied for positions only
- Why kept: Landform carries the frame: tide channel, airway shaft with ruined hoops, flats and cliff cave at four distances; heavy vapour; waders small and scattered.
- Known faults: Far waders repeat a head-down silhouette; red plumes sit slightly on top of the rock; vapour plumes a little evenly spaced; cave soft.
- Critics: Blind packet 11 (this image): Sol 9 FILM, Opus 8 FILM, Carbon 5 PAINTING. Blind packet 10 (the same image): 8 FILM, 8 FILM, 9 FILM.

Prompt `B-est-plate3`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a real photograph. Use it only as the standard for how the new picture is rendered: how a real camera records light, haze, exposure and colour; soft highlights; detail that softens with distance; large plain, unremarkable surfaces. Do not copy its subject, its layout or anything in it.
Image 2 is a rough, blurred layout sketch of the place to photograph. Use it only for where things are: the viewpoint, the horizon, the route, the position and size of each landmark. Do not copy its surface texture, its sharpness or its rendering. Invent every surface fresh, as a camera would record real materials.

Make a new 16:9 photograph: one frame from a big-budget natural-history film about an alien world, shot on location with a large-format cinema camera and a 28 mm lens. It must be indistinguishable from real location photography.

THE PLACE. A vast tidal shelf on a cold coast at low tide, early morning, sea fog burning off. The shelf is the exposed lung of a creature the size of a mountain range that died ages ago, worn down by the sea into a wave-cut platform of pale grey-white bone-rock: smooth, water-worn, planed nearly flat in broad low steps, with a few long joints, shallow pools, wet patches and dry patches, and drifts of shingle in the hollows, like a real limestone shore. One shallow tide channel of pale teal water winds away from the bottom of the frame across the shelf: the route. On the right, about eighty metres away, the shelf is pierced by one of the creature's airways: a shaft about forty metres across that drops straight down into the dark. It is lopsided, not round: the near lip is undercut and overhanging, one side has collapsed into a ramp of broken slabs, and the far side is a sheer wall. Its inside wall shows the remains of three cartilage hoops one below another, like the rings inside a windpipe: thick rounded bands of ivory cartilage, as tall as a house, bulging from the rock wall. They are old and ruined: cracked across, pitted, flaking, stained tea-brown and green-black where water runs, slightly translucent like horn at broken edges. None is complete and no two are alike: the top one survives only as two separate arcs with a wide gap of bare rock between them, the second sags and has dropped a block the size of a truck onto the third, and the third is half lost in darkness and vapour. Low sun rakes across the far inside wall so each band throws a shadow on the one below, while the near inside wall is in deep shadow. They are grown, not built: part of the wall, never free-standing, never pipes, beams, steps or masonry. Cold white vapour wells up out of the shaft, leans on the wind and, being heavy, sinks and slides away low across the rock. Deep wine-red gill-plumes, soft wet feathery fronds like the gills of giant tube worms, grow only where the vapour is: one large ragged mass on the near lip spilling inward over the drop and lifting in the rising vapour, and a few thin scraps and seedlings of very different sizes along cracks elsewhere on the lip; they are dark and dull in shadow and glow red only where the light passes through them. Nothing grows anywhere else on the shelf except a thin dark line of weed at the waterline of the channel. Farther off, at different distances and off any line, two smaller shafts show only as dark holes with their own thin vapour, and far out one tall plume of vapour is being torn sideways and frayed by the wind. Kilometres away the coast rises to an ordinary weathered sea cliff with level beds, scree and snow lying in its gullies. In it is one very large ragged cave mouth, wider than it is tall; it is not a black hole: its roof, a floor of fallen boulders and its walls can be seen going back into dimness. A slow bank of fog with a clear upper surface slides out along the cave floor and spills down the scree apron onto the shelf like a waterfall in slow motion.

LIFE. Bone-white wading animals, each with a small solid body on four long legs and a long neck that ends in a tuft of pink feeding tendrils instead of a head. They are scattered the way real animals are, never in a row: a loose clump of seven far down the channel at different depths, overlapping one another, some with necks down in the water, one with its neck straight up, one sitting folded on the rock, two walking; a few stragglers at different distances; and a far flock like scattered grains of rice on the shallows, a few of them in the air. One stands alone on dry rock near the lip of the shaft, three-quarters turned away from the viewer, looking down into it, and throws a long soft shadow toward the viewer; another lies dead on its side near the lip. The nearest is no taller than a twenty-fifth of the frame height.

LIGHT. Backlit by a low sun that is outside the frame to the upper left; no sun disc is visible. A broad pale-gold glow comes through the fog. Everything facing the viewer is in soft cool shadow with warm rims; the vapour glows where the light passes through it; sun glitter lies on the channel and on rock that is actually wet, and dry rock is matte with no reflections. Colours: grey-white and ivory rock, pale teal water, a little dark wine-red, pale gold light.

WHAT MAKES IT REAL. One light source and one weather, consistent everywhere. Most of the frame is plain: bare pale rock, shallow water, fog and sky. Surfaces have no repeating pattern, no scales, no crackle and no carved detail. Nothing is evenly spaced and nothing is repeated; every object differs in size, shape and state, and some are broken, half hidden or cut off by the edge of the frame. Animals are small in the frame, in different poses and facing different ways, some partly hidden; none is posed side-on for the camera. Far things are paler, softer and lower in contrast than near things. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

The land plainly continues beyond every edge of the frame. No people, no buildings, paths or railings, no equipment, no text, no watermark, no border.
```

### B. Titan-fall: detail 1, the airway rim

- Kept image: `step-1-kept/B-titan-fall-2-detail-airway-rim.jpg` (take `B-d1-t32`, generated 01:22 UTC, 32 s)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/B-d1p4.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/B-est-t60.jpg`: a round 3 take of my own (B-est-t60)
  2. `working/real/plate-terrace-2.jpg`: real photograph, "Great Fountain Geyser terraces at sunset (30766842144).jpg", Yellowstone National Park, public domain, https://commons.wikimedia.org/wiki/File:Great_Fountain_Geyser_terraces_at_sunset_(30766842144).jpg . Supplied only as the standard for how a camera records light, haze and exposure; nothing in it was to be copied.
- Why kept: Carcass the same way round as in the wide, standing wader at the rim, plumes, hoops and fallen block: the line the waders should not cross.
- Known faults: Standing wader has its neck down here and up in the wide; it shows three legs from this angle; hoops read more like bone than in the wide.
- Critics: Same-location test 3: placed in the correct wide view by all three critics; SURE Opus 8, Sol 10, Carbon 9.

Prompt `B-d1p4`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 35 mm lens from a low camera on the dry rock just this side of the dead wading animal in Image 1, looking past it along the lip of the large shaft toward the red gill-plumes, with the shaft opening on the right. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The dead wading animal of Image 1, lying exactly where and how it lies in Image 1: on its side on the dry pale rock a few steps from the lip, its long neck stretched out to the left, toward the red plumes, with the limp tuft of pink tendrils at the left end; its small bone-white body in the middle; its four thin stilt legs trailing out to the right. It is the only carcass. Half sunk in the shingle near it are a few small old weathered bones, easy to miss. A few steps beyond it, at the very lip, stands the living wader of Image 1, whole in the frame: bone-white, a small body on four stilt legs, three-quarters turned away from the camera, its long neck curved down so that the tuft of pink tendrils hangs over the drop as it looks into the shaft; its long soft shadow falls toward the camera. Beyond the two animals, farther along the lip on the left, the large ragged mass of deep wine-red gill-plumes: soft wet feathery fronds like the gills of giant tube worms, rooted under the lip, hanging inward over the drop, lifted and stirred by the cold white vapour that streams up past them, with beads of water along the fronds. To the right, inside the shaft, the ruined cartilage hoops of its wall, one below another: thick rounded bands of ivory cartilage as tall as a house, cracked across, pitted, flaking, stained tea-brown and green-black where water runs, with the fallen block the size of a truck lying on the lowest, dim in the vapour, and darkness under it. The vapour wells up, spills over the lip at one low place and slides away across the rock at ankle height, round the dead animal.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. On the left the pale shelf and the tide channel with sun glitter and a few living waders as small pale shapes; the torn far vapour plume; at the upper right the snow-streaked cliff with its wide cave and the fog pouring from it.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

### B. Titan-fall: detail 2, the waders

- Kept image: `step-1-kept/B-titan-fall-3-detail-waders.jpg` (take `B-d2-t20`, generated 01:11 UTC, 29 s)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/B-d2p3.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/B-est-t60.jpg`: a round 3 take of my own (B-est-t60)
  2. `working/real/plate-terrace-2.jpg`: real photograph, "Great Fountain Geyser terraces at sunset (30766842144).jpg", Yellowstone National Park, public domain, https://commons.wikimedia.org/wiki/File:Great_Fountain_Geyser_terraces_at_sunset_(30766842144).jpg . Supplied only as the standard for how a camera records light, haze and exposure; nothing in it was to be copied.
- Why kept: Four-legged waders feeding in the channel, one dripping, backlit, cliff cave and plume behind.
- Known faults: A fourth animal lies in the water behind with no match in the wide; rim mound reads as low boulders; distant cliff keeps nearly the same framing as the wide.
- Critics: Same-location test 3: placed in the correct wide view by all three critics; SURE Opus 8, Sol 9, Carbon 8.

Prompt `B-d2p3`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 400 mm lens from a camera lying at the water's edge of the tide channel in Image 1, looking along the channel toward the glow of the low sun. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. Three of the bone-white wading animals from Image 1, feeding in ankle-deep water at slightly different distances, so that only the middle one is fully sharp. Each has a small compact body with smooth pale skin in loose folds, no feathers and no wings, four thin stilt legs with knobbly joints, and a long neck that ends not in a head but in a tuft of fine pink feeding tendrils. One trails its tendrils through the water; one has lifted its neck and water drips from the tendrils in a string of bright drops; one stands on three legs. Their reflections break in the ripples. They are backlit, with bright rims and soft cool shadow sides. A few metres beyond them a fourth has gone down: it kneels in the shallows with its neck lying in the water, where a low sheet of heavy white vapour is sliding across the surface toward the others.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The pale rock shelf; the vapour rising from the big shaft with a blur of dark red at its lip; the torn far vapour plume; the snow-streaked cliff with its wide cave and the fog pouring from it.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

### C. Corpse-light: establishing view

- Kept image: `step-1-kept/C-corpse-light-1-establishing.jpg` (take `C-est-t56`, generated 01:22 UTC, 35 s)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/C-est-edit6.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/C-est-t50.jpg`: a round 3 take of my own (C-est-t50)
- Lineage: a single-step revision of `C-est-t50`, which was generated by `gpt_image_2_6_sunburst` from prompt `working/prompts/C-est-plate3.txt` (full text below) with these references:
  1. `working/real/plate-dusk-1.jpg`: real photograph, "Halema‘uma‘u at Dusk from Jaggar Museum.jpg", National Park Service / Ed Shiinoki, public domain, https://commons.wikimedia.org/wiki/File:Halema%E2%80%98uma%E2%80%98u_at_Dusk_from_Jaggar_Museum.jpg . Supplied only as the standard for how a camera records light, haze and exposure; nothing in it was to be copied.
  2. `working/layouts/C-layout.jpg`: a 768 x 432 blurred copy of an earlier round 3 take of my own (C-est-t29), supplied for positions only
- Why kept: Dusk valley with three sac colonies along the stream, the banded animal at the middle colony and the lit cave; glows now light the water and wet ground after one revision of C-est-t50.
- Known faults: Lit sacs recur at regular-looking intervals; cave reads as a dark opening with lights parked inside; far glow a little painted; animal small.
- Critics: Blind packet 11 (this image): Sol 8 FILM, Opus 8 FILM, Carbon 6 PAINTING. Blind packet 10 scored its parent C-est-t50: 8 PAINTING, 8 FILM, 9 FILM.

Prompt `C-est-edit6`:

```text
Image 1 is a frame from a big-budget natural-history film about an alien world. Re-shoot the same frame: the same location, the same camera position and lens, the same light and weather, the same composition and colours, and the same real location-photography look with true lens perspective and fine physical surface detail. Output a wide 16:9 landscape frame. Change only the things listed below; everything else stays exactly as in Image 1, and nothing new is added anywhere else.

CHANGES.
1. The insects. In Image 1 the insects on and around the large sacs at the lower right look like white star-shaped stamps. Replace them with what a camera really records at dusk: small dull moths, each no bigger than a grain of rice at this distance. About a dozen have settled on the brightest sac with their wings folded and show only as tiny dark marks against its glow. The rest hang in the air close to that sac as a loose, uneven cloud of soft, dim, out-of-focus specks and a few short motion-blurred streaks, grey-green and faint, thickest right beside the sac and gone within a metre or two of it. None is white, none is star-shaped or flower-shaped, none is sharp, and no two are the same.
2. The light of the sacs reaches a little farther onto what is beside them: the wet stones, the stream and the mist within a few metres of each lit sac take a dim green light on the side that faces it, and their far sides stay dark.
3. The mist at the foot of the cliff is thinner and broken, so the boulders and the scree in front of the cave can be seen through it.

It must still read as real location photography of a place you could walk into, not artwork: irregular, weathered, unposed. No people, no buildings or ruins, no cameras, drones or equipment, no text, no watermark, no border.
```

Prompt `C-est-plate3` (the parent take `C-est-t50`):

```text
Two reference images are supplied, with different jobs.
Image 1 is a real photograph. Use it only as the standard for how the new picture is rendered: how a real camera records light, haze, exposure and colour; soft highlights; detail that softens with distance; large plain, unremarkable surfaces. Do not copy its subject, its layout or anything in it.
Image 2 is a rough, blurred layout sketch of the place to photograph. Use it only for where things are: the viewpoint, the horizon, the route, the position and size of each landmark. Do not copy its surface texture, its sharpness or its rendering. Invent every surface fresh, as a camera would record real materials.

Make a new 16:9 photograph: one frame from a big-budget natural-history film about an alien world, shot on location with a large-format cinema camera and a fast 24 mm lens. It must be indistinguishable from real location photography.

THE PLACE. Late dusk in a long shallow valley on the body of a creature the size of a mountain range that died ages ago. Its lung has weathered open here. The ground is matte dark volcanic ash and scree with patches of grey lichen, dry except along one narrow stream that runs from the bottom of the frame away down the valley: the route. Where the ground is wet grow the creature's air sacs, still alive: soft membrane bladders from the size of a barrel to the size of a house. They do not dot the valley at intervals. They grow in three separate colonies with long empty dark stretches between: one colony close to the camera on the stream bank at the lower right, large in the frame, a crowded heap of five or six sacs of very different sizes pressed against each other; one in the middle distance on the stream; and one wide colony very far away where the valley bends, seen only as a low uneven glow on mist. Within a colony each sac has a different skin: one milky and smooth, one ribbed like a gourd, one dark and leathery with a single glowing split, one thin and clear with red veins, and several dead, collapsed and unlit. Luminous organisms live in the living ones, so they glow from within, cold blue-green, dimly and unevenly. Each lit sac is the only light near it and really lights its surroundings: the wet stones, the surface of the stream, the low mist and anything standing beside it are lit green on the side that faces it and throw shadows away from it, and the light dies out within a few metres. On the right the valley side is a plain weathered cliff whose scree fans meet the valley floor in clear air. In it is one low wide cave: its floor of boulders, its roof and walls can be seen because a few sacs glow some way inside it and light the rock around them; a thin sheet of mist drains out of it along the ground.

LIFE. One heavy eyeless animal with dark and pale bands stands at the middle colony, seen from three-quarters behind, sharp and solid, its flank and legs lit green by the sac it is nosing and its shadow falling away from the light; it is no taller than a twenty-fifth of the frame height. Two more of its kind far down the valley, almost lost in the dusk. Around one sac of the near colony only, a tight cloud of small pale moths, like insects round a lamp: lit on the side toward the sac, the nearest ones blurred by movement. No specks anywhere else in the frame.

LIGHT. Exposed like Image 1: real dusk. The sky holds the last light, deep blue-grey under thin cloud with a narrow band of dull orange afterglow at the horizon, no stars. The land is dark, but in the cold skylight the foreground still reads clearly: single stones, lichen, a damp patch reflecting the sky. The glows are small, soft and not overexposed. Colours: blue-black land, cyan-green living light, a little amber, the dull orange band in the sky.

WHAT MAKES IT REAL. One light source and one weather, consistent everywhere. Most of the frame is plain: dark matte ground, mist and sky. Surfaces have no repeating pattern, no scales, no crackle and no carved detail. Nothing is evenly spaced and nothing is repeated; every object differs in size, shape and state, and some are broken, half hidden or cut off by the edge of the frame. Animals are small in the frame, in different poses and facing different ways, some partly hidden; none is posed side-on for the camera. Far things are paler, softer and lower in contrast than near things. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

The land plainly continues beyond every edge of the frame. No people, no buildings, paths or railings, no equipment, no text, no watermark, no border.
```

### C. Corpse-light: detail 1, the sac

- Kept image: `step-1-kept/C-corpse-light-2-detail-sac.jpg` (take `C-d1-t21`, generated 01:11 UTC, 36 s)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/C-d1p3.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/C-est-t50.jpg`: a round 3 take of my own (C-est-t50)
  2. `working/real/plate-dusk-1.jpg`: real photograph, "Halema‘uma‘u at Dusk from Jaggar Museum.jpg", National Park Service / Ed Shiinoki, public domain, https://commons.wikimedia.org/wiki/File:Halema%E2%80%98uma%E2%80%98u_at_Dusk_from_Jaggar_Museum.jpg . Supplied only as the standard for how a camera records light, haze and exposure; nothing in it was to be copied.
- Why kept: What the light is for: a young banded animal inside the veined sac, hoof against the membrane, the stream, the middle colony and the cave behind.
- Known faults: Made from C-est-t50, so its moths are pale where the revised wide has dull ones; neighbouring sacs of the near colony are missing; nothing can be seen inside the sac in the wide.
- Critics: Same-location test 3: placed in the correct wide view by all three critics; SURE Opus 8, Sol 10, Carbon 8.

Prompt `C-d1p3`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 50 mm lens from a low camera an arm's length from the largest sac of the near colony beside the stream in Image 1, the thin clear one with red veins. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. Part of the sac's curved skin fills the right half of the frame: a taut, wet, translucent membrane, milky blue-green, lit dimly and unevenly from inside by drifting points of light, with veins branching through it. Held inside it, dark against the glow, is the body of a young one of the heavy banded animals seen in Image 1, the size of a calf: it lies curled on its side with its four short thick legs folded, blunt hooved feet, a rounded back with faint bands and a blunt eyeless head, one foreleg pressed against the membrane from inside. It is plainly a four-legged animal and has no hands or fingers. It is partly dissolved, so its ribs and spine show through as darker lines. On the outside of the skin a few tiny pale moth-like flyers have landed. At the base of the sac, thin wet threads of tissue run out across the dark ash toward the stream.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The narrow stream with green reflections; the middle colony glowing far off, with the heavy banded animal standing at it as a small dark shape; the plain dark cliff with its low wide cave lit from inside by a few sacs; the dusk sky with its narrow band of dull orange.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

### C. Corpse-light: detail 2, the snare

- Kept image: `step-1-kept/C-corpse-light-3-detail-snare.jpg` (take `C-d2-t31`, generated 01:22 UTC, 31 s)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/C-d2p4.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/C-est-t50.jpg`: a round 3 take of my own (C-est-t50)
  2. `working/real/plate-dusk-1.jpg`: real photograph, "Halema‘uma‘u at Dusk from Jaggar Museum.jpg", National Park Service / Ed Shiinoki, public domain, https://commons.wikimedia.org/wiki/File:Halema%E2%80%98uma%E2%80%98u_at_Dusk_from_Jaggar_Museum.jpg . Supplied only as the standard for how a camera records light, haze and exposure; nothing in it was to be copied.
- Why kept: The snare: banded animal with its snout in the ribbed sac, threads round fore and hind legs, lit cave behind.
- Known faults: Sac larger and more torn than in the wide; stream beside it missing; band is one stripe here and broader patches in the wide.
- Critics: Same-location test 3: placed in the correct wide view by all three critics; SURE Opus 7, Sol 9, Carbon 8.

Prompt `C-d2p4`:

```text
Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records light, haze and exposure. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a 135 mm lens from a low camera on the ash beside the stream in Image 1, about fifteen metres from the animal at the middle colony, looking past it toward the cliff. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. The heavy eyeless animal of Image 1, standing where it stands in Image 1 at the middle colony, seen from three-quarters behind. It has thick wrinkled dark hide with one broad pale band over its back like a saddle, a thin tail, smooth skin where eyes would be, and mud dried on its legs. Its head is lowered to the same sac it is nosing in Image 1: the ribbed one, ribbed lengthwise like a gourd, about as big as the animal itself, glowing cold blue-green from inside, brightest along one open seam, with a dark, collapsed, leathery sac slumped against it. The glow lights the side of the animal's face, its chest and one foreleg cyan-green; its back is a dark shape against the dusk; its shadow falls away from the light, toward the camera. Around its feet, thin pale wet threads of tissue have risen out of the ash; several lie across its feet and one is drawn tight around a hind leg. It has not noticed. Two or three tiny dull moths drift in the light as soft blurred specks; none is white, sharp or star-shaped. The frame cuts off part of the colony.

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. The scree at the foot of the plain dark cliff and, above and to the right, its low wide cave, lit dimly green from inside by a few sacs, with thin mist draining from it along the ground; at the upper left the dusk sky with its narrow band of dull orange.

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border.
```

### Blind tests

The critics were three other models (GPT-6.2 Sol, Claude Opus 5.5, Gemini 4 Carbon), each started fresh with no context. The briefs, the answer keys and every reply, unedited, are in `working/critics/`.

- Blind packets 1 to 11 (`cal1` to `cal11`): eight stills each, the candidate establishing views mixed with real photographs and rejected round 2 frames. Each critic guessed the source of each picture and scored it 0 to 10 as a real three-dimensional place.
- Packet 11, the final establishing views: A 9 FILM / 7 FILM / 4 PAINTING; B 9 FILM / 8 FILM / 5 PAINTING; C 8 FILM / 8 FILM / 6 PAINTING (Sol / Opus / Carbon). Real photographs in the same packet: cave 10 / 8 / 9, coast 10 / 7 / 8, glacier at blue hour 8 / 6 / 7. Round 2 frames: The Breath 6 / 3 / 2, The Spine 4 / 2 / 1.
- Carbon scored the identical plate B 9 FILM in packet 10 and 5 PAINTING in packet 11. Its numbers are reported as received.
- Blind packets 12 and 13 (`cal12`, `cal13`), run after the step 1 hand-over: the six detail views scored for realism for the first time, each packet with three real animal photographs and two round 2 frames. REAL 0 to 10 and the critic's guess at the source, Sol / Opus / Carbon: A detail 1 FILM 8 / FILM 6 / PAINTING 4; A detail 2 FILM 8 / FILM 6 / AMATEUR 5; B detail 1 FILM 7 / FILM 6 / FILM 5; B detail 2 FILM 7 / FILM 5 / AMATEUR 4; C detail 1 FILM 7 / FILM 5 / FILM 6; C detail 2 FILM 7 / FILM 6 / AMATEUR 6. The real animal photographs scored 10 from every critic; the round 2 frames 1 to 6. By the rule fixed before the results were seen, the two A details pass, the four B and C details are borderline and none fails.
- Batch 23: one revision of each of the six details (16 takes), with a real photograph of bare hide, a wading bird or soft tissue as the standard and the faults the critics named as the only changes. The two B revisions (`B-d1-t42`, `B-d2-t42`) were adopted by eye for the full set. They were not re-tested blind. The A and C revisions were not judged, because A and C are not carried forward unless one of them is picked.
- Same-location tests 2 and 3 (`loc2`, `loc3`): three wide views and six details shuffled together; each critic said which wide view each detail was shot in. Both tests: 18 of 18 correct. Test 3 is the final nine.
- Build opinions (`build1`): two critics estimated from the stills how closely each direction could be matched in three.js. These are opinions, not measurements: Sol A 6 / B 8 / C 7; Opus A 3 / B 5 / C 5.

### Real photographs used as critic controls

- `anchor-cave-1.jpg`: "Son Doong Cave DB (1).jpg" by Dave Bunnell, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Son_Doong_Cave_DB_(1).jpg
- `anchor-coast-1.jpg`: "Cape Bridgewater (AU), Blowholes -- 2019 -- 0813.jpg" by Dietmar Rabich, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Cape_Bridgewater_(AU),_Blowholes_--_2019_--_0813.jpg
- `anchor-bluehour-1.jpg`: "SkaftafellsjoekullAtBlueHour.jpg" by Andreas Tille, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:SkaftafellsjoekullAtBlueHour.jpg
- The full list, including photographs used in earlier packets and for takes that were not kept, is in `working/real/CREDITS.md`.
