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
