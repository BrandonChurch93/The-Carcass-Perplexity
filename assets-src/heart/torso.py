# The trunk of a crust-walker, three of them: a dried carcass drawn over its bones (spine, ribs, blades, hip points), wrinkled and torn.
# Each is a surface over (u along, v around). Blender (Cycles) bakes the occlusion of the fine surface; its normals are written against
# the coarse surface that the film draws, so that the coarse one is lit as the fine one.
# Run: /home/user/bpyenv/bin/python assets-src/heart/torso.py   (writes out/work/torso/*)
import sys, math, json, base64
import numpy as np
import bpy
from PIL import Image

OUT = 'out/work/torso'
W, H = 2048, 1024          # texels along, around
RINGS, SIDES = 128, 32      # the coarse surface
LEN = 4.9
T_SH = 0.5 + 1.75 / LEN
T_HIP = 0.5 - 1.75 / LEN

def hash3(i, j, k, seed):
    n = (i * 374761393 + j * 668265263 + k * 2147483647 + seed * 974711) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    n = n ^ (n >> 16)
    return (n & 0xFFFFFF) / float(0x1000000)

def vnoise(x, y, z, seed):
    xi = np.floor(x).astype(np.int64); yi = np.floor(y).astype(np.int64); zi = np.floor(z).astype(np.int64)
    fx = x - xi; fy = y - yi; fz = z - zi
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz)
    out = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (fx if dx else 1 - fx) * (fy if dy else 1 - fy) * (fz if dz else 1 - fz)
                out = out + w * hash3(xi + dx, yi + dy, zi + dz, seed)
    return out

def g(x):
    return np.exp(-x * x)

def sm(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def surface(nu, nv, v, fine=True):
    """Points of trunk `v` on a grid of nu by nv: u along (0 the rump, 1 the shoulders' end), a around from the keel."""
    seed = v['seed']
    u = np.linspace(0, 1, nu)[:, None] * np.ones((1, nv))
    vv = (np.arange(nv) / nv)[None, :] * np.ones((nu, 1))
    t = 0.5 - 0.5 * np.cos(np.pi * u)
    a = (vv - 0.25) * 2 * np.pi
    c = np.cos(a); s = np.sin(a)
    e = np.power(np.maximum(0, 4 * t * (1 - t)), 0.32)
    x = (t - 0.5) * LEN
    phi = np.arccos(np.clip(s, -1, 1))            # angle from the spine
    # noise that closes round the trunk
    def n3(fa, fr, sd):
        return vnoise(t * LEN * fa + 31.7, c * fr + 17.3, s * fr + 9.1, seed * 13 + sd)
    sag = g((t - 0.5) / 0.2)
    # the back is a hunched dome, highest a little ahead of the middle, that falls to the hips and to the root of the neck
    dome = g((t - 0.56) / 0.42)
    top = 0.6 * e * (0.7 + 0.8 * v['arch'] * dome - v['sway'] * sag + 0.3 * v['hump'] * g((t - T_SH + 0.03) / 0.1) + 0.12 * g((t - T_HIP) / 0.08))
    # the belly hangs in one lobe under the middle, below the line of the hips
    keel = 0.6 * e * (0.62 + v['belly'] * g((t - 0.52) / 0.2) + 0.1 * g((t - T_HIP) / 0.1))
    wide = 0.88 * e * (1 + 0.2 * g((t - T_SH) / 0.085) + 0.2 * g((t - T_HIP) / 0.08) - v['waist'] * sag)
    m = 1 + 0.2 * (n3(0.55, 0.9, 1) - 0.5) + 0.12 * (n3(1.2, 1.9, 2) - 0.5)
    mid = sm(0.03, 0.14, t) * sm(0.97, 0.88, t)
    # spine: a ridge of knobs, each vertebra its own height
    nvb = v['vertebrae']
    vb = t * nvb + 0.35 * (n3(0.8, 0.2, 3) - 0.5)
    knob = np.power(0.5 + 0.5 * np.cos(2 * np.pi * vb), 1.3) * (0.55 + 0.9 * hash3(np.floor(vb + 0.5).astype(np.int64), 0, 0, seed + 5))
    m += mid * g(phi / 0.17) * (0.07 + 0.04 * knob)
    m -= mid * 0.07 * g((phi - 0.36) / 0.13)
    # ribs: from the spine down and back, between the hips and the blades, the skin sunk between them
    ribs = v['ribs']
    cage = sm(T_HIP + 0.07, T_HIP + 0.17, t) * sm(T_SH + 0.0, T_SH - 0.1, t)
    rp = (t - T_HIP) / (T_SH - T_HIP) * ribs + 0.55 * phi + 0.3 * (n3(0.9, 0.7, 4) - 0.5)
    rib = np.power(0.5 + 0.5 * np.cos(2 * np.pi * rp), 2.0)
    span = sm(0.3, 0.55, phi) * sm(2.75, 1.9, phi)
    m += cage * span * (0.13 * rib - 0.075) * (0.7 + 0.6 * n3(0.6, 0.6, 6))
    # the flank fallen in behind the last rib
    m -= 0.26 * g((phi - 1.25) / 0.5) * g((t - T_HIP - 0.11) / 0.07)
    # shoulder blade: a plate with a hard upper edge; the point of the hip; where the legs leave
    m += 0.2 * g((phi - 0.72) / 0.3) * g((t - T_SH) / 0.07) + 0.08 * g((phi - 0.42) / 0.07) * g((t - T_SH) / 0.085)
    m += 0.24 * g((phi - 0.8) / 0.24) * g((t - T_HIP) / 0.05)
    m += 0.24 * g((phi - 1.25) / 0.3) * (g((t - T_SH) / 0.06) + g((t - T_HIP) / 0.06))
    # the belly: what is left of it hangs in a ragged fold a little ahead of the middle
    low = sm(2.1, 3.0, phi)
    m += 0.34 * low * (n3(1.6, 0.8, 7) - 0.4) * mid
    lowpass = m.copy()
    if fine:
        # sinew: cords that run along under the skin, none straight
        q = phi * 7.0 + 2.2 * (n3(0.7, 1.4, 8) - 0.5) + 0.8 * (n3(2.6, 2.2, 9) - 0.5)
        cord = np.power(1 - np.abs(2 * (q - np.floor(q)) - 1), 2.0)
        m += 0.02 * (cord - 0.4) * mid * (0.4 + 1.2 * n3(1.1, 1.0, 10))
        # wrinkles: hide drawn tight, narrow valleys that wander, at three sizes
        for f, amp, sd in ((2.2, 0.075, 11), (5.0, 0.04, 12), (11.0, 0.02, 13)):
            # they run round the trunk, as hide hangs from a spine
            w = n3(f * 1.7, f * 0.5, sd)
            m -= amp * np.power(1 - np.abs(2 * w - 1), 5.0) * mid
        # lumps of dried flesh and the tooth of the surface
        m += 0.05 * (n3(3.5, 3.0, 14) - 0.5) + 0.022 * (n3(9.0, 8.0, 15) - 0.5) + 0.01 * (n3(24.0, 22.0, 16) - 0.5)
        # torn places: the hide has gone and the pit shows dark, a few on the flanks
        hole = sm(0.71, 0.76, n3(1.3, 1.5, 17)) * sm(0.5, 0.9, phi) * mid
        m -= 0.07 * hole * (0.6 + 0.8 * n3(6.0, 6.0, 18))
    pinch = np.where(s < 0, 1 - 0.28 * s * s, 1.0)
    y = s * np.where(s > 0, top, keel) * m
    # z as the film has it: the trunk's own left
    z = -c * wide * pinch * m
    return np.stack([x, y, z], axis=-1), m - lowpass

def grid_normals(p, wrap=True):
    """Normals as the film takes them: across the neighbours of each vertex."""
    up = np.concatenate([p[1:], p[-1:]], axis=0)
    dn = np.concatenate([p[:1], p[:-1]], axis=0)
    du = up - dn
    dv = np.roll(p, -1, axis=1) - np.roll(p, 1, axis=1)
    n = np.cross(dv, du)
    l = np.linalg.norm(n, axis=-1, keepdims=True)
    n = n / np.maximum(l, 1e-12)
    return n, du, dv

def bilinear(grid, uu, vv, wrap_v=True):
    """Sample grid[nu, nv(+wrap)] at u in 0..1 and v in 0..1."""
    nu, nv = grid.shape[0], grid.shape[1]
    fu = uu * (nu - 1); i0 = np.clip(np.floor(fu).astype(int), 0, nu - 2); a = (fu - i0)[..., None]
    fv = vv * nv; j0 = np.floor(fv).astype(int) % nv; j1 = (j0 + 1) % nv; b = (fv - np.floor(fv))[..., None]
    return (grid[i0, j0] * (1 - a) + grid[i0 + 1, j0] * a) * (1 - b) + (grid[i0, j1] * (1 - a) + grid[i0 + 1, j1] * a) * b

VARIANTS = [
    dict(name='a', seed=3, arch=1.0, hump=0.6, sway=0.0, belly=0.75, waist=0.22, vertebrae=19, ribs=9),
    dict(name='b', seed=11, arch=1.25, hump=1.2, sway=0.0, belly=1.0, waist=0.1, vertebrae=16, ribs=8),
    dict(name='c', seed=23, arch=0.55, hump=0.3, sway=0.12, belly=0.4, waist=0.3, vertebrae=22, ribs=11),
]

def bake_ao(points, name):
    nu, nv = points.shape[0], points.shape[1]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    verts = points.reshape(-1, 3)
    i = np.arange(nu - 1)[:, None]; j = np.arange(nv)[None, :]
    a = (i * nv + j); b = (i * nv + (j + 1) % nv); c = ((i + 1) * nv + (j + 1) % nv); d = ((i + 1) * nv + j)
    faces = np.stack([a, b, c, d], axis=-1).reshape(-1, 4)
    mesh = bpy.data.meshes.new('trunk')
    mesh.vertices.add(len(verts)); mesh.vertices.foreach_set('co', verts.astype(np.float32).ravel())
    mesh.loops.add(faces.size); mesh.loops.foreach_set('vertex_index', faces.ravel().astype(np.int32))
    mesh.polygons.add(len(faces)); mesh.polygons.foreach_set('loop_start', (np.arange(len(faces)) * 4).astype(np.int32)); mesh.polygons.foreach_set('loop_total', np.full(len(faces), 4, dtype=np.int32))
    mesh.update(calc_edges=True); mesh.validate()
    uvl = mesh.uv_layers.new(name='uv')
    fi = np.repeat(np.arange(nu - 1), nv); fj = np.tile(np.arange(nv), nu - 1)
    uu = np.stack([fi, fi, fi + 1, fi + 1], axis=-1) / (nu - 1)
    vq = np.stack([fj, fj + 1, fj + 1, fj], axis=-1) / nv
    uvl.data.foreach_set('uv', np.stack([uu, vq], axis=-1).astype(np.float32).ravel())
    mesh.polygons.foreach_set('use_smooth', np.ones(len(faces), dtype=bool))
    ob = bpy.data.objects.new('trunk', mesh)
    scene = bpy.context.scene
    scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    # normals must point out for the occlusion
    mat = bpy.data.materials.new('m'); mat.use_nodes = True
    img = bpy.data.images.new('ao', W // 2, H // 2, alpha=False, float_buffer=False)
    node = mat.node_tree.nodes.new('ShaderNodeTexImage'); node.image = img
    mat.node_tree.nodes.active = node
    ob.data.materials.append(mat)
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 16
    scene.cycles.use_denoising = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new('w')
    scene.world.light_settings.distance = 1.2
    scene.render.bake.margin = 4
    scene.render.bake.use_selected_to_active = False
    bpy.ops.object.bake(type='AO')
    px = np.array(img.pixels[:], dtype=np.float32).reshape(H // 2, W // 2, 4)[..., 0]
    return px    # rows are v (around), columns u (along), v up

def main():
    low_tables = {}
    sheets = []
    for v in VARIANTS:
        hi, relief = surface(W, H, v, True)            # [W, H, 3]
        # the coarse surface: the fine one without its fine relief, at the film's rings
        lo_src, _ = surface(RINGS * 6 - 5, SIDES * 6, v, False)
        lo = lo_src[::6, ::6]
        assert lo.shape[:2] == (RINGS, SIDES)
        # check which way the faces look
        n_hi, du, dv = grid_normals(hi)
        mid = hi[W // 2, H // 2]; out = n_hi[W // 2, H // 2]
        print(v['name'], 'normal at the top looks', out, 'at', mid, flush=True)
        assert out[1] > 0
        # slopes of the fine surface against the coarse one, in the coarse one's own directions
        n_lo, lu, lv = grid_normals(lo)
        uu = (np.arange(W) / (W - 1))[:, None] * np.ones((1, H))
        vv = ((np.arange(H)) / H)[None, :] * np.ones((W, 1))
        N = bilinear(n_lo, uu, vv); N /= np.maximum(np.linalg.norm(N, axis=-1, keepdims=True), 1e-9)
        Tu = bilinear(lu, uu, vv); Tv = bilinear(lv, uu, vv)
        gu = np.cross(Tv, N); gv = np.cross(N, Tu)
        det = np.sum(Tu * gu, axis=-1, keepdims=True)
        det = np.where(np.abs(det) < 1e-9, 1e-9, det)
        gu = gu / det; gv = gv / det
        d = n_hi / np.maximum(np.sum(n_hi * N, axis=-1, keepdims=True), 0.3) - N
        sa = np.sum(d * Tu, axis=-1) * np.linalg.norm(gu, axis=-1)
        sb = np.sum(d * Tv, axis=-1) * np.linalg.norm(gv, axis=-1)
        # the two ends are points: no slope is kept there
        t = 0.5 - 0.5 * np.cos(np.pi * uu)
        endw = sm(0.0, 0.06, t) * sm(1.0, 0.94, t)
        sa = np.nan_to_num(sa) * endw; sb = np.nan_to_num(sb) * endw
        np.save(f"{OUT}/slope-{v['name']}.npy", np.stack([sa, sb], axis=-1).astype(np.float32))
        np.save(f"{OUT}/low-{v['name']}.npy", lo.astype(np.float32))
        np.save(f"{OUT}/relief-{v['name']}.npy", relief.astype(np.float32))
        print(v['name'], 'slopes written', flush=True)
        # occlusion of the fine surface: Cycles at every fourth point and half the texels; the pits finer than that are taken
        # from the relief itself when the sheet is packed
        ao = bake_ao(hi[::4, ::4], v['name'])
        Image.fromarray(np.clip(ao[::-1] * 255, 0, 255).astype(np.uint8)).save(f"{OUT}/ao-{v['name']}.png")
        np.save(f"{OUT}/ao-{v['name']}.npy", ao.astype(np.float32))
        print(v['name'], 'slope range', float(np.percentile(np.abs(sa), 99)), float(np.percentile(np.abs(sb), 99)), 'ao mean', float(ao.mean()), flush=True)

main()
print('TORSODONE', flush=True)
