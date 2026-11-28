# Asset rows, reveal_body_builder_n30

| file | what | tool or model | prompt | take | date |
| --- | --- | --- | --- | --- | --- |
| public/assets/reveal/land/body-colour.jpg | the colour of the country of the whole body seen from orbit, computed from an eroded height field: height, slope, drainage and distance to the shore, province by province. 3072 x 1728 | assets-src/reveal/land/body/make_body.py (numpy, scipy, Pillow, numba) from maps/map-a-h.png, maps/map-a.jpg, land/shore-a.png | none, computed | seed 30 | 2026-11-28 |
| public/assets/reveal/land/body-relief.jpg | the relief of the same height field in the encoding of relief-a.jpg: red and green the slope, blue the height of the land or the shallowness of water. 3072 x 1728 | the same script | none, computed | seed 30 | 2026-11-28 |
| public/assets/reveal/land/body-light.jpg | the baked light of the same height field in the encoding of light-a.jpg: red the horizon toward the day's sun, green the open sky, blue the shut waters (kept from light-a.jpg). 2048 x 1152 | the same script | none, computed | seed 30 | 2026-11-28 |
