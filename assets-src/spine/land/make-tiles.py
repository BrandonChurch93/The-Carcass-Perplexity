# Makes the land's tiling sheets from the generated pictures in gen/: the picture made to repeat (its edges faded into a copy shifted by half),
# and beside it <name>-nh.jpg (red and green: slope on x and y, 0.5 level; blue: height). Run: /home/user/bpyenv/bin/python assets-src/spine/land/make-tiles.py
import json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', '..', 'public', 'assets', 'spine', 'land')
os.makedirs(OUT, exist_ok=True)
# name, source, width out, normal strength, blur of the height in pixels
TILES = [('granite', 'granite-t1.jpg', 1536, 2.4, 1.2), ('snowpack', 'snow-t1.jpg', 1536, 3.0, 2.0), ('rimeface', 'rime-t1.jpg', 1024, 2.0, 1.2), ('outcrop', 'outcrop-t1.jpg', 1248, 2.2, 1.2)]

def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def wrap(img, band=0.14):
    h, w, _ = img.shape
    for axis, n in ((1, w), (0, h)):
        a = np.arange(n)
        edge = np.minimum(a, n - 1 - a) / n
        k = smooth(0, band, edge)
        k = k[None, :, None] if axis == 1 else k[:, None, None]
        img = img * k + np.roll(img, n // 2, axis=axis) * (1 - k)
    return img

def blur(a, r):
    if r <= 0: return a
    n = int(max(1, round(r * 3)))
    x = np.arange(-n, n + 1)
    g = np.exp(-x * x / (2 * r * r)); g /= g.sum()
    for axis in (0, 1):
        acc = np.zeros_like(a)
        for i, wgt in zip(x, g): acc += wgt * np.roll(a, i, axis=axis)
        a = acc
    return a

means = {}
for name, src, wide, strength, soft in TILES:
    im = Image.open(os.path.join(HERE, 'gen', src)).convert('RGB')
    tall = round(im.size[1] * wide / im.size[0] / 2) * 2
    im = im.resize((wide, tall), Image.LANCZOS)
    c = np.asarray(im).astype(np.float64) / 255
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    lin = wrap(lin)
    means[name] = [round(float(v), 4) for v in lin.reshape(-1, 3).mean(0)]
    out = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.clip(lin, 0, 1) ** (1 / 2.4) - 0.055)
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, name + '.jpg'), quality=91)
    lum = out @ np.array([0.3, 0.55, 0.15])
    # Height: the picture's own light and dark, with its broad tone taken out so a stain is not a hill.
    hgt = blur(lum, soft) - 0.7 * blur(lum, wide / 12)
    lo, hi = np.percentile(hgt, [1, 99])
    hgt = np.clip((hgt - lo) / (hi - lo), 0, 1)
    dx = (np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)) * 0.5 * strength * (wide / 256)
    dy = (np.roll(hgt, -1, 0) - np.roll(hgt, 1, 0)) * 0.5 * strength * (wide / 256)
    nh = np.stack([np.clip(0.5 + 0.5 * dx, 0, 1), np.clip(0.5 + 0.5 * dy, 0, 1), hgt], -1)
    Image.fromarray((nh * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, name + '-nh.jpg'), quality=93)
    print(name, wide, tall, means[name], 'slope std', float(dx.std()))
# (The mean colour of each sheet, for the constants of open.ts: printed, not written, since no page loads it.)
print(json.dumps(means))
