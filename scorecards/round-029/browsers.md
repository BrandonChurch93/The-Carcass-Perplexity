# Round 29 · two browsers on the render machines

Found by the Builder on 2026-11-27 at 01:05 UTC, when `npm run film -- --join` refused to join the preview film of `1718ba08`.

MEASURED by the Builder, from records:

- The 112 chunk films of the preview: 98 carry `browser` 147.0.7727.15 (shares 1 to 6 and 8) and 14 carry 159.0.8154.6 (share 7: chunks 1, 10, 14, 26, 31, 39, 47, 51, 65, 69, 83, 84, 99, 107; 724 frames). The join compares kind, format, tier, engine, units and browser, and refused the 14 as from another build.
- Round 29's measures: the Blood Marsh's (`measures-marsh.json`, from `pack_renderer_r25`) carry 159.0.8154.6; the other six units', G13 and G14 carry 147.0.7727.15.
- The first two searches for the G10 fault (`g10-marsh-measure_renderer_r25.md`, `g10-marsh-2-measure_renderer_r25.md`) ran on a machine with 159.0.8154.6 and never showed the fault.
- The Builder's machine: 147.0.7727.15 (`~/.cache/ms-playwright/chromium_headless_shell-1217`), the pinned browser of Phase 0.

Cause, read in `tools/lib/render.mjs` lines 36 to 37: the harness takes whichever `chromium_headless_shell-*` folder a machine carries and does not check the build number. Phase 0's line that every sandbox machine carries 147.0.7727.15 was true of the machines measured on 2026-11-24 and is not true of every machine now.

What follows:

- The 14 chunks are drawn again on `film_chunk_renderer_1` to `_6`, whose first shares carry 147.0.7727.15 (ordered 01:11 UTC). No record was edited and the join's check was not touched.
- G10: STATED by `pack_renderer_r8` at about 01:14 UTC (`g10-marsh-3-first-pack_renderer_r8.md`): on its machine, browser 147.0.7727.15 and 4 processors, six fresh renders of frame 5930 give 4 distinct files. The fault is now shown on two machines with 147 and not on the one with 159, so it follows the browser as far as three machines can say, not the number of processors.
- Round 29 keeps the Blood Marsh's measures and pack from the machine with 159, and says so. The Marsh's measures are run again on a machine with 147 before its lowest key (0.78 against the floor 0.75) is relied on.
- From here on every order to a render machine asks for its browser first. The frozen build's judged frames, the record round and every film are drawn only by machines with 147.0.7727.15.
- Open: `browserPath()` should prefer the pinned build and say so when a machine does not carry it.
