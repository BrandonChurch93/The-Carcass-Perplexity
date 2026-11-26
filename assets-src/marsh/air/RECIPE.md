# Recipes of the marsh's air

The two sky pictures the marsh's dome reads, each with its painted rain taken out. The rain itself is drawn by the air pass (`src/places/marsh/air/volume.ts`), so that it can walk and fall; a painted shaft under it would stand still.

## `public/assets/marsh/mat/far-dry.jpg`

Made by: `assets-src/marsh/air/dry.py` on Python 3 with Pillow 13.0.0. No model.
From: `public/assets/marsh/mat/far.jpg`, the far picture of the place as it stood on main.
Prompt or command: `python3 assets-src/marsh/air/dry.py` from the repo root. It smears the picture across the box of the painted shaft (x 0.55 to 0.9, y 0 to 0.4 of the picture), 90 px wide and none down, and lays the smear back through a mask feathered by 45 px.
Takes: 1 made, take 1 kept.
Why this one: the cloud's own grey and the line of the escarpment are kept, the upright streaks are gone, and no edge of the box shows.
Date: 2026-11-26

## `public/assets/marsh/mat/sky-dry.jpg`

Made by: `assets-src/marsh/air/dry.py` on Python 3 with Pillow 13.0.0. No model.
From: `public/assets/marsh/mat/sky.jpg`, the overcast picture of the place as it stood on main.
Prompt or command: `python3 assets-src/marsh/air/dry.py` from the repo root. It smears the picture across the box of the painted rain (x 0.36 to 0.84, y 0.5 to 1 of the picture), 110 px wide and none down, and lays the smear back through a mask feathered by 60 px.
Takes: 1 made, take 1 kept.
Why this one: the lumps of the overcast are kept and its painted rain is gone, so the only rain in the frame is the one that moves.
Date: 2026-11-26
