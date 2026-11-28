# The skin of a rib of the main shaft, sculpted and baked: one length of 32 m by one turn round it, which closes on itself both ways.
# The sculpt is a height in metres over a round rib (numpy), the occlusion is baked from the sculpted rib itself in Blender (Cycles, CPU).
# Run: /home/user/bpyenv/bin/python assets-src/breath/land/rib_bake.py <seed> <name>
# Writes out/work/rib/<name>-h.npy (height, metres), <name>-ao.png, <name>-rust.npy and the previews; rib_pack.cjs packs them for the film.
import sys
import os
import numpy as np

SEED = int(sys.argv[1]) if len(sys.argv) > 1 else 7
NAME = sys.argv[2] if len(sys.argv) > 2 else 'rib-a'
W, H = 2048, 512
LONG = 32.0  # metres along
RADIUS = 1.3  # metres, the round rib the skin lies on
ROUND = 2 * np.pi * RADIUS
OUT = 'out/work/rib'
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(SEED)

fu = np.fft.fftfreq(W, d=LONG / W)[None, :]  # cycles a metre along
fv = np.fft.fftfreq(H, d=ROUND / H)[:, None]  # cycles a metre round


def field(slope, low, high, stretch_u=1.0, stretch_v=1.0):
    """A noise that closes on itself: white noise shaped in the frequency plane. Wavelengths from `high` down to `low` metres."""
    white = np.fft.fft2(rng.standard_normal((H, W)))
    f = np.sqrt((fu * stretch_u) ** 2 + (fv * stretch_v) ** 2)
    f[0, 0] = 1e9
    shape = f ** (-slope) * (f > 1.0 / high) * np.exp(-((f * low) ** 2))
    out = np.real(np.fft.ifft2(white * shape))
    return out / (np.abs(out).max() + 1e-12)


def smooth(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


u = (np.arange(W) + 0.5) / W * LONG
v = (np.arange(H) + 0.5) / H * ROUND
U, V = np.meshgrid(u, v)

# Plates: the mineral skin has come away in sheets, longer along the rib than round it. Each lies at its own height and a crack runs
# between every two. Places are found on a warped lattice so that no edge is ruled.
warp_u = 0.9 * field(1.6, 0.4, 6.0)
warp_v = 0.6 * field(1.6, 0.4, 6.0)
PU, PV = (U + warp_u) / 2.6, (V + warp_v) / 1.15
nu, nv = int(round(LONG / 2.6)), int(round(ROUND / 1.15))
site_u = rng.random((nv, nu))
site_v = rng.random((nv, nu))
site_h = rng.random((nv, nu))
ci, cj = np.floor(PU).astype(int), np.floor(PV).astype(int)
d1 = np.full((H, W), 1e9)
d2 = np.full((H, W), 1e9)
h1 = np.zeros((H, W))
for a in (-1, 0, 1):
    for b in (-1, 0, 1):
        i, j = ci + a, cj + b
        su = i + site_u[j % nv, i % nu]
        sv = j + site_v[j % nv, i % nu]
        d = np.hypot((PU - su) * 2.6, (PV - sv) * 1.15)
        closer = d < d1
        d2 = np.where(closer, d1, np.minimum(d2, d))
        h1 = np.where(closer, site_h[j % nv, i % nu], h1)
        d1 = np.where(closer, d, d1)
edge = d2 - d1  # metres to the plate's edge, about
plate = 0.05 * (h1 - 0.5) * smooth(edge / 0.05)
crack = -0.035 * (1 - smooth(edge / 0.035))
# Where a plate has gone the skin under it is bare and rough: one plate in six.
gone = (h1 < 0.17).astype(float) * smooth(edge / 0.06)

# The long grain of the rib, as a tusk has it: low flutes along it that wander.
flute = 0.022 * field(1.4, 0.08, 1.2, stretch_u=0.12, stretch_v=1.0)
# Broad swells a pace or two across.
swell = 0.06 * field(2.2, 0.8, 9.0)
# Breaks across it: narrow, deep, chipped along their lips.
rings = np.zeros((H, W))
chips = np.zeros((H, W))
for k in range(9):
    at = rng.random() * LONG
    wob = 0.5 * field(1.8, 0.3, 4.0)[:, int(rng.integers(0, W))][:, None]
    d = np.abs(((U - at - wob + LONG / 2) % LONG) - LONG / 2)
    # It does not go all the way round: it starts and stops.
    span = smooth((field(1.5, 1.0, 6.0)[:, int(rng.integers(0, W))][:, None] + 0.25) / 0.3)
    rings = np.minimum(rings, -0.06 * (1 - smooth(d / 0.022)) * span)
    chip = smooth((field(1.2, 0.05, 0.6) + 0.15) / 0.3)
    chips = np.minimum(chips, -0.03 * (1 - smooth(d / (0.05 + 0.14 * chip))) * span)
# Pits: holes a finger to a fist across, in swarms.
swarm = smooth((field(1.8, 1.0, 8.0) - 0.05) / 0.4)
pitn = field(0.6, 0.02, 0.22)
pits = -0.022 * smooth((pitn - 0.42) / 0.2) * (0.25 + 0.75 * swarm)
# Under the belly and down the face the mineral has run and set in cords that hang: ridges that run round the rib, not along it.
low = smooth((np.cos(2 * np.pi * (V / ROUND) - 1.5 * np.pi) + 0.35) / 0.9)  # 1 at the belly (v = 3/4 of the turn)
cords = 0.03 * np.abs(field(1.2, 0.05, 0.9, stretch_u=1.0, stretch_v=0.1)) * low
grain = 0.0035 * field(0.3, 0.012, 0.08)
rough = 0.012 * field(0.9, 0.02, 0.3) * gone

height = swell + plate + crack + flute * (1 - 0.5 * gone) + rings + chips + pits + cords + grain + rough - 0.03 * gone
height -= height.mean()
np.save(f'{OUT}/{NAME}-h.npy', height.astype(np.float32))

# Rust: it starts at the cracks, the breaks and the bare places on the upper side and runs down round the rib both ways, fading.
source = np.clip(1.4 * (1 - smooth(edge / 0.06)) * smooth((field(1.6, 0.8, 7.0) + 0.1) / 0.4) + 3.0 * (-rings / 0.06) + 0.8 * gone * smooth((field(1.6, 0.5, 5.0) + 0.2) / 0.4), 0, 1)
top = int(H * 0.25)  # v = 1/4 of the turn is the top
rust = np.zeros((H, W))
for way in (1, -1):
    run = np.zeros(W)
    acc = np.zeros((H, W))
    for step in range(H // 2 + 1):
        row = (top + way * step) % H
        run = np.maximum(source[row], 0.975 * (0.5 * run + 0.25 * np.roll(run, 1) + 0.25 * np.roll(run, -1)))
        acc[row] = run
    rust = np.maximum(rust, acc)
rust = np.clip(rust * (0.6 + 0.8 * smooth((field(1.4, 0.3, 5.0) + 0.3) / 0.6)), 0, 1)
np.save(f'{OUT}/{NAME}-rust.npy', rust.astype(np.float32))

# The occlusion, baked from the sculpted rib itself.
import bpy  # noqa: E402

bpy.ops.wm.read_factory_settings(use_empty=True)
ang = (np.arange(H) / H) * 2 * np.pi
r = RADIUS + height
# v = 0 is the side toward the shaft, a quarter turn on is the top.
X = np.broadcast_to(u[None, :], (H, W))
Y = r * np.cos(ang)[:, None]
Z = r * np.sin(ang)[:, None]
verts = np.stack([X, Y, Z], axis=-1).reshape(-1, 3).astype(np.float32)
jj, ii = np.meshgrid(np.arange(H), np.arange(W - 1), indexing='ij')
a = jj * W + ii
b = jj * W + ii + 1
c = ((jj + 1) % H) * W + ii + 1
d = ((jj + 1) % H) * W + ii
quads = np.stack([a, b, c, d], axis=-1).reshape(-1, 4)
mesh = bpy.data.meshes.new('rib')
mesh.vertices.add(len(verts))
mesh.vertices.foreach_set('co', verts.ravel())
mesh.loops.add(quads.size)
mesh.loops.foreach_set('vertex_index', quads.ravel().astype(np.int32))
mesh.polygons.add(len(quads))
mesh.polygons.foreach_set('loop_start', np.arange(0, quads.size, 4, dtype=np.int32))
mesh.polygons.foreach_set('loop_total', np.full(len(quads), 4, dtype=np.int32))
mesh.update()
mesh.validate()
# Its own unwrap: along and round, no mirror, the last row of faces closing on the first.
uvl = mesh.uv_layers.new(name='uv')
qu = np.stack([ii, ii + 1, ii + 1, ii], axis=-1).reshape(-1, 4) + 0.5
qv = np.stack([jj, jj, jj + 1, jj + 1], axis=-1).reshape(-1, 4) + 0.5
uvs = np.stack([qu / W, qv / H], axis=-1).reshape(-1, 2).astype(np.float32)
uvl.data.foreach_set('uv', uvs.ravel())
obj = bpy.data.objects.new('rib', mesh)
bpy.context.scene.collection.objects.link(obj)
for p in mesh.polygons:
    p.use_smooth = True
img = bpy.data.images.new('ao', W, H, alpha=False, float_buffer=False)
mat = bpy.data.materials.new('m')
mat.use_nodes = True
node = mat.node_tree.nodes.new('ShaderNodeTexImage')
node.image = img
mat.node_tree.nodes.active = node
mesh.materials.append(mat)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = int(os.environ.get('AO_SAMPLES', '24'))
scene.render.bake.margin = 2
scene.render.threads_mode = 'FIXED'
scene.render.threads = int(os.environ.get('THREADS', '4'))
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
world = bpy.data.worlds.new('w')
scene.world = world
world.light_settings.distance = 0.6
bpy.ops.object.bake(type='AO')
img.filepath_raw = os.path.abspath(f'{OUT}/{NAME}-ao.png')
img.file_format = 'PNG'
img.save()
print('baked', NAME)
