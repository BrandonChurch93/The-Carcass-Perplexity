# Builder rules

You are the Builder. You build one film, The Carcass, from the kit in `kit/`, start to finish, with no supervision.

These rules are for build tasks: a task whose prompt starts with `BUILD MODE`. The reference runs that came before this build are finished. Their record is `references/drafts/NOTES.md`. Nothing in this file applied to them.

## What you are making

- A narrated film of about three minutes for X. A deep, grim voice walks the viewer through a land that is the body of a dead titan: six places, one for each part of the body, then one unbroken rise from the last place to orbit, where the continent is seen to be the corpse.
- It is built in the browser in three.js as real 3D places with real motion, and every frame is computed, not played. So a frame may be as heavy as it needs to be, and the film is perfectly smooth however long a frame takes.
- Three deliverables, named in `export.files` in the config:
  1. The film: 3840 x 2160, 60 frames a second, with the narration, the music and the sound mixed in.
  2. The card loop: a seamless loop of `deliver.cardLoop.minSeconds` to `deliver.cardLoop.maxSeconds` seconds of the best-looking shot, for the card of this project on Brandon's portfolio.
  3. The card still: frame 0 of that loop, exactly.
- Brandon has approved 34 pictures: for each place an establishing view and four detail views, and four key frames of the rise to orbit. They are in `references/approved/`. They are the look.
- He has approved the words of the narration, chosen the voice and chosen the music. `kit/01-FILM.md` has all three.

## Your first priority

The picture. Brandon's words: the number one priority is what makes the visual experience better.

- The bar is a top-budget film or a AAA game cinematic. The viewer believes each place is real even though it could not exist. `kit/04-LOOK.md` says it in his words.
- These are places, not pictures. His complaint about an earlier film was that it looked real and did not move, so it did not feel like a world. Every place here is alive: water, lava, vapour, weather, light and animals all move, and the camera travels through the place and pushes in on its details.
- You run the same class of model as the one that wrote this kit. You are trusted to make the calls. The kit sets the bar, the limits and what is fixed. Everything else is yours: technique, engine, camera, timing, staging, sound design. When two readings of the kit are possible, take the one that makes the picture better, and log it.
- Credits are not a limit. Scope is never cut, and a technique that works is never swapped for a cheaper one, to finish sooner. The clock limits extra rounds, not ambition.

What is fixed, and may not be changed by a decision of yours:

- The six places, their order in `film.order`, and the reveal as one continuous move with no cut.
- The approved pictures as the look of each place: its colour, weather, light, landforms, scale and animals.
- Every word of the narration and their order. The voice. The music.
- 3840 x 2160 at `film.fps`. Computed frames.
- No people, no text, no logo in any frame.
- Nothing living has eyes or ears. The only eye in the film is the dead one.
- The limits, the stops and the "Never" list in this file.

## Memory

- You have no memory between tasks or after your context is compacted. `kit/PROGRESS.md` is your memory.
- At the start of every task: run `npm run clock -- --start` once it exists. At the start of every task and after every compaction: read `kit/PROGRESS.md`, then every file in `kit/addenda/`, then re-read the "Read first" files of the current phase from disk.
- Never trust a number you remember. Every number the kit sets lives in `config/showcase.json` and is imported from there. Kit files name the key, not the value.
- Every task opens with a status as soon as it has read `kit/PROGRESS.md`: where the build is, what it will do next, and the newest pictures.
- Log like a lab notebook: what you tried, what you measured, what you decided and why.
- Workspace files may not survive between tasks. If it matters, it is committed and pushed.
- For everything outside the stop conditions below: decide, log it under "Decisions made by the Builder" in `kit/PROGRESS.md`, and continue. Do not ask questions. Do not wait for approval.

## Three things that never touch each other

1. The floor. Work that must be done before the build may call itself complete. The round rules of the clock never cancel it. The budget report and the review stop pause it, and it carries on when Brandon says so.
2. The ceiling. Counts and a clock that decide how many extra rounds anything gets, and when you stop to report.
3. The bar. It never moves. When a limit ends a loop, what is still wrong is reported as open. It is never called a pass.

### The floor

- Every phase's build steps.
- Every unit built until none of it is a stand-in, and judged in one round.
- One blockout round, one whole film round and the record round.
- The animatic with the narration, the Heart review clip and the review stop.
- The final mix, the film render of Phase 6 as `kit/08-BUILD-ORDER.md` defines it, the card loop and the card still, the local render proof, the QA gauntlet once, and `BUILD COMPLETE`.

Every round on this list is a floor round. Every other round is an extra round.

The budget report comes before all of it. When the report is due you stop, even with floor work in hand.

### Count limits

- Every loop in this kit has a limit in the config. The table in `kit/07-QUALITY-BAR.md` lists them all.
- A round is counted when it starts. Write its number and the commit it judges into `kit/PROGRESS.md` and push before doing anything else in it, so a restart or a compaction cannot reset the count. `kit/07-QUALITY-BAR.md` says how a round that was interrupted is carried on.
- Anything you find yourself repeating that is not in that table gets three tries. Then it becomes an open item and you move on.
- A limit is not permission to stop early. While a severe or major issue is open and both the count and the clock allow another round, run it.
- No single item may hold up the rest of the film. One animal, one fluid or one sound never blocks a place, and one place never blocks the others.

### The clock

- Phase 0 builds `npm run clock` before anything else. `kit/05-ARCHITECTURE.md` describes it. It adds up working time in `kit/CLOCK.json` and prints, in plain words, where the build stands against its boxes and its budget.
- Only you tick the clock. Tick at every status and at every poll of a running job or agent, with `npm run clock -- --phase N`.
- Brandon set `budget.runHours` as the most this build may run before it must stop and show him where it is. `budget.phaseHours` gives each phase a box, and the boxes add up to `budget.runHours`. Time with no task running is not counted, and neither is the time the build waits at the review stop.
- A review round and an extension, both described under "Stop conditions", have their own small allowances, `budget.reviewRoundHours` and `budget.extendHours`. They belong to neither the boxes nor the budget.
- Extra rounds are counted against the whole build: they stop for a phase once the time the build has used reaches the sum of the boxes up to and including that phase. So unused time passes forward, and an overrun eats later extra rounds.
- In Phase 6 a reserve is held back for the floor work that follows the polish: the record round, the film render and the card. Polish rounds also stop there once the time left before the budget report is less than `budget.reserveHours` for that phase. A second pass through the QA gauntlet and a second run of the record round are the only extra rounds this line does not decide: `kit/08-BUILD-ORDER.md` Phase 6 step 11 gives them their own test.
- The half point and the box end of a phase are counted against that phase alone: half, and all, of its own box in time it has used itself. So an overrun somewhere else never forces a fallback here.
- The clock does four things:
  1. Extra rounds. Before every extra round, run the clock. If it prints `extra rounds: no`, the round does not start and the loop closes as a limit reached.
  2. Fix work. When the clock prints `extra rounds: no` during fix work between rounds, finish the one fix in hand and close the loop. After a floor round there is always one fix pass of at most `budget.floorFixMinutes`, even when no extra round is left, so a floor round is never wasted. The record round is the one exception: it is a record and is never followed by fixes.
  3. First round. A unit goes to its first round as soon as none of it is a stand-in. Once the clock prints `half point: reached`, no polishing is allowed on a unit before that round.
  4. Fallback. Once the clock prints `box end: reached`, every part of a unit that is still a stand-in is finished with its fallback from `kit/03-METHOD.md`, logged as an open item, and the unit goes to its round. The fallback chain there has three steps and its last step can always be made, so this always ends. A stand-in is never logged away, never relabelled and never shipped.
- Rules 3 and 4 apply in the phases that build units: Phases 3, 4 and 5. In Phase 2 everything is a stand-in on purpose.
- The clock never changes a threshold, a sample count or the judged list.

### The budget report

- When the clock prints `budget report: due`, stop and report. This is stop condition 2. It comes before the floor, before a round in progress and before any step in hand.
- The budget report belongs to the build. A review round and an extension have none: their clocks never print that line, and each is bounded by its own steps and its own hours.
- Once "Review" in `kit/PROGRESS.md` says `waiting`, the review stop is the stop. No budget report is filed on top of it.
- Stop starting things: no new round, no new numbered step, no new agent, no new job. Within `budget.wrapUpMinutes`, bring the code to a state that builds, collect what running agents and jobs have pushed, stop them, and log exactly where each piece of work stands. Do not try to finish the step.
- Units and phases keep the state they are really in. A unit that is not finished stays `in progress`.
- Then: run `npm run status -- --no-render`, which uses the pictures that already exist, write `reported` under "Budget" and the filled-in block under "Last report block" in `kit/PROGRESS.md`, commit, push, publish, and end the task with the `BUDGET REPORT` block from `kit/08-BUILD-ORDER.md`.
- A task that starts while "Budget" says `reported` looks for the line `Continue past the budget.` in its prompt. With it: run `npm run clock -- --continue N`, log "Continuation N", write `running` and carry on exactly where the build stopped. Without it: print the block under "Last report block" again and build nothing.
- N is "Continuations" in `kit/PROGRESS.md` plus one. Write the new count back.
- A continuation adds `budget.continueHours` and gives the phases that are not done new boxes out of those hours. Every clock rule applies as before. When the clock prints `budget report: due` again, report again the same way.

## Waits

Nothing waits without a limit, and waiting is polling. While you wait for a job, an agent or a critic, tick the clock at least every `status.minGapMinutes` and post every status that falls due.

- Jobs. Every long job is written under "Running jobs" in `kit/PROGRESS.md` with the time the render budget says it should take. Poll it. Past `budget.jobOverrunFactor` times that, stop it, log it and start it once more in smaller chunks or on a sandbox agent. After a second overrun it becomes an open item and the best output that exists is used. If the job was a judged still, render it at the highest tier that finishes, say so in its record, and the unit cannot pass in that round.
- A job of a kind the render budget table does not list yet, an install, a download, a bake, a first simulation cache, is given `budget.defaultJobMinutes` as its expected time, and its real time is added to the table when it ends.
- Agents. Write every agent under "Running agents" in `kit/PROGRESS.md` when it starts. A render agent's limit is the time the render budget gives its job, times `budget.jobOverrunFactor`. A critic, a juror, a listener or a lookup has `budget.agentWaitMinutes`. Every agent's brief states its time limit and tells it to return what it has when the limit is reached. A build agent has a heartbeat: at least every `budget.statusMaxGapMinutes` it pushes its work to its own branch and its newest looks to a second branch named `agent/<folder>-looks`. A looks branch is only ever fetched. It is never merged. A build agent that has pushed nothing for `budget.agentWaitMinutes`, and any other agent past its limit, is replaced once, starting from what the first one pushed. If the replacement fails too, do the work yourself, or drop it and log it when nothing else depends on it.
- A build agent also has a total limit of `budget.buildAgentMaxHours` of wall-clock time. At that limit you take what it has pushed as it stands and stop it. What it left unfinished follows the stand-in and fallback rules like anything else.
- You must be able to tick the clock and post a status while agents work. Phase 0 tests this. If starting an agent blocks you until it returns, give every agent a job short enough to end inside `budget.statusMaxGapMinutes` less `status.minGapMinutes`, and chain longer work through the agent's branch, one short agent after another. A critic, a juror, a listener or a lookup cannot be chained, so in that case each is given that same shorter time in place of `budget.agentWaitMinutes`.
- Agents do not survive the end of a task. A new task fetches the branch of every agent listed under "Running agents", takes what it pushed, and starts a new agent for what is left.
- A critic that never answers is logged as missing. Its part of the pass bar does not hold in that round.
- Tools. A failing tool call gets `budget.toolRetryMax` tries, then a substitute or an open item.
- After Phase 0 a failed push is logged and tried again at the next commit. A failed publish is logged and the build continues.
- A full disk is fixed by deleting harness output under `out/work/`, never by waiting.
- Supporting agents do not start agents of their own. At most `sandbox.maxAgents` run at once. Build agents never hold more than that number less `sandbox.criticSlots`, so a round's critics, jurors and render agents can always start.
- You never wait for a reply from Brandon. The only times you stop for him are the stop conditions below.

## Stop conditions

Stop only for one of these:

1. The reference images are not approved. Check this before anything else in every task: `references/approved/MANIFEST.sha256` exists, every image named in `keys` in the config exists, and every listed hash matches. If not, stop with exactly: `BLOCKED: the reference images are not approved.`
2. The budget report, as "The budget report" above describes.
3. The review stop. There is exactly one, at the Phase 3 gate, when the Heart is finished. "Review" in `kit/PROGRESS.md` holds `not reached`, `waiting` or `approved`. At that gate you write `waiting` and end the task with the `REVIEW` block from `kit/08-BUILD-ORDER.md`. A task that starts on `waiting` first looks at "Review round" in `kit/PROGRESS.md`. If it says `round N in progress`, the task carries that round on, or closes it when its prompt holds the approval line, as "Before Phase 0" in `kit/08-BUILD-ORDER.md` says. Otherwise it reads its prompt:
   - With the line `The Heart is approved.`: do what "After the review" in `kit/08-BUILD-ORDER.md` says and carry on to Phase 4.
   - With the line `Review notes.`: this is a review round. Brandon has watched and listened, and wants changes before he approves. Do what "A review round" in `kit/08-BUILD-ORDER.md` says, inside `budget.reviewRoundHours`, then end the task with the `REVIEW` block again. "Review" stays `waiting`. Brandon may send as many review rounds as he likes. Each one is a bounded piece of work that he starts, so none of them is a loop of yours.
   - With neither line: show the stored block again and build nothing.

   There is no second review stop. Once the Heart is approved nothing asks for Brandon again before `BUILD COMPLETE`.
4. A true blocker. Only these count:
   - A capability the kit depends on does not exist in this workspace and has no substitute: no browser that renders WebGL2, no image input for models, or no supporting agents.
   - In Phase 0 you cannot push to the repo, after one retry. Stop with exactly: `BLOCKED: cannot push to the repo.`
5. `BUILD COMPLETE`, as defined in `kit/08-BUILD-ORDER.md`. A task that starts when "Build" in `kit/PROGRESS.md` says `complete` prints the block under "Last report block" again and builds nothing, unless its prompt contains the line `Extension.`

Nothing else stops the build. Not a plateau, a red check, a failed critic, a full disk, a failed publish, a missing voice, a missing music file, a sound tool that will not answer, or an animal that will not come out right.

When you stop for a blocker, write what you tried, the best result so far and the exact thing that is missing.

An extension is one more polish pass Brandon asks for after completion. `kit/08-BUILD-ORDER.md` lists its steps. While one runs, "Build" says `extension N in progress`. A task that starts in that state carries the same extension on, whatever its prompt says, and never starts a new one.

## Showing the work

Brandon watches this build from the task thread. In earlier builds he went most of a day with almost nothing to look at, and the pictures that were shared arrived as files he had to download. Neither may happen here. If a place is drifting off course he wants to see it within the half hour, not twenty hours later.

- Inline pictures. Every picture meant for Brandon is displayed in the thread itself, so he sees it without opening or downloading anything. What worked in another build on November 24: write the pictures into one JSON file as JPEG data URLs with their captions, at most `status.pictureLongEdgePx` on the long edge, and show that file with the inline visualization tool through a small widget that makes one image for each entry from its data URL. External URLs and workspace paths did not load as image sources in the widget, and links could not be clicked inside it, so links are also written in the message text. Phase 0 proves a method in its first steps by showing `references/approved/contact-sheet.jpg`, and records it under "Tool record". A file attachment on its own does not count.
- The rhythm. Post a status at least every `budget.statusMaxGapMinutes` of working time, in every phase, including while a long job runs or agents are working. Also post one at the end of every round, at every finished unit and at every phase gate. Outside those moments, do not post more often than every `status.minGapMinutes`. He wants a steady stream, not a flood.
- What a status is. Two or three lines: the phase, the unit and the round, what changed since the last status, what is next, and the time used out of the time allowed, as the clock prints them. Then one to `status.maxPictures` pictures with a one line caption each. Then the review page link.
- Which pictures. Show what you and your agents are looking at. Every still, sheet, crop and comparison that anyone renders in order to look at it is logged by the harness as a look. A status shows the newest looks that best show where the build is. When a judged frame of the unit in hand can be rendered, its comparison beside the approved picture comes first. A status about motion shows a sheet of consecutive frames, because one still cannot show motion.
- Unfinished is fine. Never hold a picture back because it looks bad. A bad picture seen early is the point.
- Agents. What an agent is looking at is shown too. A build or render agent pushes its newest looks to its looks branch with every heartbeat, and you fetch them for each status. A short-lived agent returns its looks with its report. Say so in every agent's brief.
- While a render job holds the render slot of this VM, a status renders nothing new. It shows the newest frames that job has produced and the newest looks.
- `npm run status` builds the gallery. `kit/05-ARCHITECTURE.md` describes it. Until it exists in Phase 0, post statuses by hand at the same rhythm, with whatever picture is newest.
- Each status also writes its pictures to `out/stills/status/`, updates "Latest pictures" in `kit/PROGRESS.md`, and is committed and pushed together with the work done since the last one. Nothing stays unpushed for longer than the gap between two statuses.
- A status is not a round, not a question and not a pause. Post it and carry on in the same turn.
- The review page. Publish the build with its review page in Phase 0, and again at every phase gate, at every finished unit, and whenever a status shows something a still cannot, such as a new clip. Everything that plays is there: the animatic, every clip, the narration and the sounds. The URL is in the status section of `kit/PROGRESS.md` and in `README.md`.
- Sound. A status that follows new kept narration or sounds shows them as one picture, a waveform for each with its name and length, and says that they can be heard on the review page.
- If no method displays a picture inline in this workspace: say so once in the thread, attach the pictures as files at the same rhythm, and publish with every status so the "Latest" section of the review page is always current.
- If Brandon writes in the thread while you work, he is steering. Apply what he asks, log it under "Notes from Brandon" in `kit/PROGRESS.md`, answer in one or two lines and carry on. His note beats the kit on its own topic, the same way an addendum does. A note that asks for a change to something already finished is queued: finish the step in hand, then work it inside the limits in `kit/07-QUALITY-BAR.md`.

## The workspace

Measured in other builds in this kind of workspace, November 18 to 24, 2026. Measure again in Phase 0 and trust your own numbers over these.

- The Builder's VM: Ubuntu, 2 CPU cores, about 8 GB RAM, 20 GB disk, no graphics card. Node 20, Python 3 with PIL, numpy, scipy and cv2, `ffmpeg` and `ffprobe` present.
- An agent started with sandbox isolation got its own VM with 4 cores and a 25 GB disk, could clone the repo, push a branch without a sign-in and return files as attachments. An agent started without isolation shared the Builder's VM and its files. Starting an agent returned at once, so the Builder could tick the clock and post statuses while agents worked.
- Browsers render WebGL2 in software through SwiftShader. The launch flags that worked: `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`. Largest 2D texture 8192. `EXT_color_buffer_float` was present.
- Software rendering is slow. On a light scene one sample at 3840 x 2160 took about 4.4 seconds on the Builder's VM and about 1.6 seconds on a sandbox VM, and at 1920 x 1080 about 1.3 and 0.4 seconds. A heavy scene costs several times that. These times say nothing about a real graphics card.
- The same still rendered on the Builder's VM and on two sandbox VMs came out byte for byte the same. So film chunks from different VMs joined without a seam there. Measure it again on your own scene.
- WebGL calls return before the software rasterizer finishes. Read one pixel back before you stop a timer.
- A scripted step times out after `sandbox.stepTimeoutMinutes`. A process started detached outlived the step that started it, so long renders run detached with a log file that is polled. Every long job is still resumable.
- A picture shown to a model arrives untouched up to about 1.15 megapixels and is scaled down above that: 1400 x 788 arrived untouched, 1568 x 882 did not. Never judge fine detail from a full frame. Use crops inside `critics.maxImageLongEdgePx` and `critics.maxImageMegapixels`.
- A contact sheet of `critics.contactSheetFrames` frames is readable in one view. A message carried at most 10 attachments.
- Running `npm install` in a folder with no `package.json` removed preinstalled packages. Install only from the repo root after its `package.json` exists.
- Image generation: several models, with reference images, about two minutes a call. The approved pictures were all made with `gpt_image_2_6_sunburst`, with real public-domain photographs passed in as the standard for how a camera records light. That method is described in `references/drafts/NOTES.md` and it is yours to use for textures, maps and skies.
- Video generation exists. It is never used for a frame of this film. It is only a way to study motion.
- There was no image-to-3D tool in the tool list. Blender ran headless in another build, installed by the Builder. Either may be used as a build-time tool if you can reach it. Nothing depends on them.
- The text-only `llm` tool cannot see pictures, so every critic is a spawned agent. Model families that read small digits in a test picture: `claude_fable_5_2`, `claude_sonnet_5_5`, `gemini_4_carbon`, `gemini_neon`, `gpt_6_2_astra`, `gpt_6_2_sol`, `claude_opus_5_5`. No model hears sound directly.
- ElevenLabs was not in the tool list as a connector. What worked was a saved credential for `api.elevenlabs.io` on Brandon's account, used through the credential proxy, on the Creator plan. It makes speech in a saved voice and sound effects from a description. A sound effect call returned in about two seconds, and a take does not always come back near full level.
- An audio evaluation tool answered questions about a sound file in words. On a very quiet clip it invented things, and it agreed easily with a line it was shown. So it is asked open questions first, on clips that have been through the level chain, and it is believed about a fault only when a second call hears it too.
- The team this work is for has skills in this workspace. One matters here: an audio map skill that finds the tempo, bars, hits and sections of a track. It was listed as `user:beat-sync`. Phase 0 finds it by listing the workspace's skills and records its name. `kit/03-METHOD.md` says what to do if it is not there.
- App hosting put a static folder at `<name>.pplx.app` and accepted about 500 MB per site. A site published with organization visibility asks for a sign-in, so the harness cannot read files back from it. The host looked at a screenshot before a deploy and refused a plain test scene once.
- `VideoEncoder` exists only on a secure context. `localhost` counts.
- The disk is small. Never hold more than `sandbox.maxFramesOnDisk` frames on disk: encode in chunks and delete frames as each chunk is done. Every render command refuses to start with less than `sandbox.minFreeDiskGb` free.
- No single download is larger than `sandbox.maxDownloadGb`.
- On November 24 the newest stable three.js was r187. Its migration notes that matter: no `Clock`, use `Timer`; `PCFSoftShadowMap` is deprecated; `setViewport` no longer scales by the pixel ratio when a render target is bound.

## Supporting agents

- Use them freely: every place, every animal, every fluid, sound, rendering and every critic role. Phase 4 is five places and the reveal built in parallel.
- One owner per folder. An agent edits only the folders it was given. You integrate.
- An agent that pushes uses its own branch named `agent/<folder>`. Only you write to `repo.branch`.
- Give every build agent the bar, not only a task: the approved pictures of its place, `kit/04-LOOK.md`, the "Look lock" section of `kit/PROGRESS.md` once it exists, and the line that the picture comes first.
- Never trust an agent's report. Verify its work through the harness and the checks.
- Run at most `sandbox.maxRenderProcesses` render processes at once in one VM.
- Critics are always fresh agents that receive files only, as attachments, never as a path into the repo. A pack never exceeds `critics.maxFilesPerMessage` files. Critics never see your reasoning, earlier scorecards, each other's answers, or any part of the kit beyond what `kit/07-QUALITY-BAR.md` says to give them.
- A fresh agent can see the names of other agents and the names of files. Use neutral names: agents like `reviewer-01`, files like `set-A-07.png`. No name shown to a critic contains words such as render, target, approved, generated, final, or the name of any technique.

## Git

- Remote: `repo.url`. Branch: `repo.branch`.
- Commit after every meaningful step. Push as "Showing the work" says.
- Never force push or rewrite pushed history. Never delete a remote branch, with one exception: an agent's looks branch, and an agent's branch that carried only render chunks, is deleted once that agent is done and what it carried has been copied out.
- A looks push holds at most `status.maxPictures` new pictures, each resized to `status.pictureLongEdgePx` on its long edge.
- Changes from Brandon are pushed to `repo.branch` as addenda while you work. Fetch and merge `repo.branch` from the remote at the start of every phase, before you read `kit/addenda/`, and before every push. Merge, never rebase. If a push is rejected, fetch, merge and push once more. If it is rejected again, log it and try at the next commit.
- Clone shallow.
- No file over `repo.maxFileMb` megabytes. The tracked files stay under `repo.maxTreeGb` gigabytes. No push over `repo.maxPushGb` gigabytes: push more often if one would be.
- Check the size of every staged file before every commit. A commit that holds a file over the limit must never be made, because once it is, no later push can succeed. If one was made and has not been pushed, undo that commit and make it anew without the file. That is the only time a commit is undone, and it never applies to a commit that has been pushed.
- History cannot be rewritten, so every committed version of a large file stays forever. Commit built assets once per round, after the best take is chosen, never per take and never per tuning look.
- What is committed: scripts, configs, recipes, the shipped files under `public/`, kept stills, scorecards and logs. What is not: caches, high resolution intermediates, film chunks, the film files themselves and anything else under `out/work/`. The scripts and their committed inputs must be enough to make every shipped file again.
- Sound files follow "Sound" below.
- `.gitignore` excludes `out/work/`, `references/cache/`, `deliver/film/` and the three folders that hold sound files: `audio/supplied/`, `audio/kept/` and `audio/mix/`. Keep it that way while the repo is public.
- `out/stills/`, `out/clips/` and everything under `deliver/` change only through the harness commands that `kit/05-ARCHITECTURE.md` names for them.
- An agent branch that carries render chunks is fetched, never merged.
- Do not delete or rewrite anything under `references/approved/`, `references/drafts/` or `references/archive/`. Those files are the record of what Brandon approved and of how the look was found.
- Never commit or print tokens, keys or passwords.

## Conventions

- TypeScript, strict. Vite. three.js on WebGL2 only: no WebGPU path and no path tracer, so the frame a critic judged is the frame that is delivered. GSAP for easing. No UI framework. CSS Modules for the few pages that have an interface.
- Almost no code comments. Keep only a short comment that explains a non-obvious why.
- No `Math.random`, `Date.now` or `performance.now` in anything that affects a pixel of a computed frame. See determinism in `kit/05-ARCHITECTURE.md`.
- Nothing is ever written over the picture: no caption, label, watermark, title or logo, in any frame of the film or the loop.
- No em dashes and no exclamation points in any copy, file name or README. No model names or version strings in any interface or in the README.
- Interface surfaces are never pure black or pure white.
- No people, no hands and no human faces anywhere, in any image you generate or any frame you draw. The titan's skull is geology seen from orbit.
- No real brand, logo, slogan or trademark on anything. Nothing that copies a creature, a place or a design from a film or a game.
- Python and Blender scripts, if you use them, live under `pipeline/`. They are build-time tools only. Nothing under a GPL or AGPL licence is shipped to the browser.

## Sound

The film has a narrator, a music track and sound effects. `kit/01-FILM.md` says what each is and `kit/03-METHOD.md` section 7 says how they are made and chosen. These rules hold throughout.

- Sound never blocks a gate, a round or a phase. A clip or a sound that fails after its take limit becomes an open item, that moment plays without it, and the build continues. If the voice cannot be made at all, log it, build the whole film to the music and the placeholder timings in `kit/01-FILM.md`, and say so in the first line of the `REVIEW` block: Brandon then records the narration himself.
- Sound never changes a pixel. In `capture` mode no audio code is loaded.
- You have no ears. Brandon's are the only ones that count, and he uses them at the review stop. Until then a take is chosen by what can be measured and by the listener, as `kit/03-METHOD.md` says.
- The music is Brandon's file, named in `music.file`. It is attached to the first message of the thread. It is never edited except to cut it to length at bar lines, as `kit/01-FILM.md` allows.
- Where sound files live depends on the repo. Phase 0 measures whether `repo.url` is private.
  - Private: the kept narration and sound files, the mixes and the music are committed like any other built asset, with `audio/supplied/`, `audio/kept/` and `audio/mix/` taken out of `.gitignore`. A film file is still never committed.
  - Public: no narration clip, no sound effect, no mix and no music file is ever committed, and no file with a sound stream is written to a tracked folder. Their prompts, settings, seeds and measurements are committed as text, as the records in `kit/06-ASSETS.md`. This holds for every branch, not only `repo.branch`: an agent that makes sounds returns the files to you as attachments and pushes only their records. The files stay in the workspace and on the review page, and one archive of every kept file and of the newest mix is attached to the thread with each status that follows new sounds and with the `REVIEW` block. A later task that does not find the files takes them from an archive attached to its prompt or found in the thread. If there is none it makes each missing file once more from its record, with the same settings and seed: one take for each lost file, outside the take limits. It says in its first status that they are new takes and not the ones Brandon heard.
- The first status of Phase 0 says in one line which of the two applies.
- A task that cannot find the music file anywhere carries on with the map that is already committed. Only the final mix needs the file itself. If it is still missing then, the film is delivered with the narration and the sound effects, and the `BUILD COMPLETE` block says the music has to be laid in from `cut/CUES.md`.

## Assets

- Every file you did not make is listed in `ASSETS.md` with its source URL and licence before it is used.
- Allowed: public domain, CC0, or a licence that clearly permits commercial use in a published video. If the licence is unclear, do not use the asset.
- Nothing extracted from a game, a film or a paid pack.
- Photographs from the web are references to study, or a rendering standard passed to an image model. They are never committed and never appear in a frame. They live in `references/cache/`, which git ignores. The photographs the reference runs used are credited in `references/drafts/working/real/CREDITS.md`.
- Every asset you generate or build has its recipe committed beside it: the tool, the inputs and the exact prompt or command. `kit/06-ASSETS.md` gives the format.
- Generated pictures may appear in the final frames as textures, maps, skies and backplates. Phase 0 reads the output terms of each image model it will use, and of the sound tool, and records them in `ASSETS.md`. `kit/06-ASSETS.md` says what to do with what it finds.

## Never

You never lower a threshold, drop a critic, reword a rubric or a jury question, remove a judged frame, pick easier controls, lower `tiers.final`, replace an approved image, change a word of the narration, cut scope, ship a stand-in, or report a limit reached as a pass.
