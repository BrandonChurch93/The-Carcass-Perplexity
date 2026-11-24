#!/usr/bin/env python3
"""The reveal sheets for set x6.
out/contact/reveal-contact-sheet.jpg : the reveal frame, the four key frames of the pull-back with each closer frame outlined
                                       in the wider one, and the marked copy with its legend
out/contact/reveal-marked.jpg        : the marked copy alone (frame 4 with the six places numbered in film order)
pull/places-x6.json                  : where each mark sits, in percent of the frame width and height
Positions: the lake comes from the frame geometry; the lava glow, the storm and the salt flats are measured from the picture
(centroid of the orange, white and red pixels in a box); the strait and the airways are read off the picture by eye."""
import json, os, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
R = '/home/user/workspace/r3'; TAG = sys.argv[1] if len(sys.argv) > 1 else 'x6'
P = json.load(open(f'{R}/tools/places.json')); FR = json.load(open(f'{R}/pull/frames-{TAG}.json'))
KM = 4000.0 / 1555.0          # STATED: the body is 4,000 km from crown to heel; it measures 1,555 px of the 1982-px wide frame
def font(sz, bold=False): return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', sz)
F = {n: Image.open(f'{R}/pull/f{n}-{TAG}.png').convert('RGB') for n in (1, 2, 3, 4)}
a = np.asarray(F[4]).astype(np.float32); Wp, Hp = F[4].size
def box(x0, x1, y0, y1): return slice(int(y0 * Hp / 100), int(y1 * Hp / 100)), slice(int(x0 * Wp / 100), int(x1 * Wp / 100))
def centroid(mask, x0, x1, y0, y1):
    sy, sx = box(x0, x1, y0, y1); m = mask[sy, sx]; ys, xs = np.nonzero(m)
    return (float(xs.mean() + sx.start) / Wp * 100, float(ys.mean() + sy.start) / Hp * 100, int(m.sum()))
r, g, b = a[..., 0], a[..., 1], a[..., 2]
f4 = FR['f4']; lake = ((423.856 - f4['x0']) / f4['w'] * 100, (526.411 - f4['y0']) / f4['h'] * 100)
lava = centroid((r > 190) & (r - b > 90) & (g > 70), 34, 42, 33, 44)
storm = centroid((r > 205) & (g > 205) & (b > 205), 47, 58, 42, 50)
salt = centroid((r > 110) & (r - g > 55) & (r - b > 45), 59, 67, 42, 54)
T = {'ribs': (40.2, 46.4), 'heart': lava[:2], 'breath': (28.6, 42.2), 'marsh': salt[:2], 'spine': storm[:2], 'eye': lake}
WHAT = {'ribs': 'the tidal strait between the two rows of rib ridges', 'heart': 'the lava glow in the chest', 'breath': 'the airways: sinkholes in the dark throat plateau, with vapour',
        'marsh': 'the red salt flats in the hip basin', 'spine': 'the storm on the spine ridge', 'eye': 'the round lake in the eye socket'}
json.dump({k: dict(x_pct=round(v[0], 2), y_pct=round(v[1], 2), what=WHAT[k]) for k, v in T.items()}, open(f'{R}/pull/places-{TAG}.json', 'w'), indent=1)
print({k: (round(v[0], 1), round(v[1], 1)) for k, v in T.items()}, '| px counted: lava', lava[2], 'storm', storm[2], 'salt', salt[2])
RING = {'ribs': 26, 'heart': 18, 'breath': 34, 'marsh': 46, 'spine': 34, 'eye': 20}   # ring radius in px of a 2352-px wide copy
OFF = {'ribs': (150, 300), 'heart': (40, -250), 'breath': (-150, -300), 'marsh': (60, 300), 'spine': (40, -290), 'eye': (-200, 280)}
def chip(d, cx, cy, n, col, r=34, fs=38):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col, outline='#ffffff', width=max(3, r // 7))
    t = str(n); f = font(fs, True); bb = d.textbbox((0, 0), t, font=f); d.text((cx - (bb[2] + bb[0]) / 2, cy - (bb[3] + bb[1]) / 2), t, fill='#ffffff', font=f)
def marked(w):
    s = w / Wp; im = ImageEnhance.Brightness(F[4].resize((w, round(Hp * s)), Image.LANCZOS)).enhance(0.86); d = ImageDraw.Draw(im); k = w / 2352.0
    for n, pl in enumerate(P['order'], 1):
        x, y = T[pl][0] / 100 * im.size[0], T[pl][1] / 100 * im.size[1]; mx, my = x + OFF[pl][0] * k, y + OFF[pl][1] * k
        rr = max(8, round(RING.get(pl, 20) * k)); L = ((mx - x) ** 2 + (my - y) ** 2) ** 0.5; ex, ey = x + (mx - x) * rr / L, y + (my - y) * rr / L
        d.line([(ex, ey), (mx, my)], fill='#0d0f12', width=max(4, round(8 * k))); d.line([(ex, ey), (mx, my)], fill='#ffffff', width=max(2, round(4 * k)))
        d.ellipse([x - rr, y - rr, x + rr, y + rr], outline='#0d0f12', width=max(4, round(8 * k))); d.ellipse([x - rr, y - rr, x + rr, y + rr], outline='#ffffff', width=max(2, round(4 * k)))
        chip(d, mx, my, n, P[pl]['colour'], r=round(36 * k), fs=round(40 * k))
    return im
def rect_in(n_in, n_out):
    fa, fb = FR[f'f{n_in}'], FR[f'f{n_out}']; return ((fa['x0'] - fb['x0']) / fb['w'], (fa['y0'] - fb['y0']) / fb['h'], fa['w'] / fb['w'], fa['h'] / fb['h'])
W, M = 2400, 24; fw = W - 2 * M; cw = (W - 3 * M) // 2; ch = round(cw * Hp / Wp)
big = F[4].resize((fw, round(Hp * fw / Wp)), Image.LANCZOS); mk = marked(fw)
CAP = {1: ('1  JUST ABOVE THE LAKE', 'The round shore fills the frame.'), 2: ('2  THE SKULL MASSIF', 'The lake is an eye socket in a skull-shaped massif.'),
       3: ('3  HEAD AND SHOULDERS', 'The first of the other places come into view: the airways and the lava glow.'), 4: ('4  THE WHOLE TITAN FROM ORBIT', 'The reveal frame.')}
head, capA, capB, leg = 170, 64, 104, 250
H = head + big.size[1] + capA + M + 60 + 2 * (ch + capB) + M + 60 + mk.size[1] + leg + M
S = Image.new('RGB', (W, H), '#0d0f12'); d = ImageDraw.Draw(S)
d.text((M, 26), 'THE CARCASS  /  THE REVEAL', fill='#e6e9ee', font=font(54, True))
d.text((M, 100), 'The last shot: the camera leaves The Eye and rises straight up to orbit with no cut, and the continent is the titan.', fill='#9aa3ae', font=font(28))
y = head; S.paste(big, (M, y)); y += big.size[1]
d.text((M, y + 14), 'THE REVEAL FRAME  (key frame 4 of the pull-back; about %s km across the frame, stated)' % format(round(f4['w'] * KM, -1), ',.0f'), fill='#c9ced6', font=font(27)); y += capA + M
d.text((M, y), 'THE PULL-BACK: FOUR KEY FRAMES OF ONE RISING CAMERA.  The white outline in each frame is the frame before it.', fill='#e6e9ee', font=font(28, True)); y += 60
for i, n in enumerate((1, 2, 3, 4)):
    cx = M + (i % 2) * (cw + M); cy = y + (i // 2) * (ch + capB); im = F[n].resize((cw, ch), Image.LANCZOS); dd = ImageDraw.Draw(im)
    for m in range(n - 1, 0, -1):
        if n - m > (3 if n == 4 else 1): continue
        x0, y0, w0, h0 = rect_in(m, n); bx = [x0 * cw, y0 * ch, (x0 + w0) * cw, (y0 + h0) * ch]
        dd.rectangle(bx, outline='#0d0f12', width=7); dd.rectangle(bx, outline='#ffffff', width=3)
        if w0 * cw > 60:
            t = str(m); f = font(26, True); tb = dd.textbbox((0, 0), t, font=f); px, py = bx[0] + 8, bx[1] + 6
            dd.rectangle([px - 4, py - 2, px + tb[2] + 6, py + tb[3] + 6], fill='#0d0f12'); dd.text((px, py), t, fill='#ffffff', font=f)
    S.paste(im, (cx, cy)); wkm = FR[f'f{n}']['w'] * KM
    d.text((cx, cy + ch + 10), CAP[n][0] + '   (about %s km wide, stated)' % format(round(wkm, -1), ',.0f'), fill='#e6e9ee', font=font(26, True))
    d.text((cx, cy + ch + 48), CAP[n][1], fill='#9aa3ae', font=font(24))
y += 2 * (ch + capB) + M
d.text((M, y), 'WHERE THE SIX PLACES SIT ON THE BODY  (the reveal frame, darkened; numbers are film order; the pull-back starts at 6)', fill='#e6e9ee', font=font(28, True)); y += 60
S.paste(mk, (M, y)); y += mk.size[1] + 26
LEG = {'ribs': 'the tidal strait between the rib rows', 'heart': 'the lava glow in the chest', 'breath': 'the airways in the throat', 'marsh': 'the red salt flats in the hips', 'spine': 'the storm on the spine ridge', 'eye': 'the round lake in the eye socket'}
colw = fw // 3
for n, pl in enumerate(P['order'], 1):
    cx = M + ((n - 1) % 3) * colw; cy = y + ((n - 1) // 3) * 92 + 34
    chip(d, cx + 30, cy, n, P[pl]['colour'], r=28, fs=30)
    d.text((cx + 74, cy - 34), P[pl]['title'], fill='#e6e9ee', font=font(28, True)); d.text((cx + 74, cy + 2), LEG[pl], fill='#9aa3ae', font=font(24))
out = f'{R}/out/contact/reveal-contact-sheet.jpg'; S.save(out, 'JPEG', quality=88, optimize=True); print(out, S.size, round(os.path.getsize(out) / 1e6, 2), 'MB')
m2 = marked(Wp * 2); out2 = f'{R}/out/contact/reveal-marked.jpg'; m2.save(out2, 'JPEG', quality=90, optimize=True); print(out2, m2.size, round(os.path.getsize(out2) / 1e6, 2), 'MB')
m3 = marked(1600); m3.save(f'{R}/tmp/reveal-marked-view.jpg', 'JPEG', quality=88)
v = S.resize((1200, round(H * 1200 / W)), Image.LANCZOS); v.save(f'{R}/tmp/reveal-sheet-view.jpg', 'JPEG', quality=85); print('sheet view', v.size)
