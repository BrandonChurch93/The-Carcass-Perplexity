# The form of the dead wader, made from the working picture of it (public/assets/breath/mat/carcass.jpg and carcass-h.png).
# Out: public/assets/breath/dead/carcass-lift.png, the size of the picture halved.
#   r, g: how high the skin stands off the rock, 0 to 0.6 m, sixteen bits (r the high byte)
#   b: the cover, feathered two pixels
# The height is not the relief of the picture (that is a lit clay model, not a depth): it is the picture's outline blown up like a
# bladder (what is wide is high, what is thin is low), tipped up along the back so the flank faces a low lens, with a little of the
# picture's relief, blurred, on top.
# Run: python3 assets-src/breath/dead/make_lift.py
import numpy as np
from PIL import Image
from scipy import ndimage as nd

METRES = 4.5
h = np.asarray(Image.open('public/assets/breath/mat/carcass-h.png').convert('L'), dtype=np.float32) / 255.0
H, W = h.shape
per = METRES / W
cover = nd.gaussian_filter(h, 1.2) > 0.045
cover = nd.binary_opening(cover, iterations=1)
# Small holes inside the animal are folds of skin, not rock.
cover = nd.binary_fill_holes(nd.binary_closing(cover, iterations=3))
d = nd.distance_transform_edt(cover) * per
lift = 0.5 * np.power(d, 0.62)
# The trunk: where the outline is wider than a limb. Tipped up from its lower edge (the belly, toward the legs) to its upper (the back).
thick = nd.gaussian_filter(np.clip((nd.maximum_filter(d, size=61) - 0.11) / 0.08, 0, 1), 14)
rows = np.arange(H, dtype=np.float32)[:, None] * np.ones((1, W), dtype=np.float32)
trunk = thick > 0.5
low = np.where(trunk, rows, -1).max(axis=0)
low = nd.gaussian_filter1d(np.where(low < 0, np.nan_to_num(low[low >= 0].mean()), low), 40)
up = np.clip((low[None, :] - rows) * per, 0, 1.0)
lift += thick * cover * np.minimum(up * 0.4, 0.2) * np.clip(d / 0.05, 0, 1)
lift += cover * 0.035 * (nd.gaussian_filter(h, 3.0) - nd.gaussian_filter(h, 24.0)) * 4.0
# The mop lies flat: its strands are a finger thick whatever the width of the fan.
cols = np.arange(W, dtype=np.float32)[None, :] / W
lift = np.minimum(lift, 0.012 + 0.3 * np.clip((cols - 0.2) / 0.06, 0, 1))
lift = nd.gaussian_filter(np.clip(lift, 0, 0.6), 1.5) * cover
feather = np.clip(nd.gaussian_filter(cover.astype(np.float32), 2.0) * 2.0 - 0.5, 0, 1)
def half(a):
    return a[: H // 2 * 2, : W // 2 * 2].reshape(H // 2, 2, W // 2, 2).mean(axis=(1, 3))


lift2 = half(lift)
out = np.zeros((H // 2, W // 2, 3), dtype=np.uint8)
q = np.round(lift2 / 0.6 * 65535).astype(np.uint32)
out[..., 0] = q >> 8
out[..., 1] = q & 255
out[..., 2] = np.round(half(feather) * 255)
Image.fromarray(out).save('public/assets/breath/dead/carcass-lift.png', optimize=True)
print('lift max', float(lift.max()), 'cover', float(cover.mean()))
Image.fromarray(np.round(np.clip(lift2 / 0.6, 0, 1) * 255).astype(np.uint8)).save('out/work/carcass-lift-view.png')
