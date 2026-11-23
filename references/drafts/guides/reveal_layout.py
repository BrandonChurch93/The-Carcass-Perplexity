#!/usr/bin/env python3
"""Layout study for Shot 7, The Reveal. Drawn from nothing in code: no round-1 input and no generated image.
A body-shaped landmass (figure asleep on its side, head left, back along the far coast) is built from capsules,
its coast roughened with fractal noise, coloured by region, wrapped on a sphere and lit at dusk.
usage: reveal_layout.py <out-base> <a|b>  ->  <out-base>.jpg (soft guide) and <out-base>-sharp.jpg (for checking)"""
import sys, math, numpy as np
from PIL import Image, ImageDraw, ImageFilter
out, var = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'a')
W, H = 1920, 1080
P = {'a': dict(Rk=1.00, top=70, cyc=640, S=0.56, tilt=4, sun=(0.80, -0.15, 0.35), blur=3.0),
     'b': dict(Rk=0.84, top=96, cyc=640, S=0.60, tilt=-7, sun=(0.74, -0.22, 0.40), blur=3.0),
     'c': dict(Rk=1.00, top=70, cyc=640, S=0.56, tilt=4, sun=(0.80, -0.15, 0.35), blur=2.4),
     'd': dict(Rk=0.84, top=96, cyc=640, S=0.60, tilt=-7, sun=(0.74, -0.22, 0.40), blur=2.4)}[var]
FINE = var in ('c', 'd')   # second pass: smaller features and softer glows, after a judge called the first pass diorama-scale
F = np.float32

def vnoise(x, y, seed):
    T = np.random.default_rng(seed).random((256, 256)).astype(F)
    xi = np.floor(x).astype(np.int64); yi = np.floor(y).astype(np.int64); xf = (x - xi).astype(F); yf = (y - yi).astype(F)
    sx = xf * xf * (3 - 2 * xf); sy = yf * yf * (3 - 2 * yf)
    a = T[yi & 255, xi & 255]; b = T[yi & 255, (xi + 1) & 255]; c = T[(yi + 1) & 255, xi & 255]; d = T[(yi + 1) & 255, (xi + 1) & 255]
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy
def fbm(x, y, seed, octaves=5):
    s = 0; amp = 1.0; tot = 0
    for i in range(octaves):
        s = s + amp * vnoise(x, y, seed + i); tot += amp; x = x * 2.03 + 17.3; y = y * 2.03 + 9.1; amp *= 0.5
    return s / tot
def sstep(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def mix(a, b, t): return a + (np.asarray(b, F) - a) * t[..., None]
def smin(a, b, k=0.025): h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h)

# ---------- screen -> sphere -> body map ----------
R = P['Rk'] * W; cx = W / 2; cy = P['top'] + R
py, px = np.mgrid[0:H, 0:W].astype(F)
X = (px - cx) / R; Y = (py - cy) / R; rr = X * X + Y * Y; disc = rr < 1; Z = np.sqrt(np.clip(1 - rr, 0, 1))
yc = (P['cyc'] - cy) / R; zc = math.sqrt(1 - yc * yc)
Yp = Y * zc - Z * yc; Zp = Y * yc + Z * zc
th = np.arccos(np.clip(Zp, -1, 1)); rho = np.sqrt(X * X + Yp * Yp) + 1e-9
u = th * X / rho / P['S']; v = th * Yp / rho / P['S']
a = math.radians(P['tilt']); bx = u * math.cos(a) + v * math.sin(a) + 0.035; by = (-u * math.sin(a) + v * math.cos(a)) / 1.15 + 0.04
wx = bx + 0.05 * (fbm(bx * 3.1 + 5, by * 3.1 + 2, 11, 4) - 0.5); wy = by + 0.05 * (fbm(bx * 3.1 + 9, by * 3.1 + 7, 23, 4) - 0.5)

# ---------- the body as a signed distance ----------
def chain(pts, radii, n=12):
    d = np.full(wx.shape, 9.0, F)
    for p, q, r0, r1 in zip(pts[:-1], pts[1:], radii[:-1], radii[1:]):
        for t in np.linspace(0, 1, n):
            d = np.minimum(d, np.hypot(wx - (p[0] + (q[0] - p[0]) * t), wy - (p[1] + (q[1] - p[1]) * t)) - (r0 + (r1 - r0) * t))
    return d
head = (np.sqrt(((wx + 0.665) / 0.105) ** 2 + ((wy + 0.03) / 0.098) ** 2) - 1) * 0.098
brow = np.hypot(wx + 0.708, wy - 0.052) - 0.03
jaw = np.hypot(wx + 0.632, wy - 0.058) - 0.042
neck = chain([(-0.585, -0.03), (-0.50, -0.07)], [0.058, 0.08], 8)
torso = chain([(-0.42, -0.08), (-0.33, -0.085), (-0.13, -0.08), (0.04, -0.055)], [0.135, 0.152, 0.115, 0.135])
arm = chain([(-0.45, 0.0), (-0.335, 0.265), (-0.575, 0.228), (-0.655, 0.178)], [0.058, 0.046, 0.032, 0.022])
leg1 = chain([(0.06, -0.02), (0.335, 0.255), (0.69, 0.105), (0.745, 0.205)], [0.095, 0.067, 0.043, 0.027])
leg2 = chain([(0.08, -0.075), (0.43, 0.06), (0.75, -0.085), (0.815, -0.005)], [0.085, 0.059, 0.039, 0.025])
d = head
for part in (brow, jaw, neck, torso, arm, leg1, leg2): d = smin(d, part)
for (ix_, iy_, ir) in [(-0.694, 0.152, 0.012), (-0.710, 0.180, 0.011), (-0.696, 0.207, 0.010), (0.762, 0.235, 0.012), (0.780, 0.212, 0.010), (0.737, 0.245, 0.011),
                       (0.842, 0.022, 0.011), (0.857, -0.002, 0.009), (-0.80, -0.16, 0.014), (0.45, -0.20, 0.017), (0.10, 0.40, 0.013), (-0.12, 0.33, 0.010), (0.93, 0.12, 0.012), (-0.30, -0.33, 0.011)]:
    d = np.minimum(d, np.hypot(wx - ix_, wy - iy_) - ir)
nz = lambda f, sd, o: (fbm(wx * f, wy * f, sd, o) - 0.5) / 0.17
d = d + 0.021 * nz(4.5, 31, 5) + 0.010 * nz(15, 47, 4) + 0.005 * nz(48, 59, 3)
land = (d < 0) & disc
n1 = fbm(wx * 7, wy * 7, 61, 5); n2 = fbm(wx * 26, wy * 26, 67, 4); n3 = fbm(wx * 60, wy * 60, 83, 3)
hgt = np.clip(-d / 0.14, 0, 1) * (0.45 + 1.0 * n1) + 0.15 * n2

def blob(cx_, cy_, rx, ry, soft, wob=0.35, seed=91):
    e = np.sqrt(((wx - cx_) / rx) ** 2 + ((wy - cy_) / ry) ** 2) + wob * (fbm(wx * 9, wy * 9, seed, 4) - 0.5)
    return np.clip((1 - e) / soft, 0, 1)

# ---------- line features drawn on a flat body raster and sampled ----------
K = 2000; RW, RH = 2 * K, K
def to_r(p): return ((p[0] + 1) * K, (p[1] + 0.5) * K)
def sample(img): 
    A = np.asarray(img, F) / 255
    return A[np.clip(((wy + 0.5) * K).astype(np.int64), 0, RH - 1), np.clip(((wx + 1) * K).astype(np.int64), 0, RW - 1)]
rng = np.random.default_rng(5)
HEART = (-0.285, 0.0)
lava = Image.new('L', (RW, RH), 0); dr = ImageDraw.Draw(lava)
def artery(p, ang, steps, wid, depth=0):
    pts = [p]
    for i in range(steps):
        ang += rng.normal(0, 0.28); p = (p[0] + 0.0085 * math.cos(ang), p[1] + 0.0085 * math.sin(ang)); pts.append(p)
        if depth < 2 and i > 2 and rng.random() < 0.20: artery(p, ang + rng.choice([-1, 1]) * rng.uniform(0.5, 1.0), int(steps * 0.55), max(2, wid * 0.6), depth + 1)
    for i in range(len(pts) - 1):
        w_ = max(2, int(wid * (1 - 0.7 * i / len(pts)))); dr.line([to_r(pts[i]), to_r(pts[i + 1])], fill=255, width=w_)
for ang0, st0 in [(2.2, 15), (3.1, 9), (3.9, 12), (0.8, 13), (5.3, 8), (0.1, 10), (1.5, 6)]: artery(HEART, ang0 + rng.uniform(-0.2, 0.2), st0, 6 if FINE else 13)
hx, hy = to_r(HEART); k_ = 0.55 if FINE else 1.0; dr.ellipse([hx - 44 * k_, hy - 30 * k_, hx + 30 * k_, hy + 34 * k_], fill=255); dr.ellipse([hx - 10 * k_, hy - 44 * k_, hx + 52 * k_, hy + 12 * k_], fill=255)
lava_core = sample(lava.filter(ImageFilter.GaussianBlur(2))); lava_glow = sample(lava.filter(ImageFilter.GaussianBlur(26))); lava_far = sample(lava.filter(ImageFilter.GaussianBlur(80)))

SPINE = [(-0.555, -0.115), (-0.45, -0.185), (-0.33, -0.212), (-0.13, -0.172), (0.04, -0.165), (0.15, -0.115)]
def along(poly, n):
    seg = [math.dist(poly[i], poly[i + 1]) for i in range(len(poly) - 1)]; tot = sum(seg); res = []
    for k in range(n):
        s = tot * k / (n - 1); i = 0
        while i < len(seg) - 1 and s > seg[i]: s -= seg[i]; i += 1
        t = s / seg[i]; res.append((poly[i][0] + (poly[i + 1][0] - poly[i][0]) * t, poly[i][1] + (poly[i + 1][1] - poly[i][1]) * t))
    return res
peaks = Image.new('L', (RW, RH), 0); dp = ImageDraw.Draw(peaks)
for i, p in enumerate(along(SPINE, 27)):
    x_, y_ = to_r(p); r_ = 15 if i % 2 == 0 else 12; dp.ellipse([x_ - r_ * 0.75, y_ - r_, x_ + r_ * 0.75, y_ + r_], fill=255)
peaks_s = sample(peaks.filter(ImageFilter.GaussianBlur(3)))
storm = Image.new('L', (RW, RH), 0); ds = ImageDraw.Draw(storm); sp = along(SPINE, 60)[7:52]
for p in sp:
    x_, y_ = to_r((p[0], p[1] - 0.012)); r_ = rng.uniform(70, 125); ds.ellipse([x_ - r_, y_ - r_ * 0.8, x_ + r_, y_ + r_ * 0.8], fill=255)
storm_s = sample(storm.filter(ImageFilter.GaussianBlur(38)))
bolt = Image.new('L', (RW, RH), 0); db = ImageDraw.Draw(bolt)
for j in [3, 10, 15, 23, 29, 36, 41]:
    p = sp[j]; q = (p[0] + rng.uniform(-0.015, 0.015), p[1] - 0.012 + rng.uniform(-0.025, 0.02)); x_, y_ = to_r(q); r_ = rng.uniform(9, 22)
    db.ellipse([x_ - r_ * 1.5, y_ - r_, x_ + r_ * 1.5, y_ + r_], fill=255); pts = [(x_, y_)]
    for k in range(int(rng.integers(4, 8))): pts.append((pts[-1][0] + rng.uniform(-34, 34), pts[-1][1] + rng.uniform(6, 30)))
    db.line(pts, fill=255, width=4)
bolt_core = sample(bolt.filter(ImageFilter.GaussianBlur(9))); bolt_glow = sample(bolt.filter(ImageFilter.GaussianBlur(45)))

# ---------- albedo ----------
sea = mix(np.zeros((H, W, 3), F) + np.array([0.010, 0.040, 0.080], F), [0.03, 0.20, 0.25], sstep(0.05, 0.0, d) * 0.8)
jung = mix(np.zeros((H, W, 3), F) + np.array([0.020, 0.14, 0.045], F), [0.13, 0.44, 0.10], np.clip(n1 * 1.7 - 0.4, 0, 1)) * (0.75 + 0.5 * n2[..., None])
jung = mix(jung, [0.30, 0.36, 0.14], sstep(0.75, 1.1, hgt) * 0.6)                        # uplands a little paler
chest = blob(-0.33, -0.08, 0.175, 0.165, 0.3)
jung = mix(jung, [0.16, 0.52, 0.10], chest * 0.45)                                        # the rib jungle is the lushest green
s_ = (wy + 0.215) / 0.265; xr = wx - 0.05 * np.sin(np.pi * np.clip(s_, 0, 1)) - 0.02 * s_ + 0.006 * (fbm(wx * 12, wy * 12, 163, 3) - 0.5)
ribi = (xr + 0.478) / 0.036; ribd = np.abs((ribi + 0.5) % 1 - 0.5) * 0.036
ribs = sstep(0.013 if FINE else 0.0075, 0.003, ribd) * ((ribi > -0.5) & (ribi < 7.5) & (s_ > 0.06) & (s_ < 0.97)) * sstep(0.36, 0.52, fbm(wx * 22, wy * 22, 97, 3) + 0.2 * chest)
jung = mix(jung, [0.52, 0.60, 0.36] if FINE else [0.66, 0.66, 0.50], ribs * (0.55 if FINE else 0.62))
marsh = blob(-0.065, -0.045, 0.175, 0.125, 0.35, seed=101)
marsh_c = mix(np.zeros((H, W, 3), F) + np.array([0.22, 0.01, 0.035], F), [0.70, 0.05, 0.09], np.clip(n2 * 1.8 - 0.4, 0, 1))
marsh_c = mix(marsh_c, [0.03, 0.30, 0.30], sstep(0.62, 0.70, n3) * 0.5)                   # teal flecks
landc = mix(jung, marsh_c, marsh)
ice = blob(-0.665, 0.135, 0.15, 0.115, 0.4, seed=107)
ice_c = mix(np.zeros((H, W, 3), F) + np.array([0.55, 0.74, 0.93], F), [0.88, 0.95, 1.0], n2)
landc = mix(landc, ice_c, ice)
rock = sstep(0.0, 0.6, sample(lava.filter(ImageFilter.GaussianBlur(85 if FINE else 60))) * (9.0 if FINE else 3.0))
landc = mix(landc, [0.035, 0.028, 0.03], rock * 0.9)                                      # black glass rock around the heart
landc = mix(landc, [0.50, 0.46, 0.56], np.clip(peaks_s * 1.2, 0, 1))                       # vertebra peaks
e_eye = np.hypot(wx + 0.678, wy + 0.008)
landc = mix(landc, [0.02, 0.02, 0.07], sstep(0.034, 0.028, e_eye))
bleed = blob(-0.05, 0.10, 0.22, 0.16, 0.6, seed=113)
sea = mix(sea, [0.34, 0.02, 0.06], bleed * 0.85 * (np.clip(0.25 + 2.2 * (fbm(wx * 7 + 3 * n1, wy * 7 + 3 * n2, 173, 4) - 0.3), 0, 1.15) if FINE else 1.0))
floe = sstep(0.55, 0.61, fbm(wx * 45, wy * 45, 127, 3)) * ice
sea = mix(sea, [0.05, 0.13, 0.22], ice * 0.7); sea = mix(sea, ice_c, floe * 0.9)
alb = np.where(land[..., None], landc, sea)
dhx = np.roll(hgt, -3, axis=1) - np.roll(hgt, 3, axis=1); dhy = np.roll(hgt, -3, axis=0) - np.roll(hgt, 3, axis=0)
alb = alb * np.where(land, np.clip(1 - 5.0 * dhx + 2.0 * dhy, 0.5, 1.6), 1)[..., None]
cf = 1.9 if FINE else 1.0; cloudn = fbm(X * 24 * cf + 3, Y * 40 * cf + 1, 71, 6) * 0.6 + fbm(X * 7 * cf + 9, Y * 11 * cf + 4, 73, 4) * 0.4
keep = np.clip(1 - sstep(0.16, 0.02, d) * 0.92, 0, 1)
cloud = np.clip((cloudn - 0.56) * 7, 0, 1) * keep * 0.7
alb = mix(alb, [0.92, 0.93, 0.96], cloud)
storm_m = np.clip(storm_s * 1.7 * np.clip((fbm(wx * (36 if FINE else 17), wy * (36 if FINE else 17), 131, 5) - 0.22) * 2.6, 0, 1.3), 0, 1)
storm_c = mix(np.zeros((H, W, 3), F) + np.array([0.10, 0.07, 0.18], F), [0.47, 0.36, 0.62], fbm(wx * 24, wy * 24, 137, 4))
alb = mix(alb, storm_c, storm_m * (1 - 0.75 * np.clip(peaks_s * 1.3, 0, 1)))

# ---------- dusk light ----------
L = np.array(P['sun'], F); L = L / np.linalg.norm(L); ndl = X * L[0] + Y * L[1] + Z * L[2]
day = sstep(-0.32, 0.38, ndl)
tint = mix(np.zeros((H, W, 3), F) + np.array([1.0, 0.74, 0.50], F), [1.0, 0.96, 0.90], sstep(0.2, 0.9, day))
img = alb * (day[..., None] * tint * 1.15 + (1 - day[..., None]) * np.array([0.20, 0.26, 0.40], F))
haze = (1 - Z) ** 4
img = mix(img, [0.16, 0.38, 0.85], np.clip(haze * 0.9 * (0.12 + 0.88 * day), 0, 1))
img = img + ice[..., None] * (1 - day[..., None]) * (np.where(land, 1.0, 0.5) + floe)[..., None] * np.array([0.10, 0.26, 0.24], F)   # aurora light on the ice

# ---------- things that glow ----------
dim = (0.6 + 0.4 * (1 - day))[..., None]
img += dim * (lava_far[..., None] * np.array([0.9, 0.20, 0.02], F) * 1.0 + lava_glow[..., None] * np.array([1.0, 0.36, 0.03], F) * 1.5 + lava_core[..., None] * np.array([1.0, 0.55, 0.12], F) * 1.0) * (0.25 + 0.75 * land)[..., None]
iris = sstep(0.011, 0.016, e_eye) * sstep(0.032, 0.026, e_eye) * (0.7 + 0.6 * np.abs(np.sin(np.arctan2(wy + 0.008, wx + 0.678) * 14)))
if FINE: iris = sstep(0.007, 0.013, e_eye) * sstep(0.031, 0.018, e_eye) * 0.75
img += dim * (iris[..., None] * np.array([1.0, 0.76, 0.20], F) * 1.4 + np.exp(-(e_eye / 0.055) ** 2)[..., None] * np.array([0.9, 0.6, 0.12], F) * 0.45 * (e_eye > 0.03)[..., None])
img += dim * (bolt_core[..., None] * np.array([1.0, 0.95, 0.78], F) * (1.3 if FINE else 2.2) + bolt_glow[..., None] * np.array([0.85, 0.70, 1.0], F) * 1.3)
# aurora: a ribbon on the surface in map space, lifted into a curtain by smearing it up the screen
ra = np.hypot(bx + 1.06, by - 0.11); phi = np.arctan2(by - 0.11, bx + 1.06)
wav = 0.035 * (fbm(phi * 5 + 3, phi * 0 + 1, 149, 4) - 0.5)
rib1 = np.exp(-((ra - 0.40 - wav) / (0.020 if FINE else 0.010)) ** 2) * sstep(1.0, 0.55, np.abs(phi + 0.12)) * (0.35 + 1.1 * fbm(phi * 16, phi * 0 + 4, 151, 3))
rib2 = np.exp(-((ra - 0.475 + wav) / (0.016 if FINE else 0.008)) ** 2) * sstep(0.8, 0.4, np.abs(phi + 0.3)) * (0.2 + 0.8 * fbm(phi * 13, phi * 0 + 8, 157, 3)) * 0.6
rib = (rib1 + rib2) * disc
aur = np.zeros((H, W, 3), F); hgt_px = int((64 if FINE else 40) * P['Rk'])
for k in range(hgt_px):
    t = k / hgt_px; sh = np.roll(rib, -k, axis=0); sh[H - k:, :] = 0
    c = np.array([0.15, 1.0, 0.45], F) * (1 - t) + np.array([0.62, 0.25, 1.0], F) * t
    aur += sh[..., None] * c * ((1 - t) ** 1.3) * (3.4 / hgt_px) * 1.0
img += aur * (0.55 + 0.45 * (1 - day))[..., None] * (0.55 if FINE else 1.25)

# ---------- space, atmosphere, stars ----------
rad = np.sqrt(rr); out_m = ~disc
atm = np.exp(-np.clip(rad - 1, 0, None) * R / 9.0) * (0.25 + 0.75 * sstep(-0.35, 0.5, ndl + 0.0 * rad))
space = np.zeros((H, W, 3), F) + np.array([0.004, 0.005, 0.010], F)
st = np.random.default_rng(3).random((H, W)); space += (st > 0.9993)[..., None] * np.random.default_rng(4).uniform(0.3, 1.0, (H, W, 1)).astype(F)
space += atm[..., None] * np.array([0.30, 0.58, 1.0], F) * 1.1
img = np.where(out_m[..., None], space, img)
edge = np.exp(-((1 - rad) * R / 5.0) ** 2) * disc * (0.2 + 0.8 * day)
img += edge[..., None] * np.array([0.35, 0.60, 1.0], F) * 0.8
img = np.clip(img, 0, 1) ** (1 / 1.12)
im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
im.save(out + '-sharp.jpg', quality=92)
g = im.filter(ImageFilter.GaussianBlur(P['blur']))
ga = np.asarray(g, F) + np.random.default_rng(9).normal(0, 3.0, (H, W, 1)).astype(F)
Image.fromarray(np.clip(ga, 0, 255).astype(np.uint8)).save(out + '.jpg', quality=90)
print('wrote', out + '.jpg', out + '-sharp.jpg', 'land fraction', float(land.mean()))
