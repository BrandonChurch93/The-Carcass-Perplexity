#!/usr/bin/env python3
"""Layout for the new head of the titan: a human skull seen from the front, face up, crown toward frame left.

Paints the head, neck and throat flat over a window of the master (the old profile head is erased to ocean),
so the result can be handed to the image model as Image 1.

Design space = frame-3 pixels (master pixels minus the frame-3 origin).
usage: head_guide.py <master.png> <out.png> [x0 y0 w]     window in frame-3 px (default: the frame-2 window)
"""
import sys, math, json, numpy as np, cv2

R = '/home/user/workspace/r3'
F3_ORIGIN = (101, 827)                       # frame 3 in master px
F2_WIN = (145.0, 318.0, 860.0)               # frame 2 window in frame-3 px: x0, y0, width
OW, OH = 1672, 941

# ---- the skull, in frame-3 px
C = np.array([345.0, 545.0])                 # crown
CH = np.array([800.0, 490.0])                # chin
LEN = float(np.hypot(*(CH - C)))
AX = (CH - C) / LEN
PX = np.array([-AX[1], AX[0]])               # lateral, toward frame bottom
HW = 165.0                                   # half width of the skull
OUT_T = [0.00, 0.012, 0.04, 0.09, 0.16, 0.25, 0.33, 0.42, 0.485, 0.54, 0.60, 0.645, 0.69, 0.76, 0.84, 0.90, 0.95, 0.985, 1.00]
OUT_W = [0.00, 0.30, 0.52, 0.72, 0.88, 0.97, 1.00, 0.97, 0.90, 0.90, 0.95, 0.90, 0.80, 0.79, 0.74, 0.62, 0.46, 0.27, 0.00]
SOCK_T, SOCK_S, SOCK_R = 0.468, 0.43, 0.262  # socket centres (t, +-s) and radius in half widths
LAKE_SIDE = +1                               # the lake is the socket on the frame-bottom side


def to_xy(t, s):
    return C + AX * (t * LEN) + PX * (s * HW)


def frac(x): return x - np.floor(x)


def vnoise(x, y, seed=0.0):
    xi = np.floor(x); yi = np.floor(y); xf = x - xi; yf = y - yi
    sx = xf * xf * (3 - 2 * xf); sy = yf * yf * (3 - 2 * yf)
    h = lambda i, j: frac(np.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453)
    a = h(xi, yi); b = h(xi + 1, yi); c = h(xi, yi + 1); d = h(xi + 1, yi + 1)
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy


def fbm(x, y, f0=1.0, octv=5, seed=0.0, gain=0.5):
    s = 0; a = 1.0; n = 0; f = f0
    for k in range(octv):
        s = s + a * (vnoise(x * f + k * 17.3, y * f - k * 9.1, seed + k) * 2 - 1); n += a; a *= gain; f *= 2.03
    return s / n


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


def seg(x, y, a, b):
    ax, ay = a; bx, by = b; dx, dy = bx - ax, by - ay
    t = np.clip(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy + 1e-9), 0, 1)
    return np.hypot(x - (ax + t * dx), y - (ay + t * dy))


def paint(master, win):
    x0, y0, w = win
    sc = OW / w
    h = OH / sc
    mx0, my0 = x0 + F3_ORIGIN[0], y0 + F3_ORIGIN[1]
    M = np.float32([[sc, 0, -mx0 * sc], [0, sc, -my0 * sc]])
    base = cv2.warpAffine(master, M, (OW, OH), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
    yy, xx = np.mgrid[0:OH, 0:OW].astype(np.float32)
    X = xx / sc + x0; Y = yy / sc + y0                    # frame-3 px of every output pixel
    rgb = lambda r, g, b: np.array([b, g, r], np.float32)

    # ---- what is kept from the photograph: chest and shoulders
    keep = sstep(985, 1020, X)
    keep = np.maximum(keep, sstep(905, 930, X) * (1 - sstep(385, 405, Y)))
    keep = np.maximum(keep, sstep(885, 915, X) * sstep(615, 645, Y))

    # ---- ocean under everything that is rebuilt
    oc = rgb(22, 52, 98) * (1 + 0.10 * fbm(X, Y, 1 / 260.0, 4, 3.0)[..., None])
    cl = sstep(0.62, 0.80, 0.5 + 0.5 * fbm(X, Y, 1 / 22.0, 4, 9.0)) * sstep(0.45, 0.7, 0.5 + 0.5 * fbm(X, Y, 1 / 170.0, 3, 5.0))
    oc = oc + (rgb(235, 238, 240) - oc) * (0.55 * cl)[..., None]

    # ---- land: skull + neck
    T = ((X - C[0]) * AX[0] + (Y - C[1]) * AX[1]) / LEN
    Sg = ((X - C[0]) * PX[0] + (Y - C[1]) * PX[1]) / HW
    hw = np.interp(T, OUT_T, OUT_W, left=-1, right=-1)
    coast_n = 7.0 * fbm(X, Y, 1 / 34.0, 5, 21.0) + 3.0 * fbm(X, Y, 1 / 9.0, 3, 4.0)
    d_sk = (np.abs(Sg) - hw) * HW
    d_sk = np.where((T < 0) | (T > 1), 60.0, d_sk) + coast_n
    # neck: from under the chin to the shoulders, flaring
    ncy = np.interp(X, [760, 1010], [497, 478])
    nhw = np.interp(X, [760, 800, 900, 960, 1010], [70, 82, 104, 140, 190])
    d_nk = np.abs(Y - ncy) - nhw
    d_nk = np.where(X < 765, 60.0, d_nk) + coast_n
    d_land = np.minimum(d_sk, d_nk)
    land = sstep(1.5, -1.5, d_land)

    # shallows
    sh = sstep(26, 0, d_land) * (0.55 + 0.45 * (0.5 + 0.5 * fbm(X, Y, 1 / 40.0, 3, 8.0)))
    img = oc + (rgb(40, 150, 158) - oc) * (0.85 * sh)[..., None]

    # terrain colour
    n1 = fbm(X, Y, 1 / 55.0, 5, 1.0); n2 = fbm(X, Y, 1 / 14.0, 4, 2.0); rd = 1 - np.abs(fbm(X, Y, 1 / 30.0, 5, 6.0))
    tan = rgb(176, 138, 100); pale = rgb(212, 194, 166); dark = rgb(128, 100, 78); snow = rgb(242, 242, 240)
    col = tan + (pale - tan) * np.clip(0.55 + 0.9 * n1, 0, 1)[..., None]
    col = col + (dark - col) * np.clip(0.30 * (0.5 - n2) + 0.25 * (rd - 0.75) * 4, 0, 0.5)[..., None]
    # cranium is the pale high plateau; face and jaw a little warmer and lower
    cran = sstep(0.50, 0.36, T) * sstep(0.02, -0.25, d_sk / HW)
    col = col + (pale - col) * (0.55 * cran)[..., None]
    dome = np.exp(-(((T - 0.24) / 0.15) ** 2 + (Sg / 0.62) ** 2))
    col = col + (snow - col) * np.clip(dome * (0.25 + 1.3 * (rd - 0.62)), 0, 0.85)[..., None]
    # neck is lower, darker, greener desert
    neck = sstep(0, -30, d_nk) * sstep(770, 810, X)
    col = col + (rgb(142, 132, 104) - col) * (0.55 * neck * (1 - sstep(0.90, 1.0, T) * 0))[..., None]

    def blend(c, m):
        nonlocal col
        col = col + (c - col) * np.clip(m, 0, 1)[..., None]

    # ---- features of the face
    # brow ridge: one pale high bar across both sockets on the crown side
    # temporal hollows: darker flanks beside the sockets
    blend(dark, 0.5 * np.exp(-(((T - 0.46) / 0.07) ** 2 + ((np.abs(Sg) - 0.84) / 0.10) ** 2)))
    # cheekbones: pale ridges from under each socket out to the flank
    for sgn in (1, -1):
        a = to_xy(0.585, sgn * 0.30); b = to_xy(0.60, sgn * 0.86)
        blend(rgb(226, 216, 196), 0.55 * sstep(11, 2, seg(X, Y, a, b) + 4 * fbm(X, Y, 1 / 16.0, 3, 50.0)))
    # nose hollow: pear shaped, wide end toward the teeth
    nt = (T - 0.575) / 0.135
    nw = np.interp(nt, [0, 0.2, 0.55, 0.85, 1.0], [0.0, 0.07, 0.15, 0.17, 0.0], left=-1, right=-1)
    notch = 0.07 * sstep(0.72, 1.0, nt) * sstep(0.07, 0.0, np.abs(Sg))            # the little spine at the wide end
    nose = sstep(0.018, -0.018, (np.abs(Sg) - nw + notch) + 0.02 * fbm(X, Y, 1 / 10.0, 3, 77.0)) * (nt >= 0) * (nt <= 1)
    blend(rgb(52, 42, 38), 0.92 * nose)
    blend(rgb(110, 84, 66), 0.5 * nose * sstep(0.5, 1.0, nt))
    # teeth: two rows of blunt blocks across the face, a thin dark water gap between
    rng = np.random.RandomState(7)
    gap_t = 0.822
    gapw = 0.010 + 0.012 * sstep(-0.5, 0.6, Sg)            # the jaw hangs open a little more on one side
    mouth = sstep(0.004, -0.004, np.abs(T - gap_t) - gapw) * sstep(0.60, 0.50, np.abs(Sg))
    for row, (t0, t1, smax, n) in enumerate(((0.770, gap_t - 0.012, 0.50, 12), (gap_t + 0.014, 0.870, 0.45, 11))):
        edges = np.linspace(-smax, smax, n + 1) + np.r_[0, rng.uniform(-0.012, 0.012, n - 1), 0]
        for i in range(n):
            if rng.uniform() < 0.12: continue             # a missing tooth
            a, b = edges[i] + 0.012, edges[i + 1] - 0.012
            ln = rng.uniform(0.78, 1.0)
            ta, tb = (t0 + (t1 - t0) * (1 - ln), t1) if row == 0 else (t0, t0 + (t1 - t0) * ln)
            m = sstep(0.008, -0.004, np.maximum(np.maximum(a - Sg, Sg - b) * 0.36, np.maximum(ta - T, T - tb)))
            blend(rgb(232, 224, 204) * rng.uniform(0.9, 1.0), 0.9 * m)
    # ---- sockets
    for sgn in (1, -1):
        cx, cy = to_xy(SOCK_T, sgn * SOCK_S)
        r = np.hypot(X - cx, Y - cy); rr = SOCK_R * HW
        ang = np.arctan2(Y - cy, X - cx)
        inside = sstep(rr + 1.5, rr - 1.5, r)
        # pale cliff rim all round, highest toward the crown
        crown = np.cos(ang - math.atan2(-AX[1], -AX[0]))                       # 1 toward the crown
        wdt = 7 + 15 * sstep(-0.1, 0.8, crown)
        rim = sstep(rr + wdt, rr + wdt * 0.35, r) * sstep(rr - 2, rr + 2, r)
        blend(rgb(240, 234, 220), rim * (0.45 + 0.5 * sstep(-0.2, 0.7, crown)))
        if sgn == LAKE_SIDE:
            edge = rr * (0.80 + 0.06 * fbm(X, Y, 1 / 9.0, 3, 61.0))
            lake = rgb(14, 52, 104) + (rgb(186, 128, 52) - rgb(14, 52, 104)) * sstep(edge - rr * 0.10, edge + rr * 0.06, r)[..., None]
            # shadow of the brow on the water, on the crown side
            shd = sstep(rr * 0.70, rr * 0.98, r) * sstep(0.55, 0.95, np.cos(ang - math.atan2(-AX[1], -AX[0])))
            lake = lake * (1 - 0.55 * shd)[..., None]
            col = col + (lake - col) * inside[..., None]
        else:
            dry = rgb(58, 46, 40) + (rgb(150, 112, 80) - rgb(58, 46, 40)) * np.clip(0.5 + 0.9 * fbm(X, Y, 1 / 12.0, 4, 31.0), 0, 1)[..., None] * 0.55
            dry = dry * (1 - 0.45 * sstep(rr * 0.5, rr, r) * sstep(0.3, 0.95, np.cos(ang - math.atan2(-AX[1], -AX[0]))))[..., None]
            col = col + (dry - col) * inside[..., None]
    # outflow from the lake at its inner corner toward the nose and mouth (a thread)
    lk = to_xy(SOCK_T, LAKE_SIDE * SOCK_S)
    pts = [to_xy(SOCK_T + 0.05, LAKE_SIDE * (SOCK_S - 0.21)), to_xy(0.60, LAKE_SIDE * 0.20), to_xy(0.70, LAKE_SIDE * 0.24), to_xy(0.775, LAKE_SIDE * 0.30)]
    for a, b in zip(pts[:-1], pts[1:]):
        blend(rgb(70, 120, 130), 0.8 * sstep(2.4, 0.8, seg(X, Y, a, b)))
    # seams of the skull: thin zigzag canyons
    zz = 0.006 * np.sin(Sg * 44) + 0.004 * np.sin(Sg * 101 + 1.3) + 0.01 * fbm(X, Y, 1 / 18.0, 3, 90.0)
    blend(dark, 0.32 * sstep(0.005, 0.0015, np.abs(T - 0.255 - zz - 0.05 * Sg * Sg)) * sstep(0.95, 0.8, np.abs(Sg)))
    zz2 = 0.02 * np.sin(T * 130) + 0.012 * np.sin(T * 290 + 0.7) + 0.03 * fbm(X, Y, 1 / 18.0, 3, 91.0)
    blend(dark, 0.28 * sstep(0.024, 0.008, np.abs(Sg - zz2)) * sstep(0.03, 0.06, T) * sstep(0.26, 0.24, T))

    img = img + (col - img) * land[..., None]
    # mouth water on top of the land
    img = img + (rgb(24, 74, 96) - img) * (mouth * sstep(1.0, -3.0, d_sk))[..., None]

    # ---- throat flat with the airways
    fa, fb = (792.0, 497.0), (1012.0, 468.0)
    dfl = seg(X, Y, fa, fb) - np.interp(X, [790, 1010], [30, 46]) + 5 * fbm(X, Y, 1 / 26.0, 3, 12.0)
    flat = sstep(2, -2, dfl) * sstep(775, 790, X)
    fcol = rgb(178, 182, 182) * (1 + 0.05 * fbm(X, Y, 1 / 12.0, 3, 15.0)[..., None])
    img = img + (fcol - img) * flat[..., None]
    holes = [(816, 499, 6), (842, 488, 4), (872, 500, 11), (900, 478, 5), (934, 492, 14), (958, 468, 5), (980, 488, 8), (866, 476, 3), (916, 506, 4), (949, 508, 3)]
    for hx, hy, hr in holes:
        r = np.hypot(X - hx, Y - hy)
        img = img + (rgb(128, 26, 32) - img) * (0.85 * sstep(hr * 1.9, hr * 1.05, r))[..., None]
        img = img + (rgb(14, 12, 14) - img) * sstep(hr + 0.8, hr - 0.8, r)[..., None]
    # vapour: thin white, from the airways toward the top of the frame, joining the existing plume
    vp = [(940, 486), (890, 430), (835, 360), (800, 300), (790, 250)]
    v = np.zeros_like(X)
    for i, (a, b) in enumerate(zip(vp[:-1], vp[1:])):
        wd = 16 + 12 * i
        v = np.maximum(v, np.exp(-(seg(X, Y, a, b) / wd) ** 2))
    v = v * (0.45 + 0.55 * (0.5 + 0.5 * fbm(X, Y, 1 / 30.0, 4, 44.0)))
    img = img + (rgb(236, 236, 232) - img) * (0.50 * v)[..., None]

    out = base * keep[..., None] + img * (1 - keep[..., None])
    return np.clip(out, 0, 255).astype(np.uint8), dict(sc=sc, lake=[float(lk[0]), float(lk[1])], lake_r=SOCK_R * HW)


if __name__ == '__main__':
    master = cv2.imread(sys.argv[1]); out = sys.argv[2]
    win = tuple(float(v) for v in sys.argv[3:6]) if len(sys.argv) >= 6 else F2_WIN
    img, info = paint(master, win)
    cv2.imwrite(out, img)
    lk = info['lake']
    info.update(window_f3=list(win), lake_in_out=[(lk[0] - win[0]) * info['sc'], (lk[1] - win[1]) * info['sc']],
                lake_in_master=[lk[0] + F3_ORIGIN[0], lk[1] + F3_ORIGIN[1]])
    json.dump(info, open(out.replace('.png', '.json'), 'w'), indent=1)
    print(out, info)
