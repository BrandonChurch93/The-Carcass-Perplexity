#!/usr/bin/env python3
"""Register finished generations (gen/res/*.json) that are not in the log; make 1600 px view copies."""
import json, os, subprocess, glob
from PIL import Image
R = '/home/user/workspace/r3'; L = json.load(open(f'{R}/log.json'))
new = []
for f in sorted(glob.glob(f'{R}/gen/res/*.json')):
    r = json.load(open(f))
    if not r.get('ok') or r['id'] in L['takes']: continue
    im = Image.open(r['path']); size = f"{im.size[0]}x{im.size[1]}"
    v = im.convert('RGB'); v.thumbnail((1600, 1600)); v.save(f"{R}/view/{r['id']}.jpg", quality=88)
    subprocess.run(['python3', f'{R}/tools/log.py', 'take', r['id'], '--model', r['model'], '--prompt', r['prompt'], '--refs', r.get('refs', ''), '--secs', str(r['secs']), '--path', r['path'], '--what', r.get('what', ''), '--size', size], check=True, stdout=subprocess.DEVNULL)
    new.append(f"{r['id']}[{size},{r['secs']}s]")
print(' '.join(new) if new else 'nothing new')
