# G10 at Blood Marsh frame 5930: the Marsh lead's second batch

Received by the Builder from `marsh_lead_w2` at about 01:18 UTC on 2026-11-27, word for word:

> LEAD marsh, G10, second batch. On origin now: `agent/p7-marsh-growth` eab411d (`stalks/grown.ts` 192: the trunk's third read of its mipmapped relief sheet stood after the mirror `discard` of 167; moved before it; this shader draws every trunk at 5930) and `agent/p7-marsh-sky-g10-lod` c68339f (`shared/glsl.ts` 117, 127, 173: `tLand` and `tContact` read at level 0 by name; neither has smaller levels, so likely not the cure). Each is the lead branch 4e84d7b plus one commit. A finding of the sky builder, seen in a picture: a solid part drawn alone is not alone. `renderSolo` hides the others, then `brine/index.ts` 300 to 305 (`water.visible = true` in `beforeSample`), `stalks/index.ts` 614 to 631 and `wallowers/index.ts` 123, 124 switch theirs on again, so the water with its mirror, the stalks and the beast are in every solid solo: that is what your eleven failing solos share. Next suspect, with the brine builder now: `shared/brine-glsl.ts` `brineShade`, implicit-level reads of mipmapped `tGrain` at 85, 93, 95 under per-pixel branches, also called by the land from inside a branch. Browser of the sky builder and of the lead: 159 (chromium-1255), so no repeat test from us counts.

Its first change, received about 01:17 UTC: `agent/p7-marsh-life` 718a24a (`wallowers/tread.ts`).

What the Builder did with it: the three changes are tested together on the Builder's machine (browser 147.0.7727.15), and from 01:26 UTC the team has its own test machine with that browser, `film_chunk_renderer_1` (brief `out/work/tmp/r29/g10-tester.txt`). Results are added below as they come.

## Result 1 · the first three changes together, on the Builder's machine

MEASURED 2026-11-27 01:23 to 01:24 UTC, browser 147.0.7727.15: `718a24a`, `eab411d` and `c68339f` applied together on `1718ba08` (each as its change under `src/` since `4e84d7b5`), built, frame 5930 drawn six times in two pages at the draft tier, 960 x 540.

- `DISTINCT byte results 4 ; distinct pixel results 4`. None of the three is the cure, alone or together.
- The six pictures differ by one level at four pixels only (x, y from the top left): (787,195) and (788,195) in 8 of the 13 differing pairs, (870,159) and (153,182) in 5 each.
- The tree was put back and built again after the test (no file under `src/` changed). 6 renders.

Sent to the lead with the note `out/work/tmp/r29/note-marsh-tester.txt` at 01:27 UTC.
