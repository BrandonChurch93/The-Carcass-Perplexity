#!/usr/bin/env python3
"""Bring a re-photographed plate back to the tone of the crop it was shot from, without touching its detail.
Per channel, one straight-line fit (gain and offset) of the plate to the crop, measured on smoothed copies (sigma 12 px)
so that only tone is compared; then a very smooth residual (sigma 110 px by default) is added so broad light and haze agree.
--mask x0,y0,x1,y1 (plate px, may be given more than once): a box where the plate was asked to show something new.
  It is left out of the fit, and the smooth residual inside it is carried in from outside, so the new content keeps its own tone.
usage: grade_plate.py <crop.png> <plate.png> <out.png> [--sigma 110] [--mask x0,y0,x1,y1]..."""
import sys, cv2, numpy as np
a = sys.argv[1:]; crop, plate, out = a[:3]; a = a[3:]
sigma, boxes = 110.0, []
while a:
    k = a.pop(0)
    if k == '--sigma': sigma = float(a.pop(0))
    elif k == '--mask': boxes.append([int(float(v)) for v in a.pop(0).split(',')])
c = cv2.imread(crop).astype(np.float32); p = cv2.imread(plate).astype(np.float32)
if p.shape != c.shape: p = cv2.resize(p, (c.shape[1], c.shape[0]), interpolation=cv2.INTER_LANCZOS4)
keep = np.ones(c.shape[:2], np.float32)
for x0, y0, x1, y1 in boxes: keep[y0:y1, x0:x1] = 0
cs, ps = cv2.GaussianBlur(c, (0, 0), 12), cv2.GaussianBlur(p, (0, 0), 12)
res = p.copy(); sel = keep.ravel() > 0
for ch in range(3):
    x, y = ps[..., ch].ravel()[sel][::7], cs[..., ch].ravel()[sel][::7]
    g, o = np.polyfit(x, y, 1)
    res[..., ch] = p[..., ch] * g + o
    print('channel %d: gain %.3f offset %+.1f' % (ch, g, o))
num = cv2.GaussianBlur((c - res) * keep[..., None], (0, 0), sigma); den = cv2.GaussianBlur(keep, (0, 0), sigma)[..., None]
res = res + num / np.maximum(den, 1e-3)
cv2.imwrite(out, np.clip(res, 0, 255).astype(np.uint8))
d = np.abs(cv2.GaussianBlur(res, (0, 0), 8) - cv2.GaussianBlur(c, (0, 0), 8))[keep > 0]
print('after grading (outside any mask): low-pass mean abs difference %.2f, 99th pct %.1f' % (d.mean(), np.percentile(d, 99)))
