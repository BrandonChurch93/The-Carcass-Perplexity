"""The wet lip's gravel: worn and broken stones of mixed size packed on sand, computed with no picture going in.
Writes public/assets/eye/land/lip-nh.jpg (r, g: the lie of the surface as the sine of its angle each way; b: height, 0 to 60 mm)
and public/assets/eye/land/lip-tone.jpg (r: the tone of each stone; g: its hue, cold to rusty; b: how much sky a place sees).
The sheet is 1.25 m square and repeats. Run from the repository root: python3 assets-src/eye/land/make_gravel_lip.py"""
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

N = 1536
SIZE = 1.25
PX = SIZE / N
TOP = 0.06
rng = np.random.default_rng(9003)

def tiled_noise(scale, seed):
    r = np.random.default_rng(seed)
    g = r.standard_normal((N, N))
    f = gaussian_filter(g, scale, mode='wrap')
    return f / (f.std() + 1e-9)

high = 0.0012 * tiled_noise(9, 1) + 0.0006 * tiled_noise(2.2, 2) + 0.0035
tone = np.full((N, N), 0.42) + 0.05 * tiled_noise(30, 3)
hue = np.full((N, N), 0.55) + 0.06 * tiled_noise(40, 4)

classes = [(0.046, 9), (0.034, 22), (0.024, 70), (0.016, 230), (0.0105, 700), (0.0065, 2300), (0.004, 5200)]
placed = np.zeros((0, 3))
for radius, count in classes:
    tries = 0
    done = 0
    while done < count and tries < count * 30:
        tries += 1
        r = radius * rng.uniform(0.8, 1.2)
        c = rng.uniform(0, SIZE, 2)
        if len(placed):
            d = np.abs(placed[:, :2] - c)
            d = np.minimum(d, SIZE - d)
            if np.any(np.hypot(d[:, 0], d[:, 1]) < 0.86 * (placed[:, 2] + r)):
                continue
        placed = np.vstack([placed, [c[0], c[1], r]])
        done += 1
        # The stone: a worn lump, flatter than it is wide, a little out of round, sometimes broken across.
        a = r
        b = r * rng.uniform(0.62, 0.95)
        turn = rng.uniform(0, np.pi)
        power = rng.uniform(2.0, 3.0)
        thick = b * rng.uniform(0.5, 0.85)
        sunk = thick * rng.uniform(0.05, 0.4)
        reach = int(np.ceil(r * 1.25 / PX)) + 2
        ci, cj = int(c[0] / PX), int(c[1] / PX)
        ii = np.arange(ci - reach, ci + reach + 1)
        jj = np.arange(cj - reach, cj + reach + 1)
        X, Y = np.meshgrid(ii * PX + PX / 2 - c[0], jj * PX + PX / 2 - c[1])
        u = X * np.cos(turn) + Y * np.sin(turn)
        v = -X * np.sin(turn) + Y * np.cos(turn)
        ang = np.arctan2(v / b, u / a)
        k1, k2 = rng.integers(2, 4), rng.integers(4, 7)
        lump = 1 + 0.09 * np.sin(k1 * ang + rng.uniform(0, 6.28)) + 0.05 * np.sin(k2 * ang + rng.uniform(0, 6.28))
        d = (np.abs(u / a) ** power + np.abs(v / b) ** power) ** (1 / power) / lump
        body = thick * np.sqrt(np.clip(1 - d * d, 0, 1)) ** rng.uniform(0.7, 1.0)
        if rng.uniform() < 0.4:
            # Broken: one side is a flat face that falls steeply, its edge a little chipped.
            al = rng.uniform(0, 6.28)
            off = rng.uniform(0.1, 0.55)
            cut = (u * np.cos(al) + v * np.sin(al)) / a - off
            body = np.minimum(body, thick * np.clip(-cut * rng.uniform(2.5, 6.0), 0, None))
        if rng.uniform() < 0.3:
            # A flat top, as a split slab has.
            body = np.minimum(body, thick * rng.uniform(0.55, 0.8))
        z = body - sunk + 0.0035
        I, J = np.meshgrid(ii % N, jj % N)
        inside = (d < 1) & (z > high[J, I])
        if not inside.any():
            continue
        high[J[inside], I[inside]] = z[inside]
        tone[J[inside], I[inside]] = rng.uniform(0.12, 1.0) ** 0.8
        hue[J[inside], I[inside]] = rng.uniform(0, 1)

# The grain of the stone and of the sand: fine pits everywhere, coarser on the sand.
high += 0.00025 * tiled_noise(0.8, 5) + 0.0002 * tiled_noise(1.6, 6)
high = np.clip(high, 0, TOP)
gx = (np.roll(high, -1, 1) - np.roll(high, 1, 1)) / (2 * PX)
gy = (np.roll(high, -1, 0) - np.roll(high, 1, 0)) / (2 * PX)
sx = gx / np.sqrt(1 + gx * gx)
sy = gy / np.sqrt(1 + gy * gy)
wide = gaussian_filter(high, 14, mode='wrap')
close = gaussian_filter(high, 4, mode='wrap')
sky = np.clip(1 - np.clip(wide - high, 0, None) / 0.012 - 1.2 * np.clip(close - high, 0, None) / 0.004, 0.1, 1)
# A loaded picture is turned over on its way to the card, so its rows run against z: the lie that way is written with its sign turned.
nh = np.stack([127.5 + 127.5 * sx, 127.5 - 127.5 * sy, 255 * high / TOP], -1)
tn = np.stack([255 * np.clip(tone, 0, 1), 255 * np.clip(hue, 0, 1), 255 * sky], -1)
Image.fromarray(np.clip(np.rint(nh), 0, 255).astype(np.uint8)).save('public/assets/eye/land/lip-nh.jpg', quality=93, subsampling=0)
Image.fromarray(np.clip(np.rint(tn), 0, 255).astype(np.uint8)).save('public/assets/eye/land/lip-tone.jpg', quality=92, subsampling=0)
print('stones', len(placed))
