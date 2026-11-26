# Reads the two feature sheets of the breaking wall and writes, for each, the height of its crest in every column
# (as a part of the sheet's height, measured from the foot of the wave), so that the bore's own outline is the picture's.
# Run from the repository root: python3 assets-src/ribs/sea/crest.py
from PIL import Image
import numpy as np

SAMPLES = 256
out = ["// Written by assets-src/ribs/sea/crest.py from mat/borewall-a.jpg and mat/borewall-b.jpg: do not edit by hand.",
       "// For each sheet: the texture v of the wave's foot, the v of its mean crest, and the crest of each column as a part of the mean."]
for name in ["borewall-a", "borewall-b"]:
    im = np.asarray(Image.open(f"public/assets/ribs/mat/{name}.jpg").convert("L")).astype(float) / 255
    h, w = im.shape
    rows = np.where(im.mean(axis=1) > 0.03)[0]
    foot = int(rows[-1])
    crest = np.zeros(w)
    for c in range(w):
        col = im[:, max(0, c - 4):c + 5].mean(axis=1)
        win = np.convolve(col, np.ones(14) / 14, mode="same")
        r = foot - 20
        while r > 0 and win[r] > 0.13:
            r -= 1
        crest[c] = foot - r
    k = np.ones(31) / 31
    crest = np.convolve(np.pad(crest, 15, mode="edge"), k, mode="valid")
    mean = float(crest.mean())
    prof = [float(crest[int(i * (w - 1) / (SAMPLES - 1))] / mean) for i in range(SAMPLES)]
    key = name.split("-")[1].upper()
    out.append(f"export const WALL_{key} = {{ foot: {1 - foot / h:.4f}, crest: {1 - (foot - mean) / h:.4f}, aspect: {w / h:.4f}, profile: [{', '.join(f'{p:.3f}' for p in prof)}] }};")
open("src/places/ribs/sea/crest.ts", "w").write("\n".join(out) + "\n")
print("\n".join(o[:160] for o in out))
