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
    cells = spectral(n, lambda k: np.exp(-((k - 26) / 12) ** 2), stretch=(1.0, 0.55), turn=-0.5)
    clumps = spectral(n, lambda k: np.exp(-((k - 6) / 4) ** 2))
    puffs = spectral(n, lambda k: np.where(k > 30, (np.maximum(k, 1) / 30) ** -1.6, 0.0))
    billow = 1 - np.abs(spectral(n, lambda k: np.exp(-((k - 60) / 30) ** 2)))
    field = 0.55 * cells + 0.5 * clumps + 0.4 * puffs + 0.25 * billow
    r = ranked(field)
    g = facing(wrapblur(r, 1.0), 3.0, 2.2)
    streak = spectral(n, lambda k: (np.maximum(k, 2) / 2) ** -1.25 * (k > 1.5), stretch=(0.09, 1.0), turn=-0.42)
    wisp = spectral(n, lambda k: np.exp(-((k - 40) / 26) ** 2), stretch=(0.2, 1.0), turn=-0.3)
    b = ranked(streak + 0.35 * wisp)
    save('cloud-tile.jpg', np.stack([r, g, b], -1), 90)

def cover():
    # the world of the cover: px of the master, x from -900 to 7600, 16:9
    w, h = 2048, 1152
    x0, y0, width = -900.0, -820.0, 8500.0
    texel = width / w
    X = x0 + (np.arange(w, dtype=np.float32) + 0.5) * texel; Y = y0 + (np.arange(h, dtype=np.float32) + 0.5) * texel
    X, Y = np.meshgrid(X, Y)
    n = 2048
    fronts = spectral(n, lambda k: (np.maximum(k, 1.5) / 1.5) ** -1.5 * (k > 1.2), stretch=(0.45, 1.0), turn=-0.45)[:h, :w]
    fields = spectral(n, lambda k: np.exp(-((k - 9) / 6) ** 2), stretch=(0.6, 1.0), turn=-0.45)[:h, :w]
    patches = spectral(n, lambda k: np.exp(-((k - 30) / 18) ** 2))[:h, :w]
    low = 0.3 + 0.16 * fronts + 0.12 * fields + 0.07 * patches
    traced = json.load(open(os.path.join(ROOT, 'src/places/reveal/continent.json')))
    body = np.zeros((h, w), np.uint8)
    for s in traced['shapes']:
        cv2.fillPoly(body, [np.round((np.array(s['outer']).reshape(-1, 2) - [x0, y0]) / texel).astype(np.int32)], 255)
    b = body.astype(np.float32) / 255
    over = np.clip(cv2.GaussianBlur(b, (0, 0), 70 / texel) * 3.2, 0, 1)
    # thin over the body, so the bones read, and clear over the head where the rise begins
    head = np.exp(-(((X - 1300) / 650) ** 2 + ((Y - 1580) / 480) ** 2))
    low = low * (1 - 0.72 * over) * (1 - 0.9 * head)
    cyclone = np.exp(-(((X - 5557) / 900) ** 2 + ((Y - 3007) / 900) ** 2))
    low = low * (1 - 0.95 * cyclone)
    high = np.clip(0.22 + 0.2 * spectral(n, lambda k: (np.maximum(k, 1.2) / 1.2) ** -1.7 * (k > 1.0), stretch=(0.3, 1.0), turn=-0.38)[:h, :w], 0, 1) * (1 - 0.6 * over) * (1 - 0.95 * head)
    # middle cloud banked on the weather side of the ranges
    lee = cv2.GaussianBlur(np.roll(b, (int(-34 / texel), int(22 / texel)), (1, 0)), (0, 0), 26 / texel)
    banked = np.clip(lee * 2.0 - b * 1.2, 0, 1) * np.clip(0.5 + 0.5 * patches, 0, 1) * (1 - head)
    save('cloud-cover.jpg', np.stack([np.clip(low, 0, 1), high, banked], -1), 88)

def cyclone():
    n = 1024
    y, x = np.mgrid[0:n, 0:n].astype(np.float32)
    u = (x - n / 2) / (n / 2); v = (y - n / 2) / (n / 2)
    r = np.sqrt(u * u + v * v) + 1e-4; a = np.arctan2(v, u)
    turn = a + 3.4 * np.log(r + 0.03)
    def polar(seed_scale, bands, radial):
        # noise in the turning frame: repeats round the circle
        px = (turn / (2 * np.pi) * bands) % 1.0; py = (np.log(r + 0.03) * radial) % 1.0
        base = spectral(512, lambda k: (np.maximum(k, 2) / 2) ** -seed_scale * (k > 0.5))
        from scipy import ndimage
        return ndimage.map_coordinates(base.astype(np.float32), [py * 512, px * 512], order=1, mode='grid-wrap')
    arms = polar(1.8, 2.0, 0.6); fine = polar(1.2, 5.0, 2.2)
    fleck = spectral(n, lambda k: np.exp(-((k - 90) / 50) ** 2))
    d = 0.55 + 0.42 * arms + 0.22 * fine + 0.1 * fleck
    core = np.exp(-(r / 0.2) ** 2)
    d = d + 0.9 * core
    d = d * np.clip((1.02 - r) / 0.5, 0, 1) ** 0.8
    eye = np.clip((r - 0.016) / 0.02, 0, 1)
    dens = np.clip((d - 0.45) * 2.6, 0, 1) * eye
    tall = np.clip(0.35 * dens + 0.65 * core + 0.2 * fine * dens, 0, 1)
    lit = facing(cv2.GaussianBlur(tall + 0.5 * dens, (0, 0), 1.5), 4.0, 3.0)
    save('cyclone.jpg', np.stack([dens, lit, tall], -1), 90)

def storm():
    w, h = 1024, 384
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    u = (x - w / 2) / (w / 2); v = (y - h / 2) / (h / 2)
    n = 1024
    lumps = spectral(n, lambda k: np.exp(-((k - 14) / 7) ** 2))[:h, :w]
    cauli = 1 - np.abs(spectral(n, lambda k: np.exp(-((k - 45) / 22) ** 2)))[:h, :w]
    crumb = 1 - np.abs(spectral(n, lambda k: np.exp(-((k - 130) / 60) ** 2)))[:h, :w]
    rag = spectral(n, lambda k: (np.maximum(k, 3) / 3) ** -1.4 * (k > 2), stretch=(0.4, 1.0))[:h, :w]
    # an anvil: a long ragged sheet, thicker at the towers, torn at the rim and blown out to the lee
    body = 1 - np.sqrt((u / 0.88) ** 2 + (v / (0.62 + 0.16 * u)) ** 2) + 0.16 * rag
    towers = np.zeros((h, w), np.float32)
    for cx, cy, cr in [(-0.52, 0.05, 0.2), (-0.2, -0.1, 0.24), (0.12, 0.08, 0.27), (0.42, -0.06, 0.2), (0.62, 0.12, 0.13)]:
        towers = np.maximum(towers, np.exp(-(((u - cx) / cr) ** 2 + ((v - cy) / (cr * 2.3)) ** 2)))
    tall = np.clip(0.25 * np.clip(body * 2, 0, 1) + towers * (0.55 + 0.3 * lumps + 0.28 * cauli + 0.12 * crumb), 0, 1)
    dens = np.clip(body * 3.2 + 0.5 * towers - 0.18 + 0.22 * rag, 0, 1)
    dens = dens * np.clip(0.75 + 0.5 * tall + 0.12 * crumb, 0, 1)
    lit = facing(cv2.GaussianBlur(tall, (0, 0), 1.2), 5.0, 4.5)
    save('storm.jpg', np.stack([dens, lit, tall], -1), 90)

tile(); cover(); cyclone(); storm()
