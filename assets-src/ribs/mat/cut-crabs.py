#!/usr/bin/env python3
"""Takes the small scavengers off the back of the hung carcass in its relief picture.

Why: the carcass is drawn in the film as one picture pushed out by its relief (`src/places/ribs/drowned/index.ts`). The generated picture has five
small crabs standing on the animal's back. At the size the film shows them their thin legs cannot be drawn: each crab became a smooth pale lump, and
the gaps between its legs showed the plate's own shade as two black spots with a white rim, which a critic of round 22 read as eyes. Nothing living in
this film has eyes. The film has its own crabs (16 of them, drawn as bodies) on the weed and the hide.

What it does: inside a band along the back, everything that stands above the body as a thin shape (thinner than about 44 pixels) is set to black in
the relief, so the plate does not draw it. The colour picture is not touched: where the relief is black the plate is cut away.

Run from the repo root: python3 assets-src/ribs/mat/cut-crabs.py, then node assets-src/materials/make-materials.mjs ribs.
It is safe to run twice: the second run finds nothing left to cut.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = 'assets-src/ribs/mat/src/carcass-hung-h.png'
# The back of the animal in the picture (1448 by 1086), from the hook at the upper left down to the tail root.
BACK = [(505, 40), (640, 105), (700, 135), (760, 185), (790, 225), (840, 290), (900, 345), (960, 385)]
BAND = 12       # pixels below the back line that still belong to the band
THIN = 22       # radius of the opening: a shape narrower than twice this does not survive it
KEEP = 2        # pixels of the body's own ragged edge that stay
LEVEL = 11      # the plate is cut away under 0.045 of white, which is 11.5 of 255
# Two bodies sit so close on the back that the opening keeps them as part of it: centre and radius of each, cut above the back line.
LUMPS = [(749, 154, 20, 3), (836, 278, 10, 1)]

im = Image.open(SRC)
rgb = np.asarray(im.convert('RGB')).copy()
grey = rgb.mean(axis=2)
body = grey > LEVEL
yy, xx = np.mgrid[0:body.shape[0], 0:body.shape[1]]
disc = lambda r: (np.hypot(*np.mgrid[-r:r + 1, -r:r + 1]) <= r)
solid = ndimage.binary_opening(body, structure=disc(THIN))
keep = ndimage.binary_dilation(solid, structure=disc(KEEP))
xs = np.array([p[0] for p in BACK], dtype=float)
ys = np.array([p[1] for p in BACK], dtype=float)
line = np.interp(xx, xs, ys)
band = (xx >= xs[0]) & (xx <= xs[-1]) & (yy <= line + BAND)
cut = body & ~keep & band
for cx, cy, r, clear in LUMPS:
    cut |= body & (np.hypot(xx - cx, yy - cy) <= r) & (yy <= line - clear)
print(f'pixels cut: {int(cut.sum())} of {int(body.sum())} in the body')
if cut.sum() == 0:
    sys.exit(0)
rgb[cut] = 0
Image.fromarray(rgb).save(SRC, optimize=True)
print(f'wrote {SRC}')
