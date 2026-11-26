# Reads the Builder's feature sheets of the spires (public/assets/spine/mat/{tower,stump,horn}) and writes what the layout and the meshes
# need of them to src/places/spine/shared/sheets.ts: the outline of each (left and right edge, in pixels, on 256 rows from tip to foot) and
# its relief on a coarse grid. Run from the repository root: python3 assets-src/spine/shared/make-sheets.py (needs Pillow, numpy, scipy).
import base64
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROWS = 256
out = ['// Made by assets-src/spine/shared/make-sheets.py from the feature sheets under public/assets/spine/mat. Do not edit by hand.',
       'export interface SheetData {', '  name: string;', '  width: number;', '  height: number;', '  /** The pixel rows of the tip and of the foot. */',
       '  tip: number;', '  foot: number;', '  /** The outline on 256 rows from tip to foot, pixels from the left. */', '  left: number[];', '  right: number[];',
       '  /** The relief on a grid of cols by lines over the whole picture, a byte each, base64: 255 is nearest. */', '  cols: number;', '  lines: number;', '  relief: string;', '}', '',
       'export const SHEETS: SheetData[] = [']
for name in ['tower', 'stump', 'horn']:
    c = np.asarray(Image.open(f'public/assets/spine/mat/{name}.jpg').convert('RGB')).astype(float) / 255
    h = np.asarray(Image.open(f'public/assets/spine/mat/{name}-h.png').convert('L')).astype(float) / 255
    try:
        cov = np.asarray(Image.open(f'public/assets/spine/mat/{name}-a.png').convert('L')).astype(float) / 255 > 0.5
    except FileNotFoundError:
        cov = (c.max(axis=2) > 0.07) | (h > 0.08)
    cov = ndi.binary_opening(cov, iterations=2)
    lab, n = ndi.label(cov)
    if n > 1:
        cov = lab == (1 + int(np.argmax(ndi.sum(cov, lab, range(1, n + 1)))))
    H, W = cov.shape
    rows = np.where(cov.any(axis=1))[0]
    tip, foot = int(rows.min()), int(rows.max())
    left, right = [], []
    for i in range(ROWS):
        r = tip + (foot - tip) * i / (ROWS - 1)
        r0, r1 = int(np.floor(r)), min(foot, int(np.floor(r)) + max(1, (foot - tip) // ROWS))
        xs = np.where(cov[r0:r1 + 1].any(axis=0))[0]
        left.append(int(xs.min()))
        right.append(int(xs.max()))
    # The relief: holes in the cover filled with the nearest value, so the edge of the mesh does not fall away.
    idx = ndi.distance_transform_edt(~cov, return_distances=False, return_indices=True)
    filled = h[idx[0], idx[1]]
    cols, lines = (192, 128) if W > H else (128, 192)
    # The meshes take the broad form only (the picture's small folds are shading more than height): blurred over some pixels first.
    filled = ndi.gaussian_filter(filled, 0.012 * max(W, H))
    small = np.asarray(Image.fromarray((filled * 255).astype(np.uint8)).resize((cols, lines), Image.LANCZOS))
    b64 = base64.b64encode(small.tobytes()).decode()
    out.append(f"  {{ name: '{name}', width: {W}, height: {H}, tip: {tip}, foot: {foot}, left: {left}, right: {right}, cols: {cols}, lines: {lines}, relief: '{b64}' }},")
out.append('];')
out.append('')
open('src/places/spine/shared/sheets.ts', 'w').write('\n'.join(out))
