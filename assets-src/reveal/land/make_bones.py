# The bones seen from orbit: one grey picture that says where the great ranges stand, on the rectangle of level a.
# Run from the root of the repo: python3 assets-src/reveal/land/make_bones.py
# What is read, as data: the traced outline of the bone ranges (src/places/reveal/continent.json). Nothing is read from a picture.
import json, os
import numpy as np, cv2

ROOT = os.getcwd()
OUT = os.path.join(ROOT, 'public/assets/reveal/land/bones.jpg')
# centre x, centre y, width of level a, px of the master: the same numbers stand in make_land.py.
CX, CY, WIDE = 3361.6, 1570.3, 5300.0
W, H = 2048, 1152
LAKE = (1272.85, 1580.8, 57.0, 50.0)

traced = json.load(open(os.path.join(ROOT, 'src/places/reveal/continent.json')))
to = W / WIDE
x0, y0 = CX - WIDE / 2, CY - WIDE * 9 / 32

def points(flat):
    p = np.array(flat, np.float64).reshape(-1, 2)
    return np.round(np.stack([(p[:, 0] - x0) * to, (p[:, 1] - y0) * to], 1) * 16).astype(np.int32)

bone = np.zeros((H, W), np.uint8)
for s in traced['shapes']:
    cv2.fillPoly(bone, [points(s['outer'])], 255, shift=4)
for s in traced['shapes']:
    for hole in s['holes']:
        cv2.fillPoly(bone, [points(hole)], 0, shift=4)
# The lake of the Eye is a round hole in a whole massif, as in make_land.py.
centre = (int(round((LAKE[0] - x0) * to * 16)), int(round((LAKE[1] - y0) * to * 16)))
cv2.ellipse(bone, centre, (int((LAKE[2] + 30) * to * 16), int((LAKE[3] + 30) * to * 16)), 0, 0, 360, 255, -1, shift=4)
cv2.ellipse(bone, centre, (int(LAKE[2] * to * 16), int(LAKE[3] * to * 16)), 0, 0, 360, 0, -1, shift=4)
soft = cv2.GaussianBlur(bone.astype(np.float32), (0, 0), 1.6)
cv2.imwrite(OUT, np.clip(soft, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])
print('bones', OUT, os.path.getsize(OUT))
