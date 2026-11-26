# The pictures of the land

The ground of the rise is drawn from the Builder's four nested satellite maps (`public/assets/reveal/maps/`, recipe in `assets-src/reveal/maps/RECIPE.md`). This folder makes only what the shader needs beside them: the relief of each map as slopes.

## `public/assets/reveal/land/relief-{a,b,c,d}.png`

Made by: `assets-src/reveal/land/make_relief.py` on Python 3 with numpy, scipy and Pillow.
From: `public/assets/reveal/maps/map-<level>-h.png` (the height) and `public/assets/reveal/maps/map-<level>.jpg` (only how light the water is).
Prompt or command: `python3 assets-src/reveal/land/make_relief.py` from the root of the repo (under a minute).
Takes: not generated. The numbers at the top of the script were set by looking at the keys.
Why this one: the shader lights the land from a slope and never differences a stored 8 bit height, which is what gave the first owner's close frames their contour banding. Red and green are the slope on x and y (0.5 is level), taken in floating point after a small blur, with the step at the coast taken out. Blue over 0.3 is the height of the land; blue under 0.25 is water and how shallow it is.
Date: 2026-11-26

Each file has the size of its map: when a larger copy of a map arrives under the same name, run the script again.

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
