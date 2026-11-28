# The Breath, land: pictures made for the ground owner's folder

## public/assets/breath/land/slabface.jpg

The middle of the working picture of a fallen slab (`public/assets/breath/mat/slab.jpg`, made by the Builder: see
`assets-src/breath/mat/RECIPE.md`), cropped to where it is all rock, 1024 by 512. It is laid on the faces of the fallen blocks of the part
`slabs`, mirrored at each repeat, 5.5 m a repeat, and gives them their breaks and beds as tone. Nothing was generated for it.

Made by: `python3 assets-src/breath/land/make-slabface.py` from the repository root.

The two data modules of this folder (`src/places/breath/land/plate.ts`, `wallplate.ts`) are made by `make-plate.py` and `make-wall.py`
here from the reliefs of the shelf plate and the shaft wall; they are source, not public assets.

## `public/assets/breath/land/crust.jpg` and `public/assets/breath/land/crust-nh.png`

The travertine crust of the ground within ten metres of a lens, a repeating tile of 1024 px: colour (sRGB), and in the data picture slope on x and y in red and green (0.5 is level) with height in blue (linear).

Made by: the image model behind `generate_image` (its default model, through Perplexity), then `assets-src/breath/land/make-ground.py` on the Python of `/home/user/bpyenv` with numpy and pillow.
From: `assets-src/breath/land/src/crust.jpg`, the generated sheet, kept as a JPEG of quality 95. Picture passed to the model with the prompt: `references/approved/3-breath/breath-2-the-rim.jpg`.
Prompt or command: the prompt below, then `/home/user/bpyenv/bin/python assets-src/breath/land/make-ground.py` from the repository root (it writes both tiles and both data pictures).

```
A material texture photographed straight down from directly above, orthographic: a flat patch about 2 metres across of pale fractured travertine crust at the rim of a hot spring vent. Cream, bone-white and pale grey mineral crust broken into irregular thin plates and layered flakes with chipped edges, narrow dark cracks between the plates filled with coarse grit, small rounded pebbles and sharp gravel scattered across it, a few low rimstone lips and pitted pores, faint rust-brown and dull red mineral stain in some cracks. Dry on the high plates, damp and darker in the lows. Flat, even, shadowless overcast light so that no side is brighter than another, no cast shadows. The surface fills the whole frame edge to edge at one uniform scale as a seamless tileable texture. The reference image is the place this material belongs to: take the colour and character of its pale rocky ground from it and nothing of its composition. Photographic, real grain and micro detail, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals, no plants.
```

Takes: 1 made, take 1 kept. The data picture was computed twice by the script: the second time the height is taken from the broad forms of the picture, because height at the scale of a pixel read as dark grain under the low sun.
Why this one: the shelf plate is ten times too coarse at the lens, and this gives the near ground fractured plates with real relief.
Date: 2026-11-26

## `public/assets/breath/land/gravel.jpg` and `public/assets/breath/land/gravel-nh.png`

The loose scree and shingle of the near ground, a repeating tile of 1024 px: colour (sRGB), and in the data picture slope on x and y in red and green (0.5 is level) with height in blue (linear).

Made by: the image model behind `generate_image` (its default model, through Perplexity), then `assets-src/breath/land/make-ground.py` on the Python of `/home/user/bpyenv` with numpy and pillow.
From: `assets-src/breath/land/src/gravel.jpg`, the generated sheet, kept as a JPEG of quality 95. Picture passed to the model with the prompt: `references/approved/3-breath/breath-2-the-rim.jpg`.
Prompt or command: the prompt below, then `/home/user/bpyenv/bin/python assets-src/breath/land/make-ground.py` from the repository root (it writes both tiles and both data pictures).

```
A material texture photographed straight down from directly above, orthographic: a patch about 1.2 metres across of loose scree and gravel lying on pale travertine rock: angular broken chips of cream and grey limestone from thumb-nail to fist size, a few larger flat shards, coarse sand and grit between them, pale mineral dust, some pieces stained rust-brown. Packed densely, every stone distinct with crisp edges. Flat, even, shadowless overcast light so that no side is brighter than another, no cast shadows. The surface fills the whole frame edge to edge at one uniform scale as a seamless tileable texture. The reference image is the place this material belongs to: take the colour and character of its pale rocky ground from it and nothing of its composition. Photographic, real grain and micro detail, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals, no plants.
```

Takes: 1 made, take 1 kept. The data picture was computed twice by the script: the second time the height is taken from the broad forms of the picture, because height at the scale of a pixel read as dark grain under the low sun.
Why this one: the shingle and grit of the near ground, each stone distinct, where the plate had only soft blots.
Date: 2026-11-26

## `public/assets/breath/land/ribskin-n.jpg` and `public/assets/breath/land/ribskin-m.jpg`

The sculpted skin of a rib of the main shaft, 2048 by 512 each, unwrapped along the rib (32 m to a repeat) and once round it with no mirror, closing on itself both ways. `ribskin-n.jpg`: the lean of the skin along and round the rib in red and green, the baked occlusion in blue. `ribskin-m.jpg`: height in red, where the rust runs in green, the hollows in blue. The same height, coarse (256 by 64), is the data module `src/places/breath/land/ribrelief.ts`, which shapes the mesh. No colour is stored: the hoops' shader makes it.

Made by: `assets-src/breath/land/rib_bake.py` (numpy for the sculpt, Blender 5.0.1 as `bpy` with Cycles on the CPU for the occlusion, baked from the sculpted rib itself), then `assets-src/breath/land/rib_pack.py` (numpy, pillow).
From: nothing but the two scripts; no picture, no model, no download.
Prompt or command: `THREADS=4 AO_SAMPLES=16 /home/user/bpyenv/bin/python assets-src/breath/land/rib_bake.py 7 rib-a`, then `python3 assets-src/breath/land/rib_pack.py rib-a`, both from the repository root.
Takes: 1 made (seed 7), take 1 kept.
Why this one: the hoops were banded tubes whose beds came from a generated sheet laid mirrored; this is one skin made for the rib's own shape, with plates, cracks, breaks across it and cords under its belly, and an occlusion that knows them.
Date: 2026-11-27
