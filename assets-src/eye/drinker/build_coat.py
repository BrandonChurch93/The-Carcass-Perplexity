# The coat of the drinkers: the picture of the whole animal from the side (public/assets/eye/mat/drinker-up.jpg, the sheet the cards are cut from),
# its ground filled with the hide nearest to it, so that the body can wear it laid on from the side without a seam of black where the two outlines differ.
# It prints where the picture lies on the body as made (u and v from z and y), fitted outline to outline below the neck.
# Run from the repo root after build_body.py: python assets-src/eye/drinker/build_coat.py
import numpy as np
from PIL import Image
from scipy import ndimage

H = 0.0125
LO_Y, LO_Z = -0.04, -1.62
rgb = np.asarray(Image.open('public/assets/eye/mat/drinker-up.jpg').convert('RGB')).astype(np.float32) / 255
cover = np.asarray(Image.open('public/assets/eye/mat/drinker-up-h.png').convert('RGB'))[..., 0].astype(np.float32) / 255
inside = cover > 0.3
PH, PW = inside.shape
body = np.load('out/work/body/side.npy')[::2, ::2]
ys = LO_Y + 2 * H * np.arange(body.shape[0])
zs = LO_Z + 2 * H * np.arange(body.shape[1])
low = ys < 2.45
soft = ndimage.gaussian_filter(inside.astype(np.float32), 3)

def laid(metre_z, metre_y, z0, y0):
    # The picture's animal faces the left: z runs against u. Its feet stand at y0 from the top.
    px = z0 - zs / metre_z
    py = y0 - ys / metre_y
    return ndimage.map_coordinates(soft, np.meshgrid(py, px, indexing='ij'), order=1, mode='constant') > 0.5

best = (-1.0, None)
for metre_z in np.linspace(0.0030, 0.0045, 11):
    for metre_y in np.linspace(0.0028, 0.0040, 9):
        for z0 in np.linspace(0.50, 0.66, 17) * PW:
            for y0 in np.linspace(0.88, 0.98, 11) * PH:
                m = laid(metre_z, metre_y, z0, y0)
                both = (m & body)[low].sum()
                either = (m | body)[low].sum()
                score = both / max(either, 1)
                if score > best[0]:
                    best = (score, (metre_z, metre_y, z0, y0))
score, (metre_z, metre_y, z0, y0) = best
print('overlap', round(float(score), 3), 'metres a pixel', metre_z, metre_y, 'z0', z0 / PW, 'y0', y0 / PH)
print('u = %.4f + %.4f * z;  v (from the foot of the picture up) = %.4f + %.4f * y' % (z0 / PW, -1 / (metre_z * PW), 1 - y0 / PH, 1 / (metre_y * PH)))
m = laid(metre_z, metre_y, z0, y0)
Image.fromarray(np.flipud(np.stack([m * 255, body * 255, body * 0], axis=-1).astype(np.uint8))).save('out/work/body/coat-fit.png')

# Outside the animal: the hide of the nearest point of it, blurred the more the further off.
core = ndimage.binary_erosion(cover > 0.16, iterations=5)
far, (iy, ix) = ndimage.distance_transform_edt(~core, return_indices=True)
filled = rgb[iy, ix]
blurred = ndimage.gaussian_filter(filled, (9, 9, 0))
w = np.clip(far / 24, 0, 1)[..., None]
out = filled * (1 - w) + blurred * w
Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save('public/assets/eye/drinker/coat.jpg', quality=92)
