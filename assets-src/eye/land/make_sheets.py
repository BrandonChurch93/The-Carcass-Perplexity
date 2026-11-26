# The detail sheets of the Eye's stone, from the generated pictures under assets-src/eye/land/gen/: each is cut square, made to tile
# (blended with itself shifted half way, first across and then down, keeping its contrast), and given a relief read from its tone.
#   <name>.jpg      colour
#   <name>-nh.jpg   r, g: the lean of the relief; b: its height
# Run: python3 assets-src/eye/land/make_sheets.py
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

SIZE = 1024


def tile_axis(a, axis):
    n = a.shape[axis]
    b = np.roll(a, n // 2, axis=axis)
    x = np.arange(n) / n
    edge = np.minimum(x, 1 - x) * 2
    w = np.clip((edge - 0.08) / 0.5, 0, 1)
    w = w * w * (3 - 2 * w)
    shape = [1, 1, 1]
    shape[axis] = n
    w = w.reshape(shape)
    mean = a.mean(axis=(0, 1), keepdims=True)
    return mean + (w * (a - mean) + (1 - w) * (b - mean)) / np.sqrt(w * w + (1 - w) * (1 - w))


def make(src, name, relief, flatten):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    s = min(w, h)
    im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((SIZE, SIZE), Image.LANCZOS)
    a = np.asarray(im).astype(np.float64) / 255
    # The broad light and dark of the picture is taken out, so that a repeat cannot be found by its patches.
    low = np.stack([gaussian_filter(a[..., c], 90, mode='wrap') for c in range(3)], -1)
    a = a - flatten * (low - low.mean(axis=(0, 1), keepdims=True))
    a = tile_axis(tile_axis(a, 1), 0)
    a = np.clip(a, 0, 1)
    Image.fromarray((a * 255 + 0.5).astype(np.uint8)).save(f'public/assets/eye/land/{name}.jpg', quality=90)
    g = a @ np.array([0.3, 0.5, 0.2])
    hgt = g - gaussian_filter(g, 14, mode='wrap')
    hgt = gaussian_filter(hgt, 0.7, mode='wrap')
    hn = np.clip(0.5 + hgt / (6 * hgt.std()), 0, 1)
    dx = np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)
    dy = np.roll(hgt, -1, 0) - np.roll(hgt, 1, 0)
    # The lean is scaled so that its mean size is `relief`, whatever the contrast of the picture.
    k = relief / np.abs(dx).mean()
    dx, dy = dx * k, dy * k
    out = np.stack([np.clip(0.5 - dx, 0, 1), np.clip(0.5 + dy, 0, 1), hn], -1)
    Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(f'public/assets/eye/land/{name}-nh.jpg', quality=92)
    print(name, 'mean', a.mean(axis=(0, 1)), 'lean', float(np.abs(dx).mean()))


if __name__ == '__main__':
    which = sys.argv[1:] or ['rockface', 'gravel']
    if 'rockface' in which:
        make('assets-src/eye/land/gen/rockface-1.jpg', 'rockface', 0.09, 0.8)
    if 'gravel' in which:
        make('assets-src/eye/land/gen/gravel-1.jpg', 'gravel', 0.11, 0.8)
