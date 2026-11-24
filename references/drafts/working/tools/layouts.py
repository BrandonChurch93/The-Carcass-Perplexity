#!/usr/bin/env python3
"""Top-down layout sketches for step 2: where each detail sits and the route the camera takes. usage: layouts.py [place ...]"""
import sys, numpy as np, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Circle, Wedge, Ellipse, Rectangle
import matplotlib.patheffects as pe
BG = '#0f1215'; INK = '#e3e7ec'; DIM = '#9aa3ae'; ROUTE = '#ffd36b'
OUT = '/home/user/workspace/r3/layout2'
def chaikin(pts, n=3, closed=True):
    p = np.array(pts, float)
    for _ in range(n):
        q = []; m = len(p)
        if not closed: q.append(p[0])
        for i in (range(m) if closed else range(m - 1)):
            a = p[i]; b = p[(i + 1) % m]; q += [0.75 * a + 0.25 * b, 0.25 * a + 0.75 * b]
        if not closed: q.append(p[-1])
        p = np.array(q)
    return p
class S:
    def __init__(s, title, sub, accent):
        s.fig = plt.figure(figsize=(16, 9), dpi=110); s.ax = s.fig.add_axes([0, 0, 1, 1]); s.ax.set_xlim(0, 160); s.ax.set_ylim(0, 90); s.ax.axis('off')
        s.fig.patch.set_facecolor(BG); s.accent = accent; s.title = title; s.sub = sub; s.stops = []
    def blob(s, pts, fc, ec=None, lw=1.2, alpha=1, z=1, n=3, hatch=None, ls='-'):
        s.ax.add_patch(Polygon(chaikin(pts, n), closed=True, fc=fc, ec=ec or 'none', lw=lw, alpha=alpha, zorder=z, hatch=hatch, ls=ls, joinstyle='round'))
    def poly(s, pts, fc, ec=None, lw=1.2, alpha=1, z=1, hatch=None):
        s.ax.add_patch(Polygon(np.array(pts, float), closed=True, fc=fc, ec=ec or 'none', lw=lw, alpha=alpha, zorder=z, hatch=hatch, joinstyle='round'))
    def line(s, pts, c, lw=2, z=2, n=3, ls='-', alpha=1):
        P = chaikin(pts, n, closed=False); s.ax.plot(P[:, 0], P[:, 1], color=c, lw=lw, zorder=z, ls=ls, alpha=alpha, solid_capstyle='round'); return P
    def ell(s, x, y, rx, ry, fc, ec=None, lw=1.2, ang=0, alpha=1, z=1, ls='-', hatch=None):
        s.ax.add_patch(Ellipse((x, y), 2 * rx, 2 * ry, angle=ang, fc=fc, ec=ec or 'none', lw=lw, alpha=alpha, zorder=z, ls=ls, hatch=hatch))
    def label(s, x, y, t, c=DIM, size=10.5, ha='center', va='center', z=12, rot=0, bold=False, to=None):
        if to is not None: s.ax.plot([x, to[0]], [y, to[1]], color=c, lw=0.9, alpha=0.8, zorder=z - 1)
        s.ax.text(x, y, t, color=c, fontsize=size, ha=ha, va=va, zorder=z, rotation=rot, fontweight='bold' if bold else 'normal', linespacing=1.2, path_effects=[pe.withStroke(linewidth=3.5, foreground=BG)])
    def dots(s, pts, c, size=16, z=5, marker='o', ec='none', lw=0):
        P = np.array(pts, float); s.ax.scatter(P[:, 0], P[:, 1], s=size, c=c, zorder=z, marker=marker, edgecolors=ec, linewidths=lw)
    def arrow(s, a, b, c=DIM, lw=1.4, z=6, ms=14, ls='-'):
        s.ax.annotate('', xy=b, xytext=a, arrowprops=dict(arrowstyle='-|>', color=c, lw=lw, mutation_scale=ms, ls=ls, shrinkA=0, shrinkB=0), zorder=z)
    def camera(s, x, y, ang, fov=70, r=30):
        s.ax.add_patch(Wedge((x, y), r, ang - fov / 2, ang + fov / 2, fc='#ffffff', alpha=0.075, ec='none', zorder=4))
        for a in (ang - fov / 2, ang + fov / 2):
            s.ax.plot([x, x + r * np.cos(np.radians(a))], [y, y + r * np.sin(np.radians(a))], color='#ffffff', alpha=0.45, lw=1, ls=(0, (4, 4)), zorder=4)
        s.ax.add_patch(Circle((x, y), 2.1, fc='#ffffff', ec=BG, lw=1.5, zorder=14)); s.ax.text(x, y - 0.05, 'E', color=BG, fontsize=12, fontweight='bold', ha='center', va='center', zorder=15)
    def route(s, pts, n=4, heads=7, ls='-', start=0.1, end=0.985):
        P = chaikin(pts, n, closed=False)
        s.ax.plot(P[:, 0], P[:, 1], color=ROUTE, lw=2.8, zorder=9, ls=ls, solid_capstyle='round', path_effects=[pe.withStroke(linewidth=5.5, foreground=BG)])
        L = np.r_[0, np.cumsum(np.hypot(*np.diff(P, axis=0).T))]
        for f in np.linspace(start, end, heads):
            i = int(min(max(np.searchsorted(L, f * L[-1]), 2), len(P) - 1)); a = P[i - 2]; b = P[i]
            s.ax.annotate('', xy=b, xytext=a, arrowprops=dict(arrowstyle='-|>', color=ROUTE, lw=0, mutation_scale=20, shrinkA=0, shrinkB=0), zorder=10)
    def stop(s, n, x, y, name, lx=None, ly=None, ha='left'):
        s.ax.add_patch(Circle((x, y), 2.25, fc=s.accent, ec='#ffffff', lw=1.8, zorder=14)); s.ax.text(x, y - 0.05, str(n), color='#ffffff', fontsize=12.5, fontweight='bold', ha='center', va='center', zorder=15)
        s.stops.append((n, name))
        if lx is not None: s.label(lx, ly, name, c=INK, size=11, ha=ha, bold=True, to=(x, y))
    def finish(s, scale_len, scale_text, name):
        ax = s.ax
        ax.add_patch(Rectangle((0, 79.2), 160, 10.8, fc=BG, ec='none', zorder=20)); ax.add_patch(Rectangle((0, 0), 160, 7.2, fc=BG, ec='none', zorder=20))
        ax.plot([0, 160], [79.2, 79.2], color='#2a3038', lw=1, zorder=21); ax.plot([0, 160], [7.2, 7.2], color='#2a3038', lw=1, zorder=21)
        ax.text(3.5, 85.6, s.title, color=INK, fontsize=21, fontweight='bold', va='center', zorder=22); ax.text(3.5, 81.6, s.sub, color=DIM, fontsize=11.5, va='center', zorder=22)
        ax.text(156.5, 85.6, 'TOP-DOWN LAYOUT SKETCH', color=DIM, fontsize=11, ha='right', va='center', zorder=22); ax.text(156.5, 81.9, 'not to exact scale', color=DIM, fontsize=10, ha='right', va='center', zorder=22)
        # legend strip
        x = 3.5; y = 3.6
        ax.add_patch(Circle((x + 1.6, y), 1.6, fc='#ffffff', ec=BG, lw=1, zorder=22)); ax.text(x + 1.6, y, 'E', color=BG, fontsize=9.5, fontweight='bold', ha='center', va='center', zorder=23)
        ax.text(x + 4.2, y, 'establishing view and what it sees', color=DIM, fontsize=10, va='center', zorder=22)
        x = 46; ax.plot([x, x + 6], [y, y], color=ROUTE, lw=2.8, zorder=22); ax.annotate('', xy=(x + 7.2, y), xytext=(x + 5, y), arrowprops=dict(arrowstyle='-|>', color=ROUTE, lw=0, mutation_scale=18), zorder=23)
        ax.text(x + 8.6, y, 'camera route', color=DIM, fontsize=10, va='center', zorder=22)
        x = 70; ax.add_patch(Circle((x + 1.6, y), 1.6, fc=s.accent, ec='#ffffff', lw=1.2, zorder=22)); ax.text(x + 1.6, y, '1', color='#ffffff', fontsize=9.5, fontweight='bold', ha='center', va='center', zorder=23)
        ax.text(x + 4.2, y, 'detail the camera pushes in on', color=DIM, fontsize=10, va='center', zorder=22)
        x = 156.5 - scale_len; ax.plot([x, x + scale_len], [y - 0.9, y - 0.9], color=INK, lw=2, zorder=22)
        for xx in (x, x + scale_len): ax.plot([xx, xx], [y - 1.7, y - 0.1], color=INK, lw=2, zorder=22)
        ax.text(x + scale_len / 2, y + 1.3, scale_text, color=INK, fontsize=10, ha='center', va='center', zorder=22)
        s.fig.savefig(f'{OUT}/{name}-layout.png', facecolor=BG); plt.close(s.fig); print(f'{OUT}/{name}-layout.png')

def heart():
    s = S('THE HEART', 'A caldera lake of lava under a crust that things walk on. Nightfall. The crust looks like ground.', '#e2531b')
    s.poly([(0, 0), (160, 0), (160, 90), (0, 90)], '#1a1c20')
    s.blob([(34, 13), (27, 30), (31, 50), (48, 64), (80, 69), (112, 66), (142, 60), (154, 44), (152, 22), (130, 11), (92, 9), (58, 9)], '#2f2a28', ec='#e2531b', lw=1.1, z=2)
    s.blob([(0, 6), (0, 60), (16, 63), (27, 52), (24, 32), (31, 15), (54, 8.6), (54, 5)], '#474a50', z=3)
    s.blob([(113, 80), (108, 66), (98, 52), (93, 44), (98, 41), (106, 49), (120, 62), (130, 80)], '#3b3e44', z=3)
    for seg in ([(40, 27), (52, 31), (60, 28), (72, 34)], [(70, 44), (84, 42), (96, 46), (108, 42)], [(46, 48), (58, 52), (66, 50)], [(96, 22), (110, 26), (122, 23), (134, 28)], [(112, 36), (124, 38), (136, 34), (146, 38)], [(74, 18), (84, 22), (92, 19)], [(126, 50), (136, 52), (146, 48)]):
        s.line(seg, '#ff8a2a', lw=1.6, z=4, n=2)
    s.line([(31.5, 17), (34, 22), (38, 25), (44, 24.5)], '#ffb04a', lw=2.2, z=5, n=2)
    s.ell(57, 71.5, 7.5, 3.6, '#08090a', ec='#e2531b', lw=1.5, z=5)
    s.blob([(55.6, 69), (57.6, 69), (60.5, 62), (66, 56.5), (61, 54.5), (54.5, 57.5), (56, 63)], '#ff8a2a', alpha=0.95, z=5)
    s.dots([(128, 32), (131, 33.5), (134, 31.5)], '#ffd36b', size=46, marker='*', z=6); s.dots([(84, 20)], '#ffd36b', size=46, marker='*', z=6)
    s.dots([(84, 43.5), (88, 45), (91, 42.5), (94, 45.5), (87, 41)], '#f2ede4', size=24, z=7, ec=BG, lw=0.6); s.dots([(120, 53), (127, 51)], '#f2ede4', size=16, z=7, ec=BG, lw=0.6); s.dots([(49, 34)], '#f2ede4', size=26, z=7, ec=BG, lw=0.6)
    s.dots([(61, 21.5)], '#f2ede4', size=60, marker='x', z=7, lw=1.8)
    s.dots([(12, 31)], '#e8d24a', size=40, z=7)
    s.label(12, 34.5, 'steaming crack,\nsulphur', size=9.5); s.label(14, 50, 'the bench:\nsolid old lava', size=10.5, c=INK)
    s.label(84, 74.5, 'caldera wall, 300 m of cliff', size=10.5); s.label(141, 70, 'second chamber\nbeyond the buttress', size=9.5)
    s.label(117, 71, 'the buttress', size=10, c=INK, rot=58); s.label(138, 27, 'plate foundering,\nspatter', size=9.5, ha='left')
    s.label(120, 14.5, 'THE LAKE: black crust plates, glowing seams, about 1 km across', size=10.5, c=INK)
    s.label(49, 38.5, 'walker stepping\nonto the crust', size=9.5); s.label(123, 57, 'two far out', size=9.5)
    s.camera(20, 11.5, 41, fov=74, r=36)
    s.route([(20, 11.5), (29, 19), (37, 24), (50, 20.5), (61, 21), (74, 30), (88, 43), (80, 55), (66, 62), (58, 69)], heads=7)
    s.stop(1, 37.5, 24.2, 'the lava surface\nat the line', 31, 43.5, ha='center')
    s.stop(2, 61, 21.5, 'the one that sank', 66, 13.5, ha='left')
    s.stop(3, 88, 43.5, 'crust-walkers feeding\nat a bright seam', 100, 33, ha='left')
    s.stop(4, 57.5, 69.5, 'the vessel mouth\nand its lava fall', 31, 73, ha='center')
    s.finish(20, '200 m', 'heart')

def marsh():
    s = S('THE BLOOD MARSH', 'Salt flats where the old blood still seeps up. White overcast, windless, rain far off. The mud holds what steps on it.', '#a82828')
    s.poly([(0, 0), (160, 0), (160, 90), (0, 90)], '#5d5f61')
    s.blob([(84, 7), (82, 24), (100, 33), (130, 30), (156, 21), (160, 7)], '#74777a', z=2, hatch='..', ec='#8c8f92', lw=0.8)
    s.blob([(0, 5), (0, 24), (16, 26), (33, 18), (40, 5)], '#8f9296', z=3)
    W = '#7a1b1f'
    s.line([(56, 4), (55, 19), (68, 31), (84, 38), (100, 44), (118, 51), (140, 59), (160, 65)], W, lw=13, z=3)
    s.line([(84, 38), (78, 52), (68, 64), (66, 78)], W, lw=6, z=3); s.line([(118, 51), (125, 64), (121, 79)], W, lw=5, z=3); s.line([(100, 44), (113, 39), (132, 42), (160, 40)], W, lw=4.5, z=3)
    s.line([(68, 64), (56, 68), (46, 78)], W, lw=3, z=3); s.line([(140, 59), (146, 70), (144, 79)], W, lw=3, z=3)
    def pool(x, y, rx, ry, big=False):
        s.ell(x, y, rx + 1.3, ry + 1.3, '#e9e5de', z=4); s.ell(x, y, rx, ry, '#611317', z=5)
    pool(32, 43, 12, 9.5, True)
    for p in ((58, 58, 4, 3.2), (98, 64, 5, 4), (146, 49, 5.5, 4.2), (108, 74, 3.2, 2.6), (24, 70, 3.5, 2.8)): pool(*p)
    for r, a in ((4, .5), (7.2, .35)): s.ell(30, 42, r, r * .8, 'none', ec='#e9a9a0', lw=1, z=6, alpha=a, ls=(0, (3, 3)))
    rng = np.random.default_rng(4)
    ring = [(32 + (13.6 + rng.uniform(-1, 1.8)) * np.cos(t), 43 + (11 + rng.uniform(-1, 1.6)) * np.sin(t)) for t in np.r_[np.linspace(0.3, 3.3, 22), np.linspace(3.9, 5.4, 6)]]
    s.dots(ring, '#e23a4a', size=20, z=7)
    for cx, cy, k in ((58, 58, 6), (98, 64, 8), (146, 49, 9), (108, 74, 4), (24, 70, 5), (72, 46, 4)):
        s.dots([(cx + rng.uniform(-6.5, 6.5), cy + rng.uniform(-5, 5)) for _ in range(k)], '#e23a4a', size=14, z=7)
    s.blob([(28, 61), (33, 68), (45, 69), (51, 63), (44, 58), (34, 58)], '#8f9296', z=3); s.blob([(128, 70), (133, 76), (144, 76.5), (147, 71), (140, 67)], '#8f9296', z=3)
    s.dots([(70, 32.5), (74, 35.5), (65, 27), (80, 37.5), (88, 40.5), (93, 43), (57, 14), (104, 46.5), (61, 21)], '#d9d4cc', size=42, z=7, ec=BG, lw=0.7)
    s.dots([(101, 16), (114, 24), (122, 13), (109, 11)], '#ffffff', size=70, marker='X', z=7, ec=BG, lw=0.6); s.dots([(110, 19)], '#d9d4cc', size=46, z=7, ec='#ffffff', lw=1.6)
    s.label(13, 9.6, 'low rock rise', size=10, c=INK); s.label(39.5, 63.5, 'rock\nhummock', size=9.5, c=INK)
    s.label(135, 13, 'THIN CRUST OVER MUD\nthe salt-crusted dead (X)\nand one still alive', size=10, c='#ffffff', ha='center')
    s.label(108, 55.5, 'the vein: main channel of red brine, 10 m wide, branching', size=10, c='#ffffff', rot=21)
    s.label(79, 73, 'far flats, more seep pools,\nthe escarpment 6 km on,\nrain hanging in front of it', size=9.5, c='#ffffff')
    s.label(16, 50, 'steam', size=9.5, c='#ffffff')
    s.label(76, 27, 'wallowers keep\nto the channel', size=9.5, c='#ffffff', ha='left')
    s.camera(15, 13, 37, fov=72, r=38)
    s.route([(15, 13), (24, 23), (33, 31.5), (43, 40), (44.5, 51), (56, 43), (68, 35), (86, 27), (106, 20), (119, 31), (125, 47), (140, 59), (157, 65)], heads=8)
    s.stop(1, 33.5, 32.5, 'the bubbling\nseep pool', 45.5, 23.5, ha='left')
    s.stop(2, 44.5, 51, 'the stalk colony', 53, 52.5, ha='left')
    s.stop(3, 69, 34.5, 'mud-wallowers', 62, 41.5, ha='center')
    s.stop(4, 107, 20, 'the one on\nthe thin crust', 92, 12.5, ha='center')
    s.finish(25, '50 m', 'marsh')

def eye():
    s = S('THE EYE', 'A round lake in a socket of cliffs. Clear, still evening. A ring of amber shallows and a centre that goes all the way down.', '#c9861a')
    s.poly([(0, 0), (160, 0), (160, 90), (0, 90)], '#24272b')
    cx, cy = 84, 44
    t = np.linspace(0, 2 * np.pi, 40, endpoint=False); rng = np.random.default_rng(2)
    outer = [(cx + (41 + rng.uniform(-2, 3)) * 1.12 * np.cos(a), cy + (35.5 + rng.uniform(-1.2, 1.5)) * np.sin(a)) for a in t]
    s.blob(outer, '#565a60', z=2)
    s.ell(cx, cy, 34, 30.2, '#a8701c', z=3)
    for a in np.linspace(0, 2 * np.pi, 64, endpoint=False):
        r0 = 15.5 + rng.uniform(0, 3); r1 = 26 + rng.uniform(0, 7)
        s.ax.plot([cx + r0 * 1.12 * np.cos(a), cx + r1 * 1.12 * np.cos(a)], [cy + r0 * np.sin(a), cy + r1 * np.sin(a)], color='#e9b24a', lw=1.1, alpha=0.75, zorder=4)
    s.ell(cx, cy, 15.4, 13.6, '#07121d', ec='#1d3a52', lw=1.5, z=5)
    for r, a in ((3.5, .7), (7, .5), (10.5, .32)): s.ell(cx, cy, r * 1.12, r, 'none', ec='#8fb3cf', lw=1, z=6, alpha=a, ls=(0, (3, 3)))
    s.ax.add_patch(Wedge((cx, cy), 36, -52, 46, width=6.5, fc='#15171a', alpha=0.85, ec='none', zorder=6)); 
    s.poly([(62, 4), (60, 15.5), (74, 15.5), (78, 4)], '#24272b', z=3); s.blob([(63, 15), (66, 18.5), (73, 18.5), (75, 15), (72, 7.2), (66, 7.2)], '#a8701c', z=3, n=1)
    s.line([(69, 17), (67.5, 12), (64, 8), (62, 3)], '#6fb7c7', lw=3, z=5)
    s.blob([(74, 8), (76, 15), (88, 14.2), (92, 9.5), (84, 7.5)], '#74787e', z=4)
    s.ell(cx, cy + 27.5, 24, 3.2, '#ffffff', alpha=0.2, z=6)
    s.dots([(76 + i * 1.75 + rng.uniform(-.5, .5), 15.2 + 0.035 * (i - 3) ** 2 + rng.uniform(-.7, .7)) for i in range(16)], '#f2ede4', size=18, z=8, ec=BG, lw=0.5)
    s.label(127, 44, 'THE BROW\ncliff overhangs\nthe water,\nshore in shadow', size=9.5, c=INK, ha='center')
    s.label(84, 77, 'cliffs 200 m, caves, scree; mist at their foot', size=10)
    s.label(47, 64, 'AMBER SHALLOWS\nknee-deep, clear,\nfilaments all combed\ntoward the centre', size=9.5, c=INK, to=(60, 55), ha='center')
    s.label(113, 71.5, 'lake 2 km across', size=9.5)
    s.label(52, 10, 'the gap:\noutflow stream', size=9.5, to=(64, 9), ha='center'); s.label(96.5, 10.5, 'scree and\ngravel', size=9.5, ha='left')
    s.label(102, 17.5, 'the herd drinks here,\nnever deeper than its ankles', size=9.5, ha='left', to=(97, 16))
    s.arrow((10, 46), (24, 46), c='#ffd9a0', lw=2, ms=18); s.label(17, 49.5, 'low sun', c='#ffd9a0', size=10)
    s.camera(71, 10, 80, fov=78, r=40)
    s.route([(71, 10), (78, 13.5), (84, 16.5), (81.5, 22.5), (82.5, 30.3), (84, 37), (84, 44)], heads=5, start=0.2)
    s.stop(1, 85, 16.6, 'drinkers at the shore', None)
    s.stop(2, 81.5, 23, 'the iris: amber mats', None)
    s.stop(3, 82.6, 30.6, 'the edge: where the floor stops', None)
    s.stop(4, 84, 44, 'what rises from the centre', None)
    for n, yy, tx in ((1, 16.6, 'drinkers at the shore'), ):
        pass
    s.label(141, 31, '1  drinkers at the shore\n2  the iris: amber mats\n3  the edge, where the floor stops\n4  what rises from the centre', c=INK, size=10.5, ha='center', bold=True)
    s.label(84, 51.5, 'THE DEEP\na shaft with sheer walls,\nno bottom in sight', size=9.5, c='#b9d2e6')
    s.label(96, 37.5, 'then straight up:\nthe pull-back to orbit', size=9.5, c=ROUTE, ha='left', to=(86.3, 43.5))
    s.finish(15, '500 m', 'eye')

def spine():
    s = S('THE SPINE', 'A knife ridge of vertebrae above the cloud, a storm standing against it. Dusk. The lightning walks the ridge from spire to spire.', '#7b5cd6')
    s.poly([(0, 0), (160, 0), (160, 90), (0, 90)], '#3d444e')
    s.blob([(0, 30), (0, 90), (120, 90), (104, 76), (78, 62), (52, 48), (30, 36), (14, 26)], '#1c1830', z=1, hatch='///', ec='#352c5a', lw=0)
    s.blob([(60, 0), (160, 0), (160, 62), (140, 52), (112, 36), (86, 22), (66, 8)], '#aeb6c0', z=1, alpha=0.5)
    s.line([(160, 9), (160, 60)], '#ff9a3a', lw=7, z=2)
    axis = np.array([(30, 12), (52, 26), (76, 40), (100, 52), (122, 62), (146, 70)], float)
    s.line(list(map(tuple, np.r_[[(14, 3)], axis, [(160, 74)]])), '#7f8791', lw=20, z=2, n=3)
    s.line(list(map(tuple, np.r_[[(14, 3)], axis, [(160, 74)]])), '#e6ebf0', lw=5, z=3, n=3)
    shape = np.array([(-9.5, 0), (-4.5, 3.2), (-2.6, 9.5), (2.6, 9.5), (4.5, 3.2), (9.5, 0), (4.5, -3.2), (2.6, -9.5), (-2.6, -9.5), (-4.5, -3.2)])
    cents = [(52, 26, 1.0), (76, 40, 0.92), (100, 52, 0.86), (122, 62, 0.78), (146, 70, 0.7)]
    for i, (x, y, k) in enumerate(cents):
        a = np.arctan2(*(axis[min(i + 2, 5)] - axis[i])[::-1]) if i < 4 else np.arctan2(8, 24)
        Rm = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]]); P = (shape * k) @ Rm.T + (x, y)
        s.blob(list(map(tuple, P)), '#8d949d', ec='#c5ccd4', lw=1, z=4, n=2)
        s.ell(x, y, 2.6 * k, 1.5 * k, '#0b0b0d', ang=np.degrees(a), z=5)
        if i < 3:
            for j in range(4):
                o = np.array([x + 1.5, y - 0.6 - j * 0.9]); Lk = (15 - j * 2.2) * k
                tt = np.linspace(0, 1, 30); wx = o[0] + tt * Lk * 0.93; wy = o[1] - tt * Lk * 0.42 + np.sin(tt * 9 + j) * 0.55 * tt
                s.ax.plot(wx, wy, color='#cdbcff' if i < 2 else '#a98bff', lw=1.3, alpha=0.9, zorder=6)
    s.line(list(map(tuple, np.r_[[(44.5, 21.3)], axis[1:], [(158, 73.5)]])), '#1a1c20', lw=2, z=5, ls=(0, (2, 2.5)), n=3)
    s.ell(44.6, 21.4, 2.2, 1.5, '#0b0b0d', ang=33, z=6, ec='#e6ebf0', lw=1)
    s.ax.plot([76, 82, 86, 93, 96, 100], [66, 62.5, 61, 57, 55.5, 52.5], color='#e9dcff', lw=2.2, zorder=8); s.ax.plot([86, 90, 89], [61, 62.5, 65], color='#e9dcff', lw=1.2, zorder=8)
    for y0 in (62, 50, 38):
        s.arrow((6, y0), (20, y0 - 8.2), c='#c9c0ee', lw=1.6, ms=16)
    s.label(22, 68, 'THE STORM\ncloud wall, hail,\ncloud pouring over\nthe low saddles', size=10, c='#d9d0ff'); s.label(10, 43, 'gale', size=10, c='#c9c0ee', rot=-30)
    s.label(124, 22, 'CLOUD SEA\n2,000 m below', size=10, c=INK); s.label(151, 34, 'last light', size=10, c='#ffb469', rot=90)
    s.label(72, 68.5, 'strike', size=9.5, c='#e9dcff'); s.label(74.5, 31, 'tether-kites stream\ndownwind from\nevery spire', size=9.5, c=INK, ha='left')
    s.label(131, 55.5, 'the canal runs through\nthe whole ridge (dotted)', size=9.5, c=INK, ha='left', to=(128, 63.5))
    s.label(27, 21, 'snow saddle,\nanimal tracks', size=9.5, c=INK, ha='center')
    s.label(111.5, 69.5, 'burned black\ntip of each spire', size=9.5, c=INK, ha='center', to=(121.5, 62.5))
    s.camera(27, 10, 33, fov=64, r=40)
    s.route([(27, 10), (33, 13.5), (38.5, 17.3), (41, 23.5), (45, 29.5), (50, 31.5)], heads=3, start=0.3)
    s.route([(50, 31.5), (52.5, 28.5), (50, 24.5), (45.5, 22)], heads=1, start=0.9, end=0.9, n=3)
    s.route([(45.5, 22), (52, 26), (64, 33.2), (76, 40), (90, 47.2)], heads=3, ls=(0, (1.2, 1.6)), start=0.3)
    s.ax.plot([50, 97.6], [31.5, 51.4], color=ROUTE, lw=1.3, ls=(0, (6, 4)), zorder=8, alpha=0.9)
    s.stop(1, 38.5, 17.3, 'where lightning\ncame to ground', 50, 11, ha='left')
    s.stop(2, 50, 31.8, 'tether-kites on\nthe first spire', 42, 42, ha='center')
    s.stop(3, 100, 52, 'the strike on the third spire\n(long lens from 2)', 96, 43, ha='left')
    s.stop(4, 45.6, 21.6, 'into the canal,\nthrough the ridge', 62, 19.5, ha='left')
    s.finish(25, '500 m', 'spine')

def ribs():
    s = S('THE RIBS', 'A tidal strait under two rows of rib blades. Sea wind after a storm, low tide. The tide comes back through the cage as a wall.', '#c8642a')
    s.poly([(0, 0), (160, 0), (160, 90), (0, 90)], '#1f3436')
    s.blob([(34, 0), (30, 20), (42, 44), (52, 62), (62, 76), (70, 90), (104, 90), (108, 76), (118, 60), (130, 42), (140, 20), (136, 0)], '#4b5158', z=1)
    rng = np.random.default_rng(7)
    for _ in range(26):
        x = rng.uniform(46, 124); y = rng.uniform(8, 66)
        if 34 + (y / 76) * 28 < x < 136 - (y / 76) * 28: s.ell(x, y, rng.uniform(1.5, 5), rng.uniform(.8, 2), '#93a7b3', ang=rng.uniform(-30, 30), z=2, alpha=0.8)
    for seg in ([(80, 8), (76, 22), (84, 36), (80, 52), (86, 66)], [(100, 10), (96, 26), (104, 40), (98, 56)], [(62, 14), (66, 30), (60, 44), (68, 58)]): s.line(seg, '#93a7b3', lw=1.6, z=2, alpha=0.8)
    def rib(base, tip, w, lab=None):
        b = np.array(base, float); t = np.array(tip, float); d = (t - b) / np.hypot(*(t - b)); nrm = np.array([-d[1], d[0]])
        s.poly([tuple(b + nrm * w * .8), tuple(t), tuple(b - nrm * w * .8)], '#e9e2d2', alpha=0.2, z=5, ec='#e9e2d2', lw=1)
        s.ell(b[0], b[1], w * 1.25, w, '#d8d0bf', ec='#0c1210', lw=4, ang=np.degrees(np.arctan2(d[1], d[0])), z=6)
    rib((22, 15), (58, 22), 9); rib((40, 45), (66, 48), 6.2); rib((51, 64), (72, 64), 4.8)
    rib((142, 24), (104, 31), 10.5); rib((128, 48), (100, 51), 6.6); rib((116, 65), (94, 65.5), 5)
    rib((64, 75), (76, 71), 3.2); rib((104, 76), (92, 72), 3.2)
    s.ell(122.5, 39.5, 4, 2.6, '#d8d0bf', ec='#0c1210', lw=3, z=6); s.label(122.5, 33.8, 'low arch', size=9, c=INK)
    s.line([(63, 72.5), (72, 71.2), (84, 72.4), (96, 71), (106, 72.5)], '#ffffff', lw=7, z=7, n=3)
    for x in (72, 84, 96): s.arrow((x, 70), (x, 62), c='#ffffff', lw=1.8, ms=18, z=7)
    for seg in ([(8, 34), (14, 40), (11, 48)], [(20, 60), (27, 66), (25, 74)], [(150, 42), (146, 50), (151, 58)], [(138, 66), (134, 72), (139, 77)], [(6, 8), (12, 12), (9, 18)]): s.line(seg, '#ffffff', lw=1.6, z=3, alpha=0.6, ls=(0, (3, 3)))
    s.dots([(80, 26), (86, 30), (77, 34), (92, 24), (70, 40), (98, 36), (88, 44), (74, 20), (104, 44), (66, 28), (83, 52), (95, 55)], '#e58a4e', size=22, z=8, ec=BG, lw=0.5)
    s.dots([(133 + rng.uniform(-9, 9), 27 + rng.uniform(-9, 9)) for _ in range(34)], '#e58a4e', size=5, z=8)
    s.dots([(31.5, 18)], '#ffffff', size=70, marker='x', z=9, lw=2)
    s.label(13, 26, 'open sea,\nheavy surf', size=9.5, c='#a9c4c4'); s.label(150, 12, 'open sea', size=9.5, c='#a9c4c4')
    s.label(84, 76.2, 'THE BORE: the tide returning, a wall of white water', size=10, c='#ffffff')
    s.label(84, 13.5, 'THE STRAIT FLOOR AT LOW TIDE\nwet sand, shingle, pools and runnels', size=10, c=INK)
    s.label(146, 36, 'colony ledges\nabove the tide line', size=9.5, c=INK, ha='center')
    s.label(37, 33, 'black weed up to\nthe tide line, 30 m', size=9.5, c=INK, ha='center', to=(30, 22.5))
    s.label(58, 55, 'rib blades lean in\noverhead (pale wedges)', size=9.5, c=INK, ha='center', to=(62, 48.5))
    s.label(108, 21, 'kite-wings feeding\nin the pools', size=9.5, c=INK, ha='left', to=(93.5, 24))
    s.camera(78, 9.5, 91, fov=84, r=34)
    s.route([(78, 9.5), (62, 12), (44, 15), (33.5, 18), (46, 26), (66, 31), (84, 30.5), (104, 27), (120, 27), (131, 29), (120, 40), (100, 52), (86, 60), (84, 68)], heads=9)
    s.stop(1, 33.5, 18.2, 'the drowned,\nhanging in the weed', 20, 5.5 + 5, ha='center')
    s.stop(2, 84, 30.6, 'tide-pool feeders', 84, 38.5, ha='center')
    s.stop(3, 131, 29, 'the colony', 149, 26.5, ha='center')
    s.stop(4, 84, 67.5, 'the bore arrives', 110, 60.5, ha='left')
    s.finish(20, '200 m', 'ribs')

def breath():
    s = S('THE BREATH', 'The Bellows: a tidal shelf pierced by the airways. Cold dawn, sea fog. The heavy air from the shafts has nothing in it to breathe.', '#8e2338')
    s.poly([(0, 0), (160, 0), (160, 90), (0, 90)], '#5a5d61')
    s.blob([(40, 0), (46, 14), (40, 28), (28, 42), (22, 58), (10, 70), (0, 76), (0, 90), (22, 90), (30, 74), (40, 60), (46, 44), (58, 30), (66, 14), (64, 0)], '#3f7f86', z=2)
    s.blob([(120, 90), (124, 74), (140, 68), (160, 66), (160, 90)], '#8d9196', z=2); s.ell(144, 74.5, 8, 2.6, '#101214', z=3)
    s.blob([(136, 73), (128, 68), (118, 60), (124, 58), (136, 64), (150, 70), (152, 73.5)], '#ffffff', alpha=0.32, z=4)
    s.ell(112, 40, 13.5, 11.5, '#090a0c', ec='#d8d0bf', lw=1.5, z=4)
    for r, a0, a1 in ((11.2, 20, 95), (11.2, 125, 170), (8.6, 10, 150), (6.2, 30, 120)):
        tt = np.radians(np.linspace(a0, a1, 30)); s.ax.plot(112 + r * 1.17 * np.cos(tt), 40 + r * np.sin(tt), color='#e6dcc6', lw=3.2, zorder=5, solid_capstyle='round')
    s.blob([(121, 31), (126, 36), (128, 44), (124, 47), (121, 41), (118, 34)], '#74787d', z=5, hatch='xx', ec='#9da2a8', lw=0.6)
    s.blob([(97, 41), (95, 46), (98, 51), (104, 52.5), (106, 49), (101, 46), (100, 41)], '#a3243f', z=7); s.dots([(93, 38), (108, 54.5), (96, 34), (116, 53.5)], '#a3243f', size=30, z=7)
    for cx, cy, r in ((84, 68, 3.2), (132, 55, 2.6), (62, 76.5, 2.4)): s.ell(cx, cy, r * 1.2, r, '#090a0c', ec='#d8d0bf', lw=1, z=4); s.ell(cx - 2.5, cy + 0.5, r * 2.2, r * 1.1, '#ffffff', alpha=0.25, z=5)
    for a, b in (((99, 37), (84, 33)), ((98, 44), (80, 46)), ((101, 51), (86, 57))): s.arrow(a, b, c='#ffffff', lw=1.5, ms=15)
    s.ell(88, 44, 14, 12, '#ffffff', alpha=0.13, z=4)
    s.dots([(36, 45), (40, 50), (33, 52), (30, 57), (38, 56), (27, 62), (35, 61)], '#ffffff', size=26, z=8, ec=BG, lw=0.5); s.dots([(14 + i * 2.1, 80 + (i % 3) * 1.1) for i in range(8)], '#ffffff', size=8, z=8)
    s.dots([(104.5, 29.5)], '#ffffff', size=40, z=8, ec=BG, lw=0.6); s.dots([(111.5, 25)], '#ffffff', size=70, marker='x', z=8, lw=2)
    s.arrow((6, 60), (18, 49), c='#ffd9a0', lw=2, ms=18); s.label(8, 64.5, 'low sun\nthrough fog', c='#ffd9a0', size=10)
    s.label(48, 70, 'tide channel:\nthe route', size=10, c='#d6f0f2', ha='center', to=(31, 66)); s.label(108, 75.5, 'sea cliff and its cave, 3 km on:\nfog pours out of it down the scree', size=9.5, c=INK, ha='center', to=(131, 70))
    s.label(132, 28, 'collapsed side,\nramp of slabs', size=9.5, c=INK, ha='left', to=(125, 37)); s.label(134, 45, 'ruined cartilage hoops\ndown the wall (pale arcs)', size=9.5, c=INK, ha='left', to=(122.5, 43.5))
    s.label(76, 60, 'heavy vapour slides\naway low over the rock', size=9.5, c='#ffffff', ha='center')
    s.label(84, 74, 'smaller shafts', size=9.5, c=INK); s.label(118, 19.5, 'the last one that came\nto the rim (x) and the one\nstanding over the drop', size=9.5, c=INK, ha='left', to=(112.5, 24.5))
    s.label(100, 12, 'PALE BONE-ROCK SHELF, planed flat by the sea', size=10, c=INK)
    s.camera(60, 9.5, 97, fov=80, r=36)
    s.route([(60, 9.5), (54, 20), (46, 32), (38, 46), (46, 52), (64, 44), (86, 31), (106, 26.5), (101, 34), (99.5, 43), (105, 44.5), (112, 40)], heads=8)
    s.stop(1, 38, 47.5, 'waders feeding\nin the channel', 17, 40, ha='center')
    s.stop(2, 107, 26.8, 'the rim', 96, 21.5, ha='center')
    s.stop(3, 99.8, 44.2, 'gill-plumes\non the lip', 100, 58.5 + 4, ha='center')
    s.stop(4, 112, 40, 'down the shaft', 143, 55 + 5.5, ha='center')
    s.finish(25, '50 m', 'breath')

F = {'heart': heart, 'marsh': marsh, 'eye': eye, 'spine': spine, 'ribs': ribs, 'breath': breath}
for k in (sys.argv[1:] or list(F)): F[k]()
