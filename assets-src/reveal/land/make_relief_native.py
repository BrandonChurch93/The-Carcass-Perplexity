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
import math
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
MAPS = os.path.join(ROOT, 'public', 'assets', 'reveal', 'maps')
OUT = os.path.join(ROOT, 'public', 'assets', 'reveal', 'land')
BLUR = {'a': 2.0, 'b': 1.5, 'c': 2.2, 'd': 4.0}  # px of a 1672 px picture: takes out the steps of 8 bits
LIGHT_BLUR = {'a': 2.0, 'b': 4.5, 'c': 5.5, 'd': 6.0}  # the same for the height the shadows are cast from: takes out the painted spurs, whose shadows stood as a comb
LIGHT_WIDE = {'a': 3072, 'b': 2048, 'c': 2048, 'd': 2048}  # px of light-<level>.jpg: the widest level is seen enlarged from 9720 on, alone
TRUNK = {'a': 2.5, 'b': 5.0, 'c': 5.0, 'd': 5.0}  # texels: how wide a valley is cut
RELIEF_KM = 16.0  # as make_bake.py
# Toward the sun over the held day, in the picture (x right, y down), as make_bake.py has it.
TURN = math.atan2(-0.2, 0.78) - math.radians(3.0)
SUN = (math.sin(TURN), -math.cos(TURN))
WIDE = 3072  # px worked in and written: about a texel a pixel where the film reads each level at uhd
QUALITY = int(os.environ.get('QUALITY', '86'))
GAIN = 7.0
SHORE = 22 / 255.0
PALE = 78.0
UNEVEN = float(os.environ.get('UNEVEN', '0.0008'))  # height of the unevenness, for one texel of wavelength
SMOOTH = float(os.environ.get('SMOOTH', '1'))  # trial: the blur made wider, to see what the painted spurs give
REACH = float(os.environ.get('REACH', '2.2'))  # how wide a ravine is cut, as a multiple of the narrowest that a texel holds
LIGHT_DETAIL = float(os.environ.get('LIGHT_DETAIL', '2.5'))  # and how many times deeper it is for the shadows it casts
DETAIL = float(os.environ.get('DETAIL', '3'))  # how many times steeper the cut ground is written than it is
VALLEY = float(os.environ.get('VALLEY', '1.0'))  # depth of a full valley, before its width spreads it
CUT = float(os.environ.get('CUT', '0.3'))  # depth of a full ravine (the heights of each level run 0 to 1 over its own picture)
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


def horizon(up, km_px):
    """The tangent of the highest thing between a place and the sun (make_bake.py's, on the worn ground)."""
    t = np.zeros_like(up)
    d = 1.0
    while d * km_px < 260.0 and d < 320.0:
        soft = ndimage.gaussian_filter(up, 0.25 * d) if d > 2 else up
        there = ndimage.shift(soft, (-SUN[1] * d, -SUN[0] * d), order=1, mode='nearest')
        t = np.maximum(t, (there - up) * RELIEF_KM / (d * km_px))
        d *= 1.35
    return t


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
    soft = ndimage.gaussian_filter(filled, BLUR[level] * SMOOTH * scale)
    calm = ndimage.gaussian_filter(filled, LIGHT_BLUR[level] * scale) - soft

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
    # (And the valleys the rills gather into, some tens of texels apart: what the film sees of the drainage from the height each level is read at.)
    trunk = ndimage.gaussian_filter(np.clip(np.log(np.maximum(water, 1.0) / 300.0) / np.log(10000.0 / 300.0), 0.0, 1.0), TRUNK[level]) * TRUNK[level] / 5.0
    del water
    # (Steep ground is cut; where it flattens the cut dies away and the floor is a fan.)
    sx = ndimage.sobel(soft, axis=1) / 8.0 * scale
    sy = ndimage.sobel(soft, axis=0) / 8.0 * scale
    steep = np.hypot(sx, sy)
    flank = np.clip((ndimage.gaussian_filter(steep, 2.0 * scale) - 0.003) / 0.025, 0.0, 1.0)
    flank = flank * flank * (3 - 2 * flank)
    cut = 0.5 * ndimage.gaussian_filter(run, 1.1 * REACH) + 0.5 * ndimage.gaussian_filter(run * run, 3.5 * REACH)
    worn = soft + 0.35 * uneven - CUT * cut * (0.2 + 0.8 * flank) - VALLEY * trunk * (0.3 + 0.7 * flank)
    del trunk
    del run, cut, uneven

    # (The slopes of what the water cut are written steeper than they are, so the drainage reads in the light at the heights the film
    # sees it from, where a ravine is a pixel or two.)
    told = worn + (DETAIL - 1.0) * (worn - soft)
    gx = ndimage.sobel(told, axis=1) / 8.0 * scale
    gy = ndimage.sobel(told, axis=0) / 8.0 * scale
    del told
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
    # The light of the same ground (light-<level>.jpg, the channels of make_bake.py): red the horizon toward the sun, green how
    # open a place is to the sky, both from the worn height with its painted spurs smoothed away, so a shadow falls where a gully is and not where a spur was painted.
    # Blue, the waters the land shuts in, is make_bake.py's own, from the map.
    high = np.clip((worn + calm + (LIGHT_DETAIL - 1.0) * (worn - soft) - low) / max(top - low, 1e-3), 0.0, 1.0) * land
    lsize = (LIGHT_WIDE[level], LIGHT_WIDE[level] * 9 // 16)
    small = np.asarray(Image.fromarray(high.astype(np.float32)).resize(lsize, Image.BOX), dtype=np.float32)
    lr = np.sqrt(np.clip(horizon(small, rect['width'] * KM / LIGHT_WIDE[level]) / 2.0, 0.0, 1.0))
    openness = np.zeros_like(small)
    for sigma, gain in ((1.0, 2.2), (3.0, 1.6), (9.0, 1.2)):
        openness += gain * (small - ndimage.gaussian_filter(small, sigma))
    lg = np.clip(0.5 + openness, 0.0, 1.0)
    raw = np.asarray(Image.open(os.path.join(MAPS, f'map-{level}-h.png')).convert('L'), dtype=np.float32) / 255.0
    raw_land = ndimage.binary_opening(raw > SHORE, iterations=1)
    marks, count = ndimage.label(~raw_land)
    rim = np.unique(np.concatenate([marks[0], marks[-1], marks[:, 0], marks[:, -1]]))
    shut = (marks > 0) & (~np.isin(marks, rim) if level != 'd' else True)
    shut = ndimage.gaussian_filter(ndimage.binary_dilation(shut, iterations=3).astype(np.float32), 1.5)
    lb = np.asarray(Image.fromarray(shut).resize(lsize, Image.BOX), dtype=np.float32)
    lit_path = os.path.join(OUT, f'light-{level}.jpg')
    Image.fromarray(np.round(np.stack([lr, lg, lb], axis=-1) * 255.0).astype(np.uint8), 'RGB').save(lit_path, quality=82, subsampling=0)
    print(level, 'light', lsize, '%.2f MB' % (os.path.getsize(lit_path) / 1e6), flush=True)
    del raw, raw_land, marks, shut, small, openness
    if os.environ.get('PREVIEW'):
        lit = np.clip(0.5 + 2.2 * (-(r - 0.5) * 0.6 - (g - 0.5) * 0.8), 0.0, 1.0)
        Image.fromarray((lit[80:1080, 150:1750] * 255).astype(np.uint8)).save(os.path.join(ROOT, 'out', 'work', f'relief-{level}-lit.jpg'), quality=88)
