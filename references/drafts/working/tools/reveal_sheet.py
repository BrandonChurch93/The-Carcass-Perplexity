#!/usr/bin/env python3
"""out/contact/reveal-contact-sheet.jpg: the orbit reveal, clean, and the same frame with the six places marked."""
import json, os
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
R = '/home/user/workspace/r3'; P = json.load(open(f'{R}/tools/places.json')); ID = 'reveal-est-t3'
def font(sz, bold=False): return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', sz)
W, M, cap, head = 2400, 24, 46, 150; fw = W - 2 * M
src = Image.open(f'{R}/gen/{ID}.png').convert('RGB'); s = fw / src.size[0]
big = src.resize((fw, round(src.size[1] * s)), Image.LANCZOS)
key = ImageEnhance.Brightness(big).enhance(0.82); kd = ImageDraw.Draw(key)
# targets in source pixels (1672x941): where each place sits on the body
T = {'ribs': (1255, 405), 'heart': (943, 476), 'breath': (1078, 535), 'marsh': (690, 548), 'spine': (735, 352), 'eye': (312, 612)}
OFF = {'ribs': (70, -95), 'heart': (-10, -120), 'breath': (95, 95), 'marsh': (-40, 120), 'spine': (-95, -105), 'eye': (-120, -110)}
for n, pl in enumerate(P['order'], 1):
    x, y = T[pl][0] * s, T[pl][1] * s; mx, my = x + OFF[pl][0], y + OFF[pl][1]; col = P[pl]['colour']
    kd.line([(x, y), (mx, my)], fill='#ffffff', width=4); kd.ellipse([x - 9, y - 9, x + 9, y + 9], fill='#ffffff', outline='#0d0f12', width=2)
    r = 34; kd.ellipse([mx - r, my - r, mx + r, my + r], fill=col, outline='#ffffff', width=5)
    t = str(n); f = font(38, True); b = kd.textbbox((0, 0), t, font=f); kd.text((mx - (b[2] + b[0]) / 2, my - (b[3] + b[1]) / 2), t, fill='#ffffff', font=f)
legend_h = 150
H = head + big.size[1] + cap + M + key.size[1] + legend_h + M
S = Image.new('RGB', (W, H), '#0d0f12'); d = ImageDraw.Draw(S)
d.text((M, 26), 'THE CARCASS  /  THE REVEAL', fill='#e6e9ee', font=font(54, True))
d.text((M, 98), 'The last shot: the camera rises out of The Eye to orbit, and the continent is the titan.  Round 3 reference set, direction B (Titan-fall).', fill='#9aa3ae', font=font(28))
y = head; S.paste(big, (M, y)); y += big.size[1]; d.text((M, y + 8), f'THE REVEAL FROM ORBIT   [{ID}]', fill='#c9ced6', font=font(26)); y += cap + M
S.paste(key, (M, y)); y += key.size[1] + 18
d.text((M, y), 'WHERE THE SIX PLACES SIT ON THE BODY (same frame, darkened; positions read off the picture, approximate)', fill='#c9ced6', font=font(26)); y += 50
x = M
for n, pl in enumerate(P['order'], 1):
    col = P[pl]['colour']; r = 22; cy = y + 24
    d.ellipse([x, cy - r, x + 2 * r, cy + r], fill=col, outline='#ffffff', width=3)
    t = str(n); f = font(26, True); b = d.textbbox((0, 0), t, font=f); d.text((x + r - (b[2] + b[0]) / 2, cy - (b[3] + b[1]) / 2), t, fill='#ffffff', font=f)
    lab = P[pl]['title']; f2 = font(28, True); d.text((x + 2 * r + 14, cy - 17), lab, fill='#e6e9ee', font=f2); x += 2 * r + 14 + d.textlength(lab, font=f2) + 60
d.text((x + 10, y + 7), 'Numbers are film order. The pull-back starts at 6.', fill='#9aa3ae', font=font(26))
out = f'{R}/out/contact/reveal-contact-sheet.jpg'; S.save(out, 'JPEG', quality=88, optimize=True); print(out, S.size, round(os.path.getsize(out) / 1e6, 2), 'MB')
