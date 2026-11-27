# Joins the four enlarged windows of the base into one band, each laid on the window it was made from (ECC, affine), colours taken back to the base.
import cv2, numpy as np
S = 1536/585
X0 = [0,317,634,951]
W = round(1536*S); H = 1024
acc = np.zeros((H,W,3),np.float64); wsum = np.zeros((H,W,1),np.float64)
for i,x0 in enumerate(X0):
    a = cv2.imread(f'out/work/plate/w{i}-in.png').astype(np.float32)
    b = cv2.imread(f'assets-src/eye/far-edge/w{i}-t1.jpg').astype(np.float32)
    ga = cv2.cvtColor(cv2.resize(a,(768,512),interpolation=cv2.INTER_AREA),cv2.COLOR_BGR2GRAY)
    gb = cv2.cvtColor(cv2.resize(b,(768,512),interpolation=cv2.INTER_AREA),cv2.COLOR_BGR2GRAY)
    ga = cv2.GaussianBlur(ga,(0,0),2.0); gb = cv2.GaussianBlur(gb,(0,0),2.0)
    warp = np.eye(2,3,dtype=np.float32)
    try:
        cc, warp = cv2.findTransformECC(ga, gb, warp, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT, 300, 1e-7), None, 5)
    except cv2.error as e:
        print('ecc failed', i, e); cc = -1
    print(i, 'cc', round(cc,4), 'warp', np.round(warp,4).tolist())
    w2 = warp.copy(); w2[:,2] *= 2.0
    bw = cv2.warpAffine(b, w2, (1536,1024), flags=cv2.INTER_LANCZOS4|cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)
    # colours back to the source, at low frequency
    la = cv2.GaussianBlur(a,(0,0),40); lb = cv2.GaussianBlur(bw,(0,0),40)
    bw = np.clip(bw * (la+4)/(lb+4), 0, 255)
    # feather across
    x = np.arange(1536, dtype=np.float64)
    f = np.clip(np.minimum(x+1, 1536-x)/350.0, 0, 1)
    if i == 0: f = np.where(x < 768, 1.0, f)
    if i == len(X0)-1: f = np.where(x > 768, 1.0, f)
    f = (f*f*(3-2*f))[None,:,None] + 1e-6
    ox = round(x0*S)
    acc[:, ox:ox+1536] += bw*f; wsum[:, ox:ox+1536] += f
out = acc/np.maximum(wsum,1e-6)
cv2.imwrite('out/work/plate/band-hi.png', np.clip(out,0,255).astype(np.uint8))
print(out.shape)
