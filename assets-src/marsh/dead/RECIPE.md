# The dead of the Blood Marsh: what is made and how

## `public/assets/marsh/dead/carcass-nh.jpg` and `public/assets/marsh/dead/carcass-m.jpg`

Made by: `assets-src/marsh/dead/make-carcass.py`, first on Blender's Python (`/home/user/bpyenv/bin/python`, bpy 5.0.1 with numpy 1.26.4), then on Python 3.14.8 with Pillow 13.0.0 and numpy 2.5.5. No image model and no picture goes in: every number comes from the seed in the script.
From: nothing but the script.
Prompt or command: `/home/user/bpyenv/bin/python assets-src/marsh/dead/make-carcass.py`, then `python3 assets-src/marsh/dead/make-carcass.py pack`
Takes: 1 made (the one try of the object in Blender), take 1 kept.
Why this one: one dead wallower as the salt leaves it, sculpted and seen from straight above, 2.56 m along the body by 1.6 m across it: a spine with its knuckles, hips and shoulders standing and the middle fallen in, ribs slipped and broken, four stiff legs each its own way, a blunt skull with limp feelers, and a hide let down over the bones, slack between them and torn through in holes. `carcass-nh.jpg` is the surface's normal (red, green) and its height (blue, 0.5 m for the whole of blue) that the vertices of each dead one are raised by; `carcass-m.jpg` is bare bone (red), hide torn through to the hollow under it (green) and how open each spot is to the sky (blue). It replaces the ribs and spine drawn by formula in `src/places/marsh/dead/index.ts`, which read as a plain white ribcage shell (made by `marsh_ground_builder_w3`).
Date: 2026-11-28
