# A larger copy of one plate, by the method of assets-src/reveal/maps/enlarge-maps.py (whose fit, lay and pyramid functions it uses).
# The plate's generated picture (assets-src/<place>/mat/src/<name>.png, 1672 x 941) is cut into 3 x 3 windows, each 1/k of its width and height;
# each window is enlarged to 2048 x 1152 and made again at full resolution by the image tool (the window prompt in enlarge.json), and the nine
# are laid on the parent by an affine fitted by ECC, tone-matched to the parent below 48 px and joined by a six-level Laplacian blend along
# seams down the middle of the overlaps. The parent fixes where everything lies; the windows add detail.
#   python3 assets-src/materials/enlarge-plate.py rows eye far-low    prints the nine calls as JSON (what the image tool is given)
#   python3 assets-src/materials/enlarge-plate.py crop eye far-low    writes out/work/tmp/big/<place>-<name>-w<row><col>-in.png
#   python3 assets-src/materials/enlarge-plate.py keep eye far-low    stores the tool's PNGs under assets-src/<place>/mat/src/big/ as JPEG 95
#   python3 assets-src/materials/enlarge-plate.py join eye far-low    writes public/assets/<place>/mat/<name>.jpg, updates materials.json, prints the fits
# A job may name rows of windows that are not used (parentRows, counted from 0 at the top): there the enlarged parent stays.
# make-materials.mjs leaves a plate alone when src/big/<name>-join.json exists, so a later run does not put the small picture back.
import importlib.util, json, os, sys
import numpy as np, cv2
from PIL import Image

_s = importlib.util.spec_from_file_location('enlarge_maps', 'assets-src/reveal/maps/enlarge-maps.py')
em = importlib.util.module_from_spec(_s); _s.loader.exec_module(em)
W, H, IN_W, IN_H, SIGMA, LEVELS = em.W, em.H, em.IN_W, em.IN_H, em.SIGMA, em.LEVELS
TMP = 'out/work/tmp/big/'
JOBS = {(j['place'], j['name']): j for j in json.load(open('assets-src/materials/enlarge.json'))}


def geo(job):
    k = job['k']
    mw, mh = int(W * k), int(H * k)
    ox = [0, (mw - W) // 2, mw - W]
    oy = [0, (mh - H) // 2, mh - H]
    return k, mw, mh, [(r, c, ox[c], oy[r]) for r in range(3) for c in range(3)]


def paths(job):
    src = f"assets-src/{job['place']}/mat/src/"
    return src, src + 'big/', f"public/assets/{job['place']}/mat/"


def rows(job):
    src, big, out = paths(job)
    res = []
    for r, c, ox, oy in geo(job)[3]:
        n = f"{job['name']}-w{r}{c}"
        res.append({'name': n, 'in': f"{TMP}{job['place']}-{n}-in.png", 'real': job['real'], 'prompt': job['prompt'], 'png': f"{TMP}{job['place']}-{n}.png", 'colour': big + n + '.jpg'})
    return res


def crop(job):
    os.makedirs(TMP, exist_ok=True)
    src, big, out = paths(job)
    k, mw, mh, wins = geo(job)
    p = Image.open(src + job['name'] + '.png').convert('RGB')
    assert p.size == (W, H), p.size
    for row, (r, c, ox, oy) in zip(rows(job), wins):
        p.transform((IN_W, IN_H), Image.EXTENT, (ox / k, oy / k, (ox + W) / k, (oy + H) / k), Image.BICUBIC).save(row['in'])
    print(job['place'], job['name'], 'nine windows ->', TMP)


def keep(job):
    src, big, out = paths(job)
    os.makedirs(big, exist_ok=True)
    for row in rows(job):
        if int(row['name'][-2]) in job.get('parentRows', []): continue
        c = Image.open(row['png']).convert('RGB')
        if c.size != (W, H): c = c.resize((W, H), Image.LANCZOS)
        c.save(row['colour'], quality=95, subsampling=0)
    print(job['name'], 'windows kept')


def join(job):
    src, big, out = paths(job)
    k, mw, mh, wins = geo(job)
    parent = cv2.imread(src + job['name'] + '.png').astype(np.float32)
    assert parent.shape[:2] == (H, W), parent.shape
    pup = cv2.resize(parent, (mw, mh), interpolation=cv2.INTER_CUBIC)
    wm = np.full((len(wins), mh, mw), -1.0, np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    far = 1e5
    for i, (r, c, ox, oy) in enumerate(wins):
        dl = xx if ox > 0 else np.full_like(xx, far)
        dr = (W - 1 - xx) if ox + W < mw else np.full_like(xx, far)
        dt = yy if oy > 0 else np.full_like(xx, far)
        db = (H - 1 - yy) if oy + H < mh else np.full_like(xx, far)
        wm[i, oy:oy + H, ox:ox + W] = np.minimum(np.minimum(dl, dr), np.minimum(dt, db))
    label = np.argmax(wm, 0)
    del wm
    acc, fits = None, []
    for i, (row, (r, c, ox, oy)) in enumerate(zip(rows(job), wins)):
        ref = pup[oy:oy + H, ox:ox + W]
        if r in job.get('parentRows', []):
            # a row of windows that is not used: the enlarged parent stays there (enlarge.json says why)
            t, moved, ok = ref.copy(), 0.0, None
        else:
            t = cv2.imread(row['colour']).astype(np.float32)
            warp, moved, ok = em.fit(ref, t)
            t = em.lay(t, warp)
            t = t + cv2.GaussianBlur(ref - t, (0, 0), SIGMA)
        full = pup.copy(); full[oy:oy + H, ox:ox + W] = t
        m = (label == i).astype(np.float32)
        gm = em.gpyr(m, LEVELS)
        lp = em.lpyr(full, LEVELS)
        if acc is None: acc = [np.zeros_like(l) for l in lp]
        for j in range(LEVELS): acc[j] += lp[j] * gm[j][..., None]
        fits.append({'window': row['name'], 'at': [ox, oy], 'used': ok is not None, 'fitted': bool(ok), 'movedPx': round(moved, 2), 'share': round(float(m.mean()), 3)})
        print(fits[-1])
    col = np.clip(em.collapse(acc), 0, 255).astype(np.uint8)
    Image.fromarray(col[..., ::-1]).save(out + job['name'] + '.jpg', quality=90, subsampling=0)
    json.dump({'place': job['place'], 'name': job['name'], 'k': k, 'written': [mw, mh], 'sigma': SIGMA, 'levels': LEVELS, 'windows': fits}, open(big + job['name'] + '-join.json', 'w'), indent=1)
    d = json.load(open(out + 'materials.json'))
    for row in d['materials']:
        if row['name'] == job['name']:
            row['width'], row['height'] = mw, mh
            row['madeFrom'] = f'nine windows made again at {k} times and joined (assets-src/materials/enlarge-plate.py)'
    json.dump(d, open(out + 'materials.json', 'w'), indent=1)
    print('written', out + job['name'] + '.jpg', (mw, mh), os.path.getsize(out + job['name'] + '.jpg') // 1024, 'kB')


if __name__ == '__main__':
    cmd, job = sys.argv[1], JOBS[(sys.argv[2], sys.argv[3])]
    if cmd == 'rows': print(json.dumps(rows(job)))
    else: {'crop': crop, 'keep': keep, 'join': join}[cmd](job)
