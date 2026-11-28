# The occlusion of the dead one, baked from its own model lying on the rock: how much of the open sky each point of its skin sees, past
# its own trunk, neck, legs and cords and past the ground it lies on.
# Run: /home/user/bpyenv/bin/python assets-src/breath/dead/occ_bake.py
# Reads out/work/dead/pos.bin, nor.bin, idx.bin (the model as src/places/breath/dead/body.ts builds it, laid on level ground: written by
# the scratch test out/work/vt/dead.test.ts, `VT=dead npx vitest run --config out/work/vt/vt.config.ts`).
# Writes src/places/breath/dead/bodyocc.ts: a byte a point, in the model's own order.
import base64
import bpy  # brings mathutils with it
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

SRC = 'out/work/dead'
pos = np.fromfile(f'{SRC}/pos.bin', dtype=np.float32).reshape(-1, 3).astype(np.float64)
nor = np.fromfile(f'{SRC}/nor.bin', dtype=np.float32).reshape(-1, 3).astype(np.float64)
idx = np.fromfile(f'{SRC}/idx.bin', dtype=np.uint32).reshape(-1, 3)
count = len(pos)
# The rock it lies on: level, at the height the model takes as the rock.
lo = pos.min(axis=0) - 3
hi = pos.max(axis=0) + 3
ground = [(lo[0], 0.0, lo[2]), (hi[0], 0.0, lo[2]), (hi[0], 0.0, hi[2]), (lo[0], 0.0, hi[2])]
verts = [tuple(p) for p in pos] + ground
faces = [tuple(int(i) for i in f) for f in idx] + [(count, count + 1, count + 2, count + 3)]
tree = BVHTree.FromPolygons(verts, faces)

# Rays over the half of the sky a point faces, weighted by how squarely each leaves the skin: the same set for every point.
RAYS = 40
REACH = 0.7
k = np.arange(RAYS) + 0.5
polar = np.arccos(np.sqrt(1 - k / RAYS))
turn = np.pi * (1 + 5 ** 0.5) * k
local = np.stack([np.sin(polar) * np.cos(turn), np.sin(polar) * np.sin(turn), np.cos(polar)], axis=-1)

occ = np.zeros(count)
for i in range(count):
    n = nor[i]
    l = np.linalg.norm(n)
    if not np.isfinite(l) or l < 1e-6:
        occ[i] = 1
        continue
    n = n / l
    a = np.array([0.0, 1.0, 0.0]) if abs(n[1]) < 0.9 else np.array([1.0, 0.0, 0.0])
    t = np.cross(a, n)
    t /= np.linalg.norm(t)
    b = np.cross(n, t)
    start = Vector(pos[i] + n * 0.004)
    seen = 0.0
    for d in local:
        way = t * d[0] + b * d[1] + n * d[2]
        hit = tree.ray_cast(start, Vector(way), REACH)
        if hit[0] is None:
            seen += 1.0
        else:
            # A thing near shuts the sky more than a thing far.
            seen += (hit[3] / REACH) ** 2 * 0.6
    occ[i] = seen / RAYS
data = base64.b64encode(np.clip(np.round(occ * 255), 0, 255).astype(np.uint8).tobytes()).decode()
with open('src/places/breath/dead/bodyocc.ts', 'w') as f:
    f.write('// The occlusion of the dead one, a byte a point of its model in the model\'s own order: baked by assets-src/breath/dead/occ_bake.py\n')
    f.write('// from the model lying on the rock. Do not edit. It is only right for the model it was baked from: bake again when body.ts changes.\n')
    f.write(f'export const OCC_COUNT = {count};\n')
    f.write(f"export const OCC_DATA =\n  '{data}';\n")
print('baked', count, 'mean', occ.mean(), 'min', occ.min())
