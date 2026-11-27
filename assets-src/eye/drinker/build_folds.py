# The broad sheet of a drinker's hide: loose folds, scars, dirt, at about 2.2 m across the sheet. The generated picture is made to repeat
# (each edge is faded into the picture's own middle, shifted by half) and saved as a JPEG: the relief is read from its own tone in the shader.
# Run from the repo root: /home/user/pyenv/bin/python assets-src/eye/drinker/build_folds.py   (numpy, pillow)
import numpy as np
from PIL import Image

src = Image.open('assets-src/eye/drinker/hide-broad-take1.png').convert('RGB')
a = np.asarray(src).astype(np.float32) / 255.0
h, w, _ = a.shape
shifted = np.roll(np.roll(a, h // 2, axis=0), w // 2, axis=1)
def ramp(n):
    t = np.abs(np.linspace(-1, 1, n))
    t = np.clip((1 - t) / 0.3, 0, 1)
    return t * t * (3 - 2 * t)
mask = np.minimum(ramp(h)[:, None], ramp(w)[None, :])[..., None]
out = mask * a + (1 - mask) * shifted
lin = np.where(out <= 0.04045, out / 12.92, ((out + 0.055) / 1.055) ** 2.4)
print('mean, linear:', [round(float(x), 4) for x in lin.reshape(-1, 3).mean(axis=0)])
Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save('public/assets/eye/drinker/folds.jpg', quality=90)

# The slope of the folds, baked: the sheet's tone taken as height (pale stands proud, dark lies in), smoothed, its broad drift (the dirt) taken
# off, and its slope along the sheet's two axes written to red and green, 0.5 for level. The shader reads the slope and never takes one across
# the screen.
from scipy.ndimage import gaussian_filter
luma = lin @ np.array([0.3, 0.5, 0.2], dtype=np.float32)
form = luma / luma.mean()
small = np.asarray(Image.fromarray(form).resize((724, 543), Image.LANCZOS))
relief = gaussian_filter(small, 1.6, mode='wrap') - 0.7 * gaussian_filter(small, 24, mode='wrap')
gx = (np.roll(relief, -1, axis=1) - np.roll(relief, 1, axis=1)) / 2
gy = (np.roll(relief, -1, axis=0) - np.roll(relief, 1, axis=0)) / 2
K = 6.0
print('slope a texel: 99th', float(np.percentile(np.abs(gx), 99)), float(np.percentile(np.abs(gy), 99)), 'clipped', float((np.abs(gx) * K > 0.5).mean()))
rg = np.stack([0.5 + K * gx, 0.5 + K * gy, np.full_like(gx, 0.5)], axis=-1)
Image.fromarray((np.clip(rg, 0, 1) * 255 + 0.5).astype(np.uint8)).save('public/assets/eye/drinker/folds-n.png', optimize=True)
