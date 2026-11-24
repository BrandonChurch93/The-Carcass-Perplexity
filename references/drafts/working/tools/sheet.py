#!/usr/bin/env python3
"""Triage sheet for my own review. usage: sheet.py <out.jpg> <cols> <cellw> <label=path> ..."""
import sys
from PIL import Image, ImageDraw, ImageFont
out, cols, cw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); items = [a.split('=', 1) for a in sys.argv[4:]]
ch = round(cw * 9 / 16); pad = 6; lab = 22; rows = (len(items) + cols - 1) // cols
S = Image.new('RGB', (cols * cw + (cols + 1) * pad, rows * (ch + lab) + (rows + 1) * pad), (18, 18, 18)); d = ImageDraw.Draw(S)
try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
except Exception: f = ImageFont.load_default()
for i, (label, path) in enumerate(items):
    im = Image.open(path).convert('RGB'); w, h = im.size
    # fit inside the 16:9 cell without cropping
    s = min(cw / w, ch / h); im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    x = pad + (i % cols) * (cw + pad); y = pad + (i // cols) * (ch + lab + pad)
    S.paste(im, (x + (cw - im.size[0]) // 2, y + (ch - im.size[1]) // 2)); d.text((x + 2, y + ch + 3), f"{label}  [{w}x{h}]", fill=(230, 230, 230), font=f)
S.save(out, quality=88); print(out, S.size)
