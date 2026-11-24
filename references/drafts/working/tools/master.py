#!/usr/bin/env python3
"""Build the high-resolution master of the reveal frame from re-rendered windows.

Every window is a re-photograph of one 660 px wide window of the parent take,
enlarged 2.533x. Windows are tone-matched to the parent (low frequencies only)
and joined with a multi-band (Laplacian pyramid) blend along seams that run
down the middle of the overlaps.

usage: master.py <out.png> [--sigma 48] [--levels 6] [--parent p.png] name=path@x0,y0[,w[,bx0,by0,bx1,by1]] ...
       x0,y0 = top left corner of the plate in frame-4 px; w = its width in frame-4 px (default 660)
       each '!' at the end of a name raises its priority inside its whole window (frame-3 plate '!', frame-2 plate '!!'),
       or, when a box bx0,by0,bx1,by1 (frame-4 px) is given, only inside that box: the place the plate was shot for
       comes from that plate alone, and outside the box the plate competes like any other
       a '~' in the name switches off the tone match to the parent (used where the parent no longer applies)
"""
import sys, json, numpy as np, cv2

R = '/home/user/workspace/r3'
import os
W4, H4 = int(os.environ.get('W4', 1672)), int(os.environ.get('H4', 941))   # frame-4 size in its own px (the wider carcass frame is 1982 x 1115)
TW = 660.0
S = W4 / TW
MW, MH = int(round(W4 * S)), int(round(H4 * S))


def gpyr(a, n):
    out = [a]
    for _ in range(n - 1):
        out.append(cv2.pyrDown(out[-1]))
    return out


def lpyr(a, n):
    g = gpyr(a, n)
    out = []
    for i in range(n - 1):
        up = cv2.pyrUp(g[i + 1], dstsize=(g[i].shape[1], g[i].shape[0]))
        out.append(g[i] - up)
    out.append(g[-1])
    return out


def collapse(p):
    a = p[-1]
    for i in range(len(p) - 2, -1, -1):
        a = cv2.pyrUp(a, dstsize=(p[i].shape[1], p[i].shape[0])) + p[i]
    return a


def main():
    args = sys.argv[1:]
    out = args.pop(0)
    sigma, levels, parent_path = 48.0, 6, f'{R}/gen/rv4-t23.png'
    tiles = []
    while args:
        a = args.pop(0)
        if a == '--sigma':
            sigma = float(args.pop(0))
        elif a == '--levels':
            levels = int(args.pop(0))
        elif a == '--parent':
            parent_path = args.pop(0)
        else:
            name, rest = a.split('=', 1)
            path, pos = rest.rsplit('@', 1)
            v = [float(q) for q in pos.split(',')]
            tiles.append((name, path, v[0], v[1], v[2] if len(v) > 2 else TW, v[3:7] if len(v) >= 7 else None))
    parent = cv2.imread(parent_path).astype(np.float32)
    pup = cv2.resize(parent, (MW, MH), interpolation=cv2.INTER_CUBIC)

    # weights -> hard partition
    wmaps = np.full((len(tiles), MH, MW), -1.0, np.float32)
    boxes = []
    for k, (name, path, x0, y0, wf4, box) in enumerate(tiles):
        pw, ph = int(round(wf4 * S)), int(round(wf4 * S * H4 / W4))
        ox, oy = int(round(x0 * S)), int(round(y0 * S))
        ox = min(max(ox, 0), MW - pw)
        oy = min(max(oy, 0), MH - ph)
        boxes.append((ox, oy, pw, ph))
        yy, xx = np.mgrid[0:ph, 0:pw].astype(np.float32)
        big = 1e5
        dl = xx if ox > 0 else np.full_like(xx, big)
        dr = (pw - 1 - xx) if ox + pw < MW else np.full_like(xx, big)
        dt = yy if oy > 0 else np.full_like(xx, big)
        db = (ph - 1 - yy) if oy + ph < MH else np.full_like(xx, big)
        w = np.minimum(np.minimum(dl, dr), np.minimum(dt, db))
        if box is None:
            w = w + 2e5 * name.count('!')
        else:
            gx, gy = xx + ox, yy + oy
            inside = (gx >= box[0] * S) & (gx <= box[2] * S) & (gy >= box[1] * S) & (gy <= box[3] * S)
            w = w + 2e5 * name.count('!') * inside
        wmaps[k, oy:oy + ph, ox:ox + pw] = w
    label = np.argmax(wmaps, 0)
    del wmaps

    acc = None
    for k, (name, path, x0, y0, wf4, box) in enumerate(tiles):
        ox, oy, pw, ph = boxes[k]
        t = cv2.imread(path).astype(np.float32)
        if t.shape[1] != pw or t.shape[0] != ph:
            t = cv2.resize(t, (pw, ph), interpolation=cv2.INTER_AREA if t.shape[1] > pw else cv2.INTER_LANCZOS4)
        ref = pup[oy:oy + ph, ox:ox + pw]
        if sigma > 0 and '~' not in name:
            t = t + cv2.GaussianBlur(ref - t, (0, 0), sigma)
        full = pup.copy()
        full[oy:oy + ph, ox:ox + pw] = t
        m = (label == k).astype(np.float32)
        lp = lpyr(full, levels)
        gm = gpyr(m, levels)
        if acc is None:
            acc = [np.zeros_like(l) for l in lp]
        for i in range(levels):
            acc[i] += lp[i] * gm[i][..., None]
        print(name, 'at', (ox, oy, pw, ph), 'share %.1f%%' % (100 * m.mean()))
    res = np.clip(collapse(acc), 0, 255).astype(np.uint8)
    cv2.imwrite(out, res)
    lab = (label.astype(np.float32) * (255.0 / max(1, len(tiles) - 1))).astype(np.uint8)
    cv2.imwrite(out.replace('.png', '-seams.png'), cv2.resize(lab, (MW // 4, MH // 4), interpolation=cv2.INTER_NEAREST))
    json.dump({'size': [MW, MH], 'scale': S, 'tiles': [dict(name=n, path=p, f4=[x, y, w], box=bx, at=list(b)) for (n, p, x, y, w, bx), b in zip(tiles, boxes)]},
              open(out.replace('.png', '.json'), 'w'), indent=1)
    print(out, res.shape)


if __name__ == '__main__':
    main()
