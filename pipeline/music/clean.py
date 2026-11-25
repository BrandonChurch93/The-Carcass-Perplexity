"""The supplied track with the two spots of laughter taken out.

The cleaned track is the supplied track, decoded, less one removed signal inside each spot.
Every sample outside the spots is the decoded sample, and the length does not change.
The removed signals are kept beside the cleaned track, so the supplied track can be had back by adding them.

usage: python3 pipeline/music/clean.py [--check]

--check makes nothing: it decodes the supplied track again and proves the cleaned file against it.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CONFIG = 'config/showcase.json'
SUPPLIED = 'audio/supplied'
SPOTS = 'audio/cleaned/removed/spots.json'
REPORT = 'audio/cleaned/cleaned.json'
RATE = 44100
STEP_24 = 1.0 / (1 << 23)
FULL = 1.0 - STEP_24


def rel(*p):
    return os.path.join(ROOT, *p)


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()


def decode(path):
    cmd = ['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(RATE), '-']
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def stamp(sample):
    s = sample / RATE
    return f'{int(s // 60)}:{s % 60:06.3f}'


def db(x):
    r = float(np.sqrt(np.mean(np.square(x)))) if len(x) else 0.0
    return None if r <= 0 else round(20 * np.log10(r), 2)


def build(cfg, spots):
    src = rel(SUPPLIED, cfg['music']['file'])
    have = sha256(src)
    if have != cfg['music']['sha256']:
        raise SystemExit(f'clean: {SUPPLIED}/{cfg["music"]["file"]} is not the supplied track: its hash is {have}')
    track = decode(src)
    cleaned = track.copy()
    rows = []
    for s in spots['spots']:
        removed, rate = sf.read(rel(os.path.dirname(SPOTS), s['file']), dtype='float64')
        if rate != RATE or removed.ndim != 2 or removed.shape[1] != 2:
            raise SystemExit(f'clean: {s["file"]} is not 2 channels at {RATE} Hz')
        a, b = s['start'], s['start'] + len(removed)
        if b != s['end'] or a < 0 or b > len(track):
            raise SystemExit(f'clean: {s["file"]} does not span samples {s["start"]} to {s["end"]}')
        if np.abs(removed[0]).max() > 16 * STEP_24 * 256 or np.abs(removed[-1]).max() > 16 * STEP_24 * 256:
            raise SystemExit(f'clean: {s["file"]} does not start and end at silence, so taking it out would click')
        cleaned[a:b] -= removed
        rows.append({
            'id': s['id'],
            'asked': s['asked'],
            'from': stamp(a),
            'to': stamp(b),
            'firstSample': a,
            'endSample': b,
            'seconds': round((b - a) / RATE, 3),
            'removedFile': f'{os.path.dirname(SPOTS)}/{s["file"]}',
            'removedSha256': sha256(rel(os.path.dirname(SPOTS), s['file'])),
            'removedPeak': round(float(np.abs(removed).max()), 5),
            'removedRmsDb': db(removed),
            'suppliedRmsDb': db(track[a:b]),
            'cleanedRmsDb': db(cleaned[a:b]),
        })
    over = np.abs(cleaned) > FULL
    held = {
        'samples': int(over.any(axis=1).sum()),
        'highest': round(float(np.abs(cleaned).max()), 5),
        'from': stamp(int(np.flatnonzero(over.any(axis=1))[0])) if over.any() else None,
        'to': stamp(int(np.flatnonzero(over.any(axis=1))[-1])) if over.any() else None,
        'inSupplied': int((np.abs(track) > FULL).any(axis=1).sum()),
        'suppliedHighest': round(float(np.abs(track).max()), 5),
    }
    return track, np.clip(cleaned, -FULL, FULL), rows, held


def outside(spots, length):
    keep = np.ones(length, dtype=bool)
    for s in spots['spots']:
        keep[s['start']:s['end']] = False
    return keep


def prove(track, cleaned_exact, spots, out_file):
    got, rate = sf.read(out_file, dtype='float64')
    keep = outside(spots, len(track))
    faults = []
    if rate != RATE:
        faults.append(f'the cleaned file is at {rate} Hz, not {RATE}')
    if got.shape != track.shape:
        faults.append(f'the cleaned file holds {len(got)} samples and the supplied track {len(track)}')
        return faults, None
    whole = np.clip(track, -FULL, FULL)
    off_out = float(np.abs(got[keep] - whole[keep]).max())
    off_in = float(np.abs(got[~keep] - cleaned_exact[~keep]).max())
    if off_out > STEP_24:
        faults.append(f'outside the spots the cleaned file is {off_out:.3g} away from the supplied track')
    if off_in > STEP_24:
        faults.append(f'inside the spots the cleaned file is {off_in:.3g} away from the supplied track less the removed signals')
    return faults, {'outsideSamples': int(keep.sum()), 'outsideMaxDifference': off_out, 'insideSamples': int((~keep).sum()), 'insideMaxDifference': off_in, 'step24': STEP_24}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    cfg = json.load(open(rel(CONFIG)))
    spots = json.load(open(rel(SPOTS)))
    out_rel = spots['cleaned']
    out_file = rel(out_rel)
    track, cleaned, rows, held = build(cfg, spots)
    if not a.check:
        os.makedirs(os.path.dirname(out_file), exist_ok=True)
        sf.write(out_file, cleaned, RATE, subtype='PCM_24', format='FLAC')
    elif not os.path.exists(out_file):
        raise SystemExit(f'clean: {out_rel} is not there. Run the tool without --check first.')
    faults, proof = prove(track, cleaned, spots, out_file)
    report = {
        'schema': 'carcass/music-cleaned 1',
        'supplied': {'file': f'{SUPPLIED}/{cfg["music"]["file"]}', 'sha256': cfg['music']['sha256']},
        'cleaned': {'file': out_rel, 'sha256': sha256(out_file), 'sampleRate': RATE, 'channels': 2, 'bits': 24, 'samples': int(len(cleaned)), 'seconds': round(len(cleaned) / RATE, 4)},
        'suppliedSamples': int(len(track)),
        'spots': rows,
        'heldAtFullScale': held,
        'proof': proof,
        'faults': faults,
    }
    if not a.check:
        with open(rel(REPORT), 'w') as f:
            json.dump(report, f, indent=2)
            f.write('\n')
    for r in rows:
        print(f'clean: {r["id"]}, {r["from"]} to {r["to"]} ({r["seconds"]} s): the track there was {r["suppliedRmsDb"]} dB, the removed signal {r["removedRmsDb"]} dB, what is left {r["cleanedRmsDb"]} dB')
    if proof:
        print(f'clean: {proof["outsideSamples"]} samples outside the spots, the most any differs from the supplied track is {proof["outsideMaxDifference"]:.3g} (one 24 bit step is {STEP_24:.3g}); {proof["insideSamples"]} samples inside, the most any differs from supplied less removed is {proof["insideMaxDifference"]:.3g}')
    print(f'clean: {held["samples"]} samples held at full scale ({held["inSupplied"]} of the supplied track are over full scale as decoded, highest {held["suppliedHighest"]}; highest after the removal {held["highest"]})')
    print(f'clean: {"checked" if a.check else "wrote"} {out_rel}, {len(cleaned)} samples, {len(cleaned) / RATE:.4f} s, sha256 {report["cleaned"]["sha256"]}')
    if faults:
        for f in faults:
            print(f'clean: FAULT: {f}')
        sys.exit(1)


if __name__ == '__main__':
    main()
