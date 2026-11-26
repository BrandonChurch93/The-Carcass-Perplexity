# The hide sheet of the drinkers: a square of the generated picture made to repeat, its colour, and its relief taken from its own light and dark.
# Run from the repo root: python assets-src/eye/drinker/build_hide.py
import numpy as np
from PIL import Image
from scipy import ndimage

src = np.asarray(Image.open('assets-src/eye/drinker/hide-take1.png').convert('RGB')).astype(np.float32) / 255
N = 1024
a = src[:N, 200:200 + N]
# The broad shading of the photograph is taken out, so no tile shows as a tile.
low = ndimage.gaussian_filter(a, (90, 90, 0), mode='reflect')
a = a - low + low.mean(axis=(0, 1))
# It repeats: the picture and itself moved by half, each strongest where the other has its seam.
u = np.abs(np.linspace(-1, 1, N, endpoint=False))
w = np.clip((np.maximum(u[:, None], u[None, :]) - 0.45) / 0.4, 0, 1)
w = (w * w * (3 - 2 * w))[..., None]
b = np.roll(a, (N // 2, N // 2), axis=(0, 1))
mean = a.mean(axis=(0, 1))
out = mean + ((a - mean) * (1 - w) + (b - mean) * w) / np.sqrt((1 - w) ** 2 + w ** 2)
out = np.clip(out, 0, 1)
Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save('public/assets/eye/drinker/hide.jpg', quality=90)
# The relief: creases are dark in an evenly lit picture of skin.
lum = out @ np.array([0.3, 0.5, 0.2], dtype=np.float32)
pad = np.pad(lum, N // 4, mode='wrap')
high = (pad - ndimage.gaussian_filter(pad, 10))[N // 4:-N // 4, N // 4:-N // 4]
h = np.clip(0.5 + high / (6 * high.std()), 0, 1)
Image.fromarray((h * 255 + 0.5).astype(np.uint8)).save('public/assets/eye/drinker/hide-h.png', optimize=True)
t = np.tile((out * 255).astype(np.uint8), (2, 2, 1))
Image.fromarray(t).resize((1024, 1024)).save('out/work/body/hide-tiled.jpg')
