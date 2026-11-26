# Packs what torso.py baked: one picture of the three trunks (slope along, slope around, occlusion) and the coarse surfaces as a table for the film.
# Run: /home/user/bpyenv/bin/python assets-src/heart/torso-pack.py
import base64
import numpy as np
from PIL import Image, ImageFilter

SRC = 'out/work/torso'
names = ['a', 'b', 'c']
rows = []
tables = []
for name in names:
    slope = np.nan_to_num(np.load(f'{SRC}/slope-{name}.npy'))            # [u, v, 2]
    ao = np.load(f'{SRC}/ao-{name}.npy')                  # [v, u], v from the keel
    lo = np.load(f'{SRC}/low-{name}.npy')                 # [rings, sides, 3]
    r = np.clip(slope[..., 0].T / 3.0 + 0.5, 0, 1)
    g = np.clip(slope[..., 1].T / 3.0 + 0.5, 0, 1)
    # the occlusion was baked at half size: bring it up, and darken the pits finer than its texels by the relief
    big = np.asarray(Image.fromarray(ao.astype(np.float32), mode='F').resize((slope.shape[0], slope.shape[1]), Image.BICUBIC))
    relief = np.load(f'{SRC}/relief-{name}.npy').T.astype(np.float32)       # [v, u]
    soft = relief
    for _ in range(3):
        soft = sum(np.roll(soft, k, axis=0) for k in range(-4, 5)) / 9.0
        soft = sum(np.roll(soft, k, axis=1) for k in range(-4, 5)) / 9.0
    pit = np.clip(1 + (relief - soft) * 22.0, 0.45, 1.12)
    b = np.clip(big * pit, 0, 1)
    rows.append(np.stack([r, g, b], axis=-1)[::-1])        # the picture's first row is the top of v
    tables.append(base64.b64encode(np.round(lo * 8192).astype('<i2').tobytes()).decode('ascii'))
atlas = np.concatenate(rows[::-1], axis=0)
Image.fromarray(np.round(atlas * 255).astype(np.uint8)).save('public/assets/heart/mat/trunk.jpg', quality=90, subsampling=0)
rings, sides = np.load(f'{SRC}/low-a.npy').shape[:2]
with open('src/places/heart/walkers/trunk.ts', 'w') as f:
    f.write('// The three trunks of the herd, as assets-src/heart/torso.py made them: the coarse surface of each, rings by sides by (forward, up, left),\n')
    f.write('// in metres of an animal of size 1 times 8192. The fine surface is in mat/trunk.jpg.\n')
    f.write(f'export const TRUNK_RINGS = {rings};\nexport const TRUNK_SIDES = {sides};\n')
    f.write('const PACKED: readonly string[] = [\n' + ''.join(f"  '{t}',\n" for t in tables) + '];\n')
    f.write('''
export function trunkTable(which: number): Float32Array {
  const text = atob(PACKED[which] as string);
  const out = new Float32Array(text.length / 2);
  for (let i = 0; i < out.length; i++) {
    const v = text.charCodeAt(i * 2) | (text.charCodeAt(i * 2 + 1) << 8);
    out[i] = (v >= 32768 ? v - 65536 : v) / 8192;
  }
  return out;
}
''')
print('atlas', atlas.shape)
