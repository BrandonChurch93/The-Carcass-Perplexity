# Material pictures of the Blood Marsh

The material pictures and the sky picture of the Blood Marsh, made by the Builder on 2026-11-25 for every owner of the place to read. Each began as one generated picture: a flat surface seen straight on under even light, 1254 px square, or a sky, 1536 x 1024. `assets-src/materials/make-materials.mjs` makes each surface tile and writes a colour picture and a data picture from it, by the method of the Heart's materials. The list and every prompt are in `assets-src/materials/spec.py`.

How to read them: the colour picture is sRGB. In the data picture red and green are the slope on x and y (0.5 is level) and blue is height. `metres` in `materials.json` is the real width one repeat stands for. A face with beds or courses (`ledge`, `strata`, `cliff`, `canal`, `bark`, `hoop`) repeats well from left to right; lay its height once or break the repeat. Blend two scales of a tile and break it with the place's own large shapes so no repeat shows. These pictures carry no light: the place's rig lights them.

## `public/assets/marsh/mat/crust.jpg` and `public/assets/marsh/mat/crust-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/crust.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-0-establishing.jpg`, `references/drafts/working/real/plate-porcelain-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
A material texture, seen straight down from above in an orthographic view: a salt flat, about 5 metres across. A crust of dirty white and pale grey salt broken into uneven polygonal plates with raised crumbling rims and a rough crystalline surface, stained pink and rust-red along the cracks and in the hollows where red brine has dried. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the flats between the channels.
Date: 2026-11-25

## `public/assets/marsh/mat/mud.jpg` and `public/assets/marsh/mat/mud-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/mud.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-1-the-bubbling-seep-pool.jpg`, `references/drafts/working/real/plate-porcelain-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
A material texture, seen straight down from above in an orthographic view: the wet margin of a pool of blood-red brine, about 2 metres across. Slick dark red-brown mud, glistening, with paler drying patches, clusters of white salt crystals and crusted froth, small bubble holes and thin dark red films. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the banks of the brine and the wallows.
Date: 2026-11-25

## `public/assets/marsh/mat/rock.jpg` and `public/assets/marsh/mat/rock-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/rock.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-0-establishing.jpg`, `references/drafts/working/real/plate-porcelain-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
A material texture, seen straight down from above in an orthographic view: weathered pale rock on a salt flat, about 4 metres across. Pale grey and cream stone, rounded, with a rough pitted surface, cracks, a thin crust of white salt in the hollows, and rust-red and pink stains where red water has run and dried. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the near rock of the establishing picture, which the frames draw as smooth cracked clay.
Date: 2026-11-25

## `public/assets/marsh/mat/hide.jpg` and `public/assets/marsh/mat/hide-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/hide.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-3-mud-wallowers.jpg`, `references/drafts/working/real/ref-hide-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
A material texture, seen straight on: the hide of a huge heavy wallowing animal, about 1 metre across. Thick grey-brown skin in deep folds and coarse wrinkles, with sparse short bristles, caked with drying red-brown mud that is cracking, and a pale dusting of salt on the high folds. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the wallowers, seen close in their detail.
Date: 2026-11-25

## `public/assets/marsh/mat/bark.jpg` and `public/assets/marsh/mat/bark-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/bark.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-2-the-stalk-colony.jpg`, `references/drafts/working/real/plate-forest-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
A material texture, seen square on in an orthographic view: the stem of a tall pale stalk plant, unrolled flat, a section about 1 metre tall. Pale cream and bone-white fibrous sheaths in overlapping rings, each ring with a ragged dry brown lower edge, fine vertical fibres, and pink-red stain in the joints. The rings run exactly horizontal. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the stems of the stalk colony.
Date: 2026-11-25

## `public/assets/marsh/mat/rime.jpg` and `public/assets/marsh/mat/rime-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/rime.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-4-the-one-on-the-thin-crust.jpg`, `references/drafts/working/real/plate-porcelain-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
A material texture, seen straight on: a thick crust of salt crystals grown over the hide of a dead animal, about 0.5 metres across. Lumpy white and pale grey crystals like hoar frost and coarse sugar, in clumps with small cavities, with dirty pink-brown stain in the hollows. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the salt on the one the crust caught, and on the old carcasses.
Date: 2026-11-25

## `public/assets/marsh/mat/sky.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/sky.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-0-establishing.jpg`, `references/drafts/working/real/plate-flats-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
A photograph of the sky only, under a flat white overcast in daylight. Bright heavy cloud, very pale grey-white with barely visible darker bellies, and in the middle distance one soft grey shaft of falling rain, slightly slanted, fading out before it reaches the bottom of the frame. The bottom edge of the frame lies just above the horizon and the top edge is high overhead: only sky and cloud, no land, no sea, no rocks, no mountains, no birds, no sun disc. The first reference image is the place this sky belongs to: take its cloud forms, its colour and its light from there. The second reference image is a real photograph: it is the standard for how a camera records a real sky, with real soft gradients, real cloud structure and no painted or stylised look. Output one wide landscape image, three units wide and two tall. Photographic, no text, no logo, no people.
```

Takes: 1 made, take 1 kept.
Why this one: the white overcast of the flats with its rain shaft.
Date: 2026-11-25

## `public/assets/marsh/mat/materials.json`

Made by: `assets-src/materials/make-materials.mjs`.
From: the pictures above.
Prompt or command: `node assets-src/materials/make-materials.mjs marsh`.

What it holds: the settings of the script, and for each tile its name, the real width of one repeat in metres and its mean colour in linear light, so a place can tint or blend by number.
Date: 2026-11-25
