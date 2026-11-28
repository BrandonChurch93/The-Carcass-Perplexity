#!/usr/bin/env python3
"""The bed of the lake of the Eye and of the two waters beside it, as a map of depth and silt (never a colour picture).

Read from the approved picture of the first key (references/approved/7-reveal/reveal-1-above-the-lake.jpg), whose window of the
master is in pullback.json, so the shore lies where the picture has it, by measure. Writes public/assets/reveal/land/lakebed.png,
the window of that key, 2048 x 1152:
  red    the signed distance to the shore, in the code of the land's shore pictures (shoreKm in land/index.ts): over 0.5 land
  green  how much silt stands in the water (0 clear deep water, 1 the densest of the shelf): the picture's amber measured, then
         drawn out into threads along the way the water turns (a line integral of noise along the picture's own grain)
  blue   pale bars of sediment: the delta the feeder has built at its mouth, a branching fan
Run: python3 assets-src/reveal/land/lake/make_lakebed.py   (numpy, scipy, Pillow)
"""
import json
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))
REF = os.path.join(ROOT, 'references', 'approved', '7-reveal')
OUT = os.path.join(ROOT, 'public', 'assets', 'reveal', 'land', 'lakebed.png')
W, H = 2048, 1152
window = json.load(open(os.path.join(REF, 'pullback.json')))['frames']['1']['window_in_master_px']
KM = 0.8566
TEXEL_KM = window['w'] * KM / W

src = Image.open(os.path.join(REF, 'reveal-1-above-the-lake.jpg')).convert('RGB')
im = np.asarray(src, dtype=np.float32) / 255.0
r, g, b = im[..., 0], im[..., 1], im[..., 2]
lum = 0.3 * r + 0.55 * g + 0.15 * b
sat = (im.max(-1) - im.min(-1)) / np.maximum(im.max(-1), 1e-3)
yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]]
# The lake's middle in this picture, px, and how far out its amber can reach.
far = np.hypot(xx - 810.0, (yy - 487.0) * 1.12)
navy = (b > 1.15 * r) & (lum < 0.16)
tint = (r - b > 0.09) & (sat > 0.36)
amber = ((far < 385) & (tint | ((lum < 0.2) & (sat > 0.22) & (r > b)))) | (tint & ndimage.binary_dilation(navy, iterations=22) & (far > 420))
near = ndimage.binary_dilation(navy, iterations=30) & (far > 420)
amber |= near & (r - b > 0.04) & (sat > 0.24) & (lum < 0.3)
# (Under the mist that blows off the north east wall the picture shows no water: there the shore is traced by hand along the wall's foot.)
patch = Image.new('L', src.size, 0)
ImageDraw.Draw(patch).polygon([(784, 182), (854, 180), (934, 190), (1014, 235), (1074, 300), (1109, 380), (1114, 470), (1104, 548), (1034, 540), (934, 250), (784, 215)], fill=255)
water = ndimage.binary_closing(navy | amber | (np.asarray(patch) > 0), iterations=3)
water = ndimage.binary_fill_holes(water)
water = ndimage.binary_opening(water, iterations=4)  # takes the feeder out (the shader draws it) and specks
lab, n = ndimage.label(water)
keep = np.zeros_like(water)
for i in range(1, n + 1):
    ys, xs = np.nonzero(lab == i)
    if len(ys) < 900:
        continue
    # (The arm of the sea at the lower right stays the maps': it is no lake.)
    if xs.mean() > 1350 and ys.mean() > 600:
        continue
    keep |= lab == i
water = keep

def up(a, order=3):
    return np.asarray(Image.fromarray(a.astype(np.float32), 'F').resize((W, H), Image.BICUBIC if order == 3 else Image.BILINEAR), dtype=np.float32)

soft = up(ndimage.gaussian_filter(water.astype(np.float32), 1.2))
mask = soft > 0.5
dist = ndimage.distance_transform_edt(~mask) - ndimage.distance_transform_edt(mask)
dist = ndimage.gaussian_filter(dist.astype(np.float32), 1.5)  # px of this map: over 0 on land
km = dist * TEXEL_KM
code = np.sign(km) * np.sqrt(np.abs(km) / (160.0 * TEXEL_KM))
red = np.clip(0.5 + 0.5 * code, 0.0, 1.0)

# Silt: the amber of the picture's water, measured.
silt0 = np.clip((r - b + 0.12) / 0.42, 0.0, 1.0) * water
silt = np.clip(up(ndimage.gaussian_filter(silt0, 0.8)), 0.0, 1.0)
# (Every shore of the great lake has at least a narrow band of it, also under the mist, where the picture shows none.)
silt = np.maximum(silt, 0.6 * np.exp(np.minimum(km, 0.0) / 0.9) * (km < 0) * (up(far, 1) < 400))
# The way the water turns: the grain of the picture's own silt where it has one, the shore's line where it has none.
gy, gx = np.gradient(ndimage.gaussian_filter(silt, 3.0))
jxx, jyy, jxy = (ndimage.gaussian_filter(v, 14.0) for v in (gx * gx, gy * gy, gx * gy))
angle = 0.5 * np.arctan2(2 * jxy, jxx - jyy) + np.pi / 2  # along the grain
strength = np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2) / (jxx + jyy + 1e-9)
sy, sx = np.gradient(ndimage.gaussian_filter(dist, 6.0))
shore_angle = np.arctan2(sx, -sy)
tx = np.cos(angle)
ty = np.sin(angle)
flip = np.sign(tx * np.cos(shore_angle) + ty * np.sin(shore_angle))
flip[flip == 0] = 1
wgt = np.clip(strength * 3.0, 0.0, 1.0) * np.clip(ndimage.gaussian_filter(silt, 10.0) * 6.0, 0.0, 1.0)
vx = wgt * tx * flip + (1 - wgt) * np.cos(shore_angle)
vy = wgt * ty * flip + (1 - wgt) * np.sin(shore_angle)
norm = np.maximum(np.hypot(vx, vy), 1e-6)
vx /= norm
vy /= norm
rng = np.random.default_rng(7)

def lic(noise, steps, stride):
    acc = noise.copy()
    for way in (1.0, -1.0):
        px, py = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
        for _ in range(steps):
            ax = ndimage.map_coordinates(vx, [py, px], order=1, mode='nearest')
            ay = ndimage.map_coordinates(vy, [py, px], order=1, mode='nearest')
            px = px + way * stride * ax
            py = py + way * stride * ay
            acc += ndimage.map_coordinates(noise, [py, px], order=1, mode='nearest')
    return acc / (2 * steps + 1)

fine = lic(rng.random((H, W)).astype(np.float32), 26, 1.5)
broad = lic(ndimage.gaussian_filter(rng.random((H, W)).astype(np.float32), 3.0), 30, 4.0)
fine = (fine - fine.mean()) / fine.std()
broad = (broad - broad.mean()) / broad.std()
streak = 0.6 * broad + 0.4 * fine
# Threads: the silt frays where it thins, and its dense body is grained along the flow.
edge = 4.0 * silt * (1.0 - silt)
green = np.clip(silt * (1.0 + 0.07 * streak) + 0.09 * edge * streak, 0.0, 1.0)
green *= mask
# On the land the green is the silt of the nearest water, drawn soft: where the shore is stained and where it is clean.
inner = ndimage.binary_erosion(mask, iterations=5)
_, (iy, ix) = ndimage.distance_transform_edt(~inner, return_indices=True)
ashore = ndimage.gaussian_filter(ndimage.gaussian_filter(silt, 3.0)[iy, ix], 5.0)
green = np.where(mask, green, np.clip(ashore, 0.0, 1.0))

# The delta at the feeder's mouth: a fan of pale threads that branch (px of the picture, then of this map).
S = 2
canvas = Image.new('L', (W * S, H * S), 0)
draw = ImageDraw.Draw(canvas)
k = W * S / im.shape[1]

def branch(x, y, heading, length, width, depth):
    steps = max(int(length / 3.0), 2)
    for _ in range(steps):
        heading += rng.normal(0.0, 0.16)
        nx, ny = x + 3.0 * np.cos(heading), y + 3.0 * np.sin(heading)
        draw.line([(x * k, y * k), (nx * k, ny * k)], fill=int(255 * min(1.0, 0.45 + 0.2 * width)), width=max(1, int(round(width * k * 0.55))))
        x, y = nx, ny
        if depth < 3 and rng.random() < 0.05 * (1 + depth):
            branch(x, y, heading + rng.choice([-1, 1]) * rng.uniform(0.3, 0.75), length * rng.uniform(0.45, 0.8), width * 0.72, depth + 1)
    if depth < 2:
        for turn in (-1, 1):
            branch(x, y, heading + turn * rng.uniform(0.2, 0.55), length * rng.uniform(0.4, 0.7), width * 0.7, depth + 1)

for start in (-0.5, -0.2, 0.1, 0.4):
    branch(612.0, 328.0, np.pi / 2 + 0.1 + start, 30.0, 1.5, 0)
blue = np.asarray(canvas.resize((W, H), Image.LANCZOS), dtype=np.float32) / 255.0
blue = np.clip(blue * 1.6, 0.0, 1.0)
# (Each bar lies in a skirt of its own silt.)
blue = np.clip(np.maximum(blue, 0.0) * 0.75 + 1.1 * ndimage.gaussian_filter(blue, 2.2), 0.0, 1.0)

out = np.stack([red, green, blue], axis=-1)
Image.fromarray((out * 255.0 + 0.5).astype(np.uint8), 'RGB').save(OUT, optimize=True)
print('lakebed', out.shape, 'texel km %.4f' % TEXEL_KM, 'water share %.3f' % mask.mean(), os.path.getsize(OUT))
