# Makes public/assets/breath/land/slabface.jpg from the working picture of a fallen slab (public/assets/breath/mat/slab.jpg): its middle,
# where the picture is all rock and none of its black ground, so that it can be laid on the faces of the fallen blocks turn and turn about
# (mirrored at each repeat). The blocks take its breaks and beds as tone; the rig lights them.
# Run from the repository root: python3 assets-src/breath/land/make-slabface.py
from PIL import Image

im = Image.open('public/assets/breath/mat/slab.jpg').convert('RGB')
w, h = im.size
im.crop((int(w * 0.1), int(h * 0.2), int(w * 0.72), int(h * 0.84))).resize((1024, 512), Image.LANCZOS).save('public/assets/breath/land/slabface.jpg', quality=90)
