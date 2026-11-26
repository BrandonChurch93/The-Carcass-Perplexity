# The plume picture made ready for cutting: a cover that follows the threads themselves, and the colour bled outward under it.
# Run from the repository root: python3 assets-src/breath/plumes/make_spray.py
import numpy as np
from PIL import Image
from scipy import ndimage

rgb = np.asarray(Image.open('public/assets/breath/mat/plume.jpg').convert('RGB')).astype(np.float32) / 255
cover = np.asarray(Image.open('public/assets/breath/mat/plume-a.png').convert('L')).astype(np.float32) / 255
# The picture stands on black: a thread is where it is not dark. The given cover closes the gaps between threads; this one does not.
bright = rgb.max(axis=2)
near = ndimage.gaussian_filter(bright, 7)
# Inside the mass a thread is what is brighter than what lies round it: the dark between two threads is open.
thread = np.clip((bright - 0.07) / 0.1, 0, 1) * np.clip((bright - 0.92 * near + 0.02) / 0.07, 0, 1) * np.clip(cover * 2, 0, 1)
thread = ndimage.gaussian_filter(thread, 0.6)
# The colour under the cover, carried outward so that no dark fringe is read at a thread's edge.
saturation = (rgb.max(axis=2) - rgb.min(axis=2)) / np.maximum(rgb.max(axis=2), 0.01)
solid = ((thread > 0.6) & (saturation > 0.3)).astype(np.float32)
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
Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save('public/assets/breath/plumes/spray.jpg', quality=92)
Image.fromarray((np.clip(thread, 0, 1) * 255 + 0.5).astype(np.uint8)).save('public/assets/breath/plumes/spray-a.png', optimize=True)
print('threads cover', float((thread > 0.5).mean()))
