# Hand-over of the Reveal, second wave (unit `reveal`, film frames 9541 to 11860)

Written anew by the lead of the unit (`reveal_lead_w2`) at the end of the second wave of the wide polish. Branch `agent/p7-reveal-polish`, last merge `1320c169` (this file is the one commit after it). Keys: reveal-1 at 9627, reveal-2 at 9675, reveal-3 at 9756, reveal-4 (the titan frame) at 10027; the climb begins in the Eye at 9337 and ends at 9841; the ending runs from 10881 to 11743, the last frame that is not black. Builders: land `agent/p7-reveal-land`, climb `agent/p7-reveal-climb`, sky `agent/p7-reveal-sky`. Builders' own notes: `assets-src/reveal/land/HANDOVER-W2.md`, `assets-src/reveal/sky/HANDOVER-W2.md`, and the recipes under `assets-src/reveal/`.

Numbers at the end: guard frames 1241, 4409 and 7234 equal byte for byte to the start; G8, G12 and G15 pass; cost a sample (uhd draft, no parts, two runs) at the start 9541 12.77 s, 9756 12.71 s, 10027 11.50 s, at the end 9541 15.46 s, 9756 14.64 s, 10027 13.08 s, that is 21, 15 and 14 percent more (caps 16.22, 16.14, 14.61). The before set is `out/work/before/`, the after set `out/work/after/` (not in git; made by `out/work/before.sh`).

## 1. Done, part by part, with the commit of each merge

Sky (`src/places/reveal/sky/`, `src/places/reveal/shared/`):
- V1c `55863d1`, merged as `ee46d718`: fog lies on valley floors, a deck of scattered cells with its own shadow. The ice swaths of V1b were left out (hairlines).
- V2b `8d76927`, merged as `9a2ab857`: the cyclone without straight strokes (the bends of the ground the photographs lie on had summed to a fold; stretch now at most 2.7 to 1), a soft eye, sea cells rounder, `sky/banks.png` baked again from the land's second relief.
- `9cbbf25`, merged as `00f12665`: the cyclone's arms break and turn through the hold 10028 to 11103, the cloud field crosses the sea (about 120 px at hd in 6.5 s); `weatherAt` in `shared/anchors.ts` gathers way within 3 s of 10028.
- V3b `7bb2c2b`, merged as `43797da2`: the night is lit from a side (moon term in `shared/glsl.ts`: 2.4 dot^2.2, fill 0.08), so the bones no longer lie as a pale line drawing; haze upper right in two veil lays; the cyclone's finest lay softer; cyclone and storm dimmer by night.
- V4 `5b2a4d1`, merged as `50953e28`: on the same sea field the least flecks are let down by a soft knee and neighbours joined by thin veil (lower left block contrast at 10027, median 7.16 to 5.73), cells laid in rings near the cyclone's eye, the night's thrown shade floored at 0.3. The builder's notes `7374780`, merged as `7c403e06`: `assets-src/reveal/sky/HANDOVER-W2.md`.

Climb (`src/places/reveal/join/`, `handoff.json`, `rise.json`, `src/places/eye/handoff.json`, `src/places/eye/flight.ts`):
- V2 `ec04289`, merged as `42d81370`: the cut at 9540 to 9541 closed in shape and scale from both sides (the Eye's camera now ends at 663.5 m, was 901.0 m); a broken deck of cloud photographs at four heights in place of the hole. Camera equal by numbers at 9300, 9336, 9337 and 9541.
- V3 `4b92825`, merged as `af7a54a4`: no step in brightness at the cut (frame means 118.41 at 9540, 118.44 at 9541; it was 5.3 levels), the brown shore band is under mist on both sides, the Eye's turn to straight down is spread over 104 frames (`release` 214, 318 in `flight.ts`), `shadow` 0.8 in both `handoff.json` (the two files stay equal).
- V4a `d2be444`, merged as `f574fa9c`: the gap in the mist drifts and widens on one clock from 9510 through the cut (means 107.99 at 9540, 108.01 at 9541; steps beside it 0.3 to 0.6), new gaps open over the land until none is left by 9600, every edge cut by the photographed heads.
- V4b `28d8b18`, merged as `1320c169`: line 117, the rise spreads its speed. `covers` 1.178, 1, 1.178, 1 in `rise.json` and three lines in `shared/anchors.ts` let the lens see wider at the first and third keys; only height against time changes. Peak rate 3.90 to 2.69 percent a frame, largest change of rate 0.271 to 0.083 points. Frames 9541 and 10027 equal to the pixel (the builder's measure). The frames nearest the keys are now reveal-1 9621, reveal-2 9675, reveal-3 9731; the handoff frames 9563, 9581, 9594. `cut/` was not touched and `npm run cut` not run.

Land (`src/places/reveal/land/`, `continent.json`, `public/assets/reveal/land/`, `public/assets/reveal/maps/`):
- V2 `7ec8b03`, merged as `c1c3af41`: the lake of the Eye by depth and inflow (shelf, silt eddy, delta, wet edge, no islets); great and lesser ranges and provinces of tan, rust and dark teal in place of the rib comb and the olive green; every map read sets its level before any branch, so frames repeat byte for byte.
- V3b `4fa4604`, merged as `6718500b`: the smooth dome and soft thigh by the pelvis drawn again as an eroded massif and range (`assets-src/reveal/land/hip/`), more of the chest's ranges pale, lake silt a darker amber with shore threads, pelvis pan wider, pools on the pitted plain, the vents out of step.
- V3c `d26aa81`, merged as `c1ade4ed`: the ruled edge in the sea off the far shoulder gone (`westSea` bent into bays), pale rock a third darker by night, cost gated by place, wide maps read 0.6 of a level coarser from orbit.
- V4 `5c32b2a`, merged as `c2ede425`: the chest's ranges leave the spine as ribs again (the first map's parallel ranges laid back on the chest's western three fifths, take 3 east, `assets-src/reveal/land/chest/blend_first.py`), soft silt plumes off the mouth between the legs, the upper lake small and crossed by a bar, the baked horizon read 1.2 levels coarser from orbit (land median at hd 5.0 to 3.9 levels).

## 2. Still wrong, worst first

1. Frame 10027 at native size, land (critics' lines 62, 65, 87, 102 and the compression critic). It shows relief that reads as molded: no ridge, gully or fan exists at the native uhd size, and thrown shadows end in hard one pixel edges. The subject sheet asks for real scale: small sharp detail on big forms; `kit/04-LOOK.md` asks that the picture survive the platform's encode. Tried: wide maps read 0.6 of a level coarser from orbit, the baked horizon 1.2 levels coarser (land median at hd 7 to 3.9 levels): the speckle is less, the detail is no more. Not tried: two more levels of the relief maps; the land builder could not draw them in the wave (see 4).
2. Frames 9756 and 10027, the ribs. They show smooth, even pale bars of one spacing and one flute beside sharper country: the jury's "comb" is back in part (lines 85, 116), and the chest is a ribcage already at 9756. Reveal-3 and reveal-4 ask for ribs that read at once, and they do now at 400 px (the body reads as a human); Brandon's note 10 asks for a continent first, and the critics for broken spacing, height and alignment. Tried: V2 and V3b (unequal great ranges: right as geology, a river fan from the neck at 400 px, the body lost), V4 (the first map's ranges laid back: body won, comb back). Model takes 1, 2, 4 and 5 of the chest lost the ribs or fanned.
3. Frames 9510 to 9600, the join. One round gap leads, so it can still read as an opening; draft edges are crisp as cut paper; the mist between the heads is flat grey with smooth lobes at 9560 to 9572; the decks in the Eye still cross fast (10 to 13 levels of change a frame against the film's 3). The brief asks for footage of a climb through a broken deck of cloud as one unbroken move. Tried: V1 (flat banks, a cut), V2 (photographed decks at four heights; a step of 5.3 levels and a shore patch at the cut), V3 (step and patch cured; holes stood still, a lid fading), V4a (gaps drift and widen on one clock). The puffs 9584 to 9610 are still of one size and evenly strewn.
4. Open sea cloud at 10027 (lines 41, 42, 89; the compression critic's tufts). Fine bright flecks near pixel size on navy where reveal-4 has soft veils and streaks; one field read at one scale. Tried: sky V3 `2c92fee` gathered the tufts by a 520 km noise: sparse dabs of one size with hard rims, held. V4 softened the least flecks on the old field. The dark crescents on open water and the glint blocks near the sun are in the land's sea surface (`land/index.ts`), not in the cloud.
5. Frames 9675 to 9760. The lake of the Eye and the bay beside it can still pair as two eyes in the pale massif: a face. The subject sheet has the body found, not shown. Tried: bay shoaled teal far out, upper lake small and crossed by a bar. The vapour plumes of the throat at 9675 and 9756 are the first wave's (thin, few); six gaussian ribbons (`2c92fee`) were held: even tubes that loop like piped icing.
6. The cyclone: the eye smooth within a few pixels, the ringed cells stop short of it; at draft it still reads as arms.
7. Night, 11276 to 11743: the flanks of the ranges still read a little embossed. The body reads (skull, ribs, arms, legs, the glow in the chest).
8. The rise 9604 to 9668 (line 117): peak 2.69 percent a frame now; the views at the first and third keys are reached 6 and 25 frames earlier, and frames 9627 and 9756 are 17.8 percent wider than the approved pictures. If `cut/` names 9627 and 9756 as key frames it wants 9621 and 9731 now; that is `/root`'s to change.
9. Smaller: silt band at 9627 broad on the south west; ochre plumes only between the legs (line 44, in part); rivers of one width, not seated in the relief (lines 21, 67); rust plain craters (26); grid at 9756 (66); seam in the sea (88); travertine chasm not findable at 10027; no ice; no veil on the lake's rim.

## 3. Versions held back

- `agent/p7-reveal-sky` `3431022` (V1): cloud as a flat print over the land.
- `agent/p7-reveal-sky` `5aa5882` (V1b): ice as hairlines; all else went in as V1c.
- `agent/p7-reveal-sky` `71086dd` (V2): straight crossing strokes on the cyclone's outer left arm, hairlines over the foot, sea flecks as dashes.
- `agent/p7-reveal-sky` `2c92fee` (V3): piped vapour ribbons, confetti sea tufts; night, haze and cyclone went in as V3b.
- `agent/p7-reveal-climb` `f771e55` (V1): a cut at 9540, flat banks.
- `agent/p7-reveal-land` `fea056a` (V1): the ribcage gone at 10027.
- `agent/p7-reveal-land` `10b4efd` (V3): two ochre brush strokes of one width in the bay below the pelvis, the pool east of the lake teal where reveal-1 holds it navy; all else went in as V3b.
- `agent/p7-reveal-land` `9efe0ce` (ochre filaments wound by currents): not judged alone; replaced by V4's plumes.
- `agent/p7-reveal-sky` `3d3e72b` (the vapour sheet fitted to the trail): it saved about a second a sample at 9756 and left with the ribbons; it could be taken alone.
- From wave 1, not to be tried again: rib burial by height (a switch with the camera), the cyclone as a decal or rosette, haze V5, lid V4.

## 4. What to try next for the worst three

1. The two map levels first (`/root` puts them first for wave 3, and wave 3 starts from this branch). Draw relief a and b at 8192 px (or a fifth level between a and b) so that ridges, gullies and fans exist at the native uhd size; a helper machine can bake them from a drawing but cannot draw them, and no bake script exists yet. Allowance: 30 MB added in all, no file over 45 MB, JPEG where a sheet allows, a recipe and a ROWS line each. About 3 hours. Then soften the one pixel edges of thrown shadows. See `assets-src/reveal/land/HANDOVER-W2.md`.
2. The ribs at 9756 and 10027: keep V4's arcs (the body must read) and break them as country: unequal length and height, passes that cut a rib in two, one or two ribs lost under scree or cloud, the flute form varied apart from the ridge pattern, and the same sharpness of detail as the country beside them (they come from the first map and are softer). Judge every step at 400 px beside reveal-4; if fewer than five or six ribs a side read, go back.
3. The join 9510 to 9600: keep the cut (do not reopen the step or the patch). Let several gaps of unlike size open, not one round one; give the mist between the heads its own relief and shade in place of flat grey; lower the 0.79 at which three decks are crossed in half a second in the Eye; then the puffs 9584 to 9610 in groups of unlike size with shadows.

## 5. What a newcomer would trip over

- Pushing fails on this machine ("could not read Username"). Send `/root` a bundle after each merge: `git bundle create reveal-polish.bundle agent/p7-reveal-polish ^origin/agent/p7-reveal-polish ^<builder commit on origin>`.
- Two browsers are installed. Trust repeat tests only on 147 (`chromium_headless_shell-1217`). Frames that did not repeat came from screen derivatives and `texture2D` with implicit level inside per pixel branches; all three builders set levels before any branch now. Keep it so.
- Eye frames never repeat byte for byte: never use one as a guard. Guards are 1241, 4409, 7234.
- `tests/rise-core.test.ts` line 136 is red by design; its replacement is `assets-src/reveal/proposed/rise-core-join.test.ts`.
- `src/places/eye/handoff.json` and `src/places/reveal/handoff.json` must stay equal byte for byte. The Eye's camera up to 9336 must not change. The Eye lead (`agent/p7-eye-polish`) does not touch `flight.ts` or `handoff.json`; at the merge the Eye goes in first, then this unit, and the join is looked at frame by frame on the merged build.
- `shared/anchors.ts` holds the weather's clock and the rise: one builder at a time, by name.
- G12 and G15 guard the rise and the titan frame: run both before each version. After line 117 G15 covers the windows of reveal-1 to 4 with 26.3 px to spare where 29.3 is allowed, 0.5 of 107.0, 224.6 of 250.8 and 2.9 of 587.3: reveal-1 and reveal-3 stand near their limit, so `covers` in `rise.json` cannot go higher.
- `npm run sheet` reuses old frames of the Eye when only `reveal/join` changes: judge the join on stills rendered with `--force`.
- The frames nearest the keys moved with line 117: 9621, 9675, 9731, 10027. The before set of this wave was made at 9627, 9675, 9756, 10027.
- A builder's branch head may run ahead of the version it announced: merge the named commit, not the head.
- One render at a time, never a build while one runs. `dist` follows the branch last built: check out the unit branch and build before any render for a report.
- Cost drifts by about 0.2 s between runs and the machine slowed through the wave; 10027 is the frame nearest its cap.
- No em dashes and no exclamation points in any text; every commit ends with the one trailer.
