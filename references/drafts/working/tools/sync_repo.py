#!/usr/bin/env python3
"""Mirror the round 3 workspace into the repo (references/drafts/working plus the kept folders) and push.
usage: sync_repo.py "<commit message>"
Takes are stored as JPEG (full size, quality 90). Real photographs are stored with their credits; they were shown to critics only."""
import sys, os, json, glob, shutil, subprocess
from PIL import Image
R = '/home/user/workspace/r3'; REPO = '/home/user/workspace/repo'; D = f'{REPO}/references/drafts/working'
OLD = f'{REPO}/references/drafts/step-1-art-directions'
if os.path.isdir(OLD) and not os.path.isdir(D): subprocess.run(['git', 'mv', OLD, D], cwd=REPO, check=True)
msg = sys.argv[1]
for sub in ('takes', 'prompts', 'critics', 'real', 'sheets', 'layouts', 'jobs', 'tools'): os.makedirs(f'{D}/{sub}', exist_ok=True)
L = json.load(open(f'{R}/log.json')); n = 0
for tid, t in L['takes'].items():
    out = f'{D}/takes/{tid}.jpg'
    if 'path' not in t or os.path.exists(out) or not os.path.exists(t['path']): continue
    Image.open(t['path']).convert('RGB').save(out, quality=90, optimize=True); n += 1
for f in glob.glob(f'{R}/prompts/*.txt'): shutil.copy(f, f'{D}/prompts/')
for f in glob.glob(f'{R}/critic/replies/*.txt'): shutil.copy(f, f'{D}/critics/')
for f in glob.glob(f'{R}/critic/*/key.json'): shutil.copy(f, f"{D}/critics/{f.split('/')[-2]}-key.json")
for f in glob.glob(f'{R}/critic/*/brief.txt'): shutil.copy(f, f"{D}/critics/{f.split('/')[-2]}-brief.txt")
for f in glob.glob(f'{R}/critic/*.txt'): shutil.copy(f, f'{D}/critics/')
for f in glob.glob(f'{R}/real/*'): shutil.copy(f, f'{D}/real/')
for f in glob.glob(f'{R}/sheets/*.jpg'): shutil.copy(f, f'{D}/sheets/')
for f in glob.glob(f'{R}/layout/*.jpg'): shutil.copy(f, f'{D}/layouts/')
for f in glob.glob(f'{R}/jobs/*.json'): shutil.copy(f, f'{D}/jobs/')
for f in glob.glob(f'{R}/tools/*'):
    if os.path.isfile(f): shutil.copy(f, f'{D}/tools/')
shutil.copy(f'{R}/log.json', f'{D}/log.json')
for f in ('ART-DIRECTIONS.md', 'NOTES.md', 'README.md'):
    if os.path.exists(f'{R}/out/{f}'): shutil.copy(f'{R}/out/{f}', f'{REPO}/references/drafts/{f}')
for d in glob.glob(f'{R}/out/kept/*'):
    dst = f"{REPO}/references/drafts/{os.path.basename(d)}"
    if os.path.isdir(d): shutil.copytree(d, dst, dirs_exist_ok=True)
    else: shutil.copy(d, dst)
run = lambda *a: subprocess.run(a, cwd=REPO, check=True, capture_output=True, text=True).stdout
run('git', 'add', '-A', 'references/drafts')
if not run('git', 'status', '--porcelain', 'references/drafts').strip(): print('nothing to commit'); sys.exit(0)
run('git', 'commit', '-m', msg + '\n\nCo-authored-by: Perplexity <noreply@perplexity.ai>')
subprocess.run(['git', 'push', 'origin', 'main'], cwd=REPO, check=True, capture_output=True, text=True)
print('pushed', run('git', 'log', '--oneline', '-1').strip(), f'({n} new takes)')
