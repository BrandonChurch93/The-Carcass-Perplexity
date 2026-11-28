#!/usr/bin/env python3
"""The relief of the continent at the size of the frame: public/assets/reveal/land/relief-<level>.jpg for the four maps.

The channels are those of make_relief.py (red and green the slope, 0.5 level; blue over 0.3 the height of the land, under 0.25 water
and how shallow). What is new is the ground between the forms the height pictures hold. Those pictures are 8 bit and soft: enlarged,
their steps stood as terraces and their slopes as one smear. Here the height is blurred until no step is left, and the country is then
worn by running water: a little unevenness is laid on it (the same in every level, by place in the master, so the levels agree), every
cell of land is drained to its lowest neighbour, the water that gathers is counted, and where it gathers the ground is cut. Rills join
into gullies and gullies into ravines; where the slope dies the cut dies too, and the valley floor is left as a fan. Nothing is combed:
the lines are where the water went.

Run: python3 assets-src/reveal/land/make_relief_native.py   (Python 3 with numpy, scipy and Pillow; about two minutes a level)
     LEVELS=d python3 ...                                    (one level)
"""
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
MAPS = os.path.join(ROOT, 'public', 'assets', 'reveal', 'maps')
OUT = os.path.join(ROOT, 'public', 'assets', 'reveal', 'land')
BLUR = {'a': 2.0, 'b': 1.5, 'c': 2.2, 'd': 4.0}  # px of a 1672 px picture: takes out the steps of 8 bits
WIDE = 3072  # px worked in and written: about a texel a pixel where the film reads each level at uhd
QUALITY = int(os.environ.get('QUALITY', '86'))
GAIN = 7.0
SHORE = 22 / 255.0
PALE = 78.0
UNEVEN = float(os.environ.get('UNEVEN', '0.0005'))  # height of the unevenness, for one texel of wavelength
CUT = float(os.environ.get('CUT', '0.075'))  # depth of a full ravine (the heights of each level run 0 to 1 over its own picture)
BASINS = os.path.join(OUT, 'basins.png')  # made by basins/make_basins.py: run that first
BASIN_WINDOW = {'x': 737.71, 'y': 1279.65, 'w': 1070.28, 'h': 602.35}  # master px
KM = 0.8566  # km of one master px
RECTS = {m['name'][-1]: m['masterRect'] for m in json.load(open(os.path.join(MAPS, 'maps.json')))['maps']}


def lattice(ix, iy, seed):
    n = (ix.astype(np.int64) * 374761393 + iy.astype(np.int64) * 668265263 + seed * 1442695041) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    n = n ^ (n >> 16)
    return (n & 0xFFFF).astype(np.float32) / 65535.0


def noise(mx, my, wave, seed):
    """Value noise of one wavelength (master px), by place in the master."""
    x = mx / wave
    y = my / wave
    x0 = np.floor(x)
    y0 = np.floor(y)
    fx = (x - x0).astype(np.float32)
    fy = (y - y0).astype(np.float32)
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)
    a = lattice(x0, y0, seed)
    b = lattice(x0 + 1, y0, seed)
    c = lattice(x0, y0 + 1, seed)
    d = lattice(x0 + 1, y0 + 1, seed)
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy - 0.5


def gathered(ground, land):
    """How many cells of land drain through each cell: every cell gives its water to its lowest neighbour."""
    rows, cols = ground.shape
    index = np.arange(rows * cols, dtype=np.int64).reshape(rows, cols)
    padded = np.pad(ground, 1, mode='edge')
    best = np.zeros_like(ground)
    to = index.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0:
                continue
            drop = (ground - padded[1 + dy:1 + dy + rows, 1 + dx:1 + dx + cols]) / float(np.hypot(dy, dx))
            better = drop > best
            best = np.where(better, drop, best)
            to = np.where(better, index + dy * cols + dx, to)
    to[~land] = index[~land]
    cells = index[land]
    order = cells[np.argsort(ground[land], kind='stable')[::-1]].tolist()
    to = to.ravel().tolist()
    water = [1.0] * (rows * cols)
    for i in order:
        j = to[i]
        if j != i:
            water[j] += water[i]
    return np.asarray(water, dtype=np.float32).reshape(rows, cols)


for level in os.environ.get('LEVELS', 'abcd'):
    size = (WIDE, WIDE * 9 // 16)
    h = np.asarray(Image.open(os.path.join(MAPS, f'map-{level}-h.png')).convert('F').resize(size, Image.BICUBIC), dtype=np.float32) / 255.0
    rgb = np.asarray(Image.open(os.path.join(MAPS, f'map-{level}.jpg')).convert('RGB').resize(size, Image.BICUBIC), dtype=np.float32)
    rows, cols = h.shape
    scale = cols / 1672.0
    rect = RECTS[level]
    texel = rect['width'] / cols  # master px
    land = h > SHORE
    land = ndimage.binary_opening(land, iterations=1)
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

    # The unevenness of the ground, by place in the master: each wavelength as high as it is long, down to two texels.
    ys, xs = np.mgrid[0:rows, 0:cols].astype(np.float32)
    mx = rect['cx'] - rect['width'] / 2 + (xs + 0.5) * texel
    my = rect['cy'] - rect['width'] * 9 / 32 + (ys + 0.5) * texel
    # The dark round basins of the skull country, cut into the ground: a floor, a wall some kilometres wide and a low rim.
    basin = np.asarray(Image.open(BASINS).convert('L'), dtype=np.float32) / 255.0
    bu = (mx - BASIN_WINDOW['x']) / BASIN_WINDOW['w'] * basin.shape[1] - 0.5
    bv = (my - BASIN_WINDOW['y']) / BASIN_WINDOW['h'] * basin.shape[0] - 0.5
    code = ndimage.map_coordinates(basin, [bv, bu], order=1, mode='constant', cval=1.0)
    code = 2.0 * (code - 0.5)
    shore_km = np.sign(code) * code * code * 160.0 * BASIN_WINDOW['w'] * KM / basin.shape[1]
    del bu, bv, code
    wall = 4.0 + 3.0 * noise(mx, my, 40.0, 91)
    bowl = -0.085 * np.exp(-np.maximum(shore_km, 0.0) / wall) + 0.022 * np.exp(-((shore_km - 1.6 * wall) / wall) ** 2)
    bowl = np.where(shore_km < 30.0, bowl, 0.0) * land
    soft = soft + bowl.astype(np.float32)
    del xs, ys, shore_km, wall, bowl
    uneven = np.zeros_like(soft)
    wave = 96.0
    seed = 1
    while wave >= 6.0 * texel:
        if wave <= 200.0 * texel:
            uneven += UNEVEN * wave / texel * noise(mx, my, wave, seed)
        wave /= 2.0
        seed += 1
    del mx, my
    water = gathered(ndimage.grey_closing(soft + uneven, size=5), land)
    # A rill begins where a handful of cells have gathered; a ravine is some hundreds.
    run = np.clip(np.log(np.maximum(water, 1.0) / 6.0) / np.log(600.0 / 6.0), 0.0, 1.0)
    del water
    # (Steep ground is cut; where it flattens the cut dies away and the floor is a fan.)
    sx = ndimage.sobel(soft, axis=1) / 8.0 * scale
    sy = ndimage.sobel(soft, axis=0) / 8.0 * scale
    steep = np.hypot(sx, sy)
    flank = np.clip((ndimage.gaussian_filter(steep, 2.0 * scale) - 0.003) / 0.025, 0.0, 1.0)
    flank = flank * flank * (3 - 2 * flank)
    cut = 0.5 * ndimage.gaussian_filter(run, 1.1) + 0.5 * ndimage.gaussian_filter(run * run, 3.5)
    worn = soft + 0.35 * uneven - CUT * cut * (0.2 + 0.8 * flank)
    del run, cut, uneven

    gx = ndimage.sobel(worn, axis=1) / 8.0 * scale
    gy = ndimage.sobel(worn, axis=0) / 8.0 * scale
    r = 0.5 + 0.5 * np.tanh(gx * GAIN)
    g = 0.5 + 0.5 * np.tanh(gy * GAIN)
    top = float(np.percentile(h[land], 99.8))
    up = np.clip((ndimage.gaussian_filter(h, 0.6 * scale) - low) / max(top - low, 1e-3), 0.0, 1.0)
    light = rgb.mean(axis=2)
    wet = ~land
    deep = float(np.percentile(light[wet], 10))
    shallow = np.clip((ndimage.gaussian_filter(light, 0.7 * scale) - deep - 3.0) / (PALE - deep), 0.0, 1.0)
    b = np.where(land, 0.3 + 0.7 * up, 0.25 * shallow)
    out = np.stack([r, g, b], axis=-1)
    picture = Image.fromarray((out * 255.0 + 0.5).astype(np.uint8), 'RGB')
    path = os.path.join(OUT, f'relief-{level}.jpg')
    picture.save(path, quality=QUALITY, subsampling=0, optimize=True)
    print(level, picture.size, 'texel %.3f master px' % texel, 'slope spread %.3f %.3f' % (float(r.std()), float(g.std())), '%.2f MB' % (os.path.getsize(path) / 1e6), flush=True)
    if os.environ.get('PREVIEW'):
        lit = np.clip(0.5 + 2.2 * (-(r - 0.5) * 0.6 - (g - 0.5) * 0.8), 0.0, 1.0)
        Image.fromarray((lit[80:1080, 150:1750] * 255).astype(np.uint8)).save(os.path.join(ROOT, 'out', 'work', f'relief-{level}-lit.jpg'), quality=88)
