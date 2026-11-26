# The storm sky as it is loaded: the source picture with the grain of its dark bases smoothed (0.9 px where the cloud is
# dark, none where it is lit) and its thin lit rims held to 1.15 times their own surroundings (5 px): magnified six times
# on the dome they read as drawn lines. Enlarged twice with Lanczos and no sharpening.
# Run from the repo's root: python3 assets-src/ribs/air/sheet.py
import numpy as np
from PIL import Image, ImageFilter
src = Image.open('assets-src/ribs/air/src/storm-1.png').convert('RGB')
grey = src.convert('L')
soft = np.asarray(src.filter(ImageFilter.GaussianBlur(0.9)), dtype=np.float32)
wide = np.asarray(grey.filter(ImageFilter.GaussianBlur(4)), dtype=np.float32)
dark = np.clip(1.0 - (wide - 60.0) / 60.0, 0.0, 1.0)[..., None]
a = np.asarray(src, dtype=np.float32)
a = a + (soft - a) * dark
round5 = np.asarray(grey.filter(ImageFilter.GaussianBlur(5)), dtype=np.float32)
hold = np.minimum(1.0, 1.15 * (round5 + 4.0) / (np.asarray(grey, dtype=np.float32) + 4.0))
hold = np.asarray(Image.fromarray((hold * 255.0).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(0.7)), dtype=np.float32) / 255.0
out = Image.fromarray(np.clip(a * hold[..., None], 0, 255).astype(np.uint8), 'RGB')
out.resize((3072, 2048), Image.LANCZOS).save('public/assets/ribs/air/storm.jpg', quality=92, subsampling=0)
