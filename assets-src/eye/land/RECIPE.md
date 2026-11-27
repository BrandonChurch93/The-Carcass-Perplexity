# Recipes of the Eye: land

The pictures the Eye's ground loads. Two began as one generated picture each of a flat surface seen straight on under even light; the stone atlases are computed with no picture going in. The same rows stand in `assets-src/eye/ROWS-eye_ground_builder.md`.

## `public/assets/eye/land/rockface.jpg` and `public/assets/eye/land/rockface-nh.jpg`

Made by: the image model of Perplexity's `generate_image` (default model), then `assets-src/eye/land/make_sheets.py` on Python 3 with numpy, Pillow and scipy.
From: `assets-src/eye/land/gen/rockface-1.jpg`. The model was given `references/approved/6-eye/eye-0-establishing.jpg` as its reference picture.
Prompt or command: "Seamless tiling texture sheet, photographed straight on, of the bare surface of a weathered pale grey limestone boulder, about 1.5 metres across, the same stone as the boulders in the reference picture. Fine pitting, hairline cracks, small chips, faint bedding lines, a few pale lichen specks and faint rusty stains. Flat even overcast light, no cast shadows, no highlights, no horizon, no edges of the rock, no objects, the stone fills the whole frame at one uniform scale. Sharp photographic detail everywhere." Then `python3 assets-src/eye/land/make_sheets.py`, which cuts the picture square, makes it tile and writes the colour sheet and its relief (r, g lean; b height).
Takes: 1 made, take 1 kept.
Why this one: the skin of the blocks, the same pale stone as the approved establishing picture, with no baked light.
Date: 2026-11-26

## `public/assets/eye/land/gravel.jpg` and `public/assets/eye/land/gravel-nh.jpg`

Made by: the image model of Perplexity's `generate_image` (default model), then `assets-src/eye/land/make_sheets.py` on Python 3 with numpy, Pillow and scipy.
From: `assets-src/eye/land/gen/gravel-1.jpg`. The model was given `references/approved/6-eye/eye-0-establishing.jpg` as its reference picture.
Prompt or command: "Seamless tiling texture sheet, photographed straight down from above, of dry limestone scree ground about 3 metres across, the same pale grey stone as the gravel bank in the reference picture: angular broken stones from fist size down to coarse gravel and grit, densely packed, a little pale dust between them. Flat even overcast light, no cast shadows, no horizon, no plants, no objects, one uniform scale across the whole frame. Sharp photographic detail everywhere." Then `python3 assets-src/eye/land/make_sheets.py`, which cuts the picture square, makes it tile and writes the colour sheet and its relief.
Takes: 1 made, take 1 kept.
Why this one: the grit of the bank and at the blocks' feet, densely packed and evenly lit, so the film's one light shades it.
Date: 2026-11-26

## `public/assets/eye/land/rocks-n.jpg` and `public/assets/eye/land/rocks-r.png`

Made by: `assets-src/eye/land/make_rocks.py` on Python 3 with numpy and Pillow.
From: no input file: eight broken stones are computed from a fixed seed.
Prompt or command: `python3 assets-src/eye/land/make_rocks.py`. It writes two atlases, four stones across and two down, each stone on an octahedral map: normals in `rocks-n.jpg`; radius, occlusion and edge in `rocks-r.png`.
Takes: 2 made, take 2 kept (the first had too few broken faces).
Why this one: lets the film raise a ball into a broken stone and light it with no unwrapping.
Date: 2026-11-26

## `public/assets/eye/land/outcrop-map.png`, `public/assets/eye/land/outcrop-rock.png` and `public/assets/eye/land/outcrop-mesh.png`

Made by: `assets-src/eye/land/bake-outcrop.ts` on Node with tsx and sharp, from the film's own code. No picture goes in and no model is used.
From: `cropMap()` and `cropMeshData()` in `src/places/eye/land/outcrop.ts`, which read `src/places/eye/land/height.ts`.
Prompt or command: `npx tsx assets-src/eye/land/bake-outcrop.ts`, from the repository root.
Takes: computed; the one result is kept. Run it again after any change to `outcrop.ts` or `height.ts`, or the relief drawn and the ground the stones stand on part company.
Why this one: the relief of the outcrop took ten seconds to work out at the start of every render. The map holds its lie both ways (r, g) and how much sky each place sees (b); the rock picture holds rock or rubble at half the size; the mesh picture holds every corner of the mesh, a texel each, in two tiles side by side (left: height in r and g, standing rock in b; right: the smooth ground's normal in r and g, wet beside the stream in b).
Date: 2026-11-26
