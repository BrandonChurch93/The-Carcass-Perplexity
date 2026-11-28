# Material pictures of the Eye

The working pictures of the Eye, made by the Builder for every owner of the place to read: surface tiles and a sky on 2026-11-25 (the list and every prompt are in `assets-src/materials/spec.py`), and on 2026-11-26 17 more for the second owners, most of them asked for by an owner: far backplates, feature sheets, ground plates and more tiles (`assets-src/materials/spec2.py`). Each began as one generated picture: 1254 px square, 1672 x 941, 941 x 1672, or a sky of 1536 x 1024. `assets-src/materials/make-materials.mjs` makes each surface tile repeat and writes a colour picture and a data picture from it, by the method of the Heart's materials, and writes each plate as it is.

How to read them: the colour picture is sRGB. For a tile, in the data picture `<name>-nh.png` red and green are the slope on x and y (0.5 is level) and blue is height, taken from the picture's own light and dark. `metres` in `materials.json` is the real width one repeat of a tile, or the whole of a plate, stands for. A face with beds or courses (`ledge`, `strata`, `cliff`, `canal`, `bark`, `hoop`) repeats well from left to right; lay its height once or break the repeat. Blend two scales of a tile and break it with the place's own large shapes so no repeat shows. These pictures carry no light: the place's rig lights them.

A plate is one whole picture and does not repeat: a far backplate (the far distance of a view, with its own sky and a level horizon), a feature sheet (one thing whole on black under flat light), or a ground plate (one piece of ground from straight above). Where a plate has a relief picture, `<name>-h.png`, it is grey and the size of the colour picture: white is highest (ground plates) or nearest (feature sheets and faces), black is lowest or furthest, and on a feature sheet the black round the subject is no subject. The relief was made by a second call from the colour picture, so it lies on it within a few pixels and its greys are a guess at the form, good for slope and for parallax, not a measured height. Where the generated picture came with a clear background, the plate is laid on black and `<name>-a.png` is its cover: grey, white where the subject is. The animals in these pictures have no eyes and no ears.

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

## `public/assets/eye/mat/far.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/far.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-0-establishing.jpg`, `references/drafts/working/real/plate-crater-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
A photograph taken on a clear, windless evening from a slope above the shore of a round mountain lake that lies in a socket of cliffs, looking across the lake. Only the far side is in the picture, everything beyond the middle of the lake: a long curving wall of pale limestone cliffs about 200 metres tall and two kilometres away runs the whole width of the frame, in thick level beds of cream, buff and gold, broken into terraces and buttresses, with caves and dark alcoves along some beds and fans of pale scree at its foot. The low sun from the left lights the left and middle of the wall warm gold; toward the right the wall turns into cool blue shade and rises into a great overhanging brow of rock. A thin line of mist lies at the foot of the cliffs along the far shore. The sky is cloudless: pale gold low down, deepening to soft blue. The top of the cliffs lies one third of the way down the frame and the far shore line lies at the middle of the frame. Below the shore line there is only still dark blue water that mirrors the cliffs: no near shore, no rocks, no plants. This is a background plate for a film: only the far distance, to stand behind built scenery. The first reference image is the place as the film sees it: keep the forms of its far distance, its light, its weather and its colours, and leave out everything near. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. The horizon is exactly level, straight from the left edge to the right edge. Output one wide landscape image, sixteen units wide and nine tall. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No animals, no birds.
```

The file in `public/` is the larger copy, 3344 x 1882: the generated picture is the parent, cut into 3 x 3 windows, each made again at full resolution by the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) from its enlarged crop with `references/drafts/working/real/plate-crater-1.jpg` as the standard, and the windows are fitted to the parent, tone-matched and joined by `python3 assets-src/materials/enlarge-plate.py join eye far` (the method of `assets-src/reveal/maps/enlarge-maps.py`). MEASURED (`src/big/far-join.json`): 6 of 6 windows used were fitted, moved at most 19.92 px at a corner. Not used: the three windows of the bottom row show only water below the reflections; as with far-low they are not made, and there the plate is the enlarged parent. The prompt of a window:

```
The first reference image is a blurred, low-resolution photograph: one part of a wide view across a round mountain lake on a clear, windless evening, taken from a slope above the near shore. In the whole view a wall of pale limestone cliffs about 200 metres tall and two kilometres away runs along the far shore, lit warm gold by low sun from the left and in cool blue shade under an overhanging brow on the right, under a cloudless sky, with a thin line of mist at its foot, above still dark blue water that mirrors it. The picture shows only the part that is there. Where it shows sky, the result is the same empty sky. Where it shows water, the result is the same water with the same reflections. Where it shows the cliffs, the result is the same cliffs. Make the same photograph at full resolution. Keep every cliff, ledge, cave, slope, shadow, reflection and colour exactly where it is and at the same size: add nothing new and move nothing. Add what a real camera records at this distance and the first image lacks: bedding planes and joints in the limestone, small ledges with scree, dark seepage streaks that follow the cracks, broken strata inside the caves, the grain of the scree fans, fine ripples on the water. The second reference image is a real photograph: the standard for how a camera records real rock, with real grain and micro detail and no painted or generated look. Photographic, sharp from edge to edge. No text, no logo, no border, no people, no animals, no birds.
```

Takes: 1 made, take 1 kept. The larger copy: 9 windows, 1 take each, 6 kept.
Why this one: the far rim of the socket, sunlit, for the establishing frame.
Date: 2026-11-26

## `public/assets/eye/mat/screeplate.jpg` and `public/assets/eye/mat/screeplate-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/screeplate.png`, the generated picture, and `assets-src/eye/mat/src/screeplate-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-0-establishing.jpg`, `references/drafts/working/real/plate-crater-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
A slope of scree above a lake shore, a piece 24 metres wide and 13.5 metres tall. Angular blocks and slabs of pale grey and cream limestone from fist size to 2 metres, piled and interlocked, with gravel and coarse pale sand between them, a few tufts of dry pale growth, and dark gaps under the largest blocks. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the scree of the near foreground of the establishing picture.
Date: 2026-11-26

## `public/assets/eye/mat/face.jpg` and `public/assets/eye/mat/face-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/face.png`, the generated picture, and `assets-src/eye/mat/src/face-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-0-establishing.jpg`, `references/drafts/working/real/plate-crater-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
The wall of a great basin of pale rock, a face 360 metres wide and 200 metres tall. Massive pale limestone in thick level beds, cream, buff and pale gold, broken into buttresses, ledges and stepped terraces of unequal depth, with rounded overhangs, dark alcoves and shallow caves along some beds, vertical black and rust water stains, sparse dark green growth on the ledges, and steep fans of pale scree along the foot. The surface fills the whole frame edge to edge, square on, with no background showing. Flat, even, shadowless light from the front, so that no side is brighter than another: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of a rock face seen square on. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. White is what stands furthest out toward the viewer and black is what lies deepest in. Cracks, joints, caves, hollows and undercut bands are dark; ledges, ribs, bulges and the noses of blocks are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the cliff of the rim, for its beds, caves and scree fans.
Date: 2026-11-26

## `public/assets/eye/mat/far-low.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/far-low.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-2-the-iris-amber-mats.jpg`, `references/drafts/working/real/plate-crater-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
A photograph taken on a clear, windless evening from two metres above the water at the shore of a round mountain lake that lies in a socket of cliffs, looking straight across the lake with a wide lens. Only the far side is in the picture: a wall of pale limestone cliffs about 200 metres tall and 1.6 kilometres away runs the whole width of the frame. On the left and in the middle the low sun from the left lights broken terraces and buttresses warm gold, with caves and dark alcoves; the right flank is in cool blue shade, with fans of rubble at its foot. The sky is cloudless: pale gold low down, deepening to soft blue. No mist. The far shore line lies exactly at the middle of the frame. Below it there is only still dark water: no near shore, no rocks, no plants. This is a background plate for a film: only the far distance, to stand behind built scenery. The first reference image is the place as the film sees it: keep the forms of its far distance, its light, its weather and its colours, and leave out everything near. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. The horizon is exactly level, straight from the left edge to the right edge. Output one wide landscape image, sixteen units wide and nine tall. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No animals, no birds.
```

The file in `public/` is the larger copy, 3344 x 1882: the generated picture is the parent, cut into 3 x 3 windows, each made again at full resolution by the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) from its enlarged crop with `references/drafts/working/real/plate-crater-1.jpg` as the standard, and the windows are fitted to the parent, tone-matched and joined by `python3 assets-src/materials/enlarge-plate.py join eye far-low` (the method of `assets-src/reveal/maps/enlarge-maps.py`). MEASURED (`src/big/far-low-join.json`): 6 of 6 windows used were fitted, moved at most 2.37 px at a corner. Not used: the three windows of the bottom row showed only water, and the model drew a rocky shore across the top of each; they are set aside, and below the middle of the reflections the plate is the enlarged parent. The prompt of a window:

```
The first reference image is a blurred, low-resolution photograph: one part of a wide view across a round mountain lake on a clear, windless evening, taken from two metres above the water. In the whole view a wall of pale limestone cliffs about 200 metres tall and 1.6 kilometres away runs along the far shore, lit warm gold by low sun from the left and in cool blue shade on the right, under a cloudless sky, above still dark water that mirrors it. The picture shows only the part that is there. Where it shows sky, the result is the same empty sky with nothing in it. Where it shows water, the result is the same water with the same reflections. Where it shows the cliffs, the result is the same cliffs. Make the same photograph at full resolution. Keep every cliff, ledge, cave, slope, shadow, reflection and colour exactly where it is and at the same size: add nothing new at this scale and move nothing. Add what a real camera records at this distance and the first image lacks: bedding planes and joints in the limestone, fractured blocks and overhangs, small ledges with scree, dark streaks of seepage, the grain of the rubble fans with sparse low scrub, and fine ripples on the water. The second reference image is a real photograph: it is the standard for how a camera records real rock, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge. No text, no logo, no border, no people, no animals, no birds, no buildings, no boats.
```

Takes: 1 made, take 1 kept. The larger copy: 9 windows, 1 take each, 6 kept.
Why this one: the north rim as the low cameras of the mats and the edge see it (asked for by `eye_owner_2`).
Date: 2026-11-26

## `public/assets/eye/mat/far-long.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/far-long.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-4-what-rises-from-the-centre.jpg`, `references/drafts/working/real/plate-crater-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
A photograph taken on a clear, windless evening with a very long lens across a mountain lake: the wall of pale limestone cliffs on the far shore, 1.5 kilometres away and 200 metres tall, fills the frame from side to side and from top to bottom. Warm sunlit fractured ledges on the left; dark vertical ribs of rock in the middle; right of centre a recessed cave above a cool shaded slope of scree with sparse green growth. No water, no mist and no sky in the frame. This is a background plate for a film: only the far distance, to stand behind built scenery. The first reference image is the place as the film sees it: keep the forms of its far distance, its light, its weather and its colours, and leave out everything near. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. The horizon is exactly level, straight from the left edge to the right edge. Output one wide landscape image, sixteen units wide and nine tall. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No animals, no birds.
```

Takes: 1 made, take 1 kept.
Why this one: the north wall through the long lens of the last detail (asked for by `eye_owner_2`).
Date: 2026-11-26

## `public/assets/eye/mat/drinker-down.jpg` and `public/assets/eye/mat/drinker-down-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/drinker-down.png`, the generated picture, and `assets-src/eye/mat/src/drinker-down-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-1-drinkers-at-the-shore.jpg`, `references/drafts/working/real/ref-hide-3.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
One drinker, an animal of an unknown world, about 2 metres tall at the shoulder: a tall lean four-legged animal with long thin legs and small cloven hooves, a deep narrow chest, and a very long neck that tapers to a small blunt smooth muzzle. Its pale tan and sandy fawn hide has very short dense hair and fine creases, slightly darker along faint ridges where the ribs lie beneath. It is seen exactly from the side in an orthographic view, facing right, standing with its forelegs a little apart and its neck lowered so that its muzzle touches the ground in front of it, as if drinking. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a drinker, neck down, for the far herd (asked for by `eye_owner_2`).
Date: 2026-11-26

## `public/assets/eye/mat/drinker-up.jpg` and `public/assets/eye/mat/drinker-up-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/drinker-up.png`, the generated picture, and `assets-src/eye/mat/src/drinker-up-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-1-drinkers-at-the-shore.jpg`, `references/drafts/working/real/ref-hide-3.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
One drinker, an animal of an unknown world, about 2 metres tall at the shoulder: a tall lean four-legged animal with long thin legs and small cloven hooves, a deep narrow chest, and a very long neck that tapers to a small blunt smooth muzzle. Its pale tan and sandy fawn hide has very short dense hair and fine creases, slightly darker along faint ridges where the ribs lie beneath. It is seen exactly from the side in an orthographic view, facing left, standing square with its neck raised and its muzzle held level, alert. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a drinker, head up (asked for by `eye_owner_2`).
Date: 2026-11-26

## `public/assets/eye/mat/drinker-back.jpg` and `public/assets/eye/mat/drinker-back-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/drinker-back.png`, the generated picture, and `assets-src/eye/mat/src/drinker-back-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-4-what-rises-from-the-centre.jpg`, `references/drafts/working/real/ref-hide-3.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
One drinker, an animal of an unknown world, about 2 metres tall at the shoulder: a tall lean four-legged animal with long thin legs and small cloven hooves, a deep narrow chest, and a very long neck that tapers to a small blunt smooth muzzle. Its pale tan and sandy fawn hide has very short dense hair and fine creases, slightly darker along faint ridges where the ribs lie beneath. It is seen exactly from behind in an orthographic view, standing square, its rump and hind legs toward the viewer and its long neck raised above its back. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a drinker from behind, as the last detail sees them (asked for by `eye_owner_2`).
Date: 2026-11-26

## `public/assets/eye/mat/calf.jpg` and `public/assets/eye/mat/calf-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/calf.png`, the generated picture, and `assets-src/eye/mat/src/calf-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-1-drinkers-at-the-shore.jpg`, `references/drafts/working/real/ref-hide-3.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
One calf of the drinkers, animals of an unknown world, about 1 metre tall at the shoulder: a young lean four-legged animal with long thin legs too long for its body, small hooves, and a long neck that tapers to a small blunt smooth muzzle, under pale sandy fawn hide with very short dense hair. It is seen exactly from the side in an orthographic view, facing right, with its neck lowered so that its muzzle touches the ground in front of it. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a calf, neck down (asked for by `eye_owner_2`).
Date: 2026-11-26

## `public/assets/eye/mat/matplate.jpg` and `public/assets/eye/mat/matplate-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/matplate.png`, the generated picture, and `assets-src/eye/mat/src/matplate-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-2-the-iris-amber-mats.jpg`, `references/drafts/working/real/plate-terrace-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
The bed of the very shallow, perfectly clear margin of a lake, a piece 12 metres wide and 12 metres tall, seen with no ripples and no reflections. Long fine filaments of amber, rust and gold grow over it in mats, all combed toward the top of the picture, crossing and clumped in thick ropes in places and thin as hair in others; pale limestone slabs stand through the mats; between them are dark gaps of clear deeper water. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the amber mats, with their strands, slabs and gaps (asked for by `eye_owner_2`).
Date: 2026-11-26

## `public/assets/eye/mat/skeleton.jpg` and `public/assets/eye/mat/skeleton-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/skeleton.png`, the generated picture, and `assets-src/eye/mat/src/skeleton-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-3-the-edge-where-the-floor-stops.jpg`, `references/drafts/working/real/plate-crater-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
The skeleton of a tall four-legged animal of an unknown world, lying on its side and seen from straight above, 5 metres long: a rib cage of thin curved ribs, some broken, a long spine of small vertebrae running on into a very long neck that ends in a plain tapering point with no skull, a pelvis, and long thin leg bones folded together. Weathered ivory bone, dry, cracked and pitted, stained amber in places. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the skeleton on the edge (asked for by `eye_owner_2`).
Date: 2026-11-26

## `public/assets/eye/mat/lip.jpg` and `public/assets/eye/mat/lip-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/lip.png`, the generated picture, and `assets-src/eye/mat/src/lip-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-3-the-edge-where-the-floor-stops.jpg`, `references/drafts/working/real/plate-terrace-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
The lip where the shallow floor of a lake stops at a sheer drop, a piece 10 metres wide and 10 metres tall, seen with no water on it. Wet pale sinter and grey-tan rock in scalloped ledges and thin layers, knobbly and pitted, with amber and rust strands draped over the raised edges and tan stain in the hollows. The drop lies along the top edge of the picture, where the rock ends in a broken overhanging rim and pure black beyond it. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the lip where the floor stops (asked for by `eye_owner_2`).
Date: 2026-11-26

## `public/assets/eye/mat/drinker-quarter.jpg` and `public/assets/eye/mat/drinker-quarter-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/drinker-quarter.png`, the generated picture, and `assets-src/eye/mat/src/drinker-quarter-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-4-what-rises-from-the-centre.jpg`, `references/drafts/working/real/ref-hide-3.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
One drinker, an animal of an unknown world, about 2 metres tall at the shoulder: a tall lean four-legged animal with long thin legs and small cloven hooves, a deep narrow chest, and a very long neck that tapers to a small blunt smooth muzzle. Its pale tan and sandy fawn hide has very short dense hair and fine creases, slightly darker along faint ridges where the ribs lie beneath. It is seen from behind and from above, at a three-quarter angle, as a person standing on a rock behind it would look down on it: the camera is higher than the animal's back, about 40 degrees above the horizontal, and about 35 degrees to the left of the line of its spine, looking down along the back. The top of the rump is nearest to the viewer and largest; the whole top of the back is seen from above and runs away from the viewer toward the upper right, with the spine a low knobbed ridge along its middle and the ribs faint on both sides of it; the near flank and both hind legs show below, foreshortened, and the far flank is hidden. The long neck rises from the far end of the back, held up and bent a little to one side, and ends in the small blunt muzzle, which points away from the viewer. The skin of the rump, the back and the neck is loose and wrinkled in fine cross folds, with darker creases along the spine, a few faint scratches and patches of dried mud low on the legs. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a drinker from behind at three-quarter and a little above, as the last detail sees the backs and necks in front of it: the square view from behind could only give a rump and a post (asked for by `eye_owner_2`).
Date: 2026-11-26

## `public/assets/eye/mat/matfield.jpg` and `public/assets/eye/mat/matfield-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/matfield.png`, the generated picture, and `assets-src/eye/mat/src/matfield-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-0-establishing.jpg`, `references/drafts/working/real/orb-prismatic.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
The amber shallows of a mountain lake as seen from high above, a piece 240 metres wide and 135 metres tall, under perfectly clear, still water with no ripples and no reflections. Long patches and streaks of rust, orange and gold growth lie on the bed, all drawn out one way, toward the top edge of the picture, torn and ragged, in every width from a hand to twenty metres, with gaps of open water over pale silt between them: the gaps are as wide as the patches and nowhere regular. Along the bottom edge the growth thins out to bare wet pale silt and gravel. Toward the top edge the patches close up, the colour deepens to dark rust and brown, and the water over them darkens. No stripes of one width, no even spacing. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the amber shallows of the establishing picture from high: patches and streaks with open water between, where the built mats read as tiger stripes (asked for by `eye_owner_3`).
Date: 2026-11-26

## `public/assets/eye/mat/matdark.jpg` and `public/assets/eye/mat/matdark-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/matdark.png`, the generated picture, and `assets-src/eye/mat/src/matdark-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-2-the-iris-amber-mats.jpg`, `references/drafts/working/real/plate-terrace-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
The bed of the shallow, perfectly clear margin of a lake, a piece 12 metres wide and 12 metres tall, seen with no ripples and no reflections. A dense tangle of fine gold, amber and rust filaments, strands over strands, thick as rope in places and thin as hair in others, all combed roughly toward the top of the picture, the upper strands bright and the ones beneath them dimmer. They lie over dark clear water and dark brown silt, not over pale rock: every gap between the strands is deep brown to black. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the tangle of strands of the weed detail over dark water, where the built strands are thin pale swirls on brown (asked for by `eye_owner_3`).
Date: 2026-11-26

## `public/assets/eye/mat/shaftwall.jpg` and `public/assets/eye/mat/shaftwall-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/shaftwall.png`, the generated picture, and `assets-src/eye/mat/src/shaftwall-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-3-the-edge-where-the-floor-stops.jpg`, `references/drafts/working/real/plate-crater-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
The sheer rock wall of a flooded shaft seen square on through perfectly clear water, a face 30 metres wide and 17 metres tall. Pale limestone in thick level beds, with ledges, rounded overhangs, pockets and broken edges, a little pale silt lying on the ledges and a few thin strands of amber growth hanging from the uppermost lip. The water tints the rock more with depth and that is the only change of brightness in the picture: along the top edge the rock is pale cream and clear, in the middle it is blue-green, and toward the bottom edge it is lost in blue-black. The surface fills the whole frame edge to edge, square on, with no background showing. Flat, even, shadowless light from the front, so that no side is brighter than another: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of a rock face seen square on. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. White is what stands furthest out toward the viewer and black is what lies deepest in. Cracks, joints, caves, hollows and undercut bands are dark; ledges, ribs, bulges and the noses of blocks are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the wall of the shaft under water at the edge where the floor stops: pale at the lip and lost in blue-black below (asked for by `eye_owner_3`).
Date: 2026-11-26

## `public/assets/eye/mat/shoreplate.jpg` and `public/assets/eye/mat/shoreplate-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/eye/mat/src/shoreplate.png`, the generated picture, and `assets-src/eye/mat/src/shoreplate-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/6-eye/eye-1-drinkers-at-the-shore.jpg`, `references/drafts/working/real/plate-terrace-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs eye`.

```
The wet edge of a lake shore, a piece 8 metres wide and 4.5 metres tall. Rounded cobbles and pebbles of pale grey and buff limestone in every size from a pea to a loaf, most of them small, bedded in dark wet silt and coarse grit, some half sunk, some lying on others, with a few torn scraps of orange and rust growth stranded among them and a film of water in the lowest hollows. The stones are packed close in some parts and sparse in others. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the wet shore at the drinkers: cobbles and pebbles of many sizes in dark silt, where the built pebbles read as beans on flat grey (asked for by `eye_owner_3`).
Date: 2026-11-26

## `public/assets/eye/mat/materials.json`

Made by: `assets-src/materials/make-materials.mjs`.
From: the pictures above.
Prompt or command: `node assets-src/materials/make-materials.mjs eye`.

What it holds: the settings of the script, and for each tile its name, the real width of one repeat in metres and its mean colour in linear light, so a place can tint or blend by number; for each plate its size in pixels, the real width it stands for and the name of its relief picture where it has one.
Date: 2026-11-26

## `public/assets/eye/mat/far-edge.jpg`

Made by: the image model behind `generate_image` (default model, through Perplexity), then `assets-src/eye/mat/make-plates.py` on Python 3.14 with Pillow 13.0 and NumPy 2.5.
From: `assets-src/eye/mat/far-edge-t1.png`, the generated picture. Picture passed to the model with the prompt: `public/assets/eye/mat/far-low.jpg`.
Prompt or command: the prompt below, then `python3 assets-src/eye/mat/make-plates.py`.

```
Photographic wide panorama for a film backplate: the far rim of a vast limestone sinkhole lake seen from water level across two kilometres of still water. The cliff is a thin band running the whole width of the frame, only about one eighth of the picture's height, sitting just above the middle of the picture. The rim has an irregular skyline of ledges and notches, unbroken from the left edge to the right edge of the picture. Low evening sun from the left: yellow-gold light only on the upper left-facing ledges, cool blue-grey shaded recesses and a few shallow dark caves at the cliff foot, pale scree fans. Low contrast, seen through hazy evening air, a thin pale mist lying at the foot of the cliff along the water. Above the cliff, filling the upper part of the picture: a clear still evening sky, lilac-blue shading to soft peach toward the left, with two thin faint cirrus streaks. Below the cliff: flat still dark water with a soft reflection. Same rock, same light and same colours as the reference picture, but seen from much farther away with a wider lens. No animals, no people, no birds, no text, no buildings, no trees.
```

Takes: 1 made, take 1 kept.
Why this one: the whole north rim from far off with its skyline and a strip of the evening sky over it, which the shot at the lake's edge lost with the low rim picture (asked for by `eye_sky_builder`).
Date: 2026-11-26

## `public/assets/eye/mat/far-long3.jpg`

Made by: the image model behind `generate_image` (default model, through Perplexity) for the four pictures at the sides, then `assets-src/eye/mat/make-plates.py` on Python 3.14 with Pillow 13.0 and NumPy 2.5.
From: `public/assets/eye/mat/far-long.jpg`, the middle, as it stood; `assets-src/eye/mat/far-long3-left-t1.jpg` and `assets-src/eye/mat/far-long3-left2-t1.jpg`, the wall carried on to the left; `assets-src/eye/mat/far-long3-right-t1.jpg` and `assets-src/eye/mat/far-long3-right2-t1.jpg`, the wall carried on to the right (the four stored as JPEG quality 95 as they came). Picture passed to the model with each prompt: a grey canvas of 1672 by 941 with the nearer half of the neighbouring picture on the half to be kept (the left half of `far-long.jpg` for left, the left half of left for left2, the right half of `far-long.jpg` for right, the right half of right for right2).
Prompt or command: the four prompts below in the order left, left2, right, right2, then `python3 assets-src/eye/mat/make-plates.py`, which takes the new half of each, fades each seam over 80 columns and turns the orange of the sunlit rock toward yellow-gold.

```
Complete this picture to the left. The right half is a telephoto photograph of a high limestone cliff at evening, its blocky buttresses lit yellow-gold by the low sun, with grey scree slopes and low scrub below; the flat grey area at the left is missing and must be filled. Keep the right half exactly as it is. In the grey area the same cliff continues to the left without a break: more blocky ledged buttresses and beds lit the same yellow-gold, with cool grey shaded clefts between them, the cliff top out of the frame, and below them the same grey scree slope with a little low scrub running on to the left edge at the same level. No sky anywhere, no cave, no people, no animals, no text, no water. Same sharpness, same grain, same telephoto look through evening air; the new part must not be a mirror image of the right half.
```

```
Complete this picture to the left. The right half is a telephoto photograph of a limestone cliff at evening, its blocky ledged buttresses lit yellow-gold by the low sun, above a grey scree slope with boulders; the flat grey area at the left is missing and must be filled. Keep the right half exactly as it is. In the grey area the same cliff continues to the left without a break: more blocky ledged buttresses lit the same yellow-gold with cool grey shaded clefts, the cliff top out of the frame, and below them the same grey scree slope with boulders running on level to the left edge. No sky anywhere, no cave, no people, no animals, no text, no water. Same sharpness, same grain, same telephoto look through evening air; the new part must not be a mirror image of the right half.
```

```
Complete this picture to the right. The left half is a telephoto photograph of a high limestone cliff at evening with a cave mouth in pale rock, dark vertical stains on the wall, and a grey scree slope with low scrub rising toward the right; the flat grey area at the right is missing and must be filled. Keep the left half exactly as it is. In the grey area the same shaded pale grey limestone wall with dark vertical stains continues to the right without a break, its top out of the frame, and the scree slope with boulders and a little low scrub goes on rising gently to the right edge, covering the lower two thirds there. No sky anywhere, no second cave, no people, no animals, no text, no water. Same sharpness, same grain, same telephoto look through evening air; the new part must not be a mirror image of the left half.
```

```
Complete this picture to the right. The left half is a telephoto photograph at evening of a shaded pale grey limestone wall with dark vertical stains above a grey scree slope with boulders and low scrub that rises toward the right; the flat grey area at the right is missing and must be filled. Keep the left half exactly as it is. In the grey area the scree slope reaches a rounded crest just right of the join and then falls away gently to the right edge, where it lies low in the frame; above it the same shaded pale grey limestone wall with dark vertical stains continues to the right edge, its top out of the frame. No sky anywhere, no cave, no people, no animals, no text, no water. Same sharpness, same grain, same telephoto look through evening air; the new part must not be a mirror image of the left half.
```

Takes: 1 made of each of the four, take 1 kept.
Why this one: the north wall of the last shot three times as wide, so that it can hang at two thirds of its size as in approved eye-4 (gold across the left half, the cave small, scree at the right) and never repeats as the camera climbs (asked for by `eye_sky_builder`).
Date: 2026-11-26

## `public/assets/eye/mat/far-long3-cut.png`

Made by: `assets-src/eye/mat/cut-layers.py` on Python 3 with OpenCV 5.1 and NumPy.
From: `public/assets/eye/mat/far-long3.jpg`, and the lines drawn by hand over it that stand as numbers in the script: where the scree meets the rock, and the edges of the two buttresses of the middle third.
Prompt or command: `python3 assets-src/eye/mat/cut-layers.py`

Takes: 1 made, take 1 kept.
Why this one: the far wall of the last shot stood as one flat picture. Cut into the scree foot, the buttresses and the far face, each on its own cylinder, the wall parts as the lens climbs. Red is buttress, green is scree foot, blue is how far above a covered point the far face begins (what the shader shows where the layers part); it is half the picture's size.
Date: 2026-11-28
