# Hand-over of the Reveal after Brandon's note of 27 November (unit `reveal`, film frames 9541 to 11860)

Written anew by the lead of the unit (`reveal_lead_n30`) at the end of round 30. Branch `agent/p10-reveal-note30` from `origin/main` (`19cbefe`), last merge `407f0bd` (this file is the one commit after it). The hand-over of the third wave is this file as it stands at `origin/main` `19cbefe`: its sections on the join, the comb and the chest glow still hold and are not repeated in full here.

The note, word for word: "The reveal scene could use a little bit more wow factor. The planet itself is a bit boring. The best thing about it is the hurricane, but there's no other landmasses or anything. It just looks like a blue marble. Also, you can see space in the background, but you don't actually see any stars or anything cool out there. Also the landmass is still pretty ugly. I'm not sure if there's anything we could do about that though, besides making the scene overall look better."

Keys: reveal-1 at 9621, reveal-2 at 9675, reveal-3 at 9739, reveal-4 (the titan frame) at 10027. Against the approved pictures at the end: 9621 nearer by the lead's look (the east coves smaller; mean change 0.78 of 255 at draft preview); 9675 and 9739 the same (a few pools changed, mean under 0.05); 10027 changed as the note asks (other land, a sea of more than one blue, ice, stars, a moon, the body as country) and, in what the note does not name, the same: the cloud is the start's.

Numbers at the end.
- Guards, drawn on `407f0bd` at draft preview and compared byte for byte with the start: 1241, 4409, 7234, 9221, 9336, 9540 equal.
- Cut 9540 to 9541: mean 6.3507 (start 6.3519, must not be higher).
- Three draws of 10027 on `407f0bd`: equal. `--diag invalid` at 10027 and 11386: 0 and 0. G8 pass. G12, G15 pass and `determinism: pass` on `407f0bd`. Nothing outside the unit's three folders.
- Keys against the start at draft preview, mean change of 255: 9541 0.0122 (one level at most), 9621 0.7762, 9675 0.0451, 9739 0.0061, 10027 11.32.
- Measures: 10027 M1, M3 green, fine detail 1.7211 (floor 0.75); 9621 M1, M3 green, 1.9391.
- Cost at 9541, 9756, 10027, best of three. The last pair back to back, on `0581336`: start 14.53, 12.62, 11.69 s; unit 14.47, 13.02, 11.56 (minus 0.4, plus 3.2, minus 1.1 percent; cap 6). On `407f0bd`, 20 minutes later and not beside the start: 14.57, 12.65, 11.34.
- Size: 230,018,606 bytes in `public/assets/reveal` and `assets-src/reveal` before this file, 5.64 MB added of 12.
- Proof pictures (not in the repo): `out/work/proof4/` on the lead's machine; they went to `/root` with report 4.

## 1. Done, part by part, with the commit of each merge

List of the takes: `git log --first-parent --merges --reverse --format='%h %s' origin/main..HEAD`. Two reverts are in the history (section 5).

Ocean (`land/ocean.ts`, `public/assets/reveal/land/ocean-bed.jpg`, `ocean-land.jpg`, `assets-src/reveal/land/ocean/`; its blocks in `land/index.ts`):
- V1 `883cb88`, merged as `4386b26`: a sea bed, an island arc at the lower left, a far coast and ice under the edge at the upper left, read from two baked maps.
- V2 `073bcaa`, merged as `7729782`: land amount D, fat shelves and lit strands, an ice sheet over the far land, silt of three rivers through one current field (the old silt block of `land/index.ts` is gone), moonlit shelves.
- V3 `0110c9b`, merged as `6aa0419`: land amount E by `/root`'s ruling, a land at the top edge right of centre, a land below the storm from 11100, pack ice with a hard edge and leads, other land greener than the body's country.
- V4 `02776a5`, merged as `c84891b`: other land takes relief from the moon by night, the pack ice is rafts with open water, the top land 90 master px further into 10027.

Space (`sky/space.ts`, `sky/space-band.ts`, `public/assets/reveal/sky/space-band.jpg`, `space-moon.png`, `assets-src/reveal/space/`; the edge's block in `sky/index.ts`):
- V1 `58834f4`, merged as `80ccc0d`: stars as points, a moon of its own (not the rig's), a galaxy band, the edge line unbroken.
- V2 `03989e7`, merged as `3dbe7bc`: the band long across the corner, cooler, with lanes; stars of unlike size and colour.
- V3 `8a364c1`, merged as `a65e2d3`: the moon one size, 140 px at uhd, in frame from 10027 to 11743, its dark side faintly lit by the planet; the band kept to the end.
- V4 `a2fc07e`, merged as `0581336`: one even soft arc of airglow in place of the aurora (the green line in two pieces that `/root` saw at 11743 is gone), fewer stars of more unlike brightness.

Body (`land/body.ts`, `public/assets/reveal/land/body-colour.jpg`, `body-light.jpg`, `body-relief.jpg`, `assets-src/reveal/land/body/make_body.py`; the rest of `land/index.ts`):
- V1b `da60db2` was merged as `3374e04` and taken off again as `815f124` on `/root`'s word (bones narrower than the start's at 960, the country near the sea's value, the hips a round disc). `e4f0b10`'s first parent undoes that revert.
- V2 `442778e`, merged as `e4f0b10`: each bone pale across its whole old breadth and ridged by an eroded height field, the country earth brown and as light against the sea as the start's, the hips a worn basin.
- `a77aa71`, merged as `e5388f6`: one range a rib (so five or six a side count at a glance), the hips plate uneven with a thinner red mark, vents light the rock round them, the crossing from the near land to the orbit land stretched (about 9790 to 9995), a coastal plain, surf. The lake's east coves are 13 and 8: this is what changes 9621.
- V3 `5a1cb88`, merged as `1bcbbb1` (rows `3cafdcb` as `d3c534b`): by night each bone is one broad pale band under the moon, limbs and ribs; shelves under the water off low shores.
- V4 `16015d3`, merged as `407f0bd` on a draft look, not measured: night rib edges smooth, lanes of deeper water across the shelves.

Weather (`shared/weather.ts`, the rest of `sky/index.ts`): nothing of it is in the film. See section 3.

Last versions (due minute 220): body V4 `16015d3` came at minute 205 and was merged on a draft look; the guards and gates above were run on it afterwards, but nobody judged it on a full sheet. Weather V4 `9960849` came at minute 210 and was held back for cost (section 3).

## 2. Still wrong, worst first

1. The cloud, every frame of the hold. It is the start's: soft grey patches and one family of small cumulus where reveal-4 has fine white cloud over the whole sea, and the cyclone is the only system. Brandon named the storm as the best thing in the frame, and `/root` asked for a second system as crisp as the cyclone at 11100 at 960 wide. Four weather versions were held back (section 3); the last had the picture right and cost a fifth more than the cap allows.
2. The ice at the upper left. It reads as ice now (rafts, leads, a rock shore), but the rafts are one size of polygon, at 11100 it is near the bones' value (p99 162 against 164, the ocean builder's count) and it is the largest pale field in the frame after the body. At 10027 half of it lies under cloud.
3. The crossing, 9790 to 9930. The near land (levels a to c) and the orbit land (the body's new maps) are two pictures and the film dissolves from one to the other. The body builder judged the cure (carry the body into levels a and b) at an hour or more with 9675 and 9739 at risk; not started.
4. The night side, 11386 to 11743. The body reads as a body at a glance and the bones are broad bands, but the sea is near empty of cloud forms, the other lands are dim flat shapes, and the airglow arc is all but gone at 11743.
5. Space by day. At 10027 space is a wedge of 2.6 percent of the frame; it holds the moon and few stars. By 11743 it is a fifth of the frame: stars, the band and a crescent moon. The brightest stars are discs of 5 to 6 px at uhd.
6. The frames are lighter than the start (10027 mean 70.4 to about 75.9 of 255 at draft preview, the ocean builder's count): teal shelves and paler land. reveal-4's sea is deep navy. The note outranks the picture here, but nobody chose the amount.
7. Seen by `/root` on the last look (minute 222), listed and not changed, no hand was free to prove a change: at 11100 the stars are many round dots of near-equal size and brightness and read as snow at 960 (a few bright, many dim, fewer in all); at 11743 the dust band is a column of grain (softer, the grain under the glow); the raft field is a net of lines at 11743; at 9675 the ridges round the lake run out evenly like a comb where reveal-2 has branching valleys; at 9621 a soft dark arc lies under the lake that reveal-1 does not have. The arc is in the start's frame too (`19cbefe`), so it is not of this round; what casts it is not known.
8. From the third wave, untouched: the comb at 9675 and 9739, the join 9500 to 9548, old creeks as thin lines in the body's lowlands, the dull skirt of the sun's glare.

## 3. Versions held back

- `agent/p10-reveal-weather` `8fb3d5a` (V1): fine white flecks over the whole sea. Merged as `e01f6ec`, taken off as `9b07406` on `/root`'s look: at 960 wide an even speckle, rain on glass.
- `agent/p10-reveal-weather` `2bf0b83` (V2): a baked systems map (`sky/weather.png`, one sampler `uWeather` added to the list in `shared/rig.ts`), a far low with a front, a small third storm, banks on the far coast, moonlit forms by night. Held back: at 10027 at 960 the large patches are dim grey translucent smudges, smoke and not cloud.
- `agent/p10-reveal-weather` `be022a4` (V3, first push): patch bodies with white tops. Held back: the second storm was the cyclone's twin and lay against the skull, where it reads as an ear.
- `agent/p10-reveal-weather` `be223ac` (V3): the second storm a comma low in open sea south of the ribs, whole in frame from 10027 to 11743; a white-topped bank at the lower left. Held back: the sea at 9675 and 9739 is bare where reveal-2 and reveal-3 have white cloud over it (two keys further), and at 10027 the open sea is barer than reveal-4's. The cost of the first push `be022a4` on the lead's machine, on scratch `c032053`: 14.55, 12.38, 11.28 s against the unit's 14.54, 12.95, 11.42.
- `agent/p10-reveal-body` `2f1d1fb` (V1): bones as thin etched lines by night, the tan country as light as bone, a red province at the foot.
- `agent/p10-reveal-body` `da60db2` (V1b): see section 1; off by `815f124`.
- Choices seen and not taken: ocean land amounts A, B, C, D (E is in); moon 64 and 96 px (140 is in); stars many and even with an aurora (fewer with one arc is in); body palette B green slate and relief 2.4 (A brown, 1.6 are in); coast A without shelves.
- `agent/p10-reveal-weather` `9960849` (V4, the last): below about 9800 the start's cloud code runs as it was (9621, 9675, 9739 byte equal to the unit's branch on the lead's look), from orbit white-topped banks over open sea on every side, none on other land, a comma low south of the ribs, clear water round the hurricane. On the lead's draft look at 960 (scratch `22a1fdc`, the unit's `407f0bd` with it): keys equal, the body not dimmed (pixels over 140 in the body's field 9.66 percent against 9.62 at 10027), the comma clear of the skull. Held back for cost alone: 17.41 s at 9541 against the unit's 14.57 back to back on the lead's machine, plus 19.5 percent where the cap is 6 over the start; the builder read 17.57, 15.61, 13.90 s against 14.54, 12.97, 11.66. The builder's own guard run on it: three draws equal, invalid 0, guards equal, cut 6.3507, G8 and determinism pass. Not looked at: the dissolve between the two cloud fields, 9762 to 9903.

## 4. What to try next for the worst three

1. The cloud. Start from `9960849`: its picture was accepted on a look and only its cost keeps it out. V3 `be223ac` was level with its base (the builder: 14.84, 12.69, 11.20 against 14.75, 12.69, 11.52), so the fifth came when the start's cloud code was put back beside the new one. The builder's guess, unproven: both fields are compiled into and paid at every frame, not only in the cross-over 9762 to 9903. Cost follows the shader code compiled, so a uniform that switches one field off will not cure it; try two programs split by lens height as the land's are (the start's cloud alone below about 9800, the new field alone above about 9900, both only between), and count the texture reads in `WEATHER_GLSL`, each is paid twice. Time it against `origin/main` back to back before any look. Then, in the picture: look at the dissolve 9762 to 9903 on a sheet, make the comma larger (30 px at 960), add cloud shadow on the sea beside each bank, pull the banks off the island coasts, thin the night banks. The mask of other land is `assets-src/reveal/land/ocean/ocean-mask.png` (red other land, green ice); it changed four times in this round, so make the map again from the unit's branch. Judge at 960 wide at 9739, 10027, 11100 and 11743 beside reveal-3 and reveal-4.
2. The ice. Rafts of unlike size (three scales), the sheet a value under the bones at 11100, a blue shadow side on the pressure ridges. If it still pulls the eye from the skull at 400 px, make the sheet smaller, not vaguer (`/root`'s word).
3. The crossing. The cheap step is done (the dissolve is long and low). The real cure is one land from 9739 up: carry the body's eroded field into levels b and c with the skull kept old inside level c's footprint, and check 9675 and 9739 beside their pictures at each step. It is an hour or more; do it first in a round, not last.

## 5. What a newcomer would trip over

- Judge at 960 wide (the preview's own size) as well as at 400 px and on a native crop. Brandon watches at 960. Three first versions of this round were careful at 960 where he asks for more, and `/root` sent them back.
- The pictures rule: a version that brings 10027 nearer in one thing and takes the body's mass away is not a gain. The branch must at every moment be only better than its start. The lead merged body V1b and weather V1 on a look at 400 px and both came off again.
- After a revert of a merge, a later merge of the same branch brings nothing back of the reverted commits. Revert the revert first (`e4f0b10^` does this for the body). Weather: `9b07406` reverts `e01f6ec`, but the builder's branch later merged the unit's branch (the revert with it) and kept its own `weather.ts`, so a plain merge of the branch gave the builder's files (checked each time by `git diff` of the merge against the builder's head).
- `land/index.ts` is shared by the ocean and the body. The one hand settlement of this round: the two import lines (`./ocean` and `./body`) were kept both, at `2a7dafd`.
- The still tool draws from its own built site. Check out the branch, build, then render. One render at a time, never a build while one runs.
- Cost: `origin/main` and the head back to back in one session, best of three. Single runs drift by 0.3 to 0.7 s; the same code read 11.96 to 12.76 s on one builder's machine. Cost follows the shader code compiled, not what runs.
- The camera is nobody's: `rise.json`, `handoff.json`, `join/`, lines 52 to 91 of `shared/anchors.ts`, any Eye file. In the hold it drifts so that space grows from 2.6 percent of the frame at 10027 to a fifth at 11743; the storm stays 60 px from the right edge, so land beyond it can only show below it.
- Other land must never read as a second body, touch the titan's outline or continue it. The land below the storm lies on the lower foot's line, 1000 master px out, with the storm between: do not let it grow toward the foot.
- A second storm beside the skull reads as an ear. Keep weather systems off the body's outline.
- 9541 differs from the start by one level in 19,026 pixels at draft preview (the body's maps); the cut mean 9540 to 9541 fell from 6.3519 to 6.3507.
- `measure` exits 0 even when red: read its lines.
- No em dashes and no exclamation points in any text; every commit ends with the one trailer.
- All else in section 5 of the third wave's hand-over still holds (the Eye's lid, `relief-a.png` read by the sky, the tests of the rise).
