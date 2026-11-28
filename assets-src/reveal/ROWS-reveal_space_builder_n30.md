# Files of the reveal's space that are not computed in the build (reveal_space_builder_n30)

| file | what | tool or model | prompt | take | date |
| --- | --- | --- | --- | --- | --- |
| public/assets/reveal/sky/space-moon.png | The face of the small moon over the planet's edge, 512 x 512: red how light the ground is, green and blue its slope to the right and down. The place lights it from the scene's sun. | `assets-src/reveal/space/make_space_moon.py` (numpy, scipy, Pillow; seed 30; no model, no picture) | none | 1 | 28 November 2026 |
| public/assets/reveal/sky/space-band.jpg | The glow and the dust lanes of the band of the galaxy behind the stars, 1520 x 480, its own stars taken out. | Perplexity Computer image generation (`generate_image`, default model), then `assets-src/reveal/space/make_space_band.py` | Not kept word for word for this take (see `assets-src/reveal/space/RECIPE.md`): the band of the Milky Way from space, level across a black frame, far stars as grain, dark dust lanes, a warm core left of the middle, no bright stars, no planet, no text. | 1 of 3 | 28 November 2026 |
| src/places/reveal/sky/space-band.ts | The table of how thick the band stands, 95 x 30 letters, by which the stars are set thicker in the band. | `assets-src/reveal/space/make_space_band.py`, from the picture above | none | 1 | 28 November 2026 |
