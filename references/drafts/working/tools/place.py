#!/usr/bin/env python3
"""Per-place outputs from tools/places.json.
 place.py inline <place>    -> tmp/inline/s2-<place>.json (establishing, details, layout) for the inline widget
 place.py contact <place>   -> out/contact/<place>-contact-sheet.jpg
 place.py check <place>     -> tmp/chk-<place>.jpg (establishing + details, quick same-place check)
"""
import sys, json, base64, io, os
from PIL import Image, ImageDraw, ImageFont
R = '/home/user/workspace/r3'; P = json.load(open(f'{R}/tools/places.json'))
def font(sz, bold=False):
    for f in (['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'] if bold else []) + ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()
def img(id_): return Image.open(f'{R}/gen/{id_}.png').convert('RGB')
def lay(place): return Image.open(f'{R}/layout2/{place}-layout.png').convert('RGB')
def fit(im, w): return im.resize((w, round(im.size[1] * w / im.size[0])), Image.LANCZOS)
def durl(im, q=84):
    b = io.BytesIO(); im.save(b, 'JPEG', quality=q, optimize=True); return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
cmd, place = sys.argv[1], sys.argv[2]; p = P[place]
if cmd == 'inline':
    pics = []
    e = fit(img(p['est']), 1400); pics.append({'label': f"{p['title']}: establishing view", 'w': e.size[0], 'h': e.size[1], 'src': durl(e)})
    for i, (name, id_) in enumerate(p['details'], 1):
        d = fit(img(id_), 960); pics.append({'label': f"{i}. {name}", 'w': d.size[0], 'h': d.size[1], 'src': durl(d)})
    l = fit(lay(place), 1400); pics.append({'label': f"{p['title']}: top-down layout, camera route and the four stops", 'w': l.size[0], 'h': l.size[1], 'src': durl(l, 88)})
    out = f'{R}/tmp/inline/s2-{place}.json'; json.dump({'pics': pics}, open(out, 'w')); print(out, len(pics), round(os.path.getsize(out) / 1e6, 2), 'MB')
elif cmd in ('contact', 'check'):
    W = 2400 if cmd == 'contact' else 1600; M = 24 if cmd == 'contact' else 8; cap = 46 if cmd == 'contact' else 22; head = 150 if cmd == 'contact' else 0
    fw = W - 2 * M; hw = (fw - M) // 2
    e = fit(img(p['est']), fw); ds = [fit(img(i), hw) for _, i in p['details']]
    parts_h = head + M + e.size[1] + cap + sum(max(ds[k].size[1], ds[k + 1].size[1]) + cap for k in range(0, len(ds), 2)) + M * (len(ds) // 2)
    l = fit(lay(place), fw) if cmd == 'contact' else None
    H = parts_h + (l.size[1] + cap + M if l else 0) + M
    S = Image.new('RGB', (W, H), '#0d0f12'); dr = ImageDraw.Draw(S); y = M
    if head:
        dr.text((M, 26), f"THE CARCASS  /  {p['title'].upper()}", fill='#e6e9ee', font=font(54, True)); dr.text((M, 98), p['line'] + '  Round 3 reference set, direction B (Titan-fall).', fill='#9aa3ae', font=font(28)); y = head
    S.paste(e, (M, y)); y += e.size[1]; dr.text((M, y + 8), f"ESTABLISHING VIEW   [{p['est']}]", fill='#c9ced6', font=font(26 if head else 14)); y += cap
    for k in range(0, len(ds), 2):
        for c in (0, 1):
            x = M + c * (hw + M); S.paste(ds[k + c], (x, y)); name, id_ = p['details'][k + c]
            dr.text((x, y + ds[k + c].size[1] + 8), f"{k + c + 1}  {name}   [{id_}]", fill='#c9ced6', font=font(26 if head else 14))
        y += max(ds[k].size[1], ds[k + 1].size[1]) + cap + M
    if l: S.paste(l, (M, y)); dr.text((M, y + l.size[1] + 8), 'TOP-DOWN LAYOUT: where each detail sits and the route the camera takes', fill='#c9ced6', font=font(26))
    out = f"{R}/out/contact/{place}-contact-sheet.jpg" if cmd == 'contact' else f'{R}/tmp/chk-{place}.jpg'
    os.makedirs(os.path.dirname(out), exist_ok=True); S.save(out, 'JPEG', quality=88, optimize=True); print(out, S.size, round(os.path.getsize(out) / 1e6, 2), 'MB')
