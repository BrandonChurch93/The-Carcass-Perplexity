#!/usr/bin/env python3
"""The Heart on the wide master: make the lava findable from orbit without making it big.
The plate already has one ember in the black crust. This adds light only: a warm core and a faint halo on that ember,
and a few much smaller sparks on the crust near it (each lands on the darkest spot near a set offset, so none sits on a rib).
usage: heart_x2.py <master in> <master out>"""
import sys, cv2, numpy as np
src, dst = sys.argv[1:3]
m = cv2.imread(src).astype(np.float32)
H, W = m.shape[:2]; f = W / 1672.0
x0, y0, x1, y1 = [int(v * f) for v in (575, 300, 740, 425)]            # chest box in 1672-px frame units
reg = m[y0:y1, x0:x1]
lum = cv2.GaussianBlur(0.114 * reg[..., 0] + 0.587 * reg[..., 1] + 0.299 * reg[..., 2], (0, 0), 1.0 * f)
s = cv2.GaussianBlur(reg[..., 2] - reg[..., 0], (0, 0), 2)
iy, ix = np.unravel_index(np.argmax(s), s.shape)
yy, xx = np.mgrid[0:reg.shape[0], 0:reg.shape[1]].astype(np.float32)
def blob(cx, cy, sig, r, g, b=0.0):
    w = np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * (sig * f) ** 2))
    reg[..., 2] += r * w; reg[..., 1] += g * w; reg[..., 0] += b * w
blob(ix, iy, 1.3, 170, 95, 15); blob(ix, iy, 5.0, 30, 9)
sparks = []
for dx, dy in ((21, -15), (-17, 16), (37, 9), (10, 30), (-9, -27), (52, -24)):
    cx, cy = ix + dx * f, iy + dy * f
    if not (8 * f < cx < reg.shape[1] - 8 * f and 8 * f < cy < reg.shape[0] - 8 * f): continue
    r = int(5 * f); sub = lum[int(cy) - r:int(cy) + r, int(cx) - r:int(cx) + r]
    jy, jx = np.unravel_index(np.argmin(sub), sub.shape)                # darkest spot nearby = crust, not rib
    px, py = int(cx) - r + jx, int(cy) - r + jy
    if lum[py, px] > 70: continue
    blob(px, py, 0.65, 150, 70, 8); blob(px, py, 2.2, 14, 4); sparks.append(((x0 + px) / f, (y0 + py) / f))
m[y0:y1, x0:x1] = np.clip(reg, 0, 255)
cv2.imwrite(dst, m.astype(np.uint8))
print('ember at 1672-px frame (%.1f, %.1f); %d sparks at %s' % ((x0 + ix) / f, (y0 + iy) / f, len(sparks), ' '.join('(%.0f, %.0f)' % q for q in sparks)))
