# The fine structure of the storm sky: the picture's brightness over its own local mean, as one grey picture.
# 128 is no change, 255 is twice the mean. Run from the repo's root: python3 assets-src/ribs/air/fine.py
import numpy as np
from PIL import Image, ImageFilter
src = Image.open('assets-src/ribs/air/src/storm-1.png').convert('L')
wide = src.filter(ImageFilter.GaussianBlur(14))
a = np.asarray(src, dtype=np.float32)
b = np.asarray(wide, dtype=np.float32)
fine = np.clip(128.0 * (a + 2.0) / (b + 2.0), 0, 255).astype(np.uint8)
Image.fromarray(fine, 'L').save('public/assets/ribs/air/storm-fine.jpg', quality=90)
