#!/usr/bin/env python3
"""How far has a re-photographed plate moved from the picture it was made from?
usage: align.py <reference.png> <take.png> [more takes...]
Splits the frame into 4 x 3 blocks and measures the shift of each with phase correlation (pixels of the frame)."""
import sys, numpy as np, cv2
ref = cv2.imread(sys.argv[1]); H, W = ref.shape[:2]
g0 = cv2.GaussianBlur(cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 2.5)
for p in sys.argv[2:]:
    t = cv2.imread(p)
    if t.shape[:2] != (H, W): t = cv2.resize(t, (W, H), interpolation=cv2.INTER_LANCZOS4)
    g1 = cv2.GaussianBlur(cv2.cvtColor(t, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 2.5)
    out = []
    for j in range(3):
        for i in range(4):
            x0, x1, y0, y1 = i * W // 4, (i + 1) * W // 4, j * H // 3, (j + 1) * H // 3
            a, b = g0[y0:y1, x0:x1], g1[y0:y1, x0:x1]
            win = cv2.createHanningWindow((a.shape[1], a.shape[0]), cv2.CV_32F)
            (dx, dy), r = cv2.phaseCorrelate(a - a.mean(), b - b.mean(), win)
            out.append((dx, dy, r))
    d = np.array([np.hypot(o[0], o[1]) for o in out]); r = np.array([o[2] for o in out])
    ok = r > 0.15
    print(p.split('/')[-1], 'shift px: median %.2f, max %.2f over %d of 12 blocks with a clear peak; mean diff %.1f' % (np.median(d[ok]) if ok.any() else -1, d[ok].max() if ok.any() else -1, ok.sum(), np.abs(ref.astype(np.float32) - t.astype(np.float32)).mean()))
