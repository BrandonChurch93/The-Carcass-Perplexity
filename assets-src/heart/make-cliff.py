# The wall's rock of the Heart: makes the generated picture of a massive basalt face tile both ways, and writes the colour picture and its data
# picture (red and green: the slope across and down, blue: the height, as make-materials.mjs writes them).
# The picture stays 3 wide to 2 tall at its own size: the shaders lay it at that shape.
# Run: python3 assets-src/heart/make-cliff.py
import numpy as np
from PIL import Image
from scipy.ndimage import uniform_filter

SRC = 'assets-src/heart/cliff-massive.png'
OUT = 'public/assets/heart/mat/'
BAND = 0.12
HEIGHT_BLUR = 0.05
HEIGHT_SPREAD = 0.2
NORMAL = 2.2 * 8

f = np.asarray(Image.open(SRC).convert('RGB'), np.float32)
h, w, _ = f.shape


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# One axis at a time: the middle stays, and toward the two edges the picture fades into a copy of itself shifted by half its size.
for axis, n in ((1, w), (0, h)):
    at = np.arange(n)
    k = smooth(0, BAND, np.minimum(at, n - 1 - at) / n)
    k = k[None, :, None] if axis == 1 else k[:, None, None]
    f = f * k + np.roll(f, n // 2, axis=axis) * (1 - k)

Image.fromarray(np.clip(f + 0.5, 0, 255).astype(np.uint8)).save(OUT + 'cliff.jpg', quality=92, subsampling=0)

lum = (0.2126 * f[..., 0] + 0.7152 * f[..., 1] + 0.0722 * f[..., 2]) / 255


def blur(a, r):
    for _ in range(3):
        a = uniform_filter(a, 2 * max(1, round(r)) + 1, mode='wrap')
    return a


height = blur(lum, 1.2) - blur(lum, HEIGHT_BLUR * h)
height = np.clip(0.5 + (height - height.mean()) / height.std() * HEIGHT_SPREAD, 0, 1)
dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * 0.5 * NORMAL
dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * 0.5 * NORMAL
packed = np.stack([127.5 - dx * 127.5, 127.5 - dy * 127.5, height * 255], axis=2)
Image.fromarray(np.clip(packed + 0.5, 0, 255).astype(np.uint8)).save(OUT + 'cliff-nh.png', optimize=True)
lin = (f / 255) ** 2.2
print('cliff', w, h, 'linear mean', lin.reshape(-1, 3).mean(0).round(3))
