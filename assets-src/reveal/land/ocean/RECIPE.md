# Recipes: the sea from orbit, the other land and the ice

## ocean-bed.jpg

Made by: `assets-src/reveal/land/ocean/make_ocean.py` (Python 3, numpy, OpenCV, Pillow). No image model.
From: `assets-src/reveal/land/ocean/body-10027.png` (the part reveal/continent drawn alone at film frame 10027, review hd: where the film draws the body), and fixed seeds in the script.
Prompt or command: `python3 assets-src/reveal/land/ocean/make_ocean.py` from the repo root (amount E is the default). Writes `public/assets/reveal/land/ocean-bed.jpg`, `ocean-land.jpg` and `assets-src/reveal/land/ocean/ocean-mask.png`.
Takes: the last of about 34 runs (not counted one by one) as the layout, the bed, the ice and the silt were tuned.
Why this one: the sea of the titan frame was one navy. The map gives it a bed (red: basins, a rise to the body, a trench and a platform for the island arc, banks, the shelves of the other land), bloom drawn out along one current field that follows the lines of equal depth and the silt of three rivers of the lower leg, carried from their mouths by that same field (green: under a half bloom, over it silt), and the cold water and the ice (blue: under 0.45 cold, over 0.5 ice: a sheet that lies on over the far land to the planet's edge, bare rock at its shore and its peaks standing out of the ice where it faces the body, and before it on the sea a pack that is rafts some hundreds of km across to the land's edge, with wide dark leads between them and a hard seaward edge along their sides). 4096 x 2504 over the master rectangle x -1800 to 7416, y -800 to 4834.
Date: 2026-11-28

## ocean-land.jpg

Made by: `assets-src/reveal/land/ocean/make_ocean.py` (Python 3, numpy, OpenCV, Pillow). No image model.
From: `assets-src/reveal/land/ocean/body-10027.png` and fixed seeds in the script.
Prompt or command: `python3 assets-src/reveal/land/ocean/make_ocean.py` from the repo root (the same run as ocean-bed.jpg). `--amount A`, `C`, `B` and `D` give less of the other land; `E` has the largest islands in the arc.
Takes: the last of about 34 runs. Amounts A, C and B, then B, D and E were drawn side by side for the lead; E is kept by the lead's ruling.
Why this one: Brandon's note of 27 November: no other landmasses. An island arc of unlike volcanic islands convex toward the body, low islands on rises at the top and in the sun's image, a far coast under the planet's edge and, from amount D, a mainland behind the arc that runs on out of the map at the lower left, a land at the top edge of the titan's frame right of where the upper hand points and a land below the hurricane that the pull back uncovers, each a height field cut by a stream power erosion (red, green: its slope; blue: its height, over 0.3 land, under it how shallow the water by it is). Nothing nearer the body than 330 px of the master, nothing by the hurricane.
Date: 2026-11-28
