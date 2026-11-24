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

All generated pieces are from `gpt_image_2_6_sunburst`. No other model was used. The reveal redo used {{REDO_TAKES}} takes in all ({{ALL_TAKES}} in round 3). Every take is in `working/takes/`, every prompt in `working/prompts/`, every input window in `working/pull/`.

The method, in one line: one wide picture of the whole body, then every part of it photographed again from closer, then the closer pictures joined back into one large master.

**Step 1. The wide picture: take `cx-e-t2`** ({{TAKE:cx-e-t2}})

- Model: `gpt_image_2_6_sunburst`
- Prompt: `working/prompts/cx-e.txt`, full text below
- References passed to the generator, in order:
{{REFS:cx-e-t2}}
- Image 1, the layout, is `working/guides/cx-e-guide.png`. It is not a generated picture as such: it is the previous master (`master-x1`) reduced to 1672 x 941 with corrections painted on by a script (`working/tools/guide_e.py`) after the blind tests: shoulder joints and collar bones, both arms and both legs redrawn as plain limb bones with hands and feet, the breastbone opened into a through-going strait between two rows of ribs, the storm moved onto the backbone, the salt pan whitened.
- Three takes; take 2 chosen by eye. Tested before anything was built on it (`as1` to `au4`): at 400 px, 3 of 3 fresh viewers named a giant human skeleton; of three viewers given the six descriptions, two found all six places and one found five, with the airways as "possibly found".
- None of its pixels are in the final frames directly. It fixes where everything is.

Prompt `cx-e`:

{{PROMPT:cx-e}}

**Step 2. Twenty-one closer plates: takes `e2-W00-t1` to `e2-W33-t1`, `e2-HD-t1`, `e2-ST-t1`, `e2-WA-t1`, `e2-WF-t1`, `e2-WG-t1`**

- Each plate is one window of `cx-e-t2`, 557 px wide, enlarged 3 times to 1672 x 941 and passed back as Image 1 with the instruction to photograph the same view again from a lower orbit: keep everything where it is, add only what a sharper photograph would show. One take each.
- Sixteen windows (W00 to W33) cover the frame as a 4 x 4 grid with overlaps. Five more are centred on the parts that matter most: the head (HD), the backbone, storm and hips (ST), the lower arm and hand (WA), the bent leg and foot (WF), the straight leg and foot (WG).
- The sixteen grid prompts share one text and differ only in the list of what is in that window. `cxW-W12` is printed below as the example; the others are in `working/prompts/`.
- The plates were tone-matched to the wide picture (low frequencies only) and joined with a multi-band blend along seams in the middle of the overlaps (`working/tools/master.py`; arguments in `working/pull/master-x2.args`). Result: `master-x2`, 5952 x 3348.

| Take | Prompt | Window of `cx-e-t2` (x, y; 557 x 313 px) | Image 1 | Real photographs passed as rendering standards |
|---|---|---|---|---|
{{PLATES}}

Prompt `cxW-W12` (the example of the sixteen grid plates):

{{PROMPT:cxW-W12}}

**Step 3. The Heart lights (not generated)**

- The plate had one ember in the black crust under the upper ribs. A script (`working/tools/heart_x2.py`) adds light only: a warm core and faint halo on that ember and a few much smaller sparks on the darkest spots of the crust near it. Nothing else in the picture is drawn by hand or by script. Result: `master-x2h`.
- Reason: fresh viewers could not find "a glow of lava in the chest" in earlier versions when it was small, and called it too large for daylight when the generator drew it. This keeps it small and findable. One viewer of the final set still calls it too large for daylight.

**Step 4. Two correction plates: takes `e3-HD-t4` (head) and `e3-ST-t1` (storm)**

Set x2 was tested on fresh viewers (see the tests). Two things failed: the head read as carved (even peg teeth, a straight crack, a perfectly round pit), and the storm read as an eruption or explosion to 4 of 6. Each was re-photographed once more with only those things changed.

`e3-HD-t4` ({{TAKE:e3-HD-t4}}): the head.

- Prompt: `working/prompts/cxW-HD3.txt`, full text below
- References, in order:
{{REFS:e3-HD-t4}}
- Five takes with two wordings (`cxW-HD2` for takes 1 and 2, `cxW-HD3` for takes 3 to 5). Takes 2 to 5 were each shown to three fresh viewers as frame 2 (`bd1` to `bh3`). Take 2 lost the skull for two of three (a reptile's head, a fish or bird head). Takes 3, 4 and 5 kept it for all three. Take 4 was chosen from those by eye.

Prompt `cxW-HD3`:

{{PROMPT:cxW-HD3}}

`e3-ST-t1` ({{TAKE:e3-ST-t1}}): the storm on the backbone.

- Prompt: `working/prompts/cxW-ST2.txt`, full text below
- References, in order:
{{REFS:e3-ST-t1}}
- Two takes. Take 1 was kept: a flat anvil line with its shadow on the sea instead of a ball with rays.

Prompt `cxW-ST2`:

{{PROMPT:cxW-ST2}}

Both plates were graded back to the tone of the window they were shot from (`working/tools/grade_plate.py`: one straight-line fit per colour channel on blurred copies, so only tone changes) and folded into the master (`working/tools/inset.py`). Result: `master-x4`.

**Step 5. The frame 1 plate: take `pb1e-t1`** ({{TAKE:pb1e-t1}})

- What it is: the lake window of the master (148 px of the wide frame at that stage) enlarged 3.76 times and re-photographed from lower, with a river gorge and delta, an uneven rim, wind slicks and a few streets of minute cloud.
- Prompt: `working/prompts/pb1-e.txt`, full text below
- References, in order:
{{REFS:pb1e-t1}}
- Three takes; take 1 kept. Two takes with a cloud-free wording (`pb1f`) were not used.
- Graded and folded back into the master so that frame 1, reduced, equals its window (`master-x4f`). This plate is key frame 1, unchanged since.

Prompt `pb1-e`:

{{PROMPT:pb1-e}}

**Step 6. The head brought to adult proportion (not generated)**

- Three fresh viewers were asked to compare the body in frame 4 with an adult human skeleton, part by part (`bt1` to `bt3`). All three said the head was too big; two said it made the figure look cartoonish or childlike.
- One smooth warp of the whole master shrinks the head to 0.66 of its size about a point at the base of the skull and moves that point toward the crown by 18 px of a 1,429 px wide view, which lengthens the neck (`working/tools/headwarp.py`, tag c; report in `working/pull/headwarp-c.json`). No cut, no paste, no generation. Around the head the displacement falls away smoothly to zero at the shoulders, the ribs and the planet's edge.
- MEASURED on the warp field: it does not fold anywhere (the smallest local area factor is 0.436, which is the head itself, 0.66 squared); the largest stretch outside the head is 1.58 times, in the sea beside the crown; the 95th percentile of the stretched area is 1.40. A strip slid in from outside the picture, 19 px wide at the left and 10.7 px at the top of that 1,429 px view, and is cropped off, which is why frame 4 is now a window of the master and not the whole of it.
- The windows of frames 1 and 2 were scaled with the head (0.66 times), so those two frames show exactly what they showed before. Frame 3 was re-cut narrower (835 px of the wide frame, from 1,000) so that the head, both shoulders and the upper ribs still fill it. Frame 4 lost only the cropped strip.
- After the warp: 2 of 3 new viewers call the head right, 1 "slightly too big", none childlike (`by1` to `by3`).

**Step 7. The frame 2 plate after the warp: take `pb2g-t2`** ({{TAKE:pb2g-t2}})

- The head in frame 2 is drawn straight from the old master through the warp, so it is pixel for pixel the head that was tested before. The sea, the throat and the corners around it had been enlarged 1.6 to 2.4 times by the warp and were soft. They were re-photographed once so that they are sharp again.
- Prompt: `working/prompts/pb2-x6.txt`, full text below
- References, in order:
{{REFS:pb2g-t2}}
- Two takes; take 2 kept. Only the parts outside the head are used from it (61% of the frame). The head comes from the direct drawing inside a mask along its coast (`working/tools/f2_merge.py`, `working/pull/f2-x6-direct-headmask.png`).
- Graded, merged and folded back into the master. Result: `master-x6`, the master of the kept set.

Prompt `pb2-x6`:

{{PROMPT:pb2-x6}}

**What each kept frame is made of**

- Key frame 1: the plate `pb1e-t1`, graded. It also sits in the master, reduced.
- Key frame 2: head from `e3-HD-t4` (with the round lake area from `pb1e-t1` reduced into it); sea, throat and corners from `pb2g-t2`.
- Key frame 3: a window of the master: the head, the throat and the sea round them as in frame 2; neck, shoulders and ribs from the grid plates; the Heart lights from the script. `e2-HD-t1` was replaced by `e3-HD-t4` over the same window.
- Key frame 4: a window of the master, 98.7% of its width: all of the above, plus the storm from `e3-ST-t1` (only the box round the storm is used from it), the backbone, hips and salt flats from `e2-ST-t1`, the lower arm and both lower legs from `e2-WA-t1`, `e2-WF-t1` and `e2-WG-t1`, and everything else from the grid plates.
- Cut and checked by `working/tools/cut_frames3.py`; windows in `working/pull/frames-x6.json`.

#### The tests

Protocol: `working/critics/fresh/PROTOCOL.md`, fixed before results came in. Viewers are newly started agents on separate machines, each given one image with a meaningless file name and a short brief. The kept set was tested on three models (`gpt_6_2_sol`, `claude_opus_5_5`, `gemini_4_carbon`); some earlier rounds also used `claude_sonnet_5_5`, `gemini_neon` and `grok_4_7`. The model of every viewer is in `replies.json`. They are told nothing about the film. Each sees one image once. Every reply is saved unedited in `working/critics/fresh/replies/` (one file per viewer, {{N_REPLIES}} in all) with the image it saw in `working/critics/fresh/seen/`.

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

- GLANCE at 400 px passed for every body tested in the redo, from the first (`rv4-t8`, `rv4-t10`) to the last: {{GLANCE}} one-sentence replies name a human body, figure or skeleton (counted by script against the words in the pass rule, and read through by me).
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

{{REALS}}
