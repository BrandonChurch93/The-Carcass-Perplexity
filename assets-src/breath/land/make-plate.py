# Makes src/places/breath/land/plate.ts from the relief of the shelf plate (public/assets/breath/mat/shelfplate-h.png):
# the plate's height at 10 cm a cell, 8 bits, so that the ground everything stands on can be asked for without waiting for a picture.
# Run from the repository root: python3 assets-src/breath/land/make-plate.py
import base64
import numpy as np
from PIL import Image, ImageFilter

im = Image.open('public/assets/breath/mat/shelfplate-h.png').convert('L')
# The relief is a guess at form made from the picture's own light and dark: it reads as an evenly lit clay model more than as a height field.
# So it is blurred (the folds go, the plates stay), and the tops of the plates are pressed nearly level: a plate is flat, its edge and the gap are not.
im = im.filter(ImageFilter.GaussianBlur(5)).resize((480, 270), Image.LANCZOS)
f = np.asarray(im, dtype=np.float32) / 255
f = np.where(f > 0.5, 0.5 + (f - 0.5) * 0.3, f)
a = np.clip(np.round(f * 255), 0, 255).astype(np.uint8)
print('mean', a.mean() / 255, 'p5', np.percentile(a, 5) / 255, 'p50', np.percentile(a, 50) / 255, 'p95', np.percentile(a, 95) / 255)
text = base64.b64encode(a.tobytes()).decode('ascii')
lines = [text[i:i + 160] for i in range(0, len(text), 160)]
out = [
    '// The height of the shelf plate (public/assets/breath/mat/shelfplate-h.png) at 10 cm a cell, 8 bits, row by row from the top.',
    '// Made by assets-src/breath/land/make-plate.py: do not edit by hand.',
    'export const PLATE_WIDTH = 480;',
    'export const PLATE_HEIGHT = 270;',
    '/** Metres the plate is wide: 48 m, so 27 m deep. */',
    'export const PLATE_METRES = 48;',
    'export const PLATE_MEAN = %.4f;' % (a.mean() / 255),
    'export const PLATE_DATA =',
]
out += ["  '%s'%s" % (l, ' +' if i < len(lines) - 1 else ';') for i, l in enumerate(lines)]
open('src/places/breath/land/plate.ts', 'w').write('\n'.join(out) + '\n')
