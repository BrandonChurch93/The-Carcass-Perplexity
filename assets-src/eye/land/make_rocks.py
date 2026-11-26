# The blocks of the Eye: eight broken stones, each worked out as a radius for every direction from its middle, with the lie of its faces,
# how much of the sky each point sees and how sharp an edge it stands on. Written as two atlases, four stones across and two down,
# each stone on an octahedral map, so that the film can raise a ball into the stone and light it with no unwrapping.
#   rocks-n.jpg   rgb: the normal in the stone's own frame
#   rocks-r.png   r: radius / 1.6, g: occlusion, b: 0.5 + edge (above 0.5 on a ridge, below in a crease)
# Run: python3 assets-src/eye/land/make_rocks.py
import numpy as np
from PIL import Image

N = 512
KINDS = 8
RNG = np.random.default_rng(6508)


def oct_dirs(n):
    u = (np.arange(n) + 0.5) / n * 2 - 1
    x, y = np.meshgrid(u, u)
    z = 1 - np.abs(x) - np.abs(y)
    t = np.clip(-z, 0, None)
    x2 = x - np.sign(x) * t
    y2 = y - np.sign(y) * t
    d = np.stack([x2, z, y2], -1)
    return d / np.linalg.norm(d, axis=-1, keepdims=True)


_perm = RNG.integers(0, 2**31, size=4096)


def _hash(ix, iy, iz):
    h = (ix * 374761393 + iy * 668265263 + iz * 2147483647) & 0x7FFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0x7FFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFF) / float(0xFFFFF)


def vnoise3(p):
    i = np.floor(p).astype(np.int64)
    f = p - i
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


class Rock:
    def __init__(self, seed):
        r = np.random.default_rng(seed)
        self.seed = seed
        # A block is what a few joints and beds leave: three families of planes, nearly square to one another, and a few chips across its corners.
        tilt = r.normal(size=(3, 3))
        q, _ = np.linalg.qr(tilt)
        planes = []
        for axis in range(3):
            for sign in (-1, 1):
                for _ in range(r.integers(1, 3)):
                    n = sign * q[axis] + 0.16 * r.normal(size=3)
                    n /= np.linalg.norm(n)
                    planes.append((n, r.uniform(0.62, 0.9)))
        for _ in range(r.integers(5, 10)):
            n = r.normal(size=3)
            n /= np.linalg.norm(n)
            planes.append((n, r.uniform(0.78, 1.02)))
        self.n = np.array([p[0] for p in planes])
        self.h = np.array([p[1] for p in planes])
        self.worn = r.uniform(0.006, 0.03)
        # The stone is in layers, and each layer broke a little differently: its sides stand in steps.
        self.thick = r.uniform(0.16, 0.5)
        self.phase = r.uniform(0, 1)
        self.stepped = r.uniform(0.05, 0.16)
        self.side = (np.abs(self.n @ q[1]) < 0.75).astype(np.float64)
        self.bed = q[1]
        self.beds = np.sort(r.uniform(-0.8, 0.8, size=r.integers(3, 7)))
        self.bedDepth = r.uniform(0.008, 0.03, size=len(self.beds))
        self.cracks = [(v / np.linalg.norm(v), r.uniform(-0.3, 0.3), r.uniform(0.012, 0.035)) for v in r.normal(size=(r.integers(1, 4), 3))]
        self.off = r.uniform(0, 100, size=3)

    def radius(self, d):
        dn = d @ self.n.T
        t = self.h / np.maximum(dn, 1e-3)
        o = self.off
        p0 = d * t.min(-1, keepdims=True)
        layer = np.floor((p0 @ self.bed + 0.05 * (fbm3(p0 * 2.3 + o + 80, 2) - 0.5)) / self.thick + self.phase).astype(np.int64)
        jit = _hash(layer[..., None], np.arange(len(self.h)), self.seed) - 0.5
        t = t * (1 + self.stepped * jit * self.side)
        # A soft least: the edges are a little worn, more on some stones than others.
        k = self.worn
        m = t.min(-1, keepdims=True)
        rr = m[..., 0] - k * np.log(np.exp(-(t - m) / k).sum(-1))
        p = d * rr[..., None]
        # Faces that are not flat: broad swells, then the grain of broken limestone.
        rr = rr * (1 + 0.04 * (fbm3(d * 1.7 + o, 3) - 0.47) + 0.025 * (fbm3(d * 5.3 + o + 7, 3) - 0.47))
        rough = fbm3(p * 9.0 + o + 31, 4)
        rr = rr + 0.016 * (rough - 0.47) + 0.008 * (fbm3(p * 34.0 + o, 3) - 0.47)
        # Small ledges where flakes have come off: the rough taken in steps.
        steps = np.floor(rough * 7) / 7
        rr = rr + 0.012 * (steps - rough) * (vnoise3(p * 3.1 + o) > 0.45)
        # Beds: grooves along the lie of the stone, broken along their length.
        y = p @ self.bed + 0.05 * (fbm3(p * 4.0 + o + 3, 2) - 0.5)
        for b, depth in zip(self.beds, self.bedDepth):
            keep = np.clip((vnoise3(p * 2.3 + o + b * 17) - 0.3) * 4, 0, 1)
            rr = rr - depth * np.exp(-(((y - b) / 0.009) ** 2)) * keep
        # Cracks: thin dark joints that wander.
        for c, at, depth in self.cracks:
            x = p @ c - at + 0.07 * (fbm3(p * 3.3 + o + 50, 3) - 0.47)
            keep = np.clip((vnoise3(p * 1.9 + o + at * 40) - 0.35) * 5, 0, 1)
            rr = rr - depth * np.exp(-((x / 0.006) ** 2)) * keep
        return rr


def frame(d):
    up = np.where(np.abs(d[..., 1:2]) < 0.9, np.array([0.0, 1.0, 0.0]), np.array([1.0, 0.0, 0.0]))
    t1 = np.cross(up, d)
    t1 /= np.linalg.norm(t1, axis=-1, keepdims=True)
    t2 = np.cross(d, t1)
    return t1, t2


def bake(rock):
    d = oct_dirs(N)
    r0 = rock.radius(d)
    t1, t2 = frame(d)
    e = 0.004
    def at(a, b):
        q = d + a * t1 + b * t2
        q /= np.linalg.norm(q, axis=-1, keepdims=True)
        return q, rock.radius(q)
    _, ra = at(e, 0)
    _, rb = at(0, e)
    n = d * r0[..., None] - t1 * ((ra - r0) / e)[..., None] - t2 * ((rb - r0) / e)[..., None]
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    p = d * r0[..., None]
    # What of the sky each point sees: the highest thing in eight directions round it, at three reaches.
    occ = np.zeros_like(r0)
    edge = np.zeros_like(r0)
    DIRS = 8
    for i in range(DIRS):
        a = 2 * np.pi * (i + 0.5) / DIRS
        ca, sa = np.cos(a), np.sin(a)
        top = np.zeros_like(r0)
        for j, reach in enumerate((0.03, 0.09, 0.22, 0.45)):
            q, rq = at(ca * reach, sa * reach)
            v = q * rq[..., None] - p
            dist = np.linalg.norm(v, axis=-1) + 1e-6
            rise = (v * n).sum(-1) / dist
            top = np.maximum(top, rise)
            if j < 2:
                edge += -rise / (2 * DIRS)
        occ += np.clip(top, 0, 1) / DIRS
    ao = np.clip(1 - 1.25 * occ, 0, 1)
    return n, r0, ao, np.clip(0.5 + 1.6 * edge, 0, 1)


def bake_one(k):
    return bake(Rock(1000 + 37 * k))


def main():
    cols, rows = 4, 2
    A = np.zeros((rows * N, cols * N, 3), np.uint8)
    B = np.zeros((rows * N, cols * N, 3), np.uint8)
    from multiprocessing import Pool
    with Pool(4) as pool:
        baked = pool.map(bake_one, range(KINDS))
    for k in range(KINDS):
        n, r, ao, edge = baked[k]
        cx, cy = k % cols, k // cols
        A[cy * N : (cy + 1) * N, cx * N : (cx + 1) * N] = np.clip((n * 0.5 + 0.5) * 255 + 0.5, 0, 255).astype(np.uint8)
        B[cy * N : (cy + 1) * N, cx * N : (cx + 1) * N, 0] = np.clip(r / 1.6 * 255 + 0.5, 0, 255).astype(np.uint8)
        B[cy * N : (cy + 1) * N, cx * N : (cx + 1) * N, 1] = np.clip(ao * 255 + 0.5, 0, 255).astype(np.uint8)
        B[cy * N : (cy + 1) * N, cx * N : (cx + 1) * N, 2] = np.clip(edge * 255 + 0.5, 0, 255).astype(np.uint8)
        print(k, 'radius', float(r.min()), float(r.max()), 'ao', float(ao.mean()), 'edge', float(edge.mean()))
    Image.fromarray(A).save('public/assets/eye/land/rocks-n.jpg', quality=94, subsampling=0)
    Image.fromarray(B).save('public/assets/eye/land/rocks-r.png', optimize=True)


if __name__ == '__main__':
    main()
