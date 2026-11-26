# The fronds made ready for cutting: a cover that follows their threads, and their colour bled outward under the cover.
# Two pictures: the full frond (frond) and the sparse ragged one (frond-b, whose own cover is read and whose root lump is left out).
# Run from the repository root: python3 assets-src/breath/plumes/make_frond.py
import numpy as np
from PIL import Image
from scipy import ndimage

for name in ('frond', 'frond-b'):
    picture = Image.open('public/assets/breath/mat/' + name + '.jpg').convert('RGB')
    if name == 'frond-b':
        box = (int(0.085 * picture.width), 0, picture.width, picture.height)
        given = Image.open('public/assets/breath/mat/frond-b-a.png').convert('L').crop(box).resize(picture.size, Image.LANCZOS)
        picture = picture.crop(box).resize(picture.size, Image.LANCZOS)
    rgb = np.asarray(picture).astype(np.float32) / 255
    bright = rgb.max(axis=2)
    if name == 'frond-b':
        thread = ndimage.gaussian_filter(np.asarray(given).astype(np.float32) / 255, 0.6)
    else:
        # The picture stands on black: a thread is where it is not dark, and inside the mass where it is brighter than what lies round it.
        near = ndimage.gaussian_filter(bright, 6)
        thread = np.clip((bright - 0.085) / 0.09, 0, 1) * np.clip((bright - 0.8 * near + 0.03) / 0.07, 0, 1)
        thread = ndimage.gaussian_filter(thread, 0.6)
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
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save('public/assets/breath/plumes/' + name + '.jpg', quality=90)
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
    Image.fromarray(data).save('public/assets/breath/plumes/' + name + '-a.png', optimize=True)
    print(name, 'threads cover', float((thread > 0.5).mean()), 'mean thick', float(thick[thread > 0.5].mean()))
