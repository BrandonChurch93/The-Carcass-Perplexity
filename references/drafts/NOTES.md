# The Carcass, round 3: notes on the kept images

This file lists the model, the prompt and the references for every kept image of round 3. Part one is the full set of step 2 in direction B (Titan-fall): six places, 30 pictures, and the reveal, which was rejected once and redone as four key frames of one pull-back from the lake to orbit. Part two is step 1: the nine pictures of the three art directions for The Breath. Nothing from rounds 1 or 2 was used as an input anywhere.

## How the set was made

- Takes generated in round 3: 494 (`gpt_image_2_6_sunburst` 433, `seedream_5` 31, `nano_banana_pro` 20, `gpt_image_2_6_flare` 7, `nano_banana_2_1` 3). Step 1 used 226. Batch 23, one revision of each step 1 detail, used 16. Step 2 used 70: 18 for the establishing views and the first reveal, 44 for the details, 2 for one redo, 6 for three single-step fixes. The reveal redo used 182. Every kept image is from `gpt_image_2_6_sunburst`. Every take is in `working/takes/`; the take-to-prompt mapping, my notes and the critic replies are in `working/log.json`.
- Direction. Step 2 ran in B, Titan-fall, which was my recommendation, before any pick was given: after step 1 was shown, the user asked for speed and for the work not to stop. The user then approved direction B for all six places (message of about 02:58 UTC on 24 November: "Direction B is approved for all six places. Keep them exactly as they are. Only the reveal is rejected."). The six places have not been touched since. The reveal was started again from nothing; its section is at the end of part one.
- Establishing views of step 2: a fresh generation from text plus one real public-domain photograph (two for The Spine), supplied only as the standard for how a camera records that kind of light and weather. Two or three takes per subject, one kept.
- Details of step 2: a fresh generation with two references that have separate jobs. Image 1 is the establishing view of the place, supplied as the place itself ("the same place, at the same moment"). Image 2 is a real photograph, supplied only as a rendering standard: lava, surf, snow, bare hide, a wading bird. Two takes per detail, one kept. One detail was redone with a changed approach (The Eye, detail 2).
- Three single-step fixes at the end (batch 30, two takes each), each a "re-shoot the same frame, change only this" revision: the near kite-wing in The Ribs detail 2 had an eye, the drinker in The Eye detail 2 read as a horse, and the two drinkers in The Eye detail 4 had ears and wool. The rule they broke is my own: nothing living in the film has eyes or ears; the only eye is the dead one.
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

- Kept image: `step-2-full-set/1-ribs/ribs-2-tide-pool-feeders.jpg` (take `ribs-d3c-t1`, generated 02:36 UTC, 25 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/ribs-d3c.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/ribs-d3-t2.jpg`: take `ribs-d3-t2`, the frame being revised ("re-shoot the same frame, change only these things")
- Lineage: a single-step revision of `ribs-d3-t2`, which was generated by `gpt_image_2_6_sunburst` from prompt `working/prompts/ribs-d3.txt` (full text below, after the revision prompt) with these references:
  1. `working/takes/ribs-est-t2.jpg`: take `ribs-est-t2`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/ref-wader-1.jpg`: real photograph, "Black Necked Stilt at the Fish Springs National Wildlife Refuge (51665418218).jpg" by USFWS Mountain Prairie, Public domain, https://commons.wikimedia.org/wiki/File:Black_Necked_Stilt_at_the_Fish_Springs_National_Wildlife_Refuge_(51665418218).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Kite-wings wading; one pulls a worm from a pool with its tendril head, another shakes off water, surf and rib blades behind. Single-step fix of ribs-d3-t2: the near animal's eye is gone, so its head is the same blind tuft of tendrils as the others.
- Known faults: The far flier is soft and its wing is very orange; the foreground weed takes the lower quarter of the frame.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `ribs-d3c`:

```text
One image is supplied.
Image 1 is a frame from a big-budget natural-history film about an alien world. Re-shoot the same frame: the same location, the same camera position and lens, the same light and weather, the same composition, colours and depth of field, and the same real location-photography look with true lens perspective and fine physical surface detail. Output a wide 16:9 landscape frame. Change only what is listed below; everything else stays exactly as in Image 1, and nothing new is added anywhere else.

CHANGE.
1. The head of the nearest animal, the one on the right that is pulling a worm out of the pool. In Image 1 its head has a small round eye. These animals have no eyes at all. Its head is only the smooth, narrow, blind end of the neck, covered in the same pale, wet, creased bare skin as the neck, with no eye, no eye socket, no eyelid, no nostril and no dark spot where an eye would be. The long wet tendrils grow straight out of the end of it, as they do on the animal behind it. The tendrils, the worm, the splash, the neck, the body, the wings and the legs stay exactly as they are.

It must still read as real location photography of a place you could walk into, not artwork and not computer graphics: irregular, weathered, dirty, unposed, with fine film grain. No people, no buildings or ruins, no cameras, drones or equipment, no text, no watermark, no border.
```

Prompt `ribs-d3` (the parent take `ribs-d3-t2`):

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
- Lineage: a single-step revision of `B-d2-t20`, which was generated by `gpt_image_2_6_sunburst` from prompt `working/prompts/B-d2p3.txt` (full text in part two of this file) with these references:
  1. `working/takes/B-est-t60.jpg`: take `B-est-t60`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-terrace-2.jpg`: real photograph, "Great Fountain Geyser terraces at sunset (30766842144).jpg" by Yellowstone National Park, Public domain, https://commons.wikimedia.org/wiki/File:Great_Fountain_Geyser_terraces_at_sunset_(30766842144).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
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
- Lineage: a single-step revision of `B-d1-t32`, which was generated by `gpt_image_2_6_sunburst` from prompt `working/prompts/B-d1p4.txt` (full text in part two of this file) with these references:
  1. `working/takes/B-est-t60.jpg`: take `B-est-t60`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-terrace-2.jpg`: real photograph, "Great Fountain Geyser terraces at sunset (30766842144).jpg" by Yellowstone National Park, Public domain, https://commons.wikimedia.org/wiki/File:Great_Fountain_Geyser_terraces_at_sunset_(30766842144).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
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

- Kept image: `step-2-full-set/6-eye/eye-2-the-iris-amber-mats.jpg` (take `eye-d2c-t2`, generated 02:36 UTC, 27 s, 1671x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/eye-d2c.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/eye-d2b-t2.jpg`: take `eye-d2b-t2`, the frame being revised ("re-shoot the same frame, change only these things")
  2. `working/takes/eye-d1-t1.jpg`: take `eye-d1-t1`, detail 1 of this place, supplied only to show what the animals of this lake look like
- Lineage: a single-step revision of `eye-d2b-t2`, which was generated by `gpt_image_2_6_sunburst` from prompt `working/prompts/eye-d2b.txt` (full text below, after the revision prompt) with these references:
  1. `working/takes/eye-est-t1.jpg`: take `eye-est-t1`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-terrace-2.jpg`: real photograph, "Great Fountain Geyser terraces at sunset (30766842144).jpg" by Yellowstone National Park, Public domain, https://commons.wikimedia.org/wiki/File:Great_Fountain_Geyser_terraces_at_sunset_(30766842144).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Amber filaments under clear water, threads of small bubbles, and a full-size drinker at mid-distance so the lake reads at real scale. Single-step fix of the redo eye-d2b-t2, whose drinker read as a horse: it is now the lean, earless, eyeless drinker of detail 1.
- Known faults: The drinker's body is still close to a thin horse or camelid. First attempt (eye-d2-t1, t2) dropped: thumb-sized grazers read as miniature lambs.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `eye-d2c`:

```text
Two images are supplied, with different jobs.
Image 1 is a frame from a big-budget natural-history film about an alien world. Re-shoot the same frame: the same location, the same camera position and lens, the same light and weather, the same composition, colours and depth of field, and the same real location-photography look with true lens perspective and fine physical surface detail. Output a wide 16:9 landscape frame. Change only what is listed below; everything else stays exactly as in Image 1, and nothing new is added anywhere else.
Image 2 is another frame from the same film, shot at the same lake a few minutes earlier. Use it only to see exactly what the animals of this lake look like. Do not copy its composition, its camera position, its foreground or its framing.

CHANGES.
1. The animal standing in the shallows at the left of Image 1 is wrong: it looks like a horse. Replace it with one adult of the animals in Image 2, standing on the same spot, the same size in the frame, in the same pose: all four feet in ankle-deep water, the neck lowered, the tip of the head just touching the water, rings spreading from it, its reflection broken by the ripples. It is exactly the animal of Image 2: a lean body that is higher at the shoulder than at the hip, long thin legs with knobbly joints, a long neck, and a head that is nothing but the smooth, blunt, tapering end of the neck, with no eyes, no ears, no nostrils, no mouth line, no mane, no forelock and no tail hair. Its skin is the bare, pale, pinkish-grey, creased and scarred hide of Image 2, darker with water on the legs and belly, with a few drips falling from the belly.
2. The two small animals far off at the left edge are the same animals as in Image 2, small and soft with distance.

Everything else is exactly as in Image 1: the amber filament mats under clear water in the foreground, the threads of small bubbles, the pale rock of the floor, the dark deep water beyond, the mist, the lit cliffs and the sky.

It must still read as real location photography of a place you could walk into, not artwork and not computer graphics: irregular, weathered, dirty, unposed, with fine film grain. No people, no buildings or ruins, no cameras, drones or equipment, no text, no watermark, no border.
```

Prompt `eye-d2b` (the parent take `eye-d2b-t2`):

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

- Kept image: `step-2-full-set/6-eye/eye-4-what-rises-from-the-centre.jpg` (take `eye-d4c-t2`, generated 02:36 UTC, 26 s, 1671x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/eye-d4c.txt`, full text below
- References passed to the generator, in order:
  1. `working/takes/eye-d4-t1.jpg`: take `eye-d4-t1`, the frame being revised ("re-shoot the same frame, change only these things")
  2. `working/takes/eye-d1-t1.jpg`: take `eye-d1-t1`, detail 1 of this place, supplied only to show what the animals of this lake look like
- Lineage: a single-step revision of `eye-d4-t1`, which was generated by `gpt_image_2_6_sunburst` from prompt `working/prompts/eye-d4.txt` (full text below, after the revision prompt) with these references:
  1. `working/takes/eye-est-t1.jpg`: take `eye-est-t1`, the establishing view of this place, supplied as the place itself ("the same place, at the same moment")
  2. `working/real/plate-crater-1.jpg`: real photograph, "Aerial Crater Lake (cropped).jpg" by Mike Doukas, USGS derivative work: User:Maps and stuff (cropped to 3:2 ratio; increased brightness in dark areas; color balanced; saved as a high quality JPG), Public domain, https://commons.wikimedia.org/wiki/File:Aerial_Crater_Lake_(cropped).jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: The water domes at the centre and thin pale spines break the surface in a ring; two drinkers watch. Single-step fix of eye-d4-t1, whose drinkers had ears and wool: they are now the bare-skinned, earless drinkers of detail 1.
- Known faults: What rises is only hinted at. Seen from behind and out of focus, the blunt earless heads read as plain stumps.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `eye-d4c`:

```text
Two images are supplied, with different jobs.
Image 1 is a frame from a big-budget natural-history film about an alien world. Re-shoot the same frame: the same location, the same camera position and lens, the same light and weather, the same composition, colours and depth of field, and the same real location-photography look with true lens perspective and fine physical surface detail. Output a wide 16:9 landscape frame. Change only what is listed below; everything else stays exactly as in Image 1, and nothing new is added anywhere else.
Image 2 is another frame from the same film, shot at the same lake a few minutes earlier. Use it only to see exactly what the animals of this lake look like. Do not copy its composition, its camera position, its foreground or its framing.

CHANGES.
1. The two animals in the foreground, seen from behind and out of focus, are wrong: they have ears and woolly coats and look like llamas. They are the animals of Image 2. Each head is nothing but the smooth, blunt, tapering end of the long neck: a plain rounded shape with no ears, no horns, no knobs and no eyes. Their skin is the bare, pale, creased hide of Image 2, with no wool, no fur and no hair. They stay where they are in the frame, the same size, seen from behind, still out of focus, both facing the centre of the lake with their heads raised, watching.

Everything else is exactly as in Image 1: the low dome of water at the centre of the lake, the ring of thin pale spines breaking the surface around it, the rings spreading across the water, the mist, the cliffs and their reflection in the water.

It must still read as real location photography of a place you could walk into, not artwork and not computer graphics: irregular, weathered, dirty, unposed, with fine film grain. No people, no buildings or ruins, no cameras, drones or equipment, no text, no watermark, no border.
```

Prompt `eye-d4` (the parent take `eye-d4-t1`):

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

### The Reveal (redone)

The first reveal of this round was rejected: "reads as a fish with arms growing out of its head". It is in `../archive/round-3-reveal/`. Nothing of it was reused: no pixels, no prompt text, no layout. This section covers the new one.

Every claim below is labelled where it matters: MEASURED (tested or computed in this run), STATED (design intent, not tested) or UNKNOWN.

#### The shot

The camera leaves the surface of the lake in The Eye and rises until the whole continent is in frame, with no cut. The continent is the titan: a dead giant on its back, head at the left, feet at the right, weathered down to bone-pale mountain ranges in a dark sea. The curve of the planet shows only at the top left edge of the widest frame.

The design rule, after the note that the titan "is just laying down in the ocean" and "doesn't look decomposed or creepy enough": the outline says corpse, the surface says continent. The outline is a body that has come apart: jaw fallen open, breastbone gone, belly gone, one knee bent. The surface is geology: every bone is a mountain range with drainage, every hollow is sea, shallows, salt or lava.

#### How a body on its back shows both its ribs and its spine

- The titan lies on its back, so the camera looks at the front of the chest.
- The breastbone has rotted away. The sea runs down the middle of the chest between the two rows of rib ranges. That channel is the tidal strait of The Ribs. The backbone lies drowned along its floor and shows through the water as a thin pale line.
- Below the last ribs there is no belly wall left at all. The backbone is the only thing still standing there: one knife ridge that crosses open water from the rib cage to the hips. That is The Spine, and the storm sits on it.
- So the ribs are seen from the front because the body is face up, and the spine is seen where the front of the body is gone.

#### The four key frames

All four are views of one picture, the master (`step-2-full-set/7-reveal/reveal-master.jpg`, 5952 x 3348). Frames 3 and 4 are windows of it. Frames 2 and 1 are finer plates of two smaller windows, and each plate was folded back into the master, so every closer frame is an exact part of the wider one.

| Key frame | File in `step-2-full-set/7-reveal/` | What it shows | Width of view, STATED | Step from the frame before | Where the lake sits (% of width, % of height) |
|---|---|---|---|---|---|
| 1 | `reveal-1-above-the-lake.jpg` | Just above the lake. The round shore fills the frame. | about 250 km (the lake about 97 km) | | 50, 50 |
| 2 | `reveal-2-skull-massif.jpg` | The lake is an eye socket in a skull-shaped massif: second socket, nose pits, open jaw bay with teeth. | about 920 km | 3.65 times wider | 50, 50 |
| 3 | `reveal-3-head-and-shoulders.jpg` | Head, neck, both shoulders and the upper rib cage. The airways in the throat and the lava glow under the ribs come into view. | about 2,150 km | 2.34 times wider | 38.8, 50 |
| 4 | `reveal-4-titan-from-orbit.jpg` (1672 x 941) and `reveal-4-titan-from-orbit-4k.jpg` (3840 x 2160) | The whole titan from orbit. The reveal frame. | about 5,030 km | 2.34 times wider | 20.3, 46.5 |

- Scale is STATED, not measured: the body is taken as 4,000 km from crown to heel, which gives 2.57 km per pixel of the wide frame. The head is about one seventh of the body length.
- Fresh viewers put the lower frames far smaller than that (MEASURED, see the tests): frame 1 at 10 to 60 km, frame 2 at 40 to 150 km, frame 3 at 100 to 300 km or "several hundred", frame 4 at 2,000 to 5,000 km. They read the lower frames as real terrain seen from orbit, but as a smaller place than intended.
- `step-2-full-set/7-reveal/pullback.json` holds the exact window of each frame in the master, the nesting measurements and the six place marks, for the build.

#### Nesting, MEASURED

Each closer frame was reduced and laid over its window in the wider frame, and the difference was measured on a scale of 0 to 255 (`working/pull/nest-x6.json`, script `working/tools/cut_frames3.py`).

| Pair | Window in the wider frame (x, y of the top left corner, width, in px of 1672 x 941) | Mean difference | 99th percentile |
|---|---|---|---|
| 1 in 2 | 606.9, 341.5, 458.3 | 1.76 | 10.1 |
| 2 in 3 | 291.7, 269.7, 713.7 | 1.28 | 11.4 |
| 3 in 4 | 63.0, 236.5, 713.9 | 0.78 | 5.3 |
| 1 in 4 | 298.1, 413.9, 83.5 | 0.56 | 2.3 |

Two critics who were told the four pictures should be one move and asked to attack the joins agreed that each frame is found inside the next (`cb1`, `cb2`). What they named as different is listed under known faults.

#### The camera move, for the build

- It can be built as one seamless zoom through the three nested pictures: the master, the frame 2 plate and the frame 1 plate.
- It is not a centre-locked straight rise. The lake is at the centre of frames 1 and 2, then moves left: 38.8% in frame 3 and 20.3% in frame 4. The aim has to ease from the lake toward the chest while the camera rises, so that the body ends up filling the frame. A rise that kept the lake dead centre would put the titan half out of frame at the top.
- Frames 1 to 3 look straight down. Frame 4 is slightly oblique, with the planet's edge and black space at the top left and sunglint at the right. In a 2D zoom the edge of the planet simply arrives from the corner as the frame widens.
- The first step is the largest (3.65 times) and has the most visible change in texture. Both critics called it the weakest step.
- Whether the build can hold this in motion is UNKNOWN. No 3D was built in round 3, as instructed.

#### Where the six places are on the body

Marked copy: `step-2-full-set/7-reveal/reveal-marked.jpg`. Positions are in percent of frame 4 (width from the left, height from the top). The lake position comes from the frame geometry. The lava glow, the storm and the salt flats are centroids of the orange, white and red pixels in a box (`working/tools/reveal_sheet.py`). The strait and the airways were read off the picture by eye.

| Film order | Place | What it is from orbit | Mark | Found by fresh viewers who were given only the six descriptions (MEASURED) |
|---|---|---|---|---|
| 1 | The Ribs | The tidal strait: dark sea between the two rows of rib ranges, with the drowned backbone as a pale line in it | 40.2, 46.4 | 3 of 3 |
| 2 | The Heart | The lava glow: a dark lava crust under the upper ribs with one ember and a few sparks | 37.4, 38.8 | 3 of 3 |
| 3 | The Breath | The airways: round black sinkholes in the dark red throat plateau, with thin vapour drifting toward the top of the frame | 28.6, 42.2 | 2 of 3 (one: "Not clearly found") |
| 4 | The Blood Marsh | The red salt flats: a white salt basin in the hips with branching red channels that stain the sea beyond | 62.9, 47.7 | 3 of 3 |
| 5 | The Spine | The storm on the spine ridge: one thunderstorm system standing on the backbone where it crosses the open belly | 53.5, 45.6 | 3 of 3 |
| 6 | The Eye | The round lake in the eye socket: black-blue water with a narrow amber shelf | 20.3, 46.5 | 3 of 3 |

The viewers' positions were all within 6% of the image width of the marks, which was the pass rule fixed beforehand.

#### How each kept frame was made

All generated pieces are from `gpt_image_2_6_sunburst`. No other model was used. The reveal redo used 182 takes in all (494 in round 3). Every take is in `working/takes/`, every prompt in `working/prompts/`, every input window in `working/pull/`.

The method, in one line: one wide picture of the whole body, then every part of it photographed again from closer, then the closer pictures joined back into one large master.

**Step 1. The wide picture: take `cx-e-t2`** (generated 06:54 UTC, 48 s, 1672x941)

- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/cx-e.txt`, full text below
- References passed to the generator, in order:
  1. `working/guides/cx-e-guide.png`: the painted layout: where everything is
  2. `working/real/orb-gemini11-india-crop.jpg`: real photograph, a crop of `orb-gemini11-india.jpg` that leaves out the spacecraft's boom and nose; credit as for the parent: "India and Ceylon as seen from the orbiting Gemini-11 spacecraft.jpg" by NASA, Public domain, https://commons.wikimedia.org/wiki/File:India_and_Ceylon_as_seen_from_the_orbiting_Gemini-11_spacecraft.jpg . Rendering standard only; the prompt says to copy nothing in it.
  3. `working/real/orb-iss23-musandam.jpg`: real photograph, "ISS023-E-33601 - View of Oman - Musandam Peninsula - Persian Gulf - Khawr ash Shamm - Khasab - Jabal Maqlab - Kubbat Ghazira - Gulf of Oman (cropped).jpg" by Earth Science and Remote Sensing Unit, Lyndon B. Johnson Space Center, Public domain, https://commons.wikimedia.org/wiki/File:ISS023-E-33601_-_View_of_Oman_-_Musandam_Peninsula_-_Persian_Gulf_-_Khawr_ash_Shamm_-_Khasab_-_Jabal_Maqlab_-_Kubbat_Ghazira_-_Gulf_of_Oman_(cropped).jpg . Rendering standard only; the prompt says to copy nothing in it.
  4. `working/real/orb-modis-barents-bloom.jpg`: real photograph, "Phytoplankton bloom in the Barents Sea (MODIS 2017-09-14).jpg" by Jeff Schmaltz, MODIS Land Rapid Response Team, NASA GSFC, Public domain, https://commons.wikimedia.org/wiki/File:Phytoplankton_bloom_in_the_Barents_Sea_(MODIS_2017-09-14).jpg . Rendering standard only; the prompt says to copy nothing in it.
  5. `working/real/orb-modis-tstorm-phil-crop.jpg`: real photograph, a crop of `orb-modis-tstorm-phil.jpg` of the storm cells; credit as for the parent: "Thunderstorms-Philippines.jpg" by NASA, MODIS Rapid Response System, Public domain, https://commons.wikimedia.org/wiki/File:Thunderstorms-Philippines.jpg . Rendering standard only; the prompt says to copy nothing in it.
- Image 1, the layout, is `working/guides/cx-e-guide.png`. It is not a generated picture as such: it is the previous master (`master-x1`) reduced to 1672 x 941 with corrections painted on by a script (`working/tools/guide_e.py`) after the blind tests: shoulder joints and collar bones, both arms and both legs redrawn as plain limb bones with hands and feet, the breastbone opened into a through-going strait between two rows of ribs, the storm moved onto the backbone, the salt pan whitened.
- Three takes; take 2 chosen by eye. Tested before anything was built on it (`as1` to `au4`): at 400 px, 3 of 3 fresh viewers named a giant human skeleton; of three viewers given the six descriptions, two found all six places and one found five, with the airways as "possibly found".
- None of its pixels are in the final frames directly. It fixes where everything is.

Prompt `cx-e`:

```text
Image 1 is a working composite of one photograph taken from orbit. It shows a continent in a dark ocean. The continent is a carcass: the dead body of a titan of human shape that fell on its back ages ago, rotted down to the bone where it lay, dried out and weathered into land. Most of Image 1 is finished photograph. Some parts of it have been painted over as plain flat sketches, which show only where things go and what shape they are. The sketched parts are: the upper row of ribs and the black field under them, the dark channel down the middle of the chest, both collar bones and both shoulder joints, the upper bone of the raised arm, the whole of the lower arm with its hand, both legs with their knees and feet, the white cloud on the backbone, and the white pan in the hips. Images 2, 3, 4 and 5 are real photographs taken from spacecraft and satellites. They are the standard for how the whole finished picture must look. Image 2: the height of the camera, the haze and blue cast of the air, how small cloud is. Image 3: bare pale rock in a dark sea seen from orbit: ragged capes, fine valleys with thin shadows, no relief standing up. Image 4: stained sea water and a real band of cloud. Image 5: thunderstorms seen from straight above. Do not copy what Images 2 to 5 show.

Make the one finished photograph: taken from a spacecraft three thousand kilometres above an alien ocean world, looking straight down at the whole continent, late in the day. Natural colour, cold and muted, wide 16:9 frame.

Keep the layout of Image 1 exactly, sketched parts included. Every part stays in the same place, at the same size and at the same angle. At the first glance a viewer must see the skeleton of a huge human body lying on its back, long dead: a skull at the left, two shoulders, two arms each with an elbow and a hand, a rib cage in two rows, a backbone, hips, and two legs each with a knee and a foot. At the second glance they must believe it is a real continent photographed from space.

Keep the finished parts as they are: the skull with its cracked crown, its two round sockets, the round lake with an amber ring in the lower socket, the nose pit, the worn teeth and the fallen jaw; the pitted shelf at the throat; the lower row of ribs; the forearm and clawed hand of the raised arm; the hips; the rust-red plume in the sea; the stained swirls; the spiral storm in the lower right corner; the edge of the planet in the top left corner; the sunglint at the right; the fine cloud over the ocean.

Turn every sketched part into the same real ground as the finished parts. Nothing may stay smooth, flat-coloured, tube-like or drawn. In particular:

1. Limb bones. Each limb bone in the sketch is a long, narrow mountain belt of worn ivory-grey limestone, in the same place and at the same length and angle as in the sketch: a band of hundreds of fine wrinkled ridges and valleys with a little snow on the highest crests, swollen into a knot of peaks at each joint, thin in the shaft, with a ragged coast of capes, bays and spits, a fringe of pale jade shallows, and here and there a narrow gap where the sea has cut through. The two bones of the forearm and of each shin are two unequal ranges side by side. Each hand is five thin crooked chains of capes and islets, half drowned. Each foot is a short block of hills set at a right angle to the shin, ending in five short toe capes. The upper bone of the lower arm and the thigh of the bent leg still carry patches of hide: low, dark, charcoal-brown plateau cracked into polygons like dried mud.

2. Shoulders. At each shoulder a round knot of peaks, with a thin collar-bone ridge running from it in toward the top of the chest. The arms hang from these shoulders, not from the skull; open water and shoals lie between the skull and each shoulder.

3. Ribs and strait. The chest is open. Down its middle, where the breastbone was, runs a strait of dark slate water, straight through from the open sea of the belly at the right, between the two rows of ribs, past the throat and out to the ocean at the lower left. The rib ends stand along both banks of the strait like rows of piers. The ribs are thin curved capes of pale rock, no two alike; two in the upper row are snapped short. Tide streaks and pale shoals mark the strait, and a faint pale line of drowned backbone shows through the water along it.

4. The lava. Under the upper row of ribs, between them, lies a field of matte black lava crust. In it there is one small ember-orange spot with a few hair-thin orange cracks, and one thin, flat, grey-brown streak of fume blown toward the top of the frame. Nothing billows.

5. Backbone and storm. From the end of the strait to the hips the backbone stands out of the sea as a knife ridge with snow along its crest. A thunderstorm sits on the middle of that ridge, where the sketch has the white cloud, seen from straight above as in Image 5: a tight cluster of a few bright white storm tops, lumpy like cauliflower, with soft fibrous edges, piled against both sides of the ridge so that the snowy crest shows through the middle of the cluster; a blue-grey shadow thrown to its left, a faint violet glow inside it, and a thin veil of cloud blowing off toward the lower left. It is small: no wider than the hips. The ridge shows clearly on both sides of it. No drawn lightning bolt. No other large cloud near it.

6. The hips. A basin of brilliant white salt flats, crossed by pools and branching channels of oxblood-red brine, which drains to the right as the rust-red plume.

7. The airways at the throat. Dark round shafts of different sizes in the pale shelf beside the neck, with a wine-red stain round them. From each shaft a thin white streamer of cold vapour lies flat on the surface, all drifting the same way, toward the top of the frame.

8. Where the sketch shows open sea beside these parts, make ordinary open sea with fine cloud. Add no land that is not in Image 1.

The whole picture, finished parts and all, obeys these rules. The body is four thousand kilometres long; from this height land is almost flat. Nothing stands up, nothing is embossed, no bone is a rounded tube lying on the water. Shadows are thin: a hairline of dark on the side of each ridge away from the sun. No smooth, sculpted, polished or plaster surface anywhere. Nothing is as neat as an anatomy chart. All cloud is seen from above and lies flat: fine stipple, thin streets, long curved bands, each puff far smaller than a fingertip of the body. Deep water is nearly black, cold slate blue. The sunglint at the right is a smooth dull pewter sheen with faint slicks and no visible waves or ripples.

The light is the light of late afternoon coming from the right through thin haze, flat and cold; the far left of the frame is dimming toward dusk.

No people, no text, no labels, no borders, no spacecraft parts. Not a sculpture, not a toy, not a relief model, not an anatomy chart, not an illustration: a real photograph of a real world.
```

**Step 2. Twenty-one closer plates: takes `e2-W00-t1` to `e2-W33-t1`, `e2-HD-t1`, `e2-ST-t1`, `e2-WA-t1`, `e2-WF-t1`, `e2-WG-t1`**

- Each plate is one window of `cx-e-t2`, 557 px wide, enlarged 3 times to 1672 x 941 and passed back as Image 1 with the instruction to photograph the same view again from a lower orbit: keep everything where it is, add only what a sharper photograph would show. One take each.
- Sixteen windows (W00 to W33) cover the frame as a 4 x 4 grid with overlaps. Five more are centred on the parts that matter most: the head (HD), the backbone, storm and hips (ST), the lower arm and hand (WA), the bent leg and foot (WF), the straight leg and foot (WG).
- The sixteen grid prompts share one text and differ only in the list of what is in that window. `cxW-W12` is printed below as the example; the others are in `working/prompts/`.
- The plates were tone-matched to the wide picture (low frequencies only) and joined with a multi-band blend along seams in the middle of the overlaps (`working/tools/master.py`; arguments in `working/pull/master-x2.args`). Result: `master-x2`, 5952 x 3348.

| Take | Prompt | Window of `cx-e-t2` (x, y; 557 x 313 px) | Image 1 | Real photographs passed as rendering standards |
|---|---|---|---|---|
| `e2-W00-t1` | `cxW-W00` | 0, 0 | `working/pull/e2-W00-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-gemini11-india-crop.jpg` |
| `e2-W10-t1` | `cxW-W10` | 372, 0 | `working/pull/e2-W10-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-gemini11-india-crop.jpg` |
| `e2-W20-t1` | `cxW-W20` | 743, 0 | `working/pull/e2-W20-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-gemini11-india-crop.jpg` |
| `e2-W30-t1` | `cxW-W30` | 1115, 0 | `working/pull/e2-W30-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-gemini11-india-crop.jpg` |
| `e2-W01-t1` | `cxW-W01` | 0, 209 | `working/pull/e2-W01-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-gemini11-india-crop.jpg` |
| `e2-W11-t1` | `cxW-W11` | 372, 209 | `working/pull/e2-W11-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-gemini11-india-crop.jpg`, `orb-modis-tstorm-phil-crop.jpg` |
| `e2-W21-t1` | `cxW-W21` | 743, 209 | `working/pull/e2-W21-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-modis-barents-bloom.jpg`, `orb-modis-tstorm-phil-crop.jpg` |
| `e2-W31-t1` | `cxW-W31` | 1115, 209 | `working/pull/e2-W31-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-modis-barents-bloom.jpg` |
| `e2-W02-t1` | `cxW-W02` | 0, 418 | `working/pull/e2-W02-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-gemini11-india-crop.jpg` |
| `e2-W12-t1` | `cxW-W12` | 372, 418 | `working/pull/e2-W12-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-gemini11-india-crop.jpg` |
| `e2-W22-t1` | `cxW-W22` | 743, 418 | `working/pull/e2-W22-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-modis-barents-bloom.jpg` |
| `e2-W32-t1` | `cxW-W32` | 1115, 418 | `working/pull/e2-W32-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-modis-barents-bloom.jpg` |
| `e2-W03-t1` | `cxW-W03` | 0, 627 | `working/pull/e2-W03-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-gemini11-india-crop.jpg` |
| `e2-W13-t1` | `cxW-W13` | 372, 627 | `working/pull/e2-W13-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-gemini11-india-crop.jpg` |
| `e2-W23-t1` | `cxW-W23` | 743, 627 | `working/pull/e2-W23-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-modis-barents-bloom.jpg` |
| `e2-W33-t1` | `cxW-W33` | 1115, 627 | `working/pull/e2-W33-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-gemini11-india-crop.jpg` |
| `e2-HD-t1` | `cxW-HD` | 28, 276 | `working/pull/e2-HD-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-gemini11-india-crop.jpg` |
| `e2-ST-t1` | `cxW-ST` | 790, 281 | `working/pull/e2-ST-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-modis-barents-bloom.jpg`, `orb-modis-tstorm-phil-crop.jpg`, `orb-modis-tstorm-hainan.jpg` |
| `e2-WA-t1` | `cxW-WA` | 602, 594 | `working/pull/e2-WA-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-modis-barents-bloom.jpg` |
| `e2-WF-t1` | `cxW-WF` | 1040, 520 | `working/pull/e2-WF-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-modis-barents-bloom.jpg` |
| `e2-WG-t1` | `cxW-WG` | 1115, 130 | `working/pull/e2-WG-crop.jpg` | `orb-iss23-musandam.jpg`, `orb-modis-barents-bloom.jpg` |

Prompt `cxW-W12` (the example of the sixteen grid plates):

```text
Image 1 is a soft, low-resolution enlargement of one part of a photograph taken from very high orbit. It shows part of a continent on an alien ocean world. The continent is the carcass of a titan of human shape that died ages ago and weathered into land: its bare bones are pale mountain belts, what is left of its dried hide is dark plateau, and a dark stained sea lies in and around it. Make the same view again as a sharp photograph taken from a lower orbit, looking straight down. This is the same camera at a lower height; nothing on the ground has moved.

Keep everything exactly where it is in Image 1 and exactly the shape it is: every coastline, bay, cape and island, every ridge, basin and pit, every patch, band and bank of cloud and haze, every change of colour in the sea, the edges of the frame. Keep the colours and the light. Do not move, add or remove any landform or any large cloud. Add only what a sharper, lower photograph would show.

The other images are real photographs taken from orbit. Use them only as the standard for how real land, shallows, deep water and cloud look at this height: flat, fine-grained, slightly hazy. Do not copy what they show.

The frame is about sixteen hundred kilometres wide. At this scale no single hill, cliff, wave or cloud puff can be picked out.
- Pale land is bare limestone mountain country: belts of fine wrinkled ridges cut by hair-thin branching valleys, a dusting of snow on the highest crests, grey scree and pale fans at their feet, salt and sand in the basins. Where Image 1 shows smooth, waxy, carved, scalloped, terraced, cracked or honeycombed surfaces, that is only the softness of the enlargement: replace it with this fine real terrain, keeping the same outlines. Up close nothing looks like bone: no smooth bone surface, no knuckle, no polished knob; each is a mountain range made of thousands of small ridges and valleys.
- Dark red-brown land is low plateau, the dried hide: charcoal brown, rust and dull oxblood, finely dissected by branching dry valleys and thin washes, with dark screes, its edges breaking down into the sea in cliffs, stacks and reefs. No bold cracks and no polygon pattern.
- Relief is flat to the eye, as it is from orbit. Nothing is embossed, carved, sculpted, polished or shiny, and nothing stands up like a model. The land shows by its colour, not by shading: a ridge is a hair of light on its sunward side and a hair of soft blue-grey shade on the other, no darker than the sea. A thin blue-grey haze of air lies over everything and lowers the contrast of the land.
- Coasts are ragged and real, with coves, spits, lagoons, reefs and small islands, fringed with pale jade-grey shallows of uneven width that fall away into deep water that is nearly black, a cold slate blue. Stained water keeps its milky green, ochre and rust swirls, with fine filaments and eddies inside them.
- All cloud is seen from above and lies flat: very fine white stipple, thin streets, soft bands, fog in bays, each puff tiny with a pin-prick shadow. No cloud looks like smoke, steam or a blast. The sun is low, to the right. Where the sea shines with the sun's glint, the shine is one smooth, even, soft silver-grey sheen with no ripples, bands or texture.

What is in this frame:
- Top left: the back of the jaw of the skull massif, and a channel of deep dark water running down to the left into the open ocean.
- Across the top of the frame: the strait, a dark sea channel; at its right end the backbone, a thin pale knife ridge, and at the top right corner the lower edge of a white storm cloud and its soft shadow on the sea.
- Centre: the lower half of the rib cage: nine or ten thin pale rib ranges side by side, slanting down to the right from the channel, with dark water and jade shallows between them, and patches of dark red-brown plateau webbing the gaps near their roots.
- Left of centre a pale shoulder knot, and from it the second arm: a broad pale range running down toward the bottom right, with long fine parallel ridges along it.
- Bottom and left: open dark ocean under fields and thin streets of very fine cloud.

A real photograph through the window of a spacecraft: natural colour, cold, slightly muted by haze, sharp from edge to edge. No people, no text, no labels, no borders. Not a sculpture, not a relief model, not an anatomy chart, not an illustration.
```

**Step 3. The Heart lights (not generated)**

- The plate had one ember in the black crust under the upper ribs. A script (`working/tools/heart_x2.py`) adds light only: a warm core and faint halo on that ember and a few much smaller sparks on the darkest spots of the crust near it. Nothing else in the picture is drawn by hand or by script. Result: `master-x2h`.
- Reason: fresh viewers could not find "a glow of lava in the chest" in earlier versions when it was small, and called it too large for daylight when the generator drew it. This keeps it small and findable. One viewer of the final set still calls it too large for daylight.

**Step 4. Two correction plates: takes `e3-HD-t4` (head) and `e3-ST-t1` (storm)**

Set x2 was tested on fresh viewers (see the tests). Two things failed: the head read as carved (even peg teeth, a straight crack, a perfectly round pit), and the storm read as an eruption or explosion to 4 of 6. Each was re-photographed once more with only those things changed.

`e3-HD-t4` (generated 07:32 UTC, 48 s, 1672x941): the head.

- Prompt: `working/prompts/cxW-HD3.txt`, full text below
- References, in order:
  1. `working/pull/e3-HD-crop.jpg`: the head window of the master (`master-x2h`), enlarged: the picture being photographed again
  2. `working/real/orb-iss23-musandam.jpg`: real photograph, "ISS023-E-33601 - View of Oman - Musandam Peninsula - Persian Gulf - Khawr ash Shamm - Khasab - Jabal Maqlab - Kubbat Ghazira - Gulf of Oman (cropped).jpg" by Earth Science and Remote Sensing Unit, Lyndon B. Johnson Space Center, Public domain, https://commons.wikimedia.org/wiki/File:ISS023-E-33601_-_View_of_Oman_-_Musandam_Peninsula_-_Persian_Gulf_-_Khawr_ash_Shamm_-_Khasab_-_Jabal_Maqlab_-_Kubbat_Ghazira_-_Gulf_of_Oman_(cropped).jpg . Rendering standard only; the prompt says to copy nothing in it.
  3. `working/real/orb-gemini11-india-crop.jpg`: real photograph, a crop of `orb-gemini11-india.jpg` that leaves out the spacecraft's boom and nose; credit as for the parent: "India and Ceylon as seen from the orbiting Gemini-11 spacecraft.jpg" by NASA, Public domain, https://commons.wikimedia.org/wiki/File:India_and_Ceylon_as_seen_from_the_orbiting_Gemini-11_spacecraft.jpg . Rendering standard only; the prompt says to copy nothing in it.
- Five takes with two wordings (`cxW-HD2` for takes 1 and 2, `cxW-HD3` for takes 3 to 5). Takes 2 to 5 were each shown to three fresh viewers as frame 2 (`bd1` to `bh3`). Take 2 lost the skull for two of three (a reptile's head, a fish or bird head). Takes 3, 4 and 5 kept it for all three. Take 4 was chosen from those by eye.

Prompt `cxW-HD3`:

```text
Image 1 is a photograph taken from orbit, looking straight down. It shows part of a continent on an alien ocean world. The continent is the carcass of a titan of human shape that died ages ago and weathered into land: its bare bones are pale mountain belts, what is left of its dried hide is dark plateau, and a dark stained sea lies in and around it. This part is the head: a pale massif about nine hundred kilometres long, in the shape of a skull seen from above. Make the same photograph again with four corrections, listed below. Everything else stays exactly as it is in Image 1.

Keep exactly where it is and exactly the shape it is: the outline of the massif and every coast, bay, cape and island; the two eye-socket basins, both dark, the upper one a sunken basin holding a dark pool, as dark and as large as in Image 1; the perfectly round lake in the lower basin, with its narrow amber shelf, its black-blue centre, its ivory cliff rim and the tongue of amber shallows that curls in at its lower left; the dark nose pits; the open mouth as a dark bay; the dark red-brown plateau at the right with its round black sinkholes and its thin white vapour; the pale shoulder knots at the right edge; the cloud over the ocean; the colours of the sea; the light; the edges of the frame.

The four corrections. In Image 1 these parts look like a small carved object. At this scale they cannot be real, so change them:
1. The crack across the crown. In Image 1 it is a thin black line of even width, like a crack in plaster. On a massif this size a crack is a great rift valley. Replace it, along the same course, with a rift valley: a long ragged fault-walled valley, widest at the left coast, where the sea runs up it as a narrow inlet of dark water, and narrowing inland. Its floor is low pale ground with a braided dry riverbed, two or three long thin lakes and pale fans; its walls are broken by side canyons, landslips and scree. The short crack that crosses it becomes two side valleys that join it. The branch that runs down to the rim of the round lake becomes a river gorge that cuts through the rim and ends in a small pale delta in the amber shallows. Nowhere a line of even width, nowhere pure black, no sharp zigzag.
2. The teeth. In Image 1 both jaws carry rows of rounded pegs of equal size at equal spacing, like moulded teeth. Keep both rows, with the same number of teeth in the same places, so that from this height the two jaws still read at once as rows of teeth round an open mouth. Change only what each tooth is made of: every one becomes a piece of real eroded coast, a ragged rocky headland or sea stack with its own outline, some long, some worn short, two or three broken off low to a reef, each with scree at its foot and pale shoals round it, and narrow dark channels of sea between them. None rounded, none like a peg, a pillar or a knob, no two alike.
3. The small dark round pit just right of the round lake. Make it a small sinkhole lake with a ragged, uneven shore, not a circle.
4. The drainage. In Image 1 the fine ridges all run the same way, like a pattern. Make the valleys drain: they run downhill from the high ground into the eye basins, into the rift and out to the coasts, joining like river systems, with pale fans where they reach a shore.

Images 2 and 3 are real photographs taken from orbit. Use them only as the standard for how real land, coast, shallows and deep water look at this height: flat, fine-grained, slightly hazy. Do not copy what they show.

The land of the massif stays as pale as it is in Image 1: bone ivory and grey-white, with brown only in the hollows. The frame is about sixteen hundred kilometres wide. At this scale no single hill, cliff, wave or cloud puff can be picked out. Relief is flat to the eye, as it is from orbit: nothing is embossed, carved, sculpted, polished or shiny, and nothing stands up like a model. A ridge is a hair of light on its sunward side and a hair of soft blue-grey shade on the other, no darker than the sea. A thin blue-grey haze of air lies over everything and lowers the contrast of the land. Cloud lies flat, as very fine white stipple and thin streets. The sun is low, to the right.

A real photograph through the window of a spacecraft: natural colour, cold, slightly muted by haze, sharp from edge to edge. No people, no text, no labels, no borders. Not a sculpture, not a relief model, not an anatomy chart, not an illustration.
```

`e3-ST-t1` (generated 07:27 UTC, 44 s, 1672x941): the storm on the backbone.

- Prompt: `working/prompts/cxW-ST2.txt`, full text below
- References, in order:
  1. `working/pull/e3-ST-crop.jpg`: the backbone window of the master (`master-x2h`), enlarged: the picture being photographed again
  2. `working/real/orb-iss23-musandam.jpg`: real photograph, "ISS023-E-33601 - View of Oman - Musandam Peninsula - Persian Gulf - Khawr ash Shamm - Khasab - Jabal Maqlab - Kubbat Ghazira - Gulf of Oman (cropped).jpg" by Earth Science and Remote Sensing Unit, Lyndon B. Johnson Space Center, Public domain, https://commons.wikimedia.org/wiki/File:ISS023-E-33601_-_View_of_Oman_-_Musandam_Peninsula_-_Persian_Gulf_-_Khawr_ash_Shamm_-_Khasab_-_Jabal_Maqlab_-_Kubbat_Ghazira_-_Gulf_of_Oman_(cropped).jpg . Rendering standard only; the prompt says to copy nothing in it.
  3. `working/real/orb-modis-barents-bloom.jpg`: real photograph, "Phytoplankton bloom in the Barents Sea (MODIS 2017-09-14).jpg" by Jeff Schmaltz, MODIS Land Rapid Response Team, NASA GSFC, Public domain, https://commons.wikimedia.org/wiki/File:Phytoplankton_bloom_in_the_Barents_Sea_(MODIS_2017-09-14).jpg . Rendering standard only; the prompt says to copy nothing in it.
  4. `working/real/orb-modis-tstorm-phil-crop.jpg`: real photograph, a crop of `orb-modis-tstorm-phil.jpg` of the storm cells; credit as for the parent: "Thunderstorms-Philippines.jpg" by NASA, MODIS Rapid Response System, Public domain, https://commons.wikimedia.org/wiki/File:Thunderstorms-Philippines.jpg . Rendering standard only; the prompt says to copy nothing in it.
  5. `working/real/orb-modis-tstorm-hainan.jpg`: real photograph, "Scattered Thunderstorms over Hainan island 2012 5 21.jpg" by NASA, MODIS Rapid Response System, Public domain, https://commons.wikimedia.org/wiki/File:Scattered_Thunderstorms_over_Hainan_island_2012_5_21.jpg . Rendering standard only; the prompt says to copy nothing in it.
- Two takes. Take 1 was kept: a flat anvil line with its shadow on the sea instead of a ball with rays.

Prompt `cxW-ST2`:

```text
Image 1 is a photograph taken from orbit, looking straight down. It shows part of a continent on an alien ocean world. The continent is the carcass of a titan of human shape that died ages ago and weathered into land: its bare bones are pale mountain belts, what is left of its dried hide is dark plateau, and a dark stained sea lies in and around it. This part is the backbone and the hips. Make the same photograph again with one correction, described below. Everything else stays exactly as it is in Image 1.

Keep exactly where it is and exactly the shape it is: the thin pale knife ridge of the backbone, with snow on its crest, running from the left to the hips; the thin rib ranges at the left edge, above and below it; the hips, a pale mountain mass with a round white salt flat in its middle, veined with branching channels of dark oxblood-red water, and the small round dark lake on its upper right rim; the two pale thigh ranges that leave the hips to the right; the long plume of rust-red and ochre water streaming to the right and the swirls of milky green; the fine cloud stipple over the sea; the colours; the light; the edges of the frame.

The one correction is the storm on the backbone, left of centre. In Image 1 it is a round ball of puffy cloud with rays around it and a long grey streak trailing away to the lower left, and it looks like an explosion or a volcanic plume. It is a thunderstorm, and from straight above thunderstorms look like the ones in Images 4 and 5. Replace it, in the same place, with a real thunderstorm complex caught on the ridge: a line of four or five storm cells strung along the crest, their tops spread flat and merged into one long bright white anvil sheet that lies along the ridge, about twice as long as it is wide, a little longer than the cloud in Image 1 and no wider. The sheet is flat and smooth, like a slab of white cirrus with a soft clean edge. It is not a ball and it has no rays. A few small tight cauliflower domes push up through it along its middle line. Because the sun is low at the right, the whole sheet throws one shadow: a clean dark band on the sea and on the ridge all along its left side. Inside the cloud, in three places, a soft violet-white glow of lightning shows through. The ridge runs in under the cloud at its left end and comes out from under it at its right end. Remove the long grey streak that trails to the lower left in Image 1 completely, and show open dark sea with fine cloud stipple there instead. Nothing trails, streams, fans or blows away from the storm. No column, no plume, no ash, no smoke, no fire, no blast, no rays.

Images 2 and 3 are real photographs taken from orbit. Use them only as the standard for how real land, shallows, deep water and cloud look at this height: flat, fine-grained, slightly hazy. Images 4 and 5 are real photographs of thunderstorms taken from orbit: use them as the standard for how the storm looks. Do not copy what any of them show.

The frame is about sixteen hundred kilometres wide. At this scale no single hill, cliff, wave or cloud puff can be picked out. Relief is flat to the eye, as it is from orbit: nothing is embossed, carved, sculpted, polished or shiny, and nothing stands up like a model. A thin blue-grey haze of air lies over everything and lowers the contrast of the land. All other cloud lies flat, as very fine white stipple and thin streets. The sun is low, to the right.

A real photograph through the window of a spacecraft: natural colour, cold, slightly muted by haze, sharp from edge to edge. No people, no text, no labels, no borders. Not a sculpture, not a relief model, not an anatomy chart, not an illustration.
```

Both plates were graded back to the tone of the window they were shot from (`working/tools/grade_plate.py`: one straight-line fit per colour channel on blurred copies, so only tone changes) and folded into the master (`working/tools/inset.py`). Result: `master-x4`.

**Step 5. The frame 1 plate: take `pb1e-t1`** (generated 07:41 UTC, 34 s, 1672x941)

- What it is: the lake window of the master (148 px of the wide frame at that stage) enlarged 3.76 times and re-photographed from lower, with a river gorge and delta, an uneven rim, wind slicks and a few streets of minute cloud.
- Prompt: `working/prompts/pb1-e.txt`, full text below
- References, in order:
  1. `working/pull/f1-x4-crop.jpg`: the lake window of the master, enlarged: the picture being photographed again from closer
  2. `working/real/orb-iss44-sinai.jpg`: real photograph, "ISS-44 Sinai Peninsula.jpg" by NASA/Scott Kelly, Public domain, https://commons.wikimedia.org/wiki/File:ISS-44_Sinai_Peninsula.jpg . Rendering standard only; the prompt says to copy nothing in it.
  3. `working/real/orb-iss42-richat.jpg`: real photograph, "ISS-42 Richat Structure, Eye of the Sahara.jpg" by NASA, Public domain, https://commons.wikimedia.org/wiki/File:ISS-42_Richat_Structure,_Eye_of_the_Sahara.jpg . Rendering standard only; the prompt says to copy nothing in it.
- Three takes; take 1 kept. Two takes with a cloud-free wording (`pb1f`) were not used.
- Graded and folded back into the master so that frame 1, reduced, equals its window (`master-x4f`). This plate is key frame 1, unchanged since.

Prompt `pb1-e`:

```text
Image 1 is a soft, low-resolution enlargement of one small part of a photograph taken from orbit. It shows a round lake the size of a small sea, lying in a round basin on a bare, bone-pale massif. Make the same view again as a sharp photograph taken from a lower orbit, looking straight down. This is the same camera on its way up from the lake; nothing on the ground has moved.

Keep everything exactly where it is in Image 1 and exactly the shape it is: the round outline of the lake; the shelf of amber shallows inside its shore, wide on the left and along the bottom, and the tongue of amber shallows that curls in at the lower left; the black-blue deep water; the pale rim around the lake; the river gorge that comes down from the top edge, left of centre, and meets the lake at its upper left shore; the ridges and branching valleys outside the rim; the second basin at the top right with its two dark pools; the small dark lake to the right of the round lake, lower down; the dark sea inlet at the bottom right corner; the edges of the frame. Keep the colours and the light. Do not move, add or remove any landform. Add only what a sharper photograph would show.

What the sharper photograph shows:
- The water: black-blue, almost black in the middle, calm. Across it lie a few long, faint, pale wind slicks, hair-thin and slightly curved, barely lighter than the water.
- The shallows: just inside the shore, an uneven shelf of amber and ochre water, wide in some places and pinched in others, ending at a ragged line where the bottom drops away, with fine paler sandbars and darker weed patches in it. One colour family only, amber to ochre. Not concentric coloured rings.
- The gorge and its delta: the gorge is a real river canyon with a thread of dull water in it. Where it reaches the lake it has cut the rim down to the water and built a small pale delta of fine branching channels into the amber shallows.
- The rim: a belt of pale ivory cliffs and broken ground around the lake, a few kilometres wide and uneven: higher and sheer on the right, lower and broken on the left, notched by dozens of tiny gullies, with landslip scars and scree fans that reach the water in three or four places. It is not a wall of one height and one width.
- A thin white mist lies on the water along the foot of the cliff at the upper right and trails a short way out over the lake, half transparent.
- Outside the rim: bare pale mountain country, grey-white and ivory, stained brown in the hollows. Its valleys are whole river systems, each with hundreds of hair-fine branches, and they drain downhill: toward the lake, toward the other basins and toward the sea inlet, with small pale fans where they end.
- The small dark lake on the right has a ragged, uneven shore with a thin pale beach. It is not a circle.
- Over the lower right of the frame drift three or four thin, broken streets of minute white cloud dots, each dot no bigger than a grain of salt, each with its own pin-prick shadow beside it. They are the only cloud.

Images 2 and 3 are real photographs taken from orbit. Use them only as the standard for how real bare mountains, drainage and water look from this height: flat, very fine-grained, slightly hazy. Do not copy what they show.

The frame is about three hundred and sixty kilometres wide and the lake about a hundred and forty kilometres across. Everything is seen at that scale: the grain of the land is very fine, and single cliffs, boulders, hills and trees are far too small to see. Relief is flat to the eye, as it is from orbit: nothing is embossed, carved, sculpted or shiny, and nothing stands up like a model. A thin blue-grey haze of air lies over everything. The sun is low and to the right: the cliffs on the right-hand shore lay a thin soft shadow on the water at their foot, and the ground on the left of the lake stands in full warm light.

A real photograph through the window of a spacecraft: natural colour, slightly muted by haze, sharp from edge to edge. No animals, no people, no boats, no buildings, no roads, no text, no labels, no borders. Not a volcano crater, not a hot spring, not a pool, not a model, not an illustration.
```

**Step 6. The head brought to adult proportion (not generated)**

- Three fresh viewers were asked to compare the body in frame 4 with an adult human skeleton, part by part (`bt1` to `bt3`). All three said the head was too big; two said it made the figure look cartoonish or childlike.
- One smooth warp of the whole master shrinks the head to 0.66 of its size about a point at the base of the skull and moves that point toward the crown by 18 px of a 1,429 px wide view, which lengthens the neck (`working/tools/headwarp.py`, tag c; report in `working/pull/headwarp-c.json`). No cut, no paste, no generation. Around the head the displacement falls away smoothly to zero at the shoulders, the ribs and the planet's edge.
- MEASURED on the warp field: it does not fold anywhere (the smallest local area factor is 0.436, which is the head itself, 0.66 squared); the largest stretch outside the head is 1.58 times, in the sea beside the crown; the 95th percentile of the stretched area is 1.40. A strip slid in from outside the picture, 19 px wide at the left and 10.7 px at the top of that 1,429 px view, and is cropped off, which is why frame 4 is now a window of the master and not the whole of it.
- The windows of frames 1 and 2 were scaled with the head (0.66 times), so those two frames show exactly what they showed before. Frame 3 was re-cut narrower (835 px of the wide frame, from 1,000) so that the head, both shoulders and the upper ribs still fill it. Frame 4 lost only the cropped strip.
- After the warp: 2 of 3 new viewers call the head right, 1 "slightly too big", none childlike (`by1` to `by3`).

**Step 7. The frame 2 plate after the warp: take `pb2g-t2`** (generated 08:12 UTC, 38 s, 1671x941)

- The head in frame 2 is drawn straight from the old master through the warp, so it is pixel for pixel the head that was tested before. The sea, the throat and the corners around it had been enlarged 1.6 to 2.4 times by the warp and were soft. They were re-photographed once so that they are sharp again.
- Prompt: `working/prompts/pb2-x6.txt`, full text below
- References, in order:
  1. `working/pull/f2-x6-direct.jpg`: the frame 2 window drawn from the master through the head warp: the picture being photographed again
  2. `working/real/orb-iss23-musandam.jpg`: real photograph, "ISS023-E-33601 - View of Oman - Musandam Peninsula - Persian Gulf - Khawr ash Shamm - Khasab - Jabal Maqlab - Kubbat Ghazira - Gulf of Oman (cropped).jpg" by Earth Science and Remote Sensing Unit, Lyndon B. Johnson Space Center, Public domain, https://commons.wikimedia.org/wiki/File:ISS023-E-33601_-_View_of_Oman_-_Musandam_Peninsula_-_Persian_Gulf_-_Khawr_ash_Shamm_-_Khasab_-_Jabal_Maqlab_-_Kubbat_Ghazira_-_Gulf_of_Oman_(cropped).jpg . Rendering standard only; the prompt says to copy nothing in it.
  3. `working/real/orb-gemini11-india-crop.jpg`: real photograph, a crop of `orb-gemini11-india.jpg` that leaves out the spacecraft's boom and nose; credit as for the parent: "India and Ceylon as seen from the orbiting Gemini-11 spacecraft.jpg" by NASA, Public domain, https://commons.wikimedia.org/wiki/File:India_and_Ceylon_as_seen_from_the_orbiting_Gemini-11_spacecraft.jpg . Rendering standard only; the prompt says to copy nothing in it.
- Two takes; take 2 kept. Only the parts outside the head are used from it (61% of the frame). The head comes from the direct drawing inside a mask along its coast (`working/tools/f2_merge.py`, `working/pull/f2-x6-direct-headmask.png`).
- Graded, merged and folded back into the master. Result: `master-x6`, the master of the kept set.

Prompt `pb2-x6`:

```text
Image 1 is an enlargement of one part of a photograph taken from orbit. It shows the head of a continent on an alien ocean world: a bare, bone-pale massif in the shape of a skull seen from above, lying in a dark sea. The middle of Image 1 is already sharp. Its left side, its corners and its right side are soft and blurred, because they were enlarged more. Make the same view again as one sharp photograph taken from a lower orbit, looking straight down. This is the same camera at a lower height; nothing on the ground has moved.

Keep everything exactly where it is in Image 1 and exactly the shape it is: the outline of the massif and every coast, bay, cape and island; the perfectly round lake with its narrow amber shelf, its black-blue centre and its pale cliff rim; the second basin above it with its dark pool; the small dark pits; the river gorge that runs down to the round lake; the open mouth as a dark bay ringed by ragged headlands; the dark red-brown plateau at the right with its round black sinkholes; the thin white vapour that curls from the plateau up to the top edge; every patch of cloud over the sea, in the same place and of the same extent; the colours of the sea; the light; the edges of the frame. Do not move, add or remove any landform or any patch of cloud. Add only what a sharper photograph would show.

What the sharper photograph shows in the soft parts:
- The sea at the left and in the corners: deep water, nearly black, a cold slate blue. The cloud over it lies in the same places as in Image 1, but in Image 1 each patch is a blurred white blob; that is only the softness of the enlargement. Each patch is really a field of hundreds of minute white cloud dots in thin broken streets, each dot no bigger than a grain of salt, each with a pin-prick shadow beside it, and dark sea showing between the dots. No big soft puff, no smooth white blob, no fog bank, no cotton wool.
- The shallows round the massif: pale jade-grey water of uneven width with fine shoals and reefs, falling away into the deep water.
- The plateau at the right: low dark red-brown ground, charcoal brown, rust and dull oxblood, finely dissected by branching dry valleys and thin washes. Its black sinkholes stay where they are and as large as they are; each has a ragged broken rim with scree, no two alike, and from a few of them a thread of white vapour lies flat on the wind.
- The pale ground at the right edge and along the bottom is bare limestone mountain country: belts of fine wrinkled ridges cut by hair-thin branching valleys, with grey scree and pale fans at their feet.

Images 2 and 3 are real photographs taken from orbit. Use them only as the standard for how real land, coast, shallows, deep water and cloud look at this height: flat, fine-grained, slightly hazy. Do not copy what they show.

The frame is about nine hundred kilometres wide and the round lake about a hundred kilometres across. At this scale no single hill, cliff, wave or cloud puff can be picked out. Relief is flat to the eye, as it is from orbit: nothing is embossed, carved, sculpted, polished or shiny, and nothing stands up like a model. A ridge is a hair of light on its sunward side and a hair of soft blue-grey shade on the other, no darker than the sea. A thin blue-grey haze of air lies over everything and lowers the contrast of the land. The sun is low, to the right.

A real photograph through the window of a spacecraft: natural colour, cold, slightly muted by haze, sharp from edge to edge. No people, no text, no labels, no borders. Not a sculpture, not a relief model, not an anatomy chart, not an illustration.
```

**What each kept frame is made of**

- Key frame 1: the plate `pb1e-t1`, graded. It also sits in the master, reduced.
- Key frame 2: head from `e3-HD-t4` (with the round lake area from `pb1e-t1` reduced into it); sea, throat and corners from `pb2g-t2`.
- Key frame 3: a window of the master: the head, the throat and the sea round them as in frame 2; neck, shoulders and ribs from the grid plates; the Heart lights from the script. `e2-HD-t1` was replaced by `e3-HD-t4` over the same window.
- Key frame 4: a window of the master, 98.7% of its width: all of the above, plus the storm from `e3-ST-t1` (only the box round the storm is used from it), the backbone, hips and salt flats from `e2-ST-t1`, the lower arm and both lower legs from `e2-WA-t1`, `e2-WF-t1` and `e2-WG-t1`, and everything else from the grid plates.
- Cut and checked by `working/tools/cut_frames3.py`; windows in `working/pull/frames-x6.json`.

#### The tests

Protocol: `working/critics/fresh/PROTOCOL.md`, fixed before results came in. Viewers are newly started agents on separate machines, each given one image with a meaningless file name and a short brief. The kept set was tested on three models (`gpt_6_2_sol`, `claude_opus_5_5`, `gemini_4_carbon`); some earlier rounds also used `claude_sonnet_5_5`, `gemini_neon` and `grok_4_7`. The model of every viewer is in `replies.json`. They are told nothing about the film. Each sees one image once. Every reply is saved unedited in `working/critics/fresh/replies/` (one file per viewer, 263 in all) with the image it saw in `working/critics/fresh/seen/`.

An agent cannot glance for two seconds. The stand-in is GLANCE: the picture at 400 px wide and one open question. **The two-second read by a person is UNKNOWN.** It has not been tested on a person.

Results for the kept set (x6), MEASURED, 26 viewers (`bu1` to `cb2`):

| Test | What was asked | Result |
|---|---|---|
| GLANCE, frame 4 at 400 px | "What is this a picture of?", one sentence | 3 of 3 name a giant human skeleton in the ocean seen from space. One of the three took it for "cloud and wave patterns" forming the skeleton, not land. |
| FULL, frame 4 | Five questions: what, how big, which of landmass from orbit / small island from an aircraft / tabletop model / painting, features, what looks wrong | 6 of 6 pass the rule set beforehand: a human-shaped landmass, answer (a) a landmass seen from orbit, and a size of thousands of kilometres. 3 of the 6 add that it is a digital illustration and not a photograph. "Nothing suggests a tabletop scale" (`bv1`). |
| STATE, frame 4 | What state is the body in; three mood words; 1 (calm) to 5 (disturbing) | 3 of 3: dead, sprawled on its back ("split at the waist", "mouth gaping open"). Moods: eerie, surreal, ominous / eerie, ominous, desolate / eerie, macabre, desolate. Scores 4, 4, 4. |
| PLACES, frame 4 | The six places in the user's words; find each and give its position | 6 of 6, 5 of 6, 6 of 6. Every place found by at least 2 of 3. |
| PROPORTION, frame 4 | Compare with an adult human skeleton, part by part | Head right 2 of 3, slightly too big 1 of 3; none childlike. Waist too long 3 of 3. Neck too short 2 of 3. Legs too short 2 of 3. Hands too big 3 of 3. Feet small 3 of 3. |
| SCALE, frame 3 | What, how wide, which of real terrain / tabletop model / close-up of a small object / painting | (a) real terrain 2 of 3; 1 of 3 says (d) a digital picture imitating orbital terrain, "fake/synthetic rather than small-scale". None reads a fish. Widths 100 to 300 km and "several hundred". |
| HEAD, frame 2 | What, does the land look like anything, how wide, which of the four | 3 of 3 see a skull or a screaming face with the lake as an eye. (a) 2 of 3 (one leaning to digital art), (d) 1 of 3. Widths 40 to 150 km. One names round pits and lace-like texture as "possibly artificial or miniature". |
| SCALE, frame 1 | As above (run on the same picture in the round before, `bo1` to `bo3`) | (a) 3 of 3, one leaning to digital art. Widths 10 to 60 km. "No definitive miniature cue." |
| PULL, frames 1 to 4 | Two critics told it is one move, asked to attack the joins | Both find every frame inside the next. `cb1`: "nested to visual precision", "no credible relocated/deleted landforms". Differences they name are under known faults. |

How the creepiness moved, MEASURED on the same STATE brief, three viewers each:

| Body | Disturbing, 1 to 5 | In their words |
|---|---|---|
| The body before the note (`f4-v8t15`): a whole figure lying in the sea | 3, 4, 4 | "motionless, lying on its back with its limbs splayed"; "majestic" among the mood words |
| First carcass takes (`cx-t2`, `cx-t6`, `cx-t9`) | 4, 4, 4 each | "long dead and decayed", "jaw gaping open" |
| Kept set (x6) | 4, 4, 4 | "dead/decayed, split at the waist", "contorted posture" |

The change is real but modest on this scale: one viewer moved from 3 to 4 and no viewer gives 5. Viewers say the orbital distance tempers it.

Earlier test rounds on the way, all MEASURED and all saved:

- GLANCE at 400 px passed for every body tested in the redo, from the first (`rv4-t8`, `rv4-t10`) to the last: 45 of 45 one-sentence replies name a human body, figure or skeleton (counted by script against the words in the pass rule, and read through by me).
- The first body (`rv4-t23`) and its sets v3 to v8: head, scale, places and pull-back tests drove six rebuilds (viewers `a1` to `ag3`). Dropped as a whole after the note of 06:03 UTC.
- Set x2 (`av1` to `bc2`): GLANCE 3 of 3, FULL 6 of 6 on the pass rule; the head read as carved and the storm as an eruption or explosion to 4 of 6. Led to step 4.
- Set x4 (`bi1` to `bp2`): GLANCE 3 of 3, FULL 6 of 6, STATE 4, 4, 4, PLACES 6, 5 and 6 of 6. Frame 3 drew "a giant fish skeleton" from one of three viewers, and a second said its ridges "look like fish-bone or feathers": with the head at the far left and only ribs beside it, no shoulder was in view. Three other windows for frame 3 were each shown to three new viewers (`bq1` to `bs3`). The widest (A) drew one "fishbone/ribcage" remark and two answers of "a painting or drawing". The narrowest (B) drew no fish remark but widths of only 100 to 300 km. The middle one (D), with both shoulders in view, drew no fish remark, two answers of real terrain out of three, and widths from "hundreds of kilometers" to 1,500 km. D was adopted, by my choice on those answers; no pass mark had been fixed for this comparison.
- PROPORTION on that set (`bt1` to `bt3`): head too big 3 of 3. Led to step 6.

#### Decisions, in order

- 03:10 UTC. New start. Pose: on its back, head left, one arm raised, one knee bent, so that the outline reads at once and no two limbs lie alike.
- 03:27 to 03:48. First body: 24 takes on five procedural layout maps (`rv4`). `rv4-t23` chosen.
- 03:51 to 06:02. Pull-back built on that body by re-photographing windows from closer (masters v1 to v8; takes `pb3`, `tile`, `pb2`, `pb1`, `bl`, `fl`, `fu`, `hl`, `hu`, `cs`, `sm`). Tested six times on fresh viewers and rebuilt each time.
- 06:03. The user's note: the titan "is just laying down in the ocean" and "doesn't look decomposed or creepy enough". Read as "decomposed". The whole first body was dropped, with its eight masters. Nothing of it is in the kept frames.
- 06:12 to 06:20. The carcass: 14 takes from text and real orbital photographs only (`cx`). Viewers flagged the first ones as sculpted, so they were re-photographed toward real orbital photography. `cx-t9` chosen.
- 06:24 to 06:39. Master built on `cx-t9` (`master-c1`, then `master-x1` with more ocean round it) and tested (`ao1` to `ar3`). The skeleton read at once. The corrections the tests asked for: shoulder joints and collar bones, plainer limbs with hands and feet, a through-going strait between two rows of ribs, the storm on the backbone, a whiter salt pan.
- 06:54. Those corrections painted into a layout and the wide picture made again from it (`cx-e`, step 1 above).
- 07:05 to 07:15. Set x2 built (steps 2 and 3) and tested.
- 07:25 to 07:42. Head and storm corrected (step 4), new frame 1 plate (step 5): set x4. Tested.
- 07:45 to 07:55. Frame 3 widened to bring both shoulders in, after one viewer read it as a fish skeleton (set x5).
- 07:55 to 08:13. Head brought to adult proportion (steps 6 and 7): set x6. Tested on 26 new viewers.
- 08:19. Decision to stop here and hand over, with the long waist left as it is. See "What was not changed".

#### Known faults

Named by viewers and critics, or seen by me. None is hidden.

- Every viewer says "skeleton". The brief said "not a statue or a clean skeleton". Direction B (the body is the land, bare as geology) and the note asking for more decomposition both point to bare bone, and viewers also say landmass, islands, mountain ridges. Whether this is weathered enough is a judgement for the user, not a measured pass.
- Half the FULL viewers call frame 4 digital art rather than a photograph, and all say a body-shaped coast is impossible. They accept the orbital scale; they do not take it for a real place.
- The lower frames are read much smaller than intended: frame 3 at 100 to 300 km against 2,150 km stated, frame 2 at 40 to 150 km against 920, frame 1 at 10 to 60 km against 250. They pass "not a miniature" on the answers given, but frame 2 is the weakest: one of three chose "a painting or drawing", one said the round pits and lace-like texture were "possibly artificial or miniature", and a critic said it "risks reading as a macro shot of an object". A critic said frame 1 is "vulnerable to macro/model" reads as "stone/resin".
- Proportions: the waist reads too long to 3 of 3 (two would fix that first). The legs read short, the hands long, the feet small. The neck reads short to two and long to one.
- The storm covers the backbone where it stands clear, so some viewers see "no bony spine, a cloud in its place". One calls the storm plume "puffy… like local smoke seen from a plane"; a critic calls the cloud at the waist "like a cotton wad".
- The red channels in the hips read as blood, veins or "poured dye on a miniature". That is close to the place's name, but it is also the feature most often called fake.
- The lava glow is still called too large for daylight by one viewer.
- Anatomy is too exact in places: five fingers, toes, teeth.
- Terrain texture: "small procedural heightmap scaled up", "uniform crinkled texture", "lace-like". The cyclone at the bottom right is called "oddly small". Cloud wisps off the skull read "like hair".
- The body does not foreshorten with the curve of the planet as a real coast would at this size.
- The pull-back: frame 1 has a mist plume, a cliff wall, a brown rim and whitecaps that frame 2 shows softer, as it must at 3.65 times less detail, and the critics see it. Frame 2 has "glittery, sugar-like" specks of cloud where frame 3 shows larger clumps. Frame 3 shows several orange dots where frame 4 shows one. Frames 1 to 3 look straight down and frame 4 is oblique.
- Around the head the sea is stretched by up to 1.58 times by the warp. It was re-photographed in frame 2; in frames 3 and 4 it is the stretched master.
- At 400 px one viewer in three takes the body for cloud and wave patterns.

#### What was not changed, and why

- The waist. It reads long, and it could be shortened with the same kind of warp. It was left because the open stretch of backbone between ribs and hips is The Spine: shortening it would cost the ridge its length and squash the storm that stands on it. Viewers who were not asked about proportions did not raise it. It is the first thing to change if the user wants the figure closer to textbook anatomy.
- Hands, feet and legs, for the same reason of time against gain: no unprompted viewer raised them.

#### Unused takes of the kept chain

`cx-e-t1`, `cx-e-t4` (wide picture); `e3-HD-t1`, `t2`, `t3`, `t5` (head); `e3-ST-t2` (storm); `pb1e-t2`, `t3`, `pb1f-t1`, `t2` (frame 1); `pb2g-t1` (frame 2); `pb1c`, `pb1d` (frame 1 plates of earlier sets). All are in `working/takes/`.

A fallback set with the larger head, which was fully tested as x4 plus the wider frame 3, is in `working/pull/` as `f1-x5.jpg` to `f4-x5.jpg` with `frames-x5.json`.

#### Record faults in this run, and how they were mended

- `working/prompts/pb2-g.txt` was overwritten by mistake at 08:10 UTC with the text of the new frame 2 prompt. That text now has its own file, `pb2-x6.txt`, and the log, the batch file and the take records point to it. The original `pb2-g` text (used for the unused takes `pb2-t17` to `pb2-t20`) was restored word for word at 08:33 UTC from the session's own record of the file as it was printed at 04:15 UTC.
- Ten replies of the x4 round (`bm2`, `bm3`, `bn1` to `bn3`, `bo1` to `bo3`, `bp1`, `bp2`) had not been saved to file before a context compaction. They were restored word for word from the session record at 08:25 UTC. One of them, `bp2`, is cut off after 4,000 characters, which is the length the record keeps; the cut is marked in the file.
- The decisions between 03:32 and 08:19 UTC were logged in `working/log.json` after the fact, at hand-over, from the file times and the take records. Their times are to the nearest few minutes.

#### Real photographs passed to the generator for the kept chain

All from Wikimedia Commons and in the public domain. Each was supplied only as the standard for how real terrain, sea and cloud look from orbit; every prompt says to copy nothing in it.

- `working/real/orb-gemini11-india-crop.jpg`: a crop of `orb-gemini11-india.jpg` that leaves out the spacecraft's boom and nose; credit as for the parent: "India and Ceylon as seen from the orbiting Gemini-11 spacecraft.jpg" by NASA, Public domain, https://commons.wikimedia.org/wiki/File:India_and_Ceylon_as_seen_from_the_orbiting_Gemini-11_spacecraft.jpg . Use: rendering standard for the whole look of an orbital photograph with the planet's edge: haze, sea colour, cloud fields; content not copied. Passed to the generator with take groups `rv4` (21), `tile*` (4), `cx` (14), `cx9-T*` (3), `op` (2), `cx9-M*` (8), `cx-e` (3), `e2*` (12), `e3-HD` (5), `pb2g` (2). In the kept reveal frames through: `cx-e-t2`, `e2-W00-t1`, `e2-W01-t1`, `e2-W02-t1` and 11 more.
- `working/real/orb-iss23-musandam.jpg`: "ISS023-E-33601 - View of Oman - Musandam Peninsula - Persian Gulf - Khawr ash Shamm - Khasab - Jabal Maqlab - Kubbat Ghazira - Gulf of Oman (cropped).jpg" by Earth Science and Remote Sensing Unit, Lyndon B. Johnson Space Center, Public domain, https://commons.wikimedia.org/wiki/File:ISS023-E-33601_-_View_of_Oman_-_Musandam_Peninsula_-_Persian_Gulf_-_Khawr_ash_Shamm_-_Khasab_-_Jabal_Maqlab_-_Kubbat_Ghazira_-_Gulf_of_Oman_(cropped).jpg . Use: rendering standard for pale bare mountain ranges and drowned valleys against dark sea; content not copied. Passed to the generator with take groups `cx` (14), `cx9-T*` (9), `cx9-M*` (12), `cx-e` (3), `e2*` (21), `e3-HD` (5), `e3-ST` (2), `pb2g` (2). In the kept reveal frames through: `cx-e-t2`, `e2-W00-t1`, `e2-W01-t1`, `e2-W02-t1` and 21 more.
- `working/real/orb-modis-barents-bloom.jpg`: "Phytoplankton bloom in the Barents Sea (MODIS 2017-09-14).jpg" by Jeff Schmaltz, MODIS Land Rapid Response Team, NASA GSFC, Public domain, https://commons.wikimedia.org/wiki/File:Phytoplankton_bloom_in_the_Barents_Sea_(MODIS_2017-09-14).jpg . Use: rendering standard for stained, blooming sea water; content not copied. Passed to the generator with take groups `cx` (14), `cx9-T*` (4), `cx9-M*` (4), `cx-e` (3), `e2*` (9), `e3-ST` (2). In the kept reveal frames through: `cx-e-t2`, `e2-W21-t1`, `e2-W22-t1`, `e2-W23-t1` and 7 more.
- `working/real/orb-modis-tstorm-phil-crop.jpg`: a crop of `orb-modis-tstorm-phil.jpg` of the storm cells; credit as for the parent: "Thunderstorms-Philippines.jpg" by NASA, MODIS Rapid Response System, Public domain, https://commons.wikimedia.org/wiki/File:Thunderstorms-Philippines.jpg . Use: rendering standard for thunderstorm anvils and overshooting tops seen from straight above; content not copied. Passed to the generator with take groups `bl` (10), `cx` (8), `cx9-T*` (2), `cx-e` (3), `e2*` (3), `e3-ST` (2). In the kept reveal frames through: `cx-e-t2`, `e2-W11-t1`, `e2-W21-t1`, `e2-ST-t1` and 1 more.
- `working/real/orb-modis-tstorm-hainan.jpg`: "Scattered Thunderstorms over Hainan island 2012 5 21.jpg" by NASA, MODIS Rapid Response System, Public domain, https://commons.wikimedia.org/wiki/File:Scattered_Thunderstorms_over_Hainan_island_2012_5_21.jpg . Use: rendering standard for scattered thunderstorm cells with their shadows, seen from straight above; content not copied. Passed to the generator with take groups `bl` (2), `e2*` (1), `e3-ST` (2). In the kept reveal frames through: `e2-ST-t1`, `e3-ST-t1`.
- `working/real/orb-iss44-sinai.jpg`: "ISS-44 Sinai Peninsula.jpg" by NASA/Scott Kelly, Public domain, https://commons.wikimedia.org/wiki/File:ISS-44_Sinai_Peninsula.jpg . Use: rendering standard for bare desert mountains and drainage seen from orbit; content not copied. Passed to the generator with take groups `pb3` (1), `pb2` (6), `sm` (2), `pb1e` (3), `pb1f` (2). In the kept reveal frames through: `pb1e-t1`.
- `working/real/orb-iss42-richat.jpg`: "ISS-42 Richat Structure, Eye of the Sahara.jpg" by NASA, Public domain, https://commons.wikimedia.org/wiki/File:ISS-42_Richat_Structure,_Eye_of_the_Sahara.jpg . Use: rendering standard for a round landform in bare desert seen from orbit; content not copied. Passed to the generator with take groups `pb2` (7), `pb1` (3), `pb1c` (2), `pb1d` (2), `pb1e` (3). In the kept reveal frames through: `pb1e-t1`.

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
