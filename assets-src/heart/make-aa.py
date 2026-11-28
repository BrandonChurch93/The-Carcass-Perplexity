# A bed of broken basalt, built and looked down on: angular fragments from a finger to an arm, heaped on one another,
# drawn from straight above by an orthographic lens into a height map that repeats. The surface of the rock itself
# (the pits and grain of scoria) is laid on the height afterwards, and the slopes are taken from the finished height.
# /home/user/bpyenv/bin/python assets-src/heart/make-aa.py OUT_DIR
import math
import os
import sys

import bpy
import bmesh
import numpy as np
from mathutils import Euler, Vector

OUT = sys.argv[-1]
SEED = 11
TILE = 4.0
N = 2048
TOP = 0.8
rng = np.random.default_rng(SEED)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

verts = []
faces = []
tones = []


def block(size):
    """One fragment: the hull of a box whose corners are pulled about, or of points on a lump, a few corners knocked off."""
    kind = rng.random()
    sy = rng.uniform(0.55, 1.0)
    sz = rng.uniform(0.35, 0.8)
    pts = []
    if kind < 0.6:
        for cx in (-1, 1):
            for cy in (-1, 1):
                for cz in (-1, 1):
                    j = rng.uniform(-0.38, 0.38, 3)
                    pts.append(((cx + j[0]) * size, (cy + j[1]) * size * sy, (cz + j[2]) * size * sz))
        for _ in range(int(rng.integers(0, 3))):
            d = rng.normal(size=3)
            d /= np.linalg.norm(d)
            pts.append((d[0] * size * 1.25, d[1] * size * sy * 1.25, d[2] * size * sz * 1.25))
    else:
        for _ in range(int(rng.integers(9, 15))):
            d = rng.normal(size=3)
            d /= np.linalg.norm(d)
            r = rng.uniform(0.8, 1.25)
            pts.append((d[0] * size * r, d[1] * size * sy * r, d[2] * size * sz * r))
    bm = bmesh.new()
    for p in pts:
        bm.verts.new(p)
    got = bmesh.ops.convex_hull(bm, input=bm.verts)
    for v in [g for g in got["geom_interior"] if isinstance(g, bmesh.types.BMVert)]:
        bm.verts.remove(v)
    bm.verts.index_update()
    vs = [v.co.copy() for v in bm.verts]
    fs = [[v.index for v in f.verts] for f in bm.faces]
    bm.free()
    return vs, fs, sz


def lay(size, tilt, sink):
    vs, fs, sz = block(size)
    x = rng.uniform(0, TILE)
    y = rng.uniform(0, TILE)
    turn = Euler((rng.uniform(-tilt, tilt), rng.uniform(-tilt, tilt), rng.uniform(0, 2 * math.pi))).to_matrix()
    z = size * sz * rng.uniform(sink[0], sink[1])
    tone = rng.uniform(0.0, 1.0)
    reach = size * 1.7
    for ox in (-TILE, 0, TILE):
        for oy in (-TILE, 0, TILE):
            if x + ox < -reach or x + ox > TILE + reach or y + oy < -reach or y + oy > TILE + reach:
                continue
            base = len(verts)
            for v in vs:
                w = turn @ v
                verts.append((w.x + x + ox, w.y + y + oy, w.z + z))
            for f in fs:
                faces.append([base + i for i in f])
                tones.append(tone)


def sized(lo, hi, power):
    return lo * (hi / lo) ** (rng.random() ** power)


# Few large, many small: the large ones bedded deep and lying nearly level, the small ones any way up in the gaps and on top.
for _ in range(34):
    lay(sized(0.2, 0.42, 1.6), 0.45, (-0.2, 0.5))
for _ in range(420):
    lay(sized(0.07, 0.2, 1.5), 0.8, (-0.1, 1.4))
for _ in range(5200):
    lay(sized(0.018, 0.07, 1.4), 3.14, (0.2, 2.2))

mesh = bpy.data.meshes.new("aa")
mesh.from_pydata(verts, [], faces)
mesh.update()
tone = mesh.attributes.new("tone", "FLOAT", "FACE")
tone.data.foreach_set("value", tones)
rock = bpy.data.objects.new("aa", mesh)
scene.collection.objects.link(rock)

bed = bpy.data.meshes.new("bed")
bed.from_pydata([(-TILE, -TILE, 0), (2 * TILE, -TILE, 0), (2 * TILE, 2 * TILE, 0), (-TILE, 2 * TILE, 0)], [], [[0, 1, 2, 3]])
floor = bpy.data.objects.new("bed", bed)
scene.collection.objects.link(floor)

# What is drawn: red is the height over the bed, green a number of the fragment's own.
mat = bpy.data.materials.new("height")
mat.use_nodes = True
nt = mat.node_tree
nt.nodes.clear()
geo = nt.nodes.new("ShaderNodeNewGeometry")
sep = nt.nodes.new("ShaderNodeSeparateXYZ")
div = nt.nodes.new("ShaderNodeMath")
div.operation = "DIVIDE"
div.inputs[1].default_value = TOP
att = nt.nodes.new("ShaderNodeAttribute")
att.attribute_name = "tone"
comb = nt.nodes.new("ShaderNodeCombineXYZ")
emit = nt.nodes.new("ShaderNodeEmission")
out = nt.nodes.new("ShaderNodeOutputMaterial")
nt.links.new(geo.outputs["Position"], sep.inputs[0])
nt.links.new(sep.outputs["Z"], div.inputs[0])
nt.links.new(div.outputs[0], comb.inputs[0])
nt.links.new(att.outputs["Fac"], comb.inputs[1])
nt.links.new(comb.outputs[0], emit.inputs["Color"])
nt.links.new(emit.outputs[0], out.inputs["Surface"])
mesh.materials.append(mat)
bed.materials.append(mat)

cam = bpy.data.cameras.new("top")
cam.type = "ORTHO"
cam.ortho_scale = TILE
eye = bpy.data.objects.new("top", cam)
eye.location = (TILE / 2, TILE / 2, 5)
scene.collection.objects.link(eye)
scene.camera = eye

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 16
scene.cycles.use_denoising = False
scene.cycles.max_bounces = 0
scene.cycles.pixel_filter_type = "BLACKMAN_HARRIS"
scene.cycles.filter_width = 1.5
scene.render.resolution_x = N
scene.render.resolution_y = N
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.view_settings.view_transform = "Raw"
scene.render.image_settings.file_format = "OPEN_EXR"
scene.render.image_settings.color_depth = "32"
scene.render.image_settings.color_mode = "RGB"
world = bpy.data.worlds.new("none")
scene.world = world
path = os.path.join(OUT, "aa-height.exr")
scene.render.filepath = path
bpy.ops.render.render(write_still=True)

img = bpy.data.images.load(path)
px = np.empty(N * N * 4, dtype=np.float32)
img.pixels.foreach_get(px)
px = px.reshape(N, N, 4)
np.save(os.path.join(OUT, "aa-height.npy"), (px[:, :, 0] * TOP).astype(np.float32))
np.save(os.path.join(OUT, "aa-tone.npy"), px[:, :, 1].astype(np.float32))
print("fragments", len(tones), "height", float(px[:, :, 0].min() * TOP), float(px[:, :, 0].max() * TOP))
