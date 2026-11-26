# Asset rows, reveal_land_builder

| file | what | tool or model | prompt | take | date |
| --- | --- | --- | --- | --- | --- |
| public/assets/reveal/land/shore-a.png, shore-b.png, shore-c.png, shore-d.png | signed distance to the shore of each nested map, one channel, with the rivers found by drainage cut into a and b | assets-src/reveal/land/make_bake.py (numpy, scipy, Pillow) from public/assets/reveal/maps/map-*-h.png and land/relief-*.png | none, computed | 1 | 2026-11-26 |
| public/assets/reveal/land/light-a.jpg, light-b.jpg, light-c.jpg, light-d.jpg | red: horizon angle toward the day sun's azimuth; green: open sky share | assets-src/reveal/land/make_bake.py (numpy, scipy, Pillow) | none, computed | 1 | 2026-11-26 |

## Open items at the close (head b45daec, minute 208)

Worst first, as a viewer sees them.

1. The ribs read as a ribcage from about frame 9700, even and parallel, against note 10. The bars come from the map's own light and dark and from the black lava crust between the ribs, not from relief. Two tries are held or left out: `RIB_BURIAL` (kept in `land/index.ts`, set to 0.0: a flat olive wash, a seam at the neck, a one second dissolve from 9864 to 9892) and a second try that breaks the crests by a threshold that rises with height, with full relief (not committed, not checked in motion: each span fades in over about 75 frames, which may read as small dissolves). The second try in words: in the `unjoined` block, `buried = max(smoothstep(0.44 + j, 0.58 + j, along), smoothstep(0.4 + j, 0.54 + j, across))` with `j = 0.62 * smoothstep(380, 1340, uViewKm)`, slope, cast and sky share untouched, crust cut by 0.8 where buried. It left 10027 unchanged and passed G12 and G15.
2. Frame 9756: the shade is a little flatter than reveal-3 (the lead's finding on b45daec).
3. The skull reads with its sockets from 9700. The approved pictures reveal-2 and reveal-3 show the same.
4. Rivers are even ribbons, too parallel between the ribs. The deltas are small.
5. The lake has no broken foam at its wet edge and no ochre tendrils or delta fan as in reveal-1. A first try at threads read as scratches at 9627 and was deleted.
6. The land is soft at native size from 9675 to 9756, between the marched tiles (below about 150 km) and the wide map.
7. The throat's mouths, the strait's lace and the glint were rebuilt after V2; the lead wanted them, no critic has seen them.
8. Item 6 of the list was not begun: the pitted rust plain, frilled lake rims, the far foot.

Cost a frame, uhd draft, seconds, before to last measured (with `RIB_BURIAL` still on, so 9756 and 9675 are upper figures): 10027 10.86 to 11.40 and 11.56; 9756 12.86 to 12.06 and 12.10; 9541 12.0 to 12.67 and 12.90; 9675 11.29 to 12.85.
