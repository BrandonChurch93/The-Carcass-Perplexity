#!/usr/bin/env python3
"""Where the land holds cloud: public/assets/reveal/sky/banks.png, 2048 x 1152, on the rectangle COVER_RECT of
src/places/reveal/shared/weather.ts (the same rectangle as cover.png).

  red    banks: where the wind of the low field (from the left of the master, a little down) is lifted by a range, cloud piles on
         the flank that faces it and thins over the crest
  green  fog: the low floors between ranges, shut in by high ground on two sides, where cold air lies
  blue   haze: the low ground, plains and wide valley floors, read wide and soft, where haze pools under the ranges

It is read from the relief of the widest map of the land (public/assets/reveal/land/relief-a.png, blue: the height). Nothing random.
Run: python3 assets-src/reveal/sky/make_banks.py   (Python 3 with numpy, scipy and Pillow)
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
MAP_A = (2983.67, 1727.13, 5295.59)
WIND = np.array([5.4, 1.5]) / np.hypot(5.4, 1.5)

ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
px = X0 + (xs + 0.5) / W * WIDE
py = Y0 + (ys + 0.5) / H * HIGH


def read(pic, u, v):
    h, w = pic.shape
    inside = (u >= 0) & (u <= 1) & (v >= 0) & (v <= 1)
    got = ndimage.map_coordinates(pic, [np.clip(v, 0, 1) * (h - 1), np.clip(u, 0, 1) * (w - 1)], order=1)
    return np.where(inside, got, 0.0)


def step(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


relief = np.asarray(Image.open(os.path.join(PUB, 'land', 'relief-a.png')).convert('RGB'), dtype=np.float32)[..., 2] / 255.0
ax0 = MAP_A[0] - MAP_A[2] / 2
ay0 = MAP_A[1] - MAP_A[2] * 9 / 32
height = read(relief, (px - ax0) / MAP_A[2], (py - ay0) / (MAP_A[2] * 9 / 16))
land = (height > 0.28).astype(np.float32)
high = np.clip((height - 0.28) / 0.72, 0, 1) * land

# Banks: the rise of the ground along the wind, read at the size of a whole range (60 km), not of one ridge: cloud piles against the
# mass of a range on the flank that faces the wind, and no single ridge is drawn round. The edge is wide and soft: the cloud
# photographs, not this map, give a bank its outline.
smooth = ndimage.gaussian_filter(high, 14)
gy, gx = np.gradient(smooth)
lifted = gx * WIND[0] + gy * WIND[1]
# (The cloud forms a little up the wind of the slope that makes it, and is carried a little way over.)
lifted = ndimage.shift(lifted, (-WIND[1] * 6, -WIND[0] * 6), order=1, mode='nearest')
bank = step(0.0012, 0.006, lifted) * step(0.03, 0.16, smooth)
# (A bank needs land up the wind of it. A lone range that stands in the sea across the wind, a shin, an upper arm, the rim of the
# skull, would hold one long bank on its seaward side, a white bar that doubles the limb: there the wind comes off open water and
# the range is too narrow to pile it. So a bank is kept only where the ground 130 km up the wind is land as well.)
fetch = ndimage.shift(ndimage.gaussian_filter(land, 9), (WIND[1] * 31, WIND[0] * 31), order=1, mode='nearest')
bank = bank * step(0.62, 0.95, fetch)
bank = ndimage.gaussian_filter(bank, 6)

# Fog: the wide basins that lie well under the ground round them (not the narrow valleys between two ridges).
wide = ndimage.gaussian_filter(high, 34)
near = ndimage.gaussian_filter(high, 9)
fog = step(0.015, 0.07, wide - near) * step(0.05, 0.2, wide) * ndimage.gaussian_filter(land, 8) * (1.0 - step(0.2, 0.4, near))
fog = ndimage.gaussian_filter(fog, 6)

# Haze: it pools over the low ground, the plains and the floors of the wide valleys, and the ranges stand up out of it. Read wide
# and soft: haze has no edge.
# (Low is told against the ground round it, as for the fog, but wider and without its limit: every floor that lies under its
# neighbours holds some, the high plateaus none.)
soft = ndimage.gaussian_filter(land * step(-0.01, 0.04, wide - near) * (1.0 - step(0.2, 0.45, near)), 8) * ndimage.gaussian_filter(land, 5)
out = np.stack([bank, fog, soft], axis=-1)
Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(PUB, 'sky', 'banks.png'), optimize=True)
print('banks.png', out.shape, 'means', out.reshape(-1, 3).mean(0).round(3))
