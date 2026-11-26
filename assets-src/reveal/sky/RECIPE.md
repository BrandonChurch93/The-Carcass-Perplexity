# The pictures of the sky

Every picture in `public/assets/reveal/sky/` is made by code in this folder. Nothing is painted and nothing is copied from a picture.
The cloud itself is photographs: the tiles and plates of `public/assets/reveal/mat/` (recipe in `assets-src/reveal/mat/RECIPE.md`).

Run from the root of the repo:

```
python3 assets-src/reveal/sky/make_sky.py
python3 assets-src/reveal/sky/make_cover.py
```

They need python 3 with numpy, scipy, opencv and Pillow. Each takes under a minute.

## `public/assets/reveal/sky/cloud-tile.jpg`

Made by `make_sky.py`. 1024 x 1024, repeats. Noise shaped in the frequency plane, so the tile has no seam. The place reads blue (slow clumps: where a
field of cloud has grown, how the sea is ruffled, how a trail of vapour bends) and red and green (a slow bend for the tops of the storm).

## `public/assets/reveal/sky/cover.png`

Made by `make_cover.py`. 2048 x 1152, on the rectangle `COVER_RECT` of `src/places/reveal/shared/weather.ts` (px of the master: x -900 to 7600,
y -820 to 3961.25). Where the weather stands:

- red: the two fronts as they stand at second 0 (the plate `mat/front.jpg` at the placements `FRONTS`, the same numbers as in `weather.ts`),
  blurred a little, so the ground can take their shade with one read.
- green: how much of the low field of small cloud has grown at a point: full over the open sea, thin over the land, clumped, cleared round the cyclone.
- blue: the cyclone and the storm on the spine (`mat/cyclone.jpg`, `mat/storm.jpg` laid on the rectangles where `sky/index.ts` draws their sheets:
  the storm's is 512 x 160 px of the master, 40 px west of its mark), which do not drift. It is the shade they throw, read soft.

### What is read as data

- `public/assets/reveal/maps/map-a-h.png`: the height of the land, to thin the low cloud over it.
- `public/assets/reveal/mat/front.jpg`, `cyclone.jpg`, `storm.jpg`: the plates, for their shade.
