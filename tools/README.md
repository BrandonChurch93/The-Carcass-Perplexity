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

Owned by the Builder. Every command that needs a frame goes through it.

```js
renderStill({ frame, key, id, loop, tier = 'review', format = 'hd', diag = null })
// One of frame (a film frame index), key (a key id from the config), id (a judged frame by name) or loop (a loop frame index).
// format is a format id from the config: 'uhd', 'hd' or 'preview'.
// Resolves to { file, record, reused }: file is an absolute PNG path under out/work/stills/, exactly the size of the format.
// record is also written beside the file as file + '.json'. reused is true when a matching still already existed.

filmInfo()
// Resolves to what the page's film() returns:
// { fps, frameCount, shots: [{ id, unit, first, last, key }], keyFrames: { [keyId]: frame }, events: [{ id, frame }],
//   titanFrame, loop: { frameCount, unit } }

closeRenderer()
// Closes the shared browser. Call it once before a command exits.
```

A record: `{ engine, units, format, tier, diag, browser, machine, frame, loop, key, made }`. `engine` and the values of `units` are hashes. A command reuses an output only when its record matches the current state.

## Pictures made from stills

`tools/lib/img.mjs` holds the shared picture code. The limits for anything a critic sees are `critics.maxImageLongEdgePx` and `critics.maxImageMegapixels`.

- `tools/crops.mjs` exports `cropGrids({ file, name, regions })` and is the command `crops`.
- `tools/compare.mjs` exports `compareKey({ key, tier, format })`, which resolves to `{ file, files }`, and is the command `compare`.
- `tools/sheet.mjs` exports `sheet({ frames, loopFrames, name, tier, title })`, which resolves to `{ file }`, and is the command `sheet`.

Each of them appends a look.
