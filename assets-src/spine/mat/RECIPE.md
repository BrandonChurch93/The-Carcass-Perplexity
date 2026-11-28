# Material pictures of the Spine

The working pictures of the Spine, made by the Builder for every owner of the place to read: surface tiles and a sky on 2026-11-25 (the list and every prompt are in `assets-src/materials/spec.py`), and on 2026-11-26 27 more for the second owners, most of them asked for by an owner: far backplates, feature sheets, ground plates and more tiles (`assets-src/materials/spec2.py`). Each began as one generated picture: 1254 px square, 1672 x 941, 941 x 1672, or a sky of 1536 x 1024. `assets-src/materials/make-materials.mjs` makes each surface tile repeat and writes a colour picture and a data picture from it, by the method of the Heart's materials, and writes each plate as it is.

How to read them: the colour picture is sRGB. For a tile, in the data picture `<name>-nh.png` red and green are the slope on x and y (0.5 is level) and blue is height, taken from the picture's own light and dark. `metres` in `materials.json` is the real width one repeat of a tile, or the whole of a plate, stands for. A face with beds or courses (`ledge`, `strata`, `cliff`, `canal`, `bark`, `hoop`) repeats well from left to right; lay its height once or break the repeat. Blend two scales of a tile and break it with the place's own large shapes so no repeat shows. These pictures carry no light: the place's rig lights them.

A plate is one whole picture and does not repeat: a far backplate (the far distance of a view, with its own sky and a level horizon), a feature sheet (one thing whole on black under flat light), or a ground plate (one piece of ground from straight above). Where a plate has a relief picture, `<name>-h.png`, it is grey and the size of the colour picture: white is highest (ground plates) or nearest (feature sheets and faces), black is lowest or furthest, and on a feature sheet the black round the subject is no subject. The relief was made by a second call from the colour picture, so it lies on it within a few pixels and its greys are a guess at the form, good for slope and for parallax, not a measured height. Where the generated picture came with a clear background, the plate is laid on black and `<name>-a.png` is its cover: grey, white where the subject is. The animals in these pictures have no eyes and no ears.

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

## `public/assets/spine/mat/far.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/far.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-0-establishing.jpg`, `references/drafts/working/real/plate-storm-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A photograph taken at dusk with a long lens from a high knife ridge above a sea of cloud, looking along the ridge. Only the far distance is in the picture, everything further than about three kilometres: the ridge runs away from the left of the frame toward the right as a chain of separate rock spires, each a leaning blade of blue-grey rock with snow in its gullies and a tip burned black, each smaller, bluer and fainter than the one before, the last ones only shapes in the haze. Storm cloud stands against the left side of the ridge and pours over the low saddles between the spires in long falling veils. A sea of cloud lies far below on the right, its tops rolling, grey-blue and mauve. Above, the storm is dark blue-grey and violet with torn undersides; along the horizon at the right lies one narrow band of clear sky, orange and pale yellow. No lightning. The horizon lies a little below the middle of the frame. This is a background plate for a film: only the far distance, to stand behind built scenery. The first reference image is the place as the film sees it: keep the forms of its far distance, its light, its weather and its colours, and leave out everything near. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. The horizon is exactly level, straight from the left edge to the right edge. Output one wide landscape image, sixteen units wide and nine tall. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No animals, no birds.
```

Takes: 1 made, take 1 kept.
Why this one: the far spires, the storm and the cloud sea beyond the built ridge.
Date: 2026-11-26

## `public/assets/spine/mat/tower.jpg` and `public/assets/spine/mat/tower-h.png` and `public/assets/spine/mat/tower-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/tower.png`, the generated picture, and `assets-src/spine/mat/src/tower-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-0-establishing.jpg`, `references/drafts/working/real/plate-ridge-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
One whole spire of the ridge, seen square on from the side in an orthographic view: a mountain of blue-grey and tan rock that is the weathered bone of a colossal vertebra, 500 metres tall, with its foot at the bottom of the frame. It rises as a steep broken wall and leans over to the left as a great blade whose tip is burned black and glassy. Its face is split by long joints into slabs and flakes with sharp edges, snow lies in every gully and on every ledge, a round dark tunnel mouth opens low in its side, and broken rock and snow fans lie at its foot. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: one spire whole, for the shape of the leaning blade and its broken face.
Date: 2026-11-26

## `public/assets/spine/mat/runner.jpg` and `public/assets/spine/mat/runner-a.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/runner.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-4-inside-the-canal.jpg`, `references/drafts/working/real/ref-dusk-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
One ridge-runner, an animal of an unknown world, standing, seen exactly from the side in an orthographic view, facing right, about 1.8 metres tall at the shoulder. A heavy four-legged animal of the high cold, with a humped shoulder and thick legs that end in broad dark paws with blunt claws, under a long shaggy coat of dirty cream and pale grey hair that hangs in matted locks almost to the ground, with ice frozen into the tips. Where a face would be, the coat parts round a bunch of short dark leathery tendrils that hang down. The animal has no eyes and no ears anywhere on it and no face: it is not a monster and not cute, an animal of an unknown world built for one way of feeding. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

Takes: 1 made, take 1 kept.
Why this one: the ridge-runner whole in side view, for the shape under the coat.
Date: 2026-11-26

## `public/assets/spine/mat/scorchfield.jpg` and `public/assets/spine/mat/scorchfield-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/scorchfield.png`, the generated picture, and `assets-src/spine/mat/src/scorchfield-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-1-where-lightning-came-to-ground.jpg`, `references/drafts/working/real/plate-ridge-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
The place on a high snowy ridge where lightning came to ground, a piece 14 metres wide and 7.9 metres tall. In the middle, about 4 metres across, bare rock burned black and glassy, with fused branching channels like roots spreading outward from one point; round it a ring where the snow has melted back and refrozen as clear wet ice over dark rock; outside the ring cold blue-white wind-packed snow with sharp wind ridges that all run one way and a few dark stones. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the ground where the bolt came down, whole (asked for by `spine_ground_owner_2 and spine_storm_owner_2`).
Date: 2026-11-26

## `public/assets/spine/mat/burn.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/burn.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-1-where-lightning-came-to-ground.jpg`, `references/drafts/working/real/ref-dusk-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A piece of the coat and hide of a large shaggy animal, laid flat and seen square on, about 1 metre wide. Long cream-white matted fur round the edges; toward the middle the fur is singed to short black curled stubs; in the middle one long raw split in the skin, red-black and dry, with charred edges. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

Takes: 1 made, take 1 kept.
Why this one: the burn on the scorched one (asked for by `spine_storm_owner_2`).
Date: 2026-11-26

## `public/assets/spine/mat/membrane.jpg` and `public/assets/spine/mat/membrane-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/membrane.png`, the generated picture, and `assets-src/spine/mat/src/membrane-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-2-tether-kites-on-the-first-spire.jpg`, `references/drafts/working/real/ref-tissue-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
One ribbon of a tether-kite, a growth of an unknown world, laid flat and seen square on: 14 metres long and 1.5 metres at its widest, lying level across the frame, widest near its stalk at the left and tapering to the right. A translucent skin like the skin of a fish or a jellyfish, grey-white with a faint violet sheen, with fine branching veins, dark frayed edges, one tear half way through it, and a ragged torn end. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: one kite ribbon, for the membrane of the kites (asked for by `spine_storm_owner_2`).
Date: 2026-11-26

## `public/assets/spine/mat/holdfast.jpg` and `public/assets/spine/mat/holdfast-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/holdfast.png`, the generated picture, and `assets-src/spine/mat/src/holdfast-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-2-tether-kites-on-the-first-spire.jpg`, `references/drafts/working/real/ref-tissue-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
The holdfast of a tether-kite, a growth of an unknown world, seen square on, about 1.5 metres across: a cluster of dark leathery knobs and bulbs like the holdfast of kelp, packed together and crusted with white rime, with several thin dark stalks leaving it toward the right. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the holdfasts of the kites in the clefts (asked for by `spine_storm_owner_2`).
Date: 2026-11-26

## `public/assets/spine/mat/tendril.jpg` and `public/assets/spine/mat/tendril-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/tendril.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-4-inside-the-canal.jpg`, `references/drafts/working/real/ref-hide-2.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A material texture, seen straight on: the skin of a dark leathery tendril, about 0.3 metres across. Dark grey-brown wet leathery skin with fine cross wrinkles and small bumps, a slight sheen, and grains of white rime frost in the creases. No hair. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the skin of the tendrils of the faces (asked for by `spine_storm_owner_2`).
Date: 2026-11-26

## `public/assets/spine/mat/stump.jpg` and `public/assets/spine/mat/stump-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/stump.png`, the generated picture, and `assets-src/spine/mat/src/stump-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-3-the-strike-on-the-third-spire.jpg`, `references/drafts/working/real/plate-ridge-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
One whole spire of a high ridge, seen square on from the side in an orthographic view: a snapped stump of blue-grey and tan rock that is the weathered bone of a colossal vertebra, 250 metres tall, with its foot at the bottom of the frame. Its upper half has broken away long ago: the top is split into two jagged prongs, burned black at their tips, and one whole shoulder has fallen and lies as a slope of huge blocks against its side. The face is split by long joints into slabs and flakes with sharp edges, with snow in every gully and on every ledge. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a second spire, unlike the first: a snapped stump (asked for by `spine_ground_owner_2`).
Date: 2026-11-26

## `public/assets/spine/mat/horn.jpg` and `public/assets/spine/mat/horn-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/horn.png`, the generated picture, and `assets-src/spine/mat/src/horn-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-3-the-strike-on-the-third-spire.jpg`, `references/drafts/working/real/plate-ridge-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
One whole spire of a high ridge, seen square on from the side in an orthographic view: a slender horn of blue-grey and tan rock that is the weathered bone of a colossal vertebra, 250 metres tall, with its foot at the bottom of the frame. It rises thin and steep from a narrow base and hooks over to the right at the top like a thorn, its tip burned black and glassy. The face is split by long joints that follow its lean into thin slabs and flakes with sharp edges, with thin lines of snow in the cracks and a small snow fan at its foot. The whole subject lies inside the frame on a pure black background, with a margin of black on every side, and nothing touches the edge of the frame. Flat, even, shadowless light from the front, so that no side is brighter than another and no shadow is cast: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No ground, no horizon, no sky.
```

The prompt of the relief:

```
The reference image shows one subject on a black background. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. The background stays pure black. On the subject, white is what stands nearest to the viewer and dark grey is what lies furthest back. Cracks, holes, hollows and folds are dark; ridges, bulges, bones and raised edges are light. Smooth continuous greys that keep every outline and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: a third spire, unlike the first: a slender hooked horn (asked for by `spine_ground_owner_2`).
Date: 2026-11-26

## `public/assets/spine/mat/stormwall.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/stormwall.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-0-establishing.jpg`, `references/drafts/working/real/plate-storm-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A photograph of storm cloud only, at dusk, seen from a high mountain crest looking into the wind: the windward wall of a thunderstorm standing close, heaped towers of dark blue-grey and violet cloud one above another, darkest beneath, their edges torn sideways by a gale, with grey veils of falling snow hanging under the lowest bellies and paler mauve where the cloud thins high up. Only cloud is in the frame: no land, no ridge, no horizon, no band of clear sky, no lightning, no sun. The first reference image is the place this storm belongs to: take its colour and its light from there. The second reference image is a real photograph: it is the standard for how a camera records a real storm, with real soft gradients and real cloud structure and no painted or stylised look. Output one wide landscape image, sixteen units wide and nine tall. Photographic, no text, no logo, no people, no birds.
```

Takes: 1 made, take 1 kept.
Why this one: the storm wall, as a picture sky that can flow (asked for by `spine_ground_owner_2`).
Date: 2026-11-26

## `public/assets/spine/mat/icefloor.jpg` and `public/assets/spine/mat/icefloor-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/icefloor.png`, the generated picture, and `assets-src/spine/mat/src/icefloor-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-4-inside-the-canal.jpg`, `references/drafts/working/real/plate-tube-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
The frozen floor of a tunnel through rock, a strip 8 metres wide and 14 metres long that runs from the top edge of the frame to the bottom edge. Dark clear ice with white cracks and frozen ripples down the middle, snow drifted in along both the left and the right edge, a few chunks of broken ice and small dark stones frozen in. The strip looks the same in character at the top and at the bottom, so that it can be repeated along its length. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the floor of the canal; repeat it along its length with every second copy mirrored (asked for by `spine_ground_owner_2`).
Date: 2026-11-26

## `public/assets/spine/mat/ledge.jpg` and `public/assets/spine/mat/ledge-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/ledge.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-3-the-strike-on-the-third-spire.jpg`, `references/drafts/working/real/plate-ridge-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A material texture, seen square on in an orthographic view: the flank of a high mountain ridge, a section about 40 metres tall. Dark blue-grey rock in level beds of unequal thickness, broken into blocks and short walls, with snow lying on every ledge and thin snow in the cracks. The beds run exactly horizontal. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the bedded flanks below the spires (asked for by `spine_ground_owner_2`).
Date: 2026-11-26

## `public/assets/spine/mat/rime.jpg` and `public/assets/spine/mat/rime-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/rime.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-2-tether-kites-on-the-first-spire.jpg`, `references/drafts/working/real/plate-ridge-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A material texture, seen square on in an orthographic view: rime ice on pale rock, about 3 metres across. White feathers and plates of rime grown into the wind, all pointing one way from right to left, thick on every edge and thin in the hollows, with pale tan-grey rock showing between them. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the rime on the first spire (asked for by `spine_ground_owner_2`).
Date: 2026-11-26

## `public/assets/spine/mat/stormwall-lit.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/stormwall-lit.png`, the generated picture. Pictures passed to the model with the prompt: `assets-src/spine/mat/src/stormwall.png`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
The reference image is a photograph of the wall of a thunderstorm at dusk. Make the same photograph, with every cloud form exactly where it is, at the instant that lightning flashes deep inside the cloud: the towers glow from within, violet-white, brightest in two or three places in the heart of the cloud and falling off softly through it, and the edges of the nearer towers stand dark against the glow. No lightning channel and no bolt is visible, only the glow inside the cloud. Nothing else changes: the same framing and the same cloud shapes, pixel for pixel. Photographic, no text, no logo.
```

Takes: 1 made, take 1 kept.
Why this one: the same storm wall lit from inside by a strike, to blend with the first by each strike (asked for by `spine_ground_owner_2`).
Date: 2026-11-26

## `public/assets/spine/mat/scorch.jpg` and `public/assets/spine/mat/scorch-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/scorch.png`, the generated picture, and `assets-src/spine/mat/src/scorch-h.png`, the generated relief. Pictures passed to the model with the prompt: `assets-src/spine/mat/src/scorch-in.png`, `references/drafts/working/real/plate-ridge-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
The first reference image is a blurred, low-resolution survey photograph, seen straight down from above, of a piece of ground 6 metres wide and 3.4 metres tall on a high snowy ridge, where lightning came to ground: bare rock burned black and glassy in the middle, with fused branching channels like roots spreading from one point, a ring of refrozen clear ice round it and wind-packed snow outside. Make the same photograph at full resolution. Keep every form exactly where it is and at the same size: add nothing new at this scale and move nothing. Add what a real camera records at this scale and the first image lacks: the glassy shine, bubbles and fine cracks of fused rock, the raised glazed rims of the channels, grit and small burst flakes of stone, clear ice with white cracks and trapped bubbles over dark rock, and the grain and sharp wind edges of packed snow. Flat, even, shadowless overcast light. The second reference image is a real photograph: it is the standard for how a camera records real rock, ice and snow, with real grain and micro detail and no painted or stylised look. Photographic, sharp from edge to edge, no text, no logo, no people, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the middle of the scorched ground close, for the detail of the scorched one; it lies on the middle 6 metres of `scorchfield` (asked for by `spine_storm_owner_2`).
Date: 2026-11-26

## `public/assets/spine/mat/bolt.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/bolt.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-3-the-strike-on-the-third-spire.jpg`, `references/drafts/working/real/plate-storm-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A photograph of one lightning stroke at night on a pure black background, taken with a short exposure: a single cloud-to-ground channel that enters at the top centre of the frame and runs down to the bottom centre, crooked and kinked the whole way as real lightning is and never a regular zigzag, thin and blinding white at its core with a narrow violet-blue edge. Eight or ten fine side branches leave it at shallow angles, each fainter and thinner than the channel, forking again and ending in nothing. Black means nothing is there: no glow fog, no cloud, no rain, no ground, no horizon, no stars. The first reference image is the storm this stroke belongs to: take the violet of its lightning from there, and nothing of its composition. The second reference image is a real photograph of a storm: it is the standard for how a camera records the real thing, with no painted, drawn or stylised look. Output one tall portrait image, nine units wide and sixteen tall. Photographic, sharp, no text, no logo, no border, no people.
```

Takes: 1 made, take 1 kept.
Why this one: the core of the strike, so that the bolt is a photographed channel and not a drawn zigzag; it lies on black, so its brightness is its cover (asked for by `spine_storm_owner_2`).
Date: 2026-11-26

## `public/assets/spine/mat/strikesky.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/strikesky.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-3-the-strike-on-the-third-spire.jpg`, `references/drafts/working/real/plate-storm-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A photograph of storm cloud only, at nightfall, taken with a long lens from a high mountain crest, at the moment a lightning stroke inside the cloud lights it. In the upper middle of the frame the cloud glows violet-white from within, brightest at one place and falling off through violet to dark blue-grey, so that the heaped towers and bellies round the glow stand as dark heavy masses with lit edges. The rest of the cloud wall is very dark. Low at the right, about a third of the way up the frame, a thin band of orange dusk light shows under the cloud base. Below it a rolling sea of cloud tops fills the bottom quarter of the frame from the left edge to the right edge, level, dark blue-grey with paler crests. Only cloud and that band of light are in the frame: no land, no ridge, no spires, no lightning channel, no bolt, no sun, no stars. The first reference image is the place this sky belongs to: take its colours, its darkness and its light from there, and leave out its spires and its bolt. The second reference image is a real photograph: it is the standard for how a camera records a real storm, with real soft gradients and real cloud structure and no painted or stylised look. The horizon of the cloud sea is exactly level. Output one wide landscape image, sixteen units wide and nine tall. Photographic, no text, no logo, no people, no birds.
```

Takes: 1 made, take 1 kept.
Why this one: the sky behind the strike on the third spire, seen by the long lens: a dark cloud wall lit from inside, a thin hot band and the cloud sea, where the built sky is one flat violet wash (asked for by `spine_ground_owner_3`).
Date: 2026-11-26

## `public/assets/spine/mat/saddle.jpg` and `public/assets/spine/mat/saddle-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/saddle.png`, the generated picture, and `assets-src/spine/mat/src/saddle-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-0-establishing.jpg`, `references/drafts/working/real/plate-ridge-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
The crest of a high mountain ridge in winter, a piece 120 metres wide and 68 metres tall, the crest running level across the picture from the left edge to the right. A narrow back of hard wind-packed snow, blue-white, with tan-grey rock outcrops breaking through it in ragged groups of unlike size, tails of drifted snow behind every outcrop all pointing the same way, toward the bottom of the picture, sharp wind ridges, and one line of animal prints that wanders along the length of the crest. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the foreground crest of the establishing picture: packed snow with rock outcrops, drift tails and one line of prints, where the built ground reads as fur (asked for by `spine_ground_owner_3`).
Date: 2026-11-26

## `public/assets/spine/mat/crustfield.jpg` and `public/assets/spine/mat/crustfield-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/crustfield.png`, the generated picture, and `assets-src/spine/mat/src/crustfield-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-1-where-lightning-came-to-ground.jpg`, `references/drafts/working/real/plate-ridge-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
Snow on a high mountain ridge after a gale, a piece 40 metres wide and 22 metres tall. A hard wind-scoured crust, blue-white and glazed, with dark wet ribs of rock showing through it, loose stones each with a tail of drifted snow behind it, all the tails pointing one way, and one line of animal prints that runs from the bottom left corner to the middle of the picture and stops there. One piece of ground seen straight down from above in an orthographic view, as a survey photograph: it fills the whole frame edge to edge at one uniform scale and it does not repeat. Flat, even, shadowless overcast light, so that no side of anything is brighter than another. The first reference image is the place this ground belongs to: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of ground seen straight down from above. Make its height map: the same picture, pixel for pixel, as a greyscale height field for relief shading. White is the highest ground and black is the lowest. Cracks, hollows, channels and standing water are dark; the tops and raised edges of blocks, slabs, stones and lumps are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the ground where the lightning came down: scoured crust, rock ribs, drift tails and a line of prints that ends, where the built ground is flat blue (asked for by `spine_ground_owner_3`).
Date: 2026-11-26

## `public/assets/spine/mat/kiteface.jpg` and `public/assets/spine/mat/kiteface-h.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then for the relief the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity) with the colour picture as its one reference, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/kiteface.png`, the generated picture, and `assets-src/spine/mat/src/kiteface-h.png`, the generated relief. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-2-tether-kites-on-the-first-spire.jpg`, `references/drafts/working/real/plate-ridge-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
The upper lee face of a great rock spire on a storm-swept ridge, a face 50 metres wide and 50 metres tall. Pale cream and tan rock, jointed and frost-shattered, the joints running upward, with small ledges that hold thin snow. Thick feathers of white rime ice stand along the left edge of the face. Along the top edge the rock is burned black and glassy where lightning has struck it. The surface fills the whole frame edge to edge, square on, with no background showing. Flat, even, shadowless light from the front, so that no side is brighter than another: a reference plate for texture work, not a scene. The first reference image is where the subject comes from: take its colours, its age and its character from there, and nothing of its composition or its perspective. The second reference image is a real photograph: it is the standard for how a camera records the real thing, with real grain, real micro detail and no painted, stylised or generated look. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no text, no labels, no arrows, no logo, no border, no people. No horizon, no sky, no animals.
```

The prompt of the relief:

```
The reference image is a photograph of a rock face seen square on. Make its relief map: the same picture, pixel for pixel, as a greyscale depth field for relief shading. White is what stands furthest out toward the viewer and black is what lies deepest in. Cracks, joints, caves, hollows and undercut bands are dark; ledges, ribs, bulges and the noses of blocks are light. Smooth continuous greys that keep every edge and every small form exactly where it is in the reference image. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 1 made, take 1 kept. The relief: 1 made, take 1 kept.
Why this one: the face of the first spire behind the kites: pale jointed rock with rime on the windward edge and a burned top, where the built face is dark blotches (asked for by `spine_ground_owner_3`).
Date: 2026-11-26

## `public/assets/spine/mat/bolt-b.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/bolt-b.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-3-the-strike-on-the-third-spire.jpg`, `references/drafts/working/real/plate-storm-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A photograph of one lightning stroke at night on a pure black background, taken with a short exposure: a single cloud-to-ground channel that enters at the top of the frame a little left of centre, leans to the right as it comes down and reaches the bottom centre, with two long sideways steps on the way, crooked and kinked the whole way as real lightning is and never a regular zigzag. It is very thin, violet-white, with no wide glow round it. Five or six fine side branches leave it at shallow angles, most of them on its right side and in its upper half, each fainter and thinner than the channel, forking again and ending in nothing. Black means nothing is there: no glow fog, no cloud, no rain, no ground, no horizon, no stars. The first reference image is the storm this stroke belongs to: take the violet of its lightning from there, and nothing of its composition. The second reference image is a real photograph of a storm: it is the standard for how a camera records the real thing, with no painted, drawn or stylised look. Output one tall portrait image, nine units wide and sixteen tall. Photographic, sharp, no text, no logo, no border, no people.
```

Takes: 1 made, take 1 kept.
Why this one: a second stroke with its own path, so that the strikes are not copies of one (asked for by `spine_storm_owner_3`).
Date: 2026-11-26

## `public/assets/spine/mat/bolt-c.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/spine/mat/src/bolt-c.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/5-spine/spine-3-the-strike-on-the-third-spire.jpg`, `references/drafts/working/real/plate-storm-1.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs spine`.

```
A photograph of one lightning stroke at night on a pure black background, taken with a short exposure: a single channel that enters at the top centre of the frame and comes down crooked and kinked the whole way as real lightning is, never a regular zigzag. One fifth of the way above the bottom of the frame it forks in two, and the two legs reach the bottom edge a little apart, one left of centre and one right of centre. It is very thin, violet-white, with no wide glow round it. A dozen fine side branches leave it at shallow angles on both sides, each fainter and thinner than the channel, forking again and ending in nothing. Black means nothing is there: no glow fog, no cloud, no rain, no ground, no horizon, no stars. The first reference image is the storm this stroke belongs to: take the violet of its lightning from there, and nothing of its composition. The second reference image is a real photograph of a storm: it is the standard for how a camera records the real thing, with no painted, drawn or stylised look. Output one tall portrait image, nine units wide and sixteen tall. Photographic, sharp, no text, no logo, no border, no people.
```

Takes: 1 made, take 1 kept.
Why this one: a third stroke, forked near its foot (asked for by `spine_storm_owner_3`).
Date: 2026-11-26

## `public/assets/spine/mat/materials.json`

Made by: `assets-src/materials/make-materials.mjs`.
From: the pictures above.
Prompt or command: `node assets-src/materials/make-materials.mjs spine`.

What it holds: the settings of the script, and for each tile its name, the real width of one repeat in metres and its mean colour in linear light, so a place can tint or blend by number; for each plate its size in pixels, the real width it stands for and the name of its relief picture where it has one.
Date: 2026-11-26
