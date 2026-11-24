#!/usr/bin/env python3
"""Fold a closer plate back into the wider picture it was cut from, so the two agree exactly.

The plate (a re-photograph of the window x0,y0,w of the base) is reduced to the window's size,
tone-matched to the base using only a ring along its border (so new content inside is left alone),
and joined with a multi-band blend over a narrow band inside the window's edge.

usage: inset.py <base.png> <plate.png> <x0> <y0> <w> <out.png> [--ring 40] [--sigma 90] [--feather 0] [--levels 5]
                [--notone] [--thr 45] [--plate-out final_plate.png] [--seafeather 40 --landfeather 6]
       x0, y0, w in pixels of the base; the window has the plate's aspect ratio.
       --thr: ring pixels where base and plate differ by more than this are ignored in the tone match
              (so old content the plate replaces does not pull the tone).
       --plate-out: also write the plate with the same smooth correction applied at its own size, so that
              the plate, reduced, equals the window of the result exactly (the frames nest).
"""
import sys, numpy as np, cv2


def gpyr(a, n):
    out = [a]
    for _ in range(n - 1):
        out.append(cv2.pyrDown(out[-1]))
    return out


def lpyr(a, n):
    g = gpyr(a, n); out = []
    for i in range(n - 1):
        out.append(g[i] - cv2.pyrUp(g[i + 1], dstsize=(g[i].shape[1], g[i].shape[0])))
    out.append(g[-1]); return out


def collapse(p):
    a = p[-1]
    for i in range(len(p) - 2, -1, -1):
        a = cv2.pyrUp(a, dstsize=(p[i].shape[1], p[i].shape[0])) + p[i]
    return a


def inset(base, plate, x0, y0, w, ring=40, sigma=90.0, feather=0, levels=5, tone=True, thr=45.0, plate_out=None,
          seafeather=0, landfeather=0):
    H, W = base.shape[:2]
    h = w * plate.shape[0] / plate.shape[1]
    # resample the plate onto the base grid exactly (sub-pixel placement)
    sc = w / plate.shape[1]
    M = np.float32([[sc, 0, x0], [0, sc, y0]])
    src = plate.astype(np.float32)
    if sc < 1:                                    # low-pass before reducing
        src = cv2.GaussianBlur(src, (0, 0), 0.5 / sc * 0.6)
    warped = cv2.warpAffine(src, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    raw = warped.copy()
    ix0, iy0, ix1, iy1 = int(np.ceil(x0)), int(np.ceil(y0)), int(np.floor(x0 + w)), int(np.floor(y0 + h))
    inside = np.zeros((H, W), np.float32); inside[iy0:iy1, ix0:ix1] = 1
    b = base.astype(np.float32)
    if tone:
        core = np.zeros((H, W), np.float32); core[iy0 + ring:iy1 - ring, ix0 + ring:ix1 - ring] = 1
        rmask = inside - core                                   # the ring just inside the border
        rmask = rmask * (np.abs(b - warped).max(axis=2) < thr)   # ignore places where the content itself changed
        num = cv2.GaussianBlur((b - warped) * rmask[..., None], (0, 0), sigma)
        den = cv2.GaussianBlur(rmask, (0, 0), sigma)[..., None]
        corr = num / np.maximum(den, 1e-4)
        warped = warped + corr * inside[..., None]
    # blend mask: 1 inside, falling to 0 at the window border. Over open sea the fall is wide (cloud and water
    # cross-fade); over land it is short (the land agrees to a pixel or two and must stay sharp).
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dist = np.minimum(np.minimum(xx - ix0, ix1 - 1 - xx), np.minimum(yy - iy0, iy1 - 1 - yy))
    dist = np.maximum(dist, 0) * inside
    if seafeather or landfeather:
        sea = (((warped[..., 0] - warped[..., 2]) > 20) & ((b[..., 0] - b[..., 2]) > 20)).astype(np.float32)   # open water in both pictures
        sea = cv2.GaussianBlur(cv2.erode(sea, np.ones((5, 5), np.uint8)), (0, 0), 6)
        N = max(landfeather, 1) + (max(seafeather, 1) - max(landfeather, 1)) * sea
        m = np.clip(dist / N, 0, 1) * inside
    else:
        m = np.zeros((H, W), np.float32); m[iy0 + feather:iy1 - feather, ix0 + feather:ix1 - feather] = 1
    src_full = b * (1 - inside[..., None]) + warped * inside[..., None]
    la, lb, gm = lpyr(src_full, levels), lpyr(b, levels), gpyr(m, levels)
    out = collapse([la[i] * gm[i][..., None] + lb[i] * (1 - gm[i][..., None]) for i in range(levels)])
    if plate_out:
        ph, pw = plate.shape[:2]
        Mi = np.float32([[1 / sc, 0, -x0 / sc], [0, 1 / sc, -y0 / sc]])
        up = lambda a: cv2.warpAffine(a, Mi, (pw, ph), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        lf = cv2.GaussianBlur(out - raw, (0, 0), 6.0)            # the smooth part: tone and low-frequency blend
        # the plate keeps its own sharp detail right to its edge; only the smooth correction is applied.
        # (In the narrow blend band at the window border the wider picture is a cross-fade of the two renderings.)
        final = plate.astype(np.float32) + up(lf)
        cv2.imwrite(plate_out, np.clip(final + 0.5, 0, 255).astype(np.uint8))
        # report how well the plate, reduced, equals the window of the result
        back = cv2.warpAffine(cv2.GaussianBlur(final, (0, 0), 0.5 / sc * 0.6) if sc < 1 else final, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        d = np.abs(back - out)
        core = (m > 0.999)
        print('nesting check (plate reduced vs window of the result): inside the blend band mean abs %.2f, 99th pct %.1f; whole window mean abs %.2f (0-255)' % (d[core].mean(), np.percentile(d[core], 99), d[inside > 0].mean()))
    return np.clip(out + 0.5, 0, 255).astype(np.uint8)


if __name__ == '__main__':
    a = sys.argv[1:]
    opts = dict(ring=40, sigma=90.0, feather=0, levels=5, tone=True, thr=45.0, plate_out=None, seafeather=0, landfeather=0)
    pos = []
    while a:
        v = a.pop(0)
        if v == '--notone': opts['tone'] = False
        elif v == '--plate-out': opts['plate_out'] = a.pop(0)
        elif v.startswith('--'): opts[v[2:]] = float(a.pop(0)) if v in ('--sigma', '--thr') else int(a.pop(0))
        else: pos.append(v)
    base, plate, x0, y0, w, out = pos
    res = inset(cv2.imread(base), cv2.imread(plate), float(x0), float(y0), float(w), **opts)
    cv2.imwrite(out, res)
    print(out, res.shape)
