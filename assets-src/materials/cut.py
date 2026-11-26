# Cuts a window out of a picture and enlarges it to the picture's own size, as the input of a second call that makes the window again at full resolution.
# Run: python3 assets-src/materials/cut.py <in> <out> <centre x 0..1> <centre y 0..1> <width 0..1>
import sys
from PIL import Image
src, out, cx, cy, w = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
im = Image.open(src).convert('RGB')
W, H = im.size
ww, hh = W * w, H * w
box = (cx * W - ww / 2, cy * H - hh / 2, cx * W + ww / 2, cy * H + hh / 2)
im.resize((W, H), Image.LANCZOS, box=box).save(out)
print(out, im.size, 'window', [round(v, 1) for v in box])
