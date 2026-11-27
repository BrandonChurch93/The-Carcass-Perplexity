# The far wall of the shot at the lake's edge (eye-03)

## `public/assets/eye/mat/far-edge2.jpg`

Made by: the image model behind `generate_image` (default model, through Perplexity; the tool does not name it), seven pictures, then `prepare.py`, `stitch.py`, `extend.py` and `plate.py` in this folder on Python 3 with OpenCV 5.1, Pillow and NumPy.

From: the approved picture `references/approved/6-eye/eye-3-the-edge-where-the-floor-stops.jpg`, its top 560 rows, which hold the far wall. The wall of the place in this shot is that wall itself, made out finer and carried on, not a new one: same skyline, same caves, same light.

1. `python3 assets-src/eye/far-edge/prepare.py base` lays those rows, scaled to 1536 across, at the foot of a grey canvas of 1536 by 1024. The model fills the grey over it with the top of the cliffs and the sky (prompt A): `base-t1.jpg`.
2. `prepare.py windows` cuts four windows of 585 by 390 from it (rows 290 to 680, at x 0, 317, 634, 951) and enlarges each to 1536 by 1024. The model renders each again at that size with true fine detail (prompt B): `w0-t1.jpg` to `w3-t1.jpg`.
3. `stitch.py` lays each on the window it came from (ECC, affine; they sat within 3 pixels), takes its colours back to the window at low frequency and joins the four with feathered seams: a band of 4033 by 1024.
4. `prepare.py ends` puts the last 614 columns of each end of the band beside grey. The model carries the cliff on into the grey (prompts C and D): `xl-t1.jpg`, `xr-t1.jpg`. `extend.py` lays them on the band by the part they share: 5877 by 1024.
5. `plate.py` takes a quarter of the colour out of the sky (pale evening, not pink) and lays the band out as the level picture the place hangs, from the frame of the approved picture (camera pitched down 13.6 degrees, 40 degrees tall, 16 by 9): 5450 by 962, tan of half the field across 0.85 and up 0.15, horizon at v 0.1. JPEG quality 91.

Prompt or command:

Prompt A (base), as far as I hold it word for word. The middle sentence, after "their natural top:", described the broken skyline with the same light and is not kept in full:

```
Outpaint this photograph upward. The lower half is a photograph of a wide, still lake at dusk under a far limestone cliff rim; the upper half is blank flat grey and must be filled in. Continue the cliffs upward only as far as their natural top: [the skyline, not kept word for word]. Above the skyline a clear, pale evening sky: cream-white at the left near the low sun, turning pale grey-blue to the right, no clouds, no sun disc, no stars. Leave the lower half exactly as it is [...]. Photograph, natural light, no text, no people, no animals, no border.
```

Prompt B (each of the four windows):

```
This is an enlarged crop of a photograph: a far limestone cliff rim above a still lake at dusk, under a clear sky. Render the same view again at full resolution, as a sharp telephoto photograph. Keep every shape exactly where it is: the skyline, each ledge, buttress, cave, overhang, slope and shadow, the colours, the low warm sunlight on the upper ledges and the cool grey-blue shade in the recesses. Add only true fine detail: limestone strata, cracks, ledges, fallen blocks, scree, thin dry scrub on the slopes. The cliff stands clear down to the waterline with only a faint thin mist at its foot. The sky stays smooth and empty, the same colours as given. No text, no people, no animals, no border.
```

Prompt C (left end) and D (right end), the same but for the side and the one sentence after "into the grey:":

```
Outpaint this photograph to the left. The right part is a sharp telephoto photograph of a far limestone cliff rim above a still lake at dusk under a clear pale sky; the left part is blank flat grey and must be filled in. Continue the same scene sideways into the grey: the cliff rim runs on to the left as a lower broken limestone wall with ledges and a scree slope at its foot, lit warm gold by the low sun, the sky a little brighter and creamier toward the left edge. Keep the same height of skyline, the same level waterline at the same row, the same thin mist at the foot of the cliff, the same low warm sunlight on the upper ledges and cool grey-blue shade in the recesses, the same fine detail of strata, cracks, scree and thin dry scrub. The sky continues smooth and empty with the same colours, no clouds, no sun disc. Leave the given photograph part exactly as it is, with no visible seam. Photograph, natural light, no text, no people, no animals, no buildings, no border.
```

```
D, to the right: the tall overhanging cliff with its dark caves runs on to the right as a high limestone wall in cool shade, with strata, dark vertical stains and a few sunlit ledges at its top.
```

Takes: 7 pictures, 1 take of each, each kept.

Why this one: the picture hung before (`far-edge.jpg`) was another rim, a thin low band under a pink sky, and the key frame 8761 stood away from its approved picture: there the wall fills the top sixth of the frame with a broken sunlit skyline just under the top edge. This is that wall, fine enough for a frame of 3840 across (3206 pixels to a tangent of 1), and wide enough that the turn of the shot never reaches its end.

Date: 2026-11-27
