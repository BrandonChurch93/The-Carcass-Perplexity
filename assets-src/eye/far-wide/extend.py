# Lays the model's picture of the right end on the wide picture by the part they share, carries the picture on to the right by P
# columns, pads the left with as many columns of the picture itself turned over (the lens never comes there), and writes the plate.
import sys
import cv2, numpy as np
src = sys.argv[1] if len(sys.argv) > 1 else 'public/assets/eye/mat/far.jpg'
far = cv2.imread(src).astype(np.float32)
H, W = far.shape[:2]            # 1882, 3344
K = 1838; P = 900               # columns the model was shown, columns added on each side
S = H / 1024.0                  # the model's canvas to the picture
a = cv2.imread('out/work/wide/xr-in.png').astype(np.float32)
b = cv2.imread('assets-src/eye/far-wide/xr-t1.jpg').astype(np.float32)
mask = np.zeros((512, 768), np.uint8); mask[:, :490] = 255
ga = cv2.GaussianBlur(cv2.cvtColor(cv2.resize(a, (768, 512), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY), (0, 0), 2.0)
gb = cv2.GaussianBlur(cv2.cvtColor(cv2.resize(b, (768, 512), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY), (0, 0), 2.0)
warp = np.eye(2, 3, dtype=np.float32)
cc, warp = cv2.findTransformECC(ga, gb, warp, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 400, 1e-7), mask, 5)
print('cc', round(cc, 4), np.round(warp, 4).tolist())
w2 = warp.copy(); w2[:, 2] *= 2.0
bw = cv2.warpAffine(b, w2, (1536, 1024), flags=cv2.INTER_LANCZOS4 | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)
m2 = cv2.resize(mask, (1536, 1024)) > 0
gain = np.array([a[..., c][m2].mean() / bw[..., c][m2].mean() for c in range(3)])
print('gain', np.round(gain, 3))
bw = np.clip(bw * gain, 0, 255)
big = cv2.resize(bw, (int(round(1536 * S)), H), interpolation=cv2.INTER_LANCZOS4)   # the model's canvas at the picture's scale
out = np.zeros((H, W + 2 * P, 3), np.float32)
out[:, :P] = far[:, :P][:, ::-1]
out[:, P:P + W] = far
x0 = P + W - K                   # where the model's canvas begins in the plate
new = big[:, :K + P]
x = np.arange(K + P, dtype=np.float32)
f = np.clip((K - 30 - x) / 420.0, 0, 1)      # 1 well inside the kept picture, 0 in the new part
f = (f * f * (3 - 2 * f))[None, :, None]
old = out[:, x0:x0 + K + P].copy(); old[:, K:] = new[:, K:]
out[:, x0:x0 + K + P] = new * (1 - f) + old * f
out = np.clip(out, 0, 255).astype(np.uint8)
cv2.imwrite('public/assets/eye/mat/far-wide.jpg', out, [cv2.IMWRITE_JPEG_QUALITY, 90])
cv2.imwrite('out/work/wide/seam.jpg', out[300:1300, P + W - 1100:P + W + 900])
cv2.imwrite('out/work/wide/view.jpg', cv2.resize(out, (1600, int(H * 1600 / out.shape[1])), interpolation=cv2.INTER_AREA))
print(out.shape)
