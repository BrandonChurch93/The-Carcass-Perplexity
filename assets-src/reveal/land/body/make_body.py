#!/usr/bin/env python3
"""The body as land, for the view from orbit: a computed terrain of the widest level, and what the land sheet reads of it.

The coast is not moved: land and water are those of land/shore-a.png and maps/map-a-h.png. Inside that outline the height is
computed anew. The bright bands of map-a-h.png (the bones) are taken as lines of uplift, the rest of the land as slow uplift, and
the surface is cut by rivers until uplift and cutting balance (stream power, solved implicitly cell by cell in order of height,
after Braun and Willett 2013). What comes out is ranges with a crest line, spurs and valleys of unlike length that fork.

It writes, under public/assets/reveal/land/:
  body-relief.jpg  red, green: the slope (0.5 level); blue: over 0.3 the height of the land, under 0.25 the old map's shallows.
                   The encoding of relief-a.jpg (make_relief.py).
  body-light.jpg   red: the horizon toward the day's sun as sqrt(tan / 2); green: how open to the sky; blue: the shut waters of
                   light-a.jpg. The encoding of light-a.jpg (make_bake.py).
  body-colour.jpg  the colour of the country with no light in it, computed cell by cell from height, slope, how much land drains
                   through the cell, how far the sea is, and the province the cell lies in.
West and south of the skull, where the land sheet drowns the low islands by their height, the old height is kept.

Run: F=1 python3 assets-src/reveal/land/body/make_body.py   (Python 3 with numpy, scipy, Pillow and numba; F=2 works at half size)
"""
import heapq
import math
import os
import sys
import numpy as np
import numba as nb
from PIL import Image
from scipy import ndimage

Image.MAX_IMAGE_PIXELS = None
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))
MAPS = os.path.join(ROOT, 'public', 'assets', 'reveal', 'maps')
LAND = os.path.join(ROOT, 'public', 'assets', 'reveal', 'land')
WORK = os.environ.get('BODYWORK', os.path.join(ROOT, 'out', 'work', 'body'))
os.makedirs(WORK, exist_ok=True)
F = int(os.environ.get('F', '1'))
SHORE = 22 / 255.0
# Px of the master to px of map-a.
MASTER = {'cx': 2983.67, 'cy': 1727.13, 'width': 5295.59}
KM_PER_MASTER_PX = 4536.0 / 5295.59
RELIEF_KM = float(os.environ.get('RELIEF_KM', '16'))
# How much of a bone's whole body is pale, beside its crest line: the width of bone against country.
BODYW = float(os.environ.get('BODYW', '1.0'))
RIBFLAT = float(os.environ.get('RIBFLAT', '0.7'))
LESSFLAT = float(os.environ.get('LESSFLAT', '0.75'))
ONLY = os.environ.get('ONLY', '')
TURN = math.atan2(-0.2, 0.78) - math.radians(3.0)
SUN = (math.sin(TURN), -math.cos(TURN))
ITERS = int(os.environ.get('ITERS', '70'))
SEED = 30


def fbm(shape, rng, base, octaves=5, fall=0.5):
    """Smooth noise in 0 to 1: random grids enlarged, base px the largest feature."""
    H, W = shape
    out = np.zeros(shape, np.float32)
    amp = 1.0
    total = 0.0
    size = float(base)
    for _ in range(octaves):
        gh, gw = max(2, int(H / size) + 2), max(2, int(W / size) + 2)
        g = rng.random((gh, gw)).astype(np.float32)
        z = ndimage.zoom(g, (H / (gh - 1) * 1.02, W / (gw - 1) * 1.02), order=3)[:H, :W]
        out += amp * z
        total += amp
        amp *= fall
        size = max(size / 2.0, 1.5)
    return out / total


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


@nb.njit(cache=True)
def erode(h, dom, U, K, order, iters, dt, m):
    H, W = h.shape
    n = H * W
    rcv = np.empty(n, np.int64)
    dist = np.ones(n, np.float32)
    area = np.empty(n, np.float32)
    hf = h.ravel()
    Uf = U.ravel()
    Kf = K.ravel()
    domf = dom.ravel()
    count = order.shape[0]
    seq = np.empty(count, np.int64)
    done = np.zeros(n, np.bool_)
    for it in range(iters):
        # Fill the hollows from the sea inward (priority flood, with a small fall kept toward the outlet), so every cell drains.
        heap = [(np.float32(0.0), np.int64(0))]
        heap.pop()
        for i in range(n):
            done[i] = False
        for k in range(count):
            i = order[k]
            y = i // W
            x = i - y * W
            edge = False
            for dy in range(-1, 2):
                for dx in range(-1, 2):
                    yy = y + dy
                    xx = x + dx
                    if yy < 0 or yy >= H or xx < 0 or xx >= W or not domf[yy * W + xx]:
                        edge = True
            if edge:
                heapq.heappush(heap, (hf[i], i))
                done[i] = True
        got = 0
        while len(heap) > 0:
            z, i = heapq.heappop(heap)
            seq[got] = i
            got += 1
            y = i // W
            x = i - y * W
            for dy in range(-1, 2):
                for dx in range(-1, 2):
                    yy = y + dy
                    xx = x + dx
                    if yy < 0 or yy >= H or xx < 0 or xx >= W:
                        continue
                    j = yy * W + xx
                    if done[j] or not domf[j]:
                        continue
                    done[j] = True
                    if hf[j] <= z:
                        hf[j] = z + np.float32(0.002)
                    heapq.heappush(heap, (hf[j], j))
        # Where each cell drains: the steepest of its eight neighbours (the sea beside the land is the lowest of all).
        for k in range(got):
            i = seq[k]
            y = i // W
            x = i - y * W
            best = 0.0
            rcv[i] = i
            for dy in range(-1, 2):
                for dx in range(-1, 2):
                    if dy == 0 and dx == 0:
                        continue
                    yy = y + dy
                    xx = x + dx
                    if yy < 0 or yy >= H or xx < 0 or xx >= W:
                        continue
                    d = 1.41421356 if (dy != 0 and dx != 0) else 1.0
                    j = yy * W + xx
                    hj = hf[j] if domf[j] else -1.0
                    s = (hf[i] - hj) / d
                    if s > best:
                        best = s
                        rcv[i] = j
                        dist[i] = d
            area[i] = 1.0
        for k in range(got - 1, -1, -1):
            i = seq[k]
            r = rcv[i]
            if r != i and domf[r]:
                area[r] += area[i]
        for k in range(got):
            i = seq[k]
            r = rcv[i]
            base = hf[r] if domf[r] else 0.0
            f = Kf[i] * dt * area[i] ** m / dist[i]
            hf[i] = (hf[i] + dt * Uf[i] + f * base) / (1.0 + f)
    return area


KM_MASTER = 4536.0 / 5295.59
PAN = (2658.2, 1069.6, 205.0, 165.0)      # the salt pan of the hips: centre and half axes, px of map-a
HEART = (1502.6, 841.3)
THROAT = (1100.6, 929.5)


def pan_reach(W, H):
    """How far each cell lies from the middle of the pan of the hips, in its radius, the radius uneven round it: the floor of the
    pan is a basin with a broken shore, headlands of the ranges standing into it, and no disc."""
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.hypot((x * F - PAN[0]) / PAN[2], (y * F - PAN[1]) / PAN[3])
    return r + 1.1 * (fbm((H, W), np.random.default_rng(SEED + 7), 110.0 / F, 4) - 0.5)


def lesser_ranges(W, H):
    """1 on the ranges of the chest that are not the six a side nearest the shoulders, in px of the full map."""
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    fx, fy = x * F, y * F
    upper = smooth(1790.0, 1850.0, fx - 0.33 * (900.0 - fy)) * smooth(45.0, 80.0, 1010.0 - fy) * (1.0 - smooth(2300.0, 2400.0, fx))
    lower = smooth(1740.0, 1800.0, fx - 0.4 * (fy - 1050.0)) * smooth(45.0, 80.0, fy - 1010.0) * (1.0 - smooth(2300.0, 2400.0, fx - 0.4 * (fy - 1050.0)))
    return np.clip(upper + lower, 0.0, 1.0)


def zone(W, H, at, inner, outer):
    """1 inside an ellipse given in px of the full map, falling to 0 between inner and outer of its radius."""
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.hypot((x * F - at[0]) / at[2], (y * F - at[1]) / at[3])
    return 1.0 - smooth(inner, outer, r)


def west_sea(W, H):
    """The land sheet's drowned country west and south of the skull (shared/weather.ts, westSea), widened by its own bend."""
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    mx = x * F / 0.77347 + 335.87
    my = y * F / 0.77347 + 237.6
    r = np.hypot((mx - 1350.0) / 330.0, (my - 1566.0) / 270.0)
    limit = 1700.0 + 0.6 * np.maximum(my - 1700.0, 0.0)
    w = smooth(1.08, 1.6, r) * (1.0 - smooth(limit - 150.0, limit + 150.0, mx))
    w = ndimage.maximum_filter(w, size=int(360 / F) | 1)
    return smooth(0.0, 0.3, ndimage.gaussian_filter(w, 40.0 / F))


def srgb(*c):
    return np.array(c, np.float32) / 255.0


def mixc(a, b, t):
    return a + (b - a) * t[..., None]


def outputs():
    rng = np.random.default_rng(SEED + 1)
    h = np.load(os.path.join(WORK, f'h-{F}.npy'))
    area = np.load(os.path.join(WORK, f'area-{F}.npy')) * F * F
    H, W = h.shape
    px = 1.0 / F
    old = Image.open(os.path.join(MAPS, 'map-a-h.png')).convert('L')
    h_old = np.asarray(old.resize((W, H), Image.BOX), dtype=np.float32) / 255.0
    shore = np.asarray(Image.open(os.path.join(LAND, 'shore-a.png')).convert('L').resize((W, H), Image.BOX), dtype=np.float32) / 255.0
    old_colour = np.asarray(Image.open(os.path.join(MAPS, 'map-a.jpg')).convert('RGB').resize((W, H), Image.BOX), dtype=np.float32) / 255.0
    land_map = ndimage.binary_opening(h_old > SHORE, iterations=1)
    dry = shore > 0.5
    dom = land_map | dry
    d_shore = np.sign(shore - 0.5) * (2.0 * (shore - 0.5)) ** 2 * 160.0
    top = float(np.percentile(h[dom], 99.8))
    e = np.clip(h / top, 0.0, 1.0)
    low_o = float(np.percentile(h_old[land_map], 2))
    top_o = float(np.percentile(h_old[land_map], 99.8))
    e_old = np.clip((h_old - low_o) / (top_o - low_o), 0.0, 1.0)
    keep = west_sea(W, H)
    e = np.where(dom, e * (1.0 - keep) + e_old * keep, 0.0).astype(np.float32)
    e = ndimage.gaussian_filter(e, 0.45 * px) * dom

    # ---- relief: the encoding of relief-a.jpg ----
    gx = ndimage.sobel(e, axis=1) / 8.0 / px
    gy = ndimage.sobel(e, axis=0) / 8.0 / px
    # (One range a rib: lit as it stands, the two flanks of a bone read from orbit as two pale lines with the crest's shade
    # between them. So the light is given a land on which the broad form of each bone is lower than it is, a pale tableland
    # ridged by its spurs and gullies, which keep their whole height: the bone is one band, and every ridge on it still casts.)
    body = smooth(float(os.environ.get('BODY0', '0.36')), float(os.environ.get('BODY1', '0.68')), ndimage.gaussian_filter(h_old, 5.0 * px))
    e_lit = e - RIBFLAT * np.clip(body * 1.5, 0.0, 1.0) * (ndimage.gaussian_filter(e, 6.0 * px) - ndimage.gaussian_filter(e, 22.0 * px))
    # (And the lesser ranges of the chest, toward the belly, stand lower in the light than they are, so their crests do not
    # count as ribs.)
    e_lit = e_lit - LESSFLAT * lesser_ranges(W, H) * (e - ndimage.gaussian_filter(e, 22.0 * px))
    gx_lit = ndimage.sobel(e_lit, axis=1) / 8.0 / px
    gy_lit = ndimage.sobel(e_lit, axis=0) / 8.0 / px
    relief_old = np.asarray(Image.open(os.path.join(LAND, 'relief-a.jpg')).convert('RGB').resize((W, H), Image.LANCZOS), dtype=np.float32) / 255.0
    r = 0.5 + 0.5 * np.tanh(gx_lit * 17.0)
    g = 0.5 + 0.5 * np.tanh(gy_lit * 17.0)
    b = np.where(dom, 0.3 + 0.7 * (0.07 + 0.93 * e), np.minimum(relief_old[..., 2], 0.25))
    # (The strait of the Ribs: the land sheet lets the sea into the low ground there by this height. Its water stays where the
    # old relief had it, so the coast of the strait does not move.)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    sx = ((xx * F / 0.77347 + 335.87) - (79.14 + 0.402 * 5872.86)) * KM_MASTER / 200.0
    sy = ((yy * F / 0.77347 + 237.6) - (44.52 + 0.464 * 3305.24)) * KM_MASTER / 85.0
    strait = np.exp(-(sx * sx + sy * sy))
    light_g = np.asarray(Image.open(os.path.join(LAND, 'light-a.jpg')).convert('RGB').resize((W, H), Image.LANCZOS), dtype=np.float32)[..., 1] / 255.0
    stood = (relief_old[..., 2] - 0.36 - 0.09 * strait) * 260.0 + (light_g - 0.45) * 12.0
    in_strait = smooth(0.04, 0.2, strait)
    dry_there = smooth(-1.0, 3.0, stood)
    b = np.where(dom, b + in_strait * (dry_there * (0.47 + 0.09 * strait - np.minimum(b, 0.47 + 0.09 * strait)) - (1.0 - dry_there) * np.maximum(b - 0.33, 0.0)), b)
    relief = np.stack([r, g, b], axis=-1)
    if ONLY != 'colour':
        Image.fromarray((relief * 255.0 + 0.5).astype(np.uint8), 'RGB').resize((3072, 1728), Image.LANCZOS).save(os.path.join(LAND, 'body-relief.jpg'), quality=80, subsampling=0)

    # ---- light: the encoding of light-a.jpg ----
    if ONLY != 'colour':
        up = 0.07 + 0.93 * e_lit
        up = up * dom
        if F == 1:
            half = np.asarray(Image.fromarray(up).resize((W // 2, H // 2), Image.BOX), dtype=np.float32)
        else:
            half = up
        km_px = 4536.0 / half.shape[1]
        t = np.zeros_like(half)
        d = 1.0
        while d * km_px < 260.0 and d < 320.0:
            soft = ndimage.gaussian_filter(half, 0.25 * d) if d > 2 else half
            there = ndimage.shift(soft, (-SUN[1] * d, -SUN[0] * d), order=1, mode='nearest')
            t = np.maximum(t, (there - half) * RELIEF_KM / (d * km_px))
            d *= 1.25
        lr = np.sqrt(np.clip(t / 2.0, 0.0, 1.0))
        open_ = np.zeros_like(half)
        for sigma, gain in ((1.0, 2.2), (3.0, 1.6), (9.0, 1.2)):
            open_ += gain * (half - ndimage.gaussian_filter(half, sigma))
        lg = np.clip(0.5 + open_, 0.0, 1.0)
        light_old = np.asarray(Image.open(os.path.join(LAND, 'light-a.jpg')).convert('RGB').resize((half.shape[1], half.shape[0]), Image.LANCZOS), dtype=np.float32) / 255.0
        light = np.stack([lr, lg, light_old[..., 2]], axis=-1)
        Image.fromarray(np.round(light * 255.0).astype(np.uint8), 'RGB').resize((2048, 1152), Image.LANCZOS).save(os.path.join(LAND, 'body-light.jpg'), quality=78, subsampling=0)

    # ---- colour: the country, with no light in it ----
    slope = np.hypot(gx, gy) * top * 0.5  # about the true fall, cell for cell
    # (The bones themselves, as the old map has them: a range that is a bone is pale in its whole body, stained, its valleys dark.)
    ridge = e - ndimage.gaussian_filter(e, 5.0 * px)
    broad = ndimage.gaussian_filter(e, 14.0 * px)
    wet = np.log10(np.maximum(area, 1.0))
    p1 = fbm((H, W), rng, 520 * px, 4)
    p2 = fbm((H, W), rng, 380 * px, 4)
    p3 = fbm((H, W), rng, 460 * px, 4)
    mott = fbm((H, W), rng, 36 * px, 4)
    grain = fbm((H, W), rng, 3 * px, 2)
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    fx, fy = x * F, y * F
    # Provinces of the low country.
    near_heart = np.exp(-(((fx - HEART[0]) / 330.0) ** 2 + ((fy - HEART[1]) / 250.0) ** 2))
    near_throat = np.exp(-(((fx - THROAT[0] + 50.0) / 220.0) ** 2 + ((fy - THROAT[1] + 25.0) / 260.0) ** 2))
    east_hips = np.exp(-(((fx - PAN[0] - 420.0) / 520.0) ** 2 + ((fy - PAN[1] - 60.0) / 210.0) ** 2))
    # (A lava plain is a flood: it stands to a level, fills the low ground of its province and laps up the valleys of the ranges
    # round it, so its edge is a contour of the land, sharp, with bays and islands, and no soft patch. A dune field lies in a
    # basin the same way, its edge against the rock sharp and its edge on the plain soft.)
    e_low = ndimage.gaussian_filter(e, 1.2 * px)
    s_lava = np.clip(smooth(0.5, 0.7, p1) + 0.95 * smooth(0.25, 0.6, near_heart * (0.6 + 0.8 * mott)), 0.0, 1.0)
    w_lava = smooth(-0.03, 0.03, 0.015 + 0.15 * s_lava + 0.03 * (mott - 0.5) - e_low) * smooth(0.0, 0.12, s_lava)
    w_rust = np.clip(0.35 * smooth(0.57, 0.7, p3) * (1.0 - smooth(2400.0, 2900.0, fx)) + smooth(0.3, 0.7, near_throat) + 0.22 * smooth(0.3, 0.7, east_hips * (0.5 + mott)), 0.0, 1.0) * (1.0 - w_lava)
    s_dune = smooth(0.5, 0.7, p2)
    w_dune = smooth(-0.03, 0.03, 0.01 + 0.1 * s_dune + 0.03 * (mott - 0.5) - e_low) * smooth(0.0, 0.25, s_dune) * (1.0 - w_lava) * (1.0 - 0.7 * w_rust)
    w_olive = smooth(0.5, 0.64, 1.0 - p1) * (1.0 - w_dune) * (1.0 - w_rust)
    lava = srgb(40, 36, 37)
    rust = srgb(88, 52, 40)
    dune = srgb(100, 82, 58)
    olive = srgb(60, 63, 45)
    fan = srgb(80, 62, 49)
    growth = srgb(30, 44, 35)
    slate = srgb(60, 58, 57)
    salt = srgb(206, 201, 190)
    bone = srgb(205, 192, 166)
    stained = srgb(96, 76, 61)
    dull = srgb(70, 57, 48)
    scree = srgb(62, 58, 56)
    sand = srgb(202, 186, 152)
    cliff = srgb(64, 58, 54)
    if os.environ.get('PAL', 'a') == 'b':
        # (The second palette of the low country, for the choice: green and slate in place of brown and rust.)
        rust = srgb(74, 52, 44)
        dune = srgb(84, 80, 60)
        olive = srgb(50, 64, 44)
        fan = srgb(62, 64, 52)
        growth = srgb(24, 48, 38)
        slate = srgb(54, 60, 64)
        dull = srgb(58, 58, 52)
    country = np.broadcast_to(fan, (H, W, 3)).copy()
    # (The low country is dark: growth where the ground is low and wet, olive plain, ochre dry ground, slate toward the ranges.
    # Pale is the bone's alone.)
    damp = np.clip(ndimage.gaussian_filter(smooth(2.2, 3.4, wet) * (1.0 - smooth(0.2, 0.4, e)), 7.0 * px) * 3.0, 0.0, 1.0)
    country = mixc(country, slate, smooth(0.1, 0.24, broad) * smooth(0.45, 0.6, p2 + 0.3 * (mott - 0.5)) * 0.7)
    country = mixc(country, olive, w_olive)
    country = mixc(country, growth, 0.75 * damp * (1.0 - smooth(0.06, 0.2, e_low)) * (1.0 - 0.6 * w_rust))
    country = mixc(country, dune, w_dune)
    country = mixc(country, rust, w_rust)
    country = mixc(country, lava, w_lava)
    # (Dunes lie in long ridges across the wind; a lava plain is mottled, flow on flow.)
    wave = np.sin((fx * 0.35 + fy * 0.9) / 2.3 + 9.0 * mott + 4.0 * p3)
    country *= (1.0 + 0.05 * wave * w_dune)[..., None]
    country *= (0.82 + 0.36 * mott)[..., None]
    # Fans at the foot of the ranges: pale aprons where the valleys open on the plain.
    apron = smooth(0.1, 0.22, broad) * (1.0 - smooth(0.22, 0.4, broad)) * (1.0 - smooth(0.06, 0.2, slope)) * (1.0 - w_lava)
    country = mixc(country, fan * 1.22, 0.5 * apron * smooth(0.4, 0.6, mott))
    # Salt pans in the lowest closed ground of the dry provinces.
    pan = (1.0 - smooth(0.03, 0.07, e)) * smooth(0.6, 0.72, fbm((H, W), rng, 70 * px, 3)) * (w_dune + w_rust + 0.4 * (1.0 - w_olive)) * (1.0 - w_lava) * smooth(6.0, 14.0, d_shore)
    country = mixc(country, salt * 0.6, 0.45 * np.clip(pan, 0.0, 1.0))
    # Rivers: where much land drains through a cell the valley floor is damp and dark, or a pale dry wash in the dry provinces.
    channel = smooth(2.6, 3.8, wet) * (1.0 - smooth(0.25, 0.5, e))
    dryness = np.clip(w_dune + w_rust, 0.0, 1.0)
    country = mixc(country, mixc(np.broadcast_to(growth, (H, W, 3)), np.broadcast_to(sand * 0.55, (H, W, 3)), dryness), 0.7 * channel * (1.0 - 0.7 * w_lava))
    # The ranges: stained rock on the flanks, dark where steep, pale bone on the crest lines, old snow on the highest only.
    # (Stained pale rock is the bones' own; the hill country that is no bone is dull dark rock, so the figure is the palest thing on the land.)
    rock = mixc(np.broadcast_to(dull, (H, W, 3)).copy(), stained, np.clip(body * 1.3, 0.0, 1.0))
    rock = mixc(rock, scree, smooth(0.35, 0.8, slope) * 0.7)
    rock *= (0.8 + 0.4 * mott)[..., None]
    crest = smooth(0.012, 0.08, ridge) * smooth(0.3, 0.6, e)
    # (Of the ranges of the chest, the six a side nearest the shoulders are the great ones and carry the pale; those toward the
    # belly are lesser ranges of dark rock, so each side reads five or six ribs from orbit.)
    lesser = lesser_ranges(W, H)
    # (A bone keeps its mass: its whole body is pale, as broad as the old map has it, ridged by the relief, and stained where
    # water gathers in its gullies and where the rock is rotten.)
    gully = smooth(2.3, 3.3, wet) * (1.0 - smooth(0.5, 0.8, e))
    rot = smooth(0.52, 0.7, fbm((H, W), rng, 22 * px, 4)) * (1.0 - smooth(0.35, 0.7, e))
    mass = BODYW * body * (0.8 + 0.4 * mott) * (1.0 - 0.6 * gully) * (1.0 - 0.45 * rot) * (1.0 - 0.3 * smooth(0.0, 0.05, -ridge))
    paleness = np.clip(np.maximum(0.85 * crest + 0.5 * smooth(0.6, 0.95, e), mass), 0.0, 1.0) * (1.0 - 0.9 * lesser)
    rock = mixc(rock, bone, paleness)
    rock = mixc(rock, srgb(232, 232, 228), smooth(0.88, 0.98, e) * smooth(0.0, 0.05, ridge) * (1.0 - lesser))
    colour = mixc(country, rock, np.maximum(smooth(0.13, 0.36, e + 0.25 * np.maximum(ridge, 0.0) * 4.0), np.clip(BODYW * 1.2 * body, 0.0, 1.0) * (1.0 - 0.9 * lesser)))
    # The coast: a pale hairline of beach on low shores, dark rock where the land meets the sea steep.
    low_shore = (1.0 - smooth(0.02, 0.07, ndimage.gaussian_filter(e, 2.0 * px))) * smooth(0.42, 0.56, fbm((H, W), rng, 120 * px, 3))
    beach = (1.0 - smooth(0.6, 2.2, d_shore)) * low_shore * dom
    colour = mixc(colour, sand, 0.85 * beach)
    steep_shore = (1.0 - smooth(1.0, 5.0, d_shore)) * smooth(0.05, 0.14, ndimage.gaussian_filter(e, 2.0 * px))
    colour = mixc(colour, cliff, 0.7 * steep_shore * dom)
    colour *= (0.93 + 0.14 * grain)[..., None]
    # The pan of the hips keeps the old map's own salt and brine.
    pan_zone = 1.0 - smooth(0.62, 0.86, pan_reach(W, H))
    colour = mixc(colour, old_colour, pan_zone)
    # Where there is no land the old map stands, so the water's own reading of it is not moved.
    colour = np.where(dom[..., None], colour, old_colour)
    Image.fromarray((np.clip(colour, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), 'RGB').resize((3072, 1728), Image.LANCZOS).save(os.path.join(LAND, 'body-colour.jpg'), quality=int(os.environ.get('Q', '84')))
    for name in ('body-relief.jpg', 'body-light.jpg', 'body-colour.jpg'):
        print(name, os.path.getsize(os.path.join(LAND, name)) // 1024, 'KB')


def main():
    if os.environ.get('STAGE', 'all') in ('all', 'terrain'):
        terrain()
    if os.environ.get('STAGE', 'all') in ('all', 'outputs'):
        outputs()



def terrain():
    rng = np.random.default_rng(SEED)
    old = Image.open(os.path.join(MAPS, 'map-a-h.png')).convert('L')
    W0, H0 = old.size
    W, H = W0 // F, H0 // F
    h_old = np.asarray(old.resize((W, H), Image.BOX), dtype=np.float32) / 255.0
    shore = np.asarray(Image.open(os.path.join(LAND, 'shore-a.png')).convert('L').resize((W, H), Image.BOX), dtype=np.float32) / 255.0
    px = 1.0 / F  # one px of the full map, in cells
    land_map = ndimage.binary_opening(h_old > SHORE, iterations=1)
    dry = shore > 0.5
    dom = land_map | dry
    river = land_map & ~dry
    d_shore = np.sign(shore - 0.5) * (2.0 * (shore - 0.5)) ** 2 * 160.0  # texels of the full map, over 0 on land

    # ---- the uplift: the bones as lines, the land round them slow ----
    hs = ndimage.gaussian_filter(h_old, 1.5 * px)
    mid = ndimage.gaussian_filter(h_old, 14.0 * px)
    band = hs > 0.6
    D = ndimage.distance_transform_edt(band)
    peak = ndimage.maximum_filter(D, size=max(3, int(round(11 * px)) | 1))
    line = ((D >= peak - 0.35) & (D > 1.2 * px)).astype(np.float32)
    line = ndimage.gaussian_filter(line, 1.3 * px)
    line = np.clip(line / max(float(np.percentile(line[line > 0], 90)), 1e-3), 0.0, 1.0)
    bone = smooth(0.4, 0.74, ndimage.gaussian_filter(h_old, 4.0 * px))
    lith = fbm((H, W), rng, 90 * px, 4)
    # (The low country is not one plain: hill country in one province, level ground in the next.)
    hills = smooth(0.42, 0.62, fbm((H, W), rng, 260 * px, 3))
    U = 0.035 + 0.16 * hills + 0.2 * smooth(0.3, 0.62, mid) + 0.85 * bone ** 1.5 + 1.5 * line * smooth(0.5, 0.7, hs)
    U *= 0.75 + 0.5 * lith
    # (The pan of the hips is a pan: level ground, its salt and brine those of the old map.)
    U *= 1.0 - 0.92 * (1.0 - smooth(0.72, 0.95, pan_reach(W, H)))
    U = np.where(dom, U, 0.0).astype(np.float32)
    K = (0.5 + 1.0 * fbm((H, W), rng, 60 * px, 4)).astype(np.float32)
    K = np.where(river, 40.0, K).astype(np.float32)
    # The start: a low land that climbs from the coast, rough at every size, so the rivers find crooked ways.
    inland = ndimage.distance_transform_edt(dom).astype(np.float32)
    h = 0.02 * inland / px + 6.0 * fbm((H, W), rng, 70 * px, 6, 0.55) + 1.5 * rng.random((H, W)).astype(np.float32)
    h = np.where(dom, h, 0.0).astype(np.float32)
    order = np.flatnonzero(dom.ravel()).astype(np.int64)
    scale = 1.0 / F
    area = erode(h, dom, U, K, order, ITERS, 2.0, 0.45)
    # (Lengths are in cells: a half size run stands half as high for the same slope.)
    h *= F
    h = np.where(dom, h, 0.0)
    np.save(os.path.join(WORK, f'h-{F}.npy'), h)
    np.save(os.path.join(WORK, f'area-{F}.npy'), area.reshape(H, W))
    np.save(os.path.join(WORK, f'uplift-{F}.npy'), U)
    print('eroded', h.shape, 'max %.2f p99.8 %.2f' % (float(h.max()), float(np.percentile(h[dom], 99.8))))


if __name__ == '__main__':
    main()
