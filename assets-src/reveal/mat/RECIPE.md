# Material pictures of the Reveal

The material pictures and the sky picture of the Reveal, made by the Builder on 2026-11-25 for every owner of the place to read. Each began as one generated picture: a flat surface seen straight on under even light, 1254 px square, or a sky, 1536 x 1024. `assets-src/materials/make-materials.mjs` makes each surface tile and writes a colour picture and a data picture from it, by the method of the Heart's materials. The list and every prompt are in `assets-src/materials/spec.py`.

The Reveal's pictures are seen straight down from orbit. Cloud pictures lie on a black sea: their brightness is the cover, after the dark floor of the sea is taken off. `cells`, `streets` and `veil` repeat; `front`, `storm` and `cyclone` are plates, one whole feature each, written at their own size and not repeated. The ground pictures (`range`, `plain`, `badland`, `shelf`, `redflat`) are detail for the provinces of the continent and repeat.

How to read them: the colour picture is sRGB. In the data picture red and green are the slope on x and y (0.5 is level) and blue is height. `metres` in `materials.json` is the real width one repeat stands for. A face with beds or courses (`ledge`, `strata`, `cliff`, `canal`, `bark`, `hoop`) repeats well from left to right; lay its height once or break the repeat. Blend two scales of a tile and break it with the place's own large shapes so no repeat shows. These pictures carry no light: the place's rig lights them.

## `public/assets/reveal/mat/cells.jpg` and `public/assets/reveal/mat/cells-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/cells.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-4-titan-from-orbit.jpg`, `references/drafts/working/real/orb-modis-popcorn.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
Cloud seen straight down from orbit in an orthographic view: a field of low cloud over open ocean, about 500 kilometres across. Closed cells packed like cobbles in part of the field, grading into open rings of cloud with clear centres elsewhere, each cell lumpy and soft at the edge, thin grey veil between some of them, small ragged scraps in the gaps. The field fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The sun is high overhead, so the cloud tops are evenly lit and no long shadow falls to one side. The sea beneath is pure black: no land, no coast, no sun glint. The first reference image is the world this cloud belongs to: take the colour and the softness of its cloud from there, and nothing of its composition. The second reference image is a real satellite photograph: it is the standard for how a camera in orbit records real cloud, with real soft edges, real fibrous and lumpy detail at every size and no painted or stylised look. Output one square image. Photographic, sharp, no text, no logo, no border, no grid lines, no stars.
```

Takes: 1 made, take 1 kept.
Why this one: the low cell cloud over the cold sea, which the frames draw as hard white blocks.
Date: 2026-11-25

## `public/assets/reveal/mat/streets.jpg` and `public/assets/reveal/mat/streets-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/streets.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-4-titan-from-orbit.jpg`, `references/drafts/working/real/orb-modis-streets.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
Cloud seen straight down from orbit in an orthographic view: cloud streets over open ocean, about 400 kilometres across. Dozens of long parallel rows of small puffy cloud, the rows thin and separate at one side and thickening until they merge into a lumpy sheet at the other, every row ragged and beaded, never ruled straight. The field fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The sun is high overhead, so the cloud tops are evenly lit and no long shadow falls to one side. The sea beneath is pure black: no land, no coast, no sun glint. The first reference image is the world this cloud belongs to: take the colour and the softness of its cloud from there, and nothing of its composition. The second reference image is a real satellite photograph: it is the standard for how a camera in orbit records real cloud, with real soft edges, real fibrous and lumpy detail at every size and no painted or stylised look. Output one square image. Photographic, sharp, no text, no logo, no border, no grid lines, no stars.
```

Takes: 1 made, take 1 kept.
Why this one: the cloud streets off the cold coasts.
Date: 2026-11-25

## `public/assets/reveal/mat/veil.jpg` and `public/assets/reveal/mat/veil-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/veil.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-4-titan-from-orbit.jpg`, `references/drafts/working/real/orb-apollo17-earth.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
Cloud seen straight down from orbit in an orthographic view: high thin ice cloud over open ocean, about 800 kilometres across. Translucent white veils and long fine fibres streaming roughly one way, feathered and combed, denser in a few soft bands and almost nothing between them, the black sea showing through most of it. The field fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The sun is high overhead, so the cloud tops are evenly lit and no long shadow falls to one side. The sea beneath is pure black: no land, no coast, no sun glint. The first reference image is the world this cloud belongs to: take the colour and the softness of its cloud from there, and nothing of its composition. The second reference image is a real satellite photograph: it is the standard for how a camera in orbit records real cloud, with real soft edges, real fibrous and lumpy detail at every size and no painted or stylised look. Output one square image. Photographic, sharp, no text, no logo, no border, no grid lines, no stars.
```

Takes: 1 made, take 1 kept.
Why this one: the high veil that moves against the low deck.
Date: 2026-11-25

## `public/assets/reveal/mat/front.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/front.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-4-titan-from-orbit.jpg`, `references/drafts/working/real/orb-apollo17-earth.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
Cloud seen straight down from orbit in an orthographic view: one long weather front over open ocean, about 2,000 kilometres long, lying on a gentle curve from the lower left to the upper right. A broad band of thick layered cloud, smooth and bright along its spine, with a sharp ragged edge on one side and a wide fibrous veil thinning out on the other, lumpy convective towers embedded along it and scattered cells behind it. The whole feature lies inside the frame with black sea on every side of it, and nothing touches the edge of the frame. The sun is high overhead, so the cloud tops are evenly lit and no long shadow falls to one side. The sea beneath is pure black: no land, no coast, no sun glint. The first reference image is the world this cloud belongs to: take the colour and the softness of its cloud from there, and nothing of its composition. The second reference image is a real satellite photograph: it is the standard for how a camera in orbit records real cloud, with real soft edges, real fibrous and lumpy detail at every size and no painted or stylised look. Output one square image. Photographic, sharp, no text, no logo, no border, no grid lines, no stars.
```

Takes: 1 made, take 1 kept.
Why this one: the long fronts, which the frames draw with hard lace at the edge.
Date: 2026-11-25

## `public/assets/reveal/mat/storm.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/storm.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-4-titan-from-orbit.jpg`, `references/drafts/working/real/orb-modis-tstorm-louisiana-crop.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
Cloud seen straight down from orbit in an orthographic view: one great cluster of thunderstorms over open ocean, about 400 kilometres across. Several merged anvils forming one thick bright shield, with boiling overshooting tops bulging through it near the middle, radial fibres and a soft thin fringe of ice cloud at its edge, and a few small young towers beside it. The whole feature lies inside the frame with black sea on every side of it, and nothing touches the edge of the frame. The sun is high overhead, so the cloud tops are evenly lit and no long shadow falls to one side. The sea beneath is pure black: no land, no coast, no sun glint. The first reference image is the world this cloud belongs to: take the colour and the softness of its cloud from there, and nothing of its composition. The second reference image is a real satellite photograph: it is the standard for how a camera in orbit records real cloud, with real soft edges, real fibrous and lumpy detail at every size and no painted or stylised look. Output one square image. Photographic, sharp, no text, no logo, no border, no grid lines, no stars.
```

Takes: 1 made, take 1 kept.
Why this one: the storm over the ridge, which the frames draw as a small blocky patch.
Date: 2026-11-25

## `public/assets/reveal/mat/cyclone.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/cyclone.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-4-titan-from-orbit.jpg`, `references/drafts/working/real/orb-apollo17-earth.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
Cloud seen straight down from orbit in an orthographic view: one great mature cyclone over open ocean, about 1,500 kilometres across. A dense central shield with a small clear eye, wrapped by two long spiral arms of lumpy convective cloud that tear into separate cells toward their ends, thin high outflow fibres fanning from the top, and clear black sea between the arms. The whole feature lies inside the frame with black sea on every side of it, and nothing touches the edge of the frame. The sun is high overhead, so the cloud tops are evenly lit and no long shadow falls to one side. The sea beneath is pure black: no land, no coast, no sun glint. The first reference image is the world this cloud belongs to: take the colour and the softness of its cloud from there, and nothing of its composition. The second reference image is a real satellite photograph: it is the standard for how a camera in orbit records real cloud, with real soft edges, real fibrous and lumpy detail at every size and no painted or stylised look. Output one square image. Photographic, sharp, no text, no logo, no border, no grid lines, no stars.
```

Takes: 1 made, take 1 kept.
Why this one: the cyclone off the feet, which the frames draw as a smooth painted spiral.
Date: 2026-11-25

## `public/assets/reveal/mat/range.jpg` and `public/assets/reveal/mat/range-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/range.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-2-skull-massif.jpg`, `references/drafts/working/real/orb-iss13-oregon.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
A texture of the ground, seen straight down from orbit in an orthographic view: the crest of a great mountain range, about 40 kilometres across. Sharp branching ridges of bare grey and tan rock, snow and small glaciers on the highest crests only, dark valleys with thin pale river threads, scree fans, and patches of dull green-brown growth low down. Ridges run in every direction, not all one way. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real land surface from orbit, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the high ranges on the bone axes, which the frames draw with one erosion look.
Date: 2026-11-25

## `public/assets/reveal/mat/plain.jpg` and `public/assets/reveal/mat/plain-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/plain.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-3-head-and-shoulders.jpg`, `references/drafts/working/real/orb-iss35-nile-sinai.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
A texture of the ground, seen straight down from orbit in an orthographic view: a dry lowland plain, about 60 kilometres across. Tan, ochre and dull olive ground crossed by braided river channels with pale gravel bars, old abandoned channels, alluvial fans, dark patches of low growth along the water and pale dusty flats between. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real land surface from orbit, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the plains between the ranges.
Date: 2026-11-25

## `public/assets/reveal/mat/badland.jpg` and `public/assets/reveal/mat/badland-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/badland.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-2-skull-massif.jpg`, `references/drafts/working/real/orb-iss44-sinai.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
A texture of the ground, seen straight down from orbit in an orthographic view: a high dry plateau cut by canyons, about 30 kilometres across. Buff, rust and grey layered rock, cut by branching canyons and gullies of many sizes, flat-topped mesas between them, pale dry washes on the canyon floors and darker rock on the rims. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real land surface from orbit, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the eroded uplands, to break the single erosion look.
Date: 2026-11-25

## `public/assets/reveal/mat/shelf.jpg` and `public/assets/reveal/mat/shelf-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/shelf.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-3-head-and-shoulders.jpg`, `references/drafts/working/real/orb-modis-bahamas.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
A texture of the ground, seen straight down from orbit in an orthographic view: a shallow sea shelf beside a coast, about 80 kilometres across, seen through clear water. Pale sand shoals and bars in turquoise and milky green, branching tidal channels of deeper blue between them, darker beds of growth, and the colour deepening to dark blue where the shelf ends. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real land surface from orbit, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the shelves and shallows round the coasts.
Date: 2026-11-25

## `public/assets/reveal/mat/redflat.jpg` and `public/assets/reveal/mat/redflat-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/redflat.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-master.jpg`, `references/drafts/working/real/orb-natron.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
A texture of the ground, seen straight down from orbit in an orthographic view: a wide salt flat stained red, about 30 kilometres across. Crusted white and pink salt in broad pans, blood-red and rust-red shallow brine in branching pools and channels, dark mud at the edges, and pale dry ground around. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there, and nothing of its composition. The second reference image is a real photograph: it is the standard for how a camera records a real land surface from orbit, with real grain, real micro detail and no painted or stylised look. Output one square image. Photographic, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals.
```

Takes: 1 made, take 1 kept.
Why this one: the red flats of the marsh province seen from orbit.
Date: 2026-11-25

## `public/assets/reveal/mat/materials.json`

Made by: `assets-src/materials/make-materials.mjs`.
From: the pictures above.
Prompt or command: `node assets-src/materials/make-materials.mjs reveal`.

What it holds: the settings of the script, and for each tile its name, the real width of one repeat in metres and its mean colour in linear light, so a place can tint or blend by number.
Date: 2026-11-25
