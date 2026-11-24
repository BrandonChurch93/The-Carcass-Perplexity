# 08 · Build order

Work the phases in order. A phase ends when every line of its gate is met and logged with evidence. Then commit, push, publish, post the status and start the next phase at once. The one place the build stops for Brandon is the review stop at the end of Phase 3.

How a gate line is met:

- A line that asks for something to be published or pushed is met when it was done, or when the failure is logged. After Phase 0 neither one holds the build.
- A line that names a loop is met when its pass bar holds or its limit was reached. Reaching a limit means logging what is open.
- A line that names a machine check is met when the check is green, or when it has been logged as a severe open item after `quality.gateFixMaxAttempts` attempts. G13 is the exception: it is met only when it is green. A stand-in is ended with its fallback, as `kit/07-QUALITY-BAR.md` says, never logged.
- A line that names a deliverable check is met when it is green, or when it has been logged as a failed item after three tries.
- A line about sound is met when the sound exists, or when the log says why it does not. Sound never holds a gate.
- A line that asks for a record is met when the record is written. Where a lookup, a test or a measurement failed inside its tries, the record says `not found` and what was tried, and that meets the line.

Every loop below has a limit in `kit/07-QUALITY-BAR.md`. The clock rules and the budget report are in `AGENTS.md`. Post a status at least every `budget.statusMaxGapMinutes`, whatever step you are in.

The steps say what has to exist at the end of each phase. How you get there is yours. Where a step names a split of the work or a technique, it is a suggestion unless it says otherwise.

## Before Phase 0, in every task

1. Check stop condition 1 in `AGENTS.md`: the reference images are approved.
2. Read `AGENTS.md` and `kit/00-README.md`.
3. Fetch and merge `repo.branch`. Read `kit/PROGRESS.md` and every file in `kit/addenda/`.
4. If `npm run clock` exists, run `npm run clock -- --start`.
5. Look at "Build", "Review round", "Review" and "Budget" in `kit/PROGRESS.md`, in this order:
   - "Build" says `complete`: follow stop condition 5 in `AGENTS.md`.
   - "Build" says `extension N in progress`: carry that extension on from the step after "Extension step", as "Extensions" below describes. Skip the rest of this list.
   - "Review round" says `round N in progress`: carry that review round on from the step after "Review round step", as "A review round" below describes. If this task's prompt holds notes that are not yet logged, add them to the round's items first. If it holds the line `The Heart is approved.`, close the round at once: do the round's step 7 without ending the task, with the round's unfinished items listed under "Review items not done", and then do "After the review" with this prompt. Skip the rest of this list.
   - "Review" says `waiting`: read the prompt. With the line `The Heart is approved.`, do "After the review" below. With the line `Review notes.`, do "A review round" below. With neither, show the block under "Last report block" and build nothing.
   - "Budget" says `reported`: follow "The budget report" in `AGENTS.md`.
   - Otherwise tick the clock for the current phase. If it prints `budget report: due`, go straight to "The budget report" in `AGENTS.md`. Start nothing first.
6. Post the status that opens the task. Its clock tick follows the state: `--phase N` in the build, `--review-round N` in a review round, `--extension N` in an extension, and `--no-tick` in a task that builds nothing. In the very first task there is nothing to show yet: its opening status is the one in Phase 0 step 4, and steps 1 to 3 come before it. If those three steps take longer than `budget.statusMaxGapMinutes`, post two lines of text by hand.
7. If a phase is already in progress, continue it. Never redo a phase marked `done`. Check "Rounds" for a round that was interrupted, "Running jobs" for jobs to pick up or restart, "Running agents" for branches to fetch and work to hand to new agents, and "Review items" for items still `open`.
8. If the sound files the build has made are not in the workspace, get them as "Sound" in `AGENTS.md` says. If the music file is not under `audio/supplied/`, take it from what is attached to this task's prompt.

## Phase 0 · Ground truth

Read first: `AGENTS.md`, `kit/00-README.md`, `kit/05-ARCHITECTURE.md`, `kit/06-ASSETS.md`, `config/showcase.json`.

Steps:

1. Write `in progress` under "Build" in `kit/PROGRESS.md` and push it to `repo.url`. If the push fails, retry once. If it still fails, stop as `AGENTS.md` says.
2. Create `package.json` at the repo root before installing anything.
3. Build `npm run clock` and `npm run look`. Run `npm run clock -- --start` and tick. From here on, every status and every poll ticks the clock.
4. Prove the inline display. Show `references/approved/contact-sheet.jpg` in the task thread so that it is visible without opening or downloading a file. Record the method under "Tool record". If no method works, record that and follow the fallback rule in "Showing the work" in `AGENTS.md`. Measure whether `repo.url` is private. Find the music file attached to the first message, save it under `audio/supplied/` as `music.file`, and compare its hash with `music.sha256`. Read the `Narrator voice:` line of the prompt and write it under "Voice". Post this as the first status, with one line each for: where the sound files will live, whether the music was found and matched, and the voice name.
5. Record the workspace: OS, cores, memory, disk, Node and npm versions, the browser and its exact version. Build `npm run caps` and run it.
6. Confirm `ffmpeg` and `ffprobe` run. If either is missing, install a static build through npm.
7. Test, with an agent whose whole job is to idle for two minutes and answer, whether you can tick the clock and post a status while an agent you started is still working. Record the result. If you cannot, follow the short agent rule in "Waits" in `AGENTS.md` for the whole build. Test whether a detached process outlives a scripted step. Test whether a sandbox agent can clone the repo, return a video file as an attachment and push a branch.
8. Find the best way this workspace has of handing Brandon a large file: an attachment in the thread, a download the workspace offers, or the app hosting. Measure the largest size each carries with test files of the sizes in `deliver.attachTestMb`, and say in one line in the thread what the test files are. Record the result under "Tool record".
9. Measure the image limit: view a test image with fine numbered marks and find the largest size that arrives without being scaled down. If it is smaller than `critics.maxImageLongEdgePx` or `critics.maxImageMegapixels`, lower those keys.
10. Record what you can call: the image models, the largest size each returns and how many reference images each accepts; whether a video model and an image-to-3D model can be called; app hosting and the largest site it accepts; the model families available for supporting agents and which of them can see images.
11. Record the sound tools, as `kit/03-METHOD.md` section 7 says: read the current API reference for speech and for sound effects, find the voice, make one short test line and one test sound, and put one open question to the listener about each. If a call fails after `budget.toolRetryMax` tries, record that and go on.
12. List the skills of this workspace and record the name of the audio map skill. Three tries at looking for it.
13. With supporting agents, read and record: the output terms of each image model you will use and of the sound tool, as `kit/06-ASSETS.md` says; and X's current limits for an uploaded video, its largest frame size, frame rate, length and file size, under "Platform" in `kit/PROGRESS.md`. Nothing in the kit changes because of the platform's limits. If the master as specified could not be uploaded, list it under "For Brandon to decide".
14. Decide the three.js version as `kit/05-ARCHITECTURE.md` says. Pin every version.
15. Scaffold: config import and validation, seeded random, the sampler, the accumulator, the frame interface with the stand-in list, and `capture` mode. Put a spike scene in it that costs what a place will cost: a lit, displaced, glowing surface under a volume of fume, with a few thousand moving particles.
16. Build the harness commands `still`, `crops`, `compare`, `sheet`, `determinism`, `gate`, `budget`, `status`, `keep` and `review`.
17. Measure the render budget on the spike scene with `npm run budget`: seconds for one sample at each format on this VM and on a sandbox VM, and the fixed cost of starting a render. Render one still on this VM and on two sandbox VMs and log the PSNR of each pair.
18. Publish the build with its review page. Record the URL in `kit/PROGRESS.md` and `README.md`.
19. Post a status with the spike still, shown inline.

Statuses are due from step 4 on, at the rhythm in `AGENTS.md`, whatever step you are in.

Gate:

- A push has succeeded.
- G1, G2, G3, G4, G8, G9 and G10 are met.
- The workspace record, the tool record with the sound tools, the voice and the audio map skill, the terms that were read, the platform's limits, the pinned versions and the render budget table are in `kit/PROGRESS.md`.
- The inline display method is recorded, or the log says none exists.
- Whether the repo is private is recorded, and so is the way a large file reaches Brandon.
- The polling test and the PSNR between VMs are logged.
- The clock has ticks, and statuses have been posted since step 4.
- The build is published, or the log says why it could not be.

## Phase 1 · The voice, the map and the animatic

Read first: `kit/01-FILM.md`, sections 7 and 8 of `kit/03-METHOD.md`, section 8 of `kit/05-ARCHITECTURE.md`, `config/showcase.json`.

The film's timing exists, with the real voice on the real music, before anything is built in 3D. Brandon hears the voice here for the first time. The build does not stop for him.

Steps:

1. Build `npm run audiomap` and make `cut/MAP.json`, as `kit/03-METHOD.md` section 8 says. Log how it compares with `music.landmarks`.
2. Build `npm run voice`. Make the eight narration clips, as `kit/03-METHOD.md` section 7 says, each inside `narration.maxTakesPerClip`. Post a status with the waveform sheet as each batch is kept.
3. Build `npm run cut` and make the first `cut/CUTLIST.json` from the map, the lengths of the kept clips and the shape in `kit/01-FILM.md`: the span of every place, a shot and a key frame for every key, the frame of every line, the events, the titan frame and the one cut in the music.
4. Build `npm run mix` in its first form, music and voice, and make a mix.
5. Build `npm run animatic` and make the animatic.
6. Look at one frame of every shot. Check each line of the narration against the picture it falls on.
7. Commit and push. Run `npm run review` and publish, so the animatic and every clip play on the review page.
8. Post a status with two frames of the animatic shown inline and the review page link. Say that the animatic is the film's timing, made from the approved pictures with the real voice and music, that the voice can be heard there now, and that the build is continuing.

Gate:

- D1 is met.
- `cut/MAP.json` exists, and the log says how it was made.
- Every narration clip has a kept take or an open item. If no narration could be made, the log says so and the cut list uses `narration.placeholderClipSeconds`.
- G11 and G16 were run on the cut list and their results are logged.
- The animatic is on the review page, or the log says why not, and a status was posted.

## Phase 2 · Engine and blockout

Read first: `kit/01-FILM.md`, `kit/02-SUBJECT.md`, `kit/03-METHOD.md`, `kit/04-LOOK.md`, `kit/05-ARCHITECTURE.md`, and the checks, the judged frames, the packs and R4 blockout in `kit/07-QUALITY-BAR.md`.

The whole film plays from its first frame to its last before anything is finished. Everything in this phase is a stand-in except the cameras, the timing and the layout of each place.

Steps:

1. Build the shared engine: time, the camera system driven by the cut list, the sample and post chain, and the diagnostic views of `kit/04-LOOK.md` section 5.
2. List every part of every unit in `parts/PARTS.json` as `stand-in`, with the hash of its files as they stand and, once the cameras are fitted in step 6, its reference picture for G13. Block each place out from its layout sketch: rough land with its features in the right places and at the right scale, flat moving surfaces for the fluids, plain shapes for the animals, each in its place's main colour. The reveal's stand-in is the continent as a flat shape in two plain colours, land and sea, traced from the master, with the camera rising over it. A stand-in never draws an approved picture.
3. Build the film: every shot of the cut list with its camera move, the transitions as plain cuts for now, the rise with its eased curve, `filmState`, and `autopilot` with the mix.
4. Build `loop` mode on the stand-in of the unit named in `deliver.cardLoop.unit`, with the loop's frame count from the config. Its motion does not have to close yet: that is Phase 5.
5. Build the remaining harness commands: `measure`, `pack`, `sound`, `film`, `loop`, `stress` and `render:local`.
6. Fit each camera roughly: every key's frame shows what its approved picture shows, from about where it shows it.
7. Write `cut/SHOTS.md`: the lens, the move, the start and end framing, the focus and the key of every shot.
8. Run `npm run budget` on this scene and update the table.
9. Write the judged list into `kit/PROGRESS.md`.
10. Run the first blockout round: machine checks, then R4 blockout. It is a floor round. If its pass bar does not hold, fix what it raised. Run a second round only if the count and the clock allow, up to `quality.blockoutMaxRounds`.
11. From the final build of this phase: render the blockout film at the `draft` tier with `npm run film`, in `formats.preview` at `film.previewFps`, with the mix. Run `npm run render:local -- --proof` for the film. Run `npm run keep -- --film`.
12. Publish and post the status with the whole film sheets and the link, saying that the whole film now plays as a blockout.

Gate:

- G1 to G12, G15 and G16 are met.
- R4 blockout scores at least `quality.blockoutPass` with no severe issue open, or its limit was reached.
- Every issue the blockout critic raised that is still open is under "Open items", marked as carried to the phase that will settle it.
- The judged list is in `kit/PROGRESS.md`, and `parts/PARTS.json` lists every part.
- D2 and D7 are met.
- The film plays in `autopilot` from the published address, or from a local copy if publishing is not available here.

## Phase 3 · The look lock: the Heart

Read first: `kit/02-SUBJECT.md`, `kit/03-METHOD.md`, `kit/04-LOOK.md`, `kit/06-ASSETS.md`, `kit/07-QUALITY-BAR.md`, and "The Heart (place 2 of 6)" in `references/drafts/NOTES.md`.

Take one place all the way to the bar before anything is spread across the others. The unit is `lookLockUnit` in the config. It was chosen because it has everything the other places need: a fluid, weather you can see through, glow that lights what is near it, an animal that walks, a dead one, and a large event. What works here becomes the recipe for the rest.

Steps:

1. Study before building. Look at the real photographs the reference run used for the Heart, listed in `references/drafts/working/real/CREDITS.md`, beside the five approved pictures. Find footage of lava lakes and study how the crust moves. At most `assets.maxStudySources` sources in all. Write what you learned in ten lines under "Look lock".
2. Build the Heart's parts with supporting agents in parallel, one owner for each folder. One split that works: the lava surface with its plates, seams, foundering and spatter; the vessel mouth and its lava fall; the caldera walls and the bench; fume, heat shimmer, sulphur steam and the sky; the crust-walkers with their rig, their cycle and their herd; the one that sank; the light, the exposure, the lens and the grade; the Heart's sounds.
3. Integrate. Fit the camera of every shot of the Heart to its key. Set the light, the tone curve and the grade against the establishing picture. These become the defaults for the film.
4. Run `npm run budget` and update the table.
5. Send `heart` to its first round as soon as nothing in its frames is a stand-in. Then run rounds with the measures and R1, R2, R3 and R4 until the pass bar holds, `quality.lookLockMaxRounds` is reached, or the clock ends the loop.
6. From the final build of this phase: `npm run compare` for the five keys, then `npm run keep`.
7. Write "Look lock" in `kit/PROGRESS.md`: every locked setting; each technique that worked and each that did not, with what it cost to render; and the recipe, as numbered steps with commands, for making one more landform, one more fluid, one more volume of weather, one more kind of animal with its cycle and its herd, one more sky with its light, and one more bed of sound. Phase 4's agents work from those recipes.
8. Make the Heart's sounds, inside their limits, and a mix. Render the Heart review clip with `npm run film -- --unit heart`: the Heart's span of the film in `formats.hd` at `film.fps`, with the narration, the music and the sounds, at the highest tier whose time `npm run budget` says fits `sandbox.reviewClipMaxHours` when split across render agents, and never below `draft`.
9. Commit the built assets. Run `npm run keep -- --film`, then `npm run review`, and publish.
10. Mark `heart` `finished` in the "Units" table with the commit and what ended its loop. Run `npm run gate -- --phase 3` and log the evidence. Tick the clock one last time for this phase. If it prints `budget report: due`, file the budget report and stop there: the review stop comes after the continuation.
11. Otherwise mark Phase 3 `done`, write `waiting` under "Review" and the filled-in `REVIEW` block under "Last report block", commit and push. From this moment no budget report is filed and the build's clock is not ticked until the Heart is approved.
12. End the task with the `REVIEW` block, as "REVIEW" below describes. Its pictures come from `npm run status -- --no-tick --no-render --sounds`.

Gate:

- The machine checks are met, with G13 covering `heart`.
- The pass bar holds for `heart`, or its limit was reached.
- Five comparison images are committed.
- "Look lock" is written, with the six recipes.
- D3 is met.

Steps 11 and 12 come after the gate.

## A review round

A task whose prompt contains the line `Review notes.` and that finds "Review" at `waiting` does this. So does a task that finds "Review round" at `round N in progress`, starting at the step after "Review round step".

After each step, write its number under "Review round step" in `kit/PROGRESS.md` and push.

1. Before anything else, in one commit: N is "Review rounds" plus one, write `round N in progress` under "Review round" and `1` under "Review round step", and copy Brandon's notes under "Notes from Brandon" as numbered items of review round N, in his words. Push. Tick with `npm run clock -- --review-round N`. Every status in the round ticks the same way, and statuses fall due at the same rhythm as in a phase.
2. Sort the items: the voice as a whole, one clip or one line, a sound, the level of something in the mix, the timing of the film, how the Heart looks or moves, or a decision on something listed under "For Brandon to decide". Post a status that lists the items as you understood them and the order you will work them in. It is not a question.
3. Work the voice and sound items. Each clip, line or cue he names gets up to its take limit of new takes, steered by his words. If he names a different voice, or asks for the whole voice to change, write the new choice under "Voice" and make all eight clips anew, each inside `narration.maxTakesPerClip`. Keep the takes he heard beside the new ones until this round's own block has been posted. Then run `npm run cut` and `npm run mix`.
4. Work the picture items, the ones he stressed first. A change to the Heart gets rounds on `heart` inside `quality.maxRoundsPerUnit` for this request. None is a floor round: each starts only while the round's clock prints `extra rounds: yes`. If a locked setting changes, update "Look lock".
5. When the items are done, or the clock prints `extra rounds: no`: finish the one fix in hand and list what is left under "Review items not done".
6. If any frame of the Heart or the cut list changed, render the Heart review clip anew, once. If the cut list or a clip changed, make the animatic anew, once. If only sound changed, join the existing picture with the new mix. Run `npm run review` and publish. The block's pictures come from `npm run status -- --review-round N --no-render --sounds`.
7. Write N under "Review rounds": the round's own number, not one more than what is there. Write `none` under "Review round" and clear "Review round step". Write the `REVIEW` block under "Last report block", with one line added at its top: what review round N changed and what it did not. Commit, push, and end the task with that block.

A review round never approves the Heart, never starts Phase 4 and never files a budget report. "Review" stays `waiting`.

## After the review

A task whose prompt contains the line `The Heart is approved.` and that finds "Review" at `waiting` does this before anything else.

1. In one commit: copy whatever notes the prompt holds under "Notes from Brandon", in his words, and into the "Review items" table as numbered items, each `open`. Write `approved` under "Review" and `in progress` for Phase 4. Push. If an archive of the build's sounds came with the prompt, unpack it to where the kept sounds live. Never commit it while the repo is public.
2. Tick the clock with `npm run clock -- --phase 4`.
3. Sort the review items by when they are worked:
   - About the Heart, the look or the grade: now, before Phase 4's agents start, because every other place is built from the look lock. A change to the Heart gets rounds on `heart` inside `quality.maxRoundsPerUnit` for this request. None is a floor round. Update "Look lock" with what changed.
   - About the voice, a sound or the mix: now. New takes inside their limits, then `npm run cut` and `npm run mix`.
   - About another place, the rise or the film as a whole: in the phase that builds it. Write the phase beside the item.
   - A decision on something under "For Brandon to decide": log it.
4. Post a status that lists the items as you understood them and when each will be worked. It is not a question. Carry on with Phase 4.

A task that starts with "Review" at `approved` carries on from the phase in progress. Items still `open` in "Review items" are worked as step 3 says. It does not need the notes a second time.

A review item is never a reason for a second stop. One that cannot be done inside the limits is marked `not done` with the reason and listed in the `BUILD COMPLETE` block.

## Phase 4 · The other places and the rise

Read first: `kit/02-SUBJECT.md`, `kit/03-METHOD.md`, `kit/04-LOOK.md`, `kit/06-ASSETS.md`, `kit/07-QUALITY-BAR.md`, the "Look lock" and "Notes from Brandon" sections of `kit/PROGRESS.md`, every file in `kit/addenda/`, and the section of `references/drafts/NOTES.md` on each place as you come to it.

Finish the units in `buildOrderAfterLookLock`. Build them side by side with supporting agents, as many units at once as the agent slots allow, taken in that order. Build agents take at most `sandbox.maxAgents` less `sandbox.criticSlots` of the slots, so critics, jurors and render agents can always start when a round is due. You integrate each unit, run its checks and its critics, and decide when it is finished.

For each place:

1. Build its parts by the recipes in "Look lock". Each agent owns its folders and nothing else, tunes inside `assets.maxTuningLooksPerPart`, pushes its looks with every heartbeat, and stops when its part is built. Give each agent the place's approved pictures, its section of `kit/02-SUBJECT.md`, `kit/04-LOOK.md` and "Look lock".
2. Integrate the place. Fit the camera of every shot to its key. Set its light and weather against its establishing picture, inside the film's grade. Make its sounds.
3. Send the unit to its first round as soon as nothing in its frames is a stand-in. Then run rounds with the unit's measures and R1, R2, R3 and R4 until the pass bar holds, `quality.maxRoundsPerUnit` is reached, or the clock ends the loop.
4. From the unit's final build: `npm run compare` for its five keys, then `npm run keep`.
5. Mark the unit `finished` in the "Units" table of `kit/PROGRESS.md` with the commit and what ended its loop.
6. Commit its built assets, push, run `npm run review`, publish and post the status for that unit with its comparison images and one sheet of its motion.

For `reveal`, the same six steps, with these differences:

- Its parts are the continent, its relief, the sea, the cloud layers, the storm, the glow of the Heart, the atmosphere and the edge of the planet, and the handoff from the Eye.
- Its rounds add R8, and its machine checks include G12 and G15.
- Its handoff shows the Eye, so its first round starts after the Eye's first round. If the clock prints `box end: reached` before that, it starts at once with the Eye as it stands, and the three handoff frames are rendered anew, once, when the Eye is finished.

Clock rules 3 and 4 in `AGENTS.md` apply to every unit here. Once the clock prints `half point: reached`, a unit with no stand-in left goes to its round at once. Once it prints `box end: reached`, every part that is still a stand-in is finished with its fallback and its unit goes to its round.

Gate:

- The machine checks are met, with G13 covering all seven units built so far.
- Every unit in `buildOrderAfterLookLock` is marked `finished`: its pass bar held, or its limit was reached.
- A comparison image is committed for every key.
- Every sound has a kept take or an open item.

## Phase 5 · The whole film

Read first: `kit/01-FILM.md`, sections 7 and 9 of `kit/03-METHOD.md`, `kit/04-LOOK.md`, `kit/07-QUALITY-BAR.md`, and "Open items" and "Review items" in `kit/PROGRESS.md`.

Seven finished units become one film. The unit is `film`. Its parts are the opening approach, the ending, the card loop, and any transition that draws something of its own. A plain cut is not a part.

Steps:

1. Run the pick, as `kit/07-QUALITY-BAR.md` defines it, and write its result into the config and `kit/PROGRESS.md`.
2. Build the opening approach, every transition between places and the ending, as `kit/01-FILM.md` describes them. Remove every stand-in path that is left.
3. Go through the film against the cut list: every line on the picture it names, every event on its accent, the titan on the strike. Move what is off. Run `npm run cut` if a span moved, and update the frame numbers of the judged list.
4. Set one grade across the film. Look at `npm run sheet -- --establishing` and at the whole film sheets, and bring any place that sits outside the others into line without losing its own colour.
5. Build the card loop for the unit the pick chose: one shot in which every motion closes on itself, as `kit/03-METHOD.md` section 9 says. Check its seam with G14.
6. Finish the sound: every bed and spot sound placed, the music ducked under the voice, the one cut in the music made. Run `npm run mix`.
7. Render the preview film from this build with `npm run film`: `formats.preview` at `film.previewFps`, with the mix, at the highest tier whose time `npm run budget` says fits `sandbox.previewFilmMaxHours` when split across render agents, and never below `draft`. Run `npm run stress`.
8. Run the first round on `film`: machine checks, then R2, R4, R5, R6 and R7. It is a floor round. From this round on G13 covers every part there is, so the opening, the transitions, the ending and the loop must be finished by now: one that is still a stand-in is finished first, by the fallback chain, after three failed tries at its method or once the clock has printed `box end: reached`. Run more rounds only while the count and the clock allow, up to `quality.wholeFilmMaxRounds`.
9. After a change to shared code in this phase, check each finished unit as "Freshness" in `kit/07-QUALITY-BAR.md` says.
10. Mark `film` `finished` in the "Units" table with the commit and what ended its loop. Run `npm run keep -- --film`, then `npm run review`, publish, and post the status with the whole film sheets, the sheet of establishing frames and the link.

Gate:

- The machine checks are met, including G7, G11, G12 and G14 to G16, with G13 covering every part.
- The pass bar holds for `film`, or its limit was reached.
- D4 is met.
- The film plays in `autopilot` and the loop in `loop` from the published address, or the log says why not.

## Phase 6 · Polish and deliver

Read first: `kit/01-FILM.md`, sections 7 to 9 of `kit/05-ARCHITECTURE.md`, `kit/07-QUALITY-BAR.md`, `kit/09-QA-GAUNTLET.md`, and "Notes from Brandon", "Review items" and "Open items" in `kit/PROGRESS.md`.

Steps:

1. Work what is open, the review items first, then the open items from every unit, worst first, for up to `quality.polishMaxRounds` polish rounds. Every polish round is an extra round: start one only while the clock allows. In each round fix a batch, then run the measures and the critics that raised those issues on the frames they touch. After a change to shared code, check each finished unit as "Freshness" in `kit/07-QUALITY-BAR.md` says.
2. Freeze the build: nothing under `src/`, `public/` or `config/` changes from here on except to fix a machine check or a failed QA item.
3. Render every judged frame and every comparison image from the frozen build, with the work split across sandbox agents. Run `npm run keep`.
4. Run the record round, as `kit/07-QUALITY-BAR.md` defines it. Write the scores into `kit/PROGRESS.md` as the final scores.
5. Mix the final soundtrack with `npm run mix -- --final`. Run `npm run cut` so `cut/CUES.md` matches it.
6. Render the film from the frozen build, with the final mix:
   1. First the preview film, as in Phase 5 step 7. It always exists before anything larger is started.
   2. Run `npm run budget` for the master. What has to stay free after it is the sum of `sandbox.hdFilmMaxHours`, `sandbox.cardLoopMaxHours` and `budget.finishMarginHours`: call it the tail. If `deliver.sandboxMaster` is true, and the estimate is at most `sandbox.masterMaxHours`, and the estimate plus the tail is no more than the time left before the budget report, render the master here with `npm run film`, split across render agents. Then make `export.files.hd` from it.
   3. Otherwise render the film in `formats.hd` at `film.fps`, at the highest tier whose estimate fits `sandbox.hdFilmMaxHours`, and never below `draft`. Write an open item headed `The 4K master is to be rendered on Brandon's Mac`, with the estimate that ruled it out here.
   4. The master ends here, unfinished, in two cases: a chunk of it runs past its limit twice, or the time left before the budget report falls to the tail while it is still rendering. Then keep what exists under `out/work/`, render the film in `formats.hd` as the line above says, and give the reason in the open item. A chunk of the film in `formats.hd` that runs past its limit twice is rendered at the `draft` tier. If that runs past its limit too, the chunk is filled from the preview film scaled up, and an open item names its frames.
   5. Run `npm run keep -- --film`.
7. Render the card. The loop is rendered with `npm run loop` in `formats.master` at `film.fps` at the `final` tier if `npm run budget` says that fits `sandbox.cardLoopMaxHours` when split across render agents. Otherwise it is rendered in `formats.hd` at the highest tier that fits, never below `draft`, with an open item that says the full-size loop is to be rendered on Brandon's Mac. The card still is loop frame 0, rendered in the same format and at the same tier as the loop, so the two are the same picture. Run `npm run keep -- --deliver`.
8. Run `npm run render:local -- --proof`.
9. Write `README.md`: what this is; the review page address; what is in `deliver/`; how to render the film and the loop on a Mac with `npm run render:local`, starting with the test; where the sound files are, where the final mix has to be placed for the local render, and what to do if a clean clone has none; where the comparison images and scorecards are; and the credits from `ASSETS.md`.
10. Run `npm run review` and publish the final build. Hand the files to Brandon by the way Phase 0 found: the film, its copy in `formats.hd`, the preview film, the full-size card loop, its web copy, the card still, and one archive that holds the final mix and every kept narration clip and sound. The archive is handed over whether the repo is public or private, because the local render needs the mix. A film file too large for that way is cut into parts at shot boundaries without being encoded a second time, with a text file that lists the parts in order and the one `ffmpeg` command that joins them. Three tries, each with parts half the size. Then log an open item and leave the file in `deliver/film/`.
11. Run every item in `kit/09-QA-GAUNTLET.md` and record the evidence. If an item fails, fix it, do step 12, and only then run the gauntlet a second time, for at most `quality.gauntletMaxPasses` passes in all. A second pass and a second record run are extra: they happen only while their counts allow and the time left before the budget report is at least `budget.recordRoundHours` plus `budget.finishMarginHours`. When they are not allowed, make only fixes that change no pixel, and list every other failing item under "Failed QA items" with the fix it would need. The scores in the `BUILD COMPLETE` block must always be the scores of the build that is delivered. Item 15 is the one exception: a stand-in found there is always finished with the fallback chain and the frames it touches are rendered anew, as floor work. If no record run is left for it, the `BUILD COMPLETE` block names that part and says the final scores were taken before it changed.
12. If a fix in step 11 changed anything under `src/`, `public/` or `config/`: render the judged frames it touched, run `npm run compare` for their keys, run `npm run keep`, and run the record round, for at most `quality.recordRoundMaxRuns` runs in all. If the fix changed what the film or the loop shows, render the affected chunks once more, join them, make the smaller copies, and run `npm run keep -- --film --deliver`. In every case run `npm run determinism` and `npm run render:local -- --proof` once more, so their evidence comes from the build that is delivered, then `npm run review`, publish, and hand over the files that changed.
13. Write `complete` under "Build" and the filled-in `BUILD COMPLETE` block under "Last report block" in `kit/PROGRESS.md`. Commit and push.

Gate:

- The machine checks are met, with G13 covering every part.
- The polish rounds ran to their count or to the clock.
- D5, D6 and D7 are met.
- Every item in `kit/09-QA-GAUNTLET.md` has its evidence in `kit/PROGRESS.md`. An item that still fails after the last pass is listed under "Failed QA items" with what was tried.

## REVIEW

At the end of Phase 3, and at the end of every review round, end the task with exactly this block, filled in. Above it, show inline up to `status.maxPictures` pictures: the Heart's establishing frame beside its approved picture, one sheet of the Heart in motion, one detail beside its approved picture, and the waveform sheet of the narration. Attach the Heart review clip and the animatic if the thread carries them. If the repo is public, attach the archive of every kept sound.

```
REVIEW
This is the one stop. The Heart is finished and the other five places are not built yet. Watch the Heart with the sound on and listen to the voice. Everything else is built to what you approve here.
Where everything plays: <url>/review.html
Watch first: the Heart, in motion, with the voice, the music and the sound. It is the first video on that page.
That clip was rendered at: <frame size, frames a second and tier. If the tier is not final, say that the finished film will be smoother and cleaner than this clip>
Then listen: all eight narration clips, under Listen on the same page.
The animatic: the whole film's timing, made from your approved pictures, on the same page.
Voice: <the voice used, and whether it came from the kickoff prompt or was chosen by the Builder>
Clips with no usable take: <list, or "none">
Music: <found and matched, found with a different hash, or not found>
Time used: <hours> of <hours allowed>
The Heart: <passed, or the limit that ended it, with its scores>
Open items on the Heart: <count, and the worst five>
Parts finished with a fallback: <list, or "none">
Animals kept at a distance: <list, or "none">
For Brandon to decide: <list, or "none">
Sound files: <"committed to the repo" or "held back because the repo is public: the archive is attached">
What happens next is yours:
- To change the voice, the sound or anything you see, as many times as you like: send the review notes prompt from kit/10-KICKOFF.md.
- When the Heart is right: send the approval prompt from kit/10-KICKOFF.md. The other places and the rise to orbit are then built the same way, and nothing stops until the film is delivered.
```

## BUILD COMPLETE

When the Phase 6 gate is met, end the task with exactly this block, filled in, and show inline above it the card still, the sheet of establishing frames, one sheet across the rise, and the titan frame:

```
BUILD COMPLETE
The film: <the 4K master, and how it was handed over. Or: "delivered here in 1080p at the <tier> tier. The 4K master is to be rendered on your Mac with the prompt in kit/10-KICKOFF.md", with the reason>
Length: <minutes and seconds>, <frames> frames at <frames a second>
The card: a loop of <seconds> seconds from <place>, chosen by <the pick, with its votes>. Its web copy and the still are in deliver/ in the repo. The full-size loop is with the film, rendered at <frame size and tier>
Where everything plays: <url>/review.html
Watch it in the browser: <url>
Side by side with your pictures: out/stills/
Scorecards: scorecards/
Voice: <the voice used>
Music: <how the cut follows it, and where the one cut in the music is>
Sound files: <"committed to the repo" or "held back because the repo is public: the archive is attached">
Time used: <hours> of <hours allowed>, and <hours> in review rounds
Rounds run: <number>
Units: <for each of the eight: passed, or the limit that ended it>
Final scores: R1 <lowest key and its score>, R2 <pass or fail, with the failing units>, R3 <lowest>, R4 <lowest>, R5 <n>, R6 <n>, R7 <n>, R8 <share, pass or fail>
Measures: M2 <lowest share and its frame>, M3 <lowest ratio and its key>
Open items: <list with the unit and frame of each, or "none">
Review items not done: <list, or "none">
Declined issues: <list with the reason for each, or "none">
Failed QA items: <list, or "none">
Parts finished with a fallback: <list with the step of the chain that ended each, or "none">
Animals kept at a distance: <list, or "none">
For Brandon to decide: <list, or "none">
What I would improve next: <one to three lines>
```

## BUDGET REPORT

When "The budget report" in `AGENTS.md` applies, end the task with exactly this block, filled in, and show up to `status.maxPictures` pictures of where the build is inline above it: the newest establishing frames and the newest comparison images.

```
BUDGET REPORT
Time used: <hours> of <hours allowed>
Where everything plays: <url>/review.html
Phase: <current phase and step>
Phases done: <list>
Units: <for each: finished and how, in progress and its last scores, or not started>
Still to do: <every remaining phase and step, in order, with the floor work marked>
Open items so far: <count, and the worst three>
Credits used so far: <the figure, if this workspace shows one, or "not shown here">
What I would do next: <one to three lines>
To continue: send the continue prompt from kit/10-KICKOFF.md
```

## Extensions

An extension is one more polish pass Brandon asks for after completion. It starts when a task's prompt contains the line `Extension.` and "Build" says `complete`. It carries on when a task starts and "Build" says `extension N in progress`.

After each step below, write its number under "Extension step" in `kit/PROGRESS.md` and push. A task that carries an extension on starts at the step after that number and never does a finished step a second time.

1. Write `extension N in progress` under "Build" in `kit/PROGRESS.md`, where N is one more than "Extensions". Copy any notes Brandon put in the prompt under "Notes from Brandon", in his words. Push. Tick the clock with `--extension N`. Statuses in an extension tick with `--extension N` too.
2. Unfreeze. Apply the notes logged in step 1. A clip or a sound he names gets up to its take limit of new takes. Then run up to `quality.polishMaxRounds` polish rounds, worst open item first, as Phase 6 step 1 describes. Start a round only while the extension's clock prints `extra rounds: yes`. When it prints `extra rounds: no`, finish the one fix in hand and go to step 3.
3. Freeze the build.
4. Render every judged frame and comparison image from the frozen build.
5. Run the record round once.
6. Do Phase 6 steps 5 to 10 once: the final mix, the film, the card, the proof, the README, the review page, the publish and the hand over. A chunk whose record still matches is not rendered a second time. An extension has no budget report, so there the master is started when `deliver.sandboxMaster` is true and its estimate is at most `sandbox.masterMaxHours`, and it ends unfinished when a chunk runs past its limit twice or when the render as a whole has run for that many hours times `budget.jobOverrunFactor`.
7. Run the QA gauntlet once. An item that fails is fixed if the fix changes no pixel. Otherwise it is listed under "Failed QA items". There is no second pass and no second record round in an extension.
8. Write N under "Extensions": the extension's own number, not one more than what is there. Clear "Extension step", write `complete` under "Build" and the new block under "Last report block", commit, push, and end with the `BUILD COMPLETE` block.

An extension has no budget report and no review stop.
