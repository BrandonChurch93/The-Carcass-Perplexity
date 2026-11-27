# Recipes of the Ribs: land

The material pictures of the land. Each began as one generated picture of a flat surface seen straight on under even light. The script makes each one tile and writes a colour picture and a data picture (slope x, slope y, height) from it.

Made by: the image model of Perplexity's `generate_image` (default model), then `assets-src/ribs/land/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
Command: `node assets-src/ribs/land/make-materials.mjs`. No picture was passed to the model with a prompt.
Date: 2026-11-25

The rock, weed, sand and boulder pictures that stood here are retired: the land now reads the Builder's pictures under `public/assets/ribs/mat/` (bone, ledge, weed, flat, rock; recipe in `assets-src/ribs/mat/RECIPE.md`). Only the shingle below is still this folder's own. The fin sheet (`fin.jpg`, `fin-nh.png`) is retired too (2026-11-27): the blades are drawn from `tusk.jpg`, and `make-sheets.py` no longer writes it.

## `public/assets/ribs/land/shingle.jpg` and `public/assets/ribs/land/shingle-nh.jpg`

From: `assets-src/ribs/land/shingle-take1.jpg`. Takes: 1 made, take 1 kept. The floor of the strait.

Prompt: "A seamless, tileable texture photograph taken straight down from above (orthographic, top-down): a wet shingle beach at low tide filling the whole frame edge to edge. Densely packed rounded pebbles and cobbles of unlike size, from 1 to 12 centimetres, in dark slate grey, blue-grey, charcoal and a few pale stones, all wet and glistening, with coarse dark wet sand and grit between them, a few broken shells and scraps of dark brown seaweed. About 2 metres across, so every pebble is sharp. Flat even overcast light, no cast shadows from outside the frame, no horizon, no feet, no people. Real photography, natural restrained colour, no sharpening."

Recipe: `node assets-src/ribs/land/make-materials.mjs` makes `shingle.jpg` (seam folded, levelled) and `shingle-nh.jpg` (slope and height from luminance). The wide variation over it is `mat/flat.jpg`.

## `public/assets/ribs/land/tusk.jpg` and `public/assets/ribs/land/tusk-nh.jpg`

Made by: the image model of Perplexity's `generate_image` (default model), then `assets-src/ribs/land/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/land/tusk-take1.jpg` (the take as the model gave it, kept as JPEG quality 93), with `out/work/ap0-right.jpg` (the right half of `references/approved/1-ribs/ribs-0-establishing.jpg`)` passed to the model as a reference picture.
Prompt: "A seamless, tileable texture photograph taken straight on (orthographic, flat, filling the whole frame edge to edge) of the surface of the great pale stone blades in the reference image: hard weathered ivory-grey limestone, smooth in the large, covered in fine angular hairline cracks, shallow spalled facets with crisp edges, and long faint parallel striations and thin seams running from left to right along the whole frame. Tone varies gently from warm cream to cold pale grey; a few thin darker seams. About 8 metres across, so every crack is sharp. Flat even overcast light, no cast shadows, no lichen, no orange, no white streaks, no moss, no horizon, no sky, no objects, no birds. Real photography, natural restrained colour, no sharpening."
Command: `node assets-src/ribs/land/make-materials.mjs`. It makes `tusk.jpg` (seam folded, levelled, 1536 by 1024) and `tusk-nh.jpg` (slope x, slope y and height from luminance). The stone of every great blade (`TUSK_FRAGMENT` in `src/places/ribs/land/fin.ts`).
Takes: 1 made, take 1 kept.
Why this one: pale ivory-grey stone with hairline cracks, crisp spalled facets and seams that run one way, which the blades lay along their sweep; it carries no lichen and no light of its own.
Date: 2026-11-27

## `public/assets/ribs/land/strata.jpg` and `public/assets/ribs/land/strata-nh.jpg`

Made by: the image model of Perplexity's `generate_image` (default model), then `assets-src/ribs/land/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/land/strata-take1.jpg` (the take as the model gave it, kept as JPEG quality 93), with `references/approved/1-ribs/ribs-3-the-colony.jpg` passed to the model as a reference picture.
Prompt: "A seamless, tileable texture photograph taken straight on (orthographic, flat, filling the whole frame edge to edge) of a dry sea-cliff rock face like the grey rock of the reference image: thin level beds of hard grey stone, 10 to 40 centimetres thick, of unlike thickness, each broken by upright joints into blocks, with small ledges, chipped corners, pits and hairline cracks. Cold mid grey to pale grey, dry and matt, a little brown staining in the seams. About 5 metres across, so every crack and pit is sharp. Flat even overcast light, no cast shadows, no lichen, no orange, no white streaks, no weed, no animals, no sky, no horizon. Real photography, natural restrained colour, no sharpening."
Command: `node assets-src/ribs/land/make-materials.mjs`. It makes `strata.jpg` (seam folded, levelled, 1536 by 864) and `strata-nh.jpg` (slope x, slope y and height from luminance). The bedded rock of the colony crag.
Takes: 1 made, take 1 kept.
Why this one: thin level beds broken by upright joints, dry and grey, sharp at 5 metres across: the rock of the colony's ledges in the approved picture.
Date: 2026-11-27

## `public/assets/ribs/land/lichen.jpg`

Made by: the image model of Perplexity's `generate_image` (default model), then `assets-src/ribs/land/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/land/lichen-take1.jpg` (the take as the model gave it, kept as JPEG quality 93), with `references/approved/1-ribs/ribs-3-the-colony.jpg` passed to the model as a reference picture.
Prompt: "A seamless, tileable texture photograph taken straight on (orthographic, flat, filling the whole frame edge to edge) of crustose lichen on pale grey rock, like the orange lichen of the reference image: irregular patches and rosettes of rust orange and ochre yellow lichen, from a hand to an arm across, with ragged lobed edges, crusty and matt, covering about half of the pale grey stone, bare cracked stone between the patches. About 3 metres across, so every crust is sharp. Flat even overcast light, no cast shadows, no weed, no white streaks, no animals, no sky, no horizon. Real photography, natural restrained colour, no sharpening."
Command: `node assets-src/ribs/land/make-materials.mjs`. It makes `lichen.jpg` (seam folded, levelled, 1536 by 1024), colour only.
Takes: 1 made, take 1 kept.
Why this one: ragged rust and ochre crusts on pale stone with bare stone between: its crusts cut the edge of every lichen patch on the blades and the crag.
Date: 2026-11-27

## `public/assets/ribs/land/materials.json`

Made by: `assets-src/ribs/land/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: the takes kept in `assets-src/ribs/land/` (`shingle-take1.jpg`, `tusk-take1.jpg`, `strata-take1.jpg`, `lichen-take1.jpg`).
Prompt or command: `node assets-src/ribs/land/make-materials.mjs`. It writes the colour and data pictures of each material and this list of them, with the mean colour of each.

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
