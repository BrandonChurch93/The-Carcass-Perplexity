# Material pictures of the Blood Marsh

The working pictures of the Blood Marsh, made by the Builder for every owner of the place to read: surface tiles and a sky on 2026-11-25 (the list and every prompt are in `assets-src/materials/spec.py`), and on 2026-11-26 22 more for the second owners, most of them asked for by an owner: far backplates, feature sheets, ground plates and more tiles (`assets-src/materials/spec2.py`). Each began as one generated picture: 1254 px square, 1672 x 941, 941 x 1672, or a sky of 1536 x 1024. `assets-src/materials/make-materials.mjs` makes each surface tile repeat and writes a colour picture and a data picture from it, by the method of the Heart's materials, and writes each plate as it is.

How to read them: the colour picture is sRGB. For a tile, in the data picture `<name>-nh.png` red and green are the slope on x and y (0.5 is level) and blue is height, taken from the picture's own light and dark. `metres` in `materials.json` is the real width one repeat of a tile, or the whole of a plate, stands for. A face with beds or courses (`ledge`, `strata`, `cliff`, `canal`, `bark`, `hoop`) repeats well from left to right; lay its height once or break the repeat. Blend two scales of a tile and break it with the place's own large shapes so no repeat shows. These pictures carry no light: the place's rig lights them.

A plate is one whole picture and does not repeat: a far backplate (the far distance of a view, with its own sky and a level horizon), a feature sheet (one thing whole on black under flat light), or a ground plate (one piece of ground from straight above). Where a plate has a relief picture, `<name>-h.png`, it is grey and the size of the colour picture: white is highest (ground plates) or nearest (feature sheets and faces), black is lowest or furthest, and on a feature sheet the black round the subject is no subject. The relief was made by a second call from the colour picture, so it lies on it within a few pixels and its greys are a guess at the form, good for slope and for parallax, not a measured height. Where the generated picture came with a clear background, the plate is laid on black and `<name>-a.png` is its cover: grey, white where the subject is. The animals in these pictures have no eyes and no ears.

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

## `public/assets/marsh/mat/far.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/far.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-0-establishing.jpg`, `references/drafts/working/real/plate-flats-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
A photograph taken with a long lens across salt flats under a flat white overcast, with no wind. Only the far distance is in the picture, everything further than about two kilometres: a long low escarpment of pale hills about six kilometres away, grey-mauve and soft in the haze, with a second fainter line of hills behind it, runs the whole width of the frame; in front of it the flats lie level, dirty white salt with thin far streaks of red brine and pale standing water; right of centre a soft grey curtain of rain hangs from the cloud to the ground far off, slightly slanted; a few low banks of mist lie in steps at different distances. The sky is bright white overcast with barely darker bellies. The horizon lies at the middle of the frame. Below it there is only level salt flat fading to pale haze: no near pools, no plants, no rocks. This is a background plate for a film: only the far distance, to stand behind built scenery. The first reference image is the place as the film sees it: keep the forms of its far distance, its light, its weather and its colours, and leave out everything near. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. The horizon is exactly level, straight from the left edge to the right edge. Output one wide landscape image, sixteen units wide and nine tall. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No animals, no birds.
```

Takes: 1 made, take 1 kept.
Why this one: the hills, the rain and the mist beyond the flats.
Date: 2026-11-26

## `public/assets/marsh/mat/ledge.jpg` and `public/assets/marsh/mat/ledge-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/ledge.png`, the generated picture, and `assets-src/marsh/mat/src/ledge-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-0-establishing.jpg`, `references/drafts/working/real/plate-terrace-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
A rise of bare rock on a salt flat, a piece 14 metres wide and 8 metres tall. Pale grey-tan bedded rock broken into sharp-edged blocks and stepped ledges, with deep dark fractures between the blocks, rust-red stain in the cracks where red brine has dried, and a thin white rind of salt on the top faces. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the near rock of the establishing picture (asked for by `marsh_ground_owner_2`).
Date: 2026-11-26

## `public/assets/marsh/mat/thincrust.jpg` and `public/assets/marsh/mat/thincrust-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/thincrust.png`, the generated picture, and `assets-src/marsh/mat/src/thincrust-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-4-the-one-on-the-thin-crust.jpg`, `references/drafts/working/real/plate-porcelain-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
The thin crust of a salt marsh where it has broken, a piece 10 metres wide and 5.6 metres tall. Glistening wet grey-tan mud; on it broken slabs of dirty white salt crust from a hand to a metre wide, tilted, with lifted broken edges; blood-red brine standing under and between the slabs; salt crumbs and small crystals scattered over the mud. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the broken crust round the one that is stuck (asked for by `marsh_ground_owner_2`).
Date: 2026-11-26

## `public/assets/marsh/mat/silt.jpg` and `public/assets/marsh/mat/silt-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/silt.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-4-the-one-on-the-thin-crust.jpg`, `references/drafts/working/real/plate-flats-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
A material texture, seen straight down from above in an orthographic view: wet mud on a salt flat, about 3 metres across. Smooth grey-tan silt under a very thin film of water, with low ripple marks, small pits and gas holes, salt crumbs and a few thin cracks. No red. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the wet mud between crust and brine (asked for by `marsh_ground_owner_2`).
Date: 2026-11-26

## `public/assets/marsh/mat/froth.jpg` and `public/assets/marsh/mat/froth-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/froth.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-1-the-bubbling-seep-pool.jpg`, `references/drafts/working/real/plate-norris-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
Froth on dark brine, about 1.5 metres across: clusters of pink-white bubbles of many sizes, rafts of pale scum, thin strings of foam and a few larger glassy domes, with empty black between them. The subject lies on pure black: black means nothing is there, and brightness means how much is there. The field fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this belongs to: take its colour and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the froth and small bubbles of the seep pool (asked for by `marsh_ground_owner_2`).
Date: 2026-11-26

## `public/assets/marsh/mat/shore.jpg` and `public/assets/marsh/mat/shore-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/shore.png`, the generated picture, and `assets-src/marsh/mat/src/shore-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-1-the-bubbling-seep-pool.jpg`, `references/drafts/working/real/plate-porcelain-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
The bank of a pool of blood-red brine, a strip 4 metres wide and 2.25 metres tall whose bands run level from the left edge to the right edge. Along the bottom edge is open dark red brine; above it a thin line of pale scum; then a band of dark wet red mud; then a band of cream-white salt in lumps like cauliflower, with red in every crevice; and along the top edge drier grey salt crust. The bands keep the same height across the whole width. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the bank of the seep pool and the channels; repeat it left to right with every second copy mirrored (asked for by `marsh_ground_owner_2`).
Date: 2026-11-26

## `public/assets/marsh/mat/wallower.jpg` and `public/assets/marsh/mat/wallower-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/wallower.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-3-mud-wallowers.jpg`, `references/drafts/working/real/ref-hide-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
One mud-wallower, an animal of an unknown world, standing, seen exactly from the side in an orthographic view, facing left, about 2.6 metres tall and 5 metres long. A huge heavy barrel of a body on four short thick legs, under thick grey-tan hide in deep folds and coarse wrinkles with sparse short bristles, caked to the belly in drying red-brown mud. It has no neck and no head: the front of the body slopes down to the ground and ends in a fringe of eight or ten long curved pale feelers like tusks or the claws of a sloth, which rake the mud. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

Takes: 1 made, take 1 kept.
Why this one: the wallower whole in side view, for the shape of its one skin.
Date: 2026-11-26

## `public/assets/marsh/mat/stalk.jpg` and `public/assets/marsh/mat/stalk-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/stalk.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-2-the-stalk-colony.jpg`, `references/drafts/working/real/plate-forest-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
One stalk of a stalk colony, a growth of an unknown world, whole, seen square on, about 3 metres tall, standing upright with its foot at the bottom of the frame. A single thick stem, slightly bent, sheathed in overlapping pale cream and bone-white fibrous rings crusted with salt, each ring with a ragged dry brown lower edge. From its top springs a crown of long crimson fans: flat ribbed blades that split into hundreds of fine wet red filaments, some upright and some hanging, darker wine red at the base. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

Takes: 1 made, take 1 kept.
Why this one: one stalk with its fan, for the filaments.
Date: 2026-11-26

## `public/assets/marsh/mat/lock.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/lock.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-2-the-stalk-colony.jpg`, `references/drafts/working/real/ref-tissue-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
One lock of the fan of a stalk, a growth of an unknown world, laid flat and seen square on, 0.7 metres long, its base at the bottom of the frame: 25 to 40 fine wet crimson filaments fanning upward and outward from one flat pale strap-like base, each filament thin as string, darker wine red near the base and brighter at the ragged tips, a few clear drops of water hanging on them. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

Takes: 1 made, take 1 kept.
Why this one: one lock of a fan, for the filaments of the stalks (asked for by `marsh_life_owner_2`).
Date: 2026-11-26

## `public/assets/marsh/mat/deadone.jpg` and `public/assets/marsh/mat/deadone-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/deadone.png`, the generated picture, and `assets-src/marsh/mat/src/deadone-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-4-the-one-on-the-thin-crust.jpg`, `references/drafts/working/real/plate-porcelain-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
The carcass of a mud-wallower, an animal of an unknown world, long dead and crusted with salt, seen from straight above, 3 metres long: a collapsed sunken hide lying flat, covered in a thick crust of white and pale grey salt crystals in lumps and knobs, with the curved ribs and the short thick leg bones standing through the crust as pale spokes, and dirty pink-brown stain in the hollows. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: one of the old dead under their salt (asked for by `marsh_life_owner_2`).
Date: 2026-11-26

## `public/assets/marsh/mat/wethide.jpg` and `public/assets/marsh/mat/wethide-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/wethide.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-3-mud-wallowers.jpg`, `references/drafts/working/real/ref-hide-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
A material texture, seen straight on: the soaked hide of a huge heavy wallowing animal below the line where it stands in red brine, about 1 metre across. Dark grey-brown skin in deep folds and coarse wrinkles, soaking wet, smeared with glossy rust-red mud that fills the folds, with thin runs of red water. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the wet hide below the wet line (asked for by `marsh_life_owner_2`).
Date: 2026-11-26

## `public/assets/marsh/mat/insect.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/insect.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-2-the-stalk-colony.jpg`, `references/drafts/working/real/ref-tissue-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
One small flying insect of an unknown world with its wings spread, seen from straight above, enlarged to fill the frame: a slender dark segmented body 2 centimetres long that ends at the front in a tuft of fine feelers, with no eyes, and two pairs of long clear glassy wings with a fine net of dark veins, the front pair longer than the back pair. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

Takes: 1 made, take 1 kept.
Why this one: one of the insects round the fans (asked for by `marsh_life_owner_2`).
Date: 2026-11-26

## `public/assets/marsh/mat/muzzle.jpg` and `public/assets/marsh/mat/muzzle-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/muzzle.png`, the generated picture, and `assets-src/marsh/mat/src/muzzle-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-4-the-one-on-the-thin-crust.jpg`, `references/drafts/working/real/ref-hide-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
The front end of a mud-wallower, an animal of an unknown world, seen exactly from the front, 1.2 metres wide: a blunt heavy wrinkled muzzle of thick grey-tan hide, with a slack lipless slit of a mouth low down and, hanging round and below it, a fringe of a dozen long pale curved feelers like tusks, caked with drying red-brown mud. It has no eyes, no ears and no nostrils: above the mouth there is only folded hide. It is not a monster and not cute. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the front of a wallower, as the stuck one shows it (asked for by `marsh_life_owner_2`).
Date: 2026-11-26

## `public/assets/marsh/mat/mudhide.jpg` and `public/assets/marsh/mat/mudhide-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/mudhide.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-4-the-one-on-the-thin-crust.jpg`, `references/drafts/working/real/ref-hide-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
A material texture, seen straight on: the hide of a huge heavy wallowing animal that has stood a long time in drying mud, about 1 metre across. Pinkish-brown creased skin plastered with grey-tan mud that has dried to pale cracked plates. The plates lift and curl at their edges, some have flaked away and show the skin beneath, and a white bloom of salt lies on them. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 2 made, take 2 kept (take 1 was made from a prompt cut short by a fault of the Builder's own script and was thrown away).
Why this one: the hide of the stuck one: skin under dried, cracked, curling plates of mud, where the built one is smooth and grey (asked for by `marsh_life_owner_3`).
Date: 2026-11-26

## `public/assets/marsh/mat/hairhide.jpg` and `public/assets/marsh/mat/hairhide-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/hairhide.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-3-mud-wallowers.jpg`, `references/drafts/working/real/ref-hide-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
A material texture, seen straight on: the hide of the back of a huge heavy wallowing animal, about 1 metre across. Grey-tan wrinkled skin in broad folds, with coarse sparse hair lying one way in wet clumps, and salt dried pale in flakes on the high folds. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the back of a wallower with its sparse coarse hair in wet clumps, where the built backs have no hair (asked for by `marsh_life_owner_3`).
Date: 2026-11-26

## `public/assets/marsh/mat/deadone-b.jpg` and `public/assets/marsh/mat/deadone-b-h.png` and `public/assets/marsh/mat/deadone-b-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/deadone-b.png`, the generated picture, and `assets-src/marsh/mat/src/deadone-b-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-4-the-one-on-the-thin-crust.jpg`, `references/drafts/working/real/plate-porcelain-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
The carcass of a mud-wallower, an animal of an unknown world, long dead, 3 metres long, seen from the side and a little from above, as a camera 1.5 metres above the ground and 6 metres away sees it, lying level across the frame. It has collapsed in on itself: the back has fallen in and dark bone shows in the hollow. Its head end is at the left, with its fringe of long pale feelers splayed out on the ground in front of it. The whole carcass is coated in white salt crystals like hoar frost, thick on the upper side, and the short thick tan legs show through the crust. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a second dead one seen from the side: fallen in, hoar-frost white with tan legs and splayed feelers, where the built dead are dark grey heaps (asked for by `marsh_life_owner_3`).
Date: 2026-11-26

## `public/assets/marsh/mat/deadone-c.jpg` and `public/assets/marsh/mat/deadone-c-h.png` and `public/assets/marsh/mat/deadone-c-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/deadone-c.png`, the generated picture, and `assets-src/marsh/mat/src/deadone-c-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-4-the-one-on-the-thin-crust.jpg`, `references/drafts/working/real/plate-porcelain-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
What is left of the carcass of a mud-wallower, an animal of an unknown world, dead for many years, 2.5 metres long, seen from the side and a little from above, as a camera 1.5 metres above the ground and 6 metres away sees it, lying level across the frame. It is a low white mound of coarse salt crystals with a few crusted knobs where bones lie under the salt and the tips of two pale feelers at the left end. The foot of the mound is stained pink. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the oldest of the dead: a low white mound of salt with a few knobs (asked for by `marsh_life_owner_3`).
Date: 2026-11-26

## `public/assets/marsh/mat/fan.jpg` and `public/assets/marsh/mat/fan-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/fan.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-2-the-stalk-colony.jpg`, `references/drafts/working/real/ref-tissue-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
One open feeding fan of a stalk, a growth of an unknown world, with the top 25 centimetres of its stalk, seen from the side, 0.9 metres wide. A dense soft plume of crimson strap-shaped filaments rises from a brown papery sheath at the top of a bone-white stem and arches over to the right. The filaments are wet and clumped in locks, darker wine red at the base, and some tips are torn or bleached pale. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

Takes: 1 made, take 1 kept.
Why this one: one open fan from the side as the stalk colony detail has it, a soft plume of strap filaments, where the built plume is dark and wiry (asked for by `marsh_life_owner_3`).
Date: 2026-11-26

## `public/assets/marsh/mat/stalk-b.jpg` and `public/assets/marsh/mat/stalk-b-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/stalk-b.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-2-the-stalk-colony.jpg`, `references/drafts/working/real/plate-forest-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
One stalk of a stalk colony, a growth of an unknown world, whole, seen square on, about 3 metres tall, with its foot at the bottom of the frame. A single stem as thick as an arm, sheathed in overlapping bone-white fibrous rings crusted with salt, each ring with a ragged dry brown lower edge. This one is thin and leans to the right. Its crimson fan is half drawn back into the tube at its top, so that only a short bunch of wet red filaments, a hand long, sticks out of the brown papery sheath. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

Takes: 1 made, take 1 kept.
Why this one: a second stalk, thin and leaning with its fan half drawn in, so that the stalks are not copies of one (asked for by `marsh_life_owner_3`).
Date: 2026-11-26

## `public/assets/marsh/mat/stalk-c.jpg` and `public/assets/marsh/mat/stalk-c-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/stalk-c.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-2-the-stalk-colony.jpg`, `references/drafts/working/real/plate-forest-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
One stalk of a stalk colony, a growth of an unknown world, whole, seen square on, about 3 metres tall, with its foot at the bottom of the frame. A single stem as thick as an arm, sheathed in overlapping bone-white fibrous rings crusted with salt, each ring with a ragged dry brown lower edge. This one is dead: it is broken off at two thirds of its height and empty, with a ragged rim, a dark hole at the top and one flap of its fibrous bark hanging down the side. It has no fan and nothing red on it. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

Takes: 1 made, take 1 kept.
Why this one: a third stalk, broken off and empty (asked for by `marsh_life_owner_3`).
Date: 2026-11-26

## `public/assets/marsh/mat/flatplate.jpg` and `public/assets/marsh/mat/flatplate-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/flatplate.png`, the generated picture, and `assets-src/marsh/mat/src/flatplate-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-0-establishing.jpg`, `references/drafts/working/real/plate-flats-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
A salt flat between channels of brine, a piece 40 metres wide and 22.5 metres tall. Salt plates in irregular polygons 2 to 5 metres across, pale grey-tan, each with a raised, crumbled white rim. Wet dark grey mud lies in the seams between the plates and in a few bare patches. In the lowest places thin sheets of shallow red brine have pooled, each with a dark wet margin and a rust stain round it. A few low mounds of white salt. No channel crosses the whole picture. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the flats of the establishing picture: salt plates with rims, wet grey mud and red only in the lows, where the built flats are pink-white speckle (asked for by `marsh_ground_owner_3`).
Date: 2026-11-26

## `public/assets/marsh/mat/ripple.jpg` and `public/assets/marsh/mat/ripple-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/mat/src/ripple.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/4-marsh/marsh-3-mud-wallowers.jpg`, `references/drafts/working/real/plate-norris-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs marsh`.

```
A material texture, seen straight down from above in an orthographic view: the surface of still, dense, dark red brine, about 3 metres across. Small low wavelets that cross each other from two directions and a few faint spreading rings, as from single drops. The red is dark oxblood and even. No foam, no froth, no shore, no reflections of sky. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the small waves and rings of the brine, read for its height only, where the built brine is flat with drawn ring lines (asked for by `marsh_ground_owner_3`).
Date: 2026-11-26

## `public/assets/marsh/mat/materials.json`

Made by: `assets-src/materials/make-materials.mjs`.
From: the pictures above.
Prompt or command: `node assets-src/materials/make-materials.mjs marsh`.

What it holds: the settings of the script, and for each tile its name, the real width of one repeat in metres and its mean colour in linear light, so a place can tint or blend by number; for each plate its size in pixels, the real width it stands for and the name of its relief picture where it has one.
Date: 2026-11-26
