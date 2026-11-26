# The hide of the crust-walkers from the generated sheets: tiling colour, and slope with height (as make-materials.mjs has it).
# Run: /home/user/bpyenv/bin/python assets-src/heart/make-skins.py
import numpy as np
from PIL import Image

SRC = 'assets-src/heart/gen'
OUT = 'public/assets/heart/mat'
N = 1024

def sm(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def wrap_axis(f, axis, band=0.14):
    n = f.shape[axis]
    a = np.arange(n)
    w = sm(0, band, np.minimum(a, n - 1 - a) / n)
    shape = [1, 1, 1]
    shape[axis] = n
    w = w.reshape(shape)
    return f * w + np.roll(f, n // 2, axis=axis) * (1 - w)

def blur(a, r):
    r = max(1, int(round(r)))
    for _ in range(3):
        for axis in (0, 1):
            c = np.cumsum(np.concatenate([a.take(range(-r - 1, 0), axis=axis, mode='wrap'), a, a.take(range(0, r), axis=axis, mode='wrap')], axis=axis), axis=axis)
            n = a.shape[axis]
            hi = c.take(range(2 * r + 1, 2 * r + 1 + n), axis=axis)
            lo = c.take(range(0, n), axis=axis)
            a = (hi - lo) / (2 * r + 1)
    return a

def skin(name, box, strength):
    im = Image.open(f'{SRC}/{name}.jpg').convert('RGB').crop(box).resize((N, N), Image.LANCZOS)
    f = np.asarray(im).astype(np.float32)
    f = wrap_axis(wrap_axis(f, 1), 0)
    Image.fromarray(np.clip(np.round(f), 0, 255).astype(np.uint8)).save(f'{OUT}/{name}.jpg', quality=92, subsampling=0)
    lum = (0.2126 * f[..., 0] + 0.7152 * f[..., 1] + 0.0722 * f[..., 2]) / 255
    h = blur(lum, 1.2) - blur(lum, 0.05 * N)
    h = np.clip(0.5 + (h - h.mean()) / (h.std() or 1) * 0.2, 0, 1)
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * strength * 8
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * strength * 8
    packed = np.stack([127.5 - dx * 127.5, 127.5 - dy * 127.5, h * 255], axis=-1)
    Image.fromarray(np.clip(np.round(packed), 0, 255).astype(np.uint8)).save(f'{OUT}/{name}-nh.jpg', quality=92, subsampling=0)
    lin = np.power(f / 255, 2.2).reshape(-1, 3).mean(0)
    print(name, np.round(lin, 3), 'lum', round(float(lum.mean()), 3), 'sd', round(float(lum.std()), 3))

skin('limb', (256, 0, 1280, 1024), 2.2)
skin('torso', (365, 0, 1306, 941), 2.2)
