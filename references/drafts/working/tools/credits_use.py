#!/usr/bin/env python3
"""Rewrite the 'Use:' text of the orbital photographs (orb-*) in real/CREDITS.md from the log, so that it says what each one was
really passed to the generator for. Lines are put in the form  - `file`: <credit> . Use: <use>  (crops name their parent's credit)."""
import json, os, re, collections
R = '/home/user/workspace/r3'; L = json.load(open(f'{R}/log.json')); T = L['takes']
KEPT = ['cx-e-t2'] + [k for k in L['order'] if k.startswith('e2-')] + ['e3-HD-t4', 'e3-ST-t1', 'pb1e-t1', 'pb2g-t2']
def group(k):
    k = re.sub(r'-t\d+$', '', k)
    for p in ('cx9-T', 'cx9-M', 'e2-', 'e3-HD', 'e3-ST', 'tile-'):
        if k.startswith(p): return p.rstrip('-') + ('*' if p in ('cx9-T', 'cx9-M', 'e2-', 'tile-') else '')
    return k
use = collections.defaultdict(lambda: collections.Counter()); kept = collections.defaultdict(list)
for k in L['order']:
    for r in T[k].get('refs', []):
        if '/real/' in r:
            b = os.path.basename(r); use[b][group(k)] += 1
            if k in KEPT: kept[b].append(k)
WHAT = {'orb-gemini11-india-crop.jpg': 'the whole look of an orbital photograph with the planet\'s edge: haze, sea colour, cloud fields',
        'orb-iss23-musandam.jpg': 'pale bare mountain ranges and drowned valleys against dark sea',
        'orb-modis-barents-bloom.jpg': 'stained, blooming sea water',
        'orb-modis-tstorm-phil-crop.jpg': 'thunderstorm anvils and overshooting tops seen from straight above',
        'orb-modis-tstorm-hainan.jpg': 'scattered thunderstorm cells with their shadows, seen from straight above',
        'orb-iss44-sinai.jpg': 'bare desert mountains and drainage seen from orbit',
        'orb-iss42-richat.jpg': 'a round landform in bare desert seen from orbit',
        'orb-iss13-oregon.jpg': 'a round crater lake seen from orbit', 'orb-iss47-brandberg.jpg': 'a round bare massif seen from orbit',
        'orb-modis-sunda.jpg': 'an island chain cut by straits, and small cloud over open sea',
        'orb-modis-tstorm-louisiana-crop.jpg': 'a storm line with overshooting tops and shadows, seen from straight above',
        'orb-modis-baja.jpg': 'a bare desert peninsula in a dark sea', 'orb-modis-arabia.jpg': 'bare desert land from orbit',
        'orb-modis-streets.jpg': 'small cumulus fields and cloud streets over a warm sea', 'orb-modis-popcorn.jpg': 'fields of small fair-weather cumulus',
        'orb-iss39-dahlak.jpg': 'desert islands, reefs and broken coast', 'orb-modis-bahamas.jpg': 'shoals, banks and cays'}
PARENT = {'orb-gemini11-india-crop.jpg': ('orb-gemini11-india.jpg', "that leaves out the spacecraft's boom and nose"), 'orb-modis-tstorm-phil-crop.jpg': ('orb-modis-tstorm-phil.jpg', 'of the storm cells'),
          'orb-modis-tstorm-louisiana-crop.jpg': ('orb-modis-tstorm-louisiana.jpg', 'of the storm line')}
lines = open(f'{R}/real/CREDITS.md', encoding='utf-8').read().split('\n'); cred = {}
for ln in lines:
    m = re.match(r'^- `(orb-[^`]+)`: (.*?) ?\.? Use: (.*)$', ln.strip())
    if m: cred[m.group(1)] = m.group(2).strip()
def usetext(b):
    kids = [c for c, (par, _) in PARENT.items() if par == b]
    if not use[b] and kids: return f"not passed to the generator itself; only its crop `{kids[0]}` was"
    if not use[b]: return 'fetched as a possible rendering standard; not passed to the generator'
    g = ', '.join(f'`{k}` ({n})' for k, n in use[b].items())
    k = f" In the kept reveal frames through: {', '.join('`' + x + '`' for x in kept[b][:4])}{' and ' + str(len(kept[b]) - 4) + ' more' if len(kept[b]) > 4 else ''}." if kept[b] else ' Not in the kept reveal frames: every take it was used for was dropped or unused.'
    return f"rendering standard for {WHAT.get(b, 'how real terrain, sea and cloud look from orbit')}; content not copied. Passed to the generator with take groups {g}.{k}"
out = []; done = set()
for ln in lines:
    m = re.match(r'^- `(orb-[^`]+)`: ', ln.strip())
    if not m: out.append(ln); continue
    b = m.group(1); done.add(b)
    c = cred[b]
    if b in PARENT and 'a crop of' not in c: c = f"a crop of `{PARENT[b][0]}` {PARENT[b][1]}; credit as for the parent: {cred[PARENT[b][0]]}"
    elif b in PARENT: c = f"a crop of `{PARENT[b][0]}` {PARENT[b][1]}; credit as for the parent: {cred[PARENT[b][0]]}"
    out.append(f"- `{b}`: {c} . Use: {usetext(b)}")
for b in sorted(os.listdir(f'{R}/real')):
    if b.startswith('orb-') and b not in done:
        c = f"a crop of `{PARENT[b][0]}` {PARENT[b][1]}; credit as for the parent: {cred[PARENT[b][0]]}" if b in PARENT else 'see the parent file'
        idx = max(i for i, l in enumerate(out) if l.startswith('- `orb-')) + 1
        out.insert(idx, f"- `{b}`: {c} . Use: {usetext(b)}"); print('added line for', b)
open(f'{R}/real/CREDITS.md', 'w', encoding='utf-8').write('\n'.join(out))
print(len(done), 'orb lines rewritten')
