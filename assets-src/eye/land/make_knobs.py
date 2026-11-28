# The knobs of the Eye: two crags of bedded limestone that stand at the lower corners of the wide picture. Each is sculpted as a solid
# (columns of stacked beds parted by joints, toppled blocks at the foot, edges worn, faces pitted, grooved along the beds and cracked) and
# baked as a radius for every direction from its middle on an octahedral map, with the lie of its faces and what each point sees of the sky.
#   knob-r.png   r, g: radius in the crag's own unit frame, 16 bits (r high, g low), over 2.0
#   knob-n.jpg   rgb: the normal in the crag's own frame, in metres
#   knob-m.jpg   r: occlusion, g: 0.5 + edge (above on a ridge, below in a crease), b: the tone of the bed
# Run: python3 assets-src/eye/land/make_knobs.py [size of one map, default 1024]
import sys
import numpy as np
from PIL import Image
from multiprocessing import Pool

N = int(sys.argv[1]) if len(sys.argv) > 1 else 1024
F32 = np.float32
# Half the length, height and depth of each crag, metres: the film stretches the unit ball by the same.
SIZES = [(5.2, 3.4, 3.6), (4.6, 3.0, 4.0)]
SEEDS = [8412, 9003]
RMAX = 2.0


def oct_dirs(n):
    u = (np.arange(n) + 0.5) / n * 2 - 1
    x, y = np.meshgrid(u, u)
    z = 1 - np.abs(x) - np.abs(y)
    t = np.clip(-z, 0, None)
    d = np.stack([x - np.sign(x) * t, z, y - np.sign(y) * t], -1)
    return (d / np.linalg.norm(d, axis=-1, keepdims=True)).astype(F32)


def _hash(ix, iy, iz):
    h = (ix * 374761393 + iy * 668265263 + iz * 2147483647) & 0x7FFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0x7FFFFFFF
    return (((h ^ (h >> 16)) & 0xFFFFF) / float(0xFFFFF)).astype(F32)


def vnoise3(p):
    i = np.floor(p).astype(np.int64)
    f = (p - i).astype(F32)
    u = f * f * (3 - 2 * f)
    out = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (u[..., 0] if dx else 1 - u[..., 0]) * (u[..., 1] if dy else 1 - u[..., 1]) * (u[..., 2] if dz else 1 - u[..., 2])
                out = out + w * _hash(i[..., 0] + dx, i[..., 1] + dy, i[..., 2] + dz)
    return out


def fbm3(p, octaves=4):
    s = 0
    a = 0.5
    for _ in range(octaves):
        s = s + a * vnoise3(p)
        p = p * 2.07 + 13.7
        a *= 0.5
    return s


def turn(yaw, dip, roll):
    cy, sy = np.cos(yaw), np.sin(yaw)
    cd, sd = np.cos(dip), np.sin(dip)
    cr, sr = np.cos(roll), np.sin(roll)
    Y = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    D = np.array([[cd, -sd, 0], [sd, cd, 0], [0, 0, 1]])
    R = np.array([[1, 0, 0], [0, cr, -sr], [0, sr, cr]])
    return D @ R @ Y


class Crag:
    def __init__(self, seed, size):
        r = np.random.default_rng(seed)
        self.seed = seed
        self.S = np.array(size, F32)
        sx, sy, sz = size
        self.off = r.uniform(0, 100, size=3).astype(F32)
        # The beds dip a little, and two families of joints stand across them.
        lie = turn(r.uniform(-0.5, 0.5), r.uniform(0.1, 0.2) * r.choice([-1, 1]), r.uniform(-0.09, 0.09))
        self.lie = lie.astype(F32)
        boxes = []
        gx = r.uniform(2.3, 3.1)
        gz = r.uniform(1.7, 2.3)
        nx = int(np.ceil(sx / gx))
        nz = int(np.ceil(sz / gz))
        lines_x = [(-nx + i) * gx + r.uniform(-0.38, 0.38) * gx for i in range(2 * nx + 1)]
        lines_z = [(-nz + i) * gz + r.uniform(-0.38, 0.38) * gz for i in range(2 * nz + 1)]
        for i in range(len(lines_x) - 1):
            for j in range(len(lines_z) - 1):
                x0, x1 = lines_x[i], lines_x[i + 1]
                z0, z1 = lines_z[j], lines_z[j + 1]
                cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
                e = (cx / sx) ** 2 + (cz / sz) ** 2
                if e > 0.8:
                    continue
                # How high the column stands: highest off the middle, and one in five has fallen away.
                dome = (1 - e) ** 0.55
                # One end stands and the other has worn down to a ramp.
                ramp = 0.42 + 0.58 * min(1.0, max(0.0, 0.5 + 0.75 * cx / sx))
                top = -0.45 * sy + 1.45 * sy * dome * ramp * r.uniform(0.62, 1.0)
                if r.uniform() < 0.2:
                    top = -0.45 * sy + 0.35 * sy * r.uniform(0.3, 1.0)
                y = -1.1 * sy
                level = 0
                while y < top - 0.25:
                    # Thick beds and thin ones; most joints are tight and a few stand open.
                    th = min(r.uniform(0.25, 0.5) if r.uniform() < 0.3 else r.uniform(0.9, 2.1), top - y)
                    gap = r.uniform(0.03, 0.16) if r.uniform() < 0.14 else -0.14
                    half = np.array([(x1 - x0) / 2 - gap + r.uniform(-0.3, 0.12), th / 2 + 0.03, (z1 - z0) / 2 - gap + r.uniform(-0.3, 0.12)])
                    c = np.array([cx + r.uniform(-0.1, 0.1), y + th / 2, cz + r.uniform(-0.1, 0.1)])
                    R = turn(r.normal(0, 0.11), r.normal(0, 0.035), r.normal(0, 0.035))
                    height = (y + th + 0.45 * sy) / (1.45 * sy)
                    boxes.append((c, R, half, min(0.45 * half.min(), 0.07 + 0.4 * max(0, height) ** 1.5 * r.uniform(0.4, 1.2))))
                    y += th
                    level += 1
        # Blocks that have come off lie against its foot, leaning.
        for _ in range(r.integers(10, 15)):
            a = r.uniform(0, 2 * np.pi)
            c = np.array([np.cos(a) * sx * r.uniform(0.62, 0.86), -0.45 * sy + r.uniform(-0.2, 0.5), np.sin(a) * sz * r.uniform(0.62, 0.86)])
            half = np.array([r.uniform(0.6, 1.7), r.uniform(0.22, 0.55), r.uniform(0.5, 1.2)])
            boxes.append((c, turn(r.uniform(0, 3), r.uniform(-1.0, 1.0), r.uniform(-0.7, 0.7)), half, r.uniform(0.05, 0.14)))
        self.c = np.array([b[0] for b in boxes], F32)
        self.R = np.array([b[1] for b in boxes], F32)
        self.half = np.array([b[2] for b in boxes], F32)
        self.round = np.array([b[3] for b in boxes], F32)
        # A corner or two struck off each.
        chips = []
        for _ in boxes:
            n = r.normal(size=3)
            n[1] = abs(n[1]) * 0.6
            n /= np.linalg.norm(n)
            chips.append(np.append(n, r.uniform(0.5, 0.95)))
        self.chips = np.array(chips, F32)
        # It has split: three or four steep breaks go right through it, the stone beyond each has dropped and leaned away, and the break stands open.
        splits = []
        for i in range(r.integers(3, 5)):
            a = r.uniform(0, 2 * np.pi)
            n = np.array([np.cos(a), r.uniform(-0.35, 0.35), np.sin(a)])
            n /= np.linalg.norm(n)
            at = np.array([np.cos(a) * sx, 0, np.sin(a) * sz]) * r.uniform(0.12, 0.5)
            drop = np.array([n[0] * r.uniform(0.15, 0.5), -r.uniform(0.25, 0.9), n[2] * r.uniform(0.15, 0.5)])
            splits.append((n, at, drop, r.uniform(0.08, 0.24), r.uniform(0.1, 0.28)))
        self.splits = splits
        self.jx = r.uniform(0, 10)
        self.jz = r.uniform(0, 10)

    def base(self, p):
        o = self.off
        # The joints are not ruled: the stone is pulled about a little before it is cut.
        w = np.stack([fbm3(p * 0.33 + o, 2), fbm3(p * 0.33 + o + 17.0, 2), fbm3(p * 0.33 + o + 41.0, 2)], -1) - 0.36
        # The breaks wander; what lies beyond one is read from where it stood before it dropped and leaned.
        cut = np.full(p.shape[:-1], -1e9, F32)
        moved = p
        for n, at, drop, gap, lean in self.splits:
            side = ((moved - at.astype(F32)) * n.astype(F32)).sum(-1) + 0.55 * (w[..., 0] + 0.4) + 0.12 * (vnoise3(p * 1.9 + o + 61.0) - 0.5)
            beyond = (side > 0)[..., None]
            tip = lean * np.clip(side, 0, 3.0)[..., None] * np.array([0, 1, 0], F32)
            moved = np.where(beyond, moved - drop.astype(F32) + tip, moved).astype(F32)
            cut = np.maximum(cut, gap * (0.35 + 1.3 * vnoise3(p * 0.7 + o + 83.0)) - np.abs(side))
        q = moved @ self.lie.T + 1.75 * w + 0.22 * (np.stack([vnoise3(p * 1.3 + o + 3.0), vnoise3(p * 1.3 + o + 23.0), vnoise3(p * 1.3 + o + 57.0)], -1) - 0.5)
        best = np.full(p.shape[:-1], 1e9, F32)
        for k in range(len(self.c)):
            l = (q - self.c[k]) @ self.R[k].T
            rd = self.round[k]
            a = np.abs(l) - (self.half[k] - rd)
            outside = np.sqrt((np.maximum(a, 0) ** 2).sum(-1))
            inside = np.minimum(a.max(-1), 0)
            d = outside + inside - rd
            n = self.chips[k]
            hh = self.half[k]
            chip = (l * n[:3]).sum(-1) - n[3] * float(np.abs(n[:3]) @ hh)
            d = np.maximum(d, chip)
            # Stone that touches stone is one stone: the crease between them is soft.
            h = np.clip(0.5 + 0.5 * (best - d) / 0.17, 0, 1)
            best = best * (1 - h) + d * h - 0.17 * h * (1 - h)
        # The heart of it, so that every line out of the middle meets stone.
        core = (np.sqrt((((p - np.array([0, -0.3 * self.S[1], 0], F32)) / (self.S * F32(0.5))) ** 2).sum(-1)) - 1) * float(self.S.min()) * 0.5
        return np.minimum(np.maximum(best, cut), core)

    def detail(self, p, fine=True):
        o = self.off
        q = p @ self.lie.T
        d = 0.5 * (fbm3(p * 0.5 + o + 5.0, 3) - 0.47)
        # Whole pieces have gone: hollows scooped out of the mass.
        d = d - 0.75 * np.clip((fbm3(p * 0.3 + o + 77.0, 2) - 0.5) * 3.5, 0, 1)
        rough = fbm3(p * 2.4 + o + 31.0, 4)
        d = d + 0.09 * (rough - 0.47)
        # Flakes have come off: the rough taken in steps, in places.
        steps = np.floor(rough * 9) / 9
        d = d + 0.07 * (steps - rough) * (vnoise3(p * 1.3 + o) > 0.42)
        if not fine:
            return d
        d = d + 0.03 * (fbm3(p * 8.5 + o + 3.0, 3) - 0.47) + 0.012 * (fbm3(p * 31.0 + o, 2) - 0.47)
        # The beds: grooves along the lie of the stone, some deep, broken along their length.
        y = q[..., 1] + 0.3 * (fbm3(p * 0.6 + o + 3.0, 2) - 0.5)
        t = y / 0.31
        k = np.floor(t)
        f = t - k - 0.5
        deep = _hash(k.astype(np.int64), np.int64(self.seed), np.int64(7))
        keep = np.clip((vnoise3(p * 0.9 + o + k[..., None] * 3.3) - 0.38) * 4, 0, 1)
        d = d - (0.015 + 0.075 * deep ** 2) * np.exp(-((f * 0.31 / (0.012 + 0.02 * deep)) ** 2)) * keep
        # A bed stands a little proud of the next or back from it.
        d = d + 0.05 * (_hash(k.astype(np.int64), np.int64(self.seed), np.int64(19)) - 0.5)
        # Cracks: thin joints that wander, of two families.
        for axis, spacing, ph in ((0, 0.83, self.jx), (2, 0.67, self.jz)):
            x = q[..., axis] + 0.16 * (fbm3(p * 1.1 + o + 50.0 + axis, 3) - 0.47) + ph
            t2 = x / spacing
            k2 = np.floor(t2)
            f2 = (t2 - k2 - 0.5) * spacing
            keep2 = np.clip((vnoise3(p * 0.8 + o + k2[..., None] * 5.1 + 9.0 * axis) - 0.5) * 5, 0, 1)
            d = d - 0.07 * np.exp(-((f2 / 0.016) ** 2)) * keep2
        # Pits where the rain has eaten it.
        pit = vnoise3(p * 5.7 + o + 70.0)
        d = d - 0.035 * np.clip((pit - 0.66) * 6, 0, 1) * np.clip((vnoise3(p * 0.6 + o + 90.0) - 0.4) * 4, 0, 1)
        return d

    def field(self, p, fine=True):
        return self.base(p) - self.detail(p, fine)


def bake_rows(job):
    kind, r0, r1 = job
    crag = Crag(SEEDS[kind], SIZES[kind])
    d = oct_dirs(N)[r0:r1].reshape(-1, 3)
    way = d * crag.S
    length = np.linalg.norm(way, axis=-1)
    t = np.full(len(d), RMAX, F32)
    live = np.ones(len(d), bool)
    # In from outside to the first stone: by the solid's own distance first, then with its skin.
    for _ in range(70):
        idx = np.nonzero(live)[0]
        if len(idx) == 0:
            break
        f = crag.base(way[idx] * t[idx, None]) - 0.3
        t[idx] -= np.maximum(f, 0.01) * 0.9 / length[idx]
        done = (f < 0.01) | (t[idx] < 0.06)
        live[idx[done]] = False
    t = np.minimum(t + 0.02 / length, RMAX)
    hi = t.copy()
    lo = np.full(len(d), -1, F32)
    live = np.ones(len(d), bool)
    for _ in range(60):
        idx = np.nonzero(live)[0]
        if len(idx) == 0:
            break
        f = crag.field(way[idx] * t[idx, None])
        inside = f < 0
        lo[idx[inside]] = t[idx[inside]]
        hi[idx[~inside]] = t[idx[~inside]]
        t[idx] -= np.clip(f, 0.012, 0.2) * 0.5 / length[idx]
        done = inside | (t[idx] < 0.05)
        live[idx[done]] = False
    lo = np.where(lo < 0, 0.05, lo)
    for _ in range(7):
        mid = (lo + hi) / 2
        f = crag.field(way * mid[:, None])
        lo = np.where(f < 0, mid, lo)
        hi = np.where(f < 0, hi, mid)
    t = (lo + hi) / 2
    p = way * t[:, None]
    e = 0.006
    g = np.zeros_like(p)
    for a in range(3):
        o = np.zeros(3, F32)
        o[a] = e
        g[:, a] = crag.field(p + o) - crag.field(p - o)
    n = g / (np.linalg.norm(g, axis=-1, keepdims=True) + 1e-9)
    occ = np.zeros(len(p), F32)
    for h, w, fine in ((0.05, 0.3, True), (0.16, 0.3, True), (0.45, 0.25, False), (1.2, 0.15, False)):
        occ += w * np.clip(1 - crag.field(p + n * h, fine) / h, 0, 1)
    ao = np.clip(1 - 1.15 * occ, 0, 1)
    h = 0.04
    edge = (crag.field(p + n * h) + crag.field(p - n * h)) / (2 * h)
    q = p @ crag.lie.T
    y = q[..., 1] + 0.3 * (fbm3(p * 0.6 + crag.off + 3.0, 2) - 0.5)
    tone = _hash(np.floor(y / 0.31).astype(np.int64), np.int64(crag.seed), np.int64(31))
    return kind, r0, r1, t, n, ao, np.clip(0.5 + 1.4 * edge, 0, 1), tone


def main():
    kinds = len(SIZES)
    jobs = []
    rows = 16
    for k in range(kinds):
        for a in range(0, N, N // rows):
            jobs.append((k, a, a + N // rows))
    R = np.zeros((N, kinds * N), F32)
    A = np.zeros((N, kinds * N, 3), np.uint8)
    Mm = np.zeros((N, kinds * N, 3), np.uint8)
    with Pool(4) as pool:
        for kind, r0, r1, t, n, ao, edge, tone in pool.imap_unordered(bake_rows, jobs):
            sl = (slice(r0, r1), slice(kind * N, (kind + 1) * N))
            R[sl] = t.reshape(r1 - r0, N)
            A[sl] = np.clip((n.reshape(r1 - r0, N, 3) * 0.5 + 0.5) * 255 + 0.5, 0, 255).astype(np.uint8)
            Mm[sl + (0,)] = np.clip(ao.reshape(r1 - r0, N) * 255 + 0.5, 0, 255).astype(np.uint8)
            Mm[sl + (1,)] = np.clip(edge.reshape(r1 - r0, N) * 255 + 0.5, 0, 255).astype(np.uint8)
            Mm[sl + (2,)] = np.clip(tone.reshape(r1 - r0, N) * 255 + 0.5, 0, 255).astype(np.uint8)
    # The mesh is raised from a map of half the size: the mean of each four.
    half = R.reshape(N // 2, 2, kinds * N // 2, 2).mean((1, 3)) if N > 512 else R
    v = np.clip(half / RMAX * 65535 + 0.5, 0, 65535).astype(np.uint32)
    B = np.zeros(half.shape + (3,), np.uint8)
    B[..., 0] = v >> 8
    B[..., 1] = v & 255
    for k in range(kinds):
        print(k, 'radius', float(R[:, k * N : (k + 1) * N].min()), float(R[:, k * N : (k + 1) * N].max()), 'ao', float(Mm[:, k * N : (k + 1) * N, 0].mean() / 255))
    out = 'public/assets/eye/land/'
    Image.fromarray(B).save(out + 'knob-r.png', optimize=True)
    Image.fromarray(A).save(out + 'knob-n.jpg', quality=86, subsampling=0)
    Image.fromarray(Mm).save(out + 'knob-m.jpg', quality=80, subsampling=0)


if __name__ == '__main__':
    main()
