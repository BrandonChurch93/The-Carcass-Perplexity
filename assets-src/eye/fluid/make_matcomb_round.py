"""Writes public/assets/eye/lake/matcomb-round.jpg: the picture of the combed mats, made to meet itself from left to right.

The picture is laid round the lake. Laid turned over at each repeat it met itself, but along every line where it turned it was its own
mirror image, and the tresses on either side of the line made a butterfly. Here the left and right quarters of the picture are passed
over into its own middle, shifted by half its width, so the right edge runs on into the left with no line and nothing is turned over.
Where two layers of strands lie over each other their contrast is kept (the sum is divided by the root of the sum of the squares of
the two shares), so the band where they cross is as rich as the rest.

Run from the root of the repo: python3 assets-src/eye/fluid/make_matcomb_round.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'assets-src/eye/fluid/mats-aerial-take1.png'
TARGET = ROOT / 'public/assets/eye/lake/matcomb-round.jpg'

picture = np.asarray(Image.open(SOURCE).convert('RGB'), dtype=np.float64) / 255.0
width = picture.shape[1]
across = (np.arange(width) + 0.5) / width
# The share of the picture itself: all of it in the middle, none of it at its two edges.
ramp = np.clip(np.minimum(across, 1.0 - across) / 0.3, 0.0, 1.0)
share = (ramp * ramp * (3.0 - 2.0 * ramp))[None, :, None]
passed = np.roll(picture, width // 2, axis=1)
mean = picture.mean(axis=(0, 1), keepdims=True)
both = mean + ((picture - mean) * share + (passed - mean) * (1.0 - share)) / np.sqrt(share * share + (1.0 - share) * (1.0 - share))
TARGET.parent.mkdir(parents=True, exist_ok=True)
Image.fromarray((np.clip(both, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8)).save(TARGET, 'JPEG', quality=90)
print(f'{TARGET.relative_to(ROOT)}: {TARGET.stat().st_size} bytes')
