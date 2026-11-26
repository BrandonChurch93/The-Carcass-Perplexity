# The form of the dead wader, made from the working picture of it (public/assets/breath/mat/carcass.jpg and carcass-h.png).
# Out, both the size of the picture halved:
#   public/assets/breath/dead/carcass-lift.png
#     r: how high the skin stands off the rock, 0 to 0.5 m (carried on past the outline)   g: the cover   b: how open to the sky
#   public/assets/breath/dead/carcass-slope.png
#     r, g: the slope of the skin across and down the picture, metres a metre, -3 to 3
# The height is not the relief of the picture (that is a lit clay model, not a depth): the limbs are the picture's outline blown up
# (what is wide is high), the trunk is a slope from the belly up to the arch of the ribs, with a little of the picture's relief on top.
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
# Limbs and neck: round, as high as they are wide, and no higher than a limb is.
lift = np.minimum(1.15 * d, 0.07 + 0.25 * d)
# The trunk: where the outline is wider than a limb. Its skin hangs from the arch of the ribs along the back (the picture's upper edge
# of it) down to the rock at the belly (its lower edge): a slope that faces whoever stands on the side of the legs.
thick = nd.gaussian_filter(np.clip((nd.maximum_filter(d, size=61) - 0.11) / 0.08, 0, 1), 10)
trunk = (thick > 0.5) & cover
rows = np.arange(H, dtype=np.float32)[:, None] * np.ones((1, W), dtype=np.float32)
low = np.where(trunk, rows, -1).max(axis=0)
top = np.where(trunk, rows, 1e6).min(axis=0)
have = low >= 0
fill_low = np.interp(np.arange(W), np.flatnonzero(have), low[have])
fill_top = np.interp(np.arange(W), np.flatnonzero(have), top[have])
low = nd.gaussian_filter1d(fill_low, 30)
top = nd.gaussian_filter1d(fill_top, 30)
span = np.maximum(low - top, 1.0)
t = np.clip((low[None, :] - rows) / span[None, :], 0, 1)
# How high the ribs hold it: most at the chest, less toward the hips and where the trunk is narrow.
arch = np.clip(span * per / 0.85, 0.3, 1.0) * 0.46
ramp = arch[None, :] * np.power(t, 0.85)
lift = lift * (1 - thick) + thick * np.maximum(ramp, np.minimum(lift, 0.05))
lift += cover * 0.03 * (nd.gaussian_filter(h, 3.0) - nd.gaussian_filter(h, 24.0)) * 4.0
# The mop lies flat: its strands are a finger thick whatever the width of the fan.
cols = np.arange(W, dtype=np.float32)[None, :] / W
lift = np.minimum(lift, 0.012 + 3.0 * np.clip((cols - 0.2) / 0.1, 0, 1))
lift = np.clip(lift, 0.012, 0.5)
# Beyond the outline the form goes on as it was at the outline: the sheet is cut there by the cover, it does not fall to the rock.
near = nd.distance_transform_edt(~cover, return_distances=False, return_indices=True)
lift = lift[near[0], near[1]]
lift = nd.gaussian_filter(lift, 2.5)
# The slopes the light reads: those of the form, and on them the folds and the ribs of the picture's relief, as if 2 cm deep.
fine = lift + 0.02 * (nd.gaussian_filter(h, 1.0) - nd.gaussian_filter(h, 10.0)) * 3.0
fine = nd.gaussian_filter(fine, 1.0)
dt, ds = np.gradient(fine, per)
# How much of the sky a place sees: less in the folds (the relief is a lit model: its dark is hollow).
hollow = np.clip(0.5 + (nd.gaussian_filter(h, 1.5) - nd.gaussian_filter(h, 14.0)) * 3.0, 0, 1)
soft = np.clip(nd.gaussian_filter(cover.astype(np.float32), 1.5) * 2.0 - 0.5, 0, 1)


def half(a):
    return a[: H // 2 * 2, : W // 2 * 2].reshape(H // 2, 2, W // 2, 2).mean(axis=(1, 3))


out = np.zeros((H // 2, W // 2, 3), dtype=np.uint8)
out[..., 0] = np.round(np.clip(half(lift) / 0.5, 0, 1) * 255)
out[..., 1] = np.round(half(soft) * 255)
out[..., 2] = np.round(half(hollow) * 255)
Image.fromarray(out).save('public/assets/breath/dead/carcass-lift.png', optimize=True)
out2 = np.zeros((H // 2, W // 2, 3), dtype=np.uint8)
out2[..., 0] = np.round(np.clip(half(ds) / 3.0 * 0.5 + 0.5, 0, 1) * 255)
out2[..., 1] = np.round(np.clip(half(dt) / 3.0 * 0.5 + 0.5, 0, 1) * 255)
out2[..., 2] = 128
Image.fromarray(out2).save('public/assets/breath/dead/carcass-slope.png', optimize=True)
print('lift max', float(lift.max()), 'cover', float(cover.mean()), 'slope 95%', float(np.percentile(np.abs(ds[cover]), 95)), float(np.percentile(np.abs(dt[cover]), 95)))
Image.fromarray(out).save('out/work/carcass-lift-view.png')
