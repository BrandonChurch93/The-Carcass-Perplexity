# Rows of breath_ground_builder_w3

Every file of the ground builder of the third wave that is not computed by the place's own code.

| File | What it is | Tool or model | Prompt or command | Take | Date |
| --- | --- | --- | --- | --- | --- |
| `public/assets/breath/land/ribskin-n.jpg` | The sculpted skin of a rib of the main shaft: its lean along and round the rib, and its baked occlusion, 2048 x 512 | `assets-src/breath/land/rib_bake.py` (numpy sculpt, Blender 5.0.1 Cycles occlusion bake), `assets-src/breath/land/rib_pack.py` | `THREADS=4 AO_SAMPLES=16 /home/user/bpyenv/bin/python assets-src/breath/land/rib_bake.py 7 rib-b` then `python3 assets-src/breath/land/rib_pack.py rib-b` | 2 of 2 (the first had nine breaks and short plates and read as a row of joints) | 2026-11-27 |
| `public/assets/breath/land/ribskin-m.jpg` | The same skin: height, rust and hollows, 2048 x 512 | the same two scripts | the same two commands | 2 of 2 (the first had nine breaks and short plates and read as a row of joints) | 2026-11-27 |
| `src/places/breath/land/ribrelief.ts` | The same height, coarse (256 x 64), as a data module that shapes the mesh | `assets-src/breath/land/rib_pack.py` | the same two commands | 2 of 2 (the first had nine breaks and short plates and read as a row of joints) | 2026-11-27 |

Removed in this wave, with their recipes: `public/assets/breath/land/travface.jpg`, `travface-h.png`, `travskin.jpg`, `travskin-h.png`, their two generated sources under `assets-src/breath/land/src/`, `assets-src/breath/land/make-hoop.py` and `src/places/breath/land/hoopbeds.ts` (the hoops no longer use them).
