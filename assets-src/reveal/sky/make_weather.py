#!/usr/bin/env python3
"""The weather systems of the reveal, as a forecaster would name them.

Writes public/assets/reveal/sky/weather.png, 1024 x 576, on the rectangle WEATHER_RECT of src/places/reveal/shared/weather.ts
(px of the master: x -2600 to 8200, y -1400 to 4675), as the systems stand at the titan frame (10027). They travel slowly with
the far low; the cloud itself is the photographs, which stream through them faster (see lowDepth in weather.ts).

  red    how much low cloud a system holds: 0 clear sea, about 0.5 broken cumulus at the edge of a patch, 1 a front, a storm or a deck
  green  how much thin veil the wind draws out there
  blue   the kind: 0 open cells (rings of cloud round clear air, behind the front), 0.5 cumulus in chains, 1 closed cells

and then sets the red of public/assets/reveal/sky/cover.png (made by make_cover.py, which stands on the ground) to the cloud that
other land and the ice hold: a deck over the ice edge, banks on the coast that faces the wind, cumulus banked against each island on the side the wind comes from and a street
in its lee. Green and blue of cover.png are not touched. The mask of other land and ice is the ocean builder's
(assets-src/reveal/land/ocean/ocean-mask.png: px of the master x -1800 to 7416, y -800 to 4834; red other land, green ice); it is
read and never copied. Without the mask the red of cover.png is left as it is.

Seeded: the same pictures every run.
Run: python3 assets-src/reveal/sky/make_weather.py [path of the mask]   (Python 3 with numpy, scipy and Pillow)
"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
PUB = os.path.join(ROOT, 'public', 'assets', 'reveal', 'sky')
MASK = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets-src', 'reveal', 'land', 'ocean', 'ocean-mask.png')
MASK_RECT = (-1800.0, -800.0, 7416.0, 4834.0)

W, H = 1024, 576
X0, Y0, WIDE, HIGH = -2600.0, -1400.0, 10800.0, 6075.0
# The far low (LOW2 of weather.ts), the cyclone, the middle of the body, and the way the low wind blows (px of the master, y down).
LOW2 = (360.0, 1150.0)
CYCLONE = (5557.0, 3007.0)
LOW3 = (470.0, 2760.0)
# How many storms the sea holds: 1 the cyclone alone, 2 with the far low and its front, 3 with the small one to the south-west.
STORMS = int(os.environ.get('STORMS', '3'))
BODY = (3000.0, 1750.0, 2900.0, 1700.0)
WIND = (0.9511, 0.3090)


def smooth(lo, hi, v):
    t = np.clip((v - lo) / (hi - lo), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def noise(rng, sx, sy, turn=0.0):
    """Soft noise, 0 to 1, with features sx by sy texels, turned to lie along the wind."""
    n = rng.standard_normal((H * 2, W * 2)).astype(np.float32)
    n = ndimage.gaussian_filter(n, (sy, sx), mode='wrap')
    if turn:
        n = ndimage.rotate(n, turn, reshape=False, order=1, mode='wrap')
    n = n[H // 2:H // 2 + H, W // 2:W // 2 + W]
    n = (n - n.mean()) / (n.std() + 1e-9)
    return np.clip(0.5 + 0.25 * n, 0.0, 1.0)


def weather():
    rng = np.random.default_rng(30)
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    mx = X0 + (xs + 0.5) / W * WIDE
    my = Y0 + (ys + 0.5) / H * HIGH
    turn = -np.degrees(np.arctan2(WIND[1], WIND[0]))

    # The open sea holds its cloud in large patches, a few hundred km across and longer down the wind, with clear sea
    # between them: each is a deck of closed cells, thick and thin, that breaks into cumulus at its edge. No even layer.
    wide = noise(rng, 30.0, 16.0, turn)
    mid = noise(rng, 11.0, 6.0, turn)
    small = noise(rng, 4.0, 2.5, turn)
    field = 0.6 * wide + 0.4 * mid
    # (None near the body: it is the subject. The body lies about (3000, 1750), 2900 by 1700 px of the master.)
    clear_of_body = 0.45 + 0.55 * smooth(0.95, 1.3, np.hypot((mx - BODY[0]) / BODY[2], (my - BODY[1]) / BODY[3]))
    patch = smooth(0.55, 0.63, field) * clear_of_body
    fringe = smooth(0.48, 0.55, field) * smooth(0.42, 0.6, small)
    red = np.maximum(patch * (0.62 + 0.38 * smooth(0.3, 0.7, small)), 0.5 * fringe)
    kind = 0.5 + 0.5 * smooth(0.25, 0.75, patch)
    green = 0.8 * smooth(0.45, 0.55, field) * smooth(0.4, 0.7, noise(rng, 7.0, 3.0, turn))

    # The far low and its front: a comma. The band winds out of the low as the low wind winds into it (weather.ts: the turn
    # falls by 2 for each e-fold of the distance), wide at the head and drawn thin down the tail, which ends in clear air.
    dx, dy = mx - LOW2[0], my - LOW2[1]
    r = np.maximum(np.hypot(dx, dy), 1.0)
    th = np.arctan2(dy, dx)
    # (How far round the arm a point is: the arm is the curve th + 2 ln r = const; s runs 0 at the head to 1 at the tail's end.)
    phase = th + 2.0 * np.log(r / 95.0) - np.radians(47.0)
    off = (phase + np.pi) % (2.0 * np.pi) - np.pi
    along = np.log(r / 380.0) / np.log(1700.0 / 380.0)
    width = 0.15 + 40.0 / r
    ragged = 1.2 * width * (noise(rng, 6.0, 6.0) - 0.5)
    band = np.exp(-((off + ragged) / width) ** 2) * smooth(-0.3, 0.05, along) * (1.0 - smooth(0.7, 1.05, along))
    # (The low itself is a storm drawn by its own sheet, sky/index.ts: the band is its front, and it starts at the storm's rim.)
    front = 0.88 * np.clip(band, 0.0, 1.0)
    # (Ahead of the front, on the inside of the arm, the air is dry: a clear slot. Behind it, outside, cold air and open cells.)
    ahead = np.exp(-((off + 2.0 * width) / (1.0 * width)) ** 2) * smooth(0.1, 0.4, along) * (1.0 - smooth(0.85, 1.1, along))
    behind = np.exp(-((off - 3.2 * width) / (2.2 * width)) ** 2) * smooth(0.25, 0.5, along) * (1.0 - smooth(0.9, 1.2, along))
    comma = 1.0 if STORMS >= 2 else 0.0
    front, ahead, behind, _ = front * comma, ahead * comma, behind * comma, 0.0
    red = red * (1.0 - 0.9 * ahead)
    red = np.maximum(red, 0.5 * behind * (0.5 + 0.5 * smooth(0.35, 0.6, mid)))
    kind = kind * (1.0 - behind)
    red = np.maximum(red, front)
    kind = np.maximum(kind, front)
    green = green * (1.0 - 0.8 * ahead)

    # The other storms are drawn by their own sheets (OTHER_STORMS of weather.ts): the sea stands clear under and round each,
    # as round the cyclone, so nothing of this map is on a storm's disc.
    for n, (sx, sy, half) in enumerate(((LOW2[0], LOW2[1], 680.0), (LOW3[0], LOW3[1], 640.0))):
        if STORMS < n + 2:
            break
        clear = smooth(0.42 * half, 0.8 * half, np.hypot(mx - sx, my - sy))
        red, green = red * clear, green * clear
        kind = 0.5 + (kind - 0.5) * clear

    # Nothing of this map stands over the cyclone's disc, nor crowds it: clear water round it.
    away = np.hypot(mx - CYCLONE[0], my - CYCLONE[1])
    keep = smooth(850.0, 1450.0, away)
    red, green = red * keep, green * keep
    kind = 0.5 + (kind - 0.5) * keep

    out = np.stack([red, green, kind], -1)
    out = ndimage.gaussian_filter(out, (1.6, 1.6, 0.0))
    # (Past its border the map is read at its border: there it is one even thin field of cumulus, so nothing is drawn out in bars.)
    inside = np.minimum.reduce([xs, W - 1.0 - xs, ys, H - 1.0 - ys])
    rim = smooth(2.0, 40.0, inside)[..., None]
    out = np.array([0.4, 0.25, 0.5], np.float32) * (1.0 - rim) + out * rim
    Image.fromarray((np.clip(out, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(PUB, 'weather.png'), optimize=True)
    print('weather.png', os.path.getsize(os.path.join(PUB, 'weather.png')))


def held():
    """The red of cover.png: the cloud that other land and the ice hold."""
    if not os.path.exists(MASK):
        print('no mask at', MASK, ': the red of cover.png is left as it is')
        return
    path = os.path.join(PUB, 'cover.png')
    cover = np.asarray(Image.open(path).convert('RGB')).copy()
    CH, CW = cover.shape[:2]
    CX0, CY0, CWIDE = -900.0, -820.0, 8500.0
    CHIGH = CWIDE * 9 / 16
    mask = Image.open(MASK).convert('RGB')
    # (The mask is laid on the rectangle of the cover; outside the mask there is nothing.)
    px = CWIDE / CW
    left = (CX0 - MASK_RECT[0]) / (MASK_RECT[2] - MASK_RECT[0]) * mask.size[0]
    top = (CY0 - MASK_RECT[1]) / (MASK_RECT[3] - MASK_RECT[1]) * mask.size[1]
    right = (CX0 + CWIDE - MASK_RECT[0]) / (MASK_RECT[2] - MASK_RECT[0]) * mask.size[0]
    bottom = (CY0 + CHIGH - MASK_RECT[1]) / (MASK_RECT[3] - MASK_RECT[1]) * mask.size[1]
    laid = np.asarray(mask.transform((CW, CH), Image.EXTENT, (left, top, right, bottom), Image.BILINEAR)).astype(np.float32) / 255.0
    land, ice = laid[..., 0], laid[..., 1]
    rng = np.random.default_rng(31)

    def soft(a, km):
        return ndimage.gaussian_filter(a, km / 0.8565 / px)

    def shifted(a, km):
        """a as it lies km down the wind."""
        d = km / 0.8565 / px
        return ndimage.shift(a, (WIND[1] * d, WIND[0] * d), order=1, mode='constant')

    n = rng.standard_normal((CH, CW)).astype(np.float32)
    lumps = ndimage.gaussian_filter(n, 9.0)
    lumps = np.clip(0.5 + 0.25 * lumps / lumps.std(), 0.0, 1.0)
    # A deck of low cloud over the ice edge: full on the ice near open water, breaking toward the sea and thinning far in.
    edge = soft(ice, 60.0)
    deck = smooth(0.25, 0.7, edge) * (1.0 - 0.8 * smooth(0.8, 0.99, soft(ice, 170.0))) * (0.45 + 0.55 * smooth(0.3, 0.6, lumps))
    # Banks on the coast that faces the wind: where land lies just down the wind of sea or ice.
    faces = np.clip(soft(land, 25.0) - shifted(soft(land, 25.0), 90.0), 0.0, 1.0)
    # (Of the far coast only: an island's cloud is small and broken, below.)
    wide_land = smooth(0.15, 0.4, soft(land, 150.0))
    banks = smooth(0.12, 0.45, faces) * (0.2 + 0.8 * smooth(0.42, 0.62, lumps)) * wide_land
    # In the lee of the far coast the land is clear, and the sea beyond it grows streets with the fetch.
    lee = np.zeros_like(land)
    for km in (150.0, 300.0, 450.0, 600.0):
        lee = np.maximum(lee, shifted(soft(land, 40.0), km) * (0.35 + 0.65 * km / 600.0))
    streets = 0.55 * smooth(0.15, 0.6, lee) * (1.0 - smooth(0.05, 0.3, soft(land, 15.0))) * smooth(0.35, 0.6, ndimage.gaussian_filter(n, 40.0) / ndimage.gaussian_filter(n, 40.0).std() * 0.25 + 0.55)
    # Islands: a small cap on each, and a street of cloud in its lee, thinning down the wind.
    isles = land * (1.0 - smooth(0.02, 0.1, soft(land, 150.0)))
    cap = smooth(0.2, 0.6, shifted(soft(isles, 9.0), -16.0)) * (1.0 - smooth(0.2, 0.7, soft(isles, 4.0)))
    wake = np.zeros_like(land)
    for km in range(20, 340, 20):
        wake = np.maximum(wake, shifted(soft(isles, 8.0), float(km) + 25.0) * (1.0 - km / 340.0))
    wake = 0.55 * smooth(0.05, 0.3, wake)
    red = np.maximum.reduce([0.58 * deck, 0.72 * banks, streets, 0.3 * cap * smooth(0.4, 0.6, lumps), wake])
    # (Clear over the cyclone, as the map of the systems is.)
    ys, xs = np.mgrid[0:CH, 0:CW].astype(np.float32)
    away = np.hypot(CX0 + (xs + 0.5) * px - CYCLONE[0], CY0 + (ys + 0.5) * px - CYCLONE[1])
    red *= smooth(850.0, 1450.0, away)
    # (Past its border the cover is read at its border: nothing is held there.)
    red *= smooth(2.0, 60.0, np.minimum.reduce([xs, CW - 1.0 - xs, ys, CH - 1.0 - ys]))
    cover[..., 0] = (np.clip(ndimage.gaussian_filter(red, 1.5), 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8)
    Image.fromarray(cover, 'RGB').save(path, optimize=True)
    print('cover.png', os.path.getsize(path))


if __name__ == '__main__':
    weather()
    held()
