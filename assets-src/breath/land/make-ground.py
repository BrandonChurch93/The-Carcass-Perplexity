# Makes the two near-ground tiles of the Breath from their generated sheets: travertine crust and loose gravel.
# Run: /home/user/bpyenv/bin/python assets-src/breath/land/make-ground.py
# Reads assets-src/breath/land/src/<name>.jpg (the generated sheet, kept as a JPEG of quality 95). Writes public/assets/breath/land/<name>.jpg (colour, sRGB) and <name>-nh.png
# (red and green: slope on x and y, 0.5 level; blue: height), each 1024 px and repeating.
import os
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
N = 1024
BAND = 0.14


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def wrap_axis(f, axis):
    n = f.shape[0]
    a = np.arange(n)
    w = smooth(0, BAND, np.minimum(a, n - 1 - a) / n)
    w = w[None, :, None] if axis == 0 else w[:, None, None]
    return f * w + np.roll(f, n // 2, axis=1 if axis == 0 else 0) * (1 - w)


def blur_wrap(g, radius):
    # A Gaussian that goes round the edges, by its transform.
    n = g.shape[0]
    k = np.fft.fftfreq(n)
    kernel = np.exp(-2 * (np.pi * radius) ** 2 * (k[:, None] ** 2 + k[None, :] ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(g) * kernel)).astype(np.float32)


def make(name, spread, strength):
    src = Image.open(os.path.join(ROOT, 'assets-src', 'breath', 'land', 'src', name + '.jpg')).convert('RGB')
    w, h = src.size
    side = min(w, h)
    src = src.crop(((w - side) // 2, (h - side) // 2, (w - side) // 2 + side, (h - side) // 2 + side)).resize((N, N), Image.LANCZOS)
    f = np.asarray(src).astype(np.float32)
    # The sheet's own broad light and dark are taken out, so that a repeat does not show as a pattern of patches.
    lum = f @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    broad = blur_wrap(lum, N * 0.18)
    f = f * (1 + 0.75 * (broad.mean() / np.maximum(broad, 1) - 1))[:, :, None]
    f = wrap_axis(wrap_axis(f, 0), 1)
    out = os.path.join(ROOT, 'public', 'assets', 'breath', 'land')
    Image.fromarray(np.clip(f, 0, 255).astype(np.uint8)).save(os.path.join(out, name + '.jpg'), quality=90, subsampling=0)
    lum = (f @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)) / 255
    hgt = 0.65 * (blur_wrap(lum, 1.6) - blur_wrap(lum, N * 0.05)) + 0.35 * (blur_wrap(lum, 7) - blur_wrap(lum, N * 0.09))
    hgt = np.clip(0.5 + (hgt - hgt.mean()) / hgt.std() * spread, 0, 1)
    dx = (np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)) * 0.5 * strength * 8
    dy = (np.roll(hgt, -1, 0) - np.roll(hgt, 1, 0)) * 0.5 * strength * 8
    packed = np.stack([np.clip(127.5 - dx * 127.5, 0, 255), np.clip(127.5 - dy * 127.5, 0, 255), hgt * 255], axis=2).astype(np.uint8)
    Image.fromarray(packed).save(os.path.join(out, name + '-nh.png'), optimize=True)
    mean = ((np.clip(f, 0, 255) / 255) ** 2.2).reshape(-1, 3).mean(axis=0)
    print(name, 'mean', [round(float(v), 3) for v in mean])


make('crust', 0.2, 2.2)
make('gravel', 0.2, 2.2)
