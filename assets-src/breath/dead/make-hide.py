# Makes the sheet of the dead one's hide from its generated picture.
# Run: python3 assets-src/breath/dead/make-hide.py   (numpy, pillow, scipy)
# Reads assets-src/breath/dead/src/deadhide.jpg. Writes public/assets/breath/dead/hide.jpg (colour, sRGB) and hide-h.png (height, one
# channel). The sheet is laid mirrored at each repeat, so its edges are left as they are.
import os
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
LUMA = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
src = Image.open(os.path.join(ROOT, 'assets-src', 'breath', 'dead', 'src', 'deadhide.jpg')).convert('RGB').resize((1536, 1024), Image.LANCZOS)
f = np.asarray(src).astype(np.float32)
lum = f @ LUMA
broad = gaussian_filter(lum, 300, mode='mirror')
f = f * (1 + 0.7 * (broad.mean() / np.maximum(broad, 1) - 1))[:, :, None]
out = os.path.join(ROOT, 'public', 'assets', 'breath', 'dead')
Image.fromarray(np.clip(f, 0, 255).astype(np.uint8)).save(os.path.join(out, 'hide.jpg'), quality=90)
lum = (f @ LUMA) / 255
# Height: the crest of a fold is pale and a crease is dark. The bristles and the specks are colour, not relief.
hgt = 0.4 * gaussian_filter(lum, 2.5, mode='mirror') + 0.6 * gaussian_filter(lum, 8, mode='mirror') - gaussian_filter(lum, 150, mode='mirror')
hgt = np.clip(0.5 + (hgt - hgt.mean()) / hgt.std() * 0.2, 0, 1)
Image.fromarray((hgt * 255).astype(np.uint8)).save(os.path.join(out, 'hide-h.png'), optimize=True)
mean = ((np.clip(f, 0, 255) / 255) ** 2.2).reshape(-1, 3).mean(axis=0)
print('hide mean', [round(float(v), 3) for v in mean])
