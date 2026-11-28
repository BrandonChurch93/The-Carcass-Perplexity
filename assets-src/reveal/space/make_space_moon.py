"""The face of the small moon that stands over the planet's edge: public/assets/reveal/sky/space-moon.png.

Nothing is painted and nothing is copied from a picture: the craters are laid by a seeded law (many small, few large), the older
ones worn, the dark plains are slow noise. Red: how light the ground is. Green and blue: the slope of the ground to the right and
down the picture (0.5 is level), from which the place lights the relief from the scene's own sun.

Run from the root of the repo: python3 assets-src/reveal/space/make_space_moon.py
"""
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

N = 512
SEED = 30
rng = np.random.default_rng(SEED)
yy, xx = np.mgrid[0:N, 0:N]
# The face seen straight on: x right, y down, z toward the eye. The disc fills the picture but for a margin of 4 px.
R = N / 2 - 4
px = (xx - N / 2 + 0.5) / R
py = (yy - N / 2 + 0.5) / R
r2 = px * px + py * py
pz = np.sqrt(np.clip(1 - r2, 0, 1))
on = r2 < 1


def slow(scale, seed):
    """Noise without a grain finer than `scale` pixels, between about -1 and 1."""
    g = np.random.default_rng(seed).standard_normal((N, N))
    out = gaussian_filter(g, scale, mode='wrap')
    return out / (np.abs(out).max() + 1e-9)


height = np.zeros((N, N))
light = np.zeros((N, N))
# The dark plains: where slow noise runs high. (Kept off the middle of the disc and broken up, so that no two of them and a
# third read as a face.)
plains = slow(46, 7) + 0.5 * slow(19, 8) + 0.3 * slow(7, 9) + 0.14 * slow(2.5, 10) + 0.55 * (-0.8 * px + 0.6 * py)
mare = np.clip((plains - 0.5) / 0.1, 0, 1)
mare = mare * mare * (3 - 2 * mare)

# Craters: the count of those wider than r falls as r to the power -2.
count = 2600
small, large = 0.006, 0.2
u = rng.random(count)
radius = small / np.sqrt(1 - u * (1 - (small / large) ** 2))
radius[:3] = [0.2, 0.15, 0.12]
order = np.argsort(-radius)
rayed = 0
for k in order:
    rad = radius[k]
    # a place on the near half of the ball, even by area
    while True:
        v = rng.standard_normal(3)
        v /= np.linalg.norm(v)
        if v[2] > -0.15:
            break
    age = rng.random() ** 0.7  # 0 worn flat, 1 fresh
    cx, cy = v[0], v[1]
    reach = rad * 3.2
    x0 = int(max(0, np.floor((cx - reach) * R + N / 2)))
    x1 = int(min(N, np.ceil((cx + reach) * R + N / 2) + 1))
    y0 = int(max(0, np.floor((cy - reach) * R + N / 2)))
    y1 = int(min(N, np.ceil((cy + reach) * R + N / 2) + 1))
    if x1 <= x0 or y1 <= y0:
        continue
    sx, sy, sz = px[y0:y1, x0:x1], py[y0:y1, x0:x1], pz[y0:y1, x0:x1]
    cosang = np.clip(sx * v[0] + sy * v[1] + sz * v[2], -1, 1)
    t = np.arccos(cosang) / rad
    depth = 0.42 * rad * (0.35 + 0.65 * age) * (1.0 if rad < 0.05 else 0.6)
    rim = 0.3 * depth
    # a bowl (the large ones have a flat floor), a raised rim, and the ground thrown out falling away from it
    floor = 0.55 if rad > 0.05 else 0.0
    bowl = np.where(t < 1, -depth * np.clip((1 - t * t) / (1 - floor * floor), 0, 1), 0)
    wall = rim * np.where(t < 1, np.exp(-((t - 1) / 0.22) ** 2), np.clip(t, 1, None) ** -3.6)
    wall = wall * (1 - np.clip((t - 2.4) / 0.8, 0, 1))
    # (a crater wipes out what lay inside it)
    wipe = np.clip((1.05 - t) / 0.25, 0, 1) * (0.5 + 0.5 * age)
    height[y0:y1, x0:x1] = height[y0:y1, x0:x1] * (1 - 0.85 * wipe) + bowl + wall
    if rad > 0.05:
        height[y0:y1, x0:x1] += 0.12 * depth * np.exp(-(t / 0.13) ** 2)
    # the young ones are light, and the few youngest throw light dust far out in rays
    fresh = max(0.0, age - 0.75) / 0.25
    light[y0:y1, x0:x1] += 0.22 * fresh * np.exp(-(t / 1.5) ** 2)
    if fresh > 0.55 and 0.014 < rad < 0.05 and v[2] > 0.3 and rayed < 3:
        rayed += 1
        big = 16
        X0 = int(max(0, np.floor((cx - rad * big) * R + N / 2)))
        X1 = int(min(N, np.ceil((cx + rad * big) * R + N / 2) + 1))
        Y0 = int(max(0, np.floor((cy - rad * big) * R + N / 2)))
        Y1 = int(min(N, np.ceil((cy + rad * big) * R + N / 2) + 1))
        SX, SY, SZ = px[Y0:Y1, X0:X1], py[Y0:Y1, X0:X1], pz[Y0:Y1, X0:X1]
        T = np.arccos(np.clip(SX * v[0] + SY * v[1] + SZ * v[2], -1, 1)) / rad
        ANG = np.arctan2(SY - cy, SX - cx)
        RAYS = np.zeros_like(T)
        rr = np.random.default_rng(int(k) + 1000)
        for j in range(int(rr.integers(7, 12))):
            a0 = rr.random() * 2 * np.pi
            wide = 0.03 + 0.05 * rr.random()
            far = 4 + 7 * rr.random()
            da = np.angle(np.exp(1j * (ANG - a0)))
            RAYS += np.exp(-(da / wide) ** 2) * np.exp(-T / far) * (T > 0.9)
        light[Y0:Y1, X0:X1] += 0.1 * np.clip(RAYS, 0, 1)

# The plains are smoother and lie lower; the uplands are rough.
rough = 0.0035 * slow(2.2, 11) + 0.006 * slow(6, 12)
height = height * (1 - 0.6 * mare) + rough * (1 - 0.7 * mare) - 0.01 * mare
height = gaussian_filter(height, 0.6)
tone = 0.62 + 0.1 * slow(14, 13) + 0.05 * slow(3, 14)
albedo = np.clip(tone * (1 - 0.36 * mare) + light * (1 - 0.3 * mare), 0, 1)

gy, gx = np.gradient(height * R)
SLOPE = 2.2  # the slope that reads 0 or 1
g = np.clip(0.5 + 0.5 * gx / SLOPE, 0, 1)
b = np.clip(0.5 + 0.5 * gy / SLOPE, 0, 1)
out = np.stack([np.where(on, albedo, 0.5), np.where(on, g, 0.5), np.where(on, b, 0.5)], axis=-1)
Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save('public/assets/reveal/sky/space-moon.png', optimize=True)

# A look at it, lit from the upper left, for the eye only: out/work/gen/moon-look.png
import os
os.makedirs('out/work/gen', exist_ok=True)
nx = px - gx * 1.0 * pz
ny = py - gy * 1.0 * pz
nz = pz
nn = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-9
L = np.array([-0.2, -0.78, 0.5]); L = L / np.linalg.norm(L)
mu0 = np.clip((nx * L[0] + ny * L[1] + nz * L[2]) / nn, 0, 1)
shade = albedo * 2 * mu0 / (mu0 + np.clip(pz, 0.05, 1)) * on
Image.fromarray((np.clip(shade, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)).save('out/work/gen/moon-look.png')
print('public/assets/reveal/sky/space-moon.png', os.path.getsize('public/assets/reveal/sky/space-moon.png'))
