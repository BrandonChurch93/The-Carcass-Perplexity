#!/usr/bin/env python3
"""Paint the corrections asked for by the blind tests on master-x1 into a layout guide (1672x941, the wide reveal frame).
Changes: shoulder joints and collar bones; both arms and both legs redrawn as plain limb bones with hands and feet;
the breastbone opened into a through-going strait between two rows of ribs (upper row painted to answer the lower row);
the storm moved onto the backbone; the salt pan whitened. Everything else is the reduced master untouched.
usage: guide_e.py <in.png> <out.png>"""
import sys, cv2, numpy as np
rng = np.random.default_rng(7)
src, out = sys.argv[1:3]
im = cv2.imread(src).astype(np.float32)
orig = im.copy()
H, W = im.shape[:2]
BONE = np.array([150, 157, 163], np.float32); HIDE = np.array([58, 62, 84], np.float32); CRUST = np.array([40, 38, 43], np.float32)
JADE = np.array([112, 120, 74], np.float32); SLATE = np.array([60, 49, 33], np.float32); WHITE = np.array([232, 232, 230], np.float32)
FOOT = np.array([78, 76, 78], np.float32)

def tile_tex(x0, y0, x1, y1):
    p = orig[y0:y1, x0:x1]
    row = np.concatenate([p, p[:, ::-1]], axis=1); blk = np.concatenate([row, row[::-1]], axis=0)
    ny, nx = H // blk.shape[0] + 1, W // blk.shape[1] + 1
    return np.tile(blk, (ny, nx, 1))[:H, :W].copy()
SEA_TEX = tile_tex(20, 600, 420, 920)          # open ocean with fine cloud
GLINT_TEX = tile_tex(1530, 385, 1660, 500)     # smooth sunglint

def poly_u8(pts):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.int32(pts)], 255); return m

def line_mask(pts, width, feather=0.8):
    m = np.zeros((H, W), np.uint8)
    for a, b in zip(pts[:-1], pts[1:]):
        cv2.line(m, (int(round(a[0])), int(round(a[1]))), (int(round(b[0])), int(round(b[1]))), 255, max(1, int(round(width))), cv2.LINE_AA)
    m = m.astype(np.float32) / 255
    return cv2.GaussianBlur(m, (0, 0), feather) if feather else m

def disc_mask(c, r, feather=0.8):
    m = np.zeros((H, W), np.uint8); cv2.circle(m, (int(round(c[0])), int(round(c[1]))), max(1, int(round(r))), 255, -1, cv2.LINE_AA)
    return cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), feather)

def put(mask, colour, alpha=1.0, noise=6.0):
    global im
    n = cv2.GaussianBlur(rng.normal(0, noise, (H, W)).astype(np.float32), (0, 0), 1.2)[..., None]
    a = (mask * alpha)[..., None]
    im = im * (1 - a) + (colour[None, None, :] + n * 2.5) * a

def erase(m_u8, feather=6):
    """replace with open sea: colour interpolated smoothly from the sea round the patch, plus fine cloud stipple"""
    global im
    cur = np.clip(im, 0, 255)
    xx = np.arange(W)[None, :].repeat(H, 0); yy = np.arange(H)[:, None].repeat(W, 1)
    glint_zone = (xx > 1480) & (yy < 560)
    sea = ((m_u8 == 0) & (cur.max(axis=2) < 165) & (((cur[..., 0] - cur[..., 2]) > 12) | glint_zone)).astype(np.float32)
    num = cv2.GaussianBlur(cur * sea[..., None], (0, 0), 26); den = cv2.GaussianBlur(sea, (0, 0), 26)[..., None] + 1e-3
    bg = num / den
    detail = SEA_TEX - cv2.GaussianBlur(SEA_TEX, (0, 0), 10)
    amp = np.clip(1.0 - (bg.max(axis=2) - 80) / 50.0, 0.1, 1.0)[..., None]      # hardly any cloud stipple in the sunglint
    fill = bg + detail * amp * 0.8
    a = cv2.GaussianBlur((m_u8 > 0).astype(np.float32), (0, 0), feather)[..., None]
    im = im * (1 - a) + fill * a

def erase_poly(pts): erase(poly_u8(pts))

def halo(pts, width, alpha=0.5):
    m = line_mask(pts, width, feather=7)
    dark = (im.max(axis=2) < 100).astype(np.float32)
    put(m * cv2.GaussianBlur(dark, (0, 0), 2), JADE, alpha, noise=4)

def bez(p0, p1, p2, n=20):
    t = np.linspace(0, 1, n)[:, None]
    return ((1 - t) ** 2 * np.array(p0, float) + 2 * (1 - t) * t * np.array(p1, float) + t ** 2 * np.array(p2, float))

def long_bone(p0, p1, w_mid, w_end, gap=None, colour=BONE):
    """a limb bone as a ragged range: swollen at both ends, thin in the shaft, edges uneven"""
    p0 = np.array(p0, float); p1 = np.array(p1, float); L = np.linalg.norm(p1 - p0); d = (p1 - p0) / L; nrm = np.array([-d[1], d[0]])
    n = max(12, int(L / 5)); t = np.linspace(0, 1, n)
    r = (w_mid + (w_end - w_mid) * np.abs(2 * t - 1) ** 2.2) / 2
    r = r * (1 + 0.16 * cv2.GaussianBlur(rng.normal(0, 1, (n, 1)).astype(np.float32), (0, 0), 1.0)[:, 0])
    r2 = r * (1 + 0.16 * cv2.GaussianBlur(rng.normal(0, 1, (n, 1)).astype(np.float32), (0, 0), 1.0)[:, 0])
    wob = 1.6 * cv2.GaussianBlur(rng.normal(0, 1, (n, 1)).astype(np.float32), (0, 0), 2.0)[:, 0]
    c = p0[None] + (t * L)[:, None] * d[None] + wob[:, None] * nrm[None]
    polyg = np.concatenate([c + r[:, None] * nrm[None], (c - r2[:, None] * nrm[None])[::-1]])
    m = poly_u8(polyg).astype(np.float32) / 255
    if gap is not None:                                    # a narrow break where the sea has cut through
        g = c[int(gap * (n - 1))]; m = m * (1 - disc_mask(g, 3.2, 0.6))
    put(cv2.GaussianBlur(cv2.dilate(m, np.ones((5, 5), np.uint8)), (0, 0), 1.6), FOOT, 0.5, noise=3)
    put(cv2.GaussianBlur(m, (0, 0), 0.8), colour, 1.0)
    put(line_mask(c.tolist(), max(1.5, w_mid * 0.22), feather=0.7) * m, WHITE, 0.5, noise=3)

def stroke(pts, width, colour=BONE):
    put(line_mask(pts, width + 4, feather=1.5), FOOT, 0.5, noise=3)
    put(line_mask(pts, width), colour, 1.0)
    put(line_mask(pts, max(1.2, width * 0.25), feather=0.6), WHITE, 0.45, noise=3)

# ---------------------------------------------------------------- 1. chest: heart field, upper row of ribs, strait
erase_poly([(586, 292), (700, 282), (830, 286), (848, 330), (842, 424), (586, 426)])
put(cv2.GaussianBlur(poly_u8([(590, 422), (592, 322), (628, 300), (700, 296), (738, 318), (748, 372), (742, 422)]).astype(np.float32) / 255, (0, 0), 3), CRUST, 0.95, noise=5)
ub = [600, 634, 668, 700, 730, 760, 788]
ut = [(40, 334), (48, 312), (55, 298), (60, 292), (62, 296), (58, 312), (50, 334)]
for i, (bx, (dx, ty)) in enumerate(zip(ub, ut)):
    pts = bez((bx, 423), (bx + 6, (423 + ty) / 2 - 8), (bx + dx, ty))
    if i == 5: pts = pts[:11]                              # two ribs broken off short: decay, and it breaks the symmetry
    if i == 6: pts = pts[:8]
    stroke(pts.tolist(), 6.5 if i < 5 else 5.5)
    halo(pts.tolist(), 14, 0.3)
put(disc_mask((641, 372), 2.2, 0.7), np.array([40, 130, 255], np.float32), 1.0, noise=0)          # the ember
put(disc_mask((641, 372), 6, 3), np.array([30, 70, 200], np.float32), 0.35, noise=0)
put(line_mask([(643, 370), (664, 352), (690, 338)], 3, feather=2), np.array([150, 150, 150], np.float32), 0.35, noise=2)
ch = [(752, 438), (700, 437), (650, 436), (612, 438), (582, 452), (558, 482), (536, 520), (510, 562), (480, 606)]
erase(np.uint8(line_mask(ch, 30, 0) * 255))
put(line_mask(ch, 26, feather=2.2), SLATE, 0.92, noise=4)
put(line_mask([(640, 437), (700, 437), (750, 438)], 3, feather=1.5), JADE, 0.4, noise=2)          # the drowned backbone shows through
# ---------------------------------------------------------------- 2. storm on the backbone; the old one, off the ridge, removed
erase_poly([(925, 240), (1075, 232), (1082, 340), (1030, 346), (930, 362)])
for (cx, cy, r) in [(882, 436, 22), (905, 445, 25), (930, 434, 21), (896, 423, 15), (918, 453, 15), (946, 446, 13), (866, 446, 12)]:
    put(disc_mask((cx, cy), r, feather=4), WHITE, 0.95, noise=3)
put(line_mask([(866, 458), (820, 486), (770, 505)], 12, feather=6), WHITE, 0.4, noise=2)          # blow-off drifting down wind
# ---------------------------------------------------------------- 3. salt pan in the hips: whiter, the brine darker red
pan = cv2.GaussianBlur(poly_u8([(1004, 398), (1050, 386), (1096, 404), (1100, 470), (1082, 508), (1030, 512), (1004, 470)]).astype(np.float32) / 255, (0, 0), 4)
red = cv2.GaussianBlur(((im[..., 2] - im[..., 1]) > 22).astype(np.float32), (0, 0), 0.8)
put(pan * (1 - red), WHITE, 0.6, noise=3)
put(pan * red, np.array([34, 24, 118], np.float32), 0.75, noise=3)
# ---------------------------------------------------------------- 4. shoulders, collar bones, raised arm
erase_poly([(486, 196), (548, 176), (560, 196), (548, 300), (520, 318), (488, 300)])            # old upper arm, which grew out of the skull
erase_poly([(536, 150), (592, 138), (598, 186), (548, 202)])                                      # old elbow
erase_poly([(812, 88), (900, 92), (900, 215), (800, 215), (790, 190), (820, 150)])                # finger ends, too long
sh_u = (556, 300); el_u = (590, 160)
halo([sh_u, el_u], 44)
long_bone(sh_u, el_u, 11, 22)
stroke(bez(sh_u, (560, 362), (586, 416)).tolist(), 6.5)                                           # collar bone
put(disc_mask(sh_u, 12, 1.0), BONE, 1.0)
# ---------------------------------------------------------------- 5. lower arm: bones through the hide
erase_poly([(396, 520), (520, 512), (548, 560), (560, 620), (520, 660), (450, 610), (400, 560)])  # hide mass under the jaw: the arm must not grow out of the head
sh_l = (578, 584); el_l = (694, 682); wr_l = (822, 738)
halo([sh_l, el_l, wr_l, (920, 768)], 60, 0.4)
put(line_mask([sh_l, el_l], 40, feather=5), HIDE, 0.8, noise=6)                                   # hide left on the upper arm only
long_bone(sh_l, el_l, 11, 22)
stroke(bez(sh_l, (580, 520), (592, 462)).tolist(), 6.5)                                           # collar bone
put(disc_mask(sh_l, 12, 1.0), BONE, 1.0)
long_bone((el_l[0] + 5, el_l[1] - 4), (wr_l[0], wr_l[1] - 6), 5, 9)                               # forearm, two bones
long_bone((el_l[0] + 1, el_l[1] + 6), (wr_l[0], wr_l[1] + 6), 4.5, 8, gap=0.55)
erase_poly([(838, 700), (1000, 740), (1000, 800), (842, 792)])
put(disc_mask((wr_l[0] + 8, wr_l[1]), 9, 1.0), BONE, 1.0)
for k, (dx, dy) in enumerate([(62, -24), (98, -6), (106, 12), (100, 28), (86, 42)]):
    stroke(bez((wr_l[0] + 10, wr_l[1] + (k - 2) * 2.5), (wr_l[0] + dx * 0.55, wr_l[1] + dy * 0.45), (wr_l[0] + dx, wr_l[1] + dy), 12).tolist(), 3.2)
halo([(wr_l[0], wr_l[1]), (930, 765)], 74, 0.4)
# ---------------------------------------------------------------- 6. straight leg (upper in frame)
erase_poly([(1150, 318), (1300, 280), (1480, 292), (1625, 270), (1640, 350), (1480, 352), (1300, 345), (1160, 372)])
hp_u = (1108, 378); kn_u = (1336, 316); an_u = (1560, 320)
halo([hp_u, kn_u, an_u], 64, 0.42)
long_bone(hp_u, kn_u, 15, 30, gap=None)
long_bone((kn_u[0] + 6, kn_u[1] - 5), (an_u[0], an_u[1] - 5), 8, 15)
long_bone((kn_u[0] + 10, kn_u[1] + 8), (an_u[0] - 4, an_u[1] + 7), 4, 7, gap=0.6)
put(disc_mask((kn_u[0] + 2, kn_u[1] - 2), 9, 1.0), BONE, 1.0)                                     # knee cap
heel = (an_u[0] + 6, an_u[1] + 8)
long_bone(heel, (an_u[0] + 20, an_u[1] - 74), 12, 17)
for k in range(5):
    stroke([(an_u[0] + 11 + k * 4.5, an_u[1] - 76), (an_u[0] + 9 + k * 5.5, an_u[1] - 92 + k * 2)], 3)
# ---------------------------------------------------------------- 7. bent leg (lower in frame): thigh out to a raised knee, shin folded back toward the body
erase_poly([(1110, 500), (1250, 468), (1335, 478), (1352, 560), (1345, 724), (1288, 732), (1268, 612), (1200, 600), (1120, 562)])
hp_l = (1088, 524); kn_l = (1318, 502); an_l = (1264, 714)
halo([hp_l, kn_l, an_l, (1352, 738)], 64, 0.45)
put(line_mask([(1112, 522), (1232, 512)], 38, feather=5), HIDE, 0.75, noise=6)                    # hide left on the thigh
long_bone(hp_l, kn_l, 15, 30)
long_bone((kn_l[0] - 5, kn_l[1] + 8), (an_l[0] - 5, an_l[1] - 2), 8, 15)
long_bone((kn_l[0] + 8, kn_l[1] + 10), (an_l[0] + 8, an_l[1] - 4), 4, 7, gap=0.45)
put(disc_mask((kn_l[0] + 2, kn_l[1] + 1), 9, 1.0), BONE, 1.0)
long_bone((an_l[0] - 8, an_l[1] + 6), (an_l[0] + 74, an_l[1] + 22), 12, 17)
for k in range(5):
    stroke([(an_l[0] + 76, an_l[1] + 13 + k * 4.5), (an_l[0] + 92 - k * 2, an_l[1] + 11 + k * 5.5)], 3)
cv2.imwrite(out, np.clip(im, 0, 255).astype(np.uint8))
