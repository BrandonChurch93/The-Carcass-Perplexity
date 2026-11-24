#!/bin/bash
# Master v4 of the reveal: master v3 with the corrected windows folded in, then the four key frames cut from it.
set -e
cd /home/user/workspace/r3
I="python3 tools/inset.py"
# the belly plate adds smoke that would stop dead at the border of the frame-2 window (x 1106): ramp the plate in over x 1110-1190 instead
python3 - <<'P'
import cv2, numpy as np
R='/home/user/workspace/r3/'
b = cv2.imread(R+'pull/master-v3.png')[760:1701, 1000:2672].astype(np.float32); t = cv2.imread(R+'gen/bl-t3.png').astype(np.float32)
x = np.arange(1672, dtype=np.float32); a = np.clip((x - 110) / 80, 0, 1); a = (a * a * (3 - 2 * a))[None, :, None]
cv2.imwrite(R+'pull/bl-t3-ramped.png', np.clip(b * (1 - a) + t * a, 0, 255).astype(np.uint8))
P
$I pull/master-v3.png  pull/bl-t3-ramped.png 1000 760 1672 pull/master-v4a.png --seafeather 60 --landfeather 8        # chest and belly: storm from above, backbone chain, tidal strait, lava vents
$I pull/master-v4a.png gen/${HU:-hu-t1}.png 1732 0    836 pull/master-v4b.png --seafeather 40 --landfeather 8   # upper hand, weathered
$I pull/master-v4b.png gen/${HL:-hl-t2}.png 1882 1815 836 pull/master-v4c.png --seafeather 40 --landfeather 8   # lower hand
$I pull/master-v4c.png gen/${FU:-fu-t2}.png 3002 165  836 pull/master-v4d.png --seafeather 40 --landfeather 8   # upper foot
$I pull/master-v4d.png gen/${FL:-fl-t2}.png 3082 1495 836 pull/master-v4e.png --seafeather 40 --landfeather 8   # lower foot
python3 tools/patch.py pull/f2-final.png gen/pb2-t24.png pull/f2-final-p.png 739 262 120 104 14                # frame 2: dry socket floor without dune ripples
$I pull/master-v4e.png pull/f2-final-p.png 246 1145 860 pull/master-v4.png --notone --seafeather 40 --landfeather 6 --plate-out pull/f2-v4.png
python3 - <<'P'
import cv2, numpy as np
R='/home/user/workspace/r3/pull/'
m = cv2.imread(R+'master-v4.png')
cv2.imwrite(R+'f4-v4.png', cv2.resize(m, (1672, 941), interpolation=cv2.INTER_AREA))
cv2.imwrite(R+'f4-v4-4k.jpg', cv2.resize(m, (3840, 2160), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 92])
cv2.imwrite(R+'f3-v4.png', m[827:827+941, 101:101+1672])
f1 = cv2.imread(R+'f1-final.png'); cv2.imwrite(R+'f1-v4.png', f1)
# nesting checks: each closer frame, reduced, against its window in the wider frame
def chk(name, plate, wide, x0, y0, w):
    sc = w / plate.shape[1]; h = w * plate.shape[0] / plate.shape[1]
    src = cv2.GaussianBlur(plate.astype(np.float32), (0, 0), 0.5 / sc * 0.6) if sc < 1 else plate.astype(np.float32)
    M = np.float32([[sc, 0, x0], [0, sc, y0]])
    back = cv2.warpAffine(src, M, (wide.shape[1], wide.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    ix0, iy0, ix1, iy1 = int(np.ceil(x0)) + 2, int(np.ceil(y0)) + 2, int(np.floor(x0 + w)) - 2, int(np.floor(y0 + h)) - 2
    d = np.abs(back[iy0:iy1, ix0:ix1] - wide[iy0:iy1, ix0:ix1].astype(np.float32))
    print('%s: mean abs %.2f, 99th pct %.1f of 255' % (name, d.mean(), np.percentile(d, 99)))
f2 = cv2.imread(R+'f2-v4.png'); f3 = cv2.imread(R+'f3-v4.png'); f4 = cv2.imread(R+'f4-v4.png')
chk('frame 1 in frame 2', f1, f2, 531.5, 430.5, 453)
chk('frame 2 in frame 3', f2, f3, 145, 318, 860)
chk('frame 3 in frame 4', f3, f4, 101/2.53349, 827/2.53349, 1672/2.53349)
for n in ('f1','f2','f3','f4'):
    cv2.imwrite('/home/user/workspace/r3/tmp/%s-v4.jpg' % n, cv2.imread(R+n+'-v4.png'), [cv2.IMWRITE_JPEG_QUALITY, 90])
P
