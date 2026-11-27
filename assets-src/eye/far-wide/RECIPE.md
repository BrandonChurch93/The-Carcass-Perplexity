# The far rim of the wide shot (eye-01), carried on at its right end

## `public/assets/eye/mat/far-wide.jpg`

Made by: the image model behind `generate_image` (default model, through Perplexity; the tool does not name it), one picture, then `prepare.py` and `extend.py` in this folder on Python 3 with OpenCV 5.1, Pillow and NumPy.

From: `public/assets/eye/mat/far.jpg` (3344 by 1882), the picture the wide shot hung before. It is that picture itself, not a new one: every one of its columns stands as it stood, and 900 columns are added on each side.

1. `python3 assets-src/eye/far-wide/prepare.py` lays the last 1838 columns of `far.jpg`, scaled to 1000 by 1024, at the left of a grey canvas of 1536 by 1024. The model carries the cliff on into the grey (prompt below): `xr-t1.jpg`.
2. `python3 assets-src/eye/far-wide/extend.py` lays that picture on the part it shares with `far.jpg` (ECC, affine; it sat within half a pixel), takes its colours to the picture's, enlarges it to the picture's scale and joins the two with a feathered seam 420 columns wide inside the shared part. The 900 columns on the left are the picture's own first 900 turned over: the lens of the shot never comes there. 5144 by 1882, tan of half the field across 0.647 times 5144 / 3344, JPEG quality 90.

Prompt or command:

```
Outpaint this photograph to the right. The left part is a sharp photograph of a limestone cliff rim with a great overhanging cave above a still dark blue lake at dusk under a clear sky; the right part is blank flat grey and must be filled in. Continue the same scene sideways into the grey: the roof of the great overhang comes down to a massive limestone buttress that closes the cave, and beyond it the cliff runs on to the right as a high plain limestone wall in cool shade, with strata, dark vertical stains, a scree slope at its foot and a few sunlit ledges at its top, its skyline rising a little toward the right edge. Keep the same level waterline at the same row, the same thin mist at the foot of the cliff, the same still water below with the mirror image of the new cliff in it, dark blue and soft. The sky continues smooth and empty with the same clear blue, no clouds, no sun disc. Leave the given photograph part exactly as it is, with no visible seam. Photograph, natural light, no text, no people, no animals, no border.
```

Takes: 1 picture, 1 take, kept.

Why this one: the place carries the picture on past its side edges turned over, and at frame 8305 the lens passes the right edge of `far.jpg`, so the pillar of the great cave stood beside its own mirror image with a seam down the cliff. Now the cave is closed by a buttress and the wall runs on, and the turn of the shot never reaches the end of the picture.

Date: 2026-11-27
