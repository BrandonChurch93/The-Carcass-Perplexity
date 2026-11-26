# Material pictures of the Reveal

The working pictures of the Reveal, made by the Builder for every owner of the place to read: surface tiles and a sky on 2026-11-25 (the list and every prompt are in `assets-src/materials/spec.py`), and on 2026-11-26 8 more for the second owners, most of them asked for by an owner: far backplates, feature sheets, ground plates and more tiles (`assets-src/materials/spec2.py`). Each began as one generated picture: 1254 px square, 1672 x 941, 941 x 1672, or a sky of 1536 x 1024. `assets-src/materials/make-materials.mjs` makes each surface tile repeat and writes a colour picture and a data picture from it, by the method of the Heart's materials, and writes each plate as it is.

The Reveal's pictures are seen straight down from orbit. Cloud pictures lie on a black sea: their brightness is the cover, after the dark floor of the sea is taken off. `cells`, `streets`, `veil`, `popcorn` and `streaks` repeat; `front`, `storm`, `cyclone` and `wisps` are plates, one whole feature each, written at their own size and not repeated. The ground pictures (`range`, `plain`, `badland`, `shelf`, `redflat`) and the water pictures (`glitter`, `lakewater`) are detail for the provinces of the continent and repeat.

How to read them: the colour picture is sRGB. For a tile, in the data picture `<name>-nh.png` red and green are the slope on x and y (0.5 is level) and blue is height, taken from the picture's own light and dark. `metres` in `materials.json` is the real width one repeat of a tile, or the whole of a plate, stands for. A face with beds or courses (`ledge`, `strata`, `cliff`, `canal`, `bark`, `hoop`) repeats well from left to right; lay its height once or break the repeat. Blend two scales of a tile and break it with the place's own large shapes so no repeat shows. These pictures carry no light: the place's rig lights them.

A plate is one whole picture and does not repeat: a far backplate (the far distance of a view, with its own sky and a level horizon), a feature sheet (one thing whole on black under flat light), or a ground plate (one piece of ground from straight above). Where a plate has a relief picture, `<name>-h.png`, it is grey and the size of the colour picture: white is highest (ground plates) or nearest (feature sheets and faces), black is lowest or furthest, and on a feature sheet the black round the subject is no subject. The relief was made by a second call from the colour picture, so it lies on it within a few pixels and its greys are a guess at the form, good for slope and for parallax, not a measured height. Where the generated picture came with a clear background, the plate is laid on black and `<name>-a.png` is its cover: grey, white where the subject is. The animals in these pictures have no eyes and no ears.

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

## `public/assets/reveal/mat/popcorn.jpg` and `public/assets/reveal/mat/popcorn-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/popcorn.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-2-skull-massif.jpg`, `references/drafts/working/real/orb-modis-popcorn.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
Cloud seen straight down from orbit in an orthographic view: a field of small fair-weather cumulus over open ocean, about 250 kilometres across. Thousands of separate small white puffs, each 1 to 4 kilometres across, in loose clumps and short streets with clear black gaps between them, denser in some parts of the field and sparse in others, every puff lumpy with a soft edge. The sun is high overhead, so the cloud tops are evenly lit and no long shadow falls to one side. The sea beneath is pure black: no land, no coast, no sun glint. The field fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the world this cloud belongs to: take the colour and the softness of its cloud from there, and nothing of its composition. The second reference image is a real satellite photograph: it is the standard for how a camera in orbit records real cloud, with real soft edges, real lumpy and fibrous detail at every size and no painted or stylised look. Output one square image. Photographic, sharp, no text, no logo, no border, no grid lines, no stars.
```

Takes: 1 made, take 1 kept.
Why this one: the popcorn field of the lower keys (asked for by `reveal_owner_2`).
Date: 2026-11-26

## `public/assets/reveal/mat/streaks.jpg` and `public/assets/reveal/mat/streaks-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/streaks.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-4-titan-from-orbit.jpg`, `references/drafts/working/real/orb-modis-streets.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
Cloud seen straight down from orbit in an orthographic view: the fine wind-drawn streaks and flecks of small cloud that cover a whole sea, about 1,600 kilometres across. Thin, torn white streaks and beaded lines all drawn roughly one way from left to right, with brighter knots, small flecks between them and wide black gaps, never ruled straight and never evenly spaced. The sun is high overhead, so the cloud tops are evenly lit and no long shadow falls to one side. The sea beneath is pure black: no land, no coast, no sun glint. The field fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the world this cloud belongs to: take the colour and the softness of its cloud from there, and nothing of its composition. The second reference image is a real satellite photograph: it is the standard for how a camera in orbit records real cloud, with real soft edges, real lumpy and fibrous detail at every size and no painted or stylised look. Output one square image. Photographic, sharp, no text, no logo, no border, no grid lines, no stars.
```

Takes: 1 made, take 1 kept.
Why this one: the wind streaks that cover the whole sea in the widest key (asked for by `reveal_owner_2`).
Date: 2026-11-26

## `public/assets/reveal/mat/glitter.jpg` and `public/assets/reveal/mat/glitter-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/glitter.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-4-titan-from-orbit.jpg`, `references/drafts/working/real/orb-iss39-dahlak.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
A texture seen straight down from orbit in an orthographic view: open sea in sunglint, about 400 kilometres across. A silver-grey sheen over dark blue water, broken by dark smooth slicks in long curved bands, fine parallel swell lines, wind lanes and patches of rougher brighter water. No cloud, no land, no ships. The sea fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the world this sea belongs to: take the colour of its sea from there, and nothing of its composition. The second reference image is a real satellite photograph: it is the standard for how a camera in orbit records real sunglint on real water. Output one square image. Photographic, sharp, no text, no logo, no border, no grid lines.
```

Takes: 1 made, take 1 kept.
Why this one: the sea in the sun, for a glint that has texture (asked for by `reveal_owner_2`).
Date: 2026-11-26

## `public/assets/reveal/mat/lakewater.jpg` and `public/assets/reveal/mat/lakewater-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/lakewater.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-1-above-the-lake.jpg`, `references/drafts/working/real/orb-iss39-dahlak.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
A texture seen straight down from high above in an orthographic view: the surface of a deep lake, about 20 kilometres across. Black-blue water with broad fields of fine wind ripple, darker smooth patches, cat's paws where gusts touch it, and a few faint pale foam lines. No shore, no land, no boats, no cloud. The water fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the lake this water belongs to: take its colour from there, and nothing of its composition. The second reference image is a real photograph from orbit: it is the standard for how a camera records real water from above. Output one square image. Photographic, sharp, no text, no logo, no border, no grid lines.
```

Takes: 1 made, take 1 kept.
Why this one: the water of the lake in the first frames of the rise (asked for by `reveal_owner_2`).
Date: 2026-11-26

## `public/assets/reveal/mat/wisps.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/wisps.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-2-skull-massif.jpg`, `references/drafts/working/real/orb-modis-sgeorgia-streets.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
Vapour seen straight down from orbit in an orthographic view, on a pure black background: three thin translucent trails of white vapour that rise from three points close together near the left edge of the frame and drift to the right for about 500 kilometres, curling, braiding and thinning as they go, each ragged and fibrous, the frame about 600 kilometres wide. Black means nothing is there. Nothing else is in the frame: no land, no sea detail, no cloud field. The first reference image is the world this vapour belongs to: take its softness from there. The second reference image is a real satellite photograph: it is the standard for how a camera in orbit records real thin plumes. Photographic, sharp, no text, no logo, no border.
```

Takes: 1 made, take 1 kept.
Why this one: the vapour trails of the throat (asked for by `reveal_owner_2`).
Date: 2026-11-26

## `public/assets/reveal/mat/cyclone-wide.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/cyclone-wide.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-4-titan-from-orbit.jpg`, `references/drafts/working/real/orb-apollo17-earth.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
Cloud seen straight down from orbit in an orthographic view: the wide outer field of one great cyclone over open ocean, a square 2,500 kilometres across with the small dark eye of the storm at its centre. Eight to ten thin, soft spiral arms wind out from the eye, each arm a band of small separate beaded cumulus cells, lumpy and loose, never a smooth painted stroke and never combed into hard flakes. Black sea shows between the arms all the way in to the core. The arms run on past all four edges of the frame, so that the storm has no circular rim and no outer edge anywhere in the picture. The sun is high overhead, so the cloud tops are evenly lit and no long shadow falls to one side. The sea beneath is pure black: no land, no coast, no sun glint. The first reference image is the world this cloud belongs to: take the colour and the softness of its cloud from there, and nothing of its composition. The second reference image is a real satellite photograph: it is the standard for how a camera in orbit records real cloud, with real soft edges, real lumpy and fibrous detail at every size and no painted or stylised look. Output one square image. Photographic, sharp, no text, no logo, no border, no grid lines, no stars.
```

Takes: 1 made, take 1 kept.
Why this one: the cyclone of the widest key as soft beaded bands that run off the frame, where the built one is combed hard flakes with a rim (asked for by `reveal_owner_3`).
Date: 2026-11-26

## `public/assets/reveal/mat/specks.jpg` and `public/assets/reveal/mat/specks-nh.png`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/specks.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-4-titan-from-orbit.jpg`, `references/drafts/working/real/orb-modis-popcorn.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
Cloud seen straight down from orbit in an orthographic view from very high: ragged fields of very small fair-weather cumulus over open ocean, about 1,500 kilometres across. Every cloud is no more than a tiny white dot, thousands and thousands of them, gathered in loose clusters and in beaded streets that all run roughly one way from left to right, with wide lanes of clear black sea between the fields and a few denser lumpy patches. No large cloud, no sheet, no streak longer than a few dots. The field fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The sun is high overhead, so the cloud tops are evenly lit and no long shadow falls to one side. The sea beneath is pure black: no land, no coast, no sun glint. The first reference image is the world this cloud belongs to: take the colour and the softness of its cloud from there, and nothing of its composition. The second reference image is a real satellite photograph: it is the standard for how a camera in orbit records real cloud, with real soft edges, real lumpy and fibrous detail at every size and no painted or stylised look. Output one square image. Photographic, sharp, no text, no logo, no border, no grid lines, no stars.
```

Takes: 1 made, take 1 kept.
Why this one: the tiny cumulus of the sea in the widest key, where the built cloud is hard white dashes over grey smudges (asked for by `reveal_owner_3`).
Date: 2026-11-26

## `public/assets/reveal/mat/seacloud.jpg`

Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/reveal/mat/src/seacloud.png`, the generated picture. Pictures passed to the model with the prompt: `references/approved/7-reveal/reveal-4-titan-from-orbit.jpg`, `references/drafts/working/real/orb-modis-sgeorgia-streets.jpg`.
Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs reveal`.

```
Cloud seen straight down from orbit in an orthographic view: the whole deck of low cloud over an open ocean, a piece 6,000 kilometres wide and 3,400 kilometres tall. Long curving streets of small beaded cumulus and ragged fields of tiny cloud sweep across it in broad arcs. At the left side the cloud is thin, a scatter of dots with much black sea; toward the right side it thickens into dense lumpy fields, broken by clear lanes of black sea that wander through it. No cyclone, no single great storm, no smooth sheet. The sun is high overhead, so the cloud tops are evenly lit and no long shadow falls to one side. The sea beneath is pure black: no land, no coast, no sun glint. The first reference image is the world this cloud belongs to: take the colour and the softness of its cloud from there, and nothing of its composition. The second reference image is a real satellite photograph: it is the standard for how a camera in orbit records real cloud, with real soft edges, real lumpy and fibrous detail at every size and no painted or stylised look. Output one wide landscape image, sixteen units wide and nine tall. Photographic, sharp, no text, no logo, no border, no grid lines, no stars.
```

Takes: 1 made, take 1 kept.
Why this one: the low cloud deck of the whole sea in the widest key as one picture: curving streets and ragged fields, thin at one side and dense at the other (asked for by `reveal_owner_3`).
Date: 2026-11-26

## `public/assets/reveal/mat/materials.json`

Made by: `assets-src/materials/make-materials.mjs`.
From: the pictures above.
Prompt or command: `node assets-src/materials/make-materials.mjs reveal`.

What it holds: the settings of the script, and for each tile its name, the real width of one repeat in metres and its mean colour in linear light, so a place can tint or blend by number; for each plate its size in pixels, the real width it stands for and the name of its relief picture where it has one.
Date: 2026-11-26
