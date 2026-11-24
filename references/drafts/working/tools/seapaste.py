#!/usr/bin/env python3
"""Take only the open sea (and the cloud over it) from a revised take and set it into the kept picture; land, coasts and shallows stay pixel-identical.
usage: seapaste.py <base.png> <new.png> <out.png> [--box x0 y0 x1 y1] [--grow 14] [--feather 8] [--edge 16] [--tone-sigma 0] [--mask-out m.png]
Open sea = dark blue water or white/grey cloud, in a connected area that reaches the border of the box, in BOTH pictures;
the area is shrunk by <grow> px away from every coast and shallow, cross-faded over <feather> px, and faded out over <edge> px at the box border.
The new take is tone-matched to the base with one offset per channel (median over dark water in both)."""
import sys, numpy as np, cv2
a = sys.argv[1:]; base = cv2.imread(a[0]); new = cv2.imread(a[1]); out = a[2]
def opt(name, n, default):
    if name in a:
        i = a.index(name); v = [float(x) for x in a[i + 1:i + 1 + n]]; return v if n > 1 else v[0]
    return default
H, W = base.shape[:2]
if new.shape != base.shape: new = cv2.resize(new, (W, H), interpolation=cv2.INTER_LANCZOS4)
x0, y0, x1, y1 = [int(v) for v in opt('--box', 4, [0, 0, W, H])]; grow = int(opt('--grow', 1, 14)); feather = opt('--feather', 1, 8.0); edge = opt('--edge', 1, 16.0)

def sea(img):
    b, g, r = [img[..., i].astype(np.int32) for i in range(3)]
    mn = np.minimum(np.minimum(r, g), b); mx = np.maximum(np.maximum(r, g), b)
    white = (mn > 135) & (mx - mn < 70)
    water = (b > r + 14) & (b > g - 35)
    shallow = (g > 105) & (g > r + 45) & (g > b - 15) & ~white          # turquoise shelf water: belongs to the coast
    cand = ((water & ~shallow) | white).astype(np.uint8)
    # specks of anything else inside the sea (grey cloud shadow, haze) are sea too: drop small not-sea blobs
    nl, labl, stl, _ = cv2.connectedComponentsWithStats(1 - cand, connectivity=8)
    small = np.isin(labl, np.where(stl[:, cv2.CC_STAT_AREA] < 900)[0]) & (labl > 0)
    cand[small] = 1
    sub = cand[y0:y1, x0:x1]
    n, lab = cv2.connectedComponents(sub, connectivity=4)
    edge_ids = np.unique(np.concatenate([lab[0, :], lab[-1, :], lab[:, 0], lab[:, -1]])); edge_ids = edge_ids[edge_ids > 0]
    keep = np.isin(lab, edge_ids)
    areas = np.bincount(lab.ravel(), minlength=n)
    big = np.isin(lab, np.where(areas > 0.004 * sub.size)[0]) & (lab > 0)
    m = np.zeros((H, W), np.uint8); m[y0:y1, x0:x1] = (keep & big).astype(np.uint8)
    return m, (water & ~shallow & ~white)

ma, da = sea(base); mb, db = sea(new)
m = (ma & mb)
m = cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1)))
dark = (da & db & (m > 0))
off = np.median(base[dark].astype(np.float32) - new[dark].astype(np.float32), axis=0) if dark.sum() > 1000 else np.zeros(3, np.float32)
tsig = opt('--tone-sigma', 1, 0.0)
if tsig > 0:                                    # follow the base's slow changes of sea colour (haze toward the limb), not one flat offset
    dk = (da & db).astype(np.float32); inbox = np.zeros((H, W), np.float32); inbox[y0:y1, x0:x1] = 1; dk = dk * inbox   # samples from inside the box only
    num = cv2.GaussianBlur((base.astype(np.float32) - new.astype(np.float32)) * dk[..., None], (0, 0), tsig)
    den = cv2.GaussianBlur(dk, (0, 0), tsig)[..., None]
    offmap = np.where(den > 0.02, num / np.maximum(den, 1e-6), off[None, None, :])
    off = offmap
    lowband = opt('--lowband', 1, 0.0)
    if lowband > 0 and '--membrane' not in a:   # two-band join: at the box border the pasted sea takes exactly the base's local tone (small-radius average), easing to the wide-radius match over <lowband> px
        ssm = opt('--low-sigma', 1, 26.0)
        va = da.astype(np.float32); vb = (db.astype(np.float32)) * inbox                      # base: clear water on both sides of the border; new: inside the box only
        La = cv2.GaussianBlur(base.astype(np.float32) * va[..., None], (0, 0), ssm) / np.maximum(cv2.GaussianBlur(va, (0, 0), ssm), 1e-6)[..., None]
        Lb = cv2.GaussianBlur(new.astype(np.float32) * vb[..., None], (0, 0), ssm) / np.maximum(cv2.GaussianBlur(vb, (0, 0), ssm), 1e-6)[..., None]
        ok = ((cv2.GaussianBlur(va, (0, 0), ssm) > 0.05) & (cv2.GaussianBlur(vb, (0, 0), ssm) > 0.05))[..., None]
        dsm = np.where(ok, La - Lb, offmap)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        dbord = np.minimum(np.minimum(xx - x0, x1 - 1 - xx), np.minimum(yy - y0, y1 - 1 - yy))
        wl = np.clip(dbord / lowband, 0, 1); wl = (wl * wl * (3 - 2 * wl))[..., None]
        off = dsm * (1 - wl) + offmap * wl
if '--membrane' in a:   # offsets pinned on the whole boundary of the pasted area and interpolated smoothly across it:
    # at the box border = (base tone just OUTSIDE the box) - (new tone just inside); along coasts = the local base-new difference
    ssm = opt('--low-sigma', 1, 26.0); sl = opt('--membrane', 1, 200.0)
    inb = np.zeros((H, W), np.float32); inb[y0:y1, x0:x1] = 1
    va = da.astype(np.float32) * (1 - inb); vb = db.astype(np.float32) * inb
    dva = cv2.GaussianBlur(va, (0, 0), ssm); dvb = cv2.GaussianBlur(vb, (0, 0), ssm)
    T = cv2.GaussianBlur(base.astype(np.float32) * va[..., None], (0, 0), ssm) / np.maximum(dva, 1e-6)[..., None]
    Ln = cv2.GaussianBlur(new.astype(np.float32) * vb[..., None], (0, 0), ssm) / np.maximum(dvb, 1e-6)[..., None]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dbord = np.minimum(np.minimum(xx - x0, x1 - 1 - xx), np.minimum(yy - y0, y1 - 1 - yy))
    ring = (m > 0) & (cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))) == 0)
    isbox = dbord < 6
    flat = np.asarray(off, np.float32) if np.ndim(off) == 3 else np.broadcast_to(np.asarray(off, np.float32)[None, None, :], base.shape).copy()
    d = np.where(isbox[..., None], T - Ln, flat)
    val = (ring & (~isbox | ((dva > 0.05) & (dvb > 0.05)))).astype(np.float32)
    def field(sg):
        den = cv2.GaussianBlur(val, (0, 0), sg)
        return cv2.GaussianBlur(d * val[..., None], (0, 0), sg) / np.maximum(den, 1e-12)[..., None], den
    Fs, dens = field(30.0); Fl, denl = field(sl)
    Fl = np.where((denl > 1e-7)[..., None], Fl, flat); Fs = np.where((dens > 1e-4)[..., None], Fs, Fl)
    dist = cv2.distanceTransform(m, cv2.DIST_L2, 5)
    wl = np.clip(dist / opt('--lowband', 1, 150.0), 0, 1); wl = (wl * wl * (3 - 2 * wl))[..., None]
    off = Fs * (1 - wl) + Fl * wl
mf = cv2.GaussianBlur(m.astype(np.float32), (0, 0), feather)
mf = np.clip((mf - 0.5) * 2, 0, 1) if feather > 0 else m.astype(np.float32)        # keep the fade inside the shrunk area
if edge > 0:
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.minimum(np.minimum(xx - x0, x1 - 1 - xx), np.minimum(yy - y0, y1 - 1 - yy))
    fade_sides = opt('--fade-sides', 1, 15)                                         # bit mask: 1 left, 2 top, 4 right, 8 bottom
    fs = int(fade_sides); dd = np.full((H, W), 1e9, np.float32)
    if fs & 1: dd = np.minimum(dd, xx - x0)
    if fs & 2: dd = np.minimum(dd, yy - y0)
    if fs & 4: dd = np.minimum(dd, x1 - 1 - xx)
    if fs & 8: dd = np.minimum(dd, y1 - 1 - yy)
    e = np.clip(dd / edge, 0, 1); mf = mf * (e * e * (3 - 2 * e))
mf = mf[..., None]
res = base.astype(np.float32) * (1 - mf) + (new.astype(np.float32) + off) * mf
cv2.imwrite(out, np.clip(res, 0, 255).astype(np.uint8))
if '--mask-out' in a: cv2.imwrite(a[a.index('--mask-out') + 1], (mf[..., 0] * 255).astype(np.uint8))
print('sea paste', out, 'area %.1f%% of the box' % (100 * m[y0:y1, x0:x1].mean()), 'tone offset BGR %.1f %.1f %.1f' % tuple(np.asarray(off).reshape(-1, 3).mean(axis=0)))
