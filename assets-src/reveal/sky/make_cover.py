#!/usr/bin/env python3
"""Where the weather of the rise stands: public/assets/reveal/sky/cover.png, 2048 x 1152, on the rectangle COVER_RECT of
src/places/reveal/shared/weather.ts (px of the master: x -900 to 7600, y -820 to 3961.25).

  red    the fronts as they stand at second 0 (the plate mat/front.jpg at the placements FRONTS below, which weather.ts repeats)
  green  how much of the low field of small cloud has grown at a point: full over the open sea, thin over the land, clumped
  blue   the cyclone and the storm on the spine (mat/cyclone.jpg, mat/storm.jpg where sky/index.ts draws them), which do not drift

The ground reads it for the shade of the cloud; the cloud sheet reads green for its fields. Seeded: the same picture every run.
Run: python3 assets-src/reveal/sky/make_cover.py   (Python 3 with numpy, scipy and Pillow)
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
PUB = os.path.join(ROOT, 'public', 'assets', 'reveal')
W, H = 2048, 1152
X0, Y0, WIDE = -900.0, -820.0, 8500.0
HIGH = WIDE * 9 / 16
# The fronts: centre x and y (px of the master), half size (px), turn (degrees). weather.ts holds the same four numbers for each.
FRONTS = [(4950.0, -180.0, 1250.0, 22.0), (500.0, 3750.0, 1150.0, -8.0)]
# The cyclone and the storm: centre, half sizes (px of the master), as sky/index.ts places their sheets.
CYCLONE = (5557.0, 3007.0, 900.0, 900.0)
STORM = (79.14 + 0.535 * 5872.86, 44.52 + 0.4563 * 3305.24, 215.0, 165.0)
MAP_A = (2983.67, 1727.13, 5295.59)

ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
px = X0 + (xs + 0.5) / W * WIDE
py = Y0 + (ys + 0.5) / H * HIGH


def luma(path):
    a = np.asarray(Image.open(path).convert('RGB'), dtype=np.float32) / 255.0
    return a @ np.array([0.3, 0.55, 0.15], dtype=np.float32)


def read(pic, u, v):
    """The picture at u, v (0 to 1), nothing outside it."""
    h, w = pic.shape
    inside = (u >= 0) & (u <= 1) & (v >= 0) & (v <= 1)
    got = ndimage.map_coordinates(pic, [np.clip(v, 0, 1) * (h - 1), np.clip(u, 0, 1) * (w - 1)], order=1)
    return np.where(inside, got, 0.0)


def step(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


front = luma(os.path.join(PUB, 'mat', 'front.jpg'))
red = np.zeros((H, W), np.float32)
for cx, cy, half, turn in FRONTS:
    c, s = np.cos(np.radians(turn)), np.sin(np.radians(turn))
    dx, dy = px - cx, py - cy
    u = (c * dx + s * dy) / (2 * half) + 0.5
    v = (-s * dx + c * dy) / (2 * half) + 0.5
    red = np.maximum(red, step(0.03, 0.55, read(front, u, v)))

blue = np.zeros((H, W), np.float32)
for (cx, cy, hx, hy), name in ((CYCLONE, 'cyclone'), (STORM, 'storm')):
    pic = luma(os.path.join(PUB, 'mat', f'{name}.jpg'))
    blue = np.maximum(blue, step(0.05, 0.6, read(pic, (px - cx) / (2 * hx) + 0.5, (py - cy) / (2 * hy) + 0.5)))

# The land, from the relief of the widest map.
relief = np.asarray(Image.open(os.path.join(PUB, 'land', 'relief-a.png')).convert('RGB'), dtype=np.float32)[..., 2] / 255.0
ax0 = MAP_A[0] - MAP_A[2] / 2
ay0 = MAP_A[1] - MAP_A[2] * 9 / 32
land = read((relief > 0.28).astype(np.float32), (px - ax0) / MAP_A[2], (py - ay0) / (MAP_A[2] * 9 / 16))
per = W / WIDE  # px of this picture for one px of the master
near = ndimage.gaussian_filter(land, 40 * per)
sea = 1.0 - step(0.02, 0.45, near)

rng = np.random.default_rng(7141)
pattern = np.zeros((H, W), np.float32)
for sigma, share in ((90, 0.55), (34, 0.3), (12, 0.15)):
    n = ndimage.gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), sigma, mode='wrap')
    pattern += share * (n - n.mean()) / n.std()
pattern = step(-1.1, 1.3, pattern / pattern.std())
green = (0.2 + 0.8 * sea) * (0.3 + 0.7 * pattern)
# West of the skull a field of small cumulus stands over the shoals and islands, as in the approved second key: land shows through its gaps.
west = np.exp(-(((px - 760.0) / 260.0) ** 2 + ((py - 1640.0) / 430.0) ** 2))
green = np.maximum(green, 0.9 * west * (0.45 + 0.55 * pattern))
green *= 1.0 - 0.6 * ndimage.gaussian_filter(red, 6)
rc = np.hypot((px - CYCLONE[0]) / CYCLONE[2], (py - CYCLONE[1]) / CYCLONE[3])
green *= step(0.55, 1.05, rc)

out = np.stack([ndimage.gaussian_filter(red, 0.8), green, ndimage.gaussian_filter(blue, 1.2)], axis=-1)
Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(PUB, 'sky', 'cover.png'), optimize=True)
print('cover.png', out.shape, 'means', out.reshape(-1, 3).mean(0).round(3))
