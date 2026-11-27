import sys, os, io, json, subprocess
import numpy as np
from PIL import Image
import cv2
sys.path.insert(0, 'assets-src/reveal/land')
import make_country as mc
RECT = (1950.0, 1022.0, 3486.0, 2046.0)
rect = mc.LEVELS['a']
def cut(name, mode):
    im = mc.original(name).convert(mode)
    px = im.width / rect['width']
    x0 = rect['cx'] - rect['width'] / 2
    y0 = rect['cy'] - rect['width'] * 9 / 32
    box = ((RECT[0] - x0) * px, (RECT[1] - y0) * px, (RECT[2] - x0) * px, (RECT[3] - y0) * px)
    return np.asarray(im.resize((1536, 1024), Image.LANCZOS, box=box), dtype=np.float32)
o_rgb = cut('map-a.jpg', 'RGB')
o_h = cut('map-a-h.png', 'L')
t_rgb = np.asarray(Image.open('assets-src/reveal/land/chest/chest-take3.jpg').convert('RGB'), dtype=np.float32)
t_h = np.asarray(Image.open('assets-src/reveal/land/chest/chest-take3-h.png').convert('L'), dtype=np.float32)
print('h means', o_h.mean(), t_h.mean(), o_h.std(), t_h.std())
yy, xx = np.mgrid[0:1024, 0:1536].astype(np.float32)
rng = np.random.RandomState(7)
n = cv2.GaussianBlur(rng.rand(1024, 1536).astype(np.float32), (0, 0), 40)
n = (n - n.mean()) / n.std()
# The first map's ranges on the west (where the chest's ranges leave the valley), take 3 on the east; the seam wanders.
edge = 0.6 * 1536 + 45.0 * n
m = np.clip((edge + 70.0 - xx) / 140.0, 0.0, 1.0)
m = m * m * (3 - 2 * m)
rgb = o_rgb * m[..., None] + t_rgb * (1 - m[..., None])
h = o_h * m + t_h * (1 - m)
Image.fromarray(np.round(rgb).astype(np.uint8)).save('assets-src/reveal/land/chest/chest.jpg', quality=92)
Image.fromarray(np.round(h).astype(np.uint8), 'L').save('assets-src/reveal/land/chest/chest-h.png', optimize=True)
