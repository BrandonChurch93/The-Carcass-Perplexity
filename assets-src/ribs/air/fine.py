# The fine structure of the storm sky: the picture's brightness over its own local mean, as one grey picture.
# 128 is no change, 255 is twice the mean. The picture is smoothed a little first (its grain is not cloud), and round the
# break, where the local mean is bright, the map is flat: the break's lit edges, laid in small, read as veins in marble.
# Run from the repo's root: python3 assets-src/ribs/air/fine.py
import numpy as np
from PIL import Image, ImageFilter
src = Image.open('assets-src/ribs/air/src/storm-1.png').convert('L')
a = np.asarray(src.filter(ImageFilter.GaussianBlur(1.6)), dtype=np.float32)
b = np.asarray(src.filter(ImageFilter.GaussianBlur(14)), dtype=np.float32)
ratio = np.clip((a + 2.0) / (b + 2.0), 0.6, 1.5)
dark = np.clip(1.0 - (b - 55.0) / 60.0, 0.0, 1.0)
fine = np.clip(128.0 * (1.0 + 1.25 * dark * (ratio - 1.0)), 0, 255).astype(np.uint8)
Image.fromarray(fine, 'L').save('public/assets/ribs/air/storm-fine.jpg', quality=95)
