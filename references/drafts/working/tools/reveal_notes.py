#!/usr/bin/env python3
"""Write out/reveal-notes.md, the Reveal section of NOTES.md, from tools/reveal-notes.tpl.md.
Placeholders: {{PROMPT:name}} full prompt text; {{REFS:take}} numbered reference list; {{TAKE:take}} time, seconds, size;
{{PLATES}} table of the 21 closer plates; {{REALS}} credits of the real photographs of the kept chain; counts."""
import json, os, re
R = '/home/user/workspace/r3'; L = json.load(open(f'{R}/log.json')); T = L['takes']
CRED = {}
for line in open(f'{R}/real/CREDITS.md', encoding='utf-8'):
    m = re.match(r'^- `([^`]+)`: (.*?) \. Use: (.*)$', line.strip())
    if m: CRED[m.group(1)] = (m.group(2), m.group(3))
CROP = {'pull/f1-x4-crop.png': 'the lake window of the master, enlarged: the picture being photographed again from closer',
        'pull/f2-x6-direct.png': 'the frame 2 window drawn from the master through the head warp: the picture being photographed again',
        'pull/e3-HD-crop.png': 'the head window of the master (`master-x2h`), enlarged: the picture being photographed again',
        'pull/e3-ST-crop.png': 'the backbone window of the master (`master-x2h`), enlarged: the picture being photographed again',
        'guide/cx-e-guide.png': 'the painted layout: where everything is'}
def relp(r): return os.path.relpath(r, R)
def repo_path(rp):
    if rp.startswith('real/'): return 'working/real/' + rp[5:]
    if rp.startswith('guide/'): return 'working/guides/' + rp[6:]
    if rp.startswith('pull/'): return 'working/pull/' + rp[5:].replace('.png', '.jpg')
    if rp.startswith('gen/'): return 'working/takes/' + rp[4:].replace('.png', '.jpg')
    return rp
def refs(tid, ind='  '):
    out = []
    for i, r in enumerate(T[tid]['refs'], 1):
        rp = relp(r); b = os.path.basename(rp)
        if rp.startswith('real/'): out.append(f"{ind}{i}. `{repo_path(rp)}`: real photograph, {CRED[b][0]} . Rendering standard only; the prompt says to copy nothing in it.")
        else: out.append(f"{ind}{i}. `{repo_path(rp)}`: {CROP.get(rp, 'a window of the wide picture, enlarged: the picture being photographed again from closer')}")
    return '\n'.join(out)
def take(tid): t = T[tid]; return f"generated {t['t']} UTC, {t['secs']} s, {t.get('size') or '1672x941'}"
def prompt(name): return '```text\n' + open(f'{R}/prompts/{name}.txt', encoding='utf-8').read().strip() + '\n```'
def plates():
    rows = []; names = [f'W{c}{r}' for r in range(4) for c in range(4)] + ['HD', 'ST', 'WA', 'WF', 'WG']
    for n in names:
        tid = f'e2-{n}-t1'; t = T[tid]; m = re.search(r'\(x (\d+), y (\d+) of', t['what']); rs = [relp(r) for r in t['refs']]
        rows.append(f"| `{tid}` | `{t['prompt']}` | {m.group(1)}, {m.group(2)} | `{repo_path(rs[0])}` | " + ', '.join(f"`{os.path.basename(r)}`" for r in rs[1:]) + ' |')
    return '\n'.join(rows)
def reals():
    used = []
    for tid in ['cx-e-t2'] + [k for k in L['order'] if k.startswith('e2-')] + ['e3-HD-t4', 'e3-ST-t1', 'pb1e-t1', 'pb2g-t2']:
        for r in T[tid]['refs']:
            b = os.path.basename(r)
            if '/real/' in r and b not in used: used.append(b)
    return '\n'.join(f"- `working/real/{b}`: {CRED[b][0]} . Use: {CRED[b][1]}" for b in used)
rx = re.compile(r'\b(human|humanoid|person|man|body|figure|giant|skeleton|skeletal)\b', re.I)
RP = json.load(open(f'{R}/critic/fresh/replies.json')); G = [x for x in RP if x['test'] == 'GLANCE']
start = L['order'].index('rv4-t1')
s = open(f'{R}/tools/reveal-notes.tpl.md', encoding='utf-8').read()
s = re.sub(r'\{\{PROMPT:([^}]+)\}\}', lambda m: prompt(m.group(1)), s)
s = re.sub(r'\{\{REFS:([^}]+)\}\}', lambda m: refs(m.group(1)), s)
s = re.sub(r'\{\{TAKE:([^}]+)\}\}', lambda m: take(m.group(1)), s)
s = s.replace('{{PLATES}}', plates()).replace('{{REALS}}', reals()).replace('{{N_REPLIES}}', str(len(RP)))
s = s.replace('{{GLANCE}}', f"{sum(bool(rx.search(x['reply'])) for x in G)} of {len(G)}")
s = s.replace('{{REDO_TAKES}}', str(len(L['order']) - start)).replace('{{ALL_TAKES}}', str(len(L['order'])))
assert '{{' not in s, re.findall(r'\{\{[^}]*\}\}', s)
open(f'{R}/out/reveal-notes.md', 'w', encoding='utf-8').write(s)
print('out/reveal-notes.md', len(s), 'chars,', s.count('\n'), 'lines')
