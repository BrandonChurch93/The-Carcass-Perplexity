#!/usr/bin/env python3
"""The relief of the continent, from the Builder's four maps (public/assets/reveal/maps/map-<level>.jpg and map-<level>-h.png).

For each level it writes public/assets/reveal/land/relief-<level>.png:
  red, green  the slope of the land's height on x and y (0.5 is level), taken in floating point from the height after a small
              blur, so the 8 bit steps of the height picture never reach the light. The step at the coast is taken out first:
              under the water the height is carried on from the land beside it, so a shore is no cliff.
  blue        over 0.3: the height of the land (0.3 at the shore, 1 at the highest crest). Under 0.25: water, and how shallow
              it is (0 deep, 0.25 the palest shoal), read from how light the water is in the colour map, measured from that
              map's own deep water, so the four levels agree.
Run: python3 assets-src/reveal/land/make_relief.py   (Python 3 with numpy, scipy and Pillow)
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
MAPS = os.path.join(ROOT, 'public', 'assets', 'reveal', 'maps')
OUT = os.path.join(ROOT, 'public', 'assets', 'reveal', 'land')
BLUR = {'a': 2.0, 'b': 0.9, 'c': 0.9, 'd': 0.9}  # px: takes out the steps of 8 bits and the image model's grain
GAIN = 7.0  # the slope of one texel, drawn up before tanh squeezes it into 0 to 1
SHORE = 22 / 255.0  # the height pictures are black on water and jump to about 50 on the lowest land
PALE = 78.0  # the light of the palest shoal, of 255

for level in 'abcd':
    h = np.asarray(Image.open(os.path.join(MAPS, f'map-{level}-h.png')).convert('L'), dtype=np.float32) / 255.0
    rgb = np.asarray(Image.open(os.path.join(MAPS, f'map-{level}.jpg')).convert('RGB'), dtype=np.float32)
    if rgb.shape[:2] != h.shape:
        rgb = np.asarray(Image.fromarray(rgb.astype(np.uint8)).resize((h.shape[1], h.shape[0]), Image.LANCZOS), dtype=np.float32)
    scale = h.shape[1] / 1672.0
    land = h > SHORE
    land = ndimage.binary_opening(land, iterations=1)
    # The land's height carried out under the water: a blur of the land alone, weighted by where land is.
    carried = h * land
    weight = land.astype(np.float32)
    filled = np.where(land, h, 0.0)
    for sigma in (3.0 * scale, 9.0 * scale, 30.0 * scale, 120.0 * scale):
        num = ndimage.gaussian_filter(carried, sigma)
        den = ndimage.gaussian_filter(weight, sigma)
        got = den > 0.02
        filled = np.where((filled == 0.0) & got & ~land, num / np.maximum(den, 1e-6), filled)
    low = float(np.percentile(h[land], 2))
    filled = np.where(filled == 0.0, low, filled)
    soft = ndimage.gaussian_filter(filled, BLUR[level] * scale)
    gx = ndimage.sobel(soft, axis=1) / 8.0 * scale
    gy = ndimage.sobel(soft, axis=0) / 8.0 * scale
    r = 0.5 + 0.5 * np.tanh(gx * GAIN)
    g = 0.5 + 0.5 * np.tanh(gy * GAIN)
    # Blue: land height over 0.3, shallowness of water under 0.25.
    top = float(np.percentile(h[land], 99.8))
    up = np.clip((ndimage.gaussian_filter(h, 0.6 * scale) - low) / max(top - low, 1e-3), 0.0, 1.0)
    light = rgb.mean(axis=2)
    water = ~land
    deep = float(np.percentile(light[water], 10))
    shallow = np.clip((ndimage.gaussian_filter(light, 0.7 * scale) - deep - 3.0) / (PALE - deep), 0.0, 1.0)
    b = np.where(land, 0.3 + 0.7 * up, 0.25 * shallow)
    out = np.stack([r, g, b], axis=-1)
    Image.fromarray((out * 255.0 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(OUT, f'relief-{level}.png'), optimize=True)
    print(level, h.shape, 'land share %.2f' % land.mean(), 'low %.3f top %.3f deep %.1f' % (low, top, deep), 'shallow mean %.2f' % float(shallow[water].mean()))
    if level == 'd':
        # The lake of the Eye: its middle and half axes, px of this map, for the shader (uLakeSize).
        lab, n = ndimage.label(water)
        mid = lab[h.shape[0] // 2, h.shape[1] // 2]
        ys, xs = np.nonzero(lab == mid)
        print('  lake: centre %.1f %.1f, half %.1f %.1f px of %d' % (xs.mean(), ys.mean(), (xs.max() - xs.min()) / 2, (ys.max() - ys.min()) / 2, h.shape[1]))
