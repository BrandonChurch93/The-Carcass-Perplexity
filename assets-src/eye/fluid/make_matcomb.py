"""Writes public/assets/eye/lake/matcomb.jpg from the generated picture beside this script.

Run from the root of the repo: python3 assets-src/eye/fluid/make_matcomb.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'assets-src/eye/fluid/mats-aerial-take1.png'
TARGET = ROOT / 'public/assets/eye/lake/matcomb.jpg'

TARGET.parent.mkdir(parents=True, exist_ok=True)
Image.open(SOURCE).convert('RGB').save(TARGET, 'JPEG', quality=90)
print(f'{TARGET.relative_to(ROOT)}: {TARGET.stat().st_size} bytes')
