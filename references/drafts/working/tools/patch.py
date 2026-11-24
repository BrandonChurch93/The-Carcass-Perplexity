#!/usr/bin/env python3
"""Take one elliptical region from a revised take and set it into the kept picture; everything else stays pixel-identical.
usage: patch.py <base.png> <new.png> <out.png> <cx> <cy> <ax> <ay> [feather=14]
The new take is tone-matched to the base using a ring just outside the ellipse (where nothing was meant to change),
then cross-faded in over <feather> pixels inside the ellipse edge."""
import sys, numpy as np, cv2
base = cv2.imread(sys.argv[1]).astype(np.float32); new = cv2.imread(sys.argv[2]).astype(np.float32)
if new.shape != base.shape: new = cv2.resize(new, (base.shape[1], base.shape[0]), interpolation=cv2.INTER_LANCZOS4)
cx, cy, ax, ay = map(float, sys.argv[4:8]); f = float(sys.argv[8]) if len(sys.argv) > 8 else 14.0
H, W = base.shape[:2]; yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
r = np.sqrt(((xx - cx) / ax) ** 2 + ((yy - cy) / ay) ** 2)            # 1 on the ellipse
ring = (r > 1.04) & (r < 1.30)
off = (base[ring] - new[ring]).mean(axis=0)
d = (1 - r) * min(ax, ay)                                             # pixels inside the edge
m = np.clip(d / f, 0, 1); m = (m * m * (3 - 2 * m))[..., None]
out = base * (1 - m) + (new + off) * m
cv2.imwrite(sys.argv[3], np.clip(out, 0, 255).astype(np.uint8))
print('patched', sys.argv[3], 'tone offset BGR %.1f %.1f %.1f' % tuple(off), 'ring diff after %.2f' % np.abs(base[ring] - new[ring] - off).mean())
