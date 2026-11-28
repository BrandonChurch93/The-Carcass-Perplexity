# The pictures of space

What stands beyond the planet's edge in the Reveal: `src/places/reveal/sky/space.ts` draws it. The stars are not a picture: they are
points, laid by a seeded law in the code. The two pictures here are the face of the moon and the glow of the galaxy behind the stars.

Run from the root of the repo. The scripts need python 3 with numpy, scipy and Pillow, and take under a minute each.

```
python3 assets-src/reveal/space/make_space_moon.py
python3 assets-src/reveal/space/make_space_band.py
```

## `public/assets/reveal/sky/space-moon.png`

- Made by: `make_space_moon.py`, in the build's own machine. Nothing painted, nothing copied from a picture, no model.
- From: nothing but the seed in the script (30).
- Command: `python3 assets-src/reveal/space/make_space_moon.py`
- Takes: one (the script is its own recipe; the seed and the law of the plains were set so that the dark plains read as no face).
- What it is: 512 x 512, the face of a small moon seen straight on. Red is how light the ground is (uplands, dark plains, the light dust
  of young craters and three with rays). Green and blue are the slope of the ground to the right and down the picture, 0.5 level, from
  craters laid by the law that the count wider than r falls as r to the power -2, the older ones worn.
- Why this one: the place lights it from the scene's own sun, so its phase and the relief at its terminator follow the film's light.
- Date: 28 November 2026.

## `public/assets/reveal/sky/space-band.jpg`

- Made by: Perplexity Computer's image generation (`generate_image`, the default model of the day), then `make_space_band.py`.
- From: `assets-src/reveal/space/space-band-source.jpg` (take 1 as it came, 2172 x 724, saved as JPEG at quality 92).
- Prompt: the words of takes 1 and 2 were not kept (the builder's notes were shortened before they were written down here). In substance:
  a photograph of the band of the Milky Way from space, level across the middle of a black frame, with a grain of far stars, dark dust
  lanes along its middle and a warm core left of the middle, no bright stars in front, no planet, no text. This picture is to be
  replaced at the next version by take 3, whose prompt is kept word for word.
- Command: `python3 assets-src/reveal/space/make_space_band.py` (cuts the stretch the film sees, 1520 x 480; takes the picture's own stars out with
  a median of 5 px, since a soft picture of a star is a blob and the place draws its stars as points over the band; takes the floor off so
  black is black; fades it to nothing before its own edges; and writes the table `src/places/reveal/sky/space-band.ts`, by which the
  place sets more of its faint stars where the band is bright).
- Takes: 3 asked, take 1 used here. Take 2 has a round bulge and pink clouds, which read as a painting.
- Why this one: its dust lanes hold when the picture lies 1.35 px of a 3840 frame to the texel, and its warm core sits where the band
  rises from behind the planet's edge.
- Date: 28 November 2026.
