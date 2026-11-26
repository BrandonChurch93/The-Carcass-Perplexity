# Material pictures of the Eye

The working pictures of the Eye, made by the Builder for every owner of the place to read: surface tiles and a sky on 2026-11-25 (the list and every prompt are in `assets-src/materials/spec.py`), and on 2026-11-26 12 more for the second owners, most of them asked for by an owner: far backplates, feature sheets, ground plates and more tiles (`assets-src/materials/spec2.py`). Each began as one generated picture: 1254 px square, 1672 x 941, 941 x 1672, or a sky of 1536 x 1024. `assets-src/materials/make-materials.mjs` makes each surface tile repeat and writes a colour picture and a data picture from it, by the method of the Heart's materials, and writes each plate as it is.

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

Takes: 1 made, take 1 kept.
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

Takes: 1 made, take 1 kept.
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

## `public/assets/eye/mat/materials.json`

Made by: `assets-src/materials/make-materials.mjs`.
From: the pictures above.
Prompt or command: `node assets-src/materials/make-materials.mjs eye`.

What it holds: the settings of the script, and for each tile its name, the real width of one repeat in metres and its mean colour in linear light, so a place can tint or blend by number; for each plate its size in pixels, the real width it stands for and the name of its relief picture where it has one.
Date: 2026-11-26
