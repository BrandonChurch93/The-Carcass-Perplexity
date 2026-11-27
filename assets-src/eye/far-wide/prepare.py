# Puts the right end of the wide picture of the far rim (mat/far.jpg as it stood, 3344 by 1882) beside grey, for the model to carry on.
import sys
from PIL import Image
D = 'out/work/wide/'
G = (128, 128, 128)
src = sys.argv[1] if len(sys.argv) > 1 else 'public/assets/eye/mat/far.jpg'
b = Image.open(src).convert('RGB')
W, H = b.size
K = 1838  # columns of the picture that are kept in view of the model: 1000 of the canvas
r = Image.new('RGB', (1536, 1024), G)
r.paste(b.crop((W - K, 0, W, H)).resize((1000, 1024), Image.LANCZOS), (0, 0))
r.save(D + 'xr-in.png')
