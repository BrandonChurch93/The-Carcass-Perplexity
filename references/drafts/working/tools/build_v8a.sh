#!/bin/bash
# Master v8a of the reveal = master v7 (tools/build_v7.sh) with the straight join at the right edge of frame 2 removed.
# A critic (af2) found a straight vertical seam in frame 3 at the right edge of the frame-2 window (master x = 1106, y 1145 to 1629):
# a pale ruled ridge with white marks, and a change of ground texture across it (frame-2 plate on the left, the belly rework ramped in on the right).
# Take sm-t1 (prompt sm-a) is a window at frame-2 scale across that edge (master x 676 to 1536, y 1145 to 1629; its left half is the right half
# of the frame-2 plate, its right half the master enlarged 1.944x), re-photographed as one continuous piece of ground.
#  - frame-2 plate: its right part (plate x > 1010, i.e. right of the frame-1 window, which ends at x 984.5) is replaced by the take, ramped in over x 1010 to 1150;
#  - master: the ground right of the frame-2 window (x 1106 to 1520) is replaced by the take reduced to master scale, ramped out over x 1380 to 1520
#    and over 10 to 40 px at the top and bottom of the window; then the new frame-2 plate is set into the master as before.
set -e
cd /home/user/workspace/r3
python3 - <<'P'
import cv2, numpy as np
R='/home/user/workspace/r3/'
M = cv2.imread(R+'pull/master-v7.png'); P2 = cv2.imread(R+'pull/f2-v7.png').astype(np.float32)
T = cv2.imread(R+'gen/sm-t1.png').astype(np.float32); C = cv2.imread(R+'pull/seam-crop-v7.png').astype(np.float32)
ss = lambda t: np.clip(t, 0, 1)**2 * (3 - 2*np.clip(t, 0, 1))
# tone: smooth field measured where the content did not change
d = cv2.GaussianBlur(C - T, (0,0), 4); valid = (np.abs(d).max(axis=2) < 14).astype(np.float32)
num = cv2.GaussianBlur((C - T) * valid[..., None], (0,0), 120); den = cv2.GaussianBlur(valid, (0,0), 120)[..., None]
corr = num / np.maximum(den, 1e-4); Tt = T + corr
print('tone field (input minus take) BGR: mean %.1f %.1f %.1f, min %.1f, max %.1f; unchanged share %.0f%%' % (corr[...,0].mean(), corr[...,1].mean(), corr[...,2].mean(), corr.min(), corr.max(), 100*valid.mean()))
# 1. the frame-2 plate
x = np.arange(1672, dtype=np.float32); a = ss((x - 1010) / 140)[None, :, None]
full = np.concatenate([P2[:, :836], Tt[:, :836]], axis=1)                # plate with its right half taken from the take
P2n = P2 * (1 - a) + full * a
cv2.imwrite(R+'pull/f2-v8-pre.png', np.clip(P2n, 0, 255).astype(np.uint8))
print('plate: changed right of x=1010; max abs change left of x=1010: %.2f' % np.abs(P2n[:, :1010] - P2[:, :1010]).max())
# 2. the master, right of the frame-2 window
sc = 860 / 1672.0                                                          # reduced exactly as inset.py reduces the plate, so both sides of x 1106 are equally sharp
ds = cv2.warpAffine(cv2.GaussianBlur(Tt, (0,0), 0.5 / sc * 0.6), np.float32([[sc, 0, 0], [0, sc, 0]]), (860, 484), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
wx = np.arange(860, dtype=np.float32)[None, :]; wy = np.arange(484, dtype=np.float32)[:, None]
bx = 1 - ss((wx - 704) / 140)                                             # 1 up to master x 1380, 0 from 1520
ramp = np.clip(10 + (wx - 430) * 0.3, 10, 40)                             # top/bottom ramp: 10 px at the corner of the frame-2 window, 40 px further right
by = ss(np.minimum(wy, 483 - wy) / ramp)
ads = ss((836 + wx / (860 / 1672.0) - 1010) / 140)                        # the plate's own ramp (plate x 1010 to 1150), at master scale
by6 = np.clip(np.minimum(wy, 483 - wy) / 6.0, 0, 1)                       # same 6 px edge as the plate gets when it is set in
b = np.where(wx < 430, ads * by6, bx * by)                                # inside the frame-2 window: under the plate's edge band the ground is the take too, so no step is left at x 1106
b = b.astype(np.float32)[..., None]
win = M[1145:1629, 676:1536].astype(np.float32)
M[1145:1629, 676:1536] = np.clip(win * (1 - b) + ds * b, 0, 255).astype(np.uint8)
cv2.imwrite(R+'pull/master-v8-pre.png', M)
P
python3 tools/inset.py pull/master-v8-pre.png pull/f2-v8-pre.png 246 1145 860 pull/master-v8a.png --notone --seafeather 40 --landfeather 6 --plate-out pull/f2-v8.png
python3 - <<'P'
import cv2, numpy as np
R='/home/user/workspace/r3/'
a = cv2.imread(R+'pull/master-v7.png'); b = cv2.imread(R+'pull/master-v8a.png')
d = np.abs(a.astype(np.float32) - b.astype(np.float32)).max(axis=2); ys, xs = np.nonzero(d > 2)
print('master changed (max abs > 2) inside x %d-%d, y %d-%d' % (xs.min(), xs.max(), ys.min(), ys.max()))
p0 = cv2.imread(R+'pull/f2-v7.png').astype(np.float32); p1 = cv2.imread(R+'pull/f2-v8.png').astype(np.float32)
print('frame-2 plate: mean abs change left of x=1000: %.3f; inside the frame-1 window: %.3f' % (np.abs(p1[:, :1000]-p0[:, :1000]).mean(), np.abs(p1[430:686, 531:985]-p0[430:686, 531:985]).mean()))
cv2.imwrite(R+'tmp/v8a-seam-1to1.jpg', b[1080:1700, 880:1620], [cv2.IMWRITE_JPEG_QUALITY, 92])
cv2.imwrite(R+'tmp/v7-seam-1to1.jpg', a[1080:1700, 880:1620], [cv2.IMWRITE_JPEG_QUALITY, 92])
P
