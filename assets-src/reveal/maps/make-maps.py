# The Reveal's nested maps of the continent, made by the image tool. Each is 16:9 and has a height picture.
#   map-a  the whole body      map-b  head and shoulders      map-c  the skull      map-d  the lake of the Eye
# map-a began as one generated picture of the whole continent (src/map-a-1672.png: the approved master passed as the place, a real satellite
# photograph as the standard). Each picture here is the enlarged picture or crop before it, made again at full size by the image tool.
# Rects are px of the approved master (references/approved/7-reveal/reveal-master.jpg, 5952 x 3348): centre x, centre y, width.
# map-a is not warped: the picture as generated lies on the master by one scale and one shift, fitted on the lake of the Eye and the salt flat of
# the hips (two marks of pullback.json that the picture shows small and sharp). The turn between the two marks is 0.16 degrees and is left.
#   python3 assets-src/reveal/maps/make-maps.py crop a|b|c|d   writes out/work/tmp/rv/map-<level>-in.png, the picture the image tool is given
#   python3 assets-src/reveal/maps/make-maps.py finish         writes public/assets/reveal/maps/map-<level>.jpg, map-<level>-h.png, maps.json
import json, os, sys
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

SRC = 'assets-src/reveal/maps/src/'
OUT = 'public/assets/reveal/maps/'
TMP = 'out/work/tmp/rv/'
IN_W, IN_H = 2048, 1152          # the size of the picture handed to the image tool
S = 0.9017 * 3.5125              # px of the master for one px of the first picture (1672 wide)
LAKE_A = (295.9, 424.3)          # the lake's centre in the first picture
LAKE_M = (1273.05, 1580.8)       # and in the master (pullback.json: 20.33 and 46.48 percent of frame 4)
def to_master(x, y): return (LAKE_M[0] + (x - LAKE_A[0]) * S, LAKE_M[1] + (y - LAKE_A[1]) * S)
def rect(cx, cy, w): return (cx - w / 2, cy - w * 9 / 32, cx + w / 2, cy + w * 9 / 32)
x0, y0 = to_master(0, 0); x1, y1 = to_master(1672, 941)
RECTS = {'a': ((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0), 'b': (1554.0, 1581.0, 2620.0), 'c': (1272.85, 1580.8, 1130.0), 'd': (1272.85, 1580.8, 320.0)}
ORDER = 'abcd'
KM = 0.8566                      # km for one px of the master (pullback.json, STATED)

def crop(level):
    if level == 'a':
        p = Image.open(SRC + 'map-a-1672.png').convert('RGB')
        p.resize((IN_W, IN_H), Image.LANCZOS).save(TMP + 'map-a-in.png'); print('a: the first picture, enlarged'); return
    prev = ORDER[ORDER.index(level) - 1]
    p = Image.open(SRC + f'map-{prev}.png').convert('RGB')
    W, H = p.size
    pr, r = rect(*RECTS[prev]), rect(*RECTS[level])
    k = W / (pr[2] - pr[0])
    box = ((r[0] - pr[0]) * k, (r[1] - pr[1]) * k, (r[2] - pr[0]) * k, (r[3] - pr[1]) * k)
    # a crop that overhangs the picture (map-b overhangs map-a by a strip of open sea on the left) repeats the edge
    pad = int(max(0, -box[0], -box[1], box[2] - W, box[3] - H)) + 2
    edge = Image.new('RGB', (W + 2 * pad, H + 2 * pad))
    edge.paste(p.resize((W + 2 * pad, H + 2 * pad), Image.NEAREST), (0, 0))
    edge.paste(p.crop((0, 0, 1, H)).resize((pad, H)), (0, pad)); edge.paste(p.crop((W - 1, 0, W, H)).resize((pad, H)), (W + pad, pad))
    edge.paste(p.crop((0, 0, W, 1)).resize((W, pad)), (pad, 0)); edge.paste(p.crop((0, H - 1, W, H)).resize((W, pad)), (pad, H + pad))
    edge.paste(p, (pad, pad))
    out = edge.transform((IN_W, IN_H), Image.EXTENT, (box[0] + pad, box[1] + pad, box[2] + pad, box[3] + pad), Image.BICUBIC)
    out.save(TMP + f'map-{level}-in.png')
    print(level, 'crop of', prev, [round(v, 1) for v in box], 'of', (W, H), '->', TMP + f'map-{level}-in.png')

def finish():
    os.makedirs(OUT, exist_ok=True)
    rows = []
    for level in ORDER:
        c = Image.open(SRC + f'map-{level}.png').convert('RGB')
        c.save(OUT + f'map-{level}.jpg', quality=92, subsampling=0)
        row = {'name': f'map-{level}', 'colour': f'map-{level}.jpg', 'width': c.size[0], 'height': c.size[1],
               'masterRect': {'cx': round(RECTS[level][0], 2), 'cy': round(RECTS[level][1], 2), 'width': round(RECTS[level][2], 2)}, 'kmWide': round(RECTS[level][2] * KM)}
        if os.path.exists(SRC + f'map-{level}-h.png'):
            h = Image.open(SRC + f'map-{level}-h.png').convert('L')
            if h.size != c.size: h = h.resize(c.size, Image.LANCZOS)
            h.save(OUT + f'map-{level}-h.png', optimize=True); row['heights'] = f'map-{level}-h.png'
        rows.append(row)
    note = ('masterRect is px of references/approved/7-reveal/reveal-master.jpg (centre x, centre y, width; every map is 16:9), the units of '
            'src/places/reveal/land/levels.ts. The colour pictures hold soft light from the upper left. Heights are greyscale: black is sea and lake, '
            'white the highest crests; each is the image tool reading its colour picture, not a survey, and it is not in metres.')
    json.dump({'note': note, 'maps': rows}, open(OUT + 'maps.json', 'w'), indent=1)
    for r in rows: print(r)

if __name__ == '__main__':
    if sys.argv[1] == 'crop': crop(sys.argv[2])
    else: finish()
