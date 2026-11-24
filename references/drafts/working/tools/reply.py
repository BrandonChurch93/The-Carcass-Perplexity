#!/usr/bin/env python3
"""Save one fresh viewer's reply, unedited. usage: reply.py <viewer> <model> <test> <take> <image shown> <<< "reply text" """
import sys, json, os, time
R = '/home/user/workspace/r3/critic/fresh'
viewer, model, test, take, shown = sys.argv[1:6]
txt = sys.stdin.read().strip()
p = f'{R}/replies.json'; L = json.load(open(p)) if os.path.exists(p) else []
L = [x for x in L if x['viewer'] != viewer]
L.append(dict(viewer=viewer, model=model, test=test, take=take, shown=shown, utc=time.strftime('%H:%M', time.gmtime()), reply=txt))
json.dump(L, open(p, 'w'), indent=1)
open(f'{R}/replies/{viewer}.txt', 'w').write(f'viewer: {viewer}\nmodel: {model}\ntest: {test}\nimage: {take} ({shown})\n\n{txt}\n')
print(len(L), 'replies')
