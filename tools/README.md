# The harness

Plain Node ES modules, run through npm. `kit/05-ARCHITECTURE.md` fixes the command names. This file is the contract between the people who write them.

## Rules

- Install with `npm ci` from the repo root. Every version is pinned and nothing downloads a browser.
- Every output goes under `out/work/`, which git ignores. Only `keep` and `status` write to tracked folders.
- Pictures are read and written with `sharp`. No other image library.
- Almost no code comments. No em dashes and no exclamation points in any text a script prints or writes.
- Every number the kit sets is read from `config/showcase.json` through `config()`. Never repeat one.
- A command that renders is run once at a time in one VM.

## Shared helpers

`tools/lib/paths.mjs`: `ROOT`, `rel(...parts)`, `readJson(file)`, `writeJson(file, value)`, `config()`, `args()` (flags as `--name value`, a bare flag is `true`, several values make an array), `utc()`.

`tools/look.mjs`: `addLook(file, caption, by, extra)` appends one line to `out/work/looks/index.jsonl` (`file` relative to the repo, `caption`, `at`, `by`), and `readLooks()` returns them all, oldest first.

`tools/lib/progress.mjs`: reads and edits sections of `kit/PROGRESS.md` (`read`, `write`, `getSection`, `setSection`, `appendSection`, `setLine`, `setRow`).

## The renderer, `tools/lib/render.mjs`

Owned by the Builder. Every command that needs a frame goes through it. It builds its own copy of the site under `out/work/site/` whenever the engine hash or a unit hash has changed, serves it on `127.0.0.1`, opens `?mode=capture` in the pinned browser with software WebGL and reads frames back from the canvas. One render process at a time in one VM: a lock file at `out/work/render.lock` holds the process id. Any console error or page error fails the render.

```js
renderStill({ frame, key, id, loop, tier = 'review', format = 'hd', diag = null,
              force = false, fresh = false, portableOnly = false, name = null,
              look = true, by = 'builder', caption = null })
// One of frame (a film frame index), key (a key id from the config), id (a judged frame by name) or loop (a loop frame index).
// format is a format id from the config: 'uhd', 'hd' or 'preview'. diag is a diagnostic view or null.
// force renders even when a matching still exists. fresh loads a new page first. name sets the file name and may hold a folder.
// look = false adds no line to the look log.
// Resolves to { file, record, reused, seconds }: file is an absolute PNG path under out/work/stills/, exactly the size of the format.
// record is also written beside the file as file + '.json'. reused is true when a matching still already existed.

filmInfo()
// Resolves to what the page's film() returns:
// { fps, frameCount, shots: [{ id, unit, first, last, key }], keyFrames: { [keyId]: frame }, events: [{ id, frame }],
//   titanFrame, loop: { frameCount, unit } }

pageInfo()
// Resolves to what the page's info() returns: fps, format, tier, engine, units, versions, standIns and gl
// (the renderer strings, the limits and the extensions the page obtained).

timeFrame({ frame, loop, tier = 'draft', format = 'hd' })
// Renders one frame, reads one pixel back so the rasterizer has finished, and resolves to { seconds, samples }. Writes nothing.

startCost()
// Resolves to { seconds }: opening a browser, loading the page, waiting for ready and drawing one draft frame in formats.preview.

closeRenderer()
// Closes the shared browser and frees the lock. Call it once before a command exits.
```

Also exported: `SITE`, `STILLS`, `LOCK`, `FLAGS` (the browser flags), `browserPath()` (the pinned browser, or the path in the environment variable `CARCASS_BROWSER`), `freeGb()`, `ensureDisk()` (deletes old output under `out/work/` below `sandbox.minFreeDiskGb` and then refuses) and `ensureSite()`.

A record: `{ engine, units, format, tier, diag, browser, machine, frame, loop, key, made }`. `engine` and the values of `units` are hashes from `tools/lib/hash.mjs`. A command reuses an output only when its record matches the current state.

Commands that sit directly on the renderer:

- `npm run still -- --frame N | --key ID | --id ID | --loop N [--tier T] [--format F] [--diag VIEW] [--force] [--caption TEXT] [--by NAME]`. Prints the path and the seconds, and adds a look.
- `npm run caps`. Writes `config/webgl-caps.json`: the limits, the precision, the extensions of this machine with the portable ones marked, and the portable ones that are missing here.
- `npm run determinism -- [--tier T] [--format F] [--only still,late,loop] [--part UNIT/NAME]`. Renders a film frame, a late film frame and a loop frame on two fresh page loads in opposite orders and compares every pixel. `--only` keeps some of the three, and `--part` draws one part alone (with `--only` naming a frame of its unit), which is how to find the part that differs. The report is `out/work/determinism/report.json`. It exits with an error when any pixel differs.
- `npm run budget -- [--frame N] [--runs N] [--scene "text"] [--merge FILE ...] [--agents N] [--measure-only] [--reuse] [--write]`. Times a draft and a final frame at every format, works out the seconds for one sample and the fixed cost of a frame, and writes `out/work/budget/<hostname>.json`. `--measure-only` stops there, which is what a sandbox agent runs. `--merge FILE` adds another machine's file, `--reuse` skips the timing and uses this machine's file, and `--write` writes the "Render budget" section of `kit/PROGRESS.md`. The jobs are estimated on the fastest merged machine with four or more cores, split across `--agents` machines (`sandbox.maxAgents` by default).

## The gate, `tools/gate.mjs`

`npm run gate -- --phase N [--only G3,G9] [--unit ID ...] [--json]` runs every machine check, deliverable check and sound check that the phase names and prints one pass or fail line for each, then a summary. A check that is named and not built yet counts as a failure. Sound checks are advisory. The registry is `tools/checks/index.mjs`: to add a check, write `run(ctx)` that resolves to `{ ok, lines, skipped }` and name it in `BUILT`. `--unit` names the unit under judgement and reaches every check as `ctx.units`; only G13 reads it.

### G13, the stand-in check, `tools/checks/g13.mjs`

`npm run gate -- --phase 3 --only G13 --unit heart` makes the four tests of `kit/05-ARCHITECTURE.md` section 3 for every part it covers and prints one line for each part and test that fails, then a count. The pure half is `tools/lib/standins-core.mjs`.

- What it covers. With `--unit`: every part of the units named, and of every unit marked `finished` in the Units table of `kit/PROGRESS.md`. Without `--unit` it is the gate that closes a phase, and covers every unit whose phase in `units` of the config is at most N, with the finished ones. It covers every part there is when the film's own unit is named or covered, or once its row in the Units table shows a round run.
- Test 1 reads the state in `parts/PARTS.json`.
- Test 2 hashes the unit's files as they are today and compares that with `standIn.hash`. It also fails while the page still draws the part as a stand-in, because the hash of files that draw a stand-in is a stand-in's hash whatever the register last recorded. A part's files are its whole unit's, so this test alone cannot tell two parts of one unit apart: tests 3 and 4 do.
- Test 3 renders the `standins` view of every judged frame that shows the unit (its entries of the judged list, with the rows a critic added to `kit/PROGRESS.md`; the entries of the whole film inside its place; the judged loop frames for the unit of the loop), in `preview` at the `draft` tier. A frame with no flagged pixel is rendered once. In a frame that has some, each part the page draws as a stand-in is rendered alone to find whose they are. It then reads `info().standIns`.
- Test 4 renders the `solo` view at the frame, format and tier recorded in `standIn`, and takes the mean difference from `standIn.picture` over the pixels lit in either picture, in levels out of 255, mean of the three channels. A pixel is lit when a channel is above `GROUND_LEVEL` (6): the solo view draws on black, and grain lifts black by 2 levels at most. The picture of now is kept as `out/work/gate/g13/<unit>/<name>.png`, and every number as `out/work/gate/g13/g13.json`.
- A part with no `standIn` skips tests 2 and 4. A part with a `standIn` and no picture fails test 4, unless the register says it was looked for and never seen (`shown` 0), which is printed as not checked. A part the page draws and the register does not list, or the other way round, is red.

### G14, the loop's seam, `tools/checks/g14.mjs`

`npm run gate -- --phase 5 --only G14` makes the two tests of G14 on the loop of `deliver.cardLoop.unit`, in `preview`. The pure half is `tools/lib/seam-core.mjs`.

- The frame one past the last. `renderRaw({ loop: N })`, with N the loop's frame count, draws every motion at frame N and counts grain, dither and the sample sequences round the loop, so from index 0 again: that is what the page does with a loop frame, and the check does not wrap the index itself. It must equal loop frame 0 in every pixel, in red, green and blue, at every tier of the config, because the sample sequences differ by tier.
- When it does not, the two frames and their difference times 8 are kept in `out/work/gate/g14`, and every part of the unit is drawn alone (`solo`) at both ends to name the parts whose motion does not come round.
- The step across the seam. Every frame of the loop is rendered at the `draft` tier, which takes about ten minutes for 480 frames on four cores. The mean difference between frames N - 1 and 0 may be at most `deliver.cardLoop.seamMaxRatio` times the largest mean difference between frames i and i + 1 for i from 0 to N - 2. The mean is over every pixel and the three channels, in levels out of 255.
- The steps are kept in `out/work/gate/g14/g14.json` with the hashes of the build that drew them, and read from there for as long as the engine hash, every unit hash, the browser and the loop's length are the same. The frame one past the last is rendered on every run.

## The status, `tools/status.mjs`

`npm run status -- --phase N [--unit ID] [--key ID] [--review-round N | --extension N] [--sounds] [--no-render] [--no-tick] [--note "one line" ...] [--pick "FILE=caption" ...] [--number N] [--max N]` ticks the clock, picks the pictures, writes them to `out/stills/status/` with `STATUS.md`, updates "Latest pictures" in `kit/PROGRESS.md`, and writes `out/work/status/status.json` and `note.txt` for the inline widget in `tools/status/widget.html`.

## The config shape

`npm run shape` writes `src/config.shape.json` from `config/showcase.json`: the name and type of every key with a fixed name. `src/config.ts` checks the config against it at startup. Run it after a key is added to the config.

## Pictures made from stills

`tools/lib/img.mjs` holds the shared picture code. The limits for anything a critic sees are `critics.maxImageLongEdgePx` and `critics.maxImageMegapixels`.

- `tools/crops.mjs` exports `cropGrids({ file, name, regions })` and is the command `crops`.
- `tools/compare.mjs` exports `compareKey({ key, tier, format })`, which resolves to `{ file, files }`, and is the command `compare`.
- `tools/sheet.mjs` exports `sheet({ frames, loopFrames, name, tier, title })`, which resolves to `{ file }`, and is the command `sheet`.

Each of them appends a look.

## Measures, packs, sound effects, the stress test and the trace

| Command | What it does |
| --- | --- |
| `npm run cost -- --key ID \| --frame N [--tier T] [--format F] [--parts NAME ...] [--runs N]` | Says what each part of a place costs. It draws the frame once to pay for the creation of the place, then the whole frame, then each solid part alone in the `solo` view, and prints the seconds of each beside the cheapest, which it takes as the cost of an empty frame. A part alone is not hidden by the others, so the parts can add up to more than the whole. Defaults: `draft`, `uhd`. Writes `out/work/cost/<unit>-<frame>-<format>-<tier>.json`. |
| `npm run measure -- --unit ID [--tier T] [--format F] [--frames N ...]` | Takes the three measures of `kit/07-QUALITY-BAR.md` on the built page and writes `out/work/measure/<unit>.json`. M1 counts the pixels that are exactly 255, 0, 255 in the `invalid` view. M2 is the share of pixels over `motion.pixelThreshold` in the `motion` view. M3 is the fine detail of a still against its approved picture, judged at the default tier and format |
| `npm run pack -- --round R --unit ID [--critic R4b] [--tier T] [--format F] [--family carbon] [--record] [--fake]` | Builds what one critic is sent, under `out/work/packs/round-<R>/<unit>/<critic>/`, with a `manifest.json`. The files have neutral names, `set-<letter>-<nn>.png`, and the key that says which is which stays in `out/work/packs-keys/`. `--critic R4b` with the unit `film` builds the blockout packs. `--critic R7` renders nothing: it takes the stills a stress run left under `out/work/stress/`, one pack a moment, the frame before the encode as `-a` beside the same frame out of the encode at the stress rate as `-b`, then crops of both at full size that between them show the whole frame. A moment whose stills are missing or were made from another build is named and left out. `--family carbon` keeps every picture inside 1048 px for that family |
| `npm run sound -- --cue ID [--takes N] [--dry-run]`, `--take FILE`, `--keep N`, `--status`, `--sheet` | Makes the takes of one sound effect from its cue file `audio/cues/<id>.json`, checks each, and keeps one as `audio/kept/sounds/<unit>/<id>.wav` with its record. Takes wait under `out/work/sound/takes/<id>/`. The command prints the row for `ASSETS.md` and does not write it |
| `npm run stress [-- --tier T] [--format ID] [--moments heart,spine,marsh,titan] [--force]` | Renders four short moments, encodes each as delivered and again at a platform's bit rate, and lays the two side by side under `out/work/stress/`. It also keeps the frame of each moment as it was rendered, `<moment>-<format>-<tier>-source.png`, which the R7 pack sets beside the still from the encode. `--moments` runs some of them, so the four can be rendered on four machines and their files brought together in that folder. The encode uses one thread, so it repeats byte for byte. If the final export settings change, change `ENCODE` and `encodeArgs` in `tools/lib/stress-core.mjs` with them |
| `npm run trace` | Traces the outline of the continent from the approved master of the reveal into `src/places/reveal/continent.json`, and writes the outline over the master to `out/work/trace/overlay.jpg`. The numbers it uses are in `RECIPE` at the top of `tools/trace.mjs`; the recipe is in `assets-src/reveal/RECIPE.md` |

The check G6 is `tools/checks/g6.mjs`. It reads the table under "Judged frames" in `kit/PROGRESS.md` and fails while that table is missing or differs from the list the cut list gives.

The check G12 is `tools/checks/g12.mjs` and the rise part of G15 is in `tools/checks/g15.mjs`. Both read `filmStates` from the built page. The rule for a smooth rise is `riseFaults` in `tools/lib/rise-core.mjs`: the camera may not fall, and its climb from one frame to the next may not change by more than a quarter of itself.

## The film, the loop and the local render

| Command | What it does |
| --- | --- |
| `npm run film -- --format uhd|hd|preview --tier draft|review|final [--first N] [--last N] [--unit ID] [--fps N] [--join] [--silent] [--chunks A,B,C | --of K --part I]` | Renders the film in chunks straight into the encoder, keeps every finished chunk under `out/work/film/chunks/`, and joins them with the mix without a second encode. A run that was stopped carries on from the chunks it kept. `--of K --part I` renders one share of the chunks, for one machine of several; `--join` joins what is there |
| `npm run film -- --format uhd|hd|preview --from FILE [--fps N]` | Makes a smaller copy of a film that is already rendered |
| `npm run loop -- --format uhd|hd|preview --tier draft|review|final [--first N] [--last N] [--join]` | Renders the card loop, its web copy and `card-still.jpg` |
| `npm run render:local -- --what film --test [--silent]`, `--what film --go [--prores] [--silent]`, `--what loop`, `--proof` | The render for a machine with a graphics card. `--proof` renders two seconds of the film and of the loop to `out/work/local/` and writes `proof.json` |

A chunk is used again when its record matches the format, the tier, the rate, the frames, the engine hash, the hashes of the unit it shows and the browser version. The machine is not compared, so chunks made on other machines join. The engine hash reads `config/showcase.json`, `src/config.shape.json` and `cut/CUTLIST.json` without the keys no frame is drawn from (`NOT_PICTURE` in `tools/lib/hash.mjs`: the music, the narration, the sound list, the mix, the credit cap and the lines settled for the critics), so when only sound changes the kept chunks still join, with the new mix, and nothing is rendered again. `tests/hash.test.ts` fails if the page starts to read one of those keys. The checks G5, D2 and D7 are `tools/checks/g5.mjs`, `d2.mjs` and `d7.mjs`.

## The parts register and the shots file

| Command | What it does |
| --- | --- |
| `npm run parts [-- --unit ID ...] [--refresh] [--fresh] [--no-pictures] [--write]` | Asks the built page for the live parts of every unit and records each in `parts/PARTS.json` (schema `carcass/parts 1`) with its kind, its state and the hash of its unit's files. For each stand-in it renders the `standins` view of that part alone at the unit's key frames and event frames, keeps the frame that flags the most pixels, and saves the `solo` view of that frame as `out/stills/parts/<unit>/<name>.png`: the reference picture G13 compares a built part against. Without `--write` it prints what would change. `--refresh` takes the pictures again. `--fresh` starts the register again for the units asked for, and is allowed only while every part is a stand-in. With `--unit`, the entries of every other unit are left exactly as they were, hashes and all. The `standIn` record of a part (its hash as a stand-in, its picture, frame, format, tier and share of the frame) is kept through every later change of state or kind. A part that has left the page stays in the register with `missing` and a fault |
| `npm run shots [-- --check]` | Writes `cut/SHOTS.md` from the cut list, the cameras of the built page and the notes in `cut/SHOTS.notes.json`: the lens as a focal length on a sensor 24 mm high, the move with its travel and heights, the start and end framing, the focus and the key of every shot. `--check` exits 1 while a note is missing or the file on disk differs |

`cut/SHOTS.notes.json` holds what a camera cannot say about itself: `scale` (a unit's world unit when it is not the metre, as `{ "reveal": "km" }`), `places` (a paragraph for each unit) and `shots` (for each shot id its `start`, `end` and `focus`, and a `move` sentence where the numbers need one). The numbers in `cut/SHOTS.md` are never typed by hand.

The build makes a web copy of the mix: `closeBundle` in `vite.config.ts` calls `tools/lib/webmix.mjs`, which encodes `audio/mix/mix.flac` as `dist/mix.m4a` and writes `dist/build.json`. `autopilot` plays to it. The picture follows the sound's clock and is set right again when the two drift apart by more than 0.05 s. If the browser will not play sound, the film plays silent on its own clock.


## The published build, `tools/flows.mjs`

`npm run flows [-- --url URL]` replays the visitor's flows listed in `FLOWS.md` against the hosted copy in a fresh browser and exits 1 if one fails. Without `--url` it reads the address of `index.html` from `out/work/host/url.txt`. It counts the frames the page draws from inside the page, because a machine without a graphics card draws a frame in seconds.

## Sound and cut

| Command | What it does |
| --- | --- |
| `npm run audiomap` | Reads the music and writes `cut/MAP.json`: tempo, beats, bar lines, hits, sections, the quiet and the landmarks, with how each compares with `music.landmarks`. `--from-landmarks` writes the map from the config when there is no music file. `--plot PATH` draws it |
| `npm run voice` | Makes the narration with the voice tool, checks every take and keeps one for each clip. See "The voice" below |
| `npm run cut` | Compiles `cut/PLAN.json`, the hand-written plan in bars and beats, against the map and the kept lines into `cut/CUTLIST.json` and `cut/CUES.md`, and checks the rules as it goes |
| `npm run mix` | Builds the soundtrack from the cut list: `audio/mix/mix.flac` and its report `audio/mix/mix.json`. Made twice from the same inputs it is byte for byte the same |
| `npm run animatic` | Makes the animatic from the cut list, the approved pictures and the mix: `out/work/film/animatic.mp4` |

### Where the sound and cut files live

```
audio/supplied/The-Carcass-Audio.mp3     the music, 233.51 s, 44.1 kHz stereo
audio/kept/narration/<clip>.mp3          a whole narration clip as the voice tool returned it, clip ids n1 to n8
audio/kept/lines/<clip>-<line>.wav       one spoken line, 48 kHz mono, levelled, trimmed. <line> is 1 to 4
audio/kept/sounds/<unit>/<id>.wav        a bed or a spot sound
audio/records/<id>.md                    one text record for each kept clip and sound (format in kit/06-ASSETS.md, "Records of sounds")
audio/mix/mix.flac                       the newest mix, 48 kHz stereo, 16 bit
audio/mix/mix.json                       its report
cut/MAP.json                             the map of the music
cut/CUTLIST.json                         the cut list
cut/CUES.md                              the cut list as tables for a person
out/work/film/animatic.mp4               the animatic as it is made (the name is export.files.animatic)
```

### `cut/MAP.json`, schema `carcass/map 1`

Written by `npm run audiomap`. All times are seconds of the music file.

```json
{
  "schema": "carcass/map 1",
  "madeFrom": "audio",
  "source": { "file": "The-Carcass-Audio.mp3", "sha256": "eefe…", "seconds": 233.51, "sampleRate": 44100, "channels": 2 },
  "tempo": { "bpm": 67.0, "beatSeconds": 0.8955, "beatsPerBar": 4, "barSeconds": 3.5821, "confidence": 0.8, "configBpm": 67 },
  "beats": [0.3, 1.1955],
  "bars": [0.3, 3.8821],
  "hits": [ { "t": 17.4, "low": 0.62, "full": 0.8 } ],
  "sections": [ { "name": "quiet 1", "start": 0, "end": 16.5, "lufs": -31.2 } ],
  "quiet": { "start": 153.0, "end": 163.5 },
  "landmarks": { "preludeEnd": 16.5, "firstHit": 17.4, "swellPeak": 40.0, "bigPeakStart": 64.0, "bigPeakEnd": 68.5, "midHit": 102.55, "quietStart": 153.0, "quietEnd": 163.5, "revealHit": 167.0, "tailFadeStart": 218.5, "finalHit": 224.65, "end": 233.5 },
  "compare": { "firstHit": { "map": 17.4, "config": 17.4, "bars": 0.0 } },
  "usedConfigFor": [],
  "tries": [ { "try": 1, "changed": "nothing", "firstHit": 17.4, "quietStart": 153.0, "quietEnd": 163.5, "revealHit": 167.0, "agrees": true } ],
  "notes": []
}
```

- `beats` holds every beat of the grid that lies inside the file, ascending. `bars` holds every bar line, ascending, and each is also in `beats`.
- `hits` holds every strong hit. `low` is its strength under about 150 Hz and `full` across the whole band, each from 0 to 1 against the strongest hit of the track in that band.
- An accent is any value in `beats`, any value in `bars`, or the `t` of any hit.
- `madeFrom` is `audio`, or `landmarks` when no music file was there and the map was written from `music.landmarks` in the config.

### `cut/CUTLIST.json`, schema `carcass/cutlist 1`

Written by `npm run cut`. Frames are film frames at `film.fps` (60). Frame `f` shows film time `f / fps` seconds. Film time and music time are the same up to the one cut in the music; `music.pieces` is the exact relation.

```json
{
  "schema": "carcass/cutlist 1",
  "fps": 60,
  "frameCount": 11700,
  "music": {
    "file": "audio/supplied/The-Carcass-Audio.mp3",
    "pieces": [
      { "from": 0, "to": 178.6, "at": 0 },
      { "from": 217.1, "to": 233.51, "at": 178.6 }
    ],
    "cut": { "outBar": 50, "inBar": 61, "out": 178.6, "in": 217.1, "frame": 10716 }
  },
  "places": [ { "unit": "ribs", "first": 0, "last": 2399 } ],
  "shots": [
    { "id": "ribs-01", "unit": "ribs", "first": 0, "last": 1043, "key": null, "picture": "ribs-0", "move": "in", "label": "The Ribs · the approach" },
    { "id": "ribs-02", "unit": "ribs", "first": 1044, "last": 1473, "key": "ribs-0", "picture": "ribs-0", "move": "in", "label": "The Ribs · establishing view" }
  ],
  "keyFrames": { "ribs-0": 1200 },
  "lines": [
    { "clip": "n1", "line": 1, "text": "Listen.", "unit": "ribs", "first": 150, "frames": 48, "file": "audio/kept/lines/n1-1.wav", "carried": false }
  ],
  "events": [ { "id": "bore", "unit": "ribs", "frame": 2400, "accent": 40.0, "what": "The bore comes through the cage" } ],
  "titanFrame": 10020,
  "sounds": [
    { "id": "ribs-bed", "unit": "ribs", "kind": "bed", "first": 0, "frames": 2400, "file": "audio/kept/sounds/ribs/ribs-bed.wav", "gainDb": -20, "fadeInSeconds": 1, "fadeOutSeconds": 1, "loop": true, "event": null }
  ],
  "mix": { "voiceGainDb": 0, "musicGainDb": 0, "marginDb": 6, "attackSeconds": 0.15, "releaseSeconds": 0.4 }
}
```

- `music.pieces`: music seconds `from` up to `to`, placed at film second `at`. One piece when the music is not cut, two when it is. `music.cut` is `null` or names the two bar lines it joins as indexes into `bars` of the map, with their times, and the film frame of the join.
- `places`: one entry for each unit in `film.order`, in that order, filling frames 0 to `frameCount - 1` with no gap and no overlap.
- `shots`: fill frames 0 to `frameCount - 1` with no gap and no overlap, each inside one place. A cut is the first frame of every shot but the first. `key` is the key the shot answers, or `null`. `picture` is the key whose approved picture stands in for the shot in the animatic, or `"black"`. `move` is `in`, `out`, `hold`, `left` or `right`. `label` is the small text the animatic shows.
- `keyFrames`: one frame for every key in `keys` of the config (34 keys), each inside its own unit's span.
- `lines`: every line of `narration.clips` in script order. `first` is the frame it starts on and `frames` its length. `file` is `null` while no clip is kept. `carried` is true when the line is meant to run across a cut between places.
- `events`: a moment in the picture that lands on the music. `accent` is the music time of the mapped accent it lands on.
- `titanFrame`: the first frame with the whole body in view.
- `sounds`: beds and spot sounds. Empty in Phase 1. `event` names the event a spot sound belongs to, or is `null`.
- `mix`: optional tuning for the mix. Every field has a default in the mix tool.

### `audio/mix/mix.json`, the mix report

```json
{
  "schema": "carcass/mix 1",
  "file": "audio/mix/mix.flac",
  "seconds": 195.0,
  "sampleRate": 48000,
  "channels": 2,
  "integratedLufs": -14.02,
  "truePeakDb": -1.84,
  "gainDb": -3.2,
  "limited": false,
  "inputs": [ { "file": "audio/supplied/The-Carcass-Audio.mp3", "sha256": "…" } ],
  "lines": [
    { "clip": "n1", "line": 1, "first": 150, "frames": 48, "duckDb": 6.5, "voiceBandDb": -24.1, "restBandDb": -31.3, "marginDb": 7.2, "voiceDb": -22.0, "restDb": -27.5 }
  ],
  "sounds": [ { "id": "ribs-bed", "gainDb": -20 } ]
}
```

- `duckDb` is how far the music and the beds were lowered under that line, a positive number. `voiceBandDb` and `restBandDb` are the levels of the voice and of everything else, after ducking, in the band where speech lives (300 Hz to 3.4 kHz) over the span of the line. `marginDb` is their difference. `voiceDb` and `restDb` are the same across the whole band.
