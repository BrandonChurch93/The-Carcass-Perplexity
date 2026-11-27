# Bakes the one sheet of the rock rise the first camera leaves: its relief, its lean and how closed every spot of it is.
# Run: python3 assets-src/marsh/mat/make-rise.py
# Writes public/assets/marsh/mat/rise-nh.jpg (red and green: the surface's own normal along the sheet's x and y, 0.5 is level; blue: the
# height, 0.5 is the smooth rise, the whole of blue is SPAN metres) and public/assets/marsh/mat/rise-m.jpg (red: how open a spot is to the sky;
# green: where red water gathers and dries, the clefts and the feet of ledges; blue: where salt has dried, proud and level).
# The sheet does not repeat. It lies on the fine patch of the rock (ROCK in src/places/marsh/land/field.ts): SU metres along the first
# camera's heading by SV metres across. Every number comes from the seed, so a second run writes the same files.
import numpy as np
from PIL import Image

W, H = 2048, 1536
SU, SV = 21.5, 16.0
SPAN = 1.8
TEXEL = SU / W
rng = np.random.default_rng(5725)


def smooth(lo, hi, x):
    t = np.clip((x - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


FU = np.fft.fftfreq(W, d=TEXEL)[None, :]
FV = np.fft.fftfreq(H, d=SV / H)[:, None]
F2 = (FU * FU + FV * FV).astype(np.float32)


def noise(metres):
    """Smooth noise whose lumps are about `metres` across: mean 0, spread 1."""
    white = rng.standard_normal((H, W)).astype(np.float32)
    out = np.fft.ifft2(np.fft.fft2(white) * np.exp(-F2 * (metres * 1.2) ** 2)).real.astype(np.float32)
    return (out - out.mean()) / out.std()


def blur(a, metres):
    return np.fft.ifft2(np.fft.fft2(a) * np.exp(-F2 * (metres * 1.2) ** 2)).real.astype(np.float32)


def ridged(metres):
    return 1 - np.abs(np.tanh(noise(metres) * 0.9))


u = ((np.arange(W) + 0.5) / W - 0.5) * SU
v = ((np.arange(H) + 0.5) / H - 0.5) * SV
U, V = np.meshgrid(u.astype(np.float32), v.astype(np.float32))

# The masses: the rock is broken along a few wandering joints into bodies two or three strides across, each at its own level and lean,
# their shoulders worn round and the joint between two of them a deep narrow cleft.
SIZE = 2.9
wu = U + 0.75 * noise(2.2) + 0.12 * noise(0.4)
wv = V + 0.75 * noise(2.2) + 0.12 * noise(0.4)
ci = np.floor(wu / SIZE).astype(np.int32)
cj = np.floor(wv / SIZE).astype(np.int32)
table = rng.random((64, 64, 5)).astype(np.float32)
d1 = np.full((H, W), 1e9, np.float32)
d2 = np.full((H, W), 1e9, np.float32)
c1 = np.zeros((H, W, 5), np.float32)
c2 = np.zeros((H, W, 5), np.float32)
for dj in (-1, 0, 1):
    for di in (-1, 0, 1):
        t = table[(cj + dj) % 64, (ci + di) % 64]
        cx = (ci + di + 0.12 + 0.76 * t[..., 0]) * SIZE
        cy = (cj + dj + 0.12 + 0.76 * t[..., 1]) * SIZE
        d = (wu - cx) ** 2 + (wv - cy) ** 2
        cell = np.stack([cx, cy, t[..., 2], t[..., 3], t[..., 4]], axis=-1)
        first = d < d1
        second = (~first) & (d < d2)
        d2 = np.where(first, d1, np.where(second, d, d2))
        c2 = np.where(first[..., None], c1, np.where(second[..., None], cell, c2))
        d1 = np.where(first, d, d1)
        c1 = np.where(first[..., None], cell, c1)
edge = (d2 - d1) / (2 * np.maximum(1e-3, np.hypot(c2[..., 0] - c1[..., 0], c2[..., 1] - c1[..., 1])))


def body(c):
    return 0.55 * (c[..., 2] - 0.5) + 0.22 * (c[..., 3] - 0.5) * (wu - c[..., 0]) + 0.22 * (c[..., 4] - 0.5) * (wv - c[..., 1])


own = body(c1)
other = body(c2)
h = own + (other - own) * 0.5 * smooth(0.3, 0.0, edge)
h -= 0.3 * (1 - smooth(0.0, 1.0, edge)) ** 2 + 0.2 * smooth(0.11, 0.0, edge)

# Weather has eaten it in creases at every size, never in cells.
h += 0.16 * (ridged(1.3) - 0.5) + 0.07 * (ridged(0.42) - 0.5)

# The beds: the stone is laid in level beds a hand and a half thick, and where a face falls it falls in ledges, some standing proud.
BED = 0.21
wob = 0.09 * noise(3.0) + 0.02 * noise(0.5)
t = (h + wob) / BED
part = t - np.floor(t)
proud = rng.random(64).astype(np.float32)[np.floor(t).astype(np.int32) % 64]
ledged = (np.floor(t) + smooth(0.3 - 0.2 * proud, 0.62 + 0.3 * proud, part)) * BED - wob
h = h + 0.62 * (ledged - h)

# Small things: creases a hand wide, pits where the salt has eaten in, and the stone's own grain.
h += 0.034 * (ridged(0.14) - 0.5) + 0.014 * (ridged(0.05) - 0.5)
h -= 0.05 * smooth(1.1, 2.1, noise(0.16)) + 0.02 * smooth(1.0, 1.8, noise(0.06))
h += 0.004 * noise(0.022)
h -= float(np.median(h))

# It dies out toward the sheet's rim, where the plain ground takes over.
rim = np.minimum(np.minimum(U + SU / 2, SU / 2 - U), np.minimum(V + SV / 2, SV / 2 - V))
h *= smooth(0.1, 1.4, rim)
h = np.clip(h, -0.49 * SPAN, 0.49 * SPAN)

gy, gx = np.gradient(h, SV / H, TEXEL)
ln = np.sqrt(gx * gx + gy * gy + 1)
nu = -gx / ln
nv = -gy / ln

# How open to the sky: for sixteen ways round, the highest thing seen within a metre and a half hides its share of the sky.
soft = blur(h, 0.02)
shut = np.zeros((H, W), np.float32)
WAYS = 16
for a in range(WAYS):
    ang = (a + 0.5) / WAYS * 2 * np.pi
    top = np.zeros((H, W), np.float32)
    for r in (3, 5, 8, 12, 18, 27, 40, 62, 95, 145):
        du = int(round(np.cos(ang) * r))
        dv = int(round(np.sin(ang) * r))
        rise = (np.roll(soft, (-dv, -du), axis=(0, 1)) - soft) / (np.hypot(du, dv) * TEXEL)
        top = np.maximum(top, rise)
    shut += top / np.sqrt(1 + top * top)
openness = np.clip(1 - shut / WAYS, 0, 1) ** 1.3

# Red water runs to what is low among its neighbours and dries there; salt dries on what is proud, level and open.
low = blur(h, 0.3) - h
lower = blur(h, 0.09) - h
gather = smooth(0.02, 0.12, low + 0.6 * lower + 0.03 * noise(0.7) + 0.012 * noise(0.1)) * (0.55 + 0.45 * smooth(-0.6, 0.6, noise(1.6)))
gather = np.maximum(gather, smooth(0.5, 0.2, openness) * 0.9)
sy, sx = np.gradient(blur(h, 0.05), SV / H, TEXEL)
level = 1 / np.sqrt(sx * sx + sy * sy + 1)
salt = smooth(-0.01, 0.04, -low + 0.02 * noise(0.5)) * smooth(0.8, 0.95, level) * smooth(0.55, 0.8, openness) * smooth(-0.3, 0.9, noise(0.9) + 0.6 * noise(0.2))


def save(name, r, g, b, size, quality):
    # (The engine reads a picture bottom row first: the rows are written so that up the sheet is across the patch.)
    a = np.stack([r, g, b], axis=-1)[::-1]
    Image.fromarray(np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8), 'RGB').resize(size, Image.LANCZOS).save(f'public/assets/marsh/mat/{name}', quality=quality, subsampling=0)


save('rise-nh.jpg', nu * 0.5 + 0.5, nv * 0.5 + 0.5, h / SPAN + 0.5, (W, H), 86)
save('rise-m.jpg', openness, gather, salt, (W // 2, H // 2), 88)
print('height', float(h.min()), float(h.max()), 'open', float(openness.mean()), 'gather', float(gather.mean()), 'salt', float(salt.mean()))
