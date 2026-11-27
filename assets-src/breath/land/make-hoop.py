# Makes the two sheets of the hoops of the main shaft from their generated pictures: the broken bedded face and the outer skin.
# Run: python3 assets-src/breath/land/make-hoop.py   (numpy, pillow, scipy)
# Reads assets-src/breath/land/src/travface.jpg and travskin.jpg. Writes public/assets/breath/land/<name>.jpg (colour, sRGB) and
# <name>-h.png (height, one channel), and src/places/breath/land/hoopbeds.ts (the face's height, coarse, which shapes the mesh).
# The sheets are laid mirrored at each repeat, so their edges are left as they are.
import base64
import os
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
LUMA = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def make(name, size, flat, fine, coarse, spread):
    src = Image.open(os.path.join(ROOT, 'assets-src', 'breath', 'land', 'src', name + '.jpg')).convert('RGB').resize(size, Image.LANCZOS)
    f = np.asarray(src).astype(np.float32)
    lum = f @ LUMA
    # The sheet's broadest light and dark are taken out, so that a repeat does not show as patches.
    broad = gaussian_filter(lum, size[0] * 0.2, mode='mirror')
    f = f * (1 + flat * (broad.mean() / np.maximum(broad, 1) - 1))[:, :, None]
    out = os.path.join(ROOT, 'public', 'assets', 'breath', 'land')
    Image.fromarray(np.clip(f, 0, 255).astype(np.uint8)).save(os.path.join(out, name + '.jpg'), quality=90)
    lum = (f @ LUMA) / 255
    # Height: a bed that stands out is pale, a recess is dark. The grain of the picture is colour, not relief.
    hgt = 0.35 * gaussian_filter(lum, fine, mode='mirror') + 0.65 * gaussian_filter(lum, coarse, mode='mirror') - gaussian_filter(lum, size[0] * 0.12, mode='mirror')
    hgt = np.clip(0.5 + (hgt - hgt.mean()) / hgt.std() * spread, 0, 1)
    Image.fromarray((hgt * 255).astype(np.uint8)).save(os.path.join(out, name + '-h.png'), optimize=True)
    mean = ((np.clip(f, 0, 255) / 255) ** 2.2).reshape(-1, 3).mean(axis=0)
    print(name, 'mean', [round(float(v), 3) for v in mean])
    return hgt


face = make('travface', (1536, 1024), 0.6, 1.6, 5.0, 0.21)
make('travskin', (1024, 1024), 0.7, 2.0, 7.0, 0.2)

# The face's height as the mesh can hold it: 96 by 64 cells, each bed group a ledge.
W, H = 96, 64
coarse = gaussian_filter(face, 9, mode='mirror')
coarse = np.asarray(Image.fromarray((coarse * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(np.float32)
coarse = np.clip(127.5 + (coarse - coarse.mean()) / coarse.std() * 58, 0, 255).astype(np.uint8)
text = base64.b64encode(coarse.tobytes()).decode('ascii')
with open(os.path.join(ROOT, 'src', 'places', 'breath', 'land', 'hoopbeds.ts'), 'w') as fh:
    fh.write('// The height of the bedded face of a hoop, coarse: made by assets-src/breath/land/make-hoop.py from the sheet travface. Do not edit.\n')
    fh.write(f'export const BEDS_W = {W};\nexport const BEDS_H = {H};\n')
    fh.write("export const BEDS_DATA =\n  '" + text + "';\n")
print('beds', W, H, len(text))
