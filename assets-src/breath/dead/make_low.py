# The form of the dead wader as the lens at the rim sees it, made from the working picture of it from that lens
# (public/assets/breath/mat/carcass-low.jpg and carcass-low-h.png: seen from about 21 degrees over the rock, 4.5 m long).
# Out, both the size of the picture halved:
#   public/assets/breath/dead/carcass-low-lift.png
#     r: how high the skin stands off the rock, 0 to 0.5 m (carried on past the outline)
#     g: the cover of the body (not of the fan of tendrils: those are cut by the picture's own relief)
#     b: how open a place is to the sky
#   public/assets/breath/dead/carcass-low-slope.png
#     r, g: the slope of that height across the picture and up it, metres a metre of picture, -3 to 3
# The height is a guess from the outline, not the picture's relief (a lit model, not a depth): a limb is as high as it is wide, the
# trunk rises from where it meets the rock to the arch of the ribs. The place then puts every pixel on its own ray from the lens at that
# height, so from the lens the picture is whole whatever the guess, and from elsewhere it lies on the rock and does not stand on it.
# Run: python3 assets-src/breath/dead/make_low.py
import numpy as np
from PIL import Image
from scipy import ndimage as nd

h = np.asarray(Image.open('public/assets/breath/mat/carcass-low-h.png').convert('L'), dtype=np.float32) / 255.0
H, W = h.shape
raw = nd.gaussian_filter(h, 1.2) > 0.045
xs = np.nonzero(raw.any(axis=0))[0]
per = 4.5 / float(xs.max() - xs.min())
cols = np.arange(W, dtype=np.float32)[None, :] / W
rows = np.arange(H, dtype=np.float32)[:, None] * np.ones((1, W), dtype=np.float32)
# The body: small holes in it are folds of skin, not rock. The fan of the tendrils (the picture's left end) keeps its gaps.
body = nd.binary_fill_holes(nd.binary_closing(nd.binary_opening(raw, iterations=1), iterations=3)) & (cols > 0.27)
cover = body | raw
d = nd.distance_transform_edt(cover) * per
lift = np.minimum(1.15 * d, 0.07 + 0.25 * d)
thick = nd.gaussian_filter(np.clip((nd.maximum_filter(d, size=61) - 0.11) / 0.08, 0, 1), 10)
trunk = (thick > 0.5) & cover
low = np.where(trunk, rows, -1).max(axis=0)
top = np.where(trunk, rows, 1e6).min(axis=0)
have = low >= 0
low = nd.gaussian_filter1d(np.interp(np.arange(W), np.flatnonzero(have), low[have]), 30)
top = nd.gaussian_filter1d(np.interp(np.arange(W), np.flatnonzero(have), top[have]), 30)
span = np.maximum(low - top, 1.0)
t = np.clip((low[None, :] - rows) / span[None, :], 0, 1)
arch = np.clip(span * per / 0.59, 0.3, 1.0) * 0.42
ramp = arch[None, :] * np.power(t, 0.85)
lift = lift * (1 - thick) + thick * np.maximum(ramp, np.minimum(lift, 0.05))
# The fan lies flat: its strands are a finger thick whatever the width of the fan.
lift = np.minimum(lift, 0.012 + 3.0 * np.clip((cols - 0.27) / 0.08, 0, 1))
lift = np.clip(lift, 0.012, 0.5)
near = nd.distance_transform_edt(~cover, return_distances=False, return_indices=True)
lift = nd.gaussian_filter(lift[near[0], near[1]], 4.0)
fine = nd.gaussian_filter(lift + 0.02 * (nd.gaussian_filter(h, 1.0) - nd.gaussian_filter(h, 10.0)) * 3.0, 1.0)
dt, ds = np.gradient(fine, per)
hollow = np.clip(0.5 + (nd.gaussian_filter(h, 1.5) - nd.gaussian_filter(h, 14.0)) * 3.0, 0, 1)
soft = np.clip(nd.gaussian_filter(body.astype(np.float32), 1.5) * 2.0 - 0.5, 0, 1)


def half(a):
    return a[: H // 2 * 2, : W // 2 * 2].reshape(H // 2, 2, W // 2, 2).mean(axis=(1, 3))


out = np.zeros((H // 2, W // 2, 3), dtype=np.uint8)
out[..., 0] = np.round(np.clip(half(lift) / 0.5, 0, 1) * 255)
out[..., 1] = np.round(half(soft) * 255)
out[..., 2] = np.round(half(hollow) * 255)
Image.fromarray(out).save('public/assets/breath/dead/carcass-low-lift.png', optimize=True)
out2 = np.zeros((H // 2, W // 2, 3), dtype=np.uint8)
out2[..., 0] = np.round(np.clip(half(ds) / 3.0 * 0.5 + 0.5, 0, 1) * 255)
out2[..., 1] = np.round(np.clip(half(-dt) / 3.0 * 0.5 + 0.5, 0, 1) * 255)
out2[..., 2] = 128
Image.fromarray(out2).save('public/assets/breath/dead/carcass-low-slope.png', optimize=True)
ys = np.nonzero(raw.any(axis=1))[0]
print('metres a pixel', per, 'sheet', W * per, H * per, 'animal rows', ys.min() / H, ys.max() / H, 'columns', xs.min() / W, xs.max() / W, 'lift max', float(lift.max()))
Image.fromarray(out).save('out/work/carcass-low-view.png')
