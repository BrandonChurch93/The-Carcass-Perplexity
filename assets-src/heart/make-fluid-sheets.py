# Makes the lake's and the fall's sheets from the generated pictures under assets-src/heart/gen/.
# Run: python3 assets-src/heart/make-fluid-sheets.py   (numpy, scipy, Pillow)
# rope: colour (JPEG) and a data picture (JPEG, 4:4:4): r, g the slope of the height, b the height.
# melt: colour (JPEG) with the heat in it, and a data picture: r, g the slope of the skin, b the heat (0 skin to 1 white melt).
import os
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GEN = os.path.join(ROOT, 'assets-src', 'heart', 'gen')
OUT = os.path.join(ROOT, 'public', 'assets', 'heart', 'mat')
W, H = 2048, 1024
# A slope is stored as the height's change from one texel to the next, times this.
SLOPE = 6.0


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def load(name):
    im = Image.open(os.path.join(GEN, name + '.png')).convert('RGB').resize((W, H), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255.0


# The middle stays; toward two edges the picture fades into itself shifted by half its size, whose own middle is whole there.
def wrap(a, band=0.1):
    for axis in (0, 1):
        n = a.shape[axis]
        idx = np.arange(n)
        edge = np.minimum(idx, n - 1 - idx) / n
        w = smooth(0, band, edge)
        shape = [1, 1, 1]
        shape[axis] = n
        w = w.reshape(shape)
        a = a * w + np.roll(a, n // 2, axis=axis) * (1 - w)
    return a


def blur(a, s):
    return gaussian_filter(a, s, mode='wrap')


def slopes(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * strength
    return dx, dy


def save_data(name, dx, dy, b):
    px = np.stack([np.clip(0.5 + 0.5 * dx, 0, 1), np.clip(0.5 + 0.5 * dy, 0, 1), np.clip(b, 0, 1)], -1)
    print(name, 'slopes cut off:', float((np.abs(dx) > 1).mean()), float((np.abs(dy) > 1).mean()))
    Image.fromarray((px * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, name), quality=93, subsampling=0)


def rope():
    c = wrap(load('rope-t1'))
    lum = c @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    # Under even light a furrow is dark and a crest pale: the height is the brightness in bands, the broad ones weighing most.
    h = 0.0
    for lo, hi, wgt in ((1.0, 4.0, 0.35), (4.0, 14.0, 0.8), (14.0, 50.0, 1.0), (50.0, 140.0, 0.6)):
        h = h + wgt * (blur(lum, lo) - blur(lum, hi))
    h = h / (4.0 * h.std())
    h = np.clip(0.5 + h, 0, 1)
    dx, dy = slopes(h, SLOPE)
    # The colour keeps its furrows but not the broad light and dark of the picture: the film lays its own.
    broad = blur(lum, 160.0)
    c = c * (broad.mean() / np.maximum(broad, 1e-3))[..., None]
    Image.fromarray((np.clip(c, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, 'rope.jpg'), quality=90, subsampling=0)
    save_data('rope-nh.jpg', dx, dy, h)
    print('rope', float(lum.mean()), float(h.mean()), float(np.abs(dx).mean()))


def melt():
    c = wrap(load('melt-t1'))
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    # Heat: black skin 0, a red edge a third, orange two thirds, yellow white 1.
    heat = np.clip(0.55 * smooth(0.25, 0.95, r) + 0.45 * smooth(0.12, 0.85, g), 0, 1)
    skin = 1.0 - smooth(0.12, 0.3, heat)
    lum = c @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    h = 0.0
    for lo, hi, wgt in ((1.0, 4.0, 0.4), (4.0, 14.0, 0.8), (14.0, 50.0, 1.0)):
        h = h + wgt * (blur(lum, lo) - blur(lum, hi))
    h = h / (4.0 * (h * skin).std() + 1e-6)
    # A plate stands over the melt by its own thickness, and its folds on top of that.
    cover = blur(skin, 3.0)
    hh = np.clip(cover * (0.55 + h), 0, 1)
    dx, dy = slopes(hh, SLOPE)
    Image.fromarray((np.clip(c, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, 'melt.jpg'), quality=90, subsampling=0)
    save_data('melt-nh.jpg', dx, dy, heat)
    print('melt', float(heat.mean()), float(skin.mean()))


if __name__ == '__main__':
    which = sys.argv[1:] or ['rope', 'melt']
    if 'rope' in which:
        rope()
    if 'melt' in which:
        melt()
