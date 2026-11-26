# Material pictures of the Breath

The working pictures of the Breath, made by the Builder for every owner of the place to read: surface tiles and a sky on 2026-11-25 (the list and every prompt are in `assets-src/materials/spec.py`), and on 2026-11-26 20 more for the second owners, most of them asked for by an owner: far backplates, feature sheets, ground plates and more tiles (`assets-src/materials/spec2.py`). Each began as one generated picture: 1254 px square, 1672 x 941, 941 x 1672, or a sky of 1536 x 1024. `assets-src/materials/make-materials.mjs` makes each surface tile repeat and writes a colour picture and a data picture from it, by the method of the Heart's materials, and writes each plate as it is.

How to read them: the colour picture is sRGB. For a tile, in the data picture `<name>-nh.png` red and green are the slope on x and y (0.5 is level) and blue is height, taken from the picture's own light and dark. `metres` in `materials.json` is the real width one repeat of a tile, or the whole of a plate, stands for. A face with beds or courses (`ledge`, `strata`, `cliff`, `canal`, `bark`, `hoop`) repeats well from left to right; lay its height once or break the repeat. Blend two scales of a tile and break it with the place's own large shapes so no repeat shows. These pictures carry no light: the place's rig lights them.

A plate is one whole picture and does not repeat: a far backplate (the far distance of a view, with its own sky and a level horizon), a feature sheet (one thing whole on black under flat light), or a ground plate (one piece of ground from straight above). Where a plate has a relief picture, `<name>-h.png`, it is grey and the size of the colour picture: white is highest (ground plates) or nearest (feature sheets and faces), black is lowest or furthest, and on a feature sheet the black round the subject is no subject. The relief was made by a second call from the colour picture, so it lies on it within a few pixels and its greys are a guess at the form, good for slope and for parallax, not a measured height. Where the generated picture came with a clear background, the plate is laid on black and `<name>-a.png` is its cover: grey, white where the subject is. The animals in these pictures have no eyes and no ears.

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

## `public/assets/breath/mat/far.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/far.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-0-establishing.jpg`, `references/drafts/working/real/plate-norris-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
A photograph taken soon after sunrise with a long lens from a low rise on a flat shelf of pale rock by a cold sea, looking through thin fog toward a line of sea cliffs about three kilometres away. Only the far distance is in the picture, everything further than about one kilometre: a long line of pale layered cliffs about 200 metres tall, snow on their ledges, runs from the middle of the frame out past the right edge, with one great dark cave mouth in the cliff right of centre and a slow river of fog pouring out of the cave and down the scree below it. Left of the cliffs the low sun, outside the frame beyond the upper left corner, burns through a cream and peach fog bank, and two tall columns of white steam rise from far vents and lean in a light wind. In front of the cliffs lies flat pale shelf rock with long low shreds of ground fog and thin gleams of water. The foot of the cliffs lies at the middle of the frame. Below it there is only flat pale wet rock fading into fog: no pit, no near rocks, no channel, no plants. This is a background plate for a film: only the far distance, to stand behind built scenery. The first reference image is the place as the film sees it: keep the forms of its far distance, its light, its weather and its colours, and leave out everything near. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. The horizon is exactly level, straight from the left edge to the right edge. Output one wide landscape image, sixteen units wide and nine tall. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No animals, no birds.
```

Takes: 1 made, take 1 kept.
Why this one: the cliffs, the cave and the fog bank beyond the shelf.
Date: 2026-11-26

## `public/assets/breath/mat/shaftwall.jpg` and `public/assets/breath/mat/shaftwall-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/shaftwall.png`, the generated picture, and `assets-src/breath/mat/src/shaftwall-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-4-down-the-shaft.jpg`, `references/drafts/working/real/plate-tube-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
The inner wall of a great natural shaft, a section 60 metres wide and 34 metres tall, as if the round wall were unrolled flat. Three great horizontal hoops cross it one above another, each a ruined ring of pale cartilage turned half to stone about 4 metres thick: ivory and grey-white, cracked through in places, with snapped ends where a piece has fallen out, chipped edges, rust-ochre stain running down from each, patches of dark green growth and long drips. Between the hoops the wall is dark wet grey-brown rock, ribbed and glistening, with black slime streaks, pale mineral runs and small ledges that hold rubble. One hoop is broken away for a third of its length. The surface fills the whole frame edge to edge, square on, with no background showing. Flat, even, shadowless light from the front, so that no side is brighter than another: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of a rock face seen square on. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. White is what stands furthest out toward the viewer and black is what lies deepest in. Cracks, joints, caves, hollows and undercut bands are dark; ledges, ribs, bulges and the noses of blocks are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the wall of the shaft with its hoops, for the shape and the stain of the rings.
Date: 2026-11-26

## `public/assets/breath/mat/shelfplate.jpg` and `public/assets/breath/mat/shelfplate-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/shelfplate.png`, the generated picture, and `assets-src/breath/mat/src/shelfplate-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-0-establishing.jpg`, `references/drafts/working/real/plate-porcelain-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
A flat shelf of pale rock beside a great pit, planed by the sea, a piece 48 metres wide and 27 metres tall. Pale ivory and cream bedded rock in broad layered plates with broken stepped edges, each plate a few centimetres to half a metre above the next, pebble scree and grit lying in the hollows, dark wet pools in the lowest places, thin rust and olive weed stain along the cracks, a few loose slabs. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the shelf beside the pit, as broken bedded plates (asked for by `breath_ground_owner_2`).
Date: 2026-11-26

## `public/assets/breath/mat/ribarch.jpg` and `public/assets/breath/mat/ribarch-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/ribarch.png`, the generated picture, and `assets-src/breath/mat/src/ribarch-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-4-down-the-shaft.jpg`, `references/drafts/working/real/plate-terrace-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
One broken arch from the wall of a great shaft, seen square on: a curved beam of pale cartilage turned half to stone, 24 metres long and 4 metres thick, lying level across the frame with a gentle upward bow. Ivory and grey-white with rust-ochre stain, patches of dark green growth, long dark drips from its lower edge, deep cracks, chipped edges, and both ends snapped off raggedly. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: one broken rib of the shaft (asked for by `breath_ground_owner_2`).
Date: 2026-11-26

## `public/assets/breath/mat/slab.jpg` and `public/assets/breath/mat/slab-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/slab.png`, the generated picture, and `assets-src/breath/mat/src/slab-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-4-down-the-shaft.jpg`, `references/drafts/working/real/plate-terrace-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
One fallen slab of pale rock, seen square on: a cracked block 9 metres wide and 5 metres tall with chipped and broken edges, pale ivory and cream with thin bedding lines, rust stain in the cracks, a little grit lying on its ledges and one corner split away. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a fallen slab of the collapsed side (asked for by `breath_ground_owner_2`).
Date: 2026-11-26

## `public/assets/breath/mat/scree.jpg` and `public/assets/breath/mat/scree-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/scree.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-2-the-rim.jpg`, `references/drafts/working/real/plate-porcelain-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
A material texture, seen straight down from above in an orthographic view: pebble scree and grit lying between plates of pale rock, about 3 metres across. Angular pale cream, grey and tan fragments from grit to fist size, a few larger flat pieces, darker damp grit beneath. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the scree in the hollows of the shelf (asked for by `breath_ground_owner_2`).
Date: 2026-11-26

## `public/assets/breath/mat/wetrock.jpg` and `public/assets/breath/mat/wetrock-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/wetrock.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-1-waders-feeding-in-the-channel.jpg`, `references/drafts/working/real/plate-surf-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
A material texture, seen straight down from above in an orthographic view: dark wet pitted shelf rock at the edge of the sea, about 1.5 metres across. Grey-brown and slate rock, rough and pitted, glistening wet, with small pools in the pits, grit, thin green film and a few pale barnacles. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the wet rock of the near foreground (asked for by `breath_ground_owner_2`).
Date: 2026-11-26

## `public/assets/breath/mat/wader.jpg` and `public/assets/breath/mat/wader-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/wader.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-1-waders-feeding-in-the-channel.jpg`, `references/drafts/working/real/ref-wader-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
One wader, an animal of an unknown world, standing, seen exactly from the side in an orthographic view, facing right, about 3.2 metres tall at the back. It stands on four very long thin legs that go straight down, with knobbly knees and small dark hooves. Its body is a lean deep trunk under thin pale pink-white skin, with every rib, the hip bones and the knuckles of the spine showing through, faint blue veins and a few red sores. Its long neck is stretched level forward and ends, where a head would be, in nothing but a ragged mop of long pale pink filaments, wet and dripping, with strands of olive weed caught in them. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

Takes: 1 made, take 1 kept.
Why this one: the wader whole in side view, in a rest pose.
Date: 2026-11-26

## `public/assets/breath/mat/plume.jpg` and `public/assets/breath/mat/plume-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/plume.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-3-gill-plumes-on-the-lip.jpg`, `references/drafts/working/real/ref-tissue-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
One gill-plume, a growth of an unknown world, whole, seen square on: a low tangled bush about 1.5 metres tall and 2 metres wide rooted on a lip of pale rock. A dozen stems rise from one root and arch outward, each carrying hundreds of fine wet crimson and wine-red barbs like the gills of a fish or a feather, the barbs hanging and tangled, darker at the stem and thin and bright at their tips, with drops of water on them. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

Takes: 1 made, take 1 kept.
Why this one: one gill-plume whole, for its strands.
Date: 2026-11-26

## `public/assets/breath/mat/bed.jpg` and `public/assets/breath/mat/bed-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/bed.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-1-waders-feeding-in-the-channel.jpg`, `references/drafts/working/real/plate-terrace-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
A material texture, seen straight down from above in an orthographic view: the bed of a shallow tide channel in pale rock, with no water on it, about 3 metres across. Pale cream travertine plates and rounded cobbles with silt between them, a thin olive-green film of algae on the stones and loose green threads lying one way. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the bed of the channel, to be seen through its water (asked for by `breath_life_owner_2`).
Date: 2026-11-26

## `public/assets/breath/mat/scum.jpg` and `public/assets/breath/mat/scum-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/scum.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-1-waders-feeding-in-the-channel.jpg`, `references/drafts/working/real/plate-norris-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
Scum on water: pale foam flecks, salt scum and small bubbles drifting on still water, about 1.5 metres across, in loose rafts and thin broken lines with empty black between them. The subject lies on pure black: black means nothing is there, and brightness means how much is there. The field fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this belongs to: take its colour and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the scum line at banks and legs (asked for by `breath_life_owner_2`).
Date: 2026-11-26

## `public/assets/breath/mat/carcass.jpg` and `public/assets/breath/mat/carcass-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/carcass.png`, the generated picture, and `assets-src/breath/mat/src/carcass-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-2-the-rim.jpg`, `references/drafts/working/real/ref-hide-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
The carcass of a wader, an animal of an unknown world, long dead, lying collapsed on its side and seen from straight above, about 4.5 metres long. The trunk is sunk flat, its pale skin split open over the ribs and the hip bones, which stand through it; the long neck curves away and ends in a fan of pale dried tendrils spread on the ground; the four long legs are folded under and beside it, each ending in a small dark hoof. Pale grey-pink dried hide, stained brown where it has split. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the dead one at the rim (asked for by `breath_life_owner_2`).
Date: 2026-11-26

## `public/assets/breath/mat/flank.jpg` and `public/assets/breath/mat/flank-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/flank.png`, the generated picture, and `assets-src/breath/mat/src/flank-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-1-waders-feeding-in-the-channel.jpg`, `references/drafts/working/real/ref-hide-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
The bare trunk of a living wader, an animal of an unknown world, seen exactly from the side, 1.4 metres long: only the trunk, with the rump at the left and the chest at the right, cut off cleanly where the legs and the neck would begin. Thin pale pink-white skin over every rib, the hip bone and the knuckles of the spine, with faint blue veins, fine wrinkles, a few raw red sores and small scars. No hair, no feathers. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the trunk of a wader, for its hide laid by rest position (asked for by `breath_life_owner_2`).
Date: 2026-11-26

## `public/assets/breath/mat/frond.jpg` and `public/assets/breath/mat/frond-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/frond.png`, the generated picture, and `assets-src/breath/mat/src/frond-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-3-gill-plumes-on-the-lip.jpg`, `references/drafts/working/real/ref-tissue-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
One frond of a gill-plume, a growth of an unknown world, laid flat and seen from straight above, 1.5 metres long, lying level across the frame with its root at the left. A single dark red stem carries hundreds of fine wet crimson barbs on both sides like a feather or the gill of a fish, the barbs longest in the middle, tangled and clumped in places and thinning to hair at the tip. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: one frond, for the strands of the plumes (asked for by `breath_life_owner_2`).
Date: 2026-11-26

## `public/assets/breath/mat/carcass-low.jpg` and `public/assets/breath/mat/carcass-low-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/carcass-low.png`, the generated picture, and `assets-src/breath/mat/src/carcass-low-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-2-the-rim.jpg`, `references/drafts/working/real/ref-hide-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
The carcass of a wader, an animal of an unknown world, long dead, alone on a pure black background. It is the carcass that lies on the rock in the foreground of the first reference image: make that same animal in the same pose, seen by the same low camera, about one metre above the ground and five metres away, looking only slightly down at it, so that it is seen from the side and a little from above and never from straight above. It lies collapsed on its side, about 4.5 metres from the end of its tendrils to its hooves: the sunken trunk in the middle of the frame, its pale skin split open over the ribs and the hip bones, which stand through it; the long neck lying along the ground to the left and ending in a fan of dull red dried tendrils spread flat; the four long thin legs stretched out to the right and toward the camera, each ending in a small dark hoof. Pale grey-pink dried hide, stained brown where it has split, a little grit lying on it. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole carcass lies inside the frame, with a margin of black on every side, and nothing touches the edge of the frame. Black means nothing is there: no ground, no rock, no shadow thrown on any ground, no mist, no plants, no other animal, no horizon, no sky. Soft even light from the front and from above, with no hard shadow and no bright side, so that the film can light it itself. Take the colours, the age and the character of the carcass from the first reference image. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the dead one at the rim as the low lens of breath-2 sees it, because a picture taken from straight above cannot carry a view from one metre up (asked for by `breath_life_owner_2`).
Date: 2026-11-26

## `public/assets/breath/mat/frond-b.jpg` and `public/assets/breath/mat/frond-b-h.png` and `public/assets/breath/mat/frond-b-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/frond-b.png`, the generated picture, and `assets-src/breath/mat/src/frond-b-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-3-gill-plumes-on-the-lip.jpg`, `references/drafts/working/real/ref-tissue-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
One frond of a gill-plume, a growth of an unknown world, laid flat and seen from straight above, 1.5 metres long, lying level across the frame with its root at the left. A single dark stem, wine red going to nearly black, carries fine wet crimson barbs on both sides like a feather or the gill of a fish. This frond is sparse and ragged: there are gaps where barbs are missing, some barbs are torn short, a few are bleached pale pink or straw, the rest are clumped in wet locks, and the tip thins to a few wet hairs with clear drops hanging on them. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a second frond, sparser and more ragged, so that the fronds of a plume are not copies of one (asked for by `breath_life_owner_3`).
Date: 2026-11-26

## `public/assets/breath/mat/holdfast.jpg` and `public/assets/breath/mat/holdfast-h.png` and `public/assets/breath/mat/holdfast-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/holdfast.png`, the generated picture, and `assets-src/breath/mat/src/holdfast-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-3-gill-plumes-on-the-lip.jpg`, `references/drafts/working/real/ref-tissue-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
The holdfast of a gill-plume, a growth of an unknown world: the fleshy foot by which it grips the rock, 0.8 metres wide, seen square on from the side. Pale pink-brown wet root flesh in thick folds, spreading at the bottom into blunt toes that grip downward. From its top rise the cut stubs of five dark red stems, each as thick as a thumb and a hand long. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the fleshy foot of a plume with the stubs of its stems, which the built plumes lack (asked for by `breath_life_owner_3`).
Date: 2026-11-26

## `public/assets/breath/mat/tassel.jpg` and `public/assets/breath/mat/tassel-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/tassel.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-1-waders-feeding-in-the-channel.jpg`, `references/drafts/working/real/ref-wader-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
The head tuft of a wader, an animal of an unknown world, hanging straight down, seen from the side, 0.9 metres long, its root at the top of the frame. A heavy wet mop of pink-red tendrils clumped in uneven strands, thick at the root and ragged at the ends, with grey silt and strands of olive weed caught in it and clear drops of water hanging from the tips. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

Takes: 1 made, take 1 kept.
Why this one: the wet tuft at the end of a wader neck, heavy and dripping, where the built tassel is small (asked for by `breath_life_owner_3`).
Date: 2026-11-26

## `public/assets/breath/mat/drypad.jpg` and `public/assets/breath/mat/drypad-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/drypad.png`, the generated picture, and `assets-src/breath/mat/src/drypad-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-2-the-rim.jpg`, `references/drafts/working/real/plate-porcelain-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
Dry rock at the rim of a great pit, a piece 6 metres wide and 6 metres tall. Warm tan-grey gritty rock, water-worn and rounded, dry, with small drifts of grit lying in its hollows, scattered small pebbles, a few hairline cracks, and one dark damp stain a little off centre. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the dry gritty rock under the dead wader of the rim detail, where the built ground is a striped dark plate (asked for by `breath_ground_owner_3`).
Date: 2026-11-26

## `public/assets/breath/mat/pebbles.jpg` and `public/assets/breath/mat/pebbles-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/breath/mat/src/pebbles.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/3-breath/breath-0-establishing.jpg`, `references/drafts/working/real/plate-porcelain-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs breath`.

```
A material texture, seen straight down from above in an orthographic view: a bed of shingle and grit on a rock shelf, about 1.5 metres across. Rounded pale grey and cream pebbles from 1 to 8 centimetres, most of them small, lying close on coarse pale grit, dry on top and darker and damp between. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the pale shingle and grit of the lower right of the establishing picture and at the roots of the plumes (asked for by `breath_ground_owner_3`).
Date: 2026-11-26

## `public/assets/breath/mat/materials.json`

Made by: `assets-src/materials/make-materials.mjs`.
From: the pictures above.
Prompt or command: `node assets-src/materials/make-materials.mjs breath`.

What it holds: the settings of the script, and for each tile its name, the real width of one repeat in metres and its mean colour in linear light, so a place can tint or blend by number; for each plate its size in pixels, the real width it stands for and the name of its relief picture where it has one.
Date: 2026-11-26
