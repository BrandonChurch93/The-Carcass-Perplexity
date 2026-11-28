# Files of the reveal's sky that are not computed in the build (reveal_weather_builder_n30)

| file | what | tool or model | prompt | take | date |
| --- | --- | --- | --- | --- | --- |
| public/assets/reveal/sky/weather.png | The weather systems of the open sea on the rectangle WEATHER_RECT (large patches, the far low and its front, a small storm to the south-west): red how much low cloud, green how much veil, blue the kind (open cells, cumulus in chains, a patch with a body). 1024 x 576, 0.5 MB. | assets-src/reveal/sky/make_weather.py (Python 3, numpy, scipy, Pillow), seeded noise | none: computed, no model | 9 | 2026-11-28 |
| public/assets/reveal/sky/cover.png | The red channel made again: the cloud that other land and the ice hold (deck over the ice edge, banks on the windward coast, lee streets, cloud against the islands and their wakes). Green and blue unchanged to the last bit. 2048 x 1152, 0.8 MB. | assets-src/reveal/sky/make_weather.py, from the ocean builder's mask assets-src/reveal/land/ocean/ocean-mask.png (read, not copied) | none: computed, no model | 9 | 2026-11-28 |
