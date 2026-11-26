# Makes src/places/breath/land/wallplate.ts from the relief of the shaft wall plate (public/assets/breath/mat/shaftwall-h.png):
# two grids at 12.5 cm a cell, 8 bits each. `height` is the relief blurred (it is a guess at form that reads as a lit clay model: the folds
# go, the ribs and the alcoves under them stay). `open` is how much of the sky overhead each cell of the wall can see past the ribs above it,
# swept up the blurred relief as a height field: the top of a rib is open, the wall under a rib is shut.
# Run from the repository root: python3 assets-src/breath/land/make-wall.py
import base64
import sys
import numpy as np
from PIL import Image, ImageFilter

W, H = 480, 270
# Metres the relief stands for, white minus black, as the wall is built from it (land/wall.ts must use the same).
REACH = 7.0
CELL = 60.0 / W
im = Image.open('public/assets/breath/mat/shaftwall-h.png').convert('L')
im = im.filter(ImageFilter.GaussianBlur(4)).resize((W, H), Image.LANCZOS)
f = np.asarray(im, dtype=np.float32) / 255
h = f * REACH
# Sky seen from each cell: the steepest rise toward any cell above it shuts the sky off from the zenith down.
steep = np.zeros_like(h)
for k in range(1, 90):
    above = np.roll(h, k, axis=0)
    above[:k, :] = h[:k, :] * 0 + h[0:1, :]
    steep = np.maximum(steep, (above - h) / (k * CELL))
angle = np.arctan(np.maximum(steep, 0))
open_ = np.cos(angle) ** 2
open_img = Image.fromarray(np.clip(open_ * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
o = np.asarray(open_img, dtype=np.uint8)
a = np.clip(np.round(f * 255), 0, 255).astype(np.uint8)
print('height mean %.3f p5 %.3f p25 %.3f p50 %.3f p75 %.3f p95 %.3f' % ((a.mean() / 255,) + tuple(np.percentile(a, q) / 255 for q in (5, 25, 50, 75, 95))))
print('open mean %.3f p5 %.3f p50 %.3f p95 %.3f' % ((o.mean() / 255,) + tuple(np.percentile(o, q) / 255 for q in (5, 50, 95))))
if len(sys.argv) > 1:
    Image.fromarray(np.concatenate([a, o], axis=1)).save(sys.argv[1])

def block(name, data):
    text = base64.b64encode(data.tobytes()).decode('ascii')
    lines = [text[i:i + 160] for i in range(0, len(text), 160)]
    return ['export const %s =' % name] + ["  '%s'%s" % (l, ' +' if i < len(lines) - 1 else ';') for i, l in enumerate(lines)]

out = [
    '// The relief of the shaft wall plate (public/assets/breath/mat/shaftwall-h.png) at 12.5 cm a cell, 8 bits, row by row from the top:',
    '// its height, blurred, and how much of the sky overhead each cell sees past the ribs above it.',
    '// Made by assets-src/breath/land/make-wall.py: do not edit by hand.',
    'export const WALL_WIDTH = %d;' % W,
    'export const WALL_HEIGHT = %d;' % H,
    '/** Metres the plate is wide: 60 m, so 33.75 m tall. */',
    'export const WALL_METRES = 60;',
    '/** Metres from the black of the relief to its white. */',
    'export const WALL_REACH = %.1f;' % REACH,
]
out += block('WALL_RELIEF', a) + block('WALL_OPEN', o)
open('src/places/breath/land/wallplate.ts', 'w').write('\n'.join(out) + '\n')
