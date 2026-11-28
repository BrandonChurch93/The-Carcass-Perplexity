# Recipes: the sea from orbit, the other land and the ice

## ocean-bed.jpg

Made by: `assets-src/reveal/land/ocean/make_ocean.py` (Python 3, numpy, OpenCV, Pillow). No image model.
From: `assets-src/reveal/land/ocean/body-10027.png` (the part reveal/continent drawn alone at film frame 10027, review hd: where the film draws the body), and fixed seeds in the script.
Prompt or command: `python3 assets-src/reveal/land/ocean/make_ocean.py` from the repo root (amount D is the default). Writes `public/assets/reveal/land/ocean-bed.jpg`, `ocean-land.jpg` and `assets-src/reveal/land/ocean/ocean-mask.png`.
Takes: the last of about 25 runs (not counted one by one) as the layout, the bed, the ice and the silt were tuned.
Why this one: the sea of the titan frame was one navy. The map gives it a bed (red: basins, a rise to the body, a trench and a platform for the island arc, banks, the shelves of the other land), bloom drawn out along one current field that follows the lines of equal depth and the silt of three rivers of the lower leg, carried from their mouths by that same field (green: under a half bloom, over it silt), and the cold water and the ice (blue: under 0.45 cold, over 0.5 ice: a sheet that lies on over the far land to the planet's edge, a thin pack with a broken margin on the sea before it). 4096 x 2504 over the master rectangle x -1800 to 7416, y -800 to 4834.
Date: 2026-11-28

## ocean-land.jpg

Made by: `assets-src/reveal/land/ocean/make_ocean.py` (Python 3, numpy, OpenCV, Pillow). No image model.
From: `assets-src/reveal/land/ocean/body-10027.png` and fixed seeds in the script.
Prompt or command: `python3 assets-src/reveal/land/ocean/make_ocean.py` from the repo root (the same run as ocean-bed.jpg). `--amount A`, `C` and `B` give less of the other land, `E` larger islands in the arc.
Takes: the last of about 25 runs. Amounts A, C and B, then B, D and E were drawn side by side for the lead; D is kept until the lead chooses.
Why this one: Brandon's note of 27 November: no other landmasses. An island arc of unlike volcanic islands convex toward the body, low islands on rises at the top and in the sun's image, a far coast under the planet's edge and, from amount D, a mainland behind the arc that runs on out of the map at the lower left, each a height field cut by a stream power erosion (red, green: its slope; blue: its height, over 0.3 land, under it how shallow the water by it is). Nothing nearer the body than 330 px of the master, nothing by the hurricane.
Date: 2026-11-28
