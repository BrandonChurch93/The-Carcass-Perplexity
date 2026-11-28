# Packs the sculpted skin of a rib (rib_bake.py) for the film: two pictures and the coarse relief the mesh is shaped by.
# Run: /home/user/bpyenv/bin/python assets-src/breath/land/rib_pack.py <name>
# Writes public/assets/breath/land/ribskin-n.jpg (red, green: the normal across the skin, along and round; blue: the occlusion baked in
# Blender), public/assets/breath/land/ribskin-m.jpg (red: height; green: rust; blue: how hollow the place is against the skin about it)
# and src/places/breath/land/ribrelief.ts (the height at 256 by 64, for the mesh).
import sys
import base64
import numpy as np
from PIL import Image

NAME = sys.argv[1] if len(sys.argv) > 1 else 'rib-a'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'public/assets/breath/land'
TS = sys.argv[3] if len(sys.argv) > 3 else 'src/places/breath/land/ribrelief.ts'
SRC = 'out/work/rib'
LONG, RADIUS = 32.0, 1.3
ROUND = 2 * np.pi * RADIUS
h = np.load(f'{SRC}/{NAME}-h.npy').astype(np.float64)
rust = np.load(f'{SRC}/{NAME}-rust.npy').astype(np.float64)
ao = np.asarray(Image.open(f'{SRC}/{NAME}-ao.png').convert('L')).astype(np.float64) / 255
# Blender writes the first row at the bottom.
ao = ao[::-1]
H, W = h.shape

# The two runs of rust meet under the belly (three quarters of the turn): one is led into the other there.
mid = int(H * 0.75)
span = 44
for k in range(-span, span + 1):
    t = (k + span) / (2 * span)
    t = t * t * (3 - 2 * t)
    rust[(mid + k) % H] = (1 - t) * rust[(mid - span) % H] + t * rust[(mid + span) % H]

ds = LONG / W
dt = ROUND / H
hs = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) / (2 * ds)
ht = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) / (2 * dt)
n = np.stack([-hs, -ht, np.ones_like(h)], axis=-1)
n /= np.linalg.norm(n, axis=-1, keepdims=True)


def blur(x, r):
    fu = np.fft.fftfreq(W)[None, :]
    fv = np.fft.fftfreq(H)[:, None]
    return np.real(np.fft.ifft2(np.fft.fft2(x) * np.exp(-2 * (np.pi * r) ** 2 * (fu ** 2 + fv ** 2))))


hollow = np.clip(0.5 + (h - blur(h, 6)) / 0.06, 0, 1)
lo, hi = float(h.min()), float(h.max())
hn = (h - lo) / (hi - lo)
# The baked occlusion keeps its own scale; it is drawn out a little so that eight bits hold the cracks.
aon = np.clip((ao - 0.55) / 0.45, 0, 1)


def u8(x):
    return np.clip(np.round(x * 255), 0, 255).astype(np.uint8)


a = np.stack([u8(n[..., 0] * 0.5 + 0.5), u8(n[..., 1] * 0.5 + 0.5), u8(aon)], axis=-1)
b = np.stack([u8(hn), u8(rust), u8(hollow)], axis=-1)
# The loader turns a picture over: the first row of the skin (the side toward the shaft) is written last.
Image.fromarray(a[::-1]).save(OUT + '/ribskin-n.jpg', quality=90, subsampling=0)
Image.fromarray(b[::-1]).save(OUT + '/ribskin-m.jpg', quality=86, subsampling=0)

small = np.asarray(Image.fromarray(u8(hn)).resize((256, 64), Image.BOX))
data = base64.b64encode(small.tobytes()).decode()
with open(TS, 'w') as f:
    f.write('// The coarse relief of the sculpted skin of a rib (assets-src/breath/land/rib_bake.py, rib_pack.py): 256 along by 64 round, a byte each,\n')
    f.write('// from RELIEF_LOW to RELIEF_HIGH metres over the round rib. The pictures the shader reads (land/ribskin-n.jpg, ribskin-m.jpg) hold\n')
    f.write('// the same skin 2048 by 512: the mesh takes the plates and the breaks from here, the light takes the rest from them.\n')
    f.write(f'export const RELIEF_W = 256;\nexport const RELIEF_H = 64;\nexport const RELIEF_LOW = {lo:.5f};\nexport const RELIEF_HIGH = {hi:.5f};\n')
    f.write(f'/** Metres along that one repeat of the skin covers, and the radius of the rib it was sculpted on. */\nexport const RELIEF_LONG = {LONG:.1f};\nexport const RELIEF_RADIUS = {RADIUS:.2f};\n')
    f.write(f"export const RELIEF_DATA = '{data}';\n")
print('packed', lo, hi)
