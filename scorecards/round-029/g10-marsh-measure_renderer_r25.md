# Round 29 · G10 in the Blood Marsh · the search for the cause on a render machine

From `measure_renderer_r25`, arrived 2026-11-27 at about 00:18 UTC. Commit used: `15ca80c8` (the picture code of `4118afc1`). Machine: 4 processors, browser 159.0.8154.6, SwiftShader flags from `tools/lib/render.mjs`. About 23 minutes. Every number below is STATED by the render machine; none was measured by the Builder.

## Short answer

The fault does not show on that machine. Every fresh render of frame 5930 is byte-equal there, so no part could be named. The cause is UNKNOWN.

## Step 1 · frame 5930, preview 960 x 540, draft, as `tools/checks/g10.mjs` calls `renderStill`

- Six renders in one process, in the order portable, plain, portable, plain, portable, plain: 1 distinct byte result, 0 of 15 pairs differ.
- 18 more full renders of 5930: 4 each in its own process and browser (3 plain, 1 portable), 8 more in one process (4 portable, 4 plain), and 6 with the processor loaded by six busy loops (3 portable, 3 plain; a render went from 19 s to about 49 s). All 24 of 24 are the same file.
- PNG sha256 `2775411803b101d75fe75b78a8efaa533f7813df8a1f111077540c729f7ba0d7`; sha256 of the RGB bytes, top row first: `71ffc5eb23078a2a1e966ba8a958950c99553b9892f526419cb9e189fea7b2af`. Render record: engine `4b68cc4defa189d0`, marsh `f5aa0d56643589fa`.
- Read in the code: `config/portable.json` gives the page the portable list and no others on every machine, and `src/core/engine.ts` lines 218 to 225 wraps `getExtension` itself, so `portableOnly` changes nothing the page can see. The 3 pixels on the Builder's machine are therefore plain non-repeatability on that machine, not the extension switch.

## Step 2 · each part alone at frame 5930

- `land` 3 renders, the other 13 parts 2 renders each (crust, brine, domes, burst, stalks, insects, wallowers, dead, fliers, sky, air, rain, steam). Every part: 1 distinct byte result. No part is non-repeatable there.
- Side note: crust, brine, burst and dead gave one and the same file as each other, so those four appear to draw nothing of their own in this frame's solo view.
- The engine has no option to hide one part (`renderSolo`, `src/core/engine.ts` line 462, only hides everything but the part), so no hidden pass was run.

## Step 3 · reading (nothing here is tied to a measured difference)

- By search over `src/`: no `Date`, no `performance.now`, no `Math.random`, no `setTimeout` or `requestAnimationFrame` outside `src/modes/player.ts`; no uuid use. Sorts in the Marsh: `air/index.ts` 110 and 112 break ties by index; `stalks/index.ts` 540 to 541 sort by distance with no tie-break but on fixed input. Pictures: `marsh/index.ts` 91 to 128 awaits every load before the place is returned, and every `assets.texture` call found is at create time.
- Candidates from `git diff e172f8da HEAD -- src/places/marsh` that touch a drawn-to target, not measured: `brine/index.ts` lines 64 to 65, the mirror target went from `LinearFilter` without mipmaps to `LinearMipmapLinearFilter` with `generateMipmaps = true` on a half float target, regenerated before every sample (lines 300 to 303); `shared/brine-glsl.ts` lines 64 to 65 reads it with `textureLod` at level log2(width / 170). The contact map in `shared/rig.ts` line 337 clears colour only. Frame 5930 is in shot `marsh-02` (the stalks, 5833 to 6047), where the polish added `stalks/grown.ts` (718 new lines) and rewrote `stalks/stands.ts` and `stalks/index.ts`. No clock, history target or frame-count dependence was found in them.
- What is left is the drawing side on the Builder's machine: processor count or type, load at the time, or what the same browser had drawn before G10 in the gate run.

## Step 4 · frame 5725

- Six renders in one process (3 portable, 3 plain) plus 4 in their own processes: 10 of 10 the same file, PNG sha256 `328c38f7cd58677356d45b31c14755382519ed333398f195b9c9f7d6d768d469`. Frame 5725, which that machine's earlier notes record as differing by 1 level in a few pixels at `e7991a3e` and `6d70d12e`, repeats byte for byte at `15ca80c8`.

## Count

63 complete single renders (24 full at 5930, 10 full at 5725, 29 solo at 5930). Two more were cut off when a run was stopped and are not counted.

## Deviations

2 solo renders a part instead of 3 for 13 parts; step 4 run before step 2; no crop because no pixel differs. No file under `src/`, `public/` or `config/` changed, nothing pushed.

## What the Builder does with it

The six-render table of step 1 runs on the Builder's own machine, where G10 failed, from 00:19 UTC (`/tmp/g10/s1.log`), to tell a fault of the Marsh from a fault of the machine under load.
