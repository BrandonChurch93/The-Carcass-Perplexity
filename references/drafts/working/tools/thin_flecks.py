#!/usr/bin/env python3
"""Remove the tiny white cloud specks from the open sea in a band around a rectangle, completely next to it and
less and less with distance (in irregular patches), so that a re-photographed sea inside the rectangle joins the older sea outside it.
usage: thin_flecks.py <in.png> <out.png> <x0> <y0> <x1> <y1> [--inside 24] [--full 70] [--ramp 260] [--xmax 1000] [--seed 7]"""
import sys, numpy as np, cv2
a = sys.argv[1:]; img = cv2.imread(a[0]); x0, y0, x1, y1 = [int(v) for v in a[2:6]]
def opt(n, d): return float(a[a.index(n) + 1]) if n in a else d
inside, full, ramp, xmax, seed = opt('--inside', 24), opt('--full', 70), opt('--ramp', 260), int(opt('--xmax', 1000)), int(opt('--seed', 7))
H, W = img.shape[:2]
b, g, r = [img[..., i].astype(np.int32) for i in range(3)]
mn = np.minimum(np.minimum(r, g), b); mx = np.maximum(np.maximum(r, g), b)
white = (mn > 135) & (mx - mn < 70); water = (b > r + 14) & (b > g - 35); shallow = (g > 105) & (g > r + 45) & (g > b - 15) & ~white
sea = ((water & ~shallow) | white).astype(np.uint8)
nl, lab, st, _ = cv2.connectedComponentsWithStats(1 - sea, connectivity=8)
sea[np.isin(lab, np.where(st[:, cv2.CC_STAT_AREA] < 900)[0]) & (lab > 0)] = 1
sea = cv2.erode(sea, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))               # stay clear of coasts and shallows
L = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY); Lm = cv2.medianBlur(L, 31)
fleck = ((L.astype(np.int32) - Lm.astype(np.int32)) > 14).astype(np.uint8) & sea
# distance outside the rectangle (negative inside)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
dx = np.maximum(np.maximum(x0 - xx, xx - x1), 0); dy = np.maximum(np.maximum(y0 - yy, yy - y1), 0); dout = np.sqrt(dx * dx + dy * dy)
din = np.minimum(np.minimum(xx - x0, x1 - xx), np.minimum(yy - y0, y1 - yy))
p = np.where(dout > 0, np.clip(1 - (dout - full) / ramp, 0, 1), (din < inside).astype(np.float32))
p[:, xmax:] = 0
rng = np.random.default_rng(seed); n = cv2.GaussianBlur(rng.random((H, W)).astype(np.float32), (0, 0), 55)
n = (n - n.min()) / (n.max() - n.min()); order = np.argsort(np.argsort(n.ravel())).reshape(H, W) / float(H * W)   # rank: uniform 0..1
nf, labf, stf, _ = cv2.connectedComponentsWithStats(fleck, connectivity=8)
tiny = np.isin(labf, np.where(stf[:, cv2.CC_STAT_AREA] <= 140)[0]) & (labf > 0)      # real clouds (anything bigger) are left alone
kill = tiny & (order < p)
kill = cv2.dilate(kill.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
# fill with the local colour of the clear water between the specks (not an inpaint: that leaves facets), plus the picture's own fine grain
allf = cv2.dilate(((L.astype(np.int32) - Lm.astype(np.int32)) > 8).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
clear = (sea & (1 - allf)).astype(np.float32)
num = cv2.GaussianBlur(img.astype(np.float32) * clear[..., None], (0, 0), 16); den = cv2.GaussianBlur(clear, (0, 0), 16)[..., None]
bg = np.where(den > 0.03, num / np.maximum(den, 1e-6), img.astype(np.float32))
grain = rng.normal(0, 1.3, (H, W, 1)).astype(np.float32)
soft = cv2.GaussianBlur(kill.astype(np.float32), (0, 0), 1.6)[..., None]
out = np.clip(img.astype(np.float32) * (1 - soft) + (bg + grain) * soft, 0, 255).astype(np.uint8)
cv2.imwrite(a[1], out); print('specks removed over %.2f%% of the picture' % (100 * kill.mean()))
