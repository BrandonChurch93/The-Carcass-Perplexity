# Sky, second wave: handover

From `reveal_sky_builder_w2`. The last version is `5b2a4d1` (merged by the lead as `50953e28`).
This file adds no asset and changes no picture.

## What stands wrong, worst first

1. Vapour plumes of the throat (9675, 9756). They are the first wave's plumes again and the lead had faulted them
   before this wave. The one attempt to replace them was held (see "Ribbons" below). Nothing better is in the tree.
2. Sea tufts at 10027. Softer than they were but still fine and bright near pixel size, thinner and less streaked
   than approved picture 4. They are one field read at one scale: there is no real second size of cloud over the sea.
3. Eye of the cyclone. Smooth within a few pixels of the centre. The ringed cells stop short of it.
4. Night flanks (11276 to 11743). Still somewhat like a relief. The rim beside each range is softer, not gone.
5. No lake rim veil at 9627.
6. No ice anywhere.

Not the sky's, seen while working here: the dark crescents on open water and the glint blocks are the land's sea
(`land/index.ts`). Surf lines, the low coast, the lava glow and `moonShade` itself are the land's too.

## What is in the tree now

- Night light, `shared/glsl.ts`, `rigShade`, dusk branch: the moon has a side. Wrapped term
  `0.9 * dot(n, uMoonDir) + 0.1` raised to 2.2, gain 2.2, fill 0.11 (was 0.21), thrown shade floored at 0.3 by
  `mix(0.3, 1.0, moonShade)`. Cyclone and storm are dimmed by night with `1.0 - 0.45 * uEmber.x` (was 0.2).
- Sea tufts, `shared/weather.ts`, `lowDepth`: the first wave's field, with `far = smoothstep(500.0, 1300.0, uViewKm)`.
  The least flecks are let down by a soft knee (`dense * dense / (dense + 0.5 * far)`), the drawn body between
  neighbours is 2.2 times stronger from orbit and carries the knots' form, the field is read 1.5 softer from orbit
  (`lowSoft` in `sky/index.ts`), and the low shadow in `cloudShade` goes from 0.55 to 0.42 from orbit.
- Gold haze in layers, `sky/index.ts`, `CLOUD_FRAGMENT`: two reads of `uMatVeil`, derivatives taken before the branch.
- Cyclone, `CYCLONE_FRAGMENT`: floor inside the bands 0.2 to 0.07, weights toward clumps inside, and near the eye
  cells laid in rings (`ringed`), because the wound lays fall under a pixel there.

## What was tried and held

### The 520 km tuft noise (held as "confetti")

Commits `e2eab55`, `2e30f36`, `2c92fee`. A slow noise 520 km across (`uvGroup`, the blue of `uCloudTile`, thresholded
to `grouped`) gathered the tufts into groups with dark water between, and widened the drawn veil inside a group.
From orbit it read as sparse white dabs of one size with hard rims. The lead's words: confetti, where the old field
read as cumulus. It did lower the pixel to pixel contrast the most (see the table), so it won the measure and lost
the picture. If groups are wanted again, the grouping should change the size of the tufts, not only switch them
on and off.

### Ribbons (held as "piped icing")

Commits `68e233a`, `3f837c9`, `3d3e72b`, in `VAPOUR_FRAGMENT`. Six gaussian ribbons across the trail, each with its
own offset and slow wander, bent together down the wind, with fibre from the trail photograph along them.
They came out as even tubes that loop. What they lacked: width that varies along a ribbon, breaks, and ribbons
that fray into the air instead of ending as a clean line. `3d3e72b` also fitted the sheet to the trail, which took
about a second off 9756; that came from the size of the quad, not from the ribbons, and it left with them.
It could be taken alone.

## Measures

Mean pixel to pixel luma change in 8 by 8 blocks, lower left of 10027 at hd (`out/work/p2p.cjs`, scratch, not kept):

| field | median | p90 | mean |
| --- | --- | --- | --- |
| first wave's field | 7.16 | 18.77 | 8.58 |
| now (`5b2a4d1`) | 5.73 | 15.45 | 6.99 |
| 520 km groups (`2c92fee`) | 4.34 | | |

The first two rows were measured again on the last version. The third is from my notes of the day and was not
measured again.

Cost at 10027, uhd draft, parts none, two runs: 12.96 s before and 12.81 s after on the same merged land.
The measure moves by about 0.2 s from run to run, so this is "no change", not a gain.

The M3 check the lead asked to keep green is not in the repo. I did not run it.

## Derivatives

No new fault found. Every read of a mipmapped texture added under a branch uses `textureGrad` or the `pic` helper
with the derivatives taken before the branch.
