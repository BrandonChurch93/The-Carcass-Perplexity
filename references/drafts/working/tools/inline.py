#!/usr/bin/env python3
"""Build the JSON an inline widget reads. usage: inline.py <out.json> <width> <label=path> ...
Each picture becomes a JPEG data URL at the given width (quality 84)."""
import sys, json, base64, io
from PIL import Image
out, W = sys.argv[1], int(sys.argv[2]); pics = []
for a in sys.argv[3:]:
    label, path = a.split('=', 1)
    im = Image.open(path).convert('RGB')
    if im.size[0] > W: im = im.resize((W, round(im.size[1] * W / im.size[0])), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=84, optimize=True)
    pics.append({'label': label, 'w': im.size[0], 'h': im.size[1], 'src': 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()})
json.dump({'pics': pics}, open(out, 'w'))
import os; print(out, len(pics), 'pics', round(os.path.getsize(out) / 1e6, 2), 'MB')
