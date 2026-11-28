"""The sea bed, the other land and the ice of the planet of the Reveal, baked to two maps the land sheet reads from orbit.

  public/assets/reveal/land/ocean-land.jpg   red, green: the slope of the ground (0.5 is level); blue: its height, the body's own
                                             convention (over 0.3 land, 0.3 the waterline, under it how shallow the water is by a coast)
  public/assets/reveal/land/ocean-bed.jpg    red: the sea bed (0 the deepest basin, 1 a shoal); green: under a half bloom drawn out along
                                             one current field, over a half the silt of three rivers carried by it; blue: under 0.45 how
                                             cold the water is, over 0.5 pack ice (floes, leads)
  assets-src/reveal/land/ocean/ocean-mask.png  for the weather: red other land, green ice (1024 px wide, the same rectangle)

All cover one rectangle of the master picture (px): x -1800 to 7416, y -800 to 4834.
Run from the repo root: python3 assets-src/reveal/land/ocean/make_ocean.py [--amount A|B|C] [--ice 1.0] [--quick] [--out DIR]
Everything is computed from fixed seeds; nothing is drawn by hand and no picture is generated.
"""
import sys
import numpy as np
import cv2
from PIL import Image


def arg(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


QUICK = '--quick' in sys.argv
FAST = QUICK or '--fast' in sys.argv      # no erosion and short streaks: for trying the layout, the bed or the silt
AMOUNT = arg('--amount', 'C')
ICE = float(arg('--ice', '1.0'))
W, H = (1024, 626) if QUICK else (4096, 2504)
X0, Y0, PW = -1800.0, -800.0, 9216.0
S = PW / W                      # master px a texel
LIMB = (4241.0, 9956.0, 10183.0)
OUT = arg('--out', 'out/work/ocean' if QUICK else 'public/assets/reveal/land')
# How much of the other land there is: A as first sketched, B the arc's two largest grown to real islands and the far coast
# further in from the edge, C between the two.
GROW = {'A': 0.0, 'C': 0.5, 'B': 1.0}[AMOUNT]

xs = X0 + (np.arange(W, dtype=np.float32) + 0.5) * S
ys = Y0 + (np.arange(H, dtype=np.float32) + 0.5) * S
MX, MY = np.meshgrid(xs, ys)


def lattice(cell, seed):
    """Smooth noise of about unit variance; cell is its wavelength in master px."""
    c = max(cell / S, 1.0)
    gw, gh = int(np.ceil(W / c)) + 4, int(np.ceil(H / c)) + 4
    g = np.random.default_rng(seed).standard_normal((gh, gw)).astype(np.float32)
    big = cv2.resize(g, (int(round(gw * c)), int(round(gh * c))), interpolation=cv2.INTER_CUBIC)
    o = int(round(c * 1.5))
    return big[o:o + H, o:o + W]


def fbm(cell, octaves, seed, gain=0.5, ridged=False):
    out = np.zeros((H, W), np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        if cell / 2 ** o < 1.5 * S:
            break
        n = lattice(cell / 2 ** o, seed + 31 * o)
        if ridged:
            n = 1.0 - 2.0 * np.abs(np.tanh(n))
        out += amp * n
        total += amp
        amp *= gain
    return out / total


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def blur(a, px):
    return cv2.GaussianBlur(a, (0, 0), max(px / S, 0.3))


def spot(cx, cy, rx, ry):
    return np.exp(-(((MX - cx) / rx) ** 2 + ((MY - cy) / ry) ** 2))


# ---- the body: where the film draws land on the titan frame (body-10027.png: the part reveal/continent drawn alone at film frame
# 10027, 1920 px wide, white where anything is drawn; the frame's window in the master is x 76.25 to 5954.95, y 43.73 to 3350.50) ----
solo = np.asarray(Image.open('assets-src/reveal/land/ocean/body-10027.png').convert('L'), np.float32) / 255.0
FX, FY, FW = 76.25, 43.73, 5878.7
u = (MX - FX) / FW * solo.shape[1] - 0.5
v = (MY - FY) / (FW * 9 / 16) * solo.shape[0] - 0.5
body = cv2.remap(solo, u, v, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0.0) > 0.5
body_px = cv2.distanceTransform((~body).astype(np.uint8), cv2.DIST_L2, 5) * S   # master px from the body, 0 on it

# ---- the other land: heights over the sea, 1 the highest ground, under 0 where there is none ----
warp_x = 60.0 * fbm(520, 4, 11) + 38.0 * fbm(150, 4, 12, gain=0.6)
warp_y = 60.0 * fbm(520, 4, 13) + 38.0 * fbm(150, 4, 14, gain=0.6)
rough = fbm(150, 6, 21, gain=0.55)
crag = fbm(240, 7, 22, gain=0.62, ridged=True)
WX, WY = MX + warp_x, MY + warp_y

# The arc: unlike volcanic islands on one curve, convex toward the body, its trench on that side. Centre and radius, master px.
ARC = (-100.0, 3550.0, 1500.0)
# angle (degrees, 90 is straight up the picture), length and width (master px), height, offset from the curve (px), and how
# much longer and wider it is at the largest amount
ISLES = [
    (103, 190, 120, 0.7, -10, 1.0, 1.0), (91.5, 80, 60, 0.42, 30, 1.0, 1.0), (80, 210, 140, 0.8, 0, 2.4, 1.5), (68.5, 60, 48, 0.36, -34, 1.0, 1.0),
    (64.5, 44, 38, 0.3, 18, 1.0, 1.0), (60.5, 120, 90, 0.6, 14, 1.0, 1.0), (47, 340, 230, 1.0, -6, 2.25, 1.2), (32.5, 84, 74, 0.55, -24, 1.0, 1.0),
    (27, 110, 80, 0.6, 10, 1.0, 1.0), (20.5, 50, 40, 0.33, 30, 1.0, 1.0), (13, 200, 130, 0.75, -8, 1.3, 1.1), (3, 90, 66, 0.5, 18, 1.0, 1.0), (-7, 150, 100, 0.6, 0, 1.0, 1.0),
]
ang = np.degrees(np.arctan2(-(WY - ARC[1]), WX - ARC[0]))
rad = np.hypot(WX - ARC[0], WY - ARC[1])
arc_field = np.full((H, W), -1.0, np.float32)
lobes = np.random.default_rng(5)
for a0, length, width, high, off, longer, wider in ISLES:
    length *= 1.0 + (longer - 1.0) * GROW
    width *= 1.0 + (wider - 1.0) * GROW
    along = np.radians(ang - a0) * ARC[2]
    across = rad - ARC[2] - off
    # (Each is several unlike lobes run together along its length, a cone and its older flanks: long and uneven where it is large,
    # never one oval and never a ring.)
    count = 1 + int(length / 80)
    for k in range(count):
        la = ((k / max(count - 1, 1)) - 0.5) * 0.78 * length * (count > 1) + lobes.uniform(-0.06, 0.06) * length
        lc = lobes.uniform(-0.28, 0.28) * width
        size = lobes.uniform(0.5, 1.0)
        turn = lobes.uniform(-0.6, 0.6)
        ra, rc = 0.5 * width * size * lobes.uniform(1.0, 1.6), 0.5 * width * size
        p = (along - la) * np.cos(turn) + (across - lc) * np.sin(turn)
        q = -(along - la) * np.sin(turn) + (across - lc) * np.cos(turn)
        d = np.sqrt((p / ra) ** 2 + (q / rc) ** 2)
        arc_field = np.maximum(arc_field, high * (0.55 + 0.45 * size) * (1.0 - d ** 1.6))

# Low islands: on a rise at the top of the frame far from hand and foot, in the sun's image at the upper right, and off the far
# end of the body past the frame of the titan. x, y, length, width (master px), height, turn (degrees).
LOW = [
    (3990, 95, 150, 70, 0.34, 20), (4200, 160, 70, 44, 0.26, -30), (3790, 40, 60, 36, 0.22, 60),
    (5640, 215, 150, 70, 0.36, -25), (5850, 415, 90, 50, 0.28, 30), (5545, 455, 54, 38, 0.24, 70), (5760, 610, 40, 30, 0.2, 10),
    (6230, 1650, 150, 70, 0.3, 70), (6120, 1950, 70, 44, 0.22, 20), (6400, 1380, 80, 40, 0.2, -40),
]
for cx, cy, length, width, high, turn in LOW:
    t = np.radians(turn)
    p = (WX - cx) * np.cos(t) + (WY - cy) * np.sin(t)
    q = -(WX - cx) * np.sin(t) + (WY - cy) * np.cos(t)
    d = np.sqrt((p / (0.5 * length)) ** 2 + (q / (0.5 * width)) ** 2)
    arc_field = np.maximum(arc_field, high * (1.0 - d ** 1.6))
# (The coast of each is the sea's level on rough ground: bays, capes and a few rocks off them, no oval.)
shore_rough = fbm(120, 6, 23, gain=0.6)
isle = arc_field + 0.3 * shore_rough * sstep(-0.7, -0.05, arc_field) + 0.2 * (0.5 + 0.5 * crag) * sstep(0.0, 0.45, arc_field)

# The far coast: a land under the planet's edge at the upper left, its shore a line of fjords and headlands, seen through the air.
ldx, ldy = MX - LIMB[0], MY - LIMB[1]
lth = np.degrees(np.arctan2(ldx, -ldy))            # 0 straight up, negative to the left
inside = LIMB[2] - np.hypot(ldx + 0.6 * warp_x, ldy + 0.6 * warp_y)   # master px inside the edge of the planet
reach = 215.0 + 115.0 * GROW + 60.0 * fbm(700, 3, 31) + 36.0 * fbm(160, 4, 32) + (90.0 + 60.0 * GROW) * sstep(-24.0, -34.0, lth)
# (It ends before the body's shoulder: past 17 degrees left of the top it sinks under the sea.)
ends = sstep(-17.0, -20.5, lth) * sstep(-47.0, -41.0, lth)
far = (reach - inside) / 150.0 - 3.0 * (1.0 - ends)
far_land = np.clip(far, -1.0, 1.6) * 0.5 + 0.2 * shore_rough * sstep(-0.6, 0.1, far) + 0.34 * (0.5 + 0.5 * crag) * sstep(0.0, 0.9, far)
far_land[inside < -420.0] = -1.0
land = np.maximum(isle, far_land)

# (Nothing of it near the body: a limb's width and more of open water round the body's own shelf, whatever the noise did.)
keep = sstep(330.0, 520.0, body_px)
land = land * keep - (1.0 - keep)
land = np.minimum(land, 1.0)
is_land = land > 0.0
land_px = cv2.distanceTransform((~is_land).astype(np.uint8), cv2.DIST_L2, 5) * S     # master px from any other land
height = np.clip(land, 0.0, 1.0)
height = (height ** 0.8 * (0.6 + 0.4 * sstep(-0.7, 0.8, crag))).astype(np.float32)


def erode(h, mask, rounds):
    """Rain on the ground: each cell drains to its lowest neighbour, the water gathers down the slope, and a stream cuts by its
    water and its fall (the stream power law), while the slopes creep. Leaves valleys that join as rivers do, and ridges between."""
    idx = np.flatnonzero(mask)
    n = idx.size
    pos = np.full(h.size, -1, np.int64)
    flat = np.arange(h.size, dtype=np.int64).reshape(h.shape)
    for _ in range(rounds):
        best = np.zeros(h.shape, np.float32)
        rec = flat.copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                fall = (h - np.roll(h, (-dy, -dx), (0, 1))) / np.hypot(dy, dx)
                better = fall > best
                best[better] = fall[better]
                rec[better] = np.roll(flat, (-dy, -dx), (0, 1))[better]
        order = idx[np.argsort(-h.ravel()[idx], kind='stable')]
        pos[order] = np.arange(n)
        to = pos[rec.ravel()[order]].tolist()
        water = [1.0] * n
        for i in range(n):
            j = to[i]
            if j > i:
                water[j] += water[i]
        area = np.zeros(h.size, np.float32)
        area[order] = np.asarray(water, np.float32)
        cut = 0.13 * np.minimum(area.reshape(h.shape), 4000.0) ** 0.45 * best
        h = np.where(mask, np.maximum(h - np.minimum(cut, 0.09), 0.0), h)
        h = np.where(mask, 0.8 * h + 0.2 * cv2.GaussianBlur(h, (0, 0), 0.8), h).astype(np.float32)
    return h


# (Only the land that is ever seen: the far coast beyond the planet's edge is left as it is.)
if not FAST:
    height = erode(height, is_land & (inside > -150.0), 9)

# ---- ocean-land: slope and height ----
shallow = np.exp(-land_px / (55.0 + 30.0 * sstep(-1.0, 1.0, fbm(300, 3, 61)))) * (1.0 - is_land)
blue = np.where(is_land, 0.3 + 0.7 * height, 0.29 * shallow)
height = height.astype(np.float32)
smooth = cv2.GaussianBlur(height, (0, 0), 0.6)
gx = cv2.Sobel(smooth, cv2.CV_32F, 1, 0, ksize=3) / 8.0
gy = cv2.Sobel(smooth, cv2.CV_32F, 0, 1, ksize=3) / 8.0
# (A height of 1 stands for 4 km, drawn five times taller, as the body's relief is drawn taller than it stands.)
RISE = 4.0 * 5.0 / (0.8566 * S)
slope_x = np.clip(0.5 + 0.5 * gx * RISE / 1.6, 0.0, 1.0)
slope_y = np.clip(0.5 + 0.5 * gy * RISE / 1.6, 0.0, 1.0)
land_map = np.stack([slope_x, slope_y, blue], axis=-1)

# ---- ocean-bed red: the sea bed ----
bed = 0.27 + 0.1 * fbm(1500, 4, 51) + 0.03 * fbm(300, 4, 52, ridged=True)
# (The floor climbs to the body from far out, on one side early and on another late.)
bed += 0.17 * np.exp(-body_px / (200.0 * (0.4 + 1.2 * sstep(-1.0, 1.0, fbm(1100, 2, 53)))))
# (The deepest basin lies west of the skull, which stands out of it alone, and another off the far coast's shelf.)
# (No basin is an oval: each is drawn through a slow bend of the floor, and its depth is uneven.)
BX, BY = MX + 260.0 * fbm(1000, 3, 58), MY + 260.0 * fbm(1000, 3, 59)


def basin(cx, cy, rx, ry):
    return np.exp(-(((BX - cx) / rx) ** 2 + ((BY - cy) / ry) ** 2) ** 0.8)


bed -= (0.26 * basin(330, 1500, 700, 560) + 0.17 * basin(1500, 3350, 560, 400) + 0.2 * basin(4700, 3900, 1000, 560) + 0.13 * basin(6800, 900, 700, 700) + 0.17 * basin(2300, 250, 520, 330) + 0.15 * basin(4700, 600, 380, 300)) * (0.75 + 0.5 * sstep(-1.0, 1.0, fbm(420, 3, 60)))
arc_on = sstep(-22.0, -8.0, ang) * sstep(118.0, 104.0, ang)
# (The trench on the body's side of the arc, and the platform the islands stand on; behind them a shallow sea.)
bed -= 0.34 * np.exp(-((rad - ARC[2] - 190.0 - 30.0 * fbm(500, 2, 54)) / 60.0) ** 2) * arc_on
bed += 0.2 * np.exp(-((rad - ARC[2]) / 130.0) ** 2) * arc_on + 0.2 * sstep(ARC[2] - 60.0, ARC[2] - 420.0, rad) * arc_on * (0.6 + 0.4 * sstep(-1.0, 1.0, fbm(380, 3, 55)))
# (Rises under the low islands, and banks that come near the surface with no land on them.)
bed += 0.22 * spot(4020, 60, 620, 260) + 0.2 * spot(5700, 380, 420, 330) + 0.2 * spot(6250, 1680, 380, 520)
for bx, by, br, bh in [(2560, 3560, 150, 0.3), (2260, 3690, 90, 0.24), (2850, 3470, 70, 0.2), (700, 760, 120, 0.2), (3350, -250, 130, 0.24), (-700, 1500, 220, 0.28), (-520, 1980, 120, 0.22)]:
    bed += bh * spot(bx, by, br * 1.5, br)
# (The shelf of the far coast.)
bed += 0.42 * np.exp(-np.maximum(inside - reach, 0.0) / (120.0 + 60.0 * sstep(-1.0, 1.0, fbm(500, 2, 56)))) * ends
bed = np.clip(bed, 0.02, 0.78)
# (Every coast of the other land stands on its own shelf, uneven.)
# (Wide enough that an island is found by its pale water before its rock is, as the body is.)
bed = np.maximum(bed, np.exp(-land_px / (95.0 + 110.0 * sstep(-1.0, 1.0, fbm(260, 3, 57)))))
bed = blur(bed.astype(np.float32), 3.0)

# ---- ocean-bed blue: the ice. A pack off the far coast, widest in its bays; floes, and leads that widen to its margin ----
ice_reach = (175.0 + 55.0 * fbm(420, 3, 41) + 24.0 * fbm(110, 3, 42)) * ICE
pack = 1.0 - (inside - reach) / np.maximum(ice_reach, 30.0) - 3.0 * (1.0 - ends)    # over 0 inside the pack, 1 at the coast


def floes(spacing, seed):
    """Cells of about that many master px: the distance to the nearest lead (texels) and one random number a cell."""
    rng = np.random.default_rng(seed)
    step = max(spacing / S, 2.0)
    gy_, gx_ = np.mgrid[0:int(H / step) + 1, 0:int(W / step) + 1]
    py = np.clip((gy_ + rng.uniform(0.1, 0.9, gy_.shape)) * step, 0, H - 1).astype(np.int32)
    px = np.clip((gx_ + rng.uniform(0.1, 0.9, gx_.shape)) * step, 0, W - 1).astype(np.int32)
    seeds = np.ones((H, W), np.uint8)
    seeds[py, px] = 0
    _, labels = cv2.distanceTransformWithLabels(seeds, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    edge = np.zeros((H, W), np.uint8)
    edge[:, 1:] |= labels[:, 1:] != labels[:, :-1]
    edge[1:, :] |= labels[1:, :] != labels[:-1, :]
    lead = cv2.distanceTransform(1 - edge, cv2.DIST_L2, 5)
    return lead, rng.uniform(0.0, 1.0, labels.max() + 1).astype(np.float32)[labels]


lead_big, rnd_big = floes(44.0, 71)
lead_small, rnd_small = floes(16.0, 72)
loose = sstep(0.75, 0.0, pack)                       # how far toward the margin: there the floes part and thin out
# (The margin is torn by the swell at every size: tongues and bights of some tens of km, and the floes themselves.)
there = sstep(0.0, 0.1, pack + 0.55 * (rnd_small - 0.5) * loose + 0.3 * fbm(260, 5, 73, gain=0.62) + 0.22 * loose * fbm(34, 3, 74))
# (Leads in master px: hair lines in the sheet, open water between the floes of the margin.)
part_big = sstep(0.1, 0.7, loose)
part_small = np.clip((loose - 0.25) / 0.75, 0.0, 1.0)
ice = there * sstep(-2.0 + 3.4 * part_big, 0.3 + 3.7 * part_big, lead_big * S) * sstep(-1.5 + 3.6 * part_small, 0.2 + 4.2 * part_small, lead_small * S)
# (The sheet itself is whole but for a few long fractures, and it is not one white: old ice is thicker than new.)
crack = np.minimum(np.abs(fbm(420, 5, 75, gain=0.55)), np.abs(fbm(300, 5, 76, gain=0.55)) + 0.02 * loose)
ice *= 1.0 - 0.8 * (1.0 - sstep(0.004, 0.03, crack)) * sstep(0.1, 0.4, pack)
ice *= 0.72 + 0.28 * sstep(-1.0, 1.0, fbm(190, 4, 77))
# (The sheet lies on over the far land to the planet's edge: only some headlands of its coast stand bare. No ice on the islands.)
on_far = is_land & (far_land >= isle)
# (On the sea it is young and thin, a blue grey skin with some thicker floes in it: the white is on the land.)
ice = np.where(on_far, ice * sstep(-30.0, 90.0, reach - inside + 70.0 * fbm(240, 4, 78)), ice * (1.0 - is_land) * (0.42 + 0.3 * rnd_big * sstep(0.2, 0.9, pack)))
cold = sstep(-2.6, 0.2, pack) * (1.0 - is_land)
ice_map = np.where(ice > 0.02, 0.5 + 0.5 * ice, 0.45 * cold * (1.0 - ice / 0.02))

# ---- ocean-bed green: bloom, drawn out along the currents. The water runs along the lines of equal depth, and round three eddies. ----
h2, w2 = H // 2, W // 2
bed = bed.astype(np.float32)
psi = blur(bed, 90.0) * 900.0
for ex, ey, er, es in [(520, 1130, 210, 260.0), (1560, 2960, 170, -220.0), (3350, 150, 180, 200.0), (2500, 3620, 200, -200.0)]:
    psi += es * spot(ex, ey, er, er)
psi = cv2.resize(psi, (w2, h2), interpolation=cv2.INTER_AREA)
vx = cv2.Sobel(psi, cv2.CV_32F, 0, 1, ksize=5)
vy = -cv2.Sobel(psi, cv2.CV_32F, 1, 0, ksize=5)
speed = np.hypot(vx, vy) + 1e-6
vx, vy = vx / speed, vy / speed
grain = np.random.default_rng(81).standard_normal((h2, w2)).astype(np.float32)
grain = cv2.GaussianBlur(grain, (0, 0), 3.0) - cv2.GaussianBlur(grain, (0, 0), 13.0)
gx2, gy2 = np.meshgrid(np.arange(w2, dtype=np.float32), np.arange(h2, dtype=np.float32))
acc = grain.copy()
for way in (1.0, -1.0):
    px_, py_ = gx2.copy(), gy2.copy()
    for k in range(4 if FAST else 44):
        sx = cv2.remap(vx, px_, py_, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        sy = cv2.remap(vy, px_, py_, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        px_ += way * sx
        py_ += way * sy
        acc += cv2.remap(grain, px_, py_, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
acc /= acc.std() + 1e-6
threads = cv2.resize(acc, (W, H), interpolation=cv2.INTER_CUBIC)
# (Bloom stands where the shelves break and round the eddies, in patches; the open deep has none.)
where = sstep(0.42, 0.56, bed) * sstep(0.95, 0.72, bed) * sstep(0.0, 0.9, fbm(620, 3, 82))
for ex, ey, er, es in [(520, 1130, 210, 260.0), (1560, 2960, 170, -220.0), (3350, 150, 180, 200.0), (2500, 3620, 200, -200.0)]:
    where = np.maximum(where, 0.9 * spot(ex, ey, er * 1.25, er * 1.25))
where *= sstep(200.0, 420.0, body_px) * (1.0 - is_land)
bloom = blur(np.clip(where * (0.4 + 0.42 * threads), 0.0, 1.0).astype(np.float32), 4.0)

# ---- silt: three rivers of the body's lower leg reach the sea, and the one current field carries each away. A plume is the
# water of its river: it leaves the mouth, is turned along the coast by the current, and widens and thins as it goes. ----
MOUTHS = [(3900.0, 2500.0, 1.0), (4230.0, 2400.0, 0.8), (4750.0, 2450.0, 0.9)]
off = cv2.resize(blur(np.minimum(body_px, 400.0).astype(np.float32), 40.0), (w2, h2), interpolation=cv2.INTER_AREA)
ox = cv2.Sobel(off, cv2.CV_32F, 1, 0, ksize=5)
oy = cv2.Sobel(off, cv2.CV_32F, 0, 1, ksize=5)
on = np.hypot(ox, oy) + 1e-6
ox, oy = ox / on, oy / on
# (The current is slow and uneven: it meanders, the same for every plume.)
wander = cv2.resize(fbm(420, 3, 91), (w2, h2), interpolation=cv2.INTER_AREA) * 55.0 * (4.5 / (2.0 * S))
mx_ = cv2.Sobel(wander, cv2.CV_32F, 0, 1, ksize=5)
my_ = -cv2.Sobel(wander, cv2.CV_32F, 1, 0, ksize=5)
# (And it is full of small eddies, which draw a plume out into threads.)
eddy = cv2.resize(fbm(130, 3, 92), (w2, h2), interpolation=cv2.INTER_AREA) * 17.0 * (4.5 / (2.0 * S))
mx_ = 1.1 * mx_ + 0.9 * cv2.Sobel(eddy, cv2.CV_32F, 0, 1, ksize=5)
my_ = 1.1 * my_ - 0.9 * cv2.Sobel(eddy, cv2.CV_32F, 1, 0, ksize=5)
water2 = cv2.resize((body_px > 3.0).astype(np.float32), (w2, h2), interpolation=cv2.INTER_AREA) * cv2.resize(1.0 - is_land.astype(np.float32), (w2, h2), interpolation=cv2.INTER_AREA)
near2 = cv2.resize(body_px.astype(np.float32), (w2, h2), interpolation=cv2.INTER_AREA)
S2 = S * 2.0
# (The river's own push dies out within some tens of km of the shore; from there the current has it.)
push = 1.3 * np.exp(-near2 / 70.0) + 0.12
ux = 0.8 * vx + push * ox + mx_
uy = 0.8 * vy + push * oy + my_
un = np.hypot(ux, uy) + 1e-6
pace = np.clip(un, 0.45, 1.6) / un
ux, uy = ux * pace, uy * pace
source = np.zeros((h2, w2), np.float32)
for sx_, sy_, strength in MOUTHS:
    # (The mouth is the water nearest that place.)
    cand = np.argwhere((near2 > 10.0) & (near2 < 22.0))
    k = np.argmin((cand[:, 1] * S2 + X0 - sx_) ** 2 + (cand[:, 0] * S2 + Y0 - sy_) ** 2)
    source += strength * np.exp(-((gx2 - cand[k, 1]) ** 2 + (gy2 - cand[k, 0]) ** 2) / (2.0 * (13.0 / S2) ** 2))
# (The water is followed back up the current one step at a time: what was upstream is here now, a little thinner and a little
# wider. Run until the plume stands still.)
silt2 = np.zeros((h2, w2), np.float32)
fade = float(np.exp(-S2 / 750.0))
for age in range(int(2400.0 / S2)):
    silt2 = cv2.remap(silt2, gx2 - ux, gy2 - uy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0.0) * fade * water2 + 0.3 * source
    if age % 3 == 0:
        silt2 = cv2.GaussianBlur(silt2, (0, 0), 2.0)
silt2 = silt2 / (1.0 + silt2)
silt = cv2.resize(silt2, (W, H), interpolation=cv2.INTER_CUBIC)
# (Threads along the current, and patches: a plume is never even.)
silt = np.clip(1.5 * silt * (0.8 + 0.3 * threads + 0.35 * fbm(150, 4, 94)), 0.0, 1.0) ** 0.6 * (1.0 - is_land)
# (Green holds both: over a half silt, under it bloom, and where the silt is there is no bloom.)
bloom = 0.5 + 0.5 * silt - 0.5 * bloom * (1.0 - sstep(0.0, 0.2, silt))

bed_map = np.stack([bed, bloom, ice_map], axis=-1)


def save(name, a):
    Image.fromarray(np.round(np.clip(a, 0.0, 1.0) * 255.0).astype(np.uint8)).save(f'{OUT}/{name}', quality=88, subsampling=0)


save('ocean-land.jpg', land_map)
save('ocean-bed.jpg', bed_map)
small = (1024, 626)
mask = np.zeros((626, 1024, 3), np.uint8)
mask[..., 0] = cv2.resize(is_land.astype(np.float32), small, interpolation=cv2.INTER_AREA) * 255
mask[..., 1] = cv2.resize(((ice > 0.3) & (inside > -40.0)).astype(np.float32), small, interpolation=cv2.INTER_AREA) * 255
Image.fromarray(mask).save('assets-src/reveal/land/ocean/ocean-mask.png' if not QUICK and '--out' not in sys.argv else f'{OUT}/ocean-mask.png')
# (For the sketch of the layout on a frame: out/work/sketch.py.)
if OUT.startswith('out/work'):
    np.save(f'{OUT}/land-raw.npy', cv2.resize(land, small, interpolation=cv2.INTER_AREA))
    np.save(f'{OUT}/ice-raw.npy', cv2.resize(ice, small, interpolation=cv2.INTER_AREA) - 0.3)
print('other land', round(float(is_land.mean()), 4), 'ice', round(float((ice > 0.3).mean()), 4))
if '--debug' in sys.argv:
    band = (ends > 0.99) & (inside > reach) & ~is_land
    for name, f in (('pack>0', pack > 0), ('pack>0.5', pack > 0.5), ('there>0.5', there > 0.5), ('ice>0.3', ice > 0.3)):
        print(name, int((f & band).sum()))
    print('ice_reach', float(ice_reach[band].min()), float(ice_reach[band].mean()), 'loose mean in pack', float(loose[band & (pack > 0)].mean()))
