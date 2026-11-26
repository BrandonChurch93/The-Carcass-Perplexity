# The storm sky as it is loaded: the source picture with the grain of its dark bases smoothed (0.9 px where the cloud is
# dark, none where it is lit), enlarged twice with Lanczos and no sharpening. Run from the repo's root: python3 assets-src/ribs/air/sheet.py
import numpy as np
from PIL import Image, ImageFilter
src = Image.open('assets-src/ribs/air/src/storm-1.png').convert('RGB')
soft = np.asarray(src.filter(ImageFilter.GaussianBlur(0.9)), dtype=np.float32)
wide = np.asarray(src.convert('L').filter(ImageFilter.GaussianBlur(4)), dtype=np.float32)
dark = np.clip(1.0 - (wide - 60.0) / 60.0, 0.0, 1.0)[..., None]
a = np.asarray(src, dtype=np.float32)
out = Image.fromarray(np.clip(a + (soft - a) * dark, 0, 255).astype(np.uint8), 'RGB')
out.resize((3072, 2048), Image.LANCZOS).save('public/assets/ribs/air/storm.jpg', quality=92, subsampling=0)
