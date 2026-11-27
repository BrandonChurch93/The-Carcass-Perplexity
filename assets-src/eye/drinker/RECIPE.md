# The drinkers' pictures

The three pictures the bodies of the drinkers wear. The body itself is computed (`assets-src/eye/drinker/build_body.py` writes `src/places/eye/drinkers/body.data.ts`) and is no loaded file.

## `public/assets/eye/drinker/hide.png`

Made by: `assets-src/eye/drinker/build_hide.py` on Python 3.11.17 with numpy 2.4.6, scipy 1.17.1 and Pillow 13.0.0, from one picture of the image model behind `generate_image` (through Perplexity; the model's name was not recorded).
From: `assets-src/eye/drinker/hide-take1.png`, the generated picture. No picture was passed to the model with the prompt.
Prompt or command: prompt: "Seamless tileable texture, top-down macro photograph of pale hairless wrinkled animal hide, like the naked skin of an elephant calf or a hairless camel: a dense net of fine cross-hatched wrinkles and creases, pores, a few deeper folds, pale cream beige with pink undertone, faint grey-brown mottled blotches, dust and a few dried mud flecks. Perfectly flat even diffuse light, no cast shadows, no vignette, uniform coverage edge to edge, no objects, no text." Then, from the repo root: `mkdir -p out/work/body && python assets-src/eye/drinker/build_hide.py`
Takes: 1 made, take 1 kept.
Why this one: fine crossed wrinkles and pores under flat light, so it repeats over neck, belly and legs without a seam or a baked shadow; rgb is its colour, alpha its relief.
Date: 2026-11-26

## `public/assets/eye/drinker/folds.jpg`

Made by: `assets-src/eye/drinker/build_folds.py` on Python 3.11 with numpy, scipy and Pillow, from one picture of the image model behind `generate_image` (through Perplexity, its default model; the model's name is not given to the builder).
From: `assets-src/eye/drinker/hide-broad-take1.png`, the generated picture, 1448 x 1086. The approved picture `references/approved/6-eye/eye-1-drinkers-at-the-shore.jpg` was passed to the model with the prompt, for the hide's tone.
Prompt or command: prompt: "Seamless tileable texture, flat top-down orthographic view of a 1.2 metre wide patch of the bare hide of the pale animal in the reference picture, filling the whole image edge to edge: pale bone-cream hairless skin, slightly pink, lying in a few loose soft sagging folds and long shallow wrinkles, crossed everywhere by a net of fine creases, with old thin dark red-brown scratches and healed pale scars in groups of two and three, grey-brown dirt smears and drip streaks, a little dried mud spatter, faint darker blotches. Perfectly even flat diffuse light, no cast shadows, no highlights, no vignette, uniform tone from edge to edge, no hair, no fur, no objects, no text." Then, from the repo root: `python assets-src/eye/drinker/build_folds.py`
Takes: 1 made, take 1 kept.
Why this one: broad loose folds, scars and dirt smears under flat light at the scale of a whole flank, which the fine sheet has not; each edge is faded into the picture's own middle so it repeats.
Date: 2026-11-26

## `public/assets/eye/drinker/folds-n.png`

Made by: `assets-src/eye/drinker/build_folds.py`, the same run. No model.
From: `public/assets/eye/drinker/folds.jpg` as it stands in the script before it is saved: its tone taken as height, smoothed, the broad drift of the dirt taken off.
Prompt or command: from the repo root: `python assets-src/eye/drinker/build_folds.py`
Takes: 1 made, kept.
Why this one: the slope of the folds along the sheet's two axes (red, green, 0.5 level, 724 x 543), so the shader leans the normal from a read and takes no slope across the screen under a branch, which the software renderer does not repeat.
Date: 2026-11-26
