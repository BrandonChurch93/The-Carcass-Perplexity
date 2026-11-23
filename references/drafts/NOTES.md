# The Carcass: reference images, draft run

Reference run of 2026-11-23. These are target stills for seven moving 3D scenes. Everything here is a draft and nothing is approved.

- Shots with a kept take: 7 of 7. Takes made: 33.
- Run started 20:38 UTC and was last updated 21:27 UTC, inside the two-hour limit (22:38 UTC). Times below are UTC, with time since the start in brackets.
- `contact-sheet.jpg` shows the kept take of each shot. `prompts/` holds the exact prompt sent for every take. `real/` holds the real photographs passed to the generator. `guides/` holds the one layout study made for shot 7 take 5.

## Kept takes

| Shot | Kept take | Model | Blind judge | Faults still in it |
|---|---|---|---|---|
| The Ribs | [`01-ribs-take5.jpg`](01-ribs-take5.jpg) | Seedream 5 Pro (`seedream_5`) | PASS (a) | Ember glow at the far end is a small smudge; near left arch reads as a cliff face; bottom-right rock is soft. |
| The Heart | [`02-heart-take3.jpg`](02-heart-take3.jpg) | Seedream 5 Pro (`seedream_5`) | PASS (a) | The two dim lakes are close in size; the foreground slope is soft; thin lava threads at the bottom have no clear path. |
| The Breath | [`03-breath-take5.jpg`](03-breath-take5.jpg) | Seedream 5 Pro (`seedream_5`) | PASS (a) | Herd animals are alike and evenly spaced; spires repeat one shape; rime fringes look like spikes. |
| The Blood Marsh | [`04-blood-marsh-take4.jpg`](04-blood-marsh-take4.jpg) | Seedream 5 Pro (`seedream_5`) | PASS (a) | The swell over the shape is blue-grey and does not blend into the red water; the frame is flatter than takes 1 to 3. |
| The Spine | [`05-spine-take3.jpg`](05-spine-take3.jpg) | Seedream 5 Pro (`seedream_5`) | PASS (a) | Lightning is a thin web that lights neither rock nor cloud; the far peaks are a comb of identical cones. |
| The Eye | [`06-eye-take4.jpg`](06-eye-take4.jpg) | Seedream 5 Pro (`seedream_5`) | PASS (a) | Glow looks airbrushed; near rim at lower right is soft. |
| The Reveal | [`07-reveal-take1.jpg`](07-reveal-take1.jpg) | Seedream 5 Pro (`seedream_5`) | PASS (a) | Weakest frame of the set. Too literal in places: a skull with a second socket and teeth, a carved hand and foot. The ice field is a spray of a few oversized spikes. Scale cues conflict: the curve of the planet says continent, while the arches, clouds and ice say something smaller. The hip and limbs on the right are lumpy and hard to read. |

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
- 21:05 (0h26m): The first takes of shots 2 to 6 picked up content from the anchor: orange glows and embers in four shots, and arches in the Breath. Remakes say to use the anchor for grade only and to carry over no glow, embers or arches.
- 21:05 (0h26m): The Breath: all three takes passed the judge, but the spires curve toward each other from both sides, which is the opposite of the brief. Both remaining takes are spent on parallel blades that all tilt one way.
- 21:05 (0h26m): The Blood Marsh: all three takes passed the judge, but the red is a foreground patch and the shape is a small lump above the water. Both remaining takes are spent on fully red water and a huge shadow under the surface, one as a fresh image and one as a rework of take 3.
- 21:05 (0h26m): The Spine and The Eye each had one take failed by its judge. Each gets a remake of the failed take plus a rework of its best passing take, fixing what the judges and the eye check found: thin lightning and copied far peaks on the Spine, the doughy rim and pupil-like bright spot on the Eye.
- 21:05 (0h26m): The Heart is finished at three takes: all three passed and take 3 meets the brief, so its two spare takes are not used.
- 21:10 (0h31m): Reworking a finished take with Seedream worked on shot 1 and on the Eye's rim, but barely changed the Spine and did not turn the Marsh water red. Reworks keep the frame too faithfully for large changes.
- 21:10 (0h31m): The Spine is kept at its limit with known faults (thin lightning, copied far peaks). The Breath, the Blood Marsh and the Eye are kept from their fourth or fifth takes because those are the ones that meet the brief, not only the judge.
- 21:10 (0h31m): Shot 7 gets the kept takes of all six places as reference images 1 to 6 (shot 1 take 5 first, as the anchor) plus three photographs from orbit. Takes 1 and 2 are on Seedream 5 Pro (steep oblique view, then a view straight down with the body curled); take 3 is the take 1 prompt on Nano Banana Pro, because this shot depends on placing many things correctly.
- 21:15 (0h37m): Shot 7 first three takes: Seedream drew the body too literally (a skeleton statue, then a stone giant with a face); Nano Banana Pro drew an island that is not a body and wrote the reference numbers 1 to 6 on it. Take 1 has the right camera and every place in the right spot, so takes 4 and 5 rework it instead of starting again: keep the layout, turn the statue into real geography. Later prompts say 'the first image' in words and forbid numbers and labels.
- 21:21 (0h42m): Take 4 of shot 7 showed that a model handed the sharp take 1 simply hands it back. So the last take does not rework take 1 directly. It gets a layout study instead: take 1 with the too-literal details painted out (second socket, teeth, fingers, toes, the few huge ice spikes), the limbs roughened, then blurred and halved, saved as guides/07-reveal-take5-layout.jpg. The model has to keep the camera and the layout but make every detail again, and the prompt asks for geography and for scale cues (small clouds, fine sea ice).
- 21:25 (0h46m): The Reveal is kept at its limit with known faults, and it is the weakest frame of the set. Two judges saw almost the same picture (takes 1 and 4) and answered (a) and (d), so the blind judge is not steady on this shot. Take 1 is kept because it passed and reads most clearly as a body; take 5 is the less literal alternative if the skull, hand and foot of take 1 are too much. No sixth take was made and no takes were combined by hand, because the limit is five.
- 21:26 (0h47m): Shots 3 to 6 reached their limits at the same moment, so they went up in one push (e5f0a74) and were shown one after another.
- 21:26 (0h47m): Contact sheet layout: the six places in a 3 by 2 grid and the Reveal full width below, each labelled with its take, model and judge answer. It is a labelled overview, so it carries text. The kept frames carry none. One rejected take, shot 7 take 3, has the numbers 1 to 6 drawn on it by the model.
- 21:26 (0h48m): The anchor went into all 28 generations of shots 2 to 7. In the four reworks (Blood Marsh 5, Spine 5, Eye 5, Reveal 4) and in Reveal 5 it is reference image 2, because image 1 is the frame or layout being reworked.

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

### The Heart (`02-heart`)

Brief: A volcanic caldera with four chambers of lava that glow brighter and dimmer in a slow pulse, dark vein-like channels running out from it. High three-quarter camera.

Kept: take 3. All three passed the judge. Take 3 is the only one with four clearly separate lakes that still looks like a natural caldera: two bright, two dim, black ridges between them and dark channels running out. Faults still in it: The two dim lakes are close in size; the foreground slope is soft; thin lava threads at the bottom have no clear path. Finished 21:05 (0h26m).

#### 02-heart take 1: [`02-heart-take1.jpg`](02-heart-take1.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Main prompt: high three-quarter view at about 40 degrees, two lakes bright and two dim.
- Made: started 20:58, generation took 119 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/eruption-litli-hrutur-crater.jpg`](real/eruption-litli-hrutur-crater.jpg)
  3. [`real/caldera-halemaumau-oblique.jpg`](real/caldera-halemaumau-oblique.jpg)
  4. [`real/eruption-litli-hrutur-lava-river.jpg`](real/eruption-litli-hrutur-lava-river.jpg)
  5. [`real/eruption-grindavik-lava-field.jpg`](real/eruption-grindavik-lava-field.jpg)
- Blind judge `image_viewer_10` (asked 21:00, answered 21:02): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The lava channel in the lower right, which runs out over the crater rim with a thin, painted-on glow and no clear source or physically convincing path. The pale snow/ash patches in the foreground are also smeary and ambiguous in scale compared with the crisp lava lakes.
- Checked by eye against the brief: Only three lakes can be counted, two bright and one dim, so it misses the four chambers. Rim, gas and outflow channels look real.
- Prompt ([`prompts/02-heart-take1.txt`](prompts/02-heart-take1.txt)):

```text
A single frame from a live-action fantasy feature film, shot from a helicopter with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a huge volcanic caldera seen from high above at a three-quarter angle, looking down at about 40 degrees, with the far rim and a dark ash plain beyond it under low cloud. The caldera is roughly oval and several miles across; its rim is broken, terraced and slumped. Thick ridges of black rock cross its floor and divide it into four separate lava lakes of unequal size, two larger ones on the far side and two smaller ones nearer the camera. The lakes are at different moments of a slow pulse. Two are bright: their crust is torn open into wide glowing orange-yellow cracks and patches of open lava. The other two are dim: sealed under dark grey crust with only thin blood-red seams showing. From gaps in the rim, dark channels run outward and downhill across the surrounding plain: old lava rivers and collapsed lava tubes of black rock, branching and re-joining like the arms of a river delta, a few of them still carrying a thin red-orange thread of lava. The outer slopes are grey ash, black cinder and old ropy flows, with thin dirty snow in the hollows.

WHAT IS MOVING: the lava lakes glow and fade. Heat shimmer rises over them. Plumes of pale volcanic gas and steam lean with the wind and drift across the rim, lit orange from below. Ash blows off the ridges. Low cloud drags over the far rim.

It must read as a real volcano. The four lakes are irregular and natural, not a symbol or a diagram.

REFERENCE IMAGES: image 1 is a finished frame from the same film: match its colour grade, contrast, haze, grain and darkness exactly so the two frames cut together, but do not copy its canyon or its arches. Image 2 is a real lava lake in a crater: use it for how real lava, crust and gas look. Image 3 is a real caldera from the air: use it for the camera angle and the true scale and structure of a caldera floor. Image 4 is a real lava river at dusk: use it for the outflowing channels and the cold blue light around them. Image 5 is a real crusted lava field: use it for plated crust with glowing cracks.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 02-heart take 2: [`02-heart-take2.jpg`](02-heart-take2.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Variant: camera lower and nearer, just outside the near rim at about 30 degrees; lakes at three brightness levels; falling ash.
- Made: started 20:58, generation took 115 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/eruption-litli-hrutur-crater.jpg`](real/eruption-litli-hrutur-crater.jpg)
  3. [`real/caldera-halemaumau-oblique.jpg`](real/caldera-halemaumau-oblique.jpg)
  4. [`real/eruption-litli-hrutur-lava-river.jpg`](real/eruption-litli-hrutur-lava-river.jpg)
  5. [`real/eruption-grindavik-lava-field.jpg`](real/eruption-grindavik-lava-field.jpg)
- Blind judge `image_viewer_08` (asked 21:00, answered 21:02): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The four lava lakes are suspiciously uniform, near-perfect discs of similar size that look stamped in rather than geologically formed, with only one of them actually lit and active. The lava stream at lower right also crosses the crater rim without a clear source or believable scale, turning into a tangle of ropy strands.
- Checked by eye against the brief: Four lakes, one bright and three crusted. The lakes are near-identical flat discs, as its judge says, so the crater looks arranged.
- Prompt ([`prompts/02-heart-take2.txt`](prompts/02-heart-take2.txt)):

```text
A single frame from a live-action fantasy feature film, shot from a helicopter with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a huge volcanic caldera seen from the air at a three-quarter angle, from just outside and above its near rim, looking down at about 30 degrees. The broken near rim crosses the bottom of the frame, the four lakes fill the middle, and the far rim and a dark ash plain run off into storm cloud at the top. The caldera is roughly oval and several miles across; its rim is broken, terraced and slumped. Thick ridges of black rock cross its floor and divide it into four separate lava lakes of unequal size, two larger ones on the far side and two smaller ones nearer the camera. The lakes are at different moments of a slow pulse. One is at full brightness, a sheet of open orange-yellow lava with dark plates of crust drifting on it. One is half bright, its crust split by a net of glowing orange cracks. The other two are dim, sealed under dark grey crust with only thin blood-red seams showing. From gaps in the rim, dark channels run outward and downhill across the surrounding plain: old lava rivers and collapsed lava tubes of black rock, branching and re-joining like the arms of a river delta, a few of them still carrying a thin red-orange thread of lava. The outer slopes are grey ash, black cinder and old ropy flows, with thin dirty snow in the hollows.

WHAT IS MOVING: the lava lakes glow and fade. Fine ash falls like dirty snow and streaks past the camera. Heat shimmer rises over them. Plumes of pale volcanic gas and steam lean with the wind and drift across the rim, lit orange from below. Ash blows off the ridges. Low cloud drags over the far rim.

It must read as a real volcano. The four lakes are irregular and natural, not a symbol or a diagram.

REFERENCE IMAGES: image 1 is a finished frame from the same film: match its colour grade, contrast, haze, grain and darkness exactly so the two frames cut together, but do not copy its canyon or its arches. Image 2 is a real lava lake in a crater: use it for how real lava, crust and gas look. Image 3 is a real caldera from the air: use it for the camera angle and the true scale and structure of a caldera floor. Image 4 is a real lava river at dusk: use it for the outflowing channels and the cold blue light around them. Image 5 is a real crusted lava field: use it for plated crust with glowing cracks.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 02-heart take 3: [`02-heart-take3.jpg`](02-heart-take3.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Second roll of the take 1 prompt.
- Made: started 20:58, generation took 125 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/eruption-litli-hrutur-crater.jpg`](real/eruption-litli-hrutur-crater.jpg)
  3. [`real/caldera-halemaumau-oblique.jpg`](real/caldera-halemaumau-oblique.jpg)
  4. [`real/eruption-litli-hrutur-lava-river.jpg`](real/eruption-litli-hrutur-lava-river.jpg)
  5. [`real/eruption-grindavik-lava-field.jpg`](real/eruption-grindavik-lava-field.jpg)
- Blind judge `image_viewer_15` (asked 21:00, answered 21:02): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The foreground slope at the bottom, where the thin lava rivulets and snow-dusted rock smear into muddy, indistinct texture with no clear flow logic. The four crusted lava ponds are also suspiciously similar in size and crack pattern, which makes the crater look arranged rather than natural.
- Checked by eye against the brief: Four lakes divided by black ridges, two bright at the back and two dim in front, with gas plumes and dark channels running out at the bottom. It reads as a real caldera and the four chambers show only when you count them. Faults: the two dim lakes are similar in size; the foreground slope is soft.
- Prompt ([`prompts/02-heart-take3.txt`](prompts/02-heart-take3.txt)):

```text
A single frame from a live-action fantasy feature film, shot from a helicopter with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a huge volcanic caldera seen from high above at a three-quarter angle, looking down at about 40 degrees, with the far rim and a dark ash plain beyond it under low cloud. The caldera is roughly oval and several miles across; its rim is broken, terraced and slumped. Thick ridges of black rock cross its floor and divide it into four separate lava lakes of unequal size, two larger ones on the far side and two smaller ones nearer the camera. The lakes are at different moments of a slow pulse. Two are bright: their crust is torn open into wide glowing orange-yellow cracks and patches of open lava. The other two are dim: sealed under dark grey crust with only thin blood-red seams showing. From gaps in the rim, dark channels run outward and downhill across the surrounding plain: old lava rivers and collapsed lava tubes of black rock, branching and re-joining like the arms of a river delta, a few of them still carrying a thin red-orange thread of lava. The outer slopes are grey ash, black cinder and old ropy flows, with thin dirty snow in the hollows.

WHAT IS MOVING: the lava lakes glow and fade. Heat shimmer rises over them. Plumes of pale volcanic gas and steam lean with the wind and drift across the rim, lit orange from below. Ash blows off the ridges. Low cloud drags over the far rim.

It must read as a real volcano. The four lakes are irregular and natural, not a symbol or a diagram.

REFERENCE IMAGES: image 1 is a finished frame from the same film: match its colour grade, contrast, haze, grain and darkness exactly so the two frames cut together, but do not copy its canyon or its arches. Image 2 is a real lava lake in a crater: use it for how real lava, crust and gas look. Image 3 is a real caldera from the air: use it for the camera angle and the true scale and structure of a caldera floor. Image 4 is a real lava river at dusk: use it for the outflowing channels and the cold blue light around them. Image 5 is a real crusted lava field: use it for plated crust with glowing cracks.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

### The Breath (`03-breath`)

Brief: A glacier field of tall blue ice spires in a whiteout, all leaning one way as if frozen mid-exhale. A tiny herd crosses in the distance for scale. Ground level camera.

Kept: take 5. Takes 4 and 5 both passed and both meet the brief; take 5 gives the clearest scale, with a thin line of small animals under spires that fill the frame. Faults still in it: Herd animals are alike and evenly spaced; spires repeat one shape; rime fringes look like spikes. Finished 21:10 (0h31m).

#### 03-breath take 1: [`03-breath-take1.jpg`](03-breath-take1.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Main prompt: camera one metre above the snow, nearest spire on the left.
- Made: started 20:58, generation took 131 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/penitentes-ice-spires.jpg`](real/penitentes-ice-spires.jpg)
  3. [`real/seracs-kennicott-glacier.jpg`](real/seracs-kennicott-glacier.jpg)
  4. [`real/glacier-matanuska-blue-ice.jpg`](real/glacier-matanuska-blue-ice.jpg)
- Blind judge `image_viewer_19` (asked 21:00, answered 21:02): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The herd of animals in the midground is the weakest element: they read as smudgy, near-identical dark blobs with no clear anatomy or legs. The orange glow behind them is also vague, with no identifiable source.
- Checked by eye against the brief: Fails the brief: the spires curve in from both sides like the arches of shot 1 instead of all leaning one way, an orange glow was copied from the anchor, and the herd is too large to give scale.
- Prompt ([`prompts/03-breath-take1.txt`](prompts/03-breath-take1.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a glacier field in a whiteout, seen from ground level. The camera sits one metre above wind-packed snow with a 24 mm lens, looking across the field. Hundreds of tall spires of glacial ice stand in the snow, each as tall as a cathedral tower or taller, hard blue and blue-grey ice with dark bands of ash frozen into it. Every spire leans the same way, to the right, at the same angle, and their tips curl over in the same direction like breaking waves frozen solid, as if one enormous breath blew across the field and froze in place. The nearest spire stands close on the left and towers out of the top of the frame; its surface is scalloped, fluted and wind-polished, with rime and hard snow plastered on its windward side only. More spires stand in ranks behind it, each rank paler than the one in front, until the whiteout swallows them. Sky and ground merge into the same flat grey-white, with no horizon.

WHAT IS MOVING: a gale blows from left to right, the same way the spires lean. Driven snow and spindrift stream sideways past the camera, pour off the tips of the spires in long plumes and snake across the ground in low ribbons. In the middle distance a small herd of about twenty large, shaggy, dark animals crosses the snow in single file between the spires, heads down into the wind. They are tiny, barely more than dark dots with legs, and they show how enormous the spires are.

REFERENCE IMAGES: image 1 is a finished frame from the same film: match its colour grade, contrast, haze, grain and darkness exactly so the two frames cut together, but do not copy its canyon or its arches. Image 2 is a real field of penitentes: use it for the way natural ice blades all lean the same way. Image 3 shows real glacier seracs: use it for the dark dirt bands and the broken shapes of real ice towers. Image 4 is real blue glacier ice: use it for the colour and translucency of the ice. Ignore the blue skies in these photographs.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 03-breath take 2: [`03-breath-take2.jpg`](03-breath-take2.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Variant: camera lower, nearest spire on the right leaning over the camera, heavier whiteout.
- Made: started 20:58, generation took 131 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/penitentes-ice-spires.jpg`](real/penitentes-ice-spires.jpg)
  3. [`real/seracs-kennicott-glacier.jpg`](real/seracs-kennicott-glacier.jpg)
  4. [`real/glacier-matanuska-blue-ice.jpg`](real/glacier-matanuska-blue-ice.jpg)
- Blind judge `image_viewer_18` (asked 21:00, answered 21:02): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The herd of animals at the centre is the least convincing element: the figures are small, dark, near-identical blobs with indistinct anatomy that barely interact with the snow. The foreground snow drift is also somewhat smeared and soft compared with the crisp detail on the ice spires.
- Checked by eye against the brief: Fails the brief: the spires are horn shapes that curl toward each other from both sides, not all leaning one way. Good whiteout and spindrift.
- Prompt ([`prompts/03-breath-take2.txt`](prompts/03-breath-take2.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a glacier field in a whiteout, seen from ground level. The camera sits half a metre above wind-packed snow with a 21 mm lens, looking across the field; ribbons of blowing snow cross the foreground. Hundreds of tall spires of glacial ice stand in the snow, each as tall as a cathedral tower or taller, hard blue and blue-grey ice with dark bands of ash frozen into it. Every spire leans the same way, to the right, at the same angle, and their tips curl over in the same direction like breaking waves frozen solid, as if one enormous breath blew across the field and froze in place. The nearest spire stands close on the right and towers out of the top of the frame, leaning into the picture over the camera; its surface is scalloped, fluted and wind-polished, with rime and hard snow plastered on its windward side only. More spires stand in ranks behind it, each rank paler than the one in front, until the whiteout swallows them; only the nearest three ranks are clear, and the rest are grey ghosts. Sky and ground merge into the same flat grey-white, with no horizon.

WHAT IS MOVING: a gale blows from left to right, the same way the spires lean. Driven snow and spindrift stream sideways past the camera, pour off the tips of the spires in long plumes and snake across the ground in low ribbons. In the middle distance a small herd of about twenty large, shaggy, dark animals crosses the snow in single file between the spires, heads down into the wind. They are tiny, barely more than dark dots with legs, and they show how enormous the spires are.

REFERENCE IMAGES: image 1 is a finished frame from the same film: match its colour grade, contrast, haze, grain and darkness exactly so the two frames cut together, but do not copy its canyon or its arches. Image 2 is a real field of penitentes: use it for the way natural ice blades all lean the same way. Image 3 shows real glacier seracs: use it for the dark dirt bands and the broken shapes of real ice towers. Image 4 is real blue glacier ice: use it for the colour and translucency of the ice. Ignore the blue skies in these photographs.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 03-breath take 3: [`03-breath-take3.jpg`](03-breath-take3.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Second roll of the take 1 prompt.
- Made: started 20:58, generation took 131 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/penitentes-ice-spires.jpg`](real/penitentes-ice-spires.jpg)
  3. [`real/seracs-kennicott-glacier.jpg`](real/seracs-kennicott-glacier.jpg)
  4. [`real/glacier-matanuska-blue-ice.jpg`](real/glacier-matanuska-blue-ice.jpg)
- Blind judge `image_viewer_17` (asked 21:00, answered 21:02): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The tiny herd of animals in the midground is the weakest element: they read as indistinct, near-identical dark blobs with muddy silhouettes, and the small orange glow behind them is a smudgy, undefined light source that doesn't cast convincing light on the surrounding snow or ice.
- Checked by eye against the brief: Fails the brief: the spires form an avenue of arches copied from the anchor, with an orange glow at the end.
- Prompt ([`prompts/03-breath-take3.txt`](prompts/03-breath-take3.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a glacier field in a whiteout, seen from ground level. The camera sits one metre above wind-packed snow with a 24 mm lens, looking across the field. Hundreds of tall spires of glacial ice stand in the snow, each as tall as a cathedral tower or taller, hard blue and blue-grey ice with dark bands of ash frozen into it. Every spire leans the same way, to the right, at the same angle, and their tips curl over in the same direction like breaking waves frozen solid, as if one enormous breath blew across the field and froze in place. The nearest spire stands close on the left and towers out of the top of the frame; its surface is scalloped, fluted and wind-polished, with rime and hard snow plastered on its windward side only. More spires stand in ranks behind it, each rank paler than the one in front, until the whiteout swallows them. Sky and ground merge into the same flat grey-white, with no horizon.

WHAT IS MOVING: a gale blows from left to right, the same way the spires lean. Driven snow and spindrift stream sideways past the camera, pour off the tips of the spires in long plumes and snake across the ground in low ribbons. In the middle distance a small herd of about twenty large, shaggy, dark animals crosses the snow in single file between the spires, heads down into the wind. They are tiny, barely more than dark dots with legs, and they show how enormous the spires are.

REFERENCE IMAGES: image 1 is a finished frame from the same film: match its colour grade, contrast, haze, grain and darkness exactly so the two frames cut together, but do not copy its canyon or its arches. Image 2 is a real field of penitentes: use it for the way natural ice blades all lean the same way. Image 3 shows real glacier seracs: use it for the dark dirt bands and the broken shapes of real ice towers. Image 4 is real blue glacier ice: use it for the colour and translucency of the ice. Ignore the blue skies in these photographs.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 03-breath take 4: [`03-breath-take4.jpg`](03-breath-take4.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Remake after the eye check: spires described as straight parallel blades all tilted to the right, no arches, no orange glow; herd much smaller and further off.
- Made: started 21:05, generation took 126 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/penitentes-ice-spires.jpg`](real/penitentes-ice-spires.jpg)
  3. [`real/seracs-kennicott-glacier.jpg`](real/seracs-kennicott-glacier.jpg)
  4. [`real/glacier-matanuska-blue-ice.jpg`](real/glacier-matanuska-blue-ice.jpg)
- Blind judge `image_viewer_24` (asked 21:07, answered 21:10): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The herd of animals in the mid-ground is the weakest element: they read as small, dark, mushy blobs with no clear anatomy or species, and they sit on the snow without convincing interaction with the blizzard. The ice spires are also somewhat repetitive in shape and lean, like copies of one asset.
- Checked by eye against the brief: Meets the brief: every spire tilts the same way, in parallel, with rime trailing downwind, no arches and no orange glow. The near spire gives depth. The herd is bunched and larger than in take 5, so it gives less scale.
- Prompt ([`prompts/03-breath-take4.txt`](prompts/03-breath-take4.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a glacier field in a whiteout, seen from ground level. The camera sits one metre above wind-packed snow with a 24 mm lens, looking across the field, side-on to the wind. The whole field is a forest of tall, narrow blades and needles of glacial ice, like penitentes grown to the height of skyscrapers. Every one of them is tilted the same way, about 25 degrees to the right, and they are parallel to each other, like grass flattened by a gale or the teeth of a comb. None leans left. None curls, arches or bends toward another, and no two meet overhead. Each is a straight, tapering, knife-edged slab of hard blue and blue-grey ice with dark ash bands frozen into it, fluted and scalloped by wind, with white rime plastered on its left, windward face only and a frozen feathery plume of rime trailing from its tip to the right. One spire stands close at the left edge of the frame and runs out of the top. The others stand in ranks behind it, each rank paler than the one in front, until the whiteout swallows them. Sky and ground merge into the same flat grey-white with no horizon.

WHAT IS MOVING: a gale blows from left to right, the same way the spires lean, as if one enormous breath crossed the field and froze it. Driven snow and spindrift stream sideways past the camera, pour off the tips of the spires in long plumes and snake across the ground in low ribbons. Far off, between the feet of the spires, a herd of about thirty large, shaggy, dark animals crosses the snow in one straggling line, heads down into the wind. They are very far away and very small, each less than a hundredth of the height of the spires behind them, and half lost in the blowing snow.

There is no fire, no orange glow and no warm colour anywhere in this frame. It is entirely white, grey and cold blue.

REFERENCE IMAGES: image 1 is a finished frame from the same film: use it only for colour grade, contrast, haze, grain and darkness, and copy nothing else from it: no canyon, no curved arches, no orange glow. Image 2 is a real field of penitentes: use it for the shape of the ice blades and the way they all tilt one way, in parallel. Image 3 shows real glacier seracs: use it for the dark dirt bands in real ice. Image 4 is real blue glacier ice: use it for the colour and translucency of the ice. Ignore the blue skies in these photographs.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 03-breath take 5: [`03-breath-take5.jpg`](03-breath-take5.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Same as take 4 but with no spire near the camera: open snow in front, the first rank of spires several hundred metres off, herd on the open snow.
- Made: started 21:05, generation took 143 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/penitentes-ice-spires.jpg`](real/penitentes-ice-spires.jpg)
  3. [`real/seracs-kennicott-glacier.jpg`](real/seracs-kennicott-glacier.jpg)
  4. [`real/glacier-matanuska-blue-ice.jpg`](real/glacier-matanuska-blue-ice.jpg)
- Blind judge `image_viewer_27` (asked 21:07, answered 21:10): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The herd of animals along the horizon is the least convincing element: they read as near-identical dark blobs strung out in an evenly spaced line, with little individual anatomy or interaction with the blowing snow. The ice spires are also somewhat repetitive in shape and lean angle.
- Checked by eye against the brief: Meets the brief best: every spire tilts the same way, open wind-scoured snow in front, and the herd is a thin line of small animals at the feet of the spires, which makes the spires read as enormous. Faults: the animals are alike and evenly spaced; the spires repeat one shape; the rime fringes look like spikes.
- Prompt ([`prompts/03-breath-take5.txt`](prompts/03-breath-take5.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a glacier field in a whiteout, seen from ground level. The camera sits one metre above wind-packed snow with a 24 mm lens, looking across the field, side-on to the wind. The whole field is a forest of tall, narrow blades and needles of glacial ice, like penitentes grown to the height of skyscrapers. Every one of them is tilted the same way, about 25 degrees to the right, and they are parallel to each other, like grass flattened by a gale or the teeth of a comb. None leans left. None curls, arches or bends toward another, and no two meet overhead. Each is a straight, tapering, knife-edged slab of hard blue and blue-grey ice with dark ash bands frozen into it, fluted and scalloped by wind, with white rime plastered on its left, windward face only and a frozen feathery plume of rime trailing from its tip to the right. No spire is close to the camera. A wide, empty plain of wind-scoured snow fills the lower third of the frame, and the spires begin beyond it: the first rank stands several hundred metres away and already fills the height of the frame, and more ranks stand behind it, each paler than the one in front, until the whiteout swallows them. Sky and ground merge into the same flat grey-white with no horizon.

WHAT IS MOVING: a gale blows from left to right, the same way the spires lean, as if one enormous breath crossed the field and froze it. Driven snow and spindrift stream sideways past the camera, pour off the tips of the spires in long plumes and snake across the ground in low ribbons. On the open snow in front of the first rank of spires, a herd of about thirty large, shaggy, dark animals crosses the snow in one straggling line, heads down into the wind. They are very far away and very small, each less than a hundredth of the height of the spires behind them, and half lost in the blowing snow.

There is no fire, no orange glow and no warm colour anywhere in this frame. It is entirely white, grey and cold blue.

REFERENCE IMAGES: image 1 is a finished frame from the same film: use it only for colour grade, contrast, haze, grain and darkness, and copy nothing else from it: no canyon, no curved arches, no orange glow. Image 2 is a real field of penitentes: use it for the shape of the ice blades and the way they all tilt one way, in parallel. Image 3 shows real glacier seracs: use it for the dark dirt bands in real ice. Image 4 is real blue glacier ice: use it for the colour and translucency of the ice. Ignore the blue skies in these photographs.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

### The Blood Marsh (`04-blood-marsh`)

Brief: Still rust-red water, black reeds, heavy fog. One huge dark shape just under the surface with a slow ripple above it. Camera low over the water.

Kept: take 4. All five passed the judge. Take 4 is the only one where the water is red throughout and the shape is huge and fully under the surface. Faults still in it: The swell over the shape is blue-grey and does not blend into the red water; the frame is flatter than takes 1 to 3. Finished 21:10 (0h31m).

#### 04-blood-marsh take 1: [`04-blood-marsh-take1.jpg`](04-blood-marsh-take1.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Main prompt: camera 30 cm above the water, shape in the middle distance right of centre.
- Made: started 20:58, generation took 122 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/marsh-fog-reeds-abant.jpg`](real/marsh-fog-reeds-abant.jpg)
  3. [`real/rio-tinto-red-water.jpg`](real/rio-tinto-red-water.jpg)
  4. [`real/reeds-and-fog.jpg`](real/reeds-and-fog.jpg)
- Blind judge `image_viewer_12` (asked 21:00, answered 21:02): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The fiery orange-rust glow in the foreground water has no motivating light source, since the sky is uniformly cold grey, so it reads as a pasted-in colour accent rather than a reflection. The dark shape at the centre of the ripples is also an ambiguous smooth blob that doesn't resolve into anything identifiable.
- Checked by eye against the brief: Atmosphere, reeds, fog and camera height are right. Faults: only a patch of foreground water is red and it looks like a glow; the shape is a small lump that breaks the surface like a rock, not something huge under it.
- Prompt ([`prompts/04-blood-marsh-take1.txt`](prompts/04-blood-marsh-take1.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a vast flooded marsh in heavy fog. The camera hangs thirty centimetres above the water with a 28 mm lens, looking out across it. The water is dead still, shallow and opaque, the colour of rust and old blood: iron red in the foreground, darkening to brown-black where it is deeper, with a dull grey sheen of reflected sky. Clumps of dead black reeds and rushes stand in the water on both sides of the frame, broken and bent, with black rotten stumps and peat hummocks among them, each with its dark reflection. Fog hangs low over the whole marsh in thick layers. The reed beds fade into it rank by rank, and there is no horizon, only grey.

In open water in the middle distance, slightly right of centre, something huge lies just under the surface: one long, dark, smooth mass, far bigger than a house, seen only as a darker shadow in the red water with a low smooth swell where its back almost breaks the surface. Its outline is vague and cannot be identified. It has no eyes, no fins, no head and nothing that clearly belongs to an animal.

WHAT IS MOVING: directly above the shape, one set of slow, wide, perfectly smooth ripple rings spreads outward across the otherwise mirror-still water and bends the reflections of the reeds. The fog rolls slowly from left to right in banks. Nothing else moves.

REFERENCE IMAGES: image 1 is a finished frame from the same film: match its colour grade, contrast, haze, grain and darkness exactly so the two frames cut together, but do not copy its canyon or its arches. Image 2 is a real foggy lake with reeds: use it for cold fog rolling over water and the dark bands of reeds. Image 3 is a real river that is naturally rust red: use it for the true colour and opacity of iron-red water. Image 4 shows real reed beds in fog: use it for the way reed clumps fade rank by rank, and ignore its warm golden colour.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 04-blood-marsh take 2: [`04-blood-marsh-take2.jpg`](04-blood-marsh-take2.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Variant: camera lower with reeds close in the foreground, shape nearer and central, drowned trees in the fog.
- Made: started 20:58, generation took 113 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/marsh-fog-reeds-abant.jpg`](real/marsh-fog-reeds-abant.jpg)
  3. [`real/rio-tinto-red-water.jpg`](real/rio-tinto-red-water.jpg)
  4. [`real/reeds-and-fog.jpg`](real/reeds-and-fog.jpg)
- Blind judge `image_viewer_07` (asked 21:00, answered 21:02): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The orange-red glow in the foreground water has no motivated light source under the cold overcast sky, so it reads as painted-on color rather than lit. The central submerged lump is also too vague and smooth to read clearly, and the reed reflections on the right don't quite match the reeds above them.
- Checked by eye against the brief: Same strengths and faults as take 1: red only in a foreground patch, and a small lump above the surface. The out-of-focus reeds close to the lens work well.
- Prompt ([`prompts/04-blood-marsh-take2.txt`](prompts/04-blood-marsh-take2.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a vast flooded marsh in heavy fog. The camera hangs twenty centimetres above the water with a 24 mm lens, looking out across it; a clump of broken black reeds stands close in the left foreground, out of focus. The water is dead still, shallow and opaque, the colour of rust and old blood: iron red in the foreground, darkening to brown-black where it is deeper, with a dull grey sheen of reflected sky. Clumps of dead black reeds and rushes stand in the water on both sides of the frame, broken and bent, with black rotten stumps and peat hummocks among them, each with its dark reflection. Fog hangs low over the whole marsh in thick layers. The reed beds fade into it rank by rank, and there is no horizon, only grey.

In open water not far ahead, in the centre of the frame, something huge lies just under the surface and stretches most of the way across the open water: one long, dark, smooth mass, far bigger than a house, seen only as a darker shadow in the red water with a low smooth swell where its back almost breaks the surface. Its outline is vague and cannot be identified. It has no eyes, no fins, no head and nothing that clearly belongs to an animal.

WHAT IS MOVING: directly above the shape, one set of slow, wide, perfectly smooth ripple rings spreads outward across the otherwise mirror-still water and bends the reflections of the reeds. The fog rolls slowly from left to right in banks and its lowest layer slides over the water. Far off, the black skeletons of a few drowned trees show through the fog. Nothing else moves.

REFERENCE IMAGES: image 1 is a finished frame from the same film: match its colour grade, contrast, haze, grain and darkness exactly so the two frames cut together, but do not copy its canyon or its arches. Image 2 is a real foggy lake with reeds: use it for cold fog rolling over water and the dark bands of reeds. Image 3 is a real river that is naturally rust red: use it for the true colour and opacity of iron-red water. Image 4 shows real reed beds in fog: use it for the way reed clumps fade rank by rank, and ignore its warm golden colour.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 04-blood-marsh take 3: [`04-blood-marsh-take3.jpg`](04-blood-marsh-take3.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Second roll of the take 1 prompt.
- Made: started 20:58, generation took 122 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/marsh-fog-reeds-abant.jpg`](real/marsh-fog-reeds-abant.jpg)
  3. [`real/rio-tinto-red-water.jpg`](real/rio-tinto-red-water.jpg)
  4. [`real/reeds-and-fog.jpg`](real/reeds-and-fog.jpg)
- Blind judge `image_viewer_13` (asked 21:00, answered 21:02): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The central subject is an indistinct dark lump that reads as neither creature nor rock, and its perfectly concentric ripples look too neat for something static. The rusty orange glow in the foreground water also has no matching source in the flat grey sky.
- Checked by eye against the brief: Best frame of the first three, but the same faults: red only in the foreground, and the shape is a small rock-like lump above the surface.
- Prompt ([`prompts/04-blood-marsh-take3.txt`](prompts/04-blood-marsh-take3.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a vast flooded marsh in heavy fog. The camera hangs thirty centimetres above the water with a 28 mm lens, looking out across it. The water is dead still, shallow and opaque, the colour of rust and old blood: iron red in the foreground, darkening to brown-black where it is deeper, with a dull grey sheen of reflected sky. Clumps of dead black reeds and rushes stand in the water on both sides of the frame, broken and bent, with black rotten stumps and peat hummocks among them, each with its dark reflection. Fog hangs low over the whole marsh in thick layers. The reed beds fade into it rank by rank, and there is no horizon, only grey.

In open water in the middle distance, slightly right of centre, something huge lies just under the surface: one long, dark, smooth mass, far bigger than a house, seen only as a darker shadow in the red water with a low smooth swell where its back almost breaks the surface. Its outline is vague and cannot be identified. It has no eyes, no fins, no head and nothing that clearly belongs to an animal.

WHAT IS MOVING: directly above the shape, one set of slow, wide, perfectly smooth ripple rings spreads outward across the otherwise mirror-still water and bends the reflections of the reeds. The fog rolls slowly from left to right in banks. Nothing else moves.

REFERENCE IMAGES: image 1 is a finished frame from the same film: match its colour grade, contrast, haze, grain and darkness exactly so the two frames cut together, but do not copy its canyon or its arches. Image 2 is a real foggy lake with reeds: use it for cold fog rolling over water and the dark bands of reeds. Image 3 is a real river that is naturally rust red: use it for the true colour and opacity of iron-red water. Image 4 shows real reed beds in fog: use it for the way reed clumps fade rank by rank, and ignore its warm golden colour.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 04-blood-marsh take 4: [`04-blood-marsh-take4.jpg`](04-blood-marsh-take4.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Remake after the eye check: all of the water rust red as its own colour, and the shape fully submerged, whale-sized, seen as a shadow with one ripple ring.
- Made: started 21:05, generation took 153 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/marsh-fog-reeds-abant.jpg`](real/marsh-fog-reeds-abant.jpg)
  3. [`real/rio-tinto-red-water.jpg`](real/rio-tinto-red-water.jpg)
  4. [`real/reeds-and-fog.jpg`](real/reeds-and-fog.jpg)
- Blind judge `image_viewer_28` (asked 21:07, answered 21:10): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The central swell in the water: the smooth blue-grey bulge looks like a soft pasted patch whose ripples and colour do not blend physically into the surrounding red water. The red tint also reads as a graded overlay rather than a reflection consistent with the grey sky.
- Checked by eye against the brief: Meets the brief best: all of the water is rust red, and the shape is fully under the surface, wide as the open water, with a smooth swell and a ripple ring. Faults: the swell is blue-grey and does not blend into the red around it; the frame is flatter and less dramatic than takes 1 to 3.
- Prompt ([`prompts/04-blood-marsh-take4.txt`](prompts/04-blood-marsh-take4.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a vast flooded marsh in heavy fog. The camera hangs thirty centimetres above the water with a 24 mm lens, looking out across it. The water itself is rust red: opaque, iron-stained water the colour of rust and dried blood, like a river that drains iron mines. It is red everywhere, from the foreground to the fog, and the red is the water's own colour, not a glow, a light or a reflection of anything. It is shallow and dead still, a matt red mirror with a dull grey sheen where it reflects the overcast sky. Clumps of dead black reeds and rushes stand in the water on both sides of the frame, broken and bent, with black rotten stumps and peat hummocks among them, each with its dark reflection. Fog hangs low over the whole marsh in thick layers. The reed beds fade into it rank by rank, and there is no horizon, only grey.

In the open water ahead lies something huge, just under the surface: one long dark shape the size of a whale, about sixty metres long, lying across the frame. It does not break the surface and no part of it is out of the water. It is seen only as a broad, almost black shadow inside the red water, with soft edges that fade with depth, and a faint smooth swelling of the surface over its back. It is far too big for water this shallow. Its outline is vague and cannot be identified: no eyes, no fins, no head, no rock, nothing that clearly belongs to an animal.

WHAT IS MOVING: over the middle of the shape, one slow, wide ripple ring spreads outward across the otherwise mirror-still water and bends the reflections of the reeds. The fog rolls slowly from left to right in banks. Nothing else moves.

REFERENCE IMAGES: image 1 is a finished frame from the same film: use it only for colour grade, contrast, haze, grain and darkness, and copy nothing else from it: no canyon, no arches, no orange glow. Image 2 is a real foggy lake with reeds: use it for cold fog rolling over water and the dark bands of reeds. Image 3 is a real river that is naturally rust red: use it for the true colour and opacity of iron-red water. Image 4 shows real reed beds in fog: use it for the way reed clumps fade rank by rank, and ignore its warm golden colour.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 04-blood-marsh take 5: [`04-blood-marsh-take5.jpg`](04-blood-marsh-take5.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Rework of take 3: same frame, water made rust red throughout, the lump replaced by a huge shadow under the surface.
- Made: started 21:05, generation took 130 s.
- Reference images, in the order passed (image 1 first):
  1. [`04-blood-marsh-take3.jpg`](04-blood-marsh-take3.jpg)
  2. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  3. [`real/rio-tinto-red-water.jpg`](real/rio-tinto-red-water.jpg)
- Blind judge `image_viewer_25` (asked 21:07, answered 21:10): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The red-orange glow in the foreground water has no matching light source in the uniformly grey-blue sky, so it reads as unmotivated; the dark shape at the centre of the ripples is also vague and blob-like, with reed reflections that do not consistently match the reeds above them.
- Checked by eye against the brief: The rework kept take 3's frame and made the shape a larger shadow under the surface, but the water is still red only in the foreground, so the main fault remains.
- Prompt ([`prompts/04-blood-marsh-take5.txt`](prompts/04-blood-marsh-take5.txt)):

```text
Rework image 1, which is a frame from a live-action fantasy feature film: a foggy marsh seen from just above the water. Keep its camera position, lens, composition, black reeds and stumps, fog, overcast sky, colour grade, contrast, darkness and film grain exactly as they are. Change only the water and the thing in it.

The water: in image 1 only a patch of the foreground is orange-red, and it looks like a glow. Make all of the water rust red instead: opaque, iron-stained water the colour of rust and dried blood, from the foreground to the fog. The red is the water's own colour, not a glow, a light or a reflection. It stays shallow and dead still, a matt red mirror with a dull grey sheen where it reflects the overcast sky, and it keeps the dark reflections of the reeds. Image 3 is a real river that is naturally rust red: use it for the true colour and opacity of the water.

The shape: in image 1 a small dark lump sticks out of the water like a rock. Remove it. In its place, something huge lies just under the surface: one long dark shape the size of a whale, several times wider than the old lump, lying across the open water. It does not break the surface. It is seen only as a broad, almost black shadow inside the red water, with soft edges that fade with depth, and a faint smooth swelling of the surface over its back. Its outline is vague and cannot be identified: no eyes, no fins, no head. Over its middle, one slow, wide ripple ring spreads outward across the otherwise mirror-still water.

Image 2 is another finished frame from the same film: use it only to keep the same colour grade, haze and grain, and copy nothing else from it.

The result must look like a real photograph of a real place taken for a top-budget live-action film: heavy overcast at dusk, flat cold light, ash grey and cold slate blue, with the rust-red water as the only strong colour. No people, no buildings, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

### The Spine (`05-spine`)

Brief: A mountain ridge of evenly spaced vertebra-shaped peaks above a sea of cloud, lightning crawling along it. Camera level with the ridge, looking down its length.

Kept: take 3. Limit of five takes reached. Take 3 is the closest to the brief: a line of matching peaks with a central fin and side buttresses above the cloud sea, camera level with the crest, lightning running along it. Take 5 is a near copy of it and take 1 has unmatched needles. Faults still in it: Lightning is a thin web that lights neither rock nor cloud; the far peaks are a comb of identical cones. Finished 21:10 (0h31m).

#### 05-spine take 1: [`05-spine-take1.jpg`](05-spine-take1.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Main prompt: ridge in a gentle S-curve, nearest peak on the right, lightning running from peak to peak.
- Made: started 20:58, generation took 120 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/ridge-minarets-ritter-range.jpg`](real/ridge-minarets-ritter-range.jpg)
  3. [`real/sea-of-clouds-mountains.jpg`](real/sea-of-clouds-mountains.jpg)
  4. [`real/lightning-branching.jpg`](real/lightning-branching.jpg)
  5. [`real/lightning-grey-storm.jpg`](real/lightning-grey-storm.jpg)
- Blind judge `image_viewer_11` (asked 21:00, answered 21:02): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The lightning bolt is the least convincing element: it runs as a thin, nearly horizontal thread hopping from spire tip to spire tip and casts no believable flash on the surrounding rock or clouds. The small orange glow in the far-left distance also reads as unmotivated.
- Checked by eye against the brief: Real-looking rock and cloud sea, camera level with the crest. Faults: the peaks are needles of mixed sizes, not evenly spaced matching peaks; the lightning is a thin thread; a red glow in the far cloud has no source.
- Prompt ([`prompts/05-spine-take1.txt`](prompts/05-spine-take1.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a mountain ridge above a sea of cloud in a thunderstorm at dusk. The camera is level with the crest of the ridge, as if standing on one of its peaks with a 35 mm lens, looking straight down the length of the ridge as it runs away in a long, gentle S-curve to the horizon. The ridge is a single line of peaks, evenly spaced and all nearly the same size and shape. Each peak is a blocky mass of pale grey-white rock with one tall central fin on top and a lower buttress jutting out on each side, and between each peak and the next is the same deep, narrow notch. The repetition is regular enough to be unsettling, but these are clearly real mountains: fractured, frost-shattered rock, ledges, scree chutes, dark staining, old snow and ice in the gullies. The nearest peak is close and large in the right half of the frame, and the line of matching peaks recedes behind it, each one smaller and bluer in the haze, at least fifteen of them before they vanish. On both sides the ridge drops steeply into an unbroken sea of dark grey cloud that fills everything below; no valley or ground is visible. Above hangs a second, higher ceiling of storm cloud.

WHAT IS MOVING: lightning crawls along the ridge. A long, branching, blue-white discharge runs sideways from peak to peak along the crest, jumping the notches, and lights the fins and the cloud beneath them. A second, fainter flash glows inside the cloud sea far along the ridge. The cloud sea rolls slowly and spills through the notches like water over a weir. Snow blows off the crests in thin plumes.

REFERENCE IMAGES: image 1 is a finished frame from the same film: match its colour grade, contrast, haze, grain and darkness exactly so the two frames cut together, but do not copy its canyon or its arches. Image 2 is a real serrated ridge of similar spires: use it for the true rock structure of a row of matching peaks. Image 3 shows real peaks above a sea of cloud: use it for the cloud sea and the way peaks stand out of it. Image 4 is real lightning: use it for the colour and branching of the bolt. Image 5 is a real storm over a ridge: use it for the grey storm sky. Ignore the blue skies and green trees in these photographs.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 05-spine take 2: [`05-spine-take2.jpg`](05-spine-take2.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Variant: ridge almost straight, two near peaks low in the centre, lightning in the cloud base forking down onto several peaks.
- Made: started 20:58, generation took 132 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/ridge-minarets-ritter-range.jpg`](real/ridge-minarets-ritter-range.jpg)
  3. [`real/sea-of-clouds-mountains.jpg`](real/sea-of-clouds-mountains.jpg)
  4. [`real/lightning-branching.jpg`](real/lightning-branching.jpg)
  5. [`real/lightning-grey-storm.jpg`](real/lightning-grey-storm.jpg)
- Blind judge `image_viewer_20` (asked 21:00, answered 21:02): **(d) amateur generated art**, so it fails. Weakest part: The far ridge is a row of near-identical, evenly spaced cone spires that read as copy-pasted, and the lightning above them is thin and barely lights the surrounding clouds or rock. Stray orange ember specks with no source are scattered across the peaks, and there is no focal subject or scale cue.
- Checked by eye against the brief: Failed by its judge. The far ridge is a row of copied cones and embers were carried over from the anchor.
- Prompt ([`prompts/05-spine-take2.txt`](prompts/05-spine-take2.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a mountain ridge above a sea of cloud in a thunderstorm at dusk. The camera is level with the crest of the ridge, as if standing on one of its peaks with a 35 mm lens, looking straight down the length of the ridge as it runs away almost dead straight, with only a slight bend near the horizon, like a wall dividing the cloud. The ridge is a single line of peaks, evenly spaced and all nearly the same size and shape. Each peak is a blocky mass of pale grey-white rock with one tall central fin on top and a lower buttress jutting out on each side, and between each peak and the next is the same deep, narrow notch. The repetition is regular enough to be unsettling, but these are clearly real mountains: fractured, frost-shattered rock, ledges, scree chutes, dark staining, old snow and ice in the gullies. The two nearest peaks are close and large, low in the centre of the frame, and the line of matching peaks recedes behind them, each one smaller and bluer in the haze, at least fifteen of them before they vanish. On both sides the ridge drops steeply into an unbroken sea of dark grey cloud that fills everything below; no valley or ground is visible. Above hangs a second, higher ceiling of storm cloud.

WHAT IS MOVING: lightning crawls along the ridge. A long, branching, blue-white discharge runs sideways through the base of the storm cloud just above the crest and sends short forks down onto the tops of five or six peaks at once, lighting the fins and the cloud beneath them. A second, fainter flash glows inside the cloud sea far along the ridge. The cloud sea rolls slowly and spills through the notches like water over a weir. Snow blows off the crests in thin plumes.

REFERENCE IMAGES: image 1 is a finished frame from the same film: match its colour grade, contrast, haze, grain and darkness exactly so the two frames cut together, but do not copy its canyon or its arches. Image 2 is a real serrated ridge of similar spires: use it for the true rock structure of a row of matching peaks. Image 3 shows real peaks above a sea of cloud: use it for the cloud sea and the way peaks stand out of it. Image 4 is real lightning: use it for the colour and branching of the bolt. Image 5 is a real storm over a ridge: use it for the grey storm sky. Ignore the blue skies and green trees in these photographs.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 05-spine take 3: [`05-spine-take3.jpg`](05-spine-take3.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Second roll of the take 1 prompt.
- Made: started 20:58, generation took 119 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/ridge-minarets-ritter-range.jpg`](real/ridge-minarets-ritter-range.jpg)
  3. [`real/sea-of-clouds-mountains.jpg`](real/sea-of-clouds-mountains.jpg)
  4. [`real/lightning-branching.jpg`](real/lightning-branching.jpg)
  5. [`real/lightning-grey-storm.jpg`](real/lightning-grey-storm.jpg)
- Blind judge `image_viewer_09` (asked 21:00, answered 21:02): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The lightning looks pasted on: a thin horizontal web of bolts that casts no glow on the surrounding clouds or rock faces. The distant row of spires is also too evenly spaced and uniform, reading as cloned rather than natural.
- Checked by eye against the brief: Closest to the brief: a line of matching peaks, each with a central fin and side buttresses, curving away above the cloud sea. Faults: the lightning is a thin web that lights nothing; the far peaks are a row of identical cones.
- Prompt ([`prompts/05-spine-take3.txt`](prompts/05-spine-take3.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a mountain ridge above a sea of cloud in a thunderstorm at dusk. The camera is level with the crest of the ridge, as if standing on one of its peaks with a 35 mm lens, looking straight down the length of the ridge as it runs away in a long, gentle S-curve to the horizon. The ridge is a single line of peaks, evenly spaced and all nearly the same size and shape. Each peak is a blocky mass of pale grey-white rock with one tall central fin on top and a lower buttress jutting out on each side, and between each peak and the next is the same deep, narrow notch. The repetition is regular enough to be unsettling, but these are clearly real mountains: fractured, frost-shattered rock, ledges, scree chutes, dark staining, old snow and ice in the gullies. The nearest peak is close and large in the right half of the frame, and the line of matching peaks recedes behind it, each one smaller and bluer in the haze, at least fifteen of them before they vanish. On both sides the ridge drops steeply into an unbroken sea of dark grey cloud that fills everything below; no valley or ground is visible. Above hangs a second, higher ceiling of storm cloud.

WHAT IS MOVING: lightning crawls along the ridge. A long, branching, blue-white discharge runs sideways from peak to peak along the crest, jumping the notches, and lights the fins and the cloud beneath them. A second, fainter flash glows inside the cloud sea far along the ridge. The cloud sea rolls slowly and spills through the notches like water over a weir. Snow blows off the crests in thin plumes.

REFERENCE IMAGES: image 1 is a finished frame from the same film: match its colour grade, contrast, haze, grain and darkness exactly so the two frames cut together, but do not copy its canyon or its arches. Image 2 is a real serrated ridge of similar spires: use it for the true rock structure of a row of matching peaks. Image 3 shows real peaks above a sea of cloud: use it for the cloud sea and the way peaks stand out of it. Image 4 is real lightning: use it for the colour and branching of the bolt. Image 5 is a real storm over a ridge: use it for the grey storm sky. Ignore the blue skies and green trees in these photographs.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 05-spine take 4: [`05-spine-take4.jpg`](05-spine-take4.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Remake of the failed take 2: main prompt with the lightning rewritten as a real strike that lights cloud and rock, peaks alike but not copies, no embers.
- Made: started 21:05, generation took 122 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/ridge-minarets-ritter-range.jpg`](real/ridge-minarets-ritter-range.jpg)
  3. [`real/sea-of-clouds-mountains.jpg`](real/sea-of-clouds-mountains.jpg)
  4. [`real/lightning-branching.jpg`](real/lightning-branching.jpg)
  5. [`real/lightning-grey-storm.jpg`](real/lightning-grey-storm.jpg)
- Blind judge `image_viewer_23` (asked 21:07, answered 21:10): **(d) amateur generated art**, so it fails. Weakest part: The lightning bolt looks pasted on: it crosses in front of the spires and fizzles into small arcs on the rock face, yet casts no matching light on the peaks or clouds, which are lit by a soft, unrelated source from the front. The repeated, near-identical spires with uniformly over-sharpened rock texture add to the generated look.
- Checked by eye against the brief: Failed by its judge. The bolt is a vertical strike in front of the peaks, not lightning crawling along the ridge, and the peaks are needles.
- Prompt ([`prompts/05-spine-take4.txt`](prompts/05-spine-take4.txt)):

```text
A single frame from a live-action fantasy feature film, shot on location with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a mountain ridge above a sea of cloud in a thunderstorm at dusk. The camera is level with the crest of the ridge, as if standing on one of its peaks with a 35 mm lens, looking straight down the length of the ridge as it runs away in a long, gentle S-curve to the horizon. The ridge is a single line of peaks, evenly spaced and all nearly the same size and shape. Each peak is a blocky mass of pale grey-white rock with one tall central fin on top and a lower buttress jutting out on each side, and between each peak and the next is the same deep, narrow notch. The repetition is regular enough to be unsettling, but no two peaks are copies: each differs a little in height, in its cracks and in its snow. These are clearly real mountains: fractured, frost-shattered rock, ledges, scree chutes, dark staining, old snow and ice in the gullies. The nearest peak is close and large in the right half of the frame, and the line of matching peaks recedes behind it, each one smaller and bluer in the haze, at least fifteen of them before they vanish. On both sides the ridge drops steeply into an unbroken sea of dark grey cloud that fills everything below; no valley or ground is visible. Above hangs a second, higher ceiling of storm cloud.

WHAT IS MOVING: lightning crawls along the ridge. One thick, bright, branching blue-white bolt comes out of the storm cloud, strikes the fin of the third peak and runs on sideways along the crest from peak to peak. It is a real light source: its flash lights the inside of the storm cloud above it, throws hard cold light on the near faces of the peaks beside it, puts the peaks in front of it into silhouette and glows through the cloud sea below the strike. A second, fainter flash glows inside the cloud sea far along the ridge. The cloud sea rolls slowly and spills through the notches like water over a weir. Snow blows off the crests in thin plumes.

There is no fire, no orange glow and no drifting embers anywhere in this frame. The only light besides the dull dusk sky is the lightning.

REFERENCE IMAGES: image 1 is a finished frame from the same film: use it only for colour grade, contrast, haze, grain and darkness, and copy nothing else from it: no canyon, no arches, no orange glow, no embers. Image 2 is a real serrated ridge of similar spires: use it for the true rock structure of a row of matching peaks. Image 3 shows real peaks above a sea of cloud: use it for the cloud sea and the way peaks stand out of it. Image 4 is real lightning: use it for the colour and branching of the bolt. Image 5 is a real storm over a ridge: use it for the grey storm sky. Ignore the blue skies and green trees in these photographs.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 05-spine take 5: [`05-spine-take5.jpg`](05-spine-take5.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Rework of take 3: same frame, lightning replaced by a real strike, far peaks made into the same kind of mountain as the near ones.
- Made: started 21:05, generation took 114 s.
- Reference images, in the order passed (image 1 first):
  1. [`05-spine-take3.jpg`](05-spine-take3.jpg)
  2. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  3. [`real/lightning-branching.jpg`](real/lightning-branching.jpg)
- Blind judge `image_viewer_22` (asked 21:07, answered 21:10): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The lightning: it hangs as a thin horizontal web in mid-air, not clearly originating from the clouds or striking anything, and it casts no light on the nearby spires or cloud deck, so it reads as an overlay. The distant row of near-identical, evenly spaced spires behind it also looks copy-pasted like a comb.
- Checked by eye against the brief: The rework changed almost nothing: it is take 3 again with the same thin lightning and the same row of far cones.
- Prompt ([`prompts/05-spine-take5.txt`](prompts/05-spine-take5.txt)):

```text
Rework image 1, which is a frame from a live-action fantasy feature film: a ridge of pale rock peaks above a sea of cloud in a storm. Keep its camera position, lens, composition, the peaks in the foreground and middle distance, the cloud sea, the storm sky, colour grade, contrast, darkness and film grain exactly as they are. Change only two things.

The lightning: in image 1 it is a thin web that lights nothing. Replace it with one real strike. A thick, bright, branching blue-white bolt comes out of the storm cloud, hits the top of a peak in the middle distance and crawls on sideways along the crest from peak to peak. It is a real light source: its flash lights the inside of the storm cloud above it, throws hard cold light on the near faces of the peaks beside it, puts the peaks in front of it into silhouette and glows through the cloud sea below the strike. Image 3 is real lightning: use it for the brightness, colour and branching of the bolt.

The far end of the ridge: in image 1 the distant peaks are a row of identical little cones that look copied. Make them the same kind of mountain as the near ones, each a blocky peak with one tall central fin and a lower buttress on each side, evenly spaced with the same deep notch between them, but no two exactly alike, growing smaller and bluer in the haze until the ridge is lost in cloud.

Image 2 is another finished frame from the same film: use it only to keep the same colour grade, haze and grain, and copy nothing else from it.

The result must look like a real photograph of a real place taken for a top-budget live-action film: a thunderstorm at dusk, ash grey, bone white and cold slate blue. No fire, no orange glow, no embers. No people, no buildings, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

### The Eye (`06-eye`)

Brief: A perfectly round, dead still lake in a deep socket-like crater, glowing faintly from below, reflecting nothing. Camera high, looking down at an angle.

Kept: take 4. Takes 2 to 5 passed. Take 4 reads as a real crater lake at a large scale, with a broken rock rim and a dim glow that has no bright spot, so it is the least literal. Faults still in it: Glow looks airbrushed; near rim at lower right is soft. Finished 21:10 (0h31m).

#### 06-eye take 1: [`06-eye-take1.jpg`](06-eye-take1.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Main prompt: looking down at about 50 degrees with a strip of plateau and horizon.
- Made: started 20:58, generation took 123 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/crater-viti-askja.jpg`](real/crater-viti-askja.jpg)
  3. [`real/crater-okama-zao.jpg`](real/crater-okama-zao.jpg)
  4. [`real/crater-lake-aerial-snow.jpg`](real/crater-lake-aerial-snow.jpg)
- Blind judge `image_viewer_14` (asked 21:00, answered 21:02): **(d) amateur generated art**, so it fails. Weakest part: The crater rim reads as a smooth, doughy rolled tube of marble-like material with no believable geology or scale cues, so it's unclear whether it is metres or kilometres wide. The stray orange ember specks at lower right and the unmotivated glow in the water add to the generated look.
- Checked by eye against the brief: Failed by its judge. The rim is a smooth white tube and embers were carried over from the anchor.
- Prompt ([`prompts/06-eye-take1.txt`](prompts/06-eye-take1.txt)):

```text
A single frame from a live-action fantasy feature film, shot from a helicopter with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a deep crater with a lake at the bottom, seen from high above, looking down at about 50 degrees, with a strip of the surrounding ash plateau and the overcast horizon along the top of the frame. The crater is a deep, steep-sided, bowl-shaped pit more than a mile across. Its rim is a thick, rounded, overhanging brow of pale bone-white rock. Below the rim the walls curve inward and down in smooth concentric layers and ledges of grey and white rock, streaked with dark runoff and fans of scree, like a socket worn into the ground. At the bottom lies a perfectly circular lake that fills the floor of the pit from wall to wall. The water is absolutely still, without a single ripple, and nearly black, like polished obsidian. It reflects nothing: neither the sky nor the crater walls. From deep under the centre of the lake comes a faint, cold, pale blue-white glow, soft and diffuse, brightest in the middle and fading toward the shore, as if something far below were lit. A narrow ring of pale mineral crust and ice runs around the shoreline.

WHAT IS MOVING: thin mist slides over the rim and drains slowly down the crater walls toward the water, stopping just short of the surface. Ash blows across the plateau above the rim. The glow under the water slowly brightens and dims. The water itself does not move at all.

It must read as a real crater lake, strange and menacing, and not as a drawing of an eye: no iris pattern, no pupil, no eyelids, no lashes.

REFERENCE IMAGES: image 1 is a finished frame from the same film: match its colour grade, contrast, haze, grain and darkness exactly so the two frames cut together, but do not copy its canyon or its arches. Image 2 is a real crater with a milky lake deep inside it: use it for the steep walls and the way a lake sits at the bottom of a pit. Image 3 is a real round crater lake: use it for the layered grey walls and the round shoreline. Image 4 is a real crater lake from the air: use it for the camera height and angle. Ignore the blue skies, the bright water colours and the vegetation in these photographs.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 06-eye take 2: [`06-eye-take2.jpg`](06-eye-take2.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Variant: steeper view at about 60 degrees, lake small and deep in the pit, fog spilling over the far rim.
- Made: started 20:58, generation took 110 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/crater-viti-askja.jpg`](real/crater-viti-askja.jpg)
  3. [`real/crater-okama-zao.jpg`](real/crater-okama-zao.jpg)
  4. [`real/crater-lake-aerial-snow.jpg`](real/crater-lake-aerial-snow.jpg)
- Blind judge `image_viewer_06` (asked 21:00, answered 21:02): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The crater rim reads as soft, doughy, melted-looking rock with no clear scale cue, and the glow at the centre of the pool is a vague, sourceless blob rather than a motivated light.
- Checked by eye against the brief: Deep pit, layered walls, round black lake that reflects nothing. Faults: the white rim is smooth and doughy, and the glow is a bright spot that makes the lake look like a pupil, which is too literal.
- Prompt ([`prompts/06-eye-take2.txt`](prompts/06-eye-take2.txt)):

```text
A single frame from a live-action fantasy feature film, shot from a helicopter with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a deep crater with a lake at the bottom, seen from high above, looking down steeply at about 60 degrees, so the crater fills most of the frame and only a thin strip of the surrounding ash plateau and dark horizon shows along the top. The crater is a deep, steep-sided, bowl-shaped pit more than a mile across. Its rim is a thick, rounded, overhanging brow of pale bone-white rock. Below the rim the walls curve inward and down in smooth concentric layers and ledges of grey and white rock, streaked with dark runoff and fans of scree, like a socket worn into the ground. Far down at the bottom, small in the depth of the pit, lies a perfectly circular lake that fills the floor from wall to wall. The walls above it are several times taller than the lake is wide. The water is absolutely still, without a single ripple, and nearly black, like polished obsidian. It reflects nothing: neither the sky nor the crater walls. From deep under the centre of the lake comes a faint, cold, pale blue-white glow, soft and diffuse, brightest in the middle and fading toward the shore, as if something far below were lit. A narrow ring of pale mineral crust and ice runs around the shoreline.

WHAT IS MOVING: a bank of fog spills over the far rim and drains slowly down the crater walls toward the water, stopping just short of the surface. Old snow and grey ash lie in streaks on the ledges. Ash blows across the plateau above the rim. The glow under the water slowly brightens and dims. The water itself does not move at all.

It must read as a real crater lake, strange and menacing, and not as a drawing of an eye: no iris pattern, no pupil, no eyelids, no lashes.

REFERENCE IMAGES: image 1 is a finished frame from the same film: match its colour grade, contrast, haze, grain and darkness exactly so the two frames cut together, but do not copy its canyon or its arches. Image 2 is a real crater with a milky lake deep inside it: use it for the steep walls and the way a lake sits at the bottom of a pit. Image 3 is a real round crater lake: use it for the layered grey walls and the round shoreline. Image 4 is a real crater lake from the air: use it for the camera height and angle. Ignore the blue skies, the bright water colours and the vegetation in these photographs.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 06-eye take 3: [`06-eye-take3.jpg`](06-eye-take3.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Second roll of the take 1 prompt.
- Made: started 20:58, generation took 125 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/crater-viti-askja.jpg`](real/crater-viti-askja.jpg)
  3. [`real/crater-okama-zao.jpg`](real/crater-okama-zao.jpg)
  4. [`real/crater-lake-aerial-snow.jpg`](real/crater-lake-aerial-snow.jpg)
- Blind judge `image_viewer_16` (asked 21:00, answered 21:02): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The white crater rim reads as soft, melted wax or frosting rather than rock or ice, with smeared, low-frequency detail that undermines the sense of scale. The distant orange fires on the horizon are also small, blurry smudges that feel pasted in rather than integrated.
- Checked by eye against the brief: Same faults as take 2: smooth waxy rim and a bright spot in the lake, plus fires on the horizon copied from the anchor.
- Prompt ([`prompts/06-eye-take3.txt`](prompts/06-eye-take3.txt)):

```text
A single frame from a live-action fantasy feature film, shot from a helicopter with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a deep crater with a lake at the bottom, seen from high above, looking down at about 50 degrees, with a strip of the surrounding ash plateau and the overcast horizon along the top of the frame. The crater is a deep, steep-sided, bowl-shaped pit more than a mile across. Its rim is a thick, rounded, overhanging brow of pale bone-white rock. Below the rim the walls curve inward and down in smooth concentric layers and ledges of grey and white rock, streaked with dark runoff and fans of scree, like a socket worn into the ground. At the bottom lies a perfectly circular lake that fills the floor of the pit from wall to wall. The water is absolutely still, without a single ripple, and nearly black, like polished obsidian. It reflects nothing: neither the sky nor the crater walls. From deep under the centre of the lake comes a faint, cold, pale blue-white glow, soft and diffuse, brightest in the middle and fading toward the shore, as if something far below were lit. A narrow ring of pale mineral crust and ice runs around the shoreline.

WHAT IS MOVING: thin mist slides over the rim and drains slowly down the crater walls toward the water, stopping just short of the surface. Ash blows across the plateau above the rim. The glow under the water slowly brightens and dims. The water itself does not move at all.

It must read as a real crater lake, strange and menacing, and not as a drawing of an eye: no iris pattern, no pupil, no eyelids, no lashes.

REFERENCE IMAGES: image 1 is a finished frame from the same film: match its colour grade, contrast, haze, grain and darkness exactly so the two frames cut together, but do not copy its canyon or its arches. Image 2 is a real crater with a milky lake deep inside it: use it for the steep walls and the way a lake sits at the bottom of a pit. Image 3 is a real round crater lake: use it for the layered grey walls and the round shoreline. Image 4 is a real crater lake from the air: use it for the camera height and angle. Ignore the blue skies, the bright water colours and the vegetation in these photographs.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 06-eye take 4: [`06-eye-take4.jpg`](06-eye-take4.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Remake of the failed take 1: rim described as jagged fractured rock, glow as a wide dim luminescence with no bright spot, no embers.
- Made: started 21:05, generation took 131 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`real/crater-viti-askja.jpg`](real/crater-viti-askja.jpg)
  3. [`real/crater-okama-zao.jpg`](real/crater-okama-zao.jpg)
  4. [`real/crater-lake-aerial-snow.jpg`](real/crater-lake-aerial-snow.jpg)
- Blind judge `image_viewer_26` (asked 21:07, answered 21:10): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The soft blue glow in the centre of the crater lake reads as an airbrushed, unmotivated light patch rather than a real reflection or depth cue, and the foreground rim at the lower right smears into mushy, low-detail rock and snow.
- Checked by eye against the brief: Meets the brief: jagged real rock rim, steep layered walls, round black lake that reflects nothing, and a wide dim glow with no bright spot, so it reads as a crater lake and not a drawn eye. The plateau and horizon give it scale. Faults: the glow looks airbrushed; the near rim at lower right is soft.
- Prompt ([`prompts/06-eye-take4.txt`](prompts/06-eye-take4.txt)):

```text
A single frame from a live-action fantasy feature film, shot from a helicopter with a large-format digital cinema camera. Photographed, not painted.

THE PLACE: a deep crater with a lake at the bottom, seen from high above, looking down at about 50 degrees, with a strip of the surrounding ash plateau and the overcast horizon along the top of the frame. The crater is a deep, steep-sided pit more than a mile across, sunk into a plateau of grey ash and dirty snow. Its rim is a broken ring of real rock: jagged, fractured cliffs of pale grey-white stone with sharp edges, ledges, overhangs, cracks, rockfall scars and rubble, dusted with ash and old snow. It is hard, angular, weathered geology, never smooth, rounded, soft or melted. Below the rim the walls drop steeply in concentric layers and terraces of grey and white rock, streaked with dark runoff and fans of scree, so that the whole pit has the shape of a socket. Boulders the size of houses lie on the terraces and look like grains of sand from here. At the bottom lies a perfectly circular lake that fills the floor of the pit from wall to wall. The water is absolutely still, without a single ripple, and nearly black, like polished obsidian. It reflects nothing: neither the sky nor the crater walls. Deep inside the water there is a faint, cold, blue-grey luminescence: a wide, soft, even glow that fills the middle of the lake and fades toward the shore, as dim as moonlight through fog. It has no bright spot, no point of light and no rays. A narrow ring of pale mineral crust and ice runs around the shoreline.

WHAT IS MOVING: thin mist slides over the rim and drains slowly down the crater walls toward the water, stopping just short of the surface. Ash blows across the plateau above the rim. The glow in the water slowly brightens and dims. The water itself does not move at all.

It must read as a real crater lake, strange and menacing, and not as a drawing of an eye: no iris pattern, no pupil, no highlight, no eyelids, no lashes. There is no fire, no orange glow and no embers anywhere in this frame.

REFERENCE IMAGES: image 1 is a finished frame from the same film: use it only for colour grade, contrast, haze, grain and darkness, and copy nothing else from it: no canyon, no arches, no orange glow. Image 2 is a real crater with a milky lake deep inside it: use it for the steep, broken walls and the way a lake sits at the bottom of a pit. Image 3 is a real round crater lake: use it for the layered grey walls and the round shoreline. Image 4 is a real crater lake from the air: use it for the camera height and angle. Ignore the blue skies, the bright water colours and the vegetation in these photographs.

LIGHT AND COLOUR: heavy overcast at dusk. Flat, cold, directionless light, no sun and no blue sky. The palette is ash grey, bone white and cold slate blue; ember orange and blood red are the only saturated colours and they cover only a small part of the frame. Natural contrast with deep but readable shadows, haze that thickens with distance, fine film grain, a slight vignette, weathered detail at every scale. The place is enormous, hostile and dead, never pretty or inviting.

It must look like a real photograph of a real place taken for a top-budget live-action film. No people, no buildings, no roads, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

#### 06-eye take 5: [`06-eye-take5.jpg`](06-eye-take5.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Rework of take 2: same frame, the smooth rim turned into broken rock and the bright spot in the lake replaced by a dim even glow.
- Made: started 21:05, generation took 105 s.
- Reference images, in the order passed (image 1 first):
  1. [`06-eye-take2.jpg`](06-eye-take2.jpg)
  2. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  3. [`real/crater-viti-askja.jpg`](real/crater-viti-askja.jpg)
- Blind judge `image_viewer_21` (asked 21:07, answered 21:10): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The soft blue glow in the centre of the crater lake looks painted on and unmotivated, since it does not match a reflection of the overcast sky above. The scene also has no scale reference, so the rock detail reads ambiguously between boulders and cliffs.
- Checked by eye against the brief: The rework fixed the rim, and the pit is deeper and the sky darker than take 4. Faults: the glow still has a brighter core, so the lake reads more like a pupil, and the big rocks along the bottom make the scale unclear.
- Prompt ([`prompts/06-eye-take5.txt`](prompts/06-eye-take5.txt)):

```text
Rework image 1, which is a frame from a live-action fantasy feature film: a deep crater with a round black lake at the bottom, seen from the air. Keep its camera position, lens, composition, the depth of the pit, the layered crater walls, the round lake and its pale shoreline, the mist, the storm sky, colour grade, contrast, darkness and film grain exactly as they are. Change only two things.

The rim: in image 1 the white rim around the crater is smooth, rounded and soft, like dough or melted wax. Turn it into real rock: a broken ring of jagged, fractured cliffs of pale grey-white stone with sharp edges, ledges, overhangs, cracks, rockfall scars and rubble, dusted with grey ash and old snow, with scree running down from it into the pit. It is hard, angular, weathered geology at a huge scale, and boulders the size of houses lie along it like grains of sand. Image 3 is a real crater: use it for the look of real broken crater walls.

The glow: in image 1 the lake has a bright spot of light in its centre. Remove the bright spot. Instead there is only a faint, cold, blue-grey luminescence deep inside the water: a wide, soft, even glow that fills the middle of the lake and fades toward the shore, as dim as moonlight through fog, with no point of light and no rays. The water stays black, perfectly still and reflects nothing.

Image 2 is another finished frame from the same film: use it only to keep the same colour grade, haze and grain, and copy nothing else from it.

The result must look like a real photograph of a real place taken for a top-budget live-action film: heavy overcast at dusk, flat cold light, ash grey, bone white and cold slate blue. No fire, no orange glow, no embers. It must not look like a drawing of an eye. No people, no buildings, no text, no logos, no watermark, no border. Not a painting, illustration, concept art, matte painting or video game screenshot. Wide 16:9 frame.
```

### The Reveal (`07-reveal`)

Brief: Very high aerial view of the whole continent in a dark sea, cloud drifting over it. From here it is unmistakably the body of a fallen titan lying on its side, with the ribs, the glowing heart, the spine and the eye all visible as the places from shots 1 to 6.

Kept: take 1. Limit of five takes reached. Take 1 is the only take that passed its blind judge, and it shows the body most clearly, with all six places where they belong. Take 5 is less literal (no second socket, teeth, fingers or toes) but failed its judge on the ice field and reads less clearly as a body. Take 4 is almost the same picture as take 1 and failed with a different judge, so this pass is a narrow one. Faults still in it: Weakest frame of the set. Too literal in places: a skull with a second socket and teeth, a carved hand and foot. The ice field is a spray of a few oversized spikes. Scale cues conflict: the curve of the planet says continent, while the arches, clouds and ice say something smaller. The hip and limbs on the right are lumpy and hard to read. Finished 21:25 (0h46m).

#### 07-reveal take 1: [`07-reveal-take1.jpg`](07-reveal-take1.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Steep oblique view from the edge of space with the horizon in frame. Body described in words only: head at left, back along the top, legs trailing into islands at right. The six kept frames plus three photographs from orbit as references.
- Made: started 21:09, generation took 163 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`02-heart-take3.jpg`](02-heart-take3.jpg)
  3. [`05-spine-take3.jpg`](05-spine-take3.jpg)
  4. [`06-eye-take4.jpg`](06-eye-take4.jpg)
  5. [`03-breath-take5.jpg`](03-breath-take5.jpg)
  6. [`04-blood-marsh-take4.jpg`](04-blood-marsh-take4.jpg)
  7. [`real/satellite-south-georgia.jpg`](real/satellite-south-georgia.jpg)
  8. [`real/orbital-oblique-snowy-ranges.jpg`](real/orbital-oblique-snowy-ranges.jpg)
  9. [`real/satellite-iceland-winter.jpg`](real/satellite-iceland-winter.jpg)
- Blind judge `image_viewer_29` (asked 21:13, answered 21:15): **(a) a frame from a top-budget film or AAA game cinematic**, so it passes. Weakest part: The anatomy of the colossal skeleton-island falls apart away from the ribcage: the limbs and pelvis on the right melt into ambiguous lumpy landforms, and the spray of ice shards under the skull reads as a pasted-on crystal cluster. The scale cues also conflict, with clouds and ice floes sized inconsistently against the planetary curvature.
- Checked by eye against the brief: The body cannot be missed and all six places are on it where they belong: crater lake in the head, ice from the mouth, arches across the chest, caldera with lava channels and ash plume, red marsh, ridge of peaks with storm and lightning. But it is too literal: a clean skull with a nose hole and teeth, a carved hand with fingers, smooth stone legs. It reads as a giant statue of a skeleton, not as a land. The ice is a spray of a few huge spikes.
- Prompt ([`prompts/07-reveal-take1.txt`](prompts/07-reveal-take1.txt)):

```text
A single frame from a live-action fantasy feature film: its final wide shot. A very high aerial view, from the edge of space, looking down at a steep angle on a whole continent that lies alone in a dark, cold sea. It is photographed like real high-altitude and satellite imagery, not painted.

THE CONTINENT: one long landmass with the outline of a colossal giant, a titan, that fell here ages ago and now lies on its side, turned to rock, ash, ice and mountains. From this height the shape cannot be mistaken: the head at the left end of the frame, the neck, the heavy shoulder and the barrel of the chest, one arm lying in front of the body, the narrow waist, the hip, and the legs bent at the knee and trailing away at the right end into a chain of islands. The titan faces the bottom of the frame and its back is toward the top. Yet every part of it is real terrain seen from orbit: coastlines with surf, fjords, bays, river valleys, ash plains, lava fields, snowfields and glaciers. Nothing is skin, flesh, cloth or carved stone, and the head has no face, only terrain.

THE PLACES, all visible from here, each in its right position on the body:
- The Eye: in the head, where the eye socket would be, one deep round crater holding a small black lake with a faint pale blue glow. It is the crater of image 4.
- The Breath: from the mouth, a white glacier field of ice spires fans out to the sea, combed in one direction as if breathed out. It is the ice field of image 5.
- The Spine: along the back, on the top edge of the landmass, a long mountain ridge of evenly spaced pale peaks runs from the neck to the hip like a backbone, with storm cloud piled against it and one flicker of lightning. It is the ridge of image 3.
- The Ribs: across the chest, a row of colossal curved white rock arches stands half buried in dark rock, one behind another, sweeping down from the ridge like a rib cage, with a canyon between them. They are the arches of image 1.
- The Heart: inside the chest, among the arches, a volcanic caldera glows ember orange, with four small lava lakes and dark channels running out across the land like veins. It is the caldera of image 2.
- The Blood Marsh: in the hollow of the belly, a low marsh of rust-red water spreads to the coast under fog. It is the marsh of image 6.

WHAT IS MOVING: broken layers of cloud and long cloud streets drift across the continent, hiding parts of it and laying soft shadows on it. A grey ash plume trails downwind from the caldera. Snow blows off the ridge. White surf lines the coasts, and the black sea is streaked with whitecaps and drifting sea ice.

LIGHT AND COLOUR: dusk under high overcast, cold flat light. Ash grey, bone white and cold slate blue, with the ember-orange caldera and the rust-red marsh as the only strong colours. The curve of the horizon and a thin band of atmosphere show along the top of the frame. Fine film grain, natural contrast, real atmospheric haze.

REFERENCE IMAGES: images 1 to 6 are finished frames from the same film and show the six places at ground level. Build each of them into the continent, small, in the position given above, and match their colour grade. Image 7 is a real satellite photograph of a long snowy island in a dark sea: use it for how real coastlines, glaciers, surf and sea look from orbit. Image 8 is a real photograph taken from orbit: use it for the oblique camera angle, the haze and the curve of the horizon. Image 9 is a real satellite photograph of an island in winter with cloud: use it for real cloud drifting over land.

It must look like a real photograph of a real place. No people, no buildings, no text, no labels, no logos, no watermark, no border. Not a painting, illustration, concept art, map, diagram or video game screenshot. Wide 16:9 frame.
```

#### 07-reveal take 2: [`07-reveal-take2.jpg`](07-reveal-take2.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Same content seen almost straight down, like a satellite frame, with the body curled like a sleeper so it fills the frame.
- Made: started 21:09, generation took 165 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`02-heart-take3.jpg`](02-heart-take3.jpg)
  3. [`05-spine-take3.jpg`](05-spine-take3.jpg)
  4. [`06-eye-take4.jpg`](06-eye-take4.jpg)
  5. [`03-breath-take5.jpg`](03-breath-take5.jpg)
  6. [`04-blood-marsh-take4.jpg`](04-blood-marsh-take4.jpg)
  7. [`real/satellite-south-georgia.jpg`](real/satellite-south-georgia.jpg)
  8. [`real/orbital-oblique-snowy-ranges.jpg`](real/orbital-oblique-snowy-ranges.jpg)
  9. [`real/satellite-iceland-winter.jpg`](real/satellite-iceland-winter.jpg)
- Blind judge `image_viewer_30` (asked 21:13, answered 21:15): **(d) amateur generated art**, so it fails. Weakest part: The giant's anatomy does not hold together: the ear sits on top of the skull, the ribcage runs straight into a hip and leg with no pelvis or second leg, and the arm and shoulder merge ambiguously into the torso. Scale is also inconsistent, with orbital-height clouds next to surf foam and ice spikes that read far too large.
- Checked by eye against the brief: Fails the brief. It is a stone giant with a face, an ear, lips, a muscled arm and toes: cartoon-literal, and the scale reads as a statue, not a continent.
- Prompt ([`prompts/07-reveal-take2.txt`](prompts/07-reveal-take2.txt)):

```text
A single frame from a live-action fantasy feature film: its final wide shot. A satellite view from orbit, looking almost straight down on a whole continent that lies alone in a dark, cold sea and fills most of the frame. It is photographed like real high-altitude and satellite imagery, not painted.

THE CONTINENT: one long landmass with the outline of a colossal giant, a titan, that fell here ages ago and now lies on its side, turned to rock, ash, ice and mountains. From this height the shape cannot be mistaken: the head at the left end of the frame, the neck, the heavy shoulder and the barrel of the chest, one arm folded in front of the body, the narrow waist, the hip, and the legs drawn up and bent at the knee at the right end, so that the whole body is curled like a sleeper. The feet break up into a chain of islands. The titan faces the bottom of the frame and its back is toward the top. Yet every part of it is real terrain seen from orbit: coastlines with surf, fjords, bays, river valleys, ash plains, lava fields, snowfields and glaciers. Nothing is skin, flesh, cloth or carved stone, and the head has no face, only terrain.

THE PLACES, all visible from here, each in its right position on the body:
- The Eye: in the head, where the eye socket would be, one deep round crater holding a small black lake with a faint pale blue glow. It is the crater of image 4.
- The Breath: from the mouth, a white glacier field of ice spires fans out to the sea, combed in one direction as if breathed out. It is the ice field of image 5.
- The Spine: along the back, on the top edge of the landmass, a long mountain ridge of evenly spaced pale peaks runs from the neck to the hip like a backbone, with storm cloud piled against it and one flicker of lightning. It is the ridge of image 3.
- The Ribs: across the chest, a row of colossal curved white rock arches stands half buried in dark rock, one behind another, sweeping down from the ridge like a rib cage, with a canyon between them. They are the arches of image 1.
- The Heart: inside the chest, among the arches, a volcanic caldera glows ember orange, with four small lava lakes and dark channels running out across the land like veins. It is the caldera of image 2.
- The Blood Marsh: in the hollow of the belly, a low marsh of rust-red water spreads to the coast under fog. It is the marsh of image 6.

WHAT IS MOVING: broken layers of cloud and long cloud streets drift across the continent, hiding parts of it and laying soft shadows on it. A grey ash plume trails downwind from the caldera. Snow blows off the ridge. White surf lines the coasts, and the black sea is streaked with whitecaps and drifting sea ice.

LIGHT AND COLOUR: dusk under high overcast, cold flat light. Ash grey, bone white and cold slate blue, with the ember-orange caldera and the rust-red marsh as the only strong colours. Fine film grain, natural contrast, real atmospheric haze.

REFERENCE IMAGES: images 1 to 6 are finished frames from the same film and show the six places at ground level. Build each of them into the continent, small, in the position given above, and match their colour grade. Image 7 is a real satellite photograph of a long snowy island in a dark sea: use it for how real coastlines, glaciers, surf and sea look from orbit. Image 8 is a real photograph taken from orbit: use it for the haze and the texture of snowy mountain ranges seen from space. Image 9 is a real satellite photograph of an island in winter with cloud: use it for real cloud drifting over land.

It must look like a real photograph of a real place. No people, no buildings, no text, no labels, no logos, no watermark, no border. Not a painting, illustration, concept art, map, diagram or video game screenshot. Wide 16:9 frame.
```

#### 07-reveal take 3: [`07-reveal-take3.png`](07-reveal-take3.png)

- Model: Nano Banana Pro (`nano_banana_pro`). Output 2752x1536 PNG, kept as delivered.
- What this take tried: The take 1 prompt on Nano Banana Pro, to see which model places the six places on the body more exactly.
- Made: started 21:09, generation took 29 s.
- Reference images, in the order passed (image 1 first):
  1. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  2. [`02-heart-take3.jpg`](02-heart-take3.jpg)
  3. [`05-spine-take3.jpg`](05-spine-take3.jpg)
  4. [`06-eye-take4.jpg`](06-eye-take4.jpg)
  5. [`03-breath-take5.jpg`](03-breath-take5.jpg)
  6. [`04-blood-marsh-take4.jpg`](04-blood-marsh-take4.jpg)
  7. [`real/satellite-south-georgia.jpg`](real/satellite-south-georgia.jpg)
  8. [`real/orbital-oblique-snowy-ranges.jpg`](real/orbital-oblique-snowy-ranges.jpg)
  9. [`real/satellite-iceland-winter.jpg`](real/satellite-iceland-winter.jpg)
- Blind judge `image_viewer_31` (asked 21:13, answered 21:15): **(c) a textbook picture**, so it fails. Weakest part: The scale is incoherent: the island sits under a planetary horizon as if seen from orbit, yet its crater lake, lava streams, smoke plumes, lightning and icebergs are sized like a low aerial view. The numbered callouts 1-6 also have no leader lines or key, and some (3 in the cloud, 5 in the water) do not clearly point at any feature.
- Checked by eye against the brief: Fails the brief. The model drew the numbers 1 to 6 on the picture, taken from the way the prompt numbers the reference images, and the land reads as a volcanic island, not a body.
- Prompt ([`prompts/07-reveal-take3.txt`](prompts/07-reveal-take3.txt)):

```text
A single frame from a live-action fantasy feature film: its final wide shot. A very high aerial view, from the edge of space, looking down at a steep angle on a whole continent that lies alone in a dark, cold sea. It is photographed like real high-altitude and satellite imagery, not painted.

THE CONTINENT: one long landmass with the outline of a colossal giant, a titan, that fell here ages ago and now lies on its side, turned to rock, ash, ice and mountains. From this height the shape cannot be mistaken: the head at the left end of the frame, the neck, the heavy shoulder and the barrel of the chest, one arm lying in front of the body, the narrow waist, the hip, and the legs bent at the knee and trailing away at the right end into a chain of islands. The titan faces the bottom of the frame and its back is toward the top. Yet every part of it is real terrain seen from orbit: coastlines with surf, fjords, bays, river valleys, ash plains, lava fields, snowfields and glaciers. Nothing is skin, flesh, cloth or carved stone, and the head has no face, only terrain.

THE PLACES, all visible from here, each in its right position on the body:
- The Eye: in the head, where the eye socket would be, one deep round crater holding a small black lake with a faint pale blue glow. It is the crater of image 4.
- The Breath: from the mouth, a white glacier field of ice spires fans out to the sea, combed in one direction as if breathed out. It is the ice field of image 5.
- The Spine: along the back, on the top edge of the landmass, a long mountain ridge of evenly spaced pale peaks runs from the neck to the hip like a backbone, with storm cloud piled against it and one flicker of lightning. It is the ridge of image 3.
- The Ribs: across the chest, a row of colossal curved white rock arches stands half buried in dark rock, one behind another, sweeping down from the ridge like a rib cage, with a canyon between them. They are the arches of image 1.
- The Heart: inside the chest, among the arches, a volcanic caldera glows ember orange, with four small lava lakes and dark channels running out across the land like veins. It is the caldera of image 2.
- The Blood Marsh: in the hollow of the belly, a low marsh of rust-red water spreads to the coast under fog. It is the marsh of image 6.

WHAT IS MOVING: broken layers of cloud and long cloud streets drift across the continent, hiding parts of it and laying soft shadows on it. A grey ash plume trails downwind from the caldera. Snow blows off the ridge. White surf lines the coasts, and the black sea is streaked with whitecaps and drifting sea ice.

LIGHT AND COLOUR: dusk under high overcast, cold flat light. Ash grey, bone white and cold slate blue, with the ember-orange caldera and the rust-red marsh as the only strong colours. The curve of the horizon and a thin band of atmosphere show along the top of the frame. Fine film grain, natural contrast, real atmospheric haze.

REFERENCE IMAGES: images 1 to 6 are finished frames from the same film and show the six places at ground level. Build each of them into the continent, small, in the position given above, and match their colour grade. Image 7 is a real satellite photograph of a long snowy island in a dark sea: use it for how real coastlines, glaciers, surf and sea look from orbit. Image 8 is a real photograph taken from orbit: use it for the oblique camera angle, the haze and the curve of the horizon. Image 9 is a real satellite photograph of an island in winter with cloud: use it for real cloud drifting over land.

It must look like a real photograph of a real place. No people, no buildings, no text, no labels, no logos, no watermark, no border. Not a painting, illustration, concept art, map, diagram or video game screenshot. Wide 16:9 frame.
```

#### 07-reveal take 4: [`07-reveal-take4.png`](07-reveal-take4.png)

- Model: Nano Banana Pro (`nano_banana_pro`). Output 2752x1536 PNG, kept as delivered.
- What this take tried: Rework of take 1 on Nano Banana Pro: keep the camera and where every place is, but turn the statue-like body into real geography (domed massif for the head, mountain ranges for the limbs, peninsulas for the hand, weathered arches, a real glacier field, a broken coastline). No numbers or labels.
- Made: started 21:15, generation took 27 s.
- Reference images, in the order passed (image 1 first):
  1. [`07-reveal-take1.jpg`](07-reveal-take1.jpg)
  2. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  3. [`real/satellite-south-georgia.jpg`](real/satellite-south-georgia.jpg)
  4. [`real/satellite-iceland-winter.jpg`](real/satellite-iceland-winter.jpg)
- Blind judge `image_viewer_32` (asked 21:21, answered 21:24): **(d) amateur generated art**, so it fails. Weakest part: The skull at lower left is the weakest part: its anatomy is muddled (mismatched, melted-looking eye sockets, no clear jaw) and the spray of ice shards beneath it reads like close-up crystals, breaking the continent-sized scale that the orbital view and clouds are trying to sell.
- Checked by eye against the brief: Nano Banana Pro returned take 1 almost unchanged: same skull with two sockets and teeth, same giant ice spikes, same carved hand and foot. The instruction to turn the body into real geography was not carried out. A take spent for nothing.
- Prompt ([`prompts/07-reveal-take4.txt`](prompts/07-reveal-take4.txt)):

```text
Rework the first image. It is the final wide shot of a live-action fantasy feature film: a view from the edge of space of a lone continent in a dark, cold sea, and the continent is the body of a titan that fell here ages ago and lies on its side.

KEEP: the camera, the framing, the curve of the horizon and the thin band of atmosphere, the dark sea, and every place exactly where it is now: the round crater lake in the head, the field of white ice in front of the mouth, the row of colossal curved white arches across the chest, the glowing caldera with its lava channels and its ash plume, the rust-red marsh beside it, and the ridge of pale peaks along the back with the storm and the lightning over it. The shape of the whole body must stay as easy to read as it is now.

CHANGE: the body must stop looking like a statue or a model of a skeleton. Turn it into real geography that happens to have this shape: a land hundreds of kilometres long, as a satellite would photograph it.
- The head becomes a broad domed massif of pale weathered rock, cracked, gullied and streaked with snow. Remove the nose hole, the second socket, the teeth and every carved feature. Only the dome of a skull and the one round crater with its dark, faintly glowing lake remain.
- The shoulder, the arm, the hip and the legs become long mountain ranges: sharp ridgelines, side valleys, glaciers and snowfields above a snow line, dark scree and ash plains below it. No smooth surfaces like skin or polished stone, no muscles. The hand becomes five long rocky peninsulas with surf and sea ice between them, not carved fingers. The feet break up into skerries and a chain of islands, with no toes.
- The arches across the chest stay colossal and bone white, but weathered like real rock: cracked, uneven, two of them broken and fallen, snow on their crests, their feet buried in scree and dark rock, cloud caught between them.
- The ice in front of the mouth becomes a real glacier field: thousands of fine ice spires, all leaning away from the head, breaking up into pack ice on the sea. Not a few giant spikes.
- The coast everywhere becomes an irregular real coastline: fjords, bays, river mouths, bars of black ash, lines of white surf, shelves of sea ice.
- More weather: broken cloud and long cloud streets drift across the land, hide parts of it and lay soft shadows on it. Snow blows off the ridge. The sea is streaked with whitecaps.

LIGHT AND COLOUR: dusk under high overcast, cold flat light. Ash grey, bone white and cold slate blue, with the ember-orange caldera and the rust-red marsh as the only strong colours. Fine film grain, natural contrast, real atmospheric haze.

OTHER IMAGES: the second image is a frame from the same film: match its colour grade only and copy nothing else from it. The third and fourth images are real satellite photographs: use them only for how real coastlines, mountains, snow, sea ice and cloud look from orbit.

It must look like a real photograph of a real place taken from orbit. No people, no buildings. No text, numbers, letters, labels, markers, logos, watermark or border anywhere in the picture. Not a painting, illustration, concept art, sculpture, map, diagram or video game screenshot. Wide 16:9 frame.
```

#### 07-reveal take 5: [`07-reveal-take5.jpg`](07-reveal-take5.jpg)

- Model: Seedream 5 Pro (`seedream_5`). Output 2816x1584 JPEG, kept as delivered.
- What this take tried: Last take. A new Seedream 5 Pro generation built on a layout study made from take 1 (guides/07-reveal-take5-layout.jpg): take 1 with the second socket, teeth, fingers and toes painted out, the few huge ice spikes replaced by a fan of fine streaks, the limbs roughened, then blurred and halved, so the model keeps the camera and the layout but has to make every detail again as real geography. Adds scale cues: small clouds, fine sea ice.
- Made: started 21:20, generation took 165 s.
- Reference images, in the order passed (image 1 first):
  1. [`guides/07-reveal-take5-layout.jpg`](guides/07-reveal-take5-layout.jpg)
  2. [`01-ribs-take5.jpg`](01-ribs-take5.jpg)
  3. [`02-heart-take3.jpg`](02-heart-take3.jpg)
  4. [`05-spine-take3.jpg`](05-spine-take3.jpg)
  5. [`06-eye-take4.jpg`](06-eye-take4.jpg)
  6. [`03-breath-take5.jpg`](03-breath-take5.jpg)
  7. [`04-blood-marsh-take4.jpg`](04-blood-marsh-take4.jpg)
  8. [`real/satellite-south-georgia.jpg`](real/satellite-south-georgia.jpg)
  9. [`real/satellite-iceland-winter.jpg`](real/satellite-iceland-winter.jpg)
- Blind judge `image_viewer_33` (asked 21:23, answered 21:25): **(d) amateur generated art**, so it fails. Weakest part: The white spiky crystal burst at lower left looks pasted on, with flat lighting and no clear relation to the ocean or the skull beside it. Scale is also incoherent: the ribs, lightning bolt and clouds read as mountain-sized while the planet's curvature implies a continent-sized creature.
- Checked by eye against the brief: The layout study worked in part. The head is now a plain pale dome with one crater lake; the second socket, the teeth, the fingers and the toes are gone; the leg reads more like a snowy range. But the ice came out as a separate white burst of shards floating beside the head, which looks pasted on; the dome no longer reads as a skull; the arm and the foot are harder to read as limbs. Scale cues still conflict.
- Prompt ([`prompts/07-reveal-take5.txt`](prompts/07-reveal-take5.txt)):

```text
A single frame from a live-action fantasy feature film: its final wide shot. A very high aerial view from the edge of space, looking down at a steep angle on a lone continent in a dark, cold sea. It is photographed like real high-altitude and satellite imagery, not painted.

IMAGE 1 IS THE LAYOUT. It is a rough, out-of-focus layout study of this exact shot. Make the finished frame from it: the same camera, the same curved horizon with its thin band of atmosphere, the same coastline, every landform in the same place and at the same size. The study is blurred and crude. The finished frame is pin-sharp, finely detailed and real.

WHAT THE LAND IS: the body of a titan that fell here ages ago and lies on its side, long since turned to rock, ash, ice and mountains. From this height the shape of the body cannot be mistaken: the head at the left, the chest, the arm along the near coast, the hip, and a leg bent at the knee at the right. But all of it is geography, as a satellite would photograph it. Nothing looks carved, sculpted, polished, like skin or like a statue.
- The head, at the left: a broad domed massif of pale weathered rock with the outline of a skull seen from the side, cracked, gullied and streaked with snow, with scree fans at its foot and surf along its cliffs. In it is one deep round crater holding a dead-still black lake that glows faintly pale blue from below: the crater of image 5. There are no other holes in it: no nose, no teeth, no face.
- Below the head, a white glacier field runs out into the sea like a frozen breath: thousands of fine blue-white ice spires, all leaning the same way, away from the head, as in image 6. At its edge it breaks up into pack ice.
- Across the chest, in the middle of the land: a row of colossal curved bone-white rock arches, one behind another, half buried in dark rock, as in image 2. They are weathered like real rock: cracked, uneven, snow on their crests, their feet in scree, cloud caught between them.
- Along the back, behind the arches: a mountain ridge of evenly spaced pale peaks, as in image 4, with dark storm cloud piled against it and one thin flicker of lightning.
- To the right of the arches: a volcanic caldera holding four lava lakes that glow ember orange, two brighter and two dimmer, with dark channels and thin lava rivers running out across an ash plain like veins, and a grey ash plume trailing downwind. It is the caldera of image 3.
- Below the caldera, in the hollow of the belly: a low marsh of still rust-red water under fog that reaches the coast. It is the marsh of image 7.
- The arm along the near coast and the leg at the right are long mountain ranges: knife-edged ridgelines, deep side valleys, glaciers and snowfields above the snow line, dark scree and ash plains below it. The arm ends in five long rocky capes with surf and sea ice between them. The leg bends at a knee-shaped headland and ends in a foot-shaped cape that breaks up into skerries and a chain of islands.
- The coast everywhere is a real, irregular coastline: fjords, bays, river mouths, bars of black ash, hairlines of white surf, shelves of sea ice.

SCALE: the land is hundreds of kilometres long. Clouds are small and many against it: fine cloud streets and fields of tiny cumulus far below the camera. Sea ice is a fine speckle. Rivers and glaciers are thin threads.

WHAT IS MOVING: broken cloud drifts across the continent, hides parts of it and lays soft shadows on it. The ash plume trails from the caldera. Snow blows off the ridge. The lightning flickers in the storm. The black sea is streaked with whitecaps.

LIGHT AND COLOUR: dusk under high overcast, cold flat light. Ash grey, bone white and cold slate blue, with the ember-orange caldera and the rust-red marsh as the only strong colours. Fine film grain, natural contrast, real atmospheric haze.

OTHER IMAGES: images 2 to 7 are finished frames from the same film and show the six places at ground level. Match their colour grade, above all image 2. Images 8 and 9 are real satellite photographs: use them only for how real coastlines, mountains, snow, sea ice and cloud look from orbit.

It must look like a real photograph of a real place. No people, no buildings. No text, numbers, letters, labels, markers, logos, watermark or border. Not a painting, illustration, concept art, sculpture, map, diagram or video game screenshot. Wide 16:9 frame.
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
| [`real/eruption-litli-hrutur-crater.jpg`](real/eruption-litli-hrutur-crater.jpg) | Litli-Hrútur eruption 2023, Iceland: lava lake in the crater from the air | Giles Laurent | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:001_Volcano_eruption_of_Litli-Hr%C3%BAtur_in_Iceland_in_2023_Photo_by_Giles_Laurent.jpg) |
| [`real/eruption-litli-hrutur-lava-river.jpg`](real/eruption-litli-hrutur-lava-river.jpg) | Litli-Hrútur eruption 2023, Iceland: lava river at dusk from the air | Anthony Quintano from Mount Laurel, United States | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Litli-Hr%C3%BAtur_-_Volcanic_Eruption_in_Iceland_July_2023_(53063590233).jpg) |
| [`real/caldera-halemaumau-oblique.jpg`](real/caldera-halemaumau-oblique.jpg) | Halemaʻumaʻu crater, Hawaii: oblique aerial view of the caldera floor | Alan Light https://www.flickr.com/people/alan-light/ | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Halemaumau_Crater_in_Hawaii_-_Oblique_aerial_view_20140112.jpg) |
| [`real/eruption-grindavik-lava-field.jpg`](real/eruption-grindavik-lava-field.jpg) | Grindavík (Sundhnúkur) eruption 2023, Iceland: fissure and crusted lava field | Halldór Björnsson / Icelandic Meteorological Office | Attribution | [Commons page](https://commons.wikimedia.org/wiki/File:2023_Grindavik_eruption.jpg) |
| [`real/penitentes-ice-spires.jpg`](real/penitentes-ice-spires.jpg) | Penitentes: a field of leaning ice blades, Chajnantor, Chile | ESO | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Penitentes_Ice_Formations.png) |
| [`real/seracs-kennicott-glacier.jpg`](real/seracs-kennicott-glacier.jpg) | Seracs on the Kennicott Glacier, Alaska: dirty banded ice blades | National Park Service, Alaska Region | Public domain | [Commons page](https://commons.wikimedia.org/wiki/File:Seracs_on_the_Kennicott_Glacier_(26156288728).jpg) |
| [`real/glacier-matanuska-blue-ice.jpg`](real/glacier-matanuska-blue-ice.jpg) | Matanuska Glacier mouth, Alaska: blue ice pinnacles | Sbork | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Matanuska_Glacier_mouth.jpg) |
| [`real/marsh-fog-reeds-abant.jpg`](real/marsh-fog-reeds-abant.jpg) | Lake Abant, Turkey: fog rolling over water and dark reeds | Linda M Caldwell | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:View_of_Abant_Lake_03.jpg) |
| [`real/rio-tinto-red-water.jpg`](real/rio-tinto-red-water.jpg) | Río Tinto, Spain: naturally rust-red, iron-rich water | LBM1948 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:R%C3%ADo_Tinto,_Los_Frailes_11.jpg) |
| [`real/reeds-and-fog.jpg`](real/reeds-and-fog.jpg) | Reed beds in heavy fog | Ed Dunens | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Reeds_and_Fog_(52293696894).jpg) |
| [`real/ridge-minarets-ritter-range.jpg`](real/ridge-minarets-ritter-range.jpg) | The Minarets and Ritter Range, California: a serrated ridge of similar spires | Marty B | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [Commons page](https://commons.wikimedia.org/wiki/File:View_of_the_Minarets,_Mt_Ritter,_and_Banner_Peak_from_Mammoth_Mountain.jpg) |
| [`real/sea-of-clouds-mountains.jpg`](real/sea-of-clouds-mountains.jpg) | Snowy peaks standing out of a sea of cloud, from the air | julian mora julivajuli | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | [Commons page](https://commons.wikimedia.org/wiki/File:Sea_of_clouds_behind_mountains_(Unsplash).jpg) |
| [`real/lightning-grey-storm.jpg`](real/lightning-grey-storm.jpg) | Lightning striking a ridge under a grey storm sky | Ken | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Lightning_over_Short_Hill_Mountain.jpg) |
| [`real/lightning-branching.jpg`](real/lightning-branching.jpg) | Branching cloud-to-ground and crawling lightning over a mountain | Top Ten Alternatives | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Commons page](https://commons.wikimedia.org/wiki/File:White_Lightning_Heating_Mountain.jpg) |
| [`real/crater-viti-askja.jpg`](real/crater-viti-askja.jpg) | Víti crater, Askja, Iceland: milky lake deep in a steep crater | Areuland | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Viti_(Askja).jpg) |
| [`real/crater-okama-zao.jpg`](real/crater-okama-zao.jpg) | Okama crater, Mount Zaō, Japan: round lake in a grey layered crater | Jun K | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [Commons page](https://commons.wikimedia.org/wiki/File:Okama_Crater_(10205258106).jpg) |
| [`real/crater-lake-aerial-snow.jpg`](real/crater-lake-aerial-snow.jpg) | Crater Lake, Oregon, from the air in snow | not stated | Public domain | [Commons page](https://commons.wikimedia.org/wiki/File:Aerial_Crater_Lake.jpg) |
| [`real/satellite-south-georgia.jpg`](real/satellite-south-georgia.jpg) | South Georgia Island from Sentinel-2: a long snowy landmass in a dark sea | European Space Agency | [CC BY-SA 3.0 igo](https://creativecommons.org/licenses/by-sa/3.0/igo/deed.en) | [Commons page](https://commons.wikimedia.org/wiki/File:South_Georgia_Island_as_seen_by_Sentinel-2.jpg) |
| [`real/orbital-oblique-snowy-ranges.jpg`](real/orbital-oblique-snowy-ranges.jpg) | Oblique view of snowy mountain ranges and the Earth's limb from the ISS (ISS046-E-3699) | Image courtesy of the Earth Science and Remote Sensing Unit, NASA Johnson Space Center | Public domain | [Commons page](https://commons.wikimedia.org/wiki/File:ISS046-E-3699.JPG) |
| [`real/satellite-iceland-winter.jpg`](real/satellite-iceland-winter.jpg) | Iceland in winter from MODIS, with cloud | Jeff Schmaltz | Public domain | [Commons page](https://commons.wikimedia.org/wiki/File:Iceland_satellite.jpg) |

