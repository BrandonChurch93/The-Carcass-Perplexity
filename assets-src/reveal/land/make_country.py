#!/usr/bin/env python3
"""Country drawn again once, for every height of the rise, and laid into the maps.

Three regions of the Builder's maps read as anatomy or as paint long before the top of the rise, and the image model drew each again as
country (the pictures and their heights are under assets-src/reveal/land/, recipes in RECIPE.md):
  chest   each rib was one even, unbroken pale range, all of one spacing: from 600 km up, a comb. Drawn again as basin and range
          country: great ranges of unlike length, spacing and bend, two broken, lower oblique ranges and foothills between.
  hip     south of the spine by the pelvis a field of sand lay as one smooth cream dome, and the thigh beside it as one soft pale
          slope: from orbit, airbrushed. Drawn again as an eroded massif and a rugged range, with crests, spurs and gullies.
  lakes   the massif above the lake of the Eye held one dark basin beside that lake: two sockets. Drawn again as a lake
          district, four lakes of unlike sizes with pale frilled rims.
This script lays each picture into every map that holds its region, as those maps stood at the commit named in BASE, and writes
them again under the same names:
  the picture is matched in tone to the map along its own outer ring, where the model was told to change nothing,
  it is joined inside that ring by a blend in six bands (broad forms cross over wide, fine detail over a few px, so no ghost
    of the old country stands in the join),
  and nothing is laid within reach of a coast. Only the lake district may make new water.
After it: make_relief.py, then make_bake.py.
Run: python3 assets-src/reveal/land/make_country.py   (Python 3 with numpy, scipy, OpenCV and Pillow; about a minute)
"""
import io
import json
import os
import subprocess
import cv2
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
MAPS = os.path.join(ROOT, 'public', 'assets', 'reveal', 'maps')
BASE = '6e539cfdcfb46d27b35bb37ae891bb9261aefd48'
SHORE = 22 / 255.0
# Each region: the picture, its rectangle in px of the master (left, top, right, bottom), the maps that hold it, whether it may
# make water, and the window of the picture that is laid (fractions of it: left, top, right, bottom).
PATCHES = [
    {'take': os.environ.get('CHEST_TAKE', os.path.join(HERE, 'chest', 'chest')), 'rect': (1950.0, 1022.0, 3486.0, 2046.0), 'levels': 'ab', 'water': False, 'window': (0.0, 0.0, 1.0, 1.0)},
    {'take': os.environ.get('HIP_TAKE', os.path.join(HERE, 'hip', 'hip')), 'rect': (2999.18, 1699.33, 3999.87, 2449.2), 'levels': 'a', 'water': False, 'window': (0.0, 0.17, 1.0, 1.0)},
    {'take': os.environ.get('LAKES_TAKE', os.path.join(HERE, 'lakes', 'lakes')), 'rect': (1066.49, 1354.03, 1490.24, 1636.53), 'levels': 'abc', 'water': True, 'window': (0.17, 0.0, 0.7, 0.42)},
]
BANDS = 6
LEVELS = {m['name'][-1]: m['masterRect'] for m in json.load(open(os.path.join(MAPS, 'maps.json')))['maps']}


def original(name):
    data = subprocess.run(['git', 'show', f'{BASE}:public/assets/reveal/maps/{name}'], cwd=ROOT, check=True, capture_output=True).stdout
    return Image.open(io.BytesIO(data))


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def blend(old, new, mask):
    """Old and new joined band by band: each band of the pictures is mixed by the mask blurred to that band's size."""
    go, gn, gm = [old], [new], [mask]
    for _ in range(BANDS - 1):
        go.append(cv2.pyrDown(go[-1]))
        gn.append(cv2.pyrDown(gn[-1]))
        gm.append(cv2.pyrDown(gm[-1]))
    out = None
    for i in range(BANDS - 1, -1, -1):
        m = gm[i] if old.ndim == 2 else gm[i][..., None]
        if i == BANDS - 1:
            out = go[i] * (1.0 - m) + gn[i] * m
        else:
            size = (go[i].shape[1], go[i].shape[0])
            lo = go[i] - cv2.pyrUp(go[i + 1], dstsize=size)
            ln = gn[i] - cv2.pyrUp(gn[i + 1], dstsize=size)
            out = cv2.pyrUp(out, dstsize=size) + lo * (1.0 - m) + ln * m
    return out


def lay(patch, level, rgb, h, shore):
    take = Image.open(patch['take'] + '.jpg').convert('RGB')
    take_h = Image.open(patch['take'] + '-h.png').convert('L')
    RECT = patch['rect']
    rect = LEVELS[level]
    H, W = h.shape
    px = W / rect['width']
    x0 = rect['cx'] - rect['width'] / 2
    y0 = rect['cy'] - rect['width'] * 9 / 32
    # The region in texels of this map, and the part of it the map holds.
    left, top = int(round((RECT[0] - x0) * px)), int(round((RECT[1] - y0) * px))
    w, hgt = int(round((RECT[2] - RECT[0]) * px)), int(round((RECT[3] - RECT[1]) * px))
    new = np.asarray(take.resize((w, hgt), Image.LANCZOS), dtype=np.float32) / 255.0
    new_h = np.asarray(take_h.resize((w, hgt), Image.LANCZOS), dtype=np.float32) / 255.0
    yy, xx = np.mgrid[0:hgt, 0:w].astype(np.float32)
    edge = np.minimum(np.minimum(xx, w - 1 - xx) / w, np.minimum(yy, hgt - 1 - yy) / hgt)
    wl, wt, wr, wb = patch['window']
    inside = smoothstep(0.0, 0.07, np.minimum(np.minimum(xx / w - wl, wr - xx / w), np.minimum(yy / hgt - wt, wb - yy / hgt) * (w / hgt)) + 0.035)
    r, b = min(left + w, W), min(top + hgt, H)
    cut = (slice(0, b - top), slice(0, r - left))
    there = (slice(top, b), slice(left, r))
    old, old_h = rgb[there], h[there]
    new, new_h, edge, inside = new[cut], new_h[cut], edge[cut], inside[cut]
    wet = new_h < SHORE
    # Tone: the picture's outer ring is the same country as the map's, so the two are matched there, channel by channel.
    ring = (edge < 0.06) & (old_h > SHORE) & ~wet
    for k in range(3):
        gain = old[..., k][ring].std() / max(new[..., k][ring].std(), 1e-4)
        new[..., k] = (new[..., k] - new[..., k][ring].mean()) * gain + old[..., k][ring].mean()
    gain = old_h[ring].std() / max(new_h[ring].std(), 1e-4)
    new_h = (new_h - new_h[ring].mean()) * gain + old_h[ring].mean()
    inland = smoothstep(0.0, 1.0, (ndimage.distance_transform_edt(shore)[there] / px - 10.0) / 30.0).astype(np.float32)
    mask = (smoothstep(0.035, 0.115, edge) * inland * inside).astype(np.float32)
    out = blend(old, new, mask)
    out_h = blend(old_h, new_h, mask)
    # (The land of the map stays land, but for the lakes of the lake district, which are cut where their picture holds them.)
    out_h = np.where(mask > 0.0, np.maximum(out_h, np.where(old_h > SHORE, SHORE + 0.035, 0.0)), old_h)
    if patch['water']:
        out_h = np.where(wet & (mask > 0.6), 0.0, out_h)
    rgb[there] = np.where(mask[..., None] > 0.0, out, old)
    h[there] = out_h
    print(level, os.path.basename(patch['take']), 'laid at', (left, top), 'size', (r - left, b - top), 'of', (w, hgt), 'share of the map %.3f' % (float(mask.sum()) / (W * H)))


def main():
    for level in os.environ.get('LEVELS', 'abc'):
        rgb = np.asarray(original(f'map-{level}.jpg').convert('RGB'), dtype=np.float32) / 255.0
        h = np.asarray(original(f'map-{level}-h.png').convert('L'), dtype=np.float32) / 255.0
        shore = ndimage.binary_opening(h > SHORE, iterations=1)
        for patch in PATCHES:
            if level in patch['levels'] and os.path.exists(patch['take'] + '.jpg'):
                lay(patch, level, rgb, h, shore)
        Image.fromarray(np.round(np.clip(rgb, 0.0, 1.0) * 255.0).astype(np.uint8), 'RGB').save(os.path.join(MAPS, f'map-{level}.jpg'), quality=90, subsampling=0)
        Image.fromarray(np.round(np.clip(h, 0.0, 1.0) * 255.0).astype(np.uint8), 'L').save(os.path.join(MAPS, f'map-{level}-h.png'), optimize=True)


if __name__ == '__main__':
    main()
