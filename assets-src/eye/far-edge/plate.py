# The long band, which stands in the frame of the approved picture, laid out as the level picture the place hangs:
# across by the tangent of the bearing, up by the tangent of the height, as plates.ts reads it.
import cv2, numpy as np, math, sys
TA = 0.85; YLO = -0.03; YHI = 0.27
PPU = 3206.0
Wp = int(round(2*TA*PPU)); Hp = int(round((YHI-YLO)*PPU))
ext = cv2.imread('out/work/plate/band-ext.png').astype(np.float32)
B = 922
# pale evening: the sky of the band a little less coloured
g = cv2.cvtColor(ext.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
mu = cv2.GaussianBlur(g, (0, 0), 3); sd = np.sqrt(np.maximum(cv2.GaussianBlur(g*g, (0, 0), 3) - mu*mu, 0))
flat = ((sd < 2.2) & (mu > 120)).astype(np.uint8)
flat[900:] = 0
n, lab = cv2.connectedComponents(flat)
top = np.unique(lab[0]); top = top[top > 0]
sky = np.isin(lab, top).astype(np.uint8)
sky = cv2.dilate(sky, np.ones((5, 5), np.uint8))
skyf = cv2.GaussianBlur(sky.astype(np.float32), (0, 0), 1.5)[..., None]
grey = ext @ np.array([0.114, 0.587, 0.299], np.float32)
pale = grey[..., None] + (ext - grey[..., None]) * 0.72
pale = pale * np.array([1.0, 1.0, 0.985], np.float32) + 3.0
ext = ext*(1-skyf) + np.clip(pale, 0, 255)*skyf
cv2.imwrite('out/work/plate/sky-mask.jpg', cv2.resize((skyf[..., 0]*255).astype(np.uint8), (1600, 279)))
p = math.radians(13.6); t20 = math.tan(math.radians(20.0))
u = (np.arange(Wp, dtype=np.float32) + 0.5) / Wp
row = (np.arange(Hp, dtype=np.float32) + 0.5) / Hp
x = (2*u - 1) * TA
y = YHI - row * (YHI - YLO)
X, Y = np.meshgrid(x, y)
zc = math.cos(p) - Y*math.sin(p)
yc = Y*math.cos(p) + math.sin(p)
xs = X / zc / (t20*16/9); ys = yc / zc / t20
xa = (xs + 1)/2 * 1672; ya = (1 - ys)/2 * 941
xb = xa*0.919; yb = 509 + ya*0.919
S = 1536/585
mx = (xb*S + B).astype(np.float32); my = ((yb - 290)*S).astype(np.float32)
print('map x', mx.min(), mx.max(), 'y', my.min(), my.max(), 'ext', ext.shape)
out = cv2.remap(ext, mx, my, cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
out = np.clip(out, 0, 255).astype(np.uint8)
cv2.imwrite('public/assets/eye/mat/far-edge2.jpg', out, [cv2.IMWRITE_JPEG_QUALITY, 91])
cv2.imwrite('out/work/plate/plate-view.jpg', cv2.resize(out, (1600, int(Hp*1600/Wp)), interpolation=cv2.INTER_AREA))
print(Wp, Hp, 'tanAcross', TA, 'tanUp', (YHI-YLO)/2, 'horizon', -YLO/(YHI-YLO))
