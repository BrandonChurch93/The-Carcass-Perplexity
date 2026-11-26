# Recipes of the Ribs: land

The material pictures of the land. Each began as one generated picture of a flat surface seen straight on under even light. The script makes each one tile and writes a colour picture and a data picture (slope x, slope y, height) from it.

Made by: the image model of Perplexity's `generate_image` (default model), then `assets-src/ribs/land/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
Command: `node assets-src/ribs/land/make-materials.mjs`. No picture was passed to the model with a prompt.
Date: 2026-11-25

The rock, weed, sand and boulder pictures that stood here are retired: the land now reads the Builder's pictures under `public/assets/ribs/mat/` (bone, ledge, weed, flat, rock; recipe in `assets-src/ribs/mat/RECIPE.md`). Only the shingle below is still this folder's own.

## `public/assets/ribs/land/shingle.jpg` and `public/assets/ribs/land/shingle-nh.jpg`

From: `assets-src/ribs/land/shingle-take1.jpg`. Takes: 1 made, take 1 kept. The floor of the strait.

Prompt: "A seamless, tileable texture photograph taken straight down from above (orthographic, top-down): a wet shingle beach at low tide filling the whole frame edge to edge. Densely packed rounded pebbles and cobbles of unlike size, from 1 to 12 centimetres, in dark slate grey, blue-grey, charcoal and a few pale stones, all wet and glistening, with coarse dark wet sand and grit between them, a few broken shells and scraps of dark brown seaweed. About 2 metres across, so every pebble is sharp. Flat even overcast light, no cast shadows from outside the frame, no horizon, no feet, no people. Real photography, natural restrained colour, no sharpening."

Recipe: `node assets-src/ribs/land/make-materials.mjs` makes `shingle.jpg` (seam folded, levelled) and `shingle-nh.jpg` (slope and height from luminance). The wide variation over it is `mat/flat.jpg`.

## `public/assets/ribs/land/materials.json`

Made by: `assets-src/ribs/land/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: the takes kept in `assets-src/ribs/land/` (`shingle-take1.jpg`).
Prompt or command: `node assets-src/ribs/land/make-materials.mjs`. It writes the colour and data pictures of each material and this list of them, with the mean colour of each.

## public/assets/ribs/land/fin.jpg

The Builder's `public/assets/ribs/mat/blade.jpg` rectified to one upright sheet of a whole blade, 512 by 1536, foot at the bottom: each row
is stretched from the blade's own outline (`mat/blade-a.png`) to the full width, and the broad light above the weed line is flattened to a
mean of 0.56 so that the film's one light shades it. Made by `python3 assets-src/ribs/land/make-sheets.py`.

## public/assets/ribs/land/fin-nh.png

The relief of the same sheet from `mat/blade-h.png`, rectified the same way: red is 0.5 less the rise to the right, green is 0.5 less the
rise downward (both from a copy blurred 3.5 px, as the Builder's reliefs are lit clay more than height), blue is the height with its broad
swell taken out. Made by `python3 assets-src/ribs/land/make-sheets.py`.

## public/assets/ribs/land/plate-nh.png

Slopes and height of `mat/plate-h.png` (the 48 m by 27 m ground plate), 1280 by 720, in the same convention. Made by
`python3 assets-src/ribs/land/make-sheets.py`.

## public/assets/ribs/land/wall-nh.png

Slopes and height of `mat/wall-h.png` (the hanging weed wall), in the same convention. Made by `python3 assets-src/ribs/land/make-sheets.py`.

## public/assets/ribs/land/colony-nh.png

Slopes and height of `mat/colony-h.png` (the stepped roost cliff), 1024 square, in the same convention. Made by
`python3 assets-src/ribs/land/make-sheets.py`.

## public/assets/ribs/land/nearbar-nh.png

Slopes and height of `mat/nearbar-h.png` (the 12 m by 12 m plate of stones, grit and cast weed under the wide lens), 1024 by 1024, in the
same convention as the other plates. Made by `python3 assets-src/ribs/land/make-sheets.py`.

## public/assets/ribs/land/stack-a.jpg

The Builder's `public/assets/ribs/mat/stack-a.jpg` (a 70 m stack hung with weed) drawn out to one upright sheet, 768 by 1536, foot at the
bottom: each row stretched from the stack's own outline (`mat/stack-a-a.png`) to the full width. Made by
`python3 assets-src/ribs/land/make-sheets.py`.

## public/assets/ribs/land/stack-a-nh.png

The relief of the same sheet from `mat/stack-a-h.png`, drawn out the same way, its broad swell taken out: slope x, slope y, height, in
the convention of the other sheets. Made by `python3 assets-src/ribs/land/make-sheets.py`.

## public/assets/ribs/land/stack-b.jpg

The Builder's `public/assets/ribs/mat/stack-b.jpg` (the second stack of the gate) drawn out to one upright sheet, 768 by 1536, like
`stack-a.jpg`. Made by `python3 assets-src/ribs/land/make-sheets.py`.

## public/assets/ribs/land/stack-b-nh.png

The relief of that sheet from `mat/stack-b-h.png`: slope x, slope y, height. Made by `python3 assets-src/ribs/land/make-sheets.py`.
