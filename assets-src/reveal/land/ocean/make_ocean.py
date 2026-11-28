"""The sea bed, the other land and the ice of the planet of the Reveal, baked to two maps the land sheet reads from orbit.

  public/assets/reveal/land/ocean-land.jpg   red, green: the slope of the ground (0.5 is level); blue: its height, the body's own
                                             convention (over 0.3 land, 0.3 the waterline, under it how shallow the water is near a coast)
  public/assets/reveal/land/ocean-bed.jpg    red: the sea bed (0 the deepest basin, 1 a shoal); green: bloom and eddies drawn out by
                                             one current field; blue: pack ice (floes, leads)

Both cover the same rectangle of the master picture (px): x -1800 to 7416, y -800 to 4834.
Run from the repo root: python3 assets-src/reveal/land/ocean/make_ocean.py [--quick]
Everything is computed from fixed seeds; nothing is drawn by hand and no picture is generated.
"""
import sys
import numpy as np
import cv2
from PIL import Image

QUICK = '--quick' in sys.argv
W, H = (1024, 626) if QUICK else (4096, 2504)
X0, Y0, PW = -1800.0, -800.0, 9216.0
S = PW / W                      # master px a texel
KM = 0.8566 * S                 # km a texel
K = 4096 / W                    # how much coarser than the full map
LIMB = (4241.0, 9956.0, 10183.0)
OUT = 'out/work/ocean' if QUICK else 'public/assets/reveal/land'

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
    """Gaussian blur; px is sigma in master px."""
    s = max(px / S, 0.3)
    return cv2.GaussianBlur(a, (0, 0), s)


# ---- the body: where the film draws land on the titan frame (body-10027.png: the part reveal/continent drawn alone at film frame
# 10027, 1920 px wide, white where anything is drawn; the frame's window in the master is x 76.25 to 5954.95, y 43.73 to 3350.50) ----
solo = np.asarray(Image.open('assets-src/reveal/land/ocean/body-10027.png').convert('L'), np.float32) / 255.0
FX, FY, FW = 76.25, 43.73, 5878.7
u = (MX - FX) / FW * solo.shape[1] - 0.5
v = (MY - FY) / (FW * 9 / 16) * solo.shape[0] - 0.5
body = cv2.remap(solo, u, v, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0.0) > 0.5
body_px = cv2.distanceTransform((~body).astype(np.uint8), cv2.DIST_L2, 5) * S   # master px from the body, 0 on it

# ---- the other land: heights over the sea in km-like units, under 0 where there is none ----
land = np.full((H, W), -1.0, np.float32)
warp_x = 60.0 * fbm(520, 4, 11) + 14.0 * fbm(90, 3, 12)
warp_y = 60.0 * fbm(520, 4, 13) + 14.0 * fbm(90, 3, 14)
rough = fbm(150, 6, 21, gain=0.55)
crag = fbm(260, 7, 22, gain=0.6, ridged=True)

# The arc: unlike volcanic islands on one curve, convex toward the body, its trench on that side. Centre and radius, master px.
ARC = (-100.0, 3550.0, 1500.0)
# angle (degrees, 90 is straight up the picture), length and width (master px), height, offset from the curve (px)
ISLES = [
    (101, 190, 120, 0.7, -10), (89.5, 80, 60, 0.42, 30), (80, 210, 140, 0.8, 0), (71, 60, 48, 0.36, -34), (67.5, 44, 38, 0.3, 18),
    (58, 170, 120, 0.72, 14), (47, 340, 230, 1.0, -6), (35.5, 84, 74, 0.55, -24), (29, 130, 84, 0.6, 10), (21.5, 50, 40, 0.33, 30),
    (13, 200, 130, 0.75, -8), (3, 90, 66, 0.5, 18), (-7, 150, 100, 0.6, 0),
]
arc_field = np.full((H, W), -1.0, np.float32)
ang = np.degrees(np.arctan2(-(MY + warp_y - ARC[1]), MX + warp_x - ARC[0]))
rad = np.hypot(MX + warp_x - ARC[0], MY + warp_y - ARC[1])
lobes = np.random.default_rng(5)
for a0, length, width, high, off in ISLES:
    along = np.radians(ang - a0) * ARC[2]
    across = rad - ARC[2] - off
    # (Each is several unlike lobes run together, a cone and its older flanks, never one oval and never long: nothing here is a limb.)
    for k in range(1 + int(length / 80)):
        la = lobes.uniform(-0.3, 0.3) * length * (k > 0)
        lc = lobes.uniform(-0.3, 0.3) * width * (k > 0)
        size = lobes.uniform(0.55, 0.8) if k > 0 else 1.0
        turn = lobes.uniform(0.0, np.pi)
        ra, rc = 0.42 * width * size * lobes.uniform(0.9, 1.5), 0.42 * width * size
        p = (along - la) * np.cos(turn) + (across - lc) * np.sin(turn)
        q = -(along - la) * np.sin(turn) + (across - lc) * np.cos(turn)
        d = np.sqrt((p / ra) ** 2 + (q / rc) ** 2)
        arc_field = np.maximum(arc_field, high * (1.0 if k == 0 else size) * (1.0 - d ** 1.6))
isle = arc_field + 0.14 * rough * sstep(-0.4, 0.1, arc_field) + 0.16 * (0.5 + 0.5 * crag) * sstep(0.0, 0.5, arc_field)
land = np.maximum(land, isle)

# The far coast: a land under the planet's edge at the upper left, its shore a line of fjords and headlands, seen through the air.
ldx, ldy = MX - LIMB[0], MY - LIMB[1]
lr = np.hypot(ldx + 0.6 * warp_x, ldy + 0.6 * warp_y)
lth = np.degrees(np.arctan2(ldx, -ldy))            # 0 straight up, negative to the left
inside = LIMB[2] - lr                              # master px inside the edge of the planet
reach = 215.0 + 60.0 * fbm(700, 3, 31) + 36.0 * fbm(160, 4, 32) + 90.0 * sstep(-24.0, -34.0, lth)   # how far inside the edge the coast lies
# (It ends before the body's shoulder: past 18 degrees left of the top it sinks under the sea.)
ends = sstep(-17.0, -20.5, lth) * sstep(-47.0, -40.0, lth)
reach = reach * ends - 130.0 * (1.0 - ends)
far = (reach - inside) / 150.0
far_land = np.clip(far, -1.0, 1.4) * 0.55 + 0.2 * rough * sstep(-0.5, 0.2, far) + 0.3 * (0.5 + 0.5 * crag) * sstep(0.0, 0.8, far)
far_land[inside < -420.0] = -1.0
land = np.maximum(land, far_land)

# The top of the frame, far from hand and foot: low dark islands on a rise (the larger amounts only: they stand lowest).
TOP = [(3990, 95, 120, 50, 0.3, 20), (4190, 150, 60, 36, 0.24, -30), (3800, 40, 50, 30, 0.2, 60), (6230, 1650, 130, 60, 0.3, 70), (6120, 1950, 60, 40, 0.22, 20), (6400, 1380, 70, 36, 0.2, -40)]
top_field = np.full((H, W), -1.0, np.float32)
for cx, cy, length, width, high, turn in TOP:
    t = np.radians(turn)
    p = (MX + warp_x - cx) * np.cos(t) + (MY + warp_y - cy) * np.sin(t)
    q = -(MX + warp_x - cx) * np.sin(t) + (MY + warp_y - cy) * np.cos(t)
    d = np.sqrt((p / (0.5 * length)) ** 2 + (q / (0.5 * width)) ** 2)
    top_field = np.maximum(top_field, high * (1.0 - d * d))
land = np.maximum(land, top_field + 0.1 * rough * sstep(-0.3, 0.1, top_field))

# (Nothing of it near the body: a limb's width and more of open water round the body's own shelf, whatever the noise did.)
keep = sstep(330.0, 520.0, body_px)
land = land * keep - (1.0 - keep)

# ---- the ice: a pack off the far coast, widest in its bays ----
ice_reach = 150.0 + 85.0 * fbm(420, 3, 41) + 30.0 * fbm(110, 3, 42)
ice_base = 1.0 - (inside - reach) / np.maximum(ice_reach, 30.0) - 3.0 * (1.0 - ends)
if QUICK:
    np.save('out/work/ocean/land-raw.npy', land)
    np.save('out/work/ocean/ice-raw.npy', ice_base)

if QUICK:
    dbg = np.zeros((H, W, 3), np.uint8)
    dbg[..., 1] = body * 255
    dbg[..., 2] = (land > 0) * 255
    dbg[..., 0] = np.clip(body_px / 6.0, 0, 255)
    cv2.imwrite('out/work/ocean/dbg.png', dbg)
