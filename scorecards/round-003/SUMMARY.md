# Round 3 · `heart` · the first round of the look lock

A floor round: the Heart went to its first scored round as soon as none of it was a stand-in (G13 passed at 05:52 UTC), so that the place is judged by fresh eyes early and not after hours of unjudged work. It judges commit `e5b7a22`; the packs and the measures were made from `ef015ca`, which has the same sources. That build holds the second version of every folder of the Heart. Started 2026-11-25 05:52 UTC; the last answer came at 06:45 UTC.

## Scores

| Pack | What it held | Family | Score | Issues |
| --- | --- | --- | --- | --- |
| `R1-1` | Match to the approved pictures: the wide view, the line, the one that sank | gpt | 4 | 5 severe, 11 major |
| `R1-2` | Match to the approved pictures: the walkers at the seam, the mouth and its fall | gpt | 4 | 8 severe, 4 major |
| `R3-1` | Reads as filmed: the wide view, the line, the one that sank, whole and in native crops | claude | 3 | 3 severe, 5 major, 1 minor |
| `R3-2` | Reads as filmed: the walkers at the seam, the mouth and its fall, whole and in native crops | claude | 4 | 2 severe, 6 major, 3 minor |
| `R4-1` | Motion: one sheet across each of the five shots, consecutive frames | gemini | 4 | 3 severe, 4 major |
| `R4-2` | Motion: the surge | gemini | 4 | 1 severe, 1 major, 1 minor |

Merged, the lowest of each critic's packs: R1 4, R3 3, R4 4. The bar is 9 with no severe issue open. The round fails, as a floor round is expected to.

R2, the jury: 25 fresh jurors (five pictures, the fixed panel of five on three families) were each shown one judged frame and asked the question of R2 and nothing else. 4 of 25 answered a photograph or a film frame, a share of 0.16. The controls (the five approved pictures, the same panel, collected at 05:42 UTC) reached 0.96, so a judged share of 0.76 passes. By picture, in the panel's order: the wide view c c c d b, the line c c d d d, the one that sank c d c d b, the walkers at the seam c c c d b, the mouth and its fall c c d d b. All four votes for a film frame came from the same seat of the panel and all four gave the air as the reason.

Measures at the final tier in uhd on the five keys: M1 green; M2 green (10.3, 10.6, 32.5, 34.7 and 60.5 per cent of the picture moves, the floor is 8); M3 red (fine detail against the approved picture 0.83, 1.58, 2.04, 1.09 and, on the long lens to the mouth, 0.26; the floor is 0.75).

Machine checks at 05:58 UTC: 18 of 22 pass. G3 failed (a `discard` before a derivative in the lake's shader; fixed since on `agent/determinism`, merged at 06:44 UTC). G10 failed (a float depth texture in `src/core/engine.ts`; the fix is with the focus builder). D3 is not built yet. A1 is the open sound check.

## Top issues

The critics and the jurors agree with each other, and the Builder agrees with them. Nothing is declined.

1. Severe, both R3 packs, ten jurors: the lake's crust reads as a flat sheet with a stretched texture. "the foreground lava crust looks like a flat sheet covered with a stretched rock texture"; "the ground texture is stretched into horizontal smears, as if projected".
2. Severe, R1 and R3 and six jurors: the lava is paint that lights nothing. "a flat orange and maroon fill with hard cut-out edges ... It lights neither the rock lip above it nor the boulders sitting in it"; "thin, flat painted lines lying on the ground"; "casts almost no emissive orange bounce light onto the surrounding ground".
3. Severe, R4: nothing flows and the animals do not carry weight. The surge switches on in one frame at 4010; the herd reads as mechanical models; shot heart-05 is a still for three seconds; lava patterns are locked in place; the fume column and the far fall are frozen.
4. Severe, R3 and R1: where the far wall and the fall's fan meet the lake there is "a dead-straight horizontal edge, with a thin glowing line along it, and below it is a flat, featureless dark plane".
5. Severe, R1, heart-4 and heart-3: the mouth and the fall are not the picture's. "an opaque dark hole with a nearly horizontal sill instead of a broad, receding ribbed arch above an exposed molten shelf"; "Thin, dull honey-colored ribbons on separate ledges ... instead of a bright branching cascade spreading into a broad incandescent fan with dark crust islands".
6. Severe, R1, and M3 at heart-4: a brown veil through the long lenses. "A widespread brown veil obscures rock and compresses contrast"; "An even gray-brown veil and flat low-contrast illumination replace patchy smoke and stronger orange rim lighting on dark charcoal silhouettes".
7. Severe, R3 and R1: the one that sank sits on "a smooth, uniform rippled blob that reads as a sculpted model or fabric, with no tie to the ground around it".
8. Major, R3, and the reason nine jurors gave: the animals are copies and their feet are discs. "The repeated, lightly varied spider-like creatures read as copies of a single 3D asset"; "every foot ends in an identical smooth grey disc, like a plastic puck or a base plate".
9. Severe and major, R1: staging and focus against the pictures. The line and the one that sank are shot with a shallow focus in the pictures and are sharp throughout here; the pictures of heart-3, heart-2 and heart-4 have a dark rock close to the lens; heart-4 has two tiny animals at the toe of the fan where the frame has one large one at lower left; heart-3 has a pair of animals where the picture has open smoke.
10. Major, R3 and jurors: rock. Stretch on steep faces, faceted silhouettes on the rim and the near rocks, a plastic rim on a boulder, a tiled look on the left cliff, the cave a flat blob with a smeared lip.
11. Major, R3: thin dotted vertical lines in the haze at heart-3. Found at 06:45 UTC by the air owner to be open cracks between strips of the land's wall mesh.

## Declined, with the reason

None.

## What changes next

- The build that was judged is already behind: the third version of all six folders, the light's first version (the fire in the display's primaries) and the determinism fix were merged at 06:44 UTC.
- The lake goes to two fresh owners at once, one for the solid crust (relief built as geometry, no smear, tone and sheen by plate, a crooked far shore), one for the melt (its own surface below the brim, flow, the light it casts, fountains as arcs of gobs). Issues 1, 2, 3 and 4.
- Every issue was sent word for word to the owner of its part at 06:42 UTC with an order of work for the version due 07:40 UTC: the land (a toe of talus over the far shore, silhouettes, a near rock in three views, scree, the cracks in the wall mesh), the air (thin general haze and separate lit bodies of smoke, motion), the walkers (individuals, feet, light from the seam, staging by key), the fall (the arch, one connected diagonal course, the fan, a melt with skin), the one that sank (no round outline, irregular folds, flakes).
- The light owner checks that the glow map lights ground, feet and legs within five metres of a seam, raises the sky's share on the bench and keeps blacks through the long lenses.
- Focus by pose is set as soon as the focus builder hands back (issue 9).
- The camera of heart-4 stays for round 4; if the view still reads as a flat backdrop then, that camera moves.
- Round 4 judges the build with all of the above that has come in.
