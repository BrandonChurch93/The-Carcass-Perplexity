#!/usr/bin/env python3
"""Build a blind critic packet. usage: packet.py <name> <prefix> <seed> key=path ...
Copies each image as <prefix>N.jpg (1600 wide, 16:9 centre crop, JPEG q88) in shuffled order; writes key.json."""
import sys, os, json, random
from PIL import Image
R='/home/user/workspace/r3'
name, prefix, seed = sys.argv[1], sys.argv[2], int(sys.argv[3])
items=[a.split('=',1) for a in sys.argv[4:]]
random.Random(seed).shuffle(items)
d=f'{R}/critic/{name}'; os.makedirs(d, exist_ok=True)
key={}
for i,(k,p) in enumerate(items,1):
    im=Image.open(p).convert('RGB'); w,h=im.size
    tw=1600; th=900
    # centre-crop to 16:9
    if w/h>16/9:
        nw=int(h*16/9); im=im.crop(((w-nw)//2,0,(w-nw)//2+nw,h))
    else:
        nh=int(w*9/16); im=im.crop((0,(h-nh)//2,w,(h-nh)//2+nh))
    im=im.resize((tw,th),Image.LANCZOS)
    im.save(f'{d}/{prefix}{i}.jpg',quality=88)
    key[f'{prefix}{i}']=k
json.dump(key,open(f'{d}/key.json','w'),indent=1)
print(json.dumps(key,indent=1))
