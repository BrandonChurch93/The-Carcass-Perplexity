# The bones on the lip of the Eye, sculpted in Blender: one of the herd, long dead, lying on its side and come apart.
# Every bone is roughed out of simple closed bodies, fused and worn by Blender's voxel remesh, pitted and chipped by displacement,
# and cut down to a count the film can carry. Ribs are thin and uneven, some snapped, some fallen flat; the limbs have come apart
# at the joints; the skull has a braincase, a long muzzle with the notch of the nose, cheek ridges, teeth and a loose jaw, and
# neither eye socket nor ear hole.
# The frame is the film's own: x along the spine (the skull at the low end), y up from the floor, z toward the camera.
# Writes src/places/eye/skeleton/sculpt.ts: corners as 16 bits in the box given, triangles, and three bytes a corner
# (the tone of its bone, how near an end of its bone it is, how much of the sky it sees).
# Run: /home/user/bpyenv/bin/python assets-src/eye/skeleton/make_bones.py
import base64
import os
import bpy
import numpy as np

R = np.random.default_rng(8761)
OUT = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'src', 'places', 'eye', 'skeleton', 'sculpt.ts')


def rot(rx, ry, rz):
    cx, sx, cy, sy, cz, sz = np.cos(rx), np.sin(rx), np.cos(ry), np.sin(ry), np.cos(rz), np.sin(rz)
    X = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Y = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Z = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Y @ X @ Z


def ball(centre, size, turn=(0, 0, 0), seg=14, rings=9):
    v = [(0, 1, 0)]
    for i in range(1, rings):
        a = np.pi * i / rings
        for j in range(seg):
            b = 2 * np.pi * j / seg
            v.append((np.sin(a) * np.cos(b), np.cos(a), np.sin(a) * np.sin(b)))
    v.append((0, -1, 0))
    f = []
    for j in range(seg):
        f.append((0, 1 + (j + 1) % seg, 1 + j))
    for i in range(rings - 2):
        for j in range(seg):
            a = 1 + i * seg + j
            b = 1 + i * seg + (j + 1) % seg
            f.append((a, b, b + seg, a + seg))
    last = len(v) - 1
    base = 1 + (rings - 2) * seg
    for j in range(seg):
        f.append((last, base + j, base + (j + 1) % seg))
    v = (np.array(v) * np.array(size)) @ rot(*turn).T + np.array(centre)
    return v, f


def spline(points, n):
    p = np.array(points, float)
    if len(p) == 2:
        t = np.linspace(0, 1, n)[:, None]
        return p[0] * (1 - t) + p[1] * t
    q = np.vstack([2 * p[0] - p[1], p, 2 * p[-1] - p[-2]])
    out = []
    segs = len(p) - 1
    for k in range(n):
        u = k / (n - 1) * segs
        i = min(int(u), segs - 1)
        t = u - i
        a, b, c, d = q[i], q[i + 1], q[i + 2], q[i + 3]
        out.append(0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t ** 3))
    return np.array(out)


def tube(points, radius, flat=(1.0, 1.0), sides=8, n=None, jag=0.0, spin=0.0):
    """A closed tube along the points; radius is a number or a function of 0..1. A jagged far end is a break."""
    n = n or max(6, 4 * len(points))
    path = spline(points, n)
    tangent = np.gradient(path, axis=0)
    tangent /= np.linalg.norm(tangent, axis=1, keepdims=True) + 1e-12
    ref = np.array([0.0, 1.0, 0.0]) if abs(tangent[0][1]) < 0.9 else np.array([1.0, 0.0, 0.0])
    nrm = np.cross(tangent[0], ref)
    nrm /= np.linalg.norm(nrm)
    v = []
    for i in range(n):
        t = tangent[i]
        nrm = nrm - t * (nrm @ t)
        nrm /= np.linalg.norm(nrm)
        bi = np.cross(t, nrm)
        s = i / (n - 1)
        r = radius(s) if callable(radius) else radius
        for j in range(sides):
            a = 2 * np.pi * j / sides + spin
            off = 0.0
            if jag and i == n - 1:
                off = jag * R.uniform(-1, 1)
            v.append(path[i] + r * (flat[0] * np.cos(a) * nrm + flat[1] * np.sin(a) * bi) + t * off)
    r0 = radius(0.0) if callable(radius) else radius
    r1 = radius(1.0) if callable(radius) else radius
    v.append(path[0] - tangent[0] * r0 * 0.6)
    # A break is hollow: the marrow has gone.
    v.append(path[-1] + tangent[-1] * (r1 * 0.6 if not jag else -1.2 * jag))
    f = []
    for i in range(n - 1):
        for j in range(sides):
            a = i * sides + j
            b = i * sides + (j + 1) % sides
            f.append((a, b, b + sides, a + sides))
    c0 = n * sides
    for j in range(sides):
        f.append((c0, (j + 1) % sides, j))
        f.append((c0 + 1, (n - 1) * sides + j, (n - 1) * sides + (j + 1) % sides))
    return np.array(v), f, path


def join(parts):
    verts = []
    faces = []
    base = 0
    for v, f in parts:
        verts.append(np.asarray(v, float))
        faces.extend([tuple(int(i) + base for i in face) for face in f])
        base += len(v)
    return np.vstack(verts), faces


TEX = {}


def texture(kind, scale, depth=2):
    key = (kind, scale, depth)
    if key not in TEX:
        t = bpy.data.textures.new('t%d' % len(TEX), kind)
        t.noise_scale = scale
        if kind == 'CLOUDS':
            t.noise_depth = depth
        TEX[key] = t
    return TEX[key]


def sculpt(verts, faces, voxel, target, worn=0.004, pits=0.0025, grain=0.0012, smooth=2):
    """Fuse, wear, pit and cut down: returns corners and triangles."""
    mesh = bpy.data.meshes.new('bone')
    mesh.from_pydata([tuple(map(float, v)) for v in verts], [], faces)
    mesh.update()
    obj = bpy.data.objects.new('bone', mesh)
    bpy.context.scene.collection.objects.link(obj)
    if voxel:
        m = obj.modifiers.new('fuse', 'REMESH')
        m.mode = 'VOXEL'
        m.voxel_size = voxel
        m.adaptivity = 0.0
        if smooth:
            s = obj.modifiers.new('soft', 'SMOOTH')
            s.factor = 0.6
            s.iterations = smooth
    # Worn unevenly at the size of the bone, pitted at the size of a fingertip, rough at the size of a grain.
    for name, tex, strength, mid in (
        ('worn', texture('CLOUDS', 0.05, 2), worn, 0.5),
        ('pits', texture('VORONOI', 0.012), -pits, 0.25),
        ('grain', texture('CLOUDS', 0.006, 1), grain, 0.5),
    ):
        if strength == 0:
            continue
        d = obj.modifiers.new(name, 'DISPLACE')
        d.texture = tex
        d.texture_coords = 'LOCAL'
        d.strength = strength
        d.mid_level = mid

    def read():
        dg = bpy.context.evaluated_depsgraph_get()
        ev = obj.evaluated_get(dg)
        me = ev.to_mesh()
        me.calc_loop_triangles()
        v = np.zeros(len(me.vertices) * 3, np.float32)
        me.vertices.foreach_get('co', v)
        t = np.zeros(len(me.loop_triangles) * 3, np.int32)
        me.loop_triangles.foreach_get('vertices', t)
        ev.to_mesh_clear()
        return v.reshape(-1, 3).copy(), t.reshape(-1, 3).copy()

    v, t = read()
    if len(t) > target:
        dec = obj.modifiers.new('fewer', 'DECIMATE')
        dec.ratio = target / len(t)
        v, t = read()
    bpy.data.objects.remove(obj)
    bpy.data.meshes.remove(mesh)
    return v, t


BONES = []


def add(v, t, tone=None, axis=None, ends=0.25):
    """Keeps a finished bone. axis: the two ends of a long bone, for how near an end each corner is."""
    tone = R.uniform(0.3, 0.95) if tone is None else tone
    if axis is not None:
        a, b = np.array(axis[0]), np.array(axis[1])
        l = np.linalg.norm(b - a)
        s = np.clip(((v - a) @ (b - a)) / (l * l), 0, 1)
        e = np.clip(1 - np.minimum(s, 1 - s) / 0.16, 0, 1)
    else:
        e = np.full(len(v), ends)
    BONES.append((v, t, tone, e))


def place(v, turn, at):
    return v @ rot(*turn).T + np.array(at)


def long_bone(a, b, r, broken=False):
    """A shaft with a knuckle at each end: two condyles one end, a head the other."""
    a = np.array(a, float)
    b = np.array(b, float)
    l = np.linalg.norm(b - a)
    d = (b - a) / l
    side = np.cross(d, [0, 1, 0])
    side /= np.linalg.norm(side) + 1e-9
    bow = side * l * R.uniform(-0.05, 0.05)
    mid = (a + b) / 2 + bow

    def rad(s):
        return r * (0.62 + 0.75 * np.exp(-((s / 0.1) ** 2)) + 0.6 * np.exp(-(((1 - s) / 0.09) ** 2)) + 0.08 * np.sin(s * 9))

    parts = []
    if broken:
        cut = R.uniform(0.45, 0.65)
        v, f, _ = tube([a, a + (mid - a) * cut * 2], lambda s: rad(s * cut), (1.12, 0.86), 9, 14, jag=r * 0.9)
        parts.append((v, f))
    else:
        v, f, _ = tube([a, mid, b], rad, (1.12, 0.86), 9, 22)
        parts.append((v, f))
        parts.append(ball(b - d * r * 0.5 + side * r * 0.75, (r * 0.95, r * 0.8, r * 0.8)))
        parts.append(ball(b - d * r * 0.5 - side * r * 0.75, (r * 0.9, r * 0.75, r * 0.8)))
    parts.append(ball(a + d * r * 0.4 + side * r * 0.5, (r * 1.2, r * 1.0, r * 1.05)))
    parts.append(ball(a + d * r * 1.1 - side * r * 0.9, (r * 0.6, r * 0.5, r * 0.6)))
    v, f = join(parts)
    v, t = sculpt(v, f, max(0.0028, r * 0.22), 520, worn=r * 0.3, pits=r * 0.22)
    add(v, t, axis=(a, b))


def vertebra(at, length, size, heading, blade, tilt=(0, 0, 0)):
    """A body, the blade that stands off its back (toward -z here: the back is away from the camera), and a wing each side."""
    parts = [ball((0, 0, 0), (length * 0.5, size, size * 1.05))]
    v, f, _ = tube([(0, 0, -size * 0.6), (length * 0.15, 0, -size - blade * 0.5), (length * 0.4, 0, -size - blade)], lambda s: size * (0.5 - 0.22 * s), (0.6, 1.5), 7, 7)
    parts.append((v, f))
    for sgn in (1, -1):
        v, f, _ = tube([(0, sgn * size * 0.5, -size * 0.2), (length * 0.1, sgn * (size * 1.5 + blade * 0.3), -size * 0.5)], lambda s: size * (0.42 - 0.2 * s), (1.4, 0.5), 6, 5)
        parts.append((v, f))
    v, f = join(parts)
    v = place(v, (tilt[0], heading + tilt[1], tilt[2]), at)
    v, t = sculpt(v, f, 0.003, 300, worn=size * 0.18, pits=size * 0.12)
    add(v, t)


def rib(points, r, broken=0.0, tone=None):
    """Thin, flat, uneven; thick at its head. broken: how much of it is left, 0 for whole."""
    k = R.uniform(0, 6)
    w = R.uniform(1.25, 1.6)

    def rad(s):
        return r * (0.75 + 0.9 * np.exp(-((s / 0.07) ** 2)) + 0.22 * np.sin(s * 11 + k) + 0.12 * np.sin(s * 29 + 2 * k)) * (1 - 0.45 * s * s)

    pts = np.array(points, float)
    if broken:
        whole = spline(pts, 40)
        pts = whole[: max(4, int(40 * broken))][::3]
        v, f, _ = tube(pts, lambda s: rad(s * broken), (w, 0.74), 7, max(6, int(26 * broken)), jag=r * 1.3)
    else:
        v, f, _ = tube(pts, rad, (w, 0.74), 7, 26)
    v, t = sculpt(v, f, 0, 400, worn=r * 0.3, pits=r * 0.14, grain=0.0005)
    add(v, t, tone=tone, axis=(pts[0] - (pts[1] - pts[0]) * 3, pts[-1]))


def lump(at, size, turn=None, target=120):
    turn = turn if turn is not None else R.uniform(-1, 1, 3)
    parts = [ball(at, size, turn), ball(np.array(at) + R.uniform(-0.4, 0.4, 3) * size, np.array(size) * R.uniform(0.5, 0.8), R.uniform(-1, 1, 3))]
    v, f = join(parts)
    v, t = sculpt(v, f, max(0.003, min(size) * 0.3), target, worn=min(size) * 0.3, pits=min(size) * 0.2)
    add(v, t)


# ---- The spine: it sags and wanders, and two of its bones have rolled out of line.
def spine(x):
    return np.array([x, 0.05 + 0.03 * np.sin((x + 0.35) * 3.2), -0.17 + 0.05 * np.sin(x * 4.1 + 0.5) + 0.03 * np.sin(x * 11.0)])


RIBS = 12


def rib_x(i):
    return -0.31 + i * 0.066


def full(i):
    return 0.62 + 0.38 * np.sin(np.pi * (i + 1.5) / (RIBS + 2))


for i in range(RIBS):
    x = rib_x(i)
    c = spine(x)
    rolled = R.uniform() < 0.2
    vertebra(c + (R.normal(0, 0.008, 3) if not rolled else np.array([R.uniform(-0.02, 0.02), -0.02, R.uniform(-0.06, -0.02)])), 0.056, 0.02, R.normal(0, 0.12) + (R.uniform(-1.2, 1.2) if rolled else 0), 0.055 * full(i) + 0.012, tilt=(R.normal(0, 0.2), 0, R.normal(0, 0.15)))
    s = full(i)
    state = R.uniform()
    lean = 0.05 + 0.04 * np.sin(i * 0.9 + 1) + R.uniform(-0.03, 0.05)
    up = R.uniform(0.45, 1.0) if state > 0.3 else R.uniform(0.2, 0.45)
    wd = R.uniform(0.78, 1.1)
    tw = R.uniform(-0.03, 0.03)
    arch = [
        (x, c[1] + 0.012, c[2] + 0.015),
        (x + lean * 0.3, c[1] + 0.14 * s * up + 0.02, c[2] + 0.04),
        (x + lean * 0.7 + tw, 0.05 + 0.3 * s * up, c[2] + 0.15 * s * wd),
        (x + lean - tw, 0.045 + 0.28 * s * up, c[2] + 0.29 * s * wd),
        (x + lean * 1.25 - 2 * tw, 0.035 + 0.15 * s * up, c[2] + 0.39 * s * wd),
        (x + lean * 1.4 - tw, 0.012 + 0.03 * s * up, c[2] + 0.44 * s * wd),
    ]
    r = R.uniform(0.0062, 0.0088)
    if state < 0.22:
        # Fallen: it lies flat where it dropped, turned some way round, half in the floor.
        yaw = R.uniform(-0.9, 0.9)
        at = np.array([x + R.uniform(-0.05, 0.12), 0.0, c[2] + R.uniform(0.1, 0.3)])
        flat = [np.array([0, 0.016 + 0.01 * np.sin(k * 1.3 + i), 0]) + rot(0, yaw, 0) @ np.array([lean * k / 5, 0, 0.44 * s * wd * (k / 5 - 0.45) - 0.05 * np.sin(np.pi * k / 5)]) + at for k in range(6)]
        flat = [(p[0] + 0.07 * np.sin(np.pi * k / 5), p[1], p[2]) for k, p in enumerate(flat)]
        rib(flat, r)
    elif state < 0.5:
        # Snapped: a stub stands on the spine and the rest lies below it.
        keep = R.uniform(0.25, 0.6)
        rib(arch, r, broken=keep)
        at = np.array([x + lean + R.uniform(-0.04, 0.08), 0.014, c[2] + R.uniform(0.22, 0.42)])
        yaw = R.uniform(0, 6.28)
        l = 0.3 * s * (1 - keep) + 0.05
        piece = [at + rot(0, yaw, 0) @ np.array([l * (k / 3 - 0.5), 0.004 * np.sin(k * 2.0), 0.03 * np.sin(np.pi * k / 3)]) for k in range(4)]
        rib(piece, r * 0.9, broken=0.85)
    else:
        rib(arch, r)
    # The rib of the side it lies on shows where it comes out from under.
    if R.uniform() < 0.6:
        a = R.uniform(-0.25, 0.3)
        under = [(x + 0.01, 0.022, c[2] + 0.08), (x + 0.03 + a * 0.1, 0.026, c[2] + 0.22 * s), (x + 0.08 + a * 0.3, 0.022, c[2] + 0.36 * s), (x + 0.14 + a * 0.5, 0.012, c[2] + 0.45 * s)]
        rib(under, r, broken=R.uniform(0.5, 0.9) if R.uniform() < 0.4 else 0.0)

# The loins.
for i in range(6):
    x = rib_x(RIBS) + i * 0.058
    vertebra(spine(x) + R.normal(0, 0.007, 3), 0.054, 0.021, R.normal(0, 0.15), 0.035, tilt=(R.normal(0, 0.25), 0, R.normal(0, 0.15)))
hip = rib_x(RIBS) + 6 * 0.058

# The hips: two blades and the bar between, come a little apart.
for sgn, y0 in ((1, 0.06), (-1, 0.024)):
    parts = [
        ball((0, 0, 0), (0.085, 0.012, 0.05), (0, 0.3, 0)),
        ball((0.07, -0.004, 0.02), (0.05, 0.014, 0.022), (0, -0.4, 0)),
        ball((-0.06, 0.004, -0.02), (0.04, 0.016, 0.03)),
    ]
    v, f = join(parts)
    v = place(v, (0.5 * sgn + R.normal(0, 0.1), R.normal(0, 0.2), 0.25 * sgn), (hip + 0.07 + 0.03 * sgn, y0, -0.12 + 0.07 * (1 - sgn)))
    v, t = sculpt(v, f, 0.0045, 700, worn=0.006, pits=0.004)
    add(v, t)
# The tail trails off.
for i in range(7):
    lump((hip + 0.2 + i * 0.043 + R.uniform(-0.01, 0.01), 0.016, -0.2 - i * 0.02 + R.uniform(-0.015, 0.015)), (0.017 - i * 0.0014, 0.009, 0.01), (0, R.uniform(-0.6, 0.6), 0), 60)

# The neck lies out along the floor toward the skull, its bones apart.
nx, nz, heading = -0.36, -0.165, 0.38
for i in range(7):
    heading += R.uniform(-0.08, 0.24)
    ln = 0.08 - i * 0.003
    mx = nx - np.cos(heading) * ln * 0.5
    mz = nz + np.sin(heading) * ln * 0.5
    vertebra((mx + R.uniform(-0.008, 0.008), 0.03 + R.uniform(-0.008, 0.008), mz + R.uniform(-0.012, 0.012)), ln, 0.021, heading + R.normal(0, 0.2), 0.016, tilt=(R.normal(0, 0.5), 0, R.normal(0, 0.2)))
    nx -= np.cos(heading) * (ln + 0.014)
    nz += np.sin(heading) * (ln + 0.014)

# ---- The skull, in its own frame: x to the nose, y up, z out of its side. No eye socket and no ear hole.
parts = [
    ball((-0.085, 0.022, 0), (0.078, 0.052, 0.05)),
    ball((-0.155, 0.03, 0), (0.022, 0.04, 0.036)),
    ball((-0.02, 0.012, 0), (0.07, 0.05, 0.046)),
]
v, f, _ = tube([(-0.03, 0.0, 0), (0.07, -0.012, 0), (0.15, -0.028, 0), (0.215, -0.04, 0)], lambda s: 0.047 - 0.03 * s, (1.0, 0.8), 10, 14)
parts.append((v, f))
# The bone of the nose stops short of the bone of the lip: the notch between them is the nose.
v, f, _ = tube([(-0.06, 0.055, 0), (0.05, 0.036, 0), (0.15, 0.008, 0)], lambda s: 0.02 - 0.012 * s, (0.9, 1.3), 8, 10)
parts.append((v, f))
for sgn in (1, -1):
    v, f, _ = tube([(-0.11, -0.012, sgn * 0.044), (-0.03, -0.02, sgn * 0.046), (0.05, -0.024, sgn * 0.036)], lambda s: 0.0135 - 0.004 * s, (1.3, 0.8), 7, 8)
    parts.append((v, f))
    for k in range(5):
        parts.append(ball((0.0 + k * 0.021, -0.05 - 0.004 * (k % 2), sgn * (0.028 - k * 0.0016)), (0.0095, 0.012, 0.007)))
    parts.append(ball((0.2, -0.058, sgn * 0.008), (0.006, 0.012, 0.005)))
v, f = join(parts)
HEAD = heading + 0.45
SKULL_TURN = (np.pi / 2 - 0.25, np.pi + HEAD, 0.12)
SKULL_AT = (nx - np.cos(HEAD) * 0.19, 0.05, nz + np.sin(HEAD) * 0.19)
v = place(v, SKULL_TURN, SKULL_AT)
v, t = sculpt(v, f, 0.004, 3400, worn=0.006, pits=0.0035, grain=0.0012, smooth=3)
add(v, t, tone=0.8)
# The jaw has come away and lies beside it: two bars that meet at the chin, each with its teeth and the blade that rose to the hinge.
parts = []
for sgn in (1, -1):
    v, f, _ = tube([(-0.1, 0.05, sgn * 0.04), (-0.09, 0.0, sgn * 0.038), (0.0, -0.012, sgn * 0.03), (0.1, -0.006, sgn * 0.014), (0.165, 0.004, sgn * 0.004)], lambda s: 0.0125 - 0.005 * s, (0.6, 1.5), 8, 16)
    parts.append((v, f))
    for k in range(5):
        parts.append(ball((-0.03 + k * 0.021, 0.008, sgn * (0.031 - k * 0.003)), (0.009, 0.011, 0.0065)))
    parts.append(ball((0.16, 0.012, sgn * 0.005), (0.005, 0.01, 0.0045)))
v, f = join(parts)
v = place(v, (np.pi / 2 + 0.3, SKULL_TURN[1] + 0.7, 0.0), (SKULL_AT[0] + 0.05, 0.03, SKULL_AT[2] + 0.2))
v, t = sculpt(v, f, 0.0035, 1500, worn=0.004, pits=0.003)
add(v, t, tone=0.7)

# The shoulder blades: one has slid off the cage and stands against a rib, the other lies flat by the neck.
for turn, at in (((0.5, 0.5, -0.5), (-0.2, 0.15, 0.0)), ((0.05, -0.9, 0.04), (-0.42, 0.018, 0.12))):
    parts = [ball((0, 0, 0), (0.1, 0.006, 0.05)), ball((0.07, 0, 0), (0.05, 0.0075, 0.062)), ball((-0.09, 0.002, 0), (0.03, 0.012, 0.02))]
    v, f, _ = tube([(-0.09, 0.008, 0.0), (0.1, 0.006, 0.01)], lambda s: 0.008 - 0.004 * s, (0.6, 1.4), 6, 8)
    parts.append((v, f))
    v, f = join(parts)
    v = place(v, turn, at)
    v, t = sculpt(v, f, 0.0036, 600, worn=0.004, pits=0.0025)
    add(v, t)

# The breastbone: beads of it, scattered where the ribs let go.
for i in range(5):
    lump((-0.2 + i * 0.09 + R.uniform(-0.03, 0.03), 0.016, 0.3 + R.uniform(-0.05, 0.05)), (0.02, 0.009, 0.012), (0, R.uniform(-1, 1), 0), 70)


# ---- The limbs: four, each of three long bones and the small bones of the foot, folded and come apart at the joints.
def limb(joints, r, broken_at=-1):
    for i in range(len(joints) - 1):
        a = np.array(joints[i], float)
        b = np.array(joints[i + 1], float)
        gap = np.array([R.uniform(-0.02, 0.02), 0, R.uniform(-0.02, 0.02)])
        sw = R.normal(0, 0.12)
        m = (a + b) / 2
        da = rot(0, sw, 0) @ (a - m) * 0.93
        db = rot(0, sw, 0) @ (b - m) * 0.93
        long_bone(m + da + gap, m + db + gap, r * (1 - 0.13 * i), broken=(i == broken_at))
    end = np.array(joints[-1], float)
    d = end - np.array(joints[-2], float)
    d /= np.linalg.norm(d)
    side = np.array([-d[2], 0, d[0]])
    # Two toes of three small bones each, scattered.
    for toe in (1, -1):
        for k in range(3):
            at = end + d * (0.02 + k * 0.034) + side * toe * (0.014 + 0.004 * k) + np.array([R.uniform(-0.012, 0.012), 0, R.uniform(-0.012, 0.012)])
            yaw = np.arctan2(-d[2], d[0]) + R.uniform(-0.5, 0.5)
            lump((at[0], 0.012, at[2]), (0.016 - 0.003 * k, 0.0075, 0.008), (0, yaw, 0), 60)


# Hind limbs: one folded under the hips toward the camera, the other pulled out behind and broken at the shin.
limb([(hip + 0.07, 0.05, -0.03), (hip + 0.25, 0.03, 0.13), (hip + 0.1, 0.024, 0.33), (hip + 0.27, 0.02, 0.42)], 0.0155)
limb([(hip + 0.1, 0.03, -0.19), (hip + 0.31, 0.026, -0.28), (hip + 0.55, 0.022, -0.2), (hip + 0.72, 0.018, -0.29)], 0.015, broken_at=1)
# The half of the shin that broke off lies apart.
long_bone((hip + 0.5, 0.016, -0.02), (hip + 0.61, 0.014, 0.05), 0.0125, broken=True)
# Fore limbs: one lies out before the cage, the other is doubled under the neck.
limb([(-0.19, 0.03, 0.27), (-0.08, 0.026, 0.42), (0.13, 0.022, 0.5), (0.3, 0.018, 0.44)], 0.014)
limb([(-0.3, 0.028, 0.2), (-0.45, 0.024, 0.3), (-0.42, 0.02, 0.5), (-0.56, 0.016, 0.58)], 0.0135)

# ---- Put together, and written out.
verts = []
tris = []
attr = []
base = 0
for v, t, tone, e in BONES:
    # How much of the sky a corner sees: less low down, and less in a hollow of its own bone.
    nrm = np.zeros_like(v)
    fn = np.cross(v[t[:, 1]] - v[t[:, 0]], v[t[:, 2]] - v[t[:, 0]])
    for k in range(3):
        np.add.at(nrm, t[:, k], fn)
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-12
    mean = np.zeros_like(v)
    count = np.zeros(len(v))
    for a, b in ((0, 1), (1, 2), (2, 0)):
        np.add.at(mean, t[:, a], v[t[:, b]])
        np.add.at(count, t[:, a], 1)
        np.add.at(mean, t[:, b], v[t[:, a]])
        np.add.at(count, t[:, b], 1)
    mean /= np.maximum(count, 1)[:, None]
    reach = np.linalg.norm(mean - v, axis=1) + 1e-9
    hollow = ((mean - v) * nrm).sum(1) / reach
    sky = np.clip(0.5 + v[:, 1] / 0.07, 0.4, 1.0) * np.clip(1.0 - 1.6 * hollow, 0.35, 1.0) * np.clip(0.75 + 0.35 * nrm[:, 1], 0.45, 1.0)
    verts.append(v)
    tris.append(t + base)
    attr.append(np.stack([np.full(len(v), tone), e, sky], 1))
    base += len(v)
verts = np.vstack(verts)
tris = np.vstack(tris)
attr = np.vstack(attr)
assert len(verts) < 65536, len(verts)
lo = verts.min(0) - 0.001
hi = verts.max(0) + 0.001
q = np.round((verts - lo) / (hi - lo) * 65535).astype('<u2')
b64 = lambda a: base64.b64encode(a.tobytes()).decode('ascii')
with open(OUT, 'w') as fh:
    fh.write('// The bones on the lip as they were sculpted: written by assets-src/eye/skeleton/make_bones.py, not by hand.\n')
    fh.write('// Corners are 16 bits a coordinate in the box given; three corners to a triangle; three bytes a corner: tone, end, sky.\n')
    fh.write('export const SCULPT = {\n')
    fh.write('  corners: %d,\n  triangles: %d,\n' % (len(verts), len(tris)))
    fh.write('  low: [%s] as [number, number, number],\n' % ', '.join('%.5f' % x for x in lo))
    fh.write('  high: [%s] as [number, number, number],\n' % ', '.join('%.5f' % x for x in hi))
    fh.write("  position: '%s',\n" % b64(q))
    fh.write("  index: '%s',\n" % b64(tris.astype('<u2')))
    fh.write("  bone: '%s',\n" % b64(np.round(np.clip(attr, 0, 1) * 255).astype('u1')))
    fh.write('};\n')
print('bones', len(BONES), 'corners', len(verts), 'triangles', len(tris), 'box', lo, hi)
np.savez(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'out', 'work', 'bones.npz'), v=verts, t=tris, a=attr)
