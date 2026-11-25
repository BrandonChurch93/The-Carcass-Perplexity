# Material pictures of the Eye

The material pictures and the sky picture of the Eye, made by the Builder on 2026-11-25 for every owner of the place to read. Each began as one generated picture: a flat surface seen straight on under even light, 1254 px square, or a sky, 1536 x 1024. `assets-src/materials/make-materials.mjs` makes each surface tile and writes a colour picture and a data picture from it, by the method of the Heart's materials. The list and every prompt are in `assets-src/materials/spec.py`.

How to read them: the colour picture is sRGB. In the data picture red and green are the slope on x and y (0.5 is level) and blue is height. `metres` in `materials.json` is the real width one repeat stands for. A face with beds or courses (`ledge`, `strata`, `cliff`, `canal`, `bark`, `hoop`) repeats well from left to right; lay its height once or break the repeat. Blend two scales of a tile and break it with the place's own large shapes so no repeat shows. These pictures carry no light: the place's rig lights them.

## `public/assets/eye/mat/cliff.jpg` and `public/assets/eye/mat/cliff-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/cliff.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-0-establishing.jpg`, `references/drafts/working/real/plate-crater-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
A material texture, seen square on in an orthographic view: the wall of a great basin of pale rock, a section about 120 metres tall. Massive pale limestone in thick horizontal beds, cream, buff and pale gold, with rounded overhangs, dark shadowed alcoves and shallow caves along some of the beds, vertical black and rust water stains, and steep fans of pale scree at the foot. The beds run exactly horizontal. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the walls of the basin, which the frames draw flat and pale.
Date: 2026-11-25

## `public/assets/eye/mat/mat.jpg` and `public/assets/eye/mat/mat-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/mat.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-2-the-iris-amber-mats.jpg`, `references/drafts/working/real/plate-terrace-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
A material texture, seen straight down from above in an orthographic view: mats of living colour on the bed of a very shallow, perfectly clear lake, about 3 metres across. Long fine filaments in amber, rust orange, ochre and dark red, streaming all one way like combed hair, over pale cream mineral crust that shows through in patches. Seen through still clear water with no ripples and no reflections. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the amber mats of the shallows, which read as wood grain in the frames.
Date: 2026-11-25

## `public/assets/eye/mat/shore.jpg` and `public/assets/eye/mat/shore-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/shore.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-1-drinkers-at-the-shore.jpg`, `references/drafts/working/real/plate-crater-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
A material texture, seen straight down from above in an orthographic view: the dry shore of a mountain lake, about 4 metres across. Pale grey gravel and coarse sand with rounded cobbles and a few larger pale stones, a thin white mineral line and scraps of dry orange mat. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the shore where the drinkers stand.
Date: 2026-11-25

## `public/assets/eye/mat/sinter.jpg` and `public/assets/eye/mat/sinter-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/sinter.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-3-the-edge-where-the-floor-stops.jpg`, `references/drafts/working/real/plate-terrace-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
A material texture, seen straight down from above in an orthographic view: pale mineral crust at the edge of a lake, about 3 metres across. Cream and chalk-white rock built up in thin scalloped layers, knobbly and pitted, with tan and orange stain in the hollows and fine cracks. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the pale lip where the floor of the lake stops.
Date: 2026-11-25

## `public/assets/eye/mat/hide.jpg` and `public/assets/eye/mat/hide-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/hide.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-1-drinkers-at-the-shore.jpg`, `references/drafts/working/real/ref-hide-3.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
A material texture, seen straight on: the hide of a tall lean grazing animal, about 0.6 metres across. Very short dense hair over thin skin, pale tan and sandy fawn, slightly darker along faint ridges where ribs lie beneath, with fine creases, small scars and dust. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the drinkers, which read as bare models.
Date: 2026-11-25

## `public/assets/eye/mat/sky.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/sky.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-0-establishing.jpg`, `references/drafts/working/real/plate-crater-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
A photograph of the sky only, on a clear still evening. A cloudless sky, pale warm gold and peach low down, deepening through soft blue to a deeper blue at the top, with two or three thin wisps of high cirrus that catch pink light. The bottom edge of the frame lies just above the horizon and the top edge is high overhead: only sky and cloud, no land, no sea, no rocks, no mountains, no birds, no sun disc. The first reference image is the place this sky belongs to: take its cloud forms, its colour and its light from there. The second reference image is a real photograph: it is the standard for how a camera records a real sky, with real soft gradients, real cloud structure and no painted or stylised look. Output one wide landscape image, three units wide and two tall. Photographic, no text, no logo, no people.
```

Takes: 1 made, take 1 kept.
Why this one: the clear evening over the lake.
Date: 2026-11-25

## `public/assets/eye/mat/materials.json`

Made by: `assets-src/materials/make-materials.mjs`.
From: the pictures above.
Prompt or command: `node assets-src/materials/make-materials.mjs eye`.

What it holds: the settings of the script, and for each tile its name, the real width of one repeat in metres and its mean colour in linear light, so a place can tint or blend by number.
Date: 2026-11-25
