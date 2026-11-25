# Round 4 · `heart` · the second round of the look lock

It judges commit `fdcac34` (08:26 UTC, 25 Nov): the first hand-backs of the second owners of land, air, fall, walkers and the one that sank, the first versions of the two lake owners (crust and lava), the light's second version, the lens, and staging by shot. The packs and the measures were rendered on two other machines from that commit. Started 2026-11-25 08:26 UTC; the last critic answered at 09:02 UTC and the last juror at 09:15 UTC.

## Scores

| Pack | What it held | Family | Score | Issues |
| --- | --- | --- | --- | --- |
| `R1-1` | Match to the approved pictures: the wide view, the line, the one that sank | claude | 3 | 9 severe, 7 major, 1 minor |
| `R1-2` | Match to the approved pictures: the walkers at the seam, the mouth and its fall | claude | 3 | 6 severe, 5 major |
| `R3-1` | Reads as filmed: the wide view, the line, the one that sank, whole and in native crops | gemini | 3 | 6 severe, 6 major |
| `R3-2` | Reads as filmed: the walkers at the seam, the mouth and its fall, whole and in native crops | gemini | 4 | 4 severe, 4 major |
| `R4-1` | Motion: one sheet across each of the five shots, consecutive frames | gpt | 6 | 1 severe, 2 major |
| `R4-2` | Motion: the surge | gpt | 7 | 2 major |

Merged, the lowest of each critic's packs: R1 3, R3 3, R4 6. Round 3 was R1 4, R3 3, R4 4, on other families (each family judged a critic it had not judged before). The bar is 9 with no severe issue open. The round fails.

What moved: motion, from 4 and 4 to 6 and 7. The lava flows, the animals walk, the smoke rolls, the surge builds. What did not move: the still frame. Both critics of the still frame name the same faults as round 3 in new words, and R1 fell by one on a family that had not seen the place before.

Both critics of R4 first answered in prose and were asked once for the JSON of the brief; the scores and issues did not change between the two answers. The first answers are kept in the cards' notes.

R2, the jury: 25 fresh jurors (five pictures, the fixed panel of five on three families) were each shown one judged frame and asked the question of R2 and nothing else. 2 of 25 answered a photograph or a film frame, a share of 0.08 (round 3: 4 of 25, 0.16). The controls (the five approved pictures, the same panel, collected at 05:42 UTC) reached 0.96, so a judged share of 0.76 passes. By picture, in the panel's order: the wide view c c d d d, the line c c d d c, the one that sank c c d d b, the walkers at the seam c c c c b, the mouth and its fall c c c d c. Both votes for a film frame came from the same seat of the panel and both gave the air, the depth of field and the lava's glow as the reason. Of the 23 others, 13 gave the lake's ground as their one reason, 5 the flat faces of the rocks, 4 the animals and 1 the cliff. Two jurors answered on their machines without sending the answer and were asked once to send it as given.

Measures at the final tier in uhd on the five keys: M1 green; M2 green (12.9, 24.0, 17.7, 44.3 and 35.0 per cent of the picture moves, the floor is 8); M3 red (fine detail against the approved picture 0.79, 0.36, 0.29, 0.25 and 0.55; the floor is 0.75). Round 3's M3 was 0.83, 1.58, 2.04, 1.09 and 0.26: the high numbers of round 3 were the smear and grain of the first lake and of the air, which are gone, so M3 now measures what the critics see, a ground without fine relief.

Machine checks: determinism passed on `fdcac34` before the packs were ordered. The whole gate was run on main after the round (see the Rounds line in `kit/PROGRESS.md`).

## Top issues

The critics and the jurors agree with each other, and the Builder agrees with them. Nothing is declined.

1. Severe, every pack of R1 and R3, 13 jurors: the lake's crust is a smooth sheet. "a flat, even grey cracked-mud playa with regular polygon cracks"; "completely smooth, untextured matte grey clay or plastic with uniform extruded folds and visible dotted seam lines running along the ridges"; "a smooth, clean, lilac-grey plaster-like surface with a few thin cracks and one glowing seam"; "visible stepped, banded displacement artifacts". The picture's crust is ropy, rough and near black, with many glowing cracks and pools.
2. Severe, R1, three keys: the walls are another place. "tall, pale, finely layered sandstone cliffs with sharp peaks on the skyline" against "dark, eroded basalt with talus and sulphur streaks, set low and far".
3. Severe, R1, three keys: a smoke column with a glowing base stands in the centre behind the herd, where the pictures have their plume at the right behind the mesa.
4. Severe and major, R1 and R3, 5 jurors: the loose rocks are low-poly. "sharp, faceted low-poly shards with a stretched, smeared texture and specular sheen"; "razor-sharp rectangular geometric blocks"; "conspicuously flat polygonal faces".
5. Severe, R1 and R3, heart-4: the fall and the mouth. "a single thin lava thread down a pale slope" against "a wide, bright braided cascade that spreads into a broad glowing fan"; "a flat bright orange-yellow painted ribbon with sharp cutout holes and scattered glowing orange dots"; "a smooth carved tunnel with a flat uniform orange glow band"; "a large opaque dark grey smoke mass that hides the landform".
6. Severe, R1, heart-3: the background and the light. "a flat grey-pink smoke wall, a pale blocky slab at left with a thin lava trickle, and an empty orange horizon glow" against a dark towering cliff and a wide lava fall; "flat, cool lilac-grey" against "low-key, warm amber-brown with deep shadows and lava as the key light".
7. Severe and major, R1 and R3, 4 jurors: the animals. "smooth, glossy, segmented with regular ribs, like clean CG models"; "a squat, insect-like body"; pinched joints, a grid on the lower neck, a detached tendril, no contact shadows, a pad that bridges a crack. Their new build was not in the judged commit.
8. Severe, R3 and R1, heart-1: the melt at the line. "a flat glossy procedural orange-yellow pattern with jagged polygonal bank intersections ... and spiky corrugated displacement along the far edge"; and the horizon is "a hard, bright orange band".
9. Severe, R1 and R3, heart-2: the one that sank "sits on a flat decal disc" and "fades out via a soft feathered blend straight into a completely smooth, blank grey plane"; a straight steam column at the tear.
10. Severe, R4: weight. "its torso barely transfers weight over its planted legs"; "a neck animation on a fixed body". Major, R4: the crust at the active margins holds its shape for six seconds; the push in shot heart-04 ends on the same silhouette.
11. Major, R1 and R3, every key: the dusk. "a flat, cool, grey overcast with a blue sky and uniform haze"; the mean levels on rock match the pictures, so this is the lack of darks near the lens and of warmth in the air, not exposure.

## Declined, with the reason

None.

## What changes next

- Already on main since the judged commit: the lava's third version (a narrower line, far seams that do not break into dots) and the light's hand-back B (the lake no longer lights level faces), merged as `6e5ed77` at 09:05 UTC.
- Every owner was sent its part of this round word for word at 09:11 UTC with an order of work.
- The crust owner's third version (relief that reads: cords, billows, broken ridges, a matte near-black tone) is due by 09:29 UTC. If it does not read, a fresh crust owner starts at once.
- Two more owners started at 09:13 UTC: a third lava owner (the melt as a ropy skin in large coils, far seams hidden from a low lens by their own banks, the feeding seam as pools and cracks) and a rocks owner, split off from the land (dense displaced shapes, matte, seated in scree). The land owner keeps the walls and the ground.
- The air moves the plume behind the mesa, makes heart-3 dark and warm, thins the mass at the right of heart-4.
- The walkers' new build (a small hung body, splayed straight bones, a thick tapering neck, pale roots) and the fall's wide cascade are due by 10:05 UTC.
- Round 5 judges main at about 10:30 UTC.
