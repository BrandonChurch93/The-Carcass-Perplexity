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

## `public/assets/breath/land/travface.jpg` and `public/assets/breath/land/travface-h.png`

The broken bedded face of a hoop of the main shaft: colour (sRGB), 1536 by 1024, and its height in one channel (pale beds stand out, dark recesses lie back). It is laid on the face of every hoop 6 m wide and 4 m tall by metres along the hoop and metres over its middle, mirrored at each repeat, and on a broken end by metres from the axis. The same height, made coarse (96 by 64), is the data module `src/places/breath/land/hoopbeds.ts`, which steps the mesh of the hoop in and out, so that a ledge of the mesh is a pale bed of the picture.

Made by: the image model behind `generate_image` (its default model, through Perplexity), then `assets-src/breath/land/make-hoop.py` on the system Python 3 with numpy, pillow and scipy.
From: `assets-src/breath/land/src/travface.jpg`, the generated sheet, kept as a JPEG of quality 95. Picture passed to the model with the prompt: `references/approved/3-breath/breath-4-down-the-shaft.jpg`.
Prompt or command: the prompt below, then `python3 assets-src/breath/land/make-hoop.py` from the repository root (it writes both sheets, both height pictures and `src/places/breath/land/hoopbeds.ts`).

```
A material texture photographed square on, orthographic: the broken vertical face of a thick bank of travertine, a patch about 2 metres wide: many thin horizontal beds of cream, ivory and bone-white flowstone stacked one on another, each two to eight centimetres thick and none the same, running level from the left edge to the right edge, their edges chipped and snapped so that some beds stand out as small ledges and others are eaten back into dark shadowless recesses; porous pitted layers full of small holes and vugs between denser smooth layers; rust-orange and brown iron stain seeping along some seams and running a little down from them; a trace of grey-green algae in a few damp hollows. Flat, even, shadowless overcast light so that no side is brighter than another, no cast shadows. The surface fills the whole frame edge to edge at one uniform scale as a seamless tileable texture. The reference image is the place this material belongs to: take the colour and character of its pale mineral arches from it and nothing of its composition. Photographic, real grain and micro detail, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals, no plants.
```

Takes: 1 made, take 1 kept.
Why this one: the hoops were smooth tubes with beds drawn as a lean of the normal; this gives them real beds on edge, with pits and iron stain, and a height that the mesh and the light both use.
Date: 2026-11-27


## `public/assets/breath/land/travskin.jpg` and `public/assets/breath/land/travskin-h.png`

The outer skin of a hoop of the main shaft: colour (sRGB), 1024 by 1024, and its height in one channel. It is laid on the top and the belly of every hoop and, at part strength, on the stretches of the face where the outer skin is whole, 3.2 m a repeat, mirrored at each repeat.

Made by: the image model behind `generate_image` (its default model, through Perplexity), then `assets-src/breath/land/make-hoop.py` on the system Python 3 with numpy, pillow and scipy.
From: `assets-src/breath/land/src/travskin.jpg`, the generated sheet, kept as a JPEG of quality 95. Picture passed to the model with the prompt: `references/approved/3-breath/breath-4-down-the-shaft.jpg`.
Prompt or command: the prompt below, then `python3 assets-src/breath/land/make-hoop.py` from the repository root (it writes both sheets, both height pictures and `src/places/breath/land/hoopbeds.ts`).

```
A material texture photographed straight down from directly above, orthographic: a patch about 2.5 metres across of the outer skin of a massive old travertine flowstone bank: smooth pale ivory and cream mineral with a dull wet sheen, laid down in thin overlapping skins whose edges show as fine wandering contour lines and low rimstone lips, pitted with clusters of small solution holes, crossed by a few hairline cracks, here and there a shallow scar where a flake of the outer skin has come off and rougher chalky layers show under it; marbled with rust-orange and brown iron stain in broad soft patches with darker hearts and thin veins. Flat, even, shadowless overcast light so that no side is brighter than another, no cast shadows. The surface fills the whole frame edge to edge at one uniform scale as a seamless tileable texture. The reference image is the place this material belongs to: take the colour and character of its pale mineral arches from it and nothing of its composition. Photographic, real grain and micro detail, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals, no plants.
```

Takes: 1 made, take 1 kept.
Why this one: the top of a hoop is flowstone skin, not broken beds: rimstone lips, solution pits and marbled rust at the scale of a hand.
Date: 2026-11-27
