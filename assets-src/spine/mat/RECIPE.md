# Material pictures of the Spine

The material pictures and the sky picture of the Spine, made by the Builder on 2026-11-25 for every owner of the place to read. Each began as one generated picture: a flat surface seen straight on under even light, 1254 px square, or a sky, 1536 x 1024. `assets-src/materials/make-materials.mjs` makes each surface tile and writes a colour picture and a data picture from it, by the method of the Heart's materials. The list and every prompt are in `assets-src/materials/spec.py`.

How to read them: the colour picture is sRGB. In the data picture red and green are the slope on x and y (0.5 is level) and blue is height. `metres` in `materials.json` is the real width one repeat stands for. A face with beds or courses (`ledge`, `strata`, `cliff`, `canal`, `bark`, `hoop`) repeats well from left to right; lay its height once or break the repeat. Blend two scales of a tile and break it with the place's own large shapes so no repeat shows. These pictures carry no light: the place's rig lights them.

## `public/assets/spine/mat/spire.jpg` and `public/assets/spine/mat/spire-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/spire.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-2-tether-kites-on-the-first-spire.jpg`, `references/drafts/working/real/plate-ridge-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A material texture, seen square on in an orthographic view: the face of a huge spire of pale rock that is the weathered bone of a colossal vertebra, a section about 30 metres tall. Steep fractured slabs and flakes in tan, ochre, cream and grey-brown, sharp edged, split along long joints with deep dark cracks, with thin lines of snow lying in the cracks and on the small ledges. The joints run exactly vertical. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the spires, which the frames draw with one blotchy noise.
Date: 2026-11-25

## `public/assets/spine/mat/snow.jpg` and `public/assets/spine/mat/snow-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/snow.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-0-establishing.jpg`, `references/drafts/working/real/plate-ridge-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A material texture, seen straight down from above in an orthographic view: wind-packed snow on a high ridge, about 4 metres across. Cold blue-white snow carved by the wind into low sharp-edged ridges and scoops that all run one way, with a fine granular surface and a few small dark stones just breaking through. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the snow of the crest, which reads as a smooth sheet.
Date: 2026-11-25

## `public/assets/spine/mat/rubble.jpg` and `public/assets/spine/mat/rubble-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/rubble.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-0-establishing.jpg`, `references/drafts/working/real/plate-ridge-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A material texture, seen straight down from above in an orthographic view: broken rock on a high snowy ridge, about 5 metres across. Angular slabs and blocks of tan and grey-brown rock with gravel between them, half buried in drifted snow, with snow lying on one side of every block and rime ice on the edges. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the broken shoulders of the crest between snow and spire.
Date: 2026-11-25

## `public/assets/spine/mat/canal.jpg` and `public/assets/spine/mat/canal-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/canal.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-4-inside-the-canal.jpg`, `references/drafts/working/real/plate-tube-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A material texture, seen square on in an orthographic view: the wall inside a tunnel that runs through a colossal bone, a section about 4 metres tall. Smooth worn pale bone-stone, ivory, cream and grey, with long shallow flutes, small pits, a glaze of clear ice, frost in the hollows and rows of short icicles hanging from the ridges. The flutes run exactly horizontal. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the wall of the canal, which the frames draw stretched.
Date: 2026-11-25

## `public/assets/spine/mat/shag.jpg` and `public/assets/spine/mat/shag-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/shag.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-4-inside-the-canal.jpg`, `references/drafts/working/real/ref-dusk-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A material texture, seen straight on: the coat of a large shaggy animal of the high cold, about 0.8 metres across. Long coarse hair, dirty white to cream and pale grey, hanging in thick matted locks from top to bottom, with clumps of ice and snow frozen into the tips and darker damp roots between the locks. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the coats of the ridge-runners, the herd in the canal and the dead one.
Date: 2026-11-25

## `public/assets/spine/mat/cloudsea.jpg` and `public/assets/spine/mat/cloudsea-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/cloudsea.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-0-establishing.jpg`, `references/drafts/working/real/plate-storm-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A texture seen from straight above: the top of a sea of cloud at dusk, about 10 kilometres across. Rolling grey-blue and mauve cloud tops in soft heaps and long swells, with darker valleys between them and thin wisps torn off by the wind. The cloud fills the whole frame at one uniform scale: no land, no sky, no horizon. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the cloud sea below the crest, which the frames do not have.
Date: 2026-11-25

## `public/assets/spine/mat/sky.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/sky.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-0-establishing.jpg`, `references/drafts/working/real/plate-storm-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A photograph of the sky only, at dusk under a thunderstorm, seen from a high ridge above the clouds. Towering dark blue-grey and violet storm cloud fills most of the frame, heavy and layered with ragged torn undersides, paler grey-mauve where it thins, and along the bottom of the frame a narrow band of clear sky glows orange and pale yellow where the sun has just set. No lightning. The bottom edge of the frame lies just above the horizon and the top edge is high overhead: only sky and cloud, no land, no sea, no rocks, no mountains, no birds, no sun disc. The first reference image is the place this sky belongs to: take its cloud forms, its colour and its light from there. The second reference image is a real photograph: it is the standard for how a camera records a real sky, with real soft gradients, real cloud structure and no painted or stylised look. Output one wide landscape image, three units wide and two tall. Photographic, no text, no logo, no people.
```

Takes: 1 made, take 1 kept.
Why this one: the storm at dusk with its band of last light.
Date: 2026-11-25

## `public/assets/spine/mat/materials.json`

Made by: `assets-src/materials/make-materials.mjs`.
From: the pictures above.
Prompt or command: `node assets-src/materials/make-materials.mjs spine`.

What it holds: the settings of the script, and for each tile its name, the real width of one repeat in metres and its mean colour in linear light, so a place can tint or blend by number.
Date: 2026-11-25
