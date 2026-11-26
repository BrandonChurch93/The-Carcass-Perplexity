# Makes one repeating material tile of the Blood Marsh from a generated sheet.
# Run: python3 assets-src/marsh/mat/make-tile.py <name> [<width> <height>]
# Reads assets-src/marsh/mat/src/<name>.jpg. Writes public/assets/marsh/mat/<name>.jpg (colour, sRGB) and <name>-nh.jpg
# (red and green: the lean of the surface along x and y, 0.5 is level; blue: the height), and prints the tile's linear mean colour.
# The height is the picture's own lightness: in these sheets salt stands pale and proud and the damp lies dark and low.
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

name = sys.argv[1]
src = Image.open(f'assets-src/marsh/mat/src/{name}.jpg').convert('RGB')
w = int(sys.argv[2]) if len(sys.argv) > 2 else src.size[0]
h = int(sys.argv[3]) if len(sys.argv) > 3 else src.size[1]
left = (src.size[0] - w) // 2
top = (src.size[1] - h) // 2
a = np.asarray(src.crop((left, top, left + w, top + h)), dtype=np.float32) / 255.0

def smooth(lo, hi, x):
    t = np.clip((x - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)

# One axis at a time: the middle stays, and toward the two edges the picture fades into a copy of itself moved by half its size.
BAND = 0.12
for axis, n in ((1, w), (0, h)):
    edge = np.minimum(np.arange(n), n - 1 - np.arange(n)) / n
    k = smooth(0, BAND, edge)
    k = k[None, :, None] if axis == 1 else k[:, None, None]
    a = a * k + np.roll(a, n // 2, axis=axis) * (1 - k)

# Even out the broad light and dark of the sheet, so that the tile has no patch the eye can find again.
lum = a @ np.array([0.3, 0.5, 0.2], dtype=np.float32)
broad = gaussian_filter(lum, min(w, h) / 6, mode='wrap')
a = np.clip(a * (broad.mean() / broad)[..., None] ** 0.8, 0, 1)
lum = a @ np.array([0.3, 0.5, 0.2], dtype=np.float32)

height = gaussian_filter(lum, 1.2, mode='wrap')
lo, hi = np.percentile(height, [1, 99])
height = np.clip((height - lo) / (hi - lo), 0, 1)
soft = gaussian_filter(height, 0.8, mode='wrap')
dx = (np.roll(soft, -1, 1) - np.roll(soft, 1, 1)) * 0.5
dy = (np.roll(soft, -1, 0) - np.roll(soft, 1, 0)) * 0.5
# (Red and green hold the lean of the surface, which is against its slope; a loaded picture's rows run upward, so green keeps its sign.)
STRENGTH = 8.0
nh = np.stack([np.clip(0.5 - dx * STRENGTH, 0, 1), np.clip(0.5 + dy * STRENGTH, 0, 1), height], axis=-1)

Image.fromarray((a * 255 + 0.5).astype(np.uint8)).save(f'public/assets/marsh/mat/{name}.jpg', quality=92, subsampling=0)
Image.fromarray((nh * 255 + 0.5).astype(np.uint8)).save(f'public/assets/marsh/mat/{name}-nh.jpg', quality=93, subsampling=0)
lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
print(name, w, h, 'linear mean', [round(float(v), 3) for v in lin.reshape(-1, 3).mean(0)])
