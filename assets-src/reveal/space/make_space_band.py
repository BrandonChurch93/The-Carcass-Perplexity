"""The band of the galaxy behind the stars: public/assets/reveal/sky/space-band.jpg and the table src/places/reveal/sky/space-band.ts.

From the generated picture space-band-source.jpg (recipe in RECIPE.md). The picture's own stars are taken out (a soft picture of a
star is a blob: the place draws its stars as points over the band), so what is left is the glow of the far crowd and the dust lanes
in front of it. The table is how thick that crowd stands, coarse: the place sets more of its faint stars where the band is bright
and fewer in the lanes, so the grain of stars follows the picture.

Run from the root of the repo: python3 assets-src/reveal/space/make_space_band.py
"""
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, median_filter

src = np.asarray(Image.open('assets-src/reveal/space/space-band-source.jpg').convert('RGB')).astype(np.float64) / 255
# The stretch of it the film sees: 1216 x 320 px about the middle line of the band, the warm core near a third of the way along.
X0, Y0, W, H = 265, 198, 1216, 320
part = src[Y0:Y0 + H, X0:X0 + W]
# The stars out: a median takes the points and keeps the edges of the lanes.
part = np.stack([median_filter(part[..., c], size=5) for c in range(3)], axis=-1)
part = gaussian_filter(part, (0.7, 0.7, 0))
# Black is black: the picture's floor comes off, and it falls to nothing before its own edges.
part = np.clip(part - 5 / 255, 0, 1)
ys = np.linspace(-1, 1, H)[:, None]
xs = np.linspace(0, 1, W)[None, :]
def ease(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)
window = ease((1 - np.abs(ys)) / 0.3) * ease(xs / 0.06) * ease((1 - xs) / 0.04)
part = part * window[..., None]
Image.fromarray((part * 255 + 0.5).astype(np.uint8)).save('public/assets/reveal/sky/space-band.jpg', quality=88)

# The table: 76 x 20 cells, a letter each, a for none and z for the thickest.
GW, GH = 76, 20
lum = part @ np.array([0.3, 0.5, 0.2])
cells = lum.reshape(GH, H // GH, GW, W // GW).mean(axis=(1, 3))
cells = cells / cells.max()
rows = [''.join(chr(97 + int(round(v * 25))) for v in row) for row in cells]
with open('src/places/reveal/sky/space-band.ts', 'w') as f:
    f.write('// How thick the far crowd of the galaxy stands, cell by cell of the picture sky/space-band.jpg: a is none, z the thickest.\n')
    f.write('// Written by assets-src/reveal/space/make_space_band.py. Do not edit by hand.\n')
    f.write('export const BAND_CELLS: readonly string[] = [\n')
    for row in rows:
        f.write("  '" + row + "',\n")
    f.write('];\n')
import os
print('public/assets/reveal/sky/space-band.jpg', os.path.getsize('public/assets/reveal/sky/space-band.jpg'))
