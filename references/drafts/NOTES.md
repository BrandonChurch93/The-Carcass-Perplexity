# The Carcass: reference images, round 2

Reference run of 2026-11-23, round 2. These are target stills for seven moving 3D scenes. Everything here is a draft and nothing is approved. Round 1 was rejected and sits untouched in [`../archive/round-1/`](../archive/round-1/); nothing from it was reused.

- Shots with a kept take: 7 of 7. Takes made: 27.
- Round 2 started 21:45 UTC and was last updated 22:41 UTC, inside the two-hour limit (23:45 UTC). Times below are UTC, with time since the start in brackets.
- `contact-sheet.jpg` shows the kept take of each shot. `prompts/` holds the exact prompt sent for every take. `real/` holds the real photographs passed to the generator. `guides/` holds the layout studies drawn in code for shot 7.

## Kept takes

| Shot | Palette asked for | Kept take | Model | Blind judge | Faults still in it |
|---|---|---|---|---|---|
| Shot 1: The Ribs | Deep green and gold | [`01-ribs-take4.jpg`](01-ribs-take4.jpg) | Seedream 5 Pro (`seedream_5`) | PASS (a) | The far end of the tunnel of ribs goes soft and repetitive in the haze. The glowing flock is small yellow specks rather than creatures with a shape. Scale wavers in the distance. The waterfalls sit on the valley walls behind the ribs more than between them. |
| Shot 2: The Heart | Orange, red and black | [`02-heart-take4.jpg`](02-heart-take4.jpg) | Seedream 5 Pro (`seedream_5`) | PASS (a) | The two lavafalls in front still pour thin and fast like water. The red plants and amber crystals in the foreground are soft, repeat and look unscorched next to the lava. The rivers branching out through the rock like arteries are only a few thin lines at upper left; that part of the brief is under-delivered (take 5 shows it, but failed the judge). The lake is one lit oval in a dark surround, the layout the look-alike agent called nearest to the Eye. |
| Shot 3: The Breath | Ice blue and violet | [`03-breath-take1.jpg`](03-breath-take1.jpg) | Seedream 5 Pro (`seedream_5`) | PASS (a) | The big star-shaped flakes near the camera look added on. The beasts read as bison-sized against the trees, not house-sized, and the smallest ones blur. The crystal trees keep a conifer shape. |
| Shot 4: The Blood Marsh | Crimson and teal | [`04-blood-marsh-take3.jpg`](04-blood-marsh-take3.jpg) | Seedream 5 Pro (`seedream_5`) | PASS (a) | Without the brief the swelling is hard to read as a creature. The teal lights are spread evenly and throw almost no light on trunks or water. Foreground reflections are smeary. |
| Shot 5: The Spine | Storm purple and white gold | [`05-spine-take4.jpg`](05-spine-take4.jpg) | Seedream 5 Pro (`seedream_5`) | PASS (a) | The waterfalls are huge torrents pouring off every side of small summit pools, far more water than the pools could feed. The spires repeat almost unchanged down the row. The small lightning bolt inside the sun beam on the right looks pasted on. The lightning is violet-white rather than gold. The winged shapes are still small in frame. The bone still stands on a dark rock pillar rather than being the whole peak. |
| Shot 6: The Eye | Indigo and gold, night | [`06-eye-take3.jpg`](06-eye-take3.jpg) | Seedream 5 Pro (`seedream_5`) | PASS (a) | It is very literally an eye, which may be more than the film wants before the last shot. The flock over the water is a few indistinct smudges. The foreground plants are dark, repeat the same curled shape and pick up little of the gold light. Drifting lights are sparse. |
| Shot 7: The Reveal | All six palettes on a dark sea, seen from orbit | [`07-reveal-take5.jpg`](07-reveal-take5.jpg) | Seedream 5 Pro (`seedream_5`) | PASS (a) | Scale still reads as a miniature: single snow-covered trees are readable on the ice arm from orbit and the rib ridges are thin drawn lines. The gold ring and the aurora ribbon sit flat on the surface like overlays. The head end is dim and the skull, hand and foot are subtle to the point that the body takes a moment to find. |

## How the takes were checked

1. Eye check first. Every take was looked at against its shot description before any judge saw it. A take that missed its palette or its main subject was marked as a miss, was not sent to a judge, and still counts toward the five-take limit.
2. Blind judge. Each remaining take was shown to one new agent in its own sandbox. The agent got only the picture, as a copy with no metadata named `image.png`, and this question. It had not seen the brief, the prompts or any other take.

> Which of these is it most likely to be? (a) a frame from a top-budget film or AAA game cinematic (b) a stock image (c) a textbook picture (d) amateur generated art. Answer with one letter and name its weakest part.

Only (a) passes. A judge had ten minutes and one replacement; after that the take is kept unjudged.
3. No style anchor. No shot's image was passed into another shot's generation. Where a take was reworked, only that same shot's own take was passed back in, and that is listed under the take.

## Calls made

- 21:47 (0h02m): Round 2 started 21:45:06 UTC, so the two-hour limit ends at 23:45:06 UTC.
- 21:47 (0h02m): Round 1 was moved whole to references/archive/round-1/ and pushed (7c16225) before anything else. No round 1 take, prompt, layout study or real photograph is reused: the Commons search skips every file that round 1 looked at.
- 21:54 (0h09m): Real photographs were looked up first on Wikimedia Commons (free licences only, credited in the table at the end): 181 candidates in a first pass and 46 in a second pass for the jungle, storm and lava gaps. 30 were picked, four to five per shot. Photos with people or buildings in them were left out or cropped.
- 21:54 (0h09m): Models: Seedream 5 Pro and Nano Banana Pro. The GPT Image models were not used because that route does not take an aspect ratio, and every frame here has to be 16:9. Take 1 is Seedream on prompt A, take 2 is Nano Banana Pro on the same prompt A, take 3 is Seedream on prompt B, which frames the same shot a different way.
- 21:54 (0h09m): No style anchor. Every take gets only its own shot's real photographs. The only thing the seven shots share is three sentences of written bar at the top and bottom of each prompt (live-action film frame, real light and material, no people or text).
- 21:54 (0h09m): To keep the shots apart as thumbnails, each prompt fixes its own camera height, time of day and light source on top of its palette: Ribs low and sunlit, Heart high and lit only by lava, Breath ground level under aurora, Blood Marsh at water level in dim mist, Spine level with the ridge in a storm, Eye high at night lit by the lake, Reveal from orbit.
- 22:06 (0h21m): 22:05: Breath, Blood Marsh, Spine and Eye were closed after their first three takes, since each had at least one (a) from the blind judge. A passed shot gets no further takes; the two spare takes per shot are kept for failures and for the look-alike check at the end.
- 22:12 (0h27m): 22:03 to 22:13: Ribs take 1 was the right picture in the wrong light (green and white daylight, no gold), so take 4 re-shot that same shot at golden hour with take 1 passed in as the layout to keep. This uses a Ribs image inside the Ribs shot only; no image crosses from one shot to another. Heart take 4 was a new prompt written from the three judges' words: one fountain as the focal point, a crusted lake for scale, lavafalls as slow thick drapes, scorched growth instead of autumn trees.
- 22:18 (0h33m): 22:10 to 22:18: The Reveal needs a body-shaped continent with six regions in the right places, which a prompt alone does not hold. So a new layout study was drawn in code from nothing (references/drafts/guides/reveal_layout.py, two camera variants, no round 1 input and no generated image in it) and passed as image 1 with the instruction to re-photograph it sharp. The prompt talks about geography only (headland, peninsulas, ridgelines, a peak range) and uses the body once, as a likeness, because anatomical wording produces a statue or a skeleton.
- 22:24 (0h39m): 22:24: The Reveal passed on take 1, but its judge and the judges of takes 2 and 3 all named the same fault: mountains, storm, trees and aurora drawn at diorama scale for a view from orbit, and a gold ring and aurora that look pasted on. Because this is the shot the film turns on, one more take (take 4) is spent on that single fault rather than stopping at the first pass. Take 1 stays the kept take unless take 4 passes the judge and is better by eye.
- 22:28 (0h43m): 22:28: Reveal take 4 came back finer in scale but weaker overall (the storm slid off the far coast and lost its lightning), so the fifth and last take re-shoots take 1 itself, the way the Ribs were fixed, changing only what the judges named. The Reveal has no take left after this.
- 22:31 (0h46m): 22:31: Reveal kept take is 5, not 1. Both passed the judge; they differ only in the storm and the red bay, and take 5 is the more believable of the two there. The Reveal is at its limit of 5 takes, so it cannot be remade if the look-alike check names it.
- 22:35 (0h50m): 22:35: The look-alike agent answered NONE, so no remake was required. It did name the two nearest calls and the weaker shot of each: the Spine (near the Breath: violet-blue sky over blue-white; greyer and busier) and the Heart (near the Eye: one warm lit oval in a dark surround; reads as a lava lake, not a heart). Both of those kept takes also fall short of their own brief (the Spine has little white gold, the Heart has almost no artery rivers), both have takes left (Spine 3 of 5, Heart 4 of 5) and over an hour remains, so each gets one remake: Spine take 4 and Heart take 5. Both are new generations from the real photographs with a changed layout and palette balance, not re-shoots of the kept take. A remake replaces the kept take only if it passes the blind judge and is better by eye; otherwise the kept take stays.
- 22:40 (0h55m): 22:40: Outcome of the two remakes. Spine take 4 passed the blind judge and is now the kept Spine, because it holds the purple and white-gold palette and reads cleanly at thumbnail size; take 3 stays in the folder as the more photographic alternative. Heart take 5 was judged amateur generated art, so take 4 stays the kept Heart, and the Heart has no take left. The contact sheet was rebuilt with Spine take 4. The look-alike agent was asked once, as the method says; the rebuilt sheet was not sent to a second one.
- 22:40 (0h55m): Model record over the round: Seedream 5 Pro passed the blind judge on 13 of 19 judged takes; Nano Banana Pro on 2 of 7. Nano Banana Pro files also came back at 2752x1536 PNG rather than 2816x1584, one with black bars top and bottom (Blood Marsh take 2) and one with a smudged pseudo-signature in a corner (Spine take 2). That is why every retake and remake after the first three takes went to Seedream.

## Look-alike check on the contact sheet

- 22:33 (0h48m): Answer: PAIRS: NONE. WHY: No two frames match on colour, light and layout together, and all seven separate cleanly when I shrank them to 160 px thumbnails; the two nearest calls are 3 The Breath / 5 The Spine, which share a violet-blue sky glow over cool blue-white but differ in layout (symmetrical tree-framed clearing versus a diagonal ridge with waterfalls and cloud), and 2 The Heart / 6 The Eye, which share a layout of one self-lit warm oval filling the centre of a dark surround but differ in colour (orange-red on black versus yellow-gold on dark blue). WEAKER: None as true pairs; if the near-pairs had to be separated, 5 The Spine is weaker than 3 (greyer and busier, so the vertebrae read less clearly at small size) and 2 The Heart is weaker than 6 (it reads as a generic lava lake rather than a heart, while the eye is unmistakable).

## Failures and skips

- 21:56 (0h11m): 21:54: the first batch asked for 18 generations at once and the tool allows 16 in flight, so two Seedream calls (The Eye takes 1 and 3) were refused in the first second. They were sent again two minutes later. No take was lost and these do not count as takes.

## Every image

### Shot 1: The Ribs (`01-ribs`)

Palette asked for: Deep green and gold.

Brief: A jungle growing inside a colossal rib cage. The bone arches are miles high, wrapped in hanging vines and giant trees. Waterfalls pour between the ribs. Gold light shafts cut through mist. Flocks of glowing creatures drift between the arches. Low wide camera looking up through the arches.

Kept: take 4. Takes 2, 3 and 4 all passed the blind judge. Take 4 is kept: it is the only one with both the miles-high scale (full-grown trees are small at the feet of the bones) and the gold light the palette asks for, and it has the low wide camera on the water looking up through the arches. Take 2 reads as generated up close and take 3 is a side view of bones a few hundred metres high. Faults still in it: The far end of the tunnel of ribs goes soft and repetitive in the haze. The glowing flock is small yellow specks rather than creatures with a shape. Scale wavers in the distance. The waterfalls sit on the valley walls behind the ribs more than between them. Finished 22:12 (0h27m).

#### 01-ribs take 1: [`01-ribs-take1.jpg`](01-ribs-take1.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Prompt A on Seedream: camera on the jungle floor by a river, looking down the rib cage like a cathedral nave.
- Made: started 21:54, generation took 96 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/ribs-forest-sunbeams.jpg`](real/ribs-forest-sunbeams.jpg)
  2. [`real/ribs-jungle-waterfalls.jpg`](real/ribs-jungle-waterfalls.jpg)
  3. [`real/ribs-kaieteur-falls-aerial.jpg`](real/ribs-kaieteur-falls-aerial.jpg)
  4. [`real/ribs-whale-bone-arch.jpg`](real/ribs-whale-bone-arch.jpg)
- Eye check against the shot description: **MISS, not sent to a judge**. Main subject is there: a nave of colossal ribs with jungle at their feet, waterfalls between them, a river and a small flock of lights, camera low and looking up. Palette misses: it is deep green under white-blue daylight, and gold shows only in the tiny lights and a few glints on the river. As a thumbnail it reads green and grey-white, not green and gold.
- Prompt ([`prompts/01-ribs-take1.txt`](prompts/01-ribs-take1.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE RIBS. A primeval jungle growing inside the rib cage of a titan that died ages ago. The camera sits low on the jungle floor beside a shallow river, wide 18 mm lens, tilted upward, looking down the length of the rib cage as if down the nave of a cathedral. On both sides colossal curved ribs of ancient bone rise out of the forest and arch overhead, one behind another, a dozen or more, receding into mist until the farthest are pale ghosts. Each rib is miles high: full-grown rainforest giants with buttress roots stand at their feet and look like moss against them, and thin cloud drifts between the upper arches. The bone is weathered ivory, pitted and cracked, streaked dark by rain, furred with moss and ferns, wrapped in strangler figs and in curtains of hanging vines hundreds of metres long. Whole trees grow from ledges on the ribs.

High up, several waterfalls pour through the gaps between the ribs and fall so far that they turn into drifting veils of spray before they reach the canopy. Late sun comes through the gaps as broad shafts of gold light that cut through the mist and spray and lay glowing patches on the river and on wet leaves. Flocks of small glowing creatures, hundreds of soft gold-green lights on thin translucent wings, drift in loose ribbons between the arches at middle distance, like luminous birds.

Colour: deep saturated emerald and moss green everywhere, with gold in the light shafts, the water highlights and the creatures. Wet, humid and crowded with life: tree ferns, broad leaves beaded with water, flowering epiphytes, hanging roots at the edges of the frame.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real jungle light shafts, mist, hanging roots, giant trees, waterfalls and weathered bone look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

#### 01-ribs take 2: [`01-ribs-take2.png`](01-ribs-take2.png)

- Model: Nano Banana Pro (`nano_banana_pro`). Output 2752x1536 PNG, kept as delivered.
- What this take tried: Prompt A again on Nano Banana Pro, to compare models on the same words.
- Made: started 21:54, generation took 28 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/ribs-forest-sunbeams.jpg`](real/ribs-forest-sunbeams.jpg)
  2. [`real/ribs-jungle-waterfalls.jpg`](real/ribs-jungle-waterfalls.jpg)
  3. [`real/ribs-kaieteur-falls-aerial.jpg`](real/ribs-kaieteur-falls-aerial.jpg)
  4. [`real/ribs-whale-bone-arch.jpg`](real/ribs-whale-bone-arch.jpg)
- Eye check against the shot description: **pass**. Green and gold are both strong: gold shafts through mist onto a river, waterfalls between the arches, a flock of glowing green-gold winged lights, low camera looking up a nave of vine-hung arches. The arches read more like a stone vault than bone and the scale is nearer a cathedral than miles.
- Blind judge `still_viewer_01` (asked 21:59, answered 22:00): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The waterfalls pour out of the rib arches with no visible source, and the ribs merge into a muddled, ambiguous mass where they meet the spine at top centre. The glowing birds are also near-identical repeated shapes scattered evenly, which reads as pasted on rather than a flock.
- Prompt ([`prompts/01-ribs-take2.txt`](prompts/01-ribs-take2.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE RIBS. A primeval jungle growing inside the rib cage of a titan that died ages ago. The camera sits low on the jungle floor beside a shallow river, wide 18 mm lens, tilted upward, looking down the length of the rib cage as if down the nave of a cathedral. On both sides colossal curved ribs of ancient bone rise out of the forest and arch overhead, one behind another, a dozen or more, receding into mist until the farthest are pale ghosts. Each rib is miles high: full-grown rainforest giants with buttress roots stand at their feet and look like moss against them, and thin cloud drifts between the upper arches. The bone is weathered ivory, pitted and cracked, streaked dark by rain, furred with moss and ferns, wrapped in strangler figs and in curtains of hanging vines hundreds of metres long. Whole trees grow from ledges on the ribs.

High up, several waterfalls pour through the gaps between the ribs and fall so far that they turn into drifting veils of spray before they reach the canopy. Late sun comes through the gaps as broad shafts of gold light that cut through the mist and spray and lay glowing patches on the river and on wet leaves. Flocks of small glowing creatures, hundreds of soft gold-green lights on thin translucent wings, drift in loose ribbons between the arches at middle distance, like luminous birds.

Colour: deep saturated emerald and moss green everywhere, with gold in the light shafts, the water highlights and the creatures. Wet, humid and crowded with life: tree ferns, broad leaves beaded with water, flowering epiphytes, hanging roots at the edges of the frame.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real jungle light shafts, mist, hanging roots, giant trees, waterfalls and weathered bone look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

#### 01-ribs take 3: [`01-ribs-take3.jpg`](01-ribs-take3.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Prompt B on Seedream: camera on a jungle lagoon, one huge rib crossing the whole frame overhead, sun behind the arches.
- Made: started 21:54, generation took 132 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/ribs-forest-sunbeams.jpg`](real/ribs-forest-sunbeams.jpg)
  2. [`real/ribs-jungle-waterfalls.jpg`](real/ribs-jungle-waterfalls.jpg)
  3. [`real/ribs-kaieteur-falls-aerial.jpg`](real/ribs-kaieteur-falls-aerial.jpg)
  4. [`real/ribs-whale-bone-arch.jpg`](real/ribs-whale-bone-arch.jpg)
- Eye check against the shot description: **pass**. Green and gold are both strong: low sun behind the ribs, gold shafts, two waterfalls, a lagoon, glowing lights among the trees, camera at water level looking up. The rib cage is seen from the side with its backbone on top and reads a few hundred metres high, not miles.
- Blind judge `still_viewer_02` (asked 21:59, answered 22:00): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The skeleton's anatomy and structure do not hold together: the ribs on the left dissolve into the cliff and waterfalls with no clear attachment to the spine, and the receding ribs in the mid-distance blur into indistinct haze. The waterfalls also pour from no visible source, and the glowing green specks are scattered without clear logic.
- Prompt ([`prompts/01-ribs-take3.txt`](prompts/01-ribs-take3.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE RIBS. A primeval jungle growing inside the rib cage of a titan that died ages ago. The camera floats just above the surface of a still green jungle lagoon, very wide 16 mm lens, tilted steeply up. One colossal rib of ancient bone crosses the whole frame overhead as a single huge arch, rising from the trees on the left and coming down far away on the right; behind it more ribs repeat the same curve, smaller and paler each time, until they vanish in gold haze. The ribs are miles high. Giant rainforest trees with buttress roots crowd the shore and look tiny under them, and wisps of cloud hang below the top of the nearest arch. The bone is old ivory stained green and brown, deeply pitted, cracked, overgrown with moss, ferns and orchids, with whole trees rooted on it and curtains of vines and aerial roots hanging hundreds of metres down toward the water.

Two great waterfalls drop through the gaps between ribs on the left, falling in long white veils that break into mist above the canopy; a third, far off, catches the sun. The low sun stands behind the arches, and its light pours between them in wide gold shafts through the mist, backlighting leaves, spray and vines and laying a gold path on the lagoon. Flocks of small glowing creatures, hundreds of soft gold-green lights with thin wings, drift in long loose ribbons under the arch and between the farther ribs, at middle distance.

Colour: deep saturated green, from black-green shadow to bright emerald, with rich gold wherever the sun or the creatures touch. Humid, dripping, crowded with life: giant leaves, tree ferns, flowering vines, floating lily pads at the bottom edge.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real jungle light shafts, mist, hanging roots, giant trees, waterfalls and weathered bone look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

#### 01-ribs take 4: [`01-ribs-take4.jpg`](01-ribs-take4.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Take 1 had the best scale but missed the gold. This re-shoots take 1 (passed in as image 1, the shot's own take) at golden hour: gold shafts and haze instead of white daylight, deeper greens, bigger flocks, waterfalls given a source.
- Made: started 22:04, generation took 114 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take1.jpg`](01-ribs-take1.jpg)
  2. [`real/ribs-forest-sunbeams.jpg`](real/ribs-forest-sunbeams.jpg)
- Eye check against the shot description: **pass**. Deep green and gold. Low camera on a stream looking up through a receding line of vine-hung rib arches, waterfalls down both cliff walls, gold shafts through mist, a flock of small glowing creatures in the middle arches. Matches the description.
- Blind judge `still_viewer_19` (asked 22:07, answered 22:12): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The far end of the rib tunnel, where the receding bones blur into the haze and waterfalls as a muddy, repetitive tangle with no clear spine or anchoring structure. The scale also wobbles there, since the small trees at the ribs' bases and the scattered glowing specks do not read consistently against the giant bones.
- Prompt ([`prompts/01-ribs-take4.txt`](prompts/01-ribs-take4.txt)):

```text
Image 1 is a film frame of a primeval jungle growing inside the rib cage of a titan that died ages ago. Photograph the same place again from the same camera position, later in the day. Keep the composition: the same colossal ribs of ancient bone arching over the river from both sides and receding into mist, the same shallow river in the foreground, the same giant trees and the same waterfalls.

Change the light and the colour. It is the golden hour. The sun is low behind the ribs on the right, hidden by them, and the sky seen between the ribs is a bright warm gold haze, with no blue and no white cloud. Broad shafts of gold sunlight pour through the gaps between the ribs and cut across the mist and the waterfall spray, like the sunbeams in image 2, which is a real photograph of sun shafts in a rainforest. The bone glows warm ivory and gold where the sun rakes across it and falls to deep green shadow elsewhere. Every green becomes deeper and richer: saturated emerald and moss green, wet and dense. The river carries a broad gold reflection.

Add: more curtains of hanging vines from the ribs; thin cloud drifting across the upper arches and whole stands of forest on the high ledges of the ribs, so that the ribs read as miles high; the waterfalls pour out of hanging jungle valleys on the shoulders of the ribs. The flocks of glowing creatures are bigger: hundreds of soft gold-green lights on thin wings, bunched into two or three long loose ribbons that wind between the arches at middle distance, uneven in spacing and size.

Colour: deep green and gold only. Hyper-realistic live-action photography from a top-budget fantasy film, 16:9: believable lens perspective, real atmospheric haze and scale, true-to-life detail on bone, bark, leaf and water, fine film grain. Not a painting, an illustration or concept art. No people, no buildings, no text, no logos, no watermark, no border.
```

### Shot 2: The Heart (`02-heart`)

Palette asked for: Orange, red and black.

Brief: A vast sea of bright lava that fills most of the frame, with lavafalls and molten rivers branching out through black glass rock like arteries. Fire-colored plants and glowing crystal growths cling to the edges. Heat haze and embers in the air. High three-quarter camera.

Kept: take 4. Takes 1 to 3 and take 5 were all judged amateur generated art; take 4 is the only take that passed. It was written against what the first judges named (water-like lavafalls, pasted unburnt plants, even saturation, no focal point): a crusted lake with one fountain and smoke column gives the frame a subject and a scale. Take 5, the remake made after the look-alike check, has the branching artery rivers that take 4 lacks, but its judge found no focal subject and mushy unburnt plants, so it does not replace take 4. The Heart is at its limit of 5 takes. Faults still in it: The two lavafalls in front still pour thin and fast like water. The red plants and amber crystals in the foreground are soft, repeat and look unscorched next to the lava. The rivers branching out through the rock like arteries are only a few thin lines at upper left; that part of the brief is under-delivered (take 5 shows it, but failed the judge). The lake is one lit oval in a dark surround, the layout the look-alike agent called nearest to the Eye. Finished 22:40 (0h55m).

#### 02-heart take 1: [`02-heart-take1.jpg`](02-heart-take1.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Prompt A on Seedream: lava sea from high three-quarter view, rivers branching out through black glass, fire-coloured groves and crystals on the edges.
- Made: started 21:54, generation took 109 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/heart-lava-lake-night.jpg`](real/heart-lava-lake-night.jpg)
  2. [`real/heart-lava-rivers-aerial.jpg`](real/heart-lava-rivers-aerial.jpg)
  3. [`real/heart-lava-lake-fountain-night.jpg`](real/heart-lava-lake-fountain-night.jpg)
  4. [`real/heart-lava-fountain-rivers.jpg`](real/heart-lava-fountain-rivers.jpg)
- Eye check against the shot description: **pass**. Orange, red and black only. Lava sea with crust plates, a wide lavafall and rivers through glossy black rock, fire-coloured trees, amber crystals, embers, high three-quarter view. The sea covers about the upper half of the frame, not most of it.
- Blind judge `still_viewer_03` (asked 21:59, answered 22:00): **(d) amateur generated art**, so it fails. Weakest part: The lava falls in the lower right pour like thin, silky water rather than heavy molten rock, and leafy autumn trees and glassy crystals sit unburnt at the very edge of it. The scene is also uniformly saturated orange with no clear focal subject or sense of scale, which reads as generated fantasy art rather than a directed cinematic frame.
- Prompt ([`prompts/02-heart-take1.txt`](prompts/02-heart-take1.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE HEART. A vast sea of bright molten lava seen from high above at a three-quarter angle, as from an aircraft at nightfall. The lava sea fills most of the frame, from near the bottom edge to its far shore close to the top. Its surface is alive: brilliant yellow-white and orange where it wells up and fountains, cooling to deep red, crossed by a dark web of thin crust plates that split apart along incandescent cracks. From the sea, molten rivers run out through cliffs and terraces of black volcanic glass, dividing again and again like arteries. Several pour over ledges as broad lavafalls, glowing curtains that drop into lower pools and run on. The black rock is glossy obsidian, faceted and razor-edged, and the lava light slides across its surfaces as hard orange reflections.

Life clings to every edge. Groves of fire-coloured trees with black trunks and dense crowns of scarlet, orange and ember-yellow leaves crowd the terraces and cliff tops; mats of red and orange fronds and creepers hang down the glass walls; clusters of large translucent crystals in amber and deep red grow from the rock along the shore and glow from within. A loose flock of dark winged creatures circles on the heat above the middle of the sea, tiny against it.

Air: strong heat shimmer above the lava, thousands of rising embers and sparks, thin smoke and ash drifting across the frame and lit orange from below. Beyond the far shore the land and sky are near black, with a deep red glow under the smoke. All light comes from the lava.

Colour: orange, red and black only.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real lava lakes, lava rivers, lava fountains and volcanic glass look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

#### 02-heart take 2: [`02-heart-take2.png`](02-heart-take2.png)

- Model: Nano Banana Pro (`nano_banana_pro`). Output 2752x1536 PNG, kept as delivered.
- What this take tried: Prompt A again on Nano Banana Pro, to compare models on the same words.
- Made: started 21:54, generation took 28 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/heart-lava-lake-night.jpg`](real/heart-lava-lake-night.jpg)
  2. [`real/heart-lava-rivers-aerial.jpg`](real/heart-lava-rivers-aerial.jpg)
  3. [`real/heart-lava-lake-fountain-night.jpg`](real/heart-lava-lake-fountain-night.jpg)
  4. [`real/heart-lava-fountain-rivers.jpg`](real/heart-lava-fountain-rivers.jpg)
- Eye check against the shot description: **pass**. Orange, red and black; lava sea with lavafalls, red-leafed trees, crystals and a flock. The camera is lower than a high three-quarter view, and the trees and crystals look placed on rather than grown there.
- Blind judge `still_viewer_04` (asked 21:59, answered 22:00): **(d) amateur generated art**, so it fails. Weakest part: The trees look like pasted-in autumn foliage assets, evenly lit and untouched by the lava's heat or glow, so they never integrate with the scene. The lava falls also behave like recoloured water, with splashy white foam, rather than thick molten rock.
- Prompt ([`prompts/02-heart-take2.txt`](prompts/02-heart-take2.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE HEART. A vast sea of bright molten lava seen from high above at a three-quarter angle, as from an aircraft at nightfall. The lava sea fills most of the frame, from near the bottom edge to its far shore close to the top. Its surface is alive: brilliant yellow-white and orange where it wells up and fountains, cooling to deep red, crossed by a dark web of thin crust plates that split apart along incandescent cracks. From the sea, molten rivers run out through cliffs and terraces of black volcanic glass, dividing again and again like arteries. Several pour over ledges as broad lavafalls, glowing curtains that drop into lower pools and run on. The black rock is glossy obsidian, faceted and razor-edged, and the lava light slides across its surfaces as hard orange reflections.

Life clings to every edge. Groves of fire-coloured trees with black trunks and dense crowns of scarlet, orange and ember-yellow leaves crowd the terraces and cliff tops; mats of red and orange fronds and creepers hang down the glass walls; clusters of large translucent crystals in amber and deep red grow from the rock along the shore and glow from within. A loose flock of dark winged creatures circles on the heat above the middle of the sea, tiny against it.

Air: strong heat shimmer above the lava, thousands of rising embers and sparks, thin smoke and ash drifting across the frame and lit orange from below. Beyond the far shore the land and sky are near black, with a deep red glow under the smoke. All light comes from the lava.

Colour: orange, red and black only.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real lava lakes, lava rivers, lava fountains and volcanic glass look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

#### 02-heart take 3: [`02-heart-take3.jpg`](02-heart-take3.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Prompt B on Seedream: the sea overflows its near rim as a wide lavafall and the rivers branch toward the camera.
- Made: started 21:54, generation took 110 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/heart-lava-lake-night.jpg`](real/heart-lava-lake-night.jpg)
  2. [`real/heart-lava-rivers-aerial.jpg`](real/heart-lava-rivers-aerial.jpg)
  3. [`real/heart-lava-lake-fountain-night.jpg`](real/heart-lava-lake-fountain-night.jpg)
  4. [`real/heart-lava-fountain-rivers.jpg`](real/heart-lava-fountain-rivers.jpg)
- Eye check against the shot description: **pass**. Orange, red and black only. Lava sea with a white-hot upwelling and rings spreading from it, overflowing as a lavafall and stepping rivers through black glass, fire-coloured trees and crystals on the terraces, high three-quarter view. The sea fills about half of the frame.
- Blind judge `still_viewer_05` (asked 21:59, answered 22:00): **(d) amateur generated art**, so it fails. Weakest part: The lava falls and foreground streams are the weakest part: the lava pours like thin, glowing water and merges incoherently with the cracked crust of the lake, with no consistent sense of scale. Unburnt autumn trees and crystals sit right beside it, and the whole frame is uniformly sharp and oversaturated with no real focal subject.
- Prompt ([`prompts/02-heart-take3.txt`](prompts/02-heart-take3.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE HEART. A vast sea of bright molten lava seen from high above at a three-quarter angle, at nightfall. The sea lies in a huge basin of black volcanic glass and fills the upper two thirds of the frame; near its middle a great dome of white-hot lava wells up and sends slow waves outward, and the whole surface is a moving skin of orange and yellow light broken by thin dark crust plates and bright cracks. At the near rim the sea overflows. A wide lavafall pours over a black glass cliff in the left foreground, a glowing curtain hundreds of metres high, and below it the molten rock runs toward the camera as rivers that split and split again through the black glass like arteries, with smaller lavafalls stepping down from terrace to terrace.

The black rock is glossy, faceted and sharp, full of orange reflections. Along every river bank and terrace grows a forest in the colours of fire: trees with black trunks and crowns of scarlet, orange and ember-yellow leaves, tall red reeds, hanging orange creepers. Clusters of large translucent crystals in amber and deep red stand among them like spires and glow from inside. Far out over the sea a flock of dark winged creatures rides the rising heat, tiny against the glow.

Air: heat shimmer bending the light above the rivers, clouds of rising embers, drifting smoke lit orange from below, a sky of black ash cloud with a deep red underside. All light comes from the lava.

Colour: orange, red and black only.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real lava lakes, lava rivers, lava fountains and volcanic glass look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

#### 02-heart take 4: [`02-heart-take4.jpg`](02-heart-take4.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: New prompt after three (d) answers that all named water-like lavafalls, pasted-on autumn trees and no scale. Higher camera so the sea fills the frame, rivers spreading to the horizon like arteries, one bright upwelling as the focal point, lava described as thick and crusted, plants described as alien coral and cycad shapes seen as groves from above, smoke layers for depth.
- Made: started 22:04, generation took 119 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/heart-lava-lake-night.jpg`](real/heart-lava-lake-night.jpg)
  2. [`real/heart-lava-rivers-aerial.jpg`](real/heart-lava-rivers-aerial.jpg)
  3. [`real/heart-lava-lake-fountain-night.jpg`](real/heart-lava-lake-fountain-night.jpg)
  4. [`real/heart-lava-fountain-rivers.jpg`](real/heart-lava-fountain-rivers.jpg)
- Eye check against the shot description: **pass**. Orange, red and black. A crusted lava lake fills most of the frame with a fountain and smoke plume as the focal point, two lavafalls pour off the near ledge, thin molten rivers branch off at upper left, red crystals and dark red plants hold the rim, a small flock circles the plume. High three-quarter view. The branching rivers are the weakest part of the match.
- Blind judge `still_viewer_18` (asked 22:07, answered 22:12): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The foreground is the least convincing area: the red foliage and amber crystals are mushy and repetitive, sit implausibly unscorched beside the lava, and the lava falls pour thin and fast like water, which muddles the sense of scale.
- Prompt ([`prompts/02-heart-take4.txt`](prompts/02-heart-take4.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE HEART. A vast sea of bright molten lava seen from high in the air at a three-quarter angle, at night, as if from an aircraft circling a volcano the size of a country. The sea fills most of the frame: a huge irregular basin of molten rock that runs from the bottom edge up to a far shore near the top, where the land is only a black rim under smoke. Its surface behaves like the real lava lakes in the attached photographs: bright orange and yellow molten rock under a thin, shifting skin of darker crust plates, split by a net of white-hot cracks, the plates slowly drifting and sinking at their edges. Right of centre one great upwelling domes up white-hot and fountains low, the brightest point in the frame, sending slow rings outward and lighting a tall leaning column of smoke from below. Away from it the glow dims gradually to deep red.

All around its shore the sea drains outward. Dozens of molten rivers leave it through gaps in cliffs of black volcanic glass and spread across the dark land toward the horizon, branching and thinning like arteries and veins, a glowing network seen through layers of smoke. On the near shore, at the bottom of the frame, two of them pour over the black rim as lavafalls of real molten rock: thick, heavy, slow sheets and ropes, yellow at the lip and darkening to red as they stretch, with torn rafts of black crust riding in them, no splash and no foam.

The land between the rivers is black glass, glossy and faceted, and it is overgrown. From this height the growth reads as dense groves and carpets in the colours of fire: ember red, deep orange and coal black, alien shapes like giant corals, cycads and plumes rather than leafy trees, lit hard from the lava side and dark on the other, the nearest ones scorched and smoking. Along the shore, clusters of huge translucent crystals stand out of the rock like shards, amber and blood red, glowing from within and catching the light of the sea. A flock of dark winged creatures circles the smoke column, tiny, which shows how big the sea is.

Air: heat shimmer over the whole surface, streams of embers rising from the fountain and the lavafalls, smoke and ash in layers at different heights that soften the distance. Black sky. All light comes from the lava.

Colour: orange, red and black only, with yellow-white at the hottest points.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real lava on Earth. Use them only as evidence of how real lava lakes, lava rivers, lava fountains and volcanic glass look and move: their light, crust, texture and smoke. Do not copy their framing, and do not carry over any people, buildings or roads that appear in them.
```

#### 02-heart take 5: [`02-heart-take5.jpg`](02-heart-take5.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Last take. Remake after the look-alike check, which named the Heart the weaker of its nearest call with the Eye (one warm lit oval in a dark surround; reads as a lava lake, not a heart). New generation from the same real photographs, not a re-shoot of take 4: the sea runs off the top and left of the frame so there is no oval, and five rivers leave its near shore and branch like arteries across the lower right, with lavafalls on the terraces.
- Made: started 22:35, generation took 128 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/heart-lava-rivers-aerial.jpg`](real/heart-lava-rivers-aerial.jpg)
  2. [`real/heart-lava-lake-night.jpg`](real/heart-lava-lake-night.jpg)
  3. [`real/heart-lava-fountain-rivers.jpg`](real/heart-lava-fountain-rivers.jpg)
  4. [`real/heart-lava-lake-fountain-night.jpg`](real/heart-lava-lake-fountain-night.jpg)
- Eye check against the shot description: **pass**. Orange, red and black only. The lava sea runs off the top and left of the frame with two fountains and smoke columns, and three wide rivers leave its near shore, drop over a terrace as a lavafall and split into dozens of fine channels across the lower right, which finally gives the artery reading. A flock over the river fork gives scale; fire-coloured plants and amber crystals hold the black rock at lower left. Against the brief: the sea is mostly dark crust with glowing cracks, less bright than take 4, and the black shore takes the lower left third of the frame.
- Blind judge `still_viewer_26` (asked 22:38, answered 22:40): **(d) amateur generated art**, so it fails. Weakest part: The foreground vegetation is a mushy hybrid of ferns and glowing crystals that sits unburnt right beside molten lava, and its scale is inconsistent with the flock of tiny birds and the lava falls at lower right. The scene also has no focal subject, just uniformly spread orange glow.
- Prompt ([`prompts/02-heart-take5.txt`](prompts/02-heart-take5.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE HEART. A vast sea of bright molten lava and the rivers that drain it, seen at night from high in the air at a three-quarter angle, as if from an aircraft. The sea fills the upper two thirds of the frame and runs off its top and left edges, so that no far shore is seen: molten rock all the way to the horizon under smoke. Its surface behaves like the real lava lakes in the attached photographs: bright orange and yellow molten rock under a thin shifting skin of darker crust plates split by a net of white-hot cracks. Left of centre a broad upwelling domes up white-hot, the brightest point in the frame, and a second one burns far off near the horizon, each lighting a leaning column of smoke from below.

Along the bottom and the right of the frame the sea meets a shore of black volcanic glass, and there it drains. Five great molten rivers leave it side by side and run toward the camera and off to the right through the black rock, each one splitting into two, then four, then dozens of thinner channels, exactly as arteries branch into veins, until the dark land is covered by a glowing red and orange net that fades into smoke at the right edge. The trunks are wide, slow and heavy, yellow-white down their centres with rafts of black crust riding on them; the finest branches are deep red. Where the land steps down in terraces of black glass the rivers go over as lavafalls: wide, thick, slow curtains of molten rock, yellow at the lip and darkening as they stretch, with no splash and no foam.

The black glass between the channels is glossy and faceted, and it is overgrown. From this height the growth reads as dense groves in ember red, deep orange and coal black, alien shapes like giant corals, cycads and plumes rather than leafy trees, lit hard from the lava side and black on the other, the ones nearest the channels scorched and smoking. Clusters of huge translucent crystals stand along the banks like shards, amber and blood red, glowing from within. A flock of dark winged creatures wheels over the nearest river fork, tiny against it, which shows how large everything is.

Air: heat shimmer over every channel, streams of embers rising, smoke and ash in layers at different heights that soften the distance. Black sky. All light comes from the lava.

Colour: orange, red and black only, with yellow-white at the hottest points.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real lava on Earth. Use them only as evidence of how real lava lakes, lava rivers, lava fountains and volcanic glass look and move: their light, crust, texture and smoke. Do not copy their framing, and do not carry over any people, buildings or roads that appear in them.
```

### Shot 3: The Breath (`03-breath`)

Palette asked for: Ice blue and violet.

Brief: A frozen forest of tall crystal trees under a huge violet and green aurora. Glittering snow hangs in the air. A herd of massive furred beasts of mixed sizes moves through the trees. Ground level camera.

Kept: take 1. Takes 1 and 3 both passed the blind judge. Take 1 is kept because it has the huge edge-to-edge aurora the shot asks for and the clearest herd: shaggy ice-hung beasts of mixed sizes at middle distance with lit breath. Take 3 has the more alien crystal trees but a narrow aurora and a small soft herd. Faults still in it: The big star-shaped flakes near the camera look added on. The beasts read as bison-sized against the trees, not house-sized, and the smallest ones blur. The crystal trees keep a conifer shape. Finished 22:05 (0h20m).

#### 03-breath take 1: [`03-breath-take1.jpg`](03-breath-take1.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Prompt A on Seedream: ground level in snow, herd crossing a clearing between crystal trees, aurora edge to edge.
- Made: started 21:54, generation took 134 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/breath-aurora-violet-green.jpg`](real/breath-aurora-violet-green.jpg)
  2. [`real/breath-aurora-over-snow.jpg`](real/breath-aurora-over-snow.jpg)
  3. [`real/breath-snow-loaded-trees.jpg`](real/breath-snow-loaded-trees.jpg)
  4. [`real/breath-bison-backlit-snow.jpg`](real/breath-bison-backlit-snow.jpg)
  5. [`real/breath-hoarfrost-crystals.jpg`](real/breath-hoarfrost-crystals.jpg)
- Eye check against the shot description: **pass**. Ice blue and violet, with green in the aurora. Tall crystal trunks with frost blades, a violet and green aurora, glittering air, a herd of about fifteen shaggy beasts of mixed sizes at middle distance with steaming breath, camera in the snow.
- Blind judge `still_viewer_06` (asked 21:59, answered 22:02): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The bison herd in the mid-ground: the animals' sizes do not match their distance (tiny ones stand beside large ones at the same depth), and the smaller ones blur into indistinct blobs with unclear legs and heads. The oversized star-shaped flakes floating in the air also look pasted on.
- Prompt ([`prompts/03-breath-take1.txt`](prompts/03-breath-take1.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE BREATH. A frozen forest of tall crystal trees under a huge aurora, at night. The camera sits at ground level in deep snow, 24 mm lens, looking through the forest across a clearing. The trees are forty to sixty metres tall and made of clear blue ice crystal: trunks like fluted glass columns, branches of faceted crystal spines and feathered hoarfrost blades that catch and bend the light of the sky, with snow caught on every limb. Trees stand close on both sides of the frame and thin out toward the centre.

Through the gap, at middle distance, a herd of massive furred beasts walks from right to left between the trunks: about fifteen animals of mixed sizes, towering adults as tall as a three-storey house with heavy shoulders and long shaggy coats hung with ice, half-grown ones, and small calves keeping close to them. They are dark shapes rimmed with aurora light, their breath rising as lit steam, snow kicked up around their legs. No animal is near the camera.

Above, a vast aurora fills the sky from edge to edge: broad curtains and tall rays of violet and magenta-violet, with bands of vivid green along their lower edges, and stars showing through. Its light floods the scene, violet and ice blue on the snow, green glints inside the crystal. The air is full of glittering snow: fine ice crystals hanging and slowly drifting, sparkling like diamond dust all through the frame.

Colour: ice blue and violet, with green only in the aurora and its reflections.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real aurora, snow-loaded frozen trees, hoarfrost crystals and a herd of large animals in snow look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

#### 03-breath take 2: [`03-breath-take2.png`](03-breath-take2.png)

- Model: Nano Banana Pro (`nano_banana_pro`). Output 2752x1536 PNG, kept as delivered.
- What this take tried: Prompt A again on Nano Banana Pro, to compare models on the same words.
- Made: started 21:54, generation took 28 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/breath-aurora-violet-green.jpg`](real/breath-aurora-violet-green.jpg)
  2. [`real/breath-aurora-over-snow.jpg`](real/breath-aurora-over-snow.jpg)
  3. [`real/breath-snow-loaded-trees.jpg`](real/breath-snow-loaded-trees.jpg)
  4. [`real/breath-bison-backlit-snow.jpg`](real/breath-bison-backlit-snow.jpg)
  5. [`real/breath-hoarfrost-crystals.jpg`](real/breath-hoarfrost-crystals.jpg)
- Eye check against the shot description: **pass**. Palette is there (violet, ice blue, green aurora) and so are aurora, snow forest and herd. Weak on the brief: most trees are ordinary snow-loaded conifers with only a few crystal trunks, the herd is nearer the camera than asked, and the colour is pushed toward illustration.
- Blind judge `still_viewer_07` (asked 21:59, answered 22:02): **(d) amateur generated art**, so it fails. Weakest part: The herd's contact with the ground: a dozen heavy musk oxen stride across pristine snow with no tracks, trampling or sinking hooves, and the calves carry full adult horns while the rear animals blur into duplicated shapes. The uniform oversaturated purple-green grade and the stray black bar along the top edge only add to the generated look.
- Prompt ([`prompts/03-breath-take2.txt`](prompts/03-breath-take2.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE BREATH. A frozen forest of tall crystal trees under a huge aurora, at night. The camera sits at ground level in deep snow, 24 mm lens, looking through the forest across a clearing. The trees are forty to sixty metres tall and made of clear blue ice crystal: trunks like fluted glass columns, branches of faceted crystal spines and feathered hoarfrost blades that catch and bend the light of the sky, with snow caught on every limb. Trees stand close on both sides of the frame and thin out toward the centre.

Through the gap, at middle distance, a herd of massive furred beasts walks from right to left between the trunks: about fifteen animals of mixed sizes, towering adults as tall as a three-storey house with heavy shoulders and long shaggy coats hung with ice, half-grown ones, and small calves keeping close to them. They are dark shapes rimmed with aurora light, their breath rising as lit steam, snow kicked up around their legs. No animal is near the camera.

Above, a vast aurora fills the sky from edge to edge: broad curtains and tall rays of violet and magenta-violet, with bands of vivid green along their lower edges, and stars showing through. Its light floods the scene, violet and ice blue on the snow, green glints inside the crystal. The air is full of glittering snow: fine ice crystals hanging and slowly drifting, sparkling like diamond dust all through the frame.

Colour: ice blue and violet, with green only in the aurora and its reflections.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real aurora, snow-loaded frozen trees, hoarfrost crystals and a herd of large animals in snow look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

#### 03-breath take 3: [`03-breath-take3.jpg`](03-breath-take3.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Prompt B on Seedream: lower camera on a frozen stream, herd crossing it, aurora seen through the crystal branches.
- Made: started 21:54, generation took 107 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/breath-aurora-violet-green.jpg`](real/breath-aurora-violet-green.jpg)
  2. [`real/breath-aurora-over-snow.jpg`](real/breath-aurora-over-snow.jpg)
  3. [`real/breath-snow-loaded-trees.jpg`](real/breath-snow-loaded-trees.jpg)
  4. [`real/breath-bison-backlit-snow.jpg`](real/breath-bison-backlit-snow.jpg)
  5. [`real/breath-hoarfrost-crystals.jpg`](real/breath-hoarfrost-crystals.jpg)
- Eye check against the shot description: **pass**. Ice blue and violet, with green in the aurora. Giant crystal trees with fanned needle crowns, a frozen stream, the herd crossing it at middle distance, aurora seen through the branches, glitter in the air. The strongest crystal forest of the three; the herd is small in frame.
- Blind judge `still_viewer_08` (asked 21:59, answered 22:02): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The bison herd is the weakest part: the animals are small, muddy and soft-edged, with the calves reading as near-identical dark blobs that pick up almost none of the aurora's purple-green light and sit on the ice without convincing contact shadows or reflections. The ice trees are also uniformly over-sparkled, so nothing in the frame rests.
- Prompt ([`prompts/03-breath-take3.txt`](prompts/03-breath-take3.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE BREATH. A frozen forest of tall crystal trees under a huge aurora, at night. The camera sits almost on the snow, 20 mm lens, looking along a frozen stream that winds away through the forest. The trees are giants, fifty metres and more, grown entirely of blue ice crystal: thick fluted trunks as clear as glacier ice, boughs that end in fans of long crystal needles, every surface edged with feathered hoarfrost. They rise on both banks and lean together high above, so the sky is seen through a broken lattice of glittering branches. In the foreground, crystal roots and snow hummocks catch a cold blue light.

A herd of massive furred beasts is crossing the stream at middle distance, in a loose line from the left bank to the right: about a dozen animals of mixed sizes, huge bulls taller than a house with humped shoulders and long shaggy coats crusted with ice, smaller cows, and calves trotting between them. They are dark against the snow and rim-lit by the sky, steam rising from their backs and breath, powder snow thrown up at their feet. None is close to the camera.

Through and above the branches a vast aurora fills the sky: tall rays and folded curtains of violet and purple with vivid green along the bottom edges, stars behind it. The crystal trees take the aurora inside them and glow violet and green at their edges; the snow is ice blue with violet shadows. Glittering snow hangs everywhere in the air, fine drifting ice crystals that sparkle at every depth.

Colour: ice blue and violet, with green only in the aurora and its reflections.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real aurora, snow-loaded frozen trees, hoarfrost crystals and a herd of large animals in snow look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

### Shot 4: The Blood Marsh (`04-blood-marsh`)

Palette asked for: Crimson and teal.

Brief: A swamp of giant red-leafed trees standing in dark red water. Glowing teal spores and drifting lights fill the air. One huge shape moves just under the surface, its wake part of the water. Camera low over the water.

Kept: take 3. All three passed the blind judge. Take 3 is kept because the shape really is under the surface (a broad swelling with wake rings and a swirl of teal spores over it, nothing rising clear), and the trees fade into rose mist, which gives depth. Take 2 shows a ribbed back clear of the water and its file has black bars top and bottom; take 1 is very dark. Faults still in it: Without the brief the swelling is hard to read as a creature. The teal lights are spread evenly and throw almost no light on trunks or water. Foreground reflections are smeary. Finished 22:05 (0h20m).

#### 04-blood-marsh take 1: [`04-blood-marsh-take1.jpg`](04-blood-marsh-take1.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Prompt A on Seedream: water-level view down a channel, the shape under the surface coming toward camera with a V wake.
- Made: started 21:54, generation took 121 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/marsh-red-cypress-water.jpg`](real/marsh-red-cypress-water.jpg)
  2. [`real/marsh-autumn-cypress-mist.jpg`](real/marsh-autumn-cypress-mist.jpg)
  3. [`real/marsh-fireflies-forest.jpg`](real/marsh-fireflies-forest.jpg)
  4. [`real/marsh-cypress-moss-flooded.jpg`](real/marsh-cypress-moss-flooded.jpg)
- Eye check against the shot description: **pass**. Crimson foliage, dark red water, teal points of light, a ridged back just breaking the surface with a wake, camera low over the water. Very dark: the teal lights are sparse and the shadows go close to black.
- Blind judge `still_viewer_09` (asked 21:59, answered 22:00): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The creature's back breaking the water in the centre is the least convincing element: it reads as a vague, low-detail dark ridge with a weak wake and little interaction with the surrounding water, so the focal point is ambiguous. The cyan glowing motes are also scattered a bit too evenly across the frame, flattening the depth.
- Prompt ([`prompts/04-blood-marsh-take1.txt`](prompts/04-blood-marsh-take1.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE BLOOD MARSH. A flooded forest of giant red-leafed trees standing in dark red water, in dim evening light. The camera is a hand's height above the water in an open channel, 24 mm lens, looking down the channel into the swamp. Giant trees rise straight out of the water on both sides, their trunks wider than a house, flared and fluted at the base like bald cypress, with arching stilt roots and root knees breaking the surface. They stand sixty metres tall and their crowns meet overhead in a dense canopy of crimson and scarlet leaves, with long streamers of dark red moss hanging from the branches. The water is dark blood red, almost black in the shadows, glassy, mirroring trunks and canopy, with red leaves and round pads floating on it.

The air is full of glowing teal spores: thousands of small soft blue-green lights at every depth, drifting slowly like pollen and fireflies, thick near the trunks and thinner over open water, each one mirrored in the surface. Larger pale teal lights float higher among the branches like slow lanterns. Shelf fungi and vines on the trunks glow the same teal, faintly.

At middle distance in the channel, one huge shape moves just under the surface, coming toward the camera at a slight angle: a long dark back the length of a ship, only a low hump and a line of ridges barely breaking the water. It pushes a smooth bow wave and trails a long V-shaped wake whose ripples run out to the tree trunks, bending the reflections and the teal lights. Nothing of the creature rises above the water.

Mist lies over the water between the trunks. Colour: crimson and deep red against glowing teal, and nothing else.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real flooded cypress forests, red autumn foliage over still water, swamp mist and drifting points of light at dusk look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

#### 04-blood-marsh take 2: [`04-blood-marsh-take2.png`](04-blood-marsh-take2.png)

- Model: Nano Banana Pro (`nano_banana_pro`). Output 2752x1536 PNG, kept as delivered.
- What this take tried: Prompt A again on Nano Banana Pro, to compare models on the same words.
- Made: started 21:54, generation took 29 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/marsh-red-cypress-water.jpg`](real/marsh-red-cypress-water.jpg)
  2. [`real/marsh-autumn-cypress-mist.jpg`](real/marsh-autumn-cypress-mist.jpg)
  3. [`real/marsh-fireflies-forest.jpg`](real/marsh-fireflies-forest.jpg)
  4. [`real/marsh-cypress-moss-flooded.jpg`](real/marsh-cypress-moss-flooded.jpg)
- Eye check against the shot description: **pass**. Crimson and teal are both strong. Buttressed trunks in dark red water, hanging red moss, many teal lights with reflections. The creature's ridged back stands clear of the water more than 'just under the surface', and it swims away from the camera.
- Blind judge `still_viewer_10` (asked 21:59, answered 22:00): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The dark ribbed creature in the foreground water is the weakest element: its form is ambiguous (no clear head, limbs, or direction of travel) and its wake and ripples don't convincingly match its shape. The teal glow points are also scattered too uniformly, reading as a sprinkled overlay rather than light sources in the scene.
- Prompt ([`prompts/04-blood-marsh-take2.txt`](prompts/04-blood-marsh-take2.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE BLOOD MARSH. A flooded forest of giant red-leafed trees standing in dark red water, in dim evening light. The camera is a hand's height above the water in an open channel, 24 mm lens, looking down the channel into the swamp. Giant trees rise straight out of the water on both sides, their trunks wider than a house, flared and fluted at the base like bald cypress, with arching stilt roots and root knees breaking the surface. They stand sixty metres tall and their crowns meet overhead in a dense canopy of crimson and scarlet leaves, with long streamers of dark red moss hanging from the branches. The water is dark blood red, almost black in the shadows, glassy, mirroring trunks and canopy, with red leaves and round pads floating on it.

The air is full of glowing teal spores: thousands of small soft blue-green lights at every depth, drifting slowly like pollen and fireflies, thick near the trunks and thinner over open water, each one mirrored in the surface. Larger pale teal lights float higher among the branches like slow lanterns. Shelf fungi and vines on the trunks glow the same teal, faintly.

At middle distance in the channel, one huge shape moves just under the surface, coming toward the camera at a slight angle: a long dark back the length of a ship, only a low hump and a line of ridges barely breaking the water. It pushes a smooth bow wave and trails a long V-shaped wake whose ripples run out to the tree trunks, bending the reflections and the teal lights. Nothing of the creature rises above the water.

Mist lies over the water between the trunks. Colour: crimson and deep red against glowing teal, and nothing else.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real flooded cypress forests, red autumn foliage over still water, swamp mist and drifting points of light at dusk look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

#### 04-blood-marsh take 3: [`04-blood-marsh-take3.jpg`](04-blood-marsh-take3.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Prompt B on Seedream: wide misty pool, the shape crossing left to right, trees fading into rose mist.
- Made: started 21:54, generation took 110 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/marsh-red-cypress-water.jpg`](real/marsh-red-cypress-water.jpg)
  2. [`real/marsh-autumn-cypress-mist.jpg`](real/marsh-autumn-cypress-mist.jpg)
  3. [`real/marsh-fireflies-forest.jpg`](real/marsh-fireflies-forest.jpg)
  4. [`real/marsh-cypress-moss-flooded.jpg`](real/marsh-cypress-moss-flooded.jpg)
- Eye check against the shot description: **pass**. Crimson trees with hanging red moss fading into rose mist, dark red water, teal lights, and a broad low swelling under the surface with wake rings and a swirl of teal spores above it. Closest of the three to the brief.
- Blind judge `still_viewer_11` (asked 21:59, answered 22:00): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The central water swell is the weakest element: it reads as an ambiguous, unmotivated bulge with no clear cause or wake, and the foreground water around it turns into smeary, muddled reflections. The teal glow specks are also scattered too evenly and cast almost no light on the trunks or water around them.
- Prompt ([`prompts/04-blood-marsh-take3.txt`](prompts/04-blood-marsh-take3.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE BLOOD MARSH. A flooded forest of giant red-leafed trees standing in dark red water, in thick evening mist. The camera skims a hand's height above the water, 28 mm lens, looking across a wide pool ringed by trees. The trees are giants: trunks broader than a house, buttressed and fluted where they enter the water, with tangles of arching stilt roots, rising into heavy crowns of crimson, scarlet and wine-red leaves and long hanging beards of red moss. Rank behind rank they fade into rose-coloured mist, so the farthest are only tall red shadows. The water is dark blood red, still as oil where it is undisturbed, mirroring the trunks, with drifts of fallen red leaves.

Across the pool at middle distance, one huge shape is moving just under the surface from left to right. Nothing rises clear of the water: there is only a long, low swelling of the surface, the wet gleam of a broad dark back for an instant, and a powerful wake, a smooth bow wave in front and long diverging lines of ripples behind that spread across the whole pool, rock the floating leaves and break the reflections of the trees into bands.

The air everywhere is full of glowing teal spores: thousands of small soft blue-green lights drifting at every depth like slow fireflies, gathering in swirls above the wake and around the trunks, each mirrored in the red water, with a few larger pale teal lights floating high in the branches. Teal-glowing fungi dot the roots at the waterline.

Colour: crimson and deep red against glowing teal, and nothing else. The mist is lit a dull rose from above.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real flooded cypress forests, red autumn foliage over still water, swamp mist and drifting points of light at dusk look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

### Shot 5: The Spine (`05-spine`)

Palette asked for: Storm purple and white gold.

Brief: Towering vertebra-shaped peaks with waterfalls dropping from them into a sea of cloud. A violent lightning storm lights the peaks and clouds from within. Enormous winged shapes ride the storm. Camera level with the ridge, looking down its length.

Kept: take 4. Takes 1, 3 and 4 passed the blind judge. Take 4, the remake made after the look-alike check, is kept: it is the one that owns the palette asked for (deep storm purple against pale gold spires, a white-gold sun beam and warm-lit cloud tops), its five peaks are clean separate silhouettes that read at thumbnail size, lightning strikes the spires themselves, and each peak holds a pool above its waterfalls. Take 3 was kept until then and stays in the folder as the alternative: its bone surface and its sense of height are more photographic, but it is greyer and busier, which is what the look-alike agent named. Faults still in it: The waterfalls are huge torrents pouring off every side of small summit pools, far more water than the pools could feed. The spires repeat almost unchanged down the row. The small lightning bolt inside the sun beam on the right looks pasted on. The lightning is violet-white rather than gold. The winged shapes are still small in frame. The bone still stands on a dark rock pillar rather than being the whole peak. Finished 22:40 (0h55m).

#### 05-spine take 1: [`05-spine-take1.jpg`](05-spine-take1.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Prompt A on Seedream: looking straight down the line of vertebra peaks, storm on the middle and far peaks, low sun from the left.
- Made: started 21:54, generation took 129 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/spine-storm-lit-within.jpg`](real/spine-storm-lit-within.jpg)
  2. [`real/spine-lightning-web.jpg`](real/spine-lightning-web.jpg)
  3. [`real/spine-angel-falls-cloud.jpg`](real/spine-angel-falls-cloud.jpg)
  4. [`real/spine-tepui-cloud-sea.jpg`](real/spine-tepui-cloud-sea.jpg)
  5. [`real/spine-jagged-peaks-storm-light.jpg`](real/spine-jagged-peaks-storm-light.jpg)
- Eye check against the shot description: **pass**. Storm purple with white-gold light from the left. A straight line of vertebra shapes along a ridge crest running to the horizon, waterfalls into a sea of cloud, lightning in the storm, three winged shapes. The vertebrae read as bones standing on cliffs more than as whole peaks, and the winged shapes are small.
- Blind judge `still_viewer_12` (asked 21:59, answered 22:00): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The waterfalls pour from the crest of a knife-thin ridge with no catchment to feed them, and the vertebrae are near-identical copies that smear into indistinct nubs toward the far end.
- Prompt ([`prompts/05-spine-take1.txt`](prompts/05-spine-take1.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE SPINE. A mountain ridge made of towering vertebra-shaped peaks, seen from the height of the ridge crest, looking straight down its length as it runs away to the horizon. Each peak is one colossal vertebra of ancient bone turned to rock, thousands of metres tall: a massive rounded body, a tall blade-like spine rising from its top, and two wing-like buttresses flaring to the sides. The same shape repeats peak after peak in a single line, shrinking with distance and curving gently to the right. Their flanks are hung with dark cloud forest, moss and long trailing vines, and trees cling to every ledge. From the saddles between the peaks and from hollows in the bone, many waterfalls drop as long white threads straight down into a sea of cloud that fills everything below and hides the ground.

A violent thunderstorm is breaking on the ridge. Towering storm clouds in deep purple and violet wrap the middle and far peaks and are lit from inside by lightning, so that whole cloud masses glow white gold from within; several branching bolts strike different peaks at the same moment, and the cloud sea below flashes in patches. Low sun breaks in under the storm from the left and edges the near peaks, the waterfalls and the cloud tops in white gold. Grey-violet rain curtains trail from the cloud base.

Enormous winged shapes ride the storm: five or six huge dark silhouettes with long narrow wings, gliding between the peaks at middle and far distance, some half hidden in cloud, each with a wingspan as wide as a summit.

Colour: storm purple and violet with white-gold light. Green appears only as dark accents on the rock.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real thunderstorms lit from within by lightning, sheer cloud-wrapped rock towers, high waterfalls and seas of cloud look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

#### 05-spine take 2: [`05-spine-take2.png`](05-spine-take2.png)

- Model: Nano Banana Pro (`nano_banana_pro`). Output 2752x1536 PNG, kept as delivered.
- What this take tried: Prompt A again on Nano Banana Pro, to compare models on the same words.
- Made: started 21:54, generation took 29 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/spine-storm-lit-within.jpg`](real/spine-storm-lit-within.jpg)
  2. [`real/spine-lightning-web.jpg`](real/spine-lightning-web.jpg)
  3. [`real/spine-angel-falls-cloud.jpg`](real/spine-angel-falls-cloud.jpg)
  4. [`real/spine-tepui-cloud-sea.jpg`](real/spine-tepui-cloud-sea.jpg)
  5. [`real/spine-jagged-peaks-storm-light.jpg`](real/spine-jagged-peaks-storm-light.jpg)
- Eye check against the shot description: **pass**. Storm purple and white gold. Moss-hung rock peaks in a line, waterfalls into a cloud sea, lightning lighting the cloud from within, winged shapes. The peaks are only loosely vertebra-shaped and read as rock spires.
- Blind judge `still_viewer_13` (asked 21:59, answered 22:02): **(d) amateur generated art**, so it fails. Weakest part: The rock spires are the same boulder-and-fin silhouette cloned four or five times in a shrinking row toward the horizon, which reads as a generated motif rather than designed geology. The waterfalls also pour off narrow peaks with no plausible water source, and there is a smudged pseudo-signature in the bottom-right corner.
- Prompt ([`prompts/05-spine-take2.txt`](prompts/05-spine-take2.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE SPINE. A mountain ridge made of towering vertebra-shaped peaks, seen from the height of the ridge crest, looking straight down its length as it runs away to the horizon. Each peak is one colossal vertebra of ancient bone turned to rock, thousands of metres tall: a massive rounded body, a tall blade-like spine rising from its top, and two wing-like buttresses flaring to the sides. The same shape repeats peak after peak in a single line, shrinking with distance and curving gently to the right. Their flanks are hung with dark cloud forest, moss and long trailing vines, and trees cling to every ledge. From the saddles between the peaks and from hollows in the bone, many waterfalls drop as long white threads straight down into a sea of cloud that fills everything below and hides the ground.

A violent thunderstorm is breaking on the ridge. Towering storm clouds in deep purple and violet wrap the middle and far peaks and are lit from inside by lightning, so that whole cloud masses glow white gold from within; several branching bolts strike different peaks at the same moment, and the cloud sea below flashes in patches. Low sun breaks in under the storm from the left and edges the near peaks, the waterfalls and the cloud tops in white gold. Grey-violet rain curtains trail from the cloud base.

Enormous winged shapes ride the storm: five or six huge dark silhouettes with long narrow wings, gliding between the peaks at middle and far distance, some half hidden in cloud, each with a wingspan as wide as a summit.

Colour: storm purple and violet with white-gold light. Green appears only as dark accents on the rock.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real thunderstorms lit from within by lightning, sheer cloud-wrapped rock towers, high waterfalls and seas of cloud look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

#### 05-spine take 3: [`05-spine-take3.jpg`](05-spine-take3.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Prompt B on Seedream: one vertebra peak close on the left, the ridge running diagonally away into the storm.
- Made: started 21:54, generation took 128 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/spine-storm-lit-within.jpg`](real/spine-storm-lit-within.jpg)
  2. [`real/spine-lightning-web.jpg`](real/spine-lightning-web.jpg)
  3. [`real/spine-angel-falls-cloud.jpg`](real/spine-angel-falls-cloud.jpg)
  4. [`real/spine-tepui-cloud-sea.jpg`](real/spine-tepui-cloud-sea.jpg)
  5. [`real/spine-jagged-peaks-storm-light.jpg`](real/spine-jagged-peaks-storm-light.jpg)
- Eye check against the shot description: **pass**. Storm purple with white-gold lightning at the centre. One vertebra close on the left with waterfalls from its cliffs, the ridge running away diagonally, cloud sea, winged shapes against the lit cloud. The vertebrae again read as bones on cliff tops.
- Blind judge `still_viewer_14` (asked 21:59, answered 22:02): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The waterfalls pour in heavy volume from the very top of a narrow ridge with no visible water source, and they read as soft, repeated white streaks rather than convincingly simulated water. The warm key light on the foreground bones also doesn't quite match the cold, backlit storm glow behind them.
- Prompt ([`prompts/05-spine-take3.txt`](prompts/05-spine-take3.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE SPINE. A mountain ridge made of towering vertebra-shaped peaks, in a lightning storm. The camera hangs in the air level with the ridge crest, close beside the first peak, looking along the ridge as it runs diagonally from the left foreground to the far right horizon. Each peak is one colossal vertebra of ancient bone turned to rock, thousands of metres tall: a thick drum-shaped body, a tall blade of bone standing up from it like a fin, and broad side wings. The nearest fills the left third of the frame, close enough to see its pitted bone surface, the hanging gardens of moss, vines and wind-bent trees on its ledges, and three waterfalls that leap from its hollows and fall as white ribbons until they dissolve in the sea of cloud far below. Behind it the same shape repeats again and again along the ridge, each peak smaller and bluer, each with its own waterfalls, until the line is lost in the storm.

The storm fills the sky: enormous purple and violet thunderheads piled above and between the peaks, lit from within so that they glow white gold at their cores, with forked lightning striking three peaks at once and sheet lightning spreading through the cloud sea below. Where the cloud opens, a shaft of white-gold sunlight rakes across the ridge and turns the waterfalls and the edges of the bone to bright gold.

Enormous winged shapes ride the storm at middle distance: five or six huge dark silhouettes with long narrow wings, banking between the peaks, one caught sharply against a lightning-lit cloud, each as wide as a summit.

Colour: storm purple and violet with white-gold light. Green appears only as dark accents on the rock.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real thunderstorms lit from within by lightning, sheer cloud-wrapped rock towers, high waterfalls and seas of cloud look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

#### 05-spine take 4: [`05-spine-take4.jpg`](05-spine-take4.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Remake after the look-alike check, which named the Spine the weaker of its nearest call with the Breath (violet-blue sky over blue-white, greyer and busier). New generation from the same real photographs, not a re-shoot of take 3: the palette is pushed to two colours, deep storm purple and white gold (gold lightning, cloud lit gold from within, one sun beam), only five well-separated peaks, the peaks are the vertebrae themselves rather than bones on cliff tops, each waterfall has a lake as its source, and the winged shapes are as wide as a peak.
- Made: started 22:35, generation took 116 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/spine-storm-lit-within.jpg`](real/spine-storm-lit-within.jpg)
  2. [`real/spine-lightning-web.jpg`](real/spine-lightning-web.jpg)
  3. [`real/spine-angel-falls-cloud.jpg`](real/spine-angel-falls-cloud.jpg)
  4. [`real/spine-tepui-cloud-sea.jpg`](real/spine-tepui-cloud-sea.jpg)
  5. [`real/spine-jagged-peaks-storm-light.jpg`](real/spine-jagged-peaks-storm-light.jpg)
- Eye check against the shot description: **pass**. Deep storm purple with white gold: pale gold spires, a white-gold sun beam through a tear in the storm on the right, lightning striking three spires, warm-lit cloud sea. Five well-separated vertebra peaks run down the length of the ridge from the camera, each with a tall spire, two swept wings and a hollow drum, and each holds a pool that feeds its waterfalls into the cloud. Cleaner and less grey than take 3 at small size. The lightning itself is violet-white rather than gold, the winged shapes are still small (one mid-sized near the first spire), and the bone still sits on a dark rock pillar.
- Blind judge `still_viewer_25` (asked 22:38, answered 22:40): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The waterfalls are the least convincing element: huge torrents pour off every side of tiny summit basins with no visible source, and the receding spires repeat like near-identical clones. The small lightning bolt inside the sunbeam on the right also looks pasted on rather than lit by the scene.
- Prompt ([`prompts/05-spine-take4.txt`](prompts/05-spine-take4.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE SPINE. A mountain ridge of towering vertebra-shaped peaks in a violent lightning storm, above a sea of cloud. The camera hangs in the air level with the crest, just off the near end of the ridge, looking down its length as it runs away in a long gentle curve from the lower left to the horizon right of centre. The mountains themselves are the vertebrae: each peak is one bone of an unimaginably large backbone, thousands of metres tall and long since turned to pale ivory rock, with a thick drum-shaped body, a tall blade-like spire standing up from it and two broad wings sweeping out to the sides. The body of each peak plunges straight down into the cloud with no separate cliff or plateau under it; bone and mountain are one mass of pale, pitted, weathered stone. Only five peaks are clearly seen, well apart, each a clean silhouette against lit cloud, the nearest filling the left third of the frame, the others smaller and hazier in turn; beyond them the line is only a hint in the storm.

Water: rain streams off every spire and gathers in a dark lake held in the saddle between each peak's wings. Each lake spills over its lip as two or three great waterfalls that drop the full height of the peak as white ribbons, drift sideways in the wind and vanish into the cloud sea. Dark green hanging forest, moss and wind-bent trees cling to the ledges around the lakes.

The storm: a wall of deep purple and black-violet thunderheads stands over the ridge and fills the upper half of the frame. It is lit from within by white-gold lightning, so that its cores glow like lanterns, and several forked bolts, white gold and blinding, strike the spires of three peaks at once. The cloud sea below glows white gold too, wherever lightning flickers inside it. Low on the right a tear in the storm lets the sun through as one broad white-gold beam that falls across the ridge, turning the nearest spire, its waterfalls and the cloud tops beneath it to bright gold against the purple.

Enormous winged shapes ride the storm at middle distance: three vast dark silhouettes with long narrow wings, each with a wingspan nearly as wide as a peak, gliding between the second and third peaks, one crossing in front of a lit cloud core so that its whole outline is clear, and a few more far off, small as birds.

Colour: two colours carry the frame, deep storm purple and white gold. No blue daylight and no grey. Green appears only as dark accents on the rock.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real thunderstorms lit from within by lightning, sheer cloud-wrapped rock towers, high waterfalls and seas of cloud look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

### Shot 6: The Eye (`06-eye`)

Palette asked for: Indigo and gold, night.

Brief: Night. A round lake with a glowing gold iris pattern radiating from a dark center, bright enough to light the shore. Tall alien plants and drifting lights ring the water. Camera high, looking down at an angle.

Kept: take 3. Only take 3 passed the blind judge. It is also the closest to the brief: the whole lake is a gold iris around a black centre and it is the light source for the shore, the mist and the plants. Faults still in it: It is very literally an eye, which may be more than the film wants before the last shot. The flock over the water is a few indistinct smudges. The foreground plants are dark, repeat the same curled shape and pick up little of the gold light. Drifting lights are sparse. Finished 22:05 (0h20m).

#### 06-eye take 1: [`06-eye-take1.jpg`](06-eye-take1.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Prompt A on Seedream: steep high view, lake as an ellipse mid-frame, fine gold filaments radiating from a black centre.
- Made: started 21:56, generation took 171 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/eye-grand-prismatic-aerial.jpg`](real/eye-grand-prismatic-aerial.jpg)
  2. [`real/eye-great-blue-hole-oblique.jpg`](real/eye-great-blue-hole-oblique.jpg)
  3. [`real/eye-bioluminescent-shore.jpg`](real/eye-bioluminescent-shore.jpg)
  4. [`real/eye-fireflies-night.jpg`](real/eye-fireflies-night.jpg)
- Eye check against the shot description: **pass**. Indigo and gold. Round lake from high up, dark centre, fine gold filaments radiating from it, a gold line at the shore that lights the plants, tall plants ringing the water, a strip of stars. The iris covers only the middle of the lake and most of the water stays dark blue; few drifting lights.
- Blind judge `still_viewer_15` (asked 22:02, answered 22:04): **(d) amateur generated art**, so it fails. Weakest part: The central dark hole with its golden filaments sits on the pool like a flat overlay: the water shows no ripples, flow or believable reflection around it, so its scale and depth are unreadable. The surrounding foliage is also generic and mushy, with a faint grid-like texture in the dark areas.
- Prompt ([`prompts/06-eye-take1.txt`](prompts/06-eye-take1.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE EYE. Night. A perfectly round lake seen from high above, looking down at a steep angle, so that it lies as a wide ellipse in the middle of the frame with dark forest all around it. The lake glows. At its centre is a round, black, bottomless pool. From the rim of that dark centre hundreds of fine luminous gold filaments radiate outward to the shore like the fibres of an iris, brightest amber gold near the centre, branching and feathering toward the edge, where a thin bright gold line marks the meeting of water and land. The light comes from inside the water and is strong enough to light the shore: beaches, roots and the first ranks of plants are lit warm gold on the side facing the lake and throw long shadows outward into the dark.

Around the water stands a dense ring of tall alien plants, thirty to fifty metres high: stalks with huge drooping fronds, towering spiral ferns, bulb-topped trunks and giant pale flowers that lean toward the lake. Behind them the jungle rolls away blue-black. Hundreds of small drifting lights float above the shore and over the water, soft gold and pale white, like lantern seeds rising slowly on warm air, and a loose flock of pale winged creatures crosses low over the lake, tiny against it. Thin mist curls off the surface and catches the gold.

Everything beyond the reach of the glow is deep indigo night: blue-black canopy, far hills, and at the top of the frame a strip of sky thick with stars.

Colour: indigo and gold only.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real round pools with radiating colour seen from the air, glowing water at night and drifting points of light in the dark look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

#### 06-eye take 2: [`06-eye-take2.png`](06-eye-take2.png)

- Model: Nano Banana Pro (`nano_banana_pro`). Output 2752x1536 PNG, kept as delivered.
- What this take tried: Prompt A again on Nano Banana Pro, to compare models on the same words.
- Made: started 21:54, generation took 29 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/eye-grand-prismatic-aerial.jpg`](real/eye-grand-prismatic-aerial.jpg)
  2. [`real/eye-great-blue-hole-oblique.jpg`](real/eye-great-blue-hole-oblique.jpg)
  3. [`real/eye-bioluminescent-shore.jpg`](real/eye-bioluminescent-shore.jpg)
  4. [`real/eye-fireflies-night.jpg`](real/eye-fireflies-night.jpg)
- Eye check against the shot description: **pass**. Indigo and gold. Round lake, dark centre, long gold radial streaks, bright shore line, many drifting lights and a flock of pale birds, plants all round (palms, lilies and fern coils, more earthly than alien). There is a thin black bar along the top edge of the file.
- Blind judge `still_viewer_16` (asked 22:02, answered 22:04): **(d) amateur generated art**, so it fails. Weakest part: The glowing pool itself: the radial gold streaks and smudgy black centre read as a flat eye-iris texture pasted onto the ground rather than water or a lit volume, with a uniform neon rim and evenly sprinkled light dots. The foreground scale is also incoherent, with lilies and fern fiddleheads as large as the palm trees beside them.
- Prompt ([`prompts/06-eye-take2.txt`](prompts/06-eye-take2.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE EYE. Night. A perfectly round lake seen from high above, looking down at a steep angle, so that it lies as a wide ellipse in the middle of the frame with dark forest all around it. The lake glows. At its centre is a round, black, bottomless pool. From the rim of that dark centre hundreds of fine luminous gold filaments radiate outward to the shore like the fibres of an iris, brightest amber gold near the centre, branching and feathering toward the edge, where a thin bright gold line marks the meeting of water and land. The light comes from inside the water and is strong enough to light the shore: beaches, roots and the first ranks of plants are lit warm gold on the side facing the lake and throw long shadows outward into the dark.

Around the water stands a dense ring of tall alien plants, thirty to fifty metres high: stalks with huge drooping fronds, towering spiral ferns, bulb-topped trunks and giant pale flowers that lean toward the lake. Behind them the jungle rolls away blue-black. Hundreds of small drifting lights float above the shore and over the water, soft gold and pale white, like lantern seeds rising slowly on warm air, and a loose flock of pale winged creatures crosses low over the lake, tiny against it. Thin mist curls off the surface and catches the gold.

Everything beyond the reach of the glow is deep indigo night: blue-black canopy, far hills, and at the top of the frame a strip of sky thick with stars.

Colour: indigo and gold only.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real round pools with radiating colour seen from the air, glowing water at night and drifting points of light in the dark look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

#### 06-eye take 3: [`06-eye-take3.jpg`](06-eye-take3.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Prompt B on Seedream: lower angle across the lake with the near-shore plants dark against the glow, broad gold ring of radial streaks.
- Made: started 21:56, generation took 112 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/eye-grand-prismatic-aerial.jpg`](real/eye-grand-prismatic-aerial.jpg)
  2. [`real/eye-great-blue-hole-oblique.jpg`](real/eye-great-blue-hole-oblique.jpg)
  3. [`real/eye-bioluminescent-shore.jpg`](real/eye-bioluminescent-shore.jpg)
  4. [`real/eye-fireflies-night.jpg`](real/eye-fireflies-night.jpg)
- Eye check against the shot description: **pass**. Indigo and gold. The whole lake is a gold iris around a black centre, bright enough to light the mist and the shore plants, which stand dark against it; coiled and bulb-topped plants, small drifting lights, a river and stars beyond. The most direct reading of the brief, and very literally an eye.
- Blind judge `still_viewer_17` (asked 22:02, answered 22:04): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The small flying creatures over the glowing iris-shaped pool are indistinct smudges, and the dark foreground plants are murky, repetitive curled shapes that pick up too little of the pool's strong golden light.
- Prompt ([`prompts/06-eye-take3.txt`](prompts/06-eye-take3.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien place photographed for real, on location, with a large-format cinema camera.

THE EYE. Night. A round lake seen from a high vantage, looking down at an angle across it, the near shore at the bottom of the frame and the far shore two thirds of the way up. The lake is a glowing eye. Its centre is a wide, perfectly round well of black water. Around that dark centre the shallows shine gold: a broad luminous ring made of thousands of fine radial streaks and channels of glowing amber and yellow gold, running from the black centre out to the shore like the pattern of an iris, with a darker bronze band at the outer rim. The light rises from within the water, bright enough to light the whole shore, the mist above the lake and the undersides of the leaves around it.

The near shore is crowded with tall alien plants, seen from above and slightly behind, dark against the glow and edged with gold: giant fronds, towering stalks topped with bulbs and feathery plumes, coiled fern crowns, huge night flowers open toward the water. The same tall growth rings the entire lake and fades into blue-black jungle. Hundreds of drifting lights hang in the air above the shore and the water, small soft gold and pale white points at many heights, rising slowly; a flock of pale winged creatures glides low across the bright ring, tiny against it. Wisps of mist drift over the surface.

Beyond the glow the land is deep indigo: ridges of forest, a river catching a little starlight, and a clear night sky full of stars across the top of the frame.

Colour: indigo and gold only.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail on every material, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no text, no logos, no watermark, no border.

The attached pictures are photographs of real places on Earth. Use them only as evidence of how real round pools with radiating colour seen from the air, glowing water at night and drifting points of light in the dark look: their light, texture, wetness and atmosphere. Do not copy their framing, and do not carry over any people, buildings, boats, roads or signs that appear in them.
```

### Shot 7: The Reveal (`07-reveal`)

Palette asked for: All six palettes on a dark sea, seen from orbit.

Brief: Seen from orbit with the curve of the planet behind it: the whole continent is a titan lying on its side in a dark sea, overgrown with life. From here you can pick out the green jungle in the ribs, the lava glow of the heart, the aurora over the frozen forest, the red marsh, the storm on the spine and the lit eye. It reads as a real landmass shaped like a body, not a statue or a skeleton on a table. Keep the hand, foot and skull subtle.

Kept: take 5. Takes 1 and 5 both passed the blind judge and are nearly the same picture. Take 5 is kept because its storm is lower and flatter with an anvil top, so it no longer reads as one giant cloud pile, and the red bay has current in it instead of a flat stain. Takes 2, 3 and 4 were all judged amateur generated art. Faults still in it: Scale still reads as a miniature: single snow-covered trees are readable on the ice arm from orbit and the rib ridges are thin drawn lines. The gold ring and the aurora ribbon sit flat on the surface like overlays. The head end is dim and the skull, hand and foot are subtle to the point that the body takes a moment to find. Finished 22:31 (0h46m).

#### 07-reveal take 1: [`07-reveal-take1.jpg`](07-reveal-take1.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Layout study A drawn in code (figure-shaped continent with each region in its place, planet curve, dusk light) passed as image 1 with the instruction to re-photograph it sharp, plus three real orbital photographs. The prompt describes geography, not anatomy: a coast that resembles a sleeping giant the way Italy resembles a boot.
- Made: started 22:18, generation took 145 s.
- Reference images, in the order passed (image 1 first):
  1. [`guides/07-reveal-layout-a.jpg`](guides/07-reveal-layout-a.jpg)
  2. [`real/reveal-landmass-dusk-from-orbit.jpg`](real/reveal-landmass-dusk-from-orbit.jpg)
  3. [`real/reveal-aurora-from-orbit.jpg`](real/reveal-aurora-from-orbit.jpg)
  4. [`real/reveal-green-land-dark-sea.jpg`](real/reveal-green-land-dark-sea.jpg)
- Eye check against the shot description: **pass**. From orbit with the planet's curve, atmosphere line and sunglint. One green overgrown continent in a dark sea shaped like a figure on its side: headland with the gold ring lake at left, an ice-covered bent arm below it, a long body, two bent legs with feet to the right. All six regions can be picked out: green jungle crossed by pale curved ridges, orange lava with branching rivers, red marsh bleeding into the bay, a storm lit from inside along the far coast, a thin aurora over the ice, the lit lake. Reads as a landmass, not a statue. The ridges are thin drawn-looking lines and the gold ring and aurora look laid on top.
- Blind judge `still_viewer_21` (asked 22:22, answered 22:24): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The scale is inconsistent: individual trees and snowy forest on the lower-left landmass and the continent-sized storm cloud read as far too large for an orbital view. The glowing ring and aurora streak on the left also look pasted on rather than integrated with the scene's lighting.
- Prompt ([`prompts/07-reveal-take1.txt`](prompts/07-reveal-take1.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien world photographed for real from high orbit with a large-format cinema camera.

Image 1 is a rough, out-of-focus layout study of this frame. Keep its composition: the strongly curved horizon of the planet across the top with a thin blue line of atmosphere and black space with stars above it, the dark sea, and one large continent in the same place, at the same size, with the same outline and with every coloured region where the study has it. Re-photograph that scene sharp and real. None of the study's flat colours, soft blobs, stripes or dots should survive as drawn; every one of them becomes real terrain, real cloud and real light.

The continent is a single huge landmass in a dark blue-black ocean, overgrown with life from coast to coast, seen at dusk: low warm sun raking in from the right, night coming on from the left. Its coastline happens to resemble a giant asleep on its side, the way Italy resembles a boot: a rounded headland at the left, a broad main body, one bent peninsula curling back toward the headland and two long bent peninsulas trailing away to the right, each ending in a scatter of small islets. It is geography first. The coasts are ragged and fractal, with bays, capes, reefs, river mouths, turquoise shallows and offshore islands. Nothing is sculpted, smooth, symmetrical or raised like a relief.

Where things are, exactly as the study places them:
The upper middle-left of the main body is the lushest, deepest green rainforest on the continent, crossed by a row of long, parallel, gently curved pale ridgelines, half overgrown, with mist lying in the valleys between them.
Just in front of those ridges, near the near coast, a lake of molten lava glows orange in a field of black volcanic glass, and thin glowing rivers branch away from it through the black rock toward the sea. A thread of smoke trails off it.
The middle of the main body is a wide, low wetland of crimson-red forest cut by dark red channels. Its red water stains the bay beside it and fades out into the dark sea.
Along the far coast, behind all of this, runs one long narrow mountain range of evenly spaced sharp pale peaks. Most of it is buried under a single long storm system: towering purple-grey thunderheads, lit white gold from inside by lightning in several places at once.
On the rounded headland at the left lies one perfectly round lake that glows gold in a ring around a dark centre, bright enough to light the land around it in the dusk.
Below the headland the land and the bay are frozen: pale blue-white ice forest and snow, pack ice breaking up on the water. Over it hangs a tall curtain of green and violet aurora, seen from above and curving away toward the horizon.
Everything else is rich green jungle and river systems.

Real planet detail: fields of small cumulus and thin cloud streets over the ocean, casting their own shadows; haze thickening toward the curved horizon; the thin luminous blue band of atmosphere on the limb; sunglint on the sea at the right; the soft line between day and night falling across the left of the frame. No city lights anywhere, no grid, no roads.

The other attached pictures are real photographs taken from orbit. Use them only as evidence of how land, sea, cloud, aurora and the atmosphere really look from up there. Do not copy their framing or their coastlines.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail at every size, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, a map, a diagram, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no spacecraft parts, no window frame, no text, no labels, no logos, no watermark, no border.
```

#### 07-reveal take 2: [`07-reveal-take2.png`](07-reveal-take2.png)

- Model: Nano Banana Pro (`nano_banana_pro`). Output 2752x1536 PNG, kept as delivered.
- What this take tried: Same prompt and layout study A as take 1 on the second model, with all four real orbital photographs.
- Made: started 22:18, generation took 36 s.
- Reference images, in the order passed (image 1 first):
  1. [`guides/07-reveal-layout-a.jpg`](guides/07-reveal-layout-a.jpg)
  2. [`real/reveal-landmass-dusk-from-orbit.jpg`](real/reveal-landmass-dusk-from-orbit.jpg)
  3. [`real/reveal-aurora-from-orbit.jpg`](real/reveal-aurora-from-orbit.jpg)
  4. [`real/reveal-green-land-dark-sea.jpg`](real/reveal-green-land-dark-sea.jpg)
  5. [`real/reveal-island-oblique-day.jpg`](real/reveal-island-oblique-day.jpg)
- Eye check against the shot description: **pass**. From orbit with the planet's curve and atmosphere line. One overgrown continent in a dark sea in the shape of a figure on its side: dark headland with the gold ring lake at left, a bent arm below it under ice, a long body, two bent legs to the right. All six regions can be picked out: green ridged jungle, orange lava with branching rivers, red marsh, purple storm with lightning along the far coast, aurora over the ice, lit lake. It reads as a landmass, not a statue. It also reads as a rendered game map more than a photograph, and the red marsh fills the bay as land.
- Blind judge `still_viewer_20` (asked 22:21, answered 22:21): **(d) amateur generated art**, so it fails. Weakest part: The scale is incoherent: mountains, a volcano, a purple storm and an aurora are rendered miniature-diorama size on a continent seen from orbit, with the aurora ribbon and glowing yellow ring on the left pasted over the surface rather than sitting in the atmosphere. The flat, saturated red region and neon lava also clash with the otherwise photoreal ocean and clouds.
- Prompt ([`prompts/07-reveal-take2.txt`](prompts/07-reveal-take2.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien world photographed for real from high orbit with a large-format cinema camera.

Image 1 is a rough, out-of-focus layout study of this frame. Keep its composition: the strongly curved horizon of the planet across the top with a thin blue line of atmosphere and black space with stars above it, the dark sea, and one large continent in the same place, at the same size, with the same outline and with every coloured region where the study has it. Re-photograph that scene sharp and real. None of the study's flat colours, soft blobs, stripes or dots should survive as drawn; every one of them becomes real terrain, real cloud and real light.

The continent is a single huge landmass in a dark blue-black ocean, overgrown with life from coast to coast, seen at dusk: low warm sun raking in from the right, night coming on from the left. Its coastline happens to resemble a giant asleep on its side, the way Italy resembles a boot: a rounded headland at the left, a broad main body, one bent peninsula curling back toward the headland and two long bent peninsulas trailing away to the right, each ending in a scatter of small islets. It is geography first. The coasts are ragged and fractal, with bays, capes, reefs, river mouths, turquoise shallows and offshore islands. Nothing is sculpted, smooth, symmetrical or raised like a relief.

Where things are, exactly as the study places them:
The upper middle-left of the main body is the lushest, deepest green rainforest on the continent, crossed by a row of long, parallel, gently curved pale ridgelines, half overgrown, with mist lying in the valleys between them.
Just in front of those ridges, near the near coast, a lake of molten lava glows orange in a field of black volcanic glass, and thin glowing rivers branch away from it through the black rock toward the sea. A thread of smoke trails off it.
The middle of the main body is a wide, low wetland of crimson-red forest cut by dark red channels. Its red water stains the bay beside it and fades out into the dark sea.
Along the far coast, behind all of this, runs one long narrow mountain range of evenly spaced sharp pale peaks. Most of it is buried under a single long storm system: towering purple-grey thunderheads, lit white gold from inside by lightning in several places at once.
On the rounded headland at the left lies one perfectly round lake that glows gold in a ring around a dark centre, bright enough to light the land around it in the dusk.
Below the headland the land and the bay are frozen: pale blue-white ice forest and snow, pack ice breaking up on the water. Over it hangs a tall curtain of green and violet aurora, seen from above and curving away toward the horizon.
Everything else is rich green jungle and river systems.

Real planet detail: fields of small cumulus and thin cloud streets over the ocean, casting their own shadows; haze thickening toward the curved horizon; the thin luminous blue band of atmosphere on the limb; sunglint on the sea at the right; the soft line between day and night falling across the left of the frame. No city lights anywhere, no grid, no roads.

The other attached pictures are real photographs taken from orbit. Use them only as evidence of how land, sea, cloud, aurora and the atmosphere really look from up there. Do not copy their framing or their coastlines.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail at every size, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, a map, a diagram, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no spacecraft parts, no window frame, no text, no labels, no logos, no watermark, no border.
```

#### 07-reveal take 3: [`07-reveal-take3.jpg`](07-reveal-take3.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Layout study B (higher orbit, more planet curve, figure tilted the other way) and a later light: just after sunset with afterglow on the limb, so the lava, the lake, the lightning and the aurora carry the frame.
- Made: started 22:18, generation took 131 s.
- Reference images, in the order passed (image 1 first):
  1. [`guides/07-reveal-layout-b.jpg`](guides/07-reveal-layout-b.jpg)
  2. [`real/reveal-island-oblique-day.jpg`](real/reveal-island-oblique-day.jpg)
  3. [`real/reveal-aurora-from-orbit.jpg`](real/reveal-aurora-from-orbit.jpg)
  4. [`real/reveal-landmass-dusk-from-orbit.jpg`](real/reveal-landmass-dusk-from-orbit.jpg)
- Eye check against the shot description: **pass**. From orbit with a stronger planet curve and sunset afterglow on the limb. Same figure-shaped green continent in a dark sea. All six regions can be picked out: green jungle with pale curved ridges, a small erupting volcano for the lava, red forest and red bay, a large storm cell with lightning over a snow-capped range on the far coast, a small aurora over the ice, the gold ring lake. The headland at the left is dim and small, so the figure reads less clearly than in take 1, and the volcano is out of scale for an orbital view.
- Blind judge `still_viewer_22` (asked 22:22, answered 22:24): **(d) amateur generated art**, so it fails. Weakest part: Scale and coherence break down on the left side of the island: the giant striped arches, the volcano, the glowing ring and the ground-level aurora are all rendered at toy-diorama size against a planet seen from orbit. It reads as a kitchen-sink pile of unrelated spectacle (glacier, red forest, lightning storm, portal) with no single focal point or consistent lighting logic.
- Prompt ([`prompts/07-reveal-take3.txt`](prompts/07-reveal-take3.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien world photographed for real from high orbit with a large-format cinema camera.

Image 1 is a rough, out-of-focus layout study of this frame. Keep its composition: the strongly curved horizon of the planet across the top with a thin blue line of atmosphere and black space with stars above it, the dark sea, and one large continent in the same place, at the same size, with the same outline and with every coloured region where the study has it. Re-photograph that scene sharp and real. None of the study's flat colours, soft blobs, stripes or dots should survive as drawn; every one of them becomes real terrain, real cloud and real light.

The continent is a single huge landmass in a dark blue-black ocean, overgrown with life from coast to coast, seen from a higher orbit in the last minutes of dusk. The sun has just gone below the horizon at the right and leaves a band of orange and rose afterglow in the atmosphere there; the land is still readable in deep saturated colour, and everything that glows carries the frame. Its coastline happens to resemble a giant asleep on its side, the way Italy resembles a boot: a rounded headland at the left, a broad main body, one bent peninsula curling back toward the headland and two long bent peninsulas trailing away to the right, each ending in a scatter of small islets. It is geography first. The coasts are ragged and fractal, with bays, capes, reefs, river mouths, turquoise shallows and offshore islands. Nothing is sculpted, smooth, symmetrical or raised like a relief.

Where things are, exactly as the study places them:
The upper middle-left of the main body is the lushest, deepest green rainforest on the continent, crossed by a row of long, parallel, gently curved pale ridgelines, half overgrown, with mist lying in the valleys between them.
Just in front of those ridges, near the near coast, a lake of molten lava glows orange in a field of black volcanic glass, and thin glowing rivers branch away from it through the black rock toward the sea. A thread of smoke trails off it.
The middle of the main body is a wide, low wetland of crimson-red forest cut by dark red channels. Its red water stains the bay beside it and fades out into the dark sea.
Along the far coast, behind all of this, runs one long narrow mountain range of evenly spaced sharp pale peaks. Most of it is buried under a single long storm system: towering purple-grey thunderheads, lit white gold from inside by lightning in several places at once.
On the rounded headland at the left lies one perfectly round lake that glows gold in a ring around a dark centre, bright enough to light the land around it in the dusk.
Below the headland the land and the bay are frozen: pale blue-white ice forest and snow, pack ice breaking up on the water. Over it hangs a tall curtain of green and violet aurora, seen from above and curving away toward the horizon.
Everything else is rich green jungle and river systems.

Real planet detail: fields of small cumulus and thin cloud streets over the ocean, casting their own shadows; haze thickening toward the curved horizon; the thin luminous blue band of atmosphere on the limb; sunglint on the sea at the right; the soft line between day and night falling across the left of the frame. No city lights anywhere, no grid, no roads.

The other attached pictures are real photographs taken from orbit. Use them only as evidence of how land, sea, cloud, aurora and the atmosphere really look from up there. Do not copy their framing or their coastlines.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail at every size, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, a map, a diagram, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no spacecraft parts, no window frame, no text, no labels, no logos, no watermark, no border.
```

#### 07-reveal take 4: [`07-reveal-take4.jpg`](07-reveal-take4.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Take 1 passed, but all three Reveal judges named the same fault: features at toy or diorama scale for an orbital view, and a ring and aurora that look pasted on. This take keeps take 1's composition and light, uses a finer layout study (C: smaller cloud cells, hair-thin lava, softer ridges, a diffuse aurora, a glowing lake instead of a ring) and adds a scale paragraph and one light logic to the prompt.
- Made: started 22:24, generation took 120 s.
- Reference images, in the order passed (image 1 first):
  1. [`guides/07-reveal-layout-c.jpg`](guides/07-reveal-layout-c.jpg)
  2. [`real/reveal-landmass-dusk-from-orbit.jpg`](real/reveal-landmass-dusk-from-orbit.jpg)
  3. [`real/reveal-aurora-from-orbit.jpg`](real/reveal-aurora-from-orbit.jpg)
  4. [`real/reveal-green-land-dark-sea.jpg`](real/reveal-green-land-dark-sea.jpg)
- Eye check against the shot description: **pass**. From orbit with the planet's curve; the same figure-shaped green continent in a dark sea. Cloud cells, lava threads and the aurora are finer and the aurora sits in the air instead of on the surface. But the storm has slid off the far coast onto the hip and far leg and has no lightning, the ridges have become heavy stripes, the lake is a bullseye, and the clouds are evenly sprinkled. Main subject and palette are there, so it goes to the judge, but by eye it is weaker than take 1.
- Blind judge `still_viewer_23` (asked 22:28, answered 22:28): **(d) amateur generated art**, so it fails. Weakest part: Scale is incoherent: the left-hand cluster (a glowing bullseye ring and green aurora sitting on the surface like a sticker, beside ribbed ridges as regular as a comb) reads as a tabletop diorama rather than a planet seen from orbit. The uniform popcorn clouds and the red biome spilling flatly into the sea like a paint stain add to that.
- Prompt ([`prompts/07-reveal-take4.txt`](prompts/07-reveal-take4.txt)):

```text
A single frame from a top-budget live-action fantasy film, 16:9 widescreen: an impossible alien world photographed for real from high orbit with a large-format cinema camera.

Image 1 is a rough, out-of-focus layout study of this frame. Keep its composition: the strongly curved horizon of the planet across the top with a thin blue line of atmosphere and black space with stars above it, the dark sea, and one large continent in the same place, at the same size, with the same outline and with every coloured region where the study has it. Re-photograph that scene sharp and real. None of the study's flat colours, soft blobs, stripes or dots should survive as drawn; every one of them becomes real terrain, real cloud and real light.

The continent is a single huge landmass in a dark blue-black ocean, overgrown with life from coast to coast, seen at dusk: low warm sun raking in from the right, night coming on from the left. Its coastline happens to resemble a giant asleep on its side, the way Italy resembles a boot: a rounded headland at the left, a broad main body, one bent peninsula curling back toward the headland and two long bent peninsulas trailing away to the right, each ending in a scatter of small islets. It is geography first. The coasts are ragged and fractal, with bays, capes, reefs, river mouths, turquoise shallows and offshore islands. Nothing is sculpted, smooth, symmetrical or raised like a relief.

Scale is what sells this frame. The continent is five thousand kilometres long and the camera is thousands of kilometres above it. At this distance no single tree, hill, peak or cloud puff can be made out. Forest is a fine-grained green texture. Mountain ranges are thin wrinkles in it with hair-thin threads of pale rock and snow. Rivers are hair-thin. Clouds are fields of thousands of tiny cells. Nothing may look like a miniature model, a diorama or a game map.

Where things are, exactly as the study places them:
The upper middle-left of the main body is the lushest, deepest green rainforest on the continent. Across it runs a fold belt of long, parallel, gently curved mountain ridges, like the Appalachians or the Zagros seen from orbit: forested flanks, pale bare rock along the crests, mist in the valleys between them.
Just in front of those ridges, near the near coast, lies a dark volcanic province, black against the green and laced with hair-thin glowing orange threads of lava around one small bright lake, as lava flows look in night-time satellite photographs. A faint orange glow hangs in the haze above it and a long thin ash plume drifts downwind.
The middle of the main body is a wide, low wetland of crimson-red forest, mottled and veined with dark channels like a river delta. Plumes of its red water swirl out into the bay beside it and thin away into the dark sea, the way sediment plumes do.
Along the far coast, behind all of this, runs one long narrow mountain range. Most of it is buried under a single storm front hundreds of kilometres long: a broad deck of violet-grey cloud with overshooting tops, glowing white gold from inside in several soft patches where lightning is firing, as thunderstorms look in night photographs from a space station.
On the rounded headland at the left lies one round lake, small at this distance, whose water gives off a soft gold light, brightest in a ring around its dark centre. The light is in the water; it spills faintly onto the shore and into the thin cloud above. It is not a neon ring and not a hoop floating above the ground.
Below the headland the land and the bay are frozen: a pale blue-white country of frosted forest, snowfields and glaciers, with pack ice breaking up on the water. High above it, in the upper atmosphere, hangs the aurora, as in the real aurora photograph taken from orbit: a broad, translucent, softly rippled band of green with a violet upper fringe, hundreds of kilometres long, with the ice visible through it, running away to the horizon. It is not a drawn ribbon.
Everything else is rich green jungle, hair-thin rivers and small lakes.

One light logic throughout: the low warm sun from the right, long soft shadows, blue dusk over the left of the frame. The lava, the lake, the lightning and the aurora are the only other lights, and each lights only its own surroundings.

Real planet detail: fields of small cumulus and thin cloud streets over the ocean, casting their own shadows; haze thickening toward the curved horizon; the thin luminous blue band of atmosphere on the limb; sunglint on the sea at the right; the soft line between day and night falling across the left of the frame. No city lights anywhere, no grid, no roads.

The other attached pictures are real photographs taken from orbit. Use them only as evidence of how land, sea, cloud, aurora and the atmosphere really look from up there. Do not copy their framing or their coastlines.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail at every size, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, a map, a diagram, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no spacecraft parts, no window frame, no text, no labels, no logos, no watermark, no border.
```

#### 07-reveal take 5: [`07-reveal-take5.jpg`](07-reveal-take5.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Last take. Take 4 fixed some scale but lost the storm on the far coast, so this re-shoots take 1 itself (passed in as image 1, the shot's own take, as was done for the Ribs) and asks for only the faults the judges named to change: finer scale, a storm front instead of giant clouds, a glowing lake instead of a ring, a real aurora, ridges instead of lines, thread-thin lava, red plumes instead of a flat red bay.
- Made: started 22:28, generation took 118 s.
- Reference images, in the order passed (image 1 first):
  1. [`07-reveal-take1.jpg`](07-reveal-take1.jpg)
  2. [`real/reveal-aurora-from-orbit.jpg`](real/reveal-aurora-from-orbit.jpg)
  3. [`real/reveal-landmass-dusk-from-orbit.jpg`](real/reveal-landmass-dusk-from-orbit.jpg)
- Eye check against the shot description: **pass**. Body-shaped continent from orbit with the planet's curve behind it, dark sea, green jungle and rib ridges, lava glow, aurora over the ice arm, red marsh and bay, storm on the far coast, gold lake. Palette and subject are there. It came back almost the same picture as take 1: the storm is a little flatter and wider, the red bay has more current in it, the gold ring, aurora ribbon and rib lines are unchanged.
- Blind judge `still_viewer_24` (asked 22:30, answered 22:31): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: Scale is inconsistent: individual snow-covered trees and forest texture are readable on the icy lower-left coast from an orbital height, which makes the continent look like a miniature. The aurora streaks and glowing ring on the left also sit flat on the surface like an overlay rather than being integrated into the atmosphere.
- Prompt ([`prompts/07-reveal-take5.txt`](prompts/07-reveal-take5.txt)):

```text
Image 1 is a film frame: an alien planet seen from high orbit at dusk, with one large overgrown continent in a dark sea. Photograph the same view again from the same position. Keep the composition exactly: the curved horizon with its thin blue line of atmosphere, the black space and stars above it, the sunglint on the sea at the right, and the continent in the same place with the same coastline, peninsulas, islands and turquoise shallows, and every region where it is now.

Change only the things that give the frame away as a model.

Scale. The continent is five thousand kilometres long and the camera is thousands of kilometres above it. No single tree, hill or cloud puff can be made out at this distance. Forest everywhere is a fine-grained deep green texture cut by hair-thin rivers. The frozen region at the lower left becomes a pale blue-white country of snowfields, glaciers and frosted forest seen only as fine texture, with pack ice breaking up in its bay; no individual white trees.

The storm along the far coast stays where it is, on the long mountain range, but becomes a storm front hundreds of kilometres long, the way thunderstorms look in night photographs from a space station: a long, low deck of violet-grey cloud made of many small cells with a few overshooting tops, glowing white gold from inside in several soft patches where lightning is firing. Not a few giant cauliflower clouds.

The glowing ring on the headland at the left becomes a round lake whose water gives off a soft gold light, brightest in a ring around its dark centre. The light is in the water and spills faintly onto its own shore and into thin mist above it. No neon hoop.

The streak of aurora at the left becomes a real aurora high in the upper atmosphere over the ice, as in image 2, which is a real photograph taken from orbit: a broad, translucent, softly rippled band of green with a violet upper fringe, hundreds of kilometres long, with the ice visible through it, trailing away toward the horizon.

The thin pale curved lines across the green upper left of the continent become a belt of long, parallel, gently curved mountain ridges, like fold mountains seen from orbit: forested flanks, pale bare rock along the crests, mist in the valleys between them. This is the lushest green on the continent.

The lava beside them becomes a dark volcanic province, black against the green, laced with hair-thin glowing orange threads around one small bright lava lake, with a faint orange glow in the haze above it and a long thin ash plume drifting downwind.

The red wetland in the middle stays crimson, mottled and veined with dark channels like a river delta. The flat red patch in the bay beside it becomes plumes of red water swirling out from those channels and thinning into the dark sea, the way sediment plumes do.

One light logic throughout: low warm sun from the right, long soft shadows, blue dusk over the left of the frame, as in image 3, a real photograph of land at dusk from orbit. The lava, the lake, the lightning and the aurora are the only other lights and each lights only its own surroundings. No city lights.

Look: hyper-realistic live-action photography. Believable lens perspective, real atmospheric haze and scale, true-to-life surface detail at every size, fine film grain, rich saturated colour with deep blacks. It must not look like a painting, an illustration, a map, a diagram, concept art, a cartoon or a smooth plastic 3D render. No people, no buildings, no vehicles, no spacecraft parts, no window frame, no text, no labels, no logos, no watermark, no border.
```

## Real photographs used as references

All looked up new for round 2 on Wikimedia Commons, under free licences, so they are kept in `real/` with credit. Sizes are as passed to the generator (1,280 px wide or smaller; some are crops, as noted).

| File | What it shows | Author | Licence | Source |
|---|---|---|---|---|
| [`real/ribs-forest-sunbeams.jpg`](real/ribs-forest-sunbeams.jpg) | Sun shafts through mist in a rainforest | Michal Klajban | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Sun_getting_through_fog_in_the_New_Zealand_bush,_Bryant_Range.jpg) |
| [`real/ribs-jungle-waterfalls.jpg`](real/ribs-jungle-waterfalls.jpg) | Waterfalls pouring through dense jungle | Snobbird | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Thi_Lo_Su_Waterfall,_Umphang_Wildlife_Sanctuary,_Tak_Province,_Thailand.jpg) |
| [`real/ribs-kaieteur-falls-aerial.jpg`](real/ribs-kaieteur-falls-aerial.jpg) | Kaieteur Falls from the air: a high waterfall and its mist in unbroken rainforest | Amanda | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Kaieteur_Falls_Aerial_02.jpg) |
| [`real/ribs-whale-bone-arch.jpg`](real/ribs-whale-bone-arch.jpg) | A whale jawbone arch standing outdoors against the sky Cropped to drop the town on the left. | Scott Cormie | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Replica_Whale_Bone_Arch_-_geograph.org.uk_-_8147391.jpg) |
| [`real/heart-lava-lake-night.jpg`](real/heart-lava-lake-night.jpg) | Lava lake at night with its web of crust plates and bright cracks | Nina R from Africa | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Nyiragongo_volcano_(31211907680).jpg) |
| [`real/heart-lava-rivers-aerial.jpg`](real/heart-lava-rivers-aerial.jpg) | Lava channels branching over black rock, from the air | Brocken Inaglory | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Lava_channel_overflow.JPG) |
| [`real/heart-lava-fountain-rivers.jpg`](real/heart-lava-fountain-rivers.jpg) | Lava fountain feeding lava rivers | James St. John | Public domain | [Commons page](https://commons.wikimedia.org/wiki/File:Lava_fountaining_(5_June_2018)_(Kilauea_Volcano,_Hawaii)_(52030467811).jpg) |
| [`real/breath-aurora-violet-green.jpg`](real/breath-aurora-violet-green.jpg) | Violet and green aurora Cropped to drop the lit houses at the bottom. | Eric Kilby from Somerville, MA, USA | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Purple_and_Green_Aurora_(53721152975).jpg) |
| [`real/breath-aurora-over-snow.jpg`](real/breath-aurora-over-snow.jpg) | Green and pink aurora over a snowfield | United States Air Force photo by Senior Airman Joshua Strang | Public domain | [Commons page](https://commons.wikimedia.org/wiki/File:Aurora_borealis_over_Eielson_Air_Force_Base,_Alaska.jpg) |
| [`real/breath-snow-loaded-trees.jpg`](real/breath-snow-loaded-trees.jpg) | Snow-loaded frozen trees on a fell | Ninara | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Riisitunturi,_Lapland_(50977410142).jpg) |
| [`real/breath-bison-backlit-snow.jpg`](real/breath-bison-backlit-snow.jpg) | Bison in snow, backlit, breath steaming | Jacob W. Frank | Public domain | [Commons page](https://commons.wikimedia.org/wiki/File:Bison_herd_sunrise_at_-20%C2%B0F_(d1617be8-300b-45cf-9a26-291953fe197f).jpg) |
| [`real/breath-hoarfrost-crystals.jpg`](real/breath-hoarfrost-crystals.jpg) | Hoarfrost crystals on branches | Maciej Opaliński | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Hoarfrost_branch_mountains_4.jpg) |
| [`real/marsh-red-cypress-water.jpg`](real/marsh-red-cypress-water.jpg) | Red autumn cypress trees standing in still water | Ted.ns | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:%D0%9A%D0%B8%D0%BF%D0%B0%D1%80%D0%B8%D1%81%D0%BE%D0%B2%D0%BE%D0%B5_%D0%BE%D0%B7%D0%B5%D1%80%D0%BE_%D0%BE%D1%81%D0%B5%D0%BD%D1%8C%D1%8E.jpg) |
| [`real/marsh-autumn-cypress-mist.jpg`](real/marsh-autumn-cypress-mist.jpg) | Autumn cypress swamp in lit mist | Jay Huang from Pleasanton, USA | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Secret_Garden_-_Flickr_-_Jaykhuang.jpg) |
| [`real/marsh-fireflies-forest.jpg`](real/marsh-fireflies-forest.jpg) | Fireflies drifting through a forest at dusk | MicheleIlluzzi | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Dancing_golden_threads.jpg) |
| [`real/marsh-cypress-moss-flooded.jpg`](real/marsh-cypress-moss-flooded.jpg) | Flooded cypress forest hung with moss | William L. Farr | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Bald_cypress_(Taxodium_distichum),_Saw_Mill_Pond,_Caddo_Lake_State_Park,_Harrison_County,_Texas,_USA_(April_2017).jpg) |
| [`real/spine-storm-lit-within.jpg`](real/spine-storm-lit-within.jpg) | Thunderstorm cloud lit from within by lightning Cropped to drop the town lights at the bottom. | ESO/P. Horálek | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Lightning_over_ESO_Headquarters.jpg) |
| [`real/spine-lightning-web.jpg`](real/spine-lightning-web.jpg) | Branching lightning across a purple sky | Jan Bambach | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Lightning_Storm_(115334089).jpeg) |
| [`real/spine-angel-falls-cloud.jpg`](real/spine-angel-falls-cloud.jpg) | Angel Falls dropping through cloud | Diego Delso | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Salto_del_Angel-Canaima-Venezuela18.JPG) |
| [`real/spine-tepui-cloud-sea.jpg`](real/spine-tepui-cloud-sea.jpg) | Tepui cliffs standing out of a sea of cloud | Yosmary Lopez | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Audan_T%C3%BCp%C3%BC_(Auyantepuy).JPG) |
| [`real/spine-jagged-peaks-storm-light.jpg`](real/spine-jagged-peaks-storm-light.jpg) | Jagged rock towers under storm cloud with gold light | Maqsood aktar | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Trango_Towers.jpg) |
| [`real/eye-grand-prismatic-aerial.jpg`](real/eye-grand-prismatic-aerial.jpg) | Grand Prismatic Spring from the air: a round pool with colour radiating from it | Carsten Steger | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Aerial_image_of_Grand_Prismatic_Spring_(view_from_the_south).jpg) |
| [`real/eye-great-blue-hole-oblique.jpg`](real/eye-great-blue-hole-oblique.jpg) | Great Blue Hole seen at an angle from the air: a round dark centre | The TerraMar Project | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Belize_Blue_Hole_(TMP)_(16912331906).jpg) |
| [`real/eye-bioluminescent-shore.jpg`](real/eye-bioluminescent-shore.jpg) | Bioluminescent water glowing along a shore at night | Bruce Anderson (University of Stellenbosch). | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Blue_Tide-_Noctiluca.jpeg) |
| [`real/eye-fireflies-night.jpg`](real/eye-fireflies-night.jpg) | Fireflies over a meadow at night | Tyler Savitski | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Field-of-fireflies-wilkes-ecology-preserve-photo-by-tyler-savitski.jpg) |
| [`real/reveal-landmass-dusk-from-orbit.jpg`](real/reveal-landmass-dusk-from-orbit.jpg) | A long landmass at dusk seen at an angle from orbit, with the curve of the planet | NASA | Public domain | [Commons page](https://commons.wikimedia.org/wiki/File:ISS-47_Italy_night_view.jpg) |
| [`real/reveal-aurora-from-orbit.jpg`](real/reveal-aurora-from-orbit.jpg) | Aurora seen from orbit above the planet's edge Cropped to drop the spacecraft hardware on the left. | NASA -- US government agency | Public domain | [Commons page](https://commons.wikimedia.org/wiki/File:Aurora_Seen_From_Space_by_NASA.jpg) |
| [`real/reveal-green-land-dark-sea.jpg`](real/reveal-green-land-dark-sea.jpg) | Green land and dark sea from orbit, with sediment swirls along the coast | European Space Agency | Attribution | [Commons page](https://commons.wikimedia.org/wiki/File:Earth_from_Space-_Cook_Strait,_New_Zealand_ESA24912671.jpg) |
| [`real/reveal-island-oblique-day.jpg`](real/reveal-island-oblique-day.jpg) | An island under scattered cloud, seen at an angle from orbit | NASA | Public domain | [Commons page](https://commons.wikimedia.org/wiki/File:ISS-38_Hawaiian_Island_chain.jpg) |
| [`real/heart-lava-lake-fountain-night.jpg`](real/heart-lava-lake-fountain-night.jpg) | Lava lake at night with a fountain and lit smoke | Nina R from Africa | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Nyiragongo_volcano_(30773789893).jpg) |

