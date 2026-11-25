# Material pictures of the Ribs

The material pictures and the sky picture of the Ribs, made by the Builder on 2026-11-25 for every owner of the place to read. Each began as one generated picture: a flat surface seen straight on under even light, 1254 px square, or a sky, 1536 x 1024. `assets-src/materials/make-materials.mjs` makes each surface tile and writes a colour picture and a data picture from it, by the method of the Heart's materials. The list and every prompt are in `assets-src/materials/spec.py`.

How to read them: the colour picture is sRGB. In the data picture red and green are the slope on x and y (0.5 is level) and blue is height. `metres` in `materials.json` is the real width one repeat stands for. A face with beds or courses (`ledge`, `strata`, `cliff`, `canal`, `bark`, `hoop`) repeats well from left to right; lay its height once or break the repeat. Blend two scales of a tile and break it with the place's own large shapes so no repeat shows. These pictures carry no light: the place's rig lights them.

## `public/assets/ribs/mat/bone.jpg` and `public/assets/ribs/mat/bone-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/bone.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-0-establishing.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A material texture, seen square on in an orthographic view: the surface of a colossal ancient rib that stands in the sea like a stone arch, a section about 12 metres across. Weathered bone turned half to stone: pale grey-cream and ivory, with long shallow grooves and fine cracks running from top to bottom, pitted and porous patches where the surface has flaked away, darker grey water stains, streaks of green-black algae running down and a little rust-orange lichen. The grooves run exactly vertical. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the ribs themselves, which the establishing picture shows as pale grooved bone-stone with dark stains.
Date: 2026-11-25

## `public/assets/ribs/mat/weed.jpg` and `public/assets/ribs/mat/weed-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/weed.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-1-the-drowned-hanging-in-the-weed.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A material texture, seen square on in an orthographic view: the face of a sea cliff at low tide, a section about 8 metres tall, completely draped in hanging seaweed. Thick wet curtains of dark olive, brown-black and ochre-orange kelp and wrack hanging straight down in overlapping strands, glistening wet, with patches of dark barnacled rock showing between them. The strands hang exactly vertical. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the weed-hung cliff of the left foreground and of the detail of the drowned one.
Date: 2026-11-25

## `public/assets/ribs/mat/flat.jpg` and `public/assets/ribs/mat/flat-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/flat.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-2-tide-pool-feeders.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A material texture, seen straight down from above in an orthographic view: a tidal flat just after the sea has left it, about 4 metres across. Wet dark grey sand and fine gravel with shallow ripple marks, scattered small pebbles, shell grit and torn scraps of dark weed, darker where it is wettest. No standing pools and no reflections of the sky. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the floor of the strait at low tide; the films of water on it are drawn by the place.
Date: 2026-11-25

## `public/assets/ribs/mat/rock.jpg` and `public/assets/ribs/mat/rock-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/rock.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-2-tide-pool-feeders.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A material texture, seen straight down from above in an orthographic view: wet dark shore rock at low tide, about 3 metres across. Rough black-brown rock crusted with grey-white barnacles, tufts of ochre and olive weed lying flat, small limpets, pits that hold grit and broken shell. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the near rocks of the foreground in the establishing picture and the feeders detail.
Date: 2026-11-25

## `public/assets/ribs/mat/ledge.jpg` and `public/assets/ribs/mat/ledge-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/ledge.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-3-the-colony.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A material texture, seen square on in an orthographic view: the face of a sea stack where a colony of flying animals roosts, a section about 10 metres tall. Stepped ledges of pale grey-white weathered rock in rough horizontal courses, heavily streaked with white droppings that run down from every ledge, with patches of bright orange and rust lichen and dark wet seams. The courses run exactly horizontal. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the stack of the colony: pale stepped rock, white streaks, orange lichen.
Date: 2026-11-25

## `public/assets/ribs/mat/wing.jpg` and `public/assets/ribs/mat/wing-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/wing.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-2-tide-pool-feeders.jpg`, `references/drafts/working/real/ref-tissue-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A material texture, seen straight on: the skin of the wing of a large flying animal, stretched flat, about 1 metre across. Thin leathery membrane, pale cream to tan and pinkish grey, slightly translucent, with fine wrinkles, a branching net of darker veins, small scars and a few ragged scuffs. No feathers, no hair, no scales. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real surface, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the membrane of the kite-wings, seen close in the feeders detail.
Date: 2026-11-25

## `public/assets/ribs/mat/sky.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/sky.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-0-establishing.jpg`, `references/drafts/working/real/plate-storm-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A photograph of the sky only, in daylight just after a storm has passed over the sea. Heavy slate-grey and blue-black storm cloud in tall ragged masses that are breaking apart, with a few bright silver-white gaps where the sun is behind the cloud, darker toward the top of the frame and paler low down. The bottom edge of the frame lies just above the horizon and the top edge is high overhead: only sky and cloud, no land, no sea, no rocks, no mountains, no birds, no sun disc. The first reference image is the place this sky belongs to: take its cloud forms, its colour and its light from there. The second reference image is a real photograph: it is the standard for how a camera records a real sky, with real soft gradients, real cloud structure and no painted or stylised look. Output one wide landscape image, three units wide and two tall. Photographic, no text, no logo, no people.
```

Takes: 1 made, take 1 kept.
Why this one: the after-storm sky of the strait.
Date: 2026-11-25

## `public/assets/ribs/mat/materials.json`

Made by: `assets-src/materials/make-materials.mjs`.
From: the pictures above.
Prompt or command: `node assets-src/materials/make-materials.mjs ribs`.

What it holds: the settings of the script, and for each tile its name, the real width of one repeat in metres and its mean colour in linear light, so a place can tint or blend by number.
Date: 2026-11-25
