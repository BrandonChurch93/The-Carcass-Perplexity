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
- `npm run determinism -- [--tier T] [--format F]`. Renders a film frame, a late film frame and a loop frame on two fresh page loads in opposite orders and compares every pixel. The report is `out/work/determinism/report.json`. It exits with an error when any pixel differs.
- `npm run budget -- [--frame N] [--runs N] [--scene "text"] [--merge FILE ...] [--agents N] [--measure-only] [--reuse] [--write]`. Times a draft and a final frame at every format, works out the seconds for one sample and the fixed cost of a frame, and writes `out/work/budget/<hostname>.json`. `--measure-only` stops there, which is what a sandbox agent runs. `--merge FILE` adds another machine's file, `--reuse` skips the timing and uses this machine's file, and `--write` writes the "Render budget" section of `kit/PROGRESS.md`. The jobs are estimated on the fastest merged machine with four or more cores, split across `--agents` machines (`sandbox.maxAgents` by default).

## The gate, `tools/gate.mjs`

`npm run gate -- --phase N [--only G3,G9] [--json]` runs every machine check, deliverable check and sound check that the phase names and prints one pass or fail line for each, then a summary. A check that is named and not built yet counts as a failure. Sound checks are advisory. The registry is `tools/checks/index.mjs`: to add a check, write `run(ctx)` that resolves to `{ ok, lines, skipped }` and name it in `BUILT`.

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
