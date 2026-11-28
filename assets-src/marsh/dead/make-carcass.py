# One dead wallower as the salt leaves it, sculpted in Blender and baked from straight above into two sheets the marsh reads:
#   carcass-nh.jpg  red, green: the surface's normal (x along the body, y across it); blue: its height, 0.5 m for the whole of blue
#   carcass-m.jpg   red: bone standing bare; green: the hide torn through to the hollow under it; blue: how open the spot is to the sky
# The sheet is 2.56 m along the body (the head at +x, its middle 0.26 m toward the head) by 1.6 m across it. Every number comes from the seed below.
# Run: /home/user/bpyenv/bin/python assets-src/marsh/dead/make-carcass.py   (writes out/work/dead/*.npy)
#      python3 assets-src/marsh/dead/make-carcass.py pack                  (packs them into public/assets/marsh/dead/)
import math
import sys
import numpy as np

W, H = 1024, 640
LX, LY = 2.56, 1.6
# The sheet's middle, metres along the sculpt: the feelers reach further than the tail.
XC = 0.26
SEED = 4107


def pack():
    from PIL import Image
    import os
    h = np.load('out/work/dead/height.npy')
    bone = np.load('out/work/dead/bone.npy')
    torn = np.load('out/work/dead/torn.npy')
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / (2 * LX / W)
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / (2 * LY / H)
    inv = 1.0 / np.sqrt(gx * gx + gy * gy + 1.0)
    nh = np.stack([0.5 - 0.5 * gx * inv, 0.5 - 0.5 * gy * inv, np.clip(h / 0.5, 0, 1)], -1)
    # How open a spot is: its height against the heights round it, at two widths.
    def blur(a, r):
        out = a.copy()
        for axis in (0, 1):
            acc = np.zeros_like(out)
            for d in range(-r, r + 1):
                acc += np.roll(out, d, axis)
            out = acc / (2 * r + 1)
        return out
    open_ = np.clip(0.5 + (h - blur(blur(h, 6), 6)) * 14.0 + (h - blur(blur(h, 20), 20)) * 5.0, 0, 1)
    m = np.stack([np.clip(bone, 0, 1), np.clip(torn, 0, 1), open_], -1)
    os.makedirs('public/assets/marsh/dead', exist_ok=True)
    Image.fromarray((nh * 255 + 0.5).astype(np.uint8)).save('public/assets/marsh/dead/carcass-nh.jpg', quality=92, subsampling=0)
    Image.fromarray((m * 255 + 0.5).astype(np.uint8)).save('public/assets/marsh/dead/carcass-m.jpg', quality=88)
    print('packed', nh.shape, float(h.max()))


def sculpt():
    import bpy
    import bmesh
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree

    rng = np.random.default_rng(SEED)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    bm = bmesh.new()

    def blob(c, r, squash=(1, 1, 1)):
        made = bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=14, radius=1.0)
        for v in made['verts']:
            v.co = Vector((c[0] + v.co.x * r * squash[0], c[1] + v.co.y * r * squash[1], c[2] + v.co.z * r * squash[2]))

    def tube(points, r0, r1, sides=8):
        # A tapered tube along a run of points.
        rings = []
        n = len(points)
        for i, p in enumerate(points):
            a = Vector(points[min(i + 1, n - 1)]) - Vector(points[max(i - 1, 0)])
            a.normalize()
            side = a.cross(Vector((0, 0, 1)))
            if side.length < 1e-4:
                side = Vector((1, 0, 0))
            side.normalize()
            up = side.cross(a)
            r = r0 + (r1 - r0) * i / max(n - 1, 1)
            rings.append([bm.verts.new(Vector(p) + (side * math.cos(t) + up * math.sin(t)) * r) for t in [k * 2 * math.pi / sides for k in range(sides)]])
        for i in range(n - 1):
            for k in range(sides):
                bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
        bm.faces.new(rings[0][::-1])
        bm.faces.new(rings[-1])

    # The spine: hips standing, the middle fallen in, the shoulders standing, the neck and head down on the mud.
    def spine(u):
        x = -1.0 + 1.9 * u
        y = 0.05 * math.sin(u * 4.1) - 0.03
        z = 0.1 + 0.2 * math.exp(-((u - 0.2) / 0.13) ** 2) + 0.26 * math.exp(-((u - 0.68) / 0.15) ** 2) + 0.05 * math.exp(-((u - 0.97) / 0.08) ** 2)
        return (x, y, z)

    pts = [spine(i / 60) for i in range(61)]
    tube(pts, 0.03, 0.034, 8)
    for i in range(4, 58, 2):
        p = pts[i]
        blob((p[0], p[1], p[2] + 0.018), 0.03, (0.75, 1.0, 1.0))
    # Girdles and skull: lumps of bone under the hide. (The skull is a blunt wedge: nothing on it is a socket or a flap.)
    hip = spine(0.2)
    sh = spine(0.68)
    blob((hip[0], hip[1] + 0.02, hip[2] - 0.07), 0.17, (1.0, 1.5, 0.8))
    blob((sh[0], sh[1], sh[2] - 0.09), 0.2, (1.0, 1.55, 0.85))
    head = spine(1.0)
    blob((head[0] + 0.06, head[1] - 0.05, 0.1), 0.15, (1.45, 0.85, 0.75))
    blob((head[0] + 0.25, head[1] - 0.09, 0.07), 0.09, (1.3, 0.9, 0.7))
    # Ribs: no two alike, slipped along the body, some broken off short, two fallen flat beside it.
    for i in range(11):
        u = 0.3 + 0.03 * i + rng.uniform(-0.006, 0.006)
        root = spine(u)
        for side in (-1, 1):
            span = (0.3 + 0.1 * math.sin((u - 0.3) / 0.33 * math.pi)) * rng.uniform(0.85, 1.1)
            broken = rng.uniform() < 0.3
            reach = rng.uniform(0.35, 0.6) if broken else 1.0
            lean = rng.uniform(-0.05, 0.05)
            run = []
            for k in range(15):
                t = k / 14 * reach
                a = t * math.pi * 0.5
                run.append((root[0] + lean * t + 0.04 * t * t, root[1] + side * span * math.sin(a), max(0.012, (root[2] - 0.01) * math.cos(a) ** 0.8 + 0.01)))
            tube(run, 0.017, 0.011 if not broken else 0.014, 6)
    for k in range(2):
        x0 = rng.uniform(-0.2, 0.2)
        y0 = 0.52 + 0.08 * k
        ang = rng.uniform(-0.5, 0.5)
        run = [(x0 + (t - 0.5) * 0.34 * math.cos(ang) - 0.05 * math.sin(t * math.pi) * math.sin(ang), y0 + (t - 0.5) * 0.34 * math.sin(ang) + 0.05 * math.sin(t * math.pi) * math.cos(ang), 0.014) for t in [j / 10 for j in range(11)]]
        tube(run, 0.014, 0.01, 6)
    # Legs: four, stiff, each its own way: one drawn up under the body, one out straight, the hind pair splayed. Thigh, shank, and a
    # foot of three blunt claws.
    def leg(root, knee, foot, toe, thick):
        tube([root, tuple(0.5 * (root[i] + knee[i]) + (0.0, 0.0, 0.02)[i] for i in range(3)), knee], thick, thick * 0.72, 8)
        blob(knee, thick * 0.95)
        tube([knee, foot], thick * 0.7, thick * 0.5, 8)
        blob(foot, thick * 0.62)
        d = Vector(toe) - Vector(foot)
        for s in (-0.5, 0.0, 0.5):
            side = Vector((-d.y, d.x, 0.0)) * s
            tube([foot, tuple(Vector(foot) + d * 0.6 + side * 0.6 + Vector((0, 0, 0.01))), tuple(Vector(foot) + d + side)], thick * 0.3, thick * 0.08, 6)
    leg((sh[0] + 0.05, -0.3, 0.1), (sh[0] + 0.3, -0.52, 0.06), (sh[0] + 0.62, -0.6, 0.035), (sh[0] + 0.8, -0.63, 0.012), 0.07)
    leg((sh[0] - 0.02, 0.3, 0.12), (sh[0] + 0.12, 0.56, 0.12), (sh[0] - 0.12, 0.66, 0.04), (sh[0] - 0.27, 0.7, 0.012), 0.07)
    leg((hip[0] - 0.05, -0.27, 0.1), (hip[0] - 0.22, -0.55, 0.05), (hip[0] - 0.02, -0.7, 0.03), (hip[0] + 0.16, -0.72, 0.012), 0.075)
    leg((hip[0] - 0.08, 0.26, 0.1), (hip[0] - 0.32, 0.47, 0.07), (hip[0] - 0.24, 0.68, 0.03), (hip[0] - 0.1, 0.74, 0.012), 0.075)
    # The feelers of the snout, limp on the mud.
    for k in range(5):
        a = -0.9 + 0.45 * k + rng.uniform(-0.12, 0.12)
        ln = rng.uniform(0.16, 0.26)
        s0 = (head[0] + 0.32, head[1] - 0.09 + 0.03 * (k - 2), 0.05)
        run = [(s0[0] + ln * t * math.cos(a) + 0.04 * math.sin(t * 3.0 + k), s0[1] + ln * t * math.sin(a) + 0.03 * math.sin(t * 4.0 + 2.0 * k), max(0.008, 0.05 * (1 - t) ** 2)) for t in [j / 12 for j in range(13)]]
        tube(run, 0.016, 0.004, 6)

    mesh = bpy.data.meshes.new('bones')
    bm.to_mesh(mesh)
    bm.free()
    bones = bpy.data.objects.new('bones', mesh)
    scene.collection.objects.link(bones)

    # What the hide lies on: the bones and the mud.
    gm = bmesh.new()
    bmesh.ops.create_grid(gm, x_segments=2, y_segments=2, size=3.0)
    gm.from_mesh(mesh)
    under = bpy.data.meshes.new('under')
    gm.to_mesh(under)
    gm.free()
    under_ob = bpy.data.objects.new('under', under)
    scene.collection.objects.link(under_ob)

    # The hide: a sheet let down from above onto the bones, then slackened so that it hangs between them and the bones stand through.
    hm = bmesh.new()
    bmesh.ops.create_grid(hm, x_segments=320, y_segments=200, size=1.0)
    for v in hm.verts:
        v.co = Vector((v.co.x * 1.28 + XC, v.co.y * 0.8, 1.0))
    hide = bpy.data.meshes.new('hide')
    hm.to_mesh(hide)
    hm.free()
    hide_ob = bpy.data.objects.new('hide', hide)
    scene.collection.objects.link(hide_ob)
    wrap = hide_ob.modifiers.new('wrap', 'SHRINKWRAP')
    wrap.target = under_ob
    wrap.wrap_method = 'PROJECT'
    wrap.use_project_x = False
    wrap.use_project_y = False
    wrap.use_project_z = True
    wrap.use_negative_direction = True
    wrap.use_positive_direction = False
    wrap.offset = 0.004
    slack = hide_ob.modifiers.new('slack', 'SMOOTH')
    slack.factor = 0.8
    slack.iterations = 24
    slack.use_x = False
    slack.use_y = False
    slack.use_z = True

    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    bone_tree = BVHTree.FromObject(bones, deps)
    hide_tree = BVHTree.FromObject(hide_ob, deps)
    hb = np.zeros((H, W), np.float32)
    hh = np.zeros((H, W), np.float32)
    down = Vector((0, 0, -1))
    for j in range(H):
        y = (0.5 - (j + 0.5) / H) * LY
        for i in range(W):
            x = ((i + 0.5) / W - 0.5) * LX + XC
            o = Vector((x, y, 2.0))
            hit = bone_tree.ray_cast(o, down)
            if hit[0] is not None:
                hb[j, i] = max(hit[0].z, 0.0)
            hit = hide_tree.ray_cast(o, down)
            if hit[0] is not None:
                hh[j, i] = max(hit[0].z, 0.0)
    np.save('out/work/dead/hb.npy', hb)
    np.save('out/work/dead/hh.npy', hh)
    print('sculpted', float(hb.max()), float(hh.max()))


def lay():
    # Hide over bone, as the lens sees it from above: the hide spans from rib to rib and hangs between them, has slid off the body
    # into a slack skirt on the mud, and is torn through where it hung thinnest. Nothing is left straight: the whole body is bent.
    hb = np.load('out/work/dead/hb.npy').astype(np.float64)
    rng = np.random.default_rng(SEED + 1)

    def noise(cells_x, cells_y):
        g = rng.uniform(0, 1, (cells_y + 2, cells_x + 2))
        ys = np.linspace(0, cells_y, H, endpoint=False)
        xs = np.linspace(0, cells_x, W, endpoint=False)
        y0 = ys.astype(int)
        x0 = xs.astype(int)
        fy = (ys - y0)[:, None]
        fx = (xs - x0)[None, :]
        fy = fy * fy * (3 - 2 * fy)
        fx = fx * fx * (3 - 2 * fx)
        a = g[y0][:, x0]
        b = g[y0][:, x0 + 1]
        c = g[y0 + 1][:, x0]
        d = g[y0 + 1][:, x0 + 1]
        return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

    def run(a, r, f):
        out = a
        for axis in (0, 1):
            acc = out.copy()
            for d in range(1, r + 1):
                acc = f(acc, f(np.roll(out, d, axis), np.roll(out, -d, axis)))
            out = acc
        return out

    def blur(a, r):
        out = a
        for axis in (0, 1):
            acc = out.copy()
            for d in range(1, r + 1):
                acc = acc + np.roll(out, d, axis) + np.roll(out, -d, axis)
            out = acc / (2 * r + 1)
        return out

    def step(a, lo, hi):
        t = np.clip((a - lo) / (hi - lo), 0, 1)
        return t * t * (3 - 2 * t)

    yy, xx = np.mgrid[0:H, 0:W]
    # Bent: every place of the sculpt is moved a few fingers, more in the middle of the sheet than at its rim.
    rim = np.minimum(np.minimum(xx, W - 1 - xx) / (0.07 * W), np.minimum(yy, H - 1 - yy) / (0.07 * H)).clip(0, 1)
    wx = ((noise(5, 3) - 0.5) * 44 + (noise(19, 12) - 0.5) * 14) * rim
    wy = ((noise(5, 3) - 0.5) * 52 + (noise(19, 12) - 0.5) * 14) * rim
    sx = np.clip(np.rint(xx + wx), 0, W - 1).astype(int)
    sy = np.clip(np.rint(yy + wy), 0, H - 1).astype(int)
    hb = blur(hb[sy, sx], 1)

    big = noise(6, 4)
    mid = noise(22, 14)
    small = noise(70, 44)
    tiny = noise(240, 150)
    x = ((xx + 0.5) / W - 0.5) * LX + XC
    y = (0.5 - (yy + 0.5) / H) * LY
    u = (x + 1.0) / 1.9
    # The body has fallen in on itself: least where the hips and shoulders hold it, and one flank lower than the other.
    hb = hb * np.clip(0.8 + 0.3 * big + 0.12 * (mid - 0.5) + 0.2 * y, 0.5, 1.05)
    # (The masses of the hips and shoulders are sunk and dented: nothing of it is a clean round.)
    hb = np.where(hb > 0.12, 0.12 + (hb - 0.12) * 0.86, hb) * (1 - 0.3 * step(noise(15, 9), 0.5, 0.75) * step(hb, 0.1, 0.2))
    half = 0.2 + 0.22 * np.exp(-((u - 0.2) / 0.2) ** 2) + 0.27 * np.exp(-((u - 0.66) / 0.22) ** 2) + 0.05 * np.exp(-((u - 1.0) / 0.1) ** 2) + 0.17 * np.exp(-((u - 0.44) / 0.16) ** 2)
    edge = (half * (0.8 + 0.5 * mid) - np.abs(y + 0.02)) / 0.05
    ends = np.minimum((u + 0.08 + 0.1 * (mid - 0.5)) / 0.05, (1.17 - u + 0.1 * (big - 0.5)) / 0.05)
    on = step(np.minimum(edge, ends), 0, 1)
    # The hide spans what stands under it (a tent from bone to bone) and hangs between: deep between the ribs, in dents on the
    # masses, in folds that run across the body where it fell in.
    tent = blur(run(run(hb, 16, np.maximum), 16, np.minimum), 3)
    hang = np.clip(tent - hb, 0, 1)
    folds = 0.011 * np.sin(x * 52.0 + 10.0 * mid + 4.0 * big) * np.clip(1.4 - 3.0 * np.abs(u - 0.44), 0, 1) + 0.012 * (small - 0.5) + 0.004 * (tiny - 0.5)
    hide = (blur(hb + hang * (0.95 - 0.35 * small), 2) - 0.05 * step(mid, 0.55, 0.8) * step(tent, 0.08, 0.2) + folds).clip(0, 1) * on
    # Off the body it lies slack on the mud in a wrinkled skirt, wider on the low flank, ragged at its edge.
    reach = (half * 1.1 + 0.07 + 0.3 * (big - 0.5) + 0.2 * (mid - 0.5) + 0.06 * (small - 0.5) - 0.1 * y - np.abs(y + 0.02)) / 0.03
    skirt = step(np.minimum(reach, np.minimum((u + 0.02 + 0.3 * (mid - 0.5)) / 0.03, (0.98 - u + 0.3 * (big - 0.5)) / 0.03)), 0, 1) * step(rim - 0.5 * mid, 0.2, 0.6)
    slack = skirt * (0.012 + 0.016 * small + 0.01 * np.abs(np.sin(26.0 * (np.abs(y) + 0.3 * x) + 9.0 * mid)) + 0.004 * tiny)
    hide = np.maximum(hide, slack)
    # The legs keep their hide, shrunk on to them and creased.
    limb = step(hb, 0.004, 0.02) * (1 - on)
    hide = np.maximum(hide, limb * (hb + 0.006 * (small - 0.5) + 0.003 * (tiny - 0.5)))
    # Torn: holes with ragged edges where it hung between the ribs and over the belly; the ribs and the dark hollow show in them.
    rib_zone = np.clip(1.6 - 4.2 * np.abs(u - 0.45), 0, 1)
    # (Most of all down the flanks, where the ribs stand bare over the dark under them.)
    flank = rib_zone * step(np.abs(y + 0.02), 0.13, 0.2) * step(tent, 0.04, 0.09)
    tear = step(0.5 * mid + 0.32 * small + 0.18 * big + 0.2 * rib_zone * step(hang, 0.01, 0.06) + 0.3 * flank + 0.05 * tiny, 0.74, 0.77) * on * step(np.abs(y + 0.02), 0.04, 0.1) * step(tent, 0.015, 0.04)
    tear = np.maximum(tear, step(0.6 * mid + 0.4 * small, 0.6, 0.63) * skirt * (1 - on))
    # (The hollow under a tear is not seen into from above: it is a dark step down from the hide, and the ribs stand in it.)
    h = hide * (1 - tear) + np.maximum(hb, np.maximum(blur(hide, 6) - 0.035, 0.004 * small)) * tear
    # (A torn edge curls up a little.)
    lip = step(tear, 0.02, 0.5) * (1 - step(tear, 0.5, 0.98))
    h = h + 0.012 * lip * on
    # Bone bare: in the tears, and where the hide has worn through on the knuckles of the spine and the snout.
    worn = on * step(mid + 0.4 * small, 1.08, 1.14)
    # (Only what is thin is bone to the lens, a rib or a knuckle: a torn place over one of the masses shows what has dried on it, dark.)
    thin = step(hb - blur(hb, 9), 0.008, 0.025)
    bone = np.maximum(tear * step(hb, 0.01, 0.03), worn * step(hb, 0.02, 0.05)) * thin
    torn = tear * (1 - bone)
    np.save('out/work/dead/height.npy', h.astype(np.float32))
    np.save('out/work/dead/bone.npy', bone.astype(np.float32))
    np.save('out/work/dead/torn.npy', torn.astype(np.float32))
    print('laid', float(h.max()), float(bone.mean()), float(torn.mean()))


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'pack':
        lay()
        pack()
    else:
        sculpt()
