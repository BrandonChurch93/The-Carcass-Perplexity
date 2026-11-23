# The Carcass: reference images, draft run

Reference run of 2026-11-23. These are target stills for seven moving 3D scenes. Everything here is a draft and nothing is approved.

- Shots with a kept take: 1 of 7. Takes made: 5.
- Run started 20:38 UTC; the two-hour limit ended at 22:38 UTC. Times below are UTC, with time since the start in brackets.
- `contact-sheet.jpg` shows the kept take of each shot. `prompts/` holds the exact prompt sent for every take. `real/` holds the real photographs passed to the generator.

## Kept takes

| Shot | Kept take | Model | Blind judge | Faults still in it |
|---|---|---|---|---|
| The Ribs | [`01-ribs-take5.jpg`](01-ribs-take5.jpg) | seedream_5 | PASS (a) | Ember glow at the far end is a small smudge; near left arch reads as a cliff face; bottom-right rock is soft. |
| 02-heart | none made | | | |
| 03-breath | none made | | | |
| 04-blood-marsh | none made | | | |
| 05-spine | none made | | | |
| 06-eye | none made | | | |
| 07-reveal | none made | | | |

## How the takes were judged

Each take was shown to one new agent in its own sandbox. The agent got only the picture, as a copy with no metadata named `image.png`, and this question. It had not seen the brief, the prompts or any other take.

> Which of these is it most likely to be? (a) a frame from a top-budget film or AAA game cinematic (b) a stock image (c) a textbook picture (d) amateur generated art. Answer with one letter and name its weakest part.

Only (a) passes. A failed take was made again while the shot had takes left (five at most). The judge only rates how the frame looks; each take was also checked by eye against the brief, and that check is written under the take.

## Calls made

- 20:53 (0h14m): Start of the run is the first action, 20:38:34 UTC, so the two-hour limit ends at 22:38:34 UTC.
- 20:53 (0h14m): Real photographs come from Wikimedia Commons only, under free licences, so they can sit in this public repository with credit. Stock-site search results were not used: unknown licences, and some were not real photographs.
- 20:53 (0h14m): Commons throttled the downloads (HTTP 429). Fixed by fetching one file per second; not counted as a failure.
- 20:53 (0h14m): About 230 candidate photographs were looked at; 26 were picked. Two were cropped before use: the whale-bone arch to the arch alone, and the Icelandic canyon to remove a photo site's mark.
- 20:53 (0h14m): Every take keeps the bytes the generator returned, with the correct file extension (Seedream returns JPEG, Nano Banana PNG). The judge gets the same pixels as a PNG with no metadata.
- 20:53 (0h14m): Judge question uses the brief's four answers in the brief's order. Each judge is a new agent in its own sandbox that receives only the picture.
- 20:53 (0h14m): Shot 1 takes: take 1 on Seedream 5 Pro, take 2 the same prompt on Nano Banana Pro to compare models, take 3 on Seedream with the camera beside the foot of one arch and a heavier ash storm.
- 20:54 (0h16m): All three shot 1 takes passed the judge, but all three judges called the arches ribs or a skeleton without being told. That breaks the rule that the anatomy shows only in hindsight, so the two remaining takes of shot 1 are spent on arches that read as rock: take 4 a fresh image with no whale photographs passed in, take 5 a rework of take 3 that changes only the arches.
- 20:54 (0h16m): Model: Seedream 5 Pro for the film. On the same prompt it gave the darker, heavier, graded frame; Nano Banana Pro was brighter, cleaner and more symmetrical.
- 20:58 (0h19m): Style anchor is shot 1 take 5. Every image of shots 2 to 7 gets it as reference image 1, with the instruction to match its grade, haze and grain and to copy none of its content.
- 20:58 (0h19m): Shots 2 to 6 are made side by side. Each gets three first takes on Seedream 5 Pro: take 1 the main prompt, take 2 a variant with a different camera position or intensity, take 3 a second roll of the main prompt.

## Every image

### The Ribs (`01-ribs`)

Brief: A canyon walled by colossal curved bone-white arches, miles high, half buried in rock. Wind carries ash through it. Carrion birds are specks near the top. Low wide camera looking up the canyon.

Kept: take 5. It is the only take whose judge described rock and not ribs, it has the largest scale, and it keeps take 3's composition and ash storm. This take is the style anchor passed as image 1 into every later generation. Faults still in it: Ember glow at the far end is a small smudge; near left arch reads as a cliff face; bottom-right rock is soft. Finished 20:58 (0h19m).

#### 01-ribs take 1: [`01-ribs-take1.jpg`](01-ribs-take1.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: First take: camera on the canyon's centre line, arches on both walls.
- Made: started 20:49, generation took 131 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/whale-bone-arch-barrow.jpg`](real/whale-bone-arch-barrow.jpg)
  2. [`real/whale-rib-cage-inside.jpg`](real/whale-rib-cage-inside.jpg)
  3. [`real/slot-canyon-trafoulas.jpg`](real/slot-canyon-trafoulas.jpg)
  4. [`real/canyon-fjadrargljufur-low.jpg`](real/canyon-fjadrargljufur-low.jpg)
  5. [`real/dust-storm-odadahraun.jpg`](real/dust-storm-odadahraun.jpg)
- Blind judge `image_viewer_01` (asked 20:52, answered 20:54): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The broken rib at top centre, where a detached bone fragment hangs unsupported in the sky among the birds. The ribs also fail to pair up as one coherent skeleton: the right-hand ones are spaced and anchored differently from the left, and a splintered stump mid-right reads as a muddled shape.
- Checked by eye against the brief: Camera, ash, birds and ember glow are as asked, and the grade is dark and filmic. Faults: a broken arch tip hangs in mid-air at top centre; the arches read at once as giant rib bones, which is too literal for the film; they look a few hundred metres high, not miles.
- Prompt ([`prompts/01-ribs-take1.txt`](prompts/01-ribs-take1.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a vast dead canyon seen from its floor. The camera sits one metre above the ground with an 18 mm wide lens, tilted slightly up, looking straight along the canyon into the distance. Out of both canyon walls rise colossal curved arches of bone-white stone, evenly spaced one behind another, each of them miles high. They lean inward over the canyon and almost meet far overhead, and their upper ends fade into low cloud. Their lower thirds are swallowed by the dark layered rock of the canyon walls and by fans of grey scree, as if the cliffs formed around them over a very long time. The arches are pale, chalky and porous, pitted, cracked and streaked with dark runoff, like eroded limestone or very old weathered bone. They are not clean, smooth or identical: one has snapped and its fallen tip lies half buried on the canyon floor, others are chipped, and their spacing and lean vary a little. The canyon floor is cracked black rock, drifts of ash and scattered boulders, with a dry riverbed winding up the middle.

WHAT IS MOVING: a hard wind blows down the canyon toward the camera. Long streamers of grey ash trail along the floor and pour off the ledges, and the air fills with ash haze the further you look, so the farthest arches are only pale silhouettes. High up near the tips of the arches a loose flock of carrion birds circles, so far away that they are tiny dark specks. Far down the canyon a faint ember-orange glow lights the haze from below.

REFERENCE IMAGES: image 1 is a real whale-bone arch: use it for the true curve, taper and surface of the arches. Image 2 is the inside of a real whale rib cage: use it only for the rhythm of repeated curved shapes receding in a row. Image 3 is a real slot canyon: use it for the water-worn surface of the rock walls. Image 4 is a real canyon photographed low from its riverbed: use it for the camera position, the stormy sky and the weight of the cliffs. Image 5 is a real dust storm: use it for the look of wind-blown ash haze. Take only those qualities and copy no object, building, glass or person from them.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 01-ribs take 2: [`01-ribs-take2.png`](01-ribs-take2.png)

- Model: Nano Banana Pro (`nano_banana_pro`). Output 2752x1536 PNG, kept as delivered.
- What this take tried: Same prompt and references as take 1 on the other model, to compare the two.
- Made: started 20:49, generation took 31 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/whale-bone-arch-barrow.jpg`](real/whale-bone-arch-barrow.jpg)
  2. [`real/whale-rib-cage-inside.jpg`](real/whale-rib-cage-inside.jpg)
  3. [`real/slot-canyon-trafoulas.jpg`](real/slot-canyon-trafoulas.jpg)
  4. [`real/canyon-fjadrargljufur-low.jpg`](real/canyon-fjadrargljufur-low.jpg)
  5. [`real/dust-storm-odadahraun.jpg`](real/dust-storm-odadahraun.jpg)
- Blind judge `image_viewer_02` (asked 20:52, answered 20:54): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The bases of the giant ribs, especially on the right, where bone smears ambiguously into the cliff and scree instead of sitting in the ground with clear contact and structure. The scene also lacks a figure or focal subject to anchor the scale, so the middle distance reads as empty.
- Checked by eye against the brief: Brighter, cleaner and more symmetrical than the Seedream takes; to my eye the least like a film frame even though the judge passed it. The arches read at once as rib bones and their feet smear into the scree.
- Prompt ([`prompts/01-ribs-take2.txt`](prompts/01-ribs-take2.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a vast dead canyon seen from its floor. The camera sits one metre above the ground with an 18 mm wide lens, tilted slightly up, looking straight along the canyon into the distance. Out of both canyon walls rise colossal curved arches of bone-white stone, evenly spaced one behind another, each of them miles high. They lean inward over the canyon and almost meet far overhead, and their upper ends fade into low cloud. Their lower thirds are swallowed by the dark layered rock of the canyon walls and by fans of grey scree, as if the cliffs formed around them over a very long time. The arches are pale, chalky and porous, pitted, cracked and streaked with dark runoff, like eroded limestone or very old weathered bone. They are not clean, smooth or identical: one has snapped and its fallen tip lies half buried on the canyon floor, others are chipped, and their spacing and lean vary a little. The canyon floor is cracked black rock, drifts of ash and scattered boulders, with a dry riverbed winding up the middle.

WHAT IS MOVING: a hard wind blows down the canyon toward the camera. Long streamers of grey ash trail along the floor and pour off the ledges, and the air fills with ash haze the further you look, so the farthest arches are only pale silhouettes. High up near the tips of the arches a loose flock of carrion birds circles, so far away that they are tiny dark specks. Far down the canyon a faint ember-orange glow lights the haze from below.

REFERENCE IMAGES: image 1 is a real whale-bone arch: use it for the true curve, taper and surface of the arches. Image 2 is the inside of a real whale rib cage: use it only for the rhythm of repeated curved shapes receding in a row. Image 3 is a real slot canyon: use it for the water-worn surface of the rock walls. Image 4 is a real canyon photographed low from its riverbed: use it for the camera position, the stormy sky and the weight of the cliffs. Image 5 is a real dust storm: use it for the look of wind-blown ash haze. Take only those qualities and copy no object, building, glass or person from them.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 01-ribs take 3: [`01-ribs-take3.jpg`](01-ribs-take3.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Camera moved off-centre beside the foot of one arch, heavier ash storm, drifting embers.
- Made: started 20:49, generation took 133 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/whale-bone-arch-barrow.jpg`](real/whale-bone-arch-barrow.jpg)
  2. [`real/whale-rib-cage-inside.jpg`](real/whale-rib-cage-inside.jpg)
  3. [`real/slot-canyon-trafoulas.jpg`](real/slot-canyon-trafoulas.jpg)
  4. [`real/canyon-fjadrargljufur-low.jpg`](real/canyon-fjadrargljufur-low.jpg)
  5. [`real/dust-storm-odadahraun.jpg`](real/dust-storm-odadahraun.jpg)
- Blind judge `image_viewer_03` (asked 20:52, answered 20:54): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The giant ribs do not read as one coherent skeleton: the left and right rows are mismatched in spacing, curvature and thickness, and the receding ones dissolve into vague, tangled shapes near the smudgy orange glow. There is also no figure or familiar object to anchor the scale, and the swirling dust looks generic and pasted over the rocks.
- Checked by eye against the brief: Best composition and atmosphere of the first three: strong ash storm, drifting embers, birds as specks, camera low and wide. Faults: the arches read at once as giant tusks or ribs, which is too literal; they look a few hundred metres high, not miles.
- Prompt ([`prompts/01-ribs-take3.txt`](prompts/01-ribs-take3.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a vast dead canyon seen from its floor during an ash storm. The camera sits one metre above the ground with a 21 mm wide lens, set to the left of the canyon's centre line, tilted up and looking along the canyon into the distance. Close on the left, filling the left third of the frame from bottom to top, the foot of one colossal bone-white arch rises out of dark layered rock and scree and curves up and over the canyon. Behind it, along both walls, more arches of the same kind stand evenly spaced, one behind another, each of them miles high, leaning inward until they almost meet far overhead, where their upper ends are lost in low cloud. Their lower thirds are buried in the canyon walls, as if the cliffs formed around them over a very long time. The arches are pale, chalky and porous, pitted, cracked, flaking and streaked with dark runoff, like eroded limestone or very old weathered bone; on the near one every crack, pit and wind-scoured hollow is visible. They are not clean, smooth or identical: one in the middle distance has snapped off halfway up, and their spacing and lean vary a little. The canyon floor is cracked black rock, drifts of ash and boulders the size of houses.

WHAT IS MOVING: a gale blows down the canyon toward the camera. Thick streamers and sheets of grey ash race along the floor, wrap around the foot of the near arch and pour off the ledges, and the air is so full of ash that the far arches are only pale silhouettes that fade to nothing. High up near the tips of the arches a loose flock of carrion birds circles, so far away that they are tiny dark specks. Far down the canyon a dull ember-orange glow lights the ash from below, and a few glowing embers drift in the wind.

REFERENCE IMAGES: image 1 is a real whale-bone arch: use it for the true curve, taper and surface of the arches. Image 2 is the inside of a real whale rib cage: use it only for the rhythm of repeated curved shapes receding in a row. Image 3 is a real slot canyon: use it for the water-worn surface of the rock walls. Image 4 is a real canyon photographed low from its riverbed: use it for the camera position, the stormy sky and the weight of the cliffs. Image 5 is a real dust storm: use it for the look of wind-blown ash haze. Take only those qualities and copy no object, building, glass or person from them.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 01-ribs take 4: [`01-ribs-take4.jpg`](01-ribs-take4.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Fresh image with the arches described as limestone rock fins, miles high, cloud across them halfway up. No whale photographs passed in.
- Made: started 20:55, generation took 133 s.
- Reference images, in the order passed (image 1 first):
  1. [`real/slot-canyon-trafoulas.jpg`](real/slot-canyon-trafoulas.jpg)
  2. [`real/canyon-fjadrargljufur-low.jpg`](real/canyon-fjadrargljufur-low.jpg)
  3. [`real/dust-storm-odadahraun.jpg`](real/dust-storm-odadahraun.jpg)
- Blind judge `image_viewer_04` (asked 20:57, answered 20:58): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The focal point at the end of the canyon, the small orange fire glow and the jagged broken bone fragments in front of it, is muddy and indistinct, and with no figure or other scale reference the giant ribs lose some of their sense of size.
- Checked by eye against the brief: The arches now read as curved fins of white rock with cloud across them and tops lost in cloud, so the scale is far larger. It is softer and more like concept art than take 5 in the middle distance, and its judge still called them ribs.
- Prompt ([`prompts/01-ribs-take4.txt`](prompts/01-ribs-take4.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a vast dead canyon seen from its floor. The camera sits one metre above the ground with an 18 mm wide lens, set slightly left of the canyon's centre line, tilted up and looking along the canyon into the distance. The canyon is walled by colossal natural arches of bone-white rock. Each one is a tall curved fin of pale limestone that stands out from the dark cliff like a flying buttress, rises for miles and bends inward over the canyon, narrowing as it goes. The arches from the two walls lean toward each other and nearly close overhead, where their tops disappear into the cloud base. They stand at even intervals, one behind another, all with the same curve, and that regularity is the only strange thing about them. Everything else about them is ordinary geology: wind-carved, layered and fractured stone with bedding lines, ledges, overhangs, rockfall scars, dark water stains and cones of scree at their feet. They are part of the canyon walls, not objects standing in the canyon: the darker layered rock of the cliffs is banked up around their lower halves and buries them. The foot of the nearest arch is close on the left and fills the left side of the frame, so its cracked, pitted, chalk-white surface is seen in detail. One arch further on has collapsed, and its upper half lies as a heap of white rubble on the canyon floor. Nothing floats in the air. The canyon floor is cracked black rock, drifts of ash and boulders the size of houses, with a dry riverbed winding up the middle.

SCALE: the arches are miles high. A thin layer of cloud drifts across them halfway up and they carry on far above it, growing paler and bluer with height.

WHAT IS MOVING: a hard wind blows down the canyon toward the camera. Long streamers of grey ash race along the floor, wrap around the foot of the near arch and pour off the ledges, and the air thickens with ash the further you look, so the farthest arches are pale silhouettes. Far above, near the tops of the arches, a loose flock of carrion birds circles, so high that the birds are barely visible specks. Far down the canyon a dull ember-orange glow lights the haze from below.

The arches must read as rock formations: giant natural stone arches and eroded limestone fins. They must not look like bones, ribs, tusks, horns or a skeleton: no rounded bone ends, no joints, no marrow holes, no smooth ivory.

REFERENCE IMAGES: image 1 is a real slot canyon: use it for the water-worn, layered surface of the rock, on the arches as well as the walls. Image 2 is a real canyon photographed low from its riverbed: use it for the camera position, the stormy sky and the weight of the cliffs. Image 3 is a real dust storm: use it for the look of wind-blown ash haze. Take only those qualities and copy no object from them.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 01-ribs take 5: [`01-ribs-take5.jpg`](01-ribs-take5.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Rework of take 3: same frame, only the arches changed from bone to rock and made far taller.
- Made: started 20:55, generation took 102 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take3.jpg`](01-ribs-take3.jpg)
  2. [`real/slot-canyon-trafoulas.jpg`](real/slot-canyon-trafoulas.jpg)
- Blind judge `image_viewer_05` (asked 20:57, answered 20:58): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The orange glow at the vanishing point is a small, muddy smudge with no readable source or subject, so the frame's focal point feels undefined. The dark foreground rock on the right also blurs into soft, low-detail mush with no figure or object to anchor scale.
- Checked by eye against the brief: Reads as a canyon of giant curved rock fins first; the rib shape is there only when you look for it, and its judge did not mention ribs or bones. Layered rock, cloud across the arches, tops out of frame, ash storm, birds as specks, ember glow. Faults: the ember glow at the far end is a small smudge with no clear source; the near left arch is so wide it reads as a cliff face; the dark rock at bottom right is soft.
- Prompt ([`prompts/01-ribs-take5.txt`](prompts/01-ribs-take5.txt)):

```text
Rework image 1, which is a frame from a live-action fantasy feature film. Keep its camera position, lens, composition, canyon walls, storm sky, blowing ash, distant ember-orange glow, colour grade, contrast, darkness and film grain exactly as they are. Change only the great white arches.

In image 1 the arches look like giant tusks or rib bones. Turn them into colossal natural arches of bone-white rock that stand in the same places and keep the same curve. Each one becomes a tall curved fin of pale limestone that grows out of the dark cliff like a flying buttress and bends inward over the canyon. They are ordinary geology at an impossible size: wind-carved, layered and fractured stone with bedding lines running across them, ledges, overhangs, rockfall scars, dark water stains and cones of scree at their feet. They are part of the canyon walls, and the darker rock of the cliffs is banked up around their lower halves. No rounded bone ends, no joints, no marrow holes, no smooth ivory, nothing that looks like a skeleton. Their even spacing and matching curve is the only strange thing about them.

Make them far taller: miles high. Their tops no longer end in points inside the frame. They rise out of the top of the frame or vanish into the cloud base, and a thin layer of cloud drifts across them halfway up. They grow paler and bluer with height. The birds stay as a loose flock of tiny dark specks high up near the cloud. Nothing floats in the air.

Image 2 is a real slot canyon: use it for the water-worn, layered surface of the rock on the arches.

The result must look like a real photograph of a real place taken for a top-budget live-action film: heavy overcast at dusk, flat cold light, ash grey, bone white and cold slate blue, with the small ember glow as the only warm colour. No people, no buildings, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

## Real photographs used as references

All from Wikimedia Commons under free licences, so they are kept in `real/` with credit. Sizes are as passed to the generator (1,920 px wide or smaller).

| File | What it shows | Author | Licence | Source |
|---|---|---|---|---|
| [`real/whale-bone-arch-barrow.jpg`](real/whale-bone-arch-barrow.jpg) | Whale-bone arch on a snowy shore, Barrow, Alaska Cropped to the arch, so the benches and boat frames beside it are not passed to the generator. | Dewhurst Donna, U.S. Fish and Wildlife Service | Public domain | [Commons page](https://commons.wikimedia.org/wiki/File:Whale_bone_rib_arc_and_skin_boat_frames_at_barrow_Alaska.jpg) |
| [`real/whale-rib-cage-inside.jpg`](real/whale-rib-cage-inside.jpg) | Inside the rib cage of a blue whale skeleton, Beaty Biodiversity Museum | Eviatar Bach | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | [Commons page](https://commons.wikimedia.org/wiki/File:Beaty_Biodiversity_Museum_whale_9.JPG) |
| [`real/slot-canyon-trafoulas.jpg`](real/slot-canyon-trafoulas.jpg) | Trafoulas slot canyon, Crete: grey water-worn walls | Nicolas Daskalakis | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Trafoulas_canyon_(narrow_canyon)_1.JPG) |
| [`real/canyon-fjadrargljufur-low.jpg`](real/canyon-fjadrargljufur-low.jpg) | Fjaðrárgljúfur canyon, Iceland, seen low from the riverbed under storm light Cropped: the bottom 16 percent is cut off to remove the photo site's mark. | Luís Ascenso | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Fjath%C3%A1rgj%C3%BAfur_Canyon_(182065101).jpeg) |
| [`real/dust-storm-odadahraun.jpg`](real/dust-storm-odadahraun.jpg) | Dust storm over the Ódáðahraun lava desert, Iceland | Rémih | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:%C3%93d%C3%A1%C3%B0ahraun_dust_storm_11.jpg) |

