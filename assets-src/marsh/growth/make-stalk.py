# Makes the repeating bark of the stalks from the generated sheet.
# Run: python3 assets-src/marsh/growth/make-stalk.py
# Reads assets-src/marsh/growth/src/stalk-salt.png. Writes public/assets/marsh/growth/stalk.jpg (colour, sRGB) and stalk-nh.jpg
# (red and green: the lean of the surface along x and y, 0.5 is level; blue: the height).
# The height is the sheet's own lightness with its colour taken off: the salt lumps stand pale and proud, the flaked rust lies low.
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

SIZE = 1024
src = Image.open('assets-src/marsh/growth/src/stalk-salt.png').convert('RGB')
side = min(src.size)
left = (src.size[0] - side) // 2
top = (src.size[1] - side) // 2
a = np.asarray(src.crop((left, top, left + side, top + side)).resize((SIZE, SIZE), Image.LANCZOS), dtype=np.float32) / 255.0

def smooth(lo, hi, x):
    t = np.clip((x - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)

# One axis at a time: the middle stays, and toward the two edges the picture fades into a copy of itself moved by half its size.
BAND = 0.1
for axis in (1, 0):
    edge = np.minimum(np.arange(SIZE), SIZE - 1 - np.arange(SIZE)) / SIZE
    k = smooth(0, BAND, edge)
    k = k[None, :, None] if axis == 1 else k[:, None, None]
    a = a * k + np.roll(a, SIZE // 2, axis=axis) * (1 - k)

lum = a @ np.array([0.3, 0.5, 0.2], dtype=np.float32)
broad = gaussian_filter(lum, SIZE / 5, mode='wrap')
a = np.clip(a * (broad.mean() / broad)[..., None] ** 0.8, 0, 1)
lum = a @ np.array([0.3, 0.5, 0.2], dtype=np.float32)
sat = a.max(-1) - a.min(-1)

raw = lum - 0.9 * sat
height = gaussian_filter(raw, 1.0, mode='wrap')
lo, hi = np.percentile(height, [1, 99.7])
height = np.clip((height - lo) / (hi - lo), 0, 1)
soft = gaussian_filter(height, 0.7, mode='wrap')
dx = (np.roll(soft, -1, 1) - np.roll(soft, 1, 1)) * 0.5
dy = (np.roll(soft, -1, 0) - np.roll(soft, 1, 0)) * 0.5
STRENGTH = 7.0
nh = np.stack([np.clip(0.5 - dx * STRENGTH, 0, 1), np.clip(0.5 + dy * STRENGTH, 0, 1), height], axis=-1)

Image.fromarray((a * 255 + 0.5).astype(np.uint8)).save('public/assets/marsh/growth/stalk.jpg', quality=91, subsampling=0)
Image.fromarray((nh * 255 + 0.5).astype(np.uint8)).save('public/assets/marsh/growth/stalk-nh.jpg', quality=93, subsampling=0)
lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
print('stalk linear mean', [round(float(v), 3) for v in lin.reshape(-1, 3).mean(0)], 'height mean', round(float(height.mean()), 3), 'p50', round(float(np.percentile(height, 50)), 3), 'p90', round(float(np.percentile(height, 90)), 3))
