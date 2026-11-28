# Asset rows, reveal_body_builder_n30

| file | what | tool or model | prompt | take | date |
| --- | --- | --- | --- | --- | --- |
| public/assets/reveal/land/body-colour.jpg | the colour of the country of the whole body seen from orbit, computed from an eroded height field: height, slope, drainage and distance to the shore, province by province. 3072 x 1728 | assets-src/reveal/land/body/make_body.py (numpy, scipy, Pillow, numba) from maps/map-a-h.png, maps/map-a.jpg, land/shore-a.png | none, computed | seed 30 | 2026-11-28 |
| public/assets/reveal/land/body-relief.jpg | the relief of the same height field in the encoding of relief-a.jpg: red and green the slope, blue the height of the land or the shallowness of water (the old map's shallows, or the computed shelves where they are more). 3072 x 1728 | the same script | none, computed | seed 30 | 2026-11-28 |
| public/assets/reveal/land/body-light.jpg | the baked light of the same height field in the encoding of light-a.jpg: red the horizon toward the day's sun, green the open sky, blue the shut waters (kept from light-a.jpg). 2048 x 1152 | the same script | none, computed | seed 30 | 2026-11-28 |

## Hand-over rows

| what | where | state | next |
| --- | --- | --- | --- |
| The body as land from orbit | `land/body.ts` (hooks set into `land/index.ts`), `assets-src/reveal/land/body/make_body.py`, the three `body-*.jpg` | drawn from 700 km of half height (`JOIN_FROM`, `JOIN_TO` 1150, `BODY_FROM`), alone from 1380 km; relief 1.6, palette A (brown) | `PAL=b` (green and slate) and relief 2.4 were shown and not taken |
| Ribs | generator: `RIBFLAT` 0.7, `LESSFLAT` 0.75, `lesser_ranges()` | one pale band a rib, five or six a side at 10027 | the lesser ranges toward the belly still show as faint dark ranges at native size |
| Hips | `BODY_PAN` (`PAN_LOW`, `PAN_HIGH`, `PAN_THIN`), basin in the generator (seed 37) | irregular pale plate on the basin floor, thin red branching mark | the plate's edge is soft at native size |
| Vents | `BODY_VENTS` (`VENT_LIGHT` 0.8) | by day from orbit each lights the slopes that face it; nothing by night, 11386 and 11743 unchanged by it | the chest's glow of the last two seconds is untouched (`906a72e` held) |
| Night | `BODY_GROUND`, `BODY_LIGHT` (`BODY_NIGHT` 0.024 in `index.ts`) | bones broad pale bands under the moon, their breadth read from the height blurred to the bone's width (level 2.5), full by 0.59 of the ember so the last frames have it whole | the ribs are a little broader than the start's strokes; the fine relief is a faint grain on them |
| Crossing | `JOIN_FROM` 700, `JOIN_TO` 1150 | old maps give way to the body between frames 9790 and 9930, under the motion | it is a dissolve; carrying the body into levels a and b (which would also cure the comb at 9675 and 9739) was ruled out this wave |
| Coast | generator: beach, coastal plain (seeds 41, 42), shelves (`SHELF` 60, seeds 43, 44, 45); `BODY_SURF` (`SURF_SEEN`) | shelves off low shores, beach on some reaches, surf on the beaten reaches from orbit | the coast line itself is the old map's (`shore-a.png`), not moved; creeks of the old map show as thin lines in the lowlands at native size |
| Lake | `land/index.ts`, the lake statement of the water's bed | east coves 13 and 8 (hand-over section 2 point 5) | none |
| Comb at 9675 and 9739 | levels a and b maps | not touched | needs the body's height field carried into those levels |
| Not touched | camera files, `shared/`, `mat/`, `relief-a.png`, the sea's blocks, the air, hand-off and solo blocks | as they were | |

