# Larger copies of the Reveal's maps, asked for by the Reveal's owner: at the wide key one texel of a 1672 px map covers 2.1 px of the frame.
# A map (src/map-<level>.png, 1672 x 941) is cut into 3 x 3 windows, each 0.4 of its width and height (668.8 x 376.4 px; neighbours share 167 px).
# Each window is enlarged to 2048 x 1152 and made again at full resolution by the image tool (prompt-levels.json: win.<level>, then tail),
# and its height picture by a second call from the new window (prompt h). A new window is 1672 x 941, so one px of it is 0.4 px of the map.
# join: every window is laid on the map by an affine fitted by ECC, tone-matched to the map (low frequencies only, so the map keeps its
# colours and its large forms) and joined by a multi-band (Laplacian pyramid) blend along seams that run down the middle of the overlaps:
# the method of references/drafts/working/tools/master.py, which built the approved master. The joined picture is 4180 x 2352 and is written
# 4096 px wide, the largest texture every target device takes.
#   python3 assets-src/reveal/maps/enlarge-maps.py rows a      prints the nine calls of a level as JSON (what the image tool is given)
#   python3 assets-src/reveal/maps/enlarge-maps.py crop a      writes out/work/tmp/rv/big/map-a-w<row><col>-in.png
#   python3 assets-src/reveal/maps/enlarge-maps.py keep a      stores the tool's PNGs (out/work/tmp/rv/big/map-a-w<row><col>.png, -h.png) under src/big/ as JPEG 95 and grey PNG
#   python3 assets-src/reveal/maps/enlarge-maps.py join a      writes public/assets/reveal/maps/map-a.jpg and map-a-h.png, updates maps.json, prints the fits
import json, os, sys
import numpy as np, cv2
from PIL import Image

HERE = 'assets-src/reveal/maps/'
SRC = HERE + 'src/'
BIG = SRC + 'big/'
OUT = 'public/assets/reveal/maps/'
TMP = 'out/work/tmp/rv/big/'
REAL = 'references/drafts/working/real/'
W, H = 1672, 941                 # a map and a window as the image tool returns them
K = 2.5                          # one px of a map is K px of the joined picture
MW, MH = int(W * K), int(H * K)  # 4180 x 2352
OUT_W = 4096
IN_W, IN_H = 2048, 1152          # the size of the picture handed to the image tool
OX = [0, (MW - W) // 2, MW - W]  # 0, 1254, 2508
OY = [0, (MH - H + 1) // 2, MH - H]  # 0, 706, 1411
SIGMA, LEVELS = 48.0, 6
WIN_REAL = {'a': 'orb-modis-arabia.jpg', 'b': 'orb-iss35-nile-sinai.jpg', 'c': 'orb-iss44-sinai.jpg', 'd': 'orb-iss44-sinai.jpg'}


def windows():
    return [(r, c, OX[c], OY[r]) for r in range(3) for c in range(3)]


def box(ox, oy):
    return (ox / K, oy / K, (ox + W) / K, (oy + H) / K)


def rows(level):
    p = json.load(open(HERE + 'prompt-levels.json'))
    out = []
    for r, c, ox, oy in windows():
        n = f'map-{level}-w{r}{c}'
        out.append({'name': n, 'in': TMP + n + '-in.png', 'real': REAL + WIN_REAL[level], 'prompt': p['win'][level] + p['winEnd'] + p['tail'], 'h': p['h'],
                    'png': TMP + n + '.png', 'hpng': TMP + n + '-h.png', 'colour': BIG + n + '.jpg', 'height': BIG + n + '-h.png'})
    return out


def crop(level):
    os.makedirs(TMP, exist_ok=True)
    p = Image.open(SRC + f'map-{level}.png').convert('RGB')
    assert p.size == (W, H), p.size
    for r, c, ox, oy in windows():
        p.transform((IN_W, IN_H), Image.EXTENT, box(ox, oy), Image.BICUBIC).save(TMP + f'map-{level}-w{r}{c}-in.png')
    print(level, 'nine windows of', [round(v, 1) for v in box(OX[1], OY[1])], '(the middle one) ->', TMP)


def keep(level):
    os.makedirs(BIG, exist_ok=True)
    for row in rows(level):
        c = Image.open(row['png']).convert('RGB')
        if c.size != (W, H): c = c.resize((W, H), Image.LANCZOS)
        c.save(row['colour'], quality=95, subsampling=0)
        if os.path.exists(row['hpng']):
            h = Image.open(row['hpng']).convert('L')
            if h.size != (W, H): h = h.resize((W, H), Image.LANCZOS)
            h.save(row['height'], optimize=True)
        print(row['name'], 'kept')


def gpyr(a, n):
    out = [a]
    for _ in range(n - 1): out.append(cv2.pyrDown(out[-1]))
    return out


def lpyr(a, n):
    g = gpyr(a, n)
    out = [g[i] - cv2.pyrUp(g[i + 1], dstsize=(g[i].shape[1], g[i].shape[0])) for i in range(n - 1)]
    out.append(g[-1])
    return out


def collapse(p):
    a = p[-1]
    for i in range(len(p) - 2, -1, -1): a = cv2.pyrUp(a, dstsize=(p[i].shape[1], p[i].shape[0])) + p[i]
    return a


def lum(a):
    return a if a.ndim == 2 else a @ np.array([0.114, 0.587, 0.299], np.float32)


def fit(ref, t):
    """The affine that lays window t on ref (both W x H, float32, BGR): fitted by ECC on blurred half-size luminance. Returns (2x3 warp, worst px moved at a corner, ok)."""
    a = cv2.resize(cv2.GaussianBlur(lum(ref), (0, 0), 4), (W // 2, H // 2), interpolation=cv2.INTER_AREA)
    b = cv2.resize(cv2.GaussianBlur(lum(t), (0, 0), 4), (W // 2, H // 2), interpolation=cv2.INTER_AREA)
    warp = np.eye(2, 3, dtype=np.float32)
    if a.std() < 1.5:   # open water: nothing to fit on, and nothing that a shift would show
        return warp, 0.0, False
    try:
        _, warp = cv2.findTransformECC(a, b, warp, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-7), None, 5)
    except cv2.error:
        return np.eye(2, 3, dtype=np.float32), 0.0, False
    warp[:, 2] *= 2
    corners = np.array([[0, 0, 1], [W, 0, 1], [0, H, 1], [W, H, 1]], np.float32)
    moved = float(np.abs(corners @ warp.T - corners[:, :2]).max())
    if moved > 40:      # a fit that far out is a failed fit, not a drift
        return np.eye(2, 3, dtype=np.float32), moved, False
    return warp, moved, True


def lay(t, warp):
    return cv2.warpAffine(t, warp, (W, H), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)


def join(level):
    parent = cv2.imread(SRC + f'map-{level}.png').astype(np.float32)
    assert parent.shape[:2] == (H, W), parent.shape
    pup = cv2.resize(parent, (MW, MH), interpolation=cv2.INTER_CUBIC)
    hp = cv2.imread(SRC + f'map-{level}-h.png', cv2.IMREAD_GRAYSCALE).astype(np.float32)
    if hp.shape != (H, W): hp = cv2.resize(hp, (W, H), interpolation=cv2.INTER_LANCZOS4)
    hup = cv2.resize(hp, (MW, MH), interpolation=cv2.INTER_CUBIC)
    wins = windows()
    # the partition: a px belongs to the window whose edge is furthest from it (edges on the border of the map do not count)
    wm = np.full((len(wins), MH, MW), -1.0, np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    big = 1e5
    for k, (r, c, ox, oy) in enumerate(wins):
        dl = xx if ox > 0 else np.full_like(xx, big)
        dr = (W - 1 - xx) if ox + W < MW else np.full_like(xx, big)
        dt = yy if oy > 0 else np.full_like(xx, big)
        db = (H - 1 - yy) if oy + H < MH else np.full_like(xx, big)
        wm[k, oy:oy + H, ox:ox + W] = np.minimum(np.minimum(dl, dr), np.minimum(dt, db))
    label = np.argmax(wm, 0)
    del wm
    acc, hacc, fits = None, None, []
    for k, (r, c, ox, oy) in enumerate(wins):
        n = f'map-{level}-w{r}{c}'
        t = cv2.imread(BIG + n + '.jpg').astype(np.float32)
        ref = pup[oy:oy + H, ox:ox + W]
        warp, moved, ok = fit(ref, t)
        t = lay(t, warp)
        t = t + cv2.GaussianBlur(ref - t, (0, 0), SIGMA)
        full = pup.copy(); full[oy:oy + H, ox:ox + W] = t
        m = (label == k).astype(np.float32)
        gm = gpyr(m, LEVELS)
        lp = lpyr(full, LEVELS)
        if acc is None: acc = [np.zeros_like(l) for l in lp]
        for i in range(LEVELS): acc[i] += lp[i] * gm[i][..., None]
        hmoved = None
        if os.path.exists(BIG + n + '-h.png'):
            h = cv2.imread(BIG + n + '-h.png', cv2.IMREAD_GRAYSCALE).astype(np.float32)
            # the height was made from the new window, so it is laid by the window's own fit; its shift against the window is measured and reported
            g0 = cv2.GaussianBlur(lum(cv2.imread(BIG + n + '.jpg').astype(np.float32)), (0, 0), 2)
            ga = np.hypot(cv2.Sobel(g0, cv2.CV_32F, 1, 0), cv2.Sobel(g0, cv2.CV_32F, 0, 1))
            g1 = cv2.GaussianBlur(h, (0, 0), 2)
            gb = np.hypot(cv2.Sobel(g1, cv2.CV_32F, 1, 0), cv2.Sobel(g1, cv2.CV_32F, 0, 1))
            (sx, sy), _ = cv2.phaseCorrelate(ga, gb, cv2.createHanningWindow((W, H), cv2.CV_32F))
            hmoved = round(float(np.hypot(sx, sy)), 2)
            h = lay(h, warp)
            href = hup[oy:oy + H, ox:ox + W]
            h = h + cv2.GaussianBlur(href - h, (0, 0), SIGMA)
        else:
            h = hup[oy:oy + H, ox:ox + W].copy()
        hfull = hup.copy(); hfull[oy:oy + H, ox:ox + W] = h
        hl = lpyr(hfull, LEVELS)
        if hacc is None: hacc = [np.zeros_like(l) for l in hl]
        for i in range(LEVELS): hacc[i] += hl[i] * gm[i]
        fits.append({'window': n, 'at': [ox, oy], 'fitted': ok, 'movedPx': round(moved, 2), 'heightShiftPx': hmoved, 'share': round(float(m.mean()), 3)})
        print(fits[-1])
    col = np.clip(collapse(acc), 0, 255)
    hei = np.clip(collapse(hacc), 0, 255)
    oh = int(round(OUT_W * MH / MW))
    col = cv2.resize(col, (OUT_W, oh), interpolation=cv2.INTER_AREA).astype(np.uint8)
    hei = cv2.resize(hei, (OUT_W, oh), interpolation=cv2.INTER_AREA).astype(np.uint8)
    Image.fromarray(col[..., ::-1]).save(OUT + f'map-{level}.jpg', quality=90, subsampling=0)
    Image.fromarray(hei, 'L').save(OUT + f'map-{level}-h.png', optimize=True)
    os.makedirs(TMP, exist_ok=True)
    cv2.imwrite(TMP + f'map-{level}-seams.png', cv2.resize((label * (255.0 / 8)).astype(np.uint8), (MW // 4, MH // 4), interpolation=cv2.INTER_NEAREST))
    json.dump({'level': level, 'joined': [MW, MH], 'written': [OUT_W, oh], 'sigma': SIGMA, 'levels': LEVELS, 'windows': fits}, open(BIG + f'map-{level}-join.json', 'w'), indent=1)
    d = json.load(open(OUT + 'maps.json'))
    for row in d['maps']:
        if row['name'] == f'map-{level}':
            row['width'], row['height'] = OUT_W, oh
            row['madeFrom'] = 'nine windows made again at 2.5 times and joined (assets-src/reveal/maps/enlarge-maps.py)'
    if 'sizes' not in d.get('note', ''):
        d['note'] += ' The maps differ in size: read width and height from each row. sizes: a map marked madeFrom was joined from nine windows and written 4096 px wide; the others are 1672 x 941.'
    json.dump(d, open(OUT + 'maps.json', 'w'), indent=1)
    print('written', OUT + f'map-{level}.jpg', (OUT_W, oh), os.path.getsize(OUT + f'map-{level}.jpg') // 1024, 'kB;', OUT + f'map-{level}-h.png', os.path.getsize(OUT + f'map-{level}-h.png') // 1024, 'kB')


if __name__ == '__main__':
    cmd, level = sys.argv[1], sys.argv[2]
    if cmd == 'rows': print(json.dumps(rows(level)))
    elif cmd == 'crop': crop(level)
    elif cmd == 'keep': keep(level)
    elif cmd == 'join': join(level)
