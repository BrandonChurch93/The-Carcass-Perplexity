#!/usr/bin/env python3
"""Mirror the round 3 workspace into the repo (references/drafts/working plus the kept folders) and push.
usage: sync_repo.py "<commit message>"   (add --no-push as a second argument to commit without pushing)
Takes are stored as JPEG (full size, quality 90). Real photographs are stored with their credits (real/CREDITS.md says how each was used)."""
import sys, os, json, glob, shutil, subprocess
from PIL import Image
R = '/home/user/workspace/r3'; REPO = '/home/user/workspace/repo'; D = f'{REPO}/references/drafts/working'
OLD = f'{REPO}/references/drafts/step-1-art-directions'
if os.path.isdir(OLD) and not os.path.isdir(D): subprocess.run(['git', 'mv', OLD, D], cwd=REPO, check=True)
msg = sys.argv[1]
for sub in ('takes', 'prompts', 'critics', 'real', 'sheets', 'layouts', 'jobs', 'tools', 'guides'): os.makedirs(f'{D}/{sub}', exist_ok=True)
L = json.load(open(f'{R}/log.json')); n = 0
for tid, t in L['takes'].items():
    out = f'{D}/takes/{tid}.jpg'
    if 'path' not in t or t.get('archived') or os.path.exists(out) or not os.path.exists(t['path']): continue
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
for f in glob.glob(f'{R}/guide/*.jpg') + glob.glob(f'{R}/guide/*.png') + glob.glob(f'{R}/guide/*.md') + glob.glob(f'{R}/guide/*.json'): shutil.copy(f, f'{D}/guides/')
if os.path.isdir(f'{R}/archive'): shutil.copytree(f'{R}/archive', f'{REPO}/references/archive', dirs_exist_ok=True)
# The reveal redo: fresh-viewer tests and the pull-back working files.
FRESH = f'{D}/critics/fresh'; os.makedirs(FRESH, exist_ok=True)
for f in glob.glob(f'{R}/critic/fresh/*.md') + glob.glob(f'{R}/critic/fresh/*.txt') + glob.glob(f'{R}/critic/fresh/*.json'): shutil.copy(f, FRESH)
for sub in ('replies', 'seen'):
    if os.path.isdir(f'{R}/critic/fresh/{sub}'): shutil.copytree(f'{R}/critic/fresh/{sub}', f'{FRESH}/{sub}', dirs_exist_ok=True)
PULL = f'{D}/pull'; os.makedirs(PULL, exist_ok=True)
def pull_copy(src):
    """PNG pictures are stored as JPEG (quality 90); masks, JSON and argument files are copied as they are."""
    b = os.path.basename(src)
    if not os.path.exists(src): print('missing', src); return
    if b.endswith('.png') and 'mask' not in b:
        out = f'{PULL}/{b[:-4]}.jpg'
        if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(src): Image.open(src).convert('RGB').save(out, quality=90, optimize=True)
    else: shutil.copy(src, PULL)
start = L['order'].index('rv4-t1') if 'rv4-t1' in L['order'] else len(L['order'])
want = {r for k in L['order'][start:] for r in L['takes'][k].get('refs', []) if '/pull/' in r}        # every window passed back to the generator as Image 1
want |= {f'{R}/pull/{b}' for b in ('f1-x4-plate.png', 'f2-x6-plate.png', 'f2-x6-direct.png', 'f2-x6-direct-headmask.png', 'f1-x4-crop.png', 'e3-HD-crop.png', 'e3-ST-crop.png',
                                    'master-x2.args', 'master-x1.args', 'f4-x5-4k.jpg')}
want |= {f'{R}/pull/f{n}-{tag}.png' for n in (1, 2, 3, 4) for tag in ('x5', 'x6')}
want |= set(glob.glob(f'{R}/pull/*.json')) | set(glob.glob(f'{R}/pull/e2-*-crop.png'))
for f in sorted(want): pull_copy(f)
RV = f'{REPO}/references/drafts/step-2-full-set/7-reveal'
if os.path.isdir(RV): shutil.rmtree(RV)      # rebuilt from out/kept below, so that no stale file stays
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
run('git', 'add', '-A', 'references/drafts', 'references/archive/round-3-reveal')
if not run('git', 'status', '--porcelain', 'references').strip(): print('nothing to commit'); sys.exit(0)
run('git', 'commit', '-m', msg + '\n\nCo-authored-by: Perplexity <noreply@perplexity.ai>')
if '--no-push' in sys.argv: print('committed, not pushed', run('git', 'log', '--oneline', '-1').strip()); sys.exit(0)
subprocess.run(['git', 'push', 'origin', 'main'], cwd=REPO, check=True, capture_output=True, text=True)
print('pushed', run('git', 'log', '--oneline', '-1').strip(), f'({n} new takes)')
