#!/usr/bin/env python3
"""Baked fields of the continent, from the four maps (public/assets/reveal/maps/map-<level>-h.png).

For each level it writes public/assets/reveal/land/shore-<level>.png and light-<level>.jpg.
shore, one channel:
         the distance to the shore, signed: 0.5 on the shore, over it on land, under it on water. Encoded as
         0.5 + 0.5 * sign(d) * sqrt(|d| / REACH), d in texels of this file, so the shore keeps a fine line when the map is enlarged.
         Rivers are water: they are traced by drainage on the widest map (priority flood, eight neighbours, accumulation)
         and drawn into the widest two levels before the distance is taken.
light:
  red    the horizon toward the day's sun: the tangent of the highest thing that stands between a place and the sun, for a land
         RELIEF_KM high at its highest crest, encoded as sqrt(tan / 2).
  green  how open a place is to the sky: 0.5 on level ground, under it in a valley, over it on a crest.
  blue   1 on the waters the land shuts in (lakes), 0 on the sea and on the land away from them.
Run: python3 assets-src/reveal/land/make_bake.py   (Python 3 with numpy, scipy and Pillow)
"""
import heapq
import json
import math
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
MAPS = os.path.join(ROOT, 'public', 'assets', 'reveal', 'maps')
OUT = os.path.join(ROOT, 'public', 'assets', 'reveal', 'land')
SHORE = 22 / 255.0
REACH = 160.0
RELIEF_KM = 16.0
KM_PER_MASTER_PX = 4536.0 / 5295.59
# Toward the sun over the held day, in the picture (x right, y down): the rig's sun, swung 3 degrees as the day ages.
TURN = math.atan2(-0.2, 0.78) - math.radians(3.0)
SUN = (math.sin(TURN), -math.cos(TURN))
OUT_W = {'a': 4096, 'b': 2048, 'c': 2048, 'd': 2048}
LEVELS = {m['name'][-1]: m['masterRect'] for m in json.load(open(os.path.join(MAPS, 'maps.json')))['maps']}


def load(level):
    h = np.asarray(Image.open(os.path.join(MAPS, f'map-{level}-h.png')).convert('L'), dtype=np.float32) / 255.0
    land = ndimage.binary_opening(h > SHORE, iterations=1)
    low = float(np.percentile(h[land], 2))
    top = float(np.percentile(h[land], 99.8))
    up = np.clip((h - low) / max(top - low, 1e-3), 0.0, 1.0) * land
    return h, land, up


def rivers(up, land):
    """Polylines of the rivers of the widest map, in px of that map, each with the share of the land it drains along it."""
    f = 4
    H, W = up.shape
    h = up[: H // f * f, : W // f * f].reshape(H // f, f, W // f, f).mean(axis=(1, 3))
    wet = land[: H // f * f, : W // f * f].reshape(H // f, f, W // f, f).mean(axis=(1, 3)) < 0.5
    h = ndimage.gaussian_filter(h, 1.0)
    # A little grain so no two streams run side by side down an even slope.
    rng = np.random.default_rng(7)
    h = h + 0.004 * rng.random(h.shape) + 0.03 * ndimage.gaussian_filter(rng.random(h.shape) - 0.5, 6.0) * 12.0 + 0.012 * ndimage.gaussian_filter(rng.random(h.shape) - 0.5, 2.0) * 4.0
    n, m = h.shape
    filled = np.full(h.shape, np.inf)
    to = np.full(h.shape, -1, dtype=np.int64)
    heap = []
    done = np.zeros(h.shape, dtype=bool)
    ys, xs = np.nonzero(wet)
    for y, x in zip(ys.tolist(), xs.tolist()):
        filled[y, x] = 0.0
        done[y, x] = True
    edge = wet & ~ndimage.binary_erosion(wet)
    for y, x in zip(*[a.tolist() for a in np.nonzero(edge)]):
        heapq.heappush(heap, (0.0, y, x))
    order = []
    nb = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]
    hl = h.tolist()
    while heap:
        z, y, x = heapq.heappop(heap)
        for dy, dx in nb:
            yy, xx = y + dy, x + dx
            if 0 <= yy < n and 0 <= xx < m and not done[yy, xx]:
                done[yy, xx] = True
                zz = max(hl[yy][xx], z + 1e-5)
                filled[yy, xx] = zz
                to[yy, xx] = y * m + x
                order.append(yy * m + xx)
                heapq.heappush(heap, (zz, yy, xx))
    acc = np.ones(n * m)
    tof = to.ravel()
    for i in reversed(order):
        acc[tof[i]] += acc[i]
    acc = acc.reshape(n, m)
    least = 700.0
    is_river = (acc >= least) & ~wet
    fed = np.zeros(n * m, dtype=bool)
    for i in order:
        if is_river.ravel()[i] and tof[i] >= 0 and is_river.ravel()[tof[i]]:
            fed[tof[i]] = True
    lines = []
    seen = np.zeros(n * m, dtype=bool)
    heads = [i for i in order if is_river.ravel()[i] and not fed[i]]
    heads.sort(key=lambda i: -acc.ravel()[i])
    for head in heads:
        pts = []
        i = head
        while i >= 0:
            y, x = divmod(i, m)
            pts.append((x + 0.5, y + 0.5, acc[y, x]))
            if seen[i] or wet[y, x]:
                break
            seen[i] = True
            i = tof[i]
        if len(pts) >= 4:
            p = np.array(pts)
            k = np.array([1, 2, 3, 2, 1], dtype=np.float64)
            k /= k.sum()
            for c in (0, 1):
                pad = np.concatenate([[p[0, c]] * 2, p[:, c], [p[-1, c]] * 2])
                p[:, c] = np.convolve(pad, k, mode='valid')
            # (It winds: thrown from side to side across its own line, a little, at two sizes.)
            along = np.cumsum(np.concatenate([[0.0], np.hypot(np.diff(p[:, 0]), np.diff(p[:, 1]))]))
            tx = np.gradient(p[:, 0])
            ty = np.gradient(p[:, 1])
            norm = np.maximum(np.hypot(tx, ty), 1e-6)
            phase = (head % 97) * 0.37
            ends = np.minimum(1.0, np.minimum(along, along[-1] - along) / 4.0)
            wind = (0.9 * np.sin(along / 3.1 + phase) + 0.5 * np.sin(along / 1.3 + 2.0 * phase)) * ends
            p[:, 0] += -ty / norm * wind
            p[:, 1] += tx / norm * wind
            p[:, :2] *= f
            last = divmod(i, m) if i >= 0 else (0, 0)
            lines.append((p, bool(i >= 0 and wet[last[0], last[1]]), phase))
    return lines, n * m


def draw_rivers(lines, cells, size, scale, offset):
    """The rivers as a mask at four times the size, brought down: a line as wide as the land it drains is large."""
    ss = 3
    im = Image.new('L', (size[0] * ss, size[1] * ss), 0)
    d = ImageDraw.Draw(im)
    fan = Image.new('L', im.size, 0)
    df = ImageDraw.Draw(fan)
    for p, to_water, phase in lines:
        share = p[-1][2] / 700.0
        if to_water and share >= 1.6 and len(p) > 8:
            # A delta: the river builds a fan of low ground out into the water and crosses it in a few arms.
            mouth = p[-1][:2]
            way = p[-1][:2] - p[-7][:2]
            way = way / max(np.hypot(*way), 1e-6)
            turn = math.atan2(way[1], way[0])
            reach = min(7.0 + 5.0 * math.log2(share), 26.0)
            apex = mouth - 0.35 * reach * way
            pts = [((apex[0] - offset[0]) * scale * ss, (apex[1] - offset[1]) * scale * ss)]
            for k in range(-4, 5):
                ang = turn + math.radians(11.0 * k)
                rad = reach * 1.35 * (0.8 + 0.22 * math.sin(2.3 * k + phase) + 0.1 * math.sin(5.1 * k + 2.0 * phase)) * (1.0 - 0.25 * abs(k) / 4.0)
                pts.append(((apex[0] + rad * math.cos(ang) - offset[0]) * scale * ss, (apex[1] + rad * math.sin(ang) - offset[1]) * scale * ss))
            df.polygon(pts, fill=255)
            w = max(1, int(round(min(0.6 + 0.3 * math.log2(share), 1.6) * scale ** 0.6 * ss)))
            for k, lean in enumerate((-27.0, -6.0, 19.0, 34.0)[: 3 if share < 4 else 4]):
                at = apex.copy()
                ang = turn + math.radians(lean)
                for j in range(int(reach * 1.5)):
                    nxt = at + np.array([math.cos(ang + 0.35 * math.sin(0.5 * j + phase + k)), math.sin(ang + 0.35 * math.sin(0.5 * j + phase + k))])
                    d.line([((at[0] - offset[0]) * scale * ss, (at[1] - offset[1]) * scale * ss), ((nxt[0] - offset[0]) * scale * ss, (nxt[1] - offset[1]) * scale * ss)], fill=255, width=w)
                    at = nxt
        for j, (a, b) in enumerate(zip(p[:-1], p[1:])):
            share = b[2] / 700.0
            # (No river keeps one width: it narrows in a gorge and spreads on a flat.)
            wide = min(0.7 + 0.5 * math.log2(max(share, 1.0)), 3.0) * scale ** 0.6 * (1.0 + 0.4 * math.sin(0.55 * j + phase) + 0.25 * math.sin(1.9 * j + 3.0 * phase))
            x0, y0 = (a[0] - offset[0]) * scale * ss, (a[1] - offset[1]) * scale * ss
            x1, y1 = (b[0] - offset[0]) * scale * ss, (b[1] - offset[1]) * scale * ss
            if max(x0, x1) < -50 or max(y0, y1) < -50 or min(x0, x1) > im.size[0] + 50 or min(y0, y1) > im.size[1] + 50:
                continue
            w = max(1, int(round(wide * ss)))
            d.line([(x0, y0), (x1, y1)], fill=255, width=w)
            d.ellipse([x1 - w / 2, y1 - w / 2, x1 + w / 2, y1 + w / 2], fill=255)
    return np.asarray(im.resize(size, Image.LANCZOS), dtype=np.float32) / 255.0, np.asarray(fan.resize(size, Image.LANCZOS), dtype=np.float32) / 255.0


def horizon(up, km_px):
    t = np.zeros_like(up)
    d = 1.0
    while d * km_px < 260.0 and d < 320.0:
        soft = ndimage.gaussian_filter(up, 0.25 * d) if d > 2 else up
        there = ndimage.shift(soft, (-SUN[1] * d, -SUN[0] * d), order=1, mode='nearest')
        t = np.maximum(t, (there - up) * RELIEF_KM / (d * km_px))
        d *= 1.35
    return t


def main():
    h_a, land_a, up_a = load('a')
    lines, cells = rivers(up_a, land_a)
    print('rivers', len(lines))
    ra = LEVELS['a']
    for level in 'abcd':
        h, land, up = load(level)
        rect = LEVELS[level]
        H, W = h.shape
        km_px = rect['width'] * KM_PER_MASTER_PX / W
        if level in 'ab':
            scale = ra['width'] / rect['width']
            off = ((rect['cx'] - rect['width'] / 2 - (ra['cx'] - ra['width'] / 2)) / ra['width'] * h_a.shape[1],
                   (rect['cy'] - rect['width'] * 9 / 32 - (ra['cy'] - ra['width'] * 9 / 32)) / ra['width'] * h_a.shape[1])
            river, fan = draw_rivers(lines, cells, (W, H), scale, off)
            solid = (land | (fan > 0.5)) & (river < 0.5)
        else:
            solid = land
        inside = ndimage.distance_transform_edt(solid)
        outside = ndimage.distance_transform_edt(~solid)
        d = np.where(solid, inside - 0.5, -(outside - 0.5))
        r = 0.5 + 0.5 * np.sign(d) * np.sqrt(np.minimum(np.abs(d) / REACH, 1.0))
        half = np.asarray(Image.fromarray(up).resize((W // 2, H // 2), Image.BOX), dtype=np.float32)
        t = horizon(half, km_px * 2.0)
        g = np.sqrt(np.clip(t / 2.0, 0.0, 1.0))
        open_ = np.zeros_like(half)
        for sigma, gain in ((1.0, 2.2), (3.0, 1.6), (9.0, 1.2)):
            open_ += gain * (half - ndimage.gaussian_filter(half, sigma))
        b = np.clip(0.5 + open_, 0.0, 1.0)
        s = OUT_W[level] / W
        d2 = d * s
        r = 0.5 + 0.5 * np.sign(d2) * np.sqrt(np.minimum(np.abs(d2) / REACH, 1.0))
        shore = Image.fromarray(np.round(r * 255.0).astype(np.uint8), 'L')
        if W != OUT_W[level]:
            shore = shore.resize((OUT_W[level], round(H * s)), Image.LANCZOS)
        path = os.path.join(OUT, f'shore-{level}.png')
        shore.save(path, optimize=True)
        # Blue: the waters that the land shuts in (lakes), which have no surf and no pale shelf.
        marks, count = ndimage.label(~land)
        rim = np.unique(np.concatenate([marks[0], marks[-1], marks[:, 0], marks[:, -1]]))
        shut = (marks > 0) & (~np.isin(marks, rim) if level != 'd' else True)
        shut = ndimage.gaussian_filter(ndimage.binary_dilation(shut, iterations=3).astype(np.float32), 1.5)
        shut = np.asarray(Image.fromarray(shut).resize((W // 2, H // 2), Image.BOX), dtype=np.float32)
        im = Image.fromarray(np.round(np.stack([g, b, shut], axis=-1) * 255.0).astype(np.uint8), 'RGB')
        if level != 'a':
            im = im.resize((W // 3, H // 3), Image.LANCZOS)
        light = os.path.join(OUT, f'light-{level}.jpg')
        im.save(light, quality=82, subsampling=0)
        print(level, 'light', im.size, os.path.getsize(light) // 1024, 'KB')
        im = shore
        print(level, im.size, os.path.getsize(path) // 1024, 'KB', 'km/px', round(km_px, 3), 'land share', round(float(solid.mean()), 3))


if __name__ == '__main__':
    main()
