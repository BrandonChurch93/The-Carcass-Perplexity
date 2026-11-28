# The sculpt of one wader and its bake, in Blender (bpy as a Python module, Cycles on the processor).
# Run from the repo: /home/user/bpyenv/bin/python assets-src/breath/waders-relief/sculpt.py out/work/bake <which 0..3>
# In: the rest shape written by export-rest.cjs. The shape is pressed in and out along its own surface (ribs and the hollows between them,
# the folds where a leg leaves the trunk, the knots of the joints, the cords down the shank, the rings of the neck, lumps and old scars, each
# animal its own), and then looked at square on from its right side. Out: three float pictures of that view, one pixel for one pixel:
#   <i>-a.exr  how far along a leg, how far along the neck, how much rib cage, and where there is animal at all
#   <i>-b.exr  the phase of the ribs, the surface's lean fore and aft, its lean up and down
#   <i>-o.exr  how hidden each point of the sculpted surface is from the open air
import bpy, sys, json, os
import numpy as np

out, which = sys.argv[-2], int(sys.argv[-1])
meta = json.load(open(os.path.join(out, f'rest-{which}.json')))
k, seed = meta['k'], meta['seed']
ld = lambda n, t, w: np.fromfile(os.path.join(out, f'rest-{which}-{n}.bin'), dtype=t).reshape(-1, w) if w > 1 else np.fromfile(os.path.join(out, f'rest-{which}-{n}.bin'), dtype=t)
pos, nor, idx = ld('pos', np.float32, 3), ld('nor', np.float32, 3), ld('idx', np.uint32, 3)
leg, neck, rib, cage = ld('leg', np.float32, 1), ld('neck', np.float32, 1), ld('rib', np.float32, 1), ld('cage', np.float32, 1)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from relief import press

# The broad part of the sculpt moves the surface itself, so that the hollows between the ribs and the folds are truly hidden from the air.
moved = press(pos[:, 0], pos[:, 1], nor[:, 0], nor[:, 1], leg, neck, rib, cage, k, seed, which, broad=True, leg_len=meta['legLen'], neck_len=meta['neckLen']).astype(np.float32)
sculpted = pos + nor * moved[:, None]

def mesh_of(name, p):
    m = bpy.data.meshes.new(name)
    # Blender: x the animal's fore, z its up, y its left.
    v = np.stack([p[:, 0], -p[:, 2], p[:, 1]], axis=1)
    m.from_pydata(v.tolist(), [], idx.tolist())
    m.update()
    for poly in m.polygons:
        poly.use_smooth = True
    o = bpy.data.objects.new(name, m)
    bpy.context.scene.collection.objects.link(o)
    return o

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
obj = mesh_of('wader', sculpted)
me = obj.data

def attribute(name, r, g, b):
    a = me.color_attributes.new(name, 'FLOAT_COLOR', 'POINT')
    c = np.stack([r, g, b, np.ones_like(r)], axis=1).astype(np.float32)
    a.data.foreach_set('color', c.ravel())

attribute('a', leg, neck, cage)
# Kept between 0 and 1 for the picture: the phase of the ribs from -50 to 50, the leans from -1 to 1.
attribute('b', (rib + 50) / 100, 0.5 + 0.5 * nor[:, 0], 0.5 + 0.5 * nor[:, 1])

def material(name, attr):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n = m.node_tree.nodes
    n.clear()
    o = n.new('ShaderNodeOutputMaterial')
    e = n.new('ShaderNodeEmission')
    if attr is None:
        ao = n.new('ShaderNodeAmbientOcclusion')
        ao.samples = 16
        ao.inputs['Distance'].default_value = 0.22 * k
        m.node_tree.links.new(ao.outputs['AO'], e.inputs['Strength'])
    else:
        a = n.new('ShaderNodeAttribute')
        a.attribute_name = attr
        m.node_tree.links.new(a.outputs['Color'], e.inputs['Color'])
    m.node_tree.links.new(e.outputs['Emission'], o.inputs['Surface'])
    return m

# The view: square on from the right, the whole animal in a square.
x0, x1 = float(pos[:, 0].min()), float(pos[:, 0].max())
y0, y1 = float(pos[:, 1].min()), float(pos[:, 1].max())
side = max(x1 - x0, y1 - y0) + 0.08 * k
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
cam = bpy.data.cameras.new('view')
cam.type = 'ORTHO'
cam.ortho_scale = side
cam.clip_start, cam.clip_end = 0.1, 50
co = bpy.data.objects.new('view', cam)
co.location = (cx, -10, cy)
co.rotation_euler = (np.pi / 2, 0, 0)
scene.collection.objects.link(co)
scene.camera = co
SIZE = int(os.environ.get('RELIEF_SIZE', '1536'))
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.render.resolution_x = scene.render.resolution_y = SIZE
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.cycles.filter_width = 0.01
scene.cycles.use_denoising = False
scene.cycles.max_bounces = 0
scene.view_settings.view_transform = 'Raw'
scene.render.image_settings.file_format = 'OPEN_EXR'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.color_depth = '32'
scene.render.threads_mode = 'FIXED'
scene.render.threads = 4
world = bpy.data.worlds.new('none')
scene.world = world

for name, attr, samples in [('a', 'a', 1), ('b', 'b', 1), ('o', None, int(os.environ.get('RELIEF_AO', '24')))]:
    me.materials.clear()
    me.materials.append(material(name, attr))
    scene.cycles.samples = samples
    scene.cycles.filter_width = 0.01 if attr else 1.2
    scene.render.filepath = os.path.join(out, f'{which}-{name}.exr')
    bpy.ops.render.render(write_still=True)

json.dump({'k': k, 'seed': seed, 'legLen': meta['legLen'], 'neckLen': meta['neckLen'], 'x0': cx - side / 2, 'y0': cy - side / 2, 'side': side, 'size': SIZE}, open(os.path.join(out, f'{which}-view.json'), 'w'))
print('sculpt: done', which)
