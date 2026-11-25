"""Pictures of short spots of a track: one row of spectrograms for each spot, one panel for each file.

usage: python3 pipeline/music/spots.py --out PNG --spot "74:76:label" [--spot ...] --file "label=PATH" [--file ...] [--pad 4] [--title TEXT]
"""
import argparse
import json
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.signal import stft

RATE = 44100
NFFT = 4096
HOP = 256
F_LO = 60.0
F_HI = 12000.0
FLOOR_DB = -84.0
TOP_DB = -18.0
GROUND = (18, 19, 22)
INK = (224, 224, 228)
DIM = (150, 150, 158)
MARK = (255, 214, 110)
STOPS = [(0.0, (8, 8, 20)), (0.25, (58, 16, 110)), (0.5, (150, 40, 110)), (0.72, (230, 100, 60)), (0.9, (250, 190, 80)), (1.0, (252, 250, 200))]


def decode(path, start, seconds):
    cmd = ['ffmpeg', '-v', 'error', '-ss', f'{start:.6f}', '-t', f'{seconds:.6f}', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(RATE), '-']
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)


def font(size, bold=False):
    names = ['DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except OSError:
            continue
    return ImageFont.load_default()


def colour(v):
    v = np.clip(v, 0, 1)
    out = np.zeros(v.shape + (3,), dtype=np.float32)
    for (a, ca), (b, cb) in zip(STOPS[:-1], STOPS[1:]):
        m = (v >= a) & (v <= b)
        k = ((v - a) / (b - a))[m][:, None]
        out[m] = np.array(ca, dtype=np.float32) * (1 - k) + np.array(cb, dtype=np.float32) * k
    return out.astype(np.uint8)


def panel(x, width, height):
    mono = x.mean(axis=1)
    f, _, z = stft(mono, fs=RATE, nperseg=NFFT, noverlap=NFFT - HOP, window='hann', boundary=None, padded=False)
    mag = 20 * np.log10(np.abs(z) + 1e-9)
    rows = np.geomspace(F_LO, F_HI, height)
    idx = np.clip(np.searchsorted(f, rows), 1, len(f) - 1)
    lo = np.maximum(idx - 1, 0)
    spec = np.maximum(mag[idx], mag[lo])
    cols = np.linspace(0, spec.shape[1] - 1, width).astype(int)
    spec = spec[:, cols][::-1]
    return colour((spec - FLOOR_DB) / (TOP_DB - FLOOR_DB))


def clock(t):
    return f'{int(t // 60)}:{t % 60:04.1f}' if t % 1 else f'{int(t // 60)}:{int(t % 60):02d}'


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--out', required=True)
    p.add_argument('--spot', action='append', required=True)
    p.add_argument('--file', action='append', required=True)
    p.add_argument('--pad', type=float, default=4.0)
    p.add_argument('--title', default='')
    p.add_argument('--width', type=int, default=1600)
    p.add_argument('--panel-height', type=int, default=230)
    a = p.parse_args()
    spots = []
    for s in a.spot:
        start, end, label = s.split(':', 2)
        spots.append((float(start), float(end), label))
    files = [f.split('=', 1) for f in a.file]
    pad = 20
    head = 44 if a.title else 0
    label_h = 26
    axis_h = 22
    inner = a.width - 2 * pad
    row_h = label_h + a.panel_height + axis_h
    height = pad + head + len(spots) * (30 + len(files) * row_h + 14) + pad
    img = Image.new('RGB', (a.width, height), GROUND)
    d = ImageDraw.Draw(img)
    y = pad
    if a.title:
        d.text((pad, y), a.title, font=font(22, True), fill=INK)
        y += head
    record = {'kind': 'music-spots', 'spots': [], 'files': [f[1] for f in files]}
    for start, end, label in spots:
        t0 = max(0.0, start - a.pad)
        seconds = end - start + 2 * a.pad
        d.text((pad, y), f'{label}  ·  {clock(start)} to {clock(end)} of the track, shown with {a.pad:g} s on each side', font=font(18, True), fill=INK)
        y += 30
        for name, path in files:
            x = decode(path, t0, seconds)
            d.text((pad, y + 4), name, font=font(15), fill=DIM)
            y += label_h
            img.paste(Image.fromarray(panel(x, inner, a.panel_height)), (pad, y))
            xa = pad + int(round((start - t0) / seconds * inner))
            xb = pad + int(round((end - t0) / seconds * inner))
            for xx in (xa, xb):
                for yy in range(y, y + a.panel_height, 6):
                    d.line([(xx, yy), (xx, yy + 3)], fill=MARK, width=1)
            d.rectangle([xa, y - 4, xb, y - 2], fill=MARK)
            y += a.panel_height
            t = np.ceil(t0)
            while t <= t0 + seconds:
                xx = pad + int(round((t - t0) / seconds * inner))
                d.line([(xx, y), (xx, y + 5)], fill=DIM)
                if int(t) % 2 == 0:
                    d.text((xx - 12, y + 6), clock(t), font=font(12), fill=DIM)
                t += 1
            y += axis_h
            rms = float(np.sqrt(np.mean(x ** 2)))
            a0 = int((start - t0) * RATE)
            a1 = int((end - t0) * RATE)
            inside = float(np.sqrt(np.mean(x[a0:a1] ** 2)))
            record['spots'].append({'label': label, 'file': path, 'from': start, 'to': end, 'windowDb': round(20 * np.log10(rms + 1e-12), 2), 'spotDb': round(20 * np.log10(inside + 1e-12), 2)})
        y += 14
    d.text((pad, height - pad - 4), f'log frequency, {F_LO:g} Hz at the bottom to {F_HI / 1000:g} kHz at the top  ·  brighter is louder  ·  the yellow bar and the dashed lines mark the spot', font=font(13), fill=DIM)
    img.save(a.out)
    with open(a.out + '.json', 'w') as f:
        json.dump(record, f, indent=1)
    print(f'spots: wrote {a.out}, {a.width} x {height}')


if __name__ == '__main__':
    sys.exit(main())
