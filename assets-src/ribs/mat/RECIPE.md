# Material pictures of the Ribs

The working pictures of the Ribs, made by the Builder for every owner of the place to read: surface tiles and a sky on 2026-11-25 (the list and every prompt are in `assets-src/materials/spec.py`), and on 2026-11-26 30 more for the second owners, most of them asked for by an owner: far backplates, feature sheets, ground plates and more tiles (`assets-src/materials/spec2.py`). Each began as one generated picture: 1254 px square, 1672 x 941, 941 x 1672, or a sky of 1536 x 1024. `assets-src/materials/make-materials.mjs` makes each surface tile repeat and writes a colour picture and a data picture from it, by the method of the Heart's materials, and writes each plate as it is.

How to read them: the colour picture is sRGB. For a tile, in the data picture `<name>-nh.png` red and green are the slope on x and y (0.5 is level) and blue is height, taken from the picture's own light and dark. `metres` in `materials.json` is the real width one repeat of a tile, or the whole of a plate, stands for. A face with beds or courses (`ledge`, `strata`, `cliff`, `canal`, `bark`, `hoop`) repeats well from left to right; lay its height once or break the repeat. Blend two scales of a tile and break it with the place's own large shapes so no repeat shows. These pictures carry no light: the place's rig lights them.

A plate is one whole picture and does not repeat: a far backplate (the far distance of a view, with its own sky and a level horizon), a feature sheet (one thing whole on black under flat light), or a ground plate (one piece of ground from straight above). Where a plate has a relief picture, `<name>-h.png`, it is grey and the size of the colour picture: white is highest (ground plates) or nearest (feature sheets and faces), black is lowest or furthest, and on a feature sheet the black round the subject is no subject. The relief was made by a second call from the colour picture, so it lies on it within a few pixels and its greys are a guess at the form, good for slope and for parallax, not a measured height. Where the generated picture came with a clear background, the plate is laid on black and `<name>-a.png` is its cover: grey, white where the subject is. The animals in these pictures have no eyes and no ears.

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

## `public/assets/ribs/mat/far.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/far.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-0-establishing.jpg`, `references/drafts/working/real/anchor-coast-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A photograph taken with a long lens from low over a wet tidal flat, looking straight down the middle of a sea strait just after a storm. Only the far end of the strait is in the picture, everything further than about two kilometres from the camera: two rows of colossal pale stone blades stand out of the sea, one row on the left and one on the right, each blade hundreds of metres tall, broad at the foot and curving inward to a hooked tip like the rib of a whale, the two rows leaning toward each other over the water. Six or seven blades on each side recede one behind another toward the horizon, each paler and bluer than the one in front and the last ones almost lost in sea haze. Black weed darkens the foot of every blade up to one level tide line, and white surf breaks round the feet. Between the rows the sea runs out to a level horizon, slate green with far white lines of surf, under heavy slate-grey storm cloud that is breaking apart, with a bright silver gap low over the sea in the middle. The horizon lies at the middle of the frame. Below it there is only open sea, with thin wet sand along the very bottom edge: no near rocks, no cliffs at the sides of the frame, no pools, no blade nearer than two kilometres. This is a background plate for a film: only the far distance, to stand behind built scenery. The first reference image is the place as the film sees it: keep the forms of its far distance, its light, its weather and its colours, and leave out everything near. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. The horizon is exactly level, straight from the left edge to the right edge. Output one wide landscape image, sixteen units wide and nine tall. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No animals, no birds.
```

Takes: 1 made, take 1 kept.
Why this one: the far end of the strait, which the frames leave empty.
Date: 2026-11-26

## `public/assets/ribs/mat/blade.jpg` and `public/assets/ribs/mat/blade-h.png` and `public/assets/ribs/mat/blade-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/blade.png`, the generated picture, and `assets-src/ribs/mat/src/blade-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-0-establishing.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
One whole rib blade of the strait, seen square on from the side in an orthographic view: a colossal fin of weathered bone turned to stone, 300 metres tall, standing upright with its foot at the bottom of the frame and its tip at the top. It is broad at the foot, about 90 metres, narrows as it rises and hooks over to the right at the top like the rib of a whale, with one sharp edge and one thick rounded edge. Pale ivory and grey-cream, fluted along its whole length with long shallow grooves that follow its curve, pitted and flaked in patches, with dark water stains running down it, white streaks below small ledges where animals roost, rust-orange lichen in patches, one small natural arch worn through near the foot, and its lowest tenth covered in hanging black-olive weed up to one level line. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: one blade whole, for the shape, the fluting and the stains of the blades.
Date: 2026-11-26

## `public/assets/ribs/mat/plate.jpg` and `public/assets/ribs/mat/plate-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/plate.png`, the generated picture, and `assets-src/ribs/mat/src/plate-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-0-establishing.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
The floor of a sea strait at low tide, a piece 48 metres wide and 27 metres tall. Wet dark grey sand with ripple marks, long bars of shingle and pebbles, shallow braided channels where the last water drains across it, scattered stones from 0.2 to 1 metre, low clumps of black-olive weed lying flat, shell grit. The sand is dark and wet but there are no reflections of the sky on it and no standing pools. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the tide flat of the lower half of the establishing picture (asked for by `ribs_ground_owner_2`).
Date: 2026-11-26

## `public/assets/ribs/mat/wall.jpg` and `public/assets/ribs/mat/wall-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/wall.png`, the generated picture, and `assets-src/ribs/mat/src/wall-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-1-the-drowned-hanging-in-the-weed.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
The foot of a colossal rib of pale stone at low tide, a face 40 metres wide and 40 metres tall. The top quarter is pale ledged ivory rock with rust-orange lichen and white runs of droppings. Below a ragged level weed line the rock is hung with ropes, straps and curtains of black, olive and amber seaweed in heavy clumps that hang straight down, glistening wet, with gaps of wet black barnacled rock between the clumps and thin runs of water. The surface fills the whole frame edge to edge, square on, with no background showing. Flat, even, shadowless light from the front, so that no side is brighter than another: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of a rock face seen square on. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. White is what stands furthest out toward the viewer and black is what lies deepest in. Cracks, joints, caves, hollows and undercut bands are dark; ledges, ribs, bulges and the noses of blocks are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the weed-hung foot of the near left rib, for the establishing picture and the drowned one (asked for by `ribs_ground_owner_2`).
Date: 2026-11-26

## `public/assets/ribs/mat/colony.jpg` and `public/assets/ribs/mat/colony-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/colony.png`, the generated picture, and `assets-src/ribs/mat/src/colony-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-3-the-colony.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
The cliff where a colony of flying animals roosts, a face 40 metres wide and 40 metres tall, with no animals on it. Broken angular ledges of pale grey-white rock in rough steps of unequal depth and height, never even like a stair, white runs of droppings below every ledge, rust-orange and yellow lichen, untidy nests of dried black weed on the ledges, dark wet seams, and wet kelp at the foot. The surface fills the whole frame edge to edge, square on, with no background showing. Flat, even, shadowless light from the front, so that no side is brighter than another: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of a rock face seen square on. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. White is what stands furthest out toward the viewer and black is what lies deepest in. Cracks, joints, caves, hollows and undercut bands are dark; ledges, ribs, bulges and the noses of blocks are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the stepped cliff of the colony (asked for by `ribs_ground_owner_2`).
Date: 2026-11-26

## `public/assets/ribs/mat/shingle.jpg` and `public/assets/ribs/mat/shingle-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/shingle.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-0-establishing.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A material texture, seen straight down from above in an orthographic view: a bed of wet pebbles and shingle on a tidal flat, about 2 metres across. Rounded grey, slate and pale pebbles from 2 to 10 centimetres, wet and dark, with coarse sand and shell grit between them and a few scraps of dark weed. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the pebble beds of the tide flat (asked for by `ribs_ground_owner_2`).
Date: 2026-11-26

## `public/assets/ribs/mat/kitewing.jpg` and `public/assets/ribs/mat/kitewing-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/kitewing.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-2-tide-pool-feeders.jpg`, `references/drafts/working/real/ref-wader-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
One kite-wing, an animal of an unknown world, standing, seen exactly from the side in an orthographic view, facing right, about 2.2 metres tall. It stands on two very long thin legs with knobbly joints, like a wading bird. Its body is small and lean under pale pinkish-cream skin. Its long neck hangs forward and down and ends, where a head would be, in nothing but a tuft of long pale wet tendrils. Two wings are folded along its back: long thin finger bones with leathery membrane between them, cream going to orange-tan and ragged at the trailing edge, the folded tips standing out behind it. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

Takes: 1 made, take 1 kept.
Why this one: the kite-wing whole in side view, for the shape of its one skin.
Date: 2026-11-26

## `public/assets/ribs/mat/kitewing-front.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/kitewing-front.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-2-tide-pool-feeders.jpg`, `references/drafts/working/real/ref-wader-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
One kite-wing, an animal of an unknown world, standing, seen exactly from the front in an orthographic view, about 2.2 metres tall. It stands on two very long thin legs with knobbly joints, like a wading bird, feet apart. Its body is small and lean under pale pinkish-cream skin. Its long neck rises and bends forward and ends, where a head would be, in nothing but a tuft of long pale wet tendrils hanging down. Two wings are held half open at its sides: long thin finger bones with leathery membrane between them, cream going to orange-tan and ragged at the trailing edge. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

Takes: 1 made, take 1 kept.
Why this one: the same animal from the front, for its width and the set of its wings (asked for by `ribs_sea_owner_2`).
Date: 2026-11-26

## `public/assets/ribs/mat/hide.jpg` and `public/assets/ribs/mat/hide-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/hide.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-2-tide-pool-feeders.jpg`, `references/drafts/working/real/ref-hide-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A material texture, seen straight on: the skin of the body and neck of a lean long-legged flying animal, about 0.5 metres across. Thin pale pinkish-cream skin with a very short sparse down, fine wrinkles, goose-flesh pimples, faint blue-grey veins, low ridges where bones press through from beneath, wet patches and a few small scars. No feathers, no scales. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the skin of the kite-wings, beside the wing membrane already made.
Date: 2026-11-26

## `public/assets/ribs/mat/foam.jpg` and `public/assets/ribs/mat/foam-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/foam.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-4-the-bore-arrives.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A material texture, seen straight down from above in an orthographic view: the white water of a broken wave, about 6 metres across. Thick churned white foam with torn holes that show dark slate-green water, long lace trails, clusters of bubbles and thin streaks pulled one way by the flow. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the churn of the bore and the surf at the feet of the blades (asked for by `ribs_sea_owner_2`).
Date: 2026-11-26

## `public/assets/ribs/mat/borewall-a.jpg` and `public/assets/ribs/mat/borewall-a-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/borewall-a.png`, the generated picture, and `assets-src/ribs/mat/src/borewall-a-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-4-the-bore-arrives.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
One section of a tidal bore, a single breaking wall of sea water, seen square on from in front: a section 70 metres wide and 30 metres tall that runs out of the frame at the left and right edges. A dark green-grey face of water, glassy and streaked, its crest curling over toward the viewer along its whole length and throwing ragged spray upward, foam streaming down the face in long white veins, and a band of white churn at its foot. The light comes from behind the wave and from the right, so the thin lip of the crest glows pale green. The wall reaches from the left edge of the frame to the right edge; black is above it and below it only. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the face of the bore, first section (asked for by `ribs_sea_owner_2`).
Date: 2026-11-26

## `public/assets/ribs/mat/borewall-b.jpg` and `public/assets/ribs/mat/borewall-b-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/borewall-b.png`, the generated picture, and `assets-src/ribs/mat/src/borewall-b-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-4-the-bore-arrives.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A second, different section of a tidal bore, a single breaking wall of sea water, seen square on from in front: a section 70 metres wide and 30 metres tall that runs out of the frame at the left and right edges. Here the crest has already pitched forward in the middle and is falling as a thick white curtain, with a hollow dark green tube open at the left and a smooth unbroken dark shoulder at the right, spray torn off the top by wind, foam veins on the face and a deep band of white churn at the foot. The light comes from behind the wave and from the right, so the thin lip of the crest glows pale green. The wall reaches from the left edge of the frame to the right edge; black is above it and below it only. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the face of the bore, second section (asked for by `ribs_sea_owner_2`).
Date: 2026-11-26

## `public/assets/ribs/mat/spray.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/spray.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-4-the-bore-arrives.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A sheet of sixteen separate bursts of thrown sea spray in a grid of four columns and four rows, one burst in the middle of each cell with black between them and no lines between the cells. Each burst is about 8 metres across and different from the others: ragged plumes, fans and tall fingers of white droplets and mist thrown upward, dense at the root and torn to fine mist at the top, lit from behind and from the right. The subject lies on pure black: black means nothing is there, and brightness means how much is there. The first reference image is the place this belongs to: take its colour and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: spray sprites for the bore and the surf (asked for by `ribs_sea_owner_2`).
Date: 2026-11-26

## `public/assets/ribs/mat/splash.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/splash.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-2-tide-pool-feeders.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A sheet of sixteen separate small splashes of water in a grid of four columns and four rows, one splash in the middle of each cell with black between them and no lines between the cells. Each splash is about 0.6 metres across and different from the others: crowns of drops, arcs of drops, falling strings of drops, a single thrown sheet, and ring ripples seen from a low angle, lit from behind. The subject lies on pure black: black means nothing is there, and brightness means how much is there. The first reference image is the place this belongs to: take its colour and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: splash sprites for the feeders and the pools (asked for by `ribs_sea_owner_2`).
Date: 2026-11-26

## `public/assets/ribs/mat/wingopen.jpg` and `public/assets/ribs/mat/wingopen-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/wingopen.png`, the generated picture, and `assets-src/ribs/mat/src/wingopen-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-2-tide-pool-feeders.jpg`, `references/drafts/working/real/ref-tissue-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
One wing of a kite-wing, an animal of an unknown world, fully spread and laid flat, seen from straight above: 2.4 metres long, its root at the left edge of the subject and its tip at the right, its leading edge at the top. Four long thin bone fingers fan out from the wrist, with thin leathery membrane stretched between them: cream near the root, going to orange and tan toward the trailing edge, which is torn and ragged, with a branching net of fine dark veins, small scars and wrinkles. No feathers, no hair. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: one wing spread, for the membrane sheets of the feeders and the colony (asked for by `ribs_sea_owner_2`).
Date: 2026-11-26

## `public/assets/ribs/mat/carcass.jpg` and `public/assets/ribs/mat/carcass-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/carcass.png`, the generated picture, and `assets-src/ribs/mat/src/carcass-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-1-the-drowned-hanging-in-the-weed.jpg`, `references/drafts/working/real/ref-hide-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
The drowned carcass of a kite-wing, an animal of an unknown world, long dead, seen square on, 3 metres tall: it hangs head down by one leg, caught at the top of the frame, the other leg bent out sideways, the long neck and its tuft of pale tendrils hanging straight down at the bottom. Shrivelled pale hide shrunk tight on the ribs and the leg bones, split open in holes that show bone, one wing torn to rags of membrane on thin finger bones, strands of dark weed caught on it and a few small pale crabs clinging to it. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the drowned one, for its sagging skin (asked for by `ribs_sea_owner_2`).
Date: 2026-11-26

## `public/assets/ribs/mat/carcass-hung.jpg` and `public/assets/ribs/mat/carcass-hung-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/carcass-hung.png`, the generated picture, and `assets-src/ribs/mat/src/carcass-hung-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-1-the-drowned-hanging-in-the-weed.jpg`, `references/drafts/working/real/ref-hide-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
The drowned carcass of a kite-wing, an animal of an unknown world, long dead, alone on a pure black background. It is the pale carcass that hangs against the wall of weed in the first reference image: make that same carcass in the same pose, seen square on by the same camera, about 3 metres from its top to the ends of its limbs, and leave out the wall, the weed and the water behind it. It hangs head down, caught by its hind end at the upper left, and its trunk slants down toward the right. The trunk is shrunken, with smooth pale hide drawn tight over it, every rib standing through the hide, the knobs of the spine along its upper edge and a sunken belly. A short bare stump of wing bone sticks out to the left near the top. Four long thin limbs hang straight down from the trunk side by side, the two legs and the two bare wing arms, each with its knobbly joints showing under the hide and each ending in a small pale foot or a bare bone tip, none of them the same length. At the lower right end of the trunk the neck hangs straight down and ends in a tuft of long pale wet tendrils. Smooth pale grey-pink hide, wet, with a few dark splits that show bone, brown stains where it has split, and three or four small pale crabs clinging to the spine. The hide is smooth and whole over most of the body: it is not stringy, not shredded and not hung with rags. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole carcass lies inside the frame, with a margin of black on every side, and nothing touches the edge of the frame. Black means nothing is there: no rock, no weed, no water, no shadow thrown on anything, no mist, no other animal, no horizon, no sky. Soft even light from the front and from above, with no hard shadow and no bright side, so that the film can light it itself. Take the colours, the age and the character of the carcass from the first reference image. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the drowned one as the approved picture shows it, four limbs hanging with their joints and smooth pale hide: the first sheet came out stringy with one leg (asked for by `ribs_sea_owner_2`).
Date: 2026-11-26

## `public/assets/ribs/mat/feeder-a.jpg` and `public/assets/ribs/mat/feeder-a-h.png` and `public/assets/ribs/mat/feeder-a-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/feeder-a.png`, the generated picture, and `assets-src/ribs/mat/src/feeder-a-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-2-tide-pool-feeders.jpg`, `references/drafts/working/real/ref-wader-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
One kite-wing, feeding, an animal of an unknown world, about 2 metres tall, seen exactly from the side in an orthographic view, facing right. It is the nearest animal of the first reference image: the same pale ivory-grey skin, smooth and a little wet, never brown. It stands on two very long thin legs with knobbly joints, like a wading bird. Its body is small and lean. Its long neck ends, where a head would be, in nothing but a tuft of long pale wet tendrils. Its two wings are long thin finger bones with leathery membrane between them, pale ivory-grey with rust-orange along the edges. Its body is held level and both legs are straight. Its wings are folded over its back as one closed bundle, like a furled umbrella, the rust-orange edges showing as lines along the bundle. Its neck reaches down and forward, and the tuft of tendrils is spread out where it touches the ground. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a feeder in the pose of the nearest animal of the tide pool detail, pale as the picture has them, where the built ones are dark brown (asked for by `ribs_sea_owner_3`).
Date: 2026-11-26

## `public/assets/ribs/mat/feeder-b.jpg` and `public/assets/ribs/mat/feeder-b-h.png` and `public/assets/ribs/mat/feeder-b-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/feeder-b.png`, the generated picture, and `assets-src/ribs/mat/src/feeder-b-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-2-tide-pool-feeders.jpg`, `references/drafts/working/real/ref-wader-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
One kite-wing, in mid step, an animal of an unknown world, about 2 metres tall, seen exactly from the side in an orthographic view, facing right. It is the nearest animal of the first reference image: the same pale ivory-grey skin, smooth and a little wet, never brown. It stands on two very long thin legs with knobbly joints, like a wading bird. Its body is small and lean. Its long neck ends, where a head would be, in nothing but a tuft of long pale wet tendrils. Its two wings are long thin finger bones with leathery membrane between them, pale ivory-grey with rust-orange along the edges. One foot is lifted clear of the ground with the knee bent and the other leg is straight. Its wings are folded over its back as one closed bundle. Its neck is stretched out level in front of it and the tendrils at its end are flung outward in all directions, as if it were shaking water off them, with a few drops in the air. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a second feeder, mid step with the tendrils flung, so that the feeders are not copies of one pose (asked for by `ribs_sea_owner_3`).
Date: 2026-11-26

## `public/assets/ribs/mat/feeder-c.jpg` and `public/assets/ribs/mat/feeder-c-h.png` and `public/assets/ribs/mat/feeder-c-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/feeder-c.png`, the generated picture, and `assets-src/ribs/mat/src/feeder-c-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-2-tide-pool-feeders.jpg`, `references/drafts/working/real/ref-wader-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
One kite-wing, running, an animal of an unknown world, about 2 metres tall, seen exactly from the side in an orthographic view, facing right. It is the nearest animal of the first reference image: the same pale ivory-grey skin, smooth and a little wet, never brown. It stands on two very long thin legs with knobbly joints, like a wading bird. Its body is small and lean. Its long neck ends, where a head would be, in nothing but a tuft of long pale wet tendrils. Its two wings are long thin finger bones with leathery membrane between them, pale ivory-grey with rust-orange along the edges. It runs with a long stride: one leg reaching far forward, the other pushing off behind it, the body tipped forward. Its wings are half open and raised above its back, the membrane slack between the finger bones. Its neck is stretched forward and a little down, the tendrils streaming back. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a third feeder, running with the wings half open, for the ones that leave before the bore (asked for by `ribs_sea_owner_3`).
Date: 2026-11-26

## `public/assets/ribs/mat/perched.jpg` and `public/assets/ribs/mat/perched-h.png` and `public/assets/ribs/mat/perched-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/perched.png`, the generated picture, and `assets-src/ribs/mat/src/perched-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-3-the-colony.jpg`, `references/drafts/working/real/ref-wader-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
Six kite-wings, animals of an unknown world, perched, shown apart from each other in a grid of three across and two down, each alone in its own cell with black between it and its neighbours, each about 1.5 metres tall, seen from the side or at a three-quarter angle. They are the animals that sit on the ledges of the first reference image: rock-grey and dirty ivory skin, stained, with rust-orange only along the edges of the wing membranes. Each has two long thin legs, a small lean body, two wings of long thin finger bones with leathery membrane, and a long neck that ends in nothing but a tuft of pale tendrils. Every pose is different. Top row, from the left: one sitting low on a nest of black weed with its legs folded under it; one standing upright with its wings folded; one standing and stretching one wing straight out to the side. Bottom row, from the left: one with its neck raised straight up and its wings half lifted, squabbling; one with its neck curled back over its shoulder, preening a wing; one asleep with its neck tucked under a folded wing. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: six perched kite-wings in six poses for the colony, grey and dirty as the colony picture has them, where the built sitters are one cream drawing (asked for by `ribs_sea_owner_3`).
Date: 2026-11-26

## `public/assets/ribs/mat/fliers.jpg` and `public/assets/ribs/mat/fliers-h.png` and `public/assets/ribs/mat/fliers-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/fliers.png`, the generated picture, and `assets-src/ribs/mat/src/fliers-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-0-establishing.jpg`, `references/drafts/working/real/ref-wader-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
Four kite-wings, animals of an unknown world, in flight, shown apart from each other in a grid of two across and two down, each alone in its own cell with black between it and its neighbours, each about 3 metres from wing tip to wing tip. They are the fliers of the first reference image: pale grey-white skin and membrane, with rust-orange along the trailing edges of the wings, a small lean body, two long thin legs, and a long neck that ends in nothing but a tuft of pale tendrils. Each wing is long thin finger bones with thin leathery membrane stretched between them. Top left: seen from the side, wings raised high at the top of a beat, legs trailing. Top right: seen from the side, wings swept down at the bottom of a beat. Bottom left: seen from below, both wings spread wide and flat, banking. Bottom right: landing, seen from the side and a little in front, wings cupped forward and the long legs reaching down. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: four fliers in four poses, pale against the dark cloud as the pictures have them, where the built fliers are brown and of one pose (asked for by `ribs_sea_owner_3`).
Date: 2026-11-26

## `public/assets/ribs/mat/borewall-c.jpg` and `public/assets/ribs/mat/borewall-c-h.png` and `public/assets/ribs/mat/borewall-c-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/borewall-c.png`, the generated picture, and `assets-src/ribs/mat/src/borewall-c-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-4-the-bore-arrives.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
One section of a tidal bore, a single breaking wall of sea water, seen square on from in front: a section 70 metres wide and 30 metres tall that runs out of the frame at the left and right edges. The lip of the wave has pitched forward along its whole length and falls as one thick white curtain of water over the upper half of the wall, ragged along its lower edge. Under the curtain the dark green-grey face of the wave shows as a band, glassy and streaked with foam, and at its foot lies a band of white churn. The light comes from behind the wave and from the right, so the thin lip of the crest glows pale green. The wall reaches from the left edge of the frame to the right edge; black is above it and below it only. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a third section of the bore, with the lip pitched forward and falling as a white curtain, so that the wall has a dark standing face and a lip (asked for by `ribs_sea_owner_3`).
Date: 2026-11-26

## `public/assets/ribs/mat/seastreak.jpg` and `public/assets/ribs/mat/seastreak-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/seastreak.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-4-the-bore-arrives.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A material texture, seen straight down from above in an orthographic view: open sea under a gale, about 60 metres across. Dark slate-green water with a short steep chop, long thin white foam streaks all drawn out one way down the wind from the top of the picture to the bottom, unevenly spaced, and a few torn whitecaps with lace trailing from them. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the open sea of the opening from above: foam streaks down the wind and whitecaps, where the built sea is a plain sheet (asked for by `ribs_sea_owner_3`).
Date: 2026-11-26

## `public/assets/ribs/mat/blade-b.jpg` and `public/assets/ribs/mat/blade-b-h.png` and `public/assets/ribs/mat/blade-b-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/blade-b.png`, the generated picture, and `assets-src/ribs/mat/src/blade-b-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-0-establishing.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
One whole rib blade of the strait, seen square on from the side in an orthographic view: a thin arching fin of weathered bone turned to stone, 300 metres tall, with its foot at the bottom of the frame. It is slender, about 50 metres at the foot, and curves over to the left as it rises until its upper third hangs far out past its foot as a hook; the tip is broken off short, with a ragged pale break. Pale ivory and grey-cream, in thin level beds that show as fine ledges across it, pitted and flaked, with dark water stains running down it, white streaks below the ledges where animals roost, rust-orange lichen in patches on its upper side, and its lowest tenth hung with black-olive weed up to one level line. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a second blade, the thin hooked arch with a broken tip, so that the blades are not copies of one (asked for by `ribs_ground_owner_3`).
Date: 2026-11-26

## `public/assets/ribs/mat/blade-c.jpg` and `public/assets/ribs/mat/blade-c-h.png` and `public/assets/ribs/mat/blade-c-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/blade-c.png`, the generated picture, and `assets-src/ribs/mat/src/blade-c-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-0-establishing.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
One whole rib blade of the strait, seen square on from the side in an orthographic view: a broad fin of weathered bone turned to stone, 500 metres tall and 240 metres wide at its foot, with its foot at the bottom of the frame. It rises as a great ledged wall that narrows slowly and leans a little to the right, ending in a blunt hooked top. Pale ivory and grey-cream rock in thick level beds that stand out as ledges of unequal depth, with wide fields of rust-orange and yellow lichen on its upper half, dark water stains, white streaks below the ledges, one great block fallen out of its side leaving a square pale scar, a dark cave at its foot, and its lowest part hung with black-olive weed up to one level line. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a third blade, the broad ledged fin with lichen fields, a fallen block and a cave (asked for by `ribs_ground_owner_3`).
Date: 2026-11-26

## `public/assets/ribs/mat/stack-a.jpg` and `public/assets/ribs/mat/stack-a-h.png` and `public/assets/ribs/mat/stack-a-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/stack-a.png`, the generated picture, and `assets-src/ribs/mat/src/stack-a-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-4-the-bore-arrives.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
One sea stack at low tide, seen square on from the side in an orthographic view, 70 metres tall, with its foot at the bottom of the frame: a pillar of wet dark rock, broken and ledged, never smooth, narrower in its upper half and with a ragged top. Its lower two thirds are hung with ropes and curtains of olive and gold seaweed, glistening wet, that hang straight down, with wet black barnacled rock between the clumps. Above the weed the rock is dark grey with pale streaks of droppings and a little rust-orange lichen. This one is thick and leans slightly to the left, with one deep notch in its side. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: one of the two gate stacks before the bore: wet dark rock hung with olive-gold weed, where the built stacks are black pillars (asked for by `ribs_ground_owner_3`).
Date: 2026-11-26

## `public/assets/ribs/mat/stack-b.jpg` and `public/assets/ribs/mat/stack-b-h.png` and `public/assets/ribs/mat/stack-b-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/stack-b.png`, the generated picture, and `assets-src/ribs/mat/src/stack-b-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-4-the-bore-arrives.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
One sea stack at low tide, seen square on from the side in an orthographic view, 70 metres tall, with its foot at the bottom of the frame: a pillar of wet dark rock, broken and ledged, never smooth, narrower in its upper half and with a ragged top. Its lower two thirds are hung with ropes and curtains of olive and gold seaweed, glistening wet, that hang straight down, with wet black barnacled rock between the clumps. Above the weed the rock is dark grey with pale streaks of droppings and a little rust-orange lichen. This one is slender and split near the top into two unequal prongs. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the second gate stack, slender and split at the top (asked for by `ribs_ground_owner_3`).
Date: 2026-11-26

## `public/assets/ribs/mat/nearbar.jpg` and `public/assets/ribs/mat/nearbar-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/nearbar.png`, the generated picture, and `assets-src/ribs/mat/src/nearbar-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-0-establishing.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A gravel bar on the floor of a sea strait at low tide, a piece 12 metres wide and 12 metres tall. Shingle of rounded grey, slate and pale stones from 2 to 40 centimetres, sorted in loose drifts of unlike size, with films of wet dark sand between them, scraps of black-olive weed, shell grit, and a few larger dark stones. Wet, but with no reflections of the sky and no standing pools. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the gravel bar under the lens of the establishing picture, where the built shingle is ringed loaves and stipple (asked for by `ribs_ground_owner_3`).
Date: 2026-11-26

## `public/assets/ribs/mat/weedrock.jpg` and `public/assets/ribs/mat/weedrock-h.png` and `public/assets/ribs/mat/weedrock-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/ribs/mat/src/weedrock.png`, the generated picture, and `assets-src/ribs/mat/src/weedrock-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/1-ribs/ribs-2-tide-pool-feeders.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs ribs`.

```
A low heap of rock on a tidal flat, 4 metres wide and 1.5 metres tall, seen from the side at ground level, lying level across the frame. Dark wet boulders piled together and draped in gold and olive seaweed, glistening wet, that hangs over them in heavy straps and ropes, with dark gaps under the boulders and a few barnacles on the bare rock. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a weed-draped rock heap for the foregrounds of the feeders and the bore (asked for by `ribs_ground_owner_3`).
Date: 2026-11-26

## `public/assets/ribs/mat/materials.json`

Made by: `assets-src/materials/make-materials.mjs`.
From: the pictures above.
Prompt or command: `node assets-src/materials/make-materials.mjs ribs`.

What it holds: the settings of the script, and for each tile its name, the real width of one repeat in metres and its mean colour in linear light, so a place can tint or blend by number; for each plate its size in pixels, the real width it stands for and the name of its relief picture where it has one.
Date: 2026-11-26
