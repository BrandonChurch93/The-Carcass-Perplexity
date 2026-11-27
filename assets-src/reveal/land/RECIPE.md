# The pictures of the land

The ground of the rise is drawn from the Builder's four nested satellite maps (`public/assets/reveal/maps/`, recipe in `assets-src/reveal/maps/RECIPE.md`). This folder makes what the shader needs beside them: the relief of each map as slopes, the shore and the light. In the second wave it also holds two regions of the maps drawn again as country (the last two sections), which `make_country.py` lays into maps a, b and c before the relief is made.

## `public/assets/reveal/land/relief-{a,b,c,d}.png`

Made by: `assets-src/reveal/land/make_relief.py` on Python 3 with numpy, scipy and Pillow.
From: `public/assets/reveal/maps/map-<level>-h.png` (the height) and `public/assets/reveal/maps/map-<level>.jpg` (only how light the water is).
Prompt or command: `python3 assets-src/reveal/land/make_relief.py` from the root of the repo (under a minute).
Takes: not generated. The numbers at the top of the script were set by looking at the keys.
Why this one: the shader lights the land from a slope and never differences a stored 8 bit height, which is what gave the first owner's close frames their contour banding. Red and green are the slope on x and y (0.5 is level), taken in floating point after a small blur, with the step at the coast taken out. Blue over 0.3 is the height of the land; blue under 0.25 is water and how shallow it is.
Date: 2026-11-26

Each file has the size of its map: when a larger copy of a map arrives under the same name, run the script again.

## `public/assets/reveal/land/lakebed.png`

Made by: `assets-src/reveal/land/lake/make_lakebed.py` on Python 3 with numpy, scipy and Pillow.
From: `references/approved/7-reveal/reveal-1-above-the-lake.jpg` and its window in the master from `references/approved/7-reveal/pullback.json`. The picture is measured, not copied: where it has water, how much amber stands in that water, where the feeder's mouth lies. No pixel of it is read as colour.
Prompt or command: `python3 assets-src/reveal/land/lake/make_lakebed.py` from the root of the repo (about a minute and a half).
Takes: not generated. Four passes of the numbers at the top of the script, each set beside the first approved picture.
Why this one: the lake of the Eye was a round of constants broken by noise, its shore a bent circle that stood about a sixth too wide on the west. This map is the bed of the lake and of the two pools in that window, 2048 x 1152 over the window of the first approved picture (0.123 km a texel). Red is the signed distance to the shore in the code of `shore-*.png` (so the depth of the water is read from it, and the shore under the mist of the north east wall is traced by hand along the wall's foot). Green is how much silt stands in the water, drawn along the way the water turns so it frays into threads, and on land the silt of the nearest water, which says where the shore is stained. Blue is the pale bars of the delta at the feeder's mouth, a fan that branches, seeded.
Date: 2026-11-27

## `public/assets/reveal/land/shore-{a,b,c,d}.png`

Made by: `assets-src/reveal/land/make_bake.py` on Python 3 with numpy, scipy and Pillow.
From: `public/assets/reveal/land/relief-<level>.png` (blue: land or water) and `public/assets/reveal/maps/map-<level>-h.png` (the height the rivers drain by).
Prompt or command: `python3 assets-src/reveal/land/make_bake.py` from the root of the repo (under a minute).
Takes: not generated. The numbers at the top of the script were set by looking at the keys.
Why this one: the coast has to be a line with a shelf, a wet edge and surf, and a line needs a distance, not a mask. Each file stores the signed distance to the nearest coast (0.5 is the coast, land above, water below), measured in floating point; the rivers found by drainage are cut into levels a and b with their widths and delta fans.
Date: 2026-11-26

## `public/assets/reveal/land/light-{a,b,c,d}.jpg`

Made by: `assets-src/reveal/land/make_bake.py` on Python 3 with numpy, scipy and Pillow.
From: `public/assets/reveal/maps/map-<level>-h.png` (the height) and `public/assets/reveal/land/relief-<level>.png` (land or water).
Prompt or command: `python3 assets-src/reveal/land/make_bake.py` from the root of the repo (under a minute).
Takes: not generated. The numbers at the top of the script were set by looking at the keys.
Why this one: red is the height of the horizon toward the azimuth of the sun, so the shader compares it with the sun's height and the shadows lengthen as the day ends; green is how much sky a point sees; blue marks water shut inside the land. A fixed shadow would have stood still through the ending.
Date: 2026-11-26

## `assets-src/reveal/land/chest/chest-take3.jpg`, `chest-take3-h.png`

Made by: the image model behind `generate_image` (through Perplexity, the tool's default model; the tool did not return the model's name), then `assets-src/reveal/land/make_country.py` on Python 3 with numpy, scipy, OpenCV and Pillow.
From: the rectangle 1950, 1022 to 3486, 2046 of the master (the chest) cut out of `public/assets/reveal/maps/map-a.jpg` as it stood at commit 6e539cf, one px of the picture to one px of the master (1536 x 1024), and the real photograph `references/drafts/working/real/orb-modis-arabia.jpg` as the standard. `chest-take3-h.png` is the same model's reading of `chest-take3.jpg` with prompt `h` of `assets-src/reveal/maps/prompt-levels.json`, kept as 8 bit grey.
Prompt or command: STATED from the builder's notes, the calls' strings were not written to a log. "Edit the first image, a straight-down satellite view of a region about 1,300 km wide. The central valley with its river and the range along it stay exactly as they are, and the outer tenth of the picture stays exactly as it is. The country on both sides is drawn again as two orders of mountains. Six of the long ranges of the reference remain on each side as great ranges, each a continuous line of snow and pale bare rock, most of them 300 to 450 km long, of unlike length, spacing and bend; two of them are broken in the middle with the outer half shifted sideways. Between them lies lower country without snow: oblique ranges, foothills, and valley floors of unlike width. Same colours as the first image, orthographic, soft light from the upper left, as real as the second image, a photograph. No text." Then `python3 assets-src/reveal/land/make_country.py`, `make_relief.py`, `make_bake.py` (LEVELS=abc for the three maps that changed).
Takes: 5 of 6. Take 5 (from the first map, asked to keep the parallel ranges and leave five or six a side great) turned the ranges along the valley and fanned them from the neck: not used. Take 1 (basin and range, no two ranges alike, three broken, two merged) lost the ribs altogether at frame 10027. Take 2 (the same from a warped, blurred guide) came out as river country. Take 4 (about six ranges a side, one forked, one pair merged into a massif) broke the figure more than take 3 at 10027. All four were tried in the build at frames 9756, 9841 and 10027.
Why this one: on the Builder's map each rib is one even pale range, all of one spacing, and from frame 9700 that is a ribcage (Brandon's note 10, the lead's list item 1). Take 3 reads as mountain country at 9756 and 9841 and still holds a ragged figure of ranges at 10027. It is laid into map a and into the part of map b that holds it (b is the take enlarged 1.56 times: softer there than b's own detail).
Date: 2026-11-26
Now: these two files are no longer laid whole. They are the eastern part of `chest.jpg` and `chest-h.png` (next section).

## `assets-src/reveal/land/chest/chest.jpg`, `chest-h.png`, and through them `public/assets/reveal/maps/map-{a,b}.jpg`, `map-{a,b}-h.png`

Made by: `assets-src/reveal/land/chest/blend_first.py` on Python 3 with numpy, OpenCV and Pillow, then `make_country.py`, `make_relief.py`, `make_bake.py`.
From: the rectangle 1950, 1022 to 3486, 2046 of the master cut out of `map-a.jpg` and `map-a-h.png` as they stood at commit 6e539cf (the Builder's chest, its ranges parallel, leaving the valley of the spine along its length), and `chest-take3.jpg`, `chest-take3-h.png`.
Prompt or command: `python3 assets-src/reveal/land/chest/blend_first.py` from the root of the repo (the first map west of 0.6 of the width, take 3 east of it, over a seam 140 px wide that wanders by smoothed noise, seed 7), then `LEVELS=ab python3 assets-src/reveal/land/make_country.py && LEVELS=ab python3 assets-src/reveal/land/make_relief.py && LEVELS=ab python3 assets-src/reveal/land/make_bake.py`.
Takes: 1, computed.
Why this one: with take 3 laid whole the chest's pale ranges splayed from the neck like a river fan at frames 9756 and 10027, and at 400 px no ribcage was read (the lead's last order, and the approved pictures reveal-3 and reveal-4 hold parallel ribs). The first map's ranges leave the spine along its length. That they are not one even comb is now the shader's work: `pick` in `src/places/reveal/land/index.ts` lets pale rock stand on some of them and on a part of their length only.
Date: 2026-11-26

## `assets-src/reveal/land/hip/hip.jpg`, `hip-h.png`, and through them `public/assets/reveal/maps/map-a.jpg`, `map-a-h.png`

Made by: the image model behind `generate_image` (through Perplexity, the tool's default model; the tool did not return the model's name), then `assets-src/reveal/land/make_country.py` on Python 3 with numpy, scipy, OpenCV and Pillow.
From: the rectangle 2999.18, 1699.33 to 3999.87, 2449.2 of the master (the country south of the spine by the pelvis, and the thigh) cut out of `public/assets/reveal/maps/map-a.jpg` as it stood with the chest laid in (774 x 580 texels, enlarged twice for the model, kept at 1000 x 750). `hip-h.png` is the same model's reading of `hip.jpg` with prompt `h` of `assets-src/reveal/maps/prompt-levels.json`, kept as 8 bit grey.
Prompt or command: "Edit the first image, a straight-down orthographic satellite view of mountain country about 850 km wide. Keep everything as it is, in place and in colour: every mountain range, ridge, valley, river, forest, the white salt pan with red pools at the top right, the sea and the coasts at the bottom, and the outer tenth of the picture exactly. Change two things only. First: the smooth orange and cream sand field with swirled streaks at the left of centre is now a high eroded massif of pale bare rock: a broken summit ridge with many sharp branching spurs and deep dendritic gullies running down on all sides, dark shadowed ravines, scree fans at its foot, the same kind of rugged pale snowless mountains as the white ranges in the upper middle of the picture. Second: the smooth orange slope at the right of centre is now a long rugged mountain range running from the upper left to the lower right, with a sharp crest line, many side ridges and gullies on both flanks, pale rock on the crest and rust and tan on the lower flanks. No smooth, soft or blurred areas anywhere. Same sharpness, grain and colours as the rest of the first image, soft light from the upper left, no text, no border." Then `python3 assets-src/reveal/land/make_country.py`, `make_relief.py`, `make_bake.py`.
Takes: 1 of 6.
Why this one: on the Builder's map a field of sand lay there, and the shader takes the maps' warmth down: at frame 10027 it stood as one smooth cream dome south of the spine, and the thigh beside it as one soft pale slope (the lead's note after V2: airbrushed, give them relief). The take keeps every range, river and coast round them and gives both places crests, spurs and gullies of the kind the ranges beside them have. The top sixth of the picture, which holds the salt pan of the pelvis, is not laid.
Date: 2026-11-26

## `assets-src/reveal/land/lakes/lakes.jpg`, `lakes-h.png`, and through them `public/assets/reveal/maps/map-{a,b,c}.jpg`, `map-{a,b,c}-h.png`

Made by: the image model behind `generate_image` (through Perplexity, the tool's default model; the tool did not return the model's name), then `assets-src/reveal/land/make_country.py`.
From: the rectangle 1300, 330 to 2836, 1354 of `public/assets/reveal/maps/map-c.jpg` as it stood at commit 6e539cf (1536 x 1024, the massif above the lake of the Eye; in px of the master 1066.49, 1354.03 to 1490.24, 1636.53), and the approved picture `references/approved/7-reveal/reveal-2-skull-massif.jpg` for the look of its lakes. `lakes-h.png` is the same model's reading of `lakes.jpg` with prompt `h` of `assets-src/reveal/maps/prompt-levels.json`, kept as 8 bit grey.
Prompt or command: "Edit the first image, a straight-down orthographic satellite view of dry mountain country about 360 km wide. Keep everything as it is, in place and in colour: the great round crater lake at the bottom with its tan rim, the small lakes at the right, the sea inlet at the lower right corner, every range, valley and river, and the outer tenth of the picture exactly. Change one thing only: in the upper middle, where the snowy massif stands, there is now a lake district. A cluster of four dark deep lakes of unlike sizes and shapes: the largest an irregular oval about a third as wide as the crater lake, a second half that size and kidney shaped, and two small tarns, none of them round, set unevenly, none in line. Each lake lies in its own basin among the ridges, with a pale crenellated frilly rim of bare rock and dry silt terraces round it, short gullies running down into it, and deep dark blue-black water with a thin teal shallow margin, as the dark lakes and their pale frilly rims in the second image. The ridges between the lakes stay mountain country, as elsewhere in the picture. Same sharpness, grain and colours as the first image, soft light from the upper left, no text, no border." Then `python3 assets-src/reveal/land/make_country.py`, which lays only the window of the picture that holds the district (0.17 to 0.7 of its width, the upper 0.42 of its height).
Takes: 2 of 6. Take 2 (one long bent lake, one lobed lake, a tarn) was as good; take 1 has the more unlike sizes.
Why this one: at frames 9675 and 9700 the lake of the Eye and one dark basin beside it stood as two sockets of a face (the lead's list item 1). The approved picture reveal-2 has a lake district there: several dark lakes of unlike sizes with pale frilled rims, so no two pair. The lakes are real water in the maps at every height: the height picture is black on them, so the relief, the shore and the light are made from them like any other lake.
Date: 2026-11-26
