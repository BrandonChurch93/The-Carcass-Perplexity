# Round 29 · what a frame costs before and after the first wave of the polish

From `/root/pack_renderer_r11`, received 2026-11-27 at 00:38 UTC. MEASURED on one render machine (4 processors): `npm run -s cost -- --frame N --format uhd --tier draft` with `--parts none --runs 2`, one sample a frame, the tool's own figure for the whole frame, which is the lower of its two runs. After: `1718ba08`. Before: `e172f8da`, the build before the polish. The two logs are beside this file.

| Frame | Unit | Before (s) | After (s) | After / before |
| --- | --- | --- | --- | --- |
| 1241 | `ribs` | 10.04 | 11.72 | 1.167 |
| 2722 | `heart` | 23.52 | 23.62 | 1.004 |
| 4409 | `breath` | 24.62 | 26.64 | 1.082 |
| 5725 | `marsh` | 12.86 | 16.16 | 1.257 |
| 7234 | `spine` | 19.77 | 21.92 | 1.109 |
| 8412 | `eye` | 11.10 | 17.21 | 1.550 |
| 10027 | `reveal` | 10.52 | 11.57 | 1.100 |
| all seven | sum | 112.43 | 128.84 | 1.146 |

The first wave's rule was at most 30 percent more a sample for a unit (the Heart: no more than before). Six units kept it at their first key. The Eye did not: 55 percent more. One frame a unit is a sample, not the whole unit.
