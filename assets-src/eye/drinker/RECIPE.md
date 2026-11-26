# The drinkers' pictures

The two pictures the bodies of the drinkers wear. The body itself is computed (`assets-src/eye/drinker/build_body.py` writes `src/places/eye/drinkers/body.data.ts`) and is no loaded file.

## `public/assets/eye/drinker/hide.png`

Made by: `assets-src/eye/drinker/build_hide.py` on Python 3.11.17 with numpy 2.4.6, scipy 1.17.1 and Pillow 13.0.0, from one picture of the image model behind `generate_image` (through Perplexity; the model's name was not recorded).
From: `assets-src/eye/drinker/hide-take1.png`, the generated picture. No picture was passed to the model with the prompt.
Prompt or command: prompt: "Seamless tileable texture, top-down macro photograph of pale hairless wrinkled animal hide, like the naked skin of an elephant calf or a hairless camel: a dense net of fine cross-hatched wrinkles and creases, pores, a few deeper folds, pale cream beige with pink undertone, faint grey-brown mottled blotches, dust and a few dried mud flecks. Perfectly flat even diffuse light, no cast shadows, no vignette, uniform coverage edge to edge, no objects, no text." Then, from the repo root: `mkdir -p out/work/body && python assets-src/eye/drinker/build_hide.py`
Takes: 1 made, take 1 kept.
Why this one: fine crossed wrinkles and pores under flat light, so it repeats over neck, belly and legs without a seam or a baked shadow; rgb is its colour, alpha its relief.
Date: 2026-11-26

## `public/assets/eye/drinker/coat.jpg`

Made by: `assets-src/eye/drinker/build_coat.py` on Python 3.11.17 with numpy 2.4.6, scipy 1.17.1 and Pillow 13.0.0. No model.
From: `public/assets/eye/mat/drinker-up.jpg` and `public/assets/eye/mat/drinker-up-h.png`, the sheet the picture cards of the drinkers are cut from and its cover (their recipe is in `assets-src/eye/mat/RECIPE.md`), and `out/work/body/side.npy`, the body's outline from the side, which `build_body.py` writes and which is used only for the fit the script prints and a scratch picture, not for the file.
Prompt or command: from the repo root: `python assets-src/eye/drinker/build_body.py && python assets-src/eye/drinker/build_coat.py`
Takes: 1 made, kept.
Why this one: the approved hide of the cards, its ribs and folds, laid on the body from the side; the ground round the animal is filled with the nearest hide so no black shows where the body's outline and the picture's differ.
Date: 2026-11-26
