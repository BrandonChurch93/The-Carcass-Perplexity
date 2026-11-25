# Material pictures of the Breath

The material pictures and the sky picture of the Breath, made by the Builder on 2026-11-25 for every owner of the place to read. Each began as one generated picture: a flat surface seen straight on under even light, 1254 px square, or a sky, 1536 x 1024. `assets-src/materials/make-materials.mjs` makes each surface tile and writes a colour picture and a data picture from it, by the method of the Heart's materials. The list and every prompt are in `assets-src/materials/spec.py`.

How to read them: the colour picture is sRGB. In the data picture red and green are the slope on x and y (0.5 is level) and blue is height. `metres` in `materials.json` is the real width one repeat stands for. A face with beds or courses (`ledge`, `strata`, `cliff`, `canal`, `bark`, `hoop`) repeats well from left to right; lay its height once or break the repeat. Blend two scales of a tile and break it with the place's own large shapes so no repeat shows. These pictures carry no light: the place's rig lights them.

## `public/assets/breath/mat/shelf.jpg` and `public/assets/breath/mat/shelf-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/shelf.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-0-establishing.jpg`, `references/drafts/working/real/plate-porcelain-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
A material texture, seen straight down from above in an orthographic view: a flat shelf of pale rock around hot vents, about 6 metres across. Smooth worn pale grey and cream stone in broad low plates with rounded edges, hairline cracks, low scalloped rims of mineral crust in grey-white and faint pink-tan, damp darker patches and thin rust-brown stain along the cracks. No standing water. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the pavement of the shelf, the largest surface of the place.
Date: 2026-11-25

## `public/assets/breath/mat/strata.jpg` and `public/assets/breath/mat/strata-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/strata.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-2-the-rim.jpg`, `references/drafts/working/real/plate-terrace-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
A material texture, seen square on in an orthographic view: the broken edge of a rock shelf at the rim of a deep pit, a section about 5 metres tall. Thin horizontal layers of pale cream, grey and tan stone, some layers jutting as ledges and some crumbled back, cracked blocks, dark damp seams between the layers and pale mineral drips. The layers run exactly horizontal. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the layered rim of the pit.
Date: 2026-11-25

## `public/assets/breath/mat/hoop.jpg` and `public/assets/breath/mat/hoop-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/hoop.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-4-down-the-shaft.jpg`, `references/drafts/working/real/plate-terrace-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
A material texture, seen square on in an orthographic view: the face of one of the great pale rings that line the wall of a deep natural shaft, a band about 4 metres tall. A dense smooth pale substance between bone and worn limestone, ivory and grey-white, with a faint grain running along the band, scuffs and chipped edges, dark wet streaks and brown mineral stain running down from the top edge, and a thin crust of pale scale. The grain runs exactly horizontal. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the hoops of the shaft, which the detail shows as pale worn bands with wet streaks.
Date: 2026-11-25

## `public/assets/breath/mat/wall.jpg` and `public/assets/breath/mat/wall-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/wall.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-4-down-the-shaft.jpg`, `references/drafts/working/real/plate-tube-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
A material texture, seen square on in an orthographic view: the wall of a deep natural shaft, wet, a section about 6 metres tall. Dark grey-brown rock, rough and ribbed, glistening with seep water, with vertical streaks of black slime and pale mineral and small ledges that hold grit. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the dark wall between the hoops.
Date: 2026-11-25

## `public/assets/breath/mat/cliff.jpg` and `public/assets/breath/mat/cliff-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/cliff.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-0-establishing.jpg`, `references/drafts/working/real/plate-ridge-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
A material texture, seen square on in an orthographic view: the face of a great cliff of pale layered rock, a section about 200 metres tall, seen from far away. Horizontal strata in grey, cream and tan, ledges dusted with snow, dark overhangs and shadowed hollows, small scree fans on the ledges and vertical dark stains. The strata run exactly horizontal. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the far cliff with its cave band and snow.
Date: 2026-11-25

## `public/assets/breath/mat/skin.jpg` and `public/assets/breath/mat/skin-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/skin.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-1-waders-feeding-in-the-channel.jpg`, `references/drafts/working/real/ref-hide-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
A material texture, seen straight on: the skin of a tall thin wading animal, stretched over bone, about 0.6 metres across. Pale pinkish grey and cream skin, thin and slightly translucent, with fine wrinkles, faint blue-grey veins, low ridges where ribs and tendons press through from beneath, small blotches and scars. No hair, no feathers, no scales. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the skin of the waders, alive and dead.
Date: 2026-11-25

## `public/assets/breath/mat/sky.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/sky.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-0-establishing.jpg`, `references/drafts/working/real/plate-norris-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
A photograph of the sky only, soon after sunrise over a field of hot vents, seen through thin fog and steam. A pale warm sky, cream and soft peach on the side nearest the low sun, which is outside the frame beyond the upper left corner, turning to grey-mauve away from it, with thin flat layers of mist and a veil of high haze. The bottom edge of the frame lies just above the horizon and the top edge is high overhead: only sky and cloud, no land, no sea, no rocks, no mountains, no birds, no sun disc. The first reference image is the place this sky belongs to: take its cloud forms, its colour and its light from there. The second reference image is a real photograph: it is the standard for how a camera records a real sky, with real soft gradients, real cloud structure and no painted or stylised look. Output one wide landscape image, three units wide and two tall. Photographic, no text, no logo, no people.
```

Takes: 1 made, take 1 kept.
Why this one: the low sun through fog over the shelf.
Date: 2026-11-25

## `public/assets/breath/mat/materials.json`

Made by: `assets-src/materials/make-materials.mjs`.
From: the pictures above.
Prompt or command: `node assets-src/materials/make-materials.mjs breath`.

What it holds: the settings of the script, and for each tile its name, the real width of one repeat in metres and its mean colour in linear light, so a place can tint or blend by number.
Date: 2026-11-25
