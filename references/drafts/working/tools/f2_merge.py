#!/usr/bin/env python3
"""Frame 2 after the head warp: keep the head from the direct drawing (pixel-identical to the tested frame 2) and take the
sea, the throat and the corners from the re-photographed plate, joined along the coast of the head with a soft edge.
usage: f2_merge.py <direct.png> <direct-headmask.png> <graded plate.png> <out.png>"""
import sys, cv2, numpy as np
d = cv2.imread(sys.argv[1]).astype(np.float32); m = (cv2.imread(sys.argv[2], 0) > 0).astype(np.uint8); p = cv2.imread(sys.argv[3]).astype(np.float32)
m = cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))).astype(np.float32); m = cv2.GaussianBlur(m, (0, 0), 7.0)[..., None]
o = d * m + p * (1 - m); cv2.imwrite(sys.argv[4], np.clip(o + 0.5, 0, 255).astype(np.uint8))
band = (m[..., 0] > 0.05) & (m[..., 0] < 0.95); df = np.abs(d - p).mean(axis=2)
print('direct vs plate: mean abs %.2f in the join band, %.2f inside the head (0-255); head kept from the direct drawing: %.1f%% of the frame' % (df[band].mean(), df[m[..., 0] > 0.95].mean(), (m[..., 0] > 0.5).mean() * 100))
