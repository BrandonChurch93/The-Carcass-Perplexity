# The land of the Spine: pictures

Besides its own sheets below, the land's rock, snow and canal wall come from the material pictures of the place under `public/assets/spine/mat/`
(`spire`, `rubble`, `snow`, `canal`, each with its `-nh.png`), whose recipes are in `assets-src/spine/mat/RECIPE.md`.

The copies of the Heart's maps that stood here until version 2 (`cliff` and `boulder`) are deleted: they were volcanic rock and did not belong to this place.

## `public/assets/spine/land/granite.jpg` and `public/assets/spine/land/granite-nh.jpg`

Made by: the image tool of Perplexity Computer (`generate_image`, its default model), then `assets-src/spine/land/make-tiles.py` on Python 3.11 with numpy 1.26.4 and Pillow 13.0.0.
From: `assets-src/spine/land/gen/granite-t1.jpg`, the generated picture. Picture passed to the model with the prompt: `references/approved/5-spine/spine-0-establishing.jpg`.
Prompt or command: the prompt below, then `/home/user/bpyenv/bin/python assets-src/spine/land/make-tiles.py`.

```
Seamless tiling material texture, orthographic straight-on view of a sheer alpine granite cliff face: tall continuous fractured slabs split by deep vertical joints, warm tan and ochre stone with cooler blue-grey weathered planes, even flat overcast light, no cast shadows, no horizon, no sky, about 12 metres across
```

Takes: 1 made, take 1 kept.
Why this one: the rock of the ground where it stands steep: jointed granite, 15 m by 10 m.
Date: 2026-11-26

## `public/assets/spine/land/snowpack.jpg` and `public/assets/spine/land/snowpack-nh.jpg`

Made by: the image tool of Perplexity Computer (`generate_image`, its default model), then `assets-src/spine/land/make-tiles.py` on Python 3.11 with numpy 1.26.4 and Pillow 13.0.0.
From: `assets-src/spine/land/gen/snow-t1.jpg`, the generated picture. Picture passed to the model with the prompt: `references/approved/5-spine/spine-0-establishing.jpg`.
Prompt or command: the prompt below, then `/home/user/bpyenv/bin/python assets-src/spine/land/make-tiles.py`.

```
Seamless tiling material texture, top-down view of wind-packed alpine snow with sastrugi, matte, fine grain, even flat overcast light, no shadows, no horizon, about 6 metres across
```

Takes: 1 made, take 1 kept.
Why this one: the wind-packed snow of the ridge, laid at two sizes across the gale.
Date: 2026-11-26

## `public/assets/spine/land/outcrop.jpg` and `public/assets/spine/land/outcrop-nh.jpg`

Made by: the image tool of Perplexity Computer (`generate_image`, its default model), then `assets-src/spine/land/make-tiles.py` on Python 3.11 with numpy 1.26.4 and Pillow 13.0.0.
From: `assets-src/spine/land/gen/outcrop-t1.jpg`, the generated picture. Picture passed to the model with the prompt: `references/approved/5-spine/spine-0-establishing.jpg`.
Prompt or command: the prompt below, then `/home/user/bpyenv/bin/python assets-src/spine/land/make-tiles.py`.

```
Seamless tiling material texture, top-down view of dark frost-shattered granite bedrock breaking through thin snow, even flat overcast light, no shadows, no horizon, about 8 metres across
```

Takes: 1 made, take 1 kept.
Why this one: the bedrock that breaks through the snow where the ground lies level, 8 m.
Date: 2026-11-26

## `public/assets/spine/land/rimeface.jpg` and `public/assets/spine/land/rimeface-nh.jpg`

Made by: the image tool of Perplexity Computer (`generate_image`, its default model), then `assets-src/spine/land/make-tiles.py` on Python 3.11 with numpy 1.26.4 and Pillow 13.0.0.
From: `assets-src/spine/land/gen/rime-t1.jpg`, the generated picture. Picture passed to the model with the prompt: `references/approved/5-spine/spine-0-establishing.jpg`.
Prompt or command: the prompt below, then `/home/user/bpyenv/bin/python assets-src/spine/land/make-tiles.py`.

```
Seamless tiling material texture, straight-on view of rime ice on rock: feathery white frost plumes on dark grey-brown granite, even flat light, no shadows, about 3 metres across
```

Takes: 1 made, take 1 kept.
Why this one: the frost on the steep rock of the ground that looks into the gale.
Date: 2026-11-26

## `public/assets/spine/land/hero-n.jpg`

Made by: `assets-src/spine/land/bake-hero.mts`, run with vite-node 6.0.0 on Node 20.20.2, written out with the repo's own sharp. Computed: no picture and no model is behind it.
From: nothing but the layout of the first spire (`src/places/spine/ridge.ts`, read through `src/places/spine/land/heroShape.ts`) and the fracture model in the script, seeded 7015.
Prompt or command: `npx vite-node assets-src/spine/land/bake-hero.mts 4096 2048` from the repo's root. The same run writes `hero-m.jpg`, `hero-id.png` and `src/places/spine/land/heroRelief.ts`.
Takes: 1 kept (the script is the take: change it and run it again).
Why this one: the tangent normals of the first spire's rock, 4096 by 2048 round the blade and up it: tall plates that run the whole lean, cut by rare cross joints into slabs, split again into strips with stepped faces. The mesh is displaced by the same model, so the light and the outline agree.
Date: 2026-11-26

## `public/assets/spine/land/hero-m.jpg`

Made by: `assets-src/spine/land/bake-hero.mts`, as `hero-n.jpg` above. Computed.
From: the same fracture model.
Prompt or command: `npx vite-node assets-src/spine/land/bake-hero.mts 4096 2048`.
Takes: 1 kept.
Why this one: red is the occlusion of the rock (how far a texel lies under the mean of the rock about it, at 0.6, 2.5 and 9 m), green is how far it stands out of its neighbour to windward (where the rime grows), blue is the tone of its slab (grey to split tan).
Date: 2026-11-26

## `public/assets/spine/land/hero-id.png`

Made by: `assets-src/spine/land/bake-hero.mts`, as `hero-n.jpg` above. Computed.
From: the same fracture model.
Prompt or command: `npx vite-node assets-src/spine/land/bake-hero.mts 4096 2048`.
Takes: 1 kept.
Why this one: which slab a texel is on, one byte, read without filtering: each slab takes its own piece of the granite sheet, so no joint of the sheet runs on across a split.
Date: 2026-11-26
