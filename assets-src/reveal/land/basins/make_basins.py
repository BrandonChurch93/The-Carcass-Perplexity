#!/usr/bin/env python3
"""The dark round basins of the skull country: public/assets/reveal/land/basins.png.

The second approved picture (reveal-2) shows the massif round the lake holding a field of dark round pools; the maps drew long
ridges there. This traces where that picture has such a pool and writes a map of shore and depth, never the picture's colour:
red is the signed distance to the nearest pool's shore (the code of the shore maps: 0.5 the shore, over it land), green is 1.
The window is the picture's own in the master (pullback.json). The lake's own window (lakebed.png) and the open sea are left out.
make_relief_native.py reads this file too, and sinks each pool into the relief as a bowl with a wall and a low rim.

Run: python3 assets-src/reveal/land/basins/make_basins.py   (Python 3 with numpy, scipy and Pillow; a few seconds)
"""
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))
PICTURE = os.path.join(ROOT, 'references', 'approved', '7-reveal', 'reveal-2-skull-massif.jpg')
OUT = os.path.join(ROOT, 'public', 'assets', 'reveal', 'land', 'basins.png')
WINDOW = {'x': 737.71, 'y': 1279.65, 'w': 1070.28, 'h': 602.35}  # master px, of reveal-2
BED = {'x': 1126.18, 'y': 1498.28, 'w': 293.34, 'h': 165.09}  # master px, of lakebed.png
WIDE = 2048
HIGH = 1152

rgb = np.asarray(Image.open(PICTURE).convert('RGB').resize((WIDE, HIGH), Image.LANCZOS), dtype=np.float32) / 255.0
lum = rgb @ np.array([0.3, 0.55, 0.15], dtype=np.float32)
lum = ndimage.gaussian_filter(lum, 1.5)
around = ndimage.gaussian_filter(lum, 40.0)
# Where the picture has a pool: its middle and its half widths, measured on the picture at 1400 px wide. Each is then traced
# from the picture itself: the dark that holds the middle, under the tone halfway between the pool and the country round it.
# (The great basin north of the lake, at 770, 165, is not here: the land draws that one itself, with its bar and its amber side.)
POOLS = [
    (895, 165, 24, 20), (795, 272, 40, 21), (848, 258, 31, 19), (815, 312, 40, 26),
    (1328, 118, 22, 16), (1352, 180, 47, 31), (1240, 175, 16, 12), (1350, 275, 42, 24), (1258, 258, 16, 11),
    (1255, 318, 15, 10), (1335, 345, 26, 14), (1175, 282, 15, 11), (1215, 62, 21, 11), (1210, 216, 9, 7),
    (1273, 211, 9, 7), (1323, 70, 9, 7), (1390, 336, 9, 7), (545, 245, 27, 8), (1325, 565, 23, 17),
]
ys, xs = np.mgrid[0:HIGH, 0:WIDE]
mx = WINDOW['x'] + (xs + 0.5) / WIDE * WINDOW['w']
my = WINDOW['y'] + (ys + 0.5) / HIGH * WINDOW['h']
# (The lake's own map fades out over the last of its window: this one runs that far into it, so no strip is left dry between them.)
in_bed = (mx > BED['x'] + 0.04 * BED['w']) & (mx < BED['x'] + 0.96 * BED['w']) & (my > BED['y'] + 0.045 * BED['h']) & (my < BED['y'] + 0.955 * BED['h'])
keep = np.zeros((HIGH, WIDE), dtype=bool)
found = []
k = WIDE / 1400.0
for (px, py, prx, pry) in POOLS:
    cx, cy, rx, ry = px * k, py * k, prx * k, pry * k
    far = ((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2
    middle = float(np.median(lum[far < 0.25]))
    ring = float(np.median(lum[(far > 1.5 ** 2) & (far < 2.0 ** 2)]))
    within = far < 1.45 ** 2
    part = within & (lum < 0.5 * (middle + ring))
    labels, count = ndimage.label(part)
    here = labels[int(cy), int(cx)]
    part = labels == here if here > 0 else np.zeros_like(part)
    area = int(part.sum())
    ellipse = float(np.pi * rx * ry)
    # (Where the picture's pool has no clear edge the measured oval stands for it.)
    traced = ring > middle + 0.015 and 0.45 * ellipse < area < 1.9 * ellipse
    if not traced:
        part = far < 1.0
    keep |= part
    found.append((px, py, 'traced' if traced else 'oval', int(part.sum())))
keep = ndimage.binary_closing(keep, iterations=2) & ~in_bed
texel = 1.0
inside = ndimage.distance_transform_edt(keep)
outside = ndimage.distance_transform_edt(~keep)
signed = np.where(keep, -(inside - 0.5), outside - 0.5) * texel
# The code of the shore maps: d = (r - 0.5) * 2, distance = sign(d) * d * d * 160 texels.
d = np.sign(signed) * np.sqrt(np.minimum(np.abs(signed), 160.0) / 160.0)
red = np.clip(0.5 + 0.5 * d, 0.0, 1.0)
Image.fromarray((red * 255.0 + 0.5).astype(np.uint8), 'L').save(OUT, optimize=True)
print(len(found), 'pools', '%.2f MB' % (os.path.getsize(OUT) / 1e6))
for f in found:
    print(f)
if os.environ.get('PREVIEW'):
    show = (rgb * 255).astype(np.uint8)
    edge = keep & ~ndimage.binary_erosion(keep, iterations=2)
    show[edge] = (255, 60, 60)
    Image.fromarray(show).resize((1400, 788)).save(os.path.join(ROOT, 'out', 'work', 'basins', 'found.jpg'), quality=85)
