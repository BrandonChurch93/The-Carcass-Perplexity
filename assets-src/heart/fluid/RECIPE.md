# Recipes of the Heart's lake and fall

The sheets the crust, the channel and the fall read. What each holds: `rope-nt.jpg` the crust's paint (r, g the slope of the height, b the tone), `rope-nh.jpg` the crust's relief (r, g the slope, b the height), `melt-nh.jpg` the melt (r, g the slope of the skin, b the heat, 0 dark skin to 1 white melt). All are 2048 x 1024, linear, edges wrapped by the script.

## `public/assets/heart/mat/rope-nt.jpg`

Made by: the image tool `generate_image` with its default model (through Perplexity), then `assets-src/heart/make-fluid-sheets.py` (Python 3 with numpy, scipy and Pillow).
From: `assets-src/heart/gen/rope-t1.png`, the generated picture, committed. Picture passed to the model with the prompt: `references/approved/2-heart/heart-1-the-lava-surface-at-the-line.jpg`.
Prompt or command: the prompt below (aspect 1:1 asked, 1672 x 941 given), then `python3 assets-src/heart/make-fluid-sheets.py rope`.

```
A material texture seen straight down from above in an orthographic view, about 3 metres across: freshly cooled ropy pahoehoe lava crust matching the dark crust of the reference picture. Dark charcoal to graphite basalt with a faint satin metallic sheen; bundles of ropes and cords of unequal thickness (2 to 15 cm) that curve in broad swirling arcs and festoons, twist, branch and end; smooth glassy billowy slabs between the rope bundles; a few sharp open cracks; fine stretched striations on each rope; tiny pits and grit. No glowing lava, no fire, no ash dust piles. Flat, even, shadowless overcast light so that no cast shadows are baked in. The surface fills the whole frame edge to edge at one even scale, no vignette, no border, no text, no perspective. Photographic, very sharp, high micro detail.
```

Takes: 1 picture made, take 1 kept; 1 run of the script.
Why this one: ropes of unlike thickness that curl, branch and end, glassy slabs and open cracks, lit flat, as the approved picture of the lava surface shows them.
Date: 2026-11-26

## `public/assets/heart/mat/rope-nh.jpg`

Made by: the image tool `generate_image` with its default model (through Perplexity), then `assets-src/heart/make-fluid-sheets.py` (Python 3 with numpy, scipy and Pillow).
From: `assets-src/heart/gen/rope-t1.png`, the generated picture, committed. Picture passed to the model with the prompt: `references/approved/2-heart/heart-1-the-lava-surface-at-the-line.jpg`.
Prompt or command: the prompt below (aspect 1:1 asked, 1672 x 941 given), then `python3 assets-src/heart/make-fluid-sheets.py rope`.

```
A material texture seen straight down from above in an orthographic view, about 3 metres across: freshly cooled ropy pahoehoe lava crust matching the dark crust of the reference picture. Dark charcoal to graphite basalt with a faint satin metallic sheen; bundles of ropes and cords of unequal thickness (2 to 15 cm) that curve in broad swirling arcs and festoons, twist, branch and end; smooth glassy billowy slabs between the rope bundles; a few sharp open cracks; fine stretched striations on each rope; tiny pits and grit. No glowing lava, no fire, no ash dust piles. Flat, even, shadowless overcast light so that no cast shadows are baked in. The surface fills the whole frame edge to edge at one even scale, no vignette, no border, no text, no perspective. Photographic, very sharp, high micro detail.
```

Takes: 1 picture made, take 1 kept; 1 run of the script.
Why this one: the same picture as the paint sheet, so the relief and the tone of a rope lie on each other.
Date: 2026-11-26

## `public/assets/heart/mat/melt-nh.jpg`

Made by: the image tool `generate_image` with its default model (through Perplexity), then `assets-src/heart/make-fluid-sheets.py` (Python 3 with numpy, scipy and Pillow).
From: `assets-src/heart/gen/melt-t1.png`, the generated picture, committed. Picture passed to the model with the prompt: `references/approved/2-heart/heart-1-the-lava-surface-at-the-line.jpg`.
Prompt or command: the prompt below (aspect 1:1 asked, 1672 x 941 given), then `python3 assets-src/heart/make-fluid-sheets.py melt`.

```
A material texture seen straight down from above in an orthographic view, about 3 metres across: the surface of slowly flowing molten lava in an open channel, matching the lava of the reference picture. Incandescent yellow-white and orange melt showing between thin, dark, half-cooled skin plates of irregular size (5 to 60 cm) that are torn apart, stretched and wrinkled into fine ropy folds; plates have glowing red-orange edges where they thin out; some plates crowd together, in other places wide bright open melt with faint swirling streaks. The dark skin covers about half of the area. No rock banks, no shore, no horizon, no smoke, no perspective. The surface fills the whole frame edge to edge at one even scale, with no vignette, no border and no text. Photographic, sharp, high detail.
```

Takes: 1 picture made, take 1 kept; 1 run of the script.
Why this one: dark plates of unlike size torn apart on bright melt, about half skin, seen straight down, so the stream and the fall can carry them.
Date: 2026-11-26

## `public/assets/heart/mat/coil-nh.jpg`

Made by: the image tool `generate_image` with its default model (through Perplexity), twice, then `assets-src/heart/make-coil-sheet.py` (Python 3 with numpy, scipy and Pillow).
From: `assets-src/heart/gen/coil-t1.png` (the crust seen straight down; picture passed to the model with the prompt: `references/approved/2-heart/heart-1-the-lava-surface-at-the-line.jpg`) and `assets-src/heart/gen/coil-h1.png` (its height, drawn by the model from `coil-t1.png` passed as the reference picture). Both committed.
Prompt or command: the two prompts below (aspect 16:9, 1672 x 941 given), then `python3 assets-src/heart/make-coil-sheet.py`.

```
A material texture seen straight down from above in an orthographic view, about 4 metres across: cooled ropy pahoehoe lava crust, the same dark crust as in the reference picture. Several smooth satin slabs and billowy toes of different sizes lap over one another; on some of them thick coiled rope festoons: bundles of 5 to 12 parallel cords, each cord 3 to 8 cm thick, bent into concentric arcs and tight coils like draped cloth pushed into folds, the arcs bunch together at one side and die out into smooth skin at the other. Between the rope bundles wide areas of smooth, gently swelling glassy skin with only faint stretch lines. A few thin black cracks at slab edges. Dark charcoal to graphite basalt, faint satin sheen. No glowing lava, no fire, no dust, no pebbles. Flat, even, shadowless overcast light, nothing cast, no highlights from one side. The surface fills the whole frame edge to edge at one even scale, no vignette, no border, no text, no perspective, no horizon. Photographic, very sharp, high micro detail.
```

```
Turn the reference picture into its height map (displacement map) for a 3D material, keeping every form in exactly the same place, pixel for pixel, same framing and scale: a greyscale image in which brightness is only the height of the surface. The tops of the ropes, cords and swollen slabs are light grey to white, the furrows between ropes are dark grey, cracks and the low skin under an overlapping slab edge are black. Smooth gradients across each slab according to how it swells; where one slab laps over another the upper one is clearly lighter along its edge. No lighting, no shading, no shadows, no highlights, no colour, no texture grain other than the real relief. 16-bit look, clean and sharp.
```

Takes: 1 picture of the crust made, take 1 kept; 1 picture of its height made, take 1 kept; 1 run of the script.
Why this one: slabs of unlike size that lap over one another, rope festoons on some that bunch at one side and die out into smooth skin at the other, as the approved picture of the lava surface shows them; and a height drawn form for form on it, so that a slab stands over the next by its own height and not by its brightness. It is 2048 x 1024, linear, edges wrapped by the script: r, g the slope of the height, b the height. The crust's relief reads it once a slab (`src/places/heart/lake/sheet.ts`, `POUR_GLSL`).
Date: 2026-11-26

## `public/assets/heart/mat/coil-nt.jpg`

Made by: the image tool `generate_image` with its default model (through Perplexity), twice, then `assets-src/heart/make-coil-sheet.py` (Python 3 with numpy, scipy and Pillow).
From: `assets-src/heart/gen/coil-t1.png` (the crust seen straight down; picture passed to the model with the prompt: `references/approved/2-heart/heart-1-the-lava-surface-at-the-line.jpg`) and `assets-src/heart/gen/coil-h1.png` (its height, drawn by the model from `coil-t1.png` passed as the reference picture). Both committed.
Prompt or command: the two prompts below (aspect 16:9, 1672 x 941 given), then `python3 assets-src/heart/make-coil-sheet.py`.

```
A material texture seen straight down from above in an orthographic view, about 4 metres across: cooled ropy pahoehoe lava crust, the same dark crust as in the reference picture. Several smooth satin slabs and billowy toes of different sizes lap over one another; on some of them thick coiled rope festoons: bundles of 5 to 12 parallel cords, each cord 3 to 8 cm thick, bent into concentric arcs and tight coils like draped cloth pushed into folds, the arcs bunch together at one side and die out into smooth skin at the other. Between the rope bundles wide areas of smooth, gently swelling glassy skin with only faint stretch lines. A few thin black cracks at slab edges. Dark charcoal to graphite basalt, faint satin sheen. No glowing lava, no fire, no dust, no pebbles. Flat, even, shadowless overcast light, nothing cast, no highlights from one side. The surface fills the whole frame edge to edge at one even scale, no vignette, no border, no text, no perspective, no horizon. Photographic, very sharp, high micro detail.
```

```
Turn the reference picture into its height map (displacement map) for a 3D material, keeping every form in exactly the same place, pixel for pixel, same framing and scale: a greyscale image in which brightness is only the height of the surface. The tops of the ropes, cords and swollen slabs are light grey to white, the furrows between ropes are dark grey, cracks and the low skin under an overlapping slab edge are black. Smooth gradients across each slab according to how it swells; where one slab laps over another the upper one is clearly lighter along its edge. No lighting, no shading, no shadows, no highlights, no colour, no texture grain other than the real relief. 16-bit look, clean and sharp.
```

Takes: 1 picture of the crust made, take 1 kept; 1 picture of its height made, take 1 kept; 1 run of the script.
Why this one: slabs of unlike size that lap over one another, rope festoons on some that bunch at one side and die out into smooth skin at the other, as the approved picture of the lava surface shows them; and a height drawn form for form on it, so that a slab stands over the next by its own height and not by its brightness. It is 2048 x 1024, linear, edges wrapped by the script: r, g the slope of the height, b the tone (a furrow dark, a crest pale, a crack black, with the photograph's own grain; 0.5 the mean). The crust's paint reads it once a slab, from the same script and the same two pictures as `coil-nh.jpg`, so the paint and the relief of a cord lie on each other.
Date: 2026-11-26


## `public/assets/heart/mat/rough-nt.jpg`

Made by: the image tool `generate_image` with its default model (through Perplexity), once, then `assets-src/heart/fluid/make-rough.mjs` (Node with sharp, which the repository already has).
From: `assets-src/heart/gen/rough-t1.jpg` (the crust seen straight down, the model's picture kept as a JPEG of quality 88; picture passed to the model with the prompt: `references/approved/2-heart/heart-3-crust-walkers-feeding-at-a-seam.jpg`). Committed.
Prompt or command: the prompt below (aspect 1:1 asked, 1254 x 1254 given), then `node assets-src/heart/fluid/make-rough.mjs`.

```
A material texture, seen straight down from above in an orthographic view: the young broken crust on an active lava lake, about 3 metres across. Rough, matte, dark charcoal basalt: a granular clinkery skin, torn and broken into irregular plates and crumbs of unlike sizes from a few centimetres to half a metre, with pitted vesicular faces, sharp broken edges, grit and small rubble in the joints, and many fine irregular hairline cracks that are dark, not glowing. No ropes, no coils, no swirls, no parallel wrinkles, no stripes. No glowing lava and no fire anywhere. No sheen, no gloss, no wet highlights: dead matte. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The reference image is the place this material belongs to (the dark floor under the animals' feet): take its colours, its age and its character from there. Output one square image. Photographic, as a camera records real stone with real grain and micro detail, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals, no objects lying on top.
```

Takes: 1 picture made, take 1 kept; 1 run of the script.
Why this one: rough, matte, broken basalt in plates and crumbs of unlike sizes with dark hairline joints and no rope, no stripe and no sheen, which is the floor under the animals in the approved picture `heart-3`. Only its brightness is used. It is 1024 x 1024, linear, edges wrapped by the script: r, g the slope of a height taken from the brightness with the lighting flattened out, b the tone (0.5 the mean of the stone, a joint dark, a crumb pale). The crust reads it on the floor the group feeds on, at two sizes, each patch turned and shifted (`src/places/heart/lake/sheet.ts`, `ROUGH_GLSL`).
Date: 2026-11-27
