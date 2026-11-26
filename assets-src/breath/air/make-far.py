# Makes public/assets/breath/air/far.jpg from the working backplate public/assets/breath/mat/far.jpg: the same picture graded toward the
# approved establishing key. The backplate is pinker and paler than the key; five anchors a channel (the dark of the cave, the face of the
# cliff, the sky over it, the sky between that and the sun, the glow round the sun), measured in linear light on both, are joined by a curve that is straight between them
# in log space. The sky of the place (air/sky.ts) draws this picture where the far cliff and the low sun are, and undoes the film's own
# tone curve first, so that what reaches the screen is this picture.
# Run from the repository root: python3 assets-src/breath/air/make-far.py
import numpy as np
from PIL import Image

a = np.asarray(Image.open('public/assets/breath/mat/far.jpg').convert('RGB'), dtype=np.float32) / 255
lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
# backplate (cave, cliff face, sky over the cliff, glow) -> approved key, per channel, linear light
FROM = [(0.05, 0.214, 0.474, 0.65, 0.988), (0.06, 0.199, 0.422, 0.6, 0.871), (0.075, 0.205, 0.436, 0.55, 0.626)]
TO = [(0.03, 0.133, 0.42, 0.52, 0.94), (0.032, 0.130, 0.385, 0.47, 0.66), (0.036, 0.125, 0.37, 0.42, 0.449)]
out = np.zeros_like(lin)
for c in range(3):
    xs = np.log(np.array((0.002,) + FROM[c] + (1.0,)))
    ys = np.log(np.array((0.0012,) + TO[c] + ((0.95, 0.7, 0.5)[c],)))
    out[..., c] = np.exp(np.interp(np.log(np.maximum(lin[..., c], 0.002)), xs, ys))
# The far plume (left of the middle, standing on the horizon) is steam: white, not the pink the backplate gave it. It is drawn toward its
# own grey, most at its middle, and not at all a plume's width away.
H, W, _ = out.shape
yy, xx = np.mgrid[0:H, 0:W]
plume = np.exp(-(((xx / W - 0.15) / 0.08) ** 2 + ((yy / H - 0.32) / 0.13) ** 2))
grey = out @ np.array([0.3, 0.55, 0.15], dtype=np.float32)
out = out + (grey[..., None] * np.array([1.06, 1.0, 0.92], dtype=np.float32) - out) * (0.75 * plume[..., None])
srgb = np.where(out <= 0.0031308, out * 12.92, 1.055 * out ** (1 / 2.4) - 0.055)
Image.fromarray(np.clip(np.round(srgb * 255), 0, 255).astype(np.uint8)).save('public/assets/breath/air/far.jpg', quality=92)
print('written', out.reshape(-1, 3).mean(0))
