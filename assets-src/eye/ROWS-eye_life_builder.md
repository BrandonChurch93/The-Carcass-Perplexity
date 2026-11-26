# Assets of eye_life_builder

| file | what | tool or model | prompt | take | date |
| --- | --- | --- | --- | --- | --- |
| `assets-src/eye/drinker/hide-take1.png` | source picture of the drinkers' hide | generate_image | Seamless tileable texture, top-down macro photograph of pale hairless wrinkled animal hide, like the naked skin of an elephant calf or a hairless camel: a dense net of fine cross-hatched wrinkles and creases, pores, a few deeper folds, pale cream beige with pink undertone, faint grey-brown mottled blotches, dust and a few dried mud flecks. Perfectly flat even diffuse light, no cast shadows, no vignette, uniform coverage edge to edge, no objects, no text. | 1 of 1 | 2026-11-26 |
| `public/assets/eye/drinker/hide.png` | the hide, repeating, 1024: rgb its colour, a its relief | `assets-src/eye/drinker/build_hide.py` from hide-take1.png | | | 2026-11-26 |
| `public/assets/eye/drinker/coat.jpg` | the picture of the whole animal from the side, its ground filled with the nearest hide | `assets-src/eye/drinker/build_coat.py` from `public/assets/eye/mat/drinker-up.jpg` and its relief | | | 2026-11-26 |
| `src/places/eye/drinkers/body.data.ts` | the drinker's body: surface, bones, weights, shade, two levels | `assets-src/eye/drinker/build_body.py` (computed: distance field, marching cubes) | | | 2026-11-26 |
