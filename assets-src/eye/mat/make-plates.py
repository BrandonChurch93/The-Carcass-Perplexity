"""Makes the two far pictures of the Eye that the sky builder added: far-edge.jpg (eye-03) and far-long3.jpg (eye-05).

Run from the repo root: python3 assets-src/eye/mat/make-plates.py
far-edge.jpg is the generated picture as it came, stored as JPEG.
far-long3.jpg joins the long wall from far-long.jpg and four generated pictures that carry it on to both sides.
Each side picture was made with half of its neighbour on one half of the canvas, so the kept half repeats the neighbour;
only the new half is taken, and each seam is faded over 80 columns.
"""
import numpy as np
from PIL import Image

W, H = 1672, 941
HALF = W // 2
FADE = 80
GOLD = 0.3
SRC = 'assets-src/eye/mat/'
PIECES = [
    (SRC + 'far-long3-left2-t1.jpg', 0),
    (SRC + 'far-long3-left-t1.jpg', 0),
    ('public/assets/eye/mat/far-long.jpg', None),
    (SRC + 'far-long3-right-t1.jpg', HALF),
    (SRC + 'far-long3-right2-t1.jpg', HALF),
]


def fade(width, rising):
    ramp = Image.linear_gradient('L').rotate(90 if rising else 270, expand=True).resize((width, H))
    return ramp


def main():
    out = Image.new('RGB', (HALF * 6, H))
    # Where each picture lies on the joined canvas, whole pictures, so that neighbours overlap by half a picture.
    lies = [0, HALF, HALF * 2, HALF * 3, HALF * 4]
    # The middle picture goes down last but one so that it stays exactly as it is on polish.
    for index in (0, 4, 1, 3, 2):
        name, _ = PIECES[index]
        picture = Image.open(name).convert('RGB')
        if picture.size != (W, H):
            picture = picture.resize((W, H), Image.LANCZOS)
        mask = Image.new('L', (W, H), 255)
        if index == 2:
            mask.paste(fade(FADE, True), (0, 0))
            mask.paste(fade(FADE, False), (W - FADE, 0))
        elif index == 1:
            mask.paste(fade(FADE, True), (0, 0))
        elif index == 3:
            mask.paste(fade(FADE, False), (W - FADE, 0))
        out.paste(picture, (lies[index], 0), mask)
    # The low sun on the pictures is orange; the approved frame has it yellow-gold. Only what is warm is turned, the shade keeps its grey.
    rgb = np.asarray(out).astype(np.float32) / 255.0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    warm = np.clip(((r - b) / np.maximum(r + b, 1e-3) - 0.1) / 0.22, 0.0, 1.0)
    warm = warm * warm * (3.0 - 2.0 * warm)
    rgb[..., 1] = g + GOLD * warm * np.maximum(r - g, 0.0)
    rgb[..., 2] = b + 0.5 * GOLD * warm * np.maximum(r - b, 0.0)
    out = Image.fromarray((np.clip(rgb, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8))
    out.save('public/assets/eye/mat/far-long3.jpg', quality=90)
    print('far-long3.jpg', out.size)


def edge():
    Image.open(SRC + 'far-edge-t1.png').convert('RGB').save('public/assets/eye/mat/far-edge.jpg', quality=93)
    print('far-edge.jpg')


edge()
main()
