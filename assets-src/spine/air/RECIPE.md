# Recipes, the storm masses of the Spine (spine_sky_builder)

Each is one storm cloud mass cut out on a clear ground, drawn by `src/places/spine/air/masses.ts` on two rings about the ridge, before the dome. The loaded file is made from its source by `assets-src/spine/air/massproc.py`, run from the root of the repo: the colour is carried out into the clear so no fringe shows, the cut is softened, nothing is left at the border, and the JPEG holds the colour in its upper half and the cut in its lower.

## `public/assets/spine/mat/mass-a.jpg`
Made by: `generate_image` (default model, transparent ground, 16:9, one reference picture), then `assets-src/spine/air/massproc.py` (Python 3 with Pillow and numpy)
From: `references/approved/5-spine/spine-0-establishing.jpg` (reference for the generator), `assets-src/spine/air/mass-a-1.png` (the generated source), `assets-src/spine/air/massproc.py`
Prompt or command: "Photograph, long lens, of one single towering storm cloud mass standing alone, cut out on a fully transparent background. The cloud is a cumulonimbus flank at dusk in the same weather and colour as the storm in the reference picture: dark slate blue-grey, heavy round billow heads stacked on each other with hard pale lit rims on the side toward the right, deep dark creases between the heads, a dark flat base, and torn ragged edges with wisps and shreds blown off to the right by a gale. A faint violet glow from inside the thickest part. Real photographic cloud detail, sharp, high contrast inside the mass. Only the cloud: no ground, no mountain, no horizon, no lightning bolt, no sky behind it, no text. The cloud fills most of the frame and its edges fade to full transparency before the frame's border on every side. The mass is wider than tall, a long shelf with three great heads." Then `python3 assets-src/spine/air/massproc.py`.
Takes: 1 made, 1 kept
Why this one: a long shelf with three heads: the near ring wants breadth
Date: 2026-11-26

## `public/assets/spine/mat/mass-b.jpg`
Made by: `generate_image` (default model, transparent ground, 4:3, one reference picture), then `assets-src/spine/air/massproc.py` (Python 3 with Pillow and numpy)
From: `references/approved/5-spine/spine-0-establishing.jpg` (reference for the generator), `assets-src/spine/air/mass-b-1.png` (the generated source), `assets-src/spine/air/massproc.py`
Prompt or command: the prompt below, as written, ending "The mass is tall, a tower leaning to the right with an anvil shred torn off its top." Then `python3 assets-src/spine/air/massproc.py`. The prompt: "Photograph, long lens, of one single towering storm cloud mass standing alone, cut out on a fully transparent background. The cloud is a cumulonimbus flank at dusk in the same weather and colour as the storm in the reference picture: dark slate blue-grey, heavy round billow heads stacked on each other with hard pale lit rims on the side toward the right, deep dark creases between the heads, a dark flat base, and torn ragged edges with wisps and shreds blown off to the right by a gale. A faint violet glow from inside the thickest part. Real photographic cloud detail, sharp, high contrast inside the mass. Only the cloud: no ground, no mountain, no horizon, no lightning bolt, no sky behind it, no text. The cloud fills most of the frame and its edges fade to full transparency before the frame's border on every side. "
Takes: 1 made, 1 kept
Why this one: a tall leaning tower: height for the far ring
Date: 2026-11-26

## `public/assets/spine/mat/mass-c.jpg`
Made by: `generate_image` (default model, transparent ground, 16:9, one reference picture), then `assets-src/spine/air/massproc.py` (Python 3 with Pillow and numpy)
From: `references/approved/5-spine/spine-0-establishing.jpg` (reference for the generator), `assets-src/spine/air/mass-c-1.png` (the generated source), `assets-src/spine/air/massproc.py`
Prompt or command: the prompt below with "one single storm cloud mass" for "one single towering storm cloud mass" and "part of a cumulonimbus" for "a cumulonimbus flank", ending "The mass is a long low ragged shelf, much wider than tall, its underside hanging in dark torn rags and its top a row of small rolling heads, with a gap torn through it left of the middle." Then `python3 assets-src/spine/air/massproc.py`. The prompt: "Photograph, long lens, of one single towering storm cloud mass standing alone, cut out on a fully transparent background. The cloud is a cumulonimbus flank at dusk in the same weather and colour as the storm in the reference picture: dark slate blue-grey, heavy round billow heads stacked on each other with hard pale lit rims on the side toward the right, deep dark creases between the heads, a dark flat base, and torn ragged edges with wisps and shreds blown off to the right by a gale. A faint violet glow from inside the thickest part. Real photographic cloud detail, sharp, high contrast inside the mass. Only the cloud: no ground, no mountain, no horizon, no lightning bolt, no sky behind it, no text. The cloud fills most of the frame and its edges fade to full transparency before the frame's border on every side. "
Takes: 1 made, 1 kept
Why this one: a low ragged shelf with a gap: the near ring is not a wall
Date: 2026-11-26

## `public/assets/spine/mat/mass-d.jpg`
Made by: `generate_image` (default model, transparent ground, 4:3, one reference picture), then `assets-src/spine/air/massproc.py` (Python 3 with Pillow and numpy)
From: `references/approved/5-spine/spine-0-establishing.jpg` (reference for the generator), `assets-src/spine/air/mass-d-1.png` (the generated source), `assets-src/spine/air/massproc.py`
Prompt or command: the prompt below with the same two changes as mass-c, ending "The mass is a great heap of two unequal towers, the left one taller and darker, the right one lower with its top sheared flat by the wind." Then `python3 assets-src/spine/air/massproc.py`. The prompt: "Photograph, long lens, of one single towering storm cloud mass standing alone, cut out on a fully transparent background. The cloud is a cumulonimbus flank at dusk in the same weather and colour as the storm in the reference picture: dark slate blue-grey, heavy round billow heads stacked on each other with hard pale lit rims on the side toward the right, deep dark creases between the heads, a dark flat base, and torn ragged edges with wisps and shreds blown off to the right by a gale. A faint violet glow from inside the thickest part. Real photographic cloud detail, sharp, high contrast inside the mass. Only the cloud: no ground, no mountain, no horizon, no lightning bolt, no sky behind it, no text. The cloud fills most of the frame and its edges fade to full transparency before the frame's border on every side. "
Takes: 1 made, 1 kept
Why this one: two unequal towers: no two masses of the far ring are one shape
Date: 2026-11-26
