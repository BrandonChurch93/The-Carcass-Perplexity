# The single frond made ready for cutting: a cover that follows its threads, and its colour bled outward under the cover.
# Run from the repository root: python3 assets-src/breath/plumes/make_frond.py
import numpy as np
from PIL import Image
from scipy import ndimage

rgb = np.asarray(Image.open('public/assets/breath/mat/frond.jpg').convert('RGB')).astype(np.float32) / 255
# The picture stands on black: a thread is where it is not dark, and inside the mass where it is brighter than what lies round it.
bright = rgb.max(axis=2)
near = ndimage.gaussian_filter(bright, 6)
thread = np.clip((bright - 0.085) / 0.09, 0, 1) * np.clip((bright - 0.8 * near + 0.03) / 0.07, 0, 1)
thread = ndimage.gaussian_filter(thread, 0.6)
saturation = (rgb.max(axis=2) - rgb.min(axis=2)) / np.maximum(rgb.max(axis=2), 0.01)
solid = ((thread > 0.6) & (bright > 0.12)).astype(np.float32)
colour = rgb * solid[..., None]
weight = solid.copy()
for radius in (1, 2, 4, 8, 16, 32):
    c = np.stack([ndimage.gaussian_filter(colour[..., i], radius) for i in range(3)], axis=2)
    w = ndimage.gaussian_filter(weight, radius)
    fill = c / np.maximum(w, 1e-4)[..., None]
    take = (weight < 0.5) & (w > 0.02)
    colour[take] = fill[take]
    weight[take] = 1
out = np.where((thread > 0.6)[..., None], rgb, colour)
Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save('public/assets/breath/plumes/frond.jpg', quality=90)
# Red: the distance to the edge of a thread (128 at the edge, 16 to a pixel). Green: how thick the growth is round here (the cover
# blurred wide), which is where the threads shade one another.
big = np.asarray(Image.fromarray((np.clip(thread, 0, 1) * 255).astype(np.uint8)).resize((thread.shape[1] * 3, thread.shape[0] * 3), Image.BICUBIC)).astype(np.float32) / 255
inside = big > 0.5
distance = (ndimage.distance_transform_edt(inside) - ndimage.distance_transform_edt(~inside)) / 3
distance = ndimage.zoom(distance, 1 / 3, order=1)[: thread.shape[0], : thread.shape[1]]
thick = ndimage.gaussian_filter((thread > 0.5).astype(np.float32), 14)
data = np.zeros(thread.shape + (3,), np.uint8)
data[..., 0] = np.clip(128 + 16 * distance, 0, 255)
data[..., 1] = np.clip(thick * 255, 0, 255)
Image.fromarray(data).save('public/assets/breath/plumes/frond-a.png', optimize=True)
print('threads cover', float((thread > 0.5).mean()), 'mean thick', float(thick[thread > 0.5].mean()))
