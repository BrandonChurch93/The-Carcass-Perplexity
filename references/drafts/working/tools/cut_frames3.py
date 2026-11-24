#!/usr/bin/env python3
"""Cut the four key frames of the pull-back from the warped carcass master (head at adult proportion) and check that each
closer frame sits inside the wider one.
usage: cut_frames3.py <master.png> <frames.json> <tag> <frame-1 plate.png> <frame-2 plate.png>
Frames 3 and 4 are windows of the master, resampled to 1672x941 (frame 4 also to 3840x2160). Frame 4 is no longer the whole
master: tools/headwarp.py lets the sea slide in from the left edge, and the strip that slid in is cropped off.
Frame 2 is its own plate (drawn from the old master through the warp, so the head keeps full detail, with the sea around it
re-photographed) and frame 1 is the lake plate. Both are already folded into the master (tools/inset.py).
The windows are in px of the 1982x1115 wide frame (pull/frames-*.json)."""
import sys, json, cv2, numpy as np
R = '/home/user/workspace/r3/'; master, fj, tag, p1, p2 = sys.argv[1:6]
m = cv2.imread(master); fr = json.load(open(fj)); S = m.shape[1] / 1982.0
def window(f, W=1672, H=941):
    sc = W / (f['w'] * S)
    M = np.float32([[sc, 0, -f['x0'] * S * sc], [0, sc, -f['y0'] * S * sc]])
    src = m if sc >= 1 else cv2.GaussianBlur(m, (0, 0), 0.5 / sc * 0.6)
    return cv2.warpAffine(src, M, (W, H), flags=cv2.INTER_CUBIC if sc >= 1 else cv2.INTER_AREA, borderMode=cv2.BORDER_REPLICATE)
F = {4: window(fr['f4']), 3: window(fr['f3']), 2: cv2.imread(p2), 1: cv2.imread(p1)}
cv2.imwrite(R + 'pull/f4-%s-4k.jpg' % tag, window(fr['f4'], 3840, 2160), [cv2.IMWRITE_JPEG_QUALITY, 93])
for n in (1, 2, 3, 4):
    cv2.imwrite(R + 'pull/f%d-%s.png' % (n, tag), F[n]); cv2.imwrite(R + 'tmp/f%d-%s.jpg' % (n, tag), F[n], [cv2.IMWRITE_JPEG_QUALITY, 90])
def chk(a, b):
    """reduce frame a into its window of frame b and compare"""
    fa, fb = fr['f%d' % a], fr['f%d' % b]
    sc = fa['w'] / fb['w']; x0 = (fa['x0'] - fb['x0']) / fb['w'] * 1672; y0 = (fa['y0'] - fb['y0']) / fb['w'] * 1672; w = sc * 1672; h = w * 941 / 1672
    src = cv2.GaussianBlur(F[a].astype(np.float32), (0, 0), 0.5 / sc * 0.6)
    back = cv2.warpAffine(src, np.float32([[sc, 0, x0], [0, sc, y0]]), (1672, 941), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_REPLICATE)
    ix0, iy0, ix1, iy1 = int(np.ceil(x0)) + 3, int(np.ceil(y0)) + 3, int(np.floor(x0 + w)) - 3, int(np.floor(y0 + h)) - 3
    d = np.abs(back[iy0:iy1, ix0:ix1] - F[b][iy0:iy1, ix0:ix1].astype(np.float32))
    print('frame %d inside frame %d: window (%.1f, %.1f) %.1f px wide of 1672; mean abs difference %.2f, 99th percentile %.1f (0-255)' % (a, b, x0, y0, w, d.mean(), np.percentile(d, 99)))
    return dict(x0=x0, y0=y0, w=w, h=h, mean=float(d.mean()), p99=float(np.percentile(d, 99)))
out = {'%d_in_%d' % (a, b): chk(a, b) for a, b in ((1, 2), (2, 3), (3, 4), (1, 4))}
json.dump(out, open(R + 'pull/nest-%s.json' % tag, 'w'), indent=1)
