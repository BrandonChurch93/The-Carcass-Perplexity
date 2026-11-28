# The height of the bed of broken basalt (make-aa.py) made into the sheet the ground reads: the grain of scoria laid on the height,
# the slopes taken from the finished height. Red and green: 0.5 - slope / 6 across and down the sheet (the sheet is 4 m); blue: height / 0.48 m.
# python3 assets-src/heart/make-aa-maps.py IN_DIR public/assets/heart/mat/aa-nh.jpg
import sys

import numpy as np
from PIL import Image

src, out = sys.argv[-2], sys.argv[-1]
TILE = 4.0
h = np.load(src + "/aa-height.npy").astype(np.float64)[::-1]
tone = np.load(src + "/aa-tone.npy").astype(np.float64)[::-1]
n = h.shape[0]
fy = np.fft.fftfreq(n)[:, None]
fx = np.fft.fftfreq(n)[None, :]
f = np.sqrt(fx * fx + fy * fy)
rng = np.random.default_rng(5)


def grain(lo, hi):
    spec = np.fft.fft2(rng.normal(size=(n, n))) * np.exp(-((f / hi) ** 2)) * (1 - np.exp(-((f / lo) ** 2)))
    g = np.real(np.fft.ifft2(spec))
    return g / g.std()


# Pits of scoria, a finger and less across, deepest on the larger fragments; the fine bed keeps its own roughness.
pits = np.minimum(grain(0.02, 0.09), 0.0)
h = h + 0.006 * pits * (0.4 + 0.6 * tone) + 0.0015 * grain(0.08, 0.3)
# One texel of softening: a sheer side is a steep slope, not a step the sheet cannot hold.
h = np.real(np.fft.ifft2(np.fft.fft2(h) * np.exp(-2 * (np.pi * f * 0.8) ** 2)))
h -= h.min()
texel = TILE / n
dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / (2 * texel)
dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / (2 * texel)
r = np.clip(0.5 - dx / 6.0, 0, 1)
g = np.clip(0.5 - dy / 6.0, 0, 1)
b = np.clip(h / 0.48, 0, 1)
Image.fromarray((np.stack([r, g, b], 2) * 255 + 0.5).astype(np.uint8)).save(out, quality=90, subsampling=0)
print("height", h.min(), h.max(), "steep share", float((np.hypot(dx, dy) > 3).mean()))
