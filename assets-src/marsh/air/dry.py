# Takes the painted rain out of the marsh's two sky pictures, so that the rain can be drawn moving by the air pass.
# Run from the repo root: python3 assets-src/marsh/air/dry.py
from PIL import Image, ImageFilter, ImageDraw

def dry(src, dst, box, across, feather):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    # Streaks of rain stand upright: a wide smear across them, and none down them, leaves the cloud's own grey and takes the streaks.
    smear = im.resize((max(w // across, 2), h), Image.BOX).resize((w, h), Image.BICUBIC)
    mask = Image.new('L', (w, h), 0)
    x0, y0, x1, y1 = [int(v * s) for v, s in zip(box, (w, h, w, h))]
    ImageDraw.Draw(mask).rectangle([x0, y0, x1, y1], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(feather))
    Image.composite(smear, im, mask).save(dst, quality=92)

dry('public/assets/marsh/mat/far.jpg', 'public/assets/marsh/mat/far-dry.jpg', (0.55, -0.1, 0.9, 0.4), 90, 45)
dry('public/assets/marsh/mat/sky.jpg', 'public/assets/marsh/mat/sky-dry.jpg', (0.36, 0.5, 0.84, 1.1), 110, 60)
