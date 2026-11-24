# 05 · Architecture

This file fixes what the rest of the kit relies on: that a frame is a pure function of its number, the names of the harness commands the phases call, the clock, how statuses are built, and where the film is rendered. How each of them works inside is yours. If a better structure than the one sketched here gives a better picture, use it, keep the fixed names, and log it.

## 1 · Stack and folders

- Vite, TypeScript strict, three.js on WebGL2, GSAP for easing. No UI framework. Vitest for unit tests.
- A headless browser driver for the harness. Use the one that works with the browser already in this workspace, and pin that browser's version. Installing the repo's packages must not download a browser.
- `ffmpeg` and `ffprobe` for films, loops, sound and checks.
- Optional build-time tools under `pipeline/`: headless Blender, Python. Nothing that the pages load depends on them being installed.
- In Phase 0 take the newest stable three.js, read its migration notes for `WebGLRenderer`, pin it and every other version, and record them in `kit/PROGRESS.md`.
- One render path: three.js `WebGLRenderer` on WebGL2, in every mode, on every machine. The critics judge frames rendered in software here. If the master is rendered on Brandon's Mac, it runs the same shader code on a graphics card.

A folder layout that keeps one owner per folder. Change it if the work asks for it, and keep that property:

```
config/showcase.json     every number the kit sets. Your own tuning lives in your own files beside it
src/core/                renderer, accumulator, sampler, seeded random, time, cameras, post
src/places/<unit>/       one folder for each place and one for the reveal
src/film/                the timeline, shots, transitions, the loop
src/capture/             the frame interface
src/diagnostics/         the views listed in kit/04-LOOK.md
pipeline/                optional build-time scripts
parts/PARTS.json         the parts register
public/assets/<unit>/    what the pages load
assets-src/<part>/       the recipe of every generated or built asset: RECIPE.md, text only
audio/                   supplied/, kept/, mix/, and records/ with one text record for each clip and sound
tools/                   harness scripts and the local render
tests/
references/              approved/, drafts/, archive/. cache/ is ignored by git
scorecards/              one folder for each round, text only
cut/                     MAP.json, CUTLIST.json, SHOTS.md, CUES.md
deliver/                 the card loop's web copy and the card still. deliver/film/ holds the films and the full-size loop and is ignored by git
out/                     stills/ and clips/, committed through the harness. work/ is ignored by git
```

### The config

- `src/config.ts` imports `config/showcase.json`, validates it and exports it typed. No other file repeats a number, an id, a name or a path that the config holds.
- Startup fails loudly if a key is missing; if `budget.phaseHours` does not add up to `budget.runHours`; if `film.fps` is not a whole multiple of `film.previewFps`; if `film.order` is not the six places followed by `reveal`; if a key, a narration clip or a settled line names a unit or a key that does not exist; if an approved picture is missing; if `film.targetSeconds` lies outside `film.minSeconds` and `film.maxSeconds`; or if `deliver.cardLoop.seconds` lies outside `deliver.cardLoop.minSeconds` and `deliver.cardLoop.maxSeconds`.
- `name` is the site's name and `slug` its address when you publish.
- In `config/showcase.json` only these may change, and each change is logged: `film.targetSeconds` and `deliver.cardLoop.seconds` inside their limits; `deliver.cardLoop.unit`, by the pick; `critics.maxImageLongEdgePx` and `critics.maxImageMegapixels`, downward, in Phase 0; `sandbox.chunkSeconds`, downward; and `settled`, by the one rule in `kit/06-ASSETS.md`. Everything you tune yourself, cameras, counts, materials, weather, lives in your own files.

## 2 · Determinism

A computed frame is a pure function of its index, the format, the tier and the committed inputs.

- No `Math.random`, `Date.now` or `performance.now` in anything that affects a pixel of a computed frame.
- All randomness comes from one seeded generator built from `seed`, with a named stream for each system.
- Time is the frame index divided by `film.fps`. Nothing reads a clock.
- Motion is one of two kinds:
  - Closed-form: a function of time. Camera, light, weather drift, most cycles.
  - Stepped: advanced in fixed steps from a seeded start, with no dependence on frame rate. Its state at any time is reached from a cached checkpoint, so any frame can be rendered alone and in any order.
- Rendering frame B after frame A gives the same B as a fresh page load.
- A frame is the average of `tiers.<tier>.samplesPerFrame` samples. Each sample is jittered inside the pixel, placed at its own point on the lens and at its own moment inside the shutter set by `film.shutterDegrees`, counted at `film.fps`. Accumulate in linear floating point. Tone curve, grade, bloom, grain and dither run once, after accumulation. Sample sequences are low discrepancy and seeded.
- This holds exactly on one machine with one browser version. Phase 0 measures how far it holds between VMs: the same still on the Builder's VM and on two sandbox VMs, with the PSNR of each pair logged.
- Frames from two VMs may share one shot only if that PSNR is at least `quality.crossMachineMinPsnr`. If it is lower, each shot is rendered whole on one VM.
- Brandon's Mac has a different browser build and a real graphics card. Small differences there are expected and nobody compares them frame for frame. The local render checks one frame against its kept still before a long render, so a large difference is seen first.
- Sound never changes a pixel. In `capture` mode no audio code is loaded.

## 3 · The frame interface, parts and stand-ins

The page exposes one object on `window`. Its exact shape is yours. It offers at least:

- `ready`, a promise.
- `info()`: the frame rate, the format, the tier, the engine hash, a hash for each unit, the versions, and `standIns`, the list of every part whose state is `stand-in`, with its unit.
- `setFormat(id)` and `setDiagnostic(view)`. A format is named by its `id` in `formats`.
- `film()`: the frame count, every shot with its unit and its first and last frame, the key frame of every key, every event the cut list marks, and the titan frame.
- `filmState(frameIndex)`: the shot, the unit, and the camera's position, aim, height and lens for that frame, without rendering anything. Checks G12 and G15 read it for every frame.
- `renderFilmFrame(frameIndex, tier)`: resolves when a clean frame is on the canvas.
- `loop()` and `renderLoopFrame(frameIndex, tier)`. The loop accepts the index one past its last frame, and computes every motion in that frame at its own time like any other: the index is never wrapped back to 0 for motion. It equals frame 0 only because every motion in the loop closes. One thing is counted round the loop, and only this: grain, dither and the sample sequences take the frame index modulo the loop's length, because they are meant to differ from frame to frame and would otherwise never close. Check G14 uses it.

If one frame at the `final` tier in `formats.master` does not fit inside `sandbox.stepTimeoutMinutes`, add a way to split its samples across steps, and prove with `npm run determinism` that a split frame is pixel-identical to an unsplit one.

### Parts and stand-ins

- `parts/PARTS.json` is the register of every part: its unit, its state, `stand-in`, `built` or `fallback`, the fallback step that ended it if any, and the hash of the files that draw it.
- A stand-in is never silent. It flags itself in code, so the frame interface and the `standins` view can report it. It is plain shapes in flat, unlit colour and never draws an approved picture or a generated one.
- Check G13 does not take the register's word alone. For every part it covers it makes four tests, and it is red if any fails:
  1. The part's state in the register is not `stand-in`.
  2. The hash of the part's files differs from the hash recorded when it was a stand-in. Changing a label changes no file, so relabelling never passes. Finishing a part always changes its files.
  3. The `standins` view shows no pixel flagged for that part in any judged frame, and the page reports no flagged code path for that part.
  4. The part looks different. When a part is first registered, the harness keeps one reference picture of it as a stand-in: the frame of the film that shows it best, in the `solo` view. For a part that is a stretch of the film, such as a transition, the reference is the whole frame in the middle of it. The same picture rendered now differs from that reference by a mean of more than `quality.standInMinMeanDifference` levels out of 255, over the pixels the part covers in either. Removing a flag from the code changes no pixel, so it never passes. Every stand-in is flat colour, so every finished part and every fallback in `kit/03-METHOD.md` passes this test.
- A part that never was a stand-in, because it was added later and built at once, has no recorded hash and no reference. Tests 2 and 4 do not apply to it.
- Only one kind of part ever leaves the register: a transition that ends as a plain cut. It is taken out with an open item, as `kit/03-METHOD.md` section 5 says, and G13 no longer covers it. Nothing else is ever removed from the register.

### Hashes and records

- The engine hash covers the shared code under `src/`, `config/` and the package lock file. Every unit has a hash over its own folders.
- Every harness output has a record beside it: the engine hash, the hashes of the units it shows, the format, the tier, the diagnostic, the browser version and the machine.
- A command reuses an existing output only when its record matches the current state. Otherwise it renders it anew.
- Commits that touch only logs, scorecards, sound or kit files change no hash.

## 4 · Modes

Set by URL, `?mode=`:

| Mode | What it does |
| --- | --- |
| `autopilot` | Plays the film in real time on this machine, with its sound, for a quick look. It needs one click to start, because a browser will not play sound without one. It is what the published address opens. It plays as fast as the machine can and drops frames to stay with the sound. It is for looking, never for recording |
| `loop` | Plays the card loop in real time, repeating |
| `capture` | Renders nothing until asked through the frame interface. The harness and the local render use this |
| `fly` | Optional. A free camera in one place, for your own looking and for Brandon |

- `autopilot` takes `unit=<id>` to play one place and `frame=<n>` to start at a frame.
- The start page of `autopilot` is the only interface in this project. It is one quiet control on a dark surface that is not pure black. It never appears in a computed frame.

## 5 · The harness

Scripts in `tools/`, run through npm. These names are fixed, because the phases call them. Add whatever else you need.

| Command | What it gives |
| --- | --- |
| `npm run build` | The static site in `dist/`, from `src/` and `public/` only |
| `npm run caps` | The WebGL2 limits and extensions of this machine, in `config/webgl-caps.json`, with the extensions every target browser has marked `portable` |
| `npm run budget` | Seconds for one sample and for one frame at each format and tier on the current scene, on this VM and on a sandbox VM, and the wall-clock time the preview film, the film in `formats.hd`, the master and the card loop would take when split across the render agents available. It writes the render budget table in `kit/PROGRESS.md` |
| `npm run clock` | The clock. Section 6 |
| `npm run look -- --add FILE --caption TEXT --by NAME` | Adds a picture to the look log |
| `npm run status` | The status pictures and the gallery. Section 6 |
| `npm run still -- --frame N` | One film frame as a still under `out/work/stills/`. Takes `--key ID` to render a key's frame, `--id ID` for any judged frame by name, `--loop N` for a loop frame, `--tier`, `--format` and `--diag` |
| `npm run crops -- --key ID` | Grids of native-size crops of a judged frame, each inside `critics.maxImageLongEdgePx` and `critics.maxImageMegapixels` |
| `npm run compare -- --key ID` | A comparison image: the approved picture beside the key's frame at the same size, and under them matching crops, with the frame's crop at native size |
| `npm run sheet -- --shot ID` | A contact sheet of `critics.contactSheetFrames` frames across a shot. `--film` gives sheets across the whole film. `--loop` gives one across the loop and one across its seam, last frames then first frames. `--frames A B` gives consecutive frames. `--establishing` puts the establishing frame of every place and the titan frame on one sheet |
| `npm run measure -- --unit ID` | Every measure for that unit, as `kit/07-QUALITY-BAR.md` defines them |
| `npm run pack -- --round R --unit ID` | The critic packs for a round |
| `npm run determinism` | Renders the same frames on fresh page loads and in a different order, and compares them |
| `npm run gate -- --phase N` | The machine checks, the deliverable checks that phase names and the sound checks, with a pass or fail line for each |
| `npm run audiomap` | The map of the music, in `cut/MAP.json`. Section 8 |
| `npm run voice -- --clip ID` | Makes, checks and files takes of one narration clip, as `kit/03-METHOD.md` section 7 says. `--sheet` draws the kept clips as waveforms on one picture |
| `npm run sound -- --cue ID` | The same for one sound effect. `--sheet` draws the kept sounds |
| `npm run cut` | `cut/CUTLIST.json` and `cut/CUES.md`, from the map, the lengths of the kept narration and your shot plan. Section 8 |
| `npm run mix` | The soundtrack laid on the cut list. `--final` makes the mix the film is delivered with |
| `npm run animatic` | The animatic. Section 8 |
| `npm run film -- --format F --tier T` | The film as chunks and a joined file under `out/work/`. Takes `--first` and `--last`, `--unit ID` for one place's span, `--join`, `--fps` to render at `film.previewFps`, and `--from FILE` to make a smaller copy by scaling down a larger film of the same build |
| `npm run loop -- --format F --tier T` | The card loop, its web copy and the card still under `out/work/loop/`. Takes `--first`, `--last` and `--join` |
| `npm run stress` | For four moments, the Heart's peak, the storm on the Spine, the seep pool on the marsh and the titan frame, `quality.stressClipSeconds` of film in `formats.hd`, encoded as delivered and again at `quality.compressionStressMbps`, with stills from both |
| `npm run keep` | Copies into `out/stills/` the judged frames, comparison images and sheets of the unit or phase just finished, each with its record, and one short silent clip of the unit into `out/clips/` in `formats.preview`. `--film` copies the newest films to `deliver/film/` and to the review folder. `--deliver` copies the full-size loop to `deliver/film/`, and its web copy and the card still to `deliver/`. It refuses to write a file over `repo.maxFileMb` into a tracked folder |
| `npm run review` | Builds the review page. Section 9 |
| `npm run render:local` | The local render. Section 7 |

Rules:

- The browser runs headless with software WebGL in this workspace.
- Every harness output is written under `out/work/`, which git ignores. Only `npm run keep` and `npm run status` write to tracked folders.
- Stills kept in `out/stills/` are stored compressed at high quality, so the repo stays small.
- Any command that can exceed `sandbox.stepTimeoutMinutes` does its work in chunks, runs detached with a log file, and can be run once more to carry on from the chunks that exist.
- At most `sandbox.maxRenderProcesses` render processes run at once in one VM. Sandbox agents in their own VMs render ranges in parallel.
- Every render command checks free disk first. Under `sandbox.minFreeDiskGb` it deletes old output under `out/work/` and checks once more before it refuses to start. No command holds more than `sandbox.maxFramesOnDisk` frames on disk: frames are deleted as soon as their chunk is encoded.
- While the repo is public, a file with a sound stream is never written to a tracked folder. `AGENTS.md` under "Sound" gives the rule.

## 6 · The clock, looks and status

### The clock

`npm run clock` keeps `kit/CLOCK.json`. It is the first harness command built, and it is committed with every status.

- `npm run clock -- --start` marks the start of a task. It adds no time, and the next tick counts from it. A tick made on a different machine boot from the last one is treated the same way, so a forgotten `--start` cannot count the time between two tasks.
- `npm run clock -- --phase N` is a tick. It adds the whole time since the previous tick or start to phase N.
- `npm run clock -- --review-round N` ticks review round N. The first tick of a round opens it with `budget.reviewRoundHours`. Its time is kept apart from the build's. It prints the time used in the round out of the time allowed, and `extra rounds: yes` or `no`, which is no once those hours are used. It never prints `budget report: due`.
- `npm run clock -- --continue N` records continuation N. It gives every phase that is not `done` a new box: `budget.continueHours` split in proportion to those phases' boxes in `budget.phaseHours`, with a phase's reserve scaled by the same factor as its box. From then on the lines below are measured from the start of the continuation against the new boxes.
- `npm run clock -- --extension N` ticks an extension after completion. Its time is kept apart from the build's. It prints the time used in the extension out of `budget.extendHours`, and `extra rounds: yes` or `no`, which is no once those hours are used. It never prints `budget report: due`.
- A tick with `--phase N` prints, in plain words:
  - Time used in this phase and in the build, and the time allowed for each.
  - `extra rounds: yes` or `no`. It is no once the time the build has used has reached the sum of the boxes up to and including this phase. In a phase that has an entry in `budget.reserveHours` it is also no once the time left before the budget report is under that entry.
  - `half point: reached` once this phase has itself used half of its own box.
  - `box end: reached` once this phase has itself used all of its own box.
  - `budget report: due` once the time used has reached the time allowed.
  - Minutes since the last status, and `status overdue` once that passes `budget.statusMaxGapMinutes`.
- You read those lines and follow the clock rules in `AGENTS.md`. The script decides nothing by itself.

### Looks and status

- A look is any picture someone rendered in order to look at it. `still`, `crops`, `compare` and `sheet` each append a line to `out/work/looks/index.jsonl`: the file, a short caption, the time and who made it. Anything else is added with `npm run look`.
- A build or render agent pushes its newest looks to its looks branch with every heartbeat. A short-lived agent attaches its looks to its report. You add both to the log.
- A long render job writes a look at least every `budget.statusMaxGapMinutes`, so a status has something new to show while the job runs.
- `npm run status -- --phase N --unit ID` does this:
  1. Ticks the clock for phase N. With `--review-round N` or `--extension N` in place of `--phase N` it ticks that instead.
  2. Chooses up to `status.maxPictures` pictures. First, for the unit in hand, one of its keys beside its approved picture, reusing a still whose record matches the current build and otherwise rendering one at the `review` tier. Then the newest looks not already shown, yours and the ones fetched from agent branches. With `--sounds` the first picture is the waveform sheet of the kept narration and sounds.
  3. Resizes each to at most `status.pictureLongEdgePx` on the long edge.
  4. Writes them to `out/stills/status/`, replacing the last set, with `STATUS.md` holding the captions and the time.
  5. Writes whatever file the inline display method from Phase 0 needs under `out/work/status/`.
  6. Prints the lines of the status message, including the time used out of the time allowed.
- It never holds up for the render slot. If a render job is running in this VM it renders nothing and uses the newest frames that job has written and the newest looks.
- It never comes back empty. If nothing has been rendered yet, it uses `references/approved/contact-sheet.jpg`.
- With `--no-render` it renders nothing and uses only pictures that exist. With `--no-tick` it does not tick the clock.
- You then show the gallery in the thread and post the lines, as "Showing the work" in `AGENTS.md` says.

## 7 · Rendering and where the film is made

### What a film render is

- A film is rendered in chunks of at most `sandbox.chunkSeconds`, cut at shot boundaries where one falls inside a chunk. Each chunk is encoded with the film's final settings and a closed group of pictures, so chunks join without being encoded a second time. The sound is added when the chunks are joined.
- Render agents on sandbox VMs each take a list of chunks. An agent returns its chunks to you as attachments. If attachments cannot carry video, it pushes them, with their records, to its own branch under `out/chunks/`, which you fetch, copy from and never merge. If neither works, you render the range yourself. Chunks carry no sound, so a public repo is no obstacle to them.
- The master: `formats.master` at `film.fps`, at the `final` tier, in an `export.master.container` file, video `export.master.videoCodec` at `export.master.crf` in `export.master.pixelFormat`, sound `export.master.audioCodec` at `export.master.audioKbps`. Its name is `export.files.master`.
- The film in `formats.hd`: `film.fps`, encoded at `export.hd.crf`, otherwise like the master. Its name is `export.files.hd`. When a master exists, this copy is made from it with `npm run film -- --from`.
- The preview film: `formats.preview` at `film.previewFps`, which is every frame whose index is a multiple of `film.fps` divided by `film.previewFps`, encoded at `export.preview.bitrateMbps`. Its name is `export.files.preview`.
- The card loop is encoded like the master, with no sound stream. Its web copy is `deliver.cardLoop.webWidth` wide at `deliver.cardLoop.webBitrateMbps`.
- Film files and the full-size loop are written to `deliver/film/`, which git ignores, copied to the review folder, and handed to Brandon. They are never committed.
- A render that a budget report or the end of a task interrupts keeps its chunks under `out/work/`. The task that carries on uses every chunk whose record still matches and renders the rest. If the workspace did not keep them, it starts that render from its own rule in `kit/08-BUILD-ORDER.md`, with the time it then has.

### Where the master is made

Every frame is computed, so the film is perfectly smooth wherever it is rendered and however long a frame takes. The only question is which machine has the time.

- This workspace has no graphics card. Whether the master can be rendered here depends on how heavy your scenes are. That is yours to decide, and the picture comes first: never make a scene lighter so that the master fits here.
- `deliver.sandboxMaster` says Brandon wants the master rendered here if it can be. Phase 6 of `kit/08-BUILD-ORDER.md` gives the rule: the master is rendered here when `npm run budget` says it fits inside `sandbox.masterMaxHours` and inside the time left. Otherwise the film is delivered here in `formats.hd`, and the master is rendered on Brandon's Mac with the local render.
- Either way the build delivers a finished film with its sound, the card loop and the card still.

### The local render

`npm run render:local` renders on a computer with a graphics card, from a fresh clone, run by an agent working for Brandon.

- It needs Node, an installed Chrome and `ffmpeg`. It uses the installed Chrome with its graphics card on, in a visible window, and never downloads a browser.
- A fresh clone is all it needs for the picture. It builds any cache it needs first, from committed files only, and never calls a tool that exists only in this workspace.
- `npm run render:local -- --what film --test` first renders one judged frame and writes it beside the kept still of the same key with their PSNR. Then it renders the first `export.local.testSeconds` seconds, assembles them with sound, opens the result and stops.
- `npm run render:local -- --what film --go` renders every frame at `film.fps` in `formats.master` at the `final` tier through `capture` mode. Frames are written and assembled in chunks, so a run that is interrupted carries on where it stopped. The chunks are joined with the final mix into the master, named and encoded as above. With `--prores` it also writes an `export.local.container` file with `export.local.videoCodec` for editing.
- `--what loop` renders the card loop in `formats.master` at `film.fps` at the `final` tier, and writes the card still from its frame 0 in the same format and tier.
- For `--what film`, with `--test` or `--go`, it looks for the final mix under `audio/mix/`. Without one it stops before rendering anything and says where the mix comes from: the sound archive from the Computer thread, which holds the final mix, unpacked as `README.md` says. With `--silent` it renders without sound and says so in its last line.
- It checks before it starts that the frame count equals the film's length times `film.fps`, and after it ends that the file holds that many frames.
- `npm run render:local -- --proof` is the proof made in this workspace: the same code path with software graphics, in `formats.preview` at the `draft` tier, for `export.local.proofSeconds` seconds of the film across a cut and the same of the loop, with `ffprobe` on both results. The proof uses the newest mix if there is one and is silent otherwise. The loop never needs a mix.

## 8 · The map, the cut list, the animatic and the mix

- `npm run audiomap` reads `audio/supplied/` and writes `cut/MAP.json`: the length, the tempo, the time of every beat and every bar line, every strong hit with its strength in the low band and across the whole band, the sections with their start, end and loudness, and the long quiet. A beat, a bar line or a hit is an accent. `kit/03-METHOD.md` section 8 says how it is checked and what happens if it cannot be made. The map is text and is committed, so a later task that has no music file can still cut to it.
- `npm run cut` writes `cut/CUTLIST.json`: every shot with its unit, its first and last frame and the key it answers; the key frame of every key; every narration line with its first frame and its length; every event, which is a moment in the picture meant to land on the music, such as the bore, the lava fall or a strike, with its frame and the accent it lands on; the titan frame, which is the first frame with the whole body in view; and the one cut in the music with the two bar lines it joins. It also writes `cut/CUES.md`, the same content as a table a person can read, by time and by frame.
- The cut list is yours to shape inside `kit/01-FILM.md`. It is made in Phase 1, and remade whenever the narration, the shot plan or the timing changes.
- `npm run animatic` needs no 3D. It lays the approved pictures on the cut list, each key on its own shot with a slow push, and the reveal as a zoom through its four nested keys, in `formats.preview` at `film.previewFps`, with the mix that exists. A small label in one corner names the shot. The animatic is the only place a label appears over a picture.
- `npm run mix` is described in `kit/03-METHOD.md` section 7. Mixes are written under `audio/mix/`.

## 9 · The review page and publishing

Brandon reviews on a tablet. He needs one link where everything plays.

- Publish `dist/` to this workspace's app hosting, with the review page in it. The published address opens `autopilot`.
- `npm run review` writes `dist/review.html` and copies into `dist/review/` whatever exists of: the pictures in `out/stills/status/`, the animatic, the Heart review clip, the newest films, the card loop and card still, every comparison image and sheet in `out/stills/`, every kept narration clip, every kept sound, and the newest mix.
- The page has six parts, in this order: Latest, with the newest status pictures, their captions and the time. Watch, with the films and clips, newest first. Listen, with every narration clip under its words, then every sound with its name and the description that made it, then the mix alone. The card. Comparisons. Motion, with the sheets.
- Each video plays in the page and each picture is shown at full width. The page carries the date, the current phase and the time used from `kit/PROGRESS.md`.
- It is plain HTML with no framework. It is not part of any hash.
- Run it before every publish. If the hosting does not accept the size, leave out the largest videos, say so on the page, and attach them to the thread instead.
- The hosting asks for a sign-in, so the page is for Brandon and his team, not for the public.

## 10 · Tests

- Config validation, including every failure case in section 1.
- Seeded random: same seed, same stream, same values.
- Sampler: sequences are deterministic and cover the pixel, the shutter and the lens.
- Stepped motion: the same start gives the same state at step N however the steps were grouped, and a state reached from a checkpoint equals the state reached from the start.
- The cut list: the shots fill the film with no gap and no overlap, the places come in the order of `film.order`, every key has a key frame inside its own unit, and the narration lines are in script order and do not overlap.
- The reveal: the camera's height rises from its first frame to the titan frame without a step back.
- The loop: every period divides the loop's length.
- The clock: `--start` adds nothing, a tick on a new machine boot adds nothing, every other gap is counted in full, a review round's time and an extension's time touch neither each other nor the build's, the reserve switches `extra rounds` at the right moment, `--continue` gives the unfinished phases new boxes, and each printed line switches at the right moment.
- The mix: the same inputs give the same bytes.
