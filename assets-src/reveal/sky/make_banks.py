#!/usr/bin/env python3
"""Where the land holds cloud: public/assets/reveal/sky/banks.png, 2048 x 1152, on the rectangle COVER_RECT of
src/places/reveal/shared/weather.ts (the same rectangle as cover.png).

  red    banks: where the wind of the low field (from the left of the master, a little down) is lifted by a range, cloud piles on
         the flank that faces it and thins over the crest
  green  fog: the low floors between ranges, shut in by high ground on two sides, where cold air lies
  blue   ice: where the thin ice far above (HIGH_KM) crosses the land, in long swaths that lie across the ranges
         (it held the pooled haze up to the second wave; nothing read it)

Since the second wave the red and the green hold more than the relief gives by itself. Red also holds a broken middle deck that
lies across one lake of the skull massif, the jaw coast and a few of the long ranges of the chest; green also holds stratus pooled
in some of the narrow valleys between those ranges and against the coasts that face the wind. A part of the land alone is then
not seen whole from low down; from orbit the patches are small beside the whole.

It is read from the relief of the widest map of the land (public/assets/reveal/land/relief-a.png, blue: the height). The swells that break the patches are a noise of a fixed seed: the same
picture every run.
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
# (The floor is read fine, at 15 km: fog lies along the floors and runs up the side valleys in fingers, and stops where the ground
# rises. Read coarse and blurred it stood as round soft lumps beside the ranges. And it is kept to floors with land all round:
# along an open coast the same test drew the outline of the continent in fog.)
floor = ndimage.gaussian_filter(high, 3.5)
fog = step(0.02, 0.07, wide - floor) * step(0.05, 0.2, wide) * step(0.72, 0.92, ndimage.gaussian_filter(land, 12)) * (1.0 - step(0.16, 0.3, floor))
# (Nor over the sounds and the shelf, which the relief holds a little above its sea level and the land draws as water.)
fog = fog * step(0.34, 0.4, ndimage.gaussian_filter(height, 1.5))
fog = ndimage.gaussian_filter(fog, 1.6)

# Haze: it pools over the low ground, the plains and the floors of the wide valleys, and the ranges stand up out of it. Read wide
# and soft: haze has no edge.
# (Low is told against the ground round it, as for the fog, but wider and without its limit: every floor that lies under its
# neighbours holds some, the high plateaus none.)
soft = ndimage.gaussian_filter(land * step(-0.01, 0.04, wide - near) * (1.0 - step(0.2, 0.45, near)), 8) * ndimage.gaussian_filter(land, 5)

# The second wave: weather at three heights over the land.


def swell(size, seed_shift=0):
    """A smooth field, 0 to 1, of features about size texels across. Seeded: the same picture every run."""
    raw = np.random.default_rng(7 + seed_shift).standard_normal((H, W)).astype(np.float32)
    g = ndimage.gaussian_filter(raw, size)
    g = (g - g.mean()) / (g.std() + 1e-9)
    return np.clip(0.5 + 0.28 * g, 0, 1)


def patch(cx, cy, rx, ry, turn_deg, warp):
    """A soft patch in px of the master: 1 in its middle, 0 outside, its outline bent by a swell."""
    t = np.deg2rad(turn_deg)
    dx = px - cx + warp[0]
    dy = py - cy + warp[1]
    u = (dx * np.cos(t) + dy * np.sin(t)) / rx
    v = (-dx * np.sin(t) + dy * np.cos(t)) / ry
    return 1.0 - step(0.45, 1.0, np.sqrt(u * u + v * v))


bend = (260.0 * (swell(22, 1) - 0.5), 260.0 * (swell(22, 2) - 0.5))
broken = 0.55 + 0.45 * step(0.3, 0.62, swell(9, 3))
# The middle deck (px of the master: middle, half lengths, turn). Across the second lake of the skull massif, along the jaw coast,
# across three ranges of the upper chest and two of the lower, and, so the far body is not bare beside the near, by the hip and
# over the root of the far arm.
DECK = [
    (1610, 1510, 250, 150, -25),
    (1330, 1860, 340, 115, 14),
    (2520, 1170, 340, 125, 22),
    (2360, 1810, 270, 105, -16),
    (4250, 1930, 300, 110, 10),
    (2850, 640, 260, 90, -8),
]
deck = np.zeros((H, W), np.float32)
for d in DECK:
    deck = np.maximum(deck, patch(*d, bend))
deck = ndimage.gaussian_filter(deck * broken, 2.0)
# (The banks the ranges make stay, a little thinner: the bank on the collar stood as one bright patch from orbit.)
bank = np.maximum(0.7 * bank, deck)

# Stratus: where it is pooled. The picture holds only the pools, wide and soft; the sheet that draws it (sky/index.ts) fills each
# pool up to a level against the height of the land itself (land/relief-a.png), so the stratus lies in the valleys, laps the
# flanks and lets the crests stand out of it, and its edge is the ground's own contour. A pool stands highest in its middle.
near_land = step(0.62, 0.9, ndimage.gaussian_filter(land, 6))
# (Most about the head and the chest, which the rise sees alone and from low down; few toward the far end of the land, which is
# only ever seen with the whole of it.)
nearer = 1.0 - 0.75 * step(2900.0, 3900.0, px)
pools = step(0.64, 0.8, swell(10, 4)) * near_land * nearer
# (And two against coasts that face the wind, half on the water: px of the master.)
for d in [(960, 1470, 190, 150, 70), (1750, 2290, 260, 120, 25), (2150, 520, 230, 110, -30)]:
    pools = np.maximum(pools, 0.7 * patch(*d, (0.4 * bend[0], 0.4 * bend[1])) * (0.4 + 0.6 * step(0.35, 0.6, swell(7, 8))))
fog = np.maximum(0.6 * fog, ndimage.gaussian_filter(pools, 3.0))

# Ice: long swaths that cross the land at an angle unlike the ranges of the chest (those run steeply up and down the master:
# these lie along it, a little turned).
ICE = [
    (1750, 1330, 700, 75, -17),
    (2650, 1450, 800, 70, 27),
    (2100, 2100, 620, 65, -12),
    (3700, 1250, 760, 75, 16),
    (4300, 2250, 600, 65, -14),
]
ice = np.zeros((H, W), np.float32)
for d in ICE:
    ice = np.maximum(ice, patch(*d, (0.5 * bend[0], 0.5 * bend[1])))
ice = ndimage.gaussian_filter(ice * (0.5 + 0.5 * step(0.3, 0.6, swell(12, 6))), 3.0)
out = np.stack([bank, fog, ice], axis=-1)
Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(PUB, 'sky', 'banks.png'), optimize=True)
print('banks.png', out.shape, 'means', out.reshape(-1, 3).mean(0).round(3))
