# The storm masses as the dome loads them: the picture's colour carried out into the clear (no fringe where it is read soft), the cut edge
# softened and drawn a little inside, nothing at the border.
import sys, os
from PIL import Image, ImageFilter
import numpy as np
def proc(src, dst):
    im = Image.open(src).convert('RGBA')
    a = np.asarray(im).astype(np.float32) / 255
    al = a[..., 3]
    rgb = a[..., :3].copy()
    known = al.copy()
    for rad in (4, 12, 40, 120):
        pm = Image.fromarray((np.clip(rgb * known[..., None], 0, 1) * 255).astype(np.uint8))
        bl = np.asarray(pm.filter(ImageFilter.GaussianBlur(rad))).astype(np.float32) / 255
        ba = np.asarray(Image.fromarray((known * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad))).astype(np.float32) / 255
        fill = bl / np.maximum(ba[..., None], 1e-3)
        reach = np.clip(ba * 8, 0, 1)
        w = (reach * (1 - np.clip(known * 4, 0, 1)))[..., None]
        rgb = rgb * (1 - w) + fill * w
        known = np.maximum(known, reach)
    # The cut is read soft: a cloud's edge is vapour over some metres, and a shred thinner than that is not there.
    b = np.asarray(Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))).astype(np.float32) / 255
    soft = np.clip((b - 0.36) / 0.5, 0, 1)
    soft = soft * soft * (3 - 2 * soft)
    h, w_ = soft.shape
    yy, xx = np.mgrid[0:h, 0:w_]
    edge = np.minimum(np.minimum(xx, w_ - 1 - xx), np.minimum(yy, h - 1 - yy)).astype(np.float32)
    soft *= np.clip((edge - 2) / 24, 0, 1)
    # The pale line the cut leaves along the cloud's outline is taken down: an edge against the storm behind is no brighter than the head.
    wide = np.asarray(Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(9))).astype(np.float32) / 255
    inside = np.clip((wide - 0.45) / 0.5, 0, 1)
    lum = rgb @ np.array([0.3, 0.5, 0.2], np.float32)
    calm = np.clip((lum - 0.2) / 0.3, 0, 1) * (1 - inside)
    rgb = rgb * (1 - 0.3 * calm)[..., None]
    # A thin bright line (the generator's rim light on a head) is taken down to the cloud about it: broad pale bellies stay, drawn lines go.
    lum = rgb @ np.array([0.3, 0.5, 0.2], np.float32)
    li = Image.fromarray((np.clip(lum, 0, 1) * 255).astype(np.uint8))
    opened = np.asarray(li.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255
    excess = np.maximum(lum - opened, 0)
    rgb = rgb * ((lum - 0.75 * excess) / np.maximum(lum, 1e-3))[..., None]
    out = np.dstack([np.clip(rgb, 0, 1), soft])
    Image.fromarray((out * 255 + 0.5).astype(np.uint8), 'RGBA').save(dst, optimize=True)
    print(dst, os.path.getsize(dst) // 1024, 'KB', Image.open(dst).size)
for k in 'abcd':
    proc(f'assets-src/spine/air/mass-{k}-1.png', f'/tmp/mass-{k}.png')
# The loaded file is one JPEG: the colour in the upper half, the cut (how much of the cloud stands at each dot) in the lower half, written so that
# the reader's decoding from sRGB gives the share back as it was.
def pack(k):
    im = Image.open(f'/tmp/mass-{k}.png')
    a = np.asarray(im).astype(np.float32) / 255
    al = a[..., 3]
    enc = np.where(al <= 0.0031308, al * 12.92, 1.055 * np.power(np.maximum(al, 1e-6), 1 / 2.4) - 0.055)
    h, w = al.shape
    out = np.zeros((2 * h, w, 3), np.float32)
    out[:h] = a[..., :3]
    out[h:] = enc[..., None]
    dst = f'public/assets/spine/mat/mass-{k}.jpg'
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGB').save(dst, quality=90, subsampling=0)
    print(dst, os.path.getsize(dst) // 1024, 'KB', (w, 2 * h))
for k in 'abcd':
    pack(k)
