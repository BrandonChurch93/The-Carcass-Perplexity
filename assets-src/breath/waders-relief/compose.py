# Puts the four baked animals into one picture for the film: public/assets/breath/waders/relief.jpg.
# Run from the repo, after sculpt.py for 0, 1, 2, 3: /home/user/bpyenv/bin/python assets-src/breath/waders-relief/compose.py out/work/bake public/assets/breath/waders/relief.jpg
# Red: how far the sculpt presses the skin out or in, 0.5 none, the whole range 12 mm for an animal of size 1.
# Green: how open each point is to the air, from the hiddenness Blender found on the sculpted shape and the fine furrows of the sculpt.
# Blue: old scars and lumps, where the skin is of another colour.
# Four tiles, two by two: 0 lower left, 1 lower right, 2 upper left, 3 upper right. Each tile is the animal seen square on from its right.
import bpy, sys, json, os
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from relief import press, marks, smooth

src, dst = sys.argv[-2], sys.argv[-1]

def exr(path):
    im = bpy.data.images.load(path)
    w, h = im.size
    a = np.empty(w * h * 4, dtype=np.float32)
    im.pixels.foreach_get(a)
    bpy.data.images.remove(im)
    return a.reshape(h, w, 4)

def blur(a, r):
    # A box of 2r+1 three times over: near enough a bell.
    for _ in range(3):
        c = np.cumsum(np.pad(a, ((r + 1, r), (0, 0)), mode='edge'), axis=0)
        a = (c[2 * r + 1:] - c[:-2 * r - 1]) / (2 * r + 1)
        c = np.cumsum(np.pad(a, ((0, 0), (r + 1, r)), mode='edge'), axis=1)
        a = (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
    return a

def spread(img, have, rounds=24):
    # What is at the animal's edge is carried outward, so that a read just off the animal finds skin and not nothing.
    img = img.copy()
    have = have.copy()
    for _ in range(rounds):
        acc = np.zeros_like(img)
        n = np.zeros(have.shape, dtype=np.float32)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            acc += np.roll(img * have[..., None], (dy, dx), axis=(0, 1))
            n += np.roll(have, (dy, dx), axis=(0, 1))
        fill = (have < 0.5) & (n > 0)
        img[fill] = acc[fill] / n[fill][:, None]
        have = np.where(fill, 1.0, have).astype(np.float32)
    # Beyond that nothing is read: one flat value, which costs the file nothing.
    img[have < 0.5] = (0.5, 0.88, 0.0)
    return img

tiles = []
views = []
for i in range(4):
    v = json.load(open(os.path.join(src, f'{i}-view.json')))
    a, b, o = exr(os.path.join(src, f'{i}-a.exr')), exr(os.path.join(src, f'{i}-b.exr')), exr(os.path.join(src, f'{i}-o.exr'))
    size, k = v['size'], v['k']
    have = (a[..., 3] > 0.5).astype(np.float32)
    px = (np.arange(size) + 0.5) / size * v['side']
    f = v['x0'] + px[None, :] + np.zeros((size, 1))
    u = v['y0'] + px[:, None] + np.zeros((1, size))
    leg, neck, cage = a[..., 0], a[..., 1], a[..., 2]
    rib, nf, nu = b[..., 0] * 100 - 50, b[..., 1] * 2 - 1, b[..., 2] * 2 - 1
    h = press(f, u, nf, nu, leg, neck, rib, cage, k, v['seed'], i, broad=False, leg_len=v['legLen'], neck_len=v['neckLen'])
    groove, lump = marks(f, u, k, v['seed'], i)
    trunk = (1 - smooth(0.0, 0.04, leg)) * (1 - smooth(0.0, 0.05, neck))
    red = np.clip(0.5 + h / (0.012 * k), 0, 1)
    # Fine furrows are darker than the skin beside them; what Blender found is the hiddenness of the larger forms.
    r = max(2, int(round(0.008 * k / v['side'] * size)))
    furrow = np.clip(1 + (h - blur(h * have, r) / np.maximum(blur(have, r), 1e-3)) / (0.0022 * k), 0.45, 1.12)
    air = np.clip(o[..., 0], 0, 1) ** 0.9
    green = np.clip(air * furrow * 0.88, 0, 1)
    blue = np.clip(np.maximum(groove, lump / (0.003 * k)) * trunk, 0, 1)
    img = spread(np.stack([red, green, blue], axis=-1).astype(np.float32), have)
    tiles.append(img)
    views.append({'x0': v['x0'] / k, 'y0': v['y0'] / k, 'side': v['side'] / k, 'k': k})
    print('compose:', i, 'covered', float(have.mean()))

size = tiles[0].shape[0]
sheet = np.zeros((2 * size, 2 * size, 3), dtype=np.float32)
for i, t in enumerate(tiles):
    col, row = i % 2, i // 2
    sheet[row * size:(row + 1) * size, col * size:(col + 1) * size] = t
# Rows in Blender run from the bottom; in the file from the top.
out = (np.flipud(sheet) * 255 + 0.5).astype(np.uint8)
Image.fromarray(out, 'RGB').save(dst, quality=int(os.environ.get('RELIEF_Q', '90')), subsampling=0)
json.dump(views, open(os.path.join(src, 'views.json'), 'w'))
print('compose: wrote', dst, json.dumps(views))
