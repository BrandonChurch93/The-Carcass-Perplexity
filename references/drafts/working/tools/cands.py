#!/usr/bin/env python3
"""Search Commons for several queries at once, keep free results, build one thumbnail sheet. usage: cands.py <out.jpg> "<tag>=<query>" ..."""
import sys, json, subprocess, urllib.request, io, re, concurrent.futures as cf
from PIL import Image, ImageDraw
out = sys.argv[1]; qs = [a.split('=',1) for a in sys.argv[2:]]
UA = {'User-Agent': 'carcass-reference-run/0.3 (brandon.church@perplexity.ai)'}
def search(tq):
    tag, q = tq
    r = subprocess.run(['python3','tools/commons.py', q, '14'], capture_output=True, text=True)
    res = []
    for line in r.stdout.splitlines():
        try: d = json.loads(line)
        except Exception: continue
        if d['w'] < 1500 or d['w'] < d['h']*1.2: continue
        if not re.search(r'Public domain|CC0|PD', d['lic']): continue
        res.append(d)
    return tag, res[:6]
def thumb(d):
    try:
        u = d['thumb'].replace('/1600px-', '/400px-')
        return Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read())).convert('RGB')
    except Exception as e:
        return None
with cf.ThreadPoolExecutor(8) as ex: groups = list(ex.map(search, qs))
items = [(f'{tag}{i+1}', d) for tag, res in groups for i, d in enumerate(res)]
with cf.ThreadPoolExecutor(12) as ex: ims = list(ex.map(lambda x: thumb(x[1]), items))
cols, cw, ch = 6, 400, 250
rows = (len(items)+cols-1)//cols
S = Image.new('RGB', (cols*cw, rows*ch), (16,16,18)); D = ImageDraw.Draw(S)
idx = {}
for k, ((name, d), im) in enumerate(zip(items, ims)):
    x, y = (k%cols)*cw, (k//cols)*ch
    if im:
        im.thumbnail((cw-6, ch-26)); S.paste(im, (x+3, y+3))
    D.text((x+5, y+ch-20), name, fill=(255,255,255))
    idx[name] = d
S.save(out, quality=85); json.dump(idx, open(out.replace('.jpg','.json'),'w'), indent=1)
for name, d in idx.items(): print(name, '|', d['title'][:90], '|', d['lic'], '|', d['artist'][:30], '|', d['w'], d['h'])
