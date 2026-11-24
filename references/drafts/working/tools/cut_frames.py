#!/usr/bin/env python3
"""Cut the four key frames of the pull-back from a master and check that each closer frame sits inside the wider one.
usage: cut_frames.py <master.png> <tag e.g. v6> <frame-2 plate.png> <frame-1 plate.png>
frame 4 = the master reduced to 1672x941 (area filter); frame 3 = the master's window (101, 827, 1672x941) at 1:1;
frame 2 = the given plate (it was set into the master at (246, 1145), 860 px wide); frame 1 = the given plate (it sits in frame 2 at (531.5, 430.5), 453 px wide)."""
import sys, cv2, numpy as np
R = '/home/user/workspace/r3/'; master, tag, p2, p1 = sys.argv[1:5]
m = cv2.imread(master)
cv2.imwrite(R + 'pull/f4-%s.png' % tag, cv2.resize(m, (1672, 941), interpolation=cv2.INTER_AREA))
cv2.imwrite(R + 'pull/f4-%s-4k.jpg' % tag, cv2.resize(m, (3840, 2160), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 92])
cv2.imwrite(R + 'pull/f3-%s.png' % tag, m[827:827 + 941, 101:101 + 1672])
f2 = cv2.imread(p2); f1 = cv2.imread(p1); cv2.imwrite(R + 'pull/f2-%s.png' % tag, f2); cv2.imwrite(R + 'pull/f1-%s.png' % tag, f1)
f3 = cv2.imread(R + 'pull/f3-%s.png' % tag)
def chk(name, plate, wide, x0, y0, w):
    sc = w / plate.shape[1]; h = w * plate.shape[0] / plate.shape[1]
    src = cv2.GaussianBlur(plate.astype(np.float32), (0, 0), 0.5 / sc * 0.6) if sc < 1 else plate.astype(np.float32)
    back = cv2.warpAffine(src, np.float32([[sc, 0, x0], [0, sc, y0]]), (wide.shape[1], wide.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    ix0, iy0, ix1, iy1 = int(np.ceil(x0)) + 2, int(np.ceil(y0)) + 2, int(np.floor(x0 + w)) - 2, int(np.floor(y0 + h)) - 2
    d = np.abs(back[iy0:iy1, ix0:ix1] - wide[iy0:iy1, ix0:ix1].astype(np.float32))
    print('%s: mean abs %.2f, 99th pct %.1f of 255' % (name, d.mean(), np.percentile(d, 99)))
chk('frame 1 in frame 2', f1, f2, 531.5, 430.5, 453)
chk('frame 2 in frame 3', f2, f3, 145, 318, 860)
print('frame 3 in frame 4: frame 3 is a 1:1 crop of the master and frame 4 is the same master reduced, so they agree by construction (not a measurement)')
for n in ('f1', 'f2', 'f3', 'f4'):
    cv2.imwrite(R + 'tmp/%s-%s.jpg' % (n, tag), cv2.imread(R + 'pull/%s-%s.png' % (n, tag)), [cv2.IMWRITE_JPEG_QUALITY, 90])
