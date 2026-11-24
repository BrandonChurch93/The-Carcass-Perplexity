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
