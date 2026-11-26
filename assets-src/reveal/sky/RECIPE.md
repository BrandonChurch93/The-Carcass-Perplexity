# The pictures of the sky

Every picture in `public/assets/reveal/sky/` is made by code in this folder. Nothing is painted and nothing is copied from a picture.
The cloud itself is photographs: the tiles and plates of `public/assets/reveal/mat/` (recipe in `assets-src/reveal/mat/RECIPE.md`).

Run from the root of the repo:

```
python3 assets-src/reveal/sky/make_sky.py
python3 assets-src/reveal/sky/make_cover.py
python3 assets-src/reveal/sky/make_banks.py
```

They need python 3 with numpy, scipy, opencv and Pillow. Each takes under a minute.

## `public/assets/reveal/sky/cloud-tile.jpg`

Made by `make_sky.py`. 1024 x 1024, repeats. Noise shaped in the frequency plane, so the tile has no seam. The place reads blue (slow clumps: where a
field of cloud has grown, how the sea is ruffled, how a trail of vapour bends) and red and green (a slow bend for the tops of the storm).

## `public/assets/reveal/sky/cover.png`

Made by `make_cover.py`. 2048 x 1152, on the rectangle `COVER_RECT` of `src/places/reveal/shared/weather.ts` (px of the master: x -900 to 7600,
y -820 to 3961.25). Where the weather stands:

- red: two fronts from the plate `mat/front.jpg`. The place no longer reads this channel (the fronts were taken off the cloud sheet at
  version 3 of the second owner: they smeared the body); it is kept so the file keeps its form.
- green: how much of the low field of small cloud has grown at a point: full over the open sea, thin over the land, clumped, cleared round the cyclone.
- blue: the cyclone and the storm on the spine (`mat/cyclone.jpg`, `mat/storm.jpg` laid on the rectangles where `sky/index.ts` draws their sheets:
  the storm's is 512 x 160 px of the master, 40 px west of its mark), which do not drift. It is the shade they throw, read soft.

### What is read as data

- `public/assets/reveal/maps/map-a-h.png`: the height of the land, to thin the low cloud over it.
- `public/assets/reveal/mat/front.jpg`, `cyclone.jpg`, `storm.jpg`: the plates, for their shade.

## `public/assets/reveal/sky/banks.png`

Made by `make_banks.py`. 2048 x 1152, on the rectangle `COVER_RECT` of `src/places/reveal/shared/weather.ts`, the same as `cover.png`.
Where the land holds cloud, computed from the relief and from nothing else; nothing random, nothing painted.
Used by: `src/places/reveal/shared/weather.ts` (`bankDepth`, `fogDepth`, `hazeAt`), read by the part `reveal/cloud`.

- red: banks. The rise of the ground along the wind of the low field, read at the size of a whole range (60 km): cloud piles on the
  flank that faces the wind, and only where there is land 130 km up the wind of it.
- green: fog. The floors that lie under the ground round them, read fine (15 km), with land all round and above the sounds and the shelf.
- blue: the low ground, plains and wide valley floors, read wide and soft.

### What is read as data

- `public/assets/reveal/land/relief-a.png`, blue: the height of the land on its widest map.

## `public/assets/reveal/mat/cyclone-wide.jpg`

Made by: the Builder, with the image model, on the request of `reveal_owner_3` (wave 3). Sent as `reveal-mats-w3.tgz` and unpacked here unchanged.
What it is: a plate, 1254 by 1254 px, 2,500 km across: a cyclone seen straight down, many thin beaded arms round a small eye, on black sea.
Used by: `src/places/reveal/sky/index.ts`, the part `reveal/cyclone`.
Date: 2026-11-26

## `public/assets/reveal/mat/specks.jpg` and `public/assets/reveal/mat/specks-nh.png`

Made by: the Builder, with the image model, on the request of `reveal_owner_3` (wave 3). Sent as `reveal-mats-w3.tgz` and unpacked here unchanged.
What it is: a tile, 1,500 km a repeat: fields of very small cumulus in beaded streets on black sea, and its relief.
Used by: `src/places/reveal/shared/weather.ts`, the low cloud seen from orbit.
Date: 2026-11-26

## `public/assets/reveal/mat/seacloud.jpg`

Made by: the Builder, with the image model, on the request of `reveal_owner_3` (wave 3). Sent as `reveal-mats-w3.tgz` and unpacked here unchanged.
What it is: a plate, 1672 by 941 px, 6,000 km wide: a deck of sea cloud, thin on the left and dense on the right, on black sea.
Date: 2026-11-26
