# Recipes of the crust walkers' skins (heart_life_builder)

Text only. The scripts and the committed inputs are enough to make every file below a second time.

## `public/assets/heart/mat/limb.jpg` and `public/assets/heart/mat/limb-nh.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/heart/make-skins.py` on Python 3 with numpy and Pillow.
From: `assets-src/heart/gen/limb.jpg`, the generated picture. Picture passed to the model with the prompt: `references/approved/2-heart/heart-3-crust-walkers-feeding-at-a-seam.jpg`.
Prompt or command: the prompt below, then `/home/user/bpyenv/bin/python assets-src/heart/make-skins.py`.

```
A material texture, seen straight on in an orthographic view: a 3 metre tall strip of the dried hide on the stilt leg of a huge desiccated animal, like mummified sinew and old driftwood bark. Hundreds of fine fibres and thin cords run exactly vertically, with cracks between them and flakes peeling. Colours: charcoal brown, umber, ash grey, bone tan. Flat even light, no shadow, no object, no edge: the texture fills the whole picture and can tile.
```

Takes: 1 made, take 1 kept.
Why this one: fine dry cords that run along a limb, dark and matt, with cracks and flakes at the size of a pixel at 3840 wide.
Date: 2026-11-26

## `public/assets/heart/mat/torso.jpg` and `public/assets/heart/mat/torso-nh.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/heart/make-skins.py` on Python 3 with numpy and Pillow.
From: `assets-src/heart/gen/torso.jpg`, the generated picture. Picture passed to the model with the prompt: `references/approved/2-heart/heart-3-crust-walkers-feeding-at-a-seam.jpg`.
Prompt or command: the prompt below, then `/home/user/bpyenv/bin/python assets-src/heart/make-skins.py`.

```
A material texture, seen straight on in an orthographic view: a 4 metre wide area of the dried, shrunken hide on the body of a huge desiccated animal, like a mummified carcass. Leathery skin drawn tight in hard wrinkles and deep folds, cracked into irregular plates, peeling in thin curled flakes, ash caked on the plates and near-black soot in the cracks. Flat even light, no shadow, no object, no edge: the texture fills the whole picture and can tile.
```

Takes: 1 made, take 1 kept.
Why this one: cracked plates and curled flakes with soot in the cracks, for the bald patches of the trunk and the plates on the legs.
Date: 2026-11-26

## What the script does

`make-skins.py` reads the two pictures of `assets-src/heart/gen/`, makes each tile on both axes by a cross-fade over its own half-turned copy, writes the colour as JPEG, and from the picture's lightness makes a height and the two slopes of it, written as the second JPEG (slopes in red and green, height in blue).
