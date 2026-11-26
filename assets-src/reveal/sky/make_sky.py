# The cloud of the rise, made in code. Run from the root of the repo: python3 assets-src/reveal/sky/make_sky.py
# cloud-tile.jpg: a picture that repeats. r: the field the low cloud is cut from (every value equally common, so a threshold is a share of the sky),
#   g: how much each point of that field faces the sun (0.5 is level), b: the streaks the high cloud and the vapour are cut from.
# cloud-cover.jpg: the whole world. r: the share of low cloud, g: the share of high cloud, b: the share of middle cloud banked against the ranges.
# cyclone.jpg and storm.jpg: r how thick, g how much it faces the sun, b how high.
import json, os
import numpy as np, cv2

ROOT = os.getcwd()
OUT = os.path.join(ROOT, 'public/assets/reveal/sky')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(1907)
SUN = np.array([0.84, -0.2])  # toward the sun on x and z, as in shared/anchors.ts

def spectral(n, shape, stretch=(1.0, 1.0), turn=0.0):
    """Noise that repeats, with its power laid out by `shape` over the wave number (in cycles across the picture)."""
    white = rng.standard_normal((n, n))
    f = np.fft.fft2(white)
    ky = np.fft.fftfreq(n)[:, None] * n; kx = np.fft.fftfreq(n)[None, :] * n
    c, s = np.cos(turn), np.sin(turn)
    u = (kx * c + ky * s) * stretch[0]; v = (-kx * s + ky * c) * stretch[1]
    k = np.sqrt(u * u + v * v)
    out = np.real(np.fft.ifft2(f * shape(k)))
    return (out - out.mean()) / out.std()

def wrapblur(a, sigma):
    pad = int(sigma * 4) + 2
    b = cv2.GaussianBlur(np.pad(a.astype(np.float32), pad, mode='wrap'), (0, 0), sigma)
    return b[pad:-pad, pad:-pad]

def ranked(a):
    order = np.argsort(a, axis=None)
    out = np.empty(a.size, np.float32); out[order] = np.linspace(0, 1, a.size, dtype=np.float32)
    return out.reshape(a.shape)

def facing(field, reach, gain):
    """How much the field rises toward the sun over `reach` texels: lit sides above 0.5, shaded sides below."""
    d = SUN / np.hypot(*SUN) * reach
    from scipy import ndimage
    moved = ndimage.shift(field.astype(np.float32), (-d[1], -d[0]), order=1, mode='grid-wrap')
    return np.clip(0.5 + gain * (field - moved), 0, 1)

def save(name, rgb, quality=90):
    cv2.imwrite(os.path.join(OUT, name), cv2.cvtColor((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, quality, cv2.IMWRITE_JPEG_SAMPLING_FACTOR, cv2.IMWRITE_JPEG_SAMPLING_FACTOR_444])
    print(name, os.path.getsize(os.path.join(OUT, name)) // 1024, 'kB')

def tile():
    n = 1024
    cells = spectral(n, lambda k: np.exp(-((k - 26) / 12) ** 2), stretch=(1.0, 0.8), turn=-0.5)
    clumps = spectral(n, lambda k: np.exp(-((k - 6) / 4) ** 2))
    puffs = spectral(n, lambda k: np.where(k > 30, (np.maximum(k, 1) / 30) ** -1.6, 0.0))
    billow = 1 - np.abs(spectral(n, lambda k: np.exp(-((k - 60) / 30) ** 2)))
    field = 0.55 * cells + 0.5 * clumps + 0.4 * puffs + 0.25 * billow
    r = ranked(field)
    g = facing(wrapblur(r, 1.0), 3.0, 2.2)
    streak = spectral(n, lambda k: (np.maximum(k, 2) / 2) ** -1.5 * (k > 1.5), stretch=(0.32, 1.0), turn=-0.42)
    wisp = spectral(n, lambda k: np.exp(-((k - 30) / 22) ** 2), stretch=(0.3, 1.0), turn=-0.2)
    curl = spectral(n, lambda k: np.exp(-((k - 12) / 8) ** 2), stretch=(0.5, 1.0), turn=-0.7)
    b = ranked(streak + 0.35 * wisp + 0.25 * curl)
    save('cloud-tile.jpg', np.stack([r, g, b], -1), 90)

tile()
