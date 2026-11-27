# Lays the two side extensions on the band by the part they share with it, and writes the long band.
import cv2, numpy as np
band = cv2.imread('out/work/plate/band-hi.png').astype(np.float32)
H, W = band.shape[:2]
K = 614; B = 1536 - K
ext = np.zeros((H, W + 2*B, 3), np.float32)
ext[:, B:B+W] = band
for side in ['l', 'r']:
    a = cv2.imread(f'out/work/plate/x{side}-in.png').astype(np.float32)
    b = cv2.imread(f'assets-src/eye/far-edge/x{side}-t1.jpg').astype(np.float32)
    mask = np.zeros((512, 768), np.uint8)
    if side == 'l': mask[:, (B+20)//2:] = 255
    else: mask[:, :(K-20)//2] = 255
    ga = cv2.GaussianBlur(cv2.cvtColor(cv2.resize(a, (768, 512), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY), (0, 0), 2.0)
    gb = cv2.GaussianBlur(cv2.cvtColor(cv2.resize(b, (768, 512), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY), (0, 0), 2.0)
    warp = np.eye(2, 3, dtype=np.float32)
    cc, warp = cv2.findTransformECC(ga, gb, warp, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 400, 1e-7), mask, 5)
    print(side, 'cc', round(cc, 4), np.round(warp, 4).tolist())
    w2 = warp.copy(); w2[:, 2] *= 2.0
    bw = cv2.warpAffine(b, w2, (1536, 1024), flags=cv2.INTER_LANCZOS4 | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)
    m2 = cv2.resize(mask, (1536, 1024)) > 0
    gain = np.array([a[..., c][m2].mean() / bw[..., c][m2].mean() for c in range(3)])
    print(' gain', np.round(gain, 3))
    bw = np.clip(bw * gain, 0, 255)
    x = np.arange(1536, dtype=np.float32)
    if side == 'l':
        f = np.clip((x - B - 20) / 260.0, 0, 1)   # 0 in the new part, 1 well inside the kept part
        f = (f*f*(3-2*f))[None, :, None]
        ext[:, 0:1536] = bw*(1-f) + ext[:, 0:1536]*f
    else:
        f = np.clip((K - 20 - x) / 260.0, 0, 1)
        f = (f*f*(3-2*f))[None, :, None]
        x0 = B + W - K
        ext[:, x0:x0+1536] = bw*(1-f) + ext[:, x0:x0+1536]*f
cv2.imwrite('out/work/plate/band-ext.png', np.clip(ext, 0, 255).astype(np.uint8))
v = cv2.resize(ext, (1600, int(H*1600/ext.shape[1])), interpolation=cv2.INTER_AREA)
cv2.imwrite('out/work/plate/band-ext-view.jpg', v)
cv2.imwrite('out/work/plate/seam-l.jpg', ext[200:1024, B-500:B+900])
cv2.imwrite('out/work/plate/seam-r.jpg', ext[200:1024, B+W-K-400:B+W-K+1000])
print(ext.shape)
