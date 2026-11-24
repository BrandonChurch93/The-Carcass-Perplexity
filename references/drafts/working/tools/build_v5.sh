#!/bin/bash
# Master v5 of the reveal: master v4 with the storm system, the weathered ribs and the clear open sea folded in, then the four key frames cut from it.
set -e
cd /home/user/workspace/r3
# 1. chest and belly window (x 1000, y 760, 1672 px): weathered ribs from bl-t8, the inland sea (one storm system, unequal backbone islands) from bl-t6
python3 - <<'P'
import cv2, numpy as np
R='/home/user/workspace/r3/'
t8 = cv2.imread(R+'gen/bl-t8.png'); t6 = cv2.imread(R+'gen/bl-t6.png')
P = [(425,455),(440,398),(500,322),(548,270),(640,270),(672,294),(700,292),(735,264),(788,238),(810,300),(848,380),(866,425),(856,500),(848,558),(800,586),(700,573),(640,610),(610,620),(577,575),(520,535),(465,512),(430,480)]
P = np.array([(x/0.8547, y/0.8547) for x,y in P], np.int32)             # outline of the inland sea, drawn through its shallow water
m = np.zeros(t8.shape[:2], np.uint8); cv2.fillPoly(m, [P], 1)
band = (m - cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25)))) > 0
off = np.median(t8[band].astype(np.float32) - t6[band].astype(np.float32), axis=0)
mf = cv2.GaussianBlur(m.astype(np.float32), (0,0), 7)[...,None]
belly = np.clip(t8.astype(np.float32)*(1-mf) + (t6.astype(np.float32)+off)*mf, 0, 255).astype(np.uint8)
cv2.imwrite(R+'pull/belly-v5.png', belly)
# ramp it in over x 110-190 of the window so that nothing changes inside the frame-2 window
b = cv2.imread(R+'pull/master-v4.png')[760:1701, 1000:2672].astype(np.float32)
x = np.arange(1672, dtype=np.float32); a = np.clip((x - 110) / 80, 0, 1); a = (a * a * (3 - 2 * a))[None, :, None]
cv2.imwrite(R+'pull/belly-v5-ramped.png', np.clip(b * (1 - a) + belly.astype(np.float32) * a, 0, 255).astype(np.uint8))
P
python3 tools/inset.py pull/master-v4.png pull/belly-v5-ramped.png 1000 760 1672 pull/master-v5a.png --seafeather 60 --landfeather 8
# 2. open sea of frame 3 (master box 101,827 - 1000,1768): the glitter of specks replaced by the clear sea and thin cloud lines of pb3-t7; land untouched
python3 tools/thin_flecks.py pull/master-v5a.png pull/master-v5a2.png 101 827 1000 1768 --inside 30
python3 - <<'P'
import cv2
R='/home/user/workspace/r3/'
m = cv2.imread(R+'pull/master-v5a2.png'); m[827:827+941, 101:101+1672] = cv2.imread(R+'gen/pb3-t7.png'); cv2.imwrite(R+'tmp/master-pb3t7.png', m)
P
python3 tools/seapaste.py pull/master-v5a2.png tmp/master-pb3t7.png pull/master-v5b.png --box 101 827 1000 1768 --grow 14 --feather 8 --edge 22 --tone-sigma 70 --membrane 200 --lowband 150 --low-sigma 26
# 3. frame 2: the same sea, enlarged from the master, brought into focus by pb2-t26; land untouched (it is the v4 plate with the top left streaks removed)
python3 tools/patch.py pull/f2-final-p.png gen/pb2-t24.png pull/f2-final-p2.png 40 0 500 200 40
python3 tools/seapaste.py pull/f2-final-p2.png gen/${F2SEA:-pb2-t26}.png pull/f2-final-v5.png --grow 20 --feather 10 --edge 0 --tone-sigma 70
python3 tools/inset.py pull/master-v5b.png pull/f2-final-v5.png 246 1145 860 pull/master-v5.png --notone --seafeather 40 --landfeather 6 --plate-out pull/f2-v5.png
python3 - <<'P'
import cv2, numpy as np
R='/home/user/workspace/r3/pull/'
m = cv2.imread(R+'master-v5.png')
cv2.imwrite(R+'f4-v5.png', cv2.resize(m, (1672, 941), interpolation=cv2.INTER_AREA))
cv2.imwrite(R+'f4-v5-4k.jpg', cv2.resize(m, (3840, 2160), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 92])
cv2.imwrite(R+'f3-v5.png', m[827:827+941, 101:101+1672])
f1 = cv2.imread(R+'f1-final.png'); cv2.imwrite(R+'f1-v5.png', f1)
# nesting checks: each closer frame, reduced with a proper area filter, against its window in the wider frame
def chk(name, plate, wide, x0, y0, w):
    sc = w / plate.shape[1]; h = w * plate.shape[0] / plate.shape[1]
    src = cv2.GaussianBlur(plate.astype(np.float32), (0, 0), 0.5 / sc * 0.6) if sc < 1 else plate.astype(np.float32)
    M = np.float32([[sc, 0, x0], [0, sc, y0]])
    back = cv2.warpAffine(src, M, (wide.shape[1], wide.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    ix0, iy0, ix1, iy1 = int(np.ceil(x0)) + 2, int(np.ceil(y0)) + 2, int(np.floor(x0 + w)) - 2, int(np.floor(y0 + h)) - 2
    d = np.abs(back[iy0:iy1, ix0:ix1] - wide[iy0:iy1, ix0:ix1].astype(np.float32))
    print('%s: mean abs %.2f, 99th pct %.1f of 255' % (name, d.mean(), np.percentile(d, 99)))
f2 = cv2.imread(R+'f2-v5.png'); f3 = cv2.imread(R+'f3-v5.png'); f4 = cv2.imread(R+'f4-v5.png')
chk('frame 1 in frame 2', f1, f2, 531.5, 430.5, 453)
chk('frame 2 in frame 3', f2, f3, 145, 318, 860)
# frame 3 is a crop of the master and frame 4 is the master reduced: compare the crop, reduced the same way (area filter), with frame 4
s = 1672 / m.shape[1]; x0, y0 = 101 * s, 827 * s
big = np.zeros_like(m); big[827:827+941, 101:101+1672] = f3
red = cv2.resize(big, (1672, 941), interpolation=cv2.INTER_AREA).astype(np.float32)
ix0, iy0, ix1, iy1 = int(np.ceil(x0)) + 2, int(np.ceil(y0)) + 2, int(np.floor(x0 + 1672 * s)) - 2, int(np.floor(y0 + 941 * s)) - 2
d = np.abs(red[iy0:iy1, ix0:ix1] - f4[iy0:iy1, ix0:ix1].astype(np.float32))
print('frame 3 in frame 4: mean abs %.2f, 99th pct %.1f of 255 (same master, same reduction)' % (d.mean(), np.percentile(d, 99)))
for n in ('f1','f2','f3','f4'):
    cv2.imwrite('/home/user/workspace/r3/tmp/%s-v5.jpg' % n, cv2.imread(R+n+'-v5.png'), [cv2.IMWRITE_JPEG_QUALITY, 90])
P
