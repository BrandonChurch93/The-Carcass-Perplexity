# Asset rows, reveal_ocean_builder_n30

| file | what | tool or model | prompt | take | date |
| --- | --- | --- | --- | --- | --- |
| public/assets/reveal/land/ocean-bed.jpg | the sea from orbit over the master rectangle x -1800 to 7416, y -800 to 4834: red the sea bed (0 the deepest basin, 1 a shoal), green bloom along the currents (under a half) and the silt of three rivers (over it), blue the cold of the water (under 0.45) and the ice (over 0.5). 4096 x 2504 | assets-src/reveal/land/ocean/make_ocean.py (numpy, OpenCV, Pillow) from assets-src/reveal/land/ocean/body-10027.png and fixed seeds | none: no image model | last of about 32 runs | 2026-11-28 |
| public/assets/reveal/land/ocean-land.jpg | the other land over the same rectangle: red and green its slope, blue its height (over 0.3 land, under it how shallow the water by it is). 4096 x 2504 | the same run of make_ocean.py | none: no image model | last of about 32 runs | 2026-11-28 |
