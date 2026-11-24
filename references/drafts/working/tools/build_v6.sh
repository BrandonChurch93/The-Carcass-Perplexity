#!/bin/bash
# Master v6 of the reveal = master v5 (tools/build_v5.sh) with the storm on the backbone replaced.
# v5's storm was one bright cloud with streaks flying out of it; 4 of 6 fresh viewers read it as an explosion puff or an eruption plume.
# v6: thunderstorms anchored on the backbone islands, their anvils drawn out side by side by the same wind that carries the Breath plume (take bl-t11, prompt bl-f).
# Only the inland sea changes (hand-drawn outline through its shallow water, plus the thin veil where it runs over the coast); everything else is master v5 pixel for pixel.
set -e
cd /home/user/workspace/r3
python3 - <<'P'
import cv2, numpy as np
R='/home/user/workspace/r3/'
M = cv2.imread(R+'pull/master-v5.png'); b = M[760:1701, 1000:2672].copy(); t = cv2.imread(R+'gen/%s.png' % 'bl-t11')
P = [(425,455),(440,398),(500,322),(548,270),(640,270),(672,294),(700,292),(735,264),(788,238),(810,300),(848,380),(866,425),(856,500),(848,558),(800,586),(700,573),(640,610),(610,620),(577,575),(520,535),(465,512),(430,480)]
P = np.array([(x/0.8547, y/0.8547) for x,y in P], np.int32)                     # outline of the inland sea, drawn through its shallow water (same as v5)
m = np.zeros(b.shape[:2], np.uint8); cv2.fillPoly(m, [P], 1)
band = (m - cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25)))) > 0
gd = cv2.GaussianBlur(cv2.cvtColor(t, cv2.COLOR_BGR2GRAY).astype(np.float32) - cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32), (0,0), 3)
same = band & (np.abs(gd) < 8)                                                    # tone offset from water that did not change
off = np.median(b[same].astype(np.float32) - t[same].astype(np.float32), axis=0)
# the thin veil of the anvils where it runs past the outline and over the coast: brighter in the new take, within 90 px of the outline
near = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(181,181)))
veil = ((gd > 9) & (near > 0) & (m == 0)).astype(np.uint8)
veil = cv2.morphologyEx(veil, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
n, lab, st, _ = cv2.connectedComponentsWithStats(veil, connectivity=8)
touch = np.unique(lab[(cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9))) > 0) & (lab > 0)])     # only veil that is joined to the sea area
veil = np.isin(lab, touch[touch > 0]).astype(np.uint8)
veil = cv2.dilate(veil, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(31,31)))
mf = np.maximum(cv2.GaussianBlur(m.astype(np.float32), (0,0), 7), cv2.GaussianBlur(veil.astype(np.float32), (0,0), 12))[..., None]
out = np.clip(b.astype(np.float32)*(1-mf) + (t.astype(np.float32)+off)*mf, 0, 255).astype(np.uint8)
changed = (mf[...,0] > 0.004)
print('storm paste: tone offset BGR %.1f %.1f %.1f; veil outside the outline %d px; pixels touched %.1f%% of the window; left of window x=200: %d' % (off[0], off[1], off[2], int(veil.sum()), 100*changed.mean(), int(changed[:, :200].sum())))
M[760:1701, 1000:2672] = out; cv2.imwrite(R+'pull/master-v6.png', M); cv2.imwrite(R+'pull/belly-v6.png', out)
cv2.imwrite(R+'tmp/v6-storm-1to1.jpg', M[980:1560, 1380:2300], [cv2.IMWRITE_JPEG_QUALITY, 90])
cv2.imwrite(R+'tmp/v6-storm-mask.jpg', (mf[...,0]*255).astype(np.uint8))
P
python3 tools/cut_frames.py pull/master-v6.png v6 pull/f2-v5.png pull/f1-final.png
