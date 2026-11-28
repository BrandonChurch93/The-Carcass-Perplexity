# Rows of breath_ground_builder_w3

Every file of the ground builder of the third wave that is not computed by the place's own code.

| File | What it is | Tool or model | Prompt or command | Take | Date |
| --- | --- | --- | --- | --- | --- |
| `src/places/breath/dead/bodyocc.ts` | The dead one's own shade, a number a point of its mesh (63118): how much of the sky each point sees past the body and the ground | `assets-src/breath/dead/occ_bake.py` (Blender bpy 5.0.1, BVH ray cast, 40 rays a point, reach 0.7 m, ground at y 0), from the mesh `dead/body.ts` builds, dumped by a scratch test | `/home/user/bpyenv/bin/python assets-src/breath/dead/occ_bake.py` after each change of `dead/body.ts` | 1 of 1 | 2026-11-27 |

The hoops as ribs with a baked skin (`ribskin-n.jpg`, `ribskin-m.jpg`, `ribrelief.ts`, `rib_pack.py`) were tried in this wave and taken out again: the lead keeps the hoops of the wave before, with their sheets (`travface`, `travskin`) and their recipes as they were.
