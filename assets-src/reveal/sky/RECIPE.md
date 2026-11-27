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

Made by: `assets-src/reveal/sky/make_banks.py` (Python 3 with numpy, scipy and Pillow), committed here
From: `public/assets/reveal/land/relief-a.png` (blue: the height of the land on its widest map)
Prompt or command: `python3 assets-src/reveal/sky/make_banks.py`, from the root of the repo; no model and no prompt; the only noise is of a fixed seed
Takes: 11 made (the eleventh is the tenth's script run again on the land's relief of its second version in this wave, nothing else changed; three in the first wave; in the second: the deck and the pools as lines, which read as white sausages; the pools as patches filled to a level; the ice in wide swaths; the ice in narrow swaths; no pools on the coasts and a deck broken finer, which left almost no deck; two more for how full the deck stands); the tenth is kept
Why this one: the deck stands at the level where the place draws scattered cells, closing to clumps in its middle, so no patch ends on its outline; the stratus is pooled inland only; the ice lies in narrow swaths that cross the ranges and not along the spine
Date: 2026-11-27

2048 x 1152, on the rectangle `COVER_RECT` of `src/places/reveal/shared/weather.ts`, the same as `cover.png`.
Where the land holds cloud: computed from the relief, with a few patches placed by the map of the land (px of the master, listed in the script).
Used by: `src/places/reveal/shared/weather.ts` (`bankDepth`, `fogDepth`, `highDepth`), read by the part `reveal/cloud` and by the shade on the land.

- red: banks. The rise of the ground along the wind of the low field, read at the size of a whole range (60 km): cloud piles on the
  flank that faces the wind. With it a broken middle deck in six patches: across the second lake of the skull massif, along the jaw
  coast, across a few of the upper and of the lower ribs, and two on the far body. A patch is never full: it stands at the level
  at which the place draws scattered cells, and closes into clumps only in its middle.
- green: stratus. The floors that lie under the ground round them (15 km), and pools well inland broken by a swell. The place
  fills each pool to a low level against the land's own relief (`land/relief-a.png`, read only), so only the valley floors
  fill and the edge of the stratus is the branching of the valley it lies in.
- blue: ice. Five narrow swaths that cross the ranges at an angle unlike their own, where the high ice is drawn out in streaks.
  (Nothing reads it now: at the size of the frame the swaths were straight parallel hairlines, and they were taken out of the place.)
  (Up to the second wave this channel held a pooled haze that nothing read.)

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
