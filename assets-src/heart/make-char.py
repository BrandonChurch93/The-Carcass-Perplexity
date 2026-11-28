# The charred hide of the one that sank: a tile of burnt skin split into blocks as burnt timber is, some lifted, some gone,
# as colour and as slope with height (the packing of make-skins.py). Nothing is drawn by hand and nothing is random: one seed.
# Run: /home/user/bpyenv/bin/python assets-src/heart/make-char.py
import numpy as np
from PIL import Image

OUT = 'public/assets/heart/mat'
N = 1024
rng = np.random.RandomState(3685)

def sm(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def blur(a, r):
    r = max(1, int(round(r)))
    for _ in range(3):
        for axis in (0, 1):
            c = np.cumsum(np.concatenate([a.take(range(-r - 1, 0), axis=axis, mode='wrap'), a, a.take(range(0, r), axis=axis, mode='wrap')], axis=axis), axis=axis)
            n = a.shape[axis]
            a = (c.take(range(2 * r + 1, 2 * r + 1 + n), axis=axis) - c.take(range(0, n), axis=axis)) / (2 * r + 1)
    return a

def noise(r):
    f = blur(rng.rand(N, N), r)
    return (f - f.min()) / (f.max() - f.min())

def cells(gx, gy, jitter, bend, ragged):
    """Blocks on a jittered grid that wraps: for every pixel the distance to the edge of its block, the block's number, and where it is in it.
    The page is bent before the blocks are found, so no edge of a block is straight, and frayed at a smaller scale."""
    px = (np.arange(gx)[None, :] + 0.5 + jitter * (rng.rand(gy, gx) - 0.5)) / gx
    py = (np.arange(gy)[:, None] + 0.5 + jitter * (rng.rand(gy, gx) - 0.5)) / gy
    y, x = np.mgrid[0:N, 0:N]
    x = (x + 0.5) / N + bend * (noise(70) - 0.5) + 0.35 * bend * (noise(22) - 0.5) + ragged * (noise(5) - 0.5)
    y = (y + 0.5) / N + bend * (noise(70) - 0.5) + 0.35 * bend * (noise(22) - 0.5) + ragged * (noise(5) - 0.5)
    cx = np.floor(x * gx).astype(int)
    cy = np.floor(y * gy).astype(int)
    f1 = np.full((N, N), 9.0)
    f2 = np.full((N, N), 9.0)
    who = np.zeros((N, N), int)
    ox = np.zeros((N, N))
    oy = np.zeros((N, N))
    for dy in (-2, -1, 0, 1, 2):
        for dx in (-2, -1, 0, 1, 2):
            ix = (cx + dx) % gx
            iy = (cy + dy) % gy
            qx = px[iy, ix] + ((cx + dx) - ix) / gx
            qy = py[iy, ix] + ((cy + dy) - iy) / gy
            # Measured in blocks, so a long block is long.
            ex = (x - qx) * gx
            ey = (y - qy) * gy
            d = np.hypot(ex, ey)
            nearer = d < f1
            f2 = np.where(nearer, f1, np.minimum(f2, d))
            who = np.where(nearer, iy * gx + ix, who)
            ox = np.where(nearer, ex, ox)
            oy = np.where(nearer, ey, oy)
            f1 = np.where(nearer, d, f1)
    return f2 - f1, who, ox, oy

warp = noise(40)
grain = noise(2.5)
soft = noise(14)
broad = noise(90)
# The fibre of the hide, along the limb.
fibre = blur(rng.rand(N, N), 1)
for _ in range(2):
    fibre = (fibre + np.roll(fibre, 3, 0) + np.roll(fibre, -3, 0) + np.roll(fibre, 7, 0) + np.roll(fibre, -7, 0)) / 5
fibre = (fibre - fibre.min()) / (fibre.max() - fibre.min())

# The big blocks: longer along the limb (down the tile) than across it.
edge, who, ox, oy = cells(7, 4, 1.0, 0.11, 0.012)
count = 7 * 4
lift = 0.35 + 0.65 * rng.rand(count) ** 0.7
gone = rng.rand(count) < 0.16
turn = rng.rand(count) * 6.283
curl = 0.1 + 0.5 * rng.rand(count) ** 2
wide = 0.03 + 0.3 * warp * warp + 0.12 * soft
crack = 1 - sm(0.0, 1.0, edge / wide)
dome = sm(0.0, 0.55, edge) ** 0.7
tilt = (ox * np.cos(turn[who]) + oy * np.sin(turn[who])) * curl[who]
block = np.where(gone[who], 0.12 + 0.1 * soft, lift[who] * (0.55 + 0.45 * dome) + 0.3 * tilt * dome)
# The small ones inside them: the checks of a burnt surface.
edge2, who2, _, _ = cells(23, 13, 1.0, 0.06, 0.008)
count2 = 23 * 13
lift2 = rng.rand(count2)
crack2 = 1 - sm(0.0, 1.0, edge2 / (0.1 + 0.12 * soft))
check = (0.82 + 0.18 * lift2[who2]) * (1 - 0.45 * crack2)
h = block * check * (1 - 0.85 * crack) + 0.07 * (grain - 0.5) + 0.06 * (soft - 0.5) + 0.1 * (fibre - 0.5) * (0.4 + block)
h = np.clip((h - h.min()) / (h.max() - h.min()), 0, 1)
h = blur(h, 1)

strength = 2.6
dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * strength * 8
dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * strength * 8
packed = np.stack([127.5 - dx * 127.5, 127.5 - dy * 127.5, h * 255], axis=-1)
Image.fromarray(np.clip(np.round(packed), 0, 255).astype(np.uint8)).save(f'{OUT}/char-nh.jpg', quality=92, subsampling=0)

# Colour: charcoal, a scorched brown where it burnt less, soot in the splits, a grey bloom of ash on the edges that stand up. Never pale.
coal = np.array([40.0, 33.0, 29.0])
brown = np.array([62.0, 43.0, 30.0])
soot = np.array([9.0, 7.0, 6.0])
ash = np.array([80.0, 71.0, 63.0])
c = coal[None, None, :] * (0.55 + 0.75 * h[..., None])
c = c + (brown - coal)[None, None, :] * (sm(0.5, 0.8, broad) * (0.5 + 0.5 * h))[..., None]
deep = np.clip(np.maximum(crack, 0.6 * crack2) + sm(0.3, 0.1, h), 0, 1)
c = c * (1 - deep[..., None]) + soot[None, None, :] * deep[..., None]
rim = sm(0.02, 0.1, edge) * (1 - sm(0.1, 0.3, edge)) * sm(0.55, 0.85, lift[who] + 0.3 * tilt) * (~gone[who]) * sm(0.35, 0.75, soft) * (0.6 + 0.8 * fibre)
c = c + (ash[None, None, :] - c) * (0.4 * rim)[..., None]
c = c * (0.8 + 0.25 * grain[..., None] + 0.3 * (fibre[..., None] - 0.5))
Image.fromarray(np.clip(np.round(c), 0, 255).astype(np.uint8)).save(f'{OUT}/char.jpg', quality=90, subsampling=0)
lum = (0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]) / 255
print('char lum', round(float(lum.mean()), 3), 'sd', round(float(lum.std()), 3), 'height mean', round(float(h.mean()), 3))
