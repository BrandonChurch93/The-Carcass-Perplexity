# The land of the rise, made in code: for each of four nested rectangles of the world, a picture of the ground's own colour and a picture of its
# shape (the slope on x and z, and the height). Run from the root of the repo: python3 assets-src/reveal/land/make_land.py [a b c d] [--scale 0.25]
# What is read from the approved master, as data: the outline of the bone ranges (continent.json) and the light of the master inside them, as a
# guide to which ground is high. Everything else (the forelands, the drainage, the colours, the seas) is made here.
import json, os, subprocess, sys
import numpy as np, cv2

ROOT = os.getcwd()
OUT = os.path.join(ROOT, 'public/assets/reveal/land')
WORK = os.path.join(ROOT, 'out/work/gen')
os.makedirs(WORK, exist_ok=True)
ERODE = os.path.join(WORK, 'erode')
if not os.path.exists(ERODE):
    subprocess.check_call(['gcc', '-O2', '-o', ERODE, os.path.join(ROOT, 'assets-src/reveal/land/erode.c'), '-lm'])

args = [a for a in sys.argv[1:] if a in ('a', 'b', 'c', 'd')]
SCALE = float(sys.argv[sys.argv.index('--scale') + 1]) if '--scale' in sys.argv else 1.0
TW, TH = int(4096 * SCALE), int(2304 * SCALE)
MW, MH = 5952, 3348
KM = 0.8566
HEIGHT_KM = 6.0
# centre x, centre y, width: px of the master. The same numbers stand in src/places/reveal/land/levels.ts.
LEVELS = {'a': (3361.6, 1570.3, 5300.0), 'b': (1554.0, 1581.0, 2620.0), 'c': (1272.85, 1580.8, 1130.0), 'd': (1272.85, 1580.8, 320.0)}
PARENT = {'a': None, 'b': 'a', 'c': 'b', 'd': 'c'}
RELIEF = {'a': 3.2, 'b': 2.6, 'c': 2.0, 'd': 1.5}
LAKE = (1272.85, 1580.8, 57.0, 50.0)
LAVA = (2278.5, 1325.3)
THROAT = (1758.8, 1439.3)
SALT = (3772.6, 1630.0)
THETA = 0.15

def hash2(ix, iy, seed):
    h = ix.astype(np.uint32) * np.uint32(374761393) + iy.astype(np.uint32) * np.uint32(668265263) + np.uint32((seed * 1442695041 + 12345) & 0xFFFFFFFF)
    h = (h ^ (h >> np.uint32(13))) * np.uint32(1274126177)
    h ^= h >> np.uint32(16)
    return (h & np.uint32(0xFFFFFF)).astype(np.float32) * np.float32(1.0 / 16777216.0)

def vnoise(x, y, seed):
    ix = np.floor(x); iy = np.floor(y)
    fx = (x - ix).astype(np.float32); fy = (y - iy).astype(np.float32)
    ix = ix.astype(np.int64); iy = iy.astype(np.int64)
    ux = fx * fx * (3 - 2 * fx); uy = fy * fy * (3 - 2 * fy)
    a = hash2(ix, iy, seed); b = hash2(ix + 1, iy, seed); c = hash2(ix, iy + 1, seed); d = hash2(ix + 1, iy + 1, seed)
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy

def fbm(X, Y, wavelength, seed, texel, gain=0.5, ridged=False, most=14, least=0):
    """Octaves of value noise in px of the master, from `wavelength` down to two texels of this level. Mean 0, about -0.5 to 0.5."""
    out = np.zeros(X.shape, np.float32); amp = 1.0; total = 0.0; o = 0
    w = wavelength
    while w >= 3.0 * texel and o < most:
        if o >= least:
            n = vnoise(X / w + 37.1 * o, Y / w - 11.7 * o, seed + o)
            out += amp * ((1 - np.abs(2 * n - 1)) - 0.5 if ridged else n - 0.5)
        total += amp; amp *= gain; w /= 2.03; o += 1
    return out / max(total, 1e-6)

def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def blob(X, Y, cx, cy, rx, ry, soft=0.35, warp=None):
    d = np.sqrt(((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2)
    if warp is not None: d = d + warp
    return 1 - smooth(1 - soft, 1 + soft, d)

def capsule(X, Y, ax, ay, bx, by, r, soft=0.5):
    px = X - ax; py = Y - ay; vx = bx - ax; vy = by - ay
    t = np.clip((px * vx + py * vy) / (vx * vx + vy * vy), 0, 1)
    d = np.sqrt((px - t * vx) ** 2 + (py - t * vy) ** 2) / r
    return 1 - smooth(1 - soft, 1 + soft, d)

# ---- the fields of the whole world, once, on the grid of the master ----
def world():
    cache = os.path.join(WORK, 'world.npz')
    if os.path.exists(cache):
        z = np.load(cache); return {k: z[k] for k in z.files}
    traced = json.load(open(os.path.join(ROOT, 'src/places/reveal/continent.json')))
    bone = np.zeros((MH, MW), np.uint8); holes = np.zeros((MH, MW), np.uint8)
    for s in traced['shapes']:
        cv2.fillPoly(bone, [np.round(np.array(s['outer']).reshape(-1, 2) * 16).astype(np.int32)], 255, shift=4)
    for s in traced['shapes']:
        for hole in s['holes']:
            pts = np.round(np.array(hole).reshape(-1, 2) * 16).astype(np.int32)
            area = cv2.contourArea(np.array(hole, np.float32).reshape(-1, 2))
            cv2.fillPoly(bone, [pts], 0, shift=4)
            if area > 500: cv2.fillPoly(holes, [pts], 255, shift=4)
    yy, xx = np.mgrid[0:MH, 0:MW].astype(np.float32)
    lake = (((xx - LAKE[0]) / LAKE[2]) ** 2 + ((yy - LAKE[1]) / LAKE[3]) ** 2) < 1.0
    near_lake = (((xx - LAKE[0]) / (LAKE[2] + 30)) ** 2 + ((yy - LAKE[1]) / (LAKE[3] + 30)) ** 2) < 1.0
    # the lake is a round hole in a whole massif: the traced hole there is closed and the round one cut
    holes[near_lake] = 0; bone[near_lake] = 255; bone[lake] = 0
    b = bone.astype(np.float32) / 255
    dist = cv2.distanceTransform(bone, cv2.DIST_L2, 5)
    grey = cv2.cvtColor(cv2.imread(os.path.join(ROOT, 'references/approved/7-reveal/reveal-master.jpg')), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    grey = cv2.GaussianBlur(grey, (0, 0), 2.0)
    small = cv2.resize(b, (MW // 4, MH // 4), interpolation=cv2.INTER_AREA)
    pad = 160
    small = cv2.copyMakeBorder(small, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
    near = 0.6 * cv2.GaussianBlur(small, (0, 0), 45 / 4) + 0.8 * cv2.GaussianBlur(small, (0, 0), 110 / 4)
    out = {'bone': cv2.GaussianBlur(b, (0, 0), 1.2), 'dist': dist, 'grey': grey * b, 'near': near, 'holes': cv2.GaussianBlur(holes.astype(np.float32) / 255, (0, 0), 2.0)}
    np.savez(cache, **out)
    return out

def sample(field, X, Y, scale=1.0, pad=0.0):
    return cv2.remap(field, ((X + pad) / scale - 0.5).astype(np.float32), ((Y + pad) / scale - 0.5).astype(np.float32), cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=0)

def erode(h, uplift, fixed, iters, k, dt, talus, diffuse, m=0.45):
    H, W = h.shape
    h.astype(np.float32).tofile(WORK + '/h.f32'); uplift.astype(np.float32).tofile(WORK + '/u.f32'); fixed.astype(np.uint8).tofile(WORK + '/f.u8')
    subprocess.check_call([ERODE, str(W), str(H), str(iters), str(k), str(dt), str(m), str(talus), str(diffuse), WORK + '/h.f32', WORK + '/u.f32', WORK + '/f.u8', WORK + '/oh.f32', WORK + '/oa.f32'])
    return np.fromfile(WORK + '/oh.f32', np.float32).reshape(H, W), np.fromfile(WORK + '/oa.f32', np.float32).reshape(H, W)

def srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c < 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)

def col(r, g, b):
    return np.array([r, g, b], np.float32)

def mixc(a, b, t):
    return a + (b - a) * t[..., None]

def make(name):
    G = world()
    cx, cy, width = LEVELS[name]
    height = width * TH / TW
    texel = width / TW
    xs = cx - width / 2 + (np.arange(TW, dtype=np.float32) + 0.5) * texel
    ys = cy - height / 2 + (np.arange(TH, dtype=np.float32) + 0.5) * texel
    X, Y = np.meshgrid(xs, ys)
    cell_km = texel * KM
    bone = np.clip(sample(G['bone'], X, Y), 0, 1)
    dist = np.maximum(sample(G['dist'], X, Y), 0)
    grey = np.clip(sample(G['grey'], X, Y), 0, 1)
    near = np.maximum(sample(G['near'], X, Y, 4.0, 640.0), 0)
    holes = np.clip(sample(G['holes'], X, Y), 0, 1)

    # ---- where the land is ----
    n_big = fbm(X, Y, 420, 11, max(texel, 40))
    n_mid = fbm(X, Y, 130, 12, max(texel, 6))
    n_fine = fbm(X, Y, 22, 13, texel, gain=0.55)
    wob = 0.25 * fbm(X, Y, 60, 21, max(texel, 2))
    lake_d = np.sqrt(((X - LAKE[0]) / LAKE[2]) ** 2 + ((Y - LAKE[1]) / LAKE[3]) ** 2) + 0.05 * fbm(X, Y, 30, 22, texel) + 0.02 * fbm(X, Y, 4, 23, texel)
    lake = lake_d < 1.0
    keep = np.maximum.reduce([
        capsule(X, Y + 60 * wob, 2060, 1548, 2960, 1562, 46),
        0.8 * blob(X, Y, 4560, 1500, 600, 150, soft=0.5, warp=wob),
        0.9 * blob(X, Y, 3230, 1560, 330, 250, warp=wob),
        holes,
    ])
    chest = blob(X, Y, 2440, 1290, 400, 215, warp=wob)
    throat = blob(X, Y, THROAT[0] + 20, THROAT[1] + 10, 175, 140, warp=wob)
    pan = blob(X, Y, SALT[0], SALT[1], 185, 215, soft=0.25, warp=wob)
    n_huge = fbm(X, Y, 900, 10, max(texel, 100))
    ribs_low = blob(X, Y, 2520, 1860, 430, 250, soft=0.5)
    score = near * np.clip(1 + 2.2 * n_huge + 1.6 * n_big + 1.0 * n_mid, 0.05, 3) + 0.1 * n_big + 0.07 * n_mid + 0.035 * n_fine - THETA - 0.55 * keep + 0.18 * chest + 0.2 * throat - ribs_low * (0.05 + 0.25 * n_mid)
    score = np.where(np.sqrt(near) < 0.12, np.minimum(score, -0.01), score)
    land = ((score > 0) | (bone > 0.5)) & ~lake
    lowness = smooth(0.0, 0.22, score)

    # ---- the guide: which ground is pushed up ----
    crest = np.power(np.clip(dist / 14.0, 0, 1), 0.7)
    guide = 0.02 + 0.09 * lowness + bone * (0.2 + 0.42 * crest + 0.5 * grey)
    guide = guide * (1 - 0.9 * pan) + 0.03 * pan
    guide = guide * (1 - 0.75 * chest * (1 - bone)) * (1 - 0.6 * throat * (1 - bone))
    guide = np.where(land, guide, 0).astype(np.float32)
    fixed = ~land

    # ---- the height: the parent's, with this level's own drainage cut into it ----
    talus = 0.7 * cell_km / HEIGHT_KM
    if PARENT[name] is None:
        half = cv2.resize(guide, (TW // 2, TH // 2), interpolation=cv2.INTER_AREA)
        hfix = cv2.resize(fixed.astype(np.uint8), (TW // 2, TH // 2), interpolation=cv2.INTER_NEAREST) > 0
        seedn = cv2.resize(fbm(X, Y, 90, 31, texel * 2), (TW // 2, TH // 2), interpolation=cv2.INTER_AREA)
        h0 = np.where(hfix, 0, half * 0.4 + 0.03 * (seedn + 0.5))
        h, _ = erode(h0, half, hfix, 70, 7.0, 0.05, talus * 2 * 4, 0.04)
        h = cv2.resize(h, (TW, TH), interpolation=cv2.INTER_CUBIC)
        h = np.where(fixed, 0, np.maximum(h, 0.0015) + 0.012 * guide / 0.5 * fbm(X, Y, 8, 32, texel))
        h, area = erode(h, guide, fixed, 8, 7.0, 0.03, talus * 4, 0.03)
    else:
        p = np.load(os.path.join(WORK, f'h-{PARENT[name]}.npy')).astype(np.float32)
        pcx, pcy, pw = LEVELS[PARENT[name]]
        ptex = pw / p.shape[1]
        h = cv2.remap(p, ((X - (pcx - pw / 2)) / ptex - 0.5).astype(np.float32), ((Y - (pcy - pw * TH / TW / 2)) / ptex - 0.5).astype(np.float32), cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        rough = np.clip(np.hypot(*np.gradient(h)) / max(talus, 1e-6), 0, 1)
        h = np.where(fixed, 0, np.maximum(h, 0.0012) + (0.004 + 0.02 * rough) * fbm(X, Y, ptex * 6, 33, texel, gain=0.6))
        edge = np.zeros_like(fixed); edge[:2, :] = True; edge[-2:, :] = True; edge[:, :2] = True; edge[:, -2:] = True
        h, area = erode(h, guide, fixed | edge, 10, 7.0, 0.012, talus * 1.6, 0.02)
    h = np.where(land, np.maximum(h, 0.0008), 0).astype(np.float32)

    # the airways: round sinkholes in the throat plateau
    rng = np.random.default_rng(5)
    pits = np.zeros_like(h)
    for _ in range(34):
        a = rng.uniform(0, 2 * np.pi); r = np.sqrt(rng.uniform(0, 1))
        px = THROAT[0] + 20 + 150 * r * np.cos(a); py = THROAT[1] + 10 + 115 * r * np.sin(a); pr = rng.uniform(4, 9) + 14 * rng.uniform(0, 1) ** 3
        if abs(px - X[0, 0]) > width + 100: continue
        d = np.sqrt((X - px) ** 2 + (Y - py) ** 2) / pr + 0.12 * wob
        pits = np.maximum(pits, 1 - smooth(0.75, 1.0, d))
    pits = pits * (1 - bone) * land
    h = h * (1 - 0.85 * pits)
    np.save(os.path.join(WORK, f'h-{name}.npy'), h.astype(np.float16))

    # ---- shape: slopes, hollows, rivers, the sea floor ----
    gy, gx = np.gradient(h * HEIGHT_KM / cell_km)
    slope = np.hypot(gx, gy)
    k = RELIEF[name]
    inv = 1 / np.sqrt(1 + k * k * slope * slope)
    nx = -k * gx * inv; nz = -k * gy * inv
    wide = cv2.GaussianBlur(h, (0, 0), 6); wider = cv2.GaussianBlur(h, (0, 0), 24)
    hollow = np.clip(0.5 + (h - wide) * 14 + (h - wider) * 4, 0, 1)
    area_km = area * cell_km * cell_km
    river = smooth(2.3, 3.6, np.log10(np.maximum(area_km, 1))) * land * smooth(0.5, 0.15, slope)
    river = cv2.GaussianBlur(river.astype(np.float32), (0, 0), 0.6)
    moist = np.clip(cv2.GaussianBlur(river, (0, 0), 3.0) * 3.0, 0, 1)
    water = ~land
    to_land = cv2.distanceTransform(water.astype(np.uint8), cv2.DIST_L2, 5) * texel
    to_sea = cv2.distanceTransform(land.astype(np.uint8), cv2.DIST_L2, 5) * texel
    shelf = 3 + 85 * smooth(0.12, 0.6, near * 1.5 + 1.1 * fbm(X, Y, 500, 42, max(texel, 30))) + 10 * n_mid
    depth = 1 - np.exp(-to_land / np.maximum(shelf, 3))
    bars = smooth(0.1, 0.35, fbm(X, Y, 26, 41, texel, ridged=True)) * np.exp(-to_land / 9)
    depth = np.clip(depth - 0.25 * bars, 0, 1)
    # the drowned backbone: a pale line along the floor of the strait
    depth = depth * (1 - 0.55 * capsule(X, Y + 10 * wob, 2080, 1552, 2990, 1560, 5, soft=0.9))

    # ---- colour of the ground ----
    tone = fbm(X, Y, 300, 51, max(texel, 4)); tone2 = fbm(X, Y, 36, 52, texel); grain = fbm(X, Y, 5, 53, texel, gain=0.6)
    low = mixc(col(0.085, 0.066, 0.05), col(0.055, 0.068, 0.05), smooth(-0.15, 0.2, tone + 0.5 * tone2))
    low = mixc(low, col(0.15, 0.085, 0.055), smooth(0.05, 0.3, tone2 - 0.4 * tone))
    low = mixc(low, col(0.035, 0.055, 0.04), 0.7 * moist)
    foot = col(0.24, 0.185, 0.14)
    pale = mixc(col(0.5, 0.445, 0.375), col(0.42, 0.40, 0.385), smooth(-0.2, 0.25, tone))
    white = col(0.82, 0.8, 0.77)
    e = h / 1.3
    c = mixc(low, foot, smooth(0.05, 0.16, e))
    c = mixc(c, pale, smooth(0.13, 0.33, e))
    c = mixc(c, white, smooth(0.62, 0.9, e + 0.12 * tone2) * smooth(0.9, 0.3, slope))
    c = c * (0.62 + 0.62 * hollow)[..., None] * (1 + 0.22 * tone2 + 0.16 * grain)[..., None]
    c = mixc(c, c * col(0.62, 0.6, 0.62), smooth(0.35, 0.8, slope))
    crust = mixc(col(0.02, 0.019, 0.02), col(0.045, 0.04, 0.038), smooth(-0.1, 0.25, tone2 + grain))
    c = mixc(c, crust * (0.7 + 0.6 * hollow)[..., None], np.clip(chest * 1.3, 0, 1) * smooth(0.2, 0.1, e))
    red = mixc(col(0.115, 0.045, 0.034), col(0.2, 0.075, 0.045), smooth(-0.1, 0.3, tone2))
    c = mixc(c, red * (0.7 + 0.6 * hollow)[..., None], np.clip(throat * 1.3, 0, 1) * smooth(0.22, 0.1, e))
    c = mixc(c, col(0.006, 0.008, 0.011), smooth(0.25, 0.7, pits))
    # the salt pan of the hips, with its red channels along the drainage of the pan
    cells = np.abs(fbm(X, Y, 9, 61, texel, gain=0.6))
    salt = mixc(col(0.72, 0.7, 0.68), col(0.8, 0.74, 0.72), smooth(0, 0.25, tone2)) * (0.9 + 0.5 * cells)[..., None]
    in_pan = np.clip(pan * 1.25, 0, 1) * smooth(0.16, 0.08, e)
    c = mixc(c, salt, in_pan)
    brine = np.clip(cv2.GaussianBlur((smooth(1.9, 3.1, np.log10(np.maximum(area_km, 1))) * land).astype(np.float32), (0, 0), max(1.2, 1.6 / texel)) * 2.2, 0, 1)
    pools = smooth(0.12, 0.2, fbm(X, Y, 48, 62, texel)) * smooth(0.3, 0.8, pan)
    c = mixc(c, mixc(col(0.36, 0.022, 0.03), col(0.2, 0.012, 0.02), smooth(0.4, 1, brine)), np.clip(np.maximum(brine, pools) * in_pan * 1.2, 0, 1))
    c = mixc(c, col(0.03, 0.075, 0.09), river * (1 - in_pan))
    c = mixc(c, col(0.42, 0.37, 0.29), 0.6 * np.exp(-to_sea / max(1.2, 1.5 * texel)) * smooth(0.6, 0.1, slope) * (1 - in_pan))

    # ---- colour of the water: what the light meets under the surface ----
    deep = col(0.006, 0.017, 0.04); teal = col(0.035, 0.2, 0.19); sand = col(0.22, 0.3, 0.24)
    w = mixc(teal, deep, np.power(depth, 0.55))
    w = mixc(w, sand, smooth(0.25, 0.0, depth) * 0.7)
    swx = X + 90 * fbm(X, Y, 260, 71, max(texel, 2)) + 22 * fbm(X, Y, 60, 72, texel)
    swy = Y + 90 * fbm(X, Y, 260, 73, max(texel, 2)) + 22 * fbm(X, Y, 60, 74, texel)
    streak = fbm(swx * 0.35, swy, 60, 75, texel, gain=0.6)
    silt = np.clip(cv2.GaussianBlur((river * land).astype(np.float32), (0, 0), max(2.0, 10 / texel)) * 6, 0, 1)
    plume = np.clip(silt * (0.6 + 1.4 * streak), 0, 1) * smooth(0.0, 0.3, depth)
    w = mixc(w, col(0.16, 0.19, 0.12), 0.6 * plume)
    stain_zone = blob(X, Y, 4480, 1660, 560, 230, soft=0.6, warp=wob) + 0.6 * blob(X, Y, 4300, 2150, 330, 150, soft=0.6, warp=wob) + 0.5 * blob(X, Y, 3500, 2200, 300, 150, soft=0.6, warp=wob)
    stain = np.clip(stain_zone * (0.45 + 2.6 * streak), 0, 1)
    w = mixc(w, mixc(col(0.2, 0.1, 0.03), col(0.3, 0.04, 0.025), smooth(0.3, 0.8, stain * blob(X, Y, 4350, 1650, 520, 150, soft=0.7))), 0.85 * stain)
    bloom = np.clip((fbm(swx, swy * 0.5, 110, 76, texel, gain=0.55) - 0.06) * 5, 0, 1) * np.clip(near * 4, 0, 1) * smooth(0.1, 0.6, depth)
    w = mixc(w, col(0.05, 0.11, 0.07), 0.45 * bloom)
    # the lake of the Eye: black-blue water inside a narrow amber shelf
    shelf_w = (1 - lake_d) * LAKE[2]
    amber = smooth(9.0, 1.0, shelf_w + 5 * fbm(swx, swy, 40, 77, texel, gain=0.6) + 2.0)
    lw = mixc(col(0.0037, 0.0103, 0.0252), col(0.3, 0.165, 0.03), amber)
    lw = mixc(lw, col(0.42, 0.3, 0.12), smooth(1.6, 0.0, shelf_w))
    in_lake = (lake_d < 1.06).astype(np.float32)
    w = mixc(w, lw, in_lake)
    depth = np.where(lake_d < 1.06, np.clip(smooth(0.0, 9.0, shelf_w) * 0.9 + 0.1, 0, 1), depth)
    # far from the land the sea is one colour, so the picture can end anywhere
    fade = smooth(0.0, 0.04, np.minimum(np.minimum(X - xs[0], xs[-1] - X) / width, np.minimum(Y - ys[0], ys[-1] - Y) / height))
    w = mixc(np.broadcast_to(deep, w.shape), w, fade)

    rgb = np.where(land[..., None], c, w)
    code = np.where(land, 0.56 + 0.44 * np.clip(h / 1.4, 0, 1), 0.44 * (1 - depth))
    data = np.stack([0.5 + 0.5 * nx, 0.5 + 0.5 * nz, code], -1)
    cv2.imwrite(os.path.join(OUT, f'ground-{name}.jpg'), cv2.cvtColor((srgb(rgb) * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 86])
    quality = 88
    while True:
        # no picture of the film may be over 3 MB
        cv2.imwrite(os.path.join(OUT, f'shape-{name}.jpg'), cv2.cvtColor((np.clip(data, 0, 1) * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, quality, cv2.IMWRITE_JPEG_SAMPLING_FACTOR, cv2.IMWRITE_JPEG_SAMPLING_FACTOR_444])
        if os.path.getsize(os.path.join(OUT, f'shape-{name}.jpg')) < 2_800_000: break
        quality -= 4
    # a lit look at it, for the maker only
    lit = np.clip(0.25 + 0.9 * (nx * 0.45 + inv * 0.83 + nz * -0.2), 0, 2)
    look = np.where(land[..., None], rgb * lit[..., None] * 1.3, rgb * 2.0)
    cv2.imwrite(os.path.join(WORK, f'look-{name}.jpg'), cv2.cvtColor((srgb(look) * 255).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 90])
    print(name, 'land share', float(land.mean()), 'h max', float(h.max()), 'sizes', os.path.getsize(os.path.join(OUT, f'ground-{name}.jpg')) // 1024, os.path.getsize(os.path.join(OUT, f'shape-{name}.jpg')) // 1024, flush=True)

for name in (args or ['a', 'b', 'c', 'd']):
    make(name)
