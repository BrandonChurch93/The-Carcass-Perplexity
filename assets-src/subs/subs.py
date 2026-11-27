#!/usr/bin/env python3
"""subs.py: the caption layer of The Carcass, laid over finished frames. The page never draws it.
Warm off-white words that come in as each is spoken, on a soft moving haze, with no box: old blood on the
opening, The Ribs, The Breath, The Spine, The Eye and the Reveal, ash with a few embers on The Heart and
The Blood Marsh. The colours are a fixed list for each place in cut/CAPTIONS.json, never read from the picture.
Adapted from the caption layer of the Solar System Fly-Through (assets-src/subs/subs.py in that repo).

  subs.py cues [--check]            write cut/CAPTIONS.json from the cut list and the alignment; keeps its look
  subs.py still T OUT [FRAME.png]   one frame at T seconds over a film frame (or over black, grey and white bars)
  subs.py burn FILM AUDIO OUT       the film with the layer burned in and AUDIO as its sound
  subs.py layer OUT W H FPS         the layer alone with alpha (qtrle in a mov, or PNG files when OUT holds %d)
  subs.py prove                     every word's time against where its line's own sound rises
  subs.py contrast T FRAME.png      the text against what lies under it in that frame, as JSON
  subs.py step T0 T1 W H FPS        the haze's mean change from frame to frame over mid grey, in 8 bit levels, as JSON
"""
import json, os, re, sys, math, subprocess, wave, zlib
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
FONT = os.path.join(HERE, 'Lato-Medium.ttf')
ALIGN = os.path.join(HERE, 'alignment-kept.json')
CUTLIST = os.path.join(ROOT, 'cut', 'CUTLIST.json')
CAPTIONS = os.path.join(ROOT, 'cut', 'CAPTIONS.json')
RECORDS = os.path.join(ROOT, 'audio', 'records')
SCHEMA = 'carcass/captions 1'
SIZES = ((960, 540), (1920, 1080), (3840, 2160))

# ---- the look a person may change lives in cut/CAPTIONS.json under "look". This is what cues writes when the file has none.
BLOOD = dict(family='blood red', dark=[42, 5, 8], body=[110, 10, 16], bright=[163, 20, 26], sparks=False)
ASH = dict(family='ash and ember', dark=[11, 10, 10], body=[30, 27, 26], bright=[58, 53, 50], sparks=True)
FAMILY = dict(ribs=BLOOD, heart=ASH, breath=BLOOD, marsh=ASH, spine=BLOOD, eye=BLOOD, reveal=BLOOD)
DEFAULT_LOOK = dict(
    text=[245, 237, 221],
    em=0.050,
    baseline=0.905,
    crossfadeSeconds=1.5,
    cover=0.88,
    sparkFrom=[255, 138, 42],
    sparkTo=[255, 194, 122],
    sparksPerSquareEm=0.16,
    breaks={},
)

# ---- how it moves, in units of the type size (em = look.em * H). The Solar layer's numbers, kept.
LEAD = 1.32           # row to row, em
MAXW = 0.80           # widest row, share of the frame width
ONEROW = 0.55         # a line narrower than this share of the width stays one row
WORD_IN = 0.22        # a word's fade in, s
WORD_AHEAD = 0.04     # it starts this long before its sound, s
WORD_RISE = 0.10      # it rises this far into place, em
WORD_SOFT = 0.07      # it comes in out of this much blur, em
HAZE_AHEAD = 0.26     # the haze under a word starts this long before its sound, s
HAZE_IN = 0.36        # and takes this long, s
HOLD = 0.90           # the line stands this long after its last word ends, s (less if the next line is near)
MIN_UP = 1.40         # and this long in all from its first word, s
OUT = 0.55            # then all of it fades over this, s
S_GAP = 0.30          # a gap before a word no longer than this is running speech, s
MIN_OUT = 0.20        # where the next line is nearer than that allows, the fade is shortened, to this at the least, s
PILL_X, PILL_Y = 0.42, 0.30
NEAR_SIG = 0.62                     # the haze close round the words, em
MID_SIG = (1.25, 0.72)              # its body, across and down, em
FAR_SIG = (2.60, 1.15)              # its thin outer reach, em
A_HAZE = 0.80                       # the haze at its thickest, as a share of look.cover
A_NEAR = 0.70                       # and what stands close round the words on top of that
LOBES = 5                           # each line's haze leans out in this many places of its own
BLOOM_T = 0.50
GRID_EM = 13.5        # the haze is computed on a grid of this many cells to the em (same look at any size)
CAP, DESC = 0.72, 0.19
YCAP = 0.130          # the haze is never lighter than this (relative luminance)
SHADE = 0.80          # the shadow round the letters is the haze's darkest colour times this
EDGE_ROOM, EDGE_WINDOW = 0.03, 0.01   # edgeRoomSeconds and windowSeconds of tools/lib/voice-core.mjs, which cut the kept lines
AHEAD_MS, BEHIND_MS = 40.0, 80.0   # a word may show this long before its sound, and this long after it at most
STOPW = {'a', 'an', 'the', 'of', 'to', 'and', 'in', 'on', 'is', 'than', 'from', 'for', 'its', 'has', 'was', 'only', 'our', 'at', 'it'}


# ---- cues ------------------------------------------------------------------------------------------------
def bare(w):
    return re.sub(r'[^0-9a-z]', '', w.lower())


def take_words(al):
    """The words of each paragraph of a take, with their times in the take. The delivery tag is skipped."""
    ch = al['characters']; t0 = al['character_start_times_seconds']; t1 = al['character_end_times_seconds']
    i = 0
    while i < len(ch) and ch[i].isspace():
        i += 1
    if i < len(ch) and ch[i] == '[':
        i = ch.index(']', i) + 1
    paras = [[]]
    while i < len(ch):
        if ch[i] == '\n':
            if paras[-1]:
                paras.append([])
            i += 1; continue
        if ch[i].isspace():
            i += 1; continue
        j = i
        while j < len(ch) and not ch[j].isspace():
            j += 1
        k = j - 1
        while k > i and not ch[k].isalnum():
            k -= 1
        paras[-1].append((''.join(ch[i:j]), t0[i], t1[k]))
        i = j
    return [p for p in paras if p]


def line_start(clip, line):
    """(take, second of the take the line's sound starts at), from the line's record."""
    text = open(os.path.join(RECORDS, '%s-%d.md' % (clip, line)), encoding='utf-8').read()
    m = re.search(r'Take (\d+) from ([0-9.]+) s to ([0-9.]+) s', text)
    if not m:
        raise SystemExit('audio/records/%s-%d.md does not say where the line was cut from' % (clip, line))
    return int(m.group(1)), float(m.group(2))


def measure_rows(words, look, breaks_at=None):
    """Rows as lists of word indexes, broken at 1920 by 1080; every size uses the same rows."""
    Wd, Ht = 1920, 1080
    font = ImageFont.truetype(FONT, int(round(look['em'] * Ht * 2)))
    widths = [font.getlength(w) / 2 for w in words]; space = font.getlength(' ') / 2
    n = len(words); maxw = MAXW * Wd
    if breaks_at:
        return [list(range(0, breaks_at)), list(range(breaks_at, n))]
    if sum(widths) + space * (n - 1) <= ONEROW * Wd:
        return [list(range(n))]
    cands = []
    for b in range(1, n):
        w1 = sum(widths[:b]) + space * (b - 1); w2 = sum(widths[b:]) + space * (n - b - 1)
        if max(w1, w2) > maxw:
            continue
        prev = words[b - 1]
        c = abs(w1 - w2) / maxw
        c += 0.0 if prev[-1] in '.?' else (0.10 if prev[-1] in ',;:' else 0.28)
        if bare(prev) in STOPW and prev[-1] not in '.?,;:':
            c += 0.25
        cands.append((c, b, prev[-1] in '.?,;:'))
    # a row ends on a full stop or a comma wherever the line has one that fits
    marked = [x for x in cands if x[2]]
    best = min(marked or cands) if cands else None
    if best is None:
        raise SystemExit('the line %r does not fit two rows' % ' '.join(words))
    return [list(range(0, best[1])), list(range(best[1], n))]


def make_cues():
    C = json.load(open(CUTLIST, encoding='utf-8')); A = json.load(open(ALIGN, encoding='utf-8'))
    fps = C['fps']
    old = json.load(open(CAPTIONS, encoding='utf-8')) if os.path.exists(CAPTIONS) else {}
    look = old.get('look')
    if look is None:
        look = dict(DEFAULT_LOOK)
        look['units'] = {p['unit']: dict(FAMILY[p['unit']]) for p in C['places']}
    for p in C['places']:
        if p['unit'] not in look['units']:
            raise SystemExit('look.units in cut/CAPTIONS.json has no entry for %s' % p['unit'])
    lines = []
    for l in C['lines']:
        clip, n = l['clip'], l['line']
        take, s0 = line_start(clip, n)
        if take != A[clip]['take']:
            raise SystemExit('%s-%d: its record names take %d, the alignment is of take %d' % (clip, n, take, A[clip]['take']))
        para = take_words(A[clip]['alignment'])[n - 1]
        shown = l['text'].split()
        if [bare(w) for w in shown] != [bare(w[0]) for w in para[:len(shown)]]:
            raise SystemExit('%s-%d: the take says %r, the cut list %r' % (clip, n, ' '.join(w[0] for w in para), l['text']))
        t = l['first'] / fps
        words = [dict(w=w, on=round(t + p[1] - s0, 4), off=round(t + p[2] - s0, 4)) for w, p in zip(shown, para)]
        # the kept line was cut EDGE_ROOM before the first window that holds sound: its first word begins there, wherever the alignment put it
        words[0]['on'] = round(min(t + EDGE_ROOM + EDGE_WINDOW, words[0]['off'] - 0.02), 4)
        # the alignment gives the hiss of an s to the gap before its word: in running speech such a word begins to show as the word before it ends
        for i in range(1, len(words)):
            gap = words[i]['on'] - words[i - 1]['off']
            if shown[i][0] in 'sS' and 0 < gap <= S_GAP:
                words[i]['on'] = round(min(words[i - 1]['off'] + WORD_AHEAD, words[i]['on']), 4)
        end = t + l['frames'] / fps
        for w in words:
            w['off'] = round(min(w['off'], end), 4); w['on'] = round(min(w['on'], w['off']), 4)
        rows = measure_rows(shown, look, look.get('breaks', {}).get('%s-%d' % (clip, n)))
        lines.append(dict(clip=clip, line=n, text=l['text'], unit=l['unit'], rows=[' '.join(shown[i] for i in r) for r in rows], words=words))
    cuts = [p['first'] / fps for p in C['places']][1:] + [C['frameCount'] / fps]
    for a, b in zip(lines, lines[1:] + [None]):
        first, last = a['words'][0]['on'], a['words'][-1]['off']
        # the line must be gone before the next line's first word begins to show, and before the cut to the next place
        limit = min(([b['words'][0]['on'] - WORD_AHEAD] if b else []) + [min(c for c in cuts if c > last)])
        want = max(HOLD, first + MIN_UP - last)
        hold = max(0.0, min(want, limit - MIN_OUT - last))
        a['in'] = round(first - HAZE_AHEAD - 0.05, 4)
        a['out'] = round(last + hold, 4)
        a['gone'] = round(min(last + hold + OUT, limit), 4)
        if a['gone'] - a['out'] < MIN_OUT - 1e-6:
            raise SystemExit('%s-%d: the next line comes too soon for it to fade' % (a['clip'], a['line']))
    doc = dict(schema=SCHEMA, fps=fps, frameCount=C['frameCount'], look=look, lines=lines)
    return dumps(doc)


def dumps(doc):
    """One word a row, one colour a row: small diffs, the same bytes every run."""
    s = json.dumps(doc, indent=2, ensure_ascii=False)
    s = re.sub(r'\[\s+(-?[0-9.]+),\s+(-?[0-9.]+),\s+(-?[0-9.]+)\s+\]', r'[\1, \2, \3]', s)
    s = re.sub(r'\{\s+"w": ("(?:[^"\\]|\\.)*"),\s+"on": ([0-9.]+),\s+"off": ([0-9.]+)\s+\}', r'{ "w": \1, "on": \2, "off": \3 }', s)
    return s + '\n'


def load():
    if not os.path.exists(CAPTIONS):
        raise SystemExit('cut/CAPTIONS.json is missing: run subs.py cues')
    D = json.load(open(CAPTIONS, encoding='utf-8'))
    C = json.load(open(CUTLIST, encoding='utf-8'))
    for l in D['lines']:
        l['id'] = '%s-%d' % (l['clip'], l['line'])
        joined = ' '.join(l['rows']).split()
        if joined != [w['w'] for w in l['words']]:
            raise SystemExit('%s: its rows are not its words' % l['id'])
    D['places'] = C['places']
    return D


# ---- layout ----------------------------------------------------------------------------------------------
class Layout:
    """Where every word of every line stands, for one frame size."""

    def __init__(self, D, Wd, Ht):
        look = D['look']
        self.Wd, self.Ht = Wd, Ht
        self.em = look['em'] * Ht
        base = look['baseline']
        self.ss = 3 if Ht <= 720 else (2 if Ht <= 1440 else 1)
        self.font = ImageFont.truetype(FONT, int(round(self.em * self.ss)))
        asc, desc = self.font.getmetrics()
        self.asc, self.desc = asc / self.ss, desc / self.ss
        pad = 3.2 * self.em
        self.y0 = int(max(0, math.floor(base * Ht - LEAD * self.em - self.asc - pad)))
        self.y1 = int(min(Ht, math.ceil(base * Ht + self.desc + pad)))
        self.bh = self.y1 - self.y0
        self.lines = {}
        space = self.font.getlength(' ') / self.ss
        for c in D['lines']:
            widths = [self.font.getlength(w['w']) / self.ss for w in c['words']]
            rows = []; i = 0
            for r in c['rows']:
                n = len(r.split()); rows.append(list(range(i, i + n))); i += n
            items = []
            for ri, row in enumerate(rows):
                rw = sum(widths[i] for i in row) + space * (len(row) - 1)
                x = (Wd - rw) / 2.0
                bl = base * Ht - (len(rows) - 1 - ri) * LEAD * self.em - self.y0
                for i in row:
                    items.append(dict(i=i, x=x, base=bl, w=widths[i], row=ri))
                    x += widths[i] + space
            for it in items:
                it.update(self._tile(c['words'][it['i']]['w'], it['x'], it['base']))
            self.lines[c['id']] = dict(rows=rows, items=items)

    def _tile(self, word, x, base):
        ss = self.ss; m = int(math.ceil(0.30 * self.em))
        w = int(math.ceil(self.font.getlength(word) / ss)) + 2 * m + 2
        h = int(math.ceil(self.asc + self.desc)) + 2 * m + 2
        tx = int(math.floor(x)) - m; ty = int(math.floor(base - self.asc)) - m
        im = Image.new('L', (w * ss, h * ss), 0)
        ImageDraw.Draw(im).text(((x - tx) * ss, (base - self.asc - ty) * ss), word, font=self.font, fill=255)
        a = np.asarray(im, np.float32) / 255.0
        if ss > 1:
            a = cv2.resize(a, (w, h), interpolation=cv2.INTER_AREA)
        return dict(tile=a, tx=tx, ty=ty)


# ---- the haze ----------------------------------------------------------------------------------------------
class Noise3:
    """Value noise that moves in time: a fixed lattice of random numbers read with a smooth fade. The same numbers every run."""

    def __init__(self, seed, nx=64, ny=32, nt=64):
        self.L = np.random.RandomState(seed).rand(nt, ny, nx).astype(np.float32); self.n = (nt, ny, nx)

    def at(self, X, Y, t):
        nt, ny, nx = self.n
        x0 = np.floor(X).astype(np.int32); y0 = np.floor(Y).astype(np.int32); t0 = int(math.floor(t))
        fx = (X - x0).astype(np.float32); fy = (Y - y0).astype(np.float32); ft = t - t0
        fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); ft = ft * ft * (3 - 2 * ft)
        x0 %= nx; y0 %= ny; x1 = (x0 + 1) % nx; y1 = (y0 + 1) % ny

        def bil(L):
            return (L[y0, x0] * (1 - fx) + L[y0, x1] * fx) * (1 - fy) + (L[y1, x0] * (1 - fx) + L[y1, x1] * fx) * fy
        return bil(self.L[t0 % nt]) * (1 - ft) + bil(self.L[(t0 + 1) % nt]) * ft


def fbm(N, X, Y, t, octs=3):
    s = 0.0; amp = 0.5; f = 1.0; tot = 0.0
    for o in range(octs):
        s = s + amp * N.at(X * f + 17.3 * o, Y * f + 9.1 * o, t * (1 + 0.5 * o) + 5.7 * o)
        tot += amp; amp *= 0.5; f *= 2.0
    return s / tot


def sstep(a, b, x):
    x = np.clip((x - a) / (b - a), 0.0, 1.0)
    return x * x * (3 - 2 * x)


def lum(c):
    """Relative luminance (WCAG) of sRGB values 0 to 1, last axis 3."""
    l = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return l[..., 0] * 0.2126 + l[..., 1] * 0.7152 + l[..., 2] * 0.0722


def rgb(v):
    return np.array(v, np.float32) / 255.0


class Renderer:
    def __init__(self, D, Wd, Ht):
        self.D = D; self.cues = D['lines']; self.look = look = D['look']; self.fps = D['fps']
        self.L = L = Layout(D, Wd, Ht); self.Wd, self.Ht = Wd, Ht
        em = L.em; self.cell = cell = em / GRID_EM
        self.gw = int(math.ceil(Wd / cell)); self.gh = int(math.ceil(L.bh / cell))
        gy, gx = np.mgrid[0:self.gh, 0:self.gw].astype(np.float32)
        self.U = gx / GRID_EM; self.V = gy / GRID_EM
        self.N = [Noise3(s) for s in (11, 23, 37, 51, 67)]
        self.up = (int(round(self.gw * cell)), int(round(self.gh * cell)))
        self.text = rgb(look['text']); self.cover = float(look.get('cover', 0.88))
        self.units = [(p['unit'], p['first'] / self.fps) for p in D['places']]
        self.pal = {u: tuple(rgb(look['units'][u][k]) for k in ('dark', 'body', 'bright')) + (1.0 if look['units'][u].get('sparks') else 0.0,) for u, _ in self.units}
        self.xfade = float(look.get('crossfadeSeconds', 1.5))
        # the embers: fixed places in em, each steady or breathing slowly. The same list at every size.
        rs = np.random.RandomState(5)
        we, he = Wd / em, L.bh / em
        s0, s1 = rgb(look.get('sparkFrom', [255, 138, 42])), rgb(look.get('sparkTo', [255, 194, 122]))
        self.sparks = []
        for _ in range(int(round(we * he * float(look.get('sparksPerSquareEm', 0.16))))):
            u, v, ph, sz, k, per, steady = rs.rand(), rs.rand(), rs.rand(), rs.rand(), rs.rand(), rs.rand(), rs.rand()
            gx_, gy_ = u * we * GRID_EM, v * he * GRID_EM
            ix, iy = int(gx_), int(gy_)
            if not (3 <= ix < self.gw - 4 and 3 <= iy < self.gh - 4):
                continue
            yy, xx = np.mgrid[-2:4, -2:4].astype(np.float32)
            d2 = (xx - (gx_ - ix)) ** 2 + (yy - (gy_ - iy)) ** 2
            kern = (np.exp(-d2 / (2 * 0.55 ** 2)) + 0.16 * np.exp(-d2 / (2 * 1.6 ** 2))).astype(np.float32)
            self.sparks.append(dict(ix=ix, iy=iy, kern=kern[..., None] * (s0 + (s1 - s0) * k), size=0.35 + 0.65 * sz ** 2,
                                    w=2 * math.pi / (5.0 + 7.0 * per), ph=2 * math.pi * ph, depth=0.0 if steady < 0.3 else 0.45))
        self.dither = (np.random.RandomState(Wd * 7 + Ht).rand(L.bh, Wd, 1).astype(np.float32) - 0.5) * (1.0 / 255.0)
        for c in self.cues:
            for it in L.lines[c['id']]['items']:
                x0 = (it['x'] - PILL_X * em) / cell; x1 = (it['x'] + it['w'] + PILL_X * em) / cell
                y0 = (it['base'] - (CAP + PILL_Y) * em) / cell; y1 = (it['base'] + (DESC + PILL_Y) * em) / cell
                xa, xb = max(0, int(math.floor(x0))), min(self.gw, int(math.ceil(x1)))
                ya, yb = max(0, int(math.floor(y0))), min(self.gh, int(math.ceil(y1)))
                cx = np.clip(np.minimum(np.arange(xa, xb) + 1, x1) - np.maximum(np.arange(xa, xb), x0), 0, 1).astype(np.float32)
                cy = np.clip(np.minimum(np.arange(ya, yb) + 1, y1) - np.maximum(np.arange(ya, yb), y0), 0, 1).astype(np.float32)
                it['pill'] = (slice(ya, yb), slice(xa, xb), np.outer(cy, cx))
        # each line's own outline: a still, large pattern and a few lobes, seeded by the line's id. Fixed in time.
        self.shape = {}; self.lobes = {}
        yy, xx = np.mgrid[0:self.gh, 0:self.gw].astype(np.float32)
        for c in self.cues:
            rs = np.random.RandomState(zlib.crc32(c['id'].encode()) & 0x7fffffff)
            ox, oy, ot = rs.rand() * 64, rs.rand() * 32, rs.rand() * 64
            n = fbm(self.N[4], self.U * 0.21 + ox, self.V * 0.46 + oy, ot, 3)
            fine = fbm(self.N[3], self.U * 0.62 + oy, self.V * 1.05 + ox, ot * 0.7, 2)
            self.shape[c['id']] = np.clip((0.72 * n + 0.28 * fine - 0.5) * 2.6 + 0.5, 0, 1)
            items = L.lines[c['id']]['items']; lobes = []
            for k in range(LOBES):
                i = 0 if k == 0 else (len(items) - 1 if k == 1 else rs.randint(len(items)))
                it = items[i]
                side = -1.0 if k == 0 else (1.0 if k == 1 else (1.0 if rs.rand() < 0.5 else -1.0))
                reach = rs.uniform(0.5, 2.9) if k < 2 else rs.uniform(0.0, 1.4)
                cx = (it['x'] + (it['w'] if side > 0 else 0.0) + side * reach * em) / cell
                cy = (it['base'] - 0.3 * em + rs.uniform(-1.25, 1.05) * em) / cell
                rx, ry = rs.uniform(0.9, 2.1) * GRID_EM, rs.uniform(0.40, 0.85) * GRID_EM
                wt = rs.uniform(0.45, 1.0)
                xa, xb = max(0, int(cx - 3 * rx)), min(self.gw, int(cx + 3 * rx) + 1)
                ya, yb = max(0, int(cy - 3 * ry)), min(self.gh, int(cy + 3 * ry) + 1)
                if xb <= xa or yb <= ya:
                    continue
                blob = wt * np.exp(-0.5 * (((xx[ya:yb, xa:xb] - cx) / rx) ** 2 + ((yy[ya:yb, xa:xb] - cy) / ry) ** 2))
                lobes.append((it['i'], slice(ya, yb), slice(xa, xb), blob.astype(np.float32)))
            self.lobes[c['id']] = lobes

    def palette(self, t):
        """The colours at film time t: each place's own, crossed over look.crossfadeSeconds centred on every cut."""
        h = self.xfade / 2.0
        s = [1.0] + [float(sstep(tc - h, tc + h, t)) if h > 0 else float(t >= tc) for _, tc in self.units[1:]]
        out = [0.0, 0.0, 0.0, 0.0]
        for i, (u, _) in enumerate(self.units):
            w = s[i] * (1.0 - (s[i + 1] if i + 1 < len(s) else 0.0))
            if w > 0:
                for k in range(4):
                    out[k] = out[k] + w * self.pal[u][k]
        return out

    def layer(self, t, parts=False):
        """The band at time t: colour times alpha (bh, Wd, 3) and alpha (bh, Wd), or None when no line stands.
        A line may still be fading while the haze of the next one comes in: the later line lies over the earlier."""
        out = None
        for c in self.cues:
            if c['in'] <= t <= c['gone']:
                r = self.one(c, t)
                if out is None:
                    out = r
                else:
                    P, A, At = r
                    out = (out[0] * (1 - A[..., None]) + P, out[1] * (1 - A) + A, np.maximum(out[2], At))
        if out is None:
            return None
        return out if parts else out[:2]

    def one(self, c, t):
        """One line at time t: colour times alpha, alpha, and the letters alone."""
        L = self.L; em = L.em
        dark, body, bright, sparkw = self.palette(t)
        env = 1.0 if t <= c['out'] else 1.0 - float(sstep(0, 1, (t - c['out']) / (c['gone'] - c['out'])))
        M = np.zeros((self.gh, self.gw), np.float32); Mb = np.zeros_like(M); H = {}
        At = np.zeros((L.bh, self.Wd), np.float32)
        for it in L.lines[c['id']]['items']:
            w = c['words'][it['i']]
            h = float(sstep(0, 1, (t - (w['on'] - HAZE_AHEAD)) / HAZE_IN)) * env
            H[it['i']] = h
            if h <= 0:
                continue
            ys, xs, rect = it['pill']
            M[ys, xs] = np.maximum(M[ys, xs], h * rect)
            b = float(sstep(0, 1, (t - (w['on'] - 0.08)) / 0.16)) * math.exp(-max(0.0, t - w['on'] - 0.08) / BLOOM_T) * env
            if b > 0.004:
                Mb[ys, xs] = np.maximum(Mb[ys, xs], b * rect)
            p = min(1.0, max(0.0, (t - (w['on'] - WORD_AHEAD)) / WORD_IN))
            if p <= 0:
                continue
            e = 1 - (1 - p) ** 3
            tile = it['tile']
            if e < 0.999:
                sg = (1 - e) * WORD_SOFT * em
                if sg > 0.15:
                    tile = cv2.GaussianBlur(tile, (0, 0), sg)
                dy = (1 - e) * WORD_RISE * em
                tile = cv2.warpAffine(tile, np.float32([[1, 0, 0], [0, 1, dy]]), (tile.shape[1], tile.shape[0]), flags=cv2.INTER_LINEAR)
            ty, tx = it['ty'], it['tx']; th, tw = tile.shape
            ya, yb = max(0, ty), min(L.bh, ty + th); xa, xb = max(0, tx), min(self.Wd, tx + tw)
            At[ya:yb, xa:xb] = np.maximum(At[ya:yb, xa:xb], tile[ya - ty:yb - ty, xa - tx:xb - tx] * (e * env))
        Mw = M.copy()
        for i, ys, xs, blob in self.lobes[c['id']]:
            if H.get(i, 0) > 0:
                Mw[ys, xs] = np.maximum(Mw[ys, xs], H[i] * blob)
        near = cv2.GaussianBlur(M, (0, 0), NEAR_SIG * GRID_EM)
        mid = np.minimum(1.0, 1.30 * cv2.GaussianBlur(Mw, (0, 0), MID_SIG[0] * GRID_EM, sigmaY=MID_SIG[1] * GRID_EM))
        far = np.minimum(1.0, 1.90 * cv2.GaussianBlur(Mw, (0, 0), FAR_SIG[0] * GRID_EM, sigmaY=FAR_SIG[1] * GRID_EM))
        S = cv2.GaussianBlur(Mb, (0, 0), 0.60 * GRID_EM) if Mb.max() > 0 else Mb
        U, V = self.U, self.V
        # the clouds: slow value noise, bent by a slower one, drifting left. A function of t and of the place in em only.
        warp = fbm(self.N[3], U * 0.13, V * 0.30, t * 0.09, 2) - 0.5
        X = U * 0.30 - t * 0.075 + 1.9 * warp; Y = V * 0.80 + 1.1 * warp
        tt = t * 0.26
        n1 = fbm(self.N[0], X, Y, tt)
        u = sstep(0.30, 0.76, n1)
        k2 = fbm(self.N[1], X * 0.6 + 31.0, Y * 0.7, tt * 0.8, 2)
        n2 = fbm(self.N[2], X * 1.7 + 63.0, Y * 1.9, tt * 1.2)
        thread = np.clip(1 - np.abs(n2 - 0.5) * 9.0, 0, 1) ** 2 * sstep(0.35, 0.70, n1)
        depth = np.clip((0.30 + 0.70 * u) * (0.80 + 0.40 * k2), 0, 1.15)
        lift = np.clip(0.55 * thread + 0.70 * S + 0.30 * u * u * k2, 0, 1)
        col = dark + (body - dark) * depth[..., None] + (bright - body) * lift[..., None]
        y = lum(np.clip(col, 0, 1))
        col = np.clip(col * np.minimum(1.0, (YCAP / np.maximum(y, 1e-4)) ** (1 / 2.2))[..., None], 0, 1)
        # thick close to the words, then a long thinning out. The outline is the line's own still pattern, so it never moves.
        F = 0.30 * near + 0.38 * mid + 0.32 * far
        ragged = 0.18 + 1.45 * self.shape[c['id']]
        F = F * (ragged + (1.0 - ragged) * sstep(0.35, 0.95, near))
        a = self.cover * (1.0 - (1.0 - A_HAZE * sstep(0.0, 0.92, F) * (0.90 + 0.10 * u)) * (1.0 - A_NEAR * sstep(0.0, 0.90, near * (0.85 + 0.40 * self.shape[c['id']])))) + 0.08 * S
        a = np.minimum(a, self.cover)
        # where the haze thins it goes to its darkest colour, so its rim darkens a bright frame and never tints it
        col = dark + (col - dark) * sstep(0.18, 0.66, a)[..., None]
        if sparkw > 0:
            a2 = np.clip((a - 0.25) / 0.45, 0, 1)
            for s in self.sparks:
                amp = sparkw * s['size'] * (1.0 - s['depth'] * (0.5 + 0.5 * math.sin(t * s['w'] + s['ph']))) * float(a2[s['iy'], s['ix']])
                if amp > 0.01:
                    col[s['iy'] - 2:s['iy'] + 4, s['ix'] - 2:s['ix'] + 4] += amp * s['kern']
            col = np.clip(col, 0, 1)
        g = cv2.resize(np.dstack([col, a]).astype(np.float32), self.up, interpolation=cv2.INTER_LINEAR)[:L.bh, :self.Wd]
        if g.shape[0] < L.bh or g.shape[1] < self.Wd:
            g = cv2.copyMakeBorder(g, 0, L.bh - g.shape[0], 0, self.Wd - g.shape[1], cv2.BORDER_REPLICATE)
        hc, ha = g[..., :3], g[..., 3]
        sh = np.minimum(0.93, 0.85 * np.minimum(1.0, 2.2 * cv2.GaussianBlur(At, (0, 0), 0.085 * em)) + 0.75 * np.minimum(1.0, 2.4 * cv2.GaussianBlur(At, (0, 0), 0.26 * em))
                        + 0.55 * np.minimum(1.0, 2.8 * cv2.GaussianBlur(At, (0, 0), 0.50 * em)))
        P = hc * ha[..., None]; A = ha
        P = P * (1 - sh[..., None]) + (dark * SHADE) * sh[..., None]; A = A * (1 - sh) + sh
        P = P * (1 - At[..., None]) + At[..., None] * self.text; A = A * (1 - At) + At
        return P, A, At

    def over(self, frame, t):
        """frame: uint8 (Ht, Wd, 3) RGB, changed in place inside the band. The dither is fixed in place, so it never moves."""
        r = self.layer(t)
        if r is None:
            return frame
        P, A = r; L = self.L
        band = frame[L.y0:L.y1].astype(np.float32) / 255.0
        out = band * (1 - A[..., None]) + P
        d = self.dither * (A[..., None] > 0.004)
        frame[L.y0:L.y1] = np.clip((out + d) * 255.0 + 0.5, 0, 255).astype(np.uint8)
        return frame

    def rgba(self, t):
        """The whole frame as straight RGBA, uint8, or None when no line stands."""
        r = self.layer(t)
        if r is None:
            return None
        P, A = r; L = self.L
        out = np.zeros((self.Ht, self.Wd, 4), np.uint8)
        c = P / np.maximum(A[..., None], 1e-4)
        out[L.y0:L.y1, :, :3] = np.clip((c + self.dither) * 255.0 + 0.5, 0, 255).astype(np.uint8)
        out[L.y0:L.y1, :, 3] = np.clip(A * 255.0 + 0.5, 0, 255).astype(np.uint8)
        return out


def contrast(R, frame, t):
    """The text against what stands round the letters, as WCAG ratios: least, mean, and the same two for the film alone."""
    r = R.layer(t, parts=True)
    if r is None:
        return None
    P, A, At = r; L = R.L
    band = frame[L.y0:L.y1].astype(np.float32) / 255.0
    comp = band * (1 - A[..., None]) + P
    k = int(max(1, round(0.14 * L.em)))
    near = cv2.dilate((At > 0.25).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1, 2 * k + 1))) > 0
    ring = near & (At < 0.03)
    if ring.sum() < 20:
        return None
    yc = lum(comp)[ring]; yf = lum(band)[ring]; yt = float(lum(R.text[None, None, :])[0, 0])
    f = lambda y: (yt + 0.05) / (y + 0.05)
    return dict(least=round(float(f(np.percentile(yc, 99.5))), 2), mean=round(float(f(yc.mean())), 2),
                filmLeast=round(float(f(np.percentile(yf, 99.5))), 2), filmMean=round(float(f(yf.mean())), 2))


# ---- the proof of the word times ---------------------------------------------------------------------------
QUIET_DB = -40.0      # under the line's peak by this much is silence, as the tool that cut the lines has it
QUIET_S = 0.06        # a silence is at least this long
NEAR_S = 0.20         # a rise is looked for this far either side of the word's time


def read_wav(path):
    w = wave.open(path, 'rb'); sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768.0
    if w.getnchannels() > 1:
        x = x.reshape(-1, w.getnchannels()).mean(axis=1)
    return x, sr


def level_db(x, sr, hop=0.001, win=0.010):
    """The level in dB every millisecond; value i is of the window that starts at i ms."""
    k = int(win * sr); h = int(hop * sr)
    e = np.cumsum(np.concatenate([[0.0], x.astype(np.float64) ** 2]))
    idx = np.arange(0, len(x) - k, h)
    return 10 * np.log10((e[idx + k] - e[idx]) / k + 1e-12)


def rises_after_silence(db, hop=0.001, win=0.010):
    """Seconds at which the sound comes up out of a silence (the file's start counts as one)."""
    quiet = db < db.max() + QUIET_DB
    out = []; run = int(QUIET_S / hop)
    i = 0; n = len(db); start = True
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            if j < n and (j - i >= run or start):
                out.append(j * hop + win)
            i = j
        else:
            i += 1
        start = False
    return out


def rises_in_speech(x, sr):
    """Seconds at which some band of the sound climbs fastest (spectral flux, 16 bands from 150 Hz to 8 kHz)."""
    n = 2048; h = sr // 500
    frames = np.lib.stride_tricks.sliding_window_view(np.concatenate([np.zeros(n // 2, np.float32), x, np.zeros(n // 2, np.float32)]), n)[::h]
    mag = np.abs(np.fft.rfft(frames * np.hanning(n).astype(np.float32), axis=1))
    f = np.fft.rfftfreq(n, 1.0 / sr); edges = np.geomspace(150, 8000, 17)
    bands = np.stack([mag[:, (f >= a) & (f < b)].mean(axis=1) for a, b in zip(edges[:-1], edges[1:])], axis=1)
    L = np.log10(bands / (bands.max() + 1e-12) + 1e-3)
    lag = 8
    flux = np.concatenate([np.zeros(lag), np.maximum(0.0, L[lag:] - L[:-lag]).sum(axis=1)])
    flux = np.convolve(flux, np.ones(5) / 5, mode='same')
    floor = 0.30 * np.percentile(flux, 98)
    out = []
    for i in range(10, len(flux) - 10):
        if flux[i] > floor and flux[i] == flux[i - 10:i + 11].max():
            out.append((i - lag / 2.0) * h / sr)
    return out


def hiss_start(x, sr, tau):
    """Where the sound above 4 kHz comes up to within 12 dB of its height round the alignment's start of the word: the start of an s."""
    n = 512; h = sr // 500
    frames = np.lib.stride_tricks.sliding_window_view(np.concatenate([np.zeros(n // 2, np.float32), x, np.zeros(n // 2, np.float32)]), n)[::h]
    mag = np.abs(np.fft.rfft(frames * np.hanning(n).astype(np.float32), axis=1)) ** 2
    f = np.fft.rfftfreq(n, 1.0 / sr)
    hi = 10 * np.log10(mag[:, f >= 4000].mean(axis=1) + 1e-12); hop = h / sr
    a, b = max(0, int((tau - 0.12) / hop)), min(len(hi), int((tau + 0.08) / hop))
    if b - a < 3:
        return None
    k = a + int(np.argmax(hi[a:b])); th = hi[k] - 12
    while k > 0 and hi[k] >= th:
        k -= 1
    return (k + 1) * hop if tau - (k + 1) * hop <= 0.30 else None


def prove(D):
    """For every word: where its line's own sound rises nearest the word's time, and how long before (-) or after (+) that rise the word shows."""
    C = {(c['clip'], c['line']): c for c in json.load(open(CUTLIST, encoding='utf-8'))['lines']}
    out = []
    for l in D['lines']:
        c = C[(l['clip'], l['line'])]; path = os.path.join(ROOT, c['file'])
        if not os.path.exists(path):
            raise SystemExit('%s is not here: the proof needs the kept lines' % c['file'])
        x, sr = read_wav(path); t0 = c['first'] / D['fps']
        clear = rises_after_silence(level_db(x, sr)); soft = rises_in_speech(x, sr)
        taus = [w['on'] - t0 for w in l['words']]
        para = take_words(json.load(open(ALIGN, encoding='utf-8'))[l['clip']]['alignment'])[l['line'] - 1]
        s0 = line_start(l['clip'], l['line'])[1]
        owner = {}
        for r in clear:
            i = min(range(len(taus)), key=lambda i: abs(taus[i] - r))
            if abs(taus[i] - r) <= NEAR_S:
                owner[i] = r
        for i, w in enumerate(l['words']):
            tau = taus[i]
            r = owner.get(i); kind = 'after a silence'
            if r is None and i > 0 and w['w'][0] in 'sS':
                r = hiss_start(x, sr, para[i][1] - s0); kind = 'the hiss of an s'
            if r is None:
                near = [x for x in soft if abs(x - tau) <= NEAR_S and not any(abs(x - c) < 0.03 for c in clear)]
                r = min(near, key=lambda x: abs(x - tau)) if near else None; kind = 'in speech'
            out.append(dict(id=l['id'], w=w['w'], on=w['on'], kind=kind if r is not None else 'no rise found', rise=None if r is None else round(t0 + r, 4),
                            showsMs=None if r is None else round((w['on'] - WORD_AHEAD - (t0 + r)) * 1000, 1)))
    return out


def proof_summary(res):
    def part(rs):
        d = [r['showsMs'] for r in rs if r['showsMs'] is not None]
        if not d:
            return dict(words=0)
        return dict(words=len(d), largestMs=max(d, key=abs), medianMs=round(float(np.median(d)), 1), medianAbsMs=round(float(np.median(np.abs(d))), 1), earliestMs=min(d), latestMs=max(d))
    bad = [dict(id=r['id'], w=r['w'], kind=r['kind'], showsMs=r['showsMs']) for r in res if r['showsMs'] is not None and not (-AHEAD_MS - 0.5 <= r['showsMs'] <= BEHIND_MS + 0.5)]
    return dict(words=len(res), limitsMs=[-AHEAD_MS, BEHIND_MS], all=part(res), afterASilence=part([r for r in res if r['kind'] == 'after a silence']),
                inSpeech=part([r for r in res if r['kind'] == 'in speech']), hissOfAnS=part([r for r in res if r['kind'] == 'the hiss of an s']), noRiseFound=[dict(id=r['id'], w=r['w']) for r in res if r['showsMs'] is None], outside=bad)


# ---- files -------------------------------------------------------------------------------------------------
def probe(path):
    j = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                                   'stream=width,height,r_frame_rate,color_space', '-of', 'json', path], capture_output=True, text=True).stdout)['streams'][0]
    a, b = j['r_frame_rate'].split('/')
    j['fps'] = float(a) / float(b)
    return j


def check_size(Wd, Ht):
    if (Wd, Ht) not in SIZES:
        raise SystemExit('the frame is %d by %d: the layer is made for %s' % (Wd, Ht, ', '.join('%d by %d' % s for s in SIZES)))


def bars():
    fr = np.zeros((1080, 1920, 3), np.uint8); fr[:, 640:1280] = 128; fr[:, 1280:] = 255
    return fr


def main(argv):
    cmd = argv[1] if len(argv) > 1 else ''
    if cmd == 'cues':
        s = make_cues()
        if '--check' in argv:
            same = os.path.exists(CAPTIONS) and open(CAPTIONS, encoding='utf-8').read() == s
            print('cut/CAPTIONS.json is %s' % ('what cues writes' if same else 'not what cues writes'))
            return 0 if same else 1
        open(CAPTIONS, 'w', encoding='utf-8', newline='\n').write(s)
        for l in load()['lines']:
            print('%s %-6s in %7.2f first word %7.2f last word ends %7.2f out %7.2f gone %7.2f | %s' % (l['id'], l['unit'], l['in'], l['words'][0]['on'], l['words'][-1]['off'], l['out'], l['gone'], ' / '.join(l['rows'])))
    elif cmd == 'still':
        t = float(argv[2]); out = argv[3]
        fr = np.asarray(Image.open(argv[4]).convert('RGB')).copy() if len(argv) > 4 else bars()
        check_size(fr.shape[1], fr.shape[0])
        R = Renderer(load(), fr.shape[1], fr.shape[0])
        c = contrast(R, fr, t)
        R.over(fr, t)
        Image.fromarray(fr).save(out, quality=93)
        print(out, '%d by %d' % (fr.shape[1], fr.shape[0]), 'contrast least %(least).2f mean %(mean).2f (the film alone least %(filmLeast).2f mean %(filmMean).2f)' % c if c else 'no line at %.3f s' % t)
    elif cmd == 'contrast':
        t = float(argv[2]); fr = np.asarray(Image.open(argv[3]).convert('RGB'))
        check_size(fr.shape[1], fr.shape[0])
        print(json.dumps(contrast(Renderer(load(), fr.shape[1], fr.shape[0]), fr, t)))
    elif cmd == 'prove':
        res = prove(load()); sm = proof_summary(res)
        if '-v' in argv:
            for r in res:
                print('%-5s %-12s on %8.3f %-15s rise %s shows %s ms' % (r['id'], r['w'], r['on'], r['kind'], r['rise'], r['showsMs']))
        print(json.dumps(sm, indent=1))
        return 1 if sm['outside'] else 0
    elif cmd == 'step':
        t0, t1 = float(argv[2]), float(argv[3]); Wd, Ht = int(argv[4]), int(argv[5]); fps = float(argv[6])
        R = Renderer(load(), Wd, Ht); prev = None; haze = []; whole = []; top = []
        n0 = int(math.ceil(t0 * fps)); n1 = int(math.floor(t1 * fps))
        for n in range(n0, n1 + 1):
            fr = np.full((Ht, Wd, 3), 128, np.uint8); R.over(fr, n / fps)
            band = fr[R.L.y0:R.L.y1].astype(np.float32)
            r = R.layer(n / fps, parts=True)
            mask = None if r is None else (r[1] > 0.5) & (cv2.GaussianBlur(r[2], (0, 0), 0.10 * R.L.em) < 0.01)
            if prev is not None and mask is not None and pmask is not None and (mask & pmask).sum() > 0:
                d = np.abs(band - prev).mean(axis=2)
                haze.append(float(d[mask & pmask].mean())); whole.append(float(d.mean())); top.append(float(d[mask & pmask].max()))
            prev = band; pmask = mask
        print(json.dumps(dict(frames=n1 - n0 + 1, fps=fps, hazeMeanStep=round(float(np.mean(haze)), 4), hazeLargestMeanStep=round(float(np.max(haze)), 4),
                              hazeLargestPixelStep=round(float(np.max(top)), 2), bandMeanStep=round(float(np.mean(whole)), 4))))
    elif cmd == 'burn':
        film, audio, out = argv[2], argv[3], argv[4]
        t0 = float(argv[5]) if len(argv) > 5 else 0.0; dur = float(argv[6]) if len(argv) > 6 else None
        pr = probe(film); Wd, Ht, fps = pr['width'], pr['height'], pr['fps']
        check_size(Wd, Ht)
        R = Renderer(load(), Wd, Ht)
        cut = (['-ss', '%.4f' % t0] if t0 else []) + (['-t', '%.4f' % dur] if dur else [])
        dec = subprocess.Popen(['ffmpeg', '-v', 'error'] + cut + ['-i', film, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE, bufsize=Wd * Ht * 3 * 4)
        tags = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709'] if pr.get('color_space') == 'bt709' else []
        enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (Wd, Ht), '-r', '%g' % fps, '-i', '-'] + cut + ['-i', audio,
                                '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', os.environ.get('CRF', '16'), '-pix_fmt', 'yuv420p'] + tags +
                               ['-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
        n = 0; nb = Wd * Ht * 3
        import time; T0 = time.time()
        while True:
            buf = dec.stdout.read(nb)
            if len(buf) < nb:
                break
            fr = np.frombuffer(buf, np.uint8).reshape(Ht, Wd, 3).copy()
            R.over(fr, t0 + n / fps)
            enc.stdin.write(fr.tobytes()); n += 1
            if n % 600 == 0:
                print('frame %d, %.1f s' % (n, time.time() - T0), flush=True)
        enc.stdin.close(); enc.wait(); dec.wait()
        print('DONE %d frames, %.1f s, %s' % (n, time.time() - T0, out))
    elif cmd == 'layer':
        out = argv[2]; Wd, Ht = int(argv[3]), int(argv[4]); fps = float(argv[5])
        t0 = float(argv[6]) if len(argv) > 6 else 0.0
        D = load(); check_size(Wd, Ht); R = Renderer(D, Wd, Ht)
        dur = float(argv[7]) if len(argv) > 7 else D['frameCount'] / D['fps'] - t0
        count = int(round(dur * fps)); empty = np.zeros((Ht, Wd, 4), np.uint8)
        enc = None
        if '%' not in out:
            enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '%dx%d' % (Wd, Ht), '-r', '%g' % fps, '-i', '-',
                                    '-c:v', 'qtrle', '-pix_fmt', 'argb', out], stdin=subprocess.PIPE)
        for n in range(count):
            fr = R.rgba(t0 + n / fps)
            fr = empty if fr is None else fr
            if enc:
                enc.stdin.write(fr.tobytes())
            else:
                Image.fromarray(fr).save(out % n)
        if enc:
            enc.stdin.close(); enc.wait()
        print('DONE %d frames, %s' % (count, out))
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv) or 0)
