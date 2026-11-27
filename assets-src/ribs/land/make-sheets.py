# Makes the land's own working pictures from the Builder's sheets under public/assets/ribs/mat. Python 3 with numpy, scipy and Pillow.
# Command: python3 assets-src/ribs/land/make-sheets.py
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates

MAT = 'public/assets/ribs/mat/'
OUT = 'public/assets/ribs/land/'


def slopes(h, strength, size, blur=1.0):
    """Slope x, slope y and height of a grey relief, as the tiles carry them (0.5 less the rise to the right, 0.5 less the rise downward, height)."""
    h = np.asarray(Image.fromarray((h * 255).astype(np.uint8)).resize(size, Image.LANCZOS), dtype=np.float32) / 255
    # The reliefs are an evenly lit clay model more than a height field: the slopes are taken from a blurred copy.
    s = gaussian_filter(h, blur)
    h = gaussian_filter(h, 0.5 * blur)
    gx = np.gradient(s, axis=1) * strength
    gy = np.gradient(s, axis=0) * strength
    out = np.stack([0.5 - gx, 0.5 - gy, h], axis=-1)
    return Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8))


def grey(name):
    return np.asarray(Image.open(MAT + name).convert('L'), dtype=np.float32) / 255


# The fin: each row of the blade sheet drawn out to the full width between its two edges, so that it can be laid on a blade by
# (part across, part along). Its relief has the round of the whole blade taken out: only flutes, ledges and pits are left.
cover = grey('blade-a.png')
colour = np.asarray(Image.open(MAT + 'blade.jpg').convert('RGB'), dtype=np.float32) / 255
relief = grey('blade-h.png')
H, W = cover.shape
rows = np.where(cover.max(axis=1) > 0.5)[0]
top, bottom = rows[0], rows[-1]
lo = np.zeros(H)
hi = np.zeros(H)
for y in range(top, bottom + 1):
    xs = np.where(cover[y] > 0.5)[0]
    lo[y], hi[y] = xs[0] + 2, xs[-1] - 2
# The tip is a few pixels wide: hold the width at eight pixels and smooth the edges along the blade.
mid = (lo + hi) / 2
half = np.maximum((hi - lo) / 2, 4)
mid[top:bottom + 1] = gaussian_filter(mid[top:bottom + 1], 3)
half[top:bottom + 1] = gaussian_filter(half[top:bottom + 1], 3)
FW, FH = 512, 1536
v = np.linspace(top + 1, bottom - 1, FH)
u = np.linspace(-0.97, 0.97, FW)
m = np.interp(v, np.arange(H), mid)
hw = np.interp(v, np.arange(H), half)
xx = m[:, None] + hw[:, None] * u[None, :]
yy = np.repeat(v[:, None], FW, axis=1)
fin = np.stack([map_coordinates(colour[..., c], [yy, xx], order=1, mode='nearest') for c in range(3)], axis=-1)
# The sheet came lit from one side: above the weed the broad light is taken out (the film's own sun lights the blade), the stains are kept.
lum = fin.mean(axis=-1)
broad = gaussian_filter(lum, (90, 110))
above = np.clip((0.8 - np.linspace(0, 1, FH)) / 0.06, 0, 1)[:, None]
gain = 1 + above * (np.clip(0.56 / np.maximum(broad, 0.05), 0.7, 1.8) - 1)
fin = fin * gain[..., None]
# The fin sheet is retired (the blades are drawn from land/tusk.jpg): it is worked out as before and no longer written.
fr = map_coordinates(relief, [yy, xx], order=1, mode='nearest')
fr = fr - gaussian_filter(fr, (60, 90)) + 0.5
fr = np.clip(0.5 + (fr - 0.5) * 2.2, 0, 1)
print('fin', top, bottom, 'weed line at', 'see picture')

# The plates: slope and height from the Builder's relief.
slopes(grey('plate-h.png'), 5.0, (1280, 720), 1.6).save(OUT + 'plate-nh.png')
slopes(grey('wall-h.png'), 5.0, (1024, 1024), 1.6).save(OUT + 'wall-nh.png')
slopes(grey('colony-h.png'), 5.0, (1024, 1024), 1.6).save(OUT + 'colony-nh.png')
# The bar under the wide lens: slope and height of the Builder's 12 m plate of stones.
slopes(grey('nearbar-h.png'), 6.0, (1024, 1024), 1.2).save(OUT + 'nearbar-nh.png')


def sheet(name, out, size, strength):
    """A thing photographed against nothing, drawn out to an upright sheet: each row stretched from its own outline to the full width."""
    cov = grey(name + '-a.png')
    col = np.asarray(Image.open(MAT + name + '.jpg').convert('RGB'), dtype=np.float32) / 255
    rel = grey(name + '-h.png')
    hh = cov.shape[0]
    rws = np.where((cov > 0.5).sum(axis=1) > 24)[0]
    t, b = rws[0], rws[-1]
    lo2 = np.zeros(hh)
    hi2 = np.zeros(hh)
    for yy2 in range(t, b + 1):
        xs2 = np.where(cov[yy2] > 0.5)[0]
        lo2[yy2], hi2[yy2] = xs2[0] + 3, xs2[-1] - 3
    md = (lo2 + hi2) / 2
    hf = np.maximum((hi2 - lo2) / 2, 12)
    md[t:b + 1] = gaussian_filter(md[t:b + 1], 40)
    hf[t:b + 1] = gaussian_filter(hf[t:b + 1], 40)
    sw, sh = size
    vv = np.linspace(t + 2, b - 2, sh)
    uu = np.linspace(-0.94, 0.94, sw)
    xx2 = np.interp(vv, np.arange(hh), md)[:, None] + np.interp(vv, np.arange(hh), hf)[:, None] * uu[None, :]
    yy3 = np.repeat(vv[:, None], sw, axis=1)
    c = np.stack([map_coordinates(col[..., k], [yy3, xx2], order=1, mode='nearest') for k in range(3)], axis=-1)
    Image.fromarray((np.clip(c, 0, 1) * 255 + 0.5).astype(np.uint8)).save(OUT + out + '.jpg', quality=90)
    r = map_coordinates(rel, [yy3, xx2], order=1, mode='nearest')
    r = r - gaussian_filter(r, (50, 70)) + 0.5
    r = np.clip(0.5 + (r - 0.5) * 2.0, 0, 1)
    slopes(r, strength, size, 2.0).save(OUT + out + '-nh.png')


# The two stacks of the gate, each from its own picture.
sheet('stack-a', 'stack-a', (768, 1536), 6.0)
sheet('stack-b', 'stack-b', (768, 1536), 6.0)
