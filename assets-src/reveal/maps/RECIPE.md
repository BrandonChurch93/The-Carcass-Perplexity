# The Reveal's maps of the continent

Four nested satellite pictures of the continent, each 16:9 and each with a height picture, made by the Builder on 2026-11-26 for the Reveal's owner. They are working pictures. The approved pictures under `references/approved/7-reveal/` stay the target and are not drawn. `kit/06-ASSETS.md` allows this use: an approved picture may be the reference passed to an image model and a source of colour and height, and the reveal's master is the map of the continent.

How they were made. The first picture (`src/map-a-1672.png`) is the approved master, reduced to 2400 px wide, passed to the image model as the place, with a real satellite photograph as the standard and the prompt in `prompt-continent.txt`: the same continent with no cloud, looking straight down, with more land around the bones (Brandon's note R1.5). Then, level by level, `make-maps.py crop <level>` cuts the level's rect out of the picture before it and enlarges it to 2048 x 1152, and the image model makes that picture again at full detail (prompts in `prompt-levels.json`: the level's own sentence, then the shared `tail`). The height picture of a level is the image model's reading of that level's colour picture (prompt `h`). `make-maps.py finish` writes the files under `public/assets/reveal/maps/`.

Where they lie. `maps.json` gives each map's rect in px of the approved master (`references/approved/7-reveal/reveal-master.jpg`, 5952 x 3348): centre x, centre y, width. One px of the master is 0.8566 km (STATED in `pullback.json`). `map-a` is not warped: it lies on the master by one scale and one shift, fitted on the lake of the Eye and the salt flat of the hips. MEASURED on 2026-11-26: each level's colour picture lies on the picture it was made from within 1.3 px and 0.3 percent of scale (fit of an affine by ECC), and each height picture lies on its colour within 1.5 px (phase correlation of gradients). MEASURED by overlay only, no number: the bones traced from the approved master lie on the ranges of `map-a`.

The larger copies. The Reveal's owner measured that at the wide key one texel of a 1672 px map covers 2.1 px of the frame, so each map was made again larger by `assets-src/reveal/maps/enlarge-maps.py`. The parent is cut into 3 x 3 windows, each 0.4 of its width and height (neighbours share a quarter of a window); each window is enlarged to 2048 x 1152 and handed to the image model `gpt_image_2_6_sunburst` with a real satellite photograph (`map-a` `orb-modis-arabia.jpg`, `map-b` `orb-iss35-nile-sinai.jpg`, `map-c` and `map-d` `orb-iss44-sinai.jpg`, all under `references/drafts/working/real/`) and the window prompt below; the height of a window is made by a second call from the new window with the height prompt of the sections below. One take a window, 36 colour and 36 height pictures, all kept as they came (`src/big/map-<level>-w<row><col>.jpg` at JPEG quality 95 and `-h.png`, grey). `enlarge-maps.py join <level>` then lays each window on the parent by an affine fitted by ECC, matches its tone to the parent below 48 px (so the parent keeps its colours and large forms), and joins the nine by a six-level Laplacian blend along seams down the middle of the overlaps: the method that built the approved master (`references/drafts/working/tools/master.py`). The joined picture is 4180 x 2352 and is written 4096 px wide, the largest texture every target device takes. MEASURED fits (`src/big/map-<level>-join.json`; px of a window, one px is 0.4 px of the parent): `map-a` 9 of 9 windows fitted, moved at most 11.38 px at a corner (median 1.66), heights off their windows by at most 1.15 px; `map-b` 9 of 9 windows fitted, moved at most 2.84 px at a corner (median 1.56), heights off their windows by at most 1.61 px; `map-c` 9 of 9 windows fitted, moved at most 2.1 px at a corner (median 1.61), heights off their windows by at most 1.47 px; `map-d` 9 of 9 windows fitted, moved at most 4.56 px at a corner (median 2.03), heights off their windows by at most 1.08 px. The one large move (`map-a-w20`, 11.38 px) is the lower left window, most of it open water. Checked by eye at native size across two seams of every map and on a reduced view of the whole: no ghost edge, no island added in open water, the layout of the parent kept.

The window prompt is one sentence for the level, then the same two endings for every window:

```
map-a: The first reference image is a blurred, low-resolution satellite image of a region about 1,800 kilometres wide: one part of a continent on an ocean world that lies in a dark sea, with long curved mountain ranges of pale rock, lower country between and around them, and a ragged coast with islands and teal shallows.
map-b: The first reference image is a blurred, low-resolution satellite image of a region about 900 kilometres wide: one part of a continent on an ocean world, with curved mountain ranges of pale rock, lower country between them and a dark sea.
map-c: The first reference image is a blurred, low-resolution satellite image of a region about 390 kilometres wide: one part of a great ring-shaped mountain massif of pale rock around a round black-blue lake, with lower country around the massif and the sea beyond.
map-d: The first reference image is a blurred, low-resolution satellite image of a region about 110 kilometres wide: one part of a round lake about 100 kilometres across, black-blue in the middle with a thin margin of amber-gold shallows along its shore, and of the high cold massif of pale ivory-grey rock around it.
then: The picture shows only the part that is there. Where it shows open water, the result is the same open water with nothing in it: no island, no ship, no wake. Where it shows land, the result is the same land. Make the same satellite image at full resolution.
then: Keep every coast, range, valley, river, lake, island and colour exactly where it is and at the same size: add nothing new at this scale and move nothing. Add what a real satellite records at this scale and the first image lacks: sharp ridge crests with branching spurs and gullies, snow on the highest crests only, scree and fans at the foot of the ranges, river channels with pale bars and dark growth along them, canyons in the badlands, dunes and dry lake beds in the ochre basins, surf and pale beaches on the coast, shoals and channels in the teal shallows, and deep water that is nearly black. Orthographic, looking straight down, no cloud, no haze, no sun glare, soft light from the upper left. The second reference image is a real satellite photograph: it is the standard for how a satellite records real land and sea, with real detail at every scale and no painted, stylised or generated look. Photographic, sharp from edge to edge. No text, no labels, no grid lines, no border, no logo.
```

Limits. The image tool returns 1672 x 941, so every map was made twice: once whole (`src/map-<level>.png`, the parent, which fixes where everything lies) and once more as nine windows at 2.5 times, joined and written 4096 x 2305 (see "The larger copies"). The joined picture adds detail the parent lacks and keeps the parent's large forms and colours; it is not 2.5 times more true. The heights are not a survey and not in metres. The colour pictures hold soft light from the upper left, so relief lit from another side fights them. The image tool is not seeded: a remake gives another continent in the same place, so the files in `src/` are the source of record.

## `public/assets/reveal/maps/map-a.jpg`

Made by: the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity), then `assets-src/reveal/maps/make-maps.py finish` on Python 3 with Pillow. That gave the parent `assets-src/reveal/maps/src/map-a.png` (1672 x 941). The file in `public/` is the larger copy: nine windows of the parent made again by the same model and joined by `python3 assets-src/reveal/maps/enlarge-maps.py join a` (see "The larger copies"), 4096 x 2305, JPEG quality 90.
From: `assets-src/reveal/maps/src/map-a.png`, made from `src/map-a-1672.png` enlarged to 2048 x 1152. `src/map-a-1672.png` is the first picture: image model `gpt_image_2_6_flare`, prompt `prompt-continent.txt`, pictures passed: `references/approved/7-reveal/reveal-master.jpg` reduced to 2400 px wide, and a real satellite photograph from `references/drafts/working/real/` (`orb-modis-arabia.jpg`; STATED, the first call's arguments were not written to a log).
Pictures passed to the model with the prompt: the enlarged picture, then `references/drafts/working/real/orb-modis-arabia.jpg` (a real photograph, the standard for how a satellite records land and sea; credits in `references/drafts/working/real/CREDITS.md`).
Prompt or command: the prompt below, then `python3 assets-src/reveal/maps/make-maps.py finish`.

```
The first reference image is a blurred, low-resolution satellite image of a whole continent on an ocean world, about 4,500 kilometres wide, lying in a dark sea: long curved mountain ranges of pale rock, lower country between and around them, a ragged coast with islands and teal shallows. Make the same satellite image at full resolution. Keep every coast, range, valley, river, lake, island and colour exactly where it is and at the same size: add nothing new at this scale and move nothing. Add what a real satellite records at this scale and the first image lacks: sharp ridge crests with branching spurs and gullies, snow on the highest crests only, scree and fans at the foot of the ranges, river channels with pale bars and dark growth along them, canyons in the badlands, dunes and dry lake beds in the ochre basins, surf and pale beaches on the coast, shoals and channels in the teal shallows, and deep water that is nearly black. Orthographic, looking straight down, no cloud, no haze, no sun glare, soft light from the upper left. The second reference image is a real satellite photograph: it is the standard for how a satellite records real land and sea, with real detail at every scale and no painted, stylised or generated look. Photographic, sharp from edge to edge. No text, no labels, no grid lines, no border, no logo.
```

Takes: the first picture 2 made, take 1 kept; this picture 1 made at full detail, kept. The larger copy: 9 windows, 1 take each, all kept.
Why this one: the whole body, about 4,536 km wide: the ground the camera sees at this height of the rise, as a satellite records land, which the procedural terrain of versions 1 to 3 did not reach (round 13: 15 of 25 jurors named procedural terrain first).
Date: 2026-11-26

## `public/assets/reveal/maps/map-b.jpg`

Made by: the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity), then `assets-src/reveal/maps/make-maps.py finish` on Python 3 with Pillow. That gave the parent `assets-src/reveal/maps/src/map-b.png` (1672 x 941). The file in `public/` is the larger copy: nine windows of the parent made again by the same model and joined by `python3 assets-src/reveal/maps/enlarge-maps.py join b` (see "The larger copies"), 4096 x 2305, JPEG quality 90.
From: `assets-src/reveal/maps/src/map-b.png`, made from the rect of `map-b` cut out of `src/map-a.png` and enlarged to 2048 x 1152 (`make-maps.py crop b`).
Pictures passed to the model with the prompt: the enlarged picture, then `references/drafts/working/real/orb-modis-arabia.jpg` (a real photograph, the standard for how a satellite records land and sea; credits in `references/drafts/working/real/CREDITS.md`).
Prompt or command: the prompt below, then `python3 assets-src/reveal/maps/make-maps.py finish`.

```
The first reference image is a blurred, low-resolution satellite image of a region about 2,240 kilometres wide: part of a continent on an ocean world, with a ring-shaped mountain massif that holds a round lake, long curved mountain ranges of pale rock, lower country between them and a dark sea. Make the same satellite image at full resolution. Keep every coast, range, valley, river, lake, island and colour exactly where it is and at the same size: add nothing new at this scale and move nothing. Add what a real satellite records at this scale and the first image lacks: sharp ridge crests with branching spurs and gullies, snow on the highest crests only, scree and fans at the foot of the ranges, river channels with pale bars and dark growth along them, canyons in the badlands, dunes and dry lake beds in the ochre basins, surf and pale beaches on the coast, shoals and channels in the teal shallows, and deep water that is nearly black. Orthographic, looking straight down, no cloud, no haze, no sun glare, soft light from the upper left. The second reference image is a real satellite photograph: it is the standard for how a satellite records real land and sea, with real detail at every scale and no painted, stylised or generated look. Photographic, sharp from edge to edge. No text, no labels, no grid lines, no border, no logo.
```

Takes: 2 made. Take 1 by `gpt_image_2_6_flare`, set aside (it changed the shape of the lake between levels). Take 2 by `gpt_image_2_6_sunburst`, kept. The larger copy: 9 windows, 1 take each, all kept.
Why this one: head and shoulders, about 2,244 km wide: the ground the camera sees at this height of the rise, as a satellite records land, which the procedural terrain of versions 1 to 3 did not reach (round 13: 15 of 25 jurors named procedural terrain first).
Date: 2026-11-26

## `public/assets/reveal/maps/map-c.jpg`

Made by: the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity), then `assets-src/reveal/maps/make-maps.py finish` on Python 3 with Pillow. That gave the parent `assets-src/reveal/maps/src/map-c.png` (1672 x 941). The file in `public/` is the larger copy: nine windows of the parent made again by the same model and joined by `python3 assets-src/reveal/maps/enlarge-maps.py join c` (see "The larger copies"), 4096 x 2305, JPEG quality 90.
From: `assets-src/reveal/maps/src/map-c.png`, made from the rect of `map-c` cut out of `src/map-b.png` and enlarged to 2048 x 1152 (`make-maps.py crop c`).
Pictures passed to the model with the prompt: the enlarged picture, then `references/drafts/working/real/orb-iss35-nile-sinai.jpg` (a real photograph, the standard for how a satellite records land and sea; credits in `references/drafts/working/real/CREDITS.md`).
Prompt or command: the prompt below, then `python3 assets-src/reveal/maps/make-maps.py finish`.

```
The first reference image is a blurred, low-resolution satellite image of a region about 970 kilometres wide: a great ring-shaped mountain massif of pale rock with a round black-blue lake about 100 kilometres across at the centre of the picture and a larger dark bay to its right, lower country around the massif and the sea beyond. Make the same satellite image at full resolution. Keep every coast, range, valley, river, lake, island and colour exactly where it is and at the same size: add nothing new at this scale and move nothing. Add what a real satellite records at this scale and the first image lacks: sharp ridge crests with branching spurs and gullies, snow on the highest crests only, scree and fans at the foot of the ranges, river channels with pale bars and dark growth along them, canyons in the badlands, dunes and dry lake beds in the ochre basins, surf and pale beaches on the coast, shoals and channels in the teal shallows, and deep water that is nearly black. Orthographic, looking straight down, no cloud, no haze, no sun glare, soft light from the upper left. The second reference image is a real satellite photograph: it is the standard for how a satellite records real land and sea, with real detail at every scale and no painted, stylised or generated look. Photographic, sharp from edge to edge. No text, no labels, no grid lines, no border, no logo.
```

Takes: 2 made. Take 1 by `gpt_image_2_6_flare`, set aside (it changed the shape of the lake between levels). Take 2 by `gpt_image_2_6_sunburst`, kept. The larger copy: 9 windows, 1 take each, all kept.
Why this one: the skull, about 968 km wide: the ground the camera sees at this height of the rise, as a satellite records land, which the procedural terrain of versions 1 to 3 did not reach (round 13: 15 of 25 jurors named procedural terrain first).
Date: 2026-11-26

## `public/assets/reveal/maps/map-d.jpg`

Made by: the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity), then `assets-src/reveal/maps/make-maps.py finish` on Python 3 with Pillow. That gave the parent `assets-src/reveal/maps/src/map-d.png` (1672 x 941). The file in `public/` is the larger copy: nine windows of the parent made again by the same model and joined by `python3 assets-src/reveal/maps/enlarge-maps.py join d` (see "The larger copies"), 4096 x 2305, JPEG quality 90.
From: `assets-src/reveal/maps/src/map-d.png`, made from the rect of `map-d` cut out of `src/map-c.png` and enlarged to 2048 x 1152 (`make-maps.py crop d`).
Pictures passed to the model with the prompt: the enlarged picture, then `references/drafts/working/real/orb-iss44-sinai.jpg` (a real photograph, the standard for how a satellite records land and sea; credits in `references/drafts/working/real/CREDITS.md`).
Prompt or command: the prompt below, then `python3 assets-src/reveal/maps/make-maps.py finish`.

```
The first reference image is a blurred, low-resolution satellite image of a region about 270 kilometres wide: a round lake about 100 kilometres across at the centre of the picture, black-blue in the middle with a thin margin of amber-gold shallows all round its shore, set in a high cold massif of pale ivory-grey rock whose ridges and valleys run away from the lake on every side. Make the same satellite image at full resolution. The lake keeps its round shape, its black-blue middle and its thin amber-gold margin, and its shore has small bays, fans and a steep rim wall. Keep every coast, range, valley, river, lake, island and colour exactly where it is and at the same size: add nothing new at this scale and move nothing. Add what a real satellite records at this scale and the first image lacks: sharp ridge crests with branching spurs and gullies, snow on the highest crests only, scree and fans at the foot of the ranges, river channels with pale bars and dark growth along them, canyons in the badlands, dunes and dry lake beds in the ochre basins, surf and pale beaches on the coast, shoals and channels in the teal shallows, and deep water that is nearly black. Orthographic, looking straight down, no cloud, no haze, no sun glare, soft light from the upper left. The second reference image is a real satellite photograph: it is the standard for how a satellite records real land and sea, with real detail at every scale and no painted, stylised or generated look. Photographic, sharp from edge to edge. No text, no labels, no grid lines, no border, no logo.
```

Takes: 2 made. Take 1 by `gpt_image_2_6_flare`, set aside (it changed the shape of the lake between levels). Take 2 by `gpt_image_2_6_sunburst`, kept. The larger copy: 9 windows, 1 take each, all kept.
Why this one: the lake of the Eye, about 274 km wide: the ground the camera sees at this height of the rise, as a satellite records land, which the procedural terrain of versions 1 to 3 did not reach (round 13: 15 of 25 jurors named procedural terrain first).
Date: 2026-11-26

## `public/assets/reveal/maps/map-a-h.png`

Made by: the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity), then `assets-src/reveal/maps/make-maps.py finish`, which writes it as 8 bit grey at the size of the colour picture. That gave the parent height `assets-src/reveal/maps/src/map-a-h.png`. The file in `public/` is the larger copy: the heights of the nine windows, each made by the same model from its new window with the same prompt, laid by the fit of their windows and joined by `python3 assets-src/reveal/maps/enlarge-maps.py join a`, 4096 x 2305, 8 bit grey.
From: `assets-src/reveal/maps/src/map-a-h.png`. Picture passed to the model with the prompt: the enlarged picture `map-a` was made from.
Prompt or command: the prompt below, then `python3 assets-src/reveal/maps/make-maps.py finish`.

```
The first reference image is a satellite image. Make its elevation map: the same picture, pixel for pixel, as a greyscale height field. Black is the sea and every lake. The lowest land is dark grey, higher land is lighter, and the highest crests of the mountain ranges are white. Smooth continuous greys that keep the fine ridges and valleys of the ranges. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 2 made. Take 1 by `gpt_image_2_6_flare`, set aside with its colour picture. Take 2 by `gpt_image_2_6_sunburst`, kept. The larger copy: 9 windows, 1 take each, all kept.
Why this one: relief for `map-a`: black is sea and lake, white the highest crests. It is the model's reading of the picture, not a survey.
Date: 2026-11-26

## `public/assets/reveal/maps/map-b-h.png`

Made by: the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity), then `assets-src/reveal/maps/make-maps.py finish`, which writes it as 8 bit grey at the size of the colour picture. That gave the parent height `assets-src/reveal/maps/src/map-b-h.png`. The file in `public/` is the larger copy: the heights of the nine windows, each made by the same model from its new window with the same prompt, laid by the fit of their windows and joined by `python3 assets-src/reveal/maps/enlarge-maps.py join b`, 4096 x 2305, 8 bit grey.
From: `assets-src/reveal/maps/src/map-b-h.png`. Picture passed to the model with the prompt: the enlarged picture `map-b` was made from.
Prompt or command: the prompt below, then `python3 assets-src/reveal/maps/make-maps.py finish`.

```
The first reference image is a satellite image. Make its elevation map: the same picture, pixel for pixel, as a greyscale height field. Black is the sea and every lake. The lowest land is dark grey, higher land is lighter, and the highest crests of the mountain ranges are white. Smooth continuous greys that keep the fine ridges and valleys of the ranges. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 2 made. Take 1 by `gpt_image_2_6_flare`, set aside with its colour picture. Take 2 by `gpt_image_2_6_sunburst`, kept. The larger copy: 9 windows, 1 take each, all kept.
Why this one: relief for `map-b`: black is sea and lake, white the highest crests. It is the model's reading of the picture, not a survey.
Date: 2026-11-26

## `public/assets/reveal/maps/map-c-h.png`

Made by: the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity), then `assets-src/reveal/maps/make-maps.py finish`, which writes it as 8 bit grey at the size of the colour picture. That gave the parent height `assets-src/reveal/maps/src/map-c-h.png`. The file in `public/` is the larger copy: the heights of the nine windows, each made by the same model from its new window with the same prompt, laid by the fit of their windows and joined by `python3 assets-src/reveal/maps/enlarge-maps.py join c`, 4096 x 2305, 8 bit grey.
From: `assets-src/reveal/maps/src/map-c-h.png`. Picture passed to the model with the prompt: the enlarged picture `map-c` was made from.
Prompt or command: the prompt below, then `python3 assets-src/reveal/maps/make-maps.py finish`.

```
The first reference image is a satellite image. Make its elevation map: the same picture, pixel for pixel, as a greyscale height field. Black is the sea and every lake. The lowest land is dark grey, higher land is lighter, and the highest crests of the mountain ranges are white. Smooth continuous greys that keep the fine ridges and valleys of the ranges. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 2 made. Take 1 by `gpt_image_2_6_flare`, set aside with its colour picture. Take 2 by `gpt_image_2_6_sunburst`, kept. The larger copy: 9 windows, 1 take each, all kept.
Why this one: relief for `map-c`: black is sea and lake, white the highest crests. It is the model's reading of the picture, not a survey.
Date: 2026-11-26

## `public/assets/reveal/maps/map-d-h.png`

Made by: the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity), then `assets-src/reveal/maps/make-maps.py finish`, which writes it as 8 bit grey at the size of the colour picture. That gave the parent height `assets-src/reveal/maps/src/map-d-h.png`. The file in `public/` is the larger copy: the heights of the nine windows, each made by the same model from its new window with the same prompt, laid by the fit of their windows and joined by `python3 assets-src/reveal/maps/enlarge-maps.py join d`, 4096 x 2305, 8 bit grey.
From: `assets-src/reveal/maps/src/map-d-h.png`. Picture passed to the model with the prompt: the enlarged picture `map-d` was made from.
Prompt or command: the prompt below, then `python3 assets-src/reveal/maps/make-maps.py finish`.

```
The first reference image is a satellite image. Make its elevation map: the same picture, pixel for pixel, as a greyscale height field. Black is the sea and every lake. The lowest land is dark grey, higher land is lighter, and the highest crests of the mountain ranges are white. Smooth continuous greys that keep the fine ridges and valleys of the ranges. No shading, no shadows, no light direction, no colour, no outlines, no contour lines, no text.
```

Takes: 2 made. Take 1 by `gpt_image_2_6_flare`, set aside with its colour picture. Take 2 by `gpt_image_2_6_sunburst`, kept. The larger copy: 9 windows, 1 take each, all kept.
Why this one: relief for `map-d`: black is sea and lake, white the highest crests. It is the model's reading of the picture, not a survey.
Date: 2026-11-26

## `public/assets/reveal/maps/maps.json`

Made by: `assets-src/reveal/maps/make-maps.py finish`, then `assets-src/reveal/maps/enlarge-maps.py join <level>`, which writes the width and height of each larger copy and marks the row `madeFrom`.
From: the rects in `make-maps.py` (`RECTS`, `S`, `LAKE_A`, `LAKE_M`, `KM`).
Prompt or command: `python3 assets-src/reveal/maps/make-maps.py finish`, then `python3 assets-src/reveal/maps/enlarge-maps.py join a` (and `b`, `c`, `d`).
Takes: not generated.
Why this one: where each map lies on the approved master, in the units of `src/places/reveal/land/levels.ts`.
Date: 2026-11-26
