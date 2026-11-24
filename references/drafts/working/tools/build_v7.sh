#!/bin/bash
# Master v7 of the reveal = master v6 (tools/build_v6.sh) with one band of cloud across the lower knee replaced.
# v6 had a band of evenly spaced white cloud dots there; one fresh viewer read it as "a straight, repetitive dotted line of white cloud artifacts",
# another as "tiny popcorn clouds". Take cs-t1 (prompt cs-a) is the same window re-photographed without it.
# Only a hand-drawn outline round the band changes; everything else is master v6 pixel for pixel. Frames 1 to 3 do not change (the window lies right of frame 3).
set -e
cd /home/user/workspace/r3
python3 - <<'P'
import cv2, numpy as np
R='/home/user/workspace/r3/'
X0, Y0 = 1799, 1215
M = cv2.imread(R+'pull/master-v6.png'); b = M[Y0:Y0+941, X0:X0+1672].copy(); t = cv2.imread(R+'gen/cs-t1.png')
P = [(540,330),(600,262),(700,240),(800,236),(880,262),(960,318),(1000,400),(985,470),(900,512),(820,552),(720,585),(600,585),(548,545),(560,490),(640,440),(640,380)]
P = np.array([(x/0.8547, y/0.8547) for x,y in P], np.int32)                     # outline round the band of dots, drawn on the 1429 px view of the window
m = np.zeros(b.shape[:2], np.uint8); cv2.fillPoly(m, [P], 1)
gb = cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32); gt = cv2.cvtColor(t, cv2.COLOR_BGR2GRAY).astype(np.float32)
gd = cv2.GaussianBlur(gt - gb, (0,0), 3)
# where did bright dots go? (old brighter than new) -> must all lie inside the outline
gone = (cv2.GaussianBlur(gb - gt, (0,0), 1.5) > 28).astype(np.uint8)
gone = cv2.morphologyEx(gone, cv2.MORPH_OPEN, np.ones((3,3), np.uint8))
ys, xs = np.nonzero(gone & (cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(301,301))) > 0))
print('removed bright spots near the outline: %d px, of which outside the outline %d px' % (len(ys), int((gone[ys, xs] & (m[ys, xs] == 0)).sum())))
band = (m - cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25)))) > 0
same = band & (np.abs(gd) < 8)
off = np.median(b[same].astype(np.float32) - t[same].astype(np.float32), axis=0)
mf = cv2.GaussianBlur(m.astype(np.float32), (0,0), 8)[..., None]
out = np.clip(b.astype(np.float32)*(1-mf) + (t.astype(np.float32)+off)*mf, 0, 255).astype(np.uint8)
print('cloud paste: tone offset BGR %.1f %.1f %.1f; pixels touched %.1f%% of the window' % (off[0], off[1], off[2], 100*(mf[...,0] > 0.004).mean()))
M[Y0:Y0+941, X0:X0+1672] = out; cv2.imwrite(R+'pull/master-v7.png', M); cv2.imwrite(R+'pull/leg-v7.png', out)
cv2.imwrite(R+'tmp/v7-leg.jpg', out, [cv2.IMWRITE_JPEG_QUALITY, 90])
v = out.copy(); cv2.polylines(v, [P], True, (0,255,255), 2); cv2.imwrite(R+'tmp/v7-leg-outline.jpg', cv2.resize(v, (1100, 619), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 85])
gm = (gone*255).astype(np.uint8); cv2.polylines(gm, [P], True, 128, 2); cv2.imwrite(R+'tmp/v7-gone.jpg', cv2.resize(gm, (1100, 619), interpolation=cv2.INTER_AREA))
P
python3 tools/cut_frames.py pull/master-v7.png v7 pull/f2-v5.png pull/f1-final.png
