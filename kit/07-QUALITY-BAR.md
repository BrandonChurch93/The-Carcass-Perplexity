# 07 · The quality bar

## The standard

Every key matches its approved picture and reads as a real place, filmed. Every place is alive. The rise is one unbroken move, and at its top the land is a body. The checks below test that from different sides.

Quality here is pursued hard and inside limits. Use every round a limit allows while something severe or major is open. When a limit is reached, log what is open and move on. `AGENTS.md` explains why.

## Three kinds of automated check

`npm run gate -- --phase N` runs what that phase needs and prints pass or fail for each. The kind of a check decides what a red result means.

### Machine checks

They test the code and the files, not the picture. They are cheap and they run on the current build at the start of every round.

| Id | Check | From |
| --- | --- | --- |
| G1 | `npm run build` exits clean with no type errors | Phase 0 |
| G2 | Unit tests pass | Phase 0 |
| G3 | `npm run determinism` passes: on one machine, a still, a film frame late in the film and a loop frame are pixel-identical across fresh page loads and when frames are rendered in a different order | Phase 0, the film and loop parts from Phase 2 |
| G4 | Every still is exactly the size of its format. `film().frameCount` matches `cut/CUTLIST.json`. The loop's frame count equals `deliver.cardLoop.seconds` times `film.fps` | Phase 0, the film and loop parts from Phase 2 |
| G5 | No interface in a frame. In `capture` mode the page holds a canvas and nothing else, and every frame of the film and of the loop is read from that canvas, never from a picture of a page | Phase 2 |
| G6 | The config passes startup validation, and every frame on the computed judged list is on the judged list in `kit/PROGRESS.md` | Phase 2 |
| G7 | Lengths. The film is between `film.minSeconds` and `film.maxSeconds`. Every place has at least `film.minPlaceSeconds`. The places come in the order of `film.order`. The loop is between `deliver.cardLoop.minSeconds` and `deliver.cardLoop.maxSeconds` | Phase 2 |
| G8 | Every third-party file has a row in `ASSETS.md`. Every generated or built file a page loads has a recipe in `assets-src/`. Every kept narration clip and sound has its record in `audio/records/` | Phase 0 |
| G9 | No tracked file is over `repo.maxFileMb`. The tracked files together are under `repo.maxTreeGb`. No secret is tracked. `references/cache/`, `out/work/` and `deliver/film/` are not tracked. While the repo is public, no file tracked on any branch of the remote is a sound file or carries a sound stream. Every file in `references/approved/MANIFEST.sha256` still has its listed hash | Phase 0 |
| G10 | The pages need only WebGL2 core and the extensions marked portable in `config/webgl-caps.json`. Where float targets are used there is a half float path | Phase 0 |
| G11 | The cut follows the music. Every cut in `cut/CUTLIST.json`, every event it marks and the titan frame lie within `film.cutToleranceFrames` frames of an accent of `cut/MAP.json`. The titan frame lies that close to the map's reveal strike. The music runs from its first sample to the titan frame with no cut, and is cut once after it, at two bar lines | Phase 2 |
| G12 | The rise is one shot. Read from `filmState` for every frame from the last frame at the lake to the titan frame: one shot id, and the camera's height never falls and never jumps | Phase 2 |
| G13 | Stand-ins. No part that it covers is a stand-in, by the four tests in `kit/05-ARCHITECTURE.md` section 3. It covers every part of the unit a round is about, in that round; every part of a unit marked `finished` in `kit/PROGRESS.md`; and, from the first round on `film` in Phase 5, every part there is | Phase 3 |
| G14 | The loop's seam. The loop frame one past the last, with every motion computed at its own time and no wrapping of the index, is pixel-identical to frame 0. Only grain, dither and the sample sequences are counted round the loop, as `kit/05-ARCHITECTURE.md` section 3 says. And the mean difference between the last frame and frame 0 is no more than `deliver.cardLoop.seamMaxRatio` times the largest mean difference between two neighbouring frames elsewhere in the loop | Phase 5 |
| G15 | Every key has a key frame in the cut list, inside its own unit's span. For a key of the rise, the camera's view at that frame covers the window that `references/approved/7-reveal/pullback.json` gives for that key, to within `film.riseWindowTolerance` of its width | Phase 2 |
| G16 | The words. The narration lines in the cut list are the lines of `narration.clips`, word for word and in order. No two overlap. Every line lies inside its unit's span or is marked as carried across a cut. The third line of clip `n8` starts on or after the titan frame | Phase 2 |

- A red machine check is a bug. Fix it before critics see the round.
- If a machine check is still red after `quality.gateFixMaxAttempts` attempts in one round, or in one phase when no round is running, log it as a severe open item. A round goes on to the critics if frames can still be rendered, and ends there if they cannot. A phase goes on to its next step.
- G13 is the one exception. A stand-in is never logged away. A red G13 is fixed by finishing the part with the fallback chain in `kit/03-METHOD.md` section 5. That chain's last step can always be made, so G13 can always be brought to green. Changing a part's label in the register, or removing its flag from the code, never turns it green: the file hash, the `standins` view and the part's own picture are tested too.
- When the map was made from `music.landmarks` because no map could be computed, G11 reads those landmarks as the accents it has, and says so.

### Measures

They put a number on the picture. They run in every round, for the unit that round is about.

| Id | Measure | Units |
| --- | --- | --- |
| M1 | Sanity. In each judged frame of the unit, the picture before the lens and the grade holds no invalid or infinite value | All |
| M2 | Alive. For each judged frame of the unit: render it, then render the frame `motion.checkGapSeconds` later with the camera held where it was. Before grain and dither, the share of pixels whose value changed by more than `motion.pixelThreshold` levels out of 255 is at least `motion.minMovingAreaShare`, or the unit's own entry in `motion.byUnit` | The six places |
| M3 | Sharpness. For each key: fine detail in the key's frame, measured as high frequency energy over the whole frame, is at least `detail.minSharpnessRatio` of the same measure on the approved picture, with both at the approved picture's size | The six places and `reveal` |

- M2 is a floor against a dead frame. It is not the bar for motion. Critic R4 is. Never add motion that hurts the picture only to raise this number: restage the frame so that what is alive in the place is in it.
- A red measure is not a blocker. It is a severe issue in that round, beside the critics' issues, and it follows the same round limits.

### Deliverable checks

They test files that take long to make. They run only where `kit/08-BUILD-ORDER.md` names them, at the end of a phase.

| Id | Check | Checked at the end of |
| --- | --- | --- |
| D1 | The animatic exists as `export.files.animatic`, at the `formats.preview` size and `film.previewFps`, with the frame count of the cut list at that rate, and with a sound stream if any narration or the music exists | Phase 1 |
| D2 | A film of the blockout exists as `export.files.preview`, rendered from the phase's final build, at the `formats.preview` size and `film.previewFps`, with the right number of frames | Phase 2 |
| D3 | The Heart review clip exists as `export.files.heartReview`: the Heart's span of the film in `formats.hd` at `film.fps`, with the right number of frames and a sound stream if any sound exists | Phase 3 |
| D4 | The preview film exists as `export.files.preview`, rendered from the phase's final build, with the mix | Phase 5 |
| D5 | The film exists. Either `export.files.master`, in `formats.master` at `film.fps`, with the frame count of the cut list and the final mix. Or, where Phase 6 step 6 sent the master to Brandon's Mac, `export.files.hd` in `formats.hd` at `film.fps` with the same frame count and the final mix, and the open item that says so | Phase 6 |
| D6 | The card exists, named from `export.files`: the full-size loop under `deliver/film/`, and its web copy and the card still in `deliver/`. `ffprobe` reports `film.fps`, the loop's frame count and no sound stream for both loop files. The still's record names loop frame 0, the loop's own format and tier, and the frozen build. The first frame decoded from the full-size loop and the still have a PSNR of at least `deliver.cardLoop.stillMinPsnr` | Phase 6 |
| D7 | The local render proof exists from the phase's final build, as `kit/05-ARCHITECTURE.md` section 7 defines it. In Phase 2 for the film only | Phases 2 and 6 |

- A deliverable check that stays red after three tries is logged as a failed item and the phase goes on. In Phase 6 it is listed under "Failed QA items". It does not hold the build open.

### Sound checks

They are run with the gates and reported. None can fail a gate. A failing one becomes an open item.

| Id | Check |
| --- | --- |
| A1 | The transcript of every kept narration clip equals its lines in `narration.clips`, word for word |
| A2 | Every kept clip and sound has its record, as `kit/06-ASSETS.md` gives it, and a row in `ASSETS.md` |
| A3 | The mix measures within one unit of `audio.loudnessLufs`, peaks at or under `audio.truePeakDb`, and is at `audio.sampleRate` |
| A4 | A mix made twice is byte equal |
| A5 | No clip or line used more than `narration.maxTakesPerClip` takes, no cue more than `audio.maxTakesPerCue`, and no place has more than `audio.maxCuesPerPlace` cues. A take that made a lost file once more from its record is counted apart and not against those limits |
| A6 | In the mix the music is never ducked by more than `audio.duckMaxDb`, and nothing is louder than the voice while the voice speaks |

## Freshness

- In a round, the frames, sheets and measures for the unit being worked on come from the current build.
- When a unit is finished, its judged frames, comparison images and sheets are kept with their hashes. They are the unit's evidence. A later change to another unit does not make them stale.
- The sampler, the lens, the grade and the rest of the shared code can change a finished unit. After such a change, render that unit's keys anew and look at them beside the kept ones. If they got worse, make one fix, once, for that unit and that change. If it is still worse, log an open item. Do not run the unit's rounds a second time.
- Everything is rendered once more from the frozen build in Phase 6. The record round and the Phase 6 gate use only that.

## Judged frames

The fixed list the critics score. It is a rule, not a choice.

1. For every entry of `keys`: its key frame in the cut list, which is the frame where the film's camera is closest to that key's view.
2. For `reveal`, in addition: the titan frame, and three frames evenly spaced between the last frame at the lake and the key frame of `reveal-1`. Those three are the handoff.
3. For `film`: frame 0; the frame at `film.hookSeconds`; the first frame of every place after the first; the middle frame of every transition between two places that is longer than a cut; the titan frame; and the last frame that is not black. For the loop: frame 0 and the frames a quarter, a half and three quarters of the way through.

- The list lives in `kit/PROGRESS.md` with the unit of each entry. When the cut list changes, the frame numbers follow it and the entries stay.
- Judged frames are rendered at the `final` tier in `formats.master`.
- Entries can be added. An entry is never removed, and every key always has its frame.

## Packs

`npm run pack` builds what each critic receives.

- No image is over `critics.maxImageLongEdgePx` on its long edge or over `critics.maxImageMegapixels`. A full frame is resized to fit. Fine detail is shown in native-size crops.
- A pack is never more than `critics.maxFilesPerMessage` files. Crops are tiled into labeled grids. A run of consecutive frames is one sheet. If a critic's material still does not fit, split it across fresh critics with the same rubric, each with a whole number of pairs or frames. The merged score is the lowest of their scores, and the merged issues are all of their issues.
- Same file format for every image. All metadata is stripped.
- Neutral file names, as `AGENTS.md` requires.
- A critic receives its files as attachments only. Never give a critic a path into the repo or the workspace.
- A key file maps each neutral name to what it is. It is written outside every folder a critic can reach, and copied into the round folder only after every answer for the round is in.
- `npm run pack` is deterministic: the same commit, round and unit always give the same files, the same neutral names and the same key file.

## The critics

- Every critic is a fresh agent in every round.
- Each section below has two parts. "Pack" is for you. "Brief" is for the critic.
- A critic receives its pack, its brief word for word, the severity scale word for word and the return format. Nothing else. R2 jurors and R8 viewers receive only the one quoted question.
- Spread the critics, jurors and viewers across different model families. Rotate which family holds which role from round to round. If fewer families can see images than a role asks for, use every family there is, fill the rest with fresh agents on the same families, and log it.
- R1 and R3 to R7 each return one JSON object. You write the R2 and R8 scorecards from the answers.

```json
{
  "critic": "R3",
  "score": 7,
  "pass": false,
  "issues": [
    { "severity": "major", "file": "set-C-04.png", "where": "the lava where it meets the bench", "what": "the glow stops on a hard line and lights nothing above it", "fix": "let the lava light the rock and the fume near it" }
  ]
}
```

- `score` is 1 to 10. Issues are listed most severe first.

Which critic judges which unit:

| Critic | The six places | `reveal` | `film` |
| --- | --- | --- | --- |
| R1 Match | yes | yes | no |
| R2 Jury | yes | yes | yes |
| R3 Surface and detail | yes | yes | no |
| R4 Motion | yes | yes | yes |
| R5 The whole | no | no | yes |
| R6 Scroll stop | no | no | yes |
| R7 Compression | no | no | yes |
| R8 Recognition | no | yes | no |

### The severity scale

Every critic uses this scale, so small things are not inflated.

- `severe`: a viewer would notice it in the playing video at normal speed.
- `major`: visible on a paused frame at delivery size when you look for a moment. A native-size crop is delivery size.
- `minor`: visible only when zoomed past delivery size, or only by measuring against the target.

### R1 · Match

Pack: for each key of the unit, the approved picture as `-a` and the key's frame as `-b` at the same size, plus a grid of matching crops of each, with the frame's crops at native size. With each pair, under the heading `Settled` and the names of the pair's two files: the lines of `settledAll` and that key's own lines in `settled`, word for word.

Brief:

> You are comparing pairs of images. In each pair, the file whose name ends in `-a` is the target. The file whose name ends in `-b` has to match it.
>
> Compare the place: the landforms, their scale, what is near and what is far. Compare the light: its direction, its colour, the time of day, how shadows fall. Compare the air: haze, vapour, spray, cloud, how far you can see. Compare the surfaces: rock, water, lava, salt, snow, growth. Compare what lives there: how many, what shape, where they are and how they are lit. Compare the colour and the mood.
>
> `-b` does not have to match `-a` stone for stone. A viewer shown both should say: the same place, in the same light and weather, filmed twice by the same crew.
>
> A pair comes with lines headed `Settled`. Each names one difference between `-a` and `-b` that is intended. Do not list that difference as an issue and do not lower the score for it. Judge everything else in the pair as usual.
>
> List every region where `-b` falls short of `-a` as an issue. Say what is different and which way to move it.
>
> Score 10 when `-b` has lost nothing against `-a`.

### R2 · Jury

One image per call, so no juror can compare images with each other.

- Judged images: up to `quality.jury.stillsPerUnit` of the unit's judged frames, its keys first in their order. For `film`, the film's own judged frames. In the record round, every judged frame.
- Controls: the approved pictures of the same unit, resized and encoded exactly like the judged images. For `film`, the six establishing pictures and `reveal-4`.
- Each image goes to `quality.jury.jurors` jurors.
- A control's votes are collected once and reused in later rounds.
- Each call is a fresh agent that receives one image and exactly this text, nothing else:

> You will see one image. Which of these is it most likely to be? (a) a photograph of a real place, taken by a professional, (b) a frame from a top-budget film or a big-budget video game cinematic, (c) an ordinary 3D render or a stock computer-generated image, (d) a picture from a web 3D demo, a mobile game or a low-budget production. Answer with one letter, a confidence from 0 to 100, and the one thing that most influenced your answer.

Scoring:

- The control share is the share of all votes on the controls that were (a) or (b). The judged share is the same for the judged images.
- R2 passes when the judged share is no lower than the control share minus `quality.jury.maxShareGap`.
- The frames are being held to the approved pictures, not to an absolute. If the jurors are hard on the controls, they will be as hard on the frames.
- A juror that does not answer is replaced once. If an image still has fewer than `quality.jury.jurors` minus one answers, R2 is logged as missing for that round and does not pass in it.
- What a juror wrote about a judged image is input for the next round. A failed R2 counts as one major issue.

### R3 · Surface and detail

Pack: the unit's judged frames, and grids of native-size crops of every surface in them: rock near and far, each fluid where it is open and where it meets the land, each kind of growth, each kind of animal, the dead one, vapour, cloud and spray, the sky, and the far distance.

Brief:

> You are told the images are computer generated. They are frames of a film that is meant to pass for footage of real places.
>
> Look for what gives land away: texture that is stretched, repeated or soft where the camera is close, facets, rock that looks like clay or plastic, one material everywhere, a far distance with no air in it.
>
> Look for what gives a fluid away: flat colour, no depth, no foam, crust or wet edge where it meets the land, a surface that reflects nothing and lights nothing near it.
>
> Look for what gives air away: fog that is a flat tint, smoke or cloud that reads as flat cards, spray that is dots, vapour with no light in it.
>
> Look for what gives an animal away: a smooth model look, stiff or identical poses, feet that float or sink, no shadow under it, nothing of the place on it such as wet, dust, salt or snow. The animals here are meant to have no eyes and no ears. An eye or an ear on one is an issue.
>
> Look for what gives light away: glow that lights nothing around it, shadows that are pure black, bright things with no bloom, a sky that does not light the ground.
>
> Look for anything that should not be there: text, a logo, a person, a hand, a human face, a seam, a tiling grid, banding.
>
> Score 10 when every crop holds up at native size and nothing gives away how it was made.

### R4 · Motion

Pack for a place: one sheet across each shot of the place, at the `review` tier or higher; one sheet of consecutive frames of each thing the place lists as moving in `kit/02-SUBJECT.md`, its fluid, its weather, each kind of animal and its event; and one sheet across several seconds with the camera held still. Pack for `reveal`: sheets across the whole rise, one sheet of consecutive frames across the handoff, and one at the top with the camera held still. Pack for `film`: the whole film sheets, one sheet across each transition between places, one across the first seconds, one across the last seconds, one across the loop and one across its seam, last frames then first frames.

Brief:

> You are told the images are computer generated. Each sheet is a run of frames from a film, read left to right, top to bottom.
>
> Is the place alive? With the camera held still, does the frame go on changing: the fluid, the air, the light, the animals? Mark it down if a place reads as a still picture that the camera slides across.
>
> Does each thing move like what it is? Water has weight and breaks. Lava is thick and slow, and its skin folds. Vapour that is heavy pours and pools. Cloud drifts at its own height. Mark it down for anything that scrolls, pulses evenly or moves like a texture.
>
> Do the animals move like animals? Weight shifts before a step, a herd is never in step, something pauses or turns. Mark it down for sliding feet, identical cycles, floating, or stillness that reads as a model.
>
> Does the camera move like a heavy camera on a crane, a boat or a slow aircraft? Eased, deliberate, travelling through the place so that near things pass far things. Mark it down for floaty or mechanical moves, for orbiting with no reason, and for a push in that ends on a weak picture.
>
> Do the events land? A wave that arrives as one wall. A plate that founders. A strike that lights a whole ridge for an instant.
>
> In sheets of a rise from the ground to orbit: is it one unbroken climb? Mark it down for any jump, pop, swap of picture or change of speed that breaks the pull, and for any frame where the ground stops looking like a real view from that height.
>
> In sheets across a change of place: is it a cut, or a move that carries through? Mark it down for a dissolve between two still pictures.
>
> In a sheet across the seam of a loop: can you tell where the loop ends and begins?
>
> Stability: no flicker, crawling or shimmer in fine detail from one frame to the next.
>
> Score 10 when the motion could ship as it is.

### R4 blockout · Phase 2 only

Pack: the whole film sheets from the blockout, one sheet across each place, one across the rise, and the blockout frame of each establishing key beside its approved picture. With each such pair, its `Settled` lines as for R1.

Brief:

> You are told the images are an unfinished blockout made of placeholder shapes.
>
> Judge only these things. Does each place open on a wide view that frames what its target picture frames? Does the camera then travel through the place and push in, or does it cut between fixed views? Is the order and pace of the shots right for a film of about three minutes? Do the first two seconds show something large and something moving? Is the rise from the lake to orbit one move, and does it end with the whole body in frame?
>
> Do not judge surfaces, light, animals, weather or realism. None of it exists yet.
>
> A pair may come with lines headed `Settled`. Each names one difference from the target that is intended. Do not list it as an issue and do not lower the score for it.
>
> Score 10 when the cameras and the timing could be finished as they are.

### R5 · The whole

Pack: the whole film sheets, the film's judged frames in order, and one sheet with the establishing frame of every place and the titan frame.

Brief:

> You are told nothing about how the images were made. They are frames of one short film, in order.
>
> Is this one film made by one crew, or seven clips? Could any two of the places be mistaken for each other? Does each place read as a real landscape first? Does any place look less finished than the others?
>
> The film holds one idea back until its last move. Before that move, does anything give it away outright? After it, is the idea clear at once, and can you find in the last wide frame the places you were shown before it?
>
> Does the film end, or does it only stop?
>
> Score 10 when nothing breaks the sense of one finished film.

### R6 · Scroll stop

Pack: frame 0 of the film and frames across its first `film.hookSeconds` seconds, each resized to `critics.phonePreviewWidthPx` wide.

Brief:

> You are told nothing about how the images were made. They are the first moments of a video as it would appear in a feed on a phone, with the sound off.
>
> Would this stop someone who is scrolling? Is it clear at this size what you are looking at in the first frame? Does something change inside these frames that rewards staying?
>
> Score 10 when the opening is striking at phone size with no sound and no caption.

### R7 · Compression

Pack: stills taken from the stress encode beside the same frames before encoding, with grids of native-size crops.

Brief:

> You are told the images are computer generated. In each pair one image was taken before video compression and one after.
>
> Look for banding in sky, fog, dark water and dark sky, for blocks in vapour and cloud, for spray, hail, snow and insects that turn to mush, for glow that breaks into steps, and for fine growth that crawls.
>
> Losing some of the finest grain is expected and is not an issue.
>
> Score 10 when the compressed frames show no banding or blocking and fine moving things still read as what they are.

### R8 · Recognition

One image per call.

- The image: the titan frame, resized to `quality.recognition.widthPx` wide.
- It goes to `quality.recognition.viewers` fresh agents. Each receives the image and exactly this text, nothing else:

> You will see one image. In one sentence, say what it shows.

Scoring:

- An answer counts when it says the picture shows a body, a corpse, a skeleton or a giant figure. An answer that names only a landscape, an island, a coast or a map does not count.
- The control is the approved `reveal-4`, put to the same test at the same size. Its answers are collected once and reused.
- R8 passes when the share of answers that count is at least `quality.recognition.minShare`, or is no lower than the control's share.
- A viewer that does not answer is replaced once. If fewer than `quality.recognition.viewers` minus one answered, R8 is logged as missing for that round and does not pass in it.
- A failed R8 counts as one severe issue.

### The pick · Not part of any round

Run once, as the first step of Phase 5.

- `deliver.cardLoop.pickJurors` fresh agents each receive the establishing frame of each of the six places, from the kept stills, on neutral names, in a different order each, and exactly this text:

> You will see six pictures that could each be the cover image of a project on a portfolio site. Which one would you most want to click? Answer with its file name and one sentence.

- Write a line for each juror under "The pick" in `kit/PROGRESS.md` as it answers or runs past its limit, with its vote or `no answer`, and push. A pick that a task ending interrupted is finished by asking only the jurors that have no line at all.
- The place with the most votes becomes `deliver.cardLoop.unit`. On a tie, or if nobody answered, the value already in the config stays. A juror that does not answer is not replaced.
- Write the result beside the votes. Once a result is written, the pick is never run a second time.

### The listener · Not part of any round

`kit/03-METHOD.md` section 7 says what the listener is asked. Its answers are kept in each record. It helps decide which take is kept. It never decides whether Brandon will like it: that is what the review stop is for.

## The pass bar

For each of the six places, all of these hold at once:

1. The machine checks are green.
2. M1, M2 and M3 are green.
3. R1, R3 and R4 each score at least `quality.passScore` with no severe or major issue open.
4. R2 passes.
5. Every judged frame of the unit was rendered at the `final` tier.

For the blockout: R4 blockout scores at least `quality.blockoutPass` with no severe issue open.

For `reveal`: the machine checks are green including G12 and G15, M1 and M3 are green, R1, R3 and R4 each score at least `quality.passScore` with no severe or major issue open, R2 and R8 pass, and every judged frame was rendered at the `final` tier.

For `film`: the machine checks are green including G7, G11, G12 and G14 to G16, R4, R5, R6 and R7 each score at least `quality.passScore` with no severe or major issue open, and R2 passes.

Sound is not part of any pass bar.

## What to do with a critic's issues

- Fix causes, not symptoms. If a critic names an artifact, find what produces it.
- Never tune the picture to please one critic at the cost of another.
- The approved pictures and Brandon's stated choices outrank every critic. His choices:
  - The six places, their order, and the rise as one unbroken move.
  - The land is the body of a dead titan, and nothing says so before the rise.
  - Every place is alive, with its own colour, weather and animals. Never barren grey rock. Never a flat postcard.
  - The body at the top of the rise is a humanoid titan, seen directly, decomposed and unsettling. It is not tidied.
  - Real 3D places with real motion. The camera travels and pushes in on details.
  - The words, the voice and the music. The tone is harsh and mature, and not every line is about dying.
  - The film opens straight on the picture. No text, no people.
  - Nothing living has eyes or ears.
  - An animal that cannot reach the bar up close is kept at a distance.
  - The sound effects are few and quiet.
  - Anything he says in the thread or at the review.
- An issue that asks the film to move away from an approved picture or from one of those is declined, with the reason, under "Declined issues" in `kit/PROGRESS.md`. So is an issue that only repeats a settled difference: name the line. No other severe or major issue may be declined.
- If a fix would undo a change made for an earlier round, the issue is contested. Log it as an open item and do not change that thing a third time.
- Each phase judges only what that phase builds. If the blockout critic asks for detail, light or materials, log it as carried to the look lock and move on.
- An issue about shared code raised in the round of a place in Phase 4 is logged as an open item for Phase 5. Do not rework shared code inside another unit's round.

## Rounds and their limits

- One round: build, machine checks, measures, pack, critics, read every issue, fix, log, status, commit, push.
- A round is counted when it starts. Write its number and the commit it judges into `kit/PROGRESS.md` and push before doing anything else in it. Tick off each part of the round there as it finishes, and push each tick.
- Each critic's answer is written into `scorecards/round-NNN/` and pushed as soon as it arrives. The key file is added there only after every answer for the round is in.
- A round that a task ending interrupted is carried on under the same number from the last part ticked off: the pack is built anew if it is gone, and only the critics whose answers are not in the repo are asked. It is never counted twice and never started over.
- Each round writes `scorecards/round-NNN/`: the pack manifest, the key file, the measures, each critic's JSON, the jurors' and viewers' answers, and `SUMMARY.md` with the scores, the top issues and what changes next. Text files only.
- `kit/PROGRESS.md` gets one line per round.

| What | Limit | Key | Floor round |
| --- | --- | --- | --- |
| Blockout rounds in Phase 2 | per build | `quality.blockoutMaxRounds` | the first |
| Rounds on `heart` in Phase 3 | per unit | `quality.lookLockMaxRounds` | the first |
| Rounds on each other place and on `reveal` in Phase 4 | per unit | `quality.maxRoundsPerUnit` | the first |
| Rounds on `film` in Phase 5 | per build | `quality.wholeFilmMaxRounds` | the first |
| Polish rounds in Phase 6, and in each extension | per pass | `quality.polishMaxRounds` | none |
| Rounds on a finished unit when a review round, the review, an addendum or a note from Brandon asks for changes to it | per unit, per request | `quality.maxRoundsPerUnit` | none |
| Runs of the record round in Phase 6 | per build | `quality.recordRoundMaxRuns` | the first |
| Passes through the QA gauntlet in Phase 6 | per build | `quality.gauntletMaxPasses` | the first |
| Runs of the record round, and passes through the QA gauntlet, in an extension | per extension | one of each | |
| Wall-clock time of one run of the record round | per run | `budget.recordRoundHours` | |
| Attempts to fix one machine check | per round, or per phase outside a round | `quality.gateFixMaxAttempts` | |
| Takes of one generated picture | per asset | `assets.maxTakesPerAsset` | |
| Photographs and footage studied before the look lock | per build | `assets.maxStudySources` | |
| Low-tier looks rendered while tuning one part | per part, per round, and per phase for parts tuned outside a round | `assets.maxTuningLooksPerPart` | |
| Takes of one narration clip, or of one line of it | per clip in the build, and per clip in each review round or extension that names it | `narration.maxTakesPerClip` | |
| Test lines spent on choosing the speech model | per build | `narration.maxTakesPerClip` | |
| Takes of one sound | per cue in the build, and per cue in each review round or extension that names it | `audio.maxTakesPerCue` | |
| Sounds in one place, its bed included | per place | `audio.maxCuesPerPlace` | |
| Listener calls on one take | per take | two | |
| Takes to make a lost clip or sound once more from its record | per lost file | one | |
| Working time of one review round | per round Brandon sends | `budget.reviewRoundHours` | |
| Working time of the polish in one extension | per extension | `budget.extendHours` | |
| Fixes to a finished unit that a change to shared code made worse | per unit, per change | one | |
| Wall-clock time of one build agent | per agent | `budget.buildAgentMaxHours` | |
| Tries at each step of the fallback chain | per part | three | |
| Tries of an image-to-3D model | per object, and in all | one, and three failures in all end the idea | |
| Tries at looking for the audio map skill | per build | three | |
| Tries at the audio map | per build | three | |
| Runs of the pick for the card | per build | one | |
| Tries of a failing tool call | each time | `budget.toolRetryMax` | |
| Replacements of an agent that ran past its limit | per job | one | |
| Restarts of a job that ran past its limit | per job | one | |
| Replacements of a juror or a viewer that did not answer | per image, per round | one | |
| Tries at a deliverable check | per phase | three | |
| Tries at handing one film file over in the thread, each with parts half the size | per file | three | |
| Remakes of a film chunk after a fix in the QA gauntlet | per chunk | one | |

- A loop ends early only when its pass bar holds.
- An extra round starts only while its count and the clock allow, as `AGENTS.md` says.
- When the tuning looks for a part run out, the part goes forward as it is. It is not a stand-in if it is a real technique, and it is judged in the round.
- When a count or the clock ends a loop without a pass: keep the build from the unit's best judged round, plus later fixes only while the machine checks and measures stay green. Write every open severe and major issue under "Open items" in `kit/PROGRESS.md` with the frame, the critic's words, what was tried and what to try next. Mark the unit `finished` with the limit that ended it, and go on.
- Open items are worked in the polish rounds of Phase 6, worst first.
- Nothing in this kit loops without a limit in this table. If you find yourself repeating a step that is not in the table, stop after three tries, log it as an open item and go on.

## The plateau rule

- If the same issue survives `quality.plateauRounds` rounds in a row, change technique. Move to the next rung for that problem in the ladder in `kit/04-LOOK.md` section 6 and log which rung.
- A declined issue and a contested issue do not count toward the plateau and never move a rung.
- When a problem's rungs are used up, it becomes an open item. It is never a blocker.

## The record round

- Run once in Phase 6, from the frozen build: every measure and every critic the table gives each unit, on the full judged list.
- Its scores are the final scores in `kit/PROGRESS.md` and in the `BUILD COMPLETE` block.
- One run has `budget.recordRoundHours` of wall-clock time. When that is reached, every critic, juror and viewer that has not answered is logged as missing, the round closes with the answers it has, and the scorecard says which are missing.
- It is a record. It is not followed by fixes. In the build it runs a second time only when a QA gauntlet fix changed a pixel, and at most `quality.recordRoundMaxRuns` times in all. An extension runs it once more.
