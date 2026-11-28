# Recipes: the sea from orbit, the other land and the ice

## ocean-bed.jpg

Made by: `assets-src/reveal/land/ocean/make_ocean.py` (Python 3, numpy, OpenCV, Pillow). No image model.
From: `assets-src/reveal/land/ocean/body-10027.png` (the part reveal/continent drawn alone at film frame 10027, review hd: where the film draws the body), and fixed seeds in the script.
Prompt or command: `python3 assets-src/reveal/land/ocean/make_ocean.py --amount C` from the repo root. Writes `public/assets/reveal/land/ocean-bed.jpg`, `ocean-land.jpg` and `assets-src/reveal/land/ocean/ocean-mask.png`.
Takes: 1 of 6 runs as the layout and the bed were tuned; the last is kept.
Why this one: the sea of the titan frame was one navy. The map gives it a bed (red: basins, a rise to the body, a trench and a platform for the island arc, banks, the shelves of the other land), bloom drawn out along one current field that follows the lines of equal depth (green), and the cold water and the pack ice off the far coast (blue: under 0.45 cold, over 0.5 floes and leads). 4096 x 2504 over the master rectangle x -1800 to 7416, y -800 to 4834.
Date: 2026-11-28

## ocean-land.jpg

Made by: `assets-src/reveal/land/ocean/make_ocean.py` (Python 3, numpy, OpenCV, Pillow). No image model.
From: `assets-src/reveal/land/ocean/body-10027.png` and fixed seeds in the script.
Prompt or command: `python3 assets-src/reveal/land/ocean/make_ocean.py --amount C` from the repo root (the same run as ocean-bed.jpg). `--amount A` and `--amount B` give less and more of the other land.
Takes: 1 of 6 runs; the last is kept. Amounts A, B and C were drawn side by side for the lead.
Why this one: Brandon's note of 27 November: no other landmasses. An island arc of unlike volcanic islands convex toward the body, low islands on rises at the top and in the sun's image, and a far coast under the planet's edge, each a height field cut by a stream power erosion (red, green: its slope; blue: its height, over 0.3 land, under it how shallow the water by it is). Nothing nearer the body than 330 px of the master, nothing by the hurricane.
Date: 2026-11-28
