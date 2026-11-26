# The body of a drinker of the Eye, computed: an implicit surface on a skeleton (rounded cones and ellipsoids joined softly, folds of the hide
# pressed into it), meshed by marching cubes, thinned, with skin weights from the same blend and occlusion read from the same field.
# Run: /home/user/pyenv/bin/python assets-src/eye/drinker/build_body.py   (numpy, scipy, scikit-image, fast-simplification, pillow)
# Writes src/places/eye/drinkers/body.data.ts and previews under out/work/body/.
import base64, json, sys, os
import numpy as np
from scipy import ndimage
from skimage import measure
import fast_simplification
from PIL import Image

H = 0.0125
LO = np.array([-0.66, -0.04, -1.62])
HI = np.array([0.66, 3.96, 2.42])
N = np.ceil((HI - LO) / H).astype(int) + 1
K = 34.0
KW = 16.0

# Joints of the rest pose: x to its left, y up, z the way it faces. Metres at size 1 (back at 2.4 m).
J = {
    'root': (0, 2.12, -0.2), 'pelvis': (0, 2.12, -0.5), 'chest': (0, 2.12, 0.1),
    'n0': (0, 2.02, 0.95), 'n1': (0, 2.42, 1.26), 'n2': (0, 2.84, 1.40), 'n3': (0, 3.24, 1.46), 'head': (0, 3.60, 1.52), 'tip': (0, 3.52, 2.26),
    't0': (0, 2.17, -1.30), 't1': (0, 1.9, -1.4), 't2': (0, 1.6, -1.4),
    'hip': (0.22, 1.98, -0.92), 'stifle': (0.25, 1.42, -0.66), 'hock': (0.23, 0.82, -1.06), 'hfet': (0.22, 0.13, -0.96), 'htoe': (0.22, 0.03, -0.83),
    'shoulder': (0.23, 1.74, 0.80), 'elbow': (0.25, 1.33, 0.58), 'carpus': (0.23, 0.72, 0.62), 'ffet': (0.23, 0.13, 0.60), 'ftoe': (0.23, 0.03, 0.73),
}
BONES = ['loin', 'pelvis', 'chest', 'neck0', 'neck1', 'neck2', 'neck3', 'head', 'tail0', 'tail1',
         'thighL', 'gaskinL', 'hcannonL', 'hfootL', 'thighR', 'gaskinR', 'hcannonR', 'hfootR',
         'armL', 'forearmL', 'fcannonL', 'ffootL', 'armR', 'forearmR', 'fcannonR', 'ffootR']
B = {n: i for i, n in enumerate(BONES)}

def v(p, side=1):
    return np.array([p[0] * side, p[1], p[2]], dtype=np.float64)

prims = []  # (bone, kind, params)
def cone(bone, a, b, ra, rb, sx=1.0):
    prims.append((B[bone], 'cone', (np.array(a, float), np.array(b, float), ra, rb, sx)))
def ell(bone, c, r):
    prims.append((B[bone], 'ell', (np.array(c, float), np.array(r, float))))
def ball(bone, c, r):
    ell(bone, c, (r, r, r))

# The trunk: deep and narrow, the belly drawn up toward the flank, the backbone and the points of the hip standing under the hide.
cone('chest', (0, 1.82, 0.72), (0, 1.84, 0.08), 0.5, 0.55, 0.70)
ell('chest', (0, 2.33, 0.52), (0.085, 0.13, 0.30))
ell('chest', (0, 1.74, 0.96), (0.24, 0.36, 0.22))
cone('chest', (0, 2.36, 0.62), (0, 2.37, 0.1), 0.05, 0.045)
cone('loin', (0, 1.84, 0.08), (0, 1.96, -0.58), 0.55, 0.42, 0.72)
cone('loin', (0, 2.37, 0.1), (0, 2.36, -0.5), 0.045, 0.045)
cone('pelvis', (0, 1.96, -0.58), (0, 2.02, -1.04), 0.42, 0.31, 0.78)
cone('pelvis', (0, 2.36, -0.5), (0, 2.26, -1.2), 0.045, 0.05)
for s in (1, -1):
    L = 'L' if s > 0 else 'R'
    ell('chest', (0.25 * s, 1.93, 0.70), (0.115, 0.40, 0.24))
    ell('pelvis', (0.215 * s, 2.24, -0.60), (0.07, 0.06, 0.11))
    ball('pelvis', (0.11 * s, 2.10, -1.27), 0.065)
    ell('pelvis', (0.22 * s, 1.93, -0.92), (0.14, 0.33, 0.33))
    # Hind leg.
    cone('thigh' + L, v(J['hip'], s) + (0, -0.03, 0), v(J['stifle'], s), 0.24, 0.14, 0.66)
    ball('thigh' + L, v(J['stifle'], s) + (0, 0.0, 0.05), 0.085)
    cone('gaskin' + L, v(J['stifle'], s), v(J['hock'], s), 0.13, 0.062, 0.8)
    ball('gaskin' + L, v(J['hock'], s) + (0, 0.05, -0.055), 0.048)
    ball('hcannon' + L, v(J['hock'], s), 0.074)
    cone('hcannon' + L, v(J['hock'], s), v(J['hfet'], s), 0.056, 0.048)
    ball('hcannon' + L, v(J['hfet'], s), 0.066)
    for toe in (-1, 1):
        cone('hfoot' + L, v(J['hfet'], s) + (0, -0.02, 0), v(J['htoe'], s) + (0.04 * toe, 0.018, 0), 0.05, 0.05)
    # Fore leg.
    cone('arm' + L, v(J['shoulder'], s), v(J['elbow'], s), 0.19, 0.135, 0.72)
    ball('arm' + L, v(J['elbow'], s) + (0, 0.035, -0.085), 0.062)
    cone('forearm' + L, v(J['elbow'], s), v(J['carpus'], s), 0.118, 0.062, 0.85)
    ball('fcannon' + L, v(J['carpus'], s) + (0, 0, 0.012), 0.076)
    cone('fcannon' + L, v(J['carpus'], s), v(J['ffet'], s), 0.055, 0.047)
    ball('fcannon' + L, v(J['ffet'], s), 0.064)
    for toe in (-1, 1):
        cone('ffoot' + L, v(J['ffet'], s) + (0, -0.02, 0), v(J['ftoe'], s) + (0.04 * toe, 0.018, 0), 0.05, 0.05)
# Neck, head, tail.
cone('neck0', J['n0'], J['n1'], 0.255, 0.17, 0.78)
cone('neck1', J['n1'], J['n2'], 0.17, 0.132, 0.85)
cone('neck2', J['n2'], J['n3'], 0.132, 0.115, 0.9)
cone('neck3', J['n3'], J['head'], 0.115, 0.108, 0.92)
ell('head', (0, 3.62, 1.59), (0.088, 0.105, 0.16))
cone('head', (0, 3.61, 1.68), (0, 3.535, 2.22), 0.088, 0.03, 0.82)
cone('head', (0, 3.53, 1.62), (0, 3.5, 2.14), 0.052, 0.022, 0.9)
cone('head', (0, 3.705, 1.50), (0, 3.655, 1.86), 0.026, 0.018)
cone('tail0', J['t0'], J['t1'], 0.07, 0.042)
cone('tail1', J['t1'], J['t2'], 0.042, 0.02)

axes = [LO[i] + H * np.arange(N[i]) for i in range(3)]

def box(lo, hi):
    i0 = np.maximum(0, np.floor((lo - LO) / H).astype(int))
    i1 = np.minimum(N, np.ceil((hi - LO) / H).astype(int) + 1)
    return i0, i1

def dist(kind, params, X, Y, Z):
    if kind == 'ell':
        c, r = params
        q = np.sqrt(((X - c[0]) / r[0]) ** 2 + ((Y - c[1]) / r[1]) ** 2 + ((Z - c[2]) / r[2]) ** 2)
        return (q - 1.0) * r.min() * np.where(q > 1, np.maximum(1.0, 0.6 * r.mean() / r.min()), 1.0)
    a, b, ra, rb, sx = params
    cx = 0.5 * (a[0] + b[0])
    px = (X - cx) / sx + cx - a[0]
    py = Y - a[1]
    pz = Z - a[2]
    ab = b - a
    ab = np.array([ab[0] / sx, ab[1], ab[2]]) if sx != 1 else ab
    l2 = float(ab @ ab)
    t = np.clip((px * ab[0] + py * ab[1] + pz * ab[2]) / l2, 0, 1)
    d = np.sqrt((px - t * ab[0]) ** 2 + (py - t * ab[1]) ** 2 + (pz - t * ab[2]) ** 2) - (ra + (rb - ra) * t)
    return d * min(1.0, sx)

def bounds(kind, params, margin):
    if kind == 'ell':
        c, r = params
        return c - r - margin, c + r + margin
    a, b, ra, rb, sx = params
    r = max(ra, rb)
    return np.minimum(a, b) - r - margin, np.maximum(a, b) + r + margin

def field():
    S = np.zeros(N, dtype=np.float32)
    for bone, kind, params in prims:
        lo, hi = bounds(kind, params, 0.22)
        i0, i1 = box(lo, hi)
        X, Y, Z = np.meshgrid(axes[0][i0[0]:i1[0]], axes[1][i0[1]:i1[1]], axes[2][i0[2]:i1[2]], indexing='ij', sparse=True)
        d = dist(kind, params, X, Y, Z)
        S[i0[0]:i1[0], i0[1]:i1[1], i0[2]:i1[2]] += np.exp(np.clip(-K * d, -40, 40)).astype(np.float32)
    return np.where(S > 1e-12, -np.log(np.maximum(S, 1e-12)) / K, 1.0).astype(np.float32)

def noise(seed, cell):
    rng = np.random.default_rng(seed)
    shape = np.ceil(N * H / cell).astype(int) + 3
    coarse = rng.random(shape).astype(np.float32)
    zoom = (N / (shape - 1)) * 1.0
    return ndimage.zoom(coarse, zoom, order=3)[:N[0], :N[1], :N[2]]

def sm(lo, hi, x):
    t = np.clip((x - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)

def folds(d):
    X, Y, Z = np.meshgrid(*axes, indexing='ij', sparse=True)
    n1 = noise(1, 0.22)
    n2 = noise(2, 0.09)
    n3 = noise(3, 0.5)
    crease = lambda u: np.abs(np.sin(np.pi * u)) - 0.55
    # The neck: rings across it, deep at its root, where the loose hide gathers.
    n0, hd = np.array(J['n0']), np.array(J['head'])
    axis = (hd - n0) / np.linalg.norm(hd - n0)
    u = (X - n0[0]) * axis[0] + (Y - n0[1]) * axis[1] + (Z - n0[2]) * axis[2]
    neck = sm(-0.1, 0.12, u) * sm(1.95, 1.6, u) * sm(0.55, 0.75, Z + 0.35 * (Y - 2.0))
    out = neck * (0.0075 - 0.002 * np.clip(u, 0, 1.6)) * crease(u / 0.105 + 2.2 * n1 + 0.5 * n2)
    # The trunk: the ribs under the hide of the chest, and loose folds that hang behind the shoulder and before the haunch.
    side = sm(0.16, 0.3, np.abs(X))
    ribs = side * sm(-0.12, 0.05, Z) * sm(0.6, 0.42, Z) * sm(1.42, 1.6, Y) * sm(2.3, 2.1, Y)
    out = out + ribs * (0.0004 + 0.0012 * n1) * np.cos(2 * np.pi * (Z + 0.3 * (Y - 1.9) + 0.05 * n1) / 0.15)
    hang = sm(1.45, 1.6, Y) * sm(2.42, 2.2, Y) * (sm(0.45, 0.3, Z) * sm(-0.05, 0.1, Z) + sm(-0.25, -0.4, Z) * sm(-0.9, -0.6, Z) + 0.35) * sm(1.25, 1.1, Z) * sm(-1.3, -1.15, Z)
    out = out + hang * (0.001 + 0.0026 * n2) * crease(Z / 0.15 + 0.9 * n1 + 0.5 * n2 + 0.45 * (Y - 1.9))
    # Everywhere: the hide is never a turned surface.
    out = out + 0.012 * (n3 - 0.5) + 0.006 * (n1 - 0.5) * sm(0.5, 0.9, Y)
    return d - out.astype(np.float32)

def sample(grid, p, order=1):
    return ndimage.map_coordinates(grid, ((p - LO) / H).T, order=order, mode='nearest')

def gradient(grid, p):
    e = H
    g = np.stack([sample(grid, p + np.eye(3)[i] * e) - sample(grid, p - np.eye(3)[i] * e) for i in range(3)], axis=1)
    return g / np.maximum(np.linalg.norm(g, axis=1, keepdims=True), 1e-9)

def weights(p):
    W = np.zeros((len(p), len(BONES)), dtype=np.float64)
    for bone, kind, params in prims:
        W[:, bone] += np.exp(np.clip(-KW * dist(kind, params, p[:, 0], p[:, 1], p[:, 2]), -60, 60))
    # A leg is no part of the leg beside it, and the head no part of the chest.
    lr = np.array([0 if n.endswith('L') else 1 if n.endswith('R') else 2 for n in BONES])
    W[:, lr == 1] *= sm(0.06, -0.02, p[:, 0])[:, None]
    W[:, lr == 0] *= sm(-0.06, 0.02, p[:, 0])[:, None]
    W /= W.sum(axis=1, keepdims=True)
    W[W < 0.04] = 0
    idx = np.argsort(-W, axis=1)[:, :4]
    w = np.take_along_axis(W, idx, axis=1)
    w /= w.sum(axis=1, keepdims=True)
    q = np.floor(w * 255 + 0.5).astype(int)
    q[:, 0] += 255 - q.sum(axis=1)
    return idx.astype(np.uint8), q.astype(np.uint8)

def occlusion(grid, p, n):
    broad = np.zeros(len(p))
    total = 0
    for t, w in ((0.03, 1.0), (0.07, 1.0), (0.15, 0.9), (0.3, 0.7), (0.5, 0.5)):
        broad += w * np.clip((t - sample(grid, p + n * t)) / t, 0, 1)
        total += w
    fine = np.clip((0.03 - sample(grid, p + n * 0.03)) / 0.03, 0, 1) * 0.6 + np.clip((0.015 - sample(grid, p + n * 0.015)) / 0.015, 0, 1) * 0.4
    return 1 - np.clip(broad / total * 1.5, 0, 1), 1 - np.clip(fine * 2.2, 0, 1)

def views(grid, name):
    # Looked at from the side, the front and above, lit from the upper left: the shape alone.
    def shade(depth_axis, flip):
        g = grid if not flip else np.flip(grid, axis=depth_axis)
        inside = g < 0
        first = inside.argmax(axis=depth_axis)
        hit = inside.any(axis=depth_axis)
        gx, gy = np.gradient(first.astype(np.float32))
        nrm = np.stack([-gx, -gy, np.full_like(gx, 1.2)], axis=-1)
        nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
        light = np.array([-0.35, 0.55, 0.75]) if depth_axis != 1 else np.array([0.4, 0.4, 0.8])
        c = np.clip(nrm @ (light / np.linalg.norm(light)), 0, 1) * 0.85 + 0.12
        return np.where(hit, c, 0.3)
    side = shade(0, False)            # [y, z]
    front = shade(2, True)            # [x, y]
    top = shade(1, True)              # [x, z]
    a = Image.fromarray((np.flipud(side) * 255).astype(np.uint8))
    b = Image.fromarray((np.flipud(front.T) * 255).astype(np.uint8))
    c = Image.fromarray((top * 255).astype(np.uint8))
    sheet = Image.new('L', (a.width + b.width + 8, a.height + c.height + 8), 60)
    sheet.paste(a, (0, 0)); sheet.paste(b, (a.width + 8, 0)); sheet.paste(c, (a.width - c.width if False else 0, a.height + 8))
    sheet.resize((sheet.width * 2, sheet.height * 2), Image.LANCZOS).save(name)

def pack(p, n, f, grid):
    bi, bw = weights(p)
    ao, fine = occlusion(grid, p, n)
    lo = p.min(axis=0)
    hi = p.max(axis=0)
    q = np.floor((p - lo) / (hi - lo) * 65535 + 0.5).astype(np.uint16)
    nq = np.clip(np.floor(n * 127 + 0.5), -127, 127).astype(np.int8)
    extra = np.stack([np.floor(ao * 255 + 0.5), np.floor(fine * 255 + 0.5)], axis=1).astype(np.uint8)
    assert len(p) < 65536
    blob = q.tobytes() + nq.tobytes() + bi.tobytes() + bw.tobytes() + extra.tobytes() + f.astype(np.uint16).tobytes()
    return {'vertices': len(p), 'triangles': len(f), 'lo': [round(float(x), 5) for x in lo], 'hi': [round(float(x), 5) for x in hi]}, blob

def thin(p, f, count):
    out_p, out_f = fast_simplification.simplify(p.astype(np.float32), f.astype(np.int32), target_count=count, agg=5)
    return out_p.astype(np.float64), out_f

def main():
    out = 'out/work/body'
    os.makedirs(out, exist_ok=True)
    d = field()
    views(d, f'{out}/smooth.png')
    d = folds(d)
    views(d, f'{out}/folded.png')
    verts, faces, _, _ = measure.marching_cubes(d, 0.0)
    p = LO + verts * H
    faces = faces[:, ::-1]
    print('marched', len(p), len(faces))
    if '--shape' in sys.argv:
        return
    levels = {}
    blobs = {}
    for name, count in (('near', 76000), ('far', 5200)):
        tp, tf = thin(p, faces, count)
        if name == 'far':
            # Far off a leg must not thin to nothing: the thinned body is drawn out to the field again.
            tp = tp - gradient(d, tp) * sample(d, tp)[:, None]
        tn = gradient(d, tp)
        meta, blob = pack(tp, tn, tf, d)
        levels[name] = meta
        blobs[name] = base64.b64encode(blob).decode('ascii')
        print(name, meta)
    rest = {k: [float(x) for x in val] for k, val in J.items()}
    with open('src/places/eye/drinkers/body.data.ts', 'w') as fh:
        fh.write('// Written by assets-src/eye/drinker/build_body.py: do not edit by hand. The body of a drinker at rest, at size 1.\n')
        fh.write('// Each level: per vertex 3 x uint16 place (between lo and hi), 3 x int8 normal, 4 x uint8 bones, 4 x uint8 weights, 2 x uint8 shade (broad, fine); then 3 x uint16 a triangle.\n')
        fh.write(f'export const BONE_NAMES = {json.dumps(BONES)} as const;\n')
        fh.write(f'export const REST: Record<string, [number, number, number]> = {json.dumps(rest)};\n')
        fh.write(f'export const LEVELS = {json.dumps(levels)};\n')
        for name in blobs:
            fh.write(f"export const {name.upper()}_DATA = '{blobs[name]}';\n")

main()
