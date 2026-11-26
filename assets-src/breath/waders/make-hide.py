"""The waders' skin sheet and its relief, from the one generated picture of bare skin.

Run from the repository root: python3 assets-src/breath/waders/make-hide.py
Reads assets-src/breath/waders/hide-take1.png, writes public/assets/breath/waders/hide.jpg and hide-nh.png.
"""
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

SRC = 'assets-src/breath/waders/hide-take1.png'
OUT = 'public/assets/breath/waders/hide.jpg'
OUT_NH = 'public/assets/breath/waders/hide-nh.png'
SIZE = 1024
BAND = 96
MEAN = np.array([0.693, 0.585, 0.53])


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


src = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float64) / 255.0
left = (src.shape[1] - SIZE) // 2
tile = src[:SIZE, left:left + SIZE]

# The large light of the photograph goes, so that a repeat shows no patch.
flat = tile - np.stack([gaussian_filter(tile[..., k], 64, mode='reflect') for k in range(3)], axis=-1)

# Near each edge the picture gives way to itself moved by half its size, which has no seam there.
i = np.arange(SIZE)
edge = np.minimum(i, SIZE - 1 - i)
w = smooth(0.0, BAND, edge)
weight = (w[:, None] * w[None, :])[..., None]
moved = np.roll(flat, (SIZE // 2, SIZE // 2), axis=(0, 1))
wrapped = flat * weight + moved * (1.0 - weight)

sheet = np.clip(wrapped - wrapped.reshape(-1, 3).mean(axis=0) + MEAN, 0.0, 1.0)
Image.fromarray((sheet * 255.0 + 0.5).astype(np.uint8)).save(OUT, quality=92)

# The relief is the fine part of the brightness: pores and creases stand, blotches do not.
lum = sheet @ np.array([0.299, 0.587, 0.114])
fine = lum - gaussian_filter(lum, 16, mode='wrap')
height = np.clip(0.5 + 3.4 * fine, 0.0, 1.0)
nh = np.full((SIZE, SIZE, 3), 128, dtype=np.uint8)
nh[..., 2] = (height * 255.0 + 0.5).astype(np.uint8)
Image.fromarray(nh).save(OUT_NH, optimize=True)
