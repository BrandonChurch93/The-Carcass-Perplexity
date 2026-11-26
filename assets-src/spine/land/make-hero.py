# The first spire as a hero object. Run: /home/user/bpyenv/bin/python assets-src/spine/land/make-hero.py [--no-bake]
# In: the bare blade of the runtime (out/work/hero/*.f32, written by out/work/dump.test.ts from land/meshes.ts spireMesh(first, rng, 2, true)):
#     282 rings by 400 round, positions and normals.
# Made: the rock cut in three sets of joints in space (beds that dip, two upright sets), in three sizes, each block standing in or out of the
#     face with a tilt of its own. Built four times finer than the runtime's lattice; its occlusion is baked in Blender (Cycles, 24 samples) and
#     its normals are taken from the fine mesh, both on the lattice's own unwrap (u round the blade, v up the rings).
# Out: public/assets/spine/land/hero-ao.jpg, hero-n.jpg and src/places/spine/land/hero.ts (the relief on the lattice, 5 cm a count).
import sys, json, base64
import numpy as np
from PIL import Image

ROOT = '/home/user/workspace/repo/'
W = ROOT + 'out/work/hero/'
meta = json.load(open(W + 'meta.json'))
A = meta['around']
P = np.fromfile(W + 'pos.f32', np.float32).reshape(-1, A, 3).astype(np.float64)
N = np.fromfile(W + 'nor.f32', np.float32).reshape(-1, A, 3).astype(np.float64)
WALL = np.fromfile(W + 'wall.f32', np.float32).reshape(-1, A).astype(np.float64)
TOP = np.fromfile(W + 'top.f32', np.float32).reshape(-1, A).astype(np.float64)
R = P.shape[0]
F = 4

def fine(g):
    # Four times finer both ways: round the blade it closes on itself.
    g = np.concatenate([g, g[:, :1]], axis=1)
    r = np.arange((R - 1) * F + 1) / F
    a = np.arange(A * F) / F
    r0 = np.minimum(r.astype(int), R - 2); fr = (r - r0)
    a0 = a.astype(int); fa = a - a0
    if g.ndim == 3:
        fr = fr[:, None, None]; fa = fa[None, :, None]
    else:
        fr = fr[:, None]; fa = fa[None, :]
    top = g[r0][:, a0] * (1 - fa) + g[r0][:, a0 + 1] * fa
    bot = g[r0 + 1][:, a0] * (1 - fa) + g[r0 + 1][:, a0 + 1] * fa
    return top * (1 - fr) + bot * fr

Pf = fine(P); Nf = fine(N); Nf /= np.linalg.norm(Nf, axis=2, keepdims=True) + 1e-9
wall = fine(WALL); top = fine(TOP)
RF, AF = Pf.shape[:2]

def h32(x, y):
    x = np.asarray(x).astype(np.int64); y = np.asarray(y).astype(np.int64)
    h = (x * 374761393 + y * 668265263) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return h / 4294967295.0

def piece(c, mean, seed):
    # A line cut in pieces of no two lengths: which piece, and where in it (-0.5 to 0.5).
    x = c / mean
    i = np.floor(x)
    end = lambda j: j + 0.7 * (h32(j, seed) - 0.5)
    i = np.where(x < end(i), i - 1, np.where(x >= end(i + 1), i + 1, i))
    lo = end(i); hi = end(i + 1)
    return i.astype(np.int64), (x - lo) / (hi - lo) - 0.5

def vnoise3(p, s):
    q = p / s
    i = np.floor(q).astype(np.int64); f = q - i; f = f * f * (3 - 2 * f)
    out = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (f[..., 0] if dx else 1 - f[..., 0]) * (f[..., 1] if dy else 1 - f[..., 1]) * (f[..., 2] if dz else 1 - f[..., 2])
                out = out + w * h32((i[..., 0] + dx) * 73 + (i[..., 2] + dz) * 1013, i[..., 1] + dy)
    return out

up = np.array(meta['up']); up /= np.linalg.norm(up)
ax = np.array([meta['axes']['ax'], 0, meta['axes']['az']])
bx = np.array([meta['axes']['bx'], 0, meta['axes']['bz']])

def unit(v):
    return v / np.linalg.norm(v)

# The three sets. Beds: square to the lean, dipping some 14 degrees into the lee. Uprights: one set a little off the blade's breadth, one a
# little off its thickness (the sheets a face is made of: where one ends the next stands back, in a step that runs up the face).
beds = unit(up + 0.25 * ax + 0.1 * bx)
across = unit(ax - np.dot(ax, up) * up + 0.32 * bx)
sheet = unit(bx - np.dot(bx, up) * up - 0.22 * ax + 0.08 * up)

def level(p, key, tall, wide, deep, stand, lean, warp):
    # One size of block: its number, and how far it stands (metres out of the face).
    q = p + warp * (np.stack([vnoise3(p, 3.1 * wide), vnoise3(p + 31.7, 3.1 * wide), vnoise3(p + 77.3, 3.1 * wide)], axis=-1) - 0.5)
    k, fk = piece(q @ sheet, deep, key)
    kk = (h32(k, key + 5) * 65521).astype(np.int64)
    j, fj = piece(q @ across + 0.37 * wide * h32(k, 3), wide, kk)
    jj = (h32(j, kk + 11) * 65521).astype(np.int64)
    i, fi = piece(q @ beds + tall * h32(jj, 7), tall, jj)
    ident = (h32(i, jj + 3) * 65521).astype(np.int64)
    n = stand * 2 * (h32(ident, 3) - 0.5) + lean * (1.4 * (h32(ident, 7) - 0.35) * fi + 0.9 * (h32(ident, 11) - 0.5) * fj)
    return ident, n

# Where on the blade: ln is -1 at the windward edge and 1 at the lee edge.
th = 2 * np.pi * np.arange(AF) / AF
co = np.cos(th)
ln = np.sign(co) * np.abs(co) ** (2 / 3)
edge = np.abs(ln) ** 12
keep = 1 - np.where(ln > 0, 0.92, 0.45) * edge
kl = np.clip((ln - 0.35) / 0.3, 0, 1); lee = kl * kl * (3 - 2 * kl)
# Half the thickness of the blade here: to the same place on its other face.
half = 0.5 * np.linalg.norm(Pf - Pf[:, (-np.arange(AF)) % AF], axis=2)

id1, n1 = level(Pf, 101, 74.0, 21.0, 13.0, 4.6, 3.6, 9.0)
id2, n2 = level(Pf, id1, 30.0, 8.5, 5.5, 2.0, 1.8, 3.0)
id3, n3 = level(Pf, id2, 10.0, 3.2, 2.4, 0.65, 0.6, 0.8)
d = n1 + n2 + n3
# (Outward less than inward: a block that stands far out of a thin blade is a growth on it.)
d = np.where(d > 0, 0.7 * d, d)
d = np.clip(d, -0.4 * half - 0.2, 0.3 * half + 0.5)
# Toward the lee edge, where the kites hold and their lens looks, the great blocks are left out and the small ones stand whole: clipping the
# sum there left a face with no blocks at all.
d = d + lee[None, :] * (np.clip(0.4 * n2 + 1.3 * n3, -2.5, 1.0) - d)
d = d * keep[None, :]
# The tip keeps its line, and the wall the canal is cut through only stands out.
d = d * np.clip(top / 14.0, 0, 1)
d = d + wall * (0.8 * np.abs(d) - d)
d = np.clip(d, -8.8, 8.8)
# The edge of a block is a narrow slope, not a step: a step that crosses the fine lattice aslant is a stair, and its treads stand in the
# baked normals as stripes when a lens comes close.
raw = d.copy()
for k in range(2):
    d = 0.25 * (np.roll(d, 1, axis=1) + np.roll(d, -1, axis=1)) + 0.5 * d
    d[1:-1] = 0.25 * (d[:-2] + d[2:]) + 0.5 * d[1:-1]

Ph = Pf + Nf * d[..., None]
# The lattice's own relief: the fine one averaged over a quad of the lattice about each vertex, so a step is not cut in shards.
pad = np.concatenate([d[:, -2:], d, d[:, :2]], axis=1)
pad = np.concatenate([pad[:1], pad[:1], pad, pad[-1:], pad[-1:]], axis=0)
low = sum(pad[i:i + RF, j:j + AF] for i in range(5) for j in range(5)) / 25
low = low[::F, ::F]
q = np.clip(np.round(low / 0.07), -127, 127).astype(np.int8)
open(ROOT + 'src/places/spine/land/hero.ts', 'w').write(
    '// Made by assets-src/spine/land/make-hero.py: the relief of the first spire as a hero object, on the lattice of its mesh\n'
    '// (%d rings by %d round, metres out of the bare blade along its normal, %s m a count). Its occlusion and normals are land/hero-ao.jpg and land/hero-n.jpg.\n'
    'export const HERO = { rings: %d, around: %d, unit: 0.07, relief: \'%s\' };\n' % (R, A, '0.07', R, A, base64.b64encode(q.tobytes()).decode()))

du = np.roll(Ph, -1, axis=1) - np.roll(Ph, 1, axis=1)
dv = np.gradient(Ph, axis=0)
nh = np.cross(dv, du)
nh /= np.linalg.norm(nh, axis=2, keepdims=True) + 1e-9
if np.mean(np.sum(nh * Nf, axis=2)) < 0: nh = -nh
SIZE = 2048

# The faces of the blocks, cut at the size of a texel and not of the mesh (hero-n.jpg, 4096 round by 2048 up): no lattice a renderer can
# carry cuts a slab of a metre with a sharp edge, and a normal taken from a fine mesh has the mesh's own cells in it. Every block of every
# size has a face that looks a little its own way (red: round the blade, green: up or down), flat to its edge; blue is the joint between
# two blocks, a crack. The same blocks as the relief: they are functions of the place.
TW, TH = 4096, 2048
Pc = np.concatenate([P, P[:, :1]], axis=1)
tilt = np.zeros((TH, TW, 2), np.float32)
crack = np.zeros((TH, TW), np.float32)
tones = np.zeros((TH, TW), np.float32)
ids = [np.zeros((TH, TW), np.int32) for k in range(4)]
aa = (np.arange(TW) + 0.5) / TW * A
a0 = np.minimum(aa.astype(int), A - 1); fa = (aa - a0)[None, :, None]
for r0_ in range(0, TH, 128):
    rr = (np.arange(r0_, min(TH, r0_ + 128)) + 0.5) / TH * (R - 1)
    i0 = np.minimum(rr.astype(int), R - 2); fr = (rr - i0)[:, None, None]
    p = (Pc[i0][:, a0] * (1 - fa) + Pc[i0][:, a0 + 1] * fa) * (1 - fr) + (Pc[i0 + 1][:, a0] * (1 - fa) + Pc[i0 + 1][:, a0 + 1] * fa) * fr
    key = 101
    sl = slice(r0_, r0_ + rr.shape[0])
    for k, (tall, wide, deep, warp, amp) in enumerate(((74.0, 21.0, 13.0, 9.0, 0.15), (30.0, 8.5, 5.5, 3.0, 0.27), (10.0, 3.2, 2.4, 0.8, 0.38), (4.5, 1.25, 0.9, 0.25, 0.3))):
        key, _ = level(p, key, tall, wide, deep, 1.0, 1.0, warp)
        ids[k][sl] = key
        tilt[sl, :, 0] += amp * 2 * (h32(key, 13) - 0.5)
        tilt[sl, :, 1] += 0.5 * amp * 2 * (h32(key, 17) - 0.5)
        tones[sl] += (0.3, 0.25, 0.27, 0.18)[k] * h32(key, (23, 29, 37, 41)[k])
for k, (dark, wide) in enumerate(((0.75, 2), (0.6, 1), (0.45, 0), (0.25, 0))):
    # (The upright joints are the open ones: the beds are closed by the weight on them.)
    f = (ids[k] != np.roll(ids[k], 1, axis=1)).astype(np.float32)
    f[1:] = np.maximum(f[1:], 0.5 * (ids[k][1:] != ids[k][:-1]))
    for j in range(wide):
        f = np.maximum(f, np.maximum(np.roll(f, 1, axis=1), np.roll(f, -1, axis=1)))
        f[1:] = np.maximum(f[1:], f[:-1])
    crack = np.maximum(crack, dark * f)
hn = np.stack([0.5 + 0.5 * tilt[..., 0] / 1.1, 0.5 + 0.5 * tilt[..., 1] / 1.1, crack], axis=-1)
# (v up: the first row of the picture is the last ring.)
Image.fromarray(np.clip(hn[::-1] * 255 + 0.5, 0, 255).astype(np.uint8)).save(ROOT + 'public/assets/spine/land/hero-n.jpg', quality=74, subsampling=0)
np.save(W + 'd.npy', d.astype(np.float32))
print('relief', d.min(), d.max(), 'fine', RF, AF)
if '--no-bake' in sys.argv: sys.exit(0)

import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
me = bpy.data.meshes.new('hero')
nv = RF * AF
me.vertices.add(nv)
# Blender is z up: (x, y, z) of the world goes to (x, -z, y).
co_ = np.stack([Ph[..., 0], -Ph[..., 2], Ph[..., 1]], axis=-1).reshape(-1, 3).astype(np.float32)
me.vertices.foreach_set('co', co_.ravel())
r = np.arange(RF - 1)[:, None]; a = np.arange(AF)[None, :]
v00 = r * AF + a; v01 = r * AF + (a + 1) % AF; v10 = v00 + AF; v11 = v01 + AF
quads = np.stack([v00, v10, v11, v01], axis=-1).reshape(-1, 4)
nq = quads.shape[0]
me.loops.add(nq * 4); me.polygons.add(nq)
me.loops.foreach_set('vertex_index', quads.ravel().astype(np.int32))
me.polygons.foreach_set('loop_start', np.arange(nq, dtype=np.int32) * 4)
me.polygons.foreach_set('loop_total', np.full(nq, 4, np.int32))
me.update(calc_edges=True)
uvl = me.uv_layers.new(name='lattice')
u0 = (a / AF) + 0 * r; u1 = ((a + 1) / AF) + 0 * r; w0 = (r / (RF - 1)) + 0 * a; w1 = ((r + 1) / (RF - 1)) + 0 * a
uv = np.stack([np.stack([u0, w0], -1), np.stack([u0, w1], -1), np.stack([u1, w1], -1), np.stack([u1, w0], -1)], axis=-2).reshape(-1).astype(np.float32)
uvl.data.foreach_set('uv', uv)
me.polygons.foreach_set('use_smooth', np.ones(nq, bool))
ob = bpy.data.objects.new('hero', me)
sc = bpy.context.scene
sc.collection.objects.link(ob)
# The winding must look outward for the occlusion to be that of the outside.
me.update()
c = me.polygons[nq // 2]
if np.dot(np.array(c.normal), np.array([nh.reshape(-1, 3)[quads[nq // 2][0]][i] for i in (0, 2, 1)]) * np.array([1, -1, 1])) < 0:
    me.flip_normals()
mat = bpy.data.materials.new('bake'); mat.use_nodes = True
img = bpy.data.images.new('ao', SIZE, SIZE, alpha=False)
node = mat.node_tree.nodes.new('ShaderNodeTexImage'); node.image = img
mat.node_tree.nodes.active = node
me.materials.append(mat)
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = 24
sc.cycles.use_denoising = False
sc.render.bake.margin = 4
world = bpy.data.worlds.new('w'); sc.world = world
world.light_settings.distance = 60.0
bpy.context.view_layer.objects.active = ob
ob.select_set(True)
bpy.ops.object.bake(type='AO')
px = np.array(img.pixels[:]).reshape(SIZE, SIZE, 4)[..., 0]
print('ao', px.min(), px.mean(), px.max())
# (24 samples leave a grain: the occlusion is a soft thing, and is read soft.)
from PIL import ImageFilter
px = np.asarray(Image.fromarray(np.clip(px * 255 + 0.5, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))) / 255.0
# With the occlusion (red): the tone of the block a place is on, large and small (green, blue). No two blocks have weathered alike.
def nearest(g):
    r = np.minimum((np.arange(SIZE) + 0.5) / SIZE * (RF - 1) + 0.5, RF - 1).astype(int)
    a = ((np.arange(SIZE) + 0.5) / SIZE * AF).astype(int) % AF
    return g[r][:, a]
# Blue: the ledges. Where a block stands back over the one below it there is a shelf that holds snow: the fine mesh before its edges were
# softened looks up there. Spread a metre or so, so a ledge is a line of snow from far off.
rawP = Pf + Nf * raw[..., None]
rn = np.cross(np.gradient(rawP, axis=0), np.roll(rawP, -1, axis=1) - np.roll(rawP, 1, axis=1))
rn /= np.linalg.norm(rn, axis=2, keepdims=True) + 1e-9
if np.mean(np.sum(rn * Nf, axis=2)) < 0: rn = -rn
shelf = np.clip(0.5 + 0.5 * rn[..., 1], 0, 1)
for k in range(4):
    shelf[1:] = np.maximum(shelf[1:], shelf[:-1])
    shelf = np.maximum(shelf, 0.5 * (np.roll(shelf, 1, axis=1) + np.roll(shelf, -1, axis=1)))
tone1 = tones[:, ::2]
tone2 = nearest(shelf)
out = np.stack([px, tone1, tone2], axis=-1)
Image.fromarray(np.clip(out[::-1] * 255 + 0.5, 0, 255).astype(np.uint8)).save(ROOT + 'public/assets/spine/land/hero-ao.jpg', quality=86, subsampling=0)
