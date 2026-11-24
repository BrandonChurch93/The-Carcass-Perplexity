#!/bin/bash
# Master v8 of the reveal = master v8a (tools/build_v8a.sh: v7 with the straight join at the edge of frame 2 removed) with the inland sea replaced.
# In v7 three fresh viewers who were given the six places could not find "a storm on a ridge of spine": the backbone was a chain of very small islands
# and the storm was thin streaks that read as smoke from the lava field. Take $SEA (batch b48) shows the backbone as one narrow range of vertebra massifs
# across the inland sea, with the storm standing against it.
# Only the inland sea changes (the hand-drawn outline through its shallow water used since v5, plus cloud that runs a little past it); the rest is master v8a pixel for pixel.
# usage: SEA=bl-t15 TAG=v8 bash tools/build_v8.sh
set -e
cd /home/user/workspace/r3
SEA=${SEA:-bl-t15}; TAG=${TAG:-v8}
python3 - "$SEA" "$TAG" <<'P'
import sys, cv2, numpy as np
R='/home/user/workspace/r3/'; sea, tag = sys.argv[1:3]
M = cv2.imread(R+'pull/master-v8a.png'); b = M[760:1701, 1000:2672].copy(); t = cv2.imread(R+'gen/%s.png' % sea)
P = [(425,455),(440,398),(500,322),(548,270),(640,270),(672,294),(700,292),(735,264),(788,238),(810,300),(848,380),(866,425),(856,500),(848,558),(800,586),(700,573),(640,610),(610,620),(577,575),(520,535),(465,512),(430,480)]
P = np.array([(x/0.8547, y/0.8547) for x,y in P], np.int32)                     # outline of the inland sea, drawn through its shallow water (same as v5 to v7)
m = np.zeros(b.shape[:2], np.uint8); cv2.fillPoly(m, [P], 1)
el = lambda k: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
band = (m - cv2.erode(m, el(25))) > 0
gd = cv2.GaussianBlur(cv2.cvtColor(t, cv2.COLOR_BGR2GRAY).astype(np.float32) - cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32), (0,0), 3)
ring = (cv2.dilate(m, el(61)) > 0) & (m == 0)                                     # tone offset from the land just outside the outline, where nothing changed
same = ring & (np.abs(gd) < 6)
off = np.median(b[same].astype(np.float32) - t[same].astype(np.float32), axis=0)
# cloud that runs past the outline (the edge of the cloud sheet, veils): changed in the new take, within 90 px of the outline and joined to the sea area
near = cv2.dilate(m, el(181))
veil = ((np.abs(gd) > 9) & (near > 0) & (m == 0)).astype(np.uint8)
veil = cv2.morphologyEx(veil, cv2.MORPH_OPEN, el(9))
n, lab, st, _ = cv2.connectedComponentsWithStats(veil, connectivity=8)
touch = np.unique(lab[(cv2.dilate(m, el(9)) > 0) & (lab > 0)])
veil = np.isin(lab, touch[touch > 0]).astype(np.uint8)
veil = cv2.dilate(veil, el(31))
mf = np.maximum(cv2.GaussianBlur(m.astype(np.float32), (0,0), 7), cv2.GaussianBlur(veil.astype(np.float32), (0,0), 12))[..., None]
out = np.clip(b.astype(np.float32)*(1-mf) + (t.astype(np.float32)+off)*mf, 0, 255).astype(np.uint8)
changed = (mf[...,0] > 0.004)
print('%s sea paste: tone offset BGR %.1f %.1f %.1f (from %d px of unchanged shore); cloud outside the outline %d px; pixels touched %.1f%% of the window; left of window x=380: %d' % (sea, off[0], off[1], off[2], int(same.sum()), int(veil.sum()), 100*changed.mean(), int(changed[:, :380].sum())))
M[760:1701, 1000:2672] = out; cv2.imwrite(R+'pull/master-%s.png' % tag, M); cv2.imwrite(R+'pull/belly-%s.png' % tag, out)
cv2.imwrite(R+'tmp/%s-sea-1to1.jpg' % tag, M[980:1560, 1380:2300], [cv2.IMWRITE_JPEG_QUALITY, 90])
v = (mf[...,0]*255).astype(np.uint8); cv2.polylines(v, [P], True, 128, 2); cv2.imwrite(R+'tmp/%s-sea-mask.jpg' % tag, cv2.resize(v, (1100, 619), interpolation=cv2.INTER_AREA))
P
python3 tools/cut_frames.py pull/master-$TAG.png $TAG pull/f2-v8.png pull/f1-final.png
