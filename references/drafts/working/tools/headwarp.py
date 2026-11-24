#!/usr/bin/env python3
"""Shrink the head of the carcass master toward adult human proportions with one smooth warp (no cut, no paste, no generation).
The head (cranium, jaw, mouth bay) is scaled by s about a point at the base of the skull, and that point slides n px toward the crown,
which lengthens the neck. Around the head the displacement falls away smoothly (harmonic interpolation) to zero at the shoulders, the
ribs and the planet's limb, so the sea and the throat stretch a little and nothing tears. On the left the sea is allowed to slide in from
the frame edge (the field is solved on a grid that reaches XL px past the edge); the few px that would come from outside the picture are
then cropped off, which is why frame 4 becomes a window of the warped master instead of the whole of it.
All geometry is in "view px": the master seen 1429 px wide (view x = master x / K, K = master width / 1429).
usage: headwarp.py field <s> <n> <tag>            -> pull/headwarp-<tag>.npz + pull/headwarp-<tag>.json (report, crop)
       headwarp.py preview <tag> <master.png>     -> tmp/hw-<tag>-f4.jpg (1429 px, cropped) and tmp/hw-<tag>-head.jpg
       headwarp.py master <tag> <master.png> <out.png>
       headwarp.py frame <tag> <old master.png> <x0> <y0> <w> <out.png>   a 1672x941 window (px of the 1982-wide warped frame) drawn straight
                                                                          from the old master through the warp, so the head keeps its full detail;
                                                                          also writes <out>-headmask.png (white = inside the uniformly scaled head)
"""
import sys, json, numpy as np, cv2
R = '/home/user/workspace/r3/'; VW, VH, Hh, XL = 1429.0, 1429.0 * 9 / 16, 3.0, 150.0
AO = np.array([420.0, 380.0])                      # base of the skull in the old picture (view px)
def grid():
    gx = np.arange(-XL, VW + Hh, Hh); gy = np.arange(0, VH + Hh, Hh); return np.meshgrid(gx, gy)
def zones(X, Y):
    Z = (((X - 298) / 135) ** 2 + ((Y - 368) / 102) ** 2 <= 1) & (X <= AO[0])
    fixed = (X >= 472) | ((X >= 452) & (Y <= 275)) | ((X >= 440) & (Y >= 468)) | (Y < 195 - 0.33 * X)
    fixed |= (X <= X.min()) | (Y <= 0) | (Y >= Y.max()) | (X >= X.max())
    return Z, fixed
def solve(known, val):
    import scipy.sparse as sp, scipy.sparse.linalg as spl
    H, W = known.shape; idx = -np.ones((H, W), np.int64); unk = ~known; N = int(unk.sum()); idx[unk] = np.arange(N)
    ys, xs = np.nonzero(unk); rows = [np.arange(N)]; cols = [np.arange(N)]; dat = [np.full(N, 4.0)]; b = np.zeros(N)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        yy, xx = ys + dy, xs + dx; k = known[yy, xx]
        np.add.at(b, np.nonzero(k)[0], val[yy[k], xx[k]])
        rows.append(np.arange(N)[~k]); cols.append(idx[yy[~k], xx[~k]]); dat.append(np.full(int((~k).sum()), -1.0))
    A = sp.csr_matrix((np.concatenate(dat), (np.concatenate(rows), np.concatenate(cols))), shape=(N, N))
    u = spl.spsolve(A.tocsc(), b); out = val.copy(); out[unk] = u; return out
def samp(a, x, y, order=1):
    # exact floating-point interpolation (cv2.remap rounds positions to 1/32 px, which is not fine enough for a displacement field)
    from scipy.ndimage import map_coordinates
    x = np.asarray(x, np.float64); y = np.asarray(y, np.float64)
    return map_coordinates(np.asarray(a, np.float64), [y / Hh, (x + XL) / Hh], order=order, mode='nearest')
def field(s, n, tag):
    X, Y = grid(); Z, fixed = zones(X, Y); AN = AO - np.array([n, 0.0])
    cx = np.where(Z, AN[0] + s * (X - AO[0]) - X, 0.0); cy = np.where(Z, AN[1] + s * (Y - AO[1]) - Y, 0.0)
    known = Z | fixed; dx = solve(known, cx.copy()); dy = solve(known, cy.copy())
    # soften the crease at the edge of the uniform zone, then put the exact values back inside it
    core = cv2.erode(Z.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    w = cv2.GaussianBlur(core.astype(np.float32), (0, 0), 2.0); w = np.where(core, 1.0, w)
    fr = np.clip(cv2.GaussianBlur((~fixed).astype(np.float32), (0, 0), 2.0) * 2 - 1, 0, 1) * (~fixed)
    bx = cv2.GaussianBlur(dx.astype(np.float32), (0, 0), 2.0); by = cv2.GaussianBlur(dy.astype(np.float32), (0, 0), 2.0)
    dx = (cx * w + bx * (1 - w) * fr).astype(np.float32); dy = (cy * w + by * (1 - w) * fr).astype(np.float32)
    g = dict(xx=np.gradient(dx, Hh, axis=1), xy=np.gradient(dx, Hh, axis=0), yx=np.gradient(dy, Hh, axis=1), yy=np.gradient(dy, Hh, axis=0))
    jxx, jxy, jyx, jyy = 1 + g['xx'], g['xy'], g['yx'], 1 + g['yy']
    det = jxx * jyy - jxy * jyx; tr = jxx ** 2 + jxy ** 2 + jyx ** 2 + jyy ** 2; q = np.sqrt(np.maximum(tr ** 2 - 4 * det ** 2, 0))
    smax = np.sqrt((tr + q) / 2); smin = np.sqrt(np.maximum((tr - q) / 2, 0)); out = (~core) & (X >= 0)
    i = np.unravel_index(np.argmax(np.where(out, smax, 0)), smax.shape)
    crop = float(np.ceil(dx[:, int(XL / Hh)].max()) + 1)                 # px that slide in from beyond the left edge
    rep = dict(s=s, n=n, min_det=float(det.min()), max_stretch_outside_head=float(smax[out].max()), at_view_px=[float(X[i]), float(Y[i])],
               p95_stretch_where_over_1p05=float(np.percentile(smax[out & (smax > 1.05)], 95)), min_scale_outside_head=float(smin[out].min()),
               view_px2_stretched_over_1p25=float((out & (smax > 1.25)).sum() * Hh * Hh), view_px2_stretched_over_1p4=float((out & (smax > 1.4)).sum() * Hh * Hh),
               crop_left_view_px=crop, crop_top_view_px=crop * 9 / 16)
    # inverse displacement e(p') with G(p') = p' + e(p'), Newton iteration
    dx = dx.astype(np.float64); dy = dy.astype(np.float64); ex = -dx.copy(); ey = -dy.copy()
    for it in range(25):
        px, py = X + ex, Y + ey
        rx = ex + samp(dx, px, py); ry = ey + samp(dy, px, py)
        a = 1 + samp(g['xx'], px, py); b = samp(g['xy'], px, py); c = samp(g['yx'], px, py); d = 1 + samp(g['yy'], px, py)
        dt = a * d - b * c; ex = ex - (d * rx - b * ry) / dt; ey = ey - (-c * rx + a * ry) / dt
    px, py = X + ex, Y + ey; rep['inverse_residual_view_px'] = float(max(np.abs(ex + samp(dx, px, py)).max(), np.abs(ey + samp(dy, px, py)).max()))
    np.savez(R + 'pull/headwarp-%s.npz' % tag, dx=dx, dy=dy, ex=ex, ey=ey, smax=smax.astype(np.float32), s=s, n=n, crop=crop)
    json.dump(rep, open(R + 'pull/headwarp-%s.json' % tag, 'w'), indent=1); print(json.dumps(rep)); return rep
_F = {}
def fld(tag):
    if tag not in _F: _F[tag] = dict(np.load(R + 'pull/headwarp-%s.npz' % tag))
    return _F[tag]
def inv(tag, xv, yv):
    """old view coordinates of the content now at warped view coordinates (xv, yv)"""
    f = fld(tag); xv = np.asarray(xv, np.float64); yv = np.asarray(yv, np.float64)
    return ((xv + samp(f['ex'], xv, yv, 3)).astype(np.float32), (yv + samp(f['ey'], xv, yv, 3)).astype(np.float32))
def fwd(tag, xv, yv):
    """warped view coordinates of the content that was at old view coordinates (xv, yv)"""
    f = fld(tag); xv = np.atleast_1d(np.float64(xv)); yv = np.atleast_1d(np.float64(yv))
    return xv + samp(f['dx'], xv, yv, 3), yv + samp(f['dy'], xv, yv, 3)
def warp(tag, img, x0=0, x1=None):
    """warp an image that shows the whole old master at any size; only columns x0..x1 (image px) are recomputed"""
    H, W = img.shape[:2]; K = W / VW; x1 = W if x1 is None else x1; out = img.copy()
    for y0 in range(0, H, 512):
        y1 = min(H, y0 + 512); u, v = np.meshgrid(np.arange(x0, x1, dtype=np.float64), np.arange(y0, y1, dtype=np.float64))
        sx, sy = inv(tag, u / K, v / K)
        out[y0:y1, x0:x1] = cv2.remap(img, (sx * K).astype(np.float32), (sy * K).astype(np.float32), cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    return out
def f4win(tag):
    """frame 4 = the warped master minus the strip that slid in; window in view px (x0, y0, w)"""
    c = float(fld(tag)['crop']); return c, c * 9 / 16, VW - c
if __name__ == '__main__':
    c = sys.argv[1]
    if c == 'field': field(float(sys.argv[2]), float(sys.argv[3]), sys.argv[4])
    elif c == 'preview':
        tag = sys.argv[2]; m = cv2.imread(sys.argv[3]); K = m.shape[1] / VW; x0, y0, w = f4win(tag)
        roi = warp(tag, m, 0, int(480 * K))
        v = roi[int(y0 * K):, int(x0 * K):]; v = cv2.resize(v, (1429, 804), interpolation=cv2.INTER_AREA)
        cv2.imwrite(R + 'tmp/hw-%s-f4.jpg' % tag, v, [cv2.IMWRITE_JPEG_QUALITY, 90])
        h = roi[int(200 * K):int(560 * K), int(x0 * K):int((x0 + 640) * K)]; h = cv2.resize(h, (1500, int(1500 * h.shape[0] / h.shape[1])), interpolation=cv2.INTER_AREA)
        cv2.imwrite(R + 'tmp/hw-%s-head.jpg' % tag, h, [cv2.IMWRITE_JPEG_QUALITY, 90])
    elif c == 'master':
        tag = sys.argv[2]; m = cv2.imread(sys.argv[3]); K = m.shape[1] / VW
        cv2.imwrite(sys.argv[4], warp(tag, m, 0, int(480 * K)))
    elif c == 'frame':
        tag = sys.argv[2]; m = cv2.imread(sys.argv[3]); K = m.shape[1] / VW; x0, y0, w = [float(v) for v in sys.argv[4:7]]; E = 1982.0 / VW
        i, j = np.meshgrid(np.arange(1672, dtype=np.float64), np.arange(941, dtype=np.float64))
        xv = (x0 + i * w / 1672.0) / E; yv = (y0 + j * w / 1672.0) / E; sx, sy = inv(tag, xv, yv)
        cv2.imwrite(sys.argv[7], cv2.remap(m, (sx * K).astype(np.float32), (sy * K).astype(np.float32), cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT))
        inside = ((((sx - 298) / 123) ** 2 + ((sy - 368) / 90) ** 2) <= 1) & (sx <= AO[0] - 10)
        cv2.imwrite(sys.argv[7].replace('.png', '-headmask.png'), (inside * 255).astype(np.uint8))
        print('source px per output px inside the head: %.3f' % (w / 1672.0 / E * K / float(fld(tag)['s'])))
