# Cuts what the image model is given: the base (the top of the approved picture with room over it), the four windows of the
# outpainted base, and the two ends of the joined band with room beside them. Run in this order with the takes between:
#   python3 prepare.py base      -> out/work/plate/base-in.png       (model: base-t1.jpg, saved as out/work/plate/base-out.png)
#   python3 prepare.py windows   -> out/work/plate/w0..3-in.png      (model: w0..3-t1.jpg)
#   python3 stitch.py            -> out/work/plate/band-hi.png
#   python3 prepare.py ends      -> out/work/plate/xl-in.png, xr-in.png   (model: xl-t1.jpg, xr-t1.jpg)
#   python3 extend.py            -> out/work/plate/band-ext.png
#   python3 plate.py             -> public/assets/eye/mat/far-edge2.jpg
import sys
from PIL import Image
G = (128, 128, 128)
D = 'out/work/plate/'
what = sys.argv[1]
if what == 'base':
    a = Image.open('references/approved/6-eye/eye-3-the-edge-where-the-floor-stops.jpg').convert('RGB')
    top = a.crop((0, 0, 1672, 560)).resize((1536, round(560 * 1536 / 1672)), Image.LANCZOS)
    c = Image.new('RGB', (1536, 1024), G)
    c.paste(top, (0, 510))
    c.save(D + 'base-in.png')
elif what == 'windows':
    b = Image.open('assets-src/eye/far-edge/base-t1.jpg').convert('RGB')
    for i, x0 in enumerate([0, 317, 634, 951]):
        b.crop((x0, 290, x0 + 585, 680)).resize((1536, 1024), Image.LANCZOS).save(D + f'w{i}-in.png')
elif what == 'ends':
    b = Image.open(D + 'band-hi.png').convert('RGB')
    W, H = b.size
    l = Image.new('RGB', (1536, 1024), G); l.paste(b.crop((0, 0, 614, H)), (922, 0)); l.save(D + 'xl-in.png')
    r = Image.new('RGB', (1536, 1024), G); r.paste(b.crop((W - 614, 0, W, H)), (0, 0)); r.save(D + 'xr-in.png')
