# Makes the crust's slab sheet from two generated pictures under assets-src/heart/gen/: coil-t1 (the crust seen straight down)
# and coil-h1 (its height, drawn by the model from coil-t1, form for form).
# Run: python3 assets-src/heart/make-coil-sheet.py   (numpy, scipy, Pillow)
# coil-nh.jpg (JPEG, 4:4:4): r, g the slope of the height, b the height. One sheet for the relief and for the paint.
import os
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GEN = os.path.join(ROOT, 'assets-src', 'heart', 'gen')
OUT = os.path.join(ROOT, 'public', 'assets', 'heart', 'mat')
W, H = 2048, 1024
SLOPE = 5.0


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def load(name):
    im = Image.open(os.path.join(GEN, name + '.png')).convert('L').resize((W, H), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255.0


# The middle stays; toward two edges the picture fades into itself shifted by half its size, whose own middle is whole there.
def wrap(a, band=0.1):
    for axis in (0, 1):
        n = a.shape[axis]
        idx = np.arange(n)
        edge = np.minimum(idx, n - 1 - idx) / n
        w = smooth(0, band, edge)
        shape = [1, 1]
        shape[axis] = n
        w = w.reshape(shape)
        a = a * w + np.roll(a, n // 2, axis=axis) * (1 - w)
    return a


def blur(a, s):
    return gaussian_filter(a, s, mode='wrap')


h = load('coil-h1')
lum = load('coil-t1')
# The drawn height is clean: the photograph's own wrinkles (finer than five texels) are laid on it as a skin a fiftieth as tall.
fine = blur(lum, 0.7) - blur(lum, 5.0)
fine = fine / (fine.std() + 1e-6)
# The broad light and dark of the drawn height is not relief: the film stacks its slabs itself.
broad = blur(h, 150.0)
h = h - 0.7 * (broad - broad.mean())
lo, hi = np.percentile(h, 0.3), np.percentile(h, 99.7)
h = np.clip((h - lo) / (hi - lo), 0, 1)
h = np.clip(h + 0.014 * np.clip(fine, -2.5, 2.5), 0, 1)
h = wrap(h)
dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * SLOPE
dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * SLOPE
px = np.stack([np.clip(0.5 + 0.5 * dx, 0, 1), np.clip(0.5 + 0.5 * dy, 0, 1), h], -1)
print('slopes cut off:', float((np.abs(dx) > 1).mean()), float((np.abs(dy) > 1).mean()), 'mean height', float(h.mean()), 'std', float(h.std()))
Image.fromarray((px * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, 'coil-nh.jpg'), quality=93, subsampling=0)
