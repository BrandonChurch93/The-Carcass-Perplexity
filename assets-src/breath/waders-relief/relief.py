# The sculpt of a wader's skin as numbers: how far, in metres, the surface is pressed out (+) or in (-) at a point of the animal at rest.
# The same function moves the vertices of the shape (broad=True: only what is large enough for them) and fills the baked picture (all of it).
# f, u: the point, metres fore and up. nf, nu: the lean of the surface fore and up (-1 to 1). leg: how far down a leg (0 on the trunk, 1 at the
# ground). neck: how far along the neck. rib: the phase of the ribs, one a turn. cage: how much rib cage is here. k: the animal's size.
import numpy as np

def h1(n, s):
    v = np.sin(n * 127.1 + s * 74.7) * 43758.5453
    return v - np.floor(v)

def h2(ix, iy, s):
    v = np.sin(ix * 127.1 + iy * 311.7 + s * 74.7) * 43758.5453
    return v - np.floor(v)

def vnoise(x, y, s):
    ix, iy = np.floor(x), np.floor(y)
    fx, fy = x - ix, y - iy
    ux, uy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b, c, d = h2(ix, iy, s), h2(ix + 1, iy, s), h2(ix, iy + 1, s), h2(ix + 1, iy + 1, s)
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy

def fbm(x, y, s, octaves=4):
    t, a = 0.0, 0.5
    for o in range(octaves):
        t = t + a * vnoise(x, y, s + o * 3.1)
        x, y, a = x * 2.03 + 11.7, y * 2.03 + 5.3, a * 0.5
    return t

def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def bell(x, w):
    return np.exp(-(x / w) ** 2)

def bands(across, along, period, seed):
    """Creases across a limb: no two a like distance apart, none all the way round. About -1 to 1."""
    return 2 * (vnoise(across, along / period, seed) - 0.5) + (vnoise(across * 2.3 + 4.0, along / (period * 0.45), seed + 1) - 0.5)

def marks(f, u, k, seed, which):
    """The old hurts of this one animal: scars as (distance to it, metres) and lumps as heights. Returns (groove, lump)."""
    groove = np.zeros_like(f)
    lump = np.zeros_like(f)
    count = 4 + int(h1(1.0, seed) * 4)
    for i in range(count):
        ax = (-0.5 + 1.0 * h1(i * 3.3 + 2, seed)) * 1.0 * k
        ay = (-0.34 + 0.6 * h1(i * 5.1 + 3, seed)) * k
        turn = (h1(i * 7.7 + 4, seed) - 0.5) * 2.4
        # A scar is a long thin scratch that runs out to nothing at both ends: a short furrow with lips would read as a closed eye.
        length = (0.2 + 0.22 * h1(i * 2.9 + 5, seed)) * k
        dx, dy = np.cos(turn), np.sin(turn)
        along = np.clip((f - ax) * dx + (u - ay) * dy, 0, length)
        taper = np.sin(np.pi * along / length) ** 0.7
        # A scar is never straight: it wanders as it goes.
        bend = 0.012 * k * np.sin(along / (0.05 * k) + i)
        px, py = ax + dx * along - dy * bend, ay + dy * along + dx * bend
        d = np.hypot(f - px, u - py)
        groove = np.maximum(groove, bell(d, 0.0024 * k) * taper * (0.5 + 0.35 * h1(i * 1.7 + 6, seed)))
    for i in range(5 + int(h1(2.0, seed) * 5)):
        ax = (-0.55 + 1.15 * h1(i * 4.3 + 12, seed)) * k
        ay = (-0.4 + 0.75 * h1(i * 6.1 + 13, seed)) * k
        r = (0.008 + 0.014 * h1(i * 2.3 + 14, seed)) * k
        lump = lump + bell(np.hypot(f - ax, u - ay), r) * (0.001 + 0.0012 * h1(i * 3.9 + 15, seed)) * k
    return groove, lump

def press(f, u, nf, nu, leg, neck, rib, cage, k, seed, which, broad=False, leg_len=2.4, neck_len=2.5):
    f, u, nf, nu, leg, neck, rib, cage = [np.asarray(a, dtype=np.float64) for a in (f, u, nf, nu, leg, neck, rib, cage)]
    trunk = (1 - smooth(0.0, 0.04, leg)) * (1 - smooth(0.0, 0.05, neck))
    onleg = smooth(0.02, 0.1, leg)
    # 1. The ribs: each its own height, its own place, with the hollow between two deeper than a rib is high. One animal's are not another's:
    # the old one has two that were broken and stand proud, the small one shows few.
    n = np.round(rib)
    own = 0.3 + 0.7 * h1(n * 3.7, seed)
    if which % 4 == 0:
        own = np.where((n % 7 == 3) | (n % 7 == 4), 1.25, own)
    if which % 4 == 2:
        own = own * (0.35 + 0.65 * smooth(0.3, 0.7, h1(n * 1.3 + 9, seed)))
    shift = 0.16 * (vnoise(u / (0.09 * k) + n * 1.7, n * 0.37, seed) - 0.5)
    ridge = (0.5 + 0.5 * np.cos((rib + shift) * 2 * np.pi)) ** 2
    h = cage * own * (0.0042 * ridge - 0.0034 * (1 - ridge)) * k
    # 2. Where a leg leaves the trunk the skin is drawn in folds that run out from the joint.
    for sx in (-1, 1):
        dx, dy = f - sx * 0.35 * k, u + 0.1 * k
        d = np.hypot(dx, dy)
        ang = np.arctan2(dy, dx)
        folds = np.sin(ang * 8 + 3.0 * vnoise(dx / (0.1 * k), dy / (0.1 * k), seed + sx) + sx)
        h = h + 0.0026 * k * folds * bell(d - 0.24 * k, 0.11 * k) * trunk * (1 - cage)
    # 7a. Slack skin in deep folds across the root of the neck.
    slack = bell(neck - 0.07, 0.07) * smooth(0.0, 0.02, neck)
    h = h + 0.003 * k * slack * bands(nu * 1.4, neck * neck_len, 0.04 * k, seed + 5)
    groove, lump = marks(f, u, k, seed, which)
    h = h + lump * trunk
    if broad:
        return h
    # 3. The thigh: bundles of muscle under thin skin, lengthwise, and the cord behind it.
    thigh = onleg * (1 - smooth(0.4, 0.47, leg))
    h = h + 0.0016 * k * thigh * np.sin(nf * 6.0 + 4.0 * vnoise(leg * 9.0, nf * 2.0, seed + 7) + seed)
    # 4. The joints: knotted, the skin over them creased across the leg.
    for at, w in ((0.47, 0.05), (0.94, 0.03)):
        j = bell(leg - at, w)
        # Creases across the joint, none of them all the way round and no two a like distance apart; between them the skin is lumped.
        h = h + 0.0014 * k * j * bands(nf * 1.6, leg * leg_len, 0.021 * k, seed + at) + 0.002 * k * j * (vnoise(nf * 4.0, leg * 40.0, seed + 3 + at) - 0.5)
    # 5. The shank: a cord down the back of it with a furrow before the cord, and plates down the front, row on row.
    shank = smooth(0.5, 0.55, leg) * (1 - smooth(0.9, 0.94, leg))
    h = h + 0.002 * k * shank * (bell(nf + 0.82, 0.2) - 1.15 * bell(nf + 0.38, 0.15))
    row = leg * leg_len / (0.019 * k) + 1.4 * vnoise(nf * 2.0, leg * 14.0, seed + 11)
    plate = 1 - np.abs(2 * (row - np.floor(row)) - 1) ** 3
    h = h + 0.001 * k * shank * smooth(-0.1, 0.3, nf) * (plate - 0.7)
    # 6. The foot: horn in rings.
    foot = smooth(0.95, 0.965, leg)
    h = h + 0.0007 * k * foot * np.sin(leg * leg_len / (0.006 * k) * 2 * np.pi)
    # 7b. The neck: ringed all its length, more underneath, with two cords along the throat.
    onneck = smooth(0.03, 0.12, neck)
    # No two rings are one width, each gives out part of the way round, and in places there are none.
    h = h + 0.0011 * k * onneck * bands(nu * 1.5, neck * neck_len, 0.03 * k, seed + 13) * (0.3 + 0.7 * smooth(0.2, -0.6, nu))
    h = h + 0.0014 * k * onneck * (bell(nu + 0.55, 0.14) - 0.8 * bell(nu + 0.25, 0.1)) * (1 - smooth(0.7, 0.95, neck))
    # 8. The skin everywhere: a net of fine wrinkles, finer on the legs.
    cell = np.where(leg > 0.3, 0.016, 0.028) * k
    net = 1 - np.abs(2 * fbm(f / cell, u / cell, seed + 17, 3) - 1)
    h = h + 0.0009 * k * (net - 0.75)
    # 9. Scars: a furrow with a raised lip.
    h = h - 0.0015 * k * groove * trunk
    return h
