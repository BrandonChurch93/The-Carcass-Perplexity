#!/usr/bin/env python3
"""Procedural layout map of the titan continent (the reveal redo).

Everything is defined in 'head units' in the titan's own frame:
  u runs from the crown of the skull (0) to the soles (7.5); v is lateral, +v = the titan's left = frame top.
The same functions render any window of the world, so the four pull-back frames are four windows on one map.

usage: guide.py <out.png> <frame name | cu cv width_heads> [W] [--plain] [--marks]
"""
import numpy as np, sys, math, json
from PIL import Image, ImageFilter, ImageDraw

TH = math.radians(8.0)      # tilt of the body in the frame: feet upper right
U0 = 3.75                    # pivot (pelvis)
FRAMES = {                   # centre (u, v) in head units, width in head units
    'f4': (3.80, 0.02, 11.2),
    'f3': (0.62, 0.02, 3.40),
    'f2': (0.50, 0.08, 1.90),
    'f1': (0.50, 0.215, 0.55),
}
EYE = (0.50, 0.215, 0.105)   # lake centre and radius

def frac(x): return x - np.floor(x)
def vnoise(x, y, seed=0.0):
    xi = np.floor(x); yi = np.floor(y); xf = x - xi; yf = y - yi
    sx = xf * xf * (3 - 2 * xf); sy = yf * yf * (3 - 2 * yf)
    h = lambda i, j: frac(np.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453)
    a = h(xi, yi); b = h(xi + 1, yi); c = h(xi, yi + 1); d = h(xi + 1, yi + 1)
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy
def fbm(x, y, f0=1.0, octv=6, seed=0.0, gain=0.5, lac=2.03):
    s = 0; a = 1.0; n = 0; f = f0
    for k in range(octv):
        s = s + a * (vnoise(x * f + k * 17.3, y * f - k * 9.1, seed + k) * 2 - 1); n += a; a *= gain; f *= lac
    return s / n
def ridged(x, y, f0=1.0, octv=5, seed=0.0):
    s = 0; a = 1.0; n = 0; f = f0
    for k in range(octv):
        s = s + a * (1 - np.abs(vnoise(x * f + k * 13.1, y * f + k * 7.7, seed + k) * 2 - 1)); n += a; a *= 0.5; f *= 2.07
    return s / n
def seg(u, v, a, b, ra, rb=None):
    rb = ra if rb is None else rb
    ax, ay = a; bx, by = b; dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0: return np.hypot(u - ax, v - ay) - ra
    t = np.clip(((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    return np.hypot(u - (ax + t * dx), v - (ay + t * dy)) - (ra + t * (rb - ra))
def pdist(u, v, pts):
    d = None
    for a, b in zip(pts[:-1], pts[1:]):
        s = seg(u, v, a, b, 0.0)
        d = s if d is None else np.minimum(d, s)
    return d
def smin(a, b, k=0.06):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b + (a - b) * h - k * h * (1 - h)
def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

# ---- skeleton of the pose (head units)
SH_L, EL_L, WR_L, TIP_L = (1.50, 1.05), (2.73, 1.91), (3.86, 2.32), (4.66, 2.55)
SH_R, EL_R, WR_R, TIP_R = (1.50, -1.05), (2.36, -2.28), (3.56, -2.38), (4.38, -2.22)
HIP_L, KN_L, AN_L, TOE_L = (3.92, 0.45), (5.57, 0.75), (7.15, 1.02), (7.47, 1.80)
HIP_R, KN_R, AN_R, TOE_R = (3.92, -0.45), (5.29, -1.43), (6.88, -1.29), (7.35, -2.10)
TW_U = [1.12, 1.22, 1.36, 1.50, 1.75, 2.10, 2.50, 2.85, 3.10, 3.32, 3.58, 3.85, 4.05, 4.16]
TW_W = [0.20, 0.30, 0.74, 1.08, 0.96, 0.90, 0.86, 0.76, 0.64, 0.68, 0.84, 0.87, 0.80, 0.60]
def torso_w(u): return np.interp(u, TW_U, TW_W)

def fingers(u, v, wrist, tip, n=5, spread=0.78, length=0.50, palm=0.40, r=0.043, seed=0):
    """palm + n uneven finger capes fanning from the knuckles; some are cut off from the palm as islets"""
    rng = np.random.RandomState(100 + seed)
    wx, wy = wrist; tx, ty = tip; L = math.hypot(tx - wx, ty - wy); ax, ay = (tx - wx) / L, (ty - wy) / L
    nx, ny = -ay, ax
    kx, ky = wx + ax * palm * L, wy + ay * palm * L
    d = seg(u, v, wrist, (kx, ky), 0.115, 0.15)
    for i in range(n):
        f = (i - (n - 1) / 2) / ((n - 1) / 2)             # -1..1
        ang = f * spread * 0.5
        bx, by = kx + nx * f * 0.135, ky + ny * f * 0.135
        dx, dy = ax * math.cos(ang) - ay * math.sin(ang), ay * math.cos(ang) + ax * math.sin(ang)
        ln = L * length * (1.0 - 0.22 * abs(f) - (0.10 if i in (0, n - 1) else 0)) * rng.uniform(0.62, 1.12)
        if i == 0: ln *= 0.8                                # thumb side shorter and more splayed
        rr = r * rng.uniform(0.75, 1.35); bend = rng.uniform(-0.16, 0.16)
        mx, my = bx + dx * ln * 0.55, by + dy * ln * 0.55
        ex, ey = mx + (dx * math.cos(bend) - dy * math.sin(bend)) * ln * 0.45, my + (dy * math.cos(bend) + dx * math.sin(bend)) * ln * 0.45
        if rng.uniform() < 0.34:                            # a drowned finger: a short stub and a chain of islets
            d = smin(d, seg(u, v, (bx, by), (bx + dx * ln * 0.30, by + dy * ln * 0.30), rr, rr * 0.8), 0.025)
            for t in (0.52, 0.74, 0.95):
                d = np.minimum(d, np.hypot(u - (bx + dx * ln * t), v - (by + dy * ln * t)) - rr * rng.uniform(0.45, 0.8))
        else:
            d = smin(d, seg(u, v, (bx, by), (mx, my), rr, rr * 0.85), 0.025)
            d = smin(d, seg(u, v, (mx, my), (ex, ey), rr * 0.85, rr * 0.6), 0.02)
    return d

def body_sdf(u, v):
    # skull in profile: crown toward -u, face toward +v, jaw dropped
    cr = np.sqrt(((u - 0.33) / 0.335) ** 2 + ((v + 0.035) / 0.405) ** 2) - 1.0
    d = cr * 0.33
    d = smin(d, seg(u, v, (0.40, 0.25), (0.80, 0.285), 0.125, 0.105), 0.05)          # face: brow to upper teeth
    d = smin(d, seg(u, v, (0.60, -0.03), (0.60, 0.26), 0.05, 0.04), 0.04)            # cheekbone arch
    d = smin(d, seg(u, v, (0.66, -0.05), (0.99, -0.03), 0.075, 0.07), 0.04)          # jaw ramus
    d = smin(d, seg(u, v, (0.99, -0.03), (1.11, 0.33), 0.07, 0.062), 0.03)           # jaw body to chin
    d = smin(d, seg(u, v, (0.62, -0.17), (1.40, -0.05), 0.185, 0.235), 0.07)          # neck
    # torso from a width profile
    tor = np.maximum(np.abs(v) - torso_w(u), np.maximum(1.12 - u, u - 4.16))
    d = smin(d, tor, 0.06)
    # arms
    for sh, el, wr, tip in ((SH_L, EL_L, WR_L, TIP_L), (SH_R, EL_R, WR_R, TIP_R)):
        d = smin(d, seg(u, v, sh, el, 0.245, 0.165), 0.09)
        d = smin(d, seg(u, v, el, el, 0.175), 0.04)
        d = smin(d, seg(u, v, el, wr, 0.17, 0.105), 0.04)
        d = smin(d, fingers(u, v, wr, tip, seed=int(abs(wr[1]) * 100)), 0.03)
    # legs
    for hip, kn, an, toe in ((HIP_L, KN_L, AN_L, TOE_L), (HIP_R, KN_R, AN_R, TOE_R)):
        d = smin(d, seg(u, v, hip, kn, 0.385, 0.215), 0.07)
        d = smin(d, seg(u, v, kn, kn, 0.225), 0.04)
        d = smin(d, seg(u, v, kn, an, 0.235, 0.12), 0.04)
        hx, hy = an; tx, ty = toe; L = math.hypot(tx - hx, ty - hy); ax, ay = (tx - hx) / L, (ty - hy) / L
        heel = (hx - ax * 0.10, hy - ay * 0.10); ball = (hx + ax * 0.62 * L, hy + ay * 0.62 * L)
        d = smin(d, seg(u, v, heel, ball, 0.115, 0.14), 0.04)
        nx, ny = -ay, ax
        rng = np.random.RandomState(200 + int(abs(an[1]) * 100))
        for i in range(5):
            f = (i - 2) / 2
            bx, by = ball[0] + nx * f * 0.14, ball[1] + ny * f * 0.14
            ln = L * (0.40 - 0.07 * abs(f) - 0.05 * (i / 4)) * rng.uniform(0.55, 1.1); rr = 0.04 * rng.uniform(0.7, 1.3)
            if rng.uniform() < 0.4:                         # a toe that is only a stub and an islet or two
                d = smin(d, seg(u, v, (bx, by), (bx + ax * ln * 0.3, by + ay * ln * 0.3), rr, rr * 0.8), 0.02)
                for t in (0.62, 0.95):
                    d = np.minimum(d, np.hypot(u - (bx + ax * ln * t + nx * f * 0.03 * t), v - (by + ay * ln * t + ny * f * 0.03 * t)) - rr * rng.uniform(0.45, 0.75))
            else:
                d = smin(d, seg(u, v, (bx, by), (bx + ax * ln + nx * f * 0.03, by + ay * ln + ny * f * 0.03), rr, rr * 0.7), 0.02)
    return d

def rib_paths():
    """ribs as an uneven fold belt: spacing, height and reach all vary; returns (points, amplitude)"""
    rng = np.random.RandomState(11); out = []
    for side in (1, -1):
        for i in range(10):
            ui = 1.62 + 0.122 * i + rng.uniform(-0.026, 0.026)
            v0 = (0.10 if i <= 6 else (0.10 + 0.17 * (i - 6))) + rng.uniform(0.0, 0.06)
            reach = rng.uniform(0.74, 1.0); amp = rng.uniform(0.55, 1.0) * (0.55 if i < 2 else 1.0)
            droop = 0.21 + rng.uniform(-0.05, 0.05)
            pts = []
            for k in range(9):
                t = k / 8 * reach
                uu = ui + droop * t ** 1.7
                vend = float(torso_w(uu)) - 0.05
                pts.append((uu, side * (v0 + t * (vend - v0))))
            out.append((pts, amp))
    return out

def bone_lines():
    L = []   # (points, amplitude, sigma)
    L.append(([(0.74, -0.16), (1.05, -0.12), (1.42, -0.04)], 0.30, 0.035))                       # neck vertebrae
    for s in (1, -1):
        L.append(([(1.50, s * 0.08), (1.43, s * 0.50), (1.50, s * 1.00)], 0.42, 0.036))             # collar bones
        L.append(([(3.50, s * 0.10), (3.36, s * 0.40), (3.36, s * 0.66), (3.56, s * 0.80), (3.86, s * 0.82)], 0.50, 0.05))  # iliac crest
        L.append(([(3.90, s * 0.62), (4.08, s * 0.30), (4.10, s * 0.05)], 0.34, 0.04))             # pubic arch
    for sh, el, wr, tip in ((SH_L, EL_L, WR_L, TIP_L), (SH_R, EL_R, WR_R, TIP_R)):
        L.append(([sh, el], 0.50, 0.05))
        ax, ay = wr[0] - el[0], wr[1] - el[1]; n = math.hypot(ax, ay); nx, ny = -ay / n, ax / n
        L.append(([(el[0] + nx * 0.03, el[1] + ny * 0.03), (wr[0] + nx * 0.02, wr[1] + ny * 0.02)], 0.42, 0.036))
        L.append(([(el[0] - nx * 0.07, el[1] - ny * 0.07), (wr[0] - nx * 0.05, wr[1] - ny * 0.05)], 0.20, 0.024))
    for hip, kn, an, toe in ((HIP_L, KN_L, AN_L, TOE_L), (HIP_R, KN_R, AN_R, TOE_R)):
        L.append(([hip, kn], 0.55, 0.06))
        ax, ay = an[0] - kn[0], an[1] - kn[1]; n = math.hypot(ax, ay); nx, ny = -ay / n, ax / n
        L.append(([(kn[0] + nx * 0.03, kn[1] + ny * 0.03), (an[0] + nx * 0.02, an[1] + ny * 0.02)], 0.50, 0.04))
        L.append(([(kn[0] - nx * 0.085, kn[1] - ny * 0.085), (an[0] - nx * 0.05, an[1] - ny * 0.05)], 0.28, 0.022))
    return L

THROAT = [(1.03, 0.47), (1.20, 0.27), (1.49, 0.03)]       # the airway channel: bay under the chin -> sternal notch
STRAIT = [(1.49, 0.03), (1.80, 0.0), (2.46, 0.0)]         # the tidal strait down the breastbone line
SPINE = [(2.46, 0.0), (2.75, -0.012), (3.10, 0.012), (3.48, 0.0)]
HEART = (2.13, 0.34, 0.165)
MARSH = (3.68, 0.0, 0.17, 0.40)                           # centre u, v, radius along u, radius along v
SHAFTS = [(1.075, 0.40, 0.022), (1.125, 0.345, 0.012), (1.165, 0.275, 0.016), (1.19, 0.315, 0.008), (1.26, 0.215, 0.019), (1.30, 0.20, 0.009), (1.345, 0.135, 0.013), (1.40, 0.125, 0.008), (1.445, 0.07, 0.016)]

def world(u, v, px):
    """returns dict of fields on the grid; px = size of one pixel in head units"""
    n1 = fbm(u, v, 2.3, 7, 1.0); n2 = fbm(u, v, 9.0, 6, 5.0); n3 = fbm(u, v, 31.0, 5, 9.0)
    ru, rv = u, v                                         # true coordinates, for the six places
    wa = 0.060 * sstep(0.95, 1.7, u)                      # the land is warped a little, so nothing is ruler-straight; the head is left alone
    u = ru + wa * fbm(ru, rv, 1.6, 4, 61.0); v = rv + wa * fbm(ru, rv, 1.6, 4, 67.0)
    d0 = body_sdf(u, v)
    n0 = fbm(ru, rv, 1.05, 3, 77.0)
    calm = np.ones_like(u)                                 # hands and feet keep their fingers and toes: less coastal noise there
    for (pa, pb) in ((WR_L, TIP_L), (WR_R, TIP_R), (AN_L, TOE_L), (AN_R, TOE_R)):
        cxh, cyh = (pa[0] + pb[0]) / 2 + (pb[0] - pa[0]) * 0.15, (pa[1] + pb[1]) / 2 + (pb[1] - pa[1]) * 0.15
        calm = np.minimum(calm, 1 - 0.40 * np.exp(-(np.hypot(u - cxh, v - cyh) / 0.48) ** 2))
    d = d0 + calm * (0.045 * n0 + 0.060 * n1 + 0.030 * n2) + 0.011 * n3
    # a few islets and reefs off the coast
    isl = ridged(ru, rv, 11.0, 4, 3.0)
    d = np.where((d > 0.0) & (d0 < 0.20) & (isl > 0.865), -0.01, d)
    land = d < 0
    brk = 0.30 + 0.95 * sstep(-0.35, 0.30, fbm(ru, rv, 4.2, 3, 71.0))   # ranges are broken by passes and gaps
    # --- inner waters
    hw_t = 0.085 - 0.045 * sstep(0.0, 1.0, (u - 1.03) / 0.46)
    thr = pdist(u, v, THROAT) - hw_t
    hw_s = 0.040 + 0.085 * sstep(0.0, 1.0, (u - 1.50) / 0.95)
    stt = pdist(u, v, STRAIT) - hw_s + 0.012 * n2
    arch = 2.45 + 0.47 * (np.abs(v) / 0.78) ** 1.3
    pelv = 3.49 - 0.15 * (np.abs(v) / 0.7) ** 2
    flank = 0.21 + 0.035 * n2 + 0.03 * n1
    # the titan's left flank (frame top) is breached in two places, so the belly sea is tidal
    breach = np.abs(u - 3.12 - 0.10 * (np.abs(v) - 0.5)) - 0.022
    flank = np.where((v > 0) & (breach < 0), -0.2, flank)
    belly = np.maximum(np.maximum(arch - u, u - pelv), np.abs(v) - (torso_w(u) - flank)) + 0.02 * n1 + 0.008 * n3
    spine_d = pdist(u, v, SPINE)
    beads = 0.5 + 0.5 * np.cos((u - 2.46) / 1.02 * 2 * math.pi * 9.5)
    spine_land = spine_d - (0.030 + 0.026 * beads) + 0.006 * n3
    ribs_e = np.zeros_like(u)
    for pts, amp in rib_paths():
        ribs_e = np.maximum(ribs_e, amp * np.exp(-(pdist(u, v, pts) / 0.030) ** 2))
    ribs_e = ribs_e * (0.22 + 0.78 * sstep(-0.42, 0.12, fbm(ru, rv, 6.0, 3, 73.0)))
    chest = (u > 1.58) & (u < 2.95) & (np.abs(v) < torso_w(u))
    fj = chest & (ribs_e < 0.16) & (np.abs(v) < (0.30 + 0.10 * n1 + 0.04 * n2)) & (np.abs(v) > 0.03)
    eye_d = np.hypot(ru - EYE[0], rv - EYE[1]) - EYE[2] * (1 + 0.035 * n2)
    nose_d = np.hypot((u - 0.655) / 1.0, (v - 0.375) / 0.8) - 0.052
    water_in = (thr < 0) | (stt < 0) | ((belly < 0) & (spine_land > 0)) | fj | (eye_d < 0) | (nose_d < 0)
    water = (~land) | water_in
    # --- elevation
    e = 0.20 * sstep(0.0, 0.30, -d)
    e = e + 0.42 * np.exp(-((u - 0.33) / 0.30) ** 2 - ((v + 0.04) / 0.36) ** 2)                 # cranial dome
    brow = np.abs(np.hypot(ru - EYE[0], rv - EYE[1]) - (EYE[2] + 0.035))
    e = e + 0.30 * np.exp(-(brow / 0.028) ** 2) * (0.55 + 0.45 * sstep(0.0, -0.12, u - EYE[0]))  # orbit rim, tallest at the brow
    e = e + 0.30 * np.exp(-(seg(u, v, (0.60, -0.03), (0.60, 0.26), 0) / 0.03) ** 2)
    e = e + 0.30 * np.exp(-(pdist(u, v, [(0.66, -0.05), (0.99, -0.03), (1.11, 0.33)]) / 0.035) ** 2)
    e = e + 0.34 * ribs_e * chest
    for pts, amp, sig in bone_lines():
        e = e + 0.72 * amp * brk * np.exp(-(pdist(u, v, pts) / (sig * 1.25)) ** 2)
    for c, r, a in ((KN_L, 0.15, 0.4), (KN_R, 0.15, 0.4), (EL_L, 0.11, 0.35), (EL_R, 0.11, 0.35), (SH_L, 0.17, 0.4), (SH_R, 0.17, 0.4),
                    (HIP_L, 0.14, 0.25), (HIP_R, 0.14, 0.25), (AN_L, 0.08, 0.3), (AN_R, 0.08, 0.3), (WR_L, 0.07, 0.25), (WR_R, 0.07, 0.25)):
        e = e + a * np.exp(-(np.hypot(u - c[0], v - c[1]) / r) ** 2)
    e = e + 0.75 * np.exp(-(spine_d / 0.035) ** 2) * (0.6 + 0.4 * beads) * ((u > 2.44) & (u < 3.5))
    mtn = ridged(u, v, 6.0, 6, 2.0)
    e = e * (0.55 + 0.80 * mtn) + 0.07 * n2 + 0.035 * n3 + 0.05 * n0
    e = np.where(water, 0.0, np.maximum(e, 0.004))
    return dict(d=d, d0=d0, land=land, water=water, water_in=water_in, e=e, n1=n1, n2=n2, n3=n3, thr=thr, stt=stt, belly=belly,
                spine_d=spine_d, spine_land=spine_land, eye_d=eye_d, nose_d=nose_d, ribs_e=ribs_e, chest=chest, fj=fj)

def mix(a, b, t):
    t = np.clip(t, 0, 1)[..., None]; return a * (1 - t) + np.array(b, float) * t

def render(cu, cv, wh, W=1672, plain=False, limb=True, ss=1):
    H = int(round(W * 941 / 1672)); Ws, Hs = W * ss, H * ss; s = Ws / wh
    X0 = (cu - U0) * math.cos(TH) - cv * math.sin(TH); Y0 = (cu - U0) * math.sin(TH) + cv * math.cos(TH)
    xs = (np.arange(Ws) + 0.5 - Ws / 2) / s + X0; ys = -(np.arange(Hs) + 0.5 - Hs / 2) / s + Y0
    X, Y = np.meshgrid(xs, ys)
    u = X * math.cos(TH) + Y * math.sin(TH) + U0; v = -X * math.sin(TH) + Y * math.cos(TH)
    f = world(u, v, 1 / s); e = f['e']; d = f['d']
    # hillshade, low sun from frame right and a little above (beyond the feet)
    gy, gx = np.gradient(e, 1 / s)
    gy = -gy
    lx, ly, lz = 0.90, 0.30, 0.62
    k = 0.20
    nz = 1 / np.sqrt(1 + (k * gx) ** 2 + (k * gy) ** 2)
    sh = np.clip((-k * gx * lx - k * gy * ly + lz) * nz, 0, 1.3) / lz
    # --- colour
    deep = np.array([7, 20, 40], float); mid = np.array([14, 62, 92], float); shal = np.array([52, 160, 162], float); pale = np.array([150, 214, 200], float)
    img = np.zeros((Hs, Ws, 3)) + deep
    wf = 0.30 + 1.5 * sstep(-0.45, 0.45, fbm(u, v, 1.25, 3, 81.0))       # the shelf is wide in places, almost absent in others
    dd = np.clip(f['d'], 0, None) / wf
    img = mix(img, mid, 1 - sstep(0.10, 0.42, dd + 0.05 * f['n1']))
    img = mix(img, shal, (1 - sstep(0.015, 0.17, dd + 0.03 * f['n2'])) * 0.85)
    img = mix(img, pale, (1 - sstep(0.0, 0.035, dd + 0.012 * f['n3'])) * 0.8)
    img = img * (0.92 + 0.10 * f['n1'][..., None])
    # land
    lo = np.array([128, 96, 70], float); md = np.array([176, 148, 108], float); hi = np.array([226, 214, 190], float); sn = np.array([246, 246, 244], float)
    lc = mix(np.zeros_like(img) + lo, md, sstep(0.02, 0.22, e)); lc = mix(lc, hi, sstep(0.25, 0.55, e)); lc = mix(lc, sn, sstep(0.70, 1.0, e) * 0.8)
    veg = sstep(0.15, 0.55, f['n2'] * 0.6 + f['n1'] * 0.6 + 0.25) * (1 - sstep(0.10, 0.30, e))
    lc = mix(lc, [74, 72, 52], veg * 0.55)
    lc = mix(lc, [150, 84, 60], sstep(0.2, 0.7, fbm(u, v, 1.3, 4, 21.0)) * 0.35)
    lc = mix(lc, [206, 186, 150], sstep(0.25, 0.6, fbm(u, v, 2.6, 4, 23.0)) * (1 - sstep(0.05, 0.25, e)) * 0.6)      # dune seas and pans on the plains
    lc = mix(lc, [58, 52, 50], sstep(0.38, 0.6, fbm(u, v, 3.4, 4, 27.0)) * 0.5 * (1 - sstep(0.2, 0.45, e)))          # old dark lava plains
    lc = lc * np.clip(0.66 + 0.36 * sh, 0.4, 1.25)[..., None]
    land_m = ~f['water']
    img = np.where(land_m[..., None], lc, img)
    # inner waters
    inner = f['water_in'] & (f['d'] < 0)
    iw = mix(np.zeros_like(img) + np.array([16, 56, 80], float), [60, 150, 150], sstep(0.0, 0.5, f['n2'] + 0.2))
    img = np.where(inner[..., None], iw, img)
    bel = (f['belly'] < 0) & (f['spine_land'] > 0)
    bw = mix(np.zeros_like(img) + np.array([20, 84, 104], float), [96, 196, 186], 1 - sstep(0.0, 0.16, np.minimum(-f['belly'], f['spine_land'])))
    img = np.where(bel[..., None], bw, img)
    st = (f['stt'] < 0) | f['fj']
    img = np.where(st[..., None], mix(np.zeros_like(img) + np.array([36, 60, 70], float), [70, 98, 104], sstep(-0.3, 0.4, f['n2'])), img)
    # 1 ribs: nothing more, the strait and the ranges are the place
    # 3 breath: pale tidal shelf, shafts with crimson rims, vapour
    th = f['thr'] < 0
    img = np.where(th[..., None], mix(np.zeros_like(img) + np.array([188, 208, 190], float), [120, 186, 176], sstep(-0.2, 0.5, f['n3'])), img)
    for (su, sv, sr) in SHAFTS:
        r = np.hypot(u - su, v - sv) / sr * 0.022
        img = mix(img, [150, 26, 34], 1 - sstep(0.020, 0.028, r))
        img = mix(img, [8, 14, 22], 1 - sstep(0.012, 0.017, r))
        pl = np.exp(-(((u - su) + 0.25 * (v - sv - 0.05)) / 0.016) ** 2) * sstep(0.0, 0.03, v - sv) * (1 - sstep(0.08, 0.34, v - sv))
        img = mix(img, [240, 240, 236], pl * 0.45)
    # 2 heart: black crust, orange seams, fume
    hr = np.hypot(u - HEART[0], v - HEART[1]) / (HEART[2] * (1 + 0.22 * f['n2']))
    img = mix(img, [24, 20, 20], 1 - sstep(0.85, 1.05, hr))
    seams = (1 - np.abs(fbm(u, v, 70.0, 4, 31.0)) * 9.0)
    img = mix(img, [226, 104, 26], np.clip(seams, 0, 1) * (1 - sstep(0.45, 0.9, hr)) * 0.9)
    img = mix(img, [240, 150, 60], (1 - sstep(0.0, 0.10, hr)) * 0.8)
    fume = np.exp(-(((u - HEART[0]) - 0.22 * (v - HEART[1])) / (0.022 + 0.05 * (v - HEART[1]))) ** 2) * sstep(0.0, 0.08, v - HEART[1]) * (1 - sstep(0.6, 1.5, v - HEART[1]))
    img = mix(img, [128, 112, 102], np.clip(fume, 0, 1) * 0.42 * (0.6 + 0.4 * (f['n2'] + 0.5)))
    # 4 blood marsh: red brine on white salt in the pelvic bowl
    mr = np.sqrt(((u - MARSH[0]) / MARSH[2]) ** 2 + ((v - MARSH[1]) / MARSH[3]) ** 2) * (1 + 0.30 * f['n1'] + 0.16 * f['n2'])
    mm = 1 - sstep(0.88, 1.04, mr)
    salt = np.zeros_like(img) + np.array([236, 226, 216], float)
    veins = 1 - np.abs(fbm(u, v, 21.0, 5, 41.0)) * 3.2
    red = mix(salt, [150, 30, 34], np.clip(veins * 1.5, 0, 1)); red = mix(red, [118, 20, 28], (1 - sstep(0.0, 0.62, mr)) * (0.55 + 0.45 * sstep(-0.3, 0.3, f['n2'])))
    red = mix(red, [196, 120, 104], sstep(0.1, 0.5, fbm(u, v, 5.0, 3, 43.0)) * 0.5)
    img = img * (1 - mm[..., None]) + red * mm[..., None]
    # 5 spine: snow-white knife ridge in the belly sea, with the storm on it
    sp = (f['spine_land'] < 0) & (u > 2.44) & (u < 3.50)
    spc = mix(np.zeros_like(img) + np.array([150, 150, 156], float), [250, 250, 250], sstep(0.0, 0.03, 0.035 - f['spine_d'])) * np.clip(0.55 + 0.5 * sh, 0.3, 1.2)[..., None]
    img = np.where(sp[..., None], spc, img)
    stc = np.exp(-(((u - 2.93 - 0.5 * (v - 0.03)) / 0.20) ** 2 + ((v - 0.07) / 0.12) ** 2)) * (0.55 + 1.1 * fbm(u, v, 26.0, 5, 51.0) + 0.5 * fbm(u, v, 7.0, 3, 53.0))
    img = mix(img, [228, 230, 236], np.clip(stc * 1.7 - 0.30, 0, 0.92))
    img = mix(img, [196, 170, 240], np.exp(-(np.hypot(u - 2.93, v - 0.04) / 0.045) ** 2) * 0.30)
    # 6 eye: amber shallows ring, deep blue centre, pale cliff rim
    er = np.hypot(u - EYE[0], v - EYE[1]) / EYE[2]
    lake = f['eye_d'] < 0
    lk = mix(np.zeros_like(img) + np.array([14, 52, 128], float), [40, 120, 170], sstep(0.45, 0.72, er)); lk = mix(lk, [206, 150, 58], sstep(0.70, 0.92, er))
    img = np.where(lake[..., None], lk, img)
    rim = np.exp(-((er - 1.10) / 0.07) ** 2) * (~lake)
    img = mix(img, [240, 232, 214], rim * 0.8)
    img = mix(img, [24, 30, 44], np.exp(-(np.hypot(u - 0.655, v - 0.375) / 0.04) ** 2) * 0.8 * (f['nose_d'] < 0.01))
    if limb:
        # the planet's limb across the top-left corner of the top frame only (fixed in f4 pixel space)
        fu, fv, fw = FRAMES['f4']; s4 = 1.0 / fw
        FX0 = (fu - U0) * math.cos(TH) - fv * math.sin(TH); FY0 = (fu - U0) * math.sin(TH) + fv * math.cos(TH)
        qx = (X - FX0) * s4 + 0.5; qy = 0.5 * 941 / 1672 - (Y - FY0) * s4          # f4 frame coords, width = 1
        cxx, cyy, RR = 1.62, 2.02, 2.555
        rr = np.hypot(qx - cxx, qy - cyy)
        haze = sstep(RR - 0.50, RR, rr)
        img = mix(img, [150, 190, 226], haze * 0.55)
        img = mix(img, [120, 180, 255], sstep(RR - 0.012, RR, rr) * 0.9)
        img = mix(img, [0, 0, 2], sstep(RR, RR + 0.006, rr))
    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)
    return out

def to_px(pu, pv, cu, cv, wh, W=1672):
    H = round(W * 941 / 1672); s = W / wh
    X = (pu - U0) * math.cos(TH) - pv * math.sin(TH); Y = (pu - U0) * math.sin(TH) + pv * math.cos(TH)
    X0 = (cu - U0) * math.cos(TH) - cv * math.sin(TH); Y0 = (cu - U0) * math.sin(TH) + cv * math.cos(TH)
    return (W / 2 + (X - X0) * s, H / 2 - (Y - Y0) * s)

if __name__ == '__main__':
    out = sys.argv[1]; a = [x for x in sys.argv[2:] if not x.startswith('--')]
    if a[0] in FRAMES: cu, cv, wh = FRAMES[a[0]]; a = a[1:]
    else: cu, cv, wh = float(a[0]), float(a[1]), float(a[2]); a = a[3:]
    W = int(a[0]) if a else 1672
    im = render(cu, cv, wh, W, limb='--nolimb' not in sys.argv)
    im.save(out); print(out, im.size)
